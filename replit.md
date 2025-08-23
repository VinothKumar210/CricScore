# Cricket Scoreboard App

## Overview

This is a full-stack cricket scoreboard application built for tracking player statistics and team management. The app allows cricket players to register, maintain detailed career statistics, form teams, and track match performance over time. It features a modern React frontend with a Node.js/Express backend, using PostgreSQL for data persistence and JWT-based authentication.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript for type safety
- **UI Library**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with a sky blue and white theme
- **State Management**: React Query (TanStack Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation
- **Build Tool**: Vite for fast development and optimized builds

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript for enhanced developer experience
- **Authentication**: JWT-based authentication with bcrypt for password hashing
- **Database ORM**: Drizzle ORM for type-safe database operations
- **API Design**: RESTful API endpoints with proper HTTP status codes
- **Data Storage**: In-memory storage implementation with interface for easy database migration

### Database Design
The application uses a PostgreSQL database with the following core entities:
- **Users**: Store player profiles with authentication credentials and cricket-specific attributes (role, batting hand, bowling style)
- **Career Stats**: Aggregate statistics tracking batting, bowling, and fielding performance
- **Teams**: Team management with captain/vice-captain roles
- **Team Members**: Junction table for team membership
- **Team Invitations**: Invitation system for team recruitment
- **Matches**: Individual match records for statistics calculation

### Authentication Flow
- JWT token-based authentication stored in localStorage
- Profile completion flow after initial registration
- Protected routes requiring authentication
- Role-based access control for team management features

### Key Features Implementation
1. **Profile Management**: Complete player profiles with cricket-specific roles and preferences
2. **Statistics Tracking**: Automatic calculation of derived metrics (strike rate, economy rate)
3. **Team Management**: Create teams, invite players, manage membership
4. **Match Recording**: Input match statistics that automatically update career totals
5. **Responsive Design**: Mobile-first approach with collapsible sidebar navigation

## External Dependencies

### Core Framework Dependencies
- **@neondatabase/serverless**: PostgreSQL database connectivity
- **drizzle-orm**: Type-safe ORM for database operations
- **drizzle-kit**: Database migration and schema management tools

### Authentication & Security
- **jsonwebtoken**: JWT token generation and verification
- **bcryptjs**: Password hashing and verification
- **connect-pg-simple**: PostgreSQL session store

### UI & Styling
- **@radix-ui/***: Comprehensive set of UI primitives for accessible components
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Type-safe component variant management
- **clsx**: Conditional CSS class utilities

### Form & Validation
- **react-hook-form**: Performant form library with minimal re-renders
- **@hookform/resolvers**: Integration layer for validation libraries
- **zod**: Schema validation for both client and server
- **drizzle-zod**: Generate Zod schemas from Drizzle database schemas

### Development Tools
- **vite**: Fast build tool and development server
- **tsx**: TypeScript execution for Node.js
- **esbuild**: JavaScript bundler for production builds
- **@replit/vite-plugin-***: Replit-specific development plugins