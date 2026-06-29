// server.js - Sovereign Grid v31.0 (FULLY FIXED - NO AUTO LOGIN)
// All buttons working, all pages functional, NO SESSION CACHE

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
require('dotenv').config();

// =====================================================
// INITIALIZATION
// =====================================================

const app = express();
const PORT = process.env.PORT || 3000;

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'sovereign-grid-super-secret-key-2026';
const JWT_EXPIRY = '24h';

// =====================================================
// COOKIE PARSER
// =====================================================

app.use(cookieParser());

// =====================================================
// MIDDLEWARE - NO CACHE, NO SESSION
// =====================================================

// Clear all cookies and prevent caching
app.use((req, res, next) => {
    // Prevent caching on ALL pages
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    
    // Clear ALL cookies on login page
    if (req.path.includes('/admin/login') || req.path === '/admin/' || req.path === '/admin/force-logout') {
        // Clear all cookies
        const cookies = req.headers.cookie;
        if (cookies) {
            cookies.split(';').forEach(cookie => {
                const name = cookie.split('=')[0].trim();
                res.clearCookie(name, { path: '/', domain: req.hostname });
                res.clearCookie(name, { path: '/' });
            });
        }
        res.clearCookie('token', { path: '/' });
        res.clearCookie('session', { path: '/' });
        res.clearCookie('connect.sid', { path: '/' });
        res.clearCookie('JSESSIONID', { path: '/' });
    }
    next();
});

// =====================================================
// SECURITY HEADERS
// =====================================================

app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: false,
    noCache: true
}));

// CORS - Allow all origins
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
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// =====================================================
// AUTHENTICATION MIDDLEWARE
// =====================================================

function authenticate(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}

// =====================================================
// PUBLIC ROUTES
// =====================================================

// Home - No cache
app.get('/', (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.json({
        status: 'ok',
        message: 'Sovereign Grid is running!',
        version: '31.0',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        endpoints: {
            home: '/',
            health: '/health',
            version: '/version',
            docs: '/api/docs',
            auth: '/api/auth/login',
            admin: '/admin'
        }
    });
});

// Health
app.get('/health', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.json({
        status: 'alive',
        version: '31.0',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage()
    });
});

// Version
app.get('/version', (req, res) => {
    res.json({
        version: '31.0',
        api_version: 'v1',
        environment: process.env.NODE_ENV || 'development',
        node_version: process.version,
        uptime: process.uptime()
    });
});

// =====================================================
// FORCE LOGOUT - Clears EVERYTHING
// =====================================================

