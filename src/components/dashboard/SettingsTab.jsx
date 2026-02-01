import React, { useState, useEffect } from 'react';
import Card from '../common/Card';
import Button from '../common/Button';
import { Eye, EyeOff, Lock, CheckCircle, AlertTriangle } from 'lucide-react';
import { authService } from '../../services/authService';
import toast from 'react-hot-toast';

const SettingsTab = () => {
    const [hasPassword, setHasPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        password: '',
        confirmPassword: ''
    });
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        const storedHasPass = localStorage.getItem('userHasPassword') === 'true';
        setHasPassword(storedHasPass);
    }, []);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (formData.password.length < 6) {
            toast.error("Password must be at least 6 characters long.");
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            toast.error("Passwords do not match!");
            return;
        }

        setLoading(true);
        try {
            await authService.updatePassword(formData.password);
            toast.success("Password updated successfully!");
            setHasPassword(true);
            localStorage.setItem('userHasPassword', 'true');
            setFormData({ password: '', confirmPassword: '' });
        } catch (error) {
            console.error(error);
            toast.error(error.message || "Failed to update password");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Account Settings</h2>

            <Card className="p-8">
                <div className="flex items-start gap-4 mb-6">
                    <div className={`p-3 rounded-lg ${hasPassword ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>
                        <Lock size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">
                            {hasPassword ? "Change Password" : "Set Password"}
                        </h3>
                        <p className="text-gray-500 text-sm mt-1">
                            {hasPassword
                                ? "Update your existing password to keep your account secure."
                                : "You currently don't have a password set (logged in via Google). Set one to enable email/password login."}
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {hasPassword ? "New Password" : "Create Password"}
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all pr-10"
                                placeholder={hasPassword ? "Enter new password" : "Enter a strong password"}
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all pr-10"
                                placeholder="Confirm your new password"
                                required
                            />
                        </div>
                    </div>

                    <div className="pt-4">
                        <Button
                            type="submit"
                            variant="primary"
                            size="lg"
                            className="w-full flex items-center justify-center gap-2"
                            disabled={loading}
                        >
                            {loading ? "Updating..." : (hasPassword ? "Update Password" : "Set Password")}
                            {!loading && <CheckCircle size={18} />}
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
};

export default SettingsTab;
