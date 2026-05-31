import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ArrowRight, Briefcase, Users, Calendar } from 'lucide-react'
import AppLayout from '../../components/layout/AppLayout'
import PageBanner from '../../components/ui/PageBanner'
import { PageSpinner } from '../../components/ui/Spinner'
import API from '../../api/axios'

const card = {
  hidden: { opacity: 0, y: 16 },
  show: i => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.35 } }),
}

export default function PipelineIndex() {
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ['jobs-list'],
    queryFn: () => API.get('/jobs').then(r => r.data),
  })

  const jobs = data?.jobs ?? data ?? []

  return (
    <AppLayout title="Pipeline" subtitle="Select a job to view its placement pipeline">
      <div className="space-y-6">

        <PageBanner
          title="Placement Pipeline"
          subtitle="Pick a job drive below to open its Kanban board and manage applicants stage by stage."
          badge="Pipeline"
          badgeColor="bg-violet-50 text-violet-700 border-violet-100"
          gradient="violet"
        />

        {isLoading ? (
          <PageSpinner />
        ) : jobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto mb-4">
              <Briefcase className="w-7 h-7 text-slate-300" />
            </div>
            <p className="text-sm font-semibold text-slate-700">No job drives yet</p>
            <p className="text-xs text-slate-400 mt-1">Create a job drive first to see its pipeline here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {jobs.map((job, i) => (
              <motion.div
                key={job._id}
                custom={i}
                variants={card}
                initial="hidden"
                animate="show"
                onClick={() => navigate(`/admin/pipeline/${job._id}`)}
                className="group bg-white rounded-2xl border border-slate-100 shadow-sm p-5 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center flex-shrink-0">
                    <Briefcase className="w-5 h-5 text-violet-500" />
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    job.status === 'open'
                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                      : 'bg-slate-100 text-slate-500 border border-slate-200'
                  }`}>
                    {job.status === 'open' ? 'Active' : 'Closed'}
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-base font-bold text-slate-800 tracking-tight mb-0.5 group-hover:text-violet-700 transition-colors">
                  {job.role || job.title}
                </h3>
                <p className="text-sm text-slate-400 mb-4">{job.companyName || job.company}</p>

                {/* Meta */}
                <div className="flex items-center gap-4 text-xs text-slate-500 mb-4">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    {job.totalApplicants ?? job.applicantsCount ?? 0} applicants
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    {job.deadline ? new Date(job.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'No deadline'}
                  </span>
                </div>

                {/* CTA */}
                <div className="flex items-center gap-1.5 text-sm font-semibold text-violet-600 group-hover:gap-2.5 transition-all">
                  View Pipeline <ArrowRight className="w-4 h-4" />
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
