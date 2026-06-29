// config/firebase.js - Firebase Configuration
// Inatumia Firebase Realtime Database na Authentication

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json'); // Pakua kutoka Firebase Console

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: process.env.FIREBASE_URL || 'https://city-22282-default-rtdb.firebaseio.com'
    });
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
