import * as THREE from 'three';
import { MeshBuilder, mat4 } from '../core/mesh';
import { materials } from '../core/materials';
import { ShapeFactory } from '../core/shapes';
import { Rng } from '../core/rng';

export type HouseVariant = 'A' | 'B' | 'C';

export interface HouseOptions {
  variant: HouseVariant;
  /** Facing direction in radians (0 = +Z / toward viewer-north). */
  rotationY?: number;
  rng: Rng;
}

/**
 * Reusable Japanese 一户建 (detached house).
 * Two-story body, gabled tile roof, wide eaves, sliding door, balcony.
 * Variants differ in wall color, balcony, garage attachment, age details.
 */
export function buildIkkodate(opts: HouseOptions): THREE.Group {
  const { variant, rng } = opts;
  const rotY = opts.rotationY ?? 0;

  const g = new MeshBuilder(`House_${variant}`);

  // Dimensions (slightly different per variant)
  const W = variant === 'B' ? 3.4 : 3.1; // width along local X
  const D = variant === 'C' ? 2.8 : 2.6; // depth along local Z
  const H1 = 1.55; // first floor
  const H2 = 1.35; // second floor
  const WALL = variant === 'A' ? 'houseWallA' : variant === 'B' ? 'houseWallB' : 'houseWallC';
  const wallMat = materials.get(WALL);
  const trim = materials.get('houseTrim');
  const roof = materials.get('houseRoof');
  const roofEdge = materials.get('houseRoofEdge');
  const glass = materials.get('houseWindow');
  const glassWarm = materials.get('houseWindowWarm');
  const door = materials.get('houseDoor');

  const bodyY0 = 0.08; // foundation lip
  const floor1Y = bodyY0 + H1 / 2;
  const floor2Y = bodyY0 + H1 + H2 / 2;

  // Foundation
  g.add(ShapeFactory.box(W + 0.15, 0.16, D + 0.15), materials.get('concrete'), [0, 0.08, 0]);

  // --- Floor 1 ---
  g.add(ShapeFactory.box(W, H1, D), wallMat, [0, floor1Y, 0]);
  // Corner posts (dark wood)
  const postGeo = ShapeFactory.box(0.1, H1 + 0.05, 0.1);
  for (const [px, pz] of [
    [-W / 2 + 0.04, -D / 2 + 0.04],
    [W / 2 - 0.04, -D / 2 + 0.04],
    [-W / 2 + 0.04, D / 2 - 0.04],
    [W / 2 - 0.04, D / 2 - 0.04],
  ] as const) {
    g.add(postGeo, trim, [px, floor1Y, pz]);
  }
  // Horizontal beam
  g.add(ShapeFactory.box(W + 0.06, 0.08, D + 0.06), trim, [0, bodyY0 + H1 - 0.02, 0]);

  // --- Floor 2 ---
  g.add(ShapeFactory.box(W - 0.12, H2, D - 0.12), wallMat, [0, floor2Y, 0]);
  const post2 = ShapeFactory.box(0.09, H2, 0.09);
  for (const [px, pz] of [
    [-W / 2 + 0.08, -D / 2 + 0.08],
    [W / 2 - 0.08, -D / 2 + 0.08],
    [-W / 2 + 0.08, D / 2 - 0.08],
    [W / 2 - 0.08, D / 2 - 0.08],
  ] as const) {
    g.add(post2, trim, [px, floor2Y, pz]);
  }

  // --- Sliding glass door (front = +Z) ---
  const doorY = bodyY0 + 0.55;
  g.add(ShapeFactory.box(1.1, 1.05, 0.05), trim, [-0.35, doorY, D / 2 + 0.02]);
  g.add(ShapeFactory.box(1.0, 0.95, 0.04), glass, [-0.35, doorY, D / 2 + 0.05]);
  // Door panel split
  g.add(ShapeFactory.box(0.04, 0.95, 0.05), trim, [-0.35, doorY, D / 2 + 0.06]);

  // --- Wooden entrance porch ---
  g.add(ShapeFactory.box(1.4, 0.08, 0.7), materials.get('woodMid'), [-0.35, 0.12, D / 2 + 0.4]);
  g.add(ShapeFactory.box(0.08, 0.12, 0.7), materials.get('woodDark'), [-0.95, 0.06, D / 2 + 0.4]);
  g.add(ShapeFactory.box(0.08, 0.12, 0.7), materials.get('woodDark'), [0.25, 0.06, D / 2 + 0.4]);
  // Small step
  g.add(ShapeFactory.box(0.5, 0.06, 0.35), materials.get('concrete'), [-0.35, 0.03, D / 2 + 0.85]);

  // --- 1F window ---
  g.add(ShapeFactory.box(0.7, 0.55, 0.05), trim, [0.7, bodyY0 + 0.95, D / 2 + 0.02]);
  g.add(ShapeFactory.box(0.62, 0.48, 0.03), glass, [0.7, bodyY0 + 0.95, D / 2 + 0.05]);

  // --- 2F windows ---
  for (const wx of [-0.7, 0.15, 0.85] as const) {
    const wm = wx === 0.15 ? glassWarm : glass;
    g.add(ShapeFactory.box(0.45, 0.5, 0.05), trim, [wx, floor2Y + 0.1, (D - 0.12) / 2 + 0.02]);
    g.add(ShapeFactory.box(0.38, 0.42, 0.03), wm, [wx, floor2Y + 0.1, (D - 0.12) / 2 + 0.05]);
    // Side windows
    g.add(ShapeFactory.box(0.05, 0.45, 0.4), trim, [W / 2 - 0.04, floor2Y + 0.05, 0]);
    g.add(ShapeFactory.box(0.03, 0.38, 0.32), glass, [W / 2 - 0.01, floor2Y + 0.05, 0]);
  }

  // --- Balcony (A & B) ---
  if (variant !== 'C') {
    const balY = bodyY0 + H1 + 0.05;
    g.add(ShapeFactory.box(1.6, 0.06, 0.55), materials.get('concrete'), [0.2, balY, D / 2 + 0.35]);
    // Rail
    g.add(ShapeFactory.box(1.6, 0.35, 0.04), materials.get('metalGray'), [0.2, balY + 0.2, D / 2 + 0.6]);
    for (let i = 0; i < 5; i++) {
      g.add(ShapeFactory.box(0.03, 0.35, 0.03), materials.get('metalGray'), [-0.5 + i * 0.35, balY + 0.2, D / 2 + 0.6]);
    }
  }

  // --- Roof: gabled with wide eaves ---
  const roofY = bodyY0 + H1 + H2;
  const ridge = 0.55;
  const overhang = 0.38;
  const roofLen = W + overhang * 2;
  const halfD = D / 2 + overhang * 0.75;
  // Two slabs
  const slabGeo = ShapeFactory.box(roofLen, 0.07, halfD + 0.15);
  const slabL = new THREE.Mesh(slabGeo, roof);
  slabL.position.set(0, roofY + ridge * 0.45, -halfD * 0.35);
  slabL.rotation.x = -0.38;
  slabL.castShadow = true;
  slabL.receiveShadow = true;
  g.child(slabL);
  const slabR = new THREE.Mesh(slabGeo, roof);
  slabR.position.set(0, roofY + ridge * 0.45, halfD * 0.35);
  slabR.rotation.x = 0.38;
  slabR.castShadow = true;
  slabR.receiveShadow = true;
  g.child(slabR);

  // Ridge
  g.add(ShapeFactory.box(roofLen - 0.1, 0.08, 0.12), roofEdge, [0, roofY + ridge, 0]);
  // Eave edge boards
  g.add(ShapeFactory.box(roofLen, 0.05, 0.06), roofEdge, [0, roofY + 0.02, -halfD]);
  g.add(ShapeFactory.box(roofLen, 0.05, 0.06), roofEdge, [0, roofY + 0.02, halfD]);
  // Gable ends
  const gableShape = new THREE.Shape();
  gableShape.moveTo(-D / 2 - overhang * 0.5, 0);
  gableShape.lineTo(D / 2 + overhang * 0.5, 0);
  gableShape.lineTo(0, ridge);
  gableShape.closePath();
  const gableGeo = ShapeFactory.extrude(gableShape, 0.08);
  gableGeo.center();
  for (const side of [-1, 1] as const) {
    const gab = new THREE.Mesh(gableGeo, wallMat);
    gab.rotation.y = Math.PI / 2;
    gab.position.set(side * (W / 2 + 0.02), roofY + ridge * 0.45, 0);
    gab.castShadow = true;
    g.child(gab);
  }

  // Tile suggestion strips on roof
  for (let i = 0; i < 6; i++) {
    const t = (i / 5) * halfD;
    g.add(
      ShapeFactory.box(roofLen - 0.05, 0.02, 0.04),
      roofEdge,
      [0, roofY + 0.22 + (halfD * 0.35 - t) * 0.4, -t],
      [-0.38, 0, 0],
    );
    g.add(
      ShapeFactory.box(roofLen - 0.05, 0.02, 0.04),
      roofEdge,
      [0, roofY + 0.22 + (halfD * 0.35 - t) * 0.4, t],
      [0.38, 0, 0],
    );
  }

  // --- AC outdoor unit (C & B) ---
  if (variant !== 'A') {
    g.add(ShapeFactory.box(0.45, 0.35, 0.25), materials.get('acUnit'), [-W / 2 - 0.15, 0.35, -0.4]);
    g.add(ShapeFactory.box(0.48, 0.04, 0.28), materials.get('metalDark'), [-W / 2 - 0.15, 0.54, -0.4]);
  }

  // --- Garage attachment (B) ---
  if (variant === 'B') {
    const gar = new MeshBuilder('Garage');
    gar.add(ShapeFactory.box(2.0, 1.3, 2.2), materials.get('houseShutter'), [0, 0.65, 0]);
    gar.add(ShapeFactory.box(2.15, 0.08, 2.35), roof, [0, 1.35, 0]);
    // Garage door
    gar.add(ShapeFactory.box(1.5, 1.0, 0.06), materials.get('houseShutter'), [0, 0.55, 1.12]);
    // Slats
    for (let i = 0; i < 4; i++) {
      gar.add(ShapeFactory.box(1.4, 0.04, 0.04), materials.get('metalDark'), [0, 0.25 + i * 0.22, 1.15]);
    }
    gar.transform([W / 2 + 1.1, 0, -0.2]);
    g.child(gar.build());
  }

  // --- Small storage shed (C) ---
  if (variant === 'C') {
    const shed = new MeshBuilder('Shed');
    shed.add(ShapeFactory.box(1.1, 0.9, 1.0), materials.get('shedWall'), [0, 0.45, 0]);
    shed.add(ShapeFactory.box(1.25, 0.08, 1.15), roof, [0, 0.95, 0], [0, 0, 0.08]);
    shed.add(ShapeFactory.box(0.45, 0.7, 0.05), materials.get('houseDoor'), [0, 0.35, 0.52]);
    shed.transform([-W / 2 - 0.75, 0, 0.3]);
    g.child(shed.build());
  }

  // Slight handmade irregularity
  g.transform(undefined, [0, rotY, 0]);
  // tiny random yaw already in rotY; add micro position jitter later at place time

  void rng;
  void mat4;
  void door;
  return g.build();
}

