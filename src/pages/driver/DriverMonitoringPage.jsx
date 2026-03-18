import React from 'react';
import DriverMonitoring from '../../components/monitoring/DriverMonitoring';

/**
 * DriverMonitoringPage
 * Route: /driver/monitoring
 * Simple page wrapper for the DriverMonitoring component.
 */
const DriverMonitoringPage = () => {
    return (
        <div className="flex flex-col gap-6">
            <DriverMonitoring />
        </div>
    );
};

export default DriverMonitoringPage;
