# Technology Stack

## Frontend Framework
- **React 19.2** with TypeScript
- **Vite** as build tool and dev server
- **Framer Motion** for animations and transitions

## Styling & UI
- **Tailwind CSS** for utility-first styling
- **Lucide React** for icons
- Mobile-first responsive design

## Authentication & Backend
- **AWS Amplify** for authentication
- **AWS Cognito** for user management
- Environment variables for configuration

## Development Tools
- **ESLint** for code linting
- **TypeScript** with strict mode enabled
- **PostCSS** with Autoprefixer

## Common Commands

### Development
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

### Environment Setup
Required environment variables:
- `VITE_COGNITO_USER_POOL_ID`
- `VITE_COGNITO_USER_POOL_CLIENT_ID`

## Build Configuration
- **Target**: ES2020
- **Module**: ESNext with bundler resolution
- **JSX**: react-jsx
- **Strict mode**: Enabled
- **Source maps**: Available in development