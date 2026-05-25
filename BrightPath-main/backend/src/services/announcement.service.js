const { getPrisma } = require('../lib/prisma');
const { AppError } = require('../middleware/errorHandler');
const NotificationService = require('./notification.service');
const { toApiRole } = require('../utils/roles');

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

function audienceForRole(role) {
  if (role === 'STUDENT') return 'STUDENTS';
  if (role === 'PARENT') return 'PARENTS';
  return 'TEACHERS';
}

async function getUserClassIds(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      staffProfile: { select: { id: true } },
      student: {
        select: {
          enrollments: {
            where: { withdrawalDate: null },
            select: { classId: true },
          },
        },
      },
      guardian: {
        select: {
          studentGuardians: {
            select: {
              student: {
                select: {
                  enrollments: {
                    where: { withdrawalDate: null },
                    select: { classId: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!user) throw new AppError('User not found', 404);

  const role = toApiRole(user.role);
  if (role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'REGISTRAR') return null;

  const classIds = new Set();
  for (const enrollment of user.student?.enrollments ?? []) {
    classIds.add(enrollment.classId);
  }
  for (const link of user.guardian?.studentGuardians ?? []) {
    for (const enrollment of link.student?.enrollments ?? []) {
      classIds.add(enrollment.classId);
    }
  }

  if (user.staffProfile?.id) {
    const classes = await prisma.class.findMany({
      where: {
        OR: [
          { homeroomTeacherId: userId },
          { classSubjects: { some: { teacherId: user.staffProfile.id } } },
        ],
      },
      select: { id: true },
    });
    for (const cls of classes) classIds.add(cls.id);
  }

  return [...classIds];
}

function mapAnnouncement(row) {
  return {
    id: row.id,
    schoolId: row.schoolId,
    authorId: row.authorId,
    title: row.titleEn || row.titleAr,
    titleAr: row.titleAr,
    titleEn: row.titleEn,
    body: row.bodyEn || row.bodyAr,
    bodyAr: row.bodyAr,
    bodyEn: row.bodyEn,
    audience: row.audience,
    priority: row.priority,
    classId: row.classId,
    publishedAt: row.publishedAt,
    expiresAt: row.expiresAt,
    createdAt: row.createdAt,
    author: row.author ? {
      id: row.author.id,
      email: row.author.email,
      role: toApiRole(row.author.role),
    } : null,
  };
}

async function listAnnouncements(userId, query = {}) {
  const { page, limit, skip, take } = clampPagination(query.page, query.limit);
  const ctx = await NotificationService.getUserNotificationContext(userId);
  const classIds = await getUserClassIds(userId);
  const now = new Date();
  const audienceOr = [
    { audience: 'ALL' },
    { audience: audienceForRole(ctx.role) },
    ...(classIds === null
      ? [{ audience: 'CLASS' }]
      : classIds.length > 0
        ? [{ audience: 'CLASS', classId: { in: classIds } }]
        : []),
  ];
  const where = {
    ...(ctx.role === 'SUPER_ADMIN' ? {} : { schoolId: { in: ctx.schoolIds } }),
    AND: [
      { OR: [{ publishedAt: null }, { publishedAt: { lte: now } }] },
      { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
      { OR: audienceOr },
    ],
  };

  const [total, announcements] = await Promise.all([
    prisma.announcement.count({ where }),
    prisma.announcement.findMany({
      where,
      orderBy: [{ priority: 'asc' }, { publishedAt: 'desc' }, { createdAt: 'desc' }],
      skip,
      take,
      include: {
        author: { select: { id: true, email: true, role: true } },
      },
    }),
  ]);

  return {
    data: announcements.map(mapAnnouncement),
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

async function resolveAuthorSchoolId(authorId, requestedSchoolId) {
  const ctx = await NotificationService.getUserNotificationContext(authorId);
  if (ctx.role === 'SUPER_ADMIN') {
    if (!requestedSchoolId) throw new AppError('schoolId is required for super admin announcements', 400);
    return requestedSchoolId;
  }
  const schoolId = requestedSchoolId || ctx.schoolIds[0];
  if (!schoolId || !ctx.schoolIds.includes(schoolId)) {
    throw new AppError('Announcement school is outside your scope', 403);
  }
  return schoolId;
}

async function createAnnouncement(authorId, input) {
  const schoolId = await resolveAuthorSchoolId(authorId, input.schoolId);
  if (input.audience === 'CLASS' && !input.classId) {
    throw new AppError('classId is required for class announcements', 400);
  }

  const announcement = await prisma.$transaction(async tx => {
    const created = await tx.announcement.create({
      data: {
        schoolId,
        authorId,
        titleAr: input.titleAr ?? input.title,
        titleEn: input.titleEn ?? input.title ?? input.titleAr,
        bodyAr: input.bodyAr ?? input.body,
        bodyEn: input.bodyEn ?? input.body ?? input.bodyAr,
        audience: input.audience,
        priority: input.priority,
        classId: input.classId ?? null,
        publishedAt: input.publishedAt ?? new Date(),
        expiresAt: input.expiresAt ?? null,
      },
      include: {
        author: { select: { id: true, email: true, role: true } },
      },
    });

    await createAnnouncementNotification(created, tx);
    return created;
  });

  return mapAnnouncement(announcement);
}

async function createAnnouncementNotification(announcement, tx) {
  const title = announcement.titleEn || announcement.titleAr;
  const body = announcement.bodyEn || announcement.bodyAr;
  const metadata = {
    announcementId: announcement.id,
    audience: announcement.audience,
    classId: announcement.classId,
  };

  if (announcement.audience !== 'CLASS') {
    await NotificationService.createNotification(
      {
        schoolId: announcement.schoolId,
        senderId: announcement.authorId,
        type: 'ANNOUNCEMENT',
        title,
        body,
        metadata,
        targetRole: announcement.audience === 'ALL' ? null : targetRoleForAudience(announcement.audience),
        isBroadcast: true,
      },
      tx
    );
    return;
  }

  const targetUsers = await classAudienceUserIds(announcement.classId, tx);
  for (const targetUserId of targetUsers) {
    await NotificationService.createNotification(
      {
        schoolId: announcement.schoolId,
        senderId: announcement.authorId,
        targetUserId,
        type: 'ANNOUNCEMENT',
        title,
        body,
        metadata,
      },
      tx
    );
  }
}

function targetRoleForAudience(audience) {
  if (audience === 'STUDENTS') return 'STUDENT';
  if (audience === 'PARENTS') return 'PARENT';
  if (audience === 'TEACHERS') return 'TEACHER';
  return null;
}

async function classAudienceUserIds(classId, tx = prisma) {
  if (!classId) return [];
  const cls = await tx.class.findUnique({
    where: { id: classId },
    select: {
      homeroomTeacherId: true,
      enrollments: {
        where: { withdrawalDate: null },
        select: {
          student: {
            select: {
              userId: true,
              guardians: {
                select: { guardian: { select: { userId: true } } },
              },
            },
          },
        },
      },
    },
  });
  if (!cls) throw new AppError('Class not found', 404);

  const ids = new Set();
  if (cls.homeroomTeacherId) ids.add(cls.homeroomTeacherId);
  for (const enrollment of cls.enrollments) {
    if (enrollment.student.userId) ids.add(enrollment.student.userId);
    for (const link of enrollment.student.guardians) {
      if (link.guardian.userId) ids.add(link.guardian.userId);
    }
  }
  return [...ids];
}

async function deleteAnnouncement(userId, announcementId) {
  const ctx = await NotificationService.getUserNotificationContext(userId);
  const announcement = await prisma.announcement.findUnique({
    where: { id: announcementId },
  });
  if (!announcement) throw new AppError('Announcement not found', 404);
  if (ctx.role !== 'SUPER_ADMIN' && !ctx.schoolIds.includes(announcement.schoolId)) {
    throw new AppError('Announcement not found', 404);
  }
  if (
    ctx.role !== 'SUPER_ADMIN' &&
    ctx.role !== 'ADMIN' &&
    ctx.role !== 'REGISTRAR' &&
    announcement.authorId !== userId
  ) {
    throw new AppError('You are not allowed to delete this announcement', 403);
  }
  await prisma.announcement.delete({ where: { id: announcementId } });
}

module.exports = {
  listAnnouncements,
  createAnnouncement,
  deleteAnnouncement,
  mapAnnouncement,
};
