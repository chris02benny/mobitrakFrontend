const API_BASE_URL = 'http://localhost:5002/api/vehicles'; // Port 5002 as per user request (Vehicle Service)

const getAuthToken = () => localStorage.getItem('authToken');

export const vehicleService = {
    extractRC: async (file) => {
        const token = getAuthToken();
        const formData = new FormData();
        formData.append('rcBook', file);

        try {
            const response = await fetch(`${API_BASE_URL}/extract-rc`, {
                method: 'POST',
                headers: {
                    'x-auth-token': token,
                },
                body: formData,
            });

            const data = await response.json();
            if (!response.ok) {
                const error = new Error(data.message || 'Failed to extract RC details');
                error.status = response.status;
                throw error;
            }
            return data;
        } catch (error) {
            throw error;
        }
    },

    createVehicle: async (formData) => {
        const token = getAuthToken();
        try {
            const response = await fetch(`${API_BASE_URL}`, {
                method: 'POST',
                headers: {
                    'x-auth-token': token,
                },
                body: formData,
            });

            const data = await response.json();
            if (!response.ok) {
                const error = new Error(data.message || 'Failed to add vehicle');
                error.status = response.status;
                throw error;
            }
            return data;
        } catch (error) {
            throw error;
        }
    },

    // Legacy support or alias
    addVehicle: async (formData) => {
        return vehicleService.createVehicle(formData);
    },

    getVehicles: async () => {
        const token = getAuthToken();
        if (!token) {
            throw new Error('No authentication token found. Please login.');
        }

        try {
            console.log(`Fetching vehicles from: ${API_BASE_URL}`);
            const response = await fetch(`${API_BASE_URL}`, {
                method: 'GET',
                headers: {
                    'x-auth-token': token,
                    'Content-Type': 'application/json',
                },
            });

            const contentType = response.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                const text = await response.text();
                throw new Error(`Expected JSON but got ${contentType}. Response: ${text.substring(0, 100)}...`);
            }

            const data = await response.json();

            if (!response.ok) {
                const error = new Error(data.message || 'Failed to fetch vehicles');
                error.status = response.status;
                throw error;
            }

            // User spec confirms response is an array: [{...}, {...}]
            if (Array.isArray(data)) {
                return data;
            } else if (data.vehicles && Array.isArray(data.vehicles)) {
                // Keep fallback just in case, but primary is array
                return data.vehicles;
            } else {
                console.warn("Unexpected response format, returning empty array:", data);
                return [];
            }
        } catch (error) {
            console.error("Fetch vehicles error:", error);
            throw error;
        }
    },

    updateVehicle: async (vehicleId, formData) => {
        const token = getAuthToken();
        try {
            const response = await fetch(`${API_BASE_URL}/${vehicleId}`, {
                method: 'PUT',
                headers: {
                    'x-auth-token': token,
                },
                body: formData,
            });

            const data = await response.json();
            if (!response.ok) {
                const error = new Error(data.message || 'Failed to update vehicle');
                error.status = response.status;
                throw error;
            }
            return data;
        } catch (error) {
            throw error;
        }
    },

    deleteVehicle: async (vehicleId) => {
        const token = getAuthToken();
        try {
            const response = await fetch(`${API_BASE_URL}/${vehicleId}`, {
                method: 'DELETE',
                headers: {
                    'x-auth-token': token,
                    'Content-Type': 'application/json',
                },
            });

            const data = await response.json();
            if (!response.ok) {
                const error = new Error(data.message || 'Failed to delete vehicle');
                error.status = response.status;
                throw error;
            }
            return data;
        } catch (error) {
            throw error;
        }
    }
};
