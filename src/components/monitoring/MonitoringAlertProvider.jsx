/**
 * MonitoringAlertProvider.jsx
 *
 * Global context that:
 *  1. Connects to Socket.IO for real-time alerts and incidents.
 *  2. Fetches initial alert history from REST API for fleet managers.
 *  3. Fires react-hot-toast alerts on ANY page when a DROWSY/CRITICAL event arrives.
 *  4. Manages the incident list (real-time updates via incident:new / incident:status_update).
 *  5. Exposes `useMonitoringContext()` so the LiveMonitoringDashboard and
 *     IncidentCenter can reuse the shared state.
 *
 * REFACTORED: Now supports the event-driven incident management pipeline
 * alongside the existing telemetry polling/socket flow.
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
import { apiConfig } from '../../config/apiConfig';
import { hiringService } from '../../services/hiringService';

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
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            const u = JSON.parse(storedUser);
            if (u && (u._id || u.id)) return u;
        }

        // Fallback: Extract from JWT token
        const token = localStorage.getItem('authToken');
        if (token) {
            const decoded = JSON.parse(atob(token.split('.')[1]));
            // JWT structure: { user: { id, role, ... }, iat, exp }
            if (decoded.user) {
                return {
                    ...decoded.user,
                    _id: decoded.user.id || decoded.user._id,
                };
            }
            // Some JWTs might have the user data flat
            return {
                ...decoded,
                _id: decoded.id || decoded._id || decoded.userId || decoded.sub
            };
        }
        return {};
    } catch (err) {
        console.error('[MonitoringProvider] getUserFromStorage error:', err);
        return {};
    }
};

const formatDriverId = (id) => {
    if (!id) return 'Unknown';
    const idStr = String(id);
    return idStr.length > 10 ? `${idStr.slice(0, 6)}…${idStr.slice(-4)}` : idStr;
};

// Severity config for visual styling
const SEVERITY_CONFIG = {
    EMERGENCY: { color: '#dc2626', emoji: '🚨', label: 'EMERGENCY' },
    CRITICAL: { color: '#ea580c', emoji: '⚠️', label: 'CRITICAL' },
    WARNING: { color: '#d97706', emoji: '⚡', label: 'WARNING' },
    INFO: { color: '#2563eb', emoji: 'ℹ️', label: 'INFO' },
};

// ─── Provider ─────────────────────────────────────────────────────────────────

const MonitoringAlertProvider = ({ children }) => {
    const lastTimestampRef = useRef(null);
    const socketRef = useRef(null);

    /** Map of driverId → latest telemetry */
    const [driverStatuses, setDriverStatuses] = useState({});
    const [socketReady, setSocketReady] = useState(false);

    /** Map of driverId → driver name */
    const [hiredDrivers, setHiredDrivers] = useState({});

    /** Incident management state */
    const [incidents, setIncidents] = useState([]);
    const [incidentStats, setIncidentStats] = useState({
        active: 0,
        acknowledged: 0,
        resolvedToday: 0,
        criticalActive: 0,
    });

    // Only active for fleet-manager role
    const user = getUserFromStorage();
    const isFleetManager =
        user?.role === 'fleetmanager' ||
        localStorage.getItem('userRole') === 'fleetmanager';

    // ── Fetch alerts from API (initial load) ────────────────────────────────
    const fetchAlerts = useCallback(async (companyId, options = { isInitialLoad: false }) => {
        try {
            const params = new URLSearchParams({ companyId, limit: '50' });
            if (lastTimestampRef.current) {
                params.append('since', lastTimestampRef.current);
            }

            const url = `${apiConfig.baseUrl}/api/alerts?${params.toString()}`;
            const token = localStorage.getItem('authToken');
            
            const response = await fetch(url, {
                method: 'GET',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-auth-token': token,
                    'Authorization': `Bearer ${token}`
                },
            });

            if (!response.ok) {
                console.warn('[MonitoringProvider] Fetch alerts failed:', response.status);
                return;
            }

            const alerts = await response.json();
            if (!Array.isArray(alerts) || alerts.length === 0) return;

            console.log('[MonitoringProvider] Fetched', alerts.length, 'alerts');

            if (alerts.length > 0) {
                lastTimestampRef.current = alerts[0].timestamp;
            }

            // During initial load, we don't want to trigger toasts for old alerts
            const reversedAlerts = [...alerts].reverse();
            reversedAlerts.forEach(alert => handleMonitoringData(alert, options));
        } catch (err) {
            console.error('[MonitoringProvider] Polling error:', err.message);
        }
    }, []);

    // ── Fetch incidents from API (initial load) ─────────────────────────────
    const fetchIncidents = useCallback(async (companyId) => {
        try {
            const url = `${apiConfig.baseUrl}/api/incidents?businessId=${companyId}&status=ACTIVE,ACKNOWLEDGED,MONITORING,ESCALATED&limit=50`;
            const token = localStorage.getItem('authToken');
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': token,
                    'Authorization': `Bearer ${token}`
                },
            });

            if (!response.ok) {
                console.warn('[MonitoringProvider] Fetch incidents failed:', response.status);
                return;
            }

            const data = await response.json();
            if (data.success && Array.isArray(data.data)) {
                setIncidents(data.data);
                console.log('[MonitoringProvider] Loaded', data.data.length, 'active incidents');
            }
        } catch (err) {
            console.error('[MonitoringProvider] Incident fetch error:', err.message);
        }
    }, []);

    // ── Fetch incident stats ────────────────────────────────────────────────
    const fetchIncidentStats = useCallback(async (companyId) => {
        try {
            const url = `${apiConfig.baseUrl}/api/incidents/stats?businessId=${companyId}`;
            const token = localStorage.getItem('authToken');
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': token,
                    'Authorization': `Bearer ${token}`
                },
            });

            if (!response.ok) {
                console.warn('[MonitoringProvider] Fetch stats failed:', response.status);
                return;
            }

            const data = await response.json();
            if (data.success) {
                setIncidentStats(data.data);
            }
        } catch (err) {
            console.error('[MonitoringProvider] Stats fetch error:', err.message);
        }
    }, []);

    // ── Setup Real-time Connection (Socket.IO) ────────────────────────────────
    useEffect(() => {
        if (!isFleetManager) return;

        const u = getUserFromStorage();
        const companyId = u?.id || u?._id;

        if (!companyId) {
            console.warn('[MonitoringProvider] No companyId found for fleet manager');
            return;
        }

        // 1. Initial data fetch
        console.log('[MonitoringProvider] Initial data load for:', companyId);
        
        // Fetch hired drivers first to populate names
        hiringService.getCompanyEmployees('ACTIVE', 1, 100)
            .then(data => {
                if (data.success && Array.isArray(data.data)) {
                    const map = {};
                    data.data.forEach(emp => {
                        if (emp.driverId) {
                            map[emp.driverId] = emp.driverName || emp.driver?.name || 'Driver';
                        }
                    });
                    setHiredDrivers(map);
                }
            })
            .catch(err => console.error('[MonitoringProvider] Failed to fetch drivers:', err))
            .finally(() => {
                fetchAlerts(companyId, { isInitialLoad: true });
                fetchIncidents(companyId);
                fetchIncidentStats(companyId);
            });

        // 2. Establish Socket.IO connection
        const socketUrl = apiConfig.baseUrl;
        console.log('[MonitoringProvider] Connecting to Socket.IO:', socketUrl);

        const socket = io(socketUrl, {
            transports: ['websocket', 'polling'],
            withCredentials: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('[MonitoringProvider] Socket connected. ID:', socket.id);
            setSocketReady(true);
            socket.emit('join-fleet-room', companyId);
            console.log(`[MonitoringProvider] Joined room: fleet-${companyId}`);
        });

        // ── Telemetry Events (existing) ─────────────────────────────────────
        socket.on('new-alert', (alert) => {
            handleMonitoringData(alert);
        });

        // ── Incident Events (new) ───────────────────────────────────────────
        socket.on('incident:new', (incident) => {
            console.log('[MonitoringProvider] New incident:', incident);
            setIncidents(prev => [incident, ...prev]);

            // Update stats
            setIncidentStats(prev => ({
                ...prev,
                active: prev.active + 1,
                criticalActive: ['CRITICAL', 'EMERGENCY'].includes(incident.severity)
                    ? prev.criticalActive + 1
                    : prev.criticalActive,
            }));

            // Show toast for CRITICAL/EMERGENCY incidents
            const config = SEVERITY_CONFIG[incident.severity] || SEVERITY_CONFIG.WARNING;
            if (['CRITICAL', 'EMERGENCY'].includes(incident.severity)) {
                toast.error(
                    (t) => (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <strong style={{ fontSize: '0.95rem' }}>
                                {config.emoji} {config.label} Incident
                            </strong>
                            <span style={{ fontSize: '0.85rem' }}>
                                <strong>{incident.driverName || formatDriverId(incident.driverId)}</strong>
                                {' '} — {incident.type?.replace('_', ' ')}
                            </span>
                            <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                                PERCLOS: {((incident.metrics?.perclos || 0) * 100).toFixed(1)}%
                            </span>
                        </div>
                    ),
                    {
                        duration: 15000,
                        id: `incident-${incident._id}`,
                        style: {
                            background: config.color,
                            color: '#fff',
                            maxWidth: 400,
                        },
                    }
                );
            }
        });

        socket.on('incident:status_update', (update) => {
            console.log('[MonitoringProvider] Incident status update:', update);
            setIncidents(prev =>
                prev.map(inc =>
                    inc._id === update.incidentId
                        ? { ...inc, status: update.status || inc.status, liveSessionActive: update.liveSessionActive ?? inc.liveSessionActive }
                        : inc
                ).filter(inc => inc.status !== 'RESOLVED')
            );

            // Refresh stats on status change
            fetchIncidentStats(companyId);
        });

        socket.on('incident:auto_escalation', (data) => {
            console.log('[MonitoringProvider] Auto-escalation:', data);
            toast.error(
                (t) => (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <strong style={{ fontSize: '0.95rem' }}>
                            🚨 Auto-Escalation Alert
                        </strong>
                        <span style={{ fontSize: '0.85rem' }}>
                            {data.message}
                        </span>
                        <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                            Live monitoring recommended for this driver.
                        </span>
                    </div>
                ),
                {
                    duration: 20000,
                    id: `escalation-${data.incidentId}`,
                    style: {
                        background: '#7c2d12',
                        color: '#fff',
                        maxWidth: 420,
                    },
                }
            );
        });

        // ── Connection Events ───────────────────────────────────────────────
        socket.on('connect_error', (err) => {
            console.warn('[MonitoringProvider] Socket connection error:', err.message);
            setSocketReady(false);
        });

        socket.on('disconnect', (reason) => {
            console.log('[MonitoringProvider] Socket disconnected:', reason);
            setSocketReady(false);
        });

        socket.on('reconnect', () => {
            console.log('[MonitoringProvider] Socket reconnected');
            setSocketReady(true);
            socket.emit('join-fleet-room', companyId);
            // Refresh data on reconnect
            fetchIncidents(companyId);
            fetchIncidentStats(companyId);
        });

        return () => {
            console.log('[MonitoringProvider] Cleaning up socket connection');
            socket.disconnect();
            socketRef.current = null;
        };
    }, [isFleetManager, fetchAlerts, fetchIncidents, fetchIncidentStats]);

    // ── Handle incoming monitoring data ───────────────────────────────────────
    function handleMonitoringData(alert, options = { isInitialLoad: false }) {
        const { driverId, status, perclos, ear, timestamp, monitoringActive } = alert;
        if (!driverId) return;

        setDriverStatuses(prev => ({
            ...prev,
            [driverId]: {
                ...prev[driverId],
                driverId,
                status,
                perclos: perclos ?? 0,
                ear: ear ?? 0,
                monitoringActive: monitoringActive ?? prev[driverId]?.monitoringActive,
                timestamp: timestamp || new Date().toISOString(),
                lastSeen: new Date(),
            },
        }));

        // Global alert toast for DROWSY — shown on ANY page
        if (status === 'DROWSY') {
            // SKIP TOAST if it's initial load of old data OR alert is too old
            if (options.isInitialLoad) return;
            
            const alertTime = new Date(timestamp || Date.now()).getTime();
            const now = Date.now();
            // Don't toast for alerts older than 45 seconds (fallback polling might get old ones)
            if (now - alertTime > 45000) {
                console.log('[MonitoringProvider] Skipping toast for old drowsiness alert:', driverId);
                return;
            }

            const name = hiredDrivers[driverId] || formatDriverId(driverId);
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

    // ── Mark driver as offline if no update in >30s ──────────────────────────
    // ── Polling Fallback (when socket is not ready) ───────────────────────────
    useEffect(() => {
        // Only poll if we are a fleet manager and socket is not yet ready or failed
        if (!isFleetManager || socketReady) return;

        const u = getUserFromStorage();
        const companyId = u?.id || u?._id;
        if (!companyId) return;

        console.log('[MonitoringProvider] Socket not ready, starting polling fallback...');
        
        const pollInterval = setInterval(() => {
            fetchAlerts(companyId, { isPolling: true });
            fetchIncidents(companyId);
            fetchIncidentStats(companyId);
        }, 10000); // Poll every 10 seconds when socket is down

        return () => clearInterval(pollInterval);
    }, [isFleetManager, socketReady, fetchAlerts, fetchIncidents, fetchIncidentStats]);

    // ── Offline/Inactivity detection ─────────────────────────────────────────
    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            setDriverStatuses(prev => {
                const next = { ...prev };
                let changed = false;
                Object.keys(next).forEach(id => {
                    const lastSeen = next[id].lastSeen ? new Date(next[id].lastSeen).getTime() : 0;
                    if (now - lastSeen > 45_000 && next[id].status !== 'OFFLINE') {
                        next[id] = { ...next[id], status: 'OFFLINE' };
                        changed = true;
                    }
                });
                return changed ? next : prev;
            });
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    // ── Remove resolved incidents helper ─────────────────────────────────────
    const removeResolvedIncident = useCallback((incidentId) => {
        setIncidents(prev => prev.filter(inc => inc._id !== incidentId));
    }, []);

    const value = {
        socketReady,
        socketRef,
        driverStatuses,
        incidents,
        incidentStats,
        removeResolvedIncident,
        refreshIncidents: () => {
            const u = getUserFromStorage();
            const companyId = u?.id || u?._id;
            if (companyId) {
                fetchIncidents(companyId);
                fetchIncidentStats(companyId);
            }
        },
    };

    return (
        <MonitoringContext.Provider value={value}>
            {children}
        </MonitoringContext.Provider>
    );
};

export default MonitoringAlertProvider;
