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
  const baseStyles = 'bg-white rounded-xl border border-gray-200 p-6 shadow-sm';
  
  if (hover) {
    return (
      <motion.div
        whileHover={{ y: -4 }}
        className={`${baseStyles} transition-shadow hover:shadow-lg ${className}`}
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

