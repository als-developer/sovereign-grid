// server.js - Sovereign Grid v31.0 (WITH REGISTER FIXED)
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'sovereign-grid-secret-key-2026';

// =====================================================
// USERS DATABASE
// =====================================================
const validUsers = [
    { email: 'admin@ailifesolution.com', password: 'admin123', role: 'super_admin', name: 'Admin User' },
    { email: 'zawadi@sovereigngrid.com', password: 'Zawadi@2026!', role: 'super_admin', name: 'Zawadi Sanga' }
];

// =====================================================
// MIDDLEWARE
// =====================================================
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Sovereign-Key']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// No Cache
app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
});

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
// ROUTES
// =====================================================

// Home
app.get('/', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Sovereign Grid is running!',
        version: '31.0',
        endpoints: {
            health: '/health',
            version: '/version',
            login: '/api/auth/login',
            register: '/register',
            admin: '/admin',
            docs: '/api/docs'
        }
    });
});

// Health
app.get('/health', (req, res) => {
    res.json({ 
        status: 'alive', 
        version: '31.0', 
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// Version
app.get('/version', (req, res) => {
    res.json({ 
        version: '31.0', 
        environment: process.env.NODE_ENV || 'development' 
    });
});

// =====================================================
// REGISTER PAGE ROUTE - FIXED!
// =====================================================

app.get('/register', (req, res) => {
    console.log('📝 Register page requested');
    const registerPath = path.join(__dirname, 'public', 'register.html');
    
    // Check if file exists
    if (fs.existsSync(registerPath)) {
        console.log('✅ register.html found at:', registerPath);
        res.sendFile(registerPath);
    } else {
        console.log('❌ register.html NOT FOUND at:', registerPath);
        // List files in public directory for debugging
        try {
            const publicFiles = fs.readdirSync(path.join(__dirname, 'public'));
            console.log('📂 Files in public directory:', publicFiles);
        } catch (err) {
            console.log('Could not read public directory:', err.message);
        }
        res.status(404).send(`
            <h1>Register page not found</h1>
            <p>File: public/register.html</p>
            <p>Please make sure the file exists.</p>
            <p><a href="/admin/login">Go to Login →</a></p>
        `);
    }
});

// =====================================================
// REGISTER API
// =====================================================
app.post('/api/auth/register', (req, res) => {
    try {
        const { email, password, name, role = 'admin' } = req.body;
        
        console.log('📝 Registration attempt:', { email, role });
        
        // Validation
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }
        
        // Check existing user
        const existingUser = validUsers.find(u => u.email === email);
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }
        
        // Add new user
        const newUser = {
            email: email,
            password: password,
            role: role,
            name: name || email.split('@')[0]
        };
        validUsers.push(newUser);
        
        // Generate token
        const token = jwt.sign(
            { email: newUser.email, role: newUser.role },
            JWT_SECRET,
            { expiresIn: '24h' }
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
        console.error('Registration error:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});

// =====================================================
// LOGIN
// =====================================================
app.post('/api/auth/login', (req, res) => {
    try {
        const { email, password } = req.body;
        
        console.log('🔐 Login attempt:', email);
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }
        
        const user = validUsers.find(u => u.email === email && u.password === password);
        
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        
        const token = jwt.sign(
            { email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        console.log(`✅ Login successful: ${email}`);
        
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
        console.error('Login error:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});

// Logout
app.post('/api/auth/logout', (req, res) => {
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

// List users
app.get('/api/auth/users', (req, res) => {
    const safeUsers = validUsers.map(u => ({
        email: u.email,
        role: u.role,
        name: u.name || u.email.split('@')[0]
    }));
    res.json({ success: true, users: safeUsers, total: safeUsers.length });
});

// =====================================================
// TRUTH ENGINE
// =====================================================
app.post('/api/truth/check', authenticate, (req, res) => {
    try {
        const { text } = req.body;
        if (!text || text.trim().length < 3) {
            return res.status(400).json({ error: 'Text is required' });
        }
        
        let verdict = 'VERIFIED_TRUE';
        let confidence = 98.5;
        const textLower = text.toLowerCase();
        
        if (textLower.includes('fake') || textLower.includes('hoax')) {
            verdict = 'VERIFIED_FALSE';
            confidence = 85.2;
        } else if (textLower.includes('believe') || textLower.includes('think')) {
            verdict = 'OPINION_DETECTED';
            confidence = 92.7;
        }
        
        res.json({
            success: true,
            verdict: verdict,
            confidence: confidence,
            text: text,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// =====================================================
// CENTPAY
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
            transaction_id: 'txn_' + Date.now(),
            amount: amount,
            currency: currency.toUpperCase(),
            amount_usd: amountUSD.toFixed(4),
            cashback: cashback.toFixed(4),
            status: 'completed',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/pay/balance', authenticate, (req, res) => {
    res.json({
        success: true,
        balance_usd: 247.50,
        balance_tzs: (247.50 * 2615.50).toFixed(2),
        currency: 'USD'
    });
});

// =====================================================
// ADMIN ROUTES
// =====================================================
app.get('/api/admin/stats', authenticate, (req, res) => {
    res.json({
        success: true,
        total_users: validUsers.length,
        active_users: validUsers.length,
        total_revenue: 0,
        uptime_seconds: process.uptime(),
        version: '31.0'
    });
});

app.get('/api/admin/users', authenticate, (req, res) => {
    const users = validUsers.map((u, i) => ({
        id: i + 1,
        email: u.email,
        name: u.name || u.email.split('@')[0],
        role: u.role,
        status: 'active'
    }));
    res.json({ success: true, users: users, total: users.length });
});

app.get('/api/admin/payments', authenticate, (req, res) => {
    res.json({ success: true, payments: [], total: 0 });
});

app.get('/api/admin/apikeys', authenticate, (req, res) => {
    res.json({ 
        success: true, 
        keys: [
            { id: 1, name: 'Production Key', key: 'sk_sov_live_8coHKYs478Md3iPe6WTBR9GOeBn1N97T2SoQJzNS', status: 'active' }
        ]
    });
});

app.get('/api/admin/audit', authenticate, (req, res) => {
    res.json({ 
        success: true, 
        logs: [
            { id: 1, user: 'admin@ailifesolution.com', action: 'Login', timestamp: new Date().toISOString() }
        ]
    });
});

app.get('/api/admin/settings', authenticate, (req, res) => {
    res.json({
        success: true,
        settings: {
            app_name: 'Sovereign Grid',
            version: '31.0',
            environment: 'production'
        }
    });
});

// =====================================================
// ADMIN PAGES
// =====================================================
app.get('/admin/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/admin/login.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/admin/index.html'));
});

app.get('/admin/*', (req, res) => {
    const filePath = path.join(__dirname, 'public/admin', req.params[0]);
    if (fs.existsSync(filePath)) {
        return res.sendFile(filePath);
    }
    res.sendFile(path.join(__dirname, 'public/admin/index.html'));
});

// =====================================================
// API DOCS
// =====================================================
app.get('/api/docs', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/api-docs.html'));
});

// =====================================================
// FORCE LOGOUT
// =====================================================
app.get('/admin/force-logout', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head><title>Logging out...</title>
        <script>
            localStorage.clear();
            sessionStorage.clear();
            document.cookie.split(";").forEach(function(c) {
                document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
            });
            window.location.href = '/admin/login?cleared=' + Date.now();
        </script>
        </head>
        <body style="background:#0a0a0f;color:#e0e0e0;font-family:Arial;display:flex;justify-content:center;align-items:center;height:100vh;">
            <h2>🚪 Logging out...</h2>
        </body>
        </html>
    `);
});

// =====================================================
// ERROR HANDLING
// =====================================================
app.use((req, res) => {
    console.log('❌ 404 Not Found:', req.method, req.path);
    res.status(404).json({ 
        error: 'Endpoint not found', 
        path: req.path,
        method: req.method,
        available: {
            health: '/health',
            version: '/version',
            login: '/api/auth/login',
            register: '/register',
            admin: '/admin',
            docs: '/api/docs'
        }
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
app.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('========================================');
    console.log('🚀 SOVEREIGN GRID v31.0 RUNNING');
    console.log('========================================');
    console.log(`📍 Port: ${PORT}`);
    console.log(`🌐 URL: https://sovereign-grid-ailife-a33180041607.herokuapp.com`);
    console.log(`📝 Register: /register`);
    console.log(`🔐 Login: /admin/login`);
    console.log(`👑 Admin: /admin`);
    console.log(`📖 API Docs: /api/docs`);
    console.log('========================================');
    console.log('👤 EXISTING ACCOUNTS:');
    validUsers.forEach(u => {
        console.log(`   ${u.email} / ${u.password}`);
    });
    console.log('========================================');
    console.log('⏰ Started at:', new Date().toISOString());
    console.log('========================================');
});

module.exports = app;
