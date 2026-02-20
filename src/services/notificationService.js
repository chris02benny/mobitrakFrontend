import api from './api';

/**
 * notificationService.js
 * Notification management API calls.
 * Uses the centralized `api` client — base URL comes from VITE_API_URL.
 * JWT is attached automatically via the api.js request interceptor (x-auth-token header).
 *
 * NOTE: Standardized to use `x-auth-token` (same as all other services) instead of
 * the previous `Authorization: Bearer` pattern. The backend notification middleware
 * accepts x-auth-token — same JWT middleware used across all routes.
 */

class NotificationService {
    /**
     * Get user notifications
     */
    static async getNotifications(page = 1, limit = 20, unreadOnly = false) {
        const response = await api.get('/api/notifications', {
            params: { page, limit, unreadOnly },
        });
        return response.data.data;
    }

    /**
     * Get unread notification count
     */
    static async getUnreadCount() {
        try {
            const response = await api.get('/api/notifications/unread-count');
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
        const response = await api.put(`/api/notifications/${notificationId}/read`, {});
        return response.data.data;
    }

    /**
     * Mark all notifications as read
     */
    static async markAllAsRead() {
        const response = await api.put('/api/notifications/mark-all-read', {});
        return response.data;
    }

    /**
     * Delete notification
     */
    static async deleteNotification(notificationId) {
        const response = await api.delete(`/api/notifications/${notificationId}`);
        return response.data;
    }
}

export default NotificationService;
