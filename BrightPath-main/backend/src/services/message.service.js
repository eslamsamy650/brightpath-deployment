const { Prisma } = require('@prisma/client');
const { getPrisma } = require('../lib/prisma');
const { AppError } = require('../middleware/errorHandler');
const NotificationService = require('./notification.service');
const { toApiRole, toDbRole } = require('../utils/roles');

const prisma = getPrisma();
const MESSAGE_PREVIEW_LENGTH = 140;
const STAFF_MESSAGE_ROLES = ['ADMIN', 'REGISTRAR', 'ACCOUNTANT', 'TEACHER'];

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

function normalizeBody(body) {
  const normalized = String(body ?? '').trim();
  if (!normalized) throw new AppError('Message body is required', 400);
  if (normalized.length > 4000)
    throw new AppError('Message body cannot exceed 4000 characters', 422);
  return normalized;
}

function makePreview(body) {
  return body.length > MESSAGE_PREVIEW_LENGTH
    ? `${body.slice(0, MESSAGE_PREVIEW_LENGTH - 3)}...`
    : body;
}

function getConversationParticipants(userA, userB) {
  return [userA, userB].sort();
}

function visibleMessageWhere(userId) {
  return {
    OR: [
      { senderId: userId, senderDeletedAt: null },
      { receiverId: userId, receiverDeletedAt: null },
    ],
  };
}

function collectSchoolIds(user) {
  const ids = new Set();
  if (user?.staffProfile?.schoolId) ids.add(user.staffProfile.schoolId);
  if (user?.student?.schoolId) ids.add(user.student.schoolId);
  for (const link of user?.guardian?.studentGuardians ?? []) {
    if (link.student?.schoolId) ids.add(link.student.schoolId);
  }
  return ids;
}

function toDbRoles(apiRoles) {
  return apiRoles.map(toDbRole);
}

function displayNameFor(user) {
  const staff = user.staffProfile;
  if (staff) {
    return [staff.firstNameEn || staff.firstNameAr, staff.lastNameEn || staff.lastNameAr]
      .filter(Boolean)
      .join(' ');
  }

  const student = user.student;
  if (student) {
    return [student.firstNameEn || student.firstNameAr, student.lastNameEn || student.lastNameAr]
      .filter(Boolean)
      .join(' ');
  }

  const guardian = user.guardian;
  if (guardian) {
    return [
      guardian.firstNameEn || guardian.firstNameAr,
      guardian.lastNameEn || guardian.lastNameAr,
    ]
      .filter(Boolean)
      .join(' ');
  }

  return user.email;
}

function mapUserSummary(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    role: toApiRole(user.role),
    name: displayNameFor(user),
  };
}

function mapAttachment(attachment) {
  if (!attachment) return null;
  return {
    id: attachment.id,
    fileName: attachment.fileName,
    mimeType: attachment.mimeType,
    sizeBytes: attachment.sizeBytes,
    url: `/uploads/${attachment.storagePath}`,
    createdAt: attachment.createdAt,
  };
}

function mapMessage(message) {
  return {
    id: message.id,
    conversationId: message.conversationId,
    senderId: message.senderId,
    receiverId: message.receiverId,
    body: message.body,
    preview: makePreview(message.body),
    readAt: message.readAt,
    createdAt: message.createdAt,
    sender: mapUserSummary(message.sender),
    receiver: mapUserSummary(message.receiver),
    attachments: Array.isArray(message.attachments) ? message.attachments.map(mapAttachment) : [],
  };
}

function isParticipant(conversation, userId) {
  return conversation.participantOneId === userId || conversation.participantTwoId === userId;
}

async function getUserForMessaging(userId, tx = prisma) {
  return tx.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      role: true,
      isActive: true,
      staffProfile: {
        select: {
          id: true,
          schoolId: true,
          firstNameEn: true,
          firstNameAr: true,
          lastNameEn: true,
          lastNameAr: true,
        },
      },
      student: {
        select: {
          id: true,
          schoolId: true,
          firstNameEn: true,
          firstNameAr: true,
          lastNameEn: true,
          lastNameAr: true,
        },
      },
      guardian: {
        select: {
          id: true,
          firstNameEn: true,
          firstNameAr: true,
          lastNameEn: true,
          lastNameAr: true,
          studentGuardians: {
            select: {
              student: {
                select: { id: true, schoolId: true },
              },
            },
          },
        },
      },
    },
  });
}

