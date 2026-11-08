import * as THREE from 'three';

const shared = {
  black: new THREE.MeshStandardMaterial({ color: 0x171918, roughness: .44, metalness: .7 }),
  gunmetal: new THREE.MeshStandardMaterial({ color: 0x303534, roughness: .32, metalness: .9 }),
  steel: new THREE.MeshStandardMaterial({ color: 0x666a66, roughness: .28, metalness: .95 }),
  darkPoly: new THREE.MeshStandardMaterial({ color: 0x222521, roughness: .78, metalness: .12 }),
  tanPoly: new THREE.MeshStandardMaterial({ color: 0x8f7b57, roughness: .85, metalness: .05 }),
  wood: new THREE.MeshStandardMaterial({ color: 0x6e421f, roughness: .65, metalness: .04 }),
  woodDark: new THREE.MeshStandardMaterial({ color: 0x4e2c14, roughness: .7, metalness: .03 }),
  glove: new THREE.MeshStandardMaterial({ color: 0x242623, roughness: .92, metalness: .02 }),
  gloveTan: new THREE.MeshStandardMaterial({ color: 0x5b513c, roughness: .94, metalness: .01 }),
  sleeveCT: new THREE.MeshStandardMaterial({ color: 0x283544, roughness: .92, metalness: .02 }),
  sleeveT: new THREE.MeshStandardMaterial({ color: 0x4b4030, roughness: .94, metalness: .01 }),
  lens: new THREE.MeshStandardMaterial({ color: 0xd98127, roughness: .18, metalness: .45, emissive: 0x592100, emissiveIntensity: .8 }),
  red: new THREE.MeshStandardMaterial({ color: 0x8c1e15, roughness: .45, metalness: .2 }),
  c4: new THREE.MeshStandardMaterial({ color: 0x242921, roughness: .78, metalness: .18 }),
  c4label: new THREE.MeshStandardMaterial({ color: 0xd5c7a7, roughness: .95, metalness: 0 }),
  led: new THREE.MeshStandardMaterial({ color: 0xff2a18, emissive: 0xff1d0c, emissiveIntensity: 3, roughness: .2 }),
};

function box(parent, w, h, d, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z); m.rotation.set(rx, ry, rz);
  m.castShadow = true; m.receiveShadow = true;
  parent.add(m); return m;
}
function cyl(parent, r1, r2, h, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, seg = 12) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg), mat);
  m.position.set(x, y, z); m.rotation.set(rx, ry, rz);
  m.castShadow = true; m.receiveShadow = true;
  parent.add(m); return m;
}
function capsule(parent, radius, length, mat, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) {
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(radius, length, 4, 10), mat);
  m.position.set(x, y, z); m.scale.set(sx, sy, sz);
  m.castShadow = true; m.receiveShadow = true;
  parent.add(m); return m;
}

function addRail(parent, z0, z1, y, mat) {
  for (let z = z0; z < z1; z += .035) {
    box(parent, .046, .016, .021, mat, 0, y, z);
  }
}

export function createWorldRifle(team = 'ct') {
  const g = new THREE.Group();
  const metal = shared.gunmetal, poly = team === 'ct' ? shared.darkPoly : shared.tanPoly;
  box(g, .07, .085, .42, metal, 0, 0, 0);
  box(g, .055, .055, .34, poly, 0, .005, -.35);
  cyl(g, .012, .012, .42, shared.steel, 0, .008, -.73, Math.PI / 2);
  cyl(g, .023, .023, .08, shared.black, 0, .008, -.88, Math.PI / 2);
  box(g, .048, .15, .11, poly, 0, -.1, -.1, .24);
  box(g, .05, .19, .1, poly, 0, -.1, .13, -.18);
  box(g, .055, .16, .3, poly, 0, -.025, .32);
  box(g, .07, .026, .18, metal, 0, .057, -.03);
  box(g, .028, .055, .045, metal, 0, .09, -.25);
  box(g, .028, .05, .045, metal, 0, .085, .06);
  box(g, .038, .12, .07, metal, 0, -.11, .01, .22);
  box(g, .03, .02, .18, metal, 0, .058, -.58);
  const stock = box(g, .05, .13, .24, poly, 0, .01, .46); stock.rotation.x = -.03;
  return g;
}

