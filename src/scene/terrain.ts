import * as THREE from 'three';
import { MeshBuilder, mat4 } from '../core/mesh';
import { materials } from '../core/materials';
import { ShapeFactory } from '../core/shapes';
import { Rng } from '../core/rng';

/**
 * Terrain — gentle hills at edges, grass transition, small stones.
 * Ground plane itself lives in DioramaBase; this module adds landscape depth.
 */
export function buildTerrain(rng: Rng): THREE.Group {
  const b = new MeshBuilder('Terrain');

  // Low hills along back (+Z) and sides — keep front open for camera
  const hillDefs = [
    { x: -3.8, z: 4.0, r: 1.15, h: 0.7 },
    { x: -0.8, z: 4.2, r: 0.95, h: 0.5 },
    { x: 2.9, z: 4.0, r: 1.2, h: 0.65 },
    { x: 4.9, z: 3.4, r: 0.85, h: 0.42 },
    { x: -5.1, z: 3.0, r: 0.8, h: 0.4 },
    { x: 5.3, z: -1.8, r: 0.7, h: 0.32 },
    { x: -5.4, z: -2.2, r: 0.75, h: 0.35 },
  ];

  for (const h of hillDefs) {
    const geo = ShapeFactory.hill(h.r, h.h, rng);
    const mat = rng.bool(0.5) ? materials.get('hill') : materials.get('hillFar');
    b.add(geo, mat, [h.x, h.h / 2 - 0.05, h.z]);
  }

  // Far treeline silhouettes on hills (simple cones as distant trees)
  const farTreeGeo = ShapeFactory.cone(0.18, 0.45, 6);
  const farTrunkGeo = ShapeFactory.cylinder(0.03, 0.04, 0.14, 5);
  const farTreeMats: THREE.Matrix4[] = [];
  const farTrunkMats: THREE.Matrix4[] = [];
  for (let i = 0; i < 18; i++) {
    const hx = rng.range(-5.2, 5.2);
    const hz = rng.range(2.6, 4.3);
    // Skip road corridor
    if (Math.abs(hx) < 1.6) continue;
    const s = rng.range(0.7, 1.3);
    farTreeMats.push(mat4(hx, 0.55 * s + 0.15, hz, 0, rng.range(0, Math.PI), 0, s, s, s));
    farTrunkMats.push(mat4(hx, 0.1 * s, hz, 0, 0, 0, s, s, s));
  }
  b.instance(farTreeGeo, materials.get('leafC'), farTreeMats);
  b.instance(farTrunkGeo, materials.get('trunkDark'), farTrunkMats);

  // Scattered small stones near railway edge (not on track)
  const stoneGeo = ShapeFactory.ico(0.08, 0);
  const stoneMats: THREE.Matrix4[] = [];
  for (let i = 0; i < 40; i++) {
    const x = rng.range(-5.5, 5.5);
    const z = rng.range(-4.5, 4.5);
    // Keep off road and track
    if (Math.abs(x) < 1.9 && Math.abs(z) < 3.5) continue;
    if (Math.abs(z) < 1.3) continue;
    const s = rng.range(0.5, 1.4);
    stoneMats.push(
      mat4(x, 0.04 * s, z, rng.range(0, 0.4), rng.range(0, Math.PI), 0, s, s * 0.7, s),
    );
  }
  b.instance(stoneGeo, materials.get('stone'), stoneMats);

  // Grass transition patches (darker/drier)
  const patchGeo = ShapeFactory.plane(1.4, 1.0);
  const patchMats: THREE.Matrix4[] = [];
  for (let i = 0; i < 12; i++) {
    const x = rng.range(-5.2, 5.2);
    const z = rng.range(-4.2, 4.2);
    if (Math.abs(x) < 1.8 || Math.abs(z) < 1.4) continue;
    patchMats.push(
      mat4(x, 0.008, z, -Math.PI / 2, 0, rng.range(0, Math.PI), rng.range(0.7, 1.5), rng.range(0.7, 1.3), 1),
    );
  }
  b.instance(patchGeo, materials.get('grassDry'), patchMats, false, true);

  return b.build();
}
