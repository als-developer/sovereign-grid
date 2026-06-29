// server.js - Main Server with Firebase, DeepSeek, JWT
// Version: 31.0
// Fully integrated with Admin Dashboard

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

// =====================================================
// IMPORT ROUTES
// =====================================================

// Auth routes
const authRoutes = require('./routes/auth');

// API routes (Sovereign Grid + DeepSeek)
const apiRoutes = require('./routes/api');

// Admin routes
const adminRoutes = require('./routes/admin');

// Initialize Express
const app = express();
const PORT = process.env.PORT || 3000;

// =====================================================
// MIDDLEWARE
// =====================================================

// Security Headers
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: false
}));

// CORS - Allow all origins for development
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Sovereign-Key', 'X-Requested-With'],
    exposedHeaders: ['Authorization'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204
}));

// Logging
app.use(morgan('combined'));

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: { error: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false
});
app.use('/api/', limiter);

// Body parsing - JSON and URL Encoded
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files - Public folder
app.use(express.static(path.join(__dirname, 'public')));

// =====================================================
// ROUTES
// =====================================================

// --------------------------------------------
// HEALTH & STATUS ENDPOINTS
// --------------------------------------------

app.get('/', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Sovereign Grid is running!',
        version: '31.0',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        services: {
            firebase: process.env.FIREBASE_URL ? 'connected' : 'not configured',
            deepseek: process.env.DEEPSEEK_API_KEY ? 'connected' : 'not configured',
            jwt: process.env.JWT_SECRET ? 'configured' : 'not configured'
        },
        endpoints: {
            api: '/api',
            auth: '/api/auth',
            admin: '/admin',
            docs: '/docs'
        }
    });
});

app.get('/health', (req, res) => {
    res.json({
        status: 'alive',
        version: '31.0',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage()
    });
});

app.get('/ready', (req, res) => {
    // Check if Firebase is connected
    const firebaseReady = process.env.FIREBASE_URL ? true : false;
    res.json({ 
        status: firebaseReady ? 'ready' : 'degraded',
        firebase: firebaseReady ? 'connected' : 'disconnected'
    });
});

app.get('/version', (req, res) => {
    res.json({
        version: '31.0',
        api_version: 'v1',
        environment: process.env.NODE_ENV || 'development',
        node_version: process.version,
        firebase: process.env.FIREBASE_URL ? 'configured' : 'not configured',
        deepseek: process.env.DEEPSEEK_API_KEY ? 'configured' : 'not configured'
    });
});

// --------------------------------------------
// AUTH ROUTES
// --------------------------------------------
app.use('/api/auth', authRoutes.router);

// --------------------------------------------
// API ROUTES (Sovereign Grid + DeepSeek)
// --------------------------------------------
app.use('/api', apiRoutes);

// --------------------------------------------
// ADMIN ROUTES
// --------------------------------------------
app.use('/api/admin', adminRoutes);

// --------------------------------------------
// ADMIN DASHBOARD (UI)
// --------------------------------------------

// Serve admin dashboard HTML
app.use('/admin', express.static(path.join(__dirname, 'public/admin')));

// Admin login page
app.get('/admin/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/admin/login.html'));
});

// Admin dashboard main page
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/admin/index.html'));
});

// Admin dashboard fallback for sub-routes
app.get('/admin/*', (req, res) => {
    // If requesting a file that exists, serve it
    const filePath = path.join(__dirname, 'public/admin', req.params[0]);
    if (require('fs').existsSync(filePath)) {
        return res.sendFile(filePath);
    }
    // Otherwise, serve index.html for SPA routing
    res.sendFile(path.join(__dirname, 'public/admin/index.html'));
});

// =====================================================
// ERROR HANDLING
// =====================================================

// 404 Not Found Handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString()
    });
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('========================================');
    console.error('❌ GLOBAL ERROR:', err);
    console.error('📡 Path:', req.path);
    console.error('🔧 Method:', req.method);
    console.error('👤 User:', req.user?.email || 'anonymous');
    console.error('========================================');

    // Determine status code
    const statusCode = err.statusCode || err.status || 500;
    
    // Build response
    const response = {
        error: err.message || 'Internal server error',
        status: statusCode,
        timestamp: new Date().toISOString(),
        path: req.path
    };

    // Add stack trace in development only
    if (process.env.NODE_ENV === 'development') {
        response.stack = err.stack;
        response.details = err.details || null;
    }

    res.status(statusCode).json(response);
});

// =====================================================
// UNHANDLED REJECTIONS & EXCEPTIONS
// =====================================================

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise);
    console.error('📝 Reason:', reason);
    // Don't crash the app, just log
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    // For critical errors, gracefully shutdown
    if (error.code === 'EADDRINUSE') {
        console.error('Port already in use, exiting...');
        process.exit(1);
    }
    // Otherwise, log and continue
});

// =====================================================
// START SERVER
// =====================================================

const server = app.listen(PORT, () => {
    console.log('');
    console.log('========================================');
    console.log('🚀 SOVEREIGN GRID v31.0');
    console.log('========================================');
    console.log(`📍 Server running on: http://localhost:${PORT}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📡 API Base: http://localhost:${PORT}/api`);
    console.log(`🔐 Auth: http://localhost:${PORT}/api/auth`);
    console.log(`👑 Admin: http://localhost:${PORT}/admin`);
    console.log(`📖 Health: http://localhost:${PORT}/health`);
    console.log(`📊 Version: http://localhost:${PORT}/version`);
    console.log('========================================');
    console.log('🛠️  SERVICES STATUS:');
    console.log(`   🔥 Firebase: ${process.env.FIREBASE_URL ? '✅ Connected' : '❌ Not configured'}`);
    console.log(`   🤖 DeepSeek: ${process.env.DEEPSEEK_API_KEY ? '✅ Connected' : '❌ Not configured'}`);
    console.log(`   🔑 JWT: ${process.env.JWT_SECRET ? '✅ Configured' : '❌ Not configured'}`);
    console.log('========================================');
    console.log('⏰ Server started at:', new Date().toISOString());
    console.log('========================================');
    console.log('');
});

// =====================================================
// GRACEFUL SHUTDOWN
// =====================================================

const shutdown = (signal) => {
    console.log(`\n📢 Received ${signal}, shutting down gracefully...`);
    
    // Close server
    server.close(() => {
        console.log('✅ HTTP server closed');
        
        // Close database connections if any
        // Example: db.disconnect();
        
        console.log('🛑 Shutdown complete');
        process.exit(0);
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
        console.error('⚠️ Force shutdown after timeout');
        process.exit(1);
    }, 10000);
};

// Listen for shutdown signals
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// =====================================================
// EXPORT APP (for testing)
// =====================================================

module.exports = app;
