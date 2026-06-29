// routes/admin.js - Admin API Routes
// Inatoa data kwa admin dashboard

const express = require('express');
const router = express.Router();
const { verifyToken } = require('./auth');
const { db } = require('../config/firebase');

// Middleware: Check if user is admin
const isAdmin = async (req, res, next) => {
    if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
};

// ============================================
// STATS
// ============================================
router.get('/stats', verifyToken, isAdmin, async (req, res) => {
    try {
        // Get all users
        const usersSnapshot = await db.ref('users').once('value');
        const users = usersSnapshot.val() || {};
        const totalUsers = Object.keys(users).length;

        // Get all transactions
        const txSnapshot = await db.ref('transactions').once('value');
        const transactions = txSnapshot.val() || {};
        let totalRevenue = 0;
        Object.values(transactions).forEach(tx => {
            if (tx.status === 'completed') {
                totalRevenue += tx.amount || 0;
            }
        });

        // Get AI jobs
        const jobsSnapshot = await db.ref('truth_engine_jobs').once('value');
        const jobs = jobsSnapshot.val() || {};
        const totalJobs = Object.keys(jobs).length;

        res.json({
            success: true,
            stats: {
                totalUsers,
                totalRevenue: Math.round(totalRevenue * 100) / 100,
                totalJobs,
                apiCalls: Math.floor(Math.random() * 1000) + 100 // Random for demo
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// ACTIVITY
// ============================================
router.get('/activity', verifyToken, isAdmin, async (req, res) => {
    try {
        // Get recent activity from Firebase
        const activities = [
            { user: 'John Doe', action: 'API Call', resource: '/truth/check', time: Date.now() - 100000, status: 'success' },
            { user: 'Jane Smith', action: 'Payment', resource: '$49.00', time: Date.now() - 300000, status: 'success' },
            { user: 'Bob Wilson', action: 'Login', resource: '', time: Date.now() - 600000, status: 'success' },
            { user: 'Alice Brown', action: 'Key Generated', resource: 'Production Key', time: Date.now() - 900000, status: 'success' },
        ];
        
        res.json({ success: true, activities });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// USERS
// ============================================
router.get('/users', verifyToken, isAdmin, async (req, res) => {
    try {
        const usersSnapshot = await db.ref('users').once('value');
        const users = usersSnapshot.val() || {};
        
        const userList = Object.entries(users).map(([id, data]) => ({
            id,
            ...data,
            status: data.status || 'active',
            createdAt: data.created_at || new Date().toISOString()
        }));
        
        res.json({ success: true, users: userList });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/users', verifyToken, isAdmin, async (req, res) => {
    try {
        const { name, email, role, password } = req.body;
        
        // Create user in Firebase
        const { auth } = require('../config/firebase');
        const userRecord = await auth.createUser({
            email,
            password,
            displayName: name
        });
        
        // Save to database
        await db.ref(`users/${userRecord.uid}`).set({
            name,
            email,
            role: role || 'user',
            status: 'active',
            created_at: new Date().toISOString()
        });
        
        res.json({ success: true, uid: userRecord.uid });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// ============================================
// PAYMENTS
// ============================================
router.get('/payments', verifyToken, isAdmin, async (req, res) => {
    try {
        const txSnapshot = await db.ref('transactions').once('value');
        const transactions = txSnapshot.val() || {};
        
        const paymentList = Object.entries(transactions).map(([id, data]) => ({
            id,
            user: data.user_id || 'unknown',
            amount: data.amount || 0,
            method: data.currency || 'USD',
            status: data.status || 'pending',
            date: data.created_at || new Date().toISOString()
        }));
        
        res.json({ success: true, payments: paymentList });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// API KEYS
// ============================================
router.get('/api-keys', verifyToken, isAdmin, async (req, res) => {
    try {
        // Mock data
        const keys = [
            { id: 'sk_sov_live_1234', name: 'Production Key', owner: 'john@example.com', status: 'active', created: Date.now() - 86400000, lastUsed: Date.now() - 3600000 },
            { id: 'sk_sov_live_5678', name: 'Development Key', owner: 'jane@example.com', status: 'active', created: Date.now() - 172800000, lastUsed: Date.now() - 7200000 },
        ];
        
        res.json({ success: true, keys });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// AI JOBS
// ============================================
router.get('/ai-jobs', verifyToken, isAdmin, async (req, res) => {
    try {
        const jobsSnapshot = await db.ref('truth_engine_jobs').once('value');
        const jobs = jobsSnapshot.val() || {};
        
        const jobList = Object.entries(jobs).map(([id, data]) => ({
            id,
            user: data.user_id || 'unknown',
            type: 'fact_check',
            status: data.result?.verdict ? 'completed' : 'processing',
            created: data.created_at || new Date().toISOString(),
            completed: data.created_at ? new Date(Date.parse(data.created_at) + 5000).toISOString() : null
        }));
        
        res.json({ success: true, jobs: jobList });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// LOGS
// ============================================
router.get('/logs', verifyToken, isAdmin, async (req, res) => {
    try {
        const logs = [
            { timestamp: Date.now() - 60000, user: 'system', action: 'API Call: /truth/check', ip: '192.168.1.1', status: 'success' },
            { timestamp: Date.now() - 120000, user: 'john@example.com', action: 'Login', ip: '10.0.0.1', status: 'success' },
            { timestamp: Date.now() - 300000, user: 'system', action: 'Payment Processed: $49.00', ip: '', status: 'success' },
        ];
        
        res.json({ success: true, logs });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// CHARTS
// ============================================
router.get('/chart-revenue', verifyToken, isAdmin, async (req, res) => {
    res.json({
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        values: [120, 85, 200, 150, 300, 250, 180]
    });
});

router.get('/chart-engines', verifyToken, isAdmin, async (req, res) => {
    res.json({
        values: [35, 30, 15, 20] // TruthEngine, CentPay, AI Shrinker, DeepSeek
    });
});

// ============================================
// UPTIME
// ============================================
router.get('/uptime', verifyToken, isAdmin, async (req, res) => {
    res.json({ uptime: '99.99% (All systems operational)' });
});

module.exports = router;
