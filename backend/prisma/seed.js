const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();

async function seed() {
  const existing = await prisma.therapist.findUnique({
    where: { email: 'dr.chen@unloch.me' },
  });
  if (existing) {
    console.log('Seed data already exists, skipping.');
    await prisma.$disconnect();
    return;
  }

  console.log('Seeding database...');

  const practice = await prisma.practice.create({
    data: { id: uuidv4(), name: 'Unloch Demo Clinic' },
  });

  const hashedPassword = await bcrypt.hash('DemoPass123', 12);
  const therapist = await prisma.therapist.create({
    data: {
      id: uuidv4(),
      email: 'dr.chen@unloch.me',
      passwordHash: hashedPassword,
      name: 'Dr. Sarah Chen',
      practiceId: practice.id,
      licenseType: 'PsyD',
      licenseState: 'CA',
    },
  });
  console.log('Created therapist:', therapist.email);

  const alex = await prisma.patient.create({
    data: {
      name: 'Alex Martinez',
      email: 'alex@demo.com',
      therapistId: therapist.id,
      consentStatus: 'granted',
      consentDate: new Date(),
    },
  });
  const jordan = await prisma.patient.create({
    data: {
      name: 'Jordan Kim',
      email: 'jordan@demo.com',
      therapistId: therapist.id,
      consentStatus: 'granted',
      consentDate: new Date(),
    },
  });
  const sam = await prisma.patient.create({
    data: {
      name: 'Sam Rivera',
      email: 'sam@demo.com',
      therapistId: therapist.id,
      consentStatus: 'granted',
      consentDate: new Date(),
    },
  });
  console.log('Created 3 patients');

  const alexMoods = [3, 2, 3, 4, 3, 4, 5];
  for (let i = 0; i < alexMoods.length; i++) {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    await prisma.moodLog.create({
      data: {
        patientId: alex.id,
        score: alexMoods[i],
        note: i === 6 ? 'Feeling better after grounding practice' : undefined,
        createdAt: d,
      },
    });
  }

  const jordanMoods = [4, 3, 3, 2, 1, 1, 1];
  for (let i = 0; i < jordanMoods.length; i++) {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    await prisma.moodLog.create({
      data: {
        patientId: jordan.id,
        score: jordanMoods[i],
        note: i === 6 ? 'Everything feels pointless' : undefined,
        createdAt: d,
      },
    });
  }

  const samMoods = [2, 2, 3, 3, 3, 4, 4];
  for (let i = 0; i < samMoods.length; i++) {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    await prisma.moodLog.create({
      data: {
        patientId: sam.id,
        score: samMoods[i],
        note: i === 6 ? 'Feeling more in control' : undefined,
        createdAt: d,
      },
    });
  }
  console.log('Created mood logs');

  await prisma.assignment.create({
    data: {
      patientId: alex.id, therapistId: therapist.id,
      title: '5-4-3-2-1 Grounding',
      content: 'When anxiety rises, identify 5 things you see, 4 hear, 3 touch, 2 smell, 1 taste.',
      type: 'exercise', completedAt: new Date(),
    },
  });
  await prisma.assignment.create({
    data: {
      patientId: alex.id, therapistId: therapist.id,
      title: 'Thought Record',
      content: 'Write down one automatic negative thought. Identify the distortion and create a balanced thought.',
      type: 'exercise',
    },
  });
  await prisma.assignment.create({
    data: {
      patientId: alex.id, therapistId: therapist.id,
      title: 'Gratitude Journal',
      content: 'Each evening, write down 3 things you are grateful for.',
      type: 'exercise',
    },
  });
  console.log('Created assignments');

  console.log('Seed complete!');
  await prisma.$disconnect();
}

seed().catch((e) => {
  console.error('Seed error:', e);
  process.exit(1);
});
