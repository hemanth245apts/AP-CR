const express = require('express');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const auth = require('../middleware/auth');
const { upload, imageValidator } = require('../middleware/validateimage');

const router = express.Router();


// Check for malicious text input
function isMaliciousText(text) {
  const lower = text.toLowerCase();
  const badPatterns = [
    /<script.*?>.*?<\/script>/g,
    /on\w+\s*=/g,
    /javascript:/g,
    /<.*?>/g,
    /eval\s*\(/g,
    /base64,/g,
    /drop\s+table/g,
    /union\s+select/g,
    /--/g
  ];
  return badPatterns.some((pattern) => pattern.test(lower));
}

/**
 * POST /homepage/officials
 * Uploads an official’s image and data securely
 */
router.post(
  '/homepage/officials',
  auth,
  upload.single('image'),
  imageValidator,
  (req, res) => {
    const { name, title, link_url, display_order } = req.body;

    if (!name || !title) {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'Name and title are required' });
    }

    // Sanitize display_order or default to 1
    const order = parseInt(display_order) || 1;

    const ext = path.extname(req.file.originalname).toLowerCase();
    const safeName = name.replace(/\s+/g, '_').toLowerCase();
    const newFileName = `${safeName}_${Date.now()}${ext}`;
    const newImagePath = path.join(__dirname, '../images', newFileName);
    fs.renameSync(req.file.path, newImagePath);

    const imageUrl = `/images/${newFileName}`;

    const insertQuery = `
      INSERT INTO homepage_officials (name, title, image_url, link_url, display_order)
      VALUES (?, ?, ?, ?, ?)
    `;
    const values = [name.trim(), title.trim(), imageUrl, link_url || null, order];

    db.query(insertQuery, values, (err, result) => {
      if (err) {
        console.error('Database insert error:', err);
        if (fs.existsSync(newImagePath)) fs.unlinkSync(newImagePath);
        return res.status(500).json({ message: 'Database error' });
      }

      res.status(201).json({
        message: 'Official added successfully',
        official: {
          id: result.insertId,
          name,
          title,
          imageUrl,
          link_url,
          display_order: order,
        },
      });
    });
  }
);

/**
 * POST /homepage/carousel
 * Uploads a new carousel image with alt text and display order
 */
router.post(
  '/homepage/carousel',
  auth,
  upload.single('image'),
  imageValidator,
  (req, res) => {
    const { alt_text, display_order } = req.body;

    if (!alt_text || typeof alt_text !== 'string' || alt_text.trim().length === 0) {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'alt_text is required' });
    }

    if (isMaliciousText(alt_text)) {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'Malicious content detected in alt_text' });
    }

    // Sanitize display_order or default to 1
    const order = parseInt(display_order) || 1;

    const ext = path.extname(req.file.originalname).toLowerCase();
    const safeName = `carousel_${Date.now()}${ext}`;
    const newImagePath = path.join(__dirname, '../images', safeName);
    fs.renameSync(req.file.path, newImagePath);

    const imageUrl = `/images/${safeName}`;

    const insertQuery = `
      INSERT INTO homepage_carousel (alt_text, image_url, display_order)
      VALUES (?, ?, ?)
    `;
    const values = [alt_text.trim(), imageUrl, order];

    db.query(insertQuery, values, (err, result) => {
      if (err) {
        console.error('Database insert error:', err);
        if (fs.existsSync(newImagePath)) fs.unlinkSync(newImagePath);
        return res.status(500).json({ message: 'Database error' });
      }

      res.status(201).json({
        message: 'Carousel image uploaded successfully',
        carousel: {
          id: result.insertId,
          alt_text,
          imageUrl,
          display_order: order,
        },
      });
    });
  }
);


//Delete Carousel based on Image url
router.post('/homepage/deleteCarousel', auth, (req, res) => {
  const { image_url } = req.body;

  if (!image_url) {
    return res.status(400).json({ message: 'Image URL is required' });
  }
  // Step 1: Find record in DB
  const selectQuery = 'SELECT image_url FROM homepage_carousel WHERE image_url = ?';
  db.query(selectQuery, [image_url], (err, rows) => {
    if (err) {
      console.error(' Database select error:', err);
      return res.status(500).json({ message: 'Database error' });
    }

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Image not found in database' });
    }

    // Step 2: Delete image file from folder
    const imgPath = path.join(__dirname, '..', rows[0].image_url);
    try {
      if (fs.existsSync(imgPath)) {
        fs.unlinkSync(imgPath);
        console.log(' Deleted image file:', imgPath);
      } else {
        console.warn(' Image file not found on disk:', imgPath);
      }
    } catch (fileErr) {
      console.error(' Error deleting image file:', fileErr);
    }

    // Step 3: Delete DB record
    const deleteQuery = 'DELETE FROM homepage_carousel WHERE image_url = ?';
    db.query(deleteQuery, [image_url], (err2, result) => {
      if (err2) {
        console.error(' Database delete error:', err2);
        return res.status(500).json({ message: 'Database error while deleting record' });
      }

      console.log(' Carousel image deleted:', image_url);
      return res.json({
        message: 'Carousel image and record deleted successfully',
        deletedRows: result.affectedRows,
      });
    });
  });
});



