import * as THREE from 'three';
import { EffectComposer } from '../assets/vendor/three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from '../assets/vendor/three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from '../assets/vendor/three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from '../assets/vendor/three/addons/postprocessing/OutputPass.js';
import { createTextures } from './textures.js';
import { createWorld } from './world.js';
import { createOperator, animateOperator, createViewWeapon, createBomb } from './models.js';
import { AudioEngine } from './audio.js';

const $ = id => document.getElementById(id);
const dom = {
  canvas: $('scene-canvas'), boot: $('boot'), bootStatus: $('boot-status'), bootPct: $('boot-pct'), bootFill: $('boot-fill'),
  menu: $('menu'), deploy: $('deploy-btn'), how: $('how-btn'), difficulty: $('difficulty-btn'), difficultyLabel: $('difficulty-label'),
  hud: $('hud'), health: $('health'), healthFill: $('health-fill'), armor: $('armor'), money: $('money'),
  ammo: $('ammo'), reserve: $('reserve'), ammoFill: $('ammo-fill'), weaponName: $('weapon-name'), weaponType: $('weapon-type'),
  ctScore: $('ct-score'), tScore: $('t-score'), ctAlive: $('ct-alive'), tAlive: $('t-alive'), roundLabel: $('round-label'), roundTime: $('round-time'), phaseLabel: $('phase-label'),
  objectiveText: $('objective-text'), bombTimer: $('bomb-timer'), killfeed: $('killfeed'), crosshair: $('crosshair'), hitmarker: $('hitmarker'),
  targetName: $('target-name'), interact: $('interact'), defuseFill: $('defuse-fill'), damageDirs: $('damage-dirs'), damageFlash: $('damage-flash'), flash: $('flash'),
  radar: $('radar'), radarCoords: $('radar-coords'), roundBanner: $('round-banner'), rbKicker: $('rb-kicker'), rbTitle: $('rb-title'), rbSub: $('rb-sub'),
  roundPop: $('round-pop'), paused: $('paused'), matchOver: $('match-over'), endKicker: $('end-kicker'), endTitle: $('end-title'), endSub: $('end-sub'),
  endCt: $('end-ct'), endT: $('end-t'), endKills: $('end-kills'), endDeaths: $('end-deaths'), endHs: $('end-hs'), endAcc: $('end-acc'),
  manual: $('manual'), toast: $('toast'), fps: $('fps'), scope: $('scope'), spectate: $('spectate'), specName: $('spec-name'),
  invPrimary: $('inv-primary'), invSecondary: $('inv-secondary'), invKnife: $('inv-knife'), mapPreview: $('map-preview'),
  mobile: $('mobile-controls'), crosshairLabel: $('crosshair-label')
};

const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
const damp = (a, b, l, dt) => lerp(a, b, 1 - Math.exp(-l * dt));

const renderer = new THREE.WebGLRenderer({ canvas: dom.canvas, antialias: true, powerPreference: 'high-performance', stencil: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.55));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0xc7a276, .0046);
const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, .045, 340);
camera.rotation.order = 'YXZ';

const viewScene = new THREE.Scene();
const viewCamera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, .01, 12);
viewScene.add(new THREE.HemisphereLight(0xfff1d6, 0x2b2a24, 2.1));
const viewKey = new THREE.DirectionalLight(0xffd8a4, 4.4); viewKey.position.set(2.5, 4, 2.4); viewScene.add(viewKey);
const viewRim = new THREE.DirectionalLight(0x89b4d8, 2.0); viewRim.position.set(-3, 1.5, -1.2); viewScene.add(viewRim);
const viewFill = new THREE.PointLight(0xff8a45, 1.3, 6); viewFill.position.set(-1, -1, 1); viewScene.add(viewFill);

function createEnvironment() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, '#4b7a9e'); g.addColorStop(.44, '#bda17d'); g.addColorStop(.55, '#e9bb84'); g.addColorStop(1, '#6f5238');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 1024, 512);
  const sun = ctx.createRadialGradient(730, 200, 0, 730, 200, 150);
  sun.addColorStop(0, 'rgba(255,251,223,1)'); sun.addColorStop(.12, 'rgba(255,224,157,.9)'); sun.addColorStop(1, 'rgba(255,180,80,0)');
  ctx.fillStyle = sun; ctx.fillRect(0, 0, 1024, 512);
  ctx.fillStyle = 'rgba(255,220,170,.08)'; ctx.fillRect(0, 246, 1024, 20);
  const tex = new THREE.CanvasTexture(c);
  tex.mapping = THREE.EquirectangularReflectionMapping; tex.colorSpace = THREE.SRGBColorSpace;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromEquirectangular(tex).texture;
  tex.dispose(); pmrem.dispose();
  return env;
}
const envMap = createEnvironment();
scene.environment = envMap; scene.environmentIntensity = .42;
viewScene.environment = envMap; viewScene.environmentIntensity = .5;

const rt = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, { type: THREE.HalfFloatType, samples: 4 });
const composer = new EffectComposer(renderer, rt);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), .30, .52, .91);
composer.addPass(bloom);
composer.addPass(new OutputPass());

const textures = createTextures(renderer);
const world = createWorld(scene, textures);
const audio = new AudioEngine();
let menuRig = null, menuRig2 = null;

function setupMenuScene() {
  menuRig = createOperator('ct');
  menuRig.group.position.set(-32.9, 0, -8.7);
  menuRig.group.rotation.y = -2.12;
  scene.add(menuRig.group);
  menuRig2 = createOperator('t');
  menuRig2.group.position.set(-38.8, 0, -17.3);
  menuRig2.group.rotation.y = .45;
  menuRig2.group.scale.setScalar(.98);
  scene.add(menuRig2.group);
  const glow = new THREE.PointLight(0xffb774, 1.2, 9, 2); glow.position.set(-28.5, 3.0, -4.5); scene.add(glow);
  const rim = new THREE.SpotLight(0xffd2a0, 1.8, 20, .55, .6, 1.5); rim.position.set(-21, 6, -2); rim.target.position.set(-33, 1, -9); scene.add(rim); scene.add(rim.target);
}
setupMenuScene();

const WEAPONS = {
  m4: { name: 'M4A4', category: 'PRIMARY // RIFLE', mag: 30, reserve: 90, rpm: 666, damage: 30, head: 3.6, spread: .009, kick: .0105, reload: 2.25, auto: true, sound: 'm4' },
  ak: { name: 'AK-47', category: 'PRIMARY // RIFLE', mag: 30, reserve: 90, rpm: 600, damage: 35, head: 4.1, spread: .012, kick: .0135, reload: 2.45, auto: true, sound: 'ak' },
  awp: { name: 'AWP', category: 'PRIMARY // SNIPER', mag: 10, reserve: 30, rpm: 41, damage: 118, head: 2.2, spread: .0018, kick: .032, reload: 3.45, auto: false, sound: 'awp', zoom: true },
  usp: { name: 'USP-S', category: 'SECONDARY // PISTOL', mag: 12, reserve: 36, rpm: 352, damage: 31, head: 4, spread: .007, kick: .0065, reload: 1.85, auto: false, sound: 'usp' },
  knife: { name: 'KNIFE', category: 'MELEE // BLADE', mag: Infinity, reserve: Infinity, rpm: 120, damage: 58, head: 1, spread: 0, kick: .005, reload: 0, auto: false, sound: 'knife', melee: 2.4 }
};
const DIFFICULTIES = [
  { name: 'RECRUIT', skill: .43, reaction: 1.0, dmg: .65 },
  { name: 'REGULAR', skill: .56, reaction: .78, dmg: .82 },
  { name: 'VETERAN', skill: .68, reaction: .58, dmg: 1.0 },
  { name: 'ELITE', skill: .79, reaction: .38, dmg: 1.13 }
];
let difficultyIndex = 2;

const state = {
  mode: 'menu', matchLive: false, round: 1, ctScore: 0, tScore: 0, scoreToWin: 4,
  phase: 'freeze', freeze: 4.2, roundTime: 105, roundEnded: false, roundEndTimer: 0,
  bombPlanted: false, bombTime: 0, bomb: null, bombSite: null, tSite: null,
  bots: [], effects: [], shells: [], decals: [], menuTime: 0, time: 0,
  selectedPrimary: 'm4', wart: 0, lastHud: {}, pointerLocked: false, dragging: false,
  lockedFrames: 0, spectateBot: null, lastFrame: performance.now(), fpsAcc: 0, fpsFrames: 0, fps: 60,
  shake: 0, shakeDir: new THREE.Vector3(), bannerTimer: null
};

const player = {
  kind: 'player', team: 'ct', name: 'YOU', pos: new THREE.Vector3(0, 0, 40), vel: new THREE.Vector3(), yaw: 0, pitch: 0,
  hp: 100, armor: 100, alive: true, crouch: false, sprint: false, ground: true, eye: 1.64,
  primary: 'm4', secondary: 'usp', slot: 'primary', current: 'm4', ammo: {}, rig: null, flash: null, flashLight: null,
  firing: false, fireCooldown: 0, reloading: 0, reloadTime: 0, drawTimer: 0, ads: false, scoped: false,
  shots: 0, hits: 0, headshots: 0, kills: 0, deaths: 0, money: 800, recoilPitch: 0, recoilYaw: 0, shotBurst: 0,
  bob: 0, step: 0, swayX: 0, swayY: 0, kickZ: 0, kickRot: 0, lastDamage: -10, defusing: 0, deadAge: 0,
  moveAmount: 0, jumpVel: 0, landImpact: 0, useHeld: false
};

function resetPlayerAmmo() {
  player.primary = state.selectedPrimary;
  player.current = player.primary;
  player.slot = 'primary';
  player.ammo = {
    m4: { mag: 30, reserve: 90 }, ak: { mag: 30, reserve: 90 }, awp: { mag: 10, reserve: 30 },
    usp: { mag: 12, reserve: 36 }, knife: { mag: Infinity, reserve: Infinity }
  };
}

function equipWeapon(id) {
  if (player.rig) {
    viewScene.remove(player.rig.group);
    player.rig.group.traverse(o => { if (o.geometry) o.geometry.dispose(); });
  }
  player.current = id;
  const rig = createViewWeapon(id);
  player.rig = rig;
  rig.group.position.set(.31, -.275, -.52);
  rig.group.rotation.set(.015, -.035, .015);
  viewScene.add(rig.group);
  const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: textures.muzzle, color: 0xffd49a, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false }));
  flash.scale.set(.28, .28, 1); flash.visible = false; flash.renderOrder = 999;
  rig.muzzle.add(flash); player.flash = flash;
  const light = new THREE.PointLight(0xffb15a, 0, 3, 2); rig.muzzle.add(light); player.flashLight = light;
  player.drawTimer = .28;
  state.wart++;
}