/** Simple low-poly Japanese kei car. */
export function buildKeiCar(colorBody = 'carBody'): THREE.Group {
  const c = new MeshBuilder('KeiCar');
  const body = materials.get(colorBody);
  const glass = materials.get('houseWindow');
  const tire = materials.get('bicycleTire');
  const metal = materials.get('metalGray');

  // Cabin box (tall kei proportions)
  c.add(ShapeFactory.box(1.0, 0.55, 0.72), body, [0, 0.42, 0]);
  // Lower body
  c.add(ShapeFactory.box(1.1, 0.28, 0.78), body, [0, 0.22, 0]);
  // Cabin greenhouse
  c.add(ShapeFactory.box(0.7, 0.35, 0.68), body, [-0.05, 0.75, 0]);
  // Windows
  c.add(ShapeFactory.box(0.55, 0.28, 0.7), glass, [-0.05, 0.75, 0]);
  // Windshield
  c.add(ShapeFactory.box(0.08, 0.3, 0.6), glass, [0.35, 0.7, 0], [0, 0, -0.4]);
  // Roof
  c.add(ShapeFactory.box(0.72, 0.05, 0.7), materials.get('metalDark'), [-0.05, 0.94, 0]);
  // Bumpers
  c.add(ShapeFactory.box(0.08, 0.18, 0.72), metal, [0.56, 0.2, 0]);
  c.add(ShapeFactory.box(0.08, 0.18, 0.72), metal, [-0.56, 0.2, 0]);
  // Headlights
  c.add(ShapeFactory.box(0.04, 0.08, 0.12), materials.get('trainHeadlight'), [0.58, 0.35, 0.25]);
  c.add(ShapeFactory.box(0.04, 0.08, 0.12), materials.get('trainHeadlight'), [0.58, 0.35, -0.25]);
  // Wheels
  const wheelGeo = ShapeFactory.cylinder(0.16, 0.16, 0.1, 8);
  wheelGeo.rotateX(Math.PI / 2);
  for (const wx of [0.32, -0.32] as const) {
    for (const side of [-1, 1] as const) {
      c.add(wheelGeo, tire, [wx, 0.16, side * 0.4]);
    }
  }
  return c.build();
}

