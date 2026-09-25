const request = require('supertest');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const {
  app, connectTestDatabase, clearTestDatabase, dropTestDatabase, registerAndLogin, auth,
} = require('./helpers');

beforeAll(connectTestDatabase);
afterEach(clearTestDatabase);
afterAll(dropTestDatabase);

describe('registration', () => {
  it('stores a bcrypt hash instead of the plain-text password', async () => {
    const { credentials } = await registerAndLogin('chef');

    const stored = await User.findOne({ email: credentials.email }).select('+password').lean();
    expect(stored.password).not.toBe(credentials.password);
    expect(stored.password).toMatch(/^\$2[aby]\$10\$/);
  });

  it('rejects a weak password', async () => {
    const res = await request(app).post('/api/register').send({
      fullname: 'Weak Password', email: 'weak@example.com', phone: '0412 345 678', password: 'password', role: 'chef',
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/at least 8 characters/);
  });

  it('rejects an email that is already registered', async () => {
    const { credentials } = await registerAndLogin('chef');

    const res = await request(app).post('/api/register').send(credentials);
    expect(res.status).toBe(409);
  });
});

describe('login', () => {
  it('returns a signed token and the user without the password', async () => {
    const { token, user, credentials } = await registerAndLogin('manager');

    expect(user).toMatchObject({ email: credentials.email, role: 'manager' });
    expect(user).not.toHaveProperty('password');

    const payload = jwt.verify(token, 'test-secret');
    expect(payload).toMatchObject({ sub: user.userId, role: 'manager' });
    expect(payload.exp).toBeGreaterThan(payload.iat);
  });

  it('rejects a wrong password', async () => {
    const { credentials } = await registerAndLogin('chef');

    const res = await request(app).post('/api/login').send({ email: credentials.email, password: 'Wrong-passw0rd' });
    expect(res.status).toBe(401);
    expect(res.body).not.toHaveProperty('token');
  });

  it('rejects query objects instead of strings (NoSQL injection)', async () => {
    await registerAndLogin('chef');

    const res = await request(app).post('/api/login').send({ email: { $ne: null }, password: { $ne: null } });
    expect(res.status).toBe(400);
  });
});

describe('protected routes', () => {
  it('returns the current user for a valid token', async () => {
    const { token, user } = await registerAndLogin('chef');

    const res = await request(app).get('/api/session').set(auth(token)).expect(200);
    expect(res.body.user).toMatchObject({ userId: user.userId, fullname: user.fullname });
  });

  it('rejects requests without a token', async () => {
    await request(app).get('/api/session').expect(401);
    await request(app).get('/api/dashboard').expect(401);
    await request(app).get('/api/inventory').expect(401);
  });

  it('rejects tampered and expired tokens', async () => {
    const { token, user } = await registerAndLogin('chef');

    const forged = jwt.sign({ role: 'admin' }, 'not-the-secret', { subject: user.userId });
    await request(app).get('/api/session').set(auth(forged)).expect(401);

    const expired = jwt.sign({ role: 'chef' }, 'test-secret', { subject: user.userId, expiresIn: -10 });
    await request(app).get('/api/session').set(auth(expired)).expect(401);

    // A valid token still works
    await request(app).get('/api/session').set(auth(token)).expect(200);
  });

  it('keeps users logged in independently of each other', async () => {
    const chef = await registerAndLogin('chef');
    const admin = await registerAndLogin('admin');

    const chefRes = await request(app).get('/api/session').set(auth(chef.token)).expect(200);
    const adminRes = await request(app).get('/api/session').set(auth(admin.token)).expect(200);
    expect(chefRes.body.user.role).toBe('chef');
    expect(adminRes.body.user.role).toBe('admin');
  });

  it('never sends password hashes to the admin dashboard', async () => {
    const { token } = await registerAndLogin('admin');

    const res = await request(app).get('/api/dashboard').set(auth(token)).expect(200);
    expect(res.body.recentUsers.length).toBeGreaterThan(0);
    res.body.recentUsers.forEach((recentUser) => expect(recentUser).not.toHaveProperty('password'));
  });
});

describe('API hardening', () => {
  it('sets security headers', async () => {
    const res = await request(app).get('/api/unknown');
    expect(res.headers['content-security-policy']).toContain("default-src 'self'");
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('answers unknown API routes and malformed JSON with JSON errors', async () => {
    const notFound = await request(app).get('/api/unknown').expect(404);
    expect(notFound.body).toEqual({ error: 'Not found' });

    const malformed = await request(app)
      .post('/api/login')
      .set('Content-Type', 'application/json')
      .send('{"email": ');
    expect(malformed.status).toBe(400);
    expect(malformed.body).toHaveProperty('error');
  });
});