function updateAmmoDom() {
  const w = WEAPONS[player.current];
  const a = player.ammo[player.current];
  dom.weaponName.textContent = w.name;
  dom.weaponType.textContent = w.category;
  dom.ammo.textContent = a.mag === Infinity ? '∞' : a.mag;
  dom.reserve.textContent = a.reserve === Infinity ? '∞' : a.reserve;
  dom.ammoFill.style.width = (a.mag === Infinity ? 100 : (a.mag / w.mag) * 100) + '%';
  dom.invPrimary.querySelector('b').textContent = WEAPONS[player.primary].name;
  dom.invPrimary.classList.toggle('active', player.slot === 'primary');
  dom.invSecondary.classList.toggle('active', player.slot === 'secondary');
  dom.invKnife.classList.toggle('active', player.slot === 'knife');
  dom.crosshairLabel.textContent = `${w.name} // ${a.mag === Infinity ? 'MELEE' : a.mag + ' RDS'}`;
}

let radarBg = null;
function buildBlueprints() {
  const size = 360, c = document.createElement('canvas'); c.width = c.height = size;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#0c1212'; ctx.fillRect(0, 0, size, size);
  const pad = 17, span = size - pad * 2;
  const sx = x => pad + ((x + 48) / 96) * span;
  const sz = z => pad + ((z + 48) / 96) * span;
  ctx.strokeStyle = 'rgba(118,139,129,.11)'; ctx.lineWidth = 1;
  for (let i = 1; i < 8; i++) { const p = pad + span * i / 8; ctx.beginPath(); ctx.moveTo(p, pad); ctx.lineTo(p, size - pad); ctx.stroke(); ctx.beginPath(); ctx.moveTo(pad, p); ctx.lineTo(size - pad, p); ctx.stroke(); }
  ctx.fillStyle = 'rgba(95,122,108,.15)';
  for (const col of world.colliders) {
    if (col.top < .4 || (col.maxX - col.minX) < .3) continue;
    const x = sx(col.minX), y = sz(col.minZ), w = Math.max(1, sx(col.maxX) - x), h = Math.max(1, sz(col.maxZ) - y);
    ctx.fillRect(x, y, w, h);
  }
  ctx.strokeStyle = 'rgba(255,147,63,.28)'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 5]);
  ctx.beginPath(); ctx.moveTo(sx(0), sz(40)); ctx.lineTo(sx(0), sz(9)); ctx.lineTo(sx(-33), sz(-13)); ctx.moveTo(sx(0), sz(9)); ctx.lineTo(sx(33), sz(-11)); ctx.stroke(); ctx.setLineDash([]);
  for (const s of world.sites) {
    ctx.strokeStyle = 'rgba(255,141,54,.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(sx(s.center.x), sz(s.center.z), 13, 0, 7); ctx.stroke();
    ctx.fillStyle = 'rgba(255,150,65,.9)'; ctx.font = 'bold 16px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(s.id, sx(s.center.x), sz(s.center.z) + 1);
  }
  ctx.strokeStyle = 'rgba(255,138,43,.16)'; ctx.strokeRect(9, 9, size - 18, size - 18);
  radarBg = c;

  const pc = dom.mapPreview, pctx = pc.getContext('2d'), W = pc.width, H = pc.height;
  pctx.fillStyle = '#16140f'; pctx.fillRect(0, 0, W, H);
  pctx.strokeStyle = 'rgba(210,179,133,.075)'; pctx.lineWidth = 1;
  for (let x = 0; x < W; x += 28) { pctx.beginPath(); pctx.moveTo(x, 0); pctx.lineTo(x, H); pctx.stroke(); }
  for (let y = 0; y < H; y += 28) { pctx.beginPath(); pctx.moveTo(0, y); pctx.lineTo(W, y); pctx.stroke(); }
  const pspanX = W - 56, pspanY = H - 40;
  const px = x => 28 + ((x + 48) / 96) * pspanX, py = z => 20 + ((z + 48) / 96) * pspanY;
  pctx.fillStyle = 'rgba(204,168,119,.28)';
  for (const col of world.colliders) {
    if (col.top < .4) continue;
    const x = px(col.minX), y = py(col.minZ), w = Math.max(1, px(col.maxX) - x), h = Math.max(1, py(col.maxZ) - y);
    pctx.fillRect(x, y, w, h);
  }
  pctx.strokeStyle = 'rgba(255,138,43,.7)'; pctx.lineWidth = 1.4; pctx.setLineDash([5, 4]);
  pctx.beginPath(); pctx.moveTo(px(0), py(41)); pctx.lineTo(px(0), py(9)); pctx.lineTo(px(-33), py(-13)); pctx.moveTo(px(0), py(9)); pctx.lineTo(px(33), py(-11)); pctx.stroke(); pctx.setLineDash([]);
  for (const s of world.sites) {
    pctx.fillStyle = 'rgba(255,93,28,.3)'; pctx.beginPath(); pctx.arc(px(s.center.x), py(s.center.z), 17, 0, 7); pctx.fill();
    pctx.strokeStyle = 'rgba(255,170,89,.9)'; pctx.lineWidth = 1.5; pctx.stroke();
    pctx.fillStyle = '#ffd2a0'; pctx.font = 'bold 14px Arial'; pctx.textAlign = 'center'; pctx.textBaseline = 'middle'; pctx.fillText(s.id, px(s.center.x), py(s.center.z) + 1);
  }
  pctx.fillStyle = 'rgba(102,182,255,.8)'; pctx.beginPath(); pctx.moveTo(px(0), py(44)); pctx.lineTo(px(0) - 7, py(47)); pctx.lineTo(px(0) + 7, py(47)); pctx.fill();
  pctx.fillStyle = 'rgba(255,173,77,.8)'; pctx.beginPath(); pctx.moveTo(px(0), py(-44)); pctx.lineTo(px(0) - 7, py(-47)); pctx.lineTo(px(0) + 7, py(-47)); pctx.fill();
  pctx.fillStyle = 'rgba(225,196,154,.58)'; pctx.font = '500 7px Chakra Petch'; pctx.textAlign = 'left';
  pctx.fillText('CT SPAWN', px(-2), py(39)); pctx.fillText('T SPAWN', px(-2), py(-34));
}
buildBlueprints();

function addTracer(from, to, color = 0xffbd78, life = .08) {
  const geo = new THREE.BufferGeometry().setFromPoints([from, to]);
  const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: .92, blending: THREE.AdditiveBlending, depthWrite: false });
  const line = new THREE.Line(geo, mat); scene.add(line);
  state.effects.push({ kind: 'tracer', obj: line, life, maxLife: life });
}
function addImpact(point, normal, blood = false) {
  if (blood) {
    for (let i = 0; i < 10; i++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(rand(.018, .05), 5, 4), new THREE.MeshBasicMaterial({ color: new THREE.Color().setHSL(.01, .8, rand(.13, .28)), transparent: true, opacity: .9 }));
      m.position.copy(point); scene.add(m);
      state.effects.push({ kind: 'blood', obj: m, life: rand(.35, .8), maxLife: .8, vel: new THREE.Vector3(rand(-1.8, 1.8), rand(.2, 2.4), rand(-1.8, 1.8)) });
    }
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: textures.smoke, color: 0x7f170d, transparent: true, opacity: .55, depthWrite: false }));
    s.position.copy(point); s.scale.set(.52, .52, 1); scene.add(s);
    state.effects.push({ kind: 'puff', obj: s, life: .3, maxLife: .3, grow: .8, blood: true });
  } else {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: textures.smoke, color: 0xc7a57b, transparent: true, opacity: .65, depthWrite: false }));
    s.position.copy(point); s.scale.set(.28, .28, 1); scene.add(s);
    state.effects.push({ kind: 'puff', obj: s, life: .45, maxLife: .45, grow: 1.8 });
    if (Math.random() > .35) {
      for (let i = 0; i < 3; i++) {
        const m = new THREE.Mesh(new THREE.SphereGeometry(.012, 3, 3), new THREE.MeshBasicMaterial({ color: 0xffcf7b }));
        m.position.copy(point); scene.add(m);
        state.effects.push({ kind: 'spark', obj: m, life: rand(.15, .3), maxLife: .3, vel: new THREE.Vector3(rand(-2, 2), rand(.3, 2.2), rand(-2, 2)) });
      }
    }
    if (state.decals.length > 90) { const old = state.decals.shift(); scene.remove(old); old.geometry.dispose(); old.material.dispose(); }
    const d = new THREE.Mesh(new THREE.CircleGeometry(rand(.028, .048), 6), new THREE.MeshBasicMaterial({ color: 0x221710, transparent: true, opacity: .8, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }));
    d.position.copy(point).addScaledVector(normal, .012);
    d.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal.clone().normalize());
    scene.add(d); state.decals.push(d);
  }
}
function addMuzzleLight(position) {
  const l = new THREE.PointLight(0xffb05a, 5, 7, 2); l.position.copy(position); scene.add(l);
  state.effects.push({ kind: 'light', obj: l, life: .06, maxLife: .06 });
}
function addDustBurst(pos) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: textures.dust, color: 0xd1ab7a, transparent: true, opacity: .35, depthWrite: false }));
  s.position.copy(pos); s.scale.set(.7, .25, 1); scene.add(s);
  state.effects.push({ kind: 'puff', obj: s, life: .34, maxLife: .34, grow: 2.4 });
}
function updateEffects(dt) {
  for (let i = state.effects.length - 1; i >= 0; i--) {
    const e = state.effects[i]; e.life -= dt;
    if (e.life <= 0) {
      if (e.kind === 'blood' || e.kind === 'spark') { scene.remove(e.obj); e.obj.geometry.dispose(); e.obj.material.dispose(); }
      else if (e.kind === 'puff') { scene.remove(e.obj); e.obj.material.dispose(); }
      else if (e.kind === 'tracer') { scene.remove(e.obj); e.obj.geometry.dispose(); e.obj.material.dispose(); }
      else if (e.kind === 'light') scene.remove(e.obj);
      state.effects.splice(i, 1); continue;
    }
    const a = e.life / e.maxLife;
    if (e.kind === 'tracer') e.obj.material.opacity = .9 * a;
    else if (e.kind === 'puff') {
      e.obj.material.opacity = (e.blood ? .55 : .6) * a;
      const s = 1 + (1 - a) * e.grow;
      e.obj.scale.set(.28 * s, .28 * s, 1);
    } else if (e.kind === 'blood' || e.kind === 'spark') {
      e.vel.y -= 8 * dt; e.obj.position.addScaledVector(e.vel, dt);
      e.obj.material.opacity = a;
      if (e.obj.position.y < .02) e.obj.position.y = .02;
    } else if (e.kind === 'light') e.obj.intensity = 5 * a;
  }
  for (let i = state.shells.length - 1; i >= 0; i--) {
    const s = state.shells[i]; s.life -= dt; s.vel.y -= 8 * dt; s.obj.position.addScaledVector(s.vel, dt); s.obj.rotation.x += dt * 15; s.obj.rotation.z += dt * 9;
    if (s.life <= 0) { viewScene.remove(s.obj); s.obj.geometry.dispose(); s.obj.material.dispose(); state.shells.splice(i, 1); }
  }
}

