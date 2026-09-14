import * as THREE from 'three';
import { MeshBuilder, mat4 } from '../core/mesh';
import { materials } from '../core/materials';
import { ShapeFactory } from '../core/shapes';
import { Rng } from '../core/rng';

/** 15 × 12 m elevated display plinth — 田 residential block. */
export function buildDioramaBase(rng: Rng): THREE.Group {
  const W = 16;
  const D = 12;
  const H = 0.55;
  const EDGE = 0.22;

  const b = new MeshBuilder('DioramaBase');

  // Main dark plinth body
  b.add(ShapeFactory.box(W, H, D), materials.get('plinth'), [0, -H / 2, 0]);

  // Slightly larger top lip / edge trim
  b.add(
    ShapeFactory.box(W + 0.08, EDGE, D + 0.08),
    materials.get('plinthEdge'),
    [0, -EDGE / 2 + 0.001, 0],
  );

  // Wooden showcase rim (thin frame)
  const rimT = 0.06;
  const rimH = 0.12;
  const rimY = -0.02;
  b.add(ShapeFactory.box(W + 0.3, rimH, rimT), materials.get('woodDark'), [0, rimY, D / 2 + 0.1]);
  b.add(ShapeFactory.box(W + 0.3, rimH, rimT), materials.get('woodDark'), [0, rimY, -D / 2 - 0.1]);
  b.add(ShapeFactory.box(rimT, rimH, D + 0.3), materials.get('woodDark'), [W / 2 + 0.1, rimY, 0]);
  b.add(ShapeFactory.box(rimT, rimH, D + 0.3), materials.get('woodDark'), [-W / 2 - 0.1, rimY, 0]);

  // Corner feet
  const footGeo = ShapeFactory.cylinder(0.18, 0.22, 0.12, 8);
  for (const [fx, fz] of [
    [W / 2 - 0.3, D / 2 - 0.3],
    [-W / 2 + 0.3, D / 2 - 0.3],
    [W / 2 - 0.3, -D / 2 + 0.3],
    [-W / 2 + 0.3, -D / 2 + 0.3],
  ] as const) {
    b.add(footGeo, materials.get('plinth'), [fx, -H - 0.06, fz]);
  }

  // Top ground plane
  const ground = ShapeFactory.groundPatch(W - 0.15, D - 0.15, 28, 22, 0.05, rng);
  b.add(ground, materials.get('grass'), [0, 0.001, 0]);

  // Dirt patches (keep clear of road/rail)
  const dirtGeo = ShapeFactory.plane(1.8, 1.2);
  const dirtMats: THREE.Matrix4[] = [];
  for (let i = 0; i < 12; i++) {
    const x = rng.range(-6.5, 6.5);
    const z = rng.range(-5.2, 5.2);
    if (Math.abs(x) < 1.8 || Math.abs(z) < 1.4) continue;
    dirtMats.push(
      mat4(x, 0.01, z, -Math.PI / 2, 0, rng.range(0, Math.PI), rng.range(0.6, 1.4), rng.range(0.6, 1.2), 1),
    );
  }
  b.instance(dirtGeo, materials.get('dirt'), dirtMats, false, true);

  return b.build();
}