export function createViewWeapon(type = 'm4') {
  const group = new THREE.Group();
  group.name = 'viewWeapon';
  const rig = { group, type, muzzlePos: new THREE.Vector3(), ejectPos: new THREE.Vector3(), sightY: 0 };
  let muzzle;

  if (type === 'm4' || type === 'ak') {
    const ak = type === 'ak';
    const bodyMat = ak ? shared.gunmetal : shared.gunmetal;
    const furn = ak ? shared.wood : shared.tanPoly;
    const metal = shared.black;

    // Lower + upper receiver. Local -Z points downrange.
    box(group, .105, .128, .43, bodyMat, 0, 0, -.01);
    box(group, .092, .09, .22, bodyMat, 0, .035, -.33);
    // rail
    box(group, .073, .023, .42, metal, 0, .087, -.04);
    addRail(group, -.2, .25, .104, shared.steel);

    // handguard with venting and heat shield
    if (ak) {
      box(group, .095, .1, .34, furn, 0, .005, -.54);
      box(group, .108, .035, .36, shared.woodDark, 0, -.035, -.54);
      for (let i = 0; i < 3; i++) box(group, .012, .024, .06, metal, .054, .02, -.65 + i * .09);
      box(group, .025, .025, .32, shared.steel, 0, .078, -.54);
    } else {
      box(group, .092, .093, .35, furn, 0, .005, -.53);
      box(group, .1, .022, .34, metal, 0, .067, -.53);
      // triangular cutout feel with dark strips
      for (let i = 0; i < 4; i++) box(group, .098, .009, .05, metal, 0, .018, -.42 - i * .075);
      for (let i = 0; i < 6; i++) box(group, .014, .016, .018, metal, .049, .073, -.38 - i * .035);
      box(group, .018, .11, .26, metal, 0, -.02, -.54);
    }
    // barrel, gas block, front sight
    cyl(group, .014, .014, .42, shared.steel, 0, .02, -.88, Math.PI / 2);
    if (ak) {
      cyl(group, .024, .024, .16, metal, 0, .02, -.95, Math.PI / 2);
      box(group, .05, .055, .04, metal, 0, .06, -.8);
      cyl(group, .027, .027, .13, metal, 0, .055, -1.0, Math.PI / 2);
      // AK iron sight ears
      box(group, .008, .05, .02, metal, -.022, .09, -.79);
      box(group, .008, .05, .02, metal, .022, .09, -.79);
    } else {
      box(group, .048, .042, .035, metal, 0, .073, -.78);
      box(group, .006, .06, .02, metal, -.019, .105, -.78);
      box(group, .006, .06, .02, metal, .019, .105, -.78);
      box(group, .012, .012, .26, metal, 0, .061, -.87);
    }
    // flash hider
    cyl(group, .022, .025, .075, metal, 0, .02, -1.08, Math.PI / 2, 0, 0, 8);
    for (let i = 0; i < 3; i++) box(group, .03, .007, .07, shared.steel, 0, .02 + (i - 1) * .018, -1.1, 0, 0, i * 1.1);

    // magazine (curved from segments)
    const mag = new THREE.Group(); mag.position.set(0, -.15, -.18); group.add(mag);
    const curve = ak ? -.36 : -.12;
    for (let i = 0; i < 4; i++) {
      const seg = box(mag, .08, .09, .075, furn, 0, -.045 * i, .018 * i + (i > 1 ? .012 : 0), curve * .1 * i);
      seg.rotation.x = curve * (i + 1) * .12;
    }
    if (!ak) {
      box(mag, .082, .012, .08, metal, 0, .01, -.02);
      for (let i = 0; i < 3; i++) box(mag, .086, .006, .08, furn, 0, -.05 - i * .035, .018 * i, -.04);
    }
    // pistol grip, trigger guard
    box(group, .07, .17, .09, furn, 0, -.15, .10, -.30);
    box(group, .012, .035, .12, metal, 0, -.095, .02);
    box(group, .013, .085, .018, metal, 0, -.075, .08);
    // stock
    if (ak) {
      box(group, .08, .12, .28, furn, 0, -.01, .39);
      box(group, .075, .17, .07, shared.woodDark, 0, -.02, .52);
      box(group, .06, .055, .14, metal, 0, .03, .26);
    } else {
      cyl(group, .033, .033, .21, metal, 0, .005, .3, Math.PI / 2);
      box(group, .075, .105, .22, shared.darkPoly, 0, -.01, .48);
      box(group, .086, .13, .035, shared.darkPoly, 0, -.015, .6);
      box(group, .062, .09, .13, shared.darkPoly, 0, -.02, .39);
    }
    // controls / details
    box(group, .012, .04, .095, shared.steel, .061, .035, -.03);
    box(group, .01, .045, .05, shared.steel, -.061, .025, -.04);
    cyl(group, .009, .009, .035, shared.steel, .063, .02, .11, 0, 0, Math.PI / 2);
    box(group, .028, .022, .046, metal, 0, .117, -.13);
    box(group, .032, .035, .035, metal, 0, .114, .28);
    // sling loop
    box(group, .008, .035, .018, shared.steel, .055, -.035, .56);
    // optics (small red dot) for visual
    box(group, .055, .04, .11, metal, 0, .13, -.08);
    box(group, .044, .03, .012, shared.lens, 0, .145, -.14);
    box(group, .034, .012, .012, shared.lens, 0, .145, -.02);

    muzzle = new THREE.Object3D(); muzzle.position.set(0, .02, -1.13); group.add(muzzle);
    rig.ejectPos.set(.07, .045, -.02);
    rig.sightY = .13;
  } else if (type === 'awp') {
    box(group, .095, .11, .62, new THREE.MeshStandardMaterial({ color: 0x4b5c43, roughness: .74 }), 0, 0, 0);
    box(group, .085, .07, .45, shared.gunmetal, 0, .07, -.36);
    cyl(group, .013, .013, .7, shared.steel, 0, .018, -.92, Math.PI / 2);
    cyl(group, .024, .026, .2, shared.black, 0, .018, -1.3, Math.PI / 2);
    // thumbhole stock
    box(group, .085, .16, .28, new THREE.MeshStandardMaterial({ color: 0x4b5c43, roughness: .74 }), 0, -.01, .42);
    box(group, .075, .19, .07, shared.darkPoly, 0, -.04, .58);
    box(group, .065, .17, .09, shared.darkPoly, 0, -.16, .2, .2);
    // big scope
    cyl(group, .046, .05, .38, shared.black, 0, .15, -.18, Math.PI / 2, 0, 0, 18);
    cyl(group, .056, .046, .09, shared.black, 0, .15, -.4, Math.PI / 2, 0, 0, 18);
    cyl(group, .044, .044, .07, shared.black, 0, .15, .03, Math.PI / 2, 0, 0, 18);
    cyl(group, .041, .041, .008, shared.lens, 0, .15, -.446, Math.PI / 2, 0, 0, 18);
    box(group, .05, .045, .09, shared.steel, 0, .095, -.1);
    // bolt handle
    cyl(group, .011, .011, .11, shared.steel, .09, .03, .05, 0, 0, 1.1);
    // magazine
    box(group, .075, .1, .12, shared.darkPoly, 0, -.1, -.08);
    // bipod hint
    box(group, .008, .14, .008, shared.steel, -.045, -.07, -.9, 0, 0, .18);
    box(group, .008, .14, .008, shared.steel, .045, -.07, -.9, 0, 0, -.18);
    muzzle = new THREE.Object3D(); muzzle.position.set(0, .018, -1.4); group.add(muzzle);
    rig.ejectPos.set(.08, .04, .0); rig.sightY = .15;
  } else if (type === 'usp') {
    box(group, .06, .075, .26, shared.gunmetal, 0, .03, 0);
    box(group, .055, .055, .23, shared.darkPoly, 0, -.01, .01);
    box(group, .06, .075, .1, shared.darkPoly, 0, -.1, .06, -.12);
    box(group, .016, .09, .08, shared.black, 0, .035, .15, -.2);
    cyl(group, .017, .017, .21, shared.steel, 0, .035, -.19, Math.PI / 2);
    cyl(group, .026, .026, .14, shared.black, 0, .035, -.26, Math.PI / 2);
    box(group, .035, .012, .035, shared.steel, 0, .078, .03);
    box(group, .03, .008, .025, shared.steel, 0, .083, .12);
    box(group, .01, .05, .07, shared.steel, 0, -.02, .03);
    box(group, .05, .02, .07, shared.darkPoly, 0, -.06, -.04);
    // suppressor silhouette markings
    for (let i = 0; i < 3; i++) cyl(group, .027, .027, .008, shared.gunmetal, 0, .035, -.21 - i * .045, Math.PI / 2, 0, 0, 16);
    muzzle = new THREE.Object3D(); muzzle.position.set(0, .035, -.34); group.add(muzzle);
    rig.ejectPos.set(.045, .055, .06); rig.sightY = .08;
  } else {
    // knife
    const blade = new THREE.Mesh(new THREE.CylinderGeometry(.003, .037, .34, 3), shared.steel);
    blade.rotation.z = Math.PI / 2; blade.rotation.y = Math.PI / 2; blade.position.set(0, .06, -.32);
    blade.castShadow = true; group.add(blade);
    box(group, .04, .075, .24, shared.glove, 0, 0, -.02);
    box(group, .085, .02, .07, shared.steel, 0, .01, -.18);
    muzzle = new THREE.Object3D(); muzzle.position.set(0, .06, -.52); group.add(muzzle);
    rig.ejectPos.set(0, 0, 0); rig.sightY = 0;
  }

  // Arms and gloves wrapping the weapon.
  const armMat = shared.sleeveCT;
  const gloveMat = shared.glove;
  const rightShoulder = new THREE.Object3D(); rightShoulder.position.set(.2, -.31, .3); group.add(rightShoulder);
  const rArm = capsule(rightShoulder, .06, .3, armMat, 0, -.03, .02, 1, 1, 1.2);
  rArm.rotation.set(1.0, -.2, -.08);
  const rGlove = box(group, .085, .11, .12, gloveMat, .045, -.155, .055, -.2, .06, -.15);
  // trigger hand fingers
  for (let i = 0; i < 3; i++) box(group, .022, .017, .055, gloveMat, .076, -.14 + i * .015, .015 + i * .009, 0, 0, -.1);
  const leftShoulder = new THREE.Object3D(); leftShoulder.position.set(-.25, -.38, -.52); group.add(leftShoulder);
  const lArm = capsule(leftShoulder, .065, .34, armMat, 0, -.03, .12, 1.1, 1, 1.1);
  lArm.rotation.set(1.15, .22, .2);
  box(group, .095, .12, .14, gloveMat, -.08, -.15, -.55, -.3, .1, .16);
  for (let i = 0; i < 3; i++) box(group, .02, .04, .05, gloveMat, -.11, -.13 + i * .02, -.57, 0, -.2, .2);
  // watch / wrist detail
  box(group, .075, .015, .03, shared.steel, -.115, -.2, -.44, 0, .2, 0);

  // small markings
  box(group, .012, .012, .12, shared.steel, .054, .012, -.08);
  rig.muzzle = muzzle;
  group.userData.rig = rig;
  group.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; o.frustumCulled = false; } });
  return rig;
}

