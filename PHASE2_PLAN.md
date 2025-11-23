# Phase 2 Plan - Player Features & Real-Time

## Overview

Phase 2 adds player accounts, real-time communication, and player-facing interfaces. Players will be able to view their characters, allocate claim points, send messages, and see their progress.

## Goals

1. **Player Authentication** - Simple login system
2. **Player Dashboard** - Character view, claims management, progress timeline
3. **Real-Time Updates** - WebSocket integration for live data sync
4. **Messaging System** - DM ↔ Player and Player ↔ Player communication
5. **Character Sheets** - Player-facing character display with claims

## Phase 2 Features Breakdown

### 1. Authentication System

**Database Changes:**
```sql
-- Users table (links to characters)
CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    email TEXT,
    is_dm BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Link characters to users
ALTER TABLE characters ADD COLUMN user_id INTEGER REFERENCES users(id);
```

**Features:**
- Simple username/password login
- JWT token-based sessions
- DM flag for admin access
- Password hashing (bcrypt)

**Endpoints:**
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login, get token
- `POST /api/auth/logout` - Invalidate token
- `GET /api/auth/me` - Get current user info

---

### 2. Player Dashboard

**Route:** `/player` (separate from DM dashboard at `/`)

**Tabs:**
1. **My Character** - Character sheet with stats, gear, powers
2. **Claims & Rankings** - Manage attribute claims, view perceived rankings
3. **Progress Timeline** - Session history and story beats
4. **Messages** - Communication with DM and other players
5. **Guide** - Same player guide as DM sees

**Key Differences from DM View:**
- Players see **perceived rankings** (not actual)
- Players can only edit **their own** character
- Players see **their own** private notes, DM sees all notes
- Players cannot see other characters' full sheets (unless revealed)

---

### 3. WebSocket Integration

**Why WebSockets:**
- Live character updates when DM makes changes
- Real-time message delivery
- Instant claim ranking updates
- Session progress notifications

**Technology:**
- Socket.io for WebSocket management
- Room-based communication (per character, per campaign)
- Event-driven updates

**Events:**
- `character:updated` - Character stats changed
- `claim:updated` - Someone allocated claim points
- `message:new` - New message received
- `session:started` - DM started a new session
- `progress:added` - Progress entry created

---

### 4. Messaging System

**Database Schema:**
```sql
CREATE TABLE messages (
    id INTEGER PRIMARY KEY,
    from_user_id INTEGER NOT NULL,
    to_user_id INTEGER,  -- NULL = broadcast to all
    character_id INTEGER, -- Context: which character
    message_type TEXT CHECK(message_type IN ('dm', 'broadcast', 'whisper')),
    subject TEXT,
    body TEXT NOT NULL,
    is_read BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (from_user_id) REFERENCES users(id),
    FOREIGN KEY (to_user_id) REFERENCES users(id),
    FOREIGN KEY (character_id) REFERENCES characters(id)
);
```

**Message Types:**
- **DM → Player**: Private communication
- **Player → DM**: Ask questions, report actions
- **Player → Player**: In-character or out-of-character
- **Broadcast**: DM announces to all players

**Features:**
- Threaded conversations
- Read/unread status
- In-character vs out-of-character toggle
- Attach to character context
- Search/filter messages

---

### 5. Character Sheet (Player View)

**Display:**
- Full D&D 5e stats (read-only for player)
- Amber attributes (Order/Chaos, Pattern/Logrus status)
- Claim points: Current allocations + available pool
- Gear and powers list
- Recent progress entries

**Player Can Edit:**
- Character notes (private to them)
- Claim point allocations (with justification)
- Perception of other characters' rankings

**Player Cannot Edit:**
- Base stats (DM controlled)
- Feat pool (DM grants)
- Actual claim rankings (only DM sees truth)

---

### 6. Claims Management UI

**For Players:**

**View Claims:**
```
Your Claims:
├─ Sorcery (Order Manipulation): 4 points
│  "Years of study under my master..."
│  Rank: 1st (you believe)
│
└─ Scholarship: 3 points
   "Extensive study of Shadow Realm lore..."
   Rank: 1st (you believe)

Available: 3 claim points
```