let toastTimer = 0;
function toast(text, time = 2.2) {
  dom.toast.textContent = text; dom.toast.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => dom.toast.classList.remove('show'), time * 1000);
}
function showBanner(kicker, title, sub, time = 3.6) {
  dom.rbKicker.textContent = kicker; dom.rbTitle.textContent = title; dom.rbSub.textContent = sub;
  dom.roundBanner.classList.remove('hidden');
  dom.roundBanner.style.animation = 'none'; void dom.roundBanner.offsetWidth; dom.roundBanner.style.animation = '';
  clearTimeout(state.bannerTimer);
  state.bannerTimer = setTimeout(() => dom.roundBanner.classList.add('hidden'), time * 1000);
}
function addKill(killer, victim, weapon, headshot, kTeam, vTeam) {
  const el = document.createElement('div'); el.className = 'kill-item';
  el.innerHTML = `<span class="${kTeam === 'ct' ? 'k-ct' : 'k-t'}">${killer}</span><span class="weapon-line"></span><span class="k-w">${weapon}${headshot ? ' // <b class="k-hs">HS</b>' : ''}</span><span class="weapon-line"></span><span class="${vTeam === 'ct' ? 'k-ct' : 'k-t'}">${victim}</span>`;
  dom.killfeed.appendChild(el);
  while (dom.killfeed.children.length > 5) dom.killfeed.firstChild.remove();
  setTimeout(() => el.remove(), 6500);
}
function showHitmarker(head = false) {
  dom.hitmarker.classList.remove('show'); dom.hitmarker.classList.toggle('head', head); void dom.hitmarker.offsetWidth; dom.hitmarker.classList.add('show');
}
function addDamageDir(from) {
  const dx = from.x - player.pos.x, dz = from.z - player.pos.z;
  const right = new THREE.Vector3(Math.cos(player.yaw), 0, -Math.sin(player.yaw));
  const forward = new THREE.Vector3(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
  const ang = Math.atan2(dx * right.x + dz * right.z, dx * forward.x + dz * forward.z);
  const el = document.createElement('div'); el.className = 'dmg-dir'; el.style.rotate = (-ang) + 'rad';
  dom.damageDirs.appendChild(el); setTimeout(() => el.remove(), 1000);
}
function screenFlash(color = '#fff', opacity = .55, ms = 120) {
  dom.flash.style.background = color; dom.flash.style.transition = 'none'; dom.flash.style.opacity = opacity;
  requestAnimationFrame(() => { dom.flash.style.transition = `opacity ${ms}ms ease`; dom.flash.style.opacity = 0; });
}
function updateVitals() {
  dom.health.textContent = Math.max(0, Math.round(player.hp));
  dom.healthFill.style.width = clamp(player.hp, 0, 100) + '%';
  dom.armor.textContent = Math.max(0, Math.round(player.armor));
  dom.money.textContent = '$' + player.money;
}
function damagePlayer(amount, from, attackerName = 'TERRORIST', weapon = 'AK-47') {
  if (!player.alive || state.mode !== 'playing') return;
  let dmg = amount;
  if (player.armor > 0) { player.armor = Math.max(0, player.armor - dmg * .46); dmg *= .56; }
  player.hp -= dmg; player.lastDamage = state.time;
  state.shake = Math.min(.5, state.shake + .12);
  dom.damageFlash.style.transition = 'none'; dom.damageFlash.style.opacity = .55;
  requestAnimationFrame(() => { dom.damageFlash.style.transition = 'opacity .55s'; dom.damageFlash.style.opacity = 0; });
  addDamageDir(from); audio.heart();
  if (player.hp <= 0) {
    player.hp = 0; player.alive = false; player.deaths++; player.deadAge = 0; player.firing = false; player.ads = false; player.scoped = false;
    player.rig.group.visible = false; dom.scope.classList.add('hidden'); dom.crosshair.classList.remove('hidden');
    addKill(attackerName, 'YOU', weapon, Math.random() > .85, 't', 'ct');
    pickSpectate(); dom.spectate.classList.remove('hidden');
    screenFlash('#3d0000', .38, 450); state.shake = .8;
  }
  updateVitals();
}
function applyDamageToBot(bot, amount, part, point, attacker = player) {
  if (!bot.alive) return;
  let dmg = amount;
  if (part === 'head') dmg *= WEAPONS[player.current]?.head || 1;
  if (part === 'limb') dmg *= .82;
  if (bot.armor > 0) { bot.armor = Math.max(0, bot.armor - dmg * .4); dmg *= .72; }
  bot.hp -= dmg;
  addImpact(point, point.clone().sub(attacker === player ? camera.position : bot.rig.group.position).normalize(), true);
  if (attacker === player) {
    player.hits++; if (part === 'head') player.headshots++;
    showHitmarker(part === 'head'); audio.hitmarker(part === 'head');
  }
  const attackerName = attacker === player ? 'M4A4' : (attacker.weapon === 'awp' ? 'AWP' : attacker.team === 't' ? 'AK-47' : 'M4A4');
  if (bot.hp <= 0) killBot(bot, attacker, attackerName, part === 'head');
  else { bot.alerted = true; bot.lastAttacker = attacker; bot.target = attacker; bot.targetPos = attacker.pos ? attacker.pos.clone() : point.clone(); bot.reaction = Math.min(bot.reaction, .18); }
}
function killBot(bot, attacker, weapon, headshot) {
  if (!bot.alive) return;
  bot.alive = false; bot.hp = 0; bot.deathAge = 0; bot.fireCooldown = 999; bot.rig.flash.visible = false;
  if (bot.isCarrier) transferBomb(bot);
  const isPlayer = attacker === player;
  addKill(isPlayer ? 'YOU' : (attacker.name || 'BOT'), bot.name, weapon, headshot, attacker.team || 'ct', bot.team);
  if (isPlayer) {
    player.kills++; player.money = Math.min(16000, player.money + (headshot ? 400 : 300));
    audio.kill(); showHitmarker(true);
    toast(headshot ? 'HEADSHOT // +$400' : '+$300 // ELIMINATED', 1.2);
  }
}
function pickSpectate() {
  const alive = state.bots.filter(b => b.alive && b.team === 'ct');
  state.spectateBot = alive[Math.floor(Math.random() * alive.length)] || null;
  if (state.spectateBot) dom.specName.textContent = state.spectateBot.name;
}

const CT_NAMES = ['SABLE', 'ROOK', 'VECTOR', 'ATLAS'];
const T_NAMES = ['REAPER', 'NOMAD', 'JACKAL', 'VIPER', 'GHOST'];
function clearBots() {
  for (const bot of state.bots) scene.remove(bot.rig.group);
  state.bots = []; state.spectateBot = null;
}
function createBot(team, name, pos, index) {
  const rig = createOperator(team);
  rig.group.position.copy(pos); rig.group.position.y = 0;
  const yaw = team === 'ct' ? Math.PI : 0;
  rig.group.rotation.y = yaw;
  scene.add(rig.group);
  const diff = DIFFICULTIES[difficultyIndex];
  const bot = {
    kind: 'bot', team, name, rig, pos: new THREE.Vector3(pos.x, 0, pos.z), hp: 100, armor: 35, alive: true,
    yaw, target: null, targetPos: new THREE.Vector3(), reaction: .4, fireCooldown: rand(.2, .8),
    burst: 0, path: [], pathIndex: 0, repath: 0, dest: new THREE.Vector3(pos.x, 0, pos.z), destStamp: 0,
    speed: rand(2.35, 2.95), skill: diff.skill + rand(-.065, .065), damage: diff.dmg, alerted: false,
    deathAge: 0, isCarrier: false, plantProgress: 0, defuseProgress: 0, defusing: false, roleSpot: null,
    strafe: rand(-1, 1), strafeTimer: rand(1, 2), lastAttacker: null, step: 0, moveAmount: 0,
    weapon: team === 't' ? (index === 4 ? 'awp' : 'ak') : (index === 3 ? 'awp' : 'm4'), reactionBase: diff.reaction
  };
  if (bot.weapon === 'awp') { bot.skill += .05; bot.fireCooldown = rand(.8, 1.4); }
  rig.group.userData.bot = bot;
  state.bots.push(bot);
  return bot;
}
function spawnTeams() {
  clearBots();
  const ctPos = world.spawns.ct;
  for (let i = 0; i < 4; i++) createBot('ct', CT_NAMES[i], ctPos[i + 1], i);
  const tPos = world.spawns.t;
  for (let i = 0; i < 5; i++) createBot('t', T_NAMES[i], tPos[i], i);
  const carriers = state.bots.filter(b => b.team === 't');
  const carrier = carriers[Math.floor(Math.random() * carriers.length)];
  if (carrier) carrier.isCarrier = true;
  state.tSite = world.sites[Math.random() > .5 ? 1 : 0];
  state.bombSite = state.tSite;
  let ai = 0;
  for (const bot of state.bots) {
    if (bot.team === 'ct') {
      const site = world.sites[ai++ % 2];
      bot.roleSpot = site.center.clone().add(new THREE.Vector3(rand(-4.5, 4.5), 0, rand(-4, 4)));
      bot.dest.copy(bot.roleSpot); bot.yaw = 0;
    } else {
      if (bot.isCarrier) bot.roleSpot = state.tSite.plant.clone();
      else bot.roleSpot = state.tSite.center.clone().add(new THREE.Vector3(rand(-5, 5), 0, rand(-3, 5)));
      bot.dest.copy(bot.roleSpot); bot.yaw = Math.PI;
    }
    bot.destStamp = 0; bot.path = []; bot.repath = 0;
  }
}
function transferBomb(deadBot) {
  if (state.bombPlanted) return;
  const candidates = state.bots.filter(b => b.team === 't' && b.alive);
  if (!candidates.length) return;
  let best = candidates[0], bd = Infinity;
  for (const b of candidates) { const d = b.pos.distanceToSquared(deadBot.pos); if (d < bd) { bd = d; best = b; } }
  best.isCarrier = true; best.roleSpot = state.tSite.plant.clone(); best.dest.copy(best.roleSpot); best.path = [];
}
function hasLOS(fromPos, toPos) {
  const origin = fromPos.clone(); origin.y = 1.5;
  const target = toPos.clone(); target.y = 1.15;
  const dir = target.clone().sub(origin); const dist = dir.length(); dir.normalize();
  const hit = world.raycast(origin, dir, dist + .2);
  return !hit || hit.distance > dist - .35;
}
function eyePos(entity) { return new THREE.Vector3(entity.pos.x, entity.alive ? 1.52 : .3, entity.pos.z); }
function chestPos(entity) { return new THREE.Vector3(entity.pos.x, entity.alive ? 1.15 : .4, entity.pos.z); }
function findEnemy(bot) {
  const candidates = [];
  if (player.alive && player.team !== bot.team) candidates.push(player);
  for (const b of state.bots) if (b.alive && b.team !== bot.team) candidates.push(b);
  let best = null, bestScore = Infinity;
  for (const e of candidates) {
    const d = bot.pos.distanceTo(e.pos);
    let score = d;
    if (e === bot.target && bot.alerted) score *= .6;
    if (score < bestScore && d < 65 && hasLOS(bot.pos, e.pos)) { bestScore = score; best = e; }
  }
  return best;
}
function lerpAngle(a, b, t) {
  let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}
function moveWithCollision(pos, dx, dz, radius = .32, height = 1.8) {
  let nx = pos.x + dx;
  for (const c of world.colliders) {
    if (c.top < .3 || c.bottom > height) continue;
    if (pos.z + radius > c.minZ && pos.z - radius < c.maxZ) {
      if (nx + radius > c.minX && nx - radius < c.maxX) nx = dx > 0 ? c.minX - radius : c.maxX + radius;
    }
  }
  nx = clamp(nx, -45.2, 45.2);
  let nz = pos.z + dz;
  for (const c of world.colliders) {
    if (c.top < .3 || c.bottom > height) continue;
    if (nx + radius > c.minX && nx - radius < c.maxX) {
      if (nz + radius > c.minZ && nz - radius < c.maxZ) nz = dz > 0 ? c.minZ - radius : c.maxZ + radius;
    }
  }
  nz = clamp(nz, -47.2, 47.2);
  pos.x = nx; pos.z = nz;
}
function pathTo(bot, dest) {
  if (!dest) return;
  if (bot.dest.distanceToSquared(dest) > 9 || bot.repath <= 0) {
    bot.dest.copy(dest); bot.destStamp = state.time;
    bot.path = world.nav.findPath(bot.pos.x, bot.pos.z, dest.x, dest.z);
    bot.pathIndex = 0; bot.repath = rand(1.2, 2.3);
  }
}
function followPath(bot, dt) {
  if (!bot.path.length || bot.pathIndex >= bot.path.length) return 0;
  let target = bot.path[bot.pathIndex];
  let dx = target.x - bot.pos.x, dz = target.z - bot.pos.z;
  let d = Math.hypot(dx, dz);
  if (d < .65) { bot.pathIndex++; if (bot.pathIndex >= bot.path.length) return 0; target = bot.path[bot.pathIndex]; dx = target.x - bot.pos.x; dz = target.z - bot.pos.z; d = Math.hypot(dx, dz); }
  if (d < .001) return 0;
  dx /= d; dz /= d;
  for (const b of state.bots) {
    if (b === bot || !b.alive) continue;
    const sx = bot.pos.x - b.pos.x, sz = bot.pos.z - b.pos.z, sd = Math.hypot(sx, sz);
    if (sd > 0 && sd < 1.0) { dx += (sx / sd) * .4; dz += (sz / sd) * .4; }
  }
  const nl = Math.hypot(dx, dz) || 1; dx /= nl; dz /= nl;
  const sp = bot.speed * dt;
  moveWithCollision(bot.pos, dx * sp, dz * sp, .32, 1.8);
  bot.yaw = lerpAngle(bot.yaw, Math.atan2(-dx, -dz), 1 - Math.exp(-8 * dt));
  return bot.speed;
}

function soundPan(pos) {
  if (!pos) return 0;
  const dx = pos.x - camera.position.x, dz = pos.z - camera.position.z;
  const right = new THREE.Vector3(Math.cos(player.yaw), 0, -Math.sin(player.yaw));
  const d = Math.hypot(dx, dz) || 1;
  return clamp((dx / d) * right.x + (dz / d) * right.z, -1, 1) * .78;
}
function botShoot(bot, target) {
  const muzzle = new THREE.Vector3(); bot.rig.muzzle.getWorldPosition(muzzle);
  const aim = chestPos(target).add(new THREE.Vector3(rand(-.25, .25), rand(-.2, .35), rand(-.25, .25)));
  const dir = aim.clone().sub(muzzle); const dist = dir.length(); dir.normalize();
  const moving = bot.moveAmount > .2;
  const spread = (1 - bot.skill) * .055 + (moving ? .018 : 0) + (bot.weapon === 'awp' ? -.008 : 0);
  dir.x += rand(-spread, spread); dir.y += rand(-spread, spread) * .7; dir.z += rand(-spread, spread);
  dir.normalize();
  const wall = world.raycast(muzzle, dir, 90);
  let best = wall ? wall.distance : 90, victim = null, part = 'body', hitPoint = muzzle.clone().addScaledVector(dir, best);
  for (const e of [player, ...state.bots]) {
    if (!e.alive || e.team === bot.team) continue;
    const ep = e.pos.clone(); ep.y = 1.1;
    const to = ep.clone().sub(muzzle); const along = to.dot(dir);
    if (along <= 0 || along > best) continue;
    const closest = muzzle.clone().addScaledVector(dir, along);
    if (closest.distanceTo(ep) < .42) { best = along; victim = e; part = rand() > .82 ? 'head' : 'body'; hitPoint = closest; }
  }
  const end = muzzle.clone().addScaledVector(dir, best);
  addTracer(muzzle, end, bot.team === 'ct' ? 0xaad8ff : 0xffb160, .07);
  addMuzzleLight(muzzle);
  bot.rig.flash.visible = true; bot.rig.flash.rotation.z = rand(0, 6); bot.rig.flash.scale.setScalar(rand(.5, .8));
  setTimeout(() => { if (bot.rig?.flash) bot.rig.flash.visible = false; }, 55);
  audio.gunshot(bot.weapon === 'awp' ? 'awp' : 'm4', muzzle.distanceTo(camera.position), soundPan(muzzle));
  if (victim) {
    let dmg = (bot.weapon === 'awp' ? 92 : rand(12, 21)) * bot.damage;
    if (part === 'head') dmg *= 2.1;
    if (victim === player) damagePlayer(dmg, muzzle, bot.name, bot.weapon === 'awp' ? 'AWP' : 'AK-47');
    else applyDamageToBot(victim, dmg, part, hitPoint, bot);
  } else if (wall) addImpact(wall.point, dir.clone().multiplyScalar(-1), false);
}
function updateBot(bot, dt) {
  if (!bot.alive) {
    bot.deathAge += dt;
    bot.rig.group.rotation.x = -Math.min(1.48, bot.deathAge * 3.6);
    bot.rig.group.position.y = Math.min(.1, bot.deathAge * .1);
    return;
  }
  bot.fireCooldown -= dt; bot.repath -= dt; bot.reaction -= dt; bot.strafeTimer -= dt;
  if (bot.strafeTimer <= 0) { bot.strafe = rand(-1, 1); bot.strafeTimer = rand(.9, 2.2); }
  if (state.phase === 'freeze') {
    bot.moveAmount = 0; animateOperator(bot.rig, dt, { speed: 0 }); return;
  }
  if (!bot.target || !bot.target.alive || !hasLOS(bot.pos, bot.target.pos) || bot.pos.distanceTo(bot.target.pos) > 58) {
    const found = findEnemy(bot);
    if (found && found !== bot.target) { bot.target = found; bot.reaction = bot.reactionBase + rand(0, .35); }
    else if (!found) bot.target = null;
  }
  const bombDefuseTarget = state.bombPlanted && bot.team === 'ct' && state.bomb;
  if (bot.isCarrier && !state.bombPlanted) {
    const d = bot.pos.distanceTo(state.tSite.plant);
    if (d < 2.2) {
      bot.plantProgress += dt; bot.moveAmount = 0;
      bot.yaw = lerpAngle(bot.yaw, Math.atan2(-(state.tSite.plant.x - bot.pos.x), -(state.tSite.plant.z - bot.pos.z)), dt * 4);
      bot.rig.group.rotation.y = bot.yaw;
      animateOperator(bot.rig, dt, { speed: 0, baseY: .04 });
      if (bot.plantProgress > 4.2) plantBomb(bot);
      return;
    }
  }
  if (bombDefuseTarget) {
    const d = bot.pos.distanceTo(state.bomb.pos);
    if (d < 2.2) {
      bot.defusing = true; bot.defuseProgress += dt; bot.moveAmount = 0;
      animateOperator(bot.rig, dt, { speed: 0, baseY: -.18 });
      if (bot.defuseProgress > 5) defuseBomb(bot);
      return;
    } else bot.defusing = false;
  }
  let moveSpeed = 0, desired = null;
  if (bot.target) {
    const dist = bot.pos.distanceTo(bot.target.pos);
    const aimPos = chestPos(bot.target);
    const toAim = aimPos.clone().sub(eyePos(bot));
    bot.yaw = lerpAngle(bot.yaw, Math.atan2(-toAim.x, -toAim.z), 1 - Math.exp(-7 * Math.max(.2, bot.skill) * dt));
    if (bot.reaction <= 0 && bot.fireCooldown <= 0 && hasLOS(bot.pos, bot.target.pos)) {
      botShoot(bot, bot.target);
      const sniper = bot.weapon === 'awp';
      bot.fireCooldown = sniper ? rand(1.7, 2.5) : rand(.13, .22);
      bot.burst++;
      if (bot.burst > (sniper ? 1 : 4)) { bot.burst = 0; bot.fireCooldown += rand(.45, 1.1); }
    }
    if (dist > 14) desired = bot.target.pos.clone();
    else if (dist < 4.5) {
      const away = bot.pos.clone().sub(bot.target.pos).normalize();
      desired = bot.pos.clone().addScaledVector(away, 2.6);
    } else {
      const right = new THREE.Vector3(Math.cos(bot.yaw), 0, -Math.sin(bot.yaw));
      desired = bot.pos.clone().addScaledVector(right, bot.strafe * 1.8);
    }
    if (desired) { pathTo(bot, desired); moveSpeed = followPath(bot, dt) * .72; }
  } else {
    let dest = null;
    if (state.bombPlanted) {
      if (bot.team === 'ct') dest = state.bomb.pos.clone();
      else dest = state.tSite.center.clone().add(new THREE.Vector3(rand(-4, 4), 0, rand(-3, 4)));
    } else if (bot.team === 't') {
      dest = bot.isCarrier ? state.tSite.plant.clone() : bot.roleSpot;
    } else dest = bot.roleSpot;
    if (dest) {
      if (bot.pos.distanceTo(dest) > 1.4) { pathTo(bot, dest); moveSpeed = followPath(bot, dt); }
      else bot.yaw = lerpAngle(bot.yaw, bot.team === 't' ? Math.PI : 0, dt * 2);
    }
  }
  bot.moveAmount = damp(bot.moveAmount, moveSpeed > .2 ? 1 : 0, 8, dt);
  bot.rig.group.rotation.y = bot.yaw;
  animateOperator(bot.rig, dt, { speed: moveSpeed });
  bot.rig.group.rotation.y = bot.yaw;
  if (moveSpeed > .2) {
    bot.step -= dt * moveSpeed;
    if (bot.step <= 0) { bot.step = 1.05; audio.footstep(true, soundPan(bot.pos)); }
  }
}

function plantBomb(bot) {
  if (state.bombPlanted || state.roundEnded) return;
  state.bombPlanted = true; state.bombTime = 40;
  state.bomb = { pos: state.tSite.plant.clone(), object: createBomb(), beep: 0, defuse: 0 };
  state.bomb.object.position.copy(state.tSite.plant); state.bomb.object.position.y = .18; state.bomb.object.rotation.y = rand(0, 6);
  scene.add(state.bomb.object);
  bot.isCarrier = false;
  showBanner('OBJECTIVE UPDATED', 'BOMB HAS BEEN PLANTED', 'DEFUSE THE DEVICE // 40 SECONDS', 3.2);
  toast('BOMB PLANTED AT SITE ' + state.tSite.id, 3);
  audio.beep(false);
  dom.objectiveText.textContent = 'DEVICE ARMED // DEFUSE THE BOMB';
  dom.bombTimer.classList.remove('hidden');
  for (const b of state.bots) if (b.team === 'ct') { b.roleSpot = state.bomb.pos.clone(); b.path = []; }
}
function defuseBomb(who) {
  if (!state.bombPlanted || state.roundEnded) return;
  state.bombPlanted = false;
  if (state.bomb) { scene.remove(state.bomb.object); state.bomb = null; }
  dom.bombTimer.classList.add('hidden');
  endRound('ct', who === player ? 'Bomb defused by you' : 'Bomb defused');
  audio.defused(); screenFlash('#a9d7ff', .18, 300);
}
function explodeBomb() {
  if (!state.bombPlanted || state.roundEnded) return;
  state.bombPlanted = false;
  const pos = state.bomb.pos.clone();
  if (state.bomb) { scene.remove(state.bomb.object); state.bomb = null; }
  dom.bombTimer.classList.add('hidden');
  const explosion = new THREE.PointLight(0xff7a24, 0, 60, 2); explosion.position.copy(pos); explosion.position.y = 2; scene.add(explosion);
  state.effects.push({ kind: 'light', obj: explosion, life: 1.2, maxLife: 1.2 });
  for (let i = 0; i < 14; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: textures.smoke, color: i % 2 ? 0x3b2a21 : 0xffb36a, transparent: true, opacity: .9, depthWrite: false, blending: i % 3 ? THREE.NormalBlending : THREE.AdditiveBlending }));
    s.position.copy(pos).add(new THREE.Vector3(rand(-3, 3), rand(.2, 3.5), rand(-3, 3))); s.scale.setScalar(rand(1, 4)); scene.add(s);
    state.effects.push({ kind: 'puff', obj: s, life: rand(.7, 1.6), maxLife: 1.6, grow: 2.8 });
  }
  audio.explosion(); screenFlash('#ffb15a', .8, 900); state.shake = 1.5;
  if (player.alive) damagePlayer(120, pos, 'THE DEVICE', 'C4');
  endRound('t', 'The device detonated');
}

