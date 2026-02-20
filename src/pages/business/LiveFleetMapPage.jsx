import React from 'react';
import LiveFleetMap from '../../components/dashboard/LiveFleetMap';

const LiveFleetMapPage = () => {
    return (
        <div className="h-full">
            <LiveFleetMap isFullPage={true} />
        </div>
    );
};

export default LiveFleetMapPage;
