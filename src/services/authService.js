const API_BASE_URL = 'http://localhost:5001/api/users';

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

export const authService = {
    /**
     * Register a new fleet manager
     * @param {Object} userData - { companyName, email, password }
     */
    registerFleetManager: async (userData) => {
        try {
            const response = await fetch(`${API_BASE_URL}/register/fleetmanager`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData),
            });
            return handleResponse(response);
        } catch (error) {
            throw error;
        }
    },



    /**
     * Register a new driver
     * @param {Object} userData - { firstName, lastName, driverLicenseId, email, password }
     */
    registerDriver: async (userData) => {
        try {
            const response = await fetch(`${API_BASE_URL}/register/driver`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData),
            });
            return handleResponse(response);
        } catch (error) {
            throw error;
        }
    },


    login: async (credentials) => {
        try {
            const response = await fetch(`${API_BASE_URL}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(credentials),
            });
            const data = await handleResponse(response);
            // Store token and role for later use (simple localStorage implementation)
            if (data.token) {
                localStorage.setItem('authToken', data.token);
                localStorage.setItem('userRole', data.role);
                localStorage.setItem('userHasPassword', data.user?.hasPassword ? 'true' : 'false');
            }
            return data;
        } catch (error) {
            throw error;
        }
    },

    verifyOtp: async (email, otp) => {
        try {
            const response = await fetch(`${API_BASE_URL}/verify-otp`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, otp }),
            });
            const data = await handleResponse(response);
            if (data.token) {
                localStorage.setItem('authToken', data.token);
                if (data.user?.role) {
                    localStorage.setItem('userRole', data.user.role);
                }
                localStorage.setItem('userHasPassword', data.user?.hasPassword ? 'true' : 'false');
            }
            return data;
        } catch (error) {
            throw error;
        }
    },

    updatePassword: async (password) => {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`${API_BASE_URL}/update-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': token
                },
                body: JSON.stringify({ password }),
            });
            return handleResponse(response);
        } catch (error) {
            throw error;
        }
    },

    completeProfile: async (data) => {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`${API_BASE_URL}/complete-profile`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': token
                },
                body: JSON.stringify(data),
            });
            return handleResponse(response);
        } catch (error) {
            throw error;
        }
    },

    getProfile: async () => {
        try {
            const token = localStorage.getItem('authToken');
            if (!token) {
                throw new Error('No authentication token found. Please login.');
            }
            const response = await fetch(`${API_BASE_URL}/me`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': token
                },
            });
            return handleResponse(response);
        } catch (error) {
            throw error;
        }
    },

    /**
     * Upload profile image
     * @param {File} imageFile - Profile image file
     */
    uploadProfileImage: async (imageFile) => {
        try {
            const token = localStorage.getItem('authToken');
            if (!token) {
                throw new Error('No authentication token found. Please login.');
            }

            const formData = new FormData();
            formData.append('profileImage', imageFile);

            const response = await fetch(`${API_BASE_URL}/profile/image`, {
                method: 'POST',
                headers: {
                    'x-auth-token': token
                },
                body: formData,
            });
            return handleResponse(response);
        } catch (error) {
            throw error;
        }
    },

    /**
     * Upload driving license images
     * @param {File} dlFront - Front image of DL
     * @param {File} dlBack - Back image of DL
     */
    uploadDL: async (dlFront, dlBack) => {
        try {
            const token = localStorage.getItem('authToken');
            if (!token) {
                throw new Error('No authentication token found. Please login.');
            }

            const formData = new FormData();
            formData.append('dlFront', dlFront);
            formData.append('dlBack', dlBack);

            const response = await fetch(`${API_BASE_URL}/upload-dl`, {
                method: 'POST',
                headers: {
                    'x-auth-token': token
                },
                body: formData,
            });
            return handleResponse(response);
        } catch (error) {
            throw error;
        }
    },

    /**
     * Verify and save DL details after user confirmation
     * @param {Object} dlDetails - Verified DL details object
     */
    verifyDL: async (dlDetails) => {
        try {
            const token = localStorage.getItem('authToken');
            if (!token) {
                throw new Error('No authentication token found. Please login.');
            }

            const response = await fetch(`${API_BASE_URL}/verify-dl`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': token
                },
                body: JSON.stringify({ dlDetails }),
            });
            return handleResponse(response);
        } catch (error) {
            throw error;
        }
    },

    /**
     * Upload RC book image
     * @param {File} rcBook - RC Book image
     */
    uploadRC: async (rcBook) => {
        try {
            const token = localStorage.getItem('authToken');
            if (!token) {
                throw new Error('No authentication token found. Please login.');
            }

            const formData = new FormData();
            formData.append('rcBook', rcBook);

            const response = await fetch(`${API_BASE_URL}/upload-rc`, {
                method: 'POST',
                headers: {
                    'x-auth-token': token
                },
                body: formData,
            });
            return handleResponse(response);
        } catch (error) {
            throw error;
        }
    },

    /**
     * Logout user by clearing authentication data
     */
    logout: () => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userHasPassword');
    }
};
