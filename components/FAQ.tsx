'use client';

import { useState } from 'react';
import { FiPlus, FiMinus, FiMessageCircle, FiMail, FiPhone } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Sparkles, ArrowRight, HelpCircle, Star } from 'lucide-react';

const FAQS = [
  {
    q: 'Why do schools need a management system?',
    a: 'To automate academics, fees, attendance, communication, and reports in one secure platform.',
    category: 'General',
    icon: '🏫'
  },
  {
    q: 'What problems does it solve for parents?',
    a: 'Real-time updates, transparent fees, attendance tracking, and instant communication with teachers.',
    category: 'Parents',
    icon: '👨‍👩‍👧'
  },
  {
    q: 'How does a school ERP actually work?',
    a: 'Role-based dashboards sync data instantly across admins, teachers, parents, and students in real-time.',
    category: 'Technical',
    icon: '⚙️'
  },
  {
    q: 'Is it scalable for growing schools?',
    a: 'Yes. EduCore scales effortlessly from single schools to multi-campus institutions with thousands of users.',
    category: 'Scalability',
    icon: '📈'
  },
  {
    q: 'What if our current system is outdated?',
    a: 'We handle complete migration, setup, and onboarding—without disrupting daily school operations.',
    category: 'Migration',
    icon: '🔄'
  },
  {
    q: 'Is our data secure?',
    a: 'Enterprise-grade security, role-based access control, and encrypted data ensure complete safety and privacy.',
    category: 'Security',
    icon: '🔒'
  },
  {
    q: 'How long does implementation take?',
    a: 'Most schools are up and running within 2-4 weeks, with full training and support throughout the process.',
    category: 'Implementation',
    icon: '⏱️'
  },
  {
    q: 'Can we customize the platform?',
    a: 'Absolutely! We offer extensive customization options to match your school\'s unique workflows and branding.',
    category: 'Customization',
    icon: '🎨'
  },
];


