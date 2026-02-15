import React, { useState, useEffect } from 'react';
import { Search, MapPin, Star, Clock, Award, User, X, ChevronDown, Home, DollarSign, FileText, Send, Briefcase, ShieldCheck, Car, Truck, CheckCircle, Loader2 } from 'lucide-react';
import { hiringService } from '../../services/hiringService';
import toast from 'react-hot-toast';

const HireDriversPage = () => {
    const [drivers, setDrivers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDriver, setSelectedDriver] = useState(null);
    const [showHireModal, setShowHireModal] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [sentRequests, setSentRequests] = useState({}); // Track sent requests by driver ID
    
    // Hire form state
    const [hireForm, setHireForm] = useState({
        serviceType: 'Commercial',
        vehicleType: 'Pickup Van',
        contractDuration: 1,
        contractUnit: 'Month(s)',
        accommodation: false,
        healthInsurance: false,
        payAmount: 15000,
        payFrequency: 'PER_MONTH',
        description: ''
    });

    useEffect(() => {
        fetchDrivers();
        fetchSentRequests();
    }, []);

    const fetchDrivers = async () => {
        try {
            setLoading(true);
            const response = await hiringService.getAvailableDrivers();
            setDrivers(response.data?.drivers || []);
        } catch (error) {
            console.error('Error fetching drivers:', error);
            toast.error('Failed to load available drivers');
        } finally {
            setLoading(false);
        }
    };

    const fetchSentRequests = async () => {
        try {
            const response = await hiringService.getSentRequests();
            const requests = response.data?.requests || [];
            
            // Create a map of driver user ID -> request status
            // This is important: JobRequest stores driverId as DriverProfile._id
            // But the populated driverId includes userId which is the user's _id
            // Available drivers from user-service have _id = userId
            const requestMap = {};
            requests.forEach(req => {
                // Primary key: the userId from populated DriverProfile
                const driverUserId = req.driverId?.userId;
                // Fallback: DriverProfile _id itself
                const driverProfileId = req.driverId?._id || req.driverId;
                
                // Store both as strings for matching
                if (driverUserId) {
                    requestMap[String(driverUserId)] = req.status;
                }
                if (driverProfileId) {
                    requestMap[String(driverProfileId)] = req.status;
                }
            });
            console.log('Sent requests map:', requestMap);
            setSentRequests(requestMap);
        } catch (error) {
            console.error('Error fetching sent requests:', error);
        }
    };

    const getRequestStatus = (driver) => {
        // Drivers from user-service: _id is the user's ID, userId is also the same
        // Drivers from DriverProfile: _id is DriverProfile ID, userId is user's ID
        const userId = String(driver.userId || driver._id || '');
        const profileId = String(driver._id || '');
        
        console.log('Checking status for driver:', { userId, profileId, sentRequests });
        
        return sentRequests[userId] || sentRequests[profileId] || null;
    };

    const handleHireClick = (driver) => {
        const status = getRequestStatus(driver);
        if (status === 'PENDING' || status === 'VIEWED') {
            toast.error('A hire request is already pending for this driver');
            return;
        }
        setSelectedDriver(driver);
        setShowHireModal(true);
    };

    const handleFormChange = (field, value) => {
        setHireForm(prev => {
            const newForm = { ...prev, [field]: value };
            
            // Reset vehicle type when service type changes
            if (field === 'serviceType') {
                if (value === 'Passenger') {
                    newForm.vehicleType = 'Car';
                } else {
                    newForm.vehicleType = 'Pickup Van';
                }
            }
            
            return newForm;
        });
    };

    const handleSubmitHireRequest = async () => {
        if (!selectedDriver) return;
        
        try {
            setSubmitting(true);
            
            const hireData = {
                driverId: selectedDriver.userId || selectedDriver._id,
                jobDetails: {
                    serviceType: hireForm.serviceType,
                    vehicleType: hireForm.vehicleType,
                    contractDuration: hireForm.contractDuration,
                    contractUnit: hireForm.contractUnit,
                    accommodation: hireForm.accommodation,
                    healthInsurance: hireForm.healthInsurance,
                    description: hireForm.description
                },
                offeredSalary: {
                    amount: hireForm.payAmount,
                    frequency: hireForm.payFrequency,
                    currency: 'INR'
                }
            };

            await hiringService.sendHireRequest(hireData);
            
            toast.success('Hire request sent successfully! The driver will be notified via email.');
            
            // Close modal first
            setShowHireModal(false);
            setSelectedDriver(null);
            
            // Refresh sent requests from server to get updated status
            await fetchSentRequests();
            
            // Reset form
            setHireForm({
                serviceType: 'Commercial',
                vehicleType: 'Pickup',
                contractDuration: 1,
                contractUnit: 'Month(s)',
                accommodation: false,
                healthInsurance: false,
                payAmount: 15000,
                payFrequency: 'PER_MONTH',
                description: ''
            });
        } catch (error) {
            console.error('Error sending hire request:', error);
            toast.error(error.message || 'Failed to send hire request');
        } finally {
            setSubmitting(false);
        }
    };

    const filteredDrivers = drivers.filter(driver => {
        const name = `${driver.userDetails?.firstName || ''} ${driver.userDetails?.lastName || ''}`.toLowerCase();
        const license = driver.licenseDetails?.licenseNumber?.toLowerCase() || '';
        return name.includes(searchTerm.toLowerCase()) || license.includes(searchTerm.toLowerCase());
    });

    const getExperienceText = (exp) => {
        if (!exp) return 'Not specified';
        const years = exp.totalYears || 0;
        return `${years} year${years !== 1 ? 's' : ''}`;
    };

    const getVehicleTypesText = (exp) => {
        if (!exp?.vehicleTypesOperated?.length) return 'Not specified';
        return exp.vehicleTypesOperated.join(', ');
    };

    const passengerVehicles = ['Car', 'Traveller', 'Mini Bus', 'Bus'];
    const commercialVehicles = ['Pickup Van', 'Lorry'];

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search by name or license..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                </div>
            </div>

            {/* Drivers Grid */}
            {loading ? (
                <div className="flex items-center justify-center h-64 bg-white rounded-xl border border-gray-200">
                    <div className="flex flex-col items-center">
                        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                        <p className="mt-4 text-gray-500">Loading available drivers...</p>
                    </div>
                </div>
            ) : filteredDrivers.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 bg-white rounded-xl border border-gray-200">
                    <User size={48} className="text-gray-300 mb-4" />
                    <p className="text-gray-500 font-medium">No available drivers found</p>
                    <p className="text-gray-400 text-sm mt-1">Check back later for new drivers</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredDrivers.map((driver) => (
                        <div key={driver._id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
                            {/* Driver Header */}
                            <div className="p-6 border-b border-gray-100">
                                <div className="flex items-start gap-4">
                                    <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                                        {driver.userDetails?.profileImage ? (
                                            <img src={driver.userDetails.profileImage} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <User size={24} className="text-gray-400" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-gray-900 truncate">
                                            {driver.userDetails?.firstName || 'Unknown'} {driver.userDetails?.lastName || 'Driver'}
                                        </h3>
                                        <p className="text-sm text-gray-500 mt-0.5">
                                            License: {driver.licenseDetails?.licenseNumber || 'N/A'}
                                        </p>
                                        <div className="flex items-center gap-1 mt-1">
                                            <Star size={14} className="text-amber-500 fill-amber-500" />
                                            <span className="text-sm font-medium text-gray-700">
                                                {driver.ratings?.averageRating?.toFixed(1) || '0.0'}
                                            </span>
                                            <span className="text-xs text-gray-400">
                                                ({driver.ratings?.totalRatings || 0} reviews)
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Driver Details */}
                            <div className="p-6 space-y-3">
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Clock size={16} className="text-gray-400" />
                                    <span>Experience: {getExperienceText(driver.experience)}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Award size={16} className="text-gray-400" />
                                    <span>License: {driver.licenseDetails?.licenseType || 'N/A'}</span>
                                </div>

                                {/* Driver Preferences */}
                                {driver.availability && (
                                    <div className="pt-3 border-t border-gray-100">
                                        <p className="text-xs font-medium text-gray-500 uppercase mb-2">Preferences</p>
                                        <div className="flex flex-wrap gap-2">
                                            {driver.availability.preferredWorkType && (
                                                <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">
                                                    {driver.availability.preferredWorkType.replace('_', ' ')}
                                                </span>
                                            )}
                                            {driver.availability.willingToRelocate && (
                                                <span className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded-full">
                                                    Willing to relocate
                                                </span>
                                            )}
                                            {driver.availability.expectedSalary?.min && (
                                                <span className="px-2 py-1 bg-amber-50 text-amber-700 text-xs rounded-full">
                                                    ₹{driver.availability.expectedSalary.min.toLocaleString()}+
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Hire Button */}
                            <div className="px-6 pb-6 flex gap-2">
                                <button
                                    onClick={() => {
                                        setSelectedDriver(driver);
                                        setShowDetailsModal(true);
                                    }}
                                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                                >
                                    <User size={18} />
                                    View Details
                                </button>
                                {(() => {
                                    const status = getRequestStatus(driver);
                                    console.log('Rendering button for driver:', driver._id, 'Status:', status);
                                    
                                    if (status === 'PENDING' || status === 'VIEWED') {
                                        return (
                                            <button
                                                disabled
                                                className="flex-1 bg-blue-100 text-blue-700 font-medium py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 cursor-not-allowed"
                                            >
                                                <Loader2 size={18} className="animate-spin" />
                                                Pending
                                            </button>
                                        );
                                    } else if (status === 'ACCEPTED') {
                                        return (
                                            <button
                                                disabled
                                                className="flex-1 bg-green-100 text-green-700 font-medium py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 cursor-not-allowed"
                                            >
                                                <CheckCircle size={18} />
                                                Accepted
                                            </button>
                                        );
                                    } else if (status === 'REJECTED') {
                                        return (
                                            <button
                                                onClick={() => handleHireClick(driver)}
                                                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-medium py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                                            >
                                                <Briefcase size={18} />
                                                Resend
                                            </button>
                                        );
                                    } else {
                                        return (
                                            <button
                                                onClick={() => handleHireClick(driver)}
                                                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-medium py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                                            >
                                                <Briefcase size={18} />
                                                Hire
                                            </button>
                                        );
                                    }
                                })()}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Hire Modal */}
            {showHireModal && selectedDriver && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Send Hire Request</h2>
                                <p className="text-sm text-gray-500 mt-1">
                                    To: {selectedDriver.userDetails?.firstName} {selectedDriver.userDetails?.lastName}
                                </p>
                            </div>
                            <button
                                onClick={() => setShowHireModal(false)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <X size={20} className="text-gray-500" />
                            </button>
                        </div>

                        {/* Driver Preferences Card */}
                        <div className="mx-6 mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
                            <p className="text-sm font-medium text-blue-800 mb-2">Driver's Preferences</p>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                    <span className="text-blue-600">Work Type:</span>{' '}
                                    <span className="text-blue-900 font-medium">
                                        {selectedDriver.availability?.preferredWorkType?.replace('_', ' ') || 'Any'}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-blue-600">Expected Salary:</span>{' '}
                                    <span className="text-blue-900 font-medium">
                                        {selectedDriver.availability?.expectedSalary?.min 
                                            ? `₹${selectedDriver.availability.expectedSalary.min.toLocaleString()}+` 
                                            : 'Negotiable'}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-blue-600">Relocate:</span>{' '}
                                    <span className="text-blue-900 font-medium">
                                        {selectedDriver.availability?.willingToRelocate ? 'Yes' : 'No'}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-blue-600">Experience:</span>{' '}
                                    <span className="text-blue-900 font-medium">
                                        {getExperienceText(selectedDriver.experience)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Form */}
                        <div className="p-6 space-y-5">
                            {/* Service Type */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Service Type</label>
                                <div className="flex gap-3">
                                    {['Commercial', 'Passenger'].map((type) => (
                                        <button
                                            key={type}
                                            onClick={() => {
                                                handleFormChange('serviceType', type);
                                                handleFormChange('vehicleCategory', type);
                                            }}
                                            className={`flex-1 py-2.5 px-4 rounded-lg border-2 font-medium transition-colors ${
                                                hireForm.serviceType === type
                                                    ? 'border-amber-500 bg-amber-50 text-amber-700'
                                                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                                            }`}
                                        >
                                            {type === 'Commercial' ? <Truck size={18} className="inline mr-2" /> : <Car size={18} className="inline mr-2" />}
                                            {type}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Vehicle Type */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle Type</label>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                    {(hireForm.vehicleCategory === 'Passenger' ? passengerVehicles : commercialVehicles).map((vehicle) => (
                                        <button
                                            key={vehicle}
                                            onClick={() => handleFormChange('vehicleType', vehicle)}
                                            className={`py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                                                hireForm.vehicleType === vehicle
                                                    ? 'border-amber-500 bg-amber-50 text-amber-700'
                                                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                                            }`}
                                        >
                                            {vehicle}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Contract Duration */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Contract Duration</label>
                                <div className="flex gap-3">
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        value={hireForm.contractDuration}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            // Allow empty string for typing, or valid positive numbers
                                            if (value === '' || /^\d+$/.test(value)) {
                                                handleFormChange('contractDuration', value === '' ? '' : parseInt(value));
                                            }
                                        }}
                                        onBlur={(e) => {
                                            // Ensure minimum value of 1 when field loses focus
                                            if (!e.target.value || parseInt(e.target.value) < 1) {
                                                handleFormChange('contractDuration', 1);
                                            }
                                        }}
                                        placeholder="1"
                                        className="w-24 px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                                    />
                                    <select
                                        value={hireForm.contractUnit}
                                        onChange={(e) => handleFormChange('contractUnit', e.target.value)}
                                        className="flex-1 px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                                    >
                                        <option value="Day(s)">Day(s)</option>
                                        <option value="Month(s)">Month(s)</option>
                                        <option value="Year(s)">Year(s)</option>
                                    </select>
                                </div>
                            </div>

                            {/* Accommodation */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Accommodation</label>
                                <div className="flex gap-3">
                                    {[{ value: true, label: 'Yes, Provided' }, { value: false, label: 'Not Provided' }].map((option) => (
                                        <button
                                            key={option.label}
                                            onClick={() => handleFormChange('accommodation', option.value)}
                                            className={`flex-1 py-2.5 px-4 rounded-lg border-2 font-medium transition-colors flex items-center justify-center gap-2 ${
                                                hireForm.accommodation === option.value
                                                    ? 'border-amber-500 bg-amber-50 text-amber-700'
                                                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                                            }`}
                                        >
                                            <Home size={18} />
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Health Insurance */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Health Insurance</label>
                                <div className="flex gap-3">
                                    {[{ value: true, label: 'Yes, Provided' }, { value: false, label: 'Not Provided' }].map((option) => (
                                        <button
                                            key={option.label}
                                            onClick={() => handleFormChange('healthInsurance', option.value)}
                                            className={`flex-1 py-2.5 px-4 rounded-lg border-2 font-medium transition-colors flex items-center justify-center gap-2 ${
                                                hireForm.healthInsurance === option.value
                                                    ? 'border-amber-500 bg-amber-50 text-amber-700'
                                                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                                            }`}
                                        >
                                            <ShieldCheck size={18} />
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Pay */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Pay: ₹{hireForm.payAmount.toLocaleString()} / {hireForm.payFrequency === 'PER_KM' ? 'km' : hireForm.payFrequency === 'PER_DAY' ? 'day' : 'month'}
                                </label>
                                <input
                                    type="range"
                                    min={hireForm.payFrequency === 'PER_KM' ? 5 : hireForm.payFrequency === 'PER_DAY' ? 300 : 10000}
                                    max={hireForm.payFrequency === 'PER_KM' ? 50 : hireForm.payFrequency === 'PER_DAY' ? 2000 : 100000}
                                    step={hireForm.payFrequency === 'PER_KM' ? 1 : hireForm.payFrequency === 'PER_DAY' ? 50 : 1000}
                                    value={hireForm.payAmount}
                                    onChange={(e) => handleFormChange('payAmount', parseInt(e.target.value))}
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
                                />
                                <div className="flex gap-2 mt-3">
                                    {['PER_KM', 'PER_DAY', 'PER_MONTH'].map((freq) => (
                                        <button
                                            key={freq}
                                            onClick={() => {
                                                handleFormChange('payFrequency', freq);
                                                // Reset to default values based on frequency
                                                handleFormChange('payAmount', freq === 'PER_KM' ? 15 : freq === 'PER_DAY' ? 500 : 15000);
                                            }}
                                            className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                                                hireForm.payFrequency === freq
                                                    ? 'border-amber-500 bg-amber-50 text-amber-700'
                                                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                                            }`}
                                        >
                                            {freq === 'PER_KM' ? 'Per KM' : freq === 'PER_DAY' ? 'Per Day' : 'Per Month'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Description (Optional)</label>
                                <textarea
                                    value={hireForm.description}
                                    onChange={(e) => handleFormChange('description', e.target.value)}
                                    placeholder="Add any additional details about the job..."
                                    rows={3}
                                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                                />
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100 sticky bottom-0 bg-white">
                            <button
                                onClick={() => setShowHireModal(false)}
                                className="px-6 py-2.5 border border-gray-200 rounded-lg text-gray-600 font-medium hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmitHireRequest}
                                disabled={submitting}
                                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {submitting ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Sending...
                                    </>
                                ) : (
                                    <>
                                        <Send size={18} />
                                        Send Hire Request
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Driver Details Modal */}
            {showDetailsModal && selectedDriver && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Driver Details</h2>
                                <p className="text-sm text-gray-500 mt-1">Complete profile information</p>
                            </div>
                            <button
                                onClick={() => setShowDetailsModal(false)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <X size={20} className="text-gray-500" />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6 space-y-6">
                            {/* Driver Header */}
                            <div className="flex items-start gap-4 pb-6 border-b border-gray-100">
                                <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                                    {selectedDriver.userDetails?.profileImage ? (
                                        <img src={selectedDriver.userDetails.profileImage} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <User size={32} className="text-gray-400" />
                                    )}
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-xl font-semibold text-gray-900">
                                        {selectedDriver.userDetails?.firstName || 'Unknown'} {selectedDriver.userDetails?.lastName || 'Driver'}
                                    </h3>
                                    <p className="text-gray-600 mt-1">{selectedDriver.userDetails?.email || 'N/A'}</p>
                                    <div className="flex items-center gap-1 mt-2">
                                        <Star size={16} className="text-amber-500 fill-amber-500" />
                                        <span className="text-sm font-medium text-gray-700">
                                            {selectedDriver.ratings?.averageRating?.toFixed(1) || '0.0'}
                                        </span>
                                        <span className="text-xs text-gray-400">
                                            ({selectedDriver.ratings?.totalRatings || 0} reviews)
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* License Information */}
                            <div>
                                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                    <ShieldCheck size={18} className="text-gray-600" />
                                    License Information
                                </h4>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="text-gray-600">License Number:</span>
                                        <p className="font-medium text-gray-900 mt-1">{selectedDriver.licenseDetails?.licenseNumber || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <span className="text-gray-600">License Type:</span>
                                        <p className="font-medium text-gray-900 mt-1">{selectedDriver.licenseDetails?.licenseType || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <span className="text-gray-600">Issue Date:</span>
                                        <p className="font-medium text-gray-900 mt-1">
                                            {selectedDriver.licenseDetails?.issueDate 
                                                ? new Date(selectedDriver.licenseDetails.issueDate).toLocaleDateString('en-IN')
                                                : 'N/A'}
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-gray-600">Valid Until:</span>
                                        <p className="font-medium text-gray-900 mt-1">
                                            {selectedDriver.licenseDetails?.validUpto 
                                                ? new Date(selectedDriver.licenseDetails.validUpto).toLocaleDateString('en-IN')
                                                : 'N/A'}
                                        </p>
                                    </div>
                                    {selectedDriver.licenseDetails?.address && (
                                        <div className="col-span-2">
                                            <span className="text-gray-600">Address:</span>
                                            <p className="font-medium text-gray-900 mt-1">{selectedDriver.licenseDetails.address}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Experience */}
                            <div>
                                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                    <Clock size={18} className="text-gray-600" />
                                    Experience
                                </h4>
                                <div className="text-sm">
                                    <p className="text-gray-600">Total Experience:</p>
                                    <p className="font-medium text-gray-900 mt-1">{getExperienceText(selectedDriver.experience)}</p>
                                    {selectedDriver.experience?.vehicleTypesOperated?.length > 0 && (
                                        <>
                                            <p className="text-gray-600 mt-3">Vehicle Types Operated:</p>
                                            <div className="flex flex-wrap gap-2 mt-1">
                                                {selectedDriver.experience.vehicleTypesOperated.map((type, idx) => (
                                                    <span key={idx} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                                                        {type}
                                                    </span>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Preferences */}
                            {selectedDriver.availability && (
                                <div>
                                    <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                        <Briefcase size={18} className="text-gray-600" />
                                        Work Preferences
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <span className="text-gray-600">Preferred Work Type:</span>
                                            <p className="font-medium text-gray-900 mt-1">
                                                {selectedDriver.availability.preferredWorkType?.replace('_', ' ') || 'Any'}
                                            </p>
                                        </div>
                                        <div>
                                            <span className="text-gray-600">Willing to Relocate:</span>
                                            <p className="font-medium text-gray-900 mt-1">
                                                {selectedDriver.availability.willingToRelocate ? 'Yes' : 'No'}
                                            </p>
                                        </div>
                                        {selectedDriver.availability.expectedSalary?.min && (
                                            <div className="col-span-2">
                                                <span className="text-gray-600">Expected Salary:</span>
                                                <p className="font-medium text-gray-900 mt-1">
                                                    ₹{selectedDriver.availability.expectedSalary.min.toLocaleString()} 
                                                    {selectedDriver.availability.expectedSalary.max 
                                                        ? ` - ₹${selectedDriver.availability.expectedSalary.max.toLocaleString()}`
                                                        : '+'} 
                                                    {' per '}
                                                    {selectedDriver.availability.expectedSalary.frequency?.toLowerCase() || 'month'}
                                                </p>
                                            </div>
                                        )}
                                        {selectedDriver.availability.preferredLocations?.length > 0 && (
                                            <div className="col-span-2">
                                                <span className="text-gray-600">Preferred Locations:</span>
                                                <div className="flex flex-wrap gap-2 mt-1">
                                                    {selectedDriver.availability.preferredLocations.map((loc, idx) => (
                                                        <span key={idx} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs">
                                                            <MapPin size={12} className="inline mr-1" />
                                                            {loc}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100 sticky bottom-0 bg-white">
                            <button
                                onClick={() => setShowDetailsModal(false)}
                                className="px-6 py-2.5 border border-gray-200 rounded-lg text-gray-600 font-medium hover:bg-gray-50 transition-colors"
                            >
                                Close
                            </button>
                            <button
                                onClick={() => {
                                    setShowDetailsModal(false);
                                    handleHireClick(selectedDriver);
                                }}
                                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                            >
                                <Briefcase size={18} />
                                Send Hire Request
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HireDriversPage;
