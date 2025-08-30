# Deployment Guide

## Step 1: Railway Database Project

1. **Create new Railway project** for database
2. **Add PostgreSQL**: Railway → Add Database → PostgreSQL
3. **Add Redis**: Railway → Add Database → Redis  
4. **Copy connection strings** for next step

## Step 2: Railway Backend Project

1. **Create separate Railway project** for backend
2. **Connect GitHub repo**, select `backend` folder as root directory
3. **Set environment variables**:
   - `DATABASE_URL`: PostgreSQL connection string from Step 1
   - `JWT_SECRET`: Generate secure random string (32+ chars)
   - `REDIS_HOST`: Redis host from Step 1
   - `REDIS_PORT`: Redis port from Step 1
   - `REDIS_PASSWORD`: Redis password from Step 1
   - `USE_REDIS`: `true`
   - `PORT`: `3001`

## Vercel Frontend Deployment

1. **Connect GitHub repo** to Vercel
2. **Set root directory** to `frontend`
3. **Set environment variables**:
   - `VITE_API_URL`: Your Railway backend URL (e.g., `https://your-app.railway.app`)

## Database Setup

The backend will automatically run migrations on deployment via the start command in `railway.json`.

## Important Notes

- Frontend needs the backend URL as `VITE_API_URL`
- Backend requires PostgreSQL and Redis from Railway
- All environment variables are documented above