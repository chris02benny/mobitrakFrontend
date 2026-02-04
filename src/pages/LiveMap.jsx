import React, { useState, useEffect } from 'react';
import { Loader2, MapPin, Building2, Truck, User, Filter } from 'lucide-react';
import MapView from '../components/common/MapView';
import LocationDetailModal from '../components/common/LocationDetailModal';
import { authService } from '../services/authService';
import { vehicleService } from '../services/vehicleService';
import { hiringService } from '../services/hiringService';

const LiveMap = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [mapCenter, setMapCenter] = useState({ lng: 78.9629, lat: 20.5937, zoom: 4 });
    const [markers, setMarkers] = useState([]);
    const [allMarkers, setAllMarkers] = useState([]); // Store all markers for filtering
    const [officeLocation, setOfficeLocation] = useState(null);
    const [stats, setStats] = useState({ totalVehicles: 0, totalDrivers: 0, officeSet: false });
    const [filters, setFilters] = useState({ office: true, vehicles: true, drivers: true });
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [modalType, setModalType] = useState(null);
    const [vehiclesData, setVehiclesData] = useState([]);
    const [driversData, setDriversData] = useState([]);
    const [profileData, setProfileData] = useState(null);

    useEffect(() => {
        fetchMapData();
    }, []);

    // Apply filters whenever filters or allMarkers change
    useEffect(() => {
        applyFilters();
    }, [filters, allMarkers]);

    const applyFilters = () => {
        const filtered = allMarkers.filter(marker => {
            if (marker.type === 'office' || marker.type === 'building') return filters.office;
            if (marker.type === 'vehicle') return filters.vehicles;
            if (marker.type === 'driver') return filters.drivers;
            return true;
        });
        setMarkers(filtered);
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

                // Add vehicle markers at office location (since they're not assigned to trips)
                vehiclesDataArr.forEach((vehicle, index) => {
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
            {/* Map Container - Full Height */}
            <div className="flex-1 bg-white border border-gray-200 rounded-xl overflow-hidden relative">
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
                    <div className="relative w-full h-full">
                        {/* Map View */}
                        <div className="absolute inset-0 z-0">
                            <MapView
                                center={mapCenter}
                                markers={markers}
                                showControls={true}
                                onMarkerClick={handleMarkerClick}
                            />
                        </div>
                        
                        {/* Legends Overlay - Bottom Left of Map */}
                        <div 
                            className="absolute bottom-6 left-6 pointer-events-auto" 
                            style={{ zIndex: 99999, position: 'absolute' }}
                        >
                            <div className="bg-white rounded-lg shadow-2xl border-2 border-gray-400 p-4 w-[230px]">
                                <div className="flex flex-col gap-3">
                                    <div className="flex items-center gap-2 pb-2 border-b-2 border-gray-300">
                                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                                        <span className="text-sm font-bold text-gray-800">Map Legend</span>
                                    </div>
                                    
                                    <div className="flex flex-col gap-2.5">
                                        {/* Vehicles */}
                                        <button
                                            onClick={() => toggleFilter('vehicles')}
                                            className={`flex items-center gap-3 px-3 py-2.5 rounded-md border-2 transition-all hover:shadow-lg ${
                                                filters.vehicles
                                                    ? 'bg-blue-50 border-blue-500'
                                                    : 'bg-gray-100 border-gray-300 opacity-60'
                                            }`}
                                        >
                                            <div className={`w-8 h-8 rounded-md flex items-center justify-center ${
                                                filters.vehicles ? 'bg-blue-500' : 'bg-gray-400'
                                            }`}>
                                                <Truck className="w-4 h-4 text-white" />
                                            </div>
                                            <div className="flex-1 text-left">
                                                <div className={`text-sm font-semibold ${
                                                    filters.vehicles ? 'text-blue-700' : 'text-gray-500'
                                                }`}>
                                                    Vehicles
                                                </div>
                                                <div className="text-xs text-gray-500">{stats.totalVehicles} total</div>
                                            </div>
                                        </button>

                                        {/* Drivers */}
                                        <button
                                            onClick={() => toggleFilter('drivers')}
                                            className={`flex items-center gap-3 px-3 py-2.5 rounded-md border-2 transition-all hover:shadow-lg ${
                                                filters.drivers
                                                    ? 'bg-green-50 border-green-500'
                                                    : 'bg-gray-100 border-gray-300 opacity-60'
                                            }`}
                                        >
                                            <div className={`w-8 h-8 rounded-md flex items-center justify-center ${
                                                filters.drivers ? 'bg-green-500' : 'bg-gray-400'
                                            }`}>
                                                <User className="w-4 h-4 text-white" />
                                            </div>
                                            <div className="flex-1 text-left">
                                                <div className={`text-sm font-semibold ${
                                                    filters.drivers ? 'text-green-700' : 'text-gray-500'
                                                }`}>
                                                    Drivers
                                                </div>
                                                <div className="text-xs text-gray-500">{stats.totalDrivers} total</div>
                                            </div>
                                        </button>
                                    </div>
                                    
                                    <div className="text-xs text-gray-500 text-center pt-2 border-t-2 border-gray-300">
                                        Click to toggle visibility
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
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
