'use client';

import { HTMLAttributes, ReactNode } from 'react';
import { motion } from 'framer-motion';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  hover?: boolean;
}

export default function Card({ children, className = '', hover = false, ...props }: CardProps) {
  const baseStyles = 'bg-white rounded-xl border border-gray-200 p-6 shadow-sm';
  
  if (hover) {
    return (
      <motion.div
        whileHover={{ y: -4, shadow: 'lg' }}
        className={`${baseStyles} transition-shadow ${className}`}
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

