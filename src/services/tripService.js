import api from './api';

/**
 * tripService.js
 * All trip management API calls.
 * Uses the centralized `api` client — base URL comes from VITE_API_URL.
 * JWT is attached automatically by the api.js request interceptor.
 */

export const tripService = {
    // Create a new trip
    createTrip: async (tripData) => {
        const response = await api.post('/api/trips', tripData);
        return response.data;
    },

    // Get all trips
    getTrips: async (filters = {}) => {
        const response = await api.get('/api/trips', { params: filters });
        return response.data.trips;
    },

    // Get single trip
    getTripById: async (tripId) => {
        const response = await api.get(`/api/trips/${tripId}`);
        return response.data.trip;
    },

    // Update trip
    updateTrip: async (tripId, updateData) => {
        const response = await api.put(`/api/trips/${tripId}`, updateData);
        return response.data;
    },

    // Delete trip
    deleteTrip: async (tripId) => {
        const response = await api.delete(`/api/trips/${tripId}`);
        return response.data;
    },

    // Calculate route (preview before creating)
    calculateRoute: async (coordinates, tripType) => {
        const response = await api.post('/api/trips/calculate-route', { coordinates, tripType });
        return response.data;
    },

    // Update trip location (real-time tracking)
    updateLocation: async (tripId, longitude, latitude) => {
        const response = await api.put(`/api/trips/${tripId}/location`, { longitude, latitude });
        return response.data;
    },

    // Get active trips with locations
    getActiveTripsWithLocations: async () => {
        const response = await api.get('/api/trips/active/locations');
        return response.data.trips;
    },

    // Get assigned trips for driver (no pricing details)
    getDriverAssignedTrips: async () => {
        const response = await api.get('/api/trips/driver/assigned');
        return response.data.trips;
    },

    // Start trip (driver)
    startTrip: async (tripId) => {
        const response = await api.put(`/api/trips/driver/${tripId}/start`, {});
        return response.data;
    },

    // Update stop status (driver)
    updateStopStatus: async (tripId, stopIndex, location) => {
        const response = await api.put(`/api/trips/driver/${tripId}/stops/${stopIndex}`, { location });
        return response.data;
    },

    // End trip (driver)
    endTrip: async (tripId) => {
        const response = await api.put(`/api/trips/driver/${tripId}/end`, {});
        return response.data;
    },

    // Get busy dates for a driver or vehicle
    getBusyDates: async (driverId = null, vehicleId = null) => {
        const params = {};
        if (driverId) params.driverId = driverId;
        if (vehicleId) params.vehicleId = vehicleId;
        const response = await api.get('/api/trips/busy-dates', { params });
        return response.data;
    },
};
