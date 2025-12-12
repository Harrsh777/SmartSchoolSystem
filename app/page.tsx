'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { FiArrowRight, FiCheck, FiTrendingUp, FiUsers, FiCalendar, FiFileText, FiDollarSign, FiShield, FiTruck, FiMessageSquare, FiBarChart2 } from 'react-icons/fi';

const features = [
  {
    title: 'Student & Staff Management',
    description: 'Comprehensive database for all students and staff members.',
    icon: <FiUsers className="w-6 h-6" />,
    color: 'from-blue-500 to-cyan-400',
    stats: '500+ Schools',
    delay: 0
  },
  {
    title: 'Attendance & Timetable',
    description: 'Track attendance and manage class schedules effortlessly.',
    icon: <FiCalendar className="w-6 h-6" />,
    color: 'from-emerald-500 to-teal-400',
    stats: '99.8% Accuracy',
    delay: 0.1
  },
  {
    title: 'Exams & Report Cards',
    description: 'Create exams, grade assessments, and generate report cards.',
    icon: <FiFileText className="w-6 h-6" />,
    color: 'from-purple-500 to-pink-400',
    stats: 'Auto-generated',
    delay: 0.2
  },
  {
    title: 'Fee Management',
    description: 'Streamline fee collection and payment tracking.',
    icon: <FiDollarSign className="w-6 h-6" />,
    color: 'from-amber-500 to-orange-400',
    stats: 'Instant Tracking',
    delay: 0.3
  },
  {
    title: 'Parent & Teacher Portals',
    description: 'Dedicated portals for parents and teachers to stay connected.',
    icon: <FiShield className="w-6 h-6" />,
    color: 'from-violet-500 to-purple-400',
    stats: 'Real-time Access',
    delay: 0.4
  },
  {
    title: 'Library & Transport',
    description: 'Manage library resources and transportation services.',
    icon: <FiTruck className="w-6 h-6" />,
    color: 'from-rose-500 to-red-400',
    stats: 'GPS Tracking',
    delay: 0.5
  },
  {
    title: 'Communication Hub',
    description: 'Send notices, announcements, and messages instantly.',
    icon: <FiMessageSquare className="w-6 h-6" />,
    color: 'from-indigo-500 to-blue-400',
    stats: 'Instant Delivery',
    delay: 0.6
  },
  {
    title: 'Analytics Dashboard',
    description: 'Real-time insights and comprehensive school analytics.',
    icon: <FiBarChart2 className="w-6 h-6" />,
    color: 'from-green-500 to-emerald-400',
    stats: 'Live Insights',
    delay: 0.7
  },
];

const testimonials = [
  { name: "Sarah Johnson", role: "Principal, Green Valley High", content: "EduFlow360 reduced our administrative work by 70%. Absolutely revolutionary!", school: "Green Valley International" },
  { name: "Michael Chen", role: "IT Director", content: "The analytics dashboard gave us insights we never had before. Game-changer.", school: "Oakridge Academy" },
  { name: "Dr. James Wilson", role: "Superintendent", content: "Parent engagement increased by 300% after implementing the portal.", school: "Maplewood District" },
];

