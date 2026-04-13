FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline
COPY src ./src
RUN mvn clean package -DskipTests

FROM eclipse-temurin:17-jre-jammy
WORKDIR /app
COPY --from=build /app/target/communications-service-1.0-SNAPSHOT.jar app.jar
COPY config.yml .
EXPOSE 8090 8091
CMD ["java", "-Ddw.database.url=jdbc:postgresql://postgres:5432/shieldgate_alerting", "-Ddw.rabbitHost=rabbitmq", "-Ddw.shieldgateBackendUrl=http://fraud-detection-service:8080", "-jar", "app.jar", "server", "config.yml"]
