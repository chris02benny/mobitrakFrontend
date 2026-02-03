import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { authService } from '../../services/authService';

const ProtectedRoute = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const authToken = localStorage.getItem('authToken');
    const [loading, setLoading] = useState(true);
    const [profileComplete, setProfileComplete] = useState(true);
    const [userRole, setUserRole] = useState(null);

    // Check profile completion status
    useEffect(() => {
        const checkProfileCompletion = async () => {
            try {
                const { user } = await authService.getProfile();
                setUserRole(user.role);
                setProfileComplete(user.isProfileComplete);
                setLoading(false);

                // If driver and profile incomplete, redirect to completion page
                if (user.role === 'driver' && !user.isProfileComplete && location.pathname !== '/driver/complete-profile') {
                    navigate('/driver/complete-profile', { replace: true });
                }

                // Redirect admin to admin dashboard if they're trying to access other dashboards
                if (user.role === 'admin' && !location.pathname.startsWith('/admin')) {
                    navigate('/admin/dashboard', { replace: true });
                }
            } catch (error) {
                console.error('Error checking profile:', error);
                setLoading(false);
            }
        };

        if (authToken) {
            checkProfileCompletion();
        } else {
            setLoading(false);
        }
    }, [authToken, navigate, location.pathname]);

    // Monitor authentication state to prevent back button access after logout
    useEffect(() => {
        const checkAuth = () => {
            const token = localStorage.getItem('authToken');
            if (!token) {
                // If token is removed (logout), redirect to login
                navigate('/login', { replace: true });
            }
        };

        // Check auth state on mount and when storage changes
        checkAuth();

        // Listen for storage changes (e.g., logout in another tab)
        window.addEventListener('storage', checkAuth);

        return () => {
            window.removeEventListener('storage', checkAuth);
        };
    }, [navigate]);

    if (!authToken) {
        // Redirect to login if not authenticated
        // replace: true prevents going back to the protected page via history
        return <Navigate to="/login" replace />;
    }

    if (loading) {
        // Show loading state while checking profile
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    // If authenticated, render the child routes
    return <Outlet />;
};

export default ProtectedRoute;
