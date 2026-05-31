import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Briefcase, Plus, Search, Loader2, Trash2, Edit2, 
  MapPin, Check, X, FileText, ToggleLeft, ToggleRight
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import PageBanner from '../../components/ui/PageBanner'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import { PageSpinner } from '../../components/ui/Spinner'
import API from '../../api/axios'
import toast from 'react-hot-toast'

export default function AlumniReferrals() {
  const qc = useQueryClient()
  const [showDrawer, setShowDrawer] = useState(false)
  const [editingListing, setEditingListing] = useState(null)
  const [search, setSearch] = useState('')

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm()

  // Fetch referrals
  const { data: listings, isLoading } = useQuery({
    queryKey: ['alumni-listings'],
    queryFn: () => API.get('/referrals/my-posts').then(r => r.data.listings || []),
  })

  // Create Listing mutation
  const createMut = useMutation({
    mutationFn: (data) => API.post('/referrals', data),
    onSuccess: (res) => {
      toast.success(res.data.message || 'Job referral listed!')
      qc.invalidateQueries(['alumni-listings'])
      setShowDrawer(false)
      reset()
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to post referral')
    }
  })

  // Update Listing mutation
  const updateMut = useMutation({
    mutationFn: ({ id, data }) => API.patch(`/referrals/${id}`, data),
    onSuccess: (res) => {
      toast.success(res.data.message || 'Referral updated!')
      qc.invalidateQueries(['alumni-listings'])
      setShowDrawer(false)
      setEditingListing(null)
      reset()
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to update referral')
    }
  })

  // Delete Listing mutation
  const deleteMut = useMutation({
    mutationFn: (id) => API.delete(`/referrals/${id}`),
    onSuccess: (res) => {
      toast.success(res.data.message || 'Listing deleted')
      qc.invalidateQueries(['alumni-listings'])
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to delete listing')
    }
  })

  const onSubmit = (data) => {
    if (editingListing) {
      updateMut.mutate({ id: editingListing._id, data })
    } else {
      createMut.mutate(data)
    }
  }

  const handleEdit = (listing) => {
    setEditingListing(listing)
    setValue('companyName', listing.companyName)
    setValue('role', listing.role)
    setValue('location', listing.location)
    setValue('package', listing.package)
    setValue('requirements', listing.requirements)
    setValue('jobLink', listing.jobLink)
    setValue('status', listing.status)
    setShowDrawer(true)
  }

  const handleToggleStatus = (listing) => {
    const nextStatus = listing.status === 'open' ? 'closed' : 'open'
    updateMut.mutate({ id: listing._id, data: { status: nextStatus } })
  }

  const handleDelete = (id) => {
    if (confirm('Are you sure you want to delete this listing? All applications for this post will also be deleted.')) {
      deleteMut.mutate(id)
    }
  }

  const handleCloseDrawer = () => {
    setShowDrawer(false)
    setEditingListing(null)
    reset()
  }

  if (isLoading) return <PageSpinner />

  const filteredListings = listings?.filter(l => 
    l.role?.toLowerCase().includes(search.toLowerCase()) || 
    l.companyName?.toLowerCase().includes(search.toLowerCase())
  ) || []

  return (
    <div className="space-y-6">
      
      <PageBanner
        title="Manage Referral Opportunities"
        subtitle="Post new job openings from your employer, keep requirements updated, and check incoming candidate requests."
        badge="Referrals Manager"
        badgeColor="bg-sky-50 text-sky-700 border-sky-100"
        compact
        gradient="teal"
        actions={
          <button
            onClick={() => {
              setEditingListing(null)
              reset()
              setShowDrawer(true)
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-teal-700 text-xs font-bold shadow-sm hover:bg-teal-50 transition-colors"
          >
            <Plus className="w-4 h-4" /> Share New Referral
          </button>
        }
      />

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by company name or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-900 outline-none focus:border-teal-400 focus:bg-white transition-all font-medium"
          />
        </div>
        <div className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-teal-50 border border-teal-100">
          <span className="text-xs font-black text-teal-600">{filteredListings.length}</span>
          <span className="text-[10px] text-teal-500 font-bold uppercase tracking-wider">posts</span>
        </div>
      </div>

      {/* Grid of Listings */}
      {filteredListings.length === 0 ? (
        <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto mb-3">
            <Briefcase className="w-6 h-6 text-slate-300" />
          </div>
          <h4 className="text-sm font-bold text-slate-700 mb-0.5">No referrals found</h4>
          <p className="text-xs text-slate-400 max-w-[260px] mx-auto leading-relaxed mb-4">
            Create your first job listing to start receiving referral applications from students.
          </p>
          <Button onClick={() => setShowDrawer(true)}>Share Referral</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredListings.map((listing) => {
            const isOpen = listing.status === 'open'
            return (
              <motion.div
                key={listing._id}
                layout
                className="bg-white border border-slate-100 shadow-sm rounded-2xl p-5 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden"
              >
                {/* Active Indicator Topline */}
                <div className={`absolute top-0 left-0 right-0 h-1.5 ${isOpen ? 'bg-teal-500' : 'bg-slate-300'}`} />

                <div className="space-y-3 mt-1">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <h4 className="text-sm font-black text-slate-800 leading-tight">{listing.role}</h4>
                      <span className="text-[11px] font-bold text-slate-400 mt-1 block uppercase tracking-wide">
                        {listing.companyName}
                      </span>
                    </div>

                    <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                      isOpen 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                        : 'bg-slate-50 text-slate-500 border-slate-200'
                    }`}>
                      {listing.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                    <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-slate-400" /> {listing.location}</span>
                    {listing.package && <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded">{listing.package}</span>}
                  </div>

                  <p className="text-xs text-slate-500 leading-relaxed font-medium line-clamp-3">
                    {listing.requirements}
                  </p>
                </div>

                <div className="flex items-center justify-between border-t border-slate-150 pt-4 mt-5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    {listing.applicantCount} candidates applied
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(listing)}
                      className={`p-1.5 rounded-lg border transition-all ${
                        isOpen
                          ? 'border-emerald-200 text-emerald-600 bg-emerald-50/50 hover:bg-emerald-50'
                          : 'border-slate-200 text-slate-400 bg-slate-50/50 hover:bg-slate-100'
                      }`}
                      title={isOpen ? 'Close Listing' : 'Open Listing'}
                    >
                      {isOpen ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleEdit(listing)}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-500 bg-white hover:bg-slate-50 transition-colors"
                      title="Edit Referral"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(listing._id)}
                      className="p-1.5 rounded-lg border border-rose-100 text-rose-500 bg-white hover:bg-rose-50 transition-colors animate-pulse"
                      title="Delete Posting"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

              </motion.div>
            )
          })}
        </div>
      )}

      {/* Slide-over Form Drawer */}
      <AnimatePresence>
        {showDrawer && (
          <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-sm">
            
            {/* Backdrop click closer */}
            <div className="absolute inset-0 cursor-default" onClick={handleCloseDrawer} />

            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="w-full max-w-md bg-white h-screen shadow-2xl relative z-10 p-6 overflow-y-auto flex flex-col justify-between"
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-800">
                      {editingListing ? 'Edit Job Referral' : 'Post New Job Referral'}
                    </h3>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">
                      Provide details about the open position at your firm
                    </p>
                  </div>
                  <button onClick={handleCloseDrawer} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} id="referral-form" className="space-y-4">
                  <Input
                    label="Company Name"
                    placeholder="e.g. Google India"
                    required
                    error={errors.companyName?.message}
                    {...register('companyName', { required: 'Company is required' })}
                  />

                  <Input
                    label="Position / Role"
                    placeholder="e.g. Software Engineer"
                    required
                    error={errors.role?.message}
                    {...register('role', { required: 'Job role is required' })}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Location"
                      placeholder="e.g. Bangalore or Remote"
                      required
                      error={errors.location?.message}
                      {...register('location', { required: 'Location is required' })}
                    />
                    <Input
                      label="CTC Package (Optional)"
                      placeholder="e.g. 15 LPA"
                      {...register('package')}
                    />
                  </div>

                  <Input
                    label="Job Post URL (Optional)"
                    placeholder="https://company.com/careers/job-id"
                    {...register('jobLink')}
                  />

                  <div className="flex flex-col">
                    <label className="text-xs font-bold text-slate-500 mb-1.5 pl-1">Requirements &amp; Description</label>
                    <textarea
                      placeholder="Specify technology stack, minimum requirements, experience levels, and any guidelines for applying..."
                      rows={5}
                      required
                      {...register('requirements', { required: 'Job requirements are required' })}
                      className="text-xs border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 text-slate-800 outline-none focus:border-teal-400 focus:bg-white transition-all resize-none leading-relaxed font-medium"
                    />
                    {errors.requirements && <span className="text-[10px] text-rose-500 font-bold mt-1 pl-1">{errors.requirements.message}</span>}
                  </div>
                </form>
              </div>

              <div className="border-t border-slate-150 pt-4 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={handleCloseDrawer}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <Button
                  type="submit"
                  form="referral-form"
                  loading={createMut.isPending || updateMut.isPending}
                >
                  {editingListing ? 'Save Referral' : 'Post Referral'}
                </Button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  )
}
