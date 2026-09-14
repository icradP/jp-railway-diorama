import * as THREE from 'three';
import { MeshBuilder } from '../core/mesh';
import { materials } from '../core/materials';
import { ShapeFactory } from '../core/shapes';
import { Rng } from '../core/rng';
import { getAtlas, texMat } from '../core/textures';

export interface StationHandles {
  group: THREE.Group;
}

/**
 * Compact unmanned halt on the −Z side of the track (vacant-lot side),
 * west of the road. Shelter opens toward the rails; train stops alongside.
 */
export function buildStation(rng: Rng, trackZ: (x: number) => number): StationHandles {
  const b = new MeshBuilder('Station');
  const SX = -3.4;
  const SZ = trackZ(SX) - 2.45;
  const faceTrack = Math.PI;

  // --- Platform ---
  const plat = new MeshBuilder('Platform');
  plat.add(ShapeFactory.box(3.2, 0.28, 1.5), materials.get('concrete'), [0, 0.14, 0]);
  const edge = ShapeFactory.plane(3.1, 0.12);
  edge.rotateX(-Math.PI / 2);
  plat.add(edge, materials.get('lineYellow'), [0, 0.285, -0.62]);
  plat.add(ShapeFactory.box(0.65, 0.12, 0.45), materials.get('concrete'), [1.75, 0.06, 0.15]);
  plat.transform([SX, 0.02, SZ], [0, faceTrack, 0]);
  b.child(plat.build());

  // --- Shelter ---
  const shelter = new MeshBuilder('Shelter');
  const SW = 2.4;
  const SD = 1.1;
  const postH = 1.75;

  shelter.add(ShapeFactory.box(SW, 0.08, SD), materials.get('woodMid'), [0, 0.32, 0]);

  const postGeo = ShapeFactory.box(0.1, postH, 0.1);
  for (const [px, pz] of [
    [-SW / 2 + 0.1, -SD / 2 + 0.1],
    [SW / 2 - 0.1, -SD / 2 + 0.1],
    [-SW / 2 + 0.1, SD / 2 - 0.1],
    [SW / 2 - 0.1, SD / 2 - 0.1],
  ] as const) {
    shelter.add(postGeo, materials.get('woodDark'), [px, 0.32 + postH / 2, pz]);
  }

  shelter.add(
    ShapeFactory.box(SW - 0.15, postH - 0.2, 0.06),
    materials.get('wall'),
    [0, 0.32 + postH / 2, SD / 2 - 0.12],
  );
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
  shelter.add(
    ShapeFactory.box(SW, 0.1, 0.1),
    materials.get('woodDark'),
    [0, 0.32 + postH - 0.05, -SD / 2 + 0.1],
  );

  // Gabled roof
  const roofRidgeH = 0.42;
  const overhang = 0.26;
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
  shelter.add(
    ShapeFactory.box(SW + 0.15, 0.06, 0.08),
    materials.get('roofEdge'),
    [0, 0.32 + postH + roofRidgeH, 0],
  );
  shelter.add(
    ShapeFactory.box(SW + overhang * 1.4, 0.03, SD + overhang * 1.1),
    materials.get('woodLight'),
    [0, 0.32 + postH - 0.02, 0],
  );

  shelter.transform([SX, 0, SZ], [0, faceTrack, 0]);
  b.child(shelter.build());

  // --- Furniture (same local frame as halt) ---
  const furn = new MeshBuilder('StationFurniture');

  const bench = new MeshBuilder('Bench');
  bench.add(ShapeFactory.box(1.2, 0.06, 0.35), materials.get('benchWood'), [0, 0.42, 0]);
  bench.add(ShapeFactory.box(1.2, 0.06, 0.08), materials.get('benchWood'), [0, 0.72, -0.14]);
  for (const bx of [-0.45, 0.45] as const) {
    bench.add(ShapeFactory.box(0.06, 0.42, 0.3), materials.get('woodDark'), [bx, 0.21, 0]);
    bench.add(ShapeFactory.box(0.06, 0.28, 0.05), materials.get('woodDark'), [bx, 0.55, -0.14]);
  }
  bench.transform([-0.15, 0.3, 0.1]);
  furn.child(bench.build());

  const sign = new MeshBuilder('StationSign');
  sign.add(ShapeFactory.cylinder(0.03, 0.035, 1.25, 6), materials.get('metalGray'), [0, 0.62, 0]);
  // Textured name plate
  const plateMat = texMat(getAtlas().get('stationSign'), 0xffffff, { roughness: 0.6, metalness: 0.05 });
  const plate = new THREE.Mesh(ShapeFactory.box(0.85, 0.28, 0.04), plateMat);
  plate.position.set(0, 1.2, 0);
  plate.castShadow = true;
  sign.child(plate);
  // Back plate
  sign.add(ShapeFactory.box(0.88, 0.32, 0.02), materials.get('metalGray'), [0, 1.2, -0.03]);
  sign.transform([1.3, 0.28, -0.55]);
  furn.child(sign.build());

  // Timetable board
  const tt = new MeshBuilder('Timetable');
  tt.add(ShapeFactory.box(0.05, 1.1, 0.05), materials.get('metalGray'), [0, 0.55, 0]);
  const ttMat = texMat(getAtlas().get('timetable'), 0xffffff, { roughness: 0.7 });
  const ttBoard = new THREE.Mesh(ShapeFactory.box(0.28, 0.38, 0.03), ttMat);
  ttBoard.position.set(0, 0.95, 0.02);
  ttBoard.castShadow = true;
  tt.child(ttBoard);
  tt.add(ShapeFactory.box(0.32, 0.42, 0.02), materials.get('metalDark'), [0, 0.95, -0.01]);
  tt.transform([-0.9, 0.28, -0.5]);
  furn.child(tt.build());

  // Poster on shelter back wall
  const posterMat = texMat(getAtlas().get('poster'), 0xffffff, { roughness: 0.8 });
  const poster = new THREE.Mesh(ShapeFactory.box(0.28, 0.28, 0.02), posterMat);
  poster.position.set(-0.5, 1.05, 0.52);
  poster.castShadow = false;
  furn.child(poster);

  const lamp = new MeshBuilder('StationLamp');
  lamp.add(ShapeFactory.cylinder(0.015, 0.015, 0.22, 5), materials.get('metalDark'), [0, 0.11, 0]);
  lamp.add(ShapeFactory.cone(0.11, 0.1, 8), materials.get('metalDark'), [0, -0.02, 0]);
  lamp.add(ShapeFactory.ico(0.05, 0), materials.get('lampWarm'), [0, -0.05, 0]);
  const lampLight = new THREE.PointLight(0xffb84d, 0.85, 3.2, 2);
  lampLight.position.set(0, -0.08, 0);
  lampLight.castShadow = false;
  lamp.child(lampLight);
  lamp.transform([0.25, 0.32 + 1.7, -0.2]);
  furn.child(lamp.build());

  const vend = new MeshBuilder('VendingMachine');
  vend.add(ShapeFactory.box(0.7, 1.45, 0.52), materials.get('vendingBody'), [0, 0.75, 0]);
  vend.add(ShapeFactory.box(0.08, 1.3, 0.48), materials.get('vendingWhite'), [-0.32, 0.75, 0]);
  // Textured product window
  const vendPanel = new THREE.Mesh(
    ShapeFactory.box(0.48, 0.72, 0.04),
    texMat(getAtlas().get('vendingPanel'), 0xffffff, {
      roughness: 0.25,
      metalness: 0.2,
      emissive: 0x8ab0d0,
      emissiveIntensity: 0.55,
    }),
  );
  vendPanel.position.set(0, 1.0, 0.25);
  vend.child(vendPanel);
  for (let i = 0; i < 3; i++) {
    vend.add(ShapeFactory.box(0.1, 0.05, 0.03), materials.get('vendingWhite'), [-0.14 + i * 0.14, 0.42, 0.27]);
  }
  vend.add(ShapeFactory.box(0.08, 0.03, 0.02), materials.get('metalDark'), [0.2, 0.52, 0.27]);
  vend.add(ShapeFactory.box(0.65, 0.07, 0.07), materials.get('vendingWhite'), [0, 1.5, 0.18]);
  const vendLight = new THREE.PointLight(0x6a9fff, 0.4, 1.8, 2);
  vendLight.position.set(0, 1.0, 0.35);
  vend.child(vendLight);
  vend.transform([1.35, 0.1, 0.15]);
  furn.child(vend.build());

  const trash = new MeshBuilder('TrashBin');
  trash.add(ShapeFactory.cylinder(0.16, 0.14, 0.42, 8), materials.get('trash'), [0, 0.21, 0]);
  trash.add(ShapeFactory.cylinder(0.17, 0.17, 0.04, 8), materials.get('metalDark'), [0, 0.44, 0]);
  trash.transform([-1.25, 0.1, 0.35]);
  furn.child(trash.build());

  const street = new MeshBuilder('StreetLamp');
  street.add(ShapeFactory.cylinder(0.04, 0.05, 2.4, 6), materials.get('metalGray'), [0, 1.2, 0]);
  street.add(ShapeFactory.box(0.45, 0.05, 0.05), materials.get('metalGray'), [0.2, 2.35, 0]);
  street.add(ShapeFactory.box(0.05, 0.1, 0.14), materials.get('metalDark'), [0.42, 2.28, 0]);
  street.add(ShapeFactory.box(0.07, 0.04, 0.1), materials.get('lampWarm'), [0.42, 2.22, 0]);
  const sl = new THREE.PointLight(0xffb84d, 0.4, 3.8, 2);
  sl.position.set(0.42, 2.2, 0);
  street.child(sl);
  street.transform([-1.6, 0.05, 0.7]);
  furn.child(street.build());

  furn.transform([SX, 0, SZ], [0, faceTrack, 0]);
  b.child(furn.build());

  void rng;
  return { group: b.build() };
}
