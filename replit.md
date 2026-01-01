# PropertyHub - Real Estate Projects Aggregator

## Overview

PropertyHub is a web-based real estate aggregator that indexes new development projects published by developers. Users can discover projects via map, filters, and listings, browse developers and banks, save favorites, and track viewing history. The application is built with a React frontend and Express backend, using PostgreSQL for data storage.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state, local React state for UI
- **Styling**: Tailwind CSS with shadcn/ui component library (New York style)
- **Maps**: Leaflet with react-leaflet for interactive map displays
- **Build Tool**: Vite with HMR support

The frontend follows a page-based architecture with shared components. Key pages include Home, Projects, Developers, Banks, Map, Favorites, and Account. Components are organized into UI primitives (shadcn/ui), feature components (cards, filters, maps), and layout components (sidebar, header).

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database ORM**: Drizzle ORM with PostgreSQL
- **Authentication**: Replit Auth with OpenID Connect, Passport.js for session management
- **Session Storage**: PostgreSQL-backed sessions via connect-pg-simple

The server follows a modular structure:
- `server/routes.ts`: API endpoint definitions
- `server/storage.ts`: Data access layer with typed interfaces
- `server/db.ts`: Database connection configuration
- `server/seed.ts`: Database seeding for development

### Data Model
Core entities include:
- **Cities/Districts**: Geographic hierarchy for project locations
- **Developers**: Real estate development companies
- **Banks**: Financial institutions with developer partnerships
- **Projects**: Individual real estate developments with location, pricing, and metadata
- **Users**: Authenticated users with favorites and view history

### API Design
RESTful API endpoints under `/api/`:
- `/api/projects` - Project listing with filters (city, district, developer, bank, search, sort)
- `/api/developers`, `/api/banks` - Entity listings
- `/api/me/favorites`, `/api/me/history` - User-specific data (authenticated)
- `/api/auth/user` - Current user info

### Build System
- Development: Vite dev server with Express backend (tsx for TypeScript execution)
- Production: Vite builds frontend to `dist/public`, esbuild bundles server to `dist/index.cjs`
- Database migrations: Drizzle Kit with `db:push` command

## External Dependencies

### Database
- **PostgreSQL**: Primary data store, connection via `DATABASE_URL` environment variable
- **Drizzle ORM**: Type-safe database queries and schema management

### Authentication
- **Replit Auth**: OpenID Connect provider for user authentication
- **express-session**: Session management with PostgreSQL store
- **Passport.js**: Authentication middleware

### Frontend Libraries
- **Leaflet**: Interactive mapping (CDN-loaded CSS)
- **Radix UI**: Accessible UI primitives (via shadcn/ui)
- **TanStack Query**: Data fetching and caching
- **date-fns**: Date formatting utilities

### Environment Variables Required
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Secret for session encryption
- `ISSUER_URL`: OpenID Connect issuer (defaults to Replit)
- `REPL_ID`: Replit environment identifier