import React from 'react';
import { cn } from '../../utils/cn';
import { ChevronDown } from 'lucide-react';

export const Select = React.forwardRef(({ className, options, error, ...props }, ref) => {
  return (
    <div className="relative w-full">
      <select
        className={cn(
          "flex h-10 w-full appearance-none rounded-md border border-slate-300 bg-white px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-trustBlue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
          error && "border-softRed-500 focus:ring-softRed-500",
          className
        )}
        ref={ref}
        {...props}
      >
        <option value="" disabled>Select an option</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
      {error && (
        <p className="mt-1 text-xs text-softRed-500">{error}</p>
      )}
    </div>
  );
});

Select.displayName = 'Select';
