import { QUICK_REACTIONS } from './ChatPanel';

interface SOSPanelProps {
    sendSOS: () => void;
    sendReaction: (reaction: { icon: string; label: string }) => void;
}

export default function SOSPanel({ sendSOS, sendReaction }: SOSPanelProps) {
    return (
        <div className="sos-panel">
            <button className="sos-btn" onClick={sendSOS}>
                <span className="sos-icon">🆘</span>
                SOS
            </button>
            <div className="quick-reactions-row">
                {QUICK_REACTIONS.map(r => (
                    <div key={r.label} className="reaction-item" onClick={() => sendReaction(r)}>
                        <span className="r-icon">{r.icon}</span>
                        <span className="r-label">{r.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
