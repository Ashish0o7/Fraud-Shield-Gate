import React, { useState } from 'react';
import { Search, X, Loader2, ShieldAlert, ShieldCheck, ShieldX, Filter, SlidersHorizontal } from 'lucide-react';

const STATUS_OPTIONS = ['', 'APPROVED', 'FLAGGED', 'BLOCKED'];
const CATEGORY_OPTIONS = ['', 'RETAIL', 'TRAVEL', 'CRYPTO', 'GAMING'];

export default function AuditSearch({ API_BASE, onClose }) {
    const [query, setQuery] = useState('');
    const [status, setStatus] = useState('');
    const [category, setCategory] = useState('');
    const [minAmount, setMinAmount] = useState('');
    const [maxAmount, setMaxAmount] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);

    const handleSearch = async (e) => {
        e?.preventDefault();
        setLoading(true);
        setSearched(true);
        try {
            const params = new URLSearchParams();
            if (query.trim()) params.set('q', query.trim());
            if (status) params.set('status', status);
            if (category) params.set('category', category);
            if (minAmount) params.set('minAmount', minAmount);
            if (maxAmount) params.set('maxAmount', maxAmount);

            const res = await fetch(`${API_BASE}/audit/search?${params.toString()}`);
            const data = await res.json();
            setResults(data || []);
        } catch (err) {
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    const clearFilters = () => {
        setStatus(''); setCategory(''); setMinAmount(''); setMaxAmount('');
    };

    const hasFilters = status || category || minAmount || maxAmount;

    const StatusIcon = ({ status }) => {
        switch (status) {
            case 'APPROVED': return <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />;
            case 'FLAGGED': return <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />;
            case 'BLOCKED': return <ShieldX className="w-3.5 h-3.5 text-rose-400" />;
            default: return null;
        }
    };

    const getStatusClass = (status) => {
        switch (status) {
            case 'APPROVED': return 'badge-approved';
            case 'FLAGGED': return 'badge-flagged';
            case 'BLOCKED': return 'badge-blocked';
            default: return '';
        }
    };

    return (
        <div className="glass-card p-5">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h2 className="section-header flex items-center gap-2 mb-0">
                    <Search className="w-3.5 h-3.5 text-cyan-400" />
                    Audit Trail Search
                </h2>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${showFilters || hasFilters
                            ? 'bg-blue-500/15 border border-blue-500/30 text-blue-400'
                            : 'bg-slate-800/50 border border-slate-700/40 text-slate-500 hover:text-slate-300'}`}
                    >
                        <SlidersHorizontal className="w-3 h-3" />
                        Filters {hasFilters && <span className="ml-0.5 w-4 h-4 rounded-full bg-blue-500 text-white text-[9px] font-bold flex items-center justify-center">✓</span>}
                    </button>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-slate-700/50 text-slate-500 hover:text-white transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Main Search Bar */}
            <form onSubmit={handleSearch} className="flex gap-2 mb-3">
                <input
                    type="text"
                    placeholder="Search by partial username, category, location, status, TXID…"
                    className="flex-1 bg-slate-900/80 border border-slate-700/60 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/70 focus:ring-1 focus:ring-blue-500/30 transition-all placeholder-slate-600"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    autoFocus
                />
                <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-40 text-white font-semibold rounded-lg transition-all text-sm flex items-center gap-2"
                >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    Search
                </button>
            </form>

            {/* Expandable Filters */}
            {showFilters && (
                <div className="mb-4 p-3 bg-slate-900/50 rounded-xl border border-slate-700/30 fade-in-up">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                            <Filter className="w-3 h-3" /> Advanced Filters
                        </span>
                        {hasFilters && (
                            <button onClick={clearFilters} className="text-[10px] text-rose-400/70 hover:text-rose-400 transition-colors font-semibold">
                                Clear all
                            </button>
                        )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {/* Status filter */}
                        <div>
                            <label className="block text-[9px] text-slate-600 font-bold uppercase tracking-wider mb-1">Status</label>
                            <select
                                value={status}
                                onChange={e => setStatus(e.target.value)}
                                className="w-full bg-slate-900/80 border border-slate-700/50 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500/50 transition-all appearance-none"
                            >
                                <option value="">Any</option>
                                {STATUS_OPTIONS.filter(Boolean).map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        {/* Category filter */}
                        <div>
                            <label className="block text-[9px] text-slate-600 font-bold uppercase tracking-wider mb-1">Category</label>
                            <select
                                value={category}
                                onChange={e => setCategory(e.target.value)}
                                className="w-full bg-slate-900/80 border border-slate-700/50 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500/50 transition-all appearance-none"
                            >
                                <option value="">Any</option>
                                {CATEGORY_OPTIONS.filter(Boolean).map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        {/* Min amount */}
                        <div>
                            <label className="block text-[9px] text-slate-600 font-bold uppercase tracking-wider mb-1">Min Amount (₹)</label>
                            <input
                                type="number"
                                value={minAmount}
                                onChange={e => setMinAmount(e.target.value)}
                                placeholder="0"
                                className="w-full bg-slate-900/80 border border-slate-700/50 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500/50 transition-all placeholder-slate-700"
                            />
                        </div>
                        {/* Max amount */}
                        <div>
                            <label className="block text-[9px] text-slate-600 font-bold uppercase tracking-wider mb-1">Max Amount (₹)</label>
                            <input
                                type="number"
                                value={maxAmount}
                                onChange={e => setMaxAmount(e.target.value)}
                                placeholder="∞"
                                className="w-full bg-slate-900/80 border border-slate-700/50 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500/50 transition-all placeholder-slate-700"
                            />
                        </div>
                    </div>
                    <button
                        onClick={handleSearch}
                        disabled={loading}
                        className="mt-3 w-full py-1.5 text-xs font-semibold bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/20 transition-all disabled:opacity-50"
                    >
                        Apply Filters
                    </button>
                </div>
            )}

            {loading && (
                <div className="text-center py-8 text-slate-500 text-sm">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-400" />
                    Querying Elasticsearch...
                </div>
            )}

            {!loading && searched && results.length === 0 && (
                <div className="text-center py-8 text-slate-600 text-sm">
                    No transactions found matching your search criteria
                </div>
            )}

            {!loading && results.length > 0 && (
                <div className="overflow-x-auto">
                    <div className="text-[10px] text-slate-500 mb-2 flex items-center gap-2">
                        <span>{results.length} result{results.length !== 1 ? 's' : ''}</span>
                        {hasFilters && <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 font-semibold">filtered</span>}
                    </div>
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="text-left text-[10px] text-slate-500 uppercase tracking-wider border-b border-slate-700/40">
                                <th className="py-2 pr-3">Status</th>
                                <th className="py-2 pr-3">User</th>
                                <th className="py-2 pr-3">Amount</th>
                                <th className="py-2 pr-3">Category</th>
                                <th className="py-2 pr-3">Location</th>
                                <th className="py-2 pr-3">Risk Reason</th>
                                <th className="py-2 pr-3">AI Score</th>
                                <th className="py-2">Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            {results.map((ev, i) => (
                                <tr key={ev.transactionId || i} className="border-b border-slate-800/40 hover:bg-slate-800/20 transition-colors">
                                    <td className="py-2 pr-3">
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold tracking-wider ${getStatusClass(ev.status)}`}>
                                            <StatusIcon status={ev.status} />
                                            {ev.status}
                                        </span>
                                    </td>
                                    <td className="py-2 pr-3 text-cyan-300 font-medium font-mono">{ev.userId}</td>
                                    <td className="py-2 pr-3 text-slate-300 font-medium">₹{ev.amount?.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                    <td className="py-2 pr-3 text-slate-400">{ev.merchantCategory}</td>
                                    <td className="py-2 pr-3 text-slate-400">{ev.location}</td>
                                    <td className="py-2 pr-3 text-rose-400/80 italic max-w-[180px] truncate">{ev.riskReason || '—'}</td>
                                    <td className="py-2 pr-3">
                                        {ev.anomalyScore != null ? (
                                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold ${ev.isAnomaly
                                                    ? 'bg-amber-500/12 text-amber-400 border border-amber-500/25'
                                                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                                }`}>
                                                {ev.isAnomaly ? '⚠ ' : '✓ '}
                                                {(ev.anomalyScore * 100).toFixed(0)}%
                                            </span>
                                        ) : (
                                            <span className="text-slate-700 text-[10px]">—</span>
                                        )}
                                    </td>
                                    <td className="py-2 text-slate-500 whitespace-nowrap">
                                        {ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString([], { hour12: false }) : '—'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
