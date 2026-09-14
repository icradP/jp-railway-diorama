import * as THREE from 'three';
import { MeshBuilder } from '../core/mesh';
import { materials } from '../core/materials';
import { ShapeFactory } from '../core/shapes';
import { Rng } from '../core/rng';

export type HouseVariant = 'A' | 'B' | 'C';

export interface HouseOptions {
  variant: HouseVariant;
  rotationY?: number;
  rng: Rng;
}

/**
 * Three visually distinct Japanese 一户建.
 * A: traditional spacious  ·  B: modern compact  ·  C: Showa lived-in
 */
export function buildIkkodate(opts: HouseOptions): THREE.Group {
  const { variant, rng } = opts;
  const rotY = opts.rotationY ?? 0;
  if (variant === 'A') return place(buildHouseA(rng), rotY);
  if (variant === 'B') return place(buildHouseB(rng), rotY);
  return place(buildHouseC(rng), rotY);
}

function place(g: THREE.Group, rotY: number): THREE.Group {
  g.rotation.y = rotY;
  return g;
}

/**
 * Proper gable roof: two slopes meeting at a ridge, eaves overhang.
 * Geometry is computed so planes meet cleanly at the ridge (no floating slabs).
 */
function addGableRoof(
  g: MeshBuilder,
  opts: {
    W: number;
    D: number;
    roofY: number; // top of walls
    ridge: number; // ridge height above wall top
    overhang: number;
    roofMat: THREE.Material;
    edgeMat: THREE.Material;
    wallMat: THREE.Material;
    thickness?: number;
  },
): void {
  const { W, D, roofY, ridge, overhang, roofMat, edgeMat, wallMat } = opts;
  const th = opts.thickness ?? 0.08;
  const halfSpan = D / 2 + overhang;
  const slope = Math.hypot(halfSpan, ridge);
  const angle = Math.atan2(ridge, halfSpan);
  const roofW = W + overhang * 2;

  // Left slope (−Z): +Z edge at ridge
  const slabGeo = ShapeFactory.box(roofW, th, slope);
  const L = new THREE.Mesh(slabGeo, roofMat);
  L.position.set(0, roofY + ridge / 2, -halfSpan / 2);
  L.rotation.x = angle; // +Z tip lifts toward ridge
  L.castShadow = true;
  L.receiveShadow = true;
  g.child(L);

  // Right slope (+Z): −Z edge at ridge
  const R = new THREE.Mesh(slabGeo, roofMat);
  R.position.set(0, roofY + ridge / 2, halfSpan / 2);
  R.rotation.x = -angle;
  R.castShadow = true;
  R.receiveShadow = true;
  g.child(R);

  // Ridge cap
  g.add(ShapeFactory.box(roofW - 0.05, th * 1.2, 0.14), edgeMat, [0, roofY + ridge + th * 0.3, 0]);

  // Eave fascia boards (front/back)
  const fascia = ShapeFactory.box(roofW, 0.1, 0.06);
  g.add(fascia, edgeMat, [0, roofY + 0.02, halfSpan]);
  g.add(fascia, edgeMat, [0, roofY + 0.02, -halfSpan]);

  // Side fascia — skip (gable triangles cover ends; eaves fascia already added)
  // (removed invisible placeholder meshes)

  // Gable end triangles (wall material) — base at wall top, apex at ridge
  const shape = new THREE.Shape();
  shape.moveTo(-halfSpan, 0);
  shape.lineTo(halfSpan, 0);
  shape.lineTo(0, ridge);
  shape.closePath();
  const gableGeo = ShapeFactory.extrude(shape, 0.1);
  for (const s of [-1, 1] as const) {
    const m = new THREE.Mesh(gableGeo, wallMat);
    m.rotation.y = Math.PI / 2;
    m.position.set(s * (W / 2 + 0.01), roofY, 0);
    m.castShadow = true;
    m.receiveShadow = true;
    g.child(m);
  }
}

/**
 * Refined window: frame + glass + mullions + sill.
 * face: 'front'|'back' uses +Z/−Z; 'side' uses ±X.
 */
