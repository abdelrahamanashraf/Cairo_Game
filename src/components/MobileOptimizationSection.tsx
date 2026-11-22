import React, { useMemo, useState } from 'react';
import { Check, Copy, RotateCcw, Smartphone } from 'lucide-react';

type HardwareProfileId = 'mid_mobile' | 'flagship_mobile' | 'pc_lookdev';
type LodPolicy = 'conservative' | 'balanced' | 'aggressive';

interface OptimizationProfile {
  id: HardwareProfileId;
  label: string;
  shortLabel: string;
  targetDevice: string;
  naniteEnabled: boolean;
  lumenEnabled: boolean;
  lightmapRes: number;
  csmCascades: number;
  contentScale: number;
  lodPolicy: LodPolicy;
  shadingPath: 'Mobile Forward' | 'Mobile Deferred' | 'Desktop Deferred (SM6)';
}

const OPTIMIZATION_PROFILES: OptimizationProfile[] = [
  {
    id: 'mid_mobile',
    label: 'Mid-Range 60 FPS (Baked + LODs)',
    shortLabel: 'Mid-Range 60',
    targetDevice: 'Snapdragon 7 / Apple A14–A15',
    naniteEnabled: false,
    lumenEnabled: false,
    lightmapRes: 64,
    csmCascades: 2,
    contentScale: 0.9,
    lodPolicy: 'balanced',
    shadingPath: 'Mobile Forward',
  },
  {
    id: 'flagship_mobile',
    label: 'Flagship Mobile (Deferred + Baked)',
    shortLabel: 'Flagship Mobile',
    targetDevice: 'Snapdragon 8 Gen 3 / Apple A17 Pro',
    naniteEnabled: false,
    lumenEnabled: false,
    lightmapRes: 128,
    csmCascades: 3,
    contentScale: 1.0,
    lodPolicy: 'conservative',
    shadingPath: 'Mobile Deferred',
  },
  {
    id: 'pc_lookdev',
    label: 'PC Look-Dev (Nanite + Lumen)',
    shortLabel: 'PC Nanite+Lumen',
    targetDevice: 'Editor Preview Only (Auto-Stripped on Mobile)',
    naniteEnabled: true,
    lumenEnabled: true,
    lightmapRes: 64,
    csmCascades: 3,
    contentScale: 1.0,
    lodPolicy: 'conservative',
    shadingPath: 'Desktop Deferred (SM6)',
  },
];

const SHUBRA_PIPELINE_COMPARISON = [
  {
    pillar: 'Geometry & Facades',
    pcFeature: 'Nanite Virtualized Mesh (Micro-poly)',
    mobileAlternative: 'Auto-LOD Chains (LOD0–LOD3) + World Partition HLODs',
    shubraTip: 'Keep Nanite Fallback Relative Error = 1.0 so UE5 auto-generates clean mobile proxy meshes.',
  },
  {
    pillar: 'Global Illumination',
    pcFeature: 'Lumen Software/Hardware GI',
    mobileAlternative: 'GPU Lightmass Baked GI + Volumetric Lightmap (200cm cells)',
    shubraTip: 'Bake warm Shubra sandstone bounce into Lightmaps; moving henchmen sample the Volumetric Lightmap.',
  },
  {
    pillar: 'Sun & Shadows',
    pcFeature: 'Virtual Shadow Maps (VSM)',
    mobileAlternative: 'Stationary Directional Light + 2 Cascaded Shadow Maps (32m)',
    shubraTip: 'Static buildings cast baked crisp shadows while player & El-Ameen cast dynamic CSM shadows.',
  },
  {
    pillar: 'Reflections',
    pcFeature: 'Lumen Reflections',
    mobileAlternative: 'Sphere & Box Reflection Captures + SkyLight Recapture',
    shubraTip: 'Place 1 BoxReflectionCapture per Shubra block for taxi paint, shop windows, and asphalt glare.',
  },
  {
    pillar: 'Textures & Build Size',
    pcFeature: 'Virtual Texturing + 4K BC7',
    mobileAlternative: 'ASTC 6x6 (Albedo/Normal) + Max 1024px Street Atlas',
    shubraTip: 'Caps Shubra VRAM footprint under 384 MB and avoids Android thermal throttling.',
  },
];

