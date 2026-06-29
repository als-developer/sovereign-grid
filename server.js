// server.js - Toleo Lililorahisishwa la Kuhudumia Kurasa zote
const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Hii inawaambia Express kutafuta faili za HTML kwenye folda ya 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Hivi ndivyo unavyounda njia (routes) kwa kila ukurasa wako
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});
app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
});
app.get('/pricing', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'pricing.html'));
});
app.get('/api-keys', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'api_keys.html'));
});
// Endelea kuongeza njia kwa kila ukurasa wako wa HTML.

app.listen(PORT, () => {
  console.log(`🚀 Server inaendesha kwenye port ${PORT}`);
});
