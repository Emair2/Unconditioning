const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

let screenshotsData = [];  // Store all screenshots and their metadata

// Serve the homepage
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Handle new screenshot data
app.post('/upload', (req, res) => {
    const { screenshot, latitude, longitude, instruction, timestamp } = req.body;
    const newScreenshot = {
        screenshot,
        latitude,
        longitude,
        instruction,
        timestamp
    };
    screenshotsData.push(newScreenshot);
    io.emit('new_screenshot', newScreenshot);  // Notify all clients about the new screenshot
    res.status(200).json({ message: 'Screenshot saved!' });
});

// Serve real-time updates
io.on('connection', (socket) => {
    console.log('A user connected');
    // Send all existing screenshots to the newly connected user
    socket.emit('all_screenshots', screenshotsData);

    socket.on('disconnect', () => {
        console.log('A user disconnected');
    });
});

// Start the server
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
