'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  FiArrowRight, FiCheck, FiPlay
} from 'react-icons/fi';
import { 
 MdPeopleAlt, MdPayments, 
  MdLibraryBooks, MdDirectionsBus, MdChat, 
  MdAnalytics, MdAutoGraph,
  MdPlace, MdEmail, MdPhone, MdFormatQuote,
  MdTrendingUp, MdArrowForward, MdSchool,
  MdCopyright
} from 'react-icons/md';
import FeaturesPage from '@/components/scroll';
import FAQSection from '@/components/FAQ';
import Background from '@/components/background';

export default function EduCoreLanding() {


  const [scrolled, setScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const heroRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 20);

      const doc = document.documentElement;
      const totalScrollable = doc.scrollHeight - window.innerHeight;
      const progress = totalScrollable > 0 ? Math.min(1, Math.max(0, y / totalScrollable)) : 0;
      setScrollProgress(progress);
    };
    window.addEventListener('scroll', handleScroll);
    handleScroll();

    // Smooth scroll handler for anchor links
    const handleAnchorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a[href^="#"]');
      if (link) {
        const href = link.getAttribute('href');
        if (href && href !== '#') {
          e.preventDefault();
          const element = document.querySelector(href);
          if (element) {
            const offset = 80; // Navbar height offset
            const elementPosition = element.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - offset;
            window.scrollTo({
              top: offsetPosition,
              behavior: 'smooth'
            });
          }
        }
      }
    };
    document.addEventListener('click', handleAnchorClick);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('click', handleAnchorClick);
    };
  }, []);

  const handleCreatorClick = () => {
    window.open('https://www.linkedin.com/in/harrshh/', '_blank');
  };

  return (
    <div className="bg-gradient-to-b from-white via-[#F5F9FF] to-[#E8F2FF] dark:bg-gradient-to-b dark:from-[#0a0f1a] dark:via-[#0f172a] dark:to-[#1a2332] text-navy dark:text-skyblue transition-colors duration-300 antialiased selection:bg-teal/30 selection:text-teal-800 dark:selection:bg-teal-500/30 min-h-screen overflow-x-hidden">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Playfair+Display:wght@400;500;600;700;800;900&display=swap');
        
        body {
          font-family: 'Inter', sans-serif;
          scroll-behavior: smooth;
          overflow-x: hidden;
        }
        h1, h2, h3, h4, h5, h6 {
          font-family: 'Playfair Display', serif;
        }
        
        .glass-card {
          background: rgba(255, 255, 255, 0.92);
          backdrop-filter: blur(20px) saturate(180%);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
          border: 1px solid rgba(255, 255, 255, 0.8);
          box-shadow: 
            0 8px 32px rgba(31, 38, 135, 0.05),
            0 4px 16px rgba(31, 38, 135, 0.03),
            inset 0 1px 0 rgba(255, 255, 255, 0.6);
        }
        .dark .glass-card {
          background: rgba(30, 41, 59, 0.85);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 
            0 8px 32px rgba(0, 0, 0, 0.2),
            0 4px 16px rgba(0, 0, 0, 0.1),
            inset 0 1px 0 rgba(255, 255, 255, 0.05);
        }
        
        .gradient-text {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #f5576c 75%, #f093fb 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: gradient 8s ease infinite;
        }
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        
        .gradient-border {
          position: relative;
          border: double 2px transparent;
          border-radius: 24px;
          background-image: linear-gradient(white, white), 
                            linear-gradient(135deg, #667eea, #764ba2, #f093fb, #f5576c);
          background-origin: border-box;
          background-clip: padding-box, border-box;
        }
        .dark .gradient-border {
          background-image: linear-gradient(#1e293b, #1e293b), 
                            linear-gradient(135deg, #667eea, #764ba2, #f093fb, #f5576c);
        }
        
       
        
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        
        @keyframes blob {
          0%, 100% {
            transform: translate(0px, 0px) scale(1);
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
        
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(102, 126, 234, 0.5); }
          50% { box-shadow: 0 0 40px rgba(118, 75, 162, 0.7); }
        }
        .animate-pulse-glow {
          animation: pulse-glow 3s ease-in-out infinite;
        }
        
        .scroll-progress {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 3px;
          background: linear-gradient(90deg, #667eea, #764ba2, #f093fb, #f5576c);
          transform-origin: 0%;
          z-index: 1000;
        }
        
        .parallax-bg {
          background-attachment: fixed;
          background-position: center;
          background-repeat: no-repeat;
          background-size: cover;
        }
        
        .floating-particles {
          position: absolute;
          width: 100%;
          height: 100%;
          top: 0;
          left: 0;
          overflow: hidden;
          z-index: 0;
        }
        .particle {
          position: absolute;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(102,126,234,0.2) 0%, rgba(118,75,162,0.1) 100%);
          pointer-events: none;

          .arch-mask {
  clip-path: path(
    "M 0 120
     Q 50% -40 100% 120
     L 100% 100%
     L 0 100%
     Z"
  );
}
        }
      `}</style>

      {/* Scroll Progress Indicator */}
      <div className="scroll-progress" style={{ transform: `scaleX(${scrollProgress})` }} />

      {/* Floating Contact Button */}
      <button 
        onClick={() => {
          const element = document.querySelector('#pricing');
          if (element) {
            const offset = 80;
            const elementPosition = element.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - offset;
            window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
          }
        }}
        className="fixed bottom-4 right-4 sm:bottom-8 sm:right-8 z-50 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-[#667eea] to-[#764ba2] text-white shadow-2xl hover:shadow-3xl hover:scale-110 transition-all duration-300 animate-pulse-glow flex items-center justify-center"
      >
        <MdChat className="text-lg sm:text-xl" />
      </button>

      {/* Navbar */}
      <nav
  className={`fixed w-full z-50 transition-all duration-500 ${
    scrolled
      ? "bg-[#14072e]/70 backdrop-blur-xl border-b border-white/10 shadow-2xl"
      : "bg-[#14072e]/30 backdrop-blur-md border-b border-white/5"
  }`}
>
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="flex justify-between items-center h-12 sm:h-14">

      {/* Logo */}
      <div className="flex items-center space-x-2 group cursor-pointer">
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-[#667eea] via-[#764ba2] to-[#f093fb] flex items-center justify-center text-white shadow-lg group-hover:rotate-12 transition-transform duration-300">
          <MdSchool className="text-base sm:text-lg" />
        </div>
        <span className="font-display font-bold text-lg sm:text-xl bg-gradient-to-r from-[#667eea] to-[#764ba2] bg-clip-text text-transparent">
          EduCore
        </span>
      </div>

      {/* Desktop Menu */}
      <div className="hidden lg:flex items-center space-x-6 xl:space-x-8">
        {["Solutions", "Analytics", "Success Stories", "Pricing"].map((item, i) => (
          <a
            key={i}
            href={`#${item.toLowerCase().replace(" ", "")}`}
            className="relative text-sm font-medium text-white/80 hover:text-white transition-colors group"
          >
            {item}
            <span className="absolute -bottom-1 left-1/2 w-0 h-[2px] bg-gradient-to-r from-white to-[#764ba2] transition-all duration-300 group-hover:w-full group-hover:left-0"></span>
          </a>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        
        {/* Login */}
        <Link
          href="/login"
          className="hidden md:inline-flex items-center px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium text-[#667eea] hover:text-[#764ba2] transition-colors relative group"
        >
          Log in
          <span className="absolute inset-0 rounded-full bg-gradient-to-r from-[#667eea]/10 to-[#764ba2]/10 opacity-0 group-hover:opacity-100 transition-opacity"></span>
        </Link>

        {/* CTA */}
        <Link
          href="/demo"
          className="inline-flex items-center gap-1.5 px-4 sm:px-6 py-1.5 sm:py-2 rounded-full bg-gradient-to-r from-[#667eea] via-[#764ba2] to-[#f093fb] text-white text-xs sm:text-sm font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
        >
          <span className="hidden sm:inline">Request Demo</span>
          <span className="sm:hidden">Demo</span>
          <FiArrowRight className="text-xs sm:text-sm group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
    </div>
  </div>
</nav>

      {/* Hero Section */}
     <section ref={heroRef} className="relative overflow-hidden min-h-screen flex items-center pt-24 pb-14"> <div className="absolute inset-0 z-0"> <Background className="opacity-95" /> <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(154,82,255,0.35),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(42,191,255,0.22),transparent_40%)]" /> </div> <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full"> <div className="text-center mt-5 mb-10"> <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight tracking-tight"> Powerful Tools for Effective <br /> School Management </h1> <p className="mt-5 text-base sm:text-lg text-white/75 max-w-3xl mx-auto"> Your complete SaaS platform for academic operations, finance, attendance, communication, and growth. </p> <div className="mt-8 flex flex-wrap items-center justify-center gap-3"> <Link href="/signup" className="px-7 py-3.5 rounded-full bg-gradient-to-r from-[#8b5cf6] to-[#a855f7] text-white font-semibold shadow-[0_10px_30px_rgba(139,92,246,0.45)] hover:scale-[1.02] transition-all duration-300 flex items-center gap-2" > Get started <FiArrowRight className="text-sm" /> </Link> <a href="#features" className="px-7 py-3.5 rounded-full border border-white/25 bg-white/5 text-white font-semibold hover:bg-white/10 transition-all duration-300 flex items-center gap-2" > <FiPlay className="text-sm" /> See How it works </a> </div> </div> {/* Hero bento — high-res educational imagery */} <div className="grid grid-cols-12 gap-4 md:gap-5 lg:gap-6"> {/* LEFT INFO CARD */} <div className="col-span-12 md:col-span-4 lg:col-span-3 rounded-2xl bg-white/10 backdrop-blur-lg border border-white/20 p-5 flex flex-col justify-between min-h-[180px]"> <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-violet-300"> <div className="w-6 h-6 rounded-full bg-violet-600 flex items-center justify-center text-white">→</div> Platform </div> <div> <h3 className="text-white font-semibold text-lg leading-snug mt-4"> Empower your institution with School Manager Pro </h3> <p className="text-white/60 text-sm mt-2"> One connected workspace for academics, finance, and community—built for modern schools. </p> </div> </div> {/* HERO IMAGE (FIXED HEIGHT NOW) */} <div className="col-span-12 md:col-span-8 lg:col-span-6 rounded-2xl overflow-hidden relative group min-h-[200px]"> <Image src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=3840&q=88" alt="Students collaborating" fill className="object-cover transition-transform duration-700 group-hover:scale-105" /> <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" /> <div className="absolute bottom-4 left-4"> <p className="text-xs text-white/70 uppercase tracking-wider"> Learning together </p> <p className="text-white font-semibold text-sm"> Collaboration that scales from class to campus </p> </div> </div> {/* STATS COLUMN */} <div className="col-span-12 md:col-span-12 lg:col-span-3 flex flex-row lg:flex-col gap-4"> {/* 260% */} <div className="flex-1 rounded-2xl bg-white/90 backdrop-blur-md p-4 flex flex-col justify-end shadow-lg"> <span className="text-3xl font-extrabold bg-gradient-to-br from-violet-600 to-fuchsia-500 bg-clip-text text-transparent"> 260% </span> <p className="text-xs text-gray-600 mt-2"> Faster workflows when admin & teaching tools live together </p> </div> {/* 98% */} <div className="flex-1 rounded-2xl bg-white/90 backdrop-blur-md p-4 flex flex-col justify-end shadow-lg"> <span className="text-3xl font-extrabold bg-gradient-to-br from-cyan-600 to-violet-500 bg-clip-text text-transparent"> 98% </span> <p className="text-xs text-gray-600 mt-2"> Stronger trust in reporting & parent communication </p> </div> </div> {/* BOTTOM LEFT */} <div className="col-span-12 md:col-span-6 rounded-2xl overflow-hidden relative group min-h-[160px]"> <Image src="https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=3840&q=88" alt="Campus" fill className="object-cover transition-transform duration-700 group-hover:scale-105" /> <div className="absolute inset-0 bg-black/40" /> <span className="absolute bottom-3 left-3 text-xs text-white uppercase"> Campus & Library Ready </span> </div> {/* BOTTOM RIGHT */} <div className="col-span-12 md:col-span-6 rounded-2xl overflow-hidden relative group min-h-[160px]"> <Image src="https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=3840&q=88" alt="Teaching" fill className="object-cover transition-transform duration-700 group-hover:scale-105" /> <div className="absolute inset-0 bg-black/40" /> <span className="absolute bottom-3 left-3 text-xs text-white uppercase"> Engaged Teaching </span> </div> </div> </div> </section>

      {/* Logo Section */}
     

      {/* Features Section */}
      <section className="py-16 sm:py-24 lg:py-32 bg-gradient-to-b from-gray-50 to-white dark:from-[#1a2332] dark:to-[#0f172a] relative overflow-hidden" id="features">
        {/* Cloud Divider Top */}
       

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16 lg:mb-24">
            <span className="inline-block px-4 sm:px-6 py-1.5 sm:py-2 rounded-full bg-gradient-to-r from-[#667eea]/10 to-[#764ba2]/10 text-[#667eea] text-xs sm:text-sm font-bold tracking-wider uppercase border border-[#667eea]/20 mb-4 sm:mb-6">
              Holistic Management
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-3 sm:mb-4">
              <span className="gradient-text">Engineered</span> for <br className="hidden sm:block"/>
              <span className="italic text-gray-800 dark:text-white">Excellence</span>
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-base sm:text-lg lg:text-xl font-light leading-relaxed px-4 sm:px-0">
              A unified platform that integrates every aspect of academic administration into one intuitive, human-centric interface.
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {[
              { icon: <MdPeopleAlt className="text-3xl" />, title: 'Student Lifecycle', desc: 'Comprehensive tracking from initial inquiry to alumni status.', color: 'from-blue-400 to-cyan-500' },
              { icon: <MdPayments className="text-3xl" />, title: 'Smart Finance', desc: 'Automated fee collection, payroll, and budget forecasting.', color: 'from-emerald-400 to-teal-500' },
              { icon: <MdLibraryBooks className="text-3xl" />, title: 'Academic Planner', desc: 'Dynamic curriculum mapping and timetable generation.', color: 'from-purple-400 to-pink-500' },
              { icon: <MdChat className="text-3xl" />, title: 'Communication Hub', desc: 'Unified messaging via SMS, Email, and Mobile App.', color: 'from-orange-400 to-amber-500' },
              { icon: <MdAnalytics className="text-3xl" />, title: 'Executive Insights', desc: 'Customizable dashboards for actionable intelligence.', color: 'from-indigo-400 to-violet-500' }
            ].map((feature, i) => (
              <div key={i} className="group relative h-full flex flex-col">
                <div className="absolute inset-0 bg-gradient-to-br from-[#667eea] via-[#764ba2] to-[#f093fb] rounded-2xl sm:rounded-3xl opacity-0 group-hover:opacity-100 blur-xl transition-all duration-500"></div>
                <div className="relative h-full flex flex-col glass-card rounded-2xl sm:rounded-3xl p-6 sm:p-8 transform group-hover:-translate-y-2 transition-all duration-300">
                  <div className={`w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-xl sm:rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 sm:mb-6 transform group-hover:scale-110 transition-transform duration-300 flex-shrink-0`}>
                    <div className="text-white text-xl sm:text-2xl lg:text-3xl">{feature.icon}</div>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white mb-3 sm:mb-4">{feature.title}</h3>
                  <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 leading-relaxed mb-6 sm:mb-8 flex-grow">{feature.desc}</p>
                  <div className="pt-4 sm:pt-6 border-t border-gray-100 dark:border-gray-700 mt-auto">
                    <a 
                      href="#solutions"
                      className="inline-flex items-center text-sm sm:text-base font-semibold gradient-text group/link cursor-pointer"
                    >
                      Explore Module
                      <MdArrowForward className="ml-2 transform group-hover/link:translate-x-2 transition-transform" />
                    </a>
                  </div>
                </div>
              </div>
            ))}
            
            {/* Transport Card - Special */}
            <div className="group relative sm:col-span-2 lg:col-span-1">
              <div className="absolute inset-0 bg-gradient-to-br from-[#667eea] via-[#764ba2] to-[#f093fb] rounded-2xl sm:rounded-3xl opacity-0 group-hover:opacity-100 blur-xl transition-all duration-500"></div>
              <div className="relative h-full rounded-2xl sm:rounded-3xl overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-[#667eea] via-[#764ba2] to-[#f093fb]"></div>
                <div className="relative h-full p-6 sm:p-8 flex flex-col">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-xl sm:rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4 sm:mb-6 border border-white/30">
                    <MdDirectionsBus className="text-xl sm:text-2xl lg:text-3xl text-white" />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">Transport & Safety</h3>
                  <p className="text-sm sm:text-base text-white/80 leading-relaxed mb-6 sm:mb-8 flex-grow">
                    Real-time GPS bus tracking, gate security integration, and instant emergency notifications for parents.
                  </p>
                  <div className="pt-4 sm:pt-6 border-t border-white/20">
                    <a 
                      href="#solutions"
                      className="inline-flex items-center text-sm sm:text-base text-white font-semibold group/link cursor-pointer"
                    >
                      Explore Module
                      <MdArrowForward className="ml-2 transform group-hover/link:translate-x-2 transition-transform" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Cloud Divider Bottom */}
        
      </section>

      {/* Analytics Section */}
      <section className="py-16 sm:py-24 lg:py-32 bg-gradient-to-br from-[#667eea] via-[#764ba2] to-[#f093fb] relative overflow-hidden" id="analytics">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 sm:gap-16 lg:gap-20 items-center">
            <div className="order-2 lg:order-1">
              <div className="relative">
                <div className="absolute -inset-4 sm:-inset-6 bg-gradient-to-br from-white/10 to-transparent rounded-2xl sm:rounded-3xl blur-2xl"></div>
                <div className="relative glass-card rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 transform hover:scale-[1.02] transition-transform duration-500 overflow-hidden">
                  {/* Background Image Inside Box */}
                  <div className="absolute inset-0 ">
                    <Image
                      src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=2000"
                      alt="Analytics dashboard background"
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4 sm:mb-6 lg:mb-8 pb-4 sm:pb-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-red-500"></div>
                      <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-yellow-500"></div>
                      <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-green-500"></div>
                    </div>
                    <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-mono">analytics_dashboard.js</span>
                  </div>
    
                  <div className="relative h-48 sm:h-56 lg:h-64 rounded-xl sm:rounded-2xl overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent"></div>
                    <div className="absolute bottom-0 left-0 right-0 h-24 sm:h-28 lg:h-32 flex items-end justify-between px-3 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6">
                      {['Q1', 'Q2', 'Q3', 'Q4', 'YTD'].map((quarter, i) => (
                        <div key={quarter} className="relative group">
                          <div 
                            className="w-8 sm:w-12 lg:w-16 rounded-t-lg sm:rounded-t-xl bg-gradient-to-t from-white/30 to-white/10 backdrop-blur-sm transition-all duration-300 group-hover:opacity-100"
                            style={{ height: `${20 + i * 12}px` }}
                          >
                            <div className="absolute -top-6 sm:-top-8 left-1/2 -translate-x-1/2 bg-white text-gray-800 text-[10px] sm:text-xs font-bold px-2 sm:px-3 py-0.5 sm:py-0.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                              {quarter}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="order-1 lg:order-2 text-center lg:text-left">
              <span className="text-white/80 font-bold tracking-widest text-xs sm:text-sm uppercase mb-3 sm:mb-4 block">Data Intelligence</span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 sm:mb-8">
                Real-time Data.<br/>
                <span className="italic">Real-world</span> Impact.
              </h2>
              <p className="text-white/80 text-base sm:text-lg mb-8 sm:mb-10 leading-relaxed font-light px-4 sm:px-0">
                Move beyond spreadsheets. Our advanced analytics engine processes thousands of data points daily to give you a clear, visual picture of institutional health.
              </p>
              
              <ul className="space-y-6 sm:space-y-8 mb-8 sm:mb-12">
                {[
                  { title: 'Predictive Modeling', desc: 'Forecast academic performance and intervene early.' },
                  { title: 'Resource Optimization', desc: 'Heatmaps for facility usage and staff allocation.' },
                  { title: 'Automated Compliance', desc: 'Instant regulatory reports for government boards.' }
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 sm:gap-4">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center flex-shrink-0 mt-1">
                      <FiCheck className="text-white text-xs sm:text-sm" />
                    </div>
                    <div className="text-left">
                      <h4 className="text-white font-bold text-base sm:text-lg mb-1">{item.title}</h4>
                      <p className="text-white/70 text-sm sm:text-base">{item.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
              
              <button 
                onClick={() => {
                  const element = document.querySelector('#solutions');
                  if (element) {
                    const offset = 80;
                    const elementPosition = element.getBoundingClientRect().top;
                    const offsetPosition = elementPosition + window.pageYOffset - offset;
                    window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
                  }
                }}
                className="bg-white text-gray-800 px-6 sm:px-8 lg:px-10 py-3 sm:py-4 rounded-full text-sm sm:text-base font-bold hover:shadow-2xl hover:scale-105 transition-all duration-300 flex items-center gap-2 sm:gap-3 group cursor-pointer mx-auto lg:mx-0"
              >
                Explore Analytics Dashboard
                <MdTrendingUp className="text-base sm:text-lg transform group-hover:scale-110 transition-transform" />
              </button>
            </div>
          </div>
        </div>
        
        {/* Cloud Divider */}
        
      </section>

      {/* Testimonials Section */}
      <section className="py-16 sm:py-24 lg:py-32 bg-gradient-to-b from-white to-gray-50 dark:from-[#0f172a] dark:to-[#1a2332] relative" id="testimonials">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <MdFormatQuote className="text-[#667eea]/10 text-6xl sm:text-7xl lg:text-9xl absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-0" />
          
          <div className="relative z-10">
            <div className="inline-block mb-8 sm:mb-10 lg:mb-12">
              <span className="text-xs sm:text-sm font-bold uppercase tracking-[0.2em] sm:tracking-[0.3em] gradient-text">Success Stories</span>
            </div>
            
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-display italic font-medium mb-12 sm:mb-14 lg:mb-16 leading-tight px-2 sm:px-0">
              <span className="gradient-text">&ldquo;EduCore didn&apos;t just digitize our processes;</span><br/>
              <span className="text-gray-800 dark:text-white">it transformed our entire culture. We now spend </span>
              <span className="text-[#667eea] font-bold not-italic">40% less time</span>
              <span className="text-gray-800 dark:text-white"> on administration and </span>
              <span className="text-[#764ba2] font-bold not-italic">100% more time</span>
              <span className="text-gray-800 dark:text-white"> on student success.&rdquo;</span>
            </h2>
            
           
          </div>
        </div>
      </section>

      {/* CTA Section */}
     <div id="solutions">
       <FeaturesPage />
     </div>
     <div id="pricing">
       <FAQSection />
     </div>

      {/* Footer */}
      <footer className="bg-gradient-to-b from-gray-900 to-black pt-12 sm:pt-16 lg:pt-24 pb-8 sm:pb-10 lg:pb-12 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
        </div>
        
        {/* Floating Elements */}
        <div className="absolute top-0 left-0 w-32 h-32 sm:w-48 sm:h-48 lg:w-64 lg:h-64 bg-gradient-to-br from-[#667eea]/10 to-[#764ba2]/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-48 h-48 sm:w-72 sm:h-72 lg:w-96 lg:h-96 bg-gradient-to-br from-[#f093fb]/10 to-[#f5576c]/10 rounded-full blur-3xl"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10 lg:gap-12 mb-12 sm:mb-14 lg:mb-16">
            <div className="sm:col-span-2 lg:col-span-1">
              <div className="flex items-center space-x-2 sm:space-x-3 mb-6 sm:mb-8 group cursor-pointer">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-[#667eea] to-[#764ba2] flex items-center justify-center text-white shadow-xl group-hover:rotate-12 transition-transform duration-300">
                  <MdSchool className="text-lg sm:text-xl" />
                </div>
                <span className="font-display font-bold text-xl sm:text-2xl bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  EduCore
                </span>
              </div>
              <p className="text-gray-400 text-xs sm:text-sm mb-6 sm:mb-8 leading-relaxed font-light">
                The premium operating system for modern educational institutions. Designed for excellence, built for trust.
              </p>
              <div className="flex space-x-3 sm:space-x-4">
                {['twitter', 'linkedin', 'github'].map((social) => (
                  <a
                    key={social}
                    href="#"
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gray-800 flex items-center justify-center text-gray-400 hover:bg-gradient-to-br hover:from-[#667eea] hover:to-[#764ba2] hover:text-white transition-all duration-300"
                  >
                    <span className="sr-only">{social}</span>
                    <div className="w-4 h-4 sm:w-5 sm:h-5 bg-current"></div>
                  </a>
                ))}
              </div>
            </div>
            
            {[
              {
                title: 'Product',
                links: ['Features', 'Admissions', 'Finance & HR', 'Mobile App', 'Pricing']
              },
              {
                title: 'Resources',
                links: ['Blog', 'Case Studies', 'Help Center', 'API Documentation', 'Security']
              },
              {
                title: 'Contact',
                links: [
                  { icon: <MdPlace />, text: '123 Innovation Dr, San Francisco, CA' },
                  { icon: <MdEmail />, text: 'hello@educore.com' },
                  { icon: <MdPhone />, text: '+1 (555) 123-4567' }
                ]
              }
            ].map((column, colIndex) => (
              <div key={colIndex}>
                <h3 className="text-xs sm:text-sm font-bold text-white tracking-wider uppercase mb-4 sm:mb-6 lg:mb-8">
                  {column.title}
                </h3>
                <ul className="space-y-3 sm:space-y-4">
                  {column.links.map((link, linkIndex) => (
                    <li key={linkIndex}>
                      {typeof link === 'string' ? (
                        <a className="text-gray-400 hover:text-white text-xs sm:text-sm transition-colors duration-300 group flex items-center" href="#">
                          {link}
                          <span className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                        </a>
                      ) : (
                        <div className="flex items-start space-x-2 sm:space-x-3 text-xs sm:text-sm text-gray-400">
                          <span className="text-[#667eea] mt-0.5 flex-shrink-0">{link.icon}</span>
                          <span className="break-words">{link.text}</span>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          
          <div className="pt-8 sm:pt-10 lg:pt-12 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2 text-gray-500 text-xs sm:text-sm">
              <MdCopyright className="text-xs" />
              <span>2026s EduCore. All rights reserved.</span>
            </div>
            
            {/* Creator Credit */}
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
              <div className="text-xs sm:text-sm text-gray-500">
                <a 
                  onClick={handleCreatorClick}
                  className="hover:text-white transition-colors duration-300 cursor-pointer font-thin tracking-wider opacity-75 hover:opacity-100"
                  style={{ fontSize: '0.75rem', letterSpacing: '0.1em' }}
                >
                  Made by Harsh Srivastava
                </a>
              </div>
              
              <div className="flex space-x-6 sm:space-x-8 text-xs sm:text-sm text-gray-500">
                <a className="hover:text-white transition-colors duration-300" href="#">
                  Privacy Policy
                </a>
                <a className="hover:text-white transition-colors duration-300" href="#">
                  Terms of Service
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}