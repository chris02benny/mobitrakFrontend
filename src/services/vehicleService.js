import api from './api';

/**
 * vehicleService.js
 * All vehicle and tracking device API calls.
 * Uses the centralized `api` client — base URL comes from VITE_API_URL.
 * JWT is attached automatically by the api.js request interceptor.
 *
 * NOTE: fetchTraccarPositions() calls the external Traccar demo server
 *       (https://demo.traccar.org) directly — this is intentional and
 *       NOT routed through our backend.
 */

export const vehicleService = {
    extractRC: async (file) => {
        const formData = new FormData();
        formData.append('rcBook', file);
        const response = await api.post('/api/vehicles/extract-rc', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    },

    createVehicle: async (formData) => {
        const response = await api.post('/api/vehicles', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    },

    // Legacy alias
    addVehicle: async (formData) => {
        return vehicleService.createVehicle(formData);
    },

    getVehicles: async () => {
        const response = await api.get('/api/vehicles');
        const data = response.data;
        if (Array.isArray(data)) return data;
        if (data.vehicles && Array.isArray(data.vehicles)) return data.vehicles;
        console.warn('Unexpected response format, returning empty array:', data);
        return [];
    },

    getAvailableVehicles: async (params = {}) => {
        const response = await api.get('/api/vehicles/available', { params });
        const data = response.data;
        if (Array.isArray(data)) return data;
        if (data.vehicles && Array.isArray(data.vehicles)) return data.vehicles;
        console.warn('Unexpected response format, returning empty array:', data);
        return [];
    },

    updateVehicle: async (vehicleId, formData) => {
        const response = await api.put(`/api/vehicles/${vehicleId}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    },

    deleteVehicle: async (vehicleId) => {
        const response = await api.delete(`/api/vehicles/${vehicleId}`);
        return response.data;
    },

    getVehicleById: async (vehicleId) => {
        const response = await api.get(`/api/vehicles/${vehicleId}`);
        return response.data;
    },

    // Get vehicles with live tracking credentials
    getVehiclesWithTracking: async () => {
        const vehicles = await vehicleService.getVehicles();
        const vehiclesWithTracking = [];
        for (const vehicle of vehicles) {
            if (vehicle.hasLiveTracking) {
                try {
                    const credResponse = await api.get(
                        `/api/tracking-device/credentials/${vehicle._id}/decrypt`
                    );
                    vehiclesWithTracking.push({
                        ...vehicle,
                        trackingCredentials: credResponse.data.credentials,
                    });
                } catch (err) {
                    console.warn(
                        `Could not fetch tracking credentials for vehicle ${vehicle._id}:`,
                        err
                    );
                }
            }
        }
        return vehiclesWithTracking;
    },

    // Fetch live positions from external Traccar API (NOT our backend)
    fetchTraccarPositions: async (email, password) => {
        const auth = btoa(`${email}:${password}`);
        const response = await fetch('https://demo.traccar.org/api/positions', {
            method: 'GET',
            headers: {
                Authorization: `Basic ${auth}`,
                'Content-Type': 'application/json',
            },
        });
        if (!response.ok) {
            throw new Error('Failed to fetch Traccar positions');
        }
        return response.json();
    },

    // Get assigned vehicle for driver
    getMyAssignedVehicle: async () => {
        const response = await api.get('/api/drivers/employments/my-vehicle');
        return response.data.data;
    },
};
