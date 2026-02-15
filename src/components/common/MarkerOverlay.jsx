import React from 'react';
import { X, MapPin, Truck, User, Navigation, Building2, Phone, Mail, Calendar, Clock } from 'lucide-react';

const MarkerOverlay = ({ marker, onClose }) => {
    if (!marker) return null;

    const renderContent = () => {
        switch (marker.type) {
            case 'office':
                return (
                    <>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                                <Building2 className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">{marker.data.name}</h3>
                                <p className="text-sm text-gray-600">{marker.data.type || 'Office Location'}</p>
                            </div>
                        </div>
                        {marker.data.image && (
                            <img 
                                src={marker.data.image} 
                                alt={marker.data.name}
                                className="w-full h-32 object-cover rounded-lg mb-3"
                            />
                        )}
                        <div className="space-y-2">
                            <div className="flex items-start gap-2">
                                <MapPin className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                                <p className="text-sm text-gray-700">{marker.data.address}</p>
                            </div>
                            {marker.data.phone && (
                                <div className="flex items-center gap-2">
                                    <Phone className="w-4 h-4 text-amber-600 flex-shrink-0" />
                                    <p className="text-sm text-gray-700">{marker.data.phone}</p>
                                </div>
                            )}
                            {marker.data.email && (
                                <div className="flex items-center gap-2">
                                    <Mail className="w-4 h-4 text-amber-600 flex-shrink-0" />
                                    <p className="text-sm text-gray-700">{marker.data.email}</p>
                                </div>
                            )}
                        </div>
                    </>
                );

            case 'vehicle':
                return (
                    <>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
                                <Truck className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">{marker.data.regnNo || marker.data.registrationNumber}</h3>
                                <p className="text-sm text-gray-600">{marker.data.vehicleType}</p>
                            </div>
                        </div>
                        {marker.data.vehicleImage && (
                            <img 
                                src={marker.data.vehicleImage} 
                                alt={marker.data.regnNo || marker.data.registrationNumber}
                                className="w-full h-32 object-cover rounded-lg mb-3"
                            />
                        )}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <div className="text-xs font-semibold text-gray-500">Status:</div>
                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                    marker.data.status === 'ACTIVE' 
                                        ? 'bg-green-100 text-green-800'
                                        : marker.data.status === 'MAINTENANCE'
                                        ? 'bg-yellow-100 text-yellow-800'
                                        : 'bg-gray-100 text-gray-800'
                                }`}>
                                    {marker.data.status}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="text-xs font-semibold text-gray-500">Make/Model:</div>
                                <div className="text-sm text-gray-700">{marker.data.make} {marker.data.model}</div>
                            </div>
                            {marker.data.seatingCapacity && (
                                <div className="flex items-center gap-2">
                                    <div className="text-xs font-semibold text-gray-500">Capacity:</div>
                                    <div className="text-sm text-gray-700">{marker.data.seatingCapacity} seats</div>
                                </div>
                            )}
                        </div>
                    </>
                );

            case 'driver':
                return (
                    <>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg overflow-hidden">
                                {marker.data.profilePicture ? (
                                    <img 
                                        src={marker.data.profilePicture} 
                                        alt={marker.data.fullName}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <User className="w-8 h-8 text-white" />
                                )}
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">{marker.data.fullName}</h3>
                                <p className="text-sm text-gray-600">Driver</p>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <div className="text-xs font-semibold text-gray-500">Status:</div>
                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                    marker.data.status === 'AVAILABLE' 
                                        ? 'bg-green-100 text-green-800'
                                        : marker.data.status === 'ON_TRIP'
                                        ? 'bg-blue-100 text-blue-800'
                                        : 'bg-gray-100 text-gray-800'
                                }`}>
                                    {marker.data.status?.replace('_', ' ')}
                                </span>
                            </div>
                            {marker.data.phone && (
                                <div className="flex items-center gap-2">
                                    <Phone className="w-4 h-4 text-green-600 flex-shrink-0" />
                                    <p className="text-sm text-gray-700">{marker.data.phone}</p>
                                </div>
                            )}
                            {marker.data.email && (
                                <div className="flex items-center gap-2">
                                    <Mail className="w-4 h-4 text-green-600 flex-shrink-0" />
                                    <p className="text-sm text-gray-700">{marker.data.email}</p>
                                </div>
                            )}
                            {marker.data.dlNumber && (
                                <div className="flex items-center gap-2">
                                    <div className="text-xs font-semibold text-gray-500">License:</div>
                                    <div className="text-sm text-gray-700">{marker.data.dlNumber}</div>
                                </div>
                            )}
                            {marker.data.experience !== undefined && (
                                <div className="flex items-center gap-2">
                                    <div className="text-xs font-semibold text-gray-500">Experience:</div>
                                    <div className="text-sm text-gray-700">{marker.data.experience} years</div>
                                </div>
                            )}
                        </div>
                    </>
                );

            case 'trip':
                return (
                    <>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-purple-800 rounded-xl flex items-center justify-center shadow-lg">
                                <Navigation className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Trip #{marker.data.tripId?.slice(-6) || marker.data._id?.slice(-6) || 'N/A'}</h3>
                                <p className="text-sm text-gray-600">{marker.data.status}</p>
                            </div>
                        </div>
                        {(marker.data.vehicleImage || marker.data.vehicleInfo?.vehicleImage) && (
                            <img 
                                src={marker.data.vehicleImage || marker.data.vehicleInfo?.vehicleImage} 
                                alt="Trip Vehicle"
                                className="w-full h-32 object-cover rounded-lg mb-3"
                            />
                        )}
                        <div className="space-y-2">
                            <div className="flex items-start gap-2">
                                <MapPin className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                    <div className="text-xs font-semibold text-gray-500">From:</div>
                                    <p className="text-sm text-gray-700">{marker.data.origin?.address || 'N/A'}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2">
                                <MapPin className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                    <div className="text-xs font-semibold text-gray-500">To:</div>
                                    <p className="text-sm text-gray-700">{marker.data.destination?.address || 'N/A'}</p>
                                </div>
                            </div>
                            {marker.data.driverName && (
                                <div className="flex items-center gap-2">
                                    <User className="w-4 h-4 text-purple-600 flex-shrink-0" />
                                    <p className="text-sm text-gray-700">Driver: {marker.data.driverName}</p>
                                </div>
                            )}
                            {marker.data.vehicleNumber && (
                                <div className="flex items-center gap-2">
                                    <Truck className="w-4 h-4 text-purple-600 flex-shrink-0" />
                                    <p className="text-sm text-gray-700">Vehicle: {marker.data.vehicleNumber}</p>
                                </div>
                            )}
                            {marker.data.scheduledTime && (
                                <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-purple-600 flex-shrink-0" />
                                    <p className="text-sm text-gray-700">{new Date(marker.data.scheduledTime).toLocaleString()}</p>
                                </div>
                            )}
                        </div>
                    </>
                );

            default:
                return null;
        }
    };

    return (
        <div 
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-[9999]"
            style={{
                width: '320px',
                marginTop: '-60px'  // Offset to appear above the marker
            }}
        >
            <div className="pointer-events-auto bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200 p-6 relative animate-scale-in">
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                >
                    <X className="w-5 h-5 text-gray-600" />
                </button>

                {/* Content */}
                {renderContent()}

                {/* Arrow pointing down to marker */}
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-white/95 backdrop-blur-xl border-r border-b border-gray-200 rotate-45"></div>
            </div>

            <style jsx>{`
                @keyframes scale-in {
                    from {
                        opacity: 0;
                        transform: scale(0.8);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1);
                    }
                }
                .animate-scale-in {
                    animation: scale-in 0.2s ease-out;
                }
            `}</style>
        </div>
    );
};

export default MarkerOverlay;
