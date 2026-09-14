import * as THREE from 'three';
import { MeshBuilder } from '../core/mesh';
import { materials } from '../core/materials';
import { ShapeFactory } from '../core/shapes';
import { Rng } from '../core/rng';

export interface StationHandles {
  group: THREE.Group;
}

/**
 * Tiny unmanned rural station shelter on the +Z side of the track.
 * Wooden posts, cream walls, dark tiled roof, bench, vending machine, warm lamp.
 */
export function buildStation(rng: Rng, trackZ: (x: number) => number): StationHandles {
  const b = new MeshBuilder('Station');
  // Place station west of crossing, +Z of track
  const SX = -2.6;
  const SZ = trackZ(SX) + 2.35;

  // --- Platform ---
  const plat = new MeshBuilder('Platform');
  plat.add(ShapeFactory.box(3.4, 0.28, 1.6), materials.get('concrete'), [0, 0.14, 0]);
  // Platform edge line (yellow safety)
  const edge = ShapeFactory.plane(3.3, 0.12);
  edge.rotateX(-Math.PI / 2);
  plat.add(edge, materials.get('lineYellow'), [0, 0.285, -0.68]);
  // Steps toward road
  plat.add(ShapeFactory.box(0.7, 0.12, 0.5), materials.get('concrete'), [1.85, 0.06, 0.2]);
  plat.transform([SX, 0.02, SZ]);
  b.child(plat.build());

  // --- Shelter ---
  const shelter = new MeshBuilder('Shelter');
  const SW = 2.6; // width along X
  const SD = 1.15; // depth along Z
  const postH = 1.85;

  // Floor
  shelter.add(ShapeFactory.box(SW, 0.08, SD), materials.get('woodMid'), [0, 0.32, 0]);

  // Corner posts (dark wood)
  const postGeo = ShapeFactory.box(0.1, postH, 0.1);
  for (const [px, pz] of [
    [-SW / 2 + 0.1, -SD / 2 + 0.1],
    [SW / 2 - 0.1, -SD / 2 + 0.1],
    [-SW / 2 + 0.1, SD / 2 - 0.1],
    [SW / 2 - 0.1, SD / 2 - 0.1],
  ] as const) {
    shelter.add(postGeo, materials.get('woodDark'), [px, 0.32 + postH / 2, pz]);
  }

  // Back wall (cream)
  shelter.add(
    ShapeFactory.box(SW - 0.15, postH - 0.2, 0.06),
    materials.get('wall'),
    [0, 0.32 + postH / 2, SD / 2 - 0.12],
  );
  // Side half-walls
  shelter.add(
    ShapeFactory.box(0.06, postH * 0.55, SD - 0.2),
    materials.get('wallShade'),
    [-SW / 2 + 0.12, 0.32 + postH * 0.28, 0],
  );
  shelter.add(
    ShapeFactory.box(0.06, postH * 0.55, SD - 0.2),
    materials.get('wallShade'),
    [SW / 2 - 0.12, 0.32 + postH * 0.28, 0],
  );

  // Horizontal beam
  shelter.add(
    ShapeFactory.box(SW, 0.1, 0.1),
    materials.get('woodDark'),
    [0, 0.32 + postH - 0.05, -SD / 2 + 0.1],
  );

  // --- Gabled roof ---
  const roofRidgeH = 0.45;
  const overhang = 0.28;
  // Two roof slabs
  const roofGeo = ShapeFactory.box(SW + overhang * 2, 0.06, SD / 2 + overhang * 0.7);
  const roofL = new THREE.Mesh(roofGeo, materials.get('roof'));
  roofL.position.set(0, 0.32 + postH + roofRidgeH / 2, -SD / 4 - 0.05);
  roofL.rotation.x = -0.42;
  roofL.castShadow = true;
  roofL.receiveShadow = true;
  shelter.child(roofL);

  const roofR = new THREE.Mesh(roofGeo, materials.get('roof'));
  roofR.position.set(0, 0.32 + postH + roofRidgeH / 2, SD / 4 + 0.05);
  roofR.rotation.x = 0.42;
  roofR.castShadow = true;
  roofR.receiveShadow = true;
  shelter.child(roofR);

  // Ridge beam
  shelter.add(
    ShapeFactory.box(SW + 0.2, 0.06, 0.08),
    materials.get('roofEdge'),
    [0, 0.32 + postH + roofRidgeH, 0],
  );

  // Tile suggestion — thin strips on roof
  for (let i = 0; i < 7; i++) {
    const t = (i / 6) * (SD / 2 + overhang * 0.5);
    shelter.add(
      ShapeFactory.box(SW + overhang * 2 - 0.05, 0.02, 0.04),
      materials.get('roofEdge'),
      [0, 0.32 + postH + 0.18 + (SD / 4 - t) * 0.35, -t - 0.05],
      [-0.42, 0, 0],
    );
  }

  // Eave underside
  shelter.add(
    ShapeFactory.box(SW + overhang * 1.5, 0.03, SD + overhang * 1.2),
    materials.get('woodLight'),
    [0, 0.32 + postH - 0.02, 0],
  );

  shelter.transform([SX, 0, SZ]);
  b.child(shelter.build());

  // --- Bench under shelter ---
  const bench = new MeshBuilder('Bench');
  bench.add(ShapeFactory.box(1.3, 0.06, 0.35), materials.get('benchWood'), [0, 0.42, 0]);
  bench.add(ShapeFactory.box(1.3, 0.06, 0.08), materials.get('benchWood'), [0, 0.72, -0.14]);
  for (const bx of [-0.5, 0.5] as const) {
    bench.add(ShapeFactory.box(0.06, 0.42, 0.3), materials.get('woodDark'), [bx, 0.21, 0]);
    bench.add(ShapeFactory.box(0.06, 0.28, 0.05), materials.get('woodDark'), [bx, 0.55, -0.14]);
  }
  bench.transform([SX - 0.2, 0.3, SZ + 0.15]);
  b.child(bench.build());

  // --- Station sign (小字站名牌) ---
  const sign = new MeshBuilder('StationSign');
  sign.add(ShapeFactory.cylinder(0.03, 0.035, 1.3, 6), materials.get('metalGray'), [0, 0.65, 0]);
  const plate = ShapeFactory.box(0.7, 0.28, 0.04);
  sign.add(plate, materials.get('signWhite'), [0, 1.25, 0]);
  // Green stripe (JR local style)
  sign.add(ShapeFactory.box(0.7, 0.06, 0.045), materials.get('leafC'), [0, 1.32, 0]);
  // Text suggestion blocks
  sign.add(ShapeFactory.box(0.35, 0.08, 0.02), materials.get('warnBlack'), [0, 1.22, 0.03]);
  sign.transform([SX + 1.4, 0.28, SZ - 0.75]);
  b.child(sign.build());

  // --- Warm hanging lamp under eave ---
  const lamp = new MeshBuilder('StationLamp');
  lamp.add(ShapeFactory.cylinder(0.015, 0.015, 0.25, 5), materials.get('metalDark'), [0, 0.12, 0]);
  lamp.add(ShapeFactory.cone(0.12, 0.12, 8), materials.get('metalDark'), [0, -0.02, 0]);
  const bulbGeo = ShapeFactory.ico(0.05, 0);
  lamp.add(bulbGeo, materials.get('lampWarm'), [0, -0.06, 0]);
  const lampLight = new THREE.PointLight(0xffb84d, 0.85, 3.5, 2);
  lampLight.position.set(0, -0.08, 0);
  lampLight.castShadow = false;
  lamp.child(lampLight);
  lamp.transform([SX + 0.3, 0.32 + 1.8, SZ]);
  b.child(lamp.build());

  // --- Vending machine ---
  const vend = new MeshBuilder('VendingMachine');
  vend.add(ShapeFactory.box(0.75, 1.55, 0.55), materials.get('vendingBody'), [0, 0.78, 0]);
  // White side panel
  vend.add(ShapeFactory.box(0.08, 1.4, 0.5), materials.get('vendingWhite'), [-0.34, 0.78, 0]);
  // Screen / product window
  vend.add(ShapeFactory.box(0.5, 0.7, 0.06), materials.get('vendingScreen'), [0, 1.05, 0.26]);
  // Buttons
  for (let i = 0; i < 3; i++) {
    vend.add(
      ShapeFactory.box(0.12, 0.06, 0.03),
      materials.get('vendingWhite'),
      [-0.15 + i * 0.15, 0.45, 0.28],
    );
  }
  // Coin slot
  vend.add(ShapeFactory.box(0.08, 0.03, 0.02), materials.get('metalDark'), [0.22, 0.55, 0.28]);
  // Top light strip
  vend.add(ShapeFactory.box(0.7, 0.08, 0.08), materials.get('vendingWhite'), [0, 1.58, 0.2]);
  // Feet
  for (const fx of [-0.28, 0.28] as const) {
    vend.add(ShapeFactory.box(0.1, 0.06, 0.4), materials.get('metalDark'), [fx, 0.03, 0]);
  }
  const vendLight = new THREE.PointLight(0x6a9fff, 0.35, 1.8, 2);
  vendLight.position.set(0, 1.05, 0.4);
  vend.child(vendLight);
  vend.transform([SX - 1.7, 0.1, SZ + 0.3]);
  b.child(vend.build());

  // --- Trash bin ---
  const trash = new MeshBuilder('TrashBin');
  trash.add(ShapeFactory.cylinder(0.18, 0.16, 0.45, 8), materials.get('trash'), [0, 0.225, 0]);
  trash.add(ShapeFactory.cylinder(0.19, 0.19, 0.04, 8), materials.get('metalDark'), [0, 0.47, 0]);
  trash.transform([SX + 1.1, 0.1, SZ + 0.55]);
  b.child(trash.build());

  // --- Rural street lamp ---
  const street = new MeshBuilder('StreetLamp');
  street.add(ShapeFactory.cylinder(0.04, 0.05, 2.6, 6), materials.get('metalGray'), [0, 1.3, 0]);
  // Curved arm (simple box bend)
  street.add(ShapeFactory.box(0.5, 0.05, 0.05), materials.get('metalGray'), [0.22, 2.55, 0]);
  street.add(ShapeFactory.box(0.05, 0.12, 0.16), materials.get('metalDark'), [0.48, 2.48, 0]);
  street.add(ShapeFactory.box(0.08, 0.04, 0.12), materials.get('lampWarm'), [0.48, 2.42, 0]);
  const sl = new THREE.PointLight(0xffb84d, 0.4, 4, 2);
  sl.position.set(0.48, 2.4, 0);
  street.child(sl);
  street.transform([SX + 2.2, 0.05, SZ + 0.9]);
  b.child(street.build());

  void rng;
  return { group: b.build() };
}
