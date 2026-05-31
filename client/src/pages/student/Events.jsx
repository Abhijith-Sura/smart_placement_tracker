import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, MapPin, Video, Clock, CheckCircle2, ChevronRight, AlertCircle, BookmarkCheck, X } from 'lucide-react'
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


export default function StudentEvents() {
  const queryClient = useQueryClient()
  const [brokenImages, setBrokenImages] = useState({})
  const [lightboxMedia, setLightboxMedia] = useState(null)
  const [activeTab, setActiveTab] = useState('all') // 'all' | 'rsvp' | 'eligible'

  // Fetch Student Profile for eligibility matches
  const { data: profileData } = useQuery({
    queryKey: ['student-profile'],
    queryFn: () => API.get('/students/profile').then(r => r.data)
  })

  // Fetch Events
  const { data: eventsData, isLoading } = useQuery({
    queryKey: ['student-events'],
    queryFn: () => API.get('/events').then(r => r.data)
  })

  // RSVP Mutation
  const rsvpMutation = useMutation({
    mutationFn: ({ id, isRegistered }) => {
      const method = isRegistered ? 'delete' : 'post'
      return API[method](`/events/${id}/rsvp`)
    },
    onSuccess: (data) => {
      toast.success(data.data.message || 'RSVP updated successfully!')
      queryClient.invalidateQueries({ queryKey: ['student-events'] })
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Something went wrong')
    }
  })

  if (isLoading) return <AppLayout title="Events"><PageSpinner /></AppLayout>

  const events = eventsData?.events || []
  const profile = profileData?.profile || null

  // Helper to determine if student matches job criteria
  const isEligibleForJob = (job) => {
    if (!job) return true // Public event
    if (!profile) return false
    if (!job.criteria) return true // No criteria, eligible by default
    const cgpaOk = typeof job.criteria.minCGPA === 'number' ? profile.CGPA >= job.criteria.minCGPA : true
    const backlogOk = typeof job.criteria.maxBacklogs === 'number' ? profile.backlogs <= job.criteria.maxBacklogs : true
    const branchOk = !job.criteria.allowedBranches || 
                     job.criteria.allowedBranches.includes('ALL') || 
                     job.criteria.allowedBranches.includes(profile.branch)
    return cgpaOk && backlogOk && branchOk
  }

  // Filter events based on active tab
  const filteredEvents = events.filter(event => {
    if (activeTab === 'rsvp') return event.isRegistered
    if (activeTab === 'eligible') return isEligibleForJob(event.relatedJob)
    return true
  })

  const getCalendarParts = (dateStr) => {
    const d = new Date(dateStr)
    const month = d.toLocaleString('default', { month: 'short' }).toUpperCase()
    const day = d.getDate()
    const weekday = d.toLocaleString('default', { weekday: 'short' })
    const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    return { month, day, weekday, time }
  }

  return (
    <AppLayout title="Placement Events" subtitle="Explore guest lectures, pre-placement talks, tests, and interview schedules.">
      <div className="space-y-6">
        
        <PageBanner
          title="Placement Events"
          subtitle="Register for upcoming campus placement drives, pre-placement talks, aptitude tests, and off-campus events."
          badge="Campus Events"
          badgeColor="bg-amber-50 text-amber-700 border-amber-100"
          compact
        />

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-100 pb-px">
          {['all', 'rsvp', 'eligible'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`relative pb-4 px-6 text-sm font-bold capitalize transition-all ${
                activeTab === tab ? 'text-orange-500' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {tab === 'all' && 'All Events'}
              {tab === 'rsvp' && 'My RSVPs'}
              {tab === 'eligible' && 'Eligible Drives'}
              {activeTab === tab && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500 rounded-full"
                />
              )}
            </button>
          ))}
        </div>

        {/* Events Grid */}
        <AnimatePresence mode="wait">
          {filteredEvents.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white rounded-3xl border border-slate-100 p-12 text-center shadow-sm"
            >
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100">
                <Calendar className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="text-lg font-bold text-slate-700">No events found</h3>
              <p className="text-slate-400 text-sm mt-1 max-w-md mx-auto">
                {activeTab === 'rsvp' 
                  ? "You haven't RSVP'd to any upcoming placement events yet." 
                  : activeTab === 'eligible'
                    ? "No events matching your branch/CGPA eligibility criteria."
                    : "No placement events are currently scheduled. Check back soon!"}
              </p>
            </motion.div>
          ) : (
            <motion.div
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid md:grid-cols-2 gap-6"
            >
              {filteredEvents.map((event) => {
                const { month, day, weekday, time } = getCalendarParts(event.dateTime)
                const isPast = new Date(event.dateTime) < new Date()
                const isEligible = isEligibleForJob(event.relatedJob)

                return (
                  <motion.div
                    layout
                    key={event._id}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ y: -4, transition: { duration: 0.2 } }}
                    className={`bg-white rounded-2xl border p-5 flex gap-4 shadow-sm hover:shadow-md transition-all relative overflow-hidden ${
                      event.isRegistered ? 'border-orange-200 bg-orange-50/10' : 'border-slate-100'
                    }`}
                  >
                    {/* Left: Premium Calendar Widget */}
                    <div className="w-16 h-20 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col overflow-hidden shadow-sm flex-shrink-0 text-center">
                      <div className="bg-slate-900 text-white py-1 text-[10px] font-bold uppercase tracking-wider">{month}</div>
                      <div className="flex-1 flex flex-col justify-center leading-none">
                        <span className="text-2xl font-bold text-slate-800">{day}</span>
                        <span className="text-[10px] font-bold text-slate-400 mt-0.5">{weekday}</span>
                      </div>
                    </div>

                    {/* Right: Event Information */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-lg border ${
                            TYPE_COLORS[event.type] || TYPE_COLORS['Other']
                          }`}>
                            {event.type}
                          </span>
                          
                          {/* Eligibility Badge */}
                          {event.relatedJob && (
                            <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-lg border ${
                              isEligible 
                                ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                                : 'bg-red-50 text-red-600 border-red-100'
                            }`}>
                              {isEligible ? 'Eligible' : 'Ineligible'}
                            </span>
                          )}

                          {event.isRegistered && (
                            <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-lg bg-orange-100 text-orange-600 border border-orange-200 flex items-center gap-1">
                              <BookmarkCheck className="w-3 h-3" /> Registered
                            </span>
                          )}
                        </div>

                        <h3 className="text-base font-bold text-slate-800 truncate leading-snug">{event.title}</h3>
                        <p className="text-xs font-bold text-slate-500 mt-0.5">{event.companyName}</p>

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
                                <div className="absolute w-12 h-12 bg-red-600 rounded-full flex items-center justify-center text-white shadow-md group-hover/media:scale-110 transition-transform">
                                  <Video className="w-6 h-6 fill-white" />
                                </div>
                              </div>
                            ) : (
                              <div className="w-full h-full relative flex items-center justify-center bg-slate-900">
                                <video src={formatMediaUrl(event.videoUrl)} className="w-full h-full object-cover opacity-60" />
                                <div className="absolute w-12 h-12 bg-orange-600 rounded-full flex items-center justify-center text-white shadow-md group-hover/media:scale-110 transition-transform">
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
                            className="mt-3 p-3 bg-slate-50 border border-slate-100 hover:border-orange-300 hover:bg-orange-50/5 rounded-xl flex items-center gap-3 cursor-pointer group/audio transition-all"
                          >
                            <div 
                              className="w-10 h-10 rounded-xl bg-orange-500/10 group-hover/audio:bg-orange-500/20 border border-orange-500/20 flex items-center justify-center text-orange-655 shrink-0"
                              title="Open Audio Player"
                            >
                              <svg className="w-5 h-5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                              <span className="text-xs font-bold text-slate-600 group-hover/audio:text-orange-600 transition-colors truncate">Listen Podcast / Webinar</span>
                              <audio 
                                src={formatMediaUrl(event.audioUrl)} 
                                controls 
                                onClick={(e) => e.stopPropagation()} 
                                className="w-36 h-7 opacity-90 scale-95 origin-right" 
                              />
                            </div>
                          </div>
                        )}

                        {event.description && (
                          <p className="text-xs text-slate-400 mt-2 font-medium line-clamp-2">{event.description}</p>
                        )}
                      </div>

                      {/* Location & Actions */}
                      <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between gap-2">
                        <div className="flex flex-col gap-1 text-[11px] text-slate-400 font-medium">
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-300" /> {time} ({event.duration} min)
                          </span>
                          <span className="flex items-center gap-1.5 truncate">
                            {event.mode === 'Virtual' ? (
                              <>
                                <Video className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
                                <a href={event.location} target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:underline">Join Virtual Room</a>
                              </>
                            ) : (
                              <>
                                <MapPin className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" /> {event.location}
                              </>
                            )}
                          </span>
                        </div>

                        {/* RSVP Action */}
                        {!isPast && event.status !== 'Cancelled' ? (
                          <button
                            onClick={() => rsvpMutation.mutate({ id: event._id, isRegistered: event.isRegistered })}
                            disabled={rsvpMutation.isPending || (!isEligible && event.relatedJob)}
                            className={`px-4 py-2 text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5 shrink-0 ${
                              event.isRegistered
                                ? 'bg-slate-50 hover:bg-red-50 text-slate-600 hover:text-red-600 hover:border-red-100 border border-slate-200'
                                : 'bg-orange-500 hover:bg-orange-600 text-white'
                            } disabled:opacity-40 disabled:cursor-not-allowed`}
                          >
                            {rsvpMutation.isPending ? 'Updating...' : event.isRegistered ? 'Cancel RSVP' : 'Register'}
                          </button>
                        ) : (
                          <span className="text-[10px] font-bold uppercase text-slate-400 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> {event.status}
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </motion.div>
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
                      <div className="w-20 h-20 bg-orange-500/10 border border-orange-500/20 rounded-full flex items-center justify-center mx-auto text-orange-500">
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
