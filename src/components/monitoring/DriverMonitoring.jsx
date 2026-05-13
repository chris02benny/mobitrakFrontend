/**
 * DriverMonitoring.jsx
 * Driver-side real-time drowsiness monitoring component.
 *
 * Features:
 *  - Camera access via getUserMedia
 *  - MediaPipe FaceMesh (loaded from CDN) for facial landmark detection
 *  - EAR + PERCLOS computation using drowsinessUtils
 *  - Event-driven incident reporting via Socket.IO (incident:report)
 *  - MongoDB-backed alerts via REST API POST (fallback)
 *  - WebRTC escalation responder (starts camera stream on manager request)
 *  - Throttled frame processing (~10 fps)
 */

import React, {
    useRef,
    useState,
    useEffect,
    useCallback,
} from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
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

/**
 * Resolve fleetManagerId from employment API.
 * Cache result so repeated calls don't re-fetch.
 * 
 * Endpoint: GET /api/drivers/employments/current
 * Returns: { success: true, data: { _id, driverId, companyId, status, ... } }
 */
let cachedFleetManagerId = null;

async function resolveFleetManagerId(userId) {
    // Return cached value if already resolved
    if (cachedFleetManagerId) {
        console.log('[monitoring] Using cached fleetManagerId:', cachedFleetManagerId);
        return cachedFleetManagerId;
    }

    try {
        console.log('[monitoring] Resolving fleetManagerId from employment API...');
        
        const token = localStorage.getItem('authToken');
        if (!token) {
            console.warn('[monitoring] No auth token found');
            return null;
        }

        // Call the correct endpoint: GET /api/drivers/employments/current
        const response = await fetch(`${API_BASE_URL}/api/drivers/employments/current`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
        });
        
        if (!response.ok) {
            console.warn('[monitoring] Employment API returned', response.status);
            return null;
        }
        
        const data = await response.json();
        
        // Response format: { success: true, data: { companyId, status, ... } }
        if (data?.success && data?.data?.companyId) {
            cachedFleetManagerId = data.data.companyId;
            console.log('[monitoring] ✅ Resolved fleetManagerId from employment API:', cachedFleetManagerId);
            return cachedFleetManagerId;
        } else if (data?.data === null) {
            console.warn('[monitoring] No active employment found (data is null)');
            return null;
        } else {
            console.warn('[monitoring] Employment API response missing companyId:', data);
            return null;
        }
    } catch (err) {
        console.error('[monitoring] Failed to resolve fleetManagerId:', err.message);
        return null;
    }
}

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
                        role: userObj.role,
                        fleetManagerId: userObj.fleetManagerId || null
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

