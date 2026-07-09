const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const path = require('path');
require('dotenv').config();

const { getDatabase, closeDatabase } = require('./database/connection');
const { runMigrations } = require('./database/migrate');

// Import routes
const characterRoutes = require('./routes/characters');
const shadowRoutes = require('./routes/shadows');
const sessionRoutes = require('./routes/sessions');
const progressRoutes = require('./routes/progress');
const claimsRoutes = require('./routes/claims');
const authRoutes = require('./routes/auth');
const journalRoutes = require('./routes/journal');
const primalPatternsRoutes = require('./routes/primal-patterns');
const adminRoutes = require('./routes/admin');
const arcRoutes   = require('./routes/arcs');
const beatRoutes  = require('./routes/beats');
const npcRoutes   = require('./routes/npcs');
const sceneRoutes = require('./routes/scenes');
const sessionNoteRoutes = require('./routes/session-notes');
const combatRoutes = require('./routes/combats');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve static files (for the DM dashboard)
app.use(express.static(path.join(__dirname, '../public')));

// Initialize database connection and apply pending migrations
runMigrations(getDatabase());

// Seed admin user from ADMIN_PASSWORD env var
async function seedAdminUser() {
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
        console.log('ADMIN_PASSWORD not set — admin user not created');
        return;
    }
    const db = getDatabase();
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
    const hash = await bcrypt.hash(adminPassword, 10);
    if (existing) {
        db.prepare('UPDATE users SET password_hash = ? WHERE username = ?').run(hash, 'admin');
    } else {
        db.prepare(`INSERT INTO users (username, password_hash, is_dm) VALUES ('admin', ?, 0)`).run(hash);
        console.log('Admin user created');
    }
}

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/characters', characterRoutes);
app.use('/api/shadows', shadowRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/claims', claimsRoutes);
app.use('/api/journal', journalRoutes);
app.use('/api/primal-patterns', primalPatternsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/arcs',  arcRoutes);
app.use('/api/beats', beatRoutes);
app.use('/api/npcs',  npcRoutes);
app.use('/api/scenes', sceneRoutes);
app.use('/api/session-notes', sessionNoteRoutes);
app.use('/api/combats', combatRoutes);

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

// Start the server only when run directly (tests import { app } instead)
if (require.main === module) {
    seedAdminUser().catch(err => console.error('seedAdminUser failed:', err));

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

    process.on('unhandledRejection', (reason) => {
        console.error('Unhandled rejection:', reason);
    });

    const server = app.listen(PORT, () => {
        console.log(`DM Helper server running on http://localhost:${PORT}`);
        console.log(`DM Dashboard available at http://localhost:${PORT}`);
        console.log(`API available at http://localhost:${PORT}/api`);
    });
    server.on('error', (err) => {
        console.error(`Server failed to start: ${err.message}`);
        if (err.code === 'EACCES') {
            console.error(`Port ${PORT} is reserved by Windows. Change PORT in .env to a different value (e.g. 3777) and try again.`);
        } else if (err.code === 'EADDRINUSE') {
            console.error(`Port ${PORT} is already in use. Stop the other process or change PORT in .env.`);
        }
        process.exit(1);
    });
}

module.exports = { app };
