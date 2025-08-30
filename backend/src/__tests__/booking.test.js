const { PrismaClient } = require('@prisma/client');
const { createAppointment, confirmAppointment } = require('../services/booking');

const prisma = new PrismaClient();

describe('Booking Service', () => {
  beforeEach(async () => {
    // Clean up test data
    await prisma.appointment.deleteMany();
    await prisma.patient.deleteMany();
    await prisma.doctor.deleteMany();
    await prisma.user.deleteMany();
    await prisma.sessionType.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Global Capacity Enforcement', () => {
    it('should prevent creating 7th appointment in same hour', async () => {
      // Setup test data
      const user = await prisma.user.create({
        data: {
          name: 'Test User',
          email: 'test@example.com',
          passwordHash: 'hash',
          role: 'admin'
        }
      });

      const sessionType = await prisma.sessionType.create({
        data: {
          name: 'Consultation',
          price: 150,
          durationMinutes: 60
        }
      });

      // Create 6 doctors and 1 patient
      const doctors = await Promise.all(
        Array.from({ length: 6 }, (_, i) => 
          prisma.doctor.create({
            data: {
              name: `Doctor ${i + 1}`,
              specialty: 'General',
              active: true
            }
          })
        )
      );

      const patient = await prisma.patient.create({
        data: {
          name: 'Test Patient',
          phone: '555-0123'
        }
      });

      const startTime = new Date('2024-01-15T10:00:00Z');

      // Create 6 appointments for same hour
      for (let i = 0; i < 6; i++) {
        await createAppointment({
          patientId: patient.id,
          doctorId: doctors[i].id,
          startAt: startTime,
          sessionTypeId: sessionType.id,
          createdBy: user.id
        });
      }

      // Try to create 7th appointment - should fail
      await expect(
        createAppointment({
          patientId: patient.id,
          doctorId: doctors[0].id, // Reuse doctor (will test doctor capacity next)
          startAt: startTime,
          sessionTypeId: sessionType.id,
          createdBy: user.id
        })
      ).rejects.toThrow('Capacity reached for this hour (6 appointments max).');
    });
  });

  describe('Doctor Capacity Enforcement', () => {
    it('should prevent doctor from having 2 appointments in same hour', async () => {
      // Setup test data
      const user = await prisma.user.create({
        data: {
          name: 'Test User',
          email: 'test@example.com',
          passwordHash: 'hash',
          role: 'admin'
        }
      });

      const sessionType = await prisma.sessionType.create({
        data: {
          name: 'Consultation',
          price: 150,
          durationMinutes: 60
        }
      });

      const doctor = await prisma.doctor.create({
        data: {
          name: 'Dr. Smith',
          specialty: 'General',
          active: true
        }
      });

      const patients = await Promise.all([
        prisma.patient.create({
          data: { name: 'Patient 1', phone: '555-0001' }
        }),
        prisma.patient.create({
          data: { name: 'Patient 2', phone: '555-0002' }
        })
      ]);

      const startTime = new Date('2024-01-15T10:00:00Z');

      // Create first appointment
      await createAppointment({
        patientId: patients[0].id,
        doctorId: doctor.id,
        startAt: startTime,
        sessionTypeId: sessionType.id,
        createdBy: user.id
      });

      // Try to create second appointment for same doctor at same hour - should fail
      await expect(
        createAppointment({
          patientId: patients[1].id,
          doctorId: doctor.id,
          startAt: startTime,
          sessionTypeId: sessionType.id,
          createdBy: user.id
        })
      ).rejects.toThrow('Doctor already has an appointment at this hour.');
    });
  });

  describe('Appointment Confirmation', () => {
    it('should create order and ledger entry when confirming appointment', async () => {
      // Setup test data
      const user = await prisma.user.create({
        data: {
          name: 'Test User',
          email: 'test@example.com',
          passwordHash: 'hash',
          role: 'admin'
        }
      });

      const sessionType = await prisma.sessionType.create({
        data: {
          name: 'Consultation',
          price: 150,
          durationMinutes: 60
        }
      });

      const doctor = await prisma.doctor.create({
        data: {
          name: 'Dr. Smith',
          specialty: 'General',
          active: true
        }
      });

      const patient = await prisma.patient.create({
        data: { name: 'Test Patient', phone: '555-0123' }
      });

      // Create appointment
      const appointment = await createAppointment({
        patientId: patient.id,
        doctorId: doctor.id,
        startAt: new Date('2024-01-15T10:00:00Z'),
        sessionTypeId: sessionType.id,
        createdBy: user.id
      });

      // Confirm appointment
      const result = await confirmAppointment(appointment.id, {
        finalPrice: 175,
        createdBy: user.id
      });

      expect(result.appointment.status).toBe('confirmed');
      expect(result.appointment.finalPrice).toBe(175);
      expect(result.order).toBeDefined();
      expect(result.order.totalDue).toBe(175);

      // Check ledger entry was created
      const ledgerEntry = await prisma.ledger.findFirst({
        where: { orderId: result.order.id }
      });
      expect(ledgerEntry).toBeDefined();
      expect(ledgerEntry.kind).toBe('charge');
      expect(ledgerEntry.amount).toBe(175);
    });
  });

  describe('Reminder Generation', () => {
    it('should create appropriate reminders when confirming appointment', async () => {
      // Setup test data
      const user = await prisma.user.create({
        data: {
          name: 'Test User',
          email: 'test@example.com',
          passwordHash: 'hash',
          role: 'admin'
        }
      });

      const sessionType = await prisma.sessionType.create({
        data: {
          name: 'Consultation',
          price: 150,
          durationMinutes: 60
        }
      });

      const doctor = await prisma.doctor.create({
        data: {
          name: 'Dr. Smith',
          specialty: 'General',
          active: true
        }
      });

      const patient = await prisma.patient.create({
        data: { name: 'Test Patient', phone: '555-0123' }
      });

      // Create appointment 3 days in future
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 3);
      futureDate.setHours(14, 0, 0, 0); // 2 PM

      const appointment = await createAppointment({
        patientId: patient.id,
        doctorId: doctor.id,
        startAt: futureDate,
        sessionTypeId: sessionType.id,
        createdBy: user.id
      });

      // Confirm appointment
      await confirmAppointment(appointment.id, {
        finalPrice: 150,
        createdBy: user.id
      });

      // Check reminders were created
      const reminders = await prisma.reminder.findMany({
        where: { appointmentId: appointment.id }
      });

      expect(reminders).toHaveLength(2);
      expect(reminders.some(r => r.type === 'day_before')).toBe(true);
      expect(reminders.some(r => r.type === 'two_hours_before')).toBe(true);
    });
  });
});