function addWindow(
  g: MeshBuilder,
  opts: {
    x: number;
    y: number;
    z: number;
    w: number;
    h: number;
    face: 'front' | 'back' | 'sideL' | 'sideR';
    frame: THREE.Material;
    glass: THREE.Material;
    sill?: boolean;
    cols?: number;
    rows?: number;
  },
): void {
  const { x, y, z, w, h, face, frame, glass } = opts;
  const cols = opts.cols ?? 2;
  const rows = opts.rows ?? 2;
  const t = 0.04; // frame thickness
  const d = 0.06;

  const isZ = face === 'front' || face === 'back';
  const s = face === 'front' || face === 'sideR' ? 1 : -1;

  // Outer frame
  if (isZ) {
    g.add(ShapeFactory.box(w + t * 2, h + t * 2, d), frame, [x, y, z + s * 0.01]);
    g.add(ShapeFactory.box(w, h, d * 0.6), glass, [x, y, z + s * 0.025]);
    // Mullions
    for (let i = 1; i < cols; i++) {
      g.add(ShapeFactory.box(0.03, h, d * 0.7), frame, [x - w / 2 + (w * i) / cols, y, z + s * 0.03]);
    }
    for (let j = 1; j < rows; j++) {
      g.add(ShapeFactory.box(w, 0.03, d * 0.7), frame, [x, y - h / 2 + (h * j) / rows, z + s * 0.03]);
    }
    if (opts.sill !== false) {
      g.add(ShapeFactory.box(w + t * 3, 0.05, 0.1), frame, [x, y - h / 2 - t - 0.02, z + s * 0.06]);
    }
  } else {
    g.add(ShapeFactory.box(d, h + t * 2, w + t * 2), frame, [x + s * 0.01, y, z]);
    g.add(ShapeFactory.box(d * 0.6, h, w), glass, [x + s * 0.025, y, z]);
    for (let i = 1; i < cols; i++) {
      g.add(ShapeFactory.box(d * 0.7, h, 0.03), frame, [x + s * 0.03, y, z - w / 2 + (w * i) / cols]);
    }
    for (let j = 1; j < rows; j++) {
      g.add(ShapeFactory.box(d * 0.7, 0.03, w), frame, [x + s * 0.03, y - h / 2 + (h * j) / rows, z]);
    }
  }
}

/** Foundation plinth + step — grounds the building. */
function addFoundation(g: MeshBuilder, W: number, D: number, mat: THREE.Material): number {
  const h = 0.28;
  g.add(ShapeFactory.box(W + 0.18, h, D + 0.18), mat, [0, h / 2, 0]);
  // Top edge band
  g.add(ShapeFactory.box(W + 0.22, 0.04, D + 0.22), materials.get('houseTrimDark'), [0, h - 0.01, 0]);
  return h;
}

