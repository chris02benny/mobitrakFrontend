import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, MapPin, ArrowRight, Truck, User, Navigation, Building2, Menu, Search, X } from 'lucide-react';
import { io } from 'socket.io-client';
import MapView from '../common/MapView';
import { authService } from '../../services/authService';
import { vehicleService } from '../../services/vehicleService';
import { hiringService } from '../../services/hiringService';
import { tripService } from '../../services/tripService';

const LiveFleetMap = ({ isFullPage = false }) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [mapCenter, setMapCenter] = useState({ lng: 78.9629, lat: 20.5937, zoom: 4 });
    const [markers, setMarkers] = useState([]);
    const [allMarkers, setAllMarkers] = useState([]); // Store all markers for filtering
    const [officeLocation, setOfficeLocation] = useState(null);
    const [stats, setStats] = useState({ totalVehicles: 0, totalDrivers: 0, totalTrips: 0, officeSet: false });
    const [filters, setFilters] = useState({ office: false, vehicles: false, drivers: false, trips: false });
    const [showFullList, setShowFullList] = useState(false);
    const [showLeftModal, setShowLeftModal] = useState(false);
    const [selectedItemDetails, setSelectedItemDetails] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [vehiclesData, setVehiclesData] = useState([]);
    const [driversData, setDriversData] = useState([]);
    const [profileData, setProfileData] = useState(null);
    const [socket, setSocket] = useState(null);
    const [userSocket, setUserSocket] = useState(null);

    // Initialize Socket.IO connection to trip-service
    useEffect(() => {
        // Use VITE_TRIP_SERVICE_URL or fallback to VITE_API_URL
        const TRIP_SERVICE_URL = import.meta.env.VITE_TRIP_SERVICE_URL || import.meta.env.VITE_API_URL || 'https://g5ly7nfs0m.execute-api.ap-south-1.amazonaws.com';
        const newSocket = io(TRIP_SERVICE_URL, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 5
        });

        newSocket.on('connect', () => {
            console.log('Socket.IO connected to trip-service');
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            if (user.id) {
                newSocket.emit('join-fleet-room', user.id);
            }
        });

        newSocket.on('disconnect', () => {
            console.log('Socket.IO disconnected from trip-service');
        });

        newSocket.on('location-update', (locationData) => {
            console.log('Location update received:', locationData);
            handleLocationUpdate(locationData);
        });

        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
        };
    }, []);

    // Initialize Socket.IO connection to user-service
    useEffect(() => {
        // Use VITE_USER_SERVICE_URL or fallback to VITE_API_URL
        const USER_SERVICE_URL = import.meta.env.VITE_USER_SERVICE_URL || import.meta.env.VITE_API_URL || 'https://g5ly7nfs0m.execute-api.ap-south-1.amazonaws.com';
        const newUserSocket = io(USER_SERVICE_URL, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 5
        });

        newUserSocket.on('connect', () => {
            console.log('Socket.IO connected to user-service');
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            if (user.id) {
                newUserSocket.emit('join-user-room', user.id);
            }
        });

        newUserSocket.on('disconnect', () => {
            console.log('Socket.IO disconnected from user-service');
        });

        newUserSocket.on('office-location-update', (data) => {
            console.log('Office location update received:', data);
            handleOfficeLocationUpdate(data);
        });

        setUserSocket(newUserSocket);

        return () => {
            newUserSocket.disconnect();
        };
    }, []);

    // Handle real-time location updates
    const handleLocationUpdate = (locationData) => {
        const { vehicleId, location, tripId } = locationData;

        setAllMarkers(prevMarkers => {
            const updatedMarkers = [...prevMarkers];
            const vehicleMarkerIndex = updatedMarkers.findIndex(
                marker => marker.id === `vehicle-${vehicleId}` || marker.id === `trip-${tripId}`
            );

            if (vehicleMarkerIndex !== -1) {
                updatedMarkers[vehicleMarkerIndex] = {
                    ...updatedMarkers[vehicleMarkerIndex],
                    lng: location.longitude,
                    lat: location.latitude,
                    data: {
                        ...updatedMarkers[vehicleMarkerIndex].data,
                        lastUpdate: new Date().toLocaleString()
                    }
                };
            } else {
                updatedMarkers.push({
                    id: `trip-${tripId}`,
                    lng: location.longitude,
                    lat: location.latitude,
                    type: 'trip',
                    label: `Vehicle on Trip`,
                    data: {
                        tripId,
                        vehicleId,
                        lastUpdate: new Date().toLocaleString()
                    }
                });
            }

            return updatedMarkers;
        });
    };

    // Handle real-time office location updates
    const handleOfficeLocationUpdate = (data) => {
        const { officeLocation, companyName } = data;

        if (officeLocation?.coordinates?.length === 2) {
            const [lng, lat] = officeLocation.coordinates;

            setOfficeLocation({ lng, lat });
            setMapCenter({ lng, lat, zoom: 12 });

            setAllMarkers(prevMarkers => {
                const updatedMarkers = [...prevMarkers];

                const officeMarkerIndex = updatedMarkers.findIndex(m => m.id === 'office');
                if (officeMarkerIndex !== -1) {
                    updatedMarkers[officeMarkerIndex] = {
                        ...updatedMarkers[officeMarkerIndex],
                        lng,
                        lat,
                        label: companyName || 'Office Location'
                    };
                } else {
                    updatedMarkers.unshift({
                        id: 'office',
                        lng,
                        lat,
                        type: 'building',
                        label: companyName || 'Office Location',
                        data: {
                            name: companyName || 'Office Location',
                            address: officeLocation.address || 'Office Address',
                            phone: data.phone,
                            email: data.email,
                            type: 'Office Location'
                        }
                    });
                }

                const vehicleMarkers = updatedMarkers.filter(m =>
                    m.type === 'vehicle' && m.id.startsWith('vehicle-') && !m.data.tripId
                );
                const driverMarkers = updatedMarkers.filter(m =>
                    m.type === 'driver' && m.id.startsWith('driver-')
                );

                vehicleMarkers.forEach((marker, index) => {
                    const offset = 0.001;
                    const angle = (index * 2 * Math.PI) / vehicleMarkers.length;
                    marker.lng = lng + offset * Math.cos(angle);
                    marker.lat = lat + offset * Math.sin(angle);
                });

                driverMarkers.forEach((marker, index) => {
                    const offset = 0.0015;
                    const angle = (index * 2 * Math.PI) / driverMarkers.length + Math.PI;
                    marker.lng = lng + offset * Math.cos(angle);
                    marker.lat = lat + offset * Math.sin(angle);
                });

                return updatedMarkers;
            });

            setProfileData(prev => ({
                ...prev,
                officeLocation,
                companyName
            }));
        }
    };

    useEffect(() => {
        fetchMapData();
    }, []);

    // Apply filters whenever filters, allMarkers, or searchQuery change
    useEffect(() => {
        applyFilters();
    }, [filters, allMarkers, searchQuery]);

    const applyFilters = () => {
        // If no filters are selected, show all markers
        const anyFilterActive = filters.office || filters.vehicles || filters.drivers || filters.trips;

        let filteredMarkers = allMarkers.filter(marker => {
            if (!anyFilterActive) return true; // Show all when nothing is selected

            if (marker.type === 'building' || marker.type === 'office') return filters.office;
            if (marker.type === 'vehicle') return filters.vehicles;
            if (marker.type === 'driver') return filters.drivers;
            if (marker.type === 'trip') return filters.trips;
            return false;
        });

        // Apply search filter only if search query exists AND it's not a filter category name
        const filterCategoryNames = ['Office', 'Vehicles', 'Drivers', 'Trips'];
        if (searchQuery.trim() && !filterCategoryNames.includes(searchQuery)) {
            const query = searchQuery.toLowerCase();
            filteredMarkers = filteredMarkers.filter(marker => {
                const data = marker.data;
                return (
                    marker.label?.toLowerCase().includes(query) ||
                    data?.name?.toLowerCase().includes(query) ||
                    data?.regnNo?.toLowerCase().includes(query) ||
                    data?.fullName?.toLowerCase().includes(query) ||
                    data?.companyName?.toLowerCase().includes(query) ||
                    data?.status?.toLowerCase().includes(query)
                );
            });
        }

        setMarkers(filteredMarkers);
    };

    const toggleFilter = (filterType) => {
        // When clicking a pill, turn off all others and turn on only this one
        const filterMap = {
            office: 'Office',
            vehicles: 'Vehicles',
            drivers: 'Drivers',
            trips: 'Trips'
        };

        setFilters({
            office: filterType === 'office',
            vehicles: filterType === 'vehicles',
            drivers: filterType === 'drivers',
            trips: filterType === 'trips'
        });
        setSearchQuery(filterMap[filterType]); // Fill search bar with filter name
        setShowLeftModal(true); // Show left modal with items
        setShowFullList(false); // Close full list when filter is selected
        setSelectedItemDetails(null); // Clear right modal
    };

    const getFilteredItems = () => {
        if (filters.office) return allMarkers.filter(m => m.type === 'office' || m.type === 'building');
        if (filters.vehicles) return allMarkers.filter(m => m.type === 'vehicle');
        if (filters.drivers) return allMarkers.filter(m => m.type === 'driver');
        if (filters.trips) return allMarkers.filter(m => m.type === 'trip');
        return allMarkers;
    };

    const handleItemClick = (item) => {
        setSelectedItemDetails(item);
        handleMarkerClick(item); // Also highlight on map
    };

    const fetchMapData = async () => {
        try {
            setLoading(true);
            setError(null);

            // Fetch user profile for office location
            const profileResponse = await authService.getProfile();
            const profileDataObj = profileResponse.user || profileResponse;
            setProfileData(profileDataObj);

            // Fetch vehicles
            const vehiclesDataArr = await vehicleService.getVehicles();
            setVehiclesData(vehiclesDataArr);

            // Fetch drivers (employees)
            let driversDataArr = [];
            try {
                const employeesResponse = await hiringService.getCompanyEmployees('ACTIVE');
                driversDataArr = employeesResponse.employees || [];
                setDriversData(driversDataArr);
            } catch (err) {
                console.warn('Could not fetch drivers:', err);
            }

            // Fetch active trips with live locations
            let activeTripsData = [];
            try {
                activeTripsData = await tripService.getActiveTripsWithLocations();
            } catch (err) {
                console.warn('Could not fetch active trips:', err);
            }

            const newMarkers = [];
            let hasOffice = false;

            // Add office location marker if available
            if (profileDataObj.officeLocation?.coordinates?.length === 2) {
                const [lng, lat] = profileDataObj.officeLocation.coordinates;
                setOfficeLocation({ lng, lat });
                setMapCenter({ lng, lat, zoom: 12 });
                hasOffice = true;

                newMarkers.push({
                    id: 'office',
                    lng,
                    lat,
                    type: 'building',
                    label: profileDataObj.companyName || 'Office Location',
                    data: {
                        name: profileDataObj.companyName || 'Office Location',
                        address: profileDataObj.officeLocation?.address || 'Office Address',
                        phone: profileDataObj.phone,
                        email: profileDataObj.email,
                        type: 'Office Location'
                    }
                });

                // Create a Set of vehicle IDs that are on active trips
                const activeVehicleIds = new Set(
                    activeTripsData
                        .filter(trip => trip.currentLocation?.coordinates?.length === 2)
                        .map(trip => trip.vehicleId?._id)
                );

                // Add vehicle markers (only for non-active vehicles at office location)
                vehiclesDataArr.forEach((vehicle, index) => {
                    if (activeVehicleIds.has(vehicle._id)) {
                        return;
                    }

                    const offset = 0.001;
                    const angle = (index * 2 * Math.PI) / vehiclesDataArr.length;
                    const vehicleLng = lng + offset * Math.cos(angle);
                    const vehicleLat = lat + offset * Math.sin(angle);

                    newMarkers.push({
                        id: `vehicle-${vehicle._id}`,
                        lng: vehicleLng,
                        lat: vehicleLat,
                        type: 'vehicle',
                        label: vehicle.regnNo || `Vehicle ${index + 1}`,
                        data: {
                            ...vehicle,
                            vehicleImage: vehicle.vehicleImage || vehicle.images?.[0] || null
                        }
                    });
                });

                // Add markers for active trip vehicles with real-time locations
                activeTripsData.forEach((trip) => {
                    if (trip.currentLocation?.coordinates?.length === 2) {
                        const [tripLng, tripLat] = trip.currentLocation.coordinates;
                        newMarkers.push({
                            id: `trip-${trip._id}`,
                            lng: tripLng,
                            lat: tripLat,
                            type: 'trip',
                            label: trip.vehicleId?.regnNo || 'Vehicle on Trip',
                            data: {
                                ...trip,
                                vehicleImage: trip.vehicleId?.vehicleImage || trip.vehicleId?.images?.[0] || null,
                                vehicleInfo: trip.vehicleId,
                                driverInfo: trip.driverId,
                                status: trip.status || 'In Progress',
                                lastUpdate: trip.lastLocationUpdate
                            }
                        });
                    }
                });

                // Add driver markers at office location
                driversDataArr.forEach((driver, index) => {
                    const offset = 0.0015;
                    const angle = (index * 2 * Math.PI) / driversDataArr.length + Math.PI;
                    const driverLng = lng + offset * Math.cos(angle);
                    const driverLat = lat + offset * Math.sin(angle);

                    newMarkers.push({
                        id: `driver-${driver._id}`,
                        lng: driverLng,
                        lat: driverLat,
                        type: 'driver',
                        label: driver.fullName || `Driver ${index + 1}`,
                        data: {
                            ...driver,
                            profilePicture: driver.profilePicture || null
                        }
                    });
                });
            }

            setAllMarkers(newMarkers);
            setStats({
                totalVehicles: vehiclesDataArr.length,
                totalDrivers: driversDataArr.length,
                totalTrips: activeTripsData.length,
                officeSet: hasOffice
            });
        } catch (err) {
            console.error('Error fetching map data:', err);
            setError(err.message || 'Failed to load map data');
        } finally {
            setLoading(false);
        }
    };

    const handleMarkerClick = (marker) => {
        // MapView component handles showing the overlay internally
        // This callback can be used for additional actions if needed
    };

    const handleExpandView = () => {
        navigate('/business/map');
    };

    return (
        <div className={isFullPage ? "flex flex-col h-full overflow-hidden" : "bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col h-full"}>
            {/* Card Header - only shown in widget/dashboard mode */}
            {!isFullPage && (
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-amber-500" />
                        <span className="font-semibold text-gray-900">Live Fleet Map</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleExpandView}
                            className="w-8 h-8 bg-amber-500 text-white rounded-lg flex items-center justify-center hover:bg-amber-600 transition-colors"
                            title="Expand to full map view"
                        >
                            <ArrowRight size={18} />
                        </button>
                    </div>
                </div>
            )}

            {/* Map Content Area */}
            <div className="flex-1 relative bg-slate-100 overflow-hidden">
                {loading ? (
                    <div className="w-full h-full flex items-center justify-center">
                        <div className="text-center">
                            <Loader2 className="w-8 h-8 animate-spin text-amber-500 mx-auto mb-2" />
                            <p className="text-sm text-gray-600">Loading map...</p>
                        </div>
                    </div>
                ) : error ? (
                    <div className="w-full h-full flex items-center justify-center p-6">
                        <div className="text-center max-w-md">
                            <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                            <p className="text-sm text-gray-600 mb-2">{error}</p>
                            <button
                                onClick={fetchMapData}
                                className="text-xs text-amber-600 hover:text-amber-700 font-medium"
                            >
                                Try Again
                            </button>
                        </div>
                    </div>
                ) : !officeLocation ? (
                    <div className="w-full h-full flex items-center justify-center p-6">
                        <div className="text-center max-w-md">
                            <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                            <p className="text-sm font-medium text-gray-900 mb-1">No Office Location Set</p>
                            <p className="text-xs text-gray-600 mb-3">
                                Please set your office location in Settings to view the fleet map.
                            </p>
                            <button
                                onClick={() => navigate('/business/settings')}
                                className="text-xs bg-amber-500 text-white px-4 py-2 rounded hover:bg-amber-600 transition-colors"
                            >
                                Go to Settings
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className={`absolute inset-0 transition-all duration-300 ${showLeftModal ? 'left-[25rem]' : 'left-0'
                            }`}>
                            <MapView
                                center={mapCenter}
                                markers={markers}
                                showControls={true}
                                onMarkerClick={handleMarkerClick}
                            />
                        </div>

                        {/* Top Controls Row - Always Visible */}
                        <div className="absolute left-4 top-4 flex items-center gap-2 z-[999]">
                            {/* Hamburger Menu Button */}
                            <button
                                onClick={() => setShowFullList(!showFullList)}
                                className="w-10 h-10 bg-white rounded-lg shadow-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-all"
                                title="Toggle full list view"
                            >
                                {showFullList ? <X className="w-5 h-5 text-gray-700" /> : <Menu className="w-5 h-5 text-gray-700" />}
                            </button>

                            {/* Search Input - Always Visible */}
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10 pr-4 py-2 rounded-lg border border-gray-200 shadow-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm w-48 bg-white"
                                />
                            </div>

                            {/* Pill-shaped Filter Buttons - Always Visible */}
                            <button
                                onClick={() => toggleFilter('office')}
                                className={`px-4 py-2 rounded-full font-medium text-sm shadow-lg border transition-all flex items-center gap-2 ${filters.office
                                    ? 'bg-amber-500 text-white border-amber-600'
                                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                                    }`}
                            >
                                <Building2 className="w-4 h-4" />
                                Office
                            </button>
                            <button
                                onClick={() => toggleFilter('vehicles')}
                                className={`px-4 py-2 rounded-full font-medium text-sm shadow-lg border transition-all flex items-center gap-2 ${filters.vehicles
                                    ? 'bg-blue-500 text-white border-blue-600'
                                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                                    }`}
                            >
                                <Truck className="w-4 h-4" />
                                Vehicles
                            </button>
                            <button
                                onClick={() => toggleFilter('drivers')}
                                className={`px-4 py-2 rounded-full font-medium text-sm shadow-lg border transition-all flex items-center gap-2 ${filters.drivers
                                    ? 'bg-green-500 text-white border-green-600'
                                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                                    }`}
                            >
                                <User className="w-4 h-4" />
                                Drivers
                            </button>
                            <button
                                onClick={() => toggleFilter('trips')}
                                className={`px-4 py-2 rounded-full font-medium text-sm shadow-lg border transition-all flex items-center gap-2 ${filters.trips
                                    ? 'bg-purple-500 text-white border-purple-600'
                                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                                    }`}
                            >
                                <Navigation className="w-4 h-4" />
                                Trips
                            </button>
                        </div>

                        {/* Full Screen List View - When Hamburger Clicked */}
                        {showFullList && (
                            <div className="absolute inset-0 bg-white z-[1000] overflow-y-auto">
                                <div className="p-6">
                                    <div className="flex items-center justify-between mb-6">
                                        <h2 className="text-2xl font-bold text-gray-900">Fleet Overview</h2>
                                        <button
                                            onClick={() => setShowFullList(false)}
                                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                        >
                                            <X className="w-6 h-6 text-gray-700" />
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {allMarkers.map((marker, index) => {
                                            const isOffice = marker.type === 'office' || marker.type === 'building';
                                            const isVehicle = marker.type === 'vehicle';
                                            const isDriver = marker.type === 'driver';
                                            const isTrip = marker.type === 'trip';

                                            return (
                                                <div
                                                    key={index}
                                                    onClick={() => {
                                                        handleItemClick(marker);
                                                        setShowFullList(false);
                                                    }}
                                                    className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-all cursor-pointer"
                                                >
                                                    <div className="flex items-start gap-3">
                                                        {isOffice && <Building2 className="w-8 h-8 text-amber-500 flex-shrink-0" />}
                                                        {isVehicle && <Truck className="w-8 h-8 text-blue-500 flex-shrink-0" />}
                                                        {isDriver && <User className="w-8 h-8 text-green-500 flex-shrink-0" />}
                                                        {isTrip && <Navigation className="w-8 h-8 text-purple-500 flex-shrink-0" />}

                                                        <div className="flex-1 min-w-0">
                                                            <h3 className="font-semibold text-gray-900 truncate">{marker.label}</h3>
                                                            {isOffice && marker.data && (
                                                                <p className="text-sm text-gray-600 mt-1">{marker.data.address}</p>
                                                            )}
                                                            {isVehicle && marker.data && (
                                                                <p className="text-sm text-gray-600 mt-1">
                                                                    {marker.data.regnNo} • {marker.data.status}
                                                                </p>
                                                            )}
                                                            {isDriver && marker.data && (
                                                                <p className="text-sm text-gray-600 mt-1">
                                                                    {marker.data.dlNumber}
                                                                </p>
                                                            )}
                                                            {isTrip && marker.data && (
                                                                <p className="text-sm text-gray-600 mt-1">
                                                                    {marker.data.origin} → {marker.data.destination}
                                                                </p>
                                                            )}
                                                        </div>
                                                        <ArrowRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Left Modal - Filtered Items List */}
                        {showLeftModal && (filters.office || filters.vehicles || filters.drivers || filters.trips) && (
                            <div className="absolute left-4 top-20 bottom-4 bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden z-[998] w-96 flex flex-col">
                                <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                                    <h3 className="font-semibold text-gray-900">{searchQuery}</h3>
                                    <button
                                        onClick={() => {
                                            setShowLeftModal(false);
                                            setSelectedItemDetails(null);
                                            setFilters({ office: false, vehicles: false, drivers: false, trips: false });
                                            setSearchQuery('');
                                        }}
                                        className="p-1 hover:bg-gray-100 rounded transition-colors"
                                    >
                                        <X className="w-5 h-5 text-gray-600" />
                                    </button>
                                </div>
                                <div className="flex-1 overflow-y-auto">
                                    {getFilteredItems().length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                                            {filters.office && <Building2 className="w-12 h-12 text-amber-300 mb-3" />}
                                            {filters.vehicles && <Truck className="w-12 h-12 text-blue-300 mb-3" />}
                                            {filters.drivers && <User className="w-12 h-12 text-green-300 mb-3" />}
                                            {filters.trips && <Navigation className="w-12 h-12 text-purple-300 mb-3" />}
                                            <p className="text-gray-900 font-medium mb-1">
                                                No {searchQuery} Available
                                            </p>
                                            <p className="text-sm text-gray-500">
                                                {filters.office && "Office location not set"}
                                                {filters.vehicles && "No vehicles registered yet"}
                                                {filters.drivers && "No drivers hired yet"}
                                                {filters.trips && "No active trips at the moment"}
                                            </p>
                                        </div>
                                    ) : (
                                        getFilteredItems().map((item, index) => {
                                            const isOffice = item.type === 'office' || item.type === 'building';
                                            const isVehicle = item.type === 'vehicle';
                                            const isDriver = item.type === 'driver';
                                            const isTrip = item.type === 'trip';

                                            return (
                                                <div
                                                    key={index}
                                                    onClick={() => handleItemClick(item)}
                                                    className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${selectedItemDetails === item ? 'bg-blue-50' : ''
                                                        }`}
                                                >
                                                    <div className="flex items-start gap-3">
                                                        {isOffice && <Building2 className="w-5 h-5 text-amber-500 flex-shrink-0 mt-1" />}
                                                        {isVehicle && <Truck className="w-5 h-5 text-blue-500 flex-shrink-0 mt-1" />}
                                                        {isDriver && <User className="w-5 h-5 text-green-500 flex-shrink-0 mt-1" />}
                                                        {isTrip && <Navigation className="w-5 h-5 text-purple-500 flex-shrink-0 mt-1" />}

                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="font-medium text-gray-900 truncate">{item.label}</h4>
                                                            {isVehicle && item.data && (
                                                                <div className="text-sm text-gray-600 mt-1">
                                                                    <p>{item.data.regnNo}</p>
                                                                    <p className={`inline-block px-2 py-0.5 rounded-full text-xs mt-1 ${item.data.status === 'Available'
                                                                        ? 'bg-green-100 text-green-700'
                                                                        : 'bg-red-100 text-red-700'
                                                                        }`}>
                                                                        {item.data.status}
                                                                    </p>
                                                                </div>
                                                            )}
                                                            {isDriver && item.data && (
                                                                <p className="text-sm text-gray-600 mt-1">{item.data.dlNumber}</p>
                                                            )}
                                                            {isTrip && item.data && (
                                                                <p className="text-sm text-gray-600 mt-1">
                                                                    {item.data.origin} → {item.data.destination}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Right Modal - Item Details (Google Maps Style) */}
                        {selectedItemDetails && showLeftModal && (
                            <div className="absolute left-[26rem] top-20 bottom-4 w-[400px] bg-white rounded-lg shadow-2xl z-[999] overflow-hidden flex flex-col">
                                {/* Close Button */}
                                <button
                                    onClick={() => setSelectedItemDetails(null)}
                                    className="absolute top-4 right-4 p-2 bg-white rounded-full shadow-lg hover:bg-gray-50 transition-colors z-10"
                                >
                                    <X className="w-5 h-5 text-gray-700" />
                                </button>

                                <div className="flex-1 overflow-y-auto">
                                    {/* Office Details */}
                                    {(selectedItemDetails.type === 'office' || selectedItemDetails.type === 'building') && selectedItemDetails.data && (
                                        <>
                                            <div className="w-full h-56 bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
                                                <Building2 className="w-24 h-24 text-white" />
                                            </div>
                                            <div className="p-6">
                                                <h2 className="text-2xl font-bold text-gray-900 mb-1">{selectedItemDetails.label}</h2>
                                                <p className="text-sm text-gray-600 mb-6">Office Location</p>

                                                <div className="space-y-3 border-t border-gray-200 pt-4">
                                                    <div className="flex items-start gap-3">
                                                        <MapPin className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                                                        <p className="text-sm text-gray-700">{selectedItemDetails.data.address}</p>
                                                    </div>
                                                    {selectedItemDetails.data.phone && (
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-5 h-5 flex items-center justify-center">
                                                                <span className="text-gray-400">📞</span>
                                                            </div>
                                                            <p className="text-sm text-gray-700">{selectedItemDetails.data.phone}</p>
                                                        </div>
                                                    )}
                                                    {selectedItemDetails.data.email && (
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-5 h-5 flex items-center justify-center">
                                                                <span className="text-gray-400">✉️</span>
                                                            </div>
                                                            <p className="text-sm text-gray-700">{selectedItemDetails.data.email}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    {/* Vehicle Details */}
                                    {selectedItemDetails.type === 'vehicle' && selectedItemDetails.data && (
                                        <>
                                            {selectedItemDetails.data.vehicleImage ? (
                                                <img
                                                    src={selectedItemDetails.data.vehicleImage}
                                                    alt={selectedItemDetails.label}
                                                    className="w-full h-56 object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-56 bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                                                    <Truck className="w-24 h-24 text-white" />
                                                </div>
                                            )}
                                            <div className="p-6">
                                                <h2 className="text-2xl font-bold text-gray-900 mb-1">{selectedItemDetails.label}</h2>
                                                <p className="text-sm text-gray-600 mb-4">Vehicle • {selectedItemDetails.data.regnNo}</p>

                                                <div className="flex gap-2 mb-6">
                                                    <button
                                                        onClick={() => navigate(`/business/vehicles`)}
                                                        className="flex-1 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
                                                    >
                                                        <ArrowRight className="w-4 h-4" />
                                                        View Details
                                                    </button>
                                                    <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                                                        <Navigation className="w-5 h-5 text-gray-600" />
                                                    </button>
                                                </div>

                                                <div className="space-y-3 border-t border-gray-200 pt-4">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-sm text-gray-600">Status</span>
                                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${selectedItemDetails.data.status === 'Available'
                                                            ? 'bg-green-100 text-green-700'
                                                            : 'bg-red-100 text-red-700'
                                                            }`}>
                                                            {selectedItemDetails.data.status}
                                                        </span>
                                                    </div>
                                                    {selectedItemDetails.data.model && (
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-sm text-gray-600">Model</span>
                                                            <span className="text-sm text-gray-900 font-medium">{selectedItemDetails.data.model}</span>
                                                        </div>
                                                    )}
                                                    {selectedItemDetails.data.capacity && (
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-sm text-gray-600">Capacity</span>
                                                            <span className="text-sm text-gray-900 font-medium">{selectedItemDetails.data.capacity}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    {/* Driver Details */}
                                    {selectedItemDetails.type === 'driver' && selectedItemDetails.data && (
                                        <>
                                            {selectedItemDetails.data.profilePicture ? (
                                                <img
                                                    src={selectedItemDetails.data.profilePicture}
                                                    alt={selectedItemDetails.label}
                                                    className="w-full h-56 object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-56 bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
                                                    <User className="w-24 h-24 text-white" />
                                                </div>
                                            )}
                                            <div className="p-6">
                                                <h2 className="text-2xl font-bold text-gray-900 mb-1">{selectedItemDetails.label}</h2>
                                                <p className="text-sm text-gray-600 mb-4">Driver • {selectedItemDetails.data.dlNumber}</p>

                                                <div className="flex gap-2 mb-6">
                                                    <button
                                                        onClick={() => navigate(`/business/drivers`)}
                                                        className="flex-1 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
                                                    >
                                                        <ArrowRight className="w-4 h-4" />
                                                        View Profile
                                                    </button>
                                                    <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                                                        <Navigation className="w-5 h-5 text-gray-600" />
                                                    </button>
                                                </div>

                                                <div className="space-y-3 border-t border-gray-200 pt-4">
                                                    {selectedItemDetails.data.phone && (
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-sm text-gray-600">Phone</span>
                                                            <span className="text-sm text-gray-900 font-medium">{selectedItemDetails.data.phone}</span>
                                                        </div>
                                                    )}
                                                    {selectedItemDetails.data.experience && (
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-sm text-gray-600">Experience</span>
                                                            <span className="text-sm text-gray-900 font-medium">{selectedItemDetails.data.experience} years</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    {/* Trip Details */}
                                    {selectedItemDetails.type === 'trip' && selectedItemDetails.data && (
                                        <>
                                            {selectedItemDetails.data.vehicleImage ? (
                                                <img
                                                    src={selectedItemDetails.data.vehicleImage}
                                                    alt="Trip Vehicle"
                                                    className="w-full h-56 object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-56 bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center">
                                                    <Navigation className="w-24 h-24 text-white" />
                                                </div>
                                            )}
                                            <div className="p-6">
                                                <h2 className="text-2xl font-bold text-gray-900 mb-1">{selectedItemDetails.label}</h2>
                                                <p className="text-sm text-gray-600 mb-4">Active Trip</p>

                                                <div className="flex gap-2 mb-6">
                                                    <button
                                                        onClick={() => navigate(`/business/trips`)}
                                                        className="flex-1 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors flex items-center justify-center gap-2"
                                                    >
                                                        <ArrowRight className="w-4 h-4" />
                                                        Track Trip
                                                    </button>
                                                    <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                                                        <Navigation className="w-5 h-5 text-gray-600" />
                                                    </button>
                                                </div>

                                                <div className="space-y-3 border-t border-gray-200 pt-4">
                                                    <div className="flex items-start gap-3">
                                                        <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                                                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className="text-xs text-gray-500">Origin</p>
                                                            <p className="text-sm text-gray-900 font-medium">{selectedItemDetails.data.origin}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-start gap-3">
                                                        <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                                                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className="text-xs text-gray-500">Destination</p>
                                                            <p className="text-sm text-gray-900 font-medium">{selectedItemDetails.data.destination}</p>
                                                        </div>
                                                    </div>
                                                    {selectedItemDetails.data.status && (
                                                        <div className="flex items-center justify-between pt-2">
                                                            <span className="text-sm text-gray-600">Status</span>
                                                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${selectedItemDetails.data.status === 'In Progress'
                                                                ? 'bg-blue-100 text-blue-700'
                                                                : 'bg-gray-100 text-gray-700'
                                                                }`}>
                                                                {selectedItemDetails.data.status}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {selectedItemDetails.data.driver && (
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-sm text-gray-600">Driver</span>
                                                            <span className="text-sm text-gray-900 font-medium">{selectedItemDetails.data.driver}</span>
                                                        </div>
                                                    )}
                                                    {selectedItemDetails.data.vehicle && (
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-sm text-gray-600">Vehicle</span>
                                                            <span className="text-sm text-gray-900 font-medium">{selectedItemDetails.data.vehicle}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default LiveFleetMap;

