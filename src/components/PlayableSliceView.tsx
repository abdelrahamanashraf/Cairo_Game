import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Activity,
  ChevronDown,
  ChevronUp,
  Code2,
  Crosshair,
  Gamepad2,
  Heart,
  MapPin,
  Music,
  Pause,
  Play,
  RotateCcw,
  ShieldAlert,
  Target,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { CAIRO_DISTRICTS } from '../data/ue5BlueprintData';
import { DISTRICT_ORDER } from '../game/cairoArenas';
import { CairoSliceEngine } from '../game/cairoEngine';
import { BlueprintSection, DistrictId, GameOverlay, GameSettings, HudSnapshot } from '../game/types';
import { ActiveMissionLog } from './ActiveMissionLog';
import { BlueprintHub } from './BlueprintHub';
import { CairoTacticalMap } from './CairoTacticalMap';
import { InputDebuggerOverlay, InputDebugTelemetry } from './InputDebuggerOverlay';
import { SoundtrackDeck } from './SoundtrackDeck';

const INITIAL_HUD: HudSnapshot = {
  phase: 'title',
  districtId: 'shubra',
  districtName: 'Shubra / Downtown Precinct',
  districtArabic: 'شبرا / وسط البلد',
  levelNumber: 1,
  playerHp: 100,
  playerMaxHp: 100,
  ammo: 30,
  magSize: 30,
  reserveAmmo: 180,
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
  bossWindup: false,
  announcement: '',
  pointerLocked: false,
  fpsEstimate: 60,
  isSoftwareGl: false,
  nearbyPickupLabel: null,
  playerX: 0,
  playerZ: 22,
};

