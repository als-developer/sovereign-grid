// =====================================================
// ADD THIS AT THE TOP - Force session clear
// =====================================================

// Clear cookies middleware
app.use((req, res, next) => {
    // Remove all cookies on login page load
    if (req.path === '/admin/login' || req.path === '/admin/') {
        res.clearCookie('token');
        res.clearCookie('session');
        res.clearCookie('connect.sid');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
    }
    next();
});

// =====================================================
// ADD THIS ROUTE - Force logout endpoint
// =====================================================

app.get('/admin/force-logout', (req, res) => {
    res.clearCookie('token');
    res.clearCookie('session');
    res.clearCookie('connect.sid');
    res.redirect('/admin/login?cleared=1');
});

// =====================================================
// UPDATE LOGIN PAGE TO AUTO-CLEAR
// =====================================================

// Serve login page with cache busting
app.get('/admin/login', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.sendFile(path.join(__dirname, 'public/admin/login.html'));
});
