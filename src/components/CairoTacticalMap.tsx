import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { APIProvider, AdvancedMarker, Map as GoogleMap, useMap } from '@vis.gl/react-google-maps';
import {
  CheckCircle2,
  Compass,
  Crosshair,
  ExternalLink,
  Loader2,
  LocateFixed,
  MapPin,
  Play,
  Radar,
  Search,
  ShieldAlert,
  X,
} from 'lucide-react';
import { CAIRO_DISTRICTS } from '../data/ue5BlueprintData';
import { DistrictId } from '../game/types';

interface CairoTacticalMapProps {
  activeDistrictId: DistrictId;
  clearedDistricts: Record<DistrictId, boolean>;
  onDeployDistrict: (districtId: DistrictId) => void;
  onClose: () => void;
}

interface GroundedPlace {
  title: string;
  uri: string;
  reviewSnippets: Array<{ text: string; uri?: string }>;
}

interface GroundingResult {
  summary: string;
  places: GroundedPlace[];
  model: string;
  queryLabel: string;
}

const CAIRO_CENTER = { lat: 30.032, lng: 31.28 };

const QUICK_SCOUT_PRESETS = [
  { label: 'Heliopolis Korba', query: 'Heliopolis Korba Cairo historic architecture and streets', lat: 30.0911, lng: 31.3249 },
  { label: 'Citadel of Saladin', query: 'Cairo Citadel of Saladin fortress landmarks and surrounding roads', lat: 30.0298, lng: 31.2611 },
  { label: 'Tahrir Square', query: 'Tahrir Square Downtown Cairo major landmarks and boulevards', lat: 30.0444, lng: 31.2357 },
  { label: 'Mohandessin', query: 'Mohandessin Giza League of Arab States Street landmarks', lat: 30.0566, lng: 31.2001 },
];

const MapCameraPanner: React.FC<{ lat: number; lng: number; triggerKey: string }> = ({ lat, lng, triggerKey }) => {
  const map = useMap();
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!map) return;
    if (!initializedRef.current) {
      initializedRef.current = true;
      return;
    }
    map.panTo({ lat, lng });
    const currentZoom = map.getZoom();
    if (typeof currentZoom === 'number' && currentZoom < 11) {
      map.setZoom(11);
    }
  }, [map, lat, lng, triggerKey]);

  return null;
};

function renderFormattedLine(line: string, idx: number): React.ReactNode {
  const cleaned = line.replace(/^[-*•]\s+/, '').trim();
  if (!cleaned) return null;
  const parts = cleaned.split(/(\*\*[^*]+\*\*)/g);
  return (
    <li key={idx} className="flex gap-2 text-xs leading-relaxed text-[#D1D5DB]">
      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#E89B3C]" />
      <span>
        {parts.map((part, pIdx) => {
          if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
            return (
              <strong key={pIdx} className="font-semibold text-white">
                {part.slice(2, -2)}
              </strong>
            );
          }
          return <React.Fragment key={pIdx}>{part}</React.Fragment>;
        })}
      </span>
    </li>
  );
}

