import { motion } from 'framer-motion'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import { useAuth } from '../../hooks/useAuth'

/* Role-specific background images */
const PORTAL_BG = {
  admin:   '/admin_portal_bg.png',
  company: '/company_portal_bg.png',
  student: '/student_portal_bg.png',
}

const AppLayout = ({ children, title, subtitle }) => {
  const { user } = useAuth()
  const role = user?.user?.role || user?.role || 'student'
  const bgImage = PORTAL_BG[role] || PORTAL_BG.student

  return (
    <div
      className="flex min-h-screen w-full overflow-x-hidden"
      style={{
        backgroundImage: `url('${bgImage}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Soft white tint — keeps cards readable while image clearly shows through */}
      <div className="fixed inset-0 bg-white/25 pointer-events-none" style={{ zIndex: 0 }} />

      <Sidebar />

      <div className="relative flex-1 min-w-0 ml-64 flex flex-col min-h-screen" style={{ zIndex: 10 }}>
        <Topbar title={title} subtitle={subtitle} />
        <motion.main
          className="flex-1 min-w-0 p-6 lg:p-8"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          {children}
        </motion.main>
      </div>
    </div>
  )
}

export default AppLayout
