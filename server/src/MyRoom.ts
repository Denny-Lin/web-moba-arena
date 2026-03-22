import { Room, Client } from "colyseus";

type Team = "blue" | "red";
type GamePhase = "lobby" | "game";

type PlayerPos = {
  x: number;
  z: number;
};

type PlayerState = PlayerPos & {
  ready: boolean;
  character: string;
  team: Team | null;
  slotIndex: number | null;
  isBot: boolean;
  hp: number;
  clientId: string;
  disconnected: boolean;
};

export class MyRoom extends Room {
  private players: Record<string, PlayerState> = {};

  private phase: GamePhase = "lobby";

  private teamSlots: Record<Team, Array<string | null>> = {
    blue: [null, null, null, null],
    red: [null, null, null, null],
  };

  private clientIdToSessionId: Record<string, string> = {};
  private sessionIdToClientId: Record<string, string> = {};
  private pendingDisconnectTimers: Record<string, NodeJS.Timeout> = {};

  private readonly RECONNECT_WINDOW_MS = 10000;

  onCreate() {
    console.log("🟢 room created: moba_room");

    this.onMessage("select_team", (client: Client, team: Team) => {
      if (this.phase !== "lobby") return;

      const player = this.players[client.sessionId];
      if (!player || player.isBot || player.disconnected) return;

      const wantedTeam = team === "red" ? "red" : "blue";
      const ok = this.assignTeam(client.sessionId, wantedTeam);

      if (!ok) {
        client.send("notice", `${wantedTeam} team is full`);
        return;
      }

      player.ready = false;
      this.broadcast("state", this.players);
    });

    this.onMessage("select_character", (client: Client, character: string) => {
      if (this.phase !== "lobby") return;

      const player = this.players[client.sessionId];
      if (!player || player.isBot || player.disconnected) return;

      player.character = String(character || "warrior");
      this.broadcast("state", this.players);
    });

    this.onMessage("ready", (client: Client, isReady: boolean) => {
      if (this.phase !== "lobby") return;

      const player = this.players[client.sessionId];
      if (!player || player.isBot || player.disconnected) return;

      if (!player.team || player.slotIndex === null) {
        client.send("notice", "Choose a team first");
        return;
      }

      player.ready = Boolean(isReady);
      this.broadcast("state", this.players);

      this.checkStartGame();
    });

    this.onMessage("move", (client: Client, data: PlayerPos) => {
      if (this.phase !== "game") return;

      const player = this.players[client.sessionId];
      if (!player || player.isBot || player.disconnected) return;
      if (player.team === null || player.slotIndex === null) return;

      this.players[client.sessionId] = {
        ...player,
        x: Number(data?.x) || 0,
        z: Number(data?.z) || 0,
      };

      this.broadcast("state", this.players);
    });
  }

  onJoin(client: Client, options: { clientId?: string } = {}) {
    const clientId = options.clientId || client.sessionId;

    const pendingTimer = this.pendingDisconnectTimers[clientId];
    if (pendingTimer) {
      clearTimeout(pendingTimer);
      delete this.pendingDisconnectTimers[clientId];
    }

    const existingSessionId = this.clientIdToSessionId[clientId];
    const existingPlayer = existingSessionId ? this.players[existingSessionId] : undefined;

    // Reconnect: same clientId, new sessionId
    if (existingPlayer && existingSessionId && existingSessionId !== client.sessionId) {
      this.replacePlayerSession(existingSessionId, client.sessionId, clientId);

      const player = this.players[client.sessionId];
      player.disconnected = false;

      console.log(`🔁 ${clientId} reconnected as ${client.sessionId}`);

      client.send("phase", this.phase);
      client.send("state", this.players);
      this.broadcast("state", this.players);
      return;
    }

    // New join
    this.players[client.sessionId] = {
      x: 0,
      z: 0,
      ready: false,
      character: "warrior",
      team: null,
      slotIndex: null,
      isBot: false,
      hp: 100,
      clientId,
      disconnected: false,
    };

    this.clientIdToSessionId[clientId] = client.sessionId;
    this.sessionIdToClientId[client.sessionId] = clientId;

    console.log(`✅ ${client.sessionId} joined`);

    client.send("phase", this.phase);
    client.send("state", this.players);
    this.broadcast("state", this.players);
  }

