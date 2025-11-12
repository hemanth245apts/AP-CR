const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const auth = require('../middleware/auth');
require('dotenv').config();

const router = express.Router();
const SECRET = process.env.JWT_SECRET; // fallback

// A fake hash to prevent timing attacks (random bcrypt hash of "fakepassword")
const FAKE_HASH = '$2b$10$CwTycUXWue0Thq9StjUM0uJ8gF/0U6qS0Zl8xjvYhZ0Qb8H6o5x5K';

// Helper: query db with Promise
const query = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });


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
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ message: 'Username and password required' });

    const now = new Date();

    // 1️⃣ Clean expired blocked users (no cron needed)
    await query(
      `DELETE FROM blocked_users
       WHERE failed_attempts >= 5
       AND first_attempt_time <= DATE_SUB(NOW(), INTERVAL 15 MINUTE)`
    );

    // 2️⃣ Check if user is blocked
    const blocked = await query('SELECT * FROM blocked_users WHERE username = ?', [username]);
    if (blocked.length > 0) {
      const userBlocked = blocked[0];
      const blockExpiry = new Date(userBlocked.first_attempt_time.getTime() + 15 * 60000);

      if (userBlocked.failed_attempts >= 5 && blockExpiry > now) {
        const remainingMs = blockExpiry - now;
        const remainingMinutes = Math.ceil(remainingMs / 60000);
        return res.status(403).json({
          message: `Too many failed attempts. Try again in ${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''}.`
        });
      }
    }

    // 3️⃣ Fetch user (may or may not exist)
    const results = await query('SELECT * FROM users WHERE username = ?', [username]);
    const user = results[0];

    // Always compare password (prevent timing attacks)
    const hashToCompare = user ? user.password : FAKE_HASH;
    const isMatch = await bcrypt.compare(password, hashToCompare);

    // 4️⃣ Handle invalid credentials
    if (!user || !isMatch) {
      if (blocked.length === 0) {
        await query(
          'INSERT INTO blocked_users (username, failed_attempts, first_attempt_time) VALUES (?, ?, ?)',
          [username, 1, now]
        );
      } else {
        const newAttempts = blocked[0].failed_attempts + 1;
        await query(
          'UPDATE blocked_users SET failed_attempts = ?, first_attempt_time = ? WHERE username = ?',
          [newAttempts, blocked[0].first_attempt_time, username]
        );
      }
      //return res.status(400).json({ message: 'Invalid username or password' });
      const remainingAttempts = Math.max(0, 5 - ((blocked[0]?.failed_attempts || 0) + 1));
        return res.status(400).json({
        message: `Invalid username or password. ${remainingAttempts > 0
            ? `${remainingAttempts} attempt${remainingAttempts > 1 ? 's' : ''} left.`
            : 'Account locked for 15 minutes.'}`
        });
    }

    // 5️⃣ Successful login → remove from blocked_users if exists
    await query('DELETE FROM blocked_users WHERE username = ?', [username]);

    // 6️⃣ Generate JWT
    const token = jwt.sign({ id: user.id, username: user.username }, SECRET, { expiresIn: '2h' });
    return res.json({ message: 'Login successful', token });

  } catch (err) {
    console.error('Login Error:', err);
    return res.status(500).json({ message: 'Something went wrong. Please try again later.' });
  }
});


//LOGOUT USER and block his JWT
router.post('/logout', auth, (req, res) => {
    const token = req.headers.authorization.split(' ')[1];
    const decoded = req.user;

    const expiry = new Date(decoded.exp * 1000); // JWT exp is in seconds

    db.query('INSERT INTO jwt_blocklist (token, expiry) VALUES (?, ?)', [token, expiry], (err) => {
        if (err) return res.status(500).json({ message: 'Logout failed' });

        return res.json({ message: 'Logged out successfully' });
    });
});




/*
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

        const token = jwt.sign({ id: user.id, username: user.username }, SECRET, { expiresIn: '2h' });
        return res.json({ message: 'Login successful', token });
    });
});

// Example protected route
router.get('/profile', auth, (req, res) => {
    res.json({ message: `Welcome ${req.user.username}`, user: req.user });
});
*/

module.exports = router;