/**
 * Residential quadrant layout builder — places houses + yards around the 田 crossing.
 * Base is 15×12; railway along X at z=0, road along Z at x=0.
 */
export function buildResidential(rng: Rng): THREE.Group {
  const root = new THREE.Group();
  root.name = 'Residential';

  // ========== House A: top-left (−X, +Z) ==========
  const houseA = buildIkkodate({ variant: 'A', rotationY: 0.08, rng });
  houseA.scale.setScalar(0.82);
  houseA.position.set(-4.8, 0, 3.6);
  root.add(houseA);
  root.add(buildYard(rng, -4.8, 3.6, 'A'));

  // ========== House B: top-right (+X, +Z) ==========
  const houseB = buildIkkodate({ variant: 'B', rotationY: -0.12, rng });
  houseB.scale.setScalar(0.8);
  houseB.position.set(4.4, 0, 3.4);
  root.add(houseB);
  root.add(buildYard(rng, 4.4, 3.4, 'B'));
  // Kei car in driveway
  const car = buildKeiCar();
  car.position.set(3.5, 0, 1.45);
  car.rotation.y = Math.PI / 2 + 0.15;
  root.add(car);

  // ========== House C: bottom-right (+X, −Z) ==========
  const houseC = buildIkkodate({ variant: 'C', rotationY: Math.PI - 0.1, rng });
  houseC.scale.setScalar(0.78);
  houseC.position.set(4.6, 0, -3.8);
  root.add(houseC);
  root.add(buildYard(rng, 4.6, -3.8, 'C'));

  // ========== Empty lot: bottom-left (−X, −Z) ==========
  root.add(buildEmptyLot(rng));

  // Shared: block walls along lot edges (not full perimeter — open feel)
  root.add(buildBlockWalls(rng));

  return root;
}

