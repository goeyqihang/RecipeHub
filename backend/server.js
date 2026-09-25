const config = require('./config'); // Loads .env first, before anything reads process.env
const http = require('http');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const app = require('./app');
const { authenticateSocket } = require('./middleware/auth');
const registerTextToSpeechHandlers = require('./sockets/textToSpeech');
const { pruneAudioCache } = require('./services/speechService');

const server = http.createServer(app);

// No CORS options: the Angular app is served by this same server, so only same-origin clients connect
const io = new Server(server);
io.use(authenticateSocket);
registerTextToSpeechHandlers(io);

// Delete cached audio that hasn't been used for a day, now and then every hour
const pruneAudio = () => pruneAudioCache().catch(error => console.error('Failed to prune audio cache:', error));
pruneAudio();
setInterval(pruneAudio, 60 * 60 * 1000).unref();

// --- Server Startup Function ---
const startServer = async () => {
    try {
        await mongoose.connect(config.mongoUri);
        console.log('MongoDB Connected successfully.');

        server.listen(config.port, () => {
            console.log(`Server with Socket.IO is listening on http://localhost:${config.port}`);
        });

    } catch (error) {
        console.error('Failed to connect to MongoDB', error);
        process.exit(1);
    }
};

// --- Execute the startup function ---
startServer();
