import React from 'react';
import { cn } from '../../utils/cn';

export const Button = React.forwardRef(({ className, variant = 'primary', size = 'md', children, disabled, ...props }, ref) => {
  const baseStyles = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-trustBlue-500 disabled:pointer-events-none disabled:opacity-50';
  
  const variants = {
    primary: 'bg-trustBlue-900 text-white hover:bg-trustBlue-800 shadow-sm',
    secondary: 'bg-trustBlue-100 text-trustBlue-900 hover:bg-trustBlue-200',
    outline: 'border border-slate-200 bg-white hover:bg-slate-100 text-slate-900',
    ghost: 'hover:bg-slate-100 hover:text-slate-900 text-slate-600',
    danger: 'bg-softRed-500 text-white hover:bg-softRed-600',
  };

  const sizes = {
    sm: 'h-8 px-3 text-xs',
    md: 'h-10 px-4 py-2 text-sm',
    lg: 'h-12 px-8 py-3 text-base',
    icon: 'h-10 w-10',
  };

  return (
    <button
      ref={ref}
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
});

Button.displayName = 'Button';
