import React, { useState, useEffect } from 'react';
import { 
    Users, Building2, TrendingUp, ShieldCheck, 
    Clock, CheckCircle2, UserCheck, Loader2 
} from 'lucide-react';
import { adminService } from '../../services/adminService';
import toast from 'react-hot-toast';

const StatCard = ({ icon: Icon, label, value, sublabel, color }) => (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="flex items-center justify-between">
            <div>
                <p className="text-sm font-medium text-gray-500">{label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
                {sublabel && (
                    <p className="text-xs text-gray-500 mt-1">{sublabel}</p>
                )}
            </div>
            <div className={`p-3 rounded-lg ${color}`}>
                <Icon size={24} className="text-white" />
            </div>
        </div>
    </div>
);

const AdminDashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [pendingRequests, setPendingRequests] = useState([]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [statsData, requestsData] = await Promise.all([
                adminService.getStats(),
                adminService.getVerificationRequests({ limit: 5 })
            ]);
            setStats(statsData.stats);
            setPendingRequests(requestsData.requests);
        } catch (error) {
            console.error('Error fetching admin data:', error);
            toast.error('Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async (userId, action) => {
        try {
            await adminService.verifyBusiness(userId, action);
            toast.success(`Business ${action === 'approve' ? 'approved' : 'rejected'} successfully`);
            fetchData();
        } catch (error) {
            toast.error(error.message || 'Failed to process verification');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
                <p className="text-gray-500 mt-1">Overview of Mobitrak platform</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    icon={Users}
                    label="Total Users"
                    value={stats?.totalUsers || 0}
                    sublabel={`+${stats?.recentRegistrations || 0} this week`}
                    color="bg-blue-500"
                />
                <StatCard
                    icon={Building2}
                    label="Businesses"
                    value={stats?.totalBusinesses || 0}
                    sublabel={`${stats?.verifiedBusinesses || 0} verified`}
                    color="bg-purple-500"
                />
                <StatCard
                    icon={UserCheck}
                    label="Drivers"
                    value={stats?.totalDrivers || 0}
                    sublabel={`${stats?.driversWithCompleteProfile || 0} with complete profile`}
                    color="bg-green-500"
                />
                <StatCard
                    icon={Clock}
                    label="Pending Verifications"
                    value={stats?.pendingVerifications || 0}
                    sublabel="Awaiting review"
                    color="bg-amber-500"
                />
            </div>

            {/* Pending Verification Requests */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <ShieldCheck size={20} className="text-amber-500" />
                        Pending Verification Requests
                    </h2>
                </div>
                
                {pendingRequests.length === 0 ? (
                    <div className="p-6 text-center text-gray-500">
                        <CheckCircle2 size={48} className="mx-auto text-green-500 mb-3" />
                        <p>No pending verification requests</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-200">
                        {pendingRequests.map((request) => (
                            <div key={request._id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                                <div className="flex items-center gap-4">
                                    {request.profileImage ? (
                                        <img 
                                            src={request.profileImage} 
                                            alt={request.companyName} 
                                            className="w-12 h-12 rounded-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                                            <Building2 size={20} className="text-gray-400" />
                                        </div>
                                    )}
                                    <div>
                                        <p className="font-semibold text-gray-900">{request.companyName || 'Unnamed Business'}</p>
                                        <p className="text-sm text-gray-500">{request.email}</p>
                                        <p className="text-xs text-gray-400">
                                            Requested: {new Date(request.verificationRequestedAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleVerify(request._id, 'approve')}
                                        className="px-4 py-2 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                                    >
                                        Approve
                                    </button>
                                    <button
                                        onClick={() => handleVerify(request._id, 'reject')}
                                        className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                                    >
                                        Reject
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminDashboard;
