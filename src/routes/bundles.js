const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { body, validationResult } = require('express-validator');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Get all bundles
router.get('/', requireAuth, async (req, res) => {
  try {
    const { active } = req.query;

    let where = {};
    if (active === 'true') {
      where.active = true;
    }

    const bundles = await prisma.bundle.findMany({
      where,
      include: {
        items: {
          include: {
            sessionType: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(bundles);
  } catch (error) {
    console.error('GET bundles error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single bundle
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const bundle = await prisma.bundle.findUnique({
      where: { id: req.params.id },
      include: {
        items: {
          include: {
            sessionType: true
          }
        }
      }
    });

    if (!bundle) {
      return res.status(404).json({ error: 'Bundle not found' });
    }

    res.json(bundle);
  } catch (error) {
    console.error('GET bundle error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create bundle
router.post('/', requireAdmin, [
  body('name').isString().notEmpty(),
  body('price').isFloat({ min: 0 }),
  body('items').isArray({ min: 1 }),
  body('items.*.sessionTypeId').isString(),
  body('items.*.quantity').isInt({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, price, items, active = true } = req.body;

    const bundle = await prisma.$transaction(async (tx) => {
      // Create bundle
      const newBundle = await tx.bundle.create({
        data: {
          name,
          price,
          active,
          items: {
            create: items.map(item => ({
              sessionTypeId: item.sessionTypeId,
              quantity: item.quantity
            }))
          }
        },
        include: {
          items: {
            include: {
              sessionType: true
            }
          }
        }
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          actorId: req.user.id,
          action: 'bundle.create',
          targetType: 'bundle',
          targetId: newBundle.id,
          metadata: { name, price, itemsCount: items.length }
        }
      });

      return newBundle;
    });

    res.status(201).json(bundle);
  } catch (error) {
    console.error('Create bundle error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update bundle
router.put('/:id', requireAdmin, [
  body('name').optional().isString().notEmpty(),
  body('price').optional().isFloat({ min: 0 }),
  body('active').optional().isBoolean(),
  body('items').optional().isArray({ min: 1 }),
  body('items.*.sessionTypeId').optional().isString(),
  body('items.*.quantity').optional().isInt({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, price, active, items } = req.body;

    const bundle = await prisma.$transaction(async (tx) => {
      // Check if bundle exists
      const existingBundle = await tx.bundle.findUnique({
        where: { id: req.params.id }
      });

      if (!existingBundle) {
        throw new Error('Bundle not found');
      }

      // Update bundle basic info
      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (price !== undefined) updateData.price = price;
      if (active !== undefined) updateData.active = active;

      const updatedBundle = await tx.bundle.update({
        where: { id: req.params.id },
        data: updateData,
        include: {
          items: {
            include: {
              sessionType: true
            }
          }
        }
      });

      // Update items if provided
      if (items) {
        // Delete existing items
        await tx.bundleItem.deleteMany({
          where: { bundleId: req.params.id }
        });

        // Create new items
        await tx.bundleItem.createMany({
          data: items.map(item => ({
            bundleId: req.params.id,
            sessionTypeId: item.sessionTypeId,
            quantity: item.quantity
          }))
        });
      }

      // Audit log
      await tx.auditLog.create({
        data: {
          actorId: req.user.id,
          action: 'bundle.update',
          targetType: 'bundle',
          targetId: req.params.id,
          metadata: { name, price, active, itemsUpdated: items ? true : false }
        }
      });

      // Fetch updated bundle with items
      return await tx.bundle.findUnique({
        where: { id: req.params.id },
        include: {
          items: {
            include: {
              sessionType: true
            }
          }
        }
      });
    });

    res.json(bundle);
  } catch (error) {
    console.error('Update bundle error:', error);
    if (error.message === 'Bundle not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete bundle (soft delete - mark as inactive)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const bundle = await prisma.$transaction(async (tx) => {
      const existingBundle = await tx.bundle.findUnique({
        where: { id: req.params.id }
      });

      if (!existingBundle) {
        throw new Error('Bundle not found');
      }

      // Soft delete - mark as inactive
      const deletedBundle = await tx.bundle.update({
        where: { id: req.params.id },
        data: { active: false }
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          actorId: req.user.id,
          action: 'bundle.delete',
          targetType: 'bundle',
          targetId: req.params.id,
          metadata: { name: existingBundle.name }
        }
      });

      return deletedBundle;
    });

    res.json({ message: 'Bundle deleted successfully', bundle });
  } catch (error) {
    console.error('Delete bundle error:', error);
    if (error.message === 'Bundle not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
