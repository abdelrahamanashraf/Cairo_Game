import React, { useRef, useState } from 'react';
import { Crosshair, RotateCw, Shield, Zap } from 'lucide-react';
import { VirtualInputState } from '../game/types';

interface DualThumbOverlayProps {
  visible: boolean;
  isAds: boolean;
  isCrouching: boolean;
  isSprinting: boolean;
  isReloading: boolean;
  onVirtualInput: (partial: Partial<VirtualInputState>) => void;
  onLookDelta: (dx: number, dy: number) => void;
  onToggleCrouch: () => void;
  onReload: () => void;
}

export const DualThumbOverlay: React.FC<DualThumbOverlayProps> = ({
  visible,
  isAds,
  isCrouching,
  isSprinting,
  isReloading,
  onVirtualInput,
  onLookDelta,
  onToggleCrouch,
  onReload,
}) => {
  const [knobOffset, setKnobOffset] = useState({ x: 0, y: 0 });
  const [firingHeld, setFiringHeld] = useState(false);
  const [adsToggled, setAdsToggled] = useState(false);
  const [sprintToggled, setSprintToggled] = useState(false);

  const stickPointerId = useRef<number | null>(null);
  const stickOrigin = useRef({ x: 0, y: 0 });
  const lookPointerId = useRef<number | null>(null);
  const lookLast = useRef({ x: 0, y: 0 });

  if (!visible) return null;

  const MAX_RADIUS = 44;

  const handleStickDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    stickPointerId.current = e.pointerId;
    const rect = e.currentTarget.getBoundingClientRect();
    stickOrigin.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    updateStick(e.clientX, e.clientY);
  };

  const handleStickMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (stickPointerId.current !== e.pointerId) return;
    e.stopPropagation();
    updateStick(e.clientX, e.clientY);
  };

  const handleStickUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (stickPointerId.current !== e.pointerId) return;
    e.stopPropagation();
    stickPointerId.current = null;
    setKnobOffset({ x: 0, y: 0 });
    onVirtualInput({ moveX: 0, moveY: 0 });
  };

  const updateStick = (clientX: number, clientY: number) => {
    const dx = clientX - stickOrigin.current.x;
    const dy = clientY - stickOrigin.current.y;
    const dist = Math.hypot(dx, dy);
    const clampedDist = Math.min(dist, MAX_RADIUS);
    const nx = dist > 0.001 ? (dx / dist) * clampedDist : 0;
    const ny = dist > 0.001 ? (dy / dist) * clampedDist : 0;
    setKnobOffset({ x: nx, y: ny });
    onVirtualInput({
      moveX: nx / MAX_RADIUS,
      moveY: -ny / MAX_RADIUS,
    });
  };

  const handleLookDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    lookPointerId.current = e.pointerId;
    lookLast.current = { x: e.clientX, y: e.clientY };
  };

  const handleLookMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (lookPointerId.current !== e.pointerId) return;
    e.stopPropagation();
    const dx = e.clientX - lookLast.current.x;
    const dy = e.clientY - lookLast.current.y;
    lookLast.current = { x: e.clientX, y: e.clientY };
    onLookDelta(dx, dy);
  };

  const handleLookUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (lookPointerId.current !== e.pointerId) return;
    e.stopPropagation();
    lookPointerId.current = null;
  };

  const toggleAds = () => {
    const next = !adsToggled;
    setAdsToggled(next);
    onVirtualInput({ ads: next });
  };

  const toggleSprint = () => {
    const next = !sprintToggled;
    setSprintToggled(next);
    onVirtualInput({ sprint: next });
  };

  return (
    <div className="pointer-events-none absolute inset-0 z-20 select-none">
      {/* Right-half touch aim drag surface */}
      <div
        onPointerDown={handleLookDown}
        onPointerMove={handleLookMove}
        onPointerUp={handleLookUp}
        onPointerCancel={handleLookUp}
        className="pointer-events-auto absolute right-0 top-16 bottom-28 w-[46%] touch-none"
        aria-label="Drag to aim camera"
      />

      {/* Left Virtual Movement Thumbstick */}
      <div
        onPointerDown={handleStickDown}
        onPointerMove={handleStickMove}
        onPointerUp={handleStickUp}
        onPointerCancel={handleStickUp}
        className="pointer-events-auto absolute bottom-24 left-6 flex h-32 w-32 touch-none items-center justify-center rounded-full border border-white/20 bg-[#0D0F12]/70"
        aria-label="Virtual movement joystick"
      >
        <div className="h-20 w-20 rounded-full border border-dashed border-white/15" />
        <div
          style={{ transform: `translate3d(${knobOffset.x}px, ${knobOffset.y}px, 0)` }}
          className="absolute flex h-12 w-12 items-center justify-center rounded-full border border-[#E89B3C]/80 bg-[#E89B3C]/30 text-[10px] font-semibold tracking-wider text-[#FDE68A]"
        >
          MOVE
        </div>
      </div>

      {/* Right-Side Action Arc (PUBG Mobile Dual-Thumb ergonomics) */}
      <div className="pointer-events-auto absolute bottom-24 right-6 flex items-end gap-3">
        <div className="flex flex-col items-end gap-2.5">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={toggleSprint}
              className={`flex h-12 w-12 items-center justify-center rounded-full border text-xs font-medium transition-colors ${
                isSprinting || sprintToggled
                  ? 'border-[#E89B3C] bg-[#E89B3C] text-[#0D0F12]'
                  : 'border-white/20 bg-[#0D0F12]/80 text-white hover:border-white/40'
              }`}
              title="Toggle Sprint"
            >
              <Zap className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onToggleCrouch}
              className={`flex h-12 w-12 items-center justify-center rounded-full border text-xs font-medium transition-colors ${
                isCrouching
                  ? 'border-[#E89B3C] bg-[#E89B3C] text-[#0D0F12]'
                  : 'border-white/20 bg-[#0D0F12]/80 text-white hover:border-white/40'
              }`}
              title="Toggle Crouch"
            >
              <Shield className="h-4 w-4" />
            </button>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onReload}
              disabled={isReloading}
              className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-[#0D0F12]/80 text-white transition-colors hover:border-[#E89B3C] disabled:opacity-50"
              title="Reload Rifle"
            >
              <RotateCw className={`h-4 w-4 ${isReloading ? 'animate-spin text-[#E89B3C]' : ''}`} />
            </button>
            <button
              type="button"
              onClick={toggleAds}
              className={`flex h-14 w-14 items-center justify-center rounded-full border text-xs font-semibold transition-colors ${
                isAds || adsToggled
                  ? 'border-[#E89B3C] bg-[#E89B3C] text-[#0D0F12]'
                  : 'border-white/25 bg-[#0D0F12]/85 text-white hover:border-[#E89B3C]'
              }`}
              title="Toggle Aim Down Sights"
            >
              <Crosshair className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Large Primary Fire Thumb Button */}
        <button
          type="button"
          onPointerDown={(e) => {
            e.stopPropagation();
            e.currentTarget.setPointerCapture(e.pointerId);
            setFiringHeld(true);
            onVirtualInput({ firing: true });
          }}
          onPointerUp={(e) => {
            e.stopPropagation();
            setFiringHeld(false);
            onVirtualInput({ firing: false });
          }}
          onPointerCancel={() => {
            setFiringHeld(false);
            onVirtualInput({ firing: false });
          }}
          className={`flex h-20 w-20 touch-none items-center justify-center rounded-full border-2 font-display text-sm font-bold tracking-wider transition-transform active:scale-95 ${
            firingHeld
              ? 'border-[#FDE68A] bg-[#DC4A3D] text-white'
              : 'border-[#E89B3C] bg-[#DC4A3D]/85 text-white'
          }`}
        >
          FIRE
        </button>
      </div>
    </div>
  );
};
