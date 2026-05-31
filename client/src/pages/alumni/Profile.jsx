import { useState, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { CheckCircle, ShieldAlert, KeyRound, User, Loader2, Sparkles, Award, Globe, Mail } from 'lucide-react'
import AppLayout from '../../components/layout/AppLayout'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import PageBanner from '../../components/ui/PageBanner'
import API from '../../api/axios'
import toast from 'react-hot-toast'
import { useAuth } from '../../hooks/useAuth'

const AVATAR_TEMPLATES = [
  { name: 'Alum Professional (Male)', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Nolan&clothing=blazerAndShirt&eyebrows=defaultNatural&eyes=default' },
  { name: 'Alum Professional (Female)', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Victoria&clothing=blazerAndShirt&eyebrows=defaultNatural&eyes=default' },
  { name: 'Alum Tech Lead (Male)', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mason&clothing=collarAndSweater&eyebrows=defaultNatural&eyes=happy' },
  { name: 'Alum Tech Lead (Female)', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Chloe&clothing=collarAndSweater&eyebrows=defaultNatural&eyes=happy' },
]

export default function AlumniProfile() {
  const { user: authUser, updateUser } = useAuth()
  const [activeTab, setActiveTab] = useState('profile')
  
  const user = authUser?.user || authUser || {}
  const [selectedAvatar, setSelectedAvatar] = useState(user.avatar || '')

  const { register: registerProfile, handleSubmit: handleSubmitProfile, reset: resetProfile, formState: { isSubmitting: isSubmittingProfile } } = useForm({
    defaultValues: {
      name: user.name || '',
      email: user.email || '',
      graduationYear: user.graduationYear || '',
      companyName: user.companyName || '',
      linkedinUrl: user.linkedinUrl || '',
    }
  })

  const { register: registerPassword, handleSubmit: handleSubmitPassword, reset: resetPassword, formState: { isSubmitting: isSubmittingPassword } } = useForm()

  useEffect(() => {
    resetProfile({
      name: user.name || '',
      email: user.email || '',
      graduationYear: user.graduationYear || '',
      companyName: user.companyName || '',
      linkedinUrl: user.linkedinUrl || '',
    })
    setSelectedAvatar(user.avatar || '')
  }, [user, resetProfile])

  const profileMut = useMutation({
    mutationFn: (data) => API.patch('/auth/update-profile', data),
    onSuccess: (res) => {
      toast.success('Alumni profile settings updated successfully! 🎉')
      if (res.data?.user) {
        updateUser({
          ...authUser,
          user: {
            ...(authUser?.user || authUser),
            name: res.data.user.name,
            avatar: res.data.user.avatar,
            graduationYear: res.data.user.graduationYear,
            companyName: res.data.user.companyName,
            linkedinUrl: res.data.user.linkedinUrl,
          }
        })
      }
    },
    onError: (e) => {
      toast.error(e.response?.data?.message || 'Failed to update profile')
    }
  })

  const passwordMut = useMutation({
    mutationFn: (data) => API.patch('/auth/change-password', data),
    onSuccess: () => {
      toast.success('Password changed successfully! 🔐')
      resetPassword()
    },
    onError: (e) => {
      toast.error(e.response?.data?.message || 'Failed to change password')
    }
  })

  const onProfileSubmit = (data) => {
    profileMut.mutate({ 
      name: data.name, 
      avatar: selectedAvatar,
      graduationYear: data.graduationYear,
      companyName: data.companyName,
      linkedinUrl: data.linkedinUrl
    })
  }

  const onPasswordSubmit = (data) => {
    if (data.newPassword !== data.confirmPassword) {
      return toast.error('Passwords do not match')
    }
    passwordMut.mutate({
      currentPassword: data.currentPassword,
      newPassword: data.newPassword
    })
  }

  return (
    <AppLayout title="My Profile" subtitle="Manage your alumni portal details">
      <div className="space-y-6">
        <PageBanner
          title="Alumni Profile Settings"
          subtitle="Manage your personal details, current corporate employer information, professional LinkedIn link, and avatar."
          badge="Alumni Profile"
          badgeColor="bg-sky-50 text-sky-700 border-sky-100"
          compact
          gradient="teal"
        />

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Column — Info Summary */}
          <div className="lg:w-1/3">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 flex flex-col items-center text-center">
              
              {/* Profile Avatar */}
              <div className="relative mb-5 w-28 h-28 rounded-full overflow-hidden border-4 border-teal-150 shadow-md bg-teal-50/50 flex items-center justify-center">
                {selectedAvatar ? (
                  <img src={selectedAvatar} alt="alum avatar" className="w-full h-full object-cover" />
                ) : (
                  <img src="/avatar_student.svg" alt="alum default" className="w-20 h-20 object-contain" />
                )}
              </div>

              <h2 className="text-xl font-bold text-slate-800 mb-1">{user.name}</h2>
              <p className="text-xs text-slate-400 mb-4">{user.email}</p>

              <div className="flex items-center gap-2 mb-6">
                <span className="bg-sky-50 text-sky-600 text-xs font-bold px-3 py-1 rounded-full capitalize">
                  Role: {user.role || 'Alumni'}
                </span>
                <span className="bg-slate-100 text-slate-500 text-xs font-bold px-3 py-1 rounded-full">
                  Grad: {user.graduationYear || 'N/A'}
                </span>
              </div>

              <div className="w-full bg-slate-50 rounded-2xl p-4 border border-slate-100 text-left space-y-2.5">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Corporate Details</p>
                <div className="flex justify-between items-center text-xs font-medium">
                  <span className="text-slate-500">Current Employer</span>
                  <span className="text-slate-800 font-bold">{user.companyName || 'Not Added'}</span>
                </div>
                <div className="flex justify-between items-center text-xs font-medium">
                  <span className="text-slate-500">LinkedIn Profile</span>
                  <span className="text-teal-600 font-bold max-w-[120px] truncate">
                    {user.linkedinUrl ? (
                      <a href={user.linkedinUrl} target="_blank" rel="noreferrer" className="underline hover:text-teal-700">View profile</a>
                    ) : 'None'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column — Tabs & Forms */}
          <div className="lg:w-2/3 bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-slate-100 px-2">
              <button
                type="button"
                onClick={() => setActiveTab('profile')}
                className={`px-6 py-4 text-sm font-bold transition-all border-b-2 flex items-center gap-2 ${
                  activeTab === 'profile'
                    ? 'border-teal-500 text-teal-600'
                    : 'border-transparent text-slate-400 hover:text-slate-700'
                }`}
              >
                <User className="w-4 h-4" /> Professional Profile
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('security')}
                className={`px-6 py-4 text-sm font-bold transition-all border-b-2 flex items-center gap-2 ${
                  activeTab === 'security'
                    ? 'border-teal-500 text-teal-600'
                    : 'border-transparent text-slate-400 hover:text-slate-700'
                }`}
              >
                <KeyRound className="w-4 h-4" /> Security Settings
              </button>
            </div>

            <div className="p-6">
              {/* Profile Details Form */}
              {activeTab === 'profile' && (
                <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                  <form onSubmit={handleSubmitProfile(onProfileSubmit)} className="space-y-5">
                    
                    <div className="grid md:grid-cols-2 gap-5">
                      <Input
                        label="Full Name"
                        placeholder="e.g. Nolan Carter"
                        {...registerProfile('name', { required: 'Name is required' })}
                      />
                      <Input
                        label="Email Address"
                        placeholder="alum@college.edu"
                        disabled
                        hint="Primary email address linked to your account."
                        {...registerProfile('email')}
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-5">
                      <Input
                        label="Current Corporate Employer"
                        placeholder="e.g. Google India"
                        {...registerProfile('companyName', { required: 'Company is required' })}
                      />
                      <Input
                        label="Graduation Year"
                        type="number"
                        placeholder="e.g. 2024"
                        {...registerProfile('graduationYear', { required: 'Graduation year is required' })}
                      />
                    </div>

                    <Input
                      label="LinkedIn Profile URL"
                      placeholder="https://linkedin.com/in/username"
                      {...registerProfile('linkedinUrl', { 
                        required: 'LinkedIn profile is required',
                        pattern: { value: /^https:\/\/[a-z]{2,3}\.linkedin\.com\/in\/.+/, message: 'Enter a valid LinkedIn profile URL' }
                      })}
                    />

                    {/* Avatar Selection Grid */}
                    <div className="space-y-3 pt-3 border-t border-slate-100">
                      <label className="text-xs font-bold text-slate-500 block">Choose Avatar Template</label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {AVATAR_TEMPLATES.map((avatar) => (
                          <button
                            key={avatar.name}
                            type="button"
                            onClick={() => setSelectedAvatar(avatar.url)}
                            className={`p-2.5 rounded-xl border flex flex-col items-center justify-center transition-all ${
                              selectedAvatar === avatar.url
                                ? 'border-teal-500 bg-teal-50/50 ring-2 ring-teal-500/20'
                                : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            <img src={avatar.url} alt={avatar.name} className="w-12 h-12 object-contain rounded-full bg-slate-50/50" />
                            <span className="text-[9px] text-slate-400 mt-1.5 font-bold text-center truncate w-full">
                              {avatar.name.split(' ')[2] || 'Avatar'}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-end pt-4 border-t border-slate-150">
                      <Button
                        type="submit"
                        loading={isSubmittingProfile || profileMut.isPending}
                      >
                        Save Profile Changes
                      </Button>
                    </div>
                  </form>
                </motion.div>
              )}

              {/* Change Password Form */}
              {activeTab === 'security' && (
                <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                  <div className="bg-amber-50 border border-amber-200/60 rounded-2xl p-4 flex items-start gap-3">
                    <ShieldAlert className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-800 font-medium leading-relaxed">
                      Make sure your new password is at least 6 characters long and contains a mix of letters, numbers, and symbols for high security.
                    </p>
                  </div>

                  <form onSubmit={handleSubmitPassword(onPasswordSubmit)} className="space-y-5">
                    <Input
                      label="Current Password"
                      type="password"
                      placeholder="••••••••"
                      {...registerPassword('currentPassword', { required: 'Current password is required' })}
                    />
                    <Input
                      label="New Password"
                      type="password"
                      placeholder="••••••••"
                      {...registerPassword('newPassword', { required: 'New password is required', minLength: { value: 6, message: 'Password must be at least 6 characters' } })}
                    />
                    <Input
                      label="Confirm New Password"
                      type="password"
                      placeholder="••••••••"
                      {...registerPassword('confirmPassword', { required: 'Please confirm your new password' })}
                    />

                    <div className="flex justify-end pt-4 border-t border-slate-150">
                      <Button
                        type="submit"
                        loading={isSubmittingPassword || passwordMut.isPending}
                      >
                        Change Password
                      </Button>
                    </div>
                  </form>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
