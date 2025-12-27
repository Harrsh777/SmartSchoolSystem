'use client';

import { forwardRef, ButtonHTMLAttributes } from 'react';
import { motion } from 'framer-motion';

type ExcludedProps = 'variant' | 'size';

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, ExcludedProps> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'dark';
  size?: 'sm' | 'md' | 'lg';
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', children, disabled, ...props }, ref) => {
    const baseStyles = 'font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
    
    const variants = {
      primary: 'bg-[#FFD66B] text-[#2B2B2B] hover:bg-[#F5C84B] focus:ring-[#FFD66B] shadow-lg shadow-[#FFD66B]/20 hover:shadow-xl hover:shadow-[#FFD66B]/30 disabled:hover:bg-[#FFD66B]',
      secondary: 'bg-[#EDEDED] text-[#2B2B2B] hover:bg-[#E1E1DB] focus:ring-[#6B6B6B] shadow-md disabled:hover:bg-[#EDEDED]',
      outline: 'border-2 border-[#FFD66B] text-[#2B2B2B] hover:bg-[#FFD66B] hover:text-[#2B2B2B] focus:ring-[#FFD66B] shadow-md hover:shadow-lg disabled:hover:bg-transparent disabled:hover:text-[#2B2B2B]',
      ghost: 'text-[#2B2B2B] hover:bg-[#FFF2C2] hover:text-[#2B2B2B] focus:ring-[#FFD66B] disabled:hover:bg-transparent',
      dark: 'bg-[#2B2B2B] text-[#FFFFFF] hover:bg-[#3A3A3A] focus:ring-[#FFD66B] shadow-lg shadow-[#2B2B2B]/20 hover:shadow-xl disabled:hover:bg-[#2B2B2B]',
    };

    const sizes = {
      sm: 'px-4 py-2 text-sm',
      md: 'px-6 py-3 text-base',
      lg: 'px-8 py-4 text-lg',
    };

    return (
      <motion.button
        ref={ref}
        whileHover={disabled ? undefined : { scale: 1.02 }}
        whileTap={disabled ? undefined : { scale: 0.98 }}
        disabled={disabled}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {children}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