**Allocate Points:**
- Modal form: "Increase Claim"
- Select attribute (dropdown or custom)
- Enter points to add
- Write justification (required)
- Preview new ranking (based on perceived, not actual)
- Confirm

**View Rankings (Perceived):**
```
Sorcery Rankings (Your Perception):
1. Kael - 6 points (you think)
2. YOU - 4 points (actual)
3. Unknown characters...
```

**What Player Doesn't See:**
- Actual rankings of others
- Whether their perceptions are accurate
- DM notes on claims

---

### 7. Progress Timeline (Player View)

**Display:**
```
Session 3: The Depths Expedition (Nov 15, 2025)
├─ Location: The Depths (Corwin Pattern)
├─ Summary: "Explored the obsidian halls..."
├─ Gained: 1 feat, 50 XP
├─ Story Beats: "Discovered Trump card of Prince Corwin"
├─ NPCs Met: "Shadow Keeper of The Depths"
└─ Order/Chaos shift: +5 toward Order

Session 2: Shadow Eater Encounter (Nov 8, 2025)
...
```

**Features:**
- Chronological story progression
- Filterable by solo vs group sessions
- Link to session details
- Visual timeline with milestones
- Export to PDF (future)

---

## Technical Stack for Phase 2

**Backend:**
- Express.js (existing)
- Socket.io for WebSockets
- JWT for authentication
- bcrypt for password hashing

**Frontend:**
- Vanilla JS (keep it simple, consistent with Phase 1)
- Socket.io-client for real-time
- Separate HTML pages for player vs DM views
- Shared CSS/JS where appropriate

**Database:**
- SQLite (existing)
- New tables: users, messages
- Add user_id foreign key to characters

---

## Security Considerations

1. **Authentication:**
   - Hash passwords with bcrypt
   - Use JWT tokens (HTTP-only cookies)
   - Expire tokens after 24 hours

2. **Authorization:**
   - Players can only see/edit their own character
   - DM can see/edit everything
   - Validate user permissions on all endpoints

3. **Data Visibility:**
   - Players see perceived rankings, not actual
   - Players cannot query other characters' full data
   - DM notes are hidden from players

4. **WebSocket Security:**
   - Authenticate socket connections
   - Room-based permissions (only join your own character's room)
   - Rate limiting on messages

---

## Phase 2 Milestones

### Milestone 1: Authentication
- [ ] Create users table
- [ ] Implement auth endpoints
- [ ] Add JWT middleware
- [ ] Test login/logout flow

### Milestone 2: Player Dashboard
- [ ] Create player HTML/CSS
- [ ] Character sheet view
- [ ] Claims allocation UI
- [ ] Progress timeline

### Milestone 3: Real-Time
- [ ] Add Socket.io to server
- [ ] Implement WebSocket events
- [ ] Test live updates
- [ ] Handle disconnections

### Milestone 4: Messaging
- [ ] Create messages table
- [ ] Message API endpoints
- [ ] Message UI (inbox, compose)
- [ ] Real-time message delivery

### Milestone 5: Integration & Testing
- [ ] Test DM ↔ Player workflow
- [ ] Test Player ↔ Player messaging
- [ ] Verify claim perception system
- [ ] End-to-end testing

---

## User Stories

**As a Player, I want to:**
- Create an account and log in
- View my character's stats and progress
- Allocate claim points with justification
- See what I believe about other characters' abilities
- Send messages to the DM
- Communicate with other players
- View my story timeline
- Access the player guide

**As a DM, I want to:**
- See all characters and their actual claims
- Set player perceptions of rankings
- Send messages to individual players or broadcast
- Grant bonus claim points
- Track which players are online
- See player message history

---

## Open Questions

1. **Multi-character support?** Should one player be able to have multiple characters?
2. **Character creation?** Can players create characters, or must DM create and assign?
3. **Dice rolling?** Add integrated dice roller in Phase 2 or save for Phase 3?
4. **Voice/Video?** Out of scope, or integrate with external service?
5. **Mobile app?** Web-responsive is enough, or native app later?

---

## Next Steps

1. Start with Authentication (Milestone 1)
2. Create basic player dashboard structure
3. Add WebSocket foundation
4. Build messaging incrementally
5. Polish and test

Ready to begin? Let's start with the authentication system!
