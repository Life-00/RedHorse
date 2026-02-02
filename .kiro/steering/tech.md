# Technology Stack

## Frontend Framework
- **React 19.2** with TypeScript
- **Vite** as build tool and dev server
- **Framer Motion** for animations and transitions

## Styling & UI
- **Tailwind CSS** for utility-first styling
- **Lucide React** for icons
- Mobile-first responsive design

## Backend Infrastructure
- **AWS Lambda** with Python 3.x for serverless functions
- **AWS RDS** (PostgreSQL) for database
- **AWS S3** for file storage
- **AWS API Gateway** for REST API endpoints
- **AWS Amplify** for authentication
- **AWS Cognito** for user management

## Backend Services
Lambda functions organized by domain:
- `ai_services/` - AI-powered recommendations
- `fatigue_assessment/` - Fatigue risk calculations
- `jumpstart/` - Daily jumpstart plan generation
- `schedule_management/` - Shift schedule operations
- `user_management/` - User profile and preferences
- `wellness/` - Wellness recommendations and tracking

## Development Tools
- **ESLint** for code linting
- **TypeScript** with strict mode enabled
- **PostCSS** with Autoprefixer

## Common Commands

### Frontend Development
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

### Backend Development
```bash
python backend/scripts/init_database.py        # Initialize database schema
python backend/scripts/deploy_lambda.py        # Deploy Lambda functions
python backend/scripts/test_connection.py      # Test database connection
python backend/scripts/check_database.py       # Verify database state
```

### Environment Setup
Frontend environment variables (`.env.local`):
- `VITE_COGNITO_USER_POOL_ID`
- `VITE_COGNITO_USER_POOL_CLIENT_ID`

Backend environment variables (`backend/.env`):
- Database connection settings
- AWS credentials and region
- S3 bucket configuration

## Build Configuration
- **Target**: ES2020
- **Module**: ESNext with bundler resolution
- **JSX**: react-jsx
- **Strict mode**: Enabled
- **Source maps**: Available in development