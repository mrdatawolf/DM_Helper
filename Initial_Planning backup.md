What You're Building
A real-time D&D campaign management system with:
Character tracking (stats, gear, powers)
Campaign progress tracking (individual and group storylines)
Player-to-player and DM-to-player messaging
Digital character sheets
Map creation and visualization
Real-time synchronization across multiple clients
Client-server architecture with REST/WebSocket API
Feasibility Assessment
This is achievable, especially if you build it incrementally. Similar systems exist (Roll20, D&D Beyond, Foundry VTT), but a custom solution for your Amber-based campaign is a great idea.
Recommended Approach
Phase 1: Core Foundation
User authentication (DM + players)
Character sheet CRUD operations
Basic character data viewing
Phase 2: Real-time Features
Messaging system (WebSocket-based)
Live character updates
Session management
Phase 3: Advanced Features
Map creation/display
Story progress tracking
Amber-specific mechanics
Phase 4: Polish
Mobile responsiveness
Image uploads
Combat tracking
Tech Stack Recommendation
Backend:
Node.js/Express or Python/FastAPI
PostgreSQL or MongoDB for data
Socket.io or WebSockets for real-time
JWT authentication
Frontend:
React or Vue.js
Canvas or SVG for maps
Responsive design
Deployment:
Docker for containerization
Your FQDN-connected server
NGINX as reverse proxy
SSL/TLS certificates
Realistic Timeline
Minimal viable product (MVP): 2-3 months part-time
Full featured system: 6-12 months part-time
With AI assistance: Significantly faster iteration
Would you like me to help you get started? I can:
Review your current README.md and understand what's already set up
Help you design the database schema for characters, campaigns, and the Amber multiverse
Set up the initial project structure
Create a detailed roadmap