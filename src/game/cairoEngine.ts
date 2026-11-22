import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { TacticalAudioEngine } from './audioEngine';
import { buildCairoArena, CairoArenaData, DISTRICT_ORDER } from './cairoArenas';
import { ArticulatedCharacterRig, createCharacterRig } from './characterModels';
import { createCairoMaterials, CairoMaterialLibrary } from './materials';
import {
  AABBCollider,
  CharacterArchetype,
  DistrictId,
  GameSettings,
  HudSnapshot,
  MatchPhase,
  PlayerStance,
  VirtualInputState,
} from './types';

interface EnemyEntity {
  id: string;
  archetype: CharacterArchetype;
  isBoss: boolean;
  rig: ArticulatedCharacterRig;
  position: THREE.Vector3;
  yaw: number;
  hp: number;
  maxHp: number;
  state: 'patrol' | 'suspicious' | 'chase' | 'attack' | 'searching' | 'downed';
  patrolA: THREE.Vector3;
  patrolB: THREE.Vector3;
  patrolForward: boolean;
  lastKnownPos: THREE.Vector3;
  lostSightTimer: number;
  fireCooldown: number;
  burstRemaining: number;
  windupTimer: number;
  strafeDir: number;
  strafeTimer: number;
  hitFlashTimer: number;
  muzzleFlashTimer: number;
  walkPhase: number;
  bossPhase: 1 | 2 | 3;
  alerted: boolean;
}

interface TracerBeam {
  line: THREE.Line;
  material: THREE.LineBasicMaterial;
  life: number;
  maxLife: number;
}

interface ImpactSpark {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
}

// Reusable module-scope math objects (zero GC churn inside per-frame loop)
const _vecA = new THREE.Vector3();
const _vecB = new THREE.Vector3();
const _vecC = new THREE.Vector3();
const _vecD = new THREE.Vector3();
const _camGoal = new THREE.Vector3();
const _lookGoal = new THREE.Vector3();
const _raycaster = new THREE.Raycaster();
const _ndcCenter = new THREE.Vector2(0, 0);

const PLAYER_RADIUS = 0.55;
const ARENA_HALF_BOUND = 24.5;
const MAG_SIZE = 30;
const RELOAD_TIME = 1.4;
const PLAYER_FIRE_INTERVAL = 0.11;

export class CairoSliceEngine {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private materials: CairoMaterialLibrary;
  private arena: CairoArenaData;
  private audio: TacticalAudioEngine;
  private playerRig: ArticulatedCharacterRig;
  private muzzleLight: THREE.PointLight;
  private sunKey: THREE.DirectionalLight;
  private hemiFill: THREE.HemisphereLight;
  private rimLight: THREE.DirectionalLight;
  private streetBounceLight: THREE.PointLight;
  private skyDome: THREE.Mesh | null = null;
  private sunHalo: THREE.Sprite | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private onHudUpdate: (snapshot: HudSnapshot) => void;

  private isSoftwareGl: boolean;
  private frameId = 0;
  private disposed = false;
  private paused = false;
  private lastTimestamp = 0;
  private hudEmitAccum = 0;
  private fpsAccumFrames = 0;
  private fpsAccumTime = 0;
  private fpsEstimate = 60;

  // Match & district state
  private currentDistrictId: DistrictId = 'shubra';
  private phase: MatchPhase = 'title';
  private phaseTimer = 0;
  private elapsedSeconds = 0;
  private announcement = '';
  private announcementTimer = 0;

  // Game feel: hitstop & camera shake trauma
  private hitstopTimer = 0;
  private shakeTrauma = 0;

  private playerPos = new THREE.Vector3(0, 0, 22);
  private playerYaw = 0;
  private playerPitch = -0.05;
  private playerHp = 100;
  private playerMaxHp = 100;
  private ammo = MAG_SIZE;
  private reserveAmmo = 180;
  private isReloading = false;
  private reloadElapsed = 0;
  private fireCooldown = 0;
  private playerMuzzleTimer = 0;
  private playerWalkPhase = 0;
  private recoilPitchOffset = 0;
  private crouchBlend = 0;
  private adsBlend = 0;
  private stance: PlayerStance = 'standing';
  private damageFlash = 0;
  private hitMarkerKind: HudSnapshot['hitMarkerKind'] = 'none';
  private hitMarkerTimer = 0;
  private autoAimLocked = false;
  private nearbyPickupLabel: string | null = null;

  private eliminations = 0;
  private shotsFired = 0;
  private shotsHit = 0;

  // Camera damping
  private currentCamPos = new THREE.Vector3(0, 6, 30);
  private currentLookAt = new THREE.Vector3(0, 2, 0);
  private orbitAngle = 0.25;

  // Entities & VFX
  private enemies: EnemyEntity[] = [];
  private tracers: TracerBeam[] = [];
  private sparks: ImpactSpark[] = [];
  private sparkGeo: THREE.BoxGeometry;
  private sparkMatPlayer: THREE.MeshBasicMaterial;
  private sparkMatHit: THREE.MeshBasicMaterial;
  private bossEntity: EnemyEntity | null = null;

  // Input state
  private keys: Record<string, boolean> = {};
  private mouseDownFire = false;
  private mouseDownAds = false;
  private dragLooking = false;
  private lastPointerX = 0;
  private lastPointerY = 0;
  private pointerLocked = false;
  private crouchToggled = false;

  private settings: GameSettings = {
    autoAimAssist: true,
    showTouchControls: false,
    muted: false,
    musicEnabled: true,
    cameraPreset: 'shoulder',
  };

  private virtualInput: VirtualInputState = {
    moveX: 0,
    moveY: 0,
    lookDeltaX: 0,
    lookDeltaY: 0,
    firing: false,
    ads: false,
    crouch: false,
    sprint: false,
  };

