import * as THREE from 'three';
import { MeshBuilder } from '../core/mesh';
import { materials } from '../core/materials';
import { ShapeFactory } from '../core/shapes';
import { assets } from '../core/assets';
import { crossingState } from '../core/animation';

export interface TrainHandles {
  group: THREE.Group;
}

/** Must match railway.ts rail top height. */
const RAIL_TOP = 0.31;
const CAR_L = 2.7;
const CAR_W = 0.72;
const CAR_H = 0.95;
const HALF = CAR_L / 2;

const APPROACH_START = 9.2;
const DEPART_END = -9.6;
/** Stop beside the open area west of the crossing (vacant-lot side of track). */
const STOP_X = -2.6;
const CROSS_X = 0;
const OCCUPY_PAD = 1.0;
const TRIGGER_DIST = 4.8;

function easeMechanical(u: number): number {
  const s = u * u * (3 - 2 * u);
  return s * s * (3 - 2 * s);
}

/** Low-poly single-car Japanese rural railbus (キハ style). */
function buildRailcar(): THREE.Group {
  const b = new MeshBuilder('Railcar');
  const bodyY = RAIL_TOP + 0.42;

  // Underframe
  b.add(ShapeFactory.box(CAR_L, 0.12, CAR_W * 0.92), materials.get('metalDark'), [0, RAIL_TOP + 0.12, 0]);

  // Main body
  b.add(ShapeFactory.box(CAR_L - 0.08, CAR_H, CAR_W), materials.get('trainBody'), [0, bodyY, 0]);

  // Vermilion stripe
  for (const side of [-1, 1] as const) {
    b.add(
      ShapeFactory.box(CAR_L - 0.12, 0.12, 0.03),
      materials.get('trainStripe'),
      [0, bodyY - 0.18, side * (CAR_W / 2 + 0.01)],
    );
  }

  // Roof
  b.add(ShapeFactory.box(CAR_L + 0.06, 0.1, CAR_W + 0.08), materials.get('trainRoof'), [0, bodyY + CAR_H / 2 + 0.05, 0]);
  for (let i = 0; i < 5; i++) {
    const rx = -CAR_L / 2 + 0.35 + i * 0.5;
    b.add(ShapeFactory.box(0.06, 0.03, CAR_W + 0.1), materials.get('metalDark'), [rx, bodyY + CAR_H / 2 + 0.11, 0]);
  }
  b.add(ShapeFactory.box(0.5, 0.12, 0.35), materials.get('metalGray'), [-0.3, bodyY + CAR_H / 2 + 0.16, 0]);

  // Side windows
  const winY = bodyY + 0.12;
  for (let i = 0; i < 4; i++) {
    const wx = -0.9 + i * 0.55;
    for (const side of [-1, 1] as const) {
      b.add(ShapeFactory.box(0.38, 0.28, 0.03), materials.get('trainGlass'), [wx, winY, side * (CAR_W / 2 + 0.005)]);
    }
  }
  // Windshields
  b.add(ShapeFactory.box(0.04, 0.32, 0.5), materials.get('trainGlass'), [CAR_L / 2 - 0.02, winY + 0.02, 0]);
  b.add(ShapeFactory.box(0.04, 0.32, 0.5), materials.get('trainGlass'), [-CAR_L / 2 + 0.02, winY + 0.02, 0]);

  // Doors
  for (const side of [-1, 1] as const) {
    b.add(ShapeFactory.box(0.45, CAR_H - 0.2, 0.04), materials.get('trainDoor'), [0.55, bodyY - 0.05, side * (CAR_W / 2 + 0.01)]);
    b.add(ShapeFactory.box(0.35, 0.2, 0.045), materials.get('trainGlass'), [0.55, bodyY + 0.15, side * (CAR_W / 2 + 0.02)]);
  }

  // Headlights (+X = model front)
  const headGeo = ShapeFactory.cylinder(0.06, 0.06, 0.04, 8);
  headGeo.rotateZ(Math.PI / 2);
  b.add(headGeo, materials.get('trainHeadlight'), [CAR_L / 2 + 0.01, bodyY - 0.05, 0.18]);
  b.add(headGeo, materials.get('trainHeadlight'), [CAR_L / 2 + 0.01, bodyY - 0.05, -0.18]);
  const tailGeo = ShapeFactory.cylinder(0.045, 0.045, 0.03, 8);
  tailGeo.rotateZ(Math.PI / 2);
  b.add(tailGeo, materials.get('lampRed'), [-CAR_L / 2 - 0.01, bodyY - 0.05, 0.15]);
  b.add(tailGeo, materials.get('lampRed'), [-CAR_L / 2 - 0.01, bodyY - 0.05, -0.15]);
  b.add(ShapeFactory.box(0.04, 0.1, 0.28), materials.get('trainStripe'), [CAR_L / 2 + 0.01, bodyY + 0.32, 0]);

  // Bogies — wheel center sits on rail top (radius 0.13)
  const wheelGeo = ShapeFactory.cylinder(0.13, 0.13, 0.06, 10);
  wheelGeo.rotateX(Math.PI / 2);
  const axleY = RAIL_TOP - 0.13; // bottom of wheel = rail top
  for (const bx of [-0.75, 0.75] as const) {
    b.add(ShapeFactory.box(0.55, 0.1, CAR_W * 0.7), materials.get('metalDark'), [bx, RAIL_TOP + 0.1, 0]);
    for (const wx of [-0.18, 0.18] as const) {
      for (const side of [-1, 1] as const) {
        b.add(wheelGeo, materials.get('rail'), [bx + wx, axleY, side * (CAR_W * 0.38)]);
      }
    }
  }

  b.add(ShapeFactory.box(0.15, 0.08, 0.1), materials.get('metalGray'), [CAR_L / 2 + 0.08, RAIL_TOP + 0.16, 0]);
  b.add(ShapeFactory.box(0.15, 0.08, 0.1), materials.get('metalGray'), [-CAR_L / 2 - 0.08, RAIL_TOP + 0.16, 0]);

  const cabin = new THREE.PointLight(0xffc878, 0.4, 2.4, 2);
  cabin.position.set(0, bodyY + 0.1, 0);
  b.child(cabin);

  const head = new THREE.SpotLight(0xfff2d8, 0.8, 6.5, 0.5, 0.55, 1.4);
  head.position.set(CAR_L / 2 + 0.08, bodyY - 0.05, 0);
  head.target.position.set(CAR_L / 2 + 3.5, bodyY - 0.25, 0);
  b.child(head);
  b.child(head.target);

  return b.build();
}

