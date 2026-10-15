import React, { useState } from 'react';
import { AsteroidComposition, AsteroidSpec, CelestialBody, SystemPreset } from '../types';
import { ASTEROID_SPECS, SYSTEM_PRESETS } from '../simulation/physics';
import { ChevronDown, ChevronUp, Rocket, Globe, Eye, Plus, Sparkles, Crosshair } from 'lucide-react';
import { sound } from '../audio/soundEngine';

interface BottomControlDockProps {
  selectedPreset: SystemPreset;
  onSelectPreset: (preset: SystemPreset) => void;
  selectedSpec: AsteroidSpec;
  onSelectSpec: (spec: AsteroidSpec) => void;
  launchSpeed: number;
  onChangeLaunchSpeed: (speed: number) => void;
  launchAngleDeg: number;
  onChangeLaunchAngle: (angle: number) => void;
  onLaunchAsteroid: () => void;
  isAimMode: boolean;
  onToggleAimMode: () => void;
  // View & Simulation Settings
  showSpacetimeGrid: boolean;
  onToggleSpacetimeGrid: () => void;
  showOrbits: boolean;
  onToggleOrbits: () => void;
  showTrajectory: boolean;
  onToggleTrajectory: () => void;
  timeScale: number;
  onChangeTimeScale: (scale: number) => void;
  onAddCustomBody: (body: CelestialBody) => void;
  showVelocityHub?: boolean;
  onToggleVelocityHub?: () => void;
}