async function getStaffUserIdsByStaffIds(staffIds, tx = prisma) {
  if (staffIds.size === 0) return [];
  const staff = await tx.staffProfile.findMany({
    where: { id: { in: [...staffIds] }, user: { is: { isActive: true } } },
    select: { userId: true },
  });
  return staff.map(row => row.userId);
}

async function getStaffUserIdsInSchools(schoolIds, apiRoles = STAFF_MESSAGE_ROLES, tx = prisma) {
  if (schoolIds.size === 0) return [];
  const users = await tx.user.findMany({
    where: {
      isActive: true,
      role: { in: toDbRoles(apiRoles) },
      staffProfile: {
        is: { schoolId: { in: [...schoolIds] } },
      },
    },
    select: { id: true },
  });
  return users.map(row => row.id);
}

async function getAllActiveUserIdsInSchools(schoolIds, tx = prisma) {
  if (schoolIds.size === 0) return [];
  const users = await tx.user.findMany({
    where: {
      isActive: true,
      OR: [
        { staffProfile: { is: { schoolId: { in: [...schoolIds] } } } },
        { student: { is: { schoolId: { in: [...schoolIds] } } } },
        {
          guardian: {
            is: {
              studentGuardians: {
                some: {
                  student: { is: { schoolId: { in: [...schoolIds] } } },
                },
              },
            },
          },
        },
      ],
    },
    select: { id: true },
  });
  return users.map(row => row.id);
}

async function getClassLinkedRecipientIdsForStudentIds(studentIds, tx = prisma) {
  const recipientIds = new Set();
  if (studentIds.size === 0) return recipientIds;

  const enrollments = await tx.studentClassEnrollment.findMany({
    where: {
      studentId: { in: [...studentIds] },
      withdrawalDate: null,
    },
    select: {
      class: {
        select: {
          homeroomTeacherId: true,
          classSubjects: {
            select: { teacherId: true },
          },
        },
      },
    },
  });

  const subjectTeacherStaffIds = new Set();
  for (const enrollment of enrollments) {
    if (enrollment.class.homeroomTeacherId) {
      recipientIds.add(enrollment.class.homeroomTeacherId);
    }
    for (const classSubject of enrollment.class.classSubjects) {
      if (classSubject.teacherId) subjectTeacherStaffIds.add(classSubject.teacherId);
    }
  }

  for (const userId of await getStaffUserIdsByStaffIds(subjectTeacherStaffIds, tx)) {
    recipientIds.add(userId);
  }

  return recipientIds;
}

