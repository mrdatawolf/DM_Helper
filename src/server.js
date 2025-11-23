const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const path = require('path');
require('dotenv').config();

const { getDatabase, closeDatabase } = require('./database/connection');

// Import routes
const characterRoutes = require('./routes/characters');
const shadowRoutes = require('./routes/shadows');
const sessionRoutes = require('./routes/sessions');
const progressRoutes = require('./routes/progress');
const claimsRoutes = require('./routes/claims');
const authRoutes = require('./routes/auth');
const journalRoutes = require('./routes/journal');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve static files (for the DM dashboard)
app.use(express.static(path.join(__dirname, '../public')));

// Initialize database connection
getDatabase();

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/characters', characterRoutes);
app.use('/api/shadows', shadowRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/claims', claimsRoutes);
app.use('/api/journal', journalRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'DM Helper API is running' });
});

// Serve the landing page on root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Serve the DM dashboard
app.get('/dm', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/dm-dashboard.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error', message: err.message });
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('Shutting down gracefully...');
    closeDatabase();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('Shutting down gracefully...');
    closeDatabase();
    process.exit(0);
});

// Start server
app.listen(PORT, () => {
    console.log(`DM Helper server running on http://localhost:${PORT}`);
    console.log(`DM Dashboard available at http://localhost:${PORT}`);
    console.log(`API available at http://localhost:${PORT}/api`);
});
