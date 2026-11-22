import React, { useMemo, useState } from 'react';
import { APIProvider, AdvancedMarker, Map as GoogleMap } from '@vis.gl/react-google-maps';
import { CheckCircle2, Crosshair, MapPin, Play, ShieldAlert, X } from 'lucide-react';
import { CAIRO_DISTRICTS } from '../data/ue5BlueprintData';
import { DistrictId } from '../game/types';

interface CairoTacticalMapProps {
  activeDistrictId: DistrictId;
  clearedDistricts: Record<DistrictId, boolean>;
  onDeployDistrict: (districtId: DistrictId) => void;
  onClose: () => void;
}

const CAIRO_CENTER = { lat: 30.0444, lng: 31.335 };

export const CairoTacticalMap: React.FC<CairoTacticalMapProps> = ({
  activeDistrictId,
  clearedDistricts,
  onDeployDistrict,
  onClose,
}) => {
  const [selectedId, setSelectedId] = useState<DistrictId>(activeDistrictId);
  const [mapLoadError, setMapLoadError] = useState(false);

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  const selectedDistrict = useMemo(
    () => CAIRO_DISTRICTS.find((d) => d.id === selectedId) ?? CAIRO_DISTRICTS[0],
    [selectedId],
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#090B0E]/92 p-4 md:p-6">
      <div className="flex h-[90vh] w-full max-w-[1220px] flex-col overflow-hidden rounded-xl border border-white/15 bg-[#12151B] text-[#F3F4F6] shadow-2xl">
        {/* Top Modal Header */}
        <div className="flex items-center justify-between border-b border-white/10 bg-[#0D0F12] px-5 py-3.5">
          <div className="flex items-center gap-3">
            <MapPin className="h-4 w-4 text-[#E89B3C]" />
            <div>
              <h2 className="font-display text-lg font-bold tracking-tight text-white">
                Greater Cairo Tactical Deployment Map
              </h2>
              <p className="text-xs text-[#9CA3AF]">
                Select any real-world Greater Cairo district to drop directly into its playable 3D combat arena.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Tactical Map"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/12 bg-[#161A20] text-[#D1D5DB] transition-colors hover:border-white/30 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body: Live Google Map + District Mission Dossier */}
        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-12">
          {/* Left: Interactive Google Maps Satellite / Hybrid View of Greater Cairo */}
          <div className="relative min-h-[340px] bg-[#0D0F12] lg:col-span-8">
            {apiKey && !mapLoadError ? (
              <APIProvider
                apiKey={apiKey}
                libraries={['marker']}
                language="en"
                region="EG"
                onError={() => setMapLoadError(true)}
              >
                <div className="h-full w-full">
                  <GoogleMap
                    mapId="DEMO_MAP_ID"
                    mapTypeId="hybrid"
                    defaultCenter={CAIRO_CENTER}
                    defaultZoom={10}
                    gestureHandling="greedy"
                    disableDefaultUI={false}
                    streetViewControl={false}
                    internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                    style={{ width: '100%', height: '100%' }}
                  >
                    {CAIRO_DISTRICTS.map((dist) => {
                      const isSelected = dist.id === selectedId;
                      const isActive = dist.id === activeDistrictId;
                      const isCleared = Boolean(clearedDistricts[dist.id]);
                      return (
                        <AdvancedMarker
                          key={dist.id}
                          position={{ lat: dist.lat, lng: dist.lon }}
                          title={`Level ${dist.level}: ${dist.name}`}
                          onClick={() => setSelectedId(dist.id)}
                        >
                          <div
                            className={`flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1.5 font-mono text-[11px] font-semibold shadow-lg transition-transform ${
                              isSelected
                                ? 'scale-110 border-[#FDE68A] bg-[#E89B3C] text-[#0D0F12]'
                                : isCleared
                                  ? 'border-emerald-400/70 bg-[#0D0F12]/95 text-emerald-300'
                                  : isActive
                                    ? 'border-[#E89B3C] bg-[#161A20]/95 text-white'
                                    : 'border-white/25 bg-[#0D0F12]/90 text-[#E5E7EB] hover:border-[#E89B3C]'
                            }`}
                          >
                            <span>0{dist.level}</span>
                            <span className="max-w-[115px] truncate">{dist.name.split('/')[0].trim()}</span>
                            {isCleared && <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />}
                          </div>
                        </AdvancedMarker>
                      );
                    })}
                  </GoogleMap>
                </div>
              </APIProvider>
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center p-8 text-center">
                <MapPin className="h-9 w-9 text-[#E89B3C]" />
                <div className="mt-3 font-display text-lg font-semibold text-white">
                  Greater Cairo Satellite View Unavailable
                </div>
                <p className="mt-1.5 max-w-md text-xs leading-relaxed text-[#9CA3AF]">
                  The interactive Google Maps layer could not initialize right now. You can still pick any of the four
                  Greater Cairo districts in the mission dossier to deploy immediately.
                </p>
              </div>
            )}

            {/* Quick District Jump Bar over Map Bottom-Left */}
            <div className="pointer-events-auto absolute bottom-3 left-3 z-10 flex flex-wrap gap-1.5">
              {CAIRO_DISTRICTS.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setSelectedId(d.id)}
                  className={`rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    selectedId === d.id
                      ? 'border-[#E89B3C] bg-[#E89B3C] font-semibold text-[#0D0F12]'
                      : 'border-white/15 bg-[#0D0F12]/92 text-[#D1D5DB] hover:border-white/35 hover:text-white'
                  }`}
                >
                  0{d.level}. {d.name.split('—')[0].split('/')[0].trim()}
                </button>
              ))}
            </div>
          </div>

          {/* Right: Selected Cairo District Combat Dossier */}
          <div className="flex flex-col justify-between overflow-y-auto border-t border-white/10 bg-[#161A20] p-5 lg:col-span-4 lg:border-l lg:border-t-0">
            <div>
              <div className="flex items-center justify-between font-mono text-xs text-[#E89B3C]">
                <span>LEVEL 0{selectedDistrict.level} · {selectedDistrict.arabicHint}</span>
                {clearedDistricts[selectedDistrict.id] && (
                  <span className="flex items-center gap-1 text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    SECURED
                  </span>
                )}
              </div>

              <h3 className="mt-2 font-display text-2xl font-bold text-white">{selectedDistrict.name}</h3>

              <div className="mt-2 font-mono text-xs tabular-nums text-[#9CA3AF]">
                GPS {selectedDistrict.lat.toFixed(4)}° N, {selectedDistrict.lon.toFixed(4)}° E · Elev{' '}
                {selectedDistrict.elevationM}m
              </div>

              <div className="mt-4 rounded-lg border border-[#E89B3C]/35 bg-[#0D0F12] p-3.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#E89B3C]">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  <span>DISTRICT BOSS TARGET</span>
                </div>
                <div className="mt-1 font-display text-base font-bold text-white">
                  {selectedDistrict.villainArchetype}
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-[#D1D5DB]">{selectedDistrict.bossMechanic}</p>
              </div>

              <div className="mt-4 space-y-3 text-xs leading-relaxed text-[#9CA3AF]">
                <div>
                  <div className="font-semibold text-[#F3F4F6]">Playable 3D Arena</div>
                  <p className="mt-0.5">{selectedDistrict.environmentNotes}</p>
                </div>
                <div>
                  <div className="font-semibold text-[#F3F4F6]">Atmosphere &amp; Lighting</div>
                  <p className="mt-0.5">{selectedDistrict.lightingMood}</p>
                </div>
                <div className="flex items-center justify-between border-t border-white/10 pt-3 font-mono text-[11px] tabular-nums text-[#D1D5DB]">
                  <span>UE5 Cutout: {selectedDistrict.recommendedArenaRadiusM}m</span>
                  <span>Mobile SSE: {selectedDistrict.recommendedSSE}px</span>
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-2 border-t border-white/10 pt-4">
              <button
                type="button"
                onClick={() => onDeployDistrict(selectedDistrict.id)}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#E89B3C] px-4 py-3 text-sm font-semibold text-[#0D0F12] transition-colors hover:bg-[#F2AD54]"
              >
                <Play className="h-4 w-4" />
                <span>
                  {selectedDistrict.id === activeDistrictId ? 'Redeploy to ' : 'Deploy to '}
                  {selectedDistrict.name.split('—')[0].split('/')[0].trim()}
                </span>
              </button>
              <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#9CA3AF]">
                <Crosshair className="h-3.5 w-3.5 text-[#E89B3C]" />
                <span>Loads custom 3D lighting, architecture &amp; boss AI live</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
