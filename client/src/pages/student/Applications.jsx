import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { 
  FileText, Building2, Calendar, MapPin, ChevronRight, 
  ExternalLink, Users, MessageSquare, CheckCircle, XCircle, Loader2 
} from 'lucide-react'
import AppLayout from '../../components/layout/AppLayout'
import { PageSpinner } from '../../components/ui/Spinner'
import Badge from '../../components/ui/Badge'
import PageBanner from '../../components/ui/PageBanner'
import API from '../../api/axios'
import toast from 'react-hot-toast'

export default function StudentApplications() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('campus')

  // Fetch campus applications
  const { data: campusData, isLoading: campusLoading } = useQuery({
    queryKey: ['student-applications'],
    queryFn: () => API.get('/applications/my').then(r => r.data)
  })

  // Fetch student's referral applications
  const { data: referralData, isLoading: referralsLoading } = useQuery({
    queryKey: ['student-referral-applications'],
    queryFn: () => API.get('/referrals/applications').then(r => r.data || [])
  })

  const apps = campusData?.applications || []
  const referrals = referralData?.applications || []

  // Messaging route starting helper
  const handleStartMessage = async (alumniId) => {
    try {
      await API.post('/chat/start', { targetUserId: alumniId })
      navigate('/student/messages')
      toast.success('Conversations directory updated!')
    } catch {
      toast.error('Failed to open chat with alumni')
    }
  }

  if (campusLoading || referralsLoading) return <AppLayout><PageSpinner /></AppLayout>

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-6">

        <PageBanner
          title="Applications &amp; Referrals"
          subtitle="Track your on-campus placement drives and off-campus alumni referral requests in one place."
          badge="Application Tracker"
          badgeColor="bg-orange-50 text-orange-700 border-orange-100"
          compact
        />

        {/* Tab Headers */}
        <div className="flex border-b border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('campus')}
            className={`px-6 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'campus'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            <Building2 className="w-4 h-4" /> Campus Drives ({apps.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('referrals')}
            className={`px-6 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'referrals'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            <Users className="w-4 h-4" /> Alumni Referrals ({referrals.length})
          </button>
        </div>

        {/* Tab Contents */}
        {activeTab === 'campus' ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Applied', value: apps.length, primary: true },
                { label: 'Shortlisted',   value: apps.filter(a => a.status === 'shortlisted').length, primary: false },
                { label: 'Interviews',    value: apps.filter(a => a.status === 'interview').length, primary: false },
                { label: 'Placed',        value: apps.filter(a => a.status === 'selected' || a.status === 'placed').length, primary: false }
              ].map(stat => (
                <div key={stat.label} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-slate-200 transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.primary ? 'bg-orange-50' : 'bg-slate-50'}`}>
                      <span className={`text-lg font-bold ${stat.primary ? 'text-orange-500' : 'text-slate-400'}`}>#</span>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                  <p className="text-sm text-slate-500 mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Applications List */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-orange-500" /> Application History
                </h2>
              </div>

              <div className="p-4">
                {apps.length === 0 ? (
                  <div className="py-20 text-center">
                    <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                      <FileText className="w-10 h-10 text-slate-300" />
                    </div>
                    <p className="text-xl font-bold text-slate-900 mb-2">No applications yet</p>
                    <p className="text-slate-500 font-medium">Head over to the jobs board to start applying.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <AnimatePresence>
                      {apps.map((app, i) => (
                        <motion.div
                          key={app._id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="group bg-white hover:border-orange-100 border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row gap-5 md:items-center"
                        >
                          {/* Left: Company & Role */}
                          <div className="flex items-center gap-5 flex-1">
                            <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shadow-sm shrink-0 group-hover:scale-105 transition-transform overflow-hidden p-1">
                              <img src="/icon_company.svg" alt={app.jobId?.companyName} className="w-full h-full object-contain" />
                            </div>
                            <div>
                              <h3 className="text-lg font-bold text-slate-900 leading-tight mb-1">
                                {app.jobId?.role}
                              </h3>
                              <div className="flex flex-wrap items-center gap-3 text-sm font-medium text-slate-500">
                                <span className="flex items-center gap-1.5 text-slate-700">
                                  <Building2 className="w-4 h-4" /> {app.jobId?.companyName}
                                </span>
                                <span className="hidden sm:block text-slate-300">•</span>
                                <span className="flex items-center gap-1.5">
                                  <MapPin className="w-4 h-4" /> {app.jobId?.location || 'Remote'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Right: Status & Actions */}
                          <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 pt-4 md:pt-0 border-white/50">
                            <div className="text-left md:text-right">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Current Status</p>
                              <Badge status={app.status} />
                            </div>
                            
                            <div className="text-left md:text-right hidden sm:block">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Applied On</p>
                              <p className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                                <Calendar className="w-4 h-4 text-slate-400" />
                                {new Date(app.createdAt).toLocaleDateString()}
                              </p>
                            </div>

                            <button 
                              onClick={() => navigate(`/student/applications/${app._id}/rounds`)}
                              className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 hover:bg-orange-500 hover:text-white flex items-center justify-center transition-all shadow-sm"
                            >
                              <ChevronRight className="w-5 h-5" />
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </div>

          </motion.div>
        ) : (
          // Referral Requests List
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
          >
            <div className="px-8 py-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-orange-500" /> Referral Requests Log
              </h2>
            </div>

            <div className="p-4">
              {referrals.length === 0 ? (
                <div className="py-20 text-center">
                  <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                    <Users className="w-10 h-10 text-slate-300" />
                  </div>
                  <p className="text-xl font-bold text-slate-900 mb-2">No referral requests yet</p>
                  <p className="text-slate-500 font-medium">Head over to the alumni network feed to ask for direct referrals.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {referrals.map((ref, idx) => {
                    const listing = ref.referralJobId || {}
                    const alum = listing.alumniId || {}

                    return (
                      <motion.div
                        key={ref._id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="p-5 border border-slate-100 bg-slate-50/50 rounded-2xl flex flex-col md:flex-row gap-5 items-start md:items-center justify-between"
                      >
                        {/* Left Info: Listing Role & Alumni Vouching details */}
                        <div className="flex-1 space-y-2.5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-600 font-black text-sm flex items-center justify-center">
                              {listing.companyName?.[0]?.toUpperCase() || 'R'}
                            </div>
                            <div>
                              <h3 className="text-sm font-bold text-slate-800 leading-none mb-1">
                                {listing.role}
                              </h3>
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                                {listing.companyName} • {listing.location || 'Remote'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
                            <span>Alumni Referrer:</span>
                            <span className="text-slate-700 font-bold">{alum.name || 'Alumni Partner'}</span>
                            {alum.companyName && <span className="text-[10px] text-slate-400 font-medium">({alum.companyName})</span>}
                          </div>

                          {/* Rejection / referred feedback log message */}
                          {ref.feedback && (
                            <div className="p-3 bg-white border border-slate-100 rounded-xl text-[11px] text-slate-600 leading-relaxed font-medium">
                              <span className="font-bold text-slate-800 block mb-0.5 text-[9px] uppercase tracking-wide">Alumni Feedback</span>
                              "{ref.feedback}"
                            </div>
                          )}
                        </div>

                        {/* Right Info: Status & Messaging Link */}
                        <div className="flex items-center justify-between w-full md:w-auto gap-6 border-t md:border-t-0 pt-4 md:pt-0 border-slate-100">
                          
                          <div className="text-left md:text-right shrink-0">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Status</p>
                            <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full border inline-flex items-center gap-1 ${
                              ref.status === 'referred'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                : ref.status === 'rejected'
                                ? 'bg-rose-50 text-rose-700 border-rose-100'
                                : 'bg-amber-50 text-amber-700 border-amber-100 animate-pulse'
                            }`}>
                              {ref.status === 'referred' ? <CheckCircle className="w-3.5 h-3.5" /> : ref.status === 'rejected' ? <XCircle className="w-3.5 h-3.5" /> : null}
                              {ref.status === 'referred' ? 'Referred' : ref.status === 'rejected' ? 'Declined' : 'Pending'}
                            </span>
                          </div>

                          <div className="text-left md:text-right hidden sm:block shrink-0">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Submitted On</p>
                            <p className="text-xs font-bold text-slate-700 leading-none">
                              {new Date(ref.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                          </div>

                          {alum._id && (
                            <button
                              type="button"
                              onClick={() => handleStartMessage(alum._id)}
                              className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 hover:bg-orange-500 hover:text-white flex items-center justify-center transition-all shadow-sm flex-shrink-0"
                              title="Message Alumni"
                            >
                              <MessageSquare className="w-4 h-4" />
                            </button>
                          )}

                        </div>

                      </motion.div>
                    )
                  })}
                </div>
              )}
            </div>

          </motion.div>
        )}

      </div>
    </AppLayout>
  )
}
