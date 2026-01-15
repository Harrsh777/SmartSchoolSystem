'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { FiArrowUpRight } from 'react-icons/fi';

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2"
          >
            <Link href="/" className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
              EduCore
            </Link>
          </motion.div>

          {/* Navigation Links - Outlined Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            <Link href="/">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-4 py-2 rounded-full border-2 border-gray-300 text-gray-700 font-medium text-sm hover:border-gray-400 transition-colors"
              >
                Home
              </motion.button>
            </Link>
            <Link href="/contest">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-4 py-2 rounded-full border-2 border-gray-300 text-gray-700 font-medium text-sm hover:border-gray-400 transition-colors"
              >
                Contest
              </motion.button>
            </Link>
            <Link href="#about">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-4 py-2 rounded-full border-2 border-gray-300 text-gray-700 font-medium text-sm hover:border-gray-400 transition-colors"
              >
                About Us
              </motion.button>
            </Link>
            <Link href="#contact">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-4 py-2 rounded-full border-2 border-gray-300 text-gray-700 font-medium text-sm hover:border-gray-400 transition-colors"
              >
                Contact
              </motion.button>
            </Link>
          </div>

          {/* Auth Buttons */}
          <div className="flex items-center space-x-4">
            <Link href="/login" className="text-sm text-gray-700 hover:text-gray-900 font-medium transition-colors">
              Sign In
            </Link>
            <Link href="/signup">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-purple-600 text-white px-5 py-2.5 rounded-full font-medium text-sm flex items-center gap-1.5 hover:bg-purple-700 transition-colors shadow-md"
              >
                Get Started
                <FiArrowUpRight className="w-4 h-4" />
              </motion.button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