/** Traditional, larger, engawa + deep eaves. */
function buildHouseA(rng: Rng): THREE.Group {
  const g = new MeshBuilder('HouseA');
  const wall = materials.get('houseWallA');
  const trim = materials.get('houseTrim');
  const trimD = materials.get('houseTrimDark');
  const roof = materials.get('houseRoof');
  const glass = materials.get('houseWindow');
  const warm = materials.get('houseWindowWarm');

  const W = 4.0;
  const D = 3.2;
  const H1 = 2.3;
  const H2 = 2.0;
  const plinth = addFoundation(g, W, D, materials.get('concrete'));
  const y1 = plinth + H1 / 2;
  const y2 = plinth + H1 + 0.08 + H2 / 2;
  const wallTop = plinth + H1 + 0.08 + H2;

  // 1F body
  g.add(ShapeFactory.box(W, H1, D), wall, [0, y1, 0]);
  // Corner posts
  for (const [px, pz] of [
    [-W / 2 + 0.05, -D / 2 + 0.05],
    [W / 2 - 0.05, -D / 2 + 0.05],
    [-W / 2 + 0.05, D / 2 - 0.05],
    [W / 2 - 0.05, D / 2 - 0.05],
  ] as const) {
    g.add(ShapeFactory.box(0.12, H1, 0.12), trimD, [px, y1, pz]);
  }
  // Floor belt
  g.add(ShapeFactory.box(W + 0.08, 0.1, D + 0.08), trim, [0, plinth + H1 - 0.02, 0]);

  // 2F inset
  g.add(ShapeFactory.box(W - 0.2, H2, D - 0.2), wall, [0, y2, 0]);
  g.add(ShapeFactory.box(W + 0.02, 0.08, D + 0.02), trim, [0, wallTop, 0]);

  // Engawa
  g.add(ShapeFactory.box(W * 0.75, 0.1, 0.75), materials.get('woodMid'), [0, plinth + 0.08, D / 2 + 0.42]);
  for (let i = 0; i < 4; i++) {
    g.add(ShapeFactory.box(0.08, plinth, 0.08), trimD, [-1.1 + i * 0.75, plinth / 2, D / 2 + 0.42]);
  }

  // Sliding door (shoji-like grid)
  const doorY = plinth + 0.9;
  g.add(ShapeFactory.box(1.5, 1.75, 0.07), trim, [-0.3, doorY, D / 2 + 0.02]);
  g.add(ShapeFactory.box(1.38, 1.6, 0.04), glass, [-0.3, doorY, D / 2 + 0.05]);
  for (let i = 1; i < 3; i++) {
    g.add(ShapeFactory.box(0.03, 1.6, 0.05), trim, [-0.3 - 0.69 + (1.38 * i) / 3, doorY, D / 2 + 0.06]);
  }
  g.add(ShapeFactory.box(1.38, 0.03, 0.05), trim, [-0.3, doorY + 0.3, D / 2 + 0.06]);

  // 1F window
  addWindow(g, { x: 0.95, y: plinth + 1.25, z: D / 2, w: 0.9, h: 0.7, face: 'front', frame: trim, glass, cols: 3, rows: 2 });
  // Side windows 1F
  addWindow(g, { x: W / 2, y: plinth + 1.2, z: -0.4, w: 0.7, h: 0.6, face: 'sideR', frame: trim, glass, cols: 2 });

  // 2F front windows
  addWindow(g, { x: -1.05, y: y2 + 0.05, z: (D - 0.2) / 2, w: 0.55, h: 0.65, face: 'front', frame: trim, glass, cols: 2, rows: 2 });
  addWindow(g, { x: 0, y: y2 + 0.05, z: (D - 0.2) / 2, w: 0.55, h: 0.65, face: 'front', frame: trim, glass: warm, cols: 2, rows: 2 });
  addWindow(g, { x: 1.05, y: y2 + 0.05, z: (D - 0.2) / 2, w: 0.55, h: 0.65, face: 'front', frame: trim, glass, cols: 2, rows: 2 });
  // 2F side
  addWindow(g, { x: W / 2 - 0.1, y: y2, z: 0.3, w: 0.55, h: 0.6, face: 'sideR', frame: trim, glass, cols: 2 });

  // Balcony
  const balY = plinth + H1 + 0.1;
  g.add(ShapeFactory.box(1.9, 0.07, 0.55), materials.get('concrete'), [0.1, balY, D / 2 + 0.38]);
  g.add(ShapeFactory.box(1.9, 0.38, 0.035), materials.get('metalGray'), [0.1, balY + 0.22, D / 2 + 0.62]);
  for (let i = 0; i < 7; i++) {
    g.add(ShapeFactory.box(0.03, 0.38, 0.03), materials.get('metalGray'), [-0.8 + i * 0.28, balY + 0.22, D / 2 + 0.62]);
  }

  // Downspouts
  for (const sx of [-1, 1] as const) {
    g.add(ShapeFactory.cylinder(0.032, 0.032, wallTop - plinth, 6), materials.get('metalGray'), [sx * (W / 2 - 0.06), (plinth + wallTop) / 2, D / 2 - 0.06]);
  }

  addGableRoof(g, {
    W,
    D,
    roofY: wallTop,
    ridge: 0.8,
    overhang: 0.42,
    roofMat: roof,
    edgeMat: materials.get('houseRoofEdge'),
    wallMat: wall,
    thickness: 0.1,
  });

  void rng;
  return g.build();
}

