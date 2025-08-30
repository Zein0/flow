const { PrismaClient } = require('@prisma/client');
const { addDays, setHours, setMinutes, setSeconds, setMilliseconds } = require('date-fns');
const { toZonedTime } = require('date-fns-tz');

const prisma = new PrismaClient();

async function createAppointment({ patientId, doctorId, startAt, createdBy, sessionTypeId, notes, recurrenceId }) {
  // Normalize startAt to top of the hour (sessions are 1 hour)
  const start = new Date(startAt);
  start.setMinutes(0, 0, 0);
  const end = new Date(start);
  end.setHours(start.getHours() + 1);

  return await prisma.$transaction(async (tx) => {
    // 1) Check global capacity for this hour (exclude cancelled)
    const globalCount = await tx.appointment.count({
      where: {
        startAt: { gte: start, lt: end },
        status: { not: 'cancelled' }
      }
    });
    if (globalCount >= 6) {
      throw new Error('Capacity reached for this hour (6 appointments max).');
    }

    // 2) Check doctor availability (doctor must not already have an appointment same hour)
    const doctorCount = await tx.appointment.count({
      where: {
        doctorId,
        startAt: { gte: start, lt: end },
        status: { not: 'cancelled' }
      }
    });
    if (doctorCount >= 1) {
      throw new Error('Doctor already has an appointment at this hour.');
    }

    // 3) create appointment
    const appointment = await tx.appointment.create({
      data: {
        patientId,
        doctorId,
        startAt: start,
        endAt: end,
        status: 'scheduled',
        sessionTypeId,
        notes,
        createdBy,
        recurrenceId
      },
      include: {
        patient: true,
        doctor: true,
        sessionType: true
      }
    });

    // 4) audit log
    await tx.auditLog.create({
      data: {
        actorId: createdBy,
        action: 'appointment.create',
        targetType: 'appointment',
        targetId: appointment.id,
        metadata: { startAt: start.toISOString(), doctorId, patientId }
      }
    });

    return appointment;
  });
}

async function confirmAppointment(appointmentId, { finalPrice, createdBy }) {
  return await prisma.$transaction(async (tx) => {
    const appointment = await tx.appointment.findUnique({
      where: { id: appointmentId },
      include: { patient: true, sessionType: true }
    });

    if (!appointment) {
      throw new Error('Appointment not found');
    }

    if (appointment.status !== 'scheduled') {
      throw new Error('Appointment cannot be confirmed');
    }

    const servicePrice = appointment.sessionType.price;
    let effectivePrice = servicePrice;
    let paidAmount = finalPrice || servicePrice;

    // Apply patient credit balance if available
    if (appointment.patient.creditBalance > 0) {
      const creditToUse = Math.min(appointment.patient.creditBalance, effectivePrice);
      effectivePrice -= creditToUse;
      
      if (creditToUse > 0) {
        // Deduct from credit balance
        await tx.patient.update({
          where: { id: appointment.patientId },
          data: {
            creditBalance: { decrement: creditToUse }
          }
        });

        // Record credit usage
        await tx.ledger.create({
          data: {
            patientId: appointment.patientId,
            kind: 'credit',
            amount: -creditToUse,
            method: 'cash',
            notes: 'Credit balance applied to appointment',
            createdBy
          }
        });
      }
    }

    // Update appointment
    const updatedAppointment = await tx.appointment.update({
      where: { id: appointmentId },
      data: {
        status: 'completed',
        finalPrice: servicePrice  // Keep service price unchanged
      },
      include: {
        patient: true,
        doctor: true,
        sessionType: true
      }
    });

    // Determine order status based on payment vs effective price
    let orderStatus = 'paid';
    if (paidAmount < effectivePrice) {
      orderStatus = 'partially_paid';
    }

    // Create order for original service price
    const order = await tx.order.create({
      data: {
        patientId: appointment.patientId,
        appointmentId: appointmentId,
        subtotal: servicePrice,
        totalDue: servicePrice,
        status: orderStatus,
        createdBy
      }
    });

    // Create charge in ledger
    await tx.ledger.create({
      data: {
        patientId: appointment.patientId,
        orderId: order.id,
        kind: 'charge',
        amount: servicePrice,
        method: 'cash',
        createdBy
      }
    });

    // Create payment in ledger if amount was paid
    if (paidAmount > 0) {
      await tx.ledger.create({
        data: {
          patientId: appointment.patientId,
          orderId: order.id,
          kind: 'payment',
          amount: paidAmount,
          method: 'cash',
          createdBy
        }
      });
    }

    // Generate reminders
    await generateReminders(tx, updatedAppointment);

    // Audit log
    await tx.auditLog.create({
      data: {
        actorId: createdBy,
        action: 'appointment.confirm',
        targetType: 'appointment',
        targetId: appointmentId,
        metadata: { finalPrice: updatedAppointment.finalPrice }
      }
    });

    return { appointment: updatedAppointment, order };
  });
}

