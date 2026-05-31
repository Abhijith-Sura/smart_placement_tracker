import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm, useFieldArray } from 'react-hook-form'
import { Plus, X, List, Calendar, Sparkles, FileCode, CheckCircle, Code, Eye, Edit3, Trash2, ArrowLeft, ArrowRight, Loader2, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import API from '../../api/axios'
import AppLayout from '../../components/layout/AppLayout'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import PageBanner from '../../components/ui/PageBanner'
import { useAuth } from '../../hooks/useAuth'

const LANGUAGES = [
    { value: 'javascript', label: 'JavaScript (Node.js)' },
    { value: 'python', label: 'Python 3' },
    { value: 'java', label: 'Java' },
    { value: 'cpp', label: 'C++' },
    { value: 'c', label: 'C' }
]

const DEFAULT_STARTER_CODE = {
    javascript: `// Write your JavaScript code here\n// The standard input is available as global 'input'\n// Output the answer using console.log()\n\nfunction solve(input) {\n    // Write your logic\n    return input;\n}\nconsole.log(solve(input));`,
    python: `# Write your Python 3 code here\nimport sys\n\ndef solve():\n    # Read standard input\n    input_data = sys.stdin.read().strip()\n    print(input_data)\n\nif __name__ == '__main__':\n    solve()`,
    java: `// Write your Java code here\n// The class name must be 'Main'\nimport java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        String input = sc.hasNext() ? sc.nextLine() : "";\n        System.out.println(input);\n    }\n}`,
    cpp: `// Write your C++ code here\n#include <iostream>\n#include <string>\nusing namespace std;\n\nint main() {\n    string input;\n    if (getline(cin, input)) {\n        cout << input << endl;\n    }\n    return 0;\n}`,
    c: `// Write your C code here\n#include <stdio.h>\n#include <string.h>\n\nint main() {\n    char input[256];\n    if (fgets(input, sizeof(input), stdin)) {\n        printf("%s", input);\n    }\n    return 0;\n}`
}

export default function CompanyAssessments() {
    const qc = useQueryClient()
    const { user } = useAuth()
    const isCompany = user?.user?.role === 'company' || user?.role === 'company'
    const portalColor = isCompany ? 'teal' : 'violet'

    const [isBuilderOpen, setIsBuilderOpen] = useState(false)
    const [selectedAssessment, setSelectedAssessment] = useState(null)

    // Submissions review states
    const [isSubmissionsOpen, setIsSubmissionsOpen] = useState(false)
    const [viewingSubmissionsFor, setViewingSubmissionsFor] = useState(null)
    const [submissionsList, setSubmissionsList] = useState([])
    const [loadingSubmissions, setLoadingSubmissions] = useState(false)
    const [selectedSubmissionCode, setSelectedSubmissionCode] = useState(null)

    const handleOpenSubmissions = async (ass) => {
        setViewingSubmissionsFor(ass)
        setIsSubmissionsOpen(true)
        setLoadingSubmissions(true)
        try {
            const res = await API.get(`/assessments/${ass._id}/submissions`)
            setSubmissionsList(res.data?.submissions || [])
        } catch (err) {
            toast.error('Failed to load student submissions')
        } finally {
            setLoadingSubmissions(false)
        }
    }

    // Forms
    const { register, control, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm({
        defaultValues: {
            jobId: '',
            title: '',
            description: '',
            duration: 45,
            questions: [
                {
                    title: '',
                    description: '',
                    inputFormat: '',
                    outputFormat: '',
                    constraints: '',
                    difficulty: 'medium',
                    points: 10,
                    starterCode: [
                        { language: 'javascript', code: DEFAULT_STARTER_CODE.javascript },
                        { language: 'python', code: DEFAULT_STARTER_CODE.python },
                        { language: 'java', code: DEFAULT_STARTER_CODE.java },
                        { language: 'cpp', code: DEFAULT_STARTER_CODE.cpp },
                        { language: 'c', code: DEFAULT_STARTER_CODE.c }
                    ],
                    testCases: [{ input: '', output: '', isPrivate: false }]
                }
            ]
        }
    })

    const { fields: questionFields, append: appendQuestion, remove: removeQuestion } = useFieldArray({
        control,
        name: "questions"
    })

    // Fetch active jobs for drop-down selection
    const { data: jobsData } = useQuery({
        queryKey: ['activeJobs'],
        queryFn: () => API.get(isCompany ? '/company/jobs' : '/jobs').then(r => r.data),
    })

    const activeJobs = jobsData?.jobs || []

    // Fetch configured assessments
    const { data: assessmentsData, isLoading } = useQuery({
        queryKey: ['assessments'],
        queryFn: () => API.get('/assessments').then(r => r.data),
    })

    const assessments = assessmentsData?.assessments || []

    // Mutations
    const configMutation = useMutation({
        mutationFn: (data) => API.post('/assessments', data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['assessments'] })
            toast.success('Coding Assessment configured successfully! 🚀')
            setIsBuilderOpen(false)
            reset()
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || 'Failed to configure assessment')
        }
    })

    const handleCreateNew = () => {
        reset({
            jobId: '',
            title: '',
            description: '',
            duration: 45,
            questions: [
                {
                    title: '',
                    description: '',
                    inputFormat: '',
                    outputFormat: '',
                    constraints: '',
                    difficulty: 'medium',
                    points: 10,
                    starterCode: [
                        { language: 'javascript', code: DEFAULT_STARTER_CODE.javascript },
                        { language: 'python', code: DEFAULT_STARTER_CODE.python },
                        { language: 'java', code: DEFAULT_STARTER_CODE.java },
                        { language: 'cpp', code: DEFAULT_STARTER_CODE.cpp },
                        { language: 'c', code: DEFAULT_STARTER_CODE.c }
                    ],
                    testCases: [{ input: '', output: '', isPrivate: false }]
                }
            ]
        })
        setSelectedAssessment(null)
        setIsBuilderOpen(true)
    }

    const handleEdit = (ass) => {
        reset({
            jobId: ass.jobId?._id || ass.jobId || '',
            title: ass.title,
            description: ass.description,
            duration: ass.duration,
            questions: ass.questions.map(q => ({
                title: q.title,
                description: q.description,
                inputFormat: q.inputFormat || '',
                outputFormat: q.outputFormat || '',
                constraints: q.constraints || '',
                difficulty: q.difficulty || 'medium',
                points: q.points || 10,
                starterCode: q.starterCode || [
                    { language: 'javascript', code: DEFAULT_STARTER_CODE.javascript },
                    { language: 'python', code: DEFAULT_STARTER_CODE.python },
                    { language: 'java', code: DEFAULT_STARTER_CODE.java },
                    { language: 'cpp', code: DEFAULT_STARTER_CODE.cpp },
                    { language: 'c', code: DEFAULT_STARTER_CODE.c }
                ],
                testCases: q.testCases || [{ input: '', output: '', isPrivate: false }]
            }))
        })
        setSelectedAssessment(ass)
        setIsBuilderOpen(true)
    }

    const onSubmit = (formData) => {
        configMutation.mutate(formData)
    }

    return (
        <AppLayout>
            <div className="space-y-6">
                <PageBanner
                    title="Assessments Hub"
                    subtitle="Create, configure and attach interactive online coding tests to job listings to filter technical applicants dynamically."
                    badge="Recruitment Assessments"
                    badgeColor={`bg-${portalColor}-50 text-${portalColor}-700 border-${portalColor}-100`}
                    compact
                    gradient={portalColor}
                    actions={
                        <button
                            onClick={handleCreateNew}
                            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-${isCompany ? 'teal' : 'violet'}-500 hover:bg-${isCompany ? 'teal' : 'violet'}-600 text-white text-sm font-bold shadow-sm transition-colors`}
                        >
                            <Plus className="w-4 h-4" />
                            Create Coding Test
                        </button>
                    }
                />

                {/* Grid list of assessments */}
                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="animate-pulse bg-white rounded-3xl h-48 border border-slate-100 shadow-sm" />
                        <div className="animate-pulse bg-white rounded-3xl h-48 border border-slate-100 shadow-sm" />
                    </div>
                ) : assessments.length === 0 ? (
                    <div className="bg-white rounded-3xl border border-slate-150 p-12 text-center shadow-sm">
                        <div className={`w-16 h-16 rounded-2xl bg-${portalColor}-50 border border-${portalColor}-100 flex items-center justify-center mx-auto mb-4`}>
                            <Code className={`w-8 h-8 text-${portalColor}-500`} />
                        </div>
                        <h3 className="text-lg font-black text-slate-800">No coding tests configured</h3>
                        <p className="text-sm text-slate-500 font-semibold max-w-md mx-auto mt-2 leading-relaxed">
                            Create your first technical online screening test and bind it to a vacancy. Eligible candidates will automatically unlock it at the coding round.
                        </p>
                        <button
                            onClick={handleCreateNew}
                            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-${portalColor}-500 hover:bg-${portalColor}-600 text-white text-sm font-bold shadow-md shadow-${portalColor}-500/20 hover:-translate-y-0.5 transition-all mx-auto mt-5`}
                        >
                            <Plus className="w-4.5 h-4.5" /> Configure Assessment
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {assessments.map(ass => (
                            <motion.div
                                key={ass._id}
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white rounded-3xl border border-slate-100 hover:border-slate-200 shadow-sm hover:shadow-md transition-all p-6 flex flex-col justify-between gap-6"
                            >
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className={`px-2.5 py-1 text-[10px] font-bold tracking-widest uppercase rounded-lg bg-${portalColor}-50 text-${portalColor}-700 border border-${portalColor}-100`}>
                                            {ass.questions.length} Coding Challenges
                                        </span>
                                        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold">
                                            <Calendar className="w-3.5 h-3.5" />
                                            {ass.duration} mins duration
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="text-lg font-black text-slate-800 leading-tight">{ass.title}</h4>
                                        <p className="text-sm text-slate-500 line-clamp-2 mt-1.5 font-medium leading-relaxed">
                                            {ass.description}
                                        </p>
                                    </div>

                                    {ass.jobId && (
                                        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-center justify-between">
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Bound to drive</p>
                                                <p className="text-sm font-black text-slate-700 mt-1">{ass.jobId.role}</p>
                                            </div>
                                            <span className="text-xs font-bold text-slate-500">{ass.jobId.companyName}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                                    <div className="text-xs font-bold text-slate-400">
                                        Max Score: <span className={`text-${portalColor}-600 font-black`}>{ass.questions.reduce((acc, q) => acc + q.points, 0)} pts</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleOpenSubmissions(ass)}
                                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-slate-50 border border-slate-200 text-slate-600 hover:text-${portalColor}-600 hover:bg-${portalColor}-50/40 rounded-lg transition-all`}
                                        >
                                            <List className="w-3.5 h-3.5" />
                                            Submissions
                                        </button>
                                        <button
                                            onClick={() => handleEdit(ass)}
                                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-${portalColor}-600 hover:text-white bg-${portalColor}-50 hover:bg-${isCompany ? 'teal' : 'violet'}-500 border border-${portalColor}-100 rounded-lg transition-all`}
                                        >
                                            <Edit3 className="w-3.5 h-3.5" />
                                            Edit Test
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}

                {/* Recruiter Coding Test Builder Slide-over */}
                <AnimatePresence>
                    {isBuilderOpen && (
                        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                                onClick={() => setIsBuilderOpen(false)}
                            />

                            <motion.div
                                initial={{ x: '100%' }}
                                animate={{ x: 0 }}
                                exit={{ x: '100%' }}
                                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                                className="relative bg-white w-full max-w-3xl h-full shadow-2xl flex flex-col justify-between border-l border-slate-100 z-10"
                            >
                                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                                    <div>
                                        <h3 className="text-lg font-black text-slate-900">
                                            {selectedAssessment ? 'Modify Coding Assessment' : 'Create Coding Assessment'}
                                        </h3>
                                        <p className="text-xs text-slate-500 font-medium mt-0.5">Configure challenges, starter codes and secure test cases.</p>
                                    </div>
                                    <button
                                        onClick={() => setIsBuilderOpen(false)}
                                        className="p-2 bg-white rounded-full hover:bg-slate-200 border border-slate-200 text-slate-400 hover:text-slate-700 transition-all shadow-sm"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-6 space-y-6">
                                    {/* Test Parameters */}
                                    <div className="bg-white border border-slate-150 rounded-2xl p-5 space-y-4 shadow-sm">
                                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Global Settings</h4>
                                        
                                        <div className="grid md:grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-slate-600">Select Campus Drive / Job</label>
                                                <select
                                                    {...register('jobId', { required: 'Please select an active job' })}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 outline-none transition-all"
                                                >
                                                    <option value="">Choose Listing...</option>
                                                    {activeJobs.map(j => (
                                                        <option key={j._id} value={j._id}>{j.role} ({j.companyName})</option>
                                                    ))}
                                                </select>
                                                {errors.jobId && <p className="text-xs text-rose-500 font-semibold">{errors.jobId.message}</p>}
                                            </div>

                                            <Input
                                                label="Test Duration (Minutes)"
                                                type="number"
                                                placeholder="e.g. 45"
                                                {...register('duration', { required: 'Duration is required' })}
                                            />
                                        </div>

                                        <Input
                                            label="Test Title"
                                            placeholder="e.g. Advanced Data Structures Challenge"
                                            {...register('title', { required: 'Title is required' })}
                                        />

                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-600">Assessment Description</label>
                                            <textarea
                                                {...register('description', { required: 'Description is required' })}
                                                rows="3"
                                                placeholder="Provide summary instructions for the candidate..."
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 outline-none transition-all"
                                            />
                                        </div>
                                    </div>

                                    {/* Question Fields Array */}
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Questions list ({questionFields.length})</h4>
                                            <button
                                                type="button"
                                                onClick={() => appendQuestion({
                                                    title: '',
                                                    description: '',
                                                    inputFormat: '',
                                                    outputFormat: '',
                                                    constraints: '',
                                                    difficulty: 'medium',
                                                    points: 10,
                                                    starterCode: [
                                                        { language: 'javascript', code: DEFAULT_STARTER_CODE.javascript },
                                                        { language: 'python', code: DEFAULT_STARTER_CODE.python },
                                                        { language: 'java', code: DEFAULT_STARTER_CODE.java },
                                                        { language: 'cpp', code: DEFAULT_STARTER_CODE.cpp },
                                                        { language: 'c', code: DEFAULT_STARTER_CODE.c }
                                                    ],
                                                    testCases: [{ input: '', output: '', isPrivate: false }]
                                                })}
                                                className={`text-xs font-bold bg-${portalColor}-50 hover:bg-${portalColor}-100 text-${portalColor}-600 px-3 py-1.5 rounded-lg border border-${portalColor}-100 flex items-center gap-1`}
                                            >
                                                + Add Challenge
                                            </button>
                                        </div>

                                        {questionFields.map((item, qIdx) => (
                                            <div key={item.id} className="bg-slate-50 border border-slate-200 rounded-3xl p-5 relative space-y-4 shadow-inner">
                                                <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className={`px-2.5 py-1 text-[10px] font-black tracking-widest bg-slate-200 text-slate-700 rounded-lg`}>
                                                            Problem #{qIdx + 1}
                                                        </span>
                                                        
                                                        {/* AI Generator Input & Button */}
                                                        <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
                                                            <input 
                                                                type="text" 
                                                                placeholder="AI Topic: e.g., Fibonacci" 
                                                                id={`ai-topic-${qIdx}`}
                                                                className="px-2 py-1 text-[10px] bg-transparent text-slate-900 outline-none w-32 font-bold placeholder:text-slate-400"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={async () => {
                                                                    const topicVal = document.getElementById(`ai-topic-${qIdx}`)?.value?.trim();
                                                                    if (!topicVal) {
                                                                        toast.error("Please enter a topic keyword first!");
                                                                        return;
                                                                    }
                                                                    const diff = watch(`questions.${qIdx}.difficulty`) || 'medium';
                                                                    toast.loading("AI is thinking & generating starter templates...", { id: `ai-gen-${qIdx}` });
                                                                    try {
                                                                        const { data } = await API.post('/assessments/generate-question', { topic: topicVal, difficulty: diff });
                                                                        if (data.question) {
                                                                            const q = data.question;
                                                                            setValue(`questions.${qIdx}.title`, q.title);
                                                                            setValue(`questions.${qIdx}.description`, q.description);
                                                                            setValue(`questions.${qIdx}.inputFormat`, q.inputFormat || '');
                                                                            setValue(`questions.${qIdx}.outputFormat`, q.outputFormat || '');
                                                                            setValue(`questions.${qIdx}.constraints`, q.constraints || '');
                                                                            setValue(`questions.${qIdx}.points`, q.points || 10);
                                                                            setValue(`questions.${qIdx}.starterCode`, q.starterCode || []);
                                                                            setValue(`questions.${qIdx}.testCases`, q.testCases || []);
                                                                            toast.success("Challenge auto-generated with templates! 🚀", { id: `ai-gen-${qIdx}` });
                                                                        }
                                                                    } catch (err) {
                                                                        toast.error("Failed to generate. Try again.", { id: `ai-gen-${qIdx}` });
                                                                    }
                                                                }}
                                                                className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-black text-white bg-teal-500 hover:bg-teal-600 rounded-lg shadow-sm border border-teal-600/20 transition-all cursor-pointer"
                                                            >
                                                                <Sparkles className="w-3 h-3 text-white animate-pulse" />
                                                                Auto-Generate
                                                            </button>
                                                        </div>
                                                    </div>
                                                    {questionFields.length > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => removeQuestion(qIdx)}
                                                            className="text-slate-400 hover:text-rose-500 p-1 bg-white hover:bg-rose-50 border border-slate-200 rounded-xl transition-all cursor-pointer"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>

                                                <div className="grid md:grid-cols-3 gap-4">
                                                    <div className="md:col-span-2">
                                                        <Input
                                                            label="Challenge Title"
                                                            placeholder="e.g. Find Longest Non-Repeating Substring"
                                                            {...register(`questions.${qIdx}.title`, { required: 'Challenge Title is required' })}
                                                        />
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div className="space-y-1.5">
                                                            <label className="text-xs font-bold text-slate-600">Difficulty</label>
                                                            <select
                                                                {...register(`questions.${qIdx}.difficulty`)}
                                                                className="w-full bg-white border border-slate-250 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 outline-none transition-all"
                                                            >
                                                                <option value="easy">Easy</option>
                                                                <option value="medium">Medium</option>
                                                                <option value="hard">Hard</option>
                                                            </select>
                                                        </div>
                                                        <Input
                                                            label="Points"
                                                            type="number"
                                                            {...register(`questions.${qIdx}.points`, { required: 'Points is required' })}
                                                        />
                                                    </div>
                                                </div>

                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-bold text-slate-600 font-semibold">Problem Statement</label>
                                                    <textarea
                                                        {...register(`questions.${qIdx}.description`, { required: 'Problem description is required' })}
                                                        rows="4"
                                                        placeholder="Describe the challenge, expected standard algorithms, inputs, outputs, etc..."
                                                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 outline-none transition-all"
                                                    />
                                                </div>

                                                <div className="grid md:grid-cols-3 gap-3">
                                                    <Input label="Input Format (Optional)" placeholder="e.g. First line represents length..." {...register(`questions.${qIdx}.inputFormat`)} />
                                                    <Input label="Output Format (Optional)" placeholder="e.g. Print a single numeric value..." {...register(`questions.${qIdx}.outputFormat`)} />
                                                    <Input label="Constraints (Optional)" placeholder="e.g. 1 <= N <= 10^5" {...register(`questions.${qIdx}.constraints`)} />
                                                </div>

                                                {/* Test Cases Nested Array Builder */}
                                                <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
                                                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                                        <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Test Cases Matrix</h5>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const cur = watch(`questions.${qIdx}.testCases`) || []
                                                                setValue(`questions.${qIdx}.testCases`, [...cur, { input: '', output: '', isPrivate: false }])
                                                            }}
                                                            className={`text-[10px] font-black bg-teal-50 hover:bg-teal-100 text-teal-600 px-2.5 py-1.5 rounded-lg border border-teal-100`}
                                                        >
                                                            + Add Test Case
                                                        </button>
                                                    </div>

                                                    {(watch(`questions.${qIdx}.testCases`) || []).map((tc, tcIdx) => (
                                                        <div key={tcIdx} className="grid sm:grid-cols-4 gap-2 items-center">
                                                            <div className="sm:col-span-1.5">
                                                                <input
                                                                    type="text"
                                                                    placeholder="Input..."
                                                                    {...register(`questions.${qIdx}.testCases.${tcIdx}.input`)}
                                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:border-teal-400 outline-none"
                                                                />
                                                            </div>
                                                            <div className="sm:col-span-1.5">
                                                                <input
                                                                    type="text"
                                                                    placeholder="Expected Output..."
                                                                    {...register(`questions.${qIdx}.testCases.${tcIdx}.output`, { required: 'Output is required' })}
                                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:border-teal-400 outline-none"
                                                                />
                                                            </div>
                                                            <div className="flex items-center gap-2 justify-between">
                                                                <label className="flex items-center gap-1.5 text-xs text-slate-500 font-bold cursor-pointer">
                                                                    <input
                                                                        type="checkbox"
                                                                        {...register(`questions.${qIdx}.testCases.${tcIdx}.isPrivate`)}
                                                                        className="w-3.5 h-3.5 text-teal-500 border-slate-200 rounded focus:ring-0"
                                                                    />
                                                                    Private
                                                                </label>
                                                                {(watch(`questions.${qIdx}.testCases`) || []).length > 1 && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            const cur = watch(`questions.${qIdx}.testCases`)
                                                                            setValue(`questions.${qIdx}.testCases`, cur.filter((_, idx) => idx !== tcIdx))
                                                                        }}
                                                                        className="text-slate-400 hover:text-rose-500"
                                                                    >
                                                                        <X className="w-4.5 h-4.5" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </form>

                                <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3 shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => setIsBuilderOpen(false)}
                                        className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <Button
                                        type="button"
                                        onClick={handleSubmit(onSubmit)}
                                        loading={configMutation.isPending}
                                        className={`bg-${isCompany ? 'teal' : 'violet'}-500 hover:bg-${isCompany ? 'teal' : 'violet'}-600`}
                                    >
                                        Save Challenge Configuration
                                    </Button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* Student Submissions Slide-over/Modal */}
                <AnimatePresence>
                    {isSubmissionsOpen && (
                        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                                onClick={() => { setIsSubmissionsOpen(false); setSelectedSubmissionCode(null); }}
                            />

                            <motion.div
                                initial={{ x: '100%' }}
                                animate={{ x: 0 }}
                                exit={{ x: '100%' }}
                                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                                className="relative bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col justify-between border-l border-slate-100 z-10"
                            >
                                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                                    <div>
                                        <h3 className="text-lg font-black text-slate-900">
                                            Submissions: {viewingSubmissionsFor?.title}
                                        </h3>
                                        <p className="text-xs text-slate-500 font-medium mt-0.5">Review student scores, test case execution, and code submissions.</p>
                                    </div>
                                    <button
                                        onClick={() => { setIsSubmissionsOpen(false); setSelectedSubmissionCode(null); }}
                                        className="p-2 bg-white rounded-full hover:bg-slate-200 border border-slate-200 text-slate-400 hover:text-slate-700 transition-all shadow-sm"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                    {loadingSubmissions ? (
                                        <div className="space-y-4">
                                            <div className="animate-pulse bg-slate-50 h-16 rounded-2xl border border-slate-100" />
                                            <div className="animate-pulse bg-slate-50 h-16 rounded-2xl border border-slate-100" />
                                            <div className="animate-pulse bg-slate-50 h-16 rounded-2xl border border-slate-100" />
                                        </div>
                                    ) : submissionsList.length === 0 ? (
                                        <div className="py-16 text-center">
                                            <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto mb-3">
                                                <Users className="w-6 h-6 text-slate-300" />
                                            </div>
                                            <p className="text-sm text-slate-700 font-bold">No submissions yet</p>
                                            <p className="text-xs text-slate-400 font-medium mt-1">Students will appear here once they complete the assessment.</p>
                                        </div>
                                    ) : !selectedSubmissionCode ? (
                                        <div className="space-y-4">
                                            {submissionsList.map((sub) => {
                                                const totalQuestionsScore = viewingSubmissionsFor?.questions?.reduce((acc, q) => acc + q.points, 0) || 10;
                                                const hasPassed = sub.totalScore >= Math.round(totalQuestionsScore * 0.5);

                                                return (
                                                    <div key={sub._id} className="bg-white border border-slate-150 rounded-2xl p-5 hover:border-slate-200 hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-sm">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-extrabold flex-shrink-0 text-white bg-${portalColor}-500/10 text-${portalColor}-600`}>
                                                                {sub.studentId?.name?.[0]?.toUpperCase() || 'S'}
                                                            </div>
                                                            <div>
                                                                <h4 className="text-sm font-bold text-slate-800">{sub.studentId?.name}</h4>
                                                                <p className="text-xs text-slate-400 font-medium">{sub.studentId?.email}</p>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center justify-between sm:justify-end gap-5">
                                                            <div className="text-right">
                                                                <p className="text-sm font-black text-slate-800">{sub.totalScore} / {totalQuestionsScore} pts</p>
                                                                <span className={`inline-block text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${hasPassed ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'}`}>
                                                                    {hasPassed ? 'Pass' : 'Fail'}
                                                                </span>
                                                            </div>

                                                            <button
                                                                onClick={() => setSelectedSubmissionCode(sub)}
                                                                className={`px-3 py-2 text-xs font-bold bg-${portalColor}-50 hover:bg-${portalColor}-600 text-${portalColor}-600 hover:text-white rounded-xl transition-all border border-${portalColor}-100 cursor-pointer`}
                                                            >
                                                                View Code
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        /* Detailed Code Sub-view */
                                        <div className="space-y-5 animate-fade-in">
                                            <button
                                                onClick={() => setSelectedSubmissionCode(null)}
                                                className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-700 transition-colors bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm cursor-pointer"
                                            >
                                                <ArrowLeft className="w-3.5 h-3.5" /> Back to submissions
                                            </button>

                                            <div className="bg-slate-50 border border-slate-150 rounded-2xl p-5 space-y-4">
                                                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                                                    <div>
                                                        <h4 className="text-sm font-bold text-slate-800">{selectedSubmissionCode.studentId?.name}</h4>
                                                        <p className="text-xs text-slate-400 font-medium">{selectedSubmissionCode.studentId?.email}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-xs text-slate-500 font-semibold">Submitted at</p>
                                                        <p className="text-xs font-bold text-slate-700">{new Date(selectedSubmissionCode.submittedAt).toLocaleString('en-IN')}</p>
                                                    </div>
                                                </div>

                                                <div className="space-y-4">
                                                    {selectedSubmissionCode.answers.map((ans, idx) => (
                                                        <div key={idx} className="space-y-2.5">
                                                            <div className="flex items-center justify-between">
                                                                <h5 className="text-xs font-black text-slate-400 uppercase tracking-widest">Challenge #{idx + 1} ({ans.language})</h5>
                                                                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${ans.status === 'accepted' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                                                                    Passed {ans.passedCount} / {ans.totalCount} cases
                                                                </span>
                                                            </div>
                                                            <div className="rounded-xl overflow-hidden border border-slate-200 bg-[#0f172a] p-4 text-left shadow-inner">
                                                                <pre className="text-[11px] font-mono text-emerald-400 overflow-x-auto leading-relaxed whitespace-pre-wrap">
                                                                    {ans.code || '// No code submitted'}
                                                                </pre>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-end shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => { setIsSubmissionsOpen(false); setSelectedSubmissionCode(null); }}
                                        className="px-5 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors bg-white rounded-xl border border-slate-200 shadow-sm cursor-pointer"
                                    >
                                        Close
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </AppLayout>
    )
}
