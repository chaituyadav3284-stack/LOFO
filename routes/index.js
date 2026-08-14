// routes/index.js
const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Homepage route displaying the 4 most recently reported items
router.get('/', async (req, res) => {
    try {
        if (db.isOffline()) {
            return res.render('index', { dbOffline: true, items: [] });
        }
        
        const items = await db.query(
            `SELECT r.*, c.name AS category_name, i.image_url 
             FROM reports r 
             INNER JOIN categories c ON r.category_id = c.id 
             LEFT JOIN images i ON r.id = i.report_id 
             WHERE r.is_approved = 1 AND r.is_resolved = 0
             ORDER BY r.date_reported DESC, r.created_at DESC 
             LIMIT 4`
        );
        res.render('index', { dbOffline: false, items });
    } catch (err) {
        console.error(err);
        // Fallback gracefully without crashing
        res.render('index', { dbOffline: true, items: [] });
    }
});

// Contact Page
router.get('/contact', (req, res) => {
    res.render('contact');
});

module.exports = router;

