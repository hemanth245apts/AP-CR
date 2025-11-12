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

        if (rows.length === 0) {
            return res.status(404).json({
                status: 404,
                error: "No media bodies found",
                message: "There are no media-body type links in the database."
            });
        }

        res.status(200).json(rows);
    } catch (err) {
        console.error("GET /links/media-bodies ERROR:", err);
        next({ status: 500, message: "Internal server error while fetching media bodies" });
    }
});

// GET /links/portals
router.get("/portals", async (req, res, next) => {
    try {
        const rows = await q(
            "SELECT * FROM links WHERE type = 'portal' ORDER BY display_order ASC, id DESC"
        );

        if (rows.length === 0) {
            return res.status(404).json({
                status: 404,
                error: "No portals found",
                message: "There are no portal type links in the database."
            });
        }

        res.status(200).json(rows);
    } catch (err) {
        console.error("GET /links/portals ERROR:", err);
        next({ status: 500, message: "Internal server error while fetching portals" });
    }
});


/* =====================================================
   AUTHENTICATED ROUTES
===================================================== */

/* ---------- MEDIA BODIES ---------- */

// POST /links/media-bodies
router.post("/media-bodies", auth, async (req, res, next) => {
    try {
        const { name, url, display_order } = req.body;

        if (!name || !url) {
            return res.status(400).json({
                status: 400,
                error: "Missing required fields",
                message: "Both 'name' and 'url' are required to create a media body link."
            });
        }

        await q(
            `INSERT INTO links (name, url, type, display_order)
             VALUES (?, ?, 'media-body', ?)`,
            [name, url, display_order ?? 0]
        );

        res.status(201).json({
            status: 201,
            message: "Media body link created successfully"
        });
    } catch (err) {
        console.error("POST /links/media-bodies ERROR:", err);
        next({ status: 500, message: "Internal server error while creating media body" });
    }
});

// PUT /links/media-bodies/:id
router.put("/media-bodies/:id", auth, async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, url, display_order } = req.body;

        if (!name || !url) {
            return res.status(400).json({
                status: 400,
                error: "Missing required fields",
                message: "Both 'name' and 'url' are required to update a media body link."
            });
        }

        const result = await q(
            `UPDATE links
             SET name = ?, url = ?, display_order = ?
             WHERE id = ? AND type = 'media-body'`,
            [name, url, display_order ?? 0, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                status: 404,
                error: "Not found",
                message: `Media body link with ID ${id} not found.`
            });
        }

        res.status(200).json({
            status: 200,
            message: "Media body link updated successfully"
        });
    } catch (err) {
        console.error("PUT /links/media-bodies/:id ERROR:", err);
        next({ status: 500, message: "Internal server error while updating media body" });
    }
});

// DELETE /links/media-bodies/:id
router.delete("/media-bodies/:id", auth, async (req, res, next) => {
    try {
        const { id } = req.params;

        const result = await q(
            "DELETE FROM links WHERE id = ? AND type = 'media-body'",
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                status: 404,
                error: "Not found",
                message: `Media body link with ID ${id} not found.`
            });
        }

        res.status(200).json({
            status: 200,
            message: "Media body link deleted successfully"
        });
    } catch (err) {
        console.error("DELETE /links/media-bodies/:id ERROR:", err);
        next({ status: 500, message: "Internal server error while deleting media body" });
    }
});


/* ---------- PORTALS ---------- */

// POST /links/portals
router.post("/portals", auth, async (req, res, next) => {
    try {
        const { name, url, display_order } = req.body;

        if (!name || !url) {
            return res.status(400).json({
                status: 400,
                error: "Missing required fields",
                message: "Both 'name' and 'url' are required to create a portal link."
            });
        }

        await q(
            `INSERT INTO links (name, url, type, display_order)
             VALUES (?, ?, 'portal', ?)`,
            [name, url, display_order ?? 0]
        );

        res.status(201).json({
            status: 201,
            message: "Portal link created successfully"
        });
    } catch (err) {
        console.error("POST /links/portals ERROR:", err);
        next({ status: 500, message: "Internal server error while creating portal" });
    }
});

// PUT /links/portals/:id
router.put("/portals/:id", auth, async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, url, display_order } = req.body;

        if (!name || !url) {
            return res.status(400).json({
                status: 400,
                error: "Missing required fields",
                message: "Both 'name' and 'url' are required to update a portal link."
            });
        }

        const result = await q(
            `UPDATE links
             SET name = ?, url = ?, display_order = ?
             WHERE id = ? AND type = 'portal'`,
            [name, url, display_order ?? 0, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                status: 404,
                error: "Not found",
                message: `Portal link with ID ${id} not found.`
            });
        }

        res.status(200).json({
            status: 200,
            message: "Portal link updated successfully"
        });
    } catch (err) {
        console.error("PUT /links/portals/:id ERROR:", err);
        next({ status: 500, message: "Internal server error while updating portal" });
    }
});

// DELETE /links/portals/:id
router.delete("/portals/:id", auth, async (req, res, next) => {
    try {
        const { id } = req.params;

        const result = await q("DELETE FROM links WHERE id = ? AND type = 'portal'", [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                status: 404,
                error: "Not found",
                message: `Portal link with ID ${id} not found.`
            });
        }

        res.status(200).json({
            status: 200,
            message: "Portal link deleted successfully"
        });
    } catch (err) {
        console.error("DELETE /links/portals/:id ERROR:", err);
        next({ status: 500, message: "Internal server error while deleting portal" });
    }
});

module.exports = router;
