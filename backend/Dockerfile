# --- Build stage ---
FROM eclipse-temurin:21-jdk AS build
WORKDIR /app

# Copy Gradle wrapper and build files first so dependency layers are cached
COPY gradlew ./
COPY gradle ./gradle
COPY build.gradle settings.gradle ./
RUN ./gradlew --version

# Copy source and build the executable jar
COPY src ./src
RUN ./gradlew bootJar --no-daemon -x test

# --- Runtime stage ---
FROM eclipse-temurin:21-jre AS runtime
WORKDIR /app

COPY --from=build /app/build/libs/*.jar app.jar

# Render sets PORT at runtime; application.properties reads it via ${PORT:8082}
EXPOSE 8082

ENTRYPOINT ["java", "-jar", "app.jar"]
