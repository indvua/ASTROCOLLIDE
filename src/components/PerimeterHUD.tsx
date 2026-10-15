import React from 'react';
import { CelestialBody } from '../types';
import { Volume2, VolumeX, RotateCcw, Target, Play, Pause, Compass } from 'lucide-react';
import { sound } from '../audio/soundEngine';

interface PerimeterHUDProps {
  systemName: string;
  bodies: CelestialBody[];
  simTime: number;
  asteroidCount: number;
  activeAsteroidSpeed: number;
  activeAsteroidGForce: number;
  activeAsteroidEnergyMT: number;
  activeAsteroidDistClosest: number;
  activeAsteroidClosestName: string;
  slingshotBoost: number;
  isAiming: boolean;
  aimSpeed: number;
  isPaused: boolean;
  followTargetId: string | 'asteroid' | null;
  onFollowTargetChange: (targetId: string | 'asteroid' | null) => void;
  onTogglePause: () => void;
  onResetSystem: () => void;
  onClearAsteroids: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  onOpenAnalysis: () => void;
  onOpenMissions: () => void;
  lastImpactCount: number;
  showVelocityHub?: boolean;
  onToggleVelocityHub?: () => void;
}

export const PerimeterHUD: React.FC<PerimeterHUDProps> = ({
  systemName,
  bodies,
  simTime,
  asteroidCount,
  activeAsteroidSpeed,
  activeAsteroidGForce,
  activeAsteroidEnergyMT,
  activeAsteroidDistClosest,
  activeAsteroidClosestName,
  slingshotBoost,
  isAiming,
  aimSpeed,
  isPaused,
  followTargetId,
  onFollowTargetChange,
  onTogglePause,
  onResetSystem,
  onClearAsteroids,
  isMuted,
  onToggleMute,
  onOpenAnalysis,
  onOpenMissions,
  lastImpactCount,
  showVelocityHub,
  onToggleVelocityHub,
}) => {
  const formatEnergy = (mt: number) => {
    if (mt < 0.001) return '0.00 MT';
    if (mt < 1000) return `${mt.toFixed(2)} MT`;
    if (mt < 1e6) return `${(mt / 1000).toFixed(2)} GT`;
    return `${(mt / 1e6).toFixed(2)} TT`;
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-4 sm:p-6 overflow-hidden">
      {/* Top Cluster Bar */}
      <div className="flex items-start justify-between gap-4">
        {/* Top-Left: System Telemetry Cluster */}
        <div className="pointer-events-auto bg-gray-950/80 border border-gray-800/80 rounded-xl p-3.5 shadow-2xl backdrop-blur-none max-w-xs text-xs font-mono">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-800/70">
            <span className="text-cyan-400 font-semibold tracking-wider uppercase text-[11px] truncate">
              {systemName}
            </span>
            <span className="text-gray-400 text-[10px] bg-gray-900 px-1.5 py-0.5 rounded border border-gray-800">
              {bodies.length} BODIES
            </span>
          </div>

          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-gray-300">
            <div>
              <span className="text-gray-400 block text-[10px]">SIM EPOCH</span>
              <span className="text-gray-100 font-medium tabular-nums">
                T+{(simTime * 2.4).toFixed(1)} yr
              </span>
            </div>

            <div>
              <span className="text-gray-400 block text-[10px]">ACTIVE ASTEROIDS</span>
              <span className="text-cyan-300 font-semibold tabular-nums">
                {asteroidCount} IN FLIGHT
              </span>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-gray-800/60">
            <button
              onClick={onTogglePause}
              title="Pause/Play Simulation (Space)"
              className="p-1.5 rounded-lg bg-gray-900 hover:bg-gray-800 text-gray-300 hover:text-white border border-gray-800 transition-colors cursor-pointer"
            >
              {isPaused ? <Play className="w-3.5 h-3.5 text-amber-400" /> : <Pause className="w-3.5 h-3.5 text-cyan-400" />}
            </button>

            <button
              onClick={onResetSystem}
              title="Reset System to Epoch Zero (R)"
              className="p-1.5 rounded-lg bg-gray-900 hover:bg-gray-800 text-gray-300 hover:text-white border border-gray-800 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onToggleMute}
              title="Mute Audio (M)"
              className="p-1.5 rounded-lg bg-gray-900 hover:bg-gray-800 text-gray-300 hover:text-white border border-gray-800 transition-colors cursor-pointer"
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5 text-red-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
            </button>

            {onToggleVelocityHub && (
              <button
                onClick={() => {
                  sound.playBeep(450, 0.04);
                  onToggleVelocityHub();
                }}
                title="Toggle Velocity Hub (V)"
                className={`px-2 py-1 rounded-md text-[10px] font-semibold tracking-wider transition-colors cursor-pointer border ${
                  showVelocityHub
                    ? 'bg-cyan-950/80 border-cyan-500/50 text-cyan-300'
                    : 'bg-gray-900 border-gray-800 text-gray-400 hover:text-gray-200'
                }`}
              >
                VELOCITY (V)
              </button>
            )}

            <button
              onClick={onOpenMissions}
              className="ml-auto px-2 py-1 rounded-md bg-blue-950/70 hover:bg-blue-900/80 text-blue-300 border border-blue-800/60 text-[10px] font-semibold tracking-wider transition-colors cursor-pointer"
            >
              MISSIONS
            </button>
          </div>
        </div>

        {/* Top-Right: Asteroid & Gravity Telemetry Cluster */}
        <div className="pointer-events-auto bg-gray-950/80 border border-gray-800/80 rounded-xl p-3.5 shadow-2xl backdrop-blur-none min-w-[210px] text-xs font-mono">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-800/70">
            <span className="text-amber-400 font-semibold tracking-wider text-[11px]">
              ASTEROID TELEMETRY
            </span>
            {asteroidCount > 0 ? (
              <span className="text-emerald-400 text-[10px] flex items-center gap-1 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span>
                TRACKING
              </span>
            ) : (
              <span className="text-gray-400 text-[10px]">STANDBY</span>
            )}
          </div>

          {isAiming ? (
            <div className="py-2 text-center">
              <span className="text-cyan-400 text-[11px] font-semibold block mb-0.5">SLINGSHOT AIMING</span>
              <span className="text-lg font-bold text-white tabular-nums">
                {(aimSpeed * 3).toFixed(1)} <span className="text-xs font-normal text-gray-400">km/s</span>
              </span>
              <span className="text-[10px] text-gray-400 block mt-1">Release mouse to launch</span>
            </div>
          ) : asteroidCount > 0 ? (
            <div className="space-y-1.5">
              <div className="flex justify-between items-baseline">
                <span className="text-gray-400 text-[10px]">ORBITAL SPEED:</span>
                <span className="text-cyan-300 font-bold tabular-nums">
                  {(activeAsteroidSpeed * 3).toFixed(1)} km/s
                </span>
              </div>

              <div className="flex justify-between items-baseline">
                <span className="text-gray-400 text-[10px]">G-FORCE LOAD:</span>
                <span className={`font-semibold tabular-nums ${activeAsteroidGForce > 15 ? 'text-rose-400' : 'text-gray-200'}`}>
                  {activeAsteroidGForce.toFixed(2)} G
                </span>
              </div>

              <div className="flex justify-between items-baseline">
                <span className="text-gray-400 text-[10px]">KINETIC ENERGY:</span>
                <span className="text-amber-300 font-semibold tabular-nums">
                  {formatEnergy(activeAsteroidEnergyMT)}
                </span>
              </div>

              <div className="flex justify-between items-baseline">
                <span className="text-gray-400 text-[10px]">SLINGSHOT BOOST:</span>
                <span className="text-emerald-400 font-semibold tabular-nums">
                  +{(slingshotBoost * 3).toFixed(1)} km/s
                </span>
              </div>

              <div className="flex justify-between items-baseline pt-1 border-t border-gray-800/60">
                <span className="text-gray-400 text-[10px]">NEAREST BODY:</span>
                <span className="text-gray-200 truncate max-w-[110px] text-right font-medium">
                  {activeAsteroidClosestName || 'Deep Space'}
                </span>
              </div>

              {activeAsteroidDistClosest < Infinity && (
                <div className="flex justify-between items-baseline text-[10px]">
                  <span className="text-gray-400">CLOSEST APPROACH:</span>
                  <span className="text-cyan-400 tabular-nums">
                    {(activeAsteroidDistClosest * 0.1).toFixed(2)} AU
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="py-2 text-center text-gray-400 text-xs">
              <p>No asteroid currently in flight.</p>
              <p className="text-[10px] text-cyan-400 mt-1">Click &amp; Drag or use Launch Dock</p>
            </div>
          )}

          {lastImpactCount > 0 && (
            <button
              onClick={onOpenAnalysis}
              className="w-full mt-2.5 py-1 px-2 rounded bg-rose-950/70 hover:bg-rose-900/80 text-rose-300 border border-rose-800/60 text-[10px] font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>VIEW IMPACT LOGS ({lastImpactCount})</span>
            </button>
          )}
        </div>
      </div>

      {/* Mid Area: Left Floating Quick Camera Target Selector */}
      <div className="flex justify-between items-end">
        <div className="pointer-events-auto bg-gray-950/70 border border-gray-800/70 rounded-xl p-2.5 shadow-xl text-xs font-mono max-w-[190px]">
          <div className="flex items-center gap-1.5 text-gray-400 text-[10px] mb-1.5 font-semibold">
            <Compass className="w-3 h-3 text-cyan-400" />
            CAMERA LOCK
          </div>
          <select
            value={followTargetId || 'free'}
            onChange={(e) => {
              const val = e.target.value;
              sound.playBeep(480, 0.04);
              onFollowTargetChange(val === 'free' ? null : (val as any));
            }}
            className="w-full bg-gray-900 border border-gray-700/80 rounded-lg px-2 py-1 text-gray-200 text-xs focus:outline-none focus:border-cyan-500 cursor-pointer"
          >
            <option value="free">Free Barycenter Orbit</option>
            {asteroidCount > 0 && <option value="asteroid">Active Asteroid</option>}
            {bodies.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        {/* Clear asteroid button when active */}
        {asteroidCount > 0 && (
          <div className="pointer-events-auto">
            <button
              onClick={() => {
                sound.playBeep(380, 0.06);
                onClearAsteroids();
              }}
              className="px-3 py-1.5 rounded-lg bg-gray-900/80 hover:bg-red-950/80 text-gray-400 hover:text-red-300 border border-gray-800 hover:border-red-800/80 text-xs font-mono transition-all cursor-pointer shadow-lg"
            >
              Clear Asteroid (C)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
