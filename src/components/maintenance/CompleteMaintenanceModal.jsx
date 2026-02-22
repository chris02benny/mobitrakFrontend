import React, { useState } from 'react';
import { X, CheckCircle, Upload, AlertCircle, FileText } from 'lucide-react';
import { maintenanceService } from '../../services/maintenanceService';

const CompleteMaintenanceModal = ({ isOpen, onClose, onSuccess, maintenanceRecord }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [files, setFiles] = useState([]);
    const [formData, setFormData] = useState({
        completedDate: new Date().toISOString().split('T')[0],
        totalCost: '',
        notes: ''
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e) => {
        const selectedFiles = Array.from(e.target.files);
        setFiles(prev => [...prev, ...selectedFiles].slice(0, 5)); // Limit to 5 files
    };

    const removeFile = (index) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const data = new FormData();
            data.append('completedDate', formData.completedDate);
            data.append('totalCost', formData.totalCost);
            data.append('notes', formData.notes);

            files.forEach(file => {
                data.append('bills', file);
            });

            await maintenanceService.completeRegularService(maintenanceRecord._id, data);
            onSuccess();
            onClose();
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Failed to complete maintenance');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity" onClick={onClose}>
                    <div className="absolute inset-0 bg-gray-500/75 backdrop-blur-sm"></div>
                </div>

                <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                    <div className="bg-white px-4 pt-5 pb-4 sm:p-8">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                                <div className="p-2 bg-green-50 rounded-lg">
                                    <CheckCircle className="text-green-500" size={24} />
                                </div>
                                Complete Service
                            </h3>
                            <button onClick={onClose} className="text-gray-400 hover:text-gray-500 transition-colors p-2 hover:bg-gray-50 rounded-full">
                                <X size={24} />
                            </button>
                        </div>

                        {error && (
                            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-700 text-sm animate-shake">
                                <AlertCircle size={20} className="shrink-0 mt-0.5" />
                                <span>{error}</span>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                                <div className="flex justify-between text-[10px] text-blue-600 uppercase font-black tracking-wider mb-2">
                                    <span>Vehicle</span>
                                    <span>Planned Dates</span>
                                </div>
                                <div className="flex justify-between items-end">
                                    <span className="text-base font-bold text-gray-900 leading-none">{maintenanceRecord.vehicleRegNo}</span>
                                    <span className="text-xs font-semibold text-blue-800 bg-blue-100/50 px-2 py-1 rounded-lg border border-blue-200/50">
                                        {new Date(maintenanceRecord.schedule.plannedStartDate).toLocaleDateString()} - {new Date(maintenanceRecord.schedule.plannedEndDate).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Completion Date</label>
                                    <input
                                        type="date"
                                        name="completedDate"
                                        value={formData.completedDate}
                                        onChange={handleChange}
                                        required
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Total Cost (₹)</label>
                                    <input
                                        type="number"
                                        name="totalCost"
                                        value={formData.totalCost}
                                        onChange={handleChange}
                                        placeholder="0.00"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Upload Bills/Invoices (Max 5)</label>
                                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-200 border-dashed rounded-xl hover:border-green-500 transition-all cursor-pointer relative bg-gray-50/50 group">
                                    <div className="space-y-2 text-center">
                                        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm group-hover:scale-110 transition-transform">
                                            <Upload className="h-6 w-6 text-gray-400 group-hover:text-green-500 transition-colors" />
                                        </div>
                                        <div className="flex text-sm text-gray-600">
                                            <label className="relative cursor-pointer rounded-md font-bold text-green-600 hover:text-green-700 transition-colors">
                                                <span>Click to upload</span>
                                                <input
                                                    type="file"
                                                    multiple
                                                    onChange={handleFileChange}
                                                    className="sr-only"
                                                    accept=".jpg,.jpeg,.png,.pdf"
                                                />
                                            </label>
                                            <p className="pl-1">or drag and drop</p>
                                        </div>
                                        <p className="text-xs text-gray-400">PNG, JPG, PDF up to 5MB each</p>
                                    </div>
                                </div>

                                {files.length > 0 && (
                                    <div className="mt-4 grid grid-cols-1 gap-2">
                                        {files.map((file, index) => (
                                            <div key={index} className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100 text-sm shadow-sm group animate-fadeIn">
                                                <div className="flex items-center gap-3 truncate">
                                                    <div className="p-1.5 bg-gray-50 rounded-lg text-gray-400">
                                                        <FileText size={18} />
                                                    </div>
                                                    <div className="truncate">
                                                        <p className="font-semibold text-gray-700 truncate">{file.name}</p>
                                                        <p className="text-[10px] text-gray-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => removeFile(index)}
                                                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                >
                                                    <X size={18} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Completion Notes</label>
                                <textarea
                                    name="notes"
                                    value={formData.notes}
                                    onChange={handleChange}
                                    rows="2"
                                    placeholder="Add any details about work done..."
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none resize-none transition-all"
                                ></textarea>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 px-6 py-3 border-2 border-gray-200 text-gray-600 rounded-full hover:bg-gray-50 font-bold transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 px-6 py-3 bg-green-500 text-white rounded-full hover:bg-green-600 font-bold transition-all shadow-lg shadow-green-100 disabled:opacity-50 disabled:shadow-none flex justify-center items-center gap-2"
                                >
                                    {loading ? (
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                        <>
                                            <CheckCircle size={18} />
                                            Complete
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CompleteMaintenanceModal;