/** Modern compact — boxy, mixed wall panels, lean-to carport. */
function buildHouseB(rng: Rng): THREE.Group {
  const g = new MeshBuilder('HouseB');
  const wall = materials.get('houseWallB');
  const wall2 = materials.get('houseWallB2');
  const roof = materials.get('houseRoofB');
  const glass = materials.get('houseWindow');
  const metal = materials.get('houseShutter');

  const W = 3.0;
  const D = 2.8;
  const H1 = 2.2;
  const H2 = 1.85;
  const plinth = 0.1;
  const y1 = plinth + H1 / 2;
  const y2 = plinth + H1 + 0.06 + H2 / 2;

  g.add(ShapeFactory.box(W + 0.14, 0.16, D + 0.14), materials.get('concrete'), [0, 0.08, 0]);

  g.add(ShapeFactory.box(W, H1, D), wall, [0, y1, 0]);
  g.add(ShapeFactory.box(1.0, H1 - 0.15, 0.06), wall2, [-0.75, y1, D / 2 + 0.02]);

  g.add(ShapeFactory.box(W + 0.18, H2, D + 0.12), wall2, [0, y2, 0]);
  g.add(ShapeFactory.box(W + 0.22, 0.07, D + 0.14), metal, [0, plinth + H1 + 0.03, 0]);

  // Flat-ish roof + parapet
  const roofY = plinth + H1 + 0.06 + H2;
  g.add(ShapeFactory.box(W + 0.4, 0.1, D + 0.35), roof, [0, roofY + 0.05, 0]);
  g.add(ShapeFactory.box(W + 0.12, 0.06, D + 0.06), materials.get('metalDark'), [0, roofY + 0.12, 0]);
  g.add(ShapeFactory.box(W + 0.4, 0.14, 0.07), roof, [0, roofY + 0.16, (D + 0.35) / 2]);
  g.add(ShapeFactory.box(W + 0.4, 0.14, 0.07), roof, [0, roofY + 0.16, -(D + 0.35) / 2]);

  // Large modern windows with mullions
  addWindow(g, { x: -0.3, y: plinth + 1.15, z: D / 2, w: 1.35, h: 1.15, face: 'front', frame: metal, glass, cols: 3, rows: 2 });
  g.add(ShapeFactory.box(0.72, 1.7, 0.1), materials.get('houseDoor'), [0.9, plinth + 0.9, D / 2 - 0.02]);
  addWindow(g, { x: 0.9, y: plinth + 1.45, z: D / 2 + 0.06, w: 0.5, h: 0.45, face: 'front', frame: metal, glass, cols: 1, rows: 1, sill: false });

  addWindow(g, { x: 0, y: y2 + 0.1, z: (D + 0.12) / 2, w: 1.7, h: 0.5, face: 'front', frame: metal, glass, cols: 4, rows: 1 });
  addWindow(g, { x: W / 2 + 0.1, y: y2, z: 0.3, w: 0.45, h: 0.85, face: 'sideR', frame: metal, glass, cols: 1, rows: 2 });

  // Small balcony
  g.add(ShapeFactory.box(1.4, 0.06, 0.45), metal, [-0.25, plinth + H1 + 0.08, D / 2 + 0.32]);
  g.add(ShapeFactory.box(1.4, 0.34, 0.03), materials.get('metalGray'), [-0.25, plinth + H1 + 0.28, D / 2 + 0.52]);

  // Carport
  const cp = new MeshBuilder('Carport');
  cp.add(ShapeFactory.box(0.09, 1.7, 2.2), metal, [0, 0.85, 0]);
  cp.add(ShapeFactory.box(0.09, 1.7, 2.2), metal, [2.3, 0.85, 0]);
  cp.add(ShapeFactory.box(2.4, 0.07, 2.3), roof, [1.15, 1.75, 0], [0, 0, -0.08]);
  cp.transform([W / 2 + 0.12, 0, -0.15]);
  g.child(cp.build());

  g.add(ShapeFactory.box(0.45, 0.36, 0.24), materials.get('acUnit'), [-W / 2 - 0.16, 0.45, -0.35]);

  void rng;
  return g.build();
}

/** Showa-era — lower pitch, wood siding, lived-in clutter. */
function buildHouseC(rng: Rng): THREE.Group {
  const g = new MeshBuilder('HouseC');
  const wall = materials.get('houseWallC');
  const wood = materials.get('houseWoodC');
  const roof = materials.get('houseRoofC');
  const glass = materials.get('houseWindow');
  const trim = materials.get('houseTrimDark');

  const W = 3.4;
  const D = 3.0;
  const H1 = 2.15;
  const H2 = 1.85;
  const plinth = 0.1;
  const y1 = plinth + H1 / 2;
  const y2 = plinth + H1 + 0.06 + H2 / 2;

  g.add(ShapeFactory.box(W + 0.18, 0.16, D + 0.18), materials.get('concrete'), [0, 0.08, 0]);

  g.add(ShapeFactory.box(W, H1, D), wall, [0, y1, 0]);
  g.add(ShapeFactory.box(W + 0.02, 0.7, D + 0.02), wood, [0, plinth + 0.35, 0]);
  for (let i = 0; i < 3; i++) {
    g.add(ShapeFactory.box(W + 0.04, 0.035, D + 0.04), trim, [0, plinth + 0.2 + i * 0.2, 0]);
  }

  g.add(ShapeFactory.box(W - 0.1, H2, D - 0.1), wall, [0, y2, 0]);
  g.add(ShapeFactory.box(W - 0.06, 0.65, D - 0.06), wood, [0, y2 - 0.3, 0]);

  // Low-pitch gable (Showa)
  addGableRoof(g, {
    W,
    D,
    roofY: plinth + H1 + 0.06 + H2,
    ridge: 0.55,
    overhang: 0.35,
    roofMat: roof,
    edgeMat: materials.get('houseRoofEdge'),
    wallMat: wall,
    thickness: 0.07,
  });

  // Entrance
  g.add(ShapeFactory.box(0.8, 1.7, 0.07), materials.get('houseDoor'), [-0.25, plinth + 0.9, D / 2 + 0.02]);
  g.add(ShapeFactory.box(1.15, 0.06, 0.65), roof, [-0.25, plinth + 1.9, D / 2 + 0.32], [0.15, 0, 0]);
  g.add(ShapeFactory.box(0.07, 1.7, 0.07), trim, [-0.8, plinth + 0.85, D / 2 + 0.5]);

  addWindow(g, { x: 1.0, y: plinth + 1.25, z: D / 2, w: 0.85, h: 0.65, face: 'front', frame: trim, glass, cols: 3, rows: 2 });
  addWindow(g, { x: -0.85, y: y2 + 0.05, z: (D - 0.1) / 2, w: 0.5, h: 0.55, face: 'front', frame: trim, glass, cols: 2 });
  addWindow(g, { x: 0.5, y: y2 + 0.05, z: (D - 0.1) / 2, w: 0.5, h: 0.55, face: 'front', frame: trim, glass, cols: 2 });
  addWindow(g, { x: -W / 2, y: y2, z: 0.25, w: 0.5, h: 0.5, face: 'sideL', frame: trim, glass, cols: 2 });

  g.add(ShapeFactory.box(0.48, 0.38, 0.26), materials.get('acUnit'), [W / 2 + 0.18, 0.5, -0.55]);
  g.add(ShapeFactory.cylinder(0.035, 0.035, 0.9, 5), materials.get('metalGray'), [W / 2 + 0.18, 1.05, -0.55]);

  g.add(ShapeFactory.box(1.1, 0.95, 1.0), materials.get('shedWall'), [-W / 2 - 0.7, 0.48, -0.35]);
  g.add(ShapeFactory.box(1.25, 0.07, 1.1), roof, [-W / 2 - 0.7, 1.0, -0.35], [0, 0, 0.1]);

  void rng;
  return g.build();
}

