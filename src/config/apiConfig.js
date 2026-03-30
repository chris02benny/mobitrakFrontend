/**
 * Centralized API endpoint configuration
 * Uses a single API Gateway base URL (VITE_API_URL) with service paths appended
 * Production builds will fail if required env vars are missing
 */

const isDevelopment = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;

/**
 * Get base API URL from environment variables with optional fallback
 * In production, missing required URL will throw an error
 */
function getBaseUrl() {
  const baseUrl = import.meta.env.VITE_API_URL;
  
  if (baseUrl) {
    return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  }

  // In production, fail fast if required env var is missing
  if (isProduction) {
    throw new Error(
      `PRODUCTION ERROR: Missing required environment variable VITE_API_URL. ` +
      `This must be set to your AWS API Gateway endpoint (e.g., https://xyz.execute-api.region.amazonaws.com)`
    );
  }

  // In development, use localhost fallback
  if (isDevelopment) {
    const localhost = 'http://localhost:5000';
    console.warn(
      `[API Config] Using fallback base URL: ${localhost} ` +
      `(set VITE_API_URL to override)`
    );
    return localhost;
  }

  throw new Error(
    `Missing environment variable VITE_API_URL and no fallback available`
  );
}

// Get base API URL once
const BASE_API_URL = getBaseUrl();

/**
 * Service endpoint paths
 * These are appended to BASE_API_URL
 */
const SERVICE_PATHS = {
  USER: '/api/users',
  TRIP: '/api/trips',
  VEHICLE: '/api/vehicles',
  TRACKING_DEVICE: '/api/tracking-device',
  DRIVER: '/api/drivers'
};

export const apiConfig = {
  /**
   * Base API URL (e.g., https://xyz.execute-api.region.amazonaws.com)
   */
  baseUrl: BASE_API_URL,

  /**
   * Get fully-qualified service endpoint URL
   * @param {string} servicePath - Service path (e.g., '/api/users', '/api/trips')
   * @param {string} endpoint - Optional specific endpoint (e.g., '/me', '/active/locations')
   * @returns {string} Full URL
   */
  getUrl: (servicePath, endpoint = '') => `${BASE_API_URL}${servicePath}${endpoint}`,

  /**
   * User Service endpoints
   * Used for: auth, profile, user lookups, password reset
   */
  getUserServiceUrl: (path = '') => `${BASE_API_URL}${SERVICE_PATHS.USER}${path}`,
  
  /**
   * Trip Service endpoints
   * Used for: trips listing, trip details, active trips
   */
  getTripServiceUrl: (path = '') => `${BASE_API_URL}${SERVICE_PATHS.TRIP}${path}`,
  
  /**
   * Vehicle Service endpoints
   * Used for: vehicle listings, vehicle details
   */
  getVehicleServiceUrl: (path = '') => `${BASE_API_URL}${SERVICE_PATHS.VEHICLE}${path}`,

  /**
   * Tracking Device endpoints
   * Used for: tracking device credential CRUD + decryption
   * Resolves to /api/tracking-device (NOT nested under /api/vehicles)
   */
  getTrackingDeviceUrl: (path = '') => `${BASE_API_URL}${SERVICE_PATHS.TRACKING_DEVICE}${path}`,
  
  /**
   * Hiring/Driver Service endpoints
   * Used for: driver lookups, employment records, company employees
   */
  getDriverServiceUrl: (path = '') => `${BASE_API_URL}${SERVICE_PATHS.DRIVER}${path}`,
};

/**
 * Validate configuration at app startup (optional explicit check)
 * Call this from App.jsx on mount to fail fast if config is invalid
 */
export function validateApiConfig() {
  if (isProduction) {
    try {
      // Verify base URL is accessible (basic validation)
      if (!BASE_API_URL || !BASE_API_URL.startsWith('http')) {
        throw new Error('Invalid VITE_API_URL format');
      }
      console.log('[API Config] Validated - base URL available:', BASE_API_URL);
    } catch (error) {
      console.error('[API Config] Validation failed:', error.message);
      throw error;
    }
  }
}

export default apiConfig;
