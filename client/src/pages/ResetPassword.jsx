import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { Lock, CheckCircle } from 'lucide-react'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import API from '../api/axios'
import toast from 'react-hot-toast'
import PlaceIQLogo from '../components/ui/PlaceIQLogo'

const ResetPassword = () => {
  const { token } = useParams()
  const navigate = useNavigate()
  const [success, setSuccess] = useState(false)
  
  const { register, handleSubmit, formState: { errors, isSubmitting }, watch } = useForm()

  const onSubmit = async (data) => {
    try {
      const res = await API.post(`/auth/reset-password/${token}`, { password: data.password })
      toast.success(res.data.message || 'Password reset successfully!')
      setSuccess(true)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset password')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8 font-sans relative overflow-hidden bg-gradient-to-br from-orange-500 via-orange-600 to-amber-600">
      {/* Subtle dot pattern */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.06] pointer-events-none" xmlns="http://www.w3.org/2000/svg">
        <defs><pattern id="rdots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.5" fill="#ffffff" /></pattern></defs>
        <rect width="100%" height="100%" fill="url(#rdots)" />
      </svg>
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-white/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-black/10 blur-3xl pointer-events-none" />

      <motion.div className="w-full max-w-md relative z-10" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: "easeOut" }}>
        
        <div className="flex flex-col items-center gap-3 mb-10">
          <Link to="/" className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-xl">
              <PlaceIQLogo size={36} color="#f97316" />
            </div>
            <span className="text-3xl font-bold text-white tracking-tight">PlaceIQ</span>
          </Link>
        </div>

        <div className="bg-white rounded-3xl shadow-[0_8px_40px_rgba(15,23,42,0.15)] border border-white/50 p-10 text-center relative overflow-hidden">
          
          {success ? (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
              <div className="w-20 h-20 bg-green-50 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner">
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
              <h1 className="text-3xl font-bold text-slate-900 mb-3 tracking-tight">Password Reset!</h1>
              <p className="text-slate-500 text-sm mb-8 leading-relaxed font-medium">Your password has been successfully updated. You can now securely log in to your account.</p>
              <Link to="/login">
                <Button className="w-full h-12 text-lg rounded-xl bg-orange-500 hover:bg-orange-600 shadow-xl shadow-orange-500/20 text-white transition-all hover:-translate-y-0.5">
                  Go to Login
                </Button>
              </Link>
            </motion.div>
          ) : (
            <>
              <h1 className="text-3xl font-bold text-slate-900 mb-3 tracking-tight">Create New Password</h1>
              <p className="text-slate-500 text-sm mb-8 leading-relaxed font-medium">Your new password must be different from previous used passwords.</p>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 text-left">
                <Input label="New Password" type="password" icon={Lock} placeholder="••••••••" required
                  error={errors.password?.message}
                  {...register('password', { required: 'Password is required', minLength: { value: 6, message: 'Min 6 characters' } })} />
                
                <Input label="Confirm New Password" type="password" icon={Lock} placeholder="••••••••" required
                  error={errors.confirmPassword?.message}
                  {...register('confirmPassword', {
                    required: 'Please confirm password',
                    validate: val => val === watch('password') || 'Passwords do not match',
                  })} />

                <Button type="submit" className="w-full h-12 text-lg rounded-xl bg-orange-500 hover:bg-orange-600 shadow-xl shadow-orange-500/20 text-white transition-all hover:-translate-y-0.5 mt-2" loading={isSubmitting}>
                  Reset Password
                </Button>
              </form>
            </>
          )}

        </div>
      </motion.div>
    </div>
  )
}

export default ResetPassword
