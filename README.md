# DM Helper — Amber Campaign Manager

A custom campaign management system for running a D&D 5e campaign set in the **Chronicles of Amber** multiverse. Built for async play with separate DM, Player, and Admin interfaces.

---

## How This Campaign Differs From Standard D&D

| Standard D&D | This Campaign |
|---|---|
| Alignment (Law/Chaos/Good/Evil) | **Order/Chaos Balance** — a 0–100 sliding scale; affects magic, NPC reactions, and available powers |
| XP and milestone leveling | **Feat System** — earn feats per session, per level, or per breakthrough moment; spend them on claims or special actions |
| Roll to see who wins | **Attribute Claims** — you *spend points* to declare superiority in an attribute; narrative justification required |
| Everyone knows everyone's stats | **Perception vs Reality** — players see what their character *believes* about others, which may be wrong |
| Planes of existence | **Shadows** — infinite reflections between Amber (Order) and the Courts of Chaos; Shadow Walking replaces plane travel |
| Standard races and origins | **Blood Purity** — royal bloodlines grant stat bonuses; Pure grants +1 WIS, Half grants +1 CHA |
| Class abilities only | **Power Imprints** — walking the Pattern or Logrus grants reality-warping abilities on top of class features |
| No cosmic allegiance | **The Three Powers** — First Pattern (Amber), Logrus (Courts of Chaos), Corwin's Pattern; each imprints differently |
| Magic is learned or innate | **Broken Imprints** — walking an imperfect Pattern or Logrus is possible, with real thematic consequences worked out with the DM |
| Party always plays together | **Async Play** — characters adventure separately, in parallel timelines; solo sessions are normal |
| Trump cards are exotic items | **Trump Artistry** — characters with a higher Power Imprint may become Trump Artists, creating cards for communication and teleportation |
| No hidden lore system | **Primal Patterns** — each cosmic power has a bound spirit animal; the DM unlocks lore sections for individual characters as they earn them |

---

## What's Built

- **Landing Page** — Themed entry point routing DM and Player to their portals
- **Admin Panel** (`/admin.html`) — User management: list all users, grant/revoke DM flag, reset passwords, soft-archive/restore accounts
- **DM Dashboard** — Campaign management: characters, shadows, sessions, progress tracking, claims rankings, journal, and Primal Patterns
- **Player Portal** — 6-step character creation wizard, character sheet, attribute claims, progress timeline, and unlocked lore
- **Player's Guide** — In-app markdown-rendered campaign rules at `/guide.html` with working TOC anchor links
- **Authentication** — JWT-based sessions; role-based routing (admin → admin panel, DM → DM dashboard, player → player portal)
- **Character Creation Wizard** — Guided 6-step flow: Identity, Amber Powers (Blood Purity + Power Imprint), Stat Assignment, Flaws & Traits, Class, Review
- **Attribute Claims System** — Amber-style ranking with actual vs. perceived standings differing per character
- **Primal Patterns System** — DM creates pattern lore with per-section content; grants individual sections to players; secrets sections never exposed to players
- **Shadow Tracking** — 11 named shadows across First Pattern, Corwin Pattern, Logrus, and Nexus influence types
- **Session & Progress Tracking** — Per-character async storyline tracking across solo and group sessions
- **Feat System** — Custom leveling mechanic (feats earned per session, level, or breakthrough moment)
- **Global Navigation** — Role-based nav bar (Guest / Player / DM) across all pages; admin sees no nav, only the management panel

---

## Quick Start

```bash
npm install
npm run init-db   # first time only — seeds database with default shadows
npm run dev
```

Open: `http://localhost:3002`

---

## Environment

Create a `.env` file:

```
PORT=3002
DB_PATH=./dm_helper.db
NODE_ENV=development
JWT_SECRET=your-secret-key-change-in-production
ADMIN_PASSWORD=your-admin-password
```

- **`ADMIN_PASSWORD`** — The admin account is seeded/updated from this value every time the server starts. The admin username is always `admin`.
- **`JWT_SECRET`** — Change to a strong random string in production.

The database file (`dm_helper.db`) is excluded from git. Run `npm run init-db` to seed it.

---

## URL Map

| Route | Who Sees It | Description |
|-------|-------------|-------------|
| `/` | Everyone | Landing page |
| `/player-login.html` | Everyone | Login & registration |
| `/admin.html` | Admin only | User management panel |
| `/dm-dashboard.html` | DM only | Full campaign management |
| `/player-dashboard.html` | Players | Character sheet, claims, lore |
| `/guide.html` | Everyone | Player's Guide (markdown-rendered) |

---

## API Reference

