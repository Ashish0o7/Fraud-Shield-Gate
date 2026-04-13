const GATEWAY_BASE = import.meta.env.VITE_API_GATEWAY_BASE || 'http://localhost:8088';
const FRAUD_BASE = import.meta.env.VITE_FRAUD_API_BASE || GATEWAY_BASE;
const COMMS_BASE = import.meta.env.VITE_COMMS_API_BASE || GATEWAY_BASE;
const ML_BASE = import.meta.env.VITE_ML_API_BASE || `${GATEWAY_BASE}/ml`;
const WS_BASE =
  import.meta.env.VITE_WS_BASE ||
  GATEWAY_BASE.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:');

export const API = {
  gatewayBase: GATEWAY_BASE,
  fraudBase: FRAUD_BASE,
  commsBase: COMMS_BASE,
  mlBase: ML_BASE,
  audit: `${FRAUD_BASE}/api/audit`,
  ingest: `${FRAUD_BASE}/api/ingest`,
  users: `${COMMS_BASE}/api/users`,
  notifications: `${COMMS_BASE}/api/notifications`,
  transactionsWs: `${WS_BASE}/ws/transactions`,
};
