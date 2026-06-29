// routes/auth.js - Authentication Routes
// JWT + Firebase Authentication

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { auth, createUser, getUser } = require('../config/firebase');

const JWT_SECRET = process.env.JWT_SECRET || 'ailifesolution_super_secret_key_2026';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';

// Middleware: Verify JWT
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};

// Middleware: Verify Firebase Token
const verifyFirebaseToken = async (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    try {
        const decodedToken = await auth.verifyIdToken(token);
        req.firebaseUser = decodedToken;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid Firebase token' });
    }
};

// Register user
router.post('/register', async (req, res) => {
    try {
        const { email, password, name, company } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }

        // Create user in Firebase Auth
        const userRecord = await createUser(email, password);

        // Save user data to Firebase Database
        const { db } = require('../config/firebase');
        await db.ref(`users/${userRecord.uid}`).set({
            email,
            name: name || '',
            company: company || '',
            created_at: new Date().toISOString(),
            role: email === ADMIN_USERNAME ? 'admin' : 'user',
            status: 'active'
        });

        // Create JWT token
        const token = jwt.sign(
            { uid: userRecord.uid, email, role: email === ADMIN_USERNAME ? 'admin' : 'user' },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            token,
            user: {
                uid: userRecord.uid,
                email,
                name: name || '',
                role: email === ADMIN_USERNAME ? 'admin' : 'user'
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(400).json({ error: error.message });
    }
});

// Login user
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }

        // Check if user exists in Firebase Database
        const { db } = require('../config/firebase');
        const usersSnapshot = await db.ref('users').once('value');
        const users = usersSnapshot.val() || {};
        
        let foundUser = null;
        let foundUid = null;
        
        for (const [uid, data] of Object.entries(users)) {
            if (data.email === email) {
                foundUser = data;
                foundUid = uid;
                break;
            }
        }

        if (!foundUser) {
            // Try to create user if doesn't exist (for demo)
            if (email === 'admin@ailifesolution.com') {
                // Create admin user
                const { auth } = require('../config/firebase');
                let userRecord;
                try {
                    userRecord = await auth.getUserByEmail(email);
                } catch {
                    userRecord = await auth.createUser({
                        email,
                        password: password || 'admin123',
                        displayName: 'Admin'
                    });
                }
                foundUid = userRecord.uid;
                foundUser = { 
                    email, 
                    name: 'Admin', 
                    role: 'admin', 
                    status: 'active',
                    created_at: new Date().toISOString()
                };
                await db.ref(`users/${foundUid}`).set(foundUser);
            } else {
                return res.status(401).json({ error: 'Invalid credentials' });
            }
        }

        // Create JWT token
        const token = jwt.sign(
            { uid: foundUid, email, role: foundUser.role || 'user' },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            token,
            user: {
                uid: foundUid,
                email,
                name: foundUser.name || '',
                role: foundUser.role || 'user'
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(400).json({ error: error.message });
    }
});

// Verify token
router.get('/verify', verifyToken, async (req, res) => {
    try {
        const { db } = require('../config/firebase');
        const userData = await db.ref(`users/${req.user.uid}`).once('value');
        const user = userData.val() || {};
        
        res.json({
            success: true,
            user: {
                uid: req.user.uid,
                email: req.user.email,
                role: req.user.role,
                name: user.name || '',
                ...user
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get current user profile
router.get('/me', verifyToken, async (req, res) => {
    try {
        const { db } = require('../config/firebase');
        const userData = await db.ref(`users/${req.user.uid}`).once('value');
        
        res.json({
            success: true,
            user: {
                uid: req.user.uid,
                ...userData.val()
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update user profile
router.put('/me', verifyToken, async (req, res) => {
    try {
        const { name, company, phone } = req.body;
        const { db } = require('../config/firebase');
        
        await db.ref(`users/${req.user.uid}`).update({
            name: name || '',
            company: company || '',
            phone: phone || '',
            updated_at: new Date().toISOString()
        });

        res.json({
            success: true,
            message: 'Profile updated successfully'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all users (admin only)
router.get('/users', verifyToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const { db } = require('../config/firebase');
        const users = await db.ref('users').once('value');
        
        res.json({
            success: true,
            users: users.val()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Logout - client side only, but provide endpoint
router.post('/logout', (req, res) => {
    res.json({ success: true, message: 'Logged out successfully' });
});

module.exports = {
    router,
    verifyToken,
    verifyFirebaseToken
};
