import { useEffect, useRef, useCallback } from 'react';

const ALERT_STATES = {
    IDLE: 'IDLE',
    EAR_WARNING: 'EAR_WARNING',
    PERCLOS_WARNING: 'PERCLOS_WARNING',
    BOTH_WARNING: 'BOTH_WARNING',
};

export function useDrowsinessAlert({
    earThreshold = 0.25,
    perclosThreshold = 0.15,
    earFramesWarningThreshold = 30, // 30 frames = 3 seconds at ~10 fps
    earFramesRecoveryThreshold = 8, // Frames to recover to IDLE audio
    speechIntervalMs = 5000,
    onAlertChange = () => { },
}) {
    const stateRef = useRef(ALERT_STATES.IDLE);
    
    // For EAR (beeping)
    const earDrowsyFramesCount = useRef(0);
    const earAwakeFramesCount = useRef(0);
    const isBeepingRef = useRef(false);

    // For PERCLOS (voice)
    const isVoiceActiveRef = useRef(false);

    const audioCtxRef = useRef(null);
    const beepIntervalRef = useRef(null);
    const speechIntervalRef = useRef(null);
    
    const onAlertChangeRef = useRef(onAlertChange);
    useEffect(() => {
        onAlertChangeRef.current = onAlertChange;
    }, [onAlertChange]);

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

    const playSyntheticBeep = useCallback(() => {
        if (!audioCtxRef.current) return;
        try {
            const osc = audioCtxRef.current.createOscillator();
            const gainNode = audioCtxRef.current.createGain();
            osc.connect(gainNode);
            gainNode.connect(audioCtxRef.current.destination);
            osc.type = 'square'; // Harsh warning sound
            osc.frequency.setValueAtTime(880, audioCtxRef.current.currentTime); // A5
            gainNode.gain.setValueAtTime(0, audioCtxRef.current.currentTime);
            gainNode.gain.linearRampToValueAtTime(1, audioCtxRef.current.currentTime + 0.05);
            gainNode.gain.linearRampToValueAtTime(0, audioCtxRef.current.currentTime + 0.4);
            osc.start(audioCtxRef.current.currentTime);
            osc.stop(audioCtxRef.current.currentTime + 0.5);
        } catch (e) {
            console.warn("Failed to play synthetic alarm beep", e);
        }
    }, []);

    const startBeepAlarm = useCallback(() => {
        initAudioCtx();
        if (beepIntervalRef.current) return;
        playSyntheticBeep(); 
        beepIntervalRef.current = setInterval(playSyntheticBeep, 600);
    }, [initAudioCtx, playSyntheticBeep]);

    const stopBeepAlarm = useCallback(() => {
        if (beepIntervalRef.current) {
            clearInterval(beepIntervalRef.current);
            beepIntervalRef.current = null;
        }
    }, []);

    const playVoiceMessage = useCallback(() => {
        if (!('speechSynthesis' in window)) return;
        try {
            window.speechSynthesis.resume(); 
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance("Warning! Drowsiness detected. Please stay alert.");
            utterance.rate = 1.1;
            utterance.pitch = 1.0;
            window.speechSynthesis.speak(utterance);
        } catch (e) {
            console.warn("Speech synthesis failed", e);
        }
    }, []);

    const startVoiceAlarm = useCallback(() => {
        if (speechIntervalRef.current) return;
        playVoiceMessage();
        speechIntervalRef.current = setInterval(() => {
            playVoiceMessage();
        }, speechIntervalMs);
    }, [playVoiceMessage, speechIntervalMs]);

    const stopVoiceAlarm = useCallback(() => {
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
        if (speechIntervalRef.current) {
            clearInterval(speechIntervalRef.current);
            speechIntervalRef.current = null;
        }
    }, []);

    useEffect(() => {
        return () => {
            stopBeepAlarm();
            stopVoiceAlarm();
            if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
                audioCtxRef.current.close().catch(() => {});
            }
        };
    }, [stopBeepAlarm, stopVoiceAlarm]);

    const processFrame = useCallback((ear, perclos) => {
        // --- 1. Process EAR (Beep logic) ---
        if (ear < earThreshold) {
            earAwakeFramesCount.current = 0;
            earDrowsyFramesCount.current += 1;
            
            if (earDrowsyFramesCount.current >= earFramesWarningThreshold && !isBeepingRef.current) {
                isBeepingRef.current = true;
                startBeepAlarm();
            }
        } else {
            if (isBeepingRef.current) {
                earAwakeFramesCount.current += 1;
                // Debounce recovery
                if (earAwakeFramesCount.current >= earFramesRecoveryThreshold) {
                    earDrowsyFramesCount.current = 0;
                    isBeepingRef.current = false;
                    stopBeepAlarm();
                }
            } else {
                earDrowsyFramesCount.current = 0;
            }
        }

        // --- 2. Process PERCLOS (Voice logic) ---
        const isPerclosHigh = perclos > perclosThreshold;
        if (isPerclosHigh && !isVoiceActiveRef.current) {
            isVoiceActiveRef.current = true;
            startVoiceAlarm();
        } else if (!isPerclosHigh && isVoiceActiveRef.current) {
            isVoiceActiveRef.current = false;
            stopVoiceAlarm();
        }

        // Compute overall state 
        const beeping = isBeepingRef.current;
        const voicing = isVoiceActiveRef.current;
        let newState = ALERT_STATES.IDLE;
        if (beeping && voicing) newState = ALERT_STATES.BOTH_WARNING;
        else if (beeping) newState = ALERT_STATES.EAR_WARNING;
        else if (voicing) newState = ALERT_STATES.PERCLOS_WARNING;
        
        if (stateRef.current !== newState) {
            stateRef.current = newState;
            if (onAlertChangeRef.current) {
                onAlertChangeRef.current({ type: 'DROWSINESS_ALERT', severity: newState });
            }
        }
    }, [earThreshold, perclosThreshold, earFramesWarningThreshold, earFramesRecoveryThreshold, startBeepAlarm, stopBeepAlarm, startVoiceAlarm, stopVoiceAlarm]);

    const enableAudioSystem = useCallback(() => {
        initAudioCtx();
        if ('speechSynthesis' in window) {
            try {
                const dummy = new SpeechSynthesisUtterance("");
                dummy.volume = 0;
                window.speechSynthesis.speak(dummy);
            } catch (e) {}
        }
    }, [initAudioCtx]);

    const stopAudioSystem = useCallback(() => {
        isBeepingRef.current = false;
        isVoiceActiveRef.current = false;
        stopBeepAlarm();
        stopVoiceAlarm();
        stateRef.current = ALERT_STATES.IDLE;
    }, [stopBeepAlarm, stopVoiceAlarm]);

    return { processFrame, enableAudioSystem, stopAudioSystem, alertState: stateRef.current };
}
