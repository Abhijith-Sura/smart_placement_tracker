import { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import {
  GraduationCap, Mail, Lock, User, Users, Shield, Building2, KeyRound,
  CheckCircle2, ArrowLeft, TrendingUp, Bell, Award,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import API from '../api/axios'
import toast from 'react-hot-toast'
import PlaceIQLogo from '../components/ui/PlaceIQLogo'

/* ─── Role definitions ───────────────────────────────────────── */
const ROLES = [
  { id: 'student', label: 'Student',   icon: Users,     desc: 'Find jobs & internships' },
  { id: 'admin',   label: 'Admin/TPO', icon: Shield,    desc: 'Manage placements'       },
  { id: 'company', label: 'Company',   icon: Building2, desc: 'Post & hire talent'      },
  { id: 'alumni',  label: 'Alumni',    icon: GraduationCap, desc: 'Refer candidates'    },
]

/* ─── Feature list ───────────────────────────────────────────── */
const FEATURES = [
  'Smart eligibility auto-matching',
  'Real-time application tracking',
  'Drag & drop ATS pipeline',
  'Live placement analytics',
  'Instant offer notifications',
]

/* ─── 6-digit OTP boxes ──────────────────────────────────────── */
const OtpBoxes = ({ value, onChange }) => {
  const inputsRef = useRef([])
  const digits = Array.from({ length: 6 }, (_, i) => value[i] || '')

  const handleKey = (e, idx) => {
    const key = e.key
    if (key === 'Backspace') {
      if (digits[idx]) {
        onChange(digits.map((d, i) => (i === idx ? '' : d)).join(''))
      } else if (idx > 0) {
        inputsRef.current[idx - 1]?.focus()
        onChange(digits.map((d, i) => (i === idx - 1 ? '' : d)).join(''))
      }
      return
    }
    if (key === 'ArrowLeft' && idx > 0) { inputsRef.current[idx - 1]?.focus(); return }
    if (key === 'ArrowRight' && idx < 5) { inputsRef.current[idx + 1]?.focus(); return }
    if (/^\d$/.test(key)) {
      onChange(digits.map((d, i) => (i === idx ? key : d)).join(''))
      if (idx < 5) inputsRef.current[idx + 1]?.focus()
    }
  }

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    onChange(Array.from({ length: 6 }, (_, i) => pasted[i] || '').join(''))
    inputsRef.current[Math.min(pasted.length, 5)]?.focus()
    e.preventDefault()
  }

  return (
    <div className="flex items-center justify-center gap-3">
      {digits.map((d, idx) => (
        <input
          key={idx}
          ref={el => { inputsRef.current[idx] = el }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d}
          onChange={() => {}}
          onKeyDown={(e) => handleKey(e, idx)}
          onPaste={handlePaste}
          onFocus={e => e.target.select()}
          className="w-12 h-14 text-center text-2xl font-bold border-2 border-slate-200 rounded-xl bg-white text-slate-800 outline-none transition-all duration-150 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/15 focus:shadow-[0_0_0_4px_rgba(249,115,22,0.10)] caret-orange-500"
        />
      ))}
    </div>
  )
}

/* ─── Floating stat card ──────────────────────────────────────── */
const FloatCard = ({ icon: Icon, label, value, iconStyle, className, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, x: 24, scale: 0.92 }}
    animate={{ opacity: 1, x: 0, scale: 1 }}
    transition={{ delay, duration: 0.55, ease: 'easeOut' }}
    className={`absolute rounded-2xl px-4 py-3 flex items-center gap-3 ${className}`}
    style={{
      background: 'rgba(6,6,26,0.55)',
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      border: '1px solid rgba(255,255,255,0.16)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.14), 0 12px 40px rgba(0,0,0,0.50)',
    }}
  >
    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={iconStyle}>
      <Icon style={{ width: '18px', height: '18px' }} />
    </div>
    <div>
      <p className="text-[11px] text-slate-400 font-semibold leading-none mb-0.5">{label}</p>
      <p className="text-[13px] font-bold text-white leading-none">{value}</p>
    </div>
  </motion.div>
)

