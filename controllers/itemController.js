// controllers/itemController.js
const db = require('../config/db');
const cloudinaryConf = require('../config/cloudinary');
const similarity = require('../services/similarity');
const fs = require('fs');
const path = require('path');

// Render Browse Listings
exports.getBrowse = async (req, res) => {
    const { search, category, location, status } = req.query;
    
    try {
        if (db.isOffline()) {
            return res.render('browse', { dbOffline: true, items: [], categories: [], search, category, location, status });
        }
        
        const categories = await db.query('SELECT * FROM categories ORDER BY name ASC');
        
        let queryStr = `
            SELECT r.*, c.name AS category_name, i.image_url 
            FROM reports r 
            INNER JOIN categories c ON r.category_id = c.id 
            LEFT JOIN images i ON r.id = i.report_id
            WHERE r.is_approved = 1 AND r.is_resolved = 0
        `;
        const queryParams = [];
        
        if (search) {
            queryStr += ' AND (r.item_name LIKE ? OR r.description LIKE ?)';
            queryParams.push(`%${search.trim()}%`, `%${search.trim()}%`);
        }
        
        if (category) {
            queryStr += ' AND r.category_id = ?';
            queryParams.push(category);
        }
        
        if (location) {
            queryStr += ' AND r.location LIKE ?';
            queryParams.push(`%${location.trim()}%`);
        }
        
        if (status) {
            queryStr += ' AND r.status = ?';
            queryParams.push(status);
        }
        
        queryStr += ' ORDER BY r.date_reported DESC, r.created_at DESC';
        
        const items = await db.query(queryStr, queryParams);
        
        res.render('browse', { 
            dbOffline: false, 
            items, 
            categories, 
            search: search || '', 
            category: category || '', 
            location: location || '', 
            status: status || '' 
        });
    } catch (err) {
        console.error(err);
        res.render('error', { message: 'Failed to retrieve listings.' });
    }
};

// Render Report Page
exports.getReport = async (req, res) => {
    const type = req.query.type || 'lost';
    try {
        if (db.isOffline()) {
            return res.render('report', { dbOffline: true, categories: [], type });
        }
        const categories = await db.query('SELECT * FROM categories ORDER BY name ASC');
        res.render('report', { dbOffline: false, categories, type });
    } catch (err) {
        res.render('error', { message: 'Failed to load report form.' });
    }
};

