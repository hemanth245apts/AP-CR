const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const auth = require('../middleware/auth');
require('dotenv').config();

const router = express.Router();
const SECRET = process.env.JWT_SECRET; // fallback

//REGISTER USER
router.post('/register', (req, res) => {
    const { username, password, confirmPassword } = req.body;

    // Basic validation
    if (!username || !password || !confirmPassword) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    // Password strength validation
    const passwordRegex = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;
    if (!passwordRegex.test(password)) {
        return res.status(400).json({
            message: 'Password must be at least 8 characters long, include at least one uppercase letter, one number, and one special character'
        });
    }

    if (password !== confirmPassword) {
        return res.status(400).json({ message: 'Passwords do not match' });
    }

    // Check if username already exists
    db.query('SELECT * FROM users WHERE username = ?', [username], async (err, results) => {
        if (err) {
            console.error('DB Error:', err); // log full error
            return res.status(500).json({ message: 'Something went wrong. Please try again later.' });
        }

        if (results.length > 0) {
            return res.status(400).json({ message: 'Username already exists' });
        }

        try {
            const hashedPassword = await bcrypt.hash(password, 10);

            db.query(
                'INSERT INTO users (username, password) VALUES (?, ?)',
                [username, hashedPassword],
                (err2, result) => {
                    if (err2) {
                        console.error('DB Error:', err2); // log full error
                        return res.status(500).json({ message: 'Something went wrong. Please try again later.' });
                    }
                    return res.status(201).json({ message: 'User registered successfully' });
                }
            );
        } catch (hashErr) {
            console.error('Hashing Error:', hashErr); // log full error
            return res.status(500).json({ message: 'Something went wrong. Please try again later.' });
        }
    });
});

// LOGIN USER
router.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password)
        return res.status(400).json({ message: 'Username and password required' });

    db.query('SELECT * FROM users WHERE username = ?', [username], async (err, results) => {
        if (err) {
            console.error('DB Error:', err);
            return res.status(500).json({ message: 'Something went wrong. Please try again later.' });
        }
        if (results.length === 0)
            return res.status(400).json({ message: 'Invalid username or password' });

        const user = results[0];

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid username or password' });

        const token = jwt.sign({ id: user.id, username: user.username }, SECRET, { expiresIn: '15min' });
        return res.json({ message: 'Login successful', token });
    });
});

// Example protected route
router.get('/profile', auth, (req, res) => {
    res.json({ message: `Welcome ${req.user.username}`, user: req.user });
});

module.exports = router;
