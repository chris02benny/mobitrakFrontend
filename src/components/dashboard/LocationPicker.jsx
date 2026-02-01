import React, { useState, useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { Search, Loader2, MapPin, Navigation, X } from 'lucide-react';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

// Default center: India
const DEFAULT_CENTER = {
    lng: 78.9629,
    lat: 20.5937,
    zoom: 4
};

const LocationPicker = ({ value, onChange, readOnly = false }) => {
    const mapContainer = useRef(null);
    const map = useRef(null);
    const marker = useRef(null);

    // Three-level search states
    const [countryQuery, setCountryQuery] = useState('');
    const [stateQuery, setStateQuery] = useState('');
    const [cityQuery, setCityQuery] = useState('');
    
    const [countrySuggestions, setCountrySuggestions] = useState([]);
    const [stateSuggestions, setStateSuggestions] = useState([]);
    const [citySuggestions, setCitySuggestions] = useState([]);
    
    const [showCountrySuggestions, setShowCountrySuggestions] = useState(false);
    const [showStateSuggestions, setShowStateSuggestions] = useState(false);
    const [showCitySuggestions, setShowCitySuggestions] = useState(false);
    
    const [selectedCountry, setSelectedCountry] = useState(null);
    const [selectedState, setSelectedState] = useState(null);
    const [selectedCity, setSelectedCity] = useState(null);

    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState('');
    const [currentLocation, setCurrentLocation] = useState(null);
    const [mapLoaded, setMapLoaded] = useState(false);
    const [currentAddress, setCurrentAddress] = useState(value?.address || '');
    const [gettingLocation, setGettingLocation] = useState(false);

    // Debug: Log the value prop
    useEffect(() => {
        console.log('LocationPicker received value:', value);
        console.log('Coordinates:', value?.coordinates);
        console.log('Coordinates length:', value?.coordinates?.length);
    }, [value]);

    // Initialize map
    useEffect(() => {
        if (!MAPBOX_TOKEN || map.current) return;

        mapboxgl.accessToken = MAPBOX_TOKEN;

        // Determine initial center
        const initialLng = value?.coordinates?.[0] || DEFAULT_CENTER.lng;
        const initialLat = value?.coordinates?.[1] || DEFAULT_CENTER.lat;
        const initialZoom = value?.coordinates?.length ? 12 : DEFAULT_CENTER.zoom;

        map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: 'mapbox://styles/mapbox/streets-v12',
            center: [initialLng, initialLat],
            zoom: initialZoom
        });

        // Add navigation controls
        map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

        // Create custom marker element
        const markerElement = document.createElement('div');
        markerElement.className = 'custom-marker';
        markerElement.innerHTML = `
            <div style="
                background-color: #f59e0b;
                padding: 8px;
                border-radius: 50%;
                box-shadow: 0 4px 6px rgba(0,0,0,0.3);
                border: 2px solid white;
                cursor: move;
                position: relative;
            ">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                </svg>
            </div>
        `;

        // Create address popup element
        const addressPopup = document.createElement('div');
        addressPopup.className = 'marker-address-popup';
        addressPopup.style.cssText = `
            position: absolute;
            bottom: 100%;
            left: 50%;
            transform: translateX(-50%);
            background: white;
            color: #1f2937;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 12px;
            white-space: nowrap;
            max-width: 250px;
            overflow: hidden;
            text-overflow: ellipsis;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            border: 1px solid #e5e7eb;
            margin-bottom: 8px;
            display: none;
            pointer-events: none;
            z-index: 10;
        `;
        markerElement.appendChild(addressPopup);

        // Initialize marker
        marker.current = new mapboxgl.Marker({
            element: markerElement,
            draggable: !readOnly
        });

        // Store reference to popup for updates (after marker is initialized)
        marker.current.addressPopup = addressPopup;

        // Wait for map to load before adding marker
        map.current.on('load', () => {
            console.log('Map loaded successfully');
            setMapLoaded(true);

            // If we have initial coordinates, add marker
            if (value?.coordinates?.length === 2) {
                console.log('Setting initial marker at:', value.coordinates);
                marker.current
                    .setLngLat([value.coordinates[0], value.coordinates[1]])
                    .addTo(map.current);
                setCurrentLocation({ lng: value.coordinates[0], lat: value.coordinates[1] });

                // Show address popup if address exists
                if (value.address) {
                    updateAddressPopup(value.address);
                }
            } else {
                console.log('No initial coordinates found');
            }
        });

        // Handle marker drag end (only if not read-only)
        marker.current.on('dragend', () => {
            if (!readOnly) {
                const lngLat = marker.current.getLngLat();
                setCurrentLocation({ lng: lngLat.lng, lat: lngLat.lat });
                reverseGeocode(lngLat.lng, lngLat.lat);
            }
        });

        // Handle map click (only if not read-only)
        if (!readOnly) {
            map.current.on('click', (e) => {
                const { lng, lat } = e.lngLat;

                if (!marker.current.getElement().parentNode) {
                    marker.current.setLngLat([lng, lat]).addTo(map.current);
                } else {
                    marker.current.setLngLat([lng, lat]);
                }

                setCurrentLocation({ lng, lat });
                reverseGeocode(lng, lat);
            });
        }

        return () => {
            if (map.current) {
                map.current.remove();
                map.current = null;
            }
        };
    }, []);

    // Function to update address popup
    const updateAddressPopup = (address) => {
        if (marker.current && marker.current.addressPopup) {
            marker.current.addressPopup.textContent = address;
            marker.current.addressPopup.style.display = 'block';
            setCurrentAddress(address);
        }
    };

    // Function to hide address popup
    const hideAddressPopup = () => {
        if (marker.current && marker.current.addressPopup) {
            marker.current.addressPopup.style.display = 'none';
            setCurrentAddress('');
        }
    };

    // Update marker when value changes externally (e.g., profile data loads)
    useEffect(() => {
        console.log('External value update - mapLoaded:', mapLoaded, 'coordinates:', value?.coordinates);

        if (mapLoaded && map.current && marker.current && value?.coordinates?.length === 2) {
            const [lng, lat] = value.coordinates;
            marker.current.setLngLat([lng, lat]);

            // Check if marker is already on the map by checking its internal state
            const markerElement = marker.current.getElement();
            if (!markerElement.parentNode) {
                console.log('Adding marker to map');
                marker.current.addTo(map.current);
            } else {
                console.log('Marker already on map');
            }

            map.current.flyTo({ center: [lng, lat], zoom: 12 });
            setCurrentLocation({ lng, lat });

            // Update address popup if address exists
            if (value.address) {
                updateAddressPopup(value.address);
            }
        }
    }, [value?.coordinates, mapLoaded]);

    const reverseGeocode = async (lng, lat) => {
        try {
            const response = await fetch(
                `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}`
            );
            const data = await response.json();

            if (data.features && data.features.length > 0) {
                const address = data.features[0].place_name;
                updateAddressPopup(address);

                // Notify parent component
                onChange({
                    type: 'Point',
                    coordinates: [lng, lat],
                    address: address
                });
            }
        } catch (error) {
            console.error('Reverse geocoding error:', error);
        }
    };

    // Fetch country suggestions
    const fetchCountrySuggestions = async (query) => {
        if (!query.trim() || query.length < 2) {
            setCountrySuggestions([]);
            setShowCountrySuggestions(false);
            return;
        }

        try {
            const response = await fetch(
                `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&types=country&limit=5`
            );
            const data = await response.json();

            if (data.features && data.features.length > 0) {
                setCountrySuggestions(data.features);
                setShowCountrySuggestions(true);
            } else {
                setCountrySuggestions([]);
                setShowCountrySuggestions(false);
            }
        } catch (error) {
            console.error('Country autocomplete error:', error);
        }
    };

    // Fetch state/region suggestions within selected country
    const fetchStateSuggestions = async (query) => {
        if (!query.trim() || query.length < 2 || !selectedCountry) {
            setStateSuggestions([]);
            setShowStateSuggestions(false);
            return;
        }

        try {
            const countryCode = selectedCountry.properties?.short_code || '';
            const bbox = selectedCountry.bbox ? selectedCountry.bbox.join(',') : '';
            
            const response = await fetch(
                `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&types=region&country=${countryCode}&bbox=${bbox}&limit=5`
            );
            const data = await response.json();

            if (data.features && data.features.length > 0) {
                setStateSuggestions(data.features);
                setShowStateSuggestions(true);
            } else {
                setStateSuggestions([]);
                setShowStateSuggestions(false);
            }
        } catch (error) {
            console.error('State autocomplete error:', error);
        }
    };

    // Fetch city suggestions within selected state
    const fetchCitySuggestions = async (query) => {
        if (!query.trim() || query.length < 2 || !selectedState) {
            setCitySuggestions([]);
            setShowCitySuggestions(false);
            return;
        }

        try {
            const bbox = selectedState.bbox ? selectedState.bbox.join(',') : '';
            
            const response = await fetch(
                `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&types=place,locality,neighborhood&bbox=${bbox}&limit=5`
            );
            const data = await response.json();

            if (data.features && data.features.length > 0) {
                setCitySuggestions(data.features);
                setShowCitySuggestions(true);
            } else {
                setCitySuggestions([]);
                setShowCitySuggestions(false);
            }
        } catch (error) {
            console.error('City autocomplete error:', error);
        }
    };

    // Handle country input change
    const handleCountryChange = (e) => {
        const value = e.target.value;
        setCountryQuery(value);
        setSelectedCountry(null);
        setStateQuery('');
        setCityQuery('');
        setSelectedState(null);
        setSelectedCity(null);
        fetchCountrySuggestions(value);
    };

    // Handle state input change
    const handleStateChange = (e) => {
        const value = e.target.value;
        setStateQuery(value);
        setSelectedState(null);
        setCityQuery('');
        setSelectedCity(null);
        fetchStateSuggestions(value);
    };

    // Handle city input change
    const handleCityChange = (e) => {
        const value = e.target.value;
        setCityQuery(value);
        setSelectedCity(null);
        fetchCitySuggestions(value);
    };

    // Select country
    const selectCountry = (country) => {
        setSelectedCountry(country);
        setCountryQuery(country.text);
        setShowCountrySuggestions(false);
        
        // Fly to country
        if (country.center) {
            map.current.flyTo({
                center: country.center,
                zoom: 5,
                essential: true
            });
        }
    };

    // Select state
    const selectState = (state) => {
        setSelectedState(state);
        setStateQuery(state.text);
        setShowStateSuggestions(false);
        
        // Fly to state
        if (state.center) {
            map.current.flyTo({
                center: state.center,
                zoom: 7,
                essential: true
            });
        }
    };

    // Select city and place marker
    const selectCity = (city) => {
        setSelectedCity(city);
        setCityQuery(city.text);
        setShowCitySuggestions(false);
        
        const [lng, lat] = city.center;
        const address = city.place_name;

        // Update marker position
        const markerElement = marker.current.getElement();
        if (!markerElement.parentNode) {
            marker.current.setLngLat([lng, lat]).addTo(map.current);
        } else {
            marker.current.setLngLat([lng, lat]);
        }

        // Fly to city
        map.current.flyTo({
            center: [lng, lat],
            zoom: 12,
            essential: true
        });

        setCurrentLocation({ lng, lat });
        updateAddressPopup(address);

        // Notify parent component
        onChange({
            type: 'Point',
            coordinates: [lng, lat],
            address: address
        });
    };

    // Get current location
    const getCurrentLocation = () => {
        if (!navigator.geolocation) {
            setSearchError('Geolocation is not supported by your browser');
            return;
        }

        setGettingLocation(true);
        setSearchError('');

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { longitude, latitude } = position.coords;

                // Update marker position
                const markerElement = marker.current.getElement();
                if (!markerElement.parentNode) {
                    marker.current.setLngLat([longitude, latitude]).addTo(map.current);
                } else {
                    marker.current.setLngLat([longitude, latitude]);
                }

                // Fly to location
                map.current.flyTo({
                    center: [longitude, latitude],
                    zoom: 15,
                    essential: true
                });

                setCurrentLocation({ lng: longitude, lat: latitude });
                reverseGeocode(longitude, latitude);
                setGettingLocation(false);
            },
            (error) => {
                console.error('Geolocation error:', error);
                setSearchError('Unable to retrieve your location. Please enable location services.');
                setGettingLocation(false);
            }
        );
    };

    // Clear all search fields
    const clearSearch = () => {
        setCountryQuery('');
        setStateQuery('');
        setCityQuery('');
        setSelectedCountry(null);
        setSelectedState(null);
        setSelectedCity(null);
        setSearchError('');
    };

    if (!MAPBOX_TOKEN) {
        return (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                <strong>Error:</strong> Mapbox access token is not configured. Please add VITE_MAPBOX_ACCESS_TOKEN to your .env file.
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Three-Level Search Bar - Only show if not readOnly */}
            {!readOnly && (
                <div className="space-y-3">
                    {/* Current Location Button */}
                    <button
                        type="button"
                        onClick={getCurrentLocation}
                        disabled={gettingLocation}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                        {gettingLocation ? (
                            <>
                                <Loader2 className="animate-spin" size={18} />
                                Getting Location...
                            </>
                        ) : (
                            <>
                                <Navigation size={18} />
                                Use My Current Location
                            </>
                        )}
                    </button>

                    <div className="relative flex items-center justify-center">
                        <div className="flex-1 border-t border-gray-300"></div>
                        <span className="px-3 text-xs text-gray-500 bg-white">OR SEARCH LOCATION</span>
                        <div className="flex-1 border-t border-gray-300"></div>
                    </div>

                    {/* Three-Level Search Inputs */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {/* Country Search */}
                        <div className="relative">
                            <label className="block text-xs font-medium text-gray-700 mb-1">Country</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                <input
                                    type="text"
                                    value={countryQuery}
                                    onChange={handleCountryChange}
                                    onFocus={() => countrySuggestions.length > 0 && setShowCountrySuggestions(true)}
                                    onBlur={() => setTimeout(() => setShowCountrySuggestions(false), 200)}
                                    placeholder="e.g., India"
                                    className="w-full pl-8 pr-8 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                    autoComplete="off"
                                />
                                {countryQuery && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setCountryQuery('');
                                            setSelectedCountry(null);
                                            setStateQuery('');
                                            setCityQuery('');
                                        }}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>

                            {/* Country Suggestions */}
                            {showCountrySuggestions && countrySuggestions.length > 0 && (
                                <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                    {countrySuggestions.map((suggestion, index) => (
                                        <div
                                            key={index}
                                            onClick={() => selectCountry(suggestion)}
                                            className="px-3 py-2 hover:bg-amber-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                                        >
                                            <p className="text-sm font-medium text-gray-900">{suggestion.text}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* State Search */}
                        <div className="relative">
                            <label className="block text-xs font-medium text-gray-700 mb-1">State/Region</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                <input
                                    type="text"
                                    value={stateQuery}
                                    onChange={handleStateChange}
                                    onFocus={() => stateSuggestions.length > 0 && setShowStateSuggestions(true)}
                                    onBlur={() => setTimeout(() => setShowStateSuggestions(false), 200)}
                                    placeholder={selectedCountry ? "e.g., Kerala" : "Select country first"}
                                    className="w-full pl-8 pr-8 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400"
                                    disabled={!selectedCountry}
                                    autoComplete="off"
                                />
                                {stateQuery && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setStateQuery('');
                                            setSelectedState(null);
                                            setCityQuery('');
                                        }}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>

                            {/* State Suggestions */}
                            {showStateSuggestions && stateSuggestions.length > 0 && (
                                <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                    {stateSuggestions.map((suggestion, index) => (
                                        <div
                                            key={index}
                                            onClick={() => selectState(suggestion)}
                                            className="px-3 py-2 hover:bg-amber-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                                        >
                                            <p className="text-sm font-medium text-gray-900">{suggestion.text}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* City Search */}
                        <div className="relative">
                            <label className="block text-xs font-medium text-gray-700 mb-1">City</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                <input
                                    type="text"
                                    value={cityQuery}
                                    onChange={handleCityChange}
                                    onFocus={() => citySuggestions.length > 0 && setShowCitySuggestions(true)}
                                    onBlur={() => setTimeout(() => setShowCitySuggestions(false), 200)}
                                    placeholder={selectedState ? "e.g., Kochi" : "Select state first"}
                                    className="w-full pl-8 pr-8 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400"
                                    disabled={!selectedState}
                                    autoComplete="off"
                                />
                                {cityQuery && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setCityQuery('');
                                            setSelectedCity(null);
                                        }}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>

                            {/* City Suggestions */}
                            {showCitySuggestions && citySuggestions.length > 0 && (
                                <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                    {citySuggestions.map((suggestion, index) => (
                                        <div
                                            key={index}
                                            onClick={() => selectCity(suggestion)}
                                            className="px-3 py-2 hover:bg-amber-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                                        >
                                            <p className="text-sm font-medium text-gray-900">{suggestion.text}</p>
                                            <p className="text-xs text-gray-500">{suggestion.place_name}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {searchError && (
                        <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs">
                            {searchError}
                        </div>
                    )}
                </div>
            )}

            {/* Map Container */}
            <div
                ref={mapContainer}
                className="w-full h-96 rounded-lg overflow-hidden border border-gray-300"
                style={{ minHeight: '384px' }}
            />
        </div>
    );
};

export default LocationPicker;
