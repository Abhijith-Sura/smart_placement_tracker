import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, Plus, MapPin, Video, Clock, Users, X, Info, Trash2, CheckCircle2, AlertCircle, Upload, Loader2, Pencil } from 'lucide-react'
import toast from 'react-hot-toast'
import AppLayout from '../../components/layout/AppLayout'
import { PageSpinner } from '../../components/ui/Spinner'
import PageBanner from '../../components/ui/PageBanner'
import API from '../../api/axios'

const TYPE_COLORS = {
  'PPT': 'bg-blue-50 text-blue-600 border-blue-100',
  'Aptitude Test': 'bg-amber-50 text-amber-600 border-amber-100',
  'Technical Interview': 'bg-purple-50 text-purple-600 border-purple-100',
  'HR Interview': 'bg-pink-50 text-pink-600 border-pink-100',
  'Placement Drive': 'bg-emerald-50 text-emerald-600 border-emerald-100',
  'Guest Lecture': 'bg-indigo-50 text-indigo-600 border-indigo-100',
  'Other': 'bg-slate-50 text-slate-600 border-slate-100'
}

const formatMediaUrl = (url) => {
  if (!url) return ''
  if (url.startsWith('http') || url.startsWith('data:')) return url
  
  let baseUrl = import.meta.env.VITE_API_URL || ''
  
  if (baseUrl && !baseUrl.startsWith('/') && !baseUrl.startsWith('http')) {
    baseUrl = `http://${baseUrl}`
  }
  
  if (baseUrl) {
    baseUrl = baseUrl.replace(/\/api\/?$/, '')
  }
  
  if (!baseUrl || baseUrl.startsWith('/')) {
    const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
    const protocol = typeof window !== 'undefined' ? window.location.protocol : 'http:'
    const currentPort = typeof window !== 'undefined' ? window.location.port : ''
    const port = (currentPort && currentPort !== '5000') ? '5000' : currentPort
    baseUrl = `${protocol}//${hostname}${port ? `:${port}` : ''}`
  }
  
  const cleanUrl = url.startsWith('/') ? url : `/${url}`
  return `${baseUrl}${cleanUrl}`.replace(/([^:]\/)\/+/g, '$1')
}

const formatDateTimeForInput = (isoString) => {
  if (!isoString) return ''
  const date = new Date(isoString)
  const tzOffset = date.getTimezoneOffset() * 60000; // in milliseconds
  return (new Date(date.getTime() - tzOffset)).toISOString().slice(0, 16);
}


