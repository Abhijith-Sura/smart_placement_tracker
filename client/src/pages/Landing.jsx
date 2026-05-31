import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  GraduationCap, Users, Briefcase, BarChart3, ArrowRight,
  Zap, Shield, ChevronRight, Bell, CheckCircle2, TrendingUp,
  Lock, Globe, Building2, Award, Target, Filter,
} from 'lucide-react'
import PlaceIQLogo from '../components/ui/PlaceIQLogo'


/* ─── Portal Icons (each portal colour) ─────────────────────── */
const AdminIcon = () => (
  <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
    <rect width="44" height="44" rx="13" fill="rgba(109,40,217,0.15)" stroke="rgba(109,40,217,0.30)" strokeWidth="1"/>
    <path d="M22 9L33 14.5V24C33 29.8 28.1 35.1 22 37C15.9 35.1 11 29.8 11 24V14.5L22 9Z" fill="rgba(109,40,217,0.20)" stroke="#7c3aed" strokeWidth="1.5"/>
    <circle cx="22" cy="22" r="3.5" fill="#7c3aed"/>
  </svg>
)

const StudentIcon = () => (
  <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
    <rect width="44" height="44" rx="13" fill="rgba(249,115,22,0.15)" stroke="rgba(249,115,22,0.30)" strokeWidth="1"/>
    <polygon points="22,11 35,17 22,23 9,17" fill="rgba(249,115,22,0.30)" stroke="#f97316" strokeWidth="1.5"/>
    <rect x="19" y="9" width="6" height="3" rx="1.5" fill="#f97316"/>
    <line x1="35" y1="17" x2="35" y2="26" stroke="#f97316" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="35" cy="27.5" r="2" fill="#f97316"/>
    <rect x="15" y="26" width="14" height="7" rx="3.5" fill="rgba(249,115,22,0.60)" stroke="#f97316" strokeWidth="1"/>
  </svg>
)

const CompanyIcon = () => (
  <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
    <rect width="44" height="44" rx="13" fill="rgba(20,184,166,0.15)" stroke="rgba(20,184,166,0.30)" strokeWidth="1"/>
    <rect x="11" y="18" width="22" height="17" rx="3" fill="rgba(20,184,166,0.20)" stroke="#0d9488" strokeWidth="1.5"/>
    <rect x="16" y="11" width="12" height="9" rx="2.5" fill="rgba(20,184,166,0.40)" stroke="#0d9488" strokeWidth="1"/>
    <rect x="19" y="22" width="6" height="9" rx="2" fill="#0d9488" opacity="0.8"/>
  </svg>
)

const stats = [
  { value: '2,400+', label: 'Students Placed' },
  { value: '150+',   label: 'Partner Companies' },
  { value: '98%',    label: 'Success Rate' },
  { value: '50+',    label: 'Colleges' },
]

const features = [
  { icon: Filter,   title: 'Smart Eligibility Filter', desc: 'Auto-match students to jobs based on CGPA, branch, backlogs — zero manual shortlisting.', color: 'text-violet-400', bg: 'rgba(109,40,217,0.12)', border: 'rgba(109,40,217,0.20)' },
  { icon: BarChart3, title: 'ATS Kanban Pipeline',     desc: 'Drag-and-drop applicant tracking from Applied to Selected in real-time.',                  color: 'text-sky-400',    bg: 'rgba(14,165,233,0.12)',  border: 'rgba(14,165,233,0.20)'  },
  { icon: Bell,     title: 'Real-time Alerts',         desc: 'Students get instant notifications on every application status change.',                    color: 'text-amber-400',  bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.20)'  },
  { icon: Users,    title: 'Multi-Portal Access',      desc: 'Dedicated dashboards for Admin/TPO, Students, and Company recruiters.',                     color: 'text-teal-400',   bg: 'rgba(20,184,166,0.12)',  border: 'rgba(20,184,166,0.20)'  },
  { icon: Lock,     title: 'Role-Based Security',      desc: 'JWT authentication with RBAC — each role sees only what they need.',                        color: 'text-rose-400',   bg: 'rgba(244,63,94,0.12)',   border: 'rgba(244,63,94,0.20)'   },
  { icon: TrendingUp,title:'Placement Analytics',      desc: 'Live charts on branch-wise placement, top recruiters, package distribution.',                color: 'text-emerald-400',bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.20)'  },
]

