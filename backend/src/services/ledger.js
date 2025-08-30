const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function recordPayment({ patientId, orderId, amount, method = 'cash', createdBy }) {
  return await prisma.$transaction(async (tx) => {
    // Create ledger entry
    const ledgerEntry = await tx.ledger.create({
      data: {
        patientId,
        orderId,
        kind: 'payment',
        amount,
        method,
        createdBy
      }
    });

    // Update order status if orderId provided
    if (orderId) {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { ledgers: true }
      });

      if (order) {
        const totalPayments = order.ledgers
          .filter(l => l.kind === 'payment')
          .reduce((sum, l) => sum + l.amount, 0);

        let newStatus = 'pending';
        if (totalPayments >= order.totalDue) {
          newStatus = 'paid';
        } else if (totalPayments > 0) {
          newStatus = 'partially_paid';
        }

        await tx.order.update({
          where: { id: orderId },
          data: { status: newStatus }
        });
      }
    }

    // Audit log
    await tx.auditLog.create({
      data: {
        actorId: createdBy,
        action: 'payment.record',
        targetType: 'ledger',
        targetId: ledgerEntry.id,
        metadata: { amount, method, orderId }
      }
    });

    return ledgerEntry;
  });
}

async function createCreditNote({ patientId, orderId, amount, reason, createdBy }) {
  return await prisma.$transaction(async (tx) => {
    const ledgerEntry = await tx.ledger.create({
      data: {
        patientId,
        orderId,
        kind: 'credit',
        amount: -Math.abs(amount), // Credits are negative
        method: 'cash',
        createdBy
      }
    });

    // Audit log
    await tx.auditLog.create({
      data: {
        actorId: createdBy,
        action: 'credit.create',
        targetType: 'ledger',
        targetId: ledgerEntry.id,
        metadata: { amount, reason, orderId }
      }
    });

    return ledgerEntry;
  });
}

async function getPatientBalance(patientId) {
  const ledgerEntries = await prisma.ledger.findMany({
    where: { patientId },
    include: { order: true }
  });

  let balance = 0;
  ledgerEntries.forEach(entry => {
    balance += entry.amount;
  });

  return balance;
}

async function getOutstandingOrders() {
  const orders = await prisma.order.findMany({
    where: {
      status: { in: ['pending', 'partially_paid'] }
    },
    include: {
      patient: true,
      appointment: {
        include: { doctor: true }
      },
      ledgers: true
    }
  });

  // Calculate actual outstanding amounts
  return orders.map(order => {
    const totalPaid = order.ledgers.filter(l => l.kind === 'payment').reduce((sum, l) => sum + l.amount, 0);
    const totalWaived = Math.abs(order.ledgers.filter(l => l.kind === 'waive').reduce((sum, l) => sum + l.amount, 0));
    const outstandingAmount = Math.max(0, order.totalDue - totalPaid - totalWaived);
    
    return {
      ...order,
      outstandingAmount,
      totalPaid,
      totalWaived
    };
  }).filter(order => order.outstandingAmount > 0);
}

module.exports = {
  recordPayment,
  createCreditNote,
  getPatientBalance,
  getOutstandingOrders
};