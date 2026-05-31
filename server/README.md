# ⚙️ PlaceIQ: Backend Engineering Documentation

> **Node.js & Express REST & WebSocket API**  
> *A modular, highly scalable API service supporting JWT-cookie security, automated background cron routines, real-time message streams, and LLM-powered resume analytics.*

---

## 🛠️ Technology Stack & Backend Infrastructure

PlaceIQ’s backend is designed with modular layers (Routing ──> Middleware ──> Controllers ──> Models) ensuring micro-service grade separation and strict type-like schema checks.

*   **API Framework**: **Node.js** with **Express** for fast HTTP route handling and structured middleware chains.
*   **Database Engine**: **MongoDB Atlas** accessed via the **Mongoose ODM** (Object Document Mapper) for structured schema models.
*   **Real-time Layer**: **Socket.io** establishing persistent duplex TCP connections for instant UI updates.
*   **AI Orchestration Engine**: **Groq SDK** utilizing the state-of-the-art **Llama-3.3-70b-versatile** model for high-speed resume analysis.
*   **Background Cron Engine**: **`node-cron`** scheduling daily reminders and 6-hour external job crawls.
*   **Asset Processing**: **`pdf-parse`** to extract text streams from PDF buffers and **`pdfkit`** to compile high-fidelity, printable PDF resumes.
*   **Reports Compiler**: **`exceljs`** and **`xlsx`** for generating administrative placement analytics spreadsheets.
*   **Calendar Sync Integration**: **`ics`** for parsing dynamic, calendar-compatible invitations.
*   **Notifications & Mailing**: **Nodemailer** configured with a transactional **Brevo SMTP** gateway for high-deliverability OTP and reminder dispatches.
*   **Cloud Media Vault**: **Multer** and **Cloudinary** for secure logo uploads.

---

## 🗄️ Database Schemas & Mongoose Models

PlaceIQ structures database operations around strictly-defined schemas:

### 1. `User.js`
*   Tracks user details: `name`, `email`, `password` (stored as a salted bcrypt hash), `role` (`student`, `admin`, `company`, `alumni`), and verified status.
*   Houses OTP variables (`otpCode`, `otpExpires`) for secure registration and passwords.

### 2. `StudentProfile.js`
*   Contains student metrics: `rollNo`, `phone`, `branch` (`CSE`, `ECE`, etc.), `CGPA`, `backlogs`, and detailed lists representing `skills`, `projects`, `internships`, `achievements`, and `certificates`.
*   Includes `atsAnalysis` to cache resume evaluations: overall scores, missing skills, and priority improvements.

### 3. `Job.js`
*   Defines corporate opportunities: `companyId` (relation to Company), `role`, `description`, `location`, `salary`, and strict eligibility filters (`minCGPA`, `maxBacklogs`, `allowedBranches`).
*   Requires admin approval (`status` field defaulting to `pending`) before becoming public.

### 4. `Application.js`
*   Represents a student's bid for a job.
*   Houses the **Multi-Round ATS Pipeline** array:
    ```javascript
    rounds: [{
      name: String,            // 'Aptitude', 'Technical Interview', 'HR'
      status: String,          // 'pending', 'scheduled', 'passed', 'failed'
      score: Number,           // Score awarded in this round
      feedback: String,        // Notes from TPO / HR
      scheduledAt: Date,       // Timestamp for the interview
      reminderSent: Boolean,   // Prevent duplicate node-cron alert dispatches
    }]
    ```

### 5. `Assessment.js`
*   Supports campus exams: contains coding problems (with visible and hidden test cases, runtime language constraints, and starter boilerplate code) or MCQ questions.
*   Includes `submissions` tracking candidate scores, completed test cases, and code submissions.

### 6. `Notification.js` & `AuditLog.js`
*   **Notification**: Tracks in-app notification state (`userId`, `title`, `message`, `isRead`).
*   **AuditLog**: Maintains security logs (`action`, `performedBy` (User ID), `details`, `ipAddress`) for administrative compliance tracking.

---

## 🌐 API Route Catalog & Controller Reference

### 🔐 Authentication Gateway (`/api/auth`)
*   `POST /register` — Initializes a new account, generates an OTP, and emails it to the user.
*   `POST /verify-otp` — Compares the user's OTP input; activates the account and issues a signed JWT cookie.
*   `POST /login` — Checks credentials and issues a JWT token.
*   `POST /forgot-password` — Generates a unique, expiring reset token emailed as a link.
*   `POST /reset-password/:token` — Validates the token and updates the user's password.

### 🎓 Student Operations (`/api/students`)
*   `GET /profile` — Retrieves the current student’s profile.
*   `PUT /profile` — Updates personal metrics, academic history, and technical skills.
*   `POST /upload-resume` — Handles multipart resume uploads directly to Cloudinary.

### 💼 Corporate Opportunity Engine (`/api/jobs`)
*   `POST /` — Creates a new job posting (accessible by companies and admins).
*   `GET /` — Fetches active, approved jobs.
*   `GET /eligible` — Fetches jobs where the student meets all branch, CGPA, and backlog criteria.
*   `PATCH /:id/approve` — Toggles approval status (accessible by admins).

