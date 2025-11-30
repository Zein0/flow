const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { PrismaClient } = require('@prisma/client');

const authRoutes = require('./routes/auth');
const patientRoutes = require('./routes/patients');
const doctorRoutes = require('./routes/doctors');
const appointmentRoutes = require('./routes/appointments');
const sessionTypeRoutes = require('./routes/sessionTypes');
const orderRoutes = require('./routes/orders');
const ledgerRoutes = require('./routes/ledger');
const reportRoutes = require('./routes/reports');
const recurrenceRoutes = require('./routes/recurrences');
const bundleRoutes = require('./routes/bundles');

const app = express();
const prisma = new PrismaClient();

app.use(helmet());
app.use(cors());
app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/session-types', sessionTypeRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/ledger', ledgerRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/recurrences', recurrenceRoutes);
app.use('/api/bundles', bundleRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit();
});