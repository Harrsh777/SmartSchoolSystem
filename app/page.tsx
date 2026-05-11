'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { MdSchool, MdArrowForward } from 'react-icons/md';
import './landing.css';

/** Email pattern matching the server-side validator in /api/contact-inquiries. */
const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

/** Phone validator: 10–15 digits, optional leading "+", spaces/dashes/parens tolerated. */
function isValidPhone(raw: string): boolean {
  const digits = raw.replace(/[\s()\-]/g, '');
  return /^\+?\d{10,15}$/.test(digits);
}

type InquiryField = 'full_name' | 'email' | 'phone' | 'institution_name' | 'message';
type InquiryForm = Record<InquiryField, string>;
type InquiryErrors = Partial<Record<InquiryField, string>>;

export default function EduCoreLanding() {
  const [scrolled, setScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const heroRef = useRef<HTMLElement>(null);

  const [form, setForm] = useState<InquiryForm>({
    full_name: '',
    email: '',
    phone: '',
    institution_name: '',
    message: '',
  });
  const [errors, setErrors] = useState<InquiryErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [submitMessage, setSubmitMessage] = useState<string>('');

  const updateField = (field: InquiryField) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = e.target.value;
      setForm((prev) => ({ ...prev, [field]: value }));
      setErrors((prev) => {
        if (!prev[field]) return prev;
        const next = { ...prev };
        delete next[field];
        return next;
      });
      if (submitStatus !== 'idle') setSubmitStatus('idle');
    };

  const validate = (values: InquiryForm): InquiryErrors => {
    const e: InquiryErrors = {};
    const fullName = values.full_name.trim();
    const email = values.email.trim();
    const phone = values.phone.trim();
    const inst = values.institution_name.trim();
    const msg = values.message.trim();

    if (!fullName) e.full_name = 'Please enter your full name.';
    else if (fullName.length > 120) e.full_name = 'Max 120 characters.';

    if (!email) e.email = 'Email is required.';
    else if (!EMAIL_RE.test(email)) e.email = 'Enter a valid email (e.g. you@school.edu).';

    if (phone && !isValidPhone(phone))
      e.phone = 'Enter 10–15 digits, with optional leading +.';

    if (!inst) e.institution_name = 'Institution name is required.';
    else if (inst.length > 160) e.institution_name = 'Max 160 characters.';

    if (!msg) e.message = 'Tell us a bit about your needs.';
    else if (msg.length < 5) e.message = 'A little more detail, please.';
    else if (msg.length > 2000) e.message = 'Keep it under 2000 characters.';

    return e;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const v = validate(form);
    setErrors(v);
    if (Object.keys(v).length > 0) {
      setSubmitStatus('error');
      setSubmitMessage('Please fix the highlighted fields.');
      return;
    }

    setSubmitting(true);
    setSubmitStatus('idle');
    setSubmitMessage('');
    try {
      const res = await fetch('/api/contact-inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: form.full_name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          institution_name: form.institution_name.trim(),
          message: form.message.trim(),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (json?.fields && typeof json.fields === 'object') {
          setErrors(json.fields as InquiryErrors);
        }
        setSubmitStatus('error');
        setSubmitMessage(
          (json?.error as string) || 'Could not send your message. Please try again.'
        );
      } else {
        setSubmitStatus('success');
        setSubmitMessage("Thanks! We've received your message and will be in touch shortly.");
        setForm({ full_name: '', email: '', phone: '', institution_name: '', message: '' });
        setErrors({});
      }
    } catch (err) {
      console.error('Contact inquiry submit failed:', err);
      setSubmitStatus('error');
      setSubmitMessage('Network error. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

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

  useEffect(() => {
    document.body.classList.add('ec-body');
    return () => {
      document.body.classList.remove('ec-body');
    };
  }, []);

  useEffect(() => {
    const revealElements = Array.from(document.querySelectorAll<HTMLElement>('.ec-reveal'));
    if (revealElements.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08 }
    );

    revealElements.forEach((element, index) => {
      element.style.transitionDelay = `${index * 0.05}s`;
      observer.observe(element);
    });

    return () => {
      revealElements.forEach((element) => observer.unobserve(element));
      observer.disconnect();
    };
  }, []);

  return (
    <div className="ec-page">
      {/* Slow, ambient page-wide aurora background */}
      <div className="ec-page-aurora" aria-hidden="true">
        <div className="ec-aurora-blob a" />
        <div className="ec-aurora-blob b" />
        <div className="ec-aurora-blob c" />
        <div className="ec-aurora-grid" />
      </div>

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
        <div className="ec-hero-orb one" aria-hidden="true" />
        <div className="ec-hero-orb two" aria-hidden="true" />

        <h1>
          <span className="ec-hero-line">The Operating System
Built for</span>
          <span className="ec-hero-line">
             <span className="ec-gradient-text">Intelligent Platform</span>
          </span>
        </h1>

        <p className="ec-hero-subtitle">
          Empower your institution with a unified digital ecosystem, from admissions to analytics, built for the way campuses actually work.
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
            <img
              src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1600&auto=format&fit=crop"
              alt="Students in a modern campus setting"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              loading="eager"
              referrerPolicy="no-referrer"
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
                { icon: '👤', text: 'Ved Prakash' },
                { icon: '📞', text: '+91 93053 29875' },
                { icon: '✉️', text: 'vedprakash86@hotmail.com' },
                { icon: '🏢', text: 'Global Tech Solutions' },
                { icon: '📧', text: 'globaltechsolutionsprayagraj@gmail.com' },
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

          <form className="ec-cta-form" onSubmit={handleSubmit} noValidate>
            <h3>Send Us a Message</h3>

            <div className={`ec-form-group ${errors.full_name ? 'has-error' : ''}`}>
              <label htmlFor="ci-full-name">
                Full Name <span className="ec-req" aria-hidden="true">*</span>
              </label>
              <input
                id="ci-full-name"
                type="text"
                name="full_name"
                autoComplete="name"
                placeholder="Jane Smith"
                value={form.full_name}
                onChange={updateField('full_name')}
                aria-invalid={Boolean(errors.full_name)}
                aria-describedby={errors.full_name ? 'ci-full-name-err' : undefined}
              />
              {errors.full_name && (
                <p id="ci-full-name-err" className="ec-form-error">{errors.full_name}</p>
              )}
            </div>

            <div className={`ec-form-group ${errors.email ? 'has-error' : ''}`}>
              <label htmlFor="ci-email">
                Institutional Email <span className="ec-req" aria-hidden="true">*</span>
              </label>
              <input
                id="ci-email"
                type="email"
                name="email"
                autoComplete="email"
                inputMode="email"
                placeholder="jane@university.edu"
                value={form.email}
                onChange={updateField('email')}
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? 'ci-email-err' : undefined}
              />
              {errors.email && (
                <p id="ci-email-err" className="ec-form-error">{errors.email}</p>
              )}
            </div>

            <div className={`ec-form-group ${errors.phone ? 'has-error' : ''}`}>
              <label htmlFor="ci-phone">Phone Number</label>
              <input
                id="ci-phone"
                type="tel"
                name="phone"
                autoComplete="tel"
                inputMode="tel"
                placeholder="+91 93053 29875"
                value={form.phone}
                onChange={updateField('phone')}
                aria-invalid={Boolean(errors.phone)}
                aria-describedby={errors.phone ? 'ci-phone-err' : undefined}
              />
              {errors.phone && (
                <p id="ci-phone-err" className="ec-form-error">{errors.phone}</p>
              )}
            </div>

            <div className={`ec-form-group ${errors.institution_name ? 'has-error' : ''}`}>
              <label htmlFor="ci-institution">
                Institution Name <span className="ec-req" aria-hidden="true">*</span>
              </label>
              <input
                id="ci-institution"
                type="text"
                name="institution_name"
                autoComplete="organization"
                placeholder="Greenfield University"
                value={form.institution_name}
                onChange={updateField('institution_name')}
                aria-invalid={Boolean(errors.institution_name)}
                aria-describedby={errors.institution_name ? 'ci-institution-err' : undefined}
              />
              {errors.institution_name && (
                <p id="ci-institution-err" className="ec-form-error">{errors.institution_name}</p>
              )}
            </div>

            <div className={`ec-form-group ${errors.message ? 'has-error' : ''}`}>
              <label htmlFor="ci-message">
                Message <span className="ec-req" aria-hidden="true">*</span>
              </label>
              <textarea
                id="ci-message"
                name="message"
                rows={3}
                placeholder="Tell us about your institution's needs…"
                value={form.message}
                onChange={updateField('message')}
                aria-invalid={Boolean(errors.message)}
                aria-describedby={errors.message ? 'ci-message-err' : undefined}
              />
              {errors.message && (
                <p id="ci-message-err" className="ec-form-error">{errors.message}</p>
              )}
            </div>

            {submitStatus !== 'idle' && submitMessage && (
              <div
                className={`ec-form-banner ${submitStatus === 'success' ? 'is-success' : 'is-error'}`}
                role={submitStatus === 'error' ? 'alert' : 'status'}
              >
                <span aria-hidden="true">{submitStatus === 'success' ? '✅' : '⚠️'}</span>
                {submitMessage}
              </div>
            )}

            <button
              type="submit"
              className="ec-btn-submit"
              disabled={submitting}
              aria-busy={submitting}
            >
              {submitting ? (
                <>
                  <span className="ec-spinner" aria-hidden="true" />
                  Sending…
                </>
              ) : (
                <>
                  <span aria-hidden="true">📨</span>
                  Send Inquiry
                </>
              )}
            </button>
          </form>
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

      <p>Developed by Global Tech Solutions</p>
    </div>

  </div>
</footer>

    </div>
  );
}