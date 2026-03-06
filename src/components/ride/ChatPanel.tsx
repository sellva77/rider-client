import React, { type SetStateAction } from 'react';

const QUICK_REACTIONS = [
    { icon: '👍', label: "I'm OK" },
    { icon: '⚠️', label: 'Slow Down' },
    { icon: '⛽', label: 'Need Fuel' },
    { icon: '☕', label: 'Break?' },
    { icon: '🔧', label: 'Issue' },
];

export { QUICK_REACTIONS };

interface ChatPanelProps {
    allMessages: any[];
    chatMsg: string;
    setChatMsg: React.Dispatch<SetStateAction<string>>;
    sendMessage: () => void;
    sendReaction: (reaction: { icon: string; label: string }) => void;
    getInitials: (name?: string) => string;
    messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

export default function ChatPanel({
    allMessages,
    chatMsg,
    setChatMsg,
    sendMessage,
    sendReaction,
    getInitials,
    messagesEndRef
}: ChatPanelProps) {
    return (
        <div className="chat-area">
            <div className="emoji-quick-row">
                {QUICK_REACTIONS.map(r => (
                    <button key={r.label} className="emoji-btn" onClick={() => sendReaction(r)} title={r.label}>
                        {r.icon}
                    </button>
                ))}
            </div>
            <div className="messages-list">
                {allMessages.map((msg, i) => {
                    if (msg.message_type === 'system') {
                        return (
                            <div key={i} className="message-item system">
                                <span className="system-msg">{msg.content}</span>
                            </div>
                        );
                    }
                    return (
                        <div key={msg.id || i} className={`message-item ${msg.message_type === 'sos' ? 'sos' : ''}`}>
                            <div className="msg-avatar" style={{ background: msg.avatar_color || '#FF6B00' }}>
                                {getInitials(msg.full_name)}
                            </div>
                            <div className="msg-body">
                                <div className="msg-header">
                                    <span className="msg-name">{msg.full_name || msg.username}</span>
                                    {msg.message_type === 'sos' && <span style={{ fontSize: 10, background: 'var(--danger)', color: 'white', padding: '1px 5px', borderRadius: 3 }}>SOS</span>}
                                    <span className="msg-time">{new Date(msg.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <div className="msg-text">{msg.content}</div>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>
            <div className="chat-input-row">
                <input className="chat-input" placeholder="Type a message..." value={chatMsg}
                    onChange={e => setChatMsg(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendMessage()} />
                <button className="send-btn" onClick={sendMessage}>➤</button>
            </div>
        </div>
    );
}
