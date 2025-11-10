const express = require('express');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const auth = require('../middleware/auth');
const { upload, imageValidator } = require('../middleware/validateimage');

const router = express.Router();


//Verify Content on text 
function isMaliciousText(text) {
    const lower = text.toLowerCase();
    const badPatterns = [
        /<script.*?>.*?<\/script>/g, // Any script tags
        /on\w+\s*=/g,               // Event handlers like onload=
        /javascript:/g,             // javascript: pseudo URLs
        /<.*?>/g,                   // Any HTML tags
        /eval\s*\(/g,               // eval()
        /base64,/g                  // Base64 injection attempts
    ];

    return badPatterns.some((pattern) => pattern.test(lower));
}
/**
 * POST /homepage/officials
 * Adds a new official (name, title, image, and optional link_url)
 */
router.post('/homepage/officials', auth, upload.single('image'), imageValidator, (req, res) => {
    const { name, title, link_url } = req.body;

    if (!name || !title) {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(400).json({ message: 'Name and title are required' });
    }

    //Rename uploaded image
    const ext = path.extname(req.file.originalname).toLowerCase();
    const safeName = name.replace(/\s+/g, '_').toLowerCase();
    const newFileName = `${safeName}_${Date.now()}${ext}`;
    const newImagePath = path.join(__dirname, '../images', newFileName);
    fs.renameSync(req.file.path, newImagePath);

    const imageUrl = `/images/${newFileName}`;
    // Get next display order
    db.query('SELECT IFNULL(MAX(display_order), 0) + 1 AS nextOrder FROM homepage_officials', (err1, rows) => {
        if (err1) {
            console.error('Database select error:', err1);
            if (fs.existsSync(newImagePath)) fs.unlinkSync(newImagePath);
            return res.status(500).json({ message: 'Database error' });
        }

        const nextOrder = rows[0].nextOrder;

        //Adding record
        const insertQuery = `
            INSERT INTO homepage_officials (name, title, image_url, link_url, display_order)
            VALUES (?, ?, ?, ?, ?)
        `;
        const values = [name, title, imageUrl, link_url || null, nextOrder];

        db.query(insertQuery, values, (err2, result) => {
            if (err2) {
                console.error('Database insert error:', err2);
                if (fs.existsSync(newImagePath)) fs.unlinkSync(newImagePath);
                return res.status(500).json({ message: 'Database error' });
            }

            res.status(201).json({
                message: 'Official added successfully',
                official: { id: result.insertId, name, title, imageUrl, link_url, display_order: nextOrder },
            });
        });
    });
});

router.post('/homepage/carousel', auth, upload.single('image'), imageValidator, (req, res) => {
    const { alt_text } = req.body;

    // Validate alt_text
    if (!alt_text || typeof alt_text !== 'string' || alt_text.trim().length === 0) {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(400).json({ message: 'alt_text is required' });
    }

    // Malicious text detection
    if (isMaliciousText(alt_text)) {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(400).json({ message: 'Malicious content detected in alt_text' });
    }

    // Rename uploaded image
    const ext = path.extname(req.file.originalname).toLowerCase();
    const safeName = `carousel_${Date.now()}${ext}`;
    const newImagePath = path.join(__dirname, '../images', safeName);
    fs.renameSync(req.file.path, newImagePath);

    const imageUrl = `/images/${safeName}`;

    //Get next display order
    db.query('SELECT IFNULL(MAX(display_order), 0) + 1 AS nextOrder FROM homepage_carousel', (err1, rows) => {
        if (err1) {
            console.error('Database select error:', err1);
            if (fs.existsSync(newImagePath)) fs.unlinkSync(newImagePath);
            return res.status(500).json({ message: 'Database error' });
        }

        const nextOrder = rows[0].nextOrder;
        const insertQuery = `
            INSERT INTO homepage_carousel (alt_text, image_url, display_order)
            VALUES (?, ?, ?)
        `;
        const values = [alt_text.trim(), imageUrl, nextOrder];

        db.query(insertQuery, values, (err2, result) => {
            if (err2) {
                console.error('Database insert error:', err2);
                if (fs.existsSync(newImagePath)) fs.unlinkSync(newImagePath);
                return res.status(500).json({ message: 'Database error' });
            }

            res.status(201).json({
                message: 'Carousel image uploaded successfully',
                carousel: {
                    id: result.insertId,
                    alt_text,
                    imageUrl,
                    display_order: nextOrder,
                },
            });
        });
    });
});

module.exports = router;
