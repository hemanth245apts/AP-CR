const dotenv = require('dotenv');
const cors = require('cors');
const express = require('express');
const authMiddleware = require('./middleware/auth');
const db = require('./db');
const path = require('path');
const helmet = require('helmet');
const app = express();

const homepageRoutes = require('./routes/homepage');
const userRoutes = require('./routes/users');
const AdminRoutes = require('./routes/admin');
const AboutRoutes = require('./routes/about');
dotenv.config();

const PORT = process.env.PORT;
const HOST = process.env.HOST;
const FRONTEND_ORIGIN = process.env.CORS_ORIGIN || 'https://yourfrontend.com';


// security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            baseUri: ["'self'"],
            fontSrc: ["'self'", "https:", "data:"],
            formAction: ["'self'"],
            frameAncestors: ["'self'"],
            imgSrc: ["'self'", "data:"],
            objectSrc: ["'none'"],
            scriptSrc: ["'self'"],
            scriptSrcAttr: ["'none'"],
            styleSrc: ["'self'", "https:"],
            upgradeInsecureRequests: [],
        },
    },
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: { policy: "same-origin" },
    crossOriginResourcePolicy: { policy: "same-origin" },
    referrerPolicy: { policy: "no-referrer" },
    dnsPrefetchControl: { allow: false },
    frameguard: { action: "sameorigin" },
    hidePoweredBy: true,
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
    },
    ieNoOpen: true,
    noSniff: true,
    permittedCrossDomainPolicies: { permittedPolicies: "none" },
    xssFilter: false,
}));

app.use(cors({
    origin: FRONTEND_ORIGIN,
    methods: ['GET', 'POST', 'DELETE'],
    allowedHeaders: ['Authorization', 'Content-Type'],
    credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/user', userRoutes);
app.use('/homepage', homepageRoutes);
app.use('/admin', AdminRoutes);
app.use('/about', AboutRoutes);

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
