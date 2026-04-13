import React, { useEffect, useState } from 'react';
import { API } from '../config/api';

const SettingsPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState({});
  const [toast, setToast] = useState(null);
  const [showRegister, setShowRegister] = useState(false);
  const [regForm, setRegForm] = useState({ name: '', email: '', password: '', location: 'Mumbai' });
  const [regLoading, setRegLoading] = useState(false);
  const [latestNotifications, setLatestNotifications] = useState([]);
  const [emailMode, setEmailMode] = useState({ loading: true, demoMode: true, smtpHost: '', smtpPort: '', sender: '' });

  const INDIA_CITIES = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad', 'Pune', 'Ahmedabad'];

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API.users}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setUsers(data);
      setError(null);
    } catch {
      setError('Cannot reach Communications Service at :8090. Is it running?');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  useEffect(() => {
    const fetchLatestNotifications = async () => {
      try {
        const res = await fetch(`${API.notifications}/latest`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        setLatestNotifications(data.notifications || []);
      } catch {
        setLatestNotifications([]);
      }
    };
    fetchLatestNotifications();
    const id = setInterval(fetchLatestNotifications, 10000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const fetchMode = async () => {
      try {
        const res = await fetch(`${API.notifications}/mode`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        setEmailMode({
          loading: false,
          demoMode: Boolean(data.demoMode),
          smtpHost: data.smtpHost || '',
          smtpPort: data.smtpPort || '',
          sender: data.sender || '',
        });
      } catch {
        setEmailMode({ loading: false, demoMode: true, smtpHost: '', smtpPort: '', sender: '' });
      }
    };
    fetchMode();
  }, []);

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const togglePref = async (user, field) => {
    const updated = {
      notifyBlocked: user.notifyBlocked,
      notifyFlagged: user.notifyFlagged,
      [field]: !user[field],
    };
    setSaving(s => ({ ...s, [user.id]: true }));
    try {
      const res = await fetch(`${API.users}/${user.id}/preferences`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      if (!res.ok) throw new Error();
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, ...updated } : u));
      showToast(`Updated preferences for ${user.name}`);
    } catch {
      showToast('Failed to update preferences', false);
    } finally {
      setSaving(s => ({ ...s, [user.id]: false }));
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setRegLoading(true);
    try {
      const res = await fetch(`${API.users}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(regForm),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Registration failed');
      }
      showToast(`Registered ${regForm.name} as alert recipient!`);
      setRegForm({ name: '', email: '', password: '', location: 'Mumbai' });
      setShowRegister(false);
      fetchUsers();
    } catch (e) {
      showToast(e.message, false);
    } finally {
      setRegLoading(false);
    }
  };

  return (
    <div className="ml-64 min-h-screen bg-surface font-body text-on-surface antialiased">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl text-sm font-bold font-label shadow-lg transition-all ${toast.ok ? 'bg-[#34c97b] text-white' : 'bg-error text-white'}`}>
          {toast.msg}
        </div>
      )}

      <header className="sticky top-0 z-10 bg-surface-bright border-b border-surface-container-low px-8 py-5 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-headline font-extrabold tracking-tight">Settings</h2>
          <p className="text-tertiary text-xs mt-1 font-label">Manage alert recipients and notification preferences</p>
        </div>
        <button
          onClick={() => setShowRegister(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg text-xs font-bold font-label hover:opacity-90 transition-opacity border-none cursor-pointer"
        >
          <span className="material-symbols-outlined text-sm">person_add</span>
          Add Recipient
        </button>
      </header>

      <div className="p-8 max-w-4xl mx-auto space-y-6">
        {/* Alert Configuration Info */}
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 flex gap-4">
          <span className="material-symbols-outlined text-primary text-xl mt-0.5">info</span>
          <div>
            <p className="text-sm font-bold font-headline">How Alerts Work</p>
            <p className="text-xs text-tertiary font-label mt-1 leading-relaxed">
              When the fraud engine detects a <strong>BLOCKED</strong> or <strong>FLAGGED</strong> transaction, the Communications Service notifies the transaction owner (if registered) and applies that recipient's preferences. If the owner is unknown, it falls back to team recipients with matching preferences. Delivery is currently simulated via console logging.
            </p>
          </div>
        </div>

        {/* Alert Recipients Table */}
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/5 shadow-[0px_8px_24px_rgba(27,27,27,0.04)] overflow-hidden">
          <div className="p-6 border-b border-surface-container-low flex items-center justify-between">
            <div>
              <h3 className="font-headline font-bold text-sm uppercase tracking-widest text-tertiary">Alert Recipients</h3>
              <p className="text-[10px] text-tertiary font-label mt-1">{users.length} registered user{users.length !== 1 ? 's' : ''}</p>
            </div>
            <span className="material-symbols-outlined text-tertiary">group</span>
          </div>

          {loading && (
            <div className="p-12 text-center text-tertiary text-sm font-label">
              <span className="material-symbols-outlined animate-spin text-primary text-2xl">progress_activity</span>
              <p className="mt-2">Loading from communications service...</p>
            </div>
          )}

          {error && !loading && (
            <div className="p-8 text-center">
              <span className="material-symbols-outlined text-error text-3xl">cloud_off</span>
              <p className="text-sm text-error font-bold font-label mt-2">{error}</p>
              <button onClick={fetchUsers} className="mt-3 text-xs text-primary font-bold font-label hover:underline bg-transparent border-none cursor-pointer">Retry</button>
            </div>
          )}

          {!loading && !error && users.length === 0 && (
            <div className="p-12 text-center">
              <span className="material-symbols-outlined text-tertiary text-4xl">person_off</span>
              <p className="text-sm text-tertiary font-label mt-2">No recipients registered yet.</p>
              <button onClick={() => setShowRegister(true)} className="mt-3 text-xs text-primary font-bold font-label hover:underline bg-transparent border-none cursor-pointer">Add the first one</button>
            </div>
          )}

          {!loading && !error && users.length > 0 && (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-container-low">
                  <th className="py-3 px-6 font-label text-[10px] uppercase tracking-widest text-tertiary">User</th>
                  <th className="py-3 px-6 font-label text-[10px] uppercase tracking-widest text-tertiary">Email</th>
                  <th className="py-3 px-6 font-label text-[10px] uppercase tracking-widest text-tertiary">Location</th>
                  <th className="py-3 px-6 font-label text-[10px] uppercase tracking-widest text-tertiary text-center">BLOCKED Alerts</th>
                  <th className="py-3 px-6 font-label text-[10px] uppercase tracking-widest text-tertiary text-center">FLAGGED Alerts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container">
                {users.map(user => (
                  <tr key={user.id} className="hover:bg-surface-container-low transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-xs text-primary font-label">
                          {(user.name || 'U').substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-bold font-label">{user.name}</p>
                          <p className="text-[10px] text-tertiary font-label">{user.userId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-sm text-tertiary font-label">{user.email}</td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-tertiary text-sm">location_on</span>
                        <span className="text-sm font-label text-tertiary">{user.location || 'India'}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <Toggle
                        checked={user.notifyBlocked}
                        disabled={saving[user.id]}
                        onChange={() => togglePref(user, 'notifyBlocked')}
                        color="error"
                      />
                    </td>
                    <td className="py-4 px-6 text-center">
                      <Toggle
                        checked={user.notifyFlagged}
                        disabled={saving[user.id]}
                        onChange={() => togglePref(user, 'notifyFlagged')}
                        color="secondary"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Channel info */}
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/5 p-6">
          <h3 className="font-headline font-bold text-sm uppercase tracking-widest text-tertiary mb-4">Notification Channel</h3>
          <div className="flex items-center gap-4 p-4 bg-surface-container-low rounded-xl">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-primary">email</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-bold text-sm font-label">Email Delivery</p>
                {!emailMode.loading && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-label font-bold uppercase tracking-widest ${
                    emailMode.demoMode ? 'bg-surface-container text-tertiary' : 'bg-[#e6f9f0] text-[#1a7a46]'
                  }`}>
                    Email Mode: {emailMode.demoMode ? 'Demo' : 'SMTP'}
                  </span>
                )}
              </div>
              <p className="text-xs text-tertiary font-label mt-0.5">
                {emailMode.demoMode
                  ? 'Notifications are simulated and logged by communications-service.'
                  : `Sending via SMTP ${emailMode.smtpHost}:${emailMode.smtpPort} as ${emailMode.sender}.`}
              </p>
            </div>
            <span className={`px-3 py-1 rounded-full text-[10px] font-label font-bold uppercase tracking-widest ${
              emailMode.demoMode ? 'bg-surface-container text-tertiary' : 'bg-[#e6f9f0] text-[#1a7a46]'
            }`}>
              {emailMode.demoMode ? 'Simulated' : 'Live SMTP'}
            </span>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/5 p-6">
          <h3 className="font-headline font-bold text-sm uppercase tracking-widest text-tertiary mb-4">Recent Delivery Status</h3>
          {latestNotifications.length === 0 ? (
            <p className="text-xs text-tertiary font-label">No notifications sent yet.</p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar">
              {latestNotifications.slice(0, 12).map((n) => (
                <div key={n.id} className="p-3 bg-surface-container-low rounded-lg">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold">{n.transactionId}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      n.deliveryStatus === 'DELIVERED' ? 'bg-[#e6f9f0] text-[#1a7a46]' :
                        n.deliveryStatus === 'FAILED' ? 'bg-error-container text-error' :
                          'bg-surface-container text-tertiary'
                    }`}>
                      {n.deliveryStatus || 'PENDING'}
                    </span>
                  </div>
                  <p className="text-[10px] text-tertiary mt-1">
                    {n.status} · User: {n.txUserId || 'n/a'} · Channel: {n.channel}
                  </p>
                  {n.deliveryError && <p className="text-[10px] text-error mt-1 truncate">{n.deliveryError}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Register Modal */}
      {showRegister && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-6 border-b border-surface-container-low flex items-center justify-between">
              <h3 className="font-headline font-bold text-lg">Add Alert Recipient</h3>
              <button onClick={() => setShowRegister(false)} className="p-1 hover:bg-surface-container-low rounded-lg transition-colors border-none bg-transparent cursor-pointer">
                <span className="material-symbols-outlined text-tertiary">close</span>
              </button>
            </div>
            <form onSubmit={handleRegister} className="p-6 space-y-4">
              <FormField label="Full Name" type="text" value={regForm.name} onChange={v => setRegForm(f => ({ ...f, name: v }))} placeholder="Priya Sharma" required />
              <FormField label="Email Address" type="email" value={regForm.email} onChange={v => setRegForm(f => ({ ...f, email: v }))} placeholder="priya@shieldgate.in" required />
              <FormField label="Password" type="password" value={regForm.password} onChange={v => setRegForm(f => ({ ...f, password: v }))} placeholder="••••••••" required />
              <div>
                <label className="block text-xs font-bold font-label uppercase tracking-widest text-tertiary mb-2">Location (India)</label>
                <select
                  value={regForm.location}
                  onChange={e => setRegForm(f => ({ ...f, location: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-surface-container-low border-none rounded-xl text-sm font-label focus:ring-2 focus:ring-primary/30 outline-none transition-all"
                >
                  {INDIA_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <p className="text-[10px] font-label text-tertiary">New recipients get BLOCKED alerts enabled by default. You can adjust preferences after registering.</p>
              <button
                type="submit"
                disabled={regLoading}
                className="w-full py-3 bg-primary text-on-primary rounded-xl font-bold font-label text-sm hover:opacity-90 transition-opacity border-none cursor-pointer disabled:opacity-60"
              >
                {regLoading ? 'Registering...' : 'Register Recipient'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const Toggle = ({ checked, onChange, disabled, color }) => (
  <button
    onClick={onChange}
    disabled={disabled}
    className={`relative inline-flex items-center w-11 h-6 rounded-full transition-colors border-none cursor-pointer disabled:opacity-50 ${checked ? (color === 'error' ? 'bg-error' : 'bg-secondary') : 'bg-surface-container-highest'}`}
  >
    <span className={`inline-block w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
  </button>
);

const FormField = ({ label, type, value, onChange, placeholder, required }) => (
  <div>
    <label className="block text-xs font-bold font-label uppercase tracking-widest text-tertiary mb-2">{label}</label>
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      className="w-full px-4 py-2.5 bg-surface-container-low border-none rounded-xl text-sm font-label focus:ring-2 focus:ring-primary/30 outline-none transition-all"
    />
  </div>
);

export default SettingsPage;
