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

<img width="1536" height="1024" alt="sample" src="https://github.com/user-attachments/assets/6e091dd4-0411-4822-a699-485b0da33efa" />

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

Client (Browser / Mobile) - Three.js (Rendering) - Input Handling ↓
WebSocket ↓ Server (Colyseus) - Game State - Player Sync - Combat Logic

------------------------------------------------------------------------

## Getting Started

### 1. Clone repo

git clone https://github.com/your-username/web-moba-arena.git

### 2. Install dependencies

cd server && npm install\
cd client && npm install

### 3. Run locally

cd server && npm start\
cd client && npm run dev

------------------------------------------------------------------------

## 🎮 Gameplay Flow

1.  Player enters the game\
2.  Selects a character\
3.  Joins a match (room)\
4.  Battles other players\
5.  Match ends → restart

------------------------------------------------------------------------

## Notes

-   Stateless game (no persistent data)
-   Server reset will not affect gameplay
-   Designed for small matches (2--10 players)
