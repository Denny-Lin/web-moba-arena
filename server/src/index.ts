import http from "http";
import express from "express";
import cors from "cors";
import { Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { MyRoom } from "./MyRoom";

const app = express();
app.use(cors());

const httpServer = http.createServer(app);

const gameServer = new Server({
  transport: new WebSocketTransport({ server: httpServer }),
});

gameServer.define("moba_room", MyRoom);

const PORT = Number(process.env.PORT ?? 2567);

httpServer.listen(PORT, () => {
  console.log(`🚀 後端大腦已啟動：ws://localhost:${PORT}`);
});