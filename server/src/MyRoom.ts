import { Room, Client } from "colyseus";

type PlayerPos = {
  x: number;
  z: number;
};

export class MyRoom extends Room {
  private players: Record<string, PlayerPos> = {};

  private spawnPoints: PlayerPos[] = [
    { x: 0, z: 0 },
    { x: 3, z: 0 },
    { x: -3, z: 0 },
    { x: 0, z: 3 },
    { x: 0, z: -3 },
  ];

  private playerSpawnIndex: Record<string, number> = {};
  private availableSpawnIndexes: number[] = [];

  onCreate() {
    console.log("🟢 room created: moba_room");

    this.availableSpawnIndexes = this.spawnPoints.map((_, i) => i);

    this.onMessage("move", (client: Client, data: PlayerPos) => {
      this.players[client.sessionId] = {
        x: Number(data?.x) || 0,
        z: Number(data?.z) || 0,
      };

      this.broadcast("state", this.players);
    });
  }

  onJoin(client: Client) {
    let spawnIndex = this.availableSpawnIndexes.shift();

    if (spawnIndex === undefined) {
      spawnIndex = 0;
    }

    this.playerSpawnIndex[client.sessionId] = spawnIndex;

    const spawn = this.spawnPoints[spawnIndex];
    this.players[client.sessionId] = {
      x: spawn.x,
      z: spawn.z,
    };

    console.log(`✅ ${client.sessionId} joined`, this.players[client.sessionId]);
    this.broadcast("state", this.players);
  }

  onLeave(client: Client) {
    const spawnIndex = this.playerSpawnIndex[client.sessionId];

    if (spawnIndex !== undefined) {
      this.availableSpawnIndexes.push(spawnIndex);
    }

    delete this.playerSpawnIndex[client.sessionId];
    delete this.players[client.sessionId];

    console.log(`👋 ${client.sessionId} left`);
    this.broadcast("state", this.players);
  }

  onDispose() {
    console.log("room disposed");
  }
}