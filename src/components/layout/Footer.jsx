import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
    return (
        <footer className="bg-gray-900 text-white pt-16 pb-8">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
                    {/* Brand */}
                    <div className="md:col-span-1">
                        <Link to="/" className="text-2xl font-bold text-white flex items-center gap-2 mb-4">
                            <span className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-secondary text-lg">M</span>
                            Mobitrak
                        </Link>
                        <p className="text-gray-400 text-sm">
                            Empowering fleets with real-time tracking, analytics, and efficiency optimization.
                        </p>
                    </div>

                    {/* Links 1 */}
                    <div>
                        <h3 className="text-lg font-semibold mb-4 text-white">Company</h3>
                        <ul className="space-y-2">
                            <li><Link to="/about" className="text-gray-400 hover:text-secondary transition-colors">About Us</Link></li>
                            <li><Link to="/careers" className="text-gray-400 hover:text-secondary transition-colors">Careers</Link></li>
                            <li><Link to="/blog" className="text-gray-400 hover:text-secondary transition-colors">Blog</Link></li>
                        </ul>
                    </div>

                    {/* Links 2 */}
                    <div>
                        <h3 className="text-lg font-semibold mb-4 text-white">Product</h3>
                        <ul className="space-y-2">
                            <li><Link to="/features" className="text-gray-400 hover:text-secondary transition-colors">Features</Link></li>
                            <li><Link to="/pricing" className="text-gray-400 hover:text-secondary transition-colors">Pricing</Link></li>
                            <li><Link to="/demo" className="text-gray-400 hover:text-secondary transition-colors">Request Demo</Link></li>
                        </ul>
                    </div>

                    {/* Contact */}
                    <div>
                        <h3 className="text-lg font-semibold mb-4 text-white">Contact</h3>
                        <ul className="space-y-2 text-gray-400 text-sm">
                            <li>123 Fleet Avenue</li>
                            <li>Tech City, TC 90210</li>
                            <li>+1 (555) 123-4567</li>
                            <li>support@mobitrak.com</li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center text-sm text-gray-500">
                    <p>&copy; {new Date().getFullYear()} Mobitrak Inc. All rights reserved.</p>
                    <div className="flex gap-4 mt-4 md:mt-0">
                        <Link to="/privacy" className="hover:text-white">Privacy Policy</Link>
                        <Link to="/terms" className="hover:text-white">Terms of Service</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
