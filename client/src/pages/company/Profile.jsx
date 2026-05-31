import { useEffect, useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { Building2, Globe, Mail, MapPin, CheckCircle, Phone, User, FileText, Upload, Loader2 } from 'lucide-react'
import AppLayout from '../../components/layout/AppLayout'
import { PageSpinner } from '../../components/ui/Spinner'
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

const INDUSTRIES = [
  'IT & Software', 'Banking & Finance', 'Manufacturing',
  'Consulting', 'Healthcare', 'E-Commerce', 'Telecom',
  'FMCG', 'Education', 'Government', 'Other'
]

export default function CompanyProfile() {
  const qc = useQueryClient()
  const { user, updateUser } = useAuth()
  const [activeTab, setActiveTab] = useState('profile')
  const [slackWebhook, setSlackWebhook] = useState(user?.user?.slackWebhook || user?.slackWebhook || '')
  const [isTestingWebhook, setIsTestingWebhook] = useState(false)
  const [isSavingWebhook, setIsSavingWebhook] = useState(false)

  useEffect(() => {
    if (user) {
      setSlackWebhook(user.user?.slackWebhook || user.slackWebhook || '')
    }
  }, [user])

  const handleSaveWebhook = async () => {
    if (slackWebhook && !slackWebhook.startsWith('https://hooks.slack.com/services/')) {
      return toast.error('Invalid URL. Must start with https://hooks.slack.com/services/')
    }
    setIsSavingWebhook(true)
    try {
      const res = await API.patch('/auth/update-profile', { slackWebhook })
      if (res.data?.user) {
        updateUser({
          ...user,
          user: {
            ...(user?.user || user),
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
  const fileRef = useRef()

  const [logoUploading, setLogoUploading] = useState(false)

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm()

  // Fetch actual company profile from backend
  const { data: profileData, isLoading } = useQuery({
    queryKey: ['company-profile'],
    queryFn: () => API.get('/companies/profile').then(r => r.data.company),
  })

  // Prefill form when data is loaded
  useEffect(() => {
    if (profileData) {
      reset({
        companyName: profileData.companyName || '',
        website: profileData.website || '',
        industry: profileData.industry || 'IT & Software',
        description: profileData.description || '',
        hrName: profileData.hrName || '',
        hrContact: profileData.hrContact || '',
        address: profileData.address || '',
      })
    }
  }, [profileData, reset])

  // Profile update mutation
  const profileMut = useMutation({
    mutationFn: (d) => API.patch('/companies/profile', d).then(r => r.data.company),
    onSuccess: (updatedCompany) => { 
      qc.setQueryData(['company-profile'], updatedCompany)
      // Update global auth user context logo and info
      updateUser({ 
        ...user, 
        user: { 
          ...(user?.user || user), 
          companyName: updatedCompany.companyName,
          website: updatedCompany.website,
          avatar: updatedCompany.logoUrl
        } 
      })
      toast.success('Company profile updated successfully! 🎉') 
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to update profile')
    }
  })

  // Logo upload mutation
  const handleLogoUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    const formData = new FormData()
    formData.append('logo', file)

    setLogoUploading(true)
    try {
      const { data } = await API.post('/companies/upload-logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      // Update local query state
      qc.setQueryData(['company-profile'], (prev) => ({ ...prev, logoUrl: data.logoUrl }))
      
      // Update global context
      updateUser({ 
        ...user, 
        user: { 
          ...(user?.user || user), 
          avatar: data.logoUrl
        } 
      })

      toast.success('Corporate logo uploaded!')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Logo upload failed')
    } finally {
      setLogoUploading(false)
    }
  }

  const onSubmit = (d) => profileMut.mutate(d)

  if (isLoading) return <AppLayout title="Profile"><PageSpinner /></AppLayout>

  const company = profileData || {}
  const initials = (company.companyName?.[0] || user?.user?.name?.[0] || 'C').toUpperCase()

  return (
    <AppLayout title="Company Profile" subtitle="Manage your corporate identity and recruiter profile">
      <div className="space-y-6">

        <PageBanner
          title="Company Profile"
          subtitle="Update your corporate identity, HR contact details, and company description for students to discover."
          badge="Company Profile"
          badgeColor="bg-sky-50 text-sky-700 border-sky-100"
          compact
          gradient="teal"
        />

        <div className="flex flex-col lg:flex-row gap-6 max-w-5xl">
 
        {/* Left Column — Corporate ID Card */}
        <div className="lg:w-1/3 space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col items-center text-center">
            
            <div className="relative mb-5 group cursor-pointer" onClick={() => fileRef.current?.click()}>
              {company.logoUrl ? (
                <img 
                  src={company.logoUrl} 
                  alt="Logo" 
                  className="w-28 h-28 rounded-3xl object-cover border border-slate-100 shadow-md group-hover:opacity-75 transition-opacity" 
                />
              ) : (
                <div className="w-28 h-28 bg-white rounded-3xl flex items-center justify-center border border-slate-200 shadow-inner group-hover:bg-slate-50 transition-colors overflow-hidden p-4">
                  <img src="/icon_company.svg" alt="company" className="w-full h-full object-contain" />
                </div>
              )}
              
              {/* Upload Hover Overlay */}
              <div className="absolute inset-0 flex items-center justify-center rounded-3xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                {logoUploading ? (
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                ) : (
                  <Upload className="w-6 h-6 text-white" />
                )}
              </div>

              {company.isVerified && (
                <div className="absolute -bottom-2 -right-2 bg-green-500 text-white p-2 rounded-xl border-4 border-white shadow-sm" title="Verified Recruiter Profile">
                  <CheckCircle className="w-5 h-5" />
                </div>
              )}
              
              <input 
                ref={fileRef} 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={handleLogoUpload} 
                disabled={logoUploading}
              />
            </div>

            <h2 className="text-xl font-bold text-slate-900 mb-1 leading-tight">
              {company.companyName || 'Company Name'}
            </h2>
            <p className="text-xs text-slate-500 font-bold tracking-widest uppercase mb-1">{company.industry}</p>
            <p className="text-sm text-slate-500 mb-4">{user?.user?.email}</p>

            <div className="w-full bg-slate-50 rounded-2xl p-4 border border-slate-100 text-left space-y-3">
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <Globe className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span className="truncate">{company.website || 'No website added'}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span className="truncate">{company.address || 'No headquarters listed'}</span>
              </div>
            </div>

          </div>
        </div>

        {/* Right Column — Profile Editor Forms */}
        <div className="lg:w-2/3 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
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
              <User className="w-4 h-4" /> Corporate Profile
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('integrations')}
              className={`px-6 py-4 text-sm font-bold transition-all border-b-2 flex items-center gap-2 ${
                activeTab === 'integrations'
                  ? 'border-teal-500 text-teal-600'
                  : 'border-transparent text-slate-400 hover:text-slate-700'
              }`}
            >
              <SlackIcon className="w-4 h-4" /> Slack Integration
            </button>
          </div>

          <div className="p-6">
            {activeTab === 'profile' && (
              <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }}>
                <h3 className="text-lg font-bold text-slate-900 mb-6">Corporate Information Profile</h3>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              
              <div className="grid md:grid-cols-2 gap-5">
                <Input 
                  label="Company Name" 
                  placeholder="e.g. Google LLC" 
                  required
                  {...register('companyName', { required: 'Company name is required' })} 
                />
                
                <div className="flex flex-col">
                  <label className="text-xs font-semibold text-slate-500 mb-1.5 pl-1">Industry Sector</label>
                  <select 
                    {...register('industry')}
                    className="text-sm border border-slate-200 rounded-xl px-3.5 py-3.5 bg-slate-50 text-slate-700 outline-none focus:border-teal-400 focus:bg-white transition-all cursor-pointer"
                  >
                    {INDUSTRIES.map(ind => (
                      <option key={ind} value={ind}>{ind}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-5">
                <Input 
                  label="Website Link" 
                  placeholder="e.g. www.google.com" 
                  icon={Globe} 
                  {...register('website')} 
                />
                <Input 
                  label="Corporate Address / HQ" 
                  placeholder="e.g. Mountain View, CA" 
                  icon={MapPin} 
                  {...register('address')} 
                />
              </div>

              <div className="grid md:grid-cols-2 gap-5 border-t border-slate-100 pt-5">
                <Input 
                  label="HR Representative Name" 
                  placeholder="e.g. John Doe" 
                  icon={User} 
                  {...register('hrName')} 
                />
                <Input 
                  label="HR Contact Number" 
                  placeholder="e.g. +91 9999999999" 
                  icon={Phone} 
                  {...register('hrContact')} 
                />
              </div>

              <div className="flex flex-col border-t border-slate-100 pt-5">
                <label className="text-xs font-semibold text-slate-500 mb-1.5 pl-1">Corporate Description</label>
                <textarea 
                  placeholder="Briefly describe your company's mission, values, and tech stack..."
                  rows={4}
                  {...register('description')}
                  className="text-sm border border-slate-200 rounded-2xl px-4 py-3.5 bg-slate-50 text-slate-700 outline-none focus:border-teal-400 focus:bg-white transition-all resize-none leading-relaxed"
                />
              </div>

              {/* Form Footer */}
              <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
                <Button 
                  type="submit" 
                  loading={profileMut.isPending || isSubmitting}
                >
                  Save Corporate Profile
                </Button>
              </div>

            </form>
          </motion.div>
        )}

        {activeTab === 'integrations' && (
          <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-5 flex items-start gap-4">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center border border-slate-200 shadow-sm flex-shrink-0">
                <SlackIcon className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800 mb-1">Slack Booking Alerts Channel</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Connect a Slack Incoming Webhook to automatically post notifications to your team when candidates schedule or book interview slots.
                  To create one, go to the <a href="https://api.slack.com/apps" target="_blank" rel="noreferrer" className="text-teal-600 font-bold underline hover:text-teal-700">Slack App Console</a>, create an Incoming Webhook, and link it to your target channel.
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
                  className="w-full text-sm border border-slate-200 rounded-xl px-4 py-3.5 bg-slate-50 text-slate-800 outline-none focus:border-teal-400 focus:bg-white transition-all font-mono placeholder:font-sans placeholder:text-slate-400"
                />
                <span className="text-[10px] text-slate-400 mt-1.5 pl-1">
                  Format: https://hooks.slack.com/services/...
                </span>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-slate-100 justify-end">
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
                  className="bg-teal-600 hover:bg-teal-700 text-white shadow-md px-6 py-2.5"
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