function buildYard(rng: Rng, hx: number, hz: number, variant: HouseVariant): THREE.Group {
  const y = new MeshBuilder(`Yard_${variant}`);

  // Stone path from house toward road
  const pathDir = hx < 0 ? 1 : -1; // toward center
  for (let i = 0; i < 4; i++) {
    y.add(
      ShapeFactory.box(0.35, 0.03, 0.28),
      materials.get('tileWalk'),
      [hx + pathDir * (1.8 + i * 0.45), 0.02, hz + rng.range(-0.15, 0.15)],
      [0, rng.range(-0.2, 0.2), 0],
    );
  }

  // Flower bed
  y.add(ShapeFactory.box(1.2, 0.12, 0.5), materials.get('soilBed'), [hx - 1.6, 0.06, hz + 1.6]);
  for (let i = 0; i < 5; i++) {
    const fx = hx - 1.6 + rng.range(-0.45, 0.45);
    const fz = hz + 1.6 + rng.range(-0.15, 0.15);
    y.add(ShapeFactory.cylinder(0.015, 0.015, 0.18, 4), materials.get('grassBlade'), [fx, 0.2, fz]);
    y.add(
      ShapeFactory.ico(0.05, 0),
      rng.bool() ? materials.get('flowerPink') : materials.get('flowerYellow'),
      [fx, 0.3, fz],
    );
  }

  // Clothesline (A & C)
  if (variant !== 'B') {
    const cl = new MeshBuilder('Clothesline');
    cl.add(ShapeFactory.cylinder(0.03, 0.035, 1.5, 5), materials.get('metalGray'), [0, 0.75, 0]);
    cl.add(ShapeFactory.cylinder(0.03, 0.035, 1.5, 5), materials.get('metalGray'), [2.0, 0.75, 0]);
    // Line
    const lineGeo = ShapeFactory.catenary(
      new THREE.Vector3(0, 1.45, 0),
      new THREE.Vector3(2.0, 1.45, 0),
      0.12,
      8,
    );
    cl.add(lineGeo, materials.get('wire'));
    // Hanging sheets
    const sheetGeo = ShapeFactory.plane(0.55, 0.7);
    for (let i = 0; i < 3; i++) {
      const sx = 0.35 + i * 0.55;
      const sheet = new THREE.Mesh(
        sheetGeo,
        i === 1 ? materials.get('clothBlue') : materials.get('clothWhite'),
      );
      sheet.position.set(sx, 1.05, 0);
      sheet.castShadow = true;
      cl.child(sheet);
      // Register gentle wind later via userData
      sheet.userData.windPhase = rng.range(0, Math.PI * 2);
      sheet.userData.isCloth = true;
    }
    cl.transform([hx + (variant === 'A' ? -2.2 : -2.0), 0, hz - 1.5]);
    y.child(cl.build());
  }

  // Mailbox
  const mb = new MeshBuilder('Mailbox');
  mb.add(ShapeFactory.box(0.22, 0.35, 0.12), materials.get('mailBox'), [0, 0.35, 0]);
  mb.add(ShapeFactory.box(0.24, 0.04, 0.14), materials.get('metalDark'), [0, 0.55, 0]);
  mb.add(ShapeFactory.box(0.04, 0.35, 0.04), materials.get('metalGray'), [0, 0.18, 0]);
  mb.transform([hx + (hx < 0 ? 2.0 : -2.0), 0, hz + 1.8]);
  y.child(mb.build());

  // Small trash bin
  y.add(ShapeFactory.cylinder(0.12, 0.1, 0.3, 7), materials.get('trash'), [hx + 1.4, 0.15, hz + 1.2]);

  // Potted plant
  y.add(ShapeFactory.cylinder(0.12, 0.1, 0.18, 7), materials.get('signRed'), [hx + 1.1, 0.09, hz + 1.9]);
  y.add(ShapeFactory.ico(0.14, 0), materials.get('leafA'), [hx + 1.1, 0.3, hz + 1.9]);

  // Hose coil (C)
  if (variant === 'C') {
    y.add(
      ShapeFactory.torus(0.15, 0.03, 6, 12),
      materials.get('leafC'),
      [hx - 1.5, 0.08, hz - 1.2],
      [-Math.PI / 2, 0, 0],
    );
  }

  // Second bike near entrance (A)
  if (variant === 'A') {
    // placed by props if needed — skip duplicate
  }

  return y.build();
}

