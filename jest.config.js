// Backend integration tests (Jest + Supertest). The Angular unit tests run with Karma: npm run test:frontend
module.exports = {
  testEnvironment: 'node',
  // Plain CommonJS: no Babel transform needed
  transform: {},
  roots: ['<rootDir>/backend'],
  testMatch: ['**/tests/**/*.test.js'],
  setupFiles: ['<rootDir>/backend/tests/setup-env.js'],
};
