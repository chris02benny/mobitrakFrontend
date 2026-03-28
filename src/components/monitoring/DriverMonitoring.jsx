/**
 * DriverMonitoring.jsx
 * Driver-side real-time drowsiness monitoring component.
 *
 * Features:
 *  - Camera access via getUserMedia
 *  - MediaPipe FaceMesh (loaded from CDN) for facial landmark detection
 *  - EAR + PERCLOS computation using drowsinessUtils
 *  - Pusher-based real-time events via REST API POST to /api/realtime/driver-monitoring
 *  - Throttled frame processing (~10 fps)
 */

import React, {
    useRef,
    useState,
    useEffect,
    useCallback,
} from 'react';
import {
    computeMeanEAR,
    computePERCLOS,
    getDrowsinessStatus,
    pushEARHistory,
    EAR_THRESHOLD,
    PERCLOS_THRESHOLD,
} from '../../utils/drowsinessUtils';
import { useDrowsinessAlert } from '../../hooks/useDrowsinessAlert';
import { apiConfig } from '../../config/apiConfig';

// ─── Constants ────────────────────────────────────────────────────────────────

const API_BASE_URL = apiConfig.baseUrl;

const PUSHER_KEY = import.meta.env.VITE_PUSHER_KEY || '3c443eb0dc81a17f2142';
const PUSHER_CLUSTER = import.meta.env.VITE_PUSHER_CLUSTER || 'ap2';

/** Target detection rate (ms between processed frames) */
const FRAME_INTERVAL_MS = 100; // ~10 fps

/** Emit telemetry at most every N ms, or when status changes */
const EMIT_INTERVAL_MS = 8000;

/** Threshold for low light (average pixel luminance) */
const LOW_LIGHT_THRESHOLD = 40;

/** Threshold for no face detected (ms) */
const NO_FACE_THRESHOLD_MS = 2000;

// ─── MediaPipe CDN Loader ─────────────────────────────────────────────────────

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

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getUser = () => {
    try {
        // First, try to get user from localStorage
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            const user = JSON.parse(storedUser);
            if (user && (user._id || user.id)) {
                console.log('[monitoring] Got user from localStorage:', user);
                return user;
            }
        }
        
        // Fallback: Extract from JWT token
        const token = localStorage.getItem('authToken');
        if (token) {
            try {
                const decoded = JSON.parse(atob(token.split('.')[1]));
                console.log('[monitoring] Full JWT payload:', decoded);
                
                // JWT structure: {user: {...}, iat, exp}
                // The actual user object is NESTED under the 'user' key
                if (decoded.user && typeof decoded.user === 'object') {
                    const userObj = decoded.user;
                    console.log('[monitoring] Extracted user from JWT.user:', userObj);
                    const userId = userObj._id || userObj.id || userObj.userId || userObj.sub;
                    
                    return {
                        _id: userId,
                        id: userId,
                        email: userObj.email,
                        name: userObj.name,
                        role: userObj.role
                    };
                }
            } catch (err) {
                console.error('[monitoring] Failed to extract user from JWT:', err.message);
            }
        }
        
        console.warn('[monitoring] No user found in localStorage or JWT token');
        return {};
    } catch (err) {
        console.error('[monitoring] getUser() error:', err.message);
        return {};
    }
};

