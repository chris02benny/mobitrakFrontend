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

    getAvailableVehicles: async (params = {}) => {
        const token = getAuthToken();
        if (!token) {
            throw new Error('No authentication token found. Please login.');
        }

        try {
            const queryString = new URLSearchParams(params).toString();
            const url = `${API_BASE_URL}/available${queryString ? `?${queryString}` : ''}`;
            
            console.log(`Fetching available vehicles from: ${url}`);
            const response = await fetch(url, {
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
                const error = new Error(data.message || 'Failed to fetch available vehicles');
                error.status = response.status;
                throw error;
            }

            // Response should be an array
            if (Array.isArray(data)) {
                return data;
            } else if (data.vehicles && Array.isArray(data.vehicles)) {
                return data.vehicles;
            } else {
                console.warn("Unexpected response format, returning empty array:", data);
                return [];
            }
        } catch (error) {
            console.error("Fetch available vehicles error:", error);
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
    },

    getVehicleById: async (vehicleId) => {
        const token = getAuthToken();
        if (!token) {
            throw new Error('No authentication token found. Please login.');
        }

        try {
            const response = await fetch(`${API_BASE_URL}/${vehicleId}`, {
                method: 'GET',
                headers: {
                    'x-auth-token': token,
                    'Content-Type': 'application/json',
                },
            });

            const data = await response.json();
            if (!response.ok) {
                const error = new Error(data.message || 'Failed to fetch vehicle');
                error.status = response.status;
                throw error;
            }
            return data;
        } catch (error) {
            throw error;
        }
    },

    // Get vehicles with live tracking credentials
    getVehiclesWithTracking: async () => {
        const token = getAuthToken();
        if (!token) {
            throw new Error('No authentication token found. Please login.');
        }

        try {
            // Get all vehicles
            const vehicles = await vehicleService.getVehicles();
            
            // Get vehicles with tracking credentials
            const vehiclesWithTracking = [];
            for (const vehicle of vehicles) {
                if (vehicle.hasLiveTracking) {
                    try {
                        const credResponse = await fetch(`http://localhost:5002/api/tracking-device/credentials/${vehicle._id}/decrypt`, {
                            method: 'GET',
                            headers: {
                                'x-auth-token': token,
                                'Content-Type': 'application/json',
                            },
                        });
                        
                        if (credResponse.ok) {
                            const credData = await credResponse.json();
                            vehiclesWithTracking.push({
                                ...vehicle,
                                trackingCredentials: credData.credentials
                            });
                        }
                    } catch (err) {
                        console.warn(`Could not fetch tracking credentials for vehicle ${vehicle._id}:`, err);
                    }
                }
            }
            
            return vehiclesWithTracking;
        } catch (error) {
            console.error("Fetch vehicles with tracking error:", error);
            throw error;
        }
    },

    // Fetch live positions from Traccar API
    fetchTraccarPositions: async (email, password) => {
        try {
            const auth = btoa(`${email}:${password}`);
            const response = await fetch('https://demo.traccar.org/api/positions', {
                method: 'GET',
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch Traccar positions');
            }

            const positions = await response.json();
            return positions;
        } catch (error) {
            console.error('Traccar API error:', error);
            throw error;
        }
    },

    // Get assigned vehicle for driver
    getMyAssignedVehicle: async () => {
        const token = getAuthToken();
        if (!token) {
            throw new Error('No authentication token found. Please login.');
        }

        try {
            const response = await fetch('http://localhost:5003/api/drivers/employments/my-vehicle', {
                method: 'GET',
                headers: {
                    'x-auth-token': token,
                    'Content-Type': 'application/json',
                },
            });

            const data = await response.json();
            if (!response.ok) {
                const error = new Error(data.message || 'Failed to fetch assigned vehicle');
                error.status = response.status;
                throw error;
            }
            return data.data; // Returns { vehicle, assignment, employment } or null
        } catch (error) {
            console.error('Fetch assigned vehicle error:', error);
            throw error;
        }
    }
};