// Post telemetry to backend which stores to MongoDB
async function postTelemetry(payload) {
    try {
        const token = localStorage.getItem('authToken');
        const user = getUser();
        
        // ⚠️ CRITICAL Guard 1: ensure only drivers send telemetry
        const userRole = user?.role;
        if (userRole && userRole !== 'driver') {
            console.error('[monitoring] ❌ Telemetry BLOCKED: user is not a driver. Role:', userRole, 'User:', user);
            return;
        }
        
        // ⚠️ CRITICAL Guard 2: validate driverId is present
        if (!payload.driverId) {
            console.error('[monitoring] ❌ Telemetry blocked: missing driverId', payload);
            return;
        }

        // RESOLVE fleetManagerId if missing
        let fleetManagerId = payload.fleetManagerId || payload.companyId || payload.businessId;
        if (!fleetManagerId) {
            console.log('[monitoring] ⏳ fleetManagerId missing, resolving from API...');
            fleetManagerId = await resolveFleetManagerId(payload.driverId);
            
            if (!fleetManagerId) {
                console.error('[monitoring] ❌ Telemetry blocked: could not resolve fleetManagerId', payload);
                return;
            }
            
            console.log('[monitoring] ✅ fleetManagerId resolved:', fleetManagerId);
        }
        
        // Ensure ALL field name variants are set so both REST and socket handlers find it
        payload.fleetManagerId = fleetManagerId;
        payload.companyId = fleetManagerId;
        payload.businessId = fleetManagerId;
        
        // 🚀 LOG AS REQUESTED: Sending telemetry with full payload details
        console.log('🚀 Sending telemetry:', {
            driverId: payload.driverId,
            fleetManagerId: payload.fleetManagerId,
            status: payload.status,
            monitoringActive: payload.monitoringActive,
            source: payload.source,
            timestamp: payload.timestamp,
            perclos: payload.perclos,
            ear: payload.ear,
            userRole
        });
        
        const url = `${API_BASE_URL}/api/realtime/driver-monitoring`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(payload),
            mode: 'cors',
            credentials: 'include',
        });

        if (response.ok) {
            console.log('[monitoring] ✅ Telemetry posted successfully:', { status: response.status, driverId: payload.driverId });
        } else if (response.status === 400) {
            const errorData = await response.json();
            console.error('[monitoring] ❌ Backend rejected payload (400):', errorData);
        } else if (response.status === 401) {
            console.error('[monitoring] ❌ Unauthorized (401) - check authentication:', { url });
        } else if (response.status === 403) {
            console.error('[monitoring] ❌ Forbidden (403) - check permissions:', { url });
        } else if (response.status === 404) {
            console.error('[monitoring] ❌ Endpoint not found (404):', { url, statusText: response.statusText });
        } else if (response.status === 503) {
            const errorData = await response.json();
            console.error('[monitoring] ❌ Service Unavailable (503):', errorData);
        } else {
            console.error('[monitoring] ❌ Backend error:', { status: response.status, statusText: response.statusText, url });
        }
    } catch (err) {
        const url = `${API_BASE_URL}/api/realtime/driver-monitoring`;
        console.error('[monitoring] ❌ Network error - failed to send telemetry:', {
            message: err.message,
            attemptedUrl: url,
            apiBaseUrl: API_BASE_URL,
            errorType: err.name,
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
    const socketRef = useRef(null);   // Socket.IO connection
    const rtcPeerRef = useRef(null);  // WebRTC peer for escalation
    const resolvedBusinessIdRef = useRef(null); // Cached fleet manager/business ID

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
    const [isEscalated, setIsEscalated] = useState(false); // WebRTC escalation active
    
    const { processFrame, enableAudioSystem, stopAudioSystem } = useDrowsinessAlert({
        earThreshold: 0.25, // Using a slightly forgiving threshold for earlier alerts
        perclosThreshold: 0.15,
        // Optional override: intercept alert changes if necessary, but the hook handles the core.
    });

    // ── Eagerly resolve businessId on mount ────────────────────────────────────
    // This must happen BEFORE any telemetry is sent, so the socket and REST
    // paths always have a valid businessId/companyId.
    useEffect(() => {
        const user = getUser();
        const driverId = user?._id || user?.id;
        if (!driverId) return;

        // Check if already cached globally
        if (cachedFleetManagerId) {
            resolvedBusinessIdRef.current = cachedFleetManagerId;
            console.log('[monitoring] Using cached businessId:', cachedFleetManagerId);
            return;
        }

        // Check localStorage user object
        if (user.fleetManagerId) {
            resolvedBusinessIdRef.current = user.fleetManagerId;
            console.log('[monitoring] BusinessId from user:', user.fleetManagerId);
            return;
        }

        // Resolve from employment API
        resolveFleetManagerId(driverId).then(id => {
            if (id) {
                resolvedBusinessIdRef.current = id;
                console.log('[monitoring] ✅ BusinessId resolved from API:', id);
            } else {
                console.warn('[monitoring] ⚠️ Could not resolve businessId — telemetry will use REST fallback');
            }
        });
    }, []);

    // ── Socket.IO Connection (for incident:report) ─────────────────────────────
    useEffect(() => {
        const user = getUser();
        const driverId = user?._id || user?.id;
        if (!driverId) return;

        const socket = io(API_BASE_URL, {
            transports: ['websocket', 'polling'],
            withCredentials: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 2000,
        });

        socket.on('connect', () => {
            console.log('[monitoring] Socket connected:', socket.id);
            socket.emit('join-monitoring-room', driverId);
        });

        // ── WebRTC Escalation: Manager requests live video ─────────────────
        socket.on('webrtc:start', async (data) => {
            console.log('[monitoring] WebRTC escalation request received:', data);
            setIsEscalated(true);
            toast('🎥 Fleet manager is requesting live video feed.', {
                duration: 5000,
                icon: '📡',
            });

            try {
                // Use existing stream if monitoring is active, else get new one
                let stream = streamRef.current;
                if (!stream) {
                    stream = await navigator.mediaDevices.getUserMedia({
                        video: { width: 640, height: 480, facingMode: 'user' },
                        audio: false,
                    });
                }

                const pc = new RTCPeerConnection({
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:stun1.l.google.com:19302' },
                    ],
                });

                rtcPeerRef.current = pc;

                // Add video tracks to the peer connection
                stream.getTracks().forEach(track => pc.addTrack(track, stream));

                pc.onicecandidate = (event) => {
                    if (event.candidate) {
                        socket.emit('webrtc:ice-candidate', {
                            candidate: event.candidate,
                            targetSocketId: data.adminSocketId,
                        });
                    }
                };

                pc.onconnectionstatechange = () => {
                    console.log('[monitoring] WebRTC state:', pc.connectionState);
                    if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
                        setIsEscalated(false);
                    }
                };

                // Create and send offer
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);

                socket.emit('webrtc:offer', {
                    offer,
                    targetSocketId: data.adminSocketId,
                    sessionId: data.sessionId,
                    driverSocketId: socket.id,
                    sourceSocketId: socket.id,
                });

                console.log('[monitoring] WebRTC offer sent to manager');
            } catch (err) {
                console.error('[monitoring] WebRTC escalation error:', err);
                setIsEscalated(false);
            }
        });

        // Handle WebRTC answer from manager
        socket.on('webrtc:answer', async (data) => {
            try {
                if (rtcPeerRef.current && data.answer) {
                    await rtcPeerRef.current.setRemoteDescription(
                        new RTCSessionDescription(data.answer)
                    );
                    console.log('[monitoring] WebRTC answer applied');
                }
            } catch (err) {
                console.error('[monitoring] WebRTC answer error:', err);
            }
        });

        // Handle ICE candidates from manager
        socket.on('webrtc:ice-candidate', async (data) => {
            try {
                if (rtcPeerRef.current && data.candidate) {
                    await rtcPeerRef.current.addIceCandidate(
                        new RTCIceCandidate(data.candidate)
                    );
                }
            } catch (err) {
                console.warn('[monitoring] ICE candidate error:', err.message);
            }
        });

        // Handle session end
        socket.on('webrtc:ended', () => {
            console.log('[monitoring] WebRTC session ended by manager');
            if (rtcPeerRef.current) {
                rtcPeerRef.current.close();
                rtcPeerRef.current = null;
            }
            setIsEscalated(false);
            toast('Live monitoring session ended.', { icon: '📴' });
        });

        // Also handle legacy webrtc-start event
        socket.on('webrtc-start', (data) => {
            socket.emit('webrtc:start', data); // redirect to new handler
        });

        socket.on('disconnect', () => {
            console.log('[monitoring] Socket disconnected');
        });

        socketRef.current = socket;

        return () => {
            if (rtcPeerRef.current) {
                rtcPeerRef.current.close();
                rtcPeerRef.current = null;
            }
            socket.disconnect();
            socketRef.current = null;
        };
    }, []);

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

        if (statusChanged) {
            toast.dismiss('monitoring-toast');
            if (currentStatus === 'DROWSY') {
                toast.error('Drowsiness Detected! Please pull over safely and take a rest break.', { id: 'monitoring-toast', duration: 5000 });
            } else if (currentStatus === 'LOW_LIGHT') {
                toast.error('Camera Feed Too Dark. Please improve the lighting in your cabin.', { id: 'monitoring-toast', duration: 4000 });
            } else if (currentStatus === 'NO_FACE') {
                toast.error('Face Not Detected. Please align your face within the camera view.', { id: 'monitoring-toast', duration: 4000 });
            }
        }

        if (statusChanged || intervalElapsed) {
            const user = getUser();
            const driverId = user._id || user.id;
            // Use eagerly-resolved businessId (falls back to user.fleetManagerId)
            const businessId = resolvedBusinessIdRef.current || user.fleetManagerId || cachedFleetManagerId;

            const telemetryPayload = {
                driverId,
                fleetManagerId: businessId,
                // Send BOTH field names so REST handler and socket handler both work
                companyId: businessId,
                businessId: businessId,
                status: currentStatus,
                perclos: parseFloat(currentPerclos.toFixed(4)),
                ear: parseFloat(meanEAR.toFixed(4)),
                monitoringActive: true,
                source: 'frame-analysis',
                timestamp: new Date().toISOString(),
            };

            // 1. Emit via Socket.IO incident:report (primary path)
            if (socketRef.current?.connected && businessId) {
                socketRef.current.emit('incident:report', {
                    ...telemetryPayload,
                    driverName: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Driver',
                });
            }

            // 2. POST to REST API (fallback + MongoDB persistence)
            // postTelemetry has its own resolveFleetManagerId fallback
            postTelemetry(telemetryPayload)
                .catch(err => console.error('[monitoring] Uncaught postTelemetry error:', err));

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
            
            // Emit session-start event to notify fleet manager
            await postTelemetry({
                driverId: user._id || user.id,
                fleetManagerId: user.fleetManagerId,
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
            toast.error(err.message || 'Failed to start monitoring');
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
        
        // Emit session-stop event before closing streams
        await postTelemetry({
            driverId: user._id || user.id,
            fleetManagerId: user.fleetManagerId,
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
    const socketConnected = socketRef.current?.connected;

    return (
        <div className="flex flex-col gap-6 max-w-4xl mx-auto">
            {/* ── Header ── */}
            <div className="flex items-center justify-between">
                {/* Escalation indicator */}
                {isEscalated && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-100 border border-purple-200 rounded-full">
                        <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                        <span className="text-xs font-medium text-purple-700">Live Monitoring Active</span>
                    </div>
                )}
                <div className="flex items-center gap-3 text-sm text-gray-500 ml-auto">
                    <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${socketConnected ? 'bg-green-500' : 'bg-amber-400'}`} />
                        <span className="text-xs">{socketConnected ? 'Live' : 'Buffered'}</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* ── Video Feed ── */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm lg:col-span-2">
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
                <div className="flex flex-col gap-4 lg:col-span-1">
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