/** Simple low-poly kei car. */
export function buildKeiCar(): THREE.Group {
  const c = new MeshBuilder('KeiCar');
  const body = materials.get('carBody');
  const glass = materials.get('houseWindow');
  const tire = materials.get('bicycleTire');
  const metal = materials.get('metalGray');

  c.add(ShapeFactory.box(1.0, 0.55, 0.72), body, [0, 0.42, 0]);
  c.add(ShapeFactory.box(1.1, 0.28, 0.78), body, [0, 0.22, 0]);
  c.add(ShapeFactory.box(0.7, 0.35, 0.68), body, [-0.05, 0.75, 0]);
  c.add(ShapeFactory.box(0.55, 0.28, 0.7), glass, [-0.05, 0.75, 0]);
  c.add(ShapeFactory.box(0.08, 0.3, 0.6), glass, [0.35, 0.7, 0], [0, 0, -0.4]);
  c.add(ShapeFactory.box(0.72, 0.05, 0.7), materials.get('metalDark'), [-0.05, 0.94, 0]);
  c.add(ShapeFactory.box(0.08, 0.18, 0.72), metal, [0.56, 0.2, 0]);
  c.add(ShapeFactory.box(0.08, 0.18, 0.72), metal, [-0.56, 0.2, 0]);
  c.add(ShapeFactory.box(0.04, 0.08, 0.12), materials.get('trainHeadlight'), [0.58, 0.35, 0.25]);
  c.add(ShapeFactory.box(0.04, 0.08, 0.12), materials.get('trainHeadlight'), [0.58, 0.35, -0.25]);
  const wheelGeo = ShapeFactory.cylinder(0.16, 0.16, 0.1, 8);
  wheelGeo.rotateX(Math.PI / 2);
  for (const wx of [0.32, -0.32] as const) {
    for (const side of [-1, 1] as const) {
      c.add(wheelGeo, tire, [wx, 0.16, side * 0.4]);
    }
  }
  return c.build();
}

