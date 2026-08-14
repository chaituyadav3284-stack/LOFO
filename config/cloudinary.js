// config/cloudinary.js
const cloudinary = require('cloudinary').v2;
require('dotenv').config();

let isCloudinaryConfigured = false;

// Initialize Cloudinary only if all required credentials are present
if (
    process.env.CLOUDINARY_CLOUD_NAME && 
    process.env.CLOUDINARY_API_KEY && 
    process.env.CLOUDINARY_API_SECRET
) {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
    });
    isCloudinaryConfigured = true;
    console.log("Cloudinary image hosting configured successfully.");
} else {
    console.warn("Cloudinary credentials missing. Image uploads will save to local disk.");
}

module.exports = {
    cloudinary,
    isConfigured: () => isCloudinaryConfigured
};

