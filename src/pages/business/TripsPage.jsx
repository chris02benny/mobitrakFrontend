import React, { useState, useEffect } from 'react';
import { Plus, Calendar, MapPin, Truck, Clock, IndianRupee } from 'lucide-react';
import { tripService } from '../../services/tripService';
import AddTripForm from '../../components/trips/AddTripForm';
import TripsList from '../../components/trips/TripsList';
import toast from 'react-hot-toast';

const TripsPage = () => {
    const [activeTab, setActiveTab] = useState('all'); // 'all', 'scheduled', 'in-progress', 'completed', 'add'
    const [trips, setTrips] = useState([]);
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState({
        total: 0,
        scheduled: 0,
        inProgress: 0,
        completed: 0
    });

    useEffect(() => {
        if (activeTab !== 'add') {
            fetchTrips();
        }
    }, [activeTab]);

    const fetchTrips = async () => {
        try {
            setLoading(true);
            const filter = activeTab !== 'all' ? { status: activeTab } : {};
            const data = await tripService.getTrips(filter);
            setTrips(data);
            calculateStats(data);
        } catch (error) {
            console.error('Error fetching trips:', error);
            toast.error('Failed to fetch trips');
        } finally {
            setLoading(false);
        }
    };

    const calculateStats = (tripsData) => {
        setStats({
            total: tripsData.length,
            scheduled: tripsData.filter(t => t.status === 'scheduled').length,
            inProgress: tripsData.filter(t => t.status === 'in-progress').length,
            completed: tripsData.filter(t => t.status === 'completed').length
        });
    };

    const handleTripCreated = () => {
        setActiveTab('all');
        fetchTrips();
        toast.success('Trip created successfully!');
    };

    const tabs = [
        { id: 'all', label: 'All Trips', count: stats.total },
        { id: 'scheduled', label: 'Scheduled', count: stats.scheduled },
        { id: 'in-progress', label: 'In Progress', count: stats.inProgress },
        { id: 'completed', label: 'Completed', count: stats.completed },
        { id: 'add', label: 'Add Trip', icon: <Plus size={16} /> }
    ];

    return (
        <div className="p-6 max-w-[1600px] mx-auto">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Trip Management</h1>
                <p className="text-gray-600">Schedule and manage your fleet trips</p>
            </div>

            {/* Stats Cards */}
            {activeTab !== 'add' && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Total Trips</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                            </div>
                            <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                                <Truck className="text-blue-600" size={24} />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Scheduled</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.scheduled}</p>
                            </div>
                            <div className="w-12 h-12 bg-yellow-50 rounded-lg flex items-center justify-center">
                                <Calendar className="text-yellow-600" size={24} />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">In Progress</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.inProgress}</p>
                            </div>
                            <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                                <Clock className="text-green-600" size={24} />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Completed</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
                            </div>
                            <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
                                <MapPin className="text-purple-600" size={24} />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="flex border-b border-gray-200 overflow-x-auto">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`
                                flex items-center gap-2 px-6 py-3 text-sm font-medium whitespace-nowrap
                                transition-colors duration-200
                                ${activeTab === tab.id
                                    ? 'text-amber-600 border-b-2 border-amber-600 bg-amber-50'
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                }
                            `}
                        >
                            {tab.icon}
                            <span>{tab.label}</span>
                            {tab.count !== undefined && (
                                <span className={`
                                    px-2 py-0.5 rounded-full text-xs
                                    ${activeTab === tab.id
                                        ? 'bg-amber-100 text-amber-700'
                                        : 'bg-gray-100 text-gray-600'
                                    }
                                `}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="p-6">
                    {activeTab === 'add' ? (
                        <AddTripForm onSuccess={handleTripCreated} />
                    ) : (
                        <TripsList 
                            trips={trips} 
                            loading={loading} 
                            onRefresh={fetchTrips}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default TripsPage;
