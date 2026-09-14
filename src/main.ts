import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';

import { materials } from './core/materials';
import { buildAtlas } from './core/textures';
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

/** Lightweight color grade — teal shadows, warm highlights, soft vignette, subtle edge ink. */
const ColorGradeShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    vignetteStrength: { value: 0.38 },
    warmth: { value: 0.06 },
    contrast: { value: 1.08 },
    edgeInk: { value: 0.05 },
    resolution: { value: new THREE.Vector2(1, 1) },
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
    uniform float contrast;
    uniform float edgeInk;
    uniform vec2 resolution;
    varying vec2 vUv;
    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      float luma = dot(color.rgb, vec3(0.299, 0.587, 0.114));
      // Warm highlights, cool shadows
      color.rgb += warmth * smoothstep(0.45, 1.0, luma);
      color.rgb -= warmth * 0.55 * (1.0 - smoothstep(0.0, 0.4, luma)) * vec3(0.15, 0.05, -0.08);
      // Contrast around mid gray
      color.rgb = (color.rgb - 0.5) * contrast + 0.5;
      // Subtle luminance edge ink (miniature outline feel)
      vec2 px = 1.0 / resolution;
      float l = dot(texture2D(tDiffuse, vUv + vec2(-px.x, 0.0)).rgb, vec3(0.299, 0.587, 0.114));
      float r = dot(texture2D(tDiffuse, vUv + vec2(px.x, 0.0)).rgb, vec3(0.299, 0.587, 0.114));
      float u = dot(texture2D(tDiffuse, vUv + vec2(0.0, px.y)).rgb, vec3(0.299, 0.587, 0.114));
      float d = dot(texture2D(tDiffuse, vUv + vec2(0.0, -px.y)).rgb, vec3(0.299, 0.587, 0.114));
      float edge = abs(l - r) + abs(u - d);
      color.rgb *= 1.0 - clamp(edge * edgeInk * 6.0, 0.0, 0.22);
      // Vignette
      vec2 q = vUv - 0.5;
      float vig = 1.0 - dot(q, q) * vignetteStrength * 2.4;
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
  buildAtlas();

  const rng = new Rng(1947);

  const env = buildEnvironment(rng);
  scene.add(env.group);
  scene.fog = env.fog;
  scene.background = new THREE.Color(0x4e9de0);

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
  const camDist = 22;
  const camElev = THREE.MathUtils.degToRad(34);
  const camAzim = THREE.MathUtils.degToRad(32);
  camera.position.set(
    Math.sin(camAzim) * Math.cos(camElev) * camDist,
    Math.sin(camElev) * camDist,
    Math.cos(camAzim) * Math.cos(camElev) * camDist,
  );

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0.55, 0.15);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.minDistance = 6;
  controls.maxDistance = 40;
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

  // Bloom on warm windows / lamps / signals
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.55,
    0.55,
    0.88,
  );
  composer.addPass(bloom);

  const gradePass = new ShaderPass(ColorGradeShader);
  gradePass.uniforms.resolution.value.set(window.innerWidth, window.innerHeight);
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
    gradePass.uniforms.resolution.value.set(w, h);
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
