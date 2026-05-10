import React, { useState, useEffect } from 'react';
import { tripService } from '../../services/tripService';
import AssignedTripCard from '../../components/driver/AssignedTripCard';
import TripTimeline from '../../components/driver/TripTimeline';
import { Loader2, AlertCircle, Briefcase, Calendar } from 'lucide-react';

const MyTripsPage = () => {
    const [assignedTrips, setAssignedTrips] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState('all'); // all, scheduled, in-progress

    useEffect(() => {
        fetchAssignedTrips();
    }, []);

    const fetchAssignedTrips = async () => {
        try {
            setLoading(true);
            setError(null);
            console.log('Fetching driver assigned trips...');
            const trips = await tripService.getDriverAssignedTrips();
            console.log('Received trips:', trips);
            setAssignedTrips(trips);
        } catch (err) {
            console.error('Error fetching assigned trips:', err);
            // Show more detailed error information
            const errorMessage = err?.message || err?.error || JSON.stringify(err) || 'Failed to load assigned trips';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    // Filter trips based on selected filter
    const filteredTrips = assignedTrips.filter(trip => {
        if (filter === 'all') return true;
        return trip.status === filter;
    });

    // Count trips by status
    const scheduledCount = assignedTrips.filter(t => t.status === 'scheduled').length;
    const inProgressCount = assignedTrips.filter(t => t.status === 'in-progress').length;

    return (
        <div className="flex flex-col gap-6">
            {/* Header with Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-100 p-3 rounded-lg">
                            <Briefcase size={24} className="text-blue-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-800">{assignedTrips.length}</p>
                            <p className="text-sm text-gray-600">Total Trips</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-amber-100 p-3 rounded-lg">
                            <Calendar size={24} className="text-amber-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-800">{scheduledCount}</p>
                            <p className="text-sm text-gray-600">Scheduled</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-green-100 p-3 rounded-lg">
                            <Briefcase size={24} className="text-green-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-800">{inProgressCount}</p>
                            <p className="text-sm text-gray-600">In Progress</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                {/* Filter Tabs */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">My Trips</h2>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setFilter('all')}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                filter === 'all'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            All ({assignedTrips.length})
                        </button>
                        <button
                            onClick={() => setFilter('scheduled')}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                filter === 'scheduled'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            Scheduled ({scheduledCount})
                        </button>
                        <button
                            onClick={() => setFilter('in-progress')}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                filter === 'in-progress'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            In Progress ({inProgressCount})
                        </button>
                    </div>
                </div>

                {/* Loading State */}
                {loading && (
                    <div className="flex flex-col items-center justify-center py-12">
                        <Loader2 size={48} className="text-blue-600 animate-spin mb-4" />
                        <p className="text-gray-600">Loading your assigned trips...</p>
                    </div>
                )}

                {/* Error State */}
                {error && !loading && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                        <AlertCircle size={24} className="text-red-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <h3 className="font-semibold text-red-800">Error Loading Trips</h3>
                            <p className="text-red-700 text-sm mt-1">{error}</p>
                            <button
                                onClick={fetchAssignedTrips}
                                className="mt-3 text-sm text-red-600 hover:text-red-800 font-semibold underline"
                            >
                                Try Again
                            </button>
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {!loading && !error && filteredTrips.length === 0 && (
                    <div className="text-center py-12">
                        <div className="bg-gray-100 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-4">
                            <Briefcase size={48} className="text-gray-400" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-800 mb-2">
                            {filter === 'all' ? 'No Assigned Trips' : `No ${filter.replace('-', ' ')} trips`}
                        </h3>
                        <p className="text-gray-600">
                            {filter === 'all' 
                                ? "You don't have any trips assigned at the moment."
                                : `You don't have any ${filter.replace('-', ' ')} trips at the moment.`
                            }
                        </p>
                    </div>
                )}

                {/* Trips List */}
                {!loading && !error && filteredTrips.length > 0 && (
                    <div className="space-y-4">
                        {filteredTrips.map((trip) => (
                            trip.status === 'in-progress' ? (
                                <TripTimeline 
                                    key={trip._id} 
                                    trip={trip} 
                                    onTripUpdate={fetchAssignedTrips} 
                                />
                            ) : (
                                <AssignedTripCard 
                                    key={trip._id} 
                                    trip={trip} 
                                    onTripUpdate={fetchAssignedTrips} 
                                />
                            )
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MyTripsPage;

