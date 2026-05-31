import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Send, Users, CheckCircle, SlidersHorizontal, List, Info, Calendar, Sparkles, Clock, AlertCircle } from 'lucide-react'
import AppLayout from '../../components/layout/AppLayout'
import { PageSpinner } from '../../components/ui/Spinner'
import PageBanner from '../../components/ui/PageBanner'
import API from '../../api/axios'
import toast from 'react-hot-toast'
import { useAuth } from '../../hooks/useAuth'

const BRANCHES = ['ALL', 'CSE', 'ECE', 'EEE', 'ME', 'CE', 'IT', 'AIDS', 'AIML']

export default function Campaigns() {
  const { user } = useAuth()
  const qc = useQueryClient()

  const myRole = user?.user?.role || user?.role || 'admin'
  const isRecruiter = myRole === 'company'

  // Form State
  const [subject, setSubject] = useState('')
  const [content, setContent] = useState('')
  
  // Filter States
  const [branch, setBranch] = useState('ALL')
  const [minCgpa, setMinCgpa] = useState(0)
  const [placementStatus, setPlacementStatus] = useState('ALL')
  const [jobId, setJobId] = useState('')

  // Fetch Jobs (to populate job dropdown)
  const { data: jobsData } = useQuery({
    queryKey: ['campaign-jobs'],
    queryFn: () => API.get('/jobs').then(r => r.data),
  })
  const jobs = jobsData?.jobs || []

  // Estimate Target Count whenever filters change
  const { data: targetData, isFetching: isEstimating } = useQuery({
    queryKey: ['campaign-target-count', branch, minCgpa, placementStatus, jobId],
    queryFn: () => API.post('/campaigns/target-count', { branch, minCgpa, placementStatus, jobId }).then(r => r.data),
    keepPreviousData: true,
  })
  const targetCount = targetData?.count ?? 0

  // Fetch Sent Campaigns history list
  const { data: historyData, isLoading: loadingHistory } = useQuery({
    queryKey: ['campaign-history'],
    queryFn: () => API.get('/campaigns').then(r => r.data),
  })
  const campaigns = historyData?.campaigns || []

  // Send Campaign Mutation
  const sendMut = useMutation({
    mutationFn: (campaignData) => API.post('/campaigns/send', campaignData),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['campaign-history'] })
      toast.success(data.data?.message || 'Email campaign dispatched successfully!')
      setSubject('')
      setContent('')
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to dispatch email campaign')
    }
  })

  const handleSendSubmit = (e) => {
    e.preventDefault()
    if (!subject.trim()) return toast.error('Subject is required')
    if (!content.trim()) return toast.error('Email content is required')
    if (targetCount === 0) return toast.error('No recipients found matching current filters')

    if (window.confirm(`Are you sure you want to send this campaign to ${targetCount} students?`)) {
      sendMut.mutate({
        subject: subject.trim(),
        content: content.trim(),
        branch,
        minCgpa,
        placementStatus,
        jobId: jobId || null
      })
    }
  }

  // Pre-fill recruiter job selection
  useEffect(() => {
    if (isRecruiter && jobs.length > 0 && !jobId) {
      setJobId(jobs[0]._id)
    }
  }, [jobs, isRecruiter])

  const themeColor = isRecruiter ? 'teal' : 'violet'
  const brandPill = isRecruiter 
    ? 'bg-teal-50 text-teal-700 border-teal-100'
    : 'bg-violet-50 text-violet-700 border-violet-100'

  return (
    <AppLayout title="Email Campaigns" subtitle="Targeted broadcasts to student groups">
      <div className="space-y-6">

        <PageBanner
          title="Email Campaigns"
          subtitle={
            isRecruiter
              ? "Draft updates, shortlist alerts, or assessment schedules and broadcast them directly to applicants of your placement drives."
              : "Compose dynamic email updates, announcements, and alerts, then filter the student list by academic branch or CGPA to target exactly who you need."
          }
          badge="Communications"
          badgeColor={brandPill}
          compact
          gradient={themeColor}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── COMPOSER FORM ── */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col justify-between">
            <form onSubmit={handleSendSubmit} className="space-y-5">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-50">
                <Mail className={`w-5 h-5 text-${themeColor}-500`} />
                <h3 className="text-base font-black text-slate-800">New Email Campaign</h3>
              </div>

              {/* Subject */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Subject Line</label>
                <input
                  type="text"
                  placeholder="Enter email subject header..."
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:ring-4 focus:ring-violet-500/10 focus:border-violet-400 focus:bg-white outline-none transition-all"
                />
              </div>

              {/* Message Body */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Email Body Message</label>
                  <span className="text-[10px] text-slate-400 font-semibold italic">Supports standard plain text & line breaks</span>
                </div>
                <textarea
                  rows={10}
                  placeholder="Dear student, write your email content here..."
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:ring-4 focus:ring-violet-500/10 focus:border-violet-400 focus:bg-white outline-none transition-all resize-none leading-relaxed"
                />
              </div>

              {/* Submit */}
              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={sendMut.isPending || targetCount === 0}
                  className={`px-5 py-3 rounded-xl text-white font-bold text-sm transition-all shadow-md flex items-center gap-2 cursor-pointer ${
                    sendMut.isPending 
                      ? 'bg-slate-300 shadow-none' 
                      : targetCount === 0 
                      ? 'bg-slate-350 shadow-none cursor-not-allowed opacity-50' 
                      : isRecruiter
                      ? 'bg-teal-500 hover:bg-teal-600 shadow-teal-500/10'
                      : 'bg-violet-600 hover:bg-violet-700 shadow-violet-600/10'
                  }`}
                >
                  {sendMut.isPending ? 'Sending Campaign...' : (
                    <>
                      <Send className="w-4 h-4" /> Send Email Blast ({targetCount})
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* ── FILTER MATRIX & ESTIMATOR ── */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-50">
                <SlidersHorizontal className="w-4.5 h-4.5 text-violet-500" />
                <h3 className="text-base font-black text-slate-800">Target Audience Filters</h3>
              </div>

              {/* Job selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  {isRecruiter ? 'My Job Placement Drive (Required)' : 'Target Job Drive Applicants'}
                </label>
                <select
                  value={jobId}
                  onChange={e => setJobId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 outline-none focus:border-violet-400 focus:bg-white transition-all cursor-pointer"
                >
                  {!isRecruiter && <option value="">ALL Students (Ignore Job Drive)</option>}
                  {jobs.map(j => (
                    <option key={j._id} value={j._id}>{j.role} — {j.companyName}</option>
                  ))}
                </select>
              </div>

              {!isRecruiter && (
                <>
                  {/* Branch select */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Target Academic Branch</label>
                    <select
                      value={branch}
                      onChange={e => setBranch(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 outline-none focus:border-violet-400 focus:bg-white transition-all cursor-pointer"
                    >
                      {BRANCHES.map(b => (
                        <option key={b} value={b}>{b === 'ALL' ? 'ALL Branches' : b}</option>
                      ))}
                    </select>
                  </div>

                  {/* Placement Status */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Target Placement Status</label>
                    <div className="grid grid-cols-3 gap-1.5 bg-slate-50 rounded-xl p-1 border border-slate-200">
                      {[
                        { id: 'ALL', label: 'All' },
                        { id: 'not_placed', label: 'Unplaced' },
                        { id: 'placed', label: 'Placed' }
                      ].map(item => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setPlacementStatus(item.id)}
                          className={`py-1.5 rounded-lg text-[10px] font-extrabold uppercase transition-all ${
                            placementStatus === item.id 
                              ? 'bg-slate-800 text-white shadow-sm' 
                              : 'text-slate-500 hover:text-slate-850'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Min CGPA Slider */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider">
                      <span className="text-slate-400">Min CGPA Criterion</span>
                      <span className="text-violet-500">{minCgpa > 0 ? `${minCgpa.toFixed(1)}+` : 'ALL CGPA'}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      step="0.5"
                      value={minCgpa}
                      onChange={e => setMinCgpa(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-violet-500"
                    />
                  </div>
                </>
              )}

              {/* ESTIMATOR PANEL */}
              <div className="bg-slate-50 rounded-2xl border border-slate-200/60 p-4 mt-3 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Estimated Audience</p>
                  <p className="text-xs text-slate-500 font-semibold">Live matching counts</p>
                </div>
                {isEstimating ? (
                  <span className="text-xs font-bold text-slate-400 animate-pulse">Checking...</span>
                ) : (
                  <div className={`px-4 py-2 rounded-xl text-center shadow-sm ${
                    targetCount > 0 
                      ? 'bg-green-50 border border-green-200 text-green-700' 
                      : 'bg-rose-50 border border-rose-200 text-rose-700'
                  }`}>
                    <span className="text-lg font-black block leading-none">{targetCount}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider">Students</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── SENT CAMPAIGNS HISTORY LOG ── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-50">
            <List className="w-5 h-5 text-violet-500" />
            <h3 className="text-base font-black text-slate-800">Campaign Dispatch History ({campaigns.length})</h3>
          </div>

          {loadingHistory ? (
            <PageSpinner />
          ) : campaigns.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 font-semibold text-sm">
              <Mail className="w-8 h-8 mx-auto mb-2 text-slate-350" />
              No sent campaigns found.
            </div>
          ) : (
            <div className="space-y-3">
              {campaigns.map((camp) => (
                <div key={camp._id} className="p-4 bg-slate-50/50 hover:bg-slate-50 rounded-2xl border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all">
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-bold text-slate-800 text-sm truncate">{camp.subject}</span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-violet-50 border border-violet-100 text-violet-600">
                        {camp.sentCount} sent
                      </span>
                    </div>
                    
                    <p className="text-xs text-slate-400 line-clamp-2 font-medium">
                      {camp.content}
                    </p>

                    {/* Metadata tags */}
                    <div className="flex flex-wrap gap-2.5 text-[10px] font-bold text-slate-500 pt-1.5">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(camp.createdAt).toLocaleDateString('en-IN')}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(camp.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="text-slate-300">|</span>
                      <span>Branch: <span className="text-slate-700">{camp.filters?.branch}</span></span>
                      <span>Min GPA: <span className="text-slate-700">{camp.filters?.minCgpa || 'Any'}</span></span>
                      <span>Status: <span className="text-slate-700 capitalize">{camp.filters?.placementStatus}</span></span>
                      {camp.filters?.jobId && (
                        <span>Drive: <span className="text-violet-500 font-extrabold">{camp.filters.jobId.role} ({camp.filters.jobId.companyName})</span></span>
                      )}
                    </div>
                  </div>

                  <div className="text-xs font-bold text-slate-400 text-right shrink-0">
                    <p className="text-slate-650">Sent by {camp.senderId?.name || 'Admin'}</p>
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5 block">{camp.senderId?.role}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </AppLayout>
  )
}