  constructor(container: HTMLElement, onHudUpdate: (snapshot: HudSnapshot) => void) {
    this.container = container;
    this.onHudUpdate = onHudUpdate;
    this.audio = new TacticalAudioEngine();

    // 1. Software WebGL detection
    this.isSoftwareGl = (() => {
      const probe = document.createElement('canvas').getContext('webgl2');
      if (!probe) return true;
      const ext = probe.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
      const gpu = String(probe.getParameter(param));
      probe.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // 2. Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);

    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.touchAction = 'none';
    container.appendChild(this.renderer.domElement);

    // 3. Scene + Mandatory RoomEnvironment IBL
    this.scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    // 4. Camera
    const aspect = (container.clientWidth || window.innerWidth) / Math.max(1, container.clientHeight || window.innerHeight);
    this.camera = new THREE.PerspectiveCamera(68, aspect, 0.15, 280);

    // 5. Three-Point Lighting Rig (configured per district)
    this.sunKey = new THREE.DirectionalLight(0xffbe72, 2.75);
    this.sunKey.castShadow = !this.isSoftwareGl;
    const shadowRes = this.isSoftwareGl ? 512 : 2048;
    this.sunKey.shadow.mapSize.set(shadowRes, shadowRes);
    this.sunKey.shadow.camera.near = 4;
    this.sunKey.shadow.camera.far = 115;
    this.sunKey.shadow.camera.left = -36;
    this.sunKey.shadow.camera.right = 36;
    this.sunKey.shadow.camera.top = 36;
    this.sunKey.shadow.camera.bottom = -36;
    this.sunKey.shadow.bias = -0.0004;
    this.sunKey.shadow.normalBias = 0.022;
    this.scene.add(this.sunKey);

    this.hemiFill = new THREE.HemisphereLight(0x8aa8cc, 0x7c5436, 0.94);
    this.scene.add(this.hemiFill);

    this.rimLight = new THREE.DirectionalLight(0xf49b4e, 0.72);
    this.rimLight.position.set(28, 14, 34);
    this.scene.add(this.rimLight);

    // Warm Cairo street-level practical bounce fill (zero shadow cost, adds golden depth to taxis & facades)
    this.streetBounceLight = new THREE.PointLight(0xffb562, 1.45, 52, 1.6);
    this.streetBounceLight.position.set(0, 7.5, -4);
    this.scene.add(this.streetBounceLight);

    // 6. Materials, Initial Arena & Protagonist
    this.materials = createCairoMaterials(this.renderer, this.isSoftwareGl);
    this.arena = buildCairoArena('shubra', this.materials);
    this.scene.add(this.arena.root);
    this.applyDistrictAtmosphere();

    this.playerRig = createCharacterRig(
      'player',
      this.materials.contactShadow,
      this.materials.tacticalWeaveBump,
      'player',
    );
    this.playerPos.copy(this.arena.playerSpawn);
    this.playerRig.root.position.copy(this.playerPos);
    this.scene.add(this.playerRig.root);

    this.muzzleLight = new THREE.PointLight(0xffb84d, 0, 9, 2);
    this.scene.add(this.muzzleLight);

    // Shared spark assets
    this.sparkGeo = new THREE.BoxGeometry(0.11, 0.11, 0.11);
    this.sparkMatPlayer = new THREE.MeshBasicMaterial({ color: 0xffd27a });
    this.sparkMatHit = new THREE.MeshBasicMaterial({ color: 0xff5a45 });

    // Pre-spawn patrolling guards so the title screen 3D pan feels alive
    this.spawnWaveOneEnemies();

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.bindEvents();
    this.emitHud();
    this.lastTimestamp = performance.now();
    this.scheduleNextTick();
  }

  private applyDistrictAtmosphere(): void {
    const cfg = this.arena.config;
    const hazeColor = new THREE.Color(cfg.fogHex);
    this.scene.background = hazeColor;
    this.scene.fog = new THREE.FogExp2(cfg.fogHex, cfg.fogDensity);

    this.sunKey.color.setHex(cfg.sunColor);
    this.sunKey.intensity = cfg.sunIntensity;
    this.sunKey.position.set(...cfg.sunPosition);

    this.hemiFill.color.setHex(cfg.hemiSky);
    this.hemiFill.groundColor.setHex(cfg.hemiGround);
    this.hemiFill.intensity = cfg.hemiIntensity;

    this.rimLight.color.setHex(cfg.rimColor);
    this.rimLight.intensity = cfg.rimIntensity;

    // Rebuild sky dome gradient cleanly
    if (this.skyDome) {
      this.scene.remove(this.skyDome);
      this.skyDome.geometry.dispose();
      const mat = this.skyDome.material as THREE.MeshBasicMaterial;
      mat.map?.dispose();
      mat.dispose();
      this.skyDome = null;
    }

    const skyCanvas = document.createElement('canvas');
    skyCanvas.width = 16;
    skyCanvas.height = 256;
    const ctx = skyCanvas.getContext('2d')!;
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0.0, cfg.skyTop);
    grad.addColorStop(0.32, cfg.skyMid);
    grad.addColorStop(0.56, cfg.skyHorizon);
    grad.addColorStop(1.0, cfg.skyBottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 16, 256);

    const skyTex = new THREE.CanvasTexture(skyCanvas);
    skyTex.colorSpace = THREE.SRGBColorSpace;
    const skyGeo = new THREE.SphereGeometry(215, 32, 20);
    const skyMat = new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false, depthWrite: false });
    const dome = new THREE.Mesh(skyGeo, skyMat);
    dome.name = 'cairo_sky_dome';
    this.skyDome = dome;
    this.scene.add(dome);

    // Upgrade sky dome asynchronously to photorealistic Cairo golden-hour sunset panorama
    const districtTintHex =
      cfg.id === 'old_cairo'
        ? 0xf4c2a4
        : cfg.id === 'zamalek'
          ? 0xf5dfca
          : cfg.id === 'khan_el_khalili'
            ? 0xebae8a
            : cfg.id === 'giza_plateau'
              ? 0xffe0a8
              : cfg.id === 'maadi'
                ? 0xe2c7be
                : cfg.id === 'sheikh_zayed'
                  ? 0xd6d2e4
                  : cfg.id === 'new_capital'
                    ? 0xd8e0ec
                    : 0xffffff;

    new THREE.TextureLoader().load(
      this.materials.skyPanoramaUrl,
      (panoTex) => {
        if (this.disposed || this.skyDome !== dome) {
          panoTex.dispose();
          return;
        }
        panoTex.colorSpace = THREE.SRGBColorSpace;
        panoTex.wrapS = THREE.MirroredRepeatWrapping;
        panoTex.wrapT = THREE.ClampToEdgeWrapping;
        panoTex.repeat.set(2, 1.35);
        panoTex.offset.set(0, -0.18);
        panoTex.needsUpdate = true;

        skyMat.map?.dispose();
        skyMat.map = panoTex;
        skyMat.color.setHex(districtTintHex);
        skyMat.needsUpdate = true;
      },
      undefined,
      () => {
        // Keep gradient sky fallback silently
      },
    );

    // Atmospheric Golden-Hour Solar Halo aligned with district sunKey vector
    if (this.sunHalo) {
      this.scene.remove(this.sunHalo);
      const sMat = this.sunHalo.material as THREE.SpriteMaterial;
      sMat.map?.dispose();
      sMat.dispose();
      this.sunHalo = null;
    }

    const sunCanvas = document.createElement('canvas');
    sunCanvas.width = 128;
    sunCanvas.height = 128;
    const sCtx = sunCanvas.getContext('2d')!;
    const sGrad = sCtx.createRadialGradient(64, 64, 4, 64, 64, 62);
    sGrad.addColorStop(0.0, 'rgba(255, 248, 224, 0.96)');
    sGrad.addColorStop(0.22, 'rgba(255, 206, 128, 0.65)');
    sGrad.addColorStop(0.55, 'rgba(232, 145, 62, 0.22)');
    sGrad.addColorStop(1.0, 'rgba(232, 145, 62, 0.0)');
    sCtx.fillStyle = sGrad;
    sCtx.fillRect(0, 0, 128, 128);

    const sunTex = new THREE.CanvasTexture(sunCanvas);
    sunTex.colorSpace = THREE.SRGBColorSpace;
    const sunSpriteMat = new THREE.SpriteMaterial({
      map: sunTex,
      color: cfg.sunColor,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
    });
    const sunSprite = new THREE.Sprite(sunSpriteMat);
    const sunDir = new THREE.Vector3(...cfg.sunPosition).normalize().multiplyScalar(170);
    sunSprite.position.copy(sunDir);
    sunSprite.scale.set(54, 54, 1);
    this.sunHalo = sunSprite;
    this.scene.add(sunSprite);

