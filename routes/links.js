const express = require("express");
const router = express.Router();

const db = require("../db");
const auth = require("../middleware/auth");


// Promise wrapper
function q(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.query(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

/* =====================================================
   PUBLIC GET ROUTES
===================================================== */

// GET /links/media-bodies
router.get("/media-bodies", async (req, res, next) => {
    try {
        const rows = await q(
            "SELECT * FROM links WHERE type = 'media-body' ORDER BY display_order ASC, id DESC"
        );
        res.json(rows);
    } catch (err) {
        console.error("GET /links/media-bodies ERROR:", err);
        res.status(500).json({ error: err.message });
    }
});

// GET /links/portals
router.get("/portals", async (req, res, next) => {
    try {
        const rows = await q(
            "SELECT * FROM links WHERE type = 'portal' ORDER BY display_order ASC, id DESC"
        );
        res.json(rows);
    } catch (err) {
        console.error("GET /links/portals ERROR:", err);
        res.status(500).json({ error: err.message });
    }
});


/* =====================================================
   AUTHENTICATED ROUTES
===================================================== */

/* ---------- MEDIA BODIES ---------- */

// POST /links/media-bodies
router.post("/media-bodies", auth, async (req, res) => {
    try {
        const { name, url, display_order } = req.body;

        await q(
            `INSERT INTO links (name, url, type, display_order)
             VALUES (?, ?, 'media-body', ?)`,
            [name, url, display_order ?? 0]
        );

        res.json({ success: true });
    } catch (err) {
        console.error("POST /links/media-bodies ERROR:", err);
        res.status(500).json({ error: err.message });
    }
});

// PUT /links/media-bodies/:id
router.put("/media-bodies/:id", auth, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, url, display_order } = req.body;

        await q(
            `UPDATE links
             SET name = ?, url = ?, display_order = ?
             WHERE id = ? AND type = 'media-body'`,
            [name, url, display_order ?? 0, id]
        );

        res.json({ success: true });
    } catch (err) {
        console.error("PUT /links/media-bodies/:id ERROR:", err);
        res.status(500).json({ error: err.message });
    }
});

// DELETE /links/media-bodies/:id
router.delete("/media-bodies/:id", auth, async (req, res) => {
    try {
        const { id } = req.params;

        await q("DELETE FROM links WHERE id = ? AND type = 'media-body'", [id]);

        res.json({ success: true });
    } catch (err) {
        console.error("DELETE /links/media-bodies/:id ERROR:", err);
        res.status(500).json({ error: err.message });
    }
});


/* ---------- PORTALS ---------- */

// POST /links/portals
router.post("/portals", auth, async (req, res) => {
    try {
        const { name, url, display_order } = req.body;

        await q(
            `INSERT INTO links (name, url, type, display_order)
             VALUES (?, ?, 'portal', ?)`,
            [name, url, display_order ?? 0]
        );

        res.json({ success: true });
    } catch (err) {
        console.error("POST /links/portals ERROR:", err);
        res.status(500).json({ error: err.message });
    }
});

// PUT /links/portals/:id
router.put("/portals/:id", auth, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, url, display_order } = req.body;

        await q(
            `UPDATE links
             SET name = ?, url = ?, display_order = ?
             WHERE id = ? AND type = 'portal'`,
            [name, url, display_order ?? 0, id]
        );

        res.json({ success: true });
    } catch (err) {
        console.error("PUT /links/portals/:id ERROR:", err);
        res.status(500).json({ error: err.message });
    }
});

// DELETE /links/portals/:id
router.delete("/portals/:id", auth, async (req, res) => {
    try {
        const { id } = req.params;

        await q("DELETE FROM links WHERE id = ? AND type = 'portal'", [id]);

        res.json({ success: true });
    } catch (err) {
        console.error("DELETE /links/portals/:id ERROR:", err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
