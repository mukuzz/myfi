# MyFi

A modern personal finance management application built with Spring Boot (Java) for the backend and React (TypeScript) for the frontend.

## Table of Contents

- [Project Structure](#project-structure)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
  - [Backend (Spring Boot)](#backend-spring-boot)
  - [Frontend (React)](#frontend-react)
- [Database](#database)
- [API Documentation](#api-documentation)
- [Development](#development)
- [Contributing](#contributing)

## Project Structure

```
myfi/
├── .env                      # Backend environment variables (See .env.example)
├── .gitignore                # Git ignore configuration
├── Readme.md                 # This file
├── myfi.db                   # SQLite database file (created on first run)
│
├── backend/                  # Spring Boot backend application
│   ├── pom.xml               # Maven build configuration
│   ├── .env                  # Backend environment variables (overrides root .env)
│   ├── storage/              # Directory for storing larger files (e.g., Playwright traces)
│   └── src/
│       ├── main/
│       │   ├── java/         # Java source code
│       │   └── resources/    # Application properties, static assets, etc.
│       │       ├── application.properties
│       │       └── static/
│       └── test/             # Backend tests
│
└── frontend/                 # React frontend application
    ├── package.json          # npm package configuration
    ├── package-lock.json     # npm lock file
    ├── tsconfig.json         # TypeScript configuration
    ├── tailwind.config.js    # Tailwind CSS configuration
    ├── .env                  # Frontend environment variables
    ├── .gitignore            # Frontend specific Git ignore
    ├── public/               # Static assets served by the development server
    └── src/                  # React/TypeScript source code
        ├── index.tsx         # Application entry point
        ├── App.tsx           # Main application component
        ├── components/       # Reusable UI components
        ├── services/         # API service integrations
        └── ...               # Other feature modules/pages
```

## Tech Stack

**Backend:**
- Java 17
- Spring Boot 3.x
  - Spring Web
  - Spring Data JPA
  - Spring Validation
- Maven
- Hibernate (ORM)
- SQLite JDBC Driver
- Playwright (for web scraping tasks)
- Lombok
- Springdoc OpenAPI (Swagger UI)

**Frontend:**
- React
- TypeScript
- Tailwind CSS
- React Icons
- React Testing Library
- Node.js / npm

**Database:**
- SQLite

**Other:**
- Git
- VS Code (Editor Config)

## Prerequisites

- Java Development Kit (JDK) 17 or later
- Apache Maven
- Node.js 18 or later
- npm (usually comes with Node.js)

## Configuration

Environment variables are used for configuration.

- **Backend:** Create a `.env` file in the `backend/` directory (or the project root). You can copy `backend/.env.example` if it exists. Key variables might include database connection details, API keys, etc.
- **Frontend:** Create a `.env` file in the `frontend/` directory. This typically contains variables like `REACT_APP_API_BASE_URL` to point to the backend server.

## Running the Application

### Backend (Spring Boot)

1.  Navigate to the backend directory: `cd backend`
2.  Build the project (optional, Spring Boot run usually handles this): `mvn clean install`
3.  Run the application: `mvn spring-boot:run`
4.  The backend API will be available at `http://localhost:8080` (or the configured port).

### Frontend (React)

1.  Navigate to the frontend directory: `cd frontend`
2.  Install dependencies: `npm install`
3.  Start the development server: `npm start`
4.  The frontend application will open in your browser at `http://localhost:3000` (or the configured port).

## Database

- The application uses an SQLite database.
- The database file (`myfi.db`) is typically created automatically in the project root directory when the backend application starts for the first time if it doesn't exist.
- Database schema updates are managed by Hibernate (using `spring.jpa.hibernate.ddl-auto` property in `application.properties`). Be cautious with the `create` or `create-drop` values in production.

## API Documentation

Once the backend is running, API documentation (Swagger UI) is usually available at:
`http://localhost:8080/swagger-ui.html`

## Development

1.  Clone the repository: `git clone <repository-url>`
2.  Navigate to the project directory: `cd myfi`
3.  Set up the backend environment variables (see [Configuration](#configuration)).
4.  Set up the frontend environment variables (see [Configuration](#configuration)).
5.  Run the backend (see [Running the Application](#running-the-application)).
6.  Run the frontend (see [Running the Application](#running-the-application)).
7.  Access the application via the frontend URL (default: `http://localhost:3000`).

## Contributing

1.  Fork the repository.
2.  Create your feature branch (`git checkout -b feature/AmazingFeature`).
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4.  Push to the branch (`git push origin feature/AmazingFeature`).
5.  Open a Pull Request.
