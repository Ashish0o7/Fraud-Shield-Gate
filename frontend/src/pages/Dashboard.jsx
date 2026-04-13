import React, { useEffect, useMemo, useRef, useState } from 'react';
import { API } from '../config/api';

const Dashboard = () => {
  const [stats, setStats] = useState({ totalOverall: 0, recentBreakdown: {} });
  const [signals, setSignals] = useState([]);
  const [latestNotifications, setLatestNotifications] = useState([]);
  const [showAlertsPanel, setShowAlertsPanel] = useState(false);
  const alertsPanelRef = useRef(null);
  const [query, setQuery] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`${API.audit}/stats`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setStats(data);
        setError(null);
      } catch {
        setError('Unable to load dashboard stats from fraud service.');
      }
    };

    const fetchSignals = async () => {
      try {
        const res = await fetch(`${API.audit}/latest`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setSignals(data);
        setError(null);
      } catch {
        setError('Unable to load latest signal stream.');
      }
    };

    const fetchNotifications = async () => {
      try {
        const res = await fetch(`${API.notifications}/latest`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setLatestNotifications(data.notifications || []);
      } catch {
        setLatestNotifications([]);
      }
    };

    fetchStats();
    fetchSignals();
    fetchNotifications();
    
    const statsInterval = setInterval(fetchStats, 5000);
    const signalInterval = setInterval(fetchSignals, 5000);
    const notificationInterval = setInterval(fetchNotifications, 10000);
    
    return () => {
      clearInterval(statsInterval);
      clearInterval(signalInterval);
      clearInterval(notificationInterval);
    };
  }, []);

  const breakdown = stats.recentBreakdown || {};
  const clean = breakdown.APPROVED ?? breakdown.approved ?? 0;
  const blocked = breakdown.BLOCKED ?? breakdown.blocked ?? 0;
  const flagged = breakdown.FLAGGED ?? breakdown.flagged ?? 0;
  const totalAnalyzed = stats.totalOverall || 0;
  const fraud = blocked + flagged;
  const totalRecent = clean + fraud;
  const fraudRate = totalRecent === 0 ? "0.00%" : ((fraud / totalRecent) * 100).toFixed(2) + "%";
  const alertsSent = fraud || 0;
  const cleanRate = totalRecent === 0 ? '0.00%' : ((clean / totalRecent) * 100).toFixed(2) + '%';
  const filteredSignals = signals.filter((s) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      String(s.transactionId || '').toLowerCase().includes(q) ||
      String(s.userId || '').toLowerCase().includes(q) ||
      String(s.location || '').toLowerCase().includes(q) ||
      String(s.status || '').toLowerCase().includes(q)
    );
  });
  const CITY_COORDS = {
    mumbai: { lat: 19.076, lng: 72.8777 },
    delhi: { lat: 28.6139, lng: 77.209 },
    bangalore: { lat: 12.9716, lng: 77.5946 },
    bengaluru: { lat: 12.9716, lng: 77.5946 },
    chennai: { lat: 13.0827, lng: 80.2707 },
    kolkata: { lat: 22.5726, lng: 88.3639 },
    hyderabad: { lat: 17.385, lng: 78.4867 },
    pune: { lat: 18.5204, lng: 73.8567 },
    ahmedabad: { lat: 23.0225, lng: 72.5714 },
  };
  const hotspotData = useMemo(() => {
    const counts = {};
    signals.forEach((s) => {
      const key = String(s.location || '').toLowerCase();
      if (!key || !CITY_COORDS[key]) return;
      counts[key] = (counts[key] || 0) + 1;
    });
    const entries = Object.entries(counts)
      .map(([cityKey, count]) => ({ cityKey, city: cityKey[0].toUpperCase() + cityKey.slice(1), count, ...CITY_COORDS[cityKey] }))
      .sort((a, b) => b.count - a.count);
    return entries;
  }, [signals]);
  const maxHotspot = hotspotData[0]?.count || 1;

  useEffect(() => {
    if (!showAlertsPanel) return undefined;
    const onEscape = (e) => {
      if (e.key === 'Escape') setShowAlertsPanel(false);
    };
    const onClickOutside = (e) => {
      if (alertsPanelRef.current && !alertsPanelRef.current.contains(e.target)) {
        setShowAlertsPanel(false);
      }
    };
    window.addEventListener('keydown', onEscape);
    window.addEventListener('mousedown', onClickOutside);
    return () => {
      window.removeEventListener('keydown', onEscape);
      window.removeEventListener('mousedown', onClickOutside);
    };
  }, [showAlertsPanel]);

  return (
    <div className="ml-64 min-h-screen bg-surface">
      <header className="flex justify-between items-center w-full px-8 py-3 h-16 bg-surface-bright sticky top-0 z-10 border-b border-surface-container-low font-headline antialiased tracking-tight">
        <div className="flex items-center gap-4">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-tertiary text-sm">search</span>
            <input 
              className="bg-surface-container-low border-none rounded-md pl-10 pr-4 py-1.5 text-sm w-64 focus:ring-1 focus:ring-primary/20 transition-all font-body font-normal" 
              placeholder="Search signals, IPs, or users..." 
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4">
             <span className="material-symbols-outlined text-tertiary hover:bg-surface-container-highest p-2 rounded cursor-pointer transition-colors border-none bg-transparent">sensors</span>
             <button
               type="button"
               onClick={() => setShowAlertsPanel((v) => !v)}
               className="material-symbols-outlined text-tertiary hover:bg-surface-container-highest p-2 rounded cursor-pointer transition-colors border-none bg-transparent"
             >
               notifications
             </button>
             <div className="h-8 w-8 rounded-full bg-surface-container-highest flex items-center justify-center overflow-hidden border border-outline-variant/20">
               <span className="material-symbols-outlined text-tertiary">account_circle</span>
             </div>
          </div>
        </div>
      </header>
      
      <div className="p-8 max-w-7xl mx-auto space-y-8 font-body">
        <section className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-on-surface font-headline">Live Analytics</h2>
            <p className="text-tertiary font-label text-xs uppercase tracking-widest mt-1">Real-time threat intelligence pipeline</p>
          </div>
          <div className="flex items-center gap-2 bg-surface-container-lowest px-3 py-1.5 rounded-lg shadow-[0px_12px_32px_rgba(27,27,27,0.04)] border border-outline-variant/10">
            <div className="h-2 w-2 rounded-full bg-secondary animate-pulse"></div>
            <span className="font-label text-[10px] font-bold text-secondary uppercase">Engine Active</span>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-4 gap-6">
           {/* Metric Cards */}
           <MetricCard title="Total Analyzed" value={totalAnalyzed.toLocaleString()} delta="all time" primary />
           <MetricCard title="Fraud Rate (recent)" value={fraudRate} delta={`${fraud} / ${totalRecent || 0}`} secondary />
           <MetricCard title="Alerts Sent (recent)" value={alertsSent.toLocaleString()} delta="BLOCKED + FLAGGED" />
           <MetricCard title="Clean Rate (recent)" value={cleanRate} delta={`${clean} approved`} primary />
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <section className="lg:col-span-2 space-y-6">
            <div className="bg-surface-container-lowest p-8 rounded-xl shadow-[0px_12px_32px_rgba(27,27,27,0.04)] border border-outline-variant/5 h-full min-h-[400px] flex flex-col">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h3 className="text-lg font-bold tracking-tight font-headline">Decision Breakdown (last minute)</h3>
                </div>
              </div>
              <div className="space-y-4">
                {totalRecent === 0 ? (
                  <div className="text-sm text-tertiary bg-surface-container-low p-4 rounded-lg">
                    No decisions in the last minute yet.
                  </div>
                ) : (
                  <>
                    <DecisionGraph clean={clean} flagged={flagged} blocked={blocked} total={totalRecent} />
                    <StatusBar label="APPROVED" value={clean} total={totalRecent} color="bg-[#34c97b]" />
                    <StatusBar label="FLAGGED" value={flagged} total={totalRecent} color="bg-amber-400" />
                    <StatusBar label="BLOCKED" value={blocked} total={totalRecent} color="bg-error" />
                  </>
                )}
                {error && (
                  <div className="text-xs text-error bg-error-container/40 border border-error/20 rounded-lg p-3">
                    {error}
                  </div>
                )}
              </div>
              <div className="mt-auto pt-4 border-t border-outline-variant/10 text-[11px] text-tertiary">
                Recent window total: <span className="font-bold text-on-surface">{totalRecent}</span>
              </div>
            </div>
          </section>
          
          <aside className="space-y-6">
            <div className="bg-surface-container-lowest p-6 rounded-xl shadow-[0px_12px_32px_rgba(27,27,27,0.04)] border border-outline-variant/5">
              <h3 className="text-sm font-black tracking-tight uppercase font-headline mb-4">India Fraud Hotspots</h3>
              {hotspotData.length === 0 ? (
                <div className="text-xs text-tertiary">Waiting for location data to render heat map.</div>
              ) : (
                <div className="space-y-3">
                  {hotspotData.slice(0, 5).map((h) => (
                    <div key={h.cityKey} className="p-3 bg-surface-container-low rounded-lg">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span>{h.city}</span>
                        <span>{h.count}</span>
                      </div>
                      <div className="h-1.5 bg-surface-container-high rounded-full overflow-hidden mt-2">
                        <div className="h-full bg-secondary" style={{ width: `${Math.max(12, Math.round((h.count / maxHotspot) * 100))}%` }} />
                      </div>
                      <p className="text-[10px] mt-1 text-tertiary">
                        Lat {h.lat.toFixed(2)} / Lng {h.lng.toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="bg-surface-container-lowest p-6 rounded-xl shadow-[0px_12px_32px_rgba(27,27,27,0.04)] border border-outline-variant/5 flex flex-col h-full max-h-[400px]">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-black tracking-tight uppercase font-headline">Signal Stream</h3>
                <span className="material-symbols-outlined text-secondary animate-pulse text-sm">radio</span>
              </div>
              <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
                {filteredSignals.length === 0 ? (
                    <div className="text-xs text-tertiary">Waiting for signals...</div>
                ) : (
                  filteredSignals.map((s, idx) => (
                    <SignalRow
                      key={s.transactionId || s.id || `${s.userId || 'signal'}-${s.timestamp || idx}-${idx}`}
                      event={s}
                    />
                  ))
                )}
              </div>
              <div className="mt-4 text-[10px] font-label text-tertiary uppercase tracking-widest text-center">
                Live auto-refresh every 5s
              </div>
            </div>
          </aside>
        </div>
      </div>
      {showAlertsPanel && (
        <div ref={alertsPanelRef} className="fixed top-20 right-8 w-[360px] max-h-[70vh] overflow-y-auto bg-surface-container-lowest border border-outline-variant/10 rounded-xl shadow-2xl p-4 z-20">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-bold font-headline">Recent Alerts</h4>
            <button type="button" onClick={() => setShowAlertsPanel(false)} className="text-xs text-tertiary bg-transparent border-none cursor-pointer">Close</button>
          </div>
          {latestNotifications.length === 0 ? (
            <p className="text-xs text-tertiary">No alerts available yet.</p>
          ) : (
            <div className="space-y-2">
              {latestNotifications.slice(0, 10).map((n) => (
                <div key={n.id} className="p-3 bg-surface-container-low rounded-lg">
                  <p className="text-xs font-bold">{n.transactionId}</p>
                  <p className="text-[10px] text-tertiary mt-1">{n.status} · {n.deliveryStatus || 'PENDING'}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const DecisionGraph = ({ clean, flagged, blocked, total }) => {
  const data = [
    { label: 'APPROVED', value: clean, color: 'bg-[#34c97b]' },
    { label: 'FLAGGED', value: flagged, color: 'bg-amber-400' },
    { label: 'BLOCKED', value: blocked, color: 'bg-error' },
  ];
  return (
    <div className="h-40 p-3 bg-surface-container-low rounded-lg flex items-end justify-between gap-3">
      {data.map((d) => {
        const pct = total === 0 ? 0 : Math.round((d.value / total) * 100);
        return (
          <div key={d.label} className="flex-1 flex flex-col items-center gap-2">
            <div className="text-[10px] font-bold text-tertiary">{d.value}</div>
            <div className="w-full h-24 bg-surface-container-high rounded-md relative overflow-hidden">
              <div className={`absolute bottom-0 left-0 right-0 ${d.color}`} style={{ height: `${Math.max(6, pct)}%` }} />
            </div>
            <div className="text-[10px] font-label text-tertiary">{d.label}</div>
          </div>
        );
      })}
    </div>
  );
};

const StatusBar = ({ label, value, total, color }) => {
  const pct = total === 0 ? 0 : Math.round((value / total) * 100);
  return (
    <div>
      <div className="flex justify-between text-xs font-label text-tertiary mb-1">
        <span>{label}</span>
        <span>{value} ({pct}%)</span>
      </div>
      <div className="h-2 rounded-full bg-surface-container-low overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

const SignalScore = ({ event }) => {
  if (event.anomalyScore != null) return event.anomalyScore.toFixed(3);
  if (event.riskScore != null) return `${event.riskScore}/100`;
  return '0';
};

const SignalRow = ({ event }) => {
  const isFraud = event.status === "BLOCKED" || event.status === "FLAGGED";
  const ref = "SG-" + (event.transactionId?.substring(0, 5).toUpperCase() || "UNK");
  const time = new Date(event.timestamp).toLocaleTimeString([], { hour12: false });
  return (
    <div className="flex gap-3 pb-3 border-b border-surface-container-low transition-colors hover:bg-surface-container">
      <div className="text-[10px] font-label text-tertiary mt-0.5">{time}</div>
      <div>
        <p className={`text-xs font-bold leading-tight ${isFraud ? 'text-error' : 'text-on-surface'}`}>{event.riskReason || "Clean Transaction"}</p>
        <p className={`text-[10px] font-label uppercase mt-1 ${isFraud ? 'text-secondary font-bold' : 'text-tertiary'}`}>
          Ref: {ref} • Score: <SignalScore event={event} />
        </p>
      </div>
    </div>
  );
};

const MetricCard = ({ title, value, delta, primary, secondary }) => (
  <div className="bg-surface-container-lowest p-6 rounded-xl shadow-[0px_12px_32px_rgba(27,27,27,0.04)] border border-outline-variant/5">
    <p className="font-label text-[10px] uppercase tracking-wider text-tertiary font-bold mb-2">{title}</p>
    <div className="flex items-baseline gap-2">
      <span className="text-2xl font-black tracking-tighter">{value}</span>
      <span className={`text-xs font-bold ${primary ? 'text-primary' : secondary ? 'text-secondary' : 'text-tertiary'}`}>{delta}</span>
    </div>
  </div>
);

export default Dashboard;
