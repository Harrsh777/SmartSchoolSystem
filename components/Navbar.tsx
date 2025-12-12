'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import Button from './ui/Button';

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center"
          >
            <Link href="/" className="text-2xl font-bold text-black">
              EduFlow<span className="text-gray-600">360</span>
            </Link>
          </motion.div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            <Link href="/" className="text-gray-700 hover:text-black transition-colors font-medium">
              Home
            </Link>
            <Link href="/contests" className="text-gray-700 hover:text-black transition-colors font-medium">
              Contests
            </Link>
            <Link href="#features" className="text-gray-700 hover:text-black transition-colors font-medium">
              Features
            </Link>
            <Link href="#pricing" className="text-gray-700 hover:text-black transition-colors font-medium">
              Pricing
            </Link>
            <Link href="#about" className="text-gray-700 hover:text-black transition-colors font-medium">
              About
            </Link>
            <Link href="#contact" className="text-gray-700 hover:text-black transition-colors font-medium">
              Contact
            </Link>
          </div>

          {/* Auth Buttons */}
          <div className="flex items-center space-x-4">
            <Link href="/student" className="text-sm text-gray-600 hover:text-black font-medium">
              Student
            </Link>
            <Link href="/parents" className="text-sm text-gray-600 hover:text-black font-medium">
              Parent
            </Link>
            <Link href="/admin" className="text-sm text-gray-600 hover:text-black font-medium">
              Admin
            </Link>
            <Link href="/auth">
              <Button variant="primary" size="sm">Login</Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

