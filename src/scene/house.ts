import * as THREE from 'three';
import { MeshBuilder, mat4 } from '../core/mesh';
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

/** Vertical corner boards + one belt course — cleaner than full-perimeter rings. */
function addWallTrim(
  g: MeshBuilder,
  W: number,
  D: number,
  yBase: number,
  yTop: number,
  mat: THREE.Material,
): void {
  const h = yTop - yBase;
  // Belt course at mid height
  g.add(ShapeFactory.box(W + 0.04, 0.05, D + 0.04), mat, [0, yBase + h * 0.55, 0]);
}

/** Traditional, larger, engawa + deep eaves + complex gable.
 *  Scale reference: door ≈ 1.7 · 1F ceiling 2.4 · 2F 2.2 · total wall ~5.0
 */
function buildHouseA(rng: Rng): THREE.Group {
  const g = new MeshBuilder('HouseA');
  const wall = materials.get('houseWallA');
  const trim = materials.get('houseTrim');
  const trimD = materials.get('houseTrimDark');
  const roof = materials.get('houseRoof');
  const glass = materials.get('houseWindow');
  const warm = materials.get('houseWindowWarm');

  const W = 4.2; // ~8.5m real
  const D = 3.4;
  const H1 = 2.35; // 1F
  const H2 = 2.05; // 2F
  const plinth = 0.12;
  const y1 = plinth + H1 / 2;
  const y2 = plinth + H1 + 0.08 + H2 / 2;

  g.add(ShapeFactory.box(W + 0.22, 0.2, D + 0.22), materials.get('concrete'), [0, 0.1, 0]);

  // 1F
  g.add(ShapeFactory.box(W, H1, D), wall, [0, y1, 0]);
  for (const [px, pz] of [
    [-W / 2 + 0.06, -D / 2 + 0.06],
    [W / 2 - 0.06, -D / 2 + 0.06],
    [-W / 2 + 0.06, D / 2 - 0.06],
    [W / 2 - 0.06, D / 2 - 0.06],
  ] as const) {
    g.add(ShapeFactory.box(0.14, H1, 0.14), trimD, [px, y1, pz]);
  }
  g.add(ShapeFactory.box(W + 0.1, 0.12, D + 0.1), trim, [0, plinth + H1 - 0.04, 0]);

  // 2F
  g.add(ShapeFactory.box(W - 0.25, H2, D - 0.25), wall, [0, y2, 0]);
  g.add(ShapeFactory.box(W - 0.05, 0.1, D - 0.05), trim, [0, plinth + H1 + 0.08 + H2, 0]);

  // Engawa
  g.add(ShapeFactory.box(W * 0.8, 0.12, 0.85), materials.get('woodMid'), [0, 0.26, D / 2 + 0.48]);
  for (let i = 0; i < 5; i++) {
    g.add(ShapeFactory.box(0.09, 0.22, 0.09), trimD, [-1.5 + i * 0.75, 0.11, D / 2 + 0.48]);
  }

  // Sliding glass door — human scale ~1.7
  g.add(ShapeFactory.box(1.55, 1.7, 0.06), trim, [-0.35, plinth + 0.9, D / 2 + 0.02]);
  g.add(ShapeFactory.box(1.42, 1.55, 0.04), glass, [-0.35, plinth + 0.9, D / 2 + 0.05]);
  g.add(ShapeFactory.box(0.05, 1.55, 0.07), trim, [-0.35, plinth + 0.9, D / 2 + 0.08]);

  // 1F window
  g.add(ShapeFactory.box(0.95, 0.7, 0.05), trim, [1.05, plinth + 1.3, D / 2 + 0.02]);
  g.add(ShapeFactory.box(0.84, 0.6, 0.03), glass, [1.05, plinth + 1.3, D / 2 + 0.05]);

  // 2F windows
  for (const wx of [-1.1, 0, 1.1] as const) {
    g.add(ShapeFactory.box(0.62, 0.7, 0.05), trim, [wx, y2 + 0.1, (D - 0.25) / 2 + 0.02]);
    g.add(ShapeFactory.box(0.52, 0.58, 0.03), wx === 0 ? warm : glass, [wx, y2 + 0.1, (D - 0.25) / 2 + 0.05]);
  }
  g.add(ShapeFactory.box(0.05, 0.65, 0.7), trim, [W / 2 - 0.02, y2, 0]);
  g.add(ShapeFactory.box(0.03, 0.55, 0.58), glass, [W / 2 + 0.01, y2, 0]);

  // Balcony
  const balY = plinth + H1 + 0.1;
  g.add(ShapeFactory.box(2.0, 0.08, 0.65), materials.get('concrete'), [0.15, balY, D / 2 + 0.42]);
  g.add(ShapeFactory.box(2.0, 0.42, 0.04), materials.get('metalGray'), [0.15, balY + 0.24, D / 2 + 0.7]);
  for (let i = 0; i < 6; i++) {
    g.add(ShapeFactory.box(0.035, 0.42, 0.035), materials.get('metalGray'), [-0.75 + i * 0.32, balY + 0.24, D / 2 + 0.7]);
  }

  // Downspouts
  for (const sx of [-1, 1] as const) {
    g.add(ShapeFactory.cylinder(0.035, 0.035, plinth + H1 + 0.08 + H2, 6), materials.get('metalGray'), [sx * (W / 2 - 0.08), (plinth + H1 + H2) / 2, D / 2 - 0.08]);
  }

  addWallTrim(g, W, D, plinth, plinth + H1, trim);
  addGableRoof(g, {
    W,
    D,
    roofY: plinth + H1 + 0.08 + H2,
    ridge: 0.85,
    overhang: 0.45,
    roofMat: roof,
    edgeMat: materials.get('houseRoofEdge'),
    wallMat: wall,
    thickness: 0.09,
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

  // Large modern windows
  g.add(ShapeFactory.box(1.4, 1.25, 0.05), metal, [-0.25, plinth + 1.1, D / 2 + 0.02]);
  g.add(ShapeFactory.box(1.28, 1.1, 0.03), glass, [-0.25, plinth + 1.1, D / 2 + 0.05]);
  g.add(ShapeFactory.box(0.75, 1.7, 0.12), materials.get('houseDoor'), [0.9, plinth + 0.9, D / 2 - 0.04]);
  g.add(ShapeFactory.box(0.55, 0.5, 0.03), glass, [0.9, plinth + 1.4, D / 2 + 0.03]);

  g.add(ShapeFactory.box(1.85, 0.55, 0.04), metal, [0, y2 + 0.15, (D + 0.12) / 2 + 0.02]);
  g.add(ShapeFactory.box(1.7, 0.45, 0.03), glass, [0, y2 + 0.15, (D + 0.12) / 2 + 0.05]);
  g.add(ShapeFactory.box(0.04, 0.85, 0.42), glass, [W / 2 + 0.1, y2, 0.3]);

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

  g.add(ShapeFactory.box(0.9, 0.65, 0.05), trim, [1.0, plinth + 1.25, D / 2 + 0.02]);
  g.add(ShapeFactory.box(0.78, 0.55, 0.03), glass, [1.0, plinth + 1.25, D / 2 + 0.05]);
  for (const wx of [-0.85, 0.5] as const) {
    g.add(ShapeFactory.box(0.55, 0.6, 0.05), trim, [wx, y2 + 0.1, (D - 0.1) / 2 + 0.02]);
    g.add(ShapeFactory.box(0.45, 0.5, 0.03), glass, [wx, y2 + 0.1, (D - 0.1) / 2 + 0.05]);
  }
  g.add(ShapeFactory.box(0.05, 0.55, 0.6), trim, [-W / 2 + 0.02, y2, 0.25]);
  g.add(ShapeFactory.box(0.03, 0.46, 0.5), glass, [-W / 2 - 0.01, y2, 0.25]);

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
  const CX = -4.6;
  const CZ = -3.8;
  pipe(CX, R, CZ - 0.65);
  pipe(CX, R, CZ + 0.65);
  pipe(CX, R * 2 + 0.04, CZ);

  // Dirt pad under pipes
  p.add(ShapeFactory.box(2.6, 0.04, 2.2), materials.get('dirtLight'), [CX, 0.02, CZ]);
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

  // House A — traditional, top-left
  const houseA = buildIkkodate({ variant: 'A', rotationY: 0.1, rng });
  houseA.position.set(-4.6, 0, 3.4);
  root.add(houseA);
  root.add(buildYard(rng, -4.6, 3.4, 'A'));

  // House B — modern compact, top-right
  const houseB = buildIkkodate({ variant: 'B', rotationY: -0.15, rng });
  houseB.position.set(4.3, 0, 3.2);
  root.add(houseB);
  root.add(buildYard(rng, 4.3, 3.2, 'B'));
  const car = buildKeiCar();
  car.position.set(3.5, 0, 1.4);
  car.rotation.y = Math.PI / 2 + 0.2;
  root.add(car);

  // House C — Showa, bottom-right
  const houseC = buildIkkodate({ variant: 'C', rotationY: Math.PI - 0.08, rng });
  houseC.position.set(4.5, 0, -3.5);
  root.add(houseC);
  root.add(buildYard(rng, 4.5, -3.5, 'C'));

  // Empty lot + concrete pipes, bottom-left
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
  const CX = -4.4;
  const CZ = -3.6;

  const dirtGeo = ShapeFactory.plane(2.0, 1.5);
  const dirtMats: THREE.Matrix4[] = [];
  for (let i = 0; i < 5; i++) {
    dirtMats.push(
      mat4(CX + rng.range(-2.0, 2.0), 0.012, CZ + rng.range(-1.6, 1.6), -Math.PI / 2, 0, rng.range(0, Math.PI), rng.range(0.5, 1.0), rng.range(0.5, 0.9), 1),
    );
  }
  lot.instance(dirtGeo, materials.get('dirt'), dirtMats, false, true);

  // Healthy summer grass (not dry)
  const tuftGeo = ShapeFactory.cone(0.035, 0.18, 4);
  tuftGeo.translate(0, 0.09, 0);
  const tuftMats: THREE.Matrix4[] = [];
  for (let i = 0; i < 40; i++) {
    const x = CX + rng.range(-2.4, 2.4);
    const z = CZ + rng.range(-1.8, 1.8);
    if (Math.abs(x) < 1.5 || Math.abs(z) < 1.1) continue;
    tuftMats.push(mat4(x, 0.02, z, 0, rng.range(0, Math.PI), 0, rng.range(0.8, 1.3), rng.range(0.9, 1.4), rng.range(0.8, 1.2)));
  }
  lot.instance(tuftGeo, materials.get('grassBlade'), tuftMats, false, true);

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
    [-2.6, 1.7, -2.6, 4.4, 'c'],
    [2.6, 1.6, 2.6, 4.3, 'c'],
    [2.6, -1.6, 2.6, -4.2, 'b'],
    [-6.4, 1.5, -2.2, 1.5, 'c'],
    [2.2, 1.5, 6.4, 1.5, 'c'],
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
