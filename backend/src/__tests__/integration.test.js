const request = require('supertest');
const { PrismaClient } = require('@prisma/client');
const app = require('../index');

const prisma = new PrismaClient();

describe('Integration Tests', () => {
  let authToken;
  let userId;

  beforeAll(async () => {
    // Create test user and get auth token
    const user = await prisma.user.create({
      data: {
        name: 'Test User',
        email: 'test@example.com',
        passwordHash: '$2a$12$dummy.hash.for.testing',
        role: 'admin'
      }
    });
    userId = user.id;

    // Mock login to get token
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123'
      });
    
    authToken = loginRes.body.token;
  });

  beforeEach(async () => {
    // Clean up test data but preserve user
    await prisma.appointment.deleteMany();
    await prisma.patient.deleteMany();
    await prisma.doctor.deleteMany();
    await prisma.sessionType.deleteMany();
    await prisma.order.deleteMany();
    await prisma.ledger.deleteMany();
    await prisma.reminder.deleteMany();
  });

  afterAll(async () => {
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  describe('Complete Booking Flow', () => {
    it('should handle complete booking, confirmation, and payment flow', async () => {
      // 1. Create session type
      const sessionType = await prisma.sessionType.create({
        data: {
          name: 'Consultation',
          price: 150,
          durationMinutes: 60
        }
      });

      // 2. Create doctor
      const doctorRes = await request(app)
        .post('/api/doctors')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Dr. Smith',
          specialty: 'General Medicine',
          active: true
        });
      
      expect(doctorRes.status).toBe(201);
      const doctor = doctorRes.body;

      // 3. Create patient
      const patientRes = await request(app)
        .post('/api/patients')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'John Doe',
          phone: '555-0123',
          notes: 'Test patient'
        });
      
      expect(patientRes.status).toBe(201);
      const patient = patientRes.body;

      // 4. Check availability
      const availabilityRes = await request(app)
        .get('/api/appointments/availability')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          date: '2024-01-15',
          doctorId: doctor.id
        });
      
      expect(availabilityRes.status).toBe(200);
      expect(availabilityRes.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            hour: 10,
            globalCapacity: 6,
            doctorAvailable: true,
            available: true
          })
        ])
      );

      // 5. Create appointment
      const appointmentRes = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          patientId: patient.id,
          doctorId: doctor.id,
          sessionTypeId: sessionType.id,
          startAt: '2024-01-15T10:00:00Z',
          notes: 'Test appointment'
        });
      
      expect(appointmentRes.status).toBe(201);
      const appointment = appointmentRes.body;
      expect(appointment.status).toBe('scheduled');

      // 6. Confirm appointment
      const confirmRes = await request(app)
        .post(`/api/appointments/${appointment.id}/confirm`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          finalPrice: 175
        });
      
      expect(confirmRes.status).toBe(200);
      expect(confirmRes.body.appointment.status).toBe('confirmed');
      expect(confirmRes.body.appointment.finalPrice).toBe(175);
      expect(confirmRes.body.order).toBeDefined();

      // 7. Record payment
      const paymentRes = await request(app)
        .post(`/patients/${patient.id}/payments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 175,
          method: 'cash',
          orderId: confirmRes.body.order.id
        });
      
      expect(paymentRes.status).toBe(201);

      // 8. Verify order is marked as paid
      const orderRes = await request(app)
        .get(`/api/orders/${confirmRes.body.order.id}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(orderRes.status).toBe(200);
      expect(orderRes.body.status).toBe('paid');

      // 9. Verify reminders were created
      const reminders = await prisma.reminder.findMany({
        where: { appointmentId: appointment.id }
      });
      
      expect(reminders).toHaveLength(2);
      expect(reminders.map(r => r.type)).toEqual(
        expect.arrayContaining(['day_before', 'two_hours_before'])
      );
    });
  });

  describe('Capacity Constraints', () => {
    it('should enforce global capacity limit', async () => {
      const sessionType = await prisma.sessionType.create({
        data: { name: 'Consultation', price: 150, durationMinutes: 60 }
      });

      const doctors = await Promise.all(
        Array.from({ length: 7 }, (_, i) => 
          prisma.doctor.create({
            data: { name: `Doctor ${i + 1}`, active: true }
          })
        )
      );

      const patient = await prisma.patient.create({
        data: { name: 'Test Patient' }
      });

      const startTime = '2024-01-15T10:00:00Z';

      // Create 6 appointments successfully
      for (let i = 0; i < 6; i++) {
        const res = await request(app)
          .post('/api/appointments')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            patientId: patient.id,
            doctorId: doctors[i].id,
            sessionTypeId: sessionType.id,
            startAt: startTime
          });
        
        expect(res.status).toBe(201);
      }

      // 7th appointment should fail
      const failRes = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          patientId: patient.id,
          doctorId: doctors[6].id,
          sessionTypeId: sessionType.id,
          startAt: startTime
        });
      
      expect(failRes.status).toBe(400);
      expect(failRes.body.error).toContain('Capacity reached');
    });

    it('should enforce doctor single appointment per hour', async () => {
      const sessionType = await prisma.sessionType.create({
        data: { name: 'Consultation', price: 150, durationMinutes: 60 }
      });

      const doctor = await prisma.doctor.create({
        data: { name: 'Dr. Smith', active: true }
      });

      const patients = await Promise.all([
        prisma.patient.create({ data: { name: 'Patient 1' } }),
        prisma.patient.create({ data: { name: 'Patient 2' } })
      ]);

      const startTime = '2024-01-15T10:00:00Z';

      // First appointment should succeed
      const firstRes = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          patientId: patients[0].id,
          doctorId: doctor.id,
          sessionTypeId: sessionType.id,
          startAt: startTime
        });
      
      expect(firstRes.status).toBe(201);

      // Second appointment with same doctor should fail
      const secondRes = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          patientId: patients[1].id,
          doctorId: doctor.id,
          sessionTypeId: sessionType.id,
          startAt: startTime
        });
      
      expect(secondRes.status).toBe(400);
      expect(secondRes.body.error).toContain('Doctor already has an appointment');
    });
  });
});