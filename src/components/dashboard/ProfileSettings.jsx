import React, { useState, useEffect, lazy, Suspense } from 'react';
import { User, Building2, Mail, MapPin, Upload, Loader2, Camera, Edit2, X, FileText, ShieldCheck, Clock, CheckCircle, XCircle } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { authService } from '../../services/authService';
import VerifiedBadge, { VerificationStatusBadge } from '../common/VerifiedBadge';

const LocationPicker = lazy(() => import('./LocationPicker'));

const ProfileSettings = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [gettingLocation, setGettingLocation] = useState(false);
    const [showLocationModal, setShowLocationModal] = useState(false);
    const [tempLocation, setTempLocation] = useState(null);
    const [imageModal, setImageModal] = useState({ isOpen: false, src: '', alt: '' });
    const [requestingVerification, setRequestingVerification] = useState(false);

    const [profileData, setProfileData] = useState({
        firstName: '',
        lastName: '',
        companyName: '',
        email: '',
        profileImage: '',
        role: '',
        officeLocation: {
            type: 'Point',
            coordinates: [],
            address: ''
        },
        dlFrontImage: '',
        dlBackImage: '',
        dlDetails: {},
        isVerifiedBusiness: false,
        verificationStatus: 'none',
        verificationRequestedAt: null,
        verificationNotes: ''
    });

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const response = await api.get('/api/users/me');
            const user = response.data.user;
            console.log('Fetched user data:', user);

            setProfileData({
                firstName: user.firstName || '',
                lastName: user.lastName || '',
                companyName: user.companyName || '',
                email: user.email || '',
                role: user.role || '',
                profileImage: user.profileImage || '',
                officeLocation: user.officeLocation || { type: 'Point', coordinates: [], address: '' },
                dlFrontImage: user.dlFrontImage || '',
                dlBackImage: user.dlBackImage || '',
                dlDetails: user.dlDetails || {},
                isVerifiedBusiness: user.isVerifiedBusiness || false,
                verificationStatus: user.verificationStatus || 'none',
                verificationRequestedAt: user.verificationRequestedAt || null,
                verificationNotes: user.verificationNotes || ''
            });
            setLoading(false);
        } catch (err) {
            console.error('Error fetching profile:', err);
            toast.error('Failed to load profile');
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setProfileData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            toast.error('Please upload an image file');
            return;
        }

        setUploadingImage(true);

        try {
            const formData = new FormData();
            formData.append('profileImage', file);

            const response = await api.post(
                '/api/users/profile/image',
                formData,
                {
                    headers: { 'Content-Type': 'multipart/form-data' }
                }
            );

            setProfileData(prev => ({
                ...prev,
                profileImage: response.data.profileImage
            }));
            toast.success('Profile image updated successfully');

            // Dispatch event to update sidebar
            window.dispatchEvent(new Event('profileUpdated'));
        } catch (err) {
            console.error('Error uploading image:', err);
            toast.error(err.response?.data?.message || 'Failed to upload image');
        } finally {
            setUploadingImage(false);
        }
    };

    const handleOpenLocationModal = () => {
        setTempLocation(profileData.officeLocation);
        setShowLocationModal(true);
    };

    const handleLocationChange = (newLocation) => {
        console.log('handleLocationChange received:', newLocation);
        setTempLocation(newLocation);
    };

    const handleSaveLocation = () => {
        setProfileData(prev => ({
            ...prev,
            officeLocation: tempLocation
        }));
        setShowLocationModal(false);
    };

    const handleCancelLocation = () => {
        setTempLocation(null);
        setShowLocationModal(false);
    };

    const handleSave = async () => {
        setSaving(true);

        try {
            console.log('Saving profile with officeLocation:', profileData.officeLocation);

            const response = await api.put(
                '/api/users/profile',
                {
                    firstName: profileData.firstName,
                    lastName: profileData.lastName,
                    companyName: profileData.companyName,
                    officeLocation: profileData.officeLocation
                }
            );

            console.log('Save response:', response.data);
            toast.success('Profile updated successfully');
        } catch (err) {
            console.error('Error updating profile:', err);
            toast.error(err.response?.data?.message || 'Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    const handleRequestVerification = async () => {
        try {
            setRequestingVerification(true);
            const result = await authService.requestVerification();
            toast.success(result.message || 'Verification request submitted successfully');
            // Update local state
            setProfileData(prev => ({
                ...prev,
                verificationStatus: 'pending',
                verificationRequestedAt: new Date().toISOString()
            }));
        } catch (err) {
            console.error('Error requesting verification:', err);
            toast.error(err.message || 'Failed to submit verification request');
        } finally {
            setRequestingVerification(false);
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
        <div className="max-w-5xl mx-auto">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">

                <div className="p-6">
                    {/* Profile Image Section */}
                    <div className="mb-5 pb-5 border-b border-gray-200">
                        <h3 className="text-base font-semibold text-gray-900 mb-3">Profile Picture</h3>
                        <div className="flex items-center gap-4">
                            <div className="relative group">
                                {profileData.profileImage ? (
                                    <img
                                        src={profileData.profileImage}
                                        alt="Profile"
                                        className="w-20 h-20 rounded-full object-cover border-4 border-gray-100"
                                    />
                                ) : (
                                    <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center border-4 border-gray-200">
                                        <User size={32} className="text-gray-400" />
                                    </div>
                                )}

                                <label className="absolute bottom-0 right-0 p-1.5 bg-amber-500 rounded-full text-white cursor-pointer hover:bg-amber-600 transition-colors shadow-sm border-2 border-white">
                                    <Camera size={14} />
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                        className="hidden"
                                        disabled={uploadingImage}
                                    />
                                </label>

                                {uploadingImage && (
                                    <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                                        <Loader2 className="w-6 h-6 animate-spin text-white" />
                                    </div>
                                )}
                            </div>
                            <div className="flex flex-col justify-center">
                                <h4 className="text-sm font-medium text-gray-900">Profile Photo</h4>
                                <p className="text-xs text-gray-500 mt-0.5">JPG, PNG or GIF.</p>
                            </div>
                        </div>
                    </div>

                    {/* Personal Information */}
                    <div className="mb-5 pb-5 border-b border-gray-200">
                        <h3 className="text-base font-semibold text-gray-900 mb-3">Personal Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    First Name
                                </label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                    <input
                                        type="text"
                                        name="firstName"
                                        value={profileData.firstName}
                                        onChange={handleInputChange}
                                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                        placeholder="Enter first name"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Last Name
                                </label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                    <input
                                        type="text"
                                        name="lastName"
                                        value={profileData.lastName}
                                        onChange={handleInputChange}
                                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                        placeholder="Enter last name"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Business Verification Section - Fleet Managers Only */}
                    {profileData.role === 'fleetmanager' && (
                        <div className="mb-5 pb-5 border-b border-gray-200">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                                    <ShieldCheck size={18} className="text-blue-500" />
                                    Business Verification
                                </h3>
                                {profileData.isVerifiedBusiness && (
                                    <VerifiedBadge size="md" showText={true} />
                                )}
                            </div>

                            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                                {/* Verification Status Display */}
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-sm text-gray-600">Status:</span>
                                    <VerificationStatusBadge
                                        status={profileData.verificationStatus}
                                        isVerified={profileData.isVerifiedBusiness}
                                    />
                                </div>

                                {/* Show different content based on verification status */}
                                {profileData.isVerifiedBusiness ? (
                                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-blue-100 rounded-full">
                                                <CheckCircle size={24} className="text-blue-600" />
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-blue-900">Congratulations!</h4>
                                                <p className="text-sm text-blue-700">
                                                    Your business is Mobitrak verified. This badge is displayed on your profile.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ) : profileData.verificationStatus === 'pending' ? (
                                    <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-amber-100 rounded-full">
                                                <Clock size={24} className="text-amber-600" />
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-amber-900">Verification In Progress</h4>
                                                <p className="text-sm text-amber-700">
                                                    Your verification request is being reviewed by our team.
                                                    {profileData.verificationRequestedAt && (
                                                        <span className="block mt-1 text-xs">
                                                            Submitted: {new Date(profileData.verificationRequestedAt).toLocaleDateString()}
                                                        </span>
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ) : profileData.verificationStatus === 'rejected' ? (
                                    <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                                        <div className="flex items-start gap-3">
                                            <div className="p-2 bg-red-100 rounded-full">
                                                <XCircle size={24} className="text-red-600" />
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-semibold text-red-900">Verification Rejected</h4>
                                                <p className="text-sm text-red-700">
                                                    Your verification request was not approved.
                                                    {profileData.verificationNotes && (
                                                        <span className="block mt-1">Reason: {profileData.verificationNotes}</span>
                                                    )}
                                                </p>
                                                <button
                                                    onClick={handleRequestVerification}
                                                    disabled={requestingVerification}
                                                    className="mt-3 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                                                >
                                                    {requestingVerification ? (
                                                        <span className="flex items-center gap-2">
                                                            <Loader2 size={14} className="animate-spin" />
                                                            Requesting...
                                                        </span>
                                                    ) : (
                                                        'Request Again'
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <p className="text-sm text-gray-600 mb-4">
                                            Get your business verified to receive a Mobitrak Verified badge.
                                            This helps build trust with drivers and other businesses on the platform.
                                        </p>
                                        <div className="bg-white p-3 rounded-lg border border-gray-200 mb-4">
                                            <h4 className="font-medium text-gray-900 text-sm mb-2">Benefits of verification:</h4>
                                            <ul className="text-sm text-gray-600 space-y-1">
                                                <li className="flex items-center gap-2">
                                                    <CheckCircle size={14} className="text-green-500" />
                                                    Verification badge on your profile
                                                </li>
                                                <li className="flex items-center gap-2">
                                                    <CheckCircle size={14} className="text-green-500" />
                                                    Increased trust from drivers
                                                </li>
                                                <li className="flex items-center gap-2">
                                                    <CheckCircle size={14} className="text-green-500" />
                                                    Priority support from Mobitrak team
                                                </li>
                                            </ul>
                                        </div>
                                        <button
                                            onClick={handleRequestVerification}
                                            disabled={requestingVerification || !profileData.companyName}
                                            className="w-full px-4 py-2.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                        >
                                            {requestingVerification ? (
                                                <>
                                                    <Loader2 size={16} className="animate-spin" />
                                                    Submitting Request...
                                                </>
                                            ) : (
                                                <>
                                                    <ShieldCheck size={16} />
                                                    Request Verification
                                                </>
                                            )}
                                        </button>
                                        {!profileData.companyName && (
                                            <p className="text-xs text-amber-600 mt-2 text-center">
                                                Please add your company name before requesting verification.
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Driver Specific: RC Book & DL Preview */}
                    {profileData.role === 'driver' && (
                        <>
                            <div className="mb-5 pb-5 border-b border-gray-200">
                                <h3 className="text-base font-semibold text-gray-900 mb-3">Vehicle Documents</h3>

                                {/* DL Preview Section */}
                                <div>
                                    <h4 className="text-sm font-medium text-gray-800 mb-2">Driving License</h4>
                                    <div className="flex gap-4">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-xs text-gray-500">Front Side</span>
                                            {profileData.dlFrontImage ? (
                                                <div className="relative group w-48 h-32 bg-gray-100 rounded-lg border border-gray-200 overflow-hidden cursor-pointer" onClick={() => setImageModal({ isOpen: true, src: profileData.dlFrontImage, alt: 'DL Front' })}>
                                                    <img src={profileData.dlFrontImage} alt="DL Front" className="w-full h-full object-cover" />
                                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white font-medium text-sm">
                                                        View Full
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="w-48 h-32 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-xs">
                                                    Not Uploaded
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <span className="text-xs text-gray-500">Back Side</span>
                                            {profileData.dlBackImage ? (
                                                <div className="relative group w-48 h-32 bg-gray-100 rounded-lg border border-gray-200 overflow-hidden cursor-pointer" onClick={() => setImageModal({ isOpen: true, src: profileData.dlBackImage, alt: 'DL Back' })}>
                                                    <img src={profileData.dlBackImage} alt="DL Back" className="w-full h-full object-cover" />
                                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white font-medium text-sm">
                                                        View Full
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="w-48 h-32 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-xs">
                                                    Not Uploaded
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* DL Details Display */}
                                    {profileData.dlDetails && Object.keys(profileData.dlDetails).length > 0 && (
                                        <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                                            <h5 className="text-sm font-semibold text-gray-900 mb-3">License Details</h5>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                                {profileData.dlDetails.licenseNumber && (
                                                    <div>
                                                        <span className="text-gray-500">License Number:</span>
                                                        <p className="font-medium text-gray-900">{profileData.dlDetails.licenseNumber}</p>
                                                    </div>
                                                )}
                                                {profileData.dlDetails.name && (
                                                    <div>
                                                        <span className="text-gray-500">Name:</span>
                                                        <p className="font-medium text-gray-900">{profileData.dlDetails.name}</p>
                                                    </div>
                                                )}
                                                {profileData.dlDetails.fatherSpouseName && (
                                                    <div>
                                                        <span className="text-gray-500">Father/Spouse Name:</span>
                                                        <p className="font-medium text-gray-900">{profileData.dlDetails.fatherSpouseName}</p>
                                                    </div>
                                                )}
                                                {profileData.dlDetails.dob && (
                                                    <div>
                                                        <span className="text-gray-500">Date of Birth:</span>
                                                        <p className="font-medium text-gray-900">{profileData.dlDetails.dob}</p>
                                                    </div>
                                                )}
                                                {profileData.dlDetails.bloodGroup && (
                                                    <div>
                                                        <span className="text-gray-500">Blood Group:</span>
                                                        <p className="font-medium text-gray-900">{profileData.dlDetails.bloodGroup}</p>
                                                    </div>
                                                )}
                                                {profileData.dlDetails.issueDate && (
                                                    <div>
                                                        <span className="text-gray-500">Issue Date:</span>
                                                        <p className="font-medium text-gray-900">{profileData.dlDetails.issueDate}</p>
                                                    </div>
                                                )}
                                                {profileData.dlDetails.validUpto && (
                                                    <div>
                                                        <span className="text-gray-500">Valid Upto:</span>
                                                        <p className="font-medium text-gray-900">{profileData.dlDetails.validUpto}</p>
                                                    </div>
                                                )}
                                                {profileData.dlDetails.vehicleClasses && (
                                                    <div>
                                                        <span className="text-gray-500">Vehicle Classes:</span>
                                                        <p className="font-medium text-gray-900">{profileData.dlDetails.vehicleClasses}</p>
                                                    </div>
                                                )}
                                                {profileData.dlDetails.address && (
                                                    <div className="md:col-span-2">
                                                        <span className="text-gray-500">Permanent Address:</span>
                                                        <p className="font-medium text-gray-900">{profileData.dlDetails.address}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}

                    {/* Account Information */}
                    <div className="mb-5 pb-5 border-b border-gray-200">
                        <h3 className="text-base font-semibold text-gray-900 mb-3">Account Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    {profileData.role === 'driver' ? 'Employment Status' : 'Company Name'}
                                </label>
                                <div className="relative">
                                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                    <input
                                        type="text"
                                        name="companyName"
                                        value={profileData.role === 'driver'
                                            ? (profileData.companyName || 'Unemployed')
                                            : profileData.companyName
                                        }
                                        onChange={handleInputChange}
                                        disabled={profileData.role === 'driver'}
                                        className={`w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg ${profileData.role === 'driver'
                                                ? 'bg-gray-50 text-gray-500 cursor-not-allowed'
                                                : 'focus:ring-2 focus:ring-amber-500 focus:border-transparent'
                                            }`}
                                        placeholder={profileData.role === 'driver' ? '' : 'Enter company name'}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Email
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                    <input
                                        type="email"
                                        value={profileData.email}
                                        disabled
                                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Location Section - "Address" for Drivers, "Office Location" for others */}
                    <div className="mb-5">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-base font-semibold text-gray-900">
                                {profileData.role === 'driver' ? 'Address' : 'Office Location'}
                            </h3>
                            <button
                                onClick={handleOpenLocationModal}
                                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
                            >
                                <Edit2 size={14} />
                                Edit {profileData.role === 'driver' ? 'Address' : 'Location'}
                            </button>
                        </div>

                        {/* Display current address */}
                        {profileData.officeLocation?.address && (
                            <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                <div className="flex items-start gap-2">
                                    <MapPin size={16} className="text-gray-500 mt-0.5 flex-shrink-0" />
                                    <p className="text-sm text-gray-700">{profileData.officeLocation.address}</p>
                                </div>
                            </div>
                        )}

                        {/* Read-only map display */}
                        <Suspense fallback={
                            <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg border border-gray-200">
                                <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                            </div>
                        }>
                            <LocationPicker
                                value={profileData.officeLocation}
                                onChange={() => { }} // No-op for read-only
                                readOnly={true}
                            />
                        </Suspense>
                    </div>

                    {/* Save Button */}
                    <div className="flex justify-end pt-4 border-t border-gray-200">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-5 py-2 text-sm bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                        >
                            {saving ? (
                                <span className="flex items-center gap-2">
                                    <Loader2 size={16} className="animate-spin" />
                                    Saving...
                                </span>
                            ) : (
                                'Save Changes'
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Location Edit Modal */}
            {
                showLocationModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
                            {/* Modal Header */}
                            <div className="flex items-center justify-between p-6 border-b border-gray-200">
                                <h2 className="text-xl font-semibold text-gray-900">
                                    Edit {profileData.role === 'driver' ? 'Address' : 'Office Location'}
                                </h2>
                                <button
                                    onClick={handleCancelLocation}
                                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <X size={20} className="text-gray-500" />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
                                <Suspense fallback={
                                    <div className="flex items-center justify-center h-96">
                                        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                                    </div>
                                }>
                                    <LocationPicker
                                        value={tempLocation}
                                        onChange={handleLocationChange}
                                        readOnly={false}
                                    />
                                </Suspense>
                            </div>

                            {/* Modal Footer */}
                            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
                                <button
                                    onClick={handleCancelLocation}
                                    className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveLocation}
                                    className="px-4 py-2 text-sm bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
                                >
                                    Update {profileData.role === 'driver' ? 'Address' : 'Location'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Image Preview Modal */}
            {imageModal.isOpen && (
                <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setImageModal({ ...imageModal, isOpen: false })}>
                    <button
                        className="absolute top-4 right-4 p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
                        onClick={() => setImageModal({ ...imageModal, isOpen: false })}
                    >
                        <X size={24} className="text-white" />
                    </button>
                    <img
                        src={imageModal.src}
                        alt={imageModal.alt}
                        className="max-w-full max-h-[90vh] object-contain rounded-lg"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </div >
    );
};

export default ProfileSettings;