export const PlayableSliceView: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<CairoSliceEngine | null>(null);

  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);
  const [overlay, setOverlay] = useState<GameOverlay>('none');
  const [blueprintSection, setBlueprintSection] = useState<BlueprintSection>('verdict');
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [clearedDistricts, setClearedDistricts] = useState<Record<DistrictId, boolean>>({
    shubra: false,
    old_cairo: false,
    zamalek: false,
    khan_el_khalili: false,
    giza_plateau: false,
    maadi: false,
    sheikh_zayed: false,
    new_capital: false,
  });

  const [settings, setSettings] = useState<GameSettings>(() => ({
    autoAimAssist: true,
    showTouchControls: typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches,
    muted: false,
    musicEnabled: true,
    cameraPreset: 'shoulder',
  }));

  // Virtual thumbstick & real-time input debugger state
  const joyBaseRef = useRef<HTMLDivElement | null>(null);
  const joyPointerId = useRef<number | null>(null);
  const [joyKnob, setJoyKnob] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const lookPointerId = useRef<number | null>(null);
  const lookLastPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [showInputDebugger, setShowInputDebugger] = useState(false);
  const [debugInput, setDebugInput] = useState({
    joyActive: false,
    moveX: 0,
    moveY: 0,
    lookActive: false,
    lookDx: 0,
    lookDy: 0,
    firing: false,
    sprint: false,
  });

  // Mount Three.js engine once
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const engine = new CairoSliceEngine(el, (snap) => {
      setHud(snap);
      if (snap.phase === 'victory') {
        setClearedDistricts((prev) => (prev[snap.districtId] ? prev : { ...prev, [snap.districtId]: true }));
      }
    });
    engineRef.current = engine;
    engine.updateSettings(settings);

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pause simulation cleanly whenever an in-game overlay modal is open
  useEffect(() => {
    engineRef.current?.setPaused(overlay !== 'none');
  }, [overlay]);

  const applySetting = useCallback((partial: Partial<GameSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      engineRef.current?.updateSettings(next);
      return next;
    });
  }, []);

  const deployToDistrict = useCallback((districtId: DistrictId) => {
    setOverlay('none');
    engineRef.current?.loadDistrict(districtId, true);
  }, []);

  const startCurrentMission = useCallback(() => {
    setOverlay('none');
    engineRef.current?.startMission();
  }, []);

  // Global keyboard shortcuts (Enter/Space to start on Title, Esc to Pause, M for Cairo Map, H for dock)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === 'Escape') {
        if (overlay !== 'none') {
          setOverlay('none');
        } else if (hud.phase === 'wave1' || hud.phase === 'boss_fight' || hud.phase === 'boss_intro') {
          setOverlay('pause');
        }
      } else if (e.code === 'KeyM' && overlay !== 'music' && overlay !== 'blueprint') {
        setOverlay((curr) => (curr === 'map' ? 'none' : 'map'));
      } else if (e.code === 'KeyH' && overlay === 'none') {
        setDockCollapsed((c) => !c);
      } else if (e.code === 'KeyI' && overlay === 'none') {
        setShowInputDebugger((d) => !d);
      } else if ((e.code === 'Enter' || e.code === 'Space') && hud.phase === 'title' && overlay === 'none') {
        e.preventDefault();
        startCurrentMission();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [hud.phase, overlay, startCurrentMission]);

  // Virtual Joystick handlers
  const handleJoyDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    joyPointerId.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);
    updateJoystickFromPointer(e.clientX, e.clientY);
  };

  const handleJoyMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (joyPointerId.current !== e.pointerId) return;
    e.stopPropagation();
    updateJoystickFromPointer(e.clientX, e.clientY);
  };

  const handleJoyUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (joyPointerId.current !== e.pointerId) return;
    e.stopPropagation();
    joyPointerId.current = null;
    setJoyKnob({ x: 0, y: 0 });
    setDebugInput((prev) => ({ ...prev, joyActive: false, moveX: 0, moveY: 0, sprint: false }));
    engineRef.current?.setVirtualInput({ moveX: 0, moveY: 0, sprint: false });
  };

  const updateJoystickFromPointer = (clientX: number, clientY: number) => {
    const base = joyBaseRef.current;
    if (!base) return;
    const rect = base.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const maxR = rect.width * 0.42;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > maxR) {
      dx = (dx / dist) * maxR;
      dy = (dy / dist) * maxR;
    }
    setJoyKnob({ x: dx, y: dy });
    const normX = dx / maxR;
    const normY = -dy / maxR;
    const isSprint = normY > 0.88;
    setDebugInput((prev) => ({ ...prev, joyActive: true, moveX: normX, moveY: normY, sprint: isSprint }));
    engineRef.current?.setVirtualInput({
      moveX: normX,
      moveY: normY,
      sprint: isSprint,
    });
  };

  const handleLookPadDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (lookPointerId.current !== null) return;
    lookPointerId.current = e.pointerId;
    lookLastPos.current = { x: e.clientX, y: e.clientY };
    setDebugInput((prev) => ({ ...prev, lookActive: true, lookDx: 0, lookDy: 0 }));
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleLookPadMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (lookPointerId.current !== e.pointerId) return;
    const dx = e.clientX - lookLastPos.current.x;
    const dy = e.clientY - lookLastPos.current.y;
    lookLastPos.current = { x: e.clientX, y: e.clientY };
    setDebugInput((prev) => ({ ...prev, lookActive: true, lookDx: dx, lookDy: dy }));
    engineRef.current?.addTouchLookDelta(dx, dy);
  };

  const handleLookPadUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (lookPointerId.current !== e.pointerId) return;
    lookPointerId.current = null;
    setDebugInput((prev) => ({ ...prev, lookActive: false, lookDx: 0, lookDy: 0 }));
  };

  const debuggerTelemetry: InputDebugTelemetry = {
    joyActive: debugInput.joyActive,
    moveX: debugInput.moveX,
    moveY: debugInput.moveY,
    lookActive: debugInput.lookActive,
    lookDx: debugInput.lookDx,
    lookDy: debugInput.lookDy,
    firing: debugInput.firing,
    ads: hud.isAds,
    crouch: hud.stance === 'crouching',
    reloading: hud.isReloading,
    sprint: debugInput.sprint || hud.stance === 'sprinting',
    autoAimLocked: hud.autoAimLocked,
    touchEnabled: settings.showTouchControls,
  };

  const isCombatActive = hud.phase === 'wave1' || hud.phase === 'boss_intro' || hud.phase === 'boss_fight';
  const accuracy = hud.shotsFired > 0 ? Math.round((hud.shotsHit / hud.shotsFired) * 100) : 0;
  const currentIdx = DISTRICT_ORDER.indexOf(hud.districtId);
  const nextDistrictId: DistrictId | null =
    currentIdx >= 0 && currentIdx < DISTRICT_ORDER.length - 1 ? DISTRICT_ORDER[currentIdx + 1] : null;
  const nextDistrictMeta = nextDistrictId ? CAIRO_DISTRICTS.find((d) => d.id === nextDistrictId) : null;

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#0D0F12] select-none">
      {/* Live Full-Viewport 3D WebGL Cairo Canvas */}
      <div ref={containerRef} className="h-full w-full" />

      {/* Damage Vignette Flash */}
      {hud.damageFlash > 0.02 && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            boxShadow: `inset 0 0 110px rgba(217, 56, 46, ${hud.damageFlash * 0.72})`,
          }}
        />
      )}

      {/* =====================================================================
          STATE 1: PURE FULL-VIEWPORT TITLE SCREEN OVER LIVE 3D CAIRO PAN
         ===================================================================== */}
      {hud.phase === 'title' && overlay === 'none' && (
        <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between p-6 md:p-10">
          {/* Top-Left District Status & Top-Right In-Game Utility Triggers */}
          <div className="flex items-start justify-between gap-4">
            <div className="pointer-events-auto rounded-lg border border-white/15 bg-[#0D0F12]/88 px-3.5 py-2 text-xs text-[#E5E7EB]">
              <div className="font-mono text-[11px] text-[#E89B3C]">
                LEVEL 0{hud.levelNumber} · {hud.districtArabic}
              </div>
              <div className="mt-0.5 font-display text-sm font-semibold text-white">{hud.districtName}</div>
            </div>

            <div className="pointer-events-auto flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setOverlay('map')}
                className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-[#0D0F12]/90 px-3 py-2 text-xs font-medium text-[#F3F4F6] transition-colors hover:border-[#E89B3C] hover:text-white"
              >
                <MapPin className="h-3.5 w-3.5 text-[#E89B3C]" />
                <span>Cairo Map</span>
              </button>
              <button
                type="button"
                onClick={() => setOverlay('music')}
                className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-[#0D0F12]/90 px-3 py-2 text-xs font-medium text-[#F3F4F6] transition-colors hover:border-[#E89B3C] hover:text-white"
              >
                <Music className="h-3.5 w-3.5 text-[#E89B3C]" />
                <span>Soundtrack</span>
              </button>
              <button
                type="button"
                onClick={() => setOverlay('blueprint')}
                className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-[#0D0F12]/90 px-3 py-2 text-xs font-medium text-[#F3F4F6] transition-colors hover:border-[#E89B3C] hover:text-white"
              >
                <Code2 className="h-3.5 w-3.5 text-[#E89B3C]" />
                <span>UE5 Blueprint</span>
              </button>
            </div>
          </div>

          {/* Center-Left Bespoke Inline SVG Title Lockup + Primary Play CTA */}
          <div className="pointer-events-auto max-w-[540px]">
            <svg
              viewBox="0 0 460 112"
              className="h-auto w-full max-w-[440px] drop-shadow-[0_6px_18px_rgba(0,0,0,0.75)]"
              role="img"
              aria-label="Cairo Precinct"
            >
              <defs>
                <linearGradient id="cairoGold" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#FDE68A" />
                  <stop offset="50%" stopColor="#E89B3C" />
                  <stop offset="100%" stopColor="#B86B1D" />
                </linearGradient>
              </defs>
              {/* Stylized Cairo Tactical Crest Emblem */}
              <polygon points="36,12 64,28 64,62 36,78 8,62 8,28" fill="#0D0F12" stroke="url(#cairoGold)" strokeWidth="2.5" />
              <polygon points="36,24 52,58 20,58" fill="none" stroke="url(#cairoGold)" strokeWidth="2" />
              <circle cx="36" cy="46" r="4" fill="#E89B3C" />
              <line x1="36" y1="16" x2="36" y2="26" stroke="#FDE68A" strokeWidth="1.5" />

              {/* Bold Display Title Typography */}
              <text
                x="82"
                y="54"
                fill="#FFFFFF"
                fontFamily="Chakra Petch, sans-serif"
                fontWeight="700"
                fontSize="44"
                letterSpacing="2.5"
              >
                CAIRO PRECINCT
              </text>
              <rect x="82" y="65" width="356" height="2" fill="url(#cairoGold)" />
              <text
                x="82"
                y="88"
                fill="#FDE68A"
                fontFamily="JetBrains Mono, monospace"
                fontWeight="500"
                fontSize="12"
                letterSpacing="3"
              >
                GREATER CAIRO 3D TACTICAL SHOOTER
              </text>
            </svg>

            {/* Primary Play CTA + Secondary District Selector */}
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={startCurrentMission}
                className="flex items-center gap-2.5 rounded-lg bg-[#E89B3C] px-7 py-3.5 text-sm font-bold tracking-wide text-[#0D0F12] shadow-lg transition-colors hover:bg-[#F2AD54]"
              >
                <Play className="h-4 w-4 fill-current" />
                <span>DEPLOY TO {hud.districtName.split('/')[0].split('—')[0].trim().toUpperCase()}</span>
              </button>

              <button
                type="button"
                onClick={() => setOverlay('map')}
                className="flex items-center gap-2 rounded-lg border border-white/20 bg-[#0D0F12]/90 px-4 py-3.5 text-xs font-semibold text-white transition-colors hover:border-[#E89B3C]"
              >
                <MapPin className="h-4 w-4 text-[#E89B3C]" />
                <span>Select District ({CAIRO_DISTRICTS.length} Levels)</span>
              </button>
            </div>
          </div>

          {/* Single Flat Control-Hint Line */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono text-[#E5E7EB]/90">
            <div className="rounded-md bg-[#0D0F12]/85 px-3 py-1.5 border border-white/10">
              WASD Move · Mouse Aim/Fire · RMB/Q ADS · C Crouch · R Reload · M Cairo Map · Esc Pause
            </div>
            <div className="pointer-events-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const next = !showInputDebugger;
                  setShowInputDebugger(next);
                  if (next && !settings.showTouchControls) {
                    applySetting({ showTouchControls: true });
                  }
                }}
                className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-[11px] transition-colors ${
                  showInputDebugger
                    ? 'border-[#E89B3C] bg-[#E89B3C]/20 text-[#FDE68A]'
                    : 'border-white/12 bg-[#0D0F12]/88 text-[#D1D5DB] hover:border-[#E89B3C] hover:text-white'
                }`}
              >
                <Activity className="h-3.5 w-3.5 text-[#E89B3C]" />
                <span>Input Debug: {showInputDebugger ? 'On' : 'Off'}</span>
              </button>
              <button
                type="button"
                onClick={() => applySetting({ showTouchControls: !settings.showTouchControls })}
                className="flex items-center gap-1.5 rounded-md border border-white/12 bg-[#0D0F12]/88 px-3 py-1.5 text-[11px] text-[#D1D5DB] hover:border-[#E89B3C] hover:text-white"
              >
                <Gamepad2 className="h-3.5 w-3.5 text-[#E89B3C]" />
                <span>Touch Controls: {settings.showTouchControls ? 'On' : 'Off'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          STATE 2: ACTIVE COMBAT HUD (>= 85% UNOBSTRUCTED VIEWPORT, ZERO BLUR)
         ===================================================================== */}
      {isCombatActive && overlay === 'none' && (
        <>
          {/* Top-Left Minimal Objective & District Indicator */}
          <div className="pointer-events-none absolute left-4 top-4 z-10 rounded-lg border border-white/12 bg-[#0D0F12]/88 px-3.5 py-2.5">
            <div className="font-mono text-[10px] tracking-wider text-[#E89B3C]">
              LVL 0{hud.levelNumber} · {hud.districtName.split('/')[0].split('—')[0].trim().toUpperCase()}
            </div>
            <div className="mt-1 flex items-center gap-3 text-xs font-medium text-white tabular-nums">
              <span>{hud.bossActive ? `Target: ${hud.bossName}` : `Hostiles: ${hud.enemiesRemaining}`}</span>
              <span className="text-white/25">|</span>
              <span className="text-[#9CA3AF]">KOs {hud.eliminations}</span>
            </div>
          </div>

          {/* Visual Mobile Input Debugger Overlay */}
          {showInputDebugger && <InputDebuggerOverlay telemetry={debuggerTelemetry} />}

          {/* Top-Center Boss Health Bar + Windup Laser Warning */}
          {hud.bossActive && (
            <div className="pointer-events-none absolute left-1/2 top-4 z-10 w-[min(460px,calc(100%-2rem))] -translate-x-1/2 rounded-lg border border-[#E89B3C]/50 bg-[#0D0F12]/92 px-4 py-2.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 font-display font-bold text-white">
                  <ShieldAlert className="h-4 w-4 text-[#E89B3C]" />
                  <span>{hud.bossName}</span>
                  <span className="font-mono text-[10px] font-medium text-[#E89B3C]">PHASE {hud.bossPhase}</span>
                </div>
                <span className="font-mono text-xs tabular-nums text-[#D1D5DB]">
                  {hud.bossHp} / {hud.bossMaxHp}
                </span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-white/12">
                <div
                  className="h-full bg-[#D9382E] transition-all duration-100"
                  style={{ width: `${Math.max(0, (hud.bossHp / Math.max(1, hud.bossMaxHp)) * 100)}%` }}
                />
              </div>
              {hud.bossWindup && (
                <div className="mt-1.5 font-mono text-[10px] font-semibold tracking-wider text-[#FCA5A5]">
                  WARNING: {hud.bossName.toUpperCase()} LOCKING ON — TAKE COVER
                </div>
              )}
            </div>
          )}

          {/* Top-Right Compact Pause + Map Buttons */}
          <div className="absolute right-4 top-4 z-20 flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setOverlay('map')}
              title="Greater Cairo Map (M)"
              className="flex h-9 items-center gap-1.5 rounded-lg border border-white/12 bg-[#0D0F12]/88 px-3 text-xs font-medium text-[#E5E7EB] hover:border-[#E89B3C] hover:text-white"
            >
              <MapPin className="h-3.5 w-3.5 text-[#E89B3C]" />
              <span className="hidden sm:inline">Map</span>
            </button>
            <button
              type="button"
              onClick={() => setOverlay('pause')}
              title="Pause Game (Esc)"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/12 bg-[#0D0F12]/88 text-[#E5E7EB] hover:border-[#E89B3C] hover:text-white"
            >
              <Pause className="h-4 w-4" />
            </button>
          </div>

          {/* Active Mission Log HUD (Top-Right below Map/Pause) */}
          <ActiveMissionLog hud={hud} />

          {/* Center Tactical Announcement Banner */}
          {hud.announcement && (
            <div className="pointer-events-none absolute left-1/2 top-24 z-10 -translate-x-1/2 rounded-md border border-[#E89B3C]/40 bg-[#0D0F12]/90 px-4 py-1.5 text-center text-xs font-medium text-[#FDE68A]">
              {hud.announcement}
            </div>
          )}

          {/* Nearby Pickup Hint */}
          {hud.nearbyPickupLabel && (
            <div className="pointer-events-none absolute left-1/2 bottom-28 z-10 -translate-x-1/2 rounded-md border border-white/15 bg-[#0D0F12]/88 px-3 py-1 text-xs text-white">
              Move closer to collect {hud.nearbyPickupLabel}
            </div>
          )}

          {/* Dynamic Center Crosshair + Hitmarker */}
          <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
            <div className="relative flex h-12 w-12 items-center justify-center">
              <span
                className={`absolute h-2.5 w-[2px] -translate-y-3 transition-transform ${
                  hud.autoAimLocked ? 'bg-[#E89B3C]' : 'bg-white/90'
                }`}
                style={{ transform: `translateY(${hud.isAds ? -7 : -12}px)` }}
              />
              <span
                className={`absolute h-2.5 w-[2px] translate-y-3 transition-transform ${
                  hud.autoAimLocked ? 'bg-[#E89B3C]' : 'bg-white/90'
                }`}
                style={{ transform: `translateY(${hud.isAds ? 7 : 12}px)` }}
              />
              <span
                className={`absolute h-[2px] w-2.5 -translate-x-3 transition-transform ${
                  hud.autoAimLocked ? 'bg-[#E89B3C]' : 'bg-white/90'
                }`}
                style={{ transform: `translateX(${hud.isAds ? -7 : -12}px)` }}
              />
              <span
                className={`absolute h-[2px] w-2.5 translate-x-3 transition-transform ${
                  hud.autoAimLocked ? 'bg-[#E89B3C]' : 'bg-white/90'
                }`}
                style={{ transform: `translateX(${hud.isAds ? 7 : 12}px)` }}
              />
              <span className={`h-1 w-1 rounded-full ${hud.autoAimLocked ? 'bg-[#E89B3C]' : 'bg-white'}`} />

              {hud.hitMarkerKind !== 'none' && (
                <div
                  className={`absolute h-5 w-5 rotate-45 border-2 ${
                    hud.hitMarkerKind === 'kill' || hud.hitMarkerKind === 'head'
                      ? 'border-[#FF5A45]'
                      : 'border-[#FDE68A]'
                  }`}
                />
              )}
            </div>
            {hud.isReloading && (
              <div className="mt-1 text-center font-mono text-[10px] font-semibold tracking-wider text-[#FDE68A]">
                RELOADING {Math.round(hud.reloadProgress * 100)}%
              </div>
            )}
          </div>

          {/* Bottom-Left Player Health & Stance */}
          <div className="pointer-events-none absolute bottom-14 left-4 z-10 w-52 rounded-lg border border-white/12 bg-[#0D0F12]/90 px-3.5 py-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-medium text-[#D1D5DB]">
                <Heart className="h-3.5 w-3.5 text-[#D9382E]" />
                Health
              </span>
              <span className="font-mono font-semibold tabular-nums text-white">{hud.playerHp}</span>
            </div>
            <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-white/12">
              <div
                className={`h-full transition-all duration-100 ${
                  hud.playerHp > 35 ? 'bg-emerald-500' : 'bg-[#D9382E]'
                }`}
                style={{ width: `${(hud.playerHp / hud.playerMaxHp) * 100}%` }}
              />
            </div>
            <div className="mt-1.5 flex items-center justify-between font-mono text-[10px] uppercase text-[#9CA3AF]">
              <span>{hud.stance}</span>
              <span>{hud.isAds ? 'ADS' : 'HIP'}</span>
            </div>
          </div>

          {/* Bottom-Right Ammo & Weapon Status */}
          <div className="pointer-events-none absolute bottom-14 right-4 z-10 rounded-lg border border-white/12 bg-[#0D0F12]/90 px-4 py-2.5 text-right">
            <div className="font-mono text-[10px] uppercase tracking-wider text-[#9CA3AF]">MK-18 Cairo Carbine</div>
            <div className="mt-0.5 flex items-baseline justify-end gap-1.5 font-mono tabular-nums">
              <span className={`text-2xl font-bold ${hud.ammo <= 6 ? 'text-[#FCA5A5]' : 'text-white'}`}>
                {hud.ammo}
              </span>
              <span className="text-xs text-[#9CA3AF]">/ {hud.reserveAmmo}</span>
            </div>
          </div>

          {/* Collapsible Bottom Tactical Dock (Compact <= 44px height) */}
          <div className="absolute bottom-2 left-1/2 z-20 -translate-x-1/2">
            {dockCollapsed ? (
              <button
                type="button"
                onClick={() => setDockCollapsed(false)}
                className="flex items-center gap-1.5 rounded-md border border-white/15 bg-[#0D0F12]/90 px-3 py-1 text-[11px] font-medium text-[#D1D5DB] hover:border-[#E89B3C] hover:text-white"
              >
                <ChevronUp className="h-3.5 w-3.5 text-[#E89B3C]" />
                <span>Tactical Dock (H)</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5 rounded-lg border border-white/12 bg-[#0D0F12]/92 px-2 py-1 text-[11px] text-[#D1D5DB]">
                <button
                  type="button"
                  onClick={() => applySetting({ autoAimAssist: !settings.autoAimAssist })}
                  className={`flex items-center gap-1 rounded px-2 py-1 transition-colors ${
                    settings.autoAimAssist ? 'bg-[#E89B3C]/20 text-[#FDE68A]' : 'hover:text-white'
                  }`}
                >
                  <Target className="h-3.5 w-3.5" />
                  <span>Aim Assist</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    applySetting({ cameraPreset: settings.cameraPreset === 'shoulder' ? 'wide' : 'shoulder' })
                  }
                  className="rounded px-2 py-1 hover:bg-white/8 hover:text-white"
                >
                  Cam: {settings.cameraPreset === 'shoulder' ? 'PUBG' : 'Wide'}
                </button>
                <button
                  type="button"
                  onClick={() => applySetting({ showTouchControls: !settings.showTouchControls })}
                  className={`flex items-center gap-1 rounded px-2 py-1 transition-colors ${
                    settings.showTouchControls ? 'bg-[#E89B3C]/20 text-[#FDE68A]' : 'hover:text-white'
                  }`}
                >
                  <Gamepad2 className="h-3.5 w-3.5" />
                  <span>Touch</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const next = !showInputDebugger;
                    setShowInputDebugger(next);
                    if (next && !settings.showTouchControls) {
                      applySetting({ showTouchControls: true });
                    }
                  }}
                  title="Toggle Mobile Input Debugger (I)"
                  className={`flex items-center gap-1 rounded px-2 py-1 transition-colors ${
                    showInputDebugger ? 'bg-[#E89B3C]/20 text-[#FDE68A]' : 'hover:text-white'
                  }`}
                >
                  <Activity className="h-3.5 w-3.5" />
                  <span>Debug</span>
                </button>
                <button
                  type="button"
                  onClick={() => setOverlay('music')}
                  className="flex items-center gap-1 rounded px-2 py-1 hover:bg-white/8 hover:text-white"
                >
                  <Music className="h-3.5 w-3.5 text-[#E89B3C]" />
                  <span>Music</span>
                </button>
                <button
                  type="button"
                  onClick={() => applySetting({ muted: !settings.muted })}
                  className="rounded p-1 hover:bg-white/8 hover:text-white"
                  title={settings.muted ? 'Unmute Audio' : 'Mute Audio'}
                >
                  {settings.muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => engineRef.current?.jumpToBossFight()}
                  className="rounded px-2 py-1 text-[#E89B3C] hover:bg-white/8"
                >
                  Boss Fight
                </button>
                <button
                  type="button"
                  onClick={() => setDockCollapsed(true)}
                  className="rounded p-1 text-[#9CA3AF] hover:text-white"
                  title="Hide Dock (H)"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Optional Mobile Dual-Thumb Touch Controls */}
          {settings.showTouchControls && (
            <>
              <div
                onPointerDown={handleLookPadDown}
                onPointerMove={handleLookPadMove}
                onPointerUp={handleLookPadUp}
                onPointerCancel={handleLookPadUp}
                className="absolute right-0 top-16 bottom-0 left-1/2 z-10 touch-none"
              />
              <div
                ref={joyBaseRef}
                onPointerDown={handleJoyDown}
                onPointerMove={handleJoyMove}
                onPointerUp={handleJoyUp}
                onPointerCancel={handleJoyUp}
                className="absolute bottom-28 left-6 z-20 flex h-32 w-32 touch-none items-center justify-center rounded-full border border-white/25 bg-[#0D0F12]/55"
              >
                <div
                  className="h-12 w-12 rounded-full border border-[#E89B3C] bg-[#E89B3C]/45"
                  style={{ transform: `translate(${joyKnob.x}px, ${joyKnob.y}px)` }}
                />
              </div>

              <div className="absolute bottom-28 right-6 z-20 flex flex-col items-end gap-2.5">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      engineRef.current?.toggleCrouch();
                    }}
                    className="flex h-12 w-12 items-center justify-center rounded-full border border-white/25 bg-[#0D0F12]/80 text-[11px] font-semibold text-white"
                  >
                    CRCH
                  </button>
                  <button
                    type="button"
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      engineRef.current?.triggerReload();
                    }}
                    className="flex h-12 w-12 items-center justify-center rounded-full border border-white/25 bg-[#0D0F12]/80 text-[11px] font-semibold text-white"
                  >
                    RLD
                  </button>
                  <button
                    type="button"
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      engineRef.current?.setVirtualInput({ ads: !hud.isAds });
                    }}
                    className={`flex h-12 w-12 items-center justify-center rounded-full border text-[11px] font-semibold ${
                      hud.isAds
                        ? 'border-[#E89B3C] bg-[#E89B3C] text-[#0D0F12]'
                        : 'border-white/25 bg-[#0D0F12]/80 text-white'
                    }`}
                  >
                    ADS
                  </button>
                </div>

                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    setDebugInput((prev) => ({ ...prev, firing: true }));
                    engineRef.current?.setVirtualInput({ firing: true });
                  }}
                  onPointerUp={(e) => {
                    e.stopPropagation();
                    setDebugInput((prev) => ({ ...prev, firing: false }));
                    engineRef.current?.setVirtualInput({ firing: false });
                  }}
                  onPointerCancel={() => {
                    setDebugInput((prev) => ({ ...prev, firing: false }));
                    engineRef.current?.setVirtualInput({ firing: false });
                  }}
                  onPointerLeave={() => {
                    setDebugInput((prev) => ({ ...prev, firing: false }));
                    engineRef.current?.setVirtualInput({ firing: false });
                  }}
                  className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-[#E89B3C] bg-[#E89B3C]/85 text-xs font-bold tracking-wider text-[#0D0F12] active:scale-95"
                >
                  FIRE
                </button>
              </div>
            </>
          )}
        </>
      )}

      {/* =====================================================================
          STATE 3: VICTORY & DEFEAT OVERLAYS WITH 4-DISTRICT PROGRESSION
         ===================================================================== */}
      {(hud.phase === 'victory' || hud.phase === 'defeat') && overlay === 'none' && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#090B0E]/82 p-4">
          <div className="w-full max-w-[460px] rounded-xl border border-white/15 bg-[#12151B] p-6 text-center shadow-2xl">
            <div
              className={`font-mono text-xs tracking-wider ${
                hud.phase === 'victory' ? 'text-emerald-400' : 'text-[#FCA5A5]'
              }`}
            >
              {hud.phase === 'victory' ? `LEVEL 0${hud.levelNumber} DISTRICT SECURED` : 'OPERATOR DOWNED'}
            </div>
            <h2 className="mt-2 font-display text-3xl font-bold text-white">
              {hud.phase === 'victory' ? `${hud.bossName} Neutralized` : `Defeated in ${hud.districtName.split('/')[0]}`}
            </h2>
            <p className="mt-2 text-sm text-[#9CA3AF]">
              {hud.phase === 'victory'
                ? nextDistrictMeta
                  ? `Next target unlocked: Level 0${nextDistrictMeta.level} — ${nextDistrictMeta.name} (${nextDistrictMeta.villainArchetype}).`
                  : 'All eight Greater Cairo districts have been secured. Cairo is yours.'
                : 'Use taxis, barriers, and crouch cover when the boss laser sight locks on.'}
            </p>

            <div className="mt-5 grid grid-cols-3 gap-3 rounded-lg border border-white/10 bg-[#0D0F12] p-3.5 font-mono tabular-nums">
              <div>
                <div className="text-[10px] text-[#9CA3AF]">ELIMS</div>
                <div className="mt-0.5 text-lg font-bold text-white">{hud.eliminations}</div>
              </div>
              <div>
                <div className="text-[10px] text-[#9CA3AF]">ACCURACY</div>
                <div className="mt-0.5 text-lg font-bold text-[#E89B3C]">{accuracy}%</div>
              </div>
              <div>
                <div className="text-[10px] text-[#9CA3AF]">TIME</div>
                <div className="mt-0.5 text-lg font-bold text-white">{Math.round(hud.elapsedSeconds)}s</div>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-2.5">
              {hud.phase === 'victory' && nextDistrictId && (
                <button
                  type="button"
                  onClick={() => deployToDistrict(nextDistrictId)}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#E89B3C] px-4 py-3 text-sm font-bold text-[#0D0F12] transition-colors hover:bg-[#F2AD54]"
                >
                  <Play className="h-4 w-4 fill-current" />
                  <span>Deploy to Level 0{nextDistrictMeta?.level}: {nextDistrictMeta?.name.split('—')[0].split('/')[0].trim()}</span>
                </button>
              )}

              <button
                type="button"
                onClick={startCurrentMission}
                className={`flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
                  hud.phase === 'defeat' || !nextDistrictId
                    ? 'bg-[#E89B3C] text-[#0D0F12] hover:bg-[#F2AD54]'
                    : 'border border-white/15 bg-[#161A20] text-white hover:border-[#E89B3C]'
                }`}
              >
                <RotateCcw className="h-4 w-4" />
                <span>Replay {hud.districtName.split('/')[0].split('—')[0].trim()}</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setOverlay('map')}
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-white/12 bg-[#161A20] px-3 py-2 text-xs font-medium text-[#D1D5DB] hover:border-[#E89B3C] hover:text-white"
                >
                  <MapPin className="h-3.5 w-3.5 text-[#E89B3C]" />
                  <span>Cairo Map</span>
                </button>
                <button
                  type="button"
                  onClick={() => setOverlay('blueprint')}
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-white/12 bg-[#161A20] px-3 py-2 text-xs font-medium text-[#D1D5DB] hover:border-[#E89B3C] hover:text-white"
                >
                  <Code2 className="h-3.5 w-3.5 text-[#E89B3C]" />
                  <span>UE5 Blueprint</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          STATE 4: IN-GAME PAUSE MENU MODAL (Esc)
         ===================================================================== */}
      {overlay === 'pause' && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#090B0E]/88 p-4">
          <div className="w-full max-w-[400px] rounded-xl border border-white/15 bg-[#12151B] p-6 shadow-2xl">
            <div className="font-mono text-xs text-[#E89B3C]">
              PAUSED · LEVEL 0{hud.levelNumber} {hud.districtArabic}
            </div>
            <h2 className="mt-1 font-display text-2xl font-bold text-white">{hud.districtName}</h2>

            <div className="mt-5 space-y-2.5">
              <button
                type="button"
                onClick={() => setOverlay('none')}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#E89B3C] px-4 py-3 text-sm font-bold text-[#0D0F12] transition-colors hover:bg-[#F2AD54]"
              >
                <Play className="h-4 w-4 fill-current" />
                <span>Resume Mission</span>
              </button>
              <button
                type="button"
                onClick={() => setOverlay('map')}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 bg-[#161A20] px-4 py-2.5 text-xs font-semibold text-white hover:border-[#E89B3C]"
              >
                <MapPin className="h-4 w-4 text-[#E89B3C]" />
                <span>Greater Cairo Map (Switch District)</span>
              </button>
              <button
                type="button"
                onClick={() => setOverlay('music')}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 bg-[#161A20] px-4 py-2.5 text-xs font-semibold text-white hover:border-[#E89B3C]"
              >
                <Music className="h-4 w-4 text-[#E89B3C]" />
                <span>Cairo Soundtrack &amp; Lyria 3 Studio</span>
              </button>
              <button
                type="button"
                onClick={() => setOverlay('blueprint')}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 bg-[#161A20] px-4 py-2.5 text-xs font-semibold text-white hover:border-[#E89B3C]"
              >
                <Code2 className="h-4 w-4 text-[#E89B3C]" />
                <span>UE5 Solo-Dev Blueprint &amp; Scripts</span>
              </button>
              <button
                type="button"
                onClick={startCurrentMission}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-[#0D0F12] px-4 py-2.5 text-xs font-medium text-[#D1D5DB] hover:border-white/30 hover:text-white"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Restart District</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          IN-GAME OVERLAYS: GOOGLE MAPS TACTICAL MAP, SOUNDTRACK, UE5 BLUEPRINT
         ===================================================================== */}
      {overlay === 'map' && (
        <CairoTacticalMap
          activeDistrictId={hud.districtId}
          clearedDistricts={clearedDistricts}
          onDeployDistrict={deployToDistrict}
          onClose={() => setOverlay('none')}
        />
      )}

      {overlay === 'music' && (
        <SoundtrackDeck
          activeDistrictId={hud.districtId}
          synthMusicEnabled={settings.musicEnabled}
          onToggleSynthMusic={(enabled) => applySetting({ musicEnabled: enabled })}
          onExternalTrackStateChange={(playing) => engineRef.current?.setExternalMusicPlaying(playing)}
          onClose={() => setOverlay('none')}
        />
      )}

      {overlay === 'blueprint' && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#0D0F12]">
          <div className="flex items-center justify-between border-b border-white/10 bg-[#0D0F12] px-5 py-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#E89B3C]">
              <Crosshair className="h-4 w-4" />
              <span>IN-GAME DEVELOPER BLUEPRINT ARCHIVE</span>
            </div>
            <button
              type="button"
              onClick={() => setOverlay('none')}
              className="rounded-lg bg-[#E89B3C] px-4 py-1.5 text-xs font-semibold text-[#0D0F12] hover:bg-[#F2AD54]"
            >
              Return to Game
            </button>
          </div>
          <div className="min-h-0 flex-1">
            <BlueprintHub
              activeSection={blueprintSection}
              onSelectSection={setBlueprintSection}
              onLaunchPlayableSlice={() => setOverlay('none')}
            />
          </div>
        </div>
      )}
    </div>
  );
};
