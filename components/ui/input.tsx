import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-11 w-full rounded-lg border border-zinc-200 bg-zinc-50/50 px-4 py-2 text-[15px] ring-offset-background file:border-0 file:bg-transparent file:text-[15px] file:font-medium placeholder:text-zinc-400 focus-visible:bg-white focus-visible:border-teal-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/20 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';
export { Input };
