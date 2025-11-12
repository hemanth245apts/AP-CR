const fs = require('fs');
const path = require('path');
const multer = require('multer');

// Ensure "images" directory exists
const imageDir = path.join(__dirname, '../images');
if (!fs.existsSync(imageDir)) fs.mkdirSync(imageDir);

// Multer storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, imageDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path.extname(file.originalname).toLowerCase());
    },
});

// Multer upload — one file per key
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedExt = ['.jpg', '.jpeg', '.png'];
        const ext = path.extname(file.originalname).toLowerCase();

        if (file.originalname.split('.').length > 2) return cb(new Error('Double extensions are not allowed'));
        if (!allowedExt.includes(ext)) return cb(new Error('Only .jpg, .jpeg, and .png files are allowed'));
        cb(null, true);
    },
});

// Binary validation
function isValidImageBinary(filePath) {
    const buffer = fs.readFileSync(filePath);
    const bytes = Array.from(buffer.slice(0, 8));

    // JPEG
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return true;
    // PNG
    const pngMagic = [0x89, 0x50, 0x4e, 0x47];
    if (bytes[0] === pngMagic[0] && bytes[1] === pngMagic[1] && bytes[2] === pngMagic[2] && bytes[3] === pngMagic[3]) return true;

    return false;
}

// Master validator — one file per key
function imageValidator(req, res, next) {
    try {
        const keys = Object.keys(req.files || {});
        for (const key of keys) {
            const files = req.files[key];
            if (files.length > 1) return res.status(400).json({ message: `Multiple files not allowed for ${key}` });

            const file = files[0];
            const filePath = file.path;

            if (!['image/jpeg', 'image/png'].includes(file.mimetype)) {
                fs.unlinkSync(filePath);
                return res.status(400).json({ message: `Invalid MIME type for ${key}` });
            }

            if (!isValidImageBinary(filePath)) {
                fs.unlinkSync(filePath);
                return res.status(400).json({ message: `Invalid or corrupted image for ${key}` });
            }

            if (file.originalname.split('.').length > 2) {
                fs.unlinkSync(filePath);
                return res.status(400).json({ message: `Multiple extensions not allowed for ${key}` });
            }
        }
        next();
    } catch (err) {
        console.error('Image validation error:', err);
        res.status(500).json({ message: 'Image validation failed' });
    }
}

module.exports = { upload, imageValidator };
