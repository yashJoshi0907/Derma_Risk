import React from 'react';
import { cn } from '../../utils/cn';

export const Input = React.forwardRef(({ className, type, error, ...props }, ref) => {
  return (
    <div className="relative w-full">
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-trustBlue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
          error && "border-softRed-500 focus:ring-softRed-500",
          className
        )}
        ref={ref}
        {...props}
      />
      {error && (
        <p className="mt-1 text-xs text-softRed-500">{error}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';
