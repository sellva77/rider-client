import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import api from '../utils/api';
import { initSocket, disconnectSocket } from '../utils/socket';

interface User {
    id: string;
    username: string;
    full_name: string;
    bike_model?: string;
    avatar_color?: string;
    phone?: string;
    emergency_contact?: string;
}

interface AuthContextType {
    user: User | null;
    login: (username: string, password: string) => Promise<User>;
    register: (data: Record<string, string>) => Promise<User>;
    logout: () => void;
    updateUser: (updatedUser: User) => void;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const savedUser = localStorage.getItem('user');
        if (token && savedUser) {
            setUser(JSON.parse(savedUser));
            initSocket(token);
        }
        setLoading(false);
    }, []);

    const login = async (username: string, password: string): Promise<User> => {
        const res = await api.post('/auth/login', { username, password });
        const { token, user } = res.data;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        setUser(user);
        initSocket(token);
        return user;
    };

    const register = async (data: Record<string, string>): Promise<User> => {
        const res = await api.post('/auth/register', data);
        const { token, user } = res.data;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        setUser(user);
        initSocket(token);
        return user;
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        disconnectSocket();
        setUser(null);
    };

    const updateUser = (updatedUser: User) => {
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
    };

    return (
        <AuthContext.Provider value={{ user, login, register, logout, updateUser, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
};
