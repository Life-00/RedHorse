# Project Structure

## Root Level
- `src/` - Frontend application source code
- `backend/` - Backend Lambda functions and infrastructure
- `public/` - Static assets
- `scripts/` - Deployment scripts
- Configuration files: `vite.config.js`, `tailwind.config.js`, `tsconfig.json`

## Source Organization (`src/`)

### Core Application
- `App.tsx` - Main application component with routing logic
- `main.tsx` - Application entry point
- `index.css` - Global styles

### Components (`src/components/`)
- `layout/` - Layout components (MobileFrame, etc.)
- `schedule/` - Schedule-specific components
- `shared/` - Reusable UI components (RiskBadge, SelectionCard)

### Pages (`src/pages/`)
Organized by feature area:
- `auth/` - Authentication screens (Login, SignUp, Confirm)
- `home/` - Dashboard screens (logged in/out states)
- `onboarding/` - Multi-step onboarding flow
- `plan/` - Planning and fatigue management
- `profile/` - User profile and settings
- `schedule/` - Schedule management
- `wellness/` - Wellness features and recommendations

### Supporting Code
- `lib/` - External service integrations (Amplify, Auth)
- `types/` - TypeScript type definitions
- `utils/` - Utility functions and configuration

## Architecture Patterns

### State Management
- Local component state with `useState`
- `localStorage` for user preferences persistence
- Props drilling for shared state

### Navigation
- Single-page application with screen-based routing
- `ScreenType` union type for type-safe navigation
- `onNavigate` callback pattern for screen transitions

### Component Patterns
- Functional components with hooks
- Props interfaces for type safety
- Consistent naming: PascalCase for components, camelCase for functions

## Backend Organization (`backend/`)

### Lambda Functions (`backend/lambda/`)
Each service has its own directory with:
- `handler.py` - Lambda function entry point
- `requirements.txt` - Python dependencies

Services:
- `ai_services/` - AI recommendations and chatbot
- `fatigue_assessment/` - Fatigue risk scoring
- `jumpstart/` - Daily plan generation
- `schedule_management/` - Schedule CRUD operations
- `user_management/` - User profile management
- `wellness/` - Wellness features

### Infrastructure (`backend/infrastructure/`)
- SQL schema files for database setup
- Migration scripts
- RDS setup documentation
- S3 structure documentation

### Utilities (`backend/utils/`)
- `database.py` - Database connection and query helpers
- `s3_manager.py` - S3 file operations

### Scripts (`backend/scripts/`)
- Database initialization and migration
- Lambda deployment automation
- AWS resource management