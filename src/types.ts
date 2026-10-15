export type BodyType = 'star' | 'planet' | 'moon' | 'black_hole' | 'pulsar' | 'station' | 'asteroid';

export type AsteroidComposition =
  | 'silicate'
  | 'iron'
  | 'ice_comet'
  | 'tungsten'
  | 'singularity'
  | 'gold_platinum'
  | 'dark_matter'
  | 'antimatter'
  | 'colony_ship'
  | 'swarm_cluster';

export interface CelestialBody {
  id: string;
  name: string;
  type: BodyType;
  mass: number; // in simulation units (e.g. Earth = 1, Sun = 333000)
  radius: number; // visual & collision radius in simulation units
  position: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
  color: string;
  emissive?: boolean;
  textureType?: 'sun' | 'earth' | 'mars' | 'jupiter' | 'saturn' | 'moon' | 'ice' | 'black_hole' | 'pulsar' | 'rock' | 'lava' | 'gold' | 'station';
  hasRings?: boolean;
  hasAtmosphere?: boolean;
  atmosphereColor?: string;
  rotationSpeed?: number;
  hasPulsarJets?: boolean;
  isBeltAsteroid?: boolean;
  // Dynamic stats
  originalOrbitSemiMajorAxis?: number;
  craterCount?: number;
  lastImpactEnergy?: number;
  isCustom?: boolean;
}

export interface AsteroidSpec {
  id: string;
  name: string;
  composition: AsteroidComposition;
  mass: number;
  radius: number;
  density: number; // g/cm3 equivalent
  color: string;
  trailColor: string;
  description: string;
}

export interface TrajectoryPoint {
  x: number;
  y: number;
  z: number;
  velocity: number;
  time: number;
  nearestBodyName?: string;
  closestApproachDist?: number;
}

export interface BindingEnergyData {
  joules: number;
  megatons: number;
  displayMegatons: string;
  displayJoules: string;
  category: 'supermassive' | 'stellar' | 'gas_giant' | 'terrestrial' | 'dwarf_planet' | 'major_moon' | 'minor_moon' | 'asteroid' | 'structure';
  formula: string;
}

export interface TrajectoryPrediction {
  points: TrajectoryPoint[];
  willCollide: boolean;
  targetBodyId?: string;
  targetBodyName?: string;
  impactVelocity?: number;
  impactEnergyJoules?: number;
  impactEnergyMegatons?: number;
  targetBindingEnergyMT?: number;
  isTargetDisrupted?: boolean;
  willEscape: boolean;
  maxVelocityAchieved: number;
  closestApproach: {
    bodyName: string;
    distance: number;
    speedAtApproach: number;
  } | null;
}

export interface ImpactEvent {
  id: string;
  time: number;
  asteroidName: string;
  targetBodyName: string;
  position: { x: number; y: number; z: number };
  velocityMagnitude: number;
  energyJoules: number;
  energyMegatons: number;
  targetBindingEnergyMT?: number;
  targetBindingEnergyJoules?: number;
  energyToBindingRatio?: number;
  craterDiameterKm: number;
  planetDeflectionDeltaV: number; // m/s equivalent
  rocheDisruption?: boolean;
  bodyDestroyed?: boolean;
  destroyedBodyName?: string;
  isStellarNova?: boolean;
}

export interface SystemPreset {
  id: string;
  name: string;
  tagline: string;
  description: string;
  bodies: CelestialBody[];
  recommendedScale: number;
  defaultAsteroidPosition: { x: number; y: number; z: number };
  defaultAsteroidVelocity: { x: number; y: number; z: number };
}

export interface ChallengeMission {
  id: string;
  title: string;
  presetId: string;
  goalDescription: string;
  hint: string;
  rewardBadge: string;
  initialAsteroid: {
    composition: AsteroidComposition;
    pos: { x: number; y: number; z: number };
    vel: { x: number; y: number; z: number };
  };
  checkSuccess: (
    stats: {
      maxSpeed: number;
      slingshotBoost: number;
      impacts: ImpactEvent[];
      bodies: CelestialBody[];
      asteroidInFlight: boolean;
      asteroidPos?: { x: number; y: number; z: number };
      closestBodyName?: string;
      closestDist?: number;
    }
  ) => boolean;
}
