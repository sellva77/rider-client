import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const initSocket = (token: string): Socket => {
    if (socket) socket.disconnect();

    socket = io(import.meta.env.VITE_SOCKET_URL || window.location.origin, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
    });

    socket.on('connect', () => console.log('🔌 Socket connected'));
    socket.on('disconnect', (reason) => console.log('🔌 Socket disconnected:', reason));
    socket.on('error', (err) => console.error('Socket error:', err));

    return socket;
};

export const getSocket = (): Socket | null => socket;
export const disconnectSocket = () => { if (socket) { socket.disconnect(); socket = null; } };
