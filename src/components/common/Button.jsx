import React from 'react';

const variants = {
    primary: 'bg-primary text-gray-900 hover:bg-accent',
    secondary: 'bg-secondary text-white hover:bg-gray-800',
    accent: 'bg-accent text-white hover:bg-amber-600',
    outline: 'border-2 border-primary text-gray-900 hover:bg-primary hover:text-gray-900',
    ghost: 'text-gray-900 hover:bg-primary/20',
};

const sizes = {
    sm: 'px-4 py-1.5 text-sm',
    md: 'px-6 py-2.5 text-base',
    lg: 'px-8 py-3.5 text-lg',
};

const Button = ({
    variant = 'primary',
    size = 'md',
    className = '',
    children,
    ...props
}) => {
    return (
        <button
            className={`
        inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]} 
        ${sizes[size]} 
        ${className}
      `}
            {...props}
        >
            {children}
        </button>
    );
};

export default Button;
