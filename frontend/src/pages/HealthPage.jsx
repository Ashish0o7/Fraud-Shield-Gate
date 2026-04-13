import React, { useEffect, useState, useCallback } from 'react';
import { API } from '../config/api';

const SERVICES = [
  {
    id: 'fraud',
    name: 'Fraud Detection Service',
    description: 'Core fraud evaluation engine — Dropwizard',
    url: `${API.audit}/stats`,
    port: '8080',
    adminPort: null,
    icon: 'security',
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
  {
    id: 'comms',
    name: 'Communications Service',
    description: 'Alert dispatch & user management — Dropwizard',
    url: `${API.users}`,
    port: '8090',
    adminPort: null,
    icon: 'notifications_active',
    color: 'text-secondary',
    bgColor: 'bg-secondary/10',
  },
  {
    id: 'ml',
    name: 'ML Scoring Service',
    description: 'Isolation Forest model — FastAPI Python',
    url: `${API.mlBase}/health`,
    port: '8000',
    adminPort: null,
    icon: 'smart_toy',
    color: 'text-[#7c3aed]',
    bgColor: 'bg-[#7c3aed]/10',
  },
];

const HealthPage = () => {
  const [statuses, setStatuses] = useState({});
  const [checking, setChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState(null);
  const fetchWithTimeout = async (url, timeoutMs = 3000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { signal: controller.signal });
    } finally {
      clearTimeout(id);
    }
  };

  const parseHealth = (svc, res, body) => {
    if (!res.ok) return { up: false, detail: `HTTP ${res.status}` };
    if (svc.id === 'fraud') {
      const up = typeof body?.totalOverall === 'number';
      return { up, detail: up ? 'audit endpoint reachable' : 'invalid stats payload' };
    }
    if (svc.id === 'comms') {
      const up = Array.isArray(body);
      return { up, detail: up ? 'users endpoint reachable' : 'invalid users payload' };
    }
    if (svc.id === 'ml') {
      const up = body?.status === 'healthy' || body?.healthy === true;
      return { up, detail: up ? 'healthy' : 'degraded' };
    }
    const checks = body && typeof body === 'object' ? Object.values(body) : [];
    if (checks.length === 0) return { up: true, detail: 'healthy' };
    const allHealthy = checks.every((v) => v?.healthy !== false);
    const detail = Object.entries(body).map(([k, v]) => `${k}: ${v?.healthy ? '✓' : '✗'}`).join(' | ');
    return { up: allHealthy, detail };
  };

  const checkAll = useCallback(async () => {
    setChecking(true);
    const results = {};
    await Promise.all(
      SERVICES.map(async (svc) => {
        const t0 = Date.now();
        try {
          const res = await fetchWithTimeout(svc.url, 3000);
          const latency = Date.now() - t0;
          let health = { up: res.ok, detail: '' };
          try {
            const json = await res.json();
            health = parseHealth(svc, res, json);
          } catch { /* ignore */ }
          results[svc.id] = { up: health.up, latency, detail: health.detail, code: res.status };
        } catch (e) {
          const isTimeout = e.name === 'AbortError' || e.name === 'TimeoutError';
          const detail = isTimeout ? 'Timed out (3s)' : `Request failed (${e.message || 'network/CORS error'})`;
          results[svc.id] = { up: false, latency: null, detail, code: null };
        }
      })
    );
    setStatuses(results);
    setChecking(false);
    setLastChecked(new Date());
  }, []);

  useEffect(() => {
    const initialRun = setTimeout(() => {
      checkAll();
    }, 0);
    const id = setInterval(checkAll, 10000);
    return () => {
      clearTimeout(initialRun);
      clearInterval(id);
    };
  }, [checkAll]);

  const allUp = SERVICES.every(s => statuses[s.id]?.up);
  const anyUp = SERVICES.some(s => statuses[s.id]?.up);
  const upCount = SERVICES.filter(s => statuses[s.id]?.up).length;

  const systemStatus = allUp ? 'All Systems Operational' : anyUp ? 'Partial Degradation' : 'System Offline';
  const statusColor = allUp ? 'text-[#1a7a46]' : anyUp ? 'text-[#b45309]' : 'text-error';
  const statusBg = allUp ? 'bg-[#e6f9f0] border-[#34c97b]/30' : anyUp ? 'bg-amber-50 border-amber-300/30' : 'bg-error-container/30 border-error/20';

  return (
    <div className="ml-64 min-h-screen bg-surface font-body text-on-surface antialiased">
      <header className="sticky top-0 z-10 bg-surface-bright border-b border-surface-container-low px-8 py-5 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-headline font-extrabold tracking-tight">System Health</h2>
          <p className="text-tertiary text-xs mt-1 font-label">Live status of all ShieldGate microservices</p>
        </div>
        <button
          onClick={checkAll}
          disabled={checking}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg text-xs font-bold font-label hover:opacity-90 transition-opacity border-none cursor-pointer disabled:opacity-60"
        >
          <span className={`material-symbols-outlined text-sm ${checking ? 'animate-spin' : ''}`}>refresh</span>
          {checking ? 'Checking...' : 'Check Now'}
        </button>
      </header>

      <div className="p-8 max-w-4xl mx-auto space-y-6">
        {/* Overall Status Banner */}
        <div className={`rounded-xl border p-6 ${statusBg}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-4 h-4 rounded-full ${allUp ? 'bg-[#34c97b] animate-pulse' : anyUp ? 'bg-amber-400 animate-pulse' : 'bg-error'}`} />
              <div>
                <p className={`text-xl font-headline font-black ${statusColor}`}>{systemStatus}</p>
                <p className="text-xs text-tertiary font-label mt-0.5">
                  {upCount} of {SERVICES.length} services online
                  {lastChecked && ` · Last checked ${lastChecked.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })} IST`}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black font-headline text-on-surface">{Math.round((upCount / SERVICES.length) * 100)}%</p>
              <p className="text-[10px] font-label uppercase tracking-widest text-tertiary">Availability</p>
            </div>
          </div>
        </div>

        {/* Service Cards */}
        <div className="space-y-4">
          {SERVICES.map(svc => {
            const s = statuses[svc.id];
            const up = s?.up;
            const loaded = s !== undefined;
            return (
              <div key={svc.id} className="bg-surface-container-lowest rounded-xl border border-outline-variant/5 shadow-[0px_8px_24px_rgba(27,27,27,0.04)] p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${svc.bgColor}`}>
                      <span className={`material-symbols-outlined text-xl ${svc.color}`}>{svc.icon}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="font-headline font-bold text-base">{svc.name}</h3>
                        {loaded && (
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-label font-bold uppercase tracking-widest ${up ? 'bg-[#e6f9f0] text-[#1a7a46]' : 'bg-error-container text-error'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${up ? 'bg-[#34c97b] animate-pulse' : 'bg-error'}`} />
                            {up ? 'UP' : 'DOWN'}
                          </span>
                        )}
                        {!loaded && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-label font-bold uppercase tracking-widest bg-surface-container-low text-tertiary">
                            <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse" />
                            Checking...
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-tertiary font-label mt-0.5">{svc.description}</p>
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    {s?.latency != null && (
                      <p className="text-sm font-bold font-label text-on-surface">{s.latency}ms</p>
                    )}
                    {s?.code && <p className="text-[10px] font-label text-tertiary uppercase">HTTP {s.code}</p>}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
                  <HealthDetail label="App Port" value={`:${svc.port}`} />
                  {svc.adminPort && <HealthDetail label="Admin Port" value={`:${svc.adminPort}`} />}
                  <HealthDetail label="Check URL" value={svc.url} mono />
                  {s?.detail && <HealthDetail label="Detail" value={s.detail} full />}
                </div>
              </div>
            );
          })}
        </div>

        {/* Infrastructure note */}
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/5 p-6">
          <h3 className="font-headline font-bold text-sm uppercase tracking-widest text-tertiary mb-4">Infrastructure Dependencies</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { name: 'RabbitMQ', port: '5672', icon: 'hub' },
              { name: 'Elasticsearch', port: '9200', icon: 'manage_search' },
              { name: 'Aerospike', port: '3000', icon: 'storage' },
              { name: 'PostgreSQL', port: '5433', icon: 'database' },
            ].map(inf => (
              <div key={inf.name} className="p-3 bg-surface-container-low rounded-lg">
                <span className="material-symbols-outlined text-tertiary text-base">{inf.icon}</span>
                <p className="text-xs font-bold font-label mt-1">{inf.name}</p>
                <p className="text-[10px] text-tertiary font-label">:{inf.port}</p>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-tertiary font-label mt-3">Infrastructure services managed by Docker Compose. Run <code className="bg-surface-container-low px-1 py-0.5 rounded font-mono">docker-compose up</code> to start all dependencies.</p>
        </div>
      </div>
    </div>
  );
};

const HealthDetail = ({ label, value, mono, full }) => (
  <div className={`p-3 bg-surface-container-low rounded-lg ${full ? 'col-span-2' : ''}`}>
    <p className="text-[10px] font-label uppercase tracking-widest text-tertiary mb-1">{label}</p>
    <p className={`text-xs font-bold truncate ${mono ? 'font-mono' : 'font-label'}`}>{value}</p>
  </div>
);

export default HealthPage;
