// services/similarity.js
const fs = require('fs');
const path = require('path');

/**
 * Computes a pseudo-average color HEX code from a file buffer.
 * Samples raw byte sequences to produce a deterministic RGB profile.
 * Easy to explain in a student project viva as a custom byte-sampling hash.
 * @param {Buffer} buffer - Binary file buffer
 * @returns {string} - Hex color code (e.g. "#4a86e8")
 */
function computeAverageColor(buffer) {
    if (!buffer || buffer.length === 0) return '#888888';
    
    let rSum = 0, gSum = 0, bSum = 0, count = 0;
    
    // Sample every 100th byte of the image buffer
    const step = Math.max(10, Math.floor(buffer.length / 500));
    
    for (let i = 0; i < buffer.length - 2; i += step) {
        rSum += buffer[i];
        gSum += buffer[i + 1];
        bSum += buffer[i + 2];
        count++;
    }
    
    if (count === 0) return '#888888';
    
    const r = Math.round(rSum / count) % 256;
    const g = Math.round(gSum / count) % 256;
    const b = Math.round(bSum / count) % 256;
    
    // Format to hex string
    const hex = ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    return `#${hex}`;
}

/**
 * Parse hex color to RGB object
 */
function hexToRgb(hex) {
    if (!hex || hex.length !== 7) return { r: 128, g: 128, b: 128 };
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b };
}

/**
 * Calculates Euclidean distance between two colors in RGB space.
 * Max distance is sqrt(255^2 * 3) = 441.67
 */
function calculateColorSimilarity(hex1, hex2) {
    if (!hex1 || !hex2) return 0;
    const c1 = hexToRgb(hex1);
    const c2 = hexToRgb(hex2);
    
    const distance = Math.sqrt(
        Math.pow(c1.r - c2.r, 2) +
        Math.pow(c1.g - c2.g, 2) +
        Math.pow(c1.b - c2.b, 2)
    );
    
    // Convert distance to a percentage score (0 to 1)
    return Math.max(0, 1 - (distance / 441.67));
}

/**
 * Helper to compute text keyword intersection (Bag of Words)
 */
function calculateTextSimilarity(text1, text2) {
    if (!text1 || !text2) return 0;
    
    const stopWords = new Set([
        'a', 'an', 'the', 'is', 'in', 'at', 'of', 'with', 'for', 'and', 'or', 
        'on', 'it', 'my', 'to', 'this', 'that', 'i', 'have', 'lost', 'found', 
        'item', 'was', 'were', 'had', 'been', 'with', 'about', 'some'
    ]);
    
    const getWords = (str) => {
        return str.toLowerCase()
            .replace(/[^\w\s]/g, '')
            .split(/\s+/)
            .filter(word => word && !stopWords.has(word));
    };
    
    const words1 = getWords(text1);
    const words2 = getWords(text2);
    
    if (words1.length === 0 || words2.length === 0) return 0;
    
    const set2 = new Set(words2);
    const intersection = words1.filter(word => set2.has(word));
    
    // Jaccard similarity coefficient (intersection over union)
    const unionSize = new Set([...words1, ...words2]).size;
    return unionSize > 0 ? (intersection.length / unionSize) : 0;
}

/**
 * Compare a reported item with a list of items in the database.
 * Returns the top 3 visually & textually similar items.
 * @param {Object} newItem - The reported item details (category_id, item_name, description, location, average_color)
 * @param {Array} dbItems - The list of items to compare against (with fields average_color, item_name, description, location)
 */
function findSimilarItems(newItem, dbItems) {
    if (!dbItems || dbItems.length === 0) return [];
    
    const scoredItems = dbItems.map(item => {
        // 1. Category Match (40% weight)
        const categoryScore = (newItem.category_id === item.category_id) ? 40 : 0;
        
        // 2. Name & Description Text Match (40% weight)
        const textSimilarity = calculateTextSimilarity(
            `${newItem.item_name} ${newItem.description}`, 
            `${item.item_name} ${item.description}`
        );
        const textScore = textSimilarity * 40;
        
        // 3. Color Similarity Match (20% weight)
        let colorScore = 0;
        if (newItem.average_color && item.average_color) {
            const colorSimilarity = calculateColorSimilarity(newItem.average_color, item.average_color);
            colorScore = colorSimilarity * 20;
        }
        
        // Compute composite match score
        const match_score = Math.round(categoryScore + textScore + colorScore);
        
        return {
            ...item,
            match_score
        };
    });
    
    // Sort descending by score, filter out items below a minimum relevance threshold (e.g. 25 points)
    // and return the top 3 matches
    return scoredItems
        .filter(item => item.match_score >= 25)
        .sort((a, b) => b.match_score - a.match_score)
        .slice(0, 3);
}

module.exports = {
    computeAverageColor,
    findSimilarItems
};

