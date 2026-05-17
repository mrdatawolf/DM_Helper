# DM Helper — Amber Campaign Manager

A custom campaign management system for running a D&D 5e campaign set in the **Chronicles of Amber** multiverse. Built for async play with separate DM and player interfaces.

## Features

### What's Built
- **Landing Page** — Themed entry point routing DM and Player to their portals
- **DM Dashboard** — Full campaign management: characters, shadows, sessions, and progress
- **Player Portal** — Account registration, login, character sheets, claims, and progress timeline
- **Authentication** — JWT-based sessions with HTTP-only cookies and bcrypt password hashing
- **Attribute Claims System** — Amber-style ranking where actual vs. perceived standings differ by character
- **Shadow Tracking** — 11 named shadows across First Pattern, Corwin Pattern, Logrus, and Nexus influence types
- **Session & Progress Tracking** — Per-character async storyline tracking across solo and group sessions
- **Feat System** — Custom leveling mechanic (feats earned per session, level, or breakthrough moment)
- **Global Navigation** — Role-based nav bar (Guest / Player / DM) across all pages
- **Player Guide** — In-app markdown-rendered campaign rules at `/guide.html`

### In Progress / Planned
- Real-time updates via WebSocket (Socket.io)
- Player ↔ DM and Player ↔ Player messaging
- Full claims allocation UI for players (allocate points, view perceived rankings)

---

## Quick Start

```bash
npm install
npm run init-db   # first time only — seeds database with default shadows
npm run dev
```

Open: `http://localhost:3002`

---

## URL Map

| Route | Page |
|-------|------|
| `/` | Landing page |
| `/dm` | DM Dashboard |
| `/player-login.html` | Player login & registration |
| `/player-dashboard.html` | Player portal |
| `/guide.html` | Player's Guide |

---

## API Reference

Base URL: `http://localhost:3002/api`

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/auth/register` | Create account |
| `POST` | `/auth/login` | Login, receive JWT token |
| `POST` | `/auth/logout` | Clear session |
| `GET`  | `/auth/me` | Current user info (requires auth) |
| `GET`  | `/auth/characters` | Characters owned by current user |

### Characters
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET`  | `/characters` | List all characters |
| `POST` | `/characters` | Create character |
| `GET`  | `/characters/:id` | Get character with gear and progress |
| `PUT`  | `/characters/:id` | Update character |
| `DELETE` | `/characters/:id` | Delete character |

### Shadows, Sessions, Progress
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET/POST` | `/shadows` | List or create shadows |
| `GET/POST` | `/sessions` | List or create sessions |
| `GET/POST` | `/progress` | List or create progress entries |

### Attribute Claims
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET`  | `/claims/pool/:character_id` | Check available claim points |
| `GET`  | `/claims/character/:character_id` | All claims for a character |
| `GET`  | `/claims/rankings/actual/:attribute` | True rankings (DM view) |
| `GET`  | `/claims/rankings/perceived/:char_id/:attribute` | What a character believes |
| `GET`  | `/claims/rankings/all` | All attributes with rankings |
| `GET`  | `/claims/history/:character_id` | Audit trail of claim changes |
| `POST` | `/claims/allocate` | Spend claim points on an attribute |
| `POST` | `/claims/perception` | Set perceived ranking of another character |
| `POST` | `/claims/grant-points` | DM grants additional points |

See [ATTRIBUTE_CLAIMS_SYSTEM.md](ATTRIBUTE_CLAIMS_SYSTEM.md) for full claims system documentation.

---

## Amber Campaign Mechanics

### Order / Chaos Balance
Each character has a balance on a 0–100 scale replacing alignment:
- **100** = Pure Order (rigid, structured magic)
- **50** = Neutral (draws from both forces)
- **0** = Pure Chaos (wild, transformative magic)

Walking the Pattern shifts toward Order; walking the Logrus shifts toward Chaos.

