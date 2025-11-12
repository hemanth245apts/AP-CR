const fs = require("fs");
const path = require("path");
const multer = require("multer");

//  Configure multer to keep uploaded file in memory — not saved on disk yet
const storage = multer.memoryStorage();

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // Max 10 MB
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();

        // Reject double extensions like resume.pdf.exe
        if (file.originalname.split(".").length > 2) {
            return cb(new Error("Double extensions are not allowed"));
        }

        // Allow only .pdf files
        if (ext !== ".pdf") {
            return cb(new Error("Only .pdf files are allowed"));
        }

        // Basic MIME validation
        if (file.mimetype !== "application/pdf") {
            return cb(new Error("Invalid MIME type — must be application/pdf"));
        }

        cb(null, true);
    },
});

// Validate PDF binary structure and scan for malicious content
function isValidPDF(buffer) {
    const header = buffer.slice(0, 5).toString("utf8");
    const trailer = buffer.slice(-10).toString("utf8");

    if (!header.startsWith("%PDF-") || !trailer.includes("%%EOF")) {
        return false;
    }

    const textContent = buffer.toString("latin1");

    const suspiciousPatterns = [
        /<script[\s\S]*?>/i,
        /javascript:/i,
        /\/JS/i,
        /\/JavaScript/i,
        /\/AA/i,
        /\/OpenAction/i,
        /\/Launch/i,
        /\/RichMedia/i,
        /<iframe/i,
        /eval\s*\(/i,
        /<img[\s\S]*onerror=/i,
    ];

    for (const pattern of suspiciousPatterns) {
        if (pattern.test(textContent)) {
            console.warn("Detected malicious content in uploaded PDF.");
            return false;
        }
    }

    return true;
}

//  UPDATED: Validate *both* pdf_english and pdf_telugu
function pdfValidator(req, res, next) {
    try {
        const english = req.files?.pdf_english?.[0];
        const telugu = req.files?.pdf_telugu?.[0];

        //  Require at least one file
        if (!english && !telugu) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        //  Combine available files
        const files = [english, telugu].filter(Boolean);

        //  Validate each file using your existing logic
        for (const file of files) {
            const { originalname, buffer, mimetype } = file;

            if (path.extname(originalname).toLowerCase() !== ".pdf" ||
                mimetype !== "application/pdf") {
                return res.status(400).json({ message: "Invalid file type. Only PDF files are allowed." });
            }

            if (!isValidPDF(buffer)) {
                return res.status(400).json({ message: "Invalid or potentially unsafe PDF file" });
            }
        }
        req.validatedPDFs = {
            english,
            telugu
        };

        next();
    } catch (err) {
        console.error("PDF validation error:", err);
        res.status(500).json({ message: "PDF validation failed" });
    }
}

module.exports = { upload, pdfValidator };