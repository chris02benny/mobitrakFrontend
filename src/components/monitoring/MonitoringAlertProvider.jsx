/**
 * MonitoringAlertProvider.jsx
 *
 * Global context that:
 *  1. Connects to Pusher once (for the entire app session) for fleet managers.
 *  2. Subscribes to "global-monitoring" channel to receive drowsiness events from all drivers.
 *  3. Also subscribes to "fleet-{managerId}" for fleet-manager-specific events.
 *  4. Fires a react-hot-toast alert on ANY page when a DROWSY event arrives.
 *  5. Exposes `useMonitoringContext()` so the LiveMonitoringDashboard can reuse
 *     the same Pusher channel + driverStatuses state without creating a second connection.
 *
 * NOTE: Pusher replaces Socket.IO. The "global-monitoring" channel is subscribed
 * to by all fleet managers; the backend triggers events on it via Pusher SDK.
 */

import React, {
    createContext,
    useContext,
    useEffect,
    useRef,
    useState,
} from 'react';
import Pusher from 'pusher-js';
import toast from 'react-hot-toast';

// ─── Constants ────────────────────────────────────────────────────────────────

const PUSHER_KEY = import.meta.env.VITE_PUSHER_KEY || '3c443eb0dc81a17f2142';
const PUSHER_CLUSTER = import.meta.env.VITE_PUSHER_CLUSTER || 'ap2';

// ─── Context ──────────────────────────────────────────────────────────────────

const MonitoringContext = createContext(null);

export const useMonitoringContext = () => {
    const ctx = useContext(MonitoringContext);
    if (!ctx) throw new Error('useMonitoringContext must be used inside MonitoringAlertProvider');
    return ctx;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getUserFromStorage = () => {
    try {
        // First, try to get user from localStorage
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            const user = JSON.parse(storedUser);
            if (user && user._id) return user;
        }
        
        // Fallback: Extract from JWT token
        const token = localStorage.getItem('authToken');
        if (token) {
            try {
                const payload = token.split('.')[1];
                if (payload) {
                    const decoded = JSON.parse(atob(payload));
                    console.log('[monitoring] Full JWT payload (MonitoringProvider):', decoded);
                    
                    // JWT structure: {user: {...}, iat, exp}
                    // The actual user object is NESTED under the 'user' key
                    if (decoded.user && typeof decoded.user === 'object') {
                        const userObj = decoded.user;
                        console.log('[monitoring] Extracted user from JWT.user:', userObj);
                        const userId = userObj._id || userObj.id || userObj.userId || userObj.sub;
                        
                        return {
                            _id: userId,
                            id: userId,
                            role: userObj.role,
                            email: userObj.email
                        };
                    }
                }
            } catch (_) {
                return {};
            }
        }
        
        return {};
    } catch {
        return {};
    }
};

const formatDriverId = (id) => {
    if (!id) return 'Unknown';
    return typeof id === 'string' ? `${id.slice(0, 6)}…${id.slice(-4)}` : String(id).slice(0, 10);
};

// ─── Provider ─────────────────────────────────────────────────────────────────

const MonitoringAlertProvider = ({ children }) => {
    const pusherRef = useRef(null);
    const channelRef = useRef(null);

    /** Map of driverId → latest telemetry { status, perclos, ear, timestamp, lastSeen } */
    const [driverStatuses, setDriverStatuses] = useState({});
    const [socketReady, setSocketReady] = useState(false);

    // Only connect for fleet-manager role
    const user = getUserFromStorage();
    const isFleetManager =
        user?.role === 'fleetmanager' ||
        localStorage.getItem('userRole') === 'fleetmanager';

    useEffect(() => {
        if (!isFleetManager) return;

        // Connect to Pusher
        const pusherClient = new Pusher(PUSHER_KEY, {
            cluster: PUSHER_CLUSTER,
        });

        pusherRef.current = pusherClient;

        pusherClient.connection.bind('connected', () => {
            console.log('[MonitoringProvider] Pusher connected');
            setSocketReady(true);
        });

        pusherClient.connection.bind('disconnected', () => {
            console.log('[MonitoringProvider] Pusher disconnected');
            setSocketReady(false);
        });

        // Subscribe to global monitoring channel (all drivers broadcast here)
        const globalChannel = pusherClient.subscribe('global-monitoring');
        channelRef.current = globalChannel;

        // Also subscribe to this fleet manager's private channel
        const u = getUserFromStorage();
        const managerId = u?.id || u?._id;
        if (managerId) {
            const fleetChannel = pusherClient.subscribe(`fleet-${managerId}`);
            // Bind admin_monitoring on fleet channel too (data arrives on both)
            fleetChannel.bind('admin_monitoring', handleMonitoringData);
        }

        // Bind admin_monitoring event on global channel
        globalChannel.bind('admin_monitoring', handleMonitoringData);

        return () => {
            try {
                if (channelRef.current) {
                    channelRef.current.unbind_all();
                }
                pusherClient.unsubscribe('global-monitoring');
                if (managerId) {
                    pusherClient.unsubscribe(`fleet-${managerId}`);
                }
                // Only disconnect if connection is not already closed
                if (pusherClient.connection && pusherClient.connection.state !== 'closed') {
                    pusherClient.disconnect();
                }
            } catch (err) {
                console.warn('[MonitoringProvider] Cleanup error (expected if already disconnected):', err.message);
            }
            pusherRef.current = null;
            channelRef.current = null;
        };
    }, [isFleetManager]);

    // ── Handle incoming monitoring data ───────────────────────────────────────
    function handleMonitoringData(data) {
        const { driverId, status, healthStatus, monitoringActive, perclos, ear, timestamp, driverName } = data;
        if (!driverId) return;

        setDriverStatuses(prev => ({
            ...prev,
            [driverId]: {
                ...prev[driverId],
                driverId,
                driverName: driverName || null,
                status: healthStatus || status, // Use healthStatus if provided, else status
                monitoringActive: monitoringActive !== undefined ? monitoringActive : true, // Default to true
                perclos: perclos ?? 0,
                ear: ear ?? 0,
                timestamp: timestamp || new Date().toISOString(),
                lastSeen: new Date(),
            },
        }));

        // Global alert toast for DROWSY — only when drive is actively monitoring
        const isCorelyMonitoring = monitoringActive !== undefined ? monitoringActive : true;
        const isDrowsy = (healthStatus || status) === 'DROWSY';
        
        if (isDrowsy && isCorelyMonitoring) {
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
                    id: `drowsy-${driverId}`,
                    style: {
                        background: '#dc2626',
                        color: '#fff',
                        maxWidth: 360,
                    },
                }
            );
        }
    }

    // ── Mark driver as offline if no update in >30 s ──────────────────────
    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            setDriverStatuses(prev => {
                const next = { ...prev };
                let changed = false;
                Object.keys(next).forEach(id => {
                    const lastSeen = next[id].lastSeen ? new Date(next[id].lastSeen).getTime() : 0;
                    const timeSinceLastSeen = now - lastSeen;
                    
                    // Only mark OFFLINE if >30s AND not already INACTIVE (explicit stop event)
                    if (timeSinceLastSeen > 30_000 && next[id].status !== 'OFFLINE' && next[id].status !== 'INACTIVE') {
                        next[id] = { ...next[id], status: 'OFFLINE', monitoringActive: false };
                        changed = true;
                    }
                });
                return changed ? next : prev;
            });
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    const value = {
        pusherRef,
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
