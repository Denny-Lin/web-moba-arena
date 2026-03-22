import * as THREE from "three";
import { Client } from "colyseus.js";

type Team = "blue" | "red";
type Phase = "lobby" | "game";

type PlayerState = {
  x: number;
  z: number;
  ready: boolean;
  character: string;
  name: string;
  team: Team | null;
  slotIndex: number | null;
  isBot: boolean;
  hp: number;
};

const NAME_POOL = [
  "Aiden",
  "Mia",
  "Noah",
  "Luna",
  "Kai",
  "Nova",
  "Ezra",
  "Ruby",
  "Leo",
  "Ivy",
  "Zane",
  "Milo",
  "Aria",
  "Finn",
  "Nora",
  "Jasper",
  "Ella",
  "Toby",
  "Cora",
  "Riven",
];

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

const RECONNECT_TOKEN_KEY = "moba_reconnection_token";

const hostname = window.location.hostname;

const SERVER_URL =
  hostname === "localhost" ||
  hostname === "127.0.0.1" ||
  hostname.startsWith("192.168")
    ? "ws://192.168.1.232:2567"
    : "wss://your-render-url.onrender.com";

const client = new Client(SERVER_URL);

function getSavedToken() {
  return sessionStorage.getItem(RECONNECT_TOKEN_KEY);
}

function saveToken(token: string) {
  sessionStorage.setItem(RECONNECT_TOKEN_KEY, token);
}

function clearToken() {
  sessionStorage.removeItem(RECONNECT_TOKEN_KEY);
}

async function connectRoom() {
  const savedToken = getSavedToken();

  if (savedToken) {
    try {
      console.log("🔄 trying reconnect...");
      const r = await client.reconnect(savedToken);
      saveToken(r.reconnectionToken);
      return r;
    } catch (err) {
      console.warn("Reconnect failed, joining a new room.", err);
      clearToken();
    }
  }

  const r = await client.joinOrCreate("moba_room");
  saveToken(r.reconnectionToken);
  return r;
}

const room = await connectRoom();

console.log("Connecting to:", SERVER_URL);
console.log("My sessionId:", room.sessionId);

let currentPhase: Phase = "lobby";
let players: Record<string, PlayerState> = {};
let myPos = { x: 0, z: 0 };
let myReady = false;
let myTeam: Team | null = null;
let myName = NAME_POOL[Math.floor(Math.random() * NAME_POOL.length)];
let myCharacter = NAME_TO_CHARACTER[myName] ?? "Warrior";
let lastSentAt = 0;
const keys = new Set<string>();

let scene: THREE.Scene | null = null;
let camera: THREE.PerspectiveCamera | null = null;
let renderer: THREE.WebGLRenderer | null = null;
let clock: THREE.Clock | null = null;

const playerMeshes = new Map<string, THREE.Mesh>();

document.body.style.margin = "0";
document.body.style.overflow = "hidden";

const lobbyUI = document.createElement("div");
lobbyUI.style.position = "fixed";
lobbyUI.style.inset = "0";
lobbyUI.style.background = "#1f1f1f";
lobbyUI.style.color = "white";
lobbyUI.style.fontFamily = "sans-serif";
lobbyUI.style.zIndex = "10";
lobbyUI.style.display = "flex";
lobbyUI.style.alignItems = "center";
lobbyUI.style.justifyContent = "center";
lobbyUI.style.padding = "24px";
lobbyUI.style.boxSizing = "border-box";

