// controllers/authController.js
const db = require('../config/db');
const bcrypt = require('bcryptjs');

// Render Login Page
exports.getLogin = (req, res) => {
    if (req.session.userId) return res.redirect('/dashboard');
    const error = req.query.error;
    const success = req.query.success;
    res.render('login', { error, success });
};

// Process Login Form
exports.postLogin = async (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.render('login', { error: 'Please enter both email and password.', success: null });
    }
    
    try {
        if (db.isOffline()) {
            return res.render('login', { error: 'Database is currently offline. Please try again later.', success: null });
        }
        
        const users = await db.query('SELECT * FROM users WHERE email = ?', [email.trim()]);
        if (users.length === 0) {
            return res.render('login', { error: 'Incorrect email or password.', success: null });
        }
        
        const user = users[0];
        const isMatch = bcrypt.compareSync(password, user.password);
        
        if (!isMatch) {
            return res.render('login', { error: 'Incorrect email or password.', success: null });
        }
        
        // Set user session variables
        req.session.userId = user.id;
        req.session.userName = user.name;
        req.session.userEmail = user.email;
        req.session.userPhone = user.phone;
        
        res.redirect('/dashboard');
    } catch (err) {
        console.error(err);
        res.render('login', { error: 'An unexpected system error occurred.', success: null });
    }
};

// Render Register Page
exports.getRegister = (req, res) => {
    if (req.session.userId) return res.redirect('/dashboard');
    res.render('register', { error: null });
};

// Process Registration Form
exports.postRegister = async (req, res) => {
    const { name, email, phone, password, confirm_password } = req.body;
    
    if (!name || !email || !phone || !password || !confirm_password) {
        return res.render('register', { error: 'All fields are required.' });
    }
    
    if (password !== confirm_password) {
        return res.render('register', { error: 'Passwords do not match.' });
    }
    
    if (password.length < 6) {
        return res.render('register', { error: 'Password must be at least 6 characters long.' });
    }
    
    try {
        if (db.isOffline()) {
            return res.render('register', { error: 'Database is currently offline. Unable to complete registration.' });
        }
        
        // Check if email already exists
        const existingUsers = await db.query('SELECT id FROM users WHERE email = ?', [email.trim()]);
        if (existingUsers.length > 0) {
            return res.render('register', { error: 'An account with this email already exists.' });
        }
        
        // Hash password
        const salt = bcrypt.genSaltSync(10);
        const passwordHash = bcrypt.hashSync(password, salt);
        
        // Insert into database
        await db.query(
            'INSERT INTO users (name, email, phone, password) VALUES (?, ?, ?, ?)',
            [name.trim(), email.trim(), phone.trim(), passwordHash]
        );
        
        res.redirect('/login?success=registered');
    } catch (err) {
        console.error(err);
        res.render('register', { error: 'Registration failed due to a database exception.' });
    }
};

// Render User Dashboard
exports.getDashboard = async (req, res) => {
    try {
        if (db.isOffline()) {
            return res.render('dashboard', { 
                dbOffline: true, 
                reports: [], 
                lostCount: 0, 
                foundCount: 0, 
                resolvedCount: 0 
            });
        }
        
        // Get user reports
        const reports = await db.query(
            `SELECT r.*, c.name AS category_name, i.image_url 
             FROM reports r 
             INNER JOIN categories c ON r.category_id = c.id 
             LEFT JOIN images i ON r.id = i.report_id 
             WHERE r.user_id = ? 
             ORDER BY r.created_at DESC`,
            [req.session.userId]
        );
        
        // Calculate counts
        const stats = await db.query(
            `SELECT 
                SUM(CASE WHEN status = 'lost' AND is_resolved = 0 THEN 1 ELSE 0 END) as lost_count,
                SUM(CASE WHEN status = 'found' AND is_resolved = 0 THEN 1 ELSE 0 END) as found_count,
                SUM(CASE WHEN is_resolved = 1 THEN 1 ELSE 0 END) as resolved_count
             FROM reports 
             WHERE user_id = ?`,
            [req.session.userId]
        );
        
        const lostCount = stats[0].lost_count || 0;
        const foundCount = stats[0].found_count || 0;
        const resolvedCount = stats[0].resolved_count || 0;
        
        res.render('dashboard', { 
            dbOffline: false, 
            reports, 
            lostCount, 
            foundCount, 
            resolvedCount,
            success: req.query.success,
            error: req.query.error
        });
    } catch (err) {
        console.error(err);
        res.render('error', { message: 'Failed to load dashboard data.' });
    }
};

// Render Profile Edit Page
exports.getProfile = async (req, res) => {
    try {
        if (db.isOffline()) {
            return res.render('profile', { dbOffline: true, userDetail: null, error: 'Database is offline.', success: null });
        }
        
        const users = await db.query('SELECT name, email, phone FROM users WHERE id = ?', [req.session.userId]);
        res.render('profile', { dbOffline: false, userDetail: users[0], error: req.query.error, success: req.query.success });
    } catch (err) {
        res.render('error', { message: 'Failed to load profile details.' });
    }
};

// Update Profile
exports.postProfile = async (req, res) => {
    const { name, phone, password, confirm_password } = req.body;
    
    if (!name || !phone) {
        return res.redirect('/profile?error=fields_required');
    }
    
    try {
        let queryStr = 'UPDATE users SET name = ?, phone = ?';
        let queryParams = [name.trim(), phone.trim()];
        
        if (password) {
            if (password !== confirm_password) {
                return res.redirect('/profile?error=password_mismatch');
            }
            if (password.length < 6) {
                return res.redirect('/profile?error=password_too_short');
            }
            const salt = bcrypt.genSaltSync(10);
            const passwordHash = bcrypt.hashSync(password, salt);
            queryStr += ', password = ?';
            queryParams.push(passwordHash);
        }
        
        queryStr += ' WHERE id = ?';
        queryParams.push(req.session.userId);
        
        await db.query(queryStr, queryParams);
        req.session.userName = name.trim();
        req.session.userPhone = phone.trim();
        
        res.redirect('/profile?success=profile_updated');
    } catch (err) {
        console.error(err);
        res.redirect('/profile?error=update_failed');
    }
};

// Render Forgot Password
exports.getForgotPassword = (req, res) => {
    res.render('forgot-password', { error: null, success: null });
};

// Process Password Reset (Student Project Verification logic: Match Email & Phone to reset)
exports.postForgotPassword = async (req, res) => {
    const { email, phone, new_password, confirm_password } = req.body;
    
    if (!email || !phone || !new_password || !confirm_password) {
        return res.render('forgot-password', { error: 'All fields are required.', success: null });
    }
    
    if (new_password !== confirm_password) {
        return res.render('forgot-password', { error: 'Passwords do not match.', success: null });
    }
    
    try {
        if (db.isOffline()) {
            return res.render('forgot-password', { error: 'Database offline.', success: null });
        }
        
        const users = await db.query('SELECT id FROM users WHERE email = ? AND phone = ?', [email.trim(), phone.trim()]);
        if (users.length === 0) {
            return res.render('forgot-password', { error: 'Verification failed. Email and phone number do not match.', success: null });
        }
        
        const salt = bcrypt.genSaltSync(10);
        const newHash = bcrypt.hashSync(new_password, salt);
        
        await db.query('UPDATE users SET password = ? WHERE id = ?', [newHash, users[0].id]);
        
        res.render('forgot-password', { error: null, success: 'Password has been reset successfully! Please login.' });
    } catch (err) {
        console.error(err);
        res.render('forgot-password', { error: 'Server error during password reset.', success: null });
    }
};

// Logout User
exports.logout = (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login');
    });
};

