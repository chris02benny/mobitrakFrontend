import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Route, Clock, Award, Briefcase, Car } from 'lucide-react';
import StatCard from '../../components/dashboard/StatCard';

const DriverDashboard = () => {
    const navigate = useNavigate();

    // Mock data for driver stats
    const totalTrips = 0;
    const hoursDriven = 0;
    const safetyScore = 100;

    return (
        <div className="flex flex-col gap-6">
            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                    title="Total Trips"
                    value={totalTrips.toString()}
                    subtext="Completed trips"
                    subtextIcon={<Route size={12} />}
                    icon={<Route size={20} />}
                    iconBg="#fffbeb"
                    iconColor="#f59e0b"
                />
                <StatCard
                    title="Hours Driven"
                    value={hoursDriven.toString()}
                    subtext="This month"
                    subtextIcon={<Clock size={12} />}
                    icon={<Clock size={20} />}
                    iconBg="#dcfce7"
                    iconColor="#166534"
                />
                <StatCard
                    title="Safety Score"
                    value={safetyScore.toString()}
                    subtext="Excellent driving"
                    subtextIcon={<Award size={12} />}
                    icon={<Award size={20} />}
                    iconBg="#dbeafe"
                    iconColor="#1d4ed8"
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
                <div
                    onClick={() => navigate('/driver/vehicle')}
                    className="bg-white rounded-xl border border-gray-200 p-6 cursor-pointer hover:shadow-lg transition-shadow"
                >
                    <Car size={32} className="text-amber-500 mb-3" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">My Vehicle</h3>
                    <p className="text-gray-600 text-sm">Check your assigned vehicle details and status</p>
                </div>
            </div>
        </div>
    );
};

export default DriverDashboard;
