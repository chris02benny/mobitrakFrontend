import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, Activity, Clock, AlertCircle, ArrowUp, Wrench, Eye } from 'lucide-react';
import StatCard from '../../components/dashboard/StatCard';
import LiveFleetMap from '../../components/dashboard/LiveFleetMap';
import RecentAlerts from '../../components/dashboard/RecentAlerts';
import VehicleStatusTable from '../../components/dashboard/VehicleStatusTable';
import { vehicleService } from '../../services/vehicleService';

const BusinessDashboard = () => {
    const navigate = useNavigate();
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

    const totalVehicles = vehicles.length;
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
                    iconBg="#fffbeb"
                    iconColor="#f59e0b"
                />
                <StatCard
                    title="Active / Moving"
                    value={loading ? '...' : activeVehicles.toString()}
                    subtext="Currently on trips"
                    subtextIcon={<Activity size={12} className="text-green-600" />}
                    icon={<Activity size={20} />}
                    iconBg="#dcfce7"
                    iconColor="#166534"
                />
                <StatCard
                    title="Idle"
                    value={loading ? '...' : idleVehicles.toString()}
                    subtext="At office location"
                    subtextIcon={<Clock size={12} />}
                    icon={<Clock size={20} />}
                    iconBg="#fef3c7"
                    iconColor="#d97706"
                />
                <StatCard
                    title="Maintenance"
                    value={loading ? '...' : maintenanceVehicles.toString()}
                    subtext="Scheduled services"
                    subtextIcon={<AlertCircle size={12} />}
                    icon={<Wrench size={20} />}
                    iconBg="#fee2e2"
                    iconColor="#dc2626"
                />
            </div>

            {/* Map & Alerts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[500px]">
                <div className="lg:col-span-2 h-full">
                    <LiveFleetMap />
                </div>
                <div className="lg:col-span-1 h-full">
                    <RecentAlerts />
                </div>
            </div>

            {/* ── NEW: Live Monitoring Quick-Access Widget ── */}
            <div
                onClick={() => navigate('/business/monitoring')}
                className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl border border-gray-700 p-5 cursor-pointer hover:shadow-xl hover:shadow-gray-900/30 transition-all group"
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center group-hover:bg-amber-500/30 transition-colors">
                            <Eye size={24} className="text-amber-400" />
                        </div>
                        <div>
                            <h3 className="text-white font-semibold text-lg">Live Driver Monitoring</h3>
                            <p className="text-gray-400 text-sm">
                                Real-time drowsiness detection · EAR/PERCLOS analysis · Live video feed
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1.5 text-xs text-green-400 font-medium bg-green-400/10 px-3 py-1.5 rounded-full border border-green-400/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                            LIVE
                        </span>
                        <svg className="w-5 h-5 text-gray-500 group-hover:text-gray-300 group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </div>
                </div>
            </div>

            {/* Vehicle Status Table */}
            <div className="mt-2">
                <VehicleStatusTable vehicles={vehicles} loading={loading} />
            </div>
        </div>
    );
};

export default BusinessDashboard;
