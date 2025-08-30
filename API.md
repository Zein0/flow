# API Documentation

## Authentication

### Login
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@clinic.com",
  "password": "admin123"
}

Response:
{
  "token": "jwt_token_here",
  "role": "admin",
  "user": {
    "id": "user_id",
    "name": "Admin User",
    "email": "admin@clinic.com",
    "role": "admin"
  }
}
```

### Register
```
POST /api/auth/register
Content-Type: application/json

{
  "name": "New User",
  "email": "user@clinic.com",
  "password": "password123",
  "role": "doctor"
}
```

## Appointments

### Create Appointment
```
POST /api/appointments
Authorization: Bearer <token>
Content-Type: application/json

{
  "patientId": "patient_id",
  "doctorId": "doctor_id", 
  "sessionTypeId": "session_type_id",
  "startAt": "2024-01-15T10:00:00Z",
  "notes": "Regular checkup"
}

Success: 201 Created
Error: 400 "Capacity reached for this hour (6 appointments max)."
Error: 400 "Doctor already has an appointment at this hour."
```

### Get Availability
```
GET /api/appointments/availability?date=2024-01-15&doctorId=doctor_id
Authorization: Bearer <token>

Response:
[
  {
    "hour": 8,
    "globalCapacity": 6,
    "doctorAvailable": true,
    "available": true
  },
  {
    "hour": 9, 
    "globalCapacity": 4,
    "doctorAvailable": false,
    "available": false
  }
]
```

### Confirm Appointment
```
POST /api/appointments/:id/confirm
Authorization: Bearer <token>
Content-Type: application/json

{
  "finalPrice": 175.00
}

Response:
{
  "appointment": { ... },
  "order": { ... }
}
```

## Patients

### Search Patients
```
GET /api/patients?search=john
Authorization: Bearer <token>

Response:
[
  {
    "id": "patient_id",
    "name": "John Smith",
    "phone": "555-0123",
    "notes": "Regular patient",
    "createdAt": "2024-01-01T00:00:00Z"
  }
]
```

### Record Payment
```
POST /api/patients/:id/payments
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": 150.00,
  "method": "cash",
  "orderId": "order_id" // optional
}
```

## Recurrences

### Create Weekly Recurrence
```
POST /api/recurrences
Authorization: Bearer <token>
Content-Type: application/json

{
  "patientId": "patient_id",
  "doctorId": "doctor_id",
  "sessionTypeId": "session_type_id", 
  "startAt": "2024-01-15T10:00:00Z",
  "endDate": "2024-06-15T10:00:00Z",
  "notes": "Weekly therapy sessions"
}

Response:
{
  "recurrence": { ... },
  "createdCount": 22,
  "conflicts": [
    {
      "date": "2024-02-12T10:00:00Z",
      "error": "Doctor already has an appointment at this hour."
    }
  ]
}
```

## Reports

### Billing Export
```
GET /api/reports/billing?from=2024-01-01&to=2024-01-31&export=csv&doctorId=doctor_id
Authorization: Bearer <token>

CSV Download or JSON Response
```

### Dashboard Stats
```
GET /api/reports/dashboard
Authorization: Bearer <token>

Response:
{
  "todaysAppointments": 12,
  "collectedToday": 1250.00,
  "outstandingBalance": 750.00
}
```

## Error Responses

All endpoints return consistent error format:
```json
{
  "error": "Error message",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email address"
    }
  ]
}
```

## Status Codes

- `200` OK
- `201` Created  
- `400` Bad Request (validation errors, business logic violations)
- `401` Unauthorized (invalid/missing token)
- `403` Forbidden (insufficient role permissions)
- `404` Not Found
- `500` Internal Server Error