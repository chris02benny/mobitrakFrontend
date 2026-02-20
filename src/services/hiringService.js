import api from './api';

/**
 * hiringService.js
 * Driver job requests, hiring, and employment management API calls.
 * Uses the centralized `api` client — base URL comes from VITE_API_URL.
 * JWT is attached automatically by the api.js request interceptor.
 */

export const hiringService = {
    /**
     * Get available drivers (unemployed with complete profiles)
     */
    getAvailableDrivers: async (params = {}) => {
        // If called with (page, limit) signature (legacy), convert to params object
        if (typeof params === 'number') {
            const page = params;
            const limit = arguments[1] ?? 20;
            const response = await api.get('/api/drivers/job-requests/available-drivers', {
                params: { page, limit },
            });
            return response.data;
        }
        const queryString = new URLSearchParams(params).toString();
        const url = `/api/drivers/employments/available${queryString ? `?${queryString}` : ''}`;
        const response = await api.get(url);
        return response.data;
    },

    /**
     * Send hire request to driver
     */
    sendHireRequest: async (hireData) => {
        const response = await api.post('/api/drivers/job-requests', hireData);
        return response.data;
    },

    /**
     * Get received job requests (for driver)
     */
    getReceivedRequests: async (status = '', page = 1, limit = 20) => {
        const params = { page, limit };
        if (status) params.status = status;
        const response = await api.get('/api/drivers/job-requests/received', { params });
        return response.data;
    },

    /**
     * Get sent job requests (for company)
     */
    getSentRequests: async (status = '', page = 1, limit = 20) => {
        const params = { page, limit };
        if (status) params.status = status;
        const response = await api.get('/api/drivers/job-requests/sent', { params });
        return response.data;
    },

    /**
     * Get job request by ID
     */
    getRequestById: async (requestId) => {
        const response = await api.get(`/api/drivers/job-requests/${requestId}`);
        return response.data;
    },

    /**
     * Respond to job request (accept/reject)
     */
    respondToRequest: async (requestId, action, message = '', rejection = null, dlConsentGiven = undefined) => {
        const body = { action, message };
        if (rejection) body.rejection = rejection;
        if (dlConsentGiven !== undefined) body.dlConsentGiven = dlConsentGiven;
        const response = await api.post(`/api/drivers/job-requests/${requestId}/respond`, body);
        return response.data;
    },

    /**
     * Get company employees (hired drivers)
     */
    getCompanyEmployees: async (status = 'ACTIVE', page = 1, limit = 20) => {
        const params = { page, limit };
        if (status) params.status = status;
        const response = await api.get('/api/drivers/employments/company', { params });
        return response.data;
    },

    /**
     * Get driver's current employment
     */
    getCurrentEmployment: async () => {
        const response = await api.get('/api/drivers/employments/current');
        return response.data;
    },

    /**
     * Get user details by ID
     */
    getUserById: async (userId) => {
        const response = await api.get(`/api/users/${userId}`);
        return response.data;
    },

    /**
     * Finalize hiring (company adds accepted driver to fleet)
     */
    finalizeHiring: async (requestId, hireData) => {
        const response = await api.post(`/api/drivers/job-requests/${requestId}/hire`, hireData);
        return response.data;
    },

    /**
     * Get driver profile by ID
     */
    getDriverProfile: async (profileId) => {
        const response = await api.get(`/api/drivers/profiles/${profileId}`);
        return response.data;
    },

    /**
     * Terminate employment
     */
    terminateEmployment: async (employmentId, terminateData) => {
        const response = await api.post(`/api/drivers/employments/${employmentId}/terminate`, terminateData);
        return response.data;
    },

    /**
     * Get all employments (hired drivers) for fleet manager
     * @param {Object} params - e.g. { assignmentStatus: 'UNASSIGNED' }
     */
    getEmployments: async (params = {}) => {
        const response = await api.get('/api/employment', { params });
        return response.data;
    },
};
