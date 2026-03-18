/**
 * drowsinessUtils.js
 * Pure utility functions for real-time drowsiness detection.
 * Uses Eye Aspect Ratio (EAR) and PERCLOS metric.
 * No external dependencies — runs entirely in the browser.
 */

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

/** EAR below this value = eye is considered "closed" */
export const EAR_THRESHOLD = 0.22;

/**
 * PERCLOS threshold: if the proportion of closed-eye frames
 * in the sliding window exceeds this, driver is DROWSY.
 */
export const PERCLOS_THRESHOLD = 0.4;

/**
 * Number of frames kept in the sliding window.
 * At 10 fps, 150 frames ≈ 15 seconds.
 */
export const WINDOW_SIZE = 150;

// ─────────────────────────────────────────────
// MediaPipe FaceMesh Landmark Indices
// ─────────────────────────────────────────────

/**
 * MediaPipe FaceMesh landmark indices for the LEFT eye.
 * Order: [p1, p2, p3, p4, p5, p6] where p1/p4 are horizontal
 * endpoints and p2/p3/p5/p6 are vertical.
 *
 * Using the standard 6-point EAR subset from:
 *   Soukupová & Čech (2016) — Real-Time Eye Blink Detection using Facial Landmarks
 */
export const LEFT_EYE_INDICES = [263, 385, 387, 362, 380, 373];

/**
 * MediaPipe FaceMesh landmark indices for the RIGHT eye.
 */
export const RIGHT_EYE_INDICES = [33, 160, 158, 133, 153, 144];

// ─────────────────────────────────────────────
// Euclidean Distance Helper
// ─────────────────────────────────────────────

/**
 * Computes the Euclidean distance between two 2D/3D landmark points.
 * @param {Object} p1 - { x, y, z? }
 * @param {Object} p2 - { x, y, z? }
 * @returns {number} distance
 */
export function euclideanDist(p1, p2) {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy);
}

// ─────────────────────────────────────────────
// Eye Aspect Ratio (EAR)
// ─────────────────────────────────────────────

/**
 * Computes the Eye Aspect Ratio (EAR) from 6 landmark points.
 *
 * EAR = (‖p2−p6‖ + ‖p3−p5‖) / (2 · ‖p1−p4‖)
 *
 * @param {Array<Object>} landmarks - Full array of FaceMesh landmarks
 * @param {Array<number>} indices   - 6-element array [p1, p2, p3, p4, p5, p6]
 * @returns {number} EAR value (0 = fully closed, ~0.3 = open)
 */
export function computeEAR(landmarks, indices) {
    const [i1, i2, i3, i4, i5, i6] = indices;
    const p1 = landmarks[i1];
    const p2 = landmarks[i2];
    const p3 = landmarks[i3];
    const p4 = landmarks[i4];
    const p5 = landmarks[i5];
    const p6 = landmarks[i6];

    const vertA = euclideanDist(p2, p6); // vertical pair 1
    const vertB = euclideanDist(p3, p5); // vertical pair 2
    const horiz = euclideanDist(p1, p4); // horizontal width

    if (horiz === 0) return 0;
    return (vertA + vertB) / (2.0 * horiz);
}

/**
 * Computes the average EAR for both eyes.
 * @param {Array<Object>} landmarks - Full FaceMesh landmark array
 * @returns {number} Mean EAR across left and right eyes
 */
export function computeMeanEAR(landmarks) {
    const leftEAR = computeEAR(landmarks, LEFT_EYE_INDICES);
    const rightEAR = computeEAR(landmarks, RIGHT_EYE_INDICES);
    return (leftEAR + rightEAR) / 2.0;
}

// ─────────────────────────────────────────────
// PERCLOS (PERcentage of eye CLOSure)
// ─────────────────────────────────────────────

/**
 * Computes PERCLOS over a sliding window of EAR values.
 * PERCLOS = (number of frames where EAR < threshold) / totalFrames
 *
 * @param {number[]} earHistory  - Array of recent EAR values (newest last)
 * @param {number}   threshold   - EAR threshold for "eye closed" (default: EAR_THRESHOLD)
 * @returns {number} PERCLOS value between 0 and 1
 */
export function computePERCLOS(earHistory, threshold = EAR_THRESHOLD) {
    if (!earHistory || earHistory.length === 0) return 0;

    const closedFrames = earHistory.filter(ear => ear < threshold).length;
    return closedFrames / earHistory.length;
}

// ─────────────────────────────────────────────
// Drowsiness Decision
// ─────────────────────────────────────────────

/**
 * Determines driver drowsiness status from PERCLOS.
 * @param {number} perclos - Current PERCLOS value (0–1)
 * @returns {"DROWSY"|"ALERT"} status string
 */
export function getDrowsinessStatus(perclos) {
    return perclos > PERCLOS_THRESHOLD ? 'DROWSY' : 'ALERT';
}

// ─────────────────────────────────────────────
// Circular Buffer Utility
// ─────────────────────────────────────────────

/**
 * Adds a new value to an EAR history array, keeping it within WINDOW_SIZE.
 * Returns a new array (immutable-style).
 * @param {number[]} history  - Existing history array
 * @param {number}   newValue - New EAR value to append
 * @param {number}   maxSize  - Maximum window size (default: WINDOW_SIZE)
 * @returns {number[]} Updated history array
 */
export function pushEARHistory(history, newValue, maxSize = WINDOW_SIZE) {
    const updated = [...history, newValue];
    if (updated.length > maxSize) {
        return updated.slice(updated.length - maxSize);
    }
    return updated;
}
