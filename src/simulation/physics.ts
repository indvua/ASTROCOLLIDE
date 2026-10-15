import {
  AsteroidComposition,
  AsteroidSpec,
  BindingEnergyData,
  CelestialBody,
  ChallengeMission,
  ImpactEvent,
  SystemPreset,
  TrajectoryPrediction,
  TrajectoryPoint,
} from '../types';

export const G_CONSTANT = 1.0;
export const SOFTENING_EPSILON = 0.8;

export const ASTEROID_SPECS: Record<AsteroidComposition, AsteroidSpec> = {
  silicate: {
    id: 'silicate',
    name: 'Silicate Chondrite',
    composition: 'silicate',
    mass: 0.0015,
    radius: 1.1,
    density: 2.7,
    color: '#a89f91',
    trailColor: '#7dd3fc',
    description: 'Standard stony carbonaceous asteroid. Balanced density, common in the Main Asteroid Belt.',
  },
  iron: {
    id: 'iron',
    name: 'M-Type Metallic (16 Psyche)',
    composition: 'iron',
    mass: 0.006,
    radius: 1.0,
    density: 7.9,
    color: '#94a3b8',
    trailColor: '#f59e0b',
    description: 'High-density metallic core of a shattered protoplanet. High momentum and kinetic energy transfer.',
  },
  ice_comet: {
    id: 'ice_comet',
    name: 'Volatile Ice Comet (Halley Class)',
    composition: 'ice_comet',
    mass: 0.0008,
    radius: 1.3,
    density: 0.9,
    color: '#e0f2fe',
    trailColor: '#38bdf8',
    description: 'Porous water-ice & CO2 comet from the Oort Cloud. Prone to tidal fragmentation inside the Roche limit.',
  },
  tungsten: {
    id: 'tungsten',
    name: 'Tungsten Planet-Buster',
    composition: 'tungsten',
    mass: 0.025,
    radius: 1.2,
    density: 19.3,
    color: '#f97316',
    trailColor: '#ef4444',
    description: 'Super-dense hyper-velocity impactor. Imparts measurable gravitational and kinetic perturbation to planets.',
  },
  singularity: {
    id: 'singularity',
    name: 'Primordial Micro-Singularity',
    composition: 'singularity',
    mass: 0.15,
    radius: 0.8,
    density: 1e12,
    color: '#c084fc',
    trailColor: '#a855f7',
    description: 'Hypothetical Big Bang remnant micro-black hole. Heavy gravitational distortion on nearby planetary orbits.',
  },
  gold_platinum: {
    id: 'gold_platinum',
    name: 'Precious Ore Core (Gold/Platinum)',
    composition: 'gold_platinum',
    mass: 0.012,
    radius: 1.1,
    density: 19.3,
    color: '#fbbf24',
    trailColor: '#fef08a',
    description: 'Rare-earth metal-rich protoplanet core worth quadrillions. Ultra-dense kinetic impact energy.',
  },
  dark_matter: {
    id: 'dark_matter',
    name: 'Dark Matter Gravitational Clump',
    composition: 'dark_matter',
    mass: 0.45,
    radius: 0.6,
    density: 1e8,
    color: '#475569',
    trailColor: '#64748b',
    description: 'Invisible halo concentration. Low visual profile but exerts massive gravitational pulling force on all passing planets!',
  },
  antimatter: {
    id: 'antimatter',
    name: 'Antimatter Annihilation Impactor',
    composition: 'antimatter',
    mass: 0.005,
    radius: 0.9,
    density: 5.0,
    color: '#ec4899',
    trailColor: '#f43f5e',
    description: 'Magnetic trap payload containing anti-protons. Triggers 100% mass-energy annihilation (E=mc²) upon contact.',
  },
  colony_ship: {
    id: 'colony_ship',
    name: 'Interstellar Generation Ark',
    composition: 'colony_ship',
    mass: 0.0003,
    radius: 1.3,
    density: 0.8,
    color: '#38bdf8',
    trailColor: '#06b6d4',
    description: 'Human sleeper colony ship navigating extreme gravitational slingshots. Keep safe from high-G stress and collisions!',
  },
  swarm_cluster: {
    id: 'swarm_cluster',
    name: 'Tidally Shattered Debris Swarm',
    composition: 'swarm_cluster',
    mass: 0.008,
    radius: 1.5,
    density: 2.2,
    color: '#a3e635',
    trailColor: '#84cc16',
    description: 'Porous rubble pile asteroid that disperses into an orbital cluster shotgun upon launch.',
  },
};

/**
 * Computes gravitational acceleration on a target position from all celestial bodies.
 */
export function computeAcceleration(
  pos: { x: number; y: number; z: number },
  bodies: CelestialBody[],
  ignoredBodyId?: string
): { ax: number; ay: number; az: number } {
  let ax = 0;
  let ay = 0;
  let az = 0;

  for (let i = 0; i < bodies.length; i++) {
    const b = bodies[i];
    if (b.id === ignoredBodyId) continue;

    const dx = b.position.x - pos.x;
    const dy = b.position.y - pos.y;
    const dz = b.position.z - pos.z;
    const distSq = dx * dx + dy * dy + dz * dz + SOFTENING_EPSILON;
    const dist = Math.sqrt(distSq);

    const f = (G_CONSTANT * b.mass) / (distSq * dist);
    ax += dx * f;
    ay += dy * f;
    az += dz * f;
  }

  return { ax, ay, az };
}

/**
 * Runge-Kutta 4th Order integrator step for N-body celestial dynamics.
 * Guarantees orbital conservation and minimal drift.
 */
export function stepNBodySystem(bodies: CelestialBody[], dt: number): void {
  const n = bodies.length;
  // Temporary state holders for RK4
  const k1v: { x: number; y: number; z: number }[] = [];
  const k1x: { x: number; y: number; z: number }[] = [];

  for (let i = 0; i < n; i++) {
    const acc = computeAcceleration(bodies[i].position, bodies, bodies[i].id);
    k1v.push({ x: acc.ax * dt, y: acc.ay * dt, z: acc.az * dt });
    k1x.push({ x: bodies[i].velocity.x * dt, y: bodies[i].velocity.y * dt, z: bodies[i].velocity.z * dt });
  }

  const k2v: { x: number; y: number; z: number }[] = [];
  const k2x: { x: number; y: number; z: number }[] = [];
  for (let i = 0; i < n; i++) {
    const tempPos = {
      x: bodies[i].position.x + k1x[i].x * 0.5,
      y: bodies[i].position.y + k1x[i].y * 0.5,
      z: bodies[i].position.z + k1x[i].z * 0.5,
    };
    const acc = computeAcceleration(tempPos, bodies, bodies[i].id);
    k2v.push({ x: acc.ax * dt, y: acc.ay * dt, z: acc.az * dt });
    k2x.push({
      x: (bodies[i].velocity.x + k1v[i].x * 0.5) * dt,
      y: (bodies[i].velocity.y + k1v[i].y * 0.5) * dt,
      z: (bodies[i].velocity.z + k1v[i].z * 0.5) * dt,
    });
  }

  const k3v: { x: number; y: number; z: number }[] = [];
  const k3x: { x: number; y: number; z: number }[] = [];
  for (let i = 0; i < n; i++) {
    const tempPos = {
      x: bodies[i].position.x + k2x[i].x * 0.5,
      y: bodies[i].position.y + k2x[i].y * 0.5,
      z: bodies[i].position.z + k2x[i].z * 0.5,
    };
    const acc = computeAcceleration(tempPos, bodies, bodies[i].id);
    k3v.push({ x: acc.ax * dt, y: acc.ay * dt, z: acc.az * dt });
    k3x.push({
      x: (bodies[i].velocity.x + k2v[i].x * 0.5) * dt,
      y: (bodies[i].velocity.y + k2v[i].y * 0.5) * dt,
      z: (bodies[i].velocity.z + k2v[i].z * 0.5) * dt,
    });
  }

  const k4v: { x: number; y: number; z: number }[] = [];
  const k4x: { x: number; y: number; z: number }[] = [];
  for (let i = 0; i < n; i++) {
    const tempPos = {
      x: bodies[i].position.x + k3x[i].x,
      y: bodies[i].position.y + k3x[i].y,
      z: bodies[i].position.z + k3x[i].z,
    };
    const acc = computeAcceleration(tempPos, bodies, bodies[i].id);
    k4v.push({ x: acc.ax * dt, y: acc.ay * dt, z: acc.az * dt });
    k4x.push({
      x: (bodies[i].velocity.x + k3v[i].x) * dt,
      y: (bodies[i].velocity.y + k3v[i].y) * dt,
      z: (bodies[i].velocity.z + k3v[i].z) * dt,
    });
  }

  // Update positions and velocities
  for (let i = 0; i < n; i++) {
    bodies[i].position.x += (k1x[i].x + 2 * k2x[i].x + 2 * k3x[i].x + k4x[i].x) / 6;
    bodies[i].position.y += (k1x[i].y + 2 * k2x[i].y + 2 * k3x[i].y + k4x[i].y) / 6;
    bodies[i].position.z += (k1x[i].z + 2 * k2x[i].z + 2 * k3x[i].z + k4x[i].z) / 6;

    bodies[i].velocity.x += (k1v[i].x + 2 * k2v[i].x + 2 * k3v[i].x + k4v[i].x) / 6;
    bodies[i].velocity.y += (k1v[i].y + 2 * k2v[i].y + 2 * k3v[i].y + k4v[i].y) / 6;
    bodies[i].velocity.z += (k1v[i].z + 2 * k2v[i].z + 2 * k3v[i].z + k4v[i].z) / 6;
  }
}

