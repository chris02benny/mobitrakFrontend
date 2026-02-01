import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';

const MainLayout = () => {
    const location = useLocation();
    const hideFooterRoutes = ['/signup', '/login'];

    return (
        <div className="flex flex-col min-h-screen bg-neutral">
            <Navbar />
            <main className={`flex-grow ${hideFooterRoutes.includes(location.pathname) ? '' : 'pt-20'}`}> {/* pt-20 to account for fixed navbar, removed for auth pages */}
                <Outlet />
            </main>
            {!hideFooterRoutes.includes(location.pathname) && <Footer />}
        </div>
    );
};

export default MainLayout;