### Attribute Claims
An Amber Diceless-inspired ranking system adapted for async play:
- Characters start with **10 claim points**
- Points are invested in attributes (Warfare, Sorcery, Pattern Mastery, etc.) with **narrative justification required**
- To surpass the current leader you must **exceed** their points (ties create rivalries)
- **DM sees actual rankings**; players see only what their character *believes* about others
- DM can grant bonus points for major story milestones

### Feat System
Custom progression replacing XP:
- Earn **1 feat per session**, 1 per level-up, 1 per breakthrough moment
- Spend feats on claim points or to attempt actions beyond current capability
- An *Unknown Unknown* breakthrough (2 feats + roll 15+) triggers an immediate level-up

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Node.js + Express |
| Database | SQLite3 (better-sqlite3) |
| Auth | JWT + bcrypt + cookie-parser |
| Frontend | Vanilla HTML / CSS / JavaScript |
| Markdown | marked.js |

---

## Campaign Setting

Based on Roger Zelazny's *Chronicles of Amber* series. Characters are inhabitants of Shadow realms drawn into the cosmic struggle between three primal forces:

| Force | Location | Nature |
|-------|----------|--------|
| First Pattern | Amber (Kolvir) | Pure Order; source of stability |
| Logrus | Courts of Chaos | Pure Chaos; seeks to unmake Order |
| Corwin's Pattern | Deidre and its reflections | A third way — neither fully accepts it |

### Shadows in the Database

| Shadow | Pattern | Notes |
|--------|---------|-------|
| Amber (Kolvir) | First Pattern | Seat of Order |
| The Courts of Chaos | Logrus | Seat of Chaos |
| Rebma | First Pattern | Underwater mirror, reversed Pattern |
| Tir-na Nog'th | First Pattern | Sky city (full moon), shows futures |
| Deidre | Corwin Pattern | Noir Amber reflection |
| The Depths | Corwin Pattern | Deidre's liquid-shadow mirror |
| The Neon Spire | Corwin Pattern | Deidre's ghost city (new moon) |
| The Soul Realm | Mixed (corrupted) | Starting shadow; elven magic draws Order from living beings |
| Billabong's Veil | Corwin Pattern | Starting shadow; marsupial society with bio-magic |
| Shadow Earth | First Pattern | Earth-like shadow |
| Keep of the Four Worlds | Nexus | Four-reality convergence; power rivaling Pattern or Logrus |

---

## Environment

Create a `.env` file:

```
PORT=3002
DB_PATH=./dm_helper.db
NODE_ENV=development
JWT_SECRET=your-secret-key-change-in-production
```

> **Production**: set `JWT_SECRET` to a strong random string.

The database file (`dm_helper.db`) is excluded from git. Run `npm run init-db` to seed it.

---

## Project Structure

```
DM_Helper/
├── src/
│   ├── server.js
│   ├── middleware/
│   │   └── auth.js              # JWT middleware
│   ├── database/
│   │   ├── connection.js
│   │   ├── init-db.js
│   │   └── schema.sql
│   └── routes/
│       ├── auth.js
│       ├── characters.js
│       ├── shadows.js
│       ├── sessions.js
│       ├── progress.js
│       └── claims.js
├── public/
│   ├── index.html               # Landing page
│   ├── dm-dashboard.html
│   ├── player-login.html
│   ├── player-dashboard.html
│   ├── guide.html
│   ├── PLAYER_GUIDE.md
│   ├── css/
│   └── js/
├── Background Information/      # Campaign world-building notes
├── PLAYER_GUIDE.md
├── ATTRIBUTE_CLAIMS_SYSTEM.md
└── package.json
```

---

## Documentation

- [PLAYER_GUIDE.md](PLAYER_GUIDE.md) — Campaign rules, character creation, and mechanics for players
- [ATTRIBUTE_CLAIMS_SYSTEM.md](ATTRIBUTE_CLAIMS_SYSTEM.md) — Full claims system API and design philosophy
- [Background Information/](Background%20Information/) — World-building notes and shadow lore