function resetMatch() {
  state.round = 1; state.ctScore = 0; state.tScore = 0; state.roundEnded = false;
  player.kills = 0; player.deaths = 0; player.headshots = 0; player.shots = 0; player.hits = 0; player.money = 800;
  state.mode = 'playing'; state.matchLive = true;
}
function startMatch() {
  resetMatch();
  startRound();
  dom.matchOver.classList.add('hidden'); dom.paused.classList.add('hidden'); dom.spectate.classList.add('hidden'); dom.scope.classList.add('hidden');
  dom.hud.classList.remove('hidden'); dom.crosshair.classList.remove('hidden'); dom.menu.classList.add('hidden');
  document.body.classList.remove('menu-mode');
  state.dragging = false;
  if (!isTouch) requestPointerLock();
}
function startRound() {
  state.phase = 'freeze'; state.freeze = 4.0; state.roundTime = 105; state.roundEnded = false; state.roundEndTimer = 0;
  state.bombPlanted = false; state.bombTime = 0; state.bomb = null; state.tSite = null; state.bombSite = null;
  clearTimeout(state.bannerTimer); dom.roundBanner.classList.add('hidden'); dom.bombTimer.classList.add('hidden');
  dom.objectiveText.textContent = 'PREPARE FOR CONTACT'; dom.phaseLabel.textContent = 'BUY PHASE';
  dom.spectate.classList.add('hidden'); dom.scope.classList.add('hidden'); dom.crosshair.classList.remove('hidden');
  player.alive = true; player.hp = 100; player.armor = 100; player.pos.copy(world.spawns.ct[0]); player.vel.set(0, 0, 0);
  player.yaw = 0; player.pitch = -.03; player.recoilPitch = 0; player.recoilYaw = 0; player.crouch = false; player.sprint = false;
  player.firing = false; player.reloading = 0; player.ads = false; player.scoped = false; player.defusing = 0;
  player.deadAge = 0; player.jumpVel = 0; player.kickZ = 0; player.kickRot = 0;
  resetPlayerAmmo(); equipWeapon(player.primary); player.rig.group.visible = true;
  spawnTeams(); updateHud(true); dom.roundLabel.textContent = `ROUND ${state.round}`;
  showBanner(`ROUND ${state.round}`, 'COUNTER-TERRORISTS', `DEFEND SITE ${state.tSite.id} // ELIMINATE ALL HOSTILES`, 3.4);
  setTimeout(() => { if (state.phase === 'freeze' && state.mode === 'playing') audio.roundStart(); }, 700);
}
function endRound(winner, reason) {
  if (state.roundEnded || state.mode !== 'playing') return;
  state.roundEnded = true; state.phase = 'roundEnd'; state.roundEndTimer = 5.0;
  if (winner === 'ct') state.ctScore++; else state.tScore++;
  const playerWon = winner === 'ct';
  player.money = Math.min(16000, player.money + (playerWon ? 3250 : 1900));
  const title = winner === 'ct' ? 'COUNTER-TERRORISTS WIN' : 'TERRORISTS WIN';
  showBanner(`ROUND ${state.round} COMPLETE`, title, reason.toUpperCase(), 4.7);
  if (playerWon) audio.win(); else audio.lose();
  updateHud(true);
  if (state.bombPlanted) { state.bombPlanted = false; if (state.bomb) { scene.remove(state.bomb.object); state.bomb = null; } dom.bombTimer.classList.add('hidden'); }
  dom.phaseLabel.textContent = 'ROUND OVER';
}
function nextRound() {
  if (state.ctScore >= state.scoreToWin || state.tScore >= state.scoreToWin) { showMatchOver(); return; }
  state.round++; startRound();
}
function showMatchOver() {
  state.mode = 'over'; state.matchLive = false; state.roundEnded = true;
  document.exitPointerLock?.();
  const won = state.ctScore > state.tScore;
  dom.endKicker.textContent = 'OPERATION COMPLETE';
  dom.endTitle.textContent = won ? 'VICTORY' : 'DEFEAT';
  dom.endTitle.style.color = won ? '#ff9a3a' : '#ff5b48';
  dom.endSub.textContent = won ? 'Counter-Terrorists secured the operation.' : 'The terrorists completed their objective.';
  dom.endCt.textContent = state.ctScore; dom.endT.textContent = state.tScore;
  dom.endKills.textContent = player.kills; dom.endDeaths.textContent = player.deaths; dom.endHs.textContent = player.headshots;
  dom.endAcc.textContent = Math.round((player.hits / Math.max(1, player.shots)) * 100) + '%';
  dom.matchOver.classList.remove('hidden'); dom.hud.classList.add('hidden'); dom.scope.classList.add('hidden');
}
function quitToMenu() {
  state.mode = 'menu'; state.matchLive = false; state.roundEnded = false; clearTimeout(state.bannerTimer);
  dom.hud.classList.add('hidden'); dom.paused.classList.add('hidden'); dom.matchOver.classList.add('hidden'); dom.manual.classList.add('hidden');
  dom.spectate.classList.add('hidden'); dom.mobile.classList.add('hidden'); dom.scope.classList.add('hidden'); dom.roundBanner.classList.add('hidden');
  dom.menu.classList.remove('hidden'); dom.menu.style.opacity = ''; document.body.classList.add('menu-mode');
  if (player.rig) player.rig.group.visible = false;
  clearBots(); state.bomb = null; state.bombPlanted = false;
  if (document.pointerLockElement) document.exitPointerLock();
  camera.fov = 55; camera.updateProjectionMatrix(); state.phase = 'menu';
  toast('RETURNED TO OPERATIONS', 1.5);
}

