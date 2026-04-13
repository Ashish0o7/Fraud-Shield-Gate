import React, { useEffect, useState } from 'react';
import { API } from '../config/api';

const MLModels = () => {
  const [mlHealth, setMlHealth] = useState(null);
  const [mlError, setMlError] = useState('');
  const [stats, setStats] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchAll = async () => {
    try {
      const res = await fetch(`${API.mlBase}/health`);
      if (!res.ok) throw new Error('non-200');
      const data = await res.json();
      setMlHealth(data);
      setMlError('');
    } catch (e) {
      setMlError(e?.message || 'network/CORS error');
      setMlHealth(null);
    }
    try {
      const res2 = await fetch(`${API.audit}/stats`);
      const data2 = await res2.json();
      setStats(data2);
    } catch { /* ignore */ }
    setLastUpdated(new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }));
  };

  useEffect(() => {
    fetchAll();
    const id = setInterval(fetchAll, 8000);
    return () => clearInterval(id);
  }, []);

  const isUp = !mlError && (mlHealth?.status === 'healthy' || mlHealth?.healthy === true);
  const modelName = mlHealth?.model || 'IsolationForest';
  const defaultFeatures = ['amount', 'merchantCategory', 'location', 'trustScore', 'txCountLast10Mins'];
  const features = Array.isArray(mlHealth?.features)
    ? mlHealth.features
    : Array.isArray(mlHealth?.feature_names)
      ? mlHealth.feature_names
      : defaultFeatures;
  const trainedRows = mlHealth?.trained_on || '10,000 synthetic transactions';

  const total = stats?.totalOverall || 0;
  const breakdown = stats?.recentBreakdown || {};
  const blocked = breakdown['BLOCKED'] || 0;
  const flagged = breakdown['FLAGGED'] || 0;
  const approved = breakdown['APPROVED'] || 0;
  const recentTotal = blocked + flagged + approved;
  const fraudPct = recentTotal === 0 ? 'N/A' : ((( blocked + flagged) / recentTotal) * 100).toFixed(1) + '%';

  return (
    <div className="ml-64 min-h-screen bg-surface font-body text-on-surface antialiased">
      <header className="sticky top-0 z-10 bg-surface-bright border-b border-surface-container-low px-8 py-5 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-headline font-extrabold tracking-tight">ML Models</h2>
          <p className="text-tertiary text-xs mt-1 font-label">Isolation Forest anomaly detection pipeline</p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && <span className="text-[10px] font-label text-tertiary">Updated {lastUpdated} IST</span>}
          <button
            onClick={fetchAll}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg text-xs font-bold font-label hover:opacity-90 transition-opacity border-none cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">refresh</span>
            Refresh
          </button>
        </div>
      </header>

      <div className="p-8 max-w-5xl mx-auto space-y-8">
        {/* Service Status */}
        <div className={`rounded-xl border p-6 flex items-center justify-between ${isUp ? 'bg-[#e6f9f0] border-[#34c97b]/30' : 'bg-error-container/30 border-error/20'}`}>
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isUp ? 'bg-[#34c97b]/20' : 'bg-error/10'}`}>
              <span className={`material-symbols-outlined text-2xl ${isUp ? 'text-[#34c97b]' : 'text-error'}`}>
                {isUp ? 'smart_toy' : 'error'}
              </span>
            </div>
            <div>
              <p className="font-headline font-bold text-lg">{isUp ? 'ML Scoring Service — Online' : 'ML Scoring Service — Offline'}</p>
              <p className="text-xs text-tertiary font-label mt-0.5">{API.mlBase}/scores/predict</p>
              {!isUp && mlError && (
                <p className="text-[11px] text-error font-label mt-1">Detail: {mlError}</p>
              )}
            </div>
          </div>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-label font-bold text-xs uppercase tracking-widest ${isUp ? 'bg-[#34c97b]/20 text-[#1a7a46]' : 'bg-error-container text-error'}`}>
            <div className={`w-2 h-2 rounded-full ${isUp ? 'bg-[#34c97b] animate-pulse' : 'bg-error'}`} />
            {isUp ? 'Healthy' : 'Unreachable'}
          </div>
        </div>

        {/* Two-column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Model Info */}
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/5 shadow-[0px_8px_24px_rgba(27,27,27,0.04)] p-6">
            <h3 className="font-headline font-bold text-sm uppercase tracking-widest text-tertiary mb-6">Model Specification</h3>
            <div className="space-y-4">
              <InfoRow icon="model_training" label="Algorithm" value={modelName} />
              <InfoRow icon="dataset" label="Training Data" value={trainedRows} />
              <InfoRow icon="tune" label="Contamination" value={mlHealth?.contamination ?? '0.15 (15%)'} />
              <InfoRow icon="layers" label="N Estimators" value={mlHealth?.n_estimators ?? '100 trees'} />
              <InfoRow icon="schedule" label="Framework" value="scikit-learn + FastAPI" />
            </div>
          </div>

          {/* Feature Inputs */}
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/5 shadow-[0px_8px_24px_rgba(27,27,27,0.04)] p-6">
            <h3 className="font-headline font-bold text-sm uppercase tracking-widest text-tertiary mb-6">Feature Inputs</h3>
            <div className="space-y-3">
              {features.map((f, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-surface-container-low rounded-lg">
                  <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center">
                    <span className="text-primary text-xs font-bold font-label">{i + 1}</span>
                  </div>
                  <span className="text-sm font-medium font-label">{f}</span>
                  <span className="ml-auto text-[10px] font-label uppercase tracking-widest text-tertiary">numeric</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Circuit Breaker Status */}
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/5 shadow-[0px_8px_24px_rgba(27,27,27,0.04)] p-6">
          <h3 className="font-headline font-bold text-sm uppercase tracking-widest text-tertiary mb-6">Circuit Breaker — ML Service Guard</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <CircuitCard title="State" value={isUp ? 'CLOSED' : 'OPEN'} icon={isUp ? 'lock' : 'lock_open'} good={isUp} desc={isUp ? 'Requests flowing to ML' : 'Fallback rules active'} />
            <CircuitCard title="Trip Threshold" value="5 failures" icon="warning" good desc="Opens after 5 consecutive errors" />
            <CircuitCard title="Recovery Probe" value="30 seconds" icon="timer" good desc="Auto half-open after 30s to retry" />
          </div>
          <div className="mt-4 p-4 bg-surface-container-low rounded-xl text-xs text-tertiary font-label leading-relaxed">
            <strong className="text-on-surface font-bold">Fallback behaviour:</strong> When the circuit is OPEN, the fraud engine uses deterministic rule-based scoring (BLOCKED if amount &gt; ₹1,00,000). This ensures <strong className="text-on-surface">zero transaction drops</strong> even when the ML service is unavailable.
          </div>
        </div>

        {/* Live Stats */}
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/5 shadow-[0px_8px_24px_rgba(27,27,27,0.04)] p-6">
          <h3 className="font-headline font-bold text-sm uppercase tracking-widest text-tertiary mb-6">Live Pipeline Metrics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total Scored" value={total.toLocaleString('en-IN')} />
            <StatCard label="Recent Fraud %" value={fraudPct} warn />
            <StatCard label="BLOCKED (60s)" value={blocked.toLocaleString('en-IN')} />
            <StatCard label="APPROVED (60s)" value={approved.toLocaleString('en-IN')} />
          </div>
        </div>
      </div>
    </div>
  );
};

