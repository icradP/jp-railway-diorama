import * as THREE from 'three';
import { MeshBuilder, mat4 } from '../core/mesh';
import { materials } from '../core/materials';
import { ShapeFactory } from '../core/shapes';
import { Rng, windOffset } from '../core/rng';

export interface VegetationHandles {
  group: THREE.Group;
  /** Register wind animation onto AnimationManager externally. */
  createWindAnimation(): { name: string; update(t: number, dt: number): void };
}

/**
 * Low-poly trees, bushes, instanced grass, wildflowers.
 * All plants get independent wind phases.
 */
export function buildVegetation(rng: Rng): VegetationHandles {
  const b = new MeshBuilder('Vegetation');
  const swayers: { obj: THREE.Object3D; phase: number; amp: number; axis: 'x' | 'z' }[] = [];

  function registerSway(obj: THREE.Object3D, amp = 0.04): void {
    swayers.push({
      obj,
      phase: rng.range(0, Math.PI * 2),
      amp: rng.range(amp * 0.5, amp * 1.5),
      axis: rng.bool() ? 'x' : 'z',
    });
  }

  // --- Tree factory ---
  function makeTree(opts: {
    height: number;
    crownR: number;
    leafMat: string;
    multi?: boolean;
  }): THREE.Group {
    const t = new MeshBuilder('Tree');
    const h = opts.height;
    // Trunk
    t.add(
      ShapeFactory.cylinder(0.05 * h, 0.08 * h, h * 0.45, 6),
      materials.get('trunk'),
      [0, h * 0.225, 0],
    );
    // Branch stub
    t.add(
      ShapeFactory.cylinder(0.025 * h, 0.035 * h, h * 0.2, 5),
      materials.get('trunkDark'),
      [0.08 * h, h * 0.4, 0.04 * h],
      [0.3, 0, 0.5],
    );

    if (opts.multi) {
      // Sakura-style multi-blob crown
      const blobs: [number, number, number, number][] = [
        [0, 0.72, 0, 0.55],
        [0.35, 0.65, 0.1, 0.4],
        [-0.3, 0.68, -0.15, 0.42],
        [0.1, 0.85, -0.25, 0.38],
        [-0.15, 0.8, 0.3, 0.35],
      ];
      for (const [bx, by, bz, br] of blobs) {
        t.add(
          ShapeFactory.ico(opts.crownR * br * 2, 0),
          materials.get(opts.leafMat),
          [bx * h, by * h, bz * h],
          [rng.range(0, 1), rng.range(0, 1), 0],
        );
      }
    } else {
      // Cone / ico crown
      t.add(
        ShapeFactory.ico(opts.crownR, 1),
        materials.get(opts.leafMat),
        [0, h * 0.7, 0],
        [0, rng.range(0, Math.PI), 0],
      );
      t.add(
        ShapeFactory.ico(opts.crownR * 0.7, 0),
        materials.get(opts.leafMat === 'leafA' ? 'leafB' : 'leafC'),
        [0.1 * h, h * 0.85, -0.05 * h],
      );
    }
    return t.build();
  }

  // Sakura trees (moderate — diorama scale)
  const sakura1 = makeTree({ height: 1.55, crownR: 0.38, leafMat: 'sakura', multi: true });
  sakura1.position.set(-4.4, 0, 2.0);
  sakura1.rotation.y = 0.4;
  b.child(sakura1);
  registerSway(sakura1, 0.03);

  const sakura2 = makeTree({ height: 1.25, crownR: 0.32, leafMat: 'sakuraLight', multi: true });
  sakura2.position.set(4.0, 0, 2.8);
  sakura2.rotation.y = 1.2;
  b.child(sakura2);
  registerSway(sakura2, 0.035);

  // Maple
  const maple = makeTree({ height: 1.45, crownR: 0.36, leafMat: 'maple', multi: true });
  maple.position.set(4.7, 0, -1.9);
  maple.rotation.y = 0.8;
  b.child(maple);
  registerSway(maple, 0.03);

  // Generic trees — keep away from track/road and shrink
  for (const [tx, tz, th] of [
    [-4.9, -1.4, 1.25],
    [2.4, 3.6, 1.35],
    [-1.8, 3.9, 1.15],
    [5.1, 1.0, 1.1],
    [-5.1, 0.5, 1.2],
  ] as const) {
    if (Math.abs(tx) < 1.8) continue;
    const tree = makeTree({ height: th, crownR: 0.28, leafMat: rng.pick(['leafA', 'leafB', 'leafC']) });
    tree.position.set(tx, 0, tz);
    tree.rotation.y = rng.range(0, Math.PI * 2);
    b.child(tree);
    registerSway(tree, 0.025);
  }

  // Bamboo cluster
  const bamboo = new MeshBuilder('Bamboo');
  for (let i = 0; i < 8; i++) {
    const bh = rng.range(1.3, 1.9);
    const bx = rng.range(-0.28, 0.28);
    const bz = rng.range(-0.25, 0.25);
    bamboo.add(
      ShapeFactory.cylinder(0.02, 0.03, bh, 5),
      materials.get('bamboo'),
      [bx, bh / 2, bz],
      [rng.range(-0.06, 0.06), 0, rng.range(-0.06, 0.06)],
    );
    // Leaves
    for (let j = 0; j < 3; j++) {
      const ly = bh * (0.5 + j * 0.15);
      bamboo.add(
        ShapeFactory.cone(0.12, 0.06, 4),
        materials.get('bambooDark'),
        [bx + rng.range(-0.08, 0.08), ly, bz + rng.range(-0.08, 0.08)],
        [rng.range(0, 1), rng.range(0, 2), 0],
      );
    }
  }
  bamboo.transform([-3.6, 0, 3.3]);
  const bambooBuilt = bamboo.build();
  b.child(bambooBuilt);
  registerSway(bambooBuilt, 0.02);

  // Bushes — much smaller
  const bushGeo = ShapeFactory.ico(0.16, 0);
  const bushMats: THREE.Matrix4[] = [];
  for (let i = 0; i < 18; i++) {
    const x = rng.range(-5, 5);
    const z = rng.range(-4, 4);
    if (Math.abs(x) < 1.55 || Math.abs(z) < 1.1) continue;
    if (Math.abs(x + 2.6) < 1.9 && Math.abs(z - 2.3) < 1.3) continue; // station
    bushMats.push(
      mat4(x, 0.1, z, rng.range(0, 0.3), rng.range(0, Math.PI), 0, rng.range(0.7, 1.3), rng.range(0.5, 0.9), rng.range(0.7, 1.2)),
    );
  }
  b.instance(bushGeo, materials.get('leafC'), bushMats);

  // --- Grass (InstancedMesh) ---
  // Thin crossed planes or small cones
  const grassGeo = ShapeFactory.cone(0.035, 0.22, 4);
  grassGeo.translate(0, 0.11, 0);
  const grassMats: THREE.Matrix4[] = [];
  for (let i = 0; i < 420; i++) {
    const x = rng.range(-5.6, 5.6);
    const z = rng.range(-4.5, 4.5);
    // Avoid road and track
    if (Math.abs(x) < 1.45) continue;
    if (Math.abs(z) < 1.0) continue;
    // Avoid station platform
    if (x > -4.5 && x < -0.5 && z > 1.2 && z < 3.5) continue;
    const s = rng.range(0.6, 1.6);
    grassMats.push(
      mat4(x, 0.02, z, 0, rng.range(0, Math.PI), rng.range(-0.15, 0.15), s, s, s),
    );
  }
  b.instance(grassGeo, materials.get('grassBlade'), grassMats, false, true);

  // Dry grass tufts near track
  const dryGeo = ShapeFactory.cone(0.04, 0.18, 4);
  dryGeo.translate(0, 0.09, 0);
  const dryMats: THREE.Matrix4[] = [];
  for (let i = 0; i < 80; i++) {
    const x = rng.range(-5.5, 5.5);
    const z = rng.range(-1.6, 1.6);
    if (Math.abs(x) < 1.3) continue;
    if (Math.abs(z) < 0.95) continue;
    dryMats.push(mat4(x, 0.05, z, 0, rng.range(0, Math.PI), 0, rng.range(0.7, 1.3), rng.range(0.8, 1.4), rng.range(0.7, 1.2)));
  }
  b.instance(dryGeo, materials.get('grassDry'), dryMats, false, true);

  // Wildflowers
  const flowerStemGeo = ShapeFactory.cylinder(0.008, 0.008, 0.18, 4);
  const flowerStemMats: THREE.Matrix4[] = [];
  const flowerHeadMatsW: THREE.Matrix4[] = [];
  const flowerHeadMatsY: THREE.Matrix4[] = [];
  const flowerHeadMatsP: THREE.Matrix4[] = [];
  const flowerHeadGeo = ShapeFactory.ico(0.04, 0);
  for (let i = 0; i < 48; i++) {
    const x = rng.range(-5.2, 5.2);
    const z = rng.range(-4.2, 4.2);
    if (Math.abs(x) < 1.5 || Math.abs(z) < 1.1) continue;
    flowerStemMats.push(mat4(x, 0.1, z));
    const head = mat4(x, 0.2, z);
    const r = rng.next();
    if (r < 0.4) flowerHeadMatsW.push(head);
    else if (r < 0.7) flowerHeadMatsY.push(head);
    else flowerHeadMatsP.push(head);
  }
  b.instance(flowerStemGeo, materials.get('grassBlade'), flowerStemMats, false, false);
  b.instance(flowerHeadGeo, materials.get('flowerWhite'), flowerHeadMatsW, false, false);
  b.instance(flowerHeadGeo, materials.get('flowerYellow'), flowerHeadMatsY, false, false);
  b.instance(flowerHeadGeo, materials.get('flowerPink'), flowerHeadMatsP, false, false);

  // Fallen leaves near sakura
  const leafGeo = ShapeFactory.box(0.08, 0.01, 0.06);
  const leafMats: THREE.Matrix4[] = [];
  for (let i = 0; i < 24; i++) {
    const a = rng.range(0, Math.PI * 2);
    const r = rng.range(0.4, 1.6);
    const x = -4.2 + Math.cos(a) * r;
    const z = 1.8 + Math.sin(a) * r;
    leafMats.push(mat4(x, 0.02, z, 0, rng.range(0, Math.PI), 0));
  }
  b.instance(leafGeo, materials.get('sakura'), leafMats, false, true);

  const group = b.build();

  function createWindAnimation() {
    return {
      name: 'vegetation-wind',
      update(t: number, _dt: number) {
        for (const s of swayers) {
          const w = windOffset(t, s.phase, 0.7, s.amp);
          if (s.axis === 'x') {
            s.obj.rotation.x = w;
            s.obj.rotation.z = w * 0.4;
          } else {
            s.obj.rotation.z = w;
            s.obj.rotation.x = w * 0.35;
          }
        }
      },
    };
  }

  return { group, createWindAnimation };
}