lobbyUI.innerHTML = `
  <div style="width:100%;max-width:760px;background:#262626;border:1px solid #3a3a3a;border-radius:20px;padding:28px;box-shadow:0 12px 40px rgba(0,0,0,0.35);">
    <div id="phaseText" style="font-size:28px;font-weight:700;margin-bottom:12px;text-align:center;">Lobby - choose a team and ready up</div>
    <div id="noticeText" style="min-height:24px;color:#fbbf24;margin-bottom:12px;text-align:center;"></div>
    <div id="teamCountText" style="margin-bottom:14px;text-align:center;font-size:18px;">Blue 0/4 | Red 0/4</div>
    <div id="playerList" style="white-space:pre-line;margin-bottom:20px;text-align:center;line-height:1.6;font-size:16px;"></div>

    <div style="display:flex;justify-content:center;gap:12px;flex-wrap:wrap;margin-bottom:20px;">
      <label style="display:flex;flex-direction:column;gap:6px;align-items:center;">
        <span style="font-size:14px;">名字</span>
        <select id="nameSelect" style="padding:12px 14px;font-size:16px;min-width:220px;border-radius:12px;border:1px solid #555;background:#111;color:white;"></select>
      </label>
    </div>

    <div style="display:flex;justify-content:center;gap:12px;flex-wrap:wrap;">
      <button id="blueBtn" style="padding:14px 22px;font-size:16px;border-radius:12px;border:none;cursor:pointer;">Blue Team</button>
      <button id="redBtn" style="padding:14px 22px;font-size:16px;border-radius:12px;border:none;cursor:pointer;">Red Team</button>
      <button id="readyBtn" style="padding:14px 22px;font-size:16px;border-radius:12px;border:none;cursor:pointer;">Ready</button>
    </div>
  </div>
`;
document.body.appendChild(lobbyUI);

const phaseText = lobbyUI.querySelector("#phaseText") as HTMLDivElement;
const noticeText = lobbyUI.querySelector("#noticeText") as HTMLDivElement;
const teamCountText = lobbyUI.querySelector("#teamCountText") as HTMLDivElement;
const playerList = lobbyUI.querySelector("#playerList") as HTMLDivElement;
const blueBtn = lobbyUI.querySelector("#blueBtn") as HTMLButtonElement;
const redBtn = lobbyUI.querySelector("#redBtn") as HTMLButtonElement;
const readyBtn = lobbyUI.querySelector("#readyBtn") as HTMLButtonElement;
const nameSelect = lobbyUI.querySelector("#nameSelect") as HTMLSelectElement;

function fillSelectOptions() {
  nameSelect.innerHTML = NAME_POOL.map(
    (name) => `<option value="${name}">${name}</option>`
  ).join("");

  nameSelect.value = myName;
}

fillSelectOptions();

function updateLobbyHeader() {
  phaseText.innerText =
    currentPhase === "lobby"
      ? "Lobby - choose a team and ready up"
      : "Game Started";
}

function updateTeamCountText() {
  const blueHumans = Object.values(players).filter(
    (p) => !p.isBot && p.team === "blue"
  ).length;
  const redHumans = Object.values(players).filter(
    (p) => !p.isBot && p.team === "red"
  ).length;

  teamCountText.innerText = `Blue ${blueHumans}/4 | Red ${redHumans}/4`;
}

function updatePlayerList() {
  const lines = Object.entries(players).map(([id, p]) => {
    const shortId = id.slice(0, 5);
    const me = id === room.sessionId ? " (you)" : "";
    const team = p.team ?? "none";
    const ready = p.ready ? "ready" : "not ready";
    const kind = p.isBot ? "AI" : "human";
    const character = p.character || "Warrior";
    const name = p.name || "unnamed";
    return `${shortId}${me} | ${name} | ${team} | ${character} | ${ready} | ${kind}`;
  });

  playerList.innerText = lines.join("\n");
  updateTeamCountText();
}

function showNotice(text: string) {
  noticeText.innerText = text;
  setTimeout(() => {
    if (noticeText.innerText === text) {
      noticeText.innerText = "";
    }
  }, 2000);
}

function getMaterialColor(player: PlayerState, isSelf: boolean) {
  if (isSelf) {
    return player.team === "blue" ? 0x60a5fa : 0xf87171;
  }

  if (player.team === "blue") {
    return player.isBot ? 0x1d4ed8 : 0x3b82f6;
  }

  if (player.team === "red") {
    return player.isBot ? 0xb91c1c : 0xef4444;
  }

  return 0x999999;
}

