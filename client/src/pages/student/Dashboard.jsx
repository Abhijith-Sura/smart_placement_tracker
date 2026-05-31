import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  FileText, CheckCircle, Clock, Briefcase,
  MapPin, ArrowRight, TrendingUp, ChevronRight
} from 'lucide-react'
import AppLayout from '../../components/layout/AppLayout'
import { PageSpinner } from '../../components/ui/Spinner'
import Badge from '../../components/ui/Badge'
import PageBanner from '../../components/ui/PageBanner'
import API from '../../api/axios'
import { useAuth } from '../../hooks/useAuth'

export default function StudentDashboard() {
  const { user } = useAuth()

  const { data: statsData,    isLoading: statsLoading  } = useQuery({ queryKey: ['student-stats'],         queryFn: () => API.get('/students/dashboard-stats').then(r => r.data) })
  const { data: eligibleData, isLoading: jobsLoading   } = useQuery({ queryKey: ['student-eligible-jobs'], queryFn: () => API.get('/students/eligible-jobs').then(r => r.data) })
  const { data: profileData }                             = useQuery({ queryKey: ['student-profile'],       queryFn: () => API.get('/students/profile').then(r => r.data) })

  if (statsLoading || jobsLoading) return <AppLayout><PageSpinner /></AppLayout>

  const stats        = statsData?.stats || {}
  const recentApps   = statsData?.recentApplications || []
  const eligibleJobs = eligibleData?.jobs?.slice(0, 3) || []
  const completion   = profileData?.user?.profileCompletion || 0
  const name         = user?.user?.name?.split(' ')[0] || user?.name?.split(' ')[0] || 'Student'
  const hour         = new Date().getHours()
  const greeting     = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening'

  const statCards = [
    { icon: FileText,    label: 'Applications',  value: stats.appliedCount         ?? 0, primary: true  },
    { icon: CheckCircle, label: 'Shortlisted',   value: stats.shortlistedCount     ?? 0, primary: false },
    { icon: Clock,       label: 'Interviews',    value: stats.interviewCount       ?? 0, primary: false },
    { icon: Briefcase,   label: 'Eligible Jobs', value: eligibleData?.jobs?.length ?? 0, primary: false },
  ]

  return (
    <AppLayout>
      <div className="space-y-6">

        {/* ── Stitch banner + profile completion ── */}
        <PageBanner
          title={
            <div className="flex items-center gap-2 flex-wrap">
              <span>{greeting}, {name}!</span>
              {profileData?.profile?.verificationStatus === 'verified' && (
                <span className="text-emerald-500 shrink-0" title="Verified Profile by TPO">
                  <CheckCircle className="w-5 h-5 fill-white/20" />
                </span>
              )}
            </div>
          }
          subtitle="Here's your placement activity overview — track applications, discover eligible drives, and build your career journey."
          badge="Student Portal"
          badgeColor="bg-orange-50 text-orange-700 border-orange-100"
          image="/student_hero.png"
          actions={
            <div className="flex items-center gap-3">
              <div className="bg-white rounded-xl px-4 py-2.5 border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between gap-6 mb-1.5">
                  <span className="text-xs font-bold text-slate-600">Profile Strength</span>
                  <span className="text-sm font-bold text-orange-500">{completion}%</span>
                </div>
                <div className="h-1.5 w-40 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${completion}%` }}
                    transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
                    className="h-full rounded-full bg-gradient-to-r from-orange-400 to-orange-600"
                  />
                </div>
              </div>
              {completion < 80 && (
                <Link to="/student/profile"
                  className="flex items-center gap-1.5 text-xs font-bold bg-orange-500 text-white px-3 py-2 rounded-xl hover:bg-orange-600 transition-colors shadow-sm">
                  Complete Profile <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>
          }
        />

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map(({ icon: Icon, label, value, primary }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07, duration: 0.4 }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md hover:border-slate-200 transition-all"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${primary ? 'bg-orange-50' : 'bg-slate-50'}`}>
                  <Icon className={`w-5 h-5 ${primary ? 'text-orange-500' : 'text-slate-400'}`} />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900">{value}</p>
              <p className="text-sm text-slate-500 mt-0.5">{label}</p>
            </motion.div>
          ))}
        </div>

        {/* ── Recent + Eligible ── */}
        <div className="grid lg:grid-cols-2 gap-6">

          {/* Recent Applications */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-[400px]">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Recent Applications</h3>
                <p className="text-sm text-slate-500 mt-0.5 font-medium">{recentApps.length} tracked</p>
              </div>
              <Link to="/student/applications" className="text-sm font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 bg-white border border-slate-100 px-4 py-2 rounded-xl shadow-sm transition-all">
                View All <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              {recentApps.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-sm">
                    <FileText className="w-8 h-8 text-slate-300" />
                  </div>
                  <p className="text-base font-bold text-slate-700">No applications yet</p>
                  <p className="text-sm text-slate-500 mt-1">Start applying to jobs below.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentApps.map(app => (
                    <div key={app._id} className="flex items-center justify-between px-5 py-4 bg-white/60 hover:bg-white rounded-2xl transition-colors border border-transparent hover:border-slate-100">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center flex-shrink-0 shadow-sm overflow-hidden p-1.5">
                          <img src="/icon_company.svg" alt={app.jobId?.companyName} className="w-full h-full object-contain" />
                        </div>
                        <div>
                          <p className="text-base font-bold text-slate-900">{app.jobId?.companyName}</p>
                          <p className="text-sm text-slate-500 font-medium">{app.jobId?.role}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge status={app.status} />
                        <p className="text-xs text-slate-400 font-medium">{new Date(app.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>

          {/* Eligible Jobs */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-[400px]">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Eligible Jobs For You</h3>
                <p className="text-sm text-slate-500 mt-0.5 font-medium">{eligibleData?.jobs?.length || 0} matching drives</p>
              </div>
              <Link to="/student/jobs" className="text-sm font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 bg-white border border-slate-100 px-4 py-2 rounded-xl shadow-sm transition-all">
                Browse All <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              {eligibleJobs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-sm">
                    <Briefcase className="w-8 h-8 text-slate-300" />
                  </div>
                  <p className="text-base font-bold text-slate-700">No matching jobs</p>
                  <p className="text-sm text-slate-500 mt-1">Check back later or complete your profile.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {eligibleJobs.map(job => (
                    <div key={job._id} className="flex items-center justify-between px-5 py-4 bg-white/60 hover:bg-white rounded-2xl transition-colors border border-transparent hover:border-slate-100">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center flex-shrink-0 shadow-sm overflow-hidden p-1.5">
                          <img src="/icon_company.svg" alt={job.companyName} className="w-full h-full object-contain" />
                        </div>
                        <div>
                          <p className="text-base font-bold text-slate-900">{job.role}</p>
                          <p className="text-sm text-slate-500 font-medium">{job.companyName}</p>
                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-xs bg-emerald-50 text-emerald-700 font-bold px-2.5 py-1 rounded-lg border border-emerald-100">{job.package} LPA</span>
                            <span className="flex items-center gap-1 text-xs text-slate-500 font-medium"><MapPin className="w-3.5 h-3.5 text-slate-400" />{job.location || 'Remote'}</span>
                          </div>
                        </div>
                      </div>
                      <Link to="/student/jobs"
                        className="shrink-0 flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold rounded-xl transition-all">
                        Explore Drive <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>

      </div>
    </AppLayout>
  )
}
