#!/usr/bin/env bash
set -euo pipefail

COMMS_BASE="${COMMS_BASE:-http://localhost:8090}"
FRAUD_BASE="${FRAUD_BASE:-http://localhost:8080}"

echo "Registering demo recipients..."
curl -s -X POST "${COMMS_BASE}/api/users/register" -H "Content-Type: application/json" \
  -d '{"name":"Priya RiskOps","email":"priya.riskops@shieldgate.demo","password":"pass1234","location":"Mumbai"}' >/dev/null || true
curl -s -X POST "${COMMS_BASE}/api/users/register" -H "Content-Type: application/json" \
  -d '{"name":"Arjun FraudDesk","email":"arjun.fraud@shieldgate.demo","password":"pass1234","location":"Delhi"}' >/dev/null || true

echo "Enabling FLAGGED + BLOCKED alerts for all recipients..."
USERS_JSON="$(curl -s "${COMMS_BASE}/api/users")"
if command -v jq >/dev/null 2>&1; then
  echo "${USERS_JSON}" | jq -c '.[]' | while read -r user; do
    id="$(echo "${user}" | jq -r '.id')"
    curl -s -X PUT "${COMMS_BASE}/api/users/${id}/preferences" -H "Content-Type: application/json" \
      -d '{"notifyBlocked":true,"notifyFlagged":true}' >/dev/null
  done
else
  echo "jq not found; skipping automatic preference update."
fi

echo "Seeding deterministic transaction mix..."
curl -s -X POST "${FRAUD_BASE}/api/ingest" -H "Content-Type: application/json" \
  -d '{"userId":"usr_1","amount":4500,"merchantCategory":"RETAIL","location":"Mumbai","timestamp":1735732800000}' >/dev/null
curl -s -X POST "${FRAUD_BASE}/api/ingest" -H "Content-Type: application/json" \
  -d '{"userId":"usr_1","amount":98000,"merchantCategory":"GAMING","location":"Delhi","timestamp":1735732810000}' >/dev/null
curl -s -X POST "${FRAUD_BASE}/api/ingest" -H "Content-Type: application/json" \
  -d '{"userId":"usr_1","amount":210000,"merchantCategory":"CRYPTO","location":"Delhi","timestamp":1735732820000}' >/dev/null
curl -s -X POST "${FRAUD_BASE}/api/demo/flood?count=20" >/dev/null

echo "Seed complete."
echo "Now open:"
echo "  - Dashboard: recipient delivery metrics + live signal feed"
echo "  - Settings: recent notification delivery status"
