# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Backend (Spring Boot - Java 17)
```bash
cd backend
mvn clean install          # Build the project
mvn spring-boot:run        # Run the backend server (port 8080)
mvn test                   # Run tests
mvn jacoco:report          # Generate test coverage report
```

### Frontend (React + TypeScript)
```bash
cd frontend
npm install                # Install dependencies
npm start                  # Start dev server (port 3000)
npm run build              # Build for production
npm test                   # Run tests
```

### Docker (CloudLab Deployment)
```bash
# Local machine - Build and transfer image
docker buildx build --platform linux/amd64 -t myfi-app .  # Build AMD64 image for CloudLab
docker save -o myfi-app.tar myfi-app:latest               # Save image to tar file
scp myfi-app.tar mukul@cloudlab:~/git/myfi/         # Copy to CloudLab server

# Remote CloudLab server commands via SSH
ssh mukul@cloudlab "docker load -i ~/git/myfi/myfi-app.tar"           # Load image
ssh mukul@cloudlab "cd ~/git/myfi && docker-compose up -d"   # Start new container
ssh mukul@cloudlab "docker system prune -f"                      # Clean up unused images
```

## Application Architecture

### Overview
MyFi is a personal finance management application with a Spring Boot backend and React frontend. It features automated transaction extraction from bank emails via Gmail API, transaction categorization using AI, and comprehensive financial data visualization.

### Tech Stack
- **Backend**: Spring Boot 3.x, Java 17, SQLite, Spring Data JPA, Hibernate
- **Frontend**: React 18, TypeScript, Redux Toolkit, Tailwind CSS
- **APIs**: Gmail API, OpenAI API (Spring AI)
- **Database**: SQLite with Hibernate ORM
- **Build**: Maven (backend), npm (frontend)

### Key Components

#### Backend Architecture (`backend/src/main/java/com/myfi/`)
- **Core Models**: `Account`, `Transaction`, `Tag` - main financial entities
- **Controllers**: REST endpoints for accounts, transactions, tags, credentials, refresh operations
- **Services**: Business logic layer with email parsing, account management, transaction processing
- **Email Scraping**: Gmail integration with AI-powered transaction extraction using OpenAI
- **Refresh System**: Background job tracking for account data updates with progress monitoring
- **Credentials Management**: Encrypted storage of banking credentials with master key protection

#### Frontend Architecture (`frontend/src/`)
- **State Management**: Redux Toolkit with slices for transactions, accounts, tags
- **Components**: Reusable UI components with TypeScript
- **Screens**: Main application views (Home, Transactions, Settings, etc.)
- **Services**: API client (`apiService.ts`) for backend communication
- **Styling**: Tailwind CSS with custom color scheme

### Data Flow
1. **Email Scraping**: Gmail API → Email Parser → OpenAI processing → Transaction creation
2. **State Management**: Backend API → Redux store → React components
3. **User Interactions**: Component events → API calls → State updates → UI re-render

### Key Features
- **Transaction Management**: CRUD operations, splitting, merging, categorization
- **Account Hierarchy**: Parent-child account relationships
- **Automated Data Import**: Email-based transaction extraction with AI processing
- **Real-time Updates**: Progress tracking for refresh operations
- **Security**: Encrypted credential storage with master key authentication

### Database Schema
- **SQLite** database with JPA entities
- **Key relationships**: Account → Transaction (many-to-many), Transaction → Tag (many-to-one), Account → Account (parent-child)
- **Audit fields**: createdAt, updatedAt timestamps on main entities

### API Structure
- **Base URL**: `/api/v1`
- **Authentication**: Master key header (`X-Master-Key`) for sensitive operations
- **Pagination**: Spring Data pageable responses for large datasets
- **Error Handling**: Consistent error response format with detailed messages

### Environment Configuration
- **Backend**: `application.properties` with profile-specific overrides (dev/prod)
- **Frontend**: Environment variables via `.env` files
- **Docker**: Production deployment with volume mounting for database persistence

## Development Guidelines

### Code Organization
- Follow existing package structure and naming conventions
- Use TypeScript interfaces that match backend DTOs exactly
- Maintain Redux slice patterns for state management
- Follow Spring Boot best practices for REST controllers and services

### Testing
- Backend uses JUnit with test coverage reporting via JaCoCo
- Frontend uses React Testing Library and Jest
- Test files are co-located with source files where appropriate

### Security Considerations
- Never commit actual credentials or API keys
- Use master key authentication for sensitive operations
- Encrypt stored credentials using EncryptionUtil
- Validate all user inputs in both frontend and backend

### API Integration
- Always use the centralized `apiService.ts` for API calls
- Implement proper error handling with user-friendly messages
- Follow existing patterns for async operations and loading states
- Use Redux Toolkit Query patterns where beneficial