const fs = require("fs");
const path = require("path");
const multer = require("multer");

// ⚙️ Configure multer to keep uploaded file in memory — not saved on disk yet
const storage = multer.memoryStorage();

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // Max 10 MB
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();

        // ❌ Reject double extensions like resume.pdf.exe
        if (file.originalname.split(".").length > 2) {
            return cb(new Error("Double extensions are not allowed"));
        }

        // ✅ Allow only .pdf files
        if (ext !== ".pdf") {
            return cb(new Error("Only .pdf files are allowed"));
        }

        // ✅ Basic MIME validation
        if (file.mimetype !== "application/pdf") {
            return cb(new Error("Invalid MIME type — must be application/pdf"));
        }

        cb(null, true);
    },
});

// ✅ Validate PDF binary structure and scan for malicious content
function isValidPDF(buffer) {
    // PDFs start with "%PDF-" and end with "%%EOF"
    const header = buffer.slice(0, 5).toString("utf8");
    const trailer = buffer.slice(-10).toString("utf8");

    if (!header.startsWith("%PDF-") || !trailer.includes("%%EOF")) {
        return false;
    }

    // 🚫 Check for malicious tags or embedded scripts
    const textContent = buffer.toString("latin1");

    const suspiciousPatterns = [
        /<script[\s\S]*?>/i,
        /javascript:/i,
        /\/JS/i,
        /\/JavaScript/i,
        /\/AA/i, // automatic actions
        /\/OpenAction/i, // auto-execution actions
        /\/Launch/i,
        /\/RichMedia/i, // embedded video/flash
        /<iframe/i,
        /eval\s*\(/i,
        /<img[\s\S]*onerror=/i,
    ];

    for (const pattern of suspiciousPatterns) {
        if (pattern.test(textContent)) {
            console.warn("⚠️ Detected malicious content in uploaded PDF.");
            return false;
        }
    }

    return true;
}

// ✅ Main middleware to validate PDF securely
function pdfValidator(req, res, next) {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        const { originalname, buffer, mimetype } = req.file;

        // ✅ Confirm correct extension and MIME
        if (path.extname(originalname).toLowerCase() !== ".pdf" || mimetype !== "application/pdf") {
            return res.status(400).json({ message: "Invalid file type. Only PDF files are allowed." });
        }

        // ✅ Validate PDF structure
        if (!isValidPDF(buffer)) {
            return res.status(400).json({ message: "Invalid or potentially unsafe PDF file" });
        }

        // ✅ Passed all checks → attach to req for route use
        req.pdfBuffer = buffer;
        req.pdfOriginalName = originalname;
        next();
    } catch (err) {
        console.error("PDF validation error:", err);
        res.status(500).json({ message: "PDF validation failed" });
    }
}

module.exports = { upload, pdfValidator };
