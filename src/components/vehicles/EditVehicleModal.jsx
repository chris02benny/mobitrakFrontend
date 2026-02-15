import React, { useState, useEffect } from 'react';
import { vehicleService } from '../../services/vehicleService';
import ConfirmationModal from '../common/ConfirmationModal';
import { Upload, X, Check, Loader2, FileText, Eye, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

const EditVehicleModal = ({ vehicle, onCancel, onSuccess }) => {
    // Form fields state - initialize with existing vehicle data
    const [formData, setFormData] = useState({
        regnNo: '',
        registrationNumber: '',
        make: '',
        model: '',
        vehicleType: 'goods',
        dateOfRegn: '',
        chassisNo: '',
        engineNo: '',
        vehicleClass: '',
        ownerName: '',
        makersName: '',
        address: '',
        fuelUsed: '',
        colour: '',
        monthYearOfMfg: '',
        seatingCapacity: '',
        taxUpto: '',
        bodyType: '',
        dateOfEffect: '',
        description: '',
        status: 'IDLE'
    });

    const [rcBookFile, setRcBookFile] = useState(null);
    const [rcPreviewUrl, setRcPreviewUrl] = useState(null);
    const [rcBookImageUrl, setRcBookImageUrl] = useState(null);
    const [vehicleImages, setVehicleImages] = useState([]);
    const [vehiclePreviews, setVehiclePreviews] = useState([]);
    const [existingVehicleImages, setExistingVehicleImages] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [extracting, setExtracting] = useState(false);
    const [error, setError] = useState(null);
    const [showDisclaimer, setShowDisclaimer] = useState(false);
    const [showRcPreview, setShowRcPreview] = useState(false);
    const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);

    // Initialize form with vehicle data
    useEffect(() => {
        if (vehicle) {
            console.log('Vehicle data in edit modal:', vehicle);
            console.log('Vehicle images:', vehicle.vehicleImages);

            setFormData({
                regnNo: vehicle.regnNo || vehicle.extractedData?.regnNo || '',
                registrationNumber: vehicle.registrationNumber || vehicle.regnNo || '',
                make: vehicle.make || vehicle.makersName || '',
                model: vehicle.model || vehicle.vehicleClass || '',
                vehicleType: vehicle.vehicleType || 'goods',
                dateOfRegn: vehicle.dateOfRegn || '',
                chassisNo: vehicle.chassisNo || '',
                engineNo: vehicle.engineNo || '',
                vehicleClass: vehicle.vehicleClass || '',
                ownerName: vehicle.ownerName || '',
                makersName: vehicle.makersName || '',
                address: vehicle.address || '',
                fuelUsed: vehicle.fuelUsed || '',
                colour: vehicle.colour || '',
                monthYearOfMfg: vehicle.monthYearOfMfg || '',
                seatingCapacity: vehicle.seatingCapacity || '',
                taxUpto: vehicle.taxUpto || '',
                bodyType: vehicle.bodyType || '',
                dateOfEffect: vehicle.dateOfEffect || '',
                description: vehicle.description || '',
                status: vehicle.status || 'IDLE'
            });

            // Set existing RC book image
            if (vehicle.rcBookImage) {
                setRcBookImageUrl(vehicle.rcBookImage);
                setRcPreviewUrl(vehicle.rcBookImage);
            }

            // Set existing vehicle images
            if (vehicle.images && Array.isArray(vehicle.images)) {
                console.log('Setting existing vehicle images:', vehicle.images);
                setExistingVehicleImages(vehicle.images);
            }
        }
    }, [vehicle]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleRcFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setRcBookFile(file);
            setRcPreviewUrl(URL.createObjectURL(file));
            setError(null);
        }
    };

    const handleVehicleImagesChange = (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            setVehicleImages(prev => [...prev, ...files]);
            const newPreviews = files.map(file => URL.createObjectURL(file));
            setVehiclePreviews(prev => [...prev, ...newPreviews]);
        }
    };

    const removeVehicleImage = (index) => {
        setVehicleImages(prev => prev.filter((_, i) => i !== index));
        setVehiclePreviews(prev => prev.filter((_, i) => i !== index));
    };

    const removeExistingImage = (index) => {
        setExistingVehicleImages(prev => prev.filter((_, i) => i !== index));
    };

    const handleExtractRC = async () => {
        if (!rcBookFile) {
            setError('Please select an RC Book image to upload.');
            return;
        }

        setExtracting(true);
        setError(null);

        try {
            const result = await vehicleService.extractRC(rcBookFile);

            if (result.extractedData) {
                setFormData(prev => {
                    const updated = {
                        ...prev,
                        ...result.extractedData,
                        description: prev.description
                    };
                    return updated;
                });
            }

            setRcBookImageUrl(result.rcBookImage);
            setShowDisclaimer(true);

        } catch (err) {
            console.error('Extraction error:', err);
            setError(err.message || 'Failed to extract RC details.');
        } finally {
            setExtracting(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setShowSaveConfirmation(true);
    };

    const handleConfirmSave = async () => {
        setUploading(true);
        setError(null);

        const data = new FormData();

        // Append all form fields
        Object.keys(formData).forEach(key => {
            if (formData[key] !== null && formData[key] !== undefined && formData[key] !== '') {
                data.append(key, formData[key]);
            }
        });

        // Append RC book image URL if available
        if (rcBookImageUrl) {
            data.append('rcBookImage', rcBookImageUrl);
        }

        // Append new vehicle images
        vehicleImages.forEach(image => {
            data.append('vehicleImages', image);
        });

        // Append existing vehicle images that weren't removed
        data.append('existingVehicleImages', JSON.stringify(existingVehicleImages));

        try {
            const response = await vehicleService.updateVehicle(vehicle._id, data);
            setShowSaveConfirmation(false);
            toast.success('Vehicle updated successfully!');
            onSuccess(response.vehicle);
            // Auto-close modal after successful update
            setTimeout(() => {
                onCancel();
            }, 500);
        } catch (err) {
            setError(err.message || 'Failed to update vehicle.');
            toast.error(err.message || 'Failed to update vehicle');
            setShowSaveConfirmation(false);
        } finally {
            setUploading(false);
        }
    };

    return (
        <>
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={onCancel}>
                <div className="relative bg-white rounded-xl shadow-2xl max-w-4xl w-full my-8" onClick={(e) => e.stopPropagation()}>
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-amber-50 to-white">
                        <h2 className="text-xl font-bold text-gray-900">Edit Vehicle</h2>
                        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="p-6 max-h-[calc(90vh-120px)] overflow-y-auto">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* RC Upload Section */}
                            <div className="border border-amber-200 rounded-lg p-4 bg-amber-50/30">
                                <div className="flex items-center gap-2 mb-3">
                                    <FileText size={20} className="text-amber-600" />
                                    <span className="font-medium text-gray-900">Update RC Book (Optional)</span>
                                    {rcBookImageUrl && (
                                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full flex items-center gap-1">
                                            <Check size={12} />
                                            {rcBookFile ? 'New' : 'Current'}
                                        </span>
                                    )}
                                </div>

                                <div className="space-y-3">
                                    <label htmlFor="rc-upload-edit" className={`flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${rcPreviewUrl ? 'border-primary bg-white' : 'border-gray-300 bg-white hover:bg-gray-50'}`}>
                                        {rcPreviewUrl ? (
                                            <div className="w-full h-full relative p-2 group">
                                                <img src={rcPreviewUrl} alt="RC Preview" className="w-full h-full object-contain rounded-lg" />
                                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg text-white font-medium">
                                                    Change RC Book
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                <Upload size={24} className="text-gray-400 mb-2" />
                                                <p className="text-sm text-gray-500">Click to upload RC Book image</p>
                                                <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 10MB</p>
                                            </div>
                                        )}
                                        <input id="rc-upload-edit" type="file" className="hidden" accept="image/*" onChange={handleRcFileChange} />
                                    </label>

                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={handleExtractRC}
                                            className="flex-1 px-4 py-2.5 text-secondary bg-primary rounded-lg hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-sm transition-all flex items-center justify-center gap-2"
                                            disabled={!rcBookFile || extracting}
                                        >
                                            {extracting ? (
                                                <>
                                                    <Loader2 size={18} className="animate-spin" />
                                                    Extracting...
                                                </>
                                            ) : (
                                                'Extract & Update Fields'
                                            )}
                                        </button>
                                        {rcBookImageUrl && (
                                            <button
                                                type="button"
                                                onClick={() => setShowRcPreview(true)}
                                                className="px-4 py-2.5 text-primary border-2 border-primary rounded-lg hover:bg-amber-50 font-semibold transition-all flex items-center gap-2"
                                            >
                                                <Eye size={18} />
                                                Preview
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Accuracy Disclaimer */}
                            {showDisclaimer && (
                                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
                                    <AlertTriangle size={20} className="text-yellow-600 flex-shrink-0 mt-0.5" />
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-yellow-800">Please verify extracted data</p>
                                        <p className="text-xs text-yellow-700 mt-1">The auto-filled information may not be 100% accurate. Please review and correct all fields before saving.</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setShowDisclaimer(false)}
                                        className="text-yellow-600 hover:text-yellow-800"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            )}

                            {error && (
                                <div className="p-4 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100 flex items-center gap-2">
                                    <X size={16} />
                                    {error}
                                </div>
                            )}

                            {/* Vehicle Details Form */}
                            <div className="space-y-6">
                                <h3 className="font-semibold text-gray-900 border-b border-gray-200 pb-2">Vehicle Details</h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Regn No *</label>
                                        <input
                                            type="text"
                                            name="regnNo"
                                            value={formData.regnNo}
                                            onChange={handleInputChange}
                                            required
                                            className="w-full p-2 border border-gray-200 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Registration Number</label>
                                        <input
                                            type="text"
                                            name="registrationNumber"
                                            value={formData.registrationNumber}
                                            onChange={handleInputChange}
                                            className="w-full p-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Vehicle Type *</label>
                                        <select
                                            name="vehicleType"
                                            value={formData.vehicleType}
                                            onChange={handleInputChange}
                                            required
                                            className="w-full p-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        >
                                            <option value="goods">Commercial (Goods)</option>
                                            <option value="passenger">Passenger</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Make/Manufacturer</label>
                                        <input
                                            type="text"
                                            name="make"
                                            value={formData.make}
                                            onChange={handleInputChange}
                                            className="w-full p-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Model</label>
                                        <input
                                            type="text"
                                            name="model"
                                            value={formData.model}
                                            onChange={handleInputChange}
                                            className="w-full p-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Date of Regn</label>
                                        <input
                                            type="text"
                                            name="dateOfRegn"
                                            value={formData.dateOfRegn}
                                            onChange={handleInputChange}
                                            className="w-full p-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Chassis No *</label>
                                        <input
                                            type="text"
                                            name="chassisNo"
                                            value={formData.chassisNo}
                                            onChange={handleInputChange}
                                            required
                                            className="w-full p-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Engine No *</label>
                                        <input
                                            type="text"
                                            name="engineNo"
                                            value={formData.engineNo}
                                            onChange={handleInputChange}
                                            required
                                            className="w-full p-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Vehicle Class</label>
                                        <input
                                            type="text"
                                            name="vehicleClass"
                                            value={formData.vehicleClass}
                                            onChange={handleInputChange}
                                            className="w-full p-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        />
                                    </div>
                                </div>

                                {/* Owner Details */}
                                <div className="pt-4 border-t border-gray-200">
                                    <h4 className="font-medium text-gray-700 mb-3">Owner Information</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Owner Name *</label>
                                            <input
                                                type="text"
                                                name="ownerName"
                                                value={formData.ownerName}
                                                onChange={handleInputChange}
                                                required
                                                className="w-full p-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Maker's Name</label>
                                            <input
                                                type="text"
                                                name="makersName"
                                                value={formData.makersName}
                                                onChange={handleInputChange}
                                                className="w-full p-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Address</label>
                                            <textarea
                                                name="address"
                                                value={formData.address}
                                                onChange={handleInputChange}
                                                rows="2"
                                                className="w-full p-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                                            ></textarea>
                                        </div>
                                    </div>
                                </div>

                                {/* Additional Details */}
                                <div className="pt-4 border-t border-gray-200">
                                    <h4 className="font-medium text-gray-700 mb-3">Additional Details</h4>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Fuel Used *</label>
                                            <input
                                                type="text"
                                                name="fuelUsed"
                                                value={formData.fuelUsed}
                                                onChange={handleInputChange}
                                                required
                                                className="w-full p-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Colour</label>
                                            <input
                                                type="text"
                                                name="colour"
                                                value={formData.colour}
                                                onChange={handleInputChange}
                                                className="w-full p-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Mfg Date</label>
                                            <input
                                                type="text"
                                                name="monthYearOfMfg"
                                                value={formData.monthYearOfMfg}
                                                onChange={handleInputChange}
                                                className="w-full p-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Seating Cap</label>
                                            <input
                                                type="text"
                                                name="seatingCapacity"
                                                value={formData.seatingCapacity}
                                                onChange={handleInputChange}
                                                className="w-full p-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Tax Upto</label>
                                            <input
                                                type="text"
                                                name="taxUpto"
                                                value={formData.taxUpto}
                                                onChange={handleInputChange}
                                                className="w-full p-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Body Type</label>
                                            <input
                                                type="text"
                                                name="bodyType"
                                                value={formData.bodyType}
                                                onChange={handleInputChange}
                                                className="w-full p-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Date of Effect</label>
                                            <input
                                                type="text"
                                                name="dateOfEffect"
                                                value={formData.dateOfEffect}
                                                onChange={handleInputChange}
                                                className="w-full p-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                                    <textarea
                                        name="description"
                                        value={formData.description}
                                        onChange={handleInputChange}
                                        rows="3"
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                                        placeholder="Enter vehicle details, condition, or notes..."
                                    ></textarea>
                                </div>

                                {/* Vehicle Images */}
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="block text-sm font-medium text-gray-700">Vehicle Images</label>
                                        <span className="text-xs text-gray-500">
                                            {existingVehicleImages.length + vehicleImages.length} total
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {/* Existing Images */}
                                        {existingVehicleImages.map((src, index) => (
                                            <div key={`existing-${index}`} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 group">
                                                <img src={src} alt={`Existing ${index + 1}`} className="w-full h-full object-cover" />
                                                <button
                                                    type="button"
                                                    onClick={() => removeExistingImage(index)}
                                                    className="absolute top-1 right-1 bg-white/90 p-1 rounded-full text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ))}

                                        {/* New Images */}
                                        {vehiclePreviews.map((src, index) => (
                                            <div key={`new-${index}`} className="relative aspect-square rounded-lg overflow-hidden border-2 border-primary group">
                                                <img src={src} alt={`New ${index + 1}`} className="w-full h-full object-cover" />
                                                <span className="absolute top-1 left-1 bg-primary text-secondary text-xs px-2 py-0.5 rounded-full font-semibold">
                                                    New
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => removeVehicleImage(index)}
                                                    className="absolute top-1 right-1 bg-white/90 p-1 rounded-full text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ))}

                                        <label className="flex flex-col items-center justify-center aspect-square border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                                            <Upload size={20} className="text-gray-400 mb-1" />
                                            <span className="text-xs text-gray-500">Add Image</span>
                                            <input type="file" className="hidden" accept="image/*" multiple onChange={handleVehicleImagesChange} />
                                        </label>
                                    </div>
                                </div>

                                {/* Status Management */}
                                <div className="pt-4 border-t border-gray-200">
                                    <h4 className="font-medium text-gray-700 mb-3">Vehicle Status</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Current Status</label>
                                            <div className="flex items-center gap-2">
                                                <select
                                                    name="status"
                                                    value={formData.status}
                                                    onChange={(e) => {
                                                        const newStatus = e.target.value;
                                                        if (newStatus === 'MAINTENANCE' && vehicle.status === 'ASSIGNED') {
                                                            toast.error('Vehicle cannot be put under maintenance while assigned to an active trip');
                                                            return;
                                                        }
                                                        handleInputChange(e);
                                                    }}
                                                    className={`w-full p-2 border border-gray-200 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 ${formData.status === 'ASSIGNED' ? 'bg-amber-50 text-amber-700' :
                                                        formData.status === 'MAINTENANCE' ? 'bg-red-50 text-red-700' :
                                                            'bg-green-50 text-green-700'
                                                        }`}
                                                    disabled={formData.status === 'ASSIGNED'}
                                                >
                                                    <option value="IDLE">Active/Idle</option>
                                                    <option value="MAINTENANCE">Under Maintenance</option>
                                                    {formData.status === 'ASSIGNED' && <option value="ASSIGNED">Assigned to Trip</option>}
                                                </select>
                                                {formData.status === 'ASSIGNED' && (
                                                    <div className="text-xs text-amber-600 flex items-center gap-1">
                                                        <AlertTriangle size={12} />
                                                        Locked while assigned
                                                    </div>
                                                )}
                                            </div>
                                            <p className="text-[10px] text-gray-500 mt-1">
                                                Vehicles in maintenance cannot be assigned to new trips.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Form Actions */}
                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={onCancel}
                                    className="px-5 py-2.5 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium transition-colors"
                                    disabled={uploading}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2.5 text-secondary bg-primary rounded-lg hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-sm transition-all flex items-center gap-2"
                                    disabled={uploading || !formData.regnNo}
                                >
                                    {uploading ? (
                                        <>
                                            <Loader2 size={18} className="animate-spin" />
                                            Updating...
                                        </>
                                    ) : (
                                        'Update Vehicle'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            {/* RC Preview Modal */}
            {
                showRcPreview && rcBookImageUrl && (
                    <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4" onClick={() => setShowRcPreview(false)}>
                        <div className="relative max-w-4xl w-full max-h-[90vh] bg-white rounded-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-between p-4 border-b border-gray-200">
                                <h3 className="font-semibold text-gray-900">RC Book Preview</h3>
                                <button
                                    onClick={() => setShowRcPreview(false)}
                                    className="text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <X size={24} />
                                </button>
                            </div>
                            <div className="p-4 overflow-auto max-h-[calc(90vh-80px)]">
                                <img
                                    src={rcBookImageUrl}
                                    alt="RC Book"
                                    className="w-full h-auto"
                                />
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Save Confirmation Modal */}
            <ConfirmationModal
                isOpen={showSaveConfirmation}
                onClose={() => setShowSaveConfirmation(false)}
                onConfirm={handleConfirmSave}
                title="Save Changes?"
                message={`Are you sure you want to save the changes to ${formData.regnNo || 'this vehicle'}?`}
                type="warning"
                confirmText="Save Changes"
                loading={uploading}
            />
        </>
    );
};

export default EditVehicleModal;
