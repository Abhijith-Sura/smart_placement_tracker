import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, Briefcase, BarChart3,
  Building2, User, FileText, LogOut,
  PlusCircle, List, MessageSquare, Mail,
  ChevronRight, Calendar,
  GraduationCap, History,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import PlaceIQLogo from '../ui/PlaceIQLogo'

/* Role-specific avatar illustrations */
const ROLE_AVATAR = {
  admin:   '/avatar_admin.svg',
  company: '/avatar_company.svg',
  student: '/avatar_student.svg',
  alumni:  '/avatar_student.svg',
}

/* Glass background tint per portal — matches the background image colour family */
const PORTAL_GLASS = {
  student: 'rgba(251, 146, 60,  0.18)',   // warm amber — matches student bokeh bg
  admin:   'rgba(109, 40,  217, 0.20)',   // deep violet — matches new rich admin bg
  company: 'rgba(20,  184, 166, 0.20)',   // rich teal   — matches new rich company bg
  alumni:  'rgba(14,  165, 233, 0.18)',   // rich sky blue
}

const PORTAL_BORDER = {
  student: 'rgba(251, 146, 60,  0.22)',
  admin:   'rgba(109, 40,  217, 0.25)',
  company: 'rgba(20,  184, 166, 0.28)',
  alumni:  'rgba(14,  165, 233, 0.22)',
}