/**
 * Step a single asteroid in the gravitational field of all bodies.
 */
export function stepAsteroid(
  pos: { x: number; y: number; z: number },
  vel: { x: number; y: number; z: number },
  bodies: CelestialBody[],
  dt: number
): void {
  // RK4 single body step
  const a1 = computeAcceleration(pos, bodies);
  const k1v = { x: a1.ax * dt, y: a1.ay * dt, z: a1.az * dt };
  const k1x = { x: vel.x * dt, y: vel.y * dt, z: vel.z * dt };

  const p2 = { x: pos.x + k1x.x * 0.5, y: pos.y + k1x.y * 0.5, z: pos.z + k1x.z * 0.5 };
  const a2 = computeAcceleration(p2, bodies);
  const k2v = { x: a2.ax * dt, y: a2.ay * dt, z: a2.az * dt };
  const k2x = { x: (vel.x + k1v.x * 0.5) * dt, y: (vel.y + k1v.y * 0.5) * dt, z: (vel.z + k1v.z * 0.5) * dt };

  const p3 = { x: pos.x + k2x.x * 0.5, y: pos.y + k2x.y * 0.5, z: pos.z + k2x.z * 0.5 };
  const a3 = computeAcceleration(p3, bodies);
  const k3v = { x: a3.ax * dt, y: a3.ay * dt, z: a3.az * dt };
  const k3x = { x: (vel.x + k2v.x * 0.5) * dt, y: (vel.y + k2v.y * 0.5) * dt, z: (vel.z + k2v.z * 0.5) * dt };

  const p4 = { x: pos.x + k3x.x, y: pos.y + k3x.y, z: pos.z + k3x.z };
  const a4 = computeAcceleration(p4, bodies);
  const k4v = { x: a4.ax * dt, y: a4.ay * dt, z: a4.az * dt };
  const k4x = { x: (vel.x + k3v.x) * dt, y: (vel.y + k3v.y) * dt, z: (vel.z + k3v.z) * dt };

  pos.x += (k1x.x + 2 * k2x.x + 2 * k3x.x + k4x.x) / 6;
  pos.y += (k1x.y + 2 * k2x.y + 2 * k3x.y + k4x.y) / 6;
  pos.z += (k1x.z + 2 * k2x.z + 2 * k3x.z + k4x.z) / 6;

  vel.x += (k1v.x + 2 * k2v.x + 2 * k3v.x + k4v.x) / 6;
  vel.y += (k1v.y + 2 * k2v.y + 2 * k3v.y + k4v.y) / 6;
  vel.z += (k1v.z + 2 * k2v.z + 2 * k3v.z + k4v.z) / 6;
}

/**
 * Astronomical and Physical Constants
 */
export const G_REAL = 6.6743e-11; // m^3 kg^-1 s^-2
export const EARTH_MASS_KG = 5.9722e24;
export const EARTH_RADIUS_M = 6.371e6;
export const JOULES_PER_MEGATON_TNT = 4.184e15;

/**
 * Benchmark Astronomical Gravitational Binding Energies
 * Calculated using U_g = (3/5) * G * M^2 / R (with real planetary core differentiation)
 */
export const ASTRONOMICAL_BINDING_ENERGY_DB: Record<
  string,
  { joules: number; megatons: number; category: BindingEnergyData['category']; formula: string }
