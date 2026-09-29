import React from 'react';

const Button = ({ children, variant = 'primary', className = '', ...props }) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 active:scale-[0.98]';
  
  const variants = {
    primary: 'bg-gradient-to-r from-brand-600 to-brand-500 text-white hover:from-brand-500 hover:to-brand-400 focus:ring-brand-500 shadow-md shadow-brand-500/20 hover:shadow-lg hover:shadow-brand-500/30 border border-transparent',
    secondary: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 focus:ring-slate-200 shadow-sm',
    danger: 'bg-red-600 text-white hover:bg-red-500 focus:ring-red-500 shadow-md shadow-red-500/20',
    outline: 'bg-transparent text-brand-600 border border-brand-200 hover:bg-brand-50 focus:ring-brand-500'
  };

  const sizes = {
    sm: 'text-sm px-3 py-1.5',
    md: 'text-sm px-4 py-2',
    lg: 'text-base px-5 py-2.5'
  };

  return (
    <button 
      className={`${baseClasses} ${variants[variant]} ${sizes[props.size || 'md']} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
