import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { tripService } from '../services/tripService';
import AssignedTripCard from '../components/driver/AssignedTripCard';
import { Loader2, AlertCircle, Briefcase } from 'lucide-react';

const DriverDashboard = () => {
    const navigate = useNavigate();
    const [assignedTrips, setAssignedTrips] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchAssignedTrips();
    }, []);

    const fetchAssignedTrips = async () => {
        try {
            setLoading(true);
            setError(null);
            const trips = await tripService.getDriverAssignedTrips();
            setAssignedTrips(trips);
        } catch (err) {
            console.error('Error fetching assigned trips:', err);
            setError(err.message || 'Failed to load assigned trips');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userRole');
        navigate('/login', { replace: true });
    };

    return (
        <div className="min-h-screen bg-neutral p-4">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-800">Driver Dashboard</h1>
                            <p className="text-gray-600 mt-1">View and manage your assigned trips</p>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="bg-secondary text-white px-6 py-2 rounded-lg hover:bg-primary transition-colors"
                        >
                            Logout
                        </button>
                    </div>
                </div>

                {/* Assigned Trips Section */}
                <div className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex items-center gap-2 mb-6">
                        <Briefcase size={24} className="text-primary" />
                        <h2 className="text-2xl font-bold text-gray-800">My Assigned Trips</h2>
                        {!loading && (
                            <span className="ml-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                                {assignedTrips.length}
                            </span>
                        )}
                    </div>

                    {/* Loading State */}
                    {loading && (
                        <div className="flex flex-col items-center justify-center py-12">
                            <Loader2 size={48} className="text-primary animate-spin mb-4" />
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
                    {!loading && !error && assignedTrips.length === 0 && (
                        <div className="text-center py-12">
                            <div className="bg-gray-100 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-4">
                                <Briefcase size={48} className="text-gray-400" />
                            </div>
                            <h3 className="text-xl font-semibold text-gray-800 mb-2">No Assigned Trips</h3>
                            <p className="text-gray-600">
                                You don't have any trips assigned at the moment. <br />
                                Check back later or contact your fleet manager.
                            </p>
                        </div>
                    )}

                    {/* Trips List */}
                    {!loading && !error && assignedTrips.length > 0 && (
                        <div className="space-y-4">
                            {assignedTrips.map((trip) => (
                                <AssignedTripCard key={trip._id} trip={trip} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DriverDashboard;