const keys = {};
let mouseDown = false;
function requestPointerLock() {
  if (isTouch) return;
  try { const p = dom.canvas.requestPointerLock(); if (p?.catch) p.catch(() => {}); } catch {}
}
document.addEventListener('pointerlockchange', () => {
  state.pointerLocked = document.pointerLockElement === dom.canvas;
  if (!state.pointerLocked && state.mode === 'playing' && !state.roundEnded && !player.deadAge) {
    if (state.lockedFrames > 2) showPause();
  }
  if (state.pointerLocked) state.lockedFrames = 0;
});
document.addEventListener('mousemove', e => {
  if (state.mode !== 'playing' || !player.alive) return;
  if (!state.pointerLocked && !state.dragging) return;
  const sens = (parseFloat($('sens').value) || 1) * (player.scoped ? .35 : player.ads ? .72 : 1);
  player.yaw -= e.movementX * .0021 * sens;
  player.pitch -= e.movementY * .0021 * sens;
  player.pitch = clamp(player.pitch, -1.45, 1.35);
  player.swayX = clamp(player.swayX + e.movementX * .00012, -.018, .018);
  player.swayY = clamp(player.swayY + e.movementY * .00012, -.014, .014);
});
dom.canvas.addEventListener('mousedown', e => {
  if (state.mode !== 'playing' || !player.alive) return;
  if (document.pointerLockElement !== dom.canvas && !isTouch) state.dragging = true;
  if (e.button === 0) {
    if (isTouch) return;
    player.firing = true;
    if (!WEAPONS[player.current].auto) fireWeapon();
  } else if (e.button === 2) {
    player.ads = true;
    if (WEAPONS[player.current].zoom) { player.scoped = !player.scoped; dom.scope.classList.toggle('hidden', !player.scoped); dom.crosshair.classList.toggle('hidden', player.scoped); }
  }
});
window.addEventListener('mouseup', e => {
  state.dragging = false;
  if (e.button === 0) player.firing = false;
  if (e.button === 2) { player.ads = false; if (player.scoped) { player.scoped = false; dom.scope.classList.add('hidden'); dom.crosshair.classList.remove('hidden'); } }
});
dom.canvas.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('keydown', e => {
  keys[e.code] = true;
  if (e.code === 'Escape') { if (state.mode === 'playing' && !state.roundEnded) { if (document.pointerLockElement) document.exitPointerLock(); else showPause(); } }
  if (state.mode !== 'playing') return;
  if (e.code === 'KeyR') reload();
  if (e.code === 'Digit1') switchWeapon('primary');
  if (e.code === 'Digit2') switchWeapon('secondary');
  if (e.code === 'Digit3') switchWeapon('knife');
  if (e.code === 'Space' && player.ground && player.alive) { player.jumpVel = 5.4; player.ground = false; }
  if (e.code === 'KeyC') player.crouch = !player.crouch;
  if (e.code === 'KeyE') player.useHeld = true;
});
document.addEventListener('keyup', e => { keys[e.code] = false; if (e.code === 'KeyE') player.useHeld = false; });

