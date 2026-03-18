/**
 * DriverMonitoring.jsx
 * Driver-side real-time drowsiness monitoring component.
 *
 * Features:
 *  - Camera access via getUserMedia
 *  - MediaPipe FaceMesh (loaded from CDN) for facial landmark detection
 *  - EAR + PERCLOS computation using drowsinessUtils
 *  - Socket.IO event emission: "driver_monitoring"
 *  - WebRTC peer-to-peer video stream to admin
 *  - Picture-in-Picture toggle
 *  - Throttled frame processing (~10 fps)
 */

import React, {
    useRef,
    useState,
    useEffect,
    useCallback,
} from 'react';
import { io } from 'socket.io-client';
import {
    computeMeanEAR,
    computePERCLOS,
    getDrowsinessStatus,
    pushEARHistory,
    EAR_THRESHOLD,
    PERCLOS_THRESHOLD,
} from '../../utils/drowsinessUtils';

// ─── Constants ────────────────────────────────────────────────────────────────

const TRIP_SERVICE_URL =
    import.meta.env.VITE_TRIP_SERVICE_URL ||
    import.meta.env.VITE_API_URL ||
    'http://localhost:5004';

/** Target detection rate (ms between processed frames) */
const FRAME_INTERVAL_MS = 100; // ~10 fps

/** Emit socket event at most every N ms, or when status changes */
const EMIT_INTERVAL_MS = 8000;

// ─── MediaPipe CDN Loader ─────────────────────────────────────────────────────

/**
 * Dynamically loads a script from CDN if not already loaded.
 * Returns a Promise that resolves when the script is ready.
 */
function loadScript(src) {
    return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) {
            resolve();
            return;
        }
        const s = document.createElement('script');
        s.src = src;
        s.crossOrigin = 'anonymous';
        s.onload = resolve;
        s.onerror = () => reject(new Error(`Failed to load: ${src}`));
        document.head.appendChild(s);
    });
}

const MEDIAPIPE_FACE_MESH_CDN =
    'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/face_mesh.js';
const MEDIAPIPE_CAMERA_CDN =
    'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils@0.3.1632432234/camera_utils.js';

// ─── WebRTC ICE Config ────────────────────────────────────────────────────────

const RTC_CONFIG = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

