// server.js - Main Server with Firebase, DeepSeek, JWT
// Version: 31.0

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const apiRoutes = require('./routes/api');

// Initialize Express
const app = express();
const PORT = process.env.PORT || 3000;

// =====================================================
// MIDDLEWARE
// =====================================================

// Security
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));

// CORS
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Sovereign-Key']
}));

// Logging
app.use(morgan('combined'));

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// =====================================================
// ROUTES
// =====================================================

// Health check
app.get('/', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Sovereign Grid is running!',
        version: '31.0',
        timestamp: new Date().toISOString(),
        services: {
            firebase: process.env.FIREBASE_URL ? 'connected' : 'not configured',
            deepseek: process.env.DEEPSEEK_API_KEY ? 'connected' : 'not configured'
        }
    });
});

app.get('/health', (req, res) => {
    res.json({
        status: 'alive',
        version: '31.0',
        uptime: process.uptime()
    });
});

app.get('/ready', (req, res) => {
    res.json({ status: 'ready' });
});

// Version info
app.get('/version', (req, res) => {
    res.json({
        version: '31.0',
        api_version: 'v1',
        environment: process.env.NODE_ENV || 'development',
        firebase: process.env.FIREBASE_URL ? 'configured' : 'not configured'
    });
});

// Auth routes
app.use('/api/auth', authRoutes.router);

// API routes (Sovereign Grid + DeepSeek)
app.use('/api', apiRoutes);

// =====================================================
// ERROR HANDLING
// =====================================================

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Global error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// =====================================================
// START SERVER
// =====================================================

app.listen(PORT, () => {
    console.log('========================================');
    console.log(`🚀 Sovereign Grid v31.0 running on port ${PORT}`);
    console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔥 Firebase: ${process.env.FIREBASE_URL ? '✅ Connected' : '❌ Not configured'}`);
    console.log(`🤖 DeepSeek: ${process.env.DEEPSEEK_API_KEY ? '✅ Connected' : '❌ Not configured'}`);
    console.log(`🔑 JWT: ${process.env.JWT_SECRET ? '✅ Configured' : '❌ Not configured'}`);
    console.log('========================================');
});

// Handle shutdown gracefully
process.on('SIGTERM', () => {
    console.log('🛑 Received SIGTERM, shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🛑 Received SIGINT, shutting down gracefully...');
    process.exit(0);
});
