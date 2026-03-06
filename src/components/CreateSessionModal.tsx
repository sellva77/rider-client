import { useState } from 'react';
import api from '../utils/api';
import LocationInput from './LocationInput';

interface CreateSessionModalProps {
    onCreated: (session: any) => void;
    onClose: () => void;
}

export default function CreateSessionModal({ onCreated, onClose }: CreateSessionModalProps) {
    const [name, setName] = useState('');
    const [startLocation, setStartLocation] = useState('');
    const [startCoords, setStartCoords] = useState<{ lat: number; lon: number } | null>(null);
    const [destination, setDestination] = useState('');
    const [destCoords, setDestCoords] = useState<{ lat: number; lon: number } | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleCreate = async () => {
        if (!name) return setError('Ride name is required');
        setLoading(true);
        setError('');
        try {
            const res = await api.post('/sessions/create', {
                name,
                start_location: startLocation,
                destination,
                start_lat: startCoords?.lat,
                start_lon: startCoords?.lon,
                dest_lat: destCoords?.lat,
                dest_lon: destCoords?.lon,
            });
            onCreated(res.data.session);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to create session');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-handle" />
                <div className="modal-title">➕ Create Ride Session</div>

                {error && <div className="error-message">⚠️ {error}</div>}

                <div className="form-group">
                    <label className="form-label">Ride Name *</label>
                    <input className="form-input" placeholder="e.g. ECR Sunday Ride" value={name}
                        onChange={e => setName(e.target.value)} />
                </div>

                <LocationInput
                    label="Starting Point"
                    placeholder="e.g. Marina Beach, Chennai"
                    value={startLocation}
                    onChange={(val, lat, lon) => {
                        setStartLocation(val);
                        if (lat !== undefined && lon !== undefined) {
                            setStartCoords({ lat, lon });
                        }
                    }}
                />

                <LocationInput
                    label="Destination"
                    placeholder="e.g. Mahabalipuram"
                    value={destination}
                    onChange={(val, lat, lon) => {
                        setDestination(val);
                        if (lat !== undefined && lon !== undefined) {
                            setDestCoords({ lat, lon });
                        }
                    }}
                />

                {/* Mini preview of selected locations */}
                {(startCoords || destCoords) && (
                    <div style={{
                        background: 'var(--bg-elevated)',
                        borderRadius: 8,
                        padding: '8px 12px',
                        marginBottom: 8,
                        fontSize: 11,
                        color: 'var(--text-muted)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4,
                    }}>
                        {startCoords && (
                            <div>📍 Start: <span style={{ color: 'var(--accent)' }}>{startLocation}</span></div>
                        )}
                        {startCoords && destCoords && (
                            <div style={{ textAlign: 'center', fontSize: 14 }}>↓</div>
                        )}
                        {destCoords && (
                            <div>🏁 End: <span style={{ color: 'var(--accent)' }}>{destination}</span></div>
                        )}
                    </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8 }}>
                    <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleCreate} disabled={loading}>
                        {loading ? '⏳...' : '🏍️ Create'}
                    </button>
                </div>
            </div>
        </div>
    );
}
