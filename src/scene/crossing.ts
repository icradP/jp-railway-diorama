import * as THREE from 'three';
import { MeshBuilder, mat4 } from '../core/mesh';
import { materials } from '../core/materials';
import { ShapeFactory } from '../core/shapes';
import { Rng } from '../core/rng';
import { crossingState } from '../core/animation';

export interface CrossingHandles {
  group: THREE.Group;
}

/**
 * Japanese railway crossing: red-white boom gates, warning lights,
 * cross signs, control box. Gates rotate around real mechanical pivots.
 */
export function buildCrossing(rng: Rng, trackZ: (x: number) => number): CrossingHandles {
  const b = new MeshBuilder('RailwayCrossing');
  const gatePivots: THREE.Object3D[] = [];
  const lampRedA: THREE.MeshStandardMaterial[] = [];
  const lampRedB: THREE.MeshStandardMaterial[] = [];

  // Dedicated lamp materials (cloned so each unit can blink independently)
  const lampA = (materials.get('lampRed') as THREE.MeshStandardMaterial).clone();
  lampA.name = 'xLightA';
  const lampB = (materials.get('lampRed') as THREE.MeshStandardMaterial).clone();
  lampB.name = 'xLightB';

  function buildGateAssembly(side: 1 | -1, xOffset: number): THREE.Group {
    // side: which side of the track the post sits; gate arm points toward road
    const z = trackZ(xOffset) + side * 0.95;
    const g = new MeshBuilder(`Gate_${side > 0 ? 'pos' : 'neg'}`);

    // Base concrete
    g.add(ShapeFactory.box(0.35, 0.08, 0.35), materials.get('concrete'), [0, 0.04, 0]);

    // Main post (yellow/black warning)
    g.add(ShapeFactory.box(0.14, 1.1, 0.14), materials.get('warnYellow'), [0, 0.6, 0]);
    // Black stripe bands
    g.add(ShapeFactory.box(0.15, 0.12, 0.15), materials.get('warnBlack'), [0, 0.45, 0]);
    g.add(ShapeFactory.box(0.15, 0.12, 0.15), materials.get('warnBlack'), [0, 0.8, 0]);

    // Mechanical housing / pivot box
    g.add(ShapeFactory.box(0.22, 0.18, 0.22), materials.get('metalDark'), [0, 1.12, 0]);
    // Bolt details
    for (const [bx, bz] of [
      [0.08, 0.08],
      [-0.08, 0.08],
      [0.08, -0.08],
      [-0.08, -0.08],
    ] as const) {
      g.add(ShapeFactory.cylinder(0.015, 0.015, 0.03, 5), materials.get('metalGray'), [bx, 1.2, bz]);
    }

    // Warning light housing (two lamps)
    g.add(ShapeFactory.box(0.28, 0.2, 0.1), materials.get('signalHousing'), [0, 1.35, 0.05]);
    const lampGeo = ShapeFactory.cylinder(0.06, 0.06, 0.05, 10);
    lampGeo.rotateX(Math.PI / 2);
    const lampMeshA = new THREE.Mesh(lampGeo, side > 0 ? lampA : lampB);
    lampMeshA.position.set(-0.08, 1.35, 0.11);
    lampMeshA.castShadow = false;
    const lampMeshB = new THREE.Mesh(lampGeo, side > 0 ? lampB : lampA);
    lampMeshB.position.set(0.08, 1.35, 0.11);
    lampMeshB.castShadow = false;
    // Small visors
    g.add(ShapeFactory.box(0.1, 0.02, 0.08), materials.get('metalDark'), [-0.08, 1.42, 0.12]);
    g.add(ShapeFactory.box(0.1, 0.02, 0.08), materials.get('metalDark'), [0.08, 1.42, 0.12]);

    // Crossbuck / 踏切 sign (X)
    const signShape = ShapeFactory.crossSignShape(0.28);
    const signGeo = ShapeFactory.extrude(signShape, 0.03);
    signGeo.center();
    const sign = new THREE.Mesh(signGeo, materials.get('signRed'));
    sign.position.set(0, 1.65, 0);
    sign.castShadow = true;
    const signWhite = new THREE.Mesh(signGeo.clone(), materials.get('signWhite'));
    signWhite.position.set(0, 1.65, 0);
    signWhite.scale.setScalar(0.92);
    signWhite.position.z = 0.02;
    signWhite.castShadow = true;

    // Small yellow supplementary plate
    g.add(ShapeFactory.box(0.16, 0.1, 0.03), materials.get('warnYellow'), [0, 1.48, -0.02]);

    // --- Gate arm pivot ---
    // Arm extends toward the road (−X or +X depending on side of approach)
    // Both sides: arm points toward road center (x=0)
    const armDir = xOffset > 0 ? -1 : 1; // if post is +X of road, arm points -X
    const pivot = new THREE.Group();
    pivot.name = `GatePivot_${side}`;
    pivot.position.set(0, 1.15, 0);

    // Counterweight opposite the arm
    pivot.add(
      makeMesh(ShapeFactory.box(0.25, 0.12, 0.1), materials.get('metalDark'), [-armDir * 0.15, 0, 0]),
    );

    // Arm segments (red-white stripes) — length ~2.0m to cover road
    const armLen = 2.05;
    const segs = 5;
    const segLen = armLen / segs;
    for (let i = 0; i < segs; i++) {
      const mat = i % 2 === 0 ? materials.get('gateRed') : materials.get('gateWhite');
      pivot.add(
        makeMesh(
          ShapeFactory.box(segLen + 0.01, 0.06, 0.08),
          mat,
          [armDir * (segLen * (i + 0.5)), 0, 0],
        ),
      );
    }
    // Arm tip light
    const tipLamp = new THREE.Mesh(ShapeFactory.ico(0.04, 0), lampA);
    tipLamp.position.set(armDir * armLen, 0, 0);
    pivot.add(tipLamp);

    // Hinge plate
    pivot.add(makeMesh(ShapeFactory.box(0.12, 0.14, 0.12), materials.get('metalGray'), [0, 0, 0]));

    g.child(pivot);
    gatePivots.push(pivot);

    // Local lights for bloom on warning lamps
    const pl = new THREE.PointLight(0xff2211, 0, 1.8, 2);
    pl.position.set(0, 1.35, 0.2);
    g.child(pl);

    g.child(lampMeshA);
    g.child(lampMeshB);

    g.transform([xOffset, 0.1, z]);
    return g.build();
  }

  // Four gate posts: two per approach side of the road
  // Road runs along Z through x=0. Gates on both sides of track.
  const g1 = buildGateAssembly(1, 1.55); // +Z side of track, east of road
  const g2 = buildGateAssembly(-1, 1.55); // -Z side, east of road
  const g3 = buildGateAssembly(1, -1.55); // +Z side, west of road
  const g4 = buildGateAssembly(-1, -1.55); // -Z side, west of road
  b.child(g1);
  b.child(g2);
  b.child(g3);
  b.child(g4);

  // --- Control box near crossing ---
  const cb = new MeshBuilder('ControlBox');
  cb.add(ShapeFactory.box(0.55, 0.85, 0.4), materials.get('controlBox'), [0, 0.45, 0]);
  // Door seam
  cb.add(ShapeFactory.box(0.015, 0.7, 0.02), materials.get('metalDark'), [0, 0.45, 0.21]);
  // Handle
  cb.add(ShapeFactory.box(0.04, 0.12, 0.04), materials.get('metalGray'), [0.12, 0.5, 0.22]);
  // Ventilation slits
  for (let i = 0; i < 4; i++) {
    cb.add(ShapeFactory.box(0.3, 0.02, 0.02), materials.get('metalDark'), [0, 0.7 + i * 0.04, 0.21]);
  }
  // Roof
  cb.add(ShapeFactory.box(0.6, 0.05, 0.45), materials.get('metalDark'), [0, 0.9, 0]);
  // Bolts
  for (const [bx, by] of [
    [0.22, 0.15],
    [-0.22, 0.15],
    [0.22, 0.75],
    [-0.22, 0.75],
  ] as const) {
    cb.add(ShapeFactory.cylinder(0.02, 0.02, 0.03, 5), materials.get('metalGray'), [bx, by, 0.21]);
  }
  // Base
  cb.add(ShapeFactory.box(0.65, 0.08, 0.5), materials.get('concrete'), [0, 0.04, 0]);
  cb.transform([2.3, 0.1, trackZ(2.3) + 1.4]);
  b.child(cb.build());

  // Second smaller utility box
  const ub = new MeshBuilder('UtilityBox');
  ub.add(ShapeFactory.box(0.3, 0.4, 0.25), materials.get('controlBox'), [0, 0.25, 0]);
  ub.add(ShapeFactory.box(0.34, 0.04, 0.28), materials.get('metalDark'), [0, 0.47, 0]);
  ub.transform([-2.8, 0.1, trackZ(-2.8) - 1.2]);
  b.child(ub.build());

  // Road-side reflective posts
  const refGeo = ShapeFactory.box(0.06, 0.7, 0.06);
  const refMats: THREE.Matrix4[] = [];
  for (const [px, pz] of [
    [1.35, 2.4],
    [1.35, -2.4],
    [-1.35, 2.4],
    [-1.35, -2.4],
  ] as const) {
    refMats.push(mat4(px, 0.45, pz));
  }
  b.instance(refGeo, materials.get('signWhite'), refMats);
  const refTipGeo = ShapeFactory.box(0.07, 0.1, 0.07);
  const refTipMats = refMats.map((m) => {
    const pos = new THREE.Vector3();
    pos.setFromMatrixPosition(m);
    return mat4(pos.x, 0.75, pos.z);
  });
  b.instance(refTipGeo, materials.get('signRed'), refTipMats);

  const group = b.build();

  // Collect point lights for blink
  const blinkLights: THREE.PointLight[] = [];
  group.traverse((o) => {
    if ((o as THREE.PointLight).isLight) blinkLights.push(o as THREE.PointLight);
  });

  lampRedA.push(lampA);
  lampRedB.push(lampB);

  const anim = {
    name: 'crossing-lights-gates',
    update(_t: number, dt: number) {
      // Gates rotate around local Z? Arm is along local X, so rotate around Z
      // When gateProgress=0, arm is raised (vertical-ish); =1 horizontal
      // Raise angle: about 75° up from horizontal
      const closedAngle = 0; // arm horizontal, pointing across road
      const openAngle = THREE.MathUtils.degToRad(75);
      const ang = THREE.MathUtils.lerp(openAngle, closedAngle, crossingState.gateProgress);
      // armDir determines sign; pivots alternate — apply same rotation direction
      // Each pivot's armDir is baked in child offsets; rotate pivot.rotation.z
      for (let i = 0; i < gatePivots.length; i++) {
        const p = gatePivots[i];
        const wp = new THREE.Vector3();
        p.getWorldPosition(wp);
        // East posts (+X): arm along -X → raise with negative rotation.z
        // West posts (-X): arm along +X → raise with positive rotation.z
        p.rotation.z = wp.x > 0 ? -ang : ang;
      }

      // Warning lamps
      const onA = crossingState.blinkA;
      const onB = crossingState.blinkB;
      const iA = onA ? 2.4 : 0.06;
      const iB = onB ? 2.4 : 0.06;
      for (const m of lampRedA) m.emissiveIntensity = iA;
      for (const m of lampRedB) m.emissiveIntensity = iB;
      for (const l of blinkLights) {
        l.intensity = (onA || onB) ? 0.55 : 0.05;
      }
      // Smooth a bit
      void dt;
    },
  };

  (group as any).__anim = anim;

  void rng;
  return { group };
}

function makeMesh(geo: THREE.BufferGeometry, mat: THREE.Material, pos: [number, number, number]): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(pos[0], pos[1], pos[2]);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}