interface MobileOptimizationSectionProps {
  compact?: boolean;
}

export const MobileOptimizationSection: React.FC<MobileOptimizationSectionProps> = ({ compact = false }) => {
  const [profileId, setProfileId] = useState<HardwareProfileId | 'custom'>('mid_mobile');
  const [naniteEnabled, setNaniteEnabled] = useState<boolean>(false);
  const [lumenEnabled, setLumenEnabled] = useState<boolean>(false);
  const [lightmapRes, setLightmapRes] = useState<number>(64);
  const [csmCascades, setCsmCascades] = useState<number>(2);
  const [contentScale, setContentScale] = useState<number>(0.9);
  const [lodPolicy, setLodPolicy] = useState<LodPolicy>('balanced');
  const [outputTab, setOutputTab] = useState<'checklist' | 'ini' | 'matrix'>('checklist');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const applyProfile = (profile: OptimizationProfile) => {
    setProfileId(profile.id);
    setNaniteEnabled(profile.naniteEnabled);
    setLumenEnabled(profile.lumenEnabled);
    setLightmapRes(profile.lightmapRes);
    setCsmCascades(profile.csmCascades);
    setContentScale(profile.contentScale);
    setLodPolicy(profile.lodPolicy);
  };

  // Compute realistic mobile GPU frame-time budget (16.6 ms = 60 FPS target)
  const budget = useMemo(() => {
    const lodFactor = lodPolicy === 'aggressive' ? 0.8 : lodPolicy === 'balanced' ? 1.0 : 1.24;
    const scaleFactor = Math.pow(contentScale, 1.6);

    const geomMs = Number(((naniteEnabled ? 9.4 : 3.2 * lodFactor) * scaleFactor).toFixed(1));
    const lightingMs = Number(((lumenEnabled ? 11.8 : 2.1 + (lightmapRes / 256) * 0.6) * scaleFactor).toFixed(1));
    const shadowsMs = Number(((1.15 * csmCascades + (lumenEnabled ? 2.2 : 0)) * scaleFactor).toFixed(1));
    const postSkyMs = Number((2.2 * scaleFactor).toFixed(1));
    const totalMs = Number((geomMs + lightingMs + shadowsMs + postSkyMs).toFixed(1));
    const estFps = Math.max(15, Math.min(60, Math.round(1000 / Math.max(16.6, totalMs))));

    // Lightmap disk & memory footprint for Shubra block (~45 static building meshes)
    const bakedLightmapMB = lumenEnabled ? 0 : Math.round((lightmapRes * lightmapRes * 45 * 1.35) / (1024 * 1024) * 3.8);

    let verdict = '60 FPS Mobile Ready — Inside 16.6 ms Frame Budget';
    let verdictClass = 'text-emerald-400';
    let shortVerdict = '60 FPS Safe';

    if (naniteEnabled || lumenEnabled || totalMs > 24) {
      verdict = 'Mobile Bottleneck — Disable Nanite/Lumen in Android & iOS Device Profiles';
      verdictClass = 'text-[#FCA5A5]';
      shortVerdict = 'Exceeds Budget';
    } else if (totalMs > 16.6) {
      verdict = 'Borderline 45–55 FPS — Lower Scale Factor or Cascades to 2';
      verdictClass = 'text-[#FDE68A]';
      shortVerdict = '45–55 FPS';
    }

    return {
      geomMs,
      lightingMs,
      shadowsMs,
      postSkyMs,
      totalMs,
      estFps,
      bakedLightmapMB,
      verdict,
      verdictClass,
      shortVerdict,
    };
  }, [naniteEnabled, lumenEnabled, lightmapRes, csmCascades, contentScale, lodPolicy]);

  const iniSnippet = useMemo(() => {
    const mobileShading = profileId === 'flagship_mobile' ? 1 : 0;
    const lodBias = lodPolicy === 'aggressive' ? 1 : 0;
    return `; 1. Config/DefaultDeviceProfiles.ini — Auto-Strip Nanite & Lumen on Mobile
[Android_Default DeviceProfile]
+CVars=r.Mobile.ShadingPath=${mobileShading}          ; ${mobileShading === 0 ? 'Mobile Forward (60 FPS)' : 'Mobile Deferred (Flagship)'}
+CVars=r.Nanite=${naniteEnabled ? 1 : 0}                      ; ${naniteEnabled ? 'WARNING: Heavy on mobile GPUs' : 'Uses Nanite Fallback + Classic Auto-LODs'}
+CVars=r.DynamicGlobalIlluminationMethod=${lumenEnabled ? 1 : 0} ; ${lumenEnabled ? 'WARNING: Software Lumen blows 16.6ms budget' : '0 = Baked GPU Lightmass GI'}
+CVars=r.ReflectionMethod=${lumenEnabled ? 1 : 0}            ; ${lumenEnabled ? 'Lumen Reflections' : '0 = Sphere/Box Reflection Captures'}
+CVars=r.MobileContentScaleFactor=${contentScale.toFixed(2)}
+CVars=r.Shadow.CSM.MaxMobileCascades=${csmCascades}
+CVars=r.StaticMeshLODDistanceScale=${lodPolicy === 'aggressive' ? '1.35' : lodPolicy === 'balanced' ? '1.0' : '0.85'}
+CVars=r.SkeletalMeshLODBias=${lodBias}

[iOS_Default DeviceProfile]
+CVars=r.Mobile.ShadingPath=${mobileShading}
+CVars=r.Nanite=0
+CVars=r.DynamicGlobalIlluminationMethod=0
+CVars=r.ReflectionMethod=0
+CVars=r.MobileContentScaleFactor=${contentScale.toFixed(2)}

; 2. Keep Nanite + Lumen ONLY for Desktop Editor Look-Dev
[Windows DeviceProfile]
+CVars=r.Nanite=1
+CVars=r.DynamicGlobalIlluminationMethod=1
+CVars=r.ReflectionMethod=1

; 3. Config/DefaultEngine.ini — Shubra Baked Lightmass Guardrails
[/Script/Engine.RendererSettings]
r.AllowStaticLighting=True
r.Mobile.EnableStaticAndCSMShadowReceivers=True
r.Mobile.AllowDistanceFieldShadows=False
r.GPULightmass.Mode=1
; Target Shubra StaticMesh Lightmap Resolution: ${lightmapRes}x${lightmapRes} px`;
  }, [profileId, naniteEnabled, lumenEnabled, contentScale, csmCascades, lodPolicy, lightmapRes]);

  const bakeChecklist = [
    {
      title: 'Author Once, Strip Nanite & Lumen on Mobile',
      body: 'Keep Nanite + Lumen active in your Windows Device Profile for fast look-dev, then enforce r.Nanite=0 and r.DynamicGlobalIlluminationMethod=0 in [Android_Default] and [iOS_Default] so mobile packages ship classic LODs and baked Lightmaps automatically.',
    },
    {
      title: 'Generate Mobile Auto-LODs & Nanite Fallbacks for Shubra',
      body: `On every Shubra apartment facade, market stall, and taxi StaticMesh, enable Auto Compute LOD Distances with 4 LODs (LOD0 100% → LOD1 50% → LOD2 22% → LOD3 8%) and set Nanite Fallback Target Triangles to 25–35%.`,
    },
    {
      title: 'Configure Stationary Golden-Hour Sun + Static Bounce',
      body: `Set your Shubra DirectionalLight to Stationary with Dynamic Shadow Distance = 3200 cm and ${csmCascades} Mobile CSM Cascades. Static facades bake warm sunset shadows into Lightmaps while the player and El-Ameen cast sharp live shadows.`,
    },
    {
      title: `Bake Shubra GI with GPU Lightmass (${lightmapRes}px Density)`,
      body: `Wrap the playable Shubra street in a LightmassImportanceVolume, check Alt+0 (Lightmap Density) until buildings show even green texels at ${lightmapRes}×${lightmapRes}, and bake via Build → GPU Lightmass for rich Cairo bounce lighting at ~0 ms runtime cost.`,
    },
    {
      title: 'Place Volumetric Lightmap + Reflection Captures',
      body: 'Set World Settings → Volumetric Lightmap Detail Cell Size = 200 cm so moving henchmen pick up warm ochre alley bounce. Place 2–3 BoxReflectionCaptures along the asphalt avenue for crisp taxi and window reflections without Lumen.',
    },
    {
      title: 'Verify Mobile Preview & Shader Complexity',
      body: 'Switch the UE5 Viewport to Settings → Preview Rendering Level → Android ES 3.1 / Vulkan and inspect Alt+8 (Shader Complexity). Keep Shubra materials under 120 instructions and pack textures as ASTC 6x6.',
    },
  ];

  const handleCopy = () => {
    const content =
      outputTab === 'ini'
        ? iniSnippet
        : outputTab === 'checklist'
          ? bakeChecklist.map((s, i) => `0${i + 1}. ${s.title}\n${s.body}`).join('\n\n')
          : SHUBRA_PIPELINE_COMPARISON.map(
              (r) => `${r.pillar}: PC (${r.pcFeature}) -> Mobile (${r.mobileAlternative}) | ${r.shubraTip}`,
            ).join('\n');
    void navigator.clipboard?.writeText(content);
    const key = `${profileId}_${outputTab}`;
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey((curr) => (curr === key ? null : curr)), 1800);
  };

  // Interactive 16.6ms Mobile Frame Budget Visualizer
  const renderFrameBudgetVisualizer = () => {
    const maxScaleMs = 34; // full bar width represents 34ms
    const pct = (ms: number) => `${Math.min(100, (ms / maxScaleMs) * 100).toFixed(1)}%`;
    const target60Pct = `${((16.6 / maxScaleMs) * 100).toFixed(1)}%`;

    return (
      <div className="overflow-hidden rounded-lg border border-white/10 bg-[#0B0D10]">
        <div className="p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-white">
              Shubra Mobile Frame Budget (60 FPS = 16.6 ms)
            </span>
            <span className={`font-mono text-xs font-semibold tabular-nums ${budget.verdictClass}`}>
              {budget.totalMs} ms · ~{budget.estFps} FPS
            </span>
          </div>

          {/* Stacked GPU Budget Bar with 16.6ms Target Line */}
          <div className="relative mt-2.5 h-6 w-full overflow-hidden rounded bg-[#161A20]">
            <div className="flex h-full w-full">
              <div
                style={{ width: pct(budget.geomMs) }}
                title={`Geometry: ${budget.geomMs} ms`}
                className="h-full bg-[#E89B3C] transition-all duration-200"
              />
              <div
                style={{ width: pct(budget.lightingMs) }}
                title={`Lighting & GI: ${budget.lightingMs} ms`}
                className="h-full bg-[#38BDF8] transition-all duration-200"
              />
              <div
                style={{ width: pct(budget.shadowsMs) }}
                title={`Shadows (CSM): ${budget.shadowsMs} ms`}
                className="h-full bg-[#A78BFA] transition-all duration-200"
              />
              <div
                style={{ width: pct(budget.postSkyMs) }}
                title={`Sky & Post-Process: ${budget.postSkyMs} ms`}
                className="h-full bg-[#6B7280] transition-all duration-200"
              />
            </div>
            {/* 16.6ms 60 FPS cutoff marker */}
            <div
              style={{ left: target60Pct }}
              className="pointer-events-none absolute top-0 bottom-0 w-0.5 bg-emerald-400"
            />
          </div>

          {/* Scale axis labels */}
          <div className="relative mt-1 flex items-center justify-between font-mono text-[9px] tabular-nums text-[#9CA3AF]">
            <span>0 ms</span>
            <span className="text-emerald-400">16.6 ms (60 FPS)</span>
            <span>33.3 ms (30 FPS)</span>
          </div>

          {/* Clean unboxed breakdown legend */}
          <div className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1 border-t border-white/8 pt-2 font-mono text-[10px] tabular-nums sm:grid-cols-4">
            <div className="flex items-center justify-between text-[#D1D5DB]">
              <span className="text-[#E89B3C]">{naniteEnabled ? 'Nanite' : 'LODs'}</span>
              <span>{budget.geomMs}ms</span>
            </div>
            <div className="flex items-center justify-between text-[#D1D5DB]">
              <span className="text-[#38BDF8]">{lumenEnabled ? 'Lumen' : 'Baked GI'}</span>
              <span>{budget.lightingMs}ms</span>
            </div>
            <div className="flex items-center justify-between text-[#D1D5DB]">
              <span className="text-[#A78BFA]">CSM ({csmCascades})</span>
              <span>{budget.shadowsMs}ms</span>
            </div>
            <div className="flex items-center justify-between text-[#D1D5DB]">
              <span className="text-[#9CA3AF]">Sky/PP</span>
              <span>{budget.postSkyMs}ms</span>
            </div>
          </div>
        </div>

        {/* Status Footer Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 bg-[#0D0F12] px-3 py-1.5 text-[10px]">
          <span className={`font-medium ${budget.verdictClass}`}>
            {compact ? budget.shortVerdict : budget.verdict}
          </span>
          <span className="font-mono tabular-nums text-[#9CA3AF]">
            {lumenEnabled ? 'Dynamic GI (No Lightmaps)' : `Baked Lightmaps ~${budget.bakedLightmapMB} MB`}
          </span>
        </div>
      </div>
    );
  };

  const renderControls = () => (
    <div className="space-y-3">
      {/* Hardware Tier Presets */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium text-[#9CA3AF]">UE5 Device Profile Target</span>
        <button
          type="button"
          onClick={() => applyProfile(OPTIMIZATION_PROFILES[0])}
          className="flex items-center gap-1 text-[11px] text-[#E89B3C] transition-colors hover:text-white"
        >
          <RotateCcw className="h-3 w-3" />
          <span>Reset Mobile 60</span>
        </button>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        {OPTIMIZATION_PROFILES.map((p) => {
          const active = profileId === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => applyProfile(p)}
              className={`rounded-md border px-2 py-1.5 text-left transition-colors ${
                active
                  ? 'border-[#E89B3C]/70 bg-[#1B2028] text-white'
                  : 'border-white/8 bg-[#161A20]/60 text-[#9CA3AF] hover:border-white/20 hover:text-white'
              }`}
            >
              <div className="truncate text-[11px] font-semibold">
                {compact ? p.shortLabel : p.label}
              </div>
              <div className="mt-0.5 truncate text-[10px] text-[#9CA3AF]">{p.shadingPath}</div>
            </button>
          );
        })}
      </div>

      {/* Nanite & Lumen Live Trade-off Toggles */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => {
            setProfileId('custom');
            setNaniteEnabled((v) => !v);
          }}
          className={`rounded-md border px-2.5 py-2 text-left transition-colors ${
            naniteEnabled
              ? 'border-[#FCA5A5]/60 bg-[#261618] text-white'
              : 'border-[#E89B3C]/50 bg-[#161A20] text-white'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-semibold">
            <span>Nanite Geometry</span>
            <span className={`font-mono text-[10px] ${naniteEnabled ? 'text-[#FCA5A5]' : 'text-emerald-400'}`}>
              {naniteEnabled ? 'ON (PC)' : 'OFF (LODs)'}
            </span>
          </div>
          <div className="mt-0.5 text-[10px] text-[#9CA3AF]">
            {naniteEnabled ? 'Heavy compute — unsupported on most phones' : 'Auto-LOD0–3 + HLOD (Mobile 60 FPS)'}
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setProfileId('custom');
            setLumenEnabled((v) => !v);
          }}
          className={`rounded-md border px-2.5 py-2 text-left transition-colors ${
            lumenEnabled
              ? 'border-[#FCA5A5]/60 bg-[#261618] text-white'
              : 'border-[#E89B3C]/50 bg-[#161A20] text-white'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-semibold">
            <span>Lumen GI</span>
            <span className={`font-mono text-[10px] ${lumenEnabled ? 'text-[#FCA5A5]' : 'text-emerald-400'}`}>
              {lumenEnabled ? 'ON (PC)' : 'BAKED GI'}
            </span>
          </div>
          <div className="mt-0.5 text-[10px] text-[#9CA3AF]">
            {lumenEnabled ? 'Exceeds mobile 16.6ms GPU frame cap' : 'GPU Lightmass + Volumetric Lightmap'}
          </div>
        </button>
      </div>

      {/* Mobile Baking & LOD Sliders */}
      <div className={`grid gap-3 rounded-lg border border-white/8 bg-[#0D0F12]/80 p-3 ${compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
        {/* Lightmap Resolution */}
        <div>
          <div className="flex items-center justify-between text-[11px]">
            <label htmlFor={`opt-lm-${compact ? 'c' : 'f'}`} className="text-[#D1D5DB]">
              Shubra Building Lightmap Res
            </label>
            <span className="font-mono tabular-nums text-[#E89B3C]">{lightmapRes}×{lightmapRes} px</span>
          </div>
          <input
            id={`opt-lm-${compact ? 'c' : 'f'}`}
            type="range"
            min={32}
            max={256}
            step={32}
            disabled={lumenEnabled}
            value={lightmapRes}
            onChange={(e) => {
              setProfileId('custom');
              setLightmapRes(Number(e.target.value));
            }}
            className="mt-1 w-full accent-[#E89B3C] disabled:opacity-40"
          />
        </div>

        {/* CSM Cascades */}
        <div>
          <div className="flex items-center justify-between text-[11px]">
            <label htmlFor={`opt-csm-${compact ? 'c' : 'f'}`} className="text-[#D1D5DB]">
              Stationary Sun CSM Cascades
            </label>
            <span className="font-mono tabular-nums text-[#E89B3C]">{csmCascades} cascades</span>
          </div>
          <input
            id={`opt-csm-${compact ? 'c' : 'f'}`}
            type="range"
            min={1}
            max={3}
            step={1}
            value={csmCascades}
            onChange={(e) => {
              setProfileId('custom');
              setCsmCascades(Number(e.target.value));
            }}
            className="mt-1 w-full accent-[#E89B3C]"
          />
        </div>

        {/* Mobile Content Scale Factor */}
        <div>
          <div className="flex items-center justify-between text-[11px]">
            <label htmlFor={`opt-scale-${compact ? 'c' : 'f'}`} className="text-[#D1D5DB]">
              Mobile Content Scale Factor
            </label>
            <span className="font-mono tabular-nums text-[#E89B3C]">{contentScale.toFixed(2)}×</span>
          </div>
          <input
            id={`opt-scale-${compact ? 'c' : 'f'}`}
            type="range"
            min={0.75}
            max={1.0}
            step={0.05}
            value={contentScale}
            onChange={(e) => {
              setProfileId('custom');
              setContentScale(Number(e.target.value));
            }}
            className="mt-1 w-full accent-[#E89B3C]"
          />
        </div>

        {/* LOD Distance Aggressiveness */}
        <div>
          <div className="mb-1 flex items-center justify-between text-[11px]">
            <span className="text-[#D1D5DB]">Static Mesh LOD Aggression</span>
            <span className="font-mono text-[#E89B3C] capitalize">{lodPolicy}</span>
          </div>
          <div className="grid grid-cols-3 gap-1 rounded bg-[#161A20] p-0.5">
            {(['conservative', 'balanced', 'aggressive'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => {
                  setProfileId('custom');
                  setLodPolicy(mode);
                }}
                className={`rounded px-1.5 py-1 text-[10px] font-medium capitalize transition-colors ${
                  lodPolicy === mode ? 'bg-[#E89B3C] font-semibold text-[#0D0F12]' : 'text-[#9CA3AF] hover:text-white'
                }`}
              >
                {mode === 'conservative' ? 'Quality' : mode === 'balanced' ? 'Balanced' : 'Perf'}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderOutputPanel = () => (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate font-display text-sm font-bold text-white md:text-base">
            Shubra Nanite, Lumen &amp; Light Baking Guide
          </h3>
          <div className="truncate font-mono text-[10px] text-[#E89B3C]">
            DefaultDeviceProfiles.ini · GPU Lightmass
          </div>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="flex shrink-0 items-center gap-1.5 rounded-md border border-white/12 bg-[#161A20] px-2.5 py-1.5 text-[11px] font-medium text-[#E89B3C] transition-colors hover:border-[#E89B3C] hover:text-white"
        >
          {copiedKey === `${profileId}_${outputTab}` ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
          <span>{copiedKey === `${profileId}_${outputTab}` ? 'Copied' : 'Copy'}</span>
        </button>
      </div>

      <div className="mt-2.5 flex items-center gap-1 rounded-md bg-[#0D0F12] p-1">
        {(
          [
            { id: 'checklist', label: 'Shubra Steps' },
            { id: 'ini', label: 'DeviceProfiles.ini' },
            { id: 'matrix', label: 'PC vs Mobile' },
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
        {outputTab === 'checklist' ? (
          <ol className="space-y-2.5">
            {bakeChecklist.map((step, i) => (
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
        ) : outputTab === 'matrix' ? (
          <div className="space-y-2.5">
            {SHUBRA_PIPELINE_COMPARISON.map((row) => (
              <div key={row.pillar} className="rounded-md border border-white/8 bg-[#12161C] p-2.5 text-[11px]">
                <div className="font-semibold text-white">{row.pillar}</div>
                <div className="mt-1 flex flex-wrap gap-x-2 text-[#9CA3AF]">
                  <span>PC: {row.pcFeature}</span>
                  <span aria-hidden="true">→</span>
                  <span className="text-[#E89B3C]">Mobile: {row.mobileAlternative}</span>
                </div>
                <p className="mt-1 text-[#D1D5DB]">{row.shubraTip}</p>
              </div>
            ))}
          </div>
        ) : (
          <pre className="font-mono text-[11px] leading-relaxed text-[#E5E7EB] whitespace-pre">
            {iniSnippet}
          </pre>
        )}
      </div>
    </div>
  );

  if (compact) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="space-y-3 border-b border-white/10 px-4 py-3">
          {renderFrameBudgetVisualizer()}
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
          <span>UE5 Mobile Optimization</span>
          <span aria-hidden="true">·</span>
          <span>Nanite Fallbacks vs Auto-LODs</span>
          <span aria-hidden="true">·</span>
          <span>Lumen vs GPU Lightmass Baking</span>
        </div>
        <h2 className="mt-1.5 flex items-center gap-2.5 font-display text-2xl font-bold text-white">
          <Smartphone className="h-6 w-6 text-[#E89B3C]" />
          <span>Mobile Optimization — Shubra Lighting &amp; Geometry Guide</span>
        </h2>
        <p className="mt-1.5 max-w-3xl text-sm text-[#9CA3AF]">
          Use <span className="font-mono text-xs text-[#FDE68A]">Nanite</span> and{' '}
          <span className="font-mono text-xs text-[#FDE68A]">Lumen</span> for fast desktop look-dev, then automatically
          switch Shubra to <strong className="text-white">Auto-LOD chains</strong> and{' '}
          <strong className="text-white">GPU Lightmass baked golden-hour GI</strong> via UE5 Device Profiles to hold 60
          FPS on mobile GPUs without losing Cairo’s warm sunset atmosphere.
        </p>
      </div>

      {/* Desktop vs Mobile Pipeline Comparison Table */}
      <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#161A20]">
        <table className="w-full min-w-[700px] border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-white/10 text-[#9CA3AF]">
              <th className="px-4 py-3 font-medium">Rendering System</th>
              <th className="px-4 py-3 font-medium">PC / Look-Dev Reference</th>
              <th className="px-4 py-3 font-medium text-[#E89B3C]">Shubra Mobile 60 FPS Pipeline</th>
              <th className="px-4 py-3 font-medium">Shubra Production Tip</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/8 text-[#D1D5DB]">
            {SHUBRA_PIPELINE_COMPARISON.map((row) => (
              <tr key={row.pillar} className="align-top">
                <td className="px-4 py-3 font-semibold text-white">{row.pillar}</td>
                <td className="px-4 py-3 text-[#9CA3AF]">{row.pcFeature}</td>
                <td className="px-4 py-3 font-medium text-[#FDE68A]">{row.mobileAlternative}</td>
                <td className="px-4 py-3">{row.shubraTip}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Interactive Frame Budget & Controls + Copyable Output */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-5 rounded-xl border border-white/10 bg-[#161A20] p-5 lg:col-span-6">
          {renderFrameBudgetVisualizer()}
          {renderControls()}
        </div>

        <div className="flex h-[580px] flex-col rounded-xl border border-white/10 bg-[#161A20] p-5 lg:col-span-6">
          {renderOutputPanel()}
        </div>
      </div>
    </div>
  );
};
