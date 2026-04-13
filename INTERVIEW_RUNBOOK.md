# ShieldGate Interview Demo Runbook

## 1) Start stack

```bash
docker-compose up -d
```

Start application services if not run by compose:

```bash
cd fraud-detection-service && mvn clean package && java -jar target/fraud-detection-service-1.0-SNAPSHOT.jar server config.yml
cd communications-service && mvn clean package && java -jar target/communications-service-1.0-SNAPSHOT.jar server config.yml
cd frontend && npm install && npm run dev
```

## 2) Optional: enable real email delivery (SMTP)

Edit `communications-service/config.yml`:

```yaml
email:
  demoMode: false
  sender: "alerts@your-domain.com"
  smtpHost: "smtp.your-provider.com"
  smtpPort: 587
  username: "smtp-user"
  password: "smtp-password"
  startTls: true
  ssl: false
```

If `demoMode: true`, notifications are still persisted with delivery status and shown in UI as simulated deliveries.

## 3) Seed a realistic scenario

```bash
./scripts/seed_demo.sh
```

This script:
- registers demo recipients
- enables recipient preferences
- ingests deterministic transactions plus a small flood batch

## 4) What to show in interview

- **Dashboard**
  - Decision breakdown uses live `/api/audit/stats`
  - Live signal stream from `/api/audit/latest`
  - New **Alert Delivery (24h)** panel from `/api/notifications/metrics/recipients`
- **Settings**
  - Recipient preferences
  - New **Recent Delivery Status** list with `DELIVERED/FAILED/PENDING`
- **Resilience**
  - If ML service is down, fallback scoring still classifies transactions using multiple signals
  - Notifications continue, with persisted delivery outcomes

## 5) Useful debug endpoints

- `GET /api/notifications/latest`
- `GET /api/notifications/metrics/recipients?hours=24`
- `GET /api/audit/stats`
- `GET /api/audit/latest`
