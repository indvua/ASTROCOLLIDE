import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { AsteroidComposition, AsteroidSpec, CelestialBody, ImpactEvent, TrajectoryPrediction } from '../types';
import {
  ASTEROID_SPECS,
  computeAcceleration,
  computeImpactorEnergy,
  G_CONSTANT,
  getGravitationalBindingEnergy,
  predictAsteroidTrajectory,
  SOFTENING_EPSILON,
  stepAsteroid,
  stepNBodySystem,
} from './physics';
import {
  getAccretionDiskTexture,
  getAsteroidBumpTexture,
  getCloudsTexture,
  getCollisionalDebrisRingTexture,
  getEarthTexture,
  getGasGiantRingsTexture,
  getGoldTexture,
  getIceTexture,
  getJupiterTexture,
  getLavaTexture,
  getMarsTexture,
  getMoonTexture,
  getNeptuneTexture,
  getPulsarTexture,
  getSaturnRingsTexture,
  getSaturnTexture,
  getStationTexture,
  getStellarCircumstellarDebrisTexture,
  getSunTexture,
  getUranusRingsTexture,
} from './textures';
import { sound } from '../audio/soundEngine';

// Module-scope math helpers to prevent garbage collection during animation loop
const _vec3A = new THREE.Vector3();
const _vec3B = new THREE.Vector3();
const _colorA = new THREE.Color();
const _raycaster = new THREE.Raycaster();
const _mouse = new THREE.Vector2();

export interface ActiveAsteroid {
  spec: AsteroidSpec;
  position: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
  initialSpeed: number;
  mesh: THREE.Group;
  tailParticles?: THREE.Points;
  tailPositions?: Float32Array;
  alive: boolean;
  maxSpeedAchieved: number;
  flightTime: number;
  closestDist: number;
  closestBodyName: string;
}

export interface SceneConfig {
  showSpacetimeGrid: boolean;
  showOrbits: boolean;
  showLabels: boolean;
  showTrajectory: boolean;
  timeScale: number; // 0 = paused, 1 = normal, etc.
}

export class SimulationScene {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private animFrameId: number | null = null;
  private isDisposed: boolean = false;

  // Celestial Bodies
  private bodies: CelestialBody[] = [];
  private bodyMeshMap: Map<string, THREE.Group> = new Map();
  private orbitLineMap: Map<string, THREE.Line> = new Map();
  private bodyTrails: Map<string, THREE.Vector3[]> = new Map();

  // Spacetime Grid
  private gridMesh: THREE.Mesh | null = null;
  private gridGeometry: THREE.PlaneGeometry | null = null;
  private gridOriginalPositions: Float32Array | null = null;

  // Active Asteroids in flight
  private activeAsteroids: ActiveAsteroid[] = [];

  // Trajectory Prediction Line & Impact Marker
  private trajectoryLine: THREE.Line | null = null;
  private trajectoryGeom: THREE.BufferGeometry | null = null;
  private impactMarkerMesh: THREE.Mesh | null = null;

  // Aiming / Slingshot Drag State
  private isAiming: boolean = false;
  private aimAnchorWorld: THREE.Vector3 = new THREE.Vector3();
  private aimCurrentWorld: THREE.Vector3 = new THREE.Vector3();
  private aimArrowHelper: THREE.ArrowHelper | null = null;
  private aimSelectedSpec: AsteroidSpec = ASTEROID_SPECS.silicate;

  // Camera tracking
  private followTargetId: string | 'asteroid' | null = null;

  // Config
  private config: SceneConfig = {
    showSpacetimeGrid: true,
    showOrbits: true,
    showLabels: true,
    showTrajectory: true,
    timeScale: 1.0,
  };

  // Particle Explosions
  private explosionParticles: {
    points: THREE.Points;
    velocities: Float32Array;
    life: number;
    maxLife: number;
  }[] = [];

  // Impact Slow-Mo & Screen Trauma
  private impactSlowMoEnabled: boolean = true;
  private slowMoRemaining: number = 0;
  private baseTimeScale: number = 1.0;
  private screenShake: number = 0;
  private cameraBasePosition: THREE.Vector3 = new THREE.Vector3();

  // Ejected 3D Physical Crust Chunks
  private ejectedChunks: {
    mesh: THREE.Mesh;
    velocity: THREE.Vector3;
    rotationAxis: THREE.Vector3;
    rotationSpeed: number;
    life: number;
    maxLife: number;
  }[] = [];

  // Newly Formed Planetary Debris Rings
  private formedRings: {
    bodyId: string;
    mesh: THREE.Mesh;
    expansionProgress: number;
    targetScale: number;
  }[] = [];

  // Surface Seismic Shockwaves
  private surfaceShockwaves: {
    mesh: THREE.Mesh;
    bodyGroup: THREE.Group;
    progress: number;
    duration: number;
  }[] = [];

  // Callbacks to React
  private onImpactCallback?: (event: ImpactEvent) => void;
  private onTelemetryCallback?: (stats: {
    simTime: number;
    asteroidCount: number;
    activeAsteroidSpeed: number;
    vx: number;
    vy: number;
    vz: number;
    escapeVelocity: number;
    activeAsteroidGForce: number;
    activeAsteroidEnergyMT: number;
    activeAsteroidDistClosest: number;
    activeAsteroidClosestName: string;
    slingshotBoost: number;
    isAiming: boolean;
    aimSpeed: number;
    isSlowMoActive: boolean;
  }) => void;

  private simTime: number = 0;
  private lastTime: number = performance.now();

  constructor(container: HTMLElement) {
    this.container = container;
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // Renderer
    const isHeadless = navigator.webdriver || /HeadlessChrome/i.test(navigator.userAgent);
    this.renderer = new THREE.WebGLRenderer({
      antialias: !isHeadless,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(isHeadless ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = !isHeadless;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(this.renderer.domElement);

    // Scene & Camera
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#030712'); // Deep cosmic void
    this.scene.fog = new THREE.FogExp2('#030712', 0.0006);

    this.camera = new THREE.PerspectiveCamera(45, width / height, 1, 6000);
    this.camera.position.set(0, 320, 420);

    // Orbit Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxDistance = 2500;
    this.controls.minDistance = 15;
    this.controls.target.set(0, 0, 0);

    // Procedural Studio Environment
    try {
      const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
      this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
      pmremGenerator.dispose();
    } catch {}

    // Lighting
    this.setupLighting();

    // Cosmic Starfield background
    this.setupStarfield();

    // Spacetime Curvature Grid
    this.setupSpacetimeGrid();

    // Trajectory Line & Markers
    this.setupTrajectoryLine();

    // Aim Arrow helper
    this.aimArrowHelper = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0), 20, 0x38bdf8, 5, 2.5);
    this.aimArrowHelper.visible = false;
    this.scene.add(this.aimArrowHelper);

    // Input handlers
    this.setupInputHandlers();

    // Resize handler
    window.addEventListener('resize', this.handleResize);

    // Start loop
    this.startLoop();
  }

  private setupLighting() {
    // Ambient soft fill
    const hemiLight = new THREE.HemisphereLight('#38bdf8', '#020617', 0.4);
    this.scene.add(hemiLight);

    // Central star key point light
    const starLight = new THREE.PointLight('#fffbeb', 2.8, 2500, 0.4);
    starLight.position.set(0, 0, 0);
    starLight.castShadow = true;
    starLight.shadow.bias = -0.0005;
    starLight.shadow.mapSize.width = 1024;
    starLight.shadow.mapSize.height = 1024;
    this.scene.add(starLight);
  }

  private setupStarfield() {
    const starCount = 2800;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      // Distribute in a huge outer sphere shell
      const r = 2400 + Math.random() * 1200;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      // Star color temperatures (blue-white, gold, pale orange)
      const choice = Math.random();
      if (choice > 0.8) {
        colors[i * 3] = 0.55; colors[i * 3 + 1] = 0.75; colors[i * 3 + 2] = 1.0; // blue
      } else if (choice > 0.4) {
        colors[i * 3] = 1.0; colors[i * 3 + 1] = 0.95; colors[i * 3 + 2] = 0.9; // white
      } else {
        colors[i * 3] = 1.0; colors[i * 3 + 1] = 0.82; colors[i * 3 + 2] = 0.5; // gold
      }
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 2.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
    });

