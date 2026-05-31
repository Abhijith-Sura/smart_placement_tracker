import { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import {
  Mail, Lock, KeyRound, ArrowLeft,
  TrendingUp, Bell, Award,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import API from '../api/axios'
import toast from 'react-hot-toast'
import PlaceIQLogo from '../components/ui/PlaceIQLogo'


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

/* ─── 6-digit OTP box ─────────────────────────────────────────── */
const OtpBoxes = ({ value, onChange }) => {
  const inputsRef = useRef([])
  const digits = Array.from({ length: 6 }, (_, i) => value[i] || '')

  const handleKey = (e, idx) => {
    const key = e.key
    if (key === 'Backspace') {
      if (digits[idx]) {
        const next = digits.map((d, i) => (i === idx ? '' : d)).join('')
        onChange(next)
      } else if (idx > 0) {
        inputsRef.current[idx - 1]?.focus()
        const next = digits.map((d, i) => (i === idx - 1 ? '' : d)).join('')
        onChange(next)
      }
      return
    }
    if (key === 'ArrowLeft'  && idx > 0) { inputsRef.current[idx - 1]?.focus(); return }
    if (key === 'ArrowRight' && idx < 5) { inputsRef.current[idx + 1]?.focus(); return }
    if (/^\d$/.test(key)) {
      const next = digits.map((d, i) => (i === idx ? key : d)).join('')
      onChange(next)
      if (idx < 5) inputsRef.current[idx + 1]?.focus()
    }
  }

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    onChange(pasted.padEnd(6, '').slice(0, 6).split('').map((c, i) => pasted[i] || '').join(''))
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
          className="w-12 h-14 text-center text-2xl font-bold rounded-xl text-white outline-none transition-all duration-150 caret-violet-400"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: d ? '2px solid rgba(167,139,250,0.60)' : '2px solid rgba(255,255,255,0.12)',
          }}
          onFocus={e => { e.target.style.border = '2px solid rgba(167,139,250,0.80)'; e.target.style.boxShadow = '0 0 0 4px rgba(124,58,237,0.15)'; e.target.select() }}
          onBlur={e  => { e.target.style.border = d ? '2px solid rgba(167,139,250,0.60)' : '2px solid rgba(255,255,255,0.12)'; e.target.style.boxShadow = 'none' }}
        />
      ))}
    </div>
  )
}

