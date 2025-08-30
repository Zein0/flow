const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { query, validationResult } = require('express-validator');
const { requireAccounting, requireAuth } = require('../middleware/auth');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const fs = require('fs');
const path = require('path');

const router = express.Router();
const prisma = new PrismaClient();

router.get('/billing', requireAccounting, [
  query('from').isISO8601(),
  query('to').isISO8601(),
  query('patientId').optional().isString(),
  query('export').optional().isIn(['csv']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isIn(['10', '20'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { from, to, patientId, export: exportFormat, page = 1, limit = 10 } = req.query;

    let where = {
      occurredAt: {
        gte: new Date(from),
        lte: new Date(new Date(to).setHours(23, 59, 59, 999))
      }
    };

    if (patientId) where.patientId = patientId;

    // For CSV export, get all data without pagination
    if (exportFormat === 'csv') {
      const ledgerEntries = await prisma.ledger.findMany({
        where,
        include: {
          patient: true,
          order: {
            include: {
              appointment: {
                include: { doctor: true, sessionType: true }
              }
            }
          },
          createdByUser: true
        },
        orderBy: { occurredAt: 'desc' }
      });

      const csvPath = path.join('/tmp', `billing_${Date.now()}.csv`);
      
      const csvWriter = createCsvWriter({
        path: csvPath,
        header: [
          { id: 'date', title: 'Date' },
          { id: 'patient', title: 'Patient' },
          { id: 'doctor', title: 'Doctor' },
          { id: 'sessionType', title: 'Session Type' },
          { id: 'kind', title: 'Type' },
          { id: 'amount', title: 'Amount' },
          { id: 'method', title: 'Method' },
          { id: 'createdBy', title: 'Created By' }
        ]
      });

      const records = ledgerEntries.map(entry => ({
        date: entry.occurredAt.toISOString().split('T')[0],
        patient: entry.patient.name,
        doctor: entry.order?.appointment?.doctor?.name || '',
        sessionType: entry.order?.appointment?.sessionType?.name || '',
        kind: entry.kind,
        amount: entry.amount,
        method: entry.method,
        createdBy: entry.createdByUser.name
      }));

      await csvWriter.writeRecords(records);
      
      return res.download(csvPath, `billing_${from}_${to}.csv`, (err) => {
        if (!err) {
          fs.unlinkSync(csvPath);
        }
      });
    }

    // For paginated results
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get total count for pagination
    const totalCount = await prisma.ledger.count({ where });

    const ledgerEntries = await prisma.ledger.findMany({
      where,
      include: {
        patient: true,
        order: {
          include: {
            appointment: {
              include: { doctor: true, sessionType: true }
            }
          }
        },
        createdByUser: true
      },
      orderBy: { occurredAt: 'desc' },
      skip,
      take: limitNum
    });

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    res.json({
      data: ledgerEntries,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalItems: totalCount,
        itemsPerPage: limitNum,
        hasNextPage,
        hasPrevPage
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/dashboard', requireAuth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const todaysAppointments = await prisma.appointment.count({
      where: {
        startAt: { gte: today, lt: tomorrow },
        status: { not: 'cancelled' }
      }
    });

    const collectedToday = await prisma.ledger.aggregate({
      where: {
        occurredAt: { gte: today, lt: tomorrow },
        kind: 'payment'
      },
      _sum: { amount: true }
    });

    // Calculate actual outstanding balance from orders
    const outstandingOrders = await prisma.order.findMany({
      where: {
        status: { in: ['pending', 'partially_paid'] }
      },
      include: { ledgers: true }
    });

    const totalOutstanding = outstandingOrders.reduce((sum, order) => {
      const totalPaid = order.ledgers.filter(l => l.kind === 'payment').reduce((s, l) => s + l.amount, 0);
      const totalWaived = Math.abs(order.ledgers.filter(l => l.kind === 'waive').reduce((s, l) => s + l.amount, 0));
      return sum + Math.max(0, order.totalDue - totalPaid - totalWaived);
    }, 0);

    const totalPatients = await prisma.patient.count();

    res.json({
      todaysAppointments,
      collectedToday: collectedToday._sum.amount || 0,
      outstandingBalance: totalOutstanding,
      totalPatients
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Billing summary (totals for filtered results)
router.get('/billing/summary', requireAccounting, [
  query('from').isISO8601(),
  query('to').isISO8601(),
  query('patientId').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { from, to, patientId } = req.query;

    let where = {
      occurredAt: {
        gte: new Date(from),
        lte: new Date(new Date(to).setHours(23, 59, 59, 999))
      }
    };

    if (patientId) where.patientId = patientId;

    const ledgerEntries = await prisma.ledger.findMany({
      where,
      include: {
        order: {
          include: {
            appointment: {
              include: { doctor: true }
            }
          }
        }
      }
    });

    const totalRevenue = ledgerEntries
      .filter(entry => entry.kind === 'payment')
      .reduce((sum, entry) => sum + entry.amount, 0);

    const totalTransactions = ledgerEntries.length;

    res.json({
      totalRevenue,
      totalTransactions
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;