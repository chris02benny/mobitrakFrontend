import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, ChevronDown, Check, Calendar, MapPin, Truck, Clock, IndianRupee } from 'lucide-react';
import { tripService } from '../../services/tripService';
import AddTripForm from '../../components/trips/AddTripForm';
import TripsList from '../../components/trips/TripsList';
import toast from 'react-hot-toast';

const TripsPage = () => {
    const [activeTab, setActiveTab] = useState('all'); // 'all', 'add'
    const [trips, setTrips] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStatuses, setSelectedStatuses] = useState(['scheduled', 'in-progress', 'completed']);
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);
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
            // Fetch all trips and filter client-side for better search/multi-status support
            const data = await tripService.getTrips();
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
        { id: 'add', label: 'Add Trip', icon: <Plus size={16} /> }
    ];

    const toggleStatus = (status) => {
        setSelectedStatuses(prev =>
            prev.includes(status)
                ? prev.filter(s => s !== status)
                : [...prev, status]
        );
    };

    const filteredTrips = trips.filter(trip => {
        const matchesStatus = selectedStatuses.includes(trip.status);
        const matchesSearch =
            trip.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            trip.tripId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            trip.startDestination?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            trip.endDestination?.name?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    return (
        <div className="max-w-[1600px] mx-auto">
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
                        <div className="space-y-6">
                            {/* Search and Filter Bar */}
                            <div className="flex flex-col md:flex-row gap-4">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Search by customer, trip ID, or destination..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                                    />
                                </div>
                                <div className="relative">
                                    <button
                                        onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                                        className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${showFilterDropdown ? 'bg-amber-50 border-amber-500 text-amber-600' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                            }`}
                                    >
                                        <Filter size={18} />
                                        <span>Filter</span>
                                        <ChevronDown size={14} className={`transition-transform duration-200 ${showFilterDropdown ? 'rotate-180' : ''}`} />
                                    </button>

                                    {showFilterDropdown && (
                                        <>
                                            <div
                                                className="fixed inset-0 z-10"
                                                onClick={() => setShowFilterDropdown(false)}
                                            ></div>
                                            <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-100 py-2 z-20">
                                                <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                                    Trip Status
                                                </div>
                                                {['scheduled', 'in-progress', 'completed'].map(status => (
                                                    <label
                                                        key={status}
                                                        className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 cursor-pointer transition-colors"
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedStatuses.includes(status)}
                                                            onChange={() => toggleStatus(status)}
                                                            className="w-4 h-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                                                        />
                                                        <span className="text-sm text-gray-700 capitalize">
                                                            {status.replace('-', ' ')}
                                                        </span>
                                                    </label>
                                                ))}
                                                <div className="border-t border-gray-100 mt-2 pt-2 px-4">
                                                    <button
                                                        onClick={() => setSelectedStatuses(['scheduled', 'in-progress', 'completed'])}
                                                        className="text-xs text-amber-600 hover:text-amber-700 font-medium"
                                                    >
                                                        Reset Filters
                                                    </button>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            <TripsList
                                trips={filteredTrips}
                                loading={loading}
                                onRefresh={fetchTrips}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TripsPage;
