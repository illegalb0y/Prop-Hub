# PropertyHub - Real Estate Projects Aggregator

PropertyHub is a professional web-based real estate aggregator that indexes new development projects. Users can discover projects through a map-first interface, multi-level filtering, and track their favorite projects and viewing history.

## Technical Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state
- **Styling**: Tailwind CSS with shadcn/ui components
- **Maps**: Leaflet with react-leaflet for interactive map displays
- **Icons**: Lucide React
- **Animations**: Framer Motion

### Backend
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM
- **Authentication**: Replit Auth with OpenID Connect
- **Session Management**: Passport.js with PostgreSQL-backed session storage

### Development & Deployment
- **Build Tool**: Vite
- **Database Migrations**: Drizzle Kit
- **Runtime**: Node.js with NixOS environment

## Key Features
- **Map-Based Discovery**: Interactive map showing project locations across major cities.
- **Advanced Filtering**: Filter projects by city, district, developer, and financing banks.
- **Project Details**: Comprehensive project information including pricing, completion dates, and amenities.
- **User Profiles**: Personalized favorites list and viewing history for authenticated users.
- **Responsive Design**: Optimized for various screen sizes with a modern sidebar navigation.
