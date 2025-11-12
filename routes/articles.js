const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");

const db = require("../db");
const auth = require("../middleware/auth");
const { upload: imageUpload, imageValidator } = require("../middleware/validateimage");

// Promise wrapper for DB queries
function q(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.query(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

/* =====================================================
   PUBLIC ROUTES
===================================================== */

// GET /articles/paginated?page=1&limit=10
router.get("/paginated", async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        const rows = await q(
            `SELECT id, headline, summary, image_url, date, article_types
             FROM articles
             ORDER BY date DESC
             LIMIT ? OFFSET ?`,
            [limit, offset]
        );

        return res.status(200).json({
            page,
            limit,
            count: rows.length,
            data: rows,
        });
    } catch (err) {
        console.error("GET /articles/paginated ERROR:", err);
        return res.status(500).json({
            error: "Internal server error while fetching paginated articles.",
            details: err.message,
        });
    }
});

// GET /articles/:id
router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        if (!id || isNaN(id)) {
            return res.status(400).json({ error: "Invalid article ID." });
        }

        const rows = await q(`SELECT * FROM articles WHERE id = ?`, [id]);

        if (!rows.length) {
            return res.status(404).json({ error: "Article not found." });
        }

        return res.status(200).json(rows[0]);
    } catch (err) {
        console.error("GET /articles/:id ERROR:", err);
        return res.status(500).json({
            error: "Internal server error while fetching article details.",
            details: err.message,
        });
    }
});

/* =====================================================
   AUTHENTICATED ROUTES (POST / PUT / DELETE)
===================================================== */

/* ---------- CREATE ARTICLE ---------- */
router.post("/", auth, imageUpload.single("image"), imageValidator, async (req, res) => {
    try {
        const { headline, summary, content, types, date, author } = req.body;

        if (!headline || !summary || !content || !types || !date) {
            return res.status(400).json({
                error: "Missing required fields. Please provide headline, summary, content, types, and date.",
            });
        }

        const typesFormatted = Array.isArray(types) ? types.join(",") : types;
        let imageUrl = null;

        if (req.file) {
            const timestamp = Date.now();
            const original = path.parse(req.file.originalname).name;
            const ext = path.extname(req.file.originalname);
            const finalName = `${original}_${timestamp}${ext}`;

            const finalPath = path.join(__dirname, "../images", finalName);
            fs.renameSync(req.file.path, finalPath);

            imageUrl = "/images/" + finalName;
        }

        await q(
            `INSERT INTO articles 
             (headline, summary, full_content, article_types, image_url, date, author)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [headline, summary, content, typesFormatted, imageUrl, date, author || null]
        );

        return res.status(201).json({
            success: true,
            message: "Article created successfully.",
        });
    } catch (err) {
        console.error("POST /articles ERROR:", err);
        return res.status(500).json({
            error: "Internal server error while creating article.",
            details: err.message,
        });
    }
});

/* ---------- UPDATE ARTICLE ---------- */
router.put("/:id", auth, imageUpload.single("image"), imageValidator, async (req, res) => {
    try {
        const { id } = req.params;

        if (!id || isNaN(id)) {
            return res.status(400).json({ error: "Invalid article ID." });
        }

        const { headline, summary, content, types, date, author } = req.body;

        const article = await q("SELECT * FROM articles WHERE id = ?", [id]);
        if (article.length === 0) {
            return res.status(404).json({ error: "Article not found." });
        }

        if (!headline || !summary || !content || !types || !date) {
            return res.status(400).json({
                error: "Missing required fields for update. Please include headline, summary, content, types, and date.",
            });
        }

        const typesFormatted = Array.isArray(types) ? types.join(",") : types;
        let imageSqlPart = "";
        const imageParams = [];

        if (req.file) {
            const timestamp = Date.now();
            const original = path.parse(req.file.originalname).name;
            const ext = path.extname(req.file.originalname);
            const finalName = `${original}_${timestamp}${ext}`;
            const finalPath = path.join(__dirname, "../images", finalName);

            fs.renameSync(req.file.path, finalPath);
            const newUrl = "/images/" + finalName;
            imageSqlPart = ", image_url = ?";
            imageParams.push(newUrl);
        }

        await q(
            `UPDATE articles SET 
                headline = ?, 
                summary = ?, 
                full_content = ?, 
                article_types = ?, 
                date = ?, 
                author = ?
                ${imageSqlPart}
             WHERE id = ?`,
            [headline, summary, content, typesFormatted, date, author || null, ...imageParams, id]
        );

        return res.status(200).json({
            success: true,
            message: "Article updated successfully.",
        });
    } catch (err) {
        console.error("PUT /articles/:id ERROR:", err);
        return res.status(500).json({
            error: "Internal server error while updating article.",
            details: err.message,
        });
    }
});

/* ---------- DELETE ARTICLE ---------- */
router.delete("/:id", auth, async (req, res) => {
    try {
        const { id } = req.params;

        if (!id || isNaN(id)) {
            return res.status(400).json({ error: "Invalid article ID." });
        }

        const existing = await q("SELECT * FROM articles WHERE id = ?", [id]);
        if (existing.length === 0) {
            return res.status(404).json({ error: "Article not found." });
        }

        await q(`DELETE FROM articles WHERE id = ?`, [id]);

        return res.status(200).json({
            success: true,
            message: "Article deleted successfully.",
        });
    } catch (err) {
        console.error("DELETE /articles/:id ERROR:", err);
        return res.status(500).json({
            error: "Internal server error while deleting article.",
            details: err.message,
        });
    }
});

module.exports = router;
