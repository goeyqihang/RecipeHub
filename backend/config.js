const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Load variables from the project-root .env file, if there is one.
// Variables already set in the shell take precedence over the file.
const envFile = path.join(__dirname, '..', '.env');
if (fs.existsSync(envFile)) {
  process.loadEnvFile(envFile);
}

const isTest = process.env.NODE_ENV === 'test';

const config = {
  port: Number(process.env.PORT) || 8080,
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/recipeHubDB',
  // Secret used to sign login tokens (JWTs)
  jwtSecret: process.env.JWT_SECRET || undefined,
  // How long a login token stays valid, e.g. '7d' or '12h'
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  // Maximum login/registration requests per IP every 15 minutes
  authRateLimit: Number(process.env.AUTH_RATE_LIMIT) || 20,
  // Where generated text-to-speech MP3 files are cached
  audioDir: process.env.AUDIO_DIR || path.join(__dirname, 'public', 'audio'),
  // Google Gemini API key, used for the AI health analysis
  geminiApiKey: process.env.GEMINI_API_KEY || undefined,
  // Path to a Google Cloud service-account key, used for translation and text-to-speech.
  // The Google Cloud client libraries read this variable directly.
  googleCredentialsFile: process.env.GOOGLE_APPLICATION_CREDENTIALS || undefined,
};

if (!config.jwtSecret) {
  // A random secret keeps tokens secure, but every restart logs all users out
  config.jwtSecret = crypto.randomBytes(32).toString('hex');
  if (!isTest) {
    console.warn('JWT_SECRET is not set: using a random secret, so logins will not survive a server restart.');
  }
}
if (!config.geminiApiKey && !isTest) {
  console.warn('GEMINI_API_KEY is not set: AI health analysis will not work.');
}
if (!config.googleCredentialsFile && !isTest) {
  console.warn('GOOGLE_APPLICATION_CREDENTIALS is not set: translation and text-to-speech need Google Cloud credentials.');
}

module.exports = config;
