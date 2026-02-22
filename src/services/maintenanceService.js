import api from './api';

export const maintenanceService = {
    /**
     * Schedule a new regular service.
     * @param {Object} data - Maintenance details (vehicleId, lastServiceDate, intervalMonths, plannedStartDate, plannedEndDate, notes)
     */
    scheduleRegularService: async (data) => {
        const response = await api.post('/api/maintenance/regular-service', data);
        return response.data;
    },

    /**
     * Get maintenance records for a vehicle or business.
     * @param {string} vehicleId - Optional vehicle ID to filter
     */
    getMaintenanceRecords: async (vehicleId = '') => {
        const url = vehicleId
            ? `/api/maintenance/regular-service?vehicleId=${vehicleId}`
            : '/api/maintenance/regular-service';
        const response = await api.get(url);
        return response.data.data;
    },

    /**
     * Complete a maintenance task.
     * @param {string} id - Maintenance record ID
     * @param {FormData} formData - Completion details including files
     */
    completeRegularService: async (id, formData) => {
        const response = await api.patch(`/api/maintenance/regular-service/${id}/complete`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    },

    /**
     * Update maintenance status.
     * @param {string} id - Maintenance record ID
     * @param {string} status - New status (SCHEDULED, IN_PROGRESS, COMPLETED)
     */
    updateStatus: async (id, status) => {
        const response = await api.patch(`/api/maintenance/regular-service/${id}/status`, { status });
        return response.data;
    }
};
