import * as THREE from 'three';
import { MeshBuilder, mat4 } from '../core/mesh';
import { materials } from '../core/materials';
import { ShapeFactory } from '../core/shapes';
import { Rng } from '../core/rng';
import { crossingState } from '../core/animation';

export interface RailwayHandles {
  group: THREE.Group;
  /** Returns world Z offset of track centerline at given X (for props). */
  trackZ: (x: number) => number;
}

/**
 * Single-track local Japanese railway along X with slight curvature.
 * Elevated ballast bed, rails, wooden sleepers, signals, cable run.
 */
export function buildRailway(rng: Rng): RailwayHandles {
  const b = new MeshBuilder('Railway');
  const TRACK_LEN = 11.6;
  const SLEEPER_SPACING = 0.42;
  const RAIL_GAUGE = 0.72; // model-ish narrow gauge look
  const BALLAST_TOP = 0.14;
  const RAIL_H = 0.1;

  const trackZ = (x: number) => ShapeFactory.railwayPathZ(x, 0.06);

  // --- Ballast bed ---
  // Continuous slightly elevated bed with center crown
  const bedPts: THREE.Vector3[] = [];
  const segments = 48;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const x = -TRACK_LEN / 2 + t * TRACK_LEN;
    bedPts.push(new THREE.Vector3(x, BALLAST_TOP, trackZ(x)));
  }
  const bedCurve = new THREE.CatmullRomCurve3(bedPts);
  const bedGeo = new THREE.TubeGeometry(bedCurve, segments, 0.55, 4, false);
  // Flatten tube into a bed by scaling Y — use box-ish approach instead
  bedGeo.dispose();

  // Ballast as instanced pebble-ish boxes along track
  const pebbleGeo = ShapeFactory.box(0.22, 0.06, 0.28);
  const pebbleMats: THREE.Matrix4[] = [];
  for (let i = 0; i < 90; i++) {
    const x = rng.range(-TRACK_LEN / 2, TRACK_LEN / 2);
    const z = trackZ(x) + rng.range(-0.55, 0.55);
    const y = BALLAST_TOP - 0.02 + rng.range(-0.02, 0.02);
    pebbleMats.push(
      mat4(
        x,
        y,
        z,
        0,
        rng.range(0, Math.PI),
        rng.range(-0.1, 0.1),
        rng.range(0.7, 1.4),
        rng.range(0.6, 1.2),
        rng.range(0.7, 1.3),
      ),
    );
  }
  b.instance(pebbleGeo, materials.get('ballast'), pebbleMats);

  // Continuous dirt/gravel subgrade
  const subW = 1.5;
  const subD = 0.22;
  for (let i = 0; i < 28; i++) {
    const x = -TRACK_LEN / 2 + (i + 0.5) * (TRACK_LEN / 28);
    const z = trackZ(x);
    const ang = Math.atan2(trackZ(x + 0.2) - trackZ(x - 0.2), 0.4);
    b.add(
      ShapeFactory.box(TRACK_LEN / 28 + 0.02, subD, subW),
      materials.get('dirtDark'),
      [x, BALLAST_TOP - subD / 2 - 0.01, z],
      [0, -ang, 0],
    );
  }

  // --- Sleepers (InstancedMesh) ---
  const sleeperGeo = ShapeFactory.box(0.18, 0.07, RAIL_GAUGE + 0.42);
  const sleeperMats: THREE.Matrix4[] = [];
  const nSleepers = Math.floor(TRACK_LEN / SLEEPER_SPACING);
  for (let i = 0; i < nSleepers; i++) {
    const x = -TRACK_LEN / 2 + i * SLEEPER_SPACING + SLEEPER_SPACING / 2;
    const z = trackZ(x);
    const ang = Math.atan2(trackZ(x + 0.3) - trackZ(x - 0.3), 0.6);
    // Slight Y jitter for handmade look
    const y = BALLAST_TOP + 0.035 + rng.range(-0.004, 0.004);
    sleeperMats.push(mat4(x, y, z, 0, -ang, 0));
  }
  b.instance(sleeperGeo, materials.get('sleeper'), sleeperMats);

  // --- Rails ---
  // Two long boxes following the curve via small segments
  const railSegLen = 0.5;
  const railH = RAIL_H;
  const railW = 0.045;
  const railTopY = BALLAST_TOP + 0.07 + railH;

  for (const side of [-1, 1] as const) {
    const segCount = Math.floor(TRACK_LEN / railSegLen);
    for (let i = 0; i < segCount; i++) {
      const x = -TRACK_LEN / 2 + (i + 0.5) * railSegLen;
      const z0 = trackZ(x - railSegLen / 2) + (side * RAIL_GAUGE) / 2;
      const z1 = trackZ(x + railSegLen / 2) + (side * RAIL_GAUGE) / 2;
      const ang = Math.atan2(z1 - z0, railSegLen);
      const zMid = (z0 + z1) / 2;
      // Rail head
      b.add(
        ShapeFactory.box(railSegLen + 0.01, railH * 0.55, railW * 2),
        materials.get('rail'),
        [x, railTopY - railH * 0.22, zMid],
        [0, -ang, 0],
      );
      // Rail web (thinner)
      b.add(
        ShapeFactory.box(railSegLen + 0.01, railH * 0.5, railW * 0.7),
        materials.get('rail'),
        [x, railTopY - railH * 0.7, zMid],
        [0, -ang, 0],
      );
    }
  }

  // Crossing road panel (rails embedded in asphalt — flat metal plates)
  const crossX = 0;
  const crossZ = trackZ(0);
  b.add(
    ShapeFactory.box(1.6, 0.04, RAIL_GAUGE + 0.5),
    materials.get('metalDark'),
    [crossX, BALLAST_TOP + 0.055, crossZ],
  );
  // Rubber panels between rails
  for (const side of [-1, 1] as const) {
    b.add(
      ShapeFactory.box(1.5, 0.035, (0.55 - RAIL_GAUGE / 2) + 0.08),
      materials.get('warnBlack'),
      [crossX, BALLAST_TOP + 0.052, crossZ + side * (RAIL_GAUGE / 2 + 0.18)],
    );
  }

  // --- Signals ---
  const signals = new MeshBuilder('RailwaySignals');

  function buildSignal(x: number, side: number): THREE.Group {
    const sb = new MeshBuilder(`Signal_${side > 0 ? 'N' : 'S'}`);
    const z = trackZ(x) + side * 1.15;
    // Pole
    sb.add(ShapeFactory.cylinder(0.035, 0.045, 1.6, 6), materials.get('metalGray'), [0, 0.8, 0]);
    // Housing
    sb.add(ShapeFactory.box(0.22, 0.48, 0.14), materials.get('signalHousing'), [0, 1.55, 0]);
    // Visors
    sb.add(ShapeFactory.box(0.24, 0.04, 0.1), materials.get('metalDark'), [0, 1.7, 0.08]);
    sb.add(ShapeFactory.box(0.24, 0.04, 0.1), materials.get('metalDark'), [0, 1.48, 0.08]);
    // Lamps: green (top-ish), yellow, red
    const lampGeo = ShapeFactory.cylinder(0.055, 0.055, 0.04, 8);
    lampGeo.rotateX(Math.PI / 2);
    sb.add(lampGeo, materials.get('lampGreen'), [0, 1.68, 0.07]);
    sb.add(lampGeo, materials.get('lampYellow'), [0, 1.55, 0.07]);
    sb.add(lampGeo, materials.get('lampRed'), [0, 1.42, 0.07]);
    // Base plate
    sb.add(ShapeFactory.box(0.2, 0.06, 0.2), materials.get('concrete'), [0, 0.03, 0]);
    sb.transform([x, BALLAST_TOP, z]);
    return sb.build();
  }

  const signalA = buildSignal(-2.2, 1);
  const signalB = buildSignal(3.4, -1);
  signals.child(signalA);
  signals.child(signalB);

  // Cable along railway (simplified tube)
  const cablePts: THREE.Vector3[] = [];
  for (let i = 0; i <= 20; i++) {
    const x = -TRACK_LEN / 2 + (i / 20) * TRACK_LEN;
    cablePts.push(new THREE.Vector3(x, 0.08, trackZ(x) - 0.85));
  }
  const cableGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(cablePts), 40, 0.018, 5, false);
  signals.add(cableGeo, materials.get('wire'), [0, 0, 0]);

  // Mile marker posts
  for (const mx of [-4.5, 4.8]) {
    const mb = new MeshBuilder('MileMarker');
    mb.add(ShapeFactory.box(0.08, 0.55, 0.06), materials.get('concrete'), [0, 0.275, 0]);
    mb.add(ShapeFactory.box(0.1, 0.08, 0.02), materials.get('signWhite'), [0, 0.48, 0.04]);
    mb.transform([mx, BALLAST_TOP, trackZ(mx) + 0.95]);
    signals.child(mb.build());
  }

  b.child(signals.build());

  const group = b.build();

  // Dedicated signal materials (shared lampRed is also used by crossing)
  const sigGreen = materials.std('sigGreen', 0x0a3320, {
    roughness: 0.4,
    emissive: 0x22ff88,
    emissiveIntensity: 0.45,
  });
  const sigYellow = materials.std('sigYellow', 0x332a0a, {
    roughness: 0.4,
    emissive: 0xffaa22,
    emissiveIntensity: 0.15,
  });
  const sigRed = materials.std('sigRed', 0x330a0a, {
    roughness: 0.4,
    emissive: 0xff2211,
    emissiveIntensity: 0.1,
  });

  // Swap signal lamp materials to dedicated ones
  group.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const mat = m.material as THREE.Material;
    if (mat.name === 'lampGreen') m.material = sigGreen;
    else if (mat.name === 'lampYellow') m.material = sigYellow;
    else if (mat.name === 'lampRed') m.material = sigRed;
  });

  // Register signal update animation
  let smoothLevel = 0;
  const signalAnim = {
    name: 'railway-signals',
    update(_t: number, dt: number) {
      const target = crossingState.signalLevel;
      smoothLevel += (target - smoothLevel) * Math.min(1, dt * 3);
      const g = Math.max(0, 1 - smoothLevel * 1.2);
      const y = Math.max(0, 1 - Math.abs(smoothLevel - 1) * 1.2);
      const r = Math.max(0, (smoothLevel - 1) * 1.0);
      sigGreen.emissiveIntensity = 0.15 + g * 0.55;
      sigYellow.emissiveIntensity = 0.05 + y * 0.7;
      sigRed.emissiveIntensity = 0.05 + r * 0.95;
    },
  };

  // Attach anim for main to register
  (group as any).__anim = signalAnim;

  return { group, trackZ };
}
