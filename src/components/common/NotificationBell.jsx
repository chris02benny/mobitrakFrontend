import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, Check, Trash2, CheckCheck } from 'lucide-react';
import NotificationService from '../../services/notificationService';
import toast from 'react-hot-toast';
// Socket.IO disabled for now
// import { io } from 'socket.io-client';

const NotificationBell = () => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef(null);
    const socketRef = useRef(null);

    useEffect(() => {
        fetchNotifications();
        fetchUnreadCount();

        // Socket.IO disabled for now - notifications will be fetched via polling
        // TODO: Re-enable when notification service is ready
        /*
        const token = localStorage.getItem('authToken');
        if (!token) {
            console.warn('No auth token found, skipping socket connection');
            return;
        }

        try {
            const userId = JSON.parse(atob(token.split('.')[1])).userId;
            const API_URL = import.meta.env.VITE_API_URL || 'https://g5ly7nfs0m.execute-api.ap-south-1.amazonaws.com';

            const socket = io(API_URL, {
                transports: ['polling', 'websocket'],
                reconnection: true,
                reconnectionAttempts: 5,
                reconnectionDelay: 1000,
                timeout: 10000
            });

            socket.on('connect', () => {
                console.log('Socket connected for notifications');
                socket.emit('join-user-room', userId);
            });

            socket.on('new-notification', (notification) => {
                console.log('New notification received:', notification);
                setNotifications(prev => [notification, ...prev]);
                setUnreadCount(prev => prev + 1);
                
                // Show toast for new notification
                toast.success(notification.title, {
                    duration: 4000,
                    icon: getNotificationIcon(notification.type)
                });
            });

            socketRef.current = socket;

            return () => {
                socket.disconnect();
            };
        } catch (error) {
            console.error('Error setting up socket connection:', error);
        }
        */
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchNotifications = async () => {
        try {
            setLoading(true);
            const data = await NotificationService.getNotifications(1, 10);
            setNotifications(data.notifications || []);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchUnreadCount = async () => {
        try {
            const count = await NotificationService.getUnreadCount();
            setUnreadCount(count);
        } catch (error) {
            console.error('Error fetching unread count:', error);
        }
    };

    const handleMarkAsRead = async (notificationId) => {
        try {
            await NotificationService.markAsRead(notificationId);
            setNotifications(prev =>
                prev.map(n => n._id === notificationId ? { ...n, isRead: true } : n)
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            toast.error('Failed to mark as read');
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await NotificationService.markAllAsRead();
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);
            toast.success('All notifications marked as read');
        } catch (error) {
            toast.error('Failed to mark all as read');
        }
    };

    const handleDelete = async (notificationId) => {
        try {
            await NotificationService.deleteNotification(notificationId);
            setNotifications(prev => prev.filter(n => n._id !== notificationId));
            toast.success('Notification deleted');
        } catch (error) {
            toast.error('Failed to delete notification');
        }
    };

    const getNotificationIcon = (type) => {
        switch (type) {
            case 'HIRE_REQUEST_ACCEPTED':
                return '✅';
            case 'HIRE_REQUEST_REJECTED':
                return '❌';
            case 'CONTRACT_TERMINATED':
                return '⚠️';
            case 'DRIVER_HIRED':
                return '🎉';
            case 'VEHICLE_ADDED':
                return '🚗';
            case 'OFFICE_LOCATION_UPDATE':
                return '📍';
            default:
                return '🔔';
        }
    };

    const getNotificationColor = (type) => {
        switch (type) {
            case 'HIRE_REQUEST_ACCEPTED':
            case 'DRIVER_HIRED':
                return 'bg-green-50 border-green-200';
            case 'HIRE_REQUEST_REJECTED':
                return 'bg-red-50 border-red-200';
            case 'CONTRACT_TERMINATED':
                return 'bg-orange-50 border-orange-200';
            case 'VEHICLE_ADDED':
                return 'bg-blue-50 border-blue-200';
            case 'OFFICE_LOCATION_UPDATE':
                return 'bg-purple-50 border-purple-200';
            default:
                return 'bg-gray-50 border-gray-200';
        }
    };

    const formatTimeAgo = (date) => {
        const now = new Date();
        const notifDate = new Date(date);
        const diffMs = now - notifDate;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        return `${diffDays}d ago`;
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Notification Bell Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
                <Bell size={24} />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Notification Dropdown */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-xl border border-gray-200 z-50">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-gray-200">
                        <div>
                            <h3 className="font-semibold text-gray-900">Notifications</h3>
                            <p className="text-xs text-gray-500">
                                {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
                            </p>
                        </div>
                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllAsRead}
                                className="text-xs text-primary hover:text-amber-600 font-medium flex items-center gap-1"
                            >
                                <CheckCheck size={14} />
                                Mark all read
                            </button>
                        )}
                    </div>

                    {/* Notifications List */}
                    <div className="max-h-96 overflow-y-auto">
                        {loading ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                                <Bell size={32} className="mb-2 opacity-50" />
                                <p className="text-sm">No notifications yet</p>
                            </div>
                        ) : (
                            notifications.map((notification) => (
                                <div
                                    key={notification._id}
                                    className={`p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${!notification.isRead ? 'bg-amber-50' : ''
                                        }`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${getNotificationColor(notification.type)}`}>
                                            <span className="text-lg">{getNotificationIcon(notification.type)}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex-1">
                                                    <p className="text-sm font-semibold text-gray-900 mb-1">
                                                        {notification.title}
                                                    </p>
                                                    <p className="text-xs text-gray-600">
                                                        {notification.message}
                                                    </p>
                                                    <p className="text-xs text-gray-400 mt-1">
                                                        {formatTimeAgo(notification.createdAt)}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    {!notification.isRead && (
                                                        <button
                                                            onClick={() => handleMarkAsRead(notification._id)}
                                                            className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                                                            title="Mark as read"
                                                        >
                                                            <Check size={14} />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleDelete(notification._id)}
                                                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Footer */}
                    {notifications.length > 0 && (
                        <div className="p-3 border-t border-gray-200 text-center">
                            <button
                                onClick={() => {
                                    setIsOpen(false);
                                    // Could navigate to full notifications page
                                }}
                                className="text-sm text-primary hover:text-amber-600 font-medium"
                            >
                                View all notifications
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
