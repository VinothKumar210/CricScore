# CricScore Architecture & Implementation Strategy

## 1. Major Subsystems
1. **Authentication & User Management:** Firebase Auth integration, User profiles (player stats), Roles.
2. **Team Management:** Team creation, membership, roles (Owner/Captain), QR code joining.
3. **Match Management:** Match creation, formats (T20, Test), scheduling.
4. **Live Scoring Engine:** State machine for ball-by-ball updates, extensive validation (no-balls, wickets, extras).
5. **Stats Engine:** On-demand computation of career/team stats from granular ball-by-ball data.
6. **Messaging System:** Real-time chat, groups (team/match), polling, multimedia.
7. **Location & Discovery:** Geo-spatial search for grounds/teams, match invites.
8. **Tournament System:** League/Knockout management, automated fixtures, points table.

## 2. Cross-Cutting Concerns
- **Real-time Synchronization:** Socket.io for scores and chat.
- **Offline Capability:** PWA Service Worker + IndexedDB for scoring when offline.
- **Notifications:** FCM for invites, score updates, chats.
- **Data Integrity:** Transactional consistency for match events (e.g., updates to striker, non-striker, bowler, total score must all succeed or fail).
- **Security:** RLS-like logic for Team/Match updates (only Captain/Scorer).

## 3. High-Risk Areas
- **Live Scoring State Machine:** Extremely complex logic for edge cases (e.g., undoing a wicket that crossed ends).
- **Offline Sync:** Handling conflicts when an offline scorer reconnects.
- **Stats Recomputation:** Performance risk if aggregating millions of `BallRecord` rows on demand.
- **Real-time Concurrency:** Multiple users viewing the same match score.

## 4. Core Dependency Order
1. **User & Auth:** Foundation for everything.
2. **Team:** Required for Match creation.
3. **Match (Basic):** Required for Scoring.
4. **Scoring Engine:** Generates data for Stats.
5. **Stats Engine:** Depends on Scoring data.
6. **Messaging:** Independent but enhances Teams/Matches.
7. **Tournaments:** Wraps Matches & Teams.

## 5. Safe Implementation Roadmap

### Phase 1: Foundation (Current)
- Project Init (`frontend`, `backend`).
- Auth (Firebase).
- User Profile (Schema + Wizard).

### Phase 2: Core Data Models
- Team Management.
- Match Setup (Basic Models).
- **Checkpoint:** Verify DB relationships.

### Phase 3: The Scoring Engine (Critical)
- Scoring State Machine (Redux/Zustand on Client).
- API for persisting ball-by-ball data.
- **Risk:** Ensure efficient write patterns.

### Phase 4: Stats & Aggregation
- Implement `computeStats` logic.
- Dashboards.

### Phase 5: Real-time & Social
- Socket.io integration.
- Messaging.
- Match Invites (Location).

### Phase 6: Advanced & Polish
- Tournaments.
- Offline/PWA.
- Notifications.

## 6. Project Folder Structure

### Backend (`backend/`)
```
src/
  config/           # Env, DB connection, Constants
  controllers/      # Request handlers
  middlewares/      # Auth, Validation, Error handling
  routes/           # Route definitions (split by domain)
  services/         # Business logic (Scoring, Stats, Team)
  sockets/          # Socket.io event handlers
  utils/            # Helpers (Date, Math, Formatting)
  app.ts            # Entry point
  types/            # Express Request extensions
```

### Frontend (`frontend/`)
```
src/
  components/
    ui/             # shadcn/ui components
    features/       # Feature-specific components (Scoring, Profile)
  hooks/            # Custom React hooks (useAuth, useScoring)
  lib/              # Utils (api client, formatting, constants)
  pages/            # Route pages
  store/            # State management (Zustand/Context)
  types/            # TS Interfaces
  App.tsx
```

## Directory Structure (Proposed)
```
/
├── frontend/               # Frontend (React + Vite) -> Vercel
├── backend/                # Backend (Express) -> Render
├── shared/                 # Shared types (Requires build step to copy to both during deploy)
├── docs/                   # Project documentation
├── prisma/                 # Database schema and migrations
└── ... (root config files)
```

## Deployment Strategy
- **Frontend:** Vercel. Needs `vercel.json` or Vercel Dashboard config to point to `frontend/`.
- **Backend:** Render. Needs `render.yaml` or Render Dashboard config to point to `backend/`.
- **Environment:**
  - Frontend: `VITE_API_URL` points to Render URL.
  - Backend: `CORS_ORIGIN` points to Vercel URL.

## 7. Development Rules
1. **Check First:** Before implementing, check `implemented-features.md` to avoid duplication.
2. **Update Docs:** After every feature, update `implemented-features.md`.
3. **Schema Changes:** Record rationale in `database-schema-notes.md`.
4. **Transactions:** All multi-table writes (especially Scoring) MUST use `prisma.$transaction`.
5. **No Blind Code:** Analyze dependencies. If a feature needs `Team`, ensure `Team` is ready.
