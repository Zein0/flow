const { Worker, Queue } = require('bullmq');
const { PrismaClient } = require('@prisma/client');
const Redis = require('redis');

const prisma = new PrismaClient();

// Redis connection for BullMQ
const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined
};

// Create queue
const reminderQueue = new Queue('reminders', { connection: redisConnection });

// Worker to process reminder jobs
const reminderWorker = new Worker('reminders', async (job) => {
  const { reminderId } = job.data;
  
  try {
    const reminder = await prisma.reminder.findUnique({
      where: { id: reminderId },
      include: {
        appointment: {
          include: {
            patient: true,
            doctor: true
          }
        }
      }
    });

    if (!reminder || reminder.status !== 'pending') {
      return { success: false, reason: 'Reminder not found or already processed' };
    }

    // Simulate sending reminder (implement actual SMS/email logic here)
    console.log(`Sending ${reminder.type} reminder for appointment ${reminder.appointmentId}`);
    console.log(`Patient: ${reminder.appointment.patient.name}`);
    console.log(`Doctor: ${reminder.appointment.doctor.name}`);
    console.log(`Appointment: ${reminder.appointment.startAt}`);

    // Update reminder status
    await prisma.reminder.update({
      where: { id: reminderId },
      data: {
        status: 'sent',
        sentAt: new Date()
      }
    });

    return { success: true };
  } catch (error) {
    console.error('Reminder processing failed:', error);
    
    await prisma.reminder.update({
      where: { id: reminderId },
      data: { status: 'failed' }
    }).catch(console.error);

    throw error;
  }
}, { connection: redisConnection });

// Schedule reminders function
async function scheduleReminders() {
  try {
    const pendingReminders = await prisma.reminder.findMany({
      where: {
        status: 'pending',
        dueAt: { lte: new Date(Date.now() + 24 * 60 * 60 * 1000) } // Next 24 hours
      }
    });

    for (const reminder of pendingReminders) {
      const delay = Math.max(0, reminder.dueAt.getTime() - Date.now());
      
      await reminderQueue.add(
        'send-reminder',
        { reminderId: reminder.id },
        { delay, jobId: `reminder-${reminder.id}` }
      );
    }

    console.log(`Scheduled ${pendingReminders.length} reminders`);
  } catch (error) {
    console.error('Failed to schedule reminders:', error);
  }
}

// Alternative cron-based scheduler (if not using Redis/BullMQ)
function startCronScheduler() {
  // Run every 15 minutes
  setInterval(async () => {
    try {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      
      const dueReminders = await prisma.reminder.findMany({
        where: {
          status: 'pending',
          dueAt: { gte: fiveMinutesAgo, lte: now }
        },
        include: {
          appointment: {
            include: {
              patient: true,
              doctor: true
            }
          }
        }
      });

      for (const reminder of dueReminders) {
        try {
          // Simulate sending reminder
          console.log(`Sending ${reminder.type} reminder for appointment ${reminder.appointmentId}`);
          
          await prisma.reminder.update({
            where: { id: reminder.id },
            data: {
              status: 'sent',
              sentAt: new Date()
            }
          });
        } catch (error) {
          console.error(`Failed to send reminder ${reminder.id}:`, error);
          
          await prisma.reminder.update({
            where: { id: reminder.id },
            data: { status: 'failed' }
          }).catch(console.error);
        }
      }

      if (dueReminders.length > 0) {
        console.log(`Processed ${dueReminders.length} reminders`);
      }
    } catch (error) {
      console.error('Cron scheduler error:', error);
    }
  }, 15 * 60 * 1000); // 15 minutes
}

// Start scheduler based on environment
if (process.env.USE_REDIS === 'true') {
  scheduleReminders();
  setInterval(scheduleReminders, 60 * 60 * 1000); // Re-schedule every hour
} else {
  startCronScheduler();
}

module.exports = {
  reminderQueue,
  reminderWorker,
  scheduleReminders,
  startCronScheduler
};