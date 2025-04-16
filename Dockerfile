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

# Download Playwright Chromium browser
# This assumes exec-maven-plugin is configured or Playwright CLI is accessible
RUN mvn exec:java -e -Dexec.mainClass=com.microsoft.playwright.CLI -Dexec.args="install chromium"

# Copy frontend build artifacts into Spring Boot static resources
COPY --from=frontend-builder /app/frontend/build ./src/main/resources/static

# Build the backend JAR
RUN mvn package -DskipTests

# Stage 3: Final Runtime Image
FROM openjdk:17-jdk-slim

# Install Playwright dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libnss3 libnspr4 libdbus-1-3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libgbm1 libxkbcommon0 \
    libpango-1.0-0 libcairo2 libasound2 libatspi2.0-0 libx11-6 libxcomposite1 libxdamage1 libxext6 \
    libxfixes3 libxrandr2 libexpat1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Define path for Playwright browsers and set environment variable
ENV PLAYWRIGHT_BROWSERS_PATH=/opt/playwright

# Copy downloaded Playwright browsers from the build stage
# Assumes the default download path /root/.cache/ms-playwright in the builder stage
COPY --from=backend-builder /root/.cache/ms-playwright ${PLAYWRIGHT_BROWSERS_PATH}

# Copy the JAR file from the backend build stage
COPY --from=backend-builder /app/backend/target/*.jar ./app.jar

# Expose the backend port (default for Spring Boot is 8080)
EXPOSE 8080

# Command to run the application
ENTRYPOINT ["java", "-Dspring.profiles.active=prod", "-jar", "app.jar"]