import * as THREE from 'three';

/**
 * Canvas-painted texture atlas — signs, labels, windows, details.
 * No network images; all art authored at runtime (AFTER RAIN style).
 */
export interface TextureAtlas {
  canvas: HTMLCanvasElement;
  textures: Record<string, THREE.CanvasTexture>;
  get(name: string): THREE.CanvasTexture;
  dispose(): void;
}

export function createTextureAtlas(): TextureAtlas {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 2048;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 2048, 2048);

  const textures: Record<string, THREE.CanvasTexture> = {};
  const regions: Record<string, [number, number, number, number]> = {};

  let cursor = 0;
  function tile(name: string, w: number, h: number, draw: (c: CanvasRenderingContext2D) => void): void {
    const x = (cursor % 8) * 256;
    const y = Math.floor(cursor / 8) * 256;
    cursor += Math.ceil(w / 256) || 1;
    // Use dedicated offscreen then blit for isolation
    const off = document.createElement('canvas');
    off.width = w;
    off.height = h;
    const c = off.getContext('2d')!;
    draw(c);
    ctx.drawImage(off, x, y, w, h);
    regions[name] = [x, y, w, h];
  }

  const font = (size: number, weight = 500) =>
    `${weight} ${size}px "Hiragino Sans", "PingFang SC", "Yu Gothic", "Noto Sans JP", sans-serif`;

  const text = (
    c: CanvasRenderingContext2D,
    s: string,
    x: number,
    y: number,
    size: number,
    color = '#2a2a28',
    weight = 500,
  ) => {
    c.fillStyle = color;
    c.font = font(size, weight);
    c.fillText(s, x, y);
  };

  // --- Station name plate (cream + green stripe) ---
  tile('stationSign', 512, 128, (c) => {
    c.fillStyle = '#f0e8d2';
    c.fillRect(0, 0, 512, 128);
    c.fillStyle = '#3f7d37';
    c.fillRect(0, 8, 512, 12);
    c.fillRect(0, 108, 512, 12);
    text(c, '山 里', 40, 78, 52, '#343938', 700);
    text(c, 'YAMASATO', 200, 72, 28, '#343938', 500);
    text(c, '←  次は 緑ヶ丘  →', 200, 100, 16, '#5a5e5c', 400);
  });

  // --- Train destination board ---
  tile('trainDest', 512, 96, (c) => {
    c.fillStyle = '#1a2420';
    c.fillRect(0, 0, 512, 96);
    c.fillStyle = '#f1e7c9';
    c.fillRect(0, 6, 512, 6);
    c.fillRect(0, 84, 512, 6);
    text(c, '普通  山里行', 36, 62, 36, '#f1e7c9', 600);
    text(c, 'LOCAL', 360, 58, 22, '#c4b89a', 400);
  });

  // --- Train side number / line mark ---
  tile('trainMark', 256, 128, (c) => {
    c.fillStyle = 'rgba(0,0,0,0)';
    text(c, 'YS-101', 24, 48, 36, '#6e302c', 700);
    text(c, '山里線', 24, 88, 28, '#315c73', 500);
  });

  // --- Small timetable ---
  tile('timetable', 256, 320, (c) => {
    c.fillStyle = '#e8e2cc';
    c.fillRect(0, 0, 256, 320);
    c.fillStyle = '#3d6b52';
    c.fillRect(0, 0, 256, 36);
    text(c, '時刻表', 12, 26, 22, '#f0e8d2', 600);
    for (let i = 0; i < 10; i++) {
      c.fillStyle = '#8a8478';
      c.fillRect(16, 50 + i * 24, 100 + (i % 3) * 40, 3);
      c.fillRect(16, 58 + i * 24, 70 + (i % 2) * 50, 2);
    }
    text(c, '上り  下り', 16, 300, 16, '#5a5e5c', 400);
  });

  // --- Vending product panel ---
  tile('vendingPanel', 256, 384, (c) => {
    c.fillStyle = '#1e2a32';
    c.fillRect(0, 0, 256, 384);
    const cols = ['#8dad99', '#d7ba67', '#b96149', '#d5ddc2', '#78a0b6', '#c4a882'];
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        const sx = 22 + x * 56;
        const sy = 28 + y * 82;
        c.fillStyle = cols[(x + y) % cols.length];
        c.fillRect(sx, sy, 36, 52);
        c.fillStyle = '#ede6cf';
        c.fillRect(sx + 4, sy - 4, 28, 8);
        c.fillRect(sx + 6, sy + 18, 24, 12);
        c.fillStyle = '#bacabd';
        c.fillRect(sx - 2, sy + 58, 40, 6);
      }
    }
    c.fillStyle = '#386759';
    c.fillRect(12, 352, 180, 24);
    text(c, 'DRINKS  ¥120', 24, 370, 16, '#e7e6c8', 500);
  });

  // --- Poster for station wall ---
  tile('poster', 256, 256, (c) => {
    c.fillStyle = '#f0ddaf';
    c.fillRect(0, 0, 256, 256);
    c.fillStyle = '#b96044';
    c.fillRect(0, 0, 256, 56);
    text(c, 'あったか おでん', 14, 38, 24, '#f9edd1', 600);
    for (let k = 0; k < 5; k++) {
      c.fillStyle = ['#e8bd67', '#ac7a4e', '#f3d790', '#dca171', '#f6dbb2'][k];
      c.beginPath();
      c.arc(48 + (k % 3) * 70, 100 + Math.floor(k / 3) * 55, 22, 0, 7);
      c.fill();
    }
    text(c, 'ほっと、ひと息。', 28, 230, 22, '#746046', 400);
  });

  // --- Open sign ---
  tile('openSign', 256, 128, (c) => {
    c.fillStyle = '#253d36';
    c.fillRect(0, 0, 256, 128);
    text(c, 'OPEN', 24, 58, 48, '#efe6b6', 700);
    text(c, '24 HOURS', 24, 96, 22, '#d9d6ad', 400);
  });

  // --- Road asphalt patch detail ---
  tile('asphalt', 256, 256, (c) => {
    c.fillStyle = '#4e5050';
    c.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 80; i++) {
      c.fillStyle = i % 3 === 0 ? '#5a5c5c' : '#454748';
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      c.fillRect(x, y, 2 + Math.random() * 4, 2 + Math.random() * 3);
    }
    // Faint crack
    c.strokeStyle = '#3a3c3d';
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(20, 40);
    c.quadraticCurveTo(80, 90, 60, 200);
    c.stroke();
  });

  // --- Concrete wall blocks ---
  tile('blockWall', 256, 128, (c) => {
    c.fillStyle = '#a6a29a';
    c.fillRect(0, 0, 256, 128);
    c.strokeStyle = '#8a8680';
    c.lineWidth = 2;
    for (let y = 0; y < 4; y++) {
      c.beginPath();
      c.moveTo(0, y * 32);
      c.lineTo(256, y * 32);
      c.stroke();
      for (let x = (y % 2) * 32; x < 256; x += 64) {
        c.beginPath();
        c.moveTo(x, y * 32);
        c.lineTo(x, y * 32 + 32);
        c.stroke();
      }
    }
  });

  // --- House A wood grain band ---
  tile('woodGrain', 256, 64, (c) => {
    c.fillStyle = '#684a35';
    c.fillRect(0, 0, 256, 64);
    c.strokeStyle = '#493327';
    c.lineWidth = 1;
    for (let i = 0; i < 12; i++) {
      c.beginPath();
      c.moveTo(0, 4 + i * 5);
      for (let x = 0; x < 256; x += 8) {
        c.lineTo(x, 4 + i * 5 + Math.sin(x * 0.08 + i) * 1.5);
      }
      c.stroke();
    }
  });

  // --- Roof tile pattern ---
  tile('roofTile', 256, 128, (c) => {
    c.fillStyle = '#3d4143';
    c.fillRect(0, 0, 256, 128);
    c.fillStyle = '#57595a';
    for (let y = 0; y < 6; y++) {
      for (let x = 0; x < 10; x++) {
        c.beginPath();
        c.ellipse(x * 28 + (y % 2) * 14, y * 22 + 10, 12, 8, 0, 0, Math.PI);
        c.fill();
      }
    }
  });

  // Build individual textures from atlas regions via crop
  // Simpler: re-draw each tile as its own texture for clean UVs
  function bake(name: string, w: number, h: number, draw: (c: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
    const off = document.createElement('canvas');
    off.width = w;
    off.height = h;
    const c = off.getContext('2d')!;
    draw(c);
    const tex = new THREE.CanvasTexture(off);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    tex.needsUpdate = true;
    textures[name] = tex;
    return tex;
  }

  // Re-bake as independent textures (cleaner than atlas UV math for now)
  bake('stationSign', 512, 128, (c) => {
    c.fillStyle = '#f0e8d2';
    c.fillRect(0, 0, 512, 128);
    c.fillStyle = '#3f7d37';
    c.fillRect(0, 8, 512, 12);
    c.fillRect(0, 108, 512, 12);
    text(c, '山 里', 36, 78, 52, '#343938', 700);
    text(c, 'YAMASATO', 200, 70, 26, '#343938', 500);
    text(c, 'LOCAL LINE', 200, 98, 15, '#5a5e5c', 400);
  });

  bake('trainDest', 512, 96, (c) => {
    c.fillStyle = '#1a2420';
    c.fillRect(0, 0, 512, 96);
    c.fillStyle = '#f1e7c9';
    c.fillRect(0, 6, 512, 5);
    c.fillRect(0, 85, 512, 5);
    text(c, '普通  山里行', 30, 60, 34, '#f1e7c9', 600);
    text(c, 'YS-101', 380, 56, 20, '#c4b89a', 500);
  });

  bake('trainSide', 256, 128, (c) => {
    c.fillStyle = 'rgba(0,0,0,0)';
    c.clearRect(0, 0, 256, 128);
    text(c, 'YS-101', 20, 50, 34, '#6e302c', 700);
    text(c, '山里線', 20, 90, 26, '#315c73', 500);
  });

  bake('timetable', 200, 280, (c) => {
    c.fillStyle = '#e8e2cc';
    c.fillRect(0, 0, 200, 280);
    c.fillStyle = '#3d6b52';
    c.fillRect(0, 0, 200, 32);
    text(c, '時刻表', 10, 24, 20, '#f0e8d2', 600);
    for (let i = 0; i < 9; i++) {
      c.fillStyle = '#8a8478';
      c.fillRect(12, 46 + i * 24, 80 + (i % 3) * 30, 2);
      c.fillRect(12, 54 + i * 24, 55 + (i % 2) * 40, 2);
    }
  });

  bake('vendingPanel', 200, 320, (c) => {
    c.fillStyle = '#1e2a32';
    c.fillRect(0, 0, 200, 320);
    const cols = ['#8dad99', '#d7ba67', '#b96149', '#d5ddc2', '#78a0b6', '#c4a882'];
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        const sx = 18 + x * 46;
        const sy = 22 + y * 68;
        c.fillStyle = cols[(x + y) % cols.length];
        c.fillRect(sx, sy, 28, 42);
        c.fillStyle = '#ede6cf';
        c.fillRect(sx + 3, sy - 3, 22, 6);
        c.fillStyle = '#bacabd';
        c.fillRect(sx - 2, sy + 46, 32, 4);
      }
    }
    c.fillStyle = '#386759';
    c.fillRect(10, 292, 140, 20);
    text(c, 'DRINKS ¥120', 18, 307, 14, '#e7e6c8', 500);
  });

  bake('poster', 200, 200, (c) => {
    c.fillStyle = '#f0ddaf';
    c.fillRect(0, 0, 200, 200);
    c.fillStyle = '#b96044';
    c.fillRect(0, 0, 200, 44);
    text(c, 'あったかおでん', 10, 30, 20, '#f9edd1', 600);
    for (let k = 0; k < 5; k++) {
      c.fillStyle = ['#e8bd67', '#ac7a4e', '#f3d790', '#dca171', '#f6dbb2'][k];
      c.beginPath();
      c.arc(40 + (k % 3) * 55, 80 + Math.floor(k / 3) * 45, 18, 0, 7);
      c.fill();
    }
    text(c, 'ほっと、ひと息。', 20, 185, 18, '#746046', 400);
  });

  bake('openSign', 200, 100, (c) => {
    c.fillStyle = '#253d36';
    c.fillRect(0, 0, 200, 100);
    text(c, 'OPEN', 20, 48, 40, '#efe6b6', 700);
    text(c, '24 HOURS', 20, 78, 16, '#d9d6ad', 400);
  });

  bake('roofTile', 256, 128, (c) => {
    c.fillStyle = '#3d4143';
    c.fillRect(0, 0, 256, 128);
    c.fillStyle = '#57595a';
    for (let y = 0; y < 7; y++) {
      for (let x = 0; x < 11; x++) {
        c.beginPath();
        c.ellipse(x * 26 + (y % 2) * 13, y * 20 + 8, 11, 7, 0, 0, Math.PI);
        c.fill();
      }
    }
  });

  bake('woodGrain', 256, 64, (c) => {
    c.fillStyle = '#684a35';
    c.fillRect(0, 0, 256, 64);
    c.strokeStyle = '#493327';
    c.lineWidth = 1;
    for (let i = 0; i < 12; i++) {
      c.beginPath();
      c.moveTo(0, 3 + i * 5);
      for (let x = 0; x < 256; x += 8) {
        c.lineTo(x, 3 + i * 5 + Math.sin(x * 0.08 + i) * 1.5);
      }
      c.stroke();
    }
  });

  bake('asphalt', 256, 256, (c) => {
    c.fillStyle = '#4e5050';
    c.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 100; i++) {
      c.fillStyle = i % 3 === 0 ? '#5a5c5c' : '#454748';
      c.fillRect(Math.random() * 256, Math.random() * 256, 2 + Math.random() * 4, 2 + Math.random() * 3);
    }
    c.strokeStyle = '#3a3c3d';
    c.lineWidth = 1.2;
    c.beginPath();
    c.moveTo(20, 40);
    c.quadraticCurveTo(80, 90, 60, 200);
    c.stroke();
  });

  bake('blockWall', 256, 128, (c) => {
    c.fillStyle = '#a6a29a';
    c.fillRect(0, 0, 256, 128);
    c.strokeStyle = '#8a8680';
    c.lineWidth = 2;
    for (let y = 0; y < 4; y++) {
      c.beginPath();
      c.moveTo(0, y * 32);
      c.lineTo(256, y * 32);
      c.stroke();
      for (let x = (y % 2) * 32; x < 256; x += 64) {
        c.beginPath();
        c.moveTo(x, y * 32);
        c.lineTo(x, y * 32 + 32);
        c.stroke();
      }
    }
  });

  // Window warm interior (soft glow panel)
  bake('windowWarm', 128, 128, (c) => {
    const g = c.createLinearGradient(0, 0, 0, 128);
    g.addColorStop(0, '#5a4a30');
    g.addColorStop(0.4, '#c4a060');
    g.addColorStop(1, '#3a3020');
    c.fillStyle = g;
    c.fillRect(0, 0, 128, 128);
    // Seat silhouettes
    c.fillStyle = 'rgba(40,35,25,0.5)';
    c.fillRect(16, 70, 28, 40);
    c.fillRect(52, 78, 28, 32);
    c.fillRect(88, 70, 28, 40);
  });

  // Rain streak glass
  bake('glassRain', 128, 128, (c) => {
    c.fillStyle = 'rgba(38,61,67,0.85)';
    c.fillRect(0, 0, 128, 128);
    c.strokeStyle = 'rgba(180,210,220,0.25)';
    c.lineWidth = 1;
    for (let i = 0; i < 20; i++) {
      const x = Math.random() * 128;
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x + (Math.random() - 0.5) * 8, 128);
      c.stroke();
    }
    c.fillStyle = 'rgba(200,220,230,0.15)';
    for (let i = 0; i < 30; i++) {
      c.beginPath();
      c.arc(Math.random() * 128, Math.random() * 128, 1 + Math.random() * 2, 0, 7);
      c.fill();
    }
  });

  return {
    canvas,
    textures,
    get(name: string): THREE.CanvasTexture {
      const t = textures[name];
      if (!t) throw new Error(`Texture not found: ${name}`);
      return t;
    },
    dispose() {
      for (const t of Object.values(textures)) t.dispose();
    },
  };
}

/** Shared atlas — build once from main before scene assembly. */
export let atlas: TextureAtlas | null = null;

export function buildAtlas(): TextureAtlas {
  atlas = createTextureAtlas();
  return atlas;
}

export function getAtlas(): TextureAtlas {
  if (!atlas) atlas = createTextureAtlas();
  return atlas;
}

/** Create a standard material with optional map. */
export function texMat(
  map: THREE.Texture | null,
  color: THREE.ColorRepresentation,
  opts: {
    roughness?: number;
    metalness?: number;
    emissive?: THREE.ColorRepresentation;
    emissiveIntensity?: number;
    transparent?: boolean;
    opacity?: number;
  } = {},
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    map,
    color,
    roughness: opts.roughness ?? 0.75,
    metalness: opts.metalness ?? 0.08,
    emissive: opts.emissive ?? 0x000000,
    emissiveIntensity: opts.emissiveIntensity ?? 0,
    transparent: opts.transparent ?? false,
    opacity: opts.opacity ?? 1,
  });
}
