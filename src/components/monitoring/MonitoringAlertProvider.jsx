/**
 * MonitoringAlertProvider.jsx
 *
 * Global context that:
 *  1. Connects to the trip-service Socket.IO server once (for the entire app session).
 *  2. Joins the fleet-manager's room so drowsiness events are delivered.
 *  3. Fires a react-hot-toast alert on ANY page when a DROWSY event arrives.
 *  4. Exposes `useMonitoringContext()` so the LiveMonitoringDashboard can reuse
 *     the same socket + driverStatuses state without creating a second connection.
 */

import React, {
    createContext,
    useContext,
    useEffect,
    useRef,
    useState,
    useCallback,
} from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';

// ─── Constants ────────────────────────────────────────────────────────────────

const TRIP_SERVICE_URL =
    import.meta.env.VITE_TRIP_SERVICE_URL ||
    import.meta.env.VITE_API_URL ||
    'http://localhost:5004';

// ─── Context ──────────────────────────────────────────────────────────────────

const MonitoringContext = createContext(null);

export const useMonitoringContext = () => {
    const ctx = useContext(MonitoringContext);
    if (!ctx) throw new Error('useMonitoringContext must be used inside MonitoringAlertProvider');
    return ctx;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getUserFromStorage = () => {
    try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; }
};

const formatDriverId = (id) => {
    if (!id) return 'Unknown';
    return typeof id === 'string' ? `${id.slice(0, 6)}…${id.slice(-4)}` : String(id).slice(0, 10);
};

// ─── Provider ─────────────────────────────────────────────────────────────────

const MonitoringAlertProvider = ({ children }) => {
    const socketRef = useRef(null);

    /** Map of driverId → latest telemetry { status, perclos, ear, timestamp, lastSeen } */
    const [driverStatuses, setDriverStatuses] = useState({});
    const [socketReady, setSocketReady] = useState(false);

    // Only connect for fleet-manager role
    const user = getUserFromStorage();
    const isFleetManager =
        user?.role === 'fleetmanager' ||
        localStorage.getItem('userRole') === 'fleetmanager';

    useEffect(() => {
        if (!isFleetManager) return; // skip for drivers / admins

        const socket = io(TRIP_SERVICE_URL, {
            transports: ['websocket', 'polling'],
            reconnection: true,
        });

        socket.on('connect', () => {
            console.log('[MonitoringProvider] Socket connected:', socket.id);
            setSocketReady(true);

            const u = getUserFromStorage();
            if (u?.id || u?._id) {
                socket.emit('join-fleet-room', u.id || u._id);
            }
        });

        socket.on('disconnect', () => {
            console.log('[MonitoringProvider] Socket disconnected');
            setSocketReady(false);
        });

        // ── Receive driver telemetry ──────────────────────────────────────
        socket.on('admin_monitoring', (data) => {
            const { driverId, status, perclos, ear, timestamp, driverName } = data;
            if (!driverId) return;

            // Update driver status map
            setDriverStatuses(prev => ({
                ...prev,
                [driverId]: {
                    ...prev[driverId],
                    driverId,
                    driverName: driverName || null,
                    status,
                    perclos: perclos ?? 0,
                    ear: ear ?? 0,
                    timestamp: timestamp || new Date().toISOString(),
                    lastSeen: new Date(),
                },
            }));

            // Global alert toast for DROWSY — shown on ANY page
            if (status === 'DROWSY') {
                const name = driverName || formatDriverId(driverId);
                const perclosPct = ((perclos || 0) * 100).toFixed(1);

                toast.error(
                    (t) => (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <strong style={{ fontSize: '0.95rem' }}>
                                🚨 Drowsiness Alert
                            </strong>
                            <span style={{ fontSize: '0.85rem' }}>
                                <strong>{name}</strong> is showing signs of drowsiness.
                            </span>
                            <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                                PERCLOS: {perclosPct}%
                            </span>
                        </div>
                    ),
                    {
                        duration: 10000,
                        id: `drowsy-${driverId}`, // deduplicate rapid-fire events
                        style: {
                            background: '#dc2626',
                            color: '#fff',
                            maxWidth: 360,
                        },
                    }
                );
            }
        });

        socketRef.current = socket;

        return () => {
            socket.disconnect();
            socketRef.current = null;
        };
    }, [isFleetManager]);

    // ── Mark driver as offline if no update in >30 s ──────────────────────
    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            setDriverStatuses(prev => {
                const next = { ...prev };
                let changed = false;
                Object.keys(next).forEach(id => {
                    const lastSeen = next[id].lastSeen ? new Date(next[id].lastSeen).getTime() : 0;
                    if (now - lastSeen > 30_000 && next[id].status !== 'OFFLINE') {
                        next[id] = { ...next[id], status: 'OFFLINE' };
                        changed = true;
                    }
                });
                return changed ? next : prev;
            });
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    const value = {
        socketRef,
        socketReady,
        driverStatuses,
    };

    return (
        <MonitoringContext.Provider value={value}>
            {children}
        </MonitoringContext.Provider>
    );
};

export default MonitoringAlertProvider;
