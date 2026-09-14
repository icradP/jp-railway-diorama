import * as THREE from 'three';

/**
 * Central PBR material library for the diorama.
 * All materials share a handmade low-poly diorama look:
 * moderate roughness, subtle metalness, no photoreal noise maps.
 */
export class MaterialLibrary {
  private mats = new Map<string, THREE.Material>();

  get(name: string): THREE.Material {
    const m = this.mats.get(name);
    if (!m) throw new Error(`Material not found: ${name}`);
    return m;
  }

  /** Standard helper — consistent defaults for diorama PBR. */
  std(
    name: string,
    color: THREE.ColorRepresentation,
    opts: {
      roughness?: number;
      metalness?: number;
      flatShading?: boolean;
      emissive?: THREE.ColorRepresentation;
      emissiveIntensity?: number;
      transparent?: boolean;
      opacity?: number;
      side?: THREE.Side;
    } = {},
  ): THREE.MeshStandardMaterial {
    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: opts.roughness ?? 0.78,
      metalness: opts.metalness ?? 0.05,
      flatShading: opts.flatShading ?? false,
      emissive: opts.emissive ?? 0x000000,
      emissiveIntensity: opts.emissiveIntensity ?? 0,
      transparent: opts.transparent ?? false,
      opacity: opts.opacity ?? 1,
      side: opts.side ?? THREE.FrontSide,
    });
    mat.name = name;
    this.mats.set(name, mat);
    return mat;
  }

  build(): void {
    // --- Terrain / ground ---
    this.std('grass', 0x72a05e, { roughness: 0.92, flatShading: true });
    this.std('grassDry', 0xa09060, { roughness: 0.95, flatShading: true });
    this.std('dirt', 0x7a5e48, { roughness: 0.96, flatShading: true });
    this.std('dirtDark', 0x544032, { roughness: 0.98, flatShading: true });
    this.std('ballast', 0x82827a, { roughness: 0.9, flatShading: true });
    this.std('stone', 0x707068, { roughness: 0.88, flatShading: true });
    this.std('asphalt', 0x747470, { roughness: 0.88 });
    this.std('lineWhite', 0xe8e4dc, { roughness: 0.7 });
    this.std('lineYellow', 0xc9a84c, { roughness: 0.72 });
    this.std('plinth', 0x242018, { roughness: 0.55 });
    this.std('plinthEdge', 0x3a3020, { roughness: 0.48, metalness: 0.15 });

    // --- Residential 一户建 ---
    this.std('houseWallA', 0xe8e0d0, { roughness: 0.88 }); // cream
    this.std('houseWallB', 0xd8d4cc, { roughness: 0.86 }); // light gray
    this.std('houseWallC', 0xd4c4a8, { roughness: 0.9 }); // warm beige
    this.std('houseTrim', 0x4a3a2c, { roughness: 0.82, flatShading: true }); // dark wood
    this.std('houseRoof', 0x2a3034, { roughness: 0.7, flatShading: true });
    this.std('houseRoofEdge', 0x1a2024, { roughness: 0.68, flatShading: true });
    this.std('houseWindow', 0x3a4a58, {
      roughness: 0.2,
      metalness: 0.4,
      emissive: 0x2a3848,
      emissiveIntensity: 0.15,
    });
    this.std('houseWindowWarm', 0x4a4030, {
      roughness: 0.25,
      emissive: 0xffc878,
      emissiveIntensity: 0.35,
    });
    this.std('houseDoor', 0x5a4030, { roughness: 0.75, flatShading: true });
    this.std('houseShutter', 0x8a8a84, { roughness: 0.7, metalness: 0.2 });
    this.std('concreteWall', 0xa8a8a0, { roughness: 0.9, flatShading: true }); // block wall
    this.std('fenceWood', 0x6a5238, { roughness: 0.85, flatShading: true });
    this.std('tileWalk', 0xb0b0a8, { roughness: 0.88 });
    this.std('soilBed', 0x5a4530, { roughness: 0.95, flatShading: true });
    this.std('clothWhite', 0xf0ebe4, { roughness: 0.85, transparent: true, opacity: 0.92 });
    this.std('clothBlue', 0x8ab0c8, { roughness: 0.85 });
    this.std('mailBox', 0x3a5a4a, { roughness: 0.65, metalness: 0.2 });
    this.std('acUnit', 0xc8c8c0, { roughness: 0.55, metalness: 0.35 });
    this.std('carBody', 0xd8d8d0, { roughness: 0.4, metalness: 0.35, flatShading: true });
    this.std('carAccent', 0x4a6a8a, { roughness: 0.4, metalness: 0.3 });
    this.std('shedWall', 0x7a8a7a, { roughness: 0.85, flatShading: true });

    // --- Railway ---
    this.std('rail', 0x3a3d42, { roughness: 0.35, metalness: 0.78, flatShading: true });
    this.std('sleeper', 0x5c4033, { roughness: 0.9, flatShading: true });
    this.std('sleeperDark', 0x3d2a1f, { roughness: 0.92, flatShading: true });

    // --- Crossing equipment ---
    this.std('gateRed', 0xc43c3c, { roughness: 0.55, metalness: 0.1 });
    this.std('gateWhite', 0xe8e4dc, { roughness: 0.58, metalness: 0.05 });
    this.std('gatePost', 0x2a2a2e, { roughness: 0.5, metalness: 0.55 });
    this.std('warnYellow', 0xd4a83a, { roughness: 0.6, metalness: 0.15 });
    this.std('warnBlack', 0x1c1c1e, { roughness: 0.55, metalness: 0.2 });
    this.std('signalHousing', 0x2a2e32, { roughness: 0.55, metalness: 0.4 });
    this.std('controlBox', 0x5a5e62, { roughness: 0.65, metalness: 0.45 });

    // Emissive lamps (updated at runtime)
    this.std('lampRed', 0x440c0c, {
      roughness: 0.4,
      metalness: 0.1,
      emissive: 0xff2211,
      emissiveIntensity: 0.2,
    });
    this.std('lampGreen', 0x0a3320, {
      roughness: 0.4,
      emissive: 0x22ff88,
      emissiveIntensity: 0.35,
    });
    this.std('lampYellow', 0x332a0a, {
      roughness: 0.4,
      emissive: 0xffaa22,
      emissiveIntensity: 0.25,
    });
    this.std('lampWarm', 0x4a3010, {
      roughness: 0.45,
      emissive: 0xffb84d,
      emissiveIntensity: 0.7,
    });
    this.std('vendingScreen', 0x3a4050, {
      roughness: 0.25,
      emissive: 0x6a9fff,
      emissiveIntensity: 0.85,
    });
    this.std('vendingBody', 0xe85d4c, { roughness: 0.5, metalness: 0.2 });
    this.std('vendingWhite', 0xf0ebe4, { roughness: 0.45, metalness: 0.15 });

    // --- Station ---
    this.std('woodDark', 0x3d2f24, { roughness: 0.85, flatShading: true });
    this.std('woodMid', 0x6a4e38, { roughness: 0.82, flatShading: true });
    this.std('woodLight', 0x8a6a48, { roughness: 0.8, flatShading: true });
    this.std('wall', 0xd8d0c0, { roughness: 0.88 });
    this.std('wallShade', 0xc4bba8, { roughness: 0.9 });
    this.std('roof', 0x2d3436, { roughness: 0.72, flatShading: true });
    this.std('roofEdge', 0x1a1f21, { roughness: 0.68, flatShading: true });

    // --- Train (rural railbus) ---
    this.std('trainBody', 0xe8e2d4, { roughness: 0.55, metalness: 0.12 });
    this.std('trainStripe', 0xc45a32, { roughness: 0.5, metalness: 0.15 });
    this.std('trainRoof', 0x3a4044, { roughness: 0.6, metalness: 0.35, flatShading: true });
    this.std('trainDoor', 0xd0c8b8, { roughness: 0.58, metalness: 0.15 });
    this.std('trainGlass', 0x2a3848, {
      roughness: 0.18,
      metalness: 0.55,
      emissive: 0x1a2838,
      emissiveIntensity: 0.25,
    });
    this.std('trainHeadlight', 0xf0e8d0, {
      roughness: 0.3,
      emissive: 0xffe8b0,
      emissiveIntensity: 0.9,
    });

    // --- Vegetation ---
    this.std('trunk', 0x4a3828, { roughness: 0.92, flatShading: true });
    this.std('trunkDark', 0x33281c, { roughness: 0.94, flatShading: true });
    this.std('leafA', 0x5a8f4a, { roughness: 0.85, flatShading: true });
    this.std('leafB', 0x6fa058, { roughness: 0.85, flatShading: true });
    this.std('leafC', 0x4a7a3e, { roughness: 0.88, flatShading: true });
    this.std('sakura', 0xe8a0b8, { roughness: 0.8, flatShading: true });
    this.std('sakuraLight', 0xf0c0d0, { roughness: 0.78, flatShading: true });
    this.std('maple', 0xc45c38, { roughness: 0.82, flatShading: true });
    this.std('bamboo', 0x7a9a4a, { roughness: 0.7, flatShading: true });
    this.std('bambooDark', 0x5a7a3a, { roughness: 0.72, flatShading: true });
    this.std('grassBlade', 0x78a858, { roughness: 0.9, flatShading: true });
    this.std('flowerWhite', 0xf0e8e0, { roughness: 0.75, flatShading: true });
    this.std('flowerYellow', 0xe8c84a, { roughness: 0.75, flatShading: true });
    this.std('flowerPink', 0xe88ab0, { roughness: 0.75, flatShading: true });

    // --- Props ---
    this.std('metalGray', 0x6a6e72, { roughness: 0.55, metalness: 0.6, flatShading: true });
    this.std('metalDark', 0x2e3236, { roughness: 0.5, metalness: 0.55 });
    this.std('poleWood', 0x5a4a38, { roughness: 0.88, flatShading: true });
    this.std('wire', 0x1a1a1c, { roughness: 0.4, metalness: 0.7 });
    this.std('bicycleFrame', 0x2a4a6a, { roughness: 0.45, metalness: 0.5, flatShading: true });
    this.std('bicycleTire', 0x1c1c1e, { roughness: 0.9 });
    this.std('benchWood', 0x6a4e30, { roughness: 0.82, flatShading: true });
    this.std('trash', 0x4a5a4a, { roughness: 0.7, metalness: 0.2, flatShading: true });
    this.std('concrete', 0x8a8a84, { roughness: 0.9, flatShading: true });
    this.std('drain', 0x4a4e52, { roughness: 0.7, metalness: 0.4, flatShading: true });
    this.std('signRed', 0xc43c3c, { roughness: 0.55 });
    this.std('signWhite', 0xf0ebe4, { roughness: 0.55 });
    this.std('hill', 0x628552, { roughness: 0.92, flatShading: true });
    this.std('hillFar', 0x6f9268, { roughness: 0.94, flatShading: true });
    this.std('cloud', 0xeef4f8, { roughness: 0.95, flatShading: true, transparent: true, opacity: 0.4 });
  }

  dispose(): void {
    for (const m of this.mats.values()) m.dispose();
    this.mats.clear();
  }
}

export const materials = new MaterialLibrary();