    this.streetBounceLight.color.setHex(cfg.sunColor);
  }

  private bindEvents(): void {
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleWindowBlur);
    document.addEventListener('pointerlockchange', this.handlePointerLockChange);
    document.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('mouseup', this.handleMouseUp);

    const canvas = this.renderer.domElement;
    canvas.addEventListener('mousedown', this.handleMouseDown);
    canvas.addEventListener('contextmenu', this.handleContextMenu);
    canvas.addEventListener('webglcontextlost', this.handleContextLost);
    canvas.addEventListener('webglcontextrestored', this.handleContextRestored);

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.handleResize());
      this.resizeObserver.observe(this.container);
    }
  }

  private handleWindowBlur = (): void => {
    this.keys = {};
    this.mouseDownFire = false;
    this.mouseDownAds = false;
    this.dragLooking = false;
  };

  private handleContextMenu = (e: MouseEvent): void => {
    e.preventDefault();
  };

  private handleContextLost = (e: Event): void => {
    e.preventDefault();
    this.paused = true;
  };

  private handleContextRestored = (): void => {
    this.paused = false;
  };

  private handleResize = (): void => {
    if (this.disposed) return;
    const w = this.container.clientWidth || window.innerWidth;
    const h = Math.max(1, this.container.clientHeight || window.innerHeight);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private handlePointerLockChange = (): void => {
    this.pointerLocked = document.pointerLockElement === this.renderer.domElement;
    this.emitHud();
  };

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (this.paused) return;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      if (this.phase === 'wave1' || this.phase === 'boss_fight') {
        e.preventDefault();
      }
    }
    this.keys[e.code] = true;
    if (e.code === 'KeyR') this.triggerReload();
    if (e.code === 'KeyC') this.crouchToggled = !this.crouchToggled;
    if (e.code === 'KeyQ') this.mouseDownAds = !this.mouseDownAds;
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    this.keys[e.code] = false;
  };

  private handleMouseDown = (e: MouseEvent): void => {
    if (this.paused) return;
    if (this.phase !== 'wave1' && this.phase !== 'boss_fight' && this.phase !== 'boss_intro') return;

    this.audio.unlockAndStartMusic();

    if (e.button === 0) {
      this.mouseDownFire = true;
      this.dragLooking = true;
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;
      if (!this.settings.showTouchControls && !this.pointerLocked && this.renderer.domElement.requestPointerLock) {
        try {
          const maybePromise = this.renderer.domElement.requestPointerLock() as unknown as Promise<void> | undefined;
          if (maybePromise && typeof maybePromise.catch === 'function') {
            maybePromise.catch(() => {});
          }
        } catch {
          // Graceful drag-aim fallback
        }
      }
    } else if (e.button === 2) {
      this.mouseDownAds = true;
    }
  };

  private handleMouseUp = (e: MouseEvent): void => {
    if (e.button === 0) {
      this.mouseDownFire = false;
      this.dragLooking = false;
    } else if (e.button === 2) {
      this.mouseDownAds = false;
    }
  };

  private handleMouseMove = (e: MouseEvent): void => {
    if (this.paused) return;
    if (this.phase !== 'wave1' && this.phase !== 'boss_fight' && this.phase !== 'boss_intro') return;

    const sens = this.adsBlend > 0.5 ? 0.0018 : 0.0028;
    if (this.pointerLocked) {
      this.playerYaw -= e.movementX * sens;
      this.playerPitch = THREE.MathUtils.clamp(this.playerPitch - e.movementY * sens, -0.58, 0.48);
    } else if (this.dragLooking) {
      const dx = e.clientX - this.lastPointerX;
      const dy = e.clientY - this.lastPointerY;
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;
      this.playerYaw -= dx * sens * 1.45;
      this.playerPitch = THREE.MathUtils.clamp(this.playerPitch - dy * sens * 1.25, -0.58, 0.48);
    }
  };

  // --- Public Controls API for React Game Shell ---

  public loadDistrict(districtId: DistrictId, autoStart = true): void {
    this.currentDistrictId = districtId;
    this.clearAllEnemies();
    this.scene.remove(this.arena.root);
    this.arena.dispose();

    this.arena = buildCairoArena(districtId, this.materials);
    this.scene.add(this.arena.root);
    this.applyDistrictAtmosphere();

    if (autoStart) {
      this.startMission();
    } else {
      this.resetCombatState();
      this.phase = 'title';
      this.audio.setMusicIntensity('ambient');
      this.emitHud();
    }
  }

  public getNextDistrictId(): DistrictId | null {
    const idx = DISTRICT_ORDER.indexOf(this.currentDistrictId);
    if (idx < 0 || idx >= DISTRICT_ORDER.length - 1) return null;
    return DISTRICT_ORDER[idx + 1];
  }

  public startMission(): void {
    this.audio.unlockAndStartMusic();
    this.audio.setMusicIntensity('combat');
    this.resetCombatState();
    this.phase = 'wave1';
    this.setAnnouncement(this.arena.config.waveAnnouncement, 4.5);
    this.emitHud();
  }

  public jumpToBossFight(): void {
    this.audio.unlockAndStartMusic();
    this.resetCombatState();
    this.clearAllEnemies();
    this.triggerBossIntro();
    this.emitHud();
  }

  public updateSettings(partial: Partial<GameSettings>): void {
    this.settings = { ...this.settings, ...partial };
    this.audio.setMuted(this.settings.muted);
    this.audio.setSynthMusicEnabled(this.settings.musicEnabled);
    this.emitHud();
  }

  public setExternalMusicPlaying(playing: boolean): void {
    this.audio.setExternalTrackPlaying(playing);
  }

  public setPaused(paused: boolean): void {
    this.paused = paused;
    if (paused && document.pointerLockElement === this.renderer.domElement) {
      document.exitPointerLock();
    }
    this.keys = {};
    this.mouseDownFire = false;
    this.mouseDownAds = false;
    this.dragLooking = false;
  }

  public setVirtualInput(partial: Partial<VirtualInputState>): void {
    this.virtualInput = { ...this.virtualInput, ...partial };
  }

  public addTouchLookDelta(dx: number, dy: number): void {
    if (this.paused) return;
    if (this.phase !== 'wave1' && this.phase !== 'boss_fight' && this.phase !== 'boss_intro') return;
    const sens = this.adsBlend > 0.5 ? 0.0042 : 0.0062;
    this.playerYaw -= dx * sens;
    this.playerPitch = THREE.MathUtils.clamp(this.playerPitch - dy * sens, -0.58, 0.48);
  }

  public toggleCrouch(): void {
    this.crouchToggled = !this.crouchToggled;
  }

  public triggerReload(): void {
    if (this.isReloading || this.ammo >= MAG_SIZE || this.reserveAmmo <= 0) return;
    this.isReloading = true;
    this.reloadElapsed = 0;
    this.audio.playReload();
    this.emitHud();
  }

  private resetCombatState(): void {
    this.playerPos.copy(this.arena.playerSpawn);
    this.playerYaw = 0;
    this.playerPitch = -0.05;
    this.playerHp = this.playerMaxHp;
    this.ammo = MAG_SIZE;
    this.reserveAmmo = 180;
    this.isReloading = false;
    this.reloadElapsed = 0;
    this.fireCooldown = 0;
    this.crouchToggled = false;
    this.mouseDownAds = false;
    this.mouseDownFire = false;
    this.damageFlash = 0;
    this.shakeTrauma = 0;
    this.hitstopTimer = 0;
    this.hitMarkerKind = 'none';
    this.eliminations = 0;
    this.shotsFired = 0;
    this.shotsHit = 0;
    this.elapsedSeconds = 0;
    this.bossEntity = null;

    this.arena.pickups.forEach((p) => {
      p.active = true;
      p.respawnTimer = 0;
      p.mesh.visible = true;
    });

    this.clearAllEnemies();
    this.spawnWaveOneEnemies();
  }

  private clearAllEnemies(): void {
    this.enemies.forEach((e) => {
      this.scene.remove(e.rig.root);
      e.rig.dispose();
    });
    this.enemies = [];
    this.bossEntity = null;
  }

  private spawnWaveOneEnemies(): void {
    const baseHp = 90 + (this.arena.config.levelNumber - 1) * 14;
    this.arena.henchmanSpawns.forEach((sp, idx) => {
      this.spawnEnemy(`hench_${idx}`, 'henchman', false, sp.pos, sp.patrolTo, baseHp);
    });
  }

  private spawnEnemy(
    id: string,
    archetype: CharacterArchetype,
    isBoss: boolean,
    spawnPos: THREE.Vector3,
    patrolTo: THREE.Vector3,
    maxHp: number,
  ): EnemyEntity {
    const rig = createCharacterRig(
      archetype,
      this.materials.contactShadow,
      this.materials.tacticalWeaveBump,
      id,
    );
    rig.root.position.copy(spawnPos);
    this.scene.add(rig.root);

    const entity: EnemyEntity = {
      id,
      archetype,
      isBoss,
      rig,
      position: spawnPos.clone(),
      yaw: 0,
      hp: maxHp,
      maxHp,
      state: isBoss ? 'chase' : 'patrol',
      patrolA: spawnPos.clone(),
      patrolB: patrolTo.clone(),
      patrolForward: true,
      lastKnownPos: spawnPos.clone(),
      lostSightTimer: 0,
      fireCooldown: isBoss ? 1.25 : 0.8 + Math.random() * 0.7,
      burstRemaining: 0,
      windupTimer: 0,
      strafeDir: Math.random() > 0.5 ? 1 : -1,
      strafeTimer: 1.1 + Math.random() * 1.2,
      hitFlashTimer: 0,
      muzzleFlashTimer: 0,
      walkPhase: Math.random() * Math.PI * 2,
      bossPhase: 1,
      alerted: isBoss,
    };

    this.enemies.push(entity);
    if (isBoss) {
      this.bossEntity = entity;
    }
    return entity;
  }

  private triggerBossIntro(): void {
    const cfg = this.arena.config;
    this.phase = 'boss_intro';
    this.phaseTimer = 2.4;
    this.audio.setMusicIntensity('boss');
    this.audio.playBossHorn();
    const boss = this.spawnEnemy(
      cfg.bossArchetype,
      cfg.bossArchetype,
      true,
      this.arena.bossSpawn,
      new THREE.Vector3(0, 0, -10),
      cfg.bossMaxHp,
    );
    boss.alerted = true;
    this.setAnnouncement(cfg.bossIntroAnnouncement, 4.2);
  }

  private setAnnouncement(text: string, duration = 3.5): void {
    this.announcement = text;
    this.announcementTimer = duration;
  }

  private setMuzzleFlashOpacity(flashGroup: THREE.Group, opacity: number): void {
    for (let i = 0; i < flashGroup.children.length; i++) {
      const mesh = flashGroup.children[i] as THREE.Mesh;
      const mat = mesh.material as THREE.MeshBasicMaterial | undefined;
      if (mat) mat.opacity = opacity;
    }
  }

  // --- Collision & Line-of-Sight ---

  private resolveMovementCollision(pos: THREE.Vector3, radius: number): void {
    pos.x = THREE.MathUtils.clamp(pos.x, -ARENA_HALF_BOUND, ARENA_HALF_BOUND);
    pos.z = THREE.MathUtils.clamp(pos.z, -21.5, 28.5);

    for (let i = 0; i < this.arena.colliders.length; i++) {
      const c: AABBCollider = this.arena.colliders[i];
      const closestX = THREE.MathUtils.clamp(pos.x, c.minX, c.maxX);
      const closestZ = THREE.MathUtils.clamp(pos.z, c.minZ, c.maxZ);
      const dx = pos.x - closestX;
      const dz = pos.z - closestZ;
      const distSq = dx * dx + dz * dz;
      if (distSq < radius * radius) {
        if (distSq > 0.00001) {
          const dist = Math.sqrt(distSq);
          const push = radius - dist;
          pos.x += (dx / dist) * push;
          pos.z += (dz / dist) * push;
        } else {
          const penLeft = Math.abs(pos.x - c.minX);
          const penRight = Math.abs(c.maxX - pos.x);
          const penTop = Math.abs(pos.z - c.minZ);
          const penBottom = Math.abs(c.maxZ - pos.z);
          const minPen = Math.min(penLeft, penRight, penTop, penBottom);
          if (minPen === penLeft) pos.x = c.minX - radius;
          else if (minPen === penRight) pos.x = c.maxX + radius;
          else if (minPen === penTop) pos.z = c.minZ - radius;
          else pos.z = c.maxZ + radius;
        }
      }
    }
  }

  private hasLineOfSight(from: THREE.Vector3, to: THREE.Vector3): boolean {
    _vecD.copy(to).sub(from);
    const dist = _vecD.length();
    if (dist < 0.2) return true;
    _vecD.divideScalar(dist);
    _raycaster.set(from, _vecD);
    _raycaster.far = dist - 0.25;
    const hits = _raycaster.intersectObjects(this.arena.sightOccluders, false);
    return hits.length === 0;
  }

  // --- Combat & VFX ---

  private spawnTracer(start: THREE.Vector3, end: THREE.Vector3, colorHex: number): void {
    const points = [start.clone(), end.clone()];
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({ color: colorHex, transparent: true, opacity: 0.92 });
    const line = new THREE.Line(geo, mat);
    this.scene.add(line);
    this.tracers.push({ line, material: mat, life: 0.09, maxLife: 0.09 });
  }

  private spawnSparks(point: THREE.Vector3, isEnemyHit: boolean): void {
    const count = isEnemyHit ? 6 : 3;
    for (let i = 0; i < count; i++) {
      const m = new THREE.Mesh(this.sparkGeo, isEnemyHit ? this.sparkMatHit : this.sparkMatPlayer);
      m.position.copy(point);
      this.scene.add(m);
      this.sparks.push({
        mesh: m,
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 4.8,
          1.2 + Math.random() * 2.9,
          (Math.random() - 0.5) * 4.8,
        ),
        life: 0.22 + Math.random() * 0.14,
      });
    }
  }

  private firePlayerRifle(): void {
    if (this.isReloading || this.fireCooldown > 0) return;
    if (this.ammo <= 0) {
      this.triggerReload();
      return;
    }

    this.ammo--;
    this.shotsFired++;
    this.fireCooldown = PLAYER_FIRE_INTERVAL;
    this.playerMuzzleTimer = 0.055;
    this.recoilPitchOffset = Math.min(0.06, this.recoilPitchOffset + (this.adsBlend > 0.5 ? 0.013 : 0.02));
    this.shakeTrauma = Math.min(1, this.shakeTrauma + 0.14);

    this.audio.playRifleShot(true, 'rifle');

    // UAISense_Hearing simulation: alert patrolling Henchmen within 18m of gunfire
    for (let i = 0; i < this.enemies.length; i++) {
      const en = this.enemies[i];
      if (!en.isBoss && en.state === 'patrol') {
        const hearDist = Math.hypot(en.position.x - this.playerPos.x, en.position.z - this.playerPos.z);
        if (hearDist <= 18) {
          en.state = 'suspicious';
          en.lastKnownPos.copy(this.playerPos);
          en.lostSightTimer = 4.0;
        }
      }
    }

    const spread = this.adsBlend > 0.5 ? 0.004 : 0.016;
    _ndcCenter.set((Math.random() - 0.5) * spread, (Math.random() - 0.5) * spread);
    _raycaster.setFromCamera(_ndcCenter, this.camera);
    _raycaster.far = 95;

    const hitboxes: THREE.Object3D[] = [];
    for (let i = 0; i < this.enemies.length; i++) {
      const en = this.enemies[i];
      if (en.state !== 'downed') {
        hitboxes.push(en.rig.headHitbox, en.rig.bodyHitbox);
      }
    }

    const envHits = _raycaster.intersectObjects(this.arena.sightOccluders, false);
    const enemyHits = _raycaster.intersectObjects(hitboxes, false);

    const envDist = envHits.length > 0 ? envHits[0].distance : 95;
    const impactPoint = _vecB.copy(_raycaster.ray.origin).addScaledVector(_raycaster.ray.direction, Math.min(envDist, 75));

    if (enemyHits.length > 0 && enemyHits[0].distance < envDist) {
      const hit = enemyHits[0];
      impactPoint.copy(hit.point);
      const { entityId, zone } = hit.object.userData as { entityId: string; zone: 'head' | 'body' };
      const target = this.enemies.find((e) => e.id === entityId && e.state !== 'downed');
      if (target) {
        this.shotsHit++;
        const isHead = zone === 'head';
        const baseDmg = isHead ? 48 : 26;
        const armorMult =
          target.isBoss && !isHead ? (target.bossPhase === 1 ? 0.85 : target.bossPhase === 2 ? 0.95 : 1.0) : 1.0;
        const dmg = baseDmg * armorMult;
        target.hp = Math.max(0, target.hp - dmg);
        target.hitFlashTimer = 0.12;
        target.alerted = true;
        target.lastKnownPos.copy(this.playerPos);
        if (target.state === 'patrol' || target.state === 'suspicious' || target.state === 'searching') {
          target.state = 'chase';
        }

        const killed = target.hp <= 0;
        this.hitMarkerKind = killed ? 'kill' : isHead ? 'head' : 'body';
        this.hitMarkerTimer = 0.22;
        this.audio.playHitMarker(isHead, killed);
        this.spawnSparks(impactPoint, true);

        // Tactile 45ms Hitstop freeze-frame on kills or crisp headshots
        if (killed || isHead) {
          this.hitstopTimer = killed ? 0.048 : 0.025;
        }

        // El-Ameen / Boss 3-Phase Aggression Escalation (65% -> Phase 2, 30% -> Phase 3)
        if (target.isBoss && target.hp > 0) {
          const hpRatio = target.hp / target.maxHp;
          if (target.bossPhase === 1 && hpRatio <= 0.65) {
            target.bossPhase = 2;
            this.audio.playBossHorn();
            this.setAnnouncement(this.arena.config.bossPhase2Announcement, 4.0);
            this.arena.bossReinforcementSpawns.forEach((sp, i) => {
              const flanker = this.spawnEnemy(`reinf_${i}`, 'henchman', false, sp, this.playerPos.clone(), 85);
              flanker.alerted = true;
              flanker.state = 'chase';
              flanker.lastKnownPos.copy(this.playerPos);
            });
          } else if (target.bossPhase < 3 && hpRatio <= 0.3) {
            target.bossPhase = 3;
            this.audio.playBossHorn();
            this.setAnnouncement(
              `${this.arena.config.bossName} Phase 3: Relentless Pursuit — rapid suppression rush!`,
              4.2,
            );
          }
        }

        if (killed) {
          this.handleEnemyDowned(target);
        }
      }
    } else if (envHits.length > 0) {
      this.spawnSparks(impactPoint, false);
    }

    this.playerRig.muzzlePoint.getWorldPosition(_vecA);
    this.muzzleLight.position.copy(_vecA);
    this.muzzleLight.intensity = 4.6;
    this.spawnTracer(_vecA, impactPoint, 0xffd57c);

    if (this.ammo === 0 && this.reserveAmmo > 0) {
      this.triggerReload();
    }
    this.emitHud();
  }

  private handleEnemyDowned(enemy: EnemyEntity): void {
    enemy.state = 'downed';
    enemy.windupTimer = 0;
    if (enemy.rig.laserSight) {
      (enemy.rig.laserSight.material as THREE.LineBasicMaterial).opacity = 0;
    }
    this.eliminations++;
    enemy.rig.bodyPivot.rotation.x = -Math.PI / 2;
    enemy.rig.bodyPivot.position.y = 0.16;

    if (enemy.isBoss) {
      this.phase = 'victory';
      this.audio.setMusicIntensity('ambient');
      this.audio.playVictory();
      this.setAnnouncement(this.arena.config.victoryAnnouncement, 6.0);
      if (document.pointerLockElement === this.renderer.domElement) {
        document.exitPointerLock();
      }
      this.emitHud();
      return;
    }

    if (this.phase === 'wave1') {
      const alive = this.enemies.filter((e) => e.state !== 'downed').length;
      if (alive === 0) {
        this.triggerBossIntro();
      }
    }
  }

  // --- Soft Auto-Aim Assist ---

  private updateAutoAim(dt: number, activeAimingOrFiring: boolean): void {
    this.autoAimLocked = false;
    if (!this.settings.autoAimAssist) return;

    const camForward = _vecA.set(0, 0, -1).applyQuaternion(this.camera.quaternion).normalize();
    const minCos = Math.cos(THREE.MathUtils.degToRad(9.5));

    let bestTarget: EnemyEntity | null = null;
    let bestDot = minCos;

    for (let i = 0; i < this.enemies.length; i++) {
      const en = this.enemies[i];
      if (en.state === 'downed') continue;
      _vecB.set(en.position.x, en.position.y + 1.38, en.position.z);
      const dist = _vecB.distanceTo(this.camera.position);
      if (dist > 46) continue;

      _vecC.copy(_vecB).sub(this.camera.position).normalize();
      const dot = camForward.dot(_vecC);
      if (dot > bestDot && this.hasLineOfSight(this.camera.position, _vecB)) {
        bestDot = dot;
        bestTarget = en;
      }
    }

    if (bestTarget) {
      this.autoAimLocked = true;
      if (activeAimingOrFiring) {
        _vecB.set(bestTarget.position.x, bestTarget.position.y + 1.38, bestTarget.position.z);
        const dx = _vecB.x - this.playerPos.x;
        const dz = _vecB.z - this.playerPos.z;
        const desiredYaw = Math.atan2(-dx, -dz);
        let diff = desiredYaw - this.playerYaw;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        this.playerYaw += diff * (1 - Math.exp(-6.5 * dt));

        const horizDist = Math.max(1, Math.hypot(dx, dz));
        const eyeY = this.playerPos.y + (this.crouchBlend > 0.5 ? 1.15 : 1.55);
        const desiredPitch = Math.atan2(_vecB.y - eyeY, horizDist);
        this.playerPitch = THREE.MathUtils.damp(this.playerPitch, desiredPitch, 5.5, dt);
      }
    }
  }

  // --- Main Per-Frame Simulation ---

  private updateSimulation(dt: number): void {
    this.arena.dustPoints.rotation.y += dt * 0.016;

    // Title screen slow golden-hour camera pan across the live Cairo district
    if (this.phase === 'title') {
      this.orbitAngle += dt * 0.14;
      const radius = 24.5;
      this.camera.position.set(
        Math.sin(this.orbitAngle) * radius,
        8.6 + Math.sin(this.orbitAngle * 0.65) * 1.1,
        Math.cos(this.orbitAngle) * radius - 3,
      );
      this.camera.lookAt(0, 2.5, -7);
      this.updateEnemies(dt, false);
      return;
    }

    if (this.phase === 'victory' || this.phase === 'defeat') {
      this.orbitAngle += dt * 0.25;
      this.camera.position.set(
        this.playerPos.x + Math.sin(this.orbitAngle) * 7.2,
        this.playerPos.y + 3.4,
        this.playerPos.z + Math.cos(this.orbitAngle) * 7.2,
      );
      this.camera.lookAt(this.playerPos.x, this.playerPos.y + 1.2, this.playerPos.z);
      this.updateVfx(dt);
      return;
    }

    // Crisp hitstop freeze-frame on headshots / kills
    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      return;
    }

    this.elapsedSeconds += dt;
    if (this.announcementTimer > 0) {
      this.announcementTimer -= dt;
      if (this.announcementTimer <= 0) this.announcement = '';
    }
    if (this.damageFlash > 0) this.damageFlash = Math.max(0, this.damageFlash - dt * 2.4);
    if (this.shakeTrauma > 0) this.shakeTrauma = Math.max(0, this.shakeTrauma - dt * 2.8);
    if (this.hitMarkerTimer > 0) {
      this.hitMarkerTimer -= dt;
      if (this.hitMarkerTimer <= 0) this.hitMarkerKind = 'none';
    }

    if (this.phase === 'boss_intro') {
      this.phaseTimer -= dt;
      if (this.phaseTimer <= 0) {
        this.phase = 'boss_fight';
        this.emitHud();
      }
    }

    if (this.isReloading) {
      this.reloadElapsed += dt;
      if (this.reloadElapsed >= RELOAD_TIME) {
        const needed = MAG_SIZE - this.ammo;
        const taken = Math.min(needed, this.reserveAmmo);
        this.ammo += taken;
        this.reserveAmmo -= taken;
        this.isReloading = false;
        this.reloadElapsed = 0;
        this.emitHud();
      }
    }

    if (this.fireCooldown > 0) this.fireCooldown -= dt;
    this.recoilPitchOffset = THREE.MathUtils.damp(this.recoilPitchOffset, 0, 12, dt);

    let moveRight = this.virtualInput.moveX;
    let moveFwd = this.virtualInput.moveY;
    if (this.keys['KeyW'] || this.keys['ArrowUp']) moveFwd += 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) moveFwd -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) moveRight += 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) moveRight -= 1;

    const inputLen = Math.hypot(moveRight, moveFwd);
    if (inputLen > 1) {
      moveRight /= inputLen;
      moveFwd /= inputLen;
    }

    const wantsAds = this.mouseDownAds || this.virtualInput.ads;
    const wantsCrouch = this.crouchToggled || this.virtualInput.crouch;
    const wantsSprint =
      (Boolean(this.keys['ShiftLeft'] || this.keys['ShiftRight']) || this.virtualInput.sprint) &&
      moveFwd > 0.3 &&
      !wantsAds &&
      !wantsCrouch;
    const wantsFire = this.mouseDownFire || this.virtualInput.firing;

    this.stance = wantsCrouch ? 'crouching' : wantsSprint ? 'sprinting' : 'standing';
    this.crouchBlend = THREE.MathUtils.damp(this.crouchBlend, wantsCrouch ? 1 : 0, 11, dt);
    this.adsBlend = THREE.MathUtils.damp(this.adsBlend, wantsAds ? 1 : 0, 12, dt);

    const moveSpeed = wantsCrouch ? 3.2 : wantsAds ? 3.8 : wantsSprint ? 8.4 : 5.7;

    const sinY = Math.sin(this.playerYaw);
    const cosY = Math.cos(this.playerYaw);
    const worldDx = (-sinY * moveFwd + cosY * moveRight) * moveSpeed * dt;
    const worldDz = (-cosY * moveFwd - sinY * moveRight) * moveSpeed * dt;

    this.playerPos.x += worldDx;
    this.playerPos.z += worldDz;
    this.resolveMovementCollision(this.playerPos, PLAYER_RADIUS);

    // Animate protagonist rig
    this.playerRig.root.position.copy(this.playerPos);
    this.playerRig.root.rotation.y = this.playerYaw + Math.PI;
    this.playerRig.bodyPivot.position.y = -0.34 * this.crouchBlend;

    const actualSpeed = Math.hypot(worldDx, worldDz) / Math.max(0.001, dt);
    if (actualSpeed > 0.35) {
      this.playerWalkPhase += dt * actualSpeed * 1.85;
      const swing = Math.sin(this.playerWalkPhase) * 0.55;
      this.playerRig.leftLeg.rotation.x = swing;
      this.playerRig.rightLeg.rotation.x = -swing;
    } else {
      this.playerRig.leftLeg.rotation.x = THREE.MathUtils.damp(this.playerRig.leftLeg.rotation.x, 0, 10, dt);
      this.playerRig.rightLeg.rotation.x = THREE.MathUtils.damp(this.playerRig.rightLeg.rotation.x, 0, 10, dt);
    }

    if (this.playerMuzzleTimer > 0) {
      this.playerMuzzleTimer -= dt;
      this.setMuzzleFlashOpacity(this.playerRig.muzzleFlash, 0.92);
      this.playerRig.muzzleFlash.rotation.z = Math.random() * Math.PI;
    } else {
      this.setMuzzleFlashOpacity(this.playerRig.muzzleFlash, 0);
      this.muzzleLight.intensity = THREE.MathUtils.damp(this.muzzleLight.intensity, 0, 18, dt);
    }

    this.updateThirdPersonCamera(dt);
    this.updateAutoAim(dt, wantsFire || wantsAds);
    if (wantsFire && this.phase !== 'boss_intro') {
      this.firePlayerRifle();
    }

    this.updatePickups(dt);
    this.updateEnemies(dt, this.phase !== 'boss_intro');
    this.updateVfx(dt);
  }

  private updateThirdPersonCamera(dt: number): void {
    const isWide = this.settings.cameraPreset === 'wide';
    const baseDist = isWide ? 6.4 : 4.2;
    const dist = THREE.MathUtils.lerp(baseDist, 2.3, this.adsBlend);
    const shoulderRight = THREE.MathUtils.lerp(isWide ? 0.65 : 0.9, 0.72, this.adsBlend);
    const pivotHeight = THREE.MathUtils.lerp(1.62, 1.24, this.crouchBlend);
    const effectivePitch = THREE.MathUtils.clamp(this.playerPitch + this.recoilPitchOffset, -0.62, 0.55);

    const sinY = Math.sin(this.playerYaw);
    const cosY = Math.cos(this.playerYaw);
    const cosP = Math.cos(effectivePitch);
    const sinP = Math.sin(effectivePitch);

    const fwdX = -sinY * cosP;
    const fwdY = sinP;
    const fwdZ = -cosY * cosP;

    const rightX = cosY;
    const rightZ = -sinY;

    const pivotX = this.playerPos.x + rightX * shoulderRight;
    const pivotY = this.playerPos.y + pivotHeight;
    const pivotZ = this.playerPos.z + rightZ * shoulderRight;

    _camGoal.set(pivotX - fwdX * dist, pivotY - fwdY * dist + 0.35, pivotZ - fwdZ * dist);
    _camGoal.y = Math.max(0.65, _camGoal.y);
    _camGoal.x = THREE.MathUtils.clamp(_camGoal.x, -ARENA_HALF_BOUND + 0.3, ARENA_HALF_BOUND - 0.3);
    _camGoal.z = THREE.MathUtils.clamp(_camGoal.z, -21.8, 29.2);

    _lookGoal.set(pivotX + fwdX * 26, pivotY + fwdY * 26, pivotZ + fwdZ * 26);

    if (this.phase === 'boss_intro' && this.bossEntity) {
      _camGoal.set(0, 3.6, -11.5);
      _lookGoal.set(this.bossEntity.position.x, 2.0, this.bossEntity.position.z);
    }

    const camLambda = 15;
    this.currentCamPos.x = THREE.MathUtils.damp(this.currentCamPos.x, _camGoal.x, camLambda, dt);
    this.currentCamPos.y = THREE.MathUtils.damp(this.currentCamPos.y, _camGoal.y, camLambda, dt);
    this.currentCamPos.z = THREE.MathUtils.damp(this.currentCamPos.z, _camGoal.z, camLambda, dt);

    this.currentLookAt.x = THREE.MathUtils.damp(this.currentLookAt.x, _lookGoal.x, 18, dt);
    this.currentLookAt.y = THREE.MathUtils.damp(this.currentLookAt.y, _lookGoal.y, 18, dt);
    this.currentLookAt.z = THREE.MathUtils.damp(this.currentLookAt.z, _lookGoal.z, 18, dt);

    // Decaying trauma camera shake
    const shakeMag = this.shakeTrauma * this.shakeTrauma * 0.24;
    this.camera.position.set(
      this.currentCamPos.x + (Math.random() - 0.5) * shakeMag,
      this.currentCamPos.y + (Math.random() - 0.5) * shakeMag,
      this.currentCamPos.z + (Math.random() - 0.5) * shakeMag,
    );
    this.camera.lookAt(this.currentLookAt);

    const targetFov =
      this.adsBlend > 0.05 ? THREE.MathUtils.lerp(68, 48, this.adsBlend) : this.stance === 'sprinting' ? 73 : 68;
    if (Math.abs(this.camera.fov - targetFov) > 0.05) {
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 11, dt);
      this.camera.updateProjectionMatrix();
    }
  }

  private updatePickups(dt: number): void {
    this.nearbyPickupLabel = null;
    for (let i = 0; i < this.arena.pickups.length; i++) {
      const p = this.arena.pickups[i];
      if (!p.active) {
        p.respawnTimer -= dt;
        if (p.respawnTimer <= 0) {
          p.active = true;
          p.mesh.visible = true;
        }
        continue;
      }
      p.mesh.rotation.y += dt * 1.4;
      p.mesh.position.y = 0.55 + Math.sin(this.elapsedSeconds * 3 + i) * 0.08;

      const d = Math.hypot(this.playerPos.x - p.position.x, this.playerPos.z - p.position.z);
      if (d < 4.2) {
        this.nearbyPickupLabel = p.label;
      }
      if (d < 1.65) {
        if (p.kind === 'medkit' && this.playerHp < this.playerMaxHp) {
          this.playerHp = Math.min(this.playerMaxHp, this.playerHp + 40);
          p.active = false;
          p.mesh.visible = false;
          p.respawnTimer = 22;
          this.audio.playPickup();
          this.setAnnouncement('Recovered +40 HP from Field Medkit', 2.2);
          this.emitHud();
        } else if (p.kind === 'ammo') {
          this.reserveAmmo = Math.min(240, this.reserveAmmo + 60);
          p.active = false;
          p.mesh.visible = false;
          p.respawnTimer = 20;
          this.audio.playPickup();
          this.setAnnouncement('Resupplied +60 Rifle Rounds', 2.2);
          this.emitHud();
        }
      }
    }
  }

  private updateEnemies(dt: number, combatActive: boolean): void {
    for (let i = 0; i < this.enemies.length; i++) {
      const en = this.enemies[i];
      if (en.state === 'downed') continue;

      // Animate Level 4 Boss hovering recon drones
      if (en.rig.drones) {
        en.rig.drones.forEach((drone, dIdx) => {
          const ang = this.elapsedSeconds * 2.2 + dIdx * Math.PI;
          drone.position.set(Math.cos(ang) * 1.35, 2.2 + Math.sin(this.elapsedSeconds * 3.5 + dIdx) * 0.22, Math.sin(ang) * 1.35);
          drone.rotation.y += dt * 3.5;
        });
      }

      if (en.muzzleFlashTimer > 0) {
        en.muzzleFlashTimer -= dt;
        this.setMuzzleFlashOpacity(en.rig.muzzleFlash, 0.92);
        en.rig.muzzleFlash.rotation.z = Math.random() * Math.PI;
      } else {
        this.setMuzzleFlashOpacity(en.rig.muzzleFlash, 0);
      }

      if (en.hitFlashTimer > 0) {
        en.hitFlashTimer -= dt;
        en.rig.torso.rotation.x = -0.22;
      } else {
        en.rig.torso.rotation.x = THREE.MathUtils.damp(en.rig.torso.rotation.x, 0, 12, dt);
      }

      const dx = this.playerPos.x - en.position.x;
      const dz = this.playerPos.z - en.position.z;
      const distToPlayer = Math.hypot(dx, dz);

      let movedSpeed = 0;

      if (!combatActive) {
        const goal = en.patrolForward ? en.patrolB : en.patrolA;
        const gx = goal.x - en.position.x;
        const gz = goal.z - en.position.z;
        const gd = Math.hypot(gx, gz);
        if (gd < 0.7) {
          en.patrolForward = !en.patrolForward;
        } else {
          const spd = 2.0;
          en.position.x += (gx / gd) * spd * dt;
          en.position.z += (gz / gd) * spd * dt;
          en.yaw = Math.atan2(gx, gz);
          movedSpeed = spd;
        }
      } else {
        _vecA.set(en.position.x, 1.5, en.position.z);
        _vecB.set(this.playerPos.x, this.crouchBlend > 0.5 ? 1.0 : 1.45, this.playerPos.z);
        const sightRadius = en.isBoss ? 42 : 26;
        const canSee = distToPlayer < sightRadius && this.hasLineOfSight(_vecA, _vecB);

        if (canSee || distToPlayer < 12) {
          en.alerted = true;
          en.lastKnownPos.copy(this.playerPos);
          en.lostSightTimer = 5.0;
        } else if (!en.isBoss && (en.alerted || en.state === 'suspicious' || en.state === 'searching')) {
          en.lostSightTimer -= dt;
          if (en.lostSightTimer <= 0) {
            en.alerted = false;
            en.state = 'patrol';
          } else if (en.alerted) {
            en.state = 'searching';
          }
        }

        if (!en.alerted && en.state === 'patrol') {
          const goal = en.patrolForward ? en.patrolB : en.patrolA;
          const gx = goal.x - en.position.x;
          const gz = goal.z - en.position.z;
          const gd = Math.hypot(gx, gz);
          if (gd < 0.8) {
            en.patrolForward = !en.patrolForward;
          } else {
            const spd = 2.4;
            en.position.x += (gx / gd) * spd * dt;
            en.position.z += (gz / gd) * spd * dt;
            en.yaw = Math.atan2(gx, gz);
            movedSpeed = spd;
          }
        } else if (!en.alerted && en.state === 'suspicious') {
          // Investigate gunfire noise at lastKnownPos
          const gx = en.lastKnownPos.x - en.position.x;
          const gz = en.lastKnownPos.z - en.position.z;
          const gd = Math.hypot(gx, gz);
          if (gd > 1.8) {
            const spd = 2.8;
            en.position.x += (gx / gd) * spd * dt;
            en.position.z += (gz / gd) * spd * dt;
            en.yaw = Math.atan2(gx, gz);
            movedSpeed = spd;
          }
        } else {
          const targetYaw = Math.atan2(dx, dz);
          let yawDiff = targetYaw - en.yaw;
          while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
          while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
          en.yaw += yawDiff * (1 - Math.exp(-8 * dt));

          const isSniper = en.archetype === 'boss_hefny';
          const isShotgun = en.archetype === 'boss_zarzour';
          const isBossPhase3 = en.isBoss && en.bossPhase === 3;
          const preferredMin = isBossPhase3
            ? 4.8
            : isShotgun
              ? 5.0
              : isSniper
                ? 14.5
                : en.isBoss
                  ? 8.5
                  : 10.5;
          const preferredMax = isBossPhase3
            ? 10.5
            : isShotgun
              ? 11.5
              : isSniper
                ? 24.0
                : en.isBoss
                  ? 15.5
                  : 18.5;
          const moveSpd = en.isBoss
            ? en.bossPhase === 3
              ? 5.1
              : en.bossPhase === 2
                ? 4.2
                : 3.4
            : 4.2;

          if (!canSee || distToPlayer > preferredMax) {
            en.state = !canSee && !en.isBoss ? 'searching' : 'chase';
            const navDx = canSee || en.isBoss ? dx : en.lastKnownPos.x - en.position.x;
            const navDz = canSee || en.isBoss ? dz : en.lastKnownPos.z - en.position.z;
            const navDist = Math.hypot(navDx, navDz);
            if (navDist > 0.6) {
              en.position.x += (navDx / navDist) * moveSpd * dt;
              en.position.z += (navDz / navDist) * moveSpd * dt;
              movedSpeed = moveSpd;
            }
          } else {
            en.state = 'attack';
            en.strafeTimer -= dt;
            if (en.strafeTimer <= 0) {
              en.strafeDir *= -1;
              en.strafeTimer = 1.1 + Math.random() * 1.4;
            }
            const nx = dx / Math.max(0.01, distToPlayer);
            const nz = dz / Math.max(0.01, distToPlayer);
            const strafeSpd = moveSpd * 0.58;
            en.position.x += -nz * en.strafeDir * strafeSpd * dt;
            en.position.z += nx * en.strafeDir * strafeSpd * dt;
            if (distToPlayer < preferredMin) {
              en.position.x -= nx * strafeSpd * 0.6 * dt;
              en.position.z -= nz * strafeSpd * 0.6 * dt;
            }
            movedSpeed = strafeSpd;
          }

          // Boss Windup Telegraph (visible crimson/cyan laser sight before firing)
          if (en.isBoss && en.windupTimer > 0) {
            en.windupTimer -= dt;
            if (en.rig.laserSight) {
              (en.rig.laserSight.material as THREE.LineBasicMaterial).opacity = 0.85;
            }
            if (en.windupTimer <= 0) {
              if (en.rig.laserSight) {
                (en.rig.laserSight.material as THREE.LineBasicMaterial).opacity = 0;
              }
              this.fireEnemyWeapon(en, distToPlayer);
              en.burstRemaining =
                isSniper || isShotgun ? 0 : en.bossPhase === 3 ? 6 : en.bossPhase === 2 ? 4 : 3;
              en.fireCooldown = isSniper
                ? 1.7
                : isShotgun
                  ? 1.25
                  : en.bossPhase === 3
                    ? 0.1
                    : en.bossPhase === 2
                      ? 0.14
                      : 0.18;
            }
          } else {
            if (en.rig.laserSight) {
              (en.rig.laserSight.material as THREE.LineBasicMaterial).opacity = 0;
            }
            en.fireCooldown -= dt;
            if (canSee && en.fireCooldown <= 0) {
              if (en.isBoss && en.burstRemaining === 0) {
                // Start telegraph windup before each boss volley (tighter in Phase 2 & 3)
                en.windupTimer = isSniper
                  ? 0.68
                  : en.bossPhase === 3
                    ? 0.32
                    : en.bossPhase === 2
                      ? 0.45
                      : 0.62;
              } else {
                this.fireEnemyWeapon(en, distToPlayer);
                if (en.isBoss) {
                  en.burstRemaining = Math.max(0, en.burstRemaining - 1);
                  en.fireCooldown =
                    en.burstRemaining > 0
                      ? en.bossPhase === 3
                        ? 0.1
                        : en.bossPhase === 2
                          ? 0.13
                          : 0.18
                      : en.bossPhase === 3
                        ? 0.85
                        : en.bossPhase === 2
                          ? 1.1
                          : 1.4;
                } else {
                  en.fireCooldown = 1.15 + Math.random() * 0.8;
                }
              }
            }
          }
        }
      }

      this.resolveMovementCollision(en.position, en.isBoss ? 0.68 : 0.55);
      en.rig.root.position.copy(en.position);
      en.rig.root.rotation.y = en.yaw;

      if (movedSpeed > 0.25) {
        en.walkPhase += dt * movedSpeed * 1.7;
        const swing = Math.sin(en.walkPhase) * 0.48;
        en.rig.leftLeg.rotation.x = swing;
        en.rig.rightLeg.rotation.x = -swing;
      } else {
        en.rig.leftLeg.rotation.x = THREE.MathUtils.damp(en.rig.leftLeg.rotation.x, 0, 8, dt);
        en.rig.rightLeg.rotation.x = THREE.MathUtils.damp(en.rig.rightLeg.rotation.x, 0, 8, dt);
      }
    }
  }

  private fireEnemyWeapon(en: EnemyEntity, distToPlayer: number): void {
    const weaponStyle = en.isBoss ? this.arena.config.bossWeaponStyle : 'rifle';
    en.muzzleFlashTimer = 0.06;
    this.audio.playRifleShot(false, weaponStyle);
    en.rig.muzzlePoint.getWorldPosition(_vecA);

    const stanceMod = this.stance === 'crouching' ? 0.7 : this.stance === 'sprinting' ? 0.78 : 1.0;
    const baseHitChance = en.isBoss
      ? weaponStyle === 'sniper'
        ? 0.64
        : en.bossPhase === 3
          ? 0.58
          : en.bossPhase === 2
            ? 0.5
            : 0.42
      : 0.3;
    const distMod = THREE.MathUtils.clamp(1.2 - distToPlayer / 42, 0.35, 1.0);
    const hitsPlayer = Math.random() < baseHitChance * distMod * stanceMod;

    const tracerColor = weaponStyle === 'pulse' ? 0x38bdf8 : en.isBoss ? 0xff7b3b : 0xff5a45;

    if (hitsPlayer) {
      _vecB.set(this.playerPos.x, this.playerPos.y + (this.crouchBlend > 0.5 ? 0.9 : 1.3), this.playerPos.z);
      const dmg =
        weaponStyle === 'sniper'
          ? 20
          : weaponStyle === 'shotgun'
            ? 14
            : en.isBoss
              ? en.bossPhase === 3
                ? 12
                : en.bossPhase === 2
                  ? 10
                  : 9
              : 7;
      this.playerHp = Math.max(0, this.playerHp - dmg);
      this.damageFlash = 0.78;
      this.shakeTrauma = Math.min(1, this.shakeTrauma + (weaponStyle === 'sniper' ? 0.58 : 0.34));
      this.audio.playPlayerHit();

      if (this.playerHp <= 0) {
        this.phase = 'defeat';
        this.audio.setMusicIntensity('ambient');
        this.setAnnouncement(`Downed in ${this.arena.config.name}. Regroup and redeploy.`, 6.0);
        if (document.pointerLockElement === this.renderer.domElement) {
          document.exitPointerLock();
        }
      }
      this.emitHud();
    } else {
      _vecB.set(
        this.playerPos.x + (Math.random() - 0.5) * 3.0,
        this.playerPos.y + 0.8 + Math.random() * 1.4,
        this.playerPos.z + (Math.random() - 0.5) * 3.0,
      );
    }

    if (weaponStyle === 'shotgun') {
      // 5-pellet shotgun spread burst for El-Moallem Zarzour
      for (let p = 0; p < 5; p++) {
        _vecC.copy(_vecB).add(
          new THREE.Vector3((Math.random() - 0.5) * 2.2, (Math.random() - 0.5) * 1.4, (Math.random() - 0.5) * 2.2),
        );
        this.spawnTracer(_vecA, _vecC, tracerColor);
      }
    } else {
      this.spawnTracer(_vecA, _vecB, tracerColor);
    }
  }

  private updateVfx(dt: number): void {
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const tr = this.tracers[i];
      tr.life -= dt;
      if (tr.life <= 0) {
        this.scene.remove(tr.line);
        tr.line.geometry.dispose();
        tr.material.dispose();
        this.tracers.splice(i, 1);
      } else {
        tr.material.opacity = tr.life / tr.maxLife;
      }
    }

    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const sp = this.sparks[i];
      sp.life -= dt;
      if (sp.life <= 0) {
        this.scene.remove(sp.mesh);
        this.sparks.splice(i, 1);
      } else {
        sp.velocity.y -= 9.5 * dt;
        sp.mesh.position.addScaledVector(sp.velocity, dt);
        sp.mesh.scale.setScalar(Math.max(0.1, sp.life * 3.5));
      }
    }
  }

  // --- Loop & Software-WebGL Pacing ---

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) {
        if (sync) gl.deleteSync(sync);
        return;
      }
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private scheduleNextTick(): void {
    if (this.disposed) return;
    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  }

  private tick = (): void => {
    if (this.disposed) return;

    const now = performance.now();
    const rawDt = (now - this.lastTimestamp) / 1000;
    this.lastTimestamp = now;
    const dt = Math.min(rawDt, 0.08);

    this.fpsAccumFrames++;
    this.fpsAccumTime += rawDt;
    if (this.fpsAccumTime >= 0.5) {
      this.fpsEstimate = Math.round(this.fpsAccumFrames / this.fpsAccumTime);
      this.fpsAccumFrames = 0;
      this.fpsAccumTime = 0;
    }

    if (!this.paused) {
      this.updateSimulation(dt);
      this.renderer.render(this.scene, this.camera);

      this.hudEmitAccum += dt;
      if (this.hudEmitAccum >= 0.1) {
        this.hudEmitAccum = 0;
        this.emitHud();
      }
    }

    this.scheduleNextTick();
  };

  private emitHud(): void {
    const cfg = this.arena.config;
    const aliveNonBoss = this.enemies.filter((e) => !e.isBoss && e.state !== 'downed').length;
    const boss = this.bossEntity;
    const bossActive = Boolean(
      boss && boss.state !== 'downed' && (this.phase === 'boss_intro' || this.phase === 'boss_fight'),
    );

    this.onHudUpdate({
      phase: this.phase,
      districtId: this.currentDistrictId,
      districtName: cfg.name,
      districtArabic: cfg.arabicName,
      levelNumber: cfg.levelNumber,
      playerHp: Math.round(this.playerHp),
      playerMaxHp: this.playerMaxHp,
      ammo: this.ammo,
      magSize: MAG_SIZE,
      reserveAmmo: this.reserveAmmo,
      isReloading: this.isReloading,
      reloadProgress: this.isReloading ? Math.min(1, this.reloadElapsed / RELOAD_TIME) : 0,
      stance: this.stance,
      isAds: this.adsBlend > 0.5,
      enemiesRemaining: aliveNonBoss + (bossActive ? 1 : 0),
      totalWaveEnemies: this.arena.henchmanSpawns.length,
      eliminations: this.eliminations,
      shotsFired: this.shotsFired,
      shotsHit: this.shotsHit,
      elapsedSeconds: this.elapsedSeconds,
      hitMarkerKind: this.hitMarkerKind,
      damageFlash: this.damageFlash,
      autoAimLocked: this.autoAimLocked,
      bossActive,
      bossName: cfg.bossName,
      bossTitle: cfg.bossTitle,
      bossHp: boss ? Math.round(boss.hp) : 0,
      bossMaxHp: boss ? boss.maxHp : cfg.bossMaxHp,
      bossPhase: boss ? boss.bossPhase : 1,
      bossWindup: Boolean(boss && boss.windupTimer > 0),
      announcement: this.announcement,
      pointerLocked: this.pointerLocked,
      fpsEstimate: this.fpsEstimate,
      isSoftwareGl: this.isSoftwareGl,
      nearbyPickupLabel: this.nearbyPickupLabel,
      playerX: this.playerPos.x,
      playerZ: this.playerPos.z,
    });
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);

    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleWindowBlur);
    document.removeEventListener('pointerlockchange', this.handlePointerLockChange);
    document.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('mouseup', this.handleMouseUp);

    const canvas = this.renderer.domElement;
    canvas.removeEventListener('mousedown', this.handleMouseDown);
    canvas.removeEventListener('contextmenu', this.handleContextMenu);
    canvas.removeEventListener('webglcontextlost', this.handleContextLost);
    canvas.removeEventListener('webglcontextrestored', this.handleContextRestored);
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;

    this.clearAllEnemies();
    this.tracers.forEach((tr) => {
      tr.line.geometry.dispose();
      tr.material.dispose();
    });
    this.sparkGeo.dispose();
    this.sparkMatPlayer.dispose();
    this.sparkMatHit.dispose();
    this.playerRig.dispose();
    this.arena.dispose();
    this.materials.dispose();
    this.audio.dispose();

    if (this.skyDome) {
      this.skyDome.geometry.dispose();
      const mat = this.skyDome.material as THREE.MeshBasicMaterial;
      mat.map?.dispose();
      mat.dispose();
    }
    if (this.sunHalo) {
      const sMat = this.sunHalo.material as THREE.SpriteMaterial;
      sMat.map?.dispose();
      sMat.dispose();
    }
    if (this.scene.environment) {
      this.scene.environment.dispose();
    }
    this.renderer.dispose();
    if (canvas.parentElement === this.container) {
      this.container.removeChild(canvas);
    }
  }
}
