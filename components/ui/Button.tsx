'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';
import { motion } from 'framer-motion';

// Exclude all props that conflict between HTML button and Framer Motion
type ExcludedProps = 
  | 'onDrag' | 'onDragStart' | 'onDragEnd' | 'onDragEnter' | 'onDragExit' | 'onDragLeave' | 'onDragOver'
  | 'onAnimationStart' | 'onAnimationEnd' | 'onAnimationIteration'
  | 'onTransitionEnd';

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, ExcludedProps> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', children, disabled, ...props }, ref) => {
    const baseStyles = 'font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
    
    const variants = {
      primary: 'bg-black text-white hover:bg-gray-800 focus:ring-black disabled:hover:bg-black',
      secondary: 'bg-gray-100 text-black hover:bg-gray-200 focus:ring-gray-300 disabled:hover:bg-gray-100',
      outline: 'border-2 border-black text-black hover:bg-black hover:text-white focus:ring-black disabled:hover:bg-transparent disabled:hover:text-black',
      ghost: 'text-black hover:bg-gray-100 focus:ring-gray-300 disabled:hover:bg-transparent',
    };

    const sizes = {
      sm: 'px-4 py-2 text-sm',
      md: 'px-6 py-3 text-base',
      lg: 'px-8 py-4 text-lg',
    };

    // Explicitly exclude conflicting props to avoid type conflicts with framer-motion
    const {
      onDrag: _onDrag,
      onDragStart: _onDragStart,
      onDragEnd: _onDragEnd,
      onDragEnter: _onDragEnter,
      onDragExit: _onDragExit,
      onDragLeave: _onDragLeave,
      onDragOver: _onDragOver,
      onAnimationStart: _onAnimationStart,
      onAnimationEnd: _onAnimationEnd,
      onAnimationIteration: _onAnimationIteration,
      onTransitionEnd: _onTransitionEnd,
      ...safeProps
    } = props;

    return (
      <motion.button
        ref={ref}
        whileHover={disabled ? undefined : { scale: 1.02 }}
        whileTap={disabled ? undefined : { scale: 0.98 }}
        disabled={disabled}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        {...safeProps}
      >
        {children}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';

export default Button;

