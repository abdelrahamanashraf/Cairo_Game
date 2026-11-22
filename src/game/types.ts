export type AppWorkspace = 'slice' | 'blueprint';

export type BlueprintSection = 'verdict' | 'cesium' | 'architecture' | 'campaign';

export type MatchPhase = 'briefing' | 'wave1' | 'boss_intro' | 'boss_fight' | 'victory' | 'defeat';

export type CameraPreset = 'shoulder' | 'wide';

export type PlayerStance = 'standing' | 'crouching' | 'sprinting';

export interface AABBCollider {
  id: string;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
  isCover?: boolean;
  blocksSight?: boolean;
}

export interface HudSnapshot {
  phase: MatchPhase;
  playerHp: number;
  playerMaxHp: number;
  ammo: number;
  magSize: number;
  reserveAmmo: number;
  isReloading: boolean;
  reloadProgress: number;
  stance: PlayerStance;
  isAds: boolean;
  enemiesRemaining: number;
  totalWaveEnemies: number;
  eliminations: number;
  shotsFired: number;
  shotsHit: number;
  elapsedSeconds: number;
  hitMarkerKind: 'none' | 'body' | 'head' | 'kill';
  damageFlash: number;
  autoAimLocked: boolean;
  bossActive: boolean;
  bossName: string;
  bossTitle: string;
  bossHp: number;
  bossMaxHp: number;
  bossPhase: 1 | 2;
  announcement: string;
  pointerLocked: boolean;
  fpsEstimate: number;
  isSoftwareGl: boolean;
  nearbyPickupLabel: string | null;
}

export interface GameSettings {
  autoAimAssist: boolean;
  showTouchControls: boolean;
  muted: boolean;
  cameraPreset: CameraPreset;
}

export interface VirtualInputState {
  moveX: number; // -1..1
  moveY: number; // -1..1 (forward positive)
  lookDeltaX: number;
  lookDeltaY: number;
  firing: boolean;
  ads: boolean;
  crouch: boolean;
  sprint: boolean;
}
