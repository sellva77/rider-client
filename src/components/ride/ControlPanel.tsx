import { useState } from 'react';
import LocationInput from '../LocationInput';

interface ControlPanelProps {
    session: any;
    sessionId: string;
    socket: any;
    newDestination: string;
    setNewDestination: (dest: string) => void;
}

export default function ControlPanel({ session, sessionId, socket, newDestination, setNewDestination }: ControlPanelProps) {
    const [destLat, setDestLat] = useState<number | undefined>();
    const [destLon, setDestLon] = useState<number | undefined>();

    return (
        <div className="leader-controls">
            {session?.status === 'waiting' && (
                <button className="leader-btn btn-success" onClick={() => socket?.emit('start_ride', { sessionId })}>
                    <span className="lb-icon">🚦</span>
                    Start Ride
                </button>
            )}
            {session?.status === 'active' && (
                <button className="leader-btn btn-danger" onClick={() => {
                    if (window.confirm('End the ride for everyone?')) socket?.emit('end_ride', { sessionId });
                }}>
                    <span className="lb-icon">⏹</span>
                    End Ride
                </button>
            )}
            <button className="leader-btn btn-secondary" style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 12 }}
                onClick={() => {
                    navigator.clipboard?.writeText(session?.session_code);
                    alert(`Code copied: ${session?.session_code}`);
                }}>
                <span className="lb-icon">📋</span>
                Copy Code
            </button>

            <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>Update Destination / Next Stop</div>
                <LocationInput
                    label=""
                    placeholder="e.g. Mahabalipuram"
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
                        }
                    }}
                >
                    📍 Update Destination
                </button>
            </div>
        </div>
    );
}
