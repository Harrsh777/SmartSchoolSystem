'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  FiCheckCircle, FiUsers, FiTrendingUp, FiAward, FiBook, 
  FiCreditCard, FiMessageCircle, FiSettings, FiBarChart2,
  FiCalendar, FiFileText, FiMail, FiPhone, FiMapPin,
  FiArrowRight, FiLayers, FiMonitor, FiServer, FiTool,
  FiPlay, FiCheck
} from 'react-icons/fi';
import { 
  MdAccountBalance, MdAutoStories, MdArchitecture, 
  MdPublic, MdScience, MdPeopleAlt, MdPayments, 
  MdLibraryBooks, MdDirectionsBus, MdChat, 
  MdAnalytics, MdAutoGraph,
  MdPlace, MdEmail, MdPhone, MdFormatQuote,
  MdPlayArrow, MdTrendingUp, MdArrowForward, MdSchool
} from 'react-icons/md';

export default function EduCoreLanding() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="bg-beige dark:bg-[#0f172a] text-navy dark:text-skyblue transition-colors duration-300 antialiased selection:bg-teal selection:text-white min-h-screen">
      <style jsx global>{`
        body {
          font-family: 'Inter', sans-serif;
          scroll-behavior: smooth;
        }
        h1, h2, h3, h4, h5, h6 {
          font-family: 'Playfair Display', serif;
        }
        .glass-card {
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.6);
          box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.07);
        }
        .dark .glass-card {
          background: rgba(30, 41, 59, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
        .gradient-text {
          background: linear-gradient(135deg, #5A7A95 0%, #6B9BB8 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .dark .gradient-text {
          background: linear-gradient(135deg, #C8D9E6 0%, #F5EFEB 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .cloud-divider {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          overflow: hidden;
          line-height: 0;
          transform: rotate(180deg);
        }
        .cloud-divider svg {
          position: relative;
          display: block;
          width: calc(100% + 1.3px);
          height: 80px;
        }
        .cloud-divider-top {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          overflow: hidden;
          line-height: 0;
        }
        .cloud-divider-top svg {
          position: relative;
          display: block;
          width: calc(100% + 1.3px);
          height: 80px;
        }
        @keyframes blob {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out;
        }
      `}</style>

      {/* Navbar */}
      <nav className={`fixed w-full z-50 glass-card border-b border-white/40 dark:border-gray-800 transition-all duration-300 ${scrolled ? 'shadow-lg' : ''}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#5A7A95] via-[#6B9BB8] to-[#7DB5D3] flex items-center justify-center text-white shadow-lg">
                <MdSchool className="text-xl" />
              </div>
              <span className="font-display font-bold text-2xl bg-gradient-to-r from-[#5A7A95] to-[#6B9BB8] bg-clip-text text-transparent dark:text-white tracking-wide">
                EduCore
              </span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              {['Solutions', 'Analytics', 'Success Stories', 'Pricing'].map((item) => (
                <a
                  key={item}
                  href={`#${item.toLowerCase().replace(' ', '-')}`}
                  className="text-sm font-sans font-medium text-gray-600 dark:text-gray-300 hover:text-[#5A7A95] dark:hover:text-white transition-colors relative group"
                >
                  {item}
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#567C8D] transition-all group-hover:w-full"></span>
                </a>
              ))}
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/login"
                className="hidden md:block text-sm font-sans font-medium text-[#5A7A95] dark:text-skyblue hover:text-[#6B9BB8] transition-colors"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="px-6 py-2.5 rounded-full bg-gradient-to-r from-[#5A7A95] to-[#6B9BB8] text-white text-sm font-sans font-medium shadow-[0_0_20px_rgba(90,122,149,0.4)] hover:shadow-[0_0_30px_rgba(107,155,184,0.5)] hover:from-[#6B9BB8] hover:to-[#7DB5D3] transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
              >
                Request Demo
                <FiArrowRight className="text-sm" />
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#F5EFEB] via-[#F0F5F9] to-[#EBF2F7]" style={{ paddingTop: '3cm', paddingBottom: '8rem' }}>
        <div className="absolute inset-0 z-0 opacity-5 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-repeat"></div>
        <div className="absolute top-20 right-0 w-[500px] h-[500px] bg-gradient-to-br from-purple-300/30 via-blue-300/30 to-cyan-300/30 rounded-full mix-blend-multiply filter blur-[80px] opacity-50 animate-blob"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-br from-teal-300/25 via-green-300/25 to-emerald-300/25 rounded-full mix-blend-multiply filter blur-[100px] opacity-40 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-gradient-to-br from-pink-300/20 via-rose-300/20 to-orange-300/20 rounded-full mix-blend-multiply filter blur-[90px] opacity-35 animate-blob animation-delay-4000"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="relative z-20">
              <div className="inline-flex items-center space-x-2 bg-white/60 backdrop-blur-sm rounded-full px-4 py-1.5 mb-8 shadow-sm border border-white/50 animate-fade-in-up">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#567C8D] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#567C8D]"></span>
                </span>
                <span className="text-xs font-bold text-[#5A7A95] tracking-wide uppercase">Reimagining Education Management</span>
              </div>
              <h1 className="text-5xl lg:text-7xl font-bold leading-[1.1] mb-8 bg-gradient-to-r from-[#5A7A95] via-[#6B9BB8] to-[#7DB5D3] bg-clip-text text-transparent">
                Empower the <br/>
                <span className="text-[#6B9BB8] italic relative z-10">
                  Future of Learning
                  <svg className="absolute w-full h-3 -bottom-1 left-0 text-[#C8D9E6]/40 -z-10" fill="currentColor" viewBox="0 0 200 9" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2.00025 6.99997C25.7501 9.75017 68.2502 9.25017 197.501 4.5002C197.501 4.5002 112.002 0.500001 2.00025 6.99997Z"></path>
                  </svg>
                </span>
              </h1>
              <p className="text-lg text-gray-600 mb-10 max-w-lg leading-relaxed font-sans">
                Orchestrate seamless administrative excellence. From admissions to alumni management, our intelligent ERP creates a thriving ecosystem for elite institutions.
              </p>
              <div className="flex flex-col sm:flex-row gap-5">
                <Link
                  href="/signup"
                  className="px-8 py-4 rounded-full bg-gradient-to-r from-[#5A7A95] via-[#6B9BB8] to-[#7DB5D3] text-white font-medium shadow-xl hover:shadow-2xl hover:shadow-[#6B9BB8]/50 transition-all flex items-center justify-center gap-3 group hover:scale-105"
                >
                  Start Your Journey
                  <FiArrowRight className="text-sm group-hover:translate-x-1 transition-transform" />
                </Link>
                <a
                  href="#features"
                  className="px-8 py-4 rounded-full glass-card text-[#5A7A95] font-medium hover:bg-white transition-all flex items-center justify-center gap-2 border border-white/60 group"
                  >
                  <span className="w-8 h-8 rounded-full bg-gradient-to-br from-[#6B9BB8]/20 to-[#7DB5D3]/20 flex items-center justify-center group-hover:from-[#6B9BB8]/30 group-hover:to-[#7DB5D3]/30 transition-colors">
                    <FiPlay className="text-[#6B9BB8] text-sm" />
                  </span>
                  View Ecosystem
                </a>
              </div>
              <div className="mt-12 pt-8 border-t border-gray-200/60 flex items-center gap-6">
                <div className="flex -space-x-4">
                  <div className="w-12 h-12 rounded-full border-4 border-white shadow-md bg-gradient-to-br from-blue-400 to-blue-600"></div>
                  <div className="w-12 h-12 rounded-full border-4 border-white shadow-md bg-gradient-to-br from-purple-400 to-purple-600"></div>
                  <div className="w-12 h-12 rounded-full border-4 border-white shadow-md bg-gradient-to-br from-green-400 to-green-600"></div>
                  <div className="w-12 h-12 rounded-full border-4 border-white bg-gradient-to-br from-[#6B9BB8] to-[#7DB5D3] text-white flex items-center justify-center text-xs font-bold shadow-md">+2k</div>
                </div>
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    {[...Array(5)].map((_, i) => (
                      <span key={i} className="text-yellow-500 text-sm">★</span>
                    ))}
                  </div>
                  <p className="text-sm text-gray-600 font-medium">Trusted by Top Institutions</p>
                </div>
              </div>
            </div>
            <div className="relative lg:h-[600px] flex items-center justify-center">
              <div className="absolute top-10 right-10 w-64 h-64 bg-gradient-to-br from-[#6B9BB8] to-[#7DB5D3] rounded-full opacity-15 blur-2xl"></div>
              <div className="absolute bottom-10 left-10 w-64 h-64 bg-gradient-to-br from-[#5A7A95] to-[#6B9BB8] rounded-full opacity-15 blur-2xl"></div>
              <div className="relative w-full h-[500px] lg:h-full rounded-t-full rounded-b-[200px] overflow-hidden shadow-2xl border-[8px] border-white z-10 transform hover:scale-[1.01] transition-transform duration-700">
                <div className="w-full h-full relative">
                  <Image
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuCFa3dNasg7Aga3UD0gDJzOWyzsDLEOeLBXCT3eUJJLnTBu6atm7leU-XMefrEhqizy1qXgDJE9VQJpBFZtKHkARwV4XVDloZ6G-OfDd5ekzjToMdTo3CIdDLqTnI7FeKh5f0J2x4UYlpUcPI0PPt_6yHaw64ssWQml8cXpOtadpEcKjM9yOklEDekSKN5XQpDwIUnHajGbbxvStgNSUAfWwot2cxkmeqB51EVggpnWFFDOyKaAXS7-VenzuF88Aspbuf66S7yYB2LN"
                    alt="Happy diverse children using tablets in a classroom"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#5A7A95]/50 via-[#6B9BB8]/20 to-transparent"></div>
                  <div className="absolute bottom-12 right-0 left-0 mx-auto w-[90%] glass-card p-4 rounded-xl shadow-lg border border-white/30 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#6B9BB8]/30 to-[#7DB5D3]/30 flex items-center justify-center text-[#6B9BB8]">
                        <MdAutoGraph className="text-xl" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 font-medium">Student Engagement</p>
                        <p className="text-xl font-bold bg-gradient-to-r from-[#5A7A95] to-[#6B9BB8] bg-clip-text text-transparent">+45% <span className="text-xs font-normal text-[#6B9BB8]">vs last term</span></p>
                      </div>
                    </div>
                    <div className="hidden sm:block">
                      <div className="flex -space-x-2">
                        <span className="w-2 h-8 bg-gradient-to-t from-[#6B9BB8] to-[#7DB5D3] rounded-full opacity-60"></span>
                        <span className="w-2 h-12 bg-gradient-to-t from-[#6B9BB8] to-[#7DB5D3] rounded-full opacity-80"></span>
                        <span className="w-2 h-6 bg-gradient-to-t from-[#6B9BB8] to-[#7DB5D3] rounded-full opacity-50"></span>
                        <span className="w-2 h-10 bg-gradient-to-t from-[#6B9BB8] to-[#7DB5D3] rounded-full"></span>
                        <span className="w-2 h-14 bg-gradient-to-t from-[#5A7A95] to-[#6B9BB8] rounded-full"></span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="cloud-divider text-white dark:text-[#1e293b]">
          <svg data-name="Layer 1" preserveAspectRatio="none" viewBox="0 0 1200 120" xmlns="http://www.w3.org/2000/svg">
            <path className="fill-current" d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z"></path>
          </svg>
        </div>
      </section>

      {/* Logo Section */}
      <section className="py-12 bg-white dark:bg-surface-dark relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-xs font-bold uppercase tracking-[0.2em] bg-gradient-to-r from-[#6B9BB8] to-[#7DB5D3] bg-clip-text text-transparent mb-10">The Choice of Global Educators</p>
          <div className="flex flex-wrap justify-center items-center gap-12 lg:gap-20 opacity-60 hover:opacity-100 transition-opacity duration-500">
            {[
              { icon: <MdAccountBalance className="text-4xl" />, name: 'Harvard High' },
              { icon: <MdAutoStories className="text-4xl" />, name: 'Oxford Prep' },
              { icon: <MdArchitecture className="text-4xl" />, name: 'Stanford Arts' },
              { icon: <MdPublic className="text-4xl" />, name: 'Global Intl.' },
              { icon: <MdScience className="text-4xl" />, name: 'MIT Science' }
            ].map((school, i) => (
              <div key={i} className="flex items-center space-x-2 text-[#5A7A95] dark:text-white grayscale hover:grayscale-0 transition-all hover:scale-110">
                {school.icon}
                <span className="font-display font-bold text-xl">{school.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-[#F8FAFC] dark:bg-surface-dark relative" id="features">
        <div className="cloud-divider-top text-white dark:text-[#1e293b]">
          <svg data-name="Layer 1" preserveAspectRatio="none" viewBox="0 0 1200 120" xmlns="http://www.w3.org/2000/svg">
            <path className="fill-current" d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z"></path>
          </svg>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <span className="bg-gradient-to-r from-[#6B9BB8]/20 to-[#7DB5D3]/20 text-[#6B9BB8] px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase border border-[#6B9BB8]/30">Holistic Management</span>
            <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-[#5A7A95] via-[#6B9BB8] to-[#7DB5D3] bg-clip-text text-transparent dark:text-white mt-6 mb-6">
              Engineered for <span className="italic text-[#6B9BB8] font-serif">Efficiency</span>
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-lg font-sans">
              A unified platform that integrates every aspect of academic administration into one intuitive, human-centric interface.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: <MdPeopleAlt className="text-3xl" />, title: 'Student Lifecycle', desc: 'Comprehensive tracking from initial inquiry and admission to graduation and alumni status.', bg: 'bg-gradient-to-br from-blue-100/50 to-cyan-100/50 text-[#6B9BB8]' },
              { icon: <MdPayments className="text-3xl" />, title: 'Smart Finance', desc: 'Automated fee collection, payroll processing, and budget forecasting with bank-grade security.', bg: 'bg-gradient-to-br from-emerald-100/50 to-teal-100/50 text-[#5A7A95]' },
              { icon: <MdLibraryBooks className="text-3xl" />, title: 'Academic Planner', desc: 'Dynamic curriculum mapping, timetable generation, and digital gradebooks for faculty.', bg: 'bg-gradient-to-br from-purple-100/50 to-pink-100/50 text-[#6B9BB8]' },
              { icon: <MdChat className="text-3xl" />, title: 'Communication Hub', desc: 'Unified messaging for parents, teachers, and staff via SMS, Email, and Mobile App notifications.', bg: 'bg-gradient-to-br from-orange-100/50 to-amber-100/50 text-[#5A7A95]' },
              { icon: <MdAnalytics className="text-3xl" />, title: 'Executive Insights', desc: 'Customizable dashboards providing actionable intelligence for school leadership.', bg: 'bg-gradient-to-br from-indigo-100/50 to-violet-100/50 text-[#6B9BB8]' }
            ].map((feature, i) => (
              <div key={i} className="group relative bg-white dark:bg-[#2F4156]/40 rounded-3xl p-1 overflow-hidden shadow-[0_10px_30px_-5px_rgba(47,65,86,0.1)] hover:shadow-[0_0_20px_rgba(86,124,141,0.3)] transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-[#6B9BB8]/20 via-[#7DB5D3]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative bg-white dark:bg-[#1e293b] rounded-[1.4rem] p-8 h-full flex flex-col z-10">
                  <div className={`w-16 h-16 rounded-2xl ${feature.bg} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-2xl font-display font-bold bg-gradient-to-r from-[#5A7A95] to-[#6B9BB8] bg-clip-text text-transparent dark:text-white mb-3">{feature.title}</h3>
                  <p className="text-gray-500 dark:text-gray-400 leading-relaxed mb-6 font-sans text-sm flex-grow">{feature.desc}</p>
                  <div className="mt-auto pt-6 border-t border-gray-100 dark:border-gray-700">
                    <a className="inline-flex items-center bg-gradient-to-r from-[#5A7A95] to-[#6B9BB8] bg-clip-text text-transparent font-semibold text-sm hover:from-[#6B9BB8] hover:to-[#7DB5D3] transition-all" href="#">
                      Explore Module <MdArrowForward className="text-sm ml-2 group-hover:translate-x-1 transition-transform" />
                    </a>
                  </div>
                </div>
              </div>
            ))}
            {/* Transport Card - Special */}
            <div className="group relative bg-gradient-to-br from-[#5A7A95] via-[#6B9BB8] to-[#7DB5D3] rounded-3xl p-1 overflow-hidden shadow-[0_10px_30px_-5px_rgba(90,122,149,0.3)] hover:shadow-2xl transition-all duration-300 md:col-span-2 lg:col-span-1">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-400/50 to-purple-500/50 opacity-50 group-hover:scale-105 transition-transform duration-700"></div>
              <div className="absolute inset-0 bg-gradient-to-t from-[#5A7A95]/90 via-[#6B9BB8]/70 to-[#7DB5D3]/50"></div>
              <div className="relative h-full flex flex-col p-8 z-10">
                <div className="w-14 h-14 rounded-xl bg-white/10 backdrop-blur-md text-white flex items-center justify-center mb-6 border border-white/20">
                  <MdDirectionsBus className="text-3xl" />
                </div>
                <h3 className="text-2xl font-display font-bold text-white mb-3">Transport & Safety</h3>
                <p className="text-gray-300 leading-relaxed mb-6 font-sans text-sm flex-grow">
                  Real-time GPS bus tracking, gate security integration, and instant emergency notifications for parents.
                </p>
                <div className="mt-auto">
                  <a className="inline-flex items-center text-white font-semibold text-sm hover:text-[#C8D9E6] transition-colors" href="#">
                    Explore Module <MdArrowForward className="text-sm ml-2" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="cloud-divider text-white dark:text-[#0f172a]">
          <svg data-name="Layer 1" preserveAspectRatio="none" viewBox="0 0 1200 120" xmlns="http://www.w3.org/2000/svg">
            <path className="fill-current" d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z"></path>
          </svg>
        </div>
      </section>

      {/* Analytics Section */}
      <section className="py-32 bg-gradient-to-br from-[#5A7A95] via-[#6B9BB8] to-[#7DB5D3] dark:bg-background-dark text-white relative overflow-hidden" id="analytics">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
        <div className="absolute top-0 right-0 w-2/3 h-full bg-gradient-to-l from-purple-400/20 via-pink-400/15 to-transparent skew-x-12 transform origin-top-right"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div className="order-2 lg:order-1 relative">
              <div className="absolute -inset-4 bg-gradient-to-br from-[#6B9BB8]/40 to-[#7DB5D3]/40 rounded-full filter blur-xl"></div>
              <div className="bg-[#1e293b] border border-gray-700/50 rounded-2xl shadow-2xl p-6 relative backdrop-blur-md transform hover:scale-[1.02] transition-transform duration-500">
                <div className="flex items-center justify-between mb-6 border-b border-gray-700 pb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  </div>
                  <span className="text-xs text-gray-400 font-mono">dashboard_view.js</span>
                </div>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-[#1a2530]/80 p-4 rounded-xl border border-gray-700">
                    <p className="text-xs text-gray-400 mb-1 font-medium uppercase tracking-wide">Total Enrollment</p>
                    <p className="text-2xl font-bold font-sans">2,450</p>
                  </div>
                  <div className="bg-[#1a2530]/80 p-4 rounded-xl border border-gray-700">
                    <p className="text-xs text-gray-400 mb-1 font-medium uppercase tracking-wide">Avg Grade</p>
                    <p className="text-2xl font-bold font-sans bg-gradient-to-r from-[#7DB5D3] to-[#8FC7E1] bg-clip-text text-transparent">A-</p>
                  </div>
                  <div className="bg-[#1a2530]/80 p-4 rounded-xl border border-gray-700">
                    <p className="text-xs text-gray-400 mb-1 font-medium uppercase tracking-wide">Revenue</p>
                    <p className="text-2xl font-bold font-sans text-[#C8D9E6]">$4.2M</p>
                  </div>
                </div>
                <div className="bg-[#1a2530]/50 rounded-xl p-6 h-64 flex items-end justify-between gap-4 border border-gray-700/50">
                  {['Q1', 'Q2', 'Q3', 'Q4', 'YTD'].map((quarter, i) => (
                    <div
                      key={quarter}
                      className={`w-full rounded-t-lg transition-all duration-300 cursor-pointer relative group ${
                        i === 4 ? 'bg-[#C8D9E6] h-[90%] hover:h-[95%] shadow-[0_0_15px_rgba(200,217,230,0.3)]' :
                        `bg-[#567C8D] h-[${40 + i * 15}%] hover:h-[${50 + i * 15}%] hover:bg-[#567C8D]`
                      }`}
                      style={{
                        height: i === 4 ? '90%' : `${40 + i * 15}%`,
                        backgroundColor: i === 4 ? '#C8D9E6' : `rgba(107, 155, 184, ${0.3 + i * 0.15})`
                      }}
                    >
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-white bg-gradient-to-r from-[#5A7A95] to-[#6B9BB8] bg-clip-text text-transparent text-xs font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                        {quarter}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <span className="bg-gradient-to-r from-[#7DB5D3] to-[#8FC7E1] bg-clip-text text-transparent font-bold tracking-widest text-sm uppercase mb-2 block">Data Intelligence</span>
              <h2 className="text-4xl lg:text-5xl font-display font-bold mb-6">
                Real-time Data.<br/>Real-world Impact.
              </h2>
              <p className="text-gray-300 text-lg mb-8 leading-relaxed font-sans font-light">
                Move beyond spreadsheets. Our advanced analytics engine processes thousands of data points daily to give you a clear, visual picture of institutional health.
              </p>
              <ul className="space-y-6 mb-10">
                {[
                  { title: 'Predictive Modeling', desc: 'Forecast academic performance and intervene early.' },
                  { title: 'Resource Optimization', desc: 'Heatmaps for facility usage and staff allocation.' },
                  { title: 'Automated Compliance', desc: 'Instant regulatory reports for government boards.' }
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#6B9BB8]/30 to-[#7DB5D3]/30 border border-[#6B9BB8] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <FiCheck className="text-[#6B9BB8] text-sm" />
                    </div>
                    <div>
                      <h4 className="text-white font-bold text-lg">{item.title}</h4>
                      <p className="text-gray-400 text-sm">{item.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <button className="bg-gradient-to-r from-white to-[#F0F5F9] text-[#5A7A95] px-8 py-4 rounded-full font-bold hover:from-white hover:to-white hover:shadow-xl hover:scale-105 transition-all flex items-center gap-2 border border-[#6B9BB8]/20">
                Explore Analytics Dashboard
                <MdTrendingUp className="text-sm" />
              </button>
            </div>
          </div>
        </div>
        <div className="cloud-divider text-[#F5EFEB] dark:text-[#0f172a] bottom-[-1px]">
          <svg data-name="Layer 1" preserveAspectRatio="none" viewBox="0 0 1200 120" xmlns="http://www.w3.org/2000/svg">
            <path className="fill-current" d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z"></path>
          </svg>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-28 bg-[#F5EFEB] dark:bg-black/20" id="testimonials">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <MdFormatQuote className="text-[#567C8D]/20 text-9xl absolute top-0 left-0 transform -translate-x-1/2 -translate-y-1/2 z-0" />
          <div className="relative z-10">
            <h2 className="text-3xl md:text-5xl font-display italic font-medium bg-gradient-to-r from-[#5A7A95] via-[#6B9BB8] to-[#7DB5D3] bg-clip-text text-transparent dark:text-white mb-12 leading-tight">
              &quot;EduCore didn&apos;t just digitize our processes; it transformed our entire culture. We now spend{' '}
              <span className="text-[#6B9BB8] font-bold not-italic">40% less time</span> on administration and{' '}
              <span className="text-[#7DB5D3] font-bold not-italic">100% more time</span> on student success.&quot;
            </h2>
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="w-20 h-20 p-1 rounded-full border-2 bg-gradient-to-br from-[#6B9BB8] to-[#7DB5D3] border-dashed">
                <div className="w-full h-full rounded-full bg-gradient-to-br from-purple-400 to-pink-500"></div>
              </div>
              <div className="text-center">
                <p className="font-bold bg-gradient-to-r from-[#5A7A95] to-[#6B9BB8] bg-clip-text text-transparent dark:text-white text-xl font-display">Dr. Sarah Jenkins</p>
                <p className="bg-gradient-to-r from-[#6B9BB8] to-[#7DB5D3] bg-clip-text text-transparent font-medium uppercase tracking-wider text-xs mt-1">Principal, Westview Academy</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-white dark:bg-background-dark">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-[#5A7A95] via-[#6B9BB8] to-[#7DB5D3] rounded-[2.5rem] p-10 md:p-20 text-center text-white relative overflow-hidden shadow-2xl">
            <div className="absolute inset-0 z-0 opacity-30">
              <div className="w-full h-full bg-gradient-to-br from-blue-400 via-purple-500 via-pink-500 to-orange-400 mix-blend-overlay"></div>
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-[#5A7A95]/95 via-[#6B9BB8]/90 to-[#7DB5D3]/85 z-0"></div>
            <div className="relative z-10">
              <h2 className="text-4xl md:text-6xl font-display font-bold mb-8">Ready to Elevate Your Institution?</h2>
              <p className="text-[#C8D9E6]/90 mb-12 max-w-2xl mx-auto text-lg font-light leading-relaxed">
                Join the league of elite schools managing their ecosystem with intelligence and grace. Experience the difference of a truly premium platform.
              </p>
              <div className="flex flex-col sm:flex-row gap-6 justify-center">
                <Link
                  href="/signup"
                  className="bg-white text-[#5A7A95] font-bold py-5 px-10 rounded-full shadow-lg hover:shadow-xl hover:bg-gradient-to-r hover:from-white hover:to-[#F0F5F9] transition-all transform hover:-translate-y-1 hover:scale-105"
                >
                  Schedule a Personalized Demo
                </Link>
                <button className="bg-transparent border border-white/30 text-white font-bold py-5 px-10 rounded-full hover:bg-white/10 transition-all backdrop-blur-sm">
                  Contact Sales Team
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#2F4156] text-white pt-20 pb-10 border-t border-gray-800 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
            <div>
              <div className="flex items-center space-x-2 mb-8">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#6B9BB8] to-[#7DB5D3] flex items-center justify-center text-white">
                  <MdSchool className="text-sm" />
                </div>
                <span className="font-display font-bold text-xl tracking-wide bg-gradient-to-r from-white to-[#C8D9E6] bg-clip-text text-transparent">
                  EduCore
                </span>
              </div>
              <p className="text-gray-400 text-sm mb-8 leading-relaxed font-sans">
                The premium operating system for modern educational institutions. Designed for excellence, built for trust, and trusted by the world&apos;s leading schools.
              </p>
              <div className="flex space-x-4">
                <a className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:bg-[#567C8D] hover:text-white transition-all" href="#">
                  <span className="sr-only">Twitter</span>
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84"></path>
                  </svg>
                </a>
                <a className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:bg-[#567C8D] hover:text-white transition-all" href="#">
                  <span className="sr-only">LinkedIn</span>
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path clipRule="evenodd" d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" fillRule="evenodd"></path>
                  </svg>
                </a>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-wider uppercase mb-6">Product</h3>
              <ul className="space-y-4">
                {['Features', 'Admissions', 'Finance & HR', 'Mobile App', 'Pricing'].map((link) => (
                  <li key={link}>
                    <a className="text-gray-400 hover:text-[#567C8D] text-sm transition-colors" href="#">{link}</a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-wider uppercase mb-6">Resources</h3>
              <ul className="space-y-4">
                {['Blog', 'Case Studies', 'Help Center', 'API Documentation', 'Security'].map((link) => (
                  <li key={link}>
                    <a className="text-gray-400 hover:text-[#567C8D] text-sm transition-colors" href="#">{link}</a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-wider uppercase mb-6">Contact</h3>
              <ul className="space-y-4">
                <li className="flex items-start space-x-3 text-sm text-gray-400">
                  <MdPlace className="text-[#567C8D] text-lg mt-0.5" />
                  <span>123 Innovation Dr,<br/>San Francisco, CA 94103</span>
                </li>
                <li className="flex items-center space-x-3 text-sm text-gray-400">
                  <MdEmail className="text-[#567C8D] text-lg" />
                  <a className="hover:text-white" href="mailto:hello@educore.com">hello@educore.com</a>
                </li>
                <li className="flex items-center space-x-3 text-sm text-gray-400">
                  <MdPhone className="text-[#567C8D] text-lg" />
                  <span>+1 (555) 123-4567</span>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-gray-500 mb-4 md:mb-0">© 2023 EduCore. All rights reserved.</p>
            <div className="flex space-x-8 text-sm text-gray-500">
              <a className="hover:text-white transition-colors" href="#">Privacy Policy</a>
              <a className="hover:text-white transition-colors" href="#">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}