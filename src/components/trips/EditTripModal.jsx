import React, { useState, useEffect, useRef } from 'react';
import { X, Loader, MapPin, Navigation, Calendar, Clock, IndianRupee, Truck, User, Plus, Mail, Phone, Navigation2, Loader2, AlertCircle } from 'lucide-react';
import { tripService } from '../../services/tripService';
import { vehicleService } from '../../services/vehicleService';
import { hiringService } from '../../services/hiringService';
import toast from 'react-hot-toast';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

const EditTripModal = ({ trip, onClose, onSuccess }) => {
    // Helper function to format duration from minutes to days, hours, minutes
    const formatDuration = (minutes) => {
        if (!minutes || minutes <= 0) return '0 min';

        const days = Math.floor(minutes / (24 * 60));
        const hours = Math.floor((minutes % (24 * 60)) / 60);
        const mins = Math.floor(minutes % 60);

        const parts = [];
        if (days > 0) parts.push(`${days} day${days > 1 ? 's' : ''}`);
        if (hours > 0) parts.push(`${hours} hr${hours > 1 ? 's' : ''}`);
        if (mins > 0) parts.push(`${mins} min`);

        return parts.join(', ') || '0 min';
    };

    const [formData, setFormData] = useState({
        tripType: '',
        vehicleId: '',
        driverId: '',
        customerName: '',
        customerEmail: '',
        customerContact: '',
        amountPerKm: '',
        vehicleRent: '',
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
        endDateTime: '',
    });

    const [isTwoWay, setIsTwoWay] = useState(false);
    const [loading, setLoading] = useState(false);
    const [vehicles, setVehicles] = useState([]);
    const [drivers, setDrivers] = useState([]);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [errors, setErrors] = useState({});
    const [routeData, setRouteData] = useState(null);
    const [calculatingRoute, setCalculatingRoute] = useState(false);

    const mapContainer = useRef(null);
    const map = useRef(null);
    const markers = useRef([]);

    useEffect(() => {
        if (trip) {
            // Populate form with trip data
            setFormData({
                tripType: trip.tripType || 'commercial',
                vehicleId: trip.vehicleId || '',
                driverId: trip.driverId || '',
                customerName: trip.customerName || '',
                customerEmail: trip.customerEmail || '',
                customerContact: trip.customerContact || '',
                amountPerKm: trip.amountPerKm?.toString() || '',
                vehicleRent: trip.vehicleRent?.toString() || '',
                startDestination: trip.startDestination || {
                    name: '',
                    location: { type: 'Point', coordinates: [] },
                    address: ''
                },
                endDestination: trip.endDestination || {
                    name: '',
                    location: { type: 'Point', coordinates: [] },
                    address: ''
                },
                stops: trip.stops || [],
                startDateTime: trip.startDateTime ? new Date(trip.startDateTime).toISOString().slice(0, 16) : '',
                endDateTime: trip.endDateTime ? new Date(trip.endDateTime).toISOString().slice(0, 16) : '',
            });
            setIsTwoWay(trip.isTwoWay || false);
        }
    }, [trip]);

    useEffect(() => {
        fetchVehicles();
        fetchDrivers();
        // Delay map initialization to ensure DOM is ready
        setTimeout(() => {
            initializeMap();
        }, 100);
    }, []);

    // Re-fetch drivers when dates change to update availability
    useEffect(() => {
        if (formData.startDateTime && formData.endDateTime) {
            fetchDrivers();
            fetchVehicles();
        }
    }, [formData.startDateTime, formData.endDateTime]);

    useEffect(() => {
        if (map.current && formData.startDestination.location.coordinates.length > 0 &&
            formData.endDestination.location.coordinates.length > 0) {
            calculateRoute();
        }
    }, [formData.startDestination, formData.endDestination, formData.stops]);

    // Calculate route when map is ready and trip data is loaded
    useEffect(() => {
        if (trip && map.current && formData.startDestination?.location?.coordinates?.length > 0 &&
            formData.endDestination?.location?.coordinates?.length > 0) {
            // Small delay to ensure map is fully initialized
            setTimeout(() => {
                calculateRoute();
            }, 300);
        }
    }, [trip, map.current]);

    const initializeMap = () => {
        if (map.current) return;

        map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: 'mapbox://styles/mapbox/streets-v12',
            center: [78.9629, 20.5937], // Center of India
            zoom: 4
        });

        map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
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

            const data = await tripService.calculateRoute(coordinates, tripType || 'commercial');
            setRouteData(data);

            // Clear existing markers
            markers.current.forEach(marker => marker.remove());
            markers.current = [];

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
                    'line-color': '#F59E0B',
                    'line-width': 4
                }
            });

            // Add markers for start, stops, and end
            coordinates.forEach((coord, index) => {
                const el = document.createElement('div');
                el.className = 'custom-marker';

                if (index === 0) {
                    // Start marker (green)
                    el.innerHTML = `<div style="background-color: #10B981; width: 30px; height: 30px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`;
                } else if (index === coordinates.length - 1) {
                    // End marker (red)
                    el.innerHTML = `<div style="background-color: #EF4444; width: 30px; height: 30px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`;
                } else {
                    // Stop marker (amber)
                    el.innerHTML = `<div style="background-color: #F59E0B; width: 24px; height: 24px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`;
                }

                const marker = new mapboxgl.Marker(el)
                    .setLngLat(coord)
                    .addTo(map.current);

                markers.current.push(marker);
            });

            // Fit bounds to show entire route
            const coords = data.route.coordinates;
            const bounds = coords.reduce((bounds, coord) => {
                return bounds.extend(coord);
            }, new mapboxgl.LngLatBounds(coords[0], coords[0]));

            map.current.fitBounds(bounds, { padding: 50 });

        } catch (error) {
            console.error('Route calculation error:', error);
            toast.error('Failed to calculate route');
        } finally {
            setCalculatingRoute(false);
        }
    };

    const drawRouteOnMap = (geometry, coordinates) => {
        if (!map.current) return;

        // Clear existing markers and layers
        markersRef.current.forEach(marker => marker.remove());
        markersRef.current = [];

        if (map.current.getLayer('route')) {
            map.current.removeLayer('route');
        }
        if (map.current.getSource('route')) {
            map.current.removeSource('route');
        }

        // Add route line
        map.current.addSource('route', {
            type: 'geojson',
            data: {
                type: 'Feature',
                properties: {},
                geometry: geometry
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
                'line-color': '#F59E0B',
                'line-width': 4
            }
        });

        // Add markers
        coordinates.forEach((coord, index) => {
            const el = document.createElement('div');
            el.className = 'custom-marker';

            if (index === 0) {
                el.innerHTML = `<div style="background-color: #10B981; width: 30px; height: 30px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`;
            } else if (index === coordinates.length - 1) {
                el.innerHTML = `<div style="background-color: #EF4444; width: 30px; height: 30px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`;
            } else {
                el.innerHTML = `<div style="background-color: #F59E0B; width: 24px; height: 24px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`;
            }

            const marker = new mapboxgl.Marker(el)
                .setLngLat(coord)
                .addTo(map.current);

            markersRef.current.push(marker);
        });

        // Fit map to route bounds
        const bounds = new mapboxgl.LngLatBounds();
        coordinates.forEach(coord => bounds.extend(coord));
        map.current.fitBounds(bounds, { padding: 50 });
    };

    const fetchVehicles = async () => {
        try {
            // Fetch available vehicles based on trip assignments
            const params = {};
            if (formData.startDateTime && formData.endDateTime) {
                params.startDateTime = formData.startDateTime;
                params.endDateTime = formData.endDateTime;
            }

            const data = await vehicleService.getAvailableVehicles(params);
            // Include the currently assigned vehicle if it exists
            if (trip.vehicle) {
                const vehicleExists = data.some(v => v._id === trip.vehicleId);
                if (!vehicleExists) {
                    setVehicles([trip.vehicle, ...data]);
                } else {
                    setVehicles(data);
                }
            } else {
                setVehicles(data);
            }
        } catch (error) {
            console.error('Error fetching vehicles:', error);
            toast.error('Failed to load vehicles');
        }
    };

    const fetchDrivers = async () => {
        try {
            // Fetch available drivers based on trip assignments
            const params = {};
            if (formData.startDateTime && formData.endDateTime) {
                params.startDateTime = formData.startDateTime;
                params.endDateTime = formData.endDateTime;
            }

            const response = await hiringService.getAvailableDrivers(params);
            const employments = response.data?.employments || response.employments || [];

            // Extract driver information from employments
            const driverList = employments.map(emp => {
                // Extract the actual driver ID string
                let driverId = emp.driverId;

                // If it's an object, extract the ID
                if (driverId && typeof driverId === 'object') {
                    driverId = driverId._id || driverId.userId || driverId.id;
                }

                // Skip if we don't have a valid ID
                if (!driverId) {
                    console.warn('Invalid driver ID in employment:', emp);
                    return null;
                }

                return {
                    _id: String(driverId), // Ensure it's a string
                    name: `${emp.driverDetails?.firstName || ''} ${emp.driverDetails?.lastName || ''}`.trim() || 'Driver',
                    email: emp.driverDetails?.email || '',
                    serviceType: emp.serviceType,
                    assignmentStatus: emp.driverDetails?.assignmentStatus || emp.assignmentStatus || 'UNASSIGNED'
                };
            }).filter(driver => driver !== null); // Remove any null entries

            // Always include the currently assigned driver at the top
            if (trip.driver && trip.driverId) {
                const driverExists = driverList.some(d => d._id === String(trip.driverId));
                if (!driverExists) {
                    // Add currently assigned driver to the list
                    const assignedDriver = {
                        _id: String(trip.driverId),
                        name: `${trip.driver.firstName || ''} ${trip.driver.lastName || ''}`.trim() || 'Driver',
                        email: trip.driver.email || '',
                        assignmentStatus: 'ASSIGNED'
                    };
                    setDrivers([assignedDriver, ...driverList]);
                } else {
                    // Move currently assigned driver to top
                    const otherDrivers = driverList.filter(d => d._id !== String(trip.driverId));
                    const assignedDriver = driverList.find(d => d._id === String(trip.driverId));
                    setDrivers([assignedDriver, ...otherDrivers]);
                }
            } else {
                setDrivers(driverList);
            }
        } catch (error) {
            console.error('Error fetching drivers:', error);
            // Don't show error toast as drivers are optional
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        // Clear error for this field
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
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

        // Recalculate route
        calculateRoute();
    };

    const handleLocationSelect = (place, field) => {
        if (!place) return;

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

        // Calculate route if we have both start and end
        if (field === 'endDestination' && formData.startDestination.location.coordinates.length > 0) {
            calculateRoute();
        } else if (field === 'startDestination' && formData.endDestination.location.coordinates.length > 0) {
            calculateRoute();
        }
    };

    const clearLocation = (field) => {
        setFormData(prev => ({
            ...prev,
            [field]: {
                name: '',
                location: { type: 'Point', coordinates: [] },
                address: ''
            }
        }));

        // Remove route if start or end is cleared
        if ((field === 'startDestination' || field === 'endDestination') && map.current && map.current.getSource('route')) {
            map.current.removeLayer('route');
            map.current.removeSource('route');
            setRouteData(null);
        }

        // Clear error for this field
        setErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[field];
            return newErrors;
        });
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.tripType) newErrors.tripType = 'Trip type is required';
        if (!formData.vehicleId) newErrors.vehicleId = 'Vehicle is required';
        if (!formData.driverId) newErrors.driverId = 'Driver is required';
        if (!formData.customerName?.trim()) newErrors.customerName = 'Customer name is required';
        if (!formData.customerEmail?.trim()) newErrors.customerEmail = 'Customer email is required';
        if (!formData.customerContact?.trim()) newErrors.customerContact = 'Customer contact is required';
        if (!formData.startDestination?.name) newErrors.startDestination = 'Start destination is required';
        if (!formData.endDestination?.name) newErrors.endDestination = 'End destination is required';
        if (!formData.startDateTime) newErrors.startDateTime = 'Start date & time is required';
        if (!formData.endDateTime) newErrors.endDateTime = 'End date & time is required';
        if (!formData.amountPerKm) newErrors.amountPerKm = 'Amount per km is required';

        // Email validation
        if (formData.customerEmail && !/\S+@\S+\.\S+/.test(formData.customerEmail)) {
            newErrors.customerEmail = 'Invalid email format';
        }

        // Phone validation
        if (formData.customerContact && !/^\d{10}$/.test(formData.customerContact.replace(/[^\d]/g, ''))) {
            newErrors.customerContact = 'Invalid phone number (10 digits required)';
        }

        // Date validation
        if (formData.startDateTime && formData.endDateTime) {
            const start = new Date(formData.startDateTime);
            const end = new Date(formData.endDateTime);
            if (end <= start) {
                newErrors.endDateTime = 'End date must be after start date';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (validateForm()) {
            setShowConfirmModal(true);
        } else {
            toast.error('Please fix the errors in the form');
        }
    };

    const confirmUpdate = async () => {
        setShowConfirmModal(false);
        setLoading(true);

        try {
            // Extract IDs properly
            let vehicleId = formData.vehicleId;
            let driverId = formData.driverId;

            if (vehicleId && typeof vehicleId === 'object') {
                vehicleId = vehicleId._id || vehicleId.id || null;
            }

            if (driverId && typeof driverId === 'object') {
                driverId = driverId._id || driverId.id || null;
            }

            // Calculate total amount with two-way consideration
            const amountPerKm = parseFloat(formData.amountPerKm) || 0;
            const vehicleRent = parseFloat(formData.vehicleRent) || 0;
            const distance = routeData?.distance || 0;
            const distanceMultiplier = isTwoWay ? 2 : 1;
            const totalAmount = (amountPerKm * distance * distanceMultiplier) + vehicleRent;

            const updatePayload = {
                tripType: formData.tripType,
                vehicleId: vehicleId,
                driverId: driverId,
                customerName: formData.customerName.trim(),
                customerEmail: formData.customerEmail.trim(),
                customerContact: formData.customerContact.trim(),
                startDestination: formData.startDestination,
                endDestination: formData.endDestination,
                stops: formData.stops.filter(stop => stop.location.coordinates.length > 0),
                startDateTime: formData.startDateTime,
                endDateTime: formData.endDateTime,
                amountPerKm: amountPerKm,
                vehicleRent: vehicleRent,
                totalAmount: totalAmount,
                distance: distance * distanceMultiplier,
                isTwoWay: isTwoWay
            };

            await tripService.updateTrip(trip._id, updatePayload);
            toast.success('Trip updated successfully!');
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Update trip error:', error);
            toast.error(error.message || 'Failed to update trip');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <div className="fixed inset-0 top-0 left-0 right-0 bottom-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
                <div className="bg-white rounded-lg max-w-7xl w-full my-8 shadow-xl">
                    {/* Modal Header */}
                    <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between rounded-t-lg z-10">
                        <h2 className="text-xl font-bold text-gray-900">Edit Trip</h2>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                            <X size={24} />
                        </button>
                    </div>

                    {/* Modal Body */}
                    <form onSubmit={handleSubmit} className="p-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Left Column - Form */}
                            <div className="space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto pr-4">
                                {/* Trip Type */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Trip Type <span className="text-red-500">*</span>
                                    </label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <button
                                            type="button"
                                            onClick={() => handleInputChange({ target: { name: 'tripType', value: 'commercial' } })}
                                            className={`p-4 rounded-lg border-2 transition-all ${formData.tripType === 'commercial'
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
                                            onClick={() => handleInputChange({ target: { name: 'tripType', value: 'passenger' } })}
                                            className={`p-4 rounded-lg border-2 transition-all ${formData.tripType === 'passenger'
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
                                        name="vehicleId"
                                        value={formData.vehicleId}
                                        onChange={handleInputChange}
                                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent ${errors.vehicleId ? 'border-red-500' : 'border-gray-300'}`}
                                    >
                                        <option value="">Select a vehicle</option>
                                        {vehicles.map(vehicle => (
                                            <option key={vehicle._id} value={vehicle._id}>
                                                {vehicle.registrationNumber || vehicle.regnNo} - {vehicle.make || vehicle.makersName || 'Unknown'} {vehicle.model || vehicle.vehicleClass || ''}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.vehicleId && <p className="text-red-500 text-sm mt-1">{errors.vehicleId}</p>}
                                </div>

                                {/* Driver Selection */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Assign Driver <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        name="driverId"
                                        value={formData.driverId}
                                        onChange={handleInputChange}
                                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent ${errors.driverId ? 'border-red-500' : 'border-gray-300'}`}
                                    >
                                        <option value="">Select a driver</option>
                                        {drivers.map(driver => (
                                            <option key={driver._id} value={driver._id}>
                                                {driver.name} {driver.email ? `(${driver.email})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.driverId && <p className="text-red-500 text-sm mt-1">{errors.driverId}</p>}
                                </div>

                                {/* Customer Information */}
                                <div className="space-y-4 border-t border-gray-200 pt-4">
                                    <h3 className="text-sm font-semibold text-gray-900">Customer Information</h3>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            <User size={16} className="inline mr-1" />
                                            Customer Name <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            name="customerName"
                                            value={formData.customerName}
                                            onChange={handleInputChange}
                                            placeholder="Enter customer name"
                                            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent ${errors.customerName ? 'border-red-500' : 'border-gray-300'}`}
                                        />
                                        {errors.customerName && <p className="text-red-500 text-sm mt-1">{errors.customerName}</p>}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            <Mail size={16} className="inline mr-1" />
                                            Customer Email <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="email"
                                            name="customerEmail"
                                            value={formData.customerEmail}
                                            onChange={(e) => {
                                                const email = e.target.value;
                                                setFormData(prev => ({ ...prev, customerEmail: email }));

                                                // Live email validation
                                                if (email && !/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
                                                    setErrors(prev => ({ ...prev, customerEmail: 'Please enter a valid email address' }));
                                                } else {
                                                    setErrors(prev => ({ ...prev, customerEmail: '' }));
                                                }
                                            }}
                                            placeholder="customer@example.com"
                                            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent ${errors.customerEmail ? 'border-red-500' : 'border-gray-300'}`}
                                        />
                                        {errors.customerEmail && <p className="text-red-500 text-sm mt-1">{errors.customerEmail}</p>}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            <Phone size={16} className="inline mr-1" />
                                            Customer Contact Number <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="tel"
                                            name="customerContact"
                                            value={formData.customerContact}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                // Allow only numbers, +, spaces, and hyphens
                                                if (value === '' || /^[0-9+\s-]*$/.test(value)) {
                                                    setFormData(prev => ({ ...prev, customerContact: value }));

                                                    // Live phone validation
                                                    if (value && !/^(\+91[\s-]?)?[6-9]\d{9}$/.test(value.replace(/[\s-]/g, ''))) {
                                                        setErrors(prev => ({ ...prev, customerContact: 'Please enter a valid Indian mobile number' }));
                                                    } else {
                                                        setErrors(prev => ({ ...prev, customerContact: '' }));
                                                    }
                                                }
                                            }}
                                            placeholder="+91 XXXXX XXXXX"
                                            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent ${errors.customerContact ? 'border-red-500' : 'border-gray-300'}`}
                                        />
                                        {errors.customerContact && <p className="text-red-500 text-sm mt-1">{errors.customerContact}</p>}
                                    </div>
                                </div>

                                {/* Pricing Information */}
                                <div className="space-y-4 border-t border-gray-200 pt-4">
                                    <h3 className="text-sm font-semibold text-gray-900">Pricing Details</h3>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Amount per KM (₹) <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                name="amountPerKm"
                                                value={formData.amountPerKm}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    // Allow only numbers and decimal point
                                                    if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                                        const numValue = parseFloat(value);
                                                        if (value === '' || numValue >= 1 || value.endsWith('.')) {
                                                            setFormData(prev => ({ ...prev, amountPerKm: value }));
                                                        }
                                                    }
                                                    if (errors.amountPerKm) {
                                                        setErrors(prev => ({ ...prev, amountPerKm: '' }));
                                                    }
                                                }}
                                                placeholder="Minimum 1"
                                                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent ${errors.amountPerKm ? 'border-red-500' : 'border-gray-300'}`}
                                            />
                                            {errors.amountPerKm && <p className="text-red-500 text-xs mt-1">{errors.amountPerKm}</p>}
                                            {!errors.amountPerKm && formData.amountPerKm && parseFloat(formData.amountPerKm) < 1 && (
                                                <p className="text-red-500 text-xs mt-1">Amount must be at least ₹1</p>
                                            )}
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Vehicle Rent (₹) <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                name="vehicleRent"
                                                value={formData.vehicleRent}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    // Allow only numbers and decimal point
                                                    if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                                        const numValue = parseFloat(value);
                                                        if (value === '' || numValue >= 1 || value.endsWith('.')) {
                                                            setFormData(prev => ({ ...prev, vehicleRent: value }));
                                                        }
                                                    }
                                                    if (errors.vehicleRent) {
                                                        setErrors(prev => ({ ...prev, vehicleRent: '' }));
                                                    }
                                                }}
                                                placeholder="Minimum 1"
                                                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent ${errors.vehicleRent ? 'border-red-500' : 'border-gray-300'}`}
                                            />
                                            {errors.vehicleRent && <p className="text-red-500 text-xs mt-1">{errors.vehicleRent}</p>}
                                            {!errors.vehicleRent && formData.vehicleRent && parseFloat(formData.vehicleRent) < 1 && (
                                                <p className="text-red-500 text-xs mt-1">Rent must be at least ₹1</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Two-Way Trip Checkbox */}
                                    <div className="flex items-center space-x-2 pt-2">
                                        <input
                                            type="checkbox"
                                            id="isTwoWay"
                                            checked={isTwoWay}
                                            onChange={(e) => setIsTwoWay(e.target.checked)}
                                            className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
                                        />
                                        <label htmlFor="isTwoWay" className="text-sm font-medium text-gray-700">
                                            Charge for Two-Way Trip (Return Journey)
                                        </label>
                                    </div>
                                </div>

                                {/* Destinations */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="block text-sm font-medium text-gray-700">
                                            Start Destination <span className="text-red-500">*</span>
                                        </label>
                                        {formData.startDestination.name && (
                                            <button
                                                type="button"
                                                onClick={() => clearLocation('startDestination')}
                                                className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700"
                                            >
                                                <X size={16} />
                                                Clear
                                            </button>
                                        )}
                                    </div>
                                    <LocationPicker
                                        value={formData.startDestination.name}
                                        onSelect={(place) => handleLocationSelect(place, 'startDestination')}
                                        error={errors.startDestination}
                                    />
                                </div>

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

                                {/* End Destination */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="block text-sm font-medium text-gray-700">
                                            End Destination <span className="text-red-500">*</span>
                                        </label>
                                        {formData.endDestination.name && (
                                            <button
                                                type="button"
                                                onClick={() => clearLocation('endDestination')}
                                                className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700"
                                            >
                                                <X size={16} />
                                                Clear
                                            </button>
                                        )}
                                    </div>
                                    <LocationPicker
                                        value={formData.endDestination.name}
                                        onSelect={(place) => handleLocationSelect(place, 'endDestination')}
                                        error={errors.endDestination}
                                    />
                                </div>

                                {/* Date Time */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Start Date & Time <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="datetime-local"
                                            name="startDateTime"
                                            value={formData.startDateTime}
                                            min={new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().slice(0, 16)}
                                            onChange={handleInputChange}
                                            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent ${errors.startDateTime ? 'border-red-500' : 'border-gray-300'}`}
                                        />
                                        {errors.startDateTime && <p className="text-red-500 text-sm mt-1">{errors.startDateTime}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            End Date & Time <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="datetime-local"
                                            name="endDateTime"
                                            value={formData.endDateTime}
                                            onChange={handleInputChange}
                                            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent ${errors.endDateTime ? 'border-red-500' : 'border-gray-300'}`}
                                        />
                                        {errors.endDateTime && <p className="text-red-500 text-sm mt-1">{errors.endDateTime}</p>}
                                    </div>
                                </div>

                                {/* Route Information */}
                                {routeData && (
                                    <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                                        <h3 className="font-medium text-gray-900">Trip Details</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <div className="text-sm text-gray-600">Distance</div>
                                                <div className="text-lg font-semibold text-gray-900">
                                                    {(routeData.distance * (isTwoWay ? 2 : 1)).toFixed(2)} km
                                                    {isTwoWay && (
                                                        <span className="text-xs text-gray-500 ml-1">(Two-Way)</span>
                                                    )}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-sm text-gray-600">Estimated Duration</div>
                                                <div className="text-lg font-semibold text-gray-900">
                                                    {formatDuration((routeData.duration * (isTwoWay ? 2 : 1)) + (formData.stops.length * 30))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Price Breakdown */}
                                        {(formData.amountPerKm || formData.vehicleRent) && (
                                            <div className="mt-4 border-t border-gray-200 pt-3">
                                                <h4 className="text-sm font-semibold text-gray-900 mb-3">Price Breakdown</h4>
                                                <div className="space-y-2">
                                                    {formData.amountPerKm && parseFloat(formData.amountPerKm) > 0 && (
                                                        <div className="flex justify-between items-center text-sm">
                                                            <span className="text-gray-600">
                                                                {isTwoWay ? (
                                                                    <>Distance Charges ({routeData.distance.toFixed(2)} km × 2 for two-way × ₹{formData.amountPerKm}/km)</>
                                                                ) : (
                                                                    <>Distance Charges ({routeData.distance.toFixed(2)} km × ₹{formData.amountPerKm}/km)</>
                                                                )}
                                                            </span>
                                                            <span className="font-medium text-gray-900">
                                                                ₹{(parseFloat(formData.amountPerKm) * routeData.distance * (isTwoWay ? 2 : 1)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {formData.vehicleRent && parseFloat(formData.vehicleRent) > 0 && (
                                                        <div className="flex justify-between items-center text-sm">
                                                            <span className="text-gray-600">Vehicle Rent</span>
                                                            <span className="font-medium text-gray-900">
                                                                ₹{parseFloat(formData.vehicleRent).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                                            </span>
                                                        </div>
                                                    )}
                                                    <div className="flex justify-between items-center text-base border-t border-gray-200 pt-2 mt-2">
                                                        <span className="font-semibold text-gray-900">Total Amount</span>
                                                        <span className="font-bold text-green-600 text-lg">
                                                            ₹{((parseFloat(formData.amountPerKm) * routeData.distance * (isTwoWay ? 2 : 1)) + parseFloat(formData.vehicleRent || 0)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                                        </span>
                                                    </div>
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
                                            Updating Trip...
                                        </>
                                    ) : (
                                        'Update Trip'
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
                </div>
            </div>

            {/* Confirmation Modal */}
            {showConfirmModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg max-w-md w-full p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Confirm Trip Update</h3>
                        <p className="text-gray-600 mb-6">
                            Are you sure you want to update this trip? This will recalculate the route and pricing.
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setShowConfirmModal(false)}
                                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmUpdate}
                                className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600"
                            >
                                Confirm Update
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

// Location Picker Component
const LocationPicker = ({ label, value, onSelect, error, required, placeholder }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [showResults, setShowResults] = useState(false);
    const [searching, setSearching] = useState(false);
    const [isUserTyping, setIsUserTyping] = useState(false);

    // Sync query with value when value changes externally
    useEffect(() => {
        if (value !== undefined) {
            setQuery(value || '');
            // Don't show results when value is set programmatically
            if (!isUserTyping) {
                setShowResults(false);
            }
        }
    }, [value, isUserTyping]);

    useEffect(() => {
        if (query.length >= 3 && isUserTyping) {
            const timer = setTimeout(() => {
                searchLocation();
            }, 300);
            return () => clearTimeout(timer);
        } else if (!isUserTyping) {
            setResults([]);
            setShowResults(false);
        }
    }, [query, isUserTyping]);

    const searchLocation = async () => {
        if (!isUserTyping) return;

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
        if (onSelect) {
            onSelect(place);
        }
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
                        setIsUserTyping(true);
                        if (!e.target.value) {
                            setResults([]);
                            setShowResults(false);
                            if (onSelect) {
                                onSelect(null);
                            }
                        }
                    }}
                    onFocus={() => {
                        setIsUserTyping(true);
                        if (results.length > 0 && query.length >= 3) {
                            setShowResults(true);
                        }
                    }}
                    onBlur={() => {
                        // Delay to allow click on results
                        setTimeout(() => {
                            setShowResults(false);
                            setIsUserTyping(false);
                        }, 200);
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

export default EditTripModal;
