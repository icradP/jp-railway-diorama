import * as THREE from 'three';
import { MeshBuilder, mat4 } from '../core/mesh';
import { materials } from '../core/materials';
import { ShapeFactory } from '../core/shapes';
import { Rng } from '../core/rng';
import { assets } from '../core/assets';

/**
 * Props: bicycle, utility poles + wires, fences, small signs.
 * Bicycle is registered via AssetRegistry so a GLB can replace it.
 */
export function buildProps(rng: Rng, trackZ: (x: number) => number): THREE.Group {
  const b = new MeshBuilder('Props');

  // --- Bicycles parked on platform, clear of shelter and platform edge ---
  registerBicycle();
  // Platform: center (-2.6, trackZ(-2.6)+2.35), size 3.4×1.6 → x ∈ [-4.3,-0.9]
  // Shelter footprint: x ∈ [-3.9,-1.3]. Safe parking strip: x ∈ [-1.25,-0.95]
  const platTop = 0.3;
  const platZ = trackZ(-2.6) + 2.35;
  const bike = assets.loadSync('bicycle');
  bike.position.set(-1.22, platTop, platZ - 0.28);
  bike.rotation.y = 0.12;
  bike.scale.setScalar(0.9);
  b.child(bike);

  const bike2 = assets.loadSync('bicycle');
  bike2.position.set(-0.98, platTop, platZ + 0.22);
  bike2.rotation.y = -0.1;
  bike2.scale.setScalar(0.88);
  b.child(bike2);

  // Simple ground stands under wheels (not overlapping)
  const stand = new MeshBuilder('BikeStand');
  for (const [sx, sz] of [
    [-1.22, platZ - 0.28],
    [-0.98, platZ + 0.22],
  ] as const) {
    stand.add(ShapeFactory.box(0.55, 0.02, 0.08), materials.get('metalDark'), [sx, platTop + 0.01, sz]);
  }
  b.child(stand.build());

  // --- Utility poles + wires ---
  function makePole(h: number): THREE.Group {
    const p = new MeshBuilder('Pole');
    p.add(ShapeFactory.cylinder(0.06, 0.08, h, 7), materials.get('poleWood'), [0, h / 2, 0]);
    // Crossarm
    p.add(ShapeFactory.box(0.9, 0.06, 0.06), materials.get('poleWood'), [0, h - 0.25, 0]);
    p.add(ShapeFactory.box(0.55, 0.05, 0.05), materials.get('poleWood'), [0, h - 0.55, 0]);
    // Insulators
    for (const ix of [-0.35, 0, 0.35] as const) {
      p.add(ShapeFactory.cylinder(0.03, 0.03, 0.08, 5), materials.get('concrete'), [ix, h - 0.18, 0]);
    }
    // Small transformer box on one pole
    return p.build();
  }

  const polePositions: THREE.Vector3[] = [
    new THREE.Vector3(4.2, 0, trackZ(4.2) + 1.55),
    new THREE.Vector3(-4.6, 0, trackZ(-4.6) + 1.45),
    new THREE.Vector3(-1.2, 0, trackZ(-1.2) + 3.9),
  ];

  for (const pos of polePositions) {
    const pole = makePole(2.7);
    pole.position.copy(pos);
    pole.position.y = 0.05;
    b.child(pole);
  }

  // Wires between poles (thinner, fewer strands)
  for (let i = 0; i < polePositions.length - 1; i++) {
    const a = polePositions[i].clone();
    const bb = polePositions[i + 1].clone();
    a.y += 2.45;
    bb.y += 2.45;
    for (const dy of [0, 0.28] as const) {
      const wireGeo = ShapeFactory.catenary(
        a.clone().setY(a.y - dy),
        bb.clone().setY(bb.y - dy),
        0.22 + dy * 0.08,
        10,
      );
      b.add(wireGeo, materials.get('wire'));
    }
  }

  // Wire from east pole toward station
  const p0 = polePositions[0].clone().setY(2.45);
  const p1 = new THREE.Vector3(-2.6, 2.35, trackZ(-2.6) + 2.3);
  b.add(ShapeFactory.catenary(p0, p1, 0.28, 12), materials.get('wire'));

  // --- Fence (wooden, rural) near field ---
  function fenceRun(x0: number, z0: number, x1: number, z1: number, posts: number): void {
    const dir = new THREE.Vector3(x1 - x0, 0, z1 - z0);
    const len = dir.length();
    dir.normalize();
    for (let i = 0; i <= posts; i++) {
      const t = i / posts;
      const px = x0 + (x1 - x0) * t;
      const pz = z0 + (z1 - z0) * t;
      b.add(ShapeFactory.box(0.05, 0.55, 0.05), materials.get('woodMid'), [px, 0.28, pz]);
    }
    // Rails
    for (const ry of [0.25, 0.45] as const) {
      const mid = new THREE.Vector3((x0 + x1) / 2, ry, (z0 + z1) / 2);
      const rail = ShapeFactory.box(len, 0.03, 0.03);
      const ang = Math.atan2(z1 - z0, x1 - x0);
      b.add(rail, materials.get('woodLight'), [mid.x, mid.y, mid.z], [0, -ang, 0]);
    }
  }

  fenceRun(-5.2, -2.8, -2.0, -3.2, 6);
  fenceRun(2.5, -3.4, 5.0, -2.6, 5);

  // --- Small warning signs along track ---
  function trackSign(x: number, side: number): void {
    const s = new MeshBuilder('TrackSign');
    s.add(ShapeFactory.cylinder(0.02, 0.025, 0.7, 5), materials.get('metalGray'), [0, 0.35, 0]);
    s.add(ShapeFactory.box(0.22, 0.18, 0.02), materials.get('signWhite'), [0, 0.72, 0]);
    s.add(ShapeFactory.box(0.18, 0.04, 0.025), materials.get('signRed'), [0, 0.75, 0.01]);
    s.transform([x, 0.08, trackZ(x) + side * 0.9]);
    b.child(s.build());
  }
  trackSign(1.8, 1);
  trackSign(-3.2, -1);

  // --- Wooden stakes / posts scattered ---
  const stakeGeo = ShapeFactory.box(0.06, 0.4, 0.06);
  const stakeMats: THREE.Matrix4[] = [];
  for (let i = 0; i < 8; i++) {
    const x = rng.range(-5, 5);
    const z = rng.range(-4, 4);
    if (Math.abs(x) < 1.8 || Math.abs(z) < 1.2) continue;
    stakeMats.push(mat4(x, 0.18, z, rng.range(-0.1, 0.1), rng.range(0, Math.PI), rng.range(-0.1, 0.1)));
  }
  b.instance(stakeGeo, materials.get('woodMid'), stakeMats);

  // --- Drainage culvert near road ---
  const drain = new MeshBuilder('Culvert');
  drain.add(ShapeFactory.box(0.5, 0.15, 0.4), materials.get('concrete'), [0, 0.08, 0]);
  drain.add(ShapeFactory.cylinder(0.12, 0.12, 0.5, 8), materials.get('drain'), [0, 0.08, 0], [0, 0, Math.PI / 2]);
  drain.transform([1.6, 0, 3.6]);
  b.child(drain.build());

  // --- Telephone junction box ---
  const jb = new MeshBuilder('JunctionBox');
  jb.add(ShapeFactory.box(0.25, 0.35, 0.2), materials.get('controlBox'), [0, 0.2, 0]);
  jb.add(ShapeFactory.box(0.28, 0.03, 0.22), materials.get('metalDark'), [0, 0.4, 0]);
  jb.transform([1.9, 0.05, 2.9]);
  b.child(jb.build());

  return b.build();
}

