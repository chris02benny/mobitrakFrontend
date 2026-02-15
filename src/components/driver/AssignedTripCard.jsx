import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Calendar, Navigation, Clock, Route, User, Mail, Phone, Package, Play } from 'lucide-react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { tripService } from '../../services/tripService';
import ConfirmationModal from './ConfirmationModal';
import TripTimeline from './TripTimeline';

// Mapbox access token
// Mapbox access token
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

const AssignedTripCard = ({ trip, onTripUpdate }) => {
    const mapContainer = useRef(null);
    const map = useRef(null);
    const markers = useRef([]);
    const [routeData, setRouteData] = useState(null);
    const [loadingRoute, setLoadingRoute] = useState(false);
    const [showStartModal, setShowStartModal] = useState(false);
    const [startModalMessage, setStartModalMessage] = useState('');
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [errorModalMessage, setErrorModalMessage] = useState('');
    const [isStarting, setIsStarting] = useState(false);

    // Get status badge color
    const getStatusColor = (status) => {
        switch (status) {
            case 'scheduled':
                return 'bg-blue-100 text-blue-800';
            case 'in-progress':
                return 'bg-green-100 text-green-800';
            case 'completed':
                return 'bg-gray-100 text-gray-800';
            case 'cancelled':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    // Generate Google Maps navigation URL
    const openGoogleMapsNavigation = () => {
        const start = trip.startDestination.location.coordinates;
        const end = trip.endDestination.location.coordinates;

        // Build waypoints if there are stops
        let waypointsParam = '';
        if (trip.stops && trip.stops.length > 0) {
            const waypoints = trip.stops
                .map(stop => `${stop.location.coordinates[1]},${stop.location.coordinates[0]}`)
                .join('|');
            waypointsParam = `&waypoints=${waypoints}`;
        }

        // Google Maps navigation URL with origin, destination, and waypoints
        const url = `https://www.google.com/maps/dir/?api=1&origin=${start[1]},${start[0]}&destination=${end[1]},${end[0]}${waypointsParam}&travelmode=driving`;

        window.open(url, '_blank');
    };

    const checkTripStartTime = () => {
        const now = new Date();
        const tripStart = new Date(trip.startDateTime);
        const diffMinutes = (tripStart - now) / (1000 * 60);
        const threeHoursInMinutes = 3 * 60; // 180 minutes

        // Check if outside 3-hour window (hard restriction)
        if (Math.abs(diffMinutes) > threeHoursInMinutes) {
            const hours = Math.floor(Math.abs(diffMinutes) / 60);
            const minutes = Math.floor(Math.abs(diffMinutes) % 60);
            if (diffMinutes > 0) {
                setErrorModalMessage(`Cannot start trip yet. It is scheduled to start in ${hours}h ${minutes}m. You can only start the trip within 3 hours of the scheduled start time.`);
            } else {
                setErrorModalMessage(`Cannot start trip. It was scheduled to start ${hours}h ${minutes}m ago. You can only start the trip within 3 hours of the scheduled start time.`);
            }
            setShowErrorModal(true);
            return 'blocked'; // Blocked - cannot proceed
        }

        // Check if outside 30-minute window (show confirmation)
        if (diffMinutes > 30) {
            const hours = Math.floor(Math.abs(diffMinutes) / 60);
            const minutes = Math.floor(Math.abs(diffMinutes) % 60);
            setStartModalMessage(`Trip is scheduled to start in ${hours}h ${minutes}m. Starting early may affect the schedule.`);
            return true;
        } else if (diffMinutes < -30) {
            const hours = Math.floor(Math.abs(diffMinutes) / 60);
            const minutes = Math.floor(Math.abs(diffMinutes) % 60);
            setStartModalMessage(`Trip was scheduled to start ${hours}h ${minutes}m ago. Starting late may affect the schedule.`);
            return true;
        }
        return false;
    };

    const handleStartTrip = async () => {
        const timeCheck = checkTripStartTime();
        if (timeCheck === 'blocked') {
            // Hard block - don't allow starting
            return;
        } else if (timeCheck) {
            // Show confirmation modal
            setShowStartModal(true);
            return;
        }
        await startTrip();
    };

    const handleConfirmStart = async () => {
        setShowStartModal(false);
        await startTrip();
    };

    const startTrip = async () => {
        try {
            setIsStarting(true);
            await tripService.startTrip(trip._id);
            if (onTripUpdate) {
                onTripUpdate();
            }
        } catch (error) {
            console.error('Error starting trip:', error);
            alert('Failed to start trip. Please try again.');
        } finally {
            setIsStarting(false);
        }
    };

    // Fetch or use existing route data
    useEffect(() => {
        const fetchRoute = async () => {
            console.log('fetchRoute called, trip.route:', trip.route);

            // If trip already has route with geometry, use it
            if (trip.route && trip.route.geometry) {
                console.log('Using existing route geometry');
                setRouteData(trip.route.geometry);
                return;
            }

            // If trip has route without geometry property (direct geometry object)
            if (trip.route && trip.route.type && trip.route.coordinates) {
                console.log('Using direct route object');
                setRouteData(trip.route);
                return;
            }

            // Otherwise, calculate route from coordinates
            if (trip.startDestination && trip.endDestination) {
                setLoadingRoute(true);
                try {
                    console.log('Calculating route from API');
                    const coordinates = [
                        trip.startDestination.location.coordinates,
                        ...(trip.stops || []).map(stop => stop.location.coordinates),
                        trip.endDestination.location.coordinates
                    ];

                    const data = await tripService.calculateRoute(coordinates, trip.tripType);
                    console.log('calculateRoute response:', data);

                    // Handle response structure - it might be data.route.geometry or data.route
                    if (data.route && data.route.geometry) {
                        setRouteData(data.route.geometry);
                    } else if (data.route) {
                        setRouteData(data.route);
                    } else {
                        console.error('No route in response');
                    }
                } catch (error) {
                    console.error('Error calculating route:', error);
                } finally {
                    setLoadingRoute(false);
                }
            }
        };

        fetchRoute();
    }, [trip]);

    // Initialize map
    useEffect(() => {
        if (!mapContainer.current || map.current) return;

        // Initialize map
        map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: 'mapbox://styles/mapbox/streets-v12',
            center: [78.9629, 20.5937],
            zoom: 4
        });

        map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

        // Don't cleanup - keep map persistent
    }, []);

    // Draw route when map is loaded and route data is available
    useEffect(() => {
        if (!map.current || !routeData) return;

        // Wait for map style to load
        if (!map.current.isStyleLoaded()) {
            map.current.once('load', () => {
                drawRoute();
            });
        } else {
            // Style already loaded, draw immediately
            drawRoute();
        }
    }, [routeData]);

    const drawRoute = () => {
        if (!map.current || !routeData) {
            console.log('drawRoute: map or routeData missing', { hasMap: !!map.current, hasRouteData: !!routeData });
            return;
        }

        console.log('drawRoute: Starting to draw route', routeData);

        try {
            // Clear existing markers
            markers.current.forEach(marker => marker.remove());
            markers.current = [];

            // Remove existing route layer if it exists
            if (map.current.getSource('route')) {
                console.log('drawRoute: Removing existing route layer');
                if (map.current.getLayer('route')) {
                    map.current.removeLayer('route');
                }
                map.current.removeSource('route');
            }

            console.log('drawRoute: Adding route source and layer');
            map.current.addSource('route', {
                type: 'geojson',
                data: {
                    type: 'Feature',
                    properties: {},
                    geometry: routeData
                }
            });

            map.current.addLayer({
                id: 'route',
                type: 'line',
                source: 'route',
                layout: {
                    'line-join': 'round',
                    'line-cap': 'round'
                },
                paint: {
                    'line-color': '#3B82F6',
                    'line-width': 4
                }
            });

            console.log('drawRoute: Route layer added successfully');

            // Collect all coordinates for markers
            const coordinates = [
                trip.startDestination.location.coordinates,
                ...(trip.stops || []).map(stop => stop.location.coordinates),
                trip.endDestination.location.coordinates
            ];

            // Add markers
            coordinates.forEach((coord, index) => {
                const el = document.createElement('div');
                el.className = 'custom-marker';

                if (index === 0) {
                    el.style.backgroundColor = '#3B82F6';
                    el.innerHTML = '<div style="color: white; font-weight: bold; font-size: 12px;">A</div>';
                } else if (index === coordinates.length - 1) {
                    el.style.backgroundColor = '#EF4444';
                    el.innerHTML = '<div style="color: white; font-weight: bold; font-size: 12px;">B</div>';
                } else {
                    el.style.backgroundColor = '#F59E0B';
                    el.innerHTML = `<div style="color: white; font-weight: bold; font-size: 10px;">${index}</div>`;
                }

                el.style.width = '30px';
                el.style.height = '30px';
                el.style.borderRadius = '50%';
                el.style.display = 'flex';
                el.style.alignItems = 'center';
                el.style.justifyContent = 'center';
                el.style.border = '2px solid white';
                el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';

                const marker = new mapboxgl.Marker(el)
                    .setLngLat(coord)
                    .addTo(map.current);

                markers.current.push(marker);
            });

            // Fit map to show entire route
            const bounds = new mapboxgl.LngLatBounds();
            coordinates.forEach(coord => bounds.extend(coord));
            map.current.fitBounds(bounds, { padding: 50 });
        } catch (error) {
            console.error('Error drawing route:', error);
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-6 mb-4 border border-gray-200 hover:shadow-lg transition-shadow">
            {/* Header Section */}
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(trip.status)}`}>
                        {trip.status.toUpperCase()}
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
                        {trip.tripType === 'commercial' ? 'COMMERCIAL' : 'PASSENGER'}
                    </span>
                    {trip.isTwoWay && (
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800">
                            TWO-WAY
                        </span>
                    )}
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={openGoogleMapsNavigation}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors shadow-md hover:shadow-lg"
                    >
                        <Navigation size={18} />
                        Open in Google Maps
                    </button>
                    {trip.status === 'scheduled' && (
                        <button
                            onClick={handleStartTrip}
                            disabled={isStarting}
                            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors shadow-md hover:shadow-lg"
                        >
                            <Play size={18} />
                            {isStarting ? 'Starting...' : 'Start Trip'}
                        </button>
                    )}
                </div>
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - Route Preview Map */}
                <div className="rounded-lg overflow-hidden border border-gray-200 shadow-sm" style={{ minHeight: '400px' }}>
                    <div ref={mapContainer} className="w-full h-full" style={{ minHeight: '400px' }} />
                </div>

                {/* Right Column - Trip Details */}
                <div className="flex flex-col gap-4">
                    {/* Quick Info */}
                    <div className="grid grid-cols-1 gap-4">
                        {/* Start Destination */}
                        <div className="flex items-start gap-3">
                            <div className="bg-blue-100 p-2 rounded-full">
                                <MapPin size={20} className="text-blue-600" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 font-semibold">FROM</p>
                                <p className="text-sm font-bold text-gray-800">{trip.startDestination.name}</p>
                                {trip.startDestination.address && (
                                    <p className="text-xs text-gray-600">{trip.startDestination.address}</p>
                                )}
                            </div>
                        </div>

                        {/* End Destination */}
                        <div className="flex items-start gap-3">
                            <div className="bg-red-100 p-2 rounded-full">
                                <MapPin size={20} className="text-red-600" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 font-semibold">TO</p>
                                <p className="text-sm font-bold text-gray-800">{trip.endDestination.name}</p>
                                {trip.endDestination.address && (
                                    <p className="text-xs text-gray-600">{trip.endDestination.address}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Trip Details */}
                    <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2">
                            <Calendar size={16} className="text-gray-500" />
                            <div>
                                <p className="text-xs text-gray-500">Start</p>
                                <p className="text-sm font-semibold text-gray-800">
                                    {new Date(trip.startDateTime).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Clock size={16} className="text-gray-500" />
                            <div>
                                <p className="text-xs text-gray-500">Time</p>
                                <p className="text-sm font-semibold text-gray-800">
                                    {new Date(trip.startDateTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Route size={16} className="text-gray-500" />
                            <div>
                                <p className="text-xs text-gray-500">Distance</p>
                                <p className="text-sm font-semibold text-gray-800">{Math.floor(trip.distance || 0)} km</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Clock size={16} className="text-gray-500" />
                            <div>
                                <p className="text-xs text-gray-500">Duration</p>
                                <p className="text-sm font-semibold text-gray-800">
                                    {(() => {
                                        const totalMinutes = Math.floor(trip.duration || 0);
                                        const days = Math.floor(totalMinutes / (24 * 60));
                                        const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
                                        const minutes = Math.floor(totalMinutes % 60);

                                        if (days > 0) {
                                            return `${days}d ${hours}h ${minutes}m`;
                                        } else if (hours > 0) {
                                            return `${hours}h ${minutes}m`;
                                        } else {
                                            return `${minutes}m`;
                                        }
                                    })()}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Customer Info (for passenger trips) */}
                    {trip.tripType === 'passenger' && trip.customerName && (
                        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 shadow-sm">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="bg-blue-600 p-2 rounded-lg">
                                    <User size={20} className="text-white" />
                                </div>
                                <h3 className="text-base font-bold text-blue-900">Customer Details</h3>
                            </div>
                            <div className="space-y-2 ml-10">
                                <p className="text-base font-bold text-gray-900">{trip.customerName}</p>
                                {trip.customerContact && (
                                    <div className="flex items-center gap-2 text-gray-700">
                                        <Phone size={18} className="text-blue-600" />
                                        <p className="text-sm font-medium">{trip.customerContact}</p>
                                    </div>
                                )}
                                {trip.customerEmail && (
                                    <div className="flex items-center gap-2 text-gray-700">
                                        <Mail size={18} className="text-blue-600" />
                                        <p className="text-sm font-medium">{trip.customerEmail}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Stops (if any) */}
                    {trip.stops && trip.stops.length > 0 && (
                        <div>
                            <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                <Package size={16} />
                                Stops ({trip.stops.length})
                            </h4>
                            <div className="space-y-2">
                                {trip.stops.map((stop, index) => (
                                    <div key={index} className="flex items-start gap-2 p-3 bg-gray-50 rounded border border-gray-200">
                                        <span className="text-xs font-bold text-gray-500 mt-1 bg-gray-200 w-6 h-6 rounded-full flex items-center justify-center">{index + 1}</span>
                                        <div className="flex-1">
                                            <p className="text-sm font-semibold text-gray-800">{stop.name}</p>
                                            {stop.address && (
                                                <p className="text-xs text-gray-600 mt-0.5">{stop.address}</p>
                                            )}
                                            <span className={`inline-block mt-1.5 px-2 py-0.5 rounded text-xs font-medium ${stop.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                    stop.status === 'reached' ? 'bg-green-100 text-green-800' :
                                                        'bg-blue-100 text-blue-800'
                                                }`}>
                                                {stop.status}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Confirmation Modal */}
            <ConfirmationModal
                isOpen={showStartModal}
                onClose={() => setShowStartModal(false)}
                onConfirm={handleConfirmStart}
                title="Start Trip?"
                message={startModalMessage}
                type="warning"
            />

            {/* Error Modal */}
            <ConfirmationModal
                isOpen={showErrorModal}
                onClose={() => setShowErrorModal(false)}
                onConfirm={() => setShowErrorModal(false)}
                title="Cannot Start Trip"
                message={errorModalMessage}
                type="error"
                confirmText="OK"
                showCancel={false}
            />
        </div>
    );
};

export default AssignedTripCard;
