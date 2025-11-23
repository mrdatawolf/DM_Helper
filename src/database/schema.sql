-- Core Tables for DM Helper

-- Shadows (Realms in the Amber multiverse)
CREATE TABLE IF NOT EXISTS shadows (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    order_level INTEGER DEFAULT 50, -- 0-100, 0=pure chaos, 100=pure order
    chaos_level INTEGER DEFAULT 50, -- 0-100, inverse relationship with order
    pattern_influence TEXT CHECK(pattern_influence IN ('First Pattern', 'Corwin Pattern', 'Logrus', 'Mixed', 'None', 'Nexus')),
    corruption_status TEXT,
    is_starting_shadow BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Characters
CREATE TABLE IF NOT EXISTS characters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    player_name TEXT,
    race TEXT NOT NULL,
    class TEXT NOT NULL,
    level INTEGER DEFAULT 1,

    -- D&D 5e Core Stats
    strength INTEGER DEFAULT 10,
    dexterity INTEGER DEFAULT 10,
    constitution INTEGER DEFAULT 10,
    intelligence INTEGER DEFAULT 10,
    wisdom INTEGER DEFAULT 10,
    charisma INTEGER DEFAULT 10,

    -- D&D Combat Stats
    armor_class INTEGER DEFAULT 10,
    max_hit_points INTEGER DEFAULT 10,
    current_hit_points INTEGER DEFAULT 10,
    speed INTEGER DEFAULT 30,

    -- Amber-Specific Attributes
    shadow_origin_id INTEGER,
    blood_purity TEXT CHECK(blood_purity IN ('Pure', 'Half', 'None')),
    order_chaos_balance INTEGER DEFAULT 50, -- 0=chaos, 50=neutral, 100=order

    -- Pattern/Logrus Powers
    has_pattern_imprint BOOLEAN DEFAULT 0,
    has_logrus_imprint BOOLEAN DEFAULT 0,
    pattern_mastery_level INTEGER DEFAULT 0,
    logrus_mastery_level INTEGER DEFAULT 0,

    -- Trump Powers
    has_trump_artistry BOOLEAN DEFAULT 0,
    trump_mastery_level INTEGER DEFAULT 0,

    -- Custom Feat/Leveling System
    feat_pool INTEGER DEFAULT 0,
    total_feats_earned INTEGER DEFAULT 0,
    experience_points INTEGER DEFAULT 0,
    points_to_next_level INTEGER DEFAULT 10,

    -- Current Status
    current_shadow_id INTEGER,
    current_story_timestamp TEXT, -- For async tracking
    is_active BOOLEAN DEFAULT 1,

    -- Metadata
    character_notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (shadow_origin_id) REFERENCES shadows(id),
    FOREIGN KEY (current_shadow_id) REFERENCES shadows(id)
);

-- Character Inventory/Gear
CREATE TABLE IF NOT EXISTS character_gear (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    character_id INTEGER NOT NULL,
    item_name TEXT NOT NULL,
    item_type TEXT, -- weapon, armor, magic item, consumable, etc.
    description TEXT,
    quantity INTEGER DEFAULT 1,
    is_equipped BOOLEAN DEFAULT 0,
    magical_properties TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
);

-- Powers and Abilities
CREATE TABLE IF NOT EXISTS character_powers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    character_id INTEGER NOT NULL,
    power_name TEXT NOT NULL,
    power_type TEXT, -- Pattern, Logrus, Trump, Spell, Class Ability, Feat
    description TEXT,
    power_level INTEGER DEFAULT 1,
    uses_per_day INTEGER, -- NULL = unlimited
    current_uses INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
);

-- Campaign Sessions
CREATE TABLE IF NOT EXISTS campaign_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_number INTEGER NOT NULL UNIQUE,
    session_date DATE NOT NULL,
    session_title TEXT,
    dm_notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Character Progress Tracking (Session by Session)
CREATE TABLE IF NOT EXISTS character_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    character_id INTEGER NOT NULL,
    session_id INTEGER NOT NULL,
    shadow_id INTEGER, -- Where the character was during this session

    -- What happened this session
    summary TEXT NOT NULL,
    feats_earned INTEGER DEFAULT 0,
    experience_gained INTEGER DEFAULT 0,

    -- Story progress
    story_beats TEXT, -- JSON or comma-separated key moments
    npcs_met TEXT,
    items_acquired TEXT,

    -- Amber-specific tracking
    order_chaos_shift INTEGER DEFAULT 0, -- Change in balance this session
    pattern_progress TEXT,

    -- Was this a solo session or group?
    is_solo_session BOOLEAN DEFAULT 0,
    other_characters TEXT, -- Comma-separated IDs of other PCs present

    dm_private_notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES campaign_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (shadow_id) REFERENCES shadows(id)
);

