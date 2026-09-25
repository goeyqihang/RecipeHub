const crypto = require('crypto');
const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../app');

// The tests need a running MongoDB (a local install, or a service container in CI).
// Each test file works in its own throwaway database, which is dropped afterwards,
// so existing databases such as recipeHubDB are never touched.
const MONGO_TEST_URI = process.env.MONGO_TEST_URI || 'mongodb://127.0.0.1:27017';

async function connectTestDatabase() {
  await mongoose.connect(MONGO_TEST_URI, {
    dbName: `recipehub-test-${crypto.randomUUID()}`,
    serverSelectionTimeoutMS: 5000,
  });
  // Make sure unique indexes exist before the tests rely on them
  await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
}

async function clearTestDatabase() {
  const collections = await mongoose.connection.db.collections();
  await Promise.all(collections.map((collection) => collection.deleteMany({})));
}

async function dropTestDatabase() {
  if (mongoose.connection.name?.startsWith('recipehub-test-')) {
    await mongoose.connection.dropDatabase();
  }
  await mongoose.disconnect();
}

let userCount = 0;

// Registers a new user with the given role and returns { token, user, credentials }
async function registerAndLogin(role = 'chef', overrides = {}) {
  userCount += 1;
  const credentials = {
    fullname: `Test ${role} ${userCount}`,
    email: `${role}${userCount}-${crypto.randomUUID().slice(0, 8)}@example.com`,
    phone: '0412 345 678',
    password: 'Passw0rd!',
    role,
    ...overrides,
  };

  await request(app).post('/api/register').send(credentials).expect(201);
  const res = await request(app)
    .post('/api/login')
    .send({ email: credentials.email, password: credentials.password })
    .expect(200);

  return { token: res.body.token, user: res.body.user, credentials };
}

const auth = (token) => ({ Authorization: `Bearer ${token}` });

const sampleRecipe = (overrides = {}) => ({
  title: `Tomato Soup ${crypto.randomUUID().slice(0, 8)}`,
  chef: 'Test Chef',
  ingredients: ['4 ripe tomatoes', 'Salt, to taste', '1 onion'],
  instructions: ['Chop the tomatoes and the onion.', 'Simmer everything for 20 minutes, then blend.'],
  mealType: 'Lunch',
  cuisineType: 'Italian',
  prepTime: 30,
  difficulty: 'Easy',
  servings: 2,
  ...overrides,
});

const sampleInventoryItem = (overrides = {}) => ({
  ingredientName: 'Tomatoes',
  quantity: 6,
  unit: 'pieces',
  category: 'Vegetables',
  purchaseDate: '2026-01-01',
  expirationDate: '2099-01-10',
  location: 'Fridge',
  cost: 4.5,
  ...overrides,
});

module.exports = {
  app,
  connectTestDatabase,
  clearTestDatabase,
  dropTestDatabase,
  registerAndLogin,
  auth,
  sampleRecipe,
  sampleInventoryItem,
};
