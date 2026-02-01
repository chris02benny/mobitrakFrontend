import React, { useEffect, useState } from 'react';
import { vehicleService } from '../../services/vehicleService';
import AddVehicle from './AddVehicle';
import { Plus } from 'lucide-react';

const VehicleList = () => {
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showAddForm, setShowAddForm] = useState(false);

    const fetchVehicles = async () => {
        try {
            setLoading(true);
            const data = await vehicleService.getVehicles();
            setVehicles(Array.isArray(data) ? data : []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVehicles();
    }, []);

    const handleVehicleAdded = (newVehicle) => {
        setVehicles(prev => [...prev, newVehicle]);
        setShowAddForm(false);
    };

    if (showAddForm) {
        return <AddVehicle onCancel={() => setShowAddForm(false)} onSuccess={handleVehicleAdded} />;
    }

    if (loading) return <div className="text-center p-12 text-gray-500">Loading vehicles...</div>;
    if (error) return <div className="text-center p-12 text-red-500 bg-red-50 rounded-lg border border-red-100">Error: {error}</div>;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Vehicles</h2>
                    <p className="text-sm text-gray-500 mt-1">Manage your fleet vehicles</p>
                </div>
                <button
                    onClick={() => setShowAddForm(true)}
                    className="flex items-center gap-2 bg-primary text-secondary px-4 py-2 rounded-lg hover:bg-amber-400 font-medium transition-colors shadow-sm"
                >
                    <Plus size={18} />
                    Add Vehicle
                </button>
            </div>

            {vehicles.length === 0 ? (
                <div className="text-center py-16">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Plus className="text-gray-400 w-8 h-8" />
                    </div>
                    <p className="text-gray-900 font-medium mb-1">No vehicles found</p>
                    <p className="text-gray-500 text-sm mb-6">Get started by adding your first vehicle to the fleet.</p>
                    <button
                        onClick={() => setShowAddForm(true)}
                        className="text-primary hover:text-amber-600 font-medium"
                    >
                        Add Vehicle
                    </button>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-gray-50/50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Image</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Reg. No</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Make/Model</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Color</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                            {vehicles.map((vehicle, index) => (
                                <tr key={vehicle._id || index} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {vehicle.rcBookImage ? (
                                            <img
                                                src={vehicle.rcBookImage}
                                                alt="Vehicle"
                                                className="h-10 w-16 object-cover rounded-md border border-gray-200"
                                            />
                                        ) : (
                                            <div className="h-10 w-16 bg-gray-100 rounded-md border border-gray-200 flex items-center justify-center text-xs text-gray-400">No Img</div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {vehicle.regnNo || vehicle.extractedData?.regnNo || 'N/A'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                        {vehicle.makersName}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                            {vehicle.vehicleClass}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="w-3 h-3 rounded-full border border-gray-200"
                                                style={{ backgroundColor: vehicle.colour && vehicle.colour.toLowerCase() }}
                                            ></div>
                                            {vehicle.colour}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                            Active
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default VehicleList;
