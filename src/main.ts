import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';

import { materials } from './core/materials';
import { Rng } from './core/rng';
import { animationManager, crossingState } from './core/animation';
import { assets } from './core/assets';

import { buildDioramaBase } from './scene/base';
import { buildTerrain } from './scene/terrain';
import { buildRailway } from './scene/railway';
import { buildCrossing } from './scene/crossing';
import { buildRoad } from './scene/road';
import { buildResidential, createClothesWind } from './scene/house';
import { buildStation } from './scene/station';
import { buildVegetation } from './scene/vegetation';
import { buildProps } from './scene/props';
import { buildEnvironment } from './scene/environment';
import { buildTrain } from './scene/train';

/** Lightweight color grade — slight teal shadows, warm highlights, mild vignette. */
const ColorGradeShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    vignetteStrength: { value: 0.28 },
    warmth: { value: 0.04 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float vignetteStrength;
    uniform float warmth;
    varying vec2 vUv;
    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      // Warm highlights, cool shadows
      float luma = dot(color.rgb, vec3(0.299, 0.587, 0.114));
      color.rgb += warmth * smoothstep(0.4, 1.0, luma);
      color.rgb -= warmth * 0.6 * (1.0 - smoothstep(0.0, 0.45, luma)) * vec3(0.2, 0.05, -0.1);
      // Soft vignette
      vec2 q = vUv - 0.5;
      float vig = 1.0 - dot(q, q) * vignetteStrength * 2.2;
      color.rgb *= clamp(vig, 0.0, 1.0);
      gl_FragColor = color;
    }
  `,
};

async function main(): Promise<void> {
  const container = document.getElementById('app');
  if (!container) throw new Error('#app not found');

  // --- Renderer ---
  const renderer = new THREE.WebGLRenderer({
    antialias: false,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  // --- Scene ---
  const scene = new THREE.Scene();
  materials.build();

  const rng = new Rng(1947);

  const env = buildEnvironment(rng);
  scene.add(env.group);
  scene.fog = env.fog;
  scene.background = new THREE.Color(0x5a90b8);

  // Soft PMREM environment for metal reflections (studio fill)
  {
    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    // Build a tiny gradient environment via a temp scene
    const envScene = new THREE.Scene();
    envScene.background = new THREE.Color(0x88aacc);
    const hemiEnv = new THREE.HemisphereLight(0xc8e0f0, 0x4a5a3a, 1);
    envScene.add(hemiEnv);
    const rt = pmrem.fromScene(envScene, 0.04);
    scene.environment = rt.texture;
    pmrem.dispose();
  }

  // --- Assemble diorama modules ---
  const diorama = new THREE.Group();
  diorama.name = 'Diorama';
  scene.add(diorama);

  diorama.add(buildDioramaBase(rng));
  diorama.add(buildTerrain(rng));

  const railway = buildRailway(rng);
  diorama.add(railway.group);

  diorama.add(buildRoad(rng, railway.trackZ));

  const crossing = buildCrossing(rng, railway.trackZ);
  diorama.add(crossing.group);

  // 田 residential block: 3 一户建 + empty lot
  const residential = buildResidential(rng);
  diorama.add(residential);

  // Compact unmanned halt beside the vacant lot
  const station = buildStation(rng, railway.trackZ);
  diorama.add(station.group);

  const veg = buildVegetation(rng);
  diorama.add(veg.group);

  diorama.add(buildProps(rng, railway.trackZ));

  // Train drives the crossing (no separate idle cycle)
  const train = buildTrain(railway.trackZ);
  diorama.add(train.group);

  // --- Collect module animations ---
  animationManager.add(veg.createWindAnimation());
  animationManager.add(createClothesWind(residential));
  animationManager.add(env.createCloudAnimation());
  animationManager.add(env.createSunBreath());
  animationManager.add(env.createLampBreath());

  const attachAnims = (obj: THREE.Object3D): void => {
    const a = (obj as any).__anim;
    if (a && typeof a.update === 'function') animationManager.add(a);
    obj.children.forEach(attachAnims);
  };
  attachAnims(railway.group);
  attachAnims(crossing.group);
  attachAnims(train.group);

  // --- Camera ---
  const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 120);
  // Product-shot framing for 15×12 residential block
  const camDist = 18.5;
  const camElev = THREE.MathUtils.degToRad(36);
  const camAzim = THREE.MathUtils.degToRad(34);
  camera.position.set(
    Math.sin(camAzim) * Math.cos(camElev) * camDist,
    Math.sin(camElev) * camDist,
    Math.cos(camAzim) * Math.cos(camElev) * camDist,
  );

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0.55, 0.15);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.minDistance = 5;
  controls.maxDistance = 36;
  controls.minPolarAngle = THREE.MathUtils.degToRad(12);
  controls.maxPolarAngle = THREE.MathUtils.degToRad(82);
  controls.enablePan = true;
  controls.panSpeed = 0.6;
  controls.rotateSpeed = 0.65;
  controls.zoomSpeed = 0.8;
  controls.autoRotateSpeed = 0.55;

  // --- Post processing ---
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  // Bloom only on emissive lamps / warning lights — high threshold keeps sky clean
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.42,
    0.4,
    0.93,
  );
  composer.addPass(bloom);

  // Cheap AO approximation: soft darkening via depth-unaware SSAO substitute
  // Using a subtle vignette + grade; full SSAO is heavy — contact shadows +
  // shadow map cover the diorama look. Optional SSAO can be added later.
  const gradePass = new ShaderPass(ColorGradeShader);
  composer.addPass(gradePass);

  const smaa = new SMAAPass(window.innerWidth * renderer.getPixelRatio(), window.innerHeight * renderer.getPixelRatio());
  composer.addPass(smaa);
  composer.addPass(new OutputPass());

  // --- HUD ---
  const btnAuto = document.getElementById('btn-auto');
  const statusLabel = document.getElementById('status-label');
  const statusDot = document.getElementById('status-dot');
  const loading = document.getElementById('loading');

  let autoRotate = false;
  btnAuto?.addEventListener('click', () => {
    autoRotate = !autoRotate;
    controls.autoRotate = autoRotate;
    if (btnAuto) {
      btnAuto.textContent = autoRotate ? 'AUTO · ON' : 'AUTO · OFF';
      btnAuto.classList.toggle('is-on', autoRotate);
    }
  });

  // Keyboard: A toggles auto
  window.addEventListener('keydown', (e) => {
    if (e.key === 'a' || e.key === 'A') btnAuto?.click();
  });

  const phaseLabel: Record<string, string> = {
    idle: 'GATE OPEN',
    alarm: 'TRAIN APPROACH',
    closing: 'GATE CLOSING',
    closed: 'GATE CLOSED',
    opening: 'GATE OPENING',
  };

  let lastPhase = '';
  function updateHud(): void {
    const p = crossingState.phase;
    if (p !== lastPhase && statusLabel) {
      statusLabel.textContent = phaseLabel[p] ?? p;
      lastPhase = p;
    }
    if (statusDot) {
      const active = p !== 'idle';
      statusDot.style.background = active ? '#c43c3c' : '#4a9b6e';
      statusDot.style.boxShadow = active
        ? '0 0 8px rgba(196,60,60,0.8)'
        : '0 0 8px rgba(74,155,110,0.6)';
    }
  }

  // --- Resize ---
  function onResize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    composer.setSize(w, h);
    bloom.setSize(w, h);
  }
  window.addEventListener('resize', onResize);

  // --- Loop ---
  const clock = new THREE.Clock();
  let frames = 0;

  function tick(): void {
    requestAnimationFrame(tick);
    const dt = Math.min(clock.getDelta(), 0.05);
    animationManager.update(dt);
    controls.update();
    updateHud();
    composer.render();

    frames++;
    if (frames === 2) {
      loading?.classList.add('is-done');
    }
  }

  tick();

  // Expose for debugging / screenshot tooling
  (window as any).__diorama = {
    scene,
    camera,
    controls,
    renderer,
    animationManager,
    crossingState,
    assets,
  };

  void assets;
}

main().catch((err) => {
  console.error(err);
  const el = document.getElementById('loading');
  if (el) el.textContent = `ERROR: ${err instanceof Error ? err.message : String(err)}`;
});
