import React, { useMemo, useState } from 'react';
import { Check, Copy, RotateCcw, Sun } from 'lucide-react';

interface SkyPreset {
  id: string;
  label: string;
  shortLabel: string;
  note: string;
  sunPitchDeg: number; // 0..35 (negative in UE5 Pitch)
  sunAzimuthDeg: number; // 0..360
  lightIntensityLux: number; // 2..12
  lightTempK: number; // 2600..6500
  mieScatteringScale: number; // 0.002..0.045
  mieAnisotropy: number; // 0.55..0.94
  rayleighScale: number; // 0.015..0.060
  fogDensity: number; // 0.005..0.060
}

const SKY_PRESETS: SkyPreset[] = [
  {
    id: 'shubra_golden',
    label: 'Shubra Dusty Sunset',
    shortLabel: 'Shubra Sunset',
    note: 'Signature Cairo golden hour — warm amber key light, elevated Mie dust scatter, soft horizon haze.',
    sunPitchDeg: 9,
    sunAzimuthDeg: 248,
    lightIntensityLux: 7.4,
    lightTempK: 3650,
    mieScatteringScale: 0.019,
    mieAnisotropy: 0.84,
    rayleighScale: 0.033,
    fogDensity: 0.024,
  },
  {
    id: 'khamaseen_dust',
    label: 'Khamaseen Dust Haze',
    shortLabel: 'Khamaseen',
    note: 'Heavy Saharan ochre particulates — wide solar halo and dense street-level height fog.',
    sunPitchDeg: 14,
    sunAzimuthDeg: 225,
    lightIntensityLux: 5.8,
    lightTempK: 3150,
    mieScatteringScale: 0.038,
    mieAnisotropy: 0.74,
    rayleighScale: 0.022,
    fogDensity: 0.046,
  },
  {
    id: 'maghrib_dusk',
    label: 'Old Cairo Maghrib',
    shortLabel: 'Maghrib Dusk',
    note: 'Low 3° solar grazing angle with burnt-terracotta horizon and deep twilight steel-blue zenith.',
    sunPitchDeg: 3,
    sunAzimuthDeg: 268,
    lightIntensityLux: 4.2,
    lightTempK: 2850,
    mieScatteringScale: 0.027,
    mieAnisotropy: 0.88,
    rayleighScale: 0.044,
    fogDensity: 0.031,
  },
  {
    id: 'new_capital_clear',
    label: 'New Capital Clear Gold',
    shortLabel: 'Clear Gold',
    note: 'Cleaner high-visibility sunset for Iconic Tower glass reflections and crisp architectural shadows.',
    sunPitchDeg: 18,
    sunAzimuthDeg: 210,
    lightIntensityLux: 9.2,
    lightTempK: 4450,
    mieScatteringScale: 0.009,
    mieAnisotropy: 0.8,
    rayleighScale: 0.036,
    fogDensity: 0.012,
  },
];