const InfoRow = ({ icon, label, value }) => (
  <div className="flex items-start gap-3">
    <span className="material-symbols-outlined text-primary/70 text-base mt-0.5">{icon}</span>
    <div className="flex-1 flex justify-between items-start">
      <span className="text-xs text-tertiary font-label">{label}</span>
      <span className="text-sm font-bold text-on-surface font-label text-right max-w-[55%]">{String(value)}</span>
    </div>
  </div>
);

const CircuitCard = ({ title, value, icon, good, desc }) => (
  <div className="p-4 bg-surface-container-low rounded-xl">
    <div className="flex items-center gap-2 mb-2">
      <span className={`material-symbols-outlined text-base ${good ? 'text-primary' : 'text-error'}`}>{icon}</span>
      <span className="text-[10px] font-label uppercase tracking-widest text-tertiary">{title}</span>
    </div>
    <p className={`text-xl font-black font-headline ${good ? 'text-on-surface' : 'text-error'}`}>{value}</p>
    <p className="text-[10px] text-tertiary font-label mt-1 leading-relaxed">{desc}</p>
  </div>
);

const StatCard = ({ label, value, warn }) => (
  <div className="p-4 bg-surface-container-low rounded-xl text-center">
    <p className="text-[10px] font-label uppercase tracking-widest text-tertiary mb-2">{label}</p>
    <p className={`text-2xl font-black font-headline ${warn ? 'text-secondary' : 'text-on-surface'}`}>{value}</p>
  </div>
);

export default MLModels;
