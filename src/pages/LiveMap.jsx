import React, { useState, useEffect } from 'react';
import { Loader2, MapPin, Building2, Truck, User, Filter, Navigation, Gauge } from 'lucide-react';
import { io } from 'socket.io-client';
import MapView from '../components/common/MapView';
import LocationDetailModal from '../components/common/LocationDetailModal';
import { authService } from '../services/authService';
import { vehicleService } from '../services/vehicleService';
import { hiringService } from '../services/hiringService';
import { tripService } from '../services/tripService';

const LiveMap = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [mapCenter, setMapCenter] = useState({ lng: 78.9629, lat: 20.5937, zoom: 4 });
    const [markers, setMarkers] = useState([]);
    const [allMarkers, setAllMarkers] = useState([]); // Store all markers for filtering
    const [officeLocation, setOfficeLocation] = useState(null);
    const [stats, setStats] = useState({ totalVehicles: 0, totalDrivers: 0, totalTrips: 0, officeSet: false });
    const [filters, setFilters] = useState({ office: true, vehicles: true, drivers: true, trips: true });
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [modalType, setModalType] = useState(null);
    const [vehiclesData, setVehiclesData] = useState([]);
    const [driversData, setDriversData] = useState([]);
    const [profileData, setProfileData] = useState(null);
    const [socket, setSocket] = useState(null);
    const [userSocket, setUserSocket] = useState(null); // Socket for user-service
    const [traccarPositions, setTraccarPositions] = useState({});
    const [traccarInterval, setTraccarInterval] = useState(null);
    const [mapUpdateKey, setMapUpdateKey] = useState(0);

    // Initialize Socket.IO connection to trip-service
    useEffect(() => {
        const TRIP_SERVICE_URL = import.meta.env.VITE_TRIP_SERVICE_URL || 'http://localhost:5004';
        const newSocket = io(TRIP_SERVICE_URL, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 5
        });

        newSocket.on('connect', () => {
            console.log('Socket.IO connected to trip-service');
            // Join fleet room with user ID
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

    // Initialize Socket.IO connection to user-service for profile updates
    useEffect(() => {
        const USER_SERVICE_URL = import.meta.env.VITE_USER_SERVICE_URL || 'http://localhost:5001';
        const newUserSocket = io(USER_SERVICE_URL, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 5
        });

        newUserSocket.on('connect', () => {
            console.log('Socket.IO connected to user-service');
            // Join user room with user ID
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
                // Update existing marker
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
                // Add new marker for active trip vehicle
                updatedMarkers.push({
                    id: `trip-${tripId}`,
                    lng: location.longitude,
                    lat: location.latitude,
                    type: 'vehicle',
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
            
            // Update office location state
            setOfficeLocation({ lng, lat });
            
            // Update map center to new office location
            setMapCenter({ lng, lat, zoom: 12 });
            
            // Update markers - replace office marker and reposition vehicles/drivers
            setAllMarkers(prevMarkers => {
                const updatedMarkers = [...prevMarkers];
                
                // Find and update office marker
                const officeMarkerIndex = updatedMarkers.findIndex(m => m.id === 'office');
                if (officeMarkerIndex !== -1) {
                    updatedMarkers[officeMarkerIndex] = {
                        ...updatedMarkers[officeMarkerIndex],
                        lng,
                        lat,
                        label: companyName || 'Office Location'
                    };
                } else {
                    // Add office marker if it doesn't exist
                    updatedMarkers.unshift({
                        id: 'office',
                        lng,
                        lat,
                        type: 'building',
                        label: companyName || 'Office Location',
                        data: { officeLocation, companyName }
                    });
                }
                
                // Reposition idle vehicles and drivers around new office location
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
            
            // Update profile data
            setProfileData(prev => ({
                ...prev,
                officeLocation,
                companyName
            }));
            
            console.log('Office location updated on map:', { lng, lat });
        }
    };

    useEffect(() => {
        fetchMapData();
        
        // Start fetching live tracking positions
        fetchLiveTrackingPositions();
        
        // Set up interval to fetch positions every 5 seconds
        const interval = setInterval(fetchLiveTrackingPositions, 5000);
        setTraccarInterval(interval);
        
        return () => {
            if (interval) clearInterval(interval);
        };
    }, []);

    // Apply filters whenever filters or allMarkers change
    useEffect(() => {
        console.log('🔄 Applying filters to markers. Total markers:', allMarkers.length);
        const filtered = allMarkers.filter(marker => {
            if (marker.type === 'office' || marker.type === 'building') return filters.office;
            if (marker.type === 'vehicle') return filters.vehicles;
            if (marker.type === 'driver') return filters.drivers;
            if (marker.type === 'trip') return filters.trips;
            return true;
        });
        console.log('✅ Filtered markers:', filtered.length);
        setMarkers(filtered);
    }, [filters, allMarkers]);

    const fetchLiveTrackingPositions = async () => {
        try {
            // Get vehicles with tracking credentials
            const trackedVehicles = await vehicleService.getVehiclesWithTracking();
            
            if (trackedVehicles.length === 0) {
                console.log('No vehicles with tracking credentials found');
                return;
            }
            
            console.log(`Fetching positions for ${trackedVehicles.length} tracked vehicle(s)`);
            const newPositions = {};
            let successCount = 0;
            let failCount = 0;
            
            // Fetch positions for each tracked vehicle
            for (const vehicle of trackedVehicles) {
                if (vehicle.trackingCredentials) {
                    try {
                        const positions = await vehicleService.fetchTraccarPositions(
                            vehicle.trackingCredentials.email,
                            vehicle.trackingCredentials.password
                        );
                        
                        if (positions && positions.length > 0) {
                            // Get the latest position (first in array is most recent)
                            const latestPosition = positions[0];
                            
                            // Validate coordinates
                            if (latestPosition.latitude && latestPosition.longitude) {
                                newPositions[vehicle._id] = {
                                    latitude: latestPosition.latitude,
                                    longitude: latestPosition.longitude,
                                    speed: latestPosition.speed || 0,
                                    course: latestPosition.course || 0,
                                    altitude: latestPosition.altitude || 0,
                                    valid: latestPosition.valid !== undefined ? latestPosition.valid : true,
                                    deviceId: latestPosition.deviceId,
                                    fixTime: latestPosition.fixTime,
                                    serverTime: latestPosition.serverTime,
                                    attributes: latestPosition.attributes || {}
                                };
                                successCount++;
                                console.log(`✓ Position fetched for ${vehicle.regnNo || vehicle._id}: [${latestPosition.latitude}, ${latestPosition.longitude}]`);
                            } else {
                                console.warn(`Invalid coordinates for vehicle ${vehicle.regnNo || vehicle._id}`);
                                failCount++;
                            }
                        } else {
                            console.warn(`No positions returned for vehicle ${vehicle.regnNo || vehicle._id}`);
                            failCount++;
                        }
                    } catch (err) {
                        console.error(`✗ Failed to fetch Traccar position for vehicle ${vehicle.regnNo || vehicle._id}:`, err.message);
                        failCount++;
                    }
                }
            }
            
            console.log(`Position fetch complete: ${successCount} successful, ${failCount} failed`);
            
            if (Object.keys(newPositions).length > 0) {
                setTraccarPositions(newPositions);
                // Update markers with live tracking positions
                updateMarkersWithTraccarData(newPositions);
            }
            
        } catch (err) {
            console.error('Error fetching live tracking positions:', err);
        }
    };

    const updateMarkersWithTraccarData = (positions) => {
        if (!positions || Object.keys(positions).length === 0) {
            return;
        }

        console.log('🚗 Updating markers with Traccar data:', Object.keys(positions).length, 'vehicles');
        
        setAllMarkers(prevMarkers => {
            // Create a completely new array to ensure React detects the change
            const updatedMarkers = prevMarkers.map(marker => ({ ...marker }));
            let hasUpdates = false;
            
            Object.entries(positions).forEach(([vehicleId, position]) => {
                // Validate position data
                if (!position.latitude || !position.longitude) {
                    console.warn(`⚠️ Invalid position data for vehicle ${vehicleId}:`, position);
                    return;
                }

                const markerIndex = updatedMarkers.findIndex(
                    marker => marker.id === `vehicle-${vehicleId}`
                );
                
                if (markerIndex !== -1) {
                    // Check if position has actually changed
                    const oldMarker = updatedMarkers[markerIndex];
                    const positionChanged = 
                        Math.abs(oldMarker.lng - position.longitude) > 0.00001 || 
                        Math.abs(oldMarker.lat - position.latitude) > 0.00001;

                    console.log(`📍 Vehicle ${vehicleId}: Old=[${oldMarker.lat.toFixed(6)}, ${oldMarker.lng.toFixed(6)}], New=[${position.latitude.toFixed(6)}, ${position.longitude.toFixed(6)}], Changed=${positionChanged}`);

                    // Always update to ensure speed and other attributes are current
                    updatedMarkers[markerIndex] = {
                        ...updatedMarkers[markerIndex],
                        lng: position.longitude,
                        lat: position.latitude,
                        data: {
                            ...updatedMarkers[markerIndex].data,
                            liveTracking: true,
                            speed: position.speed,
                            course: position.course,
                            altitude: position.altitude,
                            valid: position.valid,
                            deviceId: position.deviceId,
                            lastUpdate: new Date(position.fixTime).toLocaleString(),
                            attributes: position.attributes
                        }
                    };
                    hasUpdates = true;

                    if (positionChanged) {
                        console.log(`🚀 Vehicle ${vehicleId} moved @ ${(position.speed * 3.6).toFixed(1)} km/h`);
                    }
                } else {
                    // Add new marker for tracked vehicle (not previously on map)
                    const vehicleData = vehiclesData.find(v => v._id === vehicleId);
                    if (vehicleData) {
                        console.log(`➕ Adding new tracked vehicle to map: ${vehicleData.regnNo} at [${position.latitude.toFixed(6)}, ${position.longitude.toFixed(6)}]`);
                        updatedMarkers.push({
                            id: `vehicle-${vehicleId}`,
                            lng: position.longitude,
                            lat: position.latitude,
                            type: 'vehicle',
                            label: vehicleData.regnNo || 'Tracked Vehicle',
                            data: {
                                ...vehicleData,
                                liveTracking: true,
                                speed: position.speed,
                                course: position.course,
                                altitude: position.altitude,
                                valid: position.valid,
                                deviceId: position.deviceId,
                                lastUpdate: new Date(position.fixTime).toLocaleString(),
                                attributes: position.attributes
                            }
                        });
                        hasUpdates = true;
                    }
                }
            });
            
            if (hasUpdates) {
                console.log('✅ Returning updated markers array, total:', updatedMarkers.length);
                // Increment map update key to force re-render
                setMapUpdateKey(prev => prev + 1);
                // Return the new array to trigger state update
                return updatedMarkers;
            }
            
            // Return prevMarkers if no updates to avoid unnecessary re-render
            return prevMarkers;
        });

        // Auto-center map on first tracked vehicle with valid position (only on initial load)
        const firstPosition = Object.values(positions)[0];
        if (firstPosition && firstPosition.latitude && firstPosition.longitude) {
            // Only center once on first load, not on every update
            if (!traccarPositions || Object.keys(traccarPositions).length === 0) {
                console.log('🎯 Centering map on tracked vehicle:', [firstPosition.longitude, firstPosition.latitude]);
                setMapCenter({
                    lng: firstPosition.longitude,
                    lat: firstPosition.latitude,
                    zoom: 14
                });
            }
        }
    };

    const toggleFilter = (filterType) => {
        setFilters(prev => ({ ...prev, [filterType]: !prev[filterType] }));
    };

    const fetchMapData = async () => {
        try {
            setLoading(true);
            setError(null);

            // Fetch user profile for office location
            const profileResponse = await authService.getProfile();
            console.log('Profile response:', profileResponse);

            // Extract user data from response (API returns { user: {...} })
            const profileDataObj = profileResponse.user || profileResponse;
            console.log('Profile data:', profileDataObj);
            setProfileData(profileDataObj);

            // Fetch vehicles
            const vehiclesDataArr = await vehicleService.getVehicles();
            console.log('Vehicles data:', vehiclesDataArr);
            setVehiclesData(vehiclesDataArr);

            // Fetch drivers (employees)
            let driversDataArr = [];
            try {
                const employeesResponse = await hiringService.getCompanyEmployees('ACTIVE');
                driversDataArr = employeesResponse.employees || [];
                console.log('Drivers data:', driversDataArr);
                setDriversData(driversDataArr);
            } catch (err) {
                console.warn('Could not fetch drivers:', err);
            }

            // Fetch active trips with live locations
            let activeTripsData = [];
            try {
                activeTripsData = await tripService.getActiveTripsWithLocations();
                console.log('Active trips data:', activeTripsData);
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
                    data: profileDataObj
                });

                // Create a Set of vehicle IDs that are on active trips
                const activeVehicleIds = new Set(
                    activeTripsData
                        .filter(trip => trip.currentLocation?.coordinates?.length === 2)
                        .map(trip => trip.vehicleId?._id)
                );

                // Add vehicle markers (only for non-active vehicles at office location)
                vehiclesDataArr.forEach((vehicle, index) => {
                    // Skip vehicles that are on active trips
                    if (activeVehicleIds.has(vehicle._id)) {
                        return;
                    }

                    // Offset vehicles slightly to avoid overlap
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
                        data: vehicle
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
                    // Offset drivers slightly to avoid overlap (opposite side from vehicles)
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
                        data: driver
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
        console.log('Marker clicked:', marker);
        setSelectedLocation(marker.data);
        setModalType(marker.type === 'building' ? 'office' : marker.type);
    };

    const closeModal = () => {
        setSelectedLocation(null);
        setModalType(null);
    };

    return (
        <div className="flex flex-col h-full">
            {/* Map Card with Header */}
            <div className="flex-1 bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col">
                {/* Card Header with Legend */}
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-amber-500" />
                        <span className="font-semibold text-gray-900">Live Fleet Map</span>
                    </div>
                    
                    {/* Legend Filters - Horizontal Layout */}
                    <div className="flex items-center gap-2">
                        {/* Vehicles */}
                        <button
                            onClick={() => toggleFilter('vehicles')}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all hover:shadow-sm ${
                                filters.vehicles
                                    ? 'bg-blue-50 border-blue-500'
                                    : 'bg-gray-50 border-gray-300 opacity-60'
                            }`}
                            title={`${filters.vehicles ? 'Hide' : 'Show'} vehicles`}
                        >
                            <div className={`w-6 h-6 rounded flex items-center justify-center ${
                                filters.vehicles ? 'bg-blue-500' : 'bg-gray-400'
                            }`}>
                                <Truck className="w-3.5 h-3.5 text-white" />
                            </div>
                            <div className="flex flex-col items-start">
                                <span className={`text-xs font-semibold leading-none ${
                                    filters.vehicles ? 'text-blue-700' : 'text-gray-500'
                                }`}>
                                    Vehicles
                                </span>
                                <span className="text-[10px] text-gray-500 leading-none mt-0.5">{stats.totalVehicles} idle</span>
                            </div>
                        </button>

                        {/* Drivers */}
                        <button
                            onClick={() => toggleFilter('drivers')}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all hover:shadow-sm ${
                                filters.drivers
                                    ? 'bg-green-50 border-green-500'
                                    : 'bg-gray-50 border-gray-300 opacity-60'
                            }`}
                            title={`${filters.drivers ? 'Hide' : 'Show'} drivers`}
                        >
                            <div className={`w-6 h-6 rounded flex items-center justify-center ${
                                filters.drivers ? 'bg-green-500' : 'bg-gray-400'
                            }`}>
                                <User className="w-3.5 h-3.5 text-white" />
                            </div>
                            <div className="flex flex-col items-start">
                                <span className={`text-xs font-semibold leading-none ${
                                    filters.drivers ? 'text-green-700' : 'text-gray-500'
                                }`}>
                                    Drivers
                                </span>
                                <span className="text-[10px] text-gray-500 leading-none mt-0.5">{stats.totalDrivers} total</span>
                            </div>
                        </button>

                        {/* Active Trips */}
                        <button
                            onClick={() => toggleFilter('trips')}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all hover:shadow-sm ${
                                filters.trips
                                    ? 'bg-purple-50 border-purple-500'
                                    : 'bg-gray-50 border-gray-300 opacity-60'
                            }`}
                            title={`${filters.trips ? 'Hide' : 'Show'} active trips`}
                        >
                            <div className={`w-6 h-6 rounded flex items-center justify-center ${
                                filters.trips ? 'bg-purple-500' : 'bg-gray-400'
                            }`}>
                                <Navigation className="w-3.5 h-3.5 text-white" />
                            </div>
                            <div className="flex flex-col items-start">
                                <span className={`text-xs font-semibold leading-none ${
                                    filters.trips ? 'text-purple-700' : 'text-gray-500'
                                }`}>
                                    Active Trips
                                </span>
                                <span className="text-[10px] text-gray-500 leading-none mt-0.5">{stats.totalTrips} ongoing</span>
                            </div>
                        </button>
                    </div>
                </div>

                {/* Map Content Area */}
                <div className="flex-1 relative bg-slate-100 overflow-hidden">
                {loading ? (
                    <div className="w-full h-full flex items-center justify-center">
                        <div className="text-center">
                            <Loader2 className="w-12 h-12 animate-spin text-amber-500 mx-auto mb-3" />
                            <p className="text-base text-gray-600">Loading map...</p>
                        </div>
                    </div>
                ) : error ? (
                    <div className="w-full h-full flex items-center justify-center p-6">
                        <div className="text-center max-w-md">
                            <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                            <p className="text-base font-medium text-gray-900 mb-2">Failed to Load Map</p>
                            <p className="text-sm text-gray-600 mb-4">{error}</p>
                            <button
                                onClick={fetchMapData}
                                className="bg-amber-500 text-white px-6 py-2 rounded-lg hover:bg-amber-600 transition-colors font-medium"
                            >
                                Try Again
                            </button>
                        </div>
                    </div>
                ) : !officeLocation ? (
                    <div className="w-full h-full flex items-center justify-center p-6">
                        <div className="text-center max-w-md">
                            <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                            <p className="text-lg font-semibold text-gray-900 mb-2">No Office Location Set</p>
                            <p className="text-sm text-gray-600 mb-4">
                                To view your fleet on the map, please set your office location in the Settings tab.
                            </p>
                            <a
                                href="/dashboard?tab=settings"
                                className="inline-block bg-amber-500 text-white px-6 py-2 rounded-lg hover:bg-amber-600 transition-colors font-medium"
                            >
                                Go to Settings
                            </a>
                        </div>
                    </div>
                ) : (
                    <>
                        <MapView
                            key={mapUpdateKey}
                            center={mapCenter}
                            markers={markers}
                            showControls={true}
                            onMarkerClick={handleMarkerClick}
                        />
                        
                        {/* Speed Overlay for Live Tracked Vehicles */}
                        {Object.keys(traccarPositions).length > 0 && (
                            <div className="absolute top-4 left-4 z-[1000] bg-white rounded-lg shadow-lg border-2 border-gray-200 max-w-xs">
                                <div className="px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg flex items-center gap-2">
                                    <Gauge className="w-5 h-5" />
                                    <h3 className="font-semibold text-sm">Live Tracking</h3>
                                </div>
                                <div className="max-h-64 overflow-y-auto">
                                    {Object.entries(traccarPositions).map(([vehicleId, position]) => {
                                        const vehicle = vehiclesData.find(v => v._id === vehicleId);
                                        const speedKmh = (position.speed * 3.6).toFixed(1);
                                        const isMoving = position.speed > 0.5;
                                        
                                        return (
                                            <div key={vehicleId} className="px-4 py-3 border-b border-gray-200 last:border-b-0 hover:bg-gray-50 transition-colors">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2 flex-1">
                                                        <div className={`w-2 h-2 rounded-full ${
                                                            isMoving ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                                                        }`} />
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-semibold text-gray-900 truncate">
                                                                {vehicle?.regnNo || 'Unknown Vehicle'}
                                                            </p>
                                                            <p className="text-xs text-gray-500">
                                                                {position.valid ? 'Valid GPS' : 'Invalid GPS'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right ml-3">
                                                        <div className="text-2xl font-bold text-gray-900">{speedKmh}</div>
                                                        <div className="text-xs text-gray-500">km/h</div>
                                                    </div>
                                                </div>
                                                {position.attributes?.batteryLevel && (
                                                    <div className="mt-2 flex items-center gap-2 text-xs text-gray-600">
                                                        <span>Battery: {position.attributes.batteryLevel}%</span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </>
                )}
                </div>
            </div>

            {/* Location Detail Modal */}
            {selectedLocation && modalType && (
                <LocationDetailModal
                    data={selectedLocation}
                    type={modalType}
                    onClose={closeModal}
                />
            )}
        </div>
    );
};

export default LiveMap;
