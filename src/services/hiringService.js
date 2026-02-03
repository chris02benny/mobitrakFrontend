const API_BASE_URL = 'http://localhost:5003/api/drivers';

/**
 * Helper to handle API responses
 */
const handleResponse = async (response) => {
    const data = await response.json();
    if (!response.ok) {
        // Include validation errors in the error message if present
        let errorMessage = data.message || 'Something went wrong';
        if (data.errors && Array.isArray(data.errors)) {
            const errorDetails = data.errors.map(e => `${e.field}: ${e.message}`).join(', ');
            errorMessage = `${errorMessage} (${errorDetails})`;
            console.error('Validation errors:', data.errors);
        }
        const error = new Error(errorMessage);
        error.status = response.status;
        error.data = data;
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

export const hiringService = {
    /**
     * Get available drivers (unemployed with complete profiles)
     */
    getAvailableDrivers: async (page = 1, limit = 20) => {
        try {
            const response = await fetch(
                `${API_BASE_URL}/job-requests/available-drivers?page=${page}&limit=${limit}`,
                {
                    method: 'GET',
                    headers: getAuthHeaders()
                }
            );
            return handleResponse(response);
        } catch (error) {
            throw error;
        }
    },

    /**
     * Send hire request to driver
     */
    sendHireRequest: async (hireData) => {
        try {
            const response = await fetch(`${API_BASE_URL}/job-requests`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(hireData)
            });
            return handleResponse(response);
        } catch (error) {
            throw error;
        }
    },

    /**
     * Get received job requests (for driver)
     */
    getReceivedRequests: async (status = '', page = 1, limit = 20) => {
        try {
            const queryParams = new URLSearchParams({ page, limit });
            if (status) queryParams.append('status', status);
            
            const response = await fetch(
                `${API_BASE_URL}/job-requests/received?${queryParams}`,
                {
                    method: 'GET',
                    headers: getAuthHeaders()
                }
            );
            return handleResponse(response);
        } catch (error) {
            throw error;
        }
    },

    /**
     * Get sent job requests (for company)
     */
    getSentRequests: async (status = '', page = 1, limit = 20) => {
        try {
            const queryParams = new URLSearchParams({ page, limit });
            if (status) queryParams.append('status', status);
            
            const response = await fetch(
                `${API_BASE_URL}/job-requests/sent?${queryParams}`,
                {
                    method: 'GET',
                    headers: getAuthHeaders()
                }
            );
            return handleResponse(response);
        } catch (error) {
            throw error;
        }
    },

    /**
     * Get job request by ID
     */
    getRequestById: async (requestId) => {
        try {
            const response = await fetch(`${API_BASE_URL}/job-requests/${requestId}`, {
                method: 'GET',
                headers: getAuthHeaders()
            });
            return handleResponse(response);
        } catch (error) {
            throw error;
        }
    },

    /**
     * Respond to job request (accept/reject)
     */
    respondToRequest: async (requestId, action, message = '', rejection = null, dlConsentGiven = undefined) => {
        try {
            const body = { action, message };
            if (rejection) body.rejection = rejection;
            if (dlConsentGiven !== undefined) body.dlConsentGiven = dlConsentGiven;
            
            const response = await fetch(`${API_BASE_URL}/job-requests/${requestId}/respond`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(body)
            });
            return handleResponse(response);
        } catch (error) {
            throw error;
        }
    },

    /**
     * Get company employees (hired drivers)
     */
    getCompanyEmployees: async (status = 'ACTIVE', page = 1, limit = 20) => {
        try {
            const queryParams = new URLSearchParams({ page, limit });
            if (status) queryParams.append('status', status);
            
            const response = await fetch(
                `${API_BASE_URL}/employments/company?${queryParams}`,
                {
                    method: 'GET',
                    headers: getAuthHeaders()
                }
            );
            return handleResponse(response);
        } catch (error) {
            throw error;
        }
    },

    /**
     * Get driver's current employment
     */
    getCurrentEmployment: async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/employments/current`, {
                method: 'GET',
                headers: getAuthHeaders()
            });
            return handleResponse(response);
        } catch (error) {
            throw error;
        }
    },

    /**
     * Get user details by ID
     */
    getUserById: async (userId) => {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`http://localhost:5001/api/users/${userId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': token
                }
            });
            return handleResponse(response);
        } catch (error) {
            throw error;
        }
    },

    /**
     * Finalize hiring (company adds accepted driver to fleet)
     */
    finalizeHiring: async (requestId, hireData) => {
        try {
            const response = await fetch(`${API_BASE_URL}/job-requests/${requestId}/hire`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(hireData)
            });
            return handleResponse(response);
        } catch (error) {
            throw error;
        }
    },

    /**
     * Get driver profile by ID
     */
    getDriverProfile: async (profileId) => {
        try {
            const response = await fetch(`${API_BASE_URL}/profiles/${profileId}`, {
                method: 'GET',
                headers: getAuthHeaders()
            });
            return handleResponse(response);
        } catch (error) {
            throw error;
        }
    },

    /**
     * Terminate employment
     */
    terminateEmployment: async (employmentId, terminateData) => {
        try {
            const response = await fetch(`${API_BASE_URL}/employments/${employmentId}/terminate`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(terminateData)
            });
            return handleResponse(response);
        } catch (error) {
            throw error;
        }
    }
};