function showPause() {
  if (state.mode !== 'playing' || state.roundEnded) return;
  dom.paused.classList.remove('hidden'); dom.mobile.classList.add('hidden');
  if (document.pointerLockElement) document.exitPointerLock();
}
function hidePause() {
  dom.paused.classList.add('hidden');
  if (state.mode === 'playing') { requestPointerLock(); if (isTouch) dom.mobile.classList.remove('hidden'); }
}
function reload() {
  if (!player.alive || state.mode !== 'playing') return;
  const w = WEAPONS[player.current], a = player.ammo[player.current];
  if (a.mag === Infinity || player.reloading > 0 || a.mag >= w.mag || a.reserve <= 0) return;
  player.reloading = w.reload; player.reloadTime = w.reload; player.firing = false;
  audio.reload(player.current === 'usp' ? 'pistol' : 'rifle'); toast('RELOADING', .8);
}
function finishReload() {
  const w = WEAPONS[player.current], a = player.ammo[player.current];
  const need = w.mag - a.mag, take = Math.min(need, a.reserve);
  a.mag += take; a.reserve -= take; updateAmmoDom();
}
function switchWeapon(slot) {
  if (state.mode !== 'playing' || !player.alive) return;
  if (slot === player.slot || player.reloading > 0) return;
  const id = slot === 'primary' ? player.primary : slot === 'secondary' ? player.secondary : 'knife';
  player.slot = slot; player.ads = false; player.scoped = false; dom.scope.classList.add('hidden'); dom.crosshair.classList.remove('hidden');
  equipWeapon(id); player.firing = false; audio.click(); updateAmmoDom();
}
function fireWeapon() {
  if (!player.alive || state.mode !== 'playing' || state.roundEnded || state.phase === 'freeze' || player.reloading > 0) return;
  const w = WEAPONS[player.current], a = player.ammo[player.current];
  if (player.fireCooldown > 0) return;
  if (!w.melee && a.mag <= 0) { audio.click(); toast('OUT OF AMMO // PRESS R', 1.2); return; }
  player.fireCooldown = 60 / w.rpm;
  if (!w.melee) { a.mag--; player.shots++; }
  player.shotBurst++;
  const dir = new THREE.Vector3(); camera.getWorldDirection(dir);
  const moveFactor = clamp(player.moveAmount, 0, 1);
  const spread = w.spread * (player.ads ? .3 : 1) * (player.crouch ? .68 : 1) * (1 + moveFactor * 1.4) * (1 + Math.min(10, player.shotBurst) * .032);
  dir.x += rand(-spread, spread); dir.y += rand(-spread, spread) * .7; dir.z += rand(-spread, spread);
  dir.normalize();
  const origin = camera.position.clone();
  const ray = new THREE.Raycaster(origin, dir, 0, w.melee ? w.melee : 200);
  const targets = [];
  for (const b of state.bots) if (b.alive) targets.push(...b.rig.hitTargets);
  targets.push(...world.solidMeshes);
  const hits = ray.intersectObjects(targets, true);
  const hit = hits[0];
  const muzzleWorld = new THREE.Vector3(origin.x + dir.x * .35, origin.y - .12 + dir.y * .35, origin.z + dir.z * .35);
  if (player.flash) {
    player.flash.visible = true; player.flash.scale.setScalar(rand(.75, 1.25)); player.flash.material.rotation = rand(0, 6); player.flashLight.intensity = 8;
    setTimeout(() => { if (player.flash) { player.flash.visible = false; player.flashLight.intensity = 0; } }, 45);
  }
  player.kickZ = Math.min(.16, player.kickZ + .055); player.kickRot = Math.min(.25, player.kickRot + w.kick * 1.5);
  player.recoilPitch += w.kick * rand(.82, 1.2); player.recoilYaw += w.kick * rand(-.4, .4);
  audio.gunshot(w.sound, 0, 0); state.shake = Math.min(.32, state.shake + (w.melee ? .03 : w.sound === 'awp' ? .2 : .045));
  if (!w.melee && player.rig) {
    const shell = new THREE.Mesh(new THREE.CylinderGeometry(.009, .009, .034, 6), new THREE.MeshStandardMaterial({ color: 0xc39c50, metalness: .9, roughness: .28 }));
    const p = new THREE.Vector3(); if (player.rig.ejectPos) p.copy(player.rig.ejectPos); player.rig.group.localToWorld(p);
    shell.position.copy(p); viewScene.add(shell);
    state.shells.push({ obj: shell, life: 1.1, vel: new THREE.Vector3(rand(1.3, 2.2), rand(.7, 1.4), rand(.3, 1.0)) });
  }
  if (!hit) { addTracer(muzzleWorld, origin.clone().addScaledVector(dir, 100), 0xffc77f); updateAmmoDom(); return; }
  const point = hit.point.clone();
  const owner = hit.object.userData.owner;
  if (owner) {
    const bot = owner.userData.bot;
    if (bot && bot.alive && bot.team !== player.team) {
      const part = hit.object.userData.hit || 'body';
      applyDamageToBot(bot, w.damage, part, point, player);
      addTracer(muzzleWorld, point, 0xffcf8a);
    } else addTracer(muzzleWorld, point, 0xffcf8a);
  } else {
    const normal = hit.face ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld) : dir.clone().negate();
    addImpact(point, normal, false); addTracer(muzzleWorld, point, 0xffcf8a);
  }
  updateAmmoDom();
}

