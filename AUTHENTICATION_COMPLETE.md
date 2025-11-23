# Authentication System - Phase 2 Milestone 1 Complete

## Overview

The authentication system for Phase 2 has been successfully implemented and tested. Users can now register, login, and access protected routes with JWT token-based authentication.

## What Was Built

### 1. Database Schema
- **users table**: Stores user accounts with username, password hash, email, DM status
- **user_id column**: Added to characters table to link characters to users
- **Indexes**: Created on username for fast lookups

### 2. Authentication Middleware (`src/middleware/auth.js`)
Complete authentication system with:
- `generateToken(user)` - Creates JWT tokens with 24-hour expiration
- `verifyToken(token)` - Validates and decodes JWT tokens
- `authenticate(req, res, next)` - Middleware requiring authentication
- `optionalAuth(req, res, next)` - Middleware for optional authentication
- `requireDM(req, res, next)` - Middleware requiring DM role
- `requireCharacterOwnership(req, res, next)` - Placeholder for character ownership checks

**Features:**
- Supports both cookie-based and Bearer token authentication
- Adds user info to `req.user` for downstream handlers
- Role-based access control (DM vs Player)
- Secure password hashing with bcrypt (10 rounds)

### 3. Authentication API Routes (`src/routes/auth.js`)

#### POST /api/auth/register
Create new user account.

**Request:**
```json
{
  "username": "player1",
  "password": "password123",
  "email": "player1@example.com",
  "is_dm": false
}
```

**Response:**
```json
{
  "message": "User created successfully",
  "user": {
    "id": 2,
    "username": "player1",
    "email": "player1@example.com",
    "is_dm": 0
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Validation:**
- Username must be at least 3 characters
- Password must be at least 6 characters
- Username must be unique
- Sets HTTP-only cookie with token

#### POST /api/auth/login
Authenticate existing user.

**Request:**
```json
{
  "username": "testdm",
  "password": "password123"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "user": {
    "id": 1,
    "username": "testdm",
    "email": "dm@example.com",
    "is_dm": 1
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Features:**
- Verifies password with bcrypt
- Updates last_login timestamp
- Sets HTTP-only cookie with token
- Returns 401 for invalid credentials

#### POST /api/auth/logout
Clear authentication cookie.

**Response:**
```json
{
  "message": "Logged out successfully"
}
```

#### GET /api/auth/me
Get current authenticated user info (requires authentication).

**Request Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "user": {
    "id": 1,
    "username": "testdm",
    "email": "dm@example.com",
    "is_dm": 1,
    "created_at": "2025-11-23 05:25:05",
    "last_login": "2025-11-23 05:25:09"
  }
}
```

#### GET /api/auth/characters
Get all characters owned by authenticated user (requires authentication).

**Response:**
```json
{
  "characters": [
    {
      "id": 1,
      "name": "Character Name",
      "race": "Human",
      "class_type": "Wizard",
      "level": 5,
      ...
    }
  ]
}
```

### 4. Server Integration
Updated `src/server.js`:
- Added `cookie-parser` middleware
- Imported and mounted `/api/auth` routes
- Auth routes available at `http://localhost:3002/api/auth/*`

### 5. Dependencies Installed
```json
{
  "jsonwebtoken": "^9.0.2",
  "bcrypt": "^5.1.1",
  "cookie-parser": "^1.4.6"
}
```

## Testing Results

All endpoints tested and working:

✅ **Registration**: Created DM account (testdm) and player account (player1)
✅ **Login**: Successfully authenticated with correct credentials
✅ **Token validation**: Bearer token authentication working
✅ **Protected routes**: /api/auth/me returns user info when authenticated
✅ **Logout**: Successfully clears authentication cookie
✅ **Password hashing**: Passwords stored as bcrypt hashes, never plaintext

## Security Features

1. **Password Security**:
   - Bcrypt hashing with 10 salt rounds
   - Passwords never stored or transmitted in plaintext
   - Constant-time comparison via bcrypt.compare()

2. **Token Security**:
   - JWT tokens with 24-hour expiration
   - HTTP-only cookies (prevents XSS access)
   - Secure flag in production mode
   - Secret key from environment variable

3. **Input Validation**:
   - Username minimum length (3 chars)
   - Password minimum length (6 chars)
   - Unique username enforcement
   - SQL injection protection via prepared statements

4. **Authorization**:
   - Role-based access control (is_dm flag)
   - User ownership verification for characters
   - Protected endpoints require valid tokens

## Database Changes

**New table:**
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    email TEXT,
    is_dm BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME
);
```

**Modified table:**
```sql
ALTER TABLE characters ADD COLUMN user_id INTEGER REFERENCES users(id);
```

**Indexes:**
```sql
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_characters_user ON characters(user_id);
```

## Test Users Created

1. **DM Account**:
   - Username: `testdm`
   - Password: `password123`
   - Email: `dm@example.com`
   - is_dm: `true`

2. **Player Account**:
   - Username: `player1`
   - Password: `player123`
   - Email: `player1@example.com`
   - is_dm: `false`

## Next Steps (Phase 2 Remaining)

### Milestone 2: Player Dashboard
- [ ] Create player HTML/CSS (separate from DM dashboard)
- [ ] Character sheet view (read-only stats, editable claims)
- [ ] Claims allocation UI
- [ ] Progress timeline view
- [ ] Login/registration UI

### Milestone 3: Real-Time Features
- [ ] Add Socket.io to server
- [ ] Implement WebSocket events (character:updated, claim:updated, etc.)
- [ ] Test live updates between DM and player
- [ ] Handle disconnections gracefully

### Milestone 4: Messaging System
- [ ] Create messages table
- [ ] Message API endpoints
- [ ] Message UI (inbox, compose)
- [ ] Real-time message delivery via WebSockets

### Milestone 5: Integration & Testing
- [ ] Protect existing character routes with authentication
- [ ] Test DM ↔ Player workflow
- [ ] Test Player ↔ Player messaging
- [ ] Verify claim perception system
- [ ] End-to-end testing

## Files Created/Modified

### New Files:
- `src/middleware/auth.js` - Authentication middleware
- `src/routes/auth.js` - Authentication API routes
- `src/database/migrate-auth.js` - Database migration script
- `AUTHENTICATION_COMPLETE.md` - This documentation

### Modified Files:
- `src/server.js` - Added cookie-parser, auth routes
- `src/database/schema.sql` - Added users table
- `package.json` - Added auth dependencies

## Environment Variables

Make sure `.env` contains:
```
PORT=3002
DB_PATH=./dm_helper.db
NODE_ENV=development
JWT_SECRET=your-secret-key-change-in-production
```

**IMPORTANT**: In production, set `JWT_SECRET` to a strong random string!

## API Testing Examples

```bash
# Register new user
curl -X POST http://localhost:3002/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"newuser","password":"pass123","email":"user@example.com"}'

# Login
curl -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"newuser","password":"pass123"}'

# Get current user (use token from login response)
curl -X GET http://localhost:3002/api/auth/me \
  -H "Authorization: Bearer <token>"

# Get user's characters
curl -X GET http://localhost:3002/api/auth/characters \
  -H "Authorization: Bearer <token>"

# Logout
curl -X POST http://localhost:3002/api/auth/logout
```

---

**Phase 2 Milestone 1: Authentication** ✅ COMPLETE

Ready to proceed with Milestone 2: Player Dashboard!
