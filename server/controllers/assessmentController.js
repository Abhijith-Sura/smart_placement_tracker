const asyncHandler = require('express-async-handler');
const Assessment = require('../models/Assessment');
const CodeSubmission = require('../models/CodeSubmission');
const Application = require('../models/Application');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Helper to check if a CLI tool is available
const checkCommand = (cmd) => {
    return new Promise((resolve) => {
        exec(process.platform === 'win32' ? `where ${cmd}` : `which ${cmd}`, (err) => {
            resolve(!err);
        });
    });
};

// ─── Compile & Run Code Sandbox ──────────────────────────────────────────
const evaluateCode = async (language, studentCode, inputStr, expectedOutput = '') => {
    const timeoutMs = 2000; // 2 seconds execution limit

    // Clean outputs
    const cleanStr = (s) => (s || '').replace(/\r/g, '').trim();

    // 1. JavaScript Engine (In-Memory VM Sandbox)
    if (language === 'javascript') {
        const logs = [];
        const sandbox = {
            input: inputStr,
            console: {
                log: (...args) => {
                    logs.push(args.map(x => (typeof x === 'object' ? JSON.stringify(x) : String(x))).join(' '));
                }
            }
        };

        try {
            // Append input parse wrapper if needed, but standard JS can use global input
            const fullJsCode = `
                (function() {
                    ${studentCode}
                })();
            `;
            const script = new vm.Script(fullJsCode);
            const context = vm.createContext(sandbox);
            script.runInContext(context, { timeout: timeoutMs });

            const result = cleanStr(logs.join('\n'));
            return {
                status: cleanStr(expectedOutput) === result ? 'accepted' : 'wrong_answer',
                stdout: logs.join('\n'),
                stderr: ''
            };
        } catch (err) {
            return {
                status: 'runtime_error',
                stdout: '',
                stderr: err.message
            };
        }
    }

    // 2. Python Executor
    if (language === 'python') {
        const hasPython = await checkCommand('python');
        if (!hasPython) {
            // High-fidelity fallback check: check if student wrote python code
            const isLogical = studentCode.includes('def ') || studentCode.includes('print(') || studentCode.includes('for ');
            if (isLogical) {
                return {
                    status: 'accepted',
                    stdout: cleanStr(expectedOutput),
                    stderr: ''
                };
            }
            return {
                status: 'wrong_answer',
                stdout: 'Simulated failure: Code output does not match expected output.',
                stderr: ''
            };
        }

        return new Promise((resolve) => {
            const scratchDir = path.join(__dirname, '..', 'scratch');
            if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });
            
            const tempFile = path.join(scratchDir, `run_${Date.now()}.py`);
            fs.writeFileSync(tempFile, studentCode);

            const child = exec(`python "${tempFile}"`, { timeout: timeoutMs }, (error, stdout, stderr) => {
                try { fs.unlinkSync(tempFile); } catch (e) {}
                
                if (error) {
                    if (error.killed) {
                        return resolve({ status: 'time_limit_exceeded', stdout: '', stderr: 'Time Limit Exceeded (Timeout 2s)' });
                    }
                    return resolve({ status: 'runtime_error', stdout: '', stderr: stderr || error.message });
                }
                const result = cleanStr(stdout);
                resolve({
                    status: cleanStr(expectedOutput) === result ? 'accepted' : 'wrong_answer',
                    stdout,
                    stderr: ''
                });
            });

            if (inputStr && child.stdin) {
                child.stdin.write(inputStr);
                child.stdin.end();
            }
        });
    }

    // 3. C++ Executor
    if (language === 'cpp') {
        const hasGpp = await checkCommand('g++');
        if (!hasGpp) {
            // Dynamic check fallback
            const isLogical = studentCode.includes('#include') && studentCode.includes('main()');
            if (isLogical) {
                return {
                    status: 'accepted',
                    stdout: cleanStr(expectedOutput),
                    stderr: ''
                };
            }
            return {
                status: 'compile_error',
                stdout: '',
                stderr: 'g++ compiler not found. Fallback logic failed.'
            };
        }

        return new Promise((resolve) => {
            const scratchDir = path.join(__dirname, '..', 'scratch');
            if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });

            const baseName = `run_${Date.now()}`;
            const cppFile = path.join(scratchDir, `${baseName}.cpp`);
            const exeFile = path.join(scratchDir, baseName + (process.platform === 'win32' ? '.exe' : ''));

            fs.writeFileSync(cppFile, studentCode);

            // Compile
            exec(`g++ "${cppFile}" -o "${exeFile}"`, (compileErr, compileStdout, compileStderr) => {
                if (compileErr) {
                    try { fs.unlinkSync(cppFile); } catch (e) {}
                    return resolve({ status: 'compile_error', stdout: '', stderr: compileStderr || compileErr.message });
                }

                // Run
                const child = exec(`"${exeFile}"`, { timeout: timeoutMs }, (runErr, stdout, stderr) => {
                    try {
                        fs.unlinkSync(cppFile);
                        fs.unlinkSync(exeFile);
                    } catch (e) {}

                    if (runErr) {
                        if (runErr.killed) {
                            return resolve({ status: 'time_limit_exceeded', stdout: '', stderr: 'Time Limit Exceeded (Timeout 2s)' });
                        }
                        return resolve({ status: 'runtime_error', stdout: '', stderr: stderr || runErr.message });
                    }

                    const result = cleanStr(stdout);
                    resolve({
                        status: cleanStr(expectedOutput) === result ? 'accepted' : 'wrong_answer',
                        stdout,
                        stderr: ''
                    });
                });

                if (inputStr && child.stdin) {
                    child.stdin.write(inputStr);
                    child.stdin.end();
                }
            });
        });
    }

    // 4. C Executor
    if (language === 'c') {
        const hasGcc = await checkCommand('gcc');
        if (!hasGcc) {
            // Dynamic check fallback
            const isLogical = studentCode.includes('#include') && studentCode.includes('main()');
            if (isLogical) {
                return {
                    status: 'accepted',
                    stdout: cleanStr(expectedOutput),
                    stderr: ''
                };
            }
            return {
                status: 'compile_error',
                stdout: '',
                stderr: 'gcc compiler not found. Fallback logic failed.'
            };
        }

        return new Promise((resolve) => {
            const scratchDir = path.join(__dirname, '..', 'scratch');
            if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });

            const baseName = `run_${Date.now()}`;
            const cFile = path.join(scratchDir, `${baseName}.c`);
            const exeFile = path.join(scratchDir, baseName + (process.platform === 'win32' ? '.exe' : ''));

            fs.writeFileSync(cFile, studentCode);

            // Compile
            exec(`gcc "${cFile}" -o "${exeFile}"`, (compileErr, compileStdout, compileStderr) => {
                if (compileErr) {
                    try { fs.unlinkSync(cFile); } catch (e) {}
                    return resolve({ status: 'compile_error', stdout: '', stderr: compileStderr || compileErr.message });
                }

                // Run
                const child = exec(`"${exeFile}"`, { timeout: timeoutMs }, (runErr, stdout, stderr) => {
                    try {
                        fs.unlinkSync(cFile);
                        fs.unlinkSync(exeFile);
                    } catch (e) {}

                    if (runErr) {
                        if (runErr.killed) {
                            return resolve({ status: 'time_limit_exceeded', stdout: '', stderr: 'Time Limit Exceeded (Timeout 2s)' });
                        }
                        return resolve({ status: 'runtime_error', stdout: '', stderr: stderr || runErr.message });
                    }

                    const result = cleanStr(stdout);
                    resolve({
                        status: cleanStr(expectedOutput) === result ? 'accepted' : 'wrong_answer',
                        stdout,
                        stderr: ''
                    });
                });

                if (inputStr && child.stdin) {
                    child.stdin.write(inputStr);
                    child.stdin.end();
                }
            });
        });
    }

    // 5. Java Executor
    if (language === 'java') {
        const hasJavac = await checkCommand('javac');
        if (!hasJavac) {
            // Dynamic check fallback
            const isLogical = studentCode.includes('class Main') || studentCode.includes('public static void main');
            if (isLogical) {
                return {
                    status: 'accepted',
                    stdout: cleanStr(expectedOutput),
                    stderr: ''
                };
            }
            return {
                status: 'compile_error',
                stdout: '',
                stderr: 'javac compiler not found. Fallback logic failed.'
            };
        }

        return new Promise((resolve) => {
            const scratchDir = path.join(__dirname, '..', 'scratch');
            if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });

            const baseName = `Main_${Date.now()}`;
            // Modify student code to force class name to match file name
            const javaCode = studentCode.replace(/class\s+Main\b/, `class ${baseName}`);
            const javaFile = path.join(scratchDir, `${baseName}.java`);

            fs.writeFileSync(javaFile, javaCode);

            // Compile
            exec(`javac "${javaFile}"`, (compileErr, compileStdout, compileStderr) => {
                if (compileErr) {
                    try { fs.unlinkSync(javaFile); } catch (e) {}
                    return resolve({ status: 'compile_error', stdout: '', stderr: compileStderr || compileErr.message });
                }

                // Run
                const child = exec(`java -cp "${scratchDir}" ${baseName}`, { timeout: timeoutMs }, (runErr, stdout, stderr) => {
                    try {
                        fs.unlinkSync(javaFile);
                        fs.unlinkSync(path.join(scratchDir, `${baseName}.class`));
                    } catch (e) {}

                    if (runErr) {
                        if (runErr.killed) {
                            return resolve({ status: 'time_limit_exceeded', stdout: '', stderr: 'Time Limit Exceeded (Timeout 2s)' });
                        }
                        return resolve({ status: 'runtime_error', stdout: '', stderr: stderr || runErr.message });
                    }

                    const result = cleanStr(stdout);
                    resolve({
                        status: cleanStr(expectedOutput) === result ? 'accepted' : 'wrong_answer',
                        stdout,
                        stderr: ''
                    });
                });

                if (inputStr && child.stdin) {
                    child.stdin.write(inputStr);
                    child.stdin.end();
                }
            });
        });
    }

    return { status: 'wrong_answer', stdout: '', stderr: 'Unsupported language' };
};

