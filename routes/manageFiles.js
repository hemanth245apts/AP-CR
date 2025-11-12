
const express = require("express");
const path = require("path");
const fs = require("fs");
const db = require("../db");
const auth = require("../middleware/auth");
const { upload, validatePDF } = require("../middleware/validatepdffile");

const router = express.Router();

// Check for malicious content in text
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
    /--/g,
  ];
  return badPatterns.some((pattern) => pattern.test(lower));
}

// --- POST /manage/circulars ---
router.post(
  "/circulars",
  auth,
  upload.single("pdf"), // Use multer to accept single file named 'pdf'
  validatePDF,         // Validate PDF for safety
  async (req, res) => {
    try {
      const { s_no, number, date, subject } = req.body;

      // --- Step 1: Validate required fields ---
      if (!s_no || isNaN(s_no)) {
        return res.status(400).json({ message: "Invalid or missing s_no" });
      }
      if (!number || number.trim() === "") {
        return res.status(400).json({ message: "Number is required" });
      }
      if (!subject || subject.trim() === "") {
        return res.status(400).json({ message: "Subject is required" });
      }
      if (!date) {
        return res.status(400).json({ message: "Date is required" });
      }
      if (!req.validatedPDF) {
        return res.status(400).json({ message: "A valid PDF is required" });
      }

      // --- Step 2: Sanitize text fields ---
      const cleanNumber = number.trim();
      const cleanSubject = subject.trim();

      if (isMaliciousText(cleanNumber) || isMaliciousText(cleanSubject)) {
        return res.status(400).json({ message: "Malicious content detected in input" });
      }

      // --- Step 3: Validate and format date ---
      let formattedDate;
      if (/^\d{2}-\d{2}-\d{4}$/.test(date)) {
        const [day, month, year] = date.split("-");
        formattedDate = `${year}-${month}-${day}`;
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        formattedDate = date;
      } else {
        return res.status(400).json({ message: "Invalid date format. Use DD-MM-YYYY or YYYY-MM-DD" });
      }

      // --- Step 4: Save PDF with timestamp ---
      const timestamp = Date.now();
      const fileExt = path.extname(req.validatedPDF.originalname).toLowerCase();
      const fileName = `Circular_${timestamp}${fileExt}`;
      const uploadDir = path.join(__dirname, "../pdfs");

      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

      const filePath = path.join(uploadDir, fileName);
      fs.writeFileSync(filePath, req.validatedPDF.buffer);

      const file_url = `pdfs/${fileName}`;

      // --- Step 5: Insert into DB ---
      const insertQuery = `
        INSERT INTO circulars (s_no, number, date, subject, file_url)
        VALUES (?, ?, ?, ?, ?)
      `;
      const values = [parseInt(s_no), cleanNumber, formattedDate, cleanSubject, file_url];

      db.query(insertQuery, values, (err, result) => {
        if (err) {
          console.error("DB insert error:", err);
          fs.unlinkSync(filePath); // remove file if DB fails
          return res.status(500).json({ message: "Database insert failed" });
        }

        res.status(201).json({
          message: "Circular uploaded successfully",
        });
      });
    } catch (error) {
      console.error("Error uploading circular:", error);
      res.status(500).json({ message: "Server error during upload" });
    }
  }
);


