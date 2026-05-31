import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Send, ChevronRight, Terminal, Award, Clock, Code, RefreshCw, ArrowLeft, Loader2, Sparkles, CheckCircle2, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import API from '../../api/axios'
import Editor from '@monaco-editor/react'

const LANGUAGES = [
    { value: 'javascript', label: 'JavaScript (Node.js)' },
    { value: 'python', label: 'Python 3' },
    { value: 'java', label: 'Java' },
    { value: 'cpp', label: 'C++' },
    { value: 'c', label: 'C' }
]

const STARTER_CODES = {
    javascript: `// The standard input is available as global 'input'\n// Output the answer using console.log()\n\nfunction solve(input) {\n    // Write your logic\n    return input;\n}\nconsole.log(solve(input));`,
    python: `# Write your Python 3 code here\nimport sys\n\ndef solve():\n    # Read standard input\n    input_data = sys.stdin.read().strip()\n    print(input_data)\n\nif __name__ == '__main__':\n    solve()`,
    java: `// The class name must be 'Main'\nimport java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        String input = sc.hasNext() ? sc.nextLine() : "";\n        System.out.println(input);\n    }\n}`,
    cpp: `#include <iostream>\n#include <string>\nusing namespace std;\n\nint main() {\n    string input;\n    if (getline(cin, input)) {\n        cout << input << endl;\n    }\n    return 0;\n}`,
    c: `#include <stdio.h>\n#include <string.h>\n\nint main() {\n    char input[256];\n    if (fgets(input, sizeof(input), stdin)) {\n        printf("%s", input);\n    }\n    return 0;\n}`
}