const DriverMonitoring = () => {
    // ── Refs ───────────────────────────────────────────────────────────────────
    const videoRef = useRef(null);   // live camera feed
    const canvasRef = useRef(null);   // hidden canvas for MediaPipe
    const streamRef = useRef(null);   // MediaStream from camera
    const faceMeshRef = useRef(null);   // MediaPipe FaceMesh instance
    const cameraRef = useRef(null);   // MediaPipe Camera helper
    const socketRef = useRef(null);   // Socket.IO connection
    const peerRef = useRef(null);   // RTCPeerConnection

    const earHistoryRef = useRef([]);           // sliding window of EAR values
    const lastFrameTimeRef = useRef(0);            // timestamp throttle
    const lastEmitTimeRef = useRef(0);            // emit throttle
    const lastStatusRef = useRef('ALERT');      // previous status for change detection
    const adminSocketIdRef = useRef(null);         // target socket for WebRTC offer

    // ── State ──────────────────────────────────────────────────────────────────
    const [isMonitoring, setIsMonitoring] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [status, setStatus] = useState('ALERT');
    const [ear, setEar] = useState(0);
    const [perclos, setPerclos] = useState(0);
    const [isPiP, setIsPiP] = useState(false);
    const [socketReady, setSocketReady] = useState(false);

    // ── Helpers from localStorage ─────────────────────────────────────────────
    const getUser = () => {
        try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; }
    };

    // ── Socket.IO Connection ──────────────────────────────────────────────────
    useEffect(() => {
        const socket = io(TRIP_SERVICE_URL, {
            reconnection: true,
            transports: ['polling', 'websocket'],
        });

        socket.on('connect', () => {
            console.log('[monitoring] Socket connected:', socket.id);
            const user = getUser();
            if (user.id) {
                socket.emit('join-monitoring-room', user.id);
            }
            setSocketReady(true);
        });

        socket.on('disconnect', () => {
            console.log('[monitoring] Socket disconnected');
            setSocketReady(false);
        });

        // ── WebRTC: Admin requested our video ──────────────────────────────
        socket.on('webrtc-start', async (data) => {
            console.log('[WebRTC] Admin requested video, admin socketId:', data.adminSocketId);
            adminSocketIdRef.current = data.adminSocketId;

            if (!streamRef.current) {
                console.warn('[WebRTC] No stream available yet');
                return;
            }
            await initiateWebRTCOffer(data.adminSocketId);
        });

        // ── WebRTC: Receive admin's SDP answer ────────────────────────────
        socket.on('webrtc-answer', async (data) => {
            const pc = peerRef.current;
            if (!pc) return;
            try {
                await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
                console.log('[WebRTC] Remote description (answer) set');
            } catch (err) {
                console.error('[WebRTC] setRemoteDescription error:', err);
            }
        });

        // ── WebRTC: Receive ICE candidate from admin ──────────────────────
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

        return () => {
            socket.disconnect();
        };
    }, []);

    // ── WebRTC: Create offer ──────────────────────────────────────────────────
    const initiateWebRTCOffer = useCallback(async (adminSocketId) => {
        // Clean up previous peer connection if any
        if (peerRef.current) {
            peerRef.current.close();
        }

        const pc = new RTCPeerConnection(RTC_CONFIG);
        peerRef.current = pc;

        // Add all local video tracks
        const stream = streamRef.current;
        if (stream) {
            stream.getTracks().forEach(track => pc.addTrack(track, stream));
        }

        // ICE candidate handler
        pc.onicecandidate = (event) => {
            if (event.candidate && socketRef.current) {
                socketRef.current.emit('webrtc-ice-candidate', {
                    candidate: event.candidate,
                    targetSocketId: adminSocketId,
                });
            }
        };

        // Create and send SDP offer
        try {
            const offer = await pc.createOffer({ offerToReceiveVideo: false });
            await pc.setLocalDescription(offer);

            socketRef.current?.emit('webrtc-offer', {
                sdp: pc.localDescription,
                targetSocketId: adminSocketId,
                driverId: getUser().id,
            });
            console.log('[WebRTC] Offer sent to admin:', adminSocketId);
        } catch (err) {
            console.error('[WebRTC] createOffer error:', err);
        }
    }, []);

    // ── MediaPipe FaceMesh: Process results ───────────────────────────────────
    const onFaceMeshResults = useCallback((results) => {
        // Throttle: only process every FRAME_INTERVAL_MS
        const now = performance.now();
        if (now - lastFrameTimeRef.current < FRAME_INTERVAL_MS) return;
        lastFrameTimeRef.current = now;

        if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
            return; // No face detected
        }

        const landmarks = results.multiFaceLandmarks[0];

        // Compute EAR for this frame
        const meanEAR = computeMeanEAR(landmarks);

        // Update sliding window
        earHistoryRef.current = pushEARHistory(earHistoryRef.current, meanEAR);

        // Compute PERCLOS over window
        const currentPerclos = computePERCLOS(earHistoryRef.current);

        // Determine status
        const currentStatus = getDrowsinessStatus(currentPerclos);

        // Update React state for UI display
        setEar(parseFloat(meanEAR.toFixed(3)));
        setPerclos(parseFloat(currentPerclos.toFixed(3)));
        setStatus(currentStatus);

        // Emit socket event if status changed OR periodic interval elapsed
        const statusChanged = currentStatus !== lastStatusRef.current;
        const intervalElapsed = now - lastEmitTimeRef.current > EMIT_INTERVAL_MS;

        if ((statusChanged || intervalElapsed) && socketRef.current?.connected) {
            const user = getUser();
            const activeTripId = sessionStorage.getItem('activeTripId') || null;

            socketRef.current.emit('driver_monitoring', {
                driverId: user.id,
                tripId: activeTripId,
                status: currentStatus,
                perclos: parseFloat(currentPerclos.toFixed(4)),
                ear: parseFloat(meanEAR.toFixed(4)),
                timestamp: new Date().toISOString(),
            });

            lastEmitTimeRef.current = now;
            lastStatusRef.current = currentStatus;
        }
    }, []);

    // ── Start Monitoring ──────────────────────────────────────────────────────
    const startMonitoring = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            // 1. Get camera access
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480, facingMode: 'user' },
                audio: false,
            });
            streamRef.current = stream;

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }

            // 2. Load MediaPipe scripts from CDN
            await loadScript(MEDIAPIPE_FACE_MESH_CDN);
            await loadScript(MEDIAPIPE_CAMERA_CDN);

            // 3. Initialize FaceMesh
            const FaceMesh = window.FaceMesh;
            if (!FaceMesh) throw new Error('MediaPipe FaceMesh failed to load from CDN');

            const faceMesh = new FaceMesh({
                locateFile: (file) =>
                    `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/${file}`,
            });

            faceMesh.setOptions({
                maxNumFaces: 1,
                refineLandmarks: true,
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.5,
            });

            faceMesh.onResults(onFaceMeshResults);
            await faceMesh.initialize();
            faceMeshRef.current = faceMesh;

            // 4. Use MediaPipe Camera helper to feed video frames
            const Camera = window.Camera;
            if (!Camera) throw new Error('MediaPipe Camera utils failed to load from CDN');

            const camera = new Camera(videoRef.current, {
                onFrame: async () => {
                    if (faceMeshRef.current) {
                        await faceMeshRef.current.send({ image: videoRef.current });
                    }
                },
                width: 640,
                height: 480,
            });

            await camera.start();
            cameraRef.current = camera;

            // 5. Reset tracking state
            earHistoryRef.current = [];
            lastFrameTimeRef.current = 0;
            lastEmitTimeRef.current = 0;
            lastStatusRef.current = 'ALERT';

            setIsMonitoring(true);
        } catch (err) {
            console.error('[monitoring] Start error:', err);
            setError(err.message || 'Failed to start monitoring');
            // Clean up stream if camera opened but something else failed
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(t => t.stop());
                streamRef.current = null;
            }
        } finally {
            setIsLoading(false);
        }
    }, [onFaceMeshResults]);

    // ── Stop Monitoring ───────────────────────────────────────────────────────
    const stopMonitoring = useCallback(() => {
        // Stop MediaPipe camera
        if (cameraRef.current) {
            cameraRef.current.stop();
            cameraRef.current = null;
        }

        // Close FaceMesh
        if (faceMeshRef.current) {
            faceMeshRef.current.close();
            faceMeshRef.current = null;
        }

        // Stop camera stream
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }

        // Close WebRTC peer connection
        if (peerRef.current) {
            peerRef.current.close();
            peerRef.current = null;
        }

        // Exit PiP if active
        if (document.pictureInPictureElement) {
            document.exitPictureInPicture().catch(() => { });
        }

        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }

        // Reset state
        earHistoryRef.current = [];
        setIsMonitoring(false);
        setStatus('ALERT');
        setEar(0);
        setPerclos(0);
        setIsPiP(false);
    }, []);

    // ── PiP Toggle ────────────────────────────────────────────────────────────
    const togglePiP = useCallback(async () => {
        if (!videoRef.current) return;
        try {
            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
                setIsPiP(false);
            } else {
                await videoRef.current.requestPictureInPicture();
                setIsPiP(true);
            }
        } catch (err) {
            console.warn('[PiP] Toggle failed:', err.message);
        }
    }, []);

    // ── Track PiP exit via browser button ─────────────────────────────────────
    useEffect(() => {
        const handler = () => setIsPiP(false);
        document.addEventListener('leavepictureinpicture', handler);
        return () => document.removeEventListener('leavepictureinpicture', handler);
    }, []);

    // ── Cleanup on unmount ────────────────────────────────────────────────────
    useEffect(() => {
        return () => {
            if (isMonitoring) stopMonitoring();
        };
    }, [isMonitoring, stopMonitoring]);

    // ── Derived UI values ─────────────────────────────────────────────────────
    const isDrowsy = status === 'DROWSY';
    const earPct = Math.min(ear / 0.4, 1);   // normalize for display bar
    const perclosPct = Math.min(perclos / 1, 1);

    // ─────────────────────────────────────────────────────────────────────────
    // Render
    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="flex flex-col gap-6 max-w-4xl mx-auto">
            {/* ── Header ── */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Driver Monitoring</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Real-time drowsiness detection using facial landmark analysis
                    </p>
                </div>

                {/* Socket status indicator */}
                <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span className={`w-2 h-2 rounded-full ${socketReady ? 'bg-green-500' : 'bg-red-400'}`} />
                    {socketReady ? 'Connected' : 'Disconnected'}
                </div>
            </div>

            {/* ── Alert Banner (DROWSY) ── */}
            {isDrowsy && isMonitoring && (
                <div className="flex items-center gap-3 bg-red-50 border border-red-300 rounded-xl px-5 py-4 animate-pulse">
                    <span className="text-2xl">⚠️</span>
                    <div>
                        <p className="font-bold text-red-700 text-lg">Drowsiness Detected!</p>
                        <p className="text-sm text-red-600">
                            Please pull over safely and take a rest break.
                            Your fleet manager has been notified.
                        </p>
                    </div>
                </div>
            )}

            {/* ── Error Banner ── */}
            {error && (
                <div className="flex items-center gap-3 bg-amber-50 border border-amber-300 rounded-xl px-5 py-4">
                    <span className="text-xl">⚠️</span>
                    <div>
                        <p className="font-semibold text-amber-800">Could not start monitoring</p>
                        <p className="text-sm text-amber-700">{error}</p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* ── Video Feed ── */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                    <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                        <span className="font-semibold text-gray-800 text-sm">Camera Feed</span>
                        {isMonitoring && (
                            <div className="flex items-center gap-2">
                                {/* Live indicator */}
                                <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
                                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                    LIVE
                                </span>
                                {/* PiP button */}
                                {'pictureInPictureEnabled' in document && (
                                    <button
                                        onClick={togglePiP}
                                        title={isPiP ? 'Exit Picture-in-Picture' : 'Picture-in-Picture'}
                                        className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-gray-700"
                                    >
                                        {isPiP ? '⬛ Exit PiP' : '⧉ PiP'}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="relative bg-gray-900 aspect-video flex items-center justify-center">
                        {/* Video element — always mounted so we can reference it */}
                        <video
                            ref={videoRef}
                            className={`w-full h-full object-cover ${!isMonitoring ? 'invisible' : ''}`}
                            playsInline
                            muted
                        />

                        {/* Hidden canvas for MediaPipe */}
                        <canvas ref={canvasRef} className="hidden" />

                        {/* Placeholder when not monitoring */}
                        {!isMonitoring && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                                <svg className="w-16 h-16 mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                        d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M4 8a2 2 0 00-2 2v4a2 2 0 002 2h8a2 2 0 002-2V10a2 2 0 00-2-2H4z" />
                                </svg>
                                <span className="text-sm">Camera not active</span>
                            </div>
                        )}

                        {/* EAR overlay (bottom-left) */}
                        {isMonitoring && (
                            <div className="absolute bottom-3 left-3 bg-black/60 rounded-lg px-3 py-2 text-xs text-white font-mono space-y-1">
                                <div>EAR: <span className={ear < EAR_THRESHOLD ? 'text-red-400' : 'text-green-400'}>{ear.toFixed(3)}</span></div>
                                <div>PERCLOS: <span className={perclos > PERCLOS_THRESHOLD ? 'text-red-400' : 'text-green-400'}>{(perclos * 100).toFixed(1)}%</span></div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Status Panel ── */}
                <div className="flex flex-col gap-4">
                    {/* Status Card */}
                    <div className={`rounded-xl border p-5 shadow-sm transition-colors duration-500 ${isDrowsy && isMonitoring
                        ? 'bg-red-50 border-red-200'
                        : 'bg-white border-gray-200'
                        }`}>
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-sm font-medium text-gray-600">Driver Status</span>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${!isMonitoring
                                ? 'bg-gray-100 text-gray-500'
                                : isDrowsy
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-green-100 text-green-700'
                                }`}>
                                {!isMonitoring ? 'Inactive' : status}
                            </span>
                        </div>

                        {/* EAR Meter */}
                        <div className="mb-4">
                            <div className="flex justify-between text-xs text-gray-500 mb-1">
                                <span>Eye Aspect Ratio (EAR)</span>
                                <span>{ear.toFixed(3)}</span>
                            </div>
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-200 ${isMonitoring && ear < EAR_THRESHOLD ? 'bg-red-500' : 'bg-green-500'
                                        }`}
                                    style={{ width: `${earPct * 100}%` }}
                                />
                            </div>
                            <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                                <span>0 (closed)</span>
                                <span className="text-amber-500">▼ {EAR_THRESHOLD} threshold</span>
                                <span>0.40 (open)</span>
                            </div>
                        </div>

                        {/* PERCLOS Meter */}
                        <div>
                            <div className="flex justify-between text-xs text-gray-500 mb-1">
                                <span>PERCLOS (15s window)</span>
                                <span>{(perclos * 100).toFixed(1)}%</span>
                            </div>
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-200 ${isMonitoring && perclos > PERCLOS_THRESHOLD ? 'bg-red-500' : 'bg-amber-400'
                                        }`}
                                    style={{ width: `${perclosPct * 100}%` }}
                                />
                            </div>
                            <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                                <span>0%</span>
                                <span className="text-red-400">▼ {PERCLOS_THRESHOLD * 100}% alert</span>
                                <span>100%</span>
                            </div>
                        </div>
                    </div>

                    {/* Info Cards */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                            <p className="text-xs text-gray-500 mb-1">Detection Rate</p>
                            <p className="text-lg font-bold text-gray-800">~10 fps</p>
                        </div>
                        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                            <p className="text-xs text-gray-500 mb-1">Window</p>
                            <p className="text-lg font-bold text-gray-800">15 seconds</p>
                        </div>
                    </div>

                    {/* Help text */}
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-xs text-blue-700 leading-relaxed">
                        <strong>How it works:</strong> Your camera detects facial landmarks in real-time. EAR measures how open your eyes are.
                        If your eyes stay closed for more than 40% of the last 15 seconds, a drowsiness alert is sent to your fleet manager.
                    </div>

                    {/* Start / Stop Button */}
                    <button
                        onClick={isMonitoring ? stopMonitoring : startMonitoring}
                        disabled={isLoading}
                        className={`w-full py-3.5 rounded-xl font-semibold text-white transition-all duration-200 flex items-center justify-center gap-2 ${isLoading
                            ? 'bg-gray-400 cursor-not-allowed'
                            : isMonitoring
                                ? 'bg-red-500 hover:bg-red-600 active:scale-95'
                                : 'bg-amber-500 hover:bg-amber-600 active:scale-95'
                            }`}
                    >
                        {isLoading ? (
                            <>
                                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                Loading MediaPipe...
                            </>
                        ) : isMonitoring ? (
                            <>
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                                </svg>
                                Stop Monitoring
                            </>
                        ) : (
                            <>
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                Start Monitoring
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DriverMonitoring;
