import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm, useFieldArray } from 'react-hook-form'
import { Camera, CheckCircle, Upload, X, Link as LinkIcon, FileText, Sparkles, BarChart3, ChevronRight, User, Loader2, GraduationCap } from 'lucide-react'
import AppLayout from '../../components/layout/AppLayout'
import { PageSpinner } from '../../components/ui/Spinner'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import PageBanner from '../../components/ui/PageBanner'
import API from '../../api/axios'
import toast from 'react-hot-toast'
import { useAuth } from '../../hooks/useAuth'

const BRANCHES = ['CSE','ECE','ME','CE','MBA','EEE','IT']
const TABS = ['Personal', 'Academic', 'Experience & Projects', 'Achievements', 'Resume & Skills', 'Document Locker']

const AVATAR_TEMPLATES = [
  { name: 'Formal Suit (Male)', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jack&clothing=blazerAndShirt&eyebrows=defaultNatural&eyes=default' },
  { name: 'Formal Suit (Female)', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lilly&clothing=blazerAndShirt&eyebrows=defaultNatural&eyes=default' },
  { name: 'Corporate Attire (Male)', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Oliver&clothing=blazerAndShirt&eyebrows=defaultNatural&eyes=default' },
  { name: 'Corporate Attire (Female)', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sophia&clothing=blazerAndShirt&eyebrows=defaultNatural&eyes=default' },
  { name: 'Business Casual (Male)', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&clothing=collarAndSweater&eyebrows=defaultNatural&eyes=happy' },
  { name: 'Business Casual (Female)', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka&clothing=collarAndSweater&eyebrows=defaultNatural&eyes=happy' },
  { name: 'Smart Academic (Male)', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Milo&clothing=collarAndSweater&eyebrows=defaultNatural&eyes=default' },
  { name: 'Smart Academic (Female)', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Daisy&clothing=collarAndSweater&eyebrows=defaultNatural&eyes=default' }
]

export default function StudentProfile() {
  const qc = useQueryClient()
  const { user: authUser, updateUser } = useAuth()
  const [activeTab, setActiveTab] = useState('Personal')
  const [skills, setSkills]       = useState([])
  const [skillInput, setSkillInput] = useState('')
  const [resumeFile, setResumeFile] = useState(null)
  const resumeRef = useRef()
  const shouldAutoExtract = useRef(false)
  const [showAvatarModal, setShowAvatarModal] = useState(false)
  const [showAnalysisModal, setShowAnalysisModal] = useState(false)

  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isExtractingResume, setIsExtractingResume] = useState(false)
  const [analysisResult, setAnalysisResult] = useState(null)
  const picRef = useRef()

  const { register, control, handleSubmit, reset, formState: { isSubmitting } } = useForm({
    defaultValues: { projects: [], internships: [], experiences: [], certificates: [] }
  })

  const { fields: projectFields, append: appendProject, remove: removeProject } = useFieldArray({ control, name: "projects" });
  const { fields: internshipFields, append: appendInternship, remove: removeInternship } = useFieldArray({ control, name: "internships" });
  const { fields: experienceFields, append: appendExperience, remove: removeExperience } = useFieldArray({ control, name: "experiences" });
  const { fields: certificateFields, append: appendCertificate, remove: removeCertificate } = useFieldArray({ control, name: "certificates" });

  const [achievements, setAchievements] = useState([])
  const [achievementInput, setAchievementInput] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['student-profile'],
    queryFn: () => API.get('/students/profile').then(r => r.data),
  })

  useEffect(() => {
    if (data?.profile) {
      const p = data.profile
      reset({
        rollNo: p.rollNo || '',
        branch: p.branch || '',
        batchYear: p.batchYear || '',
        phone: p.phone || '',
        CGPA: p.CGPA || '',
        backlogs: p.backlogs || 0,
        tenthPercent: p.tenthPercent || '',
        twelfthPercent: p.twelfthPercent || '',
        projects: p.projects || [],
        internships: p.internships || [],
        experiences: p.experiences || [],
        certificates: p.certificates || []
      })
      setSkills(p.skills || [])
      setAchievements(p.achievements || [])
      if (p.atsAnalysis && p.atsAnalysis.atsScore > 0) {
        setAnalysisResult(p.atsAnalysis)
      }
    }

    if (data?.user) {
      const currentVerified = authUser?.user?.isVerified ?? authUser?.isVerified
      const currentAvatar = authUser?.user?.avatar ?? authUser?.avatar
      const newVerified = data.user.isVerified
      const newAvatar = data.profile?.profilePicUrl || ''
      
      if (currentVerified !== newVerified || currentAvatar !== newAvatar) {
        updateUser({
          user: {
            ...(authUser?.user || authUser),
            isVerified: newVerified,
            avatar: newAvatar
          }
        })
      }
    }
  }, [data, reset, authUser, updateUser])

  const profileMut = useMutation({
    mutationFn: (d) => API.patch('/students/profile', d),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['student-profile'] })
      qc.invalidateQueries({ queryKey: ['student-stats'] })
      toast.success('Profile updated! 🎉')
      if (res.data?.profile?.profilePicUrl) {
        updateUser({ user: { ...(authUser?.user || authUser), avatar: res.data.profile.profilePicUrl } })
      }
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to update profile'),
  })

  const resumeMut = useMutation({
    mutationFn: (fd) => API.post('/students/upload-resume', fd, { headers: { 'Content-Type': 'multipart/form-data' } }),
    onSuccess: async (response) => {
      qc.invalidateQueries({ queryKey: ['student-profile'] })
      toast.success('Resume uploaded!')
      if (shouldAutoExtract.current) {
        shouldAutoExtract.current = false
        await handleExtractFromResume(response.data.resumeUrl)
      }
    },
    onError:   () => toast.error('Failed to upload resume'),
  })

  const picMut = useMutation({
    mutationFn: (fd) => API.post('/students/upload-pic', fd, { headers: { 'Content-Type': 'multipart/form-data' } }),
    onSuccess: (res) => { 
      qc.invalidateQueries({ queryKey: ['student-profile'] })
      toast.success('Profile picture updated!') 
      if (res.data?.profilePicUrl) {
        updateUser({ user: { ...(authUser?.user || authUser), avatar: res.data.profilePicUrl } })
      }
    },
    onError:   () => toast.error('Failed to upload picture'),
  })

  const [docName, setDocName] = useState('')
  const docInputRef = useRef()

  const uploadDocMut = useMutation({
    mutationFn: (fd) => API.post('/students/verification/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['student-profile'] })
      toast.success('Document uploaded to locker! 📄')
      setDocName('')
      if (docInputRef.current) docInputRef.current.value = ''
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to upload document'),
  })

  const deleteDocMut = useMutation({
    mutationFn: (docId) => API.delete(`/students/verification/${docId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['student-profile'] })
      toast.success('Document removed from locker')
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to remove document'),
  })

  const submitVerificationMut = useMutation({
    mutationFn: () => API.post('/students/verification/submit'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['student-profile'] })
      toast.success('Profile verification request submitted! ⏳')
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to submit request'),
  })

  const handleDocUpload = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (!docName.trim()) {
      toast.error('Please enter a name for the document first')
      if (docInputRef.current) docInputRef.current.value = ''
      return
    }
    if (f.size > 10 * 1024 * 1024) return toast.error('File must be under 10MB')
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(f.type)) return toast.error('Only PDF and image files (JPG, PNG, WEBP) are allowed')

    const fd = new FormData()
    fd.append('docFile', f)
    fd.append('docName', docName.trim())
    uploadDocMut.mutate(fd)
  }

  const onSubmit = (formData) => {
    profileMut.mutate({ ...formData, skills, achievements })
  }

  const addAchievement = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const val = achievementInput.trim()
      if (val && !achievements.includes(val)) setAchievements([...achievements, val])
      setAchievementInput('')
    }
  }

  const handleAnalyzeResume = async () => {
    if (!profile.resumeUrl) return toast.error('No resume uploaded to analyze')
    setIsAnalyzing(true)
    try {
      const { data } = await API.post('/resume/analyze', { resumeUrl: profile.resumeUrl })
      setAnalysisResult(data.analysis)
      setShowAnalysisModal(true)
      qc.invalidateQueries({ queryKey: ['student-profile'] })
      toast.success('Resume analyzed successfully!')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Analysis failed. Try again later.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleExtractFromResume = async (passedUrl) => {
    const urlToUse = passedUrl || profile.resumeUrl
    if (!urlToUse) return toast.error('Upload a resume first to auto-fill your profile')
    setIsExtractingResume(true)
    try {
      const { data } = await API.post('/resume/extract', { resumeUrl: urlToUse })
      if (data.extracted) {
        const e = data.extracted
        
        // Correctly reset React Hook Form with a clean plain object instead of a callback
        reset({
          rollNo: e.rollNo || '',
          branch: e.branch || 'CSE',
          batchYear: e.batchYear || '',
          phone: e.phone || '',
          CGPA: e.CGPA || '',
          backlogs: e.backlogs || 0,
          tenthPercent: e.tenthPercent || '',
          twelfthPercent: e.twelfthPercent || '',
          projects: e.projects || [],
          internships: e.internships || [],
          experiences: e.experiences || [],
          certificates: e.certificates || []
        })

        if (e.skills?.length) setSkills(e.skills)
        if (e.achievements?.length) setAchievements(e.achievements)
        toast.success('Profile auto-filled from resume! Review and save.')
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not extract info from resume')
    } finally {
      setIsExtractingResume(false)
    }
  }

  const handleGenerateResume = async () => {
    setIsGenerating(true)
    try {
      const response = await API.get('/resume/generate', { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `${user.name.replace(/\s+/g, '_')}_Resume.pdf`)
      document.body.appendChild(link)
      link.click()
      link.parentNode.removeChild(link)
      toast.success('Resume generated and downloaded! 🎉')
    } catch (err) {
      toast.error('Failed to generate resume. Ensure profile is complete.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleResumeDrop = (e) => {
    e.preventDefault()
    const f = e.dataTransfer?.files[0] || e.target.files?.[0]
    if (f) {
      if (f.size > 5 * 1024 * 1024) return toast.error('File must be under 5MB')
      if (f.type !== 'application/pdf') return toast.error('Only PDF files allowed')
      setResumeFile(f)
      const fd = new FormData()
      fd.append('resume', f)
      resumeMut.mutate(fd)
    }
  }

  const handlePicUpload = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > 3 * 1024 * 1024) return toast.error('Image must be under 3MB')
    if (!f.type.startsWith('image/')) return toast.error('Only image files allowed')
    const fd = new FormData()
    fd.append('profilePic', f)
    picMut.mutate(fd)
  }

  const addSkill = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const val = skillInput.trim()
      if (val && !skills.includes(val)) setSkills([...skills, val])
      setSkillInput('')
    }
  }

  if (isLoading) return <AppLayout title="Profile"><PageSpinner /></AppLayout>

  const profile = data?.profile || {}
  const user    = data?.user || {}
  const initials = (user.name || '').split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2)

  // Circular progress math
  const comp = user.profileCompletion || 0
  const radius = 46
  const circ = 2 * Math.PI * radius
  const offset = circ - (comp / 100) * circ

  return (
    <AppLayout title="My Profile" subtitle="Manage your personal and academic details">
      <div className="space-y-6">

        <PageBanner
          title="My Profile"
          subtitle="Keep your profile updated to maximise your eligibility for placement drives and improve your ATS score."
          image="/postjob_banner.png"
          badge="Student Profile"
          badgeColor="bg-violet-50 text-violet-700 border-violet-100"
          compact
        />

        <div className="flex flex-col lg:flex-row gap-6">

        {/* Left Column — ID Card */}
        <div className="lg:w-1/3">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 flex flex-col items-center text-center">
            
            {/* Avatar with progress ring + upload button */}
            <div className="relative mb-5">
              <svg className="w-32 h-32 transform -rotate-90">
                <circle cx="64" cy="64" r={radius} stroke="currentColor" strokeWidth="6" fill="transparent" className="text-slate-100" />
                <motion.circle cx="64" cy="64" r={radius} stroke="currentColor" strokeWidth="6" fill="transparent"
                  strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" className="text-orange-500"
                  initial={{ strokeDashoffset: circ }} animate={{ strokeDashoffset: offset }} transition={{ duration: 1 }} />
              </svg>
              <div className="absolute inset-0 m-auto w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-md">
                {profile.profilePicUrl ? (
                  <img src={profile.profilePicUrl} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-orange-50 flex items-center justify-center">
                    <img src="/icon_student.svg" alt="student" className="w-16 h-16 object-contain" />
                  </div>
                )}
              </div>
              {/* Camera overlay button */}
              <label className="absolute bottom-1 right-1 bg-white border border-slate-200 shadow-md rounded-full p-1.5 cursor-pointer hover:bg-orange-50 transition-colors" title="Change profile picture">
                {picMut.isPending ? <Loader2 className="w-4 h-4 text-orange-500 animate-spin" /> : <Camera className="w-4 h-4 text-orange-500" />}
                <input type="file" accept="image/*" className="hidden" onChange={handlePicUpload} />
              </label>
              {profile.verificationStatus === 'verified' && (
                <div className="absolute bottom-8 right-0 bg-emerald-500 text-white p-1.5 rounded-full border-4 border-white shadow-sm" title="Verified Profile by TPO">
                  <CheckCircle className="w-4 h-4" />
                </div>
              )}
            </div>

            <h2 className="text-xl font-bold text-slate-900 mb-1">{user.name}</h2>
            <p className="text-sm text-slate-500 mb-4">{user.email}</p>

            <div className="flex items-center gap-2 mb-6">
              <span className="bg-orange-50 text-orange-600 text-xs font-bold px-3 py-1 rounded-full">{profile.branch || 'Branch N/A'}</span>
              <span className="bg-slate-100 text-slate-600 text-xs font-bold px-3 py-1 rounded-full">{profile.rollNo || 'Roll N/A'}</span>
            </div>

            <div className="w-full bg-slate-50 rounded-2xl p-4 border border-slate-100">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Profile Status</p>
              <div className="flex justify-between items-center text-sm">
                <span className="font-semibold text-slate-700">Completion</span>
                <span className="font-bold text-orange-500">{comp}%</span>
              </div>
              {profile.verificationStatus === 'unverified' && (
                <p className="text-xs text-slate-500 mt-2 font-medium bg-slate-100 p-2 rounded-lg">Profile Unverified</p>
              )}
              {profile.verificationStatus === 'pending' && (
                <p className="text-xs text-blue-600 mt-2 font-medium bg-blue-50 p-2 rounded-lg">Verification Pending Review</p>
              )}
              {profile.verificationStatus === 'rejected' && (
                <p className="text-xs text-rose-600 mt-2 font-semibold bg-rose-50 p-2 rounded-lg">Verification Rejected</p>
              )}
              {profile.verificationStatus === 'verified' && (
                <p className="text-xs text-emerald-600 mt-2 font-semibold bg-emerald-50 p-2 rounded-lg">Verified Profile</p>
              )}
            </div>

            <button 
              type="button" 
              onClick={() => setShowAvatarModal(true)}
              className="mt-4 w-full flex items-center justify-center gap-1.5 text-xs font-bold text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 px-4 py-2.5 rounded-xl transition-colors border border-orange-100/50 shadow-sm"
            >
              <GraduationCap className="w-3.5 h-3.5" /> Select Avatar Template
            </button>

          </div>
        </div>

        {/* Right Column — Forms */}
        <div className="lg:w-2/3 bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex overflow-x-auto border-b border-slate-100 px-2 hide-scrollbar">
            {TABS.map(tab => (
              <button key={tab} type="button" onClick={() => setActiveTab(tab)}
                className={`px-6 py-4 text-sm font-bold whitespace-nowrap transition-all border-b-2 ${activeTab === tab ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
                {tab}
              </button>
            ))}
          </div>

          <div className="p-6">
            <form id="profile-form" onSubmit={handleSubmit(onSubmit)}>
              
              {/* Personal Tab */}
              {activeTab === 'Personal' && (
                <motion.div initial={{ opacity:0, x:10 }} animate={{ opacity:1, x:0 }} className="space-y-4">
                  
                  {/* AI Quick Import Banner */}
                  <div className="bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-200/40 rounded-2xl p-5 mb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-orange-850 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-orange-500 animate-pulse" />
                        AI Profile Auto-Fill
                      </h4>
                      <p className="text-xs text-orange-950/70 font-medium leading-relaxed">
                        Don't waste time typing! Upload your resume and AI will instantly extract your personal details, education, skills, and projects.
                      </p>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => {
                        shouldAutoExtract.current = true
                        resumeRef.current?.click()
                      }}
                      disabled={isExtractingResume || resumeMut.isPending}
                      className="shrink-0 flex items-center justify-center gap-2 py-2.5 px-4 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50"
                    >
                      {isExtractingResume || resumeMut.isPending ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Auto-Filling...</>
                      ) : (
                        <><Upload className="w-4 h-4" /> Upload & Auto-Fill</>
                      )}
                    </button>
                  </div>

                  <div className="grid md:grid-cols-2 gap-5">
                    <Input label="Roll Number" placeholder="e.g. 21CS01" {...register('rollNo')} />
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-semibold text-slate-800">Branch</label>
                      <select {...register('branch')} className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20">
                        <option value="">Select Branch</option>
                        {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-5">
                    <Input label="Graduation Year" type="number" placeholder="2025" {...register('batchYear')} />
                    <Input label="Phone Number" placeholder="+91..." {...register('phone')} />
                  </div>
                </motion.div>
              )}

              {/* Academic Tab */}
              {activeTab === 'Academic' && (
                <motion.div initial={{ opacity:0, x:10 }} animate={{ opacity:1, x:0 }} className="space-y-4">
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                    <p className="text-sm text-amber-700">Make sure your academic details are accurate. These are used by the smart eligibility filter to match you with jobs.</p>
                  </div>
                  <div className="grid md:grid-cols-2 gap-5">
                    <Input label="Current CGPA" type="number" step="0.1" min="0" max="10" placeholder="8.5" {...register('CGPA')} />
                    <Input label="Active Backlogs" type="number" min="0" placeholder="0" {...register('backlogs')} />
                  </div>
                  <div className="grid md:grid-cols-2 gap-5">
                    <Input label="10th Percentage" type="number" step="0.1" min="0" max="100" placeholder="90" {...register('tenthPercent')} />
                    <Input label="12th / Diploma Percentage" type="number" step="0.1" min="0" max="100" placeholder="85" {...register('twelfthPercent')} />
                  </div>
                </motion.div>
              )}

              {/* Experience & Projects Tab */}
              {activeTab === 'Experience & Projects' && (
                <motion.div initial={{ opacity:0, x:10 }} animate={{ opacity:1, x:0 }} className="space-y-6">
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <label className="text-sm font-semibold text-slate-800">Projects</label>
                      <button type="button" onClick={() => appendProject({ title: '', description: '', link: '' })} className="text-xs bg-orange-100 text-orange-600 px-3 py-1.5 rounded-lg font-bold hover:bg-orange-200">
                        + Add Project
                      </button>
                    </div>
                    {projectFields.map((item, index) => (
                      <div key={item.id} className="bg-slate-50 p-4 rounded-xl mb-3 border border-slate-200 relative">
                        <button type="button" onClick={() => removeProject(index)} className="absolute top-4 right-4 text-slate-400 hover:text-red-500"><X className="w-4 h-4" /></button>
                        <div className="grid md:grid-cols-2 gap-4 mb-4">
                          <Input label="Project Title" placeholder="E.g. E-commerce App" {...register(`projects.${index}.title`)} />
                          <Input label="Link / URL" placeholder="https://github.com/..." {...register(`projects.${index}.link`)} />
                        </div>
                        <Input label="Description" placeholder="What did you build?" {...register(`projects.${index}.description`)} />
                      </div>
                    ))}
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <label className="text-sm font-semibold text-slate-800">Internships</label>
                      <button type="button" onClick={() => appendInternship({ company: '', role: '', duration: '', description: '' })} className="text-xs bg-orange-100 text-orange-600 px-3 py-1.5 rounded-lg font-bold hover:bg-orange-200">
                        + Add Internship
                      </button>
                    </div>
                    {internshipFields.map((item, index) => (
                      <div key={item.id} className="bg-slate-50 p-4 rounded-xl mb-3 border border-slate-200 relative">
                        <button type="button" onClick={() => removeInternship(index)} className="absolute top-4 right-4 text-slate-400 hover:text-red-500"><X className="w-4 h-4" /></button>
                        <div className="grid md:grid-cols-3 gap-4 mb-4">
                          <Input label="Company" placeholder="E.g. Google" {...register(`internships.${index}.company`)} />
                          <Input label="Role" placeholder="SDE Intern" {...register(`internships.${index}.role`)} />
                          <Input label="Duration" placeholder="3 months" {...register(`internships.${index}.duration`)} />
                        </div>
                        <Input label="Description" placeholder="What did you do?" {...register(`internships.${index}.description`)} />
                      </div>
                    ))}
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <label className="text-sm font-semibold text-slate-800">Work Experience</label>
                      <button type="button" onClick={() => appendExperience({ company: '', role: '', duration: '', description: '' })} className="text-xs bg-orange-100 text-orange-600 px-3 py-1.5 rounded-lg font-bold hover:bg-orange-200">
                        + Add Experience
                      </button>
                    </div>
                    {experienceFields.map((item, index) => (
                      <div key={item.id} className="bg-slate-50 p-4 rounded-xl mb-3 border border-slate-200 relative">
                        <button type="button" onClick={() => removeExperience(index)} className="absolute top-4 right-4 text-slate-400 hover:text-red-500"><X className="w-4 h-4" /></button>
                        <div className="grid md:grid-cols-3 gap-4 mb-4">
                          <Input label="Company" placeholder="E.g. Microsoft" {...register(`experiences.${index}.company`)} />
                          <Input label="Role" placeholder="SDE 1" {...register(`experiences.${index}.role`)} />
                          <Input label="Duration" placeholder="1 year" {...register(`experiences.${index}.duration`)} />
                        </div>
                        <Input label="Description" placeholder="Responsibilities..." {...register(`experiences.${index}.description`)} />
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Achievements Tab */}
              {activeTab === 'Achievements' && (
                <motion.div initial={{ opacity:0, x:10 }} animate={{ opacity:1, x:0 }} className="space-y-6">
                  <div>
                    <label className="text-sm font-semibold text-slate-800 mb-2 block">Achievements</label>
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/20 transition-all">
                      <div className="flex flex-wrap gap-2 mb-2">
                        {achievements.map(a => (
                          <span key={a} className="bg-white border border-slate-200 text-slate-700 text-xs font-semibold px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm">
                            {a} <button type="button" onClick={() => setAchievements(achievements.filter(x => x !== a))} className="text-slate-400 hover:text-red-500"><X className="w-3.5 h-3.5"/></button>
                          </span>
                        ))}
                      </div>
                      <input type="text" value={achievementInput} onChange={e => setAchievementInput(e.target.value)} onKeyDown={addAchievement}
                        placeholder="Type an achievement and press Enter (e.g. Won Hackathon 2024)"
                        className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400 min-w-[200px]" />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <label className="text-sm font-semibold text-slate-800">Certificates</label>
                      <button type="button" onClick={() => appendCertificate({ name: '', issuer: '', date: '', link: '' })} className="text-xs bg-orange-100 text-orange-600 px-3 py-1.5 rounded-lg font-bold hover:bg-orange-200">
                        + Add Certificate
                      </button>
                    </div>
                    {certificateFields.map((item, index) => (
                      <div key={item.id} className="bg-slate-50 p-4 rounded-xl mb-3 border border-slate-200 relative">
                        <button type="button" onClick={() => removeCertificate(index)} className="absolute top-4 right-4 text-slate-400 hover:text-red-500"><X className="w-4 h-4" /></button>
                        <div className="grid md:grid-cols-2 gap-4 mb-4">
                          <Input label="Certificate Name" placeholder="AWS Certified..." {...register(`certificates.${index}.name`)} />
                          <Input label="Issuer" placeholder="Amazon" {...register(`certificates.${index}.issuer`)} />
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                          <Input label="Date" placeholder="MM/YYYY" {...register(`certificates.${index}.date`)} />
                          <Input label="Verification Link" placeholder="https://..." {...register(`certificates.${index}.link`)} />
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Resume & Skills Tab */}
              {activeTab === 'Resume & Skills' && (
                <motion.div initial={{ opacity:0, x:10 }} animate={{ opacity:1, x:0 }} className="space-y-6">

                  {/* ── Resume Section (TOP) ── */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Resume</h3>
                      {profile.resumeUrl && (
                        <a
                          href={profile.resumeUrl.startsWith('http') ? profile.resumeUrl : `${import.meta.env.VITE_API_URL?.replace('/api','') || 'http://localhost:5000'}${profile.resumeUrl.startsWith('/') ? '' : '/'}${profile.resumeUrl.replace(/\\/g, '/')}`}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="flex items-center gap-1.5 text-xs font-bold text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg hover:bg-green-100 transition-colors"
                        >
                          <FileText className="w-3.5 h-3.5" /> View Current Resume
                        </a>
                      )}
                    </div>

                    {/* Upload zone */}
                    <div
                      onClick={() => resumeRef.current?.click()}
                      onDragOver={e => e.preventDefault()}
                      onDrop={handleResumeDrop}
                      className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                        resumeMut.isPending ? 'opacity-50' : ''
                      } ${resumeFile || profile.resumeUrl ? 'border-orange-400 bg-orange-50/30' : 'border-slate-200 hover:border-orange-300 hover:bg-orange-50'}`}
                    >
                      <Upload className="w-7 h-7 mx-auto text-slate-400 mb-2" />
                      {resumeMut.isPending ? (
                        <p className="text-sm font-semibold text-orange-600">Uploading...</p>
                      ) : resumeFile ? (
                        <p className="text-sm font-semibold text-orange-600">📄 {resumeFile.name}</p>
                      ) : profile.resumeUrl ? (
                        <div>
                          <p className="text-sm font-bold text-slate-800 flex items-center justify-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            Active: {profile.resumeUrl.split('/').pop().replace(/^\d+-/, '') || 'Resume.pdf'}
                          </p>
                          <p className="text-xs text-slate-400 mt-1">Click or drag a file to replace</p>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm font-semibold text-slate-700">Click to upload resume</p>
                          <p className="text-xs text-slate-400 mt-1">PDF max 5MB</p>
                        </>
                      )}
                    </div>

                    {/* Action buttons — only show if resume exists */}
                    {profile.resumeUrl && (
                      <div className="flex flex-col gap-3">
                        <button
                          type="button"
                          onClick={handleAnalyzeResume}
                          disabled={isAnalyzing}
                          className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold rounded-xl transition-all disabled:opacity-60"
                        >
                          {isAnalyzing
                            ? <><Sparkles className="w-4 h-4 animate-spin" /> Analyzing Resume & Profile compatibility...</>
                            : <><Sparkles className="w-4 h-4" /> Run ATS Resume Analysis</>}
                        </button>
                      </div>
                    )}

                    {/* Don't have a resume fallback */}
                    {!profile.resumeUrl && (
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                        <div>
                          <h4 className="text-sm font-bold text-slate-700">Don't have a resume?</h4>
                          <p className="text-xs text-slate-500 mt-0.5">Auto-generate an ATS-friendly PDF from your profile.</p>
                        </div>
                        <button type="button" onClick={handleGenerateResume} disabled={isGenerating}
                          className="shrink-0 flex items-center gap-2 py-2.5 px-4 bg-slate-700 text-white text-sm font-bold rounded-xl hover:bg-slate-800 transition-all disabled:opacity-60">
                          {isGenerating ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</> : <>Auto-Generate PDF</>}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Persistent ATS Analysis Card */}
                  {analysisResult && profile.resumeUrl && (
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 bg-orange-50 rounded-xl border border-orange-100 text-orange-500">
                            <BarChart3 className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider">ATS Scorecard</h4>
                            <p className="text-[10px] text-slate-400 font-bold">LATEST COMPATIBILITY REPORT</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowAnalysisModal(true)}
                          className="flex items-center gap-1 text-xs font-bold text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-100 px-3 py-1.5 rounded-xl transition-all"
                        >
                          <Sparkles className="w-3.5 h-3.5" /> View Detailed Report
                        </button>
                      </div>

                      <div className="flex flex-col sm:flex-row items-center gap-6">
                        {/* Circular Score */}
                        <div className="relative shrink-0">
                          <svg className="w-20 h-20 transform -rotate-90">
                            <circle cx="40" cy="40" r="32" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-slate-100" />
                            <circle cx="40" cy="40" r="32" stroke="currentColor" strokeWidth="6" fill="transparent"
                              strokeDasharray={2 * Math.PI * 32}
                              strokeDashoffset={2 * Math.PI * 32 * (1 - (analysisResult.atsScore || 0) / 100)}
                              strokeLinecap="round" className={analysisResult.atsScore >= 75 ? 'text-emerald-500' : analysisResult.atsScore >= 50 ? 'text-amber-500' : 'text-rose-500'}
                            />
                          </svg>
                          <div className="absolute inset-0 m-auto flex items-center justify-center flex-col">
                            <span className="text-xl font-bold text-slate-900 leading-none">{analysisResult.atsScore || 0}</span>
                            <span className="text-[9px] font-bold text-slate-400 mt-0.5">/ 100</span>
                          </div>
                        </div>

                        {/* Summary & Levels */}
                        <div className="flex-1 space-y-2">
                          <p className="text-xs text-slate-600 leading-relaxed font-medium">
                            {analysisResult.overallFeedback || analysisResult.summary || "Your resume is analyzed. View details for the full compatibility report and missing keywords list."}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {analysisResult.estimatedLevel && (
                              <span className="bg-slate-50 text-slate-600 text-[10px] font-bold px-2.5 py-1 rounded-lg border border-slate-200 capitalize">
                                Level: {analysisResult.estimatedLevel}
                              </span>
                            )}
                            {analysisResult.topSkillsFound?.length > 0 && (
                              <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2.5 py-1 rounded-lg border border-emerald-100">
                                {analysisResult.topSkillsFound.length} Skills Found
                              </span>
                            )}
                            {analysisResult.missingSkills?.length > 0 && (
                              <span className="bg-rose-50 text-rose-700 text-[10px] font-bold px-2.5 py-1 rounded-lg border border-rose-100">
                                {analysisResult.missingSkills.length} Missing Keywords
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}


                  {/* ── Skills (below resume) ── */}
                  <div>
                    <label className="text-sm font-semibold text-slate-800 mb-2 block">Technical Skills</label>
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/20 transition-all">
                      <div className="flex flex-wrap gap-2 mb-2">
                        {skills.map(s => (
                          <span key={s} className="bg-white border border-slate-200 text-slate-700 text-xs font-semibold px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm">
                            {s} <button type="button" onClick={() => setSkills(skills.filter(x => x !== s))} className="text-slate-400 hover:text-red-500"><X className="w-3.5 h-3.5"/></button>
                          </span>
                        ))}
                      </div>
                      <input type="text" value={skillInput} onChange={e => setSkillInput(e.target.value)} onKeyDown={addSkill}
                        placeholder="Type a skill and press Enter (e.g. React, Python)"
                        className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400 min-w-[200px]" />
                    </div>
                  </div>

                </motion.div>
              )}

              {/* Document Locker Tab */}
              {activeTab === 'Document Locker' && (
                <motion.div initial={{ opacity:0, x:10 }} animate={{ opacity:1, x:0 }} className="space-y-6">
                  
                  {/* Status Banner */}
                  {profile.verificationStatus === 'verified' && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-start gap-4">
                      <div className="p-2 bg-emerald-500 rounded-xl text-white">
                        <CheckCircle className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-base font-black text-emerald-800">Profile Verified ✅</h4>
                        <p className="text-sm text-emerald-700 mt-1 font-medium leading-relaxed">
                          Your academic profile and credentials have been verified by the Placement Office. 
                          A verified badge is now visible on your profile and applications.
                        </p>
                        {profile.verifiedAt && (
                          <p className="text-xs text-emerald-600/70 font-semibold mt-2">
                            Verified on {new Date(profile.verifiedAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {profile.verificationStatus === 'pending' && (
                    <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 flex items-start gap-4">
                      <div className="p-2 bg-blue-500 rounded-xl text-white animate-pulse">
                        <Loader2 className="w-6 h-6 animate-spin" />
                      </div>
                      <div>
                        <h4 className="text-base font-black text-blue-800">Verification Pending Review ⏳</h4>
                        <p className="text-sm text-blue-700 mt-1 font-medium leading-relaxed">
                          Your profile is currently in the verification queue. The Placement Office is reviewing 
                          your uploaded documents. We will notify you once approved.
                        </p>
                      </div>
                    </div>
                  )}

                  {profile.verificationStatus === 'rejected' && (
                    <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 flex items-start gap-4">
                      <div className="p-2 bg-rose-500 rounded-xl text-white">
                        <X className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-base font-black text-rose-800">Verification Rejected ❌</h4>
                        <p className="text-sm text-rose-700 mt-1 font-medium leading-relaxed">
                          Your profile verification was not approved. Please review the feedback, update your 
                          documents or profile details, and resubmit.
                        </p>
                        {profile.verificationFeedback && (
                          <div className="bg-white/60 border border-rose-100 rounded-xl p-3 mt-3 text-sm text-rose-800 font-bold">
                            TPO Feedback: "{profile.verificationFeedback}"
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {(!profile.verificationStatus || profile.verificationStatus === 'unverified') && (
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex items-start gap-4">
                      <div className="p-2 bg-slate-500 rounded-xl text-white">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-base font-black text-slate-800">Unverified Profile ⚠️</h4>
                        <p className="text-sm text-slate-600 mt-1 font-medium leading-relaxed">
                          Upload your B.Tech sem sheets, 10th marksheet, or other academic transcripts below. 
                          Once uploaded, click "Submit for TPO Review" to verify your profile credentials.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Document Uploader Card */}
                  {profile.verificationStatus !== 'verified' && profile.verificationStatus !== 'pending' && (
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm">
                      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Upload Verification Document</h3>
                      <div className="grid sm:grid-cols-3 gap-3 items-end">
                        <div className="sm:col-span-2 space-y-1">
                          <label className="text-xs font-bold text-slate-500">Document Type / Name</label>
                          <input
                            type="text"
                            placeholder="e.g. B.Tech Semester 6 Marksheet"
                            value={docName}
                            onChange={e => setDocName(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-orange-500/10 focus:border-orange-400 outline-none transition-all"
                          />
                        </div>
                        <div>
                          <button
                            type="button"
                            onClick={() => {
                              if (!docName.trim()) {
                                toast.error('Please enter a name for the document first')
                                return
                              }
                              docInputRef.current?.click()
                            }}
                            disabled={uploadDocMut.isPending}
                            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold rounded-xl transition-all disabled:opacity-65 shadow-sm"
                          >
                            {uploadDocMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                            Upload File
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-slate-400">Supported formats: PDF, JPG, PNG, WEBP (Max 10MB)</p>
                      <input ref={docInputRef} type="file" className="hidden" accept=".pdf,image/*" onChange={handleDocUpload} />
                    </div>
                  )}

                  {/* Documents Locker List */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Document Locker</h3>
                    
                    {(!profile.verificationDocuments || profile.verificationDocuments.length === 0) ? (
                      <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                        <FileText className="w-8 h-8 text-slate-350 mx-auto mb-2" />
                        <p className="text-xs text-slate-400 font-semibold">No documents uploaded yet</p>
                      </div>
                    ) : (
                      <div className="overflow-hidden border border-slate-100 rounded-xl">
                        <table className="w-full border-collapse text-left">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                              <th className="px-4 py-3 text-xs font-bold text-slate-500">Name</th>
                              <th className="px-4 py-3 text-xs font-bold text-slate-500">Uploaded At</th>
                              <th className="px-4 py-3 text-xs font-bold text-slate-500 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {profile.verificationDocuments.map(doc => (
                              <tr key={doc._id} className="border-b border-slate-50 hover:bg-slate-50/50 text-sm">
                                <td className="px-4 py-3 font-bold text-slate-800 truncate max-w-[200px]">{doc.name}</td>
                                <td className="px-4 py-3 text-xs font-medium text-slate-400">
                                  {new Date(doc.uploadedAt).toLocaleDateString()}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <a
                                      href={doc.fileUrl.startsWith('http') ? doc.fileUrl : `${import.meta.env.VITE_API_URL?.replace('/api','') || 'http://localhost:5000'}${doc.fileUrl.startsWith('/') ? '' : '/'}${doc.fileUrl.replace(/\\/g, '/')}`}
                                      target="_blank"
                                      rel="noreferrer noopener"
                                      className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-orange-500 hover:text-orange-600 bg-orange-50 hover:bg-orange-100 transition-colors"
                                    >
                                      View
                                    </a>
                                    {profile.verificationStatus !== 'verified' && profile.verificationStatus !== 'pending' && (
                                      <button
                                        type="button"
                                        onClick={() => deleteDocMut.mutate(doc._id)}
                                        disabled={deleteDocMut.isPending}
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 bg-slate-50 hover:bg-rose-50 transition-colors"
                                      >
                                        <X className="w-4 h-4" />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Submission section */}
                  {profile.verificationStatus !== 'verified' && profile.verificationStatus !== 'pending' && (
                    <div className="flex justify-end pt-2">
                      <button
                        type="button"
                        onClick={() => submitVerificationMut.mutate()}
                        disabled={submitVerificationMut.isPending || !profile.verificationDocuments || profile.verificationDocuments.length === 0}
                        className="flex items-center gap-2 py-3 px-6 bg-orange-500 hover:bg-orange-600 disabled:bg-slate-100 disabled:text-slate-400 text-white text-sm font-bold rounded-xl transition-all shadow-sm"
                      >
                        {submitVerificationMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4.5 h-4.5" />}
                        Submit for TPO Review
                      </button>
                    </div>
                  )}

                </motion.div>
              )}

              {/* Form Footer */}
              <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
                {activeTab !== 'Document Locker' ? (
                  <Button form="profile-form" type="submit" loading={profileMut.isPending || isSubmitting}>
                    Save Profile Changes
                  </Button>
                ) : (
                  <div className="text-xs font-semibold text-slate-400">Verification uploads are saved automatically.</div>
                )}
              </div>

              <input ref={resumeRef} type="file" accept=".pdf" className="hidden" onChange={handleResumeDrop} />
            </form>
          </div>
        </div>

        </div>

      </div>

      {/* ATS Analysis Result Modal */}
      {showAnalysisModal && analysisResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setShowAnalysisModal(false)}
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-100"
          >
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-orange-500" />
                ATS Analysis Report
              </h2>
              <button onClick={() => setShowAnalysisModal(false)} className="p-2 bg-white rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
              
              {/* Score Display */}
              <div className="flex items-center gap-6 bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
                <div className="relative shrink-0">
                  <svg className="w-24 h-24 transform -rotate-90">
                    <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-100" />
                    <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent"
                      strokeDasharray={2 * Math.PI * 40} 
                      strokeDashoffset={2 * Math.PI * 40 * (1 - analysisResult.atsScore / 100)} 
                      strokeLinecap="round" className={analysisResult.atsScore >= 75 ? 'text-green-500' : analysisResult.atsScore >= 50 ? 'text-amber-500' : 'text-rose-500'}
                    />
                  </svg>
                  <div className="absolute inset-0 m-auto flex items-center justify-center flex-col">
                    <span className="text-2xl font-bold text-slate-900 leading-none">{analysisResult.atsScore}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">/ 100</span>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-1">ATS Compatibility</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{analysisResult.overallFeedback || analysisResult.summary}</p>
                  {analysisResult.estimatedLevel && (
                    <span className="mt-2 inline-block text-xs font-bold bg-blue-50 text-blue-700 px-3 py-1 rounded-full border border-blue-100 capitalize">
                      Level: {analysisResult.estimatedLevel}
                    </span>
                  )}
                </div>
              </div>

              {/* Section Scores */}
              {analysisResult.sectionScores && (
                <div>
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">Section Breakdown</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(analysisResult.sectionScores).map(([sec, score]) => (
                      <div key={sec} className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5">
                        <span className="text-xs font-bold text-slate-600 capitalize">{sec}</span>
                        <span className={`text-xs font-bold ${score >= 75 ? 'text-green-600' : score >= 50 ? 'text-amber-600' : 'text-rose-600'}`}>{score}/100</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Strengths */}
              {analysisResult.strengths?.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">Strengths</h3>
                  <div className="space-y-2">
                    {analysisResult.strengths.map((s, i) => (
                      <div key={i} className="flex gap-3 items-start bg-green-50 border border-green-100 rounded-xl p-3">
                        <span className="text-green-500 font-bold text-sm">✓</span>
                        <p className="text-sm text-slate-700">{s}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggestions / Improvements */}
              {(analysisResult.suggestions?.length > 0 || analysisResult.weaknesses?.length > 0) && (
                <div>
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">Key Improvements</h3>
                  <div className="space-y-2">
                    {(analysisResult.suggestions || analysisResult.weaknesses || []).map((item, i) => (
                      <div key={i} className="flex gap-3 items-start bg-orange-50/50 border border-orange-100 rounded-xl p-3">
                        <ChevronRight className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                        <p className="text-sm text-slate-700">{typeof item === 'string' ? item : item.action}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Top Skills / Missing Skills */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {analysisResult.topSkillsFound?.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">Skills Detected</h3>
                    <div className="flex flex-wrap gap-2">
                      {analysisResult.topSkillsFound.map((kw, i) => (
                        <span key={i} className="px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-100">{kw}</span>
                      ))}
                    </div>
                  </div>
                )}
                {(analysisResult.missingSkills || analysisResult.missingKeywords)?.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">Missing Keywords</h3>
                    <div className="flex flex-wrap gap-2">
                      {(analysisResult.missingSkills || analysisResult.missingKeywords).map((kw, i) => (
                        <span key={i} className="px-3 py-1.5 bg-rose-50 text-rose-600 text-xs font-bold rounded-lg border border-rose-100">{kw}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

            </div>
          </motion.div>
        </div>
      )}

      {/* Avatar Picker Modal */}
      <AnimatePresence>
        {showAvatarModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setShowAvatarModal(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white rounded-3xl shadow-2xl p-6 w-full max-w-md border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  ✨ Avatar Gallery
                </h3>
                <button onClick={() => setShowAvatarModal(false)} className="p-1.5 bg-slate-50 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-700 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-4 gap-3 overflow-y-auto p-1 flex-1">
                {AVATAR_TEMPLATES.map((av) => (
                  <button
                    key={av.name}
                    type="button"
                    onClick={() => {
                      profileMut.mutate({ 
                        rollNo: profile.rollNo || '',
                        branch: profile.branch || '',
                        batchYear: profile.batchYear || '',
                        phone: profile.phone || '',
                        CGPA: profile.CGPA || 0,
                        backlogs: profile.backlogs || 0,
                        tenthPercent: profile.tenthPercent || 0,
                        twelfthPercent: profile.twelfthPercent || 0,
                        projects: profile.projects || [],
                        internships: profile.internships || [],
                        experiences: profile.experiences || [],
                        certificates: profile.certificates || [],
                        skills, 
                        achievements,
                        profilePicUrl: av.url 
                      })
                      setShowAvatarModal(false)
                    }}
                    className="group border border-slate-100 hover:border-orange-500 rounded-2xl p-1 bg-slate-50 hover:bg-orange-50 transition-all flex flex-col items-center justify-center relative shadow-sm hover:shadow"
                    title={av.name}
                  >
                    <div className="w-16 h-16 rounded-xl overflow-hidden mb-1">
                      <img src={av.url} alt={av.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    </div>
                    <span className="text-[9px] font-bold text-slate-500 group-hover:text-orange-600 truncate max-w-full text-center px-1">
                      {av.name.split(' ')[0]}
                    </span>
                  </button>
                ))}
              </div>

              <div className="pt-4 border-t border-slate-100 mt-5 flex justify-end">
                <button type="button" onClick={() => setShowAvatarModal(false)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-650 rounded-xl text-xs font-bold transition-colors">
                  Close Gallery
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </AppLayout>
  )
}
