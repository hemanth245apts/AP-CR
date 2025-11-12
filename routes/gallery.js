const express = require('express');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const auth = require('../middleware/auth');
const { upload, imageValidator } = require('../middleware/validateimage');


const router = express.Router();


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

// add gallery photos
router.post('/add_photos', auth, upload.single('image'), imageValidator, (req, res) => {
  const { title, date } = req.body;

  if (!title || !date) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return res.status(400).json({ message: 'Title and date are required' });
  }

  // Sanitize
  const cleanTitle = title.trim();
   if (isMaliciousText(cleanTitle)) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return res.status(400).json({ message: 'Malicious content detected in title or video ID.' });
  }
  // Validate and convert date (accept DD-MM-YYYY or YYYY-MM-DD)
  let formattedDate;
  if (/^\d{2}-\d{2}-\d{4}$/.test(date)) {
    // Convert DD-MM-YYYY to YYYY-MM-DD
    const parts = date.split('-');
    formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    formattedDate = date; // already in correct format
  } else {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return res.status(400).json({ message: 'Invalid date format. Use DD-MM-YYYY or YYYY-MM-DD' });
  }

  // Rename & move file
  const ext = path.extname(req.file.originalname).toLowerCase();
  const fileName = `Gallery_${Date.now()}${ext}`;
  const finalPath = path.join(__dirname, '../images', fileName);
  fs.renameSync(req.file.path, finalPath);

  const imageUrl = `/images/${fileName}`;

  // Insert into DB
  const insertQuery = 'INSERT INTO gallery_photos (title, date, image_url) VALUES (?, ?, ?)';
  db.query(insertQuery, [cleanTitle, formattedDate, imageUrl], (err, result) => {
    if (err) {
      if (fs.existsSync(finalPath)) fs.unlinkSync(finalPath);
      console.error('Database insert error:', err);
      return res.status(500).json({ message: 'Database error' });
    }

    res.status(201).json({
      message: 'Photo uploaded successfully',
    });
  });
});


// delete gallery photo
router.delete('/photos', auth, (req, res) => {
  let { id } = req.body;

  // Validate id
  if (!id || isNaN(id) || parseInt(id) <= 0) {
    return res.status(400).json({ message: 'Valid numeric "id" is required.' });
  }
  const photoId = parseInt(id);

  // Step 1: Find the record
  const selectQuery = 'SELECT image_url FROM gallery_photos WHERE id = ?';
  db.query(selectQuery, [photoId], (err, rows) => {
    if (err) {
      console.error('Database select error:', err);
      return res.status(500).json({ message: 'Database error while fetching record.' });
    }

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Photo not found with this ID.' });
    }

    const imgPath = path.join(__dirname, '..', rows[0].image_url);

    // Step 2: Delete the image file
    try {
      if (fs.existsSync(imgPath)) {
        fs.unlinkSync(imgPath);
        console.log('Deleted image file:', imgPath);
      } else {
        console.warn('Image file not found on disk:', imgPath);
      }
    } catch (fileErr) {
      console.error('Error deleting image file:', fileErr);
      // Continue to delete DB record even if file deletion fails
    }

    // Step 3: Delete the DB record
    const deleteQuery = 'DELETE FROM gallery_photos WHERE id = ?';
    db.query(deleteQuery, [photoId], (delErr, result) => {
      if (delErr) {
        console.error('Database delete error:', delErr);
        return res.status(500).json({ message: 'Database error while deleting record.' });
      }

      res.json({
        message: 'Photo deleted successfully.',
      });
    });
  });
});


// add gallery videos

router.post('/add_videos', auth, upload.single('image'), imageValidator, (req, res) => {
  const { title, date, video_id } = req.body;

  if (!title || !date || !video_id) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return res.status(400).json({ message: 'Title, date, and video_id are required.' });
  }

  // Sanitize inputs
  const cleanTitle = title.trim();
  const cleanVideoId = video_id.trim();

  // Check for malicious content
  if (isMaliciousText(cleanTitle) || isMaliciousText(cleanVideoId)) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return res.status(400).json({ message: 'Malicious content detected in title or video ID.' });
  }
