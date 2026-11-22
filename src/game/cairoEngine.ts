import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { TacticalAudioEngine } from './audioEngine';
import { ArticulatedCharacterRig, createCharacterRig } from './characterModels';
import { createCairoMaterials, CairoMaterialLibrary } from './materials';
import { buildShubraArena, ShubraArenaData } from './shubraArena';
import {
  AABBCollider,
  GameSettings,
  HudSnapshot,
  MatchPhase,
  PlayerStance,
  VirtualInputState,
} from './types';

interface EnemyEntity {
  id: string;
  isBoss: boolean;
  rig: ArticulatedCharacterRig;
  position: THREE.Vector3;
  yaw: number;
  hp: number;
  maxHp: number;
  state: 'patrol' | 'chase' | 'attack' | 'downed';
  patrolA: THREE.Vector3;
  patrolB: THREE.Vector3;
  patrolForward: boolean;
  fireCooldown: number;
  burstRemaining: number;
  strafeDir: number;
  strafeTimer: number;
  hitFlashTimer: number;
  muzzleFlashTimer: number;
  walkPhase: number;
  bossPhase2Triggered: boolean;
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

// Module-scope reusable math objects (zero GC in per-frame render loop)
const _vecA = new THREE.Vector3();
const _vecB = new THREE.Vector3();
const _vecC = new THREE.Vector3();
const _vecD = new THREE.Vector3();
const _camGoal = new THREE.Vector3();
const _lookGoal = new THREE.Vector3();
const _raycaster = new THREE.Raycaster();
const _ndcCenter = new THREE.Vector2(0, 0);

const PLAYER_RADIUS = 0.55;
const ARENA_HALF_BOUND = 25.5;
const MAG_SIZE = 30;
const RELOAD_TIME = 1.45;
const PLAYER_FIRE_INTERVAL = 0.115;

export class CairoSliceEngine {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private materials: CairoMaterialLibrary;
  private arena: ShubraArenaData;
  private audio: TacticalAudioEngine;
  private playerRig: ArticulatedCharacterRig;
  private muzzleLight: THREE.PointLight;
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

  // Match & player state
  private phase: MatchPhase = 'briefing';
  private phaseTimer = 0;
  private elapsedSeconds = 0;
  private announcement = 'Clear the Shubra precinct courtyard to draw out El-Ameen.';
  private announcementTimer = 0;

  private playerPos = new THREE.Vector3(0, 0, 21.5);
  private playerYaw = 0; // 0 looks toward -Z (North toward the precinct)
  private playerPitch = -0.06;
  private playerHp = 100;
  private playerMaxHp = 100;
  private ammo = MAG_SIZE;
  private reserveAmmo = 150;
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

  // Camera damping state
  private currentCamPos = new THREE.Vector3(0, 6, 30);
  private currentLookAt = new THREE.Vector3(0, 2, 0);
  private orbitAngle = 0;

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

