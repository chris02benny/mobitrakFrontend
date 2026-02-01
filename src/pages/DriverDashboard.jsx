import React from 'react';
import { useNavigate } from 'react-router-dom';

const DriverDashboard = () => {
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userRole');
        navigate('/login', { replace: true });
    };

    return (
        <div className="min-h-screen bg-neutral flex items-center justify-center p-4">
            <div className="w-full max-w-2xl p-8 bg-white rounded-lg shadow-lg">
                <h1 className="text-3xl font-bold mb-4 text-center">Driver Dashboard</h1>
                <p className="text-center mb-6">Welcome! You are logged in as a Driver user.</p>
                <button
                    onClick={handleLogout}
                    className="w-full bg-secondary text-white py-2 rounded-lg hover:bg-primary transition-colors"
                >
                    Logout
                </button>
            </div>
        </div>
    );
};

export default DriverDashboard;
