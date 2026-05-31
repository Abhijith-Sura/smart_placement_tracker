import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Plus, Trash2, Eye, ToggleLeft, ToggleRight, Building2, Search } from 'lucide-react'
import AppLayout from '../../components/layout/AppLayout'
import { PageSpinner } from '../../components/ui/Spinner'
import Badge from '../../components/ui/Badge'
import PageBanner from '../../components/ui/PageBanner'
import API from '../../api/axios'
import toast from 'react-hot-toast'
import { useAuth } from '../../hooks/useAuth'

const daysLeft = (deadline) => {
  const diff = Math.ceil((new Date(deadline) - new Date()) / (1000 * 60 * 60 * 24))
  return diff
}

export default function CompanyJobs() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const companyName = user?.user?.companyName || user?.companyName || ''

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const { data, isLoading } = useQuery({
    queryKey: ['company-jobs', companyName],
    queryFn: () => API.get(`/jobs/company/${companyName}`).then(r => r.data),
    enabled: !!companyName
  })

  const deleteMut = useMutation({
    mutationFn: (id) => API.delete(`/jobs/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['company-jobs'] }); toast.success('Job deleted') },
    onError:   ()  => toast.error('Failed to delete'),
  })

  const toggleMut = useMutation({
    mutationFn: ({ id, status }) => API.patch(`/jobs/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['company-jobs'] }),
    onError:   ()  => toast.error('Failed to update status'),
  })

  const jobs = data?.jobs || []

  const filtered = jobs.filter(j => {
    const matchSearch = !search || j.role?.toLowerCase().includes(search.toLowerCase()) || j.companyName?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || j.status === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <AppLayout title="My Jobs" subtitle="Manage your active and past job postings">
      <div className="space-y-5">

        <PageBanner
          title="My Job Postings"
          subtitle="Track and manage all your campus placement drives. View pipeline, update status, and reach more students."
          badge="My Postings"
          badgeColor="bg-sky-50 text-sky-700 border-sky-100"
          compact
          gradient="teal"
          actions={
            <Link to="/company/post-job">
              <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-teal-700 text-sm font-bold shadow-sm hover:bg-teal-50 transition-colors">
                <Plus className="w-4 h-4" />
                Post New Job
              </button>
            </Link>
          }
        />

        {/* ── Full-width filter bar ── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
          {/* Search input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Search by role..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-500/10 transition-all" />
          </div>
          {/* Status filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 rounded-xl p-1 border border-slate-200">
            {['all','open','closed'].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                  statusFilter === s ? (s === 'open' ? 'bg-emerald-500 text-white' : s === 'closed' ? 'bg-rose-500 text-white' : 'bg-slate-800 text-white') : 'text-slate-500 hover:text-slate-800'
                }`}>{s === 'all' ? 'All' : s}</button>
            ))}
          </div>
          {/* Count */}
          <div className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-teal-50 border border-teal-100">
            <span className="text-sm font-bold text-teal-600">{filtered.length}</span>
            <span className="text-xs text-teal-500 font-semibold">drives</span>
          </div>
        </div>

        {isLoading && <PageSpinner />}

        {!isLoading && filtered.length === 0 && (
          <div className="bg-white rounded-2xl p-16 text-center border border-slate-100 shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-7 h-7 text-slate-300" />
            </div>
            <p className="text-slate-700 font-semibold">No jobs found</p>
            <p className="text-slate-400 text-sm mt-1">
              {search || statusFilter !== 'all' ? 'Try adjusting your filters' : 'Create your first job posting to start receiving applications.'}
            </p>
          </div>
        )}

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((job, i) => {
            const days = daysLeft(job.deadline)
            return (
              <motion.div key={job._id} initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ delay: i*0.05 }}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 transition-all flex flex-col">
                <div className="p-5 flex-1">
                  {/* Card Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center flex-shrink-0 text-slate-600 text-sm font-bold overflow-hidden p-1">
                        {job.companyName?.[0] || 'C'}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900">{job.role}</h3>
                        <p className="text-sm text-slate-500">{job.companyName}</p>
                      </div>
                    </div>
                    <Badge status={job.status} />
                  </div>

                  {/* 4-col Stat Grid */}
                  <div className="grid grid-cols-4 gap-3 border-t border-slate-50 pt-4">
                    <div>
                      <p className="text-sm font-bold text-slate-900">₹{job.package} LPA</p>
                      <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mt-0.5">CTC</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 truncate">{job.location || 'Remote'}</p>
                      <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mt-0.5">Location</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{job.totalApplicants || 0}</p>
                      <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mt-0.5">Applicants</p>
                    </div>
                    <div>
                      <p className={`text-sm font-bold ${days < 3 ? 'text-red-500' : 'text-slate-900'}`}>
                        {days > 0 ? `${days}d` : 'Exp.'}
                      </p>
                      <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mt-0.5">Deadline</p>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex items-center gap-2 px-5 pb-5 pt-3 border-t border-slate-50">
                  <Link to={`/company/pipeline/${job._id}`}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 text-sm font-semibold py-2 rounded-xl border border-slate-200 transition-colors">
                    <Eye className="w-3.5 h-3.5" /> Pipeline
                  </Link>
                  <button onClick={() => toggleMut.mutate({ id: job._id, status: job.status === 'open' ? 'closed' : 'open' })}
                    className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors" title="Toggle status">
                    {job.status === 'open' ? <ToggleRight className="w-4 h-4 text-green-500" /> : <ToggleLeft className="w-4 h-4 text-slate-400" />}
                  </button>
                  <button onClick={() => { if(window.confirm('Delete this job?')) deleteMut.mutate(job._id) }}
                    className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-50 hover:bg-rose-50 hover:border-rose-100 border border-slate-200 transition-colors">
                    <Trash2 className="w-4 h-4 text-slate-400 hover:text-rose-500" />
                  </button>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </AppLayout>
  )
}