export default function Home() {
  const containerRef = useRef(null);
  useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });
  
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);

  return (
    <div ref={containerRef} className="min-h-screen bg-gradient-to-b from-gray-50 to-white overflow-hidden">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-100 to-transparent rounded-full blur-3xl opacity-50" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-emerald-100 to-transparent rounded-full blur-3xl opacity-50" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-purple-100 to-pink-100 rounded-full blur-3xl opacity-30" />
      </div>

      <Navbar />
      
      {/* Hero Section */}
      <section className="pt-28 pb-16 px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Hero Text */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-2 rounded-full text-sm font-semibold mb-6">
                <FiTrendingUp className="w-4 h-4" />
                Trusted by 500+ Schools Worldwide
              </div>
              
               <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                 <span className="bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                   Transform Your
                 </span>
                 <br />
                 <motion.span 
                   className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
                   animate={{ backgroundPosition: ["0% 50%", "100% 50%"] }}
                   transition={{ duration: 3, repeat: Infinity, repeatType: "reverse" }}
                   style={{ backgroundSize: "200% auto" }}
                 >
                   School Management
                 </motion.span>
               </h1>
              
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                The all-in-one platform that streamlines every operation—from admissions to analytics. 
                <span className="block mt-2 text-lg text-gray-500">
                  Experience the future of school administration.
                </span>
              </p>

              <div className="flex items-center gap-6 mb-10">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 border-2 border-white" />
                    ))}
                  </div>
                  <span className="text-sm text-gray-600">500+ Active Schools</span>
                </div>
                <div className="flex items-center gap-2">
                  <FiCheck className="w-5 h-5 text-emerald-500" />
                  <span className="text-sm text-gray-600">99.9% Uptime</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/signup">
                  <Button size="lg" variant="primary" className="group">
                    Start Free Trial
                    <FiArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Link href="/demo">
                  <Button size="lg" variant="outline" className="border-gray-300 hover:border-gray-400">
                    <span className="mr-2">▶</span>
                    Watch Demo
                  </Button>
                </Link>
              </div>
            </motion.div>

            {/* Right: Interactive Dashboard Preview */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
              className="relative"
            >
              <div className="relative bg-gradient-to-br from-white to-gray-50 rounded-3xl p-6 shadow-2xl shadow-blue-500/10 border border-gray-100">
                {/* Dashboard UI */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white px-4 py-1 rounded-full shadow-sm border">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-xs font-medium">Live Dashboard</span>
                  </div>
                </div>
                
                <div className="aspect-video rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 overflow-hidden">
                  {/* Simulated Dashboard Content */}
                  <div className="p-6 h-full">
                    <div className="flex justify-between items-center mb-6">
                      <div>
                        <div className="h-3 w-32 bg-gray-700 rounded mb-2" />
                        <div className="h-2 w-24 bg-gray-600 rounded" />
                      </div>
                      <div className="flex gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gray-700" />
                        <div className="w-8 h-8 rounded-lg bg-gray-700" />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      {[65, 42, 89].map((percent, i) => (
                        <div key={i} className="bg-gray-800 rounded-xl p-4">
                          <div className="flex justify-between items-center mb-2">
                            <div className="h-2 w-16 bg-gray-600 rounded" />
                            <div className="text-sm text-emerald-400">{percent}%</div>
                          </div>
                          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                            <motion.div 
                              className="h-full bg-gradient-to-r from-blue-500 to-cyan-400"
                              initial={{ width: 0 }}
                              animate={{ width: `${percent}%` }}
                              transition={{ duration: 1, delay: i * 0.2 }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-800 rounded-xl p-4">
                        <div className="h-3 w-24 bg-gray-600 rounded mb-4" />
                        <div className="space-y-2">
                          {[...Array(3)].map((_, i) => (
                            <div key={i} className="flex items-center justify-between">
                              <div className="h-2 w-20 bg-gray-600 rounded" />
                              <div className="h-2 w-8 bg-gray-600 rounded" />
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-3 h-3 rounded-full bg-blue-400 animate-pulse" />
                          <div className="h-2 w-32 bg-blue-400/50 rounded" />
                        </div>
                        <div className="h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                          <span className="text-sm font-medium">Live Updates Active</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Floating Stats */}
                <motion.div 
                  className="absolute -bottom-4 -right-4 bg-white rounded-2xl p-4 shadow-xl border"
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <div className="text-sm font-semibold text-gray-900">🚀 87% Efficiency Boost</div>
                  <div className="text-xs text-gray-500">Reported by schools</div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-700 px-4 py-2 rounded-full text-sm font-semibold mb-4">
              <FiCheck className="w-4 h-4" />
              Everything You Need In One Place
            </div>
            <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent mb-4">
              Powerful Features
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Comprehensive tools designed to streamline every aspect of school management
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: feature.delay }}
                onMouseEnter={() => setHoveredFeature(index)}
                onMouseLeave={() => setHoveredFeature(null)}
              >
                <Card hover className="h-full relative overflow-hidden group">
                  {/* Animated Background */}
                  <motion.div 
                    className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}
                    animate={hoveredFeature === index ? { scale: 1.1 } : { scale: 1 }}
                  />
                  
                  {/* Icon */}
                  <motion.div 
                    className={`inline-flex p-3 rounded-2xl mb-6 bg-gradient-to-br ${feature.color} text-white`}
                    animate={hoveredFeature === index ? { rotate: [0, -10, 10, 0] } : {}}
                    transition={{ duration: 0.5 }}
                  >
                    {feature.icon}
                  </motion.div>
                  
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 mb-4">{feature.description}</p>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-500">{feature.stats}</span>
                    <motion.div
                      animate={hoveredFeature === index ? { x: 5 } : { x: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <FiArrowRight className="w-5 h-5 text-gray-400" />
                    </motion.div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent mb-4">
              Loved by Schools Worldwide
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Join thousands of educational institutions transforming their operations
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <div className="bg-white rounded-2xl p-8 shadow-lg shadow-gray-200 border border-gray-100 h-full">
                  <div className="flex items-center gap-2 mb-6">
                    {[...Array(5)].map((_, i) => (
                      <span key={i} className="text-amber-400">★</span>
                    ))}
                  </div>
                  <p className="text-gray-700 text-lg mb-8 italic">&quot;{testimonial.content}&quot;</p>
                  <div>
                    <div className="font-bold text-gray-900">{testimonial.name}</div>
                    <div className="text-gray-600 text-sm mb-1">{testimonial.role}</div>
                    <div className="text-blue-600 text-sm font-medium">{testimonial.school}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5" />
        
        <div className="max-w-4xl mx-auto relative">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <div className="inline-flex items-center gap-2 bg-white text-gray-900 px-6 py-3 rounded-full shadow-lg shadow-blue-500/10 mb-8">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-semibold">14-Day Free Trial • No Credit Card Required</span>
            </div>
            
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Ready to Transform Your School?
            </h2>
            
            <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
              Join 500+ leading educational institutions already using EduFlow360
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/signup">
                <Button size="lg" variant="primary" className="px-8 group">
                  Start Free Trial
                  <FiArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link href="/demo">
                <Button size="lg" variant="ghost" className="text-gray-700">
                  Schedule a Demo
                </Button>
              </Link>
            </div>
            
            <p className="text-sm text-gray-500 mt-8">
              ✨ Free onboarding • 24/7 Support • Cancel anytime
            </p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gradient-to-b from-gray-900 to-gray-950 text-white pt-12 pb-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-8">
            <div className="lg:col-span-2">
              <h3 className="text-2xl font-bold mb-4">EduFlow360</h3>
              <p className="text-gray-400 max-w-md">
                The complete school operating system that simplifies every aspect of educational administration.
              </p>
            </div>
            
            {['Product', 'Company', 'Resources', 'Legal'].map((category) => (
              <div key={category}>
                <h4 className="font-semibold mb-4 text-white">{category}</h4>
                <ul className="space-y-3 text-gray-400">
                  {['Features', 'Pricing', 'Updates'].map((item) => (
                    <li key={item}>
                      <Link href="#" className="hover:text-white transition-colors duration-200">
                        {item}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          
          <div className="mt-12 pt-8 border-t border-gray-800">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-gray-400 text-sm">
                © 2024 EduFlow360. All rights reserved.
              </p>
              <div className="flex items-center gap-6">
                <span className="text-sm text-gray-400">
                  <span className="text-emerald-400">●</span> All systems operational
                </span>
                <div className="flex gap-4">
                  {['Twitter', 'LinkedIn', 'GitHub'].map((social) => (
                    <a key={social} href="#" className="text-gray-400 hover:text-white transition-colors">
                      {social}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}