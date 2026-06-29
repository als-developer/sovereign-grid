// config/firebase.js - Firebase Configuration
// Inatumia Firebase Realtime Database na Authentication

const admin = require('firebase-admin');
const path = require('path');

// Try to load service account
let serviceAccount = null;
try {
    serviceAccount = require('./serviceAccountKey.json');
} catch (e) {
    console.warn('⚠️ Service account key not found, using environment variables');
}

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
    if (serviceAccount) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            databaseURL: process.env.FIREBASE_URL || 'https://city-22282-default-rtdb.firebaseio.com'
        });
    } else {
        // Use environment variables for Firebase
        admin.initializeApp({
            credential: admin.credential.applicationDefault(),
            databaseURL: process.env.FIREBASE_URL || 'https://city-22282-default-rtdb.firebaseio.com'
        });
    }
    console.log('✅ Firebase Admin SDK initialized');
}

const db = admin.database();
const auth = admin.auth();

module.exports = {
    admin,
    db,
    auth,
    // Realtime Database References
    ref: (path) => db.ref(path),
    // Authentication
    createUser: async (email, password) => {
        return await auth.createUser({
            email: email,
            password: password
        });
    },
    getUser: async (uid) => {
        return await auth.getUser(uid);
    },
    getUserByEmail: async (email) => {
        return await auth.getUserByEmail(email);
    },
    deleteUser: async (uid) => {
        return await auth.deleteUser(uid);
    },
    // Database Operations
    setData: async (path, data) => {
        return await db.ref(path).set(data);
    },
    getData: async (path) => {
        const snapshot = await db.ref(path).once('value');
        return snapshot.val();
    },
    pushData: async (path, data) => {
        return await db.ref(path).push(data);
    },
    updateData: async (path, data) => {
        return await db.ref(path).update(data);
    },
    deleteData: async (path) => {
        return await db.ref(path).remove();
    }
};
