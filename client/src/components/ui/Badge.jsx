import { tw, statusBadge, statusLabel } from '../../lib/tw'

const colorMap = {
  orange: tw.badgeOrange,
  green:  tw.badgeGreen,
  amber:  tw.badgeAmber,
  red:    tw.badgeRed,
  blue:   tw.badgeBlue,
  purple: tw.badgePurple,
  gray:   tw.badgeGray,
}

const dotColors = {
  orange: 'bg-orange-500', green: 'bg-green-500', amber: 'bg-amber-500',
  red: 'bg-red-500', blue: 'bg-blue-500', purple: 'bg-purple-500', gray: 'bg-slate-400',
}

const statusDotColors = {
  applied: 'bg-blue-500', shortlisted: 'bg-amber-500', interview: 'bg-purple-500',
  selected: 'bg-green-500', rejected: 'bg-red-500', open: 'bg-green-500',
  closed: 'bg-slate-400', draft: 'bg-amber-500', placed: 'bg-green-500', not_placed: 'bg-orange-500',
}

const Badge = ({ children, color, status, dot = true, className = '' }) => {
  const colorClass = status
    ? statusBadge(status)
    : `${tw.badgeBase} ${colorMap[color] || tw.badgeGray}`

  const dotColor = status
    ? statusDotColors[status] || 'bg-slate-400'
    : dotColors[color] || 'bg-slate-400'

  return (
    <span className={`${colorClass} ${className}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColor} flex-shrink-0`} />}
      {status ? statusLabel(status) : children}
    </span>
  )
}

export default Badge
