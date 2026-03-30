import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Route, Clock, Award, Briefcase, Car, Eye } from 'lucide-react';
import StatCard from '../../components/dashboard/StatCard';
import { tripService } from '../../services/tripService';

const DriverDashboard = () => {
    const navigate = useNavigate();

    const [stats, setStats] = useState({
        completedTrips: 0,
        hoursDriven: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                setLoading(true);
                const trips = await tripService.getDriverAssignedTrips();
                const completedCount = trips.filter(t => t.status === 'completed').length;
                
                setStats({
                    completedTrips: completedCount,
                    hoursDriven: 0 // Hours driven data not yet available from API
                });
            } catch (err) {
                console.error('Error fetching dashboard stats:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    return (
        <div className="flex flex-col gap-6">
            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <StatCard
                    title="Total Trips"
                    value={stats.completedTrips.toString()}
                    subtext="Completed trips"
                    subtextIcon={<Route size={12} />}
                    icon={<Route size={20} />}
                    iconBg="#fffbeb"
                    iconColor="#f59e0b"
                    loading={loading}
                />
                <StatCard
                    title="Hours Driven"
                    value={stats.hoursDriven.toString()}
                    subtext="This month"
                    subtextIcon={<Clock size={12} />}
                    icon={<Clock size={20} />}
                    iconBg="#dcfce7"
                    iconColor="#166534"
                    loading={loading}
                />
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div
                    onClick={() => navigate('/driver/jobs')}
                    className="bg-white rounded-xl border border-gray-200 p-6 cursor-pointer hover:shadow-lg transition-shadow"
                >
                    <Briefcase size={32} className="text-amber-500 mb-3" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Find Jobs</h3>
                    <p className="text-gray-600 text-sm">Browse available job listings from companies</p>
                </div>
                <div
                    onClick={() => navigate('/driver/trips')}
                    className="bg-white rounded-xl border border-gray-200 p-6 cursor-pointer hover:shadow-lg transition-shadow"
                >
                    <Route size={32} className="text-amber-500 mb-3" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">My Trips</h3>
                    <p className="text-gray-600 text-sm">View your trip history and upcoming assignments</p>
                </div>

                {/* ── NEW: Start Monitoring card ── */}
                <div
                    onClick={() => navigate('/driver/monitoring')}
                    className="relative bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl border border-amber-400 p-6 cursor-pointer hover:shadow-lg hover:shadow-amber-200 transition-all text-white overflow-hidden group"
                >
                    {/* Subtle animated ring */}
                    <div className="absolute inset-0 rounded-xl border-2 border-white/20 scale-95 group-hover:scale-100 transition-transform duration-300" />
                    <Eye size={32} className="mb-3 relative z-10" />
                    <h3 className="text-lg font-semibold mb-2 relative z-10">Start Monitoring</h3>
                    <p className="text-amber-100 text-sm relative z-10">
                        Enable drowsiness detection &amp; live video streaming
                    </p>
                    <span className="absolute top-3 right-3 text-xs bg-white/20 px-2 py-0.5 rounded-full font-medium">
                        LIVE
                    </span>
                </div>
            </div>
        </div>
    );
};

export default DriverDashboard;