export default function FAQSection() {
  const [active, setActive] = useState<number | null>(0);
  const [selectedCategory] = useState('All');
  const router = useRouter();

  const filteredFAQs = selectedCategory === 'All' 
    ? FAQS 
    : FAQS.filter(faq => faq.category === selectedCategory);

  const handleDemoRedirect = () => {
    router.push('/demo');
  };

  return (
    <section className="w-full py-24 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-50/30 via-purple-50/20 to-pink-50/30" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-pink-300/10 to-purple-300/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-rose-300/10 to-fuchsia-300/10 rounded-full blur-3xl" />
      
      {/* Floating Elements */}
      <div className="absolute top-20 left-10 animate-float">
        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-pink-400 to-purple-400 opacity-20" />
      </div>
      <div className="absolute bottom-20 right-10 animate-float" style={{ animationDelay: '2s' }}>
        <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-400 to-fuchsia-400 opacity-20" />
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 text-white text-sm font-semibold mb-6">
            <Sparkles size={16} />
            Get Answers
          </div>
          <h2 className="text-5xl font-bold mb-6">
            <span className="bg-gradient-to-r from-pink-600 via-purple-600 to-fuchsia-600 bg-clip-text text-transparent">
              Frequently Asked Questions
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Everything you need to know about EduCore. Can&quot;t find an answer? Contact our team directly.
          </p>
        </motion.div>

        {/* Category Filters */}
       

        {/* FAQ Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-16">
          <AnimatePresence mode="wait">
            {filteredFAQs.map((faq, i) => {
              const open = active === i;
              
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3, delay: i * 0.1 }}
                  className={`relative group cursor-pointer ${
                    open ? 'z-10' : ''
                  }`}
                  onClick={() => setActive(open ? null : i)}
                >
                  {/* Card Background */}
                  <div className={`absolute inset-0 rounded-2xl transition-all duration-300 ${
                    open 
                      ? 'bg-gradient-to-br from-pink-50 to-purple-50 border-2 border-pink-200 shadow-2xl shadow-pink-500/10'
                      : 'bg-white/90 hover:bg-white border border-gray-200/50 hover:border-pink-200 hover:shadow-lg hover:shadow-pink-500/10'
                  }`} />
                  
                  {/* Card Content */}
                  <div className="relative p-6">
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
                        open 
                          ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white'
                          : 'bg-gradient-to-r from-pink-100 to-purple-100 text-gray-700'
                      }`}>
                        {faq.icon}
                      </div>
                      
                      <div className="flex-1">
                        {/* Category Badge */}
                        <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-pink-100 to-purple-100 text-pink-700 text-xs font-semibold mb-3">
                          <Star size={10} />
                          {faq.category}
                        </div>
                        
                        {/* Question */}
                        <div className="flex items-start justify-between gap-4">
                          <h3 className={`text-lg font-semibold pr-10 ${
                            open ? 'text-gray-900' : 'text-gray-800 group-hover:text-gray-900'
                          }`}>
                            {faq.q}
                          </h3>
                          <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                            open 
                              ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white rotate-180'
                              : 'bg-gray-100 text-gray-500 group-hover:bg-gradient-to-r group-hover:from-pink-500 group-hover:to-purple-500 group-hover:text-white'
                          }`}>
                            {open ? <FiMinus size={16} /> : <FiPlus size={16} />}
                          </div>
                        </div>
                        
                        {/* Answer */}
                        <AnimatePresence>
                          {open && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3 }}
                              className="overflow-hidden"
                            >
                              <motion.p 
                                initial={{ y: -10 }}
                                animate={{ y: 0 }}
                                className="mt-4 text-gray-600 leading-relaxed pl-2 border-l-2 border-pink-300"
                              >
                                {faq.a}
                              </motion.p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Contact & CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative rounded-3xl overflow-hidden"
        >
          {/* Background Gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-pink-500 via-purple-500 to-fuchsia-500 opacity-90" />
          
          {/* Pattern Overlay */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.3)_1px,transparent_0)] bg-[length:40px_40px]" />
          </div>
          
          <div className="relative p-12 lg:p-16">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              {/* Left Content */}
              <div>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm text-white text-sm font-semibold mb-6">
                  <HelpCircle size={16} />
                  Need More Help?
                </div>
                <h3 className="text-3xl font-bold text-white mb-4">
                  Still have questions?
                </h3>
                <p className="text-white/90 mb-8 text-lg">
                  Our team is here to help you with any questions about implementation, pricing, or features.
                </p>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-white/90">
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                      <FiMessageCircle size={20} />
                    </div>
                    <span>Live chat support available 24/7</span>
                  </div>
                  <div className="flex items-center gap-3 text-white/90">
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                      <FiMail size={20} />
                    </div>
                    <span>Email: support@educore.com</span>
                  </div>
                  <div className="flex items-center gap-3 text-white/90">
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                      <FiPhone size={20} />
                    </div>
                    <span>Call: +1 (555) 123-4567</span>
                  </div>
                </div>
              </div>
              
              {/* Right CTA */}
              <div className="lg:pl-12">
                <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8">
                  <h4 className="text-xl font-semibold text-white mb-4">
                    See EduCore in Action
                  </h4>
                  <p className="text-white/80 mb-6">
                    Schedule a personalized demo and see how EduCore can transform your school management.
                  </p>
                  
                  <motion.button
                    onClick={handleDemoRedirect}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-full py-4 rounded-xl bg-white text-pink-600 font-semibold flex items-center justify-center gap-2 hover:shadow-xl transition-all group"
                  >
                    Book a Demo
                    <ArrowRight className="group-hover:translate-x-1 transition-transform" size={20} />
                  </motion.button>
                  
                  <div className="mt-6 flex items-center justify-center gap-2 text-white/70 text-sm">
                    <span>⭐</span>
                    <span>30-minute personalized walkthrough</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
      
      </div>

      {/* Custom Animation */}
      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
      `}</style>
    </section>
  );
}