/** Procedural bicycle — compact mamachari, readable at diorama scale. */
function registerBicycle(): void {
  assets.register({
    name: 'bicycle',
    source: {
      kind: 'procedural',
      factory: () => {
        const bike = new MeshBuilder('Bicycle');
        const frame = materials.get('bicycleFrame');
        const tire = materials.get('bicycleTire');
        const metal = materials.get('metalGray');

        const R = 0.24;
        const T = 0.018; // thin tire
        const wheelGeo = ShapeFactory.torus(R, T, 6, 14);
        const rear = new THREE.Mesh(wheelGeo, tire);
        rear.position.set(-0.36, R, 0);
        rear.castShadow = true;
        const front = new THREE.Mesh(wheelGeo, tire);
        front.position.set(0.36, R, 0);
        front.castShadow = true;
        bike.child(rear);
        bike.child(front);

        // Spokes (simple)
        const spoke = ShapeFactory.box(0.015, R * 1.7, 0.015);
        bike.add(spoke, metal, [-0.36, R, 0], [0, 0, 0.4]);
        bike.add(spoke, metal, [0.36, R, 0], [0, 0, -0.3]);

        // Diamond frame
        bike.add(ShapeFactory.box(0.035, 0.32, 0.035), frame, [-0.12, R + 0.12, 0], [0, 0, 0.25]);
        bike.add(ShapeFactory.box(0.4, 0.03, 0.03), frame, [0.05, R + 0.28, 0]);
        bike.add(ShapeFactory.box(0.42, 0.03, 0.03), frame, [0.08, R + 0.12, 0], [0, 0, -0.28]);
        bike.add(ShapeFactory.box(0.32, 0.02, 0.02), frame, [-0.2, R, 0.03]);
        bike.add(ShapeFactory.box(0.32, 0.02, 0.02), frame, [-0.2, R, -0.03]);

        // Fork + bar
        bike.add(ShapeFactory.box(0.035, 0.3, 0.03), frame, [0.36, R + 0.14, 0.02], [0, 0, -0.12]);
        bike.add(ShapeFactory.box(0.035, 0.3, 0.03), frame, [0.36, R + 0.14, -0.02], [0, 0, -0.12]);
        bike.add(ShapeFactory.box(0.03, 0.14, 0.03), metal, [0.38, R + 0.32, 0]);
        bike.add(ShapeFactory.box(0.02, 0.02, 0.28), metal, [0.38, R + 0.38, 0]);

        // Seat
        bike.add(ShapeFactory.box(0.16, 0.035, 0.08), materials.get('warnBlack'), [-0.16, R + 0.32, 0]);
        // Basket
        bike.add(ShapeFactory.box(0.16, 0.1, 0.16), metal, [0.42, R + 0.28, 0]);
        // Kickstand
        bike.add(ShapeFactory.box(0.02, 0.18, 0.02), metal, [-0.1, R * 0.45, 0.06], [0.3, 0, 0.2]);

        return bike.build();
      },
    },
  });
}
