
interface RidersPanelProps {
    members: any[];
    locations: Record<string, any>;
    user: any;
    getInitials: (name?: string) => string;
}

export default function RidersPanel({ members, locations, user, getInitials }: RidersPanelProps) {
    return (
        <div className="riders-list">
            {members.map(member => {
                const loc = locations[member.id];
                const speed = loc?.speed ? Math.round(loc.speed * 3.6) : 0;
                return (
                    <div key={member.id} className="rider-item">
                        <div className="rider-avatar" style={{ background: member.avatar_color }}>
                            {getInitials(member.full_name)}
                            {loc && <div className="rider-online-dot" />}
                        </div>
                        <div className="rider-info">
                            <div className="rider-name">
                                {member.role === 'leader' && '👑 '}
                                {member.full_name}
                                {member.id === user?.id && <span style={{ fontSize: 10, color: 'var(--accent)', marginLeft: 4 }}>(You)</span>}
                            </div>
                            <div className="rider-sub">
                                {member.bike_model || 'Unknown bike'}
                                {' · '}{loc ? '🟢 Online' : '⚫ Offline'}
                            </div>
                        </div>
                        {speed > 0 && <div className="rider-speed" style={{ color: 'var(--accent)' }}>{speed}<span style={{ fontSize: 10 }}>km/h</span></div>}
                    </div>
                );
            })}
        </div>
    );
}