> = {
  // 1. Stars & Compact Relativistic Objects
  sun: {
    joules: 2.277e41,
    megatons: 5.442e25,
    category: 'stellar',
    formula: 'U = (3/5) * G * M_sol² / R_sol (54.42 Million Yottatons TNT)',
  },
  sol: {
    joules: 2.277e41,
    megatons: 5.442e25,
    category: 'stellar',
    formula: 'U = (3/5) * G * M_sol² / R_sol (54.42 Million Yottatons TNT)',
  },
  pulsar: {
    joules: 2.58e46,
    megatons: 6.17e30,
    category: 'stellar',
    formula: 'Relativistic Compact Neutron Matter: U ~ 0.1 M c² (~6.17 Nonillion MT TNT)',
  },
  black_hole: {
    joules: 1.0e47,
    megatons: 2.39e31,
    category: 'supermassive',
    formula: 'Singularity Event Horizon: U > 10^47 J (Relativistic Gravitational Well)',
  },

  // 2. Gas Giants & Ice Giants
  jupiter: {
    joules: 2.065e36,
    megatons: 4.935e20,
    category: 'gas_giant',
    formula: 'U = (3/5) * G * M_jup² / R_jup (493,500 Zettatons TNT)',
  },
  saturn: {
    joules: 2.22e35,
    megatons: 5.31e19,
    category: 'gas_giant',
    formula: 'U = (3/5) * G * M_sat² / R_sat (53,100 Zettatons TNT)',
  },
  uranus: {
    joules: 1.19e34,
    megatons: 2.84e18,
    category: 'gas_giant',
    formula: 'U = (3/5) * G * M_ura² / R_ura (2,840 Zettatons TNT)',
  },
  neptune: {
    joules: 1.708e34,
    megatons: 4.08e18,
    category: 'gas_giant',
    formula: 'U = (3/5) * G * M_nep² / R_nep (4,080 Zettatons TNT)',
  },

  // 3. Terrestrial Planets
  earth: {
    joules: 2.242e32,
    megatons: 5.358e16,
    category: 'terrestrial',
    formula: 'U = (3/5) * G * M_earth² / R_earth (53.58 Exatons TNT)',
  },
  venus: {
    joules: 1.567e32,
    megatons: 3.745e16,
    category: 'terrestrial',
    formula: 'U = (3/5) * G * M_ven² / R_ven (37.45 Exatons TNT)',
  },
  mars: {
    joules: 4.866e30,
    megatons: 1.163e15,
    category: 'terrestrial',
    formula: 'U = (3/5) * G * M_mars² / R_mars (1.163 Exatons TNT)',
  },
  mercury: {
    joules: 1.794e30,
    megatons: 4.288e14,
    category: 'terrestrial',
    formula: 'U = (3/5) * G * M_merc² / R_merc (428.8 Petatons TNT)',
  },

  // 4. Major Planetary Moons
  moon: {
    joules: 1.244e29,
    megatons: 2.973e13,
    category: 'major_moon',
    formula: 'U = (3/5) * G * M_luna² / R_luna (29.73 Petatons TNT)',
  },
  luna: {
    joules: 1.244e29,
    megatons: 2.973e13,
    category: 'major_moon',
    formula: 'U = (3/5) * G * M_luna² / R_luna (29.73 Petatons TNT)',
  },
  titan: {
    joules: 2.82e29,
    megatons: 6.74e13,
    category: 'major_moon',
    formula: 'U = (3/5) * G * M_titan² / R_titan (67.4 Petatons TNT)',
  },
  ganymede: {
    joules: 3.34e29,
    megatons: 7.98e13,
    category: 'major_moon',
    formula: 'U = (3/5) * G * M_gan² / R_gan (79.8 Petatons TNT)',
  },
  callisto: {
    joules: 1.92e29,
    megatons: 4.59e13,
    category: 'major_moon',
    formula: 'U = (3/5) * G * M_cal² / R_cal (45.9 Petatons TNT)',
  },
  io: {
    joules: 1.75e29,
    megatons: 4.18e13,
    category: 'major_moon',
    formula: 'U = (3/5) * G * M_io² / R_io (41.8 Petatons TNT)',
  },
  europa: {
    joules: 5.91e28,
    megatons: 1.41e13,
    category: 'major_moon',
    formula: 'U = (3/5) * G * M_eur² / R_eur (14.1 Petatons TNT)',
  },
  triton: {
    joules: 1.35e28,
    megatons: 3.23e12,
    category: 'major_moon',
    formula: 'U = (3/5) * G * M_tri² / R_tri (3,230 Teratons TNT)',
  },
  titania: {
    joules: 3.40e27,
    megatons: 8.13e11,
    category: 'major_moon',
    formula: 'U = (3/5) * G * M_tit² / R_tit (813 Teratons TNT)',
  },
  oberon: {
    joules: 2.90e27,
    megatons: 6.93e11,
    category: 'major_moon',
    formula: 'U = (3/5) * G * M_obe² / R_obe (693 Teratons TNT)',
  },
  charon: {
    joules: 1.66e26,
    megatons: 3.97e10,
    category: 'major_moon',
    formula: 'U = (3/5) * G * M_char² / R_char (39.7 Gigatons TNT)',
  },

  // 5. Dwarf Planets & Large Asteroids
  pluto: {
    joules: 5.72e27,
    megatons: 1.37e12,
    category: 'dwarf_planet',
    formula: 'U = (3/5) * G * M_pluto² / R_pluto (1,370 Teratons TNT)',
  },
  ceres: {
    joules: 7.51e25,
    megatons: 1.795e10,
    category: 'dwarf_planet',
    formula: 'U = (3/5) * G * M_ceres² / R_ceres (17.95 Gigatons TNT)',
  },
  vesta: {
    joules: 1.02e25,
    megatons: 2.438e9,
    category: 'asteroid',
    formula: 'U = (3/5) * G * M_vesta² / R_vesta (2.44 Gigatons TNT)',
  },

  // 6. Minor Moons & Rubble Piles
  phobos: {
    joules: 4.05e17,
    megatons: 96.8,
    category: 'minor_moon',
    formula: 'U = (3/5) * G * M_phobos² / R_phobos (96.8 Megatons TNT)',
  },
  deimos: {
    joules: 8.44e15,
    megatons: 2.02,
    category: 'minor_moon',
    formula: 'U = (3/5) * G * M_deimos² / R_deimos (2.02 Megatons TNT)',
  },
  enceladus: {
    joules: 2.60e23,
    megatons: 6.21e7,
    category: 'minor_moon',
    formula: 'U = (3/5) * G * M_enc² / R_enc (62.1 Megatons * 10^6)',
  },
  mimas: {
    joules: 6.30e22,
    megatons: 1.51e7,
    category: 'minor_moon',
    formula: 'U = (3/5) * G * M_mim² / R_mim (15.1 Megatons * 10^6)',
  },
  station: {
    joules: 1.0e9,
    megatons: 2.39e-7,
    category: 'structure',
    formula: 'Structural Tensile Binding: ~240 kg TNT equivalent',
  },
};

/**
 * Format Binding Energy in human-readable astrophysical units
 */
export function formatBindingEnergy(megatons: number): string {
  if (megatons <= 0) return '0.0 MT';
  if (megatons < 0.001) return `${(megatons * 1000).toFixed(1)} Kilotons TNT`;
  if (megatons < 1000) return `${megatons.toFixed(1)} MT TNT`;
  if (megatons < 1e6) return `${(megatons / 1000).toFixed(2)} GT TNT`;
  if (megatons < 1e9) return `${(megatons / 1e6).toFixed(2)} Teratons TNT`;
  if (megatons < 1e12) return `${(megatons / 1e9).toFixed(2)} Petatons TNT`;
  if (megatons < 1e15) return `${(megatons / 1e12).toFixed(2)} Exatons TNT`;
  if (megatons < 1e18) return `${(megatons / 1e15).toFixed(2)} Zettatons TNT`;
  return `${(megatons / 1e18).toExponential(2)} Yottatons TNT`;
}

/**
 * Formats energy in scientific notation with Joules
 */
export function formatJoulesScientific(joules: number): string {
  return `${joules.toExponential(2)} J`;
}

/**
 * Calculates genuine Gravitational Binding Energy for any celestial body
 * Uses astronomical reference catalog for known bodies, and the exact physical formula:
 * U_g = (3/5) * G * M^2 / R for custom/procedural bodies.
 */
export function getGravitationalBindingEnergy(body: CelestialBody): BindingEnergyData {
  const normId = (body.id || '').toLowerCase();
  const normName = (body.name || '').toLowerCase();

  // 1. Check known astronomical body database
  for (const [key, data] of Object.entries(ASTRONOMICAL_BINDING_ENERGY_DB)) {
    if (normId === key || normId.startsWith(`${key}_`) || normName.includes(key)) {
      return {
        joules: data.joules,
        megatons: data.megatons,
        displayMegatons: formatBindingEnergy(data.megatons),
        displayJoules: formatJoulesScientific(data.joules),
        category: data.category,
        formula: data.formula,
      };
    }
  }

  // 2. Procedural calculation for minor asteroid belt rubble chunks
  if (body.isBeltAsteroid || body.type === 'asteroid') {
    const massKg = Math.max(1e12, (body.mass || 0.0001) * 1e20);
    const radiusM = Math.max(500, (body.radius || 1.0) * 3000);
    const joules = (0.6 * G_REAL * massKg * massKg) / radiusM;
    const megatons = joules / JOULES_PER_MEGATON_TNT;
    return {
      joules,
      megatons,
      displayMegatons: formatBindingEnergy(megatons),
      displayJoules: formatJoulesScientific(joules),
      category: 'asteroid',
      formula: `U = (3/5) * G * M² / R (${formatBindingEnergy(megatons)})`,
    };
  }

  // 3. Space station structural binding
  if (body.type === 'station') {
    const joules = 1.0e9;
    const megatons = joules / JOULES_PER_MEGATON_TNT;
    return {
      joules,
      megatons,
      displayMegatons: formatBindingEnergy(megatons),
      displayJoules: formatJoulesScientific(joules),
      category: 'structure',
      formula: 'Structural Tensile Binding: ~240 kg TNT',
    };
  }

  // 4. Custom or procedural celestial body (Planets, Moons, Stars)
  let massKg = body.mass * EARTH_MASS_KG;
  let radiusM = (body.radius / 4.0) * EARTH_RADIUS_M;

  if (body.type === 'star') {
    massKg = Math.max(1.989e30 * 0.1, body.mass * (1.989e30 / 32000));
    radiusM = Math.max(1e8, (body.radius / 20) * 6.9634e8);
  }

  const joules = (0.6 * G_REAL * massKg * massKg) / Math.max(1000, radiusM);
  const megatons = joules / JOULES_PER_MEGATON_TNT;

  let category: BindingEnergyData['category'] = 'terrestrial';
  if (body.type === 'star' || body.type === 'pulsar') category = 'stellar';
  else if (body.type === 'black_hole') category = 'supermassive';
  else if (body.type === 'moon') category = 'major_moon';
  else if (body.mass > 10) category = 'gas_giant';
  else if (body.mass < 0.05) category = 'dwarf_planet';

  return {
    joules,
    megatons,
    displayMegatons: formatBindingEnergy(megatons),
    displayJoules: formatJoulesScientific(joules),
    category,
    formula: `U = (3/5) * G * M² / R (${formatBindingEnergy(megatons)})`,
  };
}

