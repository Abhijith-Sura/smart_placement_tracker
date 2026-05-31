import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Users, CheckCircle, Briefcase, Building2, TrendingUp, Clock, FileText } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
} from 'recharts'
import AppLayout from '../../components/layout/AppLayout'
import { PageSpinner } from '../../components/ui/Spinner'
import Badge from '../../components/ui/Badge'
import PageBanner from '../../components/ui/PageBanner'
import API from '../../api/axios'
import { useAuth } from '../../hooks/useAuth'

const BRANCH_COLORS = ['#8b5cf6','#3b82f6','#22c55e','#8b5cf6','#f59e0b','#ef4444']

const cardVariants = {
  hidden:  { opacity: 0, y: 16, scale: 0.97 },
  visible: (i) => ({ opacity: 1, y: 0, scale: 1, transition: { delay: i * 0.07, duration: 0.4, ease: 'easeOut' } }),
}

const StatCard = ({ icon: Icon, label, value, sub, i }) => (
  <motion.div
    custom={i}
    variants={cardVariants}
    initial="hidden"
    animate="visible"
    className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5"
  >
    <div className="flex items-center justify-between mb-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${i === 0 ? 'bg-violet-50' : 'bg-slate-50'}`}>
        <Icon className={`w-5 h-5 ${i === 0 ? 'text-violet-500' : 'text-slate-400'}`} />
      </div>
      {sub && <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg">{sub}</span>}
    </div>
    <p className="text-2xl font-bold text-slate-900">{value ?? '—'}</p>
    <p className="text-sm text-slate-500 mt-0.5">{label}</p>
  </motion.div>
)

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-lg">
      <p className="text-xs font-semibold text-slate-500 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="text-sm font-bold" style={{ color: p.color }}>{p.value} {p.name}</p>
      ))}
    </div>
  )
}

const AdminDashboard = () => {
  const { user } = useAuth()
  const name = user?.user?.name || user?.name || 'Admin'

  const { data: statsData,    isLoading: statsLoading    } = useQuery({ queryKey: ['admin-stats'],     queryFn: () => API.get('/admin/dashboard-stats').then(r => r.data) })
  const { data: analyticsData, isLoading: analyticsLoading } = useQuery({ queryKey: ['admin-analytics'], queryFn: () => API.get('/admin/analytics').then(r => r.data) })

  if (statsLoading) return <AppLayout title="Dashboard"><PageSpinner /></AppLayout>

  const stats     = statsData?.stats || {}
  const recent    = statsData?.recentApplications || []
  const monthly   = analyticsData?.analytics?.monthlyPlacements || []
  const branchWise = analyticsData?.analytics?.branchWise || []
  const pieData   = branchWise.slice(0, 6).map(b => ({ name: b._id, value: b.placed }))

  const statCards = [
    { icon: Users,       label: 'Total Students', value: stats.totalStudents,  sub: null },
    { icon: CheckCircle, label: 'Placed',          value: stats.placedStudents, sub: `${stats.placementRate}% rate` },
    { icon: Briefcase,   label: 'Active Jobs',     value: stats.activeJobs,     sub: null },
    { icon: Building2,   label: 'Companies',       value: stats.totalCompanies, sub: null },
  ]

  return (
    <AppLayout title="Dashboard" subtitle="Placement Overview">
      <div className="space-y-6">

        {/* ── Stitch-generated banner ── */}
        <PageBanner
          title={`Welcome back, ${name}`}
          subtitle="Here's your placement command centre for today. Track pipelines, review analytics, and manage the full placement lifecycle."
          badge="Admin Portal"
          badgeColor="bg-violet-50 text-violet-700 border-violet-100"
          gradient="violet"
          image="/admin_hero.png"
          actions={
            <div className="flex items-center gap-1.5 bg-white border border-emerald-200 text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              Live data
            </div>
          }
        />

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card, i) => <StatCard key={card.label} {...card} i={i} />)}
        </div>

        {/* Charts Row */}
        <div className="grid lg:grid-cols-3 gap-5">
          {/* Area/Line Chart */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-[0_2px_16px_rgba(15,23,42,0.07)] border border-slate-100 p-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-base font-bold text-slate-900">Placement Trend</h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">Monthly placements this year</p>
              </div>
              <div className="flex items-center gap-1.5 bg-violet-50 border border-violet-100 rounded-full px-3 py-1">
                <TrendingUp className="w-3.5 h-3.5 text-violet-500" />
                <span className="text-xs font-bold text-violet-600">Trending</span>
              </div>
            </div>
            {monthly.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={monthly} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="violetGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#8b5cf6" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8', fontFamily: 'Plus Jakarta Sans' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8', fontFamily: 'Plus Jakarta Sans' }} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={2.5} fill="url(#violetGrad)" dot={{ fill: '#8b5cf6', r: 4, strokeWidth: 0 }} activeDot={{ r: 6, fill: '#8b5cf6', strokeWidth: 2, stroke: '#fff' }} name="Placements" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-56 flex flex-col items-center justify-center gap-2">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-slate-300" />
                </div>
                <p className="text-slate-400 text-sm font-medium">No trend data yet</p>
              </div>
            )}
          </div>

          {/* Pie Chart */}
          <div className="bg-white rounded-2xl shadow-[0_2px_16px_rgba(15,23,42,0.07)] border border-slate-100 p-5">
            <h3 className="text-base font-bold text-slate-900 mb-0.5">Branch Distribution</h3>
            <p className="text-xs text-slate-400 font-medium mb-4">Placed students by branch</p>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="45%" innerRadius={52} outerRadius={80} paddingAngle={4} dataKey="value">
                    {pieData.map((_, i) => <Cell key={i} fill={BRANCH_COLORS[i % BRANCH_COLORS.length]} />)}
                  </Pie>
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px', fontFamily: 'Plus Jakarta Sans' }} />
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-56 flex flex-col items-center justify-center gap-2">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-slate-300" />
                </div>
                <p className="text-slate-400 text-sm font-medium">No data yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Applications */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-white rounded-2xl shadow-[0_2px_16px_rgba(15,23,42,0.07)] border border-slate-100 overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Recent Applications</h3>
              <p className="text-xs text-slate-400 font-medium mt-0.5">{recent.length} latest entries</p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse-live" />
              <span className="text-xs font-bold text-green-600">Live</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {['Student', 'Company / Role', 'Status', 'Date'].map(h => (
                    <th key={h} className="px-5 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recent.length === 0 && (
                  <tr><td colSpan={4} className="px-5 py-12 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto mb-3">
                      <FileText className="w-6 h-6 text-slate-300" />
                    </div>
                    <p className="text-sm text-slate-400 font-medium">No applications yet</p>
                  </td></tr>
                )}
                {recent.map((app, i) => (
                  <tr key={app._id || i} className="border-t border-slate-50 hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center shadow-sm flex-shrink-0 overflow-hidden p-1">
                          <img src="/icon_student.svg" alt={app.studentId?.name} className="w-full h-full object-contain" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">{app.studentId?.name || '—'}</p>
                          <p className="text-xs text-slate-400 font-medium">{app.studentId?.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-sm font-semibold text-slate-700">{app.jobId?.companyName || '—'}</p>
                      <p className="text-xs text-slate-400 font-medium">{app.jobId?.role}</p>
                    </td>
                    <td className="px-5 py-3.5"><Badge status={app.status} /></td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                        <Clock className="w-3 h-3" />
                        {new Date(app.createdAt).toLocaleDateString('en-IN')}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </AppLayout>
  )
}

export default AdminDashboard
