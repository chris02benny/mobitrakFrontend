import React from 'react';

const Card = ({ className = '', children, hover = false, ...props }) => {
    return (
        <div
            className={`
        bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden
        ${hover ? 'transition-transform duration-300 hover:-translate-y-1 hover:shadow-xl' : ''}
        ${className}
      `}
            {...props}
        >
            {children}
        </div>
    );
};

export default Card;
