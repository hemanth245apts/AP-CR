const multer = require("multer");
const fs = require("fs");
const path = require("path");

// Memory storage: files only saved after validation
const storage = multer.memoryStorage();

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
});

// middleware for one image + one pdf used in publications.js 
function validateFiles(req, res, next) {
    try {
        const img = req.files?.cover_image?.[0];
        const pdf = req.files?.pdf_file?.[0];

        if (!img || !pdf) {
            return res.status(400).json({ error: "Both cover_image and pdf_file are required" });
        }

        // --- IMAGE VALIDATION ---
        const allowedImgExt = [".jpg", ".jpeg", ".png"];
        const imgExt = path.extname(img.originalname).toLowerCase();
        if (!allowedImgExt.includes(imgExt)) return res.status(400).json({ error: "Invalid image extension" });
        if (!["image/jpeg", "image/png"].includes(img.mimetype)) return res.status(400).json({ error: "Invalid image MIME type" });
        // simple magic number check
        const imgMagic = img.buffer.slice(0, 8);
        if (!(imgMagic[0] === 0xff && imgMagic[1] === 0xd8) && !(imgMagic[0] === 0x89 && imgMagic[1] === 0x50)) {
            return res.status(400).json({ error: "Corrupted image" });
        }

        // --- PDF VALIDATION ---
        const pdfExt = path.extname(pdf.originalname).toLowerCase();
        if (pdfExt !== ".pdf") return res.status(400).json({ error: "Invalid PDF extension" });
        if (pdf.mimetype !== "application/pdf") return res.status(400).json({ error: "Invalid PDF MIME type" });
        const header = pdf.buffer.slice(0, 5).toString("utf8");
        const trailer = pdf.buffer.slice(-10).toString("utf8");
        if (!header.startsWith("%PDF-") || !trailer.includes("%%EOF")) {
            return res.status(400).json({ error: "Corrupted or unsafe PDF" });
        }

        // Attach validated files
        req.validatedFiles = { cover_image: img, pdf_file: pdf };
        next();
    } catch (err) {
        console.error("File validation error:", err);
        res.status(500).json({ error: "File validation failed" });
    }
}

// Export a single middleware for route
module.exports = {
    upload: upload.fields([
        { name: "cover_image", maxCount: 1 },
        { name: "pdf_file", maxCount: 1 },
        { name: "pdf", maxCount: 1 },
        {name:"image"   , maxCount: 1},
    ]),
    validateFiles,
};
