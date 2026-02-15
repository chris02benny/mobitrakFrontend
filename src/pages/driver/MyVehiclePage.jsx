import React, { useState, useEffect } from 'react';
import { vehicleService } from '../../services/vehicleService';
import { 
    FaTruck, 
    FaCalendar, 
    FaCogs, 
    FaPalette, 
    FaIdCard,
    FaGasPump,
    FaChair,
    FaFileAlt,
    FaImages,
    FaTimes,
    FaChevronLeft,
    FaChevronRight,
    FaDownload,
    FaExpand,
    FaRoute,
    FaMapMarkerAlt,
    FaClock,
    FaCheckCircle,
    FaTimesCircle,
    FaSpinner,
    FaHourglassHalf
} from 'react-icons/fa';

const MyVehiclePage = () => {
    const [vehicleData, setVehicleData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedDocument, setSelectedDocument] = useState(null);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    useEffect(() => {
        fetchVehicleData();
    }, []);

    const fetchVehicleData = async () => {
        try {
            setLoading(true);
            const data = await vehicleService.getMyAssignedVehicle();
            setVehicleData(data);
            setError(null);
        } catch (err) {
            console.error('Error fetching vehicle:', err);
            setError(err.message || 'Failed to load vehicle details');
        } finally {
            setLoading(false);
        }
    };

    const openDocument = (type, url, index = 0) => {
        setSelectedDocument({ type, url, index });
        setCurrentImageIndex(index);
    };

    const closeDocument = () => {
        setSelectedDocument(null);
        setCurrentImageIndex(0);
    };

    const navigateImage = (direction) => {
        if (!vehicleData?.vehicle?.images) return;
        const totalImages = vehicleData.vehicle.images.length;
        if (direction === 'next') {
            setCurrentImageIndex((prev) => (prev + 1) % totalImages);
        } else {
            setCurrentImageIndex((prev) => (prev - 1 + totalImages) % totalImages);
        }
    };

    const downloadDocument = (url, filename) => {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[600px] bg-white rounded-xl border border-gray-200">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                    <p className="text-gray-500">Loading vehicle details...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-[600px] bg-white rounded-xl border border-gray-200">
                <div className="text-center">
                    <div className="bg-red-100 text-red-600 p-4 rounded-lg max-w-md">
                        <p className="font-medium mb-2">Error Loading Vehicle</p>
                        <p className="text-sm">{error}</p>
                        <button
                            onClick={fetchVehicleData}
                            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                        >
                            Retry
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!vehicleData || !vehicleData.vehicle) {
        return (
            <div className="flex items-center justify-center h-[600px] bg-white rounded-xl border border-gray-200">
                <div className="text-center">
                    <FaTruck className="text-6xl text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-400 font-medium text-lg">No Vehicle Assigned</p>
                    <p className="text-gray-500 text-sm mt-2">
                        You don't have a vehicle assigned to you yet.
                    </p>
                </div>
            </div>
        );
    }

    const { vehicle, assignment, employment, trips = [], tripStats = {} } = vehicleData;

    const getStatusColor = (status) => {
        switch (status) {
            case 'scheduled': return 'bg-blue-100 text-blue-700';
            case 'in-progress': return 'bg-yellow-100 text-yellow-700';
            case 'completed': return 'bg-green-100 text-green-700';
            case 'cancelled': return 'bg-red-100 text-red-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'scheduled': return <FaClock />;
            case 'in-progress': return <FaSpinner className="animate-spin" />;
            case 'completed': return <FaCheckCircle />;
            case 'cancelled': return <FaTimesCircle />;
            default: return <FaHourglassHalf />;
        }
    };

    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-6 text-white shadow-lg">
                <div className="flex items-center gap-4">
                    <div className="bg-white/20 p-4 rounded-lg">
                        <FaTruck className="text-4xl" />
                    </div>
                    <div className="flex-1">
                        <h1 className="text-3xl font-bold mb-1">
                            {vehicle.make || 'Unknown'} {vehicle.model || 'Model'}
                        </h1>
                        <p className="text-indigo-100 text-lg font-medium">
                            {vehicle.regnNo || vehicle.registrationNumber || 'N/A'}
                        </p>
                    </div>
                    <div className="text-right">
                        <div className="bg-white/20 px-4 py-2 rounded-lg inline-block">
                            <span className="text-sm font-medium">Status</span>
                            <p className="text-xl font-bold">
                                {vehicle.status === 'ASSIGNED' ? '🚗 Assigned' : '🅿️ Idle'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Vehicle Details - Main Column */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Basic Information */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                        <div className="border-b border-gray-200 px-6 py-4">
                            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <FaIdCard className="text-indigo-600" />
                                Vehicle Information
                            </h2>
                        </div>
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InfoItem label="Vehicle Class" value={vehicle.vehicleClass} />
                            <InfoItem label="Vehicle Type" value={vehicle.vehicleType} />
                            <InfoItem label="Body Type" value={vehicle.bodyType} />
                            <InfoItem label="Colour" value={vehicle.colour} icon={<FaPalette />} />
                            <InfoItem label="Fuel Type" value={vehicle.fuelUsed} icon={<FaGasPump />} />
                            <InfoItem label="Seating Capacity" value={vehicle.seatingCapacity} icon={<FaChair />} />
                            <InfoItem label="Chassis Number" value={vehicle.chassisNo} />
                            <InfoItem label="Engine Number" value={vehicle.engineNo} />
                        </div>
                    </div>

                    {/* Registration Details */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                        <div className="border-b border-gray-200 px-6 py-4">
                            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <FaCalendar className="text-indigo-600" />
                                Registration Details
                            </h2>
                        </div>
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InfoItem 
                                label="Date of Registration" 
                                value={vehicle.dateOfRegn ? new Date(vehicle.dateOfRegn).toLocaleDateString() : 'N/A'} 
                            />
                            <InfoItem 
                                label="Registration Validity" 
                                value={vehicle.regnValidity ? new Date(vehicle.regnValidity).toLocaleDateString() : 'N/A'} 
                            />
                            <InfoItem 
                                label="Tax Valid Upto" 
                                value={vehicle.taxUpto ? new Date(vehicle.taxUpto).toLocaleDateString() : 'N/A'} 
                            />
                            <InfoItem 
                                label="Date of Effect" 
                                value={vehicle.dateOfEffect ? new Date(vehicle.dateOfEffect).toLocaleDateString() : 'N/A'} 
                            />
                            <InfoItem 
                                label="Month/Year of Manufacturing" 
                                value={vehicle.monthYearOfMfg} 
                            />
                            <InfoItem label="Maker's Name" value={vehicle.makersName} />
                        </div>
                    </div>

                    {/* Owner Details */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                        <div className="border-b border-gray-200 px-6 py-4">
                            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <FaCogs className="text-indigo-600" />
                                Owner Information
                            </h2>
                        </div>
                        <div className="p-6 space-y-3">
                            <InfoItem label="Owner Name" value={vehicle.ownerName} />
                            <InfoItem 
                                label="Address" 
                                value={vehicle.address} 
                                fullWidth 
                            />
                            {vehicle.description && (
                                <InfoItem 
                                    label="Description" 
                                    value={vehicle.description} 
                                    fullWidth 
                                />
                            )}
                        </div>
                    </div>
                </div>

                {/* Documents & Assignment - Sidebar */}
                <div className="space-y-6">
                    {/* Trip Statistics */}
                    {tripStats.total > 0 && (
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                            <div className="border-b border-gray-200 px-6 py-4">
                                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                    <FaRoute className="text-indigo-600" />
                                    Trip Statistics
                                </h2>
                            </div>
                            <div className="p-6 grid grid-cols-2 gap-4">
                                <StatCard label="Total Trips" value={tripStats.total} color="bg-indigo-100 text-indigo-700" />
                                <StatCard label="Scheduled" value={tripStats.scheduled} color="bg-blue-100 text-blue-700" />
                                <StatCard label="In Progress" value={tripStats.inProgress} color="bg-yellow-100 text-yellow-700" />
                                <StatCard label="Completed" value={tripStats.completed} color="bg-green-100 text-green-700" />
                            </div>
                        </div>
                    )}

                    {/* Assignment Info */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                        <div className="border-b border-gray-200 px-6 py-4">
                            <h2 className="text-lg font-bold text-gray-900">Assignment Details</h2>
                        </div>
                        <div className="p-6 space-y-3">
                            <div>
                                <p className="text-sm text-gray-500 mb-1">Assigned On</p>
                                <p className="text-gray-900 font-medium">
                                    {assignment?.assignedOn 
                                        ? new Date(assignment.assignedOn).toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        })
                                        : 'N/A'}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 mb-1">Position</p>
                                <p className="text-gray-900 font-medium">{employment?.position || 'Driver'}</p>
                            </div>
                            {assignment?.notes && (
                                <div>
                                    <p className="text-sm text-gray-500 mb-1">Notes</p>
                                    <p className="text-gray-700 text-sm bg-gray-50 p-3 rounded-lg">
                                        {assignment.notes}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Documents Section */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                        <div className="border-b border-gray-200 px-6 py-4">
                            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <FaFileAlt className="text-indigo-600" />
                                Documents
                            </h2>
                        </div>
                        <div className="p-6 space-y-3">
                            {/* RC Book */}
                            {vehicle.rcBookImage && (
                                <DocumentCard
                                    title="RC Book"
                                    icon={<FaFileAlt />}
                                    onClick={() => openDocument('image', vehicle.rcBookImage)}
                                />
                            )}

                            {/* Vehicle Images */}
                            {vehicle.images && vehicle.images.length > 0 && (
                                <DocumentCard
                                    title={`Vehicle Images (${vehicle.images.length})`}
                                    icon={<FaImages />}
                                    onClick={() => openDocument('gallery', vehicle.images)}
                                />
                            )}

                            {!vehicle.rcBookImage && (!vehicle.images || vehicle.images.length === 0) && (
                                <p className="text-gray-400 text-sm text-center py-4">
                                    No documents available
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Trips Section */}
            {trips && trips.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                    <div className="border-b border-gray-200 px-6 py-4">
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <FaRoute className="text-indigo-600" />
                            Recent Trips with This Vehicle
                        </h2>
                    </div>
                    <div className="p-6">
                        <div className="space-y-4">
                            {trips.slice(0, 5).map((trip, index) => (
                                <TripCard key={trip._id || index} trip={trip} getStatusColor={getStatusColor} getStatusIcon={getStatusIcon} />
                            ))}
                        </div>
                        {trips.length > 5 && (
                            <p className="text-center text-gray-500 text-sm mt-4">
                                Showing 5 of {trips.length} trips
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Document Viewer Modal */}
            {selectedDocument && (
                <DocumentModal
                    document={selectedDocument}
                    vehicleData={vehicleData}
                    currentImageIndex={currentImageIndex}
                    onClose={closeDocument}
                    onNavigate={navigateImage}
                    onDownload={downloadDocument}
                />
            )}
        </div>
    );
};

// Info Item Component
const InfoItem = ({ label, value, icon, fullWidth = false }) => (
    <div className={fullWidth ? 'col-span-full' : ''}>
        <p className="text-sm text-gray-500 mb-1 flex items-center gap-2">
            {icon}
            {label}
        </p>
        <p className="text-gray-900 font-medium break-words">
            {value || 'N/A'}
        </p>
    </div>
);

// Stat Card Component
const StatCard = ({ label, value, color }) => (
    <div className="text-center">
        <div className={`${color} rounded-lg p-3 mb-2`}>
            <p className="text-2xl font-bold">{value}</p>
        </div>
        <p className="text-xs text-gray-600">{label}</p>
    </div>
);

// Trip Card Component
const TripCard = ({ trip, getStatusColor, getStatusIcon }) => {
    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor(trip.status)}`}>
                            {getStatusIcon(trip.status)}
                            {trip.status}
                        </span>
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                            {trip.tripType}
                        </span>
                    </div>
                </div>
            </div>

            <div className="space-y-2">
                {/* Start Destination */}
                <div className="flex items-start gap-2">
                    <FaMapMarkerAlt className="text-green-600 mt-1 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-500">From</p>
                        <p className="text-sm font-medium text-gray-900 truncate">
                            {trip.startDestination?.name || 'Unknown'}
                        </p>
                        {trip.startDestination?.address && (
                            <p className="text-xs text-gray-500 truncate">{trip.startDestination.address}</p>
                        )}
                    </div>
                </div>

                {/* End Destination */}
                <div className="flex items-start gap-2">
                    <FaMapMarkerAlt className="text-red-600 mt-1 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-500">To</p>
                        <p className="text-sm font-medium text-gray-900 truncate">
                            {trip.endDestination?.name || 'Unknown'}
                        </p>
                        {trip.endDestination?.address && (
                            <p className="text-xs text-gray-500 truncate">{trip.endDestination.address}</p>
                        )}
                    </div>
                </div>

                {/* Date & Time */}
                <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                    <FaClock className="text-gray-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-600">
                            {formatDate(trip.startDateTime)}
                        </p>
                    </div>
                </div>

                {/* Customer Info */}
                {trip.customerName && (
                    <div className="pt-2 border-t border-gray-100">
                        <p className="text-xs text-gray-500">Customer</p>
                        <p className="text-sm font-medium text-gray-900">{trip.customerName}</p>
                        {trip.customerContact && (
                            <p className="text-xs text-gray-500">{trip.customerContact}</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

// Document Card Component
const DocumentCard = ({ title, icon, onClick }) => (
    <button
        onClick={onClick}
        className="w-full flex items-center gap-3 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 hover:from-indigo-100 hover:to-purple-100 rounded-lg transition border border-indigo-200 hover:border-indigo-300 group"
    >
        <div className="text-2xl text-indigo-600 group-hover:scale-110 transition-transform">
            {icon}
        </div>
        <div className="flex-1 text-left">
            <p className="font-medium text-gray-900">{title}</p>
            <p className="text-xs text-gray-500">Click to view</p>
        </div>
        <FaExpand className="text-indigo-400 group-hover:text-indigo-600" />
    </button>
);

// Document Modal Component
const DocumentModal = ({ document, vehicleData, currentImageIndex, onClose, onNavigate, onDownload }) => {
    const isGallery = document.type === 'gallery';
    const images = isGallery ? document.url : [document.url];
    const currentImage = images[currentImageIndex];

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
            <div className="relative max-w-6xl w-full bg-white rounded-xl shadow-2xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <h3 className="text-xl font-bold text-gray-900">
                        {isGallery ? `Vehicle Images (${currentImageIndex + 1}/${images.length})` : 'RC Book'}
                    </h3>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => onDownload(
                                currentImage,
                                `${vehicleData.vehicle.regnNo || 'vehicle'}-${isGallery ? `image-${currentImageIndex + 1}` : 'rc-book'}.jpg`
                            )}
                            className="p-2 hover:bg-gray-100 rounded-lg transition"
                            title="Download"
                        >
                            <FaDownload className="text-gray-600" />
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 rounded-lg transition"
                        >
                            <FaTimes className="text-gray-600 text-xl" />
                        </button>
                    </div>
                </div>

                {/* Image Viewer */}
                <div className="flex-1 overflow-hidden relative bg-gray-900">
                    <img
                        src={currentImage}
                        alt={isGallery ? `Vehicle image ${currentImageIndex + 1}` : 'RC Book'}
                        className="w-full h-full object-contain"
                    />

                    {/* Navigation Buttons (only for gallery) */}
                    {isGallery && images.length > 1 && (
                        <>
                            <button
                                onClick={() => onNavigate('prev')}
                                className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-3 rounded-full shadow-lg transition"
                            >
                                <FaChevronLeft className="text-gray-900" />
                            </button>
                            <button
                                onClick={() => onNavigate('next')}
                                className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-3 rounded-full shadow-lg transition"
                            >
                                <FaChevronRight className="text-gray-900" />
                            </button>
                        </>
                    )}
                </div>

                {/* Thumbnail Strip (only for gallery) */}
                {isGallery && images.length > 1 && (
                    <div className="p-4 border-t border-gray-200 bg-gray-50">
                        <div className="flex gap-2 overflow-x-auto">
                            {images.map((img, index) => (
                                <button
                                    key={index}
                                    onClick={() => onNavigate(index > currentImageIndex ? 'next' : 'prev')}
                                    className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition ${
                                        index === currentImageIndex
                                            ? 'border-indigo-600'
                                            : 'border-gray-300 hover:border-gray-400'
                                    }`}
                                >
                                    <img
                                        src={img}
                                        alt={`Thumbnail ${index + 1}`}
                                        className="w-full h-full object-cover"
                                    />
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MyVehiclePage;
