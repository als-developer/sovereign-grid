// server.js - SOVEREIGN GRID KAMILI (HTML ZOTE ZINAFANYA KAZI!)
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
// SERVE ALL HTML PAGES - SOLUTION!
// =====================================================

// List of all HTML pages to serve
const htmlPages = [
    { route: '/', file: 'index.html' },
    { route: '/index', file: 'index.html' },
    { route: '/dashboard', file: 'dashboard.html' },
    { route: '/api-docs', file: 'api_docs.html' },
    { route: '/login', file: 'login.html' },
    { route: '/register', file: 'register.html' },
    { route: '/pricing', file: 'pricing.html' },
    { route: '/privacy', file: 'privacy_policy.html' },
    { route: '/terms', file: 'terms_of_service.html' },
    { route: '/billing', file: 'billing_portal.html' },
    { route: '/api-keys', file: 'api_keys.html' },
    { route: '/analytics', file: 'analytics.html' },
    { route: '/support', file: 'support.html' },
    { route: '/status', file: 'status.html' },
    { route: '/webhooks', file: 'webhooks.html' },
    { route: '/logs', file: 'logs.html' },
    { route: '/models', file: 'models.html' },
    { route: '/compress', file: 'compress.html' },
    { route: '/payments', file: 'payments.html' },
    { route: '/wallets', file: 'wallets.html' },
    { route: '/transactions', file: 'transactions.html' },
    { route: '/referrals', file: 'referrals.html' },
    { route: '/settings', file: 'settings.html' },
    { route: '/security', file: 'security.html' },
    { route: '/notifications', file: 'notifications.html' },
    { route: '/integrations', file: 'integrations.html' },
    { route: '/sandbox', file: 'sandbox.html' },
    { route: '/onboarding', file: 'onboarding.html' },
    { route: '/forgot-password', file: 'forgot_password.html' },
    { route: '/team', file: 'team_members.html' },
    { route: '/paypal-checkout', file: 'paypal_checkout.html' }
];

// Register all HTML pages
htmlPages.forEach(({ route, file }) => {
    app.get(route, (req, res) => {
        const filePath = path.join(__dirname, 'public', file);
        if (fs.existsSync(filePath)) {
            res.sendFile(filePath);
        } else {
            res.status(404).send(`<h1>Page not found</h1><p>File: ${file}</p><p><a href="/">Go Home</a></p>`);
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
    res.sendFile(path.join(__dirname, 'public/api_docs.html'));
});

// =====================================================
// AUTH ROUTES
// =====================================================

// Register API
app.post('/api/auth/register', (req, res) => {
    try {
        const { email, password, name, role = 'admin' } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }
        
        const existingUser = validUsers.find(u => u.email === email);
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }
        
        const newUser = { email, password, role, name: name || email.split('@')[0] };
        validUsers.push(newUser);
        
        const token = jwt.sign(
            { email: newUser.email, role: newUser.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        res.json({
            success: true,
            message: 'User created successfully',
            token: token,
            user: { email: newUser.email, role: newUser.role, name: newUser.name }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Login API
app.post('/api/auth/login', (req, res) => {
    try {
        const { email, password } = req.body;
        
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
        
        res.json({
            success: true,
            token: token,
            user: { email: user.email, role: user.role, name: user.name },
            expiresIn: '24h'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Logout
app.post('/api/auth/logout', (req, res) => {
    res.json({ success: true, message: 'Logged out successfully' });
});

// Verify token
app.get('/api/auth/verify', authenticate, (req, res) => {
    res.json({ success: true, user: req.user });
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
        
        if (textLower.includes('fake') || textLower.includes('hoax') || textLower.includes('misinformation')) {
            verdict = 'VERIFIED_FALSE';
            confidence = 85.2;
        } else if (textLower.includes('believe') || textLower.includes('think') || textLower.includes('suggest')) {
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
            transaction_id: 'txn_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
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
        user_id: req.user?.email || 'admin@ailifesolution.com',
        balance_usd: 247.50,
        balance_tzs: (247.50 * 2615.50).toFixed(2),
        currency: 'USD'
    });
});

// =====================================================
// AI SHRINKER
// =====================================================
app.post('/api/shrink/compress', authenticate, (req, res) => {
    try {
        const { model_name, precision = 'int4' } = req.body;
        if (!model_name) {
            return res.status(400).json({ error: 'Model name required' });
        }
        
        const models = {
            'Llama-3-70B': { original_gb: 140, compressed_gb: 14 },
            'Mistral-7B': { original_gb: 14, compressed_gb: 1.4 }
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
            window.location.href = '/login?cleared=' + Date.now();
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
        method: req.method
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
    console.log('🚀 SOVEREIGN GRID v31.0 - HTML ZOTE ZINAFANYA KAZI!');
    console.log('========================================');
    console.log(`📍 Port: ${PORT}`);
    console.log(`🌐 URL: https://sovereign-grid-ailife-a33180041607.herokuapp.com`);
    console.log('========================================');
    console.log('📄 HTML PAGES AVAILABLE:');
    htmlPages.forEach(({ route, file }) => {
        console.log(`   ${route} → ${file}`);
    });
    console.log('========================================');
    console.log('👤 LOGIN: admin@ailifesolution.com / admin123');
    console.log('========================================');
});

module.exports = app;
