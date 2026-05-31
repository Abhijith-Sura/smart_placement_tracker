import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { PageSpinner } from '../ui/Spinner'

const ProtectedRoute = ({ roles }) => {
  const { user, loading } = useAuth()
  if (loading) return <PageSpinner />
  if (!user)   return <Navigate to="/login" replace />

  const role = user?.user?.role || user?.role
  if (roles && !roles.includes(role)) return <Navigate to="/unauthorized" replace />

  return <Outlet />
}

export default ProtectedRoute
