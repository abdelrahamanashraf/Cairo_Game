import React, { useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronUp, Circle, ClipboardList, Lock } from 'lucide-react';
import { DistrictId, HudSnapshot } from '../game/types';

interface ActiveMissionLogProps {
  hud: HudSnapshot;
}

interface MissionObjective {
  id: string;
  title: string;
  detail: string;
  state: 'completed' | 'active' | 'locked';
  progressPct?: number;
  counter?: string;
}

const DISTRICT_OBJECTIVE_COPY: Record<
  DistrictId,
  { waveTitle: string; locateTitle: string; defeatTitle: string }
> = {
  shubra: {
    waveTitle: 'Neutralize Henchmen in Shubra',
    locateTitle: 'Locate El-Ameen',
    defeatTitle: 'Defeat El-Ameen at the Precinct',
  },
  old_cairo: {
    waveTitle: 'Neutralize Enforcers in El-Sabbatiya',
    locateTitle: 'Locate El-Moallem Zarzour',
    defeatTitle: 'Defeat El-Moallem Zarzour',
  },
  zamalek: {
    waveTitle: 'Sweep Contraband Patrols on Nile Corniche',
    locateTitle: 'Locate Colonel El-Sayed',
    defeatTitle: 'Defeat Colonel El-Sayed in Zamalek',
  },
  khan_el_khalili: {
    waveTitle: 'Clear Bazaar Guards in Khan El-Khalili',
    locateTitle: 'Locate El-Hagg Mansour',
    defeatTitle: 'Defeat El-Hagg Mansour at Al-Azhar Arch',
  },
  giza_plateau: {
    waveTitle: 'Neutralize Checkpoint Squad at Giza Plateau',
    locateTitle: 'Locate Captain Khafre',
    defeatTitle: 'Defeat Captain Khafre by the Pyramids',
  },
  maadi: {
    waveTitle: 'Breach Convoy Guards in Maadi Degla',
    locateTitle: 'Locate The Degla Handler',
    defeatTitle: 'Neutralize The Degla Handler',
  },
  sheikh_zayed: {
    waveTitle: 'Clear Villa Guards in Sheikh Zayed',
    locateTitle: 'Locate El-Basha El-Hefny',
    defeatTitle: 'Neutralize El-Basha El-Hefny',
  },
  new_capital: {
    waveTitle: 'Clear Plaza Guards at Iconic Tower',
    locateTitle: 'Locate The Syndicate Architect',
    defeatTitle: 'Defeat The Syndicate Architect',
  },
};

export const ActiveMissionLog: React.FC<ActiveMissionLogProps> = ({ hud }) => {
  const [collapsed, setCollapsed] = useState(false);

  const copy = DISTRICT_OBJECTIVE_COPY[hud.districtId];
  const waveCleared =
    hud.phase === 'wave1'
      ? Math.max(0, hud.totalWaveEnemies - hud.enemiesRemaining)
      : hud.totalWaveEnemies;
  const wavePct = Math.min(100, Math.round((waveCleared / Math.max(1, hud.totalWaveEnemies)) * 100));

  const bossDamagePct =
    hud.bossMaxHp > 0
      ? Math.min(100, Math.max(0, Math.round(((hud.bossMaxHp - hud.bossHp) / hud.bossMaxHp) * 100)))
      : 0;

  const isPostWave = hud.phase === 'boss_intro' || hud.phase === 'boss_fight' || hud.phase === 'victory';
  const isBossEngaged = hud.phase === 'boss_fight' || hud.phase === 'victory';

  const objectives: MissionObjective[] = [
    {
      id: 'wave',
      title: copy.waveTitle,
      detail: isPostWave ? 'Courtyard patrol cleared' : `${hud.enemiesRemaining} hostiles patrolling`,
      state: isPostWave ? 'completed' : 'active',
      progressPct: wavePct,
      counter: `${waveCleared}/${hud.totalWaveEnemies}`,
    },
    {
      id: 'locate',
      title: copy.locateTitle,
      detail:
        hud.phase === 'boss_intro'
          ? 'Emerging from north entrance'
          : isBossEngaged
            ? 'Target acquired in sector'
            : 'Clear patrol wave to draw out boss',
      state: isBossEngaged ? 'completed' : hud.phase === 'boss_intro' ? 'active' : 'locked',
      counter: isBossEngaged ? 'FOUND' : hud.phase === 'boss_intro' ? 'ALERT' : 'LOCKED',
    },
    {
      id: 'defeat',
      title: copy.defeatTitle,
      detail:
        hud.phase === 'victory'
          ? 'District secured'
          : hud.phase === 'boss_fight'
            ? `Phase ${hud.bossPhase} · ${hud.bossHp} HP remaining`
            : 'Awaiting boss engagement',
      state: hud.phase === 'victory' ? 'completed' : hud.phase === 'boss_fight' ? 'active' : 'locked',
      progressPct: hud.phase === 'boss_fight' ? bossDamagePct : hud.phase === 'victory' ? 100 : undefined,
      counter: hud.phase === 'victory' ? 'DONE' : hud.phase === 'boss_fight' ? `${bossDamagePct}%` : 'LOCKED',
    },
  ];

  const completedCount = objectives.filter((o) => o.state === 'completed').length;

  return (
    <section
      aria-label="Active Mission Log"
      className="pointer-events-none absolute right-4 top-16 z-10 w-[260px] rounded-lg border border-white/12 bg-[#0D0F12]/90 text-[#F3F4F6]"
    >
      {/* Header with compact collapse toggle */}
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
          <ClipboardList className="h-3.5 w-3.5 text-[#E89B3C]" />
          <span>Active Mission Log</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] tabular-nums text-[#E89B3C]">
            {completedCount}/{objectives.length}
          </span>
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? 'Expand Mission Log' : 'Collapse Mission Log'}
            className="pointer-events-auto flex h-6 w-6 items-center justify-center rounded border border-white/10 bg-[#161A20] text-[#9CA3AF] transition-colors hover:border-[#E89B3C] hover:text-white"
          >
            {collapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Objectives List */}
      {!collapsed && (
        <div className="space-y-2 border-t border-white/10 px-3 py-2.5">
          {objectives.map((obj) => (
            <div key={obj.id} className={obj.state === 'locked' ? 'opacity-55' : 'opacity-100'}>
              <div className="flex items-start gap-2">
                {obj.state === 'completed' ? (
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                ) : obj.state === 'active' ? (
                  <Circle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#E89B3C]" />
                ) : (
                  <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#6B7280]" />
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span
                      className={`text-[11px] font-medium leading-snug ${
                        obj.state === 'completed'
                          ? 'text-[#9CA3AF] line-through'
                          : obj.state === 'active'
                            ? 'text-white'
                            : 'text-[#9CA3AF]'
                      }`}
                    >
                      {obj.title}
                    </span>
                    {obj.counter && (
                      <span
                        className={`shrink-0 font-mono text-[10px] tabular-nums ${
                          obj.state === 'completed'
                            ? 'text-emerald-400'
                            : obj.state === 'active'
                              ? 'text-[#E89B3C]'
                              : 'text-[#6B7280]'
                        }`}
                      >
                        {obj.counter}
                      </span>
                    )}
                  </div>

                  <div className="mt-0.5 text-[10px] text-[#9CA3AF]">{obj.detail}</div>

                  {obj.progressPct !== undefined && obj.state === 'active' && (
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full bg-[#E89B3C] transition-all duration-150"
                        style={{ width: `${obj.progressPct}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
