import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { Plus, Minus, Move } from 'lucide-react';
import 'mapbox-gl/dist/mapbox-gl.css';
import MarkerOverlay from './MarkerOverlay';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

// Default center: India
const DEFAULT_CENTER = {
    lng: 78.9629,
    lat: 20.5937,
    zoom: 4
};

/**
 * MapView Component
 * A reusable Mapbox GL map component with custom marker support
 * 
 * @param {Object} props
 * @param {Object} props.center - Center coordinates { lng, lat, zoom }
 * @param {Array} props.markers - Array of marker objects { id, lng, lat, type, label, data }
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.showControls - Show zoom/recenter controls (default: true)
 * @param {Function} props.onMarkerClick - Callback when a marker is clicked
 */
const MapView = ({
    center = DEFAULT_CENTER,
    markers = [],
    className = '',
    showControls = true,
    onMarkerClick = null
}) => {
    const mapContainer = useRef(null);
    const map = useRef(null);
    const markersRef = useRef({});
    const [mapLoaded, setMapLoaded] = useState(false);
    const [selectedMarker, setSelectedMarker] = useState(null);

    // Create custom marker element for building (office)
    const createBuildingMarker = (label, isActive = false) => {
        const el = document.createElement('div');
        el.className = 'custom-building-marker';
        const size = isActive ? 56 : 44;
        el.style.cssText = `
            cursor: pointer;
            position: relative;
            width: ${size}px;
            height: ${size}px;
            z-index: ${isActive ? 1000 : 1};
        `;

        el.innerHTML = `
            <div style="
                width: 100%;
                height: 100%;
                background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
            ">
                <svg width="${size * 0.5}" height="${size * 0.5}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="3" y="4" width="18" height="16" rx="2" stroke="white" stroke-width="2" fill="none"/>
                    <line x1="6" y1="8" x2="8" y2="8" stroke="white" stroke-width="2" stroke-linecap="round"/>
                    <line x1="6" y1="12" x2="8" y2="12" stroke="white" stroke-width="2" stroke-linecap="round"/>
                    <line x1="6" y1="16" x2="8" y2="16" stroke="white" stroke-width="2" stroke-linecap="round"/>
                    <line x1="16" y1="8" x2="18" y2="8" stroke="white" stroke-width="2" stroke-linecap="round"/>
                    <line x1="16" y1="12" x2="18" y2="12" stroke="white" stroke-width="2" stroke-linecap="round"/>
                    <line x1="16" y1="16" x2="18" y2="16" stroke="white" stroke-width="2" stroke-linecap="round"/>
                    <line x1="12" y1="4" x2="12" y2="2" stroke="white" stroke-width="2" stroke-linecap="round"/>
                    <line x1="10" y1="2" x2="14" y2="2" stroke="white" stroke-width="2" stroke-linecap="round"/>
                </svg>
            </div>
            ${label && !isActive ? `
                <div class="marker-label" style="
                    position: absolute;
                    top: ${size + 4}px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: white;
                    color: #1f2937;
                    padding: 4px 8px;
                    border-radius: 6px;
                    font-size: 10px;
                    font-weight: 600;
                    white-space: nowrap;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
                    border: 1px solid #e5e7eb;
                    pointer-events: none;
                ">
                    ${label}
                </div>
            ` : ''}
        `;

        return el;
    };

    // Create custom marker element for vehicle (truck)
    const createVehicleMarker = (label, isActive = false, speed = null) => {
        const el = document.createElement('div');
        el.className = 'custom-vehicle-marker';
        const size = isActive ? 56 : 44;
        el.style.cssText = `
            cursor: pointer;
            position: relative;
            width: ${size}px;
            height: ${size}px;
            z-index: ${isActive ? 1000 : 1};
        `;

        // Convert speed from m/s to km/h if available
        const speedKmh = speed !== null && speed !== undefined ? (speed * 3.6).toFixed(1) : null;

        el.innerHTML = `
            <div style="
                width: 100%;
                height: 100%;
                background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
            ">
                <svg width="${size * 0.5}" height="${size * 0.5}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1 8h15v8H1V8z" stroke="white" stroke-width="2" stroke-linejoin="round" fill="none"/>
                    <path d="M16 8h4l3 3v5h-7V8z" stroke="white" stroke-width="2" stroke-linejoin="round" fill="none"/>
                    <circle cx="5.5" cy="18.5" r="2.5" stroke="white" stroke-width="2" fill="none"/>
                    <circle cx="18.5" cy="18.5" r="2.5" stroke="white" stroke-width="2" fill="none"/>
                    <line x1="8" y1="16" x2="16" y2="16" stroke="white" stroke-width="2"/>
                </svg>
            </div>
            ${speedKmh !== null ? `
                <div class="marker-speed-badge" style="
                    position: absolute;
                    top: -8px;
                    right: -8px;
                    background: #10b981;
                    color: white;
                    padding: 2px 6px;
                    border-radius: 8px;
                    font-size: 10px;
                    font-weight: 700;
                    white-space: nowrap;
                    box-shadow: 0 2px 8px rgba(16, 185, 129, 0.4);
                    border: 2px solid white;
                    pointer-events: none;
                ">
                    ${speedKmh} km/h
                </div>
            ` : ''}
            ${label && !isActive ? `
                <div class="marker-label" style="
                    position: absolute;
                    top: ${size + 4}px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: white;
                    color: #1f2937;
                    padding: 4px 8px;
                    border-radius: 6px;
                    font-size: 10px;
                    font-weight: 600;
                    white-space: nowrap;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
                    border: 1px solid #e5e7eb;
                    pointer-events: none;
                ">
                    ${label}
                </div>
            ` : ''}
        `;

        return el;
    };

    // Create custom marker element for driver (person)
    const createDriverMarker = (label, isActive = false) => {
        const el = document.createElement('div');
        el.className = 'custom-driver-marker';
        const size = isActive ? 56 : 44;
        el.style.cssText = `
            cursor: pointer;
            position: relative;
            width: ${size}px;
            height: ${size}px;
            z-index: ${isActive ? 1000 : 1};
        `;

        el.innerHTML = `
            <div style="
                width: 100%;
                height: 100%;
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
            ">
                <svg width="${size * 0.5}" height="${size * 0.5}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="8" r="4" stroke="white" stroke-width="2" fill="none"/>
                    <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" stroke="white" stroke-width="2" stroke-linecap="round" fill="none"/>
                </svg>
            </div>
            ${label && !isActive ? `
                <div class="marker-label" style="
                    position: absolute;
                    top: ${size + 4}px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: white;
                    color: #1f2937;
                    padding: 4px 8px;
                    border-radius: 6px;
                    font-size: 10px;
                    font-weight: 600;
                    white-space: nowrap;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
                    border: 1px solid #e5e7eb;
                    pointer-events: none;
                ">
                    ${label}
                </div>
            ` : ''}
        `;

        return el;
    };

    // Create custom marker element for trip (navigation)
    const createTripMarker = (label, isActive = false) => {
        const el = document.createElement('div');
        el.className = 'custom-trip-marker';
        const size = isActive ? 56 : 44;
        el.style.cssText = `
            cursor: pointer;
            position: relative;
            width: ${size}px;
            height: ${size}px;
            z-index: ${isActive ? 1000 : 2};

        `;

        el.innerHTML = `
            <div style="
                width: 100%;
                height: 100%;
                background: linear-gradient(135deg, #9333ea 0%, #7e22ce 100%);
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 4px 12px rgba(147, 51, 234, 0.4);
            ">
                <svg width="${size * 0.5}" height="${size * 0.5}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="white" stroke-width="2" stroke-linejoin="round" fill="none"/>
                    <path d="M2 17l10 5 10-5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M2 12l10 5 10-5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </div>
            ${label && !isActive ? `
                <div class="marker-label" style="
                    position: absolute;
                    top: ${size + 4}px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: white;
                    color: #1f2937;
                    padding: 4px 8px;
                    border-radius: 6px;
                    font-size: 10px;
                    font-weight: 600;
                    white-space: nowrap;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
                    border: 1px solid #e5e7eb;
                    pointer-events: none;
                ">
                    ${label}
                </div>
            ` : ''}
        `;

        const markerDiv = el.querySelector('div');
        return el;
    };

    // Initialize map
    useEffect(() => {
        if (!MAPBOX_TOKEN || map.current) return;

        mapboxgl.accessToken = MAPBOX_TOKEN;

        map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: 'mapbox://styles/mapbox/streets-v12',
            center: [center.lng, center.lat],
            zoom: center.zoom || DEFAULT_CENTER.zoom
        });

        // Add navigation controls
        map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

        map.current.on('load', () => {
            setMapLoaded(true);
        });

        return () => {
            if (map.current) {
                map.current.remove();
                map.current = null;
            }
        };
    }, []);

    // Update map center when center prop changes
    useEffect(() => {
        if (mapLoaded && map.current && center) {
            map.current.flyTo({
                center: [center.lng, center.lat],
                zoom: center.zoom || map.current.getZoom(),
                essential: true
            });
        }
    }, [center, mapLoaded]);

    // Update markers when markers prop changes
    useEffect(() => {
        if (!mapLoaded || !map.current) return;

        // Remove all existing markers
        Object.values(markersRef.current).forEach(marker => marker.remove());
        markersRef.current = {};

        // Create all markers fresh (ensures position and speed updates work)
        markers.forEach(markerData => {
            const { id, lng, lat, type, label, data } = markerData;
            const isActive = selectedMarker && selectedMarker.id === id;
            let markerElement;

            if (type === 'building' || type === 'office') {
                markerElement = createBuildingMarker(label, isActive);
            } else if (type === 'vehicle') {
                const speed = data?.speed !== undefined ? data.speed : null;
                markerElement = createVehicleMarker(label, isActive, speed);
            } else if (type === 'driver') {
                markerElement = createDriverMarker(label, isActive);
            } else if (type === 'trip') {
                markerElement = createTripMarker(label, isActive);
            } else {
                const speed = data?.speed !== undefined ? data.speed : null;
                markerElement = createVehicleMarker(label, isActive, speed);
            }

            // Add click event listener
            markerElement.addEventListener('click', () => {
                setSelectedMarker(markerData);
                if (onMarkerClick) {
                    onMarkerClick(markerData);
                }
            });

            const marker = new mapboxgl.Marker({
                element: markerElement,
                anchor: 'bottom'
            })
                .setLngLat([lng, lat])
                .addTo(map.current);

            markersRef.current[id] = marker;
        });
    }, [markers, mapLoaded, selectedMarker, onMarkerClick]);

    // Handle zoom in
    const handleZoomIn = () => {
        if (map.current) {
            map.current.zoomIn();
        }
    };

    // Handle zoom out
    const handleZoomOut = () => {
        if (map.current) {
            map.current.zoomOut();
        }
    };

    // Handle recenter
    const handleRecenter = () => {
        if (map.current && markers.length > 0) {
            // Calculate bounds to fit all markers
            const bounds = new mapboxgl.LngLatBounds();
            markers.forEach(marker => {
                bounds.extend([marker.lng, marker.lat]);
            });

            map.current.fitBounds(bounds, {
                padding: 50,
                maxZoom: 15
            });
        } else if (map.current) {
            // Recenter to provided center or default
            map.current.flyTo({
                center: [center.lng, center.lat],
                zoom: center.zoom || DEFAULT_CENTER.zoom
            });
        }
    };

    if (!MAPBOX_TOKEN) {
        return (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                <strong>Error:</strong> Mapbox access token is not configured. Please add VITE_MAPBOX_ACCESS_TOKEN to your .env file.
            </div>
        );
    }

    return (
        <div className={`relative ${className}`} style={{ width: '100%', height: '100%' }}>
            <div
                ref={mapContainer}
                className="w-full h-full"
            />

            {/* Marker Overlay */}
            {selectedMarker && (
                <MarkerOverlay
                    marker={selectedMarker}
                    onClose={() => setSelectedMarker(null)}
                />
            )}

            {/* Overlay Controls */}
            {showControls && (
                <div className="absolute bottom-4 right-4 flex flex-col gap-2">
                    <button
                        onClick={handleZoomIn}
                        className="w-8 h-8 bg-white rounded flex items-center justify-center shadow-md hover:bg-gray-50 transition-colors text-gray-700"
                        title="Zoom in"
                    >
                        <Plus size={16} />
                    </button>
                    <button
                        onClick={handleZoomOut}
                        className="w-8 h-8 bg-white rounded flex items-center justify-center shadow-md hover:bg-gray-50 transition-colors text-gray-700"
                        title="Zoom out"
                    >
                        <Minus size={16} />
                    </button>
                    <button
                        onClick={handleRecenter}
                        className="w-auto h-8 bg-white rounded flex items-center justify-center shadow-md hover:bg-gray-50 px-2 text-xs font-medium text-gray-700 gap-1 transition-colors"
                        title="Recenter map"
                    >
                        <Move size={12} /> RECENTER
                    </button>
                </div>
            )}
        </div>
    );
};

export default MapView;
