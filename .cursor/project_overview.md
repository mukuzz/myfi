# MyFi - Personal Finance Management System

## Project Overview
MyFi is a personal finance management system that helps users track their financial transactions, manage multiple accounts, and analyze their spending patterns. The system supports various types of financial accounts and provides detailed transaction tracking with split transaction capabilities.

## Tech Stack
- Backend: Spring Boot (Java)
- Database: PostgreSQL
- Frontend: React (TypeScript)
- Build Tools: Maven (Backend), npm (Frontend)

## Project Structure
```
myfi/
├── backend/                 # Spring Boot backend
│   ├── src/
│   │   └── main/
│   │       ├── java/
│   │       │   └── com/myfi/
│   │       │       ├── model/      # Database entities
│   │       │       ├── repository/ # Database repositories
│   │       │       ├── service/    # Business logic
│   │       │       └── controller/ # REST endpoints
│   │       └── resources/
│   └── pom.xml
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/        # Page components
│   │   └── services/     # API services
│   └── package.json
└── .cursor/              # Project documentation
    ├── schema.md         # Database schema
    └── project_overview.md
```

## Key Features
1. Account Management
   - Support for multiple account types (Savings, Credit Card, Loan, Stocks, etc.)
   - Balance tracking
   - Currency support

2. Transaction Management
   - Basic transactions (CREDIT/DEBIT)
   - Split transactions for detailed tracking
   - Category and tag support
   - Transaction history

3. Data Model
   - Self-referential transaction model for split transactions
   - Flexible account types
   - Category and tag system for better organization

## Database Schema
The system uses a relational database with the following key tables:
- `accounts`: Stores user's financial accounts
- `transactions`: Stores all financial transactions with support for split transactions

## Development Guidelines
1. Code Style
   - Follow Java coding conventions
   - Use Lombok for reducing boilerplate code
   - Follow React best practices for frontend

2. Database
   - Use JPA annotations for entity mapping
   - Implement proper relationships between entities
   - Use appropriate cascade types for data integrity

3. API Design
   - RESTful endpoints
   - Proper HTTP methods and status codes
   - Consistent response formats

## Current Status
- Basic account and transaction models implemented
- Split transaction support added
- Frontend development in progress

## Future Enhancements
1. Scraping Net Banking for account transactions.
2. Budget Planning
3. Financial Reports
4. Investment Tracking
5. Bill Reminders
6. Export/Import Features

## Getting Started
1. Clone the repository
2. Set up PostgreSQL database
3. Configure application.properties
4. Run backend: `mvn spring-boot:run`
5. Run frontend: `npm start`

## Notes for LLM Sessions
- Follow existing patterns in the codebase
- Maintain data integrity and relationships
- Consider performance implications of database queries
- Keep documentation up to date 