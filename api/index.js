// api/index.js - LOFO Main Entrypoint (Vercel Serverless compatible)
const express = require('express');
const session = require('express-session');
const path = require('path');
const { injectSessionVariables } = require('../middleware/auth');
require('dotenv').config();

const app = express();

// Configure views and EJS engine paths
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// Body parser parsing
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Express Session Management
app.use(session({
    secret: process.env.SESSION_SECRET || 'lofo_session_fallback_secret_key',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        secure: false // Set to true if running under HTTPS in production
    }
}));

// Serve static assets from public folder
app.use(express.static(path.join(__dirname, '../public')));

// Global session variables injector
app.use(injectSessionVariables);

// Register Router Paths
app.use('/', require('../routes/index'));
app.use('/', require('../routes/auth'));
app.use('/', require('../routes/items'));
app.use('/', require('../routes/admin'));

// 404 Route Handler
app.use((req, res, next) => {
    res.status(404).render('error', { message: 'The requested page was not found on the server.' });
});

// Global Exception Handler
app.use((err, req, res, next) => {
    console.error("Global Handler Error:", err.message);
    res.status(err.status || 500).render('error', { 
        message: err.message || 'An unexpected internal server exception occurred.' 
    });
});

// Start local server if not running inside Vercel's serverless builder
const PORT = process.env.PORT || 8000;
if (process.env.VERCEL !== '1') {
    app.listen(PORT, () => {
        console.log(`LOFO Express application running locally on http://localhost:${PORT}`);
    });
}

module.exports = app;

