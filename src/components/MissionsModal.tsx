import React from 'react';
import { ChallengeMission } from '../types';
import { CHALLENGE_MISSIONS } from '../simulation/physics';
import { X, Trophy, CheckCircle2, ChevronRight } from 'lucide-react';
import { sound } from '../audio/soundEngine';

interface MissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  completedMissionIds: string[];
  onStartMission: (mission: ChallengeMission) => void;
}

export const MissionsModal: React.FC<MissionsModalProps> = ({
  isOpen,
  onClose,
  completedMissionIds,
  onStartMission,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-none pointer-events-auto">
      <div className="bg-gray-950 border border-gray-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl font-mono text-xs text-gray-200 animate-in fade-in zoom-in-95 duration-150 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-800 shrink-0">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-bold tracking-wider text-amber-300 uppercase">
              Gravitational Research Missions
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

        {/* List of Challenges */}
        <div className="space-y-3 overflow-y-auto pr-1 flex-1">
          {CHALLENGE_MISSIONS.map((mission) => {
            const isCompleted = completedMissionIds.includes(mission.id);
            return (
              <div
                key={mission.id}
                className={`p-3.5 rounded-xl border transition-all ${
                  isCompleted
                    ? 'bg-emerald-950/20 border-emerald-500/40'
                    : 'bg-gray-900/60 border-gray-800 hover:border-gray-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0"></span>
                    )}
                    <span className="font-bold text-gray-100 text-[13px]">{mission.title}</span>
                  </div>

                  <span className="px-2 py-0.5 rounded bg-gray-800 text-[10px] text-amber-300 border border-amber-500/30">
                    Badge: {mission.rewardBadge}
                  </span>
                </div>

                <p className="text-gray-300 font-sans text-xs leading-relaxed mb-2">
                  {mission.goalDescription}
                </p>

                <div className="p-2 rounded bg-black/40 border border-gray-800/80 text-[11px] text-cyan-300 font-sans mb-3">
                  <span className="font-bold font-mono text-[10px] text-cyan-400 uppercase">Flight Dynamics Hint: </span>
                  {mission.hint}
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      sound.playBeep(520, 0.05);
                      onStartMission(mission);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-bold flex items-center gap-1.5 text-xs transition-colors cursor-pointer"
                  >
                    <span>LOAD MISSION SETUP</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-gray-800 flex items-center justify-between shrink-0">
          <span className="text-gray-400 text-[11px]">
            {completedMissionIds.length} of {CHALLENGE_MISSIONS.length} completed
          </span>
          <button
            onClick={() => {
              sound.playBeep(440, 0.04);
              onClose();
            }}
            className="px-4 py-1.5 rounded-lg bg-gray-900 hover:bg-gray-800 text-gray-200 cursor-pointer border border-gray-700 text-xs"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};
