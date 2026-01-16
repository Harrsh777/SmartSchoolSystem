'use client';

import { forwardRef, ButtonHTMLAttributes } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

type ExcludedProps = 
  | 'variant' 
  | 'size' 
  | 'onDrag' 
  | 'onDragStart' 
  | 'onDragEnd' 
  | 'onDragEnter' 
  | 'onDragExit' 
  | 'onDragLeave' 
  | 'onDragOver'
  | 'onAnimationStart' 
  | 'onAnimationEnd' 
  | 'onAnimationIteration'
  | 'onTransitionEnd';

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, ExcludedProps> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'dark';
  size?: 'sm' | 'md' | 'lg';
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', children, disabled, ...props }, ref) => {
    const baseStyles = 'font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed';
    
    const variants = {
      primary: 'bg-[#2C3E50] text-white hover:bg-[#34495E] focus:ring-[#2C3E50]/30 soft-shadow hover:soft-shadow-md disabled:hover:bg-[#2C3E50] dark:bg-[#3D5A80] dark:hover:bg-[#4A6A95] dark:focus:ring-[#3D5A80]/30',
      secondary: 'bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0] focus:ring-[#4A707A]/20 soft-shadow disabled:hover:bg-[#F1F5F9] dark:bg-[#2D3748] dark:text-[#CBD5E1] dark:hover:bg-[#374151]',
      outline: 'border border-[#2C3E50] text-[#2C3E50] hover:bg-[#2C3E50] hover:text-white focus:ring-[#2C3E50]/30 disabled:hover:bg-transparent disabled:hover:text-[#2C3E50] dark:border-[#5A879A] dark:text-[#5A879A] dark:hover:bg-[#5A879A] dark:hover:text-white',
      ghost: 'text-[#475569] hover:bg-[#F8FAFC] hover:text-[#2C3E50] focus:ring-[#4A707A]/20 disabled:hover:bg-transparent dark:text-[#94A3B8] dark:hover:bg-[#252E3E] dark:hover:text-[#CBD5E1]',
      dark: 'bg-[#2C3E50] text-white hover:bg-[#34495E] focus:ring-[#2C3E50]/30 soft-shadow hover:soft-shadow-md disabled:hover:bg-[#2C3E50] dark:bg-[#1A2332] dark:hover:bg-[#252E3E]',
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
        {...(props as Omit<HTMLMotionProps<'button'>, 'ref' | 'variant' | 'size'>)}
      >
        {children}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
