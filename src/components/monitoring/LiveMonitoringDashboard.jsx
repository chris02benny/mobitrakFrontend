/**
 * LiveMonitoringDashboard.jsx
 * Business/admin-side live driver monitoring dashboard.
 *
 * Features:
 *  - Listens for "admin_monitoring" Socket.IO events
 *  - Displays real-time status cards per driver (EAR, PERCLOS, status)
 *  - MUI Snackbar/Alert for DROWSY alerts
 *  - WebRTC video receive: admin can request a live feed from any driver
 *  - Video modal/overlay for the received stream
 */

import React, {
    useRef,
    useState,
    useEffect,
    useCallback,
} from 'react';
import { io } from 'socket.io-client';
import Snackbar from '@mui/material/Snackbar';
import MuiAlert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';

// ─── Constants ────────────────────────────────────────────────────────────────

const TRIP_SERVICE_URL =
    import.meta.env.VITE_TRIP_SERVICE_URL ||
    import.meta.env.VITE_API_URL ||
    'http://localhost:5004';

const RTC_CONFIG = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

const LiveMonitoringDashboard = () => {
    // ── Refs ───────────────────────────────────────────────────────────────────
    const socketRef = useRef(null);
    const peerRef = useRef(null);     // active RTCPeerConnection
    const remoteVideoRef = useRef(null);     // <video> for remote stream
    const driverSocketRef = useRef(null);     // driver's socketId for WebRTC signaling

    // ── State ──────────────────────────────────────────────────────────────────
    /** Map of driverId → latest telemetry data */
    const [driverStatuses, setDriverStatuses] = useState({});

    /** Queue of DROWSY alert snackbars */
    const [alerts, setAlerts] = useState([]);

    /** Driver currently being viewed via WebRTC */
    const [viewingDriver, setViewingDriver] = useState(null);

    /** Is the WebRTC video modal open */
    const [showVideoModal, setShowVideoModal] = useState(false);

    /** WebRTC connection state */
    const [rtcState, setRtcState] = useState('idle'); // 'idle' | 'connecting' | 'connected' | 'error'

    const [socketReady, setSocketReady] = useState(false);

    // ── Socket.IO Setup ───────────────────────────────────────────────────────
    useEffect(() => {
        const socket = io(TRIP_SERVICE_URL, {
            transports: ['websocket', 'polling'],
            reconnection: true,
        });

        socket.on('connect', () => {
            console.log('[admin-monitoring] Socket connected:', socket.id);
            setSocketReady(true);

            // Join the fleet room so we receive targeted admin_monitoring events
            const user = getUserFromStorage();
            if (user.id) {
                socket.emit('join-fleet-room', user.id);
            }
        });

        socket.on('disconnect', () => {
            console.log('[admin-monitoring] Socket disconnected');
            setSocketReady(false);
        });

        // ── Receive driver telemetry ──────────────────────────────────────
        socket.on('admin_monitoring', (data) => {
            const { driverId, status, perclos, ear, timestamp } = data;
            if (!driverId) return;

            console.log('[admin-monitoring] Received:', data);

            // Update driver status map
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

            // Fire snackbar for DROWSY events
            if (status === 'DROWSY') {
                const alertId = `${driverId}-${Date.now()}`;
                setAlerts(prev => [
                    ...prev,
                    { id: alertId, driverId, perclos, timestamp },
                ]);
            }
        });

        // ── WebRTC: Receive SDP offer from driver ─────────────────────────
        socket.on('webrtc-offer', async (data) => {
            console.log('[WebRTC] Received offer from driver');
            driverSocketRef.current = data.driverSocketId || null;

            const pc = new RTCPeerConnection(RTC_CONFIG);
            peerRef.current = pc;

            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    socket.emit('webrtc-ice-candidate', {
                        candidate: event.candidate,
                        targetSocketId: data.driverSocketId,
                        driverId: data.driverId,
                    });
                }
            };

            pc.ontrack = (event) => {
                console.log('[WebRTC] Track received from driver');
                if (remoteVideoRef.current) {
                    remoteVideoRef.current.srcObject = event.streams[0];
                }
                setRtcState('connected');
            };

            pc.onconnectionstatechange = () => {
                console.log('[WebRTC] Connection state:', pc.connectionState);
                if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
                    setRtcState('error');
                }
            };

            try {
                await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);

                socket.emit('webrtc-answer', {
                    sdp: pc.localDescription,
                    targetSocketId: data.targetSocketId || null,
                    driverId: data.driverId,
                });
                console.log('[WebRTC] Answer sent');
            } catch (err) {
                console.error('[WebRTC] Answer error:', err);
                setRtcState('error');
            }
        });

        // ── WebRTC: Receive ICE candidate from driver ─────────────────────
        socket.on('webrtc-ice-candidate', async (data) => {
            const pc = peerRef.current;
            if (!pc || !data.candidate) return;
            try {
                await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
            } catch (err) {
                console.error('[WebRTC] addIceCandidate error:', err);
            }
        });

        socketRef.current = socket;
        return () => socket.disconnect();
    }, []);

    // ── Request WebRTC stream from driver ─────────────────────────────────────
    const requestDriverVideo = useCallback((driverId) => {
        if (!socketRef.current?.connected) return;

        setViewingDriver(driverId);
        setShowVideoModal(true);
        setRtcState('connecting');

        // Close existing peer connection
        if (peerRef.current) {
            peerRef.current.close();
            peerRef.current = null;
        }

        socketRef.current.emit('webrtc-request', {
            driverId,
            adminSocketId: socketRef.current.id,
        });
        console.log('[WebRTC] Requested video from driver:', driverId);
    }, []);

    // ── Close video modal ─────────────────────────────────────────────────────
    const closeVideoModal = useCallback(() => {
        if (peerRef.current) {
            peerRef.current.close();
            peerRef.current = null;
        }
        if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = null;
        }
        setShowVideoModal(false);
        setViewingDriver(null);
        setRtcState('idle');
    }, []);

    // ── Dismiss a snackbar alert ──────────────────────────────────────────────
    const dismissAlert = useCallback((alertId) => {
        setAlerts(prev => prev.filter(a => a.id !== alertId));
    }, []);

    // ── Helper ────────────────────────────────────────────────────────────────
    const getUserFromStorage = () => {
        try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; }
    };

    const formatTime = (iso) => {
        if (!iso) return '—';
        const d = new Date(iso);
        return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    const formatDriverId = (id) => {
        if (!id) return 'Unknown';
        return typeof id === 'string' ? `${id.slice(0, 6)}…${id.slice(-4)}` : String(id).slice(0, 10);
    };

    const drivers = Object.values(driverStatuses);

    // ─────────────────────────────────────────────────────────────────────────
    // Render
    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="flex flex-col gap-6">
            {/* ── Header ── */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Live Driver Monitoring</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Real-time drowsiness alerts and video feed from active drivers
                    </p>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span className={`w-2 h-2 rounded-full ${socketReady ? 'bg-green-500' : 'bg-red-400'}`} />
                    {socketReady ? 'Live' : 'Disconnected'}
                </div>
            </div>

            {/* ── Empty State ── */}
            {drivers.length === 0 && (
                <div className="bg-white border border-gray-200 rounded-xl p-12 flex flex-col items-center justify-center text-center">
                    <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    <p className="text-gray-700 font-medium mb-2">No active monitoring sessions</p>
                    <p className="text-gray-500 text-sm max-w-sm">
                        Waiting for drivers to start monitoring. Driver status will appear here in real-time.
                    </p>
                </div>
            )}

            {/* ── Driver Status Grid ── */}
            {drivers.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {drivers.map((driver) => {
                        const isDrowsy = driver.status === 'DROWSY';
                        const perclosPct = Math.min((driver.perclos || 0) * 100, 100);
                        const earVal = driver.ear || 0;

                        return (
                            <div
                                key={driver.driverId}
                                className={`rounded-xl border overflow-hidden shadow-sm transition-all duration-300 ${isDrowsy
                                        ? 'border-red-300 bg-red-50 shadow-red-100'
                                        : 'border-gray-200 bg-white'
                                    }`}
                            >
                                {/* Card Header */}
                                <div className={`px-4 py-3 flex items-center justify-between ${isDrowsy ? 'bg-red-500' : 'bg-gray-800'
                                    }`}>
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                                            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="text-xs text-white/70">Driver ID</p>
                                            <p className="text-sm font-mono text-white">{formatDriverId(driver.driverId)}</p>
                                        </div>
                                    </div>

                                    {/* Status badge */}
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${isDrowsy
                                            ? 'bg-white text-red-600 animate-pulse'
                                            : 'bg-green-500 text-white'
                                        }`}>
                                        {driver.status}
                                    </span>
                                </div>

                                {/* Card Body */}
                                <div className="p-4 space-y-3">
                                    {/* PERCLOS bar */}
                                    <div>
                                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                                            <span>PERCLOS</span>
                                            <span className={isDrowsy ? 'text-red-600 font-medium' : ''}>
                                                {perclosPct.toFixed(1)}%
                                            </span>
                                        </div>
                                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-500 ${isDrowsy ? 'bg-red-500' : 'bg-amber-400'
                                                    }`}
                                                style={{ width: `${perclosPct}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* EAR */}
                                    <div className="flex justify-between text-xs">
                                        <span className="text-gray-500">EAR (Eye Aspect Ratio)</span>
                                        <span className={`font-mono font-medium ${earVal < 0.22 ? 'text-red-600' : 'text-gray-700'}`}>
                                            {earVal.toFixed(3)}
                                        </span>
                                    </div>

                                    {/* Last update */}
                                    <div className="flex justify-between text-xs">
                                        <span className="text-gray-400">Last update</span>
                                        <span className="text-gray-600">{formatTime(driver.timestamp)}</span>
                                    </div>

                                    {/* Action buttons */}
                                    <div className="flex gap-2 pt-1">
                                        <button
                                            onClick={() => requestDriverVideo(driver.driverId)}
                                            className="flex-1 py-2 text-xs font-medium bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center gap-1.5"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                    d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M4 8a2 2 0 00-2 2v4a2 2 0 002 2h8a2 2 0 002-2V10a2 2 0 00-2-2H4z" />
                                            </svg>
                                            Live Video
                                        </button>
                                        {isDrowsy && (
                                            <div className="flex-1 py-2 text-xs font-bold bg-red-100 text-red-700 rounded-lg flex items-center justify-center gap-1.5 animate-pulse">
                                                ⚠️ DROWSY
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Drowsiness Snackbar Alerts ── */}
            {alerts.map((alert) => (
                <Snackbar
                    key={alert.id}
                    open={true}
                    anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                    onClose={() => dismissAlert(alert.id)}
                    autoHideDuration={12000}
                >
                    <MuiAlert
                        severity="error"
                        variant="filled"
                        onClose={() => dismissAlert(alert.id)}
                        sx={{ minWidth: 320 }}
                    >
                        <AlertTitle>🚨 Drowsiness Alert</AlertTitle>
                        Driver <strong>{formatDriverId(alert.driverId)}</strong> is showing signs of drowsiness.
                        <br />
                        <span style={{ fontSize: '0.75rem', opacity: 0.85 }}>
                            PERCLOS: {((alert.perclos || 0) * 100).toFixed(1)}% · {formatTime(alert.timestamp)}
                        </span>
                    </MuiAlert>
                </Snackbar>
            ))}

            {/* ── WebRTC Video Modal ── */}
            {showVideoModal && (
                <div className="fixed inset-0 z-[2000] bg-black/80 flex items-center justify-center p-4">
                    <div className="bg-gray-900 rounded-2xl overflow-hidden w-full max-w-2xl shadow-2xl">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
                            <div>
                                <p className="text-white font-semibold">Live Driver Feed</p>
                                <p className="text-gray-400 text-xs mt-0.5">
                                    Driver: {formatDriverId(viewingDriver)} ·
                                    <span className={`ml-1 ${rtcState === 'connected' ? 'text-green-400' :
                                            rtcState === 'connecting' ? 'text-amber-400' :
                                                rtcState === 'error' ? 'text-red-400' : 'text-gray-400'
                                        }`}>
                                        {rtcState === 'connected' ? '● Connected' :
                                            rtcState === 'connecting' ? '⟳ Connecting…' :
                                                rtcState === 'error' ? '✕ Error' : 'Idle'}
                                    </span>
                                </p>
                            </div>
                            <button
                                onClick={closeVideoModal}
                                className="w-8 h-8 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center transition-colors"
                            >
                                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Video */}
                        <div className="relative bg-black aspect-video flex items-center justify-center">
                            <video
                                ref={remoteVideoRef}
                                autoPlay
                                playsInline
                                className="w-full h-full object-cover"
                            />

                            {rtcState !== 'connected' && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                                    {rtcState === 'connecting' ? (
                                        <>
                                            <svg className="w-10 h-10 animate-spin mb-3 text-amber-400" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                            </svg>
                                            <p className="text-sm text-amber-300">Establishing connection…</p>
                                            <p className="text-xs text-gray-500 mt-1">Driver must have monitoring active</p>
                                        </>
                                    ) : rtcState === 'error' ? (
                                        <>
                                            <span className="text-3xl mb-2">⚠️</span>
                                            <p className="text-sm text-red-400">Connection failed</p>
                                            <p className="text-xs text-gray-500 mt-1">Driver may have stopped monitoring</p>
                                        </>
                                    ) : null}
                                </div>
                            )}
                        </div>

                        {/* Driver status in modal */}
                        {viewingDriver && driverStatuses[viewingDriver] && (
                            <div className="px-5 py-3 bg-gray-800 flex items-center gap-6 text-sm">
                                <div>
                                    <span className="text-gray-400 text-xs">Status</span>
                                    <div className={`font-bold mt-0.5 ${driverStatuses[viewingDriver].status === 'DROWSY'
                                            ? 'text-red-400' : 'text-green-400'
                                        }`}>
                                        {driverStatuses[viewingDriver].status}
                                    </div>
                                </div>
                                <div>
                                    <span className="text-gray-400 text-xs">PERCLOS</span>
                                    <div className="text-white font-medium mt-0.5">
                                        {((driverStatuses[viewingDriver].perclos || 0) * 100).toFixed(1)}%
                                    </div>
                                </div>
                                <div>
                                    <span className="text-gray-400 text-xs">EAR</span>
                                    <div className="text-white font-medium mt-0.5 font-mono">
                                        {(driverStatuses[viewingDriver].ear || 0).toFixed(3)}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default LiveMonitoringDashboard;