export const BottomControlDock: React.FC<BottomControlDockProps> = ({
  selectedPreset,
  onSelectPreset,
  selectedSpec,
  onSelectSpec,
  launchSpeed,
  onChangeLaunchSpeed,
  launchAngleDeg,
  onChangeLaunchAngle,
  onLaunchAsteroid,
  isAimMode,
  onToggleAimMode,
  showSpacetimeGrid,
  onToggleSpacetimeGrid,
  showOrbits,
  onToggleOrbits,
  showTrajectory,
  onToggleTrajectory,
  timeScale,
  onChangeTimeScale,
  onAddCustomBody,
  showVelocityHub,
  onToggleVelocityHub,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'launch' | 'systems' | 'view' | 'custom'>('launch');

  const timePills = [
    { label: '0.25x', value: 0.25 },
    { label: '0.5x', value: 0.5 },
    { label: '1x', value: 1.0 },
    { label: '2x', value: 2.0 },
    { label: '5x', value: 5.0 },
    { label: '15x', value: 15.0 },
  ];

  return (
    <div
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-20 w-[94vw] max-w-4xl transition-all duration-300 pointer-events-auto ${
        isCollapsed ? 'translate-y-[calc(100%-38px)]' : 'translate-y-0'
      }`}
    >
      {/* Collapse / Expand Toggle Tab */}
      <div className="flex justify-center -mb-px">
        <button
          onClick={() => {
            sound.playBeep(isCollapsed ? 580 : 420, 0.05);
            setIsCollapsed(!isCollapsed);
          }}
          className="px-4 py-1 rounded-t-xl bg-gray-950/90 border-t border-x border-gray-800 text-gray-400 hover:text-cyan-300 font-mono text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-lg"
        >
          {isCollapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" />
              <span>EXPAND CONTROLS (H)</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" />
              <span>COLLAPSE ZEN VIEW (H)</span>
            </>
          )}
        </button>
      </div>

      {/* Main Glassmorphic Dock Container */}
      <div className="bg-gray-950/95 border border-gray-800/90 rounded-2xl p-3.5 shadow-2xl backdrop-blur-none text-xs">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-gray-800/80 pb-2.5 mb-3">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                sound.playBeep(440, 0.03);
                setActiveTab('launch');
              }}
              className={`px-3 py-1.5 rounded-lg font-mono font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'launch'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-900'
              }`}
            >
              <Rocket className="w-3.5 h-3.5" />
              <span>LAUNCH BAY</span>
            </button>

            <button
              onClick={() => {
                sound.playBeep(440, 0.03);
                setActiveTab('systems');
              }}
              className={`px-3 py-1.5 rounded-lg font-mono font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'systems'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-900'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>SOLAR SYSTEMS</span>
            </button>

            <button
              onClick={() => {
                sound.playBeep(440, 0.03);
                setActiveTab('view');
              }}
              className={`px-3 py-1.5 rounded-lg font-mono font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'view'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-900'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>SPACETIME &amp; TIME</span>
            </button>

            <button
              onClick={() => {
                sound.playBeep(440, 0.03);
                setActiveTab('custom');
              }}
              className={`px-3 py-1.5 rounded-lg font-mono font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'custom'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-900'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>ADD BODY</span>
            </button>
          </div>

          {/* Quick Aim Slingshot toggle */}
          <button
            onClick={() => {
              sound.playBeep(isAimMode ? 360 : 540, 0.05);
              onToggleAimMode();
            }}
            className={`px-3 py-1.5 rounded-lg font-mono text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
              isAimMode
                ? 'bg-amber-500/25 border-amber-400 text-amber-200'
                : 'bg-gray-900 border-gray-800 text-gray-400 hover:text-gray-200'
            }`}
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>{isAimMode ? 'AIM SLINGSHOT: ON' : 'DRAG TO AIM'}</span>
          </button>
        </div>

        {/* Tab 1: LAUNCH BAY */}
        {activeTab === 'launch' && (
          <div className="space-y-3 font-mono">
            {/* Asteroid Type Badges */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-gray-400 text-[10px] uppercase tracking-wider mr-1">TYPE:</span>
              {Object.values(ASTEROID_SPECS).map((spec) => {
                const isSelected = spec.composition === selectedSpec.composition;
                return (
                  <button
                    key={spec.id}
                    onClick={() => {
                      sound.playBeep(500, 0.04);
                      onSelectSpec(spec);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer border flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-sm shadow-cyan-500/20'
                        : 'bg-gray-900/80 border-gray-800 text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: spec.color }}
                    ></span>
                    <span>{spec.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Controls Bar: Speed Slider, Angle, and Launch Button */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center pt-1">
              {/* Velocity Slider */}
              <div className="sm:col-span-5 bg-gray-900/60 p-2 rounded-xl border border-gray-800/60">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-gray-400 text-[10px]">LAUNCH VELOCITY</span>
                  <span className="text-cyan-300 font-bold tabular-nums">
                    {(launchSpeed * 3).toFixed(1)} km/s
                  </span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="40"
                  step="0.5"
                  value={launchSpeed}
                  onChange={(e) => onChangeLaunchSpeed(parseFloat(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-gray-800 rounded-lg"
                />
              </div>

              {/* Angle Slider */}
              <div className="sm:col-span-4 bg-gray-900/60 p-2 rounded-xl border border-gray-800/60">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-gray-400 text-[10px]">INJECTION ANGLE</span>
                  <span className="text-cyan-300 font-bold tabular-nums">
                    {launchAngleDeg}°
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="360"
                  step="5"
                  value={launchAngleDeg}
                  onChange={(e) => onChangeLaunchAngle(parseInt(e.target.value, 10))}
                  className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-gray-800 rounded-lg"
                />
              </div>

              {/* Launch CTA */}
              <div className="sm:col-span-3">
                <button
                  onClick={() => {
                    onLaunchAsteroid();
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold tracking-wider shadow-lg shadow-cyan-500/20 active:translate-y-0.5 transition-all flex items-center justify-center gap-2 cursor-pointer border border-cyan-300/30 text-xs"
                >
                  <Rocket className="w-4 h-4" />
                  <span>FIRE ASTEROID</span>
                </button>
              </div>
            </div>

            {/* Spec Description */}
            <div className="text-[11px] text-gray-400 font-sans italic">
              {selectedSpec.description} (Density: {selectedSpec.density} g/cm³, Mass scale: {selectedSpec.mass})
            </div>
          </div>
        )}

        {/* Tab 2: SOLAR SYSTEMS */}
        {activeTab === 'systems' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {SYSTEM_PRESETS.map((preset) => {
              const isSelected = preset.id === selectedPreset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => {
                    sound.playBeep(480, 0.05);
                    onSelectPreset(preset);
                  }}
                  className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-cyan-950/40 border-cyan-400 shadow-md shadow-cyan-500/10'
                      : 'bg-gray-900/60 border-gray-800 hover:border-gray-700'
                  }`}
                >
                  <div className="font-semibold text-gray-100 flex items-center justify-between">
                    <span>{preset.name}</span>
                    <span className="text-[10px] font-mono text-cyan-400">
                      {preset.bodies.length} bodies
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-400 font-mono mt-0.5 truncate">
                    {preset.tagline}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Tab 3: VIEW & TIME */}
        {activeTab === 'view' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono">
            {/* View Layer Toggles */}
            <div className="space-y-2">
              <span className="text-gray-400 text-[10px] uppercase tracking-wider block">
                RENDER VISUAL LAYERS
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={onToggleSpacetimeGrid}
                  className={`px-3 py-1.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                    showSpacetimeGrid
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                      : 'bg-gray-900 border-gray-800 text-gray-400'
                  }`}
                >
                  3D Gravity Grid: {showSpacetimeGrid ? 'ON' : 'OFF'}
                </button>

                <button
                  onClick={onToggleOrbits}
                  className={`px-3 py-1.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                    showOrbits
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                      : 'bg-gray-900 border-gray-800 text-gray-400'
                  }`}
                >
                  Orbit Trails: {showOrbits ? 'ON' : 'OFF'}
                </button>

                <button
                  onClick={onToggleTrajectory}
                  className={`px-3 py-1.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                    showTrajectory
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                      : 'bg-gray-900 border-gray-800 text-gray-400'
                  }`}
                >
                  Trajectory Line: {showTrajectory ? 'ON' : 'OFF'}
                </button>

                {onToggleVelocityHub && (
                  <button
                    onClick={() => {
                      sound.playBeep(480, 0.04);
                      onToggleVelocityHub();
                    }}
                    className={`px-3 py-1.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                      showVelocityHub
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-sm shadow-cyan-500/20'
                        : 'bg-gray-900 border-gray-800 text-gray-400'
                    }`}
                  >
                    Velocity Hub (V): {showVelocityHub ? 'ON' : 'OFF'}
                  </button>
                )}
              </div>
            </div>

            {/* Time Warp Speed Multipliers */}
            <div>
              <span className="text-gray-400 text-[10px] uppercase tracking-wider block mb-1.5">
                SIMULATION TIME WARP
              </span>
              <div className="flex flex-wrap gap-1.5">
                {timePills.map((p) => {
                  const isActive = timeScale === p.value;
                  return (
                    <button
                      key={p.label}
                      onClick={() => {
                        sound.playBeep(450, 0.03);
                        onChangeTimeScale(p.value);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer border ${
                        isActive
                          ? 'bg-cyan-500 text-gray-950 border-cyan-300 font-bold'
                          : 'bg-gray-900 border-gray-800 text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: ADD CUSTOM BODY & BELTS */}
        {activeTab === 'custom' && (
          <div className="font-mono space-y-3 max-h-56 overflow-y-auto pr-1">
            <div className="text-gray-400 text-[11px]">
              Spawn additional stars, exoplanets, mega-structures, or entire asteroid rings directly into the gravity field:
            </div>

            {/* Category: Stars & Singularities */}
            <div>
              <div className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                <span>STARS &amp; COMPACT OBJECTS</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => {
                    sound.playBeep(560, 0.05);
                    onAddCustomBody({
                      id: `custom_blue_giant_${Date.now()}`,
                      name: 'Rigel Blue Hypergiant',
                      type: 'star',
                      mass: 22000,
                      radius: 16,
                      position: { x: 0, y: 0, z: -260 },
                      velocity: { x: 8.5, y: 0, z: 0 },
                      color: '#38bdf8',
                      emissive: true,
                      textureType: 'sun',
                      isCustom: true,
                    });
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-gray-900 hover:bg-gray-800 border border-cyan-500/40 text-cyan-200 text-xs cursor-pointer"
                >
                  + Blue Hypergiant (Mass: 22,000)
                </button>

                <button
                  onClick={() => {
                    sound.playBeep(560, 0.05);
                    onAddCustomBody({
                      id: `custom_pulsar_${Date.now()}`,
                      name: 'Vela Pulsar (Spinning Magnetar)',
                      type: 'pulsar',
                      mass: 25000,
                      radius: 4.5,
                      position: { x: 190, y: 0, z: 0 },
                      velocity: { x: 0, y: 0, z: 12.0 },
                      color: '#c084fc',
                      emissive: true,
                      textureType: 'pulsar',
                      hasPulsarJets: true,
                      isCustom: true,
                    });
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-gray-900 hover:bg-gray-800 border border-purple-500/40 text-purple-300 text-xs cursor-pointer"
                >
                  + Pulsar with Relativistic Jets (Mass: 25,000)
                </button>

                <button
                  onClick={() => {
                    sound.playBeep(520, 0.05);
                    onAddCustomBody({
                      id: `custom_dwarf_star_${Date.now()}`,
                      name: 'Companion Red Dwarf',
                      type: 'star',
                      mass: 4000,
                      radius: 7.0,
                      position: { x: 0, y: 0, z: -220 },
                      velocity: { x: 7.8, y: 0, z: 0 },
                      color: '#ef4444',
                      emissive: true,
                      textureType: 'sun',
                      isCustom: true,
                    });
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-gray-900 hover:bg-gray-800 border border-red-500/40 text-red-300 text-xs cursor-pointer"
                >
                  + Red Dwarf Companion (Mass: 4,000)
                </button>

                <button
                  onClick={() => {
                    sound.playBeep(520, 0.05);
                    onAddCustomBody({
                      id: `custom_singularity_${Date.now()}`,
                      name: 'Intermediate Black Hole',
                      type: 'black_hole',
                      mass: 32000,
                      radius: 6.0,
                      position: { x: -280, y: 0, z: 0 },
                      velocity: { x: 0, y: 0, z: -8.2 },
                      color: '#0f172a',
                      textureType: 'black_hole',
                      hasRings: true,
                      isCustom: true,
                    });
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-gray-900 hover:bg-gray-800 border border-indigo-500/40 text-indigo-300 text-xs cursor-pointer"
                >
                  + Accreting Black Hole (Mass: 32,000)
                </button>
              </div>
            </div>

            {/* Category: Planets & Moons */}
            <div>
              <div className="text-[10px] text-amber-400 font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Globe className="w-3 h-3" />
                <span>EXOPLANETS &amp; MOONS</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => {
                    sound.playBeep(520, 0.05);
                    onAddCustomBody({
                      id: `custom_lava_world_${Date.now()}`,
                      name: 'Mustafar Molten Lava World',
                      type: 'planet',
                      mass: 1.8,
                      radius: 3.6,
                      position: { x: 55, y: 0, z: 0 },
                      velocity: { x: 0, y: 0, z: 18.5 },
                      color: '#ea580c',
                      textureType: 'lava',
                      hasAtmosphere: true,
                      atmosphereColor: '#f97316',
                      isCustom: true,
                    });
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-gray-900 hover:bg-gray-800 border border-orange-500/40 text-orange-300 text-xs cursor-pointer"
                >
                  + Molten Lava Planet (Mass: 1.8)
                </button>

                <button
                  onClick={() => {
                    sound.playBeep(520, 0.05);
                    onAddCustomBody({
                      id: `custom_water_world_${Date.now()}`,
                      name: 'Ocean Super-Earth (Kepler-22b)',
                      type: 'planet',
                      mass: 2.4,
                      radius: 4.4,
                      position: { x: -140, y: 0, z: 0 },
                      velocity: { x: 0, y: 0, z: -12.2 },
                      color: '#0284c7',
                      textureType: 'earth',
                      hasAtmosphere: true,
                      atmosphereColor: '#38bdf8',
                      isCustom: true,
                    });
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-gray-900 hover:bg-gray-800 border border-blue-500/40 text-blue-300 text-xs cursor-pointer"
                >
                  + Ocean Super-Earth (Mass: 2.4)
                </button>

                <button
                  onClick={() => {
                    sound.playBeep(520, 0.05);
                    onAddCustomBody({
                      id: `custom_gas_giant_${Date.now()}`,
                      name: 'Ringed Super-Jupiter',
                      type: 'planet',
                      mass: 85,
                      radius: 10.5,
                      position: { x: 0, y: 0, z: 270 },
                      velocity: { x: -8.5, y: 0, z: 0 },
                      color: '#f97316',
                      textureType: 'saturn',
                      hasRings: true,
                      hasAtmosphere: true,
                      atmosphereColor: '#fed7aa',
                      isCustom: true,
                    });
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-gray-900 hover:bg-gray-800 border border-amber-500/40 text-amber-300 text-xs cursor-pointer"
                >
                  + Ringed Super-Jupiter (Mass: 85)
                </button>

                <button
                  onClick={() => {
                    sound.playBeep(520, 0.05);
                    onAddCustomBody({
                      id: `custom_ice_giant_${Date.now()}`,
                      name: 'Azure Cryo-Giant',
                      type: 'planet',
                      mass: 18,
                      radius: 6.2,
                      position: { x: 0, y: 0, z: -380 },
                      velocity: { x: 7.2, y: 0, z: 0 },
                      color: '#06b6d4',
                      textureType: 'ice',
                      hasAtmosphere: true,
                      atmosphereColor: '#67e8f9',
                      isCustom: true,
                    });
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-gray-900 hover:bg-gray-800 border border-cyan-500/40 text-cyan-300 text-xs cursor-pointer"
                >
                  + Azure Cryo-Giant (Mass: 18)
                </button>
              </div>
            </div>

            {/* Category: Asteroids & Stations */}
            <div>
              <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Rocket className="w-3 h-3" />
                <span>MINOR BODIES &amp; MEGA-STRUCTURES</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => {
                    sound.playBeep(520, 0.05);
                    onAddCustomBody({
                      id: `custom_gold_core_${Date.now()}`,
                      name: '16 Psyche Precious Metal Core',
                      type: 'asteroid',
                      mass: 0.05,
                      radius: 1.8,
                      position: { x: -175, y: 0, z: 0 },
                      velocity: { x: 0, y: 0, z: -11.5 },
                      color: '#fbbf24',
                      textureType: 'gold',
                      isCustom: true,
                    });
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-gray-900 hover:bg-gray-800 border border-yellow-500/40 text-yellow-300 text-xs cursor-pointer"
                >
                  + Gold/Platinum Asteroid Core
                </button>

                <button
                  onClick={() => {
                    sound.playBeep(520, 0.05);
                    onAddCustomBody({
                      id: `custom_space_station_${Date.now()}`,
                      name: 'Orbital Citadel Station',
                      type: 'station',
                      mass: 0.002,
                      radius: 2.2,
                      position: { x: -128, y: 0, z: 0 },
                      velocity: { x: 0, y: 0, z: -15.5 },
                      color: '#38bdf8',
                      textureType: 'station',
                      isCustom: true,
                    });
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-gray-900 hover:bg-gray-800 border border-emerald-500/40 text-emerald-300 text-xs cursor-pointer"
                >
                  + Modular Orbital Space Citadel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
