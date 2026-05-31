import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { CheckCircle, ShieldAlert, KeyRound, User, Loader2, Sparkles, Award } from 'lucide-react'
import AppLayout from '../../components/layout/AppLayout'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import PageBanner from '../../components/ui/PageBanner'
import API from '../../api/axios'
import toast from 'react-hot-toast'
import { useAuth } from '../../hooks/useAuth'

const SlackIcon = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 54 54" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path fill="#36C5F0" d="M19.7 19.7c0 2.2-1.8 4-4 4s-4-1.8-4-4 1.8-4 4-4h4v4zm0 4v8c0 2.2-1.8 4-4 4s-4-1.8-4-4 1.8-4 4-4h4z"/>
    <path fill="#2EB67D" d="M19.7 34.3c-2.2 0-4-1.8-4-4s1.8-4 4-4 4 1.8 4 4v4zm-4 0h-8c-2.2 0-4-1.8-4-4s1.8-4 4-4 4 1.8 4 4v4z"/>
    <path fill="#ECB22E" d="M34.3 34.3c0-2.2 1.8-4 4-4s4 1.8 4 4-1.8 4-4 4h-4v-4zm0-4v-8c0-2.2 1.8-4 4-4s4 1.8 4 4-1.8 4-4 4h-4z"/>
    <path fill="#E01E5A" d="M34.3 19.7c2.2 0 4 1.8 4 4s-1.8 4-4 4-4-1.8-4-4v-4zm4 0h8c2.2 0 4 1.8 4 4s-1.8 4-4 4-4-1.8-4-4v-4z"/>
  </svg>
)

