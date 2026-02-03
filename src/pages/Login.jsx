import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
// GoogleLogin import removed
import { Mail } from 'lucide-react';
import { authService } from '../services/authService';
import Button from '../components/common/Button';
import AuthLayout from '../components/auth/AuthLayout';
import AuthInput from '../components/auth/AuthInput';
import AuthVisual from '../components/auth/AuthVisual';

const Login = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const data = await authService.login({ email, password });
            const role = data.user?.role || data.role;

            if (role === 'admin') {
                navigate('/admin/dashboard');
            } else if (role === 'fleetmanager') {
                navigate('/business/dashboard');
            } else if (role === 'driver') {
                navigate('/driver/dashboard');
            } else {
                navigate('/');
            }
        } catch (err) {
            console.error(err);
            if (err.status === 400 || err.status === 401) {
                setError(err.message || 'Invalid email or password.');
            } else {
                setError('Login failed. Please try again.');
            }
        }
    };

    // Google Auth handlers removed

    return (
        <div className="flex w-full h-screen bg-white overflow-hidden">

            <AuthVisual
                quote="&quot;With Mobitrak, dispatchers see every vehicle in real time. Our drivers spend less time waiting and more time moving.&quot;"
                author="David Alvarez"
                role="Director of Fleet, Horizon Freight"
                avatar="https://storage.googleapis.com/banani-avatars/avatar%2Fmale%2F35-50%2FEuropean%2F3"
                image="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=2070&auto=format&fit=crop"
            />

            <div className="flex-1 flex flex-col justify-center items-center p-12 overflow-y-auto max-w-full lg:max-w-[50%] bg-white">
                <div className="w-full max-w-[420px] flex flex-col gap-7">

                    <div className="flex items-center gap-3 lg:hidden mb-2">
                        <div className="w-10 h-10 bg-primary rounded-md flex items-center justify-center text-slate-900">
                            {/* Reusing existing Truck icon concept/visual from AuthVisual but simplified for header */}
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-truck"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" /><path d="M15 18H9" /><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" /><circle cx="17" cy="18" r="2" /><circle cx="7" cy="18" r="2" /></svg>
                        </div>
                        <span className="text-2xl font-bold text-slate-900 tracking-tight">mobitrak</span>
                    </div>


                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 mb-2">Sign in to your account</h1>
                        <p className="text-slate-500">
                            Access your fleet dashboard and driver activity.<br className="hidden sm:inline" />
                            <span className="whitespace-nowrap">
                                New here? <Link to="/signup" className="text-primary font-semibold hover:text-primary/90">Create an account</Link>
                            </span>
                        </p>
                    </div>

                    {error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm border border-red-100">
                            {error}
                        </div>
                    )}

                    <form className="flex flex-col gap-5" onSubmit={handleLogin}>
                        <AuthInput
                            label="Work email"
                            type="email"
                            name="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="name@company.com"
                            required
                            icon={Mail}
                        />

                        <div>
                            <AuthInput
                                label="Password"
                                type="password"
                                name="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                            />
                            <div className="flex items-center justify-between mt-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary" />
                                    <span className="text-sm text-slate-500">Remember this device</span>
                                </label>
                                <Link to="#" className="text-sm font-medium text-primary hover:text-primary/90">
                                    Forgot password?
                                </Link>
                            </div>
                        </div>

                        <Button type="submit" variant="primary" size="lg" className="h-12 w-full text-base font-bold text-slate-900 hover:bg-primary/90 transition-colors">
                            Sign in
                        </Button>
                    </form>

                    <div className="flex justify-center w-full">
                        {/* Google Auth Removed */}
                    </div>

                    <p className="text-xs text-center text-slate-500 mt-4">
                        By continuing, you agree to Mobitrak's <Link to="#" className="underline text-slate-900">Terms</Link> and <Link to="#" className="underline text-slate-900">Privacy Policy</Link>.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
