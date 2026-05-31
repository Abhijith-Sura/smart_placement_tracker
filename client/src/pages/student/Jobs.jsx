import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Briefcase, MapPin,
  AlertCircle, Sparkles, ChevronRight,
  Globe, RefreshCcw, ExternalLink, X, CheckCircle, GraduationCap, Info
} from 'lucide-react'
import AppLayout from '../../components/layout/AppLayout'
import { PageSpinner } from '../../components/ui/Spinner'
import PageBanner from '../../components/ui/PageBanner'
import API from '../../api/axios'
import toast from 'react-hot-toast'

// ─── Constants ──────────────────────────────────────────────
const TYPE_COLORS = {
  'PPT': 'bg-blue-50 text-blue-600 border-blue-100',
  'Aptitude Test': 'bg-amber-50 text-amber-600 border-amber-100',
  'Technical Interview': 'bg-purple-50 text-purple-600 border-purple-100',
  'HR Interview': 'bg-pink-50 text-pink-600 border-pink-100',
  'Placement Drive': 'bg-emerald-50 text-emerald-600 border-emerald-100',
  'Guest Lecture': 'bg-indigo-50 text-indigo-600 border-indigo-100',
  'Other': 'bg-slate-50 text-slate-600 border-slate-100'
}

const GLOBAL_JOB_TYPES = ['All', 'Full-Time', 'Internship', 'Contract', 'Remote']

// ─── Fetch External Jobs Helper ─────────────────────────────
const fetchExternalJobs = async ({ queryKey }) => {
  const [_key, { type, search }] = queryKey
  const params = new URLSearchParams()
  if (type !== 'All') params.append('type', type)
  if (search) params.append('search', search)
  const { data } = await API.get(`/external-jobs?${params.toString()}`)
  return data
}

// A resilient image load wrapper that prevents any broken image icons by falling back to clean initials
function JobLogo({ logoUrl, companyName }) {
  const [hasError, setHasError] = useState(false);

  if (logoUrl && !hasError) {
    return (
      <img
        src={logoUrl}
        alt={companyName}
        className="w-full h-full object-contain rounded-lg bg-white"
        onError={() => setHasError(true)}
      />
    );
  }

  return (
    <div className="w-full h-full bg-white border border-slate-200 flex items-center justify-center rounded-lg">
      <img src="/icon_company.svg" alt={companyName} className="w-8 h-8 object-contain opacity-80" />
    </div>
  );
}

