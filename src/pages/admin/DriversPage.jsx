import React, { useState, useEffect } from 'react';
import { 
    User, Search, ChevronDown, ChevronUp, 
    MapPin, Mail, Calendar, FileText, Car,
    Loader2, CheckCircle, XCircle, Phone, IdCard
} from 'lucide-react';
import { adminService } from '../../services/adminService';
import toast from 'react-hot-toast';

const ProfileStatusBadge = ({ isComplete }) => {
    if (isComplete) {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                <CheckCircle size={12} />
                Complete
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
            <XCircle size={12} />
            Incomplete
        </span>
    );
};

const DriverCard = ({ driver, expanded, onToggle }) => {
    const [imageModal, setImageModal] = useState({ isOpen: false, src: '', alt: '' });

    const getFullName = () => {
        if (driver.firstName && driver.lastName) {
            return `${driver.firstName} ${driver.lastName}`;
        }
        if (driver.firstName) return driver.firstName;
        if (driver.dlDetails?.name) return driver.dlDetails.name;
        return 'Unnamed Driver';
    };

    return (
        <>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all duration-300">
                {/* Card Header - Always Visible */}
                <div 
                    className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={onToggle}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            {driver.profileImage ? (
                                <img 
                                    src={driver.profileImage} 
                                    alt={getFullName()} 
                                    className="w-14 h-14 rounded-full object-cover border-2 border-gray-100"
                                />
                            ) : (
                                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-green-100 to-green-50 flex items-center justify-center border-2 border-green-100">
                                    <User size={24} className="text-green-500" />
                                </div>
                            )}
                            <div>
                                <h3 className="font-semibold text-gray-900">{getFullName()}</h3>
                                <p className="text-sm text-gray-500">{driver.email}</p>
                                {driver.dlDetails?.licenseNumber && (
                                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                                        <IdCard size={12} />
                                        DL: {driver.dlDetails.licenseNumber}
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <ProfileStatusBadge isComplete={driver.isProfileComplete} />
                            {expanded ? (
                                <ChevronUp size={20} className="text-gray-400" />
                            ) : (
                                <ChevronDown size={20} className="text-gray-400" />
                            )}
                        </div>
                    </div>
                </div>

                {/* Expanded Details */}
                {expanded && (
                    <div className="px-4 pb-4 border-t border-gray-100">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                            {/* Personal Info */}
                            <div className="space-y-3">
                                <h4 className="font-medium text-gray-900 text-sm">Personal Information</h4>
                                
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-sm">
                                        <User size={14} className="text-gray-400" />
                                        <span className="text-gray-600">{getFullName()}</span>
                                    </div>
                                    
                                    <div className="flex items-center gap-2 text-sm">
                                        <Mail size={14} className="text-gray-400" />
                                        <span className="text-gray-600">{driver.email}</span>
                                    </div>
                                    
                                    {driver.officeLocation?.address && (
                                        <div className="flex items-start gap-2 text-sm">
                                            <MapPin size={14} className="text-gray-400 mt-0.5" />
                                            <span className="text-gray-600">{driver.officeLocation.address}</span>
                                        </div>
                                    )}
                                    
                                    <div className="flex items-center gap-2 text-sm">
                                        <Calendar size={14} className="text-gray-400" />
                                        <span className="text-gray-600">
                                            Joined: {new Date(driver.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* License Details */}
                            <div className="space-y-3">
                                <h4 className="font-medium text-gray-900 text-sm">Driving License</h4>
                                
                                {driver.dlDetails && Object.keys(driver.dlDetails).length > 0 ? (
                                    <div className="p-3 bg-gray-50 rounded-lg space-y-2 text-sm">
                                        {driver.dlDetails.licenseNumber && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">License No:</span>
                                                <span className="text-gray-900 font-medium">{driver.dlDetails.licenseNumber}</span>
                                            </div>
                                        )}
                                        {driver.dlDetails.name && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Name on DL:</span>
                                                <span className="text-gray-700">{driver.dlDetails.name}</span>
                                            </div>
                                        )}
                                        {driver.dlDetails.dob && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">DOB:</span>
                                                <span className="text-gray-700">{driver.dlDetails.dob}</span>
                                            </div>
                                        )}
                                        {driver.dlDetails.bloodGroup && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Blood Group:</span>
                                                <span className="text-gray-700">{driver.dlDetails.bloodGroup}</span>
                                            </div>
                                        )}
                                        {driver.dlDetails.vehicleClasses && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Vehicle Classes:</span>
                                                <span className="text-gray-700">{driver.dlDetails.vehicleClasses}</span>
                                            </div>
                                        )}
                                        {driver.dlDetails.validUpto && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Valid Until:</span>
                                                <span className="text-gray-700">{driver.dlDetails.validUpto}</span>
                                            </div>
                                        )}
                                        {driver.dlDetails.address && (
                                            <div className="pt-2 border-t border-gray-200">
                                                <span className="text-gray-500">Address:</span>
                                                <p className="text-gray-700 mt-1">{driver.dlDetails.address}</p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-500 text-center">
                                        No license details available
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* DL Images */}
                        {(driver.dlFrontImage || driver.dlBackImage) && (
                            <div className="mt-4 pt-4 border-t border-gray-100">
                                <h4 className="font-medium text-gray-900 text-sm mb-3">License Images</h4>
                                <div className="flex gap-4">
                                    {driver.dlFrontImage && (
                                        <div className="flex flex-col gap-1">
                                            <span className="text-xs text-gray-500">Front</span>
                                            <div 
                                                className="relative group w-40 h-28 bg-gray-100 rounded-lg border border-gray-200 overflow-hidden cursor-pointer"
                                                onClick={() => setImageModal({ isOpen: true, src: driver.dlFrontImage, alt: 'DL Front' })}
                                            >
                                                <img src={driver.dlFrontImage} alt="DL Front" className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white font-medium text-xs">
                                                    View Full
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {driver.dlBackImage && (
                                        <div className="flex flex-col gap-1">
                                            <span className="text-xs text-gray-500">Back</span>
                                            <div 
                                                className="relative group w-40 h-28 bg-gray-100 rounded-lg border border-gray-200 overflow-hidden cursor-pointer"
                                                onClick={() => setImageModal({ isOpen: true, src: driver.dlBackImage, alt: 'DL Back' })}
                                            >
                                                <img src={driver.dlBackImage} alt="DL Back" className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white font-medium text-xs">
                                                    View Full
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Employment Status */}
                        <div className="mt-4 pt-4 border-t border-gray-100">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="font-medium text-gray-900 text-sm">Employment</h4>
                                    <p className="text-sm text-gray-500 mt-1">
                                        {driver.companyName ? `Employed at ${driver.companyName}` : 'Currently unemployed'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Image Preview Modal */}
            {imageModal.isOpen && (
                <div 
                    className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" 
                    onClick={() => setImageModal({ ...imageModal, isOpen: false })}
                >
                    <button
                        className="absolute top-4 right-4 p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
                        onClick={() => setImageModal({ ...imageModal, isOpen: false })}
                    >
                        <XCircle size={24} className="text-white" />
                    </button>
                    <img
                        src={imageModal.src}
                        alt={imageModal.alt}
                        className="max-w-full max-h-[90vh] object-contain rounded-lg"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </>
    );
};

const DriversPage = () => {
    const [drivers, setDrivers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all');
    const [expandedId, setExpandedId] = useState(null);
    const [stats, setStats] = useState({ total: 0, profileComplete: 0, profileIncomplete: 0 });
    const [pagination, setPagination] = useState({ page: 1, pages: 1 });

    useEffect(() => {
        fetchDrivers();
    }, [search, filter]);

    const fetchDrivers = async (page = 1) => {
        try {
            setLoading(true);
            const params = { page, limit: 20 };
            if (search) params.search = search;
            if (filter !== 'all') params.profileComplete = filter;
            
            const data = await adminService.getDrivers(params);
            setDrivers(data.drivers);
            setStats(data.stats);
            setPagination(data.pagination);
        } catch (error) {
            console.error('Error fetching drivers:', error);
            toast.error('Failed to load drivers');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Drivers</h1>
                    <p className="text-gray-500 mt-1">View and manage driver accounts</p>
                </div>
                
                {/* Stats Pills */}
                <div className="flex gap-3">
                    <div className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                        {stats.total} Total
                    </div>
                    <div className="px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                        {stats.profileComplete} Complete
                    </div>
                    <div className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">
                        {stats.profileIncomplete} Incomplete
                    </div>
                </div>
            </div>

            {/* Search and Filter */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search by name, email, license number..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                </div>
                
                <div className="flex gap-2">
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white"
                    >
                        <option value="all">All Drivers</option>
                        <option value="true">Profile Complete</option>
                        <option value="false">Profile Incomplete</option>
                    </select>
                </div>
            </div>

            {/* Driver List */}
            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                </div>
            ) : drivers.length === 0 ? (
                <div className="bg-white rounded-xl p-12 text-center border border-gray-200">
                    <User size={48} className="mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900">No drivers found</h3>
                    <p className="text-gray-500 mt-1">Try adjusting your search or filter criteria</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {drivers.map((driver) => (
                        <DriverCard
                            key={driver._id}
                            driver={driver}
                            expanded={expandedId === driver._id}
                            onToggle={() => setExpandedId(expandedId === driver._id ? null : driver._id)}
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
                            onClick={() => fetchDrivers(page)}
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

export default DriversPage;