/* ─── Main Login component ─────────────────────────────────── */
const Login = () => {
  const [step, setStep] = useState('login')
  const [emailForOtp, setEmailForOtp] = useState('')
  const [otp, setOtp] = useState('')
  const [verifying, setVerifying]     = useState(false)
  const [sendingReset, setSendingReset] = useState(false)

  const { login, verifyOTP } = useAuth()
  const navigate = useNavigate()
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm()

  const onSubmitLogin = async (data) => {
    try {
      const res = await login(data)
      const userRole = res?.user?.role || res?.role
      const redirects = { admin: '/admin/dashboard', student: '/student/dashboard', company: '/company/dashboard' }
      navigate(redirects[userRole] || '/')
      toast.success('Welcome back!')
    } catch (err) {
      if (err.response?.data?.requiresVerification) {
        setEmailForOtp(err.response.data.email)
        setStep('otp')
        toast.error('Email not verified. We sent a new OTP.')
      } else {
        toast.error(err.response?.data?.message || 'Login failed')
      }
    }
  }

  const handleVerify = async (e) => {
    e.preventDefault()
    if (otp.length !== 6) return toast.error('Please enter a 6-digit OTP')
    setVerifying(true)
    try {
      const res = await verifyOTP({ email: emailForOtp, otp })
      const userRole = res?.user?.role || res?.role
      const redirects = { admin: '/admin/dashboard', student: '/student/dashboard', company: '/company/dashboard' }
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
      await API.post('/auth/resend-otp', { email: emailForOtp })
      toast.success('A new OTP has been sent to your email.')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resend OTP')
    }
  }

  const handleForgotSubmit = async (e) => {
    e.preventDefault()
    if (!emailForOtp) return toast.error('Please enter your email')
    setSendingReset(true)
    try {
      const res = await API.post('/auth/forgot-password', { email: emailForOtp })
      toast.success(res.data.message || 'Reset link sent!')
      setStep('login')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send reset link')
    } finally {
      setSendingReset(false)
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

      {/* ── LEFT PANEL ──────────────────────────────────────────────────────── */}
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
        {/* Extra dark tint on left panel */}
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
          value="Drive in 2 hrs"
          iconStyle={{ background: 'rgba(245,158,11,0.20)', color: '#fbbf24' }}
          className="top-[48%] right-[28px] shadow-2xl"
          delay={0.48}
        />
        <FloatCard
          icon={Award}
          label="Offers Today"
          value="24 new offers"
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
              Welcome back to your{' '}
              <span
                className="text-transparent bg-clip-text"
                style={{ backgroundImage: 'linear-gradient(135deg,#a78bfa 30%,#2dd4bf)' }}
              >
                placement hub.
              </span>
            </h2>
            <p className="text-slate-400 text-lg leading-relaxed font-medium">
              Track applications, schedule interviews,<br />
              and secure your dream career — all in one place.
            </p>

            {/* Trust bullets */}
            <div className="mt-8 space-y-3">
              {['Smart eligibility matching', 'Real-time pipeline tracking', 'Instant offer notifications'].map(t => (
                <div key={t} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(45,212,191,0.15)', border: '1px solid rgba(45,212,191,0.30)' }}>
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4L3.5 6.5L9 1" stroke="#2dd4bf" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <span className="text-sm font-semibold text-slate-300">{t}</span>
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
      <div className="relative z-10 flex-1 flex items-center justify-center p-8">
        <AnimatePresence mode="wait">

          {/* ── LOGIN STEP ── */}
          {step === 'login' && (
            <motion.div
              key="login" className="w-full max-w-md"
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
                <h1 className="text-[28px] font-bold text-white mb-1 tracking-tight">Sign in</h1>
                <p className="text-slate-400 text-sm mb-8 font-medium">Enter your details to access your account</p>

                <form onSubmit={handleSubmit(onSubmitLogin)} className="space-y-5">
                  <Input
                    label="Email address" type="email" icon={Mail}
                    placeholder="you@college.edu" required error={errors.email?.message}
                    {...register('email', {
                      required: 'Email is required',
                      pattern: { value: /\S+@\S+\.\S+/, message: 'Enter a valid email' },
                    })}
                  />
                  <div>
                    <Input
                      label="Password" type="password" icon={Lock}
                      placeholder="••••••••" required error={errors.password?.message}
                      {...register('password', { required: 'Password is required' })}
                    />
                    <div className="flex justify-end mt-2.5">
                      <button type="button" onClick={() => setStep('forgot')}
                        className="text-sm font-semibold transition-colors"
                        style={{ color: '#a78bfa' }}
                        onMouseEnter={e => e.target.style.color = '#c4b5fd'}
                        onMouseLeave={e => e.target.style.color = '#a78bfa'}
                      >
                        Forgot Password?
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-12 text-base font-bold rounded-xl text-white transition-all hover:-translate-y-0.5 disabled:opacity-60"
                    style={ctaBtn}
                  >
                    {isSubmitting ? 'Signing in…' : 'Sign in to PlaceIQ'}
                  </button>
                </form>

                <p className="text-center text-sm text-slate-500 mt-8 font-medium">
                  Don't have an account?{' '}
                  <Link to="/register" className="font-bold transition-colors" style={{ color: '#a78bfa' }}>
                    Create one
                  </Link>
                </p>
              </div>
            </motion.div>
          )}

          {/* ── OTP STEP ── */}
          {step === 'otp' && (
            <motion.div
              key="otp" className="w-full max-w-md"
              initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.3 }}
            >
              <div className="rounded-3xl p-10 text-center" style={formCard}>
                <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6"
                  style={{ background: 'rgba(124,58,237,0.18)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(124,58,237,0.35)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12), 0 0 24px rgba(124,58,237,0.25)' }}>
                  <KeyRound className="w-9 h-9" style={{ color: '#a78bfa' }} />
                </div>
                <h1 className="text-[28px] font-bold text-white mb-3 tracking-tight">Verify your email</h1>
                <p className="text-slate-400 text-sm mb-8 leading-relaxed">
                  We've sent a 6-digit code to{' '}
                  <strong className="text-slate-200 font-bold">{emailForOtp}</strong>.
                  <br />Enter it below to continue.
                </p>

                <form onSubmit={handleVerify} className="space-y-8">
                  <OtpBoxes value={otp} onChange={setOtp} />
                  <button
                    type="submit"
                    disabled={verifying}
                    className="w-full h-12 text-base font-bold rounded-xl text-white transition-all hover:-translate-y-0.5 disabled:opacity-60"
                    style={ctaBtn}
                  >
                    {verifying ? 'Verifying…' : 'Verify & Login'}
                  </button>
                </form>

                <div className="flex items-center justify-between mt-8 pt-8" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                  <button type="button" onClick={() => setStep('login')}
                    className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-300 transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Back to login
                  </button>
                  <button type="button" onClick={handleResend}
                    className="text-sm font-semibold transition-colors" style={{ color: '#a78bfa' }}>
                    Resend OTP
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── FORGOT STEP ── */}
          {step === 'forgot' && (
            <motion.div
              key="forgot" className="w-full max-w-md"
              initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.3 }}
            >
              <div className="rounded-3xl p-10" style={formCard}>
                <button type="button" onClick={() => setStep('login')}
                  className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-300 transition-colors mb-8">
                  <ArrowLeft className="w-4 h-4" /> Back to login
                </button>
                <h1 className="text-[28px] font-bold text-white mb-3 tracking-tight">Reset Password</h1>
                <p className="text-slate-400 text-sm mb-8 leading-relaxed">
                  Enter your email and we'll send you a secure link to reset your password.
                </p>
                <form onSubmit={handleForgotSubmit} className="space-y-6">
                  <Input
                    label="Email address" type="email" icon={Mail}
                    placeholder="you@college.edu" required
                    value={emailForOtp}
                    onChange={(e) => setEmailForOtp(e.target.value)}
                  />
                  <button
                    type="submit"
                    disabled={sendingReset}
                    className="w-full h-12 text-base font-bold rounded-xl text-white transition-all hover:-translate-y-0.5 disabled:opacity-60"
                    style={ctaBtn}
                  >
                    {sendingReset ? 'Sending…' : 'Send Reset Link'}
                  </button>
                </form>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  )
}

export default Login