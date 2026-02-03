import React from 'react';
import { CheckCircle, ShieldCheck } from 'lucide-react';

/**
 * Verified Business Badge Component
 * Displays a blue tick for Mobitrak verified businesses
 */
const VerifiedBadge = ({ size = 'md', showText = true, className = '' }) => {
    const sizeClasses = {
        sm: { icon: 14, text: 'text-xs' },
        md: { icon: 18, text: 'text-sm' },
        lg: { icon: 24, text: 'text-base' }
    };

    const { icon, text } = sizeClasses[size] || sizeClasses.md;

    return (
        <div className={`inline-flex items-center gap-1.5 ${className}`}>
            <div className="text-blue-500" title="Mobitrak Verified Business">
                <ShieldCheck size={icon} fill="currentColor" />
            </div>
            {showText && (
                <span className={`font-medium text-blue-600 ${text}`}>
                    Mobitrak Verified
                </span>
            )}
        </div>
    );
};

/**
 * Verification Status Badge
 * Shows the current verification status with appropriate styling
 */
export const VerificationStatusBadge = ({ status, isVerified }) => {
    if (isVerified) {
        return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm font-medium border border-blue-200">
                <ShieldCheck size={16} fill="currentColor" />
                Mobitrak Verified Business
            </span>
        );
    }

    switch (status) {
        case 'pending':
            return (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-full text-sm font-medium border border-amber-200">
                    <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                    Verification Pending
                </span>
            );
        case 'rejected':
            return (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 rounded-full text-sm font-medium border border-red-200">
                    Verification Rejected
                </span>
            );
        default:
            return (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 text-gray-600 rounded-full text-sm font-medium border border-gray-200">
                    Not Verified
                </span>
            );
    }
};

export default VerifiedBadge;
