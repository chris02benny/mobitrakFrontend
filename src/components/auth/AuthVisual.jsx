import React from 'react';
import { Truck } from 'lucide-react';

const AuthVisual = ({
    quote = "\"Mobitrak transformed how we manage our 500+ vehicle fleet. The real-time tracking and maintenance alerts have saved us countless hours.\"",
    author = "Sarah Jennings",
    role = "VP of Operations, Swift Logistics",
    avatar = "https://storage.googleapis.com/banani-avatars/avatar%2Ffemale%2F35-50%2FEuropean%2F4",
    image = "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=2070&auto=format&fit=crop"
}) => {
    return (
        <div className="hidden lg:flex flex-1 relative bg-slate-900 flex-col justify-between p-16 overflow-hidden max-w-[50%]">
            <div className="absolute inset-0 z-0">
                <img
                    src={image}
                    className="w-full h-full object-cover opacity-60"
                    alt="Logistics Fleet"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-slate-900/80 to-primary/20 mix-blend-multiply"></div>
            </div>

            <div className="relative z-10 flex items-center gap-3">
                <div className="w-10 h-10 bg-white text-primary rounded-md flex items-center justify-center">
                    <Truck size={24} />
                </div>
                <span className="text-2xl font-bold text-white tracking-tight">mobitrak</span>
            </div>

            <div className="relative z-10 bg-white/10 backdrop-blur-md p-8 rounded-xl border border-white/20">
                <p className="text-2xl font-medium text-white leading-relaxed mb-6">
                    {quote}
                </p>
                <div className="flex items-center gap-4">
                    <img
                        src={avatar}
                        className="w-12 h-12 rounded-full border-2 border-white"
                        alt={author}
                    />
                    <div>
                        <div className="font-semibold text-white text-base">
                            {author}
                        </div>
                        <div className="text-white/80 text-sm">
                            {role}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuthVisual;
