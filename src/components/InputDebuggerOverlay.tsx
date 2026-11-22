import React from 'react';
import { Activity } from 'lucide-react';

export interface InputDebugTelemetry {
  joyActive: boolean;
  moveX: number;
  moveY: number;
  lookActive: boolean;
  lookDx: number;
  lookDy: number;
  firing: boolean;
  ads: boolean;
  crouch: boolean;
  reloading: boolean;
  sprint: boolean;
  autoAimLocked: boolean;
  touchEnabled: boolean;
}

interface InputDebuggerOverlayProps {
  telemetry: InputDebugTelemetry;
}

export const InputDebuggerOverlay: React.FC<InputDebuggerOverlayProps> = ({ telemetry }) => {
  const magnitude = Math.min(1, Math.hypot(telemetry.moveX, telemetry.moveY));
  const angleDeg =
    magnitude > 0.02
      ? Math.round(((Math.atan2(telemetry.moveX, telemetry.moveY) * 180) / Math.PI + 360) % 360)
      : 0;

  // Map normalized joystick (-1..1) onto 72x72 SVG radar plot (center 36, radius 28)
  const plotX = 36 + telemetry.moveX * 28;
  const plotY = 36 - telemetry.moveY * 28;

  const buttons: Array<{ label: string; active: boolean; mode: string }> = [
    { label: 'FIRE', active: telemetry.firing, mode: 'Hold' },
    { label: 'ADS', active: telemetry.ads, mode: 'Toggle' },
    { label: 'CRCH', active: telemetry.crouch, mode: 'Toggle' },
    { label: 'RLD', active: telemetry.reloading, mode: 'Trigger' },
    { label: 'SPRNT', active: telemetry.sprint, mode: 'Auto' },
    { label: 'ASSIST', active: telemetry.autoAimLocked, mode: 'Cone' },
  ];

  return (
    <div
      aria-label="Mobile Input Debugger"
      className="pointer-events-none absolute left-4 top-20 z-20 w-[264px] rounded-lg border border-white/15 bg-[#0D0F12]/92 p-3 text-[#F3F4F6] shadow-xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
          <Activity className="h-3.5 w-3.5 text-[#E89B3C]" />
          <span>Input Debugger</span>
        </div>
        <span className="font-mono text-[10px] text-[#9CA3AF]">
          Touch {telemetry.touchEnabled ? 'Enabled' : 'Hidden'}
        </span>
      </div>

      {/* Virtual Joystick Vector Plot + Coordinates */}
      <div className="mt-2.5 flex items-center gap-3">
        <svg
          width="72"
          height="72"
          viewBox="0 0 72 72"
          className="shrink-0 rounded-md border border-white/10 bg-[#14181F]"
          role="img"
          aria-label="Virtual joystick vector plot"
        >
          {/* Outer boundary & sprint threshold arc */}
          <circle cx="36" cy="36" r="28" fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth="1" />
          <circle cx="36" cy="36" r="7" fill="none" stroke="rgba(255,255,255,0.12)" strokeDasharray="2 2" />
          <line x1="8" y1="36" x2="64" y2="36" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
          <line x1="36" y1="8" x2="36" y2="64" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
          {/* Sprint threshold line (Y = +0.88) */}
          <line x1="22" y1="11.4" x2="50" y2="11.4" stroke="rgba(232,155,60,0.45)" strokeWidth="1" />
          {/* Live Stick Vector */}
          <line x1="36" y1="36" x2={plotX} y2={plotY} stroke="#E89B3C" strokeWidth="2" strokeLinecap="round" />
          <circle
            cx={plotX}
            cy={plotY}
            r="4.2"
            fill={telemetry.joyActive || magnitude > 0.02 ? '#E89B3C' : '#6B7280'}
            stroke="#0D0F12"
            strokeWidth="1.5"
          />
        </svg>

        <div className="min-w-0 flex-1 space-y-1 font-mono text-[11px] tabular-nums">
          <div className="flex items-center justify-between">
            <span className="text-[#9CA3AF]">Stick X</span>
            <span className="text-white">{telemetry.moveX >= 0 ? `+${telemetry.moveX.toFixed(2)}` : telemetry.moveX.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#9CA3AF]">Stick Y</span>
            <span className="text-white">{telemetry.moveY >= 0 ? `+${telemetry.moveY.toFixed(2)}` : telemetry.moveY.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#9CA3AF]">Mag / Ang</span>
            <span className="text-[#E89B3C]">
              {magnitude.toFixed(2)} · {angleDeg}°
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#9CA3AF]">Look dX/dY</span>
            <span className={telemetry.lookActive ? 'text-[#FDE68A]' : 'text-[#9CA3AF]'}>
              {Math.round(telemetry.lookDx)}, {Math.round(telemetry.lookDy)}
            </span>
          </div>
        </div>
      </div>

      {/* Button Press States Grid */}
      <div className="mt-3 border-t border-white/10 pt-2.5">
        <div className="mb-1.5 flex items-center justify-between text-[10px] text-[#9CA3AF]">
          <span>Button Press States</span>
          <span className="font-mono">{telemetry.joyActive ? 'Stick Held' : 'Stick Idle'}</span>
        </div>
        <div className="grid grid-cols-3 gap-1.5 font-mono text-[10px]">
          {buttons.map((btn) => (
            <div
              key={btn.label}
              className={`flex items-center justify-between rounded border px-2 py-1 ${
                btn.active
                  ? 'border-[#E89B3C] bg-[#E89B3C]/20 text-[#FDE68A]'
                  : 'border-white/10 bg-[#14181F] text-[#9CA3AF]'
              }`}
            >
              <span className="font-semibold">{btn.label}</span>
              <span>{btn.active ? 'ON' : 'OFF'}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
