import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Download, TrendingUp, Award, Package, FileText } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import AppLayout from '../../components/layout/AppLayout'
import { PageSpinner } from '../../components/ui/Spinner'
import Button from '../../components/ui/Button'
import API from '../../api/axios'
import PageBanner from '../../components/ui/PageBanner'

const COLORS = ['#8b5cf6','#3b82f6','#22c55e','#8b5cf6','#f59e0b','#ef4444']

const SectionCard = ({ title, subtitle, icon: Icon, children }) => (
  <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
    <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
      <div>
        <h3 className="text-base font-bold text-slate-900">{title}</h3>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      {Icon && <Icon className="w-5 h-5 text-violet-500" />}
    </div>
    <div className="p-5">{children}</div>
  </div>
)

export default function Analytics() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: () => API.get('/admin/analytics').then(r => r.data),
  })

  const handleExport = async () => {
    const toastId = toast.loading('Exporting Placed Students...')
    try {
      const res = await API.get('/admin/export-placed', { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([res.data]))
      const a   = document.createElement('a')
      a.href    = url
      a.download = `placed_students_${Date.now()}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Excel exported successfully!', { id: toastId })
    } catch {
      toast.error('Failed to export Excel', { id: toastId })
    }
  }

  const handleExportPDF = async () => {
    const toastId = toast.loading('Generating Executive Boardroom Report...')
    try {
      const res = await API.get('/api/admin/export-pdf', { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const a   = document.createElement('a')
      a.href    = url
      a.download = `placement_boardroom_report_${Date.now()}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Boardroom Report downloaded!', { id: toastId })
    } catch {
      toast.error('Failed to generate report', { id: toastId })
    }
  }

  if (isLoading) return <AppLayout title="Analytics"><PageSpinner /></AppLayout>

  const a = data?.analytics || {}
  const branchWise    = a.branchWise    || []
  const topRecruiters = a.topRecruiters || []
  const monthly       = a.monthlyPlacements || []
  const funnel        = a.applicationFunnel || {}
  const pkgDist       = a.packageDistribution || []

  const funnelData = [
    { label: 'Applied',     value: funnel.applied     || 0, color: 'bg-blue-500' },
    { label: 'Shortlisted', value: funnel.shortlisted || 0, color: 'bg-amber-500' },
    { label: 'Interview',   value: funnel.interview   || 0, color: 'bg-purple-500' },
    { label: 'Selected',    value: funnel.selected    || 0, color: 'bg-green-500' },
    { label: 'Rejected',    value: funnel.rejected    || 0, color: 'bg-red-400' },
  ]
  const maxFunnel = Math.max(...funnelData.map(f => f.value), 1)

  const branchChartData = branchWise.map(b => ({
    name: b._id,
    Placed: b.placed,
    Total:  b.total,
    Rate:   parseFloat(((b.placed / (b.total || 1)) * 100).toFixed(1)),
  }))

  const pkgChartData = pkgDist.map(p => ({
    range: typeof p._id === 'number' ? `${p._id}+ LPA` : `${p._id} LPA`,
    Count: p.count,
  }))

  return (
    <AppLayout title="Analytics" subtitle="Placement insights & reports">
      <div className="space-y-5">

        <PageBanner
          title="Analytics & Reports"
          subtitle="Deep-dive into placement trends, branch-wise performance, recruiter rankings, and package distributions."
          badge="Analytics & Reports"
          badgeColor="bg-violet-50 text-violet-700 border-violet-100"
          gradient="violet"
        />

        {/* Export Actions Bar */}
        <div className="flex flex-wrap items-center justify-end gap-3">
          <Button 
            variant="outline" 
            icon={<Download className="w-4 h-4" />} 
            onClick={handleExport}
            className="hover:scale-[1.02] active:scale-95 transition-all font-semibold"
          >
            Export Placed List (Excel)
          </Button>
          <button 
            onClick={handleExportPDF}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-750 text-white text-sm font-bold shadow-sm shadow-violet-600/10 hover:shadow-violet-600/20 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
          >
            <FileText className="w-4 h-4" /> Download Boardroom Report (PDF)
          </button>
        </div>

        {/* Monthly trend + Funnel */}
        <div className="grid lg:grid-cols-2 gap-5">
          <SectionCard title="Monthly Placement Trend" subtitle="Placements per month" icon={TrendingUp}>
            {monthly.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthly} margin={{ top:5, right:10, left:-20, bottom:0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize:11, fill:'#94a3b8' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize:11, fill:'#94a3b8' }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ borderRadius:'12px', fontSize:'13px', border:'1px solid #e2e8f0' }} />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[6,6,0,0]} name="Placements" />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-slate-400 text-center py-12">No data yet</p>}
          </SectionCard>

          <SectionCard title="Application Funnel" subtitle="Overall conversion rates">
            <div className="space-y-3">
              {funnelData.map(f => (
                <div key={f.label}>
                  <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1">
                    <span>{f.label}</span><span>{f.value}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${f.color}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${(f.value / maxFunnel) * 100}%` }}
                      transition={{ duration: 0.7, delay: 0.1 }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        {/* Branch-wise table + chart */}
        <div className="grid lg:grid-cols-5 gap-5">
          <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm border border-slate-100">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Branch-wise Placement</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    {['Branch','Total','Placed','Rate','Avg CGPA','Avg Pkg'].map(h => (
                      <th key={h} className="px-4 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {branchWise.length === 0 && (
                    <tr><td colSpan={6} className="py-10 text-center text-slate-400 text-sm">No data</td></tr>
                  )}
                  {branchWise.map((b, i) => {
                    const rate = ((b.placed / (b.total || 1)) * 100).toFixed(0)
                    return (
                      <tr key={b._id} className="border-t border-slate-50 hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <span className="bg-slate-100 text-slate-700 text-xs font-bold px-2.5 py-1 rounded-lg">{b._id}</span>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-slate-700">{b.total}</td>
                        <td className="px-4 py-3 text-sm font-medium text-green-600">{b.placed}</td>
                        <td className="px-4 py-3">
                          <span className={`text-sm font-bold ${parseInt(rate) >= 70 ? 'text-green-600' : parseInt(rate) >= 40 ? 'text-amber-600' : 'text-red-500'}`}>{rate}%</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">{b.avgCGPA?.toFixed(2) || '—'}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{b.avgPackage ? `₹${b.avgPackage?.toFixed(1)} L` : '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <h3 className="text-base font-bold text-slate-900 mb-1">Placement Rate by Branch</h3>
            <p className="text-xs text-slate-400 mb-4">% placed per branch</p>
            {branchChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={branchChartData} layout="vertical" margin={{ top:0, right:10, left:0, bottom:0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize:11, fill:'#94a3b8' }} tickLine={false} axisLine={false} unit="%" />
                  <YAxis type="category" dataKey="name" tick={{ fontSize:11, fill:'#94a3b8' }} tickLine={false} axisLine={false} width={36} />
                  <Tooltip contentStyle={{ borderRadius:'12px', fontSize:'13px' }} formatter={v => `${v}%`} />
                  <Bar dataKey="Rate" fill="#8b5cf6" radius={[0,6,6,0]} name="Placement Rate" />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-slate-400 text-center py-12">No data</p>}
          </div>
        </div>

        {/* Top Recruiters */}
        <SectionCard title="Top Recruiters" subtitle="By number of hires" icon={Award}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {['#','Company','Hires','Avg Package','Max Package'].map(h => (
                    <th key={h} className="px-4 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topRecruiters.length === 0 && (
                  <tr><td colSpan={5} className="py-10 text-center text-slate-400 text-sm">No placement data yet</td></tr>
                )}
                {topRecruiters.map((r, i) => (
                  <tr key={r._id} className="border-t border-slate-50 hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-bold text-slate-400">#{i+1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center overflow-hidden p-1">
                          <img src="/icon_company.svg" alt={r._id} className="w-6 h-6 object-contain" />
                        </div>
                        <span className="text-sm font-semibold text-slate-800">{r._id}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="bg-green-50 text-green-700 text-xs font-bold px-2.5 py-1 rounded-full">{r.hireCount} hired</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{r.avgPackage ? `₹${r.avgPackage.toFixed(1)} LPA` : '—'}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-violet-600">{r.maxPackage ? `₹${r.maxPackage} LPA` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        {/* Package Distribution */}
        {pkgChartData.length > 0 && (
          <SectionCard title="Package Distribution" subtitle="Number of offers by package range" icon={Package}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={pkgChartData} margin={{ top:5, right:10, left:-20, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="range" tick={{ fontSize:11, fill:'#94a3b8' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize:11, fill:'#94a3b8' }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius:'12px', fontSize:'13px' }} />
                <Bar dataKey="Count" fill="#8b5cf6" radius={[6,6,0,0]} name="Offers" />
              </BarChart>
            </ResponsiveContainer>
          </SectionCard>
        )}
      </div>
    </AppLayout>
  )
}
