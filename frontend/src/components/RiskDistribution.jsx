import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { ShieldCheck } from 'lucide-react';

const COLORS = {
    APPROVED: '#10b981',
    FLAGGED: '#eab308',
    BLOCKED: '#ef4444',
};

export default function RiskDistribution({ breakdown }) {
    const data = [
        { name: 'Approved', value: breakdown['APPROVED'] || 0 },
        { name: 'Flagged', value: breakdown['FLAGGED'] || 0 },
        { name: 'Blocked', value: breakdown['BLOCKED'] || 0 },
    ].filter(d => d.value > 0);

    const total = data.reduce((sum, d) => sum + d.value, 0);

    if (total === 0) {
        return (
            <div className="glass-card p-5">
                <h2 className="section-header flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                    Risk Distribution (60s)
                </h2>
                <div className="text-center text-slate-600 text-xs py-8">
                    No data in the last 60 seconds
                </div>
            </div>
        );
    }

    return (
        <div className="glass-card p-5">
            <h2 className="section-header flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                Risk Distribution (60s)
            </h2>

            <div className="flex items-center gap-6">
                <div className="w-40 h-40">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={38}
                                outerRadius={65}
                                paddingAngle={3}
                                dataKey="value"
                                stroke="none"
                            >
                                {data.map((entry) => (
                                    <Cell
                                        key={entry.name}
                                        fill={COLORS[entry.name.toUpperCase()] || '#475569'}
                                    />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#0f172a',
                                    borderColor: '#1e293b',
                                    borderRadius: '8px',
                                    fontSize: '12px',
                                    boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
                                }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                <div className="flex-1 space-y-3">
                    {data.map((entry) => {
                        const pct = ((entry.value / total) * 100).toFixed(1);
                        const color = COLORS[entry.name.toUpperCase()];
                        return (
                            <div key={entry.name} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                                    <span className="text-xs text-slate-300 font-medium">{entry.name}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-xs text-slate-500">{entry.value.toLocaleString()}</span>
                                    <span className="text-xs font-bold text-slate-300 w-12 text-right">{pct}%</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