function aliveCount(team) {
  let n = 0;
  if (team === 'ct' && player.alive) n++;
  for (const b of state.bots) if (b.alive && b.team === team) n++;
  return n;
}
function pips(el, count, total = 5) {
  el.innerHTML = '';
  for (let i = 0; i < total; i++) { const p = document.createElement('i'); if (i >= count) p.className = 'dead'; el.appendChild(p); }
}
function fmtTime(s) { s = Math.max(0, Math.ceil(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }
function updateHud(force = false) {
  const ctA = aliveCount('ct'), tA = aliveCount('t');
  dom.ctScore.textContent = state.ctScore; dom.tScore.textContent = state.tScore;
  if (force || state.lastHud.ctA !== ctA) { pips(dom.ctAlive, ctA); pips(dom.tAlive, tA); state.lastHud.ctA = ctA; state.lastHud.tA = tA; }
  dom.roundTime.textContent = fmtTime(state.bombPlanted ? state.bombTime : state.roundTime);
  dom.phaseLabel.textContent = state.phase === 'freeze' ? 'BUY PHASE' : state.phase === 'live' ? 'LIVE' : state.phase === 'roundEnd' ? 'ROUND OVER' : 'STANDBY';
  updateVitals(); updateAmmoDom();
  if (state.bombPlanted) {
    dom.bombTimer.textContent = fmtTime(state.bombTime); dom.bombTimer.classList.remove('hidden');
    dom.objectiveText.textContent = 'DEVICE ARMED // DEFUSE THE BOMB';
  } else {
    dom.bombTimer.classList.add('hidden');
    if (state.phase === 'freeze') dom.objectiveText.textContent = 'PREPARE FOR CONTACT';
    else if (state.phase === 'live') dom.objectiveText.textContent = 'ELIMINATE ALL HOSTILES OR DEFEND THE SITES';
    else dom.objectiveText.textContent = 'ROUND COMPLETE';
  }
  dom.crosshair.style.setProperty('--gap', (5 + clamp(player.moveAmount * 6 + player.kickZ * 25 + (player.ads ? -2 : 0), 0, 12)).toFixed(1) + 'px');
}
function updateRadar() {
  if (!radarBg) return;
  const ctx = dom.radar.getContext('2d'), S = 360, pad = 17, span = S - pad * 2;
  const sx = x => pad + ((x + 48) / 96) * span, sz = z => pad + ((z + 48) / 96) * span;
  ctx.clearRect(0, 0, S, S); ctx.drawImage(radarBg, 0, 0);
  if (state.bombPlanted && state.bomb) {
    const p = state.bomb.pos;
    ctx.save(); ctx.translate(sx(p.x), sz(p.z)); ctx.rotate(performance.now() * .003);
    ctx.fillStyle = Math.sin(performance.now() * .012) > 0 ? '#ff432e' : '#6d1b12'; ctx.fillRect(-4, -4, 8, 8); ctx.restore();
  }
  for (const b of state.bots) {
    if (!b.alive || b.team !== 'ct') continue;
    ctx.fillStyle = '#64b8ff'; ctx.beginPath(); ctx.arc(sx(b.pos.x), sz(b.pos.z), 3, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(100,184,255,.4)'; ctx.beginPath(); ctx.arc(sx(b.pos.x), sz(b.pos.z), 5, 0, 7); ctx.stroke();
  }
  for (const b of state.bots) {
    if (!b.alive || b.team !== 't') continue;
    const d = b.pos.distanceTo(player.pos);
    if (d < 13 || (d < 30 && hasLOS(player.pos, b.pos)) || state.bombPlanted) {
      ctx.fillStyle = '#ff5c47'; ctx.beginPath(); ctx.arc(sx(b.pos.x), sz(b.pos.z), 2.6, 0, 7); ctx.fill();
    }
  }
  const px = sx(player.pos.x), pz = sz(player.pos.z);
  ctx.save(); ctx.translate(px, pz); ctx.rotate(-player.yaw); ctx.fillStyle = '#ffd09a';
  ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(5.5, 6); ctx.lineTo(0, 3.2); ctx.lineTo(-5.5, 6); ctx.closePath(); ctx.fill(); ctx.restore();
  ctx.save(); ctx.translate(px, pz); ctx.rotate(-player.yaw); ctx.fillStyle = 'rgba(255,177,89,.07)';
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 34, -Math.PI / 2 - .5, -Math.PI / 2 + .5); ctx.closePath(); ctx.fill(); ctx.restore();
  dom.radarCoords.textContent = `N ${String(Math.round(player.pos.x)).padStart(2, '0')} // E ${String(Math.round(-player.pos.z)).padStart(2, '0')}`;
}

function setLoadout(key) {
  state.selectedPrimary = key;
  document.querySelectorAll('.loadout-card').forEach(c => c.classList.toggle('selected', c.dataset.weapon === key));
  const stats = { m4: [78, 86, 68], awp: [96, 24, 45], ak: [88, 74, 53] }[key];
  const bars = document.querySelectorAll('.weapon-stats .stat-bar i');
  bars.forEach((b, i) => b.style.width = stats[i] + '%');
  const names = { m4: 'M4A4', awp: 'AWP', ak: 'AK-47' };
  toast(`${names[key]} EQUIPPED // DEPLOY TO USE`, 1.6);
  audio.resume(); audio.click();
}
document.querySelectorAll('.loadout-card').forEach(card => card.addEventListener('click', () => setLoadout(card.dataset.weapon)));
document.querySelectorAll('.nav-item').forEach(n => n.addEventListener('click', () => {
  document.querySelectorAll('.nav-item').forEach(x => x.classList.remove('active')); n.classList.add('active');
  if (n.dataset.menu === 'play') toast('DEPLOYMENT READY', 1.2);
  else if (n.dataset.menu === 'armory') toast('ARMORY // SELECT A PRIMARY BELOW', 2);
  else toast('INTEL // DUST II REDUX // 5V5 DEFUSAL', 2);
  audio.resume(); audio.click();
}));
dom.difficulty.addEventListener('click', () => {
  difficultyIndex = (difficultyIndex + 1) % DIFFICULTIES.length;
  dom.difficultyLabel.textContent = DIFFICULTIES[difficultyIndex].name;
  audio.resume(); audio.click(); toast(`BOT DIFFICULTY // ${DIFFICULTIES[difficultyIndex].name}`, 1.5);
});
$('sens').addEventListener('input', e => { $('sens-val').textContent = parseFloat(e.target.value).toFixed(2); });
$('volume').addEventListener('input', e => { const v = parseFloat(e.target.value); $('vol-val').textContent = Math.round(v * 100) + '%'; audio.setVolume(v); });
dom.deploy.addEventListener('click', () => { audio.resume(); audio.click(); deployMatch(); });
dom.how.addEventListener('click', () => { audio.resume(); audio.click(); dom.manual.classList.remove('hidden'); dom.menu.style.opacity = '.25'; });
$('manual-close').addEventListener('click', () => { dom.manual.classList.add('hidden'); dom.menu.style.opacity = ''; audio.click(); });
$('resume-btn').addEventListener('click', hidePause);
$('restart-btn').addEventListener('click', () => { hidePause(); state.roundEnded = false; startRound(); });
$('quit-btn').addEventListener('click', quitToMenu);
$('menu-btn').addEventListener('click', quitToMenu);
$('again-btn').addEventListener('click', () => { audio.resume(); startMatch(); if (!isTouch) requestPointerLock(); });

function deployMatch() {
  dom.menu.style.transition = 'opacity .45s ease'; dom.menu.style.opacity = '0';
  setTimeout(() => { dom.menu.classList.add('hidden'); dom.menu.style.opacity = ''; dom.menu.style.transition = ''; }, 460);
  startMatch();
  if (isTouch) { dom.mobile.classList.remove('hidden'); dom.hud.classList.remove('hidden'); }
  setTimeout(() => { if (!isTouch) requestPointerLock(); }, 80);
}

let joystick = { active: false, x: 0, y: 0, id: null };
function setupMobile() {
  const mz = $('move-zone'), knob = $('stick-knob');
  const setStick = (x, y) => {
    const len = Math.hypot(x, y), max = 46;
    if (len > max) { x = x / len * max; y = y / len * max; }
    knob.style.transform = `translate(${x}px,${y}px)`; joystick.x = x / max; joystick.y = y / max;
  };
  mz.addEventListener('pointerdown', e => { joystick.active = true; joystick.id = e.pointerId; mz.setPointerCapture(e.pointerId); const r = mz.getBoundingClientRect(); setStick(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2)); });
  mz.addEventListener('pointermove', e => { if (!joystick.active || e.pointerId !== joystick.id) return; const r = mz.getBoundingClientRect(); setStick(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2)); });
  const endStick = e => { if (e.pointerId !== joystick.id) return; joystick.active = false; joystick.x = joystick.y = 0; knob.style.transform = 'translate(0,0)'; };
  mz.addEventListener('pointerup', endStick); mz.addEventListener('pointercancel', endStick);
  const lz = $('look-zone'); let look = null;
  lz.addEventListener('pointerdown', e => { look = { id: e.pointerId, x: e.clientX, y: e.clientY }; lz.setPointerCapture(e.pointerId); });
  lz.addEventListener('pointermove', e => {
    if (!look || e.pointerId !== look.id || !player.alive || state.mode !== 'playing') return;
    player.yaw -= (e.clientX - look.x) * .005; player.pitch = clamp(player.pitch - (e.clientY - look.y) * .0045, -1.4, 1.35);
    look.x = e.clientX; look.y = e.clientY;
  });
  lz.addEventListener('pointerup', e => { if (look?.id === e.pointerId) look = null; });
  $('mob-fire').addEventListener('pointerdown', e => { e.preventDefault(); player.firing = true; if (!WEAPONS[player.current].auto) fireWeapon(); });
  $('mob-fire').addEventListener('pointerup', () => { player.firing = false; });
  $('mob-aim').addEventListener('pointerdown', () => { player.ads = true; });
  $('mob-aim').addEventListener('pointerup', () => { player.ads = false; });
  $('mob-reload').addEventListener('click', reload);
  $('mob-jump').addEventListener('click', () => { if (player.ground && player.alive) { player.jumpVel = 5.4; player.ground = false; } });
  $('mob-use').addEventListener('pointerdown', () => { player.useHeld = true; });
  $('mob-use').addEventListener('pointerup', () => { player.useHeld = false; });
}
setupMobile();
document.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('gesturestart', e => e.preventDefault());
window.addEventListener('blur', () => { player.firing = false; for (const k in keys) keys[k] = false; });

