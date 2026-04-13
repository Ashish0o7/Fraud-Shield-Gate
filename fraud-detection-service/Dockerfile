FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline
COPY src ./src
RUN mvn clean package -DskipTests

FROM eclipse-temurin:17-jre-jammy
WORKDIR /app
COPY --from=build /app/target/fraud-detection-service-1.0-SNAPSHOT.jar app.jar
COPY config.yml .
EXPOSE 8080 8081
CMD ["java", "-Ddw.aerospikeHost=aerospike", "-Ddw.rabbitHost=rabbitmq", "-Ddw.elasticHost=elasticsearch", "-Ddw.mlServiceUrl=http://ml-scoring-service:8000", "-Ddw.redisHost=redis", "-Ddw.redisBackplaneEnabled=true", "-jar", "app.jar", "server", "config.yml"]
