'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { FiArrowUpRight, FiCheck, FiStar, FiAward, FiTrendingUp } from 'react-icons/fi';
import { MessageSquare, Lightbulb, Gamepad2, Users, Brain, Sparkles, Target, Zap, Shield } from 'lucide-react';
import { useState } from 'react';

export default function Home() {
  const [hoveredFeature, setHoveredFeature] = useState(null);

  const stats = [
    { value: '10K+', label: 'Active Students', icon: <Users className="w-4 h-4" /> },
    { value: '500+', label: 'Schools', icon: <FiAward className="w-4 h-4" /> },
    { value: '98%', label: 'Satisfaction Rate', icon: <FiStar className="w-4 h-4" /> },
    { value: '24/7', label: 'Support', icon: <Shield className="w-4 h-4" /> },
  ];

  const features = [
    {
      title: "Intelligent Analytics",
      description: "Real-time insights into student performance and institutional metrics",
      icon: <Brain className="w-6 h-6" />,
      color: "from-blue-500 to-cyan-400",
    },
    {
      title: "Automated Workflows",
      description: "Streamline administrative tasks with AI-powered automation",
      icon: <Zap className="w-6 h-6" />,
      color: "from-purple-500 to-pink-500",
    },
    {
      title: "Interactive Learning",
      description: "Engage students with gamified content and adaptive learning paths",
      icon: <Target className="w-6 h-6" />,
      color: "from-orange-500 to-yellow-400",
    },
    {
      title: "Collaborative Tools",
      description: "Seamless communication between teachers, students, and parents",
      icon: <MessageSquare className="w-6 h-6" />,
      color: "from-green-500 to-emerald-400",
    },
  ];

  return (
    <div className="min-h-screen bg-white overflow-hidden">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <motion.div
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-purple-100 to-transparent rounded-full blur-3xl opacity-30"
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
            x: [0, 50, 0],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-l from-blue-100 to-transparent rounded-full blur-3xl opacity-30"
          animate={{
            scale: [1.2, 1, 1.2],
            rotate: [90, 0, 90],
            x: [50, 0, 50],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        />
      </div>

      <Navbar />

      {/* Hero Section */}
      <section className="pt-28 pb-20 px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left Content */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="relative"
            >
              {/* Badge */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500/10 to-blue-500/10 backdrop-blur-sm rounded-full px-4 py-2 mb-8 border border-purple-200/50"
              >
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-medium text-gray-700">Trusted by 500+ institutions worldwide</span>
              </motion.div>

              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-[1.1] tracking-tight">
                <span className="text-gray-900">Next-Gen</span>{' '}
                <span className="relative inline-block">
                  <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                    School
                  </span>
                  <motion.div
                    className="absolute -bottom-2 left-0 h-1 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ delay: 0.5, duration: 1 }}
                  />
                </span>{' '}
                <br />
                <span className="text-gray-900">Management</span>
                <br />
                <span className="text-gray-900">Platform</span>
              </h1>

              <p className="text-base text-gray-600 mb-8 leading-relaxed max-w-xl">
                Revolutionize educational administration with our AI-powered platform. Streamline operations, 
                enhance learning experiences, and empower educators with cutting-edge technology designed 
                for modern educational institutions.
              </p>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                {stats.map((stat, index) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                    className="text-center"
                  >
                    <div className="flex items-center justify-center gap-1 mb-1">
                      {stat.icon}
                      <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                    </div>
                    <div className="text-xs text-gray-500">{stat.label}</div>
                  </motion.div>
                ))}
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/signup">
                  <motion.button
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    className="group relative bg-gradient-to-r from-purple-400 to-blue-400 text-white px-8 py-4 rounded-xl font-semibold text-base flex items-center gap-3 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden"
                  >
                    <span className="relative z-10">Start Free Trial</span>
                    <FiArrowUpRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-purple-500 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      initial={false}
                    />
                  </motion.button>
                </Link>
                <Link href="/demo">
                  <motion.button
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    className="group relative bg-gradient-to-r from-purple-400 to-blue-400 text-white px-8 py-4 rounded-xl font-semibold text-base flex items-center gap-3 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden"
                  >
                    <span className="relative z-10">Book a Demo</span>
                    <FiArrowUpRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-purple-500 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      initial={false}
                    />
                  </motion.button>
                </Link>
              </div>
            </motion.div>

            {/* Right - Dashboard Preview */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, rotate: -2 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative"
            >
              <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-purple-500/20 border border-gray-200">
                {/* Mock Dashboard */}
                <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-6">
                  {/* Dashboard Header */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg" />
                      <div className="text-white font-semibold">Dashboard</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gray-700 rounded-full" />
                      <div className="w-8 h-8 bg-gray-700 rounded-full" />
                      <div className="w-8 h-8 bg-gray-700 rounded-full" />
                    </div>
                  </div>

                  {/* Stats Cards */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    {[1, 2, 3, 4].map((i) => (
                      <motion.div
                        key={i}
                        className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border border-gray-700/50"
                        animate={{ y: [0, -5, 0] }}
                        transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm text-gray-400">Metric {i}</div>
                            <div className="text-lg font-bold text-white">89%</div>
                          </div>
                          <FiTrendingUp className="w-5 h-5 text-green-400" />
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Graph Placeholder */}
                  <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border border-gray-700/50">
                    <div className="h-32 flex items-end gap-1">
                      {[30, 50, 70, 90, 60, 80, 40].map((height, i) => (
                        <motion.div
                          key={i}
                          className="flex-1 bg-gradient-to-t from-purple-500 to-blue-400 rounded-t"
                          initial={{ height: 0 }}
                          animate={{ height: `${height}%` }}
                          transition={{ delay: 0.5 + i * 0.1 }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Floating Elements */}
                <motion.div
                  className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-2xl shadow-lg p-4"
                  animate={{ rotate: [0, 10, 0, -10, 0] }}
                  transition={{ duration: 4, repeat: Infinity }}
                >
                  <div className="text-white text-center">
                    <div className="text-xl font-bold">A+</div>
                    <div className="text-xs">Rating</div>
                  </div>
                </motion.div>

                <motion.div
                  className="absolute -bottom-4 -left-4 w-20 h-20 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full shadow-lg flex items-center justify-center"
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <FiCheck className="w-8 h-8 text-white" />
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-full px-4 py-2 mb-4">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-gray-700">Why Choose Us</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Powerful <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">Features</span> That Drive Excellence
            </h2>
            <p className="text-base text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Our platform combines cutting-edge technology with intuitive design to deliver unparalleled educational management solutions.
            </p>
          </motion.div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -10, transition: { duration: 0.2 } }}
                onHoverStart={() => setHoveredFeature(index)}
                onHoverEnd={() => setHoveredFeature(null)}
                className={`relative group bg-gradient-to-br from-white to-gray-50 rounded-2xl p-6 border border-gray-200 hover:border-transparent transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/10 cursor-pointer ${
                  hoveredFeature === index ? 'scale-[1.02]' : ''
                }`}
              >
                {/* Background Gradient */}
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-5 rounded-2xl transition-opacity duration-300`} />

                {/* Icon */}
                <motion.div
                  className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-6 shadow-lg`}
                  animate={hoveredFeature === index ? { rotate: [0, 10, -10, 0] } : {}}
                  transition={{ duration: 0.5 }}
                >
                  <div className="text-white">{feature.icon}</div>
                </motion.div>

                <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{feature.description}</p>

                {/* Learn More Link */}
                <div className="mt-6">
                  <Link href="/features">
                    <div className="inline-flex items-center gap-2 text-sm font-medium text-purple-600 group-hover:text-purple-700 transition-colors">
                      Learn more
                      <FiArrowUpRight className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                    </div>
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive Demo Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white to-gray-50/50 relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left Content */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">Interactive</span> Learning Experience
              </h2>
              <p className="text-base text-gray-600 mb-8 leading-relaxed">
                Engage students with immersive educational tools that make learning enjoyable and effective. 
                Our platform combines gamification, real-time feedback, and personalized learning paths.
              </p>

              {/* Interactive Stats */}
              <div className="space-y-6">
                {[
                  { label: 'Engagement Rate', value: '94%', color: 'bg-green-500' },
                  { label: 'Completion Rate', value: '87%', color: 'bg-blue-500' },
                  { label: 'Retention Rate', value: '91%', color: 'bg-purple-500' },
                ].map((stat, index) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200 hover:border-purple-200 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 ${stat.color} rounded-full`} />
                      <span className="font-medium text-gray-900">{stat.label}</span>
                    </div>
                    <span className="text-2xl font-bold text-gray-900">{stat.value}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Right - Interactive Cards */}
            <div className="relative">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { title: 'Gamified Quizzes', icon: <Gamepad2 className="w-8 h-8" />, delay: 0 },
                  { title: 'Creative Projects', icon: <Lightbulb className="w-8 h-8" />, delay: 0.1 },
                  { title: 'Learning Games', icon: <Brain className="w-8 h-8" />, delay: 0.2 },
                  { title: 'Team Activities', icon: <Users className="w-8 h-8" />, delay: 0.3 },
                ].map((item, index) => (
                  <motion.div
                    key={item.title}
                    initial={{ opacity: 0, y: 30, rotate: index % 2 ? 2 : -2 }}
                    whileInView={{ opacity: 1, y: 0, rotate: index % 2 ? 2 : -2 }}
                    viewport={{ once: true }}
                    transition={{ delay: item.delay }}
                    whileHover={{ y: -10, rotate: 0, scale: 1.05 }}
                    className={`bg-white rounded-2xl p-6 border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 ${
                      index === 1 ? 'md:translate-y-8' : ''
                    }`}
                  >
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center mb-4">
                      <div className="text-purple-600">{item.icon}</div>
                    </div>
                    <h3 className="font-bold text-gray-900 mb-2">{item.title}</h3>
                    <p className="text-xs text-gray-600">Interactive learning modules</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-gray-900 to-gray-800 relative overflow-hidden">
        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Trusted by <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">Educational Leaders</span>
            </h2>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto">
              See what educators and administrators are saying about their experience.
            </p>
          </motion.div>

          {/* Testimonial Cards */}
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: "Dr. Sarah Chen",
                role: "Principal, Stanford Prep",
                content: "Transformative platform that reduced administrative workload by 70%.",
                rating: 5,
              },
              {
                name: "Marcus Rodriguez",
                role: "IT Director, Boston Academy",
                content: "The analytics dashboard alone is worth the investment. Incredible insights.",
                rating: 5,
              },
              {
                name: "Priya Sharma",
                role: "Academic Dean, Innovation School",
                content: "Student engagement increased dramatically after implementation.",
                rating: 5,
              },
            ].map((testimonial, index) => (
              <motion.div
                key={testimonial.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2 }}
                className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-700/50 hover:border-purple-500/30 transition-all duration-300"
              >
                {/* Stars */}
                <div className="flex gap-1 mb-6">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <FiStar key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>

                <p className="text-gray-300 mb-8 leading-relaxed italic">&quot;{testimonial.content}&quot;</p>

                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-blue-500" />
                  <div>
                    <div className="font-bold text-white">{testimonial.name}</div>
                    <div className="text-sm text-gray-400">{testimonial.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative"
          >
            {/* Background Glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-blue-600/20 blur-3xl rounded-full -z-10" />

            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Ready to Transform Your Institution?
            </h2>
            <p className="text-base text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
              Join thousands of schools revolutionizing education management with our platform.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/signup">
                <motion.button
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className="group relative bg-gradient-to-r from-purple-400 to-blue-400 text-white px-10 py-5 rounded-xl font-semibold text-base flex items-center gap-3 shadow-xl hover:shadow-2xl hover:shadow-purple-400/30 transition-all duration-300 overflow-hidden"
                >
                  <span className="relative z-10">Start Your Free Trial</span>
                  <FiArrowUpRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-purple-500 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    initial={false}
                  />
                </motion.button>
              </Link>
              <Link href="/contact">
                <motion.button
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className="group relative bg-gradient-to-r from-purple-400 to-blue-400 text-white px-10 py-5 rounded-xl font-semibold text-base flex items-center gap-3 shadow-xl hover:shadow-2xl hover:shadow-purple-400/30 transition-all duration-300 overflow-hidden"
                >
                  <span className="relative z-10">Schedule a Demo</span>
                  <FiArrowUpRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-purple-500 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    initial={false}
                  />
                </motion.button>
              </Link>
            </div>

            <p className="text-sm text-gray-500 mt-6">
              No credit card required • 14-day free trial • Cancel anytime
            </p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-200 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="text-2xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                EduSmart
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Empowering educational institutions with intelligent management solutions since 2020.
              </p>
            </div>
            {['Product', 'Company', 'Resources', 'Legal'].map((category) => (
              <div key={category}>
                <h4 className="font-semibold text-gray-900 mb-4">{category}</h4>
                <ul className="space-y-3">
                  {[1, 2, 3].map((item) => (
                    <li key={item}>
                      <Link
                        href="#"
                        className="text-sm text-gray-600 hover:text-purple-600 transition-colors"
                      >
                        Link {item}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-200 pt-8 text-center">
            <p className="text-sm text-gray-500">
              © 2024 EduSmart. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}