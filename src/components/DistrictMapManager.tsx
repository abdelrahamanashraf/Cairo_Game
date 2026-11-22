import React, { useMemo, useState } from 'react';
import { Check, Compass, Copy, Globe, Layers, MapPin } from 'lucide-react';

export type ManagedDistrictKey = 'shubra' | 'old_cairo' | 'sheikh_zayed' | 'new_capital';

interface DistrictCesiumConfig {
  id: ManagedDistrictKey;
  shortLabel: string;
  fullName: string;
  arabicName: string;
  levelNumber: number;
  umapAsset: string;
  originLat: number;
  originLon: number;
  originHeightM: number;
  playerStartLat: number;
  playerStartLon: number;
  playerStartYawDeg: number;
  cesiumIonAssetId: number;
  maxSSE: number;
  culledSSE: number;
  cutoutRadiusM: number;
  maxSimultaneousLoads: number;
  maxCachedMB: number;
  streamingPoolMB: number;
  fogCulling: boolean;
  frustumCulling: boolean;
  createPhysicsMeshes: boolean;
  preloadAncestors: boolean;
  preloadSiblings: boolean;
  skylineReference: string;
  clippingNotes: string;
  bossTarget: string;
}

const DISTRICT_CONFIGS: DistrictCesiumConfig[] = [
  {
    id: 'shubra',
    shortLabel: 'Shubra',
    fullName: 'Shubra / Downtown Precinct',
    arabicName: 'شبرا / وسط البلد',
    levelNumber: 1,
    umapAsset: 'Content/Cairo/Maps/L_01_Shubra_Precinct.umap',
    originLat: 30.0771,
    originLon: 31.2458,
    originHeightM: 28,
    playerStartLat: 30.0766,
    playerStartLon: 31.2455,
    playerStartYawDeg: 14,
    cesiumIonAssetId: 2275207,
    maxSSE: 28,
    culledSSE: 64,
    cutoutRadiusM: 140,
    maxSimultaneousLoads: 3,
    maxCachedMB: 192,
    streamingPoolMB: 384,
    fogCulling: true,
    frustumCulling: true,
    createPhysicsMeshes: false,
    preloadAncestors: false,
    preloadSiblings: false,
    skylineReference: 'Shubra Street mid-rise apartment roofs, rooftop water tanks & Ramses rail corridor',
    clippingNotes: 'Tight 140m urban block cutout removes dense balcony photogrammetry jitter while keeping surrounding rooftops intact.',
    bossTarget: 'El-Ameen (Corrupt Precinct Officer)',
  },
  {
    id: 'old_cairo',
    shortLabel: 'Old Cairo',
    fullName: 'Old Cairo / El-Sabbatiya Alleys',
    arabicName: 'مصر القديمة / السبتية',
    levelNumber: 2,
    umapAsset: 'Content/Cairo/Maps/L_02_OldCairo_Sabbatiya.umap',
    originLat: 30.0131,
    originLon: 31.2314,
    originHeightM: 32,
    playerStartLat: 30.0127,
    playerStartLon: 31.2311,
    playerStartYawDeg: 35,
    cesiumIonAssetId: 2275207,
    maxSSE: 28,
    culledSSE: 64,
    cutoutRadiusM: 165,
    maxSimultaneousLoads: 3,
    maxCachedMB: 192,
    streamingPoolMB: 384,
    fogCulling: true,
    frustumCulling: true,
    createPhysicsMeshes: false,
    preloadAncestors: false,
    preloadSiblings: false,
    skylineReference: 'Historic Fustat brick courtyards, mosque minarets & Nile Corniche southern horizon',
    clippingNotes: '165m irregular alley cutout eliminates narrow-lane mesh fusion so AI NavMesh routes cleanly across stepped courtyards.',
    bossTarget: 'El-Moallem Zarzour (Old Quarter Kingpin)',
  },
  {
    id: 'sheikh_zayed',
    shortLabel: 'Sheikh Zayed',
    fullName: 'Sheikh Zayed Compound',
    arabicName: 'الشيخ زايد',
    levelNumber: 3,
    umapAsset: 'Content/Cairo/Maps/L_03_SheikhZayed_Compound.umap',
    originLat: 30.0444,
    originLon: 30.9756,
    originHeightM: 165,
    playerStartLat: 30.0439,
    playerStartLon: 30.9751,
    playerStartYawDeg: -22,
    cesiumIonAssetId: 2275207,
    maxSSE: 30,
    culledSSE: 72,
    cutoutRadiusM: 210,
    maxSimultaneousLoads: 4,
    maxCachedMB: 224,
    streamingPoolMB: 448,
    fogCulling: true,
    frustumCulling: true,
    createPhysicsMeshes: false,
    preloadAncestors: false,
    preloadSiblings: false,
    skylineReference: 'Western desert plateau, gated villa compounds, palm avenues & 26th of July Corridor',
    clippingNotes: '210m compound cutout clears wide courtyard sightlines for balcony sniper telegraphs and circling SUV patrol loops.',
    bossTarget: 'El-Basha El-Hefny (The Compound Baron)',
  },
  {
    id: 'new_capital',
    shortLabel: 'New Admin Capital',
    fullName: 'New Administrative Capital — Iconic Tower Plaza',
    arabicName: 'العاصمة الإدارية الجديدة',
    levelNumber: 4,
    umapAsset: 'Content/Cairo/Maps/L_04_NewAdminCapital_Plaza.umap',
    originLat: 30.0138,
    originLon: 31.7376,
    originHeightM: 245,
    playerStartLat: 30.0132,
    playerStartLon: 31.7371,
    playerStartYawDeg: 8,
    cesiumIonAssetId: 2275207,
    maxSSE: 32,
    culledSSE: 80,
    cutoutRadiusM: 240,
    maxSimultaneousLoads: 4,
    maxCachedMB: 256,
    streamingPoolMB: 512,
    fogCulling: true,
    frustumCulling: true,
    createPhysicsMeshes: false,
    preloadAncestors: false,
    preloadSiblings: false,
    skylineReference: 'Central Business District glass towers, Green River axis & 394m Iconic Tower silhouette',
    clippingNotes: '240m civic plaza cutout hosts multi-tier travertine cover while SSE 32 streams tall CBD curtain-wall towers cleanly.',
    bossTarget: 'The Syndicate Architect',
  },
];

