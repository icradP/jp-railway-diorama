import * as THREE from 'three';
import { MeshBuilder } from '../core/mesh';
import { materials } from '../core/materials';
import { ShapeFactory } from '../core/shapes';
import { Rng } from '../core/rng';
import { ShapeFactory as SF } from '../core/shapes';

/**
 * Narrow two-lane rural road along Z, crossing the railway at x=0.
 * Asphalt with faded edge lines, stop line, drainage ditches.
 */
export function buildRoad(rng: Rng, trackZ: (x: number) => number): THREE.Group {
  const b = new MeshBuilder('Road');
  const ROAD_W = 2.4;
  const ROAD_L = 9.2;

  // Asphalt segments (slight color variation via two materials already)
  const segCount = 20;
  const segLen = ROAD_L / segCount;
  for (let i = 0; i < segCount; i++) {
    const z = -ROAD_L / 2 + (i + 0.5) * segLen;
    // Elevate slightly where over ballast
    const elev = Math.abs(z - trackZ(0)) < 1.2 ? 0.16 : 0.04;
    b.add(
      ShapeFactory.box(ROAD_W, 0.04, segLen + 0.01),
      materials.get('asphalt'),
      [0, elev, z],
    );
  }

  // Soft shoulders (dirt)
  for (const side of [-1, 1] as const) {
    b.add(
      ShapeFactory.box(0.35, 0.03, ROAD_L),
      materials.get('dirt'),
      [side * (ROAD_W / 2 + 0.15), 0.025, 0],
    );
  }

  // White edge lines (faded)
  for (const side of [-1, 1] as const) {
    const line = ShapeFactory.plane(0.08, ROAD_L - 0.4);
    line.rotateX(-Math.PI / 2);
    b.add(line, materials.get('lineWhite'), [side * (ROAD_W / 2 - 0.18), 0.065, 0]);
  }

  // Center dashed line (subtle, rural)
  for (let i = 0; i < 8; i++) {
    const z = -3.5 + i * 0.95;
    if (Math.abs(z) < 1.5) continue; // skip near crossing
    const dash = ShapeFactory.plane(0.07, 0.45);
    dash.rotateX(-Math.PI / 2);
    b.add(dash, materials.get('lineWhite'), [0, 0.065, z]);
  }

  // Stop lines before crossing (both approaches)
  for (const side of [-1, 1] as const) {
    const stopZ = side * 1.85;
    const stop = ShapeFactory.plane(ROAD_W - 0.25, 0.18);
    stop.rotateX(-Math.PI / 2);
    b.add(stop, materials.get('lineWhite'), [0, 0.065, stopZ]);
  }

  // Faded yellow diagonal hazard markings near gates
  for (const side of [-1, 1] as const) {
    for (let i = 0; i < 4; i++) {
      const mark = ShapeFactory.plane(0.12, 0.5);
      mark.rotateX(-Math.PI / 2);
      b.add(
        mark,
        materials.get('lineYellow'),
        [side * (0.7 + i * 0.15), 0.066, side * 2.15],
        [0, 0, side * 0.4],
      );
    }
  }

  // Drainage ditches beside road
  for (const side of [-1, 1] as const) {
    const ditchZ = 3.5;
    b.add(
      ShapeFactory.box(0.25, 0.12, 2.2),
      materials.get('drain'),
      [side * (ROAD_W / 2 + 0.4), 0.02, ditchZ * side],
    );
    // Grate
    for (let i = 0; i < 5; i++) {
      b.add(
        ShapeFactory.box(0.22, 0.02, 0.04),
        materials.get('metalDark'),
        [side * (ROAD_W / 2 + 0.4), 0.08, ditchZ * side - 0.8 + i * 0.4],
      );
    }
  }

  // Manhole
  const mh = ShapeFactory.cylinder(0.22, 0.22, 0.03, 10);
  b.add(mh, materials.get('drain'), [0.55, 0.065, 2.8]);

  // Small road pebbles / patches
  const patchGeo = ShapeFactory.box(0.3, 0.01, 0.2);
  const patchMats: THREE.Matrix4[] = [];
  for (let i = 0; i < 6; i++) {
    const z = rng.range(-4, 4);
    if (Math.abs(z) < 1.5) continue;
    patchMats.push(
      new THREE.Matrix4().compose(
        new THREE.Vector3(rng.range(-0.7, 0.7), 0.062, z),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rng.range(0, 1), 0)),
        new THREE.Vector3(rng.range(0.6, 1.2), 1, rng.range(0.6, 1.2)),
      ),
    );
  }
  b.instance(patchGeo, materials.get('asphalt'), patchMats, false, true);

  void SF;
  return b.build();
}