/** Three giant concrete pipes: two base + one on top, mouths toward road. */
function buildConcretePipes(rng: Rng): THREE.Group {
  const p = new MeshBuilder('ConcretePipes');
  const L = 2.2;
  const R = 0.55;
  const tubeGeo = new THREE.CylinderGeometry(R, R, L, 12, 1, true);
  tubeGeo.rotateZ(Math.PI / 2); // axis along X

  function pipe(x: number, y: number, z: number): void {
    const tube = new THREE.Mesh(tubeGeo, materials.get('pipeConcrete'));
    tube.position.set(x, y, z);
    tube.castShadow = true;
    tube.receiveShadow = true;
    p.child(tube);
    // Inner dark tube (slightly smaller, open)
    const inner = new THREE.CylinderGeometry(R * 0.88, R * 0.88, L * 0.98, 12, 1, true);
    inner.rotateZ(Math.PI / 2);
    const im = new THREE.Mesh(inner, materials.get('pipeInner'));
    im.position.set(x, y, z);
    p.child(im);
    // Rims
    for (const s of [-1, 1] as const) {
      const rim = new THREE.TorusGeometry(R * 0.96, 0.05, 6, 12);
      rim.rotateY(Math.PI / 2);
      const rm = new THREE.Mesh(rim, materials.get('pipeRim'));
      rm.position.set(x + (s * L) / 2, y, z);
      rm.castShadow = true;
      p.child(rm);
    }
  }

  // Mouths toward road (+X toward center of lot / road at x=0)
  // Bottom two, top one
  const CX = -4.0;
  const CZ = -3.1;
  pipe(CX, R, CZ - 0.6);
  pipe(CX, R, CZ + 0.6);
  pipe(CX, R * 2 + 0.04, CZ);

  // Dirt pad under pipes — raised, not coplanar
  p.add(ShapeFactory.box(2.6, 0.04, 2.2), materials.get('dirtLight'), [CX, 0.055, CZ]);
  void rng;
  return p.build();
}

/**
 * Compact residential 田-block layout.
 * Base 16×12 · railway on X · road on Z · houses closer to the street.
 */
export function buildResidential(rng: Rng): THREE.Group {
  const root = new THREE.Group();
  root.name = 'Residential';

  // Tighter 田 — smaller homes, closer to road/rail
  const houseA = buildIkkodate({ variant: 'A', rotationY: 0.08, rng });
  houseA.scale.setScalar(0.72);
  houseA.position.set(-3.9, 0, 2.7);
  root.add(houseA);
  root.add(buildYard(rng, -3.9, 2.7, 'A'));

  const houseB = buildIkkodate({ variant: 'B', rotationY: -0.12, rng });
  houseB.scale.setScalar(0.74);
  houseB.position.set(3.7, 0, 2.55);
  root.add(houseB);
  root.add(buildYard(rng, 3.7, 2.55, 'B'));
  const car = buildKeiCar();
  car.position.set(3.1, 0, 1.15);
  car.rotation.y = Math.PI / 2 + 0.15;
  root.add(car);

  const houseC = buildIkkodate({ variant: 'C', rotationY: Math.PI - 0.08, rng });
  houseC.scale.setScalar(0.72);
  houseC.position.set(3.85, 0, -2.9);
  root.add(houseC);
  root.add(buildYard(rng, 3.85, -2.9, 'C'));

  root.add(buildEmptyLot(rng));
  root.add(buildConcretePipes(rng));

  root.add(buildBlockWalls(rng));
  return root;
}

