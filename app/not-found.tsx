"use client"

import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { ArrowLeft, Home } from "lucide-react"

export default function NotFoundPage() {
  const router = useRouter()

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#0a0a0f] text-white">
      
      {/* Background Gradient */}
      <div className="absolute inset-0">
        <div className="absolute w-[500px] h-[500px] bg-purple-600/30 blur-[120px] top-[-100px] left-[-100px]" />
        <div className="absolute w-[500px] h-[500px] bg-blue-600/20 blur-[120px] bottom-[-100px] right-[-100px]" />
      </div>

      {/* Floating Glow */}
      <motion.div
        animate={{ y: [0, -20, 0] }}
        transition={{ duration: 6, repeat: Infinity }}
        className="absolute w-[300px] h-[300px] bg-pink-500/20 blur-[100px] rounded-full"
      />

      {/* Main Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 backdrop-blur-xl bg-white/5 border border-white/10 shadow-2xl rounded-3xl p-10 max-w-xl w-full text-center"
      >
        
        {/* 404 Heading */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-7xl font-extrabold bg-gradient-to-r from-purple-400 to-blue-400 text-transparent bg-clip-text"
        >
          404
        </motion.h1>

        {/* Subtitle */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-2xl font-semibold mt-4"
        >
          Page Not Found
        </motion.h2>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-gray-400 mt-3 text-sm leading-relaxed"
        >
          The page you&apos;re looking for doesn&apos;t exist or has been moved.  
          Let=&apos;s get you back on track.
        </motion.p>

        {/* Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex gap-4 justify-center mt-8"
        >
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 hover:opacity-90 transition-all shadow-lg"
          >
            <Home size={18} />
            Go Home
          </button>

          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/20 hover:bg-white/10 transition-all"
          >
            <ArrowLeft size={18} />
            Go Back
          </button>
        </motion.div>
      </motion.div>

      {/* Footer Text */}
      <div className="absolute bottom-6 text-xs text-gray-500">
        Lost in space? 🚀
      </div>
    </div>
  )
}