import React, { useState, useEffect } from 'react';

const API_BASE = "http://localhost:8080/api/audit";

const AuditLedger = () => {
  const [events, setEvents] = useState([]);
  const [query, setQuery] = useState("");

  const fetchSearch = async (q = "") => {
    try {
      const res = await fetch(`${API_BASE}/search?q=${q}`);
      const data = await res.json();
      setEvents(data);
    } catch (e) {
      console.error(e);
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
      fetchSearch(query);
    }
  };

  return (
    <div className="ml-64 mr-[400px] min-h-screen relative overflow-y-auto custom-scrollbar bg-surface font-body text-on-surface antialiased">
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
          <button className="p-2.5 bg-surface-container-low hover:bg-surface-container-high rounded-xl transition-colors border-none cursor-pointer">
            <span className="material-symbols-outlined text-on-surface-variant">tune</span>
          </button>
        </div>
      </header>

      <section className="px-10 pb-20">
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
              {events.length === 0 ? (
                <tr><td colSpan="5" className="py-10 text-center text-tertiary text-sm">No transactions found</td></tr>
              ) : (
                events.map((e, idx) => (
                  <TableRow
                    key={e.transactionId || `${e.userId || 'user'}-${e.timestamp || idx}-${idx}`}
                    event={e}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-8 flex justify-between items-center text-sm text-tertiary font-label">
          <p>Showing {Math.min(15, events.length)} of {(events.length).toLocaleString()} transactions</p>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-surface-container-low rounded-lg hover:bg-surface-container-high transition-all border-none cursor-pointer">Previous</button>
            <button className="px-4 py-2 bg-surface-container-low rounded-lg hover:bg-surface-container-high transition-all border-none cursor-pointer">Next</button>
          </div>
        </div>
      </section>

      {/* Investigation Panel - Static Mock for Audit Ledger */}
      <aside className="fixed right-0 top-0 w-[400px] h-screen bg-surface-container-lowest border-l border-surface-container-high shadow-2xl flex flex-col p-8 overflow-y-auto custom-scrollbar z-20">
         <div className="flex justify-between items-center mb-10">
            <h3 className="font-headline font-bold text-lg tracking-tight">TX-92841-B Investigation</h3>
            <button className="p-1 hover:bg-surface-container-low rounded transition-colors border-none bg-transparent cursor-pointer">
               <span className="material-symbols-outlined text-tertiary">close</span>
            </button>
         </div>
         {/* Risk Score mock */}
         <div className="mb-10 text-center">
            <div className="inline-flex flex-col items-center justify-center w-36 h-36 rounded-full border-[6px] border-error/10 relative">
               <div className="absolute inset-0 border-[6px] border-error rounded-full" style={{clipPath: "polygon(50% 50%, 50% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 10%, 50% 50%)"}}></div>
               <span className="font-headline text-5xl font-black text-error">92</span>
               <span className="font-label uppercase tracking-widest text-[10px] text-tertiary mt-1">Severity Score</span>
            </div>
         </div>
         <div className="mb-10">
            <h4 className="font-label uppercase tracking-widest text-[11px] text-tertiary mb-4 flex items-center gap-2">
               <span className="material-symbols-outlined text-[16px]">priority_high</span> Triggered Logic
            </h4>
            <div className="space-y-3">
               <div className="p-4 bg-surface-container-low rounded-xl">
                  <div className="flex justify-between items-start mb-1">
                     <span className="text-sm font-bold font-headline">Velocity Breach</span>
                     <span className="text-[10px] bg-error text-on-primary px-1.5 py-0.5 rounded font-label font-bold">CRITICAL</span>
                  </div>
                  <p className="text-xs text-tertiary leading-relaxed">Account attempted 12 micro-transactions in &lt; 2 minutes. Pattern matches automated scraping behavior.</p>
               </div>
            </div>
         </div>
      </aside>
    </div>
  );
};

const TableRow = ({ event }) => {
  const date = new Date(event.timestamp);
  const timeSt = date.toLocaleString();
  const isFraud = event.status === "BLOCKED" || event.status === "FLAGGED";
  const initials = (event.userId || "U").substring(0, 2).toUpperCase();
  const amountStr = "$" + (event.amount || 0).toFixed(2);

  return (
    <tr className={`hover:bg-surface-container-low transition-colors cursor-pointer ${isFraud ? 'bg-error/5' : ''}`}>
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