// Post telemetry to backend which then triggers Pusher
async function postTelemetry(payload) {
    try {
        const token = localStorage.getItem('authToken');
        
        // ⚠️ Guard: validate driverId is present in payload
        if (!payload.driverId) {
            console.error('[monitoring] Telemetry blocked: driverId missing from payload. User object:', getUser());
            return;
        }
        
        console.log('[monitoring] Posting telemetry:', { driverId: payload.driverId, source: payload.source, status: payload.status });
        
        const url = `${API_BASE_URL}/api/realtime/driver-monitoring`;
        console.log('[monitoring] Request URL:', url);
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(payload),
        });

        if (response.ok) {
            console.log('[monitoring] Telemetry posted successfully:', { status: response.status });
        } else if (response.status === 400) {
            const errorData = await response.json();
            console.error('[monitoring] Backend rejected payload (400):', errorData);
        } else {
            console.error('[monitoring] Backend error:', { status: response.status, statusText: response.statusText, url });
        }
    } catch (err) {
        const url = `${API_BASE_URL}/api/realtime/driver-monitoring`;
        console.error('[monitoring] Failed to post telemetry - check network and CORS:', {
            message: err.message,
            attemptedUrl: url,
            apiBaseUrl: API_BASE_URL,
            errorType: err.name
        });
    }
}

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

    const earHistoryRef = useRef([]);           // sliding window of EAR values
    const lastFrameTimeRef = useRef(0);            // timestamp throttle
    const lastEmitTimeRef = useRef(0);            // emit throttle
    const lastStatusRef = useRef('ALERT');      // previous status for change detection
    const lastFaceTimeRef = useRef(Date.now());    // track last successful face detection
    const lastEarRef = useRef(0);
    const lastPerclosRef = useRef(0);

    // ── State ──────────────────────────────────────────────────────────────────
    const [isMonitoring, setIsMonitoring] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [status, setStatus] = useState('ALERT');
    const [ear, setEar] = useState(0);
    const [perclos, setPerclos] = useState(0);
    
    const { processFrame, enableAudioSystem, stopAudioSystem } = useDrowsinessAlert({
        earThreshold: 0.25, // Using a slightly forgiving threshold for earlier alerts
        perclosThreshold: 0.15,
        // Optional override: intercept alert changes if necessary, but the hook handles the core.
    });

    // ── Helper: Brightness Check ──────────────────────────────────────────────
    const checkBrightness = useCallback(() => {
        if (!videoRef.current || !canvasRef.current) return true;
        
        try {
            const ctx = canvasRef.current.getContext('2d', { willReadFrequently: true });
            canvasRef.current.width = 64;
            canvasRef.current.height = 48;
            ctx.drawImage(videoRef.current, 0, 0, 64, 48);
            
            const imageData = ctx.getImageData(0, 0, 64, 48);
            const data = imageData.data;
            let sum = 0;
            for (let i = 0; i < data.length; i += 4) {
                sum += (data[i] + data[i + 1] + data[i + 2]) / 3;
            }
            const avg = sum / (data.length / 4);
            return avg > LOW_LIGHT_THRESHOLD;
        } catch (err) {
            console.warn('[monitoring] Failed to check brightness:', err);
            return true; // Assume light is fine if we can't check
        }
    }, []);

    // ── MediaPipe FaceMesh: Process results ───────────────────────────────────
    const onFaceMeshResults = useCallback((results) => {
        const now = performance.now();
        if (now - lastFrameTimeRef.current < FRAME_INTERVAL_MS) return;
        lastFrameTimeRef.current = now;

        let currentStatus = 'ALERT';
        let meanEAR = lastEarRef.current;
        let currentPerclos = lastPerclosRef.current;

        // 1. Check Light Conditions
        const isLightEnough = checkBrightness();
        if (!isLightEnough) {
            currentStatus = 'LOW_LIGHT';
        }
        // 2. Check for Faces
        else if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
            if (Date.now() - lastFaceTimeRef.current > NO_FACE_THRESHOLD_MS) {
                currentStatus = 'NO_FACE';
            } else {
                currentStatus = lastStatusRef.current; // retain recent status gracefully
            }
        }
        // 3. Process Landmarks
        else {
            lastFaceTimeRef.current = Date.now();
            const landmarks = results.multiFaceLandmarks[0];
            meanEAR = computeMeanEAR(landmarks);
            earHistoryRef.current = pushEARHistory(earHistoryRef.current, meanEAR);
            currentPerclos = computePERCLOS(earHistoryRef.current);
            currentStatus = getDrowsinessStatus(currentPerclos);

            // Advance the alert system state machine
            processFrame(meanEAR, currentPerclos);
        }

        // Only update UI states to avoid excessive re-rendering 
        setEar(parseFloat(meanEAR.toFixed(3)));
        setPerclos(parseFloat(currentPerclos.toFixed(3)));
        setStatus(currentStatus);

        lastEarRef.current = meanEAR;
        lastPerclosRef.current = currentPerclos;

        // Stop potentially looping alarms immediately if face trace is completely lost or low light
        if (currentStatus === 'LOW_LIGHT' || currentStatus === 'NO_FACE') {
            stopAudioSystem();
        }

        const statusChanged = currentStatus !== lastStatusRef.current;
        const intervalElapsed = now - lastEmitTimeRef.current > EMIT_INTERVAL_MS;

        if (statusChanged || intervalElapsed) {
            const user = getUser();
            const activeTripId = sessionStorage.getItem('activeTripId') || null;

            // POST to backend → Pusher triggers fleet managers
            postTelemetry({
                driverId: user._id || user.id,
                tripId: activeTripId || null,
                status: currentStatus,
                perclos: parseFloat(currentPerclos.toFixed(4)),
                ear: parseFloat(meanEAR.toFixed(4)),
                monitoringActive: true,
                source: 'frame-analysis',
                timestamp: new Date().toISOString(),
            });

            lastEmitTimeRef.current = now;
            lastStatusRef.current = currentStatus;
        }
    }, [processFrame, checkBrightness, stopAudioSystem]);

    // ── Start Monitoring ──────────────────────────────────────────────────────
    const startMonitoring = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        
        // Initializing audio on user interaction
        enableAudioSystem();

        try {
            const user = getUser();
            const activeTripId = sessionStorage.getItem('activeTripId') || null;
            
            // Emit session-start event to notify fleet manager
            await postTelemetry({
                driverId: user._id || user.id,
                tripId: activeTripId,
                monitoringActive: true,
                status: 'ALERT',
                perclos: 0,
                ear: 0,
                source: 'session-start',
                timestamp: new Date().toISOString(),
            });
            
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480, facingMode: 'user' },
                audio: false,
            });
            streamRef.current = stream;

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }

            await loadScript(MEDIAPIPE_FACE_MESH_CDN);
            await loadScript(MEDIAPIPE_CAMERA_CDN);

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

            earHistoryRef.current = [];
            lastFrameTimeRef.current = 0;
            lastEmitTimeRef.current = 0;
            lastStatusRef.current = 'ALERT';
            lastFaceTimeRef.current = Date.now();
            lastEarRef.current = 0;
            lastPerclosRef.current = 0;

            setIsMonitoring(true);
        } catch (err) {
            console.error('[monitoring] Start error:', err);
            setError(err.message || 'Failed to start monitoring');
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(t => t.stop());
                streamRef.current = null;
            }
        } finally {
            setIsLoading(false);
        }
    }, [onFaceMeshResults, enableAudioSystem]);

    // ── Stop Monitoring ───────────────────────────────────────────────────────
    const stopMonitoring = useCallback(async () => {
        const user = getUser();
        const activeTripId = sessionStorage.getItem('activeTripId') || null;
        
        // Emit session-stop event before closing streams
        await postTelemetry({
            driverId: user._id || user.id,
            tripId: activeTripId,
            monitoringActive: false,
            status: 'INACTIVE',
            perclos: 0,
            ear: 0,
            source: 'session-stop',
            timestamp: new Date().toISOString(),
        }).catch(err => console.warn('[monitoring] Failed to send stop event:', err.message));
        
        if (cameraRef.current) {
            try {
                // Not all @mediapipe/camera_utils versions retain .stop() on the generic object
                if (typeof cameraRef.current.stop === 'function') cameraRef.current.stop();
            } catch (err) {
                console.warn('[monitoring] Non-fatal camera close exception:', err);
            }
            cameraRef.current = null;
        }
        if (faceMeshRef.current) {
            try {
                if (typeof faceMeshRef.current.close === 'function') faceMeshRef.current.close();
            } catch (err) {
                console.warn('[monitoring] Non-fatal faceMesh close exception:', err);
            }
            faceMeshRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }

        earHistoryRef.current = [];
        setIsMonitoring(false);
        setStatus('ALERT');
        setEar(0);
        setPerclos(0);
        lastEarRef.current = 0;
        lastPerclosRef.current = 0;
        
        // Cleanup Audio System
        stopAudioSystem();
    }, [stopAudioSystem]);

    useEffect(() => {
        return () => {
            if (isMonitoring) stopMonitoring();
        };
    }, [isMonitoring, stopMonitoring]);

    const isDrowsy = status === 'DROWSY';
    const isLowLight = status === 'LOW_LIGHT';
    const isNoFace = status === 'NO_FACE';
    const earPct = Math.min(ear / 0.4, 1);
    const perclosPct = Math.min(perclos / 1, 1);

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
                <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    Telemetrics Active
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

            {/* ── Alert Banner (LOW LIGHT) ── */}
            {isLowLight && isMonitoring && (
                <div className="flex items-center gap-3 bg-amber-50 border border-amber-300 rounded-xl px-5 py-4">
                    <span className="text-2xl">💡</span>
                    <div>
                        <p className="font-bold text-amber-800 text-lg">Camera Feed Too Dark</p>
                        <p className="text-sm text-amber-700">
                            Cannot analyze fatigue properly. Please improve the lighting in your cabin.
                        </p>
                    </div>
                </div>
            )}

            {/* ── Alert Banner (NO FACE) ── */}
            {isNoFace && isMonitoring && (
                <div className="flex items-center gap-3 bg-amber-50 border border-amber-300 rounded-xl px-5 py-4">
                    <span className="text-2xl">👤</span>
                    <div>
                        <p className="font-bold text-amber-800 text-lg">Face Not Detected</p>
                        <p className="text-sm text-amber-700">
                            Please align your face within the camera view to enable monitoring.
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
                                <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
                                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                    LIVE
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="relative bg-gray-900 aspect-video flex items-center justify-center">
                        <video
                            ref={videoRef}
                            className={`w-full h-full object-cover ${!isMonitoring ? 'invisible' : ''}`}
                            playsInline
                            muted
                        />
                        <canvas ref={canvasRef} className="hidden" />

                        {!isMonitoring && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                                <svg className="w-16 h-16 mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                        d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M4 8a2 2 0 00-2 2v4a2 2 0 002 2h8a2 2 0 002-2V10a2 2 0 00-2-2H4z" />
                                </svg>
                                <span className="text-sm">Camera not active</span>
                            </div>
                        )}

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
                    <div className={`rounded-xl border p-5 shadow-sm transition-colors duration-500 ${isDrowsy && isMonitoring
                        ? 'bg-red-50 border-red-200'
                        : (isLowLight || isNoFace) && isMonitoring ? 'bg-amber-50 border-amber-200'
                        : 'bg-white border-gray-200'
                        }`}>
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-sm font-medium text-gray-600">Driver Status</span>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${!isMonitoring
                                ? 'bg-gray-100 text-gray-500'
                                : isDrowsy
                                    ? 'bg-red-100 text-red-700'
                                    : (isLowLight || isNoFace)
                                        ? 'bg-amber-100 text-amber-700'
                                        : 'bg-green-100 text-green-700'
                                }`}>
                                {!isMonitoring ? 'Inactive' : (isLowLight ? 'Low Info' : (isNoFace ? 'Missing' : status))}
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

                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-xs text-blue-700 leading-relaxed">
                        <strong>How it works:</strong> Your camera detects facial landmarks in real-time. EAR measures how open your eyes are.
                        If your eyes stay closed for more than 40% of the last 15 seconds, a drowsiness alert is sent to your fleet manager.
                    </div>

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
