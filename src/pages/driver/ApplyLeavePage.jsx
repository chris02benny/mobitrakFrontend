import React, { useState, useEffect, useRef } from 'react';
import {
    CalendarDays, ClipboardList, Upload, X, FileText, Loader2,
    Check, AlertCircle, Clock, CheckCircle2, XCircle, Ban, Stethoscope,
    Calendar as CalendarIcon, ChevronRight, RotateCcw
} from 'lucide-react';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { PickersDay } from '@mui/x-date-pickers/PickersDay';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import { tripService } from '../../services/tripService';
import { leaveService } from '../../services/leaveService';

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

const STATUS_CONFIG = {
    PENDING:   { label: 'Pending',   color: 'bg-amber-100 text-amber-700',  icon: <Clock size={13} /> },
    APPROVED:  { label: 'Approved',  color: 'bg-green-100 text-green-700',  icon: <CheckCircle2 size={13} /> },
    REJECTED:  { label: 'Rejected',  color: 'bg-red-100 text-red-700',      icon: <XCircle size={13} /> },
    CANCELLED: { label: 'Cancelled', color: 'bg-gray-100 text-gray-500',    icon: <Ban size={13} /> },
};

const StatusBadge = ({ status }) => {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.color}`}>
            {cfg.icon}
            {cfg.label}
        </span>
    );
};

const formatDate = (d) => dayjs(d).format('DD MMM YYYY');

const daysBetween = (start, end) => {
    const s = dayjs(start).startOf('day');
    const e = dayjs(end).startOf('day');
    return e.diff(s, 'day') + 1;
};

// ─────────────────────────────────────────────
// Leave Calendar (adapted from TripRangeCalendar)
// ─────────────────────────────────────────────

function LeaveCalendar({ onChange, busyDates = [], existingLeaves = [] }) {
    const [rangeStart, setRangeStart] = useState(null);
    const [rangeEnd, setRangeEnd] = useState(null);
    const [selectingEnd, setSelectingEnd] = useState(false);

    // Build combined busy day set from trips + active leaves
    const buildBusySet = () => {
        const set = new Set();

        busyDates.forEach(({ start, end }) => {
            let cur = dayjs(start).startOf('day');
            const last = dayjs(end).startOf('day');
            while (cur.isBefore(last) || cur.isSame(last)) {
                set.add(cur.format('YYYY-MM-DD'));
                cur = cur.add(1, 'day');
            }
        });

        existingLeaves.forEach(({ startDate, endDate, status }) => {
            if (status === 'PENDING' || status === 'APPROVED') {
                let cur = dayjs(startDate).startOf('day');
                const last = dayjs(endDate).startOf('day');
                while (cur.isBefore(last) || cur.isSame(last)) {
                    set.add(cur.format('YYYY-MM-DD'));
                    cur = cur.add(1, 'day');
                }
            }
        });

        return set;
    };

    const busySet = buildBusySet();

    const isDateBusy = (date) => busySet.has(dayjs(date).format('YYYY-MM-DD'));

    const isInSelectedRange = (date) => {
        if (!rangeStart || !rangeEnd) return false;
        const d = dayjs(date).startOf('day');
        return d.isSame(rangeStart) || d.isSame(rangeEnd) ||
            (d.isAfter(rangeStart) && d.isBefore(rangeEnd));
    };

    const rangeContainsBusy = (start, end) => {
        let cur = start.startOf('day');
        const last = end.startOf('day');
        while (cur.isBefore(last) || cur.isSame(last)) {
            if (busySet.has(cur.format('YYYY-MM-DD'))) return true;
            cur = cur.add(1, 'day');
        }
        return false;
    };

    const handleDateClick = (date) => {
        const clicked = dayjs(date).startOf('day');
        if (isDateBusy(clicked)) return;

        if (!selectingEnd) {
            setRangeStart(clicked);
            setRangeEnd(null);
            setSelectingEnd(true);
            onChange(null, null);
        } else {
            let start = clicked.isBefore(rangeStart) ? clicked : rangeStart;
            let end   = clicked.isBefore(rangeStart) ? rangeStart : clicked;

            if (rangeContainsBusy(start, end)) {
                toast.error('Selected range contains busy dates. Please choose different dates.');
                setRangeStart(null);
                setRangeEnd(null);
                setSelectingEnd(false);
                onChange(null, null);
                return;
            }

            setRangeStart(start);
            setRangeEnd(end);
            setSelectingEnd(false);
            onChange(start.toISOString(), end.toISOString());
        }
    };

    const handleClear = () => {
        setRangeStart(null);
        setRangeEnd(null);
        setSelectingEnd(false);
        onChange(null, null);
    };

    const CustomDay = (props) => {
        const { day, ...other } = props;
        const isBusy   = isDateBusy(day);
        const start    = rangeStart ? rangeStart.startOf('day') : null;
        const end      = rangeEnd   ? rangeEnd.startOf('day')   : null;
        const current  = dayjs(day).startOf('day');
        const isStart  = start && current.isSame(start);
        const isEnd    = end   && current.isSame(end);
        const isInRange = start && end && current.isAfter(start) && current.isBefore(end);

        return (
            <div style={{
                position: 'relative',
                backgroundColor: isInRange ? '#fef3c7' : 'transparent',
                flexGrow: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}>
                {(isStart || isEnd) && start && end && (
                    <div style={{
                        position: 'absolute', top: 0, bottom: 0,
                        left: isStart ? '50%' : 0,
                        right: isEnd  ? '50%' : 0,
                        backgroundColor: '#fef3c7', zIndex: 0
                    }} />
                )}
                <PickersDay
                    {...other}
                    day={day}
                    disabled={isBusy || other.disabled}
                    sx={{
                        position: 'relative', zIndex: 1,
                        backgroundColor: isBusy ? '#ef4444 !important'
                            : (isStart || isEnd) ? '#f59e0b !important' : 'transparent',
                        color: (isBusy || isStart || isEnd) ? 'white !important'
                            : isInRange ? '#92400e !important' : 'inherit',
                        borderRadius: (isStart || isEnd || isBusy) ? '50% !important' : '0',
                        margin: 0, border: 'none !important',
                        '&:hover': {
                            backgroundColor: isBusy ? '#dc2626 !important'
                                : (isStart || isEnd) ? '#d97706 !important'
                                : isInRange ? '#fde68a !important' : undefined,
                        },
                        fontWeight: (isStart || isEnd) ? 'bold' : 'normal',
                        '&.Mui-selected': {
                            backgroundColor: (isStart || isEnd) ? '#f59e0b !important' : 'transparent',
                            color: (isStart || isEnd) ? 'white !important' : 'inherit',
                        },
                        '&.Mui-focusVisible': { outline: 'none', backgroundColor: 'transparent' },
                        '&.MuiPickersDay-today': { borderColor: 'transparent !important', borderWidth: '0px !important' },
                    }}
                />
            </div>
        );
    };

    return (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            {/* Header */}
            <div className="flex justify-between items-start mb-4 min-h-[40px]">
                <div className="text-xs flex-1">
                    {rangeStart && rangeEnd ? (
                        <p className="flex items-center gap-2 text-gray-700 font-medium">
                            <CalendarIcon className="text-amber-500" size={20} />
                            Selected: <span className="text-amber-600 ml-1">
                                {rangeStart.format('MMM D, YYYY')} → {rangeEnd.format('MMM D, YYYY')}
                                <span className="ml-2 text-xs text-gray-500">
                                    ({daysBetween(rangeStart, rangeEnd)} day{daysBetween(rangeStart, rangeEnd) > 1 ? 's' : ''})
                                </span>
                            </span>
                        </p>
                    ) : !selectingEnd ? (
                        <p className="flex items-center gap-2 text-gray-700 font-medium">
                            <CalendarIcon className="text-amber-500" size={20} />
                            Click to select <span className="text-amber-500 ml-1">start date</span>
                        </p>
                    ) : (
                        <p className="flex items-center gap-2 text-gray-700 font-medium">
                            <CalendarIcon className="text-amber-500" size={20} />
                            Now click <span className="text-amber-500 ml-1">end date</span>
                        </p>
                    )}
                </div>
                <button
                    type="button"
                    onClick={handleClear}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-amber-400 text-amber-600 rounded-full text-xs font-medium hover:bg-amber-50 transition-colors whitespace-nowrap"
                >
                    <RotateCcw size={12} /> Reset
                </button>
            </div>

            <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DateCalendar
                    value={rangeStart}
                    onChange={handleDateClick}
                    disableHighlightToday
                    minDate={rangeStart && selectingEnd ? rangeStart : dayjs()}
                    slots={{
                        day: CustomDay,
                    }}
                    sx={{
                        width: '100%',
                        '& .MuiPickersCalendarHeader-root': { paddingLeft: 0, paddingRight: 0, marginBottom: '10px' },
                        '& .MuiPickersCalendarHeader-label': { fontSize: '1.05rem', fontWeight: '700', color: '#111827' },
                        '& .MuiDayCalendar-header': { justifyContent: 'space-between', marginBottom: '8px' },
                        '& .MuiDayCalendar-weekDayLabel': { color: '#6b7280', fontWeight: '600', width: '40px' },
                        '& .MuiDayCalendar-monthContainer': { minHeight: '240px' },
                        '& .MuiPickersDay-root': { width: '40px', height: '40px', fontSize: '0.9rem' },
                    }}
                />
            </LocalizationProvider>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 text-xs mt-3 pt-3 border-t border-gray-100">
                <div className="flex items-center gap-1.5">
                    <div className="w-3.5 h-3.5 rounded-full bg-red-500" />
                    <span className="text-gray-500">Unavailable (trip / existing leave)</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3.5 h-3.5 rounded bg-amber-400" />
                    <span className="text-gray-500">Selected range</span>
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────

const ApplyLeavePage = () => {
    const [activeTab, setActiveTab] = useState('apply'); // 'apply' | 'applications'

    // --- Apply form state ---
    const [leaveType, setLeaveType] = useState('REGULAR');
    const [reason, setReason] = useState('');
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const [documentFile, setDocumentFile] = useState(null);
    const [docPreviewUrl, setDocPreviewUrl] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    // --- Data ---
    const [trips, setTrips] = useState([]);
    const [leaves, setLeaves] = useState([]);
    const [loadingTrips, setLoadingTrips] = useState(true);
    const [loadingLeaves, setLoadingLeaves] = useState(true);
    const [cancellingId, setCancellingId] = useState(null);

    const fileInputRef = useRef(null);

    // Derive busy date ranges from trips
    const busyDates = trips
        .filter(t => t.status === 'scheduled' || t.status === 'in-progress')
        .map(t => ({ start: t.startDateTime, end: t.endDateTime }));

    useEffect(() => {
        fetchTrips();
        fetchLeaves();
    }, []);

    const fetchTrips = async () => {
        try {
            setLoadingTrips(true);
            const data = await tripService.getDriverAssignedTrips();
            setTrips(data || []);
        } catch (err) {
            console.error('fetchTrips error:', err);
        } finally {
            setLoadingTrips(false);
        }
    };

    const fetchLeaves = async () => {
        try {
            setLoadingLeaves(true);
            const data = await leaveService.getDriverLeaves();
            setLeaves(data || []);
        } catch (err) {
            console.error('fetchLeaves error:', err);
        } finally {
            setLoadingLeaves(false);
        }
    };

    const handleDateChange = (start, end) => {
        setStartDate(start);
        setEndDate(end);
    };

    const handleDocumentChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setDocumentFile(file);
        setDocPreviewUrl(URL.createObjectURL(file));
    };

    const handleRemoveDoc = () => {
        setDocumentFile(null);
        setDocPreviewUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!startDate || !endDate) {
            toast.error('Please select the leave date range from the calendar');
            return;
        }
        if (!reason.trim()) {
            toast.error('Please provide a reason for your leave');
            return;
        }
        if (leaveType === 'SICK' && !documentFile) {
            toast.error('Please upload a supporting document for sick leave');
            return;
        }

        try {
            setSubmitting(true);
            await leaveService.applyLeave(
                { startDate, endDate, type: leaveType, reason: reason.trim() },
                leaveType === 'SICK' ? documentFile : null
            );
            toast.success('Leave application submitted successfully!');

            // Reset form
            setStartDate(null);
            setEndDate(null);
            setReason('');
            setLeaveType('REGULAR');
            setDocumentFile(null);
            setDocPreviewUrl(null);
            if (fileInputRef.current) fileInputRef.current.value = '';

            // Refresh leaves and switch tab
            await fetchLeaves();
            setActiveTab('applications');
        } catch (err) {
            toast.error(err.message || 'Failed to submit leave application');
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancel = async (leaveId) => {
        try {
            setCancellingId(leaveId);
            await leaveService.cancelLeave(leaveId);
            toast.success('Leave cancelled');
            await fetchLeaves();
        } catch (err) {
            toast.error(err.message || 'Failed to cancel leave');
        } finally {
            setCancellingId(null);
        }
    };

    const tabs = [
        { id: 'apply',        label: 'Apply Leave',     icon: <CalendarDays size={16} /> },
        { id: 'applications', label: 'My Applications', icon: <ClipboardList size={16} />, count: leaves.filter(l => l.status === 'PENDING').length },
    ];

    // ─── Render ──────────────────────────────
    return (
        <div className="max-w-[1100px] mx-auto">
            {/* Tab bar */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="flex border-b border-gray-200 overflow-x-auto">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium whitespace-nowrap transition-colors duration-200
                                ${activeTab === tab.id
                                    ? 'text-amber-600 border-b-2 border-amber-600 bg-amber-50'
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                }`}
                        >
                            {tab.icon}
                            <span>{tab.label}</span>
                            {tab.count > 0 && (
                                <span className={`px-2 py-0.5 rounded-full text-xs
                                    ${activeTab === tab.id ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}
                                >
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* ── Apply Leave Tab ─────────────────────── */}
                {activeTab === 'apply' && (
                    <div className="p-6">
                        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                            {/* Left column: Calendar */}
                            <div className="space-y-4">
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-800 mb-1 flex items-center gap-2">
                                        <CalendarDays size={16} className="text-amber-500" />
                                        Select Leave Dates
                                    </h3>
                                    <p className="text-xs text-gray-500 mb-3">
                                        Red dates are unavailable (assigned trips or existing leaves).
                                    </p>
                                    {loadingTrips ? (
                                        <div className="flex items-center justify-center h-48 text-gray-400">
                                            <Loader2 className="animate-spin mr-2" size={20} /> Loading calendar…
                                        </div>
                                    ) : (
                                        <LeaveCalendar
                                            onChange={handleDateChange}
                                            busyDates={busyDates}
                                            existingLeaves={leaves}
                                        />
                                    )}
                                </div>
                            </div>

                            {/* Right column: Form fields */}
                            <div className="space-y-5">

                                {/* Leave Type */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Leave Type <span className="text-red-500">*</span>
                                    </label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {[
                                            { value: 'REGULAR', label: 'Regular Leave', icon: <CalendarDays size={18} /> },
                                            { value: 'SICK',    label: 'Sick Leave',    icon: <Stethoscope size={18} /> },
                                        ].map(opt => (
                                            <button
                                                key={opt.value}
                                                type="button"
                                                onClick={() => { setLeaveType(opt.value); handleRemoveDoc(); }}
                                                className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all
                                                    ${leaveType === opt.value
                                                        ? 'border-amber-500 bg-amber-50 text-amber-700'
                                                        : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                                                    }`}
                                            >
                                                <span className={leaveType === opt.value ? 'text-amber-500' : 'text-gray-400'}>
                                                    {opt.icon}
                                                </span>
                                                {opt.label}
                                                {leaveType === opt.value && <Check size={14} className="ml-auto text-amber-500" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Date summary */}
                                {startDate && endDate && (
                                    <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
                                        <CalendarIcon size={18} className="text-amber-500 flex-shrink-0" />
                                        <div className="text-sm">
                                            <span className="font-semibold text-amber-700">
                                                {formatDate(startDate)}
                                            </span>
                                            <ChevronRight size={14} className="inline mx-1 text-amber-400" />
                                            <span className="font-semibold text-amber-700">
                                                {formatDate(endDate)}
                                            </span>
                                            <span className="ml-2 text-xs text-amber-600">
                                                ({daysBetween(startDate, endDate)} day{daysBetween(startDate, endDate) > 1 ? 's' : ''})
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {/* Reason */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Reason <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        value={reason}
                                        onChange={e => setReason(e.target.value)}
                                        rows={4}
                                        maxLength={1000}
                                        placeholder="Briefly describe the reason for your leave…"
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent resize-none transition-all"
                                    />
                                    <p className="text-right text-xs text-gray-400 mt-1">{reason.length}/1000</p>
                                </div>

                                {/* Document upload (Sick leave only) */}
                                {leaveType === 'SICK' && (
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Supporting Document <span className="text-red-500">*</span>
                                            <span className="ml-1 text-xs font-normal text-gray-400">(Medical certificate, prescription, etc.)</span>
                                        </label>

                                        <label
                                            htmlFor="leave-doc-upload"
                                            className={`flex flex-col items-center justify-center w-full border-2 border-dashed rounded-xl cursor-pointer transition-colors
                                                ${docPreviewUrl
                                                    ? 'border-amber-400 bg-amber-50/40 h-auto p-2'
                                                    : 'border-gray-300 bg-white hover:bg-gray-50 h-36'
                                                }`}
                                        >
                                            {docPreviewUrl ? (
                                                <div className="w-full relative group">
                                                    {documentFile?.type?.startsWith('image/') ? (
                                                        <img
                                                            src={docPreviewUrl}
                                                            alt="Document preview"
                                                            className="w-full max-h-48 object-contain rounded-lg"
                                                        />
                                                    ) : (
                                                        <div className="flex items-center gap-3 p-3">
                                                            <FileText size={32} className="text-amber-500 flex-shrink-0" />
                                                            <div className="overflow-hidden">
                                                                <p className="text-sm font-medium text-gray-800 truncate">{documentFile?.name}</p>
                                                                <p className="text-xs text-gray-400">{(documentFile?.size / 1024).toFixed(1)} KB</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg text-white text-xs font-medium">
                                                        Click to change
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center justify-center py-6">
                                                    <Upload size={24} className="text-gray-400 mb-2" />
                                                    <p className="text-sm text-gray-500">Click to upload document</p>
                                                    <p className="text-xs text-gray-400 mt-1">JPG, PNG or PDF — max 10MB</p>
                                                </div>
                                            )}
                                            <input
                                                id="leave-doc-upload"
                                                ref={fileInputRef}
                                                type="file"
                                                className="hidden"
                                                accept="image/*,.pdf"
                                                onChange={handleDocumentChange}
                                            />
                                        </label>

                                        {documentFile && (
                                            <button
                                                type="button"
                                                onClick={handleRemoveDoc}
                                                className="mt-2 flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-medium"
                                            >
                                                <X size={13} /> Remove document
                                            </button>
                                        )}
                                    </div>
                                )}

                                {/* Submit */}
                                <button
                                    type="submit"
                                    disabled={submitting || !startDate || !endDate}
                                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl shadow-sm transition-all"
                                >
                                    {submitting ? (
                                        <><Loader2 size={18} className="animate-spin" /> Submitting…</>
                                    ) : (
                                        <><CalendarDays size={18} /> Submit Leave Application</>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* ── My Applications Tab ─────────────────── */}
                {activeTab === 'applications' && (
                    <div className="p-6">
                        {loadingLeaves ? (
                            <div className="flex items-center justify-center h-48 text-gray-400">
                                <Loader2 className="animate-spin mr-2" size={20} /> Loading applications…
                            </div>
                        ) : leaves.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-3">
                                <ClipboardList size={40} className="text-gray-200" />
                                <p className="text-sm font-medium">No leave applications yet</p>
                                <button
                                    onClick={() => setActiveTab('apply')}
                                    className="text-sm text-amber-600 hover:underline font-medium"
                                >
                                    Apply for leave →
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {leaves.map(leave => (
                                    <div
                                        key={leave._id}
                                        className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 hover:shadow-sm transition-shadow"
                                    >
                                        <div className="flex-1 space-y-1.5">
                                            <div className="flex items-center gap-3 flex-wrap">
                                                <StatusBadge status={leave.status} />
                                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${leave.type === 'SICK' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                                    {leave.type === 'SICK' ? '🩺 Sick' : '📅 Regular'}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-2 text-sm text-gray-700">
                                                <CalendarIcon size={14} className="text-amber-400 flex-shrink-0" />
                                                <span className="font-medium">{formatDate(leave.startDate)}</span>
                                                <ChevronRight size={13} className="text-gray-400" />
                                                <span className="font-medium">{formatDate(leave.endDate)}</span>
                                                <span className="text-xs text-gray-400 ml-1">
                                                    ({daysBetween(leave.startDate, leave.endDate)} day{daysBetween(leave.startDate, leave.endDate) > 1 ? 's' : ''})
                                                </span>
                                            </div>

                                            <p className="text-xs text-gray-500 leading-relaxed">
                                                <span className="font-medium text-gray-600">Reason:</span> {leave.reason}
                                            </p>

                                            {leave.documentUrl && (
                                                <a
                                                    href={leave.documentUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                                                >
                                                    <FileText size={12} /> View document
                                                </a>
                                            )}

                                            {leave.managerNote && (
                                                <div className="flex items-start gap-2 mt-1 p-2 bg-white border border-gray-200 rounded-lg">
                                                    <AlertCircle size={13} className={`flex-shrink-0 mt-0.5 ${leave.status === 'REJECTED' ? 'text-red-400' : 'text-green-400'}`} />
                                                    <p className="text-xs text-gray-600">
                                                        <span className="font-medium">Manager note:</span> {leave.managerNote}
                                                    </p>
                                                </div>
                                            )}

                                            <p className="text-xs text-gray-400">
                                                Applied {dayjs(leave.createdAt).format('DD MMM YYYY, h:mm A')}
                                            </p>
                                        </div>

                                        {/* Actions */}
                                        {leave.status === 'PENDING' && (
                                            <button
                                                onClick={() => handleCancel(leave._id)}
                                                disabled={cancellingId === leave._id}
                                                className="flex items-center gap-1.5 px-3 py-1.5 border border-red-200 text-red-500 hover:bg-red-50 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 self-start"
                                            >
                                                {cancellingId === leave._id ? (
                                                    <Loader2 size={13} className="animate-spin" />
                                                ) : (
                                                    <X size={13} />
                                                )}
                                                Cancel
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ApplyLeavePage;