function updatePlayer(dt) {
  if (!player.alive) { player.deadAge += dt; return; }
  player.fireCooldown -= dt;
  player.reloading -= dt;
  if (player.reloading <= 0 && player.reloadTime > 0) { player.reloadTime = 0; finishReload(); }
  player.drawTimer -= dt;
  player.kickZ = damp(player.kickZ, 0, 12, dt); player.kickRot = damp(player.kickRot, 0, 14, dt);
  player.recoilPitch = damp(player.recoilPitch, 0, 5.5, dt); player.recoilYaw = damp(player.recoilYaw, 0, 5.5, dt);
  player.swayX = damp(player.swayX, 0, 4, dt); player.swayY = damp(player.swayY, 0, 4, dt);
  if (state.phase === 'freeze' || state.roundEnded) { animateViewWeapon(dt, 0); updateCamera(dt); return; }
  let mx = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
  let mz = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0);
  if (isTouch) { mx += joystick.x; mz -= joystick.y; }
  const moving = Math.abs(mx) + Math.abs(mz) > .01;
  if (moving) { const l = Math.hypot(mx, mz); mx /= l; mz /= l; }
  const sprint = !!keys.ShiftLeft && !player.ads && !player.firing && !player.crouch;
  player.sprint = sprint;
  if (keys.KeyC && !player.crouchKeyPrev) { player.crouch = !player.crouch; }
  player.crouchKeyPrev = !!keys.KeyC;
  let speed = player.crouch ? 2.1 : sprint ? 6.2 : 4.45;
  if (player.ads) speed *= .62;
  if (player.reloading > 0) speed *= .8;
  const forward = new THREE.Vector3(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
  const right = new THREE.Vector3(Math.cos(player.yaw), 0, -Math.sin(player.yaw));
  const dir = forward.multiplyScalar(mz).add(right.multiplyScalar(mx));
  if (moving) {
    moveWithCollision(player.pos, dir.x * speed * dt, dir.z * speed * dt, .34, 1.8);
    player.step -= speed * dt;
    if (player.step <= 0) { player.step = sprint ? .42 : .58; audio.footstep(sprint, 0); if (sprint) addDustBurst(new THREE.Vector3(player.pos.x, .05, player.pos.z)); }
  }
  player.moveAmount = damp(player.moveAmount, moving ? (sprint ? 1 : .72) : 0, 9, dt);
  player.bob += dt * (moving ? speed * 1.35 : 1.1);
  if (!player.ground || player.jumpVel > 0) {
    player.jumpVel -= 16 * dt; player.pos.y += player.jumpVel * dt;
    if (player.pos.y <= 0) { player.pos.y = 0; if (player.jumpVel < -2) { player.landImpact = Math.min(.09, -player.jumpVel * .012); audio.footstep(true, 0); } player.jumpVel = 0; player.ground = true; }
  }
  player.landImpact = damp(player.landImpact, 0, 8, dt);
  if (player.firing && WEAPONS[player.current].auto) fireWeapon();
  updateDefuse(dt);
  animateViewWeapon(dt, moving ? player.moveAmount : 0);
  updateCamera(dt);
}
function updateCamera(dt) {
  if (!player.alive) { updateDeathCamera(dt); return; }
  const targetFov = player.scoped ? 30 : player.ads ? (player.current === 'awp' ? 42 : 55) : 72;
  camera.fov = damp(camera.fov, targetFov, 10, dt); camera.updateProjectionMatrix();
  const eye = player.eye - (player.crouch ? .34 : 0);
  const bobAmp = player.moveAmount * (player.ads ? .004 : .018);
  const bobY = Math.sin(player.bob) * bobAmp;
  const bobX = Math.cos(player.bob * .5) * bobAmp * .6;
  const shake = state.shake * (player.ads ? .5 : 1);
  state.shake = damp(state.shake, 0, 9, dt);
  const sx = (Math.random() - .5) * shake * .5, sy = (Math.random() - .5) * shake * .5;
  camera.position.set(player.pos.x + bobX + sx, player.pos.y + eye + bobY + sy, player.pos.z);
  const roll = -((keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0)) * .015 + Math.sin(player.bob * .5) * player.moveAmount * .004;
  camera.rotation.set(player.pitch + player.recoilPitch, player.yaw + player.recoilYaw, roll);
}
function updateDeathCamera(dt) {
  camera.fov = damp(camera.fov, 66, 5, dt); camera.updateProjectionMatrix();
  if (!state.spectateBot || !state.spectateBot.alive) pickSpectate();
  if (state.spectateBot) {
    const b = state.spectateBot;
    const dir = new THREE.Vector3(-Math.sin(b.yaw), 0, -Math.cos(b.yaw));
    const target = new THREE.Vector3(b.pos.x, 1.55, b.pos.z);
    const pos = target.clone().addScaledVector(dir, -3.4); pos.y = 2.5;
    camera.position.lerp(pos, 1 - Math.exp(-4 * dt));
    camera.lookAt(target);
  }
}
function updateDefuse(dt) {
  if (!state.bombPlanted || !state.bomb || !player.alive) { player.defusing = 0; dom.interact.classList.add('hidden'); return; }
  const dist = player.pos.distanceTo(state.bomb.pos);
  if (dist < 2.3 && !state.roundEnded) {
    dom.interact.classList.remove('hidden');
    const hold = keys.KeyE || player.useHeld;
    if (hold) {
      player.defusing += dt; dom.defuseFill.style.width = clamp(player.defusing / 5 * 100, 0, 100) + '%';
      if (Math.floor(player.defusing * 5) !== Math.floor((player.defusing - dt) * 5)) audio.defuseTick(player.defusing / 5);
      if (player.defusing >= 5) { player.defusing = 0; dom.interact.classList.add('hidden'); defuseBomb(player); }
    } else { player.defusing = Math.max(0, player.defusing - dt * 1.5); dom.defuseFill.style.width = (player.defusing / 5 * 100) + '%'; }
  } else { player.defusing = 0; dom.interact.classList.add('hidden'); }
}
function animateViewWeapon(dt, move) {
  if (!player.rig) return;
  const g = player.rig.group;
  const ads = player.ads || player.scoped;
  const target = ads ? (player.current === 'awp' ? new THREE.Vector3(0, -.155, -.39) : new THREE.Vector3(0, -.13, -.41)) : new THREE.Vector3(.31, -.275, -.52);
  g.position.x = damp(g.position.x, target.x + player.swayX, 13, dt);
  g.position.y = damp(g.position.y, target.y + player.swayY + Math.sin(player.bob) * move * .009, 13, dt);
  g.position.z = damp(g.position.z, target.z + player.kickZ * .55, 14, dt);
  const reloadAmt = player.reloading > 0 ? Math.sin(clamp(1 - player.reloading / (player.reloadTime || 1), 0, 1) * Math.PI) : 0;
  const drawAmt = Math.max(0, player.drawTimer) * 2.6;
  g.rotation.x = damp(g.rotation.x, .015 + player.kickRot * .5 - reloadAmt * .9 + drawAmt * .8 + (ads ? 0 : -.02), 11, dt);
  g.rotation.y = damp(g.rotation.y, -.035 - (ads ? 0 : .035) + player.swayX * 1.4, 10, dt);
  g.rotation.z = damp(g.rotation.z, .015 + player.kickRot * .18 + (move > .5 && player.sprint ? -.12 : 0) + reloadAmt * .25, 10, dt);
  g.visible = !player.scoped;
}

function updateMatch(dt) {
  if (state.mode !== 'playing') return;
  state.time += dt;
  if (state.phase === 'freeze') {
    state.freeze -= dt;
    if (state.freeze <= 0) {
      state.phase = 'live';
      if (!state.roundEnded) dom.phaseLabel.textContent = 'LIVE';
      dom.roundBanner.classList.add('hidden');
      dom.roundPop.classList.remove('hidden');
      setTimeout(() => dom.roundPop.classList.add('hidden'), 2700);
      audio.roundStart();
      for (const b of state.bots) { b.path = []; b.repath = 0; }
    }
  } else if (state.phase === 'live' && !state.roundEnded) {
    state.roundTime -= dt;
    if (state.bombPlanted) {
      state.bombTime -= dt;
      state.bomb.beep -= dt;
      const beepRate = state.bombTime < 10 ? .22 : state.bombTime < 20 ? .5 : 1.0;
      if (state.bomb.beep <= 0) { state.bomb.beep = beepRate; audio.beep(state.bombTime < 10); }
      const blink = Math.sin(performance.now() * (state.bombTime < 10 ? .025 : .012)) > 0;
      if (state.bomb.object.userData.led) state.bomb.object.userData.led.material.emissiveIntensity = blink ? 5 : .4;
      if (state.bomb.object.userData.ledLight) state.bomb.object.userData.ledLight.intensity = blink ? 2.2 : .15;
      if (state.bombTime <= 0) { explodeBomb(); return; }
    } else if (state.roundTime <= 0) { endRound('ct', 'Time expired'); return; }
    const ctA = aliveCount('ct'), tA = aliveCount('t');
    if (tA === 0 && !state.bombPlanted) { endRound('ct', 'Terrorists eliminated'); return; }
    if (ctA === 0) { endRound('t', state.bombPlanted ? 'No defusers remaining' : 'Counter-Terrorists eliminated'); return; }
    if (state.bombPlanted && ctA === 0) { endRound('t', 'No defusers remaining'); return; }
  }
  if (state.roundEnded) {
    state.roundEndTimer -= dt;
    if (state.roundEndTimer <= 0) { state.roundEndTimer = 999; nextRound(); return; }
  }
}

function drawMenuCamera(dt) {
  state.menuTime += dt;
  const t = state.menuTime;
  camera.fov = 55; camera.updateProjectionMatrix();
  const baseX = -26.2 + Math.sin(t * .11) * .55;
  const baseZ = -1.0 + Math.cos(t * .09) * .35;
  camera.position.set(baseX, 2.45 + Math.sin(t * .17) * .04, baseZ);
  camera.lookAt(-32.4, 1.25 + Math.sin(t * .21) * .03, -10.6);
  if (menuRig) {
    animateOperator(menuRig, dt, { speed: 0, idleLook: true });
    menuRig.group.rotation.y = -2.12 + Math.sin(t * .22) * .018;
    menuRig.head.rotation.z = Math.sin(t * .3) * .008;
  }
  if (menuRig2) animateOperator(menuRig2, dt, { speed: 0, idleLook: true });
}

let lastRadar = 0;
function render(now) {
  const dt = clamp((now - state.lastFrame) / 1000, .001, .05);
  state.lastFrame = now;
  state.fpsAcc += dt; state.fpsFrames++;
  if (state.fpsAcc > .5) { state.fps = Math.round(state.fpsFrames / state.fpsAcc); dom.fps.textContent = state.fps; state.fpsAcc = 0; state.fpsFrames = 0; }
  if (state.mode === 'menu') {
    drawMenuCamera(dt);
    world.update(state.menuTime, dt);
  } else if (state.mode === 'playing') {
    state.time += 0;
    if (state.lockedFrames < 1000) state.lockedFrames++;
    updatePlayer(dt);
    for (const bot of state.bots) updateBot(bot, dt);
    updateMatch(dt);
    updateEffects(dt);
    world.update(state.time, dt);
    if (now - lastRadar > 100) { updateRadar(); lastRadar = now; }
    updateHud();
    // target name lookup
    if (Math.floor(now / 220) !== state.lastTargetTick) {
      state.lastTargetTick = Math.floor(now / 220);
      const dir = new THREE.Vector3(); camera.getWorldDirection(dir);
      const ray = new THREE.Raycaster(camera.position, dir, 0, 60);
      const targets = []; for (const b of state.bots) if (b.alive) targets.push(...b.rig.hitTargets);
      const hits = ray.intersectObjects(targets, true);
      if (hits[0]?.object.userData.owner) {
        const b = hits[0].object.userData.owner.userData.bot;
        dom.targetName.textContent = b ? `${b.name} // ${hits[0].distance.toFixed(0)}M` : '';
        dom.targetName.style.opacity = b ? '1' : '0';
      } else dom.targetName.style.opacity = '0';
    }
  } else if (state.mode === 'over' || state.mode === 'paused') {
    world.update(state.time, dt);
    updateEffects(dt);
  }
  // composer render
  composer.render();
  if (state.mode === 'playing' && player.alive && state.phase !== 'roundEnd' && player.rig && !player.scoped) {
    renderer.clearDepth();
    renderer.render(viewScene, viewCamera);
  }
  requestAnimationFrame(render);
}

function onResize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.55));
  renderer.setSize(w, h);
  composer.setSize(w, h); bloom.setSize(w, h);
  camera.aspect = w / h; camera.updateProjectionMatrix();
  viewCamera.aspect = w / h; viewCamera.updateProjectionMatrix();
}
window.addEventListener('resize', onResize);

// ---------- BOOT ----------
function boot() {
  document.body.classList.add('menu-mode');
  const steps = ['INITIALIZING TACTICAL RENDERER', 'BAKING SANDSTONE SURFACES', 'DEPLOYING BOT AI', 'SYNCING OPERATIONS NETWORK'];
  let i = 0;
  const timer = setInterval(() => {
    i++;
    const pct = Math.min(100, Math.round(i / steps.length * 100));
    dom.bootStatus.textContent = steps[Math.min(steps.length - 1, i - 1)];
    dom.bootPct.textContent = pct + '%'; dom.bootFill.style.width = pct + '%';
    if (i >= steps.length) {
      clearInterval(timer);
      setTimeout(() => {
        dom.boot.classList.add('done');
        dom.menu.classList.remove('hidden');
        state.mode = 'menu';
        player.rig = null;
        camera.fov = 55; camera.updateProjectionMatrix();
        requestAnimationFrame(render);
      }, 350);
    }
  }, 170);
  setTimeout(() => { if (state.mode === 'menu') { dom.menu.classList.remove('hidden'); } }, 1200);
}
if (document.fonts?.ready) document.fonts.ready.then(boot); else boot();
