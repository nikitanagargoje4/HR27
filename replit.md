# replit.md

## Overview

HR1 is a comprehensive Human Resources management system built as a full-stack web application. It provides functionality for employee management, attendance tracking, leave management, department organization, and HR reporting. The system features role-based access control with different permission levels for admins, HR personnel, managers, and employees.

The application follows a modern architecture with a React-based frontend using shadcn/ui components and TailwindCSS for styling, an Express.js backend API, and PostgreSQL database integration through Drizzle ORM. It includes authentication, session management, and comprehensive CRUD operations for all HR-related entities.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety
- **Routing**: Wouter for lightweight client-side routing with protected routes
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: TailwindCSS with custom CSS variables for theming
- **State Management**: TanStack React Query for server state and data fetching
- **Forms**: React Hook Form with Zod validation for type-safe form handling
- **Charts**: Recharts library for data visualization in reports and dashboards

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript for full-stack type safety
- **API Design**: RESTful API with structured error handling and request logging
- **Authentication**: Passport.js with local strategy using session-based auth
- **Session Storage**: Express-session with configurable store (memory store for development)
- **Password Security**: Node.js crypto with scrypt for password hashing

### Database Architecture
- **Database**: PostgreSQL as the primary database
- **ORM**: Drizzle ORM for type-safe database operations
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Connection**: Neon Database serverless PostgreSQL connection

### Data Models
The system includes comprehensive schemas for:
- **Users/Employees**: Complete employee profiles with roles and department assignments
- **Departments**: Organizational structure management
- **Attendance**: Daily check-in/check-out tracking with status management
- **Leave Requests**: Leave application workflow with approval process
- **Holidays**: Company-wide holiday calendar management

### Authentication & Authorization
- **Role-based Access Control**: Four-tier system (admin, hr, manager, employee)
- **Session Management**: Secure session handling with configurable expiration
- **Protected Routes**: Frontend route protection based on authentication status
- **Permission System**: Role-specific UI components and API endpoint access

### Development Architecture
- **Build System**: Vite for fast development and optimized production builds
- **Development Tools**: Replit-specific plugins for cloud development environment
- **Code Organization**: Modular structure with shared types between client and server
- **Path Aliases**: Configured for clean imports across the application

## External Dependencies

### Database Services
- **Neon Database**: Serverless PostgreSQL hosting for production database
- **Drizzle ORM**: Database toolkit for TypeScript with PostgreSQL dialect

### UI & Styling Libraries
- **Radix UI**: Headless component primitives for accessible UI components
- **TailwindCSS**: Utility-first CSS framework with custom configuration
- **Lucide React**: Icon library for consistent iconography
- **Recharts**: Composable charting library for data visualization

### Development & Build Tools
- **Vite**: Build tool and development server with React plugin
- **TypeScript**: Static type checking across the entire application
- **ESBuild**: Fast JavaScript bundler for production builds

### Authentication & Security
- **Passport.js**: Authentication middleware with local strategy
- **Express Session**: Session management middleware
- **Node.js Crypto**: Built-in cryptographic functionality for password hashing

### Data Management & Validation
- **TanStack React Query**: Server state management and caching
- **React Hook Form**: Performant form library with validation
- **Zod**: TypeScript-first schema validation library
- **Date-fns**: Modern JavaScript date utility library

### Additional Libraries
- **Framer Motion**: Animation library for smooth UI transitions
- **Class Variance Authority**: Utility for managing component variants
- **CLSX & Tailwind Merge**: Conditional className utilities