const portals = [
  {
    IconComp: AdminIcon,
    title: 'Admin / TPO',
    tag: 'Command Center',
    tagStyle: { background: 'rgba(109,40,217,0.15)', color: '#a78bfa', border: '1px solid rgba(109,40,217,0.30)' },
    accentColor: '#7c3aed',
    desc: 'Manage students, post jobs, track the full placement pipeline and view deep analytics.',
    to: '/login',
  },
  {
    IconComp: StudentIcon,
    title: 'Student',
    tag: 'Career Hub',
    tagStyle: { background: 'rgba(249,115,22,0.15)', color: '#fb923c', border: '1px solid rgba(249,115,22,0.30)' },
    accentColor: '#f97316',
    desc: 'Browse eligible job drives, apply in one click, and track your application status live.',
    to: '/login',
    featured: true,
  },
  {
    IconComp: CompanyIcon,
    title: 'Company / HR',
    tag: 'Talent Portal',
    tagStyle: { background: 'rgba(20,184,166,0.15)', color: '#2dd4bf', border: '1px solid rgba(20,184,166,0.30)' },
    accentColor: '#0d9488',
    desc: 'Post job openings, shortlist candidates, and manage your campus hiring pipeline.',
    to: '/login',
  },
]

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
}
const stagger = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.08 } },
}

/* ─── Glass card style variants ───────────────────────────── */
const glassCard = {
  background: 'rgba(255,255,255,0.06)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.12)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.10), 0 8px 32px rgba(0,0,0,0.25)',
}
const glassCardStrong = {
  background: 'rgba(255,255,255,0.09)',
  backdropFilter: 'blur(28px)',
  WebkitBackdropFilter: 'blur(28px)',
  border: '1px solid rgba(255,255,255,0.16)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15), 0 16px 48px rgba(0,0,0,0.30)',
}

