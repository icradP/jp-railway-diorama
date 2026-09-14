import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { MeshBuilder } from './mesh';

export type AssetSource =
  | { kind: 'gltf'; url: string }
  | { kind: 'procedural'; factory: () => THREE.Group | THREE.Object3D };

export interface AssetRegistration {
  name: string;
  source: AssetSource;
  /** Scale applied after load. */
  scale?: number;
  /** Center on origin after load. */
  center?: boolean;
}

/**
 * AssetRegistry — single interface for GLTF assets and procedural factories.
 *
 * Builders always resolve through the registry so a GLTF file can replace
 * a procedural model without touching scene modules:
 *
 *   registry.register({ name: 'bicycle', source: { kind: 'gltf', url: '/assets/bicycle.glb' } });
 *   // or fallback:
 *   registry.register({ name: 'bicycle', source: { kind: 'procedural', factory: buildBicycle } });
 */
export class AssetRegistry {
  private defs = new Map<string, AssetRegistration>();
  private cache = new Map<string, THREE.Object3D>();
  private loader = new GLTFLoader();
  private loading = new Map<string, Promise<THREE.Object3D>>();

  register(def: AssetRegistration): void {
    this.defs.set(def.name, def);
  }

  registerMany(defs: AssetRegistration[]): void {
    for (const d of defs) this.register(d);
  }

  has(name: string): boolean {
    return this.defs.has(name) || this.cache.has(name);
  }

  /** Resolve asset — clones from cache so callers can freely transform. */
  async load(name: string): Promise<THREE.Object3D> {
    const cached = this.cache.get(name);
    if (cached) return cached.clone(true);

    const inflight = this.loading.get(name);
    if (inflight) {
      const obj = await inflight;
      return obj.clone(true);
    }

    const def = this.defs.get(name);
    if (!def) throw new Error(`Asset not registered: ${name}`);

    const p = this.resolve(def);
    this.loading.set(name, p);
    try {
      const obj = await p;
      this.cache.set(name, obj);
      this.loading.delete(name);
      return obj.clone(true);
    } catch (e) {
      this.loading.delete(name);
      throw e;
    }
  }

  /** Synchronous resolve when source is procedural (or already cached). */
  loadSync(name: string): THREE.Object3D {
    const cached = this.cache.get(name);
    if (cached) return cached.clone(true);

    const def = this.defs.get(name);
    if (!def) throw new Error(`Asset not registered: ${name}`);
    if (def.source.kind !== 'procedural') {
      throw new Error(`Asset "${name}" is GLTF — await load() instead`);
    }
    const obj = this.instantiate(def);
    this.cache.set(name, obj);
    return obj.clone(true);
  }

  private async resolve(def: AssetRegistration): Promise<THREE.Object3D> {
    if (def.source.kind === 'procedural') {
      return this.instantiate(def);
    }
    try {
      const gltf = await this.loader.loadAsync(def.source.url);
      return this.post(gltf.scene, def);
    } catch {
      // Network / missing file → procedural fallback if registered under same name later
      console.warn(`[AssetRegistry] GLTF failed for "${def.name}", no procedural fallback in def`);
      throw new Error(`Failed to load GLTF: ${def.source.url}`);
    }
  }

  private instantiate(def: AssetRegistration): THREE.Object3D {
    if (def.source.kind !== 'procedural') {
      throw new Error(`instantiate expects procedural source for "${def.name}"`);
    }
    const obj = def.source.factory();
    return this.post(obj, def);
  }

  private post(obj: THREE.Object3D, def: AssetRegistration): THREE.Object3D {
    obj.name = def.name;
    if (def.scale !== undefined && def.scale !== 1) {
      obj.scale.setScalar(def.scale);
    }
    if (def.center) {
      const box = new THREE.Box3().setFromObject(obj);
      const c = box.getCenter(new THREE.Vector3());
      obj.position.sub(c);
      // Lift so min Y sits at 0
      obj.position.y += -box.min.y;
    }
    obj.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });
    return obj;
  }

  /** Export a procedural object as GLB bytes (dev helper for asset pipeline). */
  async exportGLB(name: string): Promise<ArrayBuffer> {
    const obj = this.loadSync(name);
    const exporter = new GLTFExporter();
    return new Promise((resolve, reject) => {
      exporter.parse(
        obj,
        (result) => resolve(result as ArrayBuffer),
        (err) => reject(err),
        { binary: true },
      );
    });
  }

  dispose(): void {
    this.cache.clear();
    this.loading.clear();
    this.defs.clear();
  }
}

export const assets = new AssetRegistry();

/** Wrap a MeshBuilder factory as a registry-compatible procedural source. */
export function procedural(name: string, builder: MeshBuilder): AssetRegistration {
  return {
    name,
    source: {
      kind: 'procedural',
      factory: () => builder.build(),
    },
  };
}