function formatDms(value: number, positiveDir: string, negativeDir: string): string {
  const dir = value >= 0 ? positiveDir : negativeDir;
  const abs = Math.abs(value);
  const deg = Math.floor(abs);
  const minFloat = (abs - deg) * 60;
  const min = Math.floor(minFloat);
  const sec = ((minFloat - min) * 60).toFixed(1);
  return `${deg}°${String(min).padStart(2, '0')}′${sec.padStart(4, '0')}″${dir}`;
}

function computeCutoutCorners(lat: number, lon: number, radiusM: number) {
  const dLat = radiusM / 111320;
  const dLon = radiusM / (111320 * Math.cos((lat * Math.PI) / 180));
  return [
    { label: 'NW Corner', lat: lat + dLat, lon: lon - dLon },
    { label: 'NE Corner', lat: lat + dLat, lon: lon + dLon },
    { label: 'SE Corner', lat: lat - dLat, lon: lon + dLon },
    { label: 'SW Corner', lat: lat - dLat, lon: lon - dLon },
  ];
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const r = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * r * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface DistrictMapManagerProps {
  compact?: boolean;
}

export const DistrictMapManager: React.FC<DistrictMapManagerProps> = ({ compact = false }) => {
  const [selectedId, setSelectedId] = useState<ManagedDistrictKey>('shubra');
  const [exportTab, setExportTab] = useState<'tileset' | 'ini' | 'cpp'>('tileset');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const selected = useMemo(
    () => DISTRICT_CONFIGS.find((d) => d.id === selectedId) ?? DISTRICT_CONFIGS[0],
    [selectedId],
  );

  const shubraOrigin = DISTRICT_CONFIGS[0];
  const distanceFromShubraKm = useMemo(
    () => haversineKm(shubraOrigin.originLat, shubraOrigin.originLon, selected.originLat, selected.originLon),
    [shubraOrigin.originLat, shubraOrigin.originLon, selected.originLat, selected.originLon],
  );

  const polygonCorners = useMemo(
    () => computeCutoutCorners(selected.originLat, selected.originLon, selected.cutoutRadiusM),
    [selected.originLat, selected.originLon, selected.cutoutRadiusM],
  );

  const ue5IniSnippet = useMemo(
    () => `; UE5 CesiumGeoreference & Cesium3DTileset — ${selected.fullName}
; Map Asset: ${selected.umapAsset}

[/Script/CesiumRuntime.CesiumGeoreference]
OriginPlacement=TrueOrigin
OriginLatitude=${selected.originLat.toFixed(6)}
OriginLongitude=${selected.originLon.toFixed(6)}
OriginHeight=${selected.originHeightM}.0

[/Script/CesiumRuntime.Cesium3DTileset]
TilesetSource=FromCesiumIon
IonAssetID=${selected.cesiumIonAssetId}
MaximumScreenSpaceError=${selected.maxSSE}.0
bEnforceCulledScreenSpaceError=True
CulledScreenSpaceError=${selected.culledSSE}.0
bEnableFrustumCulling=${selected.frustumCulling ? 'True' : 'False'}
bEnableFogCulling=${selected.fogCulling ? 'True' : 'False'}
MaximumSimultaneousTileLoads=${selected.maxSimultaneousLoads}
MaximumCachedBytes=${selected.maxCachedMB * 1024 * 1024}
PreloadAncestors=${selected.preloadAncestors ? 'True' : 'False'}
PreloadSiblings=${selected.preloadSiblings ? 'True' : 'False'}
CreatePhysicsMeshes=${selected.createPhysicsMeshes ? 'True' : 'False'}

; CesiumCartographicPolygon Cutout (${selected.cutoutRadiusM}m half-extent)
; NW: ${polygonCorners[0].lat.toFixed(5)}, ${polygonCorners[0].lon.toFixed(5)}
; NE: ${polygonCorners[1].lat.toFixed(5)}, ${polygonCorners[1].lon.toFixed(5)}
; SE: ${polygonCorners[2].lat.toFixed(5)}, ${polygonCorners[2].lon.toFixed(5)}
; SW: ${polygonCorners[3].lat.toFixed(5)}, ${polygonCorners[3].lon.toFixed(5)}

[/Script/Engine.RendererSettings]
r.Mobile.ShadingPath=0
r.Streaming.PoolSize=${selected.streamingPoolMB}`,
    [selected, polygonCorners],
  );

  const cppSnippet = useMemo(
    () => `// Source/CairoPrecinct/Private/World/CairoDistrictMapManager.cpp
#include "World/CairoDistrictMapManager.h"
#include "CesiumGeoreference.h"
#include "Cesium3DTileset.h"

void ACairoDistrictMapManager::LoadDistrict_${selected.shortLabel.replace(/\s+/g, '')}()
{
    if (!Georeference || !Google3DTileset) return;

    // 1. Re-center UE5 Floating Origin to ${selected.fullName}
    Georeference->SetOriginLongitudeLatitudeHeight(
        FVector(${selected.originLon.toFixed(6)}, ${selected.originLat.toFixed(6)}, ${selected.originHeightM}.0)
    );

    // 2. Apply District-Tuned Cesium 3D Tileset LOD & Streaming Budget
    Google3DTileset->SetIonAssetID(${selected.cesiumIonAssetId});
    Google3DTileset->SetMaximumScreenSpaceError(${selected.maxSSE}.0f);
    Google3DTileset->SetEnforceCulledScreenSpaceError(true);
    Google3DTileset->SetCulledScreenSpaceError(${selected.culledSSE}.0f);
    Google3DTileset->SetEnableFrustumCulling(${selected.frustumCulling ? 'true' : 'false'});
    Google3DTileset->SetEnableFogCulling(${selected.fogCulling ? 'true' : 'false'});
    Google3DTileset->SetMaximumSimultaneousTileLoads(${selected.maxSimultaneousLoads});
    Google3DTileset->SetMaximumCachedBytes(${selected.maxCachedMB}LL * 1024LL * 1024LL);
    Google3DTileset->SetCreatePhysicsMeshes(${selected.createPhysicsMeshes ? 'true' : 'false'});

    // 3. Refresh CartographicPolygon cutout (${selected.cutoutRadiusM}m radius) & stream sub-level
    ApplyCutoutPolygonRadius(${selected.cutoutRadiusM}.0f);
    Google3DTileset->RefreshTileset();
}`,
    [selected],
  );

  const copyValue = (key: string, text: string) => {
    void navigator.clipboard?.writeText(text);
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey((curr) => (curr === key ? null : curr)), 1800);
  };

  // Map real Greater Cairo WGS84 bounds to SVG coordinates (viewBox 0..460 x 0..176)
  const mapProject = (lat: number, lon: number) => {
    const minLon = 30.92;
    const maxLon = 31.82;
    const minLat = 29.985;
    const maxLat = 30.105;
    const x = 28 + ((lon - minLon) / (maxLon - minLon)) * 404;
    const y = 148 - ((lat - minLat) / (maxLat - minLat)) * 116;
    return { x, y };
  };

  const renderDistrictSelector = () => (
    <div
      className={`grid gap-1.5 rounded-lg border border-white/10 bg-[#0D0F12] p-1.5 ${
        compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'
      }`}
    >
      {DISTRICT_CONFIGS.map((dist) => {
        const isActive = dist.id === selected.id;
        return (
          <button
            key={dist.id}
            type="button"
            onClick={() => setSelectedId(dist.id)}
            className={`rounded-md px-3 py-2 text-left transition-colors ${
              isActive
                ? 'bg-[#E89B3C] text-[#0D0F12]'
                : 'bg-transparent text-[#D1D5DB] hover:bg-white/6 hover:text-white'
            }`}
          >
            <div className="flex items-center justify-between gap-1.5">
              <span className="truncate text-xs font-semibold whitespace-nowrap">{dist.shortLabel}</span>
              <span
                className={`font-mono text-[10px] tabular-nums ${
                  isActive ? 'text-[#0D0F12]/80' : 'text-[#9CA3AF]'
                }`}
              >
                0{dist.levelNumber}
              </span>
            </div>
            <div
              className={`mt-0.5 truncate font-mono text-[10px] tabular-nums ${
                isActive ? 'text-[#0D0F12]/85' : 'text-[#E89B3C]'
              }`}
            >
              {dist.originLat.toFixed(4)}°N, {dist.originLon.toFixed(4)}°E
            </div>
          </button>
        );
      })}
    </div>
  );

  const renderCoordinateSchematic = () => (
    <div className="overflow-hidden rounded-lg border border-white/10 bg-[#0B0D10]">
      <svg
        viewBox="0 0 460 176"
        className={`block w-full ${compact ? 'h-[150px]' : 'h-[188px]'}`}
        role="img"
        aria-label="Greater Cairo WGS84 district georeference map schematic"
      >
        <rect x="0" y="0" width="460" height="176" fill="#0B0D10" />

        {/* Subtle Latitude / Longitude Graticule */}
        {[30.0, 30.04, 30.08].map((lat) => {
          const { y } = mapProject(lat, 31.0);
          return (
            <g key={lat}>
              <line x1="20" y1={y} x2="444" y2={y} stroke="#FFFFFF" strokeOpacity="0.06" strokeWidth="1" />
              <text x="6" y={y + 3} fill="#6B7280" fontSize="8" fontFamily="monospace">
                {lat.toFixed(2)}°N
              </text>
            </g>
          );
        })}
        {[31.0, 31.25, 31.5, 31.75].map((lon) => {
          const { x } = mapProject(30.0, lon);
          return (
            <g key={lon}>
              <line x1={x} y1="16" x2={x} y2="154" stroke="#FFFFFF" strokeOpacity="0.06" strokeWidth="1" />
              <text x={x - 14} y="168" fill="#6B7280" fontSize="8" fontFamily="monospace">
                {lon.toFixed(2)}°E
              </text>
            </g>
          );
        })}

        {/* Stylized Nile River Axis (~31.22E curving north-south) */}
        <path
          d="M 164 16 C 168 58, 160 102, 166 154"
          fill="none"
          stroke="#38BDF8"
          strokeOpacity="0.28"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <text x="172" y="28" fill="#38BDF8" fillOpacity="0.55" fontSize="8" fontFamily="monospace">
          NILE
        </text>

        {/* Distance Vector from Shubra to Selected District */}
        {selected.id !== 'shubra' && (() => {
          const p0 = mapProject(shubraOrigin.originLat, shubraOrigin.originLon);
          const p1 = mapProject(selected.originLat, selected.originLon);
          return (
            <line
              x1={p0.x}
              y1={p0.y}
              x2={p1.x}
              y2={p1.y}
              stroke="#E89B3C"
              strokeOpacity="0.55"
              strokeWidth="1.2"
              strokeDasharray="4 3"
            />
          );
        })()}

        {/* Interactive District Georeference Nodes */}
        {DISTRICT_CONFIGS.map((dist) => {
          const { x, y } = mapProject(dist.originLat, dist.originLon);
          const isSelected = dist.id === selected.id;
          const labelOffsetX = dist.id === 'new_capital' ? -84 : dist.id === 'old_cairo' ? 12 : 12;
          const labelOffsetY = dist.id === 'old_cairo' ? 4 : -6;
          return (
            <g
              key={dist.id}
              onClick={() => setSelectedId(dist.id)}
              className="cursor-pointer"
              role="button"
              tabIndex={0}
              aria-label={`Select ${dist.shortLabel}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelectedId(dist.id);
                }
              }}
            >
              {isSelected && (
                <circle
                  cx={x}
                  cy={y}
                  r={Math.max(12, Math.round(dist.cutoutRadiusM / 14))}
                  fill="#E89B3C"
                  fillOpacity="0.14"
                  stroke="#E89B3C"
                  strokeWidth="1.2"
                  strokeDasharray="3 2"
                />
              )}
              <circle
                cx={x}
                cy={y}
                r={isSelected ? 5.5 : 4}
                fill={isSelected ? '#E89B3C' : '#9CA3AF'}
                stroke="#0B0D10"
                strokeWidth="1.5"
              />
              <text
                x={x + labelOffsetX}
                y={y + labelOffsetY}
                fill={isSelected ? '#FDE68A' : '#D1D5DB'}
                fontSize={isSelected ? '9.5' : '8.5'}
                fontWeight={isSelected ? '700' : '500'}
                fontFamily="monospace"
              >
                {dist.shortLabel}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Unboxed Spatial Metadata Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 bg-[#0D0F12] px-3 py-2 font-mono text-[10px] tabular-nums text-[#D1D5DB]">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[#E89B3C]">WGS84 TrueOrigin</span>
          <span aria-hidden="true" className="text-[#6B7280]">·</span>
          <span>Cutout {selected.cutoutRadiusM}m</span>
          <span aria-hidden="true" className="text-[#6B7280]">·</span>
          <span>Elev {selected.originHeightM}m</span>
        </div>
        <span className="text-[#9CA3AF]">
          {selected.id === 'shubra'
            ? 'Primary Reference Origin'
            : `${distanceFromShubraKm.toFixed(1)} km from Shubra`}
        </span>
      </div>
    </div>
  );

  const renderTargetCoordinatesCard = () => (
    <div className="rounded-lg border border-white/10 bg-[#0D0F12] p-4">
      <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2.5">
        <div className="flex items-center gap-2">
          <Compass className="h-4 w-4 text-[#E89B3C]" />
          <h3 className="font-display text-sm font-semibold text-white">Target Georeference Coordinates</h3>
        </div>
        <button
          type="button"
          onClick={() =>
            copyValue(
              `coords_${selected.id}`,
              `${selected.originLat.toFixed(6)}, ${selected.originLon.toFixed(6)}, ${selected.originHeightM}.0`,
            )
          }
          className="flex items-center gap-1.5 whitespace-nowrap rounded-md border border-white/12 bg-[#161A20] px-2.5 py-1 text-[11px] font-medium text-[#E89B3C] transition-colors hover:border-[#E89B3C] hover:text-white"
        >
          {copiedKey === `coords_${selected.id}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          <span>{copiedKey === `coords_${selected.id}` ? 'Copied' : 'Copy Lat/Lon/H'}</span>
        </button>
      </div>

      <div className={`mt-3 grid gap-3 ${compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-3'}`}>
        <div>
          <div className="text-[11px] text-[#9CA3AF]">Origin Latitude</div>
          <div className="mt-0.5 font-mono text-base font-semibold tabular-nums text-white">
            {selected.originLat.toFixed(4)}° N
          </div>
          <div className="font-mono text-[10px] tabular-nums text-[#9CA3AF]">
            {formatDms(selected.originLat, 'N', 'S')}
          </div>
        </div>

        <div>
          <div className="text-[11px] text-[#9CA3AF]">Origin Longitude</div>
          <div className="mt-0.5 font-mono text-base font-semibold tabular-nums text-white">
            {selected.originLon.toFixed(4)}° E
          </div>
          <div className="font-mono text-[10px] tabular-nums text-[#9CA3AF]">
            {formatDms(selected.originLon, 'E', 'W')}
          </div>
        </div>

        <div>
          <div className="text-[11px] text-[#9CA3AF]">Ellipsoid Height</div>
          <div className="mt-0.5 font-mono text-base font-semibold tabular-nums text-[#E89B3C]">
            {selected.originHeightM}.0 m
          </div>
          <div className="font-mono text-[10px] tabular-nums text-[#9CA3AF]">
            Ion Asset #{selected.cesiumIonAssetId}
          </div>
        </div>
      </div>

      <div className="mt-3.5 grid grid-cols-1 gap-2 border-t border-white/10 pt-3 text-xs sm:grid-cols-2">
        <div>
          <span className="text-[#9CA3AF]">Player Start Anchor: </span>
          <span className="font-mono text-[11px] tabular-nums text-[#F3F4F6]">
            {selected.playerStartLat.toFixed(4)}, {selected.playerStartLon.toFixed(4)} (Yaw {selected.playerStartYawDeg}°)
          </span>
        </div>
        <div className="truncate">
          <span className="text-[#9CA3AF]">UE5 Map: </span>
          <span className="font-mono text-[11px] text-[#FDE68A]">{selected.umapAsset}</span>
        </div>
      </div>
    </div>
  );

  const renderCesiumConfigPanel = () => (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate font-display text-sm font-bold text-white md:text-base">
            Cesium 3D Tiles Configuration — {selected.shortLabel}
          </h3>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-[#9CA3AF]">
            <span className="font-mono text-[#E89B3C]">{selected.arabicName}</span>
            <span aria-hidden="true">·</span>
            <span>Boss: {selected.bossTarget}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            copyValue(
              `export_${selected.id}_${exportTab}`,
              exportTab === 'cpp' ? cppSnippet : ue5IniSnippet,
            )
          }
          className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border border-white/12 bg-[#0D0F12] px-2.5 py-1.5 text-[11px] font-medium text-[#E89B3C] transition-colors hover:border-[#E89B3C] hover:text-white"
        >
          {copiedKey === `export_${selected.id}_${exportTab}` ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
          <span>
            {copiedKey === `export_${selected.id}_${exportTab}`
              ? 'Copied'
              : exportTab === 'cpp'
                ? 'Copy C++'
                : 'Copy Config'}
          </span>
        </button>
      </div>

      {/* Config Format Switcher */}
      <div className="mt-3 flex items-center gap-1 rounded-md bg-[#0D0F12] p-1">
        {(
          [
            { id: 'tileset', label: 'Tileset Settings' },
            { id: 'ini', label: 'UE5 INI' },
            { id: 'cpp', label: 'C++ Switcher' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setExportTab(tab.id)}
            className={`flex-1 rounded px-2.5 py-1.5 text-[11px] font-medium whitespace-nowrap transition-colors ${
              exportTab === tab.id ? 'bg-[#1D222B] text-white' : 'text-[#9CA3AF] hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Body */}
      <div className="mt-3 min-h-0 flex-1 overflow-auto rounded-lg border border-white/10 bg-[#0B0D10]">
        {exportTab === 'tileset' ? (
          <div className="divide-y divide-white/8">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-[#0D0F12] text-[11px] text-[#9CA3AF]">
                  <th className="px-3.5 py-2.5 font-medium">Cesium3DTileset Property</th>
                  <th className="px-3.5 py-2.5 font-medium text-right">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/6 font-mono text-[11px] tabular-nums">
                <tr>
                  <td className="px-3.5 py-2 text-[#D1D5DB]">IonAssetID (Google 3D Tiles)</td>
                  <td className="px-3.5 py-2 text-right text-[#FDE68A]">{selected.cesiumIonAssetId}</td>
                </tr>
                <tr>
                  <td className="px-3.5 py-2 text-[#D1D5DB]">MaximumScreenSpaceError</td>
                  <td className="px-3.5 py-2 text-right text-[#E89B3C]">{selected.maxSSE}.0 px</td>
                </tr>
                <tr>
                  <td className="px-3.5 py-2 text-[#D1D5DB]">CulledScreenSpaceError</td>
                  <td className="px-3.5 py-2 text-right text-white">{selected.culledSSE}.0 px</td>
                </tr>
                <tr>
                  <td className="px-3.5 py-2 text-[#D1D5DB]">CartographicPolygon Cutout Radius</td>
                  <td className="px-3.5 py-2 text-right text-[#E89B3C]">{selected.cutoutRadiusM} m</td>
                </tr>
                <tr>
                  <td className="px-3.5 py-2 text-[#D1D5DB]">MaximumSimultaneousTileLoads</td>
                  <td className="px-3.5 py-2 text-right text-white">{selected.maxSimultaneousLoads}</td>
                </tr>
                <tr>
                  <td className="px-3.5 py-2 text-[#D1D5DB]">MaximumCachedBytes</td>
                  <td className="px-3.5 py-2 text-right text-white">{selected.maxCachedMB} MB</td>
                </tr>
                <tr>
                  <td className="px-3.5 py-2 text-[#D1D5DB]">r.Streaming.PoolSize</td>
                  <td className="px-3.5 py-2 text-right text-white">{selected.streamingPoolMB} MB</td>
                </tr>
                <tr>
                  <td className="px-3.5 py-2 text-[#D1D5DB]">Frustum / Fog Culling</td>
                  <td className="px-3.5 py-2 text-right text-emerald-400">
                    {selected.frustumCulling ? 'True' : 'False'} / {selected.fogCulling ? 'True' : 'False'}
                  </td>
                </tr>
                <tr>
                  <td className="px-3.5 py-2 text-[#D1D5DB]">CreatePhysicsMeshes</td>
                  <td className="px-3.5 py-2 text-right text-emerald-400">
                    {selected.createPhysicsMeshes ? 'True' : 'False (Arena Only)'}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* CartographicPolygon 4-Corner Cutout Bounding Coordinates */}
            <div className="p-3.5">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-white">
                <Layers className="h-3.5 w-3.5 text-[#E89B3C]" />
                <span>CesiumCartographicPolygon Clipping Vertices ({selected.cutoutRadiusM}m)</span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-1.5 font-mono text-[10.5px] tabular-nums">
                {polygonCorners.map((pt) => (
                  <div key={pt.label} className="rounded border border-white/8 bg-[#12151B] px-2.5 py-1.5">
                    <div className="text-[10px] text-[#9CA3AF]">{pt.label}</div>
                    <div className="text-[#F3F4F6]">
                      {pt.lat.toFixed(5)}°, {pt.lon.toFixed(5)}°
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-2.5 text-[11px] leading-relaxed text-[#9CA3AF]">
                <strong className="text-[#D1D5DB]">Skyline Stream: </strong>
                {selected.skylineReference}. {selected.clippingNotes}
              </p>
            </div>
          </div>
        ) : (
          <pre className="p-3.5 font-mono text-[11px] leading-relaxed text-[#E5E7EB] whitespace-pre">
            {exportTab === 'ini' ? ue5IniSnippet : cppSnippet}
          </pre>
        )}
      </div>
    </div>
  );

  if (compact) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="space-y-3 border-b border-white/10 px-4 py-3">
          {renderDistrictSelector()}
          {renderCoordinateSchematic()}
          {renderTargetCoordinatesCard()}
        </div>
        <div className="flex min-h-[340px] flex-1 flex-col p-4">{renderCesiumConfigPanel()}</div>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-6">
      {/* Section Header */}
      <div>
        <div className="flex items-center gap-2 text-xs text-[#E89B3C]">
          <span>CesiumGeoreference</span>
          <span aria-hidden="true">·</span>
          <span>Google Photorealistic 3D Tiles</span>
          <span aria-hidden="true">·</span>
          <span>4 Core Campaign Districts</span>
        </div>
        <h2 className="mt-1.5 flex items-center gap-2.5 font-display text-2xl font-bold text-white">
          <MapPin className="h-6 w-6 text-[#E89B3C]" />
          <span>District Map Manager</span>
        </h2>
        <p className="mt-1.5 max-w-3xl text-sm text-[#9CA3AF]">
          Switch between <strong className="text-[#F3F4F6]">Shubra</strong>,{' '}
          <strong className="text-[#F3F4F6]">Old Cairo</strong>,{' '}
          <strong className="text-[#F3F4F6]">Sheikh Zayed</strong>, and{' '}
          <strong className="text-[#F3F4F6]">New Admin Capital</strong> to inspect exact WGS84 georeference origins,
          CartographicPolygon clipping vertices, and district-tuned Cesium 3D Tiles streaming settings.
        </p>
      </div>

      {/* 4-District Primary Selector */}
      {renderDistrictSelector()}

      {/* Two-Column Split: Georeference Schematic + Coordinates vs. Cesium 3D Tiles Configuration */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-4 rounded-xl border border-white/10 bg-[#161A20] p-5 lg:col-span-6">
          {renderCoordinateSchematic()}
          {renderTargetCoordinatesCard()}
        </div>

        <div className="flex min-h-[520px] flex-col rounded-xl border border-white/10 bg-[#161A20] p-5 lg:col-span-6">
          {renderCesiumConfigPanel()}
        </div>
      </div>

      {/* All-4 District Quick Comparison Matrix */}
      <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#161A20]">
        <table className="w-full min-w-[760px] border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-white/10 text-[#9CA3AF]">
              <th className="px-4 py-3 font-medium">District</th>
              <th className="px-4 py-3 font-medium">Target Coordinates (Lat, Lon)</th>
              <th className="px-4 py-3 font-medium text-right">Height</th>
              <th className="px-4 py-3 font-medium text-right">Max SSE</th>
              <th className="px-4 py-3 font-medium text-right">Cutout</th>
              <th className="px-4 py-3 font-medium text-right">Tile Cache</th>
              <th className="px-4 py-3 font-medium">UE5 Map Asset</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/8">
            {DISTRICT_CONFIGS.map((dist) => {
              const active = dist.id === selected.id;
              return (
                <tr
                  key={dist.id}
                  onClick={() => setSelectedId(dist.id)}
                  className={`cursor-pointer transition-colors ${
                    active ? 'bg-[#E89B3C]/10' : 'hover:bg-white/4'
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 font-semibold text-white">
                      <Globe className={`h-3.5 w-3.5 ${active ? 'text-[#E89B3C]' : 'text-[#6B7280]'}`} />
                      <span>{dist.shortLabel}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono tabular-nums text-[#FDE68A]">
                    {dist.originLat.toFixed(4)}° N, {dist.originLon.toFixed(4)}° E
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-[#D1D5DB]">
                    {dist.originHeightM} m
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-[#E89B3C]">
                    {dist.maxSSE} px
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-[#D1D5DB]">
                    {dist.cutoutRadiusM} m
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-[#D1D5DB]">
                    {dist.maxCachedMB} MB
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] text-[#9CA3AF]">
                    {dist.umapAsset.split('/').pop()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
