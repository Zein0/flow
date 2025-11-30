const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { body, validationResult, query } = require('express-validator');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { createAppointment, confirmAppointment, getAvailability, cancelAppointment } = require('../services/booking');

const router = express.Router();
const prisma = new PrismaClient();

router.get('/', requireAuth, [
  query('date').optional().isISO8601(),
  query('doctorId').optional().isString(),
  query('patientId').optional().isString(),
  query('status').optional().isString()
], async (req, res) => {
  try {
    const { date, doctorId, patientId, status } = req.query;
    
    let where = {};
    
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      where.startAt = { gte: startOfDay, lte: endOfDay };
    }
    if (req.user.role === 'doctor') {
      // Find the doctor record associated with this user by matching name and email
      const doctor = await prisma.doctor.findFirst({
        where: { 
          name: req.user.name
        }
      });
      
      if (doctor) {
        where.doctorId = doctor.id;
      } else {
        // If no doctor record found, return empty array to prevent showing all appointments
        return res.json([]);
      }
    } else if (doctorId) {
      where.doctorId = doctorId;
    }
    if (patientId) where.patientId = patientId;
    if (status) where.status = status;

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        patient: {
          include: {
            serviceCredits: {
              include: {
                sessionType: true
              }
            }
          }
        },
        doctor: true,
        sessionType: true
      },
      orderBy: { startAt: 'asc' }
    });

    // Aggregate service credits for each patient
    const appointmentsWithCredits = appointments.map(appointment => {
      const creditsSummary = appointment.patient.serviceCredits.reduce((acc, credit) => {
        const existing = acc.find(c => c.sessionTypeId === credit.sessionTypeId);
        if (existing) {
          existing.quantity += credit.quantity;
        } else {
          acc.push({
            sessionTypeId: credit.sessionTypeId,
            sessionTypeName: credit.sessionType.name,
            quantity: credit.quantity
          });
        }
        return acc;
      }, []);

      return {
        ...appointment,
        patient: {
          ...appointment.patient,
          creditsSummary,
          serviceCredits: undefined // Remove raw serviceCredits from response
        }
      };
    });

    res.json(appointmentsWithCredits);
  } catch (error) {
    console.error('GET appointments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/counts', requireAuth, [
  query('startDate').isISO8601(),
  query('endDate').isISO8601(),
  query('doctorId').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { startDate, endDate, doctorId } = req.query;
    
    let where = {
      startAt: {
        gte: new Date(startDate),
        lte: new Date(endDate)
      },
      status: {
        not: 'cancelled'
      }
    };
    
    if (req.user.role === 'doctor') {
      // Find the doctor record associated with this user
      const doctor = await prisma.doctor.findFirst({
        where: { 
          name: req.user.name
        }
      });
      
      if (doctor) {
        where.doctorId = doctor.id;
      } else {
        return res.json({});
      }
    } else if (doctorId) {
      where.doctorId = doctorId;
    }

    const appointments = await prisma.appointment.findMany({
      where,
      select: {
        startAt: true
      }
    });

    // Group appointments by date
    const counts = {};
    appointments.forEach(apt => {
      const date = apt.startAt.toISOString().split('T')[0];
      counts[date] = (counts[date] || 0) + 1;
    });

    res.json(counts);
  } catch (error) {
    console.error('GET appointment counts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/availability', requireAuth, [
  query('date').isISO8601(),
  query('doctorId').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { date, doctorId } = req.query;
    const availability = await getAvailability(doctorId, new Date(date));
    
    res.json(availability);
  } catch (error) {
    console.error('GET availability error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/available-doctors', requireAuth, [
  query('date').isISO8601(),
  query('hour').isInt({ min: 0, max: 23 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { date, hour } = req.query;
    const startTime = new Date(date);
    startTime.setHours(parseInt(hour), 0, 0, 0);
    const endTime = new Date(startTime);
    endTime.setHours(startTime.getHours() + 1);

    // Get doctors who don't have appointments at this hour
    const busyDoctors = await prisma.appointment.findMany({
      where: {
        startAt: { gte: startTime, lt: endTime },
        status: { not: 'cancelled' }
      },
      select: { doctorId: true }
    });

    const busyDoctorIds = busyDoctors.map(apt => apt.doctorId);

    // Get available doctors with their session offerings
    const availableDoctors = await prisma.doctor.findMany({
      where: {
        active: true,
        id: { notIn: busyDoctorIds }
      },
      include: {
        sessionLists: {
          include: {
            sessionType: true
          }
        }
      }
    });

    res.json(availableDoctors);
  } catch (error) {
    console.error('GET available doctors error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', requireAuth, [
  body('patientId').isString(),
  body('doctorId').isString(),
  body('sessionTypeId').isString(),
  body('startAt').isISO8601(),
  body('notes').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { patientId, doctorId, sessionTypeId, startAt, notes } = req.body;

    const appointment = await createAppointment({
      patientId,
      doctorId,
      sessionTypeId,
      startAt: new Date(startAt),
      notes,
      createdBy: req.user.id
    });

    res.status(201).json(appointment);
  } catch (error) {
    console.error('Appointment creation error:', error);
    if (error.message.includes('Capacity reached') || error.message.includes('Doctor already has')) {
      return res.status(400).json({ error: error.message });
    }
    if (error.code === 'P2003') {
      return res.status(400).json({ error: 'Invalid reference: Check patient, doctor, or session type IDs' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/confirm', requireAuth, [
  body('finalPrice').optional().isFloat({ min: 0 }),
  body('paymentMethod').optional().isIn(['cash', 'service_credit'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { finalPrice, paymentMethod = 'cash' } = req.body;

    const result = await confirmAppointment(req.params.id, {
      finalPrice,
      paymentMethod,
      createdBy: req.user.id
    });

    res.json(result);
  } catch (error) {
    console.error('Confirm appointment error:', error);
    if (error.message.includes('not found') || error.message.includes('cannot be confirmed') || error.message.includes('No service credits')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/cancel', requireAuth, [
  body('reason').optional().isString()
], async (req, res) => {
  try {
    const { reason } = req.body;

    const appointment = await cancelAppointment(req.params.id, {
      reason,
      createdBy: req.user.id
    });

    res.json(appointment);
  } catch (error) {
    console.error('Cancel appointment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id/status', requireAuth, [
  body('status').isIn(['completed', 'no_show'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { status } = req.body;

    const appointment = await prisma.appointment.update({
      where: { id: req.params.id },
      data: { status },
      include: {
        patient: true,
        doctor: true,
        sessionType: true
      }
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.user.id,
        action: 'appointment.status_update',
        targetType: 'appointment',
        targetId: appointment.id,
        metadata: { status }
      }
    });

    res.json(appointment);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;