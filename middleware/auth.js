// middleware/auth.js

// Protect user routes
function requireUser(req, res, next) {
    if (!req.session.userId) {
        return res.redirect('/login?error=auth_required');
    }
    next();
}

// Protect admin routes
function requireAdmin(req, res, next) {
    if (!req.session.adminId) {
        return res.redirect('/admin-login.php?error=admin_required');
    }
    next();
}

// Global middleware to pass session variables to EJS templates automatically
function injectSessionVariables(req, res, next) {
    res.locals.user = req.session.userId ? {
        id: req.session.userId,
        name: req.session.userName,
        email: req.session.userEmail
    } : null;
    res.locals.admin = req.session.adminId ? {
        id: req.session.adminId,
        username: req.session.adminUsername
    } : null;
    res.locals.path = req.path;
    next();
}

module.exports = {
    requireUser,
    requireAdmin,
    injectSessionVariables
};

