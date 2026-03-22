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
  name: string;
  team: Team | null;
  slotIndex: number | null;
  isBot: boolean;
  hp: number;
};

const NAME_TO_CHARACTER: Record<string, string> = {
  Aiden: "Warrior",
  Mia: "Mage",
  Noah: "Archer",
  Luna: "Assassin",
  Kai: "Tank",
  Nova: "Healer",
  Ezra: "Ranger",
  Ruby: "Knight",
  Leo: "Warrior",
  Ivy: "Mage",
  Zane: "Archer",
  Milo: "Assassin",
  Aria: "Tank",
  Finn: "Healer",
  Nora: "Ranger",
  Jasper: "Knight",
  Ella: "Warrior",
  Toby: "Mage",
  Cora: "Archer",
  Riven: "Assassin",
};

function getCharacterForName(name: string): string {
  return NAME_TO_CHARACTER[name] ?? "Warrior";
}

export class MyRoom extends Room {
  private players: Record<string, PlayerState> = {};
  private phase: GamePhase = "lobby";

  private teamSlots: Record<Team, Array<string | null>> = {
    blue: [null, null, null, null],
    red: [null, null, null, null],
  };

  private botLoop?: NodeJS.Timeout;

  onCreate() {
    console.log("🟢 room created: moba_room");

    this.onMessage("select_team", (client: Client, team: Team) => {
      if (this.phase !== "lobby") return;

      const wantedTeam = team === "red" ? "red" : "blue";
      const ok = this.assignTeam(client.sessionId, wantedTeam);

      if (!ok) {
        client.send("notice", `${wantedTeam} team is full`);
        return;
      }

      const player = this.players[client.sessionId];
      if (player) {
        player.ready = false;
      }

      this.broadcast("state", this.players);
    });

    this.onMessage("select_name", (client: Client, name: string) => {
      if (this.phase !== "lobby") return;

      const player = this.players[client.sessionId];
      if (!player || player.isBot) return;

      const pickedName = String(name || "Aiden");
      player.name = pickedName;
      player.character = getCharacterForName(pickedName);

      this.broadcast("state", this.players);
    });

    this.onMessage("ready", (client: Client, isReady: boolean) => {
      if (this.phase !== "lobby") return;

      const player = this.players[client.sessionId];
      if (!player || player.isBot) return;

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
      if (!player || player.isBot) return;

      this.players[client.sessionId] = {
        ...player,
        x: Number(data?.x) || 0,
        z: Number(data?.z) || 0,
      };

      this.broadcast("state", this.players);
    });
  }

  onJoin(client: Client) {
    const defaultName = "Aiden";

    this.players[client.sessionId] = {
      x: 0,
      z: 0,
      ready: false,
      character: getCharacterForName(defaultName),
      name: defaultName,
      team: null,
      slotIndex: null,
      isBot: false,
      hp: 100,
    };

    console.log(`✅ ${client.sessionId} joined`);
    client.send("phase", this.phase);
    client.send("state", this.players);
    this.broadcast("state", this.players);
  }

  onLeave(client: Client) {
    const player = this.players[client.sessionId];

    if (player && !player.isBot) {
      this.releaseTeamSlot(client.sessionId);
    }

    delete this.players[client.sessionId];

    console.log(`👋 ${client.sessionId} left`);

    const hasHumans = Object.values(this.players).some((p) => !p.isBot);

    if (!hasHumans) {
      this.resetRoomToLobby();
      return;
    }

    if (this.phase === "game") {
      this.syncBotsForCurrentMatch();
    }

    this.broadcast("state", this.players);
  }

  onDispose() {
    this.stopBotLoop();
    console.log("room disposed");
  }

  private assignTeam(playerId: string, team: Team): boolean {
    const player = this.players[playerId];
    if (!player || player.isBot) return false;

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

    const humans = Object.entries(this.players).filter(([, p]) => !p.isBot);
    if (humans.length === 0) return;

    const allReady = humans.every(([, p]) => p.ready && p.team !== null);
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
          character: "Bot",
          name: botId,
          team,
          slotIndex: i,
          isBot: true,
          hp: 100,
        };
      }
    }
  }

  private placeAllPlayersAtSpawn() {
    for (const [, player] of Object.entries(this.players)) {
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

    const botIds = Object.entries(this.players)
      .filter(([, p]) => p.isBot)
      .map(([id]) => id);

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
      }
    }

    if (botIds.length > 0) {
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