/* ─── Register page ──────────────────────────────────────────── */
const Register = () => {
  const [role, setRole] = useState('student')
  const [step, setStep] = useState('form') // 'form' | 'otp'
  const [registeredEmail, setRegisteredEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [verifying, setVerifying] = useState(false)

  const { register: registerUser, verifyOTP } = useAuth()
  const navigate = useNavigate()
  const { register, handleSubmit, formState: { errors, isSubmitting }, watch } = useForm()

  const onSubmit = async (data) => {
    try {
      const res = await registerUser({ ...data, role })
      if (res.requiresVerification) {
        setRegisteredEmail(res.email)
        setStep('otp')
        toast.success(res.message)
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed')
    }
  }

  const handleVerify = async (e) => {
    e.preventDefault()
    if (otp.length !== 6) return toast.error('Please enter a 6-digit OTP')
    setVerifying(true)
    try {
      const res = await verifyOTP({ email: registeredEmail, otp })
      const userRole = res?.user?.role || res?.role
      const redirects = {
        admin: '/admin/dashboard',
        student: '/student/dashboard',
        company: '/company/dashboard',
        alumni: '/alumni/dashboard'
      }
      navigate(redirects[userRole] || '/')
      toast.success('Email verified! Welcome to PlaceIQ')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Verification failed')
    } finally {
      setVerifying(false)
    }
  }

  const handleResend = async () => {
    try {
      const res = await API.post('/auth/resend-otp', { email: registeredEmail })
      toast.success('A new OTP has been sent to your email.')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resend OTP')
    }
  }

  /* Shared glass card style for form panel */
  const formCard = {
    background: 'rgba(255,255,255,0.07)',
    backdropFilter: 'blur(28px)',
    WebkitBackdropFilter: 'blur(28px)',
    border: '1px solid rgba(255,255,255,0.15)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.14), 0 20px 60px rgba(0,0,0,0.40)',
  }

  /* CTA gradient button */
  const ctaBtn = {
    background: 'linear-gradient(135deg,#7c3aed,#0d9488)',
    boxShadow: '0 4px 20px rgba(109,40,217,0.40)',
  }

  return (
    <div
      className="min-h-screen flex font-sans overflow-hidden"
      style={{
        background: '#06061a',
        backgroundImage: `url('/auth_dark_bg.png')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Dark tint */}
      <div className="fixed inset-0 bg-[#06061a]/60 pointer-events-none" style={{ zIndex: 0 }} />

      {/* ── LEFT PANEL ────────────────────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden z-10"
        style={{
          backgroundImage: 'url(/login_visual.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Dark overlay */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(15,10,40,0.85) 0%, rgba(10,20,50,0.75) 100%)' }} />
        <div className="absolute inset-0 bg-[#06061a]/40" />

        {/* Floating stat cards */}
        <FloatCard
          icon={TrendingUp}
          label="Placement Rate"
          value="98% this year"
          iconStyle={{ background: 'rgba(124,58,237,0.25)', color: '#a78bfa' }}
          className="top-[28%] right-[-12px] shadow-2xl"
          delay={0.35}
        />
        <FloatCard
          icon={Bell}
          label="Live Alerts"
          value="Instant offers"
          iconStyle={{ background: 'rgba(245,158,11,0.20)', color: '#fbbf24' }}
          className="top-[48%] right-[28px] shadow-2xl"
          delay={0.48}
        />
        <FloatCard
          icon={Award}
          label="Top Recruiters"
          value="500+ companies"
          iconStyle={{ background: 'rgba(52,211,153,0.20)', color: '#34d399' }}
          className="top-[66%] right-[-8px] shadow-2xl"
          delay={0.60}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
            <Link to="/" className="flex items-center gap-3 w-max">
              <PlaceIQLogo size={36} color="white" />
              <span className="text-2xl font-bold text-white tracking-tight">PlaceIQ</span>
            </Link>
          </motion.div>

          {/* Hero copy */}
          <motion.div
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18, duration: 0.55 }}
            className="max-w-md"
          >
            <h2 className="text-5xl font-bold text-white leading-[1.1] mb-5 tracking-tight">
              Join thousands of{' '}
              <span
                className="text-transparent bg-clip-text"
                style={{ backgroundImage: 'linear-gradient(135deg,#a78bfa 30%,#2dd4bf)' }}
              >
                campus professionals.
              </span>
            </h2>
            <p className="text-slate-400 text-lg leading-relaxed font-medium">
              Create your free account in under 2 minutes and take control of the recruitment lifecycle.
            </p>

            {/* Trust bullets */}
            <div className="mt-8 space-y-3">
              {FEATURES.map(feat => (
                <div key={feat} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(45,212,191,0.15)', border: '1px solid rgba(45,212,191,0.30)' }}>
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4L3.5 6.5L9 1" stroke="#2dd4bf" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <span className="text-sm font-semibold text-slate-300">{feat}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Footer */}
          <p className="text-slate-600 text-sm font-medium">
            © {new Date().getFullYear()} PlaceIQ. All rights reserved.
          </p>
        </div>
      </div>

      {/* ── RIGHT PANEL ────────────────────────────────────────── */}
      <div className="relative z-10 flex-1 flex items-center justify-center p-8 overflow-y-auto">
        <AnimatePresence mode="wait">

          {/* ── REGISTER FORM STEP ── */}
          {step === 'form' && (
            <motion.div
              key="form"
              className="w-full max-w-md relative z-10 my-8"
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -12 }}
              transition={{ duration: 0.3 }}
            >
              {/* Mobile logo */}
              <div className="lg:hidden flex items-center gap-3 mb-10">
                <PlaceIQLogo size={36} color="white" />
                <span className="text-2xl font-bold text-white tracking-tight">PlaceIQ</span>
              </div>

              <div className="rounded-3xl p-10" style={formCard}>
                <h1 className="text-[28px] font-bold text-white mb-1 tracking-tight">Create an account</h1>
                <p className="text-slate-400 text-sm mb-7 font-medium">Choose your role and get started in seconds</p>

                {/* ── Role selector ── */}
                <div className="grid grid-cols-4 gap-2.5 mb-8">
                  {ROLES.map((r) => {
                    const isActive = role === r.id
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setRole(r.id)}
                        className={`relative flex flex-col items-center justify-center gap-1.5 px-1 py-3.5 rounded-2xl border-2 transition-all duration-200 overflow-hidden
                          ${isActive
                            ? 'bg-gradient-to-br from-violet-600 to-indigo-600 border-transparent text-white shadow-lg shadow-violet-500/20 scale-[1.03]'
                            : 'bg-white/5 border-white/10 text-slate-400 hover:border-violet-500/50 hover:bg-white/10 hover:text-white'
                          }`}
                      >
                        {isActive && (
                          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(255,255,255,0.18),transparent)]" />
                        )}
                        <r.icon className="w-4 h-4 relative z-10" />
                        <span className="text-[10px] font-bold leading-none relative z-10">{r.label}</span>
                      </button>
                    )
                  })}
                </div>

                {/* ── Form ── */}
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <Input
                    label="Full Name"
                    icon={User}
                    placeholder="Rahul Sharma"
                    required
                    error={errors.name?.message}
                    {...register('name', {
                      required: 'Name is required',
                      minLength: { value: 2, message: 'Min 2 characters' },
                    })}
                  />
                  <Input
                    label="Email address"
                    type="email"
                    icon={Mail}
                    placeholder="you@college.edu"
                    required
                    error={errors.email?.message}
                    {...register('email', {
                      required: 'Email is required',
                      pattern: { value: /\S+@\S+\.\S+/, message: 'Enter a valid email' },
                    })}
                  />
                  <Input
                    label="Password"
                    type="password"
                    icon={Lock}
                    placeholder="••••••••"
                    required
                    error={errors.password?.message}
                    {...register('password', {
                      required: 'Password is required',
                      minLength: { value: 6, message: 'Min 6 characters' },
                    })}
                  />
                  <Input
                    label="Confirm Password"
                    type="password"
                    icon={Lock}
                    placeholder="••••••••"
                    required
                    error={errors.confirmPassword?.message}
                    {...register('confirmPassword', {
                      required: 'Please confirm password',
                      validate: val => val === watch('password') || 'Passwords do not match',
                    })}
                  />

                  {role === 'alumni' && (
                    <div className="space-y-4 pt-4 border-t border-white/10 animate-fade-in">
                      <Input
                        label="Graduation Year"
                        type="number"
                        placeholder="e.g. 2024"
                        required
                        error={errors.graduationYear?.message}
                        {...register('graduationYear', {
                          required: 'Graduation year is required',
                          min: { value: 1900, message: 'Invalid year' },
                          max: { value: 2100, message: 'Invalid year' },
                        })}
                      />
                      <Input
                        label="Current Corporate Employer"
                        placeholder="e.g. Microsoft"
                        required
                        error={errors.companyName?.message}
                        {...register('companyName', {
                          required: 'Current company is required',
                        })}
                      />
                      <Input
                        label="LinkedIn Profile URL"
                        placeholder="https://linkedin.com/in/username"
                        required
                        error={errors.linkedinUrl?.message}
                        {...register('linkedinUrl', {
                          required: 'LinkedIn profile is required',
                          pattern: { value: /^https:\/\/[a-z]{2,3}\.linkedin\.com\/in\/.+/, message: 'Enter a valid LinkedIn profile URL' }
                        })}
                      />
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-12 text-base font-bold rounded-xl text-white transition-all hover:-translate-y-0.5 disabled:opacity-60 mt-2"
                    style={ctaBtn}
                  >
                    {isSubmitting ? 'Creating account...' : `Create ${ROLES.find(r => r.id === role)?.label} Account`}
                  </button>
                </form>

                <p className="text-center text-sm text-slate-500 mt-8 font-medium">
                  Already have an account?{' '}
                  <Link to="/login" className="font-bold transition-colors" style={{ color: '#a78bfa' }}>
                    Sign in
                  </Link>
                </p>
              </div>
            </motion.div>
          )}

          {/* ── OTP STEP ── */}
          {step === 'otp' && (
            <motion.div
              key="otp"
              className="w-full max-w-md relative z-10"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.3 }}
            >
              <div className="rounded-3xl p-10 text-center" style={formCard}>
                {/* Icon badge */}
                <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6"
                  style={{ background: 'rgba(124,58,237,0.18)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(124,58,237,0.35)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12), 0 0 24px rgba(124,58,237,0.25)' }}>
                  <KeyRound className="w-9 h-9" style={{ color: '#a78bfa' }} />
                </div>

                <h1 className="text-[28px] font-bold text-white mb-3 tracking-tight">Verify your email</h1>
                <p className="text-slate-400 text-sm mb-8 leading-relaxed">
                  We've sent a 6-digit code to{' '}
                  <strong className="text-slate-200 font-bold">{registeredEmail}</strong>.
                  <br />Enter it below to verify your account.
                </p>

                <form onSubmit={handleVerify} className="space-y-8">
                  <OtpBoxes value={otp} onChange={setOtp} />

                  <button
                    type="submit"
                    disabled={verifying}
                    className="w-full h-12 text-base font-bold rounded-xl text-white transition-all hover:-translate-y-0.5 disabled:opacity-60"
                    style={ctaBtn}
                  >
                    {verifying ? 'Verifying…' : 'Verify & Continue'}
                  </button>
                </form>

                <div className="flex items-center justify-between mt-8 pt-8" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                  <button
                    type="button"
                    onClick={() => setStep('form')}
                    className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" /> Go back
                  </button>
                  <button
                    type="button"
                    onClick={handleResend}
                    className="text-sm font-semibold transition-colors"
                    style={{ color: '#a78bfa' }}
                  >
                    Resend OTP
                  </button>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  )
}

export default Register
