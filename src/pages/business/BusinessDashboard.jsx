import React, { useState, useEffect } from 'react';
import { Truck, Activity, Clock, AlertCircle, ArrowUp, Wrench } from 'lucide-react';
import StatCard from '../../components/dashboard/StatCard';
import LiveFleetMap from '../../components/dashboard/LiveFleetMap';
import RecentAlerts from '../../components/dashboard/RecentAlerts';
import VehicleStatusTable from '../../components/dashboard/VehicleStatusTable';
import { vehicleService } from '../../services/vehicleService';

const BusinessDashboard = () => {
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

            {/* Vehicle Status Table */}
            <div className="mt-2">
                <VehicleStatusTable vehicles={vehicles} loading={loading} />
            </div>
        </div>
    );
};

export default BusinessDashboard;
