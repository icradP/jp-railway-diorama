import * as THREE from 'three';
import { MeshBuilder, mat4 } from '../core/mesh';
import { materials } from '../core/materials';
import { ShapeFactory } from '../core/shapes';
import { Rng } from '../core/rng';

/**
 * Terrain accents for residential block — stones only.
 * Hills removed so 一户建 yards stay clear; base already has grass/dirt.
 */
export function buildTerrain(rng: Rng): THREE.Group {
  const b = new MeshBuilder('Terrain');

  // Scattered small stones near road/rail edges
  const stoneGeo = ShapeFactory.ico(0.08, 0);
  const stoneMats: THREE.Matrix4[] = [];
  for (let i = 0; i < 36; i++) {
    const x = rng.range(-6.8, 6.8);
    const z = rng.range(-5.2, 5.2);
    if (Math.abs(x) < 1.9 && Math.abs(z) < 3.5) continue;
    if (Math.abs(z) < 1.3) continue;
    const s = rng.range(0.5, 1.3);
    stoneMats.push(mat4(x, 0.04 * s, z, rng.range(0, 0.4), rng.range(0, Math.PI), 0, s, s * 0.7, s));
  }
  b.instance(stoneGeo, materials.get('stone'), stoneMats);

  // Dry grass transition patches
  const patchGeo = ShapeFactory.plane(1.4, 1.0);
  const patchMats: THREE.Matrix4[] = [];
  for (let i = 0; i < 10; i++) {
    const x = rng.range(-6.5, 6.5);
    const z = rng.range(-5.0, 5.0);
    if (Math.abs(x) < 1.8 || Math.abs(z) < 1.4) continue;
    patchMats.push(
      mat4(x, 0.008, z, -Math.PI / 2, 0, rng.range(0, Math.PI), rng.range(0.7, 1.4), rng.range(0.7, 1.2), 1),
    );
  }
  b.instance(patchGeo, materials.get('grassDry'), patchMats, false, true);

  return b.build();
}
