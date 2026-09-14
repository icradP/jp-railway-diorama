import * as THREE from 'three';
import { MeshBuilder, mat4 } from '../core/mesh';
import { materials } from '../core/materials';
import { ShapeFactory } from '../core/shapes';
import { Rng } from '../core/rng';

/** 12 × 10 m elevated display plinth with beveled edge. */
export function buildDioramaBase(rng: Rng): THREE.Group {
  const W = 12;
  const D = 10;
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

  // Corner feet (studio turntable feel)
  const footGeo = ShapeFactory.cylinder(0.18, 0.22, 0.12, 8);
  for (const [fx, fz] of [
    [W / 2 - 0.3, D / 2 - 0.3],
    [-W / 2 + 0.3, D / 2 - 0.3],
    [W / 2 - 0.3, -D / 2 + 0.3],
    [-W / 2 + 0.3, -D / 2 + 0.3],
  ] as const) {
    b.add(footGeo, materials.get('plinth'), [fx, -H - 0.06, fz]);
  }

  // Top soil/grass ground plane (slightly inset)
  const ground = ShapeFactory.groundPatch(W - 0.15, D - 0.15, 24, 20, 0.06, rng);
  b.add(ground, materials.get('grass'), [0, 0.001, 0]);

  // Soft dirt patches for variety
  const dirtGeo = ShapeFactory.plane(1.8, 1.2);
  const dirtMats: THREE.Matrix4[] = [];
  for (let i = 0; i < 8; i++) {
    dirtMats.push(
      mat4(
        rng.range(-5, 5),
        0.01,
        rng.range(-4, 4),
        -Math.PI / 2,
        0,
        rng.range(0, Math.PI),
        rng.range(0.6, 1.4),
        rng.range(0.6, 1.2),
        1,
      ),
    );
  }
  // Skip dirt near center road/rail — handled by road/railway modules
  b.instance(dirtGeo, materials.get('dirt'), dirtMats, false, true);

  return b.build();
}
