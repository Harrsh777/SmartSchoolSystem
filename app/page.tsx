'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { MdSchool, MdArrowForward } from 'react-icons/md';
import FeaturesPage from '@/components/scroll';
import FAQSection from '@/components/FAQ';

export default function EduCoreLanding() {
  const [scrolled, setScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const heroRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 40);
      const doc = document.documentElement;
      const totalScrollable = doc.scrollHeight - window.innerHeight;
      const progress = totalScrollable > 0 ? Math.min(1, Math.max(0, y / totalScrollable)) : 0;
      setScrollProgress(progress);
    };
    window.addEventListener('scroll', handleScroll);
    handleScroll();

    const handleAnchorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a[href^="#"]');
      if (link) {
        const href = link.getAttribute('href');
        if (href && href !== '#') {
          e.preventDefault();
          const element = document.querySelector(href);
          if (element) {
            const offsetPosition = element.getBoundingClientRect().top + window.pageYOffset - 80;
            window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
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

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap');

        :root {
          --ink: #0a0e1a;
          --ink-soft: #1e2535;
          --ink-muted: #4a5568;
          --sky: #0ea5e9;
          --sky-bright: #38bdf8;
          --sky-pale: #e0f2fe;
          --teal: #0d9488;
          --amber: #f59e0b;
          --surface: #f8fafc;
          --surface-card: #ffffff;
          --border: rgba(14,165,233,0.12);
          --radius-lg: 1.5rem;
          --radius-xl: 2rem;
          --radius-pill: 9999px;
          --font-main: 'Space Grotesk', sans-serif;
          --shadow-card: 0 4px 24px rgba(14,165,233,0.08), 0 1px 4px rgba(0,0,0,0.06);
          --shadow-glow: 0 0 60px rgba(14,165,233,0.18);
        }

        *, *::before, *::after { box-sizing: border-box; }
        html { scroll-behavior: smooth; }

        body {
          font-family: var(--font-main) !important;
          background: var(--surface);
          color: var(--ink);
          overflow-x: hidden;
          -webkit-font-smoothing: antialiased;
        }

        h1, h2, h3, h4, h5, h6 {
          font-family: var(--font-main) !important;
        }

        /* ── SCROLL PROGRESS ── */
        .ec-scroll-bar {
          position: fixed; top: 0; left: 0; right: 0; height: 3px;
          background: linear-gradient(90deg, var(--sky), var(--teal));
          transform-origin: 0%;
          z-index: 200;
        }

        /* ── NAV ── */
        .ec-nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 100;
          padding: 1rem 2.5rem;
          display: flex; align-items: center; justify-content: space-between;
          background: rgba(248,250,252,0.72);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid var(--border);
          transition: box-shadow .3s;
        }
        .ec-nav.scrolled { box-shadow: 0 4px 30px rgba(0,0,0,0.08); }

        .ec-logo {
          font-family: var(--font-main) !important;
          font-size: 1.5rem; font-weight: 700; letter-spacing: -0.03em;
          background: linear-gradient(135deg, var(--sky), var(--teal));
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          display: flex; align-items: center; gap: .5rem; text-decoration: none;
        }
        .ec-logo-icon {
          width: 36px; height: 36px; border-radius: .65rem;
          background: linear-gradient(135deg, var(--sky), var(--teal));
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 14px rgba(14,165,233,0.35);
          flex-shrink: 0;
        }

        .ec-nav-links { display: flex; align-items: center; gap: 2.5rem; }
        .ec-nav-links a {
          font-size: .875rem; font-weight: 500; color: var(--ink-muted);
          text-decoration: none; transition: color .2s; letter-spacing: -0.01em;
          font-family: var(--font-main) !important;
        }
        .ec-nav-links a:hover { color: var(--sky); }

        .ec-nav-cta { display: flex; align-items: center; gap: .75rem; }

        .ec-btn-ghost {
          padding: .5rem 1.25rem; border-radius: var(--radius-pill);
          font-size: .875rem; font-weight: 600; color: var(--ink);
          background: transparent; border: 1.5px solid var(--border);
          cursor: pointer; transition: all .2s; font-family: var(--font-main) !important;
          text-decoration: none; display: inline-flex; align-items: center;
        }
        .ec-btn-ghost:hover { border-color: var(--sky); color: var(--sky); }

        .ec-btn-primary {
          padding: .6rem 1.5rem; border-radius: var(--radius-pill);
          font-size: .875rem; font-weight: 700; color: #fff;
          background: linear-gradient(135deg, var(--sky) 0%, var(--teal) 100%);
          border: none; cursor: pointer; transition: all .25s;
          font-family: var(--font-main) !important; letter-spacing: -0.01em;
          box-shadow: 0 4px 20px rgba(14,165,233,0.35);
          display: inline-flex; align-items: center; gap: .4rem; text-decoration: none;
        }
        .ec-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(14,165,233,0.4); color: #fff; }

        /* ── HERO ── */
        .ec-hero {
          min-height: 100vh;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          padding: 7rem 2.5rem 5rem; position: relative; overflow: hidden; text-align: center;
        }
        .ec-hero-bg {
          position: absolute; inset: 0; z-index: 0;
          background:
            radial-gradient(ellipse 80% 60% at 50% -10%, rgba(14,165,233,0.13) 0%, transparent 70%),
            radial-gradient(ellipse 50% 40% at 80% 50%, rgba(13,148,136,0.08) 0%, transparent 60%),
            radial-gradient(ellipse 40% 30% at 10% 70%, rgba(245,158,11,0.06) 0%, transparent 60%);
        }
        .ec-hero-bg::before {
          content: '';
          position: absolute; inset: 0;
          background-image:
            linear-gradient(rgba(14,165,233,0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(14,165,233,0.06) 1px, transparent 1px);
          background-size: 60px 60px;
          mask-image: radial-gradient(ellipse at center, black 0%, transparent 75%);
        }

        .ec-hero-badge {
          display: inline-flex; align-items: center; gap: .5rem;
          padding: .4rem 1rem; border-radius: var(--radius-pill);
          background: rgba(14,165,233,0.08); border: 1px solid rgba(14,165,233,0.2);
          font-size: .78rem; font-weight: 600; color: var(--sky);
          text-transform: uppercase; letter-spacing: .08em;
          margin-bottom: 2rem; position: relative; z-index: 1;
          animation: ecFadeUp .6s ease both;
        }
        .ec-hero-badge .dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: var(--sky); box-shadow: 0 0 8px var(--sky);
          animation: ecPulseDot 2s ease infinite;
        }

        @keyframes ecPulseDot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: .6; transform: scale(1.4); }
        }

        .ec-hero h1 {
          font-family: var(--font-main) !important;
          font-size: clamp(3rem, 7vw, 6rem);
          font-weight: 700; line-height: 1.05; letter-spacing: -0.04em;
          color: var(--ink); margin-bottom: 1.5rem;
          position: relative; z-index: 1;
          animation: ecFadeUp .7s ease .1s both;
        }
        .ec-gradient-text {
          background: linear-gradient(135deg, var(--sky) 0%, var(--teal) 50%, var(--sky-bright) 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-size: 200% 200%;
          animation: ecShimmer 4s linear infinite;
        }
        @keyframes ecShimmer {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        .ec-hero p {
          max-width: 580px; margin: 0 auto 2.5rem;
          font-size: 1.15rem; line-height: 1.7; color: var(--ink-muted);
          font-weight: 400; position: relative; z-index: 1;
          animation: ecFadeUp .7s ease .2s both;
        }

        .ec-hero-actions {
          display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;
          position: relative; z-index: 1;
          animation: ecFadeUp .7s ease .3s both;
          margin-bottom: 5rem;
        }

        .ec-btn-hero {
          padding: .9rem 2.2rem; border-radius: var(--radius-pill);
          font-size: 1rem; font-weight: 700; font-family: var(--font-main) !important;
          letter-spacing: -0.02em; cursor: pointer; transition: all .25s;
          display: inline-flex; align-items: center; gap: .5rem; text-decoration: none;
        }
        .ec-btn-hero-primary {
          background: linear-gradient(135deg, var(--sky), var(--teal));
          color: #fff; border: none; box-shadow: 0 6px 30px rgba(14,165,233,0.38);
        }
        .ec-btn-hero-primary:hover { transform: translateY(-3px); box-shadow: 0 12px 40px rgba(14,165,233,0.45); color: #fff; }
        .ec-btn-hero-secondary {
          background: var(--surface-card); color: var(--ink);
          border: 1.5px solid rgba(0,0,0,0.08); box-shadow: var(--shadow-card);
        }
        .ec-btn-hero-secondary:hover { transform: translateY(-2px); border-color: var(--sky); color: var(--sky); }

        /* Browser frame */
        .ec-frame {
          position: relative; z-index: 1; width: 100%; max-width: 1100px;
          border-radius: var(--radius-xl); overflow: hidden;
          box-shadow: 0 32px 80px rgba(0,0,0,0.18), 0 0 0 1px rgba(14,165,233,0.15);
          animation: ecFadeUp .8s ease .4s both;
        }
        .ec-frame-bar {
          display: flex; align-items: center; gap: .5rem; padding: .75rem 1.25rem;
          background: rgba(10,14,26,0.92); border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .ec-bar-dot { width: 10px; height: 10px; border-radius: 50%; }
        .ec-bar-url { flex: 1; display: flex; justify-content: center; }
        .ec-bar-url span {
          padding: .2rem .8rem; background: rgba(255,255,255,0.06);
          border-radius: var(--radius-pill); font-size: .73rem; color: rgba(255,255,255,0.45);
          font-family: monospace;
        }

        /* ── STATS STRIP ── */
        .ec-stats {
          display: flex; justify-content: center; flex-wrap: wrap; gap: 0;
          border-top: 1px solid var(--border); border-bottom: 1px solid var(--border);
          background: var(--surface-card);
        }
        .ec-stat {
          flex: 1; min-width: 150px; max-width: 220px;
          text-align: center; padding: 1.75rem 2rem; position: relative;
        }
        .ec-stat:not(:last-child)::after {
          content: ''; position: absolute; right: 0; top: 25%; height: 50%;
          width: 1px; background: var(--border);
        }
        .ec-stat-num {
          font-family: var(--font-main) !important;
          font-size: 2.5rem; font-weight: 700; line-height: 1; letter-spacing: -0.04em;
          background: linear-gradient(135deg, var(--sky), var(--teal));
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          margin-bottom: .3rem;
        }
        .ec-stat-label { font-size: .8rem; color: var(--ink-muted); font-weight: 500; letter-spacing: .02em; }

        /* ── SECTION SHARED ── */
        .ec-section { padding: 6rem 2.5rem; }
        .ec-container { max-width: 1200px; margin: 0 auto; }
        .ec-section-tag {
          display: inline-flex; align-items: center; gap: .4rem;
          font-size: .75rem; font-weight: 700; text-transform: uppercase;
          letter-spacing: .1em; color: var(--sky); margin-bottom: 1rem;
          font-family: var(--font-main) !important;
        }
        .ec-section-tag::before { content: ''; width: 20px; height: 2px; background: var(--sky); border-radius: 1px; }
        .ec-section-title {
          font-family: var(--font-main) !important;
          font-size: clamp(2rem, 4vw, 3.2rem);
          font-weight: 700; line-height: 1.1; letter-spacing: -0.04em;
          color: var(--ink); margin-bottom: 1rem;
        }
        .ec-section-title .accent { color: var(--sky); }
        .ec-section-desc { font-size: 1.05rem; color: var(--ink-muted); line-height: 1.7; max-width: 520px; }

        /* ── PORTALS ── */
        .ec-portals { background: var(--ink); position: relative; overflow: hidden; }
        .ec-portals::before {
          content: '';
          position: absolute; top: -200px; left: 50%; transform: translateX(-50%);
          width: 900px; height: 500px;
          background: radial-gradient(ellipse, rgba(14,165,233,0.15) 0%, transparent 70%);
          pointer-events: none;
        }
        .ec-portals .ec-section-tag { color: var(--sky-bright); }
        .ec-portals .ec-section-title { color: #fff; }
        .ec-portals .ec-section-desc { color: rgba(255,255,255,0.5); }

        .ec-portals-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; margin-top: 4rem; }

        .ec-portal-card {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: var(--radius-xl); overflow: hidden;
          transition: all .3s ease;
        }
        .ec-portal-card:hover {
          background: rgba(255,255,255,0.07);
          border-color: rgba(14,165,233,0.3);
          transform: translateY(-6px);
          box-shadow: 0 20px 60px rgba(0,0,0,0.4), 0 0 30px rgba(14,165,233,0.1);
        }
        .ec-portal-img-wrap { overflow: hidden; }
        .ec-portal-img {
          width: 100%; aspect-ratio: 16/10; object-fit: cover; display: block;
          transition: transform .5s ease;
        }
        .ec-portal-card:hover .ec-portal-img { transform: scale(1.04); }
        .ec-portal-body { padding: 1.75rem; }
        .ec-portal-icon {
          width: 44px; height: 44px; border-radius: .75rem;
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 1rem;
        }
        .ec-portal-card h3 {
          font-family: var(--font-main) !important;
          font-size: 1.3rem; font-weight: 700; color: #fff;
          margin-bottom: .5rem; letter-spacing: -0.03em;
        }
        .ec-portal-card p { font-size: .88rem; color: rgba(255,255,255,0.5); line-height: 1.6; }
        .ec-portal-pill {
          display: inline-block; margin-top: 1rem;
          padding: .3rem .85rem; border-radius: var(--radius-pill);
          font-size: .72rem; font-weight: 700; letter-spacing: .04em; text-transform: uppercase;
        }

        /* ── MODULES ── */
        .ec-modules { background: var(--surface); }
        .ec-modules-header { display: flex; flex-wrap: wrap; gap: 2rem; justify-content: space-between; align-items: flex-end; margin-bottom: 3.5rem; }
        .ec-modules-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1rem; }

        .ec-module-card {
          background: var(--surface-card); border: 1px solid var(--border);
          border-radius: var(--radius-lg); padding: 1.5rem;
          transition: all .25s ease; position: relative; overflow: hidden;
        }
        .ec-module-card::before {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(135deg, rgba(14,165,233,0.05), transparent);
          opacity: 0; transition: opacity .25s;
        }
        .ec-module-card:hover { border-color: rgba(14,165,233,0.25); transform: translateY(-4px); box-shadow: 0 12px 40px rgba(14,165,233,0.1), var(--shadow-card); }
        .ec-module-card:hover::before { opacity: 1; }

        .ec-module-icon {
          width: 46px; height: 46px; border-radius: .85rem;
          background: var(--sky-pale); display: flex; align-items: center; justify-content: center;
          margin-bottom: 1rem; transition: background .25s;
          font-size: 1.4rem;
        }
        .ec-module-card:hover .ec-module-icon { background: rgba(14,165,233,0.15); }
        .ec-module-card h4 { font-size: .95rem; font-weight: 700; color: var(--ink); margin-bottom: .35rem; letter-spacing: -0.02em; font-family: var(--font-main) !important; }
        .ec-module-card p { font-size: .8rem; color: var(--ink-muted); line-height: 1.55; }

        /* ── MOBILE SECTION ── */
        .ec-mobile { background: linear-gradient(160deg, #0c1628 0%, #0a1220 100%); position: relative; overflow: hidden; }
        .ec-mobile::after {
          content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(14,165,233,0.4), transparent);
        }
        .ec-mobile-inner { display: flex; flex-wrap: wrap; gap: 5rem; align-items: center; max-width: 1200px; margin: 0 auto; }
        .ec-mobile-copy { flex: 1; min-width: 300px; }
        .ec-mobile-copy .ec-section-title { color: #fff; }
        .ec-mobile-copy .ec-section-desc { color: rgba(255,255,255,0.5); margin-bottom: 2.5rem; }

        .ec-app-features { display: flex; flex-direction: column; gap: 1.25rem; }
        .ec-app-feature {
          display: flex; align-items: flex-start; gap: 1rem; padding: 1rem 1.25rem;
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07);
          border-radius: var(--radius-lg); transition: all .2s;
        }
        .ec-app-feature:hover { background: rgba(14,165,233,0.08); border-color: rgba(14,165,233,0.2); }
        .ec-app-feature-icon { width: 40px; height: 40px; border-radius: .7rem; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
        .ec-app-feature h4 { font-size: .9rem; font-weight: 700; color: #fff; margin-bottom: .2rem; letter-spacing: -0.02em; font-family: var(--font-main) !important; }
        .ec-app-feature p { font-size: .8rem; color: rgba(255,255,255,0.45); line-height: 1.5; }

        .ec-phone-wrap { flex: 0 0 auto; display: flex; justify-content: center; align-items: center; position: relative; }
        .ec-phone-glow { position: absolute; width: 300px; height: 300px; background: radial-gradient(circle, rgba(14,165,233,0.2) 0%, transparent 70%); border-radius: 50%; }
        .ec-phone {
          position: relative; z-index: 1; width: 320px; height: 600px;
          background: #0e1117; border-radius: 3rem; border: 8px solid #1e2535;
          box-shadow: 0 30px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05), inset 0 0 0 1px rgba(255,255,255,0.03);
          overflow: hidden;
        }
        .ec-phone-notch { height: 24px; background: #1e2535; display: flex; align-items: center; justify-content: center; }
        .ec-phone-notch-bar { width: 70px; height: 14px; background: #0e1117; border-radius: 999px; }

        /* ── STEPS / JOURNEY ── */
        .ec-journey { background: var(--surface-card); }
        .ec-steps { display: flex; flex-wrap: wrap; gap: 1.5rem; margin-top: 4rem; position: relative; }
        .ec-steps::before {
          content: ''; position: absolute; top: 56px; left: 10%; right: 10%; height: 1px;
          background: linear-gradient(90deg, transparent, var(--border) 20%, var(--border) 80%, transparent);
        }
        .ec-step {
          flex: 1; min-width: 220px; text-align: center; position: relative;
          padding: 2.5rem 1.5rem 2rem;
          background: var(--surface); border: 1px solid var(--border);
          border-radius: var(--radius-xl); transition: all .25s;
        }
        .ec-step:hover { transform: translateY(-6px); box-shadow: var(--shadow-card), 0 0 0 1px rgba(14,165,233,0.15); }
        .ec-step-num {
          position: absolute; top: -14px; left: 50%; transform: translateX(-50%);
          width: 28px; height: 28px; border-radius: 50%;
          background: var(--sky); color: #fff; font-size: .72rem; font-weight: 800;
          display: flex; align-items: center; justify-content: center; font-family: var(--font-main) !important;
        }
        .ec-step-icon { width: 80px; height: 80px; border-radius: var(--radius-lg); display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; font-size: 2rem; }
        .ec-step h3 { font-family: var(--font-main) !important; font-size: 1.15rem; font-weight: 700; color: var(--ink); margin-bottom: .6rem; letter-spacing: -0.03em; }
        .ec-step p { font-size: .85rem; color: var(--ink-muted); line-height: 1.6; }

        /* ── CTA SECTION ── */
        .ec-cta {
          background: linear-gradient(135deg, var(--sky) 0%, #0369a1 40%, var(--teal) 100%);
          padding: 6rem 2.5rem; position: relative; overflow: hidden;
        }
        .ec-cta::before {
          content: ''; position: absolute; inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px);
          background-size: 40px 40px;
        }
        .ec-cta-inner { max-width: 1100px; margin: 0 auto; display: flex; flex-wrap: wrap; gap: 4rem; align-items: stretch; position: relative; z-index: 1; }
        .ec-cta-copy { flex: 1; min-width: 280px; }
        .ec-cta-copy h2 { font-family: var(--font-main) !important; font-size: clamp(2rem, 4vw, 3rem); font-weight: 700; color: #fff; line-height: 1.1; letter-spacing: -0.04em; margin-bottom: 1rem; }
        .ec-cta-copy p { color: rgba(255,255,255,0.75); font-size: 1rem; line-height: 1.7; margin-bottom: 2rem; }
        .ec-cta-contacts { display: flex; flex-direction: column; gap: .75rem; }
        .ec-cta-contact { display: flex; align-items: center; gap: .75rem; color: rgba(255,255,255,0.9); font-size: .9rem; font-weight: 500; }

        .ec-cta-form {
          flex: 1; min-width: 300px;
          background: rgba(255,255,255,0.1); backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.2); border-radius: var(--radius-xl); padding: 2.5rem;
        }
        .ec-cta-form h3 { font-family: var(--font-main) !important; font-size: 1.3rem; font-weight: 700; color: #fff; margin-bottom: 1.5rem; letter-spacing: -0.03em; }
        .ec-form-group { margin-bottom: 1rem; }
        .ec-form-group label { display: block; font-size: .78rem; font-weight: 700; color: rgba(255,255,255,0.8); margin-bottom: .4rem; text-transform: uppercase; letter-spacing: .06em; }
        .ec-form-group input, .ec-form-group textarea {
          width: 100%; padding: .75rem 1rem;
          background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.15);
          border-radius: .75rem; color: #fff; font-family: var(--font-main) !important; font-size: .9rem;
          outline: none; transition: all .2s; resize: none;
        }
        .ec-form-group input::placeholder, .ec-form-group textarea::placeholder { color: rgba(255,255,255,0.35); }
        .ec-form-group input:focus, .ec-form-group textarea:focus { border-color: rgba(255,255,255,0.4); background: rgba(255,255,255,0.18); }

        .ec-btn-submit {
          width: 100%; padding: .9rem; background: #fff; color: var(--sky);
          border: none; border-radius: .85rem; font-family: var(--font-main) !important;
          font-size: .95rem; font-weight: 800; cursor: pointer; transition: all .2s;
          letter-spacing: -0.02em; display: flex; align-items: center; justify-content: center; gap: .5rem;
        }
        .ec-btn-submit:hover { background: rgba(255,255,255,0.92); transform: translateY(-2px); box-shadow: 0 8px 30px rgba(0,0,0,0.15); }

        .ec-trust-badges { display: flex; flex-wrap: wrap; gap: .75rem; margin-top: 2.5rem; }
        .ec-badge {
          display: flex; align-items: center; gap: .4rem;
          background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.2);
          border-radius: var(--radius-pill); padding: .35rem .85rem;
          color: rgba(255,255,255,0.9); font-size: .75rem; font-weight: 600;
        }

        /* ── FOOTER ── */
       .ec-footer {
  background: #0f172a;
  color: #94a3b8;
  padding: 50px 20px 25px;
}

.ec-footer-inner {
  max-width: 1100px;
  margin: 0 auto;
}

/* TOP SECTION */
.ec-footer-top {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 60px;
  align-items: start;
}

.ec-footer-brand {
  max-width: 320px;
}

.ec-footer-logo {
  font-size: 22px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 10px;
}

.ec-footer-tagline {
  font-size: 14px;
  line-height: 1.6;
}

/* LINKS */
.ec-footer-links {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 40px;
}

.ec-footer-column span {
  font-weight: 600;
  color: #fff;
  margin-bottom: 10px;
  display: block;
}

.ec-footer-column a {
  display: block;
  font-size: 13px;
  margin-bottom: 6px;
  color: #94a3b8;
  text-decoration: none;
  transition: 0.2s;
}

.ec-footer-column a:hover {
  color: #38bdf8;
}

/* DIVIDER */
.ec-footer-divider {
  height: 1px;
  background: #1e293b;
  margin: 30px 0;
}

/* BOTTOM */
.ec-footer-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  flex-wrap: wrap;
  gap: 10px;
}

.ec-footer-bottom a {
  color: #38bdf8;
  text-decoration: none;
}

.ec-footer-bottom a:hover {
  text-decoration: underline;
}

/* RESPONSIVE */
@media (max-width: 768px) {
  .ec-footer-top {
    grid-template-columns: 1fr;
    gap: 40px;
  }

  .ec-footer-links {
    grid-template-columns: repeat(2, 1fr);
  }

  .ec-footer-bottom {
    flex-direction: column;
    text-align: center;
  }
}

        /* ── SCROLL-TRIGGERED FADE UP ── */
        @keyframes ecFadeUp {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .ec-reveal {
          opacity: 0; transform: translateY(24px);
          transition: opacity .55s ease, transform .55s ease;
        }
        .ec-reveal.visible { opacity: 1; transform: translateY(0); }

        /* ── RESPONSIVE ── */
        @media (max-width: 768px) {
          .ec-nav { padding: 1rem 1.25rem; }
          .ec-nav-links { display: none; }
          .ec-section { padding: 4rem 1.25rem; }
          .ec-hero { padding: 6rem 1.25rem 3.5rem; }
          .ec-steps::before { display: none; }
          .ec-mobile-inner { gap: 3rem; }
          .ec-phone-wrap { display: none; }
        }
      `}</style>

      {/* Scroll Progress Bar */}
      <div className="ec-scroll-bar" style={{ transform: `scaleX(${scrollProgress})` }} />

      {/* ── NAVBAR ── */}
      <nav className={`ec-nav ${scrolled ? 'scrolled' : ''}`}>
        <Link href="/" className="ec-logo">
          <div className="ec-logo-icon">
            <MdSchool style={{ color: '#fff', fontSize: '1.15rem' }} />
          </div>
          EduCore
        </Link>

        <div className="ec-nav-links">
          <a href="#portals">Modules</a>
          <a href="#modules">Dashboards</a>
          <a href="#mobile">Mobile App</a>
          <a href="#journey">Pricing</a>
        </div>

        <div className="ec-nav-cta">
          <Link href="/login" className="ec-btn-ghost">Login</Link>
          <Link href="/demo" className="ec-btn-primary">
            Request Demo
            <MdArrowForward style={{ fontSize: '1rem' }} />
          </Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <header className="ec-hero" ref={heroRef}>
        <div className="ec-hero-bg" />

        <div className="ec-hero-badge">
          <span className="dot" />
          Now live in 500+ institutions
        </div>

        <h1>
          The Operating System<br />
          for <span className="ec-gradient-text">Modern Education</span>
        </h1>

        <p>
          Empower your institution with a unified digital ecosystem — from admissions to analytics, built for the way campuses actually work.
        </p>

        <div className="ec-hero-actions">
          <Link href="/signup" className="ec-btn-hero ec-btn-hero-primary">
            <span style={{ fontSize: '1.1rem' }}>🚀</span>
            Get Started Free
          </Link>
          <Link href="/demo" className="ec-btn-hero ec-btn-hero-secondary">
            <span style={{ fontSize: '1.1rem' }}>▶</span>
            Watch Demo
          </Link>
        </div>

        {/* Browser Frame */}
        <div className="ec-frame ec-container">
          <div className="ec-frame-bar">
            <span className="ec-bar-dot" style={{ background: '#ff5f57' }} />
            <span className="ec-bar-dot" style={{ background: '#febc2e' }} />
            <span className="ec-bar-dot" style={{ background: '#28c840' }} />
            <div className="ec-bar-url"><span>app.educore.systems/dashboard</span></div>
          </div>
          <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9' }}>
            <Image
              src="https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=2400&auto=format&fit=crop"
              alt="Students in a modern campus setting"
              fill
              style={{ objectFit: 'cover' }}
              priority
              unoptimized
            />
          </div>
        </div>
      </header>

      {/* ── STATS STRIP ── */}
      <div className="ec-stats">
        {[
          { num: '500+', label: 'Institutions' },
          { num: '2M+', label: 'Active Students' },
          { num: '25+', label: 'Modules' },
          { num: '99.9%', label: 'Uptime SLA' },
          { num: '4.9★', label: 'Avg. Rating' },
        ].map((s) => (
          <div className="ec-stat ec-reveal" key={s.label}>
            <div className="ec-stat-num">{s.num}</div>
            <div className="ec-stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── PORTALS ── */}
      <section className="ec-section ec-portals" id="portals">
        <div className="ec-container" style={{ position: 'relative', zIndex: 1 }}>
          <div className="ec-section-tag">Access Portals</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: '1.5rem', marginBottom: '1rem' }}>
            <h2 className="ec-section-title" style={{ marginBottom: 0 }}>
              One Platform.<br /><span className="accent">Three Portals.</span>
            </h2>
            <p className="ec-section-desc" style={{ maxWidth: 380 }}>
              Tailored interfaces designed for the specific workflows of every campus stakeholder.
            </p>
          </div>

          <div className="ec-portals-grid">
            {[
              {
                img: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1600&auto=format&fit=crop',
                alt: 'Admin Dashboard',
                iconBg: 'rgba(14,165,233,0.15)',
                icon: '⚙️',
                title: 'Admin Portal',
                desc: 'Centralized control — institutional management, configuration, and predictive analytics in one view.',
                pill: 'Full Control',
                pillStyle: { background: 'rgba(14,165,233,0.12)', color: '#38bdf8' },
              },
              {
                img: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?q=80&w=1600&auto=format&fit=crop',
                alt: 'Staff Portal',
                iconBg: 'rgba(245,158,11,0.15)',
                icon: '🏫',
                title: 'Staff Portal',
                desc: 'Streamlined workflows — attendance, grading, communication, and scheduling without friction.',
                pill: 'Productivity',
                pillStyle: { background: 'rgba(245,158,11,0.12)', color: '#f59e0b' },
              },
              {
                img: 'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?q=80&w=1600&auto=format&fit=crop',
                alt: 'Student Portal',
                iconBg: 'rgba(13,148,136,0.15)',
                icon: '👤',
                title: 'Student Portal',
                desc: 'Interactive learning hub — resources, progress tracking, assignments, and peer collaboration.',
                pill: 'Engagement',
                pillStyle: { background: 'rgba(13,148,136,0.12)', color: '#2dd4bf' },
              },
            ].map((p) => (
              <div className="ec-portal-card ec-reveal" key={p.title}>
                <div className="ec-portal-img-wrap">
                  <img className="ec-portal-img" src={p.img} alt={p.alt} />
                </div>
                <div className="ec-portal-body">
                  <div className="ec-portal-icon" style={{ background: p.iconBg }}>
                    <span style={{ fontSize: '1.3rem' }}>{p.icon}</span>
                  </div>
                  <h3>{p.title}</h3>
                  <p>{p.desc}</p>
                  <span className="ec-portal-pill" style={p.pillStyle}>{p.pill}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MODULES ── */}
      <section className="ec-section ec-modules" id="modules">
        <div className="ec-container">
          <div className="ec-modules-header">
            <div>
              <div className="ec-section-tag">Feature Suite</div>
              <h2 className="ec-section-title">
                25+ Modules.<br /><span className="accent">100+ Features.</span>
              </h2>
              <p className="ec-section-desc">The most comprehensive suite of educational tools, unified in a single platform.</p>
            </div>
            <button className="ec-btn-primary" style={{ alignSelf: 'flex-end', padding: '.75rem 1.75rem' }}>
              Explore All
              <MdArrowForward style={{ fontSize: '1rem' }} />
            </button>
          </div>

          <div className="ec-modules-grid">
            {[
              { icon: '✅', title: 'Attendance', desc: 'Biometric integration, auto-SMS alerts, and detailed reports.' },
              { icon: '💳', title: 'Fee Management', desc: 'Online payments, automated invoicing, and fine calculations.' },
              { icon: '📋', title: 'Examinations', desc: 'Online testing, marksheet generation, and GPA tracking.' },
              { icon: '🚌', title: 'Transport', desc: 'Live route tracking, driver management, and fuel logs.' },
              { icon: '📚', title: 'Library', desc: 'Barcoded catalog, digital archive, and fine tracking.' },
              { icon: '📦', title: 'Inventory', desc: 'Stock alerts, vendor management, and purchase history.' },
              { icon: '📢', title: 'Notice Board', desc: 'Instant push notifications and campus-wide alerts.' },
              { icon: '📊', title: 'Analytics', desc: 'Custom reports, dashboards, and predictive growth charts.' },
            ].map((m) => (
              <div className="ec-module-card ec-reveal" key={m.title}>
                <div className="ec-module-icon">{m.icon}</div>
                <h4>{m.title}</h4>
                <p>{m.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MOBILE APP ── */}
      <section className="ec-section ec-mobile" id="mobile">
  <div className="ec-mobile-inner">

    {/* LEFT */}
    <div className="ec-mobile-copy">
      <div className="ec-section-tag">Mobile First</div>

      <h2 className="ec-section-title">
        The Whole Campus<br />In Your Pocket
      </h2>

      <p className="ec-section-desc">
        Native apps for every role. Stay connected with your institution,
        anywhere, anytime — no compromise.
      </p>

      <div className="ec-app-features">
        {[
          { icon: '🔍', title: 'Director App', desc: "Bird's-eye view of campus operations, financials, and performance metrics." },
          { icon: '🎫', title: 'Staff App', desc: 'Manage classes, mark attendance, assign homework, and chat with parents.' },
          { icon: '👥', title: 'Student & Parent App', desc: 'Fee status, homework alerts, results, and real-time tracking.' },
        ].map((f) => (
          <div className="ec-app-feature" key={f.title}>
            <div className="ec-app-feature-icon">{f.icon}</div>
            <div>
              <h4>{f.title}</h4>
              <p>{f.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* RIGHT */}
    <div className="ec-phone-wrap">
      <div className="ec-phone-glow" />

      <div className="ec-phone">
        <div className="ec-phone-notch" />
        <img
          src="https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?q=80&w=800&auto=format&fit=crop"
          alt="EduCore Mobile App"
        />
      </div>
    </div>

  </div>
</section>

      {/* ── JOURNEY ── */}
      <section className="ec-section ec-journey" id="journey">
        <div className="ec-container">
          <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
            <div className="ec-section-tag" style={{ justifyContent: 'center' }}>How It Works</div>
            <h2 className="ec-section-title" style={{ textAlign: 'center' }}>
              From Interest to<br /><span className="accent">Fully Digital</span> in 3 Steps
            </h2>
            <p className="ec-section-desc" style={{ margin: '0 auto', textAlign: 'center' }}>
              Simple, guided onboarding — we do the heavy lifting so you don&apos;t have to.
            </p>
          </div>

          <div className="ec-steps">
            {[
              {
                num: '1', bg: 'rgba(14,165,233,0.08)', color: '#0ea5e9', icon: '💬',
                title: 'Request',
                desc: "Reach out to our team. We'll understand your institution's specific challenges and goals in a discovery call.",
              },
              {
                num: '2', bg: 'rgba(245,158,11,0.08)', color: '#f59e0b', icon: '📋',
                title: 'Setup',
                desc: 'A dedicated account manager handles all data migration, configuration, and integration — zero effort from your side.',
              },
              {
                num: '3', bg: 'rgba(13,148,136,0.08)', color: '#0d9488', icon: '🚀',
                title: 'Launch',
                desc: 'Personalized training for all staff and a go-live within days. Ongoing support ensures smooth, long-term adoption.',
              },
            ].map((s) => (
              <div className="ec-step ec-reveal" key={s.title}>
                <div className="ec-step-num">{s.num}</div>
                <div className="ec-step-icon" style={{ background: s.bg }}>
                  <span style={{ fontSize: '2rem', color: s.color }}>{s.icon}</span>
                </div>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      

      {/* ── CTA + CONTACT ── */}
      <section className="ec-cta">
        <div className="ec-cta-inner">
          <div className="ec-cta-copy">
            <h2>Ready to Lead<br />the Future?</h2>
            <p>
              Join 500+ institutions that have transformed their campus with EduCore.
              Our education experts will get back to you within 24 hours.
            </p>

            <div className="ec-cta-contacts">
              {[
                { icon: '✉️', text: 'hello@educore.systems' },
                { icon: '📞', text: '+1 (888) EDU-CORE' },
                { icon: '⏱️', text: 'Response within 24 hours' },
              ].map((c) => (
                <div className="ec-cta-contact" key={c.text}>
                  <span>{c.icon}</span>
                  {c.text}
                </div>
              ))}
            </div>

            <div className="ec-trust-badges">
              {['✅ ISO 27001', '🔒 GDPR Ready', '☁️ 99.9% Uptime'].map((b) => (
                <div className="ec-badge" key={b}>{b}</div>
              ))}
            </div>
          </div>

          <div className="ec-cta-form">
            <h3>Send Us a Message</h3>
            <div className="ec-form-group">
              <label>Full Name</label>
              <input type="text" placeholder="Jane Smith" />
            </div>
            <div className="ec-form-group">
              <label>Institutional Email</label>
              <input type="email" placeholder="jane@university.edu" />
            </div>
            <div className="ec-form-group">
              <label>Institution Name</label>
              <input type="text" placeholder="Greenfield University" />
            </div>
            <div className="ec-form-group">
              <label>Message</label>
              <textarea rows={3} placeholder="Tell us about your institution's needs…" />
            </div>
            <button className="ec-btn-submit">
              <span>📨</span>
              Send Inquiry
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="ec-footer">
  <div className="ec-footer-inner">

    {/* Top Section */}
    <div className="ec-footer-top">
      
      <div className="ec-footer-brand">
        <div className="ec-footer-logo">EduCore</div>
        <p className="ec-footer-tagline">
          Simplifying education management with powerful and intuitive tools.
        </p>
      </div>

      <div className="ec-footer-links">

        <div className="ec-footer-column">
          <span>Company</span>
          <a href="#">About</a>
          <a href="#">Contact Us</a>
          <a href="#">Status</a>
        </div>

        <div className="ec-footer-column">
          <span>Legal</span>
          <a href="#">Privacy Policy</a>
          <a href="#">Terms</a>
        </div>

        <div className="ec-footer-column">
          <span>Resources</span>
          <a href="#">Docs</a>
          <a href="#">Help</a>
        </div>

      </div>
    </div>

    {/* Divider */}
    <div className="ec-footer-divider" />

    {/* Bottom Section */}
    <div className="ec-footer-bottom">
      <p>© 2025 EduCore Systems. All rights reserved.</p>

      <p>
        Developed by{" "}
        <a
          href="https://www.linkedin.com/in/harrshh/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Harsh Srivastava
        </a>
      </p>
    </div>

  </div>
</footer>

      {/* ── SCROLL-REVEAL SCRIPT ── */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              var obs = new IntersectionObserver(function(entries) {
                entries.forEach(function(e) {
                  if (e.isIntersecting) {
                    e.target.classList.add('visible');
                    obs.unobserve(e.target);
                  }
                });
              }, { threshold: 0.08 });
              document.querySelectorAll('.ec-reveal').forEach(function(el, i) {
                el.style.transitionDelay = (i * 0.05) + 's';
                obs.observe(el);
              });
            })();
          `,
        }}
      />
    </>
  );
}