  onLeave(client: Client) {
    const player = this.players[client.sessionId];
    const clientId = this.sessionIdToClientId[client.sessionId];

    if (!player) return;

    if (player.isBot) {
      delete this.players[client.sessionId];
      this.broadcast("state", this.players);
      return;
    }

    // Mark as temporarily disconnected, keep slot reserved for reconnect window
    player.disconnected = true;
    this.broadcast("state", this.players);

    if (clientId && !this.pendingDisconnectTimers[clientId]) {
      this.pendingDisconnectTimers[clientId] = setTimeout(() => {
        this.finalizeDisconnect(client.sessionId, clientId);
      }, this.RECONNECT_WINDOW_MS);
    }

    console.log(`👋 ${client.sessionId} left (temporary disconnect)`);
  }

  onDispose() {
    this.stopBotLoop();
    Object.values(this.pendingDisconnectTimers).forEach((t) => clearTimeout(t));
    console.log("room disposed");
  }

  private finalizeDisconnect(sessionId: string, clientId: string) {
    const player = this.players[sessionId];

    delete this.pendingDisconnectTimers[clientId];

    if (!player) {
      delete this.clientIdToSessionId[clientId];
      delete this.sessionIdToClientId[sessionId];
      return;
    }

    // If the player reconnected, the sessionId mapping will have changed.
    const mappedSessionId = this.clientIdToSessionId[clientId];
    if (mappedSessionId && mappedSessionId !== sessionId) {
      return;
    }

    if (player.team !== null && player.slotIndex !== null) {
      this.releaseTeamSlot(sessionId);
    }

    delete this.players[sessionId];
    delete this.clientIdToSessionId[clientId];
    delete this.sessionIdToClientId[sessionId];

    console.log(`🧹 ${sessionId} fully removed after timeout`);

    const hasActiveHumans = Object.values(this.players).some(
      (p) => !p.isBot && !p.disconnected
    );

    if (!hasActiveHumans) {
      this.resetRoomToLobby();
      return;
    }

    if (this.phase === "game") {
      this.syncBotsForCurrentMatch();
    }

    this.broadcast("state", this.players);
  }

  private replacePlayerSession(oldSessionId: string, newSessionId: string, clientId: string) {
    const oldPlayer = this.players[oldSessionId];
    if (!oldPlayer) return;

    if (oldPlayer.team !== null && oldPlayer.slotIndex !== null) {
      this.teamSlots[oldPlayer.team][oldPlayer.slotIndex] = newSessionId;
    }

    delete this.players[oldSessionId];
    delete this.sessionIdToClientId[oldSessionId];

    this.players[newSessionId] = {
      ...oldPlayer,
      clientId,
      disconnected: false,
    };

    this.clientIdToSessionId[clientId] = newSessionId;
    this.sessionIdToClientId[newSessionId] = clientId;
  }

  private assignTeam(playerId: string, team: Team): boolean {
    const player = this.players[playerId];
    if (!player || player.isBot || player.disconnected) return false;

    const currentTeam = player.team;
    const currentSlot = player.slotIndex;

    if (currentTeam === team && currentSlot !== null) {
      return true;
    }

    const freeSlot = this.teamSlots[team].findIndex((slot) => slot === null);
    if (freeSlot === -1) return false;

    if (currentTeam !== null && currentSlot !== null) {
      if (this.teamSlots[currentTeam][currentSlot] === playerId) {
        this.teamSlots[currentTeam][currentSlot] = null;
      }
    }

    this.teamSlots[team][freeSlot] = playerId;
    player.team = team;
    player.slotIndex = freeSlot;

    return true;
  }

  private releaseTeamSlot(playerId: string) {
    const player = this.players[playerId];
    if (!player || player.team === null || player.slotIndex === null) return;

    if (this.teamSlots[player.team][player.slotIndex] === playerId) {
      this.teamSlots[player.team][player.slotIndex] = null;
    }

    player.team = null;
    player.slotIndex = null;
    player.ready = false;
  }

  private checkStartGame() {
    if (this.phase !== "lobby") return;

    const humans = Object.values(this.players).filter(
      (p) => !p.isBot && !p.disconnected
    );

    if (humans.length === 0) return;

    const allReady = humans.every((p) => p.ready && p.team !== null);
    if (!allReady) return;

    this.startGame();
  }

