// routes/items.js
const express = require('express');
const router = express.Router();
const itemController = require('../controllers/itemController');
const { requireUser } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Browse and filter dynamic grid listings
router.get('/browse', itemController.getBrowse);

// Form submission for reporting items (requires login + Multer parsing)
router.get('/report', requireUser, itemController.getReport);
router.post('/report', requireUser, upload.single('image'), itemController.postReport);

// View report details page
router.get('/details/:id', itemController.getDetails);

// Edit reported item listing
router.get('/edit/:id', requireUser, itemController.getEdit);
router.post('/edit/:id', requireUser, itemController.postEdit);

// Mark item report as resolved/returned
router.post('/resolve/:id', requireUser, itemController.postResolve);

// Delete item report listing
router.post('/delete/:id', requireUser, itemController.postDelete);

module.exports = router;

