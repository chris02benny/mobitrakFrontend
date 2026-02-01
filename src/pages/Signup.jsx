import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../components/common/Button';
import { Truck, ArrowLeft } from 'lucide-react';
import { authService } from '../services/authService';
import toast from 'react-hot-toast';
import AuthLayout from '../components/auth/AuthLayout';
import TabSelector from '../components/auth/TabSelector';
import AuthInput from '../components/auth/AuthInput';

const Signup = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTabRaw] = useState('fleetmanager'); // 'fleetmanager' or 'driver'
    const [registrationStep, setRegistrationStep] = useState('initial'); // 'initial', 'completion', 'verification'
    const [otp, setOtp] = useState('');
    const [pendingEmail, setPendingEmail] = useState('');

    const setActiveTab = (tab) => {
        setActiveTabRaw(tab);
        setRegistrationStep('initial');

        // Reset forms
        setBusinessForm({
            companyName: '',
            businessEmail: '',
            password: '',
            confirmPassword: ''
        });
        setDriverForm({
            firstName: '',
            lastName: '',
            email: '',
            password: '',
            confirmPassword: ''
        });
    };

    // Business Form State
    const [businessForm, setBusinessForm] = useState({
        companyName: '',
        businessEmail: '',
        password: '',
        confirmPassword: ''
    });

    // Driver Form State
    const [driverForm, setDriverForm] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: ''
    });

    // Handle Input Changes
    const handleBusinessChange = (e) => {
        setBusinessForm({ ...businessForm, [e.target.name]: e.target.value });
    };

    const handleDriverChange = (e) => {
        setDriverForm({ ...driverForm, [e.target.name]: e.target.value });
    };

    // Google Auth handlers removed

    // Handle Business Submission
    const handleBusinessSubmit = async (e) => {
        e.preventDefault();

        try {
            if (businessForm.password !== businessForm.confirmPassword) {
                toast.error("Passwords do not match!");
                return;
            }

            const { confirmPassword, ...data } = businessForm;
            const response = await authService.registerFleetManager(data);
            toast.success("Verification OTP sent to your email!");
            console.log(response);
            setPendingEmail(businessForm.businessEmail);
            setRegistrationStep('verification');
        } catch (error) {
            toast.error(error.message);
        }
    };

    // Handle Driver Submission
    const handleDriverSubmit = async (e) => {
        e.preventDefault();

        try {
            if (driverForm.password !== driverForm.confirmPassword) {
                toast.error("Passwords do not match!");
                return;
            }

            const { confirmPassword, ...data } = driverForm;
            const response = await authService.registerDriver(data);
            toast.success("Verification OTP sent to your email!");
            console.log(response);
            setPendingEmail(driverForm.email);
            setRegistrationStep('verification');
        } catch (error) {
            toast.error(error.message);
        }
    };

    const handleOtpVerify = async (e) => {
        e.preventDefault();
        try {
            const response = await authService.verifyOtp(pendingEmail, otp);
            toast.success("Email verified successfully!");
            // Determine redirect based on role and profile completion
            const role = response.user?.role;
            const isProfileComplete = response.user?.isProfileComplete;

            if (role === 'driver' && !isProfileComplete) {
                // Driver needs to complete profile with DL upload
                navigate('/driver/complete-profile');
            } else if (role === 'fleetmanager') {
                navigate('/business/dashboard');
            } else if (role === 'driver') {
                navigate('/driver/dashboard');
            } else {
                navigate('/login');
            }
        } catch (error) {
            toast.error(error.message || "Invalid OTP");
        }
    };

    return (
        <AuthLayout>
            <div className="flex items-center gap-3 mb-8 lg:hidden">
                <div className="w-10 h-10 bg-primary rounded-md flex items-center justify-center text-white">
                    <Truck size={24} />
                </div>
                <span className="text-2xl font-bold text-slate-900 tracking-tight">mobitrak</span>
            </div>

            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 mb-2">Create an account</h1>
            </div>

            <TabSelector activeTab={activeTab} onTabChange={setActiveTab} />

            <form className="flex flex-col gap-5" onSubmit={activeTab === 'fleetmanager' ? handleBusinessSubmit : handleDriverSubmit}>

                {registrationStep === 'initial' && (
                    <>
                        <div key={activeTab} className="flex flex-col gap-5 animate-fadeIn">
                            {activeTab === 'fleetmanager' ? (
                                <>
                                    <AuthInput
                                        label="Company Name"
                                        name="companyName"
                                        value={businessForm.companyName}
                                        onChange={handleBusinessChange}
                                        placeholder="Acme Logistics Inc."
                                        required
                                    />
                                    <AuthInput
                                        label="Business Email"
                                        type="email"
                                        name="businessEmail"
                                        value={businessForm.businessEmail}
                                        onChange={handleBusinessChange}
                                        placeholder="name@company.com"
                                        required
                                    />
                                    <AuthInput
                                        label="Password"
                                        type="password"
                                        name="password"
                                        value={businessForm.password}
                                        onChange={handleBusinessChange}
                                        placeholder="Create a password"
                                    />
                                    <AuthInput
                                        label="Confirm Password"
                                        type="password"
                                        name="confirmPassword"
                                        value={businessForm.confirmPassword}
                                        onChange={handleBusinessChange}
                                        placeholder="Confirm your password"
                                    />
                                </>
                            ) : (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        <AuthInput
                                            label="First Name"
                                            name="firstName"
                                            value={driverForm.firstName}
                                            onChange={handleDriverChange}
                                            placeholder="John"
                                            required
                                        />
                                        <AuthInput
                                            label="Last Name"
                                            name="lastName"
                                            value={driverForm.lastName}
                                            onChange={handleDriverChange}
                                            placeholder="Doe"
                                            required
                                        />
                                    </div>
                                    <AuthInput
                                        label="Email Address"
                                        type="email"
                                        name="email"
                                        value={driverForm.email}
                                        onChange={handleDriverChange}
                                        placeholder="name@company.com"
                                        required
                                    />
                                    <AuthInput
                                        label="Password"
                                        type="password"
                                        name="password"
                                        value={driverForm.password}
                                        onChange={handleDriverChange}
                                        placeholder="Create a password"
                                    />
                                    <AuthInput
                                        label="Confirm Password"
                                        type="password"
                                        name="confirmPassword"
                                        value={driverForm.confirmPassword}
                                        onChange={handleDriverChange}
                                        placeholder="Confirm your password"
                                    />
                                </>
                            )}
                        </div>

                        <div className="text-sm text-slate-500">
                            Join thousands of fleets moving faster and safer. <br className="hidden sm:inline" />
                            Already have an account? <Link to="/login" className="text-primary font-semibold hover:text-primary/90">Log in</Link>
                        </div>

                        <Button type="submit" variant="primary" size="lg" className="h-12 w-full text-base font-semibold">
                            Get Started
                        </Button>

                        <div className="flex justify-center w-full">
                            {/* Google Auth Removed */}
                        </div>

                        <p className="text-xs text-center text-slate-500 mt-4">
                            By clicking continue, you agree to our <Link to="#" className="underline text-slate-900">Terms of Service</Link> and <Link to="#" className="underline text-slate-900">Privacy Policy</Link>.
                        </p>

                        <style>{`
                            @keyframes fadeIn {
                                from { opacity: 0; transform: translateY(10px); }
                                to { opacity: 1; transform: translateY(0); }
                            }
                            .animate-fadeIn {
                                animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
                            }
                        `}</style>
                    </>
                )}

                {registrationStep === 'completion' && (
                    <>
                        <div className="bg-blue-50 p-4 rounded-lg mb-4">
                            <p className="text-sm text-blue-800">
                                {/* Google User info removed */}
                            </p>
                        </div>

                        {activeTab === 'fleetmanager' ? (
                            <AuthInput
                                label="Company Name"
                                name="companyName"
                                value={businessForm.companyName}
                                onChange={handleBusinessChange}
                                placeholder="Enter your company name"
                                required
                            />
                        ) : (
                            <>
                                <div className="grid grid-cols-2 gap-4">
                                    <AuthInput
                                        label="First Name"
                                        name="firstName"
                                        value={driverForm.firstName}
                                        onChange={handleDriverChange}
                                        required
                                    />
                                    <AuthInput
                                        label="Last Name"
                                        name="lastName"
                                        value={driverForm.lastName}
                                        onChange={handleDriverChange}
                                        required
                                    />
                                </div>
                            </>
                        )}

                        <Button type="submit" variant="primary" size="lg" className="h-12 w-full text-base font-semibold">
                            Complete Registration
                        </Button>
                        <button
                            type="button"
                            onClick={() => setActiveTab(activeTab)}
                            className="w-full text-sm text-slate-500 hover:text-slate-700"
                        >
                            Cancel
                        </button>
                    </>
                )}

                {registrationStep === 'verification' && (
                    <div className="text-center">
                        <div className="bg-blue-50 p-4 rounded-lg mb-6">
                            <p className="text-sm text-blue-800 mb-2">
                                We've sent a verification code to
                            </p>
                            <p className="font-bold text-slate-900">{pendingEmail}</p>
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-medium text-slate-700 mb-2">Enter Verification Code</label>
                            <input
                                type="text"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                className="w-full text-center text-2xl tracking-widest rounded-lg border border-slate-300 px-4 py-3 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                placeholder="123456"
                                maxLength={6}
                                required
                                autoFocus
                            />
                        </div>

                        <Button
                            type="button"
                            onClick={handleOtpVerify}
                            variant="primary"
                            size="lg"
                            className="h-12 w-full text-base font-semibold"
                            disabled={!otp || otp.length < 4}
                        >
                            Verify Email
                        </Button>

                        <button
                            type="button"
                            onClick={() => setRegistrationStep('initial')}
                            className="w-full mt-4 text-sm text-slate-500 hover:text-slate-700"
                        >
                            Back to Registration
                        </button>
                    </div>
                )}
            </form>
        </AuthLayout>
    );
};

export default Signup;

