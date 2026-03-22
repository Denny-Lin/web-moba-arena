# Web MOBA Arena

A lightweight 3D multiplayer arena game built with **Three.js** and
**Colyseus**, designed to run directly in the browser (desktop &
mobile).

------------------------------------------------------------------------

## Features

-   Browser-based (no install required)
-   Real-time multiplayer (WebSocket)
-   Arena-style gameplay (inspired by MOBA / 魔獸信長 / LOL)
-   Mobile-friendly controls
-   Lightweight & optimized for low-end devices
-   Stateless matches (no database required)

------------------------------------------------------------------------

## Preview

<img width="1536" height="1024" alt="sample" src="https://github.com/user-attachments/assets/5e047207-cdd0-4d7b-a891-073bd0c314b4" />

---

## Tech Stack

### Client

-   Three.js -- 3D rendering
-   JavaScript / TypeScript
-   WebGL

### Server

-   Colyseus -- Multiplayer game server
-   Node.js
-   WebSocket

------------------------------------------------------------------------

## Architecture

```
Client (Browser / Mobile) 
- Three.js (Rendering)
- Input Handling
    ↓
WebSocket
    ↓
Server (Colyseus)
- Game State
- Player Sync
- Combat Logic
```

------------------------------------------------------------------------

## Deployment
| Layer     | Technology        | Hosting |
|----------|------------------|--------|
| Client   | Three.js (WebGL) | Browser |
| Server   | Colyseus (Node)  | Render |
| Protocol | WebSocket        | - |

---

### 1. Clone repo

git clone https://github.com/your-username/web-moba-arena.git

### 2. Install dependencies

cd server && npm install\
cd client && npm install

### 3. Run locally

cd server && npm start\
cd client && npm run dev

------------------------------------------------------------------------

## Gameplay Flow

1.  Player enters the game
2.  Selects a character
3.  Joins a match (room)
4.  Battles other players
5.  Match ends → restart

### Game Mode

- Simple room-based multiplayer (no matchmaking system)
- Players join a room and start playing immediately
- No lobby, ranking, or queue system
- Designed for quick sessions and easy testing

------------------------------------------------------------------------

## Scaling & Hosting Options

### Current Setup (Render - Free Tier)
- Suitable for: 2–10 players
- Pros:
  - Free and easy to deploy
  - Good for development and demos
- Cons:
  - Cold start delay (~30–60s)
  - Server sleeps when inactive
  - Shared CPU (minor performance fluctuation)

---

### Alternative Hosting Options

#### Fly.io
- Suitable for: 2–30 players
- Pros:
  - No cold start (always running)
  - Better real-time performance
- Cost:
  - ~$1–5/month for small instances

---

#### VPS (e.g. DigitalOcean / Vultr)
- Suitable for: 10–50+ players (depending on optimization)
- Pros:
  - Full control over server
  - Stable performance (dedicated resources)
- Cost:
  - ~$5/month (basic server)

---

### Scaling Strategy

- Start with Render (development & testing)
- Move to Fly.io when real-time experience is needed
- Upgrade to VPS when player count increases

---

## Notes

- Stateless architecture (no persistent data storage)
- Server resets do not impact gameplay sessions
- Optimized for small matches (2–10 players)

## Roadmap

### Phase 1 — Core Prototype
- Basic 3D scene (map, camera, player)
- Player movement (keyboard + mobile joystick)
- Simple multiplayer sync (player position)

### Phase 2 — Gameplay
- Skill system (Q / W / E / R)
- Basic combat (hit detection, damage)
- Health system (HP / MP)
- UI integration (skills, HUD)

### Phase 3 — Game Systems
- Minion AI (lane pushing)
- Tower system
- Simple win condition

### Phase 4 — Polish
- Visual improvements (effects, animations)
- Mobile UX optimization
- Performance optimization

---

## Team Responsibilities (2 Developers)

### Developer A — Frontend / Client
- Three.js scene (map, camera, rendering)
- Player controls (keyboard + touch)
- UI implementation (HTML/CSS overlay)
- Skill input handling

---

### Developer B — Backend / Multiplayer
- Colyseus server setup
- Room management
- Player synchronization
- Game logic (combat, state updates)
- Minion AI & game rules

---

### Shared Tasks
- Game design decisions
- Balancing gameplay
- Debugging & testing

