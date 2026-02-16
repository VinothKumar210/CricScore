# CricScore Deployment Plan

This document outlines the steps to deploy the CricScore application to production.

## 1. Prerequisites
- GitHub repository with the latest code pushed.
- A Clerk account and project.
- A MongoDB Atlas cluster.
- Accounts on [Vercel](https://vercel.com) and [Render](https://render.com).

## 2. Backend Deployment (Render)
1. **Create New Web Service:** Connect your GitHub repository.
2. **Select Folder:** Set the Root Directory to `backend`.
3. **Environment:** Select `Node`.
4. **Build Command:** `npm install && npm run build`
5. **Start Command:** `npm start`
6. **Environment Variables:**
   - `PORT`: 10000
   - `NODE_ENV`: production
   - `DATABASE_URL`: (Your MongoDB connection string)
   - `CLERK_SECRET_KEY`: (From Clerk Dashboard)
   - `CLERK_WEBHOOK_SECRET`: (From Clerk Webhooks section)
   - `FRONTEND_URL`: (Your Vercel deployment URL)

## 3. Frontend Deployment (Vercel)
1. **Create New Project:** Connect your GitHub repository.
2. **Root Directory:** Set to `frontend`.
3. **Framework Preset:** Vite.
4. **Build Command:** `npm run build`
5. **Output Directory:** `dist`
6. **Environment Variables:**
   - `VITE_CLERK_PUBLISHABLE_KEY`: (From Clerk Dashboard)
   - `VITE_API_URL`: (Your Render URL, e.g., `https://cricscore-api.onrender.com/api`)

## 4. Clerk Production Setup
1. **API Keys:** Use the **Production** API keys in your Vercel/Render settings.
2. **URLs:** Update the following in Clerk Dashboard > Paths:
   - Home URL: `https://your-app.vercel.app`
   - Sign-in URL: `https://your-app.vercel.app/sign-in`
   - Sign-up URL: `https://your-app.vercel.app/sign-up`
3. **Webhooks:** Add a production webhook:
   - Endpoint: `https://your-api.onrender.com/api/webhooks/clerk`
   - Events: `user.created`, `user.updated`

## 5. Deployment YAMLs
The project includes:
- `backend/render.yaml`: For Render Blueprints.
- `frontend/vercel.json`: For Vercel configuration.
