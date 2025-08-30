const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { body, validationResult, query } = require('express-validator');
const { requireAuth, requireAccounting } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

router.get('/', requireAccounting, [
  query('patientId').optional().isString(),
  query('status').optional().isIn(['pending', 'paid', 'partially_paid', 'cancelled'])
], async (req, res) => {
  try {
    const { patientId, status } = req.query;
    
    let where = {};
    if (patientId) where.patientId = patientId;
    if (status) where.status = status;

    const orders = await prisma.order.findMany({
      where,
      include: {
        patient: true,
        appointment: {
          include: { doctor: true }
        },
        ledgers: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        patient: true,
        appointment: {
          include: { doctor: true, sessionType: true }
        },
        ledgers: {
          include: { createdByUser: true },
          orderBy: { occurredAt: 'desc' }
        }
      }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', requireAccounting, [
  body('subtotal').optional().isFloat({ min: 0 }),
  body('discount').optional().isFloat({ min: 0 }),
  body('totalDue').optional().isFloat({ min: 0 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { subtotal, discount, totalDue } = req.body;

    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: { subtotal, discount, totalDue },
      include: {
        patient: true,
        appointment: true,
        ledgers: true
      }
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.user.id,
        action: 'order.update',
        targetType: 'order',
        targetId: order.id,
        metadata: { subtotal, discount, totalDue }
      }
    });

    res.json(order);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;