import React, { useState, useEffect } from 'react';
import { Briefcase, MapPin, DollarSign, Clock, Building2, X, Check, ChevronDown, ShieldCheck, User, Home, Car, Truck, FileText, AlertCircle, Calendar } from 'lucide-react';
import { hiringService } from '../../services/hiringService';
import toast from 'react-hot-toast';

const JobsPage = () => {
    const [activeTab, setActiveTab] = useState('requests'); // 'requests' or 'listings'
    const [hireRequests, setHireRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [showResponseModal, setShowResponseModal] = useState(false);
    const [responseAction, setResponseAction] = useState(null); // 'accept' or 'reject'
    const [responseMessage, setResponseMessage] = useState('');
    const [rejectionReason, setRejectionReason] = useState('');
    const [dlConsentGiven, setDlConsentGiven] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [companyDetails, setCompanyDetails] = useState({});

    useEffect(() => {
        fetchHireRequests();
    }, []);

    const fetchHireRequests = async () => {
        try {
            setLoading(true);
            const response = await hiringService.getReceivedRequests();
            const requests = response.data?.requests || [];
            setHireRequests(requests);
            
            // Fetch company details for each request
            const companyIds = [...new Set(requests.map(r => r.companyId))];
            const detailsPromises = companyIds.map(async (id) => {
                try {
                    const userResponse = await hiringService.getUserById(id);
                    return { id, details: userResponse.user };
                } catch (error) {
                    return { id, details: null };
                }
            });
            
            const detailsResults = await Promise.all(detailsPromises);
            const detailsMap = {};
            detailsResults.forEach(({ id, details }) => {
                if (details) detailsMap[id] = details;
            });
            setCompanyDetails(detailsMap);
        } catch (error) {
            console.error('Error fetching hire requests:', error);
            toast.error('Failed to load hire requests');
        } finally {
            setLoading(false);
        }
    };

    const handleViewDetails = (request) => {
        setSelectedRequest(request);
        setShowDetailsModal(true);
    };

    const handleRespond = (request, action) => {
        setSelectedRequest(request);
        setResponseAction(action);
        setResponseMessage('');
        setRejectionReason('');
        setDlConsentGiven(false);
        setShowResponseModal(true);
    };

    const submitResponse = async () => {
        if (!selectedRequest || !responseAction) return;

        try {
            setSubmitting(true);
            const rejection = responseAction === 'reject' ? {
                reason: rejectionReason || 'OTHER',
                details: responseMessage
            } : null;

            await hiringService.respondToRequest(
                selectedRequest._id,
                responseAction,
                responseMessage,
                rejection,
                responseAction === 'accept' ? dlConsentGiven : undefined
            );

            const actionText = responseAction === 'accept' ? 'accepted' : 'rejected';
            toast.success(`Job offer ${actionText} successfully!`);
            
            setShowResponseModal(false);
            setShowDetailsModal(false);
            fetchHireRequests(); // Refresh the list
        } catch (error) {
            console.error('Error responding to request:', error);
            toast.error(error.message || 'Failed to respond to request');
        } finally {
            setSubmitting(false);
        }
    };

    const formatSalary = (salary) => {
        if (!salary) return 'Not specified';
        const frequencyMap = {
            'HOURLY': '/hr',
            'DAILY': '/day',
            'WEEKLY': '/week',
            'MONTHLY': '/month',
            'ANNUAL': '/year',
            'PER_KM': '/km'
        };
        return `₹${(salary.amount || 0).toLocaleString()}${frequencyMap[salary.frequency] || ''}`;
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'PENDING':
            case 'VIEWED':
                return 'bg-yellow-100 text-yellow-700';
            case 'ACCEPTED':
            case 'HIRED':
                return 'bg-green-100 text-green-700';
            case 'REJECTED':
                return 'bg-red-100 text-red-700';
            case 'EXPIRED':
            case 'WITHDRAWN':
                return 'bg-gray-100 text-gray-700';
            default:
                return 'bg-gray-100 text-gray-700';
        }
    };

    const getStatusLabel = (status) => {
        const labels = {
            'PENDING': 'New',
            'VIEWED': 'Pending Response',
            'ACCEPTED': 'Accepted',
            'REJECTED': 'Rejected',
            'HIRED': 'Hired',
            'EXPIRED': 'Expired',
            'WITHDRAWN': 'Withdrawn'
        };
        return labels[status] || status;
    };

    const pendingRequests = hireRequests.filter(r => ['PENDING', 'VIEWED'].includes(r.status));
    const completedRequests = hireRequests.filter(r => !['PENDING', 'VIEWED'].includes(r.status));

    return (
        <div className="flex flex-col gap-6">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Job Opportunities</h1>
                <p className="text-gray-500 text-sm mt-1">Review and respond to job offers from businesses</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('requests')}
                    className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
                        activeTab === 'requests'
                            ? 'border-amber-500 text-amber-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                >
                    Hire Requests
                    {pendingRequests.length > 0 && (
                        <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">
                            {pendingRequests.length}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
                        activeTab === 'history'
                            ? 'border-amber-500 text-amber-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                >
                    History
                </button>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center h-64 bg-white rounded-xl border border-gray-200">
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-gray-500 text-sm">Loading job requests...</p>
                    </div>
                </div>
            ) : activeTab === 'requests' ? (
                pendingRequests.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 bg-white rounded-xl border border-gray-200">
                        <Briefcase className="w-12 h-12 text-gray-300 mb-3" />
                        <p className="text-gray-900 font-medium">No pending job requests</p>
                        <p className="text-gray-500 text-sm">When businesses send you hire requests, they'll appear here</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {pendingRequests.map((request) => {
                            const company = companyDetails[request.companyId];
                            return (
                                <HireRequestCard
                                    key={request._id}
                                    request={request}
                                    company={company}
                                    onViewDetails={() => handleViewDetails(request)}
                                    onAccept={() => handleRespond(request, 'accept')}
                                    onReject={() => handleRespond(request, 'reject')}
                                    formatSalary={formatSalary}
                                    formatDate={formatDate}
                                    getStatusColor={getStatusColor}
                                    getStatusLabel={getStatusLabel}
                                />
                            );
                        })}
                    </div>
                )
            ) : (
                completedRequests.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 bg-white rounded-xl border border-gray-200">
                        <FileText className="w-12 h-12 text-gray-300 mb-3" />
                        <p className="text-gray-900 font-medium">No history yet</p>
                        <p className="text-gray-500 text-sm">Your accepted and rejected requests will appear here</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {completedRequests.map((request) => {
                            const company = companyDetails[request.companyId];
                            return (
                                <HireRequestCard
                                    key={request._id}
                                    request={request}
                                    company={company}
                                    onViewDetails={() => handleViewDetails(request)}
                                    formatSalary={formatSalary}
                                    formatDate={formatDate}
                                    getStatusColor={getStatusColor}
                                    getStatusLabel={getStatusLabel}
                                    isHistory
                                />
                            );
                        })}
                    </div>
                )
            )}

            {/* Details Modal */}
            {showDetailsModal && selectedRequest && (
                <DetailsModal
                    request={selectedRequest}
                    company={companyDetails[selectedRequest.companyId]}
                    onClose={() => setShowDetailsModal(false)}
                    onAccept={() => handleRespond(selectedRequest, 'accept')}
                    onReject={() => handleRespond(selectedRequest, 'reject')}
                    formatSalary={formatSalary}
                    formatDate={formatDate}
                    getStatusColor={getStatusColor}
                    getStatusLabel={getStatusLabel}
                />
            )}

            {/* Response Modal */}
            {showResponseModal && selectedRequest && (
                <ResponseModal
                    action={responseAction}
                    message={responseMessage}
                    setMessage={setResponseMessage}
                    rejectionReason={rejectionReason}
                    setRejectionReason={setRejectionReason}
                    dlConsentGiven={dlConsentGiven}
                    setDlConsentGiven={setDlConsentGiven}
                    onSubmit={submitResponse}
                    onClose={() => setShowResponseModal(false)}
                    submitting={submitting}
                />
            )}
        </div>
    );
};

