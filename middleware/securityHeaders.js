// securityHeaders.js
// Middleware to set robust security headers for all responses

module.exports = function (req, res, next) {
    // 1. Content Security Policy (CSP)
    // Prevent XSS, data injection, and inline scripts (adjust per your app)
    res.setHeader(
        "Content-Security-Policy",
        "default-src 'self'; " + 
        "script-src 'self'; " + 
        "style-src 'self'; " + 
        "img-src 'self' data:; " + 
        "font-src 'self'; " + 
        "connect-src 'self'; " +
        "frame-ancestors 'none'; " + 
        "object-src 'none';"
    );

    // 2. X-Frame-Options
    // Prevent clickjacking
    res.setHeader("X-Frame-Options", "DENY");

    // 3. X-Content-Type-Options
    // Prevent MIME type sniffing
    res.setHeader("X-Content-Type-Options", "nosniff");

    // 4. Referrer-Policy
    // Control amount of referrer info sent
    res.setHeader("Referrer-Policy", "no-referrer");

    // 5. Strict-Transport-Security (HSTS)
    // Enforce HTTPS for future requests (adjust max-age as needed)
    res.setHeader("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");

    // 6. Permissions-Policy (formerly Feature-Policy)
    // Restrict access to browser features
    res.setHeader(
        "Permissions-Policy",
        "geolocation=(), microphone=(), camera=(), fullscreen=(self), payment=()"
    );

    // 7. Cross-Origin-Resource-Policy (CORP)
    // Prevent loading resources across origins
    res.setHeader("Cross-Origin-Resource-Policy", "same-origin");

    // 8. Cross-Origin-Opener-Policy (COOP)
    // Isolate browsing context to prevent attacks like Spectre
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");

    // 9. Cross-Origin-Embedder-Policy (COEP)
    // Ensure only CORS-enabled resources are loaded
    res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");

    // 10. Expect-CT
    // Enforce Certificate Transparency (optional)
    res.setHeader("Expect-CT", "max-age=86400, enforce");

    // 11. Cache-Control
    // Prevent sensitive data caching
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");

    // 12. Pragma
    // HTTP/1.0 backward compatibility for caching
    res.setHeader("Pragma", "no-cache");

    // 13. Expires
    // Ensure content is expired immediately
    res.setHeader("Expires", "0");

    // 14. Set a custom header to show server info is hidden
    //res.setHeader("X-Powered-By", ""); // remove Express default

    next();
};
