import React, { useEffect, useRef, useState } from 'react';
import { Disc3, Loader2, Music, Sparkles, Volume2, VolumeX, X } from 'lucide-react';
import { DistrictId } from '../game/types';

interface SoundtrackDeckProps {
  activeDistrictId: DistrictId;
  synthMusicEnabled: boolean;
  onToggleSynthMusic: (enabled: boolean) => void;
  onExternalTrackStateChange: (playing: boolean) => void;
  onClose: () => void;
}

const DISTRICT_PROMPTS: Record<DistrictId, { label: string; prompt: string }> = {
  shubra: {
    label: 'Shubra Golden-Hour Chase',
    prompt:
      'High-stakes Egyptian cinematic action film score set in Downtown Cairo at sunset. Driving darbuka and tabla percussion, tense oud ostinato in D Hijaz, gritty pulsing sub-bass, brass hits, instrumental only, 128 BPM.',
  },
  old_cairo: {
    label: 'El-Sabbatiya Alley Ambush',
    prompt:
      'Dark gritty Middle Eastern street thriller action music. Fast Egyptian darbuka rhythms, sharp plucked qanun and distorted electric oud, brooding cello drone, intense boss battle tension, instrumental, 134 BPM.',
  },
  zamalek: {
    label: 'Zamalek Nile Corniche Pursuit',
    prompt:
      'Sleek Mediterranean-meets-Cairo espionage action score along the Nile at sunset. Crisp oud plucks, cinematic string ostinato, tight modern percussion and driving bassline, instrumental only, 124 BPM.',
  },
  khan_el_khalili: {
    label: 'Khan El-Khalili Souq Showdown',
    prompt:
      'Intense historic Cairo bazaar ambush score. Rapid tabla and riq percussion, dramatic Arabic Hijaz violin swells, resonant ney flute stabs, heavy cinematic brass hits, instrumental, 136 BPM.',
  },
  giza_plateau: {
    label: 'Giza Pyramids Desert Duel',
    prompt:
      'Sweeping desert sniper standoff action score at the Giza Pyramids. Vast brass horns, haunting Egyptian rebab and oud phrases, thunderous war drums and pulsing sub-bass, instrumental, 120 BPM.',
  },
  maadi: {
    label: 'Maadi Degla Twilight Raid',
    prompt:
      'Tense covert urban thriller soundtrack in dusk Cairo. Tight synth pulse, muted electric guitar, subtle Arabic oud accents, crisp tactical snare grooves, instrumental, 126 BPM.',
  },
  sheikh_zayed: {
    label: 'Sheikh Zayed Compound Siege',
    prompt:
      'Tactical modern stealth-action soundtrack blending orchestral strings, deep cinematic brass, subtle Arabic Hijaz violin motifs, and tight electronic drum pulses for a luxury villa sniper standoff, instrumental, 118 BPM.',
  },
  new_capital: {
    label: 'Iconic Tower Syndicate Finale',
    prompt:
      'Epic futuristic cyberpunk-meets-Cairo final boss orchestral hybrid score. Massive synth arpeggios, Egyptian ney flute and oud riffs over heavy cinematic percussion and triumphant brass, instrumental, 138 BPM.',
  },
};

