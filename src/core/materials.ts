import * as THREE from 'three';

/**
 * Central PBR material library — summer local-railway residential palette.
 */
export class MaterialLibrary {
  private mats = new Map<string, THREE.Material>();

  get(name: string): THREE.Material {
    const m = this.mats.get(name);
    if (!m) throw new Error(`Material not found: ${name}`);
    return m;
  }

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
    // Ground
    this.std('grass', 0x5f9e42, { roughness: 0.92, flatShading: true });
    this.std('grassBright', 0x7fb84b, { roughness: 0.9, flatShading: true });
    this.std('grassShade', 0x39713a, { roughness: 0.94, flatShading: true });
    this.std('grassDry', 0xa5a05a, { roughness: 0.95, flatShading: true });
    this.std('dirt', 0x8b7355, { roughness: 0.96, flatShading: true });
    this.std('dirtLight', 0xa58a68, { roughness: 0.94, flatShading: true });
    this.std('dirtDark', 0x66513d, { roughness: 0.98, flatShading: true });
    this.std('ballast', 0x68645d, { roughness: 0.9, flatShading: true });
    this.std('ballastDark', 0x484641, { roughness: 0.92, flatShading: true });
    this.std('ballastLight', 0x858077, { roughness: 0.88, flatShading: true });
    this.std('stone', 0x707068, { roughness: 0.88, flatShading: true });
    this.std('asphalt', 0x4e5050, { roughness: 0.88 });
    this.std('asphaltLight', 0x626464, { roughness: 0.86 });
    this.std('lineWhite', 0xf1f0e8, { roughness: 0.7 });
    this.std('lineYellow', 0xe0b62d, { roughness: 0.72 });
    this.std('plinth', 0x242018, { roughness: 0.55 });
    this.std('plinthEdge', 0x3a3020, { roughness: 0.48, metalness: 0.15 });

    // Houses
    this.std('houseWallA', 0xe7e0d2, { roughness: 0.88 });
    this.std('houseWallB', 0xd9dcd8, { roughness: 0.86 });
    this.std('houseWallB2', 0xf0eee7, { roughness: 0.84 });
    this.std('houseWallC', 0xcdbb98, { roughness: 0.9 });
    this.std('houseWoodC', 0x76573d, { roughness: 0.85, flatShading: true });
    this.std('houseTrim', 0x684a35, { roughness: 0.82, flatShading: true });
    this.std('houseTrimDark', 0x493327, { roughness: 0.84, flatShading: true });
    this.std('houseRoof', 0x3d4143, { roughness: 0.7, flatShading: true });
    this.std('houseRoofB', 0x34393c, { roughness: 0.7, flatShading: true });
    this.std('houseRoofC', 0x454544, { roughness: 0.72, flatShading: true });
    this.std('houseRoofEdge', 0x57595a, { roughness: 0.68, flatShading: true });
    this.std('houseWindow', 0x263b42, {
      roughness: 0.2,
      metalness: 0.4,
      emissive: 0x1a2830,
      emissiveIntensity: 0.12,
    });
    this.std('houseWindowWarm', 0x4a4030, {
      roughness: 0.25,
      emissive: 0xffc878,
      emissiveIntensity: 0.35,
    });
    this.std('houseDoor', 0x614633, { roughness: 0.75, flatShading: true });
    this.std('houseShutter', 0x707778, { roughness: 0.7, metalness: 0.25 });
    this.std('concreteWall', 0xa6a29a, { roughness: 0.9, flatShading: true });
    this.std('brickWall', 0x9b6250, { roughness: 0.88, flatShading: true });
    this.std('fenceWood', 0x70533d, { roughness: 0.85, flatShading: true });
    this.std('hedge', 0x3f7d37, { roughness: 0.88, flatShading: true });
    this.std('tileWalk', 0xb0b0a8, { roughness: 0.88 });
    this.std('soilBed', 0x8b7355, { roughness: 0.95, flatShading: true });
    this.std('clothWhite', 0xf0ebe4, { roughness: 0.85, transparent: true, opacity: 0.92 });
    this.std('clothBlue', 0x8ab0c8, { roughness: 0.85 });
    this.std('mailBox', 0x3a5a4a, { roughness: 0.65, metalness: 0.2 });
    this.std('acUnit', 0xc8c8c0, { roughness: 0.55, metalness: 0.35 });
    this.std('carBody', 0xd8d8d0, { roughness: 0.4, metalness: 0.35, flatShading: true });
    this.std('shedWall', 0x7a8a7a, { roughness: 0.85, flatShading: true });
    this.std('pipeConcrete', 0x9b9890, { roughness: 0.92, flatShading: true });
    this.std('pipeInner', 0x403e39, { roughness: 0.95, flatShading: true });
    this.std('pipeRim', 0x817e77, { roughness: 0.9, flatShading: true });

