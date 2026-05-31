import { useEffect, useState, useCallback } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from './useAuth'
import toast from 'react-hot-toast'
import API from '../api/axios'
import { createContext, useContext } from 'react'
import { X } from 'lucide-react'

const SocketContext = createContext(null)

export const SocketProvider = ({ children }) => {
  const { user }                         = useAuth()
  const [socket, setSocket]              = useState(null)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount]    = useState(0)

  useEffect(() => {
    if (!user) return

    const s = io(import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000', {
      transports: ['websocket', 'polling'],
      withCredentials: true,
    })

    // Fetch initial notifications
    const fetchNotifs = async () => {
      try {
        const { data } = await API.get('/notifications')
        if (data.success && data.notifications) {
          const mapped = data.notifications.map(n => ({
            title:     n.title,
            body:      n.message,
            timestamp: n.createdAt,
            isRead:    n.isRead,
          }))
          setNotifications(mapped)
          setUnreadCount(data.unreadCount || 0)
        }
      } catch {
        // fail silently
      }
    }
    fetchNotifs()

    s.on('connect', () => {
      const userId = user?.user?._id || user?._id
      const role   = user?.user?.role || user?.role
      if (userId) s.emit('join_room', userId)
      if (role === 'admin') s.emit('join_admin_room')
    })

    // Application status change (student gets notified)
    s.on('application:status_changed', (data) => {
      const msg = `${data.companyName} — ${data.newStatus.toUpperCase()}`
      toast.custom((t) => (
        <div className={`bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/40 p-4 flex items-start gap-4 w-[340px] pointer-events-auto transition-all duration-300 ${t.visible ? 'animate-enter' : 'animate-leave'}`}>
          <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0 mt-0.5 border border-orange-200">
            <span className="w-3 h-3 bg-orange-500 rounded-full" />
          </div>
          <div className="flex-1 pr-4">
            <p className="text-[15px] font-bold text-slate-900 leading-tight">Application Update</p>
            <p className="text-[13px] text-slate-500 mt-1 leading-relaxed">{msg}</p>
          </div>
          <button onClick={() => toast.dismiss(t.id)} className="text-slate-400 hover:text-slate-700 transition-colors p-1 -mt-1 -mr-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      ), { duration: 4000 })
      setNotifications(prev => [{ title: 'Application Update', body: msg, timestamp: data.timestamp, isRead: false }, ...prev.slice(0, 19)])
      setUnreadCount(c => c + 1)
    })

    // New job posted (all users)
    s.on('job:new_posted', (data) => {
      const msg = `${data.job?.role} at ${data.job?.companyName}`
      toast.custom((t) => (
        <div className={`bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/40 p-4 flex items-start gap-4 w-[340px] pointer-events-auto transition-all duration-300 ${t.visible ? 'animate-enter' : 'animate-leave'}`}>
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5 border border-green-200">
            <span className="w-3 h-3 bg-green-500 rounded-full" />
          </div>
          <div className="flex-1 pr-4">
            <p className="text-[15px] font-bold text-slate-900 leading-tight">New Job Posted</p>
            <p className="text-[13px] text-slate-500 mt-1 leading-relaxed">{msg}</p>
          </div>
          <button onClick={() => toast.dismiss(t.id)} className="text-slate-400 hover:text-slate-700 transition-colors p-1 -mt-1 -mr-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      ), { duration: 4000 })
      setNotifications(prev => [{ title: 'New Job', body: msg, timestamp: new Date().toISOString(), isRead: false }, ...prev.slice(0, 19)])
      setUnreadCount(c => c + 1)
    })

    // TPO Announcement (broadcast)
    s.on('admin:announcement', (data) => {
      toast.custom((t) => (
        <div className={`bg-gradient-to-br from-orange-50/90 to-white/90 backdrop-blur-xl rounded-2xl shadow-xl border border-orange-200/50 p-4 flex items-start gap-4 w-[340px] pointer-events-auto transition-all duration-300 ${t.visible ? 'animate-enter' : 'animate-leave'}`}>
          <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0 mt-0.5 border border-orange-200">
            <div className="w-3 h-3 bg-orange-500 rounded-full animate-pulse-live" />
          </div>
          <div className="flex-1 pr-4">
            <p className="text-[15px] font-bold text-slate-900 leading-tight">{data.title}</p>
            <p className="text-[13px] text-slate-600 mt-1 leading-relaxed">{data.message}</p>
          </div>
          <button onClick={() => toast.dismiss(t.id)} className="text-slate-400 hover:text-slate-700 transition-colors p-1 -mt-1 -mr-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      ), { duration: 6000 })
      setNotifications(prev => [{ title: data.title, body: data.message, timestamp: data.timestamp, isRead: false }, ...prev.slice(0, 19)])
      setUnreadCount(c => c + 1)
    })

    setSocket(s)
    return () => { s.disconnect(); setSocket(null) }
  }, [user])

  const clearNotifications = useCallback(() => setNotifications([]), [])
  const markAllReadAndOpen  = useCallback(async () => {
    setUnreadCount(0)
    try { await API.patch('/notifications/read-all') } catch { /* ignore */ }
  }, [])

  return (
    <SocketContext.Provider value={{ socket, notifications, unreadCount, clearNotifications, markAllReadAndOpen }}>
      {children}
    </SocketContext.Provider>
  )
}

export const useSocket = () => {
  const ctx = useContext(SocketContext)
  if (!ctx) return { socket: null, notifications: [], clearNotifications: () => {} }
  return ctx
}
