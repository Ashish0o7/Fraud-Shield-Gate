import React, { useState } from 'react';
import { Send, Zap, Loader2, CheckCircle2, AlertCircle, User } from 'lucide-react';

export default function ControlPanel({ API_BASE, userId, onManualTx }) {
    const [amount, setAmount] = useState('50000');
    const [category, setCategory] = useState('RETAIL');
    const [location, setLocation] = useState('Mumbai');
    const [loading, setLoading] = useState(false);
    const [floodLoading, setFloodLoading] = useState(false);
    const [toast, setToast] = useState(null);

    const showToast = (type, message) => {
        setToast({ type, message });
        setTimeout(() => setToast(null), 3000);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        const tx = { userId, amount: Number(amount), merchantCategory: category, location };
        try {
            const res = await fetch(`${API_BASE}/ingest`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(tx)
            });
            const data = await res.json();
            if (onManualTx) onManualTx(data);
            const statusEmoji = data.status === 'APPROVED' ? '✓' : data.status === 'FLAGGED' ? '⚠' : '✕';
            showToast(data.status === 'BLOCKED' ? 'error' : 'success', `${statusEmoji} ${data.status}`);
        } catch (err) {
            showToast('error', 'Backend unreachable');
        } finally {
            setLoading(false);
        }
    };

    const fireFlood = async () => {
        setFloodLoading(true);
        try {
            await fetch(`${API_BASE}/demo/flood?count=10000`, { method: 'POST' });
            showToast('success', '10k events dispatched');
        } catch (err) {
            showToast('error', 'Backend unreachable');
        } finally {
            setFloodLoading(false);
        }
    };

    return (
        <div className="glass-card p-5 flex flex-col h-full relative overflow-hidden">
            {/* Toast */}
            {toast && (
                <div className={`absolute top-3 left-3 right-3 z-10 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold fade-in-up ${toast.type === 'success'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}>
                    {toast.type === 'success'
                        ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        : <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    }
                    {toast.message}
                </div>
            )}

            <h2 className="section-header flex items-center gap-2">
                <Send className="w-3.5 h-3.5 text-blue-400" />
                Manual Ingestion
            </h2>

            {/* User ID display (read-only) */}
            <div className="mb-3">
                <label className="block text-[11px] text-slate-500 mb-1 font-semibold uppercase tracking-wider">Session User</label>
                <div className="w-full bg-slate-900/40 border border-slate-700/30 rounded-lg px-3 py-2 text-sm text-slate-400 flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500/70 to-indigo-600/70 flex items-center justify-center shrink-0">
                        <User className="w-2.5 h-2.5 text-white" />
                    </div>
                    <span className="font-mono text-xs truncate">{userId}</span>
                    <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-semibold uppercase tracking-widest">Session</span>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 mb-6 flex-1">
                <InputField label="Amount (₹)" type="number" value={amount} onChange={setAmount} />

                <div>
                    <label className="block text-[11px] text-slate-500 mb-1 font-semibold uppercase tracking-wider">Category</label>
                    <select
                        className="w-full bg-slate-900/80 border border-slate-700/60 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/70 focus:ring-1 focus:ring-blue-500/30 transition-all appearance-none cursor-pointer"
                        value={category} onChange={e => setCategory(e.target.value)}
                    >
                        <option>RETAIL</option>
                        <option>TRAVEL</option>
                        <option>CRYPTO</option>
                        <option>GAMING</option>
                    </select>
                </div>

                <InputField label="Location" value={location} onChange={setLocation} />

                <div className="pt-1">
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-all text-sm shadow-lg shadow-blue-900/30"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        {loading ? 'Sending...' : 'Send Transaction'}
                    </button>
                </div>
            </form>

            <div className="pt-4 border-t border-slate-700/40 mt-auto">
                <h3 className="section-header flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-rose-400" />
                    Load Testing
                </h3>
                <button
                    onClick={fireFlood}
                    disabled={floodLoading}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition-all text-sm shadow-lg shadow-rose-900/30 active:scale-[0.98]"
                >
                    {floodLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 fill-current" />}
                    {floodLoading ? 'Dispatching...' : 'Simulate 10k Attack'}
                </button>
                <p className="text-[10px] text-slate-600 mt-2 text-center leading-relaxed">
                    Tests ingestion throughput, messaging backpressure, and analytics pipeline
                </p>
            </div>
        </div>
    );
}

function InputField({ label, type = 'text', value, onChange }) {
    return (
        <div>
            <label className="block text-[11px] text-slate-500 mb-1 font-semibold uppercase tracking-wider">{label}</label>
            <input
                type={type}
                className="w-full bg-slate-900/80 border border-slate-700/60 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/70 focus:ring-1 focus:ring-blue-500/30 transition-all"
                value={value}
                onChange={e => onChange(e.target.value)}
            />
        </div>
    );
}
