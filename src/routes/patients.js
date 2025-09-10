const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { body, validationResult, query } = require('express-validator');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { recordPayment, getPatientBalance } = require('../services/ledger');

const router = express.Router();
const prisma = new PrismaClient();

router.get('/', requireAuth, [
  query('search').optional().isString()
], async (req, res) => {
  try {
    const { search } = req.query;
    
    const where = search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } }
      ]
    } : {};

    const patients = await prisma.patient.findMany({
      where,
      include: {
        _count: {
          select: { ledgers: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    res.json(patients);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const patient = await prisma.patient.findUnique({
      where: { id: req.params.id },
      include: {
        appointments: {
          include: {
            doctor: true,
            sessionType: true
          },
          orderBy: { startAt: 'desc' }
        },
        orders: {
          include: {
            appointment: true,
            ledgers: true
          }
        },
        ledgers: {
          include: {
            order: {
              include: {
                appointment: {
                  include: { doctor: true }
                }
              }
            }
          },
          orderBy: { occurredAt: 'desc' }
        }
      }
    });

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const balance = await getPatientBalance(patient.id);
    
    res.json({ ...patient, balance });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', requireAuth, [
  body('name').isLength({ min: 2 }),
  body('phone').optional().isMobilePhone(),
  body('notes').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, phone, notes } = req.body;

    const patient = await prisma.patient.create({
      data: { name, phone, notes }
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.user.id,
        action: 'patient.create',
        targetType: 'patient',
        targetId: patient.id,
        metadata: { name, phone }
      }
    });

    res.status(201).json(patient);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', requireAuth, [
  body('name').optional().isLength({ min: 2 }),
  body('phone').optional().isMobilePhone(),
  body('notes').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, phone, notes } = req.body;

    const patient = await prisma.patient.update({
      where: { id: req.params.id },
      data: { name, phone, notes }
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.user.id,
        action: 'patient.update',
        targetType: 'patient',
        targetId: patient.id,
        metadata: { name, phone, notes }
      }
    });

    res.json(patient);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Patient not found' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/payments', requireAuth, [
  body('amount').isFloat({ min: 0.01 }),
  body('method').isIn(['cash']),
  body('orderId').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { amount, method, orderId } = req.body;

    const payment = await recordPayment({
      patientId: req.params.id,
      orderId,
      amount,
      method,
      createdBy: req.user.id
    });

    res.status(201).json(payment);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id/appointments/future', requireAdmin, async (req, res) => {
  try {
    const now = new Date();
    const deleted = await prisma.appointment.deleteMany({
      where: {
        patientId: req.params.id,
        startAt: { gt: now }
      }
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.user.id,
        action: 'patient.delete_future_appointments',
        targetType: 'patient',
        targetId: req.params.id,
        metadata: { count: deleted.count }
      }
    });

    res.json({ deleted: deleted.count });
  } catch (error) {
    console.error('Delete future appointments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;