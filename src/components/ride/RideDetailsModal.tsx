import { useState } from 'react';
import LocationInput from '../LocationInput';

interface RideDetailsModalProps {
    session: any;
    sessionId: string;
    isLeader: boolean;
    socket: any;
    newDestination: string;
    setNewDestination: (dest: string) => void;
    setShowDetailsModal: (show: boolean) => void;
}

export default function RideDetailsModal({
    session,
    sessionId,
    isLeader,
    socket,
    newDestination,
    setNewDestination,
    setShowDetailsModal
}: RideDetailsModalProps) {
    const [destLat, setDestLat] = useState<number | undefined>();
    const [destLon, setDestLon] = useState<number | undefined>();

    return (
        <div className="modal-overlay" onClick={() => setShowDetailsModal(false)} style={{ zIndex: 9999 }}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-handle" />
                <div className="modal-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>🏍️ Ride Details</span>
                    <span className={`status-badge status-${session?.status}`} style={{ fontSize: 12 }}>{session?.status}</span>
                </div>

                <div style={{ background: 'var(--bg-elevated)', padding: 12, borderRadius: 8, marginBottom: 16 }}>
                    <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Ride Name</div>
                    <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>{session?.name}</div>

                    <div style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 8 }}>Ride Code</div>
                    <div style={{ fontWeight: 600, fontSize: 18, color: 'var(--accent)', letterSpacing: 2 }}>{session?.session_code}</div>

                    {session?.start_location && (
                        <>
                            <div style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 12 }}>Starting Point</div>
                            <div style={{ fontWeight: 600, fontSize: 14 }}>📍 {session.start_location}</div>
                        </>
                    )}

                    {session?.destination && (
                        <>
                            <div style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 12 }}>Destination</div>
                            <div style={{ fontWeight: 600, fontSize: 14 }}>🏁 {session.destination}</div>
                        </>
                    )}
                </div>

                {/* Leader specific controls inside the modal */}
                {isLeader && (
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 16 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>👑 Leader Settings</div>

                        {session?.status === 'waiting' && (
                            <button className="btn btn-primary" style={{ width: '100%', marginBottom: 12, background: 'var(--success)', borderColor: 'var(--success)' }} onClick={() => {
                                socket?.emit('start_ride', { sessionId });
                                setShowDetailsModal(false);
                            }}>
                                🚦 Start Ride
                            </button>
                        )}
                        {session?.status === 'active' && (
                            <button className="btn btn-primary" style={{ width: '100%', marginBottom: 12, background: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={() => {
                                if (window.confirm('End the ride for everyone?')) {
                                    socket?.emit('end_ride', { sessionId });
                                    setShowDetailsModal(false);
                                }
                            }}>
                                ⏹ End Ride
                            </button>
                        )}

                        <div style={{ marginBottom: 8, fontSize: 12, color: 'var(--text-secondary)' }}>Update Next Stop</div>
                        <LocationInput
                            label=""
                            placeholder="New destination..."
                            value={newDestination}
                            onChange={(val, lat, lon) => {
                                setNewDestination(val);
                                setDestLat(lat);
                                setDestLon(lon);
                            }}
                        />
                        <button
                            className="btn btn-primary"
                            style={{ width: '100%', marginTop: 8 }}
                            onClick={() => {
                                if (newDestination.trim()) {
                                    socket?.emit('update_destination', {
                                        sessionId,
                                        destination: newDestination.trim(),
                                        dest_lat: destLat,
                                        dest_lon: destLon,
                                    });
                                    setNewDestination('');
                                    setShowDetailsModal(false);
                                }
                            }}
                        >
                            📍 Update Destination
                        </button>
                    </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 24 }}>
                    <button className="btn btn-secondary" onClick={() => setShowDetailsModal(false)}>Close</button>
                    <button className="btn btn-primary" onClick={() => {
                        navigator.clipboard?.writeText(session?.session_code || '');
                        setShowDetailsModal(false);
                    }}>
                        📋 Copy Code
                    </button>
                </div>
            </div>
        </div>
    );
}
