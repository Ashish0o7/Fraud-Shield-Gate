import React, { useState, useEffect, useRef } from 'react';
import { Terminal, WifiOff } from 'lucide-react';

export default function LiveTicker({ API_BASE, latestEvent }) {
    const [events, setEvents] = useState([]);
    const [wsStatus, setWsStatus] = useState('connecting');
    const wsRef = useRef(null);
    const reconnectTimeout = useRef(null);

    // Initial fetch
    useEffect(() => {
        const fetchLatest = async () => {
            try {
                const res = await fetch(`${API_BASE}/audit/latest`);
                if (res.ok) {
                    const data = await res.json();
                    setEvents(data || []);
                }
            } catch (e) {
                // Backend might not be running
            }
        };
        fetchLatest();
    }, [API_BASE]);

    // Push manual
    useEffect(() => {
        if (latestEvent) {
            setEvents(curr => {
                const next = [latestEvent, ...curr];
                if (next.length > 20) next.length = 20;
                return next;
            });
        }
    }, [latestEvent]);

    // WebSocket Connection with auto-reconnect and throttling
    useEffect(() => {
        let ws;
        let flushInterval;
        const messageQueue = [];

        const connect = () => {
            const wsUrl = API_BASE.replace('http', 'ws').replace('/api', '/ws/transactions');
            ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onopen = () => {
                setWsStatus('connected');
            };

            ws.onmessage = (event) => {
                try {
                    const newEv = JSON.parse(event.data);
                    messageQueue.push(newEv);
                } catch (err) {
                    // ignore parse errors
                }
            };

            ws.onclose = () => {
                setWsStatus('disconnected');
                reconnectTimeout.current = setTimeout(connect, 3000);
            };

            ws.onerror = () => {
                setWsStatus('disconnected');
                ws.close();
            };
        };

        connect();

        // Flush queue to state every 500ms to prevent React re-render lag during flood
        flushInterval = setInterval(() => {
            if (messageQueue.length > 0) {
                const batchedEvents = [...messageQueue].reverse(); // newest first
                messageQueue.length = 0; // clear queue

                setEvents(curr => {
                    // We only take the newest 50 to prevent DOM bloat
                    const next = [...batchedEvents, ...curr];

                    // Deduplicate by transactionId just in case
                    const unique = [];
                    const seen = new Set();
                    for (const item of next) {
                        if (!seen.has(item.transactionId)) {
                            seen.add(item.transactionId);
                            unique.push(item);
                        }
                    }

                    if (unique.length > 50) unique.length = 50;
                    return unique;
                });
            }
        }, 500);

        return () => {
            if (wsRef.current) wsRef.current.close();
            if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
            clearInterval(flushInterval);
        };
    }, [API_BASE]);

    const getStatusColor = (status) => {
        switch (status) {
            case 'APPROVED': return 'badge-approved';
            case 'FLAGGED': return 'badge-flagged';
            case 'BLOCKED': return 'badge-blocked';
            default: return 'text-slate-400 bg-slate-400/10';
        }
    };

    return (
        <div className="glass-card overflow-hidden flex flex-col h-[700px]">
            {/* Header */}
            <div className="bg-slate-800/40 px-4 py-3 border-b border-slate-700/40 flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-slate-400" />
                <span className="section-header mb-0">Live Event Stream</span>
                <div className="ml-auto flex items-center gap-2">
                    {wsStatus === 'connected' ? (
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 pulse-dot" />
                            <span className="text-[9px] text-emerald-500 font-semibold uppercase">Live</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5">
                            <WifiOff className="w-3 h-3 text-slate-500" />
                            <span className="text-[9px] text-slate-500 font-semibold uppercase">Reconnecting...</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Events */}
            <div className="flex-1 p-3 overflow-y-auto space-y-2 font-mono text-xs">
                {events.length === 0 && (
                    <div className="text-slate-600 text-center mt-16 flex flex-col items-center gap-3">
                        <Terminal className="w-8 h-8 text-slate-700" />
                        <span className="text-[11px]">Awaiting transactions...</span>
                        <span className="text-[10px] text-slate-700">Send a transaction or run the flood test</span>
                    </div>
                )}
                {events.map((ev, i) => (
                    <div
                        key={ev.transactionId || i}
                        className="border-l-2 border-slate-700/50 pl-3 py-1.5 hover:bg-slate-800/20 rounded-r-lg transition-colors fade-in-up"
                    >
                        <div className="flex justify-between items-start mb-1">
                            <span className="text-blue-400 font-medium text-[11px]">{ev.userId}</span>
                            <span className={`px-2 py-[1px] rounded text-[8px] font-bold tracking-wider ${getStatusColor(ev.status)}`}>
                                {ev.status}
                            </span>
                        </div>
                        <div className="text-slate-400 flex justify-between text-[10px]">
                            <span>
                                ₹{ev.amount?.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                {' • '}
                                <span className="text-slate-500">{ev.merchantCategory}</span>
                            </span>
                            <span className="text-slate-600">{ev.location}</span>
                        </div>
                        {ev.riskReason && (
                            <div className="text-rose-400/80 mt-0.5 text-[10px] italic">› {ev.riskReason}</div>
                        )}
                        <div className="mt-1 text-slate-700 text-[8px]">
                            {ev.transactionId?.toString().substring(0, 8)}... • {ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString([], { hour12: false, second: '2-digit' }) : ''}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
