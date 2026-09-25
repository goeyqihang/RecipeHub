const { verifyToken } = require('../tokens');
const Recipe = require('../models/recipe');

// Returns the token from an "Authorization: Bearer <token>" header, or null
const getBearerToken = (req) => {
    const [scheme, token] = (req.headers.authorization || '').split(' ');
    return scheme === 'Bearer' && token ? token : null;
};

/**
 * Checks that the request carries a valid login token.
 * If it does, attaches the user ({ userId, role }) to res.locals so controllers can use it.
 * If not, sends a 401 Unauthorized JSON response.
 */
exports.isAuthenticated = (req, res, next) => {
    const token = getBearerToken(req);
    if (!token) {
        return res.status(401).json({ error: 'Authentication required. Please log in.' });
    }

    try {
        res.locals.loggedInUser = verifyToken(token);
        next();
    } catch {
        res.status(401).json({ error: 'Your session is invalid or has expired. Please log in again.' });
    }
};

/**
 * Socket.IO middleware: authenticates each connection with the same login token,
 * which the client sends as `auth.token` in the handshake.
 */
exports.authenticateSocket = (socket, next) => {
    try {
        socket.data.user = verifyToken(socket.handshake.auth?.token);
        next();
    } catch {
        next(new Error('Authentication required'));
    }
};

/**
 * Creates a middleware that checks if the logged-in user's role is in the allowed list.
 * @param {string[]} allowedRoles - An array of roles that are permitted.
 * @returns An Express middleware function.
 */
exports.hasRole = (allowedRoles) => {
    return (req, res, next) => {
        const user = res.locals.loggedInUser;

        if (user && allowedRoles.includes(user.role)) {
            next(); // User's role is in the allowed list, proceed.
        } else {
            // If the user's role is not allowed, send a 403 Forbidden JSON response.
            res.status(403).json({ error: 'You do not have the required role to perform this action.' });
        }
    };
};

/**
 * A more specific check for editing or deleting a recipe.
 * It checks if the logged-in user's userId matches the one on the recipe.
 */
exports.isRecipeOwner = async (req, res, next) => {
    try {
        const recipe = await Recipe.findOne({ recipeId: req.params.recipeId });

        if (!recipe) {
            return res.status(404).json({ error: 'Recipe not found.' });
        }

        if (recipe.userId === res.locals.loggedInUser.userId) {
            next(); // The user is the owner, proceed.
        } else {
            res.status(403).json({ error: 'You do not have permission to modify this recipe.' });
        }
    } catch (error) {
        console.error("Error in isRecipeOwner middleware:", error);
        res.status(500).json({ error: "An internal server error occurred." });
    }
};
