import React, { useState, useEffect } from 'react';
import { Loader2, MapPin } from 'lucide-react';
import MapView from '../components/common/MapView';
import { authService } from '../services/authService';
import { vehicleService } from '../services/vehicleService';

const LiveMap = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [mapCenter, setMapCenter] = useState({ lng: 78.9629, lat: 20.5937, zoom: 4 });
    const [markers, setMarkers] = useState([]);
    const [officeLocation, setOfficeLocation] = useState(null);
    const [stats, setStats] = useState({ totalVehicles: 0, officeSet: false });

    useEffect(() => {
        fetchMapData();
    }, []);

    const fetchMapData = async () => {
        try {
            setLoading(true);
            setError(null);

            // Fetch user profile for office location
            const profileResponse = await authService.getProfile();
            console.log('Profile response:', profileResponse);

            // Extract user data from response (API returns { user: {...} })
            const profileData = profileResponse.user || profileResponse;
            console.log('Profile data:', profileData);

            // Fetch vehicles
            const vehiclesData = await vehicleService.getVehicles();
            console.log('Vehicles data:', vehiclesData);

            const newMarkers = [];
            let hasOffice = false;

            // Add office location marker if available
            if (profileData.officeLocation?.coordinates?.length === 2) {
                const [lng, lat] = profileData.officeLocation.coordinates;
                setOfficeLocation({ lng, lat });
                setMapCenter({ lng, lat, zoom: 12 });
                hasOffice = true;

                newMarkers.push({
                    id: 'office',
                    lng,
                    lat,
                    type: 'building',
                    label: profileData.companyName || 'Office Location'
                });

                // Add vehicle markers at office location (since they're not assigned to trips)
                vehiclesData.forEach((vehicle, index) => {
                    // Offset vehicles slightly to avoid overlap
                    const offset = 0.001;
                    const angle = (index * 2 * Math.PI) / vehiclesData.length;
                    const vehicleLng = lng + offset * Math.cos(angle);
                    const vehicleLat = lat + offset * Math.sin(angle);

                    newMarkers.push({
                        id: `vehicle-${vehicle._id}`,
                        lng: vehicleLng,
                        lat: vehicleLat,
                        type: 'vehicle',
                        label: vehicle.regnNo || `Vehicle ${index + 1}`
                    });
                });
            }

            setMarkers(newMarkers);
            setStats({
                totalVehicles: vehiclesData.length,
                officeSet: hasOffice
            });
        } catch (err) {
            console.error('Error fetching map data:', err);
            setError(err.message || 'Failed to load map data');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-full">
            {/* Map Container - Full Height */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden" style={{ height: 'calc(100vh - 180px)' }}>
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
                    <MapView
                        center={mapCenter}
                        markers={markers}
                        showControls={true}
                    />
                )}
            </div>
        </div>
    );
};

export default LiveMap;
