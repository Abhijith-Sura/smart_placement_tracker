import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/common/ProtectedRoute'
import { useAuth } from './hooks/useAuth'
import { PageSpinner } from './components/ui/Spinner'

// Public
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import ResetPassword from './pages/ResetPassword'

import AppLayout from './components/layout/AppLayout'

// Admin
import AdminDashboard from './pages/admin/Dashboard'
import AdminStudents from './pages/admin/Students'
import AdminCompanies from './pages/admin/Companies'
import AdminJobs from './pages/admin/Jobs'
import AdminPipeline from './pages/admin/Pipeline'
import PipelineIndex from './pages/admin/PipelineIndex'
import AdminAnalytics from './pages/admin/Analytics'
import ApplicationRounds from './pages/admin/ApplicationRounds'
import AdminEvents from './pages/admin/Events'
import AdminProfile from './pages/admin/Profile'
import Campaigns from './pages/admin/Campaigns'
import AuditLogs from './pages/admin/AuditLogs'

// Student
import StudentDashboard from './pages/student/Dashboard'
import StudentJobs from './pages/student/Jobs'
import StudentExternalJobs from './pages/student/ExternalJobs'
import StudentApplications from './pages/student/Applications'
import StudentProfile from './pages/student/Profile'
import StudentEvents from './pages/student/Events'

// Company
import CompanyDashboard from './pages/company/Dashboard'
import CompanyJobs from './pages/company/Jobs'
import CompanyPostJob from './pages/company/PostJob'
import CompanyProfile from './pages/company/Profile'
import CompanyEvents from './pages/company/Events'
import CompanyPipelineIndex from './pages/company/PipelineIndex'
import CompanyAssessments from './pages/company/Assessments'

// Alumni
import AlumniDashboard from './pages/alumni/Dashboard'
import AlumniReferrals from './pages/alumni/Referrals'
import AlumniProfile from './pages/alumni/Profile'

// Student Referral Feed
import StudentReferrals from './pages/student/Referrals'

// Shared
import Messages from './pages/student/Messages'
import AssessmentWorkspace from './pages/student/AssessmentWorkspace'

export default function App() {
  const { user, loading } = useAuth()

  if (loading) return <PageSpinner />

  return (
    <>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={!user ? <Login /> : <Navigate to={`/${user?.user?.role || user?.role}/dashboard`} replace />} />
        <Route path="/register" element={!user ? <Register /> : <Navigate to={`/${user?.user?.role || user?.role}/dashboard`} replace />} />
        <Route path="/reset-password/:token" element={!user ? <ResetPassword /> : <Navigate to={`/${user?.user?.role || user?.role}/dashboard`} replace />} />

        {/* Admin Routes */}
        <Route element={<ProtectedRoute roles={['admin']}><AppLayout /></ProtectedRoute>}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/students" element={<AdminStudents />} />
          <Route path="/admin/companies" element={<AdminCompanies />} />
          <Route path="/admin/jobs" element={<AdminJobs />} />
          <Route path="/admin/pipeline" element={<PipelineIndex />} />
          <Route path="/admin/pipeline/:jobId" element={<AdminPipeline />} />
          <Route path="/admin/applications/:id/rounds" element={<ApplicationRounds />} />
          <Route path="/admin/analytics" element={<AdminAnalytics />} />
          <Route path="/admin/events" element={<AdminEvents />} />
          <Route path="/admin/assessments" element={<CompanyAssessments />} />
          <Route path="/admin/messages" element={<Messages />} />
          <Route path="/admin/campaigns" element={<Campaigns />} />
          <Route path="/admin/profile" element={<AdminProfile />} />
          <Route path="/admin/audit-logs" element={<AuditLogs />} />
        </Route>

        {/* Student Routes */}
        <Route element={<ProtectedRoute roles={['student']}><AppLayout /></ProtectedRoute>}>
          <Route path="/student/dashboard" element={<StudentDashboard />} />
          <Route path="/student/jobs" element={<StudentJobs />} />
          <Route path="/student/external-jobs" element={<StudentExternalJobs />} />
          <Route path="/student/referrals" element={<StudentReferrals />} />
          <Route path="/student/applications" element={<StudentApplications />} />
          <Route path="/student/applications/:id/rounds" element={<ApplicationRounds />} />
          <Route path="/student/events" element={<StudentEvents />} />
          <Route path="/student/profile" element={<StudentProfile />} />
          <Route path="/student/messages" element={<Messages />} />
        </Route>

        {/* Standalone Student IDE Workspace (No Sidebar Layout) */}
        <Route element={<ProtectedRoute roles={['student']} />}>
          <Route path="/student/assessment/take/:applicationId/:roundIdx" element={<AssessmentWorkspace />} />
        </Route>

        {/* Alumni Routes */}
        <Route element={<ProtectedRoute roles={['alumni']}><AppLayout /></ProtectedRoute>}>
          <Route path="/alumni/dashboard" element={<AlumniDashboard />} />
          <Route path="/alumni/referrals" element={<AlumniReferrals />} />
          <Route path="/alumni/profile" element={<AlumniProfile />} />
          <Route path="/alumni/messages" element={<Messages />} />
        </Route>

        {/* Company Routes */}
        <Route element={<ProtectedRoute roles={['company']}><AppLayout /></ProtectedRoute>}>
          <Route path="/company/dashboard" element={<CompanyDashboard />} />
          <Route path="/company/jobs" element={<CompanyJobs />} />
          <Route path="/company/pipeline" element={<CompanyPipelineIndex />} />
          <Route path="/company/pipeline/:jobId" element={<AdminPipeline />} />
          <Route path="/company/applications/:id/rounds" element={<ApplicationRounds />} />
          <Route path="/company/post-job" element={<CompanyPostJob />} />
          <Route path="/company/events" element={<CompanyEvents />} />
          <Route path="/company/assessments" element={<CompanyAssessments />} />
          <Route path="/company/profile" element={<CompanyProfile />} />
          <Route path="/company/messages" element={<Messages />} />
          <Route path="/company/campaigns" element={<Campaigns />} />
        </Route>

        {/* Catch-all */}
        <Route path="/unauthorized" element={<div className="p-10 text-center">Unauthorized</div>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}