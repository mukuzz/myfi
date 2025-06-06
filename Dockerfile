# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy package files and install dependencies
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install

# Copy the rest of the frontend code
COPY frontend/ ./

# Build the frontend
RUN npm run build

# Stage 2: Build Backend
FROM maven:3.8.4-openjdk-17 AS backend-builder

WORKDIR /app/backend

# Copy pom.xml and download dependencies
COPY backend/pom.xml ./
RUN mvn dependency:go-offline

# Copy backend source code
COPY backend/src ./src

# Copy frontend build artifacts into Spring Boot static resources
COPY --from=frontend-builder /app/frontend/build ./src/main/resources/static

# Build the backend JAR
RUN mvn package -DskipTests

# Stage 3: Final Runtime Image
FROM openjdk:17-jdk-slim

WORKDIR /app

# Copy the JAR file from the backend build stage
COPY --from=backend-builder /app/backend/target/*.jar ./app.jar

# Expose the backend port (default for Spring Boot is 8080)
EXPOSE 8080

# Command to run the application
ENTRYPOINT ["java", "-Duser.timezone=Asia/Kolkata", "-Dspring.profiles.active=prod", "-jar", "app.jar"]