export default function Landing() {
  return (
    <div
      className="min-h-screen font-sans text-white"
      style={{
        background: '#06061a',
        backgroundImage: `url('/auth_dark_bg.png')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Dark tint so text stays readable */}
      <div className="fixed inset-0 bg-[#06061a]/70 pointer-events-none" style={{ zIndex: 0 }} />

      {/* ── Navbar ───────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-50 h-16 flex items-center"
        style={{
          background: 'rgba(6,6,26,0.55)',
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        <div className="max-w-7xl mx-auto px-6 w-full flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <PlaceIQLogo size={32} color="white" />
            <span className="text-lg font-bold text-white tracking-tight">PlaceIQ</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            {[
              { label: 'Solutions', href: '#solutions' },
              { label: 'Features',  href: '#features'  },
              { label: 'Portals',   href: '#portals'   },
              { label: 'Pricing',   href: '#pricing'   },
            ].map(({ label, href }) => (
              <a key={label} href={href} className="text-sm font-semibold text-slate-400 hover:text-white transition-colors">
                {label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-sm font-semibold text-slate-300 hover:text-white transition-colors px-4 py-2 rounded-lg"
              style={{ border: '1px solid rgba(255,255,255,0.10)' }}
            >
              Log In
            </Link>
            <Link
              to="/register"
              className="text-sm font-bold text-white px-5 py-2.5 rounded-xl transition-all hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#0d9488)', boxShadow: '0 4px 18px rgba(109,40,217,0.35)' }}
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────── */}
      <section id="solutions" className="relative z-10 min-h-screen flex items-center px-6 pt-28 pb-16">
        <div className="max-w-7xl mx-auto w-full flex flex-col lg:flex-row items-center gap-12 lg:gap-16">

          {/* Left — copy */}
          <motion.div variants={stagger} initial="hidden" animate="show" className="flex-1 max-w-xl">

            {/* Badge */}
            <motion.div variants={fadeUp}>
              <span
                className="inline-flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-full mb-8 tracking-wider uppercase"
                style={{ background: 'rgba(167,139,250,0.12)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(167,139,250,0.25)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12)', color: '#c4b5fd' }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                Smart Campus Recruitment Platform
              </span>
            </motion.div>

            <motion.h1 variants={fadeUp} className="font-display text-5xl md:text-6xl font-semibold text-white leading-none tracking-tighter">
              Smart Placements,{' '}
              <span
                className="text-transparent bg-clip-text"
                style={{ backgroundImage: 'linear-gradient(135deg, #a78bfa, #38bdf8, #2dd4bf)' }}
              >
                Reimagined.
              </span>
            </motion.h1>

            <motion.p variants={fadeUp} className="mt-6 text-lg text-slate-300 font-normal max-w-xl leading-relaxed">
              PlaceIQ is the all-in-one campus recruitment platform built for colleges, students, and companies — delivering smarter hiring with zero friction.
            </motion.p>

            <motion.div variants={fadeUp} className="mt-10 flex items-center gap-4 flex-wrap">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 text-white font-bold px-8 py-4 rounded-xl transition-all hover:-translate-y-0.5"
                style={{ background: 'linear-gradient(135deg,#7c3aed,#0d9488)', boxShadow: '0 6px 24px rgba(109,40,217,0.40)' }}
              >
                Start Free Today <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 font-bold px-8 py-4 rounded-xl transition-all hover:-translate-y-0.5 text-slate-200"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
              >
                See How It Works <ChevronRight className="w-5 h-5 text-slate-400" />
              </Link>
            </motion.div>

            <motion.div variants={fadeUp} className="mt-8 flex items-center gap-6 flex-wrap">
              {['No credit card required', 'Free for students', 'Setup in 5 minutes'].map(item => (
                <span key={item} className="flex items-center gap-1.5 text-sm font-medium text-slate-400">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  {item}
                </span>
              ))}
            </motion.div>
          </motion.div>

          {/* Right — hero visual */}
          <motion.div
            initial={{ opacity: 0, x: 40, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="flex-1 relative hidden lg:flex items-center justify-center"
          >
            {/* Glow behind image */}
            <div className="absolute inset-0 rounded-3xl blur-3xl opacity-30"
              style={{ background: 'radial-gradient(ellipse at center, #7c3aed 0%, #0d9488 60%, transparent 100%)' }} />

            {/* Dashboard mockup image */}
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-white/10"
              style={{ boxShadow: '0 0 80px rgba(124,58,237,0.25), 0 32px 64px rgba(0,0,0,0.5)' }}>
              <img
                src="/landing_hero.png"
                alt="PlaceIQ Dashboard"
                className="w-full max-w-lg object-cover rounded-2xl"
              />
              {/* Glass overlay to blend with dark theme */}
              <div className="absolute inset-0 rounded-2xl"
                style={{ background: 'linear-gradient(to bottom, transparent 60%, rgba(10,10,30,0.6) 100%)' }} />
            </div>

            {/* Floating pipeline card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.6 }}
              className="absolute -bottom-4 -left-6 w-64 rounded-2xl p-4"
              style={glassCardStrong}
            >
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Live Pipeline</p>
              {[
                { label: 'Applied',   count: 48, color: 'rgba(148,163,184,0.4)', w: '100%' },
                { label: 'Screened',  count: 32, color: 'rgba(56,189,248,0.5)',  w: '67%'  },
                { label: 'Interview', count: 21, color: 'rgba(251,191,36,0.5)',  w: '44%'  },
                { label: 'Selected',  count: 15, color: 'rgba(52,211,153,0.6)',  w: '31%'  },
              ].map(({ label, count, color, w }) => (
                <div key={label} className="mb-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-slate-400">{label}</span>
                    <span className="text-xs font-bold text-white">{count}</span>
                  </div>
                  <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div className="h-full rounded-full" style={{ width: w, background: color }} />
                  </div>
                </div>
              ))}
              <div className="mt-3 pt-2.5 flex items-center justify-between" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                <span className="text-xs text-slate-500 font-medium">Infosys Drive</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full text-emerald-400" style={{ background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.25)' }}>
                  Live Now
                </span>
              </div>
            </motion.div>
          </motion.div>

        </div>
      </section>

      {/* ── Stats ─────────────────────────────────────────────── */}
      <section className="relative z-10 py-16 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map(({ value, label }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ delay: i * 0.07 }}
              className="rounded-2xl p-7 text-center transition-all hover:-translate-y-1"
              style={glassCardStrong}
            >
              <p
                className="font-mono text-4xl font-semibold tabular-nums tracking-tighter mb-2 text-transparent bg-clip-text"
                style={{ backgroundImage: 'linear-gradient(135deg,#a78bfa,#38bdf8)' }}
              >
                {value}
              </p>
              <p className="text-sm font-medium text-slate-400">{label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────── */}
      <section id="features" className="relative z-10 py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-center mb-16">
            <motion.div variants={fadeUp}>
              <span className="inline-block text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full mb-4"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', color: '#a78bfa' }}>
                Platform Features
              </span>
            </motion.div>
            <motion.h2 variants={fadeUp} className="font-display text-3xl md:text-4xl font-semibold text-white tracking-tight">
              Everything you need,{' '}
              <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(135deg,#a78bfa,#2dd4bf)' }}>
                built in.
              </span>
            </motion.h2>
            <motion.p variants={fadeUp} className="mt-5 text-base text-slate-400 font-normal max-w-xl mx-auto">
              Powerful tools that automate the repetitive and amplify the important.
            </motion.p>
          </motion.div>

          <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }} className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map(({ icon: Icon, title, desc, color, bg, border }) => (
              <motion.div
                key={title}
                variants={fadeUp}
                className="group rounded-2xl p-7 transition-all hover:-translate-y-1 cursor-default"
                style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.10)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.10), 0 4px 24px rgba(0,0,0,0.20)' }}
                whileHover={{ background: 'rgba(255,255,255,0.09)', boxShadow: `inset 0 1px 0 rgba(255,255,255,0.15), 0 8px 32px rgba(0,0,0,0.25), 0 0 24px ${bg.replace('0.12','0.20')}` }}
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-transform group-hover:scale-110"
                  style={{ background: bg, border: `1px solid ${border}` }}>
                  <Icon className={`w-6 h-6 ${color}`} />
                </div>
                <h3 className="text-base font-medium tracking-tight text-white mb-2.5">{title}</h3>
                <p className="text-sm font-normal leading-relaxed text-slate-400">{desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Portals ───────────────────────────────────────────── */}
      <section id="portals" className="relative z-10 py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-center mb-16">
            <motion.div variants={fadeUp}>
              <span className="inline-block text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full mb-4"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', color: '#2dd4bf' }}>
                Access Portals
              </span>
            </motion.div>
            <motion.h2 variants={fadeUp} className="font-display text-3xl md:text-4xl font-semibold text-white tracking-tight">
              3 Portals.{' '}
              <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(135deg,#7c3aed,#f97316,#0d9488)' }}>
                1 Platform.
              </span>
            </motion.h2>
            <motion.p variants={fadeUp} className="mt-5 text-base text-slate-400 font-normal max-w-xl mx-auto">
              Each stakeholder gets a tailored experience built for their workflow.
            </motion.p>
          </motion.div>

          <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }} className="grid md:grid-cols-3 gap-6">
            {portals.map(({ IconComp, title, tag, tagStyle, accentColor, desc, to, featured }) => (
              <motion.div
                key={title}
                variants={fadeUp}
                className="group flex flex-col rounded-2xl p-8 transition-all hover:-translate-y-2"
                style={{
                  background: featured ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,0.05)',
                  backdropFilter: 'blur(24px)',
                  WebkitBackdropFilter: 'blur(24px)',
                  border: featured ? `1px solid ${accentColor}50` : '1px solid rgba(255,255,255,0.10)',
                  boxShadow: featured
                    ? `inset 0 1px 0 rgba(255,255,255,0.15), 0 0 48px ${accentColor}20, 0 16px 48px rgba(0,0,0,0.30)`
                    : 'inset 0 1px 0 rgba(255,255,255,0.10), 0 8px 32px rgba(0,0,0,0.20)',
                }}
              >
                <div className="mb-5"><IconComp /></div>
                <span className="inline-block text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-4 w-fit" style={tagStyle}>
                  {tag}
                </span>
                <h3 className="text-xl font-semibold tracking-tight text-white mb-3">{title}</h3>
                <p className="text-sm font-normal leading-relaxed text-slate-400 flex-1">{desc}</p>
                <Link
                  to={to}
                  className="mt-7 inline-flex items-center gap-2 text-sm font-bold px-4 py-2.5 rounded-xl border w-fit transition-all group-hover:gap-3"
                  style={{ color: accentColor, background: `${accentColor}15`, borderColor: `${accentColor}30` }}
                >
                  Enter Portal <ArrowRight className="w-4 h-4" />
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── CTA / Pricing ─────────────────────────────────────── */}
      <section id="pricing" className="relative z-10 py-28 px-6">
        <div className="max-w-4xl mx-auto text-center rounded-3xl p-12 md:p-20" style={glassCardStrong}>
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            <span className="inline-flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-full mb-8 uppercase tracking-wider"
              style={{ background: 'rgba(167,139,250,0.12)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(167,139,250,0.28)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12)', color: '#c4b5fd' }}>
              <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-pulse" />
              Ready to Transform Placements?
            </span>
            <h2 className="font-display text-4xl md:text-5xl font-semibold tracking-tight text-white leading-tight mb-5">
              Join 50+ colleges already<br />using PlaceIQ.
            </h2>
            <p className="text-lg text-slate-400 font-normal max-w-xl mx-auto mb-10">
              Stop managing placements with spreadsheets. Move to an intelligent platform built for scale.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/register"
                className="w-full sm:w-auto inline-flex justify-center items-center gap-2 text-white font-bold px-8 py-4 rounded-xl transition-all hover:-translate-y-0.5"
                style={{ background: 'linear-gradient(135deg,#7c3aed,#0d9488)', boxShadow: '0 6px 28px rgba(109,40,217,0.40)' }}
              >
                Get Started Free <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                to="/login"
                className="w-full sm:w-auto inline-flex justify-center items-center gap-2 font-bold px-8 py-4 rounded-xl transition-all hover:-translate-y-0.5 text-slate-200"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
              >
                Sign In <ChevronRight className="w-5 h-5 text-slate-400" />
              </Link>
            </div>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              {['Secure RBAC', 'Real-time Updates', 'Multi-Role Access'].map(item => (
                <span key={item} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-slate-400"
                  style={{ background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.14)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)' }}>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  {item}
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────── */}
      <footer className="relative z-10 py-8 px-6" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <PlaceIQLogo size={28} color="rgba(255,255,255,0.50)" />
            <span className="text-base font-bold tracking-tight text-white">PlaceIQ</span>
          </div>
          <div className="flex items-center gap-6 text-sm font-semibold text-slate-500">
            {['Privacy', 'Terms', 'Support'].map(l => (
              <a key={l} href="#" className="hover:text-slate-300 transition-colors">{l}</a>
            ))}
          </div>
          <p className="text-sm text-slate-600 font-medium">© 2026 PlaceIQ. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
