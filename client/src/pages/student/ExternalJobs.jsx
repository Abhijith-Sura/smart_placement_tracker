import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { Search, Globe, RefreshCcw, ExternalLink, MapPin, Briefcase, CheckCircle, GraduationCap, Info, X } from 'lucide-react'
import API from '../../api/axios'
import AppLayout from '../../components/layout/AppLayout'
import PageBanner from '../../components/ui/PageBanner'

const fetchExternalJobs = async ({ queryKey }) => {
  const [_key, { type, search }] = queryKey
  const params = new URLSearchParams()
  if (type !== 'All') params.append('type', type)
  if (search) params.append('search', search)
  const { data } = await API.get(`/external-jobs?${params.toString()}`)
  return data
}

const getCompanyInitials = (name) => {
  if (!name) return '??';
  const clean = name.replace(/[^a-zA-Z0-9\s]/g, '').trim();
  const parts = clean.split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
};

const getCompanyColorClass = (name) => {
  if (!name) return 'from-slate-400 to-slate-500 text-white';
  const colors = [
    'from-orange-400 to-amber-500 text-orange-950',
    'from-teal-400 to-emerald-500 text-teal-950',
    'from-sky-400 to-blue-500 text-sky-950',
    'from-indigo-400 to-violet-500 text-indigo-950',
    'from-rose-400 to-pink-500 text-rose-950',
    'from-emerald-400 to-teal-500 text-emerald-950',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

export default function ExternalJobs() {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('All')
  const [selectedJob, setSelectedJob] = useState(null)

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['externalJobs', { type: typeFilter, search }],
    queryFn: fetchExternalJobs,
  })

  const jobTypes = ['All', 'Full-Time', 'Internship', 'Contract', 'Remote']

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-6 relative">

        <PageBanner
          title="Live Job Board"
          subtitle="Explore verified off-campus and external job opportunities curated for students across top Indian companies and startups."
          badge="External Opportunities"
          badgeColor="bg-emerald-50 text-emerald-700 border-emerald-100"
          compact
          actions={
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:border-orange-300 hover:text-orange-600 transition-all disabled:opacity-50 shadow-sm cursor-pointer"
            >
              <RefreshCcw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          }
        />

        {/* ── Filters ── */}
        <div className="flex flex-col md:flex-row gap-3 items-center">
          <div className="relative w-full md:flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search roles, companies, tags..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl shadow-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-500/10 outline-none transition-all text-sm text-slate-800 placeholder-slate-400"
            />
          </div>
          <div className="flex gap-2 w-full md:w-auto overflow-x-auto">
            {jobTypes.map(type => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={`px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${
                  typeFilter === type
                    ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/20'
                    : 'bg-white border border-slate-200 text-slate-600 hover:border-orange-300 hover:text-orange-600'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* ── Jobs Grid ── */}
        <div className="grid lg:grid-cols-2 gap-4">
          <AnimatePresence mode="popLayout">
            {isLoading ? (
              [...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl h-48 animate-pulse border border-slate-100" />
              ))
            ) : data?.jobs?.length === 0 ? (
              <div className="col-span-2 text-center py-20 bg-white rounded-2xl border border-slate-100">
                <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Globe className="w-7 h-7 text-slate-400" />
                </div>
                <h3 className="text-base font-bold text-slate-800">No jobs found</h3>
                <p className="text-slate-400 mt-1 text-sm">Try adjusting your search or filters</p>
              </div>
            ) : (
              data?.jobs?.map((job, idx) => (
                <motion.div
                  key={job._id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.2, delay: Math.min(idx * 0.03, 0.3) }}
                  onClick={() => setSelectedJob(job)}
                  className={`bg-white rounded-2xl p-5 border shadow-sm hover:shadow-md hover:border-slate-200 transition-all flex flex-col justify-between relative cursor-pointer group ${
                    job.isPremium 
                      ? 'border-l-4 border-l-orange-500 border-slate-200 shadow-orange-500/[0.03]' 
                      : 'border-slate-105'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex gap-3 items-center">
                        <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 p-1 flex items-center justify-center shrink-0 overflow-hidden relative shadow-sm">
                          {job.companyLogo && !job.companyLogo.includes('clearbit.com') ? (
                            <>
                              <img
                                src={job.companyLogo}
                                alt={job.companyName}
                                className="w-full h-full object-contain z-10 relative bg-white rounded-lg"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  const fallbackEl = e.target.parentNode.querySelector('.fallback-avatar');
                                  if (fallbackEl) fallbackEl.classList.remove('hidden');
                                }}
                              />
                              <div className={`fallback-avatar hidden absolute inset-0 bg-gradient-to-br ${getCompanyColorClass(job.companyName)} flex items-center justify-center text-[10px] font-black rounded-lg`}>
                                {getCompanyInitials(job.companyName)}
                              </div>
                            </>
                          ) : (
                            <div className={`absolute inset-0 bg-gradient-to-br ${getCompanyColorClass(job.companyName)} flex items-center justify-center text-[10px] font-black rounded-lg`}>
                              {getCompanyInitials(job.companyName)}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-extrabold text-slate-900 text-sm line-clamp-1 group-hover:text-orange-600 transition-colors">{job.title}</h3>
                          <p className="text-xs text-slate-500 font-bold mt-0.5 truncate">{job.companyName || 'Confidential'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {job.isPremium && (
                          <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded bg-orange-50 text-orange-600 border border-orange-100 flex items-center gap-1 shadow-sm shrink-0">
                            ★ Verified
                          </span>
                        )}
                        <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg border flex-shrink-0 bg-blue-50 text-blue-600 border-blue-100">
                          {job.source || 'External'}
                        </span>
                      </div>
                    </div>

                    {job.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {job.tags.slice(0, 4).map(tag => (
                          <span key={tag} className="px-2 py-0.5 bg-slate-50 text-slate-600 text-xs font-semibold rounded-lg border border-slate-100">
                            {tag}
                          </span>
                        ))}
                        {job.tags.length > 4 && (
                          <span className="px-2 py-0.5 bg-slate-50 text-slate-400 text-xs font-semibold rounded-lg border border-slate-100">
                            +{job.tags.length - 4}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-3 text-xs text-slate-400 font-bold">
                      <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-slate-400" />{job.location}</span>
                      <span className="flex items-center gap-1"><Briefcase className="w-3.5 h-3.5 text-slate-400" />{job.jobType}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedJob(job);
                        }}
                        className="px-3.5 py-2 bg-slate-50 border border-slate-200 hover:border-orange-200 hover:text-orange-600 text-slate-600 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                      >
                        View Details
                      </button>
                      <a
                        href={job.applyUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="px-4 py-2 bg-orange-500 text-white rounded-xl font-bold text-xs hover:bg-orange-600 hover:-translate-y-0.5 transition-all flex items-center gap-1.5 shadow-sm shadow-orange-500/20"
                      >
                        Apply <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

        {/* ── Slide-over Details Drawer ── */}
        <AnimatePresence>
          {selectedJob && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedJob(null)}
                className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-50 cursor-pointer"
              />

              {/* Drawer Container */}
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 26, stiffness: 220 }}
                className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-white shadow-2xl z-50 flex flex-col h-full border-l border-slate-100"
              >
                {/* Header */}
                <div className="p-6 border-b border-slate-100 relative">
                  <button
                    onClick={() => setSelectedJob(null)}
                    className="absolute top-6 right-6 p-2 rounded-xl hover:bg-slate-50 text-slate-400 hover:text-slate-650 transition-all cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>

                  <div className="flex gap-4 items-start pr-8">
                    <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 p-1.5 flex items-center justify-center shrink-0 overflow-hidden relative shadow-sm">
                      {selectedJob.companyLogo && !selectedJob.companyLogo.includes('clearbit.com') ? (
                        <>
                          <img
                            src={selectedJob.companyLogo}
                            alt={selectedJob.companyName}
                            className="w-full h-full object-contain z-10 relative bg-white rounded-xl"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              const fallbackEl = e.target.parentNode.querySelector('.fallback-avatar-drawer');
                              if (fallbackEl) fallbackEl.classList.remove('hidden');
                            }}
                          />
                          <div className={`fallback-avatar-drawer hidden absolute inset-0 bg-gradient-to-br ${getCompanyColorClass(selectedJob.companyName)} flex items-center justify-center text-sm font-black rounded-xl`}>
                            {getCompanyInitials(selectedJob.companyName)}
                          </div>
                        </>
                      ) : (
                        <div className={`absolute inset-0 bg-gradient-to-br ${getCompanyColorClass(selectedJob.companyName)} flex items-center justify-center text-sm font-black rounded-xl`}>
                          {getCompanyInitials(selectedJob.companyName)}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="flex flex-wrap gap-1.5 items-center mb-1.5">
                        {selectedJob.isPremium && (
                          <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded bg-orange-50 text-orange-600 border border-orange-100">
                            ★ Verified Premium
                          </span>
                        )}
                        <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded bg-blue-50 text-blue-600 border border-blue-100">
                          {selectedJob.source || 'External'}
                        </span>
                      </div>
                      <h3 className="font-extrabold text-slate-900 text-lg leading-snug">{selectedJob.title}</h3>
                      <p className="text-sm text-slate-500 font-bold mt-1">{selectedJob.companyName}</p>
                    </div>
                  </div>
                </div>

                {/* Body (Scrollable) */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {/* Job Stats Bar */}
                  <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400">
                        <MapPin className="w-4 h-4 text-orange-500" />
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Location</p>
                        <p className="text-xs text-slate-800 font-black">{selectedJob.location}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400">
                        <Briefcase className="w-4 h-4 text-orange-500" />
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Job Type</p>
                        <p className="text-xs text-slate-800 font-black">{selectedJob.jobType}</p>
                      </div>
                    </div>
                  </div>

                  {/* Overview */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                      <span className="w-1.5 h-3.5 bg-orange-500 rounded-full" />
                      Role Overview
                    </h4>
                    <p className="text-xs text-slate-650 leading-relaxed font-semibold">
                      {selectedJob.description}
                    </p>
                  </div>

                  {/* Qualifications */}
                  {selectedJob.qualifications && selectedJob.qualifications.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                        <span className="w-1.5 h-3.5 bg-green-500 rounded-full" />
                        Required Qualifications
                      </h4>
                      <ul className="space-y-2">
                        {selectedJob.qualifications.map((qual, idx) => (
                          <li key={idx} className="bg-slate-50/50 border border-slate-100 rounded-2xl p-3 flex items-start gap-2.5 shadow-sm">
                            <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                            <span className="text-[11px] text-slate-600 font-semibold leading-relaxed">{qual}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Eligibility */}
                  {selectedJob.eligibility && selectedJob.eligibility.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                        <span className="w-1.5 h-3.5 bg-orange-500 rounded-full" />
                        Student Eligibility
                      </h4>
                      <div className="border-l-4 border-orange-500 bg-orange-50/20 p-4 rounded-r-2xl space-y-2.5 border border-l-0 border-orange-100">
                        {selectedJob.eligibility.map((elig, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-[11px] text-orange-950 font-semibold leading-relaxed">
                            <span className="text-orange-500 shrink-0">✦</span>
                            <span>{elig}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center gap-3">
                  <button
                    onClick={() => setSelectedJob(null)}
                    className="flex-1 py-3 bg-white border border-slate-200 hover:border-slate-355 hover:bg-slate-50 text-slate-600 rounded-xl font-bold text-xs transition-all shadow-sm cursor-pointer"
                  >
                    Close
                  </button>
                  <a
                    href={selectedJob.applyUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-xs text-center transition-all flex items-center justify-center gap-2 shadow-md shadow-orange-500/20 hover:-translate-y-0.5 cursor-pointer"
                  >
                    Apply Now <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

      </div>
    </AppLayout>
  )
}
