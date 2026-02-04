import React, { useState } from 'react';
import { Calendar, MapPin, Truck, Clock, IndianRupee, Eye, Edit2, Trash2, Navigation } from 'lucide-react';
import { tripService } from '../../services/tripService';
import toast from 'react-hot-toast';

const TripsList = ({ trips, loading, onRefresh }) => {
    const [deletingId, setDeletingId] = useState(null);
    const [selectedTrip, setSelectedTrip] = useState(null);

    const handleDelete = async (tripId) => {
        if (!window.confirm('Are you sure you want to delete this trip?')) {
            return;
        }

        setDeletingId(tripId);
        try {
            await tripService.deleteTrip(tripId);
            toast.success('Trip deleted successfully');
            onRefresh();
        } catch (error) {
            console.error('Delete error:', error);
            toast.error(error.message || 'Failed to delete trip');
        } finally {
            setDeletingId(null);
        }
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

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
            </div>
        );
    }

    if (trips.length === 0) {
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
            {trips.map((trip) => (
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
                                {trip.vehicleId && (
                                    <div className="flex items-center gap-2 text-gray-700">
                                        <Truck size={18} />
                                        <span className="font-medium">
                                            {trip.vehicleId.registrationNumber}
                                        </span>
                                        <span className="text-gray-500 text-sm">
                                            {trip.vehicleId.make} {trip.vehicleId.model}
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
                                {trip.status === 'scheduled' && (
                                    <>
                                        <button
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
                        {trip.driverId && (
                            <div className="mt-4 pt-4 border-t border-gray-200">
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <span>Driver:</span>
                                    <span className="font-medium text-gray-900">
                                        {trip.driverId.firstName} {trip.driverId.lastName}
                                    </span>
                                    <span className="text-gray-400">•</span>
                                    <span>{trip.driverId.email}</span>
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
        </div>
    );
};

// Trip Details Modal Component
const TripDetailsModal = ({ trip, onClose }) => {
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

                        {/* Route Information */}
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <h3 className="font-medium text-gray-900 mb-3">Route Information</h3>
                            <div className="space-y-3">
                                <div>
                                    <div className="text-sm text-gray-600 mb-1">Start</div>
                                    <div className="font-medium">{trip.startDestination.name}</div>
                                    <div className="text-sm text-gray-600">{trip.startDestination.address}</div>
                                </div>

                                {trip.stops && trip.stops.length > 0 && (
                                    <div>
                                        <div className="text-sm text-gray-600 mb-1">Stops</div>
                                        {trip.stops.map((stop, index) => (
                                            <div key={index} className="ml-4 mb-2">
                                                <div className="font-medium">{index + 1}. {stop.name}</div>
                                                <div className="text-sm text-gray-600">{stop.address}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div>
                                    <div className="text-sm text-gray-600 mb-1">End</div>
                                    <div className="font-medium">{trip.endDestination.name}</div>
                                    <div className="text-sm text-gray-600">{trip.endDestination.address}</div>
                                </div>
                            </div>
                        </div>

                        {/* Trip Statistics */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <div className="text-sm text-gray-600 mb-1">Distance</div>
                                <div className="text-xl font-bold text-gray-900">{trip.distance.toFixed(2)} km</div>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <div className="text-sm text-gray-600 mb-1">Duration</div>
                                <div className="text-xl font-bold text-gray-900">{Math.round(trip.duration)} min</div>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <div className="text-sm text-gray-600 mb-1">Amount</div>
                                <div className="text-xl font-bold text-green-600">₹{trip.amount.toLocaleString()}</div>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <div className="text-sm text-gray-600 mb-1">Stops</div>
                                <div className="text-xl font-bold text-gray-900">{trip.stops?.length || 0}</div>
                            </div>
                        </div>

                        {/* Suggested Stops */}
                        {trip.suggestedStops && trip.suggestedStops.length > 0 && (
                            <div>
                                <h3 className="font-medium text-gray-900 mb-3">Suggested Rest Stops</h3>
                                <div className="space-y-2">
                                    {trip.suggestedStops.map((stop, index) => (
                                        <div key={index} className="bg-amber-50 border border-amber-200 p-3 rounded-lg">
                                            <div className="font-medium text-gray-900">{stop.name}</div>
                                            <div className="text-sm text-gray-600">{stop.reason}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TripsList;
