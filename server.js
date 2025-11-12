const dotenv = require('dotenv');
const cors = require('cors');
const express = require('express');
const authMiddleware = require('./middleware/auth');
const db = require('./db');
const path = require('path');
const app = express();
const securityHeaders = require('./middleware/securityHeaders');

dotenv.config();

const PORT = process.env.PORT;
const HOST = process.env.HOST;
const FRONTEND_ORIGIN = process.env.CORS_ORIGIN || 'https://yourfrontend.com';

app.use(cors({
    origin: FRONTEND_ORIGIN,
    methods: ['GET', 'POST', 'DELETE'],
    allowedHeaders: ['Authorization', 'Content-Type'],
    credentials: true,
}));

app.disable("x-powered-by");
app.use(securityHeaders);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// static files
const homepageRoutes = require('./routes/homepage');
const userRoutes = require('./routes/users');
const AdminRoutes = require('./routes/admin');
const AboutRoutes = require('./routes/about');
const ContentRoutes=require('./routes/content');
const ActivitiesRoutes = require('./routes/activities');
const LinksRoutes = require('./routes/links');
const ArticleRoutes = require('./routes/articles');
const GalleryRoutes = require('./routes/gallery');
const publicationsRoutes = require("./routes/publications");
const utilityRoutes = require("./routes/utility");
const manageFilesRoutes = require("./routes/manageFiles");


app.use('/user', userRoutes);
app.use('/homepage', homepageRoutes);
app.use('/admin', AdminRoutes);
app.use('/about', AboutRoutes);
app.use('/content',ContentRoutes);
app.use('/activities', ActivitiesRoutes);
app.use('/links', LinksRoutes);
app.use('/articles', ArticleRoutes);
app.use('/gallery', GalleryRoutes);
app.use('/manage', manageFilesRoutes);
app.use('/publications', publicationsRoutes);
app.use('/', utilityRoutes);


app.use((req, res) => {
    res.status(404).json({ message: 'Route not found' });
});


app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ message: 'Internal Server Error' });
});

// start server
app.listen(PORT, HOST, () => {
    console.log(`API Server running securely at http://${HOST}:${PORT}`);
    console.log(`CORS Origin allowed: ${FRONTEND_ORIGIN}`);
});
