import React from 'react';
import { X, AlertTriangle, CheckCircle, Info } from 'lucide-react';

const ConfirmationModal = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    title, 
    message, 
    type = 'warning', // 'warning', 'danger', 'info', 'success'
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    loading = false
}) => {
    if (!isOpen) return null;

    const getIcon = () => {
        switch (type) {
            case 'danger':
                return <AlertTriangle size={48} className="text-red-500" />;
            case 'success':
                return <CheckCircle size={48} className="text-green-500" />;
            case 'info':
                return <Info size={48} className="text-blue-500" />;
            case 'warning':
            default:
                return <AlertTriangle size={48} className="text-amber-500" />;
        }
    };

    const getButtonClass = () => {
        switch (type) {
            case 'danger':
                return 'bg-red-600 hover:bg-red-700 text-white';
            case 'success':
                return 'bg-green-600 hover:bg-green-700 text-white';
            case 'info':
                return 'bg-blue-600 hover:bg-blue-700 text-white';
            case 'warning':
            default:
                return 'bg-primary hover:bg-amber-400 text-secondary';
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="p-6 flex justify-end">
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        disabled={loading}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="px-6 pb-6 text-center">
                    <div className="flex justify-center mb-4">
                        {getIcon()}
                    </div>
                    
                    <h3 className="text-xl font-bold text-gray-900 mb-3">
                        {title}
                    </h3>
                    
                    <p className="text-gray-600 mb-6">
                        {message}
                    </p>

                    {/* Actions */}
                    <div className="flex gap-3 justify-center">
                        <button
                            onClick={onClose}
                            className="px-6 py-2.5 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium transition-colors"
                            disabled={loading}
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={onConfirm}
                            className={`px-6 py-2.5 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${getButtonClass()}`}
                            disabled={loading}
                        >
                            {loading ? 'Processing...' : confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;
