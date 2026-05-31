import { useState, useRef, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useSocket } from '../../hooks/useSocket'

/* Role-specific avatar illustrations from Stitch MCP */
const ROLE_AVATAR = {
  admin:   '/avatar_admin.svg',
  company: '/avatar_company.svg',
  student: '/avatar_student.svg',
}

const ROLE_AVATAR_BG = {
  admin:   'ring-violet-200',
  company: 'ring-teal-200',
  student: 'ring-orange-200',
  alumni:  'ring-sky-200',
}

const ROLE_BELL_HOVER = {
  admin:   'hover:bg-violet-50 hover:text-violet-600 hover:border-violet-200',
  company: 'hover:bg-teal-50 hover:text-teal-600 hover:border-teal-200',
  student: 'hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200',
  alumni:  'hover:bg-sky-50 hover:text-sky-600 hover:border-sky-200',
}

const ROLE_NOTIF_BG = {
  admin:   'bg-violet-600',
  company: 'bg-teal-500',
  student: 'bg-orange-500',
  alumni:  'bg-sky-500',
}

const ROLE_NOTIF_CLEAR_HOVER = {
  admin:   'hover:text-violet-600',
  company: 'hover:text-teal-600',
  student: 'hover:text-orange-600',
  alumni:  'hover:text-sky-600',
}

const Topbar = ({ title, subtitle }) => {
  const { user }                              = useAuth()
  const { notifications, unreadCount, clearNotifications, markAllReadAndOpen } = useSocket()
  const [notifOpen, setNotifOpen]             = useState(false)
  const notifRef                              = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const name      = user?.user?.name || user?.name || ''
  const role      = user?.user?.role || user?.role || 'student'
  const roleLabel = { admin: 'TPO Admin', student: 'Student', company: 'Recruiter' }[role] || role

  const avatarSrc   = user?.user?.avatar || user?.avatar || ROLE_AVATAR[role] || ROLE_AVATAR.student
  const avatarRing  = ROLE_AVATAR_BG[role] || ROLE_AVATAR_BG.student
  const bellHover   = ROLE_BELL_HOVER[role] || ROLE_BELL_HOVER.student
  const notifBg     = ROLE_NOTIF_BG[role] || ROLE_NOTIF_BG.student
  const clearHover  = ROLE_NOTIF_CLEAR_HOVER[role] || ROLE_NOTIF_CLEAR_HOVER.student

  return (
    <header
      className="portal-topbar h-[64px] sticky top-0 z-30 flex items-center px-6 lg:px-8 gap-6"
    >

      {/* ── Left: Page title ── */}
      <div className="flex-1 min-w-0">
        <h1 className="text-lg font-bold text-slate-900 leading-tight truncate tracking-tight">{title}</h1>
        {subtitle && (
          <p className="text-xs text-slate-400 font-medium mt-0.5 truncate">{subtitle}</p>
        )}
      </div>

      {/* ── Right: Actions ── */}
      <div className="flex items-center gap-2.5 flex-shrink-0">

        {/* Notification bell */}
        <div className="relative" ref={notifRef}>
          <button
            id="topbar-notifications-btn"
            onClick={() => { setNotifOpen(v => !v); if (!notifOpen) markAllReadAndOpen() }}
            className={`relative w-9 h-9 flex items-center justify-center rounded-xl bg-white/60 border border-white/40 text-slate-500 transition-all ${bellHover}`}
          >
            <Bell style={{ width: '16px', height: '16px' }} />
            {unreadCount > 0 && (
              <span className={`absolute -top-1.5 -right-1.5 w-4.5 h-4.5 min-w-[18px] ${notifBg} text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white leading-none px-0.5`}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-11 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden">
              {/* Header */}
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
                <p className="text-[13px] font-bold text-slate-800">Notifications</p>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">Live</span>
                  </div>
                  {notifications.length > 0 && (
                    <button onClick={clearNotifications} className={`text-xs text-slate-400 ${clearHover} transition-colors font-semibold`}>
                      Clear all
                    </button>
                  )}
                </div>
              </div>

              {/* Body */}
              <div className="max-h-72 overflow-y-auto overscroll-contain">
                {notifications.length === 0 ? (
                  <div className="py-10 text-center flex flex-col items-center justify-center">
                    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center mb-3 border border-slate-100">
                      <Bell style={{ width: '16px', height: '16px', color: '#cbd5e1' }} />
                    </div>
                    <p className="text-[13px] text-slate-700 font-bold">All caught up!</p>
                    <p className="text-xs text-slate-400 font-medium mt-1">No new notifications.</p>
                  </div>
                ) : (
                  notifications.map((n, i) => (
                    <div key={i} className="px-4 py-3 border-b border-slate-100/60 last:border-0 hover:bg-slate-50 transition-colors">
                      <div className="flex justify-between items-start gap-2">
                        <p className="text-[12px] font-semibold text-slate-800 flex-1 leading-snug">{n.title || n.message}</p>
                        <span className="text-[10px] text-slate-400 font-semibold flex-shrink-0 mt-0.5">
                          {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      {n.body && <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{n.body}</p>}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="w-px h-6" style={{ background: 'rgba(0,0,0,0.12)' }} />

        {/* User chip */}
        <div className="flex items-center gap-2.5 pl-0.5">
          <div className="hidden sm:block text-right">
            <p className="text-sm font-semibold tracking-tight text-slate-800 leading-none">{name || 'User'}</p>
            <p className="text-xs text-slate-400 font-medium mt-0.5">{roleLabel}</p>
          </div>
          {/* Custom avatar — SVG illustration, never a letter box */}
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center overflow-hidden ring-2 shadow-sm bg-white/60 ${avatarRing}`}>
            <img
              src={avatarSrc}
              alt={name || role}
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback to role SVG if photo fails
                e.target.src = ROLE_AVATAR[role] || ROLE_AVATAR.student
              }}
            />
          </div>
        </div>
      </div>
    </header>
  )
}

export default Topbar
