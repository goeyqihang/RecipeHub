const jwt = require('jsonwebtoken');
const config = require('./config');

/**
 * Issues a signed login token (JWT) for a user.
 * The token carries the user's ID (as the subject) and role, so requests can be
 * authorized without a server-side session.
 */
exports.signToken = (user) =>
  jwt.sign({ role: user.role }, config.jwtSecret, {
    subject: user.userId,
    expiresIn: config.jwtExpiresIn,
  });

/**
 * Verifies a login token and returns the user it identifies as { userId, role }.
 * Throws if the token is missing, tampered with, or expired.
 */
exports.verifyToken = (token) => {
  const payload = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] });
  return { userId: payload.sub, role: payload.role };
};
