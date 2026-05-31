import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { 
  Briefcase, Users, FileText, CheckCircle, XCircle, 
  MessageSquare, Loader2, ArrowUpRight, GraduationCap,
  ExternalLink, ChevronRight, HelpCircle
} from 'lucide-react'
import PageBanner from '../../components/ui/PageBanner'
import { PageSpinner } from '../../components/ui/Spinner'
import API from '../../api/axios'
import toast from 'react-hot-toast'
import { useAuth } from '../../hooks/useAuth'

export default function AlumniDashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const qc = useQueryClient()
  
  const [selectedApp, setSelectedApp] = useState(null)
  const [feedback, setFeedback] = useState('')
  const [updatingId, setUpdatingId] = useState(null)

  const myId = user?.user?._id || user?._id || ''
  const myName = user?.user?.name || user?.name || 'Alum'

  // Fetch alumni statistics & listings
  const { data: listingsData, isLoading: listingsLoading } = useQuery({
    queryKey: ['alumni-listings'],
    queryFn: () => API.get('/referrals/my-posts').then(r => r.data.listings || []),
  })

  // Fetch referral applications
  const { data: applications, isLoading: appsLoading } = useQuery({
    queryKey: ['alumni-applications'],
    queryFn: () => API.get('/referrals/applications').then(r => r.data.applications || []),
  })

  // Update status mutation
  const statusMut = useMutation({
    mutationFn: ({ appId, status, feedback }) => 
      API.patch(`/referrals/applications/${appId}`, { status, feedback }),
    onSuccess: (res) => {
      toast.success(res.data.message || 'Status updated successfully!')
      qc.invalidateQueries(['alumni-applications'])
      qc.invalidateQueries(['alumni-listings'])
      setSelectedApp(null)
      setFeedback('')
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to update application status')
    },
    onSettled: () => {
      setUpdatingId(null)
    }
  })

  const handleUpdateStatus = (appId, status, reviewFeedback = '') => {
    setUpdatingId(appId)
    statusMut.mutate({ appId, status, feedback: reviewFeedback })
  }

  // Messaging route starting helper
  const handleStartMessage = async (studentId) => {
    try {
      await API.post('/chat/start', { targetUserId: studentId })
      navigate('/alumni/messages')
      toast.success('Conversations directory updated!')
    } catch {
      toast.error('Failed to open chat with candidate')
    }
  }

  if (listingsLoading || appsLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <PageSpinner />
      </div>
    )
  }

  // Calculate quick summary metrics
  const activePosts = listingsData?.filter(l => l.status === 'open')?.length || 0
  const pendingApps = applications?.filter(a => a.status === 'pending') || []
  const totalReferred = applications?.filter(a => a.status === 'referred')?.length || 0
  const totalRejected = applications?.filter(a => a.status === 'rejected')?.length || 0

  return (
    <div className="space-y-6">
      <PageBanner
        title={`Welcome back, ${myName}!`}
        subtitle="Manage your active job referral listings, evaluate student resume requests, and help guide campus talent."
        badge="Alumni Portal"
        badgeColor="bg-sky-50 text-sky-700 border-sky-100"
        compact
        gradient="teal"
      />

      {/* Quick Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Metric 1 */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Active Referrals</span>
            <span className="text-2xl font-black text-slate-800">{activePosts}</span>
            <span className="text-[10px] text-emerald-600 font-bold block mt-1">Open Listings</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600">
            <Briefcase className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Pending Requests</span>
            <span className="text-2xl font-black text-slate-800">{pendingApps.length}</span>
            <span className="text-[10px] text-amber-600 font-bold block mt-1">Awaiting Review</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
            <FileText className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Total Referred</span>
            <span className="text-2xl font-black text-slate-800">{totalReferred}</span>
            <span className="text-[10px] text-emerald-600 font-bold block mt-1">Referred to Company</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Declined</span>
            <span className="text-2xl font-black text-slate-800">{totalRejected}</span>
            <span className="text-[10px] text-rose-600 font-bold block mt-1">Requests Declined</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
            <XCircle className="w-6 h-6" />
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Pending Application Reviews */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Pending Referral Requests</h3>
                <p className="text-xs text-slate-400 font-medium">Evaluate candidate submissions and mark status updates</p>
              </div>
              <span className="bg-amber-50 text-amber-700 text-[10px] font-bold px-2.5 py-1 rounded-full border border-amber-100">
                {pendingApps.length} review pending
              </span>
            </div>

            {pendingApps.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="w-6 h-6 text-slate-300" />
                </div>
                <h4 className="text-xs font-bold text-slate-600 mb-0.5">Inbox is clean!</h4>
                <p className="text-[10px] text-slate-400 max-w-[240px] mx-auto leading-relaxed">
                  No pending student applications are awaiting your review.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingApps.map((app) => (
                  <div key={app._id} className="p-4 border border-slate-100 bg-slate-50/50 rounded-xl space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-600 font-black text-sm flex items-center justify-center flex-shrink-0">
                          {app.studentId?.name?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-800">{app.studentId?.name}</h4>
                          <span className="text-[10px] font-bold text-slate-400">{app.studentId?.email}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="bg-sky-50 text-sky-700 text-[9px] font-bold px-2 py-0.5 rounded-full border border-sky-100 block w-fit ml-auto">
                          {app.referralJobId?.companyName}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 mt-1 block">
                          Role: {app.referralJobId?.role}
                        </span>
                      </div>
                    </div>

                    {app.coverNote && (
                      <div className="p-3 bg-white border border-slate-100 rounded-lg text-[11px] text-slate-600 leading-relaxed font-medium">
                        <span className="font-bold text-slate-800 block mb-0.5 text-[10px] uppercase tracking-wide">Candidate Note</span>
                        "{app.coverNote}"
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100">
                      
                      {/* Document Download Link */}
                      <a
                        href={app.resumeUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-600 hover:text-slate-800 transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5 text-rose-500" />
                        View PDF Resume <ExternalLink className="w-3 h-3 text-slate-400" />
                      </a>

                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button
                          type="button"
                          onClick={() => handleStartMessage(app.studentId?._id)}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[10px] font-bold text-slate-600 flex items-center gap-1 transition-all"
                        >
                          <MessageSquare className="w-3 h-3" /> Chat
                        </button>
                        
                        <button
                          type="button"
                          disabled={updatingId === app._id}
                          onClick={() => {
                            setSelectedApp(app)
                            setFeedback('')
                          }}
                          className="px-3 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-[10px] font-bold shadow-sm shadow-rose-500/10 flex items-center gap-1 transition-all disabled:opacity-50"
                        >
                          <XCircle className="w-3 h-3" /> Decline
                        </button>

                        <button
                          type="button"
                          disabled={updatingId === app._id}
                          onClick={() => handleUpdateStatus(app._id, 'referred')}
                          className="px-3.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-[10px] font-bold shadow-sm shadow-teal-500/10 flex items-center gap-1 transition-all disabled:opacity-50"
                        >
                          {updatingId === app._id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <CheckCircle className="w-3 h-3" />
                          )}
                          Mark Referred
                        </button>
                      </div>

                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        </div>

        {/* Right Side: Active Referral Listings List */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800">My Referral Listings</h3>
                <p className="text-[10px] text-slate-400 font-medium">Quick link to manage your job posts</p>
              </div>
              <Link
                to="/alumni/referrals"
                className="text-[10px] font-bold text-teal-600 hover:underline flex items-center gap-0.5"
              >
                Manage <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-2">
              {listingsData?.length === 0 ? (
                <div className="text-center py-6 border border-dashed border-slate-200 rounded-xl">
                  <span className="text-[10px] text-slate-400 font-medium block">No job posts shared yet</span>
                  <Link to="/alumni/referrals" className="text-[10px] font-bold text-teal-600 underline mt-1 block">
                    Post your first referral
                  </Link>
                </div>
              ) : (
                listingsData?.slice(0, 4).map(listing => (
                  <div key={listing._id} className="p-3 border border-slate-50 bg-slate-50/40 rounded-xl flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-700 leading-none mb-1">{listing.role}</h4>
                      <span className="text-[9px] font-semibold text-slate-400 block">{listing.companyName} • {listing.location}</span>
                    </div>
                    <span className="bg-white px-2.5 py-1 rounded-lg border border-slate-100 text-[10px] font-extrabold text-slate-600">
                      {listing.applicantCount} candidates
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Decline Rejection Modal with Feedback */}
      <AnimatePresence>
        {selectedApp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl border border-slate-100 shadow-xl max-w-sm w-full p-6 space-y-4"
            >
              <div>
                <h3 className="text-sm font-bold text-slate-800">Decline Referral Request</h3>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                  Provide constructive review feedback to help {selectedApp.studentId?.name} improve their profile.
                </p>
              </div>

              <textarea
                placeholder="e.g. Needs stronger portfolio projects, or certifications in Node.js..."
                rows={4}
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 text-slate-800 outline-none focus:border-rose-400 focus:bg-white transition-all resize-none font-medium leading-relaxed"
              />

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedApp(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={statusMut.isPending}
                  onClick={() => handleUpdateStatus(selectedApp._id, 'rejected', feedback)}
                  className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold shadow-sm flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  {statusMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  Confirm Rejection
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  )
}
