# PlaceIQ Backend Documentation

## Overview

The PlaceIQ backend is a modular RESTful API and WebSocket server built with Node.js and Express. It manages relational data structures via MongoDB, orchestrates background automation tasks, and integrates with external AI and email services.

## Technology Stack

- **Runtime & Framework**: Node.js, Express.js
- **Database & ODM**: MongoDB Atlas, Mongoose
- **Real-time Server**: Socket.io
- **Task Scheduling**: `node-cron`
- **AI Integration**: Groq SDK (Llama-3.3-70b-versatile)
- **Document Processing**: `pdf-parse` (Extraction), `pdfkit` (Generation)
- **Email & Notifications**: Nodemailer (Brevo SMTP), `ics` (Calendar sync)
- **Data Export**: `exceljs`, `xlsx`
- **File Storage**: Cloudinary (via Multer)

## System Architecture

The backend follows a Controller-Service-Model architecture with comprehensive middleware for authentication and error handling.

```mermaid
graph TD
    Router[Express Router]
    AuthMid[Authentication & Role Middleware]
    Controllers[Business Logic Controllers]
    Models[Mongoose ODM Models]
    
    Cron[node-cron Schedulers]
    Socket[Socket.io Manager]
    
    Router --> AuthMid
    AuthMid --> Controllers
    Controllers --> Models
    
    Controllers --> External[External Services]
    External --> Groq[Groq AI]
    External --> Brevo[Brevo SMTP]
    External --> Cloudinary[Cloudinary Storage]
    
    Cron -->|Daily| Email[Interview Reminders]
    Cron -->|6 Hours| API[Remotive Job Sync]
```

## Database Entity Relationship

The system utilizes a relational structure within MongoDB.

```mermaid
erDiagram
    User ||--o{ StudentProfile : "has profile"
    User ||--o{ Company : "has profile"
    Company ||--o{ Job : "posts"
    StudentProfile ||--o{ Application : "submits"
    Job ||--o{ Application : "receives"
    Job ||--o{ Assessment : "requires"
    User ||--o{ Notification : "receives"
    User ||--o{ ChatRoom : "participates in"

    User {
        ObjectId _id
        String name
        String email
        String role
    }
    Job {
        ObjectId _id
        String role
        Number minCGPA
        String status
    }
    Application {
        ObjectId _id
        String status
        Array rounds
    }
```

## Core Backend Workflows

### AI Resume Analysis Flow

```mermaid
sequenceDiagram
    participant Client
    participant ResumeController
    participant PDFParser
    participant GroqAPI as Groq LLM
    participant DB

    Client->>ResumeController: POST /api/resume/analyze (Cloudinary URL)
    ResumeController->>PDFParser: Fetch & Extract PDF Text
    PDFParser-->>ResumeController: Raw Text Data
    ResumeController->>GroqAPI: Construct Prompt & Send Context
    GroqAPI-->>ResumeController: JSON ATS Evaluation
    ResumeController->>DB: Update StudentProfile with Analysis
    ResumeController-->>Client: Return Structured Evaluation Data
```

### Automated Job Synchronization

```mermaid
flowchart TD
    CronTrigger[Cron Job: Every 6 Hours] --> Fetch[Fetch Remotive API]
    Fetch --> Parse[Parse External Jobs]
    Parse --> Deduplicate[Check Database for Duplicates]
    Deduplicate --> Save[Upsert to ExternalJob Collection]
    Save --> LogoCheck{Logo Missing?}
    LogoCheck -->|Yes| Backfill[Execute Logo Backfill Controller]
    LogoCheck -->|No| Complete[Sync Complete]
```

## API Endpoint Summary

- `/api/auth`: Registration, login, OTP verification, and password resets.
- `/api/students`: Profile management and resume processing.
- `/api/jobs`: Job creation, filtering, and administration.
- `/api/applications`: Application submission and ATS round management.
- `/api/admin`: System analytics, bulk uploads, and data exports.
- `/api/companies`: Corporate profile verification and management.
- `/api/resume`: AI parsing, scoring, and PDF generation.
- `/api/chat`: Peer-to-peer real-time messaging data.
- `/api/notifications`: Alert persistence and retrieval.
- `/api/external-jobs`: Access synchronized remote opportunities.
- `/api/assessments`: Examination configurations and code submissions.

## Environment Configuration

Create a `.env` file in the `server` directory using the following template:

```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

MONGO_URI=mongodb_atlas_connection_string

JWT_SECRET=secure_jwt_secret
JWT_EXPIRE=7d
JWT_COOKIE_EXPIRE=7

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

EMAIL_FROM=system@domain.com
EMAIL_FROM_NAME="PlaceIQ System"
BREVO_API_KEY=your_brevo_smtp_key

GROQ_API_KEY=your_groq_api_key
```
