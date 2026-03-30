import React, { useState, useEffect } from 'react';
import { CalendarDays, CheckCircle, XCircle, Search, Filter, FileText, User, Eye, X, MessageSquare } from 'lucide-react';
import { leaveService } from '../../services/leaveService';
import toast from 'react-hot-toast';

const FleetLeavesPage = () => {
    const [leaves, setLeaves] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('PENDING'); // PENDING or ALL
    const [searchTerm, setSearchTerm] = useState('');
    
    // Modals
    const [showActionModal, setShowActionModal] = useState(false);
    const [showDocModal, setShowDocModal] = useState(false);
    const [selectedLeave, setSelectedLeave] = useState(null);
    const [actionType, setActionType] = useState(''); // 'APPROVED' or 'REJECTED'
    const [managerNote, setManagerNote] = useState('');
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        fetchLeaves();
    }, [activeTab]);

    const fetchLeaves = async () => {
        try {
            setLoading(true);
            const statusFilter = activeTab === 'PENDING' ? 'PENDING' : '';
            const data = await leaveService.getCompanyLeaves(statusFilter);
            setLeaves(data);
        } catch (error) {
            console.error('Error fetching leaves:', error);
            toast.error(error.message || 'Failed to fetch leave requests');
        } finally {
            setLoading(false);
        }
    };

    const handleActionClick = (leave, type) => {
        setSelectedLeave(leave);
        setActionType(type);
        setManagerNote('');
        setShowActionModal(true);
    };

    const handleViewDocument = (leave) => {
        setSelectedLeave(leave);
        setShowDocModal(true);
    };

    const submitAction = async () => {
        if (actionType === 'REJECTED' && !managerNote.trim()) {
            toast.error('Please provide a reason for rejection');
            return;
        }

        try {
            setProcessing(true);
            await leaveService.updateLeaveStatus(selectedLeave._id, actionType, managerNote);
            toast.success(`Leave request ${actionType.toLowerCase()} successfully`);
            setShowActionModal(false);
            fetchLeaves(); // Refresh the list
        } catch (error) {
            console.error('Error updating leave status:', error);
            toast.error(error.message || 'Failed to update leave status');
        } finally {
            setProcessing(false);
        }
    };

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric'
        });
    };

    const calculateDays = (start, end) => {
        const startDate = new Date(start);
        const endDate = new Date(end);
        const diffTime = Math.abs(endDate - startDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // inclusive
        return diffDays;
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'PENDING': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            case 'APPROVED': return 'bg-green-100 text-green-700 border-green-200';
            case 'REJECTED': return 'bg-red-100 text-red-700 border-red-200';
            case 'CANCELLED': return 'bg-gray-100 text-gray-700 border-gray-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    // Filter leaves based on search term (Driver name)
    const filteredLeaves = leaves.filter(leave => {
        if (!searchTerm) return true;
        const driverName = `${leave.driverId?.userDetails?.firstName || ''} ${leave.driverId?.userDetails?.lastName || ''}`.toLowerCase();
        return driverName.includes(searchTerm.toLowerCase());
    });

    return (
        <div className="flex flex-col gap-6">
            {/* Header / Tabs */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="bg-white border border-gray-200 rounded-xl p-1 flex gap-1 w-full max-w-sm shrink-0">
                    <button
                        onClick={() => setActiveTab('PENDING')}
                        className={`flex-1 flex justify-center py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                            activeTab === 'PENDING'
                                ? 'bg-amber-500 text-white shadow-sm'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                        }`}
                    >
                        Pending Requests
                    </button>
                    <button
                        onClick={() => setActiveTab('ALL')}
                        className={`flex-1 flex justify-center py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                            activeTab === 'ALL'
                                ? 'bg-amber-500 text-white shadow-sm'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                        }`}
                    >
                        All Leaves
                    </button>
                </div>
                
                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search by driver name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                </div>
            </div>

            {/* Content area */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {loading ? (
                    <div className="flex flex-col items-center justify-center p-12">
                        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                        <p className="mt-4 text-gray-500">Loading leave requests...</p>
                    </div>
                ) : filteredLeaves.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 text-center">
                        <CalendarDays size={48} className="text-gray-300 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900">No leaves found</h3>
                        <p className="text-gray-500 mt-1 max-w-sm">
                            {activeTab === 'PENDING' 
                                ? "You're all caught up! There are no pending leave requests to review." 
                                : "No leave history found matching your criteria."}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-500">
                                <tr>
                                    <th className="px-6 py-4">Driver</th>
                                    <th className="px-6 py-4">Duration</th>
                                    <th className="px-6 py-4">Leave Type</th>
                                    <th className="px-6 py-4">Reason</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredLeaves.map((leave) => {
                                    const driverName = `${leave.driverId?.userDetails?.firstName || 'Unknown'} ${leave.driverId?.userDetails?.lastName || ''}`;
                                    const profilePic = leave.driverId?.userDetails?.profileImage;
                                    const totalDays = calculateDays(leave.startDate, leave.endDate);

                                    return (
                                        <tr key={leave._id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    {profilePic ? (
                                                        <img src={profilePic} alt={driverName} className="w-10 h-10 rounded-full object-cover border border-gray-200 shrink-0" />
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0 border border-gray-200">
                                                            <User size={18} className="text-gray-400" />
                                                        </div>
                                                    )}
                                                    <div>
                                                        <p className="font-semibold text-gray-900">{driverName}</p>
                                                        <p className="text-xs text-gray-500">Applied: {formatDate(leave.createdAt)}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-gray-900 whitespace-nowrap">
                                                        {formatDate(leave.startDate)} - {formatDate(leave.endDate)}
                                                    </span>
                                                    <span className="text-xs text-gray-500">
                                                        {totalDays} {totalDays === 1 ? 'day' : 'days'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <span className={`px-2 py-1 text-xs font-semibold rounded-md border ${
                                                        leave.type === 'SICK' ? 'bg-red-50 text-red-700 border-red-100' : 'bg-blue-50 text-blue-700 border-blue-100'
                                                    }`}>
                                                        {leave.type}
                                                    </span>
                                                    {leave.type === 'SICK' && leave.documentUrl && (
                                                        <button 
                                                            onClick={() => handleViewDocument(leave)}
                                                            className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 flex items-center justify-center rounded transition-colors tooltip-trigger"
                                                            title="View Medical Certificate"
                                                        >
                                                            <FileText size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-sm text-gray-700 line-clamp-2 max-w-xs" title={leave.reason}>
                                                    {leave.reason}
                                                </p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(leave.status)}`}>
                                                    {leave.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {leave.status === 'PENDING' ? (
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => handleActionClick(leave, 'APPROVED')}
                                                            className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors tooltip-trigger"
                                                            title="Approve Leave"
                                                        >
                                                            <CheckCircle size={20} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleActionClick(leave, 'REJECTED')}
                                                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors tooltip-trigger"
                                                            title="Reject Leave"
                                                        >
                                                            <XCircle size={20} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-end text-sm text-gray-500 gap-1" title={leave.managerNote}>
                                                        {leave.managerNote && <MessageSquare size={14} className="text-gray-400" />}
                                                        <span className="truncate max-w-[100px]">{leave.managerNote || 'No notes'}</span>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Approval/Rejection Modal */}
            {showActionModal && selectedLeave && (
                <div className="fixed inset-0 bg-black/50 flex flex-col items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl w-full max-w-md overflow-hidden shadow-2xl">
                        <div className={`p-4 flex items-center justify-between border-b ${
                            actionType === 'APPROVED' ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'
                        }`}>
                            <h2 className={`text-lg font-bold flex items-center gap-2 ${
                                actionType === 'APPROVED' ? 'text-green-800' : 'text-red-800'
                            }`}>
                                {actionType === 'APPROVED' ? <CheckCircle size={20} /> : <XCircle size={20} />}
                                {actionType === 'APPROVED' ? 'Approve Leave Request' : 'Reject Leave Request'}
                            </h2>
                            <button onClick={() => setShowActionModal(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-black/5">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="p-6 space-y-4">
                            <div className="p-4 bg-gray-50 border border-gray-100 rounded-lg mb-4">
                                <p className="text-sm text-gray-600 mb-1">
                                    <span className="font-semibold text-gray-800">Driver:</span> {selectedLeave.driverId?.userDetails?.firstName} {selectedLeave.driverId?.userDetails?.lastName}
                                </p>
                                <p className="text-sm text-gray-600 mb-1">
                                    <span className="font-semibold text-gray-800">Dates:</span> {formatDate(selectedLeave.startDate)} to {formatDate(selectedLeave.endDate)}
                                </p>
                                <p className="text-sm text-gray-600">
                                    <span className="font-semibold text-gray-800">Reason:</span> {selectedLeave.reason}
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Manager Notes {actionType === 'APPROVED' ? '(Optional)' : <span className="text-red-500">*</span>}
                                </label>
                                <textarea
                                    value={managerNote}
                                    onChange={(e) => setManagerNote(e.target.value)}
                                    placeholder={actionType === 'APPROVED' ? "Add any remarks for the driver..." : "Explain why the leave is rejected..."}
                                    rows="3"
                                    className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 ${
                                        actionType === 'APPROVED' ? 'focus:ring-green-500 focus:border-transparent border-gray-300' 
                                        : 'focus:ring-red-500 focus:border-transparent border-gray-300'
                                    }`}
                                />
                                {actionType === 'REJECTED' && (
                                    <p className="mt-1 text-xs text-gray-500">A reason is required when rejecting leaves.</p>
                                )}
                            </div>
                        </div>

                        <div className="p-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
                            <button
                                onClick={() => setShowActionModal(false)}
                                className="px-4 py-2 border border-gray-200 text-gray-700 bg-white rounded-lg font-medium hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={submitAction}
                                disabled={processing}
                                className={`px-4 py-2 text-white rounded-lg font-medium transition-colors flex items-center gap-2 ${
                                    actionType === 'APPROVED' 
                                        ? 'bg-green-600 hover:bg-green-700 disabled:bg-green-400' 
                                        : 'bg-red-600 hover:bg-red-700 disabled:bg-red-400'
                                }`}
                            >
                                {processing ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    actionType === 'APPROVED' ? 'Confirm Approval' : 'Confirm Rejection'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Document Viewer Modal */}
            {showDocModal && selectedLeave && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4 backdrop-blur-sm" onClick={() => setShowDocModal(false)}>
                    <div className="bg-white rounded-xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between shadow-sm z-10">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                    <FileText size={20} className="text-blue-600" />
                                    Medical Document
                                </h2>
                                <p className="text-sm text-gray-500">
                                    {selectedLeave.driverId?.userDetails?.firstName} {selectedLeave.driverId?.userDetails?.lastName}
                                </p>
                            </div>
                            <button 
                                onClick={() => setShowDocModal(false)}
                                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="bg-gray-100 flex-1 overflow-auto p-4 flex items-center justify-center min-h-[400px]">
                            {/* Assuming Cloudinary URL - usually an image but could be a PDF. Handling images for now as per usual */}
                            <img 
                                src={selectedLeave.documentUrl} 
                                alt="Medical Certificate" 
                                className="max-w-full h-auto max-h-full rounded-lg shadow-md border border-gray-200 object-contain"
                                onError={(e) => {
                                    e.target.onerror = null; 
                                    e.target.outerHTML = '<div class="text-center p-8 bg-white rounded-xl border border-gray-200"><p class="text-red-500 font-medium">Unable to preview document directly.</p><a href="' + selectedLeave.documentUrl + '" target="_blank" rel="noopener noreferrer" class="text-blue-600 underline text-sm mt-2 inline-block">Download / View in New Tab</a></div>';
                                }}
                            />
                        </div>
                        <div className="p-4 border-t border-gray-100 bg-white flex justify-end">
                            <a 
                                href={selectedLeave.documentUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="px-4 py-2 bg-blue-50 text-blue-700 font-medium rounded-lg hover:bg-blue-100 transition-colors"
                            >
                                Open Original
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FleetLeavesPage;
