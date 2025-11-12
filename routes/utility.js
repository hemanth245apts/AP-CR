const express = require("express");
const router = express.Router();
const db = require("../db");
const bodyParser = require("body-parser");

// Parse JSON body
router.use(bodyParser.json());

// SQL helper
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
router.post("/capture-email", async (req, res, next) => {
  try {
    const { email, fileName } = req.body;

    if (!email || !fileName) {
      return res.status(400).json({ error: "Both email and fileName are required." });
    }

    await q(
      `INSERT INTO email_captures (email, file_name) VALUES (?, ?)`,
      [email, fileName]
    );

    return res.status(200).json({ success: true });
  } catch (err) {
    next(err); // Pass to global error handler in server.js
  }
});

module.exports = router;