// Hire Request Card Component
const HireRequestCard = ({ 
    request, 
    company, 
    onViewDetails, 
    onAccept, 
    onReject, 
    formatSalary, 
    formatDate, 
    getStatusColor, 
    getStatusLabel,
    isHistory = false 
}) => {
    const jobDetails = request.jobDetails || {};
    
    return (
        <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                {/* Company Info */}
                <div className="flex-1">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-amber-50 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Building2 className="w-6 h-6 text-amber-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <h3 className="text-lg font-semibold text-gray-900">
                                    {company?.companyName || 'Unknown Company'}
                                </h3>
                                {company?.isVerifiedBusiness && (
                                    <div className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-xs font-medium">
                                        <ShieldCheck size={12} fill="currentColor" />
                                        Verified
                                    </div>
                                )}
                            </div>
                            <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-500">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                                    {getStatusLabel(request.status)}
                                </span>
                                <span className="flex items-center gap-1">
                                    <DollarSign size={14} />
                                    {formatSalary(request.offeredSalary)}
                                </span>
                                <span className="flex items-center gap-1">
                                    <Calendar size={14} />
                                    {formatDate(request.createdAt)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Job Details Tags */}
                    <div className="flex flex-wrap gap-2 mt-4">
                        {jobDetails.serviceType && (
                            <span className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-medium">
                                {jobDetails.serviceType}
                            </span>
                        )}
                        {jobDetails.vehicleType && (
                            <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium flex items-center gap-1">
                                {jobDetails.vehicleCategory === 'Passenger' ? <Car size={12} /> : <Truck size={12} />}
                                {jobDetails.vehicleType}
                            </span>
                        )}
                        {jobDetails.contractDuration && (
                            <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                                {jobDetails.contractDuration} {jobDetails.contractUnit}
                            </span>
                        )}
                        {(request.benefits?.includes('ACCOMMODATION') || jobDetails.accommodation) && (
                            <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium flex items-center gap-1">
                                <Home size={12} />
                                Accommodation
                            </span>
                        )}
                    </div>

                    {jobDetails.description && (
                        <p className="text-gray-600 text-sm mt-3 line-clamp-2">{jobDetails.description}</p>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="flex lg:flex-col gap-2 lg:items-end">
                    <button 
                        onClick={onViewDetails}
                        className="flex-1 lg:flex-none px-6 py-2.5 border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        View Details
                    </button>
                    {!isHistory && (
                        <>
                            <button 
                                onClick={onAccept}
                                className="flex-1 lg:flex-none px-6 py-2.5 bg-green-500 text-white font-medium rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
                            >
                                <Check size={18} />
                                Accept
                            </button>
                            <button 
                                onClick={onReject}
                                className="flex-1 lg:flex-none px-6 py-2.5 bg-red-50 text-red-600 font-medium rounded-lg hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                            >
                                <X size={18} />
                                Reject
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

// Details Modal Component
const DetailsModal = ({ 
    request, 
    company, 
    onClose, 
    onAccept, 
    onReject, 
    formatSalary, 
    formatDate,
    getStatusColor,
    getStatusLabel 
}) => {
    const jobDetails = request.jobDetails || {};
    const isPending = ['PENDING', 'VIEWED'].includes(request.status);

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Job Offer Details</h2>
                        <p className="text-sm text-gray-500 mt-1">Review the complete job offer</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Company Info */}
                    <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                        <div className="w-14 h-14 bg-white rounded-lg flex items-center justify-center flex-shrink-0 border border-gray-200">
                            <Building2 className="w-7 h-7 text-amber-600" />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <h3 className="text-lg font-semibold text-gray-900">
                                    {company?.companyName || 'Unknown Company'}
                                </h3>
                                {company?.isVerifiedBusiness && (
                                    <div className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full text-xs font-medium">
                                        <ShieldCheck size={12} fill="currentColor" />
                                        Verified Business
                                    </div>
                                )}
                            </div>
                            <p className="text-sm text-gray-500 mt-1">{company?.email || ''}</p>
                            {company?.officeLocation?.address && (
                                <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                                    <MapPin size={14} />
                                    {company.officeLocation.address}
                                </p>
                            )}
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                            {getStatusLabel(request.status)}
                        </span>
                    </div>

                    {/* Job Details */}
                    <div>
                        <h4 className="text-sm font-medium text-gray-500 uppercase mb-3">Job Details</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-gray-50 rounded-lg">
                                <p className="text-xs text-gray-500">Service Type</p>
                                <p className="text-sm font-medium text-gray-900 mt-1">
                                    {jobDetails.serviceType || 'Not specified'}
                                </p>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-lg">
                                <p className="text-xs text-gray-500">Vehicle Type</p>
                                <p className="text-sm font-medium text-gray-900 mt-1">
                                    {jobDetails.vehicleType || 'Not specified'}
                                </p>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-lg">
                                <p className="text-xs text-gray-500">Contract Duration</p>
                                <p className="text-sm font-medium text-gray-900 mt-1">
                                    {jobDetails.contractDuration ? `${jobDetails.contractDuration} ${jobDetails.contractUnit}` : 'Not specified'}
                                </p>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-lg">
                                <p className="text-xs text-gray-500">Accommodation</p>
                                <p className="text-sm font-medium text-gray-900 mt-1">
                                    {jobDetails.accommodation ? 'Yes, Provided' : 'Not Provided'}
                                </p>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-lg">
                                <p className="text-xs text-gray-500">Health Insurance</p>
                                <p className="text-sm font-medium text-gray-900 mt-1">
                                    {jobDetails.healthInsurance ? 'Yes, Provided' : 'Not Provided'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Salary */}
                    <div className="p-4 bg-amber-50 rounded-lg border border-amber-100">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-amber-600 font-medium">OFFERED SALARY</p>
                                <p className="text-2xl font-bold text-amber-700 mt-1">
                                    {formatSalary(request.offeredSalary)}
                                </p>
                            </div>
                            <DollarSign size={32} className="text-amber-400" />
                        </div>
                    </div>

                    {/* Description */}
                    {jobDetails.description && (
                        <div>
                            <h4 className="text-sm font-medium text-gray-500 uppercase mb-2">Additional Details</h4>
                            <p className="text-gray-700 text-sm leading-relaxed">{jobDetails.description}</p>
                        </div>
                    )}

                    {/* Timeline */}
                    <div>
                        <h4 className="text-sm font-medium text-gray-500 uppercase mb-3">Timeline</h4>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-500">Request Received</span>
                                <span className="text-gray-900 font-medium">{formatDate(request.createdAt)}</span>
                            </div>
                            {request.expiresAt && (
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Expires On</span>
                                    <span className="text-red-600 font-medium">{formatDate(request.expiresAt)}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                {isPending && (
                    <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100 sticky bottom-0 bg-white">
                        <button
                            onClick={() => { onClose(); onReject(); }}
                            className="px-6 py-2.5 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100 transition-colors flex items-center gap-2"
                        >
                            <X size={18} />
                            Reject
                        </button>
                        <button
                            onClick={() => { onClose(); onAccept(); }}
                            className="px-6 py-2.5 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors flex items-center gap-2"
                        >
                            <Check size={18} />
                            Accept Offer
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

// Response Modal Component
const ResponseModal = ({ 
    action, 
    message, 
    setMessage, 
    rejectionReason,
    setRejectionReason,
    dlConsentGiven,
    setDlConsentGiven,
    onSubmit, 
    onClose, 
    submitting 
}) => {
    const isAccept = action === 'accept';
    const rejectionReasons = [
        { value: 'SALARY_LOW', label: 'Salary too low' },
        { value: 'LOCATION', label: 'Location not suitable' },
        { value: 'TIMING', label: 'Timing/schedule issues' },
        { value: 'BETTER_OFFER', label: 'Received better offer' },
        { value: 'PERSONAL', label: 'Personal reasons' },
        { value: 'OTHER', label: 'Other' }
    ];

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-md">
                {/* Header */}
                <div className={`p-6 border-b ${isAccept ? 'bg-green-50' : 'bg-red-50'}`}>
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isAccept ? 'bg-green-100' : 'bg-red-100'}`}>
                            {isAccept ? (
                                <Check size={20} className="text-green-600" />
                            ) : (
                                <X size={20} className="text-red-600" />
                            )}
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">
                                {isAccept ? 'Accept Job Offer' : 'Reject Job Offer'}
                            </h2>
                            <p className="text-sm text-gray-500">
                                {isAccept 
                                    ? 'Confirm your acceptance of this job offer' 
                                    : 'Let the employer know why you\'re declining'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="p-6 space-y-4">
                    {!isAccept && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Reason for rejection
                            </label>
                            <select
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                            >
                                <option value="">Select a reason</option>
                                {rejectionReasons.map((reason) => (
                                    <option key={reason.value} value={reason.value}>
                                        {reason.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            {isAccept ? 'Message to employer (optional)' : 'Additional comments (optional)'}
                        </label>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder={isAccept 
                                ? 'Thank you for the opportunity...' 
                                : 'Any additional feedback...'}
                            rows={3}
                            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                        />
                    </div>

                    {isAccept && (
                        <>
                            <div className="space-y-3">
                                <label className="flex items-start gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={dlConsentGiven}
                                        onChange={(e) => setDlConsentGiven(e.target.checked)}
                                        className="mt-1 w-4 h-4 text-green-600 rounded border-gray-300 focus:ring-2 focus:ring-green-500"
                                    />
                                    <div className="flex-1">
                                        <span className="text-sm font-medium text-gray-900">
                                            I consent to share my driving license information <span className="text-red-500">*</span>
                                        </span>
                                        <p className="text-xs text-gray-500 mt-1">
                                            The fleet manager will be able to view your uploaded driving license to verify your credentials.
                                        </p>
                                    </div>
                                </label>
                            </div>
                            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                                <div className="flex items-start gap-2">
                                    <AlertCircle size={18} className="text-blue-600 mt-0.5" />
                                    <div className="text-sm text-blue-700">
                                        <p className="font-medium">By accepting:</p>
                                        <ul className="list-disc list-inside mt-1 text-blue-600">
                                            <li>Your status will be updated to "Employed"</li>
                                            <li>You'll be added to the company's driver roster</li>
                                            <li>The employer will be notified of your decision</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100">
                    <button
                        onClick={onClose}
                        disabled={submitting}
                        className="px-6 py-2.5 border border-gray-200 rounded-lg text-gray-600 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onSubmit}
                        disabled={submitting || (!isAccept && !rejectionReason) || (isAccept && !dlConsentGiven)}
                        className={`px-6 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                            isAccept 
                                ? 'bg-green-500 hover:bg-green-600 text-white' 
                                : 'bg-red-500 hover:bg-red-600 text-white'
                        }`}
                    >
                        {submitting ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Processing...
                            </>
                        ) : (
                            <>
                                {isAccept ? <Check size={18} /> : <X size={18} />}
                                {isAccept ? 'Accept Offer' : 'Reject Offer'}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default JobsPage;
