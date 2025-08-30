const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { body, validationResult } = require('express-validator');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const bcrypt = require('bcrypt');


const router = express.Router();
const prisma = new PrismaClient();

router.get('/', requireAuth, async (req, res) => {
  try {
    const doctors = await prisma.doctor.findMany({
      include: {
        sessionLists: {
          include: {
            sessionType: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    res.json(doctors);
  } catch (error) {
    console.error('GET doctors error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const doctor = await prisma.doctor.findUnique({
      where: { id: req.params.id },
      include: {
        appointments: {
          where: {
            startAt: { gte: new Date() },
            status: { not: 'cancelled' }
          },
          include: {
            patient: true,
            sessionType: true
          },
          orderBy: { startAt: 'asc' }
        }
      }
    });

    if (!doctor) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    res.json(doctor);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', requireAdmin, [
  body('name').isLength({ min: 2 }),
  body('email').isEmail(),
  body('password').isLength({ min: 6 }),
  body('specialty').optional().isString(),
  body('active').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password, specialty, active = true } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      // Check if email already exists
      const existingUser = await tx.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        throw new Error('Email already exists');
      }

      // Create user account
      const passwordHash = await bcrypt.hash(password, 10);
      const user = await tx.user.create({
        data: {
          name,
          email,
          passwordHash,
          role: 'doctor'
        }
      });

      // Create doctor profile
      const doctor = await tx.doctor.create({
        data: { name, specialty, active }
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          actorId: req.user.id,
          action: 'doctor.create',
          targetType: 'doctor',
          targetId: doctor.id,
          metadata: { name, specialty, email }
        }
      });

      return { doctor, user };
    });

    res.status(201).json(result.doctor);
  } catch (error) {
    console.error('Create doctor error:', error);
    if (error.message === 'Email already exists') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', requireAdmin, [
  body('name').optional().isLength({ min: 2 }),
  body('specialty').optional().isString(),
  body('active').optional().isBoolean(),
  body('password').optional().isLength({ min: 6 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, specialty, active, password } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      // Update doctor
      const doctor = await tx.doctor.update({
        where: { id: req.params.id },
        data: { name, specialty, active }
      });

      // Update user account if password provided
      if (password) {
        const passwordHash = await bcrypt.hash(password, 10);
        
        await tx.user.updateMany({
          where: { 
            name: doctor.name,
            role: 'doctor'
          },
          data: { passwordHash }
        });
      }

      // Audit log
      await tx.auditLog.create({
        data: {
          actorId: req.user.id,
          action: 'doctor.update',
          targetType: 'doctor',
          targetId: doctor.id,
          metadata: { name, specialty, active, passwordChanged: !!password }
        }
      });

      return doctor;
    });

    res.json(result);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Doctor not found' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add session to doctor
router.post('/:id/sessions', requireAdmin, [
  body('sessionTypeId').isString(),
  body('customPrice').optional().isFloat({ min: 0 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { sessionTypeId, customPrice } = req.body;
    const doctorId = req.params.id;

    // Get session type to use default price if custom price not provided
    const sessionType = await prisma.sessionType.findUnique({
      where: { id: sessionTypeId }
    });

    if (!sessionType) {
      return res.status(400).json({ error: 'Invalid session type' });
    }

    const sessionList = await prisma.sessionList.create({
      data: {
        doctorId,
        sessionTypeId,
        customPrice: customPrice ? parseFloat(customPrice) : sessionType.price
      },
      include: {
        sessionType: true
      }
    });

    res.status(201).json(sessionList);
  } catch (error) {
    console.error('ADD doctor session error:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Doctor already has this session type' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update doctor session
router.put('/:id/sessions/:sessionListId', requireAdmin, [
  body('customPrice').optional().isFloat({ min: 0 })
], async (req, res) => {
  try {
    const { customPrice } = req.body;

    const sessionList = await prisma.sessionList.update({
      where: { id: req.params.sessionListId },
      data: { customPrice },
      include: {
        sessionType: true
      }
    });

    res.json(sessionList);
  } catch (error) {
    console.error('UPDATE doctor session error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Session not found' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete doctor session
router.delete('/:id/sessions/:sessionListId', requireAdmin, async (req, res) => {
  try {
    await prisma.sessionList.delete({
      where: { id: req.params.sessionListId }
    });

    res.status(204).send();
  } catch (error) {
    console.error('DELETE doctor session error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Session not found' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;