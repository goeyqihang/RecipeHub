const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const config = require('../config');
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/auth');

// Slow down brute-force attempts: limit login/registration requests per IP (20 every 15 minutes by default)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: config.authRateLimit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Too many attempts. Please try again in a few minutes.' }
});

// --- User Registration Routes ---
router.post('/register', authLimiter, userController.registerUser);

// --- User Authentication Routes ---
// Logging out only needs the client to discard its token, so there is no logout route.
router.post('/login', authLimiter, userController.loginUser);
router.get('/session', authMiddleware.isAuthenticated, userController.getCurrentUser);

module.exports = router;
