import React, { useState, useEffect } from 'react';
import { Calendar, MapPin, Truck, Clock, IndianRupee, Eye, Edit2, Trash2, Navigation, CheckCircle } from 'lucide-react';
import { tripService } from '../../services/tripService';
import { vehicleService } from '../../services/vehicleService';
import { hiringService } from '../../services/hiringService';
import EditTripModal from './EditTripModal';
import ConfirmationModal from '../common/ConfirmationModal';
import toast from 'react-hot-toast';

const TripsList = ({ trips, loading, onRefresh }) => {
    const [deletingId, setDeletingId] = useState(null);
    const [selectedTrip, setSelectedTrip] = useState(null);
    const [editingTrip, setEditingTrip] = useState(null);
    const [enrichedTrips, setEnrichedTrips] = useState([]);
    const [enriching, setEnriching] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [tripToDelete, setTripToDelete] = useState(null);
    const [completingId, setCompletingId] = useState(null);
    const [showCompleteModal, setShowCompleteModal] = useState(false);
    const [tripToComplete, setTripToComplete] = useState(null);

    // Fetch vehicle and driver details for all trips (batch optimization)
    useEffect(() => {
        const enrichTripsData = async () => {
            if (!trips || trips.length === 0) {
                setEnrichedTrips([]);
                return;
            }

            setEnriching(true);
            try {
                // Extract all unique vehicle and driver IDs
                const vehicleIds = trips
                    .map(t => t.vehicleId)
                    .filter(id => id && typeof id === 'string');
                const driverIds = trips
                    .map(t => t.driverId)
                    .filter(id => id && typeof id === 'string');

                // Fetch all vehicles and drivers in parallel (not per-trip)
                const [vehicleMap, driverMap] = await Promise.all([
                    vehicleIds.length > 0 ? vehicleService.getVehiclesByIds(vehicleIds) : Promise.resolve({}),
                    driverIds.length > 0 ? hiringService.getUsersByIds(driverIds) : Promise.resolve({})
                ]);

                // Enrich trips with fetched data
                const enrichedData = trips.map(trip => {
                    const enrichedTrip = { ...trip };

                    // Use fetched or already-populated vehicle data
                    if (trip.vehicleId && typeof trip.vehicleId === 'object') {
                        enrichedTrip.vehicle = trip.vehicleId;
                    } else if (trip.vehicleId) {
                        enrichedTrip.vehicle = vehicleMap[trip.vehicleId] || null;
                    }

                    // Use fetched or already-populated driver data
                    if (trip.driverId && typeof trip.driverId === 'object') {
                        enrichedTrip.driver = trip.driverId;
                    } else if (trip.driverId) {
                        const fetchedDriver = driverMap[trip.driverId];
                        enrichedTrip.driver = fetchedDriver?.user || fetchedDriver || null;
                    }

                    return enrichedTrip;
                });

                setEnrichedTrips(enrichedData);
            } catch (error) {
                console.error('Error enriching trips:', error);
                setEnrichedTrips(trips);
            } finally {
                setEnriching(false);
            }
        };

        enrichTripsData();
    }, [trips]);

    const handleDelete = async (tripId) => {
        setTripToDelete(tripId);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!tripToDelete) return;

        setDeletingId(tripToDelete);
        try {
            await tripService.deleteTrip(tripToDelete);
            toast.success('Trip deleted successfully. Vehicle and driver are now available.');
            setShowDeleteModal(false);
            setTripToDelete(null);
            onRefresh();
        } catch (error) {
            console.error('Delete error:', error);
            toast.error(error.message || 'Failed to delete trip');
        } finally {
            setDeletingId(null);
        }
    };

    const cancelDelete = () => {
        setShowDeleteModal(false);
        setTripToDelete(null);
    };

    const handleComplete = async (trip) => {
        setTripToComplete(trip);
        setShowCompleteModal(true);
    };

    const confirmComplete = async () => {
        if (!tripToComplete) return;

        setCompletingId(tripToComplete._id);
        try {
            await tripService.updateTrip(tripToComplete._id, { status: 'completed' });
            toast.success('Trip marked as complete. Vehicle and driver are now available.');
            setShowCompleteModal(false);
            setTripToComplete(null);
            onRefresh();
        } catch (error) {
            console.error('Update error:', error);
            toast.error(error.message || 'Failed to complete trip');
        } finally {
            setCompletingId(null);
        }
    };

    const cancelComplete = () => {
        setShowCompleteModal(false);
        setTripToComplete(null);
    };

    const isOverdue = (trip) => {
        if (trip.status === 'completed' || trip.status === 'cancelled') return false;
        const now = new Date();
        const endDate = new Date(trip.endDateTime);
        return now > endDate;
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'scheduled':
                return 'bg-yellow-100 text-yellow-700';
            case 'in-progress':
                return 'bg-green-100 text-green-700';
            case 'completed':
                return 'bg-blue-100 text-blue-700';
            case 'cancelled':
                return 'bg-red-100 text-red-700';
            default:
                return 'bg-gray-100 text-gray-700';
        }
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading || enriching) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
            </div>
        );
    }

    if (enrichedTrips.length === 0) {
        return (
            <div className="text-center py-12">
                <Truck className="mx-auto text-gray-400 mb-4" size={48} />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No trips found</h3>
                <p className="text-gray-600">Create your first trip to get started</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {enrichedTrips.map((trip) => (
                <div key={trip._id} className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                    <div className="p-6">
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(trip.status)}`}>
                                        {trip.status.replace('-', ' ').toUpperCase()}
                                    </span>
                                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                                        {trip.tripType.toUpperCase()}
                                    </span>
                                </div>
                                {trip.vehicle && (
                                    <div className="flex items-center gap-2 text-gray-700">
                                        <Truck size={18} />
                                        <span className="font-medium">
                                            {trip.vehicle.registrationNumber}
                                        </span>
                                        <span className="text-gray-500 text-sm">
                                            {trip.vehicle.make} {trip.vehicle.model}
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => setSelectedTrip(trip)}
                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="View Details"
                                >
                                    <Eye size={18} />
                                </button>
                                {isOverdue(trip) && (
                                    <button
                                        onClick={() => handleComplete(trip)}
                                        disabled={completingId === trip._id}
                                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                                        title="Mark as Complete"
                                    >
                                        <CheckCircle size={18} />
                                    </button>
                                )}
                                {trip.status === 'scheduled' && (
                                    <>
                                        <button
                                            onClick={() => setEditingTrip(trip)}
                                            className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                            title="Edit Trip"
                                        >
                                            <Edit2 size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(trip._id)}
                                            disabled={deletingId === trip._id}
                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                            title="Delete Trip"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            {/* Start Destination */}
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                                    <Navigation className="text-green-600" size={16} />
                                </div>
                                <div>
                                    <div className="text-xs text-gray-500 mb-1">Start</div>
                                    <div className="font-medium text-gray-900">{trip.startDestination.name}</div>
                                    <div className="text-sm text-gray-600">{trip.startDestination.address}</div>
                                </div>
                            </div>

                            {/* End Destination */}
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                                    <MapPin className="text-red-600" size={16} />
                                </div>
                                <div>
                                    <div className="text-xs text-gray-500 mb-1">End</div>
                                    <div className="font-medium text-gray-900">{trip.endDestination.name}</div>
                                    <div className="text-sm text-gray-600">{trip.endDestination.address}</div>
                                </div>
                            </div>
                        </div>

                        {/* Stops */}
                        {trip.stops && trip.stops.length > 0 && (
                            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                                <div className="text-xs text-gray-600 mb-2">
                                    {trip.stops.length} Stop{trip.stops.length > 1 ? 's' : ''}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {trip.stops.map((stop, index) => (
                                        <span key={index} className="text-xs bg-white px-2 py-1 rounded border border-gray-200">
                                            {stop.name}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Trip Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
                            <div className="flex items-center gap-2">
                                <Calendar className="text-gray-400" size={16} />
                                <div>
                                    <div className="text-xs text-gray-500">Start</div>
                                    <div className="text-sm font-medium text-gray-900">
                                        {formatDate(trip.startDateTime)}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <Clock className="text-gray-400" size={16} />
                                <div>
                                    <div className="text-xs text-gray-500">End</div>
                                    <div className="text-sm font-medium text-gray-900">
                                        {formatDate(trip.endDateTime)}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <Navigation className="text-gray-400" size={16} />
                                <div>
                                    <div className="text-xs text-gray-500">Distance</div>
                                    <div className="text-sm font-medium text-gray-900">
                                        {trip.distance.toFixed(2)} km
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <IndianRupee className="text-gray-400" size={16} />
                                <div>
                                    <div className="text-xs text-gray-500">Amount</div>
                                    <div className="text-sm font-medium text-green-600">
                                        ₹{trip.amount.toLocaleString()}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Driver Info */}
                        {trip.driver && (
                            <div className="mt-4 pt-4 border-t border-gray-200">
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <span>Driver:</span>
                                    <span className="font-medium text-gray-900">
                                        {trip.driver.firstName} {trip.driver.lastName}
                                    </span>
                                    <span className="text-gray-400">•</span>
                                    <span>{trip.driver.email}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            ))}

            {/* Trip Details Modal */}
            {selectedTrip && (
                <TripDetailsModal
                    trip={selectedTrip}
                    onClose={() => setSelectedTrip(null)}
                />
            )}

            {/* Edit Trip Modal */}
            {editingTrip && (
                <EditTripModal
                    trip={editingTrip}
                    onClose={() => setEditingTrip(null)}
                    onSuccess={() => {
                        setEditingTrip(null);
                        onRefresh();
                    }}
                />
            )}

            {/* Delete Confirmation Modal */}
            <ConfirmationModal
                isOpen={showDeleteModal}
                onClose={cancelDelete}
                onConfirm={confirmDelete}
                title="Delete Trip"
                message="Are you sure you want to delete this trip? The assigned vehicle and driver will become available again."
                type="danger"
                confirmText="Delete Trip"
                cancelText="Cancel"
                loading={deletingId !== null}
            />

            {/* Complete Confirmation Modal */}
            <ConfirmationModal
                isOpen={showCompleteModal}
                onClose={cancelComplete}
                onConfirm={confirmComplete}
                title="Mark Trip as Complete"
                message="Are you sure you want to mark this trip as complete? This will finalize the trip record and make the vehicle and driver available for new assignments."
                type="success"
                confirmText="Complete Trip"
                cancelText="Cancel"
                loading={completingId !== null}
            />
        </div>
    );
};

// Trip Details Modal Component
const TripDetailsModal = ({ trip, onClose }) => {
    const formatDuration = (minutes) => {
        if (!minutes || minutes <= 0) return '0 min';
        const days = Math.floor(minutes / (24 * 60));
        const hours = Math.floor((minutes % (24 * 60)) / 60);
        const mins = Math.floor(minutes % 60);
        const parts = [];
        if (days > 0) parts.push(`${days} day${days > 1 ? 's' : ''}`);
        if (hours > 0) parts.push(`${hours} hr${hours > 1 ? 's' : ''}`);
        if (mins > 0) parts.push(`${mins} min`);
        return parts.join(', ') || '0 min';
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-900">Trip Details</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-6">
                    <div className="space-y-6">
                        {/* Status and Type */}
                        <div className="flex gap-3">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                trip.status === 'scheduled' ? 'bg-yellow-100 text-yellow-700' :
                                trip.status === 'in-progress' ? 'bg-green-100 text-green-700' :
                                trip.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                                'bg-gray-100 text-gray-700'
                            }`}>
                                {trip.status.toUpperCase()}
                            </span>
                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                                {trip.tripType.toUpperCase()}
                            </span>
                        </div>

                        {/* Basic Information */}
                        <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                            <h4 className="font-semibold text-gray-900 mb-2">Trip Information</h4>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <span className="text-gray-600">Trip Type:</span>
                                    <span className="font-medium text-gray-900 ml-2 capitalize">{trip.tripType}</span>
                                </div>
                                <div>
                                    <span className="text-gray-600">Two-Way:</span>
                                    <span className="font-medium text-gray-900 ml-2">{trip.isTwoWay ? 'Yes' : 'No'}</span>
                                </div>
                            </div>
                            <div className="pt-2 border-t border-gray-200">
                                <div className="text-gray-600">Customer:</div>
                                <div className="font-medium text-gray-900">{trip.customerName || 'N/A'}</div>
                                <div className="text-xs text-gray-500">{trip.customerEmail || 'N/A'}</div>
                                <div className="text-xs text-gray-500">{trip.customerContact || 'N/A'}</div>
                            </div>
                        </div>

                        {/* Route Details */}
                        <div className="bg-blue-50 rounded-lg p-4 space-y-2 text-sm">
                            <h4 className="font-semibold text-gray-900 mb-2">Route Details</h4>
                            <div className="space-y-2">
                                <div className="flex items-start gap-2">
                                    <div className="w-2 h-2 bg-green-500 rounded-full mt-1.5"></div>
                                    <div className="flex-1">
                                        <div className="text-gray-600 text-xs">From</div>
                                        <div className="font-medium text-gray-900">{trip.startDestination?.name || 'N/A'}</div>
                                        <div className="text-xs text-gray-500">{trip.startDestination?.address}</div>
                                    </div>
                                </div>
                                {trip.stops && trip.stops.length > 0 && (
                                    <div className="ml-1 border-l-2 border-gray-300 pl-3 py-1 space-y-1">
                                        {trip.stops.map((stop, idx) => (
                                            <div key={idx} className="flex items-start gap-2">
                                                <div className="w-2 h-2 bg-amber-500 rounded-full mt-1.5"></div>
                                                <div className="flex-1">
                                                    <div className="text-gray-600 text-xs">Stop {idx + 1}</div>
                                                    <div className="font-medium text-gray-900">{stop.name}</div>
                                                    <div className="text-xs text-gray-500">{stop.address}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <div className="flex items-start gap-2">
                                    <div className="w-2 h-2 bg-red-500 rounded-full mt-1.5"></div>
                                    <div className="flex-1">
                                        <div className="text-gray-600 text-xs">To</div>
                                        <div className="font-medium text-gray-900">{trip.endDestination?.name || 'N/A'}</div>
                                        <div className="text-xs text-gray-500">{trip.endDestination?.address}</div>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-blue-200 mt-3">
                                <div>
                                    <div className="text-gray-600 text-xs">Distance</div>
                                    <div className="font-semibold text-gray-900">
                                        {trip.distance?.toFixed(2) || '0.00'} km
                                        {trip.isTwoWay && <span className="text-xs text-gray-500 ml-1">(2-way)</span>}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-gray-600 text-xs">Est. Duration</div>
                                    <div className="font-semibold text-gray-900">
                                        {formatDuration(trip.duration)}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Timing */}
                        <div className="bg-purple-50 rounded-lg p-4 space-y-2 text-sm">
                            <h4 className="font-semibold text-gray-900 mb-2">Schedule</h4>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <div className="text-gray-600 text-xs">Start Date & Time</div>
                                    <div className="font-medium text-gray-900">
                                        {formatDate(trip.startDateTime)}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-gray-600 text-xs">End Date & Time</div>
                                    <div className="font-medium text-gray-900">
                                        {formatDate(trip.endDateTime)}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Pricing Details */}
                        <div className="bg-green-50 rounded-lg p-4 space-y-2 text-sm">
                            <h4 className="font-semibold text-gray-900 mb-2">Pricing Details</h4>
                            <div className="space-y-2">
                                {trip.amountPerKm > 0 && (
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-600">
                                            Distance Charges ({trip.distance?.toFixed(2) || '0.00'} km × ₹{trip.amountPerKm}/km)
                                        </span>
                                        <span className="font-medium text-gray-900">
                                            ₹{((trip.distance || 0) * trip.amountPerKm).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                )}
                                {trip.vehicleRent > 0 && (
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-600">Vehicle Rent</span>
                                        <span className="font-medium text-gray-900">
                                            ₹{trip.vehicleRent.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center border-t border-green-200 pt-2 mt-2">
                                    <span className="font-semibold text-gray-900">Total Amount</span>
                                    <span className="font-bold text-green-600 text-lg">
                                        ₹{(trip.amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TripsList;
