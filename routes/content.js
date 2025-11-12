// routes/content.js
const express = require('express');
const router = express.Router();
const db = require('../db');

/* =====================================================
   ACTIVITIES ROUTES (Classes, Seminars, Courses)
===================================================== */

// GET /activities/classes
router.get('/activities/classes', (req, res) => {
  const query = "SELECT * FROM activities WHERE activity_type = 'class' AND is_active = 1";
  db.query(query, (err, results) => {
    if (err) {
      console.error('❌ Database error:', err.message);
      return res.status(500).json({ message: 'Database error', error: err.message });
    }
    res.json(results);
  });
});

// GET /activities/seminars
router.get('/activities/seminars', (req, res) => {
  const query = "SELECT * FROM activities WHERE activity_type = 'seminar' AND is_active = 1";
  db.query(query, (err, results) => {
    if (err) {
      console.error('❌ Database error:', err.message);
      return res.status(500).json({ message: 'Database error', error: err.message });
    }
    res.json(results);
  });
});

// GET /activities/courses
router.get('/activities/courses', (req, res) => {
  const query = "SELECT * FROM activities WHERE activity_type = 'course' AND is_active = 1";
  db.query(query, (err, results) => {
    if (err) {
      console.error('❌ Database error:', err.message);
      return res.status(500).json({ message: 'Database error', error: err.message });
    }
    res.json(results);
  });
});

/* =====================================================
   ARCHIVES & CIRCULARS ROUTES
===================================================== */

// GET /archives
router.get('/archives', (req, res) => {
  const { year, startDate, endDate } = req.query;
  let query = 'SELECT * FROM archives WHERE 1=1';
  const params = [];

  if (year) {
    query += ' AND YEAR(date) = ?';
    params.push(year);
  }
  if (startDate && endDate) {
    query += ' AND date BETWEEN ? AND ?';
    params.push(startDate, endDate);
  }

  db.query(query, params, (err, results) => {
    if (err) {
      console.error('❌ Database error:', err.message);
      return res.status(500).json({ message: 'Database error', error: err.message });
    }
    res.json(results);
  });
});

// GET /circulars
router.get('/circulars', (req, res) => {
  const { year, startDate, endDate } = req.query;
  let query = 'SELECT * FROM circulars WHERE 1=1';
  const params = [];

  if (year) {
    query += ' AND YEAR(date) = ?';
    params.push(year);
  }
  if (startDate && endDate) {
    query += ' AND date BETWEEN ? AND ?';
    params.push(startDate, endDate);
  }

  db.query(query, params, (err, results) => {
    if (err) {
      console.error('❌ Database error:', err.message);
      return res.status(500).json({ message: 'Database error', error: err.message });
    }
    res.json(results);
  });
});

/* =====================================================
   PUBLICATIONS & GALLERY ROUTES
===================================================== */

// GET /publications
router.get('/publications', (req, res) => {
  db.query('SELECT * FROM publications', (err, results) => {
    if (err) {
      console.error('❌ Database error:', err.message);
      return res.status(500).json({ message: 'Database error', error: err.message });
    }
    res.json(results);
  });
});

// GET /gallery/photos
router.get('/gallery/photos', (req, res) => {
  db.query('SELECT * FROM gallery_photos ORDER BY date DESC', (err, results) => {
    if (err) {
      console.error('❌ Database error:', err.message);
      return res.status(500).json({ message: 'Database error', error: err.message });
    }
    res.json(results);
  });
});

// GET /gallery/videos
router.get('/gallery/videos', (req, res) => {
  db.query('SELECT * FROM gallery_videos ORDER BY date DESC', (err, results) => {
    if (err) {
      console.error('❌ Database error:', err.message);
      return res.status(500).json({ message: 'Database error', error: err.message });
    }
    res.json(results);
  });
});

/* =====================================================
   LINKS ROUTES
===================================================== */

// GET /links/media-bodies
router.get('/links/media-bodies', (req, res) => {
  const query = 'SELECT * FROM media_bodies_links ORDER BY name ASC';
  db.query(query, (err, results) => {
    if (err) {
      console.error('❌ Database error:', err.sqlMessage || err.message);
      return res.status(500).json({
        message: 'Database error',
        error: err.sqlMessage || err.message
      });
    }
    res.json(results);
  });
});

// GET /links/portals
router.get('/links/portals', (req, res) => {
  const query = 'SELECT * FROM portal_links ORDER BY name ASC';
  db.query(query, (err, results) => {
    if (err) {
      console.error('❌ Database error:', err.sqlMessage || err.message);
      return res.status(500).json({
        message: 'Database error',
        error: err.sqlMessage || err.message
      });
    }
    res.json(results);
  });
});

/* =====================================================
   ACTIVE SEMINARS & COURSES
===================================================== */

// GET /seminars/active
router.get('/seminars/active', (req, res) => {
  const query = `
    SELECT * FROM activities 
    WHERE activity_type = 'seminar' 
    AND is_active = 1 
    ORDER BY date DESC
  `;
  db.query(query, (err, results) => {
    if (err) {
      console.error('❌ Database error:', err.message);
      return res.status(500).json({ message: 'Database error', error: err.message });
    }
    res.json(results);
  });
});

// GET /courses/active
router.get('/courses/active', (req, res) => {
  const query = `
    SELECT * FROM activities 
    WHERE activity_type = 'course' 
    AND is_active = 1 
    ORDER BY date DESC
  `;
  db.query(query, (err, results) => {
    if (err) {
      console.error('❌ Database error:', err.message);
      return res.status(500).json({ message: 'Database error', error: err.message });
    }
    res.json(results);
  });
});

module.exports = router;