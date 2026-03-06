
interface VoicePanelProps {
    whoIsTalking: string[];
    micPermission: 'unknown' | 'granted' | 'denied';
    isTalking: boolean;
    toggleAudio: () => void;
}

export default function VoicePanel({ whoIsTalking, micPermission, isTalking, toggleAudio }: VoicePanelProps) {
    return (
        <div className="voice-panel">
            {whoIsTalking.length > 0 && (
                <div className="voice-status" style={{ color: 'var(--accent)', fontWeight: 600 }}>
                    🎙️ {whoIsTalking.join(', ')} {whoIsTalking.length === 1 ? 'is' : 'are'} talking...
                </div>
            )}
            {micPermission === 'denied' && (
                <div style={{ color: 'var(--danger)', fontSize: 12, textAlign: 'center', padding: '4px 12px', background: 'rgba(255,71,87,0.1)', borderRadius: 8, marginBottom: 8 }}>
                    ⚠️ Microphone access denied. Please allow mic in browser settings.
                </div>
            )}
            <button
                className={`ptt-btn ${isTalking ? 'talking' : ''}`}
                onClick={toggleAudio}
            >
                {isTalking ? '🎙️' : '🔇'}
            </button>
            <div className="ptt-label">
                {isTalking ? '🔴 Live Audio On' : 'Tap to enable Live Audio'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', maxWidth: 220, lineHeight: 1.5 }}>
                {micPermission === 'unknown'
                    ? 'Tap to turn ON live audio — mic permission will be requested.'
                    : 'Live audio mode. Tap to toggle your microphone on/off, just like a phone call.'
                }
            </div>
        </div>
    );
}