export const CairoTacticalMap: React.FC<CairoTacticalMapProps> = ({
  activeDistrictId,
  clearedDistricts,
  onDeployDistrict,
  onClose,
}) => {
  const [selectedId, setSelectedId] = useState<DistrictId>(activeDistrictId);
  const [mapLoadError, setMapLoadError] = useState(false);
  const [dossierTab, setDossierTab] = useState<'brief' | 'intel'>('brief');

  // Google Maps Grounding state
  const [scoutQuery, setScoutQuery] = useState('');
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoStatus, setGeoStatus] = useState<'idle' | 'locating' | 'ready' | 'denied'>('idle');
  const [groundingLoading, setGroundingLoading] = useState(false);
  const [groundingError, setGroundingError] = useState<string | null>(null);
  const [groundingCache, setGroundingCache] = useState<Record<string, GroundingResult>>({});
  const [activeIntelKey, setActiveIntelKey] = useState<string | null>(null);

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  const selectedDistrict = useMemo(
    () => CAIRO_DISTRICTS.find((d) => d.id === selectedId) ?? CAIRO_DISTRICTS[0],
    [selectedId],
  );

  const shortDistrictName = useMemo(
    () => selectedDistrict.name.split('—')[0].split('/')[0].trim(),
    [selectedDistrict.name],
  );

  const clearedCount = useMemo(
    () => CAIRO_DISTRICTS.filter((d) => Boolean(clearedDistricts[d.id])).length,
    [clearedDistricts],
  );

  const activeIntel = activeIntelKey ? groundingCache[activeIntelKey] ?? null : groundingCache[selectedId] ?? null;

  const runMapsGrounding = useCallback(
    async (opts: { cacheKey: string; query: string; districtName?: string; lat: number; lng: number; queryLabel: string }) => {
      setDossierTab('intel');
      setActiveIntelKey(opts.cacheKey);
      setGroundingError(null);

      if (groundingCache[opts.cacheKey]) {
        return;
      }

      setGroundingLoading(true);
      try {
        const res = await fetch('/api/maps/grounding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: opts.query,
            districtName: opts.districtName,
            lat: opts.lat,
            lng: opts.lng,
          }),
        });
        const data = (await res.json()) as {
          summary?: string;
          places?: GroundedPlace[];
          model?: string;
          error?: string;
        };
        if (!res.ok) {
          throw new Error(data.error || 'Could not fetch live Google Maps intelligence.');
        }

        const result: GroundingResult = {
          summary: data.summary || 'No summary returned for this Cairo sector.',
          places: Array.isArray(data.places) ? data.places : [],
          model: data.model || 'gemini-4-hydrogen',
          queryLabel: opts.queryLabel,
        };

        setGroundingCache((prev) => ({ ...prev, [opts.cacheKey]: result }));
      } catch (err: unknown) {
        setGroundingError(err instanceof Error ? err.message : 'Google Maps grounding request failed.');
      } finally {
        setGroundingLoading(false);
      }
    },
    [groundingCache],
  );

  const handleScanSelectedDistrict = useCallback(() => {
    void runMapsGrounding({
      cacheKey: selectedDistrict.id,
      query: `${selectedDistrict.name} landmarks, streets, plazas, and architecture in Greater Cairo`,
      districtName: selectedDistrict.name,
      lat: selectedDistrict.lat,
      lng: selectedDistrict.lon,
      queryLabel: `Level 0${selectedDistrict.level}: ${shortDistrictName}`,
    });
  }, [runMapsGrounding, selectedDistrict, shortDistrictName]);

  const handleCustomScoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = scoutQuery.trim();
    if (trimmed.length < 2) return;
    const coords = userCoords ?? { lat: selectedDistrict.lat, lng: selectedDistrict.lon };
    void runMapsGrounding({
      cacheKey: `custom:${trimmed.toLowerCase()}`,
      query: trimmed,
      lat: coords.lat,
      lng: coords.lng,
      queryLabel: trimmed,
    });
  };

  const handleUseMyLocation = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeoStatus('denied');
      return;
    }
    setGeoStatus('locating');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoStatus('ready');
      },
      () => {
        setGeoStatus('denied');
      },
      { enableHighAccuracy: false, timeout: 6000 },
    );
  };

  const handleSelectDistrict = (id: DistrictId) => {
    setSelectedId(id);
    if (groundingCache[id]) {
      setActiveIntelKey(id);
    } else if (activeIntelKey && !activeIntelKey.startsWith('custom:')) {
      setActiveIntelKey(id);
    }
  };

  const summaryLines = useMemo(() => {
    if (!activeIntel?.summary) return [];
    return activeIntel.summary
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith('#'));
  }, [activeIntel]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#090B0E]/92 p-3 md:p-6">
      <div className="flex h-[92vh] w-full max-w-[1280px] flex-col overflow-hidden rounded-xl border border-white/15 bg-[#12151B] text-[#F3F4F6] shadow-2xl">
        {/* Top Modal Header */}
        <div className="flex items-center justify-between gap-4 border-b border-white/10 bg-[#0D0F12] px-5 py-3.5">
          <div className="flex items-center gap-3">
            <MapPin className="h-4 w-4 shrink-0 text-[#E89B3C]" />
            <div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                <h2 className="font-display text-lg font-bold tracking-tight text-white">
                  Greater Cairo Tactical Deployment Map
                </h2>
                <span className="font-mono text-[11px] tabular-nums text-[#E89B3C]">
                  {CAIRO_DISTRICTS.length} PLAYABLE DISTRICTS · {clearedCount}/{CAIRO_DISTRICTS.length} SECURED
                </span>
              </div>
              <p className="text-xs text-[#9CA3AF]">
                Deploy into 8 real Greater Cairo 3D arenas or scan live streets &amp; landmarks with Google Maps Grounding.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Tactical Map"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/12 bg-[#161A20] text-[#D1D5DB] transition-colors hover:border-white/30 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body: Live Google Map + District Mission Dossier / Google Maps Grounding Intel */}
        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-12">
          {/* Left: Interactive Google Maps Satellite / Hybrid View of Greater Cairo */}
          <div className="relative min-h-[320px] bg-[#0D0F12] lg:col-span-7 xl:col-span-8">
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
                    <MapCameraPanner
                      lat={selectedDistrict.lat}
                      lng={selectedDistrict.lon}
                      triggerKey={selectedDistrict.id}
                    />
                    {CAIRO_DISTRICTS.map((dist) => {
                      const isSelected = dist.id === selectedId;
                      const isActive = dist.id === activeDistrictId;
                      const isCleared = Boolean(clearedDistricts[dist.id]);
                      return (
                        <AdvancedMarker
                          key={dist.id}
                          position={{ lat: dist.lat, lng: dist.lon }}
                          title={`Level 0${dist.level}: ${dist.name}`}
                          onClick={() => handleSelectDistrict(dist.id)}
                        >
                          <div
                            className={`flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-1 font-mono text-[11px] font-semibold shadow-lg transition-transform ${
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
                            <span className="max-w-[110px] truncate">{dist.name.split('—')[0].split('/')[0].trim()}</span>
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
                  The interactive Google Maps layer could not initialize right now. You can still pick any of the eight
                  Greater Cairo districts below or scout neighborhoods in the Maps Intel tab.
                </p>
              </div>
            )}

            {/* Quick 8-District Jump Bar over Map Bottom-Left */}
            <div className="pointer-events-auto absolute bottom-3 left-3 right-14 z-10 flex flex-wrap gap-1.5">
              {CAIRO_DISTRICTS.map((d) => {
                const isCleared = Boolean(clearedDistricts[d.id]);
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => handleSelectDistrict(d.id)}
                    className={`flex items-center gap-1 whitespace-nowrap rounded-md border px-2 py-1 text-[11px] font-medium transition-colors ${
                      selectedId === d.id
                        ? 'border-[#E89B3C] bg-[#E89B3C] font-semibold text-[#0D0F12]'
                        : isCleared
                          ? 'border-emerald-500/45 bg-[#0D0F12]/92 text-emerald-300 hover:border-emerald-400'
                          : 'border-white/15 bg-[#0D0F12]/92 text-[#D1D5DB] hover:border-white/35 hover:text-white'
                    }`}
                  >
                    <span className="font-mono">0{d.level}</span>
                    <span>{d.name.split('—')[0].split('/')[0].trim()}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: District Combat Dossier + Live Google Maps Grounding Recon */}
          <div className="flex min-h-0 flex-col border-t border-white/10 bg-[#161A20] lg:col-span-5 lg:border-l lg:border-t-0 xl:col-span-4">
            {/* Dossier Tab Switcher */}
            <div className="grid grid-cols-2 border-b border-white/10 bg-[#0D0F12]">
              <button
                type="button"
                onClick={() => setDossierTab('brief')}
                className={`flex items-center justify-center gap-1.5 border-b-2 px-3 py-2.5 text-xs font-semibold transition-colors ${
                  dossierTab === 'brief'
                    ? 'border-[#E89B3C] text-white'
                    : 'border-transparent text-[#9CA3AF] hover:text-white'
                }`}
              >
                <ShieldAlert className="h-3.5 w-3.5 text-[#E89B3C]" />
                <span>District Brief</span>
              </button>
              <button
                type="button"
                onClick={() => setDossierTab('intel')}
                className={`flex items-center justify-center gap-1.5 border-b-2 px-3 py-2.5 text-xs font-semibold transition-colors ${
                  dossierTab === 'intel'
                    ? 'border-[#E89B3C] text-white'
                    : 'border-transparent text-[#9CA3AF] hover:text-white'
                }`}
              >
                <Radar className="h-3.5 w-3.5 text-[#E89B3C]" />
                <span>Google Maps Intel</span>
              </button>
            </div>

            {/* Scrollable Tab Body */}
            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              {dossierTab === 'brief' ? (
                <div>
                  <div className="flex items-center justify-between font-mono text-xs text-[#E89B3C]">
                    <span>
                      LEVEL 0{selectedDistrict.level} · {selectedDistrict.arabicHint}
                    </span>
                    {clearedDistricts[selectedDistrict.id] && (
                      <span className="flex items-center gap-1 text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        SECURED
                      </span>
                    )}
                  </div>

                  <h3 className="mt-2 font-display text-2xl font-bold text-white">{selectedDistrict.name}</h3>

                  <div className="mt-1.5 font-mono text-xs tabular-nums text-[#9CA3AF]">
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

                  {/* Quick Jump into Live Google Maps Grounding for This District */}
                  <button
                    type="button"
                    onClick={handleScanSelectedDistrict}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-[#E89B3C]/40 bg-[#0D0F12] px-3.5 py-2.5 text-xs font-semibold text-[#FDE68A] transition-colors hover:border-[#E89B3C] hover:bg-[#1C2129]"
                  >
                    <Radar className="h-3.5 w-3.5 text-[#E89B3C]" />
                    <span>Scan Real {shortDistrictName} Landmarks (Google Maps)</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Scan Currently Selected Playable District */}
                  <div className="rounded-lg border border-white/10 bg-[#0D0F12] p-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="font-mono text-[10px] uppercase tracking-wider text-[#E89B3C]">
                          LIVE GOOGLE MAPS GROUNDING
                        </div>
                        <div className="mt-0.5 text-xs font-semibold text-white">
                          Level 0{selectedDistrict.level}: {shortDistrictName}
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={groundingLoading}
                        onClick={handleScanSelectedDistrict}
                        className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md bg-[#E89B3C] px-3 py-1.5 text-xs font-semibold text-[#0D0F12] transition-colors hover:bg-[#F2AD54] disabled:opacity-60"
                      >
                        {groundingLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Radar className="h-3.5 w-3.5" />}
                        <span>Scan Sector</span>
                      </button>
                    </div>
                  </div>

                  {/* Scout Any Greater Cairo Neighborhood / Landmark */}
                  <form onSubmit={handleCustomScoutSubmit} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label htmlFor="cairo-scout-input" className="text-xs font-semibold text-[#F3F4F6]">
                        Scout Any Cairo District or Landmark
                      </label>
                      <button
                        type="button"
                        onClick={handleUseMyLocation}
                        className="flex items-center gap-1 text-[11px] font-medium text-[#9CA3AF] transition-colors hover:text-[#E89B3C]"
                      >
                        <LocateFixed className="h-3 w-3" />
                        <span>
                          {geoStatus === 'locating'
                            ? 'Locating...'
                            : geoStatus === 'ready'
                              ? 'GPS Attached'
                              : geoStatus === 'denied'
                                ? 'Cairo Default'
                                : 'Use My GPS'}
                        </span>
                      </button>
                    </div>

                    <div className="flex gap-1.5">
                      <div className="relative flex-1">
                        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9CA3AF]" />
                        <input
                          id="cairo-scout-input"
                          type="text"
                          value={scoutQuery}
                          onChange={(e) => setScoutQuery(e.target.value)}
                          placeholder="e.g. Heliopolis Korba, Nasr City, Bab Zuweila..."
                          maxLength={240}
                          className="w-full rounded-lg border border-white/15 bg-[#0D0F12] py-2 pl-8 pr-3 text-xs text-white placeholder-[#6B7280] focus:border-[#E89B3C] focus:outline-none"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={groundingLoading || scoutQuery.trim().length < 2}
                        className="shrink-0 whitespace-nowrap rounded-lg border border-white/15 bg-[#1E242D] px-3 py-2 text-xs font-semibold text-white transition-colors hover:border-[#E89B3C] disabled:opacity-50"
                      >
                        Scout
                      </button>
                    </div>

                    {/* Quick Cairo Scout Shortcuts */}
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {QUICK_SCOUT_PRESETS.map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          disabled={groundingLoading}
                          onClick={() => {
                            setScoutQuery(preset.label);
                            void runMapsGrounding({
                              cacheKey: `custom:${preset.label.toLowerCase()}`,
                              query: preset.query,
                              lat: preset.lat,
                              lng: preset.lng,
                              queryLabel: preset.label,
                            });
                          }}
                          className="whitespace-nowrap rounded border border-white/10 bg-[#0D0F12]/80 px-2 py-1 text-[11px] text-[#D1D5DB] transition-colors hover:border-[#E89B3C]/70 hover:text-white"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </form>

                  {/* Grounding Results Area */}
                  {groundingLoading && (
                    <div className="flex items-center gap-2.5 rounded-lg border border-[#E89B3C]/30 bg-[#0D0F12] p-4 text-xs text-[#FDE68A]">
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[#E89B3C]" />
                      <span>Querying live Google Maps place data for Cairo recon...</span>
                    </div>
                  )}

                  {groundingError && !groundingLoading && (
                    <div className="rounded-lg border border-red-500/35 bg-red-950/35 p-3.5 text-xs leading-relaxed text-red-200">
                      {groundingError}
                    </div>
                  )}

                  {!groundingLoading && activeIntel && (
                    <div className="space-y-3.5 rounded-lg border border-white/12 bg-[#0D0F12] p-3.5">
                      <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                          <Compass className="h-3.5 w-3.5 text-[#E89B3C]" />
                          <span className="truncate">{activeIntel.queryLabel}</span>
                        </div>
                        <span className="shrink-0 font-mono text-[10px] text-[#9CA3AF]">Google Maps Data</span>
                      </div>

                      {summaryLines.length > 0 && (
                        <ul className="space-y-2">{summaryLines.map((line, i) => renderFormattedLine(line, i))}</ul>
                      )}

                      {/* Verified Google Maps Grounding Links & Place Review Snippets */}
                      {activeIntel.places.length > 0 && (
                        <div className="border-t border-white/10 pt-3">
                          <div className="font-mono text-[10px] uppercase tracking-wider text-[#E89B3C]">
                            Verified Google Maps Sources ({activeIntel.places.length})
                          </div>
                          <div className="mt-2 space-y-2">
                            {activeIntel.places.map((place) => (
                              <div
                                key={place.uri}
                                className="rounded-md border border-white/10 bg-[#161A20] px-2.5 py-2"
                              >
                                <a
                                  href={place.uri}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center justify-between gap-2 text-xs font-semibold text-[#FDE68A] hover:underline"
                                >
                                  <span className="truncate">{place.title}</span>
                                  <ExternalLink className="h-3.5 w-3.5 shrink-0 text-[#E89B3C]" />
                                </a>
                                {place.reviewSnippets.length > 0 && (
                                  <div className="mt-1.5 space-y-1 border-t border-white/8 pt-1.5">
                                    {place.reviewSnippets.slice(0, 2).map((snip, sIdx) => (
                                      <p key={sIdx} className="text-[11px] leading-relaxed text-[#9CA3AF]">
                                        “{snip.text}”
                                        {snip.uri && (
                                          <a
                                            href={snip.uri}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="ml-1.5 text-[#E89B3C] hover:underline"
                                          >
                                            Review
                                          </a>
                                        )}
                                      </p>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {!groundingLoading && !activeIntel && !groundingError && (
                    <div className="rounded-lg border border-white/10 bg-[#0D0F12]/70 p-4 text-xs leading-relaxed text-[#9CA3AF]">
                      Tap <strong className="text-white">Scan Sector</strong> to pull real-world landmarks, streets, and
                      Google Maps references for <strong className="text-white">{shortDistrictName}</strong>, or type
                      any Cairo neighborhood above to scout future districts.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Persistent Bottom Deploy Action */}
            <div className="shrink-0 space-y-2 border-t border-white/10 bg-[#12151B] p-4">
              <button
                type="button"
                onClick={() => onDeployDistrict(selectedDistrict.id)}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#E89B3C] px-4 py-3 text-sm font-semibold text-[#0D0F12] transition-colors hover:bg-[#F2AD54]"
              >
                <Play className="h-4 w-4 fill-current" />
                <span>
                  {selectedDistrict.id === activeDistrictId ? 'Redeploy to ' : 'Deploy to '}
                  {shortDistrictName}
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
