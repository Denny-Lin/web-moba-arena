# Web MOBA Arena

A lightweight 3D multiplayer arena game built with Three.js and Colyseus, designed to run directly in the browser (desktop & mobile).

--- 

## Preview

<img width="1536" height="1024" alt="sample" src="https://github.com/user-attachments/assets/5e047207-cdd0-4d7b-a891-073bd0c314b4" />

---

## Overview
Web MOBA Arena is a real-time multiplayer browser game inspired by MOBA-style gameplay (e.g. League of Legends / 魔獸信長).

The project focuses on:
- Fast iteration
- Lightweight performance
- Easy deployment
- Real-time multiplayer architecture

---

## Features

- Browser-based (no installation required)
- Real-time multiplayer (WebSocket)
- Arena-style gameplay
- Mobile-friendly controls
- Stateless matches (no database required)
- Reconnection system (refresh-safe)
- Room locking (no mid-game join)
- Multi-tab safe session handling
- Optimized for low-end devices

---

## Tech Stack

### Client
- Three.js (3D rendering)
- TypeScript / JavaScript
- WebGL

### Server
- Colyseus (multiplayer framework)
- Node.js
- WebSocket

---

## Architecture

```
Client (Browser / Mobile)
- Rendering (Three.js)
- Input Handling

        ↓ WebSocket

Server (Colyseus)
- Game State
- Player Sync
- Game Logic
```

---

## Getting Started

### 1. Clone repository
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