    // Railway
    this.std('rail', 0x44484a, { roughness: 0.35, metalness: 0.72, flatShading: true });
    this.std('railHead', 0x777b7b, { roughness: 0.3, metalness: 0.75, flatShading: true });
    this.std('sleeper', 0x594a3b, { roughness: 0.9, flatShading: true });
    this.std('sleeperDark', 0x3d342c, { roughness: 0.92, flatShading: true });

    // Crossing
    this.std('gateRed', 0xd52f2f, { roughness: 0.55, metalness: 0.1 });
    this.std('gateWhite', 0xf1f0e8, { roughness: 0.58, metalness: 0.05 });
    this.std('gatePost', 0x282b2a, { roughness: 0.5, metalness: 0.55 });
    this.std('warnYellow', 0xe0b62d, { roughness: 0.6, metalness: 0.15 });
    this.std('warnBlack', 0x282b2a, { roughness: 0.55, metalness: 0.2 });
    this.std('signalHousing', 0x2a2e32, { roughness: 0.55, metalness: 0.4 });
    this.std('controlBox', 0x5a5e62, { roughness: 0.65, metalness: 0.45 });

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

    // Station / wood
    this.std('woodDark', 0x3d2f24, { roughness: 0.85, flatShading: true });
    this.std('woodMid', 0x654a36, { roughness: 0.82, flatShading: true });
    this.std('woodLight', 0x8a6a48, { roughness: 0.8, flatShading: true });
    this.std('wall', 0xe3d8c2, { roughness: 0.88 });
    this.std('wallShade', 0xc4bba8, { roughness: 0.9 });
    this.std('roof', 0x454847, { roughness: 0.72, flatShading: true });
    this.std('roofEdge', 0x1a2024, { roughness: 0.68, flatShading: true });

    // Vegetation
    this.std('trunk', 0x5a4433, { roughness: 0.92, flatShading: true });
    this.std('trunkDark', 0x42362c, { roughness: 0.94, flatShading: true });
    this.std('leafA', 0x286d32, { roughness: 0.85, flatShading: true });
    this.std('leafB', 0x3d8836, { roughness: 0.85, flatShading: true });
    this.std('leafC', 0x2f7d32, { roughness: 0.88, flatShading: true });
    this.std('leafD', 0x5ba53f, { roughness: 0.84, flatShading: true });
    this.std('leafE', 0x79b84b, { roughness: 0.82, flatShading: true });
    this.std('leafDeep', 0x185c2a, { roughness: 0.9, flatShading: true });
    this.std('leafSun', 0x8bc34a, { roughness: 0.8, flatShading: true });
    this.std('sakura', 0xe8a0b8, { roughness: 0.8, flatShading: true });
    this.std('sakuraLight', 0xf0c0d0, { roughness: 0.78, flatShading: true });
    this.std('maple', 0x4e8f43, { roughness: 0.82, flatShading: true });
    this.std('plum', 0x397a3a, { roughness: 0.85, flatShading: true });
    this.std('persimmon', 0x39733a, { roughness: 0.85, flatShading: true });
    this.std('persimmonFruit', 0xd97832, { roughness: 0.7, flatShading: true });
    this.std('bamboo', 0x5a9b45, { roughness: 0.7, flatShading: true });
    this.std('bambooDark', 0x3f7d37, { roughness: 0.72, flatShading: true });
    this.std('grassBlade', 0x57a83e, { roughness: 0.9, flatShading: true });
    this.std('flowerWhite', 0xf2efe0, { roughness: 0.75, flatShading: true });
    this.std('flowerYellow', 0xe6d56b, { roughness: 0.75, flatShading: true });
    this.std('flowerRed', 0xd84343, { roughness: 0.75, flatShading: true });
    this.std('flowerOrange', 0xe5a34b, { roughness: 0.75, flatShading: true });
    this.std('flowerPink', 0xd68a9a, { roughness: 0.75, flatShading: true });
    this.std('hydrangea', 0x788ac7, { roughness: 0.78, flatShading: true });
    this.std('hydrangeaLight', 0x8799d7, { roughness: 0.78, flatShading: true });
    this.std('hydrangeaPale', 0xb0b4dc, { roughness: 0.78, flatShading: true });
    this.std('potA', 0xb7b0a0, { roughness: 0.85, flatShading: true });
    this.std('potB', 0xd7d0c1, { roughness: 0.85, flatShading: true });
    this.std('potC', 0x7e6653, { roughness: 0.85, flatShading: true });

