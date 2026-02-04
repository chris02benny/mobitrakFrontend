import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Plus, X, Calendar, Clock, Truck, DollarSign, Navigation2, AlertCircle, Loader2 } from 'lucide-react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { tripService } from '../../services/tripService';
import { vehicleService } from '../../services/vehicleService';
import { hiringService } from '../../services/hiringService';
import toast from 'react-hot-toast';

// Set your Mapbox access token here
mapboxgl.accessToken = 'pk.eyJ1IjoiY2hyaXNiZW5ueSIsImEiOiJjbWN1MmZkZXgwNTdmMmxvb2t2NHNocWhpIn0.cS0ShNa1tNDVutsSvGTKkw';

const AddTripForm = ({ onSuccess }) => {
    const mapContainer = useRef(null);
    const map = useRef(null);
    const [vehicles, setVehicles] = useState([]);
    const [drivers, setDrivers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [calculatingRoute, setCalculatingRoute] = useState(false);
    
    const [formData, setFormData] = useState({
        tripType: 'commercial',
        vehicleId: '',
        driverId: '',
        startDestination: {
            name: '',
            location: { type: 'Point', coordinates: [] },
            address: ''
        },
        endDestination: {
            name: '',
            location: { type: 'Point', coordinates: [] },
            address: ''
        },
        stops: [],
        startDateTime: '',
        endDateTime: ''
    });

    const [routeData, setRouteData] = useState(null);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        fetchVehicles();
        fetchDrivers();
        initializeMap();
    }, []);

    useEffect(() => {
        if (formData.tripType && vehicles.length > 0) {
            // Auto-select first matching vehicle
            const matchingVehicle = vehicles.find(v => 
                (formData.tripType === 'commercial' && v.vehicleType === 'goods') ||
                (formData.tripType === 'passenger' && v.vehicleType === 'passenger')
            );
            if (matchingVehicle && !formData.vehicleId) {
                setFormData(prev => ({ ...prev, vehicleId: matchingVehicle._id }));
            }
        }
    }, [formData.tripType, vehicles]);

    const fetchVehicles = async () => {
        try {
            const data = await vehicleService.getVehicles();
            setVehicles(data);
        } catch (error) {
            console.error('Error fetching vehicles:', error);
            toast.error('Failed to load vehicles');
        }
    };

    const fetchDrivers = async () => {
        try {
            const employments = await hiringService.getEmployments();
            // Extract driver information from employments
            const driverList = employments.map(emp => ({
                _id: emp.driverId,
                name: `${emp.driverDetails?.firstName || ''} ${emp.driverDetails?.lastName || ''}`.trim() || 'Driver',
                email: emp.driverDetails?.email || '',
                serviceType: emp.serviceType
            }));
            setDrivers(driverList);
        } catch (error) {
            console.error('Error fetching drivers:', error);
            // Don't show error toast as drivers are optional
        }
    };

    const initializeMap = () => {
        if (map.current) return;

        map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: 'mapbox://styles/mapbox/streets-v12',
            center: [78.9629, 20.5937], // Center of India
            zoom: 4
        });

        map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

        // Add geocoder for location search
        map.current.on('click', handleMapClick);
    };

    const handleMapClick = (e) => {
        const coordinates = [e.lngLat.lng, e.lngLat.lat];
        
        // Geocode reverse to get address
        fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${coordinates[0]},${coordinates[1]}.json?access_token=${mapboxgl.accessToken}`)
            .then(res => res.json())
            .then(data => {
                if (data.features && data.features.length > 0) {
                    const place = data.features[0];
                    console.log('Clicked location:', {
                        name: place.text,
                        address: place.place_name,
                        coordinates
                    });
                }
            });
    };

    const searchLocation = async (query, field) => {
        if (!query || query.length < 3) return [];

        try {
            const response = await fetch(
                `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxgl.accessToken}&country=IN&limit=5`
            );
            const data = await response.json();
            return data.features || [];
        } catch (error) {
            console.error('Search error:', error);
            return [];
        }
    };

    const handleLocationSelect = (place, field) => {
        const location = {
            name: place.text,
            location: {
                type: 'Point',
                coordinates: place.center
            },
            address: place.place_name
        };

        setFormData(prev => ({
            ...prev,
            [field]: location
        }));

        // Add marker to map
        new mapboxgl.Marker()
            .setLngLat(place.center)
            .setPopup(new mapboxgl.Popup().setHTML(`<h3>${place.text}</h3><p>${place.place_name}</p>`))
            .addTo(map.current);

        // Fly to location
        map.current.flyTo({
            center: place.center,
            zoom: 12
        });

        // Calculate route if we have both start and end
        if (field === 'endDestination' && formData.startDestination.location.coordinates.length > 0) {
            calculateRoute();
        } else if (field === 'startDestination' && formData.endDestination.location.coordinates.length > 0) {
            calculateRoute();
        }
    };

    const addStop = () => {
        setFormData(prev => ({
            ...prev,
            stops: [...prev.stops, {
                name: '',
                location: { type: 'Point', coordinates: [] },
                address: ''
            }]
        }));
    };

    const removeStop = (index) => {
        setFormData(prev => ({
            ...prev,
            stops: prev.stops.filter((_, i) => i !== index)
        }));
        // Recalculate route
        setTimeout(calculateRoute, 100);
    };

    const updateStop = (index, place) => {
        const newStops = [...formData.stops];
        newStops[index] = {
            name: place.text,
            location: {
                type: 'Point',
                coordinates: place.center
            },
            address: place.place_name
        };

        setFormData(prev => ({
            ...prev,
            stops: newStops
        }));

        // Add marker
        new mapboxgl.Marker({ color: '#f59e0b' })
            .setLngLat(place.center)
            .setPopup(new mapboxgl.Popup().setHTML(`<h3>Stop: ${place.text}</h3>`))
            .addTo(map.current);

        // Recalculate route
        calculateRoute();
    };

    const calculateRoute = async () => {
        const { startDestination, endDestination, stops, tripType } = formData;

        if (!startDestination.location.coordinates.length || !endDestination.location.coordinates.length) {
            return;
        }

        setCalculatingRoute(true);

        try {
            const coordinates = [
                startDestination.location.coordinates,
                ...stops.filter(s => s.location.coordinates.length > 0).map(s => s.location.coordinates),
                endDestination.location.coordinates
            ];

            const data = await tripService.calculateRoute(coordinates, tripType);
            setRouteData(data);

            // Draw route on map
            if (map.current.getSource('route')) {
                map.current.removeLayer('route');
                map.current.removeSource('route');
            }

            map.current.addSource('route', {
                type: 'geojson',
                data: {
                    type: 'Feature',
                    properties: {},
                    geometry: data.route
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
                    'line-color': '#3b82f6',
                    'line-width': 4
                }
            });

            // Fit bounds to show entire route
            const coords = data.route.coordinates;
            const bounds = coords.reduce((bounds, coord) => {
                return bounds.extend(coord);
            }, new mapboxgl.LngLatBounds(coords[0], coords[0]));

            map.current.fitBounds(bounds, { padding: 50 });

            // Show suggested stops
            if (data.suggestedStops && data.suggestedStops.length > 0) {
                data.suggestedStops.forEach((stop, index) => {
                    new mapboxgl.Marker({ color: '#10b981' })
                        .setLngLat(stop.location.coordinates)
                        .setPopup(
                            new mapboxgl.Popup().setHTML(`
                                <h3>Suggested Stop ${index + 1}</h3>
                                <p>${stop.reason}</p>
                            `)
                        )
                        .addTo(map.current);
                });
            }

        } catch (error) {
            console.error('Route calculation error:', error);
            toast.error('Failed to calculate route');
        } finally {
            setCalculatingRoute(false);
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.tripType) newErrors.tripType = 'Trip type is required';
        if (!formData.vehicleId) newErrors.vehicleId = 'Vehicle selection is required';
        if (!formData.startDestination.location.coordinates.length) {
            newErrors.startDestination = 'Start destination is required';
        }
        if (!formData.endDestination.location.coordinates.length) {
            newErrors.endDestination = 'End destination is required';
        }
        if (!formData.startDateTime) newErrors.startDateTime = 'Start date and time is required';
        if (!formData.endDateTime) newErrors.endDateTime = 'End date and time is required';

        // Date validations
        if (formData.startDateTime && formData.endDateTime) {
            const now = new Date();
            const start = new Date(formData.startDateTime);
            const end = new Date(formData.endDateTime);
            const twoMonthsFromNow = new Date();
            twoMonthsFromNow.setMonth(now.getMonth() + 2);

            if (start < now) {
                newErrors.startDateTime = 'Start date cannot be in the past';
            }

            if (start > twoMonthsFromNow) {
                newErrors.startDateTime = 'Start date cannot be more than 2 months in the future';
            }

            if (end <= start) {
                newErrors.endDateTime = 'End date must be after start date';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            toast.error('Please fix the form errors');
            return;
        }

        setLoading(true);

        try {
            await tripService.createTrip(formData);
            toast.success('Trip created successfully!');
            onSuccess && onSuccess();
        } catch (error) {
            console.error('Create trip error:', error);
            toast.error(error.message || 'Failed to create trip');
        } finally {
            setLoading(false);
        }
    };

    const filteredVehicles = vehicles.filter(v => {
        if (formData.tripType === 'commercial') return v.vehicleType === 'goods';
        if (formData.tripType === 'passenger') return v.vehicleType === 'passenger';
        return true;
    });

    const filteredDrivers = drivers.filter(d => {
        // Filter drivers based on their service type matching the trip type
        if (formData.tripType === 'commercial') return d.serviceType === 'Commercial';
        if (formData.tripType === 'passenger') return d.serviceType === 'Passenger';
        return true;
    });

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - Form */}
                <div className="space-y-6">
                    {/* Trip Type */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Trip Type <span className="text-red-500">*</span>
                        </label>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, tripType: 'commercial', vehicleId: '' }))}
                                className={`p-4 rounded-lg border-2 transition-all ${
                                    formData.tripType === 'commercial'
                                        ? 'border-amber-500 bg-amber-50 text-amber-700'
                                        : 'border-gray-200 hover:border-gray-300'
                                }`}
                            >
                                <Truck className="mx-auto mb-2" size={24} />
                                <div className="font-medium">Commercial</div>
                                <div className="text-xs text-gray-500">Goods Transport</div>
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, tripType: 'passenger', vehicleId: '' }))}
                                className={`p-4 rounded-lg border-2 transition-all ${
                                    formData.tripType === 'passenger'
                                        ? 'border-amber-500 bg-amber-50 text-amber-700'
                                        : 'border-gray-200 hover:border-gray-300'
                                }`}
                            >
                                <MapPin className="mx-auto mb-2" size={24} />
                                <div className="font-medium">Passenger</div>
                                <div className="text-xs text-gray-500">People Transport</div>
                            </button>
                        </div>
                        {errors.tripType && <p className="text-red-500 text-sm mt-1">{errors.tripType}</p>}
                    </div>

                    {/* Vehicle Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Select Vehicle <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={formData.vehicleId}
                            onChange={(e) => setFormData(prev => ({ ...prev, vehicleId: e.target.value }))}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        >
                            <option value="">Select a vehicle</option>
                            {filteredVehicles.map(vehicle => (
                                <option key={vehicle._id} value={vehicle._id}>
                                    {vehicle.registrationNumber} - {vehicle.make} {vehicle.model}
                                </option>
                            ))}
                        </select>
                        {errors.vehicleId && <p className="text-red-500 text-sm mt-1">{errors.vehicleId}</p>}
                    </div>

                    {/* Driver Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Assign Driver (Optional)
                        </label>
                        <select
                            value={formData.driverId}
                            onChange={(e) => setFormData(prev => ({ ...prev, driverId: e.target.value }))}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        >
                            <option value="">No driver assigned</option>
                            {filteredDrivers.map(driver => (
                                <option key={driver._id} value={driver._id}>
                                    {driver.name} {driver.email ? `(${driver.email})` : ''}
                                </option>
                            ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                            Select from your employed drivers
                        </p>
                    </div>

                    {/* Location Picker Component */}
                    <LocationPicker
                        label="Start Destination"
                        value={formData.startDestination.name}
                        onSelect={(place) => handleLocationSelect(place, 'startDestination')}
                        error={errors.startDestination}
                        required
                    />

                    {/* Stops */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-gray-700">
                                Stops (Optional)
                            </label>
                            <button
                                type="button"
                                onClick={addStop}
                                className="flex items-center gap-1 text-sm text-amber-600 hover:text-amber-700"
                            >
                                <Plus size={16} />
                                Add Stop
                            </button>
                        </div>
                        <div className="space-y-3">
                            {formData.stops.map((stop, index) => (
                                <div key={index} className="flex gap-2">
                                    <div className="flex-1">
                                        <LocationPicker
                                            value={stop.name}
                                            onSelect={(place) => updateStop(index, place)}
                                            placeholder={`Stop ${index + 1}`}
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeStop(index)}
                                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <LocationPicker
                        label="End Destination"
                        value={formData.endDestination.name}
                        onSelect={(place) => handleLocationSelect(place, 'endDestination')}
                        error={errors.endDestination}
                        required
                    />

                    {/* Date Time */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Start Date & Time <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="datetime-local"
                                value={formData.startDateTime}
                                onChange={(e) => setFormData(prev => ({ ...prev, startDateTime: e.target.value }))}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                            />
                            {errors.startDateTime && <p className="text-red-500 text-sm mt-1">{errors.startDateTime}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                End Date & Time <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="datetime-local"
                                value={formData.endDateTime}
                                onChange={(e) => setFormData(prev => ({ ...prev, endDateTime: e.target.value }))}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                            />
                            {errors.endDateTime && <p className="text-red-500 text-sm mt-1">{errors.endDateTime}</p>}
                        </div>
                    </div>

                    {/* Route Information */}
                    {routeData && (
                        <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                            <h3 className="font-medium text-gray-900">Trip Details</h3>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <div className="text-sm text-gray-600">Distance</div>
                                    <div className="text-lg font-semibold text-gray-900">
                                        {routeData.distance.toFixed(2)} km
                                    </div>
                                </div>
                                <div>
                                    <div className="text-sm text-gray-600">Duration</div>
                                    <div className="text-lg font-semibold text-gray-900">
                                        {Math.round(routeData.duration)} min
                                    </div>
                                </div>
                                <div>
                                    <div className="text-sm text-gray-600">Amount</div>
                                    <div className="text-lg font-semibold text-green-600">
                                        ₹{routeData.amount.toLocaleString()}
                                    </div>
                                </div>
                            </div>

                            {routeData.suggestedStops && routeData.suggestedStops.length > 0 && (
                                <div className="mt-4">
                                    <div className="flex items-center gap-2 text-sm text-amber-600 mb-2">
                                        <AlertCircle size={16} />
                                        <span className="font-medium">Suggested Rest Stops</span>
                                    </div>
                                    <div className="space-y-2">
                                        {routeData.suggestedStops.map((stop, index) => (
                                            <div key={index} className="text-sm bg-white p-2 rounded border border-gray-200">
                                                <div className="font-medium">{stop.name}</div>
                                                <div className="text-gray-600 text-xs">{stop.reason}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading || calculatingRoute}
                        className="w-full bg-amber-500 text-white py-3 rounded-lg font-medium hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="animate-spin" size={20} />
                                Creating Trip...
                            </>
                        ) : (
                            <>
                                <Plus size={20} />
                                Create Trip
                            </>
                        )}
                    </button>
                </div>

                {/* Right Column - Map */}
                <div className="lg:sticky lg:top-6 h-[600px]">
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden h-full">
                        <div className="p-4 border-b border-gray-200 bg-gray-50">
                            <div className="flex items-center gap-2">
                                <Navigation2 size={20} className="text-amber-600" />
                                <h3 className="font-medium text-gray-900">Route Preview</h3>
                            </div>
                            {calculatingRoute && (
                                <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                                    <Loader2 className="animate-spin" size={16} />
                                    <span>Calculating route...</span>
                                </div>
                            )}
                        </div>
                        <div ref={mapContainer} className="h-[calc(100%-60px)]" />
                    </div>
                </div>
            </div>
        </form>
    );
};

// Location Picker Component
const LocationPicker = ({ label, value, onSelect, error, required, placeholder }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [showResults, setShowResults] = useState(false);
    const [searching, setSearching] = useState(false);

    // Sync query with value when value changes externally
    useEffect(() => {
        if (value && !query) {
            setQuery(value);
        }
    }, [value]);

    useEffect(() => {
        if (query.length >= 3) {
            const timer = setTimeout(() => {
                searchLocation();
            }, 300);
            return () => clearTimeout(timer);
        } else {
            setResults([]);
            setShowResults(false);
        }
    }, [query]);

    const searchLocation = async () => {
        setSearching(true);
        try {
            const response = await fetch(
                `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxgl.accessToken}&country=IN&limit=5`
            );
            const data = await response.json();
            setResults(data.features || []);
            setShowResults(true);
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            setSearching(false);
        }
    };

    const handleSelect = (place) => {
        setQuery(place.place_name);
        setResults([]);
        setShowResults(false);
        onSelect(place);
    };

    return (
        <div className="relative">
            {label && (
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
            )}
            <div className="relative">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        if (!e.target.value) {
                            setResults([]);
                            setShowResults(false);
                            onSelect(null);
                        }
                    }}
                    onFocus={() => {
                        if (results.length > 0 && query.length >= 3) {
                            setShowResults(true);
                        }
                    }}
                    onBlur={() => {
                        // Delay hiding to allow click on result
                        setTimeout(() => setShowResults(false), 200);
                    }}
                    placeholder={placeholder || "Search location..."}
                    className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                {searching && (
                    <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 animate-spin" size={18} />
                )}
            </div>

            {showResults && results.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {results.map((place, index) => (
                        <button
                            key={index}
                            type="button"
                            onMouseDown={(e) => {
                                e.preventDefault();
                                handleSelect(place);
                            }}
                            className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                        >
                            <div className="font-medium text-gray-900">{place.text}</div>
                            <div className="text-sm text-gray-600">{place.place_name}</div>
                        </button>
                    ))}
                </div>
            )}

            {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
        </div>
    );
};

export default AddTripForm;