    // 1. Software WebGL detection (strictly renderer string)
    this.isSoftwareGl = (() => {
      const probe = document.createElement('canvas').getContext('webgl2');
      if (!probe) return true;
      const ext = probe.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
      const gpu = String(probe.getParameter(param));
      probe.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // 2. Renderer setup
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);

    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.touchAction = 'none';
    container.appendChild(this.renderer.domElement);

    // 3. Scene & Golden-Hour Dusty Cairo Atmosphere
    this.scene = new THREE.Scene();
    const sunsetHaze = new THREE.Color(0xd5965e);
    this.scene.background = sunsetHaze;
    this.scene.fog = new THREE.FogExp2(0xd5965e, 0.0088);

    // Mandatory RoomEnvironment IBL on all devices
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    // Sky dome gradient for authentic golden-hour zenith-to-horizon transition
    this.addGoldenHourSkyDome();

    // 4. Camera
    const aspect = (container.clientWidth || window.innerWidth) / Math.max(1, container.clientHeight || window.innerHeight);
    this.camera = new THREE.PerspectiveCamera(68, aspect, 0.15, 280);

    // 5. Three-Point Golden-Hour Lighting Rig (<= 1 shadow caster for mobile perf)
    const sunKey = new THREE.DirectionalLight(0xffbd73, 2.55);
    sunKey.position.set(-38, 28, -22);
    sunKey.castShadow = !this.isSoftwareGl;
    sunKey.shadow.mapSize.set(1024, 1024);
    sunKey.shadow.camera.near = 4;
    sunKey.shadow.camera.far = 115;
    sunKey.shadow.camera.left = -36;
    sunKey.shadow.camera.right = 36;
    sunKey.shadow.camera.top = 36;
    sunKey.shadow.camera.bottom = -36;
    sunKey.shadow.bias = -0.0005;
    sunKey.shadow.normalBias = 0.025;
    this.scene.add(sunKey);

    const hemiFill = new THREE.HemisphereLight(0x88a7cc, 0x7b5435, 0.92);
    this.scene.add(hemiFill);

    const rimLight = new THREE.DirectionalLight(0xf39c4f, 0.65);
    rimLight.position.set(28, 14, 34);
    this.scene.add(rimLight);

    // 6. Materials, Arena & Protagonist
    this.materials = createCairoMaterials(this.renderer);
    this.arena = buildShubraArena(this.materials);
    this.scene.add(this.arena.root);

    this.playerRig = createCharacterRig('player', this.materials.contactShadow, 'player');
    this.playerPos.copy(this.arena.playerSpawn);
    this.playerRig.root.position.copy(this.playerPos);
    this.scene.add(this.playerRig.root);

    this.muzzleLight = new THREE.PointLight(0xffb84d, 0, 8, 2);
    this.scene.add(this.muzzleLight);

    // Shared spark geometries/materials
    this.sparkGeo = new THREE.BoxGeometry(0.11, 0.11, 0.11);
    this.sparkMatPlayer = new THREE.MeshBasicMaterial({ color: 0xffd27a });
    this.sparkMatHit = new THREE.MeshBasicMaterial({ color: 0xff5a45 });

    // Pre-spawn wave 1 patrolling henchmen so the courtyard looks alive even during briefing
    this.spawnWaveOneEnemies();

    // Shader warm-up on hardware GPUs
    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.bindEvents();
    this.emitHud();
    this.lastTimestamp = performance.now();
    this.scheduleNextTick();
  }