Base URL: `http://localhost:3002/api`

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/auth/register` | Create account (DM flag always false; only admin can grant it) |
| `POST` | `/auth/login` | Login, receive JWT token |
| `POST` | `/auth/logout` | Clear session |
| `GET`  | `/auth/me` | Current user info (includes `is_admin`) |
| `GET`  | `/auth/characters` | Characters owned by current user |

### Admin (admin only)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET`  | `/admin/users` | List all users (active + archived) |
| `PUT`  | `/admin/users/:id` | Update user (toggle `is_dm`, update email) |
| `DELETE` | `/admin/users/:id` | Soft-archive user (data preserved) |
| `POST` | `/admin/users/:id/restore` | Restore an archived user |
| `POST` | `/admin/users/:id/reset-password` | Set a new password for a user |

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

### Primal Patterns
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET`  | `/primal-patterns` | List all patterns |
| `POST` | `/primal-patterns` | Create a pattern |
| `GET`  | `/primal-patterns/:id` | Get pattern with sections and grants |
| `PUT`  | `/primal-patterns/:id` | Update pattern |
| `DELETE` | `/primal-patterns/:id` | Delete pattern |
| `POST` | `/primal-patterns/:id/sections` | Add a section to a pattern |
| `PUT`  | `/primal-patterns/:id/sections/:sid` | Update a section |
| `DELETE` | `/primal-patterns/:id/sections/:sid` | Delete a section |
| `POST` | `/primal-patterns/sections/:sid/grant` | Grant section lore to characters |
| `DELETE` | `/primal-patterns/sections/:sid/revoke/:characterId` | Revoke a grant |
| `GET`  | `/primal-patterns/character/:characterId` | Get all lore unlocked for a character |

---

## Amber Campaign Mechanics

### Order / Chaos Balance
Each character has a balance on a 0–100 scale replacing alignment:
- **100** = Pure Order — +1 INT, +1 WIS; rigid, structured magic
- **50** = Neutral — draws from both forces
- **0** = Pure Chaos — +1 STR, +1 DEX; wild, transformative magic

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

### Primal Patterns
Each of the three cosmic powers has a bound spirit animal representing, embodying, or giving rise to that force. The DM maintains lore sections for each pattern (origin, spirit animal, mechanics, deep lore, secrets) and unlocks individual sections for players as they earn them through play. Players only ever see what their character has actually learned.

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

## Project Structure

```
DM_Helper/
├── src/
│   ├── server.js                          # Express app + admin user seeding
│   ├── middleware/
│   │   └── auth.js                        # JWT middleware, requireDM, requireAdmin
│   ├── database/
│   │   ├── connection.js
│   │   ├── init-db.js
│   │   ├── schema.sql
│   │   ├── migrate-auth.js
│   │   ├── migrate-claims.js
│   │   ├── migrate-creation-system.js     # pattern_type, amber_flaws, amber_traits
│   │   ├── migrate-broken-imprint.js      # broken_imprint on characters
│   │   ├── migrate-primal-patterns.js     # primal_patterns, sections, grants tables
│   │   └── migrate-soft-delete-users.js   # is_archived on users
│   └── routes/
│       ├── auth.js
│       ├── admin.js                        # User management (admin only)
│       ├── characters.js
│       ├── shadows.js
│       ├── sessions.js
│       ├── progress.js
│       ├── claims.js
│       ├── journal.js
│       └── primal-patterns.js
├── public/
│   ├── index.html                          # Landing page
│   ├── admin.html                          # Admin user management panel
│   ├── dm-dashboard.html                   # DM dashboard (auth-gated)
│   ├── player-login.html                   # Login & registration
│   ├── player-dashboard.html               # Player portal + creation wizard
│   ├── guide.html                          # Player's Guide viewer
│   ├── PLAYER_GUIDE.md                     # Guide content (markdown)
│   ├── css/
│   │   ├── style.css
│   │   ├── navigation.css
│   │   └── player-dashboard.css
│   └── js/
│       ├── app.js                          # DM dashboard logic + Primal Patterns
│       ├── admin.js                        # Admin panel logic
│       ├── player-dashboard.js             # Player portal + wizard logic
│       ├── navigation.js                   # Shared nav + auth routing
│       └── load-navigation.js
├── Background Information/                 # Campaign world-building notes
├── ATTRIBUTE_CLAIMS_SYSTEM.md
└── package.json
```

---

## Documentation

- [PLAYER_GUIDE.md](public/PLAYER_GUIDE.md) — Campaign rules, character creation, and mechanics for players
- [ATTRIBUTE_CLAIMS_SYSTEM.md](ATTRIBUTE_CLAIMS_SYSTEM.md) — Full claims system design and API reference
- [Background Information/](Background%20Information/) — World-building notes and shadow lore
