const express = require("express");
const router = express.Router();
const db = require("../db"); // Your MySQL connection
const bodyParser = require("body-parser");

// Middleware to parse JSON
router.use(bodyParser.json());

// SQL wrapper
function q(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

/*
 * POST /capture-email
 * Receives { email, fileName } and stores in DB
 */
router.post("/capture-email", async (req, res) => {
  try {
    const { email, fileName } = req.body;

    if (!email || !fileName) {
      return res.status(400).json({ error: "Both email and fileName are required" });
    }

    await q(
      `INSERT INTO email_captures (email, file_name) VALUES (?, ?)`,
      [email, fileName]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("POST /capture-email ERROR:", err);
    res.status(500).json({ error: "Failed to capture email" });
  }
});

module.exports = router;
