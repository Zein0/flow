# Deployment Guide

## Railway Backend Deployment

1. **Create new Railway project**
2. **Add PostgreSQL database**: Railway → Add Database → PostgreSQL
3. **Add Redis database**: Railway → Add Database → Redis
4. **Deploy backend**: Connect your GitHub repo, select `backend` folder
5. **Set environment variables**:
   - `DATABASE_URL`: Auto-generated from Railway PostgreSQL
   - `JWT_SECRET`: Generate a secure random string
   - `REDIS_HOST`: Auto-generated from Railway Redis
   - `REDIS_PORT`: Auto-generated from Railway Redis  
   - `REDIS_PASSWORD`: Auto-generated from Railway Redis
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