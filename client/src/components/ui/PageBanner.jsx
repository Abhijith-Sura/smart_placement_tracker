import { motion } from 'framer-motion'

/**
 * PageBanner — Portal-aware gradient banner.
 * gradient: 'orange' | 'violet' | 'teal'  — matches portal identity
 */

const GRADIENTS = {
  orange: 'linear-gradient(135deg, #ea580c 0%, #f97316 40%, #fb923c 70%, #fdba74 100%)',
  violet: 'linear-gradient(135deg, #5b21b6 0%, #7c3aed 40%, #8b5cf6 70%, #a78bfa 100%)',
  teal:   'linear-gradient(135deg, #0f766e 0%, #0d9488 40%, #14b8a6 70%, #5eead4 100%)',
}

const DARK_OVERLAY = {
  orange: 'linear-gradient(to left, rgba(234,88,12,0.3), transparent)',
  violet: 'linear-gradient(to left, rgba(91,33,182,0.3), transparent)',
  teal:   'linear-gradient(to left, rgba(15,118,110,0.3), transparent)',
}

const PageBanner = ({
  title,
  subtitle,
  badge,
  actions,
  compact = false,
  gradient = 'orange',   // 'orange' | 'violet' | 'teal'
  image,                 // optional hero image URL
}) => {
  const height = compact ? 'min-h-[140px]' : 'min-h-[180px]'
  const bg     = GRADIENTS[gradient]     || GRADIENTS.orange
  const overlay = DARK_OVERLAY[gradient] || DARK_OVERLAY.orange

  return (
    <div
      className={`relative w-full ${height} rounded-2xl overflow-hidden shadow-sm mb-6 flex items-center`}
      style={{ background: bg, isolation: 'isolate', transform: 'translateZ(0)' }}
    >
      {/* ── Abstract frosted glass circles ── */}
      <div className="absolute -top-10 -right-10 w-56 h-56 rounded-full"
        style={{ background: 'rgba(255,255,255,0.10)' }} />
      <div className="absolute top-4 right-32 w-28 h-28 rounded-full"
        style={{ background: 'rgba(255,255,255,0.08)' }} />
      <div className="absolute -bottom-8 right-16 w-40 h-40 rounded-full"
        style={{ background: 'rgba(0,0,0,0.06)' }} />
      <div className="absolute top-0 right-0 w-96 h-full"
        style={{ background: overlay }} />

      {/* ── Subtle dot grid ── */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.06] pointer-events-none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id={`banner-dots-${gradient}`} x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.2" fill="white" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#banner-dots-${gradient})`} />
      </svg>

      {/* ── Decorative line accents ── */}
      <svg className="absolute right-0 top-0 h-full w-64 opacity-10 pointer-events-none" viewBox="0 0 256 180" fill="none">
        <line x1="256" y1="0"  x2="80"  y2="180" stroke="white" strokeWidth="1.5"/>
        <line x1="256" y1="40" x2="120" y2="180" stroke="white" strokeWidth="1"/>
        <line x1="256" y1="80" x2="160" y2="180" stroke="white" strokeWidth="0.75"/>
        <circle cx="200" cy="60" r="30" stroke="white" strokeWidth="1" fill="none"/>
        <circle cx="200" cy="60" r="18" stroke="white" strokeWidth="0.75" fill="none"/>
      </svg>

      {/* ── Hero image ── */}
      {image && (
        <div className="absolute right-0 top-0 h-full w-72 overflow-hidden pointer-events-none">
          <img src={image} alt="" className="h-full w-full object-cover object-left opacity-30 mix-blend-luminosity" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(0,0,0,0.5) 0%, transparent 60%)' }} />
        </div>
      )}

      {/* ── Content ── */}
      <div className="relative z-10 px-8 md:px-10 py-7 flex flex-col gap-2.5 max-w-2xl">

        {badge && (
          <motion.span
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05, duration: 0.35 }}
            className="inline-flex items-center gap-1.5 self-start text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-white/20 text-white border border-white/30"
          >
            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
            {badge}
          </motion.span>
        )}

        <motion.h2
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className={`font-display font-bold text-white tracking-tight leading-tight drop-shadow-sm ${compact ? 'text-2xl' : 'text-3xl'}`}
        >
          {title}
        </motion.h2>

        {subtitle && (
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18, duration: 0.4 }}
            className={`text-white/80 font-normal leading-relaxed ${compact ? 'text-sm max-w-sm' : 'text-base max-w-md'}`}
          >
            {subtitle}
          </motion.p>
        )}

        {actions && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.24, duration: 0.35 }}
            className="flex items-center gap-3 flex-wrap mt-1"
          >
            {actions}
          </motion.div>
        )}
      </div>
    </div>
  )
}

export default PageBanner
