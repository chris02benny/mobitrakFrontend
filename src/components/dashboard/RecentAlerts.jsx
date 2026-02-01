import React from 'react';
import { MoreHorizontal } from 'lucide-react';

const AlertItem = ({ color, title, description, time }) => {
    return (
        <div className="flex items-start justify-between py-4 border-b border-gray-200 last:border-b-0 px-6 hover:bg-gray-50 transition-colors">
            <div className="flex gap-3 items-start">
                <div
                    className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0`}
                    style={{ backgroundColor: color }}
                ></div>
                <div>
                    <div className="text-sm font-medium text-gray-900">{title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{description}</div>
                </div>
            </div>
            <span className="text-[11px] text-muted-foreground whitespace-nowrap ml-2">{time}</span>
        </div>
    );
};

const RecentAlerts = () => {
    return (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col h-full">
            <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
                <span className="font-semibold text-gray-900">Recent Alerts</span>
                <MoreHorizontal size={20} className="text-muted-foreground cursor-pointer hover:text-gray-700" />
            </div>
            <div className="overflow-y-auto flex-1">
                <AlertItem
                    color="#ef4444"
                    title="Speeding Alert"
                    description="Vehicle #T-294 • 85km/h in 60 zone"
                    time="2m ago"
                />
                <AlertItem
                    color="#f59e0b"
                    title="Geofence Breach"
                    description="Vehicle #V-103 • Left Zone B"
                    time="15m ago"
                />
                <AlertItem
                    color="#f59e0b"
                    title="Harsh Braking"
                    description="Vehicle #T-440 • Driver: Mike R."
                    time="42m ago"
                />
                <AlertItem
                    color="#22c55e"
                    title="Maintenance Done"
                    description="Vehicle #V-002 • Service Complete"
                    time="1h ago"
                />
            </div>
            <div className="p-4 border-t border-gray-200 mt-auto text-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer">
                <span className="text-sm font-medium text-primary">View All Alerts</span>
            </div>
        </div>
    );
};

export default RecentAlerts;
