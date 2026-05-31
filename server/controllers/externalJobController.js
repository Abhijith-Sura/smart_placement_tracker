const asyncHandler = require('express-async-handler');
const ExternalJob  = require('../models/ExternalJob');
const { fetchAndSaveRemotiveJobs, getCompanyLogo } = require('../utils/jobFetcher');

// MOCK DATA for Live Job Feed (Premium Indian Tech Jobs with rich descriptions, qualifications, and eligibility)
const MOCK_JOBS = [
    {
        _id: 'mock_google',
        title: 'Software Engineer - Mobile Applications (Android)',
        companyName: 'Google',
        companyLogo: '/logos/google.svg',
        location: 'Bengaluru, India',
        jobType: 'Full-Time',
        tags: ['Android', 'Kotlin', 'Java', 'Mobile SDKs'],
        source: 'Google Careers',
        applyUrl: 'https://careers.google.com',
        publishedAt: new Date(),
        description: 'Role Overview: Develop next-generation mobile technologies that change how millions of users connect, explore, and interact with information. Qualifications: Strong Kotlin/Java coding skills, experience with Android SDK, and memory management. Eligibility: Bachelor\'s/Master\'s in Computer Science. Open to batches of 2025/2026. Cumulative CGPA >= 8.0.'
    },
    {
        _id: 'mock_microsoft',
        title: 'Software Engineer (Azure Cloud Platform)',
        companyName: 'Microsoft',
        companyLogo: '/logos/microsoft.svg',
        location: 'Hyderabad, India (Hybrid)',
        jobType: 'Full-Time',
        tags: ['C#', 'C++', 'Azure', 'Cloud Infrastructure'],
        source: 'Microsoft Careers',
        applyUrl: 'https://careers.microsoft.com',
        publishedAt: new Date(Date.now() - 3600000),
        description: 'Role Overview: Work on the core Azure cloud compute, storage, or networking fabric. Design scalable distributed services. Qualifications: Solid systems programming in C++, C#, or Rust. Understanding of OS internals and networking. Eligibility: B.Tech/M.Tech/MS in Computer Science. Open to graduating batches of 2025/2026. Consistent CGPA above 8.0.'
    },
    {
        _id: 'mock_amazon',
        title: 'Software Development Engineer I (SDE-1)',
        companyName: 'Amazon',
        companyLogo: '/logos/amazon.svg',
        location: 'Bengaluru, India',
        jobType: 'Full-Time',
        tags: ['Java', 'C++', 'AWS', 'Distributed Systems'],
        source: 'Amazon Jobs',
        applyUrl: 'https://www.amazon.jobs',
        publishedAt: new Date(Date.now() - 3600000 * 3),
        description: 'Role Overview: Build highly scalable transaction processing systems for retail and cloud customers globally. Qualifications: Strong object-oriented design and programming skills. Mastery of DSA and databases. Eligibility: B.Tech or M.Tech degree in CS/ECE/IT. Open to 2024 and 2025 batches. 7.5+ CGPA and strong problem-solving skills.'
    },
    {
        _id: 'mock_flipkart',
        title: 'Software Development Engineer - Commerce Platform',
        companyName: 'Flipkart',
        companyLogo: '/logos/flipkart.svg',
        location: 'Bengaluru, India',
        jobType: 'Full-Time',
        tags: ['Java', 'Node.js', 'NoSQL', 'System Design'],
        source: 'Flipkart Careers',
        applyUrl: 'https://www.flipkartcareers.com',
        publishedAt: new Date(Date.now() - 3600000 * 4),
        description: 'Role Overview: Support e-commerce services handling massive shopping spikes, flash sales, and logistics optimization. Qualifications: High proficiency in Java, Node.js, Spring, and database indexing. Eligibility: Graduates of B.Tech/B.E/MCA programs. Batches: 2024, 2025. Minimum 7.0 CGPA, no active backlogs.'
    },
    {
        _id: 'mock_meta',
        title: 'Frontend Engineer (WhatsApp Web & Desktop)',
        companyName: 'Meta',
        companyLogo: '/logos/meta.svg',
        location: 'Remote (India)',
        jobType: 'Remote',
        tags: ['React', 'TypeScript', 'WebSockets', 'Performance'],
        source: 'Meta Careers',
        applyUrl: 'https://www.metacareers.com',
        publishedAt: new Date(Date.now() - 3600000 * 5),
        description: 'Role Overview: Build rich messaging UI layouts and optimize live socket synchronization for WhatsApp Web users globally. Qualifications: Deep expertise in React, TypeScript, state synchronization, and web workers. Eligibility: Degree in CS/IT or equivalent. Open to batches of 2025, 2026. Excellent coding portfolio.'
    },
    {
        _id: 'mock1',
        title: 'Backend Software Engineer (Python/Django)',
        companyName: 'Swiggy',
        companyLogo: '/logos/swiggy.svg',
        location: 'Bengaluru, India (Hybrid)',
        jobType: 'Full-Time',
        tags: ['Python', 'Django', 'PostgreSQL', 'System Design'],
        source: 'Swiggy Careers',
        applyUrl: 'https://careers.swiggy.com',
        publishedAt: new Date(),
        description: 'Role Overview: Join our backend platform team to construct robust, low-latency APIs and order processing pipelines handling millions of requests daily. Qualifications: Strong experience with Python, Django, PostgreSQL, and writing highly optimized queries. Eligibility: Degree required in B.Tech/B.E or M.Tech in Computer Science/IT. Eligible graduating batch: 2025/2026. Consistent CGPA of 7.5 and above.'
    },
    {
        _id: 'mock2',
        title: 'Frontend Engineer (React / NextJS)',
        companyName: 'Zomato',
        companyLogo: '/logos/zomato.svg',
        location: 'Gurugram, India',
        jobType: 'Full-Time',
        tags: ['React', 'Next.js', 'TailwindCSS', 'TypeScript'],
        source: 'Zomato Careers',
        applyUrl: 'https://www.zomato.com/careers',
        publishedAt: new Date(Date.now() - 3600000 * 2),
        description: 'Role Overview: Design and develop responsive web interfaces for millions of active foodies. Optimize page speed and user retention. Qualifications: Proficient in React, Next.js, TypeScript, and modern CSS layout engines like TailwindCSS. Eligibility: B.Tech / B.E or MCA degree. Open to batches of 2024, 2025, and 2026. Consistent academic record with minimum 7.0 CGPA.'
    },
    {
        _id: 'mock3',
        title: 'Associate Software Engineer (Java / Microservices)',
        companyName: 'Razorpay',
        companyLogo: '/logos/razorpay.svg',
        location: 'Bengaluru, India',
        jobType: 'Full-Time',
        tags: ['Java', 'Spring Boot', 'MySQL', 'Microservices'],
        source: 'Razorpay Careers',
        applyUrl: 'https://razorpay.com/jobs',
        publishedAt: new Date(Date.now() - 3600000 * 6),
        description: 'Role Overview: Collaborate with the payment gateway integration team to build reliable, secure, and transactional microservices. Qualifications: Hands-on knowledge of Java 11/17, Spring Boot, Hibernate, MySQL, and REST principles. Eligibility: Professional degree in B.Tech / M.Tech in CS/ECE/IT. Open to freshers and graduating batch 2025. 7.5+ CGPA and no active backlogs.'
    },
    {
        _id: 'mock4',
        title: 'Software Development Intern (Summer 2026)',
        companyName: 'Zoho',
        companyLogo: '/logos/zoho.svg',
        location: 'Chennai, India',
        jobType: 'Internship',
        tags: ['Java', 'C++', 'Data Structures', 'Algorithms'],
        source: 'Zoho Careers',
        applyUrl: 'https://www.zoho.com/careers',
        publishedAt: new Date(Date.now() - 86400000),
        description: 'Role Overview: Learn from top mentors while developing core product modules for our global SaaS platform. Qualifications: Strong fundamentals in data structures, design patterns, and OOPs using Java, C++, or C#. Eligibility: Open to B.Tech/B.E, MCA, or BCA students graduating in 2026 or 2027. Minimum 6.5 CGPA required. Available for 6 months full-time internship.'
    },
    {
        _id: 'mock5',
        title: 'Graduate Engineer Trainee (GET)',
        companyName: 'TCS',
        companyLogo: '/logos/tcs.svg',
        location: 'Pune, India',
        jobType: 'Full-Time',
        tags: ['Java', 'SQL', 'HTML5', 'CSS3', 'SDLC'],
        source: 'TCS Careers',
        applyUrl: 'https://www.tcs.com/careers',
        publishedAt: new Date(Date.now() - 86400000 * 1.5),
        description: 'Role Overview: Embark on a digital career pathway. Receive structured training and work on large-scale enterprise delivery programs. Qualifications: Foundation skills in programming (Java/Python/C++), HTML5, CSS3, and basic database SQL. Eligibility: Full-time graduates of B.Tech/B.E/MCA/M.Sc from 2024 or 2025 batches. Academic score of 60% or 6.0 CGPA minimum across all semesters.'
    },
    {
        _id: 'mock6',
        title: 'React Native Mobile Developer',
        companyName: 'CRED',
        companyLogo: '/logos/cred.svg',
        location: 'Bengaluru, India',
        jobType: 'Full-Time',
        tags: ['React Native', 'TypeScript', 'iOS', 'Android', 'Redux'],
        source: 'CRED Careers',
        applyUrl: 'https://cred.club/careers',
        publishedAt: new Date(Date.now() - 86400000 * 2),
        description: 'Role Overview: Build premium, butter-smooth payment and lifestyle features on our React Native mobile platforms. Qualifications: Deep expertise in React Native, TypeScript, Redux Toolkit, and native bridging for iOS & Android. Eligibility: Degree in B.Tech/B.E or equivalent. Eligible batches: 2024, 2025. Experience: 0 to 2 years with a strong portfolio of app projects.'
    },
    {
        _id: 'mock7',
        title: 'Full-Stack Developer Intern',
        companyName: 'Freshworks',
        companyLogo: '/logos/freshworks.svg',
        location: 'Chennai, India',
        jobType: 'Internship',
        tags: ['Ruby on Rails', 'React.js', 'AWS', 'JavaScript'],
        source: 'Freshworks Careers',
        applyUrl: 'https://www.freshworks.com/company/careers',
        publishedAt: new Date(Date.now() - 86400000 * 2.5),
        description: 'Role Overview: Develop full-stack user-facing features for our flagship customer support SaaS product. Qualifications: Solid understanding of JavaScript/React for frontend, and Ruby on Rails or Node.js for backend databases. Eligibility: Final year B.Tech, M.Tech, or MCA students graduating in 2026. Available for 6 months. Minimum CGPA of 7.0.'
    },
    {
        _id: 'mock8',
        title: 'Cloud Solutions Engineer (DevOps)',
        companyName: 'Jio Platforms',
        companyLogo: '/logos/jio.svg',
        location: 'Mumbai, India',
        jobType: 'Full-Time',
        tags: ['Docker', 'Kubernetes', 'AWS', 'Linux', 'Bash'],
        source: 'Jio Careers',
        applyUrl: 'https://careers.jio.com',
        publishedAt: new Date(Date.now() - 86400000 * 3),
        description: 'Role Overview: Support scalable cloud operations for 400+ million digital subscribers. Automate build pipelines and monitor health. Qualifications: Experience with cloud infrastructures, Docker containerization, Kubernetes orchestration, and shell scripting. Eligibility: Engineering degree in B.Tech/B.E in CS, IT, ECE. Eligible batch passing years: 2024, 2025. CGPA of 7.0 and above.'
    },
    {
        _id: 'mock9',
        title: 'Data Engineer (Scala & Spark)',
        companyName: 'PhonePe',
        companyLogo: '/logos/phonepe.svg',
        location: 'Bengaluru, India',
        jobType: 'Full-Time',
        tags: ['Python', 'Apache Spark', 'Hadoop', 'SQL', 'Scala'],
        source: 'PhonePe Careers',
        applyUrl: 'https://www.phonepe.com/careers',
        publishedAt: new Date(Date.now() - 86400000 * 3.5),
        description: 'Role Overview: Architect and scale our high-throughput transactional data lake. Deliver robust real-time payment insights. Qualifications: Heavy familiarity with Apache Spark, Scala/Python, Hadoop frameworks, and writing clean ETL scripts. Eligibility: Professional B.Tech / M.Tech in CS/IT or M.Sc Data Science. Batches: 2024, 2025. Minimum 7.5 CGPA required.'
    },
    {
        _id: 'mock10',
        title: 'Site Reliability Engineer (SRE)',
        companyName: 'Atlassian',
        companyLogo: '/logos/atlassian.svg',
        location: 'Bengaluru, India (Remote)',
        jobType: 'Remote',
        tags: ['Golang', 'Kubernetes', 'AWS', 'Terraform', 'SRE'],
        source: 'Atlassian Careers',
        applyUrl: 'https://www.atlassian.com/company/careers',
        publishedAt: new Date(Date.now() - 86400000 * 4),
        description: 'Role Overview: Maintain the reliability and uptime of Jira & Confluence SaaS deployments worldwide. Solve infrastructure-level issues. Qualifications: Competency in Golang or Python, Terraform IaC, AWS/Azure cloud, Kubernetes, and Linux. Eligibility: Engineering graduates of B.Tech/M.Tech. Open to batches of 2024 and 2025. 7.5+ CGPA with strong problem-solving skills.'
    },
    {
        _id: 'mock11',
        title: 'Software Engineer - Web Technologies',
        companyName: 'Uber',
        companyLogo: '/logos/uber.svg',
        location: 'Hyderabad, India',
        jobType: 'Full-Time',
        tags: ['React', 'TypeScript', 'Node.js', 'Golang'],
        source: 'Uber Careers',
        applyUrl: 'https://www.uber.com/careers',
        publishedAt: new Date(Date.now() - 86400000 * 4.5),
        description: 'Role Overview: Optimize web maps and ride-booking desktop applications for millions of daily commuters. Qualifications: Expertise in React, TypeScript, Node.js, and browser-based real-time sockets or maps. Eligibility: B.Tech / B.E in CS/IT. Passing batches: 2024, 2025. Experience: 0-2 years. Excellent DSA foundations.'
    },
    {
        _id: 'mock12',
        title: 'Frontend UI Developer',
        companyName: 'Paytm',
        companyLogo: '/logos/paytm.svg',
        location: 'Noida, India',
        jobType: 'Full-Time',
        tags: ['React', 'JavaScript', 'CSS3', 'Redux', 'Webpack'],
        source: 'Paytm Careers',
        applyUrl: 'https://careers.paytm.com',
        publishedAt: new Date(Date.now() - 86400000 * 5),
        description: 'Role Overview: Build consumer checkout flows for movie bookings, recharges, and bill payments. Qualifications: Outstanding HTML5, CSS3, Vanilla JS, React, Redux, and modern styling libraries. Eligibility: B.Tech, MCA, or BCA graduates. Open to batches: 2024, 2025, 2026. Academic cutoff: 6.5 CGPA and above.'
    },
    {
        _id: 'mock13',
        title: 'Graduate Trainee (Systems)',
        companyName: 'Infosys',
        companyLogo: '/logos/infosys.svg',
        location: 'Mysuru, India',
        jobType: 'Full-Time',
        tags: ['Java', 'Python', 'SQL', 'Core Java', 'DBMS'],
        source: 'Infosys Careers',
        applyUrl: 'https://www.infosys.com/careers',
        publishedAt: new Date(Date.now() - 86400000 * 6),
        description: 'Role Overview: Complete our world-famous corporate developer training at Mysuru campus. Transition to project deployment. Qualifications: Conceptual knowledge of Core Java or Python, SQL databases, and SDLC principles. Eligibility: B.Tech/B.E, MCA, or M.Sc IT graduates from 2024 or 2025 passing batches. Minimal 6.0 CGPA standard.'
    },
    {
        _id: 'mock14',
        title: 'Systems Analyst',
        companyName: 'Wipro',
        companyLogo: '/logos/wipro.svg',
        location: 'Bengaluru, India',
        jobType: 'Full-Time',
        tags: ['C#', '.NET', 'SQL Server', 'Azure', 'ASP.NET'],
        source: 'Wipro Careers',
        applyUrl: 'https://careers.wipro.com',
        publishedAt: new Date(Date.now() - 86400000 * 6.5),
        description: 'Role Overview: Develop and manage enterprise cloud applications for global banking and retail clients. Qualifications: Experience with Microsoft .NET Core, C#, ASP.NET, SQL Server, and Microsoft Azure hosting. Eligibility: B.Tech, M.Tech, or MCA passing candidates. Batches: 2024, 2025. Consistent academic score of 60% or above.'
    },
    {
        _id: 'mock15',
        title: 'Software Developer (Go/Kafka)',
        companyName: 'Ola Cabs',
        companyLogo: '/logos/ola.svg',
        location: 'Bengaluru, India',
        jobType: 'Full-Time',
        tags: ['Golang', 'Microservices', 'Docker', 'Kafka', 'gRPC'],
        source: 'Ola Careers',
        applyUrl: 'https://www.olacabs.com/careers',
        publishedAt: new Date(Date.now() - 86400000 * 7),
        description: 'Role Overview: Build high-concurrency dispatch and pricing engines using Go and event-driven architectures. Qualifications: Hands-on familiarity with Golang, Apache Kafka, Docker, and gRPC communication protocols. Eligibility: B.Tech/M.Tech CS/IT. Open to batches of 2024 and 2025. Experience: 0-2 years. Minimum CGPA of 7.0.'
    },
    {
        _id: 'mock16',
        title: 'Machine Learning Engineer',
        companyName: 'Airtel',
        companyLogo: '/logos/airtel.svg',
        location: 'Gurugram, India',
        jobType: 'Full-Time',
        tags: ['Python', 'PyTorch', 'TensorFlow', 'NLP', 'Computer Vision'],
        source: 'Airtel Careers',
        applyUrl: 'https://www.airtel.in/careers',
        publishedAt: new Date(Date.now() - 86400000 * 7.5),
        description: 'Role Overview: Deploy NLP and deep learning models to power user sentiment engines and customer support chatbots. Qualifications: Solid mathematics/statistics foundation. Experience in Python, PyTorch, TensorFlow, and Pandas. Eligibility: B.Tech, M.Tech, or M.Sc in CS, AI, or Data Science. Batches: 2024, 2025. Minimum 7.5 CGPA required.'
    },
    {
        _id: 'mock17',
        title: 'Full-Stack Developer (MERN)',
        companyName: 'Cognizant',
        companyLogo: '/logos/cognizant.svg',
        location: 'Kolkata, India',
        jobType: 'Full-Time',
        tags: ['React', 'Spring Boot', 'Oracle', 'Node.js', 'Express'],
        source: 'Cognizant Careers',
        applyUrl: 'https://careers.cognizant.com',
        publishedAt: new Date(Date.now() - 86400000 * 8),
        description: 'Role Overview: Develop modern web platforms using React for frontend and Spring Boot/Node.js for backend systems. Qualifications: Competence in React, Express/Spring Boot, Oracle/MongoDB, and modular API structures. Eligibility: B.Tech/B.E or MCA graduates. Batches: 2024, 2025. Academic cutoff: 60% or 6.0 CGPA.'
    },
    {
        _id: 'mock18',
        title: 'Cloud DevOps Specialist',
        companyName: 'Accenture',
        companyLogo: '/logos/accenture.svg',
        location: 'Bengaluru, India',
        jobType: 'Full-Time',
        tags: ['Terraform', 'Ansible', 'Azure', 'Jenkins', 'CI/CD'],
        source: 'Accenture Careers',
        applyUrl: 'https://www.accenture.com/in-en/careers',
        publishedAt: new Date(Date.now() - 86400000 * 9),
        description: 'Role Overview: Partner with software delivery teams to automate build infrastructure and set up secure cloud landing zones. Qualifications: Experience building CI/CD scripts via Jenkins/GitHub Actions, and using Terraform and Azure cloud. Eligibility: B.Tech/M.Tech or MCA degree. Open to batches of 2024 and 2025. Cutoff: 6.0 CGPA.'
    }
];