async function generateReminders(tx, appointment) {
  const reminders = [];
  const now = new Date();

  // Day before at 15:00
  const dayBefore = setHours(setMinutes(setSeconds(setMilliseconds(addDays(appointment.startAt, -1), 0), 0), 0), 15);
  if (dayBefore > now) {
    reminders.push({
      appointmentId: appointment.id,
      type: 'day_before',
      dueAt: dayBefore
    });
  }

  // Two hours before
  const twoHoursBefore = new Date(appointment.startAt.getTime() - 2 * 60 * 60 * 1000);
  if (twoHoursBefore > now) {
    reminders.push({
      appointmentId: appointment.id,
      type: 'two_hours_before',
      dueAt: twoHoursBefore
    });
  }

  if (reminders.length > 0) {
    await tx.reminder.createMany({
      data: reminders
    });
  }
}

async function getAvailability(doctorId, date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const appointments = await prisma.appointment.findMany({
    where: {
      startAt: { gte: startOfDay, lte: endOfDay },
      status: { not: 'cancelled' }
    },
    select: {
      startAt: true,
      doctorId: true
    }
  });

  const availability = [];
  for (let hour = 8; hour < 18; hour++) {
    const hourStart = new Date(date);
    hourStart.setHours(hour, 0, 0, 0);
    
    // Fix timezone issue: convert UTC to Beirut time for hour comparison
    const globalCount = appointments.filter(apt => {
      const beirutTime = toZonedTime(apt.startAt, 'Asia/Beirut');
      return beirutTime.getHours() === hour;
    }).length;
    
    const doctorBusy = doctorId && appointments.some(apt => {
      const beirutTime = toZonedTime(apt.startAt, 'Asia/Beirut');
      return apt.doctorId === doctorId && beirutTime.getHours() === hour;
    });

    availability.push({
      hour,
      globalCapacity: globalCount,
      doctorAvailable: doctorId ? !doctorBusy : true,
      available: globalCount < 6 && (!doctorId || !doctorBusy)
    });
  }

  return availability;
}

async function cancelAppointment(appointmentId, { reason, createdBy }) {
  return await prisma.$transaction(async (tx) => {
    const appointment = await tx.appointment.findUnique({
      where: { id: appointmentId },
      include: { orders: true }
    });

    if (!appointment) {
      throw new Error('Appointment not found');
    }

    if (appointment.status === 'completed') {
      throw new Error('Cannot cancel completed appointment');
    }

    const updatedAppointment = await tx.appointment.update({
      where: { id: appointmentId },
      data: { status: 'cancelled' },
      include: { orders: true }
    });

    // Cancel pending reminders
    await tx.reminder.updateMany({
      where: {
        appointmentId,
        status: 'pending'
      },
      data: { status: 'failed' }
    });

    // Handle refunds if there were payments
    for (const order of updatedAppointment.orders) {
      if (order.status === 'paid' || order.status === 'partially_paid') {
        await tx.ledger.create({
          data: {
            patientId: appointment.patientId,
            orderId: order.id,
            kind: 'refund',
            amount: -order.totalDue,
            method: 'cash',
            createdBy
          }
        });
      }
    }

    // Audit log
    await tx.auditLog.create({
      data: {
        actorId: createdBy,
        action: 'appointment.cancel',
        targetType: 'appointment',
        targetId: appointmentId,
        metadata: { reason }
      }
    });

    return updatedAppointment;
  });
}

module.exports = {
  createAppointment,
  confirmAppointment,
  generateReminders,
  getAvailability,
  cancelAppointment
};