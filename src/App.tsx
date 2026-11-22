/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { BlueprintHubSidebar } from './components/BlueprintHubSidebar';
import { PlayableSliceView } from './components/PlayableSliceView';

export default function App() {
  const [mapsQuotaExceeded, setMapsQuotaExceeded] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1180 : true,
  );

  useEffect(() => {
    const onQuotaExceeded = () => setMapsQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', onQuotaExceeded);
    return () => window.removeEventListener('gmp-quota-exceeded', onQuotaExceeded);
  }, []);

  return (
    <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-[#0D0F12] text-[#F3F4F6]">
      {mapsQuotaExceeded && (
        <div className="sticky top-0 z-[100] flex w-full shrink-0 items-center justify-between gap-4 border-b border-amber-500/40 bg-amber-950/95 px-4 py-2 text-xs text-amber-100">
          <span>
            Google Maps Demo Key quota exceeded. To continue using live Greater Cairo maps without interruption, attach
            your own Cloud project API key.{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold underline text-amber-300 hover:text-white"
            >
              Learn how to fix quota errors
            </a>
          </span>
          <button
            type="button"
            onClick={() => setMapsQuotaExceeded(false)}
            className="shrink-0 rounded border border-amber-400/40 px-2 py-0.5 text-[11px] text-amber-200 hover:bg-amber-900"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <main className="relative min-w-0 flex-1 overflow-hidden">
          <PlayableSliceView />
        </main>

        <BlueprintHubSidebar
          open={sidebarOpen}
          onToggleOpen={() => setSidebarOpen((prev) => !prev)}
        />
      </div>
    </div>
  );
}
