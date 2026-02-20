import api from './api';

/**
 * authService.js
 * All user authentication API calls.
 * Uses the centralized `api` client — base URL comes from VITE_API_URL.
 * JWT is attached automatically by the api.js request interceptor.
 */

export const authService = {
    /**
     * Register a new fleet manager
     * @param {Object} userData - { companyName, email, password }
     */
    registerFleetManager: async (userData) => {
        const response = await api.post('/api/users/register/fleetmanager', userData);
        return response.data;
    },

    /**
     * Register a new driver
     * @param {Object} userData - { firstName, lastName, driverLicenseId, email, password }
     */
    registerDriver: async (userData) => {
        const response = await api.post('/api/users/register/driver', userData);
        return response.data;
    },

    login: async (credentials) => {
        const response = await api.post('/api/users/login', credentials);
        const data = response.data;
        if (data.token) {
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('userRole', data.role);
            localStorage.setItem('userHasPassword', data.user?.hasPassword ? 'true' : 'false');
        }
        return data;
    },

    verifyOtp: async (email, otp) => {
        const response = await api.post('/api/users/verify-otp', { email, otp });
        const data = response.data;
        if (data.token) {
            localStorage.setItem('authToken', data.token);
            if (data.user?.role) {
                localStorage.setItem('userRole', data.user.role);
            }
            localStorage.setItem('userHasPassword', data.user?.hasPassword ? 'true' : 'false');
        }
        return data;
    },

    updatePassword: async (password) => {
        const response = await api.post('/api/users/update-password', { password });
        return response.data;
    },

    completeProfile: async (data) => {
        const response = await api.post('/api/users/complete-profile', data);
        return response.data;
    },

    getProfile: async () => {
        const response = await api.get('/api/users/me');
        return response.data;
    },

    /**
     * Upload profile image
     * @param {File} imageFile
     */
    uploadProfileImage: async (imageFile) => {
        const formData = new FormData();
        formData.append('profileImage', imageFile);
        const response = await api.post('/api/users/profile/image', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    },

    /**
     * Upload driving license images
     * @param {File} dlFront
     * @param {File} dlBack
     */
    uploadDL: async (dlFront, dlBack) => {
        const formData = new FormData();
        formData.append('dlFront', dlFront);
        formData.append('dlBack', dlBack);
        const response = await api.post('/api/users/upload-dl', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    },

    /**
     * Verify and save DL details after user confirmation
     * @param {Object} dlDetails
     */
    verifyDL: async (dlDetails) => {
        const response = await api.post('/api/users/verify-dl', { dlDetails });
        return response.data;
    },

    /**
     * Upload RC book image
     * @param {File} rcBook
     */
    uploadRC: async (rcBook) => {
        const formData = new FormData();
        formData.append('rcBook', rcBook);
        const response = await api.post('/api/users/upload-rc', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    },

    /**
     * Request business verification (Fleet Manager only)
     */
    requestVerification: async () => {
        const response = await api.post('/api/users/request-verification');
        return response.data;
    },

    /**
     * Get verification status (Fleet Manager only)
     */
    getVerificationStatus: async () => {
        const response = await api.get('/api/users/verification-status');
        return response.data;
    },

    /**
     * Logout user by clearing authentication data
     */
    logout: () => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userHasPassword');
    },

    /**
     * Send OTP for password reset
     * @param {string} email
     */
    forgotPassword: async (email) => {
        const response = await api.post('/api/users/forgot-password', { email });
        return response.data;
    },

    /**
     * Verify OTP for password reset
     * @param {string} email
     * @param {string} otp
     */
    verifyResetOtp: async (email, otp) => {
        const response = await api.post('/api/users/verify-reset-otp', { email, otp });
        return response.data;
    },

    /**
     * Reset password after OTP verification
     * @param {string} email
     * @param {string} otp
     * @param {string} newPassword
     */
    resetPassword: async (email, otp, newPassword) => {
        const response = await api.post('/api/users/reset-password', { email, otp, newPassword });
        return response.data;
    },
};
