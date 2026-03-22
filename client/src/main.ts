import * as THREE from "three";
import { Client } from "colyseus.js";

type PlayerPos = {
  x: number;
  z: number;
};

const hostname = window.location.hostname;

const SERVER_URL =
  hostname === "localhost" ||
  hostname === "127.0.0.1" ||
  hostname.startsWith("192.168")
    ? "ws://192.168.1.232:2567"
    : "wss://your-render-url.onrender.com";

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x222222);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 14, 14);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
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

const client = new Client(SERVER_URL);
const room = await client.joinOrCreate("moba_room");

console.log("Connecting to:", SERVER_URL);
console.log("My sessionId:", room.sessionId);

const playerMeshes = new Map<string, THREE.Mesh>();
const keys = new Set<string>();

let myPos: PlayerPos = { x: 0, z: 0 };
let lastSentAt = 0;

room.onMessage("state", (players: Record<string, PlayerPos>) => {
  console.log("state:", players);

  for (const [sessionId, pos] of Object.entries(players)) {
    let mesh = playerMeshes.get(sessionId);

    if (!mesh) {
      const isSelf = sessionId === room.sessionId;

      mesh = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshStandardMaterial({
          color: isSelf ? 0x00ff88 : 0xff4444,
        })
      );

      mesh.position.y = 0.5;
      scene.add(mesh);
      playerMeshes.set(sessionId, mesh);
    }

    mesh.position.set(pos.x, 0.5, pos.z);

    if (sessionId === room.sessionId) {
      myPos = { x: pos.x, z: pos.z };
    }
  }

  for (const [sessionId, mesh] of playerMeshes.entries()) {
    if (!players[sessionId]) {
      scene.remove(mesh);
      playerMeshes.delete(sessionId);
    }
  }
});

window.addEventListener("keydown", (e) => {
  keys.add(e.key.toLowerCase());
});

window.addEventListener("keyup", (e) => {
  keys.delete(e.key.toLowerCase());
});

const clock = new THREE.Clock();

function updateLocalPlayer(dt: number) {
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

function animate() {
  requestAnimationFrame(animate);

  const dt = clock.getDelta();
  updateLocalPlayer(dt);

  renderer.render(scene, camera);
}

animate();

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});