/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useRef, useState } from 'react';
import { BlueprintHub } from './components/BlueprintHub';
import { PlayableSliceView } from './components/PlayableSliceView';
import { AppWorkspace, BlueprintSection } from './game/types';

export default function App() {
  const [workspace, setWorkspace] = useState<AppWorkspace>('slice');
  const [blueprintSection, setBlueprintSection] = useState<BlueprintSection>('verdict');
  const sliceActionsRef = useRef<{ deploy: () => void; jumpBoss: () => void } | null>(null);

  const openBlueprintSection = (section: BlueprintSection) => {
    setBlueprintSection(section);
    setWorkspace('blueprint');
  };

  const launchPlayableSlice = () => {
    setWorkspace('slice');
    sliceActionsRef.current?.deploy();
  };

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#0D0F12] text-[#F3F4F6]">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="z-50 flex h-14 shrink-0 items-center justify-between gap-8 border-b border-white/10 bg-[#0D0F12] px-6">
        {/* Zone 1: Single text wordmark */}
        <button
          type="button"
          onClick={() => setWorkspace('slice')}
          className="font-display text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0 transition-colors hover:text-[#E89B3C]"
        >
          Cairo Precinct
        </button>

        {/* Zone 2: 5 concise single-line text navigation links */}
        <nav className="hidden items-center gap-6 text-sm font-medium md:flex" aria-label="Primary">
          <button
            type="button"
            onClick={() => setWorkspace('slice')}
            className={`border-b-2 py-1 transition-colors whitespace-nowrap shrink-0 ${
              workspace === 'slice'
                ? 'border-[#E89B3C] text-white'
                : 'border-transparent text-[#9CA3AF] hover:text-white'
            }`}
          >
            3D Vertical Slice
          </button>
          <button
            type="button"
            onClick={() => openBlueprintSection('verdict')}
            className={`border-b-2 py-1 transition-colors whitespace-nowrap shrink-0 ${
              workspace === 'blueprint' && blueprintSection === 'verdict'
                ? 'border-[#E89B3C] text-white'
                : 'border-transparent text-[#9CA3AF] hover:text-white'
            }`}
          >
            Engine Verdict
          </button>
          <button
            type="button"
            onClick={() => openBlueprintSection('cesium')}
            className={`border-b-2 py-1 transition-colors whitespace-nowrap shrink-0 ${
              workspace === 'blueprint' && blueprintSection === 'cesium'
                ? 'border-[#E89B3C] text-white'
                : 'border-transparent text-[#9CA3AF] hover:text-white'
            }`}
          >
            Cesium 3D Tiles
          </button>
          <button
            type="button"
            onClick={() => openBlueprintSection('architecture')}
            className={`border-b-2 py-1 transition-colors whitespace-nowrap shrink-0 ${
              workspace === 'blueprint' && blueprintSection === 'architecture'
                ? 'border-[#E89B3C] text-white'
                : 'border-transparent text-[#9CA3AF] hover:text-white'
            }`}
          >
            UE5 Scripts
          </button>
          <button
            type="button"
            onClick={() => openBlueprintSection('campaign')}
            className={`border-b-2 py-1 transition-colors whitespace-nowrap shrink-0 ${
              workspace === 'blueprint' && blueprintSection === 'campaign'
                ? 'border-[#E89B3C] text-white'
                : 'border-transparent text-[#9CA3AF] hover:text-white'
            }`}
          >
            Campaign Bible
          </button>
        </nav>

        {/* Zone 3: 1 Primary Action */}
        <div className="flex items-center shrink-0">
          {workspace === 'slice' ? (
            <button
              type="button"
              onClick={() => setWorkspace('blueprint')}
              className="rounded-lg bg-[#E89B3C] px-4 py-1.5 text-xs font-semibold text-[#0D0F12] transition-colors hover:bg-[#F2AD54] whitespace-nowrap shrink-0"
            >
              UE5 Blueprint
            </button>
          ) : (
            <button
              type="button"
              onClick={launchPlayableSlice}
              className="rounded-lg bg-[#E89B3C] px-4 py-1.5 text-xs font-semibold text-[#0D0F12] transition-colors hover:bg-[#F2AD54] whitespace-nowrap shrink-0"
            >
              Play 3D Slice
            </button>
          )}
        </div>
      </header>

      {/* Main Stage — keeps WebGL engine alive & paused cleanly while Blueprint Hub is open */}
      <main className="relative flex-1 overflow-hidden">
        <div
          className={`absolute inset-0 ${
            workspace === 'slice' ? 'visible opacity-100' : 'pointer-events-none invisible opacity-0'
          }`}
        >
          <PlayableSliceView
            active={workspace === 'slice'}
            onOpenBlueprint={() => setWorkspace('blueprint')}
            onEngineReady={(actions) => {
              sliceActionsRef.current = actions;
            }}
          />
        </div>

        {workspace === 'blueprint' && (
          <div className="absolute inset-0 z-40">
            <BlueprintHub
              activeSection={blueprintSection}
              onSelectSection={setBlueprintSection}
              onLaunchPlayableSlice={launchPlayableSlice}
            />
          </div>
        )}
      </main>
    </div>
  );
}
