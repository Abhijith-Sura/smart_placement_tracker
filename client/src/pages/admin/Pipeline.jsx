import { useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  closestCorners, useDroppable,
} from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ArrowLeft, Download, FileText, CheckCircle, Calendar, Clock, Video, X, Trash2, Plus, Brain, Award, AlertTriangle, Lightbulb, Sparkles, BookOpen } from 'lucide-react'
import AppLayout from '../../components/layout/AppLayout'
import { PageSpinner } from '../../components/ui/Spinner'
import Badge from '../../components/ui/Badge'
import PageBanner from '../../components/ui/PageBanner'
import API from '../../api/axios'
import toast from 'react-hot-toast'
import { useAuth } from '../../hooks/useAuth'

const COLUMNS = [
  { id: 'applied',     label: 'Applied',     color: 'border-blue-400',   badge: 'bg-blue-100 text-blue-700',   header: 'bg-blue-50' },
  { id: 'shortlisted', label: 'Shortlisted', color: 'border-amber-400',  badge: 'bg-amber-100 text-amber-700', header: 'bg-amber-50' },
  { id: 'interview',   label: 'Interview',   color: 'border-purple-400', badge: 'bg-purple-100 text-purple-700',header: 'bg-purple-50' },
  { id: 'selected',    label: 'Selected',    color: 'border-green-400',  badge: 'bg-green-100 text-green-700', header: 'bg-green-50' },
  { id: 'rejected',    label: 'Rejected',    color: 'border-red-400',    badge: 'bg-red-100 text-red-700',     header: 'bg-red-50' },
]

const initials = (name = '') => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2)

/* ── Sortable Application Card ─────────────────────────────── */
function AppCard({ app, overlay = false, userRole, onShowFitment }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: app._id })
  const style = { transform: CSS.Transform.toString(transform), transition }

  const student = app.studentId || {}
  const profile = app.profileSnapshot || {}

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}
      className={`bg-white rounded-xl border border-slate-100 p-3.5 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-all select-none
        ${isDragging ? 'opacity-40 ring-2 ring-violet-400' : ''}
        ${overlay ? 'shadow-xl ring-2 ring-violet-500 rotate-1 scale-105' : ''}`}>
      <div className="flex items-center gap-2.5 mb-2">
        <div className="w-8 h-8 rounded-lg bg-violet-50 border border-violet-100 flex items-center justify-center flex-shrink-0 overflow-hidden p-1">
          <img src="/icon_student.svg" alt={student.name} className="w-full h-full object-contain" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-800 truncate flex items-center gap-1.5">
            {student.name || '—'}
            {student.studentProfile?.verificationStatus === 'verified' && (
              <span className="text-emerald-500 shrink-0" title="Verified Profile">
                <CheckCircle className="w-3.5 h-3.5 fill-emerald-550/10" />
              </span>
            )}
          </p>
          <p className="text-xs text-slate-400 truncate">{profile.rollNo || student.email || '—'}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 items-center">
        {profile.branch && (
          <span className="bg-violet-50 text-violet-600 text-xs font-semibold px-2 py-0.5 rounded-md">{profile.branch}</span>
        )}
        {profile.CGPA > 0 && (
          <span className="bg-green-50 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-md">{profile.CGPA} CGPA</span>
        )}
        {app.aiMatchScore > 0 && (
          <button
            onPointerDown={e => e.stopPropagation()}
            onClick={() => onShowFitment(app)}
            className={`px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all hover:scale-105 ${
              app.aiMatchScore >= 80 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
              app.aiMatchScore >= 55 ? 'bg-amber-50 text-amber-700 border border-amber-200' :
              'bg-slate-50 text-slate-700 border border-slate-200'
            }`}
            title="Click to view AI Fitment details"
          >
            🤖 {app.aiMatchScore}%
          </button>
        )}
      </div>
      
      {/* Rounds status summary */}
      <div className="mt-2.5 text-xs font-semibold">
        {app.rounds && app.rounds.length > 0 ? (
          (() => {
            const latestRound = app.rounds[app.rounds.length - 1];
            return (
              <div className="flex items-center gap-1.5 text-slate-600 bg-slate-50 border border-slate-100 rounded-lg p-2">
                <span className="truncate font-bold text-[11px] text-slate-700">{latestRound.name}</span>
                <span className={`ml-auto px-1.5 py-0.5 text-[9px] font-black uppercase rounded ${
                  latestRound.status === 'pass' ? 'bg-emerald-50 text-emerald-600' :
                  latestRound.status === 'fail' ? 'bg-rose-50 text-rose-600' :
                  latestRound.status === 'scheduled' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500'
                }`}>
                  {latestRound.status}
                </span>
              </div>
            );
          })()
        ) : (
          <div className="text-[10px] text-slate-400 font-bold bg-slate-50 border border-slate-100 border-dashed rounded-lg p-2 text-center">
            Pending Round/Assessment Scheduling
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100" onPointerDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
        <span className="text-[10px] text-slate-400 font-bold">{new Date(app.createdAt).toLocaleDateString('en-IN')}</span>
        <Link 
          to={`${userRole === 'admin' ? '/admin' : '/company'}/applications/${app._id}/rounds`}
          className="text-xs font-bold text-violet-500 hover:text-violet-600 flex items-center gap-0.5 cursor-pointer"
        >
          Rounds &rarr;
        </Link>
      </div>
    </div>
  )
}

