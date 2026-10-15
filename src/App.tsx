import React, { useEffect, useRef, useState, useCallback } from 'react';
import { SimulationScene } from './simulation/sceneManager';
import { ASTEROID_SPECS, CHALLENGE_MISSIONS, SYSTEM_PRESETS } from './simulation/physics';
import { AsteroidSpec, CelestialBody, ChallengeMission, ImpactEvent, SystemPreset } from './types';
import { TitleScreen } from './components/TitleScreen';
import { PerimeterHUD } from './components/PerimeterHUD';
import { BottomControlDock } from './components/BottomControlDock';
import { AnalysisModal } from './components/AnalysisModal';
import { MissionsModal } from './components/MissionsModal';
import { sound } from './audio/soundEngine';

import { VelocityHub } from './components/VelocityHub';

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<SimulationScene | null>(null);

  // Game Shell State
  const [gameState, setGameState] = useState<'title' | 'playing'>('title');

  // Presets & Active Config
  const [selectedPreset, setSelectedPreset] = useState<SystemPreset>(SYSTEM_PRESETS[0]);
  const [selectedSpec, setSelectedSpec] = useState<AsteroidSpec>(ASTEROID_SPECS.silicate);

  // Launch Parameters
  const [launchSpeed, setLaunchSpeed] = useState<number>(10.0);
  const [launchAngleDeg, setLaunchAngleDeg] = useState<number>(35);
  const [isAimMode, setIsAimMode] = useState<boolean>(false);

  // View & Physics Toggles
  const [showSpacetimeGrid, setShowSpacetimeGrid] = useState<boolean>(true);
  const [showOrbits, setShowOrbits] = useState<boolean>(true);
  const [showTrajectory, setShowTrajectory] = useState<boolean>(true);
  const [timeScale, setTimeScale] = useState<number>(1.0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [followTargetId, setFollowTargetId] = useState<string | 'asteroid' | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Velocity Hub & Telemetry State
  const [simTime, setSimTime] = useState<number>(0);
  const [asteroidCount, setAsteroidCount] = useState<number>(0);
  const [activeAsteroidSpeed, setActiveAsteroidSpeed] = useState<number>(0);
  const [asteroidVx, setAsteroidVx] = useState<number>(0);
  const [asteroidVy, setAsteroidVy] = useState<number>(0);
  const [asteroidVz, setAsteroidVz] = useState<number>(0);
  const [escapeVelocity, setEscapeVelocity] = useState<number>(0);
  const [activeAsteroidGForce, setActiveAsteroidGForce] = useState<number>(0);
  const [activeAsteroidEnergyMT, setActiveAsteroidEnergyMT] = useState<number>(0);
  const [activeAsteroidDistClosest, setActiveAsteroidDistClosest] = useState<number>(0);
  const [activeAsteroidClosestName, setActiveAsteroidClosestName] = useState<string>('');
  const [slingshotBoost, setSlingshotBoost] = useState<number>(0);
  const [isAiming, setIsAiming] = useState<boolean>(false);
  const [aimSpeed, setAimSpeed] = useState<number>(0);
  const [maxSlingshotSpeed, setMaxSlingshotSpeed] = useState<number>(0);
  const [isImpactSlowMoEnabled, setIsImpactSlowMoEnabled] = useState<boolean>(true);
  const [showVelocityHub, setShowVelocityHub] = useState<boolean>(true);

  const [impacts, setImpacts] = useState<ImpactEvent[]>([]);
  const [isAnalysisOpen, setIsAnalysisOpen] = useState<boolean>(false);

  // Missions
  const [isMissionsOpen, setIsMissionsOpen] = useState<boolean>(false);
  const [activeMission, setActiveMission] = useState<ChallengeMission | null>(null);
  const [completedMissionIds, setCompletedMissionIds] = useState<string[]>([]);
  const [missionBannerText, setMissionBannerText] = useState<string | null>(null);

  // Bodies in current scene
  const [currentBodies, setCurrentBodies] = useState<CelestialBody[]>(SYSTEM_PRESETS[0].bodies);

  // Initialize Three.js scene once
  useEffect(() => {
    if (!canvasMountRef.current) return;

    const scene = new SimulationScene(canvasMountRef.current);
    sceneRef.current = scene;

    // Load initial system
    scene.loadSystem(SYSTEM_PRESETS[0].bodies, SYSTEM_PRESETS[0].recommendedScale);
    setCurrentBodies(scene.getBodies());

    // Listen to impacts
    scene.onImpact((event) => {
      setImpacts((prev) => [...prev, event]);
      if (event.bodyDestroyed) {
        setCurrentBodies([...scene.getBodies()]);
        setFollowTargetId((prev) => (prev === event.destroyedBodyName || prev === event.targetBodyName ? null : prev));
      }
    });

    // Listen to telemetry updates
    scene.onTelemetry((stats) => {
      setSimTime(stats.simTime);
      setAsteroidCount(stats.asteroidCount);
      setActiveAsteroidSpeed(stats.activeAsteroidSpeed);
      setAsteroidVx(stats.vx);
      setAsteroidVy(stats.vy);
      setAsteroidVz(stats.vz);
      setEscapeVelocity(stats.escapeVelocity);
      setActiveAsteroidGForce(stats.activeAsteroidGForce);
      setActiveAsteroidEnergyMT(stats.activeAsteroidEnergyMT);
      setActiveAsteroidDistClosest(stats.activeAsteroidDistClosest);
      setActiveAsteroidClosestName(stats.activeAsteroidClosestName);
      setSlingshotBoost(stats.slingshotBoost);
      setIsAiming(stats.isAiming);
      setAimSpeed(stats.aimSpeed);

      if (stats.activeAsteroidSpeed > 0) {
        setMaxSlingshotSpeed((prev) => Math.max(prev, stats.activeAsteroidSpeed));
      }
    });

    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
  }, []);

  // Update aim mode in scene when state changes
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.setAimMode(isAimMode);
      sceneRef.current.setSelectedAsteroidSpec(selectedSpec);
    }
  }, [isAimMode, selectedSpec]);

  // Update scene configs
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.setConfig({
        showSpacetimeGrid,
        showOrbits,
        showTrajectory,
        timeScale: isPaused ? 0 : timeScale,
      });
    }
  }, [showSpacetimeGrid, showOrbits, showTrajectory, timeScale, isPaused]);

  // Switch Solar System Preset
  const handleSelectPreset = useCallback((preset: SystemPreset) => {
    setSelectedPreset(preset);
    if (sceneRef.current) {
      sceneRef.current.loadSystem(preset.bodies, preset.recommendedScale);
      setCurrentBodies(sceneRef.current.getBodies());
      setImpacts([]);
      setFollowTargetId(null);
    }
  }, []);

  // Launch Asteroid
  const handleLaunchAsteroid = useCallback(() => {
    if (!sceneRef.current) return;
    const rad = (launchAngleDeg * Math.PI) / 180;
    const vx = Math.cos(rad) * launchSpeed;
    const vz = Math.sin(rad) * launchSpeed;

    const spawnPos = selectedPreset.defaultAsteroidPosition || { x: -160, y: 0, z: -40 };

    sceneRef.current.launchAsteroid(
      selectedSpec,
      { x: spawnPos.x, y: 0, z: spawnPos.z },
      { x: vx, y: 0, z: vz }
    );

    setFollowTargetId('asteroid');
    sceneRef.current.setFollowTarget('asteroid');
  }, [launchAngleDeg, launchSpeed, selectedPreset, selectedSpec]);

  // Clear asteroids
  const handleClearAsteroids = useCallback(() => {
    if (sceneRef.current) {
      sceneRef.current.clearAllAsteroids();
      setFollowTargetId(null);
      sceneRef.current.setFollowTarget(null);
    }
  }, []);

  // Reset system
  const handleResetSystem = useCallback(() => {
    if (sceneRef.current) {
      sceneRef.current.loadSystem(selectedPreset.bodies, selectedPreset.recommendedScale);
      sceneRef.current.resetSimulationTime();
      setCurrentBodies(sceneRef.current.getBodies());
      setImpacts([]);
      setFollowTargetId(null);
    }
  }, [selectedPreset]);

  // Add custom body
  const handleAddCustomBody = useCallback((body: CelestialBody) => {
    if (!sceneRef.current) return;
    const existing = sceneRef.current.getBodies();
    const updated = [...existing, body];
    sceneRef.current.loadSystem(updated, selectedPreset.recommendedScale);
    setCurrentBodies(sceneRef.current.getBodies());
  }, [selectedPreset.recommendedScale]);

  // Follow camera target change
  const handleFollowTargetChange = useCallback((targetId: string | 'asteroid' | null) => {
    setFollowTargetId(targetId);
    if (sceneRef.current) {
      sceneRef.current.setFollowTarget(targetId);
    }
  }, []);

  // Audio mute toggle
  const handleToggleMute = useCallback(() => {
    const nextMuted = sound.toggleMute();
    setIsMuted(nextMuted);
  }, []);

  // Start mission setup
  const handleStartMission = useCallback((mission: ChallengeMission) => {
    setActiveMission(mission);
    setIsMissionsOpen(false);

    // Find and switch to mission's preset
    const preset = SYSTEM_PRESETS.find((p) => p.id === mission.presetId) || SYSTEM_PRESETS[0];
    handleSelectPreset(preset);

    const spec = ASTEROID_SPECS[mission.initialAsteroid.composition];
    setSelectedSpec(spec);

    const initSpeed = Math.hypot(mission.initialAsteroid.vel.x, mission.initialAsteroid.vel.z);
    setLaunchSpeed(initSpeed);

    // Calculate angle
    const angle = (Math.atan2(mission.initialAsteroid.vel.z, mission.initialAsteroid.vel.x) * 180) / Math.PI;
    setLaunchAngleDeg(Math.round((angle + 360) % 360));

    // Launch immediately for the user or prompt them
    if (sceneRef.current) {
      sceneRef.current.launchAsteroid(
        spec,
        mission.initialAsteroid.pos,
        mission.initialAsteroid.vel
      );
      setFollowTargetId('asteroid');
      sceneRef.current.setFollowTarget('asteroid');
    }

    setMissionBannerText(`MISSION ACTIVE: ${mission.title}`);
    setTimeout(() => setMissionBannerText(null), 5000);
  }, [handleSelectPreset]);

  // Check mission success conditions periodically
  useEffect(() => {
    if (!activeMission || completedMissionIds.includes(activeMission.id)) return;

    const isSuccess = activeMission.checkSuccess({
      maxSpeed: maxSlingshotSpeed,
      slingshotBoost,
      impacts,
      bodies: currentBodies,
      asteroidInFlight: asteroidCount > 0,
      closestBodyName: activeAsteroidClosestName,
      closestDist: activeAsteroidDistClosest,
    });

    if (isSuccess) {
      setCompletedMissionIds((prev) => [...prev, activeMission.id]);
      sound.playSuccessFanfare();
      setMissionBannerText(`MISSION ACCOMPLISHED! BADGE UNLOCKED: ${activeMission.rewardBadge}`);
      setTimeout(() => setMissionBannerText(null), 6000);
    }
  }, [activeMission, completedMissionIds, maxSlingshotSpeed, slingshotBoost, impacts, currentBodies, asteroidCount, activeAsteroidClosestName, activeAsteroidDistClosest]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;

      if (e.code === 'Space') {
        e.preventDefault();
        sound.playBeep(450, 0.04);
        setIsPaused((p) => !p);
      } else if (e.code === 'KeyC') {
        sound.playBeep(380, 0.05);
        handleClearAsteroids();
      } else if (e.code === 'KeyR') {
        sound.playBeep(420, 0.05);
        handleResetSystem();
      } else if (e.code === 'KeyM') {
        handleToggleMute();
      } else if (e.code === 'KeyV') {
        sound.playBeep(480, 0.04);
        setShowVelocityHub((v) => !v);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleClearAsteroids, handleResetSystem, handleToggleMute]);

  // Impact Slow-Mo toggle
  const handleToggleImpactSlowMo = useCallback(() => {
    setIsImpactSlowMoEnabled((prev) => {
      const next = !prev;
      if (sceneRef.current) {
        sceneRef.current.setImpactSlowMoEnabled(next);
      }
      return next;
    });
  }, []);

  // Manual slow-mo toggle
  const handleToggleManualSlowMo = useCallback(() => {
    setTimeScale((prev) => (prev <= 0.15 ? 1.0 : 0.1));
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-gray-950 font-sans select-none">
      {/* 3D WebGL Canvas isolated container */}
      <div
        ref={canvasMountRef}
        className="absolute inset-0 z-0 w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* Title Screen Overlay */}
      {gameState === 'title' && (
        <TitleScreen
          onStart={() => setGameState('playing')}
          selectedPreset={selectedPreset}
          onSelectPreset={handleSelectPreset}
          onSelectMission={handleStartMission}
        />
      )}

      {/* Active Game HUD and Controls */}
      {gameState === 'playing' && (
        <>
          {/* Mission Success or Active Alert Banner */}
          {missionBannerText && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-mono font-bold text-xs tracking-wider shadow-2xl border border-white/30 animate-in fade-in slide-in-from-top duration-300">
              {missionBannerText}
            </div>
          )}

          {/* Low-Occlusion Perimeter Status Clusters */}
          <PerimeterHUD
            systemName={selectedPreset.name}
            bodies={currentBodies}
            simTime={simTime}
            asteroidCount={asteroidCount}
            activeAsteroidSpeed={activeAsteroidSpeed}
            activeAsteroidGForce={activeAsteroidGForce}
            activeAsteroidEnergyMT={activeAsteroidEnergyMT}
            activeAsteroidDistClosest={activeAsteroidDistClosest}
            activeAsteroidClosestName={activeAsteroidClosestName}
            slingshotBoost={slingshotBoost}
            isAiming={isAiming}
            aimSpeed={aimSpeed}
            isPaused={isPaused}
            followTargetId={followTargetId}
            onFollowTargetChange={handleFollowTargetChange}
            onTogglePause={() => setIsPaused(!isPaused)}
            onResetSystem={handleResetSystem}
            onClearAsteroids={handleClearAsteroids}
            isMuted={isMuted}
            onToggleMute={handleToggleMute}
            onOpenAnalysis={() => setIsAnalysisOpen(true)}
            onOpenMissions={() => setIsMissionsOpen(true)}
            lastImpactCount={impacts.length}
            showVelocityHub={showVelocityHub}
            onToggleVelocityHub={() => setShowVelocityHub(!showVelocityHub)}
          />

          {/* Dedicated Velocity Hub (Real-time telemetry, escape velocity & impact slow-mo) */}
          {showVelocityHub && (
            <div className="absolute top-[200px] right-4 sm:right-6 z-20 pointer-events-none">
              <VelocityHub
                velocityMagnitude={activeAsteroidSpeed}
                vx={asteroidVx}
                vy={asteroidVy}
                vz={asteroidVz}
                escapeVelocity={escapeVelocity}
                nearestBodyName={activeAsteroidClosestName}
                nearestBodyDist={activeAsteroidDistClosest}
                gForce={activeAsteroidGForce}
                slingshotDeltaV={slingshotBoost}
                kineticEnergyMT={activeAsteroidEnergyMT}
                isImpactSlowMoActive={isImpactSlowMoEnabled}
                onToggleImpactSlowMo={handleToggleImpactSlowMo}
                isManualSlowMo={timeScale <= 0.15 && !isPaused}
                onToggleManualSlowMo={handleToggleManualSlowMo}
                onClose={() => setShowVelocityHub(false)}
              />
            </div>
          )}

          {/* Unified Collapsible Bottom Control Dock */}
          <BottomControlDock
            selectedPreset={selectedPreset}
            onSelectPreset={handleSelectPreset}
            selectedSpec={selectedSpec}
            onSelectSpec={(spec) => {
              setSelectedSpec(spec);
              if (sceneRef.current) sceneRef.current.setSelectedAsteroidSpec(spec);
            }}
            launchSpeed={launchSpeed}
            onChangeLaunchSpeed={setLaunchSpeed}
            launchAngleDeg={launchAngleDeg}
            onChangeLaunchAngle={setLaunchAngleDeg}
            onLaunchAsteroid={handleLaunchAsteroid}
            isAimMode={isAimMode}
            onToggleAimMode={() => setIsAimMode(!isAimMode)}
            showSpacetimeGrid={showSpacetimeGrid}
            onToggleSpacetimeGrid={() => setShowSpacetimeGrid(!showSpacetimeGrid)}
            showOrbits={showOrbits}
            onToggleOrbits={() => setShowOrbits(!showOrbits)}
            showTrajectory={showTrajectory}
            onToggleTrajectory={() => setShowTrajectory(!showTrajectory)}
            timeScale={timeScale}
            onChangeTimeScale={setTimeScale}
            onAddCustomBody={handleAddCustomBody}
            showVelocityHub={showVelocityHub}
            onToggleVelocityHub={() => setShowVelocityHub(!showVelocityHub)}
          />

          {/* Modals */}
          <AnalysisModal
            isOpen={isAnalysisOpen}
            onClose={() => setIsAnalysisOpen(false)}
            impacts={impacts}
            maxSlingshotSpeed={maxSlingshotSpeed}
          />

          <MissionsModal
            isOpen={isMissionsOpen}
            onClose={() => setIsMissionsOpen(false)}
            completedMissionIds={completedMissionIds}
            onStartMission={handleStartMission}
          />
        </>
      )}
    </div>
  );
}
