import { useState } from 'react';
import api from '../utils/api';

interface JoinSessionModalProps {
    onJoined: (session: any) => void;
    onClose: () => void;
}

export default function JoinSessionModal({ onJoined, onClose }: JoinSessionModalProps) {
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleJoin = async () => {
        if (!code || code.length < 4) return setError('Enter a valid session code');
        setLoading(true);
        setError('');
        try {
            const res = await api.post(`/sessions/join/${code.trim().toUpperCase()}`);
            onJoined(res.data.session);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to join. Check the code.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-handle" />
                <div className="modal-title">🔗 Join a Ride</div>

                {error && <div className="error-message">⚠️ {error}</div>}

                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.6 }}>
                    Get the 6-character code from your ride leader and enter it below to join the group.
                </p>

                <div className="form-group">
                    <label className="form-label">Session Code</label>
                    <input
                        className="form-input"
                        placeholder="e.g. AB1C2D"
                        value={code}
                        onChange={e => setCode(e.target.value.toUpperCase())}
                        maxLength={8}
                        style={{ fontSize: 24, textAlign: 'center', letterSpacing: 6, fontFamily: 'Rajdhani', fontWeight: 700 }}
                    />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8 }}>
                    <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleJoin} disabled={loading}>
                        {loading ? '⏳...' : '🤝 Join Ride'}
                    </button>
                </div>
            </div>
        </div>
    );
}
