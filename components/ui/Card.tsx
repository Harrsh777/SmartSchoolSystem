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
  const baseStyles = 'bg-[#FFFFFF] rounded-2xl border border-[#E1E1DB] p-6 shadow-[0_10px_30px_rgba(0,0,0,0.08)]';
  
  if (hover) {
    return (
      <motion.div
        whileHover={{ y: -6, scale: 1.01 }}
        className={`${baseStyles} transition-all duration-300 hover:bg-[#FFF7DB] hover:shadow-[0_15px_40px_rgba(0,0,0,0.12)] hover:border-[#FFD66B] ${className}`}
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
