import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Search, CheckCircle, XCircle, UserCheck, UserX, Globe, Building2, Mail, Phone, MapPin, Eye } from 'lucide-react'
import AppLayout from '../../components/layout/AppLayout'
import { PageSpinner } from '../../components/ui/Spinner'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import PageBanner from '../../components/ui/PageBanner'
import API from '../../api/axios'
import toast from 'react-hot-toast'

export default function Companies() {
  const qc = useQueryClient()

  const [search, setSearch] = useState('')
  const [verified, setVerified] = useState('') // '', 'true', 'false'
  const [page, setPage] = useState(1)
  const [selectedCompany, setSelectedCompany] = useState(null) // For details modal

  // Fetch all companies from backend
  const { data, isLoading } = useQuery({
    queryKey: ['admin-companies', search, verified, page],
    queryFn: () => API.get('/admin/companies', { params: { search, verified, page, limit: 10 } }).then(r => r.data),
    keepPreviousData: true,
  })

  // Verify/Unverify company profiles
  const verifyCompanyMut = useMutation({
    mutationFn: ({ id, isVerified }) => API.patch(`/admin/verify-company/${id}`, { isVerified }),
    onSuccess: () => { 
      qc.invalidateQueries({ queryKey: ['admin-companies'] })
      toast.success('Company verification updated successfully') 
    },
    onError: () => toast.error('Failed to update verification status'),
  })

  // Activate/Deactivate user accounts
  const toggleUserMut = useMutation({
    mutationFn: (userId) => API.patch(`/admin/toggle-user/${userId}`),
    onSuccess: () => { 
      qc.invalidateQueries({ queryKey: ['admin-companies'] })
      toast.success('User account status updated') 
    },
    onError: () => toast.error('Failed to toggle account status'),
  })

  const companies = data?.companies || []
  const pagination = data?.pagination || {}

  const getInitials = (name = '') => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

  return (
    <AppLayout title="Companies" subtitle="Manage & verify corporate recruiter accounts">
      <div className="space-y-6">

        <PageBanner
          title="Company Directory"
          subtitle="Review and verify all registered corporate recruiters. Approve company profiles and manage account access."
          badge="Company Directory"
          badgeColor="bg-sky-50 text-sky-700 border-sky-100"
          compact
          gradient="violet"
        />

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 flex-1 min-w-[300px]">
            <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <input 
              value={search} 
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search by company name, industry, recruiter email…"
              className="text-sm outline-none w-full text-slate-700 placeholder:text-slate-400 bg-transparent" 
            />
          </div>

          <select 
            value={verified} 
            onChange={e => { setVerified(e.target.value); setPage(1) }}
            className="text-sm border border-slate-200 rounded-xl px-3.5 py-2.5 bg-white text-slate-700 outline-none focus:border-violet-400 cursor-pointer"
          >
            <option value="">All Verification Status</option>
            <option value="true">Verified Profile</option>
            <option value="false">Pending Profile</option>
          </select>
        </div>

        {/* Companies Grid */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">
              {pagination.totalItems || 0} companies found
            </p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16"><PageSpinner /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    {['Company', 'Industry', 'HR Recruiter', 'Contact Info', 'Verification', 'Account State', 'Actions'].map(h => (
                      <th key={h} className="px-5 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {companies.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-20 text-center text-slate-400 text-sm font-medium">
                        <Building2 className="w-10 h-10 mx-auto text-slate-300 mb-3" />
                        No companies found
                      </td>
                    </tr>
                  )}
                  {companies.map((c, i) => {
                    const companyUser = c.userId || {}
                    const isVerified = c.isVerified || false
                    const isActive = companyUser.isActive !== false

                    return (
                      <motion.tr 
                        key={c._id || i} 
                        initial={{ opacity: 0, y: 5 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        transition={{ delay: i * 0.02 }}
                        className="border-t border-slate-100 hover:bg-slate-50/50 transition-colors"
                      >
                        {/* Company Card Block */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3.5">
                            {c.logoUrl ? (
                              <img src={c.logoUrl} alt="Logo" className="w-9 h-9 rounded-xl object-cover border border-slate-100 shadow-sm" />
                            ) : (
                              <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center flex-shrink-0 overflow-hidden p-1.5">
                                <img src="/icon_company.svg" alt={c.companyName || companyUser.name} className="w-full h-full object-contain" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-slate-800 truncate max-w-[200px]">
                                {c.companyName || companyUser.name || '—'}
                              </p>
                              {c.website ? (
                                <a 
                                  href={c.website.startsWith('http') ? c.website : `https://${c.website}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="text-xs text-indigo-500 hover:text-indigo-600 hover:underline flex items-center gap-1.5 mt-0.5"
                                >
                                  <Globe className="w-3 h-3 flex-shrink-0" />
                                  <span className="truncate max-w-[150px]">{c.website}</span>
                                </a>
                              ) : (
                                <span className="text-xs text-slate-400">No website listed</span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Industry */}
                        <td className="px-5 py-4">
                          <span className="bg-slate-100/80 text-slate-600 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200/50">
                            {c.industry || 'IT & Tech'}
                          </span>
                        </td>

                        {/* HR Recruiter */}
                        <td className="px-5 py-4 text-sm text-slate-700">
                          <div>
                            <p className="font-semibold text-slate-800 leading-tight">{c.hrName || companyUser.name || '—'}</p>
                            <p className="text-[11px] text-slate-400 truncate max-w-[180px] mt-0.5">{companyUser.email}</p>
                          </div>
                        </td>

                        {/* Contact Info */}
                        <td className="px-5 py-4 text-xs text-slate-600">
                          <div className="space-y-1">
                            <p className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-slate-400" />{c.hrContact || '—'}</p>
                            <p className="flex items-center gap-1.5 truncate max-w-[200px]" title={c.address}><MapPin className="w-3.5 h-3.5 text-slate-400" />{c.address || '—'}</p>
                          </div>
                        </td>

                        {/* Profile Verification Badge */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          {isVerified ? (
                            <span className="inline-flex items-center gap-1.5 text-xs text-green-600 font-bold px-2.5 py-1 rounded-full bg-green-50 border border-green-200">
                              <CheckCircle className="w-3.5 h-3.5" />
                              Approved
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs text-amber-600 font-bold px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200">
                              <XCircle className="w-3.5 h-3.5 animate-pulse" />
                              Pending Approval
                            </span>
                          )}
                        </td>

                        {/* User Account State */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          {isActive ? (
                            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 font-bold px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200">
                              Active Recruiter
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs text-rose-600 font-bold px-2.5 py-1 rounded-full bg-rose-50 border border-rose-200">
                              Deactivated
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <button 
                              onClick={() => setSelectedCompany(c)}
                              title="View Details"
                              className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 hover:text-slate-800 text-slate-500 transition-all border border-slate-100"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => verifyCompanyMut.mutate({ id: c._id, isVerified: !isVerified })}
                              title={isVerified ? 'Revoke Approval / Unverify' : 'Approve Profile'}
                              className={`p-2 rounded-xl transition-all border ${
                                isVerified 
                                  ? 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-amber-50 hover:border-amber-200 hover:text-amber-600' 
                                  : 'bg-green-500/10 border-green-500/10 hover:bg-green-500 text-green-500 hover:text-white hover:border-green-500 shadow shadow-green-500/5'
                              }`}
                            >
                              <UserCheck className="w-4 h-4" />
                            </button>
                            {companyUser._id && (
                              <button 
                                onClick={() => toggleUserMut.mutate(companyUser._id)}
                                title={isActive ? 'Deactivate Recruiter Account' : 'Activate Recruiter Account'}
                                className={`p-2 rounded-xl transition-all border ${
                                  isActive 
                                    ? 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600' 
                                    : 'bg-emerald-500/10 border-emerald-500/10 hover:bg-emerald-500 text-emerald-600 hover:text-white hover:border-emerald-500 shadow shadow-emerald-500/5'
                                }`}
                              >
                                <UserX className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="px-5 py-3.5 border-t border-slate-100 flex items-center justify-between">
              <p className="text-xs text-slate-400 font-medium">
                Page {pagination.currentPage} of {pagination.totalPages} · {pagination.totalItems} results
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
                <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Company Profile Details Modal Drawer */}
      <Modal 
        open={!!selectedCompany} 
        onClose={() => setSelectedCompany(null)}
        title="Company Information Profile"
        footer={
          <div className="flex items-center justify-between w-full">
            <div className="flex gap-2">
              {selectedCompany && (
                <>
                  <Button 
                    variant={selectedCompany.isVerified ? 'outline' : 'solid'}
                    onClick={() => {
                      verifyCompanyMut.mutate({ id: selectedCompany._id, isVerified: !selectedCompany.isVerified })
                      setSelectedCompany(null)
                    }}
                    className={!selectedCompany.isVerified ? 'bg-green-600 hover:bg-green-700 text-white' : ''}
                  >
                    {selectedCompany.isVerified ? 'Reject Approval' : 'Approve Company'}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      if (selectedCompany.userId?._id) {
                        toggleUserMut.mutate(selectedCompany.userId._id)
                      }
                      setSelectedCompany(null)
                    }}
                    className="text-rose-600 hover:bg-rose-50 border-rose-100 hover:border-rose-200"
                  >
                    {selectedCompany.userId?.isActive !== false ? 'Deactivate Recruiter' : 'Activate Recruiter'}
                  </Button>
                </>
              )}
            </div>
            <Button variant="outline" onClick={() => setSelectedCompany(null)}>Close</Button>
          </div>
        }
      >
        {selectedCompany && (
          <div className="space-y-6">
            {/* Header Identity card */}
            <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
              {selectedCompany.logoUrl ? (
                <img src={selectedCompany.logoUrl} alt="Logo" className="w-14 h-14 rounded-2xl object-cover border border-white shadow" />
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-600 text-lg font-bold flex items-center justify-center border border-indigo-100">
                  {getInitials(selectedCompany.companyName)}
                </div>
              )}
              <div className="min-w-0">
                <h4 className="text-base font-bold text-slate-800 leading-tight">
                  {selectedCompany.companyName}
                </h4>
                <p className="text-xs text-indigo-500 font-bold tracking-wider mt-1">{selectedCompany.industry || 'IT & Tech'}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                    selectedCompany.isVerified 
                      ? 'bg-green-50 text-green-600 border-green-200' 
                      : 'bg-amber-50 text-amber-600 border-amber-200'
                  }`}>
                    {selectedCompany.isVerified ? 'Approved Profile' : 'Pending Verification'}
                  </span>
                  <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                    selectedCompany.userId?.isActive !== false 
                      ? 'bg-emerald-50 text-emerald-600 border-emerald-200' 
                      : 'bg-rose-50 text-rose-600 border-rose-200'
                  }`}>
                    {selectedCompany.userId?.isActive !== false ? 'Active Account' : 'Account Deactivated'}
                  </span>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">About the Company</p>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                {selectedCompany.description || 'No corporate description provided yet.'}
              </p>
            </div>

            {/* Contact Grid details */}
            <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">HR Manager Name</p>
                <p className="text-xs font-bold text-slate-700">{selectedCompany.hrName || 'Not listed'}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">HR Recruiter Contact</p>
                <p className="text-xs font-bold text-slate-700">{selectedCompany.hrContact || 'Not listed'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Corporate Email Address</p>
                <p className="text-xs font-bold text-slate-700">{selectedCompany.userId?.email || '—'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Corporate Address</p>
                <p className="text-xs font-semibold text-slate-700">{selectedCompany.address || 'Not listed'}</p>
              </div>
            </div>

            {/* Timestamps */}
            <div className="border-t border-slate-100 pt-4 flex justify-between text-[10px] text-slate-400 font-bold">
              <span>Registered: {new Date(selectedCompany.createdAt).toLocaleDateString()}</span>
              {selectedCompany.userId?.lastLogin && (
                <span>Last active: {new Date(selectedCompany.userId.lastLogin).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
              )}
            </div>
          </div>
        )}
      </Modal>
    </AppLayout>
  )
}
