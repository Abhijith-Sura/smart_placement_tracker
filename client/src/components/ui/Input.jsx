import { forwardRef, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { motion } from 'framer-motion'
import { tw } from '../../lib/tw'

const Input = forwardRef(({
  label, error, hint, required, icon: Icon,
  type = 'text', className = '', wrapperClassName = '', ...props
}, ref) => {
  const [showPass, setShowPass]   = useState(false)
  const [focused, setFocused]     = useState(false)
  const isPassword = type === 'password'
  const inputType  = isPassword ? (showPass ? 'text' : 'password') : type

  return (
    <div className={`flex flex-col gap-1.5 ${wrapperClassName}`}>
      {label && (
        <label className={tw.label}>
          {label}
          {required && <span className="text-orange-500 ml-0.5">*</span>}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <Icon
            className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none transition-colors duration-200 ${
              focused ? 'text-orange-500' : error ? 'text-red-400' : 'text-slate-400'
            }`}
          />
        )}
        <input
          ref={ref}
          type={inputType}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className={`
            ${tw.input}
            ${Icon ? 'pl-10' : ''}
            ${isPassword ? 'pr-10' : ''}
            ${error ? tw.inputError : ''}
            ${className}
          `}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPass(v => !v)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-orange-500 transition-colors duration-200"
          >
            {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs text-red-500 font-semibold flex items-center gap-1"
        >
          <span className="w-1 h-1 bg-red-500 rounded-full" />
          {error}
        </motion.p>
      )}
      {hint && !error && <p className="text-xs text-slate-400 font-medium">{hint}</p>}
    </div>
  )
})

Input.displayName = 'Input'
export default Input
