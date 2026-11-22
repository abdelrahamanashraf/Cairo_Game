import React, { useMemo, useState } from 'react';
import { Check, Copy, Globe, RotateCcw } from 'lucide-react';
import { CAIRO_DISTRICTS } from '../data/ue5BlueprintData';

interface CesiumPreset {
  id: string;
  label: string;
  shortLabel: string;
  summary: string;
  maxSSE: number;
  culledSSE: number;
  cutoutRadiusM: number;
  maxLoads: number;
  cacheMB: number;
  poolMB: number;
  enforceCulledSSE: boolean;
  disableTilePhysics: boolean;
}

const CESIUM_PRESETS: CesiumPreset[] = [
  {
    id: 'mobile_balanced',
    label: 'Mobile Combat Balance',
    shortLabel: 'Combat Balance',
    summary: 'Recommended 60 FPS setup: crisp hand-built combat street inside cutout + SSE 28 for lightweight Cairo skyline.',
    maxSSE: 28,
    culledSSE: 64,
    cutoutRadiusM: 140,
    maxLoads: 3,
    cacheMB: 192,
    poolMB: 384,
    enforceCulledSSE: true,
    disableTilePhysics: true,
  },
  {
    id: 'closeup_cinematic',
    label: 'Close-Up Street Detail',
    shortLabel: 'Close-Up Detail',
    summary: 'Low SSE (8 px) forces high-poly photogrammetry up close. Ideal for desktop trailers or flagship ADS zoom.',
    maxSSE: 8,
    culledSSE: 32,
    cutoutRadiusM: 80,
    maxLoads: 6,
    cacheMB: 384,
    poolMB: 640,
    enforceCulledSSE: true,
    disableTilePhysics: false,
  },
  {
    id: 'background_perf',
    label: '60 FPS Background Lite',
    shortLabel: 'Background Lite',
    summary: 'High SSE (36 px) simplifies distant Shubra roofs into low-triangle shells for zero hitching on budget phones.',
    maxSSE: 36,
    culledSSE: 96,
    cutoutRadiusM: 170,
    maxLoads: 2,
    cacheMB: 128,
    poolMB: 256,
    enforceCulledSSE: true,
    disableTilePhysics: true,
  },
  {
    id: 'dynamic_ads',
    label: 'Dynamic ADS Hybrid',
    shortLabel: 'Dynamic ADS',
    summary: 'Runtime-switched SSE: drops to 16 px when aiming down sights at distant rooftops, returns to 30 px during sprints.',
    maxSSE: 18,
    culledSSE: 72,
    cutoutRadiusM: 130,
    maxLoads: 4,
    cacheMB: 224,
    poolMB: 384,
    enforceCulledSSE: true,
    disableTilePhysics: true,
  },
];

interface CesiumTilesSectionProps {
  compact?: boolean;
}

