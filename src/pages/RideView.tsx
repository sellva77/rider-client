import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { getSocket } from '../utils/socket';
import { useAuth } from '../hooks/useAuth';
import api from '../utils/api';
import ChatPanel from '../components/ride/ChatPanel';
import RidersPanel from '../components/ride/RidersPanel';
import SOSPanel from '../components/ride/SOSPanel';
import VoicePanel from '../components/ride/VoicePanel';
import ControlPanel from '../components/ride/ControlPanel';
import RideDetailsModal from '../components/ride/RideDetailsModal';

// Fix leaflet default marker
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const createRiderIcon = (color: string, initials: string, isLeader: boolean) => {
    return L.divIcon({
        className: '',
        html: `<div style="
      background: ${isLeader ? '#060B14' : color};
      border: 3px solid ${isLeader ? '#00E5FF' : 'rgba(255,255,255,0.6)'};
      border-radius: 50%;
      width: 40px; height: 40px;
      display: flex; align-items: center; justify-content: center;
      font-size: 13px; font-weight: 800; color: ${isLeader ? '#00E5FF' : '#060B14'};
      box-shadow: 0 2px 12px rgba(0,0,0,0.8)${isLeader ? ', 0 0 20px rgba(0,229,255,0.5)' : ''};
      font-family: 'Rajdhani', sans-serif;
    ">${isLeader ? '👑' : initials}</div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
    });
};



function MapRecenter({ lat, lng }: { lat: number; lng: number }) {
    const map = useMap();
    useEffect(() => {
        if (lat && lng) map.setView([lat, lng], map.getZoom());
    }, [lat, lng, map]);
    return null;
}

interface RideViewProps {
    sessionId: string;
    onBack: () => void;
}

export default function RideView({ sessionId, onBack }: RideViewProps) {
    const { user } = useAuth();
    const socket = getSocket();
    const [session, setSession] = useState<any>(null);
    const [members, setMembers] = useState<any[]>([]);
    const [locations, setLocations] = useState<Record<string, any>>({});
    const [messages, setMessages] = useState<any[]>([]);
    const [systemMessages, setSystemMessages] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState('map');
    const [chatMsg, setChatMsg] = useState('');
    const [sosAlerts, setSosAlerts] = useState<any[]>([]);
    const [myLocation, setMyLocation] = useState<any>(null);
    const [reactionToast, setReactionToast] = useState<string | null>(null);
    const [isTalking, setIsTalking] = useState(false);
    const [whoIsTalking, setWhoIsTalking] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [destCoords, setDestCoords] = useState<[number, number] | null>(null);
    const [startCoords, setStartCoords] = useState<[number, number] | null>(null);
    const [newDestination, setNewDestination] = useState('');
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const locationWatchRef = useRef<number | null>(null);
    const mapRef = useRef<any>(null);

    // Voice/PTT refs
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioStreamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const [micPermission, setMicPermission] = useState<'unknown' | 'granted' | 'denied'>('unknown');

    const isLeader = members.find(m => m.id === user?.id)?.role === 'leader';

    // Load session data
    useEffect(() => {
        const loadSession = async () => {
            try {
                const res = await api.get(`/sessions/${sessionId}`);
                setSession(res.data.session);
                setMembers(res.data.members);
                setMessages(res.data.messages);
            } catch (_err) {
                console.error('Failed to load session');
            } finally {
                setLoading(false);
            }
        };
        loadSession();
    }, [sessionId]);

    // Resolve start/destination coordinates (prefer DB coords, fallback to geocode)
    useEffect(() => {
        // Start location
        if (session?.start_lat && session?.start_lon) {
            setStartCoords([parseFloat(session.start_lat), parseFloat(session.start_lon)]);
        } else if (session?.start_location) {
            fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(session.start_location)}&limit=1`)
                .then(res => res.json())
                .then(data => { if (data?.length) setStartCoords([parseFloat(data[0].lat), parseFloat(data[0].lon)]); })
                .catch(() => { });
        }
        // Destination
        if (session?.dest_lat && session?.dest_lon) {
            setDestCoords([parseFloat(session.dest_lat), parseFloat(session.dest_lon)]);
        } else if (session?.destination) {
            fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(session.destination)}&limit=1`)
                .then(res => res.json())
                .then(data => { if (data?.length) setDestCoords([parseFloat(data[0].lat), parseFloat(data[0].lon)]); })
                .catch(() => { });
        }
    }, [session?.start_location, session?.start_lat, session?.destination, session?.dest_lat]);

    // Fetch driving route from OSRM when ride is active and coords are available
    useEffect(() => {
        if (!startCoords && !myLocation) return;
        if (!destCoords) return;

        // Use start marker if available, else use rider's current GPS
        const from = startCoords || [myLocation.latitude, myLocation.longitude] as [number, number];
        const to = destCoords;

        const fetchRoute = async () => {
            try {
                // OSRM expects lon,lat (not lat,lon!)
                const url = `https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`;
                const res = await fetch(url);
                const data = await res.json();
                if (data.routes && data.routes.length > 0) {
                    // GeoJSON coordinates are [lon, lat] — flip to [lat, lon] for Leaflet
                    const coords: [number, number][] = data.routes[0].geometry.coordinates.map(
                        (c: [number, number]) => [c[1], c[0]] as [number, number]
                    );
                    setRouteCoords(coords);
                }
            } catch (err) {
                console.error('Route fetch error:', err);
            }
        };

        fetchRoute();
    }, [startCoords, destCoords, myLocation?.latitude]);

    // Socket events
    useEffect(() => {
        if (!socket) return;

        socket.emit('join_session', { sessionId });

        socket.on('location_update', (data: any) => {
            setLocations(prev => ({ ...prev, [data.userId]: data }));
        });

        socket.on('all_locations', (data: any) => {
            setLocations(data);
        });

        socket.on('new_message', (msg: any) => {
            setMessages(prev => [...prev, msg]);
        });

        socket.on('message_history', (msgs: any[]) => {
            setMessages(msgs);
        });

        socket.on('members_update', (mems: any[]) => {
            setMembers(mems);
        });

        socket.on('rider_joined', (rider: any) => {
            setMembers(prev => {
                if (prev.find(m => m.id === rider.userId)) return prev;
                return [...prev, { id: rider.userId, username: rider.username, full_name: rider.full_name, avatar_color: rider.avatar_color, role: rider.role }];
            });
        });

        socket.on('rider_left', ({ userId }: { userId: string }) => {
            setLocations(prev => { const n = { ...prev }; delete n[userId]; return n; });
        });

        socket.on('system_message', (msg: any) => {
            setSystemMessages(prev => [...prev, msg]);
        });

        socket.on('sos_alert', (data: any) => {
            setSosAlerts(prev => [...prev, data]);
            setTimeout(() => setSosAlerts(prev => prev.filter(a => a.alertId !== data.alertId)), 30000);
        });

        socket.on('quick_reaction', (data: any) => {
            if (data.userId !== user?.id) {
                setReactionToast(`${data.username}: ${data.reaction}`);
                setTimeout(() => setReactionToast(null), 2000);
            }
        });

        socket.on('ride_started', () => {
            setSession((prev: any) => prev ? { ...prev, status: 'active' } : prev);
        });

        socket.on('ride_ended', () => {
            setSession((prev: any) => prev ? { ...prev, status: 'ended' } : prev);
            onBack();
        });

        socket.on('ptt_start', ({ username }: { username: string }) => setWhoIsTalking(prev => prev.includes(username) ? prev : [...prev, username]));
        socket.on('ptt_end', ({ username }: { username: string }) => setWhoIsTalking(prev => prev.filter(u => u !== username)));

        socket.on('destination_updated', ({ destination, dest_lat, dest_lon }: { destination: string; dest_lat?: number; dest_lon?: number }) => {
            setSession((prev: any) => prev ? { ...prev, destination, dest_lat, dest_lon } : prev);
            if (dest_lat && dest_lon) {
                setDestCoords([dest_lat, dest_lon]);
            }
        });

        // Receive and play audio chunks from other riders
        socket.on('ptt_audio', async (data: { userId: string; username: string; audio: ArrayBuffer }) => {
            try {
                if (!audioContextRef.current) {
                    audioContextRef.current = new AudioContext();
                }
                const ctx = audioContextRef.current;
                if (ctx.state === 'suspended') await ctx.resume();

                const audioBuffer = await ctx.decodeAudioData(data.audio.slice(0));
                const source = ctx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(ctx.destination);
                source.start();
            } catch (err) {
                // Some chunks may fail to decode, that's ok for real-time streaming
            }
        });

        return () => {
            socket.off('location_update');
            socket.off('all_locations');
            socket.off('new_message');
            socket.off('message_history');
            socket.off('members_update');
            socket.off('rider_joined');
            socket.off('rider_left');
            socket.off('system_message');
            socket.off('sos_alert');
            socket.off('quick_reaction');
            socket.off('ride_started');
            socket.off('ride_ended');
            socket.off('ptt_start');
            socket.off('ptt_end');
            socket.off('ptt_audio');
            socket.off('destination_updated');
        };
    }, [socket, sessionId, user, onBack]);

    // GPS location tracking
    useEffect(() => {
        if (!navigator.geolocation) return;

        let lastSent = 0;

        locationWatchRef.current = navigator.geolocation.watchPosition(
            (pos) => {
                const { latitude, longitude, speed, heading, accuracy } = pos.coords;
                setMyLocation({ latitude, longitude, speed: speed || 0, heading });

                const now = Date.now();
                if (now - lastSent > 5000 && socket) {
                    socket.emit('location_update', { sessionId, latitude, longitude, speed, heading, accuracy });
                    lastSent = now;
                }
            },
            (err) => console.warn('GPS error:', err.message),
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 3000 }
        );

        return () => {
            if (locationWatchRef.current) navigator.geolocation.clearWatch(locationWatchRef.current);
        };
    }, [socket, sessionId]);



    // Auto-scroll chat
    useEffect(() => {
        if (activeTab === 'chat') {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, activeTab]);

    const sendMessage = () => {
        if (!chatMsg.trim()) return;
        socket?.emit('send_message', { sessionId, content: chatMsg.trim() });
        setChatMsg('');
    };

    const sendSOS = () => {
        if (!myLocation) {
            alert('Cannot send SOS: GPS location not available. Please enable location access.');
            return;
        }
        socket?.emit('sos_alert', {
            sessionId,
            latitude: myLocation.latitude,
            longitude: myLocation.longitude,
            message: `🆘 SOS from ${user?.full_name}! Need immediate help!`
        });
    };

    const sendReaction = (reaction: { icon: string; label: string }) => {
        socket?.emit('quick_reaction', { sessionId, reaction: reaction.icon });
        setReactionToast(`You: ${reaction.icon}`);
        setTimeout(() => setReactionToast(null), 1500);
    };

    const startPTT = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioStreamRef.current = stream;
            setMicPermission('granted');
            setIsTalking(true);
            socket?.emit('ptt_start', { sessionId });

            // Initialize AudioContext for playback if not already
            if (!audioContextRef.current) {
                audioContextRef.current = new AudioContext();
            }

            const recorder = new MediaRecorder(stream, {
                mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                    ? 'audio/webm;codecs=opus'
                    : 'audio/webm'
            });
            mediaRecorderRef.current = recorder;

            recorder.ondataavailable = async (e) => {
                if (e.data.size > 0 && socket) {
                    const arrayBuffer = await e.data.arrayBuffer();
                    socket.emit('ptt_audio', { sessionId, audio: arrayBuffer });
                }
            };

            // Send audio chunks every 200ms for near-real-time
            recorder.start(200);
        } catch (err) {
            console.error('Mic access error:', err);
            setMicPermission('denied');
            setIsTalking(false);
        }
    };

    const stopPTT = () => {
        setIsTalking(false);
        socket?.emit('ptt_end', { sessionId });

        // Stop MediaRecorder
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current = null;
        }

        // Stop mic stream tracks
        if (audioStreamRef.current) {
            audioStreamRef.current.getTracks().forEach(track => track.stop());
            audioStreamRef.current = null;
        }
    };

    const toggleAudio = async () => {
        if (isTalking) {
            stopPTT();
        } else {
            await startPTT();
        }
    };

    const getInitials = (name?: string) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '??';

    const centerOnMe = () => {
        if (myLocation && mapRef.current) {
            mapRef.current.setView([myLocation.latitude, myLocation.longitude], 15);
        }
    };

    if (loading) {
        return (
            <div className="loading-screen">
                <div className="loading-spinner" />
                <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading ride session...</div>
            </div>
        );
    }

    const allMarkers: Record<string, any> = { ...locations };
    if (myLocation) {
        allMarkers[user?.id || ''] = { ...myLocation, userId: user?.id, username: user?.username, full_name: user?.full_name, avatar_color: user?.avatar_color, role: isLeader ? 'leader' : 'rider', isMe: true };
    }

    const defaultCenter: [number, number] = myLocation ? [myLocation.latitude, myLocation.longitude] : [13.0827, 80.2707]; // Chennai default

    const allMessages = [...messages, ...systemMessages.map(s => ({ ...s, message_type: 'system', id: Math.random() }))].sort((a, b) => new Date(a.created_at || a.timestamp).getTime() - new Date(b.created_at || b.timestamp).getTime());

    return (
        <div className="ride-view">
            {/* SOS Toast Alerts */}
            {sosAlerts.map((alert, i) => (
                <div key={alert.alertId} className="sos-alert-toast" style={{ top: 80 + i * 80 }}>
                    🆘 SOS from <strong>{alert.full_name}</strong>!
                    <div style={{ fontSize: 11, marginTop: 4 }}>Tap map to see location</div>
                </div>
            ))}

            {/* Reaction Toast */}
            {reactionToast && (
                <div className="reaction-toast">{reactionToast}</div>
            )}

            {/* Map */}
            <div className="map-container">
                <div className="ride-header">
                    <button className="back-btn" onClick={onBack}>←</button>
                    <div className="ride-badge" onClick={() => setShowDetailsModal(true)} style={{ cursor: 'pointer' }} title="Click for details & settings">
                        <div className="ride-badge-name">🏍️ {session?.name}</div>
                        <div className="ride-badge-meta">
                            Code: <strong style={{ color: 'var(--accent)' }}>{session?.session_code}</strong>
                            {' · '}{members.length} riders
                            {' · '}<span className={`status-badge status-${session?.status}`}>{session?.status}</span>
                        </div>
                        {session?.destination && (
                            <div className="ride-badge-meta" style={{ marginTop: 2, color: 'var(--text-secondary)' }}>
                                🏁 To: <strong>{session.destination}</strong>
                            </div>
                        )}
                    </div>
                    <button className="back-btn" onClick={centerOnMe} title="Center on me">📍</button>
                </div>

                <MapContainer
                    center={defaultCenter}
                    zoom={13}
                    style={{ height: '100%', width: '100%' }}
                    ref={mapRef}
                    zoomControl={false}
                >
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
                    />
                    {myLocation && <MapRecenter lat={myLocation.latitude} lng={myLocation.longitude} />}

                    {/* Route polyline */}
                    {routeCoords.length > 0 && (
                        <>
                            {/* Glow effect (thicker, semi-transparent) */}
                            <Polyline
                                positions={routeCoords}
                                pathOptions={{ color: '#00E5FF', weight: 8, opacity: 0.25, lineCap: 'round', lineJoin: 'round' }}
                            />
                            {/* Main route line */}
                            <Polyline
                                positions={routeCoords}
                                pathOptions={{ color: '#00E5FF', weight: 4, opacity: 0.85, dashArray: '12 6', lineCap: 'round', lineJoin: 'round' }}
                            />
                        </>
                    )}

                    {/* Starting Point Marker */}
                    {startCoords && (
                        <Marker position={startCoords} icon={L.divIcon({
                            className: '',
                            html: `<div style="background:#00E676;border:3px solid #111;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 0 10px rgba(0,230,118,0.5);">📍</div>`,
                            iconSize: [32, 32],
                            iconAnchor: [16, 16]
                        })}>
                            <Popup>
                                <div style={{ background: '#111D2E', color: '#E8F4FF', padding: '8px 12px', borderRadius: 8, border: '1px solid #1E3050' }}>
                                    <div style={{ color: '#00E676', fontWeight: 700, fontSize: 13, marginBottom: 4 }}>📍 Starting Point</div>
                                    <div style={{ fontSize: 12 }}>{session?.start_location}</div>
                                </div>
                            </Popup>
                        </Marker>
                    )}

                    {/* Destination Marker */}
                    {destCoords && (
                        <Marker position={destCoords} icon={L.divIcon({
                            className: '',
                            html: `<div style="background:#FFF;border:3px solid #111;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 0 10px rgba(0,0,0,0.5);">🏁</div>`,
                            iconSize: [32, 32],
                            iconAnchor: [16, 16]
                        })}>
                            <Popup>
                                <div style={{ background: '#111D2E', color: '#E8F4FF', padding: '8px 12px', borderRadius: 8, border: '1px solid #1E3050' }}>
                                    <div style={{ color: '#00E5FF', fontWeight: 700, fontSize: 13, marginBottom: 4 }}>🏁 Final Destination</div>
                                    <div style={{ fontSize: 12 }}>{session.destination}</div>
                                </div>
                            </Popup>
                        </Marker>
                    )}

                    {Object.values(allMarkers).map((loc: any) => {
                        const memberData = members.find(m => m.id === loc.userId) || {} as any;
                        const role = loc.role || memberData.role || 'rider';
                        const color = loc.avatar_color || memberData.avatar_color || '#FF6B00';
                        const name = loc.full_name || memberData.full_name || 'Rider';
                        const initials = getInitials(name);
                        const icon = createRiderIcon(color, initials, role === 'leader');

                        return (
                            <Marker key={loc.userId} position={[loc.latitude, loc.longitude]} icon={icon}>
                                <Popup>
                                    <div style={{ background: '#111D2E', color: '#E8F4FF', padding: 8, borderRadius: 8, minWidth: 140, border: '1px solid #1E3050' }}>
                                        <div style={{ fontWeight: 700, fontSize: 14 }}>{name} {loc.userId === user?.id ? '(You)' : ''}</div>
                                        <div style={{ fontSize: 11, color: '#4A6580', marginTop: 4 }}>
                                            {role === 'leader' ? '👑 Leader' : '🏍️ Rider'}
                                        </div>
                                        {loc.speed > 0 && <div style={{ fontSize: 12, color: '#00E5FF', marginTop: 4 }}>🚀 {Math.round(loc.speed * 3.6)} km/h</div>}
                                        {sosAlerts.find(a => a.userId === loc.userId) && (
                                            <div style={{ color: '#FF4757', fontWeight: 700, marginTop: 4 }}>🆘 NEEDS HELP!</div>
                                        )}
                                    </div>
                                </Popup>
                            </Marker>
                        );
                    })}

                    {/* SOS markers */}
                    {sosAlerts.map(alert => (
                        <Marker key={`sos-${alert.alertId}`} position={[alert.latitude, alert.longitude]}
                            icon={L.divIcon({
                                className: '',
                                html: `<div style="background:#FF3B3B;border-radius:50%;width:44px;height:44px;display:flex;align-items:center;justify-content:center;font-size:22px;box-shadow:0 0 20px rgba(255,59,59,0.8);animation:pulse 1s infinite;">🆘</div>`,
                                iconSize: [44, 44], iconAnchor: [22, 22]
                            })}>
                            <Popup>
                                <div style={{ background: '#111D2E', color: '#E8F4FF', padding: 8, borderRadius: 8, border: '1px solid #FF4757' }}>
                                    <div style={{ color: '#FF4757', fontWeight: 700 }}>🆘 SOS ALERT</div>
                                    <div style={{ fontSize: 12 }}>{alert.full_name} needs help!</div>
                                </div>
                            </Popup>
                        </Marker>
                    ))}
                </MapContainer>
            </div>

            {/* Bottom Panel */}
            <div className="bottom-panel">
                <div className="panel-tabs">
                    {[
                        { id: 'chat', icon: '💬', label: 'Chat' },
                        { id: 'riders', icon: '👥', label: 'Riders' },
                        { id: 'sos', icon: '🆘', label: 'SOS' },
                        { id: 'voice', icon: '🎙️', label: 'Voice' },
                        ...(isLeader ? [{ id: 'leader', icon: '👑', label: 'Control' }] : []),
                    ].map(tab => (
                        <button key={tab.id} className={`panel-tab ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>
                            <span className="tab-icon">{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="panel-content">
                    {activeTab === 'chat' && (
                        <ChatPanel
                            allMessages={allMessages}
                            chatMsg={chatMsg}
                            setChatMsg={setChatMsg}
                            sendMessage={sendMessage}
                            sendReaction={sendReaction}
                            getInitials={getInitials}
                            messagesEndRef={messagesEndRef}
                        />
                    )}

                    {activeTab === 'riders' && (
                        <RidersPanel
                            members={members}
                            locations={locations}
                            user={user}
                            getInitials={getInitials}
                        />
                    )}

                    {activeTab === 'sos' && (
                        <SOSPanel sendSOS={sendSOS} sendReaction={sendReaction} />
                    )}

                    {activeTab === 'voice' && (
                        <VoicePanel
                            whoIsTalking={whoIsTalking}
                            micPermission={micPermission}
                            isTalking={isTalking}
                            toggleAudio={toggleAudio}
                        />
                    )}

                    {activeTab === 'leader' && isLeader && (
                        <ControlPanel
                            session={session}
                            sessionId={sessionId}
                            socket={socket}
                            newDestination={newDestination}
                            setNewDestination={setNewDestination}
                        />
                    )}
                </div>
            </div>

            {/* RIDE DETAILS & ADMIN MODAL */}
            {showDetailsModal && (
                <RideDetailsModal
                    session={session}
                    sessionId={sessionId}
                    isLeader={isLeader}
                    socket={socket}
                    newDestination={newDestination}
                    setNewDestination={setNewDestination}
                    setShowDetailsModal={setShowDetailsModal}
                />
            )}
        </div>
    );
}
