
import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8db9c7);
scene.fog = new THREE.Fog(0x8db9c7, 70, 260);

const camera = new THREE.PerspectiveCamera(
  65, innerWidth / innerHeight, 0.1, 700
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.getElementById('game').appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xffffff, 0x52664b, 2));

const sun = new THREE.DirectionalLight(0xffedce, 3);
sun.position.set(-40, 70, 30);
sun.castShadow = true;
scene.add(sun);

const material = (color, metalness = 0, roughness = 0.8) =>
  new THREE.MeshStandardMaterial({ color, metalness, roughness });

const grass = material(0x608253);
const asphalt = material(0x303b40);
const white = material(0xd8d8ca);
const trunk = material(0x614834);
const leaves = material(0x3f7048);

function block(parent, w, h, d, mat, x, y, z) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d), mat
  );
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

// Open-world ground
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(420, 420, 30, 30), grass
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;

const vertices = ground.geometry.attributes.position;
for (let i = 0; i < vertices.count; i++) {
  const x = vertices.getX(i);
  const y = vertices.getY(i);
  vertices.setZ(
    i,
    Math.sin(x * 0.06) * 0.7 +
    Math.cos(y * 0.05) * 0.8
  );
}
ground.geometry.computeVertexNormals();
scene.add(ground);

// Roads
function road(x, z, w, d) {
  const r = new THREE.Mesh(
    new THREE.BoxGeometry(w, 0.12, d), asphalt
  );
  r.position.set(x, 0.02, z);
  r.receiveShadow = true;
  scene.add(r);
}

road(0, 0, 14, 420);
road(0, 0, 420, 14);

for (let i = -200; i <= 200; i += 10) {
  block(scene, 0.15, 0.025, 0.7, white, 0, 0.1, i);
  block(scene, 0.7, 0.025, 0.15, white, i, 0.1, 0);
}

// Trees
function tree(x, z, size = 1) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.scale.setScalar(size);

  block(group, 0.45, 2.3, 0.45, trunk, 0, 1.1, 0);

  const top = new THREE.Mesh(
    new THREE.ConeGeometry(2, 4, 7), leaves
  );
  top.position.y = 3.2;
  top.castShadow = true;
  group.add(top);

  scene.add(group);
}

for (let i = 0; i < 200; i++) {
  const x = (Math.random() - 0.5) * 380;
  const z = (Math.random() - 0.5) * 380;

  if (Math.abs(x) < 12 || Math.abs(z) < 12) continue;
  tree(x, z, 0.6 + Math.random() * 0.8);
}

// Car
const car = new THREE.Group();
scene.add(car);

const bodyMaterial = new THREE.MeshStandardMaterial({
  color: 0xef553f,
  metalness: 0.45,
  roughness: 0.28
});

const tireMaterial = material(0x15191c);
const glassMaterial = material(0x83c5d9, 0.2, 0.2);

block(car, 2.1, 0.55, 4.1, bodyMaterial, 0, 0.85, 0);
block(car, 1.55, 0.65, 1.9, bodyMaterial, 0, 1.35, -0.3);
block(car, 1.35, 0.45, 1.55, glassMaterial, 0, 1.48, -0.3);

const wheels = [];

for (const x of [-1.08, 1.08]) {
  for (const z of [-1.35, 1.35]) {
    const wheel = new THREE.Group();
    wheel.position.set(x, 0.48, z);
    car.add(wheel);

    const tire = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.42, 0.28, 20),
      tireMaterial
    );
    tire.rotation.z = Math.PI / 2;
    wheel.add(tire);

    const rimMaterial = material(0xc4cbd0, 0.8, 0.3);
    const rim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.25, 0.3, 12),
      rimMaterial
    );
    rim.rotation.z = Math.PI / 2;
    wheel.add(rim);

    wheels.push({ group: wheel, rimMaterial });
  }
}

// Collectible credit orbs
const orbs = [];
const orbMaterial = new THREE.MeshStandardMaterial({
  color: 0x55ffd0,
  emissive: 0x13b889,
  emissiveIntensity: 2
});

for (let i = 0; i < 30; i++) {
  let x, z;

  do {
    x = (Math.random() - 0.5) * 320;
    z = (Math.random() - 0.5) * 320;
  } while (Math.abs(x) < 12 || Math.abs(z) < 12);

  const orb = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.5, 1),
    orbMaterial
  );

  orb.position.set(x, 1.2, z);
  scene.add(orb);
  orbs.push(orb);
}

// Game data
let money = 1200;
let engineLevel = 1;
let turboLevel = 0;
let wheelLevel = 1;
let speed = 0;
let heading = 0;
let totalDistance = 0;

const keys = {};

addEventListener('keydown', e => {
  keys[e.key.toLowerCase()] = true;

  if (e.code === 'Space') e.preventDefault();
});

addEventListener('keyup', e => {
  keys[e.key.toLowerCase()] = false;
});

const $ = id => document.getElementById(id);

function notify(message) {
  const toast = $('toast');
  toast.textContent = message;
  toast.classList.add('show');

  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => {
    toast.classList.remove('show');
  }, 2200);
}