    const starPoints = new THREE.Points(geometry, material);
    this.scene.add(starPoints);
  }

  private setupSpacetimeGrid() {
    const size = 900;
    const segments = 80;
    this.gridGeometry = new THREE.PlaneGeometry(size, size, segments, segments);
    this.gridGeometry.rotateX(-Math.PI / 2);

    const posAttr = this.gridGeometry.attributes.position;
    this.gridOriginalPositions = new Float32Array(posAttr.array);

    const gridMaterial = new THREE.MeshBasicMaterial({
      color: 0x0284c7,
      wireframe: true,
      transparent: true,
      opacity: 0.18,
      depthWrite: false,
    });

    this.gridMesh = new THREE.Mesh(this.gridGeometry, gridMaterial);
    this.gridMesh.position.y = -8;
    this.scene.add(this.gridMesh);
  }

  private setupTrajectoryLine() {
    const maxPoints = 900;
    this.trajectoryGeom = new THREE.BufferGeometry();
    const positions = new Float32Array(maxPoints * 3);
    this.trajectoryGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.trajectoryGeom.setDrawRange(0, 0);

    const lineMaterial = new THREE.LineDashedMaterial({
      color: 0x38bdf8,
      dashSize: 3,
      gapSize: 1.5,
      linewidth: 2,
      transparent: true,
      opacity: 0.85,
    });

    this.trajectoryLine = new THREE.Line(this.trajectoryGeom, lineMaterial);
    this.trajectoryLine.computeLineDistances();
    this.scene.add(this.trajectoryLine);

    // Collision Impact marker
    const markerGeom = new THREE.RingGeometry(3.5, 5.0, 32);
    markerGeom.rotateX(-Math.PI / 2);
    const markerMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
    });
    this.impactMarkerMesh = new THREE.Mesh(markerGeom, markerMat);
    this.impactMarkerMesh.visible = false;
    this.scene.add(this.impactMarkerMesh);
  }

  public loadSystem(bodies: CelestialBody[], defaultScale: number = 1.0) {
    // Clear old bodies
    this.bodyMeshMap.forEach((mesh) => this.scene.remove(mesh));
    this.bodyMeshMap.clear();

    this.orbitLineMap.forEach((line) => this.scene.remove(line));
    this.orbitLineMap.clear();

    this.bodyTrails.clear();
    this.clearAllAsteroids();

    // Deep clone bodies
    this.bodies = JSON.parse(JSON.stringify(bodies));

    // Build 3D models for each body
    this.bodies.forEach((body) => {
      const group = this.createCelestialBodyGroup(body);
      group.position.set(body.position.x, body.position.y, body.position.z);
      this.scene.add(group);
      this.bodyMeshMap.set(body.id, group);

      // Create orbit trail line
      const trailGeom = new THREE.BufferGeometry();
      const trailPositions = new Float32Array(200 * 3);
      trailGeom.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
      trailGeom.setDrawRange(0, 0);

      const trailMat = new THREE.LineBasicMaterial({
        color: new THREE.Color(body.color).multiplyScalar(0.7),
        transparent: true,
        opacity: body.type === 'star' ? 0.2 : 0.45,
      });

      const trailLine = new THREE.Line(trailGeom, trailMat);
      this.scene.add(trailLine);
      this.orbitLineMap.set(body.id, trailLine);
      this.bodyTrails.set(body.id, []);
    });

    // Reset camera target
    this.controls.target.set(0, 0, 0);
    this.camera.position.set(0, 320 / defaultScale, 420 / defaultScale);
    this.followTargetId = null;
  }

  /**
   * Creates a multi-layer composite Three.js Group for each celestial body
   */
  private createCelestialBodyGroup(body: CelestialBody): THREE.Group {
    const group = new THREE.Group();

    if (body.type === 'black_hole') {
      // 1. Black hole Event horizon sphere (light absorbing)
      const horizonGeom = new THREE.SphereGeometry(body.radius, 32, 32);
      const horizonMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
      const horizon = new THREE.Mesh(horizonGeom, horizonMat);
      group.add(horizon);

      // 2. Gravitational photon ring
      const photonGeom = new THREE.RingGeometry(body.radius * 1.05, body.radius * 1.25, 48);
      photonGeom.rotateX(Math.PI / 2);
      const photonMat = new THREE.MeshBasicMaterial({
        color: 0xc084fc,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9,
      });
      group.add(new THREE.Mesh(photonGeom, photonMat));

      // 3. Glowing relativistic Accretion Disk
      const diskGeom = new THREE.RingGeometry(body.radius * 1.4, body.radius * 4.5, 64);
      diskGeom.rotateX(Math.PI / 2);
      const diskTexture = getAccretionDiskTexture();
      const diskMat = new THREE.MeshBasicMaterial({
        map: diskTexture,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.92,
        depthWrite: false,
      });
      const diskMesh = new THREE.Mesh(diskGeom, diskMat);
      diskMesh.name = 'accretion_disk';
      group.add(diskMesh);

      return group;
    }

    if (body.type === 'star') {
      // Star Core
      const coreGeom = new THREE.SphereGeometry(body.radius, 40, 40);
      const sunTex = getSunTexture();
      const coreMat = new THREE.MeshBasicMaterial({
        map: sunTex,
        color: new THREE.Color(body.color),
      });
      const coreMesh = new THREE.Mesh(coreGeom, coreMat);
      group.add(coreMesh);

      // Solar Corona Glow Shell
      const coronaGeom = new THREE.SphereGeometry(body.radius * 1.15, 32, 32);
      const coronaMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(body.color),
        transparent: true,
        opacity: 0.25,
        side: THREE.BackSide,
      });
      group.add(new THREE.Mesh(coronaGeom, coronaMat));

      // Outer ethereal corona halo
      const outerHaloGeom = new THREE.SphereGeometry(body.radius * 1.45, 32, 32);
      const outerHaloMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(body.color),
        transparent: true,
        opacity: 0.1,
        side: THREE.BackSide,
      });
      group.add(new THREE.Mesh(outerHaloGeom, outerHaloMat));

      // Circumstellar Debris Ring for Stars (Incandescent plasma & embers - NOT a planet ring!)
      if (body.hasRings) {
        const debrisRingGeom = new THREE.RingGeometry(body.radius * 1.8, body.radius * 3.8, 64);
        debrisRingGeom.rotateX(Math.PI / 2);
        const debrisRingMat = new THREE.MeshBasicMaterial({
          map: getStellarCircumstellarDebrisTexture(body.color),
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.92,
          depthWrite: false,
        });
        const debrisRingMesh = new THREE.Mesh(debrisRingGeom, debrisRingMat);
        debrisRingMesh.name = 'circumstellar_debris_ring';
        group.add(debrisRingMesh);
      }

      return group;
    }

    if (body.type === 'pulsar' || body.hasPulsarJets) {
      // Rapid-spin Pulsar Core
      const coreGeom = new THREE.SphereGeometry(body.radius, 32, 32);
      const pulsarMat = new THREE.MeshBasicMaterial({
        map: getPulsarTexture(),
        color: new THREE.Color(body.color),
      });
      group.add(new THREE.Mesh(coreGeom, pulsarMat));

      // Relativistic Polar Jet Cones
      const jetGeom = new THREE.ConeGeometry(body.radius * 0.85, body.radius * 7, 32, 1, true);
      const jetMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.65,
        side: THREE.DoubleSide,
      });

      const northJet = new THREE.Mesh(jetGeom, jetMat);
      northJet.position.y = body.radius * 3.6;
      northJet.rotation.x = Math.PI;
      group.add(northJet);

      const southJet = new THREE.Mesh(jetGeom, jetMat);
      southJet.position.y = -body.radius * 3.6;
      group.add(southJet);

      return group;
    }

    if (body.type === 'station') {
      // Modular Space Station / Citadel
      const hubGeom = new THREE.CylinderGeometry(body.radius * 0.35, body.radius * 0.35, body.radius * 2.2, 16);
      const hubMat = new THREE.MeshStandardMaterial({
        color: 0xe2e8f0,
        metalness: 0.85,
        roughness: 0.2,
      });
      group.add(new THREE.Mesh(hubGeom, hubMat));

      const ringGeom = new THREE.TorusGeometry(body.radius * 1.3, body.radius * 0.18, 12, 32);
      ringGeom.rotateX(Math.PI / 2);
      group.add(new THREE.Mesh(ringGeom, hubMat));

      const panelGeom = new THREE.BoxGeometry(body.radius * 3.6, body.radius * 0.08, body.radius * 0.7);
      const panelMat = new THREE.MeshStandardMaterial({
        map: getStationTexture(),
        roughness: 0.3,
        metalness: 0.75,
      });
      group.add(new THREE.Mesh(panelGeom, panelMat));

      return group;
    }

    // Terrestrial / Gas Giant Planets
    const sphereGeom = new THREE.SphereGeometry(body.radius, 32, 32);
    let planetMat: THREE.Material;

    if (body.textureType === 'earth') {
      planetMat = new THREE.MeshStandardMaterial({
        map: getEarthTexture(),
        roughness: 0.5,
        metalness: 0.1,
      });

      const bodyMesh = new THREE.Mesh(sphereGeom, planetMat);
      bodyMesh.castShadow = true;
      bodyMesh.receiveShadow = true;
      group.add(bodyMesh);

      // Earth Clouds Layer
      const cloudGeom = new THREE.SphereGeometry(body.radius * 1.02, 32, 32);
      const cloudMat = new THREE.MeshStandardMaterial({
        map: getCloudsTexture(),
        transparent: true,
        opacity: 0.75,
        depthWrite: false,
      });
      const cloudMesh = new THREE.Mesh(cloudGeom, cloudMat);
      cloudMesh.name = 'clouds';
      group.add(cloudMesh);

      // Atmosphere blue halo
      const atmoGeom = new THREE.SphereGeometry(body.radius * 1.08, 32, 32);
      const atmoMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.2,
        side: THREE.BackSide,
      });
      group.add(new THREE.Mesh(atmoGeom, atmoMat));

      return group;
    } else if (body.textureType === 'mars') {
      planetMat = new THREE.MeshStandardMaterial({
        map: getMarsTexture(),
        roughness: 0.85,
        metalness: 0.05,
      });
    } else if (body.textureType === 'jupiter') {
      planetMat = new THREE.MeshStandardMaterial({
        map: getJupiterTexture(),
        roughness: 0.6,
        metalness: 0.05,
      });
    } else if (body.textureType === 'saturn') {
      planetMat = new THREE.MeshStandardMaterial({
        map: getSaturnTexture(),
        roughness: 0.6,
        metalness: 0.05,
      });
    } else if (body.textureType === 'lava') {
      planetMat = new THREE.MeshStandardMaterial({
        map: getLavaTexture(),
        roughness: 0.8,
        metalness: 0.1,
        emissive: new THREE.Color('#ea580c'),
        emissiveIntensity: 0.35,
      });
    } else if (body.textureType === 'gold') {
      planetMat = new THREE.MeshStandardMaterial({
        map: getGoldTexture(),
        roughness: 0.25,
        metalness: 0.9,
      });
    } else if (body.textureType === 'moon' || body.textureType === 'rock') {
      planetMat = new THREE.MeshStandardMaterial({
        map: getMoonTexture(),
        roughness: 0.9,
        metalness: 0.1,
      });
    } else if (body.textureType === 'ice') {
      planetMat = new THREE.MeshStandardMaterial({
        map: getNeptuneTexture(),
        roughness: 0.3,
        metalness: 0.1,
      });
    } else {
      planetMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(body.color),
        roughness: 0.7,
      });
    }

    const bodyMesh = new THREE.Mesh(sphereGeom, planetMat);
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    group.add(bodyMesh);

    // Differentiated Planetary Rings (Saturn, Uranus, and Alien Gas Giants)
    if (body.hasRings) {
      const isUranus = body.id.toLowerCase().includes('uranus') || body.name.toLowerCase().includes('uranus');
      const isSaturn = body.id.toLowerCase().includes('saturn') || body.name.toLowerCase().includes('saturn');

      let ringTexture: THREE.CanvasTexture;
      let innerR = body.radius * 1.45;
      let outerR = body.radius * 2.8;
      let tilt = Math.PI / 2.3;

      if (isUranus) {
        // Uranus: steep ~98 deg axial tilt, narrow dark cryogenic ice rings
        ringTexture = getUranusRingsTexture();
        innerR = body.radius * 1.6;
        outerR = body.radius * 2.45;
        tilt = Math.PI / 1.05;
      } else if (isSaturn) {
        // Saturn: classic broad multi-ring system with Cassini division
        ringTexture = getSaturnRingsTexture();
        innerR = body.radius * 1.4;
        outerR = body.radius * 2.9;
        tilt = Math.PI / 2.35;
      } else {
        // Exoplanets / Gas Giants: rich custom-tinted gossamer particulate rings
        ringTexture = getGasGiantRingsTexture(body.color);
        innerR = body.radius * 1.5;
        outerR = body.radius * 3.2;
        tilt = Math.PI / 2.2 + (Math.random() - 0.5) * 0.2;
      }

      const ringGeom = new THREE.RingGeometry(innerR, outerR, 64);
      ringGeom.rotateX(tilt);
      const ringMat = new THREE.MeshStandardMaterial({
        map: ringTexture,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9,
      });
      const ringMesh = new THREE.Mesh(ringGeom, ringMat);
      ringMesh.receiveShadow = true;
      group.add(ringMesh);

      // Add a set of 12 physical 3D mini-moonlets / debris rocks within the ring plane
      const ringRockGroup = new THREE.Group();
      ringRockGroup.rotation.x = tilt;
      ringRockGroup.name = 'ring_rocks';
      for (let r = 0; r < 14; r++) {
        const dist = innerR + Math.random() * (outerR - innerR);
        const theta = Math.random() * Math.PI * 2;
        const rockGeom = new THREE.IcosahedronGeometry(body.radius * 0.045 * (0.8 + Math.random()), 0);
        const rockMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(body.color).lerp(new THREE.Color('#94a3b8'), 0.5),
          roughness: 0.9,
        });
        const rockMesh = new THREE.Mesh(rockGeom, rockMat);
        rockMesh.position.set(Math.cos(theta) * dist, Math.sin(theta) * dist, (Math.random() - 0.5) * 0.3);
        ringRockGroup.add(rockMesh);
      }
      group.add(ringRockGroup);
    }

    // Atmosphere glow if enabled
    if (body.hasAtmosphere && body.atmosphereColor) {
      const atmoGeom = new THREE.SphereGeometry(body.radius * 1.06, 32, 32);
      const atmoMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(body.atmosphereColor),
        transparent: true,
        opacity: 0.22,
        side: THREE.BackSide,
      });
      group.add(new THREE.Mesh(atmoGeom, atmoMat));
    }

    return group;
  }

  /**
   * Launch a new asteroid with spec, origin, and velocity
   */
  public launchAsteroid(
    spec: AsteroidSpec,
    position: { x: number; y: number; z: number },
    velocity: { x: number; y: number; z: number }
  ): ActiveAsteroid {
    // Asteroid 3D Mesh
    const meshGroup = new THREE.Group();

    // Procedural irregular deformed asteroid geometry
    const baseGeom = new THREE.IcosahedronGeometry(spec.radius, 2);
    const posAttr = baseGeom.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const y = posAttr.getY(i);
      const z = posAttr.getZ(i);
      // Pseudo-noise crater displacement
      const noise = 1.0 + Math.sin(x * 3.5) * Math.cos(y * 3.5) * Math.sin(z * 3.5) * 0.22;
      posAttr.setXYZ(i, x * noise, y * noise, z * noise);
    }
    baseGeom.computeVertexNormals();

    const asteroidMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(spec.color),
      roughness: spec.composition === 'iron' ? 0.35 : 0.85,
      metalness: spec.composition === 'iron' ? 0.8 : 0.1,
      bumpMap: getAsteroidBumpTexture(),
      bumpScale: 0.25,
    });

    const coreMesh = new THREE.Mesh(baseGeom, asteroidMat);
    coreMesh.castShadow = true;
    meshGroup.add(coreMesh);

    // Singularity glow, Colony ship, Antimatter, or Dark Matter effects
    if (spec.composition === 'singularity') {
      const singHalo = new THREE.Mesh(
        new THREE.SphereGeometry(spec.radius * 1.5, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0xa855f7, transparent: true, opacity: 0.5, wireframe: true })
      );
      meshGroup.add(singHalo);
    } else if (spec.composition === 'colony_ship') {
      // Cylindrical hull + habitat ring + cyan thruster
      const hullGeom = new THREE.CylinderGeometry(spec.radius * 0.35, spec.radius * 0.35, spec.radius * 2.4, 16);
      const hullMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.8, roughness: 0.2 });
      const hull = new THREE.Mesh(hullGeom, hullMat);
      hull.rotation.x = Math.PI / 2;
      meshGroup.add(hull);

      const habRing = new THREE.Mesh(
        new THREE.TorusGeometry(spec.radius * 1.1, spec.radius * 0.15, 8, 24),
        hullMat
      );
      meshGroup.add(habRing);

      const thrusterGeom = new THREE.ConeGeometry(spec.radius * 0.45, spec.radius * 1.2, 16);
      const thrusterMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.8 });
      const thruster = new THREE.Mesh(thrusterGeom, thrusterMat);
      thruster.position.z = -spec.radius * 1.6;
      thruster.rotation.x = -Math.PI / 2;
      meshGroup.add(thruster);
    } else if (spec.composition === 'antimatter') {
      const antiShell = new THREE.Mesh(
        new THREE.SphereGeometry(spec.radius * 1.6, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0xf43f5e, wireframe: true, transparent: true, opacity: 0.6 })
      );
      meshGroup.add(antiShell);
    } else if (spec.composition === 'dark_matter') {
      const darkHalo = new THREE.Mesh(
        new THREE.SphereGeometry(spec.radius * 1.8, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0x475569, transparent: true, opacity: 0.4, wireframe: true })
      );
      meshGroup.add(darkHalo);
    }

    meshGroup.position.set(position.x, position.y, position.z);
    this.scene.add(meshGroup);

    // Comet Particle Tail
    let tailParticles: THREE.Points | undefined;
    let tailPositions: Float32Array | undefined;
    if (spec.composition === 'ice_comet') {
      const count = 120;
      tailPositions = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        tailPositions[i * 3] = position.x;
        tailPositions[i * 3 + 1] = position.y;
        tailPositions[i * 3 + 2] = position.z;
      }
      const pGeom = new THREE.BufferGeometry();
      pGeom.setAttribute('position', new THREE.BufferAttribute(tailPositions, 3));
      const pMat = new THREE.PointsMaterial({
        color: 0x7dd3fc,
        size: 2.5,
        transparent: true,
        opacity: 0.65,
      });
      tailParticles = new THREE.Points(pGeom, pMat);
      this.scene.add(tailParticles);
    }

    const initSpeed = Math.hypot(velocity.x, velocity.y, velocity.z);
    const asteroid: ActiveAsteroid = {
      spec,
      position: { ...position },
      velocity: { ...velocity },
      initialSpeed: initSpeed,
      mesh: meshGroup,
      tailParticles,
      tailPositions,
      alive: true,
      maxSpeedAchieved: initSpeed,
      flightTime: 0,
      closestDist: Infinity,
      closestBodyName: '',
    };

    this.activeAsteroids.push(asteroid);

    // If swarm cluster, spawn 5 satellite fragments with slight velocity spread
    if (spec.composition === 'swarm_cluster') {
      for (let s = 0; s < 5; s++) {
        const offsetVel = {
          x: velocity.x + (Math.random() - 0.5) * 1.5,
          y: velocity.y + (Math.random() - 0.5) * 0.8,
          z: velocity.z + (Math.random() - 0.5) * 1.5,
        };
        const offsetPos = {
          x: position.x + (Math.random() - 0.5) * 8,
          y: position.y + (Math.random() - 0.5) * 4,
          z: position.z + (Math.random() - 0.5) * 8,
        };
        const subGeom = new THREE.IcosahedronGeometry(spec.radius * 0.45, 1);
        const subMat = new THREE.MeshStandardMaterial({ color: 0x84cc16, roughness: 0.85 });
        const subMeshGroup = new THREE.Group();
        subMeshGroup.add(new THREE.Mesh(subGeom, subMat));
        subMeshGroup.position.set(offsetPos.x, offsetPos.y, offsetPos.z);
        this.scene.add(subMeshGroup);

        this.activeAsteroids.push({
          spec: { ...spec, radius: spec.radius * 0.45, mass: spec.mass * 0.15 },
          position: offsetPos,
          velocity: offsetVel,
          initialSpeed: Math.hypot(offsetVel.x, offsetVel.y, offsetVel.z),
          mesh: subMeshGroup,
          alive: true,
          maxSpeedAchieved: Math.hypot(offsetVel.x, offsetVel.y, offsetVel.z),
          flightTime: 0,
          closestDist: Infinity,
          closestBodyName: '',
        });
      }
    }

    // Sound
    sound.playLaunch(initSpeed / 10);

    return asteroid;
  }

  public clearAllAsteroids() {
    this.activeAsteroids.forEach((ast) => {
      this.scene.remove(ast.mesh);
      if (ast.tailParticles) this.scene.remove(ast.tailParticles);
    });
    this.activeAsteroids = [];
  }

  /**
   * Sets current aiming parameters and updates the projected trajectory line
   */
  public updateAimTrajectory(
    startPos: { x: number; y: number; z: number },
    velocity: { x: number; y: number; z: number },
    spec: AsteroidSpec
  ): TrajectoryPrediction {
    const prediction = predictAsteroidTrajectory(startPos, velocity, spec, this.bodies, 900, 0.08);

    if (this.trajectoryGeom && this.config.showTrajectory) {
      const posAttr = this.trajectoryGeom.attributes.position as THREE.BufferAttribute;
      const pts = prediction.points;
      const count = Math.min(pts.length, posAttr.count);

      for (let i = 0; i < count; i++) {
        posAttr.setXYZ(i, pts[i].x, pts[i].y, pts[i].z);
      }
      posAttr.needsUpdate = true;
      this.trajectoryGeom.setDrawRange(0, count);

      if (this.trajectoryLine) {
        this.trajectoryLine.computeLineDistances();
        this.trajectoryLine.visible = true;
      }
    }

    // Impact marker
    if (this.impactMarkerMesh) {
      if (prediction.willCollide && prediction.points.length > 0) {
        const lastPt = prediction.points[prediction.points.length - 1];
        this.impactMarkerMesh.position.set(lastPt.x, lastPt.y, lastPt.z);
        this.impactMarkerMesh.visible = true;
      } else {
        this.impactMarkerMesh.visible = false;
      }
    }

    return prediction;
  }

  public hideTrajectory() {
    if (this.trajectoryLine) this.trajectoryLine.visible = false;
    if (this.impactMarkerMesh) this.impactMarkerMesh.visible = false;
  }

  /**
   * Activates cinematic slow-motion upon planetary collision
   */
  public triggerImpactSlowMo(duration: number = 2.4, slowFactor: number = 0.08) {
    this.slowMoRemaining = duration;
    this.baseTimeScale = this.config.timeScale > 0.15 ? this.config.timeScale : 1.0;
    this.config.timeScale = slowFactor;
  }

  public setImpactSlowMoEnabled(enabled: boolean) {
    this.impactSlowMoEnabled = enabled;
  }

  public getImpactSlowMoEnabled(): boolean {
    return this.impactSlowMoEnabled;
  }

  /**
   * Catastrophic Total Planetary / Stellar Destruction Animation
   * Triggered when impact kinetic energy exceeds gravitational binding energy
   * or when hit by Antimatter / Primordial Singularity.
   */
  /**
   * Catastrophic Total Planetary / Stellar Destruction Animation
   * Triggered when impact kinetic energy exceeds gravitational binding energy
   * or when hit by Tungsten Planet-Buster, Singularity, Antimatter, or Dark Matter.
   */
  public triggerBodyCataclysm(
    targetBody: CelestialBody,
    impactPos: { x: number; y: number; z: number },
    impactVel: { x: number; y: number; z: number },
    energyMegatons: number
  ): boolean {
    sound.playImpact(energyMegatons * 2);
    sound.playTidalDisruption();
    this.screenShake = 42.0; // Maximum screen trauma
    this.triggerImpactSlowMo(3.8, 0.04); // Deep slow-mo hitstop

    const bodyGroup = this.bodyMeshMap.get(targetBody.id);

    // 1. Planetary Total Disruption (Planet or Moon Shattered into Debris)
    if (targetBody.type === 'planet' || targetBody.type === 'moon') {
      // Remove planet mesh from 3D scene
      if (bodyGroup) {
        this.scene.remove(bodyGroup);
        this.bodyMeshMap.delete(targetBody.id);
      }

      // Remove from orbit trails
      const line = this.orbitLineMap.get(targetBody.id);
      if (line) {
        this.scene.remove(line);
        this.orbitLineMap.delete(targetBody.id);
      }
      this.bodyTrails.delete(targetBody.id);

      // Spawn 50 physical 3D burning shattered core & crust fragments
      const fragCount = 50;
      for (let i = 0; i < fragCount; i++) {
        const fragRadius = targetBody.radius * (0.12 + Math.random() * 0.18);
        const fragGeom = new THREE.IcosahedronGeometry(fragRadius, 1);
        const fragMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(targetBody.color).lerp(new THREE.Color('#ea580c'), 0.6),
          roughness: 0.8,
          emissive: new THREE.Color('#f97316'),
          emissiveIntensity: 0.5,
          bumpMap: getAsteroidBumpTexture(),
        });

        const fragMesh = new THREE.Mesh(fragGeom, fragMat);
        fragMesh.position.set(
          targetBody.position.x + (Math.random() - 0.5) * targetBody.radius * 0.8,
          targetBody.position.y + (Math.random() - 0.5) * targetBody.radius * 0.8,
          targetBody.position.z + (Math.random() - 0.5) * targetBody.radius * 0.8
        );
        this.scene.add(fragMesh);

        // Explosive isotropic velocity dispersion
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(Math.random() * 2 - 1);
        const speed = 10.0 + Math.random() * 28.0;

        const vel = new THREE.Vector3(
          speed * Math.sin(phi) * Math.cos(theta) + targetBody.velocity.x * 0.5,
          speed * Math.sin(phi) * Math.sin(theta) + targetBody.velocity.y * 0.5,
          speed * Math.cos(phi) + targetBody.velocity.z * 0.5
        );

        this.ejectedChunks.push({
          mesh: fragMesh,
          velocity: vel,
          rotationAxis: new THREE.Vector3(Math.random(), Math.random(), Math.random()).normalize(),
          rotationSpeed: 0.1 + Math.random() * 0.2,
          life: 0,
          maxLife: 12.0 + Math.random() * 6.0,
        });
      }

      // Expanding fiery planetary plasma fireball shockwave shell
      const fireballGeom = new THREE.SphereGeometry(targetBody.radius * 1.2, 32, 32);
      const fireballMat = new THREE.MeshBasicMaterial({
        color: 0xf97316,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
      });
      const fireballMesh = new THREE.Mesh(fireballGeom, fireballMat);
      fireballMesh.position.set(targetBody.position.x, targetBody.position.y, targetBody.position.z);
      this.scene.add(fireballMesh);

      // Add to animated shockwaves
      const tempGroup = new THREE.Group();
      this.scene.add(tempGroup);
      tempGroup.position.copy(fireballMesh.position);
      fireballMesh.position.set(0, 0, 0);
      tempGroup.add(fireballMesh);

      this.surfaceShockwaves.push({
        mesh: fireballMesh,
        bodyGroup: tempGroup,
        progress: 0,
        duration: 3.5,
      });

      // Permanent Shattered Collisional Debris Ring at the former planet locus
      const debrisRingGeom = new THREE.RingGeometry(targetBody.radius * 1.5, targetBody.radius * 4.2, 64);
      debrisRingGeom.rotateX(Math.PI / 2 + (Math.random() - 0.5) * 0.3);
      const debrisRingMat = new THREE.MeshStandardMaterial({
        map: getCollisionalDebrisRingTexture(targetBody.color),
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
        color: new THREE.Color(targetBody.color).lerp(new THREE.Color('#d6d3d1'), 0.2),
      });
      const debrisRingMesh = new THREE.Mesh(debrisRingGeom, debrisRingMat);
      debrisRingMesh.position.set(targetBody.position.x, targetBody.position.y, targetBody.position.z);
      this.scene.add(debrisRingMesh);

      // Spawn orbiting asteroid fragments born from the shattered world
      for (let a = 0; a < 14; a++) {
        const angle = (a / 14) * Math.PI * 2 + (Math.random() - 0.5) * 0.2;
        const r = targetBody.radius * (1.8 + Math.random() * 2.5);
        this.launchAsteroid(
          ASTEROID_SPECS.silicate,
          {
            x: targetBody.position.x + Math.cos(angle) * r,
            y: targetBody.position.y + (Math.random() - 0.5) * 4,
            z: targetBody.position.z + Math.sin(angle) * r,
          },
          {
            x: targetBody.velocity.x + (Math.random() - 0.5) * 4,
            y: (Math.random() - 0.5) * 2,
            z: targetBody.velocity.z + (Math.random() - 0.5) * 4,
          }
        );
      }

      // Remove body from simulation physics array
      const idx = this.bodies.findIndex((b) => b.id === targetBody.id);
      if (idx !== -1) {
        this.bodies.splice(idx, 1);
      }

      if (this.followTargetId === targetBody.id) {
        this.followTargetId = null;
      }

      return true;
    }

    // 2. Stellar Supernova / Hypernova Total Disruption (STAR IS COMPLETELY DESTROYED!)
    if (targetBody.type === 'star' || targetBody.type === 'pulsar') {
      sound.playSolarBurn();
      sound.playImpact(energyMegatons * 4);

      // Blinding incandescent thermonuclear core flash
      const novaGeom = new THREE.SphereGeometry(targetBody.radius * 1.5, 32, 32);
      const novaMat = new THREE.MeshBasicMaterial({
        color: 0x67e8f9,
        transparent: true,
        opacity: 0.98,
        blending: THREE.AdditiveBlending,
      });
      const novaMesh = new THREE.Mesh(novaGeom, novaMat);
      novaMesh.position.set(targetBody.position.x, targetBody.position.y, targetBody.position.z);

      const novaHolder = new THREE.Group();
      this.scene.add(novaHolder);
      novaHolder.position.copy(novaMesh.position);
      novaMesh.position.set(0, 0, 0);
      novaHolder.add(novaMesh);

      this.surfaceShockwaves.push({
        mesh: novaMesh,
        bodyGroup: novaHolder,
        progress: 0,
        duration: 4.5,
      });

      // Relativistic Supernova Shockwave Planar Ring slicing across the system
      const blastRingGeom = new THREE.RingGeometry(targetBody.radius * 1.2, targetBody.radius * 3.5, 64);
      blastRingGeom.rotateX(Math.PI / 2);
      const blastRingMat = new THREE.MeshBasicMaterial({
        color: 0xfef08a,
        transparent: true,
        opacity: 0.95,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const blastRingMesh = new THREE.Mesh(blastRingGeom, blastRingMat);
      novaHolder.add(blastRingMesh);

      // 55+ incandescent solar plasma ejecta fireballs & prominence filament arcs bursting outward
      const starFragCount = 55;
      for (let i = 0; i < starFragCount; i++) {
        const fragRadius = targetBody.radius * (0.12 + Math.random() * 0.22);
        const fragGeom = new THREE.IcosahedronGeometry(fragRadius, 1);
        const fragMat = new THREE.MeshBasicMaterial({
          color: Math.random() > 0.4 ? 0xfef08a : 0xf97316,
        });

        const fragMesh = new THREE.Mesh(fragGeom, fragMat);
        fragMesh.position.set(
          targetBody.position.x + (Math.random() - 0.5) * targetBody.radius * 0.6,
          targetBody.position.y + (Math.random() - 0.5) * targetBody.radius * 0.6,
          targetBody.position.z + (Math.random() - 0.5) * targetBody.radius * 0.6
        );
        this.scene.add(fragMesh);

        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(Math.random() * 2 - 1);
        const speed = 16.0 + Math.random() * 32.0;

        const vel = new THREE.Vector3(
          speed * Math.sin(phi) * Math.cos(theta),
          speed * Math.sin(phi) * Math.sin(theta),
          speed * Math.cos(phi)
        );

        this.ejectedChunks.push({
          mesh: fragMesh,
          velocity: vel,
          rotationAxis: new THREE.Vector3(Math.random(), Math.random(), Math.random()).normalize(),
          rotationSpeed: 0.15 + Math.random() * 0.3,
          life: 0,
          maxLife: 14.0 + Math.random() * 6.0,
        });
      }

      // Circumstellar Debris Ring left at the star's former locus (NOT a Saturn ring!)
      const remRingGeom = new THREE.RingGeometry(targetBody.radius * 1.8, targetBody.radius * 5.5, 64);
      remRingGeom.rotateX(Math.PI / 2);
      const remRingMat = new THREE.MeshBasicMaterial({
        map: getStellarCircumstellarDebrisTexture(targetBody.color),
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.88,
        depthWrite: false,
      });
      const remRingMesh = new THREE.Mesh(remRingGeom, remRingMat);
      remRingMesh.position.set(targetBody.position.x, targetBody.position.y, targetBody.position.z);
      this.scene.add(remRingMesh);

      // Remove star mesh and trails: STAR IS FULLY DESTROYED!
      if (bodyGroup) {
        this.scene.remove(bodyGroup);
        this.bodyMeshMap.delete(targetBody.id);
      }
      const line = this.orbitLineMap.get(targetBody.id);
      if (line) {
        this.scene.remove(line);
        this.orbitLineMap.delete(targetBody.id);
      }
      this.bodyTrails.delete(targetBody.id);

      // Remove star from physics simulation: with primary mass gone, planets fly off tangentially!
      const idx = this.bodies.findIndex((b) => b.id === targetBody.id);
      if (idx !== -1) {
        this.bodies.splice(idx, 1);
      }

      if (this.followTargetId === targetBody.id) {
        this.followTargetId = null;
      }

      return true;
    }

    return false;
  }

  /**
   * Triggers realistic physical planetary consequences
   */
  public triggerImpactConsequences(
    targetBody: CelestialBody,
    impactPos: { x: number; y: number; z: number },
    impactVel: { x: number; y: number; z: number },
    astSpec: AsteroidSpec,
    energyMegatons: number
  ): boolean {
    // Check Catastrophic Disruption Threshold:
    // A celestial body is gravitationally disrupted and annihilated if the impact energy
    // equals or exceeds its authentic gravitational binding energy (U_g = 3/5 * G * M^2 / R)
    const bindingData = getGravitationalBindingEnergy(targetBody);
    const isTotalCataclysm = energyMegatons >= bindingData.megatons;

    if (isTotalCataclysm) {
      return this.triggerBodyCataclysm(targetBody, impactPos, impactVel, energyMegatons);
    }

    // Non-Catastrophic Realistic Collision:
    sound.playImpact(energyMegatons);
    this.screenShake = Math.min(22.0, 4.0 + Math.log10(Math.max(1, energyMegatons)) * 3.5);

    if (this.impactSlowMoEnabled) {
      this.triggerImpactSlowMo(2.5, 0.08);
    }

    // Planetary Momentum Recoil
    const planetRealMass = targetBody.mass * 1e24;
    const realMassKg = astSpec.mass * 1e14;
    const recoilFactor = realMassKg / (planetRealMass + realMassKg);
    targetBody.velocity.x += impactVel.x * recoilFactor * 800;
    targetBody.velocity.y += impactVel.y * recoilFactor * 800;
    targetBody.velocity.z += impactVel.z * recoilFactor * 800;

    const bodyGroup = this.bodyMeshMap.get(targetBody.id);

    // Eject 3D physical crust chunks
    const chunkCount = Math.min(24, 8 + Math.floor(Math.log10(Math.max(1, energyMegatons)) * 3.5));
    for (let c = 0; c < chunkCount; c++) {
      const chunkRadius = targetBody.radius * (0.07 + Math.random() * 0.12);
      const chunkGeom = new THREE.IcosahedronGeometry(chunkRadius, 1);
      const chunkMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(targetBody.color).lerp(new THREE.Color('#475569'), 0.5),
        roughness: 0.9,
        bumpMap: getAsteroidBumpTexture(),
        bumpScale: 0.3,
      });
      const chunkMesh = new THREE.Mesh(chunkGeom, chunkMat);
      chunkMesh.castShadow = true;

      chunkMesh.position.set(
        impactPos.x + (Math.random() - 0.5) * targetBody.radius * 0.4,
        impactPos.y + (Math.random() - 0.5) * targetBody.radius * 0.4,
        impactPos.z + (Math.random() - 0.5) * targetBody.radius * 0.4
      );
      this.scene.add(chunkMesh);

      const outward = new THREE.Vector3(
        impactPos.x - targetBody.position.x,
        impactPos.y - targetBody.position.y,
        impactPos.z - targetBody.position.z
      ).normalize();

      const blastSpeed = 4.0 + Math.random() * 14.0;
      const vel = new THREE.Vector3(
        outward.x * blastSpeed + (Math.random() - 0.5) * 8 + targetBody.velocity.x,
        outward.y * blastSpeed + (Math.random() - 0.5) * 6 + targetBody.velocity.y,
        outward.z * blastSpeed + (Math.random() - 0.5) * 8 + targetBody.velocity.z
      );

      this.ejectedChunks.push({
        mesh: chunkMesh,
        velocity: vel,
        rotationAxis: new THREE.Vector3(Math.random(), Math.random(), Math.random()).normalize(),
        rotationSpeed: 0.05 + Math.random() * 0.15,
        life: 0,
        maxLife: 6.0 + Math.random() * 4.0,
      });
    }

    // Stellar Collision: Coronal Mass Ejection (CME) and Circumstellar Solar Debris Ring
    if (isStar || targetBody.type === 'pulsar') {
      sound.playSolarBurn();

      if (bodyGroup) {
        // Solar prominence arc / loop
        const loopGeom = new THREE.TorusGeometry(targetBody.radius * 0.4, targetBody.radius * 0.08, 8, 24, Math.PI);
        const loopMat = new THREE.MeshBasicMaterial({
          color: 0xfef08a,
          transparent: true,
          opacity: 0.9,
          side: THREE.DoubleSide,
        });
        const loopMesh = new THREE.Mesh(loopGeom, loopMat);
        const localPos = bodyGroup.worldToLocal(new THREE.Vector3(impactPos.x, impactPos.y, impactPos.z));
        localPos.normalize().multiplyScalar(targetBody.radius * 1.02);
        loopMesh.position.copy(localPos);
        loopMesh.lookAt(localPos.clone().multiplyScalar(2));
        bodyGroup.add(loopMesh);

        setTimeout(() => {
          bodyGroup.remove(loopMesh);
          loopGeom.dispose();
          loopMat.dispose();
        }, 4000);

        // Circumstellar Solar Debris Ring on energetic impact (NOT a Saturn ring!)
        if (energyMegatons > 120 && !bodyGroup.getObjectByName('circumstellar_debris_ring')) {
          sound.playTidalDisruption();
          const innerR = targetBody.radius * 1.8;
          const outerR = targetBody.radius * 4.2;
          const cRingGeom = new THREE.RingGeometry(innerR, outerR, 64);
          cRingGeom.rotateX(Math.PI / 2);
          const cRingMat = new THREE.MeshBasicMaterial({
            map: getStellarCircumstellarDebrisTexture(targetBody.color),
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.0,
            depthWrite: false,
          });
          const cRingMesh = new THREE.Mesh(cRingGeom, cRingMat);
          cRingMesh.name = 'circumstellar_debris_ring';
          cRingMesh.scale.set(0.15, 0.15, 0.15);
          bodyGroup.add(cRingMesh);
          this.formedRings.push({
            bodyId: targetBody.id,
            mesh: cRingMesh,
            expansionProgress: 0,
            targetScale: 1.0,
          });
        }
      }
    } else {
      // Planet or Moon Collision:
      // Permanent scorched molten crater scar
      if (bodyGroup) {
        const craterRadius = Math.max(0.6, Math.min(targetBody.radius * 0.45, Math.pow(energyMegatons, 0.22) * 0.6));
        const craterGeom = new THREE.RingGeometry(craterRadius * 0.2, craterRadius, 24);
        const craterMat = new THREE.MeshBasicMaterial({
          color: 0xf97316,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
        const craterMesh = new THREE.Mesh(craterGeom, craterMat);
        const localPos = bodyGroup.worldToLocal(new THREE.Vector3(impactPos.x, impactPos.y, impactPos.z));
        localPos.normalize().multiplyScalar(targetBody.radius * 1.01);
        craterMesh.position.copy(localPos);
        craterMesh.lookAt(localPos.clone().multiplyScalar(2));
        bodyGroup.add(craterMesh);
      }

      // Bespoke Collisional Debris Ring (Custom to planet crust color - NOT Saturn's ring!)
      if (energyMegatons > 20) {
        sound.playTidalDisruption();

        const innerR = targetBody.radius * 1.5;
        const outerR = targetBody.radius * 3.3;
        const ringGeom = new THREE.RingGeometry(innerR, outerR, 64);
        ringGeom.rotateX(Math.PI / 2 + (Math.random() - 0.5) * 0.35);

        // Uses custom procedural collisional debris texture
        const ringMat = new THREE.MeshStandardMaterial({
          map: getCollisionalDebrisRingTexture(targetBody.color),
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.0,
          color: new THREE.Color(targetBody.color).lerp(new THREE.Color('#d6d3d1'), 0.2),
        });

        const ringMesh = new THREE.Mesh(ringGeom, ringMat);
        ringMesh.scale.set(0.15, 0.15, 0.15); // starts tight and expands outwards!
        if (bodyGroup) {
          bodyGroup.add(ringMesh);
          this.formedRings.push({
            bodyId: targetBody.id,
            mesh: ringMesh,
            expansionProgress: 0,
            targetScale: 1.0,
          });

          // Spawn a swarm of 16 orbiting physical 3D debris rock meshes in the ring
          const debrisRocks = new THREE.Group();
          debrisRocks.name = 'collisional_ring_rocks';
          debrisRocks.rotation.x = Math.PI / 2;
          for (let r = 0; r < 16; r++) {
            const dist = innerR + Math.random() * (outerR - innerR);
            const theta = Math.random() * Math.PI * 2;
            const rockGeom = new THREE.IcosahedronGeometry(targetBody.radius * 0.05 * (0.8 + Math.random()), 0);
            const rockMat = new THREE.MeshStandardMaterial({
              color: new THREE.Color(targetBody.color).lerp(new THREE.Color('#ea580c'), 0.4),
              roughness: 0.9,
            });
            const rockMesh = new THREE.Mesh(rockGeom, rockMat);
            rockMesh.position.set(Math.cos(theta) * dist, Math.sin(theta) * dist, (Math.random() - 0.5) * 0.3);
            debrisRocks.add(rockMesh);
          }
          bodyGroup.add(debrisRocks);
        }
      }

      // Surface Seismic Shockwave Ring
      if (bodyGroup) {
        const shockGeom = new THREE.RingGeometry(targetBody.radius * 0.1, targetBody.radius * 0.3, 32);
        const shockMat = new THREE.MeshBasicMaterial({
          color: 0xfef08a,
          transparent: true,
          opacity: 0.9,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
        const shockMesh = new THREE.Mesh(shockGeom, shockMat);
        const localPos = bodyGroup.worldToLocal(new THREE.Vector3(impactPos.x, impactPos.y, impactPos.z));
        localPos.normalize().multiplyScalar(targetBody.radius * 1.02);
        shockMesh.position.copy(localPos);
        shockMesh.lookAt(localPos.clone().multiplyScalar(2));
        bodyGroup.add(shockMesh);

        this.surfaceShockwaves.push({
          mesh: shockMesh,
          bodyGroup,
          progress: 0,
          duration: 2.5,
        });
      }
    }

    // Ejecta particle burst
    this.triggerImpactExplosion(impactPos, energyMegatons, targetBody.color);
    return false;
  }

  /**
   * Triggers particle ejecta bursts
   */
  public triggerImpactExplosion(
    pos: { x: number; y: number; z: number },
    energyMegatons: number,
    colorHex: string = '#f97316'
  ) {
    const count = 180;
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = pos.x;
      positions[i * 3 + 1] = pos.y;
      positions[i * 3 + 2] = pos.z;

      // Ejecta cone
      const speed = 2 + Math.random() * 12;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;

      velocities[i * 3] = speed * Math.sin(phi) * Math.cos(theta);
      velocities[i * 3 + 1] = speed * Math.cos(phi) * 0.8 + 2;
      velocities[i * 3 + 2] = speed * Math.sin(phi) * Math.sin(theta);
    }

    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color: new THREE.Color(colorHex),
      size: 3.5,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
    });

    const pMesh = new THREE.Points(geom, mat);
    this.scene.add(pMesh);

    this.explosionParticles.push({
      points: pMesh,
      velocities,
      life: 0,
      maxLife: 2.2,
    });
  }

  /**
   * Main animation loop
   */
  private startLoop() {
    const loop = (time: number) => {
      this.animFrameId = requestAnimationFrame(loop);
      if (this.isDisposed) return;

      const rawDt = (time - this.lastTime) * 0.001;
      this.lastTime = time;
      const dt = Math.min(rawDt, 0.05); // clamped dt for 60fps simulation stability

      this.update(dt);
      this.renderer.render(this.scene, this.camera);
    };

    this.animFrameId = requestAnimationFrame(loop);
  }

  private update(rawDt: number) {
    const simDt = rawDt * this.config.timeScale;

    // Update Controls
    this.controls.update();

    if (simDt > 0) {
      this.simTime += simDt;

      // 1. Step N-body Celestial Bodies
      stepNBodySystem(this.bodies, simDt);

      // 2. Update mesh positions and orbit trails
      for (let i = 0; i < this.bodies.length; i++) {
        const body = this.bodies[i];
        const mesh = this.bodyMeshMap.get(body.id);
        if (mesh) {
          mesh.position.set(body.position.x, body.position.y, body.position.z);
          // Rotation
          mesh.rotation.y += (body.rotationSpeed || 0.005) * (this.config.timeScale > 0 ? 1 : 0);

          // Rotate clouds if present
          const clouds = mesh.getObjectByName('clouds');
          if (clouds) {
            clouds.rotation.y += 0.003;
          }

          // Rotate accretion disk
          const accretion = mesh.getObjectByName('accretion_disk');
          if (accretion) {
            accretion.rotation.z += 0.015;
          }
        }

        // Update orbit trail
        if (this.config.showOrbits && this.simTime % 0.15 < simDt) {
          const trail = this.bodyTrails.get(body.id);
          const line = this.orbitLineMap.get(body.id);
          if (trail && line) {
            trail.push(new THREE.Vector3(body.position.x, body.position.y, body.position.z));
            if (trail.length > 180) trail.shift();

            const posAttr = line.geometry.attributes.position as THREE.BufferAttribute;
            for (let t = 0; t < trail.length; t++) {
              posAttr.setXYZ(t, trail[t].x, trail[t].y, trail[t].z);
            }
            posAttr.needsUpdate = true;
            line.geometry.setDrawRange(0, trail.length);
          }
        }
      }

      // 3. Step active Asteroids
      for (let a = this.activeAsteroids.length - 1; a >= 0; a--) {
        const ast = this.activeAsteroids[a];
        if (!ast.alive) continue;

        ast.flightTime += simDt;
        stepAsteroid(ast.position, ast.velocity, this.bodies, simDt);
        ast.mesh.position.set(ast.position.x, ast.position.y, ast.position.z);
        ast.mesh.rotation.x += 0.02;
        ast.mesh.rotation.y += 0.03;

        const currentSpeed = Math.hypot(ast.velocity.x, ast.velocity.y, ast.velocity.z);
        if (currentSpeed > ast.maxSpeedAchieved) {
          ast.maxSpeedAchieved = currentSpeed;
        }

        // Update Comet Particle Tail
        if (ast.tailParticles && ast.tailPositions) {
          const count = ast.tailPositions.length / 3;
          // Shift tail positions backward
          for (let i = count - 1; i > 0; i--) {
            ast.tailPositions[i * 3] = ast.tailPositions[(i - 1) * 3];
            ast.tailPositions[i * 3 + 1] = ast.tailPositions[(i - 1) * 3 + 1];
            ast.tailPositions[i * 3 + 2] = ast.tailPositions[(i - 1) * 3 + 2];
          }
          ast.tailPositions[0] = ast.position.x;
          ast.tailPositions[1] = ast.position.y;
          ast.tailPositions[2] = ast.position.z;
          (ast.tailParticles.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
        }

        // Collision & Slingshot detection
        for (let b = 0; b < this.bodies.length; b++) {
          const body = this.bodies[b];
          const dx = ast.position.x - body.position.x;
          const dy = ast.position.y - body.position.y;
          const dz = ast.position.z - body.position.z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

          if (dist < ast.closestDist) {
            ast.closestDist = dist;
            ast.closestBodyName = body.name;

            // Audio bend trigger on close high speed pass
            if (dist < body.radius * 3.5 && currentSpeed > ast.initialSpeed * 1.3) {
              sound.playSlingshotBend(currentSpeed / 10);
            }
          }

          // Collision Check
          if (dist <= body.radius + ast.spec.radius * 0.6) {
            ast.alive = false;
            this.scene.remove(ast.mesh);
            if (ast.tailParticles) this.scene.remove(ast.tailParticles);

            const realMassKg = ast.spec.mass * 1e14;
            const realSpeedMps = currentSpeed * 3000;
            const { joules: energyJoules, megatons: energyMegatons } = computeImpactorEnergy(ast.spec, currentSpeed);
            const bindingData = getGravitationalBindingEnergy(body);
            const ratio = energyMegatons / bindingData.megatons;
            const craterKm = Math.max(0.5, Math.pow(energyMegatons, 0.28) * 1.8);
            const deltaVMps = (realMassKg / (body.mass * 1e24 + realMassKg)) * realSpeedMps;

            const wasDestroyed = this.triggerImpactConsequences(body, ast.position, ast.velocity, ast.spec, energyMegatons);

            const impactEv: ImpactEvent = {
              id: `impact-${Date.now()}`,
              time: this.simTime,
              asteroidName: ast.spec.name,
              targetBodyName: body.name,
              position: { ...body.position },
              velocityMagnitude: currentSpeed,
              energyJoules,
              energyMegatons,
              targetBindingEnergyMT: bindingData.megatons,
              targetBindingEnergyJoules: bindingData.joules,
              energyToBindingRatio: ratio,
              craterDiameterKm: craterKm,
              planetDeflectionDeltaV: deltaVMps,
              bodyDestroyed: wasDestroyed,
              destroyedBodyName: wasDestroyed ? body.name : undefined,
              isStellarNova: wasDestroyed && (body.type === 'star' || body.type === 'pulsar'),
            };

            if (this.onImpactCallback) {
              this.onImpactCallback(impactEv);
            }
            break;
          }
        }

        // Boundary removal if > 2500 units away
        if (Math.hypot(ast.position.x, ast.position.y, ast.position.z) > 2500) {
          ast.alive = false;
          this.scene.remove(ast.mesh);
          if (ast.tailParticles) this.scene.remove(ast.tailParticles);
        }
      }

      // 4. Update Spacetime Curvature Grid (warp mesh downward according to gravity potential)
      if (this.config.showSpacetimeGrid && this.gridGeometry && this.gridOriginalPositions) {
        const posAttr = this.gridGeometry.attributes.position as THREE.BufferAttribute;
        const count = posAttr.count;

        for (let i = 0; i < count; i++) {
          const origX = this.gridOriginalPositions[i * 3];
          const origZ = this.gridOriginalPositions[i * 3 + 2];

          let potential = 0;
          for (let b = 0; b < this.bodies.length; b++) {
            const body = this.bodies[b];
            const dx = origX - body.position.x;
            const dz = origZ - body.position.z;
            const d = Math.sqrt(dx * dx + dz * dz + SOFTENING_EPSILON);
            // Gravitational funnel depth: GM / r
            potential += (G_CONSTANT * body.mass) / Math.max(12, d);
          }

          // Scale depth
          const depth = -Math.min(55, potential * 0.025);
          posAttr.setY(i, depth);
        }
        posAttr.needsUpdate = true;
        this.gridGeometry.computeVertexNormals();
      }

      // 5. Update 3D Physical Ejected Crust Chunks
      for (let i = this.ejectedChunks.length - 1; i >= 0; i--) {
        const chunk = this.ejectedChunks[i];
        chunk.life += rawDt;
        if (chunk.life >= chunk.maxLife) {
          this.scene.remove(chunk.mesh);
          chunk.mesh.geometry.dispose();
          this.ejectedChunks.splice(i, 1);
          continue;
        }

        // Move chunk
        chunk.mesh.position.addScaledVector(chunk.velocity, rawDt * this.config.timeScale);
        chunk.mesh.rotateOnAxis(chunk.rotationAxis, chunk.rotationSpeed);

        // Fade chunk opacity toward end of life
        if (chunk.life > chunk.maxLife * 0.7) {
          const mat = chunk.mesh.material as THREE.MeshStandardMaterial;
          mat.transparent = true;
          mat.opacity = 1.0 - (chunk.life - chunk.maxLife * 0.7) / (chunk.maxLife * 0.3);
        }
      }

      // 6. Update Newly Formed Planetary Debris Rings (expanding outward)
      for (let i = this.formedRings.length - 1; i >= 0; i--) {
        const ring = this.formedRings[i];
        ring.expansionProgress += rawDt * 0.45;
        const currentScale = Math.min(ring.targetScale, ring.expansionProgress);
        ring.mesh.scale.set(currentScale, currentScale, currentScale);

        const ringMat = ring.mesh.material as THREE.MeshStandardMaterial;
        ringMat.opacity = Math.min(0.88, ring.expansionProgress * 1.2);
        ring.mesh.rotation.z += 0.006;

        if (ring.expansionProgress >= 1.0) {
          this.formedRings.splice(i, 1); // persists permanently in bodyGroup
        }
      }

      // 7. Update Surface Seismic Shockwaves
      for (let i = this.surfaceShockwaves.length - 1; i >= 0; i--) {
        const sw = this.surfaceShockwaves[i];
        sw.progress += rawDt * 1.4;
        const currentScale = 1.0 + sw.progress * 3.8;
        sw.mesh.scale.set(currentScale, currentScale, 1.0);

        const mat = sw.mesh.material as THREE.MeshBasicMaterial;
        mat.opacity = Math.max(0, 0.9 - sw.progress * 0.45);

        if (sw.progress >= sw.duration) {
          sw.bodyGroup.remove(sw.mesh);
          sw.mesh.geometry.dispose();
          this.surfaceShockwaves.splice(i, 1);
        }
      }
    }

    // Dynamic Impact Slow-Mo recovery
    if (this.slowMoRemaining > 0) {
      this.slowMoRemaining -= rawDt;
      this.config.timeScale = THREE.MathUtils.damp(this.config.timeScale, this.baseTimeScale, 2.2, rawDt);
      if (this.slowMoRemaining <= 0) {
        this.config.timeScale = this.baseTimeScale;
      }
    }

    // Dynamic Camera Screen Trauma Shake
    if (this.screenShake > 0.05) {
      this.camera.position.x += (Math.random() - 0.5) * this.screenShake;
      this.camera.position.y += (Math.random() - 0.5) * this.screenShake;
      this.camera.position.z += (Math.random() - 0.5) * this.screenShake;
      this.screenShake *= 0.88;
    }

    // 8. Update Explosion Particles
    for (let i = this.explosionParticles.length - 1; i >= 0; i--) {
      const exp = this.explosionParticles[i];
      exp.life += rawDt;
      if (exp.life >= exp.maxLife) {
        this.scene.remove(exp.points);
        this.explosionParticles.splice(i, 1);
        continue;
      }

      const posAttr = exp.points.geometry.attributes.position as THREE.BufferAttribute;
      const count = posAttr.count;
      for (let p = 0; p < count; p++) {
        posAttr.setXYZ(
          p,
          posAttr.getX(p) + exp.velocities[p * 3] * rawDt * 12,
          posAttr.getY(p) + exp.velocities[p * 3 + 1] * rawDt * 12,
          posAttr.getZ(p) + exp.velocities[p * 3 + 2] * rawDt * 12
        );
      }
      posAttr.needsUpdate = true;
      (exp.points.material as THREE.PointsMaterial).opacity = 1.0 - exp.life / exp.maxLife;
    }

    // 9. Camera Follow smoothing with THREE.MathUtils.damp
    if (this.followTargetId) {
      let targetPos: { x: number; y: number; z: number } | null = null;
      if (this.followTargetId === 'asteroid') {
        const lastAlive = this.activeAsteroids.filter((a) => a.alive).pop();
        if (lastAlive) targetPos = lastAlive.position;
      } else {
        const body = this.bodies.find((b) => b.id === this.followTargetId);
        if (body) targetPos = body.position;
      }

      if (targetPos) {
        _vec3A.set(targetPos.x, targetPos.y, targetPos.z);
        this.controls.target.x = THREE.MathUtils.damp(this.controls.target.x, _vec3A.x, 3.5, rawDt);
        this.controls.target.y = THREE.MathUtils.damp(this.controls.target.y, _vec3A.y, 3.5, rawDt);
        this.controls.target.z = THREE.MathUtils.damp(this.controls.target.z, _vec3A.z, 3.5, rawDt);
      }
    }

    // 10. Telemetry Callback to React with Velocity Hub metrics
    if (this.onTelemetryCallback) {
      const liveAsteroid = this.activeAsteroids.filter((a) => a.alive).pop();
      let curSpeed = 0;
      let vx = 0;
      let vy = 0;
      let vz = 0;
      let gForce = 0;
      let energyMT = 0;
      let closestDist = 0;
      let closestName = 'None';
      let boost = 0;
      let escVel = 0;

      if (liveAsteroid) {
        vx = liveAsteroid.velocity.x;
        vy = liveAsteroid.velocity.y;
        vz = liveAsteroid.velocity.z;
        curSpeed = Math.hypot(vx, vy, vz);
        const acc = computeAcceleration(liveAsteroid.position, this.bodies);
        gForce = Math.hypot(acc.ax, acc.ay, acc.az) / 0.98; // simulation G's
        const realMassKg = liveAsteroid.spec.mass * 1e14;
        const realSpeedMps = curSpeed * 3000;
        energyMT = (0.5 * realMassKg * realSpeedMps * realSpeedMps) / 4.184e15;
        closestDist = liveAsteroid.closestDist;
        closestName = liveAsteroid.closestBodyName;
        boost = Math.max(0, curSpeed - liveAsteroid.initialSpeed);

        // Escape velocity relative to nearest body
        const nearest = this.bodies.find((b) => b.name === closestName) || this.bodies[0];
        if (nearest && closestDist < Infinity) {
          escVel = Math.sqrt((2 * G_CONSTANT * nearest.mass) / Math.max(10, closestDist));
        }
      }

      const aimDist = this.isAiming ? this.aimAnchorWorld.distanceTo(this.aimCurrentWorld) : 0;
      const aimSpeed = aimDist * 0.22;

      this.onTelemetryCallback({
        simTime: this.simTime,
        asteroidCount: this.activeAsteroids.filter((a) => a.alive).length,
        activeAsteroidSpeed: curSpeed,
        vx,
        vy,
        vz,
        escapeVelocity: escVel,
        activeAsteroidGForce: gForce,
        activeAsteroidEnergyMT: energyMT,
        activeAsteroidDistClosest: closestDist,
        activeAsteroidClosestName: closestName,
        slingshotBoost: boost,
        isAiming: this.isAiming,
        aimSpeed,
        isSlowMoActive: this.slowMoRemaining > 0,
      });
    }
  }

  /**
   * Sets up mouse / pointer events for click-and-drag asteroid slingshot launch
   */
  private setupInputHandlers() {
    const el = this.renderer.domElement;
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); // XZ orbital plane
    const intersectPt = new THREE.Vector3();

    const getRaycastPoint = (e: MouseEvent): THREE.Vector3 | null => {
      const rect = el.getBoundingClientRect();
      _mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      _mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      _raycaster.setFromCamera(_mouse, this.camera);
      const hit = _raycaster.ray.intersectPlane(plane, intersectPt);
      return hit ? intersectPt.clone() : null;
    };

    el.addEventListener('mousedown', (e) => {
      if (e.button !== 0 || e.shiftKey) return; // Left mouse drag to aim slingshot, Shift+drag orbits camera
      // Only initiate launch aim if user clicked while holding Alt or in Launch mode
      if (this.controls.enabled && !e.altKey && !this.isAimingModeActive) return;

      const pt = getRaycastPoint(e);
      if (pt) {
        this.isAiming = true;
        this.aimAnchorWorld.copy(pt);
        this.aimCurrentWorld.copy(pt);
        sound.startAimCharge(0.2);
        this.controls.enabled = false;
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isAiming) return;
      const pt = getRaycastPoint(e);
      if (pt) {
        this.aimCurrentWorld.copy(pt);
        // Vector from current mouse to anchor is launch direction (pull back like slingshot!)
        _vec3A.subVectors(this.aimAnchorWorld, this.aimCurrentWorld);
        const dist = _vec3A.length();
        const launchDir = _vec3A.clone().normalize();
        const speed = Math.max(2.0, Math.min(dist * 0.22, 50));

        if (this.aimArrowHelper) {
          this.aimArrowHelper.position.copy(this.aimAnchorWorld);
          this.aimArrowHelper.setDirection(launchDir);
          this.aimArrowHelper.setLength(Math.min(dist, 120), Math.min(dist * 0.3, 12), Math.min(dist * 0.15, 6));
          this.aimArrowHelper.visible = true;
        }

        sound.updateAimCharge(dist / 40);

        // Update real time trajectory preview
        const vel = {
          x: launchDir.x * speed,
          y: launchDir.y * speed,
          z: launchDir.z * speed,
        };
        this.updateAimTrajectory(
          { x: this.aimAnchorWorld.x, y: this.aimAnchorWorld.y, z: this.aimAnchorWorld.z },
          vel,
          this.aimSelectedSpec
        );
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (!this.isAiming) return;
      this.isAiming = false;
      sound.stopAimCharge();

      if (this.aimArrowHelper) this.aimArrowHelper.visible = false;
      this.controls.enabled = true;

      _vec3A.subVectors(this.aimAnchorWorld, this.aimCurrentWorld);
      const dist = _vec3A.length();

      if (dist > 8) {
        const launchDir = _vec3A.clone().normalize();
        const speed = Math.max(3.0, Math.min(dist * 0.22, 55));
        const vel = {
          x: launchDir.x * speed,
          y: launchDir.y * speed,
          z: launchDir.z * speed,
        };

        const ast = this.launchAsteroid(
          this.aimSelectedSpec,
          { x: this.aimAnchorWorld.x, y: 0, z: this.aimAnchorWorld.z },
          vel
        );

        this.followTargetId = 'asteroid';
      }
    });
  }

  private isAimingModeActive: boolean = false;

  public setAimMode(active: boolean) {
    this.isAimingModeActive = active;
    this.controls.enabled = !active;
    if (!active) {
      this.hideTrajectory();
      if (this.aimArrowHelper) this.aimArrowHelper.visible = false;
    }
  }

  public getAimMode(): boolean {
    return this.isAimingModeActive;
  }

  public setSelectedAsteroidSpec(spec: AsteroidSpec) {
    this.aimSelectedSpec = spec;
  }

  public setFollowTarget(targetId: string | 'asteroid' | null) {
    this.followTargetId = targetId;
    if (!targetId) {
      this.controls.target.set(0, 0, 0);
    }
  }

  public setConfig(newConfig: Partial<SceneConfig>) {
    this.config = { ...this.config, ...newConfig };
    if (this.gridMesh) {
      this.gridMesh.visible = this.config.showSpacetimeGrid;
    }
    this.orbitLineMap.forEach((line) => {
      line.visible = this.config.showOrbits;
    });
  }

  public getConfig(): SceneConfig {
    return { ...this.config };
  }

  public getBodies(): CelestialBody[] {
    return this.bodies;
  }

  public getActiveAsteroids(): ActiveAsteroid[] {
    return this.activeAsteroids;
  }

  public onImpact(cb: (event: ImpactEvent) => void) {
    this.onImpactCallback = cb;
  }

  public onTelemetry(cb: (stats: any) => void) {
    this.onTelemetryCallback = cb;
  }

  public resetSimulationTime() {
    this.simTime = 0;
  }

  private handleResize = () => {
    if (!this.container || this.isDisposed) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  public dispose() {
    this.isDisposed = true;
    if (this.animFrameId !== null) cancelAnimationFrame(this.animFrameId);
    window.removeEventListener('resize', this.handleResize);

    this.scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh || (obj as THREE.Line).isLine || (obj as THREE.Points).isPoints) {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) {
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => m.dispose());
          } else {
            mesh.material.dispose();
          }
        }
      }
    });

    this.renderer.dispose();
    if (this.container && this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
