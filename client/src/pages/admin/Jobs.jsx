import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { Plus, Trash2, ToggleLeft, ToggleRight, Briefcase, Search, SlidersHorizontal, Calendar } from 'lucide-react'
import { Link } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import { PageSpinner } from '../../components/ui/Spinner'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import PageBanner from '../../components/ui/PageBanner'
import API from '../../api/axios'
import toast from 'react-hot-toast'

const BRANCHES = ['CSE','ECE','ME','CE','MBA','EEE','IT']
const JOB_TYPES = ['Full-Time','Internship','Part-Time','Contract']

const daysLeft = (deadline) => {
  const diff = Math.ceil((new Date(deadline) - new Date()) / (1000 * 60 * 60 * 24))
  return diff
}

export default function AdminJobs() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [selBranches, setSelBranches] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm()

  const { data, isLoading } = useQuery({
    queryKey: ['admin-jobs'],
    queryFn: () => API.get('/jobs').then(r => r.data),
  })

  const createMut = useMutation({
    mutationFn: (d) => API.post('/jobs', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-jobs'] }); toast.success('Job posted!'); setOpen(false); reset(); setSelBranches([]) },
    onError:   (e) => toast.error(e.response?.data?.message || 'Failed to post job'),
  })

  const deleteMut = useMutation({
    mutationFn: (id) => API.delete(`/jobs/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-jobs'] }); toast.success('Job deleted') },
    onError:   ()  => toast.error('Failed to delete'),
  })

  const toggleMut = useMutation({
    mutationFn: ({ id, status }) => API.patch(`/jobs/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-jobs'] }),
    onError:   ()  => toast.error('Failed to update status'),
  })

  const onSubmit = (d) => {
    createMut.mutate({
      ...d,
      package: parseFloat(d.package),
      eligibilityCriteria: {
        minCGPA:    parseFloat(d.minCGPA || 0),
        maxBacklogs: parseInt(d.maxBacklogs || 0),
        branches:   selBranches.length ? selBranches : BRANCHES,
        batchYears: [],
      },
    })
  }

  const toggleBranch = (b) => setSelBranches(prev => prev.includes(b) ? prev.filter(x => x !== b) : [...prev, b])

  const jobs = data?.jobs || []

  // Filtered jobs
  const filtered = jobs.filter(j => {
    const matchSearch = !search || j.role?.toLowerCase().includes(search.toLowerCase()) || j.companyName?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || j.status === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <AppLayout title="Job Postings" subtitle="Manage all placement drives">
      <div className="space-y-5">

        {/* ── Integrated gradient banner ── */}
        <PageBanner
          title="Job Postings"
          subtitle="Create, manage, and track all campus placement drives. Control deadlines, eligibility and pipeline status."
          badge="Placement Drives"
          compact
          gradient="violet"
          actions={
            <button
              onClick={() => setOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-violet-700 text-sm font-bold shadow-sm hover:bg-violet-50 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Post New Job
            </button>
          }
        />

        {/* ── Full-width filter bar ── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by role or company..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-500/10 transition-all"
            />
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 rounded-xl p-1 border border-slate-200">
            {['all','open','closed'].map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                  statusFilter === s
                    ? s === 'open' ? 'bg-emerald-500 text-white' : s === 'closed' ? 'bg-rose-500 text-white' : 'bg-slate-800 text-white'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {s === 'all' ? 'All' : s}
              </button>
            ))}
          </div>

          {/* Deadline filter chip */}
          <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-sm font-medium">
            <Calendar className="w-4 h-4" />
            <span>Deadline</span>
          </div>

          {/* Count */}
          <div className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-violet-50 border border-violet-100">
            <span className="text-sm font-bold text-violet-600">{filtered.length}</span>
            <span className="text-xs text-violet-500 font-semibold">drives</span>
          </div>
        </div>

        {isLoading && <PageSpinner />}

        {/* Empty state */}
        {!isLoading && filtered.length === 0 && (
          <div className="bg-white rounded-2xl p-16 text-center border border-slate-100 shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto mb-4">
              <Briefcase className="w-7 h-7 text-slate-300" />
            </div>
            <p className="text-slate-700 font-semibold">No jobs found</p>
            <p className="text-slate-400 text-sm mt-1">
              {search || statusFilter !== 'all' ? 'Try adjusting your filters' : "Click 'Post New Job' to create the first placement drive"}
            </p>
          </div>
        )}

        {/* ── Jobs Grid ── */}
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((job, i) => {
            const days = daysLeft(job.deadline)
            return (
              <motion.div
                key={job._id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 transition-all flex flex-col"
              >
                {/* Card header */}
                <div className="p-5 pb-0">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden p-1.5 flex-shrink-0 shadow-sm">
                        <img src="/icon_company.svg" className="w-full h-full object-contain" alt={job.companyName} />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 leading-tight">{job.role}</h3>
                        <p className="text-sm text-slate-500 mt-0.5">{job.companyName}</p>
                      </div>
                    </div>
                    <Badge status={job.status} />
                  </div>
                </div>

                {/* 4-col stats grid */}
                <div className="px-5 pt-4 pb-0">
                  <div className="grid grid-cols-4 gap-2 border-t border-slate-50 pt-4">
                    <div>
                      <p className="text-sm font-bold text-slate-900">₹{job.package} LPA</p>
                      <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mt-0.5">Package</p>
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
                      <p className={`text-sm font-bold ${days < 3 ? 'text-rose-500' : days < 7 ? 'text-amber-500' : 'text-slate-900'}`}>
                        {days > 0 ? `${days}d` : 'Expired'}
                      </p>
                      <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mt-0.5">Time Left</p>
                    </div>
                  </div>
                </div>

                {/* Action bar */}
                <div className="px-5 py-4 mt-auto">
                  <div className="flex items-center gap-2 pt-3 border-t border-slate-50">
                    <Link
                      to={`/admin/pipeline/${job._id}`}
                      className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-700 text-sm font-semibold py-2 rounded-xl border border-slate-200 transition-colors text-center"
                    >
                      View Pipeline
                    </Link>
                    <button
                      onClick={() => toggleMut.mutate({ id: job._id, status: job.status === 'open' ? 'closed' : 'open' })}
                      className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors"
                      title={job.status === 'open' ? 'Close drive' : 'Reopen drive'}
                    >
                      {job.status === 'open'
                        ? <ToggleRight className="w-4 h-4 text-emerald-500" />
                        : <ToggleLeft className="w-4 h-4 text-slate-400" />
                      }
                    </button>
                    <button
                      onClick={() => { if (window.confirm('Delete this job?')) deleteMut.mutate(job._id) }}
                      className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-50 hover:bg-rose-50 hover:border-rose-200 border border-slate-200 transition-colors group"
                    >
                      <Trash2 className="w-4 h-4 text-slate-300 group-hover:text-rose-400 transition-colors" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Post Job Modal */}
      <Modal open={open} onClose={() => { setOpen(false); reset(); setSelBranches([]) }} title="Post New Job" size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => { setOpen(false); reset() }}>Cancel</Button>
            <Button form="job-form" type="submit" loading={isSubmitting || createMut.isPending}>Post Job</Button>
          </>
        }>
        <form id="job-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Company Name" placeholder="Google" required error={errors.companyName?.message}
              {...register('companyName', { required: 'Required' })} />
            <Input label="Role / Position" placeholder="Software Engineer" required error={errors.role?.message}
              {...register('role', { required: 'Required' })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700">Job Type <span className="text-red-500">*</span></label>
              <select {...register('jobType', { required: true })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20">
                {JOB_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <Input label="Package (LPA)" type="number" step="0.5" placeholder="12" required error={errors.package?.message}
              {...register('package', { required: 'Required', min: { value: 0, message: 'Must be positive' } })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Location" placeholder="Bangalore / Remote" {...register('location')} />
            <Input label="Application Deadline" type="date" required error={errors.deadline?.message}
              {...register('deadline', { required: 'Required' })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-slate-700">Job Description</label>
            <textarea {...register('description')} rows={3} placeholder="Describe the role, responsibilities…"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 resize-none" />
          </div>

          {/* Eligibility */}
          <div className="bg-slate-50 rounded-2xl p-4 space-y-4 border border-slate-100">
            <p className="text-sm font-bold text-slate-800">Eligibility Criteria</p>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Min CGPA" type="number" step="0.1" min={0} max={10} placeholder="7.5" {...register('minCGPA')} />
              <Input label="Max Backlogs" type="number" min={0} placeholder="0" {...register('maxBacklogs')} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-600 mb-2">Eligible Branches <span className="text-slate-400">(none = all)</span></p>
              <div className="flex flex-wrap gap-2">
                {BRANCHES.map(b => (
                  <button key={b} type="button" onClick={() => toggleBranch(b)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${selBranches.includes(b) ? 'bg-violet-600 text-white shadow-[0_2px_8px_rgba(124,58,237,0.25)]' : 'bg-white border border-slate-200 text-slate-600 hover:border-violet-300'}`}>
                    {b}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </form>
      </Modal>
    </AppLayout>
  )
}
