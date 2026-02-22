import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Clock, CheckCircle, AlertCircle, FileText, ChevronRight } from 'lucide-react';
import { maintenanceService } from '../../services/maintenanceService';
import { vehicleService } from '../../services/vehicleService';
import ScheduleMaintenanceModal from '../../components/maintenance/ScheduleMaintenanceModal';
import CompleteMaintenanceModal from '../../components/maintenance/CompleteMaintenanceModal';

const MaintenancePage = () => {
    const [records, setRecords] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [showCompleteModal, setShowCompleteModal] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [activeTab, setActiveTab] = useState('ALL'); // ALL, SCHEDULED, IN_PROGRESS, COMPLETED

    const fetchData = async () => {
        try {
            setLoading(true);
            const [recordsData, vehiclesData] = await Promise.all([
                maintenanceService.getMaintenanceRecords(),
                vehicleService.getVehicles()
            ]);
            setRecords(recordsData);
            setVehicles(vehiclesData);
        } catch (error) {
            console.error('Error fetching maintenance data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const getVehicleRegNo = (vehicleId) => {
        const vehicle = vehicles.find(v => v._id === vehicleId);
        return vehicle ? vehicle.regnNo : 'Unknown Vehicle';
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'SCHEDULED': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'IN_PROGRESS': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'COMPLETED': return 'bg-green-100 text-green-700 border-green-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    const tabs = [
        { id: 'ALL', label: 'All', count: records.length },
        { id: 'SCHEDULED', label: 'Scheduled', count: records.filter(r => r.status === 'SCHEDULED').length },
        { id: 'IN_PROGRESS', label: 'In Progress', count: records.filter(r => r.status === 'IN_PROGRESS').length },
        { id: 'COMPLETED', label: 'Completed', count: records.filter(r => r.status === 'COMPLETED').length }
    ];

    const filteredRecords = records.filter(record =>
        activeTab === 'ALL' || record.status === activeTab
    );

    const handleCompleteClick = (record) => {
        setSelectedRecord({
            ...record,
            vehicleRegNo: getVehicleRegNo(record.vehicleId)
        });
        setShowCompleteModal(true);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[600px]">
                <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="max-w-[1600px] mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">Maintenance</h1>
                <button
                    onClick={() => setShowScheduleModal(true)}
                    className="flex items-center gap-2 px-6 py-2 border-2 border-amber-500 text-amber-600 rounded-full hover:bg-amber-50 font-bold transition-all shadow-sm"
                >
                    <Plus size={18} />
                    Schedule
                </button>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                {/* Tabs */}
                <div className="flex border-b border-gray-200 overflow-x-auto">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`
                                flex items-center gap-2 px-6 py-3 text-sm font-medium whitespace-nowrap
                                transition-colors duration-200
                                ${activeTab === tab.id
                                    ? 'text-amber-600 border-b-2 border-amber-600 bg-amber-50'
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                }
                            `}
                        >
                            <span>{tab.label}</span>
                            <span className={`
                                px-2 py-0.5 rounded-full text-xs
                                ${activeTab === tab.id
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-gray-100 text-gray-600'
                                }
                            `}>
                                {tab.count}
                            </span>
                        </button>
                    ))}
                </div>

                <div className="p-6">
                    {filteredRecords.length === 0 ? (
                        <div className="text-center py-20">
                            <Calendar className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                            <h3 className="text-lg font-medium text-gray-900">No maintenance records found</h3>
                            <p className="text-gray-500 mt-1">Start by scheduling regular service for your vehicles.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {filteredRecords.map((record) => (
                                <div key={record._id} className="py-4 first:pt-0 last:pb-0 hover:bg-gray-50 transition-colors flex items-center justify-between rounded-lg px-4 -mx-4">
                                    <div className="flex items-start gap-4">
                                        <div className={`p-2.5 rounded-xl border ${getStatusColor(record.status)}`}>
                                            {record.status === 'COMPLETED' ? <CheckCircle size={20} /> :
                                                record.status === 'IN_PROGRESS' ? <Clock size={20} /> :
                                                    <Calendar size={20} />}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-bold text-gray-900">{getVehicleRegNo(record.vehicleId)}</span>
                                                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${getStatusColor(record.status)}`}>
                                                    {record.status.replace('_', ' ')}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-0.5 text-xs text-gray-500">
                                                <p className="flex items-center gap-1.5">
                                                    <Calendar size={12} className="text-gray-400" />
                                                    Planned: {new Date(record.schedule.plannedStartDate).toLocaleDateString()} - {new Date(record.schedule.plannedEndDate).toLocaleDateString()}
                                                </p>
                                                {record.status === 'COMPLETED' && (
                                                    <p className="flex items-center gap-1.5 text-green-600">
                                                        <CheckCircle size={12} />
                                                        Done: {new Date(record.completion.completedDate).toLocaleDateString()}
                                                    </p>
                                                )}
                                                {record.nextDueDate && (
                                                    <p className="flex items-center gap-1.5">
                                                        <Clock size={12} className="text-gray-400" />
                                                        Next Due: {new Date(record.nextDueDate).toLocaleDateString()}
                                                    </p>
                                                )}
                                                {record.completion?.totalCost > 0 && (
                                                    <p className="font-semibold text-gray-700">
                                                        ₹{record.completion.totalCost.toLocaleString()}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        {record.status !== 'COMPLETED' && (
                                            <button
                                                onClick={() => handleCompleteClick(record)}
                                                className="px-4 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                                            >
                                                <CheckCircle size={14} />
                                                Complete
                                            </button>
                                        )}
                                        {record.completion?.files?.length > 0 && (
                                            <div className="flex gap-1.5">
                                                {record.completion.files.map((file, idx) => (
                                                    <a
                                                        key={idx}
                                                        href={file.fileUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="p-1.5 bg-gray-100 text-gray-500 rounded-lg hover:bg-amber-100 hover:text-amber-600 transition-colors"
                                                        title={file.fileName}
                                                    >
                                                        <FileText size={16} />
                                                    </a>
                                                ))}
                                            </div>
                                        )}
                                        <ChevronRight className="text-gray-300" size={18} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <ScheduleMaintenanceModal
                isOpen={showScheduleModal}
                onClose={() => setShowScheduleModal(false)}
                onSuccess={fetchData}
            />

            {selectedRecord && (
                <CompleteMaintenanceModal
                    isOpen={showCompleteModal}
                    onClose={() => {
                        setShowCompleteModal(false);
                        setSelectedRecord(null);
                    }}
                    onSuccess={fetchData}
                    maintenanceRecord={selectedRecord}
                />
            )}
        </div>
    );
};

export default MaintenancePage;
