import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import Button from './Button'

const Modal = ({ open, onClose, title, children, footer, size = 'md' }) => {
  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          />

          {/* Modal */}
          <motion.div
            className={`relative w-full ${widths[size]} bg-white rounded-2xl shadow-xl border border-slate-100 flex flex-col max-h-[90vh]`}
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1,    opacity: 1, y: 0 }}
            exit={{   scale: 0.95, opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
          >
            {/* Header */}
            {title && (
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <h2 className="text-base font-bold text-slate-900">{title}</h2>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg p-1 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* Body */}
            <div className="px-6 py-5 overflow-y-auto flex-1">{children}</div>

            {/* Footer */}
            {footer && (
              <div className="px-6 py-4 border-t border-slate-100 flex gap-3 justify-end">
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default Modal