export function registerTrainAsset(): void {
  assets.register({
    name: 'railcar',
    source: { kind: 'procedural', factory: () => buildRailcar() },
  });
}

/**
 * Westbound railcar: approach → station dwell → depart.
 * Crossing gates / signals are driven by train occupancy (no separate cycle).
 */
export function buildTrain(trackZ: (x: number) => number): TrainHandles {
  registerTrainAsset();
  const group = new THREE.Group();
  group.name = 'Train';

  const train = assets.loadSync('railcar');
  group.add(train);

  let x = APPROACH_START;
  let prevX = APPROACH_START;
  let phase: 'approach' | 'dwell' | 'depart' | 'reset' = 'approach';
  let dwellT = 0;
  let resetT = 0;
  let gateRaw = 0;
  let clearHold = 0;
  let blinkT = 0;

  const anim = {
    name: 'train-ops',
    priority: 10, // after signals read previous frame — ok, same frame is fine
    update(t: number, dt: number) {
      prevX = x;

      if (phase === 'approach') {
        const dist = x - STOP_X;
        const brakeZone = 3.0;
        let speed = 1.6;
        if (dist < brakeZone) {
          speed = 0.22 + easeMechanical(Math.max(0, dist / brakeZone)) * 1.35;
        }
        if (dist <= 0.03) {
          x = STOP_X;
          phase = 'dwell';
          dwellT = 0;
        } else {
          x -= speed * dt;
        }
      } else if (phase === 'dwell') {
        dwellT += dt;
        if (dwellT > 4.4) phase = 'depart';
      } else if (phase === 'depart') {
        // Accelerate away west
        const speed = 1.0 + Math.min(1.4, (STOP_X - x) * 0.35);
        x -= speed * dt;
        if (x < DEPART_END) {
          phase = 'reset';
          resetT = 0;
        }
      } else {
        resetT += dt;
        if (resetT > 2.0) {
          x = APPROACH_START;
          prevX = APPROACH_START;
          phase = 'approach';
        }
      }

      // --- Place on curved track ---
      const z = trackZ(x);
      // Heading: model front (+X local) must face travel direction (−X world when westbound)
      const zA = trackZ(x - 0.3);
      const zB = trackZ(x + 0.3);
      // Travel dir ≈ (x−0.3) − (x+0.3) = (−0.6, 0, zA−zB) normalized in XZ
      const travelYaw = Math.atan2(zA - zB, -0.6);
      train.visible = phase !== 'reset';
      train.position.set(x, 0, z);
      // Local +X is front → rotation.y = travelYaw
      train.rotation.y = travelYaw;

      // Motion bob / dwell sway
      if (phase === 'dwell') {
        train.position.y = Math.sin(t * 3.1) * 0.0035;
        train.rotation.z = Math.sin(t * 2.0) * 0.0025;
      } else if (phase === 'approach' || phase === 'depart') {
        train.position.y = Math.sin(t * 14) * 0.002;
        train.rotation.z = 0;
      } else {
        train.position.y = 0;
        train.rotation.z = 0;
      }

      train.traverse((o) => {
        if ((o as THREE.SpotLight).isSpotLight) {
          const moving = phase === 'approach' || phase === 'depart';
          (o as THREE.SpotLight).intensity = moving ? 1.0 : 0.12;
        }
      });

      // --- Crossing driven by occupancy ---
      // Westbound: front is −X, so nose = x − HALF, tail = x + HALF
      const noseX = x - HALF;
      const tailX = x + HALF;
      const visible = phase !== 'reset';
      const occupies = visible && noseX < CROSS_X + OCCUPY_PAD && tailX > CROSS_X - OCCUPY_PAD;
      const approaching =
        visible && phase === 'approach' && noseX > CROSS_X && noseX < CROSS_X + TRIGGER_DIST;

      if (approaching || occupies) {
        clearHold = 0;
        gateRaw = Math.min(1, gateRaw + dt / 2.0);
      } else {
        clearHold += dt;
        if (clearHold > 0.85) {
          gateRaw = Math.max(0, gateRaw - dt / 2.2);
        }
      }

      const gp = easeMechanical(gateRaw);
      crossingState.gateProgress = gp;

      if (gateRaw > 0.02 && gp < 0.2) crossingState.phase = 'alarm';
      else if (gateRaw > 0.02 && gp < 0.92) crossingState.phase = 'closing';
      else if (gp >= 0.92) crossingState.phase = 'closed';
      else if (gp > 0.02) crossingState.phase = 'opening';
      else crossingState.phase = 'idle';

      const blinkOn = gateRaw > 0.02;
      if (blinkOn) {
        blinkT += dt;
        const bt = blinkT % 1.0;
        crossingState.blinkA = bt < 0.5;
        crossingState.blinkB = bt >= 0.5;
      } else {
        crossingState.blinkA = false;
        crossingState.blinkB = false;
        blinkT = 0;
      }

      if (crossingState.phase === 'idle') crossingState.signalLevel = 0;
      else if (crossingState.phase === 'alarm' || crossingState.phase === 'opening') {
        crossingState.signalLevel = 1;
      } else {
        crossingState.signalLevel = 2;
      }
    },
  };

  (group as any).__anim = anim;
  (group as any).__trainState = () => ({ x, phase, prevX });

  return { group };
}
