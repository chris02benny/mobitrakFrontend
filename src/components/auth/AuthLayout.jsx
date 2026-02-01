import React from 'react';
import AuthVisual from './AuthVisual';

const AuthLayout = ({ children }) => {
    return (
        <div className="flex w-full h-screen bg-white overflow-hidden">
            <AuthVisual />
            <div className="flex-1 flex flex-col justify-center items-center p-12 overflow-y-auto max-w-full lg:max-w-[50%] bg-white">
                <div className="w-full max-w-[440px] flex flex-col">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default AuthLayout;
