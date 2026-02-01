import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import MainLayout from './layouts/MainLayout';
import DashboardLayout from './components/layout/DashboardLayout';
import Home from './pages/Home';
import About from './pages/About';
import Contact from './pages/Contact';
import Login from './pages/Login';
import Signup from './pages/Signup';
import DriverProfileCompletion from './pages/DriverProfileCompletion';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Business (Fleet Manager) Pages
import BusinessDashboard from './pages/business/BusinessDashboard';
import LiveFleetMapPage from './pages/business/LiveFleetMapPage';
import VehicleListPage from './pages/business/VehicleListPage';
import DriversPage from './pages/business/DriversPage';
import MaintenancePage from './pages/business/MaintenancePage';
import ReportsPage from './pages/business/ReportsPage';
import BusinessSettingsPage from './pages/business/SettingsPage';

// Driver Pages
import DriverDashboard from './pages/driver/DriverDashboard';
import MyTripsPage from './pages/driver/MyTripsPage';
import MyVehiclePage from './pages/driver/MyVehiclePage';
import DriverSettingsPage from './pages/driver/SettingsPage';

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Home />} />
          <Route path="about" element={<About />} />
          <Route path="contact" element={<Contact />} />
        </Route>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            {/* Business (Fleet Manager) Routes */}
            <Route path="/business/dashboard" element={<BusinessDashboard />} />
            <Route path="/business/map" element={<LiveFleetMapPage />} />
            <Route path="/business/vehicles" element={<VehicleListPage />} />
            <Route path="/business/drivers" element={<DriversPage />} />
            <Route path="/business/maintenance" element={<MaintenancePage />} />
            <Route path="/business/reports" element={<ReportsPage />} />
            <Route path="/business/settings" element={<BusinessSettingsPage />} />

            {/* Driver Routes */}
            <Route path="/driver/dashboard" element={<DriverDashboard />} />
            <Route path="/driver/trips" element={<MyTripsPage />} />
            <Route path="/driver/vehicle" element={<MyVehiclePage />} />
            <Route path="/driver/settings" element={<DriverSettingsPage />} />
          </Route>

          <Route path="/driver/complete-profile" element={<DriverProfileCompletion />} />
        </Route>
      </Routes>
      <Toaster position="top-center" />
    </>
  );
}

export default App;
