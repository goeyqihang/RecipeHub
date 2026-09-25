const { getRecipeAudioUrl, SpeechRequestError } = require('../services/speechService');

/**
 * Registers the Socket.IO handler that reads recipe instructions aloud.
 * Connections are authenticated by middleware in server.js. The client sends
 * { recipeId } and gets { audioUrl } or { error } back as an acknowledgement.
 */
module.exports = (io) => {
    io.on('connection', (socket) => {
        socket.on('recipe:text-to-speech', async (data, reply) => {
            if (typeof reply !== 'function') return; // The client must ask for an acknowledgement

            // Same rule as the recipes REST API
            if (socket.data.user.role !== 'chef') {
                return reply({ error: 'Only chefs can use read-aloud.' });
            }

            const recipeId = data?.recipeId;
            if (typeof recipeId !== 'string' || !recipeId) {
                return reply({ error: 'Missing recipeId.' });
            }

            try {
                reply({ audioUrl: await getRecipeAudioUrl(recipeId) });
            } catch (error) {
                if (error instanceof SpeechRequestError) {
                    return reply({ error: error.message });
                }
                console.error(`Error generating speech for recipe ${recipeId}:`, error);
                reply({ error: 'Failed to generate speech.' });
            }
        });
    });
};
