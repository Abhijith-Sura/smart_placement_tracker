import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Search, Calendar, History, Clock, User, 
  Globe, Laptop, Eye, Copy, Check, RotateCcw, 
  ChevronLeft, ChevronRight, X
} from 'lucide-react'
import toast from 'react-hot-toast'
import AppLayout from '../../components/layout/AppLayout'
import API from '../../api/axios'
import PageBanner from '../../components/ui/PageBanner'
import { PageSpinner } from '../../components/ui/Spinner'

// Action to color-coded theme mapper
const ACTION_THEMES = {
  USER_REGISTER:      { label: 'Register', bg: 'bg-sky-50 text-sky-700 border-sky-100' },
  USER_VERIFY:        { label: 'Verify Email', bg: 'bg-blue-50 text-blue-700 border-blue-100' },
  PROFILE_UPDATE:     { label: 'Profile Update', bg: 'bg-slate-50 text-slate-700 border-slate-100' },
  JOB_CREATE:         { label: 'Job Post', bg: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  JOB_STATUS_CHANGE:  { label: 'Job Status', bg: 'bg-teal-50 text-teal-700 border-teal-100' },
  STUDENT_VERIFIED:   { label: 'Student Approved', bg: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  STUDENT_REJECTED:   { label: 'Student Rejected', bg: 'bg-rose-50 text-rose-700 border-rose-100' },
  SLOT_BOOK:          { label: 'Slot Booked', bg: 'bg-violet-50 text-violet-700 border-violet-100' },
  CAMPAIGN_SEND:      { label: 'Bulk Campaign', bg: 'bg-pink-50 text-pink-700 border-pink-100' },
  REPORT_EXPORT:      { label: 'Report Export', bg: 'bg-violet-50 text-violet-700 border-violet-100' },
}

export default function AuditLogs() {
  const [filters, setFilters] = useState({
    action: 'all',
    search: '',
    startDate: '',
    endDate: '',
    page: 1,
    limit: 15,
  })

  const [selectedLog, setSelectedLog] = useState(null)
  const [copiedId, setCopiedId] = useState(null)

  // Fetch audit logs with react-query
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-audit-logs', filters],
    queryFn: () => API.get('/audit', { params: filters }).then(r => r.data),
  })

  const handleResetFilters = () => {
    setFilters({
      action: 'all',
      search: '',
      startDate: '',
      endDate: '',
      page: 1,
      limit: 15,
    })
    toast.success('Filters reset successfully')
  }

  const handleCopyText = (text, id) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    toast.success('IP Address copied!')
    setTimeout(() => setCopiedId(null), 2000)
  }

  const formatAction = (action) => {
    return ACTION_THEMES[action] || { label: action, bg: 'bg-slate-50 text-slate-700 border-slate-200' }
  }

  const formatUA = (ua) => {
    if (!ua) return 'System / Unknown'
    if (ua.includes('Chrome')) return 'Chrome Browser'
    if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari Browser'
    if (ua.includes('Firefox')) return 'Firefox Browser'
    if (ua.includes('Edge')) return 'Edge Browser'
    if (ua.includes('Postman')) return 'Postman Client'
    return 'Web Client'
  }

  return (
    <AppLayout>
      <PageBanner
        title="System Audit Logs"
        subtitle="Review append-only system activity logs, trace administrative operations, and inspect metadata trails for SOC-2/compliance audits."
        gradient="violet"
        badge="Security & Compliance"
        badgeColor="bg-violet-50 text-violet-700 border-violet-100"
      />

      <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 -mt-4">
        {/* Filter Controls Card */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search email, name or IP..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value, page: 1 }))}
                className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-500/10 transition-all"
              />
            </div>

            {/* Action Selection */}
            <div className="relative">
              <select
                value={filters.action}
                onChange={(e) => setFilters(prev => ({ ...prev, action: e.target.value, page: 1 }))}
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50 text-slate-900 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-500/10 transition-all appearance-none cursor-pointer"
              >
                <option value="all">All Actions</option>
                {data?.actionTypes?.map(action => (
                  <option key={action} value={action}>
                    {formatAction(action).label}
                  </option>
                ))}
              </select>
            </div>

            {/* Start Date */}
            <div className="relative">
              <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="date"
                placeholder="Start Date"
                value={filters.startDate}
                onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value, page: 1 }))}
                className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50 text-slate-900 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-500/10 transition-all"
              />
            </div>

            {/* End Date */}
            <div className="relative">
              <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="date"
                placeholder="End Date"
                value={filters.endDate}
                onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value, page: 1 }))}
                className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50 text-slate-900 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-500/10 transition-all"
              />
            </div>
          </div>

          {/* Reset Filters Trigger */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-50">
            <span className="text-xs text-slate-400 font-medium">
              Found <strong className="text-slate-600 font-semibold">{data?.total || 0}</strong> logs
            </span>
            <button
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500 hover:text-violet-600 hover:bg-violet-50 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Filters
            </button>
          </div>
        </div>

        {/* Logs Table Container */}
        {isLoading ? (
          <div className="py-24"><PageSpinner /></div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-100">
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Timestamp</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Actor</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Action</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">IP Address</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Device</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data?.logs?.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-20 text-center text-slate-400">
                        <History className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                        <p className="font-semibold text-slate-500">No audit logs found</p>
                        <p className="text-xs text-slate-400 mt-1">Try adjusting your filters or search keywords</p>
                      </td>
                    </tr>
                  ) : (
                    data?.logs?.map((log) => {
                      const actionTheme = formatAction(log.action)
                      return (
                        <tr key={log._id} className="hover:bg-slate-50/50 transition-colors">
                          {/* Timestamp */}
                          <td className="px-6 py-4.5 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              <div className="text-sm font-medium text-slate-700">
                                {new Date(log.createdAt).toLocaleString('en-IN', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: true
                                })}
                              </div>
                            </div>
                          </td>

                          {/* Actor */}
                          <td className="px-6 py-4.5">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center flex-shrink-0">
                                <User className="w-4 h-4 text-slate-500" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-slate-800 leading-none">{log.actorName}</p>
                                <p className="text-xs text-slate-400 mt-1 truncate">{log.actorEmail}</p>
                              </div>
                            </div>
                          </td>

                          {/* Action Badge */}
                          <td className="px-6 py-4.5 whitespace-nowrap">
                            <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold border ${actionTheme.bg}`}>
                              {actionTheme.label}
                            </span>
                          </td>

                          {/* IP Address */}
                          <td className="px-6 py-4.5 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <Globe className="w-3.5 h-3.5 text-slate-400" />
                              <span className="text-sm font-mono text-slate-600">{log.ipAddress || '127.0.0.1'}</span>
                              <button
                                onClick={() => handleCopyText(log.ipAddress || '127.0.0.1', log._id)}
                                className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                              >
                                {copiedId === log._id ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </td>

                          {/* Device / UserAgent */}
                          <td className="px-6 py-4.5 whitespace-nowrap text-sm text-slate-500">
                            <div className="flex items-center gap-1.5">
                              <Laptop className="w-3.5 h-3.5 text-slate-400" />
                              <span>{formatUA(log.userAgent)}</span>
                            </div>
                          </td>

                          {/* Trigger Detail View Modal */}
                          <td className="px-6 py-4.5 whitespace-nowrap text-right text-sm">
                            <button
                              onClick={() => setSelectedLog(log)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 bg-white hover:bg-slate-50 hover:text-slate-800 transition-colors shadow-sm"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Details
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination stickies */}
            {data?.pages > 1 && (
              <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                <span className="text-xs text-slate-500 font-medium">
                  Page <strong className="text-slate-800 font-bold">{filters.page}</strong> of {data?.pages}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    disabled={filters.page === 1}
                    onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
                    className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    disabled={filters.page === data?.pages}
                    onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                    className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* JSON Details Modal */}
      <AnimatePresence>
        {selectedLog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedLog(null)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-10 flex flex-col max-h-[85vh]"
            >
              {/* Header */}
              <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h3 className="text-base font-bold text-slate-800">Inspection Trail Detail</h3>
                  <p className="text-xs text-slate-400 mt-0.5">ID: {selectedLog._id}</p>
                </div>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="p-6 overflow-y-auto space-y-4">
                {/* Meta details */}
                <div className="grid grid-cols-2 gap-4 bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <div>
                    <span className="text-xs text-slate-400 font-semibold uppercase">Action Type</span>
                    <p className="text-sm font-bold text-slate-700 mt-0.5">{selectedLog.action}</p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 font-semibold uppercase">Performed By</span>
                    <p className="text-sm font-bold text-slate-700 mt-0.5">{selectedLog.actorName}</p>
                  </div>
                </div>

                {/* Raw JSON block */}
                <div>
                  <span className="text-xs text-slate-400 font-bold block mb-1.5 uppercase">Activity Metadata (Details)</span>
                  <pre className="bg-slate-900 text-slate-100 rounded-xl p-4.5 overflow-x-auto text-xs font-mono border border-slate-850 leading-relaxed max-h-64 shadow-inner">
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </div>

                {/* System details */}
                <div className="text-[11px] text-slate-400 space-y-1 pt-3 border-t border-slate-100">
                  <p><strong>Browser UserAgent:</strong> {selectedLog.userAgent}</p>
                  <p><strong>Log Written:</strong> {new Date(selectedLog.createdAt).toISOString()}</p>
                </div>
              </div>

              {/* Footer action */}
              <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end bg-slate-50/50">
                <button
                  onClick={() => setSelectedLog(null)}
                  className="px-4.5 py-2 text-sm font-bold rounded-xl border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-sm"
                >
                  Close Detail
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AppLayout>
  )
}
