const { PrismaClient } = require('@prisma/client');
const { addDays, setHours, setMinutes, setSeconds, setMilliseconds } = require('date-fns');
const { toZonedTime } = require('date-fns-tz');

const prisma = new PrismaClient();

async function createAppointment({ patientId, doctorId, startAt, createdBy, sessionTypeId, notes, recurrenceId }) {
  // Get session type to determine duration
  const sessionType = await prisma.sessionType.findUnique({
    where: { id: sessionTypeId }
  });

  if (!sessionType) {
    throw new Error('Session type not found');
  }

  // Calculate appointment start and end times based on session duration
  const start = new Date(startAt);
  const end = new Date(start);
  end.setMinutes(end.getMinutes() + sessionType.durationMinutes);

  return await prisma.$transaction(async (tx) => {
    // 1) Check global capacity for overlapping time slots (exclude cancelled)
    const globalCount = await tx.appointment.count({
      where: {
        OR: [
          // Existing appointment starts during new appointment
          {
            startAt: { gte: start, lt: end },
            status: { not: 'cancelled' }
          },
          // Existing appointment ends during new appointment
          {
            endAt: { gt: start, lte: end },
            status: { not: 'cancelled' }
          },
          // Existing appointment completely overlaps new appointment
          {
            startAt: { lte: start },
            endAt: { gte: end },
            status: { not: 'cancelled' }
          }
        ]
      }
    });
    if (globalCount >= 6) {
      throw new Error('Capacity reached for this time slot (6 appointments max).');
    }

    // 2) Check doctor availability (no overlapping appointments)
    const doctorConflicts = await tx.appointment.findFirst({
      where: {
        doctorId,
        status: { not: 'cancelled' },
        OR: [
          // Existing appointment starts during new appointment
          {
            startAt: { gte: start, lt: end }
          },
          // Existing appointment ends during new appointment
          {
            endAt: { gt: start, lte: end }
          },
          // Existing appointment completely overlaps new appointment
          {
            startAt: { lte: start },
            endAt: { gte: end }
          }
        ]
      }
    });
    if (doctorConflicts) {
      throw new Error('Doctor already has an appointment during this time.');
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

async function confirmAppointment(appointmentId, { finalPrice, createdBy, paymentMethod = 'cash' }) {
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

    // Check if paying with service credit
    if (paymentMethod === 'service_credit') {
      // Find available service credit for this session type
      const serviceCredit = await tx.serviceCredit.findFirst({
        where: {
          patientId: appointment.patientId,
          sessionTypeId: appointment.sessionTypeId,
          quantity: { gt: 0 }
        }
      });

      if (!serviceCredit) {
        throw new Error('No service credits available for this session type');
      }

      // Deduct 1 credit
      await tx.serviceCredit.update({
        where: { id: serviceCredit.id },
        data: {
          quantity: serviceCredit.quantity - 1
        }
      });

      // Update appointment
      const updatedAppointment = await tx.appointment.update({
        where: { id: appointmentId },
        data: {
          status: 'completed',
          finalPrice: servicePrice
        },
        include: {
          patient: true,
          doctor: true,
          sessionType: true
        }
      });

      // Create order marked as paid via credit
      const order = await tx.order.create({
        data: {
          patientId: appointment.patientId,
          appointmentId: appointmentId,
          orderType: 'appointment',
          subtotal: servicePrice,
          totalDue: servicePrice,
          status: 'paid',
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
          method: 'service_credit',
          notes: 'Paid with service credit',
          createdBy
        }
      });

      // Create payment in ledger (service credit payment)
      await tx.ledger.create({
        data: {
          patientId: appointment.patientId,
          orderId: order.id,
          kind: 'payment',
          amount: servicePrice,
          method: 'service_credit',
          notes: 'Service credit used',
          createdBy
        }
      });

      // Generate reminders
      await generateReminders(tx, updatedAppointment);

      // Audit log
      await tx.auditLog.create({
        data: {
          actorId: createdBy,
          action: 'appointment.confirm',
          targetType: 'appointment',
          targetId: appointmentId,
          metadata: {
            finalPrice: updatedAppointment.finalPrice,
            paymentMethod: 'service_credit'
          }
        }
      });

      return { appointment: updatedAppointment, order };
    }

    // Cash payment flow (original logic)
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
        orderType: 'appointment',
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
        metadata: {
          finalPrice: updatedAppointment.finalPrice,
          paymentMethod: 'cash'
        }
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
      endAt: true,
      doctorId: true
    }
  });

  const availability = [];
  // Generate 30-minute time slots from 8:00 to 18:00
  for (let hour = 8; hour < 18; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const slotStart = new Date(date);
      slotStart.setHours(hour, minute, 0, 0);
      const slotEnd = new Date(slotStart);
      slotEnd.setMinutes(slotEnd.getMinutes() + 30);

      // Convert to Beirut timezone for comparison
      const slotStartBeirut = toZonedTime(slotStart, 'Asia/Beirut');
      const slotEndBeirut = toZonedTime(slotEnd, 'Asia/Beirut');

      // Check if any appointments overlap with this slot
      const overlappingAppointments = appointments.filter(apt => {
        const aptStartBeirut = toZonedTime(apt.startAt, 'Asia/Beirut');
        const aptEndBeirut = toZonedTime(apt.endAt, 'Asia/Beirut');

        // Check for any overlap
        return (
          (aptStartBeirut >= slotStartBeirut && aptStartBeirut < slotEndBeirut) ||
          (aptEndBeirut > slotStartBeirut && aptEndBeirut <= slotEndBeirut) ||
          (aptStartBeirut <= slotStartBeirut && aptEndBeirut >= slotEndBeirut)
        );
      });

      const globalCount = overlappingAppointments.length;
      const doctorBusy = doctorId && overlappingAppointments.some(apt => apt.doctorId === doctorId);

      availability.push({
        hour,
        minute,
        time: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
        globalCapacity: globalCount,
        doctorAvailable: doctorId ? !doctorBusy : true,
        available: globalCount < 6 && (!doctorId || !doctorBusy)
      });
    }
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