import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import toast from 'react-hot-toast';
import { Upload, Loader2, Check, AlertTriangle, FileText, Eye, X } from 'lucide-react';
import Button from '../components/common/Button';

const DriverProfileCompletion = () => {
    const navigate = useNavigate();
    const [dlFrontFile, setDlFrontFile] = useState(null);
    const [dlBackFile, setDlBackFile] = useState(null);
    const [dlFrontPreview, setDlFrontPreview] = useState(null);
    const [dlBackPreview, setDlBackPreview] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [extractedDetails, setExtractedDetails] = useState(null);
    const [showDisclaimer, setShowDisclaimer] = useState(false);

    const handleFrontFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setDlFrontFile(file);
            setDlFrontPreview(URL.createObjectURL(file));
        }
    };

    const handleBackFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setDlBackFile(file);
            setDlBackPreview(URL.createObjectURL(file));
        }
    };



    const handleExtractDetails = async () => {
        if (!dlFrontFile || !dlBackFile) {
            toast.error('Please upload both front and back images of your driving license');
            return;
        }

        setUploading(true);

        try {
            // Upload DL and extract details
            const dlResult = await authService.uploadDL(dlFrontFile, dlBackFile);

            toast.success('Details extracted successfully! Please verify the information below.');
            setExtractedDetails(dlResult.dlDetails);
            setShowDisclaimer(true);
        } catch (error) {
            toast.error(error.message || 'Failed to upload driving license');
        } finally {
            setUploading(false);
        }
    };

    const handleVerifyAndSave = async (e) => {
        e.preventDefault();

        if (!extractedDetails) {
            toast.error('Please extract details first by uploading DL images');
            return;
        }

        setUploading(true);

        try {
            await authService.verifyDL(extractedDetails);
            toast.success('Driving license verified successfully!');

            // Redirect to dashboard after a short delay
            setTimeout(() => {
                navigate('/driver/dashboard');
            }, 1500);
        } catch (error) {
            toast.error(error.message || 'Failed to verify driving license');
            setUploading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 max-w-4xl w-full p-8">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                        <FileText size={32} className="text-secondary" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Complete Your Profile</h1>
                    <p className="text-gray-600">Upload your driving license and verify the extracted details</p>
                </div>

                <form onSubmit={handleVerifyAndSave} className="space-y-6">
                    {/* Upload Section */}
                    <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Step 1: Upload DL Images</h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            {/* Front Image Upload */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Front Side *
                                </label>
                                <label
                                    htmlFor="dl-front"
                                    className={`flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${dlFrontPreview ? 'border-primary bg-white' : 'border-gray-300 bg-white hover:bg-gray-50'
                                        }`}
                                >
                                    {dlFrontPreview ? (
                                        <div className="w-full h-full relative p-2 group">
                                            <img src={dlFrontPreview} alt="DL Front" className="w-full h-full object-contain rounded" />
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded text-white text-sm font-medium">
                                                Change
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-4">
                                            <Upload size={24} className="text-gray-400 mb-2" />
                                            <p className="text-xs text-gray-500">Click to upload</p>
                                        </div>
                                    )}
                                    <input
                                        id="dl-front"
                                        type="file"
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleFrontFileChange}
                                        disabled={uploading}
                                    />
                                </label>
                            </div>

                            {/* Back Image Upload */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Back Side *
                                </label>
                                <label
                                    htmlFor="dl-back"
                                    className={`flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${dlBackPreview ? 'border-primary bg-white' : 'border-gray-300 bg-white hover:bg-gray-50'
                                        }`}
                                >
                                    {dlBackPreview ? (
                                        <div className="w-full h-full relative p-2 group">
                                            <img src={dlBackPreview} alt="DL Back" className="w-full h-full object-contain rounded" />
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded text-white text-sm font-medium">
                                                Change
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-4">
                                            <Upload size={24} className="text-gray-400 mb-2" />
                                            <p className="text-xs text-gray-500">Click to upload</p>
                                        </div>
                                    )}
                                    <input
                                        id="dl-back"
                                        type="file"
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleBackFileChange}
                                        disabled={uploading}
                                    />
                                </label>
                            </div>
                        </div>

                        {!extractedDetails ? (
                            <Button
                                type="button"
                                onClick={handleExtractDetails}
                                variant="primary"
                                size="md"
                                className="w-full"
                                disabled={uploading || !dlFrontFile || !dlBackFile}
                            >
                                {uploading ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin mr-2" />
                                        Extracting...
                                    </>
                                ) : (
                                    'Continue'
                                )}
                            </Button>
                        ) : (
                            <Button
                                type="button"
                                onClick={() => {
                                    setExtractedDetails(null);
                                    setShowDisclaimer(false);
                                }}
                                variant="secondary"
                                size="md"
                                className="w-full"
                                disabled={uploading}
                            >
                                Re-upload Images
                            </Button>
                        )}
                    </div>

                    {/* Verification Section */}
                    {extractedDetails && (
                        <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Step 2: Verify Extracted Details</h2>

                            <div className="p-3 bg-blue-100 border border-blue-300 rounded-lg flex items-start gap-2 mb-4">
                                <AlertTriangle size={18} className="text-blue-700 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-blue-800">Please review and correct any information below before saving.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* DL Number */}
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        DL Number *
                                    </label>
                                    <input
                                        type="text"
                                        value={extractedDetails?.licenseNumber || ''}
                                        onChange={(e) => setExtractedDetails({ ...extractedDetails, licenseNumber: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
                                        required
                                    />
                                </div>

                                {/* Issue Date */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Issue Date *
                                    </label>
                                    <input
                                        type="text"
                                        value={extractedDetails?.issueDate || ''}
                                        onChange={(e) => setExtractedDetails({ ...extractedDetails, issueDate: e.target.value })}
                                        placeholder="DD-MM-YYYY"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
                                        required
                                    />
                                </div>

                                {/* Valid Upto */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Valid Upto *
                                    </label>
                                    <input
                                        type="text"
                                        value={extractedDetails?.validUpto || ''}
                                        onChange={(e) => setExtractedDetails({ ...extractedDetails, validUpto: e.target.value })}
                                        placeholder="DD-MM-YYYY"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
                                        required
                                    />
                                </div>

                                {/* Permanent Address */}
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Permanent Address *
                                    </label>
                                    <textarea
                                        value={extractedDetails?.address || ''}
                                        onChange={(e) => setExtractedDetails({ ...extractedDetails, address: e.target.value })}
                                        rows={2}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
                                        required
                                    />
                                </div>

                                {/* Name */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Name
                                    </label>
                                    <input
                                        type="text"
                                        value={extractedDetails?.name || ''}
                                        onChange={(e) => setExtractedDetails({ ...extractedDetails, name: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
                                    />
                                </div>

                                {/* DOB */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Date of Birth
                                    </label>
                                    <input
                                        type="text"
                                        value={extractedDetails?.dob || ''}
                                        onChange={(e) => setExtractedDetails({ ...extractedDetails, dob: e.target.value })}
                                        placeholder="DD-MM-YYYY"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
                                    />
                                </div>

                                {/* Blood Group */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Blood Group
                                    </label>
                                    <input
                                        type="text"
                                        value={extractedDetails?.bloodGroup || ''}
                                        onChange={(e) => setExtractedDetails({ ...extractedDetails, bloodGroup: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
                                    />
                                </div>

                                {/* Vehicle Classes */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Vehicle Classes
                                    </label>
                                    <input
                                        type="text"
                                        value={extractedDetails?.vehicleClasses || ''}
                                        onChange={(e) => setExtractedDetails({ ...extractedDetails, vehicleClasses: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Submit Button - Only show after extraction */}
                    {extractedDetails && (
                        <div className="flex justify-end gap-3 pt-4">
                            <Button
                                type="submit"
                                variant="primary"
                                size="lg"
                                className="w-full"
                                disabled={uploading}
                            >
                                {uploading ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin mr-2" />
                                        Saving...
                                    </>
                                ) : (
                                    'Save Changes'
                                )}
                            </Button>
                        </div>
                    )}

                    <p className="text-xs text-center text-gray-500 mt-4">
                        Your driving license information will be securely stored and used for verification purposes only.
                    </p>
                </form>
            </div>
        </div>
    );
};

export default DriverProfileCompletion;
