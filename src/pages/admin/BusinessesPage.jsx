import React, { useState, useEffect } from 'react';
import { 
    Building2, Search, Filter, ChevronDown, ChevronUp, 
    MapPin, Mail, Calendar, ShieldCheck, ShieldX, 
    Clock, Loader2, CheckCircle, XCircle, X, User,
    Car, FileText, Image, ExternalLink
} from 'lucide-react';
import { adminService } from '../../services/adminService';
import toast from 'react-hot-toast';

const VerificationBadge = ({ status, isVerified }) => {
    if (isVerified) {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                <CheckCircle size={12} />
                Verified
            </span>
        );
    }
    
    switch (status) {
        case 'pending':
            return (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                    <Clock size={12} />
                    Pending
                </span>
            );
        case 'rejected':
            return (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                    <XCircle size={12} />
                    Rejected
                </span>
            );
        default:
            return (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                    Not Requested
                </span>
            );
    }
};

const BusinessCard = ({ business, onVerify, expanded, onToggle }) => {
    const [vehicles, setVehicles] = useState([]);
    const [loadingVehicles, setLoadingVehicles] = useState(false);
    const [vehiclesLoaded, setVehiclesLoaded] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);

    useEffect(() => {
        if (expanded && !vehiclesLoaded) {
            fetchVehicles();
        }
    }, [expanded]);

    const fetchVehicles = async () => {
        try {
            setLoadingVehicles(true);
            const data = await adminService.getBusinessVehicles(business._id);
            setVehicles(data.vehicles || []);
            setVehiclesLoaded(true);
        } catch (error) {
            console.error('Error fetching vehicles:', error);
            // Silently fail - vehicles might not exist
        } finally {
            setLoadingVehicles(false);
        }
    };

    const ImageModal = ({ src, alt, onClose }) => (
        <div 
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div className="relative max-w-4xl max-h-[90vh]">
                <button 
                    onClick={onClose}
                    className="absolute -top-10 right-0 text-white hover:text-gray-300"
                >
                    <X size={24} />
                </button>
                <img 
                    src={src} 
                    alt={alt} 
                    className="max-w-full max-h-[85vh] object-contain rounded-lg"
                />
            </div>
        </div>
    );

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all duration-300">
            {/* Card Header - Always Visible */}
            <div 
                className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={onToggle}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {business.profileImage ? (
                            <img 
                                src={business.profileImage} 
                                alt={business.companyName} 
                                className="w-14 h-14 rounded-full object-cover border-2 border-gray-100"
                            />
                        ) : (
                            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-100 to-purple-50 flex items-center justify-center border-2 border-purple-100">
                                <Building2 size={24} className="text-purple-500" />
                            </div>
                        )}
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-gray-900">
                                    {business.companyName || 'Unnamed Business'}
                                </h3>
                                {business.isVerifiedBusiness && (
                                    <div className="text-blue-500" title="Mobitrak Verified Business">
                                        <ShieldCheck size={18} fill="currentColor" />
                                    </div>
                                )}
                            </div>
                            <p className="text-sm text-gray-500">{business.email}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <VerificationBadge 
                            status={business.verificationStatus} 
                            isVerified={business.isVerifiedBusiness} 
                        />
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        {/* Contact Info */}
                        <div className="space-y-3">
                            <h4 className="font-medium text-gray-900 text-sm">Contact Information</h4>
                            
                            {business.firstName && (
                                <div className="flex items-center gap-2 text-sm">
                                    <User size={14} className="text-gray-400" />
                                    <span className="text-gray-600">
                                        {business.firstName} {business.lastName}
                                    </span>
                                </div>
                            )}
                            
                            <div className="flex items-center gap-2 text-sm">
                                <Mail size={14} className="text-gray-400" />
                                <span className="text-gray-600">{business.email}</span>
                            </div>
                            
                            {business.officeLocation?.address && (
                                <div className="flex items-start gap-2 text-sm">
                                    <MapPin size={14} className="text-gray-400 mt-0.5" />
                                    <span className="text-gray-600">{business.officeLocation.address}</span>
                                </div>
                            )}
                            
                            <div className="flex items-center gap-2 text-sm">
                                <Calendar size={14} className="text-gray-400" />
                                <span className="text-gray-600">
                                    Joined: {new Date(business.createdAt).toLocaleDateString()}
                                </span>
                            </div>

                            {/* Business Profile Image */}
                            {business.profileImage && (
                                <div className="pt-2">
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Profile Image</p>
                                    <div 
                                        className="relative group cursor-pointer w-fit"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedImage({ src: business.profileImage, alt: 'Business Profile' });
                                        }}
                                    >
                                        <img 
                                            src={business.profileImage} 
                                            alt="Business Profile"
                                            className="w-32 h-32 object-cover rounded-lg border border-gray-200 group-hover:border-amber-400 transition-colors"
                                        />
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                                            <ExternalLink size={16} className="text-white" />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Verification Info */}
                        <div className="space-y-3">
                            <h4 className="font-medium text-gray-900 text-sm">Verification Status</h4>
                            
                            <div className="p-3 bg-gray-50 rounded-lg space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Status:</span>
                                    <VerificationBadge 
                                        status={business.verificationStatus} 
                                        isVerified={business.isVerifiedBusiness} 
                                    />
                                </div>
                                
                                {business.verificationRequestedAt && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Requested:</span>
                                        <span className="text-gray-700">
                                            {new Date(business.verificationRequestedAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                )}
                                
                                {business.verificationProcessedAt && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Processed:</span>
                                        <span className="text-gray-700">
                                            {new Date(business.verificationProcessedAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                )}
                                
                                {business.verificationNotes && (
                                    <div className="pt-2 border-t border-gray-200">
                                        <span className="text-gray-500 text-sm">Notes:</span>
                                        <p className="text-gray-700 text-sm mt-1">{business.verificationNotes}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    {business.verificationStatus === 'pending' && (
                        <div className="flex gap-3 mt-4 pt-4 border-t border-gray-100">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onVerify(business._id, 'approve');
                                }}
                                className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
                            >
                                <ShieldCheck size={18} />
                                Approve Verification
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onVerify(business._id, 'reject');
                                }}
                                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
                            >
                                <ShieldX size={18} />
                                Reject
                            </button>
                        </div>
                    )}

                    {/* Vehicles & Documents Section */}
                    <div className="mt-4 pt-4 border-t border-gray-100">
                        <h4 className="font-medium text-gray-900 text-sm mb-3 flex items-center gap-2">
                            <Car size={16} />
                            Vehicles & Documents ({vehicles.length})
                        </h4>
                        
                        {loadingVehicles ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                                <span className="ml-2 text-gray-500">Loading vehicles...</span>
                            </div>
                        ) : vehicles.length === 0 ? (
                            <div className="text-center py-6 bg-gray-50 rounded-lg">
                                <Car size={32} className="mx-auto text-gray-300 mb-2" />
                                <p className="text-gray-500 text-sm">No vehicles registered by this business</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {vehicles.map((vehicle) => (
                                    <div key={vehicle._id} className="bg-gray-50 rounded-lg p-4">
                                        <div className="flex items-start justify-between mb-3">
                                            <div>
                                                <h5 className="font-medium text-gray-900">
                                                    {vehicle.makersName || 'Unknown Make'} {vehicle.bodyType || ''}
                                                </h5>
                                                <p className="text-sm text-gray-500">
                                                    {vehicle.regnNo} • {vehicle.vehicleClass || 'Vehicle'}
                                                </p>
                                            </div>
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                vehicle.status === 'active' 
                                                    ? 'bg-green-100 text-green-700' 
                                                    : 'bg-green-100 text-green-700'
                                            }`}>
                                                Active
                                            </span>
                                        </div>

                                        {/* Vehicle Details Grid */}
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3 text-sm">
                                            {vehicle.ownerName && (
                                                <div>
                                                    <span className="text-gray-500">Owner:</span>
                                                    <p className="text-gray-700">{vehicle.ownerName}</p>
                                                </div>
                                            )}
                                            {vehicle.colour && (
                                                <div>
                                                    <span className="text-gray-500">Color:</span>
                                                    <p className="text-gray-700">{vehicle.colour}</p>
                                                </div>
                                            )}
                                            {vehicle.fuelUsed && (
                                                <div>
                                                    <span className="text-gray-500">Fuel:</span>
                                                    <p className="text-gray-700">{vehicle.fuelUsed}</p>
                                                </div>
                                            )}
                                            {vehicle.monthYearOfMfg && (
                                                <div>
                                                    <span className="text-gray-500">Mfg Year:</span>
                                                    <p className="text-gray-700">{vehicle.monthYearOfMfg}</p>
                                                </div>
                                            )}
                                            {vehicle.chassisNo && (
                                                <div>
                                                    <span className="text-gray-500">Chassis:</span>
                                                    <p className="text-gray-700 truncate" title={vehicle.chassisNo}>{vehicle.chassisNo}</p>
                                                </div>
                                            )}
                                            {vehicle.engineNo && (
                                                <div>
                                                    <span className="text-gray-500">Engine:</span>
                                                    <p className="text-gray-700 truncate" title={vehicle.engineNo}>{vehicle.engineNo}</p>
                                                </div>
                                            )}
                                            {vehicle.regnValidity && (
                                                <div>
                                                    <span className="text-gray-500">Reg. Valid:</span>
                                                    <p className="text-gray-700">{vehicle.regnValidity}</p>
                                                </div>
                                            )}
                                            {vehicle.seatingCapacity && (
                                                <div>
                                                    <span className="text-gray-500">Seats:</span>
                                                    <p className="text-gray-700">{vehicle.seatingCapacity}</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Document Images */}
                                        <div className="space-y-2">
                                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Documents & Images</p>
                                            <div className="flex flex-wrap gap-3">
                                                {/* RC Book Image */}
                                                {vehicle.rcBookImage && (
                                                    <div 
                                                        className="relative group cursor-pointer"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedImage({ src: vehicle.rcBookImage, alt: 'RC Book' });
                                                        }}
                                                    >
                                                        <img 
                                                            src={vehicle.rcBookImage} 
                                                            alt="RC Book"
                                                            className="w-24 h-24 object-cover rounded-lg border border-gray-200 group-hover:border-amber-400 transition-colors"
                                                        />
                                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                                                            <ExternalLink size={16} className="text-white" />
                                                        </div>
                                                        <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] py-0.5 text-center rounded-b-lg">
                                                            RC Book
                                                        </span>
                                                    </div>
                                                )}

                                                {/* Vehicle Images */}
                                                {vehicle.images && vehicle.images.length > 0 && (
                                                    vehicle.images.map((img, idx) => (
                                                        <div 
                                                            key={idx}
                                                            className="relative group cursor-pointer"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedImage({ src: img, alt: `Vehicle Image ${idx + 1}` });
                                                            }}
                                                        >
                                                            <img 
                                                                src={img} 
                                                                alt={`Vehicle ${idx + 1}`}
                                                                className="w-24 h-24 object-cover rounded-lg border border-gray-200 group-hover:border-amber-400 transition-colors"
                                                            />
                                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                                                                <ExternalLink size={16} className="text-white" />
                                                            </div>
                                                            <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] py-0.5 text-center rounded-b-lg">
                                                                Photo {idx + 1}
                                                            </span>
                                                        </div>
                                                    ))
                                                )}

                                                {/* No images placeholder */}
                                                {!vehicle.rcBookImage && (!vehicle.images || vehicle.images.length === 0) && (
                                                    <div className="text-sm text-gray-400 italic">
                                                        No documents uploaded
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Image Modal */}
                    {selectedImage && (
                        <ImageModal 
                            src={selectedImage.src} 
                            alt={selectedImage.alt} 
                            onClose={() => setSelectedImage(null)} 
                        />
                    )}}

                    {business.isVerifiedBusiness && (
                        <div className="flex gap-3 mt-4 pt-4 border-t border-gray-100">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onVerify(business._id, 'reject');
                                }}
                                className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors flex items-center gap-2"
                            >
                                <ShieldX size={18} />
                                Revoke Verification
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const BusinessesPage = () => {
    const [businesses, setBusinesses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all');
    const [expandedId, setExpandedId] = useState(null);
    const [stats, setStats] = useState({ total: 0, pending: 0, verified: 0 });
    const [pagination, setPagination] = useState({ page: 1, pages: 1 });

    useEffect(() => {
        fetchBusinesses();
    }, [search, filter]);

    const fetchBusinesses = async (page = 1) => {
        try {
            setLoading(true);
            const params = { page, limit: 20 };
            if (search) params.search = search;
            if (filter !== 'all') params.verificationStatus = filter;
            
            const data = await adminService.getBusinesses(params);
            setBusinesses(data.businesses);
            setStats(data.stats);
            setPagination(data.pagination);
        } catch (error) {
            console.error('Error fetching businesses:', error);
            toast.error('Failed to load businesses');
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async (userId, action) => {
        try {
            await adminService.verifyBusiness(userId, action);
            toast.success(`Business ${action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'updated'} successfully`);
            fetchBusinesses();
        } catch (error) {
            toast.error(error.message || 'Failed to process verification');
        }
    };

    const handleSearchChange = (e) => {
        setSearch(e.target.value);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Businesses</h1>
                    <p className="text-gray-500 mt-1">Manage fleet manager accounts and verifications</p>
                </div>
                
                {/* Stats Pills */}
                <div className="flex gap-3">
                    <div className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                        {stats.total} Total
                    </div>
                    <div className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">
                        {stats.pending} Pending
                    </div>
                    <div className="px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                        {stats.verified} Verified
                    </div>
                </div>
            </div>

            {/* Search and Filter */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search by company name, email..."
                        value={search}
                        onChange={handleSearchChange}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                </div>
                
                <div className="flex gap-2">
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white"
                    >
                        <option value="all">All Status</option>
                        <option value="none">Not Requested</option>
                        <option value="pending">Pending</option>
                        <option value="approved">Verified</option>
                        <option value="rejected">Rejected</option>
                    </select>
                </div>
            </div>

            {/* Business List */}
            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                </div>
            ) : businesses.length === 0 ? (
                <div className="bg-white rounded-xl p-12 text-center border border-gray-200">
                    <Building2 size={48} className="mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900">No businesses found</h3>
                    <p className="text-gray-500 mt-1">Try adjusting your search or filter criteria</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {businesses.map((business) => (
                        <BusinessCard
                            key={business._id}
                            business={business}
                            expanded={expandedId === business._id}
                            onToggle={() => setExpandedId(expandedId === business._id ? null : business._id)}
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
                            onClick={() => fetchBusinesses(page)}
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

export default BusinessesPage;
