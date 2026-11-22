export type DistrictId =
  | 'shubra'
  | 'old_cairo'
  | 'zamalek'
  | 'khan_el_khalili'
  | 'giza_plateau'
  | 'maadi'
  | 'sheikh_zayed'
  | 'new_capital';

export type BlueprintSection =
  | 'verdict'
  | 'cesium'
  | 'district_map_manager'
  | 'architecture'
  | 'campaign'
  | 'visual_logic'
  | 'ai_behavior_tree'
  | 'dynamic_sky'
  | 'mobile_optimization';

export type GameOverlay = 'none' | 'map' | 'music' | 'blueprint' | 'pause';

export type MatchPhase = 'title' | 'wave1' | 'boss_intro' | 'boss_fight' | 'victory' | 'defeat';

export type CameraPreset = 'shoulder' | 'wide';

export type PlayerStance = 'standing' | 'crouching' | 'sprinting';

export type CharacterArchetype =
  | 'player'
  | 'henchman'
  | 'boss_el_ameen'
  | 'boss_zarzour'
  | 'boss_hefny'
  | 'boss_architect';

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
  districtId: DistrictId;
  districtName: string;
  districtArabic: string;
  levelNumber: number;
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
  bossPhase: 1 | 2 | 3;
  bossWindup: boolean;
  announcement: string;
  pointerLocked: boolean;
  fpsEstimate: number;
  isSoftwareGl: boolean;
  nearbyPickupLabel: string | null;
  playerX: number;
  playerZ: number;
}

export interface GameSettings {
  autoAimAssist: boolean;
  showTouchControls: boolean;
  muted: boolean;
  musicEnabled: boolean;
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
