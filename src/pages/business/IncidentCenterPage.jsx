import React from 'react';
import IncidentCenter from '../../components/monitoring/IncidentCenter';

/**
 * IncidentCenterPage
 * Route: /business/incidents
 * Page wrapper for the real-time Incident Center dashboard.
 */
const IncidentCenterPage = () => {
    return (
        <div className="flex flex-col gap-6">
            <IncidentCenter />
        </div>
    );
};

export default IncidentCenterPage;
