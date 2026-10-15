import React, { useEffect } from 'react';
import { SYSTEM_PRESETS, CHALLENGE_MISSIONS } from '../simulation/physics';
import { SystemPreset, ChallengeMission } from '../types';
import { sound } from '../audio/soundEngine';

interface TitleScreenProps {
  onStart: () => void;
  selectedPreset: SystemPreset;
  onSelectPreset: (preset: SystemPreset) => void;
  onSelectMission?: (mission: ChallengeMission) => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  onStart,
  selectedPreset,
  onSelectPreset,
  onSelectMission,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        sound.playBeep(520, 0.12);
        onStart();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onStart]);

  return (
    <div className="absolute inset-0 pointer-events-none z-30 flex flex-col justify-between p-6 md:p-12 select-none overflow-hidden bg-gradient-to-t from-gray-950/80 via-transparent to-gray-950/60">
      {/* Top Header & Branding */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 text-xs font-mono tracking-wider">
          <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
          N-BODY GRAVITATIONAL PHYSICS LAB
        </div>

        <div className="text-right font-mono text-xs text-gray-400 hidden sm:block">
          <div>RK4 PRECISION INTEGRATOR</div>
          <div className="text-gray-500">RELATIVISTIC & TIDAL SIMULATION</div>
        </div>
      </div>

      {/* Hero Centerpiece: Bespoke SVG Title Lockup */}
      <div className="max-w-2xl mx-auto my-auto text-center pointer-events-auto">
        <div className="inline-block mb-4">
          <svg className="w-64 sm:w-80 h-auto mx-auto drop-shadow-[0_0_25px_rgba(56,189,248,0.45)]" viewBox="0 0 320 80" fill="none">
            {/* Orbital Rings in title SVG */}
            <ellipse cx="160" cy="40" rx="140" ry="26" stroke="#0284c7" strokeWidth="1.5" strokeDasharray="4 6" opacity="0.6" transform="rotate(-8 160 40)" />
            <ellipse cx="160" cy="40" rx="100" ry="18" stroke="#38bdf8" strokeWidth="1" opacity="0.4" transform="rotate(12 160 40)" />
            {/* Central gravitational well glow */}
            <circle cx="160" cy="40" r="14" fill="#38bdf8" fillOpacity="0.2" filter="blur(4px)" />
            <circle cx="160" cy="40" r="6" fill="#fef08a" />
            <circle cx="270" cy="48" r="4" fill="#38bdf8" />
            {/* Title Text */}
            <text x="160" y="36" textAnchor="middle" fill="#f8fafc" fontSize="22" fontFamily="ui-sans-serif, system-ui, sans-serif" fontWeight="800" letterSpacing="0.2em">
              ORBITAL IMPACT
            </text>
            <text x="160" y="56" textAnchor="middle" fill="#7dd3fc" fontSize="9" fontFamily="ui-monospace, monospace" letterSpacing="0.35em" fontWeight="600">
              GRAVITATIONAL SANDBOX
            </text>
          </svg>
        </div>

        <p className="text-gray-300 text-sm sm:text-base max-w-lg mx-auto mb-8 font-sans leading-relaxed">
          Slingshot asteroids across simulated solar systems, discover hyper-velocity gravitational assists, witness tidal disruptions, and study catastrophic planetary kinetic impacts.
        </p>

        {/* Primary Start CTA Button */}
        <div className="flex flex-col items-center gap-4">
          <button
            onClick={() => {
              sound.playBeep(520, 0.12);
              onStart();
            }}
            className="group relative px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-sm sm:text-base tracking-wide shadow-lg shadow-cyan-500/25 transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer flex items-center gap-3 border border-cyan-300/30"
          >
            <span>ENTER SIMULATION</span>
            <span className="font-mono text-xs px-2 py-0.5 rounded bg-black/30 border border-white/20 text-cyan-200">
              SPACE
            </span>
          </button>

          {/* Flat Control Hints */}
          <div className="font-mono text-xs text-gray-400 tracking-wider">
            Drag to Orbit · Scroll to Zoom · Click &amp; Drag Slingshot Launch · Space Pause
          </div>
        </div>

        {/* Preset Selector Grid on Title Screen */}
        <div className="mt-8 pt-6 border-t border-gray-800/80">
          <div className="text-xs font-mono text-gray-400 uppercase tracking-widest mb-3">
            Select Initial Solar System
          </div>
          <div className="flex flex-wrap justify-center gap-2 max-w-xl mx-auto">
            {SYSTEM_PRESETS.map((preset) => {
              const isSelected = preset.id === selectedPreset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => {
                    sound.playBeep(440, 0.05);
                    onSelectPreset(preset);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-sm shadow-cyan-500/20'
                      : 'bg-gray-900/60 border-gray-800 hover:border-gray-700 text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {preset.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Status bar */}
      <div className="flex items-center justify-between text-xs text-gray-400 font-mono">
        <div className="flex items-center gap-4">
          <span>v2.4 Gravitation Engine</span>
          <span className="hidden sm:inline">|</span>
          <span className="hidden sm:inline">Relativistic Physics &amp; Roche Limit</span>
        </div>
        <div>Press <span className="text-cyan-400">H</span> to Toggle UI in Sandbox</div>
      </div>
    </div>
  );
};