export default function AdminEvents() {
  const queryClient = useQueryClient()

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState(null) // For viewing attendees
  const [brokenImages, setBrokenImages] = useState({})
  const [lightboxMedia, setLightboxMedia] = useState(null)
  const [editingEvent, setEditingEvent] = useState(null)
  
  // Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'PPT',
    mode: 'Physical',
    location: '',
    dateTime: '',
    duration: 60,
    companyName: '',
    relatedJob: '',
    imageUrl: '',
    videoUrl: '',
    audioUrl: ''
  })

  const [isUploadingMedia, setIsUploadingMedia] = useState(false)
  const [showUrlInputs, setShowUrlInputs] = useState(false)
  const mediaInputRef = useRef(null)

  const handleMediaUpload = async (e) => {
    const file = e.target.files?.[0] || e.dataTransfer?.files?.[0]
    if (!file) return

    if (file.size > 50 * 1024 * 1024) {
      toast.error('File size exceeds 50MB limit')
      return
    }

    const isImage = file.type.startsWith('image/')
    const isVideo = file.type.startsWith('video/')
    const isAudio = file.type.startsWith('audio/')
    if (!isImage && !isVideo && !isAudio) {
      toast.error('Only image, video, and audio files are supported')
      return
    }

    setIsUploadingMedia(true)
    const mediaType = isImage ? 'image' : isVideo ? 'video' : 'audio'
    const toastId = toast.loading(`Uploading ${mediaType}...`)

    const fd = new FormData()
    fd.append('file', file)

    try {
      const res = await API.post('/events/upload-media', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      if (res.data?.url) {
        if (isImage) {
          setFormData(prev => ({ ...prev, imageUrl: res.data.url, videoUrl: '', audioUrl: '' }))
        } else if (isVideo) {
          setFormData(prev => ({ ...prev, videoUrl: res.data.url, imageUrl: '', audioUrl: '' }))
        } else {
          setFormData(prev => ({ ...prev, audioUrl: res.data.url, imageUrl: '', videoUrl: '' }))
        }
        toast.success('Media uploaded successfully!', { id: toastId })
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Media upload failed', { id: toastId })
    } finally {
      setIsUploadingMedia(false)
    }
  }

  // Queries
  const { data: eventsData, isLoading: eventsLoading } = useQuery({
    queryKey: ['admin-events'],
    queryFn: () => API.get('/events').then(r => r.data)
  })

  const { data: jobsData } = useQuery({
    queryKey: ['admin-jobs-dropdown'],
    queryFn: () => API.get('/jobs').then(r => r.data) // Get all active jobs
  })

  // Fetch Event Details for Registered Students when selected
  const { data: eventDetails, isLoading: detailsLoading } = useQuery({
    queryKey: ['admin-event-details', selectedEvent?._id],
    queryFn: () => API.get(`/events/${selectedEvent?._id}`).then(r => r.data),
    enabled: !!selectedEvent?._id
  })

  // Mutations
  const createEventMutation = useMutation({
    mutationFn: (newEvent) => API.post('/events', newEvent),
    onSuccess: (res) => {
      toast.success(res.data.message || 'Event scheduled successfully!')
      setDrawerOpen(false)
      setFormData({
        title: '',
        description: '',
        type: 'PPT',
        mode: 'Physical',
        location: '',
        dateTime: '',
        duration: 60,
        companyName: '',
        relatedJob: '',
        imageUrl: '',
        videoUrl: '',
        audioUrl: ''
      })
      queryClient.invalidateQueries({ queryKey: ['admin-events'] })
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to create event')
    }
  })

  const updateEventMutation = useMutation({
    mutationFn: ({ id, updates }) => API.put(`/events/${id}`, updates),
    onSuccess: (res) => {
      toast.success(res.data.message || 'Event updated successfully!')
      setDrawerOpen(false)
      setEditingEvent(null)
      setFormData({
        title: '',
        description: '',
        type: 'PPT',
        mode: 'Physical',
        location: '',
        dateTime: '',
        duration: 60,
        companyName: '',
        relatedJob: '',
        imageUrl: '',
        videoUrl: '',
        audioUrl: ''
      })
      queryClient.invalidateQueries({ queryKey: ['admin-events'] })
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to update event')
    }
  })

  const cancelEventMutation = useMutation({
    mutationFn: ({ id, updates }) => API.put(`/events/${id}`, updates),
    onSuccess: () => {
      toast.success('Event status updated!')
      queryClient.invalidateQueries({ queryKey: ['admin-events'] })
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to update status')
    }
  })

  const deleteEventMutation = useMutation({
    mutationFn: (id) => API.delete(`/events/${id}`),
    onSuccess: () => {
      toast.success('Event deleted successfully!')
      queryClient.invalidateQueries({ queryKey: ['admin-events'] })
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to delete event')
    }
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    
    // Auto-fill company name if a job is linked and companyName is empty
    let finalData = { ...formData }
    if (formData.relatedJob && !formData.companyName) {
      const selectedJob = jobs.find(j => j._id === formData.relatedJob)
      if (selectedJob) {
        finalData.companyName = selectedJob.companyName
      }
    }

    if (!finalData.companyName) {
      toast.error('Please enter a company name')
      return
    }

    if (editingEvent) {
      updateEventMutation.mutate({ id: editingEvent._id, updates: finalData })
    } else {
      createEventMutation.mutate(finalData)
    }
  }

  const handleEditClick = (event) => {
    setEditingEvent(event)
    setFormData({
      title: event.title || '',
      description: event.description || '',
      type: event.type || 'PPT',
      mode: event.mode || 'Physical',
      location: event.location || '',
      dateTime: formatDateTimeForInput(event.dateTime),
      duration: event.duration || 60,
      companyName: event.companyName || '',
      relatedJob: event.relatedJob?._id || event.relatedJob || '',
      imageUrl: event.imageUrl || '',
      videoUrl: event.videoUrl || '',
      audioUrl: event.audioUrl || ''
    })
    setDrawerOpen(true)
  }

  // Handle auto-populating company name when a job is selected
  const handleJobChange = (jobId) => {
    const selectedJob = jobs.find(j => j._id === jobId)
    setFormData({
      ...formData,
      relatedJob: jobId,
      companyName: selectedJob ? selectedJob.companyName : formData.companyName
    })
  }

  if (eventsLoading) return <AppLayout title="Events"><PageSpinner /></AppLayout>

  const events = eventsData?.events || []
  const jobs = jobsData?.jobs || []

  return (
    <AppLayout title="Campus Events" subtitle="Manage and coordinate recruitment visits, online tests, and career talks.">
      <div className="space-y-6">
        
        <PageBanner
          title="Campus Events"
          subtitle="Schedule and manage campus recruitment visits, aptitude tests, PPTs, and online hiring drives."
          badge="Campus Events"
          badgeColor="bg-amber-50 text-amber-700 border-amber-100"
          compact
          gradient="violet"
          actions={
            <button
              onClick={() => setDrawerOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold rounded-xl shadow-[0_4px_12px_rgba(124,58,237,0.25)] hover:-translate-y-0.5 transition-all"
            >
              <Plus className="w-4 h-4" /> Schedule Event
            </button>
          }
        />

        {/* Events Grid */}
        {events.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center shadow-sm">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100">
              <Calendar className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-700">No events scheduled</h3>
            <p className="text-slate-400 text-sm mt-1 max-w-sm mx-auto">
              Schedule your first recruitment drive event or PPT.
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {events.map((event) => {
              const date = new Date(event.dateTime).toLocaleString('en-IN', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })
              const isPast = new Date(event.dateTime) < new Date()
              const count = event.registrationCount || 0

              return (
                <div
                  key={event._id}
                  className={`bg-white rounded-2xl border p-5 flex flex-col justify-between shadow-sm hover:shadow-md hover:border-slate-200 transition-all relative overflow-hidden ${
                    event.status === 'Cancelled' ? 'border-red-100 opacity-70' : 'border-slate-100'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-lg border ${
                        TYPE_COLORS[event.type] || TYPE_COLORS['Other']
                      }`}>
                        {event.type}
                      </span>
                      
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${
                          event.status === 'Cancelled' 
                            ? 'bg-red-500' 
                            : isPast 
                              ? 'bg-slate-400' 
                              : 'bg-emerald-500'
                        }`} />
                        <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wide">
                          {event.status === 'Cancelled' ? 'Cancelled' : isPast ? 'Completed' : 'Scheduled'}
                        </span>
                      </div>
                    </div>

                    <h3 className="text-base font-bold text-slate-800 leading-snug">{event.title}</h3>
                    <p className="text-xs font-bold text-slate-400 mt-0.5">Recruiter: {event.companyName}</p>
                    
                    {event.imageUrl && !brokenImages[event._id] && (
                      <div 
                        onClick={() => setLightboxMedia({ type: 'image', url: event.imageUrl, title: event.title, company: event.companyName })}
                        className="relative w-full h-36 rounded-xl overflow-hidden mt-3 border border-slate-100 bg-slate-50 flex items-center justify-center cursor-pointer group/media"
                      >
                        <img 
                          src={formatMediaUrl(event.imageUrl)} 
                          alt={event.title} 
                          className="w-full h-full object-cover group-hover/media:scale-105 transition-transform duration-300" 
                          onError={() => setBrokenImages(prev => ({ ...prev, [event._id]: true }))} 
                        />
                        <div className="absolute inset-0 bg-slate-950/20 opacity-0 group-hover/media:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="text-[10px] font-bold text-white bg-slate-900/75 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-white/10 uppercase tracking-wider">Preview Banner</span>
                        </div>
                      </div>
                    )}
                    {event.videoUrl && (
                      <div 
                        onClick={() => setLightboxMedia({ type: 'video', url: event.videoUrl, title: event.title, company: event.companyName })}
                        className="relative w-full h-36 rounded-xl overflow-hidden mt-3 border border-slate-100 bg-slate-950 flex items-center justify-center cursor-pointer group/media animate-fade-in"
                      >
                        {event.videoUrl.includes('youtube.com') || event.videoUrl.includes('youtu.be') ? (
                          <div className="w-full h-full relative flex items-center justify-center bg-slate-900">
                            <img 
                              src={`https://img.youtube.com/vi/${event.videoUrl.split('v=')[1]?.split('&')[0] || event.videoUrl.split('youtu.be/')[1]?.split('?')[0]}/hqdefault.jpg`} 
                              className="w-full h-full object-cover opacity-75 group-hover/media:scale-105 transition-transform duration-300" 
                              onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=600'; }} 
                            />
                            <div className="absolute w-12 h-12 bg-red-650 rounded-full flex items-center justify-center text-white shadow-md group-hover/media:scale-110 transition-transform">
                              <Video className="w-6 h-6 fill-white" />
                            </div>
                          </div>
                        ) : (
                          <div className="w-full h-full relative flex items-center justify-center bg-slate-900">
                            <video src={formatMediaUrl(event.videoUrl)} className="w-full h-full object-cover opacity-60" />
                            <div className="absolute w-12 h-12 bg-violet-600 rounded-full flex items-center justify-center text-white shadow-md group-hover/media:scale-110 transition-transform">
                              <Video className="w-6 h-6 text-white" />
                            </div>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-slate-950/20 opacity-0 group-hover/media:opacity-100 transition-opacity flex items-end p-2.5">
                          <span className="text-[9px] font-bold text-white bg-slate-900/80 backdrop-blur-sm px-2 py-1 rounded-md border border-white/5 uppercase tracking-wider">Play recruitment drive video</span>
                        </div>
                      </div>
                    )}
                    {event.audioUrl && (
                      <div 
                        onClick={() => setLightboxMedia({ type: 'audio', url: event.audioUrl, title: event.title, company: event.companyName })}
                        className="mt-3 p-3 bg-slate-50 border border-slate-100 hover:border-violet-300 hover:bg-violet-50/5 rounded-xl flex items-center gap-3 cursor-pointer group/audio transition-all"
                      >
                        <div 
                          className="w-10 h-10 rounded-xl bg-violet-500/10 group-hover/audio:bg-violet-500/20 border border-violet-500/20 flex items-center justify-center text-violet-650 shrink-0"
                          title="Open Audio Player"
                        >
                          <svg className="w-5 h-5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-slate-655 group-hover/audio:text-violet-600 transition-colors truncate">Listen Podcast / Webinar</span>
                          <audio 
                            src={formatMediaUrl(event.audioUrl)} 
                            controls 
                            onClick={(e) => e.stopPropagation()} 
                            className="w-36 h-7 opacity-90 scale-95 origin-right" 
                          />
                        </div>
                      </div>
                    )}
                    {event.description && <p className="text-xs text-slate-400 font-medium line-clamp-2 mt-2">{event.description}</p>}
                    
                    <div className="flex flex-col gap-1.5 text-xs text-slate-500 font-semibold pt-2">
                      <span className="flex items-center gap-2"><Clock className="w-4 h-4 text-slate-400" /> {date} ({event.duration} min)</span>
                      <span className="flex items-center gap-2">
                        {event.mode === 'Virtual' ? <Video className="w-4 h-4 text-slate-400" /> : <MapPin className="w-4 h-4 text-slate-400" />}
                        <span className="truncate">{event.location}</span>
                      </span>
                      {event.relatedJob && (
                        <span className="flex items-center gap-2"><Info className="w-4 h-4 text-slate-400" /> Linked to job: <span className="text-violet-500 font-bold">{event.relatedJob.role}</span></span>
                      )}
                    </div>
                  </div>

                  {/* Registered count and manage actions */}
                  <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => setSelectedEvent(event)}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-violet-600 hover:bg-violet-50 px-3 py-1.5 rounded-xl border border-violet-100 transition-colors"
                    >
                      <Users className="w-4 h-4" /> {count} RSVP{count !== 1 ? 's' : ''}
                    </button>

                    <div className="flex items-center gap-2">
                      {event.status !== 'Cancelled' && !isPast && (
                        <>
                          <button
                            onClick={() => handleEditClick(event)}
                            className="px-3 py-1.5 text-xs font-bold text-violet-600 hover:bg-violet-50 border border-violet-100 rounded-xl transition-colors flex items-center gap-1"
                          >
                            <Pencil className="w-3 h-3" /> Edit
                          </button>
                          <button
                            onClick={() => cancelEventMutation.mutate({ id: event._id, updates: { status: 'Cancelled' } })}
                            className="px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 border border-red-100 rounded-xl transition-colors"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                      
                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this event permanently?')) {
                            deleteEventMutation.mutate(event._id)
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                        title="Delete Permanently"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── Event Registration Drawer (Attendees list) ── */}
        <AnimatePresence>
          {selectedEvent && (
            <div className="fixed inset-0 z-50 flex justify-end">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedEvent(null)}
                className="absolute inset-0 bg-slate-900"
              />
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'tween', duration: 0.3 }}
                className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col p-6 overflow-hidden"
              >
                <div className="flex justify-between items-start pb-4 border-b border-slate-100">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 truncate max-w-sm">{selectedEvent.title}</h2>
                    <p className="text-xs text-slate-400 font-medium">Attendee register for verification</p>
                  </div>
                  <button onClick={() => setSelectedEvent(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto py-4">
                  {detailsLoading ? (
                    <PageSpinner />
                  ) : eventDetails?.event?.registeredStudents?.length === 0 ? (
                    <div className="py-20 text-center text-slate-400 text-sm">
                      <Users className="w-12 h-12 mx-auto text-slate-200 mb-3" />
                      No students have RSVP'd to this event yet.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {eventDetails?.event?.registeredStudents?.map((student) => (
                        <div key={student._id} className="p-4 rounded-2xl border border-slate-100 bg-slate-50 flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-800">{student.name}</p>
                            <p className="text-xs text-slate-400 font-medium truncate">{student.email}</p>
                            <div className="flex gap-2.5 mt-2 flex-wrap text-[10px] font-bold uppercase text-slate-500">
                              <span className="bg-slate-200/80 px-2 py-0.5 rounded-lg border border-slate-300">Roll: {student.rollNo}</span>
                              <span className="bg-violet-50 text-violet-600 px-2 py-0.5 rounded-lg border border-violet-100">{student.branch}</span>
                              <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-lg border border-emerald-100">{student.CGPA} CGPA</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ── Schedule Event Drawer (Form Modal) ── */}
        <AnimatePresence>
          {drawerOpen && (
            <div className="fixed inset-0 z-50 flex justify-end">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                exit={{ opacity: 0 }}
                onClick={() => {
                  setDrawerOpen(false)
                  setEditingEvent(null)
                  setFormData({
                    title: '',
                    description: '',
                    type: 'PPT',
                    mode: 'Physical',
                    location: '',
                    dateTime: '',
                    duration: 60,
                    companyName: '',
                    relatedJob: '',
                    imageUrl: '',
                    videoUrl: '',
                    audioUrl: ''
                  })
                }}
                className="absolute inset-0 bg-slate-900"
              />
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'tween', duration: 0.3 }}
                className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col p-6 overflow-hidden"
              >
                <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                  <h2 className="text-lg font-bold text-slate-900">{editingEvent ? 'Edit Campus Event' : 'Schedule Campus Event'}</h2>
                  <button 
                    onClick={() => {
                      setDrawerOpen(false)
                      setEditingEvent(null)
                      setFormData({
                        title: '',
                        description: '',
                        type: 'PPT',
                        mode: 'Physical',
                        location: '',
                        dateTime: '',
                        duration: 60,
                        companyName: '',
                        relatedJob: '',
                        imageUrl: '',
                        videoUrl: '',
                        audioUrl: ''
                      })
                    }} 
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Event Title</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Google Pre-Placement Talk / HR Drive"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Event Type</label>
                      <select
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-violet-500 outline-none transition-all"
                      >
                        {['PPT', 'Aptitude Test', 'Technical Interview', 'HR Interview', 'Placement Drive', 'Guest Lecture', 'Other'].map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Mode</label>
                      <select
                        value={formData.mode}
                        onChange={(e) => setFormData({ ...formData, mode: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-violet-500 outline-none transition-all"
                      >
                        <option value="Physical">Physical (On-Campus)</option>
                        <option value="Virtual">Virtual (Online Link)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      {formData.mode === 'Virtual' ? 'Virtual Meeting Link' : 'Physical Location'}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={formData.mode === 'Virtual' ? 'e.g. https://meet.google.com/...' : 'e.g. Auditorium / Lab 2, CSE block'}
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Date & Time</label>
                      <input
                        type="datetime-local"
                        required
                        value={formData.dateTime}
                        onChange={(e) => setFormData({ ...formData, dateTime: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-violet-500 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Duration (minutes)</label>
                      <input
                        type="number"
                        min="5"
                        value={formData.duration}
                        onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value, 10) || 60 })}
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-violet-500 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Link with Active Job Posting (Optional)</label>
                    <select
                      value={formData.relatedJob}
                      onChange={(e) => handleJobChange(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-violet-500 outline-none transition-all text-slate-700"
                    >
                      <option value="">-- No Linked Job --</option>
                      {jobs.map(job => (
                        <option key={job._id} value={job._id}>{job.companyName} - {job.role} ({job.package} LPA)</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Company / Recruiter Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Microsoft / TCS"
                      value={formData.companyName}
                      disabled={!!formData.relatedJob}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none transition-all disabled:opacity-50 disabled:bg-slate-50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Event Description / Agenda</label>
                    <textarea
                      rows="3"
                      placeholder="Specify topics, key eligibility information, and drive timeline..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-violet-500 outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Event Banner / Video Attachment</label>
                    
                    {/* Media Drag and Drop Zone */}
                    <div
                      onClick={() => mediaInputRef.current?.click()}
                      onDragOver={e => e.preventDefault()}
                      onDrop={e => { e.preventDefault(); handleMediaUpload(e); }}
                      className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-colors relative ${
                        isUploadingMedia ? 'opacity-50 pointer-events-none' : ''
                      } ${formData.imageUrl || formData.videoUrl || formData.audioUrl ? 'border-violet-400 bg-violet-50/5' : 'border-slate-200 hover:border-violet-400 hover:bg-slate-50'}`}
                    >
                      <input
                        ref={mediaInputRef}
                        type="file"
                        accept="image/*,video/*,audio/*"
                        className="hidden"
                        onChange={handleMediaUpload}
                      />
                      
                      {isUploadingMedia ? (
                        <div className="flex flex-col items-center justify-center py-2">
                          <Loader2 className="w-8 h-8 text-violet-500 animate-spin mb-2" />
                          <p className="text-sm font-semibold text-violet-600">Uploading media to server...</p>
                        </div>
                      ) : formData.imageUrl ? (
                        <div className="relative py-2">
                          <img src={formatMediaUrl(formData.imageUrl)} alt="Preview" className="w-full h-32 object-cover rounded-lg border border-slate-100" />
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setFormData(prev => ({ ...prev, imageUrl: '' })); }}
                            className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                          <p className="text-xs text-emerald-600 font-bold mt-2">✓ Image attached successfully</p>
                        </div>
                      ) : formData.videoUrl ? (
                        <div className="relative py-2">
                          <video src={formatMediaUrl(formData.videoUrl)} className="w-full h-32 object-cover rounded-lg border border-slate-100" />
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setFormData(prev => ({ ...prev, videoUrl: '' })); }}
                            className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                          <p className="text-xs text-emerald-600 font-bold mt-2">✓ Video attached successfully</p>
                        </div>
                      ) : formData.audioUrl ? (
                        <div className="relative py-2 flex flex-col items-center">
                          <div className="w-16 h-16 bg-violet-500/10 border border-violet-500/20 rounded-2xl flex items-center justify-center text-violet-500 mb-2">
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                            </svg>
                          </div>
                          <audio src={formatMediaUrl(formData.audioUrl)} controls className="w-full max-w-xs h-8" />
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setFormData(prev => ({ ...prev, audioUrl: '' })); }}
                            className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                          <p className="text-xs text-emerald-600 font-bold mt-2">✓ Audio attached successfully</p>
                        </div>
                      ) : (
                        <div className="py-2">
                          <Upload className="w-7 h-7 mx-auto text-slate-400 mb-2" />
                          <p className="text-sm font-semibold text-slate-700">Click to upload or drag & drop</p>
                          <p className="text-xs text-slate-400 mt-1">Image, Video, or Audio up to 50MB</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => setShowUrlInputs(v => !v)}
                      className="text-xs text-violet-600 hover:text-violet-700 font-bold"
                    >
                      {showUrlInputs ? 'Hide URL fields' : 'Or enter media URLs manually'}
                    </button>
                  </div>
                  
                  {showUrlInputs && (
                    <div className="space-y-4 pt-1">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Attached Image URL</label>
                        <input
                          type="url"
                          placeholder="e.g. https://images.unsplash.com/photo-..."
                          value={formData.imageUrl}
                          onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-violet-500 outline-none transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Attached Video URL</label>
                        <input
                          type="url"
                          placeholder="e.g. YouTube or Loom video link"
                          value={formData.videoUrl}
                          onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-violet-500 outline-none transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Attached Audio URL</label>
                        <input
                          type="url"
                          placeholder="e.g. Podcast or Webinar MP3 link"
                          value={formData.audioUrl}
                          onChange={(e) => setFormData({ ...formData, audioUrl: e.target.value })}
                          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-violet-500 outline-none transition-all"
                        />
                      </div>
                    </div>
                  )}

                  <div className="pt-4 flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setDrawerOpen(false)
                        setEditingEvent(null)
                        setFormData({
                          title: '',
                          description: '',
                          type: 'PPT',
                          mode: 'Physical',
                          location: '',
                          dateTime: '',
                          duration: 60,
                          companyName: '',
                          relatedJob: '',
                          imageUrl: '',
                          videoUrl: '',
                          audioUrl: ''
                        })
                      }}
                      className="flex-1 py-3 border border-slate-200 text-slate-500 font-bold rounded-xl text-sm hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={createEventMutation.isPending || updateEventMutation.isPending}
                      className="flex-1 py-3 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl text-sm disabled:opacity-50 transition-colors shadow-[0_4px_12px_rgba(124,58,237,0.25)]"
                    >
                      {editingEvent 
                        ? (updateEventMutation.isPending ? 'Updating...' : 'Save Changes') 
                        : (createEventMutation.isPending ? 'Scheduling...' : 'Confirm Schedule')
                      }
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ── Lightbox Media Preview Modal ── */}
        <AnimatePresence>
          {lightboxMedia && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setLightboxMedia(null)}
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col z-10"
              >
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between text-white bg-slate-950/40">
                  <div>
                    <h3 className="font-bold text-base truncate max-w-md">{lightboxMedia.title}</h3>
                    <p className="text-xs text-slate-400 font-semibold">{lightboxMedia.company}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={formatMediaUrl(lightboxMedia.url)}
                      download
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition-colors"
                    >
                      Download
                    </a>
                    <button 
                      onClick={() => setLightboxMedia(null)}
                      className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Content Body */}
                <div className="flex-1 p-6 flex items-center justify-center min-h-[300px] max-h-[70vh] bg-slate-950/20 overflow-y-auto">
                  {lightboxMedia.type === 'image' && (
                    <img 
                      src={formatMediaUrl(lightboxMedia.url)} 
                      alt={lightboxMedia.title} 
                      className="max-w-full max-h-[60vh] object-contain rounded-xl border border-slate-800/50 shadow-md"
                    />
                  )}
                  {lightboxMedia.type === 'video' && (
                    <div className="w-full aspect-video rounded-xl overflow-hidden bg-black max-h-[60vh]">
                      {lightboxMedia.url.includes('youtube.com') || lightboxMedia.url.includes('youtu.be') ? (
                        <iframe
                          className="w-full h-full"
                          src={lightboxMedia.url.replace('watch?v=', 'embed/').split('&')[0].replace('youtu.be/', 'youtube.com/embed/')}
                          title="YouTube video player"
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      ) : (
                        <video src={formatMediaUrl(lightboxMedia.url)} controls autoPlay className="w-full h-full object-contain" />
                      )}
                    </div>
                  )}
                  {lightboxMedia.type === 'audio' && (
                    <div className="bg-slate-800/80 border border-slate-700 p-8 rounded-2xl w-full max-w-md text-center space-y-5 shadow-lg">
                      <div className="w-20 h-20 bg-violet-500/10 border border-violet-500/20 rounded-full flex items-center justify-center mx-auto text-violet-500">
                        <svg className="w-10 h-10 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-base truncate">{lightboxMedia.title}</h4>
                        <p className="text-xs text-slate-400 mt-0.5">{lightboxMedia.company}</p>
                      </div>
                      <audio src={formatMediaUrl(lightboxMedia.url)} controls autoPlay className="w-full h-10" />
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </AppLayout>
  )
}
