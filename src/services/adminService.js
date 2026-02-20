import api from './api';

/**
 * adminService.js
 * All admin dashboard API calls.
 * Uses the centralized `api` client — base URL comes from VITE_API_URL.
 * JWT is attached automatically by the api.js request interceptor.
 */

export const adminService = {
    /**
     * Get dashboard statistics
     */
    getStats: async () => {
        const response = await api.get('/api/admin/stats');
        return response.data;
    },

    /**
     * Get all users with optional filters
     * @param {Object} params - { role, page, limit, search }
     */
    getUsers: async (params = {}) => {
        const response = await api.get('/api/admin/users', { params });
        return response.data;
    },

    /**
     * Get all businesses with optional filters
     * @param {Object} params - { page, limit, search, verificationStatus }
     */
    getBusinesses: async (params = {}) => {
        const response = await api.get('/api/admin/businesses', { params });
        return response.data;
    },

    /**
     * Get all drivers with optional filters
     * @param {Object} params - { page, limit, search, profileComplete }
     */
    getDrivers: async (params = {}) => {
        const response = await api.get('/api/admin/drivers', { params });
        return response.data;
    },

    /**
     * Get single user details
     * @param {string} userId
     */
    getUser: async (userId) => {
        const response = await api.get(`/api/admin/user/${userId}`);
        return response.data;
    },

    /**
     * Get pending verification requests
     * @param {Object} params - { page, limit }
     */
    getVerificationRequests: async (params = {}) => {
        const response = await api.get('/api/admin/verification-requests', { params });
        return response.data;
    },

    /**
     * Approve or reject business verification
     * @param {string} userId
     * @param {string} action - 'approve' or 'reject'
     * @param {string} notes
     */
    verifyBusiness: async (userId, action, notes = '') => {
        const response = await api.put(`/api/admin/verify-business/${userId}`, { action, notes });
        return response.data;
    },

    /**
     * Get vehicles for a specific business
     * @param {string} businessId
     */
    getBusinessVehicles: async (businessId) => {
        const response = await api.get(`/api/vehicles/admin/business/${businessId}`);
        return response.data;
    },
};

export default adminService;
