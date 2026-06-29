// server.js - Sovereign Grid v31.0 (FULLY FIXED + REGISTER)
// All buttons working, registration working, NO AUTO LOGIN!

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
// USERS DATABASE (In-memory - in production use real DB)
// =====================================================

const validUsers = [
    { email: 'admin@ailifesolution.com', password: 'admin123', role: 'super_admin', name: 'Admin User' },
    { email: 'admin@sovereigngrid.com', password: 'Sovereign@Admin2026!', role: 'super_admin', name: 'System Admin' },
    { email: 'tech@sovereigngrid.com', password: 'Tech@Sovereign2026!', role: 'admin', name: 'Tech Admin' },
    { email: 'finance@sovereigngrid.com', password: 'Finance@Sovereign2026!', role: 'admin', name: 'Finance Admin' },
    { email: 'investor.lead@sovereigngrid.com', password: 'Investor@Lead2026!', role: 'investor', name: 'Lead Investor' },
    { email: 'investor.partner@sovereigngrid.com', password: 'Investor@Partner2026!', role: 'investor', name: 'Partner Investor' },
    { email: 'nmb.bank@sovereigngrid.com', password: 'NMB@Bank2026!', role: 'enterprise', name: 'NMB Bank' },
    { email: 'vodacom.telecom@sovereigngrid.com', password: 'Vodacom@Telecom2026!', role: 'enterprise', name: 'Vodacom' },
    { email: 'azam.media@sovereigngrid.com', password: 'Azam@Media2026!', role: 'business', name: 'Azam Media' },
    { email: 'flutterwave.fintech@sovereigngrid.com', password: 'Flutterwave@Fintech2026!', role: 'enterprise', name: 'Flutterwave' },
    { email: 'dev.senior@sovereigngrid.com', password: 'Dev@Senior2026!', role: 'developer', name: 'Senior Dev' }
];

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
    if (req.path.includes('/admin/login') || req.path === '/admin/' || req.path === '/admin/force-logout' || req.path === '/register.html') {
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
            register: '/api/auth/register',
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
// REGISTER - CREATE NEW USER
// =====================================================

app.post('/api/auth/register', (req, res) => {
    try {
        const { email, password, name, role = 'admin' } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }
        
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }
        
        // Check if user already exists
        const existingUser = validUsers.find(u => u.email === email);
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }
        
        // Add new user
        const newUser = {
            email: email,
            password: password,
            role: role || 'admin',
            name: name || email.split('@')[0]
        };
        
        validUsers.push(newUser);
        
        // Generate token
        const token = jwt.sign(
            { email: newUser.email, role: newUser.role },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRY }
        );
        
        console.log(`✅ New user registered: ${email} (${role})`);
        console.log(`📊 Total users: ${validUsers.length}`);
        
        res.json({
            success: true,
            message: 'User created successfully',
            token: token,
            user: {
                email: newUser.email,
                role: newUser.role,
                name: newUser.name
            }
        });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// =====================================================
// LIST ALL USERS (for testing)
// =====================================================

app.get('/api/auth/users', (req, res) => {
    // Remove passwords from response
    const safeUsers = validUsers.map(u => ({
        email: u.email,
        role: u.role,
        name: u.name || u.email.split('@')[0]
    }));
    res.json({ 
        success: true, 
        users: safeUsers,
        total: safeUsers.length
    });
});

// =====================================================
// DELETE USER (for testing)
// =====================================================

