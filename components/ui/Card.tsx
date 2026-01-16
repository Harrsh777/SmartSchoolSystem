'use client';

import { HTMLAttributes, ReactNode } from 'react';
import { motion } from 'framer-motion';

// Exclude all props that conflict between HTML div and Framer Motion
type ExcludedProps = 
  | 'onDrag' | 'onDragStart' | 'onDragEnd' | 'onDragEnter' | 'onDragExit' | 'onDragLeave' | 'onDragOver'
  | 'onAnimationStart' | 'onAnimationEnd' | 'onAnimationIteration'
  | 'onTransitionEnd';

interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, ExcludedProps> {
  children: ReactNode;
  hover?: boolean;
}

export default function Card({ children, className = '', hover = false, ...props }: CardProps) {
  const baseStyles = 'glass-card rounded-xl p-6 soft-shadow-md';
  
  if (hover) {
    return (
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ duration: 0.2 }}
        className={`${baseStyles} transition-all duration-200 cursor-pointer ${className}`}
        {...props}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div className={`${baseStyles} ${className}`} {...props}>
      {children}
    </div>
  );
}
