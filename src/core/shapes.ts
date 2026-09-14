import * as THREE from 'three';
import { Rng } from './rng';

/**
 * Procedural shape factories.
 * These produce reusable geometries — scene builders should never
 * hand-roll one-off primitives when a factory already exists.
 */
export const ShapeFactory = {
  /** Beveled-ish box via BoxGeometry (low-poly friendly). */
  box(w: number, h: number, d: number): THREE.BoxGeometry {
    return new THREE.BoxGeometry(w, h, d);
  },

  /** Cylinder with configurable radial segments for low-poly. */
  cylinder(rTop: number, rBot: number, h: number, seg = 8): THREE.CylinderGeometry {
    return new THREE.CylinderGeometry(rTop, rBot, h, seg);
  },

  /** Cone / low-poly tree crown. */
  cone(r: number, h: number, seg = 7): THREE.ConeGeometry {
    return new THREE.ConeGeometry(r, h, seg);
  },

  /** Icosahedron — organic blob for foliage / rocks. */
  ico(radius: number, detail = 0): THREE.IcosahedronGeometry {
    return new THREE.IcosahedronGeometry(radius, detail);
  },

  /** Thin plane for ground patches, signs. */
  plane(w: number, h: number): THREE.PlaneGeometry {
    return new THREE.PlaneGeometry(w, h);
  },

  /** Torus section for pipe / handle. */
  torus(r: number, tube: number, seg = 8, radSeg = 12, arc = Math.PI * 2): THREE.TorusGeometry {
    return new THREE.TorusGeometry(r, tube, radSeg, seg, arc);
  },

  /**
   * Extrude a 2D outline — primary tool for signs, rail profiles, decorative panels.
   */
  extrude(
    shape: THREE.Shape,
    depth: number,
    bevelEnabled = false,
    bevelSize = 0.01,
    bevelThickness = 0.01,
  ): THREE.ExtrudeGeometry {
    return new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled,
      bevelSize,
      bevelThickness,
      bevelSegments: 1,
    });
  },

  /** Classic Japanese railway-crossing X sign outline. */
  crossSignShape(size = 0.5): THREE.Shape {
    const s = size;
    const t = s * 0.28;
    const shape = new THREE.Shape();
    // Cross / St. Andrew's cross
    const arms = [
      [0, s],
      [t * 0.55, s * 0.7],
      [s, 0],
      [s * 0.7, -t * 0.55],
      [0, -s],
      [-s * 0.7, -t * 0.55],
      [-s, 0],
      [-t * 0.55, s * 0.7],
    ];
    shape.moveTo(arms[0][0], arms[0][1]);
    for (let i = 1; i < arms.length; i++) shape.lineTo(arms[i][0], arms[i][1]);
    shape.closePath();
    return shape;
  },

  /** Rectangular sign plate with optional rounded corners via shape. */
  plateShape(w: number, h: number, r = 0.04): THREE.Shape {
    const shape = new THREE.Shape();
    const hw = w / 2;
    const hh = h / 2;
    shape.moveTo(-hw + r, -hh);
    shape.lineTo(hw - r, -hh);
    shape.quadraticCurveTo(hw, -hh, hw, -hh + r);
    shape.lineTo(hw, hh - r);
    shape.quadraticCurveTo(hw, hh, hw - r, hh);
    shape.lineTo(-hw + r, hh);
    shape.quadraticCurveTo(-hw, hh, -hw, hh - r);
    shape.lineTo(-hw, -hh + r);
    shape.quadraticCurveTo(-hw, -hh, -hw + r, -hh);
    return shape;
  },

  /** Low-poly hill — lathe-like cone with noise offset on vertices. */
  hill(radius: number, height: number, rng: Rng, detail = 1): THREE.BufferGeometry {
    const geo = new THREE.ConeGeometry(radius, height, 7, detail);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      if (y > height * 0.3) continue;
      pos.setX(i, pos.getX(i) + rng.range(-0.15, 0.15));
      pos.setZ(i, pos.getZ(i) + rng.range(-0.15, 0.15));
      pos.setY(i, y + rng.range(-0.08, 0.08));
    }
    geo.computeVertexNormals();
    return geo;
  },

  /** Displace a ground plane for gentle terrain undulation. */
  groundPatch(
    w: number,
    d: number,
    segX: number,
    segZ: number,
    amp: number,
    rng: Rng,
  ): THREE.PlaneGeometry {
    const geo = new THREE.PlaneGeometry(w, d, segX, segZ);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      // Keep railway corridor (|z| < 1.6) and road corridor (|x| < 1.8) flat
      const railSafe = Math.max(0, Math.min(1, (Math.abs(z) - 1.4) / 1.2));
      const roadSafe = Math.max(0, Math.min(1, (Math.abs(x) - 1.6) / 1.2));
      const edgeFade = Math.min(1, Math.min(w / 2 - Math.abs(x), d / 2 - Math.abs(z)) / 1.0);
      const n = (Math.sin(x * 0.55 + 1.7) + Math.cos(z * 0.7 + 0.4)) * 0.5 + (rng.next() - 0.5) * 0.05;
      pos.setY(i, n * amp * railSafe * roadSafe * Math.max(0, edgeFade));
    }
    geo.computeVertexNormals();
    return geo;
  },

  /** Cable / wire catenary between two points. */
  catenary(a: THREE.Vector3, b: THREE.Vector3, sag = 0.15, segments = 12): THREE.BufferGeometry {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const p = a.clone().lerp(b, t);
      p.y -= Math.sin(t * Math.PI) * sag;
      pts.push(p);
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), segments, 0.006, 5, false);
  },

  /** Slightly curved railway sleeper bed path along X. */
  railwayPathZ(x: number, curvature = 0.08): number {
    // Gentle S-curve so rails are not perfectly straight
    return Math.sin(x * 0.18) * curvature * 10 + Math.sin(x * 0.07) * 0.04;
  },

  /** Rail profile as extruded shape (I-beam-ish, low detail). */
  railProfile(h = 0.12, wTop = 0.05, wBot = 0.08): THREE.Shape {
    const shape = new THREE.Shape();
    const hw = wBot / 2;
    const ht = wTop / 2;
    const mid = h * 0.45;
    shape.moveTo(-hw, 0);
    shape.lineTo(hw, 0);
    shape.lineTo(ht, mid);
    shape.lineTo(ht, h - 0.02);
    shape.lineTo(ht * 1.4, h);
    shape.lineTo(-ht * 1.4, h);
    shape.lineTo(-ht, h - 0.02);
    shape.lineTo(-ht, mid);
    shape.closePath();
    return shape;
  },
};

export type ShapeFactoryType = typeof ShapeFactory;
