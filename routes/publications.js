const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const db = require("../db");
const auth = require("../middleware/auth");
const { upload, validateFiles } = require("../middleware/validatefile");

// Helper: Promise wrapper for DB queries
function q(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

/* =====================================================
   GET all publications (Public route)
===================================================== */
router.get("/", async (req, res) => {
  try {
    const rows = await q("SELECT * FROM publications ORDER BY id DESC");
    return res.status(200).json(rows);
  } catch (err) {
    console.error("GET /publications ERROR:", err);
    return res.status(500).json({
      error: "Internal server error while fetching publications.",
      details: err.message,
    });
  }
});

/* =====================================================
   CREATE publication (Protected route)
===================================================== */
router.post("/", auth, upload, validateFiles, async (req, res) => {
  try {
    const { title, description } = req.body;
    const img = req.validatedFiles?.cover_image;
    const pdf = req.validatedFiles?.pdf_file;

    // Validate fields
    if (!title || !description)
      return res.status(400).json({
        error: "Title and description are required fields.",
      });

    if (!img)
      return res.status(400).json({
        error: "No image provided. 'cover_image' is required.",
      });

    if (!pdf)
      return res.status(400).json({
        error: "No PDF provided. 'pdf_file' is required.",
      });

    // Create directories if not exist
    if (!fs.existsSync("images")) fs.mkdirSync("images");
    if (!fs.existsSync("pdfs")) fs.mkdirSync("pdfs");

    // Save cover image
    const imgExt = path.extname(img.originalname);
    const imgName = `cover_${Date.now()}${imgExt}`;
    const imgPath = path.join("images", imgName);
    fs.writeFileSync(imgPath, img.buffer);
    const coverUrl = "/images/" + imgName;

    // Save PDF
    const pdfName = `publication_${Date.now()}.pdf`;
    const pdfPath = path.join("pdfs", pdfName);
    fs.writeFileSync(pdfPath, pdf.buffer);
    const pdfUrl = "/pdfs/" + pdfName;

    // Insert into DB
    await q(
      `INSERT INTO publications (title, description, cover_image_url, pdf_file_url)
       VALUES (?, ?, ?, ?)`,
      [title, description, coverUrl, pdfUrl]
    );

    return res.status(201).json({
      success: true,
      message: "Publication created successfully.",
    });
  } catch (err) {
    console.error("POST /publications ERROR:", err);
    return res.status(500).json({
      error: "Internal server error while creating publication.",
      details: err.message,
    });
  }
});

/* =====================================================
   UPDATE publication (Protected route)
===================================================== */
router.put("/:id", auth, upload, validateFiles, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description } = req.body;

    if (!id || isNaN(id))
      return res.status(400).json({ error: "Invalid publication ID." });

    const existing = await q("SELECT * FROM publications WHERE id = ?", [id]);
    if (existing.length === 0)
      return res.status(404).json({ error: "Publication not found." });

    const params = [title, description];
    let imgSql = "",
      pdfSql = "";

    const img = req.validatedFiles?.cover_image;
    if (img) {
      const imgExt = path.extname(img.originalname);
      const imgName = `cover_${Date.now()}${imgExt}`;
      const imgPath = path.join("images", imgName);
      if (!fs.existsSync("images")) fs.mkdirSync("images");
      fs.writeFileSync(imgPath, img.buffer);
      imgSql = ", cover_image_url = ?";
      params.push("/images/" + imgName);
    }

    const pdf = req.validatedFiles?.pdf_file;
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

    return res.status(200).json({
      success: true,
      message: "Publication updated successfully.",
    });
  } catch (err) {
    console.error("PUT /publications/:id ERROR:", err);
    return res.status(500).json({
      error: "Internal server error while updating publication.",
      details: err.message,
    });
  }
});

/* =====================================================
   DELETE publication (Protected route)
===================================================== */
router.delete("/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || isNaN(id))
      return res.status(400).json({ error: "Invalid publication ID." });

    const existing = await q("SELECT * FROM publications WHERE id = ?", [id]);
    if (existing.length === 0)
      return res.status(404).json({ error: "Publication not found." });

    await q("DELETE FROM publications WHERE id = ?", [id]);

    return res.status(200).json({
      success: true,
      message: "Publication deleted successfully.",
    });
  } catch (err) {
    console.error("DELETE /publications/:id ERROR:", err);
    return res.status(500).json({
      error: "Internal server error while deleting publication.",
      details: err.message,
    });
  }
});

module.exports = router;
