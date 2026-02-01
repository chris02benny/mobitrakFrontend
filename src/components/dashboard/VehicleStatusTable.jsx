import React from 'react';
import { Truck, Car } from 'lucide-react';

const VehicleStatusTable = ({ vehicles = [], loading = false }) => {
    // Show only first 5 vehicles for the overview
    const displayVehicles = vehicles.slice(0, 5);

    return (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col">
            <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
                <span className="font-semibold text-gray-900">Vehicle Status Overview</span>
                <div className="flex gap-2">
                    <button className="px-3 py-1.5 border border-gray-200 rounded text-xs font-medium hover:bg-gray-50 transition-colors">
                        Filter
                    </button>
                    <button className="px-3 py-1.5 border border-gray-200 rounded text-xs font-medium hover:bg-gray-50 transition-colors">
                        Export
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-[2fr_1.5fr_1.5fr_1fr_1fr] px-6 py-3 bg-slate-50 border-b border-gray-200 text-[13px] font-semibold text-muted-foreground">
                <div>Vehicle</div>
                <div>Registration</div>
                <div>Status</div>
                <div>Type</div>
                <div>Added</div>
            </div>

            {loading ? (
                <div className="px-6 py-12 text-center text-gray-500">
                    Loading vehicles...
                </div>
            ) : displayVehicles.length === 0 ? (
                <div className="px-6 py-12 text-center text-gray-500">
                    No vehicles added yet. Add your first vehicle to get started.
                </div>
            ) : (
                displayVehicles.map((vehicle, index) => (
                    <div
                        key={vehicle._id}
                        className={`grid grid-cols-[2fr_1.5fr_1.5fr_1fr_1fr] px-6 py-4 items-center text-sm hover:bg-slate-50 transition-colors ${index < displayVehicles.length - 1 ? 'border-b border-gray-200' : ''
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-slate-100 rounded-md flex items-center justify-center">
                                <Truck size={16} className="text-muted-foreground" />
                            </div>
                            <div className="flex flex-col">
                                <span className="font-medium text-gray-900">
                                    {vehicle.make || 'Unknown'} {vehicle.model || ''}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    {vehicle.vehicleClass || 'Vehicle'}
                                </span>
                            </div>
                        </div>
                        <div className="text-gray-700 font-medium">
                            {vehicle.regnNo || 'N/A'}
                        </div>
                        <div>
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                Idle
                            </span>
                        </div>
                        <div className="text-gray-700 text-xs">
                            {vehicle.fuelType || 'N/A'}
                        </div>
                        <span className="text-[13px] text-muted-foreground">
                            {vehicle.createdAt ? new Date(vehicle.createdAt).toLocaleDateString() : 'N/A'}
                        </span>
                    </div>
                ))
            )}

        </div>
    );
};

export default VehicleStatusTable;
