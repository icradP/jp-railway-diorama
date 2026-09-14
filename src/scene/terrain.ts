import * as THREE from 'three';
import { MeshBuilder, mat4 } from '../core/mesh';
import { materials } from '../core/materials';
import { ShapeFactory } from '../core/shapes';
import { Rng } from '../core/rng';

/**
 * Terrain accents — stones only. No coplanar ground patches (z-fight).
 */
export function buildTerrain(rng: Rng): THREE.Group {
  const b = new MeshBuilder('Terrain');

  const stoneGeo = ShapeFactory.ico(0.08, 0);
  const stoneMats: THREE.Matrix4[] = [];
  for (let i = 0; i < 28; i++) {
    const x = rng.range(-6.8, 6.8);
    const z = rng.range(-5.2, 5.2);
    if (Math.abs(x) < 1.9 && Math.abs(z) < 3.5) continue;
    if (Math.abs(z) < 1.3) continue;
    const s = rng.range(0.5, 1.2);
    stoneMats.push(mat4(x, 0.05 * s, z, rng.range(0, 0.4), rng.range(0, Math.PI), 0, s, s * 0.7, s));
  }
  b.instance(stoneGeo, materials.get('stone'), stoneMats);

  return b.build();
}