  private startGame() {
    if (this.phase === "game") return;

    this.phase = "game";
    console.log("🎮 game started");

    this.syncBotsForCurrentMatch();
    this.placeAllPlayersAtSpawn();

    this.broadcast("phase", this.phase);
    this.broadcast("state", this.players);

    this.startBotLoop();
  }

  private syncBotsForCurrentMatch() {
    this.removeAllBots();
    this.fillMissingSlotsWithBots();
    this.placeAllPlayersAtSpawn();
  }

  private removeAllBots() {
    for (const team of ["blue", "red"] as Team[]) {
      for (let i = 0; i < 4; i++) {
        const occupant = this.teamSlots[team][i];
        if (occupant && occupant.startsWith("bot_")) {
          this.teamSlots[team][i] = null;
        }
      }
    }

    for (const id of Object.keys(this.players)) {
      if (this.players[id].isBot) {
        delete this.players[id];
      }
    }
  }

  private fillMissingSlotsWithBots() {
    for (const team of ["blue", "red"] as Team[]) {
      for (let i = 0; i < 4; i++) {
        if (this.teamSlots[team][i] !== null) continue;

        const botId = `bot_${team}_${i}`;
        this.teamSlots[team][i] = botId;

        const spawn = this.getSpawnPosition(team, i);

        this.players[botId] = {
          x: spawn.x,
          z: spawn.z,
          ready: true,
          character: "bot",
          team,
          slotIndex: i,
          isBot: true,
          hp: 100,
          clientId: botId,
          disconnected: false,
        };
      }
    }
  }

  private placeAllPlayersAtSpawn() {
    for (const [id, player] of Object.entries(this.players)) {
      if (player.team === null || player.slotIndex === null) continue;

      const spawn = this.getSpawnPosition(player.team, player.slotIndex);
      player.x = spawn.x;
      player.z = spawn.z;
    }
  }

  private getSpawnPosition(team: Team, slotIndex: number): PlayerPos {
    const zOffsets = [-3, -1, 1, 3];
    const z = zOffsets[slotIndex] ?? 0;

    if (team === "blue") {
      return { x: -8, z };
    }

    return { x: 8, z };
  }

  private startBotLoop() {
    this.stopBotLoop();
    this.botLoop = setInterval(() => {
      this.updateBots();
    }, 100);
  }

  private stopBotLoop() {
    if (this.botLoop) {
      clearInterval(this.botLoop);
      this.botLoop = undefined;
    }
  }

  private updateBots() {
    if (this.phase !== "game") return;

    const botIds = Object.keys(this.players).filter((id) => this.players[id].isBot);

    let changed = false;

    for (const botId of botIds) {
      const bot = this.players[botId];
      if (!bot || bot.team === null) continue;

      const target = this.findNearestEnemy(botId);
      if (!target) continue;

      const dx = target.x - bot.x;
      const dz = target.z - bot.z;
      const dist = Math.hypot(dx, dz);

      if (dist > 0.01) {
        const step = 0.06;
        bot.x += (dx / dist) * step;
        bot.z += (dz / dist) * step;
        changed = true;
      }
    }

    if (changed) {
      this.broadcast("state", this.players);
    }
  }

  private findNearestEnemy(botId: string): PlayerState | null {
    const bot = this.players[botId];
    if (!bot || bot.team === null) return null;

    let nearest: PlayerState | null = null;
    let bestDist = Infinity;

    for (const [id, player] of Object.entries(this.players)) {
      if (id === botId) continue;
      if (player.team === bot.team) continue;
      if (player.disconnected) continue;

      const dx = player.x - bot.x;
      const dz = player.z - bot.z;
      const dist = Math.hypot(dx, dz);

      if (dist < bestDist) {
        bestDist = dist;
        nearest = player;
      }
    }

    return nearest;
  }

  private resetRoomToLobby() {
    this.stopBotLoop();

    for (const timer of Object.values(this.pendingDisconnectTimers)) {
      clearTimeout(timer);
    }
    this.pendingDisconnectTimers = {};
    this.clientIdToSessionId = {};
    this.sessionIdToClientId = {};

    this.phase = "lobby";
    this.players = {};
    this.teamSlots = {
      blue: [null, null, null, null],
      red: [null, null, null, null],
    };

    this.broadcast("phase", this.phase);
    this.broadcast("state", this.players);

    console.log("🔄 room reset to lobby");
  }
}