/* ── Droppable Column ──────────────────────────────────────── */
function KanbanColumn({ col, apps, userRole, onShowFitment }) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id })

  return (
    <div className="flex flex-col min-w-[248px] max-w-[260px]">
      {/* Column header */}
      <div className={`flex items-center justify-between px-3.5 py-2.5 rounded-t-xl border border-b-0 ${col.color} ${col.header}`}>
        <span className="text-sm font-bold text-slate-800">{col.label}</span>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${col.badge}`}>{apps.length}</span>
      </div>

      {/* Droppable body */}
      <div ref={setNodeRef}
        className={`flex-1 min-h-48 p-2 rounded-b-xl border border-t-0 border-slate-200 flex flex-col gap-2 transition-colors ${isOver ? 'bg-violet-50 border-violet-300' : 'bg-slate-50'}`}>
        <SortableContext items={apps.map(a => a._id)} strategy={verticalListSortingStrategy}>
          {apps.map(app => <AppCard key={app._id} app={app} userRole={userRole} onShowFitment={onShowFitment} />)}
        </SortableContext>
        {apps.length === 0 && (
          <div className="flex-1 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-xs text-center p-4">
            Drop cards here
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Main Pipeline Page ────────────────────────────────────── */
export default function Pipeline() {
  const { jobId } = useParams()
  const { user } = useAuth()
  const qc = useQueryClient()
  const [activeApp, setActiveApp] = useState(null)
  const [selectedAppForFitment, setSelectedAppForFitment] = useState(null)
  const [skillQuery, setSkillQuery] = useState('')
  
  // Slots Drawer State
  const [showSlotsDrawer, setShowSlotsDrawer] = useState(false)
  const [slotDateTime, setSlotDateTime] = useState('')
  const [slotDuration, setSlotDuration] = useState(45)
  const [slotRoundName, setSlotRoundName] = useState('Technical Interview')
  const [slotMeetingLink, setSlotMeetingLink] = useState('')

  const { data: slotsData, refetch: refetchSlots } = useQuery({
    queryKey: ['slots', jobId],
    queryFn: () => API.get(`/slots/job/${jobId}`).then(r => r.data),
    enabled: !!showSlotsDrawer,
  })

  const createSlotsMut = useMutation({
    mutationFn: (newSlots) => API.post(`/slots/job/${jobId}`, { slots: newSlots }),
    onSuccess: () => {
      refetchSlots()
      toast.success('Interview slots created successfully')
      setSlotDateTime('')
      setSlotMeetingLink('')
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to create slots')
    }
  })

  const deleteSlotMut = useMutation({
    mutationFn: (slotId) => API.delete(`/slots/${slotId}`),
    onSuccess: () => {
      refetchSlots()
      toast.success('Interview slot deleted')
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to delete slot')
    }
  })

  const handleCreateSlotSubmit = (e) => {
    e.preventDefault()
    if (!slotDateTime) return
    createSlotsMut.mutate([
      {
        dateTime: slotDateTime,
        duration: slotDuration,
        roundName: slotRoundName,
        meetingLink: slotMeetingLink,
      }
    ])
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const { data: jobData } = useQuery({
    queryKey: ['job', jobId],
    queryFn: () => API.get(`/jobs/${jobId}`).then(r => r.data),
  })

  const { data: appsData, isLoading } = useQuery({
    queryKey: ['pipeline', jobId],
    queryFn: () => API.get(`/applications/job/${jobId}`).then(r => r.data),
  })

  const statusMut = useMutation({
    mutationFn: ({ id, status }) => API.patch(`/applications/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pipeline', jobId] }),
    onError:   () => toast.error('Failed to update status'),
  })

  const handleExport = async () => {
    const toastId = toast.loading('Exporting pipeline…')
    try {
      const res = await API.get(`/applications/job/${jobId}/export`, { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a   = document.createElement('a')
      a.href     = url
      a.download = `pipeline_${job?.role || jobId}_${Date.now()}.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('Export complete!', { id: toastId })
    } catch {
      toast.error('Export failed', { id: toastId })
    }
  }

  const apps = appsData?.applications || []

  // Filter apps by comma-separated skills
  const filteredApps = apps.filter(app => {
    if (!skillQuery.trim()) return true
    const searchTerms = skillQuery.toLowerCase().split(',').map(s => s.trim()).filter(Boolean)
    const studentProfile = app.studentId?.studentProfile || app.profileSnapshot || {}
    const skills = (studentProfile.skills || []).map(s => s.toLowerCase())
    return searchTerms.every(term => skills.some(s => s.includes(term)))
  })

  // Group by status
  const grouped = useCallback(() => {
    const map = {}
    COLUMNS.forEach(c => { map[c.id] = [] })
    filteredApps.forEach(a => { if (map[a.status]) map[a.status].push(a) })
    return map
  }, [filteredApps])()

  const handleDragStart = ({ active }) => {
    const app = apps.find(a => a._id === active.id)
    setActiveApp(app || null)
  }

  const handleDragEnd = ({ active, over }) => {
    setActiveApp(null)
    if (!over || !active) return
    const colIds = COLUMNS.map(c => c.id)
    // over.id may be the column id or another card id — find column
    let newStatus = colIds.includes(over.id) ? over.id : null
    if (!newStatus) {
      // find which column the target card is in
      for (const [col, list] of Object.entries(grouped)) {
        if (list.find(a => a._id === over.id)) { newStatus = col; break }
      }
    }
    const app = apps.find(a => a._id === active.id)
    if (!app || !newStatus || app.status === newStatus) return
    statusMut.mutate({ id: app._id, status: newStatus })
  }

  const job = jobData?.job
  const userRole = user?.user?.role || user?.role || 'admin'
  const backPath = userRole === 'admin' ? '/admin/jobs' : '/company/jobs'

  // Calculate AI Fitment feedback properties safely
  let feedbackObj = null
  if (selectedAppForFitment?.aiMatchFeedback) {
    try {
      feedbackObj = typeof selectedAppForFitment.aiMatchFeedback === 'string'
        ? JSON.parse(selectedAppForFitment.aiMatchFeedback)
        : selectedAppForFitment.aiMatchFeedback
    } catch (e) {
      feedbackObj = {
        atsScore: selectedAppForFitment.aiMatchScore || 0,
        overallFeedback: selectedAppForFitment.aiMatchFeedback,
        strengths: [],
        weaknesses: [],
        missingSkills: [],
        keywordMatches: [],
        suggestions: []
      }
    }
  }

  if (isLoading) return <AppLayout title="Pipeline"><PageSpinner /></AppLayout>

  return (
    <AppLayout title={`Pipeline — ${job?.role || ''}`} subtitle={job?.companyName}>
      <div className="space-y-5">

        <PageBanner
          title={job ? `${job.role} — Pipeline` : 'Placement Pipeline'}
          subtitle={job ? `Drag-and-drop applicant pipeline for ${job.companyName}. Move candidates across stages in real time.` : 'Manage recruitment pipeline stages for this job drive.'}
          badge="Live Pipeline"
          badgeColor="bg-violet-50 text-violet-700 border-violet-100"
          compact
          gradient="violet"
          actions={
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500 font-medium mr-2">{apps.length} applicants</span>
              <button onClick={() => setShowSlotsDrawer(true)} className="flex items-center gap-1.5 text-sm font-semibold bg-white border border-slate-200 px-3.5 py-2 rounded-xl hover:bg-slate-50 transition-colors text-slate-700">
                <Calendar className="w-4 h-4 text-violet-500" />Slots
              </button>
              <button onClick={handleExport} className="flex items-center gap-1.5 text-sm font-semibold bg-white border border-slate-200 px-3.5 py-2 rounded-xl hover:bg-slate-50 transition-colors text-slate-700">
                <Download className="w-4 h-4" />Export
              </button>
            </div>
          }
        />

        {/* AI Sourcing & Skill Filter Bar */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col md:flex-row items-stretch md:items-center gap-3">
          <div className="flex-1 relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-slate-400">
              <Brain className="w-4 h-4 text-violet-500" />
              <span className="text-xs font-black bg-violet-100 text-violet-600 px-1.5 py-0.5 rounded">AI SOURCING</span>
            </div>
            <input
              type="text"
              placeholder="Source candidates by tech skills (e.g. React, Node.js, Python)..."
              value={skillQuery}
              onChange={e => setSkillQuery(e.target.value)}
              className="w-full pl-36 pr-10 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-500/10 transition-all font-semibold"
            />
            {skillQuery && (
              <button 
                onClick={() => setSkillQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {skillQuery && (
            <div className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-violet-50 border border-violet-100 shrink-0">
              <span className="text-sm font-black text-violet-600">{filteredApps.length}</span>
              <span className="text-xs text-violet-500 font-semibold">matching profiles</span>
            </div>
          )}
        </div>

        {/* Top bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to={backPath} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 bg-white border border-slate-200 px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors">
              <ArrowLeft className="w-4 h-4" />Back
            </Link>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse-live" />
              <span className="text-xs font-semibold text-green-600">Live</span>
            </div>
          </div>
        </div>

        {/* Kanban Board — scrollable horizontally, breaks out of padding */}
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-6 -mx-6 px-6 lg:-mx-8 lg:px-8">
            {COLUMNS.map(col => (
              <KanbanColumn key={col.id} col={col} apps={grouped[col.id] || []} userRole={userRole} onShowFitment={setSelectedAppForFitment} />
            ))}
          </div>

          <DragOverlay>
            {activeApp ? <AppCard app={activeApp} overlay userRole={userRole} /> : null}
          </DragOverlay>
        </DndContext>

        {apps.length === 0 && (
          <div className="bg-white rounded-2xl p-16 text-center border border-slate-100">
            <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto mb-4">
              <FileText className="w-7 h-7 text-slate-300" />
            </div>
            <p className="text-slate-700 font-semibold">No applications yet</p>
            <p className="text-slate-400 text-sm mt-1">Students will appear here once they apply</p>
          </div>
        )}

        {/* Sliding Slots Drawer */}
        <AnimatePresence>
          {showSlotsDrawer && (
            <div className="fixed inset-0 z-50 flex justify-end">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowSlotsDrawer(false)}
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              />
              {/* Drawer Content */}
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="relative w-full max-w-xl bg-white h-full shadow-2xl flex flex-col z-10 border-l border-slate-100"
              >
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Manage Interview Slots</h3>
                    <p className="text-xs text-slate-500 font-semibold mt-1">
                      {job?.role} at {job?.companyName}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowSlotsDrawer(false)}
                    className="p-2 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all"
                  >
                    <X className="w-5 h-5 text-slate-500" />
                  </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {/* Create Slot Section */}
                  <div className="bg-slate-50 rounded-2xl border border-slate-200/60 p-5 space-y-4">
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <Plus className="w-4 h-4 text-violet-500" /> Create New Slot
                    </h4>
                    <form onSubmit={handleCreateSlotSubmit} className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5 col-span-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Date & Time</label>
                        <input
                          type="datetime-local"
                          value={slotDateTime}
                          onChange={e => setSlotDateTime(e.target.value)}
                          required
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 outline-none transition-all"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Duration (mins)</label>
                        <input
                          type="number"
                          value={slotDuration}
                          onChange={e => setSlotDuration(Number(e.target.value))}
                          required
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 outline-none transition-all"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Round Name</label>
                        <input
                          type="text"
                          value={slotRoundName}
                          onChange={e => setSlotRoundName(e.target.value)}
                          required
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 outline-none transition-all"
                        />
                      </div>
                      <div className="space-y-1.5 col-span-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Zoom / Meeting Link</label>
                        <input
                          type="url"
                          value={slotMeetingLink}
                          onChange={e => setSlotMeetingLink(e.target.value)}
                          placeholder="https://zoom.us/j/..."
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 outline-none transition-all"
                        />
                      </div>
                      <div className="col-span-2 pt-2">
                        <button
                          type="submit"
                          disabled={createSlotsMut.isPending}
                          className="w-full bg-violet-500 hover:bg-violet-600 disabled:bg-violet-300 text-white font-bold text-sm py-2.5 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-1.5"
                        >
                          {createSlotsMut.isPending ? 'Creating...' : (
                            <>
                              <Plus className="w-4 h-4" /> Add Slot
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Slots List Section */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-slate-800">
                      Existing Slots ({slotsData?.slots?.length || 0})
                    </h4>
                    {slotsData?.slots?.length === 0 ? (
                      <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-sm">
                        No scheduling slots created yet.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {slotsData?.slots?.map(slot => (
                          <div
                            key={slot._id}
                            className={`p-4 rounded-xl border flex items-center justify-between gap-4 transition-all ${
                              slot.status === 'booked'
                                ? 'bg-violet-50/50 border-violet-100'
                                : 'bg-white border-slate-100 hover:border-slate-200'
                            }`}
                          >
                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-slate-800 text-sm">{slot.roundName}</span>
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                                  slot.status === 'booked'
                                    ? 'bg-violet-100 text-violet-700'
                                    : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                }`}>
                                  {slot.status}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-slate-500 font-semibold flex-wrap">
                                <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-slate-400" />{new Date(slot.dateTime).toLocaleString('en-IN')}</span>
                                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-slate-400" />{slot.duration} mins</span>
                              </div>
                              {slot.meetingLink && (
                                <p className="text-xs font-semibold text-blue-600 truncate flex items-center gap-1">
                                  <Video className="w-3.5 h-3.5 text-blue-500" />
                                  <a href={slot.meetingLink} target="_blank" rel="noreferrer" className="hover:underline">{slot.meetingLink}</a>
                                </p>
                              )}
                              {slot.status === 'booked' && slot.bookedBy && (
                                <div className="mt-2 p-2 bg-white rounded-lg border border-violet-100 flex items-center gap-2">
                                  <div className="w-5 h-5 rounded-full bg-violet-100 flex items-center justify-center text-[10px] font-extrabold text-violet-600">
                                    {initials(slot.bookedBy.name)}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-[11px] font-black text-slate-700 truncate">{slot.bookedBy.name}</p>
                                    <p className="text-[10px] font-medium text-slate-400 truncate">{slot.bookedBy.email}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                            {slot.status !== 'booked' && (
                              <button
                                onClick={() => {
                                  if (window.confirm('Are you sure you want to delete this slot?')) {
                                    deleteSlotMut.mutate(slot._id)
                                  }
                                }}
                                className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-all shrink-0"
                                title="Delete Slot"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* AI Fitment Report Card Modal */}
        <AnimatePresence>
          {selectedAppForFitment && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedAppForFitment(null)}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              />

              {/* Modal Card */}
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="relative bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-2xl overflow-hidden z-10 flex flex-col max-h-[85vh]"
              >
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-gradient-to-r from-violet-50/50 to-amber-50/50">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-violet-500 flex items-center justify-center text-white shadow-md shadow-violet-500/20">
                      <Brain className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-900">AI Profile Fitment Report</h3>
                      <p className="text-xs text-slate-500 font-semibold mt-0.5">
                        {selectedAppForFitment.studentId?.name || 'Student'} • {selectedAppForFitment.studentId?.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1.5 rounded-xl text-xs font-black shadow-sm flex items-center gap-1 ${
                      selectedAppForFitment.aiMatchScore >= 80 ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' :
                      selectedAppForFitment.aiMatchScore >= 55 ? 'bg-amber-50 text-amber-600 border border-amber-200' :
                      'bg-slate-700 text-white'
                    }`}>
                      🤖 {selectedAppForFitment.aiMatchScore}% Match
                    </span>
                    <button
                      onClick={() => setSelectedAppForFitment(null)}
                      className="p-1.5 rounded-xl hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-all text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {feedbackObj ? (
                    <>
                      {/* Overall Fitment Feedback */}
                      {feedbackObj.overallFeedback && (
                        <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 flex gap-3">
                          <Sparkles className="w-5 h-5 text-violet-500 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">AI Recommendation Summary</p>
                            <p className="text-sm font-semibold text-slate-700 leading-relaxed">{feedbackObj.overallFeedback}</p>
                          </div>
                        </div>
                      )}

                      {/* Strengths & Weaknesses */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Strengths */}
                        <div className="bg-emerald-50/40 border border-emerald-100/85 rounded-2xl p-4 space-y-2.5">
                          <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                            <CheckCircle className="w-4 h-4 text-emerald-600" /> Key Strengths
                          </h4>
                          {feedbackObj.strengths?.length > 0 ? (
                            <ul className="space-y-1.5">
                              {feedbackObj.strengths.map((str, idx) => (
                                <li key={idx} className="text-xs font-semibold text-emerald-850 flex items-start gap-1.5">
                                  <span className="text-emerald-500 shrink-0 mt-0.5">•</span>
                                  <span>{str}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-xs text-emerald-650 font-medium italic">No major strengths highlighted by AI.</p>
                          )}
                        </div>

                        {/* Weaknesses */}
                        <div className="bg-rose-50/40 border border-rose-100/85 rounded-2xl p-4 space-y-2.5">
                          <h4 className="text-xs font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1.5">
                            <AlertTriangle className="w-4 h-4 text-rose-650" /> Improvement Areas
                          </h4>
                          {feedbackObj.weaknesses?.length > 0 ? (
                            <ul className="space-y-1.5">
                              {feedbackObj.weaknesses.map((weak, idx) => (
                                <li key={idx} className="text-xs font-semibold text-rose-850 flex items-start gap-1.5">
                                  <span className="text-rose-500 shrink-0 mt-0.5">•</span>
                                  <span>{weak}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-xs text-rose-650 font-medium italic">No critical gaps identified.</p>
                          )}
                        </div>
                      </div>

                      {/* Keywords Matched & Missing */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Keyword Matches */}
                        <div className="space-y-2">
                          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                            <Award className="w-4 h-4 text-emerald-600" /> Matched Skills ({feedbackObj.keywordMatches?.length || 0})
                          </h4>
                          <div className="flex flex-wrap gap-1.5">
                            {feedbackObj.keywordMatches?.length > 0 ? (
                              feedbackObj.keywordMatches.map((m, idx) => (
                                <span key={idx} className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-100">
                                  {m}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-slate-400 italic font-semibold">No direct skill matches</span>
                            )}
                          </div>
                        </div>

                        {/* Missing Skills */}
                        <div className="space-y-2">
                          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                            <BookOpen className="w-4 h-4 text-rose-500" /> Gaps / Missing Skills ({feedbackObj.missingSkills?.length || 0})
                          </h4>
                          <div className="flex flex-wrap gap-1.5">
                            {feedbackObj.missingSkills?.length > 0 ? (
                              feedbackObj.missingSkills.map((m, idx) => (
                                <span key={idx} className="px-2.5 py-1 bg-rose-50 text-rose-700 text-xs font-bold rounded-lg border border-rose-100">
                                  {m}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-emerald-600 italic font-semibold">Meets all skill prerequisites!</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Suggestions */}
                      {feedbackObj.suggestions?.length > 0 && (
                        <div className="bg-amber-50/40 border border-amber-100 rounded-2xl p-4 space-y-2.5">
                          <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                            <Lightbulb className="w-4 h-4 text-amber-600" /> Recommendations to Candidate
                          </h4>
                          <ul className="space-y-1.5">
                            {feedbackObj.suggestions.map((sug, idx) => (
                              <li key={idx} className="text-xs font-semibold text-amber-850 flex items-start gap-1.5">
                                <span className="text-amber-500 shrink-0 mt-0.5">•</span>
                                <span>{sug}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-12 text-slate-400 font-semibold text-sm">
                      AI evaluation results could not be parsed. Score is {selectedAppForFitment.aiMatchScore}%.
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                  <button
                    onClick={() => setSelectedAppForFitment(null)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                  >
                    Close Report
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
  )
}
