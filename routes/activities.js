const express = require('express');
const router = express.Router();
const db = require('../db');

// Debug confirmation
console.log("✅ activities.js routes loaded");

// -----------------------------
// Helper to create a new activity
// -----------------------------
function createActivity(activity_type, req, res) {
  const { title, description, duration, date, image_url, is_active } = req.body;

  if (!title || !description || !image_url) {
    return res.status(400).json({
      message: 'title, description, and image_url are required'
    });
  }

  const query = `
    INSERT INTO activities (title, description, activity_type, duration, date, image_url, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  const values = [
    title,
    description,
    activity_type,
    duration || null,
    date || null,
    image_url,
    is_active ? 1 : 0
  ];

  db.query(query, values, (err, result) => {
    if (err) {
      console.error('❌ Database error (create):', err);
      return res.status(500).json({
        message: 'Database error',
        error: err.sqlMessage || err.message
      });
    }
    res.status(201).json({
      message: `${activity_type} created successfully.`,
      id: result.insertId
    });
  });
}

// -----------------------------
// Helper to update an activity
// -----------------------------
function updateActivity(activity_type, req, res) {
  const { id } = req.params;
  const { title, description, duration, date, image_url, is_active } = req.body;

  console.log(`➡️ PUT /activities/${activity_type}/${id}`, req.body);

  const query = `
    UPDATE activities 
    SET 
      title = ?, 
      description = ?, 
      duration = ?, 
      date = ?, 
      image_url = ?, 
      is_active = ?, 
      updated_at = NOW()
    WHERE id = ? AND activity_type = ?
  `;

  const values = [
    title || null,
    description || null,
    duration || null,
    date || null,
    image_url || null,
    is_active ? 1 : 0,
    id,
    activity_type
  ];

  db.query(query, values, (err, result) => {
    if (err) {
      console.error('❌ Database error (update):', err);
      return res.status(500).json({
        message: 'Database error',
        error: err.sqlMessage || err.message,
        code: err.code
      });
    }

    if (result.affectedRows === 0) {
      console.warn(`⚠️ ${activity_type} not found with ID:`, id);
      return res.status(404).json({ message: `${activity_type} not found` });
    }

    console.log(`✅ ${activity_type} updated successfully (ID: ${id})`);
    res.json({ message: `${activity_type} updated successfully` });
  });
}

// -----------------------------
// Helper to delete an activity
// -----------------------------
function deleteActivity(activity_type, req, res) {
  const { id } = req.params;
  console.log(`🗑️ DELETE /activities/${activity_type}/${id}`);

  db.query(
    'DELETE FROM activities WHERE id = ? AND activity_type = ?',
    [id, activity_type],
    (err, result) => {
      if (err) {
        console.error('❌ Database error (delete):', err);
        return res.status(500).json({
          message: 'Database error',
          error: err.sqlMessage || err.message
        });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: `${activity_type} not found` });
      }
      res.json({ message: `${activity_type} deleted successfully` });
    }
  );
}

// -----------------------------
// ROUTES
// -----------------------------

// CREATE
router.post('/classes', (req, res) => createActivity('class', req, res));
router.post('/seminars', (req, res) => createActivity('seminar', req, res));
router.post('/courses', (req, res) => createActivity('course', req, res));

// UPDATE
router.put('/classes/:id', (req, res) => updateActivity('class', req, res));
router.put('/seminars/:id', (req, res) => updateActivity('seminar', req, res));
router.put('/courses/:id', (req, res) => updateActivity('course', req, res));

// DELETE
router.delete('/classes/:id', (req, res) => deleteActivity('class', req, res));
router.delete('/seminars/:id', (req, res) => deleteActivity('seminar', req, res));
router.delete('/courses/:id', (req, res) => deleteActivity('course', req, res));

module.exports = router;