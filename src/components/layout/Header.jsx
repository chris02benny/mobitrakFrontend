import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, Settings, LogOut } from 'lucide-react';
import NotificationBell from '../common/NotificationBell';

const Header = ({ onLogout }) => {
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();
    const location = useLocation();

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Dynamic title and subtitle based on current path
    const getHeaderContent = () => {
        const path = location.pathname;

        // Admin routes
        if (path === '/admin/dashboard') {
            return { title: 'Admin Dashboard', subtitle: 'Platform overview and statistics' };
        } else if (path === '/admin/businesses') {
            return { title: 'Businesses', subtitle: 'Manage fleet manager accounts' };
        } else if (path === '/admin/drivers') {
            return { title: 'Drivers', subtitle: 'View all driver accounts' };
        } else if (path === '/admin/verifications') {
            return { title: 'Verifications', subtitle: 'Process business verification requests' };
        } else if (path === '/admin/settings') {
            return { title: 'Settings', subtitle: 'Manage admin settings' };
        }

        // Business routes
        else if (path === '/business/dashboard') {
            return { title: 'Dashboard', subtitle: 'Overview of your fleet status today' };
        } else if (path === '/business/trips') {
            return { title: 'Trip Management', subtitle: 'Schedule and manage your fleet trips' };
        } else if (path === '/business/hire') {
            return { title: 'Hire Drivers', subtitle: 'Find and hire qualified drivers for your fleet' };
        } else if (path === '/business/map') {
            return { title: 'Live Fleet Map', subtitle: 'Track your vehicles in real-time' };
        } else if (path === '/business/vehicles') {
            return { title: 'Vehicles', subtitle: 'Manage your fleet vehicles' };
        } else if (path === '/business/drivers') {
            return { title: 'My Drivers', subtitle: 'Manage your hired drivers' };
        } else if (path === '/business/maintenance') {
            return { title: 'Maintenance', subtitle: 'Track vehicle maintenance schedules' };
        } else if (path === '/business/reports') {
            return { title: 'Reports', subtitle: 'View analytics and reports' };
        } else if (path === '/business/settings') {
            return { title: 'Profile', subtitle: 'Manage your account information' };
        }

        // Driver routes
        else if (path === '/driver/dashboard') {
            return { title: 'Dashboard', subtitle: 'Your driving overview' };
        } else if (path === '/driver/trips') {
            return { title: 'My Trips', subtitle: 'View your trip history' };
        } else if (path === '/driver/vehicle') {
            return { title: 'My Vehicle', subtitle: 'Your assigned vehicle details' };
        } else if (path === '/driver/settings') {
            return { title: 'Profile', subtitle: 'Manage your account information' };
        }

        return { title: 'Dashboard', subtitle: 'Overview' };
    };

    const { title, subtitle } = getHeaderContent();

    const handleProfileClick = () => {
        const userRole = localStorage.getItem('userRole');
        let settingsPath = '/';
        if (userRole === 'admin') settingsPath = '/admin/settings';
        else if (userRole === 'fleetmanager') settingsPath = '/business/settings';
        else if (userRole === 'driver') settingsPath = '/driver/settings';
        navigate(settingsPath);
        setShowDropdown(false);
    };

    return (
        <header className="h-[72px] border-b border-gray-200 bg-white flex items-center justify-between px-8 flex-shrink-0">
            <div>
                <h1 className="text-xl font-bold text-gray-900 m-0">{title}</h1>
                <span className="text-sm text-gray-500">{subtitle}</span>
            </div>

            <div className="flex items-center gap-6">
                {/* Notification Bell */}
                <NotificationBell />

                {/* Settings Dropdown */}
                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={() => setShowDropdown(!showDropdown)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <Settings size={22} className="text-gray-900" />
                    </button>

                    {showDropdown && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                            <button
                                onClick={handleProfileClick}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                Profile
                            </button>
                            <div className="border-t border-gray-200 my-1"></div>
                            <button
                                onClick={() => {
                                    setShowDropdown(false);
                                    onLogout();
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                            >
                                <LogOut size={16} />
                                Logout
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;
