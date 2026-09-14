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

/** Traditional, larger, engawa + deep eaves + complex gable. */
function buildHouseA(rng: Rng): THREE.Group {
  const g = new MeshBuilder('HouseA');
  const wall = materials.get('houseWallA');
  const trim = materials.get('houseTrim');
  const trimD = materials.get('houseTrimDark');
  const roof = materials.get('houseRoof');
  const glass = materials.get('houseWindow');
  const warm = materials.get('houseWindowWarm');

  const W = 3.6;
  const D = 3.0;
  const H1 = 1.6;
  const H2 = 1.4;

  g.add(ShapeFactory.box(W + 0.2, 0.18, D + 0.2), materials.get('concrete'), [0, 0.09, 0]);
  // 1F
  g.add(ShapeFactory.box(W, H1, D), wall, [0, 0.08 + H1 / 2, 0]);
  // Dark wood posts + beam band
  for (const [px, pz] of [
    [-W / 2 + 0.05, -D / 2 + 0.05],
    [W / 2 - 0.05, -D / 2 + 0.05],
    [-W / 2 + 0.05, D / 2 - 0.05],
    [W / 2 - 0.05, D / 2 - 0.05],
  ] as const) {
    g.add(ShapeFactory.box(0.12, H1, 0.12), trimD, [px, 0.08 + H1 / 2, pz]);
  }
  g.add(ShapeFactory.box(W + 0.08, 0.1, D + 0.08), trim, [0, 0.08 + H1 - 0.03, 0]);

  // 2F slightly inset
  g.add(ShapeFactory.box(W - 0.2, H2, D - 0.2), wall, [0, 0.08 + H1 + H2 / 2, 0]);
  g.add(ShapeFactory.box(W - 0.05, 0.08, D - 0.05), trim, [0, 0.08 + H1 + H2, 0]);

  // Engawa (wooden veranda) along front
  g.add(ShapeFactory.box(W * 0.85, 0.1, 0.7), materials.get('woodMid'), [0, 0.22, D / 2 + 0.4]);
  for (let i = 0; i < 5; i++) {
    g.add(ShapeFactory.box(0.08, 0.18, 0.08), trimD, [-1.4 + i * 0.7, 0.08, D / 2 + 0.4]);
  }

  // Sliding glass doors
  g.add(ShapeFactory.box(1.4, 1.15, 0.05), trim, [-0.3, 0.75, D / 2 + 0.02]);
  g.add(ShapeFactory.box(1.3, 1.05, 0.04), glass, [-0.3, 0.75, D / 2 + 0.05]);
  g.add(ShapeFactory.box(0.05, 1.05, 0.06), trim, [-0.3, 0.75, D / 2 + 0.07]);

  // 1F window
  g.add(ShapeFactory.box(0.8, 0.55, 0.05), trim, [0.95, 1.05, D / 2 + 0.02]);
  g.add(ShapeFactory.box(0.7, 0.48, 0.03), glass, [0.95, 1.05, D / 2 + 0.05]);

  // 2F windows
  for (const wx of [-0.9, 0.0, 0.9] as const) {
    g.add(ShapeFactory.box(0.5, 0.55, 0.05), trim, [wx, 0.08 + H1 + 0.25, (D - 0.2) / 2 + 0.02]);
    g.add(ShapeFactory.box(0.42, 0.46, 0.03), wx === 0 ? warm : glass, [wx, 0.08 + H1 + 0.25, (D - 0.2) / 2 + 0.05]);
  }
  // Side windows
  g.add(ShapeFactory.box(0.05, 0.5, 0.55), trim, [W / 2 - 0.02, 1.0, 0]);
  g.add(ShapeFactory.box(0.03, 0.42, 0.46), glass, [W / 2 + 0.01, 1.0, 0]);

  // Balcony
  const balY = 0.08 + H1 + 0.06;
  g.add(ShapeFactory.box(1.8, 0.06, 0.55), materials.get('concrete'), [0.1, balY, D / 2 + 0.38]);
  g.add(ShapeFactory.box(1.8, 0.38, 0.04), materials.get('metalGray'), [0.1, balY + 0.22, D / 2 + 0.62]);
  for (let i = 0; i < 6; i++) {
    g.add(ShapeFactory.box(0.03, 0.38, 0.03), materials.get('metalGray'), [-0.7 + i * 0.3, balY + 0.22, D / 2 + 0.62]);
  }

  // Deep gabled roof
  const roofY = 0.08 + H1 + H2;
  const ridge = 0.62;
  const ov = 0.48;
  const slab = ShapeFactory.box(W + ov * 2, 0.08, D / 2 + ov * 0.85);
  const L = new THREE.Mesh(slab, roof);
  L.position.set(0, roofY + ridge * 0.42, -(D / 2 + ov * 0.3));
  L.rotation.x = -0.4;
  L.castShadow = true;
  L.receiveShadow = true;
  g.child(L);
  const R = new THREE.Mesh(slab, roof);
  R.position.set(0, roofY + ridge * 0.42, D / 2 + ov * 0.3);
  R.rotation.x = 0.4;
  R.castShadow = true;
  R.receiveShadow = true;
  g.child(R);
  g.add(ShapeFactory.box(W + ov * 1.5, 0.08, 0.12), materials.get('houseRoofEdge'), [0, roofY + ridge, 0]);
  // Gable ends
  const gable = new THREE.Shape();
  gable.moveTo(-D / 2 - ov * 0.4, 0);
  gable.lineTo(D / 2 + ov * 0.4, 0);
  gable.lineTo(0, ridge);
  gable.closePath();
  const gg = ShapeFactory.extrude(gable, 0.1);
  gg.center();
  for (const s of [-1, 1] as const) {
    const m = new THREE.Mesh(gg, wall);
    m.rotation.y = Math.PI / 2;
    m.position.set(s * (W / 2 + 0.04), roofY + ridge * 0.42, 0);
    m.castShadow = true;
    g.child(m);
  }

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

  const W = 2.6;
  const D = 2.4;
  const H1 = 1.5;
  const H2 = 1.25;

  g.add(ShapeFactory.box(W + 0.12, 0.14, D + 0.12), materials.get('concrete'), [0, 0.07, 0]);

  // 1F with accent panel
  g.add(ShapeFactory.box(W, H1, D), wall, [0, 0.07 + H1 / 2, 0]);
  g.add(ShapeFactory.box(0.9, H1 - 0.1, 0.06), wall2, [-0.7, 0.07 + H1 / 2, D / 2 + 0.02]);

  // 2F
  g.add(ShapeFactory.box(W + 0.15, H2, D + 0.1), wall2, [0, 0.07 + H1 + H2 / 2, 0]);
  // Thin metal band between floors
  g.add(ShapeFactory.box(W + 0.18, 0.06, D + 0.12), metal, [0, 0.07 + H1, 0]);

  // Flat-ish roof with slight mono-pitch
  const roofY = 0.07 + H1 + H2;
  g.add(ShapeFactory.box(W + 0.35, 0.08, D + 0.3), roof, [0, roofY + 0.04, 0]);
  g.add(ShapeFactory.box(W + 0.1, 0.05, D + 0.05), materials.get('metalDark'), [0, roofY + 0.1, 0]);
  // Parapet
  g.add(ShapeFactory.box(W + 0.35, 0.12, 0.06), roof, [0, roofY + 0.14, (D + 0.3) / 2]);
  g.add(ShapeFactory.box(W + 0.35, 0.12, 0.06), roof, [0, roofY + 0.14, -(D + 0.3) / 2]);

  // Large modern windows
  g.add(ShapeFactory.box(1.2, 0.95, 0.05), metal, [-0.2, 0.85, D / 2 + 0.02]);
  g.add(ShapeFactory.box(1.1, 0.85, 0.03), glass, [-0.2, 0.85, D / 2 + 0.05]);
  // Entrance recessed
  g.add(ShapeFactory.box(0.7, 1.15, 0.15), materials.get('houseDoor'), [0.75, 0.65, D / 2 - 0.05]);
  g.add(ShapeFactory.box(0.5, 0.4, 0.03), glass, [0.75, 1.0, D / 2 + 0.03]);

  // 2F ribbon window
  g.add(ShapeFactory.box(1.6, 0.45, 0.04), metal, [0, 0.07 + H1 + 0.35, (D + 0.1) / 2 + 0.02]);
  g.add(ShapeFactory.box(1.5, 0.38, 0.03), glass, [0, 0.07 + H1 + 0.35, (D + 0.1) / 2 + 0.05]);
  // Side slit
  g.add(ShapeFactory.box(0.04, 0.7, 0.35), glass, [W / 2 + 0.09, 1.0, 0.3]);

  // Small balcony
  g.add(ShapeFactory.box(1.2, 0.05, 0.4), metal, [-0.2, 0.07 + H1 + 0.05, D / 2 + 0.3]);
  g.add(ShapeFactory.box(1.2, 0.3, 0.03), materials.get('metalGray'), [-0.2, 0.07 + H1 + 0.22, D / 2 + 0.48]);

  // Lean-to carport (attached, open)
  const cp = new MeshBuilder('Carport');
  cp.add(ShapeFactory.box(0.08, 1.35, 2.0), metal, [0, 0.68, 0]);
  cp.add(ShapeFactory.box(0.08, 1.35, 2.0), metal, [2.1, 0.68, 0]);
  cp.add(ShapeFactory.box(2.2, 0.06, 2.1), roof, [1.05, 1.38, 0], [0, 0, -0.08]);
  cp.transform([W / 2 + 0.1, 0, -0.15]);
  g.child(cp.build());

  // AC
  g.add(ShapeFactory.box(0.4, 0.32, 0.22), materials.get('acUnit'), [-W / 2 - 0.15, 0.4, -0.3]);

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

  const W = 2.9;
  const D = 2.5;
  const H1 = 1.45;
  const H2 = 1.2;

  g.add(ShapeFactory.box(W + 0.15, 0.14, D + 0.15), materials.get('concrete'), [0, 0.07, 0]);

  // 1F cream + wood lower band
  g.add(ShapeFactory.box(W, H1, D), wall, [0, 0.07 + H1 / 2, 0]);
  g.add(ShapeFactory.box(W + 0.02, 0.55, D + 0.02), wood, [0, 0.07 + 0.3, 0]);
  // Horizontal siding suggestion
  for (let i = 0; i < 3; i++) {
    g.add(ShapeFactory.box(W + 0.04, 0.03, D + 0.04), trim, [0, 0.18 + i * 0.16, 0]);
  }

  // 2F
  g.add(ShapeFactory.box(W - 0.08, H2, D - 0.08), wall, [0, 0.07 + H1 + H2 / 2, 0]);
  g.add(ShapeFactory.box(W - 0.05, 0.5, D - 0.05), wood, [0, 0.07 + H1 + 0.25, 0]);

  // Low-pitch gable
  const roofY = 0.07 + H1 + H2;
  const ridge = 0.42;
  const ov = 0.35;
  const slab = ShapeFactory.box(W + ov * 2, 0.07, D / 2 + ov * 0.7);
  const L = new THREE.Mesh(slab, roof);
  L.position.set(0, roofY + ridge * 0.4, -(D / 2 + ov * 0.25));
  L.rotation.x = -0.32;
  L.castShadow = true;
  L.receiveShadow = true;
  g.child(L);
  const R = new THREE.Mesh(slab, roof);
  R.position.set(0, roofY + ridge * 0.4, D / 2 + ov * 0.25);
  R.rotation.x = 0.32;
  R.castShadow = true;
  R.receiveShadow = true;
  g.child(R);
  g.add(ShapeFactory.box(W + ov, 0.06, 0.1), materials.get('houseRoofEdge'), [0, roofY + ridge, 0]);

  // Entrance with small canopy
  g.add(ShapeFactory.box(0.7, 1.1, 0.06), materials.get('houseDoor'), [-0.2, 0.62, D / 2 + 0.02]);
  g.add(ShapeFactory.box(1.0, 0.05, 0.55), roof, [-0.2, 1.3, D / 2 + 0.28], [0.15, 0, 0]);
  g.add(ShapeFactory.box(0.06, 1.0, 0.06), trim, [-0.7, 0.5, D / 2 + 0.45]);

  // Windows
  g.add(ShapeFactory.box(0.75, 0.5, 0.05), trim, [0.85, 1.0, D / 2 + 0.02]);
  g.add(ShapeFactory.box(0.66, 0.42, 0.03), glass, [0.85, 1.0, D / 2 + 0.05]);
  for (const wx of [-0.7, 0.4] as const) {
    g.add(ShapeFactory.box(0.42, 0.45, 0.05), trim, [wx, 0.07 + H1 + 0.35, (D - 0.08) / 2 + 0.02]);
    g.add(ShapeFactory.box(0.34, 0.36, 0.03), glass, [wx, 0.07 + H1 + 0.35, (D - 0.08) / 2 + 0.05]);
  }
  // Side
  g.add(ShapeFactory.box(0.05, 0.45, 0.5), trim, [-W / 2 + 0.02, 1.0, 0.2]);
  g.add(ShapeFactory.box(0.03, 0.38, 0.42), glass, [-W / 2 - 0.01, 1.0, 0.2]);

  // AC + pipe
  g.add(ShapeFactory.box(0.42, 0.34, 0.24), materials.get('acUnit'), [W / 2 + 0.15, 0.45, -0.5]);
  g.add(ShapeFactory.cylinder(0.03, 0.03, 0.8, 5), materials.get('metalGray'), [W / 2 + 0.15, 0.9, -0.5]);

  // Small storage lean-to at back
  g.add(ShapeFactory.box(1.0, 0.85, 0.9), materials.get('shedWall'), [-W / 2 - 0.6, 0.42, -0.3]);
  g.add(ShapeFactory.box(1.15, 0.06, 1.0), roof, [-W / 2 - 0.6, 0.9, -0.3], [0, 0, 0.1]);

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

  // House A — traditional, top-left, closer to road/rail
  const houseA = buildIkkodate({ variant: 'A', rotationY: 0.1, rng });
  houseA.scale.setScalar(0.88);
  houseA.position.set(-4.2, 0, 3.1);
  root.add(houseA);
  root.add(buildYard(rng, -4.2, 3.1, 'A'));

  // House B — modern compact, top-right
  const houseB = buildIkkodate({ variant: 'B', rotationY: -0.15, rng });
  houseB.scale.setScalar(0.9);
  houseB.position.set(3.9, 0, 3.0);
  root.add(houseB);
  root.add(buildYard(rng, 3.9, 3.0, 'B'));
  const car = buildKeiCar();
  car.position.set(3.3, 0, 1.35);
  car.rotation.y = Math.PI / 2 + 0.2;
  root.add(car);

  // House C — Showa, bottom-right
  const houseC = buildIkkodate({ variant: 'C', rotationY: Math.PI - 0.08, rng });
  houseC.scale.setScalar(0.88);
  houseC.position.set(4.1, 0, -3.3);
  root.add(houseC);
  root.add(buildYard(rng, 4.1, -3.3, 'C'));

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

  // Big vacant-lot tree (3-layer crown)
  const tree = new MeshBuilder('LotTree');
  tree.add(ShapeFactory.cylinder(0.1, 0.14, 1.5, 6), materials.get('trunk'), [0, 0.75, 0]);
  tree.add(ShapeFactory.ico(0.62, 0), materials.get('leafDeep'), [0, 1.7, 0]);
  tree.add(ShapeFactory.ico(0.48, 0), materials.get('leafA'), [0.2, 2.0, 0.1]);
  tree.add(ShapeFactory.ico(0.38, 0), materials.get('leafB'), [-0.15, 2.2, -0.1]);
  tree.add(ShapeFactory.ico(0.28, 0), materials.get('leafD'), [0.1, 2.4, 0.05]);
  tree.add(ShapeFactory.ico(0.18, 0), materials.get('leafE'), [0, 2.55, 0]);
  tree.transform([CX + 2.0, 0, CZ + 0.6]);
  lot.child(tree.build());

  // Second smaller tree
  const t2 = new MeshBuilder('LotTree2');
  t2.add(ShapeFactory.cylinder(0.06, 0.09, 1.0, 5), materials.get('trunkDark'), [0, 0.5, 0]);
  t2.add(ShapeFactory.ico(0.4, 0), materials.get('leafC'), [0, 1.2, 0]);
  t2.add(ShapeFactory.ico(0.25, 0), materials.get('leafD'), [0.15, 1.45, 0]);
  t2.transform([CX - 1.6, 0, CZ + 1.4]);
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
