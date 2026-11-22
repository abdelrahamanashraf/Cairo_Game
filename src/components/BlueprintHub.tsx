import React, { useMemo, useState } from 'react';
import { Check, CheckSquare, Copy, FileCode2, Folder, Layers, MapPin, Play, Square } from 'lucide-react';
import {
  CAIRO_DISTRICTS,
  ENGINE_COMPARISON,
  SOLO_MVP_CHECKLIST,
  UE5_FOLDER_TREE,
  UE5_SOLO_GUARDRAILS,
  UE5_STARTER_SCRIPTS,
} from '../data/ue5BlueprintData';
import { BlueprintSection } from '../game/types';

interface BlueprintHubProps {
  activeSection: BlueprintSection;
  onSelectSection: (section: BlueprintSection) => void;
  onLaunchPlayableSlice: () => void;
}

const CHECKLIST_STORAGE_KEY = 'cairo_precinct_mvp_checklist_v1';

export const BlueprintHub: React.FC<BlueprintHubProps> = ({
  activeSection,
  onSelectSection,
  onLaunchPlayableSlice,
}) => {
  // Cesium Interactive Tuner State
  const [selectedDistrictId, setSelectedDistrictId] = useState(CAIRO_DISTRICTS[0].id);
  const [maxSSE, setMaxSSE] = useState(28);
  const [maxSimultaneousLoads, setMaxSimultaneousLoads] = useState(3);
  const [cacheMB, setCacheMB] = useState(192);
  const [poolSizeMB, setPoolSizeMB] = useState(384);
  const [arenaRadiusM, setArenaRadiusM] = useState(140);

  // Architecture / Code Viewer State
  const [selectedScriptId, setSelectedScriptId] = useState(UE5_STARTER_SCRIPTS[0].id);
  const [codeTab, setCodeTab] = useState<'header' | 'source' | 'blueprint'>('header');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Solo Dev Checklist persisted in localStorage
  const [completedChecklist, setCompletedChecklist] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(CHECKLIST_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
    } catch {
      return {};
    }
  });

  const toggleChecklistItem = (id: string) => {
    setCompletedChecklist((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage quota issues
      }
      return next;
    });
  };

  const selectedDistrict = useMemo(
    () => CAIRO_DISTRICTS.find((d) => d.id === selectedDistrictId) ?? CAIRO_DISTRICTS[0],
    [selectedDistrictId],
  );

  const selectedScript = useMemo(
    () => UE5_STARTER_SCRIPTS.find((s) => s.id === selectedScriptId) ?? UE5_STARTER_SCRIPTS[0],
    [selectedScriptId],
  );

  // Real-time mobile performance estimator for Cesium + Google 3D Tiles on mid-range smartphones
  const cesiumMetrics = useMemo(() => {
    // Lower SSE = exponentially heavier geometry; mobile sweet spot is 24-32
    const ssePenalty = maxSSE < 18 ? 34 : maxSSE < 24 ? 16 : maxSSE <= 34 ? 4 : 0;
    const loadPenalty = maxSimultaneousLoads > 5 ? (maxSimultaneousLoads - 4) * 4 : 0;
    const estFps = Math.max(22, Math.min(60, Math.round(62 - ssePenalty - loadPenalty)));
    const estRamMB = Math.round(520 + cacheMB + poolSizeMB * 0.85 + (arenaRadiusM / 100) * 65);
    const triangleBudgetK = Math.round((420 * (28 / Math.max(12, maxSSE))) + arenaRadiusM * 0.45);

    let viabilityLabel = 'Target 60 FPS Met (Mid-Range Android / iOS Safe)';
    let viabilityColor = 'text-emerald-400';
    if (estFps < 45 || estRamMB > 1550) {
      viabilityLabel = 'High Risk: Thermal Throttling / OOM Likely on Mid-Range Phones';
      viabilityColor = 'text-[#FCA5A5]';
    } else if (estFps < 55 || estRamMB > 1300) {
      viabilityLabel = 'Borderline 45–55 FPS: Raise SSE to 28+ or Lower Tile Cache';
      viabilityColor = 'text-[#FDE68A]';
    }

    const iniSnippet = `; Config/DefaultEngine.ini — Mobile Cesium + UE5 Guardrails
[/Script/Engine.RendererSettings]
r.Mobile.ShadingPath=0               ; Mobile Forward Shading (60 FPS target)
r.Nanite=0                           ; Disabled on mobile (Google 3D Tiles use classic LODs)
r.DynamicGlobalIlluminationMethod=0  ; Disable Lumen on mobile
r.Streaming.PoolSize=${poolSizeMB}             ; Strict VRAM texture streaming pool (MB)
r.MobileContentScaleFactor=1.0

; CesiumGeoreference & Cesium3DTileset — ${selectedDistrict.name}
OriginLatitude=${selectedDistrict.lat.toFixed(4)}
OriginLongitude=${selectedDistrict.lon.toFixed(4)}
OriginHeight=${selectedDistrict.elevationM}.0
MaximumScreenSpaceError=${maxSSE}.0
MaximumSimultaneousTileLoads=${maxSimultaneousLoads}
MaximumCachedBytes=${cacheMB * 1024 * 1024} ; ${cacheMB} MB strict tile cache
PreloadAncestors=false
PreloadSiblings=false
CartographicPolygonCutoutRadiusMeters=${arenaRadiusM}`;

    return { estFps, estRamMB, triangleBudgetK, viabilityLabel, viabilityColor, iniSnippet };
  }, [maxSSE, maxSimultaneousLoads, cacheMB, poolSizeMB, arenaRadiusM, selectedDistrict]);

  const copyText = (id: string, text: string) => {
    void navigator.clipboard?.writeText(text);
    setCopiedId(id);
    window.setTimeout(() => setCopiedId((curr) => (curr === id ? null : curr)), 1800);
  };

  const completedCount = SOLO_MVP_CHECKLIST.filter((i) => completedChecklist[i.id]).length;

  return (
    <div className="h-full w-full overflow-y-auto bg-[#0D0F12] text-[#F3F4F6]">
      <div className="mx-auto max-w-[1260px] px-6 py-8 md:px-10">
        {/* Studio Header & Section Switcher */}
        <div className="flex flex-col justify-between gap-6 border-b border-white/10 pb-6 lg:flex-row lg:items-end">
          <div>
            <div className="flex items-center gap-2 text-xs text-[#E89B3C]">
              <span>Unreal Engine 5 Mobile</span>
              <span aria-hidden="true">·</span>
              <span>Solo Developer Production Blueprint</span>
              <span aria-hidden="true">·</span>
              <span>Phase 1 Vertical Slice</span>
            </div>
            <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-white md:text-4xl">
              Cairo Precinct Technical Architecture
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#9CA3AF]">
              Actionable engine verdict, Cesium + Google Photorealistic 3D Tiles mobile budget simulator, UE5 folder
              structure, and the first five C++/Blueprint systems to build your Cairo third-person shooter at 60 FPS.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onLaunchPlayableSlice}
              className="flex items-center gap-2 rounded-lg bg-[#E89B3C] px-4 py-2.5 text-xs font-semibold text-[#0D0F12] transition-colors hover:bg-[#F2AD54] whitespace-nowrap shrink-0"
            >
              <Play className="h-3.5 w-3.5" />
              <span>Play 3D Shubra Slice</span>
            </button>
          </div>
        </div>

        {/* Sub-Navigation Segmented Tabs */}
        <div className="mt-6 flex flex-wrap items-center gap-1 rounded-lg bg-[#161A20] p-1 border border-white/8 w-fit">
          {(
            [
              { id: 'verdict', label: '01. Engine Verdict' },
              { id: 'cesium', label: '02. Cesium & 3D Tiles' },
              { id: 'architecture', label: '03. Folder Tree & 5 Scripts' },
              { id: 'campaign', label: '04. Campaign & IP Bible' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectSection(tab.id)}
              className={`rounded-md px-4 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                activeSection === tab.id
                  ? 'bg-[#E89B3C] text-[#0D0F12] font-semibold'
                  : 'text-[#9CA3AF] hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* SECTION 1: ENGINE VERDICT (UE5 Mobile vs Unity URP) */}
        {activeSection === 'verdict' && (
          <div className="mt-8 space-y-10">
            {/* Executive Verdict Block */}
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
              <div className="lg:col-span-7">
                <h2 className="font-display text-2xl font-bold text-white">
                  Why Unreal Engine 5 Mobile Works for Your Solo Build
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-[#D1D5DB]">
                  Since you selected <strong className="text-white">Unreal Engine 5</strong> as a solo developer, your
                  biggest superpower is built-in AAA shooter scaffolding: <span className="font-mono text-xs text-[#FDE68A]">CharacterMovementComponent</span>,{' '}
                  <span className="font-mono text-xs text-[#FDE68A]">SpringArm</span> PUBG camera collision, AI Perception,
                  Behavior Trees, and native <strong className="text-white">MetaHuman</strong> character scanning—saving
                  you 4 to 6 weeks compared to wiring third-party Unity packages together.
                </p>
                <p className="mt-3 text-sm leading-relaxed text-[#9CA3AF]">
                  The trade-off is mobile rendering discipline: UE5 defaults target PC/console (Lumen, Nanite, heavy
                  post-processing). Locking your project into <strong className="text-[#F3F4F6]">Mobile Forward Shading</strong> on Day 1
                  gives you UE5’s rapid solo workflow while hitting 60 FPS on mid-range Android and iOS devices.
                </p>
              </div>

              {/* Solo-Dev Checklist Progress */}
              <div className="rounded-xl border border-white/10 bg-[#161A20] p-5 lg:col-span-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-base font-semibold text-white">Phase 1 Vertical Slice Checklist</h3>
                  <span className="font-mono text-xs tabular-nums text-[#E89B3C]">
                    {completedCount} / {SOLO_MVP_CHECKLIST.length} Done
                  </span>
                </div>
                <div className="mt-4 space-y-2.5">
                  {SOLO_MVP_CHECKLIST.map((item) => {
                    const done = Boolean(completedChecklist[item.id]);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => toggleChecklistItem(item.id)}
                        className="flex w-full items-start gap-2.5 rounded-lg border border-white/6 bg-[#0D0F12]/70 p-2.5 text-left transition-colors hover:border-white/20"
                      >
                        {done ? (
                          <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-[#E89B3C]" />
                        ) : (
                          <Square className="mt-0.5 h-4 w-4 shrink-0 text-[#6B7280]" />
                        )}
                        <div>
                          <div className={`text-xs font-medium ${done ? 'text-[#9CA3AF] line-through' : 'text-[#F3F4F6]'}`}>
                            {item.task}
                          </div>
                          <div className="mt-0.5 text-[11px] text-[#9CA3AF]">{item.detail}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Structured Comparison Table */}
            <div>
              <h3 className="font-display text-lg font-semibold text-white">
                Unreal Engine 5 Mobile vs. Unity URP (Solo Third-Person Shooter)
              </h3>
              <div className="mt-4 overflow-x-auto rounded-xl border border-white/10 bg-[#161A20]">
                <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-xs text-[#9CA3AF]">
                      <th className="px-5 py-3.5 font-medium">Engineering Dimension</th>
                      <th className="px-5 py-3.5 font-medium text-[#E89B3C]">Unreal Engine 5 Mobile (Selected)</th>
                      <th className="px-5 py-3.5 font-medium">Unity URP (Alternative)</th>
                      <th className="px-5 py-3.5 font-medium">Solo Verdict</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/8">
                    {ENGINE_COMPARISON.map((row) => (
                      <tr key={row.dimension} className="align-top">
                        <td className="px-5 py-4 font-medium text-white">{row.dimension}</td>
                        <td className="px-5 py-4 text-[#D1D5DB]">{row.ue5Mobile}</td>
                        <td className="px-5 py-4 text-[#9CA3AF]">{row.unityUrp}</td>
                        <td className="px-5 py-4 font-mono text-xs text-[#E89B3C] whitespace-nowrap">
                          {row.soloVerdict}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 4 Non-Negotiable Solo Guardrails */}
            <div>
              <h3 className="font-display text-lg font-semibold text-white">
                Four Non-Negotiable UE5 Mobile Guardrails
              </h3>
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                {UE5_SOLO_GUARDRAILS.map((g, idx) => (
                  <div key={g.title} className="rounded-xl border border-white/10 bg-[#161A20] p-5">
                    <div className="font-mono text-xs text-[#E89B3C]">0{idx + 1}</div>
                    <h4 className="mt-1 font-display text-base font-semibold text-white">{g.title}</h4>
                    <p className="mt-2 text-sm leading-relaxed text-[#9CA3AF]">{g.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SECTION 2: CESIUM + GOOGLE PHOTOREALISTIC 3D TILES MOBILE SETUP */}
        {activeSection === 'cesium' && (
          <div className="mt-8 space-y-8">
            {/* District Selector Strip */}
            <div>
              <h2 className="font-display text-2xl font-bold text-white">
                Cesium for Unreal + Google 3D Tiles Mobile Setup
              </h2>
              <p className="mt-2 max-w-3xl text-sm text-[#9CA3AF]">
                Select a Greater Cairo district coordinate below and tune the streaming parameters. Raw Google 3D Tiles
                are strictly clipped out of the playable street block using a{' '}
                <span className="font-mono text-xs text-[#FDE68A]">CesiumCartographicPolygon</span> so only the distant
                Cairo skyline streams on mobile hardware.
              </p>

              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {CAIRO_DISTRICTS.map((dist) => {
                  const activeDist = dist.id === selectedDistrict.id;
                  return (
                    <button
                      key={dist.id}
                      type="button"
                      onClick={() => {
                        setSelectedDistrictId(dist.id);
                        setMaxSSE(dist.recommendedSSE);
                        setArenaRadiusM(dist.recommendedArenaRadiusM);
                      }}
                      className={`rounded-xl border p-4 text-left transition-colors ${
                        activeDist
                          ? 'border-[#E89B3C] bg-[#1D222B]'
                          : 'border-white/10 bg-[#161A20] hover:border-white/25'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs text-[#9CA3AF]">
                        <span>Level {dist.level}</span>
                        <span className="font-mono tabular-nums text-[#E89B3C]">
                          {dist.lat.toFixed(4)}, {dist.lon.toFixed(4)}
                        </span>
                      </div>
                      <div className="mt-1.5 font-display text-sm font-semibold text-white">{dist.name}</div>
                      <div className="mt-1 text-xs text-[#9CA3AF]">{dist.arabicHint}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Interactive Mobile Streaming Budget Simulator */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              <div className="space-y-5 rounded-xl border border-white/10 bg-[#161A20] p-6 lg:col-span-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-lg font-semibold text-white">Mobile Streaming Budget Tuner</h3>
                  <span className="font-mono text-xs text-[#9CA3AF]">Mid-Range Snapdragon 7 / A14</span>
                </div>

                {/* Slider 1: Maximum Screen Space Error */}
                <div>
                  <div className="flex items-center justify-between text-xs">
                    <label htmlFor="sse-slider" className="font-medium text-[#F3F4F6]">
                      Maximum Screen Space Error (SSE)
                    </label>
                    <span className="font-mono tabular-nums text-[#E89B3C]">
                      {maxSSE} px (Mobile Sweet Spot: 24–32)
                    </span>
                  </div>
                  <input
                    id="sse-slider"
                    type="range"
                    min={12}
                    max={44}
                    step={2}
                    value={maxSSE}
                    onChange={(e) => setMaxSSE(Number(e.target.value))}
                    className="mt-2 w-full accent-[#E89B3C]"
                  />
                  <p className="mt-1 text-[11px] text-[#9CA3AF]">
                    Desktop default is 16. Raising SSE to 24–32 drops mobile tile triangle density by ~65% while keeping
                    distant Cairo skylines recognizable.
                  </p>
                </div>

                {/* Slider 2: Maximum Simultaneous Tile Loads */}
                <div>
                  <div className="flex items-center justify-between text-xs">
                    <label htmlFor="loads-slider" className="font-medium text-[#F3F4F6]">
                      Maximum Simultaneous Tile Loads
                    </label>
                    <span className="font-mono tabular-nums text-[#E89B3C]">{maxSimultaneousLoads} concurrent</span>
                  </div>
                  <input
                    id="loads-slider"
                    type="range"
                    min={1}
                    max={10}
                    step={1}
                    value={maxSimultaneousLoads}
                    onChange={(e) => setMaxSimultaneousLoads(Number(e.target.value))}
                    className="mt-2 w-full accent-[#E89B3C]"
                  />
                </div>

                {/* Slider 3: Maximum Cached Bytes */}
                <div>
                  <div className="flex items-center justify-between text-xs">
                    <label htmlFor="cache-slider" className="font-medium text-[#F3F4F6]">
                      Cesium Maximum Cached Bytes
                    </label>
                    <span className="font-mono tabular-nums text-[#E89B3C]">{cacheMB} MB</span>
                  </div>
                  <input
                    id="cache-slider"
                    type="range"
                    min={64}
                    max={512}
                    step={32}
                    value={cacheMB}
                    onChange={(e) => setCacheMB(Number(e.target.value))}
                    className="mt-2 w-full accent-[#E89B3C]"
                  />
                </div>

                {/* Slider 4: Texture Streaming Pool */}
                <div>
                  <div className="flex items-center justify-between text-xs">
                    <label htmlFor="pool-slider" className="font-medium text-[#F3F4F6]">
                      UE5 r.Streaming.PoolSize
                    </label>
                    <span className="font-mono tabular-nums text-[#E89B3C]">{poolSizeMB} MB</span>
                  </div>
                  <input
                    id="pool-slider"
                    type="range"
                    min={192}
                    max={768}
                    step={64}
                    value={poolSizeMB}
                    onChange={(e) => setPoolSizeMB(Number(e.target.value))}
                    className="mt-2 w-full accent-[#E89B3C]"
                  />
                </div>

                {/* Slider 5: Playable Cutout Radius */}
                <div>
                  <div className="flex items-center justify-between text-xs">
                    <label htmlFor="cutout-slider" className="font-medium text-[#F3F4F6]">
                      CartographicPolygon Playable Cutout Radius
                    </label>
                    <span className="font-mono tabular-nums text-[#E89B3C]">{arenaRadiusM} m</span>
                  </div>
                  <input
                    id="cutout-slider"
                    type="range"
                    min={80}
                    max={280}
                    step={10}
                    value={arenaRadiusM}
                    onChange={(e) => setArenaRadiusM(Number(e.target.value))}
                    className="mt-2 w-full accent-[#E89B3C]"
                  />
                </div>
              </div>

              {/* Computed Mobile Telemetry + Generated INI Config */}
              <div className="flex flex-col gap-5 lg:col-span-6">
                <div className="rounded-xl border border-white/10 bg-[#161A20] p-5">
                  <div className="text-xs text-[#9CA3AF]">Projected Mobile Headroom ({selectedDistrict.name})</div>
                  <div className={`mt-1.5 text-sm font-semibold ${cesiumMetrics.viabilityColor}`}>
                    {cesiumMetrics.viabilityLabel}
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-4 border-t border-white/10 pt-4">
                    <div>
                      <div className="text-[11px] text-[#9CA3AF]">Estimated FPS</div>
                      <div className="mt-0.5 font-mono text-xl font-semibold tabular-nums text-white">
                        {cesiumMetrics.estFps} FPS
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-[#9CA3AF]">Est. Total RAM</div>
                      <div className="mt-0.5 font-mono text-xl font-semibold tabular-nums text-white">
                        {cesiumMetrics.estRamMB} MB
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-[#9CA3AF]">Visible Triangles</div>
                      <div className="mt-0.5 font-mono text-xl font-semibold tabular-nums text-white">
                        ~{cesiumMetrics.triangleBudgetK}k
                      </div>
                    </div>
                  </div>
                </div>

                {/* Copy-ready UE5 INI + Cesium Property Snippet */}
                <div className="flex flex-1 flex-col rounded-xl border border-white/10 bg-[#161A20]">
                  <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                    <span className="font-mono text-xs text-[#D1D5DB]">
                      DefaultEngine.ini + Cesium3DTileset ({selectedDistrict.id})
                    </span>
                    <button
                      type="button"
                      onClick={() => copyText('cesium_ini', cesiumMetrics.iniSnippet)}
                      className="flex items-center gap-1.5 rounded-md bg-[#0D0F12] px-3 py-1.5 text-xs font-medium text-[#E89B3C] transition-colors hover:bg-[#1D222B]"
                    >
                      {copiedId === 'cesium_ini' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copiedId === 'cesium_ini' ? 'Copied' : 'Copy Config'}</span>
                    </button>
                  </div>
                  <pre className="flex-1 overflow-x-auto p-4 font-mono text-xs leading-relaxed text-[#D1D5DB]">
                    {cesiumMetrics.iniSnippet}
                  </pre>
                </div>
              </div>
            </div>

            {/* 5-Step Cesium Setup Guide */}
            <div className="rounded-xl border border-white/10 bg-[#161A20] p-6">
              <h3 className="font-display text-lg font-semibold text-white">
                Step-by-Step UE5 Integration Guide for {selectedDistrict.name}
              </h3>
              <ol className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-5">
                {[
                  {
                    step: '01',
                    title: 'Install Cesium Plugin',
                    body: 'Add "Cesium for Unreal" from Fab / Unreal Marketplace, enable it in Plugins, and restart UE5.',
                  },
                  {
                    step: '02',
                    title: 'Pin Cairo Origin',
                    body: `Place CesiumGeoreference at Lat ${selectedDistrict.lat.toFixed(4)}, Lon ${selectedDistrict.lon.toFixed(4)}, Height ${selectedDistrict.elevationM}m with Keep World Origin Near Camera enabled.`,
                  },
                  {
                    step: '03',
                    title: 'Link Google 3D Tiles',
                    body: 'Add a Cesium3DTileset via Cesium ion (Google Photorealistic 3D Tiles) and disable Create Physics Meshes on the distant tileset.',
                  },
                  {
                    step: '04',
                    title: 'Clip Playable Arena',
                    body: `Drop a CesiumCartographicPolygon covering a ${arenaRadiusM}m radius over the combat street and attach CesiumPolygonRasterOverlay to cleanly hide messy street-level tiles.`,
                  },
                  {
                    step: '05',
                    title: 'Drop Low-Poly Block',
                    body: 'Place your hand-built PUBG-style Shubra modular buildings, taxis, and NavMesh inside the clipped zone, matched with golden-hour exponential height fog.',
                  },
                ].map((s) => (
                  <li key={s.step} className="rounded-lg border border-white/8 bg-[#0D0F12]/60 p-4">
                    <div className="font-mono text-xs text-[#E89B3C]">{s.step}</div>
                    <div className="mt-1 font-display text-sm font-semibold text-white">{s.title}</div>
                    <p className="mt-1.5 text-xs leading-relaxed text-[#9CA3AF]">{s.body}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}

        {/* SECTION 3: UE5 FOLDER STRUCTURE & FIRST 5 STARTER SCRIPTS */}
        {activeSection === 'architecture' && (
          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Left Column: UE5 Project Folder Structure */}
            <div className="rounded-xl border border-white/10 bg-[#161A20] p-5 lg:col-span-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h2 className="font-display text-base font-semibold text-white">UE5 Project Structure</h2>
                <span className="font-mono text-[11px] text-[#9CA3AF]">CairoPrecinct.uproject</span>
              </div>
              <div className="mt-3 space-y-1.5">
                {UE5_FOLDER_TREE.map((node) => {
                  const isLinked = Boolean(node.linkedScriptId);
                  const isSelected = node.linkedScriptId === selectedScript.id;
                  return (
                    <button
                      key={node.path}
                      type="button"
                      disabled={!isLinked}
                      onClick={() => {
                        if (node.linkedScriptId) setSelectedScriptId(node.linkedScriptId);
                      }}
                      className={`flex w-full items-start gap-2.5 rounded-lg p-2.5 text-left transition-colors ${
                        isSelected
                          ? 'border border-[#E89B3C]/60 bg-[#1D222B]'
                          : isLinked
                            ? 'border border-transparent hover:bg-white/5'
                            : 'cursor-default border border-transparent opacity-80'
                      }`}
                    >
                      {node.kind === 'cpp' ? (
                        <FileCode2 className="mt-0.5 h-4 w-4 shrink-0 text-[#E89B3C]" />
                      ) : node.kind === 'folder' ? (
                        <Folder className="mt-0.5 h-4 w-4 shrink-0 text-[#9CA3AF]" />
                      ) : (
                        <Layers className="mt-0.5 h-4 w-4 shrink-0 text-[#60A5FA]" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-mono text-xs text-[#F3F4F6]">{node.path}</div>
                        <div className="mt-0.5 text-[11px] text-[#9CA3AF]">{node.note}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right Column: First 5 Core C++/Blueprint Starter Inspector */}
            <div className="flex flex-col rounded-xl border border-white/10 bg-[#161A20] lg:col-span-8">
              {/* 5 Script Selector Tabs */}
              <div className="flex flex-wrap items-center gap-1.5 border-b border-white/10 p-4">
                {UE5_STARTER_SCRIPTS.map((script) => (
                  <button
                    key={script.id}
                    type="button"
                    onClick={() => setSelectedScriptId(script.id)}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                      script.id === selectedScript.id
                        ? 'bg-[#E89B3C] text-[#0D0F12] font-semibold'
                        : 'bg-[#0D0F12] text-[#D1D5DB] hover:text-white'
                    }`}
                  >
                    0{script.order}. {script.className.replace(/^[AU]Cairo/, '')}
                  </button>
                ))}
              </div>

              {/* Script Summary & Meta */}
              <div className="border-b border-white/10 px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-display text-lg font-bold text-white">{selectedScript.className}</h3>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-[#9CA3AF]">
                      <span className="font-mono text-[#E89B3C]">{selectedScript.blueprintName}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono">{selectedScript.filePath}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 rounded-md bg-[#0D0F12] p-1">
                    {(
                      [
                        { id: 'header', label: 'Header (.h)' },
                        { id: 'source', label: 'Source (.cpp)' },
                        { id: 'blueprint', label: 'Blueprint Steps' },
                      ] as const
                    ).map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setCodeTab(t.id)}
                        className={`rounded px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                          codeTab === t.id ? 'bg-[#1D222B] text-white' : 'text-[#9CA3AF] hover:text-white'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="mt-3 text-sm text-[#D1D5DB]">{selectedScript.role}</p>
                <div className="mt-2 text-xs text-[#9CA3AF]">
                  Mobile 60 FPS Note: <span className="text-[#FDE68A]">{selectedScript.mobileBudgetNote}</span>
                </div>
              </div>

              {/* Code or Blueprint Wiring Content */}
              <div className="relative flex-1 p-5">
                {codeTab === 'blueprint' ? (
                  <ol className="space-y-3">
                    {selectedScript.blueprintSteps.map((step, i) => (
                      <li
                        key={step}
                        className="flex items-start gap-3 rounded-lg border border-white/8 bg-[#0D0F12]/70 p-4 text-sm text-[#D1D5DB]"
                      >
                        <span className="font-mono text-xs font-semibold text-[#E89B3C]">0{i + 1}</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <div>
                    <div className="mb-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() =>
                          copyText(
                            `${selectedScript.id}_${codeTab}`,
                            codeTab === 'header' ? selectedScript.cppHeader : selectedScript.cppSource,
                          )
                        }
                        className="flex items-center gap-1.5 rounded-md border border-white/12 bg-[#0D0F12] px-3 py-1.5 text-xs font-medium text-[#E89B3C] transition-colors hover:border-[#E89B3C]"
                      >
                        {copiedId === `${selectedScript.id}_${codeTab}` ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                        <span>{copiedId === `${selectedScript.id}_${codeTab}` ? 'Copied to Clipboard' : 'Copy C++'}</span>
                      </button>
                    </div>
                    <pre className="max-h-[460px] overflow-auto rounded-lg border border-white/8 bg-[#0D0F12] p-4 font-mono text-xs leading-relaxed text-[#E5E7EB]">
                      {codeTab === 'header' ? selectedScript.cppHeader : selectedScript.cppSource}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* SECTION 4: CAMPAIGN & STORE-SAFE VILLAIN IP BIBLE */}
        {activeSection === 'campaign' && (
          <div className="mt-8 space-y-8">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <h2 className="font-display text-2xl font-bold text-white">
                  Greater Cairo Level Progression &amp; Store-Safe Villains
                </h2>
                <p className="mt-2 max-w-3xl text-sm text-[#9CA3AF]">
                  Designed for Google Play and Apple App Store publication: every boss draws atmospheric inspiration from
                  iconic Egyptian cinema tension while using original names, silhouettes, and legal character IP.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {CAIRO_DISTRICTS.map((dist) => (
                <div key={dist.id} className="rounded-xl border border-white/10 bg-[#161A20] p-6">
                  <div className="flex items-center justify-between text-xs text-[#9CA3AF]">
                    <span className="font-mono text-[#E89B3C]">
                      Level 0{dist.level} · {dist.arabicHint}
                    </span>
                    <span className="flex items-center gap-1 font-mono tabular-nums">
                      <MapPin className="h-3.5 w-3.5 text-[#E89B3C]" />
                      {dist.lat.toFixed(4)}°N, {dist.lon.toFixed(4)}°E
                    </span>
                  </div>
                  <h3 className="mt-2 font-display text-xl font-bold text-white">{dist.name}</h3>
                  <div className="mt-1 text-sm font-semibold text-[#FDE68A]">{dist.villainArchetype}</div>
                  <p className="mt-2 text-xs text-[#9CA3AF]">{dist.inspirationNote}</p>

                  <div className="mt-4 space-y-2.5 border-t border-white/10 pt-4 text-xs leading-relaxed text-[#D1D5DB]">
                    <div>
                      <span className="font-semibold text-white">Boss Fight Mechanic: </span>
                      {dist.bossMechanic}
                    </div>
                    <div>
                      <span className="font-semibold text-white">Arena Geometry: </span>
                      {dist.environmentNotes}
                    </div>
                    <div>
                      <span className="font-semibold text-white">Atmosphere: </span>
                      {dist.lightingMood}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Protagonist Pipeline & Store Compliance */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-[#161A20] p-6">
                <h3 className="font-display text-lg font-semibold text-white">
                  Putting Yourself in UE5 (MetaHuman + Mixamo Pipeline)
                </h3>
                <ol className="mt-3 space-y-2.5 text-sm text-[#D1D5DB]">
                  <li>1. Capture a neutral front + side smartphone scan using RealityScan or Mesh to MetaHuman.</li>
                  <li>2. Import into UE5 via Quixel Bridge and clamp Mobile Skeletal Mesh Min LOD to LOD 3–4 (hair cards only).</li>
                  <li>3. Download Mixamo Rifle Locomotion Pack (Idle, Walk, Run, Strafe, Crouch, Fire, Reload) as FBX without skin.</li>
                  <li>4. Map bones once via UE5 IK Rig / IK Retargeter onto your MetaHuman skeleton and blend inside ABP_CairoHero.</li>
                </ol>
              </div>

              <div className="rounded-xl border border-white/10 bg-[#161A20] p-6">
                <h3 className="font-display text-lg font-semibold text-white">
                  Google Play &amp; App Store IP Safety Checklist
                </h3>
                <ul className="mt-3 space-y-2.5 text-sm text-[#D1D5DB]">
                  <li>• Use original archetype names (El-Ameen, El-Moallem Zarzour) instead of copyrighted film titles or actor likenesses.</li>
                  <li>• Record original voice lines or sound-alike cadence inspired by Cairo street dialect—never sample movie audio clips.</li>
                  <li>• Replace real police emblems and commercial Cairo billboards with stylized fictional precinct crests and shop awnings.</li>
                  <li>• Display the required Google Maps / Cesium attribution string cleanly in your game’s Pause &amp; Credits menu.</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
