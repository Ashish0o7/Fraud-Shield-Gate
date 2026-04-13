import React, { useEffect, useState } from 'react';

const API_BASE = "http://localhost:8080/api/audit";

const Dashboard = () => {
  const [stats, setStats] = useState({ totalOverall: 0, recentBreakdown: {} });
  const [signals, setSignals] = useState([]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`${API_BASE}/stats`);
        const data = await res.json();
        setStats(data);
      } catch (e) {
        console.error(e);
      }
    };

    const fetchSignals = async () => {
      try {
        const res = await fetch(`${API_BASE}/latest`);
        const data = await res.json();
        setSignals(data);
      } catch (e) {
        console.error(e);
      }
    };

    fetchStats();
    fetchSignals();
    
    const statsInterval = setInterval(fetchStats, 5000);
    const signalInterval = setInterval(fetchSignals, 5000);
    
    return () => {
      clearInterval(statsInterval);
      clearInterval(signalInterval);
    };
  }, []);

  const totalAnalyzed = stats.totalOverall || 0;
  const clean = stats.recentBreakdown?.["APPROVED"] || 0;
  const blocked = stats.recentBreakdown?.["BLOCKED"] || 0;
  const flagged = stats.recentBreakdown?.["FLAGGED"] || 0;
  const fraud = blocked + flagged;
  const totalRecent = clean + fraud;
  const fraudRate = totalRecent === 0 ? "0.00%" : ((fraud / totalRecent) * 100).toFixed(2) + "%";
  const alertsSent = fraud || 0;

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
            />
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4">
             <span className="material-symbols-outlined text-tertiary hover:bg-surface-container-highest p-2 rounded cursor-pointer transition-colors border-none bg-transparent">sensors</span>
             <span className="material-symbols-outlined text-tertiary hover:bg-surface-container-highest p-2 rounded cursor-pointer transition-colors border-none bg-transparent">notifications</span>
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
           <MetricCard title="Total Analyzed" value={totalAnalyzed.toLocaleString()} delta="+12%" primary />
           <MetricCard title="Fraud Rate" value={fraudRate} delta="-0.05%" secondary />
           <MetricCard title="Alerts Sent" value={alertsSent.toLocaleString()} delta="Stable" />
           <MetricCard title="Scoring Latency" value="14ms" delta="-2ms" primary />
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <section className="lg:col-span-2 space-y-6">
            <div className="bg-surface-container-lowest p-8 rounded-xl shadow-[0px_12px_32px_rgba(27,27,27,0.04)] border border-outline-variant/5 h-full min-h-[400px] flex flex-col">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h3 className="text-lg font-bold tracking-tight font-headline">Traffic Volume Intelligence</h3>
                  <p className="text-tertiary text-sm mt-1">Comparison of legitimate vs detected fraudulent requests.</p>
                </div>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-4 rounded-full bg-primary/20"></div>
                    <span className="font-label text-[10px] font-bold text-tertiary">CLEAN</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-4 rounded-full bg-secondary"></div>
                    <span className="font-label text-[10px] font-bold text-tertiary">FRAUD</span>
                  </div>
                </div>
              </div>
              <div className="flex-1 w-full relative group">
                <div className="absolute inset-0 flex items-end justify-between px-2 gap-1 overflow-hidden">
                  <div className="w-full h-full flex items-end justify-between">
                     <Bar height="60%" /><Bar height="65%" /><Bar height="55%" /><Bar height="70%" />
                     <Bar height="85%" warning /><Bar height="75%" /><Bar height="60%" /><Bar height="68%" />
                     <Bar height="90%" warning /><Bar height="82%" /><Bar height="70%" /><Bar height="78%" />
                  </div>
                </div>
                <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
                  <path className="text-secondary opacity-80" d="M0 80 Q 25 70, 50 85 T 100 75" fill="none" stroke="currentColor" strokeWidth="0.5"></path>
                  <path className="text-primary opacity-20" d="M0 40 Q 25 35, 50 45 T 100 30" fill="none" stroke="currentColor" strokeWidth="0.5"></path>
                </svg>
              </div>
              <div className="mt-4 flex justify-between border-t border-outline-variant/10 pt-4 font-label text-[10px] text-tertiary/60">
                <span>00:00</span><span>04:00</span><span>08:00</span><span>12:00</span><span>16:00</span><span>20:00</span>
              </div>
            </div>
          </section>
          
          <aside className="space-y-6">
            <div className="bg-surface-container-lowest p-6 rounded-xl shadow-[0px_12px_32px_rgba(27,27,27,0.04)] border border-outline-variant/5 flex flex-col h-full max-h-[400px]">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-black tracking-tight uppercase font-headline">Signal Stream</h3>
                <span className="material-symbols-outlined text-secondary animate-pulse text-sm">radio</span>
              </div>
              <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
                {signals.length === 0 ? (
                    <div className="text-xs text-tertiary">Waiting for signals...</div>
                ) : (
                  signals.map((s, idx) => (
                    <SignalRow
                      key={s.transactionId || s.id || `${s.userId || 'signal'}-${s.timestamp || idx}-${idx}`}
                      event={s}
                    />
                  ))
                )}
              </div>
              <button className="mt-4 text-[10px] font-label font-bold text-primary uppercase tracking-widest text-center hover:underline cursor-pointer bg-transparent border-none">View Live Feed</button>
            </div>
          </aside>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 bg-surface-container-lowest rounded-xl shadow-[0px_12px_32px_rgba(27,27,27,0.04)] border border-outline-variant/5 overflow-hidden">
             <div className="p-6 border-b border-surface-container-low flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-black tracking-tight uppercase font-headline">Hotspot Clusters</h3>
                  <p className="text-[10px] text-tertiary">Visualizing density of suspicious actor origins</p>
                </div>
                <div className="flex gap-2">
                   <span className="px-2 py-1 bg-surface-container-low rounded text-[10px] font-bold text-tertiary">ASIA PACIFIC</span>
                   <span className="px-2 py-1 bg-primary/10 rounded text-[10px] font-bold text-primary">EUROPE CENTRAL</span>
                </div>
             </div>
             <div className="h-64 relative bg-surface-container-low flex items-center justify-center">
                <img className="absolute inset-0 w-full h-full object-cover opacity-50 grayscale contrast-125" src="https://lh3.googleusercontent.com/aida-public/AB6AXuA6LYDgXqWPSvt3gXuw4pv9AOpSL4T1tHIdhFIrJRJpKX4VJTq7LUlxwKVjaQo00ExnY43zz6-Blmrrq7RC_9SqtT1myM8Z0LtXHgwsy4K14aL0ib1rZZpn1L5c7wO8zoo3Wkq9sPi4ZEOA8D5rzDZFGglaiKpmLTUTNM5PwdkbbB5_0DFeosRlUhY7YOaG5LtULloNKKY9IBjsKQFG7SUNaBsHNrqF3WCjYUy7SazkzewsAQYJszFq53t1Av-GQJ9Oi6aA1HWTeDw"/>
                <div className="absolute top-1/3 left-1/4 h-4 w-4 bg-secondary rounded-full ring-4 ring-secondary/20 animate-pulse"></div>
                <div className="absolute bottom-1/2 right-1/3 h-3 w-3 bg-secondary rounded-full ring-4 ring-secondary/20 opacity-70"></div>
                <div className="absolute top-2/3 right-1/4 h-2 w-2 bg-secondary rounded-full ring-2 ring-secondary/20"></div>
             </div>
          </div>
          
          <div className="space-y-6">
            <div className="bg-surface-container-lowest p-6 rounded-xl shadow-[0px_12px_32px_rgba(27,27,27,0.04)] border border-outline-variant/5">
               <p className="font-label text-[10px] uppercase tracking-wider text-tertiary font-bold mb-4">ML Confidence</p>
               <div className="flex items-center justify-between">
                  <span className="text-2xl font-black">99.8%</span>
                  <span className="material-symbols-outlined text-primary">verified</span>
               </div>
               <div className="w-full bg-surface-container-low h-1 mt-4 rounded-full overflow-hidden">
                 <div className="bg-primary h-full" style={{width: '99.8%'}}></div>
               </div>
            </div>
            <div className="bg-surface-container-lowest p-6 rounded-xl shadow-[0px_12px_32px_rgba(27,27,27,0.04)] border border-outline-variant/5">
               <p className="font-label text-[10px] uppercase tracking-wider text-tertiary font-bold mb-4">Compute Load</p>
               <div className="flex items-center justify-between">
                  <span className="text-2xl font-black">34.2%</span>
                  <span className="material-symbols-outlined text-tertiary">memory</span>
               </div>
               <div className="w-full bg-surface-container-low h-1 mt-4 rounded-full overflow-hidden">
                 <div className="bg-on-tertiary-fixed-variant h-full" style={{width: '34.2%'}}></div>
               </div>
            </div>
          </div>
        </div>
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

const Bar = ({ height, warning }) => (
  <div className={`flex-1 mx-0.5 rounded-t-sm transition-colors ${warning ? 'bg-primary/20' : 'bg-surface-container-low hover:bg-primary/10'}`} style={{ height }}></div>
);

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
          Ref: {ref} • Score: {event.anomalyScore ? event.anomalyScore.toFixed(3) : 0}
        </p>
      </div>
    </div>
  );
};

export default Dashboard;
