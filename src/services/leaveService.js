import { apiConfig } from '../config/apiConfig.js';

const getAuthToken = () => localStorage.getItem('authToken');

export const leaveService = {
    /**
     * Apply for leave. Sends multipart/form-data so a sick document can be attached.
     * @param {Object} leaveData - { startDate, endDate, type, reason }
     * @param {File|null} documentFile - Medical document for SICK leave (optional)
     */
    applyLeave: async (leaveData, documentFile = null) => {
        const token = getAuthToken();

        const formData = new FormData();
        formData.append('startDate', leaveData.startDate);
        formData.append('endDate', leaveData.endDate);
        formData.append('type', leaveData.type);
        formData.append('reason', leaveData.reason);

        if (documentFile) {
            formData.append('document', documentFile);
        }

        const response = await fetch(`${apiConfig.getDriverServiceUrl('/leaves')}`, {
            method: 'POST',
            headers: { 'x-auth-token': token },
            body: formData,
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Failed to submit leave application');
        }
        return data;
    },

    /**
     * Get all leaves for the authenticated driver.
     */
    getDriverLeaves: async () => {
        const token = getAuthToken();

        const response = await fetch(`${apiConfig.getDriverServiceUrl('/leaves/my')}`, {
            method: 'GET',
            headers: {
                'x-auth-token': token,
                'Content-Type': 'application/json',
            },
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Failed to fetch leaves');
        }
        return data.leaves;
    },

    /**
     * Cancel a pending leave application (Driver).
     * @param {string} leaveId
     */
    cancelLeave: async (leaveId) => {
        const token = getAuthToken();

        const response = await fetch(`${apiConfig.getDriverServiceUrl(`/leaves/${leaveId}/cancel`)}`, {
            method: 'PATCH',
            headers: {
                'x-auth-token': token,
                'Content-Type': 'application/json',
            },
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Failed to cancel leave');
        }
        return data;
    },

    /**
     * Get all leaves for the company (Fleet Manager).
     * @param {string} [status] - Optional filter: PENDING | APPROVED | REJECTED
     */
    getCompanyLeaves: async (status = '') => {
        const token = getAuthToken();
        const query = status ? `?status=${status}` : '';

        const response = await fetch(`${apiConfig.getDriverServiceUrl(`/leaves/company${query}`)}`, {
            method: 'GET',
            headers: {
                'x-auth-token': token,
                'Content-Type': 'application/json',
            },
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Failed to fetch company leaves');
        }
        return data.leaves;
    },

    /**
     * Approve or reject a leave application (Fleet Manager).
     * @param {string} leaveId
     * @param {'APPROVED'|'REJECTED'} status
     * @param {string} [managerNote]
     */
    updateLeaveStatus: async (leaveId, status, managerNote = '') => {
        const token = getAuthToken();

        const response = await fetch(`${apiConfig.getDriverServiceUrl(`/leaves/${leaveId}/status`)}`, {
            method: 'PATCH',
            headers: {
                'x-auth-token': token,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status, managerNote }),
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Failed to update leave status');
        }
        return data;
    },
};
