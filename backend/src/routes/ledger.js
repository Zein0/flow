const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { body, validationResult, query } = require('express-validator');
const { requireAuth, requireAccounting } = require('../middleware/auth');
const { createCreditNote, getOutstandingOrders } = require('../services/ledger');

const router = express.Router();
const prisma = new PrismaClient();

router.get('/', requireAccounting, [
  query('patientId').optional().isString(),
  query('from').optional().isISO8601(),
  query('to').optional().isISO8601()
], async (req, res) => {
  try {
    const { patientId, from, to } = req.query;
    
    let where = {};
    if (patientId) where.patientId = patientId;
    if (from || to) {
      where.occurredAt = {};
      if (from) where.occurredAt.gte = new Date(from);
      if (to) where.occurredAt.lte = new Date(to);
    }

    const entries = await prisma.ledger.findMany({
      where,
      include: {
        patient: true,
        order: {
          include: { appointment: { include: { doctor: true } } }
        },
        createdByUser: true
      },
      orderBy: { occurredAt: 'desc' }
    });

    res.json(entries);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/outstanding', requireAccounting, async (req, res) => {
  try {
    const orders = await getOutstandingOrders();
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Record payment
router.post('/payments', requireAuth, [
  body('patientId').isString(),
  body('amount').isFloat({ min: 0.01 }),
  body('method').isIn(['cash']),
  body('orderId').optional().isString(),
  body('notes').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { patientId, amount, method, orderId, notes } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      let remainingAmount = amount;
      
      if (orderId) {
        // Payment for specific order
        const order = await tx.order.findUnique({
          where: { id: orderId },
          include: { ledgers: true }
        });

        if (order) {
          const totalPaid = order.ledgers
            .filter(l => l.kind === 'payment')
            .reduce((sum, l) => sum + l.amount, 0);
          
          const amountDue = order.totalDue - totalPaid;
          const paymentForOrder = Math.min(remainingAmount, amountDue);
          
          if (paymentForOrder > 0) {
            // Create payment for this order
            await tx.ledger.create({
              data: {
                patientId,
                orderId,
                kind: 'payment',
                amount: paymentForOrder,
                method,
                notes,
                createdBy: req.user.id
              }
            });

            const newStatus = (totalPaid + paymentForOrder) >= order.totalDue ? 'paid' : 'partially_paid';
            await tx.order.update({
              where: { id: orderId },
              data: { status: newStatus }
            });

            remainingAmount -= paymentForOrder;
          }
        }
      } else {
        // General payment - apply to oldest unpaid orders first
        const unpaidOrders = await tx.order.findMany({
          where: {
            patientId,
            status: { in: ['pending', 'partially_paid'] }
          },
          include: { ledgers: true },
          orderBy: { createdAt: 'asc' }
        });

        for (const order of unpaidOrders) {
          if (remainingAmount <= 0) break;

          const totalPaid = order.ledgers
            .filter(l => l.kind === 'payment')
            .reduce((sum, l) => sum + l.amount, 0);
          
          const amountDue = order.totalDue - totalPaid;
          const paymentForOrder = Math.min(remainingAmount, amountDue);
          
          if (paymentForOrder > 0) {
            await tx.ledger.create({
              data: {
                patientId,
                orderId: order.id,
                kind: 'payment',
                amount: paymentForOrder,
                method,
                notes: notes || `Auto-applied from general payment`,
                createdBy: req.user.id
              }
            });

            const newStatus = (totalPaid + paymentForOrder) >= order.totalDue ? 'paid' : 'partially_paid';
            await tx.order.update({
              where: { id: order.id },
              data: { status: newStatus }
            });

            remainingAmount -= paymentForOrder;
          }
        }
      }

      // If there's remaining amount, add to patient credit balance
      if (remainingAmount > 0) {
        await tx.patient.update({
          where: { id: patientId },
          data: {
            creditBalance: { increment: remainingAmount }
          }
        });

        // Create credit entry
        await tx.ledger.create({
          data: {
            patientId,
            kind: 'credit',
            amount: remainingAmount,
            method,
            notes: notes || 'Overpayment credit',
            createdBy: req.user.id
          }
        });
      }

      // Return summary ledger entry
      return await tx.ledger.create({
        data: {
          patientId,
          orderId,
          kind: 'payment',
          amount,
          method,
          notes,
          createdBy: req.user.id
        }
      });
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('Record payment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Waive amount
router.post('/waive', requireAuth, [
  body('patientId').isString(),
  body('amount').isFloat({ min: 0.01 }),
  body('reason').isString().notEmpty(),
  body('orderId').isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { patientId, amount, reason, orderId } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      let remainingWaive = amount;

      // Get the specific order
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { ledgers: true }
      });

      if (!order) {
        throw new Error('Order not found');
      }

      const totalPaid = order.ledgers
        .filter(l => l.kind === 'payment')
        .reduce((sum, l) => sum + l.amount, 0);
      
      const totalWaived = Math.abs(order.ledgers
        .filter(l => l.kind === 'waive')
        .reduce((sum, l) => sum + l.amount, 0));

      const amountDue = Math.max(0, order.totalDue - totalPaid - totalWaived);
      const waiveForOrder = Math.min(remainingWaive, amountDue);

      if (waiveForOrder > 0) {
        // Create waive entry for this order
        await tx.ledger.create({
          data: {
            patientId,
            orderId,
            kind: 'waive',
            amount: -waiveForOrder,
            method: 'cash',
            notes: reason,
            createdBy: req.user.id
          }
        });

        const newStatus = (totalPaid + totalWaived + waiveForOrder) >= order.totalDue ? 'paid' : 'partially_paid';
        await tx.order.update({
          where: { id: orderId },
          data: { status: newStatus }
        });

        remainingWaive -= waiveForOrder;
      }

      // If waiving more than what's owed on this order, apply to other orders
      if (remainingWaive > 0) {
        const otherUnpaidOrders = await tx.order.findMany({
          where: {
            patientId,
            id: { not: orderId },
            status: { in: ['pending', 'partially_paid'] }
          },
          include: { ledgers: true },
          orderBy: { createdAt: 'asc' }
        });

        for (const otherOrder of otherUnpaidOrders) {
          if (remainingWaive <= 0) break;

          const otherTotalPaid = otherOrder.ledgers
            .filter(l => l.kind === 'payment')
            .reduce((sum, l) => sum + l.amount, 0);
          
          const otherTotalWaived = Math.abs(otherOrder.ledgers
            .filter(l => l.kind === 'waive')
            .reduce((sum, l) => sum + l.amount, 0));

          const otherAmountDue = Math.max(0, otherOrder.totalDue - otherTotalPaid - otherTotalWaived);
          const waiveForOtherOrder = Math.min(remainingWaive, otherAmountDue);

          if (waiveForOtherOrder > 0) {
            await tx.ledger.create({
              data: {
                patientId,
                orderId: otherOrder.id,
                kind: 'waive',
                amount: -waiveForOtherOrder,
                method: 'cash',
                notes: `Auto-applied waive from Order #${orderId.slice(-6)}: ${reason}`,
                createdBy: req.user.id
              }
            });

            const otherNewStatus = (otherTotalPaid + otherTotalWaived + waiveForOtherOrder) >= otherOrder.totalDue ? 'paid' : 'partially_paid';
            await tx.order.update({
              where: { id: otherOrder.id },
              data: { status: otherNewStatus }
            });

            remainingWaive -= waiveForOtherOrder;
          }
        }
      }

      // If still remaining waive amount, add to patient credit balance
      if (remainingWaive > 0) {
        await tx.patient.update({
          where: { id: patientId },
          data: {
            creditBalance: { increment: remainingWaive }
          }
        });

        // Create credit entry
        await tx.ledger.create({
          data: {
            patientId,
            kind: 'credit',
            amount: remainingWaive,
            method: 'cash',
            notes: `Excess waive amount: ${reason}`,
            createdBy: req.user.id
          }
        });
      }

      return { waived: amount, appliedToOrder: waiveForOrder, creditAdded: remainingWaive };
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('Waive amount error:', error);
    if (error.message === 'Order not found') {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/credit-notes', requireAccounting, [
  body('patientId').isString(),
  body('orderId').optional().isString(),
  body('amount').isFloat({ min: 0.01 }),
  body('reason').isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { patientId, orderId, amount, reason } = req.body;

    const creditNote = await createCreditNote({
      patientId,
      orderId,
      amount,
      reason,
      createdBy: req.user.id
    });

    res.status(201).json(creditNote);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Return money (reduce credit balance)
router.post('/return', requireAuth, [
  body('patientId').isString(),
  body('amount').isFloat({ min: 0.01 }),
  body('method').isIn(['cash']),
  body('reason').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { patientId, amount, method, reason } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      // Get patient current credit balance
      const patient = await tx.patient.findUnique({
        where: { id: patientId },
        select: { creditBalance: true }
      });

      if (!patient) {
        throw new Error('Patient not found');
      }

      if (patient.creditBalance < amount) {
        throw new Error('Insufficient credit balance');
      }

      // Reduce credit balance
      await tx.patient.update({
        where: { id: patientId },
        data: {
          creditBalance: { decrement: amount }
        }
      });

      // Create return ledger entry
      const returnEntry = await tx.ledger.create({
        data: {
          patientId,
          kind: 'return',
          amount: -amount,
          method,
          notes: reason || 'Money returned to patient',
          createdBy: req.user.id
        }
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          actorId: req.user.id,
          action: 'return.create',
          targetType: 'ledger',
          targetId: returnEntry.id,
          metadata: { amount, reason }
        }
      });

      return returnEntry;
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('Return money error:', error);
    if (error.message === 'Patient not found') {
      return res.status(404).json({ error: 'Patient not found' });
    }
    if (error.message === 'Insufficient credit balance') {
      return res.status(400).json({ error: 'Insufficient credit balance' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;