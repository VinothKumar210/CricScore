
# CricScore - Advanced Cricket Scoring & Management Platform

CricScore is a comprehensive web application designed for cricket enthusiasts, teams, and tournament organizers to manage matches, track scores ball-by-ball, and organize team activities. Built with a modern tech stack, it offers a seamless experience for both online and offline scoring.

## 🚀 Key Features

### 🏏 Advanced Match Scoring Engine
*   **Ball-by-Ball Tracking**: Precise recording of every delivery, including runs, extras (wides, no-balls, byes, leg-byes), and wickets.
*   **Dynamic State Management**: Handles complex cricket logic like strike rotation, free hits, over completion, and innings transitions automatically.
*   **Offline Resilience**: The scoreboard persists state to local storage, allowing scoring to continue even if the internet connection is lost.
*   **Undo Capability**: Full undo support to correct scoring errors instantly.
*   **Rich Wicket Types**: Support for all dismissal modes (Bowled, Catch, LBW, Run Out, Stumped, Hit Wicket, etc.) with fielder attribution.
*   **Partnership Tracking**: Real-time calculation of current partnership runs and balls.

### 👥 Team & Player Management
*   **Team Creation**: Users can create their own teams with unique logos and descriptions.
*   **Unique Team Codes**: Every team gets a unique, shareable code (e.g., `ctid1`) for easy lookup and joining.
*   **Role-Based Access**: Granular permissions for Captains, Vice-Captains, and Members.
    *   Captains can edit team details, manage rosters, and transfer leadership.
    *   Vice-Captains have elevated privileges to assist in management.
*   **Roster Management**: Add registered users or create "Guest Players" for ad-hoc matches.
*   **Invitations**: System to invite users to join teams via email or username.

### 🏟️ Match Management
*   **Fixture Creation**: Schedule matches between two teams (Registered vs Registered, or Registered vs Local).
*   **Local Matches**: Support for quick, ad-hoc matches with custom team names and players.
*   **Toss & Selection**: Integrated toss workflow and playing XI selection.
*   **Custom Match Settings**: Configurable overs, venue, and date.

### 🔐 Authentication & Security
*   **Multi-Provider Auth**: Support for standard Email/Password login and Firebase-powered Google Authentication.
*   **Profile Management**: Customizable user profiles with avatars, roles (Batsman/Bowler), and batting/bowling styles.
*   **Secure API**: JWT-based authentication for all protected API endpoints.

### 📊 Statistics System (Note: Currently Decommissioned)
*   *Legacy Feature*: The application includes a robust statistics engine capable of tracking Career Stats, Match History, and Team Performance (Win/Loss ratios, Top Performers).
*   *Status*: This system is currently disabled by configuration but remains part of the codebase for future enablement.

## 🛠️ Technology Stack

*   **Frontend**: React (Vite), TypeScript, Tailwind CSS, Shadcn UI, Wouter (Routing), TanStack Query.
*   **Backend**: Node.js, Express, TypeScript.
*   **Database**: MongoDB (via Prisma ORM).
*   **State Management**: React Context + Local Storage (for persistence).

## 🚀 Getting Started

### Prerequisites
*   Node.js (v18 or higher)
*   MongoDB Instance (can be local or Atlas)

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/yourusername/cricscore.git
    cd cricscore
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Environment Setup**
    Create a `.env` file in the root directory:
    ```env
    DATABASE_URL="mongodb+srv://..."
    JWT_SECRET="your-secret-key"
    NODE_ENV="development"
    ```

4.  **Database Setup**
    Push the Prisma schema to your database:
    ```bash
    npx prisma db push
    ```

5.  **Run Development Server**
    Start both frontend and backend concurrently:
    ```bash
    npm run dev:separate
    ```
    *   Frontend: http://localhost:5173
    *   Backend: http://localhost:3000

## 📂 Project Structure

*   `client/`: React frontend application.
    *   `src/pages/`: Main application views (Scoreboard, Teams, Dashboard).
    *   `src/components/`: Reusable UI components.
    *   `src/lib/`: Utilities and API interaction helpers.
*   `server/`: Express backend API.
    *   `routes.ts`: API route definitions.
    *   `storage.ts`: Database interaction layer (Prima encapsulation).
    *   `services/`: Business logic (e.g., Stats Service - disabled).
*   `shared/`: Shared TypeScript types and Zod schemas (Validation).
*   `prisma/`: Database schema definition.

## 🤝 Contributing

Contributions are welcome! Please ensure you follow the existing code style and modify the shared schema only when necessary to maintain type safety across the full stack.