// Submit Report and run Auto-match AI
exports.postReport = async (req, res) => {
    const { item_name, category_id, description, status, location, date_reported, contact_number } = req.body;
    
    if (!item_name || !category_id || !description || !status || !location || !date_reported || !contact_number) {
        // clean uploaded file if validation fails
        if (req.file) fs.unlinkSync(req.file.path);
        return res.render('error', { message: 'All report fields are required.' });
    }
    
    try {
        if (db.isOffline()) {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.render('error', { message: 'Database offline. Cannot save report.' });
        }
        
        let imageUrl = '';
        let publicId = null;
        let averageColor = null;
        
        // Handle uploaded image file
        if (req.file) {
            try {
                // Calculate average color dynamically using our JS sampler
                const buffer = fs.readFileSync(req.file.path);
                averageColor = similarity.computeAverageColor(buffer);
                
                if (cloudinaryConf.isConfigured()) {
                    // Upload file to Cloudinary
                    const result = await cloudinaryConf.cloudinary.uploader.upload(req.file.path, {
                        folder: 'lofo_uploads'
                    });
                    imageUrl = result.secure_url;
                    publicId = result.public_id;
                    
                    // delete local temp file
                    fs.unlinkSync(req.file.path);
                } else {
                    // Use local relative link
                    imageUrl = '/uploads/' + req.file.filename;
                }
            } catch (uploadErr) {
                console.error("Image processing error:", uploadErr.message);
                if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
            }
        }
        
        // Insert report
        const reportResult = await db.query(
            `INSERT INTO reports (user_id, category_id, item_name, description, status, location, date_reported, contact_number)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [req.session.userId, category_id, item_name.trim(), description.trim(), status, location.trim(), date_reported, contact_number.trim()]
        );
        
        const reportId = reportResult.insertId;
        
        // Insert image if exists
        if (imageUrl) {
            await db.query(
                `INSERT INTO images (report_id, image_url, public_id, average_color) VALUES (?, ?, ?, ?)`,
                [reportId, imageUrl, publicId, averageColor]
            );
        }
        
        // MATCH MAKING (AI): Compare with items of OPPOSITE status
        const oppositeStatus = (status === 'lost') ? 'found' : 'lost';
        const candidateItems = await db.query(
            `SELECT r.*, c.name AS category_name, i.image_url, i.average_color
             FROM reports r
             INNER JOIN categories c ON r.category_id = c.id
             LEFT JOIN images i ON r.id = i.report_id
             WHERE r.status = ? AND r.is_approved = 1 AND r.is_resolved = 0`,
            [oppositeStatus]
        );
        
        const newItem = {
            category_id: parseInt(category_id),
            item_name: item_name.trim(),
            description: description.trim(),
            average_color: averageColor
        };
        
        // Run modular similarity computation
        const matches = similarity.findSimilarItems(newItem, candidateItems);
        
        // Render processing/matching results screen
        res.render('report-process', {
            success: true,
            status,
            item_name,
            matches
        });
        
    } catch (err) {
        console.error(err);
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.render('error', { message: 'Database transaction failed.' });
    }
};

// Render Details Page
exports.getDetails = async (req, res) => {
    const { id } = req.params;
    
    try {
        if (db.isOffline()) {
            return res.render('details', { dbOffline: true, item: null, similarItems: [] });
        }
        
        // Get details of item, including reporter email/name
        const itemRows = await db.query(
            `SELECT r.*, c.name AS category_name, u.name AS reporter_name, u.email AS reporter_email, i.image_url, i.average_color
             FROM reports r
             INNER JOIN categories c ON r.category_id = c.id
             INNER JOIN users u ON r.user_id = u.id
             LEFT JOIN images i ON r.id = i.report_id
             WHERE r.id = ?`,
            [id]
        );
        
        if (itemRows.length === 0) {
            return res.render('error', { message: 'Item listing not found.' });
        }
        
        const item = itemRows[0];
        
        // Fetch similar items for details footer recommendation (matches within the same category)
        const similarItems = await db.query(
            `SELECT r.*, c.name AS category_name, i.image_url 
             FROM reports r
             INNER JOIN categories c ON r.category_id = c.id
             LEFT JOIN images i ON r.id = i.report_id
             WHERE r.category_id = ? AND r.id != ? AND r.status = ? AND r.is_approved = 1 AND r.is_resolved = 0
             LIMIT 3`,
            [item.category_id, item.id, item.status]
        );
        
        res.render('details', { dbOffline: false, item, similarItems });
    } catch (err) {
        console.error(err);
        res.render('error', { message: 'Error retrieving item details.' });
    }
};

// Render Edit Page
exports.getEdit = async (req, res) => {
    const { id } = req.params;
    try {
        if (db.isOffline()) {
            return res.render('error', { message: 'Database offline.' });
        }
        
        const reports = await db.query('SELECT * FROM reports WHERE id = ? AND user_id = ?', [id, req.session.userId]);
        if (reports.length === 0) {
            return res.render('error', { message: 'Unauthorized or listing not found.' });
        }
        
        const categories = await db.query('SELECT * FROM categories ORDER BY name ASC');
        res.render('edit-report', { report: reports[0], categories });
    } catch (err) {
        res.render('error', { message: 'Error loading edit form.' });
    }
};

// Submit Edit
exports.postEdit = async (req, res) => {
    const { id } = req.params;
    const { item_name, category_id, description, location, date_reported, contact_number } = req.body;
    
    try {
        // Verify ownership
        const ownership = await db.query('SELECT id FROM reports WHERE id = ? AND user_id = ?', [id, req.session.userId]);
        if (ownership.length === 0) {
            return res.render('error', { message: 'Unauthorized action.' });
        }
        
        await db.query(
            `UPDATE reports SET item_name = ?, category_id = ?, description = ?, location = ?, date_reported = ?, contact_number = ?, is_approved = 0
             WHERE id = ?`,
            [item_name.trim(), category_id, description.trim(), location.trim(), date_reported, contact_number.trim(), id]
        );
        
        res.redirect('/dashboard?success=report_updated');
    } catch (err) {
        console.error(err);
        res.redirect('/dashboard?error=update_failed');
    }
};

// Resolve report (Mark as returned / resolved)
exports.postResolve = async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('UPDATE reports SET is_resolved = 1 WHERE id = ? AND user_id = ?', [id, req.session.userId]);
        res.redirect('/dashboard?success=report_resolved');
    } catch (err) {
        res.redirect('/dashboard?error=resolve_failed');
    }
};

// Delete Report
exports.postDelete = async (req, res) => {
    const { id } = req.params;
    try {
        // Retrieve image info to delete from Cloudinary if active
        const images = await db.query('SELECT image_url, public_id FROM images WHERE report_id = ?', [id]);
        
        if (images.length > 0 && images[0].public_id && cloudinaryConf.isConfigured()) {
            try {
                await cloudinaryConf.cloudinary.uploader.destroy(images[0].public_id);
            } catch (destroyErr) {
                console.error("Cloudinary file delete failed:", destroyErr.message);
            }
        } else if (images.length > 0 && images[0].image_url && !images[0].image_url.startsWith('http')) {
            // Delete local file
            const localPath = path.join(__dirname, '../public', images[0].image_url);
            if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
        }
        
        // Delete database records (cascades automatically to images table)
        await db.query('DELETE FROM reports WHERE id = ? AND user_id = ?', [id, req.session.userId]);
        res.redirect('/dashboard?success=report_deleted');
    } catch (err) {
        console.error(err);
        res.redirect('/dashboard?error=delete_failed');
    }
};

