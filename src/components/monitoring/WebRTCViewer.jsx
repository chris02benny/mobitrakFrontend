/**
 * WebRTCViewer.jsx
 * Fleet manager WebRTC video viewer for live incident monitoring.
 *
 * This component is rendered as a modal/overlay when a fleet manager
 * initiates live monitoring from the IncidentCenter.
 *
 * Flow:
 *   1. Manager clicks "Monitor Live" on an incident card
 *   2. WebRTCViewer emits `webrtc:request` via Socket.IO
 *   3. Driver receives `webrtc:start`, opens camera, sends SDP Offer
 *   4. This component receives Offer, creates Answer
 *   5. ICE candidates are exchanged
 *   6. Peer-to-peer video stream is displayed
 *
 * Security:
 *   - Video only activates on explicit manager request
 *   - No continuous streaming
 *   - Session is tracked in MongoDB
 *   - Room-based socket isolation
 */

import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
    Video,
    VideoOff,
    X,
    Phone,
    PhoneOff,
    Radio,
    Loader2,
    AlertTriangle,
    Maximize2,
    Minimize2,
} from 'lucide-react';

// ── STUN/TURN Configuration ─────────────────────────────────────────────────

const RTC_CONFIG = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
    ],
};

// ── Connection States ───────────────────────────────────────────────────────

const CONNECTION_STATES = {
    IDLE: 'IDLE',
    REQUESTING: 'REQUESTING',
    CONNECTING: 'CONNECTING',
    CONNECTED: 'CONNECTED',
    FAILED: 'FAILED',
    ENDED: 'ENDED',
};

const STATE_CONFIG = {
    IDLE: { label: 'Ready', color: 'text-gray-500', bg: 'bg-gray-100' },
    REQUESTING: { label: 'Requesting...', color: 'text-amber-600', bg: 'bg-amber-50' },
    CONNECTING: { label: 'Connecting...', color: 'text-blue-600', bg: 'bg-blue-50' },
    CONNECTED: { label: 'Live', color: 'text-green-600', bg: 'bg-green-50' },
    FAILED: { label: 'Failed', color: 'text-red-600', bg: 'bg-red-50' },
    ENDED: { label: 'Ended', color: 'text-gray-500', bg: 'bg-gray-100' },
};

