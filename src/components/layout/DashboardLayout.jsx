import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { authService } from '../../services/authService';
import MonitoringAlertProvider from '../monitoring/MonitoringAlertProvider';

const DashboardLayout = () => {
    const navigate = useNavigate();

    const handleLogout = () => {
        authService.logout();
        navigate('/login', { replace: true });
    };

    return (
        <MonitoringAlertProvider>
            <div className="flex min-h-screen bg-neutral font-sans">
                <Sidebar onLogout={handleLogout} />
                <div className="flex-1 flex flex-col h-screen overflow-hidden">
                    <Header onLogout={handleLogout} />
                    <main className="flex-1 overflow-y-auto bg-slate-50">
                        <div className="p-6 h-full">
                            <div className="max-w-[1600px] mx-auto h-full">
                                <Outlet />
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        </MonitoringAlertProvider>
    );
};

export default DashboardLayout;
