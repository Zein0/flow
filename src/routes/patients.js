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
            bundle: true,
            ledgers: true
          }
        },
        ledgers: {
          include: {
            order: {
              include: {
                appointment: {
                  include: { doctor: true }
                },
                bundle: true
              }
            }
          },
          orderBy: { occurredAt: 'desc' }
        },
        serviceCredits: {
          include: {
            sessionType: true
          }
        }
      }
    });

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const balance = await getPatientBalance(patient.id);

    // Aggregate service credits by session type
    const creditsSummary = patient.serviceCredits.reduce((acc, credit) => {
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

    res.json({ ...patient, balance, creditsSummary });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', requireAuth, [
  body('name').isLength({ min: 2 }),
  body('phone').optional().isMobilePhone(),
  body('notes').optional().isString(),
  body('insurance').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, phone, notes, insurance } = req.body;

    const patient = await prisma.patient.create({
      data: { name, phone, notes, insurance }
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
  body('notes').optional().isString(),
  body('insurance').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, phone, notes, insurance } = req.body;

    const patient = await prisma.patient.update({
      where: { id: req.params.id },
      data: { name, phone, notes, insurance }
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

// Get patient service credits
router.get('/:id/credits', requireAuth, async (req, res) => {
  try {
    const serviceCredits = await prisma.serviceCredit.findMany({
      where: {
        patientId: req.params.id,
        quantity: { gt: 0 }
      },
      include: {
        sessionType: true
      }
    });

    // Aggregate by session type
    const creditsSummary = serviceCredits.reduce((acc, credit) => {
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

    res.json(creditsSummary);
  } catch (error) {
    console.error('Get service credits error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Purchase bundle
router.post('/:id/bundles/purchase', requireAuth, [
  body('bundleId').isString(),
  body('amountPaid').optional().isFloat({ min: 0 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { bundleId, amountPaid } = req.body;
    const patientId = req.params.id;

    const result = await prisma.$transaction(async (tx) => {
      // Get bundle with items
      const bundle = await tx.bundle.findUnique({
        where: { id: bundleId },
        include: {
          items: {
            include: {
              sessionType: true
            }
          }
        }
      });

      if (!bundle) {
        throw new Error('Bundle not found');
      }

      if (!bundle.active) {
        throw new Error('Bundle is not active');
      }

      const totalPrice = bundle.price;
      const paid = amountPaid !== undefined ? amountPaid : totalPrice;

      // Determine order status
      let orderStatus = 'paid';
      if (paid < totalPrice) {
        orderStatus = 'partially_paid';
      } else if (paid === 0) {
        orderStatus = 'pending';
      }

      // Create order
      const order = await tx.order.create({
        data: {
          patientId,
          bundleId,
          orderType: 'bundle',
          subtotal: totalPrice,
          totalDue: totalPrice,
          status: orderStatus,
          createdBy: req.user.id
        }
      });

      // Create ledger entries
      // Charge
      await tx.ledger.create({
        data: {
          patientId,
          orderId: order.id,
          kind: 'charge',
          amount: totalPrice,
          method: 'cash',
          notes: `Bundle purchase: ${bundle.name}`,
          createdBy: req.user.id
        }
      });

      // Payment (if any)
      if (paid > 0) {
        await tx.ledger.create({
          data: {
            patientId,
            orderId: order.id,
            kind: 'payment',
            amount: paid,
            method: 'cash',
            notes: `Payment for bundle: ${bundle.name}`,
            createdBy: req.user.id
          }
        });
      }

      // Create service credits (regardless of payment status)
      for (const item of bundle.items) {
        // Check if patient already has credits for this session type from this order
        const existingCredit = await tx.serviceCredit.findUnique({
          where: {
            patientId_sessionTypeId_orderId: {
              patientId,
              sessionTypeId: item.sessionTypeId,
              orderId: order.id
            }
          }
        });

        if (existingCredit) {
          // Update existing credit
          await tx.serviceCredit.update({
            where: { id: existingCredit.id },
            data: {
              quantity: existingCredit.quantity + item.quantity
            }
          });
        } else {
          // Create new credit
          await tx.serviceCredit.create({
            data: {
              patientId,
              sessionTypeId: item.sessionTypeId,
              quantity: item.quantity,
              orderId: order.id
            }
          });
        }
      }

      // Audit log
      await tx.auditLog.create({
        data: {
          actorId: req.user.id,
          action: 'bundle.purchase',
          targetType: 'order',
          targetId: order.id,
          metadata: {
            bundleId,
            bundleName: bundle.name,
            totalPrice,
            amountPaid: paid,
            patientId
          }
        }
      });

      return { order, bundle };
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('Bundle purchase error:', error);
    if (error.message === 'Bundle not found' || error.message === 'Bundle is not active') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;