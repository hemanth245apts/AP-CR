const express = require("express");
const router = express.Router();

const db = require("../db");
const auth = require("../middleware/auth");
const { upload, validateFiles } = require("../middleware/validatefile"); // merged validator

const path = require("path");
const fs = require("fs");

// SQL wrapper
function q(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.query(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

/* GET all publications */
router.get("/", async (req, res) => {
    try {
        const rows = await q("SELECT * FROM publications ORDER BY id DESC");
        res.json(rows);
    } catch (err) {
        console.error("GET /publications ERROR:", err);
        res.status(500).json({ error: err.message });
    }
});

/* CREATE publication */
router.post(
    "/",
    auth,
    upload,          // Multer handles both fields
    validateFiles,   // Our merged validator
    async (req, res) => {
        try {
            const { title, description } = req.body;
            const img = req.validatedFiles.cover_image;
            const pdf = req.validatedFiles.pdf_file;

            if (!img || !pdf) {
                return res.status(400).json({ error: "Both cover_image and pdf_file are required" });
            }

            // Save cover image
            const imgExt = path.extname(img.originalname);
            const imgName = `cover_${Date.now()}${imgExt}`;
            const imgPath = path.join("images", imgName);
            if (!fs.existsSync("images")) fs.mkdirSync("images");
            fs.writeFileSync(imgPath, img.buffer);
            const coverUrl = "/images/" + imgName;

            // Save PDF
            if (!fs.existsSync("pdfs")) fs.mkdirSync("pdfs");
            const pdfName = `publication_${Date.now()}.pdf`;
            const pdfPath = path.join("pdfs", pdfName);
            fs.writeFileSync(pdfPath, pdf.buffer);
            const pdfUrl = "/pdfs/" + pdfName;

            // Insert into DB
            await q(
                `INSERT INTO publications (title, description, cover_image_url, pdf_file_url) VALUES (?, ?, ?, ?)`,
                [title, description, coverUrl, pdfUrl]
            );

            res.json({ success: true });
        } catch (err) {
            console.error("POST /publications ERROR:", err);
            res.status(500).json({ error: err.message });
        }
    }
);

/* UPDATE publication */
router.put(
    "/:id",
    auth,
    upload,
    validateFiles,
    async (req, res) => {
        try {
            const { id } = req.params;
            const { title, description } = req.body;
            const params = [title, description];
            let imgSql = "", pdfSql = "";

            const img = req.validatedFiles.cover_image;
            if (img) {
                const imgExt = path.extname(img.originalname);
                const imgName = `cover_${Date.now()}${imgExt}`;
                const imgPath = path.join("images", imgName);
                if (!fs.existsSync("images")) fs.mkdirSync("images");
                fs.writeFileSync(imgPath, img.buffer);
                imgSql = ", cover_image_url = ?";
                params.push("/images/" + imgName);
            }

            const pdf = req.validatedFiles.pdf_file;
            if (pdf) {
                if (!fs.existsSync("pdfs")) fs.mkdirSync("pdfs");
                const pdfName = `publication_${Date.now()}.pdf`;
                const pdfPath = path.join("pdfs", pdfName);
                fs.writeFileSync(pdfPath, pdf.buffer);
                pdfSql = ", pdf_file_url = ?";
                params.push("/pdfs/" + pdfName);
            }

            params.push(id);

            await q(
                `UPDATE publications
                 SET title = ?, description = ?
                 ${imgSql}
                 ${pdfSql}
                 WHERE id = ?`,
                params
            );

            res.json({ success: true });
        } catch (err) {
            console.error("PUT /publications/:id ERROR:", err);
            res.status(500).json({ error: err.message });
        }
    }
);

/* DELETE publication */
router.delete("/:id", auth, async (req, res) => {
    try {
        await q("DELETE FROM publications WHERE id = ?", [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        console.error("DELETE /publications/:id ERROR:", err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