    // Train — cream + burgundy local line
    this.std('trainBody', 0xf1e7c9, { roughness: 0.55, metalness: 0.12 });
    this.std('trainStripe', 0x6e302c, { roughness: 0.5, metalness: 0.15 });
    this.std('trainAccent', 0x315c73, { roughness: 0.5, metalness: 0.2 });
    this.std('trainSkirt', 0x3c4143, { roughness: 0.6, metalness: 0.35, flatShading: true });
    this.std('trainRoof', 0x555756, { roughness: 0.6, metalness: 0.35, flatShading: true });
    this.std('trainDoor', 0xf1e7c9, { roughness: 0.55, metalness: 0.12 });
    this.std('trainGlass', 0x263d43, {
      roughness: 0.18,
      metalness: 0.5,
      emissive: 0x1a2830,
      emissiveIntensity: 0.2,
    });
    this.std('trainHeadlight', 0xd5d1c2, {
      roughness: 0.3,
      emissive: 0xfff3c4,
      emissiveIntensity: 0.95,
    });
    this.std('trainGrille', 0x4a4b48, { roughness: 0.65, metalness: 0.5, flatShading: true });
    this.std('trainCoupler', 0x303432, { roughness: 0.6, metalness: 0.55 });
    this.std('trainSeat', 0x59675e, { roughness: 0.85, flatShading: true });
    this.std('trainInterior', 0xd2c9b7, { roughness: 0.8 });

    // Props
    this.std('metalGray', 0x777a78, { roughness: 0.55, metalness: 0.6, flatShading: true });
    this.std('metalDark', 0x2e3236, { roughness: 0.5, metalness: 0.55 });
    this.std('poleWood', 0x77706a, { roughness: 0.88, flatShading: true });
    this.std('wire', 0x343837, { roughness: 0.4, metalness: 0.7 });
    this.std('bicycleFrame', 0x2a4a6a, { roughness: 0.45, metalness: 0.5, flatShading: true });
    this.std('bicycleTire', 0x1c1c1e, { roughness: 0.9 });
    this.std('benchWood', 0x6a4e30, { roughness: 0.82, flatShading: true });
    this.std('trash', 0x4a5a4a, { roughness: 0.7, metalness: 0.2, flatShading: true });
    this.std('concrete', 0xa5a39d, { roughness: 0.9, flatShading: true });
    this.std('drain', 0x5d5b55, { roughness: 0.7, metalness: 0.4, flatShading: true });
    this.std('signRed', 0xd52f2f, { roughness: 0.55 });
    this.std('signWhite', 0xf0e8d2, { roughness: 0.55 });
    this.std('hill', 0x2f7d32, { roughness: 0.92, flatShading: true });
    this.std('hillFar', 0x185c2a, { roughness: 0.94, flatShading: true });
    this.std('cloud', 0xf7faf7, {
      roughness: 0.95,
      flatShading: true,
      transparent: true,
      opacity: 0.78,
    });
  }

  dispose(): void {
    for (const m of this.mats.values()) m.dispose();
    this.mats.clear();
  }
}

export const materials = new MaterialLibrary();
