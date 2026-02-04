import React from 'react';
import { X, Building2, Truck, User, ArrowRight, MapPin, Phone, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * LocationDetailModal Component
 * Shows details of Office, Vehicle, or Driver with navigation option
 * 
 * @param {Object} props
 * @param {Object} props.data - The location data object
 * @param {string} props.type - Type: 'office', 'vehicle', or 'driver'
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

    const renderDetails = () => {
        switch (type) {
            case 'office':
                return renderOfficeDetails();
            case 'vehicle':
                return renderVehicleDetails();
            case 'driver':
                return renderDriverDetails();
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
