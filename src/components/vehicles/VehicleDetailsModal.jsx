import React from 'react';
import { X, Calendar, Hash, User, MapPin, Fuel, Palette, Factory, Users, Shield, Box, FileText } from 'lucide-react';

const VehicleDetailsModal = ({ vehicle, onClose }) => {
    if (!vehicle) return null;

    const DetailItem = ({ icon: Icon, label, value }) => (
        <div className="flex items-start gap-3 py-2">
            <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <Icon size={18} className="text-gray-600" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-500 uppercase mb-0.5">{label}</p>
                <p className="text-sm text-gray-900 break-words">{value || 'N/A'}</p>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="relative max-w-4xl w-full max-h-[90vh] bg-white rounded-xl overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-amber-50 to-white">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">{vehicle.regnNo || vehicle.extractedData?.regnNo || 'Vehicle Details'}</h2>
                        <p className="text-sm text-gray-500 mt-1">{vehicle.makersName} - {vehicle.vehicleClass}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
                    <div className="space-y-6">
                        {/* RC Book Image */}
                        {vehicle.rcBookImage && (
                            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                <div className="flex items-center gap-2 mb-3">
                                    <FileText size={18} className="text-primary" />
                                    <h3 className="font-semibold text-gray-900">RC Book</h3>
                                </div>
                                <img
                                    src={vehicle.rcBookImage}
                                    alt="RC Book"
                                    className="w-full max-w-md rounded-lg border border-gray-300 shadow-sm"
                                />
                            </div>
                        )}

                        {/* Vehicle Images */}
                        {vehicle.images && vehicle.images.length > 0 && (
                            <div>
                                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                    <Box size={18} className="text-primary" />
                                    Vehicle Images
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {vehicle.images.map((img, index) => (
                                        <img
                                            key={index}
                                            src={img}
                                            alt={`Vehicle ${index + 1}`}
                                            className="w-full aspect-square object-cover rounded-lg border border-gray-200 shadow-sm"
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Registration Details */}
                        <div>
                            <h3 className="font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">Registration Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                                <DetailItem icon={Hash} label="Registration No" value={vehicle.regnNo || vehicle.extractedData?.regnNo} />
                                <DetailItem icon={Calendar} label="Date of Registration" value={vehicle.dateOfRegn} />
                                <DetailItem icon={Hash} label="Chassis No" value={vehicle.chassisNo} />
                                <DetailItem icon={Hash} label="Engine No" value={vehicle.engineNo} />
                                <DetailItem icon={Shield} label="Vehicle Class" value={vehicle.vehicleClass} />
                                <DetailItem icon={Calendar} label="Date of Effect" value={vehicle.dateOfEffect} />
                            </div>
                        </div>

                        {/* Owner Details */}
                        <div>
                            <h3 className="font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">Owner Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                                <DetailItem icon={User} label="Owner Name" value={vehicle.ownerName} />
                                <DetailItem icon={Factory} label="Maker's Name" value={vehicle.makersName} />
                                <div className="md:col-span-2">
                                    <DetailItem icon={MapPin} label="Address" value={vehicle.address} />
                                </div>
                            </div>
                        </div>

                        {/* Vehicle Specifications */}
                        <div>
                            <h3 className="font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">Specifications</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6">
                                <DetailItem icon={Fuel} label="Fuel Used" value={vehicle.fuelUsed} />
                                <DetailItem icon={Palette} label="Colour" value={
                                    <div className="flex items-center gap-2">
                                        {vehicle.colour && (
                                            <div
                                                className="w-4 h-4 rounded-full border border-gray-300"
                                                style={{ backgroundColor: vehicle.colour.toLowerCase() }}
                                            ></div>
                                        )}
                                        <span>{vehicle.colour}</span>
                                    </div>
                                } />
                                <DetailItem icon={Calendar} label="Mfg Date" value={vehicle.monthYearOfMfg} />
                                <DetailItem icon={Users} label="Seating Capacity" value={vehicle.seatingCapacity} />
                                <DetailItem icon={Shield} label="Tax Upto" value={vehicle.taxUpto} />
                                <DetailItem icon={Box} label="Body Type" value={vehicle.bodyType} />
                            </div>
                        </div>

                        {/* Description */}
                        {vehicle.description && (
                            <div>
                                <h3 className="font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">Description</h3>
                                <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-lg border border-gray-200">
                                    {vehicle.description}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 bg-gray-800 text-white rounded-lg hover:bg-gray-700 font-medium transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default VehicleDetailsModal;
