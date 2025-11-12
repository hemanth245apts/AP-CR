const express = require('express');
const router = express.Router();
const db = require('../db');
const verifyToken = require('../middleware/auth');
const path = require('path');
const fs = require('fs');
const { upload, imageValidator } = require('../middleware/validateimage');

// -----------------------------
// CREATE ROUTES
// -----------------------------

router.post('/classes', verifyToken, upload.fields([{ name: 'image_url', maxCount: 1 }]), imageValidator, (req, res) => {
  const activity_type = 'class';
  console.log(` POST /activities/${activity_type}`, req.body);
  const { title, description, duration, date, is_active } = req.body;

  if (!title || !description) {
    return res.status(400).json({ message: 'title, description are required' });
  }

  const file = req.files?.image_url?.[0];
  if (!file) {
    return res.status(400).json({ message: 'Image file is required' });
  }

  const ext = path.extname(file.originalname).toLowerCase();
  const safeName = activity_type.replace(/\s+/g, '_').toLowerCase();
  const newFileName = `${safeName}_${Date.now()}${ext}`;
  const newImagePath = path.join(__dirname, '../images', newFileName);
  fs.renameSync(file.path, newImagePath);

  const imageUrl = `/images/${newFileName}`;

  const query = `
    INSERT INTO activities (title, description, activity_type, duration, date, image_url, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  const values = [title, description, activity_type, duration || null, date || null, imageUrl, is_active ? 1 : 0];

  db.query(query, values, (err, result) => {
    if (err) {
      console.error('Database error (create):', err);
      return res.status(500).json({ message: 'Database error', error: err.sqlMessage || err.message });
    }
    res.status(201).json({ message: `${activity_type} created successfully.`, id: result.insertId });
  });
});

router.post('/seminars', verifyToken, upload.fields([{ name: 'image_url', maxCount: 1 }]), imageValidator, (req, res) => {
  const activity_type = 'seminar';
  console.log(` POST /activities/${activity_type}`, req.body);
  const { title, description, duration, date, is_active } = req.body;

  if (!title || !description) {
    return res.status(400).json({ message: 'title, description are required' });
  }

  const file = req.files?.image_url?.[0];
  if (!file) {
    return res.status(400).json({ message: 'Image file is required' });
  }

  const ext = path.extname(file.originalname).toLowerCase();
  const safeName = activity_type.replace(/\s+/g, '_').toLowerCase();
  const newFileName = `${safeName}_${Date.now()}${ext}`;
  const newImagePath = path.join(__dirname, '../images', newFileName);
  fs.renameSync(file.path, newImagePath);

  const imageUrl = `/images/${newFileName}`;

  const query = `
    INSERT INTO activities (title, description, activity_type, duration, date, image_url, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  const values = [title, description, activity_type, duration || null, date || null, imageUrl, is_active ? 1 : 0];

  db.query(query, values, (err, result) => {
    if (err) {
      console.error('Database error (create):', err);
      return res.status(500).json({ message: 'Database error', error: err.sqlMessage || err.message });
    }
    res.status(201).json({ message: `${activity_type} created successfully.`, id: result.insertId });
  });
});

router.post('/courses', verifyToken, upload.fields([{ name: 'image_url', maxCount: 1 }]), imageValidator, (req, res) => {
  const activity_type = 'course';
  console.log(` POST /activities/${activity_type}`, req.body);
  const { title, description, duration, date, is_active } = req.body;

  if (!title || !description) {
    return res.status(400).json({ message: 'title, description are required' });
  }

  const file = req.files?.image_url?.[0];
  if (!file) {
    return res.status(400).json({ message: 'Image file is required' });
  }

  const ext = path.extname(file.originalname).toLowerCase();
  const safeName = activity_type.replace(/\s+/g, '_').toLowerCase();
  const newFileName = `${safeName}_${Date.now()}${ext}`;
  const newImagePath = path.join(__dirname, '../images', newFileName);
  fs.renameSync(file.path, newImagePath);

  const imageUrl = `/images/${newFileName}`;

  const query = `
    INSERT INTO activities (title, description, activity_type, duration, date, image_url, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  const values = [title, description, activity_type, duration || null, date || null, imageUrl, is_active ? 1 : 0];

  db.query(query, values, (err, result) => {
    if (err) {
      console.error('Database error (create):', err);
      return res.status(500).json({ message: 'Database error', error: err.sqlMessage || err.message });
    }
    res.status(201).json({ message: `${activity_type} created successfully.`, id: result.insertId });
  });
});



// -----------------------------
// UPDATE ROUTES (Now handle file upload too)
// -----------------------------

router.put('/classes/:id', verifyToken, upload.fields([{ name: 'image_url', maxCount: 1 }]), imageValidator, (req, res) => {
  const activity_type = 'class';
  const { id } = req.params;
  const { title, description, duration, date, is_active } = req.body;

  console.log(` PUT /activities/${activity_type}/${id}`, req.body);

  if (!title || !description) {
    return res.status(400).json({ message: 'title, description are required' });
  }

  let imageUrl = req.body.image_url || null;
  const file = req.files?.image_url?.[0];

  if (file) {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = activity_type.replace(/\s+/g, '_').toLowerCase();
    const newFileName = `${safeName}_${Date.now()}${ext}`;
    const newImagePath = path.join(__dirname, '../images', newFileName);
    fs.renameSync(file.path, newImagePath);
    imageUrl = `/images/${newFileName}`;
  }

  const query = `
    UPDATE activities 
    SET title = ?, description = ?, duration = ?, date = ?, image_url = ?, is_active = ?, updated_at = NOW()
    WHERE id = ? AND activity_type = ?
  `;

  const values = [title, description, duration || null, date || null, imageUrl, is_active ? 1 : 0, id, activity_type];

  db.query(query, values, (err, result) => {
    if (err) {
      console.error('Database error (update):', err);
      return res.status(500).json({ message: 'Database error', error: err.message, code: err.code });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: `${activity_type} not found` });
    }

    res.json({ message: `${activity_type} updated successfully` });
  });
});

router.put('/seminars/:id', verifyToken, upload.fields([{ name: 'image_url', maxCount: 1 }]), imageValidator, (req, res) => {
  const activity_type = 'seminar';
  const { id } = req.params;
  const { title, description, duration, date, is_active } = req.body;

  console.log(` PUT /activities/${activity_type}/${id}`, req.body);

  if (!title || !description) {
    return res.status(400).json({ message: 'title, description are required' });
  }

  let imageUrl = req.body.image_url || null;
  const file = req.files?.image_url?.[0];

  if (file) {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = activity_type.replace(/\s+/g, '_').toLowerCase();
    const newFileName = `${safeName}_${Date.now()}${ext}`;
    const newImagePath = path.join(__dirname, '../images', newFileName);
    fs.renameSync(file.path, newImagePath);
    imageUrl = `/images/${newFileName}`;
  }

  const query = `
    UPDATE activities 
    SET title = ?, description = ?, duration = ?, date = ?, image_url = ?, is_active = ?, updated_at = NOW()
    WHERE id = ? AND activity_type = ?
  `;

  const values = [title, description, duration || null, date || null, imageUrl, is_active ? 1 : 0, id, activity_type];

  db.query(query, values, (err, result) => {
    if (err) {
      console.error('Database error (update):', err);
      return res.status(500).json({ message: 'Database error', error: err.message, code: err.code });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: `${activity_type} not found` });
    }

    res.json({ message: `${activity_type} updated successfully` });
  });
});

router.put('/courses/:id', verifyToken, upload.fields([{ name: 'image_url', maxCount: 1 }]), imageValidator, (req, res) => {
  const activity_type = 'course';
  const { id } = req.params;
  const { title, description, duration, date, is_active } = req.body;

  console.log(` PUT /activities/${activity_type}/${id}`, req.body);

  if (!title || !description) {
    return res.status(400).json({ message: 'title, description are required' });
  }

  let imageUrl = req.body.image_url || null;
  const file = req.files?.image_url?.[0];

  if (file) {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = activity_type.replace(/\s+/g, '_').toLowerCase();
    const newFileName = `${safeName}_${Date.now()}${ext}`;
    const newImagePath = path.join(__dirname, '../images', newFileName);
    fs.renameSync(file.path, newImagePath);
    imageUrl = `/images/${newFileName}`;
  }

  const query = `
    UPDATE activities 
    SET title = ?, description = ?, duration = ?, date = ?, image_url = ?, is_active = ?, updated_at = NOW()
    WHERE id = ? AND activity_type = ?
  `;

  const values = [title, description, duration || null, date || null, imageUrl, is_active ? 1 : 0, id, activity_type];

  db.query(query, values, (err, result) => {
    if (err) {
      console.error('Database error (update):', err);
      return res.status(500).json({ message: 'Database error', error: err.message, code: err.code });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: `${activity_type} not found` });
    }

    res.json({ message: `${activity_type} updated successfully` });
  });
});

// -----------------------------
// DELETE ROUTES
// -----------------------------

router.delete('/classes/:id', verifyToken, (req, res) => {
  const activity_type = 'class';
  const { id } = req.params;
  console.log(` DELETE /activities/${activity_type}/${id}`);

  db.query('DELETE FROM activities WHERE id = ? AND activity_type = ?', [id, activity_type], (err, result) => {
    if (err) {
      console.error('Database error (delete):', err);
      return res.status(500).json({ message: 'Database error', error: err.sqlMessage || err.message });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: `${activity_type} not found` });
    }
    res.json({ message: `${activity_type} deleted successfully` });
  });
});

router.delete('/seminars/:id', verifyToken, (req, res) => {
  const activity_type = 'seminar';
  const { id } = req.params;
  console.log(` DELETE /activities/${activity_type}/${id}`);

  db.query('DELETE FROM activities WHERE id = ? AND activity_type = ?', [id, activity_type], (err, result) => {
    if (err) {
      console.error('Database error (delete):', err);
      return res.status(500).json({ message: 'Database error', error: err.sqlMessage || err.message });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: `${activity_type} not found` });
    }
    res.json({ message: `${activity_type} deleted successfully` });
  });
});

router.delete('/courses/:id', verifyToken, (req, res) => {
  const activity_type = 'course';
  const { id } = req.params;
  console.log(` DELETE /activities/${activity_type}/${id}`);

  db.query('DELETE FROM activities WHERE id = ? AND activity_type = ?', [id, activity_type], (err, result) => {
    if (err) {
      console.error('Database error (delete):', err);
      return res.status(500).json({ message: 'Database error', error: err.sqlMessage || err.message });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: `${activity_type} not found` });
    }
    res.json({ message: `${activity_type} deleted successfully` });
  });
});

module.exports = router;