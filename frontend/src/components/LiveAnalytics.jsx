import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, AreaChart } from 'recharts';
import { Activity } from 'lucide-react';

export default function LiveAnalytics({ tps, chartData }) {
    return (
        <div className="glass-card p-5 flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="section-header flex items-center gap-2 mb-0">
                        <Activity className="w-3.5 h-3.5 text-emerald-400" />
                        Live Ingestion Analytics
                    </h2>
                    <p className="text-[11px] text-slate-600 mt-1">Real-time event processing over 60s window</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="bg-slate-900/70 px-4 py-2.5 rounded-xl border border-slate-700/50 flex items-center gap-3">
                        <div>
                            <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold block">Throughput</span>
                            <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-black text-white tracking-tighter">{tps}</span>
                                <span className="text-[10px] font-semibold text-emerald-500">tps</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="h-[340px] w-full bg-slate-900/30 rounded-xl p-3 border border-slate-700/30">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                        <defs>
                            <linearGradient id="gradApproved" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="gradFlagged" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#eab308" stopOpacity={0.15} />
                                <stop offset="95%" stopColor="#eab308" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="gradBlocked" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.15} />
                                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis dataKey="time" stroke="#475569" fontSize={10} tickMargin={8} />
                        <YAxis stroke="#475569" fontSize={10} tickFormatter={(val) => val} />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '10px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
                            itemStyle={{ fontSize: '12px', fontWeight: 500 }}
                            labelStyle={{ color: '#94a3b8', fontSize: '11px', marginBottom: '6px' }}
                        />
                        <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
                        <Area type="monotone" dataKey="Approved" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#gradApproved)" dot={false} activeDot={{ r: 4, fill: "#10b981", strokeWidth: 0 }} isAnimationActive={false} />
                        <Area type="monotone" dataKey="Flagged" stroke="#eab308" strokeWidth={2} fillOpacity={1} fill="url(#gradFlagged)" dot={false} activeDot={{ r: 4, fill: "#eab308", strokeWidth: 0 }} isAnimationActive={false} />
                        <Area type="monotone" dataKey="Blocked" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#gradBlocked)" dot={false} activeDot={{ r: 4, fill: "#f43f5e", strokeWidth: 0 }} isAnimationActive={false} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
