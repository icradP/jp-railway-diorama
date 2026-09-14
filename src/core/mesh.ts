import * as THREE from 'three';

/**
 * Fluent mesh builder — compose parts into a named Group with materials
 * from MaterialLibrary. Keeps scene modules declarative.
 */
export class MeshBuilder {
  private group: THREE.Group;
  private parts: THREE.Object3D[] = [];

  constructor(name: string) {
    this.group = new THREE.Group();
    this.group.name = name;
  }

  add(
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    pos: THREE.Vector3 | [number, number, number] = [0, 0, 0],
    rot: THREE.Euler | [number, number, number] = [0, 0, 0],
    scale: THREE.Vector3 | [number, number, number] | number = 1,
  ): this {
    const mesh = new THREE.Mesh(geo, mat);
    if (Array.isArray(pos)) mesh.position.set(pos[0], pos[1], pos[2]);
    else mesh.position.copy(pos);
    if (Array.isArray(rot)) mesh.rotation.set(rot[0], rot[1], rot[2]);
    else mesh.rotation.copy(rot);
    if (typeof scale === 'number') mesh.scale.setScalar(scale);
    else if (Array.isArray(scale)) mesh.scale.set(scale[0], scale[1], scale[2]);
    else mesh.scale.copy(scale);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.parts.push(mesh);
    this.group.add(mesh);
    return this;
  }

  /** Add a child group (for nested assemblies). */
  child(obj: THREE.Object3D): this {
    this.parts.push(obj);
    this.group.add(obj);
    return this;
  }

  /** Instance a geometry many times with matrices. */
  instance(
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    matrices: THREE.Matrix4[],
    castShadow = true,
    receiveShadow = true,
  ): this {
    if (matrices.length === 0) return this;
    const im = new THREE.InstancedMesh(geo, mat, matrices.length);
    for (let i = 0; i < matrices.length; i++) im.setMatrixAt(i, matrices[i]);
    im.instanceMatrix.needsUpdate = true;
    im.castShadow = castShadow;
    im.receiveShadow = receiveShadow;
    im.frustumCulled = false;
    this.parts.push(im);
    this.group.add(im);
    return this;
  }

  /** Set group transform. */
  transform(
    pos?: THREE.Vector3 | [number, number, number],
    rot?: THREE.Euler | [number, number, number],
    scale?: number,
  ): this {
    if (pos) {
      if (Array.isArray(pos)) this.group.position.set(pos[0], pos[1], pos[2]);
      else this.group.position.copy(pos);
    }
    if (rot) {
      if (Array.isArray(rot)) this.group.rotation.set(rot[0], rot[1], rot[2]);
      else this.group.rotation.copy(rot);
    }
    if (scale !== undefined) this.group.scale.setScalar(scale);
    return this;
  }

  /** Mark all meshes cast/receive. */
  shadows(cast = true, receive = true): this {
    this.group.traverse((o) => {
      if ((o as THREE.Mesh).isMesh || (o as THREE.InstancedMesh).isInstancedMesh) {
        o.castShadow = cast;
        o.receiveShadow = receive;
      }
    });
    return this;
  }

  build(): THREE.Group {
    return this.group;
  }

  /** First mesh matching material name — useful for emissive lamp handles. */
  findByMaterial(name: string): THREE.Mesh | null {
    let found: THREE.Mesh | null = null;
    this.group.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh && m.material && (m.material as THREE.Material).name === name) {
        found = m;
      }
    });
    return found;
  }

  /** Collect meshes with a material name. */
  findAllByMaterial(name: string): THREE.Mesh[] {
    const out: THREE.Mesh[] = [];
    this.group.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh && m.material && (m.material as THREE.Material).name === name) {
        out.push(m);
      }
    });
    return out;
  }
}

/** Convenience: create dummy matrix for instancing. */
export function mat4(
  x: number,
  y: number,
  z: number,
  rx = 0,
  ry = 0,
  rz = 0,
  sx = 1,
  sy = 1,
  sz = 1,
): THREE.Matrix4 {
  const m = new THREE.Matrix4();
  m.compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)),
    new THREE.Vector3(sx, sy, sz),
  );
  return m;
}
