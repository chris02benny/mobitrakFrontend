import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Plus, X, Calendar, Clock, Truck, DollarSign, Navigation2, AlertCircle, Loader2, User, Mail, Phone } from 'lucide-react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { tripService } from '../../services/tripService';
import { vehicleService } from '../../services/vehicleService';
import { hiringService } from '../../services/hiringService';
import { leaveService } from '../../services/leaveService';
import { maintenanceService } from '../../services/maintenanceService';
import TripRangeCalendar from '../common/TripRangeCalendar';
import toast from 'react-hot-toast';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
if (MAPBOX_TOKEN) {
    mapboxgl.accessToken = MAPBOX_TOKEN;
}

const AddTripForm = ({ onSuccess }) => {
    const mapContainer = useRef(null);
    const map = useRef(null);
    const markers = useRef([]); // Track all markers
    const [vehicles, setVehicles] = useState([]);
    const [drivers, setDrivers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [calculatingRoute, setCalculatingRoute] = useState(false);
    const [isTwoWay, setIsTwoWay] = useState(false);
    
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
    const [allLeaves, setAllLeaves] = useState([]);
    const [allMaintenance, setAllMaintenance] = useState([]);

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
        fetchLeaves();
        fetchMaintenance();
        initializeMap();
    }, []);

    // We no longer need to re-fetch when dates change as we show all drivers/vehicles
    // and handle availability visually in the calendar

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

    const fetchVehicles = async () => {
        try {
            // Fetch available vehicles based on trip assignments
            const params = {};
            if (formData.startDateTime && formData.endDateTime) {
                params.startDateTime = formData.startDateTime;
                params.endDateTime = formData.endDateTime;
            }
            
            const data = await vehicleService.getAvailableVehicles(params);
            setVehicles(data);
        } catch (error) {
            console.error('Error fetching vehicles:', error);
            toast.error('Failed to load vehicles');
        }
    };

    const fetchDrivers = async () => {
        try {
            // Fetch all employed drivers (not just "available" as we will show availability in calendar)
            const response = await hiringService.getEmployments();
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

    const fetchLeaves = async () => {
        try {
            const leaves = await leaveService.getCompanyLeaves('APPROVED');
            setAllLeaves(leaves || []);
        } catch (error) {
            console.error('Error fetching leaves:', error);
        }
    };

    const fetchMaintenance = async () => {
        try {
            const records = await maintenanceService.getMaintenanceRecords();
            // Only consider SCHEDULED or IN_PROGRESS maintenance
            const activeMaintenance = records.filter(m => m.status === 'SCHEDULED' || m.status === 'IN_PROGRESS');
            setAllMaintenance(activeMaintenance || []);
        } catch (error) {
            console.error('Error fetching maintenance:', error);
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

    // Calculate blocked date ranges based on selected vehicle and driver
    const calculateBlockedDateRanges = (trips) => {
        const blocked = [];
        
        trips.forEach(trip => {
            // Check if trip uses the selected vehicle
            if (formData.vehicleId && trip.vehicleId === formData.vehicleId) {
                blocked.push({
                    start: new Date(trip.startDateTime),
                    end: new Date(trip.endDateTime),
                    type: 'Trip assignment',
                    tripId: trip._id
                });
            }
            
            // Check if trip uses the selected driver
            if (formData.driverId && trip.driverId === formData.driverId) {
                blocked.push({
                    start: new Date(trip.startDateTime),
                    end: new Date(trip.endDateTime),
                    type: 'Trip assignment',
                    tripId: trip._id
                });
            }
        });

        // Add leaves for selected driver
        if (formData.driverId) {
            allLeaves.forEach(leave => {
                // Ensure leave belongs to the selected driver
                const leaveDriverId = typeof leave.driverId === 'object' ? leave.driverId._id : leave.driverId;
                if (String(leaveDriverId) === String(formData.driverId)) {
                    blocked.push({
                        start: new Date(leave.startDate),
                        end: new Date(leave.endDate),
                        type: 'Leave'
                    });
                }
            });
        }

        // Add maintenance for selected vehicle
        if (formData.vehicleId) {
            allMaintenance.forEach(maintenance => {
                if (String(maintenance.vehicleId) === String(formData.vehicleId)) {
                    blocked.push({
                        start: new Date(maintenance.schedule.plannedStartDate),
                        end: new Date(maintenance.schedule.plannedEndDate),
                        type: 'Maintenance'
                    });
                }
            });
        }
        
        setBlockedDateRanges(blocked);
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

    // Fetch trips when vehicle or driver selection changes
    useEffect(() => {
        if (formData.vehicleId || formData.driverId) {
            fetchExistingTrips();
        } else {
            setBlockedDateRanges([]);
        }
    }, [formData.vehicleId, formData.driverId, allLeaves, allMaintenance]);

    // Recalculate blocked ranges when existing trips change
    useEffect(() => {
        if (existingTrips.length > 0) {
            calculateBlockedDateRanges(existingTrips);
        }
    }, [formData.vehicleId, formData.driverId, existingTrips]);

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
        const newErrors = {};

        // Trip type validation
        if (!formData.tripType) newErrors.tripType = 'Trip type is required';
        
        // Vehicle validation - must be IDLE
        if (!formData.vehicleId) {
            newErrors.vehicleId = 'Vehicle selection is required';
        }
        
        // Driver validation - must be UNASSIGNED
        if (!formData.driverId) {
            newErrors.driverId = 'Driver assignment is required';
        }

        // Customer name validation
        if (!formData.customerName || formData.customerName.trim().length < 2) {
            newErrors.customerName = 'Customer name is required (minimum 2 characters)';
        }

        // Email validation with proper regex
        if (!formData.customerEmail) {
            newErrors.customerEmail = 'Customer email is required';
        } else if (!/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(formData.customerEmail)) {
            newErrors.customerEmail = 'Please enter a valid email address';
        }

        // Phone validation - Indian format (+91 or 10 digits)
        if (!formData.customerContact) {
            newErrors.customerContact = 'Customer contact number is required';
        } else if (!/^(\+91[\s-]?)?[6-9]\d{9}$/.test(formData.customerContact.replace(/[\s-]/g, ''))) {
            newErrors.customerContact = 'Please enter a valid Indian mobile number';
        }

        // Pricing validation
        if (!formData.amountPerKm || parseFloat(formData.amountPerKm) < 1) {
            newErrors.amountPerKm = 'Amount per KM is required (minimum ₹1)';
        }
        if (!formData.vehicleRent || parseFloat(formData.vehicleRent) < 1) {
            newErrors.vehicleRent = 'Vehicle rent is required (minimum ₹1)';
        }

        // Destination validation
        if (!formData.startDestination.location.coordinates.length) {
            newErrors.startDestination = 'Start destination is required';
        }
        if (!formData.endDestination.location.coordinates.length) {
            newErrors.endDestination = 'End destination is required';
        }
        
        // Date time validation
        if (!formData.startDateTime) {
            newErrors.startDateTime = 'Start date and time is required';
        }
        if (!formData.endDateTime) {
            newErrors.endDateTime = 'End date and time is required';
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
                newErrors.startDateTime = 'Start date must be at least 2 hours from now';
            }

            if (start > twoMonthsFromNow) {
                newErrors.startDateTime = 'Start date cannot be more than 2 months in the future';
            }

            if (end <= start) {
                newErrors.endDateTime = 'End date must be after start date';
            }

            // Check if duration meets trip requirements
            if (routeData && end > start) {
                const timeDiffMinutes = (end - start) / (1000 * 60);
                const estimatedStopTime = formData.stops.length * 30;
                const totalRequiredTime = routeData.duration + estimatedStopTime;
                
                if (timeDiffMinutes < totalRequiredTime) {
                    const shortfall = totalRequiredTime - timeDiffMinutes;
                    newErrors.endDateTime = `Duration too short. Trip requires ${formatDuration(totalRequiredTime)} but only ${formatDuration(timeDiffMinutes)} provided. Need ${formatDuration(shortfall)} more.`;
                }
            }

            // Check for date conflicts with existing trips, leaves, or maintenance
            const conflict = checkDateConflict(formData.startDateTime, formData.endDateTime);
            if (conflict.conflict) {
                const conflictSource = conflict.type;
                const blockedStart = conflict.blockedStart.toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                });
                const blockedEnd = conflict.blockedEnd.toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                });
                newErrors.startDateTime = `Conflict: There is an existing ${conflictSource} from ${blockedStart} to ${blockedEnd}`;
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            const errorCount = Object.keys(errors).length;
            toast.error(`Please fix ${errorCount} error${errorCount > 1 ? 's' : ''} in the form`);
            
            // Scroll to the first error
            const firstErrorField = document.querySelector('.border-red-500');
            if (firstErrorField) {
                firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
                firstErrorField.focus();
            }
            return;
        }

        // Show confirmation modal
        setShowConfirmModal(true);
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
        // Filter by trip type
        const typeMatch = formData.tripType === 'commercial' ? v.vehicleType === 'goods' : v.vehicleType === 'passenger';
        // Show all active vehicles regardless of IDLE status
        return typeMatch;
    });

    const filteredDrivers = drivers.filter(d => {
        // Filter drivers based on their service type matching the trip type
        const typeMatch = formData.tripType === 'commercial' ? d.serviceType === 'Commercial' : d.serviceType === 'Passenger';
        // Show all active drivers regardless of status
        return typeMatch;
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
                                onClick={() => {
                                    setFormData(prev => ({ ...prev, tripType: 'commercial', vehicleId: '' }));
                                    if (errors.tripType) {
                                        setErrors(prev => ({ ...prev, tripType: '' }));
                                    }
                                }}
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
                                onClick={() => {
                                    setFormData(prev => ({ ...prev, tripType: 'passenger', vehicleId: '' }));
                                    if (errors.tripType) {
                                        setErrors(prev => ({ ...prev, tripType: '' }));
                                    }
                                }}
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
                            onChange={(e) => {
                                setFormData(prev => ({ ...prev, vehicleId: e.target.value }));
                                if (errors.vehicleId) {
                                    setErrors(prev => ({ ...prev, vehicleId: '' }));
                                }
                            }}
                            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent ${
                                errors.vehicleId ? 'border-red-500' : 'border-gray-300'
                            }`}
                        >
                            <option value="">Select a vehicle</option>
                            {filteredVehicles.map(vehicle => (
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
                            value={formData.driverId}
                            onChange={(e) => setFormData(prev => ({ ...prev, driverId: e.target.value }))}
                            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent ${
                                errors.driverId ? 'border-red-500' : 'border-gray-300'
                            }`}
                        >
                            <option value="">Select a driver</option>
                            {filteredDrivers.map(driver => (
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
                                value={formData.customerName}
                                onChange={(e) => {
                                    setFormData(prev => ({ ...prev, customerName: e.target.value }));
                                    if (errors.customerName) {
                                        setErrors(prev => ({ ...prev, customerName: '' }));
                                    }
                                }}
                                placeholder="Enter customer name"
                                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent ${
                                    errors.customerName ? 'border-red-500' : 'border-gray-300'
                                }`}
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
                                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent ${
                                    errors.customerEmail ? 'border-red-500' : 'border-gray-300'
                                }`}
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
                                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent ${
                                    errors.customerContact ? 'border-red-500' : 'border-gray-300'
                                }`}
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
                                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent ${
                                        errors.amountPerKm ? 'border-red-500' : 'border-gray-300'
                                    }`}
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
                                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent ${
                                        errors.vehicleRent ? 'border-red-500' : 'border-gray-300'
                                    }`}
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
                                onChange={(e) => {
                                    setIsTwoWay(e.target.checked);
                                    // Recalculate route data with new two-way status
                                    if (routeData) {
                                        const multiplier = e.target.checked ? 2 : 1;
                                        // Update route data to reflect two-way distance and duration
                                        // The pricing will be automatically recalculated based on isTwoWay state
                                    }
                                }}
                                className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
                            />
                            <label htmlFor="isTwoWay" className="text-sm font-medium text-gray-700">
                                Charge for Two-Way Trip (Return Journey)
                            </label>
                        </div>
                    </div>

                    {/* Start Destination with Clear Button */}
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

                    {/* End Destination with Clear Button */}
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

                    {/* Trip Schedule with Calendar */}
                    <div className="space-y-4">
                        <label className="block text-sm font-medium text-gray-700">
                            Schedule Trip <span className="text-red-500">*</span>
                        </label>
                        <TripRangeCalendar
                            startDateTime={formData.startDateTime}
                            endDateTime={formData.endDateTime}
                            busyDates={blockedDateRanges}
                            minDate={new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()}
                            error={errors.startDateTime || errors.endDateTime}
                            onChange={({ startDateTime, endDateTime }) => {
                                setFormData(prev => ({
                                    ...prev,
                                    startDateTime,
                                    endDateTime
                                }));
                                
                                // Real-time validation
                                const newErrors = { ...errors };
                                delete newErrors.startDateTime;
                                delete newErrors.endDateTime;
                                setErrors(newErrors);
                            }}
                        />
                        {(errors.startDateTime || errors.endDateTime) && (
                            <p className="text-red-500 text-sm">{errors.startDateTime || errors.endDateTime}</p>
                        )}
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

                    {/* Blocked Date Ranges Warning */}
                    {blockedDateRanges.length > 0 && (formData.vehicleId || formData.driverId) && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                            <div className="flex items-start gap-2">
                                <AlertCircle className="text-amber-600 mt-0.5" size={18} />
                                <div className="flex-1">
                                    <h4 className="text-sm font-semibold text-amber-900 mb-2">
                                        Unavailable Date Ranges
                                    </h4>
                                    <div className="space-y-2 text-xs text-amber-800">
                                        {blockedDateRanges.map((blocked, idx) => (
                                            <div key={idx} className="flex items-center gap-2">
                                                <span className="font-medium capitalize">{blocked.type}:</span>
                                                <span>
                                                    {blocked.start.toLocaleDateString('en-IN', {
                                                        day: '2-digit',
                                                        month: 'short',
                                                        year: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                    {' → '}
                                                    {blocked.end.toLocaleDateString('en-IN', {
                                                        day: '2-digit',
                                                        month: 'short',
                                                        year: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-xs text-amber-700 mt-2">
                                        Cannot schedule trips during these periods as the selected {blockedDateRanges[0]?.type} is already assigned.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

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
                                    {formData.stops.length > 0 && (
                                        <div className="text-xs text-gray-500 mt-1">
                                            +{formatDuration(formData.stops.length * 30)} for stops
                                        </div>
                                    )}
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
                                                ₹{
                                                    (
                                                        (parseFloat(formData.amountPerKm) || 0) * routeData.distance * (isTwoWay ? 2 : 1) +
                                                        (parseFloat(formData.vehicleRent) || 0)
                                                    ).toLocaleString('en-IN', { maximumFractionDigits: 2 })
                                                }
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Date Warning */}
                    {dateWarning && (
                        <div className="bg-amber-50 border border-amber-300 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                                <AlertCircle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-amber-800 whitespace-pre-line">
                                        {dateWarning}
                                    </p>
                                </div>
                            </div>
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

            {/* Confirmation Modal */}
            {showConfirmModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 bg-amber-100 rounded-full">
                                <AlertCircle className="text-amber-600" size={24} />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900">Confirm Trip Creation</h3>
                        </div>
                        <p className="text-gray-600 mb-6">
                            Please make sure all the details are valid and correct before proceeding to create this trip.
                        </p>
                        
                        {/* Trip Details */}
                        <div className="space-y-4">
                            {/* Basic Information */}
                            <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                                <h4 className="font-semibold text-gray-900 mb-2">Trip Information</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <span className="text-gray-600">Trip Type:</span>
                                        <span className="font-medium text-gray-900 ml-2 capitalize">{formData.tripType}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-600">Two-Way:</span>
                                        <span className="font-medium text-gray-900 ml-2">{isTwoWay ? 'Yes' : 'No'}</span>
                                    </div>
                                </div>
                                <div className="pt-2 border-t border-gray-200">
                                    <div className="text-gray-600">Customer:</div>
                                    <div className="font-medium text-gray-900">{formData.customerName}</div>
                                    <div className="text-xs text-gray-500">{formData.customerEmail}</div>
                                    <div className="text-xs text-gray-500">{formData.customerContact}</div>
                                </div>
                            </div>

                            {/* Route Information */}
                            <div className="bg-blue-50 rounded-lg p-4 space-y-2 text-sm">
                                <h4 className="font-semibold text-gray-900 mb-2">Route Details</h4>
                                <div className="space-y-2">
                                    <div className="flex items-start gap-2">
                                        <div className="w-2 h-2 bg-green-500 rounded-full mt-1.5"></div>
                                        <div className="flex-1">
                                            <div className="text-gray-600 text-xs">From</div>
                                            <div className="font-medium text-gray-900">{formData.startDestination.name || 'N/A'}</div>
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
                                            <div className="text-gray-600 text-xs">To</div>
                                            <div className="font-medium text-gray-900">{formData.endDestination.name || 'N/A'}</div>
                                        </div>
                                    </div>
                                </div>
                                {routeData && (
                                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-blue-200 mt-3">
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
                            </div>

                            {/* Timing */}
                            <div className="bg-purple-50 rounded-lg p-4 space-y-2 text-sm">
                                <h4 className="font-semibold text-gray-900 mb-2">Schedule</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <div className="text-gray-600 text-xs">Start Date & Time</div>
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
                                        <div className="text-gray-600 text-xs">End Date & Time</div>
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

                            {/* Pricing */}
                            {routeData && (formData.amountPerKm || formData.vehicleRent) && (
                                <div className="bg-green-50 rounded-lg p-4 space-y-2 text-sm">
                                    <h4 className="font-semibold text-gray-900 mb-2">Pricing Details</h4>
                                    <div className="space-y-2">
                                        {formData.amountPerKm && parseFloat(formData.amountPerKm) > 0 && (
                                            <div className="flex justify-between items-center">
                                                <span className="text-gray-600">
                                                    Distance Charges ({(routeData.distance * (isTwoWay ? 2 : 1)).toFixed(2)} km × ₹{formData.amountPerKm}/km)
                                                </span>
                                                <span className="font-medium text-gray-900">
                                                    ₹{(parseFloat(formData.amountPerKm) * routeData.distance * (isTwoWay ? 2 : 1)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                        )}
                                        {formData.vehicleRent && parseFloat(formData.vehicleRent) > 0 && (
                                            <div className="flex justify-between items-center">
                                                <span className="text-gray-600">Vehicle Rent</span>
                                                <span className="font-medium text-gray-900">
                                                    ₹{parseFloat(formData.vehicleRent).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                        )}
                                        <div className="flex justify-between items-center border-t border-green-200 pt-2 mt-2">
                                            <span className="font-semibold text-gray-900">Total Amount</span>
                                            <span className="font-bold text-green-600 text-lg">
                                                ₹{(
                                                    (parseFloat(formData.amountPerKm) || 0) * routeData.distance * (isTwoWay ? 2 : 1) +
                                                    (parseFloat(formData.vehicleRent) || 0)
                                                ).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3 mt-6">
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
                                Confirm & Create Trip
                            </button>
                        </div>
                    </div>
                </div>
            )}
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
