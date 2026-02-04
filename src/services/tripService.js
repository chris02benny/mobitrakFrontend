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
    }
};
