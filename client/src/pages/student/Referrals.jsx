import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Users, Search, Loader2, MapPin, Send, MessageSquare, 
  FileText, ExternalLink, ChevronRight, CheckCircle, Info, X
} from 'lucide-react'
import PageBanner from '../../components/ui/PageBanner'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import { PageSpinner } from '../../components/ui/Spinner'
import API from '../../api/axios'
import toast from 'react-hot-toast'

export default function StudentReferrals() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [selectedListing, setSelectedListing] = useState(null)
  const [coverNote, setCoverNote] = useState('')

  // Fetch active referral posts
  const { data: listings, isLoading: listingsLoading } = useQuery({
    queryKey: ['referral-listings'],
    queryFn: () => API.get('/referrals').then(r => r.data.listings || []),
  })

  // Fetch student profile (to prefill resumeUrl)
  const { data: studentProfile, isLoading: profileLoading } = useQuery({
    queryKey: ['student-profile'],
    queryFn: () => API.get('/students/profile').then(r => r.data.student || {}),
  })

  // Fetch student's referral applications (to check if already applied)
  const { data: myApplications, isLoading: appsLoading } = useQuery({
    queryKey: ['student-referral-applications'],
    queryFn: () => API.get('/referrals/applications').then(r => r.data.applications || []),
  })

  // Submit Application Mutation
  const applyMut = useMutation({
    mutationFn: ({ listingId, payload }) => API.post(`/referrals/${listingId}/apply`, payload),
    onSuccess: (res) => {
      toast.success(res.data.message || 'Referral request submitted successfully! 🚀')
      qc.invalidateQueries(['student-referral-applications'])
      setSelectedListing(null)
      setCoverNote('')
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to submit referral request')
    }
  })

  const handleApply = (e) => {
    e.preventDefault()
    const resumeUrl = studentProfile?.resumeUrl
    if (!resumeUrl) {
      return toast.error('Please configure your Resume URL on your profile settings first!')
    }
    applyMut.mutate({
      listingId: selectedListing._id,
      payload: { resumeUrl, coverNote: coverNote.trim() }
    })
  }

  if (listingsLoading || profileLoading || appsLoading) return <PageSpinner />

  const filteredListings = listings?.filter(l => 
    l.role?.toLowerCase().includes(search.toLowerCase()) ||
    l.companyName?.toLowerCase().includes(search.toLowerCase())
  ) || []

  const hasApplied = (listingId) => {
    return myApplications?.some(app => app.referralJobId?._id === listingId || app.referralJobId === listingId)
  }

  return (
    <div className="space-y-6">
      
      <PageBanner
        title="Alumni Referral Opportunities"
        subtitle="Connect with college graduates working at top global tech companies, explore open postings, and request direct referrals."
        badge="Alumni Network"
        badgeColor="bg-orange-50 text-orange-700 border-orange-100"
        compact
      />

      {/* Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by company name or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-900 outline-none focus:border-orange-400 focus:bg-white transition-all font-medium"
          />
        </div>
        <div className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-orange-50 border border-orange-100">
          <span className="text-xs font-black text-orange-600">{filteredListings.length}</span>
          <span className="text-[10px] text-orange-500 font-bold uppercase tracking-wider">listings</span>
        </div>
      </div>

      {/* Grid List */}
      {filteredListings.length === 0 ? (
        <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto mb-3">
            <Users className="w-6 h-6 text-slate-300" />
          </div>
          <h4 className="text-sm font-bold text-slate-700 mb-0.5">No referrals active</h4>
          <p className="text-xs text-slate-400 max-w-[260px] mx-auto leading-relaxed">
            Check back later to see new job openings shared by alumni graduates.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredListings.map((listing) => {
            const isSubmitted = hasApplied(listing._id)
            const alum = listing.alumniId || {}

            return (
              <div
                key={listing._id}
                className="bg-white border border-slate-100 shadow-sm rounded-2xl p-5 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden"
              >
                {/* Accent Top Bar */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-400 to-amber-500" />

                <div className="space-y-4 mt-1">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-black text-slate-800 leading-tight">{listing.role}</h4>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mt-1">
                        {listing.companyName}
                      </span>
                    </div>

                    {isSubmitted ? (
                      <span className="bg-emerald-50 text-emerald-700 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border border-emerald-100 flex items-center gap-0.5">
                        <CheckCircle className="w-3 h-3" /> Requested
                      </span>
                    ) : (
                      <span className="bg-orange-50 text-orange-700 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border border-orange-100">
                        Open
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                    <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-slate-400" /> {listing.location}</span>
                    {listing.package && <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded">{listing.package}</span>}
                  </div>

                  <p className="text-xs text-slate-500 leading-relaxed font-medium line-clamp-3">
                    {listing.requirements}
                  </p>

                  {/* Alumni Credentials Card */}
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-white/80 border border-slate-200 flex-shrink-0 flex items-center justify-center font-bold text-xs text-orange-600">
                        {alum.name?.[0]?.toUpperCase() || 'A'}
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block leading-none mb-0.5">Shared By Alumni</span>
                        <span className="text-xs font-bold text-slate-700 block leading-tight">{alum.name}</span>
                        <span className="text-[10px] text-slate-500 font-medium truncate block">
                          Grad: {alum.graduationYear || 'N/A'} • {alum.companyName || 'Corporate Partner'}
                        </span>
                      </div>
                    </div>

                    {alum.linkedinUrl && (
                      <a
                        href={alum.linkedinUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-slate-700 hover:border-slate-300 transition-all flex-shrink-0"
                        title="LinkedIn Profile"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-150 pt-4 mt-5">
                  
                  {listing.jobLink ? (
                    <a
                      href={listing.jobLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
                    >
                      Official Careers Page <ChevronRight className="w-4 h-4 text-slate-400" />
                    </a>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Direct Referral listing</span>
                  )}

                  <button
                    type="button"
                    disabled={isSubmitted}
                    onClick={() => setSelectedListing(listing)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 ${
                      isSubmitted 
                        ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                        : 'bg-orange-500 hover:bg-orange-600 text-white shadow-orange-500/10'
                    }`}
                  >
                    <Send className="w-3.5 h-3.5" /> Request Referral
                  </button>

                </div>

              </div>
            )
          })}
        </div>
      )}

      {/* Application dialog modal */}
      <AnimatePresence>
        {selectedListing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl border border-slate-100 shadow-2xl max-w-md w-full p-6 space-y-5"
            >
              <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Submit Referral Application</h3>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                    Applying for {selectedListing.role} at {selectedListing.companyName}
                  </p>
                </div>
                <button onClick={() => setSelectedListing(null)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Resume confirmation details */}
              <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 flex items-start gap-3">
                <FileText className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Attached Profile Resume</span>
                  {studentProfile?.resumeUrl ? (
                    <a
                      href={studentProfile.resumeUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-bold text-orange-600 hover:text-orange-700 underline inline-flex items-center gap-1 mt-0.5"
                    >
                      Active Resume PDF <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-xs font-bold text-rose-600 block mt-0.5">
                      No resume uploaded! Go to Profile settings to configure your resume URL.
                    </span>
                  )}
                </div>
              </div>

              <form onSubmit={handleApply} className="space-y-4">
                <div className="flex flex-col">
                  <label className="text-[11px] font-bold text-slate-500 mb-1.5 pl-1">Cover Note to Alumni</label>
                  <textarea
                    placeholder="Briefly pitch yourself — mention relevant skills, projects, why you're interested, and make it easy for them to vouch for you!"
                    rows={5}
                    value={coverNote}
                    onChange={(e) => setCoverNote(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 text-slate-800 outline-none focus:border-orange-400 focus:bg-white transition-all resize-none leading-relaxed font-medium"
                  />
                  <span className="text-[9px] text-slate-400 mt-1 pl-1">Max 1000 characters. Keep it concise.</span>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setSelectedListing(null)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <Button
                    type="submit"
                    disabled={!studentProfile?.resumeUrl || applyMut.isPending}
                    loading={applyMut.isPending}
                  >
                    Send Referral Request
                  </Button>
                </div>
              </form>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  )
}