export default function AssessmentWorkspace() {
    const { applicationId, roundIdx } = useParams()
    const navigate = useNavigate()

    const [activeQIdx, setActiveQIdx] = useState(0)
    const [selectedLanguage, setSelectedLanguage] = useState('javascript')
    
    // Code dictionary to retain student's answers per question & language
    const [codes, setCodes] = useState({}) 
    
    // Terminal state
    const [customInput, setCustomInput] = useState('')
    const [consoleOutput, setConsoleOutput] = useState('')
    const [consoleError, setConsoleError] = useState('')
    const [isRunning, setIsRunning] = useState(false)
    const [isConsoleOpen, setIsConsoleOpen] = useState(true)

    // Assessment submit report
    const [submitReport, setSubmitReport] = useState(null)

    // Timer
    const [timeLeft, setTimeLeft] = useState(null)

    // 1. Fetch Application first to get Job ID
    const { data: appData, isLoading: isAppLoading } = useQuery({
        queryKey: ['application-workspace', applicationId],
        queryFn: () => API.get(`/applications/${applicationId}/rounds`).then(r => r.data),
    })

    const jobId = appData?.application?.jobId?._id || appData?.application?.jobId

    // 2. Fetch Coding Assessment linked to the job
    const { data: assessmentData, isLoading: isAssLoading } = useQuery({
        queryKey: ['assessment-workspace', jobId],
        queryFn: () => API.get(`/assessments/job/${jobId}`).then(r => r.data),
        enabled: !!jobId,
    })

    const assessment = assessmentData?.assessment
    const questions = assessment?.questions || []
    const activeQuestion = questions[activeQIdx]

    // Initialize code dictionary on load
    useEffect(() => {
        if (questions.length > 0) {
            const initialCodes = {}
            questions.forEach((q, idx) => {
                initialCodes[q._id] = {}
                LANGUAGES.forEach(lang => {
                    const starter = q.starterCode?.find(sc => sc.language === lang.value)?.code 
                        || STARTER_CODES[lang.value]
                    initialCodes[q._id][lang.value] = starter
                })
            });
            setCodes(initialCodes)
        }
    }, [assessment])

    // Timer countdown loop
    useEffect(() => {
        if (assessment && timeLeft === null) {
            setTimeLeft(assessment.duration * 60)
        }

        if (timeLeft === null || timeLeft <= 0) return

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer)
                    handleAutoSubmit()
                    return 0
                }
                return prev - 1
            })
        }, 1000)

        return () => clearInterval(timer)
    }, [assessment, timeLeft])

    const formatTime = (secs) => {
        const h = Math.floor(secs / 3600)
        const m = Math.floor((secs % 3600) / 60)
        const s = secs % 60
        return `${h > 0 ? h + ':' : ''}${m < 10 ? '0' + m : m}:${s < 10 ? '0' + s : s}`
    };

    const handleCodeChange = (val) => {
        if (!activeQuestion) return
        setCodes(prev => ({
            ...prev,
            [activeQuestion._id]: {
                ...prev[activeQuestion._id],
                [selectedLanguage]: val
            }
        }))
    }

    const currentCodeValue = activeQuestion && codes[activeQuestion._id]
        ? codes[activeQuestion._id][selectedLanguage]
        : ''

    // 3. Run Code Mutation
    const handleRunCode = async () => {
        if (!activeQuestion) return
        setIsRunning(true)
        setConsoleOutput('')
        setConsoleError('')
        
        try {
            const sampleTestCase = activeQuestion.testCases?.[0] || { input: '', output: '' }
            const response = await API.post('/assessments/run', {
                language: selectedLanguage,
                code: currentCodeValue,
                input: customInput || sampleTestCase.input,
                expectedOutput: sampleTestCase.output
            })

            const result = response.data.result
            if (result.status === 'accepted') {
                setConsoleOutput(`[Success] Test Case Passed!\nOutput:\n${result.stdout}`)
            } else if (result.status === 'wrong_answer') {
                setConsoleOutput(`[Wrong Answer] Your output did not match expected.\nOutput:\n${result.stdout}`)
            } else if (result.status === 'compile_error' || result.status === 'runtime_error') {
                setConsoleError(`[${result.status.toUpperCase()}]\n${result.stderr || result.stdout}`)
            } else {
                setConsoleError(`[${result.status.toUpperCase()}]\n${result.stderr || 'Execution failed.'}`)
            }
        } catch (err) {
            setConsoleError(`Network/Execution Error: ${err.response?.data?.message || err.message}`)
        } finally {
            setIsRunning(false)
        }
    }

    // 4. Auto Submit on Timeout
    const handleAutoSubmit = () => {
        toast.error('Time limit reached! Submitting your assessment automatically.', { duration: 6000 })
        submitMutation.mutate()
    }

    // 5. Submit Assessment Mutation
    const submitMutation = useMutation({
        mutationFn: () => {
            const preparedAnswers = questions.map(q => ({
                questionId: q._id,
                code: codes[q._id]?.[selectedLanguage] || STARTER_CODES[selectedLanguage],
                language: selectedLanguage
            }))

            return API.post(`/assessments/${assessment._id}/submit`, {
                applicationId,
                roundIdx: Number(roundIdx),
                answers: preparedAnswers
            }).then(r => r.data)
        },
        onSuccess: (data) => {
            setSubmitReport(data)
            toast.success('Coding Assessment submitted successfully! 🎉')
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || 'Failed to submit assessment')
        }
    })

    if (isAppLoading || isAssLoading || !assessment) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
                <Loader2 className="w-12 h-12 text-orange-500 animate-spin mb-4" />
                <p className="text-sm font-semibold tracking-wider text-slate-400">LOADING SAFE ATS COMPILER ENVIRONMENT...</p>
            </div>
        )
    }

    return (
        <div className="h-screen bg-slate-950 flex flex-col text-slate-100 overflow-hidden font-sans">
            
            {/* Split Pane Header */}
            <header className="h-14 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 z-10">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => {
                            if (window.confirm('Are you sure you want to exit the workspace? Unsaved changes will be lost.')) {
                                navigate(`/student/applications/${applicationId}/rounds`)
                            }
                        }}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
                        title="Back to applications"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div className="h-4 w-px bg-slate-800" />
                    <span className="text-sm font-black tracking-tight text-white flex items-center gap-1.5">
                        <Code className="w-4.5 h-4.5 text-orange-500" />
                        {assessment.title}
                    </span>
                </div>

                {/* Question index tabs */}
                <div className="hidden md:flex items-center gap-1 bg-slate-950 rounded-xl p-1 border border-slate-800">
                    {questions.map((q, idx) => (
                        <button
                            key={q._id}
                            onClick={() => setActiveQIdx(idx)}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                activeQIdx === idx
                                    ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                                    : 'text-slate-400 hover:text-slate-200'
                            }`}
                        >
                            Challenge #{idx + 1}
                        </button>
                    ))}
                </div>

                {/* Right controls */}
                <div className="flex items-center gap-4">
                    {/* Countdown Timer */}
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-bold text-xs ${
                        timeLeft < 300 
                            ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 animate-pulse' 
                            : 'bg-slate-800 border-slate-700 text-orange-400'
                    }`}>
                        <Clock className="w-4 h-4" />
                        <span>{formatTime(timeLeft)}</span>
                    </div>

                    <select
                        value={selectedLanguage}
                        onChange={(e) => setSelectedLanguage(e.target.value)}
                        className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-200 outline-none focus:border-orange-500 cursor-pointer"
                    >
                        {LANGUAGES.map(l => (
                            <option key={l.value} value={l.value}>{l.label}</option>
                        ))}
                    </select>

                    <button
                        onClick={() => {
                            if (window.confirm('Submit assessment? All challenges will be compiled and evaluated against private test cases.')) {
                                submitMutation.mutate()
                            }
                        }}
                        disabled={submitMutation.isPending}
                        className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-800 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-sm"
                    >
                        {submitMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                        Submit Exam
                    </button>
                </div>
            </header>

            {/* Split pane body */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
                
                {/* Left Pane - Instructions */}
                <div className="w-full md:w-1/2 h-full bg-slate-950 border-r border-slate-800 overflow-y-auto p-6 space-y-6">
                    {activeQuestion ? (
                        <>
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <span className="px-2.5 py-1 text-[10px] font-bold bg-orange-500/10 text-orange-400 rounded-lg border border-orange-500/20 uppercase tracking-widest">
                                        {activeQuestion.difficulty}
                                    </span>
                                    <span className="text-xs font-bold text-slate-500">{activeQuestion.points} points</span>
                                </div>
                                <h2 className="text-2xl font-black text-white">{activeQuestion.title}</h2>
                            </div>

                            <div className="prose prose-invert max-w-none text-sm text-slate-350 leading-relaxed font-medium whitespace-pre-wrap">
                                {activeQuestion.description}
                            </div>

                            {/* Format definitions */}
                            <div className="space-y-4 pt-4 border-t border-slate-900">
                                {activeQuestion.inputFormat && (
                                    <div>
                                        <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider">Input Format</h4>
                                        <p className="text-sm text-slate-300 mt-1">{activeQuestion.inputFormat}</p>
                                    </div>
                                )}
                                {activeQuestion.outputFormat && (
                                    <div>
                                        <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider">Output Format</h4>
                                        <p className="text-sm text-slate-300 mt-1">{activeQuestion.outputFormat}</p>
                                    </div>
                                )}
                                {activeQuestion.constraints && (
                                    <div>
                                        <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider">Constraints</h4>
                                        <code className="text-xs bg-slate-900 border border-slate-800 text-orange-400 px-2 py-1 rounded mt-1 inline-block">
                                            {activeQuestion.constraints}
                                        </code>
                                    </div>
                                )}
                            </div>

                            {/* Public Sample Test Cases */}
                            <div className="space-y-3 pt-4 border-t border-slate-900">
                                <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider">Sample Test Case</h4>
                                {activeQuestion.testCases?.[0] ? (
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5">
                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide leading-none mb-2">Input</p>
                                            <code className="text-xs text-orange-300 block font-mono">{activeQuestion.testCases[0].input || '<No Input>'}</code>
                                        </div>
                                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5">
                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide leading-none mb-2">Expected Output</p>
                                            <code className="text-xs text-emerald-400 block font-mono">{activeQuestion.testCases[0].output}</code>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-xs text-slate-500 italic">No samples available.</p>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-500">
                            <Code className="w-12 h-12 text-slate-800 mb-3 animate-pulse" />
                            <p className="text-sm font-semibold">Select a challenge card to begin</p>
                        </div>
                    )}
                </div>

                {/* Right Pane - IDE workspace */}
                <div className="flex-1 h-full flex flex-col bg-slate-900 overflow-hidden relative">
                    
                    {/* Code Editor Window */}
                    <div className="flex-1 flex flex-col min-h-0 relative">
                        <div className="h-9 bg-slate-900 border-b border-slate-850 flex items-center justify-between px-4 shrink-0">
                            <span className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">Interactive Workspace</span>
                            <button
                                onClick={() => {
                                    if (window.confirm('Reset starter template for this language? All code modifications will be lost.')) {
                                        const starter = activeQuestion?.starterCode?.find(sc => sc.language === selectedLanguage)?.code 
                                            || STARTER_CODES[selectedLanguage]
                                        handleCodeChange(starter)
                                    }
                                }}
                                className="text-[10px] font-bold text-rose-400 hover:text-rose-350 bg-rose-500/5 hover:bg-rose-500/10 px-2 py-1 rounded-lg border border-rose-500/10 transition-colors"
                            >
                                Reset Template
                            </button>
                        </div>

                        {/* Editor Canvas */}
                        <div className="flex-1 relative flex overflow-hidden bg-slate-900">
                            <Editor
                                height="100%"
                                width="100%"
                                language={selectedLanguage}
                                value={currentCodeValue}
                                onChange={(val) => handleCodeChange(val || '')}
                                theme="vs-dark"
                                options={{
                                    minimap: { enabled: false },
                                    fontSize: 14,
                                    fontFamily: 'Fira Code, Source Code Pro, Menlo, Monaco, Consolas, monospace',
                                    lineNumbers: 'on',
                                    roundedSelection: true,
                                    scrollBeyondLastLine: false,
                                    readOnly: false,
                                    automaticLayout: true,
                                    cursorBlinking: 'smooth',
                                    padding: { top: 12 }
                                }}
                                loading={
                                    <div className="flex items-center justify-center w-full h-full bg-slate-900 text-slate-400 font-mono text-xs">
                                        Initializing Code Canvas...
                                    </div>
                                }
                            />
                        </div>
                    </div>

                    {/* Output Drawer Console */}
                    <div className="h-64 border-t border-slate-800 bg-slate-950 flex flex-col z-10 shrink-0">
                        <div className="h-10 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-5">
                            <span className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                <Terminal className="w-4 h-4 text-orange-500" />
                                Execution Console
                            </span>
                            
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleRunCode}
                                    disabled={isRunning}
                                    className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold px-3 py-1.5 rounded-xl border border-slate-750 transition-colors shadow-sm"
                                >
                                    {isRunning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                                    Run Code
                                </button>
                            </div>
                        </div>

                        {/* Drawer Inner Workspace */}
                        <div className="flex-1 grid grid-cols-2 min-h-0 overflow-hidden divide-x divide-slate-900">
                            {/* Custom Inputs */}
                            <div className="flex flex-col h-full p-4 space-y-2">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Custom Test Case Input</span>
                                <textarea
                                    value={customInput}
                                    onChange={(e) => setCustomInput(e.target.value)}
                                    placeholder="Provide custom input parameter rows..."
                                    className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl p-3 text-xs font-mono text-orange-200 placeholder:text-slate-700 outline-none resize-none focus:border-orange-500"
                                />
                            </div>

                            {/* Execution Terminal display */}
                            <div className="flex flex-col h-full p-4 space-y-2 min-h-0 overflow-y-auto">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Compiler Outputs / Errors</span>
                                <div className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl p-3 font-mono text-xs overflow-y-auto min-h-0">
                                    {consoleError ? (
                                        <pre className="text-rose-400 whitespace-pre-wrap">{consoleError}</pre>
                                    ) : consoleOutput ? (
                                        <pre className="text-emerald-400 whitespace-pre-wrap">{consoleOutput}</pre>
                                    ) : (
                                        <span className="text-slate-600 italic">No output. Click Run Code to test your code.</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Assessment Completion Report Overlay */}
            {submitReport && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className="relative bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-lg w-full text-center shadow-2xl space-y-6"
                    >
                        <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-3xl flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10 animate-bounce">
                            <Award className="w-10 h-10" />
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-2xl font-black text-white">Coding Exam Submitted!</h2>
                            <p className="text-sm text-slate-400 font-semibold leading-relaxed">
                                Your answers have been successfully parsed, executed, and synced back to your candidate records under the recruiting timeline!
                            </p>
                        </div>

                        <div className="bg-slate-950 border border-slate-850 rounded-2xl p-5 grid grid-cols-2 divide-x divide-slate-900 text-left">
                            <div className="pr-4">
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">Your Score</p>
                                <p className="text-3xl font-black text-orange-400 mt-2">{submitReport.totalScore} pts</p>
                            </div>
                            <div className="pl-6">
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">Status</p>
                                <span className={`inline-block mt-2 px-2.5 py-1 text-xs font-bold uppercase rounded-lg border ${
                                    submitReport.totalScore >= Math.round(submitReport.maxTotalScore * 0.5)
                                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                        : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                                }`}>
                                    {submitReport.totalScore >= Math.round(submitReport.maxTotalScore * 0.5) ? 'PASS' : 'FAIL'}
                                </span>
                            </div>
                        </div>

                        <div className="pt-2">
                            <button
                                onClick={() => navigate(`/student/applications/${applicationId}/rounds`)}
                                className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm rounded-xl transition-all shadow-md"
                            >
                                Return to Round Tracker
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    )
}
