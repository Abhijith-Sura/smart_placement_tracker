import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Briefcase, Users, CheckCircle, Clock, PlusCircle, ArrowRight, LayoutDashboard } from 'lucide-react'
import AppLayout from '../../components/layout/AppLayout'
import { PageSpinner } from '../../components/ui/Spinner'
import Badge from '../../components/ui/Badge'
import PageBanner from '../../components/ui/PageBanner'
import API from '../../api/axios'
import { useAuth } from '../../hooks/useAuth'

const cardVariants = {
  hidden:  { opacity: 0, y: 14, scale: 0.97 },
  visible: (i) => ({ opacity: 1, y: 0, scale: 1, transition: { delay: i * 0.07, duration: 0.35, ease: 'easeOut' } }),
}

export default function CompanyDashboard() {
  const { user } = useAuth()
  const name        = user?.user?.name || user?.name || 'Company'
  const companyName = user?.user?.companyName || user?.companyName || name

  const { data: jobsData, isLoading } = useQuery({
    queryKey: ['company-jobs', companyName],
    queryFn:  () => API.get(`/jobs/company/${companyName}`).then(r => r.data),
    enabled:  !!companyName,
  })

  if (isLoading) return <AppLayout title="Dashboard"><PageSpinner /></AppLayout>

  const jobs           = jobsData?.jobs || []
  const activeJobs     = jobs.filter(j => j.status === 'open').length
  const totalApplicants = jobs.reduce((sum, j) => sum + (j.totalApplicants || 0), 0)

  const statCards = [
    { icon: Briefcase,   label: 'Total Jobs',       value: jobs.length,              iconBg: 'bg-teal-50', iconColor: 'text-teal-500' },
    { icon: CheckCircle, label: 'Active Postings',   value: activeJobs,               iconBg: 'bg-slate-50',  iconColor: 'text-slate-400'  },
    { icon: Users,       label: 'Total Applicants',  value: totalApplicants,          iconBg: 'bg-slate-50',  iconColor: 'text-slate-400'  },
    { icon: Clock,       label: 'Closed Jobs',       value: jobs.length - activeJobs, iconBg: 'bg-slate-50',  iconColor: 'text-slate-400'  },
  ]

  return (
    <AppLayout title="Dashboard" subtitle="Your hiring overview">
      <div className="space-y-6">

        {/* ── Stitch company banner ── */}
        <PageBanner
          title={`Welcome, ${name}`}
          subtitle="Manage your campus hiring pipeline, track applicants, and post new job drives — all from one place."
          badge="Company Portal"
          badgeColor="bg-sky-50 text-sky-700 border-sky-100"
          gradient="teal"
          image="/company_hero.png"
          actions={
            <Link
              to="/company/post-job"
              className="inline-flex items-center gap-2 font-bold px-5 py-2.5 rounded-xl hover:-translate-y-0.5 transition-all text-sm"
              style={{
                background: 'rgba(255,255,255,0.20)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.35)',
                color: 'white',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25)',
              }}
            >
              <PlusCircle className="w-4 h-4" /> Post a New Job
            </Link>
          }
        />

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map(({ icon: Icon, label, value, iconBg, iconColor }, i) => (
            <motion.div
              key={label}
              custom={i}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${iconColor}`} />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900">{value ?? '—'}</p>
              <p className="text-sm text-slate-500 mt-0.5">{label}</p>
            </motion.div>
          ))}
        </div>

        {/* Recent Job Postings */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-white rounded-2xl shadow-[0_2px_16px_rgba(15,23,42,0.07)] border border-slate-100 overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Your Recent Job Postings</h3>
              <p className="text-xs text-slate-400 font-medium mt-0.5">Last {Math.min(jobs.length, 5)} listings</p>
            </div>
            <Link to="/company/jobs" className="text-xs font-bold text-teal-600 hover:text-teal-700 transition-colors flex items-center gap-1">
              View All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {jobs.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto mb-4">
                <LayoutDashboard className="w-7 h-7 text-slate-300" />
              </div>
              <p className="text-sm font-bold text-slate-700">No jobs posted yet</p>
              <p className="text-xs text-slate-400 mt-1 font-medium">Post your first job to start receiving applications.</p>
              <Link to="/company/post-job" className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 bg-teal-500 hover:bg-teal-600 text-white text-sm font-bold rounded-xl shadow-[0_4px_12px_rgba(20,184,166,0.30)] hover:-translate-y-0.5 transition-all">
                <PlusCircle className="w-4 h-4" /> Post a Job
              </Link>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {['Role', 'Status', 'Applicants', 'Deadline'].map(h => (
                    <th key={h} className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {jobs.slice(0, 5).map((job) => (
                  <tr key={job._id} className="border-t border-slate-50 hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-xs font-bold flex items-center justify-center flex-shrink-0">
                          {job.role?.[0] || 'J'}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">{job.role}</p>
                          <p className="text-xs text-slate-400 font-medium">{job.location || 'Remote'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5"><Badge status={job.status} /></td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-sm font-semibold text-slate-700">{job.totalApplicants || 0}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                        <Clock className="w-3 h-3" />
                        {new Date(job.deadline).toLocaleDateString('en-IN')}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </motion.div>

      </div>
    </AppLayout>
  )
}
