# Player Guide Button - Added to Dashboard

## What Was Added

A "📖 Player Guide" button has been added to the header of the DM Dashboard. This button is available to both DM and players, ensuring everyone has access to the same campaign documentation.

## Location

The button appears in the top-right corner of the dashboard header, next to the title:

```
┌─────────────────────────────────────────────────────┐
│  DM Helper - Amber Campaign          📖 Player Guide│
│  Chronicles of the Patterns                         │
└─────────────────────────────────────────────────────┘
```

## Features

### 1. Dedicated Guide Page
- **URL**: `http://localhost:3002/guide.html`
- Beautiful markdown rendering with syntax highlighting
- Smooth scrolling for table of contents
- Professional styling matching the dashboard theme
- Responsive design for all devices

### 2. Opens in New Tab
- Clicking the button opens the guide in a new browser tab
- Allows reference while using the dashboard
- DM and players can both access simultaneously

### 3. Consistent Experience
- Same button will appear on player interface (when built in Phase 2)
- DM can direct players to specific sections
- Everyone sees the same documentation

## What's In The Guide

The Player Guide ([PLAYER_GUIDE.md](PLAYER_GUIDE.md)) includes:

1. **Campaign Setting Overview**
   - Amber multiverse basics
   - Key differences from standard D&D

2. **Rule Changes from D&D 5e**
   - Custom feat/leveling system
   - Order/Chaos balance
   - Session-by-session tracking

3. **Attribute Claims System**
   - How claim points work
   - Perception vs reality twist
   - Strategic considerations

4. **Character Creation**
   - Step-by-step process
   - Amber-specific attributes
   - Claim point allocation

5. **The Multiverse & Shadows**
   - How shadows work
   - The three powers (Patterns & Logrus)
   - Shadow reflections

6. **Available Starting Shadows**
   - Links to detailed docs:
     - [The Soul Realm](Background%20Information/General%20Info/The%20Soul%20Realm.md)
     - [Billabong's Veil](Background%20Information/General%20Info/Billabong's%20Veil%20Shadow.md)
     - [Shadow Reflections](Background%20Information/General%20Info/Shadow%20Reflections.md)

## Files Created/Modified

### New Files:
- `public/guide.html` - Markdown viewer with beautiful styling
- `public/PLAYER_GUIDE.md` - Copy of player guide for serving
- `PLAYER_GUIDE.md` - Master copy of the player guide

### Modified Files:
- `public/index.html` - Added guide button to header
- `public/css/style.css` - Added header layout and button styling
- `public/js/app.js` - Added `showGuide()` function

## How It Works

**For DM:**
1. Click "📖 Player Guide" button in dashboard
2. Guide opens in new tab
3. Use to reference rules or answer player questions
4. Can direct players to specific sections

**For Players (when they get access):**
1. Same button in their interface
2. Opens same guide with same information
3. Ensures consistent understanding of rules

## Usage Examples

**During Character Creation:**
> "Check the Player Guide, section on Attribute Claims, for how to allocate your claim points."

**Rules Question:**
> "Look at the Player Guide under 'Rule Changes' - it explains the feat system."

**World Building:**
> "Read the Shadow Reflections doc linked in the guide to understand how Rebma and Tir-na Nog'th work."

## Technical Details

- Uses `marked.js` library to render markdown
- Responsive CSS for mobile/tablet/desktop
- Smooth scrolling for anchor links
- Back button to return to dashboard
- Clean, readable typography

## Future Enhancements

When Phase 2 adds player accounts:
- Same button appears on player dashboard
- Players see exactly what DM sees
- Can update guide and both see changes immediately
- Could add DM-only sections (hidden from player view)

---

**The guide is live now at:** `http://localhost:3002/guide.html`

Test it by clicking the "📖 Player Guide" button in the dashboard header!
