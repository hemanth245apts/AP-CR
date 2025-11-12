const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");

const auth = require("../middleware/auth");
const { upload: imageUpload, imageValidator } = require("../middleware/validateimage");
const { upload: pdfUpload, pdfValidator } = require("../middleware/validatepdf");

const db = require("../db");

// -----------------------------------------------------
// DB Helper
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
// Error helper
// -----------------------------------------------------
function handleError(res, err, message = "Internal Server Error") {
    console.error(message, err);
    return res.status(500).json({ error: message, details: err.message });
}

// -----------------------------------------------------
// PUBLIC ENDPOINTS
// -----------------------------------------------------

router.get("/", async (req, res) => {
    try {
        const rows = await q(`
            SELECT vision_statement, mission_statements, updated_at
            FROM about_content WHERE id = 1
        `);
        if (!rows.length) return res.status(404).json({ error: "About content not found" });
        res.json(rows[0]);
    } catch (err) {
        handleError(res, err);
    }
});

router.get("/organisation", async (req, res) => {
    try {
        const rows = await q(`
            SELECT description, chart_image_url, updated_at
            FROM about_organisation WHERE id = 1
        `);
        if (!rows.length) return res.status(404).json({ error: "Organisation info not found" });
        res.json(rows[0]);
    } catch (err) {
        handleError(res, err);
    }
});

router.get("/chairmans", async (req, res) => {
    try {
        const rows = await q(`
            SELECT id, s_no, name, service_years
            FROM chairmans ORDER BY s_no ASC
        `);
        if (!rows.length) return res.status(404).json({ error: "No chairman records found" });
        res.json(rows);
    } catch (err) {
        handleError(res, err);
    }
});

router.get("/rti", async (req, res) => {
    try {
        const rows = await q(`
            SELECT pio_name, pio_phone, apio_name, apio_phone,
                   appellate_name, appellate_phone,
                   pdf_english_url, pdf_telugu_url, updated_at
            FROM about_rti WHERE id = 1
        `);
        if (!rows.length) return res.status(404).json({ error: "RTI info not found" });
        res.json(rows[0]);
    } catch (err) {
        handleError(res, err);
    }
});

// -----------------------------------------------------
// AUTHENTICATED ADMIN ACTIONS
// -----------------------------------------------------

router.post("/", auth, async (req, res) => {
    try {
        const { vision_statement, mission_statements } = req.body;

        if (!vision_statement || !mission_statements) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        await q(
            `INSERT INTO about_content (id, vision_statement, mission_statements)
             VALUES (1, ?, ?)
             ON DUPLICATE KEY UPDATE
                vision_statement = VALUES(vision_statement),
                mission_statements = VALUES(mission_statements),
                updated_at = CURRENT_TIMESTAMP`,
            [vision_statement, mission_statements]
        );

        res.json({ message: "About content updated successfully" });
    } catch (err) {
        handleError(res, err);
    }
});

router.post(
    "/organisation",
    auth,
    imageUpload.single("chart_image"),
    imageValidator,
    async (req, res) => {
        try {
            const { description } = req.body;

            if (!description) {
                return res.status(400).json({ error: "Description is required" });
            }

            let imageUrl = null;
            if (req.file) {
                const ext = path.extname(req.file.originalname); // get extension (.jpg, .png, etc.)
                const stamped = `organisations_${Date.now()}${ext}`; // append extension
                const dest = path.join("images", stamped);
                fs.renameSync(req.file.path, dest);
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

            res.json({ message: "Organisation details updated successfully" });
        } catch (err) {
            handleError(res, err);
        }
    }
);

router.post("/chairmans", auth, async (req, res) => {
    try {
        const { s_no, name, service_years } = req.body;
        if (!s_no || !name || !service_years) {
            return res.status(400).json({ error: "Missing required chairman fields" });
        }

        const result = await q(
            `INSERT INTO chairmans (s_no, name, service_years) VALUES (?, ?, ?)`,
            [s_no, name, service_years]
        );

        res.json({ message: "Chairman added successfully", id: result.insertId });
    } catch (err) {
        handleError(res, err);
    }
});

router.put("/chairmans/:id", auth, async (req, res) => {
    try {
        const { id } = req.params;
        const { s_no, name, service_years } = req.body;

        if (!s_no || !name || !service_years) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const existing = await q(`SELECT id FROM chairmans WHERE id = ?`, [id]);
        if (!existing.length) return res.status(404).json({ error: "Chairman not found" });

        await q(
            `UPDATE chairmans SET s_no = ?, name = ?, service_years = ? WHERE id = ?`,
            [s_no, name, service_years, id]
        );

        res.json({ message: "Chairman updated successfully" });
    } catch (err) {
        handleError(res, err);
    }
});

router.delete("/chairmans/:id", auth, async (req, res) => {
    try {
        const { id } = req.params;

        const existing = await q(`SELECT id FROM chairmans WHERE id = ?`, [id]);
        if (!existing.length) return res.status(404).json({ error: "Chairman not found" });

        await q(`DELETE FROM chairmans WHERE id = ?`, [id]);
        res.json({ message: "Chairman deleted successfully" });
    } catch (err) {
        handleError(res, err);
    }
});


router.post(
    "/rti",
    auth,
    pdfUpload.fields([
        { name: "pdf_english", maxCount: 1 },
        { name: "pdf_telugu", maxCount: 1 }
    ]),
    pdfValidator,
    async (req, res) => {
        try {
            const {
                pio_name,
                pio_phone,
                apio_name,
                apio_phone,
                appellate_name,
                appellate_phone
            } = req.body;

            // Basic validation
            if (!pio_name || !pio_phone) {
                return res.status(400).json({ error: "Missing PIO details" });
            }

            let englishPDF = null;
            let teluguPDF = null;

            // Ensure pdfs folder exists
            const pdfDir = path.join(__dirname, "../pdfs");
            if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir);

            // Handle English PDF upload
            if (req.files?.pdf_english) {
                const f = req.files.pdf_english[0];
                const ext = path.extname(f.originalname).toLowerCase();
                const stamped = `rti_english_${Date.now()}${ext}`;
                const destPath = path.join(pdfDir, stamped);

                // Save buffer to file
                fs.writeFileSync(destPath, f.buffer);
                englishPDF = `/pdfs/${stamped}`;
            }

            // Handle Telugu PDF upload
            if (req.files?.pdf_telugu) {
                const f = req.files.pdf_telugu[0];
                const ext = path.extname(f.originalname).toLowerCase();
                const stamped = `rti_telugu_${Date.now()}${ext}`;
                const destPath = path.join(pdfDir, stamped);

                // Save buffer to file
                fs.writeFileSync(destPath, f.buffer);
                teluguPDF = `/pdfs/${stamped}`;
            }

            // Insert or update RTI data
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

            return res.status(200).json({ message: "RTI information updated successfully" });

        } catch (err) {
            console.error("POST /rti ERROR:", err);
            return res.status(500).json({ error: "Internal Server Error", details: err.message });
        }
    }
);

module.exports = router;