/**
 * Calculates genuine kinetic and exotic payload energy yield
 */
export function computeImpactorEnergy(
  asteroidSpec: AsteroidSpec,
  velocityMagnitude: number
): { joules: number; megatons: number } {
  const realSpeedMps = velocityMagnitude * 3000;
  const baseMassKg = asteroidSpec.mass * 1e14;
  let joules = 0.5 * baseMassKg * realSpeedMps * realSpeedMps;

  // Exotic weapons payload energy augmentation
  if (asteroidSpec.composition === 'tungsten') {
    // Relativistic planetary penetrator yield (358 Exatons TNT)
    joules = Math.max(joules, 1.5e33);
  } else if (asteroidSpec.composition === 'antimatter') {
    // 100% Mass-Energy Annihilation E = 2mc² (478 Exatons TNT)
    joules = Math.max(joules, 2.0e33);
  } else if (asteroidSpec.composition === 'singularity') {
    // Primordial Micro-Singularity tidal disruption yield (1.19 Million Zettatons TNT)
    joules = Math.max(joules, 5.0e36);
  } else if (asteroidSpec.composition === 'dark_matter') {
    // Dark Matter Gravitational Compression Shock (19.1 Zettatons TNT)
    joules = Math.max(joules, 8.0e34);
  }

  const megatons = joules / JOULES_PER_MEGATON_TNT;
  return { joules, megatons };
}

/**
 * Predicts the full trajectory of an asteroid for up to maxSteps forward.
 * Shows slingshot curves, closest approach, and impact points in real time!
 */
export function predictAsteroidTrajectory(
  startPos: { x: number; y: number; z: number },
  startVel: { x: number; y: number; z: number },
  asteroidSpec: AsteroidSpec,
  bodies: CelestialBody[],
  maxSteps: number = 800,
  dt: number = 0.08
): TrajectoryPrediction {
  const points: TrajectoryPoint[] = [];
  const pos = { ...startPos };
  const vel = { ...startVel };

  let willCollide = false;
  let targetBodyId: string | undefined;
  let targetBodyName: string | undefined;
  let impactVelocity: number | undefined;
  let impactEnergyJoules: number | undefined;
  let impactEnergyMegatons: number | undefined;
  let targetBindingEnergyMT: number | undefined;
  let isTargetDisrupted: boolean | undefined;

  let minDistance = Infinity;
  let closestBodyName = '';
  let speedAtClosest = 0;
  let maxSpeed = Math.hypot(vel.x, vel.y, vel.z);

  // We sample every 2 steps to keep buffer efficient
  for (let s = 0; s < maxSteps; s++) {
    const curSpeed = Math.hypot(vel.x, vel.y, vel.z);
    if (curSpeed > maxSpeed) {
      maxSpeed = curSpeed;
    }

    if (s % 2 === 0) {
      points.push({
        x: pos.x,
        y: pos.y,
        z: pos.z,
        velocity: curSpeed,
        time: s * dt,
      });
    }

    // Check collision or close approach with bodies
    for (let b = 0; b < bodies.length; b++) {
      const body = bodies[b];
      const dx = pos.x - body.position.x;
      const dy = pos.y - body.position.y;
      const dz = pos.z - body.position.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dist < minDistance) {
        minDistance = dist;
        closestBodyName = body.name;
        speedAtClosest = curSpeed;
      }

      if (dist <= body.radius + asteroidSpec.radius * 0.5) {
        willCollide = true;
        targetBodyId = body.id;
        targetBodyName = body.name;
        impactVelocity = curSpeed;

        const { joules, megatons } = computeImpactorEnergy(asteroidSpec, curSpeed);
        impactEnergyJoules = joules;
        impactEnergyMegatons = megatons;

        const binding = getGravitationalBindingEnergy(body);
        targetBindingEnergyMT = binding.megatons;
        isTargetDisrupted = megatons >= binding.megatons;

        // Final point at impact
        points.push({
          x: pos.x,
          y: pos.y,
          z: pos.z,
          velocity: curSpeed,
          time: s * dt,
        });
        break;
      }
    }

    if (willCollide) break;

    // Check if escaping system boundary
    const distFromOrigin = Math.hypot(pos.x, pos.y, pos.z);
    if (distFromOrigin > 1200) {
      break;
    }

    // Step physics forward
    stepAsteroid(pos, vel, bodies, dt);
  }

  // Check escape energy relative to main central body (usually index 0 or largest mass)
  const primaryBody = bodies.reduce((max, b) => (b.mass > max.mass ? b : max), bodies[0]);
  let willEscape = false;
  if (primaryBody) {
    const distToPrimary = Math.hypot(pos.x - primaryBody.position.x, pos.y - primaryBody.position.y, pos.z - primaryBody.position.z);
    const endSpeed = Math.hypot(vel.x, vel.y, vel.z);
    const escapeSpeed = Math.sqrt((2 * G_CONSTANT * primaryBody.mass) / Math.max(10, distToPrimary));
    willEscape = endSpeed > escapeSpeed;
  }

  return {
    points,
    willCollide,
    targetBodyId,
    targetBodyName,
    impactVelocity,
    impactEnergyJoules,
    impactEnergyMegatons,
    targetBindingEnergyMT,
    isTargetDisrupted,
    willEscape,
    maxVelocityAchieved: maxSpeed,
    closestApproach: minDistance < Infinity ? {
      bodyName: closestBodyName,
      distance: minDistance,
      speedAtApproach: speedAtClosest,
    } : null,
  };
}

/**
 * Calculates Roche tidal disruption distance for an asteroid approaching a primary body.
 */
export function getRocheLimit(primaryBody: CelestialBody, asteroidSpec: AsteroidSpec): number {
  const primaryDensity = primaryBody.mass / (primaryBody.radius * primaryBody.radius * primaryBody.radius);
  const densityRatio = Math.max(0.1, primaryDensity / (asteroidSpec.density * 0.1));
  return primaryBody.radius * 2.1 * Math.cbrt(densityRatio);
}

/**
 * Calculates impact crater size and consequences with genuine binding energy comparison.
 */
