import React, { useState, useEffect } from 'react';
import {
  Shield, Bell, LogIn, UserPlus, Send, Settings,
  AlertTriangle, ShieldX, ShieldAlert, CheckCircle, XCircle,
  RefreshCw, Eye, EyeOff, Lock, Mail, User, CreditCard,
  MapPin, Tag, Clock, TrendingUp, Activity, LogOut, Copy, Check
} from 'lucide-react';
import './index.css';

const API = 'http://localhost:8090/api';

/* ─── Helpers ─── */
const fmt = (n) => Number(n)?.toLocaleString('en-IN', { maximumFractionDigits: 0 });

function StatusPill({ status }) {
  const icons = {
    APPROVED: <CheckCircle className="w-3 h-3" />,
    FLAGGED: <AlertTriangle className="w-3 h-3" />,
    BLOCKED: <ShieldX className="w-3 h-3" />,
  };
  return (
    <span className={`status-pill ${status}`}>
      {icons[status]} {status}
    </span>
  );
}

/* ─── Main App ─── */
export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('login'); // login | register
  const [notifications, setNotifications] = useState([]);
  const [tab, setTab] = useState('send');

  // Poll notifications
  useEffect(() => {
    if (!user) return;
    const fetchN = async () => {
      try {
        const res = await fetch(`${API}/notifications/user/${user.id}`);
        const d = await res.json();
        setNotifications(d.notifications || []);
      } catch { }
    };
    fetchN();
    const interval = setInterval(fetchN, 4000);
    return () => clearInterval(interval);
  }, [user]);

  const handleLogin = (userData) => { setUser(userData); setTab('send'); };
  const handleLogout = () => { setUser(null); setView('login'); setNotifications([]); };
  const unread = notifications.filter(n => !n.read).length;

  // ── Auth screens ──
  if (!user) {
    return (
      <div className="auth-page">
        {/* Background orbs */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
          <div style={{ position: 'absolute', top: '-10%', left: '-5%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(6,182,212,0.08) 0%, transparent 70%)', filter: 'blur(40px)' }} />
          <div style={{ position: 'absolute', bottom: '-10%', right: '-5%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.07) 0%, transparent 70%)', filter: 'blur(40px)' }} />
        </div>

        <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 440, padding: '0 1rem' }}>
          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center', marginBottom: 28 }}>
            <div style={{ position: 'relative' }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Shield className="w-6 h-6" style={{ color: '#22d3ee' }} />
              </div>
              <div style={{ position: 'absolute', bottom: -2, right: -2, width: 10, height: 10, borderRadius: '50%', background: '#10b981', border: '2px solid #030712' }} />
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, background: 'linear-gradient(135deg,#22d3ee,#818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>PayShield</div>
              <div style={{ fontSize: 10, color: '#475569', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Secure Payments · Protected by AI</div>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(30,41,59,0.8)', borderRadius: 14, padding: 4, marginBottom: 20, gap: 4 }}>
            {[['login', 'Sign In'], ['register', 'Create Account']].map(([v, label]) => (
              <button
                key={v}
                onClick={() => setView(v)}
                style={{
                  flex: 1, padding: '9px 16px', borderRadius: 10, fontWeight: 700, fontSize: 13,
                  background: view === v ? 'rgba(6,182,212,0.12)' : 'transparent',
                  border: view === v ? '1px solid rgba(6,182,212,0.25)' : '1px solid transparent',
                  color: view === v ? '#22d3ee' : '#64748b', cursor: 'pointer', transition: 'all 0.2s'
                }}
              >{label}</button>
            ))}
          </div>

          {view === 'login'
            ? <LoginForm onLogin={handleLogin} onSwitch={() => setView('register')} />
            : <RegisterForm onRegister={handleLogin} onSwitch={() => setView('login')} />}

          <p style={{ textAlign: 'center', fontSize: 11, color: '#1e293b', marginTop: 20 }}>
            🔒 256-bit encrypted · AI fraud detection active
          </p>
        </div>
      </div>
    );
  }

  // ── Dashboard ──
  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Header */}
      <header className="app-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield className="w-4 h-4" style={{ color: '#22d3ee' }} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, background: 'linear-gradient(135deg,#22d3ee,#818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>PayShield</div>
            <div style={{ fontSize: 9, color: '#334155', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Secure Portal</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Notification bell */}
          <button
            onClick={() => setTab('alerts')}
            style={{ position: 'relative', width: 36, height: 36, borderRadius: 10, background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(30,41,59,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', cursor: 'pointer' }}
          >
            <Bell className="w-4 h-4" style={unread > 0 ? { color: '#f59e0b' } : {}} />
            {unread > 0 && (
              <span style={{ position: 'absolute', top: -4, right: -4, background: '#ef4444', borderRadius: '50%', width: 16, height: 16, fontSize: 9, fontWeight: 800, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #030712' }}>
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>

          {/* User chip */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(30,41,59,0.8)', borderRadius: 10 }}>
            <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg,#0891b2,#6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: 'white' }}>
              {user.name?.charAt(0).toUpperCase()}
            </div>
            <div className="hidden sm:block">
              <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>{user.name}</div>
              <div style={{ fontSize: 9, color: '#475569', fontWeight: 600, letterSpacing: '0.05em' }}>VERIFIED USER</div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(30,41,59,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
            onMouseLeave={e => e.currentTarget.style.color = '#475569'}
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Welcome banner */}
      <div style={{ background: 'linear-gradient(90deg, rgba(6,182,212,0.06) 0%, transparent 100%)', borderBottom: '1px solid rgba(6,182,212,0.08)', padding: '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <span style={{ fontSize: 13, color: '#94a3b8' }}>Welcome back, </span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>{user.name}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="pulse-live" />
          <span style={{ fontSize: 11, color: '#10b981', fontWeight: 600 }}>AI Shield Active</span>
        </div>
      </div>

      {/* Main */}
      <main style={{ maxWidth: 960, margin: '0 auto', padding: '24px 20px' }}>
        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, overflowX: 'auto', paddingBottom: 2 }}>
          {[
            { id: 'send', icon: <Send className="w-4 h-4" />, label: 'Send Money' },
            { id: 'alerts', icon: <Bell className="w-4 h-4" />, label: `Alerts${unread > 0 ? ` (${unread})` : ''}` },
            { id: 'history', icon: <Clock className="w-4 h-4" />, label: 'History' },
            { id: 'prefs', icon: <Settings className="w-4 h-4" />, label: 'Preferences' },
          ].map(t => (
            <button key={t.id} className={`tab-btn ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {tab === 'send' && <SendMoneyTab user={user} />}
        {tab === 'alerts' && <AlertsTab notifications={notifications} />}
        {tab === 'history' && <HistoryTab user={user} />}
        {tab === 'prefs' && <PrefsTab user={user} setUser={setUser => { }} />}
      </main>
    </div>
  );
}

/* ─── Login Form ─── */
function LoginForm({ onLogin, onSwitch }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/users/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid email or password');
      onLogin(data);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="auth-card">
      <h2 style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9', marginBottom: 6 }}>Welcome back</h2>
      <p style={{ fontSize: 13, color: '#475569', marginBottom: 24 }}>Sign in to your PayShield account</p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label className="field-label">Email Address</label>
          <div style={{ position: 'relative' }}>
            <Mail style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: '#334155' }} />
            <input type="email" className="field-input" style={{ paddingLeft: 40 }} placeholder="name@example.com" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
          </div>
        </div>

        <div>
          <label className="field-label">Password</label>
          <div style={{ position: 'relative' }}>
            <Lock style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: '#334155' }} />
            <input type={showPw ? 'text' : 'password'} className="field-input" style={{ paddingLeft: 40, paddingRight: 40 }} placeholder="Your password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />
            <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#475569', cursor: 'pointer', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {error && <div className="error-box"><XCircle className="w-4 h-4 shrink-0 text-rose-400" />{error}</div>}

        <button type="submit" disabled={loading} className="btn-primary" style={{ marginTop: 4 }}>
          {loading ? <RefreshCw className="w-4 h-4 spin" /> : <LogIn className="w-4 h-4" />}
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <p style={{ textAlign: 'center', fontSize: 13, color: '#334155', marginTop: 20 }}>
        New here?{' '}
        <button onClick={onSwitch} style={{ background: 'none', border: 'none', color: '#22d3ee', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
          Create an account →
        </button>
      </p>
    </div>
  );
}

function RegisterForm({ onRegister, onSwitch }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [location, setLocation] = useState('Mumbai');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const locations = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad', 'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/users/register`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, location }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      onRegister(data);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="auth-card">
      <h2 style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9', marginBottom: 4 }}>Create Account</h2>
      <p style={{ fontSize: 13, color: '#475569', marginBottom: 24 }}>Your unique account ID is auto-generated</p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label className="field-label">Full Name</label>
          <div style={{ position: 'relative' }}>
            <User style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: '#334155' }} />
            <input type="text" className="field-input" style={{ paddingLeft: 40 }} placeholder="Ashish Kumar" value={name} onChange={e => setName(e.target.value)} required />
          </div>
        </div>

        <div>
          <label className="field-label">Email Address</label>
          <div style={{ position: 'relative' }}>
            <Mail style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: '#334155' }} />
            <input type="email" className="field-input" style={{ paddingLeft: 40 }} placeholder="name@example.com" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
          </div>
        </div>

        <div>
          <label className="field-label">Home City</label>
          <div style={{ position: 'relative' }}>
            <MapPin style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: '#334155', pointerEvents: 'none' }} />
            <select className="field-input" style={{ paddingLeft: 40, appearance: 'none', cursor: 'pointer' }} value={location} onChange={e => setLocation(e.target.value)}>
              {locations.map(l => <option key={l}>{l}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="field-label">Password</label>
          <div style={{ position: 'relative' }}>
            <Lock style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: '#334155' }} />
            <input type={showPw ? 'text' : 'password'} className="field-input" style={{ paddingLeft: 40, paddingRight: 40 }} placeholder="Min 6 characters" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} autoComplete="new-password" />
            <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#475569', cursor: 'pointer', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div style={{ padding: '10px 14px', background: 'rgba(6,182,212,0.05)', border: '1px solid rgba(6,182,212,0.12)', borderRadius: 10, fontSize: 12, color: '#475569', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Shield className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
          A unique Account ID will be assigned automatically upon registration — no need to set it yourself.
        </div>

        {error && <div className="error-box"><XCircle className="w-4 h-4 shrink-0 text-rose-400" />{error}</div>}

        <button type="submit" disabled={loading} className="btn-primary" style={{ marginTop: 4 }}>
          {loading ? <RefreshCw className="w-4 h-4 spin" /> : <UserPlus className="w-4 h-4" />}
          {loading ? 'Creating Account...' : 'Create Account'}
        </button>
      </form>

      <p style={{ textAlign: 'center', fontSize: 13, color: '#334155', marginTop: 20 }}>
        Already have an account?{' '}
        <button onClick={onSwitch} style={{ background: 'none', border: 'none', color: '#22d3ee', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
          Sign in →
        </button>
      </p>
    </div>
  );
}

function SendMoneyTab({ user }) {
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('RETAIL');
  const [location, setLocation] = useState(user.location || 'Mumbai');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const categories = ['RETAIL', 'TRAVEL', 'CRYPTO', 'GAMING'];
  const locations = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad', 'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setResult(null);
    try {
      const res = await fetch(`${API}/transactions/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, amount: parseFloat(amount), merchantCategory: category, location, timestamp: Date.now() }),
      });
      const data = await res.json();
      setResult(data);
    } catch (e) { setResult({ error: 'Backend unreachable. Check server status.' }); }
    finally { setLoading(false); }
  };

  const copyId = () => {
    navigator.clipboard.writeText(user.id || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
      {/* Form */}
      <div className="tx-card">
        <div className="tx-card-header" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Send className="w-4 h-4" style={{ color: '#22d3ee' }} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>New Transaction</div>
            <div style={{ fontSize: 10, color: '#475569', fontWeight: 600 }}>AI-powered fraud screening</div>
          </div>
        </div>

        <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Account (read-only) */}
          <div>
            <label className="field-label">Your Account ID</label>
            <div className="user-id-badge">
              <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg,#0891b2,#6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <User className="w-3 h-3" style={{ color: 'white' }} />
              </div>
              <code style={{ flex: 1 }}>{user.id}</code>
              <button onClick={copyId} style={{ background: 'none', border: 'none', color: copied ? '#10b981' : '#334155', cursor: 'pointer', padding: 2 }} title="Copy ID">
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', color: '#0891b2', background: 'rgba(6,182,212,0.1)', padding: '2px 8px', borderRadius: '100px', border: '1px solid rgba(6,182,212,0.15)' }}>LOCKED</span>
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="field-label">Amount (₹)</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#334155', fontSize: 14, fontWeight: 700 }}>₹</span>
              <input type="number" className="field-input" style={{ paddingLeft: 28 }} placeholder="10,000" value={amount} onChange={e => setAmount(e.target.value)} required min="1" />
            </div>
          </div>

          {/* Category & Location */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="field-label">Category</label>
              <div style={{ position: 'relative' }}>
                <Tag style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: '#334155', pointerEvents: 'none' }} />
                <select className="field-input" style={{ paddingLeft: 34, appearance: 'none', cursor: 'pointer' }} value={category} onChange={e => setCategory(e.target.value)}>
                  {categories.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="field-label">Location</label>
              <div style={{ position: 'relative' }}>
                <MapPin style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: '#334155', pointerEvents: 'none' }} />
                <select className="field-input" style={{ paddingLeft: 34, appearance: 'none', cursor: 'pointer' }} value={location} onChange={e => setLocation(e.target.value)}>
                  {locations.map(l => <option key={l}>{l}</option>)}
                </select>
              </div>
            </div>
          </div>

          <button type="button" onClick={handleSubmit} disabled={loading || !amount} className="btn-primary">
            {loading ? <RefreshCw className="w-4 h-4 spin" /> : <Shield className="w-4 h-4" />}
            {loading ? 'Processing...' : 'Submit for AI Review'}
          </button>

          <p style={{ textAlign: 'center', fontSize: 11, color: '#1e293b' }}>
            Transactions are screened by AI fraud detection in real-time
          </p>
        </div>
      </div>

      {/* Result */}
      <div className="tx-card" style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="tx-card-header" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Activity className="w-4 h-4" style={{ color: '#818cf8' }} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>AI Evaluation</div>
            <div style={{ fontSize: 10, color: '#475569', fontWeight: 600 }}>Real-time risk analysis</div>
          </div>
        </div>

        <div style={{ flex: 1, padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {result ? (
            result.error ? (
              <div className="error-box"><XCircle className="w-4 h-4 shrink-0" />{result.error}</div>
            ) : (
              <>
                {/* Status */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 16px', borderRadius: 14,
                  background: result.status === 'APPROVED' ? 'rgba(16,185,129,0.07)' : result.status === 'FLAGGED' ? 'rgba(245,158,11,0.07)' : 'rgba(239,68,68,0.07)',
                  border: result.status === 'APPROVED' ? '1px solid rgba(16,185,129,0.2)' : result.status === 'FLAGGED' ? '1px solid rgba(245,158,11,0.2)' : '1px solid rgba(239,68,68,0.2)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {result.status === 'APPROVED' ? <CheckCircle className="w-6 h-6" style={{ color: '#34d399' }} /> : result.status === 'FLAGGED' ? <AlertTriangle className="w-6 h-6" style={{ color: '#fbbf24' }} /> : <ShieldX className="w-6 h-6" style={{ color: '#f87171' }} />}
                    <div>
                      <div style={{ fontSize: 17, fontWeight: 800, color: result.status === 'APPROVED' ? '#34d399' : result.status === 'FLAGGED' ? '#fbbf24' : '#f87171' }}>{result.status}</div>
                      <div style={{ fontSize: 10, color: '#475569', fontWeight: 600 }}>Transaction Result</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 24, fontWeight: 900, color: result.status === 'APPROVED' ? '#34d399' : result.status === 'FLAGGED' ? '#fbbf24' : '#f87171' }}>{result.riskScore}</div>
                    <div style={{ fontSize: 9, color: '#475569', fontWeight: 700 }}>RISK SCORE</div>
                  </div>
                </div>

                {/* Risk reason */}
                {result.riskReason && (
                  <div style={{ padding: '12px 14px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 12, display: 'flex', gap: 10 }}>
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#fbbf24' }} />
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#d97706', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 3 }}>Risk Factor</div>
                      <div style={{ fontSize: 13, color: '#fcd34d', fontWeight: 500 }}>{result.riskReason}</div>
                    </div>
                  </div>
                )}

                {/* Details grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[
                    ['Amount', `₹${fmt(result.amount)}`],
                    ['Category', result.merchantCategory],
                    ['Location', result.location],
                    ['Ref ID', result.transactionId?.toString().slice(0, 10) + '...'],
                  ].map(([label, val]) => (
                    <div key={label} style={{ padding: '10px 12px', background: 'rgba(3,7,18,0.5)', border: '1px solid rgba(30,41,59,0.7)', borderRadius: 10 }}>
                      <div style={{ fontSize: 9, fontWeight: 700, color: '#334155', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#cbd5e1' }}>{val || '—'}</div>
                    </div>
                  ))}
                </div>
              </>
            )
          ) : (
            <div className="empty-state">
              <div style={{ width: 64, height: 64, borderRadius: '50%', border: '2px dashed rgba(30,41,59,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <Shield className="w-7 h-7" style={{ color: '#1e293b' }} />
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', marginBottom: 6 }}>Awaiting transaction</div>
              <div style={{ fontSize: 12, color: '#0f172a' }}>Fill the form and submit to see the AI risk evaluation here</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Alerts Tab ─── */
function AlertsTab({ notifications }) {
  if (notifications.length === 0) {
    return (
      <div className="empty-state" style={{ background: 'rgba(15,23,42,0.4)', border: '1px solid rgba(30,41,59,0.6)', borderRadius: 20, padding: '5rem 2rem' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(30,41,59,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          <Bell className="w-8 h-8" style={{ color: '#1e293b' }} />
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#334155', marginBottom: 8 }}>All clear!</div>
        <div style={{ fontSize: 13, color: '#1e293b', maxWidth: 300 }}>No fraud alerts for your account. When suspicious transactions are detected, they'll appear here.</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <Bell className="w-5 h-5" style={{ color: '#f59e0b' }} />
        <span style={{ fontSize: 17, fontWeight: 700, color: '#e2e8f0' }}>Security Alerts</span>
        <span style={{ marginLeft: 'auto', fontSize: 11, background: 'rgba(30,41,59,0.7)', color: '#475569', padding: '3px 10px', borderRadius: 100, fontWeight: 600 }}>{notifications.length} total</span>
      </div>
      {notifications.map((n, i) => (
        <div key={n.id || i} className={`notif-card ${n.status}`}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: n.status === 'BLOCKED' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)', border: n.status === 'BLOCKED' ? '1px solid rgba(239,68,68,0.2)' : '1px solid rgba(245,158,11,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {n.status === 'BLOCKED' ? <ShieldX className="w-5 h-5" style={{ color: '#f87171' }} /> : <ShieldAlert className="w-5 h-5" style={{ color: '#fbbf24' }} />}
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: n.status === 'BLOCKED' ? '#f87171' : '#fbbf24' }}>{n.status}</div>
                <div style={{ fontSize: 10, color: '#475569', fontWeight: 600 }}>Risk Score: <span style={{ color: '#94a3b8' }}>{n.riskScore}/100</span></div>
              </div>
            </div>
            <StatusPill status={n.status} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {[
              ['Amount', `₹${fmt(n.amount)}`],
              ['Location', n.location],
              ['Category', n.merchantCategory || n.txCategory],
            ].map(([label, val]) => (
              <div key={label} style={{ padding: '8px 10px', background: 'rgba(3,7,18,0.4)', border: '1px solid rgba(30,41,59,0.5)', borderRadius: 8 }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#334155', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 3 }}>{label}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#cbd5e1' }}>{val || '—'}</div>
              </div>
            ))}
          </div>

          {n.riskReason && (
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, color: '#94a3b8' }}>
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: '#475569' }} />
              {n.riskReason}
            </div>
          )}

          <div style={{ marginTop: 10, fontSize: 10, color: '#1e293b', fontWeight: 600 }}>
            Ref: {n.transactionId?.slice(0, 12)}...
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── History Tab ─── */
function HistoryTab({ user }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const res = await fetch(`http://localhost:8080/api/audit/search?q=${encodeURIComponent(user.id)}`);
        const data = await res.json();
        setHistory(data || []);
      } catch { setHistory([]); }
      finally { setLoading(false); }
    };
    fetch_();
  }, [user.id]);

  const approved = history.filter(t => t.status === 'APPROVED').length;
  const flagged = history.filter(t => t.status === 'FLAGGED').length;
  const blocked = history.filter(t => t.status === 'BLOCKED').length;

  return (
    <div>
      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Approved', val: approved, color: '#34d399', bg: 'rgba(16,185,129,0.07)', border: 'rgba(16,185,129,0.15)' },
          { label: 'Flagged', val: flagged, color: '#fbbf24', bg: 'rgba(245,158,11,0.07)', border: 'rgba(245,158,11,0.15)' },
          { label: 'Blocked', val: blocked, color: '#f87171', bg: 'rgba(239,68,68,0.07)', border: 'rgba(239,68,68,0.15)' },
        ].map(s => (
          <div key={s.label} style={{ padding: '16px 20px', background: s.bg, border: `1px solid ${s.border}`, borderRadius: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: s.color }}>{loading ? '–' : s.val}</div>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 14, fontWeight: 700, color: '#475569', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Clock className="w-4 h-4" /> Transaction History
        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#1e293b' }}>{history.length} records</span>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#334155' }}>
          <RefreshCw className="w-6 h-6 spin" style={{ margin: '0 auto 12px', color: '#1e293b' }} />
          Loading your transactions...
        </div>
      ) : history.length === 0 ? (
        <div className="empty-state">
          <CreditCard className="w-10 h-10" style={{ color: '#1e293b', marginBottom: 12 }} />
          <div style={{ color: '#334155', fontWeight: 600 }}>No transactions found</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {history.map((tx, i) => (
            <div key={tx.transactionId || i} className="tx-row" style={{ gridTemplateColumns: 'auto 1fr auto auto' }}>
              <div>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: tx.status === 'APPROVED' ? 'rgba(16,185,129,0.1)' : tx.status === 'FLAGGED' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)', border: tx.status === 'APPROVED' ? '1px solid rgba(16,185,129,0.2)' : tx.status === 'FLAGGED' ? '1px solid rgba(245,158,11,0.2)' : '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CreditCard className="w-4 h-4" style={{ color: tx.status === 'APPROVED' ? '#34d399' : tx.status === 'FLAGGED' ? '#fbbf24' : '#f87171' }} />
                </div>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>₹{fmt(tx.amount)}</div>
                <div style={{ fontSize: 11, color: '#475569' }}>{tx.merchantCategory} · {tx.location}</div>
                {tx.riskReason && <div style={{ fontSize: 10, color: '#ef4444', marginTop: 2, fontStyle: 'italic' }}>›  {tx.riskReason}</div>}
              </div>
              <StatusPill status={tx.status} />
              <div style={{ fontSize: 10, color: '#1e293b', textAlign: 'right' }}>
                {tx.timestamp ? new Date(tx.timestamp).toLocaleTimeString([], { hour12: true, hour: 'numeric', minute: '2-digit' }) : '—'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Preferences Tab ─── */
function PrefsTab({ user }) {
  const [notifyBlocked, setNotifyBlocked] = useState(user.notifyBlocked ?? true);
  const [notifyFlagged, setNotifyFlagged] = useState(user.notifyFlagged ?? true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await fetch(`${API}/users/${user.id}/preferences`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notifyBlocked, notifyFlagged }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch { }
    setSaving(false);
  };

  const Toggle = ({ checked, onChange, color }) => (
    <button onClick={() => onChange(!checked)} className={`toggle-wrap ${checked ? `on-${color}` : 'off'}`}>
      <div className="toggle-knob" />
    </button>
  );

  const prefItems = [
    {
      checked: notifyBlocked, onChange: setNotifyBlocked, color: 'rose',
      icon: <ShieldX className="w-5 h-5" style={{ color: '#f87171' }} />,
      bg: 'rgba(239,68,68,0.04)', border: 'rgba(239,68,68,0.15)',
      title: 'Critical Alerts — Blocked Transactions',
      desc: 'Get notified immediately when a high-risk transaction is automatically blocked by our AI system.',
    },
    {
      checked: notifyFlagged, onChange: setNotifyFlagged, color: 'amber',
      icon: <ShieldAlert className="w-5 h-5" style={{ color: '#fbbf24' }} />,
      bg: 'rgba(245,158,11,0.04)', border: 'rgba(245,158,11,0.15)',
      title: 'Warning Alerts — Suspicious Activity',
      desc: 'Receive alerts for transactions that look suspicious and are flagged for manual review.',
    },
  ];

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <div style={{ fontSize: 17, fontWeight: 700, color: '#e2e8f0', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
        <Settings className="w-5 h-5" style={{ color: '#818cf8' }} /> Alert Preferences
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
        {prefItems.map((p, i) => (
          <div key={i} style={{ padding: '20px 22px', background: p.bg, border: `1px solid ${p.border}`, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(3,7,18,0.4)', border: `1px solid ${p.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {p.icon}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', marginBottom: 4 }}>{p.title}</div>
                <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.5, maxWidth: 380 }}>{p.desc}</div>
              </div>
            </div>
            <Toggle checked={p.checked} onChange={p.onChange} color={p.color} />
          </div>
        ))}
      </div>

      <button onClick={save} disabled={saving} className="btn-primary">
        {saved ? <><Check className="w-4 h-4" /> Saved!</> : saving ? <><RefreshCw className="w-4 h-4 spin" /> Saving...</> : <><Settings className="w-4 h-4" /> Save Preferences</>}
      </button>
    </div>
  );
}
