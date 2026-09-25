const config = require('./config'); // Loads .env first, before anything reads process.env
const express = require('express');
const helmet = require('helmet');
const path = require('path');
const authMiddleware = require('./middleware/auth');

const app = express();

// --- Security headers (Content-Security-Policy, X-Frame-Options, etc.) ---
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            // The app is also served over plain HTTP (e.g. http://localhost), so don't force HTTPS sub-requests
            upgradeInsecureRequests: null
        }
    }
}));

// --- Middleware ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Routers ---
const userRouter = require('./routes/user');
const indexRouter = require('./routes/index');
const recipesRouter = require('./routes/recipes');
const inventoryRouter = require('./routes/inventory');

app.use('/api', userRouter);
app.use('/api/dashboard', authMiddleware.isAuthenticated, indexRouter);
app.use('/api/recipes', authMiddleware.isAuthenticated, recipesRouter);
app.use('/api/inventory', authMiddleware.isAuthenticated, inventoryRouter);

// Unknown API routes get a JSON 404 instead of falling through to the Angular app
app.use('/api', (req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// --- Serve generated audio and the Angular frontend ---
app.use('/audio', express.static(config.audioDir)); // e.g. /audio/<hash>.mp3
app.use(express.static(path.join(__dirname, '../dist/recipeHub/browser')));

// --- Error handler: malformed JSON bodies and unexpected errors also get JSON responses ---
app.use((err, req, res, next) => {
    const status = err.status || err.statusCode || 500;
    if (status >= 500) {
        console.error(err);
    }
    res.status(status).json({ error: status >= 500 ? 'An internal server error occurred.' : err.message });
});

module.exports = app;
