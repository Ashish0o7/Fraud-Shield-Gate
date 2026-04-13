import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { API } from '../config/api';

const Sidebar = () => {
  const [showInvestigateModal, setShowInvestigateModal] = useState(false);
  const [txId, setTxId] = useState('');
  const [investigating, setInvestigating] = useState(false);
  const [investigateResult, setInvestigateResult] = useState(null);
  const [investigateError, setInvestigateError] = useState(null);
  const navigate = useNavigate();
  const handleInvestigate = async (e) => {
    e.preventDefault();
    if (!txId.trim()) return;
    setInvestigating(true);
    setInvestigateResult(null);
    setInvestigateError(null);
    try {
      const res = await fetch(`${API.audit}/search?q=${encodeURIComponent(txId.trim())}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data || data.length === 0) {
        setInvestigateError('No transaction found with that ID.');
      } else {
        setInvestigateResult(data[0]);
      }
    } catch {
      setInvestigateError('Could not reach the audit service. Ensure the fraud-detection service is running on :8080.');
    } finally {
      setInvestigating(false);
    }
  };

  const navLinkClass = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-3 transition-all duration-300 rounded-lg ${
      isActive
        ? 'bg-surface-container-lowest text-on-surface border-l-2 border-secondary translate-x-1'
        : 'text-tertiary hover:text-on-surface hover:bg-surface-container-highest'
    }`;

  const isFraud = investigateResult && (investigateResult.status === 'BLOCKED' || investigateResult.status === 'FLAGGED');

  return (
    <>
      <aside className="h-screen w-64 fixed left-0 top-0 flex flex-col p-4 border-r border-surface-container-low bg-surface-container-low font-label uppercase tracking-widest text-[11px] z-20">
        <div className="mb-10 px-2">
          <h1 className="text-xl font-black text-on-surface tracking-tighter">SHIELDGATE</h1>
          <p className="text-[10px] text-tertiary mt-1 opacity-70">Fraud Engine v2.1 · India</p>
        </div>

        <nav className="flex-1 space-y-1">
          <NavLink to="/" end className={navLinkClass}>
            <span className="material-symbols-outlined text-lg">dashboard</span>
            <span>Dashboard</span>
          </NavLink>

          <NavLink to="/audit" className={navLinkClass}>
            <span className="material-symbols-outlined text-lg">receipt_long</span>
            <span>Transactions</span>
          </NavLink>

          <NavLink to="/ml-models" className={navLinkClass}>
            <span className="material-symbols-outlined text-lg">model_training</span>
            <span>ML Models</span>
          </NavLink>

          <NavLink to="/health" className={navLinkClass}>
            <span className="material-symbols-outlined text-lg">monitor_heart</span>
            <span>Health</span>
          </NavLink>

          <NavLink to="/settings" className={navLinkClass}>
            <span className="material-symbols-outlined text-lg">settings</span>
            <span>Settings</span>
          </NavLink>
        </nav>

        <div className="mt-auto pt-6 border-t border-surface-container-highest space-y-1">
          <button
            onClick={() => { setShowInvestigateModal(true); setInvestigateResult(null); setInvestigateError(null); setTxId(''); }}
            className="w-full mb-4 px-4 py-2 bg-primary text-on-primary rounded-xl text-[10px] font-bold hover:opacity-90 transition-opacity flex justify-center items-center gap-2 border-none cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">add</span> New Investigation
          </button>
        </div>
      </aside>

      {/* New Investigation Modal */}
      {showInvestigateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl w-full max-w-lg shadow-2xl font-body normal-case tracking-normal">
            <div className="p-6 border-b border-surface-container-low flex items-center justify-between">
              <div>
                <h3 className="font-headline font-bold text-lg">New Investigation</h3>
                <p className="text-xs text-tertiary font-label mt-0.5">Look up any transaction by ID from the audit ledger</p>
              </div>
              <button
                onClick={() => setShowInvestigateModal(false)}
                className="p-1.5 hover:bg-surface-container-low rounded-lg transition-colors border-none bg-transparent cursor-pointer"
              >
                <span className="material-symbols-outlined text-tertiary">close</span>
              </button>
            </div>

            <form onSubmit={handleInvestigate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold font-label uppercase tracking-widest text-tertiary mb-2">Transaction ID</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={txId}
                    onChange={e => setTxId(e.target.value)}
                    placeholder="e.g. 3fa85f64-5717-4562-b3fc..."
                    className="flex-1 px-4 py-2.5 bg-surface-container-low border-none rounded-xl text-sm font-label focus:ring-2 focus:ring-primary/30 outline-none"
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={investigating || !txId.trim()}
                    className="px-4 py-2.5 bg-primary text-on-primary rounded-xl text-xs font-bold font-label hover:opacity-90 transition-opacity border-none cursor-pointer disabled:opacity-50"
                  >
                    {investigating ? '...' : 'Search'}
                  </button>
                </div>
              </div>

              {investigateError && (
                <div className="p-3 bg-error-container rounded-xl text-xs text-error font-label font-bold flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">error</span>
                  {investigateError}
                </div>
              )}

              {investigateResult && (
                <div className={`p-4 rounded-xl border ${isFraud ? 'bg-error/5 border-error/20' : 'bg-[#e6f9f0] border-[#34c97b]/20'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`material-symbols-outlined text-base ${isFraud ? 'text-error' : 'text-[#1a7a46]'}`}>
                        {isFraud ? 'warning' : 'verified'}
                      </span>
                      <span className={`text-xs font-bold font-label uppercase tracking-widest ${isFraud ? 'text-error' : 'text-[#1a7a46]'}`}>
                        {investigateResult.status}
                      </span>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold font-label uppercase tracking-wider ${isFraud ? 'bg-error-container text-error' : 'bg-[#e6f9f0] text-[#1a7a46]'}`}>
                      Risk: {investigateResult.riskScore ?? 0}/100
                    </span>
                  </div>
                  <div className="space-y-2 text-xs font-label">
                    <div className="flex justify-between">
                      <span className="text-tertiary">Transaction ID</span>
                      <span className="font-bold truncate ml-4 max-w-[55%]">{investigateResult.transactionId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-tertiary">User</span>
                      <span className="font-bold">{investigateResult.userId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-tertiary">Amount</span>
                      <span className="font-bold">₹{Number(investigateResult.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-tertiary">Location</span>
                      <span className="font-bold">{investigateResult.location}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-tertiary">Category</span>
                      <span className="font-bold">{investigateResult.merchantCategory}</span>
                    </div>
                    {investigateResult.riskReason && (
                      <div className="pt-2 border-t border-outline-variant/10">
                        <span className="text-tertiary block mb-1">Risk Reason</span>
                        <span className="font-bold text-error">{investigateResult.riskReason}</span>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowInvestigateModal(false);
                      navigate('/audit');
                    }}
                    className="mt-3 text-[10px] font-label font-bold text-primary hover:underline bg-transparent border-none cursor-pointer"
                  >
                    View in Transactions →
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