//update circulars
router.put(
  "/circulars",
  auth,
  upload.single("pdf"),
  validatePDF,
  async (req, res) => {
    try {
      const {id, s_no, number, date, subject } = req.body;

      if (!id || isNaN(id)) {
        return res.status(400).json({ message: "Invalid circular ID" });
      }

      // --- Step 1: Validate text fields ---
      const cleanNumber = number?.trim() || "";
      const cleanSubject = subject?.trim() || "";

      if (!s_no || isNaN(s_no)) {
        return res.status(400).json({ message: "Invalid or missing s_no" });
      }
      if (!cleanNumber) {
        return res.status(400).json({ message: "Number is required" });
      }
      if (!cleanSubject) {
        return res.status(400).json({ message: "Subject is required" });
      }
      if (!date) {
        return res.status(400).json({ message: "Date is required" });
      }
      if (isMaliciousText(cleanNumber) || isMaliciousText(cleanSubject)) {
        return res.status(400).json({ message: "Malicious content detected in input" });
      }

      // --- Step 2: Validate and format date ---
      let formattedDate;
      if (/^\d{2}-\d{2}-\d{4}$/.test(date)) {
        const [day, month, year] = date.split("-");
        formattedDate = `${year}-${month}-${day}`;
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        formattedDate = date;
      } else {
        return res.status(400).json({ message: "Invalid date format. Use DD-MM-YYYY or YYYY-MM-DD" });
      }

      // --- Step 3: Fetch existing circular ---
      db.query("SELECT * FROM circulars WHERE id = ?", [id], (err, results) => {
        if (err) return res.status(500).json({ message: "Database error" });
        if (results.length === 0) return res.status(404).json({ message: "Circular not found" });

        const existing = results[0];
        let file_url = existing.file_url;

        // --- Step 4: Handle PDF replacement ---
        if (req.validatedPDF) {
          const timestamp = Date.now();
          const fileExt = path.extname(req.validatedPDF.originalname).toLowerCase();
          const fileName = `Circular_${timestamp}${fileExt}`;
          const uploadDir = path.join(__dirname, "../pdfs");

          if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

          const filePath = path.join(uploadDir, fileName);
          fs.writeFileSync(filePath, req.validatedPDF.buffer);

          // Delete old file
          const oldFilePath = path.join(__dirname, "../", file_url);
          if (fs.existsSync(oldFilePath)) fs.unlinkSync(oldFilePath);

          file_url = `pdfs/${fileName}`;
        }

        // --- Step 5: Update DB ---
        const updateQuery = `
          UPDATE circulars
          SET s_no = ?, number = ?, date = ?, subject = ?, file_url = ?
          WHERE id = ?
        `;
        const values = [parseInt(s_no), cleanNumber, formattedDate, cleanSubject, file_url, id];

        db.query(updateQuery, values, (err) => {
          if (err) {
            console.error("DB update error:", err);
            return res.status(500).json({ message: "Failed to update circular" });
          }

          res.status(200).json({
            message: "Circular updated successfully",
            file_url,
          });
        });
      });
    } catch (error) {
      console.error("Error updating circular:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);


///delete circular
router.delete("/circulars", auth, (req, res) => {
  const { id } = req.body;

  if (!id || isNaN(id)) {
    return res.status(400).json({ message: "Invalid circular ID" });
  }

  // --- Step 1: Fetch circular from DB ---
  db.query("SELECT * FROM circulars WHERE id = ?", [id], (err, results) => {
    if (err) return res.status(500).json({ message: "Database error" });
    if (results.length === 0) return res.status(404).json({ message: "Circular not found" });

    const circular = results[0];
    const filePath = path.join(__dirname, "../pdfs", path.basename(circular.file_url));

    // --- Step 2: Delete PDF from disk ---
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.error("Error deleting PDF:", err);
        return res.status(500).json({ message: "Failed to delete PDF file" });
      }
    }

    // --- Step 3: Delete circular from DB ---
    db.query("DELETE FROM circulars WHERE id = ?", [id], (err) => {
      if (err) return res.status(500).json({ message: "Failed to delete circular" });

      res.status(200).json({ message: "Circular deleted successfully" });
    });
  });
});

//upload new archives
router.post(
  "/archives",
  auth,
  upload.single("pdf"), // single PDF file
  validatePDF,         // validate PDF for safety
  async (req, res) => {
    try {
      const { title, date, type } = req.body;
      const pdf = req.validatedPDF; // single PDF attachment from validator

      // --- Step 1: Validate required fields ---
      if (!title || title.trim() === "") {
        return res.status(400).json({ message: "Title is required" });
      }
      if (!type || type.trim() === "") {
        return res.status(400).json({ message: "Type is required" });
      }
      if (!date) {
        return res.status(400).json({ message: "Date is required" });
      }
      if (!pdf) {
        return res.status(400).json({ message: "A valid PDF file is required" });
      }

      // --- Step 2: Sanitize text fields ---
      const cleanTitle = title.trim();
      const cleanType = type.trim();

      if (isMaliciousText(cleanTitle) || isMaliciousText(cleanType)) {
        return res.status(400).json({ message: "Malicious content detected in input" });
      }

      // --- Step 3: Validate and format date ---
      let formattedDate;
      if (/^\d{2}-\d{2}-\d{4}$/.test(date)) {
        const [day, month, year] = date.split("-");
        formattedDate = `${year}-${month}-${day}`;
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        formattedDate = date;
      } else {
        return res.status(400).json({ message: "Invalid date format. Use DD-MM-YYYY or YYYY-MM-DD" });
      }

      // --- Step 4: Save PDF with timestamp ---
      const timestamp = Date.now();
      const fileExt = path.extname(pdf.originalname).toLowerCase();
      const fileName = `Archive_${timestamp}${fileExt}`;
      const uploadDir = path.join(__dirname, "../pdfs");

      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

      const filePath = path.join(uploadDir, fileName);
      fs.writeFileSync(filePath, pdf.buffer);

      const file_url = `pdfs/${fileName}`;

      // --- Step 5: Insert into DB ---
      const insertQuery = `
        INSERT INTO archives (title, date, type, file_url)
        VALUES (?, ?, ?, ?)
      `;
      const values = [cleanTitle, formattedDate, cleanType, file_url];

      db.query(insertQuery, values, (err, result) => {
        if (err) {
          console.error("DB insert error:", err);
          fs.unlinkSync(filePath); // remove file if DB fails
          return res.status(500).json({ message: "Database insert failed" });
        }

        res.status(201).json({
          message: "Archive uploaded successfully",
          id: result.insertId,
          file_url
        });
      });
    } catch (error) {
      console.error("Error uploading archive:", error);
      res.status(500).json({ message: "Server error during upload" });
    }
  }
);

//update archives
// PUT /archives/:id - update archive by ID
router.put("/archives", auth, upload.single("pdf"), validatePDF, async (req, res) => {
  try {
    const { title, date, type, id } = req.body;

    if (!id || isNaN(id)) {
      return res.status(400).json({ message: "Invalid archive ID" });
    }

    // Validate required fields
    if (!title || title.trim() === "" || !type || type.trim() === "" || !date) {
      return res.status(400).json({ message: "Title, type, and date are required" });
    }

    // Sanitize inputs
    const cleanTitle = title.trim();
    const cleanType = type.trim();

    if (isMaliciousText(cleanTitle) || isMaliciousText(cleanType)) {
      return res.status(400).json({ message: "Malicious content detected" });
    }

    // Validate date
    let formattedDate;
    if (/^\d{2}-\d{2}-\d{4}$/.test(date)) {
      const [day, month, year] = date.split("-");
      formattedDate = `${year}-${month}-${day}`;
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      formattedDate = date;
    } else {
      return res.status(400).json({ message: "Invalid date format. Use DD-MM-YYYY or YYYY-MM-DD" });
    }

    db.query("SELECT * FROM archives WHERE id = ?", [id], (err, results) => {
      if (err) return res.status(500).json({ message: "Database error" });
      if (results.length === 0) return res.status(404).json({ message: "archive not found" });

      const existing = results[0];
      let file_url = existing.file_url;

      // --- Step 4: Handle PDF replacement ---
      if (req.validatedPDF) {
        const timestamp = Date.now();
        const fileExt = path.extname(req.validatedPDF.originalname).toLowerCase();
        const fileName = `Archive_${timestamp}${fileExt}`;
        const uploadDir = path.join(__dirname, "../pdfs");

        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

        const filePath = path.join(uploadDir, fileName);
        fs.writeFileSync(filePath, req.validatedPDF.buffer);

        // Delete old file
        const oldFilePath = path.join(__dirname, "..", file_url);
        if (fs.existsSync(oldFilePath)) fs.unlinkSync(oldFilePath);

        file_url = `pdfs/${fileName}`;
      }

      // --- Step 5: Update DB ---
      const updateQuery = `
        UPDATE archives
        SET title = ?, date = ?, type = ?, file_url = ?
        WHERE id = ?
      `;
      const values = [cleanTitle, formattedDate, cleanType, file_url, id];

      db.query(updateQuery, values, (err2) => {
        if (err2) {
          console.error("DB update error:", err2);
          return res.status(500).json({ message: "Failed to update archive" });
        }

        res.status(200).json({
          message: "archive updated successfully",
          file_url,
        });
      });
    });
  } catch (error) {
    console.error("Error updating archive:", error);
    res.status(500).json({ message: "Server error" });
  }
});

//delete archive
router.delete("/archives", auth, (req, res) => {
  const { id } = req.body;

  if (!id || isNaN(id)) {
    return res.status(400).json({ message: "Invalid archive ID" });
  }

  // --- Step 1: Fetch circular from DB ---
  db.query("SELECT * FROM archives WHERE id = ?", [id], (err, results) => {
    if (err) return res.status(500).json({ message: "Database error" });
    if (results.length === 0) return res.status(404).json({ message: "archive not found" });

    const archives = results[0];
    const filePath = path.join(__dirname, "../pdfs", path.basename(archives.file_url));

    // --- Step 2: Delete PDF from disk ---
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.error("Error deleting PDF:", err);
        return res.status(500).json({ message: "Failed to delete archive PDF file" });
      }
    }

    // --- Step 3: Delete circular from DB ---
    db.query("DELETE FROM archives WHERE id = ?", [id], (err) => {
      if (err) return res.status(500).json({ message: "Failed to delete archives" });

      res.status(200).json({ message: "archive deleted successfully" });
    });
  });
});

module.exports = router;