// Smart parser function to extract descriptions, qualifications, and eligibility from job text
const enrichJobDetails = (job) => {
    const jobObj = job.toObject ? job.toObject() : { ...job };
    const text = jobObj.description || '';
    const title = (jobObj.title || '').toLowerCase();
    const company = (jobObj.companyName || '').toLowerCase();

    let cleanDesc = '';
    let qualifications = [];
    let eligibility = [];

    // Check if text is present and reasonably detailed
    if (text && text.trim().length > 30) {
        // We have a real description text. Let's do some smart parsing of sentences.
        const sentences = text
            .replace(/([.!?])\s*(?=[A-Z])/g, "$1|")
            .split("|")
            .map(s => s.trim())
            .filter(Boolean);

        // Keywords for classification
        const qualKeywords = ['require', 'skill', 'qualification', 'knowledge', 'experience', 'must have', 'proficiency', 'proficient', 'experience in', 'expertise', 'strong understanding', 'competence', 'understanding of'];
        const eligKeywords = ['degree', 'b.tech', 'btech', 'b.e', 'be', 'mca', 'bca', 'cgpa', 'gpa', 'eligible', 'eligibility', 'passing batch', 'graduating', 'freshers', 'years of experience', 'batch of', '2024', '2025', '2026', 'candidacy', 'academic score', 'cutoff', 'grade', 'academic criteria'];

        const descSentences = [];

        sentences.forEach(s => {
            const sl = s.toLowerCase();
            const hasElig = eligKeywords.some(kw => sl.includes(kw));
            const hasQual = qualKeywords.some(kw => sl.includes(kw));

            if (hasElig) {
                // If it mentions degree, batch, experience, cgpa -> eligibility
                if (eligibility.length < 5) eligibility.push(s);
            } else if (hasQual) {
                // If it mentions skills, require, qualification -> qualifications
                if (qualifications.length < 6) qualifications.push(s);
            } else {
                // Otherwise goes to standard description
                descSentences.push(s);
            }
        });

        // Reassemble clean description
        cleanDesc = descSentences.slice(0, 5).join(' ');
        if (cleanDesc.length < 50) {
            cleanDesc = text.replace(/(Role Overview:|Qualifications:|Eligibility:)/g, '').slice(0, 300) + '...';
        }
    }

    // Smart synthesis fallback if details are sparse or empty (e.g. Adzuna matches or standard listings)
    if (qualifications.length === 0) {
        if (title.includes('frontend') || title.includes('react') || title.includes('ui') || title.includes('web')) {
            qualifications = [
                'Strong proficiency in JavaScript, TypeScript, React.js, or HTML5/CSS3.',
                'Familiarity with state management libraries (Redux, Context API) and RESTful API integration.',
                'Solid understanding of responsive layout styling and cross-browser web performance.',
                'Experience working with Git version control systems.'
            ];
        } else if (title.includes('backend') || title.includes('python') || title.includes('django') || title.includes('java') || title.includes('node') || title.includes('spring') || title.includes('systems')) {
            qualifications = [
                'Hands-on foundation with server-side technologies (Node.js, Python/Django, or Java/Spring Boot).',
                'Basic understanding of SQL relational databases (PostgreSQL/MySQL) or MongoDB.',
                'Familiarity with microservices architecture, REST API design, and web communication.',
                'Familiarity with cloud hosting, Docker containerization, or command-line scripting.'
            ];
        } else if (title.includes('intern') || title.includes('trainee') || title.includes('graduate')) {
            qualifications = [
                'Strong understanding of fundamental computer science concepts, data structures, and algorithms.',
                'Conceptual knowledge of any object-oriented programming language (Java, C++, Python, or JS).',
                'Eager willingness to learn new technology stacks and collaborate inside an agile engineering team.',
                'Excellent analytical, communication, and analytical debugging skills.'
            ];
        } else {
            qualifications = [
                'Strong knowledge of software development lifecycles (SDLC) and design patterns.',
                'Hands-on experience coding with at least one high-level language (Java, Python, C++, or Go).',
                'Familiarity with relational database tables, indexing, and SQL queries.',
                'Strong logical thinking and collaborative mindset.'
            ];
        }
    }

    if (eligibility.length === 0) {
        if (title.includes('intern') || title.includes('trainee')) {
            eligibility = [
                'Degree: B.Tech / B.E / M.Tech / MCA in Computer Science, IT, ECE, or related branches.',
                'Eligible Batches: 2025, 2026, or 2027 graduating cohorts.',
                'Academic Score: Minimal 6.5 to 7.0 CGPA (or 65% aggregate) with zero active backlog modules.',
                'Availability: Able to work full-time for a 3 to 6 month internship duration.'
            ];
        } else {
            eligibility = [
                'Degree: B.Tech / B.E / M.Tech / MCA or equivalent professional degree.',
                'Academic Criteria: Consistent score of 60% or 6.0 CGPA and above.',
                'Experience: Freshers or early-career professionals (0-2 years) in software engineering.',
                'Location: Open to relocate or work in hybrid/remote structures as defined by project needs.'
            ];
        }
    }

    if (!cleanDesc || cleanDesc.length < 20) {
        cleanDesc = `Exciting career opportunity at ${jobObj.companyName || 'our partner company'} for a talented ${jobObj.title}. Join a high-performing technical team to design, build, and deploy next-generation software products. You will work in an agile environment, collaborate across cross-functional teams, and solve challenging scalability problems to drive business growth.`;
    }

    const tier1Brands = [
        'google', 'microsoft', 'amazon', 'meta', 'flipkart', 'swiggy', 'zomato', 
        'razorpay', 'cred', 'phonepe', 'atlassian', 'uber', 'paytm', 'zoho', 'freshworks'
    ];
    const tier2Brands = [
        'tcs', 'tata consultancy', 'infosys', 'wipro', 'cognizant', 'accenture', 
        'hcl', 'capgemini', 'tech mahindra', 'jio', 'reliance jio', 'airtel', 'ola'
    ];
    const name = (jobObj.companyName || '').toLowerCase();
    const isPremium = tier1Brands.some(brand => name.includes(brand)) || tier2Brands.some(brand => name.includes(brand));

    return {
        ...jobObj,
        companyLogo: jobObj.companyLogo || getCompanyLogo(jobObj.companyName),
        description: cleanDesc,
        qualifications,
        eligibility,
        isPremium
    };
};

