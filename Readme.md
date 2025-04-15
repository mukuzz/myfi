# MyFi

A modern personal finance management application with seamless transaction updates.

## Table of Contents

- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
  - [Backend (Spring Boot)](#backend-spring-boot)
  - [Frontend (React)](#frontend-react)
- [Using Docker](#using-docker)
- [Database](#database)
- [API Documentation](#api-documentation)
- [Development](#development)
- [Contributing](#contributing)

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

### Using Docker

Alternatively, you can build and run the entire application (backend and frontend) in a single Docker container.

1.  **Build the Docker image:**
    Make sure you have Docker installed and running. Navigate to the project root directory (where the `Dockerfile` is located) and run:
    ```bash
    docker build -t myfi-app .
    ```
    *Or, for specific platforms like `linux/amd64` (e.g., when building on an M1/M2 Mac for a Linux deployment):*
    ```bash
    docker buildx build --platform linux/amd64 -t myfi-app .
    ```

2.  **Create a data directory (if it doesn't exist):**
    The container expects the SQLite database (`myfi.db`) to be in a mounted volume. Create a `data` directory in the project root on your host machine:
    ```bash
    mkdir data
    ```
    *(Ensure your `myfi.db` file is placed inside this `data` directory before running the container. If the file doesn't exist, the application will create it inside the container's `/data` volume when first started).* 

3.  **Run the Docker container:**
    This command runs the container, maps port 8080, and mounts the local `./data` directory to `/data` inside the container for database persistence.
    ```bash
    docker run -d \
      -p 8080:8080 \
      -v "$(pwd)/data:/data" \
      --name myfi-container \
      myfi-app
    ```

4.  **Access the application:**
    The application should now be accessible at `http://localhost:8080`.

5.  **View logs:**
    ```bash
    docker logs myfi-container
    ```

6.  **Stop the container:**
    ```bash
    docker stop myfi-container
    ```

### Copying the Image Manually (using scp)

If you need to deploy the image to a server without using a Docker registry, you can save it to a file and copy it using `scp`.

1.  **Save the Docker image to a tar file:**
    This command saves your `myfi-app` image to a file named `myfi-app.tar`.
    ```bash
    docker save -o myfi-app.tar myfi-app:latest
    ```

2.  **Copy the tar file to the remote server:**
    Use `scp` to transfer the file. Replace `<user>` with your username on the remote server and `<remote-server-address>` with its IP address or hostname. Replace `<path/on/server>` with the desired directory on the remote server.
    ```bash
    scp myfi-app.tar <user>@<remote-server-address>:<path/on/server>/myfi-app.tar
    ```
    *Example: `scp myfi-app.tar deploy@192.168.1.100:/home/deploy/`*

3.  **Load the image on the remote server:**
    After logging into the remote server (e.g., via `ssh`), navigate to the directory where you copied the file and load the image into Docker:
    ```bash
    docker load -i myfi-app.tar
    ```
    Now the `myfi-app:latest` image is available on the remote server, and you can run it using `docker run` (similar to step 3 in the main Docker section, ensuring the data volume path is correct for the server environment).

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
