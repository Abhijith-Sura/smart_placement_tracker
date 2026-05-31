// ─── PlaceIQ Design System — Dark Theme ───────────────────────
// Import: import { tw } from '../lib/tw'

export const tw = {

  // ─── Buttons ───────────────────────────────────────────────
  btnBase:     'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none text-sm',
  btnPrimary:  'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-[0_4px_16px_rgba(249,115,22,0.35)] hover:shadow-[0_8px_24px_rgba(249,115,22,0.45)] hover:-translate-y-0.5 active:scale-[0.97]',
  btnSecondary:'bg-orange-500/10 text-orange-400 border border-orange-500/20 hover:bg-orange-500/20 hover:-translate-y-0.5 active:scale-[0.97]',
  btnOutline:  'text-slate-300 border border-white/10 hover:bg-white/5 hover:border-white/20 hover:-translate-y-0.5 active:scale-[0.97]',
  btnGhost:    'bg-transparent text-slate-400 hover:bg-white/5 hover:text-slate-100 active:scale-[0.97]',
  btnDanger:   'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-[0_4px_12px_rgba(239,68,68,0.3)] hover:shadow-[0_8px_20px_rgba(239,68,68,0.4)] hover:-translate-y-0.5 active:scale-[0.97]',
  btnSm:       'px-3 py-1.5 text-xs rounded-lg',
  btnMd:       'px-5 py-2.5',
  btnLg:       'px-7 py-3.5 text-base rounded-2xl',

  // ─── Cards ─────────────────────────────────────────────────
  card:       'bg-[#111827] rounded-2xl border border-white/8',
  cardHover:  'bg-[#111827] rounded-2xl border border-white/8 hover:bg-[#1a2234] transition-all duration-200 cursor-pointer',
  cardBody:   'p-5',
  cardHeader: 'px-5 py-4 border-b border-white/8 flex items-center justify-between',

  // ─── Inputs ────────────────────────────────────────────────
  input:      'w-full px-4 py-3 rounded-xl border border-white/10 bg-[#111827] text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all duration-200 hover:border-white/20',
  inputError: 'border-red-500 focus:border-red-500 focus:ring-red-500/15',
  label:      'block text-sm font-semibold text-slate-300 mb-1.5',

  // ─── Badges ────────────────────────────────────────────────
  badgeBase:   'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap',
  badgeOrange: 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
  badgeGreen:  'bg-green-500/10 text-green-400 border border-green-500/20',
  badgeAmber:  'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  badgeRed:    'bg-red-500/10 text-red-400 border border-red-500/20',
  badgeBlue:   'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  badgePurple: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
  badgeGray:   'bg-white/5 text-slate-400 border border-white/10',

  // ─── Sidebar Nav ───────────────────────────────────────────
  navItem:       'relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-400 cursor-pointer transition-all duration-200 hover:bg-white/5 hover:text-white',
  navItemActive: 'relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold bg-orange-500 text-white shadow-[0_4px_12px_rgba(249,115,22,0.30)]',

  // ─── Text ──────────────────────────────────────────────────
  pageTitle:    'text-2xl font-extrabold text-slate-100 tracking-tight',
  sectionTitle: 'text-base font-bold text-slate-200',
  muted:        'text-sm text-slate-400 font-medium',
}

// ─── Status badge helper ────────────────────────────────────
export const statusBadge = (status) => {
  const map = {
    applied:     tw.badgeBlue,
    shortlisted: tw.badgeAmber,
    interview:   tw.badgePurple,
    selected:    tw.badgeGreen,
    rejected:    tw.badgeRed,
    open:        tw.badgeGreen,
    closed:      tw.badgeGray,
    draft:       tw.badgeAmber,
    placed:      tw.badgeGreen,
    not_placed:  tw.badgeOrange,
  }
  return `${tw.badgeBase} ${map[status] || tw.badgeGray}`
}

export const statusLabel = (status) => {
  const map = {
    applied: 'Applied', shortlisted: 'Shortlisted', interview: 'Interview',
    selected: 'Selected', rejected: 'Rejected', open: 'Open', closed: 'Closed',
    draft: 'Draft', placed: 'Placed', not_placed: 'Not Placed',
  }
  return map[status] || status
}