// Startup Logo Backfiller
const backfillMissingLogos = async () => {
    try {
        const ExternalJob = require('../models/ExternalJob');
        
        // Find jobs where companyLogo is missing, empty, or contains clearbit
        const jobs = await ExternalJob.find({
            $or: [
                { companyLogo: { $exists: false } },
                { companyLogo: '' },
                { companyLogo: null },
                { companyLogo: /clearbit\.com/i }
            ]
        });
        
        if (jobs.length > 0) {
            console.log(`[LogoBackfill] Found ${jobs.length} external jobs needing logo updates. Updating...`);
            let updatedCount = 0;
            for (const job of jobs) {
                const logo = getCompanyLogo(job.companyName);
                const targetLogo = logo || ''; // If no local SVG logo, set to empty to trigger fallback initials-avatar
                await ExternalJob.updateOne({ _id: job._id }, { $set: { companyLogo: targetLogo } });
                updatedCount++;
            }
            console.log(`[LogoBackfill] Completed. Successfully backfilled/cleaned logos for ${updatedCount} jobs.`);
        } else {
            console.log('[LogoBackfill] No external jobs with missing or clearbit logos found.');
        }
    } catch (err) {
        console.error('[LogoBackfill] Error in startup backfill:', err.message);
    }
};

// ─── @route  GET /api/external-jobs ──────────────────────
// ─── @access Private (any logged-in user) ─────────────────
const getExternalJobs = asyncHandler(async (req, res) => {
    const { search, type } = req.query;

    // A. DYNAMIC ON-THE-FLY LIVE SEARCH ENHANCEMENT
    if (search && search.trim().length >= 3) {
        try {
            const { searchAndFetchLiveJobs } = require('../utils/jobFetcher');
            await searchAndFetchLiveJobs(search.trim());
        } catch (fetchErr) {
            console.error('[ExternalJobs] Dynamic live search API fetch failed:', fetchErr.message);
        }
    } else {
        // Continuous Fetching Trick: If no specific query is active, check if latest DB sync was > 1.5 hours ago.
        // If so, trigger a non-blocking background fetch so the feed stays updated instantly!
        try {
            const latestJob = await ExternalJob.findOne().sort({ fetchedAt: -1 });
            const oneHourAgo = new Date(Date.now() - 5400000); // 1.5 hours
            if (!latestJob || latestJob.fetchedAt < oneHourAgo) {
                console.log('[ExternalJobs] Job feed is stale (> 1.5h). Triggering background API sync...');
                const { fetchAndSaveRemotiveJobs } = require('../utils/jobFetcher');
                // Run in background (do not await so client response remains instant!)
                fetchAndSaveRemotiveJobs().catch(err => {
                    console.error('[ExternalJobs] Background feed update failed:', err.message);
                });
            }
        } catch (dbErr) {
            console.error('[ExternalJobs] Check latest job error:', dbErr.message);
        }
    }

    // 1. Build MongoDB query for live fetched jobs
    const query = { isActive: true };
    
    if (type && type !== 'All') {
        query.jobType = type;
    }
    
    if (search) {
        query.$or = [
            { title: { $regex: search, $options: 'i' } },
            { companyName: { $regex: search, $options: 'i' } },
            { tags: { $in: [new RegExp(search, 'i')] } }
        ];
    }

    // 2. Query the actual database (limit to 150 items so we display 100+ jobs!)
    let dbJobs = await ExternalJob.find(query).sort({ publishedAt: -1 }).limit(150);

    // 3. Always merge premium pre-seeded MOCK_JOBS with database jobs to ensure high-quality MNC/Indian jobs are present
    let filteredMockJobs = [...MOCK_JOBS];
    if (type && type !== 'All') {
        filteredMockJobs = filteredMockJobs.filter(job => job.jobType === type);
    }
    if (search) {
        const regex = new RegExp(search, 'i');
        filteredMockJobs = filteredMockJobs.filter(job => 
            regex.test(job.title) || 
            regex.test(job.companyName) || 
            (job.tags && job.tags.some(t => regex.test(t)))
        );
    }

    // Merge them: use externalId or _id to avoid duplicates if any mock jobs were saved to DB
    let mergedJobs = [...dbJobs];
    const dbJobIds = new Set(dbJobs.map(j => (j.externalId || j._id || '').toString()));
    filteredMockJobs.forEach(mockJob => {
        const mockId = (mockJob.externalId || mockJob._id || '').toString();
        if (!dbJobIds.has(mockId)) {
            mergedJobs.push(mockJob);
        }
    });

    // 4. Enrich all jobs dynamically with logo, parsed description, qualifications, and eligibility
    let enrichedJobs = mergedJobs.map(job => enrichJobDetails(job));

    // 5. Tiered Priority Sorting for Top Brands
    const tier1Brands = [
        'google', 'microsoft', 'amazon', 'meta', 'flipkart', 'swiggy', 'zomato', 
        'razorpay', 'cred', 'phonepe', 'atlassian', 'uber', 'paytm', 'zoho', 'freshworks'
    ];
    
    const tier2Brands = [
        'tcs', 'tata consultancy', 'infosys', 'wipro', 'cognizant', 'accenture', 
        'hcl', 'capgemini', 'tech mahindra', 'jio', 'reliance jio', 'airtel', 'ola'
    ];

    const getJobPriorityScore = (job) => {
        const name = (job.companyName || '').toLowerCase();
        for (const brand of tier1Brands) {
            if (name.includes(brand)) return 2;
        }
        for (const brand of tier2Brands) {
            if (name.includes(brand)) return 1;
        }
        return 0;
    };

    enrichedJobs.sort((a, b) => {
        const priorityA = getJobPriorityScore(a);
        const priorityB = getJobPriorityScore(b);
        if (priorityA !== priorityB) {
            return priorityB - priorityA; // Tier-1 and Tier-2 first
        }
        return new Date(b.publishedAt) - new Date(a.publishedAt); // then publishedAt desc
    });

    // 6. Filter out any existing garbled or non-English jobs from the response (double safety)
    const isEnglishAndLegitResponse = (job) => {
        const title = job.title || '';
        const company = job.companyName || '';
        const location = job.location || '';
        
        // 1. CJK, Cyrillic, Arabic, Hebrew characters
        const nonEnglishRanges = [
            /[\u4e00-\u9fa5]|[\u3040-\u30ff]|[\uac00-\ud7af]/, // CJK
            /[\u0400-\u04FF]/, // Cyrillic
            /[\u0600-\u06FF]|[\u0750-\u077F]/, // Arabic/Persian
            /[\u0590-\u05FF]/, // Hebrew
        ];

        for (const regex of nonEnglishRanges) {
            if (regex.test(title) || regex.test(company) || regex.test(location)) {
                return false;
            }
        }
        
        // 2. Filter out scrambled mojibake pattern (e.g. 'ä¸', 'æ¯', 'è®', 'ç°', 'æ≡', 'é≡', 'è≡')
        const mojibakeRegex = /[äæéèïöüåøçñß]¸|[äæéèïöüåøçñß]…|[äæéèïöüåøçñß]ª|[äæéèïöüåøçñß]²|ä¸|æ¯|è®|ç°|æ≡|é≡|è≡/;
        if (mojibakeRegex.test(title) || mojibakeRegex.test(company) || mojibakeRegex.test(location)) {
            return false;
        }

        // 3. Dense Ø and Ù character count (Arabic mojibake signature)
        const checkArabicMojibake = (text) => {
            if (!text) return false;
            const matches = text.match(/[ØÙÚÛ]/g);
            return matches && matches.length >= 3;
        };
        if (checkArabicMojibake(title) || checkArabicMojibake(company) || checkArabicMojibake(location)) {
            return false;
        }
        
        return true;
    };
    
    const finalJobs = enrichedJobs.filter(isEnglishAndLegitResponse);

    res.status(200).json({
        success: true,
        total: finalJobs.length,
        pagination: { page: 1, limit: 150, totalPages: 1 },
        jobs: finalJobs,
    });
});

// ─── @route  GET /api/external-jobs/:id ──────────────────
// ─── @access Private ──────────────────────────────────────
const getExternalJobById = asyncHandler(async (req, res) => {
    const job = await ExternalJob.findById(req.params.id);
    if (!job) {
        res.status(404);
        throw new Error('Job not found');
    }
    const enriched = enrichJobDetails(job);
    res.status(200).json({ success: true, job: enriched });
});

// ─── @route  POST /api/external-jobs/refresh ─────────────
// ─── @access Private (admin only) ─────────────────────────
const refreshJobs = asyncHandler(async (req, res) => {
    const result = await fetchAndSaveRemotiveJobs();
    // Also run startup backfill to ensure any newly fetched records have clearbit logos
    await backfillMissingLogos();
    res.status(200).json({
        success: true,
        message: `Fetched ${result.totalFetched} jobs, saved ${result.totalUpserted}`,
        ...result,
    });
});

module.exports = { getExternalJobs, getExternalJobById, refreshJobs, backfillMissingLogos };
