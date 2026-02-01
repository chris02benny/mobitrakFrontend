import React from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';

const StatCard = ({ title, value, subtext, subtextIcon, icon, iconBg, iconColor }) => {
    return (
        <div className="bg-white border border-gray-200 rounded-xl p-6 flex items-start justify-between shadow-sm">
            <div>
                <span className="text-sm font-medium text-muted-foreground">{title}</span>
                <div className="text-2xl font-bold text-gray-900 mt-2">{value}</div>
                <div className="flex items-center gap-1 mt-1 text-xs font-medium">
                    {subtextIcon}
                    <span className={subtextIcon ? (subtext.includes('critical') ? 'text-red-700' : 'text-green-800') : 'text-muted-foreground'}>
                        {subtext}
                    </span>
                </div>
            </div>
            <div
                className={`w-10 h-10 rounded-md flex items-center justify-center`}
                style={{ backgroundColor: iconBg, color: iconColor }}
            >
                {icon}
            </div>
        </div>
    );
};

export default StatCard;
