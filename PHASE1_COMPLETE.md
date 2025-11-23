# Phase 1 Complete - DM Helper

## What's Been Built

Phase 1 of the DM Helper is complete! This system provides a foundation for managing your Amber-based D&D 5e campaign with async character progression tracking.

### Features Implemented

#### 1. Database Schema
- **Characters**: Full D&D 5e stats plus Amber-specific attributes (Pattern/Logrus imprints, Order/Chaos balance, blood purity, Trump artistry)
- **Shadows**: Track different realms with Order/Chaos levels and Pattern influence
- **Campaign Sessions**: Record game sessions with DM notes
- **Character Progress**: Session-by-session tracking of individual character storylines
- **Gear & Powers**: Track character equipment and abilities
- **Feat System**: Your custom feat/leveling mechanics are integrated

#### 2. REST API
All endpoints are functional at `http://localhost:3002/api`:
- `/api/characters` - CRUD operations for characters
- `/api/shadows` - Manage shadows/realms
- `/api/sessions` - Track campaign sessions
- `/api/progress` - Record character progress by session

#### 3. DM Dashboard
A web-based interface at `http://localhost:3002` with:
- Character management (create, view, edit, delete)
- Shadow tracking with Order/Chaos visualization
- Session logging
- Progress tracking with filtering by character

### Technology Stack
- **Backend**: Node.js + Express
- **Database**: SQLite3 (better-sqlite3 for performance)
- **Frontend**: Vanilla HTML/CSS/JavaScript (no framework dependencies)

## Getting Started

### Start the Server
```bash
npm run dev
```

The server will start on `http://localhost:3002`

### Initialize/Reset Database
```bash
npm run init-db
```

This creates the database with seed data including:
- Amber (Kolvir)
- The Courts of Chaos
- The Soul Realm
- Billabong's Veil
- Shadow Earth

### Access the Dashboard
Open your browser to: `http://localhost:3002`

## Current State

The database already contains:
- 1 test character: **Aelindra Moonshadow** (Elevi Wizard from The Soul Realm)
- 1 game session: **The Moonstalker Hunt**
- 1 progress entry showing the feat/XP system working

## Amber-Specific Features

### Character Tracking
- **Blood Purity**: Pure, Half, or None (for Soul Realm magic users)
- **Order/Chaos Balance**: 0-100 scale, visualized in the UI
- **Pattern Powers**: Track Pattern imprint and mastery level
- **Logrus Powers**: Track Logrus imprint and mastery level
- **Trump Artistry**: Track Trump abilities

### Shadow Management
- **Order/Chaos Levels**: Each shadow has balance levels
- **Pattern Influence**: First Pattern, Corwin's Pattern, Logrus, Mixed, or None
- **Corruption Status**: Track corruption spreading through shadows
- **Starting Shadows**: Flag shadows where characters can begin

### Async Progress Tracking
- Each character has independent progress tracking
- Sessions can be solo or group
- Feats and XP automatically update character stats
- Track story beats, NPCs met, items acquired
- DM private notes for each session

## What's Different from Standard D&D

1. **Feat System**: Characters earn feats from sessions, leveling, and "unknown unknown" moments
2. **Order/Chaos Tracking**: Replaces alignment, affects magic use
3. **Shadow Locations**: Characters exist in specific shadows
4. **Async Play**: System designed for characters adventuring separately
5. **Blood Magic**: Tracking for Soul Realm magic mechanics

## Next Steps (Phase 2)

When you're ready to expand:
- Player account system (so players can log in)
- Real-time messaging between DM and players
- Player-facing character sheets
- WebSocket integration for live updates
- Combat tracker
- Dice roller integration

## Files Structure

```
DM_Helper/
├── src/
│   ├── server.js              # Express server
│   ├── database/
│   │   ├── connection.js      # DB connection handler
│   │   ├── init-db.js         # Database initialization
│   │   └── schema.sql         # Database schema
│   └── routes/
│       ├── characters.js      # Character API
│       ├── shadows.js         # Shadow API
│       ├── sessions.js        # Session API
│       └── progress.js        # Progress tracking API
├── public/
│   ├── index.html            # DM Dashboard
│   ├── css/
│   │   └── style.css         # Styling
│   └── js/
│       └── app.js            # Frontend logic
├── Background Information/   # Your campaign notes
├── package.json
├── .env                      # Configuration
└── dm_helper.db             # SQLite database
```

## Testing

Test character creation via API:
```bash
curl -X POST http://localhost:3002/api/characters \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Character","race":"Human","class":"Fighter"}'
```

## Notes

- Database file: `dm_helper.db` (excluded from git)
- Port: 3002 (configurable in `.env`)
- The system is self-contained - no external services required
- All campaign data stored locally in SQLite

Enjoy running your Amber campaign!
