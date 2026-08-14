// controllers/adminController.js
const db = require('../config/db');
const bcrypt = require('bcryptjs');
const cloudinaryConf = require('../config/cloudinary');
const fs = require('fs');
const path = require('path');

// Render Admin Login
exports.getLogin = (req, res) => {
    if (req.session.adminId) return res.redirect('/admin-dashboard.php');
    res.render('admin-login', { error: req.query.error });
};

// Process Admin Login
exports.postLogin = async (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.render('admin-login', { error: 'Please fill in all credentials.' });
    }
    
    try {
        if (db.isOffline()) {
            return res.render('admin-login', { error: 'Database offline.' });
        }
        
        const admins = await db.query('SELECT * FROM admins WHERE username = ?', [username.trim()]);
        if (admins.length === 0) {
            return res.render('admin-login', { error: 'Incorrect credentials.' });
        }
        
        const admin = admins[0];
        const isMatch = bcrypt.compareSync(password, admin.password);
        
        if (!isMatch) {
            return res.render('admin-login', { error: 'Incorrect credentials.' });
        }
        
        // Set admin session
        req.session.adminId = admin.id;
        req.session.adminUsername = admin.username;
        
        res.redirect('/admin-dashboard.php');
    } catch (err) {
        console.error(err);
        res.render('admin-login', { error: 'System database error.' });
    }
};

// Render Admin Dashboard
exports.getDashboard = async (req, res) => {
    try {
        if (db.isOffline()) {
            return res.render('admin-dashboard', { 
                dbOffline: true,
                allReports: [], 
                allUsers: [],
                totalReports: 0, 
                pendingCount: 0, 
                totalUsers: 0 
            });
        }
        
        // Fetch stats
        const allReports = await db.query(
            `SELECT r.*, c.name AS category_name, u.name AS reporter_name, u.email AS reporter_email, i.image_url
             FROM reports r 
             INNER JOIN categories c ON r.category_id = c.id
             INNER JOIN users u ON r.user_id = u.id
             LEFT JOIN images i ON r.id = i.report_id
             ORDER BY r.created_at DESC`
        );
        
        const allUsers = await db.query('SELECT id, name, email, phone, created_at FROM users ORDER BY created_at DESC');
        
        const pendingCount = allReports.filter(r => r.is_approved === 0).length;
        const totalReports = allReports.length;
        const totalUsers = allUsers.length;
        
        res.render('admin-dashboard', {
            dbOffline: false,
            allReports,
            allUsers,
            pendingCount,
            totalReports,
            totalUsers,
            success: req.query.success,
            error: req.query.error
        });
    } catch (err) {
        console.error(err);
        res.render('error', { message: 'Failed to retrieve admin records.' });
    }
};

// Approve Listing
exports.postApprove = async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('UPDATE reports SET is_approved = 1 WHERE id = ?', [id]);
        res.redirect('/admin-dashboard.php?success=approved');
    } catch (err) {
        res.redirect('/admin-dashboard.php?error=approval_failed');
    }
};

// Delete fake/spam report
exports.postDeleteReport = async (req, res) => {
    const { id } = req.params;
    try {
        const images = await db.query('SELECT image_url, public_id FROM images WHERE report_id = ?', [id]);
        
        if (images.length > 0 && images[0].public_id && cloudinaryConf.isConfigured()) {
            try {
                await cloudinaryConf.cloudinary.uploader.destroy(images[0].public_id);
            } catch (err) {
                console.error("Cloudinary delete failed:", err.message);
            }
        } else if (images.length > 0 && images[0].image_url && !images[0].image_url.startsWith('http')) {
            const localPath = path.join(__dirname, '../public', images[0].image_url);
            if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
        }
        
        await db.query('DELETE FROM reports WHERE id = ?', [id]);
        res.redirect('/admin-dashboard.php?success=deleted');
    } catch (err) {
        res.redirect('/admin-dashboard.php?error=delete_failed');
    }
};

// Logout Admin
exports.logout = (req, res) => {
    req.session.destroy(() => {
        res.redirect('/admin-login.php');
    });
};