// sidebar updates link for creation 
router.post('/homepage/sidebar/add_updates', auth, (req, res) => {
  let { name, url, display_order } = req.body;

  // Basic validation
  if (!name || !url) {
    return res.status(400).json({ message: 'Name and URL are required.' });
  }

  // Trim and sanitize inputs
  name = name.trim();
  url = url.trim();

  // Check for malicious content
  if (isMaliciousText(name) || isMaliciousText(url)) {
    return res.status(400).json({ message: 'Malicious content detected in input.' });
  }

  // Validate URL format (simple regex)
  const urlPattern = /^(https?:\/\/)[^\s$.?#].[^\s]*$/i;
  if (!urlPattern.test(url)) {
    return res.status(400).json({ message: 'Invalid URL format.' });
  }

  // Sanitize display_order
  const order = Number.isInteger(Number(display_order)) ? parseInt(display_order) : 1;

  const type = 'update';

  // SQL insertion (parameterized - safe)
  const insertQuery = `
    INSERT INTO sidebar_links (name, url, type, display_order)
    VALUES (?, ?, ?, ?)
  `;

  db.query(insertQuery, [name, url, type, order], (err, result) => {
    if (err) {
      console.error(' Database insert error (sidebar_links):', err);
      return res.status(500).json({ message: 'Database error while adding sidebar link.' });
    }

    console.log(' Sidebar link added safely:', name);

    res.status(201).json({
      message: 'Sidebar Update link added successfully.',
      sidebar_link: {
        id: result.insertId,
        name,
        url,
        type,
        display_order: order,
      },
    });
  });
});


//sidebar upadat_update link
router.post('/homepage/sidebar/update_updates', auth, (req, res) => {
  let { id, name, url, display_order } = req.body;

  // Validate ID
  if (!id || isNaN(id) || Number(id) <= 0) {
    return res.status(400).json({ message: 'Valid numeric "id" is required in the body.' });
  }

  // Validate required fields
  if (!name || !url) {
    return res.status(400).json({ message: 'Both "name" and "url" fields are required.' });
  }

  // Sanitize input
  name = name.trim();
  url = url.trim();

  // Prevent malicious content
  if (isMaliciousText(name) || isMaliciousText(url)) {
    return res.status(400).json({ message: 'Malicious content detected in input.' });
  }

  // Validate URL format
  const urlPattern = /^(https?:\/\/)[^\s$.?#].[^\s]*$/i;
  if (!urlPattern.test(url)) {
    return res.status(400).json({ message: 'Invalid URL format.' });
  }

  // Set order safely
  const order = Number.isInteger(Number(display_order)) ? parseInt(display_order) : 1;

  // Ensure record exists and type is 'update'
  const checkQuery = 'SELECT id, type FROM sidebar_links WHERE id = ?';
  db.query(checkQuery, [id], (checkErr, results) => {
    if (checkErr) {
      console.error('Database check error:', checkErr);
      return res.status(500).json({ message: 'Database error while verifying record.' });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: 'No sidebar link found with this ID.' });
    }

    const record = results[0];
    if (record.type !== 'update') {
      return res.status(400).json({ message: 'Invalid ID ' });
    }

    // Perform the update
    const updateQuery = `
      UPDATE sidebar_links
      SET name = ?, url = ?, display_order = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND type = 'update'
    `;
    db.query(updateQuery, [name, url, order, id], (updateErr) => {
      if (updateErr) {
        console.error('Database update error:', updateErr);
        return res.status(500).json({ message: 'Database error while updating record.' });
      }

      console.log(`Sidebar "update" link updated successfully. ID: ${id}`);
      return res.json({
        message: 'Sidebar update-link updated successfully.',
        updated: { id, name, url, display_order: order }
      });
    });
  });
});

