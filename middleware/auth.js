const jwt = require('jsonwebtoken');
require('dotenv').config(); // Load environment variables

const SECRET = process.env.JWT_SECRET; // fallback for dev

function auth(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(403).json({ message: 'Token missing or malformed' });
    }

    const token = authHeader.split(' ')[1];

    jwt.verify(token, SECRET, (err, decoded) => {
        if (err) {
            const message = err.name === 'TokenExpiredError'
                ? 'Token expired'
                : 'Invalid token';
            return res.status(401).json({ message });
        }
        req.user = decoded;
        next();
    });
}
module.exports = auth;
