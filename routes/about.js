// src/routes/about.js
const express = require('express');
const router = express.Router();
const { query } = require('../db');

// GET /about  (Vision & Mission)
router.get('/', async (req, res, next) => {
    try {
        const rows = await query(`SELECT vision_statement, mission_statements, updated_at FROM about_content WHERE id = 1`);
        res.json(rows[0]);
    } catch (err) { next(err); }
});

// GET /about/organisation
router.get('/organisation', async (req, res, next) => {
    try {
        const rows = await query(`SELECT description, chart_image_url, updated_at FROM about_organisation WHERE id = 1`);
        res.json(rows[0]);
    } catch (err) { next(err); }
});

// GET /about/chairmans
router.get('/chairmans', async (req, res, next) => {
    try {
        const rows = await query(
            `SELECT id, s_no, name, service_years
       FROM chairmans
       ORDER BY s_no ASC`
        );
        res.json(rows);
    } catch (err) { next(err); }
});

// GET /about/rti
router.get('/rti', async (req, res, next) => {
    try {
        const rows = await query(
            `SELECT pio_name, pio_phone, apio_name, apio_phone, appellate_name, appellate_phone,
              pdf_english_url, pdf_telugu_url, updated_at
       FROM about_rti WHERE id = 1`
        );
        res.json(rows[0]);
    } catch (err) { next(err); }
});

module.exports = router;