export default function StudentJobs() {
  const qc = useQueryClient()
  const [boardType, setBoardType] = useState('campus') // 'campus' | 'global'
  
  const [selectedJob, setSelectedJob] = useState(null)
  
  // Campus Placement States
  const [campusSearch, setCampusSearch] = useState('')
  const [campusFilter, setCampusFilter] = useState('all') // 'all' | 'eligible' | 'ineligible'

  // Global Jobs States
  const [globalSearch, setGlobalSearch] = useState('')
  const [globalType, setGlobalType] = useState('All')
  const [expandedGlobalJobId, setExpandedGlobalJobId] = useState(null)

  // Queries: Campus drives
  const { data: campusData, isLoading: campusLoading } = useQuery({
    queryKey: ['student-jobs'],
    queryFn: () => API.get('/students/jobs').then(r => r.data),
    enabled: boardType === 'campus'
  })

  // Fetch student's own applications to check applied status
  const { data: appsData } = useQuery({
    queryKey: ['student-applications'],
    queryFn: () => API.get('/applications/my').then(r => r.data),
  })
  // Build a map: jobId -> application status
  const appliedMap = useMemo(() => {
    const map = {}
    appsData?.applications?.forEach(a => { if (a.jobId?._id) map[a.jobId._id] = a.status })
    return map
  }, [appsData])

  // Queries: Global jobs
  const { 
    data: globalData, 
    isLoading: globalLoading, 
    refetch: refetchGlobal, 
    isFetching: globalFetching 
  } = useQuery({
    queryKey: ['externalJobs', { type: globalType, search: globalSearch }],
    queryFn: fetchExternalJobs,
    enabled: boardType === 'global'
  })

  // Apply for Job Mutation
  const applyMut = useMutation({
    mutationFn: (jobId) => API.post(`/applications/${jobId}/apply`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['student-jobs'] })
      qc.invalidateQueries({ queryKey: ['student-applications'] })
      toast.success('Successfully applied for the job! 🎉')
      setSelectedJob(null)
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to apply')
  })

  // Campus Placement Filtering logic
  const campusJobs = campusData?.jobs || []
  const filteredCampusJobs = useMemo(() => {
    return campusJobs.filter(job => {
      const matchSearch =
        job.companyName?.toLowerCase().includes(campusSearch.toLowerCase()) ||
        job.role?.toLowerCase().includes(campusSearch.toLowerCase())
      
      const isEligible = job.isEligible
      
      if (campusFilter === 'eligible') return matchSearch && isEligible
      if (campusFilter === 'ineligible') return matchSearch && !isEligible
      return matchSearch
    })
  }, [campusJobs, campusSearch, campusFilter])

  const isLoading = (boardType === 'campus' && campusLoading) || (boardType === 'global' && globalLoading)

  return (
    <AppLayout title="Job Board" subtitle="Explore campus recruitment drives and global remote opportunities in one unified portal.">
      <div className="space-y-6">
        
        <PageBanner
          title="Job Board"
          subtitle="Explore campus placement drives you're eligible for and discover remote opportunities from global companies."
          badge="Placement Drives"
          badgeColor="bg-orange-50 text-orange-700 border-orange-100"
          compact
        />

        {/* Board Switcher */}
        <div className="flex bg-white border border-slate-100 p-1.5 rounded-2xl max-w-md shadow-sm">
          <button
            onClick={() => setBoardType('campus')}
            className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
              boardType === 'campus' 
                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Briefcase className="w-4 h-4" /> Campus Placement Drives
          </button>
          <button
            onClick={() => setBoardType('global')}
            className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
              boardType === 'global' 
                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Globe className="w-4 h-4" /> Global Remote Jobs
          </button>
        </div>

        {/* ── Board Type: CAMPUS PLACEMENTS ── */}
        {boardType === 'campus' && (
          <div className="space-y-6">
            {/* Search & Filter Header */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row gap-4 items-center">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search campus roles, companies..."
                  value={campusSearch}
                  onChange={(e) => setCampusSearch(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-100 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-400 transition-all shadow-sm"
                />
              </div>
              <div className="flex bg-white p-1.5 rounded-2xl border border-slate-100 w-full md:w-auto shadow-sm">
                <button
                  onClick={() => setCampusFilter('all')}
                  className={`flex-1 md:w-28 py-2 text-sm font-bold rounded-xl transition-all ${
                    campusFilter === 'all' ? 'bg-orange-50 text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  All Drives
                </button>
                <button
                  onClick={() => setCampusFilter('eligible')}
                  className={`flex-1 md:w-28 py-2 text-sm font-bold rounded-xl transition-all ${
                    campusFilter === 'eligible' ? 'bg-emerald-50 text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Eligible
                </button>
                <button
                  onClick={() => setCampusFilter('ineligible')}
                  className={`flex-1 md:w-28 py-2 text-sm font-bold rounded-xl transition-all ${
                    campusFilter === 'ineligible' ? 'bg-rose-50 text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Locked
                </button>
              </div>
            </div>

            {isLoading ? (
              <PageSpinner />
            ) : filteredCampusJobs.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-100 p-16 text-center shadow-sm">
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100">
                  <Briefcase className="w-8 h-8 text-slate-300" />
                </div>
                <h3 className="text-lg font-bold text-slate-700">No placement drives found</h3>
                <p className="text-slate-400 text-sm mt-1">Try adjusting your filters or search terms.</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence mode="popLayout">
                  {filteredCampusJobs.map((job, i) => (
                    <motion.div
                      key={job._id}
                      initial={{ opacity: 0, scale: 0.98, y: 12 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ delay: i * 0.04, duration: 0.3 }}
                      className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 transition-all overflow-hidden flex flex-col group"
                    >
                      {/* Header */}
                      <div className="p-5">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden p-1">
                              <img src="/icon_company.svg" alt={job.companyName} className="w-full h-full object-contain" />
                            </div>
                            <div>
                              <h3 className="font-bold text-slate-900">{job.role}</h3>
                              <p className="text-sm text-slate-500">{job.companyName}</p>
                            </div>
                          </div>
                          {appliedMap[job._id] ? (
                            <span className="flex items-center gap-1 bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full border border-blue-100 text-[10px] font-bold uppercase">
                              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                              {appliedMap[job._id]}
                            </span>
                          ) : job.isEligible ? (
                            <span className="flex items-center gap-1 bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-full border border-emerald-100 text-[10px] font-bold uppercase">
                              <Sparkles className="w-3 h-3" /> Eligible
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 bg-rose-50 text-rose-600 px-2.5 py-1 rounded-full border border-rose-100 text-[10px] font-bold uppercase" title={job.ineligibleReason}>
                              <AlertCircle className="w-3 h-3" /> Locked
                            </span>
                          )}
                        </div>

                        {/* 4-col stat grid */}
                        <div className="grid grid-cols-4 gap-3 border-t border-slate-50 pt-4">
                          <div>
                            <p className="text-sm font-bold text-slate-900">₹{job.package} LPA</p>
                            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mt-0.5">Package</p>
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900 truncate">{job.location || 'Remote'}</p>
                            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mt-0.5">Location</p>
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900 capitalize">{job.jobType}</p>
                            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mt-0.5">Type</p>
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">{new Date(job.deadline).toLocaleDateString('en-IN', { day:'2-digit', month:'short' })}</p>
                            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mt-0.5">Deadline</p>
                          </div>
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="flex items-center gap-2 px-5 pb-5 pt-3 border-t border-slate-50">
                        <button 
                          onClick={() => setSelectedJob(job)}
                          className={`flex-1 py-2 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                            appliedMap[job._id] 
                            ? 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200' 
                            : 'bg-orange-500 hover:bg-orange-600 text-white'
                          }`}
                        >
                          {appliedMap[job._id] ? 'Track Progress' : 'View Details'} <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        )}

        {/* ── Board Type: GLOBAL REMOTE OPPORTUNITIES ── */}
        {boardType === 'global' && (
          <div className="space-y-6">
            {/* Search, Filter & Refresh Header */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row gap-4 items-center">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search global roles, companies, tags..."
                  value={globalSearch}
                  onChange={(e) => setGlobalSearch(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-100 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-400 transition-all shadow-sm"
                />
              </div>
              <div className="flex gap-2 w-full md:w-auto overflow-x-auto">
                {GLOBAL_JOB_TYPES.map(type => (
                  <button
                    key={type}
                    onClick={() => setGlobalType(type)}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                      globalType === type
                        ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/20'
                        : 'bg-white border border-slate-200 text-slate-600 hover:border-orange-300 hover:text-orange-600'
                    }`}
                  >
                    {type}
                  </button>
                ))}
                
                {/* Refresh Trigger */}
                <button
                  onClick={() => refetchGlobal()}
                  disabled={globalFetching}
                  className="p-2.5 bg-slate-50 border border-slate-200 text-slate-500 rounded-xl hover:bg-slate-100 transition-colors shrink-0"
                  title="Force Sync Feed"
                >
                  <RefreshCcw className={`w-4 h-4 ${globalFetching ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {isLoading ? (
              <PageSpinner />
            ) : globalData?.jobs?.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-100 p-16 text-center shadow-sm">
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100">
                  <Globe className="w-8 h-8 text-slate-300" />
                </div>
                <h3 className="text-lg font-bold text-slate-700">No global jobs found</h3>
                <p className="text-slate-400 text-sm mt-1">Try broadening your search criteria.</p>
              </div>
            ) : (
              <div className="grid lg:grid-cols-2 gap-4">
                <AnimatePresence mode="popLayout">
                  {globalData?.jobs?.map((job, idx) => (
                    <motion.div
                      key={job._id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.97 }}
                      transition={{ duration: 0.2, delay: Math.min(idx * 0.03, 0.3) }}
                      className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 transition-all flex flex-col justify-between"
                    >
                      <div>
                        {/* Title and Source */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex gap-3 items-center">
                            <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 p-1 flex items-center justify-center shrink-0 overflow-hidden">
                              <JobLogo logoUrl={job.companyLogo} companyName={job.companyName} />
                            </div>
                            <div>
                              <h3 className="font-bold text-slate-900 text-sm line-clamp-1">{job.title}</h3>
                              <p className="text-xs text-slate-500 font-medium mt-0.5">{job.companyName || 'Confidential'}</p>
                            </div>
                          </div>
                          
                          <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg border flex-shrink-0 bg-blue-50 text-blue-600 border-blue-100">
                            {job.source || 'External'}
                          </span>
                        </div>

                        {/* Tags */}
                        {job.tags?.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-3">
                            {job.tags.slice(0, 4).map(tag => (
                              <span key={tag} className="px-2 py-0.5 bg-slate-50 text-slate-600 text-xs font-medium rounded-lg border border-slate-100">
                                {tag}
                              </span>
                            ))}
                            {job.tags.length > 4 && (
                              <span className="px-2 py-0.5 bg-slate-50 text-slate-400 text-xs font-medium rounded-lg border border-slate-100">
                                +{job.tags.length - 4}
                              </span>
                            )}
                          </div>
                        )}

                        {/* ── Collapsible Glassmorphic Details Panel ── */}
                        <AnimatePresence>
                          {expandedGlobalJobId === job._id && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.25, ease: 'easeInOut' }}
                              className="overflow-hidden"
                            >
                              <div className="mt-4 pt-4 border-t border-slate-100 space-y-4 text-slate-700">
                                {/* Overview */}
                                <div className="space-y-1">
                                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                                    <Info className="w-3.5 h-3.5 text-orange-500" />
                                    Role Overview
                                  </h4>
                                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                                    {job.description}
                                  </p>
                                </div>

                                {/* Qualifications */}
                                {job.qualifications && job.qualifications.length > 0 && (
                                  <div className="space-y-2">
                                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                                      <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                                      Required Qualifications
                                    </h4>
                                    <ul className="grid sm:grid-cols-2 gap-2">
                                      {job.qualifications.map((qual, idx) => (
                                        <li key={idx} className="bg-slate-50/50 border border-slate-100 rounded-xl p-2 flex items-start gap-2 shadow-sm">
                                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full mt-1.5 shrink-0" />
                                          <span className="text-[11px] text-slate-600 font-medium leading-relaxed">{qual}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {/* Eligibility */}
                                {job.eligibility && job.eligibility.length > 0 && (
                                  <div className="border-l-4 border-orange-400 bg-orange-50/30 p-3.5 rounded-r-xl space-y-2 shadow-sm">
                                    <h4 className="text-xs font-bold text-orange-700 uppercase tracking-wider flex items-center gap-1.5">
                                      <GraduationCap className="w-4 h-4 text-orange-500" />
                                      Student Eligibility Criteria
                                    </h4>
                                    <div className="grid sm:grid-cols-2 gap-2 mt-1">
                                      {job.eligibility.map((elig, idx) => (
                                        <div key={idx} className="flex items-start gap-1.5 text-[11px] text-orange-950 font-medium leading-normal">
                                          <span className="text-orange-500 font-bold shrink-0">✦</span>
                                          <span>{elig}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Footer Actions */}
                      <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-3 text-xs text-slate-400 font-medium">
                          <span className="flex items-center gap-1 truncate"><MapPin className="w-3.5 h-3.5 flex-shrink-0" />{job.location}</span>
                          <span className="flex items-center gap-1 flex-shrink-0"><Briefcase className="w-3.5 h-3.5" />{job.jobType}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setExpandedGlobalJobId(expandedGlobalJobId === job._id ? null : job._id)}
                            className="px-3 py-2 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 shadow-sm"
                          >
                            {expandedGlobalJobId === job._id ? 'Hide Details' : 'View Details'}
                          </button>
                          <a
                            href={job.applyUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-4 py-2 bg-orange-500 text-white rounded-xl font-bold text-xs hover:bg-orange-600 hover:-translate-y-0.5 transition-all flex items-center gap-1.5 shadow-sm shadow-orange-500/20"
                          >
                            Apply <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        )}

      </div>
      
        {/* ── Job Details Modal ── */}
        <AnimatePresence>
          {selectedJob && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                onClick={() => setSelectedJob(null)}
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-100"
              >
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <Briefcase className="w-6 h-6 text-orange-500" />
                    Job Details
                  </h2>
                  <button onClick={() => setSelectedJob(null)} className="p-2 bg-white rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="p-6 overflow-y-auto space-y-6">
                  <div>
                    <h3 className="text-2xl font-bold text-slate-800">{selectedJob.role}</h3>
                    <p className="text-lg font-bold text-slate-500">{selectedJob.companyName}</p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <p className="text-[10px] font-bold uppercase text-slate-400">Package</p>
                      <p className="font-bold text-slate-800">{selectedJob.package} LPA</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <p className="text-[10px] font-bold uppercase text-slate-400">Location</p>
                      <p className="font-bold text-slate-800">{selectedJob.location || 'Remote'}</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <p className="text-[10px] font-bold uppercase text-slate-400">Type</p>
                      <p className="font-bold text-slate-800 capitalize">{selectedJob.jobType}</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <p className="text-[10px] font-bold uppercase text-slate-400">Deadline</p>
                      <p className="font-bold text-slate-800">{new Date(selectedJob.deadline).toLocaleDateString()}</p>
                    </div>
                  </div>

                  {selectedJob.description && (
                    <div>
                      <h4 className="font-bold text-slate-800 mb-2">Job Description</h4>
                      <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{selectedJob.description}</p>
                    </div>
                  )}

                  {selectedJob.criteria && (
                    <div className="bg-orange-50/50 border border-orange-100 rounded-xl p-4">
                      <h4 className="font-bold text-orange-900 mb-3">Eligibility Criteria</h4>
                      <ul className="text-sm text-orange-800 space-y-2">
                        <li>• Minimum CGPA: <span className="font-bold">{selectedJob.criteria.minCGPA}</span></li>
                        <li>• Maximum Backlogs: <span className="font-bold">{selectedJob.criteria.maxBacklogs}</span></li>
                        <li>• Allowed Branches: <span className="font-bold">{selectedJob.criteria.allowedBranches?.join(', ') || 'ALL'}</span></li>
                      </ul>
                    </div>
                  )}

                  <div className="pt-4 border-t border-slate-100">
                    {appliedMap[selectedJob._id] ? (
                      <div className="w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 bg-slate-50 border border-slate-200 text-slate-600">
                        <span className="w-2.5 h-2.5 bg-orange-500 rounded-full animate-pulse" />
                        Application Status: <span className="capitalize text-orange-600">{appliedMap[selectedJob._id]}</span>
                      </div>
                    ) : (
                      <button 
                        onClick={() => applyMut.mutate(selectedJob._id)}
                        disabled={!selectedJob.isEligible || applyMut.isPending}
                        className={`w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                          selectedJob.isEligible 
                          ? 'bg-emerald-500 text-white hover:bg-emerald-600 hover:shadow-lg hover:shadow-emerald-500/20' 
                          : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        {applyMut.isPending ? 'Applying...' : selectedJob.isEligible ? 'Apply Now' : 'Not Eligible to Apply'}
                      </button>
                    )}
                    {!selectedJob.isEligible && !appliedMap[selectedJob._id] && (
                      <p className="text-center text-xs text-rose-500 font-bold mt-3">
                        Reason: {selectedJob.ineligibleReason}
                      </p>
                    )}
                  </div>

                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
    </AppLayout>
  )
}
