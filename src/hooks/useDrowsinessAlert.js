import { useEffect, useRef, useCallback } from 'react';

const ALERT_STATES = {
    IDLE: 'IDLE',
    WARNING: 'WARNING',
    CRITICAL: 'CRITICAL',
};

// A simple loud beep data URI so that the audio works without an external file.
const FALLBACK_ALARM_URI = 'data:audio/wav;base64,UklGRqAOAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YYQOAAAA//8AAAAA//8AAAAA//8AAAAA//8AAAAA//8AAAAA//8AAAAA//8AAAAA//8AAAAA//8AAAAA//8AAAAA//8AAAAA//8AAAAA//8AAAAA//8AAAAA//8AAAAA//8AAAAA//8AAAAA//8AAAAA//8AAAAA//8AAAAA//8AAAAA//8AAAAA//8AAAAA'; 
// NOTE: For production, replace the audio source with an actual .mp3 URL.

export function useDrowsinessAlert({
    earThreshold = 0.25,
    perclosThreshold = 0.15,
    criticalFramesThreshold = 10,  // Frames (at ~10fps, this is 1s)
    recoveryFramesThreshold = 8,   // Frames to recover to IDLE 
    speechIntervalMs = 5000,
    onAlertChange = () => { },
}) {
    const stateRef = useRef(ALERT_STATES.IDLE);
    const drowsyFramesCount = useRef(0);
    const awakeFramesCount = useRef(0);

    const audioRef = useRef(null);
    const speechIntervalRef = useRef(null);

    // 1. Initialize Audio efficiently on mount
    useEffect(() => {
        // You can change '/alarm.mp3' to any file in your public directory.
        // Using a short 1-sec loop of a generic system beep as default
        audioRef.current = new Audio(FALLBACK_ALARM_URI); 
        audioRef.current.loop = true;

        // If you don't have '/alarm.mp3', comment above and use a generic web audio API oscillator or base64 file.
        // Fallback catch handles missing file.

        return () => {
            // Proper cleanup on unmount
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
            }
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
            }
            if (speechIntervalRef.current) clearInterval(speechIntervalRef.current);
        };
    }, []);

    // 2. Safely trigger voice alerts
    const playVoiceMessage = useCallback(() => {
        if (!('speechSynthesis' in window)) return;

        // Stop any currently playing speech to prevent overlap
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance("Warning! Drowsiness detected. Please stay alert.");
        utterance.rate = 1.1; // Slightly faster to establish urgency
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
    }, []);

    // 3. Centralized State Machine Transition
    const transitionState = useCallback((newState) => {
        if (stateRef.current === newState) return;

        // Update internal state and emit UI events
        stateRef.current = newState;
        onAlertChange({ type: 'DROWSINESS_ALERT', severity: newState });

        if (newState === ALERT_STATES.IDLE) {
            // Turn off Alarm & Speech
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
            }
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
            }

            if (speechIntervalRef.current) {
                clearInterval(speechIntervalRef.current);
                speechIntervalRef.current = null;
            }
        }
        else if (newState === ALERT_STATES.WARNING) {
            // Start looping alarm immediately and speak once
            if (audioRef.current) {
                audioRef.current.play().catch(e => console.warn("Autoplay blocked", e));
            }
            playVoiceMessage();
        }
        else if (newState === ALERT_STATES.CRITICAL) {
            // Ensure alarm is playing
            if (audioRef.current) {
                audioRef.current.play().catch(e => console.warn("Autoplay blocked", e));
            }

            // Speak immediately, then set interval for sustained drowsiness
            playVoiceMessage();
            if (speechIntervalRef.current) clearInterval(speechIntervalRef.current);
            speechIntervalRef.current = setInterval(() => {
                playVoiceMessage();
            }, speechIntervalMs);
        }
    }, [onAlertChange, playVoiceMessage, speechIntervalMs]);

    // 4. Per-Frame Evaluator (Fast, uncoupled from React state)
    const processFrame = useCallback((ear, perclos) => {
        const isDrowsy = ear < earThreshold || perclos > perclosThreshold;

        if (isDrowsy) {
            awakeFramesCount.current = 0; // Reset recovery debounce
            drowsyFramesCount.current += 1;

            if (drowsyFramesCount.current >= criticalFramesThreshold) {
                transitionState(ALERT_STATES.CRITICAL);
            } else if (stateRef.current === ALERT_STATES.IDLE) {
                transitionState(ALERT_STATES.WARNING); // Instantly warns
            }
        } else {
            if (stateRef.current !== ALERT_STATES.IDLE) {
                awakeFramesCount.current += 1;

                // Debounce: Driver must be awake for N frames before resetting to IDLE
                if (awakeFramesCount.current >= recoveryFramesThreshold) {
                    drowsyFramesCount.current = 0;
                    transitionState(ALERT_STATES.IDLE);
                }
            }
        }
    }, [earThreshold, perclosThreshold, criticalFramesThreshold, recoveryFramesThreshold, transitionState]);

    // 5. Autoplay Policy Workaround
    // Call this function when the user clicks "Start Monitoring"
    const enableAudioSystem = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.play().then(() => {
                audioRef.current.pause();
            }).catch(e => console.warn("Audio unlock failed, check file path or user interactions", e));
        }

        if ('speechSynthesis' in window) {
            const dummy = new SpeechSynthesisUtterance("");
            dummy.volume = 0;
            window.speechSynthesis.speak(dummy);
        }
    }, []);

    // Optional manual stop
    const stopAudioSystem = useCallback(() => {
         transitionState(ALERT_STATES.IDLE);
    }, [transitionState]);


    return { processFrame, enableAudioSystem, stopAudioSystem, alertState: stateRef.current };
}
