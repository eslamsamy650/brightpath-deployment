/**
 * Seeds PostgreSQL with BrightPath demo data (data/schema).
 * Usage: npm run seed (from backend/)
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const bcrypt = require('bcryptjs');
const { getPrisma, connectDatabase, disconnectDatabase } = require('../src/lib/prisma');
const { env } = require('../src/config/env');

const prisma = getPrisma();

async function upsertSchool() {
  return prisma.school.upsert({
    where: { licenseNumber: 'BP-CAIRO-01' },
    create: {
      nameEn: 'BrightPath Primary School',
      nameAr: 'مدرسة برايت باث الابتدائية',
      licenseNumber: 'BP-CAIRO-01',
      addressEn: '15 El Nasr Road, Nasr City, Cairo',
      addressAr: '15 طريق النصر، مدينة نصر، القاهرة',
      phone: '+20-2-2345-6789',
      email: 'admin@brightpath.eg',
      isActive: true,
    },
    update: {},
  });
}

async function main() {
  console.log('🌱  Starting PostgreSQL seed...\n');

  await connectDatabase();

  const school = await upsertSchool();
  console.log(`✅  School: ${school.nameEn}`);

  const academicYear = await prisma.academicYear.upsert({
    where: {
      schoolId_nameEn: {
        schoolId: school.id,
        nameEn: '2024-2025',
      },
    },
    create: {
      schoolId: school.id,
      nameEn: '2024-2025',
      nameAr: '٢٠٢٤/٢٠٢٥',
      startDate: new Date('2024-09-01'),
      endDate: new Date('2025-06-30'),
      isCurrent: true,
    },
    update: { isCurrent: true },
  });

  const termDefs = [
    {
      termType: 'first',
      nameEn: 'First Term',
      nameAr: 'الفصل الأول',
      startDate: new Date('2024-09-01'),
      endDate: new Date('2024-12-31'),
    },
    {
      termType: 'second',
      nameEn: 'Second Term',
      nameAr: 'الفصل الثاني',
      startDate: new Date('2025-01-15'),
      endDate: new Date('2025-03-31'),
    },
    {
      termType: 'summer',
      nameEn: 'Third Term',
      nameAr: 'الفصل الثالث',
      startDate: new Date('2025-04-15'),
      endDate: new Date('2025-06-30'),
    },
  ];

  const terms = [];
  for (const t of termDefs) {
    const term = await prisma.term.upsert({
      where: {
        academicYearId_termType: {
          academicYearId: academicYear.id,
          termType: t.termType,
        },
      },
      create: {
        academicYearId: academicYear.id,
        ...t,
      },
      update: {},
    });
    terms.push(term);
  }
  console.log(`✅  Terms: ${terms.map(t => t.nameEn).join(', ')}`);

  const gradeLevel = await prisma.gradeLevel.upsert({
    where: {
      schoolId_orderIndex: {
        schoolId: school.id,
        orderIndex: 3,
      },
    },
    create: {
      schoolId: school.id,
      nameEn: 'Grade 3',
      nameAr: 'الصف الثالث',
      orderIndex: 3,
      gradingSystem: 'percentage',
    },
    update: {},
  });

  const subjectDefs = [
    { code: 'MATH-3', titleEn: 'Mathematics', titleAr: 'الرياضيات' },
    { code: 'ENG-3', titleEn: 'English', titleAr: 'اللغة الإنجليزية' },
    { code: 'SCI-3', titleEn: 'Science', titleAr: 'العلوم' },
    { code: 'ART-3', titleEn: 'Art', titleAr: 'الفنون' },
    { code: 'SOC-3', titleEn: 'Social Studies', titleAr: 'الدراسات الاجتماعية' },
    { code: 'ARB-3', titleEn: 'Arabic', titleAr: 'اللغة العربية' },
  ];

  const subjects = [];
  for (const s of subjectDefs) {
    const subject = await prisma.subject.upsert({
      where: {
        schoolId_code: {
          schoolId: school.id,
          code: s.code,
        },
      },
      create: {
        schoolId: school.id,
        ...s,
      },
      update: {},
    });
    subjects.push(subject);
  }
  console.log(`✅  Subjects: ${subjects.map(s => s.titleEn).join(', ')}`);

  const hash = pw => bcrypt.hash(pw, env.BCRYPT_ROUNDS ?? 12);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@brightpath.eg' },
    create: {
      email: 'admin@brightpath.eg',
      passwordHash: await hash('Admin@1234'),
      role: 'SchoolAdmin',
      isActive: true,
    },
    update: {},
  });

  await prisma.staffProfile.upsert({
    where: { userId: adminUser.id },
    create: {
      userId: adminUser.id,
      schoolId: school.id,
      firstNameEn: 'Omar',
      firstNameAr: 'عمر',
      lastNameEn: 'Mostafa',
      lastNameAr: 'مصطفى',
      positionEn: 'School Administrator',
      positionAr: 'مدير المدرسة',
    },
    update: {},
  });

  await prisma.userSettings.upsert({
    where: { userId: adminUser.id },
    create: { userId: adminUser.id },
    update: {},
  });

  console.log(`✅  Admin: ${adminUser.email}`);

  const teacherUser = await prisma.user.upsert({
    where: { email: 'fatima@brightpath.eg' },
    create: {
      email: 'fatima@brightpath.eg',
      passwordHash: await hash('Teacher@1234'),
      role: 'Teacher',
      isActive: true,
    },
    update: {},
  });

  const teacherStaff = await prisma.staffProfile.upsert({
    where: { userId: teacherUser.id },
    create: {
      userId: teacherUser.id,
      schoolId: school.id,
      firstNameEn: 'Fatima',
      firstNameAr: 'فاطمة',
      lastNameEn: 'Al-Rashid',
      lastNameAr: 'الرشيد',
      positionEn: 'Class Teacher',
      positionAr: 'معلمة',
    },
    update: {},
  });

  await prisma.userSettings.upsert({
    where: { userId: teacherUser.id },
    create: { userId: teacherUser.id },
    update: {},
  });

  console.log(`✅  Teacher: ${teacherUser.email}`);

  let cls = await prisma.class.findFirst({
    where: {
      schoolId: school.id,
      academicYearId: academicYear.id,
      nameEn: '3A',
    },
  });

  if (!cls) {
    cls = await prisma.class.create({
      data: {
        schoolId: school.id,
        academicYearId: academicYear.id,
        gradeLevelId: gradeLevel.id,
        nameEn: '3A',
        nameAr: '3أ',
        capacity: 30,
        homeroomTeacherId: teacherUser.id,
      },
    });
  } else if (!cls.homeroomTeacherId) {
    cls = await prisma.class.update({
      where: { id: cls.id },
      data: { homeroomTeacherId: teacherUser.id },
    });
  }

  for (const subject of subjects) {
    for (const term of terms) {
      await prisma.classSubject.upsert({
        where: {
          classId_subjectId_termId: {
            classId: cls.id,
            subjectId: subject.id,
            termId: term.id,
          },
        },
        create: {
          classId: cls.id,
          subjectId: subject.id,
          termId: term.id,
          teacherId: teacherStaff.id,
        },
        update: { teacherId: teacherStaff.id },
      });
    }
  }

  console.log(`✅  Class: Grade ${cls.nameEn}`);

  const studentUser = await prisma.user.upsert({
    where: { email: 'yasmine@brightpath.eg' },
    create: {
      email: 'yasmine@brightpath.eg',
      passwordHash: await hash('Student@1234'),
      role: 'Student',
      isActive: true,
    },
    update: {},
  });

  const student = await prisma.student.upsert({
    where: { studentIdNumber: 'BP-2025-001' },
    create: {
      userId: studentUser.id,
      schoolId: school.id,
      studentIdNumber: 'BP-2025-001',
      firstNameEn: 'Yasmine',
      firstNameAr: 'ياسمين',
      lastNameEn: 'Adel',
      lastNameAr: 'عادل',
      gender: 'female',
      dateOfBirth: new Date('2016-05-12'),
      enrollmentDate: new Date('2024-09-01'),
      isActive: true,
    },
    update: { userId: studentUser.id },
  });

  await prisma.studentClassEnrollment.upsert({
    where: {
      studentId_academicYearId: {
        studentId: student.id,
        academicYearId: academicYear.id,
      },
    },
    create: {
      studentId: student.id,
      classId: cls.id,
      academicYearId: academicYear.id,
      enrollmentDate: new Date('2024-09-01'),
    },
    update: { classId: cls.id },
  });

  await prisma.userSettings.upsert({
    where: { userId: studentUser.id },
    create: { userId: studentUser.id },
    update: {},
  });

  const parentUser = await prisma.user.upsert({
    where: { email: 'nadia@example.com' },
    create: {
      email: 'nadia@example.com',
      passwordHash: await hash('Parent@1234'),
      role: 'Parent',
      isActive: true,
    },
    update: {},
  });

  const guardian = await prisma.guardian.upsert({
    where: { userId: parentUser.id },
    create: {
      userId: parentUser.id,
      firstNameEn: 'Nadia',
      firstNameAr: 'نادية',
      lastNameEn: 'Adel',
      lastNameAr: 'عادل',
      phonePrimary: '+20-10-1234-5678',
      email: 'nadia@example.com',
      relationshipEn: 'Mother',
      relationshipAr: 'أم',
    },
    update: {},
  });

  await prisma.studentGuardian.upsert({
    where: {
      studentId_guardianId: {
        studentId: student.id,
        guardianId: guardian.id,
      },
    },
    create: {
      studentId: student.id,
      guardianId: guardian.id,
      isPrimary: true,
      canPickup: true,
      emergencyOrder: 1,
    },
    update: { isPrimary: true },
  });

  await prisma.userSettings.upsert({
    where: { userId: parentUser.id },
    create: { userId: parentUser.id },
    update: {},
  });

  console.log(`✅  Student: ${studentUser.email}`);
  console.log(`✅  Parent:  ${parentUser.email}\n`);

  const [participantOneId, participantTwoId] = [teacherUser.id, parentUser.id].sort();
  const conversation = await prisma.messageConversation.upsert({
    where: {
      participantOneId_participantTwoId: {
        participantOneId,
        participantTwoId,
      },
    },
    create: {
      participantOneId,
      participantTwoId,
      lastMessagePreview: 'Welcome to BrightPath messaging!',
      lastMessageAt: new Date(),
    },
    update: {},
  });

  const existingDemoMessages = await prisma.message.count({
    where: { conversationId: conversation.id },
  });
  if (existingDemoMessages === 0) {
    const demoMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId: teacherUser.id,
        receiverId: parentUser.id,
        body: 'Welcome to BrightPath messaging! You can reach me here for class updates.',
      },
    });
    await prisma.messageConversation.update({
      where: { id: conversation.id },
      data: {
        lastMessagePreview: demoMessage.body,
        lastMessageAt: demoMessage.createdAt,
      },
    });
  }

  const existingAnnouncement = await prisma.announcement.findFirst({
    where: { schoolId: school.id, titleEn: 'Welcome to Spring Term' },
  });
  if (!existingAnnouncement) {
    await prisma.announcement.create({
      data: {
        schoolId: school.id,
        authorId: adminUser.id,
        titleAr: 'Welcome to Spring Term',
        titleEn: 'Welcome to Spring Term',
        bodyAr: 'Spring term schedules and announcements are now available in BrightPath.',
        bodyEn: 'Spring term schedules and announcements are now available in BrightPath.',
        audience: 'ALL',
        priority: 'INFO',
        publishedAt: new Date(),
      },
    });
  }

  console.log('─────────────────────────────────────────');
  console.log('🎉  Seed complete! Demo credentials:\n');
  console.log('  Admin:   admin@brightpath.eg   / Admin@1234');
  console.log('  Teacher: fatima@brightpath.eg  / Teacher@1234');
  console.log('  Student: yasmine@brightpath.eg / Student@1234');
  console.log('  Parent:  nadia@example.com     / Parent@1234');
  console.log('─────────────────────────────────────────');

  await disconnectDatabase();
}

main().catch(async err => {
  console.error('❌  Seed failed:', err);
  try {
    await disconnectDatabase();
  } catch {
    //
  }
  process.exit(1);
});
