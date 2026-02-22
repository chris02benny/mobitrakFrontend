import React, { useState, useEffect } from 'react';
import { X, Calendar, AlertCircle, Info } from 'lucide-react';
import { maintenanceService } from '../../services/maintenanceService';
import { vehicleService } from '../../services/vehicleService';
import TripRangeCalendar from '../common/TripRangeCalendar';

const ScheduleMaintenanceModal = ({ isOpen, onClose, onSuccess, vehicle: initialVehicle }) => {
    const [loading, setLoading] = useState(false);
    const [vehicles, setVehicles] = useState([]);
    const [error, setError] = useState(null);
    const [formData, setFormData] = useState({
        vehicleId: initialVehicle?._id || '',
        lastServiceDate: '',
        intervalMonths: '6',
        plannedStartDate: '',
        plannedEndDate: '',
        notes: ''
    });

    useEffect(() => {
        if (!initialVehicle) {
            fetchVehicles();
        } else {
            setFormData(prev => ({ ...prev, vehicleId: initialVehicle?._id }));
        }
    }, [initialVehicle, isOpen]);

    const fetchVehicles = async () => {
        try {
            const data = await vehicleService.getVehicles();
            setVehicles(data);
        } catch (err) {
            console.error('Error fetching vehicles:', err);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleDateRangeChange = ({ startDateTime, endDateTime }) => {
        setFormData(prev => ({
            ...prev,
            plannedStartDate: startDateTime,
            plannedEndDate: endDateTime
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.plannedStartDate || !formData.plannedEndDate) {
            setError('Please select a maintenance date range');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            await maintenanceService.scheduleRegularService(formData);
            onSuccess();
            onClose();
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Failed to schedule maintenance');
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

                <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-xl sm:w-full">
                    <div className="bg-white px-4 pt-5 pb-4 sm:p-8">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                                <div className="p-2 bg-amber-50 rounded-lg">
                                    <Calendar className="text-amber-500" size={24} />
                                </div>
                                Schedule Maintenance
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
                            {!initialVehicle && (
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Select Vehicle</label>
                                    <select
                                        name="vehicleId"
                                        value={formData.vehicleId}
                                        onChange={handleChange}
                                        required
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all"
                                    >
                                        <option value="">Choose a vehicle for service</option>
                                        {vehicles.map(v => (
                                            <option key={v._id} value={v._id}>
                                                {v.regnNo} - {v.make} {v.model}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {initialVehicle && (
                                <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-100 flex items-center justify-between">
                                    <div>
                                        <p className="text-[10px] text-amber-600 uppercase font-black tracking-wider mb-0.5">Vehicle Selected</p>
                                        <p className="text-base font-bold text-gray-900">{initialVehicle.regnNo}</p>
                                        <p className="text-xs text-gray-500">{initialVehicle.make} {initialVehicle.model}</p>
                                    </div>
                                    <div className="w-10 h-10 bg-white rounded-lg border border-amber-100 flex items-center justify-center shadow-sm">
                                        <Info size={20} className="text-amber-500" />
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Last Service Date</label>
                                    <input
                                        type="date"
                                        name="lastServiceDate"
                                        value={formData.lastServiceDate}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Interval (Months)</label>
                                    <input
                                        type="number"
                                        name="intervalMonths"
                                        value={formData.intervalMonths}
                                        onChange={handleChange}
                                        min="1"
                                        max="24"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-gray-700">Planned Schedule</label>
                                <TripRangeCalendar
                                    startDateTime={formData.plannedStartDate}
                                    endDateTime={formData.plannedEndDate}
                                    onChange={handleDateRangeChange}
                                    hideTimeSelection={true}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-gray-700">Notes (Optional)</label>
                                <textarea
                                    name="notes"
                                    value={formData.notes}
                                    onChange={handleChange}
                                    rows="2"
                                    placeholder="Any specific issues to be addressed?"
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none resize-none transition-all"
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
                                    className="flex-1 px-6 py-3 bg-amber-500 text-white rounded-full hover:bg-amber-600 font-bold transition-all shadow-lg shadow-amber-200 disabled:opacity-50 disabled:shadow-none flex justify-center items-center gap-2"
                                >
                                    {loading ? (
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                        <>
                                            <Calendar size={18} />
                                            Schedule
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

export default ScheduleMaintenanceModal;
