/**
 * LiveMonitoringDashboard.jsx
 * Business/admin-side live driver monitoring dashboard.
 *
 * Features:
 *  - Lists ALL fleet drivers fetched from the hiring service.
 *  - Shows real-time monitoring status per driver (ACTIVE / NOT MONITORING).
 *  - Reuses the shared socket + driverStatuses from MonitoringAlertProvider.
 *  - WebRTC video feed viewer (modal) for monitoring-active drivers.
 *  - Global DROWSY alerts are handled by MonitoringAlertProvider; this component
 *    shows an in-card DROWSY badge only.
 */

import React, {
    useRef,
    useState,
    useEffect,
    useCallback,
} from 'react';
import { Eye, EyeOff, Video, AlertTriangle, User, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useMonitoringContext } from './MonitoringAlertProvider';
import { hiringService } from '../../services/hiringService';

// ─── Constants ────────────────────────────────────────────────────────────────

const RTC_CONFIG = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Single driver monitoring card */
const DriverCard = ({ employment, liveData, onRequestVideo }) => {
    const driver = employment.driverId;
    const userDetails = driver?.userDetails;
    const driverId = driver?._id || driver?.userId;

    const name = userDetails?.firstName
        ? `${userDetails.firstName} ${userDetails.lastName || ''}`.trim()
        : 'Unknown Driver';

    const isMonitoring = liveData && liveData.status !== 'OFFLINE';
    const isDrowsy = liveData?.status === 'DROWSY';
    const perclosPct = Math.min((liveData?.perclos || 0) * 100, 100);
    const earVal = liveData?.ear || 0;

    const formatTime = (iso) => {
        if (!iso) return '—';
        return new Date(iso).toLocaleTimeString('en-IN', {
            hour: '2-digit', minute: '2-digit', second: '2-digit',
        });
    };

    return (
        <div className={`rounded-2xl border overflow-hidden shadow-sm transition-all duration-300 ${isDrowsy
            ? 'border-red-300 shadow-red-100 bg-red-50'
            : isMonitoring
                ? 'border-green-200 bg-white shadow-green-50'
                : 'border-gray-200 bg-white'
            }`}>
            {/* ── Card Header ── */}
            <div className={`px-4 py-3.5 flex items-center justify-between ${isDrowsy ? 'bg-red-500' : isMonitoring ? 'bg-gray-800' : 'bg-gray-100'
                }`}>
                <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 ${isMonitoring ? 'bg-white/20' : 'bg-gray-200'
                        }`}>
                        {userDetails?.profileImage ? (
                            <img src={userDetails.profileImage} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <User size={18} className={isMonitoring ? 'text-white' : 'text-gray-400'} />
                        )}
                    </div>
                    <div>
                        <p className={`text-sm font-semibold leading-tight ${isMonitoring ? 'text-white' : 'text-gray-700'}`}>
                            {name}
                        </p>
                        <p className={`text-xs mt-0.5 ${isMonitoring ? 'text-white/60' : 'text-gray-400'}`}>
                            {userDetails?.email || 'No email'}
                        </p>
                    </div>
                </div>

                {/* Status badge */}
                {isMonitoring ? (
                    <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${isDrowsy
                        ? 'bg-white text-red-600 animate-pulse'
                        : 'bg-green-500/30 text-green-200 border border-green-400/40'
                        }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isDrowsy ? 'bg-red-500' : 'bg-green-400'} animate-pulse`} />
                        {isDrowsy ? '⚠️ DROWSY' : 'Monitoring Active'}
                    </span>
                ) : (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-500">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                        Not Monitoring
                    </span>
                )}
            </div>

            {/* ── Card Body ── */}
            <div className="p-4 space-y-3">
                {isMonitoring ? (
                    <>
                        {/* PERCLOS bar */}
                        <div>
                            <div className="flex justify-between text-xs text-gray-500 mb-1">
                                <span>PERCLOS (Eye Closure)</span>
                                <span className={isDrowsy ? 'text-red-600 font-semibold' : ''}>
                                    {perclosPct.toFixed(1)}%
                                </span>
                            </div>
                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-500 ${isDrowsy ? 'bg-red-500' : perclosPct > 50 ? 'bg-amber-400' : 'bg-green-400'
                                        }`}
                                    style={{ width: `${perclosPct}%` }}
                                />
                            </div>
                        </div>

                        {/* EAR + Last update */}
                        <div className="flex items-center justify-between text-xs">
                            <div>
                                <span className="text-gray-400">EAR </span>
                                <span className={`font-mono font-semibold ${earVal < 0.22 ? 'text-red-600' : 'text-gray-700'}`}>
                                    {earVal.toFixed(3)}
                                </span>
                            </div>
                            <div className="text-gray-400">
                                Updated {formatTime(liveData?.timestamp)}
                            </div>
                        </div>

                        {/* Action */}
                        <button
                            onClick={() => onRequestVideo(driverId, name)}
                            className="w-full py-2 text-xs font-semibold bg-gray-900 text-white rounded-xl hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
                        >
                            <Video size={14} />
                            View Live Feed
                        </button>
                    </>
                ) : (
                    /* Greyed out placeholder metrics */
                    <>
                        <div>
                            <div className="flex justify-between text-xs text-gray-300 mb-1">
                                <span>PERCLOS</span><span>—</span>
                            </div>
                            <div className="h-1.5 bg-gray-100 rounded-full" />
                        </div>
                        <div className="flex justify-between text-xs text-gray-300">
                            <span>EAR</span><span className="font-mono">—</span>
                        </div>
                        <div className="w-full py-2 text-xs font-medium bg-gray-100 text-gray-400 rounded-xl flex items-center justify-center gap-2 cursor-not-allowed select-none">
                            <EyeOff size={14} />
                            Driver not active
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const LiveMonitoringDashboard = () => {
    // ── Shared monitoring state from global provider ───────────────────────
    const { socketRef, socketReady, driverStatuses } = useMonitoringContext();

    // ── WebRTC state ───────────────────────────────────────────────────────
    const peerRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const [viewingDriver, setViewingDriver] = useState(null); // { id, name }
    const [showVideoModal, setShowVideoModal] = useState(false);
    const [rtcState, setRtcState] = useState('idle'); // 'idle' | 'connecting' | 'connected' | 'error'

    // ── Fleet driver list ──────────────────────────────────────────────────
    const [employees, setEmployees] = useState([]);
    const [loadingDrivers, setLoadingDrivers] = useState(true);
    const [driverError, setDriverError] = useState(null);

    // ── Fetch fleet drivers ────────────────────────────────────────────────
    const fetchDrivers = useCallback(async () => {
        try {
            setLoadingDrivers(true);
            setDriverError(null);
            const response = await hiringService.getCompanyEmployees('ACTIVE');
            setEmployees(response.data?.employments || []);
        } catch (err) {
            console.error('[monitoring] Failed to fetch drivers:', err);
            setDriverError('Failed to load drivers. Please try again.');
        } finally {
            setLoadingDrivers(false);
        }
    }, []);

    useEffect(() => {
        fetchDrivers();
    }, [fetchDrivers]);

    // ── WebRTC: Listen for offer from driver ───────────────────────────────
    useEffect(() => {
        const socket = socketRef.current;
        if (!socket) return;

        const handleOffer = async (data) => {
            console.log('[WebRTC] Received offer from driver');

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
                console.log('[WebRTC] Track received');
                if (remoteVideoRef.current) {
                    remoteVideoRef.current.srcObject = event.streams[0];
                }
                setRtcState('connected');
            };

            pc.onconnectionstatechange = () => {
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
            } catch (err) {
                console.error('[WebRTC] Answer error:', err);
                setRtcState('error');
            }
        };

        const handleIce = async (data) => {
            const pc = peerRef.current;
            if (!pc || !data.candidate) return;
            try { await pc.addIceCandidate(new RTCIceCandidate(data.candidate)); }
            catch (err) { console.error('[WebRTC] addIceCandidate error:', err); }
        };

        socket.on('webrtc-offer', handleOffer);
        socket.on('webrtc-ice-candidate', handleIce);

        return () => {
            socket.off('webrtc-offer', handleOffer);
            socket.off('webrtc-ice-candidate', handleIce);
        };
    }, [socketReady]);  // re-register when socket connects / reconnects

    // ── Request video feed ─────────────────────────────────────────────────
    const requestDriverVideo = useCallback((driverId, driverName) => {
        if (!socketRef.current?.connected) return;

        setViewingDriver({ id: driverId, name: driverName });
        setShowVideoModal(true);
        setRtcState('connecting');

        if (peerRef.current) {
            peerRef.current.close();
            peerRef.current = null;
        }

        socketRef.current.emit('webrtc-request', {
            driverId,
            adminSocketId: socketRef.current.id,
        });
    }, []);

    // ── Close video modal ──────────────────────────────────────────────────
    const closeVideoModal = useCallback(() => {
        if (peerRef.current) { peerRef.current.close(); peerRef.current = null; }
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
        setShowVideoModal(false);
        setViewingDriver(null);
        setRtcState('idle');
    }, []);

    // ── Counts ─────────────────────────────────────────────────────────────
    const activeCount = employees.filter(emp => {
        const id = emp.driverId?._id || emp.driverId?.userId;
        return id && driverStatuses[id] && driverStatuses[id].status !== 'OFFLINE';
    }).length;

    const drowsyCount = Object.values(driverStatuses).filter(d => d.status === 'DROWSY').length;

    // ─────────────────────────────────────────────────────────────────────────
    // Render
    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="flex flex-col gap-6">
            {/* ── Header row ── */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Live Driver Monitoring</h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Real-time drowsiness alerts and video feed from active drivers
                    </p>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                    {/* Socket status */}
                    <span className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border ${socketReady
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-red-50 text-red-600 border-red-200'
                        }`}>
                        {socketReady ? <Wifi size={12} /> : <WifiOff size={12} />}
                        {socketReady ? 'Connected' : 'Disconnected'}
                    </span>

                    {/* Refresh */}
                    <button
                        onClick={fetchDrivers}
                        disabled={loadingDrivers}
                        className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-white border border-gray-200 rounded-full hover:border-gray-300 transition-colors disabled:opacity-50"
                    >
                        <RefreshCw size={12} className={loadingDrivers ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* ── Summary stats ── */}
            {!loadingDrivers && employees.length > 0 && (
                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                            <User size={18} className="text-gray-500" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{employees.length}</p>
                            <p className="text-xs text-gray-500">Total Drivers</p>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-green-200 p-4 flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                            <Eye size={18} className="text-green-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-green-700">{activeCount}</p>
                            <p className="text-xs text-gray-500">Monitoring Active</p>
                        </div>
                    </div>
                    <div className={`bg-white rounded-xl border p-4 flex items-center gap-3 ${drowsyCount > 0 ? 'border-red-300 bg-red-50' : 'border-gray-200'
                        }`}>
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${drowsyCount > 0 ? 'bg-red-100' : 'bg-gray-100'
                            }`}>
                            <AlertTriangle size={18} className={drowsyCount > 0 ? 'text-red-600' : 'text-gray-400'} />
                        </div>
                        <div>
                            <p className={`text-2xl font-bold ${drowsyCount > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                                {drowsyCount}
                            </p>
                            <p className="text-xs text-gray-500">Drowsy Alerts</p>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Loading ── */}
            {loadingDrivers && (
                <div className="bg-white border border-gray-200 rounded-2xl p-12 flex flex-col items-center justify-center">
                    <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
                    <p className="text-gray-500 text-sm">Loading your drivers…</p>
                </div>
            )}

            {/* ── Error ── */}
            {driverError && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-6 flex items-center gap-4">
                    <AlertTriangle size={22} className="text-red-500 flex-shrink-0" />
                    <div>
                        <p className="text-red-800 font-medium">{driverError}</p>
                        <button onClick={fetchDrivers} className="mt-1 text-sm text-red-600 underline">
                            Try again
                        </button>
                    </div>
                </div>
            )}

            {/* ── Empty state: no drivers hired ── */}
            {!loadingDrivers && !driverError && employees.length === 0 && (
                <div className="bg-white border border-gray-200 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
                    <EyeOff size={48} className="text-gray-300 mb-4" />
                    <p className="text-gray-700 font-semibold text-lg mb-1">No drivers hired yet</p>
                    <p className="text-gray-400 text-sm max-w-xs">
                        Go to <strong>My Drivers</strong> and hire drivers to see their monitoring status here.
                    </p>
                </div>
            )}

            {/* ── Driver cards grid ── */}
            {!loadingDrivers && !driverError && employees.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {employees.map((employment) => {
                        const driver = employment.driverId;
                        const driverId = driver?._id || driver?.userId;
                        const liveData = driverId ? driverStatuses[driverId] : null;

                        return (
                            <DriverCard
                                key={employment._id}
                                employment={employment}
                                liveData={liveData && liveData.status !== 'OFFLINE' ? liveData : null}
                                onRequestVideo={requestDriverVideo}
                            />
                        );
                    })}
                </div>
            )}

            {/* ── WebRTC Video Modal ── */}
            {showVideoModal && (
                <div className="fixed inset-0 z-[2000] bg-black/80 flex items-center justify-center p-4">
                    <div className="bg-gray-900 rounded-2xl overflow-hidden w-full max-w-2xl shadow-2xl">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
                            <div>
                                <p className="text-white font-semibold">Live Driver Feed</p>
                                <p className="text-gray-400 text-xs mt-0.5">
                                    {viewingDriver?.name} ·{' '}
                                    <span className={
                                        rtcState === 'connected' ? 'text-green-400' :
                                            rtcState === 'connecting' ? 'text-amber-400' :
                                                rtcState === 'error' ? 'text-red-400' : 'text-gray-400'
                                    }>
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

                        {/* Video area */}
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

                        {/* Live telemetry strip */}
                        {viewingDriver && driverStatuses[viewingDriver.id] && (
                            <div className="px-5 py-3 bg-gray-800 flex items-center gap-6 text-sm">
                                <div>
                                    <span className="text-gray-400 text-xs">Status</span>
                                    <div className={`font-bold mt-0.5 ${driverStatuses[viewingDriver.id].status === 'DROWSY'
                                        ? 'text-red-400' : 'text-green-400'
                                        }`}>
                                        {driverStatuses[viewingDriver.id].status}
                                    </div>
                                </div>
                                <div>
                                    <span className="text-gray-400 text-xs">PERCLOS</span>
                                    <div className="text-white font-medium mt-0.5">
                                        {((driverStatuses[viewingDriver.id].perclos || 0) * 100).toFixed(1)}%
                                    </div>
                                </div>
                                <div>
                                    <span className="text-gray-400 text-xs">EAR</span>
                                    <div className="text-white font-medium mt-0.5 font-mono">
                                        {(driverStatuses[viewingDriver.id].ear || 0).toFixed(3)}
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
