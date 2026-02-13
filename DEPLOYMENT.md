# Deployment Guide for CricScore

This project is set up to be deployed as two separate services:
- **Frontend:** Vercel (React + Vite)
- **Backend:** Render (Express + Node.js)

## 1. Push to GitHub
I have already committed the changes. You just need to ensure the code is pushed to your repository:
```bash
git push origin main
```
*(If your branch is `master`, use `master`)*

---

## 2. Deploy Backend (Render)
1. Go to [dashboard.render.com](https://dashboard.render.com)
2. Click **New +** -> **Web Service**
3. Connect your GitHub repository `CricScore`
4. Use the following settings:
   - **Name:** `cricscore-api` (or similar)
   - **Root Directory:** `.` (leave empty)
   - **Environment:** Node
   - **Build Command:** `npm install && npm run build:server`
   - **Start Command:** `npm run start`
   - **Environment Variables**: Add all variables from `.env`.

---

## 3. Deploy Frontend (Vercel)
1. Go to [vercel.com/new](https://vercel.com/new)
2. Import the `CricScore` repository
3. Project Configuration:
   - **Framework Preset:** Vite
   - **Root Directory:** `.` (leave default)
   - **Build Command:** `npm run build:client` (Override to save build time)
   - **Output Directory:** `dist`
4. **Environment Variables**:
   - `VITE_API_URL`: Your Render backend URL (e.g., `https://cricscore-api.onrender.com`)
   - Add all `VITE_FIREBASE_*` variables.
