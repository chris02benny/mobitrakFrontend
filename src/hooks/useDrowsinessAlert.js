import { useEffect, useRef, useCallback } from 'react';

const ALERT_STATES = {
    IDLE: 'IDLE',
    WARNING: 'WARNING',
    CRITICAL: 'CRITICAL',
};

export function useDrowsinessAlert({
    earThreshold = 0.25,
    perclosThreshold = 0.15,
    warningFramesThreshold = 5,    // Wait for at least 5 frames (~0.5s) to warn
    criticalFramesThreshold = 10,  // Frames (at ~10fps, this is 1s)
    recoveryFramesThreshold = 8,   // Frames to recover to IDLE 
    speechIntervalMs = 5000,
    onAlertChange = () => { },
}) {
    const stateRef = useRef(ALERT_STATES.IDLE);
    const drowsyFramesCount = useRef(0);
    const awakeFramesCount = useRef(0);

    const audioCtxRef = useRef(null);
    const beepIntervalRef = useRef(null);
    const speechIntervalRef = useRef(null);
    
    // Stabilize the callback to prevent infinite re-render loops in consumers
    const onAlertChangeRef = useRef(onAlertChange);
    useEffect(() => {
        onAlertChangeRef.current = onAlertChange;
    }, [onAlertChange]);

    // 1. Initialize Audio Context safely
    const initAudioCtx = useCallback(() => {
        if (!audioCtxRef.current) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                audioCtxRef.current = new AudioContext();
            }
        }
        if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
            audioCtxRef.current.resume().catch(e => console.warn("AudioContext resume failed", e));
        }
    }, []);

    // 2. Hardware beep synthesizer
    const playSyntheticBeep = useCallback(() => {
        if (!audioCtxRef.current) return;
        
        try {
            const osc = audioCtxRef.current.createOscillator();
            const gainNode = audioCtxRef.current.createGain();
            
            osc.connect(gainNode);
            gainNode.connect(audioCtxRef.current.destination);
            
            osc.type = 'square'; // Harsh warning sound
            osc.frequency.setValueAtTime(880, audioCtxRef.current.currentTime); // A5
            
            // Envelope to prevent clicking
            gainNode.gain.setValueAtTime(0, audioCtxRef.current.currentTime);
            gainNode.gain.linearRampToValueAtTime(1, audioCtxRef.current.currentTime + 0.05);
            gainNode.gain.linearRampToValueAtTime(0, audioCtxRef.current.currentTime + 0.4);
            
            osc.start(audioCtxRef.current.currentTime);
            osc.stop(audioCtxRef.current.currentTime + 0.5);
        } catch (e) {
            console.warn("Failed to play synthetic alarm beep", e);
        }
    }, []);

    const startAlarm = useCallback(() => {
        initAudioCtx();
        if (beepIntervalRef.current) return;
        playSyntheticBeep(); // Play immediately
        beepIntervalRef.current = setInterval(playSyntheticBeep, 600); // Repeat rapidly
    }, [initAudioCtx, playSyntheticBeep]);

    const stopAlarm = useCallback(() => {
        if (beepIntervalRef.current) {
            clearInterval(beepIntervalRef.current);
            beepIntervalRef.current = null;
        }
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopAlarm();
            if ('speechSynthesis' in window) window.speechSynthesis.cancel();
            if (speechIntervalRef.current) clearInterval(speechIntervalRef.current);
            if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
                audioCtxRef.current.close().catch(() => {});
            }
        };
    }, [stopAlarm]);

    // 3. Safely trigger voice alerts
    const playVoiceMessage = useCallback(() => {
        if (!('speechSynthesis' in window)) return;

        try {
            // Some browsers pause speech synthesis in background tabs unless explicitly resumed
            window.speechSynthesis.resume(); 
            // Stop any currently playing speech to prevent overlap
            window.speechSynthesis.cancel();

            const utterance = new SpeechSynthesisUtterance("Warning! Drowsiness detected. Please stay alert.");
            utterance.rate = 1.1; // Slightly faster to establish urgency
            utterance.pitch = 1.0;
            window.speechSynthesis.speak(utterance);
        } catch (e) {
            console.warn("Speech synthesis failed", e);
        }
    }, []);

    // 4. Centralized State Machine Transition
    const transitionState = useCallback((newState) => {
        if (stateRef.current === newState) return;

        // Update internal state and emit UI events
        stateRef.current = newState;
        
        // Use the ref-managed callback so this hook's identity never changes
        if (onAlertChangeRef.current) {
             onAlertChangeRef.current({ type: 'DROWSINESS_ALERT', severity: newState });
        }

        if (newState === ALERT_STATES.IDLE) {
            stopAlarm();
            if ('speechSynthesis' in window) window.speechSynthesis.cancel();
            if (speechIntervalRef.current) {
                clearInterval(speechIntervalRef.current);
                speechIntervalRef.current = null;
            }
        }
        else if (newState === ALERT_STATES.WARNING) {
            startAlarm();
            playVoiceMessage();
        }
        else if (newState === ALERT_STATES.CRITICAL) {
            startAlarm(); // Ensure alarm is looping
            
            playVoiceMessage();
            if (speechIntervalRef.current) clearInterval(speechIntervalRef.current);
            speechIntervalRef.current = setInterval(() => {
                playVoiceMessage();
            }, speechIntervalMs);
        }
    }, [playVoiceMessage, startAlarm, stopAlarm, speechIntervalMs]);

    // 5. Per-Frame Evaluator (Fast, uncoupled from React state)
    const processFrame = useCallback((ear, perclos) => {
        const isDrowsy = ear < earThreshold || perclos > perclosThreshold;

        if (isDrowsy) {
            awakeFramesCount.current = 0; // Reset recovery debounce
            drowsyFramesCount.current += 1;

            if (drowsyFramesCount.current >= criticalFramesThreshold) {
                transitionState(ALERT_STATES.CRITICAL);
            } else if (drowsyFramesCount.current >= warningFramesThreshold) {
                transitionState(ALERT_STATES.WARNING); // Warns after threshold
            }
        } else {
            if (stateRef.current !== ALERT_STATES.IDLE) {
                awakeFramesCount.current += 1;

                // Debounce: Driver must be awake for N frames before resetting to IDLE
                if (awakeFramesCount.current >= recoveryFramesThreshold) {
                    drowsyFramesCount.current = 0;
                    transitionState(ALERT_STATES.IDLE);
                }
            } else {
                drowsyFramesCount.current = 0; // Reset count for normal blinks
            }
        }
    }, [earThreshold, perclosThreshold, warningFramesThreshold, criticalFramesThreshold, recoveryFramesThreshold, transitionState]);

    // 6. Autoplay Policy Workaround
    // Call this function when the user clicks "Start Monitoring"
    const enableAudioSystem = useCallback(() => {
        initAudioCtx(); // Establish trusted click intent for the AudioContext
        
        if ('speechSynthesis' in window) {
            try {
                const dummy = new SpeechSynthesisUtterance("");
                dummy.volume = 0;
                window.speechSynthesis.speak(dummy);
            } catch (e) {}
        }
    }, [initAudioCtx]);

    // Optional manual stop
    const stopAudioSystem = useCallback(() => {
         transitionState(ALERT_STATES.IDLE);
    }, [transitionState]);

    return { processFrame, enableAudioSystem, stopAudioSystem, alertState: stateRef.current };
}
