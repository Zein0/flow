# Appointment & Billing System

A fullstack appointment and billing management system for medical clinics with capacity-aware scheduling, automated reminders, and cash payment tracking.

## Project Overview

This system manages:
- **Appointments**: 1-hour sessions with global (6 rooms) and doctor (1 per hour) capacity constraints
- **Billing**: Cash-only payments with order tracking and ledger management  
- **Patients**: Patient profiles with appointment history and balance tracking
- **Doctors**: Doctor profiles and schedule management
- **Reminders**: Automated day-before and 2-hour-before appointment reminders
- **Recurrences**: Weekly recurring appointments with conflict detection
- **Reports**: Billing exports and dashboard analytics

## Folder Structure

```
├── backend/                 # Express.js API server
│   ├── src/
│   │   ├── routes/         # API route handlers
│   │   ├── services/       # Business logic (booking, ledger)
│   │   ├── middleware/     # Authentication & authorization
│   │   ├── workers/        # Reminder processing
│   │   └── __tests__/      # Unit & integration tests
│   ├── prisma/
│   │   └── schema.prisma   # Database schema
│   └── Dockerfile
├── frontend/               # React.js client app
│   ├── src/
│   │   ├── pages/         # Route components
│   │   ├── components/    # UI components  
│   │   ├── hooks/         # React Query hooks
│   │   ├── stores/        # Zustand state management
│   │   └── utils/         # API client
│   └── Dockerfile
└── docker-compose.yml     # Production stack
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Database
DATABASE_URL=postgresql://clinic_user:your_strong_password@localhost:5432/appointment_db
POSTGRES_PASSWORD=your_strong_password

# Authentication  
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Redis (for reminders)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# Application
NODE_ENV=production
PORT=3001
USE_REDIS=true
```

## Database Setup

### Option 1: Using Docker Compose (Recommended)

```bash
# Start database only
docker-compose up postgres redis -d

# Run migrations
cd backend
npm install
npx prisma migrate deploy
npx prisma db seed
```

### Option 2: Local PostgreSQL

```bash
# Install dependencies
cd backend && npm install
cd ../frontend && npm install

# Create database
createdb appointment_db

# Run migrations
cd backend
npx prisma migrate deploy

# Seed initial data
npx prisma db seed
```

## Build & Deploy Commands

### Production Deployment with Docker

```bash
# 1. Copy environment file
cp .env.example .env
# Edit .env with your production values

# 2. Build and start all services
docker-compose up --build -d

# 3. Run database migrations
docker-compose exec backend npx prisma migrate deploy

# 4. Create initial admin user (optional)
docker-compose exec backend npx prisma db seed
```

### Development Setup

```bash
# Backend
cd backend
npm install
npx prisma generate
npx prisma migrate dev
npm run dev

# Frontend (new terminal)
cd frontend  
npm install
npm run dev
```

### Manual Production Build

```bash
# Backend
cd backend
npm install --production
npx prisma generate
npx prisma migrate deploy

# Frontend
cd frontend
npm install
npm run build

# Serve frontend with nginx/apache pointing to dist/
```

## Key Features & Business Rules

### Capacity Management
- **Global**: Maximum 6 appointments per hour (system-wide)
- **Doctor**: Each doctor can have maximum 1 appointment per hour
- Both constraints enforced atomically via database transactions

### Session Rules
- All sessions are exactly 1 hour duration
- Sessions normalized to hour boundaries (e.g., 2:30 PM → 2:00 PM)
- Operating hours: 8:00 AM - 6:00 PM

### Reminders
- **Day before**: Sent at 3:00 PM the day before appointment
- **Two hours before**: Sent 2 hours prior to appointment
- Only generated for confirmed appointments
- Processed via BullMQ (Redis) or fallback cron scheduler

### Billing
- **Cash only** payment method
- Appointments → Orders → Ledger entries
- Support for partial payments and credit notes
- Automated order status updates based on payment amounts

### User Roles
- **Admin**: Full system access
- **Doctor**: View own calendar, mark appointments complete
- **Accounting**: Manage payments, billing, reports (no appointment deletion)

## API Documentation

### Authentication
```bash
POST /api/auth/login
POST /api/auth/register
```

### Appointments  
```bash
GET  /api/appointments?date=2024-01-15&doctorId=xxx
GET  /api/appointments/availability?date=2024-01-15&doctorId=xxx
POST /api/appointments
POST /api/appointments/:id/confirm
POST /api/appointments/:id/cancel
PUT  /api/appointments/:id/status
```

### Patients
```bash
GET  /api/patients?search=john
GET  /api/patients/:id
POST /api/patients
PUT  /api/patients/:id  
POST /api/patients/:id/payments
```

### Reports
```bash
GET /api/reports/dashboard
GET /api/reports/billing?from=2024-01-01&to=2024-01-31&export=csv
```

### Recurrences
```bash
POST /api/recurrences
GET  /api/recurrences/:id
DELETE /api/recurrences/:id/future
```

## Testing

```bash
# Run unit tests
cd backend
npm test

# Run integration tests  
npm test -- --testPathPattern=integration

# Run with coverage
npm test -- --coverage
```

## Important Notes

⚠️ **Development Restrictions**: 
- You may run `npm install` to verify dependencies
- **DO NOT** run `npm run dev`, `npm start`, or any script execution commands
- This is production-ready code for deployment only

📋 **Deployment Checklist**:
1. Configure environment variables in `.env`
2. Ensure PostgreSQL and Redis are running
3. Run `prisma migrate deploy` 
4. Build and start services with Docker Compose
5. Create initial admin user via seed script
6. Configure SSL/TLS for production
7. Set up backup strategy for PostgreSQL

🔐 **Security**:  
- JWT tokens expire in 24 hours
- Rate limiting (100 requests/15min per IP)
- Helmet.js security headers
- Parameterized queries (Prisma)
- Role-based access control
- Audit logging for all mutations

💾 **Data Persistence**:
- PostgreSQL for transactional data
- Redis for job queue (reminders)  
- Docker volumes for data persistence
- Automated database backups recommended