const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { body, validationResult } = require('express-validator');
const { requireAuth } = require('../middleware/auth');
const { createAppointment } = require('../services/booking');
const { addWeeks, isBefore, isAfter } = require('date-fns');

const router = express.Router();
const prisma = new PrismaClient();

router.post('/', requireAuth, [
  body('patientId').isString(),
  body('doctorId').isString(),
  body('sessionTypeId').isString(),
  body('startAt').isISO8601(),
  body('endDate').isISO8601(),
  body('notes').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { patientId, doctorId, sessionTypeId, startAt, endDate, notes } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      // Create recurrence record
      const recurrence = await tx.recurrence.create({
        data: {
          startDate: new Date(startAt),
          endDate: new Date(endDate),
          frequency: 'weekly',
          interval: 1
        }
      });

      const appointments = [];
      const conflicts = [];
      let currentDate = new Date(startAt);
      const endDateObj = new Date(endDate);

      while (isBefore(currentDate, endDateObj) || currentDate.getTime() === endDateObj.getTime()) {
        try {
          const appointment = await createAppointment({
            patientId,
            doctorId,
            sessionTypeId,
            startAt: currentDate,
            notes,
            createdBy: req.user.id,
            recurrenceId: recurrence.id
          });
          appointments.push(appointment);
        } catch (error) {
          conflicts.push({
            date: currentDate.toISOString(),
            error: error.message
          });
        }

        currentDate = addWeeks(currentDate, 1);
      }

      await tx.auditLog.create({
        data: {
          actorId: req.user.id,
          action: 'recurrence.create',
          targetType: 'recurrence',
          targetId: recurrence.id,
          metadata: { 
            appointmentsCreated: appointments.length,
            conflicts: conflicts.length,
            startDate: startAt,
            endDate
          }
        }
      });

      return {
        recurrence,
        createdCount: appointments.length,
        conflicts,
        appointments
      };
    });

    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const recurrence = await prisma.recurrence.findUnique({
      where: { id: req.params.id },
      include: {
        appointments: {
          include: {
            patient: true,
            doctor: true,
            sessionType: true
          },
          orderBy: { startAt: 'asc' }
        },
        exceptions: true
      }
    });

    if (!recurrence) {
      return res.status(404).json({ error: 'Recurrence not found' });
    }

    res.json(recurrence);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id/future', requireAuth, async (req, res) => {
  try {
    const recurrenceId = req.params.id;
    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
      // Cancel all future appointments in this recurrence
      const cancelledAppointments = await tx.appointment.updateMany({
        where: {
          recurrenceId,
          startAt: { gte: now },
          status: { not: 'cancelled' }
        },
        data: { status: 'cancelled' }
      });

      // Cancel pending reminders for future appointments
      await tx.reminder.updateMany({
        where: {
          appointment: {
            recurrenceId,
            startAt: { gte: now }
          },
          status: 'pending'
        },
        data: { status: 'failed' }
      });

      await tx.auditLog.create({
        data: {
          actorId: req.user.id,
          action: 'recurrence.cancel_future',
          targetType: 'recurrence',
          targetId: recurrenceId,
          metadata: { cancelledCount: cancelledAppointments.count }
        }
      });

      return cancelledAppointments;
    });

    res.json({ message: 'Future appointments cancelled', count: result.count });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;