import axios from 'axios';

const API_URL = 'http://localhost:5004/api/trips';

const getAuthHeader = () => {
    const token = localStorage.getItem('authToken');
    return { 'x-auth-token': token };
};

export const tripService = {
    // Create a new trip
    createTrip: async (tripData) => {
        try {
            const response = await axios.post(API_URL, tripData, {
                headers: getAuthHeader()
            });
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    // Get all trips
    getTrips: async (filters = {}) => {
        try {
            const response = await axios.get(API_URL, {
                headers: getAuthHeader(),
                params: filters
            });
            return response.data.trips;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    // Get single trip
    getTripById: async (tripId) => {
        try {
            const response = await axios.get(`${API_URL}/${tripId}`, {
                headers: getAuthHeader()
            });
            return response.data.trip;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    // Update trip
    updateTrip: async (tripId, updateData) => {
        try {
            const response = await axios.put(`${API_URL}/${tripId}`, updateData, {
                headers: getAuthHeader()
            });
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    // Delete trip
    deleteTrip: async (tripId) => {
        try {
            const response = await axios.delete(`${API_URL}/${tripId}`, {
                headers: getAuthHeader()
            });
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    // Calculate route (preview before creating)
    calculateRoute: async (coordinates, tripType) => {
        try {
            const response = await axios.post(`${API_URL}/calculate-route`, {
                coordinates,
                tripType
            }, {
                headers: getAuthHeader()
            });
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    // Update trip location (real-time tracking)
    updateLocation: async (tripId, longitude, latitude) => {
        try {
            const response = await axios.put(`${API_URL}/${tripId}/location`, {
                longitude,
                latitude
            }, {
                headers: getAuthHeader()
            });
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    // Get active trips with locations
    getActiveTripsWithLocations: async () => {
        try {
            const response = await axios.get(`${API_URL}/active/locations`, {
                headers: getAuthHeader()
            });
            return response.data.trips;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    // Get assigned trips for driver (no pricing details)
    getDriverAssignedTrips: async () => {
        try {
            const response = await axios.get(`${API_URL}/driver/assigned`, {
                headers: getAuthHeader()
            });
            return response.data.trips;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    // Start trip (driver)
    startTrip: async (tripId) => {
        try {
            const response = await axios.put(`${API_URL}/driver/${tripId}/start`, {}, {
                headers: getAuthHeader()
            });
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    // Update stop status (driver)
    updateStopStatus: async (tripId, stopIndex, location) => {
        try {
            const response = await axios.put(`${API_URL}/driver/${tripId}/stops/${stopIndex}`, {
                location
            }, {
                headers: getAuthHeader()
            });
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    // End trip (driver)
    endTrip: async (tripId) => {
        try {
            const response = await axios.put(`${API_URL}/driver/${tripId}/end`, {}, {
                headers: getAuthHeader()
            });
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    // Get busy dates for a driver or vehicle
    getBusyDates: async (driverId = null, vehicleId = null) => {
        try {
            const params = {};
            if (driverId) params.driverId = driverId;
            if (vehicleId) params.vehicleId = vehicleId;

            const response = await axios.get(`${API_URL}/busy-dates`, {
                headers: getAuthHeader(),
                params
            });
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    }
};