export const CesiumTilesSection: React.FC<CesiumTilesSectionProps> = ({ compact = false }) => {
  const [selectedDistrictId, setSelectedDistrictId] = useState<string>(CAIRO_DISTRICTS[0].id);
  const [presetId, setPresetId] = useState<string>(CESIUM_PRESETS[0].id);
  const [maxSSE, setMaxSSE] = useState<number>(CESIUM_PRESETS[0].maxSSE);
  const [culledSSE, setCulledSSE] = useState<number>(CESIUM_PRESETS[0].culledSSE);
  const [cutoutRadiusM, setCutoutRadiusM] = useState<number>(CESIUM_PRESETS[0].cutoutRadiusM);
  const [maxLoads, setMaxLoads] = useState<number>(CESIUM_PRESETS[0].maxLoads);
  const [cacheMB, setCacheMB] = useState<number>(CESIUM_PRESETS[0].cacheMB);
  const [poolMB, setPoolMB] = useState<number>(CESIUM_PRESETS[0].poolMB);
  const [enforceCulledSSE, setEnforceCulledSSE] = useState<boolean>(CESIUM_PRESETS[0].enforceCulledSSE);
  const [disableTilePhysics, setDisableTilePhysics] = useState<boolean>(CESIUM_PRESETS[0].disableTilePhysics);
  const [outputTab, setOutputTab] = useState<'guide' | 'ue5_ini' | 'cpp'>('guide');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const selectedDistrict = useMemo(
    () => CAIRO_DISTRICTS.find((d) => d.id === selectedDistrictId) ?? CAIRO_DISTRICTS[0],
    [selectedDistrictId],
  );

  const applyPreset = (preset: CesiumPreset) => {
    setPresetId(preset.id);
    setMaxSSE(preset.maxSSE);
    setCulledSSE(preset.culledSSE);
    setCutoutRadiusM(preset.cutoutRadiusM);
    setMaxLoads(preset.maxLoads);
    setCacheMB(preset.cacheMB);
    setPoolMB(preset.poolMB);
    setEnforceCulledSSE(preset.enforceCulledSSE);
    setDisableTilePhysics(preset.disableTilePhysics);
  };

  // Compute LOD refinement distances, SSE formula sample, and mobile headroom
  const metrics = useMemo(() => {
    // Example 1080p viewport, 70° vertical FOV: tan(35°) ≈ 0.7002
    // Distance where a tile with 2.0m geometric error refines: d = (err * H) / (2 * SSE * tan(FOV/2))
    const sampleErrorMeters = 2.0;
    const viewportHeightPx = 1080;
    const tanHalfFov = Math.tan((35 * Math.PI) / 180);
    const highLodCutoffM = Math.round((sampleErrorMeters * viewportHeightPx) / (2 * Math.max(4, maxSSE) * tanHalfFov));

    // Projected pixel error at 45m (close combat) vs 350m (background skyline)
    const sseAt45m = (sampleErrorMeters * viewportHeightPx) / (2 * 45 * tanHalfFov);
    const sseAt350m = (sampleErrorMeters * viewportHeightPx) / (2 * 350 * tanHalfFov);

    const ssePenalty =
      maxSSE <= 10 ? 38 : maxSSE <= 16 ? 26 : maxSSE < 24 ? 14 : maxSSE <= 34 ? 4 : 0;
    const loadPenalty = maxLoads > 4 ? (maxLoads - 4) * 3 : 0;
    const physicsPenalty = disableTilePhysics ? 0 : 7;
    const cullBonus = enforceCulledSSE && culledSSE >= 48 ? 3 : 0;

    const estFps = Math.max(18, Math.min(60, Math.round(60 - ssePenalty - loadPenalty - physicsPenalty + cullBonus)));
    const estRamMB = Math.round(
      490 + cacheMB + poolMB * 0.8 + (cutoutRadiusM / 100) * 55 + (disableTilePhysics ? 0 : 140),
    );
    const triangleBudgetK = Math.round(
      460 * Math.pow(24 / Math.max(6, maxSSE), 1.15) + cutoutRadiusM * 0.45,
    );

    let statusLabel = 'Balanced 60 FPS (Close Combat + Light Background)';
    let statusClass = 'text-emerald-400';
    if (estFps < 42 || estRamMB > 1500) {
      statusLabel = 'Heavy Mobile Load — Raise Max SSE to 24+ for Background';
      statusClass = 'text-[#FCA5A5]';
    } else if (estFps < 55 || estRamMB > 1280) {
      statusLabel = 'Moderate 45–54 FPS — Best for Flagship Phones or ADS Only';
      statusClass = 'text-[#FDE68A]';
    }

    // Visual zone geometry for SVG diagram (viewBox 0..420 x 0..158)
    const cutoutPx = Math.max(76, Math.min(148, Math.round(52 + (cutoutRadiusM / 280) * 96)));
    const midLodPx = Math.max(
      cutoutPx + 42,
      Math.min(345, Math.round(cutoutPx + 35 + ((48 - maxSSE) / 44) * 180)),
    );
    const bgDetailLevel = maxSSE <= 14 ? 'High-Poly' : maxSSE <= 28 ? 'Mid-LOD' : 'Coarse Shell';

    return {
      highLodCutoffM,
      sseAt45m,
      sseAt350m,
      estFps,
      estRamMB,
      triangleBudgetK,
      statusLabel,
      statusClass,
      cutoutPx,
      midLodPx,
      bgDetailLevel,
    };
  }, [maxSSE, culledSSE, cutoutRadiusM, maxLoads, cacheMB, poolMB, enforceCulledSSE, disableTilePhysics]);

  const ue5ConfigSnippet = useMemo(
    () => `; UE5 Cesium3DTileset — ${selectedDistrict.name} (${selectedDistrict.lat.toFixed(4)}, ${selectedDistrict.lon.toFixed(4)})
; 1. Cesium3DTileset Details Panel (LOD & Screen Space Error)
MaximumScreenSpaceError=${maxSSE}.0              ; Lower = sharper close-up, Higher = lighter background
bEnforceCulledScreenSpaceError=${enforceCulledSSE ? 'True' : 'False'}
CulledScreenSpaceError=${culledSSE}.0              ; Coarser LOD for off-screen / occluded tiles
bEnableFrustumCulling=True
bEnableFogCulling=True                      ; Drops tiles hidden behind Shubra dust fog
MaximumSimultaneousTileLoads=${maxLoads}
MaximumCachedBytes=${cacheMB * 1024 * 1024}               ; ${cacheMB} MB strict RAM cap
PreloadAncestors=False
PreloadSiblings=False
CreatePhysicsMeshes=${disableTilePhysics ? 'False' : 'True'}               ; ${disableTilePhysics ? 'Modular street meshes handle combat collision' : 'Enables raw photogrammetry collision (heavy)'}

; 2. CesiumGeoreference + Cutout Polygon
OriginLatitude=${selectedDistrict.lat.toFixed(4)}
OriginLongitude=${selectedDistrict.lon.toFixed(4)}
OriginHeight=${selectedDistrict.elevationM}.0
CartographicPolygonCutoutRadiusMeters=${cutoutRadiusM}

; 3. Config/DefaultEngine.ini — Mobile Forward Guardrails
[/Script/Engine.RendererSettings]
r.Mobile.ShadingPath=0
r.Nanite=0
r.Streaming.PoolSize=${poolMB}`,
    [selectedDistrict, maxSSE, enforceCulledSSE, culledSSE, maxLoads, cacheMB, disableTilePhysics, cutoutRadiusM, poolMB],
  );

  const cppSnippet = useMemo(
    () => `// Source/CairoPrecinct/Private/World/CairoCesiumTileLoader.cpp
#include "World/CairoCesiumTileLoader.h"
#include "Cesium3DTileset.h"

void ACairoCesiumTileLoader::ApplyCombatSseProfile(bool bIsAimingDownSights, bool bInHeavyFirefight)
{
    if (!Google3DTileset) return;

    // Balance crisp close/scoped visuals vs performance-friendly distant Cairo skyline
    float TargetMaxSSE = ${maxSSE}.0f;
    if (bInHeavyFirefight)
    {
        // Relax background tile refinement during intense muzzle-flash & AI waves
        TargetMaxSSE = FMath::Max(TargetMaxSSE, ${Math.min(44, maxSSE + 6)}.0f);
    }
    else if (bIsAimingDownSights)
    {
        // Tighten SSE while scoped in to sharpen rooftops along sightlines
        TargetMaxSSE = FMath::Clamp(TargetMaxSSE * 0.6f, 12.0f, 24.0f);
    }

    Google3DTileset->SetMaximumScreenSpaceError(TargetMaxSSE);
    Google3DTileset->SetEnforceCulledScreenSpaceError(${enforceCulledSSE ? 'true' : 'false'});
    Google3DTileset->SetCulledScreenSpaceError(${culledSSE}.0f);
    Google3DTileset->SetEnableFrustumCulling(true);
    Google3DTileset->SetEnableFogCulling(true);
    Google3DTileset->SetMaximumSimultaneousTileLoads(${maxLoads});
    Google3DTileset->SetMaximumCachedBytes(${cacheMB}LL * 1024LL * 1024LL);
    Google3DTileset->SetCreatePhysicsMeshes(${disableTilePhysics ? 'false' : 'true'});
}`,
    [maxSSE, enforceCulledSSE, culledSSE, maxLoads, cacheMB, disableTilePhysics],
  );

  const sseGuideSteps = [
    {
      title: 'Understand Screen Space Error (SSE)',
      body: `SSE measures how many pixels of geometric error a 3D Tile would show on screen at the camera’s distance. At 45m (close street), a 2m-error tile projects to ~${metrics.sseAt45m.toFixed(1)} px; at 350m (background skyline), the same error projects to only ~${metrics.sseAt350m.toFixed(1)} px.`,
    },
    {
      title: 'Set Maximum Screen Space Error (Threshold)',
      body: `In Cesium3DTileset Details, UE5 refines a tile whenever its computed SSE > MaximumScreenSpaceError (currently ${maxSSE} px). Lower values (6–14) force dense meshes near the player; higher values (24–36) keep distant Cairo buildings lightweight.`,
    },
    {
      title: 'Separate Close-Up Combat from Background Tiles',
      body: `Drop a CesiumCartographicPolygon (${cutoutRadiusM}m radius) around your combat block with a CesiumPolygonRasterOverlay to clip messy street-level photogrammetry. Place crisp hand-built Shubra cover & NavMesh inside, and let Cesium render only the surrounding city.`,
    },
    {
      title: 'Enable Culled SSE & Fog Culling for Background Speed',
      body: `Enable Enforce Culled Screen Space Error (${culledSSE} px), Frustum Culling, and Fog Culling. Tiles behind the camera or hidden inside Shubra’s sunset height fog stay at ultra-coarse LODs without popping when you turn.`,
    },
    {
      title: 'Switch SSE Dynamically for ADS vs. Firefights',
      body: 'Call SetMaximumScreenSpaceError() from Blueprint or C++ when toggling ADS zoom (tighten to 14–18 px) and relax back to 28–34 px during sprint or boss waves to hold a locked 60 FPS on mobile GPUs.',
    },
  ];

  const handleCopy = () => {
    const text =
      outputTab === 'ue5_ini'
        ? ue5ConfigSnippet
        : outputTab === 'cpp'
          ? cppSnippet
          : sseGuideSteps.map((s, i) => `0${i + 1}. ${s.title}\n${s.body}`).join('\n\n');
    void navigator.clipboard?.writeText(text);
    const key = `${selectedDistrict.id}_${outputTab}`;
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey((curr) => (curr === key ? null : curr)), 1800);
  };

  // Interactive SVG showing Camera -> Close Combat Cutout -> Mid SSE Refinement -> Coarse Background Skyline
  const renderLodVisualizer = () => (
    <div className="overflow-hidden rounded-lg border border-white/10 bg-[#0B0D10]">
      <svg
        viewBox="0 0 420 154"
        className={`block w-full ${compact ? 'h-[138px]' : 'h-[188px]'}`}
        role="img"
        aria-label="Cesium 3D Tiles Screen Space Error distance refinement diagram"
      >
        {/* Background gradient & ground horizon */}
        <defs>
          <linearGradient id={`cesiumSky-${compact ? 'c' : 'f'}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#171C24" />
            <stop offset="55%" stopColor="#1B1E24" />
            <stop offset="100%" stopColor="#261D17" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="420" height="154" fill={`url(#cesiumSky-${compact ? 'c' : 'f'})`} />

        {/* Zone 1: Close-Up Combat Arena (Hand-built Cutout) */}
        <rect x="0" y="0" width={metrics.cutoutPx} height="122" fill="#E89B3C" opacity="0.11" />
        <line
          x1={metrics.cutoutPx}
          y1="14"
          x2={metrics.cutoutPx}
          y2="122"
          stroke="#E89B3C"
          strokeWidth="1.2"
          strokeDasharray="3 3"
        />

        {/* Zone 2: Mid-Ground High/Med Cesium 3D Tiles (SSE > MaxSSE refines) */}
        <rect
          x={metrics.cutoutPx}
          y="0"
          width={Math.max(10, metrics.midLodPx - metrics.cutoutPx)}
          height="122"
          fill="#38BDF8"
          opacity="0.08"
        />
        <line
          x1={metrics.midLodPx}
          y1="14"
          x2={metrics.midLodPx}
          y2="122"
          stroke="#38BDF8"
          strokeWidth="1.2"
          strokeDasharray="3 3"
        />

        {/* Zone 3: Distant Cairo Skyline (Coarse Background Tiles) */}
        <rect
          x={metrics.midLodPx}
          y="0"
          width={Math.max(10, 420 - metrics.midLodPx)}
          height="122"
          fill="#9CA3AF"
          opacity="0.05"
        />

        {/* Camera Frustum Cone */}
        <polygon points="22,96 418,24 418,122 22,102" fill="#E89B3C" opacity="0.07" />
        <circle cx="22" cy="99" r="5" fill="#E89B3C" />
        <text x="10" y="116" fill="#FDE68A" fontSize="8" fontFamily="monospace">
          CAM
        </text>

        {/* Close-Up Combat Hand-Built Cover Blocks (Sharp Detail) */}
        <g fill="#E89B3C" fillOpacity="0.35" stroke="#E89B3C" strokeWidth="1">
          <rect x="44" y="84" width="22" height="38" />
          <line x1="44" y1="96" x2="66" y2="96" strokeOpacity="0.6" />
          <line x1="44" y1="108" x2="66" y2="108" strokeOpacity="0.6" />
          <rect x="72" y="96" width="16" height="26" />
        </g>

        {/* Mid-Ground Cesium Tiles (Mesh subdivisions scale inversely with MaxSSE) */}
        <g stroke="#38BDF8" strokeWidth="0.9" fill="#38BDF8" fillOpacity="0.16">
          {[0, 1, 2].map((idx) => {
            const x = metrics.cutoutPx + 14 + idx * 38;
            if (x + 26 > metrics.midLodPx) return null;
            const h = 44 + (idx % 2) * 14;
            const y = 122 - h;
            const subdivs = maxSSE <= 14 ? 4 : maxSSE <= 26 ? 2 : 1;
            return (
              <g key={idx}>
                <rect x={x} y={y} width="26" height={h} />
                {Array.from({ length: subdivs }).map((_, s) => (
                  <line
                    key={s}
                    x1={x}
                    y1={y + ((s + 1) * h) / (subdivs + 1)}
                    x2={x + 26}
                    y2={y + ((s + 1) * h) / (subdivs + 1)}
                    strokeOpacity="0.55"
                  />
                ))}
              </g>
            );
          })}
        </g>

        {/* Distant Background Skyline (Coarse low-triangle boxes) */}
        <g stroke="#9CA3AF" strokeWidth="0.8" fill="#6B7280" fillOpacity="0.18">
          {[0, 1, 2, 3].map((idx) => {
            const x = metrics.midLodPx + 10 + idx * 34;
            if (x + 24 > 414) return null;
            const h = 34 + ((idx * 17) % 24);
            return <rect key={idx} x={x} y={122 - h} width="24" height={h} />;
          })}
        </g>

        {/* Ground Line */}
        <line x1="0" y1="122" x2="420" y2="122" stroke="#374151" strokeWidth="1.5" />

        {/* Zone Labels (Top) */}
        <text x="8" y="13" fill="#FDE68A" fontSize="8.5" fontFamily="monospace">
          COMBAT ({cutoutRadiusM}m)
        </text>
        <text x={metrics.cutoutPx + 6} y="13" fill="#7DD3FC" fontSize="8.5" fontFamily="monospace">
          REFINE (SSE &gt; {maxSSE}px)
        </text>
        {metrics.midLodPx < 330 && (
          <text x={metrics.midLodPx + 6} y="13" fill="#9CA3AF" fontSize="8.5" fontFamily="monospace">
            BG ({metrics.bgDetailLevel})
          </text>
        )}

        {/* Distance & Formula Footer inside SVG */}
        <text x="10" y="141" fill="#9CA3AF" fontSize="8.5" fontFamily="monospace">
          0m
        </text>
        <text x={metrics.cutoutPx - 14} y="141" fill="#E89B3C" fontSize="8.5" fontFamily="monospace">
          {cutoutRadiusM}m
        </text>
        <text x={Math.min(372, metrics.midLodPx - 16)} y="141" fill="#38BDF8" fontSize="8.5" fontFamily="monospace">
          ~{metrics.highLodCutoffM}m
        </text>
        <text x="384" y="141" fill="#9CA3AF" fontSize="8.5" fontFamily="monospace">
          1.2km
        </text>
      </svg>

      {/* Unboxed Tabular Telemetry Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 bg-[#0D0F12] px-3 py-2 font-mono text-[10px] tabular-nums">
        <div className="flex flex-wrap items-center gap-2 text-[#D1D5DB]">
          <span className="text-[#E89B3C]">MaxSSE {maxSSE}px</span>
          <span aria-hidden="true" className="text-[#6B7280]">·</span>
          <span>Est. {metrics.estFps} FPS</span>
          <span aria-hidden="true" className="text-[#6B7280]">·</span>
          <span>{metrics.estRamMB} MB RAM</span>
          <span aria-hidden="true" className="text-[#6B7280]">·</span>
          <span>~{metrics.triangleBudgetK}k Tris</span>
        </div>
        <span className={`font-sans text-[10px] font-medium ${metrics.statusClass}`}>
          {compact ? (metrics.estFps >= 55 ? '60 FPS Safe' : metrics.estFps >= 45 ? 'Flagship Only' : 'High Load') : metrics.statusLabel}
        </span>
      </div>
    </div>
  );

  const renderControls = () => (
    <div className="space-y-3">
      {/* Cairo District Quick Coordinates */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium text-[#9CA3AF]">Cairo District Origin</span>
        <button
          type="button"
          onClick={() => applyPreset(CESIUM_PRESETS[0])}
          className="flex items-center gap-1 text-[11px] text-[#E89B3C] transition-colors hover:text-white"
        >
          <RotateCcw className="h-3 w-3" />
          <span>Reset Mobile 60</span>
        </button>
      </div>

      <div className={`grid gap-1.5 ${compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'}`}>
        {CAIRO_DISTRICTS.map((dist) => {
          const active = dist.id === selectedDistrict.id;
          return (
            <button
              key={dist.id}
              type="button"
              onClick={() => {
                setSelectedDistrictId(dist.id);
                setMaxSSE(dist.recommendedSSE);
                setCutoutRadiusM(dist.recommendedArenaRadiusM);
                setPresetId('custom');
              }}
              className={`rounded-md border px-2.5 py-1.5 text-left transition-colors ${
                active
                  ? 'border-[#E89B3C]/70 bg-[#1B2028] text-white'
                  : 'border-white/8 bg-[#161A20]/60 text-[#9CA3AF] hover:border-white/20 hover:text-white'
              }`}
            >
              <div className="truncate text-[11px] font-semibold">{dist.name}</div>
              <div className="mt-0.5 truncate font-mono text-[10px] tabular-nums text-[#E89B3C]">
                {dist.lat.toFixed(3)}°N, {dist.lon.toFixed(3)}°E
              </div>
            </button>
          );
        })}
      </div>

      {/* Combat vs Background Presets */}
      <div>
        <div className="mb-1.5 text-[11px] font-medium text-[#9CA3AF]">SSE Balance Presets</div>
        <div className={`grid gap-1.5 ${compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'}`}>
          {CESIUM_PRESETS.map((p) => {
            const active = presetId === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p)}
                className={`rounded-md border px-2.5 py-1.5 text-left text-[11px] font-medium whitespace-nowrap truncate transition-colors ${
                  active
                    ? 'border-[#E89B3C]/70 bg-[#1B2028] text-white'
                    : 'border-white/8 bg-[#161A20]/60 text-[#9CA3AF] hover:border-white/20 hover:text-white'
                }`}
              >
                {compact ? p.shortLabel : p.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* SSE & Streaming Sliders */}
      <div className={`grid gap-3 rounded-lg border border-white/8 bg-[#0D0F12]/80 p-3 ${compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
        {/* Maximum Screen Space Error */}
        <div>
          <div className="flex items-center justify-between text-[11px]">
            <label htmlFor={`cesium-sse-${compact ? 'c' : 'f'}`} className="font-medium text-[#F3F4F6]">
              Maximum Screen Space Error
            </label>
            <span className="font-mono tabular-nums text-[#E89B3C]">{maxSSE} px</span>
          </div>
          <input
            id={`cesium-sse-${compact ? 'c' : 'f'}`}
            type="range"
            min={4}
            max={48}
            step={2}
            value={maxSSE}
            onChange={(e) => {
              setPresetId('custom');
              setMaxSSE(Number(e.target.value));
            }}
            className="mt-1 w-full accent-[#E89B3C]"
          />
          <div className="mt-0.5 flex justify-between text-[10px] text-[#9CA3AF]">
            <span>4px Sharp Close-Up</span>
            <span>28px Sweet Spot</span>
            <span>48px Lite BG</span>
          </div>
        </div>

        {/* Culled Screen Space Error */}
        <div>
          <div className="flex items-center justify-between text-[11px]">
            <label htmlFor={`cesium-culled-${compact ? 'c' : 'f'}`} className="font-medium text-[#F3F4F6]">
              Culled Screen Space Error
            </label>
            <span className="font-mono tabular-nums text-[#E89B3C]">{culledSSE} px</span>
          </div>
          <input
            id={`cesium-culled-${compact ? 'c' : 'f'}`}
            type="range"
            min={24}
            max={128}
            step={8}
            value={culledSSE}
            onChange={(e) => {
              setPresetId('custom');
              setCulledSSE(Number(e.target.value));
            }}
            className="mt-1 w-full accent-[#E89B3C]"
          />
          <div className="mt-0.5 text-[10px] text-[#9CA3AF]">
            Coarser LOD budget for tiles behind camera or fog.
          </div>
        </div>

        {/* Combat Cutout Polygon Radius */}
        <div>
          <div className="flex items-center justify-between text-[11px]">
            <label htmlFor={`cesium-cutout-${compact ? 'c' : 'f'}`} className="text-[#D1D5DB]">
              Combat Arena Cutout Radius
            </label>
            <span className="font-mono tabular-nums text-[#E89B3C]">{cutoutRadiusM} m</span>
          </div>
          <input
            id={`cesium-cutout-${compact ? 'c' : 'f'}`}
            type="range"
            min={80}
            max={280}
            step={10}
            value={cutoutRadiusM}
            onChange={(e) => {
              setPresetId('custom');
              setCutoutRadiusM(Number(e.target.value));
            }}
            className="mt-1 w-full accent-[#E89B3C]"
          />
        </div>

        {/* Simultaneous Tile Loads */}
        <div>
          <div className="flex items-center justify-between text-[11px]">
            <label htmlFor={`cesium-loads-${compact ? 'c' : 'f'}`} className="text-[#D1D5DB]">
              Max Simultaneous Tile Loads
            </label>
            <span className="font-mono tabular-nums text-[#E89B3C]">{maxLoads} threads</span>
          </div>
          <input
            id={`cesium-loads-${compact ? 'c' : 'f'}`}
            type="range"
            min={1}
            max={10}
            step={1}
            value={maxLoads}
            onChange={(e) => {
              setPresetId('custom');
              setMaxLoads(Number(e.target.value));
            }}
            className="mt-1 w-full accent-[#E89B3C]"
          />
        </div>

        {/* Tile Cache MB */}
        <div>
          <div className="flex items-center justify-between text-[11px]">
            <label htmlFor={`cesium-cache-${compact ? 'c' : 'f'}`} className="text-[#D1D5DB]">
              Maximum Cached Bytes
            </label>
            <span className="font-mono tabular-nums text-[#E89B3C]">{cacheMB} MB</span>
          </div>
          <input
            id={`cesium-cache-${compact ? 'c' : 'f'}`}
            type="range"
            min={64}
            max={512}
            step={32}
            value={cacheMB}
            onChange={(e) => {
              setPresetId('custom');
              setCacheMB(Number(e.target.value));
            }}
            className="mt-1 w-full accent-[#E89B3C]"
          />
        </div>

        {/* Texture Streaming Pool */}
        <div>
          <div className="flex items-center justify-between text-[11px]">
            <label htmlFor={`cesium-pool-${compact ? 'c' : 'f'}`} className="text-[#D1D5DB]">
              UE5 r.Streaming.PoolSize
            </label>
            <span className="font-mono tabular-nums text-[#E89B3C]">{poolMB} MB</span>
          </div>
          <input
            id={`cesium-pool-${compact ? 'c' : 'f'}`}
            type="range"
            min={192}
            max={768}
            step={64}
            value={poolMB}
            onChange={(e) => {
              setPresetId('custom');
              setPoolMB(Number(e.target.value));
            }}
            className="mt-1 w-full accent-[#E89B3C]"
          />
        </div>
      </div>

      {/* Boolean Culling & Physics Toggles */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => {
            setPresetId('custom');
            setEnforceCulledSSE((v) => !v);
          }}
          className={`rounded-md border px-2.5 py-2 text-left text-[11px] transition-colors ${
            enforceCulledSSE
              ? 'border-[#E89B3C]/60 bg-[#1B2028] text-white'
              : 'border-white/10 bg-[#0D0F12] text-[#9CA3AF]'
          }`}
        >
          <div className="font-medium">Enforce Culled SSE</div>
          <div className="mt-0.5 font-mono text-[10px] text-[#E89B3C]">
            {enforceCulledSSE ? `Active (${culledSSE}px)` : 'Disabled'}
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setPresetId('custom');
            setDisableTilePhysics((v) => !v);
          }}
          className={`rounded-md border px-2.5 py-2 text-left text-[11px] transition-colors ${
            disableTilePhysics
              ? 'border-[#E89B3C]/60 bg-[#1B2028] text-white'
              : 'border-white/10 bg-[#0D0F12] text-[#9CA3AF]'
          }`}
        >
          <div className="font-medium">Tile Physics Meshes</div>
          <div className="mt-0.5 font-mono text-[10px] text-[#E89B3C]">
            {disableTilePhysics ? 'Off (Arena Only)' : 'On (Heavy CPU)'}
          </div>
        </button>
      </div>
    </div>
  );

  const renderOutputPanel = () => (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate font-display text-sm font-bold text-white md:text-base">
            SSE Configuration &amp; UE5 Implementation
          </h3>
          <div className="truncate font-mono text-[10px] text-[#E89B3C]">
            Cesium3DTileset · {selectedDistrict.name}
          </div>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="flex shrink-0 items-center gap-1.5 rounded-md border border-white/12 bg-[#161A20] px-2.5 py-1.5 text-[11px] font-medium text-[#E89B3C] transition-colors hover:border-[#E89B3C] hover:text-white"
        >
          {copiedKey === `${selectedDistrict.id}_${outputTab}` ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
          <span>{copiedKey === `${selectedDistrict.id}_${outputTab}` ? 'Copied' : 'Copy'}</span>
        </button>
      </div>

      <div className="mt-2.5 flex items-center gap-1 rounded-md bg-[#0D0F12] p-1">
        {(
          [
            { id: 'guide', label: 'SSE Guide' },
            { id: 'ue5_ini', label: 'UE5 Settings' },
            { id: 'cpp', label: 'Dynamic C++' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setOutputTab(tab.id)}
            className={`flex-1 rounded px-2 py-1 text-[11px] font-medium whitespace-nowrap transition-colors ${
              outputTab === tab.id ? 'bg-[#1D222B] text-white' : 'text-[#9CA3AF] hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-2.5 min-h-0 flex-1 overflow-auto rounded-lg border border-white/10 bg-[#0B0D10] p-3">
        {outputTab === 'guide' ? (
          <div className="space-y-3">
            {/* Formula Reference Row */}
            <div className="rounded-md border border-white/8 bg-[#12161C] p-2.5">
              <div className="text-[11px] font-semibold text-white">How UE5 Evaluates Screen Space Error</div>
              <div className="mt-1 font-mono text-[11px] text-[#FDE68A]">
                SSE = (GeometricError × ViewportH) / (2 × Distance × tan(FOV / 2))
              </div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-[#9CA3AF]">
                If <span className="font-mono text-[#D1D5DB]">SSE &gt; MaximumScreenSpaceError ({maxSSE} px)</span>,
                Cesium subdivides the tile into sharper child meshes. Raising Maximum SSE stops subdivision closer to the
                player, keeping background Cairo blocks fast while preserving close-up combat clarity.
              </p>
            </div>

            <ol className="space-y-2.5">
              {sseGuideSteps.map((step, i) => (
                <li key={step.title} className="flex items-start gap-2.5 text-xs leading-relaxed">
                  <span className="mt-0.5 font-mono text-[11px] font-semibold tabular-nums text-[#E89B3C]">
                    0{i + 1}.
                  </span>
                  <div>
                    <div className="font-semibold text-white">{step.title}</div>
                    <p className="mt-0.5 text-[11px] text-[#D1D5DB]">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        ) : (
          <pre className="font-mono text-[11px] leading-relaxed text-[#E5E7EB] whitespace-pre">
            {outputTab === 'ue5_ini' ? ue5ConfigSnippet : cppSnippet}
          </pre>
        )}
      </div>
    </div>
  );

  if (compact) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="space-y-3 border-b border-white/10 px-4 py-3">
          {renderLodVisualizer()}
          {renderControls()}
        </div>
        <div className="flex min-h-[280px] flex-1 flex-col p-4">{renderOutputPanel()}</div>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-6">
      <div>
        <div className="flex items-center gap-2 text-xs text-[#E89B3C]">
          <span>Cesium for Unreal</span>
          <span aria-hidden="true">·</span>
          <span>Google Photorealistic 3D Tiles</span>
          <span aria-hidden="true">·</span>
          <span>Screen Space Error LOD Tuning</span>
        </div>
        <h2 className="mt-1.5 flex items-center gap-2.5 font-display text-2xl font-bold text-white">
          <Globe className="h-6 w-6 text-[#E89B3C]" />
          <span>Cesium &amp; 3D Tiles — Screen Space Error (SSE) Guide</span>
        </h2>
        <p className="mt-1.5 max-w-3xl text-sm text-[#9CA3AF]">
          Configure <span className="font-mono text-xs text-[#FDE68A]">Screen Space Error (SSE)</span> and{' '}
          <span className="font-mono text-xs text-[#FDE68A]">MaximumScreenSpaceError</span> on your UE5{' '}
          <span className="font-mono text-xs text-[#FDE68A]">Cesium3DTileset</span> to keep close-up Cairo combat streets
          razor-sharp while streaming lightweight background city meshes at 60 FPS.
        </p>
      </div>

      {/* Close-Up Combat vs Background SSE Comparison Matrix */}
      <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#161A20]">
        <table className="w-full min-w-[680px] border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-white/10 text-[#9CA3AF]">
              <th className="px-4 py-3 font-medium">Scene Zone</th>
              <th className="px-4 py-3 font-medium">Recommended UE5 Setting</th>
              <th className="px-4 py-3 font-medium">Visual Quality</th>
              <th className="px-4 py-3 font-medium">Mobile GPU Impact</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/8 text-[#D1D5DB]">
            <tr>
              <td className="px-4 py-3 font-semibold text-white">Close-Up Combat (0–{cutoutRadiusM}m)</td>
              <td className="px-4 py-3 font-mono text-[#E89B3C]">CartographicPolygon Cutout + Modular Meshes</td>
              <td className="px-4 py-3">Crisp balconies, clean hitboxes, reliable NavMesh</td>
              <td className="px-4 py-3 text-emerald-400">Low &amp; predictable draw calls</td>
            </tr>
            <tr>
              <td className="px-4 py-3 font-semibold text-white">Mid-Ground Rooftops / ADS</td>
              <td className="px-4 py-3 font-mono text-[#E89B3C]">MaximumScreenSpaceError = 16–24 px</td>
              <td className="px-4 py-3">Recognizable Cairo facades along sniper sightlines</td>
              <td className="px-4 py-3 text-[#FDE68A]">Moderate (use during ADS zoom)</td>
            </tr>
            <tr>
              <td className="px-4 py-3 font-semibold text-white">Distant Skyline (&gt;300m)</td>
              <td className="px-4 py-3 font-mono text-[#E89B3C]">MaximumScreenSpaceError = 28–36 px + Fog Culling</td>
              <td className="px-4 py-3">Clean golden-hour silhouettes blended into dust haze</td>
              <td className="px-4 py-3 text-emerald-400">Minimal (~65% fewer triangles)</td>
            </tr>
            <tr>
              <td className="px-4 py-3 font-semibold text-white">Off-Screen / Occluded Tiles</td>
              <td className="px-4 py-3 font-mono text-[#E89B3C]">CulledScreenSpaceError = {culledSSE} px</td>
              <td className="px-4 py-3">Zero visible pop-in when turning 180° in alleys</td>
              <td className="px-4 py-3 text-emerald-400">Saves 30–40% tile cache RAM</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Interactive Tuner + Live Guide/Code Split */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-5 rounded-xl border border-white/10 bg-[#161A20] p-5 lg:col-span-6">
          {renderLodVisualizer()}
          {renderControls()}
        </div>

        <div className="flex h-[620px] flex-col rounded-xl border border-white/10 bg-[#161A20] p-5 lg:col-span-6">
          {renderOutputPanel()}
        </div>
      </div>
    </div>
  );
};
