const request = require('supertest');
const Recipe = require('../models/recipe');
const {
  app, connectTestDatabase, clearTestDatabase, dropTestDatabase, registerAndLogin, auth, sampleRecipe,
} = require('./helpers');

beforeAll(connectTestDatabase);
afterEach(clearTestDatabase);
afterAll(dropTestDatabase);

const createRecipe = (token, recipe = sampleRecipe()) =>
  request(app).post('/api/recipes/add').set(auth(token)).send(recipe);

describe('creating recipes', () => {
  it('stores ingredients and steps as arrays, so entries may contain commas', async () => {
    const { token, user } = await registerAndLogin('chef');

    const res = await createRecipe(token).expect(201);
    expect(res.body.recipeId).toMatch(/^R-\d{5}$/);
    expect(res.body.userId).toBe(user.userId);
    expect(res.body.ingredients).toEqual(['4 ripe tomatoes', 'Salt, to taste', '1 onion']);
    expect(res.body.instructions).toHaveLength(2);
  });

  it('trims entries and drops empty ones', async () => {
    const { token } = await registerAndLogin('chef');

    const res = await createRecipe(token, sampleRecipe({ ingredients: ['  2 eggs  ', '', '   ', 'Butter'] })).expect(201);
    expect(res.body.ingredients).toEqual(['2 eggs', 'Butter']);
  });

  it('rejects comma-separated strings and invalid entries', async () => {
    const { token } = await registerAndLogin('chef');

    const asString = await createRecipe(token, sampleRecipe({ ingredients: 'eggs, milk, flour' }));
    expect(asString.status).toBe(400);
    expect(asString.body.error).toBe('ingredients must be an array of strings.');

    const tooShort = await createRecipe(token, sampleRecipe({ instructions: ['Stir.'] }));
    expect(tooShort.status).toBe(400);
    expect(tooShort.body.error).toMatch(/at least 10 characters/);
  });

  it('ignores fields that only the server may set', async () => {
    const { token, user } = await registerAndLogin('chef');

    const res = await createRecipe(token, sampleRecipe({ userId: 'U-99999', views: 1000 })).expect(201);
    expect(res.body.userId).toBe(user.userId);
    expect(res.body.views).toBe(0);
  });

  it('keeps titles unique across all chefs', async () => {
    const first = await registerAndLogin('chef');
    const second = await registerAndLogin('chef');
    const recipe = sampleRecipe();

    await createRecipe(first.token, recipe).expect(201);
    const res = await createRecipe(second.token, recipe);
    expect(res.status).toBe(409);
  });

  it('is only available to chefs', async () => {
    const { token } = await registerAndLogin('manager');

    await createRecipe(token).expect(403);
    await request(app).get('/api/recipes').set(auth(token)).expect(403);
  });
});

describe('reading recipes', () => {
  it('lists all recipes or only your own', async () => {
    const first = await registerAndLogin('chef');
    const second = await registerAndLogin('chef');
    await createRecipe(first.token).expect(201);
    await createRecipe(second.token).expect(201);

    const all = await request(app).get('/api/recipes').set(auth(first.token)).expect(200);
    expect(all.body).toHaveLength(2);

    const mine = await request(app).get('/api/recipes?filter=mine').set(auth(first.token)).expect(200);
    expect(mine.body).toHaveLength(1);
    expect(mine.body[0].userId).toBe(first.user.userId);
  });

  it('counts views', async () => {
    const { token } = await registerAndLogin('chef');
    const { body: recipe } = await createRecipe(token).expect(201);

    await request(app).get(`/api/recipes/view/${recipe.recipeId}`).set(auth(token)).expect(200);
    const res = await request(app).get(`/api/recipes/view/${recipe.recipeId}`).set(auth(token)).expect(200);
    expect(res.body.views).toBe(2);
  });
});

describe('updating and deleting recipes', () => {
  it('lets the owner update a recipe but not reassign it', async () => {
    const { token, user } = await registerAndLogin('chef');
    const { body: recipe } = await createRecipe(token).expect(201);

    const res = await request(app)
      .put(`/api/recipes/update/${recipe.recipeId}`)
      .set(auth(token))
      .send({ ...sampleRecipe({ title: 'Roasted Tomato Soup' }), userId: 'U-99999' })
      .expect(200);

    expect(res.body.title).toBe('Roasted Tomato Soup');
    expect(res.body.userId).toBe(user.userId);
  });

  it('forbids other chefs from changing or deleting it', async () => {
    const owner = await registerAndLogin('chef');
    const other = await registerAndLogin('chef');
    const { body: recipe } = await createRecipe(owner.token).expect(201);

    await request(app).put(`/api/recipes/update/${recipe.recipeId}`).set(auth(other.token)).send(sampleRecipe()).expect(403);
    await request(app).delete(`/api/recipes/delete/${recipe.recipeId}`).set(auth(other.token)).expect(403);

    await request(app).delete(`/api/recipes/delete/${recipe.recipeId}`).set(auth(owner.token)).expect(200);
    expect(await Recipe.countDocuments()).toBe(0);
  });
});

describe('AI health analysis', () => {
  it('explains when the Gemini API key is missing', async () => {
    const { token } = await registerAndLogin('chef');
    const { body: recipe } = await createRecipe(token).expect(201);

    const res = await request(app).post(`/api/recipes/analyze-health/${recipe.recipeId}`).set(auth(token));
    expect(res.status).toBe(503);
    expect(res.body.error).toMatch(/GEMINI_API_KEY/);
  });
});