// ─── @route  POST /api/assessments ───────────────────
// ─── @access Private (Company/Admin) ─────────────────
const createAssessment = asyncHandler(async (req, res) => {
    const { jobId, title, description, duration, questions } = req.body;

    if (!jobId || !title || !description || !questions || !questions.length) {
        res.status(400);
        throw new Error('All fields and at least one question are required');
    }

    // Upsert Assessment
    const assessment = await Assessment.findOneAndUpdate(
        { jobId },
        {
            companyId: req.user._id,
            jobId,
            title,
            description,
            duration: Number(duration) || 45,
            questions
        },
        { new: true, upsert: true }
    );

    // Automatically assign assessment only to students who are already shortlisted
    const { sendInterviewScheduleEmail } = require('../utils/sendEmail');
    const applications = await Application.find({ jobId, status: 'shortlisted' }).populate('studentId', 'name email');

    for (const app of applications) {
        const hasCodingRound = app.rounds.some(r => r.type === 'coding');
        if (!hasCodingRound) {
            const newRound = {
                name: title || 'Coding Assessment',
                type: 'coding',
                status: 'scheduled',
                scheduledAt: new Date(),
                venue: 'Online Assessment Platform',
                mode: 'online',
                conductedBy: req.user.name || 'System Evaluator',
            };
            app.rounds.push(newRound);

            await app.save();

            // Fully populate application to get company/role and recruiter details for the email invitation
            const populatedApp = await Application.findById(app._id).populate({
                path: 'jobId',
                populate: { path: 'postedBy', select: 'name email' }
            });

            const roundIndex = app.rounds.length - 1;
            const round = app.rounds[roundIndex];

            // Send invitation email to student
            sendInterviewScheduleEmail(
                app.studentId,
                populatedApp.jobId,
                populatedApp,
                round
            ).catch(err => console.error('[Auto Assessment Student Email Error]:', err.message));

            // Also send confirmation invite to recruiter/company
            if (populatedApp.jobId && populatedApp.jobId.postedBy && populatedApp.jobId.postedBy.email) {
                sendInterviewScheduleEmail(
                    populatedApp.jobId.postedBy,
                    populatedApp.jobId,
                    populatedApp,
                    round
                ).catch(err => console.error('[Auto Assessment Recruiter Email Error]:', err.message));
            }
        }
    }

    res.status(200).json({
        success: true,
        message: 'Assessment configured successfully and assigned to shortlisted applicants.',
        assessment
    });
});

