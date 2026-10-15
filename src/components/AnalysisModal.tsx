import React from 'react';
import { ImpactEvent } from '../types';
import { X, Flame, ShieldAlert, Award, Compass, Zap } from 'lucide-react';
import { sound } from '../audio/soundEngine';

interface AnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  impacts: ImpactEvent[];
  maxSlingshotSpeed: number;
}

export const AnalysisModal: React.FC<AnalysisModalProps> = ({
  isOpen,
  onClose,
  impacts,
  maxSlingshotSpeed,
}) => {
  if (!isOpen) return null;

  const latestImpact = impacts.length > 0 ? impacts[impacts.length - 1] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-none pointer-events-auto">
      <div className="bg-gray-950 border border-gray-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl font-mono text-xs text-gray-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-rose-400" />
            <h2 className="text-sm font-bold tracking-wider text-rose-300 uppercase">
              Gravitational Impact &amp; Slingshot Analysis
            </h2>
          </div>
          <button
            onClick={() => {
              sound.playBeep(400, 0.04);
              onClose();
            }}
            className="p-1 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Slingshot Milestone telemetry */}
        <div className="bg-gray-900/70 border border-cyan-500/30 rounded-xl p-3.5 mb-4">
          <div className="flex items-center gap-2 text-cyan-300 font-bold mb-2">
            <Zap className="w-3.5 h-3.5" />
            <span>GRAVITATIONAL ASSIST RECORD</span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="text-gray-400">PEAK VELOCITY ACHIEVED:</span>
            <span className="text-base font-bold text-white tabular-nums">
              {(maxSlingshotSpeed * 3).toFixed(1)} km/s
            </span>
          </div>
          <div className="text-[11px] text-gray-400 font-sans mt-1">
            Planetary orbital momentum harvested via gravitational flyby.
          </div>
        </div>

        {/* Latest Planetary Impact Report */}
        {latestImpact ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-rose-400 font-bold">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>LATEST IMPACT TELEMETRY: {latestImpact.targetBodyName.toUpperCase()}</span>
            </div>

            {latestImpact.bodyDestroyed && (
              <div className="p-3 bg-red-950/40 border border-red-500/60 rounded-xl text-xs text-red-200 font-mono flex items-center gap-2.5">
                <Flame className="w-4 h-4 text-rose-400 shrink-0" />
                <div>
                  <span className="font-bold text-rose-300 block uppercase">
                    TOTAL CATACLYSMIC ANNIHILATION
                  </span>
                  <span className="text-[11px] text-gray-300">
                    Impact kinetic energy exceeded gravitational binding energy. {latestImpact.targetBodyName} was shattered into an expanding circumstellar / planetary debris ring field!
                  </span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-gray-900/60 p-2.5 rounded-lg border border-gray-800">
                <span className="text-gray-400 block text-[10px]">IMPACTOR</span>
                <span className="font-semibold text-gray-100">{latestImpact.asteroidName}</span>
              </div>

              <div className="bg-gray-900/60 p-2.5 rounded-lg border border-gray-800">
                <span className="text-gray-400 block text-[10px]">COLLISION SPEED</span>
                <span className="font-bold text-amber-300 tabular-nums">
                  {(latestImpact.velocityMagnitude * 3).toFixed(1)} km/s
                </span>
              </div>

              <div className="bg-gray-900/60 p-2.5 rounded-lg border border-gray-800">
                <span className="text-gray-400 block text-[10px]">KINETIC ENERGY YIELD</span>
                <span className="font-bold text-rose-400 tabular-nums">
                  {latestImpact.energyMegatons.toLocaleString(undefined, { maximumFractionDigits: 1 })} MT TNT
                </span>
              </div>

              <div className="bg-gray-900/60 p-2.5 rounded-lg border border-gray-800">
                <span className="text-gray-400 block text-[10px]">ESTIMATED CRATER</span>
                <span className="font-bold text-yellow-300 tabular-nums">
                  {latestImpact.craterDiameterKm.toFixed(1)} km diameter
                </span>
              </div>

              <div className="col-span-2 bg-gray-900/60 p-2.5 rounded-lg border border-gray-800">
                <span className="text-gray-400 block text-[10px]">PLANETARY ORBIT DEFLECTION (DELTA-V)</span>
                <span className="font-bold text-cyan-300 tabular-nums">
                  {latestImpact.planetDeflectionDeltaV.toFixed(6)} m/s orbital shift
                </span>
                <span className="text-[10px] text-gray-400 block mt-0.5 font-sans">
                  Momentum conservation transferred to {latestImpact.targetBodyName}&apos;s barycentric vector.
                </span>
              </div>
            </div>

            {/* Geological & Biosphere scale context */}
            <div className="p-3 bg-red-950/20 border border-red-800/30 rounded-xl text-[11px] text-red-200/90 font-sans">
              <span className="font-bold font-mono">SEISMIC &amp; ATMOSPHERIC ASSESSMENT: </span>
              {latestImpact.energyMegatons > 100000 ? (
                <span>Global mass extinction threshold. Severe shockwaves create antipode antipodal volcanism and multi-century thermal blanket.</span>
              ) : latestImpact.energyMegatons > 1000 ? (
                <span>Continental devastation. Superheated fireball ejecta re-enters planetary atmosphere causing global wildland fires.</span>
              ) : (
                <span>Regional cratering event equivalent to high-yield nuclear blast. Shockwave creates localized seismic disruption.</span>
              )}
            </div>
          </div>
        ) : (
          <div className="py-6 text-center text-gray-400 font-sans">
            No impacts recorded in this simulation run yet. Launch an asteroid on a collision course to analyze seismic and orbital perturbation data!
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 pt-3 border-t border-gray-800 flex justify-end">
          <button
            onClick={() => {
              sound.playBeep(440, 0.04);
              onClose();
            }}
            className="px-4 py-2 rounded-lg bg-gray-900 hover:bg-gray-800 text-gray-200 font-medium cursor-pointer border border-gray-700 text-xs"
          >
            DISMISS REPORT
          </button>
        </div>
      </div>
    </div>
  );
};
