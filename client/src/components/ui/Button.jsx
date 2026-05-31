import { motion } from 'framer-motion'
import { tw } from '../../lib/tw'

const variants = {
  primary:   tw.btnPrimary,
  secondary: tw.btnSecondary,
  outline:   tw.btnOutline,
  ghost:     tw.btnGhost,
  danger:    tw.btnDanger,
  glass:     tw.btnGlass,
}
const sizes = {
  sm: tw.btnSm,
  md: tw.btnMd,
  lg: tw.btnLg,
}

const Button = ({
  children, variant = 'primary', size = 'md',
  className = '', loading = false, icon, ...props
}) => (
  <motion.button
    whileTap={{ scale: 0.97 }}
    className={`${tw.btnBase} ${variants[variant]} ${sizes[size]} ${className}`}
    disabled={loading || props.disabled}
    {...props}
  >
    {loading ? (
      <span className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:0ms]" />
        <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:150ms]" />
        <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:300ms]" />
      </span>
    ) : icon && (
      <span className="w-4 h-4 flex-shrink-0">{icon}</span>
    )}
    {!loading && children}
  </motion.button>
)

export default Button
