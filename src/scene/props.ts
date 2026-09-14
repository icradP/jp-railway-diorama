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

  // --- Register & place bicycle (procedural, replaceable via GLTF) ---
  registerBicycle();
  const bike = assets.loadSync('bicycle');
  bike.position.set(-1.9, 0.1, trackZ(-1.9) + 2.15);
  bike.rotation.y = 0.5;
  b.child(bike);

  // Second bike
  const bike2 = assets.loadSync('bicycle');
  bike2.position.set(-1.55, 0.1, trackZ(-1.55) + 2.25);
  bike2.rotation.y = 0.7;
  bike2.scale.setScalar(0.95);
  b.child(bike2);

  // Bike racks
  const rack = new MeshBuilder('BikeRack');
  for (let i = 0; i < 3; i++) {
    const rx = -1.7 + i * 0.25;
    rack.add(ShapeFactory.box(0.04, 0.35, 0.04), materials.get('metalGray'), [rx, 0.18, 0]);
    rack.add(
      ShapeFactory.torus(0.12, 0.015, 6, 10, Math.PI),
      materials.get('metalGray'),
      [rx, 0.35, 0],
      [0, Math.PI / 2, 0],
    );
  }
  rack.transform([-1.7, 0.05, trackZ(-1.7) + 1.9]);
  b.child(rack.build());

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

/** Procedural bicycle — registered in AssetRegistry as replaceable asset. */
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

        // Wheels
        const wheelGeo = ShapeFactory.torus(0.28, 0.03, 8, 16);
        const rear = new THREE.Mesh(wheelGeo, tire);
        rear.position.set(-0.4, 0.28, 0);
        rear.castShadow = true;
        const front = new THREE.Mesh(wheelGeo, tire);
        front.position.set(0.4, 0.28, 0);
        front.castShadow = true;
        bike.child(rear);
        bike.child(front);

        // Hubs
        bike.add(ShapeFactory.cylinder(0.04, 0.04, 0.06, 6), metal, [-0.4, 0.28, 0], [Math.PI / 2, 0, 0]);
        bike.add(ShapeFactory.cylinder(0.04, 0.04, 0.06, 6), metal, [0.4, 0.28, 0], [Math.PI / 2, 0, 0]);

        // Frame tubes
        // Seat tube
        bike.add(ShapeFactory.box(0.04, 0.4, 0.04), frame, [-0.15, 0.45, 0], [0, 0, 0.3]);
        // Top tube
        bike.add(ShapeFactory.box(0.45, 0.035, 0.035), frame, [0.05, 0.62, 0]);
        // Down tube
        bike.add(ShapeFactory.box(0.5, 0.035, 0.035), frame, [0.1, 0.42, 0], [0, 0, -0.35]);
        // Chain stays
        bike.add(ShapeFactory.box(0.4, 0.025, 0.025), frame, [-0.25, 0.28, 0.04]);
        bike.add(ShapeFactory.box(0.4, 0.025, 0.025), frame, [-0.25, 0.28, -0.04]);
        // Seat stays
        bike.add(ShapeFactory.box(0.45, 0.025, 0.025), frame, [-0.28, 0.5, 0.04], [0, 0, 0.55]);
        bike.add(ShapeFactory.box(0.45, 0.025, 0.025), frame, [-0.28, 0.5, -0.04], [0, 0, 0.55]);
        // Fork
        bike.add(ShapeFactory.box(0.06, 0.4, 0.04), frame, [0.4, 0.45, 0.03], [0, 0, -0.15]);
        bike.add(ShapeFactory.box(0.06, 0.4, 0.04), frame, [0.4, 0.45, -0.03], [0, 0, -0.15]);
        // Handlebar
        bike.add(ShapeFactory.box(0.04, 0.2, 0.04), metal, [0.42, 0.7, 0]);
        bike.add(ShapeFactory.box(0.03, 0.03, 0.35), metal, [0.42, 0.78, 0]);
        // Seat
        bike.add(ShapeFactory.box(0.22, 0.05, 0.1), materials.get('warnBlack'), [-0.18, 0.68, 0]);
        // Pedal crank
        bike.add(ShapeFactory.cylinder(0.08, 0.08, 0.03, 6), metal, [-0.15, 0.28, 0.05], [Math.PI / 2, 0, 0]);
        // Basket
        bike.add(ShapeFactory.box(0.22, 0.15, 0.2), materials.get('metalGray'), [0.48, 0.72, 0]);

        return bike.build();
      },
    },
  });
}