function buildEmptyLot(rng: Rng): THREE.Group {
  const lot = new MeshBuilder('EmptyLot');
  // Center of bottom-left quadrant: roughly x -4, z -3.5
  const CX = -4.2;
  const CZ = -3.6;

  // Grass is already on base — add dirt patches (bare earth of vacant lot)
  const dirtGeo = ShapeFactory.plane(2.2, 1.6);
  const dirtMats: THREE.Matrix4[] = [];
  for (let i = 0; i < 6; i++) {
    dirtMats.push(
      mat4(
        CX + rng.range(-2.2, 2.2),
        0.012,
        CZ + rng.range(-1.8, 1.8),
        -Math.PI / 2,
        0,
        rng.range(0, Math.PI),
        rng.range(0.5, 1.1),
        rng.range(0.5, 1),
        1,
      ),
    );
  }
  lot.instance(dirtGeo, materials.get('dirt'), dirtMats, false, true);

  // Dry grass tufts
  const tuftGeo = ShapeFactory.cone(0.04, 0.2, 4);
  tuftGeo.translate(0, 0.1, 0);
  const tuftMats: THREE.Matrix4[] = [];
  for (let i = 0; i < 50; i++) {
    const x = CX + rng.range(-2.6, 2.6);
    const z = CZ + rng.range(-2.0, 2.0);
    if (Math.abs(x) < 1.6 || Math.abs(z) < 1.2) continue;
    tuftMats.push(mat4(x, 0.02, z, 0, rng.range(0, Math.PI), rng.range(-0.2, 0.2), rng.range(0.8, 1.4), rng.range(0.8, 1.6), rng.range(0.8, 1.3)));
  }
  lot.instance(tuftGeo, materials.get('grassDry'), tuftMats, false, true);

  // A few larger weed clumps
  const weedGeo = ShapeFactory.cone(0.06, 0.28, 4);
  weedGeo.translate(0, 0.14, 0);
  const weedMats: THREE.Matrix4[] = [];
  for (let i = 0; i < 12; i++) {
    weedMats.push(mat4(CX + rng.range(-2.4, 2.4), 0.02, CZ + rng.range(-1.8, 1.8), 0, rng.range(0, 3), 0, rng.range(0.7, 1.3), rng.range(0.9, 1.5), rng.range(0.7, 1.2)));
  }
  lot.instance(weedGeo, materials.get('leafC'), weedMats);

  // Stones
  const stoneGeo = ShapeFactory.ico(0.1, 0);
  const stoneMats: THREE.Matrix4[] = [];
  for (let i = 0; i < 8; i++) {
    const s = rng.range(0.5, 1.3);
    stoneMats.push(mat4(CX + rng.range(-2.5, 2.5), 0.05 * s, CZ + rng.range(-1.8, 1.8), 0, rng.range(0, 3), 0, s, s * 0.6, s));
  }
  lot.instance(stoneGeo, materials.get('stone'), stoneMats);

  // Simple wooden fence posts (partial, not enclosing)
  for (let i = 0; i < 5; i++) {
    lot.add(ShapeFactory.box(0.06, 0.45, 0.06), materials.get('fenceWood'), [CX - 2.8, 0.22, CZ - 1.5 + i * 0.7]);
  }
  lot.add(
    ShapeFactory.box(0.04, 0.04, 3.2),
    materials.get('fenceWood'),
    [CX - 2.8, 0.35, CZ - 0.1],
  );

  // One medium tree on the lot (Doraemon vacant-lot tree)
  const tree = new MeshBuilder('LotTree');
  tree.add(ShapeFactory.cylinder(0.08, 0.12, 1.4, 6), materials.get('trunk'), [0, 0.7, 0]);
  tree.add(ShapeFactory.ico(0.55, 0), materials.get('leafA'), [0, 1.6, 0], [0, 0.4, 0]);
  tree.add(ShapeFactory.ico(0.35, 0), materials.get('leafB'), [0.3, 1.85, 0.1]);
  tree.add(ShapeFactory.ico(0.3, 0), materials.get('leafC'), [-0.25, 1.7, -0.15]);
  tree.transform([CX + 1.8, 0, CZ + 0.8]);
  lot.child(tree.build());

  // Another smaller tree
  const tree2 = new MeshBuilder('LotTree2');
  tree2.add(ShapeFactory.cylinder(0.05, 0.08, 1.0, 5), materials.get('trunkDark'), [0, 0.5, 0]);
  tree2.add(ShapeFactory.ico(0.4, 0), materials.get('leafC'), [0, 1.2, 0]);
  tree2.transform([CX - 1.5, 0, CZ + 1.5]);
  lot.child(tree2.build());

  void rng;
  return lot.build();
}

function buildBlockWalls(rng: Rng): THREE.Group {
  const w = new MeshBuilder('BlockWalls');
  const wallMat = materials.get('concreteWall');
  // Low block walls separating yards from road (not full cages)
  const runs: [number, number, number, number][] = [
    // A yard along road
    [-2.9, 2.0, -2.9, 4.8],
    // B yard along road
    [2.9, 1.8, 2.9, 4.6],
    // C yard along road
    [2.9, -1.8, 2.9, -4.6],
    // Along railway back of A
    [-6.8, 1.6, -2.5, 1.6],
    // Along railway back of B
    [2.5, 1.6, 6.8, 1.6],
  ];
  for (const [x0, z0, x1, z1] of runs) {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const ang = Math.atan2(z1 - z0, x1 - x0);
    const mx = (x0 + x1) / 2;
    const mz = (z0 + z1) / 2;
    w.add(ShapeFactory.box(len, 0.55, 0.12), wallMat, [mx, 0.28, mz], [0, -ang, 0]);
    // Cap
    w.add(ShapeFactory.box(len, 0.05, 0.16), materials.get('houseTrim'), [mx, 0.58, mz], [0, -ang, 0]);
  }
  void rng;
  return w.build();
}

/** Wind animation for clothesline sheets. */
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
