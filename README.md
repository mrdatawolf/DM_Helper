# DM Helper - Amber Campaign Manager

A custom campaign management system for running a D&D 5e campaign based on the Chronicles of Amber series.

## Features

- **Character Management**: Track D&D 5e stats plus Amber-specific mechanics (Pattern/Logrus powers, Order/Chaos balance, blood purity)
- **Shadow Tracking**: Manage different realms across the Amber multiverse
- **Async Progress**: Track individual character storylines session-by-session
- **Custom Mechanics**: Support for your unique feat/leveling system
- **DM Dashboard**: Web-based interface for managing the campaign

## Quick Start

```bash
# Install dependencies
npm install

# Initialize database (first time only)
npm run init-db

# Start the server
npm run dev
```

Then open your browser to: `http://localhost:3002`

## Documentation

- [PHASE1_COMPLETE.md](PHASE1_COMPLETE.md) - Detailed features and API documentation
- [Background Information/](Background%20Information/) - Campaign notes and world-building

## Tech Stack

- Node.js + Express
- SQLite3
- Vanilla JavaScript frontend

## Campaign Setting

Based on the Chronicles of Amber books, this campaign explores:
- The Soul Realm (corrupted by First Pattern and Logrus)
- Billabong's Veil (Djunkai shadow with bio-magic)
- Shadow Eaters (servants of Corwin's Pattern)
- Custom magic systems based on Order/Chaos extraction
