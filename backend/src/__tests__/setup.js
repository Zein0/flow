// Test setup file
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_appointment_db';
process.env.JWT_SECRET = 'test-jwt-secret-key';
process.env.NODE_ENV = 'test';