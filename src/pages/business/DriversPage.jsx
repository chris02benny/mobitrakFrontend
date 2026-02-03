import React, { useState, useEffect } from 'react';
import { Users, Search, Phone, Mail, Star, Calendar, Clock, MoreVertical, UserX, Car, Award, Shield, CheckCircle, XCircle, Eye, FileText, X, Loader2 } from 'lucide-react';
import { hiringService } from '../../services/hiringService';
import toast from 'react-hot-toast';

// Pending Requests List Component
const PendingRequestsList = ({ requests, loading, onApprove }) => {
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [showDLModal, setShowDLModal] = useState(null);
    const [processingId, setProcessingId] = useState(null);

    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const formatSalary = (salary) => {
        if (!salary?.amount) return 'Not specified';
        const frequencyMap = {
            'HOURLY': '/hr',
            'DAILY': '/day',
            'WEEKLY': '/week',
            'MONTHLY': '/month',
            'ANNUAL': '/year',
            'PER_KM': '/km',
            'PER_MONTH': '/month'
        };
        return `₹${salary.amount.toLocaleString()}${frequencyMap[salary.frequency] || ''}`;
    };

    const handleFinalizeHiring = async (requestId) => {
        try {
            setProcessingId(requestId);
            await hiringService.finalizeHiring(requestId, {
                startDate: new Date().toISOString()
            });
            toast.success('Driver added to your fleet successfully!');
            onApprove();
        } catch (error) {
            console.error('Error finalizing hiring:', error);
            toast.error(error.message || 'Failed to add driver to fleet');
        } finally {
            setProcessingId(null);
        }
    };

    const handleViewDL = (request) => {
        setShowDLModal(request);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64 bg-white rounded-xl border border-gray-200">
                <div className="flex flex-col items-center">
                    <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="mt-4 text-gray-500">Loading pending requests...</p>
                </div>
            </div>
        );
    }

    if (requests.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 bg-white rounded-xl border border-gray-200">
                <Clock size={48} className="text-gray-300 mb-4" />
                <p className="text-gray-500 font-medium">No pending hire requests</p>
                <p className="text-gray-400 text-sm mt-1">Hire requests you send will appear here</p>
            </div>
        );
    }

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {requests.map((request) => {
                    // Backend populates driverId with userDetails
                    const driver = request.driverId;
                    const userDetails = driver?.userDetails;
                    const dlConsentGiven = request.driverResponse?.dlConsentGiven;

                    return (
                        <div key={request._id} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
                            {/* Driver Header */}
                            <div className="flex items-start gap-4 mb-4">
                                <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                                    {userDetails?.profileImage ? (
                                        <img src={userDetails.profileImage} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <Users size={24} className="text-gray-400" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-gray-900 truncate">
                                        {userDetails?.firstName || 'Unknown'} {userDetails?.lastName || 'Driver'}
                                    </h3>
                                    <p className="text-sm text-gray-500">{userDetails?.email || 'N/A'}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        {request.status === 'PENDING' ? (
                                            <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">
                                                Waiting for Response
                                            </span>
                                        ) : request.status === 'ACCEPTED' ? (
                                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                                                Accepted
                                            </span>
                                        ) : null}
                                    </div>
                                </div>
                            </div>

                            {/* Job Details */}
                            <div className="space-y-3 mb-4 pb-4 border-b border-gray-100">
                                <div className="flex items-center gap-2 text-sm">
                                    <Calendar size={16} className="text-gray-400" />
                                    <span className="text-gray-700">
                                        {request.status === 'PENDING' 
                                            ? `Sent: ${formatDate(request.createdAt)}` 
                                            : `Accepted: ${formatDate(request.driverResponse?.respondedAt)}`}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                    <Car size={16} className="text-gray-400" />
                                    <span className="text-gray-700">{request.jobDetails?.serviceType} - {request.jobDetails?.vehicleType}</span>
                                </div>
                                <div className="p-3 bg-amber-50 rounded-lg">
                                    <p className="text-xs text-amber-600 mb-1">Offered Salary</p>
                                    <p className="text-lg font-bold text-amber-700">{formatSalary(request.offeredSalary)}</p>
                                </div>
                            </div>

                            {/* DL Consent Status - Only show for ACCEPTED requests */}
                            {request.status === 'ACCEPTED' && (
                                <div className={`p-3 rounded-lg mb-4 ${
                                    dlConsentGiven ? 'bg-blue-50 border border-blue-100' : 'bg-gray-50 border border-gray-200'
                                }`}>
                                    <div className="flex items-center gap-2 text-sm">
                                        {dlConsentGiven ? (
                                            <>
                                                <CheckCircle size={16} className="text-blue-600" />
                                                <span className="text-blue-700 font-medium">DL viewing consented</span>
                                            </>
                                        ) : (
                                            <>
                                                <XCircle size={16} className="text-gray-500" />
                                                <span className="text-gray-600">DL viewing not consented</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="space-y-2">
                                {request.status === 'ACCEPTED' && (
                                    <>
                                        {dlConsentGiven && (
                                            <button
                                                onClick={() => handleViewDL(request)}
                                                className="w-full py-2.5 px-4 bg-blue-50 text-blue-600 rounded-lg font-medium hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
                                            >
                                                <Eye size={18} />
                                                View Driving License
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleFinalizeHiring(request._id)}
                                            disabled={processingId === request._id}
                                            className="w-full py-2.5 px-4 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {processingId === request._id ? (
                                                <>
                                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                    Processing...
                                                </>
                                            ) : (
                                                <>
                                                    <CheckCircle size={18} />
                                                    Add to Fleet
                                                </>
                                            )}
                                        </button>
                                    </>
                                )}
                                {request.status === 'PENDING' && (
                                    <div className="p-3 bg-yellow-50 border border-yellow-100 rounded-lg">
                                        <p className="text-sm text-yellow-700 text-center">
                                            <Clock size={16} className="inline mr-2" />
                                            Waiting for driver to respond
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Driver Message */}
                            {request.driverResponse?.message && (
                                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                                    <p className="text-xs text-gray-500 mb-1">Message from driver:</p>
                                    <p className="text-sm text-gray-700">{request.driverResponse.message}</p>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* DL Viewing Modal */}
            {showDLModal && (
                <DLViewModal 
                    request={showDLModal}
                    onClose={() => setShowDLModal(null)}
                />
            )}
        </>
    );
};

// DL View Modal Component
const DLViewModal = ({ request, onClose }) => {
    const driver = request.driverId;
    const userDetails = driver?.userDetails;
    const dlUrl = driver?.licenseDetails?.licenseUpload;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Driving License</h2>
                            <p className="text-sm text-gray-500 mt-1">
                                {userDetails?.firstName || 'Driver'} {userDetails?.lastName || ''}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
                        >
                            <XCircle size={20} className="text-gray-500" />
                        </button>
                    </div>
                </div>
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                    {dlUrl ? (
                        <div className="space-y-4">
                            <img 
                                src={dlUrl} 
                                alt="Driving License" 
                                className="w-full rounded-lg border border-gray-200"
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-gray-50 rounded-lg">
                                    <p className="text-xs text-gray-500">License Number</p>
                                    <p className="text-sm font-medium text-gray-900 mt-1">
                                        {driver?.licenseDetails?.licenseNumber || 'N/A'}
                                    </p>
                                </div>
                                <div className="p-4 bg-gray-50 rounded-lg">
                                    <p className="text-xs text-gray-500">License Type</p>
                                    <p className="text-sm font-medium text-gray-900 mt-1">
                                        {driver?.licenseDetails?.licenseType || 'N/A'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12">
                            <FileText size={48} className="text-gray-300 mb-4" />
                            <p className="text-gray-500 font-medium">No driving license uploaded</p>
                            <p className="text-gray-400 text-sm mt-1">The driver hasn't uploaded their license yet</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const DriversPage = () => {
    const [activeTab, setActiveTab] = useState('drivers'); // 'drivers' or 'pending'
    const [employees, setEmployees] = useState([]);
    const [pendingRequests, setPendingRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [driverDetails, setDriverDetails] = useState({});
    const [selectedDriver, setSelectedDriver] = useState(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [showTerminateModal, setShowTerminateModal] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [terminateData, setTerminateData] = useState({ reason: '', details: '', rating: 0 });
    const [terminating, setTerminating] = useState(false);
    const [openMenuId, setOpenMenuId] = useState(null);

    useEffect(() => {
        fetchEmployees();
        fetchPendingRequests();
    }, []);

    useEffect(() => {
        const handleClickOutside = () => {
            if (openMenuId) setOpenMenuId(null);
        };
        
        if (openMenuId) {
            document.addEventListener('click', handleClickOutside);
            return () => document.removeEventListener('click', handleClickOutside);
        }
    }, [openMenuId]);

    const fetchEmployees = async () => {
        try {
            setLoading(true);
            const response = await hiringService.getCompanyEmployees('ACTIVE');
            const employments = response.data?.employments || [];
            setEmployees(employments);
            // Backend already populates driverId with userDetails, no need for additional fetches
        } catch (error) {
            console.error('Error fetching employees:', error);
            toast.error('Failed to load your drivers');
        } finally {
            setLoading(false);
        }
    };

    const fetchPendingRequests = async () => {
        try {
            const response = await hiringService.getSentRequests();
            const requests = response.data?.requests || [];
            // Filter PENDING (waiting for driver) and ACCEPTED (waiting for fleet manager) requests
            const pendingRequests = requests.filter(req => req.status === 'PENDING' || req.status === 'ACCEPTED');
            setPendingRequests(pendingRequests);
            // Backend already populates driverId with userDetails, no need for additional fetches
        } catch (error) {
            console.error('Error fetching pending requests:', error);
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const formatSalary = (salary) => {
        if (!salary?.amount) return 'Not specified';
        const frequencyMap = {
            'HOURLY': '/hr',
            'DAILY': '/day',
            'WEEKLY': '/week',
            'MONTHLY': '/month',
            'ANNUAL': '/year',
            'PER_KM': '/km'
        };
        return `₹${salary.amount.toLocaleString()}${frequencyMap[salary.frequency] || ''}`;
    };

    const getPositionLabel = (position) => {
        const labels = {
            'PRIMARY_DRIVER': 'Primary Driver',
            'BACKUP_DRIVER': 'Backup Driver',
            'TRAINEE': 'Trainee',
            'SENIOR_DRIVER': 'Senior Driver',
            'FLEET_SUPERVISOR': 'Fleet Supervisor'
        };
        return labels[position] || position;
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'ACTIVE':
                return 'bg-green-100 text-green-700';
            case 'ON_LEAVE':
                return 'bg-yellow-100 text-yellow-700';
            case 'SUSPENDED':
                return 'bg-red-100 text-red-700';
            default:
                return 'bg-gray-100 text-gray-700';
        }
    };

    const handleTerminateClick = (employment) => {
        setSelectedDriver({ employment, userDetails: employment.driverId?.userDetails });
        setShowConfirmModal(true);
        setOpenMenuId(null);
    };

    const handleConfirmTerminate = () => {
        setShowConfirmModal(false);
        setShowTerminateModal(true);
    };

    const handleTerminateSubmit = async () => {
        if (!terminateData.reason || terminateData.reason === '' || terminateData.reason === 'Select a reason') {
            toast.error('Please select a reason for termination');
            return;
        }

        if (!terminateData.details || terminateData.details.trim() === '') {
            toast.error('Please provide a description');
            return;
        }

        if (!terminateData.rating || terminateData.rating === 0) {
            toast.error('Please provide a rating');
            return;
        }

        try {
            setTerminating(true);
            await hiringService.terminateEmployment(selectedDriver.employment._id, terminateData);
            toast.success('Employment terminated successfully');
            setShowTerminateModal(false);
            setTerminateData({ reason: '', details: '', rating: 0 });
            fetchEmployees();
        } catch (error) {
            console.error('Error terminating employment:', error);
            toast.error(error.message || 'Failed to terminate employment');
        } finally {
            setTerminating(false);
        }
    };

    const filteredEmployees = employees.filter(emp => {
        const driver = emp.driverId;
        const userDetails = driver?.userDetails;
        const name = `${userDetails?.firstName || ''} ${userDetails?.lastName || ''}`.toLowerCase();
        const license = driver?.licenseDetails?.licenseNumber?.toLowerCase() || '';
        return name.includes(searchTerm.toLowerCase()) || license.includes(searchTerm.toLowerCase());
    });

    return (
        <div className="flex flex-col gap-6">
            {/* Tabs and Search Bar Row */}
            <div className="flex items-center justify-between gap-4">
                <div className="flex justify-start">
                    <div className="bg-white border border-gray-200 rounded-xl p-1 flex gap-1 w-full max-w-md">
                        <button
                            onClick={() => setActiveTab('drivers')}
                            className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition-all ${
                                activeTab === 'drivers'
                                    ? 'bg-amber-500 text-white shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                            }`}
                        >
                            <div className="flex items-center justify-center gap-2">
                                <Users size={18} />
                                <span>Drivers</span>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                    activeTab === 'drivers' ? 'bg-amber-600 text-white' : 'bg-gray-200 text-gray-700'
                                }`}>
                                    {employees.length}
                                </span>
                            </div>
                        </button>
                        <button
                            onClick={() => setActiveTab('pending')}
                            className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition-all ${
                                activeTab === 'pending'
                                    ? 'bg-amber-500 text-white shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                            }`}
                        >
                            <div className="flex items-center justify-center gap-2">
                                <Clock size={18} />
                                <span>Pending</span>
                                {pendingRequests.length > 0 && (
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                        activeTab === 'pending' ? 'bg-amber-600 text-white' : 'bg-amber-100 text-amber-700'
                                    }`}>
                                        {pendingRequests.length}
                                    </span>
                                )}
                            </div>
                        </button>
                    </div>
                </div>
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

            {/* Tab Content */}
            {activeTab === 'drivers' ? (
                <>
                    {/* Stats Row */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
                            <Users size={20} className="text-amber-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{employees.length}</p>
                            <p className="text-sm text-gray-500">Total Drivers</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                            <Shield size={20} className="text-green-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">
                                {employees.filter(e => e.status === 'ACTIVE').length}
                            </p>
                            <p className="text-sm text-gray-500">Active</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-yellow-50 rounded-lg flex items-center justify-center">
                            <Clock size={20} className="text-yellow-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">
                                {employees.filter(e => e.status === 'ON_LEAVE').length}
                            </p>
                            <p className="text-sm text-gray-500">On Leave</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                            <Car size={20} className="text-blue-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">
                                {employees.filter(e => e.assignedVehicle?.vehicleId).length}
                            </p>
                            <p className="text-sm text-gray-500">With Vehicle</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Drivers List */}
            {loading ? (
                <div className="flex items-center justify-center h-64 bg-white rounded-xl border border-gray-200">
                    <div className="flex flex-col items-center">
                        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                        <p className="mt-4 text-gray-500">Loading your drivers...</p>
                    </div>
                </div>
            ) : filteredEmployees.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 bg-white rounded-xl border border-gray-200">
                    <UserX size={48} className="text-gray-300 mb-4" />
                    <p className="text-gray-500 font-medium">
                        {employees.length === 0 ? 'No drivers hired yet' : 'No drivers match your search'}
                    </p>
                    <p className="text-gray-400 text-sm mt-1">
                        {employees.length === 0 ? 'Go to "Hire Drivers" to find and hire drivers' : 'Try a different search term'}
                    </p>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-gray-200">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Driver</th>
                                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">License</th>
                                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Joined</th>
                                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Salary</th>
                                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Status</th>
                                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Rating</th>
                                <th className="text-right px-6 py-4 text-sm font-medium text-gray-500">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredEmployees.map((employment) => {
                                const driver = employment.driverId;
                                const userDetails = driver?.userDetails; // Backend populates this
                                
                                return (
                                    <tr 
                                        key={employment._id} 
                                        className="hover:bg-gray-50 transition-colors"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                                                    {userDetails?.profileImage ? (
                                                        <img src={userDetails.profileImage} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <Users size={18} className="text-gray-400" />
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900">
                                                        {userDetails?.firstName || 'Unknown'} {userDetails?.lastName || 'Driver'}
                                                    </p>
                                                    <p className="text-sm text-gray-500">{userDetails?.email || ''}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-mono text-gray-700">
                                                {driver?.licenseDetails?.licenseNumber || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-700">
                                            {formatDate(employment.startDate)}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                            {formatSalary(employment.salary)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(employment.status)}`}>
                                                {employment.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1">
                                                <Star size={14} className="text-amber-500 fill-amber-500" />
                                                <span className="text-sm font-medium text-gray-700">
                                                    {driver?.ratings?.averageRating?.toFixed(1) || '0.0'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 relative">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setOpenMenuId(openMenuId === employment._id ? null : employment._id);
                                                    }}
                                                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                                >
                                                    <MoreVertical size={18} className="text-gray-500" />
                                                </button>
                                                
                                                {openMenuId === employment._id && (
                                                    <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedDriver({ employment, userDetails });
                                                                setShowDetailsModal(true);
                                                                setOpenMenuId(null);
                                                            }}
                                                            className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 border-b border-gray-100 rounded-t-lg"
                                                        >
                                                            <Eye size={16} />
                                                            View Details
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleTerminateClick(employment);
                                                            }}
                                                            className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 rounded-b-lg"
                                                        >
                                                            <UserX size={16} />
                                                            Terminate Contract
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
                </>
            ) : (
                /* Pending Tab - Show accepted hire requests awaiting approval */
                <PendingRequestsList 
                    requests={pendingRequests}
                    loading={loading}
                    onApprove={() => {
                        fetchEmployees();
                        fetchPendingRequests();
                    }}
                />
            )}

            {/* Driver Details Modal */}
            {showDetailsModal && selectedDriver && (
                <DriverDetailsModal
                    employment={selectedDriver.employment}
                    userDetails={selectedDriver.userDetails}
                    onClose={() => setShowDetailsModal(false)}
                    formatDate={formatDate}
                    formatSalary={formatSalary}
                    getPositionLabel={getPositionLabel}
                    getStatusColor={getStatusColor}
                />
            )}

            {/* Confirmation Modal */}
            {showConfirmModal && selectedDriver && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl w-full max-w-md">
                        <div className="flex items-center justify-between p-6 border-b border-gray-100">
                            <h2 className="text-xl font-bold text-gray-900">Confirm Termination</h2>
                            <button onClick={() => setShowConfirmModal(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                                <X size={20} className="text-gray-500" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="font-semibold text-red-900 mb-1">Destructive Action</p>
                                    <p className="text-sm text-red-800">
                                        You are about to terminate the employment contract with{' '}
                                        <strong>{selectedDriver.userDetails?.firstName} {selectedDriver.userDetails?.lastName}</strong>.
                                        This action cannot be undone.
                                    </p>
                                </div>
                            </div>

                            <p className="text-sm text-gray-600">
                                This will permanently end the employment relationship and update the driver's status to Unemployed. 
                                You will be asked to provide details and a rating in the next step.
                            </p>
                        </div>

                        <div className="flex gap-3 p-6 border-t border-gray-100">
                            <button
                                onClick={() => setShowConfirmModal(false)}
                                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmTerminate}
                                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
                            >
                                Continue
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Terminate Modal */}
            {showTerminateModal && selectedDriver && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl w-full max-w-md">
                        <div className="flex items-center justify-between p-6 border-b border-gray-100">
                            <h2 className="text-xl font-bold text-gray-900">Terminate Contract</h2>
                            <button onClick={() => setShowTerminateModal(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                                <X size={20} className="text-gray-500" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="p-4 bg-red-50 border border-red-100 rounded-lg">
                                <p className="text-sm text-red-800">
                                    <strong>Warning:</strong> This will terminate the employment contract with{' '}
                                    <strong>{selectedDriver.userDetails?.firstName} {selectedDriver.userDetails?.lastName}</strong> 
                                    {' '}and set their status to Unemployed.
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Reason for Termination *
                                </label>
                                <select
                                    value={terminateData.reason}
                                    onChange={(e) => setTerminateData({ ...terminateData, reason: e.target.value })}
                                    className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent ${
                                        !terminateData.reason ? 'border-red-300' : 'border-gray-300'
                                    }`}
                                >
                                    <option value="">Select a reason</option>
                                    <option value="PERFORMANCE">Poor Performance</option>
                                    <option value="MISCONDUCT">Misconduct</option>
                                    <option value="CONTRACT_END">Contract End</option>
                                    <option value="MUTUAL_AGREEMENT">Mutual Agreement</option>
                                    <option value="REDUNDANCY">Downsizing/Redundancy</option>
                                    <option value="TERMINATION">General Termination</option>
                                    <option value="OTHER">Other</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Description *
                                </label>
                                <textarea
                                    value={terminateData.details}
                                    onChange={(e) => setTerminateData({ ...terminateData, details: e.target.value })}
                                    rows={4}
                                    placeholder="Provide detailed information about the termination..."
                                    className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none ${
                                        !terminateData.details || terminateData.details.trim() === '' ? 'border-red-300' : 'border-gray-300'
                                    }`}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Rate Driver Performance *
                                </label>
                                <div className="flex items-center gap-2">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            type="button"
                                            onClick={() => setTerminateData({ ...terminateData, rating: star })}
                                            className="focus:outline-none"
                                        >
                                            <Star
                                                size={32}
                                                className={`transition-colors ${
                                                    star <= terminateData.rating
                                                        ? 'text-amber-500 fill-amber-500'
                                                        : 'text-gray-300'
                                                }`}
                                            />
                                        </button>
                                    ))}
                                    <span className="ml-2 text-sm text-gray-600">
                                        {terminateData.rating > 0 ? `${terminateData.rating} out of 5` : 'Select rating'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 p-6 border-t border-gray-100">
                            <button
                                onClick={() => {
                                    setShowTerminateModal(false);
                                    setTerminateData({ reason: '', details: '', rating: 0 });
                                }}
                                disabled={terminating}
                                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleTerminateSubmit}
                                disabled={
                                    terminating || 
                                    !terminateData.reason || 
                                    terminateData.reason === '' ||
                                    !terminateData.details || 
                                    terminateData.details.trim() === '' ||
                                    !terminateData.rating || 
                                    terminateData.rating === 0
                                }
                                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {terminating ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        Terminating...
                                    </>
                                ) : (
                                    'Proceed to Terminate'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Driver Details Modal
const DriverDetailsModal = ({ 
    employment, 
    userDetails, 
    onClose, 
    formatDate, 
    formatSalary, 
    getPositionLabel, 
    getStatusColor 
}) => {
    const driver = employment.driverId;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white">
                    <h2 className="text-xl font-bold text-gray-900">Driver Details</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Driver Info */}
                    <div className="flex items-start gap-4">
                        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                            {userDetails?.profileImage ? (
                                <img src={userDetails.profileImage} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <Users size={24} className="text-gray-400" />
                            )}
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900">
                                {userDetails?.firstName || 'Unknown'} {userDetails?.lastName || 'Driver'}
                            </h3>
                            <p className="text-gray-500">{getPositionLabel(employment.position)}</p>
                            <div className="flex items-center gap-4 mt-2">
                                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(employment.status)}`}>
                                    {employment.status}
                                </span>
                                {driver?.ratings && (
                                    <div className="flex items-center gap-1">
                                        <Star size={14} className="text-amber-500 fill-amber-500" />
                                        <span className="text-sm font-medium text-gray-700">
                                            {driver.ratings.averageRating?.toFixed(1) || '0.0'}
                                        </span>
                                        <span className="text-xs text-gray-400">
                                            ({driver.ratings.totalRatings || 0} reviews)
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Contact Info */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-2 text-gray-500 mb-1">
                                <Mail size={14} />
                                <span className="text-xs">Email</span>
                            </div>
                            <p className="text-sm font-medium text-gray-900">{userDetails?.email || 'N/A'}</p>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-2 text-gray-500 mb-1">
                                <Award size={14} />
                                <span className="text-xs">License</span>
                            </div>
                            <p className="text-sm font-medium text-gray-900">
                                {driver?.licenseDetails?.licenseNumber || 'N/A'}
                            </p>
                        </div>
                    </div>

                    {/* Employment Details */}
                    <div>
                        <h4 className="text-sm font-medium text-gray-500 uppercase mb-3">Employment Details</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-gray-50 rounded-lg">
                                <p className="text-xs text-gray-500">Start Date</p>
                                <p className="text-sm font-medium text-gray-900 mt-1">
                                    {formatDate(employment.startDate)}
                                </p>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-lg">
                                <p className="text-xs text-gray-500">Employment Type</p>
                                <p className="text-sm font-medium text-gray-900 mt-1">
                                    {employment.employmentType?.replace('_', ' ') || 'Full Time'}
                                </p>
                            </div>
                            <div className="p-4 bg-amber-50 rounded-lg col-span-2">
                                <p className="text-xs text-amber-600">Salary</p>
                                <p className="text-lg font-bold text-amber-700 mt-1">
                                    {formatSalary(employment.salary)}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Experience */}
                    {driver?.experience && (
                        <div>
                            <h4 className="text-sm font-medium text-gray-500 uppercase mb-3">Experience</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-gray-50 rounded-lg">
                                    <p className="text-xs text-gray-500">Total Experience</p>
                                    <p className="text-sm font-medium text-gray-900 mt-1">
                                        {driver.experience.totalYears || 0} years
                                    </p>
                                </div>
                                <div className="p-4 bg-gray-50 rounded-lg">
                                    <p className="text-xs text-gray-500">License Type</p>
                                    <p className="text-sm font-medium text-gray-900 mt-1">
                                        {driver.licenseDetails?.licenseType || 'N/A'}
                                    </p>
                                </div>
                            </div>
                            {driver.experience.vehicleTypesOperated?.length > 0 && (
                                <div className="mt-3">
                                    <p className="text-xs text-gray-500 mb-2">Vehicle Types Operated</p>
                                    <div className="flex flex-wrap gap-2">
                                        {driver.experience.vehicleTypesOperated.map((type, idx) => (
                                            <span key={idx} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                                                {type}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DriversPage;
