/**
 * src/services/api.js
 *
 * Centralized Axios client for all MobiTrak API calls.
 *
 * Base URL is read from VITE_API_URL environment variable:
 *   - Local dev:   http://localhost:3000  (serverless-offline)
 *     OR           https://g5ly7nfs0m.execute-api.ap-south-1.amazonaws.com (live AWS)
 *   - Production:  https://g5ly7nfs0m.execute-api.ap-south-1.amazonaws.com
 *
 * Set via .env (local) or Vercel Environment Variables (production).
 *
 * DO NOT hardcode the backend URL in any service file — always import this client.
 */

import axios from 'axios';

// Fallback to the live AWS API Gateway URL if VITE_API_URL is not set.
// This prevents silent 404s when the env var is missing from Vercel.
const BASE_URL =
    import.meta.env.VITE_API_URL ||
    'https://g5ly7nfs0m.execute-api.ap-south-1.amazonaws.com';

const api = axios.create({
    baseURL: BASE_URL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

// ── Request Interceptor ──────────────────────────────────────────────────────
// Automatically attaches the JWT from localStorage to every outgoing request.
// This keeps individual service files free of token-retrieval boilerplate.
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('authToken');
        if (token) {
            config.headers['x-auth-token'] = token;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// ── Response Interceptor ─────────────────────────────────────────────────────
// Handles 401 Unauthorized globally: clears auth state and redirects to login.
// Individual service files do NOT need to duplicate this logic.
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Token is expired or invalid — clear auth state and redirect
            localStorage.removeItem('authToken');
            localStorage.removeItem('userRole');
            localStorage.removeItem('userHasPassword');
            // Only redirect if not already on login/auth pages to avoid loops
            if (!window.location.pathname.startsWith('/login') &&
                !window.location.pathname.startsWith('/register') &&
                !window.location.pathname.startsWith('/forgot-password')) {
                window.location.href = '/login';
            }
        }
        // Centralized error logging (non-intrusive)
        if (process.env.NODE_ENV !== 'production') {
            console.error(
                `[API Error] ${error.config?.method?.toUpperCase()} ${error.config?.url}`,
                error.response?.status,
                error.response?.data
            );
        }
        return Promise.reject(error);
    }
);

export default api;
