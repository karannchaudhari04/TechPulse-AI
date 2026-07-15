# ── Stage 1: Build ──────────────────────────────────────────────────────────
# Uses linux/amd64 explicitly — works on both Oracle AMD (E2.1.Micro)
# and ARM (Ampere A1). Docker buildx handles cross-compilation.
FROM --platform=$BUILDPLATFORM eclipse-temurin:17-jdk-alpine AS builder
WORKDIR /app

# Copy Maven wrapper and pom first for layer caching
# (dependencies re-downloaded only when pom.xml changes)
COPY mvnw .
COPY .mvn .mvn
COPY pom.xml .
RUN chmod +x mvnw && ./mvnw dependency:go-offline -q

# Copy source and build the JAR
COPY src ./src
RUN ./mvnw package -DskipTests -q

# ── Stage 2: Run ─────────────────────────────────────────────────────────────
# JRE-only image — ~180MB vs ~400MB with JDK
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# Create a non-root user for security
RUN addgroup -S techpulse && adduser -S techpulse -G techpulse
USER techpulse

# Copy the built JAR from stage 1
COPY --from=builder /app/target/*.jar app.jar

# Health check — Oracle Cloud load balancer uses this
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget -qO- http://localhost:8080/actuator/health || exit 1

EXPOSE 8080

# Tuned for Render Free Tier (512MB RAM):
# -Xmx256m  = max heap 256MB
# -Xms128m  = initial heap
# -XX:+UseSerialGC = lightweight GC for low-memory single-core containers
# -Xss256k  = reduce thread stack size to 256KB to save memory under thread concurrency
ENTRYPOINT ["java", \
  "-Xmx256m", "-Xms128m", \
  "-XX:+UseSerialGC", \
  "-Xss256k", \
  "-Djava.security.egd=file:/dev/./urandom", \
  "-jar", "app.jar"]
