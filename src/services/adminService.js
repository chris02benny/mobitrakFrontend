const API_BASE_URL = 'http://localhost:5001/api/admin';

/**
 * Helper to handle API responses
 */
const handleResponse = async (response) => {
    const data = await response.json();
    if (!response.ok) {
        const error = new Error(data.message || 'Something went wrong');
        error.status = response.status;
        throw error;
    }
    return data;
};

/**
 * Get auth headers
 */
const getAuthHeaders = () => {
    const token = localStorage.getItem('authToken');
    return {
        'Content-Type': 'application/json',
        'x-auth-token': token
    };
};

export const adminService = {
    /**
     * Get dashboard statistics
     */
    getStats: async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/stats`, {
                method: 'GET',
                headers: getAuthHeaders()
            });
            return handleResponse(response);
        } catch (error) {
            throw error;
        }
    },

    /**
     * Get all users with optional filters
     * @param {Object} params - { role, page, limit, search }
     */
    getUsers: async (params = {}) => {
        try {
            const queryString = new URLSearchParams(params).toString();
            const response = await fetch(`${API_BASE_URL}/users?${queryString}`, {
                method: 'GET',
                headers: getAuthHeaders()
            });
            return handleResponse(response);
        } catch (error) {
            throw error;
        }
    },

    /**
     * Get all businesses with optional filters
     * @param {Object} params - { page, limit, search, verificationStatus }
     */
    getBusinesses: async (params = {}) => {
        try {
            const queryString = new URLSearchParams(params).toString();
            const response = await fetch(`${API_BASE_URL}/businesses?${queryString}`, {
                method: 'GET',
                headers: getAuthHeaders()
            });
            return handleResponse(response);
        } catch (error) {
            throw error;
        }
    },

    /**
     * Get all drivers with optional filters
     * @param {Object} params - { page, limit, search, profileComplete }
     */
    getDrivers: async (params = {}) => {
        try {
            const queryString = new URLSearchParams(params).toString();
            const response = await fetch(`${API_BASE_URL}/drivers?${queryString}`, {
                method: 'GET',
                headers: getAuthHeaders()
            });
            return handleResponse(response);
        } catch (error) {
            throw error;
        }
    },

    /**
     * Get single user details
     * @param {string} userId - User ID
     */
    getUser: async (userId) => {
        try {
            const response = await fetch(`${API_BASE_URL}/user/${userId}`, {
                method: 'GET',
                headers: getAuthHeaders()
            });
            return handleResponse(response);
        } catch (error) {
            throw error;
        }
    },

    /**
     * Get pending verification requests
     * @param {Object} params - { page, limit }
     */
    getVerificationRequests: async (params = {}) => {
        try {
            const queryString = new URLSearchParams(params).toString();
            const response = await fetch(`${API_BASE_URL}/verification-requests?${queryString}`, {
                method: 'GET',
                headers: getAuthHeaders()
            });
            return handleResponse(response);
        } catch (error) {
            throw error;
        }
    },

    /**
     * Approve or reject business verification
     * @param {string} userId - Business user ID
     * @param {string} action - 'approve' or 'reject'
     * @param {string} notes - Optional notes
     */
    verifyBusiness: async (userId, action, notes = '') => {
        try {
            const response = await fetch(`${API_BASE_URL}/verify-business/${userId}`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify({ action, notes })
            });
            return handleResponse(response);
        } catch (error) {
            throw error;
        }
    },

    /**
     * Get vehicles for a specific business
     * @param {string} businessId - Business user ID
     */
    getBusinessVehicles: async (businessId) => {
        try {
            const response = await fetch(`http://localhost:5002/api/vehicles/admin/business/${businessId}`, {
                method: 'GET',
                headers: getAuthHeaders()
            });
            return handleResponse(response);
        } catch (error) {
            throw error;
        }
    }
};

export default adminService;