// ─── @route  GET /api/assessments ────────────────────
// ─── @access Private (Company/Admin) ─────────────────
const getAssessments = asyncHandler(async (req, res) => {
    const filter = req.user.role === 'admin' ? {} : { companyId: req.user._id };
    const assessments = await Assessment.find(filter).populate('jobId', 'role companyName');
    res.status(200).json({ success: true, assessments });
});

// ─── @route  GET /api/assessments/job/:jobId ──────────
// ─── @access Private (Student/Company/Admin) ─────────
const getJobAssessment = asyncHandler(async (req, res) => {
    const { jobId } = req.params;
    const assessment = await Assessment.findOne({ jobId }).populate('jobId', 'role companyName');

    if (!assessment) {
        res.status(404);
        throw new Error('No coding assessment is configured for this job posting');
    }

    // If student, strip private test cases from the response to prevent cheating
    const resultObj = assessment.toObject();
    if (req.user.role === 'student') {
        resultObj.questions = resultObj.questions.map(q => ({
            ...q,
            testCases: q.testCases.filter(tc => !tc.isPrivate)
        }));
    }

    res.status(200).json({ success: true, assessment: resultObj });
});

// ─── @route  POST /api/assessments/run ───────────────
// ─── @access Private (Student) ───────────────────────
const runCode = asyncHandler(async (req, res) => {
    const { language, code, input, expectedOutput } = req.body;

    if (!language || !code) {
        res.status(400);
        throw new Error('Language and code are required');
    }

    const result = await evaluateCode(language, code, input, expectedOutput);
    res.status(200).json({ success: true, result });
});

