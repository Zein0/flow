const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { body, validationResult } = require('express-validator');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Get all session types
router.get('/', requireAuth, async (req, res) => {
  try {
    const sessionTypes = await prisma.sessionType.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(sessionTypes);
  } catch (error) {
    console.error('GET session types error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create session type
router.post('/', requireAdmin, [
  body('name').isString().notEmpty(),
  body('price').isFloat({ min: 0.01 }),
  body('durationMinutes').isInt({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, price, durationMinutes } = req.body;

    const sessionType = await prisma.sessionType.create({
      data: {
        name,
        price,
        durationMinutes
      }
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.user.id,
        action: 'session_type.create',
        targetType: 'session_type',
        targetId: sessionType.id,
        metadata: { name, price, durationMinutes }
      }
    });

    res.status(201).json(sessionType);
  } catch (error) {
    console.error('Create session type error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update session type
router.put('/:id', requireAdmin, [
  body('name').optional().isString().notEmpty(),
  body('price').optional().isFloat({ min: 0.01 }),
  body('durationMinutes').optional().isInt({ min: 1 }),
  body('active').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const updateData = {};
    if (req.body.name !== undefined) updateData.name = req.body.name;
    if (req.body.price !== undefined) updateData.price = req.body.price;
    if (req.body.durationMinutes !== undefined) updateData.durationMinutes = req.body.durationMinutes;
    if (req.body.active !== undefined) updateData.active = req.body.active;

    const sessionType = await prisma.sessionType.update({
      where: { id: req.params.id },
      data: updateData
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.user.id,
        action: 'session_type.update',
        targetType: 'session_type',
        targetId: sessionType.id,
        metadata: updateData
      }
    });

    res.json(sessionType);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Session type not found' });
    }
    console.error('Update session type error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Check if session type can be deleted
router.get('/:id/can-delete', requireAdmin, async (req, res) => {
  try {
    const appointmentCount = await prisma.appointment.count({
      where: { sessionTypeId: req.params.id }
    });

    res.json({ canDelete: appointmentCount === 0, appointmentCount });
  } catch (error) {
    console.error('Check delete session type error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;