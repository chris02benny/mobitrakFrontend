import React from 'react';
import { X, Building2, Truck, User, ArrowRight, MapPin, Phone, Mail, Navigation, Calendar, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * LocationDetailModal Component
 * Shows details of Office, Vehicle, Driver, or Trip with navigation option
 * 
 * @param {Object} props
 * @param {Object} props.data - The location data object
 * @param {string} props.type - Type: 'office', 'vehicle', 'driver', or 'trip'
 * @param {Function} props.onClose - Function to close the modal
 */
const LocationDetailModal = ({ data, type, onClose }) => {
    const navigate = useNavigate();

    if (!data) return null;

    const getIcon = () => {
        switch (type) {
            case 'office':
                return <Building2 className="w-6 h-6 text-amber-500" />;
            case 'vehicle':
                return <Truck className="w-6 h-6 text-blue-500" />;
            case 'driver':
                return <User className="w-6 h-6 text-green-500" />;
            case 'trip':
                return <Navigation className="w-6 h-6 text-purple-500" />;
            default:
                return <MapPin className="w-6 h-6 text-gray-500" />;
        }
    };

    const getTitle = () => {
        switch (type) {
            case 'office':
                return data.companyName || 'Office Location';
            case 'vehicle':
                return data.regnNo || 'Vehicle';
            case 'driver':
                return data.fullName || 'Driver';
            case 'trip':
                return `Trip #${data._id?.slice(-6) || 'N/A'}`;
            default:
                return 'Location';
        }
    };

    const getImage = () => {
        switch (type) {
            case 'vehicle':
                return data.images?.[0]?.url || data.rcImage?.url || null;
            case 'driver':
                return data.profilePhoto?.url || data.dlImage?.url || null;
            case 'trip':
                return data.vehicleInfo?.images?.[0]?.url || data.vehicleInfo?.rcImage?.url || null;
            default:
                return null;
        }
    };

    const handleViewMore = () => {
        switch (type) {
            case 'vehicle':
                navigate(`/dashboard/vehicles/${data._id}`);
                break;
            case 'driver':
                navigate('/dashboard/drivers');
                break;
            case 'office':
                navigate('/dashboard?tab=settings');
                break;
            case 'trip':
                navigate('/dashboard/trips');
                break;
            default:
                break;
        }
        onClose();
    };

    const renderOfficeDetails = () => (
        <>
            {data.companyName && (
                <div className="mb-3">
                    <p className="text-xs text-gray-500 mb-1">Company Name</p>
                    <p className="text-sm font-medium text-gray-900">{data.companyName}</p>
                </div>
            )}
            {data.email && (
                <div className="mb-3 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <p className="text-sm text-gray-700">{data.email}</p>
                </div>
            )}
            {data.phone && (
                <div className="mb-3 flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <p className="text-sm text-gray-700">{data.phone}</p>
                </div>
            )}
            {data.officeLocation?.address && (
                <div className="mb-3">
                    <p className="text-xs text-gray-500 mb-1">Address</p>
                    <p className="text-sm text-gray-700">{data.officeLocation.address}</p>
                </div>
            )}
        </>
    );

    const renderVehicleDetails = () => (
        <>
            {data.regnNo && (
                <div className="mb-3">
                    <p className="text-xs text-gray-500 mb-1">Registration Number</p>
                    <p className="text-sm font-semibold text-gray-900">{data.regnNo}</p>
                </div>
            )}
            {data.vehicleType && (
                <div className="mb-3">
                    <p className="text-xs text-gray-500 mb-1">Vehicle Type</p>
                    <p className="text-sm text-gray-700 capitalize">{data.vehicleType}</p>
                </div>
            )}
            {data.make && data.model && (
                <div className="mb-3">
                    <p className="text-xs text-gray-500 mb-1">Make & Model</p>
                    <p className="text-sm text-gray-700">{data.make} {data.model}</p>
                </div>
            )}
            {data.year && (
                <div className="mb-3">
                    <p className="text-xs text-gray-500 mb-1">Year</p>
                    <p className="text-sm text-gray-700">{data.year}</p>
                </div>
            )}
            {data.status && (
                <div className="mb-3">
                    <p className="text-xs text-gray-500 mb-1">Status</p>
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                        data.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                        data.status === 'MAINTENANCE' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                    }`}>
                        {data.status}
                    </span>
                </div>
            )}
            {data.liveTracking && (
                <>
                    <div className="mt-4 pt-4 border-t border-gray-200">
                        <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
                            <Navigation className="w-3.5 h-3.5 text-green-500" />
                            Live Tracking
                        </p>
                    </div>
                    {data.speed !== undefined && (
                        <div className="mb-3">
                            <p className="text-xs text-gray-500 mb-1">Current Speed</p>
                            <p className="text-sm font-semibold text-gray-900">{(data.speed * 3.6).toFixed(1)} km/h</p>
                        </div>
                    )}
                    {data.course !== undefined && (
                        <div className="mb-3">
                            <p className="text-xs text-gray-500 mb-1">Course</p>
                            <p className="text-sm text-gray-700">{data.course}°</p>
                        </div>
                    )}
                    {data.altitude !== undefined && (
                        <div className="mb-3">
                            <p className="text-xs text-gray-500 mb-1">Altitude</p>
                            <p className="text-sm text-gray-700">{data.altitude} m</p>
                        </div>
                    )}
                    {data.lastUpdate && (
                        <div className="mb-3">
                            <p className="text-xs text-gray-500 mb-1">Last Update</p>
                            <p className="text-sm text-gray-700">{data.lastUpdate}</p>
                        </div>
                    )}
                    {data.attributes && Object.keys(data.attributes).length > 0 && (
                        <div className="mb-3">
                            <p className="text-xs text-gray-500 mb-1">Additional Info</p>
                            <div className="text-xs text-gray-600 space-y-1">
                                {data.attributes.batteryLevel && (
                                    <div>Battery: {data.attributes.batteryLevel}%</div>
                                )}
                                {data.attributes.ignition !== undefined && (
                                    <div>Ignition: {data.attributes.ignition ? 'On' : 'Off'}</div>
                                )}
                                {data.attributes.odometer && (
                                    <div>Odometer: {(data.attributes.odometer / 1000).toFixed(1)} km</div>
                                )}
                            </div>
                        </div>
                    )}
                </>
            )}
        </>
    );

    const renderDriverDetails = () => (
        <>
            {data.fullName && (
                <div className="mb-3">
                    <p className="text-xs text-gray-500 mb-1">Full Name</p>
                    <p className="text-sm font-medium text-gray-900">{data.fullName}</p>
                </div>
            )}
            {data.phone && (
                <div className="mb-3 flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <p className="text-sm text-gray-700">{data.phone}</p>
                </div>
            )}
            {data.email && (
                <div className="mb-3 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <p className="text-sm text-gray-700">{data.email}</p>
                </div>
            )}
            {data.dlNumber && (
                <div className="mb-3">
                    <p className="text-xs text-gray-500 mb-1">License Number</p>
                    <p className="text-sm text-gray-700">{data.dlNumber}</p>
                </div>
            )}
            {data.experience !== undefined && (
                <div className="mb-3">
                    <p className="text-xs text-gray-500 mb-1">Experience</p>
                    <p className="text-sm text-gray-700">{data.experience} years</p>
                </div>
            )}
            {data.employmentStatus && (
                <div className="mb-3">
                    <p className="text-xs text-gray-500 mb-1">Status</p>
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                        data.employmentStatus === 'EMPLOYED' ? 'bg-green-100 text-green-700' :
                        'bg-blue-100 text-blue-700'
                    }`}>
                        {data.employmentStatus}
                    </span>
                </div>
            )}
        </>
    );

    const renderTripDetails = () => (
        <>
            {data._id && (
                <div className="mb-3">
                    <p className="text-xs text-gray-500 mb-1">Trip ID</p>
                    <p className="text-sm font-mono text-gray-900">{data._id}</p>
                </div>
            )}
            {data.status && (
                <div className="mb-3">
                    <p className="text-xs text-gray-500 mb-1">Status</p>
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                        data.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                        data.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                        data.status === 'SCHEDULED' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                    }`}>
                        {data.status.replace('_', ' ')}
                    </span>
                </div>
            )}
            {data.vehicleInfo && (
                <div className="mb-3">
                    <p className="text-xs text-gray-500 mb-1">Vehicle</p>
                    <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-blue-500" />
                        <p className="text-sm font-medium text-gray-900">
                            {data.vehicleInfo.regnNo || 'N/A'}
                        </p>
                    </div>
                </div>
            )}
            {data.driverInfo && (
                <div className="mb-3">
                    <p className="text-xs text-gray-500 mb-1">Driver</p>
                    <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-green-500" />
                        <p className="text-sm font-medium text-gray-900">
                            {data.driverInfo.fullName || 'N/A'}
                        </p>
                    </div>
                </div>
            )}
            {data.tripType && (
                <div className="mb-3">
                    <p className="text-xs text-gray-500 mb-1">Trip Type</p>
                    <p className="text-sm text-gray-700 capitalize">{data.tripType.replace('_', ' ')}</p>
                </div>
            )}
            {data.startLocation?.address && (
                <div className="mb-3">
                    <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> Start Location
                    </p>
                    <p className="text-sm text-gray-700">{data.startLocation.address}</p>
                </div>
            )}
            {data.endLocation?.address && (
                <div className="mb-3">
                    <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> End Location
                    </p>
                    <p className="text-sm text-gray-700">{data.endLocation.address}</p>
                </div>
            )}
            {data.estimatedDistance && (
                <div className="mb-3">
                    <p className="text-xs text-gray-500 mb-1">Estimated Distance</p>
                    <p className="text-sm text-gray-700">{(data.estimatedDistance / 1000).toFixed(2)} km</p>
                </div>
            )}
            {data.lastUpdate && (
                <div className="mb-3">
                    <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Last Update
                    </p>
                    <p className="text-sm text-gray-700">
                        {new Date(data.lastUpdate).toLocaleString()}
                    </p>
                </div>
            )}
        </>
    );

    const renderDetails = () => {
        switch (type) {
            case 'office':
                return renderOfficeDetails();
            case 'vehicle':
                return renderVehicleDetails();
            case 'driver':
                return renderDriverDetails();
            case 'trip':
                return renderTripDetails();
            default:
                return null;
        }
    };

    const image = getImage();

    return (
        <>
            {/* Backdrop */}
            <div 
                className="fixed inset-0 bg-black bg-opacity-20 z-40"
                onClick={onClose}
            />
            
            {/* Modal */}
            <div className="fixed right-0 top-0 h-full w-full sm:w-96 bg-white shadow-2xl z-50 overflow-y-auto animate-slide-in-right">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between z-10">
                    <div className="flex items-center gap-3">
                        {getIcon()}
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">{getTitle()}</h2>
                            <p className="text-xs text-gray-500 capitalize">{type} Details</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        aria-label="Close"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Image */}
                {image && (
                    <div className="px-4 pt-4">
                        <div className="relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden">
                            <img
                                src={image}
                                alt={getTitle()}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                }}
                            />
                        </div>
                    </div>
                )}

                {/* Details */}
                <div className="px-4 py-4">
                    {renderDetails()}
                </div>

                {/* Footer - View More Button */}
                <div className="sticky bottom-0 bg-white border-t border-gray-200 px-4 py-4">
                    <button
                        onClick={handleViewMore}
                        className="w-full bg-amber-500 text-white px-4 py-3 rounded-lg hover:bg-amber-600 transition-colors font-medium flex items-center justify-center gap-2"
                    >
                        View More Details
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <style jsx>{`
                @keyframes slide-in-right {
                    from {
                        transform: translateX(100%);
                    }
                    to {
                        transform: translateX(0);
                    }
                }
                .animate-slide-in-right {
                    animation: slide-in-right 0.3s ease-out;
                }
            `}</style>
        </>
    );
};

export default LocationDetailModal;
