// routes/admin.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { requireAdmin } = require('../middleware/auth');

// Admin Auth Routes
router.get('/admin-login.php', adminController.getLogin);
router.post('/admin-login.php', adminController.postLogin);

// Admin Control Panels (Requires Admin Session)
router.get('/admin-dashboard.php', requireAdmin, adminController.getDashboard);
router.post('/admin/approve/:id', requireAdmin, adminController.postApprove);
router.post('/admin/delete/:id', requireAdmin, adminController.postDeleteReport);

// Admin Logout Route
router.get('/admin-logout.php', adminController.logout);

module.exports = router;

