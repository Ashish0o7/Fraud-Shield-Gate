import React, { useState, useEffect } from 'react';
import { Shield, Activity, ShieldAlert, ShieldX, TrendingUp, Search, LogOut, User } from 'lucide-react';
import ControlPanel from './components/ControlPanel';
import LiveAnalytics from './components/LiveAnalytics';
import LiveTicker from './components/LiveTicker';
import RiskDistribution from './components/RiskDistribution';
import AuditSearch from './components/AuditSearch';
import LoginPage from './components/LoginPage';
import './App.css';

const API_BASE = 'http://localhost:8080/api';

function App() {
  const [user, setUser] = useState(null);
  const [tps, setTps] = useState(0);
  const [chartData, setChartData] = useState([]);
  const [latestEvent, setLatestEvent] = useState(null);
  const [stats, setStats] = useState({ totalOverall: 0, recentBreakdown: {} });
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    if (!user) return;
    let prevTotal = 0;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/audit/stats`);
        const data = await res.json();

        setStats(data);

        if (prevTotal > 0) {
          const currentTps = data.totalOverall - prevTotal;
          setTps(Math.max(0, currentTps));

          const now = new Date();
          const timeStr = now.toLocaleTimeString([], { hour12: false, second: '2-digit' });

          const newPoint = {
            time: timeStr,
            Approved: data.recentBreakdown['APPROVED'] || 0,
            Flagged: data.recentBreakdown['FLAGGED'] || 0,
            Blocked: data.recentBreakdown['BLOCKED'] || 0,
          };

          setChartData(curr => {
            const next = [...curr, newPoint];
            if (next.length > 30) next.shift();
            return next;
          });
        }
        prevTotal = data.totalOverall;
      } catch (err) {
        // Backend not running — don't crash the UI
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [user]);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
    setTps(0);
    setChartData([]);
    setLatestEvent(null);
    setStats({ totalOverall: 0, recentBreakdown: {} });
    setShowSearch(false);
  };

  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  const breakdown = stats.recentBreakdown || {};
  const approved = breakdown['APPROVED'] || 0;
  const flagged = breakdown['FLAGGED'] || 0;
  const blocked = breakdown['BLOCKED'] || 0;
  const recentTotal = approved + flagged + blocked;
  const fraudRate = recentTotal > 0 ? (((flagged + blocked) / recentTotal) * 100).toFixed(1) : '0.0';

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8 font-sans">
      {/* ── Header ── */}
      <header className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800/60">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Shield className="w-9 h-9 text-blue-500" />
            <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 pulse-dot" />
          </div>
          <div>
            <h1 className="text-2xl font-bold gradient-text tracking-tight">
              ShieldGate
            </h1>
            <p className="text-[11px] text-slate-500 font-medium tracking-wider uppercase">
              Fraud Detection Command Center
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800/60 border border-slate-700/50 text-slate-300 hover:text-white hover:border-blue-500/50 transition-all text-sm"
          >
            <Search className="w-4 h-4" />
            <span className="hidden sm:inline">Audit Search</span>
          </button>
          <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800/40 border border-slate-700/30">
            <div className="w-2 h-2 rounded-full bg-emerald-500 pulse-dot" />
            <span className="text-xs text-slate-400">System Online</span>
          </div>
          {/* User info + logout */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/40 border border-slate-700/30">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <User className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="hidden sm:block">
              <div className="text-xs text-white font-semibold">{user.username}</div>
              <div className="text-[10px] text-slate-500">{user.role}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Sign out"
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/40 border border-slate-700/30 text-slate-400 hover:text-rose-400 hover:border-rose-500/30 transition-all text-sm"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ── Audit Search Modal ── */}
      {showSearch && (
        <div className="mb-6 fade-in-up">
          <AuditSearch API_BASE={API_BASE} onClose={() => setShowSearch(false)} />
        </div>
      )}

      {/* ── Stat Cards Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={<Activity className="w-5 h-5" />}
          iconColor="text-blue-400"
          label="Total Transactions"
          value={stats.totalOverall?.toLocaleString() || '0'}
          accent="blue"
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5" />}
          iconColor="text-amber-400"
          label="Fraud Rate (60s)"
          value={`${fraudRate}%`}
          accent="amber"
        />
        <StatCard
          icon={<ShieldX className="w-5 h-5" />}
          iconColor="text-rose-400"
          label="Blocked (60s)"
          value={blocked.toLocaleString()}
          accent="rose"
        />
        <StatCard
          icon={<ShieldAlert className="w-5 h-5" />}
          iconColor="text-yellow-400"
          label="Flagged (60s)"
          value={flagged.toLocaleString()}
          accent="yellow"
        />
      </div>

      {/* ── Main Content Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left — Control Panel */}
        <div className="lg:col-span-3 space-y-6">
          <ControlPanel API_BASE={API_BASE} userId={user.userId} onManualTx={(tx) => setLatestEvent(tx)} />
        </div>

        {/* Center — Live Analytics + Risk Distribution */}
        <div className="lg:col-span-6 space-y-6">
          <LiveAnalytics tps={tps} chartData={chartData} />
          <RiskDistribution breakdown={breakdown} />
        </div>

        {/* Right — Live Ticker */}
        <div className="lg:col-span-3">
          <LiveTicker API_BASE={API_BASE} latestEvent={latestEvent} />
        </div>
      </div>

      {/* ── Footer ── */}
      <footer className="mt-8 pt-4 border-t border-slate-800/40 text-center">
        <p className="text-xs text-slate-600">
          ShieldGate v1.0 — Event-Driven Fraud Detection System • Dropwizard • Aerospike • RabbitMQ • Elasticsearch
        </p>
      </footer>
    </div>
  );
}

function StatCard({ icon, iconColor, label, value, accent }) {
  const accentStyles = {
    blue: 'from-blue-500/10 to-transparent border-blue-500/20',
    amber: 'from-amber-500/10 to-transparent border-amber-500/20',
    rose: 'from-rose-500/10 to-transparent border-rose-500/20',
    yellow: 'from-yellow-500/10 to-transparent border-yellow-500/20',
  };

  return (
    <div className={`stat-card bg-gradient-to-br ${accentStyles[accent]} relative overflow-hidden`}>
      <div className="flex items-center gap-2 mb-2">
        <span className={iconColor}>{icon}</span>
        <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-2xl font-extrabold text-white tracking-tight">{value}</div>
    </div>
  );
}

export default App;