async function getEligibleRecipientIds(user, tx = prisma) {
  const role = toApiRole(user.role);
  if (role === 'SUPER_ADMIN') return null;

  const schoolIds = collectSchoolIds(user);
  const ids = new Set();

  if (STAFF_MESSAGE_ROLES.includes(role)) {
    if (role !== 'TEACHER') {
      for (const userId of await getAllActiveUserIdsInSchools(schoolIds, tx)) {
        ids.add(userId);
      }
    }

    for (const userId of await getStaffUserIdsInSchools(schoolIds, STAFF_MESSAGE_ROLES, tx)) {
      ids.add(userId);
    }

    if (role === 'TEACHER') {
      const classes = await tx.class.findMany({
        where: {
          OR: [
            { homeroomTeacherId: user.id },
            ...(user.staffProfile?.id
              ? [{ classSubjects: { some: { teacherId: user.staffProfile.id } } }]
              : []),
          ],
        },
        select: {
          enrollments: {
            where: { withdrawalDate: null },
            select: {
              student: {
                select: {
                  userId: true,
                  guardians: {
                    select: {
                      guardian: {
                        select: { userId: true },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      for (const cls of classes) {
        for (const enrollment of cls.enrollments) {
          if (enrollment.student.userId) ids.add(enrollment.student.userId);
          for (const guardianLink of enrollment.student.guardians) {
            if (guardianLink.guardian.userId) ids.add(guardianLink.guardian.userId);
          }
        }
      }
    }
  } else if (role === 'PARENT') {
    for (const userId of await getStaffUserIdsInSchools(
      schoolIds,
      ['ADMIN', 'REGISTRAR', 'ACCOUNTANT'],
      tx
    )) {
      ids.add(userId);
    }

    const studentIds = new Set(
      (user.guardian?.studentGuardians ?? []).map(link => link.student?.id).filter(Boolean)
    );
    for (const userId of await getClassLinkedRecipientIdsForStudentIds(studentIds, tx)) {
      ids.add(userId);
    }
  } else if (role === 'STUDENT') {
    for (const userId of await getStaffUserIdsInSchools(
      schoolIds,
      ['ADMIN', 'REGISTRAR', 'ACCOUNTANT'],
      tx
    )) {
      ids.add(userId);
    }
    if (user.student?.id) {
      for (const userId of await getClassLinkedRecipientIdsForStudentIds(new Set([user.student.id]), tx)) {
        ids.add(userId);
      }
    }
  }

  ids.delete(user.id);
  return ids;
}

async function assertCanMessage(senderId, receiverId) {
  if (senderId === receiverId) {
    throw new AppError('Cannot send a message to yourself', 400);
  }

  const [sender, receiver] = await Promise.all([
    getUserForMessaging(senderId),
    getUserForMessaging(receiverId),
  ]);

  if (!sender || !sender.isActive) throw new AppError('Sender not found or inactive', 401);
  if (!receiver || !receiver.isActive) throw new AppError('Recipient not found or inactive', 404);

  const receiverSchoolIds = collectSchoolIds(receiver);

  if (toApiRole(sender.role) === 'SUPER_ADMIN') {
    return { sender, receiver, schoolId: [...receiverSchoolIds][0] ?? null };
  }

  const senderSchoolIds = collectSchoolIds(sender);
  const sharedSchoolId = [...senderSchoolIds].find((id) => receiverSchoolIds.has(id));

  if (!sharedSchoolId) {
    throw new AppError('Messages can only be sent within the same school', 403);
  }

  const eligibleRecipientIds = await getEligibleRecipientIds(sender);
  if (eligibleRecipientIds && !eligibleRecipientIds.has(receiverId)) {
    throw new AppError('You are not allowed to message this recipient', 403);
  }

  return { sender, receiver, schoolId: sharedSchoolId };
}

async function findConversationBetween(userA, userB, tx = prisma) {
  const [participantOneId, participantTwoId] = getConversationParticipants(userA, userB);
  return tx.messageConversation.findUnique({
    where: {
      participantOneId_participantTwoId: {
        participantOneId,
        participantTwoId,
      },
    },
  });
}

async function getOrCreateConversation(userA, userB, tx = prisma) {
  const [participantOneId, participantTwoId] = getConversationParticipants(userA, userB);
  try {
    return await tx.messageConversation.upsert({
      where: {
        participantOneId_participantTwoId: {
          participantOneId,
          participantTwoId,
        },
      },
      create: {
        participantOneId,
        participantTwoId,
      },
      update: {},
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return findConversationBetween(userA, userB, tx);
    }
    throw err;
  }
}

async function sendMessage(input) {
  const senderId = input.senderId;
  const receiverId = input.receiverId;
  const body = normalizeBody(input.body);

  const access = await assertCanMessage(senderId, receiverId);

  const message = await prisma.$transaction(async (tx) => {
    const conversation = await getOrCreateConversation(senderId, receiverId, tx);
    const created = await tx.message.create({
      data: {
        conversationId: conversation.id,
        senderId,
        receiverId,
        body,
      },
      include: {
        sender: userSummaryInclude,
        receiver: userSummaryInclude,
        attachments: true,
      },
    });

    await tx.messageConversation.update({
      where: { id: conversation.id },
      data: {
        lastMessagePreview: makePreview(body),
        lastMessageAt: created.createdAt,
      },
    });

    if (access.schoolId) {
      const preview = makePreview(body);
      await NotificationService.createNotification(
        {
          schoolId: access.schoolId,
          senderId,
          targetUserId: receiverId,
          type: 'NEW_MESSAGE',
          title: 'New message',
          body: preview,
          metadata: {
            messageId: created.id,
            conversationId: created.conversationId,
            senderId,
          },
        },
        tx
      );
    }

    return created;
  });

  return mapMessage(message);
}

const userSummaryInclude = {
  select: {
    id: true,
    email: true,
    role: true,
    staffProfile: {
      select: {
        firstNameEn: true,
        firstNameAr: true,
        lastNameEn: true,
        lastNameAr: true,
      },
    },
    student: {
      select: {
        firstNameEn: true,
        firstNameAr: true,
        lastNameEn: true,
        lastNameAr: true,
      },
    },
    guardian: {
      select: {
        firstNameEn: true,
        firstNameAr: true,
        lastNameEn: true,
        lastNameAr: true,
      },
    },
  },
};

async function listInbox(userId, query = {}) {
  const { page, limit, skip, take } = clampPagination(query.page, query.limit);
  const unreadOnly = Boolean(query.unreadOnly);
  const messageVisibility = visibleMessageWhere(userId);
  const baseWhere = {
    OR: [{ participantOneId: userId }, { participantTwoId: userId }],
    messages: {
      some: unreadOnly
        ? { receiverId: userId, readAt: null, receiverDeletedAt: null }
        : messageVisibility,
    },
  };

  const [total, conversations] = await Promise.all([
    prisma.messageConversation.count({ where: baseWhere }),
    prisma.messageConversation.findMany({
      where: baseWhere,
      orderBy: { lastMessageAt: 'desc' },
      skip,
      take,
      include: {
        participantOne: userSummaryInclude,
        participantTwo: userSummaryInclude,
        messages: {
          where: unreadOnly
            ? { receiverId: userId, readAt: null, receiverDeletedAt: null }
            : messageVisibility,
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            sender: userSummaryInclude,
            receiver: userSummaryInclude,
            attachments: true,
          },
        },
        _count: {
          select: {
            messages: {
              where: {
                receiverId: userId,
                readAt: null,
                receiverDeletedAt: null,
              },
            },
          },
        },
      },
    }),
  ]);

  const data = conversations.map((conversation) => {
    const otherParticipant =
      conversation.participantOneId === userId
        ? conversation.participantTwo
        : conversation.participantOne;

    return {
      id: conversation.id,
      participant: mapUserSummary(otherParticipant),
      lastMessage: conversation.messages[0] ? mapMessage(conversation.messages[0]) : null,
      unreadCount: conversation._count.messages,
      lastMessageAt: conversation.lastMessageAt,
    };
  });

  return {
    data,
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

async function listEligibleRecipients(userId, query = {}) {
  const user = await getUserForMessaging(userId);
  if (!user || !user.isActive) throw new AppError('User not found or inactive', 401);

  const { page, limit, skip, take } = clampPagination(query.page, query.limit);
  const eligibleIds = await getEligibleRecipientIds(user);
  const q = String(query.q ?? '').trim();
  const role = query.role ? toDbRole(String(query.role)) : null;

  const searchWhere = q
    ? {
        OR: [
          { email: { contains: q, mode: 'insensitive' } },
          { staffProfile: { is: { firstNameEn: { contains: q, mode: 'insensitive' } } } },
          { staffProfile: { is: { lastNameEn: { contains: q, mode: 'insensitive' } } } },
          { student: { is: { firstNameEn: { contains: q, mode: 'insensitive' } } } },
          { student: { is: { lastNameEn: { contains: q, mode: 'insensitive' } } } },
          { guardian: { is: { firstNameEn: { contains: q, mode: 'insensitive' } } } },
          { guardian: { is: { lastNameEn: { contains: q, mode: 'insensitive' } } } },
        ],
      }
    : {};

  const where = {
    isActive: true,
    id: eligibleIds ? { in: [...eligibleIds] } : { not: userId },
    ...(role ? { role } : {}),
    ...searchWhere,
  };

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: [{ role: 'asc' }, { email: 'asc' }],
      skip,
      take,
      select: userSummaryInclude.select,
    }),
  ]);

  return {
    data: users.map(mapUserSummary),
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

async function listConversationMessages(userId, otherUserId, query = {}) {
  await assertCanMessage(userId, otherUserId);

  const conversation = await findConversationBetween(userId, otherUserId);
  const { page, limit, skip, take } = clampPagination(query.page, query.limit);
  const otherParticipant = await getUserForMessaging(otherUserId);

  if (!conversation) {
    return {
      conversation: null,
      participant: mapUserSummary(otherParticipant),
      messages: [],
      meta: {
        total: 0,
        page,
        limit,
        totalPages: 0,
        hasNextPage: false,
        hasPrevPage: page > 1,
      },
    };
  }

  if (!isParticipant(conversation, userId)) {
    throw new AppError('Message not found', 404);
  }

  await prisma.message.updateMany({
    where: {
      conversationId: conversation.id,
      receiverId: userId,
      readAt: null,
      receiverDeletedAt: null,
    },
    data: { readAt: new Date() },
  });

  const where = {
    conversationId: conversation.id,
    ...visibleMessageWhere(userId),
  };

  const [total, messages] = await Promise.all([
    prisma.message.count({ where }),
    prisma.message.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      include: {
        sender: userSummaryInclude,
        receiver: userSummaryInclude,
        attachments: true,
      },
    }),
  ]);

  return {
    conversation: {
      id: conversation.id,
      lastMessageAt: conversation.lastMessageAt,
    },
    participant: mapUserSummary(otherParticipant),
    messages: messages.map(mapMessage),
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

async function getMessage(userId, messageId) {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    include: {
      conversation: true,
      sender: userSummaryInclude,
      receiver: userSummaryInclude,
      attachments: true,
    },
  });

  if (!message || !isParticipant(message.conversation, userId)) {
    throw new AppError('Message not found', 404);
  }

  const visible =
    (message.senderId === userId && message.senderDeletedAt == null) ||
    (message.receiverId === userId && message.receiverDeletedAt == null);
  if (!visible) throw new AppError('Message not found', 404);

  if (message.receiverId === userId && !message.readAt) {
    const updated = await prisma.message.update({
      where: { id: message.id },
      data: { readAt: new Date() },
      include: {
        sender: userSummaryInclude,
        receiver: userSummaryInclude,
        attachments: true,
      },
    });
    return mapMessage(updated);
  }

  return mapMessage(message);
}

async function deleteMessage(userId, messageId) {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    include: { conversation: true },
  });

  if (!message || !isParticipant(message.conversation, userId)) {
    throw new AppError('Message not found', 404);
  }

  if (message.senderId === userId && message.senderDeletedAt) {
    throw new AppError('Message not found', 404);
  }
  if (message.receiverId === userId && message.receiverDeletedAt) {
    throw new AppError('Message not found', 404);
  }

  const now = new Date();
  await prisma.message.update({
    where: { id: messageId },
    data: message.senderId === userId ? { senderDeletedAt: now } : { receiverDeletedAt: now },
  });

  return { id: messageId, deletedAt: now };
}

async function addMessageAttachments(userId, messageId, files = []) {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    include: { conversation: true },
  });

  if (!message || !isParticipant(message.conversation, userId)) {
    throw new AppError('Message not found', 404);
  }
  const visible =
    (message.senderId === userId && message.senderDeletedAt == null) ||
    (message.receiverId === userId && message.receiverDeletedAt == null);
  if (!visible) throw new AppError('Message not found', 404);
  if (files.length === 0) throw new AppError('At least one attachment file is required', 400);

  await prisma.messageAttachment.createMany({
    data: files.map(file => ({
      messageId,
      fileName: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      storagePath: file.filename,
    })),
  });

  return getMessage(userId, messageId);
}

module.exports = {
  sendMessage,
  listInbox,
  listEligibleRecipients,
  listConversationMessages,
  getMessage,
  deleteMessage,
  addMessageAttachments,
  assertCanMessage,
  getEligibleRecipientIds,
  mapMessage,
  mapUserSummary,
  makePreview,
};
