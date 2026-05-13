/**
 * incidentService.js
 * Frontend API service for the incident management system.
 *
 * Provides methods for:
 *   - Fetching incidents for the fleet manager's business
 *   - Lifecycle actions: acknowledge, resolve, escalate
 *   - Incident statistics
 */

import { apiConfig } from '../config/apiConfig.js';

const API_BASE_URL = apiConfig.baseUrl;

/**
 * Helper: get auth headers
 */
const getAuthHeaders = () => {
    const token = localStorage.getItem('authToken');
    return {
        'Content-Type': 'application/json',
        'x-auth-token': token,
    };
};

/**
 * Helper: handle response
 */
const handleResponse = async (response) => {
    const data = await response.json();
    if (!response.ok) {
        const error = new Error(data.error || data.message || 'Request failed');
        error.status = response.status;
        error.data = data;
        throw error;
    }
    return data;
};

/**
 * Helper: get current user's business ID
 */
const getBusinessId = () => {
    try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        return user?.id || user?._id;
    } catch {
        return null;
    }
};

export const incidentService = {
    /**
     * Fetch incidents for the current fleet manager
     * @param {Object} params - { status, severity, limit, skip }
     */
    getIncidents: async (params = {}) => {
        const businessId = getBusinessId();
        if (!businessId) throw new Error('No businessId found');

        const queryParams = new URLSearchParams({ businessId, ...params });
        const response = await fetch(
            `${API_BASE_URL}/api/incidents?${queryParams}`,
            { method: 'GET', headers: getAuthHeaders() }
        );
        return handleResponse(response);
    },

    /**
     * Fetch a single incident by ID
     */
    getIncidentById: async (incidentId) => {
        const response = await fetch(
            `${API_BASE_URL}/api/incidents/${incidentId}`,
            { method: 'GET', headers: getAuthHeaders() }
        );
        return handleResponse(response);
    },

    /**
     * Get incident statistics
     */
    getIncidentStats: async () => {
        const businessId = getBusinessId();
        if (!businessId) throw new Error('No businessId found');

        const response = await fetch(
            `${API_BASE_URL}/api/incidents/stats?businessId=${businessId}`,
            { method: 'GET', headers: getAuthHeaders() }
        );
        return handleResponse(response);
    },

    /**
     * Acknowledge an incident
     */
    acknowledgeIncident: async (incidentId, note = '') => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const response = await fetch(
            `${API_BASE_URL}/api/incidents/${incidentId}/acknowledge`,
            {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    actor: user?.id || user?._id || 'fleet_manager',
                    note,
                }),
            }
        );
        return handleResponse(response);
    },

    /**
     * Resolve an incident
     */
    resolveIncident: async (incidentId, note = '') => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const response = await fetch(
            `${API_BASE_URL}/api/incidents/${incidentId}/resolve`,
            {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    actor: user?.id || user?._id || 'fleet_manager',
                    note,
                }),
            }
        );
        return handleResponse(response);
    },

    /**
     * Escalate an incident
     */
    escalateIncident: async (incidentId, note = '') => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const response = await fetch(
            `${API_BASE_URL}/api/incidents/${incidentId}/escalate`,
            {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    actor: user?.id || user?._id || 'fleet_manager',
                    note,
                }),
            }
        );
        return handleResponse(response);
    },
};

export default incidentService;