let formattedDate;
  if (/^\d{2}-\d{2}-\d{4}$/.test(date)) {
    // Convert DD-MM-YYYY to YYYY-MM-DD
    const parts = date.split('-');
    formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    formattedDate = date; // already in correct format
  } else {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return res.status(400).json({ message: 'Invalid date format. Use DD-MM-YYYY or YYYY-MM-DD' });
  }
  // Handle image upload
  let thumbnailUrl = null;
  if (req.file) {
    const ext = path.extname(req.file.originalname).toLowerCase();
    const fileName = `Video_${Date.now()}${ext}`;
    const finalPath = path.join(__dirname, '../images', fileName);
    fs.renameSync(req.file.path, finalPath);
    thumbnailUrl = `/images/${fileName}`;
  }

  // Insert into DB
  const insertQuery = `
    INSERT INTO gallery_videos (title, date, video_id, thumbnail_url)
    VALUES (?, ?, ?, ?)
  `;
  db.query(insertQuery, [cleanTitle, formattedDate, cleanVideoId, thumbnailUrl], (err, result) => {
    if (err) {
      if (thumbnailUrl && fs.existsSync(path.join(__dirname, '..', thumbnailUrl))) {
        fs.unlinkSync(path.join(__dirname, '..', thumbnailUrl));
      }
      console.error('Database insert error:', err);
      return res.status(500).json({ message: 'Database error' });
    }

    res.status(201).json({
      message: 'Video uploaded successfully',
    });
  });
});


//DELETE gallery video
// Delete gallery video based on ID
router.delete('/videos', auth, (req, res) => {
  let { id } = req.body;

  // Step 1: Validate ID
  if (!id) {
    return res.status(400).json({ message: 'Video ID is required.' });
  }

  if (typeof id === 'string') {
    id = id.trim();
  }

  // Remove anything non-numeric
  id = String(id).replace(/[^\d]/g, '');
  const numId = parseInt(id, 10);

  if (isNaN(numId) || numId <= 0) {
    return res.status(400).json({ message: 'Invalid video ID format.' });
  }

  // Step 2: Malicious check
  if (isMaliciousText(String(numId))) {
    return res.status(400).json({ message: 'Malicious content detected in video ID.' });
  }

  // Step 3: Verify record exists
  const checkQuery = 'SELECT thumbnail_url FROM gallery_videos WHERE id = ?';
  db.query(checkQuery, [numId], (checkErr, rows) => {
    if (checkErr) {
      console.error(' Database check error:', checkErr);
      return res.status(500).json({ message: 'Database error while verifying video.' });
    }

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Video not found in database.' });
    }

    const thumbnailUrl = rows[0].thumbnail_url;
    const localPath = thumbnailUrl ? path.join(__dirname, '..', thumbnailUrl) : null;

    // Step 4: Try deleting the image file
    try {
      if (localPath && fs.existsSync(localPath)) {
        fs.unlinkSync(localPath);
        console.log(' Deleted video thumbnail:', localPath);
      } else {
        console.warn(' Thumbnail not found on disk:', localPath);
      }
    } catch (fileErr) {
      console.error(' File delete error:', fileErr);
    }

    // Step 5: Delete from DB
    const deleteQuery = 'DELETE FROM gallery_videos WHERE id = ?';
    db.query(deleteQuery, [numId], (deleteErr, result) => {
      if (deleteErr) {
        console.error(' Database delete error:', deleteErr);
        return res.status(500).json({ message: 'Database error while deleting video record.' });
      }

      console.log(` Gallery video deleted successfully. ID: ${numId}`);
      return res.json({
        message: 'Gallery video deleted successfully.',
        
      });
    });
  });
});


module.exports = router;
