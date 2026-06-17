import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create admin user
  const adminUser = await prisma.user.upsert({
    where: { phone: '+201000000000' },
    update: {},
    create: {
      phone: '+201000000000',
      email: 'admin@nabdh.com',
      type: 'ADMIN',
    },
  });
  console.log(`Admin user created: ${adminUser.id}`);

  // Create a sample nurse
  const nurseUser = await prisma.user.upsert({
    where: { phone: '+201111111111' },
    update: {},
    create: {
      phone: '+201111111111',
      type: 'NURSE',
      nurse: {
        create: {
          firstName: 'Mariam',
          lastName: 'Ali',
          licenseNumber: 'EG-NURSE-001',
          licenseExpiryDate: new Date('2027-12-31'),
          status: 'VERIFIED',
          isVerified: true,
          hourlyRate: 150,
          wallet: {
            create: { balance: 500 },
          },
        },
      },
    },
  });
  console.log(`Nurse created: ${nurseUser.id}`);

  // Create a sample patient
  const patientUser = await prisma.user.upsert({
    where: { phone: '+201222222222' },
    update: {},
    create: {
      phone: '+201222222222',
      type: 'PATIENT',
      patient: {
        create: {
          firstName: 'Ahmed',
          lastName: 'Hassan',
        },
      },
    },
  });
  console.log(`Patient created: ${patientUser.id}`);

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