function kelvinToRgbHex(kelvin: number): string {
  const temp = Math.max(2400, Math.min(7000, kelvin)) / 100;
  let r: number;
  let g: number;
  let b: number;

  if (temp <= 66) {
    r = 255;
    g = Math.max(0, Math.min(255, 99.4708025861 * Math.log(temp) - 161.1195681661));
    b = temp <= 19 ? 0 : Math.max(0, Math.min(255, 138.5177312231 * Math.log(temp - 10) - 305.0447927307));
  } else {
    r = Math.max(0, Math.min(255, 329.698727446 * Math.pow(temp - 60, -0.1332047592)));
    g = Math.max(0, Math.min(255, 288.1221695283 * Math.pow(temp - 60, -0.0755148492)));
    b = 255;
  }

  const toHex = (n: number) => Math.round(n).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

interface DynamicSkyToolProps {
  compact?: boolean;
}

export const DynamicSkyTool: React.FC<DynamicSkyToolProps> = ({ compact = false }) => {
  const [presetId, setPresetId] = useState<string>(SKY_PRESETS[0].id);
  const [sunPitchDeg, setSunPitchDeg] = useState<number>(SKY_PRESETS[0].sunPitchDeg);
  const [sunAzimuthDeg, setSunAzimuthDeg] = useState<number>(SKY_PRESETS[0].sunAzimuthDeg);
  const [lightIntensityLux, setLightIntensityLux] = useState<number>(SKY_PRESETS[0].lightIntensityLux);
  const [lightTempK, setLightTempK] = useState<number>(SKY_PRESETS[0].lightTempK);
  const [mieScatteringScale, setMieScatteringScale] = useState<number>(SKY_PRESETS[0].mieScatteringScale);
  const [mieAnisotropy, setMieAnisotropy] = useState<number>(SKY_PRESETS[0].mieAnisotropy);
  const [rayleighScale, setRayleighScale] = useState<number>(SKY_PRESETS[0].rayleighScale);
  const [fogDensity, setFogDensity] = useState<number>(SKY_PRESETS[0].fogDensity);
  const [outputTab, setOutputTab] = useState<'ue5_config' | 'cpp' | 'steps'>('ue5_config');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const applyPreset = (preset: SkyPreset) => {
    setPresetId(preset.id);
    setSunPitchDeg(preset.sunPitchDeg);
    setSunAzimuthDeg(preset.sunAzimuthDeg);
    setLightIntensityLux(preset.lightIntensityLux);
    setLightTempK(preset.lightTempK);
    setMieScatteringScale(preset.mieScatteringScale);
    setMieAnisotropy(preset.mieAnisotropy);
    setRayleighScale(preset.rayleighScale);
    setFogDensity(preset.fogDensity);
  };

  // Compute physically-inspired visual sky colors & mobile render telemetry
  const skyModel = useMemo(() => {
    const pitchNorm = Math.max(0, Math.min(1, sunPitchDeg / 35));
    const dustNorm = Math.max(0, Math.min(1, (mieScatteringScale - 0.002) / 0.043));
    const fogNorm = Math.max(0, Math.min(1, (fogDensity - 0.005) / 0.055));
    const rayNorm = Math.max(0, Math.min(1, (rayleighScale - 0.015) / 0.045));

    const sunHex = kelvinToRgbHex(lightTempK);

    // Zenith color deepens at low elevation & high Rayleigh scatter, warms with dust
    const zR = Math.round(24 + dustNorm * 58 + (1 - rayNorm) * 28);
    const zG = Math.round(38 + pitchNorm * 34 + dustNorm * 34);
    const zB = Math.round(64 + rayNorm * 56 - dustNorm * 28);
    const zenithColor = `rgb(${zR}, ${zG}, ${zB})`;

    // Mid-sky warms into Cairo dusty rose/amber
    const mR = Math.round(118 + dustNorm * 78 + (1 - pitchNorm) * 32);
    const mG = Math.round(86 + pitchNorm * 28 + dustNorm * 28);
    const mB = Math.round(94 - dustNorm * 38 + pitchNorm * 18);
    const midColor = `rgb(${mR}, ${mG}, ${mB})`;

    // Horizon dust band driven by Mie scatter + light temperature
    const hR = Math.round(205 + dustNorm * 36);
    const hG = Math.round(132 + (lightTempK - 2600) / 85 - dustNorm * 12);
    const hB = Math.round(76 + (lightTempK - 2600) / 95 - dustNorm * 20);
    const horizonColor = `rgb(${Math.min(255, hR)}, ${Math.max(82, Math.min(220, hG))}, ${Math.max(44, Math.min(175, hB))})`;

    // Sun position inside SVG preview (viewBox 0..400 x 0..170)
    const sunX = 48 + ((sunAzimuthDeg % 360) / 360) * 304;
    const sunY = 124 - pitchNorm * 88;
    const haloRadius = 32 + dustNorm * 66 + (1 - mieAnisotropy) * 38;
    const fogOpacity = Math.min(0.82, 0.18 + fogNorm * 0.62);

    // UE5 linear color approximations for ExponentialHeightFog inscattering
    const fogLinR = (Math.min(255, hR) / 255).toFixed(2);
    const fogLinG = (Math.max(82, Math.min(220, hG)) / 255).toFixed(2);
    const fogLinB = (Math.max(44, Math.min(175, hB)) / 255).toFixed(2);

    const mobileCostMs = (0.45 + (mieScatteringScale > 0.03 ? 0.08 : 0) + (fogDensity > 0.04 ? 0.06 : 0)).toFixed(2);

    return {
      sunHex,
      zenithColor,
      midColor,
      horizonColor,
      sunX,
      sunY,
      haloRadius,
      fogOpacity,
      fogLinR,
      fogLinG,
      fogLinB,
      mobileCostMs,
    };
  }, [sunPitchDeg, sunAzimuthDeg, lightTempK, mieScatteringScale, mieAnisotropy, rayleighScale, fogDensity]);

  const ue5ConfigSnippet = useMemo(
    () => `; UE5.4+ Dynamic Sky Preset — Shubra / Greater Cairo (60 FPS Mobile Safe)
; 1. DirectionalLight (Atmosphere Sun Light = True, Index = 0)
Rotation=(Pitch=-${sunPitchDeg.toFixed(1)}, Yaw=${sunAzimuthDeg.toFixed(1)}, Roll=0.0)
Intensity=${lightIntensityLux.toFixed(1)}                ; Lux (Mobile Forward Shading)
bUseTemperature=True
Temperature=${lightTempK}.0              ; Warm Cairo sunset kelvin (${skyModel.sunHex})
DynamicShadowDistanceMovableLight=3200.0
NumDynamicShadowCascades=2

; 2. SkyAtmosphere Component (Dusty Cairo Scattering)
RayleighScatteringScale=${rayleighScale.toFixed(4)}
MieScatteringScale=${mieScatteringScale.toFixed(4)}       ; Elevated Saharan dust bloom
MieAnisotropy=${mieAnisotropy.toFixed(2)}                ; Forward solar halo concentration
MieExponentialDistribution=1.6    ; Low-altitude urban Cairo dust layer (km)
AerialPespectiveViewDistanceScale=1.25
GroundAlbedo=(R=0.38,G=0.29,B=0.21,A=1.0)

; 3. ExponentialHeightFog (Matches Cesium 3D Tiles Horizon)
FogDensity=${fogDensity.toFixed(4)}
FogHeightFalloff=0.22
FogInscatteringColor=(R=${skyModel.fogLinR},G=${skyModel.fogLinG},B=${skyModel.fogLinB},A=1.0)
bEnableVolumetricFog=False        ; Disabled on mid-range mobile GPUs

; 4. Config/DefaultEngine.ini — Fast Sky LUT Guardrails
[/Script/Engine.RendererSettings]
r.SkyAtmosphere.FastSkyLUT=1
r.SkyAtmosphere.AerialPerspectiveLUT.FastApplyOnOpaque=1
r.Mobile.SupportAtmosphericFog=1`,
    [
      sunPitchDeg,
      sunAzimuthDeg,
      lightIntensityLux,
      lightTempK,
      rayleighScale,
      mieScatteringScale,
      mieAnisotropy,
      fogDensity,
      skyModel,
    ],
  );

  const cppSnippet = useMemo(
    () => `// Source/CairoPrecinct/Private/World/CairoDynamicSkyRig.cpp
#include "World/CairoDynamicSkyRig.h"
#include "Components/DirectionalLightComponent.h"
#include "Components/SkyAtmosphereComponent.h"
#include "Components/ExponentialHeightFogComponent.h"

void ACairoDynamicSkyRig::ApplyShubraSunsetPreset()
{
    if (SunDirectionalLight)
    {
        SunDirectionalLight->SetWorldRotation(FRotator(-${sunPitchDeg.toFixed(1)}f, ${sunAzimuthDeg.toFixed(1)}f, 0.f));
        SunDirectionalLight->SetIntensity(${lightIntensityLux.toFixed(1)}f);
        SunDirectionalLight->bUseTemperature = true;
        SunDirectionalLight->SetTemperature(${lightTempK}.0f);
        SunDirectionalLight->SetAtmosphereSunLight(true);
        SunDirectionalLight->SetAtmosphereSunLightIndex(0);
    }

    if (SkyAtmosphere)
    {
        SkyAtmosphere->SetRayleighScatteringScale(${rayleighScale.toFixed(4)}f);
        SkyAtmosphere->SetMieScatteringScale(${mieScatteringScale.toFixed(4)}f);
        SkyAtmosphere->SetMieAnisotropy(${mieAnisotropy.toFixed(2)}f);
        SkyAtmosphere->SetMieExponentialDistribution(1.6f);
        SkyAtmosphere->SetAerialPespectiveViewDistanceScale(1.25f);
    }

    if (HeightFog)
    {
        HeightFog->SetFogDensity(${fogDensity.toFixed(4)}f);
        HeightFog->SetFogHeightFalloff(0.22f);
        HeightFog->SetFogInscatteringColor(FLinearColor(${skyModel.fogLinR}f, ${skyModel.fogLinG}f, ${skyModel.fogLinB}f, 1.0f));
    }
}`,
    [
      sunPitchDeg,
      sunAzimuthDeg,
      lightIntensityLux,
      lightTempK,
      rayleighScale,
      mieScatteringScale,
      mieAnisotropy,
      fogDensity,
      skyModel,
    ],
  );

  const blueprintSteps = [
    `Place a DirectionalLight in L_Shubra, enable Atmosphere Sun Light (Index 0), set Rotation Pitch = -${sunPitchDeg.toFixed(1)}° / Yaw = ${sunAzimuthDeg.toFixed(1)}°, and enable Use Temperature (${lightTempK}K).`,
    `Add a SkyAtmosphere actor and raise Mie Scattering Scale to ${mieScatteringScale.toFixed(4)} with Mie Anisotropy ${mieAnisotropy.toFixed(2)} so low-angle sunlight blooms realistically through Cairo urban dust.`,
    `Add a SkyLight set to Real Time Capture = False (use Recapture Sky once on district load) to avoid per-frame cubemap stalls on mobile GPUs.`,
    `Drop ExponentialHeightFog with Density ${fogDensity.toFixed(4)} and warm ochre Inscattering Color (${skyModel.fogLinR}, ${skyModel.fogLinG}, ${skyModel.fogLinB}) to blend your clipped Cesium Google 3D Tiles seamlessly into the horizon.`,
    'Keep Volumetric Clouds and Volumetric Fog disabled on mobile profiles; use a lightweight curved matte cloud dome texture paired with r.SkyAtmosphere.FastSkyLUT=1.',
  ];

  const handleCopy = () => {
    const content =
      outputTab === 'ue5_config'
        ? ue5ConfigSnippet
        : outputTab === 'cpp'
          ? cppSnippet
          : blueprintSteps.map((s, i) => `0${i + 1}. ${s}`).join('\n');
    void navigator.clipboard?.writeText(content);
    const key = `${presetId}_${outputTab}`;
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey((curr) => (curr === key ? null : curr)), 1800);
  };

  const renderSkyPreview = () => (
    <div className="relative overflow-hidden rounded-lg border border-white/10 bg-[#0B0D10]">
      <svg
        viewBox="0 0 400 170"
        className={`w-full block ${compact ? 'h-[138px]' : 'h-[210px]'}`}
        role="img"
        aria-label="Live Shubra Cairo SkyAtmosphere sunset preview"
      >
        <defs>
          <linearGradient id={`skyGrad-${compact ? 'c' : 'f'}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={skyModel.zenithColor} />
            <stop offset="52%" stopColor={skyModel.midColor} />
            <stop offset="86%" stopColor={skyModel.horizonColor} />
            <stop offset="100%" stopColor={skyModel.horizonColor} />
          </linearGradient>

          <radialGradient id={`sunHalo-${compact ? 'c' : 'f'}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFFBEB" stopOpacity="0.98" />
            <stop offset="18%" stopColor={skyModel.sunHex} stopOpacity="0.82" />
            <stop offset="50%" stopColor={skyModel.horizonColor} stopOpacity="0.34" />
            <stop offset="100%" stopColor={skyModel.horizonColor} stopOpacity="0" />
          </radialGradient>

          <linearGradient id={`dustFog-${compact ? 'c' : 'f'}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={skyModel.horizonColor} stopOpacity="0" />
            <stop offset="100%" stopColor={skyModel.horizonColor} stopOpacity={skyModel.fogOpacity} />
          </linearGradient>
        </defs>

        {/* Atmospheric Scattering Dome */}
        <rect x="0" y="0" width="400" height="170" fill={`url(#skyGrad-${compact ? 'c' : 'f'})`} />

        {/* Mie Dust Solar Halo & Core Disc */}
        <circle
          cx={skyModel.sunX}
          cy={skyModel.sunY}
          r={skyModel.haloRadius}
          fill={`url(#sunHalo-${compact ? 'c' : 'f'})`}
        />
        <circle cx={skyModel.sunX} cy={skyModel.sunY} r="7.5" fill="#FFFDF5" opacity="0.96" />

        {/* Subtle High-Altitude Cirrus Wisps */}
        <ellipse cx="95" cy="42" rx="68" ry="6" fill={skyModel.sunHex} opacity="0.16" />
        <ellipse cx="295" cy="54" rx="82" ry="7" fill={skyModel.sunHex} opacity="0.14" />

        {/* Distant Cairo Minaret & Apartment Skyline Layer */}
        <path
          d="M0 142 L0 124 L18 124 L18 118 L32 118 L32 128 L52 128 L52 112 L74 112 L74 126 L92 126 L92 104 L95 92 L98 104 L98 122 L114 122 L114 108 L138 108 L138 128 L162 128 L162 115 L188 115 L188 126 L210 126 L210 100 L218 96 L226 100 L226 126 L246 126 L246 112 L276 112 L276 125 L292 125 L292 94 L295 82 L298 94 L298 122 L322 122 L322 110 L352 110 L352 124 L376 124 L376 116 L400 116 L400 170 L0 170 Z"
          fill="#261B16"
          opacity="0.58"
        />

        {/* ExponentialHeightFog Atmospheric Veil */}
        <rect x="0" y="90" width="400" height="80" fill={`url(#dustFog-${compact ? 'c' : 'f'})`} />

        {/* Foreground Shubra Neoclassical Roofline Silhouettes */}
        <path
          d="M0 170 L0 132 L46 132 L46 144 L68 144 L68 124 L118 124 L118 146 L154 146 L154 134 L196 134 L196 150 L234 150 L234 128 L286 128 L286 145 L334 145 L334 130 L400 130 L400 170 Z"
          fill="#120E0D"
        />
      </svg>

      {/* Clean unboxed telemetry readout strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 bg-[#0D0F12] px-3 py-1.5 font-mono text-[10px] tabular-nums text-[#9CA3AF]">
        <div className="flex items-center gap-2">
          <span className="text-[#E89B3C]">Pitch -{sunPitchDeg}°</span>
          <span aria-hidden="true">·</span>
          <span>{lightTempK}K</span>
          <span aria-hidden="true">·</span>
          <span>Mie {mieScatteringScale.toFixed(3)}</span>
        </div>
        <span className="text-emerald-400">FastSkyLUT ~{skyModel.mobileCostMs}ms</span>
      </div>
    </div>
  );

  const renderSliders = () => (
    <div className="space-y-3">
      {/* Preset Buttons */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium text-[#9CA3AF]">Cairo Atmosphere Presets</span>
        <button
          type="button"
          onClick={() => applyPreset(SKY_PRESETS[0])}
          className="flex items-center gap-1 text-[11px] text-[#E89B3C] hover:text-white transition-colors"
        >
          <RotateCcw className="h-3 w-3" />
          <span>Reset Shubra</span>
        </button>
      </div>

      <div className={`grid gap-1.5 ${compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'}`}>
        {SKY_PRESETS.map((p) => {
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

      {/* Sliders Grid */}
      <div className={`grid gap-3 rounded-lg border border-white/8 bg-[#0D0F12]/80 p-3 ${compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
        {/* 1. Directional Light Pitch */}
        <div>
          <div className="flex items-center justify-between text-[11px]">
            <label htmlFor={`sky-pitch-${compact ? 'c' : 'f'}`} className="text-[#D1D5DB]">
              Directional Light Pitch
            </label>
            <span className="font-mono tabular-nums text-[#E89B3C]">-{sunPitchDeg}°</span>
          </div>
          <input
            id={`sky-pitch-${compact ? 'c' : 'f'}`}
            type="range"
            min={1}
            max={34}
            step={1}
            value={sunPitchDeg}
            onChange={(e) => {
              setPresetId('custom');
              setSunPitchDeg(Number(e.target.value));
            }}
            className="mt-1 w-full accent-[#E89B3C]"
          />
        </div>

        {/* 2. Directional Light Azimuth */}
        <div>
          <div className="flex items-center justify-between text-[11px]">
            <label htmlFor={`sky-yaw-${compact ? 'c' : 'f'}`} className="text-[#D1D5DB]">
              Sun Azimuth (Yaw)
            </label>
            <span className="font-mono tabular-nums text-[#E89B3C]">{sunAzimuthDeg}°</span>
          </div>
          <input
            id={`sky-yaw-${compact ? 'c' : 'f'}`}
            type="range"
            min={0}
            max={355}
            step={5}
            value={sunAzimuthDeg}
            onChange={(e) => {
              setPresetId('custom');
              setSunAzimuthDeg(Number(e.target.value));
            }}
            className="mt-1 w-full accent-[#E89B3C]"
          />
        </div>

        {/* 3. Light Temperature (Kelvin) */}
        <div>
          <div className="flex items-center justify-between text-[11px]">
            <label htmlFor={`sky-temp-${compact ? 'c' : 'f'}`} className="text-[#D1D5DB]">
              Light Temperature
            </label>
            <span className="font-mono tabular-nums text-[#E89B3C]">{lightTempK} K</span>
          </div>
          <input
            id={`sky-temp-${compact ? 'c' : 'f'}`}
            type="range"
            min={2600}
            max={6200}
            step={50}
            value={lightTempK}
            onChange={(e) => {
              setPresetId('custom');
              setLightTempK(Number(e.target.value));
            }}
            className="mt-1 w-full accent-[#E89B3C]"
          />
        </div>

        {/* 4. Directional Light Intensity */}
        <div>
          <div className="flex items-center justify-between text-[11px]">
            <label htmlFor={`sky-lux-${compact ? 'c' : 'f'}`} className="text-[#D1D5DB]">
              Light Intensity (Lux)
            </label>
            <span className="font-mono tabular-nums text-[#E89B3C]">{lightIntensityLux.toFixed(1)} lx</span>
          </div>
          <input
            id={`sky-lux-${compact ? 'c' : 'f'}`}
            type="range"
            min={2}
            max={12}
            step={0.2}
            value={lightIntensityLux}
            onChange={(e) => {
              setPresetId('custom');
              setLightIntensityLux(Number(e.target.value));
            }}
            className="mt-1 w-full accent-[#E89B3C]"
          />
        </div>

        {/* 5. Mie Scattering Scale (Cairo Dust) */}
        <div>
          <div className="flex items-center justify-between text-[11px]">
            <label htmlFor={`sky-mie-${compact ? 'c' : 'f'}`} className="text-[#D1D5DB]">
              SkyAtmosphere Mie Dust
            </label>
            <span className="font-mono tabular-nums text-[#E89B3C]">{mieScatteringScale.toFixed(3)}</span>
          </div>
          <input
            id={`sky-mie-${compact ? 'c' : 'f'}`}
            type="range"
            min={0.002}
            max={0.045}
            step={0.001}
            value={mieScatteringScale}
            onChange={(e) => {
              setPresetId('custom');
              setMieScatteringScale(Number(e.target.value));
            }}
            className="mt-1 w-full accent-[#E89B3C]"
          />
        </div>

        {/* 6. Exponential Height Fog Density */}
        <div>
          <div className="flex items-center justify-between text-[11px]">
            <label htmlFor={`sky-fog-${compact ? 'c' : 'f'}`} className="text-[#D1D5DB]">
              Height Fog Density
            </label>
            <span className="font-mono tabular-nums text-[#E89B3C]">{fogDensity.toFixed(3)}</span>
          </div>
          <input
            id={`sky-fog-${compact ? 'c' : 'f'}`}
            type="range"
            min={0.005}
            max={0.06}
            step={0.001}
            value={fogDensity}
            onChange={(e) => {
              setPresetId('custom');
              setFogDensity(Number(e.target.value));
            }}
            className="mt-1 w-full accent-[#E89B3C]"
          />
        </div>
      </div>
    </div>
  );

  const renderCodePanel = () => (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate font-display text-sm font-bold text-white md:text-base">
            SkyAtmosphere + DirectionalLight
          </h3>
          <div className="truncate font-mono text-[10px] text-[#E89B3C]">
            UE5 Mobile Forward Shading · FastSkyLUT
          </div>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="flex shrink-0 items-center gap-1.5 rounded-md border border-white/12 bg-[#161A20] px-2.5 py-1.5 text-[11px] font-medium text-[#E89B3C] transition-colors hover:border-[#E89B3C] hover:text-white"
        >
          {copiedKey === `${presetId}_${outputTab}` ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
          <span>{copiedKey === `${presetId}_${outputTab}` ? 'Copied' : 'Copy'}</span>
        </button>
      </div>

      <div className="mt-2.5 flex items-center gap-1 rounded-md bg-[#0D0F12] p-1">
        {(
          [
            { id: 'ue5_config', label: 'UE5 Values' },
            { id: 'cpp', label: 'C++ Rig' },
            { id: 'steps', label: 'Setup Steps' },
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
        {outputTab === 'steps' ? (
          <ol className="space-y-2.5 text-xs leading-relaxed text-[#D1D5DB]">
            {blueprintSteps.map((step, i) => (
              <li key={step} className="flex items-start gap-2.5">
                <span className="font-mono text-[11px] font-semibold tabular-nums text-[#E89B3C]">0{i + 1}.</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        ) : (
          <pre className="font-mono text-[11px] leading-relaxed text-[#E5E7EB] whitespace-pre">
            {outputTab === 'ue5_config' ? ue5ConfigSnippet : cppSnippet}
          </pre>
        )}
      </div>
    </div>
  );

  if (compact) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="border-b border-white/10 px-4 py-3 space-y-3">
          {renderSkyPreview()}
          {renderSliders()}
        </div>
        <div className="flex min-h-[240px] flex-1 flex-col p-4">{renderCodePanel()}</div>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#E89B3C]">
            <span>SkyAtmosphere</span>
            <span aria-hidden="true">·</span>
            <span>DirectionalLight</span>
            <span aria-hidden="true">·</span>
            <span>ExponentialHeightFog</span>
          </div>
          <h2 className="mt-1.5 flex items-center gap-2.5 font-display text-2xl font-bold text-white">
            <Sun className="h-6 w-6 text-[#E89B3C]" />
            <span>Dynamic Sky — Shubra Dusty Sunset Configurator</span>
          </h2>
          <p className="mt-1.5 max-w-3xl text-sm text-[#9CA3AF]">
            Tune Unreal Engine 5’s physically based <span className="font-mono text-xs text-[#FDE68A]">SkyAtmosphere</span>{' '}
            and <span className="font-mono text-xs text-[#FDE68A]">DirectionalLight</span> parameters to match Shubra’s
            warm, dusty golden-hour Cairo sunset while staying inside the 60 FPS mobile FastSkyLUT budget.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-5 rounded-xl border border-white/10 bg-[#161A20] p-5 lg:col-span-6">
          {renderSkyPreview()}
          {renderSliders()}
        </div>

        <div className="flex h-[560px] flex-col rounded-xl border border-white/10 bg-[#161A20] p-5 lg:col-span-6">
          {renderCodePanel()}
        </div>
      </div>
    </div>
  );
};
