import React, { useState, useEffect } from 'react';
import { 
    ShieldCheck, ShieldX, Building2, Mail, Calendar, 
    MapPin, Loader2, CheckCircle, Clock, Search, User
} from 'lucide-react';
import { adminService } from '../../services/adminService';
import toast from 'react-hot-toast';

const VerificationRequestCard = ({ request, onVerify }) => {
    const [processing, setProcessing] = useState(false);
    const [notes, setNotes] = useState('');
    const [showNotes, setShowNotes] = useState(false);

    const handleAction = async (action) => {
        setProcessing(true);
        try {
            await onVerify(request._id, action, notes);
            setNotes('');
            setShowNotes(false);
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                        {request.profileImage ? (
                            <img 
                                src={request.profileImage} 
                                alt={request.companyName} 
                                className="w-16 h-16 rounded-full object-cover border-2 border-gray-100"
                            />
                        ) : (
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-100 to-purple-50 flex items-center justify-center border-2 border-purple-100">
                                <Building2 size={28} className="text-purple-500" />
                            </div>
                        )}
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                                {request.companyName || 'Unnamed Business'}
                            </h3>
                            <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                                <Mail size={14} />
                                {request.email}
                            </div>
                            {request.firstName && (
                                <div className="flex items-center gap-2 text-sm text-gray-500 mt-0.5">
                                    <User size={14} />
                                    {request.firstName} {request.lastName}
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <div className="text-right">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">
                            <Clock size={14} />
                            Pending Review
                        </span>
                        <p className="text-xs text-gray-400 mt-2">
                            Requested: {new Date(request.verificationRequestedAt).toLocaleDateString()}
                        </p>
                    </div>
                </div>

                {/* Business Details */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Business Details</h4>
                            <div className="space-y-2 text-sm">
                                <div className="flex items-center gap-2">
                                    <Calendar size={14} className="text-gray-400" />
                                    <span className="text-gray-600">
                                        Member since: {new Date(request.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                                {request.officeLocation?.address && (
                                    <div className="flex items-start gap-2">
                                        <MapPin size={14} className="text-gray-400 mt-0.5" />
                                        <span className="text-gray-600">{request.officeLocation.address}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Account Status</h4>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Email Verified:</span>
                                    <span className={request.isVerified ? 'text-green-600' : 'text-red-600'}>
                                        {request.isVerified ? 'Yes' : 'No'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Profile Complete:</span>
                                    <span className={request.isProfileComplete ? 'text-green-600' : 'text-amber-600'}>
                                        {request.isProfileComplete ? 'Yes' : 'Partial'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Notes Input */}
                {showNotes && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Add Notes (optional)
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Add any notes about this verification decision..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                            rows={2}
                        />
                    </div>
                )}

                {/* Action Buttons */}
                <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col sm:flex-row gap-3">
                    <button
                        onClick={() => handleAction('approve')}
                        disabled={processing}
                        className="flex-1 px-4 py-2.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
                    >
                        {processing ? (
                            <Loader2 size={18} className="animate-spin" />
                        ) : (
                            <>
                                <ShieldCheck size={18} />
                                Approve & Grant Badge
                            </>
                        )}
                    </button>
                    <button
                        onClick={() => showNotes ? handleAction('reject') : setShowNotes(true)}
                        disabled={processing}
                        className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
                    >
                        {processing ? (
                            <Loader2 size={18} className="animate-spin" />
                        ) : (
                            <>
                                <ShieldX size={18} />
                                {showNotes ? 'Confirm Rejection' : 'Reject'}
                            </>
                        )}
                    </button>
                    {showNotes && (
                        <button
                            onClick={() => {
                                setShowNotes(false);
                                setNotes('');
                            }}
                            className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                        >
                            Cancel
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

const VerificationsPage = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async (page = 1) => {
        try {
            setLoading(true);
            const data = await adminService.getVerificationRequests({ page, limit: 10 });
            setRequests(data.requests);
            setPagination(data.pagination);
        } catch (error) {
            console.error('Error fetching requests:', error);
            toast.error('Failed to load verification requests');
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async (userId, action, notes) => {
        try {
            await adminService.verifyBusiness(userId, action, notes);
            toast.success(`Business ${action === 'approve' ? 'verified' : 'rejected'} successfully`);
            fetchRequests(pagination.page);
        } catch (error) {
            toast.error(error.message || 'Failed to process verification');
            throw error;
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Verification Requests</h1>
                    <p className="text-gray-500 mt-1">Review and process business verification requests</p>
                </div>
                
                <div className="flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-700 rounded-lg">
                    <Clock size={18} />
                    <span className="font-medium">{pagination.total} Pending</span>
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                </div>
            ) : requests.length === 0 ? (
                <div className="bg-white rounded-xl p-12 text-center border border-gray-200">
                    <CheckCircle size={64} className="mx-auto text-green-500 mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900">All Caught Up!</h3>
                    <p className="text-gray-500 mt-2">
                        There are no pending verification requests at the moment.
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {requests.map((request) => (
                        <VerificationRequestCard
                            key={request._id}
                            request={request}
                            onVerify={handleVerify}
                        />
                    ))}
                </div>
            )}

            {/* Pagination */}
            {pagination.pages > 1 && (
                <div className="flex justify-center gap-2">
                    {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((page) => (
                        <button
                            key={page}
                            onClick={() => fetchRequests(page)}
                            className={`px-4 py-2 rounded-lg transition-colors ${
                                pagination.page === page
                                    ? 'bg-amber-500 text-white'
                                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                        >
                            {page}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default VerificationsPage;
