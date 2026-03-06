import { useState } from 'react';
import './index.css';
import { AuthProvider, useAuth } from './hooks/useAuth';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import RideView from './pages/RideView';

function AppInner() {
  const { user, loading } = useAuth();
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="loading-screen">
        <div style={{ fontSize: 64, marginBottom: 16 }}>🏍️</div>
        <div className="loading-spinner" />
        <div style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 12 }}>RiderConnect TN</div>
      </div>
    );
  }

  if (!user) return <AuthPage />;

  if (activeSessionId) {
    return (
      <RideView
        sessionId={activeSessionId}
        onBack={() => setActiveSessionId(null)}
      />
    );
  }

  return <Dashboard onJoinSession={setActiveSessionId} />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}
