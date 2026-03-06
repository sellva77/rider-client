import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

export default function AuthPage() {
    const { login, register } = useAuth();
    const [mode, setMode] = useState<'login' | 'register'>('login');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [form, setForm] = useState({
        username: '', password: '', full_name: '',
        phone: '', bike_model: '', emergency_contact: ''
    });

    const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

    const handleSubmit = async () => {
        setError('');
        setLoading(true);
        try {
            if (mode === 'login') {
                await login(form.username, form.password);
            } else {
                if (!form.full_name) { setError('Full name is required'); setLoading(false); return; }
                await register(form);
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-bg" />
            <div className="auth-card">
                <div className="auth-logo">
                    <span className="logo-icon">🏍️</span>
                    <h1>RiderConnect</h1>
                    <p>Tamil Nadu Biker Community</p>
                </div>

                {error && <div className="error-message">⚠️ {error}</div>}

                <div className="form-group">
                    <label className="form-label">Username</label>
                    <input className="form-input" placeholder="your_username" value={form.username}
                        onChange={e => set('username', e.target.value)} autoCapitalize="none" />
                </div>

                {mode === 'register' && (
                    <div className="form-group">
                        <label className="form-label">Full Name</label>
                        <input className="form-input" placeholder="Your Full Name" value={form.full_name}
                            onChange={e => set('full_name', e.target.value)} />
                    </div>
                )}

                <div className="form-group">
                    <label className="form-label">Password</label>
                    <input className="form-input" type="password" placeholder="••••••••" value={form.password}
                        onChange={e => set('password', e.target.value)} />
                </div>

                {mode === 'register' && (
                    <>
                        <div className="form-group">
                            <label className="form-label">Phone Number</label>
                            <input className="form-input" placeholder="+91 98765 43210" value={form.phone}
                                onChange={e => set('phone', e.target.value)} type="tel" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Bike Model</label>
                            <input className="form-input" placeholder="e.g. Royal Enfield Classic 350" value={form.bike_model}
                                onChange={e => set('bike_model', e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Emergency Contact</label>
                            <input className="form-input" placeholder="Family member's number" value={form.emergency_contact}
                                onChange={e => set('emergency_contact', e.target.value)} type="tel" />
                        </div>
                    </>
                )}

                <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={handleSubmit} disabled={loading}>
                    {loading ? '⏳ Please wait...' : mode === 'login' ? '🏍️ Start Riding' : '🚀 Create Account'}
                </button>

                <div className="auth-switch">
                    {mode === 'login' ? "New rider?" : "Already have account?"}
                    <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>
                        {mode === 'login' ? 'Register here' : 'Login'}
                    </button>
                </div>
            </div>
        </div>
    );
}
