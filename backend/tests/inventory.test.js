const request = require('supertest');
const InventoryItem = require('../models/inventoryItem');
const {
  app, connectTestDatabase, clearTestDatabase, dropTestDatabase, registerAndLogin, auth, sampleInventoryItem,
} = require('./helpers');

beforeAll(connectTestDatabase);
afterEach(clearTestDatabase);
afterAll(dropTestDatabase);

const addItem = (token, item = sampleInventoryItem()) =>
  request(app).post('/api/inventory/add').set(auth(token)).send(item);

// A date `days` from today, as YYYY-MM-DD
const daysFromNow = (days) => new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

it('adds items and reports stats for in-stock items', async () => {
  const { token, user } = await registerAndLogin('manager');

  const { body: added } = await addItem(token).expect(201);
  expect(added.inventoryId).toMatch(/^I-\d{5}$/);
  expect(added.userId).toBe(user.userId);
  expect(added.status).toBe('In Stock');

  await addItem(token, sampleInventoryItem({ ingredientName: 'Milk', quantity: 2, unit: 'liters', category: 'Dairy', cost: 3 }))
    .expect(201);

  const res = await request(app).get('/api/inventory').set(auth(token)).expect(200);
  expect(res.body.inventoryItems.map((item) => item.ingredientName)).toEqual(['Milk', 'Tomatoes']);
  expect(res.body.stats).toMatchObject({ totalItems: 2, totalValue: 7.5, lowStockCount: 1 });
});

it('filters by category and by upcoming expiry', async () => {
  const { token } = await registerAndLogin('chef');
  await addItem(token, sampleInventoryItem({ ingredientName: 'Spinach', expirationDate: daysFromNow(2) })).expect(201);
  await addItem(token, sampleInventoryItem({ ingredientName: 'Rice', category: 'Grains', unit: 'kg' })).expect(201);

  const grains = await request(app).get('/api/inventory?category=Grains').set(auth(token)).expect(200);
  expect(grains.body.inventoryItems.map((item) => item.ingredientName)).toEqual(['Rice']);

  const expiring = await request(app).get('/api/inventory?expiringWithinDays=3').set(auth(token)).expect(200);
  expect(expiring.body.inventoryItems.map((item) => item.ingredientName)).toEqual(['Spinach']);
});

it('requires the expiration date to be after the purchase date', async () => {
  const { token } = await registerAndLogin('chef');

  const res = await addItem(token, sampleInventoryItem({ purchaseDate: '2026-03-01', expirationDate: '2026-03-01' }));
  expect(res.status).toBe(400);
  expect(res.body.details).toContain('Expiration date must be after the purchase date');
});

it('keeps consumed items as history and deletes data-entry errors for good', async () => {
  const { token } = await registerAndLogin('chef');
  const { body: eggs } = await addItem(token, sampleInventoryItem({ ingredientName: 'Eggs', unit: 'dozen' })).expect(201);
  const { body: typo } = await addItem(token, sampleInventoryItem({ ingredientName: 'Tomatos' })).expect(201);

  await request(app).delete(`/api/inventory/delete/${eggs.inventoryId}`).set(auth(token))
    .send({ deletionReason: 'Consumed' }).expect(200);
  await request(app).delete(`/api/inventory/delete/${typo.inventoryId}`).set(auth(token))
    .send({ deletionReason: 'PermanentDelete' }).expect(200);

  const consumed = await InventoryItem.findOne({ inventoryId: eggs.inventoryId }).lean();
  expect(consumed.status).toBe('Consumed');
  expect(consumed.consumedDate).toBeInstanceOf(Date);
  expect(await InventoryItem.exists({ inventoryId: typo.inventoryId })).toBeNull();

  // Consumed items can no longer be edited
  await request(app).put(`/api/inventory/update/${eggs.inventoryId}`).set(auth(token)).send({ quantity: 3 }).expect(404);
});

it('gives managers a stock overview on their dashboard', async () => {
  const { token } = await registerAndLogin('manager');
  await addItem(token, sampleInventoryItem({ quantity: 2, cost: 10, expirationDate: daysFromNow(5) })).expect(201);

  const res = await request(app).get('/api/dashboard').set(auth(token)).expect(200);
  expect(res.body.totalValue).toBe(10);
  expect(res.body.expiringItems).toHaveLength(1);
  expect(res.body.lowStockItems).toHaveLength(1);
});
