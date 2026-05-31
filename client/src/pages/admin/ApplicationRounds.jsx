import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Plus, ArrowLeft, Calendar, Video, MapPin, CheckCircle2, XCircle, Clock, AlertCircle, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'
import API from '../../api/axios'
import { useSocket } from '../../hooks/useSocket'
import { useAuth } from '../../hooks/useAuth'
import AppLayout from '../../components/layout/AppLayout'
import Button from '../../components/ui/Button'
import PageBanner from '../../components/ui/PageBanner'

// Fetcher
const fetchApplicationWithRounds = async (id) => {
  const { data } = await API.get(`/applications/${id}/rounds`)
  return data
}

// Status Config
const statusConfig = {
  pending:   { color: 'bg-slate-100 text-slate-600 border-slate-200', icon: Clock },
  scheduled: { color: 'bg-blue-50 text-blue-600 border-blue-200',     icon: Calendar },
  pass:      { color: 'bg-emerald-50 text-emerald-600 border-emerald-200', icon: CheckCircle2 },
  fail:      { color: 'bg-rose-50 text-rose-600 border-rose-200',     icon: XCircle },
  hold:      { color: 'bg-amber-50 text-amber-600 border-amber-200',  icon: AlertCircle },
}

export default function ApplicationRounds() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { socket } = useSocket()
  const { user } = useAuth()

  const role = user?.user?.role || user?.role
  const isStudent = role === 'student'
  
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingRound, setEditingRound] = useState(null) // index of round being edited

  // Forms
  const addForm = useForm()
  const updateForm = useForm()

  const { data, isLoading } = useQuery({
    queryKey: ['applicationRounds', id],
    queryFn: () => fetchApplicationWithRounds(id),
  })

  // Slots Booking State for Student
  const { data: availableSlotsData, refetch: refetchAvailableSlots } = useQuery({
    queryKey: ['availableSlots', id],
    queryFn: () => API.get(`/slots/application/${id}/available`).then(r => r.data),
    enabled: isStudent,
  })

  const bookSlotMutation = useMutation({
    queryKey: ['bookSlot', id],
    mutationFn: (slotId) => API.post(`/slots/booking/${slotId}`, { applicationId: id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applicationRounds', id] })
      refetchAvailableSlots()
      toast.success('Interview booked successfully!')
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to book slot'),
  })

  // Real-time updates
  useEffect(() => {
    if (!socket) return
    const handleRoundUpdate = (payload) => {
      if (payload.applicationId === id) {
        queryClient.invalidateQueries({ queryKey: ['applicationRounds', id] })
      }
    }
    socket.on('application:round_updated', handleRoundUpdate)
    return () => socket.off('application:round_updated', handleRoundUpdate)
  }, [socket, id, queryClient])

  // Mutations
  const addRoundMutation = useMutation({
    mutationFn: (newRound) => API.post(`/applications/${id}/rounds`, newRound),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applicationRounds', id] })
      toast.success('Round added')
      setShowAddModal(false)
      addForm.reset()
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to add round'),
  })

  const updateRoundMutation = useMutation({
    mutationFn: ({ idx, payload }) => API.patch(`/applications/${id}/rounds/${idx}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applicationRounds', id] })
      toast.success('Round updated')
      setEditingRound(null)
      updateForm.reset()
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to update round'),
  })

  const onAddSubmit = (data) => addRoundMutation.mutate(data)
  
  const onUpdateSubmit = (data) => {
    updateRoundMutation.mutate({
      idx: editingRound,
      payload: { ...data, score: data.score ? Number(data.score) : undefined },
    })
  }

  if (isLoading) return <AppLayout><div className="animate-pulse bg-white rounded-3xl h-96 m-6" /></AppLayout>

  const app = data?.application
  const rounds = data?.rounds || []

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Page Banner */}
        <PageBanner
          title={isStudent ? 'Application Progress' : `Round Tracker`}
          subtitle={`${app?.jobId?.role} at ${app?.jobId?.companyName} — track each assessment & interview round, scores, and feedback in real time.`}
          badge={isStudent ? 'My Application' : 'Application Rounds'}
          badgeColor="bg-violet-50 text-violet-700 border-violet-100"
          compact
          actions={
            <button
              onClick={() => navigate(isStudent ? '/student/applications' : -1)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:border-violet-300 hover:text-violet-600 transition-all shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              {isStudent ? 'Back to Applications' : 'Back to Kanban'}
            </button>
          }
        />

        {/* Top Header Actions */}
        <div className="flex items-center justify-between">
          <div />
          {!isStudent && (
            <Button onClick={() => setShowAddModal(true)} className="flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add Round
            </Button>
          )}
        </div>

        {/* Available Booking Slots for Student */}
        {isStudent && availableSlotsData?.slots?.length > 0 && (
          <div className="bg-gradient-to-r from-violet-500/5 to-amber-500/5 rounded-3xl border border-violet-100 p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-violet-500" />
                  Book Your Interview Slot
                </h3>
                <p className="text-sm text-slate-500 font-semibold mt-1">
                  Select an available slot below to schedule your next round. It will instantly block the recruiter's calendar and send calendar invites.
                </p>
              </div>
              <span className="bg-violet-50 text-violet-700 px-3 py-1 rounded-xl text-xs font-bold border border-violet-100 shrink-0">
                Action Required
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              {availableSlotsData.slots.map(slot => (
                <div key={slot._id} className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between gap-4 hover:border-violet-300 hover:shadow-md hover:shadow-violet-500/5 transition-all">
                  <div className="space-y-1.5">
                    <p className="text-sm font-black text-slate-800">{slot.roundName}</p>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-bold">
                      <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-slate-400" />{new Date(slot.dateTime).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-slate-400" />{new Date(slot.dateTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} ({slot.duration}m)</span>
                    </div>
                    {slot.interviewerId && (
                      <p className="text-xs text-slate-400 font-semibold">Interviewer: {slot.interviewerId.name}</p>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      if (window.confirm(`Confirm booking for ${slot.roundName} on ${new Date(slot.dateTime).toLocaleString()}?`)) {
                        bookSlotMutation.mutate(slot._id)
                      }
                    }}
                    disabled={bookSlotMutation.isPending}
                    className="w-full py-2 bg-violet-500 hover:bg-violet-600 disabled:bg-violet-300 text-white font-bold text-xs rounded-xl shadow-sm transition-colors text-center"
                  >
                    {bookSlotMutation.isPending ? 'Booking...' : 'Book This Slot'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Timeline */}
        <div className="bg-white rounded-3xl shadow-[0_8px_32px_rgba(15,23,42,0.04)] border border-slate-100 p-8">
          <div className="relative pl-8 border-l-2 border-slate-100 space-y-12">
            
            {rounds.length === 0 ? (
              <div className="text-center py-12 text-slate-400 font-bold">
                Pending Round/Assessment Scheduling
              </div>
            ) : (
              rounds.map((round, idx) => {
                const StatusIcon = statusConfig[round.status]?.icon || Clock
                const statusTheme = statusConfig[round.status] || statusConfig.pending

                return (
                  <motion.div 
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="relative"
                  >
                    {/* Timeline Dot */}
                    <div className={`absolute -left-[41px] w-5 h-5 rounded-full border-4 border-white ${statusTheme.color.split(' ')[0]} flex items-center justify-center`}>
                      <div className="w-1.5 h-1.5 rounded-full bg-current" />
                    </div>

                    <div className={`p-6 rounded-2xl border ${editingRound === idx ? 'border-violet-500 shadow-lg shadow-violet-500/10' : 'border-slate-100 hover:border-slate-200'}`}>
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-3">
                            <h3 className="text-lg font-bold text-slate-900">{round.name}</h3>
                            <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest rounded-lg border ${statusTheme.color}`}>
                              {round.status}
                            </span>
                            <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest rounded-lg bg-slate-50 text-slate-500 border border-slate-200">
                              {round.type}
                            </span>
                          </div>
                          
                          <div className="mt-4 flex flex-wrap gap-4 text-sm font-medium text-slate-500">
                            {round.scheduledAt && (
                              <div className="flex items-center gap-1.5 text-blue-600 bg-blue-50 px-3 py-1.5 rounded-xl">
                                <Calendar className="w-4 h-4" />
                                {new Date(round.scheduledAt).toLocaleString()}
                              </div>
                            )}
                            {round.mode === 'online' ? (
                              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                <div className="flex items-center gap-1.5 text-slate-600 font-bold"><Video className="w-4 h-4 text-emerald-500" /> Online</div>
                                {round.venue && (
                                  <a 
                                    href={round.venue.startsWith('http') ? round.venue : `https://${round.venue}`} 
                                    target="_blank" 
                                    rel="noreferrer noopener"
                                    className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 px-3 py-1.5 rounded-xl transition-all"
                                  >
                                    Join Google Meet
                                  </a>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 text-slate-500 font-semibold"><MapPin className="w-4 h-4 text-slate-400" /> {round.venue || 'Offline'}</div>
                            )}
                          </div>
                        </div>

                      {editingRound !== idx && !isStudent && (
                          <button 
                            onClick={() => {
                              setEditingRound(idx)
                              updateForm.reset({
                                status: round.status,
                                feedback: round.feedback || '',
                                score: round.score || '',
                              })
                            }}
                            className="text-sm font-bold text-violet-500 hover:text-violet-600 bg-violet-50 px-4 py-2 rounded-xl transition-colors"
                          >
                            Update Result
                          </button>
                        )}

                        {isStudent && round.type === 'coding' && (round.status === 'pending' || round.status === 'scheduled') && (
                          <button
                            type="button"
                            onClick={() => navigate(`/student/assessment/take/${id}/${idx}`)}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-violet-500 hover:bg-violet-600 transition-colors shadow-sm"
                          >
                            <Sparkles className="w-4 h-4" />
                            Take Coding Assessment
                          </button>
                        )}

                        {!isStudent && round.type === 'coding' && (
                          <button
                            type="button"
                            onClick={() => navigate(role === 'admin' ? '/admin/assessments' : '/company/assessments')}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-violet-600 bg-violet-50 hover:bg-violet-100 transition-colors border border-violet-200 shadow-sm"
                          >
                            <Sparkles className="w-4 h-4" />
                            Manage/View Assessment
                          </button>
                        )}
                      </div>

                      {/* Display Feedback/Score if present & not editing */}
                      {editingRound !== idx && (round.feedback || round.score) && (
                        <div className="mt-5 p-4 rounded-xl bg-slate-50 border border-slate-100">
                          {round.score && <p className="text-sm font-bold text-slate-900 mb-2">Score: <span className="text-violet-500">{round.score}</span></p>}
                          {round.feedback && <p className="text-sm text-slate-600">{round.feedback}</p>}
                        </div>
                      )}

                      {/* Update Form Editor */}
                      <AnimatePresence>
                        {editingRound === idx && (
                          <motion.form 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            onSubmit={updateForm.handleSubmit(onUpdateSubmit)}
                            className="mt-6 pt-6 border-t border-slate-100 space-y-4"
                          >
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status</label>
                                <select 
                                  {...updateForm.register('status')}
                                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 outline-none transition-all"
                                >
                                  <option value="pending">Pending</option>
                                  <option value="pass">Pass</option>
                                  <option value="fail">Fail</option>
                                  <option value="hold">Hold</option>
                                </select>
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Score (Optional)</label>
                                <input 
                                  type="number"
                                  {...updateForm.register('score')}
                                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 outline-none transition-all"
                                />
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Interviewer Feedback</label>
                              <textarea 
                                {...updateForm.register('feedback')}
                                rows="3"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 outline-none transition-all"
                              />
                            </div>
                             <div className="flex items-center justify-end gap-3 pt-2">
                              <button type="button" onClick={() => setEditingRound(null)} className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors">
                                Cancel
                              </button>
                              <Button type="submit" disabled={updateRoundMutation.isPending}>
                                {updateRoundMutation.isPending ? 'Saving...' : 'Save Result'}
                              </Button>
                            </div>
                          </motion.form>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                )
              })
            )}
          </div>
        </div>

        {/* Add Modal */}
        <AnimatePresence>
          {showAddModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                onClick={() => setShowAddModal(false)}
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                className="relative bg-white rounded-3xl shadow-2xl p-8 w-full max-w-lg border border-slate-100"
              >
                <h2 className="text-2xl font-bold text-slate-900 mb-6">Schedule New Round</h2>
                <form onSubmit={addForm.handleSubmit(onAddSubmit)} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Round Name</label>
                    <input {...addForm.register('name', { required: true })} placeholder="e.g. Technical Round 1" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 outline-none transition-all" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Type</label>
                      <select {...addForm.register('type')} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 outline-none transition-all">
                        <option value="aptitude">Aptitude</option>
                        <option value="technical">Technical</option>
                        <option value="hr">HR</option>
                        <option value="group_discussion">Group Discussion</option>
                        <option value="coding">Coding</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mode</label>
                      <select {...addForm.register('mode')} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 outline-none transition-all">
                        <option value="online">Online</option>
                        <option value="offline">Offline</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Scheduled Date & Time</label>
                    <input type="datetime-local" {...addForm.register('scheduledAt')} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 outline-none transition-all" />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Venue / Link</label>
                    <input {...addForm.register('venue')} placeholder="Zoom link or Room 101" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 outline-none transition-all" />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-3 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">Cancel</button>
                    <Button type="submit" disabled={addRoundMutation.isPending} className="flex-1">
                      {addRoundMutation.isPending ? 'Saving...' : 'Add Round'}
                    </Button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </AppLayout>
  )
}
