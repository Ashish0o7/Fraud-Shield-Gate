# ShieldGate — Event-Driven Fraud Detection System

A real-time fraud detection pipeline built with **Dropwizard**, **Aerospike**, **RabbitMQ**, **Elasticsearch**, and a **React** dashboard.

## Screenshots

![Dashboard](screenshots/dashboard.png)


## Architecture

```
POST /api/ingest → FraudRulesEngine → ML Scoring Service → RabbitMQ Fanout Exchange
                                                                │
                            ┌───────────────────┬───────────────┼───────────────────┐
                            ▼                   ▼               ▼                   ▼
                      search.queue      dashboard.stream    alerts.queue     notifications.queue
                            │                   │               │                   │
                       Elasticsearch        WebSocket       Console Alerts   Alerting Service (Email/SMS)
                       (Audit Trail)        (Live Feed)     (BLOCKED only)          │
                                                                                    ▼
                                                                           Alerting Frontend
```

## Tech Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| API Server | Dropwizard 4 | REST API + lifecycle management |
| State Store | Aerospike | User profiles, trust scores, velocity tracking |
| Message Broker | RabbitMQ | Fanout exchange decoupling 4 consumers |
| Search/Analytics | Elasticsearch 8 | Audit trail, stats aggregation |
| ML Scoring | Python (FastAPI/Scikit) | AI-powered anomaly detection |
| Alerting Service | Dropwizard 4 | Notification delivery and proxy |
| Dashboards | React + Recharts | Real-time monitoring & user portals |

## Quick Start

```bash
# 1. Start infrastructure
docker-compose up -d

# 2. Start ML Scoring Service
cd ml-scoring-service
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload

# 3. Build & run core backend
cd backend
mvn clean package
java -jar target/shieldgate-backend-1.0-SNAPSHOT.jar server config.yml

# 4. Build & run alerting service
cd alerting-service
mvn clean package
java -jar target/alerting-service-1.0-SNAPSHOT.jar server config.yml

# 5. Start frontends (Dashboard & Alerting)
# Terminal 1:
cd frontend
npm install && npm run dev
# Terminal 2:
cd alerting-frontend
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
