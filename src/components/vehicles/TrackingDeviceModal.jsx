import React, { useState, useEffect } from 'react';
import { X, MapPin, Save, Eye, EyeOff, Loader2 } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const TrackingDeviceModal = ({ isOpen, onClose, vehicle, onSuccess }) => {
    const [credentials, setCredentials] = useState({
        email: '',
        password: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [fetchingExisting, setFetchingExisting] = useState(true);

    useEffect(() => {
        if (isOpen && vehicle) {
            fetchExistingCredentials();
        }
    }, [isOpen, vehicle]);

    const fetchExistingCredentials = async () => {
        try {
            const token = localStorage.getItem('authToken');
            const response = await axios.get(
                `http://localhost:5002/api/tracking-device/credentials/${vehicle._id}`,
                {
                    headers: { 'x-auth-token': token }
                }
            );

            if (response.data.success) {
                setCredentials({
                    email: response.data.data.email,
                    password: '' // Don't populate password for security
                });
            }
        } catch (error) {
            // 404 means no credentials exist yet, which is fine
            if (error.response?.status !== 404) {
                console.error('Error fetching credentials:', error);
            }
        } finally {
            setFetchingExisting(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setCredentials(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!credentials.email || !credentials.password) {
            toast.error('Please fill in both email and password fields');
            return;
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(credentials.email)) {
            toast.error('Please enter a valid email address');
            return;
        }

        setIsLoading(true);

        try {
            const token = localStorage.getItem('authToken');
            const response = await axios.post(
                'http://localhost:5002/api/tracking-device/credentials',
                {
                    ...credentials,
                    vehicleId: vehicle._id
                },
                {
                    headers: { 'x-auth-token': token }
                }
            );

            if (response.data.success) {
                toast.success(response.data.message);
                if (onSuccess) onSuccess();
                onClose();
            }
        } catch (error) {
            console.error('Error saving device credentials:', error);
            const errorMessage = error.response?.data?.error || 'Failed to save device credentials';
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                            <MapPin className="text-amber-600" size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">
                                Live Tracking Device
                            </h2>
                            <p className="text-sm text-gray-600">
                                {vehicle?.regnNo || vehicle?.registrationNumber}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Body */}
                {fetchingExisting ? (
                    <div className="flex items-center justify-center p-12">
                        <div className="flex flex-col items-center gap-3">
                            <Loader2 className="animate-spin text-amber-600" size={32} />
                            <p className="text-gray-600 text-sm">Loading...</p>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="p-6 space-y-5">
                        <p className="text-sm text-gray-600">
                            Configure GPS tracking device credentials for real-time vehicle monitoring
                        </p>

                        {/* Email Field */}
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                                Device Email Address
                            </label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={credentials.email}
                                onChange={handleInputChange}
                                placeholder="device@example.com"
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                                required
                            />
                        </div>

                        {/* Password Field */}
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                                Device Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    id="password"
                                    name="password"
                                    value={credentials.password}
                                    onChange={handleInputChange}
                                    placeholder="Enter device password"
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors pr-12"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        {/* Info Box */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <p className="text-xs text-blue-800">
                                Your credentials are encrypted and stored securely. They will be used to authenticate with your GPS tracking device provider.
                            </p>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
                            >
                                <Save size={18} />
                                {isLoading ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default TrackingDeviceModal;