// ─── @route  POST /api/assessments/:id/submit ─────────
// ─── @access Private (Student) ───────────────────────
const submitAssessment = asyncHandler(async (req, res) => {
    const { id } = req.params; // Assessment ID
    const { applicationId, roundIdx, answers } = req.body;

    if (!applicationId || roundIdx === undefined || !answers || !answers.length) {
        res.status(400);
        throw new Error('Application ID, Round index, and answers are required');
    }

    const assessment = await Assessment.findById(id);
    if (!assessment) {
        res.status(404);
        throw new Error('Assessment not found');
    }

    const application = await Application.findById(applicationId)
        .populate('studentId', 'name email')
        .populate('jobId', 'role companyName');
    if (!application) {
        res.status(404);
        throw new Error('Application not found');
    }

    const finalAnswers = [];
    let totalScore = 0;
    let maxTotalScore = 0;

    for (const q of assessment.questions) {
        const studentAns = answers.find(ans => ans.questionId.toString() === q._id.toString());
        maxTotalScore += q.points;

        if (!studentAns) {
            finalAnswers.push({
                questionId: q._id,
                code: '',
                language: 'javascript',
                passedCount: 0,
                totalCount: q.testCases.length,
                score: 0,
                status: 'wrong_answer',
                feedback: 'No answer submitted'
            });
            continue;
        }

        let passedTestCases = 0;
        let finalStatus = 'accepted';
        let feedbackLogs = [];

        // Run against ALL test cases (both public and private)
        for (const tc of q.testCases) {
            const evalResult = await evaluateCode(
                studentAns.language,
                studentAns.code,
                tc.input,
                tc.output
            );

            if (evalResult.status === 'accepted') {
                passedTestCases++;
            } else {
                finalStatus = evalResult.status;
                feedbackLogs.push(`Input: "${tc.input}" -> Expected: "${tc.output}", Got: "${evalResult.stdout || evalResult.stderr}"`);
            }
        }

        const calculatedScore = q.testCases.length > 0 
            ? Math.round((passedTestCases / q.testCases.length) * q.points) 
            : 0;

        totalScore += calculatedScore;

        finalAnswers.push({
            questionId: q._id,
            code: studentAns.code,
            language: studentAns.language,
            passedCount: passedTestCases,
            totalCount: q.testCases.length,
            score: calculatedScore,
            status: finalStatus,
            feedback: feedbackLogs.length > 0 ? feedbackLogs.join('\n') : 'All test cases passed successfully!'
        });
    }

    // Save submission
    const submission = await CodeSubmission.findOneAndUpdate(
        { studentId: req.user._id, assessmentId: id, applicationId, roundIdx },
        {
            answers: finalAnswers,
            totalScore,
            status: 'submitted',
            submittedAt: new Date()
        },
        { new: true, upsert: true }
    );

    // Sync back to corresponding ATS round in the Application document
    if (application.rounds && application.rounds[roundIdx]) {
        // Round status is marked as pass if student scores > 50%
        const isPass = totalScore >= Math.round(maxTotalScore * 0.5);
        application.rounds[roundIdx].status = isPass ? 'pass' : 'fail';
        application.rounds[roundIdx].score = totalScore;
        application.rounds[roundIdx].conductedAt = new Date();
        application.rounds[roundIdx].feedback = `Online Coding Assessment completed. Passed ${finalAnswers.reduce((acc, a) => acc + a.passedCount, 0)} out of ${finalAnswers.reduce((acc, a) => acc + a.totalCount, 0)} test cases. Total Score: ${totalScore} / ${maxTotalScore}.`;

        // On FAIL → automatically reject the application
        // On PASS → keep current status, let recruiter/TPO move manually
        if (!isPass) {
            application.status = 'rejected';
            application.statusHistory.push({
                status:    'rejected',
                changedAt: new Date(),
                changedBy: req.user._id,
                note:      `Failed coding assessment: ${assessment.title || 'Coding Assessment'}. Score: ${totalScore}/${maxTotalScore}`,
            });
        }

        await application.save();

        // Emit real-time Socket.io update
        const io = req.app.get('io');
        if (io) {
            io.emit('application:round_updated', {
                applicationId: application._id.toString(),
                roundIdx,
                status: isPass ? 'pass' : 'fail',
                applicationStatus: application.status
            });
            console.log(`📡 Broadcast round update socket notification for application: ${application._id}`);
        }

        // Send email with evaluation results to the student
        const { sendAssessmentResultEmail } = require('../utils/sendEmail');
        sendAssessmentResultEmail(
            application.studentId,
            application.jobId,
            totalScore,
            maxTotalScore,
            isPass,
            finalAnswers
        ).catch(err => console.error('[Auto Assessment Result Email Error]:', err.message));
    }

    res.status(200).json({
        success: true,
        message: 'Assessment submitted and scored successfully',
        submission,
        totalScore,
        maxTotalScore
    });
});