function syncMeshes() {
  if (!scene) return;

  for (const [sessionId, player] of Object.entries(players)) {
    let mesh = playerMeshes.get(sessionId);

    if (!mesh) {
      const isSelf = sessionId === room.sessionId;

      mesh = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshStandardMaterial({
          color: getMaterialColor(player, isSelf),
        })
      );

      mesh.position.y = 0.5;
      mesh.scale.setScalar(isSelf ? 1.12 : 1);
      scene.add(mesh);
      playerMeshes.set(sessionId, mesh);
    }

    const isSelf = sessionId === room.sessionId;
    mesh.material = new THREE.MeshStandardMaterial({
      color: getMaterialColor(player, isSelf),
    });
    mesh.scale.setScalar(isSelf ? 1.12 : 1);
    mesh.position.set(player.x, 0.5, player.z);
  }

  for (const [sessionId, mesh] of playerMeshes.entries()) {
    if (!players[sessionId]) {
      scene?.remove(mesh);
      playerMeshes.delete(sessionId);
    }
  }
}

function startGameScene() {
  if (scene) return;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x222222);

  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 14, 14);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  document.body.appendChild(renderer.domElement);

  scene.add(new THREE.AmbientLight(0xffffff, 1.2));

  const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
  dirLight.position.set(10, 20, 10);
  scene.add(dirLight);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.MeshStandardMaterial({ color: 0x4a4a4a })
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  clock = new THREE.Clock();

  syncMeshes();

  const animate = () => {
    if (!scene || !camera || !renderer || !clock) return;

    requestAnimationFrame(animate);

    const dt = clock.getDelta();
    updateLocalPlayer(dt);

    renderer.render(scene, camera);
  };

  animate();

  window.addEventListener("resize", () => {
    if (!camera || !renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

room.onMessage("phase", (phase: Phase) => {
  currentPhase = phase;
  updateLobbyHeader();

  if (phase === "game") {
    lobbyUI.style.display = "none";
    startGameScene();
  }
});

room.onMessage("notice", (msg: string) => {
  showNotice(msg);
});

room.onMessage("state", (state: Record<string, PlayerState>) => {
  players = state;
  updatePlayerList();

  const me = players[room.sessionId];
  if (me) {
    myPos = { x: me.x, z: me.z };
    myReady = me.ready;
    myTeam = me.team;
    myName = me.name || myName;
    myCharacter = me.character || myCharacter;
    readyBtn.innerText = myReady ? "Unready" : "Ready";
    nameSelect.value = myName;
  }

  if (currentPhase === "game") {
    syncMeshes();
  }
});

blueBtn.onclick = () => {
  room.send("select_team", "blue");
};

redBtn.onclick = () => {
  room.send("select_team", "red");
};

nameSelect.onchange = () => {
  myName = nameSelect.value;
  myCharacter = NAME_TO_CHARACTER[myName] ?? "Warrior";
  room.send("select_name", myName);
};

readyBtn.onclick = () => {
  if (myTeam === null) {
    showNotice("先選隊伍");
    return;
  }

  myReady = !myReady;
  readyBtn.innerText = myReady ? "Unready" : "Ready";
  room.send("ready", myReady);
};

window.addEventListener("keydown", (e) => {
  keys.add(e.key.toLowerCase());
});

window.addEventListener("keyup", (e) => {
  keys.delete(e.key.toLowerCase());
});

function updateLocalPlayer(dt: number) {
  if (currentPhase !== "game") return;
  if (!scene) return;

  const speed = 6 * dt;
  let moved = false;
  const nextPos = { ...myPos };

  if (keys.has("w") || keys.has("arrowup")) {
    nextPos.z -= speed;
    moved = true;
  }
  if (keys.has("s") || keys.has("arrowdown")) {
    nextPos.z += speed;
    moved = true;
  }
  if (keys.has("a") || keys.has("arrowleft")) {
    nextPos.x -= speed;
    moved = true;
  }
  if (keys.has("d") || keys.has("arrowright")) {
    nextPos.x += speed;
    moved = true;
  }

  if (moved) {
    myPos = nextPos;

    const selfMesh = playerMeshes.get(room.sessionId);
    if (selfMesh) {
      selfMesh.position.set(myPos.x, 0.5, myPos.z);
    }

    const now = performance.now();
    if (now - lastSentAt > 50) {
      room.send("move", { x: myPos.x, z: myPos.z });
      lastSentAt = now;
    }
  }
}

room.send("select_name", myName);

updateLobbyHeader();
updateTeamCountText();
updatePlayerList();