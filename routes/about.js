const express = require("express");
const router = express.Router();
const path = require("path");

const auth = require("../middleware/auth");
const { upload: imageUpload, imageValidator } = require("../middleware/validateimage");
const { upload: pdfUpload, pdfValidator } = require("../middleware/validatepdf");

const db = require("../db"); // ✅ using your real db.js

// -----------------------------------------------------
// Small helpers since db.query uses callbacks
// -----------------------------------------------------
function q(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.query(sql, params, (err, results) => {
            if (err) reject(err);
            else resolve(results);
        });
    });
}

// -----------------------------------------------------
// PUBLIC ENDPOINTS
// -----------------------------------------------------

// GET /about (Vision & Mission)
router.get("/", async (req, res, next) => {
    try {
        const rows = await q(`
            SELECT vision_statement, mission_statements, updated_at
            FROM about_content WHERE id = 1
        `);
        res.json(rows[0]);
    } catch (err) {
        next(err);
    }
});

// GET /about/organisation
router.get("/organisation", async (req, res, next) => {
    try {
        const rows = await q(`
            SELECT description, chart_image_url, updated_at
            FROM about_organisation WHERE id = 1
        `);
        res.json(rows[0]);
    } catch (err) {
        next(err);
    }
});

// GET /about/chairmans
router.get("/chairmans", async (req, res, next) => {
    try {
        const rows = await q(`
            SELECT id, s_no, name, service_years
            FROM chairmans ORDER BY s_no ASC
        `);
        res.json(rows);
    } catch (err) {
        next(err);
    }
});

// GET /about/rti
router.get("/rti", async (req, res, next) => {
    try {
        const rows = await q(`
            SELECT pio_name, pio_phone, apio_name, apio_phone,
                   appellate_name, appellate_phone,
                   pdf_english_url, pdf_telugu_url,
                   updated_at
            FROM about_rti WHERE id = 1
        `);
        res.json(rows[0]);
    } catch (err) {
        next(err);
    }
});

// -----------------------------------------------------
// AUTHENTICATED ADMIN ACTIONS
// -----------------------------------------------------

// PUT /about  (update vision & mission)
router.put("/", auth, async (req, res, next) => {
    try {
        const { vision_statement, mission_statements } = req.body;

        await q(
            `UPDATE about_content
             SET vision_statement = ?, mission_statements = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = 1`,
            [vision_statement, mission_statements]
        );

        res.json({ success: true });
    } catch (err) {
        next(err);
    }
});

// PUT /about/organisation  (text + chart image)
router.put(
    "/organisation",
    auth,
    imageUpload.single("chart_image"),
    imageValidator,
    async (req, res, next) => {
        try {
            const { description } = req.body;

            let imageUrl = null;
            if (req.file) {
                imageUrl = "/images/" + path.basename(req.file.path);
            }

            await q(
                `UPDATE about_organisation
                 SET description = ?,
                     chart_image_url = COALESCE(?, chart_image_url),
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = 1`,
                [description, imageUrl]
            );

            res.json({ success: true });
        } catch (err) {
            next(err);
        }
    }
);

// POST /about/chairmans
router.post("/chairmans", auth, async (req, res, next) => {
    try {
        const { s_no, name, service_years } = req.body;

        const result = await q(
            `INSERT INTO chairmans (s_no, name, service_years)
             VALUES (?, ?, ?)`,
            [s_no, name, service_years]
        );

        res.json({ id: result.insertId, success: true });
    } catch (err) {
        next(err);
    }
});

// PUT /about/chairmans/:id
router.put("/chairmans/:id", auth, async (req, res, next) => {
    try {
        const { s_no, name, service_years } = req.body;

        await q(
            `UPDATE chairmans
             SET s_no = ?, name = ?, service_years = ?
             WHERE id = ?`,
            [s_no, name, service_years, req.params.id]
        );

        res.json({ success: true });
    } catch (err) {
        next(err);
    }
});

// DELETE /about/chairmans/:id
router.delete("/chairmans/:id", auth, async (req, res, next) => {
    try {
        await q(`DELETE FROM chairmans WHERE id = ?`, [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
});

// PUT /about/rti (update PDF + officer details)
router.put(
    "/rti",
    auth,
    pdfUpload.fields([
        { name: "pdf_english", maxCount: 1 },
        { name: "pdf_telugu", maxCount: 1 }
    ]),
    pdfValidator,
    async (req, res, next) => {
        try {
            const {
                pio_name,
                pio_phone,
                apio_name,
                apio_phone,
                appellate_name,
                appellate_phone
            } = req.body;

            let englishPDF = null;
            let teluguPDF = null;

            if (req.files && req.files.pdf_english) {
                const f = req.files.pdf_english[0];
                englishPDF = "/pdfs/" + f.originalname;
                // You should save f.buffer to disk yourself
            }

            if (req.files && req.files.pdf_telugu) {
                const f = req.files.pdf_telugu[0];
                teluguPDF = "/pdfs/" + f.originalname;
                // Save to disk yourself as well
            }

            await q(
                `UPDATE about_rti
                 SET pio_name = ?, pio_phone = ?, apio_name = ?, apio_phone = ?,
                     appellate_name = ?, appellate_phone = ?,
                     pdf_english_url = COALESCE(?, pdf_english_url),
                     pdf_telugu_url = COALESCE(?, pdf_telugu_url),
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = 1`,
                [
                    pio_name,
                    pio_phone,
                    apio_name,
                    apio_phone,
                    appellate_name,
                    appellate_phone,
                    englishPDF,
                    teluguPDF
                ]
            );

            res.json({ success: true });
        } catch (err) {
            next(err);
        }
    }
);

module.exports = router;
