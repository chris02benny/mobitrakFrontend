import React, { useState } from 'react';
import { X, Mail, Lock, CheckCircle } from 'lucide-react';
import Button from '../common/Button';
import AuthInput from './AuthInput';

const ForgotPasswordModal = ({ isOpen, onClose, onSuccess }) => {
    const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Password
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState('');

    if (!isOpen) return null;

    const handleClose = () => {
        setStep(1);
        setEmail('');
        setOtp('');
        setNewPassword('');
        setConfirmPassword('');
        setError('');
        setSuccess('');
        onClose();
    };

    const handleSendOtp = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const BASE_URL = import.meta.env.VITE_API_URL || 'https://g5ly7nfs0m.execute-api.ap-south-1.amazonaws.com';
            const response = await fetch(`${BASE_URL}/api/users/forgot-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to send OTP');
            }

            setSuccess('OTP sent to your email. Please check your inbox.');
            setStep(2);
        } catch (err) {
            setError(err.message || 'Failed to send OTP. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const BASE_URL = import.meta.env.VITE_API_URL || 'https://g5ly7nfs0m.execute-api.ap-south-1.amazonaws.com';
            const response = await fetch(`${BASE_URL}/api/users/verify-reset-otp`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, otp }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Invalid OTP');
            }

            setSuccess('OTP verified! Now set your new password.');
            setStep(3);
        } catch (err) {
            setError(err.message || 'Invalid OTP. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setError('');

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (newPassword.length < 6) {
            setError('Password must be at least 6 characters long');
            return;
        }

        setLoading(true);

        try {
            const BASE_URL = import.meta.env.VITE_API_URL || 'https://g5ly7nfs0m.execute-api.ap-south-1.amazonaws.com';
            const response = await fetch(`${BASE_URL}/api/users/reset-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, otp, newPassword }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to reset password');
            }

            setSuccess('Password reset successfully! Redirecting to login...');
            setTimeout(() => {
                handleClose();
                if (onSuccess) {
                    onSuccess();
                }
            }, 2000);
        } catch (err) {
            setError(err.message || 'Failed to reset password. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 relative">
                {/* Close Button */}
                <button
                    onClick={handleClose}
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
                    disabled={loading}
                >
                    <X size={24} />
                </button>

                {/* Modal Header */}
                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">
                        {step === 1 && 'Forgot Password'}
                        {step === 2 && 'Verify OTP'}
                        {step === 3 && 'Set New Password'}
                    </h2>
                    <p className="text-slate-500 text-sm">
                        {step === 1 && 'Enter your email to receive a verification code'}
                        {step === 2 && 'Enter the 6-digit code sent to your email'}
                        {step === 3 && 'Create a new password for your account'}
                    </p>
                </div>

                {/* Success Message */}
                {success && (
                    <div className="bg-green-50 text-green-600 p-3 rounded-md text-sm border border-green-100 mb-4 flex items-center gap-2">
                        <CheckCircle size={18} />
                        {success}
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm border border-red-100 mb-4">
                        {error}
                    </div>
                )}

                {/* Step 1: Email Input */}
                {step === 1 && (
                    <form onSubmit={handleSendOtp} className="space-y-4">
                        <AuthInput
                            label="Email Address"
                            type="email"
                            name="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="name@company.com"
                            required
                            icon={Mail}
                        />
                        <Button
                            type="submit"
                            variant="primary"
                            size="lg"
                            className="w-full"
                            disabled={loading}
                        >
                            {loading ? 'Sending...' : 'Send OTP'}
                        </Button>
                    </form>
                )}

                {/* Step 2: OTP Verification */}
                {step === 2 && (
                    <form onSubmit={handleVerifyOtp} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Verification Code
                            </label>
                            <input
                                type="text"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                placeholder="000000"
                                maxLength={6}
                                required
                                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-center text-2xl tracking-widest font-semibold"
                            />
                        </div>
                        <div className="flex gap-3">
                            <Button
                                type="button"
                                variant="outline"
                                size="lg"
                                className="flex-1"
                                onClick={() => setStep(1)}
                                disabled={loading}
                            >
                                Back
                            </Button>
                            <Button
                                type="submit"
                                variant="primary"
                                size="lg"
                                className="flex-1"
                                disabled={loading || otp.length !== 6}
                            >
                                {loading ? 'Verifying...' : 'Verify OTP'}
                            </Button>
                        </div>
                    </form>
                )}

                {/* Step 3: New Password */}
                {step === 3 && (
                    <form onSubmit={handleResetPassword} className="space-y-4">
                        <AuthInput
                            label="New Password"
                            type="password"
                            name="newPassword"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            icon={Lock}
                        />
                        <AuthInput
                            label="Confirm Password"
                            type="password"
                            name="confirmPassword"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            icon={Lock}
                        />
                        <Button
                            type="submit"
                            variant="primary"
                            size="lg"
                            className="w-full"
                            disabled={loading}
                        >
                            {loading ? 'Resetting...' : 'Reset Password'}
                        </Button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default ForgotPasswordModal;
