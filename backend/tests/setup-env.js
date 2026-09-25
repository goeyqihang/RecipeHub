// Runs before each test file, before any backend module reads its configuration.
const crypto = require('crypto');
const os = require('os');
const path = require('path');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
// Each test file caches its generated audio in its own temporary folder
process.env.AUDIO_DIR = path.join(os.tmpdir(), `recipehub-test-audio-${crypto.randomUUID()}`);
// Never call the real Gemini API from tests
process.env.GEMINI_API_KEY = '';
// Tests register and log in many users; rate-limit.test.js checks the limit itself
process.env.AUTH_RATE_LIMIT = '1000';
