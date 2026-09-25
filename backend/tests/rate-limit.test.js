// Kept in its own file: Jest gives every test file a fresh module registry, and therefore a fresh rate limiter.
// Use the production default instead of the relaxed limit from setup-env.js (must run before the app is loaded).
process.env.AUTH_RATE_LIMIT = '20';

const request = require('supertest');
const { app } = require('./helpers');

it('blocks an IP after 20 login attempts in 15 minutes', async () => {
  const attempt = () => request(app).post('/api/login').send({ email: 'nobody@example.com', password: 123 });

  // These fail validation, but still count towards the limit
  for (let i = 0; i < 20; i++) {
    const res = await attempt();
    expect(res.status).toBe(400);
  }

  const blocked = await attempt();
  expect(blocked.status).toBe(429);
  expect(blocked.body.error).toMatch(/Too many attempts/);
});
