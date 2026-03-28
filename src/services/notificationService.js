import axios from 'axios';
import { apiConfig } from '../config/apiConfig.js';

class NotificationService {
    /**
     * Get user notifications
     */
    static async getNotifications(page = 1, limit = 20, unreadOnly = false) {
        try {
            const token = localStorage.getItem('authToken');
            const response = await axios.get(`${apiConfig.getUserServiceUrl()}/notifications`, {
                params: { page, limit, unreadOnly },
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            return response.data.data;
        } catch (error) {
            console.error('Error fetching notifications:', error);
            throw error;
        }
    }

    /**
     * Get unread notification count
     */
    static async getUnreadCount() {
        try {
            const token = localStorage.getItem('authToken');
            const response = await axios.get(`${apiConfig.getUserServiceUrl()}/notifications/unread-count`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            return response.data.count;
        } catch (error) {
            console.error('Error fetching unread count:', error);
            return 0;
        }
    }

    /**
     * Mark notification as read
     */
    static async markAsRead(notificationId) {
        try {
            const token = localStorage.getItem('authToken');
            const response = await axios.put(
                `${apiConfig.getUserServiceUrl()}/notifications/${notificationId}/read`,
                {},
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );
            return response.data.data;
        } catch (error) {
            console.error('Error marking notification as read:', error);
            throw error;
        }
    }

    /**
     * Mark all notifications as read
     */
    static async markAllAsRead() {
        try {
            const token = localStorage.getItem('authToken');
            const response = await axios.put(
                `${apiConfig.getUserServiceUrl()}/notifications/mark-all-read`,
                {},
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );
            return response.data;
        } catch (error) {
            console.error('Error marking all as read:', error);
            throw error;
        }
    }

    /**
     * Delete notification
     */
    static async deleteNotification(notificationId) {
        try {
            const token = localStorage.getItem('authToken');
            const response = await axios.delete(
                `${apiConfig.getUserServiceUrl()}/notifications/${notificationId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );
            return response.data;
        } catch (error) {
            console.error('Error deleting notification:', error);
            throw error;
        }
    }
}

export default NotificationService;
