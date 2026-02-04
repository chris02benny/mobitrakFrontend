import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { Plus, Minus, Move } from 'lucide-react';
import 'mapbox-gl/dist/mapbox-gl.css';

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

    // Create custom marker element for building (office)
    const createBuildingMarker = (label) => {
        const el = document.createElement('div');
        el.className = 'custom-building-marker';
        el.style.cssText = `
            cursor: pointer;
            position: relative;
            width: 40px;
            height: 50px;
            z-index: 1;
        `;

        el.innerHTML = `
            <!-- Pin shape with building icon -->
            <svg width="40" height="50" viewBox="0 0 40 50" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3));">
                <!-- Pin background -->
                <path d="M20 0C11.716 0 5 6.716 5 15c0 8.284 15 35 15 35s15-26.716 15-35c0-8.284-6.716-15-15-15z" fill="#f59e0b"/>
                <circle cx="20" cy="15" r="12" fill="white"/>
                
                <!-- Building icon -->
                <g transform="translate(11, 7)">
                    <rect x="2" y="3" width="14" height="12" rx="0.8" fill="#f59e0b"/>
                    <line x1="4" y1="6" x2="6" y2="6" stroke="white" stroke-width="1.2" stroke-linecap="round"/>
                    <line x1="4" y1="9" x2="6" y2="9" stroke="white" stroke-width="1.2" stroke-linecap="round"/>
                    <line x1="4" y1="12" x2="6" y2="12" stroke="white" stroke-width="1.2" stroke-linecap="round"/>
                    <line x1="12" y1="6" x2="14" y2="6" stroke="white" stroke-width="1.2" stroke-linecap="round"/>
                    <line x1="12" y1="9" x2="14" y2="9" stroke="white" stroke-width="1.2" stroke-linecap="round"/>
                    <line x1="12" y1="12" x2="14" y2="12" stroke="white" stroke-width="1.2" stroke-linecap="round"/>
                    <line x1="9" y1="3" x2="9" y2="0.5" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
                    <line x1="7" y1="0.5" x2="11" y2="0.5" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
                </g>
            </svg>
            ${label ? `
                <div class="marker-label" style="
                    position: absolute;
                    top: 52px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: white;
                    color: #1f2937;
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-size: 11px;
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

        // Add hover effect with z-index
        const svg = el.querySelector('svg');
        el.addEventListener('mouseenter', () => {
            el.style.zIndex = '1000';
            svg.style.transform = 'scale(1.1)';
            svg.style.transition = 'transform 0.2s';
        });
        el.addEventListener('mouseleave', () => {
            el.style.zIndex = '1';
            svg.style.transform = 'scale(1)';
        });

        return el;
    };

    // Create custom marker element for vehicle (truck)
    const createVehicleMarker = (label) => {
        const el = document.createElement('div');
        el.className = 'custom-vehicle-marker';
        el.style.cssText = `
            cursor: pointer;
            position: relative;
            width: 40px;
            height: 50px;
            z-index: 1;
        `;

        el.innerHTML = `
            <!-- Pin shape with truck icon -->
            <svg width="40" height="50" viewBox="0 0 40 50" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3));">
                <!-- Pin background -->
                <path d="M20 0C11.716 0 5 6.716 5 15c0 8.284 15 35 15 35s15-26.716 15-35c0-8.284-6.716-15-15-15z" fill="#3b82f6"/>
                <circle cx="20" cy="15" r="12" fill="white"/>
                
                <!-- Truck icon -->
                <g transform="translate(11, 7)">
                    <!-- Truck body -->
                    <rect x="1" y="6" width="11" height="6" rx="0.8" fill="#3b82f6"/>
                    <!-- Truck cabin -->
                    <path d="M12 6h2.5l1.5 2.5v3.5h-4V6z" fill="#3b82f6"/>
                    <!-- Wheels -->
                    <circle cx="4.5" cy="13" r="1.2" fill="white" stroke="#3b82f6" stroke-width="0.8"/>
                    <circle cx="13.5" cy="13" r="1.2" fill="white" stroke="#3b82f6" stroke-width="0.8"/>
                    <!-- Window -->
                    <rect x="13" y="7" width="2" height="1.5" rx="0.3" fill="white"/>
                </g>
            </svg>
            ${label ? `
                <div class="marker-label" style="
                    position: absolute;
                    top: 52px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: white;
                    color: #1f2937;
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-size: 11px;
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

        // Add hover effect with z-index
        const svg = el.querySelector('svg');
        el.addEventListener('mouseenter', () => {
            el.style.zIndex = '1000';
            svg.style.transform = 'scale(1.1)';
            svg.style.transition = 'transform 0.2s';
        });
        el.addEventListener('mouseleave', () => {
            el.style.zIndex = '1';
            svg.style.transform = 'scale(1)';
        });

        return el;
    };

    // Create custom marker element for driver (person)
    const createDriverMarker = (label) => {
        const el = document.createElement('div');
        el.className = 'custom-driver-marker';
        el.style.cssText = `
            cursor: pointer;
            position: relative;
            width: 40px;
            height: 50px;
            z-index: 1;
        `;

        el.innerHTML = `
            <!-- Pin shape with driver icon -->
            <svg width="40" height="50" viewBox="0 0 40 50" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3));">
                <!-- Pin background -->
                <path d="M20 0C11.716 0 5 6.716 5 15c0 8.284 15 35 15 35s15-26.716 15-35c0-8.284-6.716-15-15-15z" fill="#10b981"/>
                <circle cx="20" cy="15" r="12" fill="white"/>
                
                <!-- Driver/Person icon -->
                <g transform="translate(11, 7)">
                    <!-- Head -->
                    <circle cx="9" cy="5" r="2.5" fill="#10b981"/>
                    <!-- Body -->
                    <path d="M9 8.5c-2.5 0-4.5 1.5-4.5 3.5v2.5h9v-2.5c0-2-2-3.5-4.5-3.5z" fill="#10b981"/>
                </g>
            </svg>
            ${label ? `
                <div class="marker-label" style="
                    position: absolute;
                    top: 52px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: white;
                    color: #1f2937;
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-size: 11px;
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

        // Add hover effect with z-index
        const svg = el.querySelector('svg');
        el.addEventListener('mouseenter', () => {
            el.style.zIndex = '1000';
            svg.style.transform = 'scale(1.1)';
            svg.style.transition = 'transform 0.2s';
        });
        el.addEventListener('mouseleave', () => {
            el.style.zIndex = '1';
            svg.style.transform = 'scale(1)';
        });

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

        // Remove old markers
        Object.values(markersRef.current).forEach(marker => marker.remove());
        markersRef.current = {};

        // Add new markers
        markers.forEach(markerData => {
            const { id, lng, lat, type, label } = markerData;

            let markerElement;
            if (type === 'building' || type === 'office') {
                markerElement = createBuildingMarker(label);
            } else if (type === 'vehicle') {
                markerElement = createVehicleMarker(label);
            } else if (type === 'driver') {
                markerElement = createDriverMarker(label);
            } else {
                // Default marker
                markerElement = createVehicleMarker(label);
            }

            // Add click event listener if onMarkerClick callback is provided
            if (onMarkerClick) {
                markerElement.addEventListener('click', () => {
                    onMarkerClick(markerData);
                });
            }

            const marker = new mapboxgl.Marker({
                element: markerElement,
                anchor: 'bottom' // Anchor at bottom point of pin
            })
                .setLngLat([lng, lat])
                .addTo(map.current);

            markersRef.current[id] = marker;
        });
    }, [markers, mapLoaded, onMarkerClick]);

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