  private addGoldenHourSkyDome(): void {
    const skyCanvas = document.createElement('canvas');
    skyCanvas.width = 16;
    skyCanvas.height = 256;
    const ctx = skyCanvas.getContext('2d')!;
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0.0, '#445873'); // Dusk slate zenith
    grad.addColorStop(0.32, '#8b7375');
    grad.addColorStop(0.54, '#d99357'); // Warm golden sunset horizon
    grad.addColorStop(0.68, '#eab372'); // Dusty amber glow
    grad.addColorStop(1.0, '#a8774b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 16, 256);

    const skyTex = new THREE.CanvasTexture(skyCanvas);
    skyTex.colorSpace = THREE.SRGBColorSpace;
    const skyGeo = new THREE.SphereGeometry(210, 20, 14);
    const skyMat = new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false, depthWrite: false });
    const skyDome = new THREE.Mesh(skyGeo, skyMat);
    skyDome.name = 'cairo_sky_dome';
    this.scene.add(skyDome);
  }

  private bindEvents(): void {
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    document.addEventListener('pointerlockchange', this.handlePointerLockChange);
    document.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('mouseup', this.handleMouseUp);

    const canvas = this.renderer.domElement;
    canvas.addEventListener('mousedown', this.handleMouseDown);
    canvas.addEventListener('contextmenu', this.handleContextMenu);
    canvas.addEventListener('webglcontextlost', this.handleContextLost);
    canvas.addEventListener('webglcontextrestored', this.handleContextRestored);
  }

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

    if (e.button === 0) {
      this.mouseDownFire = true;
      this.dragLooking = true;
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;
      // Try pointer lock for desktop shooter comfort (safe no-op if iframe restricts it)
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

  // --- Public Controls API for React HUD ---

  public startMission(): void {
    this.resetCombatState();
    this.phase = 'wave1';
    this.setAnnouncement('Wave 1: Clear the Shubra precinct henchmen (5 hostiles)', 4.5);
    this.emitHud();
  }

  public jumpToBossFight(): void {
    this.resetCombatState();
    this.clearAllEnemies();
    this.triggerBossIntro();
    this.emitHud();
  }

  public updateSettings(partial: Partial<GameSettings>): void {
    this.settings = { ...this.settings, ...partial };
    this.audio.setMuted(this.settings.muted);
    this.emitHud();
  }

  public setPaused(paused: boolean): void {
    this.paused = paused;
    if (paused && document.pointerLockElement === this.renderer.domElement) {
      document.exitPointerLock();
    }
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
    this.reserveAmmo = 150;
    this.isReloading = false;
    this.reloadElapsed = 0;
    this.fireCooldown = 0;
    this.crouchToggled = false;
    this.mouseDownAds = false;
    this.mouseDownFire = false;
    this.damageFlash = 0;
    this.hitMarkerKind = 'none';
    this.eliminations = 0;
    this.shotsFired = 0;
    this.shotsHit = 0;
    this.elapsedSeconds = 0;
    this.bossEntity = null;

    // Reactivate pickups
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
    this.arena.henchmanSpawns.forEach((sp, idx) => {
      this.spawnEnemy(`hench_${idx}`, false, sp.pos, sp.patrolTo, 95);
    });
  }

  private spawnEnemy(
    id: string,
    isBoss: boolean,
    spawnPos: THREE.Vector3,
    patrolTo: THREE.Vector3,
    maxHp: number,
  ): EnemyEntity {
    const rig = createCharacterRig(isBoss ? 'boss_el_ameen' : 'henchman', this.materials.contactShadow, id);
    rig.root.position.copy(spawnPos);
    this.scene.add(rig.root);

    const entity: EnemyEntity = {
      id,
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
      fireCooldown: isBoss ? 1.1 : 0.8 + Math.random() * 0.7,
      burstRemaining: 0,
      strafeDir: Math.random() > 0.5 ? 1 : -1,
      strafeTimer: 1.2 + Math.random() * 1.2,
      hitFlashTimer: 0,
      muzzleFlashTimer: 0,
      walkPhase: Math.random() * Math.PI * 2,
      bossPhase2Triggered: false,
      alerted: isBoss,
    };

    this.enemies.push(entity);
    if (isBoss) {
      this.bossEntity = entity;
    }
    return entity;
  }

  private triggerBossIntro(): void {
    this.phase = 'boss_intro';
    this.phaseTimer = 2.4;
    this.audio.playBossHorn();
    const boss = this.spawnEnemy('boss_el_ameen', true, this.arena.bossSpawn, new THREE.Vector3(0, 0, -10), 460);
    boss.alerted = true;
    this.setAnnouncement('Boss Alert: El-Ameen enters from the Shubra Precinct!', 4.2);
  }

  private setAnnouncement(text: string, duration = 3.5): void {
    this.announcement = text;
    this.announcementTimer = duration;
  }

  // --- Collision & Line-of-Sight ---

  private resolveMovementCollision(pos: THREE.Vector3, radius: number): void {
    pos.x = THREE.MathUtils.clamp(pos.x, -ARENA_HALF_BOUND, ARENA_HALF_BOUND);
    pos.z = THREE.MathUtils.clamp(pos.z, -23.0, 28.5);

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
          // Inside box fallback: push out along shallowest axis
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
    this.tracers.push({ line, material: mat, life: 0.085, maxLife: 0.085 });
  }

  private spawnSparks(point: THREE.Vector3, isEnemyHit: boolean): void {
    const count = isEnemyHit ? 5 : 3;
    for (let i = 0; i < count; i++) {
      const m = new THREE.Mesh(this.sparkGeo, isEnemyHit ? this.sparkMatHit : this.sparkMatPlayer);
      m.position.copy(point);
      this.scene.add(m);
      this.sparks.push({
        mesh: m,
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 4.5,
          1.2 + Math.random() * 2.8,
          (Math.random() - 0.5) * 4.5,
        ),
        life: 0.22 + Math.random() * 0.12,
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
    this.recoilPitchOffset = Math.min(0.06, this.recoilPitchOffset + (this.adsBlend > 0.5 ? 0.014 : 0.022));

    this.audio.playRifleShot(true, false);

    // Raycast from screen center with slight hip-fire spread
    const spread = this.adsBlend > 0.5 ? 0.004 : 0.018;
    _ndcCenter.set((Math.random() - 0.5) * spread, (Math.random() - 0.5) * spread);
    _raycaster.setFromCamera(_ndcCenter, this.camera);
    _raycaster.far = 95;

    // Gather active enemy hitboxes
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
    let impactPoint = _vecB.copy(_raycaster.ray.origin).addScaledVector(_raycaster.ray.direction, Math.min(envDist, 75));

    if (enemyHits.length > 0 && enemyHits[0].distance < envDist) {
      const hit = enemyHits[0];
      impactPoint.copy(hit.point);
      const { entityId, zone } = hit.object.userData as { entityId: string; zone: 'head' | 'body' };
      const target = this.enemies.find((e) => e.id === entityId && e.state !== 'downed');
      if (target) {
        this.shotsHit++;
        const isHead = zone === 'head';
        const baseDmg = isHead ? 46 : 25;
        const dmg = target.isBoss && !target.bossPhase2Triggered && !isHead ? baseDmg * 0.85 : baseDmg;
        target.hp = Math.max(0, target.hp - dmg);
        target.hitFlashTimer = 0.12;
        target.alerted = true;
        if (target.state === 'patrol') target.state = 'chase';

        const killed = target.hp <= 0;
        this.hitMarkerKind = killed ? 'kill' : isHead ? 'head' : 'body';
        this.hitMarkerTimer = 0.22;
        this.audio.playHitMarker(isHead, killed);
        this.spawnSparks(impactPoint, true);

        if (target.isBoss && !target.bossPhase2Triggered && target.hp > 0 && target.hp <= target.maxHp * 0.5) {
          target.bossPhase2Triggered = true;
          this.audio.playBossHorn();
          this.setAnnouncement('El-Ameen Phase 2: Precinct flankers deployed!', 4.0);
          this.arena.bossReinforcementSpawns.forEach((sp, i) => {
            const flanker = this.spawnEnemy(`reinf_${i}`, false, sp, this.playerPos.clone(), 80);
            flanker.alerted = true;
            flanker.state = 'chase';
          });
        }

        if (killed) {
          this.handleEnemyDowned(target);
        }
      }
    } else if (envHits.length > 0) {
      this.spawnSparks(impactPoint, false);
    }

    // Muzzle tracer & warm flash light
    this.playerRig.muzzlePoint.getWorldPosition(_vecA);
    this.muzzleLight.position.copy(_vecA);
    this.muzzleLight.intensity = 4.5;
    this.spawnTracer(_vecA, impactPoint, 0xffd57c);

    if (this.ammo === 0 && this.reserveAmmo > 0) {
      this.triggerReload();
    }
    this.emitHud();
  }

  private handleEnemyDowned(enemy: EnemyEntity): void {
    enemy.state = 'downed';
    this.eliminations++;
    // Topple character cleanly onto the street
    enemy.rig.bodyPivot.rotation.x = -Math.PI / 2;
    enemy.rig.bodyPivot.position.y = 0.16;

    if (enemy.isBoss) {
      this.phase = 'victory';
      this.audio.playVictory();
      this.setAnnouncement('District Secured: El-Ameen defeated in Shubra!', 6.0);
      if (document.pointerLockElement === this.renderer.domElement) {
        document.exitPointerLock();
      }
      this.emitHud();
      return;
    }

    // Check if Wave 1 cleared
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
      if (dist > 44) continue;

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
        // Shortest angle wrap
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
    // Animate golden-hour dust motes subtly
    this.arena.dustPoints.rotation.y += dt * 0.018;

    // Briefing cinematic orbit around Shubra courtyard
    if (this.phase === 'briefing') {
      this.orbitAngle += dt * 0.16;
      const radius = 26;
      this.camera.position.set(
        Math.sin(this.orbitAngle) * radius,
        9.2 + Math.sin(this.orbitAngle * 0.7) * 1.2,
        Math.cos(this.orbitAngle) * radius - 3,
      );
      this.camera.lookAt(0, 2.4, -7);
      this.updateEnemies(dt, false);
      return;
    }

    if (this.phase === 'victory' || this.phase === 'defeat') {
      this.orbitAngle += dt * 0.25;
      this.camera.position.set(
        this.playerPos.x + Math.sin(this.orbitAngle) * 7.5,
        this.playerPos.y + 3.6,
        this.playerPos.z + Math.cos(this.orbitAngle) * 7.5,
      );
      this.camera.lookAt(this.playerPos.x, this.playerPos.y + 1.2, this.playerPos.z);
      this.updateVfx(dt);
      return;
    }

    this.elapsedSeconds += dt;
    if (this.announcementTimer > 0) {
      this.announcementTimer -= dt;
      if (this.announcementTimer <= 0) this.announcement = '';
    }
    if (this.damageFlash > 0) this.damageFlash = Math.max(0, this.damageFlash - dt * 2.4);
    if (this.hitMarkerTimer > 0) {
      this.hitMarkerTimer -= dt;
      if (this.hitMarkerTimer <= 0) this.hitMarkerKind = 'none';
    }

    // Boss intro countdown
    if (this.phase === 'boss_intro') {
      this.phaseTimer -= dt;
      if (this.phaseTimer <= 0) {
        this.phase = 'boss_fight';
        this.emitHud();
      }
    }

    // Reload timer
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

    // Combine Keyboard + Dual-Thumb Virtual Input
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
    const wantsSprint = (Boolean(this.keys['ShiftLeft'] || this.keys['ShiftRight']) || this.virtualInput.sprint) && moveFwd > 0.3 && !wantsAds && !wantsCrouch;
    const wantsFire = this.mouseDownFire || this.virtualInput.firing;

    this.stance = wantsCrouch ? 'crouching' : wantsSprint ? 'sprinting' : 'standing';
    this.crouchBlend = THREE.MathUtils.damp(this.crouchBlend, wantsCrouch ? 1 : 0, 11, dt);
    this.adsBlend = THREE.MathUtils.damp(this.adsBlend, wantsAds ? 1 : 0, 12, dt);

    const moveSpeed = wantsCrouch ? 3.2 : wantsAds ? 3.8 : wantsSprint ? 8.2 : 5.6;

    // Move relative to player camera yaw
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

    // Muzzle flash fade
    if (this.playerMuzzleTimer > 0) {
      this.playerMuzzleTimer -= dt;
      (this.playerRig.muzzleFlash.material as THREE.MeshBasicMaterial).opacity = 0.92;
      this.playerRig.muzzleFlash.rotation.z = Math.random() * Math.PI;
    } else {
      (this.playerRig.muzzleFlash.material as THREE.MeshBasicMaterial).opacity = 0;
      this.muzzleLight.intensity = THREE.MathUtils.damp(this.muzzleLight.intensity, 0, 18, dt);
    }

    // Update third-person PUBG over-the-shoulder camera
    this.updateThirdPersonCamera(dt);

    // Auto-Aim assist & Firing
    this.updateAutoAim(dt, wantsFire || wantsAds);
    if (wantsFire && this.phase !== 'boss_intro') {
      this.firePlayerRifle();
    }

    // Pickups & Enemies & VFX
    this.updatePickups(dt);
    this.updateEnemies(dt, this.phase !== 'boss_intro');
    this.updateVfx(dt);
  }

  private updateThirdPersonCamera(dt: number): void {
    const isWide = this.settings.cameraPreset === 'wide';
    const baseDist = isWide ? 6.4 : 4.25;
    const dist = THREE.MathUtils.lerp(baseDist, 2.35, this.adsBlend);
    const shoulderRight = THREE.MathUtils.lerp(isWide ? 0.65 : 0.92, 0.72, this.adsBlend);
    const pivotHeight = THREE.MathUtils.lerp(1.62, 1.24, this.crouchBlend);
    const effectivePitch = THREE.MathUtils.clamp(this.playerPitch + this.recoilPitchOffset, -0.62, 0.55);

    const sinY = Math.sin(this.playerYaw);
    const cosY = Math.cos(this.playerYaw);
    const cosP = Math.cos(effectivePitch);
    const sinP = Math.sin(effectivePitch);

    // Forward view unit vector
    const fwdX = -sinY * cosP;
    const fwdY = sinP;
    const fwdZ = -cosY * cosP;

    // Right shoulder offset
    const rightX = cosY;
    const rightZ = -sinY;

    const pivotX = this.playerPos.x + rightX * shoulderRight;
    const pivotY = this.playerPos.y + pivotHeight;
    const pivotZ = this.playerPos.z + rightZ * shoulderRight;

    _camGoal.set(pivotX - fwdX * dist, pivotY - fwdY * dist + 0.35, pivotZ - fwdZ * dist);
    _camGoal.y = Math.max(0.65, _camGoal.y);
    // Keep camera inside outer walls
    _camGoal.x = THREE.MathUtils.clamp(_camGoal.x, -ARENA_HALF_BOUND + 0.3, ARENA_HALF_BOUND - 0.3);
    _camGoal.z = THREE.MathUtils.clamp(_camGoal.z, -23.2, 29.2);

    _lookGoal.set(pivotX + fwdX * 26, pivotY + fwdY * 26, pivotZ + fwdZ * 26);

    // Boss intro dramatic focus on El-Ameen emerging from the precinct arch
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

    this.camera.position.copy(this.currentCamPos);
    this.camera.lookAt(this.currentLookAt);

    const targetFov = this.adsBlend > 0.05 ? THREE.MathUtils.lerp(68, 48, this.adsBlend) : this.stance === 'sprinting' ? 73 : 68;
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

      // Muzzle flash fade on enemy
      if (en.muzzleFlashTimer > 0) {
        en.muzzleFlashTimer -= dt;
        (en.rig.muzzleFlash.material as THREE.MeshBasicMaterial).opacity = 0.9;
      } else {
        (en.rig.muzzleFlash.material as THREE.MeshBasicMaterial).opacity = 0;
      }

      // Hit reaction recoil tilt
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
        // Gentle patrol during briefing
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
        // Check line of sight to player
        _vecA.set(en.position.x, 1.5, en.position.z);
        _vecB.set(this.playerPos.x, this.crouchBlend > 0.5 ? 1.0 : 1.45, this.playerPos.z);
        const canSee = distToPlayer < 38 && this.hasLineOfSight(_vecA, _vecB);

        if (canSee || distToPlayer < 16) {
          en.alerted = true;
        }

        if (!en.alerted) {
          // Patrol state
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
        } else {
          // Face player smoothly
          const targetYaw = Math.atan2(dx, dz);
          let yawDiff = targetYaw - en.yaw;
          while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
          while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
          en.yaw += yawDiff * (1 - Math.exp(-8 * dt));

          const preferredMin = en.isBoss ? 8.5 : 10.5;
          const preferredMax = en.isBoss ? 15.5 : 18.5;
          const moveSpd = en.isBoss ? (en.bossPhase2Triggered ? 4.3 : 3.4) : 3.6;

          if (!canSee || distToPlayer > preferredMax) {
            en.state = 'chase';
            const nx = dx / Math.max(0.01, distToPlayer);
            const nz = dz / Math.max(0.01, distToPlayer);
            en.position.x += nx * moveSpd * dt;
            en.position.z += nz * moveSpd * dt;
            movedSpeed = moveSpd;
          } else {
            en.state = 'attack';
            // Strafe tactically
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

          // Enemy firing logic
          en.fireCooldown -= dt;
          if (canSee && en.fireCooldown <= 0) {
            this.fireEnemyWeapon(en, distToPlayer);
            if (en.isBoss) {
              if (en.burstRemaining > 0) {
                en.burstRemaining--;
                en.fireCooldown = en.bossPhase2Triggered ? 0.14 : 0.19;
              } else {
                en.burstRemaining = en.bossPhase2Triggered ? 3 : 2;
                en.fireCooldown = en.bossPhase2Triggered ? 1.05 : 1.35;
              }
            } else {
              en.fireCooldown = 1.15 + Math.random() * 0.8;
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
    en.muzzleFlashTimer = 0.06;
    this.audio.playRifleShot(false, en.isBoss);
    en.rig.muzzlePoint.getWorldPosition(_vecA);

    // Fair tactical accuracy: lower hit probability when player crouches or sprints
    const stanceMod = this.stance === 'crouching' ? 0.72 : this.stance === 'sprinting' ? 0.78 : 1.0;
    const baseHitChance = en.isBoss ? (en.bossPhase2Triggered ? 0.52 : 0.42) : 0.3;
    const distMod = THREE.MathUtils.clamp(1.2 - distToPlayer / 42, 0.35, 1.0);
    const hitsPlayer = Math.random() < baseHitChance * distMod * stanceMod;

    if (hitsPlayer) {
      _vecB.set(this.playerPos.x, this.playerPos.y + (this.crouchBlend > 0.5 ? 0.9 : 1.3), this.playerPos.z);
      const dmg = en.isBoss ? (en.bossPhase2Triggered ? 11 : 9) : 7;
      this.playerHp = Math.max(0, this.playerHp - dmg);
      this.damageFlash = 0.75;
      this.audio.playPlayerHit();

      if (this.playerHp <= 0) {
        this.phase = 'defeat';
        this.setAnnouncement('Downed in Shubra. Regroup and redeploy.', 6.0);
        if (document.pointerLockElement === this.renderer.domElement) {
          document.exitPointerLock();
        }
      }
      this.emitHud();
    } else {
      // Near-miss tracer for exciting cinematic firefight feedback
      _vecB.set(
        this.playerPos.x + (Math.random() - 0.5) * 3.0,
        this.playerPos.y + 0.8 + Math.random() * 1.4,
        this.playerPos.z + (Math.random() - 0.5) * 3.0,
      );
    }

    this.spawnTracer(_vecA, _vecB, en.isBoss ? 0xff7b3b : 0xff5a45);
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
    const aliveNonBoss = this.enemies.filter((e) => !e.isBoss && e.state !== 'downed').length;
    const boss = this.bossEntity;
    const bossActive = Boolean(boss && boss.state !== 'downed' && (this.phase === 'boss_intro' || this.phase === 'boss_fight'));

    this.onHudUpdate({
      phase: this.phase,
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
      bossName: 'El-Ameen',
      bossTitle: 'Corrupt Precinct Officer · Shubra Sector',
      bossHp: boss ? Math.round(boss.hp) : 0,
      bossMaxHp: boss ? boss.maxHp : 460,
      bossPhase: boss?.bossPhase2Triggered ? 2 : 1,
      announcement: this.announcement,
      pointerLocked: this.pointerLocked,
      fpsEstimate: this.fpsEstimate,
      isSoftwareGl: this.isSoftwareGl,
      nearbyPickupLabel: this.nearbyPickupLabel,
    });
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);

    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    document.removeEventListener('pointerlockchange', this.handlePointerLockChange);
    document.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('mouseup', this.handleMouseUp);

    const canvas = this.renderer.domElement;
    canvas.removeEventListener('mousedown', this.handleMouseDown);
    canvas.removeEventListener('contextmenu', this.handleContextMenu);
    canvas.removeEventListener('webglcontextlost', this.handleContextLost);
    canvas.removeEventListener('webglcontextrestored', this.handleContextRestored);

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

    if (this.scene.environment) {
      this.scene.environment.dispose();
    }
    this.renderer.dispose();
    if (canvas.parentElement === this.container) {
      this.container.removeChild(canvas);
    }
  }
}
