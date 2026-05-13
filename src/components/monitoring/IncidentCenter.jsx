/**
 * IncidentCenter.jsx
 * Real-time incident management dashboard for fleet managers.
 *
 * Features:
 *   - Live updating incident list with severity indicators
 *   - Incident lifecycle actions (Acknowledge, Monitor Live, Resolve)
 *   - Severity-based filtering and search
 *   - Incident statistics summary cards
 *   - WebRTC live monitoring trigger
 *   - Timeline/audit trail per incident
 *   - Auto-refreshing via Socket.IO events
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
    AlertTriangle,
    CheckCircle,
    Eye,
    Shield,
    Clock,
    Video,
    XCircle,
    ChevronDown,
    ChevronUp,
    Activity,
    Zap,
    Radio,
    Filter,
    RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useMonitoringContext } from './MonitoringAlertProvider';
import { incidentService } from '../../services/incidentService';
import WebRTCViewer from './WebRTCViewer';

// ── Severity Configuration ──────────────────────────────────────────────────

const SEVERITY_STYLES = {
    EMERGENCY: {
        bg: 'bg-red-50',
        border: 'border-red-300',
        badge: 'bg-red-600 text-white',
        icon: <AlertTriangle size={16} className="text-red-600" />,
        pulse: true,
    },
    CRITICAL: {
        bg: 'bg-orange-50',
        border: 'border-orange-300',
        badge: 'bg-orange-600 text-white',
        icon: <Zap size={16} className="text-orange-600" />,
        pulse: true,
    },
    WARNING: {
        bg: 'bg-amber-50',
        border: 'border-amber-300',
        badge: 'bg-amber-600 text-white',
        icon: <AlertTriangle size={16} className="text-amber-600" />,
        pulse: false,
    },
    INFO: {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        badge: 'bg-blue-500 text-white',
        icon: <Activity size={16} className="text-blue-500" />,
        pulse: false,
    },
};

const STATUS_LABELS = {
    ACTIVE: { label: 'Active', color: 'bg-red-100 text-red-700' },
    ACKNOWLEDGED: { label: 'Acknowledged', color: 'bg-yellow-100 text-yellow-700' },
    MONITORING: { label: 'Monitoring', color: 'bg-purple-100 text-purple-700' },
    ESCALATED: { label: 'Escalated', color: 'bg-orange-100 text-orange-700' },
    RESOLVED: { label: 'Resolved', color: 'bg-green-100 text-green-700' },
};

// ── Stats Card ──────────────────────────────────────────────────────────────

const StatCard = ({ icon, value, label, accent = false, danger = false }) => (
    <div className={`bg-white rounded-xl border p-4 flex items-center gap-3 transition-all duration-300 ${
        danger ? 'border-red-300 bg-red-50 shadow-red-100 shadow-sm' :
        accent ? 'border-amber-200 shadow-amber-50 shadow-sm' :
        'border-gray-200'
    }`}>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            danger ? 'bg-red-100' : accent ? 'bg-amber-100' : 'bg-gray-100'
        }`}>
            {icon}
        </div>
        <div>
            <p className={`text-2xl font-bold ${danger ? 'text-red-600' : 'text-gray-900'}`}>{value}</p>
            <p className="text-xs text-gray-500">{label}</p>
        </div>
    </div>
);

// ── Single Incident Card ────────────────────────────────────────────────────

const IncidentCard = ({ incident, onAcknowledge, onResolve, onMonitor, loading }) => {
    const [expanded, setExpanded] = useState(false);
    const style = SEVERITY_STYLES[incident.severity] || SEVERITY_STYLES.WARNING;
    const statusConfig = STATUS_LABELS[incident.status] || STATUS_LABELS.ACTIVE;

    const timeAgo = (dateStr) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        return `${Math.floor(hrs / 24)}d ago`;
    };

    return (
        <div className={`rounded-xl border overflow-hidden transition-all duration-300 ${style.bg} ${style.border} ${
            style.pulse ? 'animate-pulse-subtle' : ''
        }`}>
            {/* Header */}
            <div className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {style.icon}
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-gray-900">
                                {incident.driverName || 'Unknown Driver'}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${style.badge}`}>
                                {incident.severity}
                            </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                            {incident.type?.replace(/_/g, ' ')} · {timeAgo(incident.createdAt)}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold ${statusConfig.color}`}>
                        {statusConfig.label}
                    </span>
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="p-1 rounded-lg hover:bg-white/60 transition-colors"
                    >
                        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                </div>
            </div>

            {/* Metrics Bar */}
            <div className="px-4 py-2 bg-white/50 flex items-center gap-6 text-xs">
                <div className="flex items-center gap-1.5">
                    <span className="text-gray-400">EAR</span>
                    <span className={`font-mono font-semibold ${
                        (incident.metrics?.ear || 0) < 0.22 ? 'text-red-600' : 'text-gray-700'
                    }`}>
                        {(incident.metrics?.ear || 0).toFixed(3)}
                    </span>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="text-gray-400">PERCLOS</span>
                    <span className={`font-mono font-semibold ${
                        (incident.metrics?.perclos || 0) > 0.4 ? 'text-red-600' : 'text-gray-700'
                    }`}>
                        {((incident.metrics?.perclos || 0) * 100).toFixed(1)}%
                    </span>
                </div>
                {incident.liveSessionActive && (
                    <div className="flex items-center gap-1 text-purple-600 font-medium">
                        <Radio size={12} className="animate-pulse" />
                        Live
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="px-4 py-3 bg-white/30 flex items-center gap-2 flex-wrap">
                {incident.status === 'ACTIVE' && (
                    <>
                        <button
                            onClick={() => onAcknowledge(incident._id)}
                            disabled={loading}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                        >
                            <CheckCircle size={13} />
                            Acknowledge
                        </button>
                        <button
                            onClick={() => onMonitor(incident)}
                            disabled={loading}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                        >
                            <Video size={13} />
                            Monitor Live
                        </button>
                    </>
                )}
                {incident.status === 'ACKNOWLEDGED' && (
                    <>
                        <button
                            onClick={() => onMonitor(incident)}
                            disabled={loading}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                        >
                            <Video size={13} />
                            Monitor Live
                        </button>
                        <button
                            onClick={() => onResolve(incident._id)}
                            disabled={loading}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                        >
                            <CheckCircle size={13} />
                            Resolve
                        </button>
                    </>
                )}
                {(incident.status === 'MONITORING' || incident.status === 'ESCALATED') && (
                    <button
                        onClick={() => onResolve(incident._id)}
                        disabled={loading}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                    >
                        <CheckCircle size={13} />
                        Resolve
                    </button>
                )}
            </div>

            {/* Expanded: Timeline */}
            {expanded && incident.timeline && incident.timeline.length > 0 && (
                <div className="px-4 py-3 bg-white/20 border-t border-gray-200/50">
                    <p className="text-xs font-semibold text-gray-600 mb-2">Incident Timeline</p>
                    <div className="space-y-2">
                        {incident.timeline.map((entry, idx) => (
                            <div key={idx} className="flex items-start gap-2 text-xs">
                                <div className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-1.5 flex-shrink-0" />
                                <div>
                                    <span className="font-medium text-gray-700">{entry.status}</span>
                                    <span className="text-gray-400 mx-1">·</span>
                                    <span className="text-gray-500">{entry.note}</span>
                                    <span className="text-gray-300 ml-2">
                                        {new Date(entry.timestamp).toLocaleTimeString('en-IN', {
                                            hour: '2-digit', minute: '2-digit',
                                        })}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// ── Main Component ──────────────────────────────────────────────────────────

const IncidentCenter = () => {
    const { socketReady, incidents, incidentStats, refreshIncidents, socketRef } = useMonitoringContext();
    const [filter, setFilter] = useState('ALL');
    const [loading, setLoading] = useState(false);
    const [monitoringIncident, setMonitoringIncident] = useState(null);

    // ── Filter incidents ─────────────────────────────────────────────────────
    const filteredIncidents = incidents.filter(inc => {
        if (filter === 'ALL') return true;
        if (filter === 'CRITICAL') return ['CRITICAL', 'EMERGENCY'].includes(inc.severity);
        return inc.status === filter;
    });

    // ── Actions ──────────────────────────────────────────────────────────────
    const handleAcknowledge = useCallback(async (incidentId) => {
        try {
            setLoading(true);
            await incidentService.acknowledgeIncident(incidentId);
            toast.success('Incident acknowledged');
            refreshIncidents();
        } catch (err) {
            toast.error(err.message || 'Failed to acknowledge');
        } finally {
            setLoading(false);
        }
    }, [refreshIncidents]);

    const handleResolve = useCallback(async (incidentId) => {
        try {
            setLoading(true);
            await incidentService.resolveIncident(incidentId);
            toast.success('Incident resolved');
            refreshIncidents();
        } catch (err) {
            toast.error(err.message || 'Failed to resolve');
        } finally {
            setLoading(false);
        }
    }, [refreshIncidents]);

    const handleMonitor = useCallback((incident) => {
        setMonitoringIncident(incident);
    }, []);

    const handleCloseMonitor = useCallback(() => {
        setMonitoringIncident(null);
    }, []);

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Shield size={24} className="text-amber-600" />
                        Incident Center
                    </h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Real-time incident management and live escalation
                    </p>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                    {/* Socket status */}
                    <span className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border ${
                        socketReady
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : 'bg-red-50 text-red-600 border-red-200'
                    }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${socketReady ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                        {socketReady ? 'Live' : 'Disconnected'}
                    </span>

                    <button
                        onClick={refreshIncidents}
                        className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-white border border-gray-200 rounded-full hover:border-gray-300 transition-colors"
                    >
                        <RefreshCw size={12} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    icon={<AlertTriangle size={18} className="text-red-500" />}
                    value={incidentStats.active}
                    label="Active Incidents"
                    danger={incidentStats.active > 0}
                />
                <StatCard
                    icon={<Clock size={18} className="text-amber-500" />}
                    value={incidentStats.acknowledged}
                    label="Acknowledged"
                    accent={incidentStats.acknowledged > 0}
                />
                <StatCard
                    icon={<Zap size={18} className="text-orange-600" />}
                    value={incidentStats.criticalActive}
                    label="Critical/Emergency"
                    danger={incidentStats.criticalActive > 0}
                />
                <StatCard
                    icon={<CheckCircle size={18} className="text-green-500" />}
                    value={incidentStats.resolvedToday}
                    label="Resolved Today"
                />
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 flex-wrap">
                <Filter size={14} className="text-gray-400" />
                {[
                    { key: 'ALL', label: 'All' },
                    { key: 'ACTIVE', label: 'Active' },
                    { key: 'CRITICAL', label: 'Critical+' },
                    { key: 'ACKNOWLEDGED', label: 'Acknowledged' },
                    { key: 'MONITORING', label: 'Monitoring' },
                ].map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setFilter(tab.key)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                            filter === tab.key
                                ? 'bg-gray-900 text-white shadow-sm'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                        {tab.label}
                        {tab.key === 'ALL' && incidents.length > 0 && (
                            <span className="ml-1 opacity-60">({incidents.length})</span>
                        )}
                    </button>
                ))}
            </div>

            {/* Incident List */}
            {filteredIncidents.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
                    <Shield size={48} className="text-gray-300 mb-4" />
                    <p className="text-gray-700 font-semibold text-lg mb-1">No Active Incidents</p>
                    <p className="text-gray-400 text-sm max-w-xs">
                        {filter === 'ALL'
                            ? 'All clear! No incidents have been detected. The system is actively monitoring your fleet.'
                            : `No incidents matching the "${filter}" filter.`}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredIncidents.map(incident => (
                        <IncidentCard
                            key={incident._id}
                            incident={incident}
                            onAcknowledge={handleAcknowledge}
                            onResolve={handleResolve}
                            onMonitor={handleMonitor}
                            loading={loading}
                        />
                    ))}
                </div>
            )}

            {/* WebRTC Viewer Modal */}
            {monitoringIncident && (
                <WebRTCViewer
                    incident={monitoringIncident}
                    socketRef={socketRef}
                    onClose={handleCloseMonitor}
                />
            )}
        </div>
    );
};

export default IncidentCenter;