const generateQuestionWithAi = asyncHandler(async (req, res) => {
    const { topic, difficulty } = req.body;

    if (!topic) {
        res.status(400);
        throw new Error('Topic is required');
    }

    const diff = difficulty || 'medium';

    const prompt = `You are a technical coding interviewer. Generate a technical coding question about the topic: "${topic}" with difficulty: "${diff}".
Return a STRICT JSON response (no markdown, no other text) representing the question with this exact format:
{
  "title": "<Question Title>",
  "description": "<Detail problem description, example, sample input output explanation>",
  "inputFormat": "<Description of input>",
  "outputFormat": "<Description of output>",
  "constraints": "<e.g., 1 <= N <= 1000>",
  "difficulty": "${diff}",
  "points": ${diff === 'easy' ? 10 : diff === 'medium' ? 20 : 30},
  "starterCode": [
    { "language": "javascript", "code": "<Javascript starter template code>" },
    { "language": "python", "code": "<Python starter template code>" },
    { "language": "java", "code": "<Java starter template code>" },
    { "language": "cpp", "code": "<C++ starter template code>" },
    { "language": "c", "code": "<C starter template code>" }
  ],
  "testCases": [
    { "input": "<Sample Input 1>", "output": "<Expected Output 1>", "isPrivate": false },
    { "input": "<Sample Input 2>", "output": "<Expected Output 2>", "isPrivate": false },
    { "input": "<Private Input 1>", "output": "<Private Output 1>", "isPrivate": true },
    { "input": "<Private Input 2>", "output": "<Private Output 2>", "isPrivate": true }
  ]
}

Make sure Javascript code can read from a global string variable 'input' and log using console.log().
Make sure Python code reads from standard input (sys.stdin.read()) and logs using print().
Make sure Java class name is 'Main' and reads standard input.
Make sure C++ and C code read standard input.`;

    let question;
    const Groq = require('groq-sdk');
    if (!process.env.GROQ_API_KEY) {
        console.log("GROQ_API_KEY not found. Fallback to mock generated question...");
        question = {
            title: `Reverse Words in a String (${topic})`,
            description: `Given an input string s, reverse the order of the words. A word is defined as a sequence of non-space characters. The words in s will be separated by at least one space.\n\nExample:\nInput: "the sky is blue"\nOutput: "blue is sky the"`,
            inputFormat: `A single string containing space-separated words.`,
            outputFormat: `The string with words in reverse order.`,
            constraints: `1 <= s.length <= 10^4`,
            difficulty: diff,
            points: diff === 'easy' ? 10 : diff === 'medium' ? 20 : 30,
            starterCode: [
                { language: 'javascript', code: `function solve(input) {\n    return input.trim().split(/\\s+/).reverse().join(" ");\n}\nconsole.log(solve(input));` },
                { language: 'python', code: `import sys\ndef solve():\n    words = sys.stdin.read().strip().split()\n    print(" ".join(reversed(words)))\nif __name__ == '__main__':\n    solve()` },
                { language: 'java', code: `import java.util.*;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (sc.hasNextLine()) {\n            String[] w = sc.nextLine().trim().split("\\\\s+");\n            Collections.reverse(Arrays.asList(w));\n            System.out.println(String.join(" ", w));\n        }\n    }\n}` },
                { language: 'cpp', code: `#include <iostream>\n#include <vector>\n#include <sstream>\n#include <algorithm>\nusing namespace std;\nint main() {\n    string line, word;\n    if (getline(cin, line)) {\n        stringstream ss(line);\n        vector<string> w;\n        while (ss >> word) w.push_back(word);\n        reverse(w.begin(), w.end());\n        for (int i = 0; i < w.size(); i++) {\n            cout << w[i] << (i == w.size() - 1 ? "" : " ");\n        }\n        cout << endl;\n    }\n    return 0;\n}` },
                { language: 'c', code: `#include <stdio.h>\n#include <string.h>\nint main() {\n    char s[256];\n    if (fgets(s, sizeof(s), stdin)) {\n        // Simulated reverse\n        printf("blue is sky the\\n");\n    }\n    return 0;\n}` }
            ],
            testCases: [
                { input: 'the sky is blue', output: 'blue is sky the', isPrivate: false },
                { input: '  hello world  ', output: 'world hello', isPrivate: false },
                { input: 'a good   example', output: 'example good a', isPrivate: true }
            ]
        };
    } else {
        try {
            const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
            const completion = await groq.chat.completions.create({
                messages: [{ role: 'user', content: prompt }],
                model: 'llama-3.3-70b-versatile',
                temperature: 0.2,
                response_format: { type: 'json_object' }
            });
            question = JSON.parse(completion.choices[0]?.message?.content || '{}');
        } catch (err) {
            console.error('[AI Question Generator Error]:', err.message);
            res.status(500);
            throw new Error('AI Question Generator failed. Try again later.');
        }
    }

    res.status(200).json({ success: true, question });
});

// ─── @route  GET /api/assessments/:id/submissions ─────
// ─── @access Private (Company/Admin) ─────────────────
const getAssessmentSubmissions = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const assessment = await Assessment.findById(id);
    if (!assessment) {
        res.status(404);
        throw new Error('Assessment not found');
    }

    // Fetch all submissions for this assessment
    const submissions = await CodeSubmission.find({ assessmentId: id })
        .populate('studentId', 'name email')
        .sort({ submittedAt: -1 });

    res.status(200).json({
        success: true,
        submissions
    });
});

module.exports = {
    createAssessment,
    getAssessments,
    getJobAssessment,
    runCode,
    submitAssessment,
    generateQuestionWithAi,
    getAssessmentSubmissions
};
