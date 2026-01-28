# Project Structure

## Root Level
- `src/` - Main application source code
- `public/` - Static assets
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