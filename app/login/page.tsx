'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { GraduationCap, UserCheck, Building2, ArrowLeft, ArrowRight } from 'lucide-react';
import StudentLoginForm from '@/components/auth/StudentLoginForm';
import TeacherLoginForm from '@/components/auth/TeacherLoginForm';
import PrincipalLoginForm from '@/components/auth/PrincipalLoginForm';

type Role = 'student' | 'teacher' | 'principal' | null;

interface RoleCardProps {
  role: {
    id: Role;
    title: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    gradient: string;
    description: string;
    bgGradient: string;
  };
  index: number;
  onSelect: () => void;
}

function RoleCard({ role, index, onSelect }: RoleCardProps) {
  const Icon = role.icon;
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.button
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: index * 0.1,
        duration: 0.5,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      whileHover={{ y: -8, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onSelect}
      className="w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-2xl"
      aria-label={`${role.title} - ${role.description}`}
    >
      <motion.div
        className={`relative h-full bg-white/85 dark:bg-[#1e293b]/85 backdrop-blur-xl rounded-2xl border-2 transition-all duration-300 overflow-hidden group ${
          isHovered ? 'border-[#6B9BB8] dark:border-[#7DB5D3] shadow-xl shadow-[#6B9BB8]/20' : 'border-white/60 dark:border-gray-700/50 shadow-lg'
        }`}
        style={{
          boxShadow: isHovered
            ? '0 20px 25px -5px rgba(59, 130, 246, 0.1), 0 10px 10px -5px rgba(59, 130, 246, 0.04)'
            : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        }}
      >
        {/* Gradient Background */}
        <div className={`absolute inset-0 bg-gradient-to-br ${role.bgGradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
        
        {/* Content */}
        <div className="relative p-6 md:p-8 text-center">
          {/* Icon with gradient badge */}
          <motion.div
            animate={isHovered ? { scale: 1.1, rotate: 5 } : { scale: 1, rotate: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className={`inline-flex p-4 rounded-2xl mb-4 bg-gradient-to-br ${role.gradient} text-white shadow-lg`}
          >
            <Icon size={32} className="relative z-10" />
          </motion.div>

          {/* Title */}
          <h3 className="text-xl font-bold text-navy dark:text-skyblue mb-2 group-hover:text-[#5A7A95] dark:group-hover:text-[#6B9BB8] transition-colors">
            {role.title}
          </h3>

          {/* Description */}
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
            {role.description}
          </p>

          {/* Arrow indicator */}
          <motion.div
            animate={isHovered ? { x: 5, opacity: 1 } : { x: 0, opacity: 0.5 }}
            transition={{ duration: 0.3 }}
            className="inline-flex items-center gap-1 text-[#5A7A95] dark:text-[#6B9BB8] font-semibold text-sm"
          >
            <span>Continue</span>
            <ArrowRight size={16} />
          </motion.div>
        </div>

        {/* Shine effect on hover */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
          initial={{ x: '-100%' }}
          animate={isHovered ? { x: '100%' } : { x: '-100%' }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
        />
      </motion.div>
    </motion.button>
  );
}

export default function LoginPage() {
  const [selectedRole, setSelectedRole] = useState<Role>(null);

  const handleGoBack = () => {
    // Force a full page reload to reset state
    window.location.href = '/login';
  };

  const roles = [
    {
      id: 'student' as Role,
      title: 'Login as Student',
      icon: GraduationCap,
      gradient: 'from-[#5A7A95] to-[#6B9BB8]',
      bgGradient: 'from-[#5A7A95] to-[#6B9BB8]',
      description: 'Access your student portal',
    },
    {
      id: 'teacher' as Role,
      title: 'Login as Staff',
      icon: UserCheck,
      gradient: 'from-[#6B9BB8] to-[#7DB5D3]',
      bgGradient: 'from-[#6B9BB8] to-[#7DB5D3]',
      description: 'Access your staff portal',
    },
    {
      id: 'principal' as Role,
      title: 'Login as Admin',
      icon: Building2,
      gradient: 'from-[#567C8D] to-[#5A7A95]',
      bgGradient: 'from-[#567C8D] to-[#5A7A95]',
      description: 'Access school admin dashboard',
    },
  ];

  if (selectedRole === 'student') {
    return (
      <>
        {/* Go back button */}
        <button
          onClick={handleGoBack}
          className="fixed top-4 left-4 z-50 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/90 dark:bg-[#1e293b]/90 backdrop-blur-xl border border-white/60 dark:border-gray-700/50 text-sm font-semibold text-[#5A7A95] dark:text-[#6B9BB8] hover:bg-white dark:hover:bg-[#2F4156] hover:shadow-lg transition-all duration-200"
          aria-label="Go back to role selection"
        >
          <ArrowLeft size={18} />
          <span>Go back</span>
        </button>
        <StudentLoginForm />
      </>
    );
  }

  if (selectedRole === 'principal') {
    return (
      <>
        {/* Go back button */}
        <button
          onClick={handleGoBack}
          className="fixed top-4 left-4 z-50 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/90 dark:bg-[#1e293b]/90 backdrop-blur-xl border border-white/60 dark:border-gray-700/50 text-sm font-semibold text-[#5A7A95] dark:text-[#6B9BB8] hover:bg-white dark:hover:bg-[#2F4156] hover:shadow-lg transition-all duration-200"
          aria-label="Go back to role selection"
        >
          <ArrowLeft size={18} />
          <span>Go back</span>
        </button>
        <PrincipalLoginForm />
      </>
    );
  }

  if (selectedRole === 'teacher') {
    return (
      <>
        {/* Go back button */}
        <button
          onClick={handleGoBack}
          className="fixed top-4 left-4 z-50 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/90 dark:bg-[#1e293b]/90 backdrop-blur-xl border border-white/60 dark:border-gray-700/50 text-sm font-semibold text-[#5A7A95] dark:text-[#6B9BB8] hover:bg-white dark:hover:bg-[#2F4156] hover:shadow-lg transition-all duration-200"
          aria-label="Go back to role selection"
        >
          <ArrowLeft size={18} />
          <span>Go back</span>
        </button>
        <TeacherLoginForm />
      </>
    );
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-[#F5EFEB] via-[#F0F5F9] to-[#EBF2F7] dark:bg-[#0f172a] flex flex-col items-center justify-center p-4 md:p-8">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-br from-purple-300/30 via-blue-300/30 to-cyan-300/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-gradient-to-br from-teal-300/25 via-green-300/25 to-emerald-300/25 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-br from-pink-300/20 via-rose-300/20 to-orange-300/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '4s' }} />
      </div>

      {/* Go back to home */}
      <Link
        href="/"
        className="absolute top-4 left-4 z-10 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/90 dark:bg-[#1e293b]/90 backdrop-blur-xl border border-white/60 dark:border-gray-700/50 text-sm font-semibold text-[#5A7A95] dark:text-[#6B9BB8] hover:bg-white dark:hover:bg-[#2F4156] hover:shadow-lg transition-all duration-200"
        aria-label="Go back to home page"
      >
        <ArrowLeft size={18} />
        <span>Go back</span>
      </Link>

      {/* Main Content Container */}
      <div className="relative w-full max-w-6xl mx-auto flex flex-col items-center justify-center flex-1 z-10">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="text-center mb-12 md:mb-16"
        >
          {/* Logo/Brand */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="inline-flex items-center gap-3 mb-6"
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#5A7A95] via-[#6B9BB8] to-[#7DB5D3] flex items-center justify-center shadow-lg shadow-[#6B9BB8]/30">
              <GraduationCap className="text-white" size={32} />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-[#5A7A95] via-[#6B9BB8] to-[#7DB5D3] bg-clip-text text-transparent dark:text-white">
              EduCore
            </h1>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="text-3xl md:text-4xl lg:text-5xl font-bold text-navy dark:text-skyblue mb-4 tracking-tight"
          >
            Welcome to EduCore
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="text-lg md:text-xl text-gray-600 dark:text-gray-400 font-medium"
          >
            Select your role to continue
          </motion.p>
        </motion.div>

        {/* Role Selection Cards */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mb-12"
        >
          {roles.map((role, index) => (
            <RoleCard
              key={role.id}
              role={role}
              index={index}
              onSelect={() => setSelectedRole(role.id)}
            />
          ))}
        </motion.div>

        {/* Sign up link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1, duration: 0.5 }}
          className="mt-8 text-center"
        >
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Don&apos;t have an account?{' '}
            <Link
              href="/signup"
              className="text-[#5A7A95] dark:text-[#6B9BB8] font-semibold hover:text-[#6B9BB8] dark:hover:text-[#7DB5D3] hover:underline transition-colors"
            >
              Sign up your school
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
