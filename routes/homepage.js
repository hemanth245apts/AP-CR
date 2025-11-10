const express = require('express');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const auth = require('../middleware/auth');
const { upload, imageValidator } = require('../middleware/validateimage');
const router = express.Router();

// GET HOMEPAGE OFFICIALS (hero banner)
router.get('/official', (req, res) => {
    const query = `
        SELECT * FROM homepage_officials
        ORDER BY display_order ASC, id ASC
        LIMIT 3
    `;
    db.query(query, (err, results) => {
        if (err) {
            console.error('DB Error (officials):', err);
            return res.status(500).json({ message: 'Something went wrong. Please try again later.' });
        }
        res.json(results);
    });
});

// GET CAROUSEL IMAGES
router.get('/carousel', (req, res) => {
    const query = `
        SELECT * FROM homepage_carousel
        ORDER BY display_order ASC, id ASC
    `;
    db.query(query, (err, results) => {
        if (err) {
            console.error('DB Error (carousel):', err);
            return res.status(500).json({ message: 'Something went wrong. Please try again later.' });
        }
        res.json(results);
    });
});

// GET SIDEBAR UPDATES
router.get('/sidebar/updates', (req, res) => {
    const query = `
        SELECT * FROM sidebar_links
        WHERE type = 'update'
        ORDER BY display_order ASC, id ASC
    `;
    db.query(query, (err, results) => {
        if (err) {
            console.error('DB Error (sidebar updates):', err);
            return res.status(500).json({ message: 'Something went wrong. Please try again later.' });
        }
        res.json(results);
    });
});

// GET SIDEBAR QUICKLINKS
router.get('/sidebar/quicklinks', (req, res) => {
    const query = `
        SELECT * FROM sidebar_links
        WHERE type = 'quicklink'
        ORDER BY display_order ASC, id ASC
    `;
    db.query(query, (err, results) => {
        if (err) {
            console.error('DB Error (sidebar quicklinks):', err);
            return res.status(500).json({ message: 'Something went wrong. Please try again later.' });
        }
        res.json(results);
    });
});



/* GET /gallery/photos/latest - latest 4-5 photos */
router.get('/photos/latest', async (req, res, next) => {
    try {
        const rows = await query(
            `SELECT id, title, date, image_url
       FROM gallery_photos
       ORDER BY date DESC
       LIMIT 5`
        );
        res.json(rows);
    } catch (err) { next(err); }
});

/* GET /gallery/videos/latest */
router.get('/videos/latest', async (req, res, next) => {
    try {
        const rows = await query(
            `SELECT id, title, date, video_id, thumbnail_url
       FROM gallery_videos
       ORDER BY date DESC
       LIMIT 5`
        );
        res.json(rows);
    } catch (err) { next(err); }
});


module.exports = router;