app.get('/admin/force-logout', (req, res) => {
    // Clear all cookies
    const cookies = req.headers.cookie;
    if (cookies) {
        cookies.split(';').forEach(cookie => {
            const name = cookie.split('=')[0].trim();
            res.clearCookie(name, { path: '/', domain: req.hostname });
            res.clearCookie(name, { path: '/' });
        });
    }
    res.clearCookie('token', { path: '/' });
    res.clearCookie('session', { path: '/' });
    res.clearCookie('connect.sid', { path: '/' });
    
    // Send HTML with JavaScript to clear localStorage
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Logging out...</title>
            <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
            <meta http-equiv="Pragma" content="no-cache">
            <meta http-equiv="Expires" content="0">
            <style>
                body { 
                    background: #0a0a0f; 
                    color: #e0e0e0; 
                    font-family: Arial, sans-serif;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    margin: 0;
                }
                .container {
                    text-align: center;
                    background: #111118;
                    padding: 40px;
                    border-radius: 16px;
                    border: 1px solid #1a1a2e;
                }
                .spinner {
                    border: 4px solid #1a1a2e;
                    border-top: 4px solid #6366f1;
                    border-radius: 50%;
                    width: 40px;
                    height: 40px;
                    animation: spin 1s linear infinite;
                    margin: 20px auto;
                }
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                .btn {
                    background: #6366f1;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 16px;
                    margin-top: 20px;
                }
                .btn:hover { background: #4f46e5; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🚪 Logging Out...</h1>
                <div class="spinner"></div>
                <p>Clearing your session...</p>
                <button class="btn" onclick="clearAllAndRedirect()">Go to Login</button>
            </div>
            <script>
                function clearAllAndRedirect() {
                    // Clear localStorage
                    localStorage.clear();
                    sessionStorage.clear();
                    
                    // Clear cookies
                    document.cookie.split(";").forEach(function(c) {
                        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
                        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/;domain=" + window.location.hostname);
                    });
                    
                    // Clear indexedDB
                    if (window.indexedDB) {
                        window.indexedDB.databases().then(dbs => {
                            dbs.forEach(db => window.indexedDB.deleteDatabase(db.name));
                        });
                    }
                    
                    // Reload to login
                    window.location.href = '/admin/login?cleared=' + Date.now();
                }
                
                // Auto redirect after 2 seconds
                setTimeout(clearAllAndRedirect, 2000);
                
                // Also clear on load
                clearAllAndRedirect();
            </script>
        </body>
        </html>
    `);
});

// =====================================================
// ADMIN LOGIN PAGE - NO CACHE
// =====================================================

app.get('/admin/login', (req, res) => {
    // Force no cache
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    // Clear all cookies
    const cookies = req.headers.cookie;
    if (cookies) {
        cookies.split(';').forEach(cookie => {
            const name = cookie.split('=')[0].trim();
            res.clearCookie(name, { path: '/' });
        });
    }
    res.clearCookie('token', { path: '/' });
    res.clearCookie('session', { path: '/' });
    res.clearCookie('connect.sid', { path: '/' });
    
    res.sendFile(path.join(__dirname, 'public/admin/login.html'));
});

// =====================================================
// AUTH ROUTES
// =====================================================

// Login
app.post('/api/auth/login', (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Default admin credentials
        const validUsers = [
            { email: 'admin@ailifesolution.com', password: 'admin123', role: 'super_admin' },
            { email: 'admin@sovereigngrid.com', password: 'Sovereign@Admin2026!', role: 'super_admin' },
            { email: 'tech@sovereigngrid.com', password: 'Tech@Sovereign2026!', role: 'admin' },
            { email: 'finance@sovereigngrid.com', password: 'Finance@Sovereign2026!', role: 'admin' },
            { email: 'investor.lead@sovereigngrid.com', password: 'Investor@Lead2026!', role: 'investor' },
            { email: 'investor.partner@sovereigngrid.com', password: 'Investor@Partner2026!', role: 'investor' },
            { email: 'investor.minor@sovereigngrid.com', password: 'Investor@Minor2026!', role: 'investor' },
            { email: 'nmb.bank@sovereigngrid.com', password: 'NMB@Bank2026!', role: 'enterprise' },
            { email: 'vodacom.telecom@sovereigngrid.com', password: 'Vodacom@Telecom2026!', role: 'enterprise' },
            { email: 'azam.media@sovereigngrid.com', password: 'Azam@Media2026!', role: 'business' },
            { email: 'flutterwave.fintech@sovereigngrid.com', password: 'Flutterwave@Fintech2026!', role: 'enterprise' },
            { email: 'nic.insurance@sovereigngrid.com', password: 'NIC@Insurance2026!', role: 'business' },
            { email: 'dev.senior@sovereigngrid.com', password: 'Dev@Senior2026!', role: 'developer' },
            { email: 'dev.junior@sovereigngrid.com', password: 'Dev@Junior2026!', role: 'developer' },
            { email: 'dev.partner@sovereigngrid.com', password: 'Dev@Partner2026!', role: 'developer' }
        ];
        
        const user = validUsers.find(u => u.email === email && u.password === password);
        
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        
        // Generate JWT token
        const token = jwt.sign(
            { email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRY }
        );
        
        // Clear any existing cookies
        res.clearCookie('token', { path: '/' });
        res.clearCookie('session', { path: '/' });
        
        // Set new cookie (optional - for browser)
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000,
            sameSite: 'lax',
            path: '/'
        });
        
        res.json({
            success: true,
            token: token,
            user: {
                email: user.email,
                role: user.role
            },
            expiresIn: '24h'
        });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Logout
app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('token', { path: '/' });
    res.clearCookie('session', { path: '/' });
    res.clearCookie('connect.sid', { path: '/' });
    res.json({ success: true, message: 'Logged out successfully' });
});

// Verify token
app.get('/api/auth/verify', authenticate, (req, res) => {
    res.json({ 
        success: true, 
        user: req.user,
        timestamp: new Date().toISOString()
    });
});

// =====================================================
// TRUTH ENGINE ROUTES
// =====================================================

// Fact Check
app.post('/api/truth/check', authenticate, (req, res) => {
    try {
        const { text } = req.body;
        
        if (!text || text.trim().length < 3) {
            return res.status(400).json({ 
                error: 'Text is required and must be at least 3 characters' 
            });
        }
        
        // Mock AI verification
        const keywords = {
            factual: ['confirmed', 'verified', 'data shows', 'research indicates'],
            false: ['fake', 'hoax', 'misinformation', 'debunked'],
            opinion: ['believe', 'think', 'suggest', 'may', 'could']
        };
        
        let verdict = 'VERIFIED_TRUE';
        let confidence = 98.5;
        let sources = ['Trusted Knowledge Base', 'Verified Data Sources'];
        
        const textLower = text.toLowerCase();
        
        // Simple classification
        for (const word of keywords.false) {
            if (textLower.includes(word)) {
                verdict = 'VERIFIED_FALSE';
                confidence = 85.2;
                sources = ['Warning: Potential misinformation detected'];
                break;
            }
        }
        
        if (verdict === 'VERIFIED_TRUE') {
            for (const word of keywords.opinion) {
                if (textLower.includes(word)) {
                    verdict = 'OPINION_DETECTED';
                    confidence = 92.7;
                    sources = ['Opinion/Editorial content'];
                    break;
                }
            }
        }
        
        const result = {
            success: true,
            verdict: verdict,
            confidence: confidence,
            sources: sources,
            text: text,
            timestamp: new Date().toISOString()
        };
        
        res.json(result);
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// =====================================================
// CENTPAY ROUTES - Payments
// =====================================================

// Charge payment
app.post('/api/pay/charge', authenticate, (req, res) => {
    try {
        const { amount, currency = 'USD' } = req.body;
        
        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Valid amount required' });
        }
        
        const exchangeRates = { USD: 1, TZS: 2615.50, KES: 132.20 };
        const rate = exchangeRates[currency.toUpperCase()] || 1;
        const amountUSD = amount / rate;
        const cashback = amountUSD * 0.05;
        
        const result = {
            success: true,
            transaction_id: 'txn_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
            amount: amount,
            currency: currency.toUpperCase(),
            amount_usd: amountUSD.toFixed(4),
            cashback: cashback.toFixed(4),
            cashback_currency: currency.toUpperCase(),
            cashback_amount: (cashback * rate).toFixed(2),
            status: 'completed',
            timestamp: new Date().toISOString()
        };
        
        res.json(result);
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get balance
app.get('/api/pay/balance', authenticate, (req, res) => {
    try {
        const balance = {
            success: true,
            user_id: req.user?.email || 'admin@ailifesolution.com',
            balance_usd: 247.50,
            balance_tzs: (247.50 * 2615.50).toFixed(2),
            balance_kes: (247.50 * 132.20).toFixed(2),
            currency: 'USD',
            updated_at: new Date().toISOString()
        };
        
        res.json(balance);
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// =====================================================
// AI SHRINKER ROUTES
// =====================================================

// Start compression
app.post('/api/shrink/compress', authenticate, (req, res) => {
    try {
        const { model_name, precision = 'int4' } = req.body;
        
        if (!model_name) {
            return res.status(400).json({ error: 'Model name required' });
        }
        
        const models = {
            'Llama-3-70B': { original_gb: 140, compressed_gb: 14 },
            'Mistral-7B': { original_gb: 14, compressed_gb: 1.4 },
            'CodeLlama-34B': { original_gb: 68, compressed_gb: 6.8 },
            'Falcon-40B': { original_gb: 80, compressed_gb: 8 }
        };
        
        const model = models[model_name] || { original_gb: 50, compressed_gb: 5 };
        const compression_ratio = (model.original_gb / model.compressed_gb).toFixed(1);
        
        const result = {
            success: true,
            job_id: 'job_' + Date.now() + '_' + Math.random().toString(36).substr(2, 8),
            model_name: model_name,
            original_size_gb: model.original_gb,
            compressed_size_gb: model.compressed_gb,
            compression_ratio: compression_ratio + 'x',
            precision: precision,
            status: 'processing',
            estimated_time: '~15 minutes',
            download_url: 'https://sovereign-grid-ailife-a33180041607.herokuapp.com/models/' + model_name.replace(/[^a-zA-Z0-9]/g, '_') + '.gguf',
            timestamp: new Date().toISOString()
        };
        
        res.json(result);
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get job status
app.get('/api/shrink/status/:job_id', authenticate, (req, res) => {
    try {
        const { job_id } = req.params;
        
        const result = {
            success: true,
            job_id: job_id,
            status: 'completed',
            progress: 100,
            message: 'Compression completed successfully',
            timestamp: new Date().toISOString()
        };
        
        res.json(result);
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// =====================================================
// ADMIN ROUTES
// =====================================================

// Dashboard Stats
app.get('/api/admin/stats', authenticate, (req, res) => {
    try {
        const stats = {
            success: true,
            total_users: 15,
            active_users: 10,
            total_revenue: 0,
            total_ai_jobs: 0,
            total_api_calls: 0,
            uptime_seconds: process.uptime(),
            version: '31.0',
            environment: process.env.NODE_ENV || 'development',
            timestamp: new Date().toISOString()
        };
        
        res.json(stats);
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Users List
app.get('/api/admin/users', authenticate, (req, res) => {
    try {
        const users = [
            { id: 1, email: 'admin@ailifesolution.com', name: 'Admin User', role: 'super_admin', status: 'active', created_at: '2026-06-29T00:00:00Z' },
            { id: 2, email: 'admin@sovereigngrid.com', name: 'System Admin', role: 'super_admin', status: 'active', created_at: '2026-06-29T00:00:00Z' },
            { id: 3, email: 'tech@sovereigngrid.com', name: 'Tech Admin', role: 'admin', status: 'active', created_at: '2026-06-29T00:00:00Z' },
            { id: 4, email: 'finance@sovereigngrid.com', name: 'Finance Admin', role: 'admin', status: 'active', created_at: '2026-06-29T00:00:00Z' },
            { id: 5, email: 'investor.lead@sovereigngrid.com', name: 'Lead Investor', role: 'investor', status: 'active', created_at: '2026-06-29T00:00:00Z' },
            { id: 6, email: 'investor.partner@sovereigngrid.com', name: 'Partner Investor', role: 'investor', status: 'active', created_at: '2026-06-29T00:00:00Z' },
            { id: 7, email: 'nmb.bank@sovereigngrid.com', name: 'NMB Bank', role: 'enterprise', status: 'pending', created_at: '2026-06-29T00:00:00Z' },
            { id: 8, email: 'vodacom.telecom@sovereigngrid.com', name: 'Vodacom', role: 'enterprise', status: 'pending', created_at: '2026-06-29T00:00:00Z' },
            { id: 9, email: 'azam.media@sovereigngrid.com', name: 'Azam Media', role: 'business', status: 'active', created_at: '2026-06-29T00:00:00Z' },
            { id: 10, email: 'flutterwave.fintech@sovereigngrid.com', name: 'Flutterwave', role: 'enterprise', status: 'active', created_at: '2026-06-29T00:00:00Z' }
        ];
        
        res.json({ success: true, users: users, total: users.length });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Payments History
app.get('/api/admin/payments', authenticate, (req, res) => {
    try {
        const payments = [
            { id: 1, user: 'admin@ailifesolution.com', amount: 49.00, currency: 'USD', status: 'completed', date: '2026-06-29T00:00:00Z' },
            { id: 2, user: 'investor.lead@sovereigngrid.com', amount: 499.00, currency: 'USD', status: 'pending', date: '2026-06-29T00:00:00Z' }
        ];
        
        res.json({ success: true, payments: payments, total: payments.length });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API Keys List
app.get('/api/admin/apikeys', authenticate, (req, res) => {
    try {
        const keys = [
            { id: 1, name: 'Production Key', key: 'sk_sov_live_8coHKYs478Md3iPe6WTBR9GOeBn1N97T2SoQJzNS', status: 'active', created: '2026-06-29T00:00:00Z' },
            { id: 2, name: 'Development Key', key: 'sk_sov_dev_7x8k9m2n4p6q8r10s12t14u16', status: 'active', created: '2026-06-29T00:00:00Z' },
            { id: 3, name: 'Partner Key', key: 'sk_sov_dev_5x6y7z8a9b10c11d12e13f14g', status: 'active', created: '2026-06-29T00:00:00Z' }
        ];
        
        res.json({ success: true, keys: keys });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Audit Logs
app.get('/api/admin/audit', authenticate, (req, res) => {
    try {
        const logs = [
            { id: 1, user: 'admin@ailifesolution.com', action: 'Login', timestamp: new Date().toISOString(), details: 'Successful login' },
            { id: 2, user: 'admin@ailifesolution.com', action: 'API Call', timestamp: new Date().toISOString(), details: 'GET /api/truth/check' },
            { id: 3, user: 'tech@sovereigngrid.com', action: 'Login', timestamp: new Date().toISOString(), details: 'Successful login' }
        ];
        
        res.json({ success: true, logs: logs });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Settings
app.get('/api/admin/settings', authenticate, (req, res) => {
    try {
        const settings = {
            app_name: 'Sovereign Grid',
            version: '31.0',
            environment: 'production',
            maintenance_mode: false,
            api_rate_limit: 100,
            payment_gateway: 'PayPal',
            currency: 'USD',
            timezone: 'Africa/Dar_es_Salaam'
        };
        
        res.json({ success: true, settings: settings });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// =====================================================
// ADMIN DASHBOARD UI
// =====================================================

// Admin dashboard (main)
app.get('/admin', (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.sendFile(path.join(__dirname, 'public/admin/index.html'));
});

// Admin sub-routes
app.get('/admin/*', (req, res) => {
    const filePath = path.join(__dirname, 'public/admin', req.params[0]);
    const fs = require('fs');
    if (fs.existsSync(filePath)) {
        return res.sendFile(filePath);
    }
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.sendFile(path.join(__dirname, 'public/admin/index.html'));
});

// =====================================================
// API DOCS
// =====================================================

app.get('/api/docs', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/api-docs.html'));
});

// =====================================================
// ERROR HANDLING
// =====================================================

app.use((req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString()
    });
});

app.use((err, req, res, next) => {
    console.error('❌ Error:', err);
    res.status(500).json({
        error: err.message || 'Internal server error',
        timestamp: new Date().toISOString()
    });
});

// =====================================================
// START SERVER
// =====================================================

const server = app.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('========================================');
    console.log('🚀 SOVEREIGN GRID v31.0 - FIXED VERSION');
    console.log('========================================');
    console.log(`📍 Server running on: http://localhost:${PORT}`);
    console.log(`🌐 URL: https://sovereign-grid-ailife-a33180041607.herokuapp.com`);
    console.log(`🔐 Admin Login: http://localhost:${PORT}/admin/login`);
    console.log(`👑 Admin Dashboard: http://localhost:${PORT}/admin`);
    console.log(`📖 API Docs: http://localhost:${PORT}/api/docs`);
    console.log(`🩺 Health: http://localhost:${PORT}/health`);
    console.log('========================================');
    console.log('👤 LOGIN CREDENTIALS:');
    console.log('   Email: admin@ailifesolution.com');
    console.log('   Password: admin123');
    console.log('========================================');
    console.log('📋 OTHER ACCOUNTS:');
    console.log('   admin@sovereigngrid.com / Sovereign@Admin2026!');
    console.log('   tech@sovereigngrid.com / Tech@Sovereign2026!');
    console.log('   investor.lead@sovereigngrid.com / Investor@Lead2026!');
    console.log('   nmb.bank@sovereigngrid.com / NMB@Bank2026!');
    console.log('========================================');
    console.log('🔧 TO FORCE LOGOUT:');
    console.log('   Visit: /admin/force-logout');
    console.log('========================================');
    console.log('⏰ Server started at:', new Date().toISOString());
    console.log('========================================');
});

module.exports = app;
