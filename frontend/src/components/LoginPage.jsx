import React, { useState, useEffect } from 'react';
import { Shield, Lock, User, Eye, EyeOff, Activity, Zap, AlertTriangle } from 'lucide-react';

const DEMO_USERS = [
    { username: 'admin', password: 'admin123', role: 'Admin', userId: 'admin-001' },
    { username: 'analyst', password: 'analyst123', role: 'Analyst', userId: 'analyst-002' },
    { username: 'demo', password: 'demo', role: 'Demo', userId: 'user-123' },
];

export default function LoginPage({ onLogin }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [particles, setParticles] = useState([]);

    // Generate floating particles for background
    useEffect(() => {
        const pts = Array.from({ length: 18 }, (_, i) => ({
            id: i,
            x: Math.random() * 100,
            y: Math.random() * 100,
            size: Math.random() * 3 + 1,
            duration: Math.random() * 8 + 6,
            delay: Math.random() * 4,
        }));
        setParticles(pts);
    }, []);

    const handleSubmit = (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        setTimeout(() => {
            const user = DEMO_USERS.find(
                (u) => u.username === username && u.password === password
            );
            if (user) {
                onLogin(user);
            } else {
                setError('Invalid credentials. Try admin / admin123');
                setLoading(false);
            }
        }, 900);
    };

    return (
        <div className="login-page">
            {/* Animated mesh background */}
            <div className="login-bg-mesh" />
            <div className="login-bg-orb login-bg-orb-1" />
            <div className="login-bg-orb login-bg-orb-2" />
            <div className="login-bg-orb login-bg-orb-3" />

            {/* Floating grid lines */}
            <div className="login-grid-overlay" />

            {/* Floating particles */}
            {particles.map((p) => (
                <div
                    key={p.id}
                    className="login-particle"
                    style={{
                        left: `${p.x}%`,
                        top: `${p.y}%`,
                        width: `${p.size}px`,
                        height: `${p.size}px`,
                        animationDuration: `${p.duration}s`,
                        animationDelay: `${p.delay}s`,
                    }}
                />
            ))}

            {/* Center card */}
            <div className="login-card-wrapper">
                {/* Top status bar */}
                <div className="login-status-bar">
                    <div className="login-status-dot" />
                    <span>All Systems Operational</span>
                    <span className="login-status-version">v1.0</span>
                </div>

                <div className="login-card">
                    {/* Logo area */}
                    <div className="login-logo-area">
                        <div className="login-shield-wrap">
                            <Shield className="login-shield-icon" />
                            <div className="login-shield-ring" />
                            <div className="login-shield-ring login-shield-ring-2" />
                        </div>
                        <div>
                            <h1 className="login-title">ShieldGate</h1>
                            <p className="login-subtitle">Fraud Detection Command Center</p>
                        </div>
                    </div>

                    {/* Stats mini row */}
                    <div className="login-mini-stats">
                        <div className="login-mini-stat">
                            <Activity className="w-3 h-3 text-emerald-400" />
                            <span>Live</span>
                        </div>
                        <div className="login-mini-stat">
                            <Zap className="w-3 h-3 text-amber-400" />
                            <span>Real-time</span>
                        </div>
                        <div className="login-mini-stat">
                            <Shield className="w-3 h-3 text-blue-400" />
                            <span>Secure</span>
                        </div>
                    </div>

                    <div className="login-divider">
                        <span>Sign in to continue</span>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="login-form">
                        {/* Username */}
                        <div className="login-field">
                            <label className="login-label">Username</label>
                            <div className="login-input-wrap">
                                <User className="login-input-icon" />
                                <input
                                    type="text"
                                    className="login-input"
                                    placeholder="Enter username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    autoComplete="username"
                                    required
                                />
                                <div className="login-input-focus-bar" />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="login-field">
                            <label className="login-label">Password</label>
                            <div className="login-input-wrap">
                                <Lock className="login-input-icon" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    className="login-input"
                                    placeholder="Enter password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    autoComplete="current-password"
                                    required
                                />
                                <button
                                    type="button"
                                    className="login-eye-btn"
                                    onClick={() => setShowPassword(!showPassword)}
                                    tabIndex={-1}
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                                <div className="login-input-focus-bar" />
                            </div>
                        </div>

                        {/* Error message */}
                        {error && (
                            <div className="login-error">
                                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="login-btn"
                        >
                            <span className="login-btn-bg" />
                            {loading ? (
                                <span className="login-btn-content">
                                    <span className="login-spinner" />
                                    Authenticating...
                                </span>
                            ) : (
                                <span className="login-btn-content">
                                    <Shield className="w-4 h-4" />
                                    Access Dashboard
                                </span>
                            )}
                        </button>
                    </form>

                    {/* Demo hint */}
                    <div className="login-demo-hint">
                        <span>Demo:</span>
                        <code>admin</code> / <code>admin123</code>
                    </div>
                </div>

                {/* Bottom security note */}
                <p className="login-footer">
                    🔒 Secured with end-to-end encryption · ShieldGate 2026
                </p>
            </div>
        </div>
    );
}
