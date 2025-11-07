const fs = require('fs');
const path = require('path');
const multer = require('multer');

// ✅ Ensure the "images" directory exists
const imageDir = path.join(__dirname, '../images');
if (!fs.existsSync(imageDir)) {
    fs.mkdirSync(imageDir);
}

// ✅ Configure multer to save directly to "images/"
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, imageDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path.extname(file.originalname).toLowerCase());
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Max 5MB
    fileFilter: (req, file, cb) => {
        const allowedExt = ['.jpg', '.jpeg', '.png'];
        const ext = path.extname(file.originalname).toLowerCase();

        // ❌ Block multiple extensions like image.jpg.exe
        if (file.originalname.split('.').length > 2) {
            return cb(new Error('Double extensions are not allowed'));
        }

        if (!allowedExt.includes(ext)) {
            return cb(new Error('Only .jpg, .jpeg, and .png files are allowed'));
        }

        cb(null, true);
    },
});

// ✅ Binary content validation
function isValidImageBinary(filePath) {
    const buffer = fs.readFileSync(filePath);
    const bytes = Array.from(buffer.slice(0, 8));

    // JPEG magic numbers
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return true;

    // PNG magic numbers
    const pngMagic = [0x89, 0x50, 0x4e, 0x47];
    if (
        bytes[0] === pngMagic[0] &&
        bytes[1] === pngMagic[1] &&
        bytes[2] === pngMagic[2] &&
        bytes[3] === pngMagic[3]
    )
        return true;

    return false;
}

// ✅ Master middleware for image validation
function imageValidator(req, res, next) {
    try {
        if (!req.file) return res.status(400).json({ message: 'No image uploaded' });

        const filePath = req.file.path;
        const ext = path.extname(req.file.originalname).toLowerCase();

        // ✅ MIME type validation
        if (!['image/jpeg', 'image/png'].includes(req.file.mimetype)) {
            fs.unlinkSync(filePath);
            return res.status(400).json({ message: 'Invalid image MIME type' });
        }

        // ✅ Binary validation (magic number check)
        if (!isValidImageBinary(filePath)) {
            fs.unlinkSync(filePath);
            return res.status(400).json({ message: 'Invalid image file (fake or corrupted)' });
        }

        // ✅ Double extension check
        if (req.file.originalname.split('.').length > 2) {
            fs.unlinkSync(filePath);
            return res.status(400).json({ message: 'File with multiple extensions not allowed' });
        }

        next();
    } catch (err) {
        console.error('Image validation error:', err);
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.status(500).json({ message: 'Image validation failed' });
    }
}

module.exports = { upload, imageValidator };
