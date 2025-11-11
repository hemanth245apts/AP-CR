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

// POST /about  (create vision & mission)
router.post("/", auth, async (req, res, next) => {
    try {
        const { vision_statement, mission_statements } = req.body;

        await q(
            `INSERT INTO about_content (id, vision_statement, mission_statements)
             VALUES (1, ?, ?)
             ON DUPLICATE KEY UPDATE
                vision_statement = VALUES(vision_statement),
                mission_statements = VALUES(mission_statements),
                updated_at = CURRENT_TIMESTAMP`,
            [vision_statement, mission_statements]
        );

        res.json({ success: true });
    } catch (err) {
        next(err);
    }
});


// POST /about/organisation  (create description + chart image)
router.post(
    "/organisation",
    auth,
    imageUpload.single("chart_image"),
    imageValidator,
    async (req, res, next) => {
        try {
            const { description } = req.body;

            let imageUrl = null;
            if (req.file) {
                const base = path.basename(req.file.path);
                const stamped = `${base}_${Date.now()}`;
                imageUrl = `/images/${stamped}`;
            }


            await q(
                `INSERT INTO about_organisation (id, description, chart_image_url)
                 VALUES (1, ?, ?)
                 ON DUPLICATE KEY UPDATE
                    description = VALUES(description),
                    chart_image_url = COALESCE(VALUES(chart_image_url), chart_image_url),
                    updated_at = CURRENT_TIMESTAMP`,
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


// POST /about/rti (create PDF + officer details)
router.post(
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
                englishPDF = `/pdfs/${f.originalname}_${Date.now()}`;
            }

            if (req.files && req.files.pdf_telugu) {
                const f = req.files.pdf_telugu[0];
                teluguPDF = `/pdfs/${f.originalname}_${Date.now()}`;
            }

            await q(
                `INSERT INTO about_rti (
                    id, pio_name, pio_phone, apio_name, apio_phone,
                    appellate_name, appellate_phone,
                    pdf_english_url, pdf_telugu_url
                 )
                 VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                    pio_name = VALUES(pio_name),
                    pio_phone = VALUES(pio_phone),
                    apio_name = VALUES(apio_name),
                    apio_phone = VALUES(apio_phone),
                    appellate_name = VALUES(appellate_name),
                    appellate_phone = VALUES(appellate_phone),
                    pdf_english_url = COALESCE(VALUES(pdf_english_url), pdf_english_url),
                    pdf_telugu_url = COALESCE(VALUES(pdf_telugu_url), pdf_telugu_url),
                    updated_at = CURRENT_TIMESTAMP`,
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
