// routes/auth.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { requireUser } = require('../middleware/auth');

// Login Routes
router.get('/login', authController.getLogin);
router.post('/login', authController.postLogin);

// Registration Routes
router.get('/register', authController.getRegister);
router.post('/register', authController.postRegister);

// Forgot Password Recovery Routes
router.get('/forgot-password', authController.getForgotPassword);
router.post('/forgot-password', authController.postForgotPassword);

// User Dashboard Route
router.get('/dashboard', requireUser, authController.getDashboard);

// User Settings Profile Routes
router.get('/profile', requireUser, authController.getProfile);
router.post('/profile', requireUser, authController.postProfile);

// Logout Handler
router.get('/logout', authController.logout);

module.exports = router;