function buildYard(rng: Rng, hx: number, hz: number, variant: HouseVariant): THREE.Group {
  const y = new MeshBuilder(`Yard_${variant}`);
  const pathDir = hx < 0 ? 1 : -1;

  // Stone path
  for (let i = 0; i < 3; i++) {
    y.add(
      ShapeFactory.box(0.32, 0.03, 0.26),
      materials.get('tileWalk'),
      [hx + pathDir * (1.5 + i * 0.4), 0.02, hz + rng.range(-0.1, 0.1)],
      [0, rng.range(-0.15, 0.15), 0],
    );
  }

  if (variant === 'A') {
    // Plum + maple + hydrangea + bamboo
    y.add(ShapeFactory.box(1.3, 0.14, 0.45), materials.get('soilBed'), [hx - 1.5, 0.07, hz + 1.4]);
    for (let i = 0; i < 4; i++) {
      const fx = hx - 1.5 + rng.range(-0.5, 0.5);
      const fz = hz + 1.4 + rng.range(-0.12, 0.12);
      y.add(ShapeFactory.ico(0.16, 0), materials.get(rng.pick(['hydrangea', 'hydrangeaLight', 'hydrangeaPale'])), [fx, 0.22, fz]);
    }
    // Small plum
    y.add(ShapeFactory.cylinder(0.05, 0.07, 0.9, 5), materials.get('trunk'), [hx + 1.8, 0.45, hz + 1.5]);
    y.add(ShapeFactory.ico(0.38, 0), materials.get('plum'), [hx + 1.8, 1.05, hz + 1.5]);
    y.add(ShapeFactory.ico(0.25, 0), materials.get('leafD'), [hx + 2.0, 1.25, hz + 1.4]);
    // Bamboo cluster
    for (let i = 0; i < 5; i++) {
      const bh = rng.range(1.1, 1.6);
      y.add(
        ShapeFactory.cylinder(0.02, 0.025, bh, 5),
        materials.get('bamboo'),
        [hx - 2.0 + rng.range(-0.2, 0.2), bh / 2, hz - 1.0 + rng.range(-0.2, 0.2)],
      );
    }
    // Clothesline
    const cl = new MeshBuilder('ClothesA');
    cl.add(ShapeFactory.cylinder(0.025, 0.03, 1.4, 5), materials.get('metalGray'), [0, 0.7, 0]);
    cl.add(ShapeFactory.cylinder(0.025, 0.03, 1.4, 5), materials.get('metalGray'), [1.7, 0.7, 0]);
    cl.add(ShapeFactory.catenary(new THREE.Vector3(0, 1.35, 0), new THREE.Vector3(1.7, 1.35, 0), 0.1, 8), materials.get('wire'));
    for (let i = 0; i < 2; i++) {
      const sheet = new THREE.Mesh(ShapeFactory.plane(0.5, 0.6), i === 1 ? materials.get('clothBlue') : materials.get('clothWhite'));
      sheet.position.set(0.45 + i * 0.6, 1.0, 0);
      sheet.userData.windPhase = rng.range(0, 6);
      sheet.userData.isCloth = true;
      sheet.castShadow = true;
      cl.child(sheet);
    }
    cl.transform([hx - 1.8, 0, hz - 1.4]);
    y.child(cl.build());
  } else if (variant === 'B') {
    // Pots + small bamboo + vine
    for (const [px, pz, mat] of [
      [hx + 1.3, hz + 1.2, 'potA'],
      [hx + 1.55, hz + 0.9, 'potB'],
      [hx - 1.3, hz + 1.3, 'potC'],
    ] as const) {
      y.add(ShapeFactory.cylinder(0.11, 0.09, 0.16, 7), materials.get(mat), [px, 0.08, pz]);
      y.add(ShapeFactory.ico(0.13, 0), materials.get(rng.pick(['leafD', 'leafE', 'hedge'])), [px, 0.24, pz]);
    }
    for (let i = 0; i < 3; i++) {
      y.add(
        ShapeFactory.cylinder(0.018, 0.022, 0.9, 5),
        materials.get('bamboo'),
        [hx - 1.4 + i * 0.12, 0.45, hz - 0.9],
      );
    }
  } else {
    // Persimmon + pots + hose
    y.add(ShapeFactory.cylinder(0.06, 0.09, 1.1, 5), materials.get('trunk'), [hx - 1.6, 0.55, hz - 1.2]);
    y.add(ShapeFactory.ico(0.42, 0), materials.get('persimmon'), [hx - 1.6, 1.25, hz - 1.2]);
    y.add(ShapeFactory.ico(0.22, 0), materials.get('leafD'), [hx - 1.35, 1.4, hz - 1.0]);
    for (let i = 0; i < 3; i++) {
      y.add(ShapeFactory.ico(0.04, 0), materials.get('persimmonFruit'), [hx - 1.7 + rng.range(-0.2, 0.2), 1.15 + rng.range(-0.1, 0.15), hz - 1.15]);
    }
    y.add(ShapeFactory.box(1.0, 0.12, 0.4), materials.get('soilBed'), [hx + 1.4, 0.06, hz + 1.1]);
    y.add(ShapeFactory.torus(0.14, 0.025, 6, 12), materials.get('leafC'), [hx + 1.0, 0.07, hz - 1.0], [-Math.PI / 2, 0, 0]);
    // Clothesline
    const cl = new MeshBuilder('ClothesC');
    cl.add(ShapeFactory.cylinder(0.025, 0.03, 1.3, 5), materials.get('metalGray'), [0, 0.65, 0]);
    cl.add(ShapeFactory.cylinder(0.025, 0.03, 1.3, 5), materials.get('metalGray'), [1.5, 0.65, 0]);
    cl.add(ShapeFactory.catenary(new THREE.Vector3(0, 1.25, 0), new THREE.Vector3(1.5, 1.25, 0), 0.08, 8), materials.get('wire'));
    const sheet = new THREE.Mesh(ShapeFactory.plane(0.45, 0.55), materials.get('clothWhite'));
    sheet.position.set(0.75, 0.95, 0);
    sheet.userData.windPhase = rng.range(0, 6);
    sheet.userData.isCloth = true;
    cl.child(sheet);
    cl.transform([hx + 1.2, 0, hz - 1.3]);
    y.child(cl.build());
  }

  // Mailbox + trash
  y.add(ShapeFactory.box(0.2, 0.32, 0.1), materials.get('mailBox'), [hx + (hx < 0 ? 1.7 : -1.7), 0.32, hz + 1.5]);
  y.add(ShapeFactory.box(0.04, 0.32, 0.04), materials.get('metalGray'), [hx + (hx < 0 ? 1.7 : -1.7), 0.16, hz + 1.5]);
  y.add(ShapeFactory.cylinder(0.1, 0.09, 0.28, 7), materials.get('trash'), [hx + 1.1, 0.14, hz + 1.3]);

  return y.build();
}

