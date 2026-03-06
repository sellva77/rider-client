import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../utils/api';
import CreateSessionModal from '../components/CreateSessionModal';
import JoinSessionModal from '../components/JoinSessionModal';
import ProfileModal from '../components/ProfileModal';

interface DashboardProps {
    onJoinSession: (sessionId: string) => void;
}

function formatDuration(seconds: number | null): string {
    if (!seconds) return '—';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
}

function formatDate(dateStr: string | null): string {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(dateStr: string | null): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

export default function Dashboard({ onJoinSession }: DashboardProps) {
    const { user, logout } = useAuth();
    const [sessions, setSessions] = useState<any[]>([]);
    const [history, setHistory] = useState<any[]>([]);
    const [showCreate, setShowCreate] = useState(false);
    const [showJoin, setShowJoin] = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    const [loading, setLoading] = useState(true);
    const [historyLoading, setHistoryLoading] = useState(true);

    useEffect(() => {
        fetchSessions();
        fetchHistory();
    }, []);

    const fetchSessions = async () => {
        try {
            const res = await api.get('/sessions/my');
            setSessions(res.data.sessions);
        } catch (_err) {
            console.error('Failed to fetch sessions');
        } finally {
            setLoading(false);
        }
    };

    const fetchHistory = async () => {
        try {
            const res = await api.get('/sessions/history');
            setHistory(res.data.history);
        } catch (_err) {
            console.error('Failed to fetch ride history');
        } finally {
            setHistoryLoading(false);
        }
    };

    const handleSessionCreated = (session: any) => {
        setShowCreate(false);
        onJoinSession(session.id);
    };

    const handleSessionJoined = (session: any) => {
        setShowJoin(false);
        onJoinSession(session.id);
    };

    const getInitials = (name?: string) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '??';

    return (
        <div className="dashboard">
            <div className="dashboard-header">
                <div className="header-brand">
                    <span>🏍️</span>
                    <span>RiderConnect</span>
                </div>
                <div className="header-actions">
                    <button className="icon-btn" onClick={() => setShowProfile(true)} title="Profile">👤</button>
                    <button className="icon-btn" onClick={logout} title="Logout">🚪</button>
                </div>
            </div>

            <div className="dashboard-content">
                {/* User greeting */}
                <div style={{ padding: '8px 0 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="rider-avatar" style={{ background: user?.avatar_color, width: 48, height: 48, fontSize: 18, border: '2px solid var(--accent)', boxShadow: 'var(--shadow-accent)' }}>
                        {getInitials(user?.full_name)}
                    </div>
                    <div>
                        <div style={{ fontFamily: 'Rajdhani', fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>
                            Welcome, {user?.full_name?.split(' ')[0]}!
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            {user?.bike_model || 'Set your bike model in profile'}
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="quick-actions">
                    <button className="quick-action-btn" onClick={() => setShowCreate(true)}>
                        <span className="qa-icon">➕</span>
                        <span className="qa-label">Create Ride</span>
                        <span className="qa-sub">Start as Leader</span>
                    </button>
                    <button className="quick-action-btn" onClick={() => setShowJoin(true)}>
                        <span className="qa-icon">🔗</span>
                        <span className="qa-label">Join Ride</span>
                        <span className="qa-sub">Enter code</span>
                    </button>
                </div>

                {/* Active Sessions */}
                <div className="section-title">
                    🏍️ Your Active Rides
                    <button onClick={() => { fetchSessions(); fetchHistory(); }} style={{ background: 'none', color: 'var(--orange)', fontSize: 14, marginLeft: 'auto' }}>
                        ↻ Refresh
                    </button>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Loading...</div>
                ) : sessions.length === 0 ? (
                    <div className="empty-state">
                        <span className="es-icon">🛣️</span>
                        <p>No active rides yet.<br />Create or join a ride to get started!</p>
                    </div>
                ) : (
                    sessions.map(session => (
                        <div key={session.id} className="session-card" onClick={() => onJoinSession(session.id)}>
                            <div className="session-card-header">
                                <div className="session-name">{session.name}</div>
                                <div className="session-code">{session.session_code}</div>
                            </div>
                            <div className="session-meta">
                                <span>👥 {session.member_count} riders</span>
                                {session.destination && <span>📍 → {session.destination}</span>}
                                <span style={{ marginLeft: 'auto' }}>
                                    <span className={`status-badge status-${session.status}`}>
                                        {session.status === 'waiting' ? '⏳ Waiting' : session.status === 'active' ? '🟢 Live' : '⏹ Ended'}
                                    </span>
                                </span>
                            </div>
                            {session.role === 'leader' && (
                                <div style={{ marginTop: 6, fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>
                                    👑 You are the Leader
                                </div>
                            )}
                        </div>
                    ))
                )}

                {/* Ride History */}
                <div className="section-title" style={{ marginTop: 28 }}>
                    📜 Ride History
                </div>

                {historyLoading ? (
                    <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: 13 }}>Loading history...</div>
                ) : history.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: 13 }}>
                        No past rides yet. Your completed rides will appear here.
                    </div>
                ) : (
                    <div className="history-list">
                        {history.map(ride => (
                            <div key={ride.id} className="history-card">
                                <div className="history-card-left">
                                    <div className="history-date-badge">
                                        <span className="history-day">{ride.ended_at ? new Date(ride.ended_at).getDate() : '—'}</span>
                                        <span className="history-month">{ride.ended_at ? new Date(ride.ended_at).toLocaleString('en-IN', { month: 'short' }) : ''}</span>
                                    </div>
                                </div>
                                <div className="history-card-body">
                                    <div className="history-card-header">
                                        <div className="history-ride-name">{ride.name}</div>
                                        <div className="history-code-badge">{ride.session_code}</div>
                                    </div>

                                    <div className="history-route">
                                        {ride.start_location && (
                                            <span>📍 {ride.start_location}</span>
                                        )}
                                        {ride.start_location && ride.destination && (
                                            <span className="history-route-arrow">→</span>
                                        )}
                                        {ride.destination && (
                                            <span>🏁 {ride.destination}</span>
                                        )}
                                    </div>

                                    <div className="history-stats">
                                        <div className="history-stat">
                                            <span className="history-stat-icon">👥</span>
                                            <span>{ride.total_riders} rider{ride.total_riders !== '1' ? 's' : ''}</span>
                                        </div>
                                        <div className="history-stat">
                                            <span className="history-stat-icon">⏱️</span>
                                            <span>{formatDuration(ride.duration_seconds)}</span>
                                        </div>
                                        <div className="history-stat">
                                            <span className="history-stat-icon">🕐</span>
                                            <span>{formatTime(ride.started_at)} – {formatTime(ride.ended_at)}</span>
                                        </div>
                                    </div>

                                    <div className="history-footer">
                                        <div className="history-leader">
                                            <div className="history-leader-dot" style={{ background: ride.leader_color || 'var(--accent)' }}></div>
                                            <span>Led by {ride.role === 'leader' ? 'You' : ride.leader_name}</span>
                                        </div>
                                        <span className="history-date-label">{formatDate(ride.ended_at)}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Tips */}
                <div style={{ marginTop: 24, padding: 16, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', borderLeft: '3px solid var(--accent)' }}>
                    <div style={{ fontFamily: 'Rajdhani', fontSize: 16, fontWeight: 700, marginBottom: 8, color: 'var(--accent)' }}>
                        🏍️ Riding Tips
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.8 }}>
                        • Share the ride code with your group members<br />
                        • Leader starts and ends the ride session<br />
                        • Tap SOS immediately if you need help<br />
                        • Keep location ON for real-time tracking<br />
                        • Works best on Jio/Airtel 4G networks
                    </div>
                </div>
            </div>

            {showCreate && <CreateSessionModal onCreated={handleSessionCreated} onClose={() => setShowCreate(false)} />}
            {showJoin && <JoinSessionModal onJoined={handleSessionJoined} onClose={() => setShowJoin(false)} />}
            {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
        </div>
    );
}