### 📊 ATS Application Pipeline (`/api/applications`)
*   `POST /apply` — Submits a job application (evaluates eligibility filters).
*   `GET /my-applications` — Allows students to track their active applications.
*   `PATCH /:id/status` — Moves applications between ATS Kanban stages (`applied`, `shortlisted`, `placed`, etc.).
*   `POST /:id/rounds` — Creates new interview rounds (Technical, HR, etc.) and schedules them.
*   `PATCH /:id/rounds/:roundIdx` — Awards scores and feedback, and updates applicant status.

### 🛡️ Administrative Portal (`/api/admin`)
*   `GET /analytics/dashboard` — Compiles aggregate metrics: Placed percentage, pending approvals, and active job postings.
*   `POST /students/bulk-upload` — Parses uploaded Excel lists to register hundreds of student accounts.
*   `GET /export-placements` — Generates and downloads an Excel spreadsheet of placed candidates using `exceljs`.

### 🧠 AI & Resume Services (`/api/resume`)
*   `POST /analyze` — Extracts PDF text using `pdf-parse`, submits it to the Groq Llama-3 API, and returns an ATS score and improvement guide.
*   `POST /extract` — Automates student profile forms by parsing resume text and returning structured JSON.
*   `GET /generate` — Generates a professional, print-ready PDF resume using PDFKit.

---

## 🔌 Real-Time Communications Gateway (Socket.io)

The WebSocket architecture in `server.js` tracks live connections and handles real-time alerts.

### 1. Room Subscriptions
*   **`join_room`**: When a socket connects, it registers to a room named after the user's DB ID:
    ```javascript
    socket.on('join_room', (userId) => {
        socket.join(userId.toString());
        onlineUsers.set(userId.toString(), socket.id);
    });
    ```
*   **`join_admin_room`**: Admin sockets join the specialized `room:admins` channel to monitor system changes.

### 2. Supported Network Events

| Event Name | Direction | Payload | Description |
|:---|:---|:---|:---|
| `presence:update` | Server ──> Admin | `{ onlineCount: Number }` | Pushes the count of active socket connections to the admin room. |
| `application:status_changed` | Server ──> Student | `{ companyName, newStatus, timestamp }` | Sent when an admin updates a candidate's ATS Kanban stage. |
| `job:new_posted` | Server ──> All | `{ job: { role, companyName } }` | Broadcast to all students when a new job is approved and active. |
| `admin:announcement` | Server ──> All | `{ title, message, timestamp }` | Broadcasts immediate, high-priority notices from TPOs. |
| `chat:typing` | Bidirectional | `{ receiverId, isTyping }` | Relays live chat typing states between two active users. |

---

## ⏰ Background Cron Schedulers (`cronJobs.js`)

PlaceIQ schedules asynchronous jobs after establishing a connection to the database:

### 1. External Job Crawls (Runs Every 6 Hours)
*   **Schedule**: `0 */6 * * *`
*   **Action**: Calls `fetchAndSaveRemotiveJobs()` to pull remote vacancies from the Remotive API.
*   **De-duplication**: Filters entries using their unique external reference ID, upserting only new roles.
*   **Backfill**: Runs `backfillMissingLogos()` to clean company names and fetch missing logos.

### 2. Daily Interview Alerts (Runs Daily at 8:00 AM)
*   **Schedule**: `0 8 * * *`
*   **Action**: Searches MongoDB for applications with interview rounds scheduled within the next 24 hours (`status: 'scheduled'`).
*   **Notification Flow**:
    *   Generates a standard **iCalendar (`.ics`)** event.
    *   Triggers transactional mailers using **Brevo (Nodemailer)**.
    *   Attaches the `.ics` file so the student can easily add the event to their calendar.
    *   Marks the round's `reminderSent` flag to `true` to prevent duplicate emails.

---

## 🔒 Security & Middleware Framework

*   **Authentication Guard (`authMiddleware.js`)**: Validates the JWT from incoming HTTP-only cookies or the `Authorization` header, appending the decoded user document to `req.user`.
*   **Role Guard (`roleMiddleware.js`)**: Restricts routes to specific user groups:
    ```javascript
    const authorizeRoles = (...roles) => {
        return (req, res, next) => {
            if (!roles.includes(req.user.role)) {
                return res.status(403).json({ success: false, message: 'Forbidden access' });
            }
            next();
        };
    };
    ```
*   **Error Handler Middleware (`errorMiddleware.js`)**: Sanitizes runtime errors, translating MongoDB duplicates or JWT expiration errors into clean, readable JSON payloads:
    ```javascript
    res.status(statusCode).json({
        success: false,
        message: err.message,
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
    ```

---

## 🔑 Environment Configuration Template

Create a `.env` file in your `/server` directory and paste the following structure:

```env
# Server Config
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# Database Connection
MONGO_URI=your_mongodb_connection_string

# Authentication Secrets
JWT_SECRET=your_jwt_signing_key_secret_string
JWT_EXPIRE=7d
JWT_COOKIE_EXPIRE=7

# Cloudinary Integration (Image Uploads)
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Brevo Mailer Gateway (SMTP)
EMAIL_FROM=your_sender_email@gmail.com
EMAIL_FROM_NAME="PlaceIQ Campus Recruitment"
BREVO_API_KEY=your_brevo_smtp_api_key

# Groq AI Integration (ATS Resume Analysis)
GROQ_API_KEY=your_groq_llama3_api_key
```