-- NPCs and Creatures
CREATE TABLE IF NOT EXISTS npcs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    creature_type TEXT, -- Shadow Eater, Eggari, Elevi, Djunkai, etc.
    shadow_id INTEGER, -- Which shadow they're currently in

    -- Stats (simplified for NPCs)
    armor_class INTEGER,
    hit_points INTEGER,
    stats TEXT, -- JSON blob for full stat block

    -- Relationship tracking
    alignment TEXT,
    faction TEXT,
    relationship_to_party TEXT,

    description TEXT,
    dm_notes TEXT,
    is_important BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (shadow_id) REFERENCES shadows(id)
);

-- Feats Earned Log (for tracking feat acquisition)
CREATE TABLE IF NOT EXISTS feat_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    character_id INTEGER NOT NULL,
    session_id INTEGER,
    feat_source TEXT CHECK(feat_source IN ('session', 'level', 'unknown_unknown')),
    description TEXT,
    earned_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES campaign_sessions(id)
);

-- Attribute Claims (Amber-style ranking system)
CREATE TABLE IF NOT EXISTS attribute_claims (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    character_id INTEGER NOT NULL,
    attribute_name TEXT NOT NULL, -- Warfare, Strength, Endurance, Pattern, Logrus, etc.
    points_spent INTEGER NOT NULL DEFAULT 0,
    justification TEXT, -- Why/how they achieved this level
    claimed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
    UNIQUE(character_id, attribute_name)
);

-- Perceived Rankings (what each character THINKS about others' rankings)
CREATE TABLE IF NOT EXISTS perceived_rankings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    observer_character_id INTEGER NOT NULL, -- Who is doing the perceiving
    target_character_id INTEGER NOT NULL, -- Who they're perceiving
    attribute_name TEXT NOT NULL,
    perceived_points INTEGER NOT NULL, -- What they THINK the target has
    perception_notes TEXT, -- Why they think this (rumors, demonstrations, etc.)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (observer_character_id) REFERENCES characters(id) ON DELETE CASCADE,
    FOREIGN KEY (target_character_id) REFERENCES characters(id) ON DELETE CASCADE,
    UNIQUE(observer_character_id, target_character_id, attribute_name)
);

-- Claim Point Pools (track available points for each character)
CREATE TABLE IF NOT EXISTS claim_point_pools (
    character_id INTEGER PRIMARY KEY,
    total_points INTEGER DEFAULT 10, -- Total points ever earned
    spent_points INTEGER DEFAULT 0, -- Points currently allocated
    available_points INTEGER GENERATED ALWAYS AS (total_points - spent_points) STORED,

    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
);

-- Claim History (audit trail of claim changes)
CREATE TABLE IF NOT EXISTS claim_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    character_id INTEGER NOT NULL,
    attribute_name TEXT NOT NULL,
    points_change INTEGER NOT NULL, -- Positive for increase, negative for decrease
    justification TEXT NOT NULL,
    session_id INTEGER, -- Optional: which session prompted this change
    changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES campaign_sessions(id)
);

-- Users (authentication for Phase 2)
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    email TEXT,
    is_dm BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_characters_current_shadow ON characters(current_shadow_id);
CREATE INDEX IF NOT EXISTS idx_character_progress_character ON character_progress(character_id);
CREATE INDEX IF NOT EXISTS idx_character_progress_session ON character_progress(session_id);
CREATE INDEX IF NOT EXISTS idx_character_gear_character ON character_gear(character_id);
CREATE INDEX IF NOT EXISTS idx_npcs_shadow ON npcs(shadow_id);
CREATE INDEX IF NOT EXISTS idx_attribute_claims_character ON attribute_claims(character_id);
CREATE INDEX IF NOT EXISTS idx_attribute_claims_attribute ON attribute_claims(attribute_name);
CREATE INDEX IF NOT EXISTS idx_perceived_rankings_observer ON perceived_rankings(observer_character_id);
CREATE INDEX IF NOT EXISTS idx_perceived_rankings_target ON perceived_rankings(target_character_id);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
