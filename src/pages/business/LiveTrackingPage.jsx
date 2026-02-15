import React, { useState, useEffect } from 'react';
import { MapPin, Save, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';

const LiveTrackingPage = () => {
    const [deviceCredentials, setDeviceCredentials] = useState({
        email: '',
        password: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [fetchingCredentials, setFetchingCredentials] = useState(true);

    // Fetch existing credentials on mount
    useEffect(() => {
        fetchExistingCredentials();
    }, []);

    const fetchExistingCredentials = async () => {
        try {
            const token = localStorage.getItem('authToken');
            const response = await axios.get('http://localhost:5002/api/tracking-device/credentials', {
                headers: { 'x-auth-token': token }
            });

            if (response.data.success) {
                setDeviceCredentials({
                    email: response.data.data.email,
                    password: '' // Don't populate password for security
                });
                setIsSaved(true);
            }
        } catch (error) {
            // 404 means no credentials exist yet, which is fine
            if (error.response?.status !== 404) {
                console.error('Error fetching credentials:', error);
            }
        } finally {
            setFetchingCredentials(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setDeviceCredentials(prev => ({
            ...prev,
            [name]: value
        }));
        setIsSaved(false);
    };

    const handleSaveCredentials = async (e) => {
        e.preventDefault();
        
        if (!deviceCredentials.email || !deviceCredentials.password) {
            toast.error('Please fill in both email and password fields');
            return;
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(deviceCredentials.email)) {
            toast.error('Please enter a valid email address');
            return;
        }

        setIsLoading(true);
        
        try {
            const token = localStorage.getItem('authToken');
            const response = await axios.post(
                'http://localhost:5002/api/tracking-device/credentials',
                deviceCredentials,
                {
                    headers: { 'x-auth-token': token }
                }
            );
            
            if (response.data.success) {
                toast.success(response.data.message);
                setIsSaved(true);
                // Clear the password input for security
                setDeviceCredentials(prev => ({
                    ...prev,
                    password: ''
                }));
            }
        } catch (error) {
            console.error('Error saving device credentials:', error);
            const errorMessage = error.response?.data?.error || 'Failed to save device credentials';
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-8">
            {/* Loading State */}
            {fetchingCredentials ? (
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="flex flex-col items-center gap-3">
                        <Loader2 className="animate-spin text-amber-600" size={40} />
                        <p className="text-gray-600">Loading device credentials...</p>
                    </div>
                </div>
            ) : (
                <>
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                            <MapPin className="text-amber-600" size={32} />
                            Live Tracking Device Setup
                        </h1>
                        <p className="text-gray-600 mt-2">
                            Configure your live tracking device credentials to enable real-time vehicle monitoring
                        </p>
                    </div>

            {/* Info Alert */}
            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
                <AlertCircle className="text-blue-600 flex-shrink-0" size={20} />
                <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">About Live Tracking Devices</p>
                    <p>
                        Enter the credentials for your GPS tracking device. This allows the system to access 
                        real-time location data from your tracking hardware. Your credentials are encrypted and stored securely.
                    </p>
                </div>
            </div>

            {/* Credentials Form */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden max-w-2xl">
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">Device Credentials</h2>
                    <p className="text-sm text-gray-600 mt-1">
                        Enter the email and password associated with your tracking device
                    </p>
                </div>

                <form onSubmit={handleSaveCredentials} className="p-6 space-y-6">
                    {/* Email Field */}
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                            Device Email Address
                        </label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            value={deviceCredentials.email}
                            onChange={handleInputChange}
                            placeholder="device@example.com"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                            required
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            The email address registered with your GPS tracking device
                        </p>
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
                                value={deviceCredentials.password}
                                onChange={handleInputChange}
                                placeholder="Enter device password"
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors pr-12"
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
                        <p className="text-xs text-gray-500 mt-1">
                            The password for your GPS tracking device account
                        </p>
                    </div>

                    {/* Save Status */}
                    {isSaved && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-sm text-green-800 font-medium">
                                Credentials saved and active
                            </span>
                        </div>
                    )}

                    {/* Submit Button */}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="flex items-center gap-2 px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
                        >
                            <Save size={20} />
                            {isLoading ? 'Saving...' : 'Save Credentials'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Additional Information */}
            <div className="mt-6 max-w-2xl">
                <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
                    <h3 className="font-semibold text-gray-900 mb-3">Security & Privacy</h3>
                    <ul className="space-y-2 text-sm text-gray-600">
                        <li className="flex items-start gap-2">
                            <span className="text-amber-600 mt-0.5">•</span>
                            <span>Your device credentials are encrypted using industry-standard encryption</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-amber-600 mt-0.5">•</span>
                            <span>Credentials are only used to authenticate with your tracking device provider</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-amber-600 mt-0.5">•</span>
                            <span>You can update or remove your credentials at any time</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-amber-600 mt-0.5">•</span>
                            <span>All data transmission is secured with HTTPS protocol</span>
                        </li>
                    </ul>
                </div>
            </div>
                </>
            )}
        </div>
    );
};

export default LiveTrackingPage;