function updateUI() {
  $('money').textContent = money;
  $('power').textContent =
    (180 + (engineLevel - 1) * 45 + turboLevel * 25) + ' HP';

  $('engineLevel').textContent = 'Level ' + engineLevel;
  $('turboLevel').textContent = 'Level ' + turboLevel;
  $('wheelLevel').textContent = 'Level ' + wheelLevel;

  $('engineBuy').textContent = engineLevel >= 6
    ? 'MAXED'
    : (450 + (engineLevel - 1) * 350) + ' CR';

  $('turboBuy').textContent = turboLevel >= 5
    ? 'MAXED'
    : (600 + turboLevel * 450) + ' CR';

  $('wheelBuy').textContent = wheelLevel >= 6
    ? 'MAXED'
    : (350 + (wheelLevel - 1) * 250) + ' CR';

  $('engineBuy').disabled = engineLevel >= 6;
  $('turboBuy').disabled = turboLevel >= 5;
  $('wheelBuy').disabled = wheelLevel >= 6;
}

// Purchase upgrades
function buyUpgrade(type) {
  let cost;

  if (type === 'engine') {
    if (engineLevel >= 6) return;
    cost = 450 + (engineLevel - 1) * 350;
  } else if (type === 'turbo') {
    if (turboLevel >= 5) return;
    cost = 600 + turboLevel * 450;
  } else {
    if (wheelLevel >= 6) return;
    cost = 350 + (wheelLevel - 1) * 250;
  }

  if (money < cost) {
    notify('Not enough credits! Explore the world.');
    return;
  }

  money -= cost;

  if (type === 'engine') engineLevel++;
  if (type === 'turbo') turboLevel++;

  if (type === 'wheels') {
    wheelLevel++;
    const colors = [0xc4cbd0, 0xf0b64b, 0x111820, 0xe9e9e9];
    wheels.forEach(w => {
      w.rimMaterial.color.setHex(colors[(wheelLevel - 1) % colors.length]);
    });
  }

  updateUI();
  notify('Upgrade purchased successfully!');
}

$('engineBuy').onclick = () => buyUpgrade('engine');
$('turboBuy').onclick = () => buyUpgrade('turbo');
$('wheelBuy').onclick = () => buyUpgrade('wheels');

// Garage controls
$('openGarage').onclick = () => $('garage').classList.remove('hidden');
$('closeGarage').onclick = () => $('garage').classList.add('hidden');
$('driveButton').onclick = () => $('garage').classList.add('hidden');

// Paint customization
document.querySelectorAll('[data-color]').forEach(button => {
  button.onclick = () => {
    const color = button.dataset.color;
    bodyMaterial.color.set(color);
    document.querySelector('.preview-car').style.background = color;
    notify('New paint applied!');
  };
});

// Minimap
function drawMap() {
  const canvas = $('minimap');
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#13252a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = '#56635a';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(90, 0);
  ctx.lineTo(90, 140);
  ctx.moveTo(0, 70);
  ctx.lineTo(180, 70);
  ctx.stroke();

  for (const orb of orbs) {
    if (!orb.visible) continue;

    ctx.fillStyle = '#55ffd0';
    ctx.fillRect(
      90 + orb.position.x * 0.25,
      70 + orb.position.z * 0.25,
      3, 3
    );
  }

  ctx.fillStyle = '#ef553f';
  ctx.beginPath();
  ctx.arc(
    90 + car.position.x * 0.25,
    70 + car.position.z * 0.25,
    4, 0, Math.PI * 2
  );
  ctx.fill();
}

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const dt = Math.min(clock.getDelta(), 0.04);

  const forward = keys.w || keys.arrowup;
  const backward = keys.s || keys.arrowdown;
  const left = keys.a || keys.arrowleft;
  const right = keys.d || keys.arrowright;
  const brake = keys[' '];

  const maxSpeed = 23 + engineLevel * 2 + turboLevel * 3;

  if (forward) {
    speed += dt * (8 + engineLevel * 1.4 + turboLevel);
  } else if (backward) {
    speed -= dt * 10;
  } else {
    speed *= Math.pow(0.985, dt * 60);
  }

  if (brake) speed *= Math.pow(0.85, dt * 60);

  speed = THREE.MathUtils.clamp(speed, -10, maxSpeed);

  if (Math.abs(speed) > 0.15) {
    const steering = (left ? 1 : 0) - (right ? 1 : 0);
    heading += steering * dt * 1.2 * Math.sign(speed);

    car.position.x -= Math.sin(heading) * speed * dt;
    car.position.z -= Math.cos(heading) * speed * dt;

    totalDistance += Math.abs(speed * dt);
  }

  car.rotation.y = heading;

  wheels.forEach(w => {
    w.group.rotation.x -= speed * dt * 1.8;
  });

  car.position.x = THREE.MathUtils.clamp(car.position.x, -198, 198);
  car.position.z = THREE.MathUtils.clamp(car.position.z, -198, 198);

  // Collect credits
  for (const orb of orbs) {
    if (!orb.visible) continue;

    orb.rotation.y += dt * 1.5;
    orb.position.y = 1.2 + Math.sin(clock.elapsedTime * 2) * 0.2;

    if (orb.position.distanceTo(car.position) < 2.5) {
      orb.visible = false;
      money += 100;
      updateUI();
      notify('+100 CREDITS!');
    }
  }

  // Follow camera
  const target = car.position.clone().add(new THREE.Vector3(0, 1, 0));

  const offset = new THREE.Vector3(
    Math.sin(heading) * 9,
    5.5,
    Math.cos(heading) * 9
  );

  camera.position.lerp(
    target.clone().add(offset),
    1 - Math.pow(0.001, dt)
  );

  camera.lookAt(target);

  $('speed').textContent = Math.round(Math.abs(speed) * 3.6);

  drawMap();
  renderer.render(scene, camera);
}

updateUI();
animate();

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
