const { Prisma } = require('@prisma/client');
const { getPrisma } = require('../lib/prisma');
const { AppError } = require('../middleware/errorHandler');
const { toApiRole, toDbRole } = require('../utils/roles');

const prisma = getPrisma();

function clampPagination(page = 1, limit = 20) {
  const safePage = Number.isInteger(page) && page > 0 ? page : 1;
  const safeLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 100) : 20;
  return {
    page: safePage,
    limit: safeLimit,
    skip: (safePage - 1) * safeLimit,
    take: safeLimit,
  };
}

async function getUserNotificationContext(userId, tx = prisma) {
  const user = await tx.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      staffProfile: { select: { schoolId: true } },
      student: { select: { schoolId: true } },
      guardian: {
        select: {
          studentGuardians: {
            select: {
              student: { select: { schoolId: true } },
            },
          },
        },
      },
    },
  });

  if (!user) throw new AppError('User not found', 404);

  const schoolIds = new Set();
  if (user.staffProfile?.schoolId) schoolIds.add(user.staffProfile.schoolId);
  if (user.student?.schoolId) schoolIds.add(user.student.schoolId);
  for (const link of user.guardian?.studentGuardians ?? []) {
    if (link.student?.schoolId) schoolIds.add(link.student.schoolId);
  }

  return {
    userId,
    role: toApiRole(user.role),
    dbRole: user.role,
    schoolIds: [...schoolIds],
  };
}

function visibilityWhere(ctx) {
  if (ctx.role === 'SUPER_ADMIN') return {};
  return {
    OR: [
      { targetUserId: ctx.userId },
      {
        isBroadcast: true,
        schoolId: { in: ctx.schoolIds },
        OR: [{ targetRole: null }, { targetRole: ctx.dbRole }, { targetRole: toDbRole(ctx.role) }],
      },
    ],
  };
}

function mapNotification(notification, userId) {
  const read = notification.reads?.find(row => row.userId === userId);
  return {
    id: notification.id,
    type: notification.type,
    title: notification.titleEn || notification.titleAr,
    titleAr: notification.titleAr,
    titleEn: notification.titleEn,
    body: notification.bodyEn || notification.bodyAr,
    bodyAr: notification.bodyAr,
    bodyEn: notification.bodyEn,
    metadata: notification.metadata,
    targetRole: toApiRole(notification.targetRole),
    targetUserId: notification.targetUserId,
    isBroadcast: notification.isBroadcast,
    sentAt: notification.sentAt,
    createdAt: notification.createdAt,
    readAt: read?.readAt ?? null,
    isRead: Boolean(read),
  };
}

async function createNotification(input, tx = prisma) {
  return tx.notification.create({
    data: {
      schoolId: input.schoolId,
      senderId: input.senderId ?? null,
      type: input.type ?? null,
      titleAr: input.titleAr ?? input.title,
      titleEn: input.titleEn ?? input.title ?? input.titleAr,
      bodyAr: input.bodyAr ?? input.body,
      bodyEn: input.bodyEn ?? input.body ?? input.bodyAr,
      metadata: input.metadata ?? Prisma.JsonNull,
      targetRole: input.targetRole ? toDbRole(input.targetRole) : null,
      targetUserId: input.targetUserId ?? null,
      isBroadcast: Boolean(input.isBroadcast),
      sentAt: input.sentAt ?? new Date(),
    },
  });
}

async function listForUser(userId, query = {}) {
  const { page, limit, skip, take } = clampPagination(query.page, query.limit);
  const ctx = await getUserNotificationContext(userId);
  const baseWhere = visibilityWhere(ctx);
  const unreadWhere = query.unreadOnly
    ? {
        reads: {
          none: { userId },
        },
      }
    : {};
  const where = { AND: [baseWhere, unreadWhere] };

  const [total, notifications] = await Promise.all([
    prisma.notification.count({ where }),
    prisma.notification.findMany({
      where,
      orderBy: [{ sentAt: 'desc' }, { createdAt: 'desc' }],
      skip,
      take,
      include: {
        reads: {
          where: { userId },
          select: { readAt: true, userId: true },
        },
      },
    }),
  ]);

  return {
    data: notifications.map(row => mapNotification(row, userId)),
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page < Math.ceil(total / limit),
      hasPrevPage: page > 1,
    },
  };
}

async function assertNotificationVisible(userId, notificationId) {
  const ctx = await getUserNotificationContext(userId);
  const notification = await prisma.notification.findFirst({
    where: {
      id: notificationId,
      ...visibilityWhere(ctx),
    },
  });
  if (!notification) throw new AppError('Notification not found', 404);
  return notification;
}

async function markRead(userId, notificationId) {
  await assertNotificationVisible(userId, notificationId);
  const row = await prisma.notificationRead.upsert({
    where: {
      notificationId_userId: {
        notificationId,
        userId,
      },
    },
    create: {
      notificationId,
      userId,
    },
    update: {
      readAt: new Date(),
    },
  });
  return row;
}

async function markAllRead(userId) {
  const ctx = await getUserNotificationContext(userId);
  const notifications = await prisma.notification.findMany({
    where: {
      ...visibilityWhere(ctx),
      reads: { none: { userId } },
    },
    select: { id: true },
  });

  const now = new Date();
  await prisma.$transaction(
    notifications.map(notification =>
      prisma.notificationRead.upsert({
        where: {
          notificationId_userId: {
            notificationId: notification.id,
            userId,
          },
        },
        create: {
          notificationId: notification.id,
          userId,
          readAt: now,
        },
        update: { readAt: now },
      })
    )
  );

  return { count: notifications.length };
}

module.exports = {
  createNotification,
  getUserNotificationContext,
  listForUser,
  markRead,
  markAllRead,
  mapNotification,
};
