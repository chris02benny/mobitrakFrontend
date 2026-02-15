import React, { useState, useEffect } from 'react';
import { MoreHorizontal, UserCheck, UserX, User, Bell, MapPin, Edit, Trash2 } from 'lucide-react';
import { hiringService } from '../../services/hiringService';
import { tripService } from '../../services/tripService';
import NotificationService from '../../services/notificationService';

const AlertItem = ({ color, title, description, time, icon: Icon }) => {
    return (
        <div className="flex items-start justify-between py-4 border-b border-gray-200 last:border-b-0 px-6 hover:bg-gray-50 transition-colors">
            <div className="flex gap-3 items-start">
                {Icon ? (
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0`} style={{ backgroundColor: `${color}20` }}>
                        <Icon size={16} style={{ color: color }} />
                    </div>
                ) : (
                    <div
                        className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0`}
                        style={{ backgroundColor: color }}
                    ></div>
                )}
                <div>
                    <div className="text-sm font-medium text-gray-900">{title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{description}</div>
                </div>
            </div>
            <span className="text-[11px] text-muted-foreground whitespace-nowrap ml-2">{time}</span>
        </div>
    );
};

const RecentAlerts = () => {
    const [hireAlerts, setHireAlerts] = useState([]);
    const [tripAlerts, setTripAlerts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchHireAlerts();
        fetchTripAlerts();
        // Refresh every 30 seconds
        const interval = setInterval(() => {
            fetchHireAlerts();
            fetchTripAlerts();
        }, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchTripAlerts = async () => {
        try {
            // Fetch notifications related to trips
            const notifications = await NotificationService.getNotifications(1, 20);
            
            // Filter and convert trip notifications to alerts
            const tripNotifications = (notifications.notifications || [])
                .filter(notif => ['TRIP_CREATED', 'TRIP_UPDATED', 'TRIP_DELETED'].includes(notif.type))
                .filter(notif => isRecent(notif.createdAt))
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .slice(0, 5)
                .map(notif => {
                    let icon = MapPin;
                    let color = '#3b82f6';
                    
                    if (notif.type === 'TRIP_CREATED') {
                        icon = MapPin;
                        color = '#10b981'; // green
                    } else if (notif.type === 'TRIP_UPDATED') {
                        icon = Edit;
                        color = '#f59e0b'; // amber
                    } else if (notif.type === 'TRIP_DELETED') {
                        icon = Trash2;
                        color = '#ef4444'; // red
                    }
                    
                    return {
                        id: notif._id,
                        type: notif.type.toLowerCase(),
                        title: notif.title,
                        description: notif.message.substring(0, 60) + (notif.message.length > 60 ? '...' : ''),
                        time: formatTimeAgo(notif.createdAt),
                        color: color,
                        icon: icon
                    };
                });
            
            setTripAlerts(tripNotifications);
        } catch (error) {
            console.error('Error fetching trip alerts:', error);
        }
    };

    const fetchHireAlerts = async () => {
        try {
            const response = await hiringService.getSentRequests();
            const requests = response.data?.requests || [];
            
            // Convert requests to alerts, prioritizing recent and responded ones
            const alerts = requests
                .filter(req => req.status !== 'PENDING' || isRecent(req.createdAt))
                .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
                .slice(0, 5)
                .map(req => {
                    // Get driver name from various possible locations
                    const driverFirstName = req.driverId?.userDetails?.firstName || 
                                           req.driverId?.userId?.firstName || 
                                           'Unknown';
                    const driverLastName = req.driverId?.userDetails?.lastName || 
                                          req.driverId?.userId?.lastName || 
                                          '';
                    return {
                        id: req._id,
                        type: req.status === 'ACCEPTED' ? 'accepted' : req.status === 'REJECTED' ? 'rejected' : 'pending',
                        title: req.status === 'ACCEPTED' ? 'Hire Request Accepted' :
                               req.status === 'REJECTED' ? 'Hire Request Rejected' : 'Hire Request Sent',
                        description: `Driver: ${driverFirstName} ${driverLastName}`.trim(),
                        time: formatTimeAgo(req.updatedAt || req.createdAt),
                        color: req.status === 'ACCEPTED' ? '#22c55e' : 
                               req.status === 'REJECTED' ? '#ef4444' : '#f59e0b',
                        icon: req.status === 'ACCEPTED' ? UserCheck : 
                              req.status === 'REJECTED' ? UserX : User
                    };
                });
            
            setHireAlerts(alerts);
        } catch (error) {
            console.error('Error fetching hire alerts:', error);
        } finally {
            setLoading(false);
        }
    };

    const isRecent = (dateStr) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffHours = (now - date) / (1000 * 60 * 60);
        return diffHours < 24;
    };

    const formatTimeAgo = (dateStr) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        return `${diffDays}d ago`;
    };

    // Combine all alerts and sort by time
    const allAlerts = [...tripAlerts, ...hireAlerts]
        .sort((a, b) => {
            // Parse time strings to compare (newest first)
            const getMinutes = (timeStr) => {
                if (timeStr === 'Just now') return 0;
                const num = parseInt(timeStr);
                if (timeStr.includes('m')) return num;
                if (timeStr.includes('h')) return num * 60;
                if (timeStr.includes('d')) return num * 1440;
                return 9999;
            };
            return getMinutes(a.time) - getMinutes(b.time);
        })
        .slice(0, 6);

    return (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col h-full">
            <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Bell size={18} className="text-amber-500" />
                    <span className="font-semibold text-gray-900">Recent Alerts</span>
                    {(hireAlerts.filter(a => a.type === 'accepted' || a.type === 'rejected').length + tripAlerts.length) > 0 && (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                            {hireAlerts.filter(a => a.type === 'accepted' || a.type === 'rejected').length + tripAlerts.length} new
                        </span>
                    )}
                </div>
                <MoreHorizontal size={20} className="text-muted-foreground cursor-pointer hover:text-gray-700" />
            </div>
            <div className="overflow-y-auto flex-1">
                {loading ? (
                    <div className="flex items-center justify-center h-32">
                        <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : allAlerts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-gray-400">
                        <Bell size={24} className="mb-2" />
                        <p className="text-sm">No alerts yet</p>
                    </div>
                ) : (
                    allAlerts.map((alert, idx) => (
                        <AlertItem
                            key={alert.id || idx}
                            color={alert.color}
                            title={alert.title}
                            description={alert.description}
                            time={alert.time}
                            icon={alert.icon}
                        />
                    ))
                )}
            </div>
            <div className="p-4 border-t border-gray-200 mt-auto text-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer">
                <span className="text-sm font-medium text-primary">View All Alerts</span>
            </div>
        </div>
    );
};

export default RecentAlerts;
