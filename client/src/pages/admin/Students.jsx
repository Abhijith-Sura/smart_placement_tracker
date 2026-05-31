import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Search, Upload, CheckCircle, XCircle, UserCheck, UserX, Filter, Download, FileText } from 'lucide-react'
import AppLayout from '../../components/layout/AppLayout'
import { PageSpinner } from '../../components/ui/Spinner'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import API from '../../api/axios'
import toast from 'react-hot-toast'
import PageBanner from '../../components/ui/PageBanner'

const BRANCHES  = ['CSE','ECE','ME','CE','MBA','EEE','IT']
const STATUSES  = ['','placed','not_placed']

export default function Students() {
  const qc = useQueryClient()
  const fileRef = useRef()

  const [search,    setSearch]    = useState('')
  const [branch,    setBranch]    = useState('')
  const [status,    setStatus]    = useState('')
  const [cgpaMin,   setCgpaMin]   = useState('')
  const [page,      setPage]      = useState(1)
  const [bulkOpen,  setBulkOpen]  = useState(false)
  const [file,      setFile]      = useState(null)
  const [uploadRes, setUploadRes] = useState(null)
  
  const [activeSubTab, setActiveSubTab] = useState('directory') // 'directory' or 'queue'
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [feedbackInput, setFeedbackInput] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-students', search, branch, status, cgpaMin, page],
    queryFn: () => API.get('/admin/students', { params: { search, branch, status, cgpaMin, page, limit: 15 } }).then(r => r.data),
    keepPreviousData: true,
  })

  const verifyMut = useMutation({
    mutationFn: ({ id, isVerified }) => API.patch(`/admin/verify-user/${id}`, { isVerified }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-students'] }); toast.success('User verification updated') },
    onError:   () => toast.error('Failed to update'),
  })

  const toggleMut = useMutation({
    mutationFn: (id) => API.patch(`/admin/toggle-user/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-students'] }); toast.success('User status toggled') },
    onError:   () => toast.error('Failed to toggle'),
  })

  const uploadMut = useMutation({
    mutationFn: (fd) => API.post('/admin/bulk-upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } }),
    onSuccess: (res) => { setUploadRes(res.data); qc.invalidateQueries({ queryKey: ['admin-students'] }); toast.success(res.data.message) },
    onError:   (e)  => toast.error(e.response?.data?.message || 'Upload failed'),
  })

  const handleUpload = () => {
    if (!file) return toast.error('Please select a file')
    const fd = new FormData()
    fd.append('file', file)
    uploadMut.mutate(fd)
  }

  const { data: pendingData, isLoading: isPendingLoading } = useQuery({
    queryKey: ['pending-verifications'],
    queryFn: () => API.get('/admin/verifications/pending').then(r => r.data),
    enabled: activeSubTab === 'queue'
  })

  const reviewMut = useMutation({
    mutationFn: ({ profileId, status, feedback }) => API.patch(`/admin/verifications/${profileId}/review`, { status, feedback }),
    onSuccess: () => { 
      qc.invalidateQueries({ queryKey: ['pending-verifications'] })
      qc.invalidateQueries({ queryKey: ['admin-students'] })
      toast.success('Verification status updated!')
      setSelectedRequest(null)
      setFeedbackInput('')
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to update verification status'),
  })

  const students   = data?.students    || []
  const pagination = data?.pagination  || {}

  const initials = (name = '') => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2)

  return (
    <AppLayout title="Students" subtitle="Manage & verify student records">
      <div className="space-y-5">

        <PageBanner
          title="Student Directory"
          subtitle="Browse and manage all registered students, review profiles, and track placement eligibility."
          badge="Student Directory"
          badgeColor="bg-violet-50 text-violet-700 border-violet-100"
          gradient="violet"
        />

        {/* Sub-Tabs Switcher */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveSubTab('directory')}
            className={`px-5 py-3 text-sm font-bold border-b-2 transition-all ${
              activeSubTab === 'directory'
                ? 'border-violet-500 text-violet-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Student Directory
          </button>
          <button
            onClick={() => setActiveSubTab('queue')}
            className={`px-5 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeSubTab === 'queue'
                ? 'border-violet-500 text-violet-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Verification Queue
            {pendingData?.profiles?.length > 0 && (
              <span className="bg-violet-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                {pendingData.profiles.length}
              </span>
            )}
          </button>
        </div>

        {activeSubTab === 'directory' ? (
          <>
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 flex-1 min-w-52">
                <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
                  placeholder="Search by name, email, roll no…"
                  className="text-sm outline-none w-full text-slate-700 placeholder:text-slate-400 bg-transparent" />
              </div>

              <select value={branch} onChange={e => { setBranch(e.target.value); setPage(1) }}
                className="text-sm border border-slate-200 rounded-xl px-3.5 py-2.5 bg-white text-slate-700 outline-none focus:border-violet-400">
                <option value="">All Branches</option>
                {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
              </select>

              <select value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}
                className="text-sm border border-slate-200 rounded-xl px-3.5 py-2.5 bg-white text-slate-700 outline-none focus:border-violet-400">
                <option value="">All Status</option>
                <option value="placed">Placed</option>
                <option value="not_placed">Not Placed</option>
              </select>

              <input type="number" value={cgpaMin} onChange={e => { setCgpaMin(e.target.value); setPage(1) }}
                placeholder="Min CGPA" min={0} max={10} step={0.1}
                className="w-28 text-sm border border-slate-200 rounded-xl px-3.5 py-2.5 bg-white text-slate-700 outline-none focus:border-violet-400" />

              <Button onClick={() => setBulkOpen(true)} icon={<Upload className="w-4 h-4" />}>
                Bulk Upload
              </Button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-700">
                  {pagination.totalItems || 0} students found
                </p>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-16"><PageSpinner /></div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        {['Student','Roll No','Branch','CGPA','Backlogs','Status','Account','Verification','Actions'].map(h => (
                          <th key={h} className="px-4 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {students.length === 0 && (
                        <tr><td colSpan={9} className="py-16 text-center text-slate-400 text-sm">No students found</td></tr>
                      )}
                      {students.map((s, i) => (
                        <motion.tr key={s._id || i} initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay: i*0.02 }}
                          className="border-t border-slate-50 hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-violet-50 border border-violet-100 flex items-center justify-center flex-shrink-0 overflow-hidden p-1">
                                <img src="/icon_student.svg" alt={s.user?.name} className="w-full h-full object-contain" />
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                                  {s.user?.name || '—'}
                                  {s.verificationStatus === 'verified' && (
                                    <span className="text-emerald-500" title="Verified Credentials">
                                      <CheckCircle className="w-3.5 h-3.5 fill-emerald-50" />
                                    </span>
                                  )}
                                </p>
                                <p className="text-xs text-slate-400 truncate max-w-40">{s.user?.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-sm text-slate-650">{s.rollNo || '—'}</td>
                          <td className="px-4 py-3.5">
                            <span className="bg-slate-100 text-slate-650 text-xs font-semibold px-2.5 py-1 rounded-lg">{s.branch || '—'}</span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={`text-sm font-bold ${parseFloat(s.CGPA) >= 7.5 ? 'text-green-600' : parseFloat(s.CGPA) >= 6 ? 'text-amber-600' : 'text-red-500'}`}>
                              {s.CGPA ?? '—'}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-sm text-slate-600">{s.backlogs ?? '—'}</td>
                          <td className="px-4 py-3.5"><Badge status={s.placementStatus === 'placed' ? 'placed' : 'not_placed'} /></td>
                          <td className="px-4 py-3.5">
                            {s.user?.isVerified
                              ? <span className="flex items-center gap-1.5 text-xs text-green-600 font-semibold"><CheckCircle className="w-3.5 h-3.5" />Verified</span>
                              : <span className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold"><XCircle className="w-3.5 h-3.5" />Pending</span>}
                          </td>
                          <td className="px-4 py-3.5">
                            {s.verificationStatus === 'verified' && (
                              <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-lg border border-emerald-150">Verified</span>
                            )}
                            {s.verificationStatus === 'pending' && (
                              <span className="bg-blue-50 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-lg border border-blue-150 animate-pulse">Pending Review</span>
                            )}
                            {s.verificationStatus === 'rejected' && (
                              <span className="bg-rose-50 text-rose-700 text-xs font-bold px-2 py-0.5 rounded-lg border border-rose-150">Rejected</span>
                            )}
                            {(!s.verificationStatus || s.verificationStatus === 'unverified') && (
                              <span className="bg-slate-50 text-slate-500 text-xs font-bold px-2 py-0.5 rounded-lg border border-slate-200">Unverified</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2">
                              <button onClick={() => verifyMut.mutate({ id: s.user?._id, isVerified: !s.user?.isVerified })}
                                title={s.user?.isVerified ? 'Unverify Account' : 'Verify Account'}
                                className="p-1.5 rounded-lg hover:bg-green-50 text-slate-400 hover:text-green-600 transition-colors">
                                <UserCheck className="w-4 h-4" />
                              </button>
                              <button onClick={() => toggleMut.mutate(s.user?._id)}
                                title={s.user?.isActive ? 'Deactivate Account' : 'Activate Account'}
                                className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-550 transition-colors">
                                <UserX className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="px-5 py-3.5 border-t border-slate-100 flex items-center justify-between">
                  <p className="text-xs text-slate-400">
                    Page {pagination.currentPage} of {pagination.totalPages} · {pagination.totalItems} results
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
                    <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          /* Verification Queue tab content */
          <div>
            {isPendingLoading ? (
              <div className="flex items-center justify-center py-16 bg-white rounded-2xl border border-slate-100 shadow-sm"><PageSpinner /></div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-700">
                    {(pendingData?.profiles || []).length} profiles awaiting verification
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        {['Student','Roll No','Branch','CGPA','Documents','Submitted','Actions'].map(h => (
                          <th key={h} className="px-4 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(pendingData?.profiles || []).length === 0 && (
                        <tr><td colSpan={7} className="py-20 text-center text-slate-400 text-sm font-medium">All student profiles verified! Verification queue is empty.</td></tr>
                      )}
                      {(pendingData?.profiles || []).map((profile, i) => (
                        <tr key={profile._id || i} className="border-t border-slate-50 hover:bg-slate-50 transition-colors text-sm text-slate-700">
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-violet-50 border border-violet-100 flex items-center justify-center flex-shrink-0 overflow-hidden p-1">
                                <img src="/icon_student.svg" alt={profile.userId?.name} className="w-full h-full object-contain" />
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-slate-800">{profile.userId?.name || '—'}</p>
                                <p className="text-xs text-slate-400 truncate max-w-40">{profile.userId?.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 font-bold text-slate-650">{profile.rollNo || '—'}</td>
                          <td className="px-4 py-3.5">
                            <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2 py-0.5 rounded-lg">{profile.branch}</span>
                          </td>
                          <td className="px-4 py-3.5 font-bold text-slate-850">{profile.CGPA}</td>
                          <td className="px-4 py-3.5 text-xs font-bold text-violet-600 bg-violet-50/55 border border-violet-100/50 rounded-lg px-2 py-1 inline-block mt-1">
                            {profile.verificationDocuments?.length || 0} file(s)
                          </td>
                          <td className="px-4 py-3.5 text-xs font-semibold text-slate-455">
                            {new Date(profile.updatedAt).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3.5">
                            <button
                              onClick={() => {
                                setSelectedRequest(profile)
                                setFeedbackInput('')
                              }}
                              className="px-3.5 py-1.5 bg-violet-50 hover:bg-violet-500 text-violet-600 hover:text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1"
                            >
                              <FileText className="w-3.5 h-3.5" /> Review
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bulk Upload Modal */}
      <Modal open={bulkOpen} onClose={() => { setBulkOpen(false); setFile(null); setUploadRes(null) }}
        title="Bulk Upload Students"
        footer={
          <>
            <Button variant="outline" onClick={() => { setBulkOpen(false); setFile(null); setUploadRes(null) }}>Cancel</Button>
            <Button onClick={handleUpload} loading={uploadMut.isPending}>Upload</Button>
          </>
        }>
        <div className="space-y-4">
          <p className="text-sm text-slate-500">Upload an Excel (.xlsx) or CSV file with columns: Name, Email, RollNo, Branch, Year, CGPA, Backlogs, Skills, Phone</p>

          {/* Dropzone */}
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); setFile(e.dataTransfer.files[0]) }}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors ${file ? 'border-violet-400 bg-violet-50' : 'border-slate-200 hover:border-violet-300 hover:bg-violet-50'}`}
          >
            <Upload className="w-8 h-8 mx-auto text-slate-400 mb-3" />
            {file
              ? <p className="text-sm font-semibold text-violet-600"><FileText className="w-4 h-4 inline mr-1" />{file.name}</p>
              : <>
                  <p className="text-sm font-semibold text-slate-700">Click to upload or drag & drop</p>
                  <p className="text-xs text-slate-400 mt-1">.xlsx or .csv only</p>
                </>
            }
            <input ref={fileRef} type="file" accept=".xlsx,.csv" className="hidden" onChange={e => setFile(e.target.files[0])} />
          </div>

          {/* Upload results */}
          {uploadRes && (
            <div className="bg-green-50 rounded-xl p-4 border border-green-200">
              <p className="text-sm font-bold text-green-700 mb-2 flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Upload Complete</p>
              <div className="flex gap-4 text-sm">
                <span className="text-green-600">Created: <strong>{uploadRes.results?.created}</strong></span>
                <span className="text-amber-600">Skipped: <strong>{uploadRes.results?.skipped}</strong></span>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Verification Review Modal */}
      {selectedRequest && (
        <Modal
          open={!!selectedRequest}
          onClose={() => setSelectedRequest(null)}
          title={`Verify Profile: ${selectedRequest.userId?.name}`}
          footer={
            <div className="flex gap-2 justify-end w-full">
              <Button variant="outline" onClick={() => setSelectedRequest(null)}>Close</Button>
              <button
                onClick={() => reviewMut.mutate({ profileId: selectedRequest._id, status: 'verified' })}
                disabled={reviewMut.isPending}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-bold flex items-center gap-1.5 disabled:opacity-60 transition-colors shadow-sm"
              >
                <CheckCircle className="w-4 h-4" /> Approve & Verify
              </button>
            </div>
          }
        >
          <div className="space-y-6">
            {/* Student Info Card */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 grid grid-cols-2 gap-4 text-sm text-slate-700">
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Student Name</p>
                <p className="font-bold text-slate-800 mt-0.5">{selectedRequest.userId?.name}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Roll Number</p>
                <p className="font-bold text-slate-800 mt-0.5">{selectedRequest.rollNo}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Branch</p>
                <p className="font-bold text-slate-800 mt-0.5">{selectedRequest.branch}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">CGPA</p>
                <p className="font-bold text-slate-800 mt-0.5">{selectedRequest.CGPA}</p>
              </div>
            </div>

            {/* Document Locker Files */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-bold">Uploaded Documents</h4>
              <div className="space-y-2">
                {selectedRequest.verificationDocuments?.map(doc => (
                  <div key={doc._id} className="flex items-center justify-between bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4.5 h-4.5 text-violet-500 shrink-0" />
                      <span className="text-sm font-bold text-slate-800">{doc.name}</span>
                    </div>
                    <a
                      href={doc.fileUrl.startsWith('http') ? doc.fileUrl : `${import.meta.env.VITE_API_URL?.replace('/api','') || 'http://localhost:5000'}${doc.fileUrl.startsWith('/') ? '' : '/'}${doc.fileUrl.replace(/\\/g, '/')}`}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="px-3 py-1.5 rounded-lg text-xs font-bold text-violet-500 hover:text-violet-600 bg-violet-50 hover:bg-violet-100 border border-violet-100 transition-colors shadow-xs"
                    >
                      View File
                    </a>
                  </div>
                ))}
              </div>
            </div>

            {/* Reject Section */}
            <div className="border-t border-slate-100 pt-5 space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-bold">Reject Request</h4>
              <textarea
                placeholder="Enter reason for rejection (e.g. CGPA mismatch on transcript, transcript scan is blurry)..."
                rows="3"
                value={feedbackInput}
                onChange={e => setFeedbackInput(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-4 focus:ring-rose-500/10 focus:border-rose-450 outline-none transition-all"
              />
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    if (!feedbackInput.trim()) return toast.error('Please enter feedback/rejection reason')
                    reviewMut.mutate({ profileId: selectedRequest._id, status: 'rejected', feedback: feedbackInput.trim() })
                  }}
                  disabled={reviewMut.isPending}
                  className="px-4 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 disabled:opacity-60 transition-colors shadow-sm cursor-pointer"
                >
                  <XCircle className="w-4 h-4" /> Reject & Request Re-upload
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </AppLayout>
  )
}
