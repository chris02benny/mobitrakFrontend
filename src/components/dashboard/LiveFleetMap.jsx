import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, MapPin, ArrowRight } from 'lucide-react';
import MapView from '../common/MapView';
import { authService } from '../../services/authService';
import { vehicleService } from '../../services/vehicleService';

const LiveFleetMap = ({ isFullPage = false }) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [mapCenter, setMapCenter] = useState({ lng: 78.9629, lat: 20.5937, zoom: 4 });
    const [markers, setMarkers] = useState([]);
    const [officeLocation, setOfficeLocation] = useState(null);

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

            // Add office location marker if available
            if (profileData.officeLocation?.coordinates?.length === 2) {
                const [lng, lat] = profileData.officeLocation.coordinates;
                setOfficeLocation({ lng, lat });
                setMapCenter({ lng, lat, zoom: 12 });

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
        } catch (err) {
            console.error('Error fetching map data:', err);
            setError(err.message || 'Failed to load map data');
        } finally {
            setLoading(false);
        }
    };

    const handleExpandView = () => {
        navigate('/business/map');
    };

    return (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col h-full">
            <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
                <span className="font-semibold text-gray-900">Live Fleet Map</span>
                {!isFullPage && (
                    <button
                        onClick={handleExpandView}
                        className="w-8 h-8 bg-amber-500 text-white rounded-lg flex items-center justify-center hover:bg-amber-600 transition-colors"
                        title="Expand to full map view"
                    >
                        <ArrowRight size={18} />
                    </button>
                )}
            </div>
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

export default LiveFleetMap;

