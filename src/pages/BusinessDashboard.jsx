import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Truck, Activity, Clock, AlertCircle, ArrowUp, Wrench } from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import StatCard from '../components/dashboard/StatCard';
import LiveFleetMap from '../components/dashboard/LiveFleetMap';
import RecentAlerts from '../components/dashboard/RecentAlerts';
import VehicleStatusTable from '../components/dashboard/VehicleStatusTable';
import VehicleList from '../components/vehicles/VehicleList';
import ProfileSettings from '../components/dashboard/ProfileSettings';
import LiveMap from './LiveMap';
import { vehicleService } from '../services/vehicleService';
import { authService } from '../services/authService';

// Fallback or placeholder for other tabs if they exist, but focusing on Overview for this task
const PlaceholderTab = ({ name }) => (
    <div className="flex items-center justify-center h-[600px] bg-white rounded-xl border border-gray-200">
        <p className="text-gray-400 font-medium">Content for {name} tab placeholder</p>
    </div>
);

const BusinessDashboard = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [activeTab, setActiveTab] = useState('overview');
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);

    // Fetch vehicles data
    useEffect(() => {
        fetchVehicles();
    }, []);

    const fetchVehicles = async () => {
        try {
            setLoading(true);
            const data = await vehicleService.getVehicles();
            setVehicles(data);
        } catch (error) {
            console.error('Error fetching vehicles:', error);
        } finally {
            setLoading(false);
        }
    };

    // Update active tab based on URL query parameter
    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab) {
            setActiveTab(tab);
        }
    }, [searchParams]);

    const handleLogout = () => {
        authService.logout();
        navigate('/login', { replace: true });
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'vehicles':
                return <VehicleList />;
            case 'map':
                return <LiveMap />;
            case 'drivers':
                return <PlaceholderTab name="Drivers" />;
            case 'maintenance':
                return <PlaceholderTab name="Maintenance" />;
            case 'reports':
                return <PlaceholderTab name="Reports" />;
            case 'settings': // Added
                return <ProfileSettings />;
            case 'overview':
            default:
                const totalVehicles = vehicles.length;
                // For now, all vehicles are idle since we don't track trip status
                const idleVehicles = totalVehicles;
                const activeVehicles = 0;
                const maintenanceVehicles = 0;

                return (
                    <div className="flex flex-col gap-6">
                        {/* Stats Row */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <StatCard
                                title="Total Vehicles"
                                value={loading ? '...' : totalVehicles.toString()}
                                subtext={`${totalVehicles} registered`}
                                subtextIcon={<ArrowUp size={12} />}
                                icon={<Truck size={20} />}
                                iconBg="#fffbeb" // amber-50
                                iconColor="#f59e0b" // amber-500
                            />
                            <StatCard
                                title="Active / Moving"
                                value={loading ? '...' : activeVehicles.toString()}
                                subtext="Currently on trips"
                                subtextIcon={<Activity size={12} className="text-green-600" />}
                                icon={<Activity size={20} />}
                                iconBg="#dcfce7" // green-100
                                iconColor="#166534" // green-700
                            />
                            <StatCard
                                title="Idle"
                                value={loading ? '...' : idleVehicles.toString()}
                                subtext="At office location"
                                subtextIcon={<Clock size={12} />}
                                icon={<Clock size={20} />}
                                iconBg="#fef3c7" // amber-100
                                iconColor="#d97706" // amber-600
                            />
                            <StatCard
                                title="Maintenance"
                                value={loading ? '...' : maintenanceVehicles.toString()}
                                subtext="Scheduled services"
                                subtextIcon={<AlertCircle size={12} />}
                                icon={<Wrench size={20} />}
                                iconBg="#fee2e2" // red-100
                                iconColor="#dc2626" // red-600
                            />
                        </div>

                        {/* Map & Alerts Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[500px]">
                            <div className="lg:col-span-2 h-full">
                                <LiveFleetMap setActiveTab={setActiveTab} />
                            </div>
                            <div className="lg:col-span-1 h-full">
                                <RecentAlerts />
                            </div>
                        </div>

                        {/* Vehicle Status Table */}
                        <div className="mt-2">
                            <VehicleStatusTable vehicles={vehicles} loading={loading} />
                        </div>
                    </div>
                );
        }
    };

    return (
        <DashboardLayout activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout}>
            {renderContent()}
        </DashboardLayout>
    );
};

export default BusinessDashboard;