export function computeImpactDetails(
  asteroidSpec: AsteroidSpec,
  targetBody: CelestialBody,
  impactSpeed: number,
  time: number
): ImpactEvent {
  const { joules: energyJoules, megatons: energyMegatons } = computeImpactorEnergy(asteroidSpec, impactSpeed);
  const bindingData = getGravitationalBindingEnergy(targetBody);
  const ratio = energyMegatons / bindingData.megatons;
  const isDestroyed = ratio >= 1.0;

  // Crater diameter scaling: D ~ 1.16 * (rho_a/rho_t)^0.33 * L^0.78 * v^0.44 * g^-0.22
  const diameterKm = Math.max(0.2, Math.pow(energyMegatons, 0.28) * 1.8);

  // Linear momentum transfer to planet: Delta-V
  const planetRealMass = targetBody.mass * 1e24;
  const realMassKg = asteroidSpec.mass * 1e14;
  const realSpeedMps = impactSpeed * 3000;
  const deltaVMps = (realMassKg / (planetRealMass + realMassKg)) * realSpeedMps;

  return {
    id: `impact-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    time,
    asteroidName: asteroidSpec.name,
    targetBodyName: targetBody.name,
    position: { ...targetBody.position },
    velocityMagnitude: impactSpeed,
    energyJoules,
    energyMegatons,
    targetBindingEnergyMT: bindingData.megatons,
    targetBindingEnergyJoules: bindingData.joules,
    energyToBindingRatio: ratio,
    bodyDestroyed: isDestroyed,
    destroyedBodyName: isDestroyed ? targetBody.name : undefined,
    craterDiameterKm: diameterKm,
    planetDeflectionDeltaV: deltaVMps,
  };
}

/**
 * Procedural generator for asteroid belts and planetary rings
 */
export function generateAsteroidBelt(
  center: { x: number; y: number; z: number },
  count: number,
  innerR: number,
  outerR: number,
  primaryMass: number,
  baseId: string = 'belt'
): CelestialBody[] {
  const asteroids: CelestialBody[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * (Math.PI / count);
    const r = innerR + Math.random() * (outerR - innerR);
    const speed = Math.sqrt((G_CONSTANT * primaryMass) / r);

    // Tangent velocity vector for circular Keplerian orbit
    const vx = -Math.sin(angle) * speed;
    const vz = Math.cos(angle) * speed;
    const yOffset = (Math.random() - 0.5) * (r * 0.035);
    const vy = (Math.random() - 0.5) * 0.3;

    asteroids.push({
      id: `${baseId}_${i}`,
      name: `Asteroid Belt Object #${101 + i}`,
      type: 'asteroid',
      mass: 0.00004 + Math.random() * 0.0001,
      radius: 0.6 + Math.random() * 0.7,
      position: {
        x: center.x + Math.cos(angle) * r,
        y: center.y + yOffset,
        z: center.z + Math.sin(angle) * r,
      },
      velocity: {
        x: vx,
        y: vy,
        z: vz,
      },
      color: Math.random() > 0.4 ? '#a8a29e' : '#78716c',
      textureType: 'rock',
      isBeltAsteroid: true,
    });
  }
  return asteroids;
}

/**
 * Built-in Solar System Presets
 */
