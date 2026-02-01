import React from 'react';
import { Lightbulb, ShieldCheck, Users } from 'lucide-react';

const About = () => {
    return (
        <div className="py-12 bg-white">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="max-w-3xl mx-auto text-center mb-16">
                    <h1 className="text-4xl font-bold text-primary mb-4">About Mobitrak</h1>
                    <p className="text-xl text-gray-600">
                        Driving the future of fleet management with innovation and integrity.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mb-20">
                    <div>
                        <img
                            src="https://images.unsplash.com/photo-1556761175-5973dc0f32e7?ixlib=rb-4.0.3&auto=format&fit=crop&w=1632&q=80"
                            alt="Team Meeting"
                            className="rounded-2xl shadow-lg"
                        />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Our Mission</h2>
                        <p className="text-gray-600 mb-6">
                            At Mobitrak, we believe that efficient transportation is the backbone of the global economy. Our mission is to empower businesses of all sizes with the technology they need to operate safely, sustainably, and profitably.
                        </p>
                        <p className="text-gray-600">
                            Founded in 2024, we started with a simple GPS tracker and have grown into a comprehensive platform serving thousands of vehicles worldwide.
                        </p>
                    </div>
                </div>

                <div className="bg-neutral rounded-2xl p-8 md:p-12">
                    <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">Our Values</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                        <div className="text-center">
                            <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                                <Lightbulb className="w-6 h-6" />
                            </div>
                            <h3 className="font-bold text-lg mb-2">Innovation</h3>
                            <p className="text-sm text-gray-600">Constantly pushing the boundaries of what's possible.</p>
                        </div>
                        <div className="text-center">
                            <div className="w-12 h-12 bg-secondary/10 text-secondary rounded-full flex items-center justify-center mx-auto mb-4">
                                <ShieldCheck className="w-6 h-6" />
                            </div>
                            <h3 className="font-bold text-lg mb-2">Reliability</h3>
                            <p className="text-sm text-gray-600">Systems you can trust, day in and day out.</p>
                        </div>
                        <div className="text-center">
                            <div className="w-12 h-12 bg-accent/10 text-accent rounded-full flex items-center justify-center mx-auto mb-4">
                                <Users className="w-6 h-6" />
                            </div>
                            <h3 className="font-bold text-lg mb-2">Partnership</h3>
                            <p className="text-sm text-gray-600">YOUR success is our success.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default About;
