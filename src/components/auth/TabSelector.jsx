import React from 'react';

const TabSelector = ({ activeTab, onTabChange }) => {
    return (
        <div className="bg-slate-50 p-1 rounded-lg flex mb-8">
            <button
                type="button"
                onClick={() => onTabChange('fleetmanager')}
                className={`flex-1 py-2.5 text-sm font-medium rounded-md transition-all duration-200 ${activeTab === 'fleetmanager'
                    ? 'bg-white text-slate-900 shadow-sm font-semibold'
                    : 'text-slate-500 hover:text-slate-700'
                    }`}
            >
                Fleet Manager
            </button>
            <button
                type="button"
                onClick={() => onTabChange('driver')}
                className={`flex-1 py-2.5 text-sm font-medium rounded-md transition-all duration-200 ${activeTab === 'driver'
                    ? 'bg-white text-slate-900 shadow-sm font-semibold'
                    : 'text-slate-500 hover:text-slate-700'
                    }`}
            >
                Driver
            </button>
        </div>
    );
};

export default TabSelector;
