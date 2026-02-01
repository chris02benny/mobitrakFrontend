import React from 'react';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import { Link } from 'react-router-dom';

import { Satellite, BarChart3, Wrench, Map } from 'lucide-react';

const Home = () => {
    const features = [
        { title: 'Real-Time Tracking', description: 'Monitor your fleet 24/7 with precision GPS tracking and live updates.', icon: <Satellite className="w-10 h-10 text-primary mx-auto" /> },
        { title: 'Advanced Analytics', description: 'Gain actionable insights with comprehensive reports on fuel, usage, and driver behavior.', icon: <BarChart3 className="w-10 h-10 text-primary mx-auto" /> },
        { title: 'Maintenance Alerts', description: 'Never miss a service. Automated scheduling keeps your vehicles in top condition.', icon: <Wrench className="w-10 h-10 text-primary mx-auto" /> },
        { title: 'Route Optimization', description: 'Save time and fuel with AI-powered route planning and traffic adjustments.', icon: <Map className="w-10 h-10 text-primary mx-auto" /> },
    ];

    return (
        <div>
            {/* Hero Section */}
            <section className="relative bg-primary text-gray-900 py-24 sm:py-32 overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1519003722822-29c423d6a2f4?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80')] bg-cover bg-center opacity-10 mix-blend-multiply"></div>
                <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight mb-6">
                        Revolutionize Your <span className="text-white">Fleet Management</span>
                    </h1>
                    <p className="max-w-2xl mx-auto text-lg sm:text-xl text-gray-800 mb-10 font-medium">
                        Mobitrak provides the tools you need to optimize operations, reduce costs, and ensure safety across your entire organization.
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                        <Link to="/signup">
                            <Button variant="secondary" size="lg" className="shadow-lg">Get Started Free</Button>
                        </Link>
                        <Link to="/contact">
                            <Button variant="outline" size="lg" className="border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white">
                                Contact Sales
                            </Button>
                        </Link>
                    </div>
                </div>
            </section>
            {/* Features Section */}
            <section className="py-20 bg-neutral">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold text-gray-900 mb-4">Everything You Need to Succeed</h2>
                        <p className="text-gray-600 max-w-2xl mx-auto">
                            Our comprehensive platform covers every aspect of modern fleet management, giving you total control.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {features.map((feature, index) => (
                            <Card key={index} className="p-6 text-center" hover>
                                <div className="mb-4">{feature.icon}</div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">{feature.title}</h3>
                                <p className="text-gray-600">{feature.description}</p>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 bg-white">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="bg-primary rounded-3xl p-8 md:p-16 text-center text-gray-900 relative overflow-hidden">
                        {/* Decorative circles */}
                        <div className="absolute top-0 left-0 w-64 h-64 bg-secondary rounded-full mix-blend-multiply filter blur-3xl opacity-10 -translate-x-1/2 -translate-y-1/2"></div>
                        <div className="absolute bottom-0 right-0 w-64 h-64 bg-accent rounded-full mix-blend-multiply filter blur-3xl opacity-20 translate-x-1/2 translate-y-1/2"></div>

                        <div className="relative z-10">
                            <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Optimize Your Fleet?</h2>
                            <p className="text-lg text-gray-800 mb-8 max-w-2xl mx-auto font-medium">
                                Join thousands of companies trusting Mobitrak to deliver efficiency and safety.
                            </p>
                            <Link to="/signup">
                                <Button variant="secondary" size="lg" className="shadow-lg">Start Your Free Trial</Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Home;
