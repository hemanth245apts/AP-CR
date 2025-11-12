const express = require('express');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const auth = require('../middleware/auth');
const { upload, imageValidator } = require('../middleware/validateimage');
const bcrypt = require('bcryptjs');
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
    // /base64,/g,
    /drop\s+table/g,
    /union\s+select/g,
    /--/g
  ];
  return badPatterns.some((pattern) => pattern.test(lower));
}
function isStrongPassword(password) {
  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
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
      });
    });
  }
);


//Delete Carousel based on ID
router.delete('/homepage/Carousel', auth, (req, res) => {
  const { id } = req.body;

  // Input validation
  if (!id || isNaN(id) || id <= 0) {
    return res.status(400).json({ message: 'Valid ID is required' });
  }

  const cleanId = String(id).trim();
  if (isMaliciousText(cleanId)) {
    return res.status(400).json({ message: 'Malicious input detected' });
  }

  // Find image path from DB
  const selectQuery = 'SELECT image_url FROM homepage_carousel WHERE id = ?';
  db.query(selectQuery, [cleanId], (err, rows) => {
    if (err) {
      console.error(' Database select error:', err);
      return res.status(500).json({ message: 'Database error during lookup' });
    }

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Carousel image not found' });
    }

    const imageUrl = rows[0].image_url;
    const imgPath = path.join(__dirname, '..', imageUrl);

    //Delete file from disk
    try {
      if (fs.existsSync(imgPath)) {
        fs.unlinkSync(imgPath);
        console.log(' Deleted image file:', imgPath);
      } else {
        console.warn('Image file not found on disk:', imgPath);
      }
    } catch (fileErr) {
      console.error(' Error deleting image file:', fileErr);
    }

    // Delete record from DB
    const deleteQuery = 'DELETE FROM homepage_carousel WHERE id = ?';
    db.query(deleteQuery, [cleanId], (err2, result) => {
      if (err2) {
        console.error(' Database delete error:', err2);
        return res.status(500).json({ message: 'Database error while deleting record' });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'No record deleted (invalid ID?)' });
      }

      console.log(' Carousel record deleted for ID:', cleanId);
      return res.json({
        message: 'Carousel image and record deleted successfully',
      });
    });
  });
});



// sidebar updates link for creation 
router.post('/homepage/sidebar/updates', auth, (req, res) => {
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
     
    });
  });
});


//sidebar upadat_update link
router.put('/homepage/sidebar/updates', auth, (req, res) => {
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
      });
    });
  });
});

// Delete sidebar "update" link
router.delete('/homepage/sidebar/updates', auth, (req, res) => {
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
        
      });
    });
  });
});


// add sidebar quicklink
router.post('/homepage/sidebar/quicklinks', auth, (req, res) => {
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
     
    });
  });
});



// update sidebar quicklink
router.put('/homepage/sidebar/quicklink', auth, (req, res) => {
  const { id, name, url, display_order } = req.body;

  //  Validate ID
  if (!id || isNaN(id) || id <= 0) {
    return res.status(400).json({ message: 'Invalid or missing id' });
  }

  //  Validate required fields
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
        
      });
    });
  });
});


// delete sidebar quicklink
router.delete('/homepage/sidebar/quicklink', auth, (req, res) => {
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
        if (record.type !== 'quicklink') {
            return res.status(400).json({ message: 'The provided ID does not belong to a "quicklink" type link.' });
        }
        // Delete record
        const deleteQuery = 'DELETE FROM sidebar_links WHERE id = ? AND type = "quicklink"';
        db.query(deleteQuery, [numId], (deleteErr) => {
            if (deleteErr) {
                console.error('Database delete error:', deleteErr);
                return res.status(500).json({ message: 'Database error while deleting record.' });
            }       
            console.log(`Sidebar "quicklink" link deleted successfully. ID: ${numId}`);
            return res.json({   
                message: 'Sidebar quicklink link deleted successfully.',
            });
        });
    });
});

router.put("/changepasswd", auth, async (req, res) => {
  try {
    const { current_Pass, New_Pass, Re_Pass } = req.body;

    if (!current_Pass || !New_Pass || !Re_Pass) {
      return res
        .status(400)
        .json({ message: "All fields (current_Pass, New_Pass, Re_Pass) are required" });
    }

    if (New_Pass !== Re_Pass) {
      return res.status(400).json({ message: "New passwords do not match" });
    }

    // Validate password strength
    if (!isStrongPassword(New_Pass)) {
      return res.status(400).json({
        message:
          "Password must be at least 8 characters long, include upper & lower case letters, a number, and a special character",
      });
    }

    const userId = req.user.id; // from auth middleware

    // Step 1: Fetch user from DB
    db.query("SELECT password FROM users WHERE id = ?", [userId], async (err, results) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({ message: "Database error" });
      }

      if (results.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      const user = results[0];

      // Step 2: Verify current password
      const isMatch = await bcrypt.compare(current_Pass, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }

      // Step 3: Hash new password
      const hashedPassword = await bcrypt.hash(New_Pass, 10);

      // Step 4: Update DB
      db.query(
        "UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?",
        [hashedPassword, userId],
        (err) => {
          if (err) {
            console.error("DB update error:", err);
            return res.status(500).json({ message: "Failed to update password" });
          }

          res.status(200).json({ message: "Password updated successfully" });
        }
      );
    });
  } catch (error) {
    console.error("Password change error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
module.exports = router;