export function createMuzzleFlash() {
  const tex = makeMuzzleSprite();
  const mat = new THREE.SpriteMaterial({ map: tex, color: 0xffe0a0, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(.5, .5, 1);
  sprite.visible = false;
  return sprite;
}

function makeMuzzleSprite() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const ctx = c.getContext('2d'); ctx.translate(64, 64);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 62);
  g.addColorStop(0, 'rgba(255,255,245,1)'); g.addColorStop(.18, 'rgba(255,239,176,.98)'); g.addColorStop(.48, 'rgba(255,136,32,.52)'); g.addColorStop(1, 'rgba(255,80,5,0)');
  ctx.fillStyle = g; ctx.fillRect(-64, -64, 128, 128);
  ctx.fillStyle = 'rgba(255,249,221,.95)';
  for (let i = 0; i < 8; i++) { ctx.rotate(Math.PI / 4); ctx.beginPath(); ctx.moveTo(-5, -3); ctx.lineTo(0, -56 - (i % 3) * 9); ctx.lineTo(5, -3); ctx.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function createOperator(team = 'ct', opts = {}) {
  const g = new THREE.Group();
  const ct = team === 'ct';
  const uniform = new THREE.MeshStandardMaterial({ color: ct ? 0x27313b : 0x413a2c, roughness: .94, metalness: .01 });
  const uniform2 = new THREE.MeshStandardMaterial({ color: ct ? 0x1a222c : 0x2e2a20, roughness: .9, metalness: .03 });
  const vestMat = new THREE.MeshStandardMaterial({ color: ct ? 0x232b30 : 0x373126, roughness: .8, metalness: .12 });
  const gearMat = new THREE.MeshStandardMaterial({ color: ct ? 0x11171c : 0x201d17, roughness: .76, metalness: .08 });
  const accent = new THREE.MeshStandardMaterial({ color: ct ? 0x3c8fc7 : 0xa66e2d, roughness: .6, metalness: .12, emissive: ct ? 0x0b1c2c : 0x211306, emissiveIntensity: .6 });
  const skin = new THREE.MeshStandardMaterial({ color: 0x9b7254, roughness: .87, metalness: 0 });
  const glove = shared.glove;
  const boot = new THREE.MeshStandardMaterial({ color: 0x181715, roughness: .9, metalness: .06 });
  const gunMat = new THREE.MeshStandardMaterial({ color: 0x1d201e, roughness: .38, metalness: .8 });

  const rig = { group: g, team, legs: [], arms: [], head: null, torso: null, gun: null, flash: null, speed: 0, cycle: 0 };
  // hips / legs
  const hips = new THREE.Group(); hips.position.y = .95; g.add(hips);
  for (const s of [-1, 1]) {
    const leg = new THREE.Group(); leg.position.set(s * .145, 0, 0); hips.add(leg);
    capsule(leg, .103, .33, uniform, 0, -.2, 0, 1.1, 1.2, 1.1);
    const knee = new THREE.Group(); knee.position.y = -.43; leg.add(knee);
    capsule(knee, .084, .3, uniform2, 0, -.21, 0, 1.03, 1.2, 1.05);
    box(knee, .16, .14, .27, boot, 0, -.42, -.035);
    box(knee, .165, .05, .3, shared.black, 0, -.49, -.05);
    box(knee, .17, .04, .12, boot, 0, -.38, .1);
    // knee pad
    box(leg, .125, .13, .05, gearMat, 0, -.4, -.085, .1);
    rig.legs.push({ upper: leg, lower: knee, side: s });
  }
  // torso
  const torso = new THREE.Group(); torso.position.y = 1.02; g.add(torso); rig.torso = torso;
  const chest = capsule(torso, .29, .48, uniform, 0, .28, 0, 1.15, 1, .74);
  box(torso, .46, .47, .3, vestMat, 0, .3, 0);
  // plate carrier panels
  box(torso, .34, .27, .055, gearMat, 0, .33, -.17);
  box(torso, .36, .18, .05, gearMat, 0, .33, .17);
  for (let i = 0; i < 3; i++) {
    box(torso, .08, .12, .075, gearMat, -.095 + i * .095, .28, -.2);
    box(torso, .07, .025, .085, vestMat, -.095 + i * .095, .33, -.205);
  }
  box(torso, .22, .075, .08, gearMat, 0, .45, -.18);
  for (let i = 0; i < 4; i++) box(torso, .025, .075, .03, shared.tanPoly, -.075 + i * .05, .45, -.225);
  // belt pouches
  for (let i = -1; i <= 1; i++) box(torso, .11, .12, .08, gearMat, i * .15, .075, -.16);
  // shoulder patches
  box(torso, .11, .07, .015, accent, .255, .43, -.02);
  box(torso, .09, .03, .012, accent, .26, .43, -.03);
  // radio on back and backpack
  box(torso, .2, .25, .12, gearMat, -.12, .38, .2);
  cyl(torso, .008, .008, .2, shared.black, -.05, .57, .24, .2);
  // neck and head
  cyl(torso, .07, .08, .12, skin, 0, .61, 0, 0, 0, 0, 8);
  const head = new THREE.Group(); head.position.set(0, .67, 0); torso.add(head); rig.head = head;
  const face = capsule(head, .14, .09, skin, 0, .08, -.01, 1, 1.05, .92);
  // balaclava
  const bala = new THREE.MeshStandardMaterial({ color: ct ? 0x171b1f : 0x2d2920, roughness: .97 });
  capsule(head, .145, .12, bala, 0, .11, .01, 1, 1.08, .94);
  box(head, .24, .13, .13, bala, 0, .07, .065);
  // goggles
  box(head, .245, .075, .055, gearMat, 0, .15, -.1);
  box(head, .195, .045, .012, shared.lens, 0, .152, -.133);
  box(head, .02, .06, .02, gearMat, 0, .15, -.15);
  // helmet
  const helmetMat = new THREE.MeshStandardMaterial({ color: ct ? 0x2d3941 : 0x4b4230, roughness: .72, metalness: .12 });
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(.19, 14, 9, 0, Math.PI * 2, 0, Math.PI * .58), helmetMat);
  helmet.position.set(0, .18, .015); helmet.scale.set(1.05, 1.12, 1.12); helmet.castShadow = true; head.add(helmet);
  const brim = box(head, .24, .025, .11, gearMat, 0, .18, -.14, -.08);
  // headset ear cups
  for (const s of [-1, 1]) {
    cyl(head, .05, .05, .035, gearMat, s * .15, .13, .02, 0, 0, Math.PI / 2, 10);
    box(head, .018, .12, .018, shared.black, s * .155, .06, .03);
  }
  // mic boom
  cyl(head, .007, .007, .16, shared.black, .1, .06, -.12, .55, .12, 0, 6);
  // arms
  for (const s of [-1, 1]) {
    const arm = new THREE.Group(); arm.position.set(s * .33, .47, 0); torso.add(arm);
    capsule(arm, .082, .29, uniform, 0, -.18, 0, 1, 1.1, 1);
    const elbow = new THREE.Group(); elbow.position.y = -.34; arm.add(elbow);
    capsule(elbow, .065, .27, uniform2, 0, -.16, 0, 1, 1.1, 1);
    box(elbow, .095, .13, .1, glove, 0, -.34, -.03);
    // elbow pad
    box(arm, .13, .12, .04, gearMat, 0, -.3, .065);
    rig.arms.push({ upper: arm, lower: elbow, side: s });
  }
  // right arm holds gun, left supports
  const gun = createWorldRifle(team); gun.position.set(.02, .43, -.36); gun.rotation.set(-.08, 0, 0); torso.add(gun); rig.gun = gun;
  const muzzle = new THREE.Object3D(); muzzle.position.set(0, .02, -1.15); gun.add(muzzle); rig.muzzle = muzzle;
  const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: makeMuzzleSprite(), color: 0xffd68a, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  flash.scale.set(.35, .35, 1); flash.position.copy(muzzle.position); flash.visible = false; gun.add(flash); rig.flash = flash;
  // pose arms toward gun
  rig.arms[1].upper.rotation.set(-1.15, -.15, -.2);
  rig.arms[1].lower.rotation.set(-.85, 0, .15);
  rig.arms[0].upper.rotation.set(-1.25, .2, .22);
  rig.arms[0].lower.rotation.set(-.7, 0, -.25);
  // assign hit volumes
  const hitTargets = [];
  const mark = (obj, part) => { obj.traverse(o => { if (o.isMesh) { o.userData.hit = part; o.userData.owner = g; hitTargets.push(o); } }); };
  mark(torso, 'body');
  mark(head, 'head');
  g.traverse(o => { if (o.isMesh && !o.userData.hit) { o.userData.hit = 'limb'; o.userData.owner = g; hitTargets.push(o); } });
  rig.hitTargets = hitTargets;
  g.userData.rig = rig;
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  if (opts.scale) g.scale.setScalar(opts.scale);
  return rig;
}

export function animateOperator(rig, dt, opts = {}) {
  const speed = opts.speed || 0;
  const moving = speed > .15;
  rig.cycle += dt * (moving ? (4.1 + speed * .75) : 1.45);
  const amp = moving ? Math.min(.8, .18 + speed * .13) : .025;
  const swing = Math.sin(rig.cycle) * amp;
  rig.legs[0].upper.rotation.x = swing;
  rig.legs[1].upper.rotation.x = -swing;
  rig.legs[0].lower.rotation.x = Math.max(0, -swing) * .7;
  rig.legs[1].lower.rotation.x = Math.max(0, swing) * .7;
  const bob = Math.abs(Math.sin(rig.cycle)) * (moving ? .025 : .006);
  rig.group.position.y = (opts.baseY ?? 0) + bob;
  if (rig.torso) rig.torso.rotation.z = Math.sin(rig.cycle * .5) * .012;
  if (rig.head) rig.head.rotation.y = Math.sin(rig.cycle * .32) * .04;
  if (opts.idleLook) rig.head.rotation.y += Math.sin(performance.now() * .0004) * .06;
}

export function createBomb() {
  const g = new THREE.Group();
  box(g, .34, .16, .23, shared.c4, 0, 0, 0);
  box(g, .3, .12, .2, new THREE.MeshStandardMaterial({ color: 0x3b3d32, roughness: .8 }), 0, .02, 0);
  box(g, .24, .055, .17, shared.c4label, 0, .115, 0);
  // screen
  box(g, .13, .075, .015, new THREE.MeshStandardMaterial({ color: 0x06100b, roughness: .3, emissive: 0x071a10, emissiveIntensity: .6 }), 0, .09, .12);
  box(g, .08, .036, .005, new THREE.MeshStandardMaterial({ color: 0xff3423, emissive: 0xff2414, emissiveIntensity: 3 }), 0, .09, .13);
  // wires
  for (const [c, x] of [[0xd12b1d, -.11], [0xe0bf32, -.05], [0x2a60bc, .02], [0xd8d0b8, .08]]) {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(x, .16, -.02), new THREE.Vector3(x + .05, .24, .01), new THREE.Vector3(x - .03, .3, -.03), new THREE.Vector3(x + .02, .32, .02)
    ]);
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 8, .006, 5, false), new THREE.MeshStandardMaterial({ color: c, roughness: .7 }));
    tube.castShadow = true; g.add(tube);
  }
  // detonator / keypad
  box(g, .1, .085, .05, shared.darkPoly, .13, .02, .09);
  box(g, .07, .04, .01, shared.steel, .13, .02, .12);
  for (let i = 0; i < 4; i++) box(g, .012, .012, .008, shared.steel, .105 + (i % 2) * .03, .01 - Math.floor(i / 2) * .022, .143);
  const led = box(g, .03, .03, .02, shared.led, -.13, .09, .11);
  led.material = shared.led.clone();
  const ledLight = new THREE.PointLight(0xff2a18, 1.4, 3, 2); ledLight.position.set(-.13, .14, .2); g.add(ledLight);
  g.userData.led = led; g.userData.ledLight = ledLight;
  g.scale.setScalar(1.2);
  return g;
}

export function createDroppedWeapon(type) {
  const g = createWorldRifle('ct');
  g.scale.setScalar(1.2);
  return g;
}

export function disposeObject(obj) {
  obj.traverse(o => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) {
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) { for (const k of Object.keys(m)) { const v = m[k]; if (v?.isTexture) v.dispose(); } m.dispose(); }
    }
  });
}