app.delete('/api/auth/users/:email', (req, res) => {
    const email = req.params.email;
    const index = validUsers.findIndex(u => u.email === email);
    
    if (index === -1) {
        return res.status(404).json({ error: 'User not found' });
    }
    
    validUsers.splice(index, 1);
    res.json({ success: true, message: 'User deleted' });
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
                    localStorage.clear();
                    sessionStorage.clear();
                    document.cookie.split(";").forEach(function(c) {
                        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
                        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/;domain=" + window.location.hostname);
                    });
                    window.location.href = '/admin/login?cleared=' + Date.now();
                }
                setTimeout(clearAllAndRedirect, 2000);
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
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
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
// AUTH ROUTES - LOGIN
// =====================================================

app.post('/api/auth/login', (req, res) => {
    try {
        const { email, password } = req.body;
        
        const user = validUsers.find(u => u.email === email && u.password === password);
        
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        
        const token = jwt.sign(
            { email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRY }
        );
        
        res.clearCookie('token', { path: '/' });
        res.clearCookie('session', { path: '/' });
        
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
                role: user.role,
                name: user.name || user.email.split('@')[0]
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

app.post('/api/truth/check', authenticate, (req, res) => {
    try {
        const { text } = req.body;
        
        if (!text || text.trim().length < 3) {
            return res.status(400).json({ 
                error: 'Text is required and must be at least 3 characters' 
            });
        }
        
        let verdict = 'VERIFIED_TRUE';
        let confidence = 98.5;
        let sources = ['Trusted Knowledge Base'];
        
        const textLower = text.toLowerCase();
        const falseKeywords = ['fake', 'hoax', 'misinformation', 'debunked'];
        const opinionKeywords = ['believe', 'think', 'suggest', 'may', 'could'];
        
        for (const word of falseKeywords) {
            if (textLower.includes(word)) {
                verdict = 'VERIFIED_FALSE';
                confidence = 85.2;
                sources = ['Warning: Potential misinformation detected'];
                break;
            }
        }
        
        if (verdict === 'VERIFIED_TRUE') {
            for (const word of opinionKeywords) {
                if (textLower.includes(word)) {
                    verdict = 'OPINION_DETECTED';
                    confidence = 92.7;
                    sources = ['Opinion/Editorial content'];
                    break;
                }
            }
        }
        
        res.json({
            success: true,
            verdict: verdict,
            confidence: confidence,
            sources: sources,
            text: text,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// =====================================================
// CENTPAY ROUTES
// =====================================================

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
        
        res.json({
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
        });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/pay/balance', authenticate, (req, res) => {
    try {
        res.json({
            success: true,
            user_id: req.user?.email || 'admin@ailifesolution.com',
            balance_usd: 247.50,
            balance_tzs: (247.50 * 2615.50).toFixed(2),
            balance_kes: (247.50 * 132.20).toFixed(2),
            currency: 'USD',
            updated_at: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// =====================================================
// AI SHRINKER ROUTES
// =====================================================

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
        
        res.json({
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
        });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// =====================================================
// ADMIN ROUTES
// =====================================================

app.get('/api/admin/stats', authenticate, (req, res) => {
    try {
        res.json({
            success: true,
            total_users: validUsers.length,
            active_users: validUsers.length,
            total_revenue: 0,
            total_ai_jobs: 0,
            total_api_calls: 0,
            uptime_seconds: process.uptime(),
            version: '31.0',
            environment: process.env.NODE_ENV || 'development',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/admin/users', authenticate, (req, res) => {
    try {
        const users = validUsers.map((u, i) => ({
            id: i + 1,
            email: u.email,
            name: u.name || u.email.split('@')[0],
            role: u.role,
            status: 'active',
            created_at: new Date().toISOString()
        }));
        res.json({ success: true, users: users, total: users.length });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/admin/payments', authenticate, (req, res) => {
    try {
        res.json({ 
            success: true, 
            payments: [
                { id: 1, user: 'admin@ailifesolution.com', amount: 49.00, currency: 'USD', status: 'completed', date: new Date().toISOString() }
            ],
            total: 1
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/admin/apikeys', authenticate, (req, res) => {
    try {
        res.json({ 
            success: true, 
            keys: [
                { id: 1, name: 'Production Key', key: 'sk_sov_live_8coHKYs478Md3iPe6WTBR9GOeBn1N97T2SoQJzNS', status: 'active', created: new Date().toISOString() }
            ]
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/admin/audit', authenticate, (req, res) => {
    try {
        res.json({ 
            success: true, 
            logs: [
                { id: 1, user: 'admin@ailifesolution.com', action: 'Login', timestamp: new Date().toISOString(), details: 'Successful login' }
            ]
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/admin/settings', authenticate, (req, res) => {
    try {
        res.json({
            success: true,
            settings: {
                app_name: 'Sovereign Grid',
                version: '31.0',
                environment: 'production',
                maintenance_mode: false,
                api_rate_limit: 100,
                payment_gateway: 'PayPal',
                currency: 'USD',
                timezone: 'Africa/Dar_es_Salaam'
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// =====================================================
// ADMIN DASHBOARD UI
// =====================================================

app.get('/admin', (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.sendFile(path.join(__dirname, 'public/admin/index.html'));
});

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
// REGISTER PAGE
// =====================================================

app.get('/register', (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.sendFile(path.join(__dirname, 'public/register.html'));
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
    console.log('🚀 SOVEREIGN GRID v31.0 - WITH REGISTER!');
    console.log('========================================');
    console.log(`📍 Server running on: http://localhost:${PORT}`);
    console.log(`🌐 URL: https://sovereign-grid-ailife-a33180041607.herokuapp.com`);
    console.log(`🔐 Login: /admin/login`);
    console.log(`📝 Register: /register`);
    console.log(`👑 Admin: /admin`);
    console.log(`📖 API Docs: /api/docs`);
    console.log('========================================');
    console.log('📝 TO CREATE NEW ACCOUNT:');
    console.log('   Visit: /register');
    console.log('   Or use: curl -X POST /api/auth/register');
    console.log('========================================');
    console.log('👤 EXISTING USERS:');
    validUsers.forEach(u => {
        console.log(`   ${u.email} / ${u.password}`);
    });
    console.log('========================================');
    console.log('⏰ Server started at:', new Date().toISOString());
    console.log('========================================');
});

module.exports = app;
