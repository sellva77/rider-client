import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../utils/api';

interface ProfileModalProps {
    onClose: () => void;
}

export default function ProfileModal({ onClose }: ProfileModalProps) {
    const { user, updateUser, logout } = useAuth();
    const [form, setForm] = useState({
        full_name: user?.full_name || '',
        phone: user?.phone || '',
        bike_model: user?.bike_model || '',
        emergency_contact: user?.emergency_contact || ''
    });
    const [loading, setLoading] = useState(false);
    const [saved, setSaved] = useState(false);

    const getInitials = (name?: string) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '??';

    const handleSave = async () => {
        setLoading(true);
        try {
            const res = await api.put('/auth/profile', form);
            updateUser(res.data.user);
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch (_err) {
            console.error('Save failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-handle" />
                <div className="modal-title">👤 My Profile</div>

                <div className="profile-header">
                    <div className="profile-avatar" style={{ background: user?.avatar_color }}>
                        {getInitials(user?.full_name)}
                    </div>
                    <div>
                        <div className="profile-name">{user?.full_name}</div>
                        <div className="profile-username">@{user?.username}</div>
                    </div>
                </div>

                <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <input className="form-input" value={form.full_name}
                        onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
                </div>
                <div className="form-group">
                    <label className="form-label">Phone Number</label>
                    <input className="form-input" value={form.phone} type="tel"
                        onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+91 98765 43210" />
                </div>
                <div className="form-group">
                    <label className="form-label">Bike Model</label>
                    <input className="form-input" value={form.bike_model}
                        onChange={e => setForm(f => ({ ...f, bike_model: e.target.value }))} placeholder="Royal Enfield Classic 350" />
                </div>
                <div className="form-group">
                    <label className="form-label">🆘 Emergency Contact</label>
                    <input className="form-input" value={form.emergency_contact} type="tel"
                        onChange={e => setForm(f => ({ ...f, emergency_contact: e.target.value }))} placeholder="Family member number" />
                </div>

                <button className="btn btn-primary" onClick={handleSave} disabled={loading} style={{ marginBottom: 10 }}>
                    {saved ? '✅ Saved!' : loading ? '⏳ Saving...' : '💾 Save Profile'}
                </button>
                <button className="btn btn-secondary" onClick={onClose} style={{ marginBottom: 10 }}>Close</button>
                <button className="btn btn-danger" onClick={() => { logout(); onClose(); }}>🚪 Logout</button>
            </div>
        </div>
    );
}
