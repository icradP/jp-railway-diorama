import * as THREE from 'three';
import { MeshBuilder } from '../core/mesh';
import { materials } from '../core/materials';
import { ShapeFactory } from '../core/shapes';
import { Rng } from '../core/rng';

export interface EnvironmentHandles {
  group: THREE.Group;
  sun: THREE.DirectionalLight;
  hemi: THREE.HemisphereLight;
  ambient: THREE.AmbientLight;
  fog: THREE.FogExp2;
  createCloudAnimation(): { name: string; update(t: number, dt: number): void };
  createSunBreath(): { name: string; update(t: number, dt: number): void };
  createLampBreath(): { name: string; update(t: number, dt: number): void };
}

/**
 * Lighting, sky gradient dome, drifting clouds, soft fog.
 * Studio-product-photography feel: warm key + cool fill.
 */
export function buildEnvironment(rng: Rng): EnvironmentHandles {
  const group = new THREE.Group();
  group.name = 'Environment';

  // --- Sky gradient dome ---
  const skyGeo = new THREE.SphereGeometry(40, 24, 16);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      topColor: { value: new THREE.Color(0x2878c8) },
      bottomColor: { value: new THREE.Color(0x9fd3ea) },
      offset: { value: 2.5 },
      exponent: { value: 0.55 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      uniform float offset;
      uniform float exponent;
      varying vec3 vWorldPosition;
      void main() {
        float h = normalize(vWorldPosition + vec3(0.0, offset, 0.0)).y;
        gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
      }
    `,
  });
  const sky = new THREE.Mesh(skyGeo, skyMat);
  sky.name = 'Sky';
  group.add(sky);

  // --- Clouds (high, soft, won't clip through diorama) ---
  const cloudGroup = new THREE.Group();
  cloudGroup.name = 'Clouds';
  for (let i = 0; i < 5; i++) {
    const cb = new MeshBuilder(`Cloud${i}`);
    const n = rng.int(3, 4);
    for (let j = 0; j < n; j++) {
      cb.add(
        ShapeFactory.ico(rng.range(0.5, 0.9), 0),
        materials.get('cloud'),
        [j * 0.6 - n * 0.25, rng.range(-0.08, 0.1), rng.range(-0.25, 0.25)],
        [0, rng.range(0, Math.PI), 0],
      );
    }
    const cloud = cb.build();
    cloud.position.set(rng.range(-16, 16), rng.range(11, 16), rng.range(-12, 6));
    cloud.scale.setScalar(rng.range(0.7, 1.2));
    cloudGroup.add(cloud);
  }
  group.add(cloudGroup);

  // --- Lights ---
  const ambient = new THREE.AmbientLight(0xd0dce8, 0.52);
  group.add(ambient);

  const hemi = new THREE.HemisphereLight(0xa7cbe7, 0x5c713a, 0.7);
  group.add(hemi);

  // Warm afternoon sun (summer 16:00)
  const sun = new THREE.DirectionalLight(0xffd79a, 1.7);
  sun.position.set(8, 12, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 40;
  const s = 11;
  sun.shadow.camera.left = -s;
  sun.shadow.camera.right = s;
  sun.shadow.camera.top = s;
  sun.shadow.camera.bottom = -s;
  sun.shadow.bias = -0.00025;
  sun.shadow.normalBias = 0.02;
  group.add(sun);
  group.add(sun.target);
  sun.target.position.set(0, 0, 0);

  // Cool fill from opposite
  const fill = new THREE.DirectionalLight(0xa8c0d8, 0.35);
  fill.position.set(-6, 5, -4);
  group.add(fill);

  // Soft contact shadow disc under plinth (fake AO)
  const contactGeo = new THREE.CircleGeometry(7, 32);
  contactGeo.rotateX(-Math.PI / 2);
  const contactMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
  });
  const contact = new THREE.Mesh(contactGeo, contactMat);
  contact.position.y = -0.72;
  group.add(contact);

  // Fog — light atmospheric haze, not white-out
  const fog = new THREE.FogExp2(0x8eacc0, 0.0042);

  function createCloudAnimation() {
    return {
      name: 'clouds',
      update(t: number) {
        cloudGroup.position.x = Math.sin(t * 0.02) * 1.5;
        cloudGroup.position.z = Math.cos(t * 0.015) * 0.8;
      },
    };
  }

  function createSunBreath() {
    const base = 1.7;
    return {
      name: 'sun-breath',
      update(t: number) {
        sun.intensity = base + Math.sin(t * 0.08) * 0.1;
        hemi.intensity = 0.7 + Math.sin(t * 0.06 + 1) * 0.04;
      },
    };
  }

  function createLampBreath() {
    const lampMat = materials.get('lampWarm') as THREE.MeshStandardMaterial;
    return {
      name: 'lamp-breath',
      update(t: number) {
        lampMat.emissiveIntensity = 0.65 + Math.sin(t * 1.4) * 0.12;
      },
    };
  }

  return {
    group,
    sun,
    hemi,
    ambient,
    fog,
    createCloudAnimation,
    createSunBreath,
    createLampBreath,
  };
}
