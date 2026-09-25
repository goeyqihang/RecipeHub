const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const textToSpeech = require('@google-cloud/text-to-speech');
const config = require('../config');
const Recipe = require('../models/recipe');

const VOICE = { languageCode: 'en-US', ssmlGender: 'NEUTRAL' };
// Google Text-to-Speech accepts at most 5,000 bytes of text per request
const MAX_TEXT_BYTES = 5000;
// Cached audio that hasn't been used for this long is deleted by pruneAudioCache()
const MAX_AUDIO_AGE_MS = 24 * 60 * 60 * 1000;

// Authenticates with the service-account key referenced by GOOGLE_APPLICATION_CREDENTIALS
const ttsClient = new textToSpeech.TextToSpeechClient();

/** An error whose message is safe to show to the user. */
class SpeechRequestError extends Error {}

/**
 * Returns the URL of an MP3 that reads a recipe's instructions aloud.
 * Files are named after a hash of the voice and the text, so identical instructions
 * reuse the cached file instead of calling the Text-to-Speech API again.
 */
const getRecipeAudioUrl = async (recipeId) => {
    const recipe = await Recipe.findOne({ recipeId }).lean();
    if (!recipe) {
        throw new SpeechRequestError('Recipe not found.');
    }

    const text = recipe.instructions.join('. ');
    if (Buffer.byteLength(text) > MAX_TEXT_BYTES) {
        throw new SpeechRequestError('These instructions are too long to read aloud.');
    }

    const hash = crypto.createHash('sha256').update(JSON.stringify([VOICE, text])).digest('hex');
    const filename = `${hash.slice(0, 32)}.mp3`;
    const filePath = path.join(config.audioDir, filename);
    const audioUrl = `/audio/${filename}`;

    if (fs.existsSync(filePath)) {
        // Cache hit: refresh the timestamp so pruning keeps recently used files
        const now = new Date();
        await fs.promises.utimes(filePath, now, now);
        return audioUrl;
    }

    // Load credentials first, so that a missing or invalid key rejects here.
    // Otherwise the client library rejects a promise nobody handles, which crashes the server.
    await ttsClient.initialize();
    const [response] = await ttsClient.synthesizeSpeech({
        input: { text },
        voice: VOICE,
        audioConfig: { audioEncoding: 'MP3' },
    });

    // Write to a temporary file and rename it, so a half-written MP3 is never served
    await fs.promises.mkdir(config.audioDir, { recursive: true });
    const tempPath = `${filePath}.${crypto.randomUUID()}.tmp`;
    await fs.promises.writeFile(tempPath, response.audioContent);
    try {
        await fs.promises.rename(tempPath, filePath);
    } catch (error) {
        // A concurrent request may have just created the same file
        await fs.promises.rm(tempPath, { force: true });
        if (!fs.existsSync(filePath)) {
            throw error;
        }
    }
    return audioUrl;
};

/** Deletes cached audio files that haven't been used for a day. */
const pruneAudioCache = async () => {
    let filenames;
    try {
        filenames = await fs.promises.readdir(config.audioDir);
    } catch (error) {
        if (error.code === 'ENOENT') return; // Nothing cached yet
        throw error;
    }

    const cutoff = Date.now() - MAX_AUDIO_AGE_MS;
    for (const filename of filenames) {
        const filePath = path.join(config.audioDir, filename);
        try {
            const stats = await fs.promises.stat(filePath);
            if (stats.isFile() && stats.mtimeMs < cutoff) {
                await fs.promises.rm(filePath, { force: true });
            }
        } catch (error) {
            console.error(`Could not prune ${filePath}:`, error.message);
        }
    }
};

module.exports = { getRecipeAudioUrl, pruneAudioCache, SpeechRequestError };
