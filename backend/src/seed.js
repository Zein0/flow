const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function seed() {
  try {
    // Create session types
    const sessionTypes = await Promise.all([
      prisma.sessionType.create({
        data: {
          name: 'Consultation',
          price: 150,
          durationMinutes: 60
        }
      }),
      prisma.sessionType.create({
        data: {
          name: 'Follow-up',
          price: 100,
          durationMinutes: 60
        }
      }),
      prisma.sessionType.create({
        data: {
          name: 'Procedure',
          price: 300,
          durationMinutes: 60
        }
      })
    ]);

    // Create admin user
    const adminPassword = await bcrypt.hash('admin123', 12);
    const adminUser = await prisma.user.create({
      data: {
        name: 'Admin User',
        email: 'admin@clinic.com',
        passwordHash: adminPassword,
        role: 'admin'
      }
    });

    // Create sample doctors
    const doctors = await Promise.all([
      prisma.doctor.create({
        data: {
          name: 'Sarah Johnson',
          specialty: 'Internal Medicine',
          active: true
        }
      }),
      prisma.doctor.create({
        data: {
          name: 'Michael Chen',
          specialty: 'Cardiology',
          active: true
        }
      }),
      prisma.doctor.create({
        data: {
          name: 'Emily Rodriguez',
          specialty: 'Dermatology',
          active: true
        }
      })
    ]);

    // Create sample patients
    const patients = await Promise.all([
      prisma.patient.create({
        data: {
          name: 'John Smith',
          phone: '555-0123',
          notes: 'Regular patient, prefers morning appointments'
        }
      }),
      prisma.patient.create({
        data: {
          name: 'Jane Doe',
          phone: '555-0456',
          notes: 'New patient referral'
        }
      })
    ]);

    // Create session lists (which doctors offer which sessions)
    const sessionLists = await Promise.all([
      // Dr. Sarah Johnson - Internal Medicine
      prisma.sessionList.create({
        data: {
          doctorId: doctors[0].id,
          sessionTypeId: sessionTypes[0].id, // Consultation
          customPrice: 150
        }
      }),
      prisma.sessionList.create({
        data: {
          doctorId: doctors[0].id,
          sessionTypeId: sessionTypes[1].id, // Follow-up
          customPrice: 100
        }
      }),
      
      // Dr. Michael Chen - Cardiology
      prisma.sessionList.create({
        data: {
          doctorId: doctors[1].id,
          sessionTypeId: sessionTypes[0].id, // Consultation
          customPrice: 200
        }
      }),
      prisma.sessionList.create({
        data: {
          doctorId: doctors[1].id,
          sessionTypeId: sessionTypes[2].id, // Procedure
          customPrice: 350
        }
      }),
      
      // Dr. Emily Rodriguez - Dermatology
      prisma.sessionList.create({
        data: {
          doctorId: doctors[2].id,
          sessionTypeId: sessionTypes[0].id, // Consultation
          customPrice: 175
        }
      }),
      prisma.sessionList.create({
        data: {
          doctorId: doctors[2].id,
          sessionTypeId: sessionTypes[1].id, // Follow-up
          customPrice: 125
        }
      }),
      prisma.sessionList.create({
        data: {
          doctorId: doctors[2].id,
          sessionTypeId: sessionTypes[2].id, // Procedure
          customPrice: 275
        }
      })
    ]);

    console.log('Seed data created successfully!');
    console.log('Admin login: admin@clinic.com / admin123');
    console.log(`Created ${sessionTypes.length} session types`);
    console.log(`Created ${doctors.length} doctors`);
    console.log(`Created ${patients.length} patients`);
    console.log(`Created ${sessionLists.length} doctor session mappings`);

  } catch (error) {
    console.error('Seeding failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  seed();
}

module.exports = seed;