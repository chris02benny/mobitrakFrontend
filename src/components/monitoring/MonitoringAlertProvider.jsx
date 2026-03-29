/**
 * MonitoringAlertProvider.jsx
 *
 * Global context that:
 *  1. Polls the /api/alerts endpoint for fleet managers every 3 seconds.
 *  2. Fetches alerts for the logged-in fleet manager.
 *  3. Fires a react-hot-toast alert on ANY page when a DROWSY event arrives.
 *  4. Exposes `useMonitoringContext()` so the LiveMonitoringDashboard can reuse
 *     the polling state + driverStatuses without creating a second connection.
 *
 * NOTE: Polls REST API instead of Pusher. Backend stores alerts in MongoDB.
 * The "since" parameter enables incremental polling to avoid re-processing old alerts.
 */

import React, {
    createContext,
    useContext,
    useEffect,
    useRef,
    useState,
} from 'react';
import toast from 'react-hot-toast';
import { apiConfig } from '../../config/apiConfig';

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
    const lastTimestampRef = useRef(null);
    const pollIntervalRef = useRef(null);

    /** Map of driverId → latest telemetry { status, perclos, ear, timestamp, lastSeen } */
    const [driverStatuses, setDriverStatuses] = useState({});
    const [socketReady, setSocketReady] = useState(true); // Always "ready" for polling

    // Only poll for fleet-manager role
    const user = getUserFromStorage();
    const isFleetManager =
        user?.role === 'fleetmanager' ||
        localStorage.getItem('userRole') === 'fleetmanager';

    // ── Fetch alerts from API (polling) ────────────────────────────────────────
    // Fleet manager polls using their own user ID as companyId — this matches
    // the companyId stored in the employments collection, so only alerts from
    // hired drivers are returned.
    const fetchAlerts = async (companyId) => {
        try {
            const params = new URLSearchParams({
                companyId,
                limit: '50'
            });

            // Only fetch since last timestamp (incremental polling)
            if (lastTimestampRef.current) {
                params.append('since', lastTimestampRef.current);
            }

            const url = `${apiConfig.baseUrl}/api/alerts?${params.toString()}`;
            const response = await fetch(url, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });

            if (!response.ok) {
                console.warn('[MonitoringProvider] Failed to fetch alerts:', response.status);
                return;
            }

            const alerts = await response.json();
            if (!Array.isArray(alerts)) {
                console.error('[MonitoringProvider] Invalid alerts response:', alerts);
                return;
            }

            if (alerts.length === 0) {
                return; // No new alerts — silent
            }

            console.log('[MonitoringProvider] Fetched', alerts.length, 'new alerts');

            // Update cursor to latest timestamp for next poll
            if (alerts.length > 0) {
                lastTimestampRef.current = alerts[0].timestamp;
            }

            // Process each alert in order (oldest first)
            const reversedAlerts = [...alerts].reverse();
            reversedAlerts.forEach(alert => {
                handleMonitoringData(alert);
            });
        } catch (err) {
            console.error('[MonitoringProvider] Polling error:', err.message);
        }
    };

    // ── Setup polling when component mounts ────────────────────────────────────
    useEffect(() => {
        if (!isFleetManager) return;

        const u = getUserFromStorage();
        // The fleet manager's user _id IS the companyId in the employment records
        const companyId = u?.id || u?._id;

        if (!companyId) {
            console.warn('[MonitoringProvider] No companyId found for fleet manager');
            return;
        }

        console.log('[MonitoringProvider] Starting alert polling for companyId:', companyId);

        // Initial fetch
        fetchAlerts(companyId);

        // Poll every 3 seconds
        pollIntervalRef.current = setInterval(() => {
            fetchAlerts(companyId);
        }, 3000);

        return () => {
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
            }
        };
    }, [isFleetManager]);

    // ── Handle incoming monitoring data ───────────────────────────────────────
    function handleMonitoringData(alert) {
        const { driverId, status, perclos, ear, timestamp } = alert;
        if (!driverId) return;

        setDriverStatuses(prev => ({
            ...prev,
            [driverId]: {
                ...prev[driverId],
                driverId,
                status,
                perclos: perclos ?? 0,
                ear: ear ?? 0,
                timestamp: timestamp || new Date().toISOString(),
                lastSeen: new Date(),
            },
        }));

        // Global alert toast for DROWSY — shown on ANY page
        if (status === 'DROWSY') {
            const name = formatDriverId(driverId);
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

    // ── Mark driver as offline if no update in >30 s ──────────────────────────
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
