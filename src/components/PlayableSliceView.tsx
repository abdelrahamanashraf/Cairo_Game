import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  ChevronDown,
  ChevronUp,
  Crosshair,
  RotateCcw,
  Skull,
  Smartphone,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { CairoSliceEngine } from '../game/cairoEngine';
import { GameSettings, HudSnapshot } from '../game/types';
import { DualThumbOverlay } from './DualThumbOverlay';

interface PlayableSliceViewProps {
  active: boolean;
  onOpenBlueprint: () => void;
  onEngineReady?: (actions: { deploy: () => void; jumpBoss: () => void }) => void;
}

const INITIAL_HUD: HudSnapshot = {
  phase: 'briefing',
  playerHp: 100,
  playerMaxHp: 100,
  ammo: 30,
  magSize: 30,
  reserveAmmo: 150,
  isReloading: false,
  reloadProgress: 0,
  stance: 'standing',
  isAds: false,
  enemiesRemaining: 5,
  totalWaveEnemies: 5,
  eliminations: 0,
  shotsFired: 0,
  shotsHit: 0,
  elapsedSeconds: 0,
  hitMarkerKind: 'none',
  damageFlash: 0,
  autoAimLocked: false,
  bossActive: false,
  bossName: 'El-Ameen',
  bossTitle: 'Corrupt Precinct Officer · Shubra Sector',
  bossHp: 460,
  bossMaxHp: 460,
  bossPhase: 1,
  announcement: '',
  pointerLocked: false,
  fpsEstimate: 60,
  isSoftwareGl: false,
  nearbyPickupLabel: null,
};

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const PlayableSliceView: React.FC<PlayableSliceViewProps> = ({
  active,
  onOpenBlueprint,
  onEngineReady,
}) => {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<CairoSliceEngine | null>(null);

  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [settings, setSettings] = useState<GameSettings>(() => {
    const isCoarsePointer = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
    return {
      autoAimAssist: true,
      showTouchControls: isCoarsePointer,
      muted: false,
      cameraPreset: 'shoulder',
    };
  });

  // Mount Three.js engine once inside isolated ref container
  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    const engine = new CairoSliceEngine(mount, (snapshot) => {
      setHud(snapshot);
    });
    engineRef.current = engine;
    engine.updateSettings(settings);

    onEngineReady?.({
      deploy: () => engine.startMission(),
      jumpBoss: () => engine.jumpToBossFight(),
    });

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pause/resume when switching between Playable Slice and Blueprint Hub
  useEffect(() => {
    engineRef.current?.setPaused(!active);
  }, [active]);

  // Keyboard shortcut H to toggle bottom control dock
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!active) return;
      if (e.code === 'KeyH') {
        setDockCollapsed((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active]);

  const updateSetting = <K extends keyof GameSettings>(key: K, value: GameSettings[K]) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      engineRef.current?.updateSettings(next);
      return next;
    });
  };

  const isCombat = hud.phase === 'wave1' || hud.phase === 'boss_intro' || hud.phase === 'boss_fight';
  const accuracy = hud.shotsFired > 0 ? Math.round((hud.shotsHit / hud.shotsFired) * 100) : 0;
  const hpPct = Math.max(0, Math.min(100, (hud.playerHp / hud.playerMaxHp) * 100));
  const bossPct = Math.max(0, Math.min(100, (hud.bossHp / Math.max(1, hud.bossMaxHp)) * 100));

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#161311]">
      {/* Isolated WebGL Canvas Container — zero React children inside */}
      <div ref={canvasMountRef} className="absolute inset-0 h-full w-full" />

      {/* Damage Flash Scrim */}
      {hud.damageFlash > 0.02 && (
        <div
          style={{ opacity: hud.damageFlash * 0.45 }}
          className="pointer-events-none absolute inset-0 z-10 border-[14px] border-[#DC4A3D]/80 bg-[#DC4A3D]/15"
        />
      )}

      {/* ACTIVE COMBAT HUD (Strictly perimeter-aligned — 100% unobstructed center viewport) */}
      {isCombat && (
        <>
          {/* Top-Left Compact Vitals & Objective */}
          <div className="pointer-events-none absolute left-5 top-5 z-20 flex flex-col gap-2">
            <div className="w-56 rounded-lg border border-white/12 bg-[#0D0F12]/85 px-3.5 py-2.5">
              <div className="flex items-center justify-between text-xs text-[#D1D5DB]">
                <span className="font-display font-semibold tracking-wide text-white">OPERATIVE HP</span>
                <span className="font-mono tabular-nums text-[#F3F4F6]">
                  {hud.playerHp} / {hud.playerMaxHp}
                </span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-sm bg-white/10">
                <div
                  style={{ width: `${hpPct}%` }}
                  className={`h-full transition-[width] duration-150 ${
                    hpPct <= 30 ? 'bg-[#DC4A3D]' : 'bg-[#E89B3C]'
                  }`}
                />
              </div>
              <div className="mt-2 flex items-center gap-2 text-[11px] text-[#9CA3AF]">
                <span className="capitalize">{hud.stance}</span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">Hostiles: {hud.enemiesRemaining}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">{formatTime(hud.elapsedSeconds)}</span>
              </div>
            </div>

            {hud.nearbyPickupLabel && (
              <div className="rounded-md border border-[#E89B3C]/40 bg-[#0D0F12]/85 px-3 py-1.5 text-xs text-[#FDE68A]">
                Walk over to collect: {hud.nearbyPickupLabel}
              </div>
            )}
          </div>

          {/* Top-Center Boss Health Bar (El-Ameen) */}
          {hud.bossActive && (
            <div className="pointer-events-none absolute left-1/2 top-5 z-20 w-[min(460px,84vw)] -translate-x-1/2 rounded-lg border border-[#DC4A3D]/45 bg-[#0D0F12]/90 px-4 py-2.5">
              <div className="flex items-baseline justify-between gap-3">
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-sm font-bold tracking-wide text-white">
                    {hud.bossName}
                  </span>
                  <span className="text-xs text-[#9CA3AF]">{hud.bossTitle}</span>
                </div>
                <span className="font-mono text-xs tabular-nums text-[#FCA5A5]">
                  Phase {hud.bossPhase} · {hud.bossHp} HP
                </span>
              </div>
              <div className="mt-2 h-2.5 w-full overflow-hidden rounded-sm bg-white/10">
                <div
                  style={{ width: `${bossPct}%` }}
                  className="h-full bg-[#DC4A3D] transition-[width] duration-150"
                />
              </div>
            </div>
          )}

          {/* Top-Right Compact Weapon & Ammo Counter */}
          <div className="pointer-events-none absolute right-5 top-5 z-20 rounded-lg border border-white/12 bg-[#0D0F12]/85 px-4 py-2.5 text-right">
            <div className="text-[11px] text-[#9CA3AF]">
              Tactical Rifle · {hud.isAds ? 'ADS' : 'Hip Fire'}
            </div>
            <div className="mt-0.5 flex items-baseline justify-end gap-1.5 font-mono tabular-nums">
              <span className={`text-2xl font-semibold ${hud.ammo <= 6 ? 'text-[#DC4A3D]' : 'text-white'}`}>
                {hud.ammo}
              </span>
              <span className="text-sm text-[#9CA3AF]">/ {hud.reserveAmmo}</span>
            </div>
            {hud.isReloading ? (
              <div className="mt-1.5 h-1.5 w-32 overflow-hidden rounded-sm bg-white/10">
                <div
                  style={{ width: `${Math.round(hud.reloadProgress * 100)}%` }}
                  className="h-full bg-[#E89B3C]"
                />
              </div>
            ) : (
              <div className="mt-1 text-[11px] text-[#9CA3AF]">
                {settings.autoAimAssist
                  ? hud.autoAimLocked
                    ? 'Auto-Aim Locked'
                    : 'Auto-Aim Ready'
                  : 'Manual Aim'}
              </div>
            )}
          </div>

          {/* Tactical Event Announcement Banner (brief, unobtrusive) */}
          {hud.announcement && (
            <div className="pointer-events-none absolute left-1/2 top-24 z-20 -translate-x-1/2 rounded-md border border-[#E89B3C]/35 bg-[#0D0F12]/88 px-4 py-1.5 text-center text-xs font-medium text-[#FDE68A]">
              {hud.announcement}
            </div>
          )}

          {/* Center Dynamic Reticle + Hitmarker */}
          <div className="pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2">
            <div className="relative flex h-12 w-12 items-center justify-center">
              {/* Outer reticle ticks tighten on ADS */}
              <div
                className={`absolute h-2.5 w-0.5 transition-transform duration-150 ${
                  hud.autoAimLocked ? 'bg-[#E89B3C]' : 'bg-white/90'
                }`}
                style={{ transform: `translateY(${hud.isAds ? -7 : -13}px)` }}
              />
              <div
                className={`absolute h-2.5 w-0.5 transition-transform duration-150 ${
                  hud.autoAimLocked ? 'bg-[#E89B3C]' : 'bg-white/90'
                }`}
                style={{ transform: `translateY(${hud.isAds ? 7 : 13}px)` }}
              />
              <div
                className={`absolute h-0.5 w-2.5 transition-transform duration-150 ${
                  hud.autoAimLocked ? 'bg-[#E89B3C]' : 'bg-white/90'
                }`}
                style={{ transform: `translateX(${hud.isAds ? -7 : -13}px)` }}
              />
              <div
                className={`absolute h-0.5 w-2.5 transition-transform duration-150 ${
                  hud.autoAimLocked ? 'bg-[#E89B3C]' : 'bg-white/90'
                }`}
                style={{ transform: `translateX(${hud.isAds ? 7 : 13}px)` }}
              />
              <div
                className={`h-1 w-1 rounded-full ${
                  hud.autoAimLocked ? 'bg-[#E89B3C]' : 'bg-white'
                }`}
              />

              {/* Hitmarker X confirmation */}
              {hud.hitMarkerKind !== 'none' && (
                <div
                  className={`absolute h-5 w-5 rotate-45 border-2 ${
                    hud.hitMarkerKind === 'kill' || hud.hitMarkerKind === 'head'
                      ? 'border-[#DC4A3D]'
                      : 'border-[#FDE68A]'
                  }`}
                />
              )}
            </div>
          </div>

          {/* Dual-Thumb Mobile Virtual Controls Overlay */}
          <DualThumbOverlay
            visible={settings.showTouchControls}
            isAds={hud.isAds}
            isCrouching={hud.stance === 'crouching'}
            isSprinting={hud.stance === 'sprinting'}
            isReloading={hud.isReloading}
            onVirtualInput={(p) => engineRef.current?.setVirtualInput(p)}
            onLookDelta={(dx, dy) => engineRef.current?.addTouchLookDelta(dx, dy)}
            onToggleCrouch={() => engineRef.current?.toggleCrouch()}
            onReload={() => engineRef.current?.triggerReload()}
          />
        </>
      )}

      {/* MISSION BRIEFING OVERLAY (Live Golden-Hour Shubra Orbit visible behind) */}
      {hud.phase === 'briefing' && (
        <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-end bg-gradient-to-t from-[#0D0F12]/90 via-[#0D0F12]/25 to-transparent p-6 md:p-10">
          <div className="pointer-events-auto max-w-xl">
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-[#E89B3C]">
              <span>Level 1 Vertical Slice</span>
              <span aria-hidden="true">·</span>
              <span>Shubra / Downtown Cairo</span>
              <span aria-hidden="true">·</span>
              <span>Golden Hour</span>
            </div>
            <h1
              className="mt-2 font-display text-3xl font-bold tracking-tight text-white md:text-5xl"
              style={{ textWrap: 'balance' }}
            >
              Shubra Precinct Ambush
            </h1>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-[#D1D5DB]">
              Playtest the Phase 1 third-person mobile combat loop in a contained golden-hour Cairo block. Clear the
              precinct courtyard henchmen to confront El-Ameen, or switch to the UE5 Blueprint Hub for Cesium 3D Tiles
              tuning and C++ starter scripts.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#9CA3AF]">
              <span>WASD Move</span>
              <span aria-hidden="true">·</span>
              <span>Click / Drag Aim &amp; Fire</span>
              <span aria-hidden="true">·</span>
              <span>Right-Click ADS</span>
              <span aria-hidden="true">·</span>
              <span>C Crouch</span>
              <span aria-hidden="true">·</span>
              <span>Shift Sprint</span>
              <span aria-hidden="true">·</span>
              <span>R Reload</span>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => engineRef.current?.startMission()}
                className="rounded-lg bg-[#E89B3C] px-5 py-2.5 text-sm font-semibold text-[#0D0F12] transition-colors hover:bg-[#F2AD54] whitespace-nowrap shrink-0"
              >
                Deploy to Shubra
              </button>
              <button
                type="button"
                onClick={() => engineRef.current?.jumpToBossFight()}
                className="rounded-lg border border-white/20 bg-[#161A20]/90 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:border-[#E89B3C] whitespace-nowrap shrink-0"
              >
                Test Boss: El-Ameen
              </button>
              <button
                type="button"
                onClick={onOpenBlueprint}
                className="rounded-lg border border-white/15 bg-transparent px-4 py-2.5 text-sm font-medium text-[#D1D5DB] transition-colors hover:border-white/35 hover:text-white whitespace-nowrap shrink-0"
              >
                Open UE5 Blueprint Hub
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VICTORY / DEFEAT DEBRIEF OVERLAY */}
      {(hud.phase === 'victory' || hud.phase === 'defeat') && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#0D0F12]/72 p-4">
          <div className="w-full max-w-md rounded-xl border border-white/15 bg-[#161A20] p-6">
            <div className="text-xs font-medium text-[#E89B3C]">
              {hud.phase === 'victory' ? 'District Cleared · Level 1 Complete' : 'Operative Down · Shubra Sector'}
            </div>
            <h2 className="mt-1.5 font-display text-2xl font-bold text-white">
              {hud.phase === 'victory' ? 'El-Ameen Neutralized' : 'Precinct Ambush Failed'}
            </h2>
            <p className="mt-2 text-sm text-[#9CA3AF]">
              {hud.phase === 'victory'
                ? 'Shubra Precinct is secured. Next in the campaign roadmap: Old Cairo / El-Sabbatiya against El-Moallem Zarzour.'
                : 'Use Cairo taxis and concrete barricades for crouch cover, and watch for El-Ameen’s Phase 2 alley flankers.'}
            </p>

            <div className="mt-5 grid grid-cols-3 gap-3 border-y border-white/10 py-4">
              <div>
                <div className="text-[11px] text-[#9CA3AF]">Eliminations</div>
                <div className="mt-0.5 font-mono text-lg font-semibold tabular-nums text-white">
                  {hud.eliminations}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-[#9CA3AF]">Accuracy</div>
                <div className="mt-0.5 font-mono text-lg font-semibold tabular-nums text-white">
                  {accuracy}%
                </div>
              </div>
              <div>
                <div className="text-[11px] text-[#9CA3AF]">Time</div>
                <div className="mt-0.5 font-mono text-lg font-semibold tabular-nums text-white">
                  {formatTime(hud.elapsedSeconds)}
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => engineRef.current?.startMission()}
                className="flex-1 rounded-lg bg-[#E89B3C] px-4 py-2.5 text-sm font-semibold text-[#0D0F12] transition-colors hover:bg-[#F2AD54] whitespace-nowrap"
              >
                Redeploy to Shubra
              </button>
              <button
                type="button"
                onClick={onOpenBlueprint}
                className="rounded-lg border border-white/20 bg-[#0D0F12] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:border-[#E89B3C] whitespace-nowrap"
              >
                UE5 Blueprint Hub
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COLLAPSIBLE UNIFIED BOTTOM CONTROL DOCK (Active Combat only — zero side-panel occlusion) */}
      {isCombat && (
        <div className="pointer-events-none fixed bottom-4 left-1/2 z-30 flex -translate-x-1/2 flex-col items-center">
          <button
            type="button"
            onClick={() => setDockCollapsed((v) => !v)}
            className="pointer-events-auto mb-1.5 flex items-center gap-1.5 rounded-md border border-white/15 bg-[#0D0F12]/88 px-3 py-1 text-[11px] font-medium text-[#D1D5DB] transition-colors hover:border-[#E89B3C] hover:text-white whitespace-nowrap"
          >
            {dockCollapsed ? (
              <>
                <ChevronUp className="h-3.5 w-3.5" />
                <span>Show Controls (H)</span>
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5" />
                <span>Hide Controls (H)</span>
              </>
            )}
          </button>

          {!dockCollapsed && (
            <div className="pointer-events-auto flex max-w-[94vw] flex-wrap items-center justify-center gap-1.5 rounded-xl border border-white/12 bg-[#0D0F12]/90 px-2.5 py-2">
              <button
                type="button"
                onClick={() => updateSetting('autoAimAssist', !settings.autoAimAssist)}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  settings.autoAimAssist
                    ? 'bg-[#E89B3C] text-[#0D0F12]'
                    : 'bg-[#161A20] text-[#D1D5DB] hover:text-white'
                }`}
              >
                <Crosshair className="h-3.5 w-3.5" />
                <span>Auto-Aim: {settings.autoAimAssist ? 'On' : 'Off'}</span>
              </button>

              <button
                type="button"
                onClick={() => updateSetting('showTouchControls', !settings.showTouchControls)}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  settings.showTouchControls
                    ? 'bg-[#E89B3C] text-[#0D0F12]'
                    : 'bg-[#161A20] text-[#D1D5DB] hover:text-white'
                }`}
              >
                <Smartphone className="h-3.5 w-3.5" />
                <span>Mobile HUD</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  updateSetting('cameraPreset', settings.cameraPreset === 'shoulder' ? 'wide' : 'shoulder')
                }
                className="flex items-center gap-1.5 rounded-md bg-[#161A20] px-3 py-1.5 text-xs font-medium text-[#D1D5DB] transition-colors hover:text-white whitespace-nowrap shrink-0"
              >
                <Camera className="h-3.5 w-3.5" />
                <span>Cam: {settings.cameraPreset === 'shoulder' ? 'PUBG Shoulder' : 'Wide Tactical'}</span>
              </button>

              <button
                type="button"
                onClick={() => updateSetting('muted', !settings.muted)}
                className="flex items-center gap-1.5 rounded-md bg-[#161A20] px-3 py-1.5 text-xs font-medium text-[#D1D5DB] transition-colors hover:text-white whitespace-nowrap shrink-0"
              >
                {settings.muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                <span>{settings.muted ? 'Muted' : 'Audio'}</span>
              </button>

              <button
                type="button"
                onClick={() => engineRef.current?.jumpToBossFight()}
                className="flex items-center gap-1.5 rounded-md bg-[#2A1817] px-3 py-1.5 text-xs font-medium text-[#FCA5A5] transition-colors hover:bg-[#DC4A3D] hover:text-white whitespace-nowrap shrink-0"
              >
                <Skull className="h-3.5 w-3.5" />
                <span>Boss: El-Ameen</span>
              </button>

              <button
                type="button"
                onClick={() => engineRef.current?.startMission()}
                className="flex items-center gap-1.5 rounded-md bg-[#161A20] px-3 py-1.5 text-xs font-medium text-[#D1D5DB] transition-colors hover:text-white whitespace-nowrap shrink-0"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Restart</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
