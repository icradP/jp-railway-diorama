import * as THREE from 'three';
import { MeshBuilder } from '../core/mesh';
import { materials } from '../core/materials';
import { ShapeFactory } from '../core/shapes';
import { assets } from '../core/assets';
import { crossingState } from '../core/animation';

export interface TrainHandles {
  group: THREE.Group;
}

const RAIL_TOP = 0.31;
const CAR_L = 3.4; // longer diesel railcar
const CAR_W = 0.78;
const CAR_H = 1.05;
const HALF = CAR_L / 2;

const APPROACH_START = 9.5;
const DEPART_END = -9.8;
const STOP_X = -3.4;
const CROSS_X = 0;
const OCCUPY_PAD = 1.0;
const TRIGGER_DIST = 5.0;

function easeMechanical(u: number): number {
  const s = u * u * (3 - 2 * u);
  return s * s * (3 - 2 * s);
}

/**
 * Original local-line diesel railcar (山里線 style).
 * Cream body · burgundy stripe · blue accent · dark skirt · cab detail.
 */
function buildRailcar(): THREE.Group {
  const b = new MeshBuilder('DieselRailcar');
  const bodyY = RAIL_TOP + 0.48;
  const cream = materials.get('trainBody');
  const stripe = materials.get('trainStripe');
  const accent = materials.get('trainAccent');
  const skirt = materials.get('trainSkirt');
  const roofM = materials.get('trainRoof');
  const glass = materials.get('trainGlass');
  const grille = materials.get('trainGrille');

  // Underframe / dark skirt
  b.add(ShapeFactory.box(CAR_L, 0.22, CAR_W * 0.96), skirt, [0, RAIL_TOP + 0.12, 0]);
  b.add(ShapeFactory.box(CAR_L - 0.15, 0.08, CAR_W + 0.02), skirt, [0, RAIL_TOP + 0.24, 0]);

  // Main cream body
  b.add(ShapeFactory.box(CAR_L - 0.05, CAR_H, CAR_W), cream, [0, bodyY, 0]);

  // Burgundy waist stripe
  for (const side of [-1, 1] as const) {
    b.add(ShapeFactory.box(CAR_L - 0.1, 0.14, 0.03), stripe, [0, bodyY - 0.22, side * (CAR_W / 2 + 0.01)]);
    // Thin blue accent under stripe
    b.add(ShapeFactory.box(CAR_L - 0.1, 0.04, 0.025), accent, [0, bodyY - 0.32, side * (CAR_W / 2 + 0.012)]);
  }

  // Side windows (large local-line style)
  const winY = bodyY + 0.14;
  for (let i = 0; i < 5; i++) {
    const wx = -1.15 + i * 0.55;
    for (const side of [-1, 1] as const) {
      b.add(ShapeFactory.box(0.42, 0.32, 0.03), glass, [wx, winY, side * (CAR_W / 2 + 0.005)]);
      // Rubber frame hint
      b.add(ShapeFactory.box(0.46, 0.36, 0.02), skirt, [wx, winY, side * (CAR_W / 2 + 0.002)]);
    }
  }

  // Doors with handles
  for (const side of [-1, 1] as const) {
    for (const dx of [-0.55, 0.85] as const) {
      b.add(ShapeFactory.box(0.5, CAR_H - 0.25, 0.04), cream, [dx, bodyY - 0.05, side * (CAR_W / 2 + 0.015)]);
      b.add(ShapeFactory.box(0.38, 0.35, 0.03), glass, [dx, bodyY + 0.2, side * (CAR_W / 2 + 0.03)]);
      b.add(ShapeFactory.box(0.03, 0.1, 0.03), materials.get('metalGray'), [dx + 0.18, bodyY - 0.1, side * (CAR_W / 2 + 0.04)]);
    }
  }

  // Side panels / vents / warning marks
  for (const side of [-1, 1] as const) {
    b.add(ShapeFactory.box(0.25, 0.12, 0.02), grille, [0.15, bodyY - 0.4, side * (CAR_W / 2 + 0.02)]);
    b.add(ShapeFactory.box(0.12, 0.06, 0.02), stripe, [-1.3, bodyY + 0.38, side * (CAR_W / 2 + 0.02)]);
  }

  // --- Cab front (+X) ---
  // Sloped nose lower
  b.add(ShapeFactory.box(0.25, 0.35, CAR_W * 0.9), cream, [CAR_L / 2 - 0.05, bodyY - 0.25, 0]);
  // Large windshield
  b.add(ShapeFactory.box(0.05, 0.38, CAR_W * 0.85), glass, [CAR_L / 2 - 0.01, bodyY + 0.12, 0]);
  // Side cab windows
  for (const side of [-1, 1] as const) {
    b.add(ShapeFactory.box(0.35, 0.32, 0.03), glass, [CAR_L / 2 - 0.25, bodyY + 0.12, side * (CAR_W / 2 + 0.005)]);
  }
  // Grille / radiator
  b.add(ShapeFactory.box(0.06, 0.28, 0.45), grille, [CAR_L / 2 + 0.01, bodyY - 0.28, 0]);
  for (let i = 0; i < 4; i++) {
    b.add(ShapeFactory.box(0.02, 0.04, 0.4), materials.get('metalDark'), [CAR_L / 2 + 0.04, bodyY - 0.38 + i * 0.07, 0]);
  }
  // Destination board
  b.add(ShapeFactory.box(0.04, 0.1, 0.3), stripe, [CAR_L / 2 + 0.01, bodyY + 0.38, 0]);

  // Round headlights
  const headGeo = ShapeFactory.cylinder(0.07, 0.07, 0.05, 10);
  headGeo.rotateZ(Math.PI / 2);
  b.add(headGeo, materials.get('trainHeadlight'), [CAR_L / 2 + 0.02, bodyY - 0.05, 0.2]);
  b.add(headGeo, materials.get('trainHeadlight'), [CAR_L / 2 + 0.02, bodyY - 0.05, -0.2]);
  // Marker lights
  const mk = ShapeFactory.cylinder(0.03, 0.03, 0.03, 8);
  mk.rotateZ(Math.PI / 2);
  b.add(mk, materials.get('lampYellow'), [CAR_L / 2 + 0.02, bodyY + 0.22, 0.28]);
  b.add(mk, materials.get('lampYellow'), [CAR_L / 2 + 0.02, bodyY + 0.22, -0.28]);

  // --- Rear (−X) ---
  b.add(ShapeFactory.box(0.05, 0.35, CAR_W * 0.8), glass, [-CAR_L / 2 + 0.01, bodyY + 0.12, 0]);
  const tailGeo = ShapeFactory.cylinder(0.04, 0.04, 0.03, 8);
  tailGeo.rotateZ(Math.PI / 2);
  b.add(tailGeo, materials.get('lampRed'), [-CAR_L / 2 - 0.01, bodyY - 0.05, 0.16]);
  b.add(tailGeo, materials.get('lampRed'), [-CAR_L / 2 - 0.01, bodyY - 0.05, -0.16]);

  // Couplers + brake hoses
  for (const s of [1, -1] as const) {
    b.add(ShapeFactory.box(0.2, 0.1, 0.12), materials.get('trainCoupler'), [s * (CAR_L / 2 + 0.1), RAIL_TOP + 0.18, 0]);
    b.add(ShapeFactory.cylinder(0.025, 0.025, 0.15, 5), materials.get('trainCoupler'), [s * (CAR_L / 2 + 0.08), RAIL_TOP + 0.08, 0.12], [0, 0, Math.PI / 2]);
  }

  // Roof equipment — exhaust, vents
  b.add(ShapeFactory.box(CAR_L + 0.08, 0.08, CAR_W + 0.06), roofM, [0, bodyY + CAR_H / 2 + 0.04, 0]);
  b.add(ShapeFactory.box(0.45, 0.12, 0.35), materials.get('metalGray'), [0.9, bodyY + CAR_H / 2 + 0.14, 0]); // AC
  b.add(ShapeFactory.cylinder(0.08, 0.09, 0.18, 7), materials.get('trainCoupler'), [-0.6, bodyY + CAR_H / 2 + 0.14, 0]); // exhaust
  b.add(ShapeFactory.box(0.3, 0.06, 0.25), grille, [-0.1, bodyY + CAR_H / 2 + 0.1, 0]);
  for (let i = 0; i < 4; i++) {
    b.add(ShapeFactory.box(0.05, 0.03, CAR_W + 0.08), materials.get('metalDark'), [-1.0 + i * 0.55, bodyY + CAR_H / 2 + 0.09, 0]);
  }

  // Interior hints (visible through glass)
  for (let i = 0; i < 4; i++) {
    b.add(ShapeFactory.box(0.12, 0.28, 0.5), materials.get('trainSeat'), [-1.0 + i * 0.55, bodyY - 0.15, 0]);
  }
  b.add(ShapeFactory.box(CAR_L - 0.3, 0.04, CAR_W - 0.15), materials.get('trainInterior'), [0, bodyY + 0.35, 0]);

  // Bogies
  const wheelGeo = ShapeFactory.cylinder(0.14, 0.14, 0.07, 10);
  wheelGeo.rotateX(Math.PI / 2);
  const axleY = RAIL_TOP - 0.14;
  for (const bx of [-0.95, 0.95] as const) {
    b.add(ShapeFactory.box(0.7, 0.12, CAR_W * 0.72), materials.get('trainCoupler'), [bx, RAIL_TOP + 0.1, 0]);
    // Axleboxes
    for (const side of [-1, 1] as const) {
      b.add(ShapeFactory.box(0.18, 0.16, 0.08), materials.get('metalGray'), [bx, axleY + 0.05, side * (CAR_W * 0.4)]);
    }
    for (const wx of [-0.22, 0.22] as const) {
      for (const side of [-1, 1] as const) {
        b.add(wheelGeo, materials.get('rail'), [bx + wx, axleY, side * (CAR_W * 0.38)]);
      }
    }
  }

  // Lights
  const cabin = new THREE.PointLight(0xffc878, 0.35, 2.5, 2);
  cabin.position.set(0.3, bodyY + 0.1, 0);
  b.child(cabin);
  const head = new THREE.SpotLight(0xfff0b5, 0.9, 7, 0.45, 0.5, 1.4);
  head.position.set(CAR_L / 2 + 0.1, bodyY - 0.05, 0);
  head.target.position.set(CAR_L / 2 + 3.5, bodyY - 0.3, 0);
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

export function buildTrain(trackZ: (x: number) => number): TrainHandles {
  registerTrainAsset();
  const group = new THREE.Group();
  group.name = 'Train';

  const train = assets.loadSync('railcar');
  group.add(train);

  let x = APPROACH_START;
  let phase: 'approach' | 'dwell' | 'depart' | 'reset' = 'approach';
  let dwellT = 0;
  let resetT = 0;
  let gateRaw = 0;
  let clearHold = 0;
  let blinkT = 0;

  const anim = {
    name: 'train-ops',
    priority: 10,
    update(t: number, dt: number) {
      if (phase === 'approach') {
        const dist = x - STOP_X;
        const brakeZone = 3.2;
        let speed = 1.35;
        if (dist < brakeZone) {
          speed = 0.2 + easeMechanical(Math.max(0, dist / brakeZone)) * 1.15;
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
        if (dwellT > 4.5) phase = 'depart';
      } else if (phase === 'depart') {
        const speed = 0.9 + Math.min(1.2, (STOP_X - x) * 0.3);
        x -= speed * dt;
        if (x < DEPART_END) {
          phase = 'reset';
          resetT = 0;
        }
      } else {
        resetT += dt;
        if (resetT > 2.2) {
          x = APPROACH_START;
          phase = 'approach';
        }
      }

      const z = trackZ(x);
      const zA = trackZ(x - 0.3);
      const zB = trackZ(x + 0.3);
      const travelYaw = Math.atan2(zA - zB, -0.6);
      train.visible = phase !== 'reset';
      train.position.set(x, 0, z);
      train.rotation.y = travelYaw;

      if (phase === 'dwell') {
        train.position.y = Math.sin(t * 3.1) * 0.003;
        train.rotation.z = Math.sin(t * 2.0) * 0.002;
      } else if (phase === 'approach' || phase === 'depart') {
        train.position.y = Math.sin(t * 14) * 0.0018;
        train.rotation.z = 0;
      } else {
        train.position.y = 0;
        train.rotation.z = 0;
      }

      train.traverse((o) => {
        if ((o as THREE.SpotLight).isSpotLight) {
          const moving = phase === 'approach' || phase === 'depart';
          (o as THREE.SpotLight).intensity = moving ? 1.0 : 0.15;
        }
      });

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
  return { group };
}
