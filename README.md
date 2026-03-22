# Web MOBA Arena

A lightweight 3D multiplayer browser game built with Three.js and Colyseus, designed to run directly in the browser.

## Live Demo
- Frontend: https://web-moba-arena-ak3x.vercel.app
- Backend: https://web-moba-arena.onrender.com

## Preview
<img width="1536" height="1024" alt="sample" src="https://github.com/user-attachments/assets/5e047207-cdd0-4d7b-a891-073bd0c314b4" />

## Overview

Web MOBA Arena is a real-time browser-based multiplayer arena game inspired by MOBA-style gameplay. It focuses on fast iteration, lightweight rendering, and a simple but solid multiplayer architecture.

## Features

- Browser-based gameplay, no install required
- Real-time multiplayer with WebSocket
- Three.js 3D rendering
- Lobby system with team selection and ready-up
- Name-based character mapping
- Room locking during active matches
- Reconnection support for refresh-safe sessions
- Multi-tab safe session handling
- ESC to leave the game
- Lightweight and optimized for low-end devices
- Stateless matches, no database required

## Tech Stack

### Client
- Three.js
- TypeScript
- WebGL
- Vite

### Server
- Colyseus
- Node.js
- WebSocket

### Deployment
- Frontend: Vercel
- Backend: Render

## Architecture

Client (Browser / Mobile)
- Three.js rendering
- Input handling
- UI overlay
- Reconnect handling

↓ WebSocket

Server (Colyseus)
- Room management
- Player synchronization
- Team assignment
- Ready system
- Reconnection handling
- Match lifecycle

## Gameplay Flow

1. Player opens the game
2. Selects a name
3. Name maps to a character automatically
4. Chooses a team
5. Ready up
6. Match starts
7. Players move around the arena
8. ESC to leave the room
9. If the last player leaves, the room resets to lobby

## Current Status

This project is currently developed by one developer.

The current build already includes:
- Lobby flow
- Team selection
- Ready system
- Character mapping
- Room locking
- Reconnection support
- Deployed frontend and backend

## Development Setup

### 1. Clone the repository
```bash
git clone https://github.com/your-username/web-moba-arena.git
```

### 2. Install dependencies
```bash
cd server && npm install
cd ../client && npm install
```

### 3. Run locally
```bash
cd server && npm start
cd ../client && npm run dev
```

---

## Gameplay Flow

1. Player enters the game
2. Selects a character
3. Joins a room
4. Battles other players
5. Match ends → restart

---

## Game Mode

- Simple room-based multiplayer
- No matchmaking or ranking system
- Designed for quick sessions and testing

---

## Deployment

| Layer   | Technology            | Hosting |
|--------|---------------------|--------|
| Client | Three.js (WebGL)    | Browser |
| Server | Colyseus (Node.js)  | Render |
| Protocol | WebSocket         | - |

---

## Hosting Options

### Current (Render - Free Tier)
- Suitable: 2–10 players
- Pros:
  - Free
  - Easy deployment
- Cons:
  - Cold start delay
  - Server sleeps

### Alternatives

#### Fly.io
- 2–30 players
- No cold start
- ~$1–5/month

#### VPS (DigitalOcean / Vultr)
- 10–50+ players
- Stable performance
- ~$5/month

---

## Scaling Strategy

1. Start with Render (development)
2. Move to Fly.io (real-time stability)
3. Upgrade to VPS (scaling users)

---

## Current Status

This project is currently developed by **one developer**.

The architecture is designed to be:
- Easy to extend
- Easy for collaborators to onboard

A second developer may join in the future.

---

## Reset / Troubleshooting

If you encounter issues such as:
- Unable to join a room
- Stuck in a previous session
- Reconnection errors

You can clear your local session data:

DevTools (Right Click → Inspect)

1. Right click → **Inspect**
2. Go to **Console**
3. Run:

```js
localStorage.clear();
sessionStorage.clear();
location.reload();
```

## Roadmap

### Phase 1 — Core (Done)
- Multiplayer sync
- Movement system
- Room management
- Reconnection system
- Session handling

### Phase 2 — Gameplay (In Progress)
- Combat system
- Health system (HP)
- Basic skills

### Phase 3 — Systems
- Minions (AI)
- Towers
- Win conditions

### Phase 4 — Polish
- Visual effects
- UI/UX improvements
- Performance optimization

---

## Future Team Structure

When expanded to 2 developers:

### Frontend (Client)
- Three.js scene
- Controls (keyboard/mobile)
- UI / HUD
- Input handling

### Backend (Server)
- Colyseus server
- Room lifecycle
- Game logic
- AI systems

### Shared
- Game design
- Balancing
- Testing

---

## Notes

- Stateless architecture
- No database required
- Server resets do not affect gameplay
- Optimized for small matches (2–10 players)
