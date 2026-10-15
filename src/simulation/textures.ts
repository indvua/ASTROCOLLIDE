import * as THREE from 'three';

const textureCache: Map<string, THREE.CanvasTexture> = new Map();

/**
 * Creates an in-memory HTML5 canvas of given dimension
 */
function createOffscreenCanvas(width: number, height: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  return { canvas, ctx };
}

/**
 * Helper to wrap canvas into SRGB THREE.CanvasTexture with caching
 */
function finalizeTexture(key: string, canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  textureCache.set(key, texture);
  return texture;
}

/**
 * Generates Sun / Star procedural plasma texture
 */
export function getSunTexture(): THREE.CanvasTexture {
  const key = 'sun_texture';
  if (textureCache.has(key)) return textureCache.get(key)!;

  const { canvas, ctx } = createOffscreenCanvas(1024, 512);

  // Background deep radiant orange
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(0, 0, 1024, 512);

  // Layer 1: Convective solar granules
  for (let i = 0; i < 2400; i++) {
    const x = Math.random() * 1024;
    const y = Math.random() * 512;
    const r = 4 + Math.random() * 16;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    const bright = Math.random() > 0.4;
    grad.addColorStop(0, bright ? '#fef08a' : '#fb923c');
    grad.addColorStop(1, 'rgba(217, 119, 6, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Layer 2: Solar flares and active magnetic filaments
  ctx.strokeStyle = 'rgba(254, 240, 138, 0.4)';
  ctx.lineWidth = 3;
  for (let i = 0; i < 18; i++) {
    ctx.beginPath();
    let sx = Math.random() * 1024;
    let sy = 100 + Math.random() * 312;
    ctx.moveTo(sx, sy);
    for (let j = 0; j < 5; j++) {
      sx += (Math.random() - 0.5) * 80;
      sy += (Math.random() - 0.5) * 30;
      ctx.lineTo(sx, sy);
    }
    ctx.stroke();
  }

  // Layer 3: Sunspots (cooler magnetic cores)
  ctx.fillStyle = 'rgba(120, 53, 15, 0.7)';
  for (let i = 0; i < 12; i++) {
    const sx = Math.random() * 1024;
    const sy = 180 + Math.random() * 150;
    const sr = 3 + Math.random() * 8;
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();
  }

  return finalizeTexture(key, canvas);
}

/**
 * Generates Earth-like terrestrial texture with oceans, continents, and ice caps
 */
export function getEarthTexture(): THREE.CanvasTexture {
  const key = 'earth_texture';
  if (textureCache.has(key)) return textureCache.get(key)!;

  const { canvas, ctx } = createOffscreenCanvas(1024, 512);

  // Ocean base
  const oceanGrad = ctx.createLinearGradient(0, 0, 0, 512);
  oceanGrad.addColorStop(0, '#0c4a6e');
  oceanGrad.addColorStop(0.5, '#0369a1');
  oceanGrad.addColorStop(1, '#0c4a6e');
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(0, 0, 1024, 512);

  // Continents: clumped procedural landmasses
  const landColors = ['#15803d', '#166534', '#a16207', '#4d7c0f', '#854d0e'];
  for (let continent = 0; continent < 14; continent++) {
    const cx = Math.random() * 1024;
    const cy = 120 + Math.random() * 270;
    const cr = 45 + Math.random() * 95;

    for (let blob = 0; blob < 30; blob++) {
      const bx = cx + (Math.random() - 0.5) * cr * 1.8;
      const by = cy + (Math.random() - 0.5) * cr;
      const br = 12 + Math.random() * 35;
      ctx.fillStyle = landColors[blob % landColors.length];
      ctx.beginPath();
      ctx.arc(bx, by, br, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Polar ice caps
  ctx.fillStyle = '#f8fafc';
  // North pole
  ctx.fillRect(0, 0, 1024, 45);
  // South pole
  ctx.fillRect(0, 467, 1024, 45);

  return finalizeTexture(key, canvas);
}

/**
 * Generates Earth cloud layer texture
 */
export function getCloudsTexture(): THREE.CanvasTexture {
  const key = 'clouds_texture';
  if (textureCache.has(key)) return textureCache.get(key)!;

  const { canvas, ctx } = createOffscreenCanvas(1024, 512);
  ctx.clearRect(0, 0, 1024, 512);

  for (let i = 0; i < 220; i++) {
    const x = Math.random() * 1024;
    const y = 80 + Math.random() * 352;
    const rx = 30 + Math.random() * 80;
    const ry = 8 + Math.random() * 24;

    const grad = ctx.createRadialGradient(x, y, 0, x, y, rx);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
    grad.addColorStop(0.6, 'rgba(255, 255, 255, 0.4)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0.1 * (Math.random() - 0.5), 0, Math.PI * 2);
    ctx.fill();
  }

  return finalizeTexture(key, canvas);
}

/**
 * Generates Mars texture with red-orange regolith and basaltic maria
 */
export function getMarsTexture(): THREE.CanvasTexture {
  const key = 'mars_texture';
  if (textureCache.has(key)) return textureCache.get(key)!;

  const { canvas, ctx } = createOffscreenCanvas(1024, 512);

  // Red regolith base
  ctx.fillStyle = '#b45309';
  ctx.fillRect(0, 0, 1024, 512);

  // Dark volcanic basalt plains (Acidalia Planitia, Syrtis Major)
  ctx.fillStyle = '#78350f';
  for (let i = 0; i < 40; i++) {
    const x = Math.random() * 1024;
    const y = 140 + Math.random() * 240;
    const r = 25 + Math.random() * 60;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Craters with rim highlights
  for (let i = 0; i < 120; i++) {
    const x = Math.random() * 1024;
    const y = Math.random() * 512;
    const r = 4 + Math.random() * 18;

    ctx.strokeStyle = 'rgba(254, 215, 170, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = 'rgba(67, 20, 7, 0.5)';
    ctx.beginPath();
    ctx.arc(x, y, r * 0.7, 0, Math.PI * 2);
    ctx.fill();
  }

  // Small polar ice caps
  ctx.fillStyle = '#ffedd5';
  ctx.fillRect(0, 0, 1024, 25);
  ctx.fillRect(0, 487, 1024, 25);

  return finalizeTexture(key, canvas);
}

/**
 * Generates Jupiter banded cloud texture with Great Red Spot
 */
export function getJupiterTexture(): THREE.CanvasTexture {
  const key = 'jupiter_texture';
  if (textureCache.has(key)) return textureCache.get(key)!;

  const { canvas, ctx } = createOffscreenCanvas(1024, 512);

  // Banded horizontal stripes
  const bands = [
    '#ca8a04', '#d97706', '#92400e', '#fde047', '#b45309',
    '#fef08a', '#78350f', '#ca8a04', '#fed7aa', '#b45309',
    '#d97706', '#fef08a', '#92400e', '#ca8a04'
  ];

  const bandH = 512 / bands.length;
  for (let b = 0; b < bands.length; b++) {
    ctx.fillStyle = bands[b];
    ctx.fillRect(0, b * bandH, 1024, bandH + 2);
  }

  // Atmospheric turbulence eddies along band borders
  for (let y = 0; y < 512; y += 30) {
    ctx.fillStyle = 'rgba(254, 240, 138, 0.35)';
    for (let x = 0; x < 1024; x += 40) {
      const offset = Math.sin(x * 0.05 + y) * 8;
      ctx.beginPath();
      ctx.arc(x + offset, y, 12, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Great Red Spot (southern tropical zone)
  const grsX = 640;
  const grsY = 320;
  const grsGrad = ctx.createRadialGradient(grsX, grsY, 5, grsX, grsY, 55);
  grsGrad.addColorStop(0, '#dc2626');
  grsGrad.addColorStop(0.5, '#ea580c');
  grsGrad.addColorStop(1, 'rgba(234, 88, 12, 0)');
  ctx.fillStyle = grsGrad;
  ctx.beginPath();
  ctx.ellipse(grsX, grsY, 60, 32, 0.1, 0, Math.PI * 2);
  ctx.fill();

  return finalizeTexture(key, canvas);
}

/**
 * Generates Saturn's pastel golden gas bands
 */
export function getSaturnTexture(): THREE.CanvasTexture {
  const key = 'saturn_texture';
  if (textureCache.has(key)) return textureCache.get(key)!;

  const { canvas, ctx } = createOffscreenCanvas(1024, 512);

  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, '#ca8a04');
  grad.addColorStop(0.2, '#fde047');
  grad.addColorStop(0.35, '#eab308');
  grad.addColorStop(0.5, '#fef08a');
  grad.addColorStop(0.65, '#ca8a04');
  grad.addColorStop(0.8, '#eab308');
  grad.addColorStop(1, '#a16207');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 512);

  // Subtle thin cloud bands
  for (let y = 0; y < 512; y += 12) {
    ctx.fillStyle = y % 24 === 0 ? 'rgba(255, 255, 255, 0.12)' : 'rgba(113, 63, 18, 0.12)';
    ctx.fillRect(0, y, 1024, 5);
  }

  return finalizeTexture(key, canvas);
}

/**
 * Generates Saturn's Rings radial texture (with pristine ice bands and Cassini division)
 */
export function getSaturnRingsTexture(): THREE.CanvasTexture {
  const key = 'saturn_rings_texture';
  if (textureCache.has(key)) return textureCache.get(key)!;

  const { canvas, ctx } = createOffscreenCanvas(1024, 64);
  const grad = ctx.createLinearGradient(0, 0, 1024, 0);

  // Inner ring C (crepe ring)
  grad.addColorStop(0.0, 'rgba(217, 119, 6, 0)');
  grad.addColorStop(0.12, 'rgba(217, 119, 6, 0.35)');
  // Ring B (brightest, densest)
  grad.addColorStop(0.25, 'rgba(254, 240, 138, 0.9)');
  grad.addColorStop(0.55, 'rgba(253, 224, 71, 0.85)');
  // Cassini Division (dark gap)
  grad.addColorStop(0.58, 'rgba(0, 0, 0, 0.05)');
  grad.addColorStop(0.64, 'rgba(0, 0, 0, 0.05)');
  // Ring A
  grad.addColorStop(0.66, 'rgba(254, 240, 138, 0.7)');
  grad.addColorStop(0.88, 'rgba(202, 138, 4, 0.6)');
  // Encke division & outer edge
  grad.addColorStop(0.92, 'rgba(0, 0, 0, 0)');
  grad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 64);

  return finalizeTexture(key, canvas);
}

/**
 * Generates Uranus's distinct Cryogenic Narrow Rings texture
 * Pitch-dark carbonaceous & methane ice bands, thin sharp filaments, starkly different from Saturn
 */
export function getUranusRingsTexture(): THREE.CanvasTexture {
  const key = 'uranus_rings_texture';
  if (textureCache.has(key)) return textureCache.get(key)!;

  const { canvas, ctx } = createOffscreenCanvas(1024, 64);
  ctx.clearRect(0, 0, 1024, 64);

  // Faint dark dusty backdrop
  const grad = ctx.createLinearGradient(0, 0, 1024, 0);
  grad.addColorStop(0.0, 'rgba(0, 0, 0, 0)');
  grad.addColorStop(0.18, 'rgba(15, 23, 42, 0.4)');
  grad.addColorStop(0.45, 'rgba(56, 189, 248, 0.25)');
  grad.addColorStop(0.82, 'rgba(15, 23, 42, 0.35)');
  grad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 64);

  // Sharp, thin icy filaments (Epsilon, Alpha, Beta ringlets)
  const ringlets = [
    { x: 220, w: 6, color: 'rgba(224, 242, 254, 0.85)' },
    { x: 310, w: 4, color: 'rgba(186, 230, 253, 0.75)' },
    { x: 420, w: 5, color: 'rgba(125, 211, 252, 0.7)' },
    { x: 560, w: 14, color: 'rgba(240, 249, 255, 0.95)' }, // Dense Epsilon ring
    { x: 740, w: 7, color: 'rgba(56, 189, 248, 0.65)' },
    { x: 880, w: 3, color: 'rgba(14, 165, 233, 0.5)' },
  ];

  for (const r of ringlets) {
    ctx.fillStyle = r.color;
    ctx.fillRect(r.x, 0, r.w, 64);
  }

  return finalizeTexture(key, canvas);
}

/**
 * Generates Exoplanet / Alien Gas Giant particulate ring texture
 * Rich multi-layered dusty bands with custom color tinting and voids
 */
export function getGasGiantRingsTexture(tintHex: string = '#c084fc'): THREE.CanvasTexture {
  const key = `gas_giant_rings_${tintHex}`;
  if (textureCache.has(key)) return textureCache.get(key)!;

  const { canvas, ctx } = createOffscreenCanvas(1024, 64);
  ctx.clearRect(0, 0, 1024, 64);

  const grad = ctx.createLinearGradient(0, 0, 1024, 0);
  grad.addColorStop(0.0, 'rgba(0, 0, 0, 0)');
  grad.addColorStop(0.15, 'rgba(30, 27, 75, 0.5)');
  grad.addColorStop(0.35, tintHex);
  grad.addColorStop(0.52, 'rgba(0, 0, 0, 0.1)'); // gap
  grad.addColorStop(0.65, tintHex);
  grad.addColorStop(0.85, 'rgba(30, 27, 75, 0.4)');
  grad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 64);

  // Micro-striations
  ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
  for (let i = 0; i < 60; i++) {
    const x = 150 + Math.random() * 700;
    ctx.fillRect(x, 0, 1 + Math.random() * 2, 64);
  }

  return finalizeTexture(key, canvas);
}

/**
 * Generates Circumstellar Debris Ring for Stars / Solar Systems
 * High-temperature incandescent plasma, glowing rocky boulders, turbulent hot gas,
 * and magnetic prominence filaments. Completely distinct from planetary rings!
 */
export function getStellarCircumstellarDebrisTexture(starColorHex: string = '#fbbf24'): THREE.CanvasTexture {
  const key = `stellar_debris_ring_${starColorHex}`;
  if (textureCache.has(key)) return textureCache.get(key)!;

  const { canvas, ctx } = createOffscreenCanvas(1024, 64);
  ctx.clearRect(0, 0, 1024, 64);

  // Turbulent radiant thermal plasma gradient
  const grad = ctx.createLinearGradient(0, 0, 1024, 0);
  grad.addColorStop(0.0, 'rgba(0, 0, 0, 0)');
  grad.addColorStop(0.08, 'rgba(254, 240, 138, 0.95)'); // Incandescent inner edge near star
  grad.addColorStop(0.22, starColorHex);
  grad.addColorStop(0.45, 'rgba(234, 88, 12, 0.85)'); // Molten lava glow
  grad.addColorStop(0.68, 'rgba(185, 28, 28, 0.65)'); // Cooling dark red silicate magma
  grad.addColorStop(0.88, 'rgba(68, 64, 60, 0.4)');  // Smoldering carbonaceous dust
  grad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 64);

  // Hot glowing incandescent chunks & thermal flares
  for (let i = 0; i < 500; i++) {
    const x = 80 + Math.random() * 850;
    const y = Math.random() * 64;
    const r = 0.8 + Math.random() * 3.5;
    const isHot = Math.random() > 0.4;

    ctx.fillStyle = isHot ? '#fef08a' : '#f97316';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Turbulent solar plasma swirls / filaments
  ctx.strokeStyle = 'rgba(254, 240, 138, 0.4)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 25; i++) {
    ctx.beginPath();
    let x = 100 + Math.random() * 700;
    let y = 10 + Math.random() * 44;
    ctx.moveTo(x, y);
    for (let s = 0; s < 5; s++) {
      x += (Math.random() - 0.2) * 40;
      y += (Math.random() - 0.5) * 12;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  return finalizeTexture(key, canvas);
}

/**
 * Generates bespoke Collisional Debris Ring texture (NOT Saturn's pristine icy rings!)
 * Features jagged rocky dust lanes, shattered asteroid boulder clumps, voids, glowing molten impact cracks,
 * and colors matched to the planetary crust.
 */
export function getCollisionalDebrisRingTexture(crustColorHex: string = '#78716c'): THREE.CanvasTexture {
  const key = `debris_ring_${crustColorHex}`;
  if (textureCache.has(key)) return textureCache.get(key)!;

  const { canvas, ctx } = createOffscreenCanvas(1024, 64);
  ctx.clearRect(0, 0, 1024, 64);

  // Gradient base for irregular chaotic dust density
  const grad = ctx.createLinearGradient(0, 0, 1024, 0);
  grad.addColorStop(0.0, 'rgba(0, 0, 0, 0)');
  grad.addColorStop(0.12, 'rgba(120, 113, 108, 0.5)');
  grad.addColorStop(0.28, 'rgba(249, 115, 22, 0.6)'); // Molten shock heated lane
  grad.addColorStop(0.38, 'rgba(214, 211, 209, 0.85)');
  grad.addColorStop(0.48, 'rgba(20, 18, 16, 0.1)'); // Ragged collision void
  grad.addColorStop(0.68, 'rgba(168, 162, 158, 0.7)');
  grad.addColorStop(0.88, 'rgba(87, 83, 78, 0.35)');
  grad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 64);

  // Hundreds of irregular rock & boulder clumps in the ring
  ctx.fillStyle = crustColorHex;
  for (let i = 0; i < 550; i++) {
    const x = 120 + Math.random() * 780;
    const y = Math.random() * 64;
    const r = 0.8 + Math.random() * 3.2;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Molten fiery boulder embers from recent impact
  ctx.fillStyle = '#f97316';
  for (let i = 0; i < 120; i++) {
    const x = 150 + Math.random() * 700;
    const y = Math.random() * 64;
    const r = 0.6 + Math.random() * 1.8;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Dark dusty voids / gaps from tidal resonances
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  for (let i = 0; i < 35; i++) {
    const x = 100 + Math.random() * 800;
    ctx.fillRect(x, 0, 5 + Math.random() * 18, 64);
  }

  return finalizeTexture(key, canvas);
}

/**
 * Generates Moon / cratered barren rock texture
 */
export function getMoonTexture(): THREE.CanvasTexture {
  const key = 'moon_texture';
  if (textureCache.has(key)) return textureCache.get(key)!;

  const { canvas, ctx } = createOffscreenCanvas(512, 256);

  // Grey regolith
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(0, 0, 512, 256);

  // Lunar Maria (dark basalt plains: Sea of Tranquility, etc.)
  ctx.fillStyle = '#475569';
  for (let i = 0; i < 18; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 256;
    const r = 20 + Math.random() * 45;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Impact craters
  for (let i = 0; i < 90; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 256;
    const r = 2 + Math.random() * 10;
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.arc(x, y, r * 0.7, 0, Math.PI * 2);
    ctx.fill();
  }

  return finalizeTexture(key, canvas);
}

/**
 * Generates Cryo-Ice Planet texture (Europa / Enceladus style)
 */
export function getIceTexture(): THREE.CanvasTexture {
  const key = 'ice_texture';
  if (textureCache.has(key)) return textureCache.get(key)!;

  const { canvas, ctx } = createOffscreenCanvas(512, 256);

  ctx.fillStyle = '#e0f2fe';
  ctx.fillRect(0, 0, 512, 256);

  // Linear tectonic fracture lineations
  ctx.strokeStyle = '#0284c7';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 35; i++) {
    ctx.beginPath();
    let x = Math.random() * 512;
    let y = Math.random() * 256;
    ctx.moveTo(x, y);
    for (let j = 0; j < 4; j++) {
      x += (Math.random() - 0.5) * 60;
      y += (Math.random() - 0.5) * 40;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  return finalizeTexture(key, canvas);
}

/**
 * Generates Black Hole Accretion Disk texture
 */
export function getAccretionDiskTexture(): THREE.CanvasTexture {
  const key = 'accretion_disk_texture';
  if (textureCache.has(key)) return textureCache.get(key)!;

  const { canvas, ctx } = createOffscreenCanvas(1024, 64);
  const grad = ctx.createLinearGradient(0, 0, 1024, 0);

  // Inner ISCO boundary (hottest, glowing violet/blue-white)
  grad.addColorStop(0.0, 'rgba(0, 0, 0, 0)');
  grad.addColorStop(0.08, 'rgba(192, 132, 252, 0.95)');
  grad.addColorStop(0.2, 'rgba(254, 240, 138, 1)');
  // Mid disk (fiery orange/amber)
  grad.addColorStop(0.45, 'rgba(249, 115, 22, 0.85)');
  grad.addColorStop(0.75, 'rgba(239, 68, 68, 0.5)');
  // Outer diffuse edge
  grad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 64);

  return finalizeTexture(key, canvas);
}

/**
 * Generates procedural normal/bump texture for rocky asteroids
 */
export function getAsteroidBumpTexture(): THREE.CanvasTexture {
  const key = 'asteroid_bump_texture';
  if (textureCache.has(key)) return textureCache.get(key)!;

  const { canvas, ctx } = createOffscreenCanvas(256, 256);
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 40; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const r = 5 + Math.random() * 20;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, '#303030');
    g.addColorStop(0.8, '#b0b0b0');
    g.addColorStop(1, '#808080');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  return finalizeTexture(key, canvas);
}

/**
 * Generates Molten Lava / Volcanic Texture (Io / Mustafar style)
 */
export function getLavaTexture(): THREE.CanvasTexture {
  const key = 'lava_texture';
  if (textureCache.has(key)) return textureCache.get(key)!;

  const { canvas, ctx } = createOffscreenCanvas(512, 256);
  // Dark basalt crust
  ctx.fillStyle = '#1c1917';
  ctx.fillRect(0, 0, 512, 256);

  // Glowing magma fissures & caldera vents
  ctx.strokeStyle = '#ea580c';
  ctx.lineWidth = 3;
  for (let i = 0; i < 40; i++) {
    ctx.beginPath();
    let x = Math.random() * 512;
    let y = Math.random() * 256;
    ctx.moveTo(x, y);
    for (let j = 0; j < 5; j++) {
      x += (Math.random() - 0.5) * 50;
      y += (Math.random() - 0.5) * 35;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // Hot yellow caldera cores
  ctx.fillStyle = '#fef08a';
  for (let i = 0; i < 25; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 256;
    ctx.beginPath();
    ctx.arc(x, y, 3 + Math.random() * 6, 0, Math.PI * 2);
    ctx.fill();
  }

  return finalizeTexture(key, canvas);
}

/**
 * Generates Pulsar / Magnetar rapid spin texture
 */
export function getPulsarTexture(): THREE.CanvasTexture {
  const key = 'pulsar_texture';
  if (textureCache.has(key)) return textureCache.get(key)!;

  const { canvas, ctx } = createOffscreenCanvas(512, 256);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 512, 256);

  // High-intensity magnetic bands
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#38bdf8');
  grad.addColorStop(0.2, '#c084fc');
  grad.addColorStop(0.5, '#e0e7ff');
  grad.addColorStop(0.8, '#c084fc');
  grad.addColorStop(1, '#38bdf8');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 256);

  return finalizeTexture(key, canvas);
}

/**
 * Generates Neptune / Ice Giant Azure texture
 */
export function getNeptuneTexture(): THREE.CanvasTexture {
  const key = 'neptune_texture';
  if (textureCache.has(key)) return textureCache.get(key)!;

  const { canvas, ctx } = createOffscreenCanvas(512, 256);
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#0369a1');
  grad.addColorStop(0.3, '#0284c7');
  grad.addColorStop(0.5, '#38bdf8');
  grad.addColorStop(0.7, '#0284c7');
  grad.addColorStop(1, '#0c4a6e');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 256);

  // White methane cirrus storms
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  for (let i = 0; i < 20; i++) {
    const x = Math.random() * 512;
    const y = 50 + Math.random() * 156;
    ctx.beginPath();
    ctx.ellipse(x, y, 30 + Math.random() * 40, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  return finalizeTexture(key, canvas);
}

/**
 * Generates Precious Gold / Platinum asteroid texture
 */
export function getGoldTexture(): THREE.CanvasTexture {
  const key = 'gold_texture';
  if (textureCache.has(key)) return textureCache.get(key)!;

  const { canvas, ctx } = createOffscreenCanvas(256, 256);
  ctx.fillStyle = '#ca8a04';
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 30; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const r = 4 + Math.random() * 12;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, '#fef08a');
    g.addColorStop(0.8, '#a16207');
    g.addColorStop(1, '#713f12');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  return finalizeTexture(key, canvas);
}

/**
 * Generates Space Station solar array / hull plating texture
 */
export function getStationTexture(): THREE.CanvasTexture {
  const key = 'station_texture';
  if (textureCache.has(key)) return textureCache.get(key)!;

  const { canvas, ctx } = createOffscreenCanvas(256, 256);
  ctx.fillStyle = '#334155';
  ctx.fillRect(0, 0, 256, 256);

  // Metallic solar grid lines
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 1;
  for (let x = 0; x < 256; x += 16) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 256);
    ctx.stroke();
  }
  for (let y = 0; y < 256; y += 16) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(256, y);
    ctx.stroke();
  }

  return finalizeTexture(key, canvas);
}

