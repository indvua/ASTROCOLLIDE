import React, { useState } from 'react';
import { Gauge, Zap, Orbit, ShieldAlert, ChevronDown, ChevronUp, Flame, X } from 'lucide-react';
import { sound } from '../audio/soundEngine';

interface VelocityHubProps {
  velocityMagnitude: number; // in simulation units/s
  vx: number;
  vy: number;
  vz: number;
  escapeVelocity: number; // local escape speed from nearest body
  nearestBodyName: string;
  nearestBodyDist: number;
  gForce: number;
  slingshotDeltaV: number;
  kineticEnergyMT: number;
  isImpactSlowMoActive: boolean;
  onToggleImpactSlowMo: () => void;
  isManualSlowMo: boolean;
  onToggleManualSlowMo: () => void;
  onClose?: () => void;
}

export const VelocityHub: React.FC<VelocityHubProps> = ({
  velocityMagnitude,
  vx,
  vy,
  vz,
  escapeVelocity,
  nearestBodyName,
  nearestBodyDist,
  gForce,
  slingshotDeltaV,
  kineticEnergyMT,
  isImpactSlowMoActive,
  onToggleImpactSlowMo,
  isManualSlowMo,
  onToggleManualSlowMo,
  onClose,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Scaled values for realistic readout
  const realSpeedKps = velocityMagnitude * 3.0;
  const realEscKps = escapeVelocity * 3.0;
  const speedRatio = escapeVelocity > 0 ? velocityMagnitude / escapeVelocity : 0;

  // Trajectory classification
  let orbitStatus = 'UNBOUND';
  let statusColor = 'text-gray-400 border-gray-700';
  if (velocityMagnitude <= 0.01) {
    orbitStatus = 'STATIONARY / REST';
    statusColor = 'text-gray-400 border-gray-800';
  } else if (speedRatio > 1.05) {
    orbitStatus = 'HYPERBOLIC ESCAPE (v > v_esc)';
    statusColor = 'text-emerald-400 border-emerald-500/40 bg-emerald-950/30';
  } else if (speedRatio >= 0.95 && speedRatio <= 1.05) {
    orbitStatus = 'PARABOLIC CAPTURE THRESHOLD';
    statusColor = 'text-amber-400 border-amber-500/40 bg-amber-950/30';
  } else {
    orbitStatus = 'GRAVITATIONALLY BOUND ORBIT';
    statusColor = 'text-cyan-400 border-cyan-500/40 bg-cyan-950/30';
  }

  // Impact destruction benchmark
  let destructionTier = 'Micro-Meteoroid';
  let tierColor = 'text-gray-400';
  if (kineticEnergyMT > 1e9) {
    destructionTier = 'Theia Moon-Forming Planetary Blast (Class V)';
    tierColor = 'text-rose-400';
  } else if (kineticEnergyMT > 1e7) {
    destructionTier = 'Chicxulub Dinosaur Extinction Event (Class IV)';
    tierColor = 'text-red-400';
  } else if (kineticEnergyMT > 1e4) {
    destructionTier = 'Continental Crust Cracker (Class III)';
    tierColor = 'text-amber-400';
  } else if (kineticEnergyMT > 10) {
    destructionTier = 'Tunguska Siberian Airburst (Class II)';
    tierColor = 'text-yellow-400';
  } else if (kineticEnergyMT > 0.001) {
    destructionTier = 'Chelyabinsk Regional Bolide (Class I)';
    tierColor = 'text-cyan-400';
  }

  return (
    <div className="pointer-events-auto bg-gray-950/90 border border-gray-800/90 rounded-2xl p-3.5 shadow-2xl backdrop-blur-none font-mono text-xs text-gray-200 w-72 sm:w-80 transition-all select-none">
      {/* Header with collapse */}
      <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-gray-800/80">
        <div className="flex items-center gap-2">
          <Gauge className="w-4 h-4 text-cyan-400" />
          <span className="font-bold tracking-wider text-cyan-300 uppercase text-[11px]">
            VELOCITY HUB
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              sound.playBeep(450, 0.03);
              setIsCollapsed(!isCollapsed);
            }}
            title={isCollapsed ? "Expand Velocity Hub" : "Minimize Velocity Hub"}
            className="p-1 rounded-md hover:bg-gray-800 text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>

          {onClose && (
            <button
              onClick={() => {
                sound.playBeep(400, 0.03);
                onClose();
              }}
              title="Close Velocity Hub (V to toggle)"
              className="p-1 rounded-md hover:bg-gray-800 text-gray-400 hover:text-red-400 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {!isCollapsed && (
        <div className="space-y-3">
          {/* Main Velocity Readout */}
          <div className="bg-gray-900/70 border border-gray-800 rounded-xl p-2.5 text-center">
            <span className="text-gray-400 text-[10px] uppercase tracking-wider block mb-0.5">
              CURRENT VELOCITY MAGNITUDE
            </span>
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-2xl font-black text-white tabular-nums tracking-tight">
                {realSpeedKps.toFixed(1)}
              </span>
              <span className="text-xs font-semibold text-cyan-400">km/s</span>
            </div>
            <div className="text-[10px] text-gray-400 tabular-nums mt-0.5">
              ({velocityMagnitude.toFixed(2)} sim units/s)
            </div>

            {/* 3D Vector components */}
            <div className="grid grid-cols-3 gap-1 mt-2 pt-2 border-t border-gray-800/60 text-[10px]">
              <div>
                <span className="text-gray-500 block">V_x</span>
                <span className="text-gray-300 font-medium tabular-nums">{(vx * 3).toFixed(1)}</span>
              </div>
              <div>
                <span className="text-gray-500 block">V_y</span>
                <span className="text-gray-300 font-medium tabular-nums">{(vy * 3).toFixed(1)}</span>
              </div>
              <div>
                <span className="text-gray-500 block">V_z</span>
                <span className="text-gray-300 font-medium tabular-nums">{(vz * 3).toFixed(1)}</span>
              </div>
            </div>
          </div>

          {/* Escape Velocity Gauge Bar */}
          <div>
            <div className="flex justify-between items-baseline text-[10px] mb-1">
              <span className="text-gray-400">ESCAPE VELOCITY (V_esc):</span>
              <span className="text-amber-300 font-bold tabular-nums">
                {realEscKps > 0 ? `${realEscKps.toFixed(1)} km/s` : 'N/A'}
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2 bg-gray-900 rounded-full overflow-hidden border border-gray-800 relative">
              <div
                className={`h-full transition-all duration-150 ${
                  speedRatio > 1.0 ? 'bg-gradient-to-r from-cyan-400 to-emerald-400' : 'bg-cyan-500'
                }`}
                style={{ width: `${Math.min(100, (speedRatio / 1.5) * 100)}%` }}
              />
              {/* Marker at 1.0 escape threshold */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-amber-400 shadow-sm"
                style={{ left: `${(1.0 / 1.5) * 100}%` }}
                title="Escape threshold"
              />
            </div>

            {/* Orbit Status pill */}
            <div className={`mt-1.5 px-2 py-1 rounded-md text-[10px] font-bold text-center border ${statusColor}`}>
              {orbitStatus}
            </div>
          </div>

          {/* Gravitational Slingshot Boost & G-Force */}
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="bg-gray-900/60 p-2 rounded-lg border border-gray-800">
              <span className="text-gray-400 text-[10px] block flex items-center gap-1">
                <Zap className="w-3 h-3 text-emerald-400" />
                SLINGSHOT ΔV
              </span>
              <span className="text-emerald-400 font-bold tabular-nums">
                +{(slingshotDeltaV * 3).toFixed(1)} km/s
              </span>
            </div>

            <div className="bg-gray-900/60 p-2 rounded-lg border border-gray-800">
              <span className="text-gray-400 text-[10px] block flex items-center gap-1">
                <Orbit className="w-3 h-3 text-cyan-400" />
                GRAVITY G-LOAD
              </span>
              <span className={`font-bold tabular-nums ${gForce > 10 ? 'text-rose-400' : 'text-gray-200'}`}>
                {gForce.toFixed(1)} G
              </span>
            </div>
          </div>

          {/* Kinetic Energy & Destruction Class */}
          <div className="p-2 rounded-lg bg-gray-900/50 border border-gray-800">
            <div className="flex justify-between items-baseline mb-0.5">
              <span className="text-gray-400 text-[10px]">KINETIC YIELD:</span>
              <span className="text-rose-400 font-bold tabular-nums text-[11px]">
                {kineticEnergyMT > 1000
                  ? `${(kineticEnergyMT / 1000).toFixed(1)} GT TNT`
                  : `${kineticEnergyMT.toFixed(1)} MT TNT`}
              </span>
            </div>
            <div className={`text-[10px] font-semibold truncate ${tierColor}`}>
              {destructionTier}
            </div>
          </div>

          {/* Impact Slow-Mo and Breakup Toggles */}
          <div className="pt-2 border-t border-gray-800/80 flex items-center justify-between gap-2">
            <button
              onClick={() => {
                sound.playBeep(isImpactSlowMoActive ? 380 : 560, 0.04);
                onToggleImpactSlowMo();
              }}
              className={`flex-1 py-1 px-2 rounded-lg border text-[10px] font-semibold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                isImpactSlowMoActive
                  ? 'bg-rose-950/40 border-rose-500/60 text-rose-300'
                  : 'bg-gray-900 border-gray-800 text-gray-400'
              }`}
            >
              <Flame className="w-3 h-3 text-rose-400" />
              <span>IMPACT SLOW-MO: {isImpactSlowMoActive ? 'ON' : 'OFF'}</span>
            </button>

            <button
              onClick={() => {
                sound.playBeep(isManualSlowMo ? 380 : 540, 0.04);
                onToggleManualSlowMo();
              }}
              className={`py-1 px-2.5 rounded-lg border text-[10px] font-semibold transition-all cursor-pointer ${
                isManualSlowMo
                  ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200'
                  : 'bg-gray-900 border-gray-800 text-gray-400 hover:text-gray-200'
              }`}
              title="Manually slow down time to inspect orbits"
            >
              0.1x SLOW
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
