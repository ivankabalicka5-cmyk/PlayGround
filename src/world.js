import * as THREE from 'three';

const PI = Math.PI;

function hash(x, z) {
  const n = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

export function createWorld(scene, T) {
  const group = new THREE.Group();
  group.name = 'dustWorld';
  scene.add(group);
  const colliders = [];
  const solidMeshes = [];
  const details = { palms: [], banners: [], lamps: [], cloths: [], particles: [] };

  const baseStone = new THREE.MeshStandardMaterial({ map: T.sandstone.map, bumpMap: T.sandstone.bump, bumpScale: .055, roughness: .96, metalness: .02, color: 0xd8b88e });
  const basePlaster = new THREE.MeshStandardMaterial({ map: T.plaster.map, bumpMap: T.plaster.bump, bumpScale: .04, roughness: .98, metalness: .01, color: 0xd9c2a0 });
  const stoneMats = new Map(), plasterMats = new Map();
  function tiled(base, cache, w, d, tint) {
    const r = Math.max(1, Math.round(Math.max(w, d) / 5));
    const key = r + ':' + (tint || '');
    if (cache.has(key)) return cache.get(key);
    const m = base.clone();
    m.map = base.map.clone(); m.bumpMap = base.bumpMap.clone();
    m.map.repeat.set(r, r); m.bumpMap.repeat.set(r, r);
    m.map.needsUpdate = m.bumpMap.needsUpdate = true;
    if (tint) m.color.set(tint);
    cache.set(key, m); return m;
  }

  const M = {
    stone: (w, d, tint) => tiled(baseStone, stoneMats, w, d, tint),
    plaster: (w, d, tint) => tiled(basePlaster, plasterMats, w, d, tint),
    trim: new THREE.MeshStandardMaterial({ color: 0x9e7a4f, roughness: .92, metalness: .02 }),
    trimDark: new THREE.MeshStandardMaterial({ color: 0x715331, roughness: .95 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x1b1a16, roughness: .9 }),
    wood: new THREE.MeshStandardMaterial({ map: T.crate.map, bumpMap: T.crate.bump, bumpScale: .05, roughness: .88, metalness: .02 }),
    woodDark: new THREE.MeshStandardMaterial({ color: 0x4e321b, roughness: .88 }),
    metal: new THREE.MeshStandardMaterial({ map: T.metal, roughness: .48, metalness: .75, color: 0x8d918d }),
    rust: new THREE.MeshStandardMaterial({ map: T.metal, roughness: .76, metalness: .5, color: 0x9f7352 }),
    blackMetal: new THREE.MeshStandardMaterial({ map: T.darkMetal, roughness: .44, metalness: .82, color: 0x6e7471 }),
    canvas: new THREE.MeshStandardMaterial({ map: T.cloth, roughness: .95, metalness: 0, side: THREE.DoubleSide }),
    canvasPlain: new THREE.MeshStandardMaterial({ color: 0xa98d64, roughness: 1, side: THREE.DoubleSide }),
    rope: new THREE.MeshStandardMaterial({ color: 0x7f6644, roughness: 1 }),
    leaves: new THREE.MeshStandardMaterial({ color: 0x516c35, roughness: .84, side: THREE.DoubleSide }),
    leavesDry: new THREE.MeshStandardMaterial({ color: 0x78854b, roughness: .9, side: THREE.DoubleSide }),
    trunk: new THREE.MeshStandardMaterial({ color: 0x665036, roughness: 1 }),
    sandbag: new THREE.MeshStandardMaterial({ color: 0x9c855c, roughness: 1 }),
    pot: new THREE.MeshStandardMaterial({ color: 0x9c5d3b, roughness: .92 }),
    paintA: new THREE.MeshStandardMaterial({ color: 0xd99147, roughness: .9, transparent: true, opacity: .65 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x18232b, roughness: .28, metalness: .35 }),
    lamp: new THREE.MeshStandardMaterial({ color: 0xffddaa, emissive: 0xffa54f, emissiveIntensity: 1.7, roughness: .5 }),
  };

  function box(x, z, w, d, h, mat, opts = {}) {
    const y = opts.y ?? h / 2;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    if (opts.ry) mesh.rotation.y = opts.ry;
    mesh.castShadow = opts.castShadow !== false;
    mesh.receiveShadow = true;
    mesh.userData.solid = true;
    group.add(mesh);
    if (opts.collide !== false) {
      colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, bottom: opts.bottom ?? 0, top: (opts.bottom ?? 0) + h, mesh });
      solidMeshes.push(mesh);
    }
    return mesh;
  }

  function wall(x, z, w, d, h, opts = {}) {
    const mat = opts.plaster ? M.plaster(w, d, opts.tint) : M.stone(w, d, opts.tint);
    const m = box(x, z, w, d, h, mat, opts);
    // base skirt
    if (opts.trim !== false) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(w + .12, .32, d + .12), M.trimDark);
      b.position.set(x, .16, z); b.receiveShadow = true; b.castShadow = true; group.add(b);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(w + .18, .14, d + .18), M.trim);
      cap.position.set(x, h + .07, z); cap.castShadow = true; cap.receiveShadow = true; group.add(cap);
    }
    return m;
  }

  function crenellations(x, z, w, d, h, horizontal = true) {
    const count = Math.floor((horizontal ? w : d) / 1.7);
    for (let i = 0; i < count; i++) {
      const o = -((horizontal ? w : d) / 2) + 1 + i * ((horizontal ? w : d) - 2) / Math.max(1, count - 1);
      const m = new THREE.Mesh(new THREE.BoxGeometry(horizontal ? .9 : d + .08, .65, horizontal ? d + .08 : .9), M.stone(1, 1));
      m.position.set(x + (horizontal ? o : 0), h + .32, z + (horizontal ? 0 : o));
      m.castShadow = m.receiveShadow = true; group.add(m);
    }
  }

  // ===== GROUND =====
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(126, 134, 1, 1), new THREE.MeshStandardMaterial({
    map: T.sand.map, bumpMap: T.sand.bump, bumpScale: .055, roughness: 1, metalness: 0, color: 0xd3aa78
  }));
  ground.rotation.x = -PI / 2; ground.receiveShadow = true; ground.position.y = 0; group.add(ground);
  const outer = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ color: 0x9a7348, roughness: 1 }));
  outer.rotation.x = -PI / 2; outer.position.y = -.06; outer.receiveShadow = true; group.add(outer);

  // Painted road / exposed paving strips.
  function paving(x, z, w, d, rotate = 0) {
    const g = new THREE.PlaneGeometry(w, d);
    const p = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x9b7a54, roughness: .98, map: T.sand.map, polygonOffset: true, polygonOffsetFactor: -1 }));
    p.rotation.x = -PI / 2; p.rotation.z = rotate; p.position.set(x, .012, z); p.receiveShadow = true; group.add(p);
    // border stones
    for (let i = 0; i < Math.floor(w / 2); i++) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(1.5, .025, .18), M.trimDark);
      s.position.set(x - w / 2 + .8 + i * 2, .02, z - d / 2); group.add(s);
      const s2 = s.clone(); s2.position.z = z + d / 2; group.add(s2);
    }
  }
  paving(0, 0, 7, 84);
  paving(-36, 2, 8, 74, .015);
  paving(36, 1, 8, 74, -.015);
  paving(-33, -13, 19, 25, .06);
  paving(33, -11, 19, 23, -.06);

  // ===== PERIMETER =====
  wall(0, -48, 96, 1.2, 7.6, { trim: true });
  crenellations(0, -47.3, 96, 1.2, 7.6);
  wall(0, 48, 96, 1.2, 7, { trim: true });
  crenellations(0, 47.3, 96, 1.2, 7);
  wall(-47, 0, 1.2, 96, 7.8, { trim: true });
  crenellations(-46.3, 0, 1.2, 96, 7.8, false);
  wall(47, 0, 1.2, 96, 7.4, { trim: true });
  crenellations(46.3, 0, 1.2, 96, 7.4, false);

  // buttresses
  for (let z = -38; z <= 38; z += 9.5) {
    for (const s of [-1, 1]) {
      const b = box(s * 46.25, z, 1.1, 1.1, 4.4, M.stone(1, 1)); b.position.x = s * 46.05;
      const cap = new THREE.Mesh(new THREE.BoxGeometry(1.35, .25, 1.35), M.trim); cap.position.set(s * 46.05, 4.5, z); cap.castShadow = true; group.add(cap);
    }
  }
  for (let x = -39; x <= 39; x += 10.5) {
    for (const z of [-47.6, 47.6]) {
      const b = box(x, z, 1.1, .9, 4.1, M.stone(1, 1));
      const cap = new THREE.Mesh(new THREE.BoxGeometry(1.35, .22, 1.15), M.trim); cap.position.set(x, 4.2, z); cap.castShadow = true; group.add(cap);
    }
  }

  // ===== SPawn shielding =====
  wall(-33, 37, 22, 4.2, 4.6, { plaster: true, tint: 0xcdb492 });
  wall(33, 37, 22, 4.2, 4.6, { plaster: true, tint: 0xcdb492 });
  wall(-36, -42, 18, 3.4, 3.7, { plaster: true, tint: 0xc4a782 });
  wall(36, -42, 18, 3.4, 3.7, { plaster: true, tint: 0xc4a782 });

  // Spawn arches (visual)
  function archFacade(cx, cz, width, height, depth, openingW, openingH, mat, opts = {}) {
    const shape = new THREE.Shape();
    shape.moveTo(-width / 2, 0); shape.lineTo(width / 2, 0); shape.lineTo(width / 2, height); shape.lineTo(-width / 2, height); shape.closePath();
    const hole = new THREE.Path();
    const r = openingW / 2;
    hole.moveTo(-r, 0); hole.lineTo(-r, openingH - r); hole.absarc(0, openingH - r, r, PI, 0, true); hole.lineTo(r, 0); hole.closePath();
    shape.holes.push(hole);
    const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: .09, bevelThickness: .09 });
    geo.translate(0, 0, -depth / 2);
    const mesh = new THREE.Mesh(geo, mat); mesh.position.set(cx, 0, cz); mesh.castShadow = true; mesh.receiveShadow = true;
    if (opts.ry) mesh.rotation.y = opts.ry;
    group.add(mesh);
    // trim line over arch
    const trim = new THREE.Mesh(new THREE.TorusGeometry(r + .15, .12, 6, 24, PI), M.trim);
    trim.position.set(cx, opts.ry ? openingH - r : openingH - r, opts.ry ? cz + Math.sin(opts.ry) * (depth / 2 + .06) : cz + depth / 2 + .06);
    if (opts.ry) trim.rotation.set(0, opts.ry, 0);
    trim.castShadow = true; group.add(trim);
    // collision sides
    if (opts.collide !== false) {
      const sideW = (width - openingW) / 2;
      colliders.push({ minX: cx - width / 2, maxX: cx - openingW / 2, minZ: cz - depth / 2, maxZ: cz + depth / 2, bottom: 0, top: height });
      colliders.push({ minX: cx + openingW / 2, maxX: cx + width / 2, minZ: cz - depth / 2, maxZ: cz + depth / 2, bottom: 0, top: height });
      const left = new THREE.Mesh(new THREE.BoxGeometry(sideW, height, depth), mat); left.position.set(cx - openingW / 2 - sideW / 2, height / 2, cz); left.visible = false; group.add(left);
      const right = new THREE.Mesh(new THREE.BoxGeometry(sideW, height, depth), mat); right.position.set(cx + openingW / 2 + sideW / 2, height / 2, cz); right.visible = false; group.add(right);
      solidMeshes.push(left, right);
    }
    return mesh;
  }

  // Site back walls with gates from T spawn.
  archFacade(-36, -34, 20, 6.4, 1.05, 6.5, 5.1, M.stone(20, 1));
  archFacade(36, -34, 20, 6.4, 1.05, 6.5, 5.1, M.stone(20, 1));
  // Mid to T side passage
  archFacade(0, -33, 24, 6.3, 1.1, 7, 5.2, M.stone(24, 1));

  // ===== WEST / EAST BUILDING BLOCKS =====
  function building(x, z, w, d, h, opts = {}) {
    wall(x, z, w, d, h, { plaster: opts.plaster ?? true, tint: opts.tint || 0xcfb28d });
    // roof parapet
    const par = new THREE.Mesh(new THREE.BoxGeometry(w + .4, .55, d + .4), M.stone(1, 1));
    par.position.set(x, h + .27, z); par.castShadow = true; par.receiveShadow = true; group.add(par);
    // facade banding
    const band = new THREE.Mesh(new THREE.BoxGeometry(w + .12, .1, d + .12), M.trim); band.position.set(x, h * .58, z); group.add(band);
    // windows on faces toward mid
    const face = opts.face || (x < 0 ? 'east' : 'west');
    const fz = (face === 'east' || face === 'west') ? x + (face === 'east' ? w / 2 + .03 : -w / 2 - .03) : x;
    const count = Math.max(2, Math.floor(d / 4.2));
    for (let i = 0; i < count; i++) {
      const zz = z - d / 2 + 2.2 + i * ((d - 4.4) / Math.max(1, count - 1));
      if (hash(x + i, z) > .52) {
        const pane = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 1.5), M.glass);
        pane.position.set(fz + (face === 'east' ? .02 : -.02), 2.75 + (i % 2) * .15, zz);
        pane.rotation.y = face === 'east' ? PI / 2 : -PI / 2; group.add(pane);
        const fr = new THREE.Mesh(new THREE.BoxGeometry(.16, 1.8, 1.42), M.woodDark); fr.position.set(fz, 2.75, zz); fr.rotation.y = PI / 2; fr.castShadow = true; group.add(fr);
        // shutters
        for (const s of [-1, 1]) {
          const sh = new THREE.Mesh(new THREE.BoxGeometry(.08, 1.55, .55), M.woodDark);
          sh.position.set(fz + (face === 'east' ? .06 : -.06), 2.75, zz + s * 1.02); sh.rotation.y = face === 'east' ? PI / 2 : -PI / 2; sh.castShadow = true; group.add(sh);
        }
      }
    }
    // upper small windows
    for (let i = 0; i < Math.max(1, Math.floor(w / 5)); i++) {
      const xx = x - w / 2 + 2 + i * 4.7;
      if (xx > x + w / 2 - 1) break;
      if (hash(xx, z * 1.3) > .58) {
        const pane = new THREE.Mesh(new THREE.PlaneGeometry(.72, .9), M.glass);
        pane.position.set(xx, h - 1.25, z + d / 2 + .02); group.add(pane);
        const frame = new THREE.Mesh(new THREE.BoxGeometry(.95, 1.12, .08), M.woodDark); frame.position.set(xx, h - 1.25, z + d / 2 + .005); group.add(frame);
      }
    }
    // awning over one door
    if (opts.awning !== false) {
      const aw = new THREE.Mesh(new THREE.BoxGeometry(3.2, .12, 1.2), M.canvas);
      aw.position.set(x + (opts.face === 'east' ? -w / 2 - .35 : w / 2 + .35), 2.25, z + d * .2); aw.rotation.z = .08; aw.castShadow = true; group.add(aw);
    }
    // roof clutter
    const ac = new THREE.Mesh(new THREE.BoxGeometry(1.1, .7, 1.5), M.metal); ac.position.set(x + w * .22, h + .9, z - d * .2); ac.castShadow = true; group.add(ac);
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(.24, .17, .48, 8), M.pot); pot.position.set(x + w * .35, h + .8, z + d * .27); pot.castShadow = true; group.add(pot);
    return { x, z, w, d, h };
  }

  building(-19, 26, 15, 14, 6.5);
  building(-19, 6, 15, 11, 5.4);
  building(-20, -17, 15, 18, 7.2);
  building(19, 26, 15, 14, 6.2);
  building(19, 6, 15, 11, 5.6);
  building(20, -17, 15, 18, 7.0);
  // Roof edge shadows/decor.

  // Awnings and cloths on building facades.
  function hangingCloth(x, y, z, w, h, ry = 0, mat = M.canvas) {
    const geo = new THREE.PlaneGeometry(w, h, 10, 4);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const px = pos.getX(i), py = pos.getY(i);
      pos.setZ(i, Math.sin((px / w + .5) * PI * 2) * .09 + (py / h + .5) * .06);
    }
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.y = ry;
    m.castShadow = true; m.receiveShadow = true; group.add(m); details.cloths.push(m); return m;
  }
  hangingCloth(-11.4, 4.4, 25.5, 5.5, 2.1, -PI / 2, new THREE.MeshStandardMaterial({ color: 0x8b3e26, roughness: 1, side: THREE.DoubleSide }));
  hangingCloth(11.4, 3.8, 8, 3.5, 1.6, PI / 2, new THREE.MeshStandardMaterial({ color: 0x2d3b43, roughness: 1, side: THREE.DoubleSide }));

  // ===== A SITE =====
  const siteA = new THREE.Vector3(-33.5, 0, -13);
  const siteB = new THREE.Vector3(33.5, 0, -11);
  function sitePaint(pos, tex) {
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: .75, color: 0xffd59b });
    const p = new THREE.Mesh(new THREE.PlaneGeometry(13, 13), mat);
    p.rotation.x = -PI / 2; p.position.set(pos.x, .027, pos.z); group.add(p);
    const glow = new THREE.PointLight(0xff8a2b, .35, 8, 2); glow.position.set(pos.x, .4, pos.z); group.add(glow);
  }
  sitePaint(siteA, T.siteA); sitePaint(siteB, T.siteB);

  // Palace facade along west wall at A
  for (let i = 0; i < 3; i++) {
    const z = -20 + i * 7;
    const arch = new THREE.Group();
    const shape = new THREE.Shape();
    shape.moveTo(-2.2, 0); shape.lineTo(2.2, 0); shape.lineTo(2.2, 4.4); shape.lineTo(-2.2, 4.4); shape.closePath();
    const hole = new THREE.Path(); hole.moveTo(-1.25, 0); hole.lineTo(-1.25, 2.55); hole.absarc(0, 2.55, 1.25, PI, 0, true); hole.lineTo(1.25, 0); hole.closePath(); shape.holes.push(hole);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: .5, bevelEnabled: false }); geo.translate(0, 0, -.25); geo.rotateY(PI / 2);
    const mesh = new THREE.Mesh(geo, M.stone(3, 1)); mesh.position.set(-46.2, 0, z); mesh.castShadow = true; group.add(mesh);
    const inner = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 4.2), M.dark); inner.rotation.y = PI / 2; inner.position.set(-45.85, 2.1, z); group.add(inner);
  }

  // A crates and cover
  function crate(x, z, s = 1.2, y = s / 2, rot = 0) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), M.wood);
    mesh.position.set(x, y, z); mesh.rotation.y = rot; mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh); colliders.push({ minX: x - s * .52, maxX: x + s * .52, minZ: z - s * .52, maxZ: z + s * .52, bottom: 0, top: y + s / 2, mesh });
    solidMeshes.push(mesh);
    // metal corner straps
    const edgeMat = M.blackMetal;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(.055, s + .01, .055), edgeMat);
      post.position.set(sx * s * .47, 0, sz * s * .47); mesh.add(post);
    }
    return mesh;
  }
  crate(-37.5, -16.5, 1.3, .65, .05); crate(-36.2, -16.5, 1.3, .65); crate(-36.8, -16.5, 1.3, 1.95);
  crate(-30.5, -7.5, 1.25, .625, .1); crate(-29.2, -7.8, 1.25, .625);
  crate(-39.5, -8.2, 1.15, .575, -.12);
  crate(-24.5, -10.2, 1.35, .675);
  // Long A cover
  crate(-36, 14, 1.2, .6, .08); crate(-35.8, 15.2, 1.2, .6, -.04);
  crate(-38.5, 5, 1.15, .575, .2);
  // A barrels
  function barrel(x, z, color = 0x7a3d29) {
    const mat = new THREE.MeshStandardMaterial({ map: T.metal, color, roughness: .58, metalness: .65 });
    const b = new THREE.Mesh(new THREE.CylinderGeometry(.34, .34, .92, 14), mat); b.position.set(x, .46, z); b.castShadow = b.receiveShadow = true; group.add(b);
    for (const y of [.15, .77]) { const r = new THREE.Mesh(new THREE.TorusGeometry(.345, .025, 5, 14), M.blackMetal); r.rotation.x = PI / 2; r.position.set(x, y, z); group.add(r); }
    colliders.push({ minX: x - .34, maxX: x + .34, minZ: z - .34, maxZ: z + .34, bottom: 0, top: .92, mesh: b }); solidMeshes.push(b);
    return b;
  }
  barrel(-40.2, -13.5, 0x6d4a31); barrel(-41, -12.6, 0x45514d); barrel(-40.5, -10.2, 0x6d4a31);

  // Sandbag wall
  function sandbags(x, z, w, ry = 0, height = 2) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; group.add(g);
    const perRow = Math.floor(w / .62);
    for (let row = 0; row < height; row++) {
      for (let i = 0; i < perRow - (row % 2); i++) {
        const bag = new THREE.Mesh(new THREE.CapsuleGeometry(.18, .34, 3, 7), M.sandbag);
        bag.rotation.z = PI / 2; bag.rotation.y = .03 * (i % 2);
        bag.scale.set(1, 1, .72);
        bag.position.set(-w / 2 + .34 + i * .62 + (row % 2) * .31, .18 + row * .31, (hash(i, row) - .5) * .04);
        bag.castShadow = bag.receiveShadow = true; g.add(bag);
      }
    }
    const c = { minX: x - w / 2, maxX: x + w / 2, minZ: z - .36, maxZ: z + .36, bottom: 0, top: height * .31, mesh: g };
    colliders.push(c); solidMeshes.push(g);
    return g;
  }
  sandbags(-31, 2, 3.4, .03, 2);
  sandbags(-36, -25, 3.0, PI / 2, 2);
  sandbags(4, 20, 2.6, 0, 2);
  sandbags(36, 20, 3.2, .1, 2);
  sandbags(-1, -25, 3.0, 0, 2);

  // ===== B SITE =====
  // Market / bazaar structures
  crate(38.2, -15.5, 1.25, .625, .12); crate(39.5, -15.2, 1.25, .625); crate(38.8, -15.4, 1.25, 1.85);
  crate(29.2, -7.2, 1.2, .6, -.08); crate(30.5, -7.4, 1.2, .6);
  crate(24.8, -12, 1.35, .675, .05);
  crate(38, -3.5, 1.2, .6, .2); crate(35.5, 8, 1.2, .6, -.1);
  barrel(40.8, -10.5, 0x5a5e54); barrel(40.1, -9.4, 0x7a3d29);
  barrel(25.8, -3.2, 0x4d4a3b);
  sandbags(31, 2.2, 3.6, .04, 2);

  function marketStall(x, z, w = 4.2, d = 2.2) {
    const g = new THREE.Group(); g.position.set(x, 0, z); group.add(g);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(.055, .055, 2.6, 6), M.woodDark);
      p.position.set(sx * w / 2, 1.3, sz * d / 2); p.castShadow = true; g.add(p);
    }
    const table = new THREE.Mesh(new THREE.BoxGeometry(w, .14, d), M.wood); table.position.y = .88; table.castShadow = true; g.add(table);
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(w + .5, .06, d + .5), new THREE.MeshStandardMaterial({ color: 0x9a4d2d, roughness: .95, side: THREE.DoubleSide }));
    canopy.position.y = 2.58; canopy.rotation.z = .04; canopy.castShadow = true; g.add(canopy);
    for (let i = 0; i < 5; i++) {
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(.1, .08, .12, 7), M.pot); pot.position.set(-w / 2 + .5 + i * .7, 1.01, .25); g.add(pot);
      const fruit = new THREE.Mesh(new THREE.SphereGeometry(.11, 8, 6), new THREE.MeshStandardMaterial({ color: 0xb46b2e, roughness: 1 })); fruit.position.copy(pot.position).add(new THREE.Vector3(0, .15, 0)); g.add(fruit);
    }
    const sack = new THREE.Mesh(new THREE.SphereGeometry(.38, 8, 6), M.sandbag); sack.scale.set(1, 1.2, .8); sack.position.set(w * .3, .42, 1.4); sack.castShadow = true; g.add(sack);
    colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, bottom: 0, top: 1.1, mesh: g }); solidMeshes.push(g);
    details.lamps.push({ obj: g, kind: 'stall' });
  }
  marketStall(25.2, 4.2, 3.3, 1.9);
  // Hanging lantern
  function lantern(x, y, z) {
    const wire = new THREE.Mesh(new THREE.CylinderGeometry(.005, .005, y, 4), M.rope); wire.position.set(x, y / 2 + 3.8, z); group.add(wire);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(.16, .2, .38, 8), M.blackMetal); body.position.set(x, 4.2, z); body.castShadow = true; group.add(body);
    const glow = new THREE.Mesh(new THREE.SphereGeometry(.11, 8, 6), M.lamp); glow.position.set(x, 4.18, z); group.add(glow);
    const l = new THREE.PointLight(0xffa957, .8, 5, 2); l.position.set(x, 4.18, z); group.add(l); details.lamps.push({ obj: l, kind: 'lantern', base: .8 });
  }
  lantern(19.7, 4.2, -9.3); lantern(-19.7, 4.2, 15.7);
  lantern(29.4, 4.2, -9.4);

  // Rugs
  function rug(x, z, w, d, ry = 0, opacity = 1) {
    const r = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ map: T.rug, roughness: 1, color: 0xffffff, transparent: opacity < 1, opacity, polygonOffset: true, polygonOffsetFactor: -2 }));
    r.rotation.x = -PI / 2; r.rotation.z = ry; r.position.set(x, .033, z); r.receiveShadow = true; group.add(r); return r;
  }
  rug(-31.5, -10.8, 7.5, 5.2, .03);
  rug(33.2, -9.4, 6.2, 4.8, -.04);
  rug(-2.2, 24, 3.6, 2.2, .1, 1);
  rug(19.4, 10.4, 2.6, 1.8, .05);

  // ===== MID =====
  // Mid arch chokepoint
  archFacade(0, 7.5, 30, 6.2, 1.0, 6.4, 5.2, M.stone(30, 1));
  // wooden mid doors, opened
  for (const s of [-1, 1]) {
    const door = new THREE.Mesh(new THREE.BoxGeometry(2.7, 3.6, .12), M.wood);
    door.position.set(s * 4.6, 1.8, 7.1); door.rotation.y = s * .55; door.castShadow = true; group.add(door);
    for (let i = 0; i < 5; i++) { const p = new THREE.Mesh(new THREE.BoxGeometry(.05, 3.4, .02), M.blackMetal); p.position.set(0, 0, .07); door.add(p); }
  }
  // Mid cover
  crate(3.4, 16, 1.3, .65, .03); crate(3.2, 17.3, 1.3, .65);
  crate(-4.2, -2.6, 1.2, .6, -.1);
  barrel(5.2, 2.2, 0x5f5142);
  sandbags(-6.4, 12, 2.8, .06);
  sandbags(6.4, -11, 2.8, -.03);
  // central cart
  const cart = new THREE.Group(); cart.position.set(0, 0, -19); group.add(cart);
  const cartBody = new THREE.Mesh(new THREE.BoxGeometry(2.4, .72, 1.25), M.wood); cartBody.position.y = .68; cartBody.castShadow = true; cart.add(cartBody);
  for (const s of [-1, 1]) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(.41, .41, .12, 12), M.woodDark); wheel.rotation.z = PI / 2; wheel.position.set(s * 1.03, .41, .25); wheel.castShadow = true; cart.add(wheel);
  }
  for (let i = 0; i < 3; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(.5, .52, .45), M.wood); b.position.set(-.55 + i * .55, 1.3, 0); b.rotation.y = i * .4; b.castShadow = true; cart.add(b); }
  colliders.push({ minX: -1.3, maxX: 1.3, minZ: -19.7, maxZ: -18.3, bottom: 0, top: 1.4, mesh: cart }); solidMeshes.push(cart);

  // CT spawn cover and signage
  wall(-11.2, 37, .6, 12, 3.4, { plaster: true });
  wall(11.2, 37, .6, 12, 3.4, { plaster: true });
  crate(-8.4, 33, 1.2, .6, .1); crate(8.4, 33, 1.2, .6, -.1);
  sandbags(0, 31, 4.2, 0, 2);
  // T spawn cover
  crate(-7, -42, 1.2, .6, .1); crate(7, -42, 1.2, .6, -.1);
  sandbags(0, -35.5, 4.4, 0, 2);

  // ===== DETAILS =====
  // Palm trees
  function palmTree(x, z, h = 6.2, lean = .1) {
    const g = new THREE.Group(); g.position.set(x, 0, z); group.add(g);
    let prev = new THREE.Vector3(0, 0, 0);
    const segs = 7;
    for (let i = 0; i < segs; i++) {
      const y0 = i * h / segs, y1 = (i + 1) * h / segs;
      const r0 = .24 * (1 - i / (segs + 2)), r1 = .24 * (1 - (i + 1) / (segs + 2));
      const seg = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, h / segs + .04, 8), M.trunk);
      seg.position.set(lean * y0 * .28, (y0 + y1) / 2, lean * y0 * .06);
      seg.castShadow = true; g.add(seg);
      prev.set(lean * y0 * .28, y1, lean * y0 * .06);
    }
    const top = prev.clone();
    // fronds
    for (let i = 0; i < 9; i++) {
      const angle = i / 9 * PI * 2 + hash(x, z) * .7;
      const len = 1.9 + hash(i, z) * 1.0;
      const pts = [];
      const dir = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
      for (let j = 0; j <= 6; j++) {
        const t = j / 6;
        pts.push(new THREE.Vector3(dir.x * len * t, .25 * Math.sin(t * PI) - t * t * 1.4, dir.z * len * t).add(top));
      }
      const geo = new THREE.BufferGeometry();
      const verts = [], idx = [];
      for (let j = 0; j <= 6; j++) {
        const t = j / 6, w = Math.sin(t * PI) * .36 * (1 - t * .3);
        const p = pts[j];
        const perp = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(w);
        verts.push(p.x + perp.x, p.y, p.z + perp.z, p.x - perp.x, p.y, p.z - perp.z);
        if (j < 6) { const a = j * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      }
      geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3)); geo.setIndex(idx); geo.computeVertexNormals();
      const leaf = new THREE.Mesh(geo, i % 3 ? M.leaves : M.leavesDry); leaf.castShadow = true; leaf.receiveShadow = true; g.add(leaf);
    }
    for (let i = 0; i < 4; i++) {
      const nut = new THREE.Mesh(new THREE.SphereGeometry(.12, 7, 5), M.woodDark);
      nut.position.copy(top).add(new THREE.Vector3(Math.cos(i * 1.9) * .18, -.1, Math.sin(i * 1.9) * .18)); g.add(nut);
    }
    colliders.push({ minX: x - .28, maxX: x + .28, minZ: z - .28, maxZ: z + .28, bottom: 0, top: h, mesh: g }); solidMeshes.push(g);
    details.palms.push(g);
    return g;
  }
  palmTree(-41.5, 3.5, 6.8, .12);
  palmTree(-8.2, 18.2, 5.2, -.15);
  palmTree(41.4, 4.2, 6.5, -.1);
  palmTree(9.4, -25.4, 5.5, .1);
  palmTree(31.5, 22.5, 5.8, -.1);
  palmTree(-41.5, -29, 5.3, .08);

  // Barrels, pots, crates scattered for visual density.
  for (const [x, z] of [[-44, -2], [-43.5, -1], [-44.2, 13], [43, 13], [44, 14], [43.2, -3], [15.6, -6.3], [-15.8, 19], [-45, 22]]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(.22, .16, .42, 8), M.pot); p.position.set(x, .21, z); p.castShadow = true; group.add(p);
  }
  for (let i = 0; i < 12; i++) {
    const x = -43 + hash(i, 2) * 86, z = -44 + hash(i, 7) * 88;
    if (Math.abs(x) < 12 || Math.abs(x - 19) < 7 || Math.abs(x + 19) < 7) continue;
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(.13 + hash(i, 4) * .18, 0), M.trimDark);
    rock.position.set(x, .1, z); rock.rotation.set(hash(i, 9) * 3, hash(i, 8) * 3, 0); rock.castShadow = true; group.add(rock);
  }

  // Hanging wires across mid
  function wire(x1, y1, z1, x2, y2, z2) {
    const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(x1, y1, z1), new THREE.Vector3((x1 + x2) / 2, Math.min(y1, y2) - 1.2, (z1 + z2) / 2), new THREE.Vector3(x2, y2, z2));
    const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 18, .012, 4, false), M.blackMetal); group.add(m);
  }
  wire(-19, 6.4, 28, 19, 6.1, 28);
  wire(-10, 5.4, -1, 10, 5.1, -1);
  wire(-19, 7.1, -17, 19, 6.9, -17);
  // hanging bulbs
  for (const [x, y, z] of [[-8, 5.4, 28], [0, 5.5, 28], [8, 5.35, 28], [-4, 4.7, -1], [4, 4.65, -1]]) {
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(.06, 6, 5), M.lamp); bulb.position.set(x, y - .2, z); group.add(bulb);
    const l = new THREE.PointLight(0xffb56b, .28, 3, 2); l.position.copy(bulb.position); group.add(l);
    wire(x - 4, y, z, x + 4, y, z);
  }

  // A/B signs on building walls facing lanes
  function sign(tex, x, y, z, ry, w = 1.4, h = 1.4) {
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: .92, metalness: .02, transparent: true });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(x, y, z); m.rotation.y = ry; m.castShadow = false; group.add(m);
    return m;
  }
  sign(T.signA, -26.58, 3.2, -15, -PI / 2, 2.2, 2.2);
  sign(T.signB, 26.58, 3.2, -8, PI / 2, 2.2, 2.2);
  sign(T.warning, -13.2, 2.2, -33.95, PI, 1.2, 1.2);
  sign(T.warning, 13.2, 2.2, -33.95, PI, 1.2, 1.2);
  // posters
  for (const [x, z, ry] of [[-11.43, 9.5, -PI / 2], [11.43, 2.5, PI / 2], [-26.57, -21.5, -PI / 2], [26.57, -17, PI / 2]]) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(.8, .8), new THREE.MeshStandardMaterial({ map: T.poster1, roughness: .95 }));
    p.position.set(x, 2.1, z); p.rotation.y = ry; p.rotation.z = (hash(x, z) - .5) * .08; group.add(p);
  }

  // Awning over B tunnel
  const awnGeo = new THREE.PlaneGeometry(8, 2.4, 8, 1);
  const awn = new THREE.Mesh(awnGeo, M.canvas);
  awn.rotation.x = -PI / 2 + .26; awn.rotation.z = -.03; awn.position.set(33, 3.65, 18.5); awn.castShadow = true; group.add(awn);
  for (const x of [29.2, 36.8]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, 3.5, 6), M.woodDark); p.position.set(x, 1.75, 18.8); p.castShadow = true; group.add(p); }
  // Tunnel roof detail
  const roof = new THREE.Mesh(new THREE.BoxGeometry(13, .18, 10), M.wood); roof.position.set(35, 4.55, 8); roof.castShadow = true; group.add(roof);
  for (const z of [3.5, 8, 12.5]) for (const x of [28.5, 35, 41.5]) { const beam = new THREE.Mesh(new THREE.BoxGeometry(.16, .26, 10), M.woodDark); beam.position.set(x, 4.4, 8); group.add(beam); }

  // bomb craters / debris
  for (const [x, z, r] of [[-9, -13, 1.5], [21, 13, 1.1], [-27, 25, .8], [42, -24, 1.2]]) {
    const crater = new THREE.Mesh(new THREE.CircleGeometry(r, 20), new THREE.MeshBasicMaterial({ color: 0x6c4b2d, transparent: true, opacity: .46 }));
    crater.rotation.x = -PI / 2; crater.position.set(x, .018, z); group.add(crater);
    for (let i = 0; i < 6; i++) {
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(.08 + hash(i, x) * .12, 0), M.trimDark);
      rock.position.set(x + (hash(i, 1) - .5) * r * 2.4, .08, z + (hash(i, 5) - .5) * r * 2.4); rock.castShadow = true; group.add(rock);
    }
  }

  // ===== SKY =====
  const skyGeo = new THREE.SphereGeometry(260, 40, 20);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {
      topColor: { value: new THREE.Color(0x4d7ea3) },
      midColor: { value: new THREE.Color(0xc8a178) },
      horizonColor: { value: new THREE.Color(0xf1c993) },
      sunDir: { value: new THREE.Vector3(0.42, 0.5, 0.28).normalize() },
      sunColor: { value: new THREE.Color(0xffe4b2) }
    },
    vertexShader: `varying vec3 vWorld; void main(){ vec4 wp=modelMatrix*vec4(position,1.0); vWorld=wp.xyz; gl_Position=projectionMatrix*viewMatrix*wp; }`,
    fragmentShader: `
      uniform vec3 topColor; uniform vec3 midColor; uniform vec3 horizonColor; uniform vec3 sunDir; uniform vec3 sunColor; varying vec3 vWorld;
      float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      float noise(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y); }
      void main(){
        vec3 dir=normalize(vWorld);
        float h=clamp(dir.y,0.,1.);
        vec3 col=mix(horizonColor,midColor,smoothstep(0.,.24,h));
        col=mix(col,topColor,smoothstep(.12,.75,h));
        float sun=max(dot(dir,sunDir),0.);
        col+=sunColor*pow(sun,600.)*4.5;
        col+=sunColor*pow(sun,20.)*.34;
        col+=sunColor*pow(sun,4.)*.065;
        // thin desert haze bands
        float n=noise(dir.xz*12.0)+noise(dir.xz*31.0)*.5;
        float band=smoothstep(.015,.09,dir.y)*(1.-smoothstep(.15,.34,dir.y));
        col+=vec3(.14,.09,.04)*n*band*.16;
        // subtle warm horizon dust
        col=mix(col,vec3(.55,.34,.19),smoothstep(.12,-.08,dir.y)*.36);
        gl_FragColor=vec4(col,1.);
      }`
  });
  const sky = new THREE.Mesh(skyGeo, skyMat); group.add(sky);

  // ===== LIGHTS =====
  const hemi = new THREE.HemisphereLight(0xbcd7ed, 0x71502e, 1.15); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffd7a0, 3.25);
  sun.position.set(36, 54, 22); sun.target.position.set(-6, 0, -8); scene.add(sun.target); scene.add(sun);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -62; sun.shadow.camera.right = 62; sun.shadow.camera.top = 62; sun.shadow.camera.bottom = -62;
  sun.shadow.camera.near = 1; sun.shadow.camera.far = 150; sun.shadow.bias = -.0003; sun.shadow.normalBias = .035;
  const fill = new THREE.DirectionalLight(0x7aa0c0, .42); fill.position.set(-35, 20, -20); scene.add(fill);
  const bounce = new THREE.PointLight(0xffb26b, .5, 55, 2); bounce.position.set(-26, 2.5, -8); scene.add(bounce);
  // warm sun shaft through dust
  const sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.dust, color: 0xffd49b, transparent: true, opacity: .38, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  sunSprite.position.set(120, 120, 70); sunSprite.scale.set(60, 60, 1); group.add(sunSprite);

  // ===== DUST =====
  const dustCount = 800;
  const dustGeo = new THREE.BufferGeometry(); const dpos = new Float32Array(dustCount * 3); const dphase = new Float32Array(dustCount);
  for (let i = 0; i < dustCount; i++) {
    dpos[i * 3] = -48 + Math.random() * 96; dpos[i * 3 + 1] = Math.random() * 14; dpos[i * 3 + 2] = -49 + Math.random() * 98; dphase[i] = Math.random() * 10;
  }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dpos, 3));
  const dustMat = new THREE.PointsMaterial({ map: T.dust, color: 0xffd8a4, size: .14, transparent: true, opacity: .32, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true, fog: false });
  const dust = new THREE.Points(dustGeo, dustMat); group.add(dust); details.particles.push(dust);
  // drifting smoke from brazier
  function brazier(x, z) {
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(.3, .18, .28, 10), M.blackMetal); bowl.position.set(x, .95, z); bowl.castShadow = true; group.add(bowl);
    const stand = new THREE.Mesh(new THREE.CylinderGeometry(.06, .13, .85, 6), M.blackMetal); stand.position.set(x, .45, z); group.add(stand);
    const fire = new THREE.Mesh(new THREE.SphereGeometry(.11, 6, 5), M.lamp); fire.position.set(x, 1.1, z); group.add(fire);
    const light = new THREE.PointLight(0xff8a3a, 1.1, 4, 2); light.position.set(x, 1.2, z); group.add(light);
    const smokeMat = new THREE.SpriteMaterial({ map: T.smoke, color: 0xb0a08b, transparent: true, opacity: .22, depthWrite: false });
    const s = new THREE.Sprite(smokeMat); s.position.set(x, 1.4, z); s.scale.set(.7,.7,1); group.add(s);
    details.particles.push(s);
    return { fire, light, smoke: s, x, z };
  }
  const braziers = [brazier(29.5, -5.3), brazier(-31.5, -16.8)];
  colliders.push({ minX: 29.1, maxX: 29.9, minZ: -5.7, maxZ: -4.9, bottom: 0, top: 1.1 });
  colliders.push({ minX: -31.9, maxX: -31.1, minZ: -17.2, maxZ: -16.4, bottom: 0, top: 1.1 });

  // Distant cliff silhouettes beyond walls to break horizon.
  const cliffMat = new THREE.MeshStandardMaterial({ color: 0x8d6947, roughness: 1 });
  for (let i = 0; i < 22; i++) {
    const a = i / 22 * PI * 2;
    const d = 72 + hash(i, 3) * 38;
    const h = 12 + hash(i, 8) * 22;
    const geo = new THREE.DodecahedronGeometry(10 + hash(i, 5) * 12, 0);
    const c = new THREE.Mesh(geo, cliffMat); c.position.set(Math.cos(a) * d, h * .28, Math.sin(a) * d); c.scale.set(1.5 + hash(i, 2), h / 24, 1.7); c.rotation.y = a * 2; group.add(c);
  }
  // Far city boxes.
  for (let i = 0; i < 30; i++) {
    const a = hash(i, 14) * PI * 2, d = 84 + hash(i, 4) * 30;
    const b = new THREE.Mesh(new THREE.BoxGeometry(3 + hash(i, 1) * 5, 3 + hash(i, 6) * 8, 3 + hash(i, 7) * 5), new THREE.MeshStandardMaterial({ color: 0x8f7457, roughness: 1 }));
    b.position.set(Math.cos(a) * d, 1.5 + hash(i, 2) * 3, Math.sin(a) * d); b.rotation.y = a; group.add(b);
  }

  // ===== NAV GRID =====
  const nav = { cell: 1.8, minX: -45, maxX: 45, minZ: -46, maxZ: 46 };
  nav.cols = Math.floor((nav.maxX - nav.minX) / nav.cell) + 1;
  nav.rows = Math.floor((nav.maxZ - nav.minZ) / nav.cell) + 1;
  nav.grid = new Uint8Array(nav.cols * nav.rows);
  for (let r = 0; r < nav.rows; r++) for (let c = 0; c < nav.cols; c++) {
    const x = nav.minX + c * nav.cell, z = nav.minZ + r * nav.cell;
    let blocked = false;
    if (x < -44.5 || x > 44.5 || z < -45.5 || z > 45.5) blocked = true;
    for (const col of colliders) {
      if (col.top < .3) continue;
      const dx = Math.max(col.minX - x, 0, x - col.maxX), dz = Math.max(col.minZ - z, 0, z - col.maxZ);
      if (dx * dx + dz * dz < .78 * .78) { blocked = true; break; }
    }
    nav.grid[r * nav.cols + c] = blocked ? 1 : 0;
  }
  nav.index = (x, z) => {
    const c = Math.max(0, Math.min(nav.cols - 1, Math.round((x - nav.minX) / nav.cell)));
    const r = Math.max(0, Math.min(nav.rows - 1, Math.round((z - nav.minZ) / nav.cell)));
    return [c, r];
  };
  nav.walkable = (x, z) => {
    const [c, r] = nav.index(x, z);
    return !nav.grid[r * nav.cols + c];
  };
  nav.nearestFree = (x, z) => {
    const [c0, r0] = nav.index(x, z);
    if (!nav.grid[r0 * nav.cols + c0]) return new THREE.Vector3(x, 0, z);
    for (let radius = 1; radius < 8; radius++) {
      for (let dz = -radius; dz <= radius; dz++) for (let dx = -radius; dx <= radius; dx++) {
        const c = c0 + dx, r = r0 + dz; if (c < 0 || r < 0 || c >= nav.cols || r >= nav.rows) continue;
        if (!nav.grid[r * nav.cols + c]) return new THREE.Vector3(nav.minX + c * nav.cell, 0, nav.minZ + r * nav.cell);
      }
    }
    return new THREE.Vector3(x, 0, z);
  };
  nav.findPath = (sx, sz, ex, ez) => {
    const start = nav.index(sx, sz), end = nav.index(ex, ez);
    if (nav.grid[end[1] * nav.cols + end[0]]) { const f = nav.nearestFree(ex, ez); [end[0], end[1]] = nav.index(f.x, f.z); }
    if (nav.grid[start[1] * nav.cols + start[0]]) { const f = nav.nearestFree(sx, sz); [start[0], start[1]] = nav.index(f.x, f.z); }
    const W = nav.cols, H = nav.rows, N = W * H;
    const gScore = new Float32Array(N).fill(Infinity); const fScore = new Float32Array(N).fill(Infinity);
    const came = new Int32Array(N).fill(-1); const open = []; const inOpen = new Uint8Array(N); const closed = new Uint8Array(N);
    const si = start[1] * W + start[0], ei = end[1] * W + end[0];
    gScore[si] = 0; fScore[si] = Math.hypot(end[0] - start[0], end[1] - start[1]); open.push(si); inOpen[si] = 1;
    let guard = 0;
    while (open.length && guard++ < 12000) {
      let best = 0;
      for (let i = 1; i < open.length; i++) if (fScore[open[i]] < fScore[open[best]]) best = i;
      const cur = open.splice(best, 1)[0]; inOpen[cur] = 0;
      if (cur === ei) break;
      closed[cur] = 1;
      const cc = cur % W, cr = Math.floor(cur / W);
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dz) continue;
        const nc = cc + dx, nr = cr + dz; if (nc < 0 || nr < 0 || nc >= W || nr >= H) continue;
        const ni = nr * W + nc; if (nav.grid[ni] || closed[ni]) continue;
        if (dx && dz) { if (nav.grid[cr * W + nc] || nav.grid[nr * W + cc]) continue; }
        const step = (dx && dz) ? 1.414 : 1;
        const tentative = gScore[cur] + step;
        if (tentative < gScore[ni]) {
          came[ni] = cur; gScore[ni] = tentative;
          fScore[ni] = tentative + Math.hypot(end[0] - nc, end[1] - nr);
          if (!inOpen[ni]) { open.push(ni); inOpen[ni] = 1; }
        }
      }
    }
    if (came[ei] === -1 && si !== ei) return [];
    const path = [];
    let cur = ei, guard2 = 0;
    while (cur !== -1 && guard2++ < 5000) {
      path.push(new THREE.Vector3(nav.minX + (cur % W) * nav.cell, 0, nav.minZ + Math.floor(cur / W) * nav.cell));
      if (cur === si) break;
      cur = came[cur];
    }
    path.reverse();
    // thin path and add a few smoothing points
    if (path.length > 3) {
      const out = [path[0]];
      for (let i = 2; i < path.length - 1; i += 2) out.push(path[i]);
      out.push(path[path.length - 1]);
      return out;
    }
    return path;
  };

  const spawns = {
    ct: [new THREE.Vector3(0, 0, 40), new THREE.Vector3(-3.2, 0, 42), new THREE.Vector3(3.2, 0, 42), new THREE.Vector3(-6.4, 0, 40.5), new THREE.Vector3(6.4, 0, 40.5)],
    t: [new THREE.Vector3(0, 0, -40), new THREE.Vector3(-3.2, 0, -42), new THREE.Vector3(3.2, 0, -42), new THREE.Vector3(-6.4, 0, -40.5), new THREE.Vector3(6.4, 0, -40.5)]
  };
  const sites = [
    { id: 'A', center: siteA, plant: new THREE.Vector3(-33.5, 0, -13), radius: 7 },
    { id: 'B', center: siteB, plant: new THREE.Vector3(33.5, 0, -11), radius: 7 }
  ];

  function update(t, dt) {
    // dust drift
    const p = dustGeo.attributes.position;
    for (let i = 0; i < dustCount; i++) {
      let y = p.getY(i) + dt * (.12 + (i % 7) * .035);
      let x = p.getX(i) + dt * .24 * Math.sin(t * .15 + dphase[i]);
      if (y > 14) y = .2;
      p.setY(i, y); p.setX(i, x);
    }
    p.needsUpdate = true;
    for (const palm of details.palms) palm.rotation.z = Math.sin(t * .55 + palm.position.x) * .007;
    for (const m of details.cloths) m.rotation.z = Math.sin(t * .7 + m.position.z) * .014;
    braziers.forEach((b, i) => {
      b.light.intensity = 1.0 + Math.sin(t * 7 + i) * .16 + Math.random() * .12;
      b.fire.scale.setScalar(.9 + Math.sin(t * 9 + i) * .12);
      b.smoke.position.y = 1.4 + (t * .22 + i * .7) % 2.2;
      b.smoke.material.opacity = .18 * (1 - ((t * .22 + i * .7) % 2.2) / 2.4);
      b.smoke.scale.setScalar(.7 + ((t * .22 + i * .7) % 2.2) * .32);
    });
    for (const l of details.lamps) if (l.kind === 'lantern') l.obj.intensity = l.base + Math.sin(t * 4.2 + l.obj.position.x) * .1;
  }

  // Ray-AABB utility for game logic.
  function raycast(origin, dir, maxDist = 200) {
    let best = maxDist, hit = null;
    for (const c of colliders) {
      const t = rayBox(origin, dir, c.minX, c.maxX, c.bottom, c.top, c.minZ, c.maxZ);
      if (t !== null && t < best) { best = t; hit = c; }
    }
    // ground
    if (dir.y < -1e-5) { const t = -origin.y / dir.y; if (t > 0 && t < best) { best = t; hit = { ground: true }; } }
    return hit ? { distance: best, collider: hit, point: origin.clone().addScaledVector(dir, best) } : null;
  }

  return { group, colliders, solidMeshes, sites, spawns, nav, raycast, update, sky, sun, details, bounds: { minX: -46, maxX: 46, minZ: -48, maxZ: 48 }, M };
}

function rayBox(o, d, minX, maxX, minY, maxY, minZ, maxZ) {
  let tmin = 0, tmax = Infinity;
  const axes = [[o.x, d.x, minX, maxX], [o.y, d.y, minY, maxY], [o.z, d.z, minZ, maxZ]];
  for (const [origin, dir, lo, hi] of axes) {
    if (Math.abs(dir) < 1e-8) { if (origin < lo || origin > hi) return null; }
    else {
      let t1 = (lo - origin) / dir, t2 = (hi - origin) / dir;
      if (t1 > t2) [t1, t2] = [t2, t1];
      tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
      if (tmin > tmax) return null;
    }
  }
  return tmin > 0 ? tmin : null;
}
