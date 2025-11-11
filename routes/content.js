// routes/content.js
const express = require('express');
const router = express.Router();
const db = require('../db');

/* 
  Activities Routes
  (Classes, Seminars, Courses)
*/

//  GET /activities/classes
router.get('/activities/classes', (req, res) => {
  const query = "SELECT * FROM activities WHERE activity_type = 'class' AND is_active = 1";
  db.query(query, (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ message: 'Database error' });
    }
    res.json(results);
  });
});

//  GET /activities/seminars
router.get('/activities/seminars', (req, res) => {
  const query = "SELECT * FROM activities WHERE activity_type = 'seminar' AND is_active = 1";
  db.query(query, (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ message: 'Database error' });
    }
    res.json(results);
  });
});

//  GET /activities/courses
router.get('/activities/courses', (req, res) => {
  const query = "SELECT * FROM activities WHERE activity_type = 'course' AND is_active = 1";
  db.query(query, (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ message: 'Database error' });
    }
    res.json(results);
  });
});

/* 
  Archives and Circulars Routes
*/

//  GET /archives
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
      console.error('Database error:', err);
      return res.status(500).json({ message: 'Database error' });
    }
    res.json(results);
  });
});

//  GET /circulars
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
      console.error('Database error:', err);
      return res.status(500).json({ message: 'Database error' });
    }
    res.json(results);
  });
});

/* 
  Publications & Gallery Routes
*/

//  GET /publications
router.get('/publications', (req, res) => {
  db.query('SELECT * FROM publications', (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ message: 'Database error' });
    }
    res.json(results);
  });
});

//  GET /gallery/photos
router.get('/gallery/photos', (req, res) => {
  db.query('SELECT * FROM gallery_photos ORDER BY date DESC', (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ message: 'Database error' });
    }
    res.json(results);
  });
});


module.exports = router;
