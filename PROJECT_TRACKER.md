# PlaceIQ: Master Project Tracker

> **AI INSTRUCTION:** Whenever resuming communication after a pause, read this file FIRST to understand the current progress, what has been implemented, and what needs to be worked on next. If the user requests a new feature, add it to this file before implementing it.

## ✅ Phase 1: Core Foundation (Implemented)
- [x] **Auth & Users:** JWT, Role-based Access Control (Admin, Student, Company), Email OTP via Brevo.
- [x] **Job Management:** Post, edit, delete jobs; set eligibility criteria; job search indexing.
- [x] **Application Pipeline:** Apply to jobs, withdraw, view status, internal TPO notes.
- [x] **Admin Dashboard:** System analytics, student management, bulk upload via Excel.
- [x] **Basic Real-time Socket.io:** Rooms setup, online presence, basic event firing.

## ✅ Phase 2: Advanced Features (Implemented)
- [x] **Multi-Round ATS Kanban:** Drag-and-drop Kanban board for applicants.
- [x] **Interview Rounds System:** Track multiple interview rounds per student (Aptitude, Tech, HR) with scores, feedback, and automated status updates.
- [x] **AI Resume Analysis:** Students can analyze their resume against ATS algorithms using Google Gemini AI, getting a score and actionable feedback.
- [x] **Live External Job Board:** Automated fetching of global placement opportunities using Remotive API via node-cron (runs every 6 hours).
- [x] **Notification Persistence:** Notifications are saved in MongoDB and loaded historically when the user connects.

## ✅ Phase 3: Backend Upgrades (Implemented)
- [x] **1. Interview Scheduling Reminders:** `node-cron` job that runs daily to email students 24h before an upcoming interview round.
- [x] **2. Company Profile Verification & Logo Uploads:** Expand `Company` schema. Require admin approval before jobs are public. Add Cloudinary endpoint for company logos.
- [x] **3. Placement Result Declaration Broadcasts:** Socket event broadcast to the whole college when a student is officially placed.
- [x] **4. Advanced Data Exports:** `GET /api/admin/export-placements` to generate Excel/CSV reports for TPOs using `exceljs`/`xlsx`.

## 🔵 Phase 4: Future / Backlog (Add New Ideas Here)
- [x] **Resume Builder (PDF Export):** Endpoint (`GET /api/resume/generate`) using `pdfkit` to auto-generate a formatted PDF resume from a student's profile data.
- [x] **Calendar Integration (.ics):** Generate and attach `.ics` files to interview reminder emails so they automatically sync with Google/Outlook Calendars.
- [ ] **Campus Placement Drive / Event Management:** `Event` schema to schedule physical/virtual campus visits (pre-placement talks, aptitude tests) and link them to job roles.
- [ ] **In-App Direct Messaging:** Real-time 1-on-1 chat rooms (via Socket.io) for HR and students to communicate directly (e.g., requesting documents).
- [x] **Alumni & Referral Network:** Introduce an `Alumni` role allowing past students to post referral opportunities for current students.
- [ ] Coding challenge integration (HackerRank/LeetCode API).