const WebRTCViewer = ({ incident, socketRef, onClose }) => {
    const videoRef = useRef(null);
    const peerRef = useRef(null);
    const sessionIdRef = useRef(null);
    const driverSocketIdRef = useRef(null);

    const [connectionState, setConnectionState] = useState(CONNECTION_STATES.IDLE);
    const [duration, setDuration] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [error, setError] = useState(null);

    const driverId = incident?.driverId;
    const socket = socketRef?.current;

    // ── Duration Timer ──────────────────────────────────────────────────────
    useEffect(() => {
        let interval;
        if (connectionState === CONNECTION_STATES.CONNECTED) {
            interval = setInterval(() => setDuration(d => d + 1), 1000);
        }
        return () => clearInterval(interval);
    }, [connectionState]);

    const formatDuration = (secs) => {
        const m = Math.floor(secs / 60).toString().padStart(2, '0');
        const s = (secs % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    // ── Cleanup ─────────────────────────────────────────────────────────────
    const cleanup = useCallback(() => {
        if (peerRef.current) {
            peerRef.current.close();
            peerRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    }, []);

    // ── Create Peer Connection ──────────────────────────────────────────────
    const createPeerConnection = useCallback(() => {
        const pc = new RTCPeerConnection(RTC_CONFIG);

        pc.ontrack = (event) => {
            console.log('[WebRTC] Received remote track:', event.track.kind);
            if (videoRef.current && event.streams[0]) {
                videoRef.current.srcObject = event.streams[0];
                setConnectionState(CONNECTION_STATES.CONNECTED);
            }
        };

        pc.onicecandidate = (event) => {
            if (event.candidate && socket) {
                socket.emit('webrtc:ice-candidate', {
                    candidate: event.candidate,
                    targetSocketId: driverSocketIdRef.current,
                });
            }
        };

        pc.oniceconnectionstatechange = () => {
            console.log('[WebRTC] ICE state:', pc.iceConnectionState);
            if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
                setConnectionState(CONNECTION_STATES.FAILED);
                setError('Connection lost. The driver may have disconnected.');
            }
        };

        pc.onconnectionstatechange = () => {
            console.log('[WebRTC] Connection state:', pc.connectionState);
            if (pc.connectionState === 'connected') {
                setConnectionState(CONNECTION_STATES.CONNECTED);
            } else if (pc.connectionState === 'failed') {
                setConnectionState(CONNECTION_STATES.FAILED);
                setError('WebRTC connection failed.');
            }
        };

        peerRef.current = pc;
        return pc;
    }, [socket]);

    // ── Start Live Monitoring ───────────────────────────────────────────────
    const startMonitoring = useCallback(() => {
        if (!socket || !driverId) {
            setError('Socket not connected or driver ID missing');
            return;
        }

        setConnectionState(CONNECTION_STATES.REQUESTING);
        setError(null);
        setDuration(0);

        const user = JSON.parse(localStorage.getItem('user') || '{}');

        // Request live video from driver
        socket.emit('webrtc:request', {
            driverId,
            incidentId: incident?._id,
            managerId: user?.id || user?._id,
            businessId: user?.id || user?._id,
        });

        console.log('[WebRTC] Sent webrtc:request for driver:', driverId);
    }, [socket, driverId, incident]);

    // ── End Live Monitoring ─────────────────────────────────────────────────
    const endMonitoring = useCallback(() => {
        if (socket && sessionIdRef.current) {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            socket.emit('webrtc:end', {
                sessionId: sessionIdRef.current,
                reason: 'MANAGER_ENDED',
                incidentId: incident?._id,
                businessId: user?.id || user?._id,
                targetSocketId: driverSocketIdRef.current,
            });
        }

        cleanup();
        setConnectionState(CONNECTION_STATES.ENDED);
    }, [socket, incident, cleanup]);

    // ── Socket Event Listeners ──────────────────────────────────────────────
    useEffect(() => {
        if (!socket) return;

        // Confirmation that request was forwarded
        const handleRequestSent = (data) => {
            console.log('[WebRTC] Request sent, session:', data.sessionId);
            sessionIdRef.current = data.sessionId;
            setConnectionState(CONNECTION_STATES.CONNECTING);
        };

        // Receive SDP Offer from driver
        const handleOffer = async (data) => {
            console.log('[WebRTC] Received offer from driver');
            driverSocketIdRef.current = data.driverSocketId || data.sourceSocketId;

            try {
                const pc = createPeerConnection();
                await pc.setRemoteDescription(new RTCSessionDescription(data.offer || data));

                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);

                socket.emit('webrtc:answer', {
                    answer,
                    targetSocketId: driverSocketIdRef.current,
                    sessionId: sessionIdRef.current,
                });

                console.log('[WebRTC] Sent answer to driver');
            } catch (err) {
                console.error('[WebRTC] Error handling offer:', err);
                setConnectionState(CONNECTION_STATES.FAILED);
                setError('Failed to establish connection: ' + err.message);
            }
        };

        // Receive ICE candidate from driver
        const handleIceCandidate = async (data) => {
            try {
                if (peerRef.current && data.candidate) {
                    await peerRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
                }
            } catch (err) {
                console.warn('[WebRTC] ICE candidate error:', err.message);
            }
        };

        // Session ended by driver
        const handleEnded = (data) => {
            console.log('[WebRTC] Session ended by driver:', data.reason);
            cleanup();
            setConnectionState(CONNECTION_STATES.ENDED);
        };

        // Error from server
        const handleError = (data) => {
            console.error('[WebRTC] Server error:', data.error);
            setConnectionState(CONNECTION_STATES.FAILED);
            setError(data.error);
        };

        socket.on('webrtc:request_sent', handleRequestSent);
        socket.on('webrtc:offer', handleOffer);
        socket.on('webrtc:ice-candidate', handleIceCandidate);
        socket.on('webrtc:ended', handleEnded);
        socket.on('webrtc:error', handleError);

        // Also listen for legacy events (backward compat)
        socket.on('webrtc-offer', handleOffer);
        socket.on('webrtc-ice-candidate', handleIceCandidate);

        return () => {
            socket.off('webrtc:request_sent', handleRequestSent);
            socket.off('webrtc:offer', handleOffer);
            socket.off('webrtc:ice-candidate', handleIceCandidate);
            socket.off('webrtc:ended', handleEnded);
            socket.off('webrtc:error', handleError);
            socket.off('webrtc-offer', handleOffer);
            socket.off('webrtc-ice-candidate', handleIceCandidate);
        };
    }, [socket, createPeerConnection, cleanup]);

    // ── Cleanup on unmount ──────────────────────────────────────────────────
    useEffect(() => {
        return () => {
            endMonitoring();
        };
    }, [endMonitoring]);

    // ── Auto-start on mount ─────────────────────────────────────────────────
    useEffect(() => {
        if (connectionState === CONNECTION_STATES.IDLE) {
            startMonitoring();
        }
    }, []);

    const stateConfig = STATE_CONFIG[connectionState];

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className={`bg-white rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 ${
                isFullscreen ? 'w-full h-full rounded-none' : 'w-full max-w-2xl mx-4'
            }`}>
                {/* Header */}
                <div className="bg-gray-900 px-5 py-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${stateConfig.bg} ${stateConfig.color}`}>
                            {connectionState === CONNECTION_STATES.CONNECTED && (
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                            )}
                            {connectionState === CONNECTION_STATES.CONNECTING && (
                                <Loader2 size={12} className="animate-spin" />
                            )}
                            {stateConfig.label}
                        </div>
                        <div>
                            <p className="text-white text-sm font-semibold">
                                {incident?.driverName || 'Driver Feed'}
                            </p>
                            <p className="text-gray-400 text-xs">
                                {incident?.type?.replace(/_/g, ' ')} · {incident?.severity}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {connectionState === CONNECTION_STATES.CONNECTED && (
                            <span className="text-green-400 text-xs font-mono">
                                {formatDuration(duration)}
                            </span>
                        )}
                        <button
                            onClick={() => setIsFullscreen(!isFullscreen)}
                            className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                        >
                            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                        </button>
                        <button
                            onClick={() => { endMonitoring(); onClose(); }}
                            className="p-1.5 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Video Feed */}
                <div className={`relative bg-gray-950 flex items-center justify-center ${
                    isFullscreen ? 'h-[calc(100vh-120px)]' : 'aspect-video'
                }`}>
                    <video
                        ref={videoRef}
                        className={`w-full h-full object-contain ${
                            connectionState === CONNECTION_STATES.CONNECTED ? '' : 'hidden'
                        }`}
                        autoPlay
                        playsInline
                        muted
                    />

                    {/* Overlay states */}
                    {connectionState === CONNECTION_STATES.REQUESTING && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                            <Radio size={48} className="animate-pulse mb-4 text-amber-500" />
                            <p className="text-lg font-medium text-white">Requesting Driver Feed...</p>
                            <p className="text-sm text-gray-500 mt-1">Waiting for driver to accept</p>
                        </div>
                    )}

                    {connectionState === CONNECTION_STATES.CONNECTING && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                            <Loader2 size={48} className="animate-spin mb-4 text-blue-500" />
                            <p className="text-lg font-medium text-white">Establishing Connection...</p>
                            <p className="text-sm text-gray-500 mt-1">Setting up secure video stream</p>
                        </div>
                    )}

                    {connectionState === CONNECTION_STATES.FAILED && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                            <AlertTriangle size={48} className="mb-4 text-red-500" />
                            <p className="text-lg font-medium text-white">Connection Failed</p>
                            <p className="text-sm text-red-400 mt-1 max-w-xs text-center">
                                {error || 'Unable to connect to driver feed'}
                            </p>
                            <button
                                onClick={startMonitoring}
                                className="mt-4 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg transition-colors"
                            >
                                Retry
                            </button>
                        </div>
                    )}

                    {connectionState === CONNECTION_STATES.ENDED && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                            <VideoOff size={48} className="mb-4 text-gray-500" />
                            <p className="text-lg font-medium text-white">Session Ended</p>
                            <p className="text-sm text-gray-500 mt-1">
                                Duration: {formatDuration(duration)}
                            </p>
                        </div>
                    )}

                    {/* Live indicator overlay */}
                    {connectionState === CONNECTION_STATES.CONNECTED && (
                        <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/60 rounded-lg px-3 py-1.5">
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                            <span className="text-white text-xs font-medium">LIVE</span>
                            <span className="text-gray-400 text-xs">
                                {formatDuration(duration)}
                            </span>
                        </div>
                    )}
                </div>

                {/* Footer Controls */}
                <div className="bg-gray-100 px-5 py-3 flex items-center justify-between">
                    <div className="text-xs text-gray-500">
                        {connectionState === CONNECTION_STATES.CONNECTED
                            ? 'Peer-to-peer encrypted connection'
                            : 'WebRTC secure signaling via Socket.IO'}
                    </div>

                    <div className="flex items-center gap-2">
                        {connectionState === CONNECTION_STATES.CONNECTED && (
                            <button
                                onClick={endMonitoring}
                                className="flex items-center gap-1.5 px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-xs font-medium rounded-lg transition-colors"
                            >
                                <PhoneOff size={14} />
                                End Session
                            </button>
                        )}
                        {(connectionState === CONNECTION_STATES.FAILED || connectionState === CONNECTION_STATES.ENDED) && (
                            <button
                                onClick={startMonitoring}
                                className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium rounded-lg transition-colors"
                            >
                                <Phone size={14} />
                                Reconnect
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WebRTCViewer;