const NAV_CONFIG = {
  admin: [
    {
      label: 'MAIN',
      items: [
        { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/admin/students',  icon: Users,           label: 'Students'  },
        { to: '/admin/jobs',      icon: Briefcase,       label: 'Job Postings' },
        { to: '/admin/assessments', icon: FileText,       label: 'Assessments' },
        { to: '/admin/analytics', icon: BarChart3,       label: 'Analytics' },
        { to: '/admin/companies', icon: Building2,       label: 'Companies' },
        { to: '/admin/events',    icon: Calendar,        label: 'Campus Events' },
        { to: '/admin/pipeline',  icon: List,            label: 'Pipeline'  },
        { to: '/admin/profile',   icon: User,            label: 'Profile'   },
        { to: '/admin/audit-logs', icon: History,         label: 'Audit Logs' },
      ],
    },
    {
      label: 'COMMUNICATION',
      items: [
        { to: '/admin/messages',  icon: MessageSquare,   label: 'Messages'  },
        { to: '/admin/campaigns', icon: Mail,            label: 'Campaigns' },
      ],
    },
  ],
  company: [
    {
      label: 'MAIN',
      items: [
        { to: '/company/dashboard', icon: LayoutDashboard, label: 'Dashboard'       },
        { to: '/company/jobs',      icon: Briefcase,       label: 'My Jobs'         },
        { to: '/company/assessments', icon: FileText,        label: 'Assessments'     },
        { to: '/company/post-job',  icon: PlusCircle,      label: 'Post a Job'      },
        { to: '/company/events',    icon: Calendar,        label: 'Events'          },
        { to: '/company/pipeline',  icon: List,            label: 'Pipeline'        },
        { to: '/company/profile',   icon: Building2,       label: 'Company Profile' },
      ],
    },
    {
      label: 'COMMUNICATION',
      items: [
        { to: '/company/messages',  icon: MessageSquare,   label: 'Messages' },
        { to: '/company/campaigns', icon: Mail,            label: 'Campaigns' },
      ],
    },
  ],
  alumni: [
    {
      label: 'MAIN',
      items: [
        { to: '/alumni/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/alumni/referrals', icon: Briefcase,       label: 'My Referrals' },
        { to: '/alumni/profile',   icon: User,            label: 'Profile' },
      ],
    },
    {
      label: 'COMMUNICATION',
      items: [
        { to: '/alumni/messages',  icon: MessageSquare,   label: 'Messages'  },
      ],
    },
  ],
  student: [
    {
      label: 'MAIN',
      items: [
        { to: '/student/dashboard',     icon: LayoutDashboard, label: 'Dashboard'       },
        { to: '/student/jobs',          icon: Briefcase,       label: 'Campus Drives'   },
        { to: '/student/external-jobs', icon: FileText,        label: 'External Jobs'   },
        { to: '/student/referrals',     icon: Users,           label: 'Alumni Referrals' },
        { to: '/student/applications',  icon: List,            label: 'My Applications' },
        { to: '/student/events',        icon: Calendar,        label: 'Events'          },
        { to: '/student/profile',       icon: User,            label: 'My Profile'      },
      ],
    },
    {
      label: 'COMMUNICATION',
      items: [
        { to: '/student/messages', icon: MessageSquare, label: 'Messages' },
      ],
    },
  ],
}

const rolePortalLabel = {
  admin:   'Admin Portal',
  company: 'Company Portal',
  student: 'Student Portal',
  alumni:  'Alumni Portal',
}

const roleBadgeColors = {
  admin:   'bg-violet-100/80 text-violet-800  border-violet-200/60',
  company: 'bg-teal-100/80   text-teal-800    border-teal-200/60',
  student: 'bg-orange-50/80  text-orange-700  border-orange-200/60',
  alumni:  'bg-sky-50/80     text-sky-700     border-sky-200/60',
}

/* Active pill colour per portal */
const PORTAL_ACTIVE_BG = {
  student: 'bg-orange-500',
  admin:   'bg-violet-600',
  company: 'bg-teal-500',
  alumni:  'bg-sky-500',
}

/* Active pill shadow */
const PORTAL_ACTIVE_SHADOW = {
  student: '0 4px 14px rgba(249,115,22,0.35)',
  admin:   '0 4px 14px rgba(109,40,217,0.35)',
  company: '0 4px 14px rgba(20,184,166,0.35)',
  alumni:  '0 4px 14px rgba(14,165,233,0.35)',
}

export default function Sidebar() {
  const { user, logout } = useAuth()

  const role     = user?.user?.role || user?.role || 'student'
  const sections = NAV_CONFIG[role] || []
  const name     = user?.user?.name  || user?.name  || ''
  const email    = user?.user?.email || user?.email || ''
  const avatarSrc = ROLE_AVATAR[role] || ROLE_AVATAR.student

  const glassColor   = PORTAL_GLASS[role]         || PORTAL_GLASS.student
  const borderColor  = PORTAL_BORDER[role]         || PORTAL_BORDER.student
  const activeBg     = PORTAL_ACTIVE_BG[role]      || PORTAL_ACTIVE_BG.student
  const activeShadow = PORTAL_ACTIVE_SHADOW[role]  || PORTAL_ACTIVE_SHADOW.student

  return (
    <aside
      className="w-64 h-screen fixed top-0 left-0 z-40 flex flex-col"
      style={{
        background: glassColor,
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderRight: `1px solid ${borderColor}`,
        boxShadow: '4px 0 32px rgba(0,0,0,0.06)',
      }}
    >
      {/* ── Logo ── */}
      <div className="px-5 py-5" style={{ borderBottom: `1px solid ${borderColor}` }}>
        <div className="flex items-center gap-3">
          <PlaceIQLogo />
          <div>
            <p className="text-base font-bold tracking-tight text-slate-900 leading-none">PlaceIQ</p>
            <span className={`inline-block text-xs font-semibold uppercase tracking-widest mt-1.5 px-2 py-0.5 rounded-full border ${roleBadgeColors[role]}`}>
              {rolePortalLabel[role]}
            </span>
          </div>
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 px-3 py-5 overflow-y-auto">
        {sections.map((section, si) => (
          <div key={si} className="mb-6">
            {section.label && (
              <p className="text-xs font-semibold tracking-widest text-slate-400 uppercase px-3 pb-2.5">
                {section.label}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    isActive
                      ? `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold ${activeBg} text-white transition-all`
                      : 'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-white/50 hover:text-slate-900 transition-all'
                  }
                  style={({ isActive }) => isActive ? { boxShadow: activeShadow } : {}}
                >
                  {({ isActive }) => (
                    <>
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
                        isActive ? 'bg-white/25' : 'bg-white/40'
                      }`}>
                        <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-600'}`} />
                      </div>
                      <span className="flex-1 leading-none">{label}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* ── User Footer ── */}
      <div className="px-3 py-4" style={{ borderTop: `1px solid ${borderColor}` }}>
        <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/50 transition-colors group cursor-default">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-9 h-9 rounded-xl overflow-hidden bg-white/60 border border-white/40">
              <img
                src={avatarSrc}
                alt={name || role}
                className="w-full h-full object-cover"
                onError={(e) => { e.target.src = ROLE_AVATAR[role] || ROLE_AVATAR.student }}
              />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 border-2 border-white/60 rounded-full" />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold tracking-tight text-slate-900 truncate leading-none">{name}</p>
            <p className="text-xs text-slate-500 truncate font-medium mt-0.5">{email}</p>
          </div>

          {/* Logout */}
          <button
            onClick={logout}
            title="Logout"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-all flex-shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
