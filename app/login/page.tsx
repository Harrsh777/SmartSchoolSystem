'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '@/components/ui/Card';
import { GraduationCap, UserCheck, Building2, ArrowLeft, Shield, Lock, DollarSign } from 'lucide-react';
import StudentLoginForm from '@/components/auth/StudentLoginForm';
import TeacherLoginForm from '@/components/auth/TeacherLoginForm';
import PrincipalLoginForm from '@/components/auth/PrincipalLoginForm';

type Role = 'student' | 'teacher' | 'principal' | 'accountant' | null;

interface RoleCardProps {
  role: {
    id: Role;
    title: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    gradient: string;
    description: string;
    color: string;
    hoverColor: string;
  };
  index: number;
  onSelect: () => void;
}

function RoleCard({ role, index, onSelect }: RoleCardProps) {
  const Icon = role.icon;
  const [isPressed, setIsPressed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Color mappings for hover effects
  const colorMap: Record<string, { border: string; bg: string; glow: string }> = {
    blue: {
      border: 'hover:border-blue-300',
      bg: 'bg-blue-100',
      glow: 'rgba(59, 130, 246, 0.1)',
    },
    purple: {
      border: 'hover:border-purple-300',
      bg: 'bg-purple-100',
      glow: 'rgba(168, 85, 247, 0.1)',
    },
    emerald: {
      border: 'hover:border-emerald-300',
      bg: 'bg-emerald-100',
      glow: 'rgba(16, 185, 129, 0.1)',
    },
  };

  const colors = colorMap[role.color] || colorMap.blue;

  return (
    <motion.button
      initial={{ opacity: 0, y: 30, x: -20 }}
      animate={{ opacity: 1, y: 0, x: 0 }}
      transition={{
        delay: index * 0.15,
        duration: 0.5,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      whileHover={{
        y: -8,
        transition: { duration: 0.2, ease: 'easeOut' },
      }}
      whileTap={{
        scale: 0.97,
        transition: { duration: 0.1 },
      }}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => {
        setIsPressed(false);
        setIsHovered(false);
      }}
      onMouseEnter={() => setIsHovered(true)}
      onClick={onSelect}
      className="w-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black/20 rounded-2xl"
      aria-label={`${role.title} - ${role.description}`}
    >
      <motion.div
        className={`
          relative h-full bg-white rounded-2xl border-2 transition-all duration-300
          ${isPressed ? 'border-gray-300' : `border-gray-200 ${colors.border}`}
          shadow-sm hover:shadow-xl
          overflow-hidden group
        `}
        style={{
          boxShadow: isPressed
            ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            : isHovered
            ? '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            : '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        }}
      >
        {/* Ripple effect on click */}
        <AnimatePresence>
          {isPressed && (
            <motion.div
              initial={{ scale: 0, opacity: 0.5 }}
              animate={{ scale: 4, opacity: 0 }}
              exit={{ opacity: 0 }}
              className={`absolute inset-0 ${colors.bg} rounded-full`}
              style={{ originX: 0.5, originY: 0.5 }}
            />
          )}
        </AnimatePresence>

        {/* Content */}
        <div className="relative p-4 md:p-5 text-center">
          {/* Icon with gradient badge */}
          <motion.div
            whileHover={{ scale: 1.1, rotate: 5 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className={`inline-flex p-3 rounded-xl mb-3 bg-gradient-to-br ${role.gradient} text-white shadow-lg group-hover:shadow-xl transition-shadow duration-300`}
          >
            <Icon size={24} className="relative z-10" />
          </motion.div>

          {/* Title */}
          <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-2 group-hover:text-gray-950 transition-colors">
            {role.title}
          </h3>

          {/* Description */}
          <p className="text-xs text-gray-600 leading-relaxed">
            {role.description}
          </p>

          {/* Subtle glow on hover */}
          <motion.div
            className="absolute inset-0 rounded-2xl pointer-events-none"
            animate={{
              background: isHovered
                ? `linear-gradient(to bottom right, ${colors.glow}, transparent)`
                : 'transparent',
            }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </motion.div>
    </motion.button>
  );
}

export default function LoginPage() {
  const [selectedRole, setSelectedRole] = useState<Role>(null);

  const roles = [
    {
      id: 'student' as Role,
      title: 'Login as Student',
      icon: GraduationCap,
      gradient: 'from-blue-400 to-indigo-400',
      description: 'Access your student portal',
      color: 'blue',
      hoverColor: 'blue-300',
    },
    {
      id: 'teacher' as Role,
      title: 'Login as Teacher',
      icon: UserCheck,
      gradient: 'from-purple-400 to-pink-400',
      description: 'Access your teacher portal',
      color: 'purple',
      hoverColor: 'purple-300',
    },
    {
      id: 'accountant' as Role,
      title: 'Login as Accountant',
      icon: DollarSign,
      gradient: 'from-emerald-400 to-teal-400',
      description: 'Access fees management',
      color: 'emerald',
      hoverColor: 'emerald-300',
    },
    {
      id: 'principal' as Role,
      title: 'Login as Principal',
      icon: Building2,
      gradient: 'from-emerald-400 to-teal-400',
      description: 'Access school admin dashboard',
      color: 'emerald',
      hoverColor: 'emerald-300',
    },
  ];

  if (selectedRole) {
    return (
      <div className="relative min-h-screen bg-gradient-to-br from-white via-gray-50/50 to-blue-50/30 flex items-center justify-center p-4">
        {/* Go back to home */}
        <Link
          href="/"
          className="absolute top-4 left-4 z-10 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/90 backdrop-blur-sm border border-gray-200/50 text-sm font-medium text-gray-700 hover:bg-white hover:border-gray-300 hover:shadow-md transition-all duration-200"
          aria-label="Go back to home page"
        >
          <ArrowLeft size={18} />
          <span>Go back</span>
        </Link>

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="w-full max-w-md"
        >
          <Card className="relative shadow-xl border-gray-200/50">
            <button
              onClick={() => setSelectedRole(null)}
              className="absolute top-4 left-4 z-10 p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all duration-200"
              aria-label="Go back to role selection"
            >
              <ArrowLeft size={20} />
            </button>

            <AnimatePresence mode="wait">
              {selectedRole === 'student' && (
                <motion.div
                  key="student"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <StudentLoginForm />
                </motion.div>
              )}

              {selectedRole === 'teacher' && (
                <motion.div
                  key="teacher"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <TeacherLoginForm />
                </motion.div>
              )}

              {selectedRole === 'accountant' && (
                <motion.div
                  key="accountant"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="text-center">
                    <p className="text-gray-600 mb-4">Accountant login</p>
                    <Link
                      href="/accountant/login"
                      className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                    >
                      Go to Accountant Login
                    </Link>
                  </div>
                </motion.div>
              )}

              {selectedRole === 'principal' && (
                <motion.div
                  key="principal"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <PrincipalLoginForm />
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-white via-gray-50/50 to-blue-50/30 flex flex-col items-center justify-center p-4 md:p-8">
      {/* Go back to home */}
      <Link
        href="/"
        className="absolute top-4 left-4 z-10 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/90 backdrop-blur-sm border border-gray-200/50 text-sm font-medium text-gray-700 hover:bg-white hover:border-gray-300 hover:shadow-md transition-all duration-200"
        aria-label="Go back to home page"
      >
        <ArrowLeft size={18} />
        <span>Go back</span>
      </Link>

      {/* Main Content Container */}
      <div className="w-full max-w-6xl mx-auto flex flex-col items-center justify-center flex-1">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="text-center mb-12 md:mb-16"
        >
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-4 tracking-tight">
            Welcome to Edu Yan
          </h1>
          <p className="text-lg md:text-xl text-gray-600 font-normal">
            Select your role to continue
          </p>
        </motion.div>

        {/* Role Selection Cards */}
        <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-4 mb-12">
          {roles.map((role, index) => (
            <RoleCard
              key={role.id}
              role={role}
              index={index}
              onSelect={() => setSelectedRole(role.id)}
            />
          ))}
        </div>

        {/* Trust Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="flex items-center gap-2 text-xs md:text-sm text-gray-500 mt-8"
        >
          <Lock size={14} className="text-gray-400" />
          <span className="font-medium">Secure School ERP Platform</span>
          <Shield size={14} className="text-gray-400 ml-1" />
        </motion.div>
      </div>
    </div>
  );
}