export const SoundtrackDeck: React.FC<SoundtrackDeckProps> = ({
  activeDistrictId,
  synthMusicEnabled,
  onToggleSynthMusic,
  onExternalTrackStateChange,
  onClose,
}) => {
  const [prompt, setPrompt] = useState(DISTRICT_PROMPTS[activeDistrictId].prompt);
  const [mode, setMode] = useState<'clip' | 'pro'>('clip');
  const [generating, setGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [trackUrl, setTrackUrl] = useState<string | null>(null);
  const [trackMeta, setTrackMeta] = useState<{ model: string; title: string } | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setPrompt(DISTRICT_PROMPTS[activeDistrictId].prompt);
  }, [activeDistrictId]);

  const handleGenerate = async () => {
    if (!prompt.trim() || generating) return;
    setGenerating(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/music/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim(), mode }),
      });
      const data = (await res.json()) as {
        audioBase64?: string;
        mimeType?: string;
        model?: string;
        error?: string;
      };
      if (!res.ok || !data.audioBase64) {
        setErrorMsg(
          data.error ||
            'Lyria 3 requires a billing-enabled Gemini API key in Settings > Secrets. The built-in Egyptian Hijaz combat soundtrack remains active.',
        );
        return;
      }

      const dataUri = `data:${data.mimeType || 'audio/mpeg'};base64,${data.audioBase64}`;
      setTrackUrl(dataUri);
      setTrackMeta({
        model: data.model || (mode === 'pro' ? 'lyria-3-pro-preview' : 'lyria-3-clip-preview'),
        title: DISTRICT_PROMPTS[activeDistrictId].label,
      });

      window.setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.volume = 0.72;
          void audioRef.current.play().catch(() => {});
        }
      }, 60);
    } catch {
      setErrorMsg('Could not reach the local soundtrack server. Built-in Cairo Hijaz score remains active.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#090B0E]/92 p-4">
      <div className="w-full max-w-[680px] overflow-hidden rounded-xl border border-white/15 bg-[#12151B] text-[#F3F4F6] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 bg-[#0D0F12] px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <Music className="h-4 w-4 text-[#E89B3C]" />
            <div>
              <h2 className="font-display text-lg font-bold text-white">Cairo Action Soundtrack Deck</h2>
              <p className="text-xs text-[#9CA3AF]">
                Built-in Egyptian Hijaz combat score + optional Lyria 3 AI music generation
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Soundtrack Deck"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/12 bg-[#161A20] text-[#D1D5DB] transition-colors hover:border-white/30 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 p-5">
          {/* Built-in Procedural Egyptian Hijaz Soundtrack Control */}
          <div className="flex items-center justify-between rounded-lg border border-white/10 bg-[#161A20] p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#E89B3C]/15 text-[#E89B3C]">
                {synthMusicEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
              </div>
              <div>
                <div className="font-display text-sm font-semibold text-white">
                  Built-In Cairo Hijaz Dynamic Score
                </div>
                <div className="text-xs text-[#9CA3AF]">
                  Real-time Oud, Darbuka &amp; sub-bass that intensifies automatically during Boss fights
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onToggleSynthMusic(!synthMusicEnabled)}
              className={`rounded-lg px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                synthMusicEnabled
                  ? 'bg-[#E89B3C] text-[#0D0F12] hover:bg-[#F2AD54]'
                  : 'border border-white/15 bg-[#0D0F12] text-[#D1D5DB] hover:text-white'
              }`}
            >
              {synthMusicEnabled ? 'Score Active' : 'Score Off'}
            </button>
          </div>

          {/* Lyria 3 Custom AI Soundtrack Studio */}
          <div className="rounded-lg border border-white/10 bg-[#161A20] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Sparkles className="h-4 w-4 text-[#E89B3C]" />
                <span>Generate Custom Score with Lyria 3</span>
              </div>
              <div className="flex items-center gap-1 rounded-md bg-[#0D0F12] p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setMode('clip')}
                  className={`rounded px-2.5 py-1 font-medium transition-colors ${
                    mode === 'clip' ? 'bg-[#E89B3C] text-[#0D0F12]' : 'text-[#9CA3AF] hover:text-white'
                  }`}
                >
                  30s Clip (Fast)
                </button>
                <button
                  type="button"
                  onClick={() => setMode('pro')}
                  className={`rounded px-2.5 py-1 font-medium transition-colors ${
                    mode === 'pro' ? 'bg-[#E89B3C] text-[#0D0F12]' : 'text-[#9CA3AF] hover:text-white'
                  }`}
                >
                  Full Track (Pro)
                </button>
              </div>
            </div>

            {/* District Preset Pills */}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {(Object.keys(DISTRICT_PROMPTS) as DistrictId[]).map((dId) => (
                <button
                  key={dId}
                  type="button"
                  onClick={() => setPrompt(DISTRICT_PROMPTS[dId].prompt)}
                  className="rounded border border-white/12 bg-[#0D0F12] px-2.5 py-1 text-[11px] text-[#D1D5DB] transition-colors hover:border-[#E89B3C] hover:text-white"
                >
                  {DISTRICT_PROMPTS[dId].label}
                </button>
              ))}
            </div>

            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              className="mt-3 w-full resize-none rounded-lg border border-white/12 bg-[#0D0F12] p-3 text-xs leading-relaxed text-[#F3F4F6] outline-none focus:border-[#E89B3C]"
              placeholder="Describe the Egyptian cinema combat music mood, tempo, and instruments..."
            />

            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="font-mono text-[11px] text-[#9CA3AF]">
                Model: {mode === 'pro' ? 'lyria-3-pro-preview' : 'lyria-3-clip-preview'}
              </span>
              <button
                type="button"
                disabled={generating || !prompt.trim()}
                onClick={handleGenerate}
                className="flex items-center gap-2 rounded-lg bg-[#E89B3C] px-4 py-2 text-xs font-semibold text-[#0D0F12] transition-colors hover:bg-[#F2AD54] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Disc3 className="h-3.5 w-3.5" />}
                <span>{generating ? 'Composing Track...' : 'Compose & Play'}</span>
              </button>
            </div>

            {errorMsg && (
              <div className="mt-3 rounded-lg border border-amber-400/35 bg-amber-950/40 p-3 text-xs leading-relaxed text-amber-200">
                {errorMsg}
              </div>
            )}

            {trackUrl && (
              <div className="mt-4 rounded-lg border border-[#E89B3C]/40 bg-[#0D0F12] p-3">
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#E89B3C]">{trackMeta?.title || 'Generated Cairo Score'}</span>
                  <span className="font-mono text-[11px] text-[#9CA3AF]">{trackMeta?.model}</span>
                </div>
                <audio
                  ref={audioRef}
                  src={trackUrl}
                  controls
                  loop
                  onPlay={() => onExternalTrackStateChange(true)}
                  onPause={() => onExternalTrackStateChange(false)}
                  onEnded={() => onExternalTrackStateChange(false)}
                  className="h-9 w-full"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