export const SYSTEM_PRESETS: SystemPreset[] = [
  {
    id: 'grand_tour',
    name: 'Complete Solar System (Grand Tour)',
    tagline: 'Sun, 8 Planets, 8 Moons, Pluto & 60-Asteroid Belt',
    description: 'The complete planetary armada! Sol, Mercury, Venus, Earth & Moon, Mars & Phobos, Main Asteroid Belt (60+ orbiting minor asteroids, Ceres, Vesta), Jupiter with 4 Galilean moons, Saturn with rings & Titan, Uranus with rings, Neptune with Triton, and Pluto.',
    recommendedScale: 0.45,
    defaultAsteroidPosition: { x: -320, y: 0, z: -180 },
    defaultAsteroidVelocity: { x: 7.8, y: 0, z: 4.2 },
    bodies: [
      // 1. Sun
      {
        id: 'sun',
        name: 'Sol (Sun)',
        type: 'star',
        mass: 32000,
        radius: 20,
        position: { x: 0, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        color: '#fbbf24',
        emissive: true,
        textureType: 'sun',
      },
      // 2. Mercury
      {
        id: 'mercury',
        name: 'Mercury',
        type: 'planet',
        mass: 0.15,
        radius: 2.2,
        position: { x: 45, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 26.6 },
        color: '#9ca3af',
        textureType: 'rock',
      },
      // 3. Venus
      {
        id: 'venus',
        name: 'Venus',
        type: 'planet',
        mass: 0.85,
        radius: 3.6,
        position: { x: 0, y: 0, z: -78 },
        velocity: { x: 20.2, y: 0, z: 0 },
        color: '#f59e0b',
        textureType: 'mars',
        hasAtmosphere: true,
        atmosphereColor: '#fbbf24',
      },
      // 4. Earth & Moon
      {
        id: 'earth',
        name: 'Earth',
        type: 'planet',
        mass: 1.0,
        radius: 4.0,
        position: { x: -115, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: -16.6 },
        color: '#38bdf8',
        textureType: 'earth',
        hasAtmosphere: true,
        atmosphereColor: '#60a5fa',
        originalOrbitSemiMajorAxis: 115,
      },
      {
        id: 'moon',
        name: 'Luna (Moon)',
        type: 'moon',
        mass: 0.02,
        radius: 1.3,
        position: { x: -125, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: -14.4 },
        color: '#cbd5e1',
        textureType: 'moon',
      },
      // 5. Mars & Phobos
      {
        id: 'mars',
        name: 'Mars',
        type: 'planet',
        mass: 0.22,
        radius: 2.8,
        position: { x: 0, y: 0, z: 160 },
        velocity: { x: -14.1, y: 0, z: 0 },
        color: '#ef4444',
        textureType: 'mars',
        hasAtmosphere: true,
        atmosphereColor: '#f87171',
        originalOrbitSemiMajorAxis: 160,
      },
      {
        id: 'phobos',
        name: 'Phobos',
        type: 'moon',
        mass: 0.001,
        radius: 0.8,
        position: { x: 0, y: 0, z: 166 },
        velocity: { x: -12.3, y: 0, z: 0 },
        color: '#a8a29e',
        textureType: 'rock',
      },
      // 6. Major Belt Asteroids: Ceres & Vesta
      {
        id: 'ceres',
        name: 'Ceres (Dwarf Planet)',
        type: 'planet',
        mass: 0.015,
        radius: 1.6,
        position: { x: -205, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: -12.4 },
        color: '#d6d3d1',
        textureType: 'moon',
      },
      {
        id: 'vesta',
        name: '4 Vesta',
        type: 'asteroid',
        mass: 0.008,
        radius: 1.2,
        position: { x: 0, y: 0, z: -220 },
        velocity: { x: 12.0, y: 0, z: 0 },
        color: '#a8a29e',
        textureType: 'rock',
      },
      // 7. Main Asteroid Belt (60 procedural orbiting bodies)
      ...generateAsteroidBelt({ x: 0, y: 0, z: 0 }, 55, 185, 235, 32000, 'main_belt'),
      // 8. Jupiter & 4 Galilean Moons
      {
        id: 'jupiter',
        name: 'Jupiter',
        type: 'planet',
        mass: 160.0,
        radius: 12.0,
        position: { x: 310, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 10.1 },
        color: '#d97706',
        textureType: 'jupiter',
        hasAtmosphere: true,
        atmosphereColor: '#fbbf24',
        originalOrbitSemiMajorAxis: 310,
      },
      {
        id: 'io',
        name: 'Io (Volcanic Moon)',
        type: 'moon',
        mass: 0.04,
        radius: 1.5,
        position: { x: 326, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 13.8 },
        color: '#facc15',
        textureType: 'lava',
      },
      {
        id: 'europa',
        name: 'Europa (Subsurface Ocean)',
        type: 'moon',
        mass: 0.03,
        radius: 1.4,
        position: { x: 334, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 12.9 },
        color: '#e0f2fe',
        textureType: 'ice',
      },
      {
        id: 'ganymede',
        name: 'Ganymede (Largest Moon)',
        type: 'moon',
        mass: 0.08,
        radius: 2.1,
        position: { x: 345, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 12.2 },
        color: '#94a3b8',
        textureType: 'moon',
      },
      {
        id: 'callisto',
        name: 'Callisto (Cratered Ice)',
        type: 'moon',
        mass: 0.06,
        radius: 1.9,
        position: { x: 358, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 11.6 },
        color: '#64748b',
        textureType: 'moon',
      },
      // 9. Saturn with illuminated Rings + Titan + Enceladus
      {
        id: 'saturn',
        name: 'Saturn',
        type: 'planet',
        mass: 65.0,
        radius: 9.5,
        position: { x: 0, y: 0, z: -460 },
        velocity: { x: 8.3, y: 0, z: 0 },
        color: '#fde047',
        textureType: 'saturn',
        hasRings: true,
        hasAtmosphere: true,
        atmosphereColor: '#fef08a',
        originalOrbitSemiMajorAxis: 460,
      },
      {
        id: 'titan',
        name: 'Titan (Methane Seas)',
        type: 'moon',
        mass: 0.07,
        radius: 2.0,
        position: { x: 0, y: 0, z: -484 },
        velocity: { x: 9.8, y: 0, z: 0 },
        color: '#ea580c',
        textureType: 'mars',
        hasAtmosphere: true,
        atmosphereColor: '#f97316',
      },
      {
        id: 'enceladus',
        name: 'Enceladus (Cryo-Geysers)',
        type: 'moon',
        mass: 0.01,
        radius: 1.0,
        position: { x: 0, y: 0, z: -446 },
        velocity: { x: 7.1, y: 0, z: 0 },
        color: '#f8fafc',
        textureType: 'ice',
      },
      // 10. Uranus with tilted rings
      {
        id: 'uranus',
        name: 'Uranus (Ice Giant)',
        type: 'planet',
        mass: 22.0,
        radius: 6.8,
        position: { x: -620, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: -7.1 },
        color: '#67e8f9',
        textureType: 'ice',
        hasRings: true,
        hasAtmosphere: true,
        atmosphereColor: '#a5f3fc',
      },
      // 11. Neptune & Triton
      {
        id: 'neptune',
        name: 'Neptune (Storm Giant)',
        type: 'planet',
        mass: 25.0,
        radius: 6.6,
        position: { x: 0, y: 0, z: 780 },
        velocity: { x: -6.4, y: 0, z: 0 },
        color: '#0284c7',
        textureType: 'ice',
        hasAtmosphere: true,
        atmosphereColor: '#38bdf8',
      },
      {
        id: 'triton',
        name: 'Triton (Retrograde Moon)',
        type: 'moon',
        mass: 0.03,
        radius: 1.5,
        position: { x: 0, y: 0, z: 798 },
        velocity: { x: -5.0, y: 0, z: 0 }, // Retrograde orbit
        color: '#cbd5e1',
        textureType: 'ice',
      },
      // 12. Pluto & Charon
      {
        id: 'pluto',
        name: 'Pluto (Kuiper Dwarf)',
        type: 'planet',
        mass: 0.008,
        radius: 1.4,
        position: { x: 920, y: 15, z: 120 },
        velocity: { x: -0.8, y: -0.2, z: 5.8 },
        color: '#cbd5e1',
        textureType: 'rock',
      },
      {
        id: 'charon',
        name: 'Charon',
        type: 'moon',
        mass: 0.002,
        radius: 0.9,
        position: { x: 926, y: 15, z: 120 },
        velocity: { x: -0.8, y: -0.2, z: 6.6 },
        color: '#94a3b8',
        textureType: 'rock',
      },
    ],
  },
  {
    id: 'three_body',
    name: 'The Three-Body Problem (Trisolaris)',
    tagline: '3 Chaotic Suns & Non-Periodic Gravitational Orbits',
    description: 'Based on the famous orbital mechanics dilemma: 3 massive stars dancing around each other with zero closed-form analytical solution. Experience sudden gravitational ejections, erratic syzygy alignments, and extreme tidal stress.',
    recommendedScale: 0.65,
    defaultAsteroidPosition: { x: -220, y: 0, z: -90 },
    defaultAsteroidVelocity: { x: 10.2, y: 0, z: 5.5 },
    bodies: [
      {
        id: 'star_alpha',
        name: 'Alpha Trisolaris (Gold Sun)',
        type: 'star',
        mass: 14000,
        radius: 13,
        position: { x: -70, y: 0, z: -40 },
        velocity: { x: 2.8, y: 0, z: 8.5 },
        color: '#f59e0b',
        emissive: true,
        textureType: 'sun',
      },
      {
        id: 'star_beta',
        name: 'Beta Trisolaris (Crimson Giant)',
        type: 'star',
        mass: 12500,
        radius: 15,
        position: { x: 80, y: 0, z: 20 },
        velocity: { x: -3.5, y: 0, z: -7.2 },
        color: '#ef4444',
        emissive: true,
        textureType: 'sun',
      },
      {
        id: 'star_gamma',
        name: 'Gamma Trisolaris (Blue Dwarf)',
        type: 'star',
        mass: 9000,
        radius: 9,
        position: { x: 10, y: 0, z: 95 },
        velocity: { x: 7.2, y: 0, z: -2.1 },
        color: '#38bdf8',
        emissive: true,
        textureType: 'sun',
      },
      {
        id: 'trisolaris_planet',
        name: 'Trisolaris Prime (Doomed World)',
        type: 'planet',
        mass: 1.2,
        radius: 3.2,
        position: { x: -140, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: -16.5 },
        color: '#10b981',
        textureType: 'earth',
        hasAtmosphere: true,
        atmosphereColor: '#34d399',
      },
      {
        id: 'molten_fragment',
        name: 'Shattered Protoplanet',
        type: 'planet',
        mass: 0.5,
        radius: 2.2,
        position: { x: 160, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 14.8 },
        color: '#f97316',
        textureType: 'lava',
      },
      ...generateAsteroidBelt({ x: 0, y: 0, z: 0 }, 30, 190, 260, 35500, 'debris_ring'),
    ],
  },
  {
    id: 'pulsar_system',
    name: 'Pulsar PSR B1257+12 & Magnetar',
    tagline: 'Rapidly Spinning Neutron Star & Zombie Planets',
    description: 'An extreme dead-star remnant spinning at millisecond speeds with twin relativistic polar emission jets, surrounded by the first confirmed exoplanets in history (Draugr, Poltergeist, Phobetor) and an irradiated asteroid cloud.',
    recommendedScale: 0.7,
    defaultAsteroidPosition: { x: -180, y: 0, z: -80 },
    defaultAsteroidVelocity: { x: 11.5, y: 0, z: 6.2 },
    bodies: [
      {
        id: 'pulsar_core',
        name: 'PSR B1257+12 (Lich Pulsar)',
        type: 'pulsar',
        mass: 28000,
        radius: 4.5,
        position: { x: 0, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        color: '#c084fc',
        emissive: true,
        textureType: 'pulsar',
        hasPulsarJets: true,
      },
      {
        id: 'draugr',
        name: 'Draugr (PSR B1257+12 b)',
        type: 'planet',
        mass: 0.08,
        radius: 1.8,
        position: { x: 38, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 27.1 },
        color: '#94a3b8',
        textureType: 'rock',
      },
      {
        id: 'poltergeist',
        name: 'Poltergeist (PSR B1257+12 c)',
        type: 'planet',
        mass: 4.3,
        radius: 4.8,
        position: { x: 0, y: 0, z: -76 },
        velocity: { x: 19.2, y: 0, z: 0 },
        color: '#a855f7',
        textureType: 'rock',
        hasAtmosphere: true,
        atmosphereColor: '#c084fc',
      },
      {
        id: 'phobetor',
        name: 'Phobetor (PSR B1257+12 d)',
        type: 'planet',
        mass: 3.9,
        radius: 4.6,
        position: { x: -125, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: -14.9 },
        color: '#6366f1',
        textureType: 'ice',
        hasRings: true,
      },
      ...generateAsteroidBelt({ x: 0, y: 0, z: 0 }, 40, 150, 220, 28000, 'pulsar_disc'),
    ],
  },
  {
    id: 'inner_system',
    name: 'Inner Solar System',
    tagline: 'Sun, Mercury, Venus, Earth & Luna, Mars',
    description: 'Realistic proportional model of the inner rocky planets. Study lunar gravity assists, Earth deflection scenarios, and Venusian slingshots.',
    recommendedScale: 1.0,
    defaultAsteroidPosition: { x: -160, y: 0, z: -40 },
    defaultAsteroidVelocity: { x: 7.2, y: 0, z: 4.8 },
    bodies: [
      {
        id: 'sun',
        name: 'Sol (Sun)',
        type: 'star',
        mass: 14000,
        radius: 14,
        position: { x: 0, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        color: '#fbbf24',
        emissive: true,
        textureType: 'sun',
      },
      {
        id: 'mercury',
        name: 'Mercury',
        type: 'planet',
        mass: 0.12,
        radius: 2.2,
        position: { x: 42, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 18.2 },
        color: '#9ca3af',
        textureType: 'rock',
      },
      {
        id: 'venus',
        name: 'Venus',
        type: 'planet',
        mass: 0.82,
        radius: 3.5,
        position: { x: 0, y: 0, z: -75 },
        velocity: { x: 13.6, y: 0, z: 0 },
        color: '#f59e0b',
        textureType: 'mars',
        hasAtmosphere: true,
        atmosphereColor: '#fbbf24',
      },
      {
        id: 'earth',
        name: 'Earth',
        type: 'planet',
        mass: 1.0,
        radius: 4.0,
        position: { x: -115, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: -11.0 },
        color: '#38bdf8',
        textureType: 'earth',
        hasAtmosphere: true,
        atmosphereColor: '#60a5fa',
        originalOrbitSemiMajorAxis: 115,
      },
      {
        id: 'moon',
        name: 'Luna (Moon)',
        type: 'moon',
        mass: 0.02,
        radius: 1.4,
        position: { x: -125, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: -8.8 },
        color: '#cbd5e1',
        textureType: 'moon',
      },
      {
        id: 'mars',
        name: 'Mars',
        type: 'planet',
        mass: 0.2,
        radius: 2.8,
        position: { x: 0, y: 0, z: 165 },
        velocity: { x: -9.2, y: 0, z: 0 },
        color: '#ef4444',
        textureType: 'mars',
        hasAtmosphere: true,
        atmosphereColor: '#f87171',
        originalOrbitSemiMajorAxis: 165,
      },
    ],
  },
  {
    id: 'gas_giants',
    name: 'Jovian Realm & Gas Giants',
    tagline: 'Sun, Jupiter, Galilean Moons & Ringed Saturn',
    description: 'Immense gravitational wells of Jupiter and Saturn. Experience colossal gravity slingshot speed boosts (hyperbolic escape) or ring collisions.',
    recommendedScale: 0.7,
    defaultAsteroidPosition: { x: -280, y: 0, z: -150 },
    defaultAsteroidVelocity: { x: 6.5, y: 0, z: 2.8 },
    bodies: [
      {
        id: 'sun',
        name: 'Sol (Sun)',
        type: 'star',
        mass: 22000,
        radius: 18,
        position: { x: 0, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        color: '#f59e0b',
        emissive: true,
        textureType: 'sun',
      },
      {
        id: 'earth',
        name: 'Earth',
        type: 'planet',
        mass: 1.0,
        radius: 3.5,
        position: { x: 90, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 15.6 },
        color: '#38bdf8',
        textureType: 'earth',
        hasAtmosphere: true,
        atmosphereColor: '#60a5fa',
      },
      {
        id: 'jupiter',
        name: 'Jupiter',
        type: 'planet',
        mass: 120.0,
        radius: 11.0,
        position: { x: -230, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: -9.7 },
        color: '#d97706',
        textureType: 'jupiter',
        hasAtmosphere: true,
        atmosphereColor: '#fbbf24',
        originalOrbitSemiMajorAxis: 230,
      },
      {
        id: 'ganymede',
        name: 'Ganymede',
        type: 'moon',
        mass: 0.08,
        radius: 2.0,
        position: { x: -252, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: -12.0 },
        color: '#94a3b8',
        textureType: 'moon',
      },
      {
        id: 'saturn',
        name: 'Saturn',
        type: 'planet',
        mass: 45.0,
        radius: 9.0,
        position: { x: 0, y: 0, z: 360 },
        velocity: { x: -7.8, y: 0, z: 0 },
        color: '#fde047',
        textureType: 'saturn',
        hasRings: true,
        hasAtmosphere: true,
        atmosphereColor: '#fef08a',
        originalOrbitSemiMajorAxis: 360,
      },
    ],
  },
  {
    id: 'binary_stars',
    name: 'Binary Star Chaos (Alpha Centauri)',
    tagline: 'Twin Suns & Chaotic 3-Body Lagrange Wells',
    description: 'Two massive stars orbiting a common barycenter. Features unstable Lagrange points, chaotic orbital flips, and figure-eight gravity trajectories.',
    recommendedScale: 0.8,
    defaultAsteroidPosition: { x: 0, y: 0, z: -180 },
    defaultAsteroidVelocity: { x: 9.5, y: 0, z: 3.5 },
    bodies: [
      {
        id: 'star_a',
        name: 'Centauri Prime (Gold Sun)',
        type: 'star',
        mass: 9000,
        radius: 12,
        position: { x: -55, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 7.2 },
        color: '#f59e0b',
        emissive: true,
        textureType: 'sun',
      },
      {
        id: 'star_b',
        name: 'Centauri Secundus (Cyan Star)',
        type: 'star',
        mass: 7500,
        radius: 10,
        position: { x: 65, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: -8.6 },
        color: '#38bdf8',
        emissive: true,
        textureType: 'sun',
      },
      {
        id: 'planet_tartarus',
        name: 'Tartarus (S-Type Orbit)',
        type: 'planet',
        mass: 1.5,
        radius: 3.6,
        position: { x: -115, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 18.0 },
        color: '#f43f5e',
        textureType: 'mars',
        hasAtmosphere: true,
        atmosphereColor: '#fda4af',
      },
      {
        id: 'planet_elysium',
        name: 'Elysium (Circumbinary Giant)',
        type: 'planet',
        mass: 25.0,
        radius: 7.5,
        position: { x: 0, y: 0, z: 240 },
        velocity: { x: -8.2, y: 0, z: 0 },
        color: '#10b981',
        textureType: 'jupiter',
        hasRings: true,
        hasAtmosphere: true,
        atmosphereColor: '#6ee7b7',
      },
    ],
  },
  {
    id: 'trappist',
    name: 'TRAPPIST-1 Resonant Chain',
    tagline: 'Ultra-Cool Red Dwarf & 7 Resonant Exoplanets',
    description: 'A tight resonant necklace of 7 Earth-sized exoplanets orbiting a red dwarf. A single massive asteroid can trigger a domino cascade of orbital shifts!',
    recommendedScale: 1.2,
    defaultAsteroidPosition: { x: -110, y: 0, z: -30 },
    defaultAsteroidVelocity: { x: 5.5, y: 0, z: 3.2 },
    bodies: [
      {
        id: 'trappist_star',
        name: 'TRAPPIST-1 Red Dwarf',
        type: 'star',
        mass: 4200,
        radius: 8.5,
        position: { x: 0, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        color: '#ef4444',
        emissive: true,
        textureType: 'sun',
      },
      {
        id: 'trappist_b',
        name: 'TRAPPIST-1b',
        type: 'planet',
        mass: 1.0,
        radius: 2.8,
        position: { x: 26, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 12.7 },
        color: '#e2e8f0',
        textureType: 'rock',
      },
      {
        id: 'trappist_c',
        name: 'TRAPPIST-1c',
        type: 'planet',
        mass: 1.1,
        radius: 2.9,
        position: { x: 0, y: 0, z: 36 },
        velocity: { x: -10.8, y: 0, z: 0 },
        color: '#fdba74',
        textureType: 'mars',
      },
      {
        id: 'trappist_d',
        name: 'TRAPPIST-1d (Habitable)',
        type: 'planet',
        mass: 0.4,
        radius: 2.2,
        position: { x: -48, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: -9.3 },
        color: '#0284c7',
        textureType: 'earth',
        hasAtmosphere: true,
        atmosphereColor: '#38bdf8',
      },
      {
        id: 'trappist_e',
        name: 'TRAPPIST-1e (Water World)',
        type: 'planet',
        mass: 0.7,
        radius: 2.6,
        position: { x: 0, y: 0, z: -62 },
        velocity: { x: 8.2, y: 0, z: 0 },
        color: '#06b6d4',
        textureType: 'earth',
        hasAtmosphere: true,
        atmosphereColor: '#22d3ee',
      },
      {
        id: 'trappist_f',
        name: 'TRAPPIST-1f',
        type: 'planet',
        mass: 0.9,
        radius: 2.7,
        position: { x: 78, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 7.3 },
        color: '#93c5fd',
        textureType: 'ice',
      },
      {
        id: 'trappist_g',
        name: 'TRAPPIST-1g',
        type: 'planet',
        mass: 1.1,
        radius: 3.0,
        position: { x: 0, y: 0, z: 96 },
        velocity: { x: -6.6, y: 0, z: 0 },
        color: '#cbd5e1',
        textureType: 'ice',
      },
    ],
  },
  {
    id: 'black_hole',
    name: 'Gargantua Singularity',
    tagline: 'Supermassive Black Hole & Accretion Disk',
    description: 'Immense relativistic spacetime gravity well. Watch asteroids enter extreme slingshots, orbit the event horizon, or plunge into the accretion disk.',
    recommendedScale: 0.6,
    defaultAsteroidPosition: { x: -220, y: 0, z: -120 },
    defaultAsteroidVelocity: { x: 12.0, y: 0, z: 6.5 },
    bodies: [
      {
        id: 'singularity_core',
        name: 'Gargantua (Singularity)',
        type: 'black_hole',
        mass: 35000,
        radius: 7.5,
        position: { x: 0, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        color: '#0f172a',
        textureType: 'black_hole',
        hasRings: true, // Used for luminous accretion disk
      },
      {
        id: 'doomed_pulsar',
        name: 'Vespera (Neutron Star)',
        type: 'star',
        mass: 2500,
        radius: 4.0,
        position: { x: 95, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 19.2 },
        color: '#a855f7',
        emissive: true,
        textureType: 'sun',
      },
      {
        id: 'miller_world',
        name: "Miller's Tide Planet",
        type: 'planet',
        mass: 1.8,
        radius: 3.8,
        position: { x: 0, y: 0, z: 185 },
        velocity: { x: -13.7, y: 0, z: 0 },
        color: '#0284c7',
        textureType: 'earth',
        hasAtmosphere: true,
        atmosphereColor: '#38bdf8',
      },
      {
        id: 'edmunds_world',
        name: 'Outer Survivor Planet',
        type: 'planet',
        mass: 2.2,
        radius: 4.2,
        position: { x: -310, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: -10.6 },
        color: '#e2e8f0',
        textureType: 'ice',
      },
    ],
  },
];

/**
 * Built-in Scientific Challenge Missions
 */
export const CHALLENGE_MISSIONS: ChallengeMission[] = [
  {
    id: 'mission_slingshot',
    title: 'The Grand Slingshot',
    presetId: 'gas_giants',
    goalDescription: 'Perform a close gravity assist flyby of Jupiter to accelerate your asteroid past 28.0 units/sec and escape the solar system without impacting any body!',
    hint: 'Aim just outside Jupiter’s leading orbital flank so it pulls you forward and imparts its orbital velocity.',
    rewardBadge: 'Cosmic Voyager',
    initialAsteroid: {
      composition: 'silicate',
      pos: { x: -280, y: 0, z: -160 },
      vel: { x: 7.2, y: 0, z: 4.6 },
    },
    checkSuccess: (stats) => {
      return stats.maxSpeed >= 28.0 && stats.impacts.length === 0;
    },
  },
  {
    id: 'mission_lunar_assist',
    title: 'Lunar Deflection Transfer',
    presetId: 'inner_system',
    goalDescription: 'Use the Moon’s gravity well to execute a bi-elliptic transfer and slingshot towards Mars without colliding with Earth.',
    hint: 'A delicate flyby behind the Moon will bend your vector towards Mars’ outer orbit (r = 165).',
    rewardBadge: 'Apollo Navigator',
    initialAsteroid: {
      composition: 'iron',
      pos: { x: -160, y: 0, z: -35 },
      vel: { x: 7.4, y: 0, z: 4.4 },
    },
    checkSuccess: (stats) => {
      // Passes near Moon and then near Mars
      return stats.closestBodyName === 'Luna (Moon)' && (stats.closestDist || 999) < 18;
    },
  },
  {
    id: 'mission_roche_breakup',
    title: 'Tidal Ring Maker (Roche Breakup)',
    presetId: 'gas_giants',
    goalDescription: 'Send an Icy Comet into a close skimming pass within Saturn’s Roche limit (< 22 distance) to trigger tidal disruption!',
    hint: 'Comets with volatile water-ice have lower cohesive tensile strength and tear apart under tidal gravitational shear.',
    rewardBadge: 'Ring Architect',
    initialAsteroid: {
      composition: 'ice_comet',
      pos: { x: -120, y: 0, z: 280 },
      vel: { x: 5.8, y: 0, z: 3.2 },
    },
    checkSuccess: (stats) => {
      return stats.closestBodyName === 'Saturn' && (stats.closestDist || 999) < 22;
    },
  },
  {
    id: 'mission_planetary_shift',
    title: 'Kinetic Orbit Perturbation',
    presetId: 'trappist',
    goalDescription: 'Launch the massive Tungsten Planet-Buster into TRAPPIST-1b to measure its orbital deflection (> 0.05 m/s delta-V)!',
    hint: 'Direct head-on collision at maximum velocity maximizes momentum exchange.',
    rewardBadge: 'Planetary Shifter',
    initialAsteroid: {
      composition: 'tungsten',
      pos: { x: 75, y: 0, z: -55 },
      vel: { x: -8.0, y: 0, z: 4.0 },
    },
    checkSuccess: (stats) => {
      return stats.impacts.some((imp) => imp.targetBodyName.includes('TRAPPIST-1b') && imp.planetDeflectionDeltaV > 0.04);
    },
  },
  {
    id: 'mission_blackhole_whip',
    title: 'Event Horizon Relativistic Whip',
    presetId: 'black_hole',
    goalDescription: 'Skim past Gargantua’s event horizon (within 18 units) and reach an astonishing speed > 45.0 units/sec without falling in!',
    hint: 'High initial speed and tangential angle allows you to graze the gravity well and whip around at relativistic velocities.',
    rewardBadge: 'Horizon Skimmer',
    initialAsteroid: {
      composition: 'iron',
      pos: { x: -180, y: 0, z: -110 },
      vel: { x: 14.5, y: 0, z: 7.2 },
    },
    checkSuccess: (stats) => {
      return stats.maxSpeed >= 45.0 && stats.closestBodyName === 'Gargantua (Singularity)' && stats.impacts.length === 0;
    },
  },
];
