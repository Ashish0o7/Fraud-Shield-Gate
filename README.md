# ShieldGate — Event-Driven Fraud Detection System

A real-time fraud detection pipeline built with **Dropwizard**, **Aerospike**, **RabbitMQ**, **Elasticsearch**, and a **React** dashboard.

## Screenshots

![Dashboard](screenshots/dashboard.png)


## Architecture

```
POST /api/ingest → FraudRulesEngine → RabbitMQ Fanout Exchange
                                            │
                        ┌───────────────────┼───────────────────┐
                        ▼                   ▼                   ▼
                  search.queue      dashboard.stream.queue   alerts.queue
                        │                   │                   │
                   Elasticsearch        WebSocket           Console Alerts
                   (Audit Trail)        (Live Feed)         (BLOCKED only)
```

## Tech Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| API Server | Dropwizard 4 | REST API + lifecycle management |
| State Store | Aerospike | User profiles, trust scores, velocity tracking |
| Message Broker | RabbitMQ | Fanout exchange decoupling 3 consumers |
| Search/Analytics | Elasticsearch 8 | Audit trail, stats aggregation |
| Frontend | React + Recharts | Real-time dashboard |

## Quick Start

```bash
# 1. Start infrastructure
docker-compose up -d

# 2. Build & run backend
cd backend
mvn clean package
java -jar target/shieldgate-backend-1.0-SNAPSHOT.jar server config.yml

# 3. Start frontend
cd frontend
npm install && npm run dev
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/ingest` | Submit a transaction for fraud evaluation |
| `POST` | `/api/demo/flood?count=100` | Fire demo transactions |
| `GET` | `/api/audit/search?userId=user-1` | Search audit trail |
| `GET` | `/api/audit/latest` | Last 15 evaluated events |
| `GET` | `/api/audit/stats` | Total count + 60s breakdown |
| `GET` | `/admin/healthcheck` | Health of Aerospike, RabbitMQ, ES |
| `WS` | `/ws/transactions` | Live WebSocket event stream |

## Running Tests

```bash
cd backend
mvn test
```
