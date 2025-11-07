// src/routes/articles.js
const express = require('express');
const router = express.Router();
const { query } = require('../db');

/* GET /articles/paginated?page=1&limit=10 */
router.get('/paginated', async (req, res, next) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, parseInt(req.query.limit) || 10);
        const offset = (page - 1) * limit;

        const rows = await query(
            `SELECT id, headline, summary, image_url, date, article_types
       FROM articles
       ORDER BY date DESC
       LIMIT ? OFFSET ?`, [limit, offset]
        );

        // total count (optional)
        const [{ total }] = await query(`SELECT COUNT(*) AS total FROM articles`);
        res.json({ page, limit, total, data: rows });
    } catch (err) { next(err); }
});

/* GET /articles/:id */
router.get('/:id', async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid id' });

        const rows = await query(
            `SELECT * FROM articles WHERE id = ? LIMIT 1`, [id]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'Article not found' });
        res.json(rows[0]);
    } catch (err) { next(err); }
});

module.exports = router;