// Delete sidebar "update" link
router.post('/homepage/sidebar/delete_updates', auth, (req, res) => {
  let { id } = req.body;

  // Sanitize ID
  if (typeof id === 'string') id = id.trim();
  id = String(id).replace(/[^\d]/g, '');
  const numId = parseInt(id, 10);

  if (!numId || isNaN(numId) || numId <= 0) {
    return res.status(400).json({ message: 'Valid numeric "id" is required.' });
  }

  // Verify record and type
  const checkQuery = 'SELECT id, type FROM sidebar_links WHERE id = ?';
  db.query(checkQuery, [numId], (checkErr, results) => {
    if (checkErr) {
      console.error('Database check error:', checkErr);
      return res.status(500).json({ message: 'Database error while verifying record.' });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: 'No sidebar link found with this ID.' });
    }

    const record = results[0];
    if (record.type !== 'update') {
      return res.status(400).json({ message: 'The provided ID does not belong to an "update" type link.' });
    }

    // Delete record
    const deleteQuery = 'DELETE FROM sidebar_links WHERE id = ? AND type = "update"';
    db.query(deleteQuery, [numId], (deleteErr) => {
      if (deleteErr) {
        console.error('Database delete error:', deleteErr);
        return res.status(500).json({ message: 'Database error while deleting record.' });
      }

      console.log(`Sidebar "update" link deleted successfully. ID: ${numId}`);
      return res.json({
        message: 'Sidebar "update" link deleted successfully.',
        deleted_id: numId
      });
    });
  });
});


// add sidebar quicklink
router.post('/homepage/sidebar/add_quicklinks', auth, (req, res) => {
  let { name, url, display_order } = req.body;

  //  Basic validation
  if (!name || !url) {
    return res.status(400).json({ message: 'Both "name" and "url" are required.' });
  }

  // Trim and sanitize input
  name = name.trim();
  url = url.trim();
  display_order = parseInt(display_order, 10) || 0;

  // Validate malicious patterns
  if (isMaliciousText(name) || isMaliciousText(url)) {
    return res.status(400).json({ message: 'Malicious content detected in input fields.' });
  }

  //  URL validation (basic)
  const urlRegex = /^(https?:\/\/)?([a-zA-Z0-9.-]+)(:[0-9]+)?(\/[^\s]*)?$/;
  if (!urlRegex.test(url)) {
    return res.status(400).json({ message: 'Invalid URL format.' });
  }

  //  Prepare safe insert query
  const insertQuery = `
    INSERT INTO sidebar_links (name, url, type, display_order)
    VALUES (?, ?, 'quicklink', ?)
  `;
  const values = [name, url, display_order];

  db.query(insertQuery, values, (err, result) => {
    if (err) {
      console.error(' Database insert error:', err);
      return res.status(500).json({ message: 'Database error while inserting quick link.' });
    }

    console.log(` New quick link added: ${name} (${url})`);
    return res.status(201).json({
      message: 'Quick Link added successfully.',
      quicklink: {
        id: result.insertId,
        name,
        url,
        type: 'quicklink',
        display_order,
      },
    });
  });
});



// update sidebar quicklink
router.post('/homepage/sidebar/update_quicklink', auth, (req, res) => {
  const { id, name, url, display_order } = req.body;

  //  Validate ID
  if (!id || isNaN(id) || id <= 0) {
    return res.status(400).json({ message: 'Invalid or missing id' });
  }

  // ✅ Validate required fields
  if (!name || !url) {
    return res.status(400).json({ message: 'Name and URL are required' });
  }

  const cleanName = name.trim();
  const cleanUrl = url.trim();
  const order = parseInt(display_order) || 0;

  // Input sanitization
  if (isMaliciousText(cleanName) || isMaliciousText(cleanUrl)) {
    return res.status(400).json({ message: 'Malicious content detected in input' });
  }

  //  Verify the ID belongs to a quicklink
  const verifyQuery = `SELECT type FROM sidebar_links WHERE id = ?`;
  db.query(verifyQuery, [id], (verifyErr, verifyRows) => {
    if (verifyErr) {
      console.error(' Database verify error:', verifyErr);
      return res.status(500).json({ message: 'Database error during verification' });
    }

    if (verifyRows.length === 0) {
      return res.status(404).json({ message: 'No record found for this id' });
    }

    const recordType = verifyRows[0].type;
    if (recordType !== 'quicklink') {
      return res.status(400).json({ message: 'Invalid ID' });
    }

    //  Update the record safely
    const updateQuery = `
      UPDATE sidebar_links 
      SET name = ?, url = ?, display_order = ?, updated_at = NOW()
      WHERE id = ? AND type = 'quicklink'
    `;
    const values = [cleanName, cleanUrl, order, id];

    db.query(updateQuery, values, (err, result) => {
      if (err) {
        console.error(' Database update error:', err);
        return res.status(500).json({ message: 'Database error while updating record' });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Quick Link not found or not updated' });
      }

      res.json({
        message: ' Quick Link updated successfully',
        updatedRows: result.affectedRows,
      });
    });
  });
});
module.exports = router;