const AVATAR_TEMPLATES = [
  { name: 'Admin Professional (Male)', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jack&clothing=blazerAndShirt&eyebrows=defaultNatural&eyes=default' },
  { name: 'Admin Professional (Female)', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lilly&clothing=blazerAndShirt&eyebrows=defaultNatural&eyes=default' },
  { name: 'TPO Director (Male)', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Oliver&clothing=blazerAndShirt&eyebrows=defaultNatural&eyes=default' },
  { name: 'TPO Director (Female)', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sophia&clothing=blazerAndShirt&eyebrows=defaultNatural&eyes=default' },
  { name: 'TPO Officer (Male)', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&clothing=collarAndSweater&eyebrows=defaultNatural&eyes=happy' },
  { name: 'TPO Officer (Female)', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka&clothing=collarAndSweater&eyebrows=defaultNatural&eyes=happy' },
]

export default function AdminProfile() {
  const { user: authUser, updateUser } = useAuth()
  const [activeTab, setActiveTab] = useState('profile')
  
  const user = authUser?.user || authUser || {}
  const [selectedAvatar, setSelectedAvatar] = useState(user.avatar || '')
  const [slackWebhook, setSlackWebhook] = useState(user.slackWebhook || '')
  const [isTestingWebhook, setIsTestingWebhook] = useState(false)
  const [isSavingWebhook, setIsSavingWebhook] = useState(false)

  const handleSaveWebhook = async () => {
    if (slackWebhook && !slackWebhook.startsWith('https://hooks.slack.com/services/')) {
      return toast.error('Invalid URL. Must start with https://hooks.slack.com/services/')
    }
    setIsSavingWebhook(true)
    try {
      const res = await API.patch('/auth/update-profile', { slackWebhook })
      if (res.data?.user) {
        updateUser({
          ...authUser,
          user: {
            ...(authUser?.user || authUser),
            slackWebhook: res.data.user.slackWebhook,
          }
        })
      }
      toast.success('Slack Integration settings updated! 🚀')
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to update Integration')
    } finally {
      setIsSavingWebhook(false)
    }
  }

  const handleTestWebhook = async () => {
    if (!slackWebhook) {
      return toast.error('Please configure and save a Slack Webhook URL first.')
    }
    if (!slackWebhook.startsWith('https://hooks.slack.com/services/')) {
      return toast.error('Invalid URL. Must start with https://hooks.slack.com/services/')
    }
    setIsTestingWebhook(true)
    try {
      await API.post('/auth/test-webhook', { webhookUrl: slackWebhook })
      toast.success('Test payload sent to Slack! Check your channel. 🔔')
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to trigger Slack test alert')
    } finally {
      setIsTestingWebhook(false)
    }
  }

  const { register: registerProfile, handleSubmit: handleSubmitProfile, reset: resetProfile, formState: { isSubmitting: isSubmittingProfile } } = useForm({
    defaultValues: {
      name: user.name || '',
      email: user.email || '',
    }
  })

  const { register: registerPassword, handleSubmit: handleSubmitPassword, reset: resetPassword, formState: { isSubmitting: isSubmittingPassword } } = useForm()

  useEffect(() => {
    resetProfile({
      name: user.name || '',
      email: user.email || '',
    })
    setSelectedAvatar(user.avatar || '')
    setSlackWebhook(user.slackWebhook || '')
  }, [user, resetProfile])

  const profileMut = useMutation({
    mutationFn: (data) => API.patch('/auth/update-profile', data),
    onSuccess: (res) => {
      toast.success('Profile updated successfully! 🎉')
      if (res.data?.user) {
        updateUser({
          user: {
            ...(authUser?.user || authUser),
            name: res.data.user.name,
            avatar: res.data.user.avatar,
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
    profileMut.mutate({ name: data.name, avatar: selectedAvatar })
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
    <AppLayout title="My Profile" subtitle="Manage your administrator settings">
      <div className="space-y-6">
        <PageBanner
          title="TPO Admin Profile"
          subtitle="Manage your personal TPO profile details, change security settings, and customize your portal avatar."
          badge="Admin Profile"
          badgeColor="bg-violet-50 text-violet-700 border-violet-100"
          compact
          gradient="violet"
        />

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Column — Info Summary */}
          <div className="lg:w-1/3">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 flex flex-col items-center text-center">
              
              {/* Profile Avatar */}
              <div className="relative mb-5 w-28 h-28 rounded-full overflow-hidden border-4 border-violet-150 shadow-md bg-violet-50/50 flex items-center justify-center">
                {selectedAvatar ? (
                  <img src={selectedAvatar} alt="admin avatar" className="w-full h-full object-cover" />
                ) : (
                  <img src="/avatar_admin.svg" alt="admin" className="w-20 h-20 object-contain" />
                )}
              </div>

              <h2 className="text-xl font-semibold text-slate-800 mb-1">{user.name}</h2>
              <p className="text-sm text-slate-400 mb-4">{user.email}</p>

              <div className="flex items-center gap-2 mb-6">
                <span className="bg-violet-50 text-violet-600 text-xs font-bold px-3 py-1 rounded-full capitalize">
                  Role: {user.role || 'Admin'}
                </span>
                <span className="bg-slate-100 text-slate-500 text-xs font-bold px-3 py-1 rounded-full">
                  ID: TPO-ADM
                </span>
              </div>

              <div className="w-full bg-slate-50 rounded-2xl p-4 border border-slate-100 text-left space-y-2.5">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Account Info</p>
                <div className="flex justify-between items-center text-xs font-medium">
                  <span className="text-slate-500">Status</span>
                  <span className="text-emerald-600 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> Active
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs font-medium">
                  <span className="text-slate-500">Privileges</span>
                  <span className="text-violet-600 font-bold">Super Admin</span>
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
                    ? 'border-violet-600 text-violet-700'
                    : 'border-transparent text-slate-400 hover:text-slate-700'
                }`}
              >
                <User className="w-4 h-4" /> Personal Profile
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('security')}
                className={`px-6 py-4 text-sm font-bold transition-all border-b-2 flex items-center gap-2 ${
                  activeTab === 'security'
                    ? 'border-violet-600 text-violet-700'
                    : 'border-transparent text-slate-400 hover:text-slate-700'
                }`}
              >
                <KeyRound className="w-4 h-4" /> Security Settings
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('integrations')}
                className={`px-6 py-4 text-sm font-bold transition-all border-b-2 flex items-center gap-2 ${
                  activeTab === 'integrations'
                    ? 'border-violet-600 text-violet-700'
                    : 'border-transparent text-slate-400 hover:text-slate-700'
                }`}
              >
                <SlackIcon className="w-4 h-4" /> Slack Integration
              </button>
            </div>

            <div className="p-6">
              {/* Profile Details Form */}
              {activeTab === 'profile' && (
                <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                  <form onSubmit={handleSubmitProfile(onProfileSubmit)} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-5">
                      <Input
                        label="Full Name"
                        placeholder="John Doe"
                        {...registerProfile('name', { required: 'Name is required' })}
                      />
                      <Input
                        label="Email Address"
                        placeholder="admin@placeiq.com"
                        disabled
                        hint="Contact system administrator to request email modifications."
                        {...registerProfile('email')}
                      />
                    </div>

                    {/* Avatar Selection Grid */}
                    <div className="space-y-3">
                      <label className="text-sm font-semibold text-slate-700 block">Choose Avatar Template</label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                        {AVATAR_TEMPLATES.map((avatar) => (
                          <button
                            key={avatar.name}
                            type="button"
                            onClick={() => setSelectedAvatar(avatar.url)}
                            className={`p-2.5 rounded-xl border flex flex-col items-center justify-center transition-all ${
                              selectedAvatar === avatar.url
                                ? 'border-violet-500 bg-violet-50/50 ring-2 ring-violet-500/20'
                                : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            <img src={avatar.url} alt={avatar.name} className="w-12 h-12 object-contain rounded-full" />
                            <span className="text-[9px] text-slate-400 mt-1.5 font-semibold text-center truncate w-full">
                              {avatar.name.split(' ')[1] || 'Avatar'}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-end pt-4 border-t border-slate-150">
                      <Button
                        type="submit"
                        loading={isSubmittingProfile || profileMut.isPending}
                        className="bg-violet-600 hover:bg-violet-700 text-white shadow-md"
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
                        className="bg-violet-600 hover:bg-violet-700 text-white shadow-md"
                      >
                        Change Password
                      </Button>
                    </div>
                  </form>
                </motion.div>
              )}

              {/* Integrations Tab */}
              {activeTab === 'integrations' && (
                <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                  <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-5 flex items-start gap-4">
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center border border-slate-200 shadow-sm flex-shrink-0">
                      <SlackIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 mb-1">Slack Incoming Webhook Alert Channel</h4>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Connect a Slack Incoming Webhook to automatically post alerts when new campus drives are scheduled or approved. 
                        To create one, go to the <a href="https://api.slack.com/apps" target="_blank" rel="noreferrer" className="text-violet-600 font-bold underline hover:text-violet-700">Slack App Console</a>, create an Incoming Webhook, and link it to your target channel.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-5">
                    <div className="flex flex-col">
                      <label className="text-xs font-bold text-slate-500 mb-1.5 pl-1">Slack Webhook URL</label>
                      <input
                        type="url"
                        placeholder="Paste your Slack webhook URL here"
                        value={slackWebhook}
                        onChange={(e) => setSlackWebhook(e.target.value)}
                        className="w-full text-sm border border-slate-200 rounded-xl px-4 py-3.5 bg-slate-50 text-slate-800 outline-none focus:border-violet-500 focus:bg-white transition-all font-mono placeholder:font-sans placeholder:text-slate-400"
                      />
                      <span className="text-[10px] text-slate-400 mt-1.5 pl-1">
                        Format: https://hooks.slack.com/services/...
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-100 justify-end">
                      <button
                        type="button"
                        onClick={handleTestWebhook}
                        disabled={isTestingWebhook || isSavingWebhook || !slackWebhook}
                        className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-sm font-bold shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50 transition-colors"
                      >
                        {isTestingWebhook ? <Loader2 className="w-4 h-4 animate-spin text-slate-500" /> : null}
                        Send Test Alert
                      </button>
                      
                      <Button
                        onClick={handleSaveWebhook}
                        loading={isSavingWebhook}
                        disabled={isTestingWebhook}
                        className="bg-violet-600 hover:bg-violet-700 text-white shadow-md px-6 py-2.5"
                      >
                        Save Integration
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
