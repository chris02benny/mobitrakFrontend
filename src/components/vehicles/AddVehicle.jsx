import React, { useState } from 'react';
import { vehicleService } from '../../services/vehicleService';
import { Upload, X, Check, Loader2, ArrowLeft, FileText, Eye, AlertTriangle } from 'lucide-react';

const AddVehicle = ({ onCancel, onSuccess }) => {
    // Form fields state
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
        description: ''
    });

    const [rcBookFile, setRcBookFile] = useState(null);
    const [rcPreviewUrl, setRcPreviewUrl] = useState(null);
    const [rcBookImageUrl, setRcBookImageUrl] = useState(null); // URL from backend after upload
    const [vehicleImages, setVehicleImages] = useState([]);
    const [vehiclePreviews, setVehiclePreviews] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [extracting, setExtracting] = useState(false);
    const [error, setError] = useState(null);
    const [showDisclaimer, setShowDisclaimer] = useState(false);
    const [showRcPreview, setShowRcPreview] = useState(false);

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

    const handleExtractRC = async () => {
        if (!rcBookFile) {
            setError('Please select an RC Book image to upload.');
            return;
        }

        setExtracting(true);
        setError(null);

        try {
            const result = await vehicleService.extractRC(rcBookFile);
            console.log('Extraction result:', result);

            // Update form fields with extracted data
            if (result.extractedData) {
                console.log('Extracted data:', result.extractedData);
                setFormData(prev => {
                    const updated = {
                        ...prev,
                        ...result.extractedData,
                        description: prev.description // Preserve user's description
                    };
                    console.log('Updated form data:', updated);
                    return updated;
                });
            } else {
                console.warn('No extractedData in result');
            }

            // Store the RC book image URL
            setRcBookImageUrl(result.rcBookImage);

            // Show disclaimer after successful extraction
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
        setUploading(true);
        setError(null);

        const data = new FormData();

        // Append all form fields
        Object.keys(formData).forEach(key => {
            if (formData[key]) {
                data.append(key, formData[key]);
            }
        });

        // Append RC book image URL if available from extraction
        if (rcBookImageUrl) {
            data.append('rcBookImage', rcBookImageUrl);
        }

        // Append vehicle images
        vehicleImages.forEach(image => {
            data.append('vehicleImages', image);
        });

        try {
            const response = await vehicleService.createVehicle(data);
            onSuccess(response.vehicle);
        } catch (err) {
            setError(err.message || 'Failed to save vehicle.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 max-w-4xl mx-auto">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 transition-colors">
                            <ArrowLeft size={20} />
                        </button>
                        <h2 className="text-xl font-bold text-gray-900">Add New Vehicle</h2>
                    </div>
                    <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* RC Upload Section - Always Visible */}
                        <div className="border border-amber-200 rounded-lg p-4 bg-amber-50/30">
                            <div className="flex items-center gap-2 mb-3">
                                <FileText size={20} className="text-amber-600" />
                                <span className="font-medium text-gray-900">Upload RC Book to Auto-fill</span>
                                {rcBookImageUrl && (
                                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full flex items-center gap-1">
                                        <Check size={12} />
                                        Extracted
                                    </span>
                                )}
                            </div>

                            <div className="space-y-3">
                                <label htmlFor="rc-upload" className={`flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${rcPreviewUrl ? 'border-primary bg-white' : 'border-gray-300 bg-white hover:bg-gray-50'}`}>
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
                                    <input id="rc-upload" type="file" className="hidden" accept="image/*" onChange={handleRcFileChange} />
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
                                            'Extract & Auto-fill'
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
                                {/* Registration Details */}
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Regn No *</label>
                                    <input
                                        type="text"
                                        name="regnNo"
                                        value={formData.regnNo}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full p-2 border border-gray-200 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        placeholder="e.g., KL 01 AB 1234"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Registration Number (Alternative)</label>
                                    <input
                                        type="text"
                                        name="registrationNumber"
                                        value={formData.registrationNumber}
                                        onChange={handleInputChange}
                                        className="w-full p-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        placeholder="e.g., KL 01 AB 1234"
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
                                        placeholder="e.g., Tata, Mahindra"
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
                                        placeholder="e.g., LPT 1109, Bolero"
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
                                        placeholder="DD/MM/YYYY"
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
                                    <span className="text-xs text-gray-500">{vehicleImages.length} selected</span>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {vehiclePreviews.map((src, index) => (
                                        <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 group">
                                            <img src={src} alt={`Vehicle ${index + 1}`} className="w-full h-full object-cover" />
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
                                        Saving...
                                    </>
                                ) : (
                                    'Save Vehicle'
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* RC Preview Modal */}
            {showRcPreview && rcBookImageUrl && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setShowRcPreview(false)}>
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
            )}
        </>
    );
};

export default AddVehicle;