function buildEmptyLot(rng: Rng): THREE.Group {
  const lot = new MeshBuilder('EmptyLot');
  const CX = -4.0;
  const CZ = -3.0;

  // Flat lawn patch raised clear of base ground (no coplanar fight)
  lot.add(ShapeFactory.box(3.4, 0.035, 2.4), materials.get('grassShade'), [CX, 0.05, CZ]);

  // Big vacant-lot tree — ~2.8m, shorter than House A ridge
  const tree = new MeshBuilder('LotTree');
  tree.add(ShapeFactory.cylinder(0.08, 0.11, 1.2, 6), materials.get('trunk'), [0, 0.6, 0]);
  tree.add(ShapeFactory.ico(0.48, 0), materials.get('leafDeep'), [0, 1.35, 0]);
  tree.add(ShapeFactory.ico(0.36, 0), materials.get('leafA'), [0.15, 1.55, 0.08]);
  tree.add(ShapeFactory.ico(0.28, 0), materials.get('leafB'), [-0.12, 1.7, -0.08]);
  tree.add(ShapeFactory.ico(0.2, 0), materials.get('leafD'), [0.08, 1.85, 0.04]);
  tree.add(ShapeFactory.ico(0.12, 0), materials.get('leafE'), [0, 1.95, 0]);
  tree.transform([CX + 1.8, 0, CZ + 0.6]);
  lot.child(tree.build());

  // Second smaller tree
  const t2 = new MeshBuilder('LotTree2');
  t2.add(ShapeFactory.cylinder(0.05, 0.07, 0.85, 5), materials.get('trunkDark'), [0, 0.42, 0]);
  t2.add(ShapeFactory.ico(0.3, 0), materials.get('leafC'), [0, 1.0, 0]);
  t2.add(ShapeFactory.ico(0.18, 0), materials.get('leafD'), [0.12, 1.2, 0]);
  t2.transform([CX - 1.5, 0, CZ + 1.3]);
  lot.child(t2.build());

  // Partial fence
  for (let i = 0; i < 4; i++) {
    lot.add(ShapeFactory.box(0.06, 0.42, 0.06), materials.get('fenceWood'), [CX - 2.6, 0.21, CZ - 1.2 + i * 0.7]);
  }
  lot.add(ShapeFactory.box(0.04, 0.04, 2.4), materials.get('fenceWood'), [CX - 2.6, 0.32, CZ - 0.15]);

  void rng;
  return lot.build();
}

function buildBlockWalls(rng: Rng): THREE.Group {
  const w = new MeshBuilder('BlockWalls');
  const wallMat = materials.get('concreteWall');
  const brick = materials.get('brickWall');
  const runs: [number, number, number, number, string][] = [
    [-2.4, 1.4, -2.4, 3.8, 'c'],
    [2.4, 1.3, 2.4, 3.7, 'c'],
    [2.4, -1.4, 2.4, -3.6, 'b'],
    [-5.6, 1.35, -2.0, 1.35, 'c'],
    [2.0, 1.35, 5.6, 1.35, 'c'],
  ];
  for (const [x0, z0, x1, z1, kind] of runs) {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const ang = Math.atan2(z1 - z0, x1 - x0);
    const mx = (x0 + x1) / 2;
    const mz = (z0 + z1) / 2;
    w.add(ShapeFactory.box(len, 0.5, 0.1), kind === 'b' ? brick : wallMat, [mx, 0.25, mz], [0, -ang, 0]);
    w.add(ShapeFactory.box(len, 0.04, 0.14), materials.get('houseTrimDark'), [mx, 0.52, mz], [0, -ang, 0]);
  }
  void rng;
  return w.build();
}

export function createClothesWind(root: THREE.Object3D): {
  name: string;
  update(t: number, dt: number): void;
} {
  const cloths: THREE.Object3D[] = [];
  root.traverse((o) => {
    if (o.userData?.isCloth) cloths.push(o);
  });
  return {
    name: 'clothes-wind',
    update(t) {
      for (const c of cloths) {
        const phase = (c.userData.windPhase as number) ?? 0;
        c.rotation.y = Math.sin(t * 1.1 + phase) * 0.12;
        c.rotation.x = Math.sin(t * 0.8 + phase * 1.3) * 0.06;
      }
    },
  };
}
