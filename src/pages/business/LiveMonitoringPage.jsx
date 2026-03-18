import React from 'react';
import LiveMonitoringDashboard from '../../components/monitoring/LiveMonitoringDashboard';

/**
 * LiveMonitoringPage
 * Route: /business/monitoring
 * Simple page wrapper for the business-side LiveMonitoringDashboard.
 */
const LiveMonitoringPage = () => {
    return (
        <div className="flex flex-col gap-6">
            <LiveMonitoringDashboard />
        </div>
    );
};

export default LiveMonitoringPage;
