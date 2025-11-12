const multer = require("multer");
const path = require("path");

// --- Configure Multer with in-memory storage ---
const storage = multer.memoryStorage();

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // Max 10 MB
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();

        // Reject files with double extensions like "file.pdf.exe"
        if (file.originalname.split(".").length > 2) {
            return cb(new Error("Double extensions are not allowed"));
        }

        // Only allow .pdf extension
        if (ext !== ".pdf") {
            return cb(new Error("Only .pdf files are allowed"));
        }

        // Ensure MIME type matches
        if (file.mimetype !== "application/pdf") {
            return cb(new Error("Invalid MIME type — must be application/pdf"));
        }

        cb(null, true);
    },
});

// --- Validate internal PDF content ---
function isValidPDF(buffer) {
    const header = buffer.slice(0, 5).toString("utf8");
    const trailer = buffer.slice(-10).toString("utf8");

    // Ensure it starts and ends like a real PDF
    if (!header.startsWith("%PDF-") || !trailer.includes("%%EOF")) {
        return false;
    }

    const textContent = buffer.toString("latin1");

    // Detect potentially malicious patterns
    const badPatterns = [
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

    return !badPatterns.some((pattern) => pattern.test(textContent));
}

// --- Middleware: Validate the uploaded PDF file ---
function validatePDF(req, res, next) {
    try {
        const pdfFile = req.file;

        if (!pdfFile) {
            return res.status(400).json({ message: "No PDF file uploaded." });
        }

        const { originalname, mimetype, buffer } = pdfFile;

        // Check MIME and extension again for safety
        if (
            path.extname(originalname).toLowerCase() !== ".pdf" ||
            mimetype !== "application/pdf"
        ) {
            return res
                .status(400)
                .json({ message: "Invalid file type. Only PDF files are allowed." });
        }

        // Check internal PDF structure
        if (!isValidPDF(buffer)) {
            return res
                .status(400)
                .json({ message: "Invalid or potentially unsafe PDF file." });
        }

        // ✅ Attach the validated file for use in route
        req.validatedPDF = pdfFile;
        next();
    } catch (err) {
        console.error("PDF validation error:", err);
        return res.status(500).json({ message: "PDF validation failed." });
    }
}

module.exports = { upload, validatePDF };
