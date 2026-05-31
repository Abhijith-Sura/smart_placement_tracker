const express       = require('express');
const http          = require('http');
const { Server }    = require('socket.io');
const cors          = require('cors');
const cookieParser  = require('cookie-parser');
const dotenv        = require('dotenv');
const path          = require('path');
const connectDB     = require('./config/db');
const errorHandler  = require('./middleware/errorMiddleware');
const { EVENTS }    = require('./utils/socketManager');

// ─── Routes ───────────────────────────────────────────────
const authRoutes         = require('./routes/authRoutes');
const studentRoutes      = require('./routes/studentRoutes');
const jobRoutes          = require('./routes/jobRoutes');
const applicationRoutes  = require('./routes/applicationRoutes');
const adminRoutes        = require('./routes/adminRoutes');
const companyRoutes      = require('./routes/companyRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const externalJobRoutes  = require('./routes/externalJobRoutes');
const resumeRoutes       = require('./routes/resumeRoutes');
const chatRoutes         = require('./routes/chatRoutes');
const eventRoutes        = require('./routes/eventRoutes');
const slotRoutes         = require('./routes/slotRoutes');
const campaignRoutes     = require('./routes/campaignRoutes');
const auditRoutes        = require('./routes/auditRoutes');
const referralRoutes     = require('./routes/referralRoutes');
const assessmentRoutes   = require('./routes/assessmentRoutes');
const { startCronJobs }  = require('./utils/cronJobs');

// ─── Init ─────────────────────────────────────────────────
dotenv.config();
const { backfillMissingLogos } = require('./controllers/externalJobController');
connectDB().then(async () => {
    // Start cron jobs only after DB is ready
    startCronJobs();
    try {
        await backfillMissingLogos();
    } catch (err) {
        console.error('[Startup] Failed to run logo backfill:', err.message);
    }
});

const app    = express();
const server = http.createServer(app);

// ─── Socket.io Setup ──────────────────────────────────────
const io = new Server(server, {
    cors: {
        origin: (origin, callback) => {
            // Allow any localhost port (Vite picks 5173, 5174, etc. dynamically)
            if (!origin || /^http:\/\/localhost:\d+$/.test(origin)) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        },
        credentials: true,
        methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    },
    transports: ['websocket', 'polling'],
});

// Make io accessible from any controller via req.app.get('io')
app.set('io', io);

// Track connected users for presence
const onlineUsers = new Map(); // userId → socketId

io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // User joins their private room after login
    socket.on('join_room', (userId) => {
        socket.join(userId.toString());
        onlineUsers.set(userId.toString(), socket.id);
        console.log(`👤 User ${userId} joined room`);
        io.to('room:admins').emit('presence:update', { onlineCount: onlineUsers.size });
    });

    // Chat typing indicator
    socket.on('chat:typing', ({ receiverId, isTyping }) => {
        io.to(receiverId.toString()).emit('chat:typing', {
            senderId: [...onlineUsers.entries()].find(([_, sid]) => sid === socket.id)?.[0],
            isTyping,
        });
    });

    // Admin room join
    socket.on('join_admin_room', () => {
        socket.join('room:admins');
        console.log(`🛡️  Admin joined admin room`);
    });

    socket.on('disconnect', () => {
        for (const [userId, sid] of onlineUsers.entries()) {
            if (sid === socket.id) {
                onlineUsers.delete(userId);
                break;
            }
        }
        io.to('room:admins').emit('presence:update', { onlineCount: onlineUsers.size });
        console.log(`❌ Socket disconnected: ${socket.id}`);
    });
});

// ─── Core Middleware ──────────────────────────────────────
app.use(cors({
    origin: (origin, callback) => {
        // Allow any localhost port (Vite picks 5173, 5174, etc. dynamically)
        if (!origin || /^http:\/\/localhost:\d+$/.test(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods:     ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ─── Static: Local file uploads fallback ─────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── API Routes ───────────────────────────────────────────
app.use('/api/auth',          authRoutes);
app.use('/api/students',      studentRoutes);
app.use('/api/jobs',          jobRoutes);
app.use('/api/applications',  applicationRoutes);
app.use('/api/admin',         adminRoutes);
app.use('/api/companies',     companyRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/external-jobs', externalJobRoutes);
app.use('/api/resume',        resumeRoutes);
app.use('/api/chat',          chatRoutes);
app.use('/api/events',        eventRoutes);
app.use('/api/slots',         slotRoutes);
app.use('/api/campaigns',     campaignRoutes);
app.use('/api/audit',         auditRoutes);
app.use('/api/referrals',     referralRoutes);
app.use('/api/assessments',   assessmentRoutes);

// ─── Health Check ────────────────────────────────────────
app.get('/api/health', (req, res) => {
    res.json({
        status:      'OK',
        environment: process.env.NODE_ENV,
        timestamp:   new Date().toISOString(),
        uptime:      process.uptime(),
        onlineUsers: onlineUsers.size,
    });
});

// ─── Serve React Frontend in Production ──────────────────
if (process.env.NODE_ENV === 'production') {
    const clientBuildPath = path.resolve(__dirname, '..', 'client', 'dist');
    console.log(`📂 Serving static files from: ${clientBuildPath}`);
    console.log(`📂 Directory exists: ${require('fs').existsSync(clientBuildPath)}`);

    app.use(express.static(clientBuildPath));

    // All non-API routes serve the React SPA
    app.get(/^(?!\/api).*/, (req, res) => {
        res.sendFile(path.join(clientBuildPath, 'index.html'));
    });
} else {
    // ─── 404 handler (dev only — in prod, SPA handles routing) ───
    app.use((req, res) => {
        res.status(404).json({
            success: false,
            message: `Route not found: ${req.method} ${req.originalUrl}`,
        });
    });
}

// ─── Global Error Handler ────────────────────────────────
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log('');
    console.log('🚀 ──────────────────────────────────────────────────');
    console.log(`🚀  Smart Placement Tracker — Server running`);
    console.log(`🚀  Port:        ${PORT}`);
    console.log(`🚀  Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🚀  Client URL:  ${process.env.CLIENT_URL || 'http://localhost:5173'}`);
    console.log('🚀 ──────────────────────────────────────────────────');
    console.log('');
});

module.exports = { app, server, io };
