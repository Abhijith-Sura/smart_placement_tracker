export const Spinner = ({ size = 'md', className = '' }) => {
  const sizes = { sm: 'w-5 h-5', md: 'w-8 h-8', lg: 'w-12 h-12' }
  return (
    <span className={`relative inline-flex items-center justify-center ${sizes[size]} ${className}`}>
      <span className="absolute inset-0 rounded-full border-2 border-orange-100" />
      <span className="absolute inset-0 rounded-full border-2 border-transparent border-t-orange-500 animate-spin" />
      <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse-live" />
    </span>
  )
}

export const PageSpinner = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-[url('/dashboard_bg.png')] bg-[length:400px_400px] bg-repeat gap-5" style={{ backgroundColor: '#f8fafc' }}>
    <div className="relative">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-[0_8px_32px_rgba(249,115,22,0.40)] animate-glow-pulse">
        <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 14l9-5-9-5-9 5 9 5z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 14l6.16-3.422A12.083 12.083 0 0112 21.5a12.083 12.083 0 01-6.16-10.922L12 14z" />
        </svg>
      </div>
      <span className="absolute -inset-2 rounded-[22px] border-2 border-orange-200 border-t-orange-500 animate-spin-slow" />
    </div>
    <div className="text-center">
      <p className="text-base font-bold text-slate-900 tracking-tight">PlaceIQ</p>
      <p className="text-sm text-slate-400 font-medium mt-0.5">Loading your workspace…</p>
    </div>
  </div>
)

export default Spinner
