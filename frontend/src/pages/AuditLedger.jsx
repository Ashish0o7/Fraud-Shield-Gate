import React, { useState, useEffect, useMemo } from 'react';
import { API } from '../config/api';

const PAGE_SIZE = 15;
const formatAmount = (amount, currency = 'INR') =>
  Number(amount || 0).toLocaleString('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const AuditLedger = () => {
  const [events, setEvents] = useState([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [page, setPage] = useState(0);
  const [error, setError] = useState(null);

  const fetchSearch = async (params = {}) => {
    try {
      const {
        q = query,
        status = statusFilter,
        category = categoryFilter,
        min = minAmount,
        max = maxAmount,
      } = params;
      const urlParams = new URLSearchParams();
      if (q?.trim()) urlParams.set('q', q.trim());
      if (status) urlParams.set('status', status);
      if (category) urlParams.set('category', category);
      if (min !== '' && !Number.isNaN(Number(min))) urlParams.set('minAmount', Number(min).toString());
      if (max !== '' && !Number.isNaN(Number(max))) urlParams.set('maxAmount', Number(max).toString());
      const querySuffix = urlParams.toString();

      const res = await fetch(`${API.audit}/search${querySuffix ? `?${querySuffix}` : ''}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setEvents(data);
      setSelectedEvent(null);
      setPage(0);
      setError(null);
    } catch {
      setError('Unable to fetch audit events. Check fraud-detection service on :8080.');
    }
  };

  useEffect(() => {
    const initialRun = setTimeout(() => {
      fetchSearch();
    }, 0);
    return () => clearTimeout(initialRun);
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      fetchSearch({ q: query });
    }
  };

  const statusBreakdown = useMemo(() => {
    const approved = events.filter((e) => e.status === 'APPROVED').length;
    const flagged = events.filter((e) => e.status === 'FLAGGED').length;
    const blocked = events.filter((e) => e.status === 'BLOCKED').length;
    const total = events.length;
    const pct = (count) => (total === 0 ? 0 : Math.round((count / total) * 100));
    return {
      approved,
      flagged,
      blocked,
      approvedPct: pct(approved),
      flaggedPct: pct(flagged),
      blockedPct: pct(blocked),
    };
  }, [events]);
  const categoryBreakdown = useMemo(() => {
    const counts = events.reduce((acc, event) => {
      const key = (event.merchantCategory || 'UNKNOWN').toUpperCase();
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const total = events.length || 1;
    return Object.entries(counts)
      .map(([category, count]) => ({
        category,
        count,
        pct: Math.round((count / total) * 100),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [events]);

  const start = page * PAGE_SIZE;
  const end = start + PAGE_SIZE;
  const visibleEvents = events.slice(start, end);
  const hasPrev = page > 0;
  const hasNext = end < events.length;

  return (
    <div className="ml-64 min-h-screen relative overflow-y-auto custom-scrollbar bg-surface font-body text-on-surface antialiased">
      <header className="sticky top-0 z-10 bg-surface flex justify-between items-center px-10 py-8">
        <div>
          <h2 className="text-3xl font-headline font-bold tracking-tight text-on-surface">Audit Ledger</h2>
          <p className="text-tertiary mt-1 max-w-lg leading-relaxed">Review incoming transactional stream and automated risk assessment outputs.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-tertiary text-[20px]">search</span>
            <input 
              className="pl-10 pr-4 py-2 bg-surface-container-low border-none rounded-xl focus:ring-1 focus:ring-primary text-sm w-64 transition-all" 
              placeholder="Filter ID, Entity..." 
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
          <button
            onClick={() => fetchSearch({ q: query })}
            className="px-4 py-2.5 bg-primary text-on-primary rounded-xl transition-colors border-none cursor-pointer font-label text-xs font-bold uppercase tracking-widest"
          >
            Search
          </button>
        </div>
      </header>

      <section className="px-10 pb-20">
        <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-surface-container-low border-none rounded-xl text-sm"
          >
            <option value="">All Statuses</option>
            <option value="APPROVED">APPROVED</option>
            <option value="FLAGGED">FLAGGED</option>
            <option value="BLOCKED">BLOCKED</option>
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-surface-container-low border-none rounded-xl text-sm"
          >
            <option value="">All Categories</option>
            <option value="RETAIL">RETAIL</option>
            <option value="TRAVEL">TRAVEL</option>
            <option value="CRYPTO">CRYPTO</option>
            <option value="GAMING">GAMING</option>
          </select>
          <input
            type="number"
            min="0"
            placeholder="Min amount"
            value={minAmount}
            onChange={(e) => setMinAmount(e.target.value)}
            className="px-3 py-2 bg-surface-container-low border-none rounded-xl text-sm"
          />
          <input
            type="number"
            min="0"
            placeholder="Max amount"
            value={maxAmount}
            onChange={(e) => setMaxAmount(e.target.value)}
            className="px-3 py-2 bg-surface-container-low border-none rounded-xl text-sm"
          />
        </div>
        <div className="mb-6 flex items-center gap-2">
          <button
            onClick={() => fetchSearch()}
            className="px-4 py-2 bg-primary text-on-primary rounded-xl border-none cursor-pointer font-label text-xs font-bold uppercase tracking-widest"
          >
            Apply Filters
          </button>
          <button
            onClick={() => {
              setQuery('');
              setStatusFilter('');
              setCategoryFilter('');
              setMinAmount('');
              setMaxAmount('');
              fetchSearch({ q: '', status: '', category: '', min: '', max: '' });
            }}
            className="px-4 py-2 bg-surface-container-low rounded-xl border-none cursor-pointer font-label text-xs font-bold uppercase tracking-widest text-tertiary"
          >
            Reset
          </button>
        </div>
        <div className="mb-6 bg-surface-container-lowest rounded-xl p-4 shadow-[0px_12px_32px_rgba(27,27,27,0.04)]">
          <p className="text-[10px] font-label uppercase tracking-widest text-tertiary mb-3">Current Result Mix</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-surface-container-low">
              <p className="font-bold">Approved</p>
              <p>{statusBreakdown.approved} ({statusBreakdown.approvedPct}%)</p>
            </div>
            <div className="p-3 rounded-lg bg-surface-container-low">
              <p className="font-bold">Flagged</p>
              <p>{statusBreakdown.flagged} ({statusBreakdown.flaggedPct}%)</p>
            </div>
            <div className="p-3 rounded-lg bg-surface-container-low">
              <p className="font-bold">Blocked</p>
              <p>{statusBreakdown.blocked} ({statusBreakdown.blockedPct}%)</p>
            </div>
          </div>
          <div className="mt-3 h-3 rounded-full overflow-hidden bg-surface-container-high flex">
            <div className="bg-[#34c97b]" style={{ width: `${statusBreakdown.approvedPct}%` }} />
            <div className="bg-amber-400" style={{ width: `${statusBreakdown.flaggedPct}%` }} />
            <div className="bg-error" style={{ width: `${statusBreakdown.blockedPct}%` }} />
          </div>
          <div className="mt-5 space-y-2">
            <p className="text-[10px] font-label uppercase tracking-widest text-tertiary">Category Distribution</p>
            {categoryBreakdown.length === 0 ? (
              <p className="text-xs text-tertiary">No category data in current result set.</p>
            ) : (
              categoryBreakdown.map((entry) => (
                <div key={entry.category}>
                  <div className="flex justify-between text-[11px] text-tertiary mb-1">
                    <span>{entry.category}</span>
                    <span>{entry.count} ({entry.pct}%)</span>
                  </div>
                  <div className="h-2 rounded-full bg-surface-container-high overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${entry.pct}%` }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        {error && (
          <div className="mb-4 text-xs text-error bg-error-container/40 border border-error/20 rounded-lg p-3">
            {error}
          </div>
        )}
        <div className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-[0px_12px_32px_rgba(27,27,27,0.04)]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low">
                <th className="py-4 px-6 font-label uppercase tracking-widest text-[10px] text-tertiary">ID</th>
                <th className="py-4 px-6 font-label uppercase tracking-widest text-[10px] text-tertiary">Timestamp</th>
                <th className="py-4 px-6 font-label uppercase tracking-widest text-[10px] text-tertiary">Entity</th>
                <th className="py-4 px-6 font-label uppercase tracking-widest text-[10px] text-tertiary text-right">Amount</th>
                <th className="py-4 px-6 font-label uppercase tracking-widest text-[10px] text-tertiary text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {visibleEvents.length === 0 ? (
                <tr><td colSpan="5" className="py-10 text-center text-tertiary text-sm">No transactions found</td></tr>
              ) : (
                visibleEvents.map((e, idx) => (
                  <TableRow
                    key={e.transactionId || `${e.userId || 'user'}-${e.timestamp || idx}-${idx}-${page}`}
                    event={e}
                    onSelect={() => setSelectedEvent(e)}
                    selected={selectedEvent?.transactionId === e.transactionId}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-8 flex justify-between items-center text-sm text-tertiary font-label">
          <p>
            Showing {events.length === 0 ? 0 : start + 1}-{Math.min(end, events.length)} of {(events.length).toLocaleString()} transactions
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => hasPrev && setPage(page - 1)}
              disabled={!hasPrev}
              className="px-4 py-2 bg-surface-container-low rounded-lg hover:bg-surface-container-high transition-all border-none cursor-pointer disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => hasNext && setPage(page + 1)}
              disabled={!hasNext}
              className="px-4 py-2 bg-surface-container-low rounded-lg hover:bg-surface-container-high transition-all border-none cursor-pointer disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </section>

      {selectedEvent && (
        <div className="fixed inset-0 bg-black/40 z-30 flex justify-end" onClick={() => setSelectedEvent(null)}>
          <aside
            className="w-[400px] h-screen bg-surface-container-lowest border-l border-surface-container-high shadow-2xl flex flex-col p-8 overflow-y-auto custom-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-headline font-bold text-lg tracking-tight">Investigation Panel</h3>
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="px-2 py-1 text-xs bg-surface-container-low rounded-md border-none cursor-pointer text-tertiary"
              >
                Close
              </button>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-surface-container-low rounded-xl">
                <p className="text-[10px] font-label uppercase tracking-widest text-tertiary mb-1">Transaction</p>
                <p className="text-sm font-bold break-all">{selectedEvent.transactionId}</p>
              </div>
              <div className="p-4 bg-surface-container-low rounded-xl">
                <p className="text-[10px] font-label uppercase tracking-widest text-tertiary mb-2">Status</p>
                <p className="text-sm font-bold">{selectedEvent.status}</p>
                <p className="text-xs text-tertiary mt-1">Risk score: {selectedEvent.riskScore ?? 0}/100</p>
              </div>
              <div className="p-4 bg-surface-container-low rounded-xl">
                <p className="text-[10px] font-label uppercase tracking-widest text-tertiary mb-2">Entity</p>
                <p className="text-sm">{selectedEvent.userId || 'Unknown user'}</p>
                <p className="text-sm mt-1">{formatAmount(selectedEvent.amount, selectedEvent.currency || 'INR')}</p>
                <p className="text-xs text-tertiary mt-1">{selectedEvent.location || 'Unknown location'} · {selectedEvent.merchantCategory || 'N/A'}</p>
              </div>
              {selectedEvent.riskReason && (
                <div className="p-4 bg-error/5 border border-error/20 rounded-xl">
                  <p className="text-[10px] font-label uppercase tracking-widest text-error mb-2">Risk Reason</p>
                  <p className="text-xs">{selectedEvent.riskReason}</p>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
};

const TableRow = ({ event, onSelect, selected }) => {
  const date = new Date(event.timestamp);
  const timeSt = Number.isNaN(date.getTime()) ? 'Unknown time' : date.toLocaleString('en-IN');
  const isFraud = event.status === "BLOCKED" || event.status === "FLAGGED";
  const initials = (event.userId || "U").substring(0, 2).toUpperCase();
  const amountStr = formatAmount(event.amount, event.currency || 'INR');

  return (
    <tr onClick={onSelect} className={`hover:bg-surface-container-low transition-colors cursor-pointer ${isFraud ? 'bg-error/5' : ''} ${selected ? 'bg-surface-container-low' : ''}`}>
      <td className={`py-5 px-6 font-label text-sm font-medium tracking-tight ${isFraud ? 'text-primary' : 'text-tertiary'}`}>{event.transactionId}</td>
      <td className="py-5 px-6 text-sm text-tertiary">{timeSt}</td>
      <td className="py-5 px-6">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${isFraud ? 'bg-secondary-fixed text-on-secondary-fixed' : 'bg-surface-container text-tertiary'}`}>
             {initials}
          </div>
          <span className="text-sm font-medium pr-2">{event.userId || "Unknown"}</span>
        </div>
      </td>
      <td className="py-5 px-6 text-sm font-label font-semibold text-right">{amountStr}</td>
      <td className="py-5 px-6 text-center">
        {isFraud ? (
          <span className="px-2.5 py-1 bg-error-container text-on-error-container text-[11px] font-bold rounded-full font-label uppercase tracking-wider">High Risk</span>
        ) : (
          <span className="px-2.5 py-1 bg-surface-container-highest text-tertiary text-[11px] font-bold rounded-full font-label uppercase tracking-wider">Clean</span>
        )}
      </td>
    </tr>
  );
};

export default AuditLedger;
