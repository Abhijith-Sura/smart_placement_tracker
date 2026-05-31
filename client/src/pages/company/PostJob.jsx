import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { CheckCircle, Briefcase } from 'lucide-react'
import AppLayout from '../../components/layout/AppLayout'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import PageBanner from '../../components/ui/PageBanner'
import API from '../../api/axios'
import toast from 'react-hot-toast'
import { useAuth } from '../../hooks/useAuth'

const BRANCHES = ['CSE','ECE','ME','CE','MBA','EEE','IT']
const JOB_TYPES = ['Full-Time','Internship','Part-Time','Contract']

export default function CompanyPostJob() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { user } = useAuth()
  const companyName = user?.user?.companyName || user?.companyName || ''
  const [selBranches, setSelBranches] = useState([])

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { companyName } // Pre-fill company name
  })

  const createMut = useMutation({
    mutationFn: (d) => API.post('/jobs', d),
    onSuccess: () => { 
      qc.invalidateQueries({ queryKey: ['company-jobs'] })
      toast.success('Job posted successfully!')
      navigate('/company/jobs')
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to post job'),
  })

  const onSubmit = (d) => {
    createMut.mutate({
      ...d,
      package: parseFloat(d.package),
      eligibilityCriteria: {
        minCGPA: parseFloat(d.minCGPA || 0),
        maxBacklogs: parseInt(d.maxBacklogs || 0),
        branches: selBranches.length ? selBranches : BRANCHES,
        batchYears: [],
      },
    })
  }

  const toggleBranch = (b) => setSelBranches(prev => prev.includes(b) ? prev.filter(x => x !== b) : [...prev, b])

  return (
    <AppLayout title="Post a Job" subtitle="Create a new placement drive">
      <div className="max-w-4xl mx-auto space-y-5">

        <PageBanner
          title="Post a New Job Drive"
          subtitle="Create a campus placement drive, define eligibility criteria, and immediately start receiving student applications."
          image="/postjob_banner.png"
          badge="Post a Job"
          badgeColor="bg-emerald-50 text-emerald-700 border-emerald-100"
          compact
          gradient="teal"
        />

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="bg-teal-50 border border-teal-100 rounded-xl p-4 mb-8 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-teal-500 flex-shrink-0" />
            <p className="text-sm text-teal-700">Jobs posted here will be immediately available to eligible students and tracked via your Kanban pipeline.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Input label="Company Name" placeholder="e.g. Google" required error={errors.companyName?.message}
              {...register('companyName', { required: 'Required' })} readOnly={!!companyName} className={companyName ? 'bg-slate-50 text-slate-500' : ''} />
            <Input label="Role / Position" placeholder="Software Engineer" required error={errors.role?.message}
              {...register('role', { required: 'Required' })} />
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700">Job Type <span className="text-red-500">*</span></label>
              <select {...register('jobType', { required: true })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20">
                {JOB_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <Input label="Package (LPA)" type="number" step="0.5" placeholder="12" required error={errors.package?.message}
              {...register('package', { required: 'Required', min: { value: 0, message: 'Must be positive' } })} />
            <Input label="Application Deadline" type="date" required error={errors.deadline?.message}
              {...register('deadline', { required: 'Required' })} />
          </div>

          <Input label="Location" placeholder="Bangalore / Remote" {...register('location')} />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-slate-700">Job Description</label>
            <textarea {...register('description')} rows={5} placeholder="Describe the role, responsibilities, and perks..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 resize-none" />
          </div>

          <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
            <p className="text-sm font-bold text-slate-900 mb-4">Eligibility Criteria</p>
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <Input label="Min CGPA" type="number" step="0.1" min={0} max={10} placeholder="7.5" {...register('minCGPA')} />
              <Input label="Max Backlogs" type="number" min={0} placeholder="0" {...register('maxBacklogs')} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-2">Eligible Branches (Leave empty for all branches)</p>
              <div className="flex flex-wrap gap-2">
                {BRANCHES.map(b => (
                  <button key={b} type="button" onClick={() => toggleBranch(b)}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${selBranches.includes(b) ? 'bg-teal-500 text-white shadow-[0_2px_8px_rgba(20,184,166,0.25)]' : 'bg-white border border-slate-200 text-slate-600 hover:border-teal-300'}`}>
                    {b}
                  </button>
                ))}
              </div>
            </div>
          </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
              <Button type="button" variant="ghost" onClick={() => navigate(-1)}>Cancel</Button>
              <Button type="submit" loading={isSubmitting || createMut.isPending}>
                Post Job Now
              </Button>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  )
}
