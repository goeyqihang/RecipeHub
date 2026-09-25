const fs = require('fs');
const http = require('http');
const path = require('path');
const request = require('supertest');
const { Server } = require('socket.io');
const { io: connectClient } = require('socket.io-client');

// Replace Google Text-to-Speech with a fake that returns a few bytes of "audio"
const mockSynthesizeSpeech = jest.fn();
jest.mock('@google-cloud/text-to-speech', () => ({
  TextToSpeechClient: jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(undefined),
    synthesizeSpeech: (...args) => mockSynthesizeSpeech(...args),
  })),
}));

const config = require('../config');
const Recipe = require('../models/recipe');
const { authenticateSocket } = require('../middleware/auth');
const registerTextToSpeechHandlers = require('../sockets/textToSpeech');
const { getRecipeAudioUrl, pruneAudioCache, SpeechRequestError } = require('../services/speechService');
const {
  app, connectTestDatabase, clearTestDatabase, dropTestDatabase, registerAndLogin, sampleRecipe,
} = require('./helpers');

let io;
let baseUrl;

beforeAll(async () => {
  await connectTestDatabase();

  // Same wiring as server.js, on a random free port
  const server = http.createServer(app);
  io = new Server(server);
  io.use(authenticateSocket);
  registerTextToSpeechHandlers(io);
  await new Promise((resolve) => server.listen(0, resolve));
  baseUrl = `http://localhost:${server.address().port}`;
});

beforeEach(() => {
  mockSynthesizeSpeech.mockResolvedValue([{ audioContent: Buffer.from('fake mp3') }]);
});

const clearAudioCache = () => fs.promises.rm(config.audioDir, { recursive: true, force: true });

afterEach(async () => {
  mockSynthesizeSpeech.mockReset();
  await clearAudioCache();
  await clearTestDatabase();
});

afterAll(async () => {
  await new Promise((resolve) => io.close(resolve));
  await dropTestDatabase();
});

const createRecipe = (overrides) => Recipe.create(sampleRecipe({ userId: 'U-00001', ...overrides }));

describe('audio cache', () => {
  it('synthesizes a recipe once, then serves the cached file', async () => {
    const recipe = await createRecipe();

    const firstUrl = await getRecipeAudioUrl(recipe.recipeId);
    const secondUrl = await getRecipeAudioUrl(recipe.recipeId);

    expect(firstUrl).toMatch(/^\/audio\/[0-9a-f]{32}\.mp3$/);
    expect(secondUrl).toBe(firstUrl);
    expect(mockSynthesizeSpeech).toHaveBeenCalledTimes(1);
    expect(mockSynthesizeSpeech.mock.calls[0][0].input.text).toBe(recipe.instructions.join('. '));

    const res = await request(app).get(firstUrl).expect(200);
    expect(res.body.toString()).toBe('fake mp3');
  });

  it('shares one file between recipes with identical instructions', async () => {
    const first = await createRecipe();
    const second = await createRecipe();

    expect(await getRecipeAudioUrl(second.recipeId)).toBe(await getRecipeAudioUrl(first.recipeId));
    expect(mockSynthesizeSpeech).toHaveBeenCalledTimes(1);
  });

  it('reports unknown recipes with a message for the user', async () => {
    await expect(getRecipeAudioUrl('R-99999')).rejects.toThrow(SpeechRequestError);
    expect(mockSynthesizeSpeech).not.toHaveBeenCalled();
  });

  it('prunes audio that has not been used for a day', async () => {
    await fs.promises.mkdir(config.audioDir, { recursive: true });
    const stale = path.join(config.audioDir, 'stale.mp3');
    const fresh = path.join(config.audioDir, 'fresh.mp3');
    await fs.promises.writeFile(stale, 'old');
    await fs.promises.writeFile(fresh, 'new');
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    await fs.promises.utimes(stale, twoDaysAgo, twoDaysAgo);

    await pruneAudioCache();

    expect(fs.existsSync(stale)).toBe(false);
    expect(fs.existsSync(fresh)).toBe(true);
  });
});

describe('Socket.IO read-aloud', () => {
  const connect = (token) => new Promise((resolve, reject) => {
    const socket = connectClient(baseUrl, { auth: { token }, transports: ['websocket'], reconnection: false });
    socket.on('connect', () => resolve(socket));
    socket.on('connect_error', (error) => {
      socket.close();
      reject(error);
    });
  });

  it('refuses connections without a valid login token', async () => {
    await expect(connect(undefined)).rejects.toThrow('Authentication required');
    await expect(connect('not-a-token')).rejects.toThrow('Authentication required');
  });

  it('replies to a chef with the audio URL', async () => {
    const { token } = await registerAndLogin('chef');
    const recipe = await createRecipe();
    const socket = await connect(token);

    try {
      const reply = await socket.timeout(5000).emitWithAck('recipe:text-to-speech', { recipeId: recipe.recipeId });
      expect(reply.audioUrl).toMatch(/^\/audio\/[0-9a-f]{32}\.mp3$/);

      const missing = await socket.timeout(5000).emitWithAck('recipe:text-to-speech', { recipeId: 'R-99999' });
      expect(missing).toEqual({ error: 'Recipe not found.' });
    } finally {
      socket.close();
    }
  });

  it('follows the recipe API rule that only chefs may use it', async () => {
    const { token } = await registerAndLogin('manager');
    const recipe = await createRecipe();
    const socket = await connect(token);

    try {
      const reply = await socket.timeout(5000).emitWithAck('recipe:text-to-speech', { recipeId: recipe.recipeId });
      expect(reply).toEqual({ error: 'Only chefs can use read-aloud.' });
      expect(mockSynthesizeSpeech).not.toHaveBeenCalled();
    } finally {
      socket.close();
    }
  });
});
