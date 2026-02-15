import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Plus, X, Calendar, Clock, Truck, DollarSign, Navigation2, AlertCircle, Loader2, User, Mail, Phone } from 'lucide-react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { tripService } from '../../services/tripService';
import { vehicleService } from '../../services/vehicleService';
import { hiringService } from '../../services/hiringService';
import toast from 'react-hot-toast';
import StepProgress from './StepProgress';
import TripRangeCalendar from '../common/TripRangeCalendar';

// Set your Mapbox access token here
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

const AddTripForm = ({ onSuccess }) => {
    const mapContainer = useRef(null);
    const map = useRef(null);
    const markers = useRef([]); // Track all markers
    const [vehicles, setVehicles] = useState([]);
    const [drivers, setDrivers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [calculatingRoute, setCalculatingRoute] = useState(false);
    const [isTwoWay, setIsTwoWay] = useState(false);
    const [currentStep, setCurrentStep] = useState(1); // 1: Assign, 2: Customer, 3: Route, 4: Review

    const [formData, setFormData] = useState({
        tripType: 'commercial',
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
        endDateTime: ''
    });

    const [routeData, setRouteData] = useState(null);
    const [errors, setErrors] = useState({});
    const [dateWarning, setDateWarning] = useState('');
    const [blockedDateRanges, setBlockedDateRanges] = useState([]);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [existingTrips, setExistingTrips] = useState([]);

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

    useEffect(() => {
        fetchVehicles();
        fetchDrivers();
        initializeMap();
    }, []);

    // Re-fetch drivers when dates change to update availability
    useEffect(() => {
        if (formData.startDateTime && formData.endDateTime) {
            fetchDrivers();
            fetchVehicles();
        }
    }, [formData.startDateTime, formData.endDateTime]);

    // Check if selected dates are enough for the trip duration
    useEffect(() => {
        if (formData.startDateTime && formData.endDateTime && routeData) {
            const start = new Date(formData.startDateTime);
            const end = new Date(formData.endDateTime);
            const timeDiffMinutes = (end - start) / (1000 * 60);

            // Add estimated stop time (30 min per stop)
            const estimatedStopTime = formData.stops.length * 30;
            const totalRequiredTime = routeData.duration + estimatedStopTime;

            if (timeDiffMinutes < totalRequiredTime) {
                const shortfall = totalRequiredTime - timeDiffMinutes;
                setDateWarning(`⚠️ Warning: The selected dates provide ${formatDuration(timeDiffMinutes)}, but the trip requires approximately ${formatDuration(totalRequiredTime)} (including ${formatDuration(estimatedStopTime)} for ${formData.stops.length} stop${formData.stops.length !== 1 ? 's' : ''}). You need about ${formatDuration(shortfall)} more time.`);
            } else {
                setDateWarning('');
            }
        }
    }, [formData.startDateTime, formData.endDateTime, routeData, formData.stops.length]);

    // Initialize map when user navigates to step 3 (where map is displayed)
    useEffect(() => {
        if (currentStep === 3) {
            // Small delay to ensure DOM is ready
            setTimeout(() => {
                initializeMap();
            }, 100);
        }
    }, [currentStep]);

    const fetchVehicles = async () => {
        try {
            // Fetch ALL vehicles (not just available ones)
            const data = await vehicleService.getVehicles();
            setVehicles(data);
        } catch (error) {
            console.error('Error fetching vehicles:', error);
            toast.error('Failed to load vehicles');
        }
    };

    const fetchDrivers = async () => {
        try {
            // Fetch ALL active employments (not just available ones)
            const response = await hiringService.getCompanyEmployees('ACTIVE');
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

            setDrivers(driverList);
        } catch (error) {
            console.error('Error fetching drivers:', error);
            // Don't show error toast as drivers are optional
        }
    };

    // Fetch existing trips for selected vehicle and driver
    const fetchExistingTrips = async () => {
        try {
            const trips = await tripService.getTrips({
                status: 'scheduled,in-progress'
            });
            setExistingTrips(trips || []);
            calculateBlockedDateRanges(trips || []);
        } catch (error) {
            console.error('Error fetching existing trips:', error);
            setExistingTrips([]);
            setBlockedDateRanges([]);
        }
    };

    // Fetch busy dates for selected vehicle and driver
    const fetchBusyDates = async () => {
        try {
            const blocked = [];

            // Fetch busy dates for vehicle if selected
            if (formData.vehicleId) {
                const vehicleData = await tripService.getBusyDates(null, formData.vehicleId);
                if (vehicleData.busyDates && vehicleData.busyDates.length > 0) {
                    vehicleData.busyDates.forEach(busy => {
                        blocked.push({
                            start: new Date(busy.startDate),
                            end: new Date(busy.endDate),
                            type: 'vehicle',
                            tripId: busy.tripId
                        });
                    });
                }
            }

            // Fetch busy dates for driver if selected
            if (formData.driverId) {
                const driverData = await tripService.getBusyDates(formData.driverId, null);
                if (driverData.busyDates && driverData.busyDates.length > 0) {
                    driverData.busyDates.forEach(busy => {
                        blocked.push({
                            start: new Date(busy.startDate),
                            end: new Date(busy.endDate),
                            type: 'driver',
                            tripId: busy.tripId
                        });
                    });
                }
            }

            setBlockedDateRanges(blocked);
        } catch (error) {
            console.error('Error fetching busy dates:', error);
            // Don't show error toast, just log it
        }
    };

    // Check if a date range overlaps with any blocked ranges
    const checkDateConflict = (startDate, endDate) => {
        const start = new Date(startDate);
        const end = new Date(endDate);

        for (const blocked of blockedDateRanges) {
            // Check if dates overlap
            if (
                (start >= blocked.start && start <= blocked.end) || // Start falls within blocked range
                (end >= blocked.start && end <= blocked.end) ||     // End falls within blocked range
                (start <= blocked.start && end >= blocked.end)      // New range contains blocked range
            ) {
                return {
                    conflict: true,
                    type: blocked.type,
                    blockedStart: blocked.start,
                    blockedEnd: blocked.end
                };
            }
        }

        return { conflict: false };
    };

    // Fetch busy dates when vehicle or driver selection changes
    useEffect(() => {
        if (formData.vehicleId || formData.driverId) {
            fetchBusyDates();
        } else {
            setBlockedDateRanges([]);
        }
    }, [formData.vehicleId, formData.driverId]);

    const initializeMap = () => {
        if (map.current) return;
        if (!mapContainer.current) return; // Don't initialize if container doesn't exist yet

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
                // Location clicked on map
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

    const clearLocation = (field) => {
        // Clear all markers first
        markers.current.forEach(marker => marker.remove());
        markers.current = [];

        // Update form data
        setFormData(prev => {
            const updated = {
                ...prev,
                [field]: {
                    name: '',
                    location: { type: 'Point', coordinates: [] },
                    address: ''
                }
            };

            // Use setTimeout to ensure state is updated before redrawing markers
            setTimeout(() => {
                // Redraw markers for remaining locations using the updated data
                if (field !== 'startDestination' && updated.startDestination.location.coordinates.length > 0) {
                    const marker = new mapboxgl.Marker({ color: '#10b981' })
                        .setLngLat(updated.startDestination.location.coordinates)
                        .setPopup(new mapboxgl.Popup().setHTML(`<h3>${updated.startDestination.name}</h3><p>${updated.startDestination.address}</p>`))
                        .addTo(map.current);
                    markers.current.push(marker);
                }

                if (field !== 'endDestination' && updated.endDestination.location.coordinates.length > 0) {
                    const marker = new mapboxgl.Marker({ color: '#ef4444' })
                        .setLngLat(updated.endDestination.location.coordinates)
                        .setPopup(new mapboxgl.Popup().setHTML(`<h3>${updated.endDestination.name}</h3><p>${updated.endDestination.address}</p>`))
                        .addTo(map.current);
                    markers.current.push(marker);
                }

                // Redraw stops
                updated.stops.forEach((stop, index) => {
                    if (stop.location.coordinates.length > 0) {
                        const marker = new mapboxgl.Marker({ color: '#f59e0b' })
                            .setLngLat(stop.location.coordinates)
                            .setPopup(new mapboxgl.Popup().setHTML(`<h3>Stop ${index + 1}</h3><p>${stop.address}</p>`))
                            .addTo(map.current);
                        markers.current.push(marker);
                    }
                });
            }, 0);

            return updated;
        });

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

    const handleLocationSelect = (place, field) => {
        // Check if place is null or undefined
        if (!place) {
            return;
        }

        // Validate that the location is in India
        const isInIndia = (place.context && place.context.some(ctx =>
            ctx.id.includes('country') && ctx.short_code === 'in'
        )) || (place.place_name && place.place_name.toLowerCase().includes('india'));

        if (!isInIndia) {
            toast.error('Please select a location within India only');
            return;
        }

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

        // Clear previous markers and redraw all
        markers.current.forEach(marker => marker.remove());
        markers.current = [];

        // Add markers for start, end, and stops
        const updatedFormData = { ...formData, [field]: location };

        if (updatedFormData.startDestination.location.coordinates.length > 0) {
            const startMarker = new mapboxgl.Marker({ color: '#10b981' })
                .setLngLat(updatedFormData.startDestination.location.coordinates)
                .setPopup(new mapboxgl.Popup().setHTML(`<h3>${updatedFormData.startDestination.name}</h3><p>${updatedFormData.startDestination.address}</p>`))
                .addTo(map.current);
            markers.current.push(startMarker);
        }

        if (updatedFormData.endDestination.location.coordinates.length > 0) {
            const endMarker = new mapboxgl.Marker({ color: '#ef4444' })
                .setLngLat(updatedFormData.endDestination.location.coordinates)
                .setPopup(new mapboxgl.Popup().setHTML(`<h3>${updatedFormData.endDestination.name}</h3><p>${updatedFormData.endDestination.address}</p>`))
                .addTo(map.current);
            markers.current.push(endMarker);
        }

        updatedFormData.stops.forEach((stop, index) => {
            if (stop.location.coordinates.length > 0) {
                const stopMarker = new mapboxgl.Marker({ color: '#f59e0b' })
                    .setLngLat(stop.location.coordinates)
                    .setPopup(new mapboxgl.Popup().setHTML(`<h3>Stop ${index + 1}</h3><p>${stop.address}</p>`))
                    .addTo(map.current);
                markers.current.push(stopMarker);
            }
        });

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

        } catch (error) {
            console.error('Route calculation error:', error);
            toast.error('Failed to calculate route');
        } finally {
            setCalculatingRoute(false);
        }
    };

    const validateForm = () => {
        let isValid = true;

        // Trip type validation
        if (!formData.tripType) {
            toast.error('Trip type is required');
            isValid = false;
        }

        // Vehicle validation
        if (!formData.vehicleId) {
            toast.error('Vehicle selection is required');
            isValid = false;
        }

        // Driver validation
        if (!formData.driverId) {
            toast.error('Driver assignment is required');
            isValid = false;
        }

        // Customer name validation
        if (!formData.customerName || formData.customerName.trim().length < 2) {
            toast.error('Customer name is required (minimum 2 characters)');
            isValid = false;
        }

        // Email validation
        if (!formData.customerEmail) {
            toast.error('Customer email is required');
            isValid = false;
        } else if (!/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(formData.customerEmail)) {
            toast.error('Please enter a valid email address');
            isValid = false;
        }

        // Phone validation
        if (!formData.customerContact) {
            toast.error('Customer contact number is required');
            isValid = false;
        } else if (!/^(\+91[\s-]?)?[6-9]\d{9}$/.test(formData.customerContact.replace(/[\s-]/g, ''))) {
            toast.error('Please enter a valid Indian mobile number');
            isValid = false;
        }

        // Pricing validation
        if (!formData.amountPerKm || parseFloat(formData.amountPerKm) < 1) {
            toast.error('Amount per KM is required (minimum ₹1)');
            isValid = false;
        }
        if (!formData.vehicleRent || parseFloat(formData.vehicleRent) < 1) {
            toast.error('Vehicle rent is required (minimum ₹1)');
            isValid = false;
        }

        // Destination validation
        if (!formData.startDestination.location.coordinates.length) {
            toast.error('Start destination is required');
            isValid = false;
        }
        if (!formData.endDestination.location.coordinates.length) {
            toast.error('End destination is required');
            isValid = false;
        }

        // Date time validation
        if (!formData.startDateTime) {
            toast.error('Start date and time is required');
            isValid = false;
        }
        if (!formData.endDateTime) {
            toast.error('End date and time is required');
            isValid = false;
        }

        // Date validations
        if (formData.startDateTime && formData.endDateTime) {
            const now = new Date();
            const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
            const start = new Date(formData.startDateTime);
            const end = new Date(formData.endDateTime);
            const twoMonthsFromNow = new Date();
            twoMonthsFromNow.setMonth(now.getMonth() + 2);

            if (start < twoHoursFromNow) {
                toast.error('Start date must be at least 2 hours from now');
                isValid = false;
            }

            if (start > twoMonthsFromNow) {
                toast.error('Start date cannot be more than 2 months in the future');
                isValid = false;
            }

            if (end <= start) {
                toast.error('End date must be after start date');
                isValid = false;
            }

            // Check if duration meets trip requirements
            if (routeData && end > start) {
                const timeDiffMinutes = (end - start) / (1000 * 60);
                const estimatedStopTime = formData.stops.length * 30;
                const totalRequiredTime = routeData.duration + estimatedStopTime;

                if (timeDiffMinutes < totalRequiredTime) {
                    const shortfall = totalRequiredTime - timeDiffMinutes;
                    toast.error(`Duration too short for the required trip time`);
                    isValid = false;
                }
            }

            // Check for date conflicts
            const conflict = checkDateConflict(formData.startDateTime, formData.endDateTime);
            if (conflict.conflict) {
                const conflictType = conflict.type === 'vehicle' ? 'vehicle' : 'driver';
                toast.error(`Selected ${conflictType} is already assigned to another trip`);
                isValid = false;
            }
        }

        return isValid;
    };

    // Step-specific validation
    const validateStep = (step) => {
        let isValid = true;

        if (step === 1) {
            if (!formData.tripType) {
                toast.error('Trip type is required');
                isValid = false;
            }
            if (!formData.vehicleId) {
                toast.error('Vehicle selection is required');
                isValid = false;
            }
            if (!formData.driverId) {
                toast.error('Driver assignment is required');
                isValid = false;
            }
        } else if (step === 2) {
            if (!formData.customerName || formData.customerName.trim().length < 2) {
                toast.error('Customer name is required (minimum 2 characters)');
                isValid = false;
            }
            if (!formData.customerEmail) {
                toast.error('Customer email is required');
                isValid = false;
            } else if (!/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(formData.customerEmail)) {
                toast.error('Please enter a valid email address');
                isValid = false;
            }
            if (!formData.customerContact) {
                toast.error('Customer contact number is required');
                isValid = false;
            } else if (!/^(\+91[\s-]?)?[6-9]\d{9}$/.test(formData.customerContact.replace(/[\s-]/g, ''))) {
                toast.error('Please enter a valid Indian mobile number');
                isValid = false;
            }
        } else if (step === 3) {
            if (!formData.startDateTime) {
                toast.error('Start date and time is required');
                isValid = false;
            }
            if (!formData.endDateTime) {
                toast.error('End date and time is required');
                isValid = false;
            }

            if (formData.startDateTime && formData.endDateTime) {
                const now = new Date();
                const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
                const start = new Date(formData.startDateTime);
                const end = new Date(formData.endDateTime);

                if (start < twoHoursFromNow) {
                    toast.error('Start date must be at least 2 hours from now');
                    isValid = false;
                }
                if (end <= start) {
                    toast.error('End date must be after start date');
                    isValid = false;
                }

                const conflict = checkDateConflict(formData.startDateTime, formData.endDateTime);
                if (conflict.conflict) {
                    const conflictType = conflict.type === 'vehicle' ? 'vehicle' : 'driver';
                    toast.error(`Selected ${conflictType} is already assigned to another trip`);
                    isValid = false;
                }
            }
        } else if (step === 4) {
            if (!formData.amountPerKm || parseFloat(formData.amountPerKm) < 1) {
                toast.error('Amount per KM is required (minimum ₹1)');
                isValid = false;
            }
            if (!formData.vehicleRent || parseFloat(formData.vehicleRent) < 1) {
                toast.error('Vehicle rent is required (minimum ₹1)');
                isValid = false;
            }
            if (!formData.startDestination.location.coordinates.length) {
                toast.error('Start destination is required');
                isValid = false;
            }
            if (!formData.endDestination.location.coordinates.length) {
                toast.error('End destination is required');
                isValid = false;
            }
        }

        return isValid;
    };

    const handleNextStep = () => {
        if (validateStep(currentStep)) {
            setCurrentStep(prev => prev + 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            const errorCount = Object.keys(errors).length;
            toast.error(`Please fix ${errorCount} error${errorCount > 1 ? 's' : ''} before continuing`);
        }
    };

    const handlePreviousStep = () => {
        setCurrentStep(prev => prev - 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };


    const handleSubmit = async (e) => {
        e.preventDefault();

        // If we're on step 4, validate and move to review
        if (currentStep === 4) {
            if (validateStep(4)) {
                setCurrentStep(5);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                const errorCount = Object.keys(errors).length;
                toast.error(`Please fix ${errorCount} error${errorCount > 1 ? 's' : ''} in the form`);
            }
            return;
        }

        // If we're on step 5 (Review), validate all and show confirmation
        if (currentStep === 5) {
            if (!validateForm()) {
                const errorCount = Object.keys(errors).length;
                toast.error(`Please fix ${errorCount} error${errorCount > 1 ? 's' : ''} in the form`);
                return;
            }

            // Show confirmation modal
            setShowConfirmModal(true);
        }
    };

    const confirmAndCreateTrip = async () => {
        setShowConfirmModal(false);
        setLoading(true);

        try {
            // Extract and validate IDs
            let vehicleId = formData.vehicleId;
            let driverId = formData.driverId;

            // Handle if vehicleId is an object - extract the ID
            if (vehicleId && typeof vehicleId === 'object') {
                vehicleId = vehicleId._id || vehicleId.id || null;
            }

            // Handle if driverId is an object - extract the ID
            if (driverId && typeof driverId === 'object') {
                driverId = driverId._id || driverId.id || driverId.userId || null;
            }

            // Validate that we have valid string IDs
            if (!vehicleId || typeof vehicleId !== 'string') {
                toast.error('Invalid vehicle selection');
                setLoading(false);
                return;
            }

            if (!driverId || typeof driverId !== 'string') {
                toast.error('Invalid driver selection');
                setLoading(false);
                return;
            }

            // Build the trip payload with validated data
            const tripPayload = {
                tripType: formData.tripType,
                vehicleId: vehicleId.trim(),
                driverId: driverId.trim(),
                customerName: formData.customerName.trim(),
                customerEmail: formData.customerEmail.trim(),
                customerContact: formData.customerContact.trim(),
                startDestination: {
                    name: formData.startDestination.name,
                    location: formData.startDestination.location,
                    address: formData.startDestination.address
                },
                endDestination: {
                    name: formData.endDestination.name,
                    location: formData.endDestination.location,
                    address: formData.endDestination.address
                },
                stops: formData.stops.filter(stop => stop.location.coordinates.length > 0),
                startDateTime: formData.startDateTime,
                endDateTime: formData.endDateTime,
                amountPerKm: parseFloat(formData.amountPerKm) || 0,
                vehicleRent: parseFloat(formData.vehicleRent) || 0,
                isTwoWay: isTwoWay
            };

            console.log('Creating trip with payload:', {
                ...tripPayload,
                vehicleId: tripPayload.vehicleId,
                driverId: tripPayload.driverId,
                vehicleIdType: typeof tripPayload.vehicleId,
                driverIdType: typeof tripPayload.driverId
            });

            const response = await tripService.createTrip(tripPayload);
            toast.success('Trip created successfully!');

            // Reset form
            setFormData({
                tripType: 'commercial',
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
                endDateTime: ''
            });

            // Clear markers
            markers.current.forEach(marker => marker.remove());
            markers.current = [];

            // Clear route
            if (map.current && map.current.getSource('route')) {
                map.current.removeLayer('route');
                map.current.removeSource('route');
            }

            setRouteData(null);
            setErrors({});

            if (onSuccess) {
                onSuccess();
            }
        } catch (error) {
            console.error('Create trip error:', error);
            const errorMessage = error?.response?.data?.message ||
                error?.message ||
                'Failed to create trip. Please try again.';
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const filteredVehicles = vehicles.filter(v => {
        // Filter by trip type only - show all vehicles regardless of status
        const typeMatch = formData.tripType === 'commercial' ? v.vehicleType === 'goods' : v.vehicleType === 'passenger';
        return typeMatch;
    });

    const filteredDrivers = drivers.filter(d => {
        // Filter drivers based on their service type matching the trip type only - show all drivers regardless of status
        const typeMatch = formData.tripType === 'commercial' ? d.serviceType === 'Commercial' : d.serviceType === 'Passenger';
        return typeMatch;
    });

    // Step rendering helpers
    const steps = ['Assign', 'Customer Details', 'Schedule', 'Route & Pricing', 'Review'];

    const renderStep1Assign = () => (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 space-y-6 h-[650px] flex flex-col">
            <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Assign Vehicle and Driver</h2>
                <p className="text-sm text-gray-600">Choose a vehicle and driver for this trip. We'll only show available options.</p>
            </div>
            {/* Trip Type */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                    Select Trip Type <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-4">
                    <button
                        type="button"
                        onClick={() => {
                            setFormData(prev => ({ ...prev, tripType: 'commercial', vehicleId: '' }));
                            if (errors.tripType) {
                                setErrors(prev => ({ ...prev, tripType: '' }));
                            }
                        }}
                        className={`p-6 rounded-lg border-2 transition-all ${formData.tripType === 'commercial'
                            ? 'border-amber-500 bg-amber-50'
                            : 'border-gray-200 hover:border-gray-300'
                            }`}
                    >
                        <div className="flex flex-col items-center">
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 ${formData.tripType === 'commercial' ? 'bg-amber-100' : 'bg-gray-100'
                                }`}>
                                <Truck className={formData.tripType === 'commercial' ? 'text-amber-600' : 'text-gray-600'} size={32} />
                            </div>
                            <div className={`font-semibold text-lg ${formData.tripType === 'commercial' ? 'text-amber-700' : 'text-gray-700'}`}>
                                Commercial
                            </div>
                            <div className="text-sm text-gray-500 mt-1 text-center">Heavy cargo, logistics, and bulk deliveries</div>
                        </div>
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setFormData(prev => ({ ...prev, tripType: 'passenger', vehicleId: '' }));
                            if (errors.tripType) {
                                setErrors(prev => ({ ...prev, tripType: '' }));
                            }
                        }}
                        className={`p-6 rounded-lg border-2 transition-all ${formData.tripType === 'passenger'
                            ? 'border-amber-500 bg-amber-50'
                            : 'border-gray-200 hover:border-gray-300'
                            }`}
                    >
                        <div className="flex flex-col items-center">
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 ${formData.tripType === 'passenger' ? 'bg-amber-100' : 'bg-gray-100'
                                }`}>
                                <User className={formData.tripType === 'passenger' ? 'text-amber-600' : 'text-gray-600'} size={32} />
                            </div>
                            <div className={`font-semibold text-lg ${formData.tripType === 'passenger' ? 'text-amber-700' : 'text-gray-700'}`}>
                                Passenger
                            </div>
                            <div className="text-sm text-gray-500 mt-1 text-center">Bus transit, shuttle service, or corporate taxi</div>
                        </div>
                    </button>
                </div>
                {errors.tripType && <p className="text-red-500 text-sm mt-2">{errors.tripType}</p>}
            </div>

            {/* Vehicle Selection */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Vehicle <span className="text-red-500">*</span>
                </label>
                <select
                    value={formData.vehicleId}
                    onChange={(e) => {
                        setFormData(prev => ({ ...prev, vehicleId: e.target.value }));
                        if (errors.vehicleId) {
                            setErrors(prev => ({ ...prev, vehicleId: '' }));
                        }
                    }}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent ${errors.vehicleId ? 'border-red-500' : 'border-gray-300'
                        }`}
                >
                    <option value="">Choose a vehicle from the fleet</option>
                    {filteredVehicles.map(vehicle => (
                        <option key={vehicle._id} value={vehicle._id}>
                            {vehicle.registrationNumber || vehicle.regnNo} - {vehicle.make || vehicle.makersName || 'Unknown'} {vehicle.model || vehicle.vehicleClass || ''}
                        </option>
                    ))}
                </select>
            </div>

            {/* Driver Selection */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assign Driver <span className="text-red-500">*</span>
                </label>
                <select
                    value={formData.driverId}
                    onChange={(e) => {
                        setFormData(prev => ({ ...prev, driverId: e.target.value }));
                        if (errors.driverId) {
                            setErrors(prev => ({ ...prev, driverId: '' }));
                        }
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                >
                    <option value="">Select an available driver</option>
                    {filteredDrivers.map(driver => (
                        <option key={driver._id} value={driver._id}>
                            {driver.name} {driver.email ? `(${driver.email})` : ''}
                        </option>
                    ))}
                </select>
            </div>



            {/* Navigation Buttons */}
            <div className="flex justify-end gap-3 pt-4 mt-auto">
                <button
                    type="button"
                    onClick={handleNextStep}
                    className="px-6 py-3 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 transition-colors flex items-center gap-2"
                >
                    Continue
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            </div>
        </div>
    );

    const renderStep2CustomerDetails = () => (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 space-y-6 h-[650px] flex flex-col">
            <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Customer Details</h2>
                <p className="text-sm text-gray-600">Provide contact information for the client associated with this delivery.</p>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User size={18} className="text-gray-400" />
                    </div>
                    <input
                        type="text"
                        value={formData.customerName}
                        onChange={(e) => {
                            setFormData(prev => ({ ...prev, customerName: e.target.value }));
                            if (errors.customerName) {
                                setErrors(prev => ({ ...prev, customerName: '' }));
                            }
                        }}
                        placeholder="e.g. Johnathan Smith"
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail size={18} className="text-gray-400" />
                    </div>
                    <input
                        type="email"
                        value={formData.customerEmail}
                        onChange={(e) => {
                            const email = e.target.value;
                            setFormData(prev => ({ ...prev, customerEmail: email }));
                        }}
                        placeholder="john.smith@example.com"
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contact Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Phone size={18} className="text-gray-400" />
                    </div>
                    <input
                        type="tel"
                        value={formData.customerContact}
                        onChange={(e) => {
                            const value = e.target.value;
                            if (value === '' || /^[0-9+\s-]*$/.test(value)) {
                                setFormData(prev => ({ ...prev, customerContact: value }));
                            }
                        }}
                        placeholder="+91 9876543210"
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                </div>
                <p className="text-xs text-gray-500 mt-1">We'll use this for SMS delivery updates.</p>
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between gap-3 pt-4 mt-auto">
                <button
                    type="button"
                    onClick={handlePreviousStep}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back
                </button>
                <button
                    type="button"
                    onClick={handleNextStep}
                    className="px-6 py-3 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 transition-colors"
                >
                    Continue
                </button>
            </div>
        </div>
    );

    const renderStep3Schedule = () => (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 h-[650px] flex flex-col">
            <div className="flex-1 overflow-y-auto pr-2 min-h-0 py-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
                    {/* Left Column: Info and Time Selection */}
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">Schedule</h2>
                            <p className="text-sm text-gray-600">Select the dates and times for the trip. We'll check for any availability conflicts.</p>
                        </div>

                        {/* Time Selection Card */}
                        <div className="bg-amber-50 rounded-xl border border-amber-100 p-6 space-y-4">
                            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                <Clock size={20} className="text-amber-600" />
                                Select Trip Times
                            </h3>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Start Time
                                    </label>
                                    <input
                                        type="time"
                                        value={formData.startDateTime ? new Date(formData.startDateTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '09:00'}
                                        onChange={(e) => {
                                            const [hours, minutes] = e.target.value.split(':');
                                            const newStart = new Date(formData.startDateTime || Date.now());
                                            newStart.setHours(parseInt(hours), parseInt(minutes));
                                            setFormData(prev => ({ ...prev, startDateTime: newStart.toISOString() }));
                                        }}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        End Time
                                    </label>
                                    <input
                                        type="time"
                                        value={formData.endDateTime ? new Date(formData.endDateTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '18:00'}
                                        onChange={(e) => {
                                            const [hours, minutes] = e.target.value.split(':');
                                            const newEnd = new Date(formData.endDateTime || Date.now());
                                            newEnd.setHours(parseInt(hours), parseInt(minutes));
                                            setFormData(prev => ({ ...prev, endDateTime: newEnd.toISOString() }));
                                        }}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white"
                                    />
                                </div>
                            </div>
                            <p className="text-xs text-amber-700">Set the approximate pickup and drop-off times.</p>
                        </div>
                    </div>

                    {/* Right Column: Calendar */}
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <TripRangeCalendar
                            startDateTime={formData.startDateTime}
                            endDateTime={formData.endDateTime}
                            onChange={({ startDateTime, endDateTime }) => {
                                setFormData(prev => ({
                                    ...prev,
                                    startDateTime,
                                    endDateTime
                                }));
                            }}
                            busyDates={blockedDateRanges}
                            minDate={new Date(Date.now() + 2 * 60 * 60 * 1000)}
                            hideTimeSelection={true}
                        />
                    </div>
                </div>
            </div>

            <div className="flex justify-between gap-3 pt-4 mt-auto border-t border-gray-100">
                <button
                    type="button"
                    onClick={handlePreviousStep}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back
                </button>
                <button
                    type="button"
                    onClick={handleNextStep}
                    className="px-6 py-3 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 transition-colors"
                >
                    Continue
                </button>
            </div>
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto min-h-[calc(100vh-240px)] flex flex-col pt-2 pb-8">
            {/* Step Progress Indicator */}
            <StepProgress currentStep={currentStep} steps={steps} />

            <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
                {/* Conditional Step Rendering */}
                {currentStep === 1 && renderStep1Assign()}
                {currentStep === 2 && renderStep2CustomerDetails()}
                {currentStep === 3 && renderStep3Schedule()}

                {/* Step 4: Route & Pricing */}
                {currentStep === 4 && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Left Column - Form Fields */}
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 h-[650px] flex flex-col">
                            <div className="flex-1 overflow-y-auto pr-2 min-h-0 space-y-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Route & Pricing</h2>
                                    <p className="text-sm text-gray-600">Configure the trip route and set the pricing details for the customer.</p>
                                </div>

                                {/* Pricing Details */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                        <DollarSign size={20} className="text-amber-600" />
                                        Pricing Details
                                    </h3>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Amount per KM (₹) <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.amountPerKm}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                                        setFormData(prev => ({ ...prev, amountPerKm: value }));
                                                    }
                                                }}
                                                placeholder="0.00"
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Vehicle Rent (₹) <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.vehicleRent}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                                        setFormData(prev => ({ ...prev, vehicleRent: value }));
                                                    }
                                                }}
                                                placeholder="0.00"
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-center space-x-2 pt-2">
                                        <input
                                            type="checkbox"
                                            id="isTwoWay"
                                            checked={isTwoWay}
                                            onChange={(e) => setIsTwoWay(e.target.checked)}
                                            className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
                                        />
                                        <label htmlFor="isTwoWay" className="text-sm font-medium text-gray-700">
                                            This is a Two-Way Trip
                                        </label>
                                    </div>
                                </div>

                                {/* Route Configuration */}
                                <div className="space-y-4 border-t border-gray-200 pt-6">
                                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                        <MapPin size={20} className="text-amber-600" />
                                        Route Configuration
                                    </h3>

                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="block text-sm font-medium text-gray-700">
                                                START DESTINATION <span className="text-red-500">*</span>
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
                                            placeholder="Search pickup location..."
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
                                                className="flex items-center gap-1 text-sm text-amber-600 hover:text-amber-700 font-medium"
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

                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="block text-sm font-medium text-gray-700">
                                                END DESTINATION <span className="text-red-500">*</span>
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
                                            placeholder="Search drop-off point..."
                                        />
                                    </div>
                                </div>
                                {routeData && (
                                    <div className="bg-gray-50 p-4 rounded-lg space-y-3 border-t border-gray-200">
                                        <h3 className="font-medium text-gray-900">Trip Details</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <div className="text-sm text-gray-600">Distance</div>
                                                <div className="text-lg font-semibold text-gray-900">
                                                    {(routeData.distance * (isTwoWay ? 2 : 1)).toFixed(2)} km
                                                    {isTwoWay && <span className="text-xs text-gray-500 ml-1">(Two-Way)</span>}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-sm text-gray-600">Estimated Duration</div>
                                                <div className="text-lg font-semibold text-gray-900">
                                                    {formatDuration((routeData.duration * (isTwoWay ? 2 : 1)) + (formData.stops.length * 30))}
                                                </div>
                                            </div>
                                        </div>

                                        {(formData.amountPerKm || formData.vehicleRent) && (
                                            <div className="border-t border-gray-200 pt-3 space-y-2">
                                                <h4 className="text-sm font-semibold text-gray-900">Price Breakdown</h4>
                                                {formData.amountPerKm && parseFloat(formData.amountPerKm) > 0 && (
                                                    <div className="flex justify-between items-center text-sm">
                                                        <span className="text-gray-600">
                                                            Distance Charges ({(routeData.distance * (isTwoWay ? 2 : 1)).toFixed(2)} km × ₹{formData.amountPerKm}/km)
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
                                                        ₹{(
                                                            (parseFloat(formData.amountPerKm) || 0) * routeData.distance * (isTwoWay ? 2 : 1) +
                                                            (parseFloat(formData.vehicleRent) || 0)
                                                        ).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                            </div>
                            {/* Navigation Buttons */}
                            <div className="flex justify-between gap-3 pt-4 border-t border-gray-100 mt-auto">
                                <button
                                    type="button"
                                    onClick={handlePreviousStep}
                                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                    Back
                                </button>
                                <button
                                    type="submit"
                                    disabled={calculatingRoute}
                                    className="px-6 py-3 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {calculatingRoute ? (
                                        <>
                                            <Loader2 className="animate-spin" size={20} />
                                            Calculating...
                                        </>
                                    ) : (
                                        <>
                                            Continue
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                            </svg>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Right Column - Map */}
                        <div className="lg:sticky lg:top-6 h-[calc(100vh-250px)] min-h-[450px]">
                            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden h-full shadow-sm">
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
                                    {routeData && (
                                        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                                            <div className="bg-white rounded px-3 py-2">
                                                <div className="text-xs text-gray-500">ESTIMATED DISTANCE</div>
                                                <div className="font-semibold text-gray-900">{(routeData.distance * (isTwoWay ? 2 : 1)).toFixed(2)} km</div>
                                            </div>
                                            <div className="bg-white rounded px-3 py-2">
                                                <div className="text-xs text-gray-500">ESTIMATED TIME</div>
                                                <div className="font-semibold text-gray-900">{formatDuration(routeData.duration * (isTwoWay ? 2 : 1))}</div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div ref={mapContainer} className="h-[calc(100%-80px)]" />
                            </div>
                        </div>
                    </div>
                )}

                {currentStep === 5 && (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 h-[650px] flex flex-col">
                        <div className="flex-1 overflow-y-auto pr-2 min-h-0 space-y-6">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 mb-2">Review</h2>
                                <p className="text-sm text-gray-600">Please verify all trip information before final submission.</p>
                            </div>

                            {/* Trip Details Card */}
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                        <Truck size={20} className="text-amber-600" />
                                        Trip Details
                                    </h3>
                                    <button
                                        type="button"
                                        onClick={() => setCurrentStep(1)}
                                        className="text-sm text-amber-600 hover:text-amber-700 font-medium"
                                    >
                                        Edit
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="text-gray-600">Trip Type:</span>
                                        <span className="font-medium text-gray-900 ml-2 capitalize">{formData.tripType}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-600">Vehicle:</span>
                                        <span className="font-medium text-gray-900 ml-2">
                                            {vehicles.find(v => v._id === formData.vehicleId)?.registrationNumber || 'N/A'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-gray-600">Assigned Driver:</span>
                                        <span className="font-medium text-gray-900 ml-2">
                                            {drivers.find(d => d._id === formData.driverId)?.name || 'N/A'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Customer Information Card */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                        <User size={20} className="text-blue-600" />
                                        Customer Information
                                    </h3>
                                    <button
                                        type="button"
                                        onClick={() => setCurrentStep(2)}
                                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                                    >
                                        Edit
                                    </button>
                                </div>
                                <div className="space-y-2 text-sm">
                                    <div>
                                        <span className="text-gray-600">Full Name:</span>
                                        <span className="font-medium text-gray-900 ml-2">{formData.customerName}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-600">Email:</span>
                                        <span className="font-medium text-gray-900 ml-2">{formData.customerEmail}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-600">Contact:</span>
                                        <span className="font-medium text-gray-900 ml-2">{formData.customerContact}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Route & Schedule Card */}
                            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                        <MapPin size={20} className="text-green-600" />
                                        Route & Schedule
                                    </h3>
                                    <button
                                        type="button"
                                        onClick={() => setCurrentStep(3)}
                                        className="text-sm text-green-600 hover:text-green-700 font-medium"
                                    >
                                        Edit
                                    </button>
                                </div>
                                <div className="space-y-3 text-sm">
                                    <div className="flex items-start gap-2">
                                        <div className="w-2 h-2 bg-green-500 rounded-full mt-1.5"></div>
                                        <div className="flex-1">
                                            <div className="text-gray-600 text-xs">START DESTINATION</div>
                                            <div className="font-medium text-gray-900">{formData.startDestination.name || 'N/A'}</div>
                                            <div className="text-xs text-gray-500">{formData.startDestination.address}</div>
                                        </div>
                                    </div>
                                    {formData.stops.length > 0 && (
                                        <div className="ml-1 border-l-2 border-gray-300 pl-3 py-1 space-y-1">
                                            {formData.stops.map((stop, idx) => (
                                                <div key={idx} className="flex items-center gap-2">
                                                    <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                                                    <div className="text-xs text-gray-600">Stop {idx + 1}: {stop.name}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <div className="flex items-start gap-2">
                                        <div className="w-2 h-2 bg-red-500 rounded-full mt-1.5"></div>
                                        <div className="flex-1">
                                            <div className="text-gray-600 text-xs">END DESTINATION</div>
                                            <div className="font-medium text-gray-900">{formData.endDestination.name || 'N/A'}</div>
                                            <div className="text-xs text-gray-500">{formData.endDestination.address}</div>
                                        </div>
                                    </div>
                                    {routeData && (
                                        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-green-200 mt-3">
                                            <div>
                                                <div className="text-gray-600 text-xs">Distance</div>
                                                <div className="font-semibold text-gray-900">
                                                    {(routeData.distance * (isTwoWay ? 2 : 1)).toFixed(2)} km
                                                    {isTwoWay && <span className="text-xs text-gray-500 ml-1">(2-way)</span>}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-gray-600 text-xs">Est. Duration</div>
                                                <div className="font-semibold text-gray-900">
                                                    {formatDuration((routeData.duration * (isTwoWay ? 2 : 1)) + (formData.stops.length * 30))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-green-200">
                                        <div>
                                            <div className="text-gray-600 text-xs">DEPARTURE DATE</div>
                                            <div className="font-medium text-gray-900">
                                                {formData.startDateTime ? new Date(formData.startDateTime).toLocaleString('en-IN', {
                                                    day: '2-digit',
                                                    month: 'short',
                                                    year: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                }) : 'N/A'}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-gray-600 text-xs">ARRIVAL DATE (EST.)</div>
                                            <div className="font-medium text-gray-900">
                                                {formData.endDateTime ? new Date(formData.endDateTime).toLocaleString('en-IN', {
                                                    day: '2-digit',
                                                    month: 'short',
                                                    year: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                }) : 'N/A'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Pricing Summary Card */}
                            {routeData && (formData.amountPerKm || formData.vehicleRent) && (
                                <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                        <DollarSign size={20} className="text-purple-600" />
                                        Pricing Summary
                                    </h3>
                                    <div className="space-y-2 text-sm">
                                        {formData.amountPerKm && parseFloat(formData.amountPerKm) > 0 && (
                                            <div className="flex justify-between items-center">
                                                <span className="text-gray-600">
                                                    Standard Rate<br />
                                                    <span className="text-xs">Based on {(routeData.distance * (isTwoWay ? 2 : 1)).toFixed(2)} KM distance</span>
                                                </span>
                                                <span className="font-medium text-gray-900">
                                                    ₹{(parseFloat(formData.amountPerKm) * routeData.distance * (isTwoWay ? 2 : 1)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                        )}
                                        {formData.vehicleRent && parseFloat(formData.vehicleRent) > 0 && (
                                            <div className="flex justify-between items-center">
                                                <span className="text-gray-600">
                                                    Vehicle Rent<br />
                                                    <span className="text-xs">Flat rate for {vehicles.find(v => v._id === formData.vehicleId)?.make || 'vehicle'}</span>
                                                </span>
                                                <span className="font-medium text-gray-900">
                                                    ₹{parseFloat(formData.vehicleRent).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                        )}
                                        <div className="flex justify-between items-center border-t border-purple-200 pt-3 mt-3">
                                            <span className="font-bold text-gray-900 text-lg">Total Estimated Price</span>
                                            <span className="font-bold text-green-600 text-2xl">
                                                ₹{(
                                                    (parseFloat(formData.amountPerKm) || 0) * routeData.distance * (isTwoWay ? 2 : 1) +
                                                    (parseFloat(formData.vehicleRent) || 0)
                                                ).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 italic mt-2">INCLUSIVE OF TAXES</p>
                                    </div>
                                </div>
                            )}

                        </div>

                        {/* Navigation Buttons */}
                        <div className="flex justify-between gap-3 pt-4 border-t border-gray-100 mt-auto">
                            <button
                                type="button"
                                onClick={handlePreviousStep}
                                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                                Back
                            </button>
                            <button
                                type="submit"
                                className="px-8 py-3 bg-amber-500 text-white rounded-lg font-semibold hover:bg-amber-600 transition-colors flex items-center gap-2"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Confirm & Create Trip
                            </button>
                        </div>
                    </div>
                )}

                {/* Confirmation Modal */}
                {showConfirmModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-amber-100 rounded-full">
                                        <AlertCircle className="text-amber-600" size={24} />
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-900">Confirm Trip Creation</h3>
                                </div>
                            </div>
                            <p className="text-gray-600 mb-6">
                                Are you sure you want to create this trip? Once created, the vehicle and driver will be assigned and the customer will be notified.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmModal(false)}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={confirmAndCreateTrip}
                                    className="flex-1 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 font-medium transition-colors"
                                >
                                    Confirm & Create
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </form>
        </div>
    );
};


const LocationPicker = ({ label, value, onSelect, error, required, placeholder }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [showResults, setShowResults] = useState(false);
    const [searching, setSearching] = useState(false);

    // Sync query with value when value changes externally
    useEffect(() => {
        if (value !== undefined) {
            setQuery(value || '');
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
                        if (!e.target.value) {
                            setResults([]);
                            setShowResults(false);
                            if (onSelect) {
                                onSelect(null);
                            }
                        }
                    }}
                    onFocus={() => {
                        if (results.length > 0 && query.length >= 3) {
                            setShowResults(true);
                        }
                    }}
                    onBlur={() => {
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
