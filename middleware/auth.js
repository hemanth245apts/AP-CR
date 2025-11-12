const jwt = require('jsonwebtoken');
require('dotenv').config();
const db = require('../db'); // make sure this is your MySQL connection

const SECRET = process.env.JWT_SECRET;

function auth(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(403).json({ message: 'Token missing or malformed' });
    }

    const token = authHeader.split(' ')[1];

    // Check if token is in blocklist
    db.query('DELETE FROM jwt_blocklist WHERE expiry <= NOW()', (err) => {
        if (err) console.error('Error cleaning expired JWTs:', err);
    });

    db.query('SELECT * FROM jwt_blocklist WHERE token = ?', [token], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Something went wrong' });
        }
        if (results.length > 0) {
            return res.status(401).json({ message: 'Token is blocked' });
        }

        // Verify token normally
        jwt.verify(token, SECRET, (err, decoded) => {
            if (err) {
                const message = err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
                return res.status(401).json({ message });
            }
            req.user = decoded;
            next();
        });
    });
}

module.exports = auth;
