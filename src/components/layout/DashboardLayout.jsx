import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { authService } from '../../services/authService';

const DashboardLayout = () => {
    const navigate = useNavigate();

    const handleLogout = () => {
        authService.logout();
        navigate('/login', { replace: true });
    };

    return (
        <div className="flex min-h-screen bg-neutral font-sans">
            <Sidebar onLogout={handleLogout} />
            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                <Header onLogout={handleLogout} />
                <main className="flex-1 overflow-y-auto bg-slate-50">
                    <div className="p-8 pb-12 h-full">
                        <div className="max-w-[1600px] mx-auto h-full">
                            <Outlet />
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;
