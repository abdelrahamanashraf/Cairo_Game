import * as THREE from 'three';
import { CairoMaterialLibrary } from './materials';
import { AABBCollider, CharacterArchetype, DistrictId } from './types';

export interface ArenaPickup {
  id: string;
  kind: 'medkit' | 'ammo';
  label: string;
  position: THREE.Vector3;
  mesh: THREE.Group;
  active: boolean;
  respawnTimer: number;
}

export interface DistrictArenaConfig {
  id: DistrictId;
  levelNumber: number;
  name: string;
  arabicName: string;
  skyTop: string;
  skyMid: string;
  skyHorizon: string;
  skyBottom: string;
  fogHex: number;
  fogDensity: number;
  sunColor: number;
  sunIntensity: number;
  sunPosition: [number, number, number];
  hemiSky: number;
  hemiGround: number;
  hemiIntensity: number;
  rimColor: number;
  rimIntensity: number;
  bossArchetype: CharacterArchetype;
  bossName: string;
  bossTitle: string;
  bossMaxHp: number;
  bossWeaponStyle: 'rifle' | 'shotgun' | 'sniper' | 'pulse';
  bossPhase2Announcement: string;
  waveAnnouncement: string;
  bossIntroAnnouncement: string;
  victoryAnnouncement: string;
}

export interface CairoArenaData {
  config: DistrictArenaConfig;
  root: THREE.Group;
  colliders: AABBCollider[];
  sightOccluders: THREE.Object3D[];
  pickups: ArenaPickup[];
  playerSpawn: THREE.Vector3;
  henchmanSpawns: Array<{ pos: THREE.Vector3; patrolTo: THREE.Vector3 }>;
  bossSpawn: THREE.Vector3;
  bossReinforcementSpawns: THREE.Vector3[];
  dustPoints: THREE.Points;
  dispose: () => void;
}

export const DISTRICT_ORDER: DistrictId[] = [
  'shubra',
  'old_cairo',
  'zamalek',
  'khan_el_khalili',
  'giza_plateau',
  'maadi',
  'sheikh_zayed',
  'new_capital',
];

export const DISTRICT_CONFIGS: Record<DistrictId, DistrictArenaConfig> = {
  shubra: {
    id: 'shubra',
    levelNumber: 1,
    name: 'Shubra / Downtown Precinct',
    arabicName: 'شبرا / وسط البلد',
    skyTop: '#3e536e',
    skyMid: '#8a6f72',
    skyHorizon: '#dc9353',
    skyBottom: '#a67449',
    fogHex: 0xd49158,
    fogDensity: 0.0085,
    sunColor: 0xffbe72,
    sunIntensity: 2.65,
    sunPosition: [-38, 28, -22],
    hemiSky: 0x8aa8cc,
    hemiGround: 0x7c5436,
    hemiIntensity: 0.94,
    rimColor: 0xf49b4e,
    rimIntensity: 0.68,
    bossArchetype: 'boss_el_ameen',
    bossName: 'El-Ameen',
    bossTitle: 'Corrupt Precinct Officer · Shubra Sector',
    bossMaxHp: 460,
    bossWeaponStyle: 'rifle',
    bossPhase2Announcement: 'El-Ameen Phase 2: Precinct flankers storming the courtyard!',
    waveAnnouncement: 'Level 01 — Shubra: Clear the precinct guards to draw out El-Ameen.',
    bossIntroAnnouncement: 'Boss Alert: El-Ameen steps out of the Shubra Precinct!',
    victoryAnnouncement: 'Shubra Secured: El-Ameen neutralized!',
  },
  old_cairo: {
    id: 'old_cairo',
    levelNumber: 2,
    name: 'Old Cairo / El-Sabbatiya Alleys',
    arabicName: 'مصر القديمة / السبتية',
    skyTop: '#352a3f',
    skyMid: '#7d4b44',
    skyHorizon: '#d47442',
    skyBottom: '#8c4e30',
    fogHex: 0xc26e42,
    fogDensity: 0.0105,
    sunColor: 0xff9b54,
    sunIntensity: 2.45,
    sunPosition: [34, 24, -26],
    hemiSky: 0x99736b,
    hemiGround: 0x5c3624,
    hemiIntensity: 0.88,
    rimColor: 0xffb36b,
    rimIntensity: 0.72,
    bossArchetype: 'boss_zarzour',
    bossName: 'El-Moallem Zarzour',
    bossTitle: 'Old Quarter Kingpin · El-Sabbatiya',
    bossMaxHp: 520,
    bossWeaponStyle: 'shotgun',
    bossPhase2Announcement: 'Zarzour Phase 2: Alleyway shotgun enforcers closing in!',
    waveAnnouncement: 'Level 02 — Old Cairo: Fight through the market arches to flush out Zarzour.',
    bossIntroAnnouncement: 'Boss Alert: El-Moallem Zarzour emerges from the Sabtiya archway!',
    victoryAnnouncement: 'Old Cairo Secured: El-Moallem Zarzour defeated!',
  },
  zamalek: {
    id: 'zamalek',
    levelNumber: 3,
    name: 'Zamalek — Nile Island Corniche',
    arabicName: 'الزمالك / كورنيش النيل',
    skyTop: '#2c4a6b',
    skyMid: '#6f7e91',
    skyHorizon: '#e2a362',
    skyBottom: '#8d6c4d',
    fogHex: 0xc99666,
    fogDensity: 0.0076,
    sunColor: 0xffcb82,
    sunIntensity: 2.7,
    sunPosition: [-40, 26, -18],
    hemiSky: 0x8db3d9,
    hemiGround: 0x6f5941,
    hemiIntensity: 0.98,
    rimColor: 0x7bc2e8,
    rimIntensity: 0.72,
    bossArchetype: 'boss_el_ameen',
    bossName: 'Colonel El-Sayed',
    bossTitle: 'Corniche Contraband Commander · Zamalek',
    bossMaxHp: 500,
    bossWeaponStyle: 'rifle',
    bossPhase2Announcement: 'El-Sayed Phase 2: Corniche dock enforcers flanking along the Nile!',
    waveAnnouncement: 'Level 03 — Zamalek: Sweep the Nile Corniche patrol to expose Colonel El-Sayed.',
    bossIntroAnnouncement: 'Boss Alert: Colonel El-Sayed deploys from the Gezira Embassy gate!',
    victoryAnnouncement: 'Zamalek Secured: Nile Corniche cleared!',
  },
  khan_el_khalili: {
    id: 'khan_el_khalili',
    levelNumber: 4,
    name: 'Khan El-Khalili / Al-Azhar Bazaar',
    arabicName: 'خان الخليلي / الأزهر',
    skyTop: '#2c1f38',
    skyMid: '#723f44',
    skyHorizon: '#d97b3e',
    skyBottom: '#7e4326',
    fogHex: 0xb8663b,
    fogDensity: 0.0112,
    sunColor: 0xffa452,
    sunIntensity: 2.4,
    sunPosition: [28, 20, -28],
    hemiSky: 0x9b6d67,
    hemiGround: 0x5c3420,
    hemiIntensity: 0.86,
    rimColor: 0xffbe63,
    rimIntensity: 0.8,
    bossArchetype: 'boss_zarzour',
    bossName: 'El-Hagg Mansour',
    bossTitle: 'Bazaar Black-Market Broker · Khan El-Khalili',
    bossMaxHp: 540,
    bossWeaponStyle: 'shotgun',
    bossPhase2Announcement: 'Mansour Phase 2: Bazaar ambushers rushing from the side souqs!',
    waveAnnouncement: 'Level 04 — Khan El-Khalili: Clear the lantern-lit bazaar guards.',
    bossIntroAnnouncement: 'Boss Alert: El-Hagg Mansour steps beneath the Al-Azhar arch!',
    victoryAnnouncement: 'Khan El-Khalili Secured: Black-market syndicate broken!',
  },
  giza_plateau: {
    id: 'giza_plateau',
    levelNumber: 5,
    name: 'Giza Plateau — Pyramids Overlook',
    arabicName: 'هضبة الجيزة / الأهرامات',
    skyTop: '#3a5575',
    skyMid: '#9a7a5c',
    skyHorizon: '#eba44e',
    skyBottom: '#b87d42',
    fogHex: 0xdca05a,
    fogDensity: 0.007,
    sunColor: 0xffcc70,
    sunIntensity: 2.85,
    sunPosition: [-46, 25, -34],
    hemiSky: 0xa2bce0,
    hemiGround: 0x946b3e,
    hemiIntensity: 1.0,
    rimColor: 0xffbe5c,
    rimIntensity: 0.78,
    bossArchetype: 'boss_hefny',
    bossName: 'Captain Khafre',
    bossTitle: 'Antiquities Syndicate Marksman · Giza Plateau',
    bossMaxHp: 580,
    bossWeaponStyle: 'sniper',
    bossPhase2Announcement: 'Khafre Phase 2: Desert checkpoint spotters sweeping the dunes!',
    waveAnnouncement: 'Level 05 — Giza Plateau: Neutralize the desert checkpoint guards.',
    bossIntroAnnouncement: 'Boss Alert: Captain Khafre sights in beneath the Great Pyramids!',
    victoryAnnouncement: 'Giza Plateau Secured: Antiquities smuggling ring dismantled!',
  },
  maadi: {
    id: 'maadi',
    levelNumber: 6,
    name: 'Maadi — Degla Embassies Quarter',
    arabicName: 'المعادي / دجلة',
    skyTop: '#24304a',
    skyMid: '#5f5b72',
    skyHorizon: '#d48d57',
    skyBottom: '#785741',
    fogHex: 0xaa7958,
    fogDensity: 0.0082,
    sunColor: 0xffbe7d,
    sunIntensity: 2.45,
    sunPosition: [36, 22, -20],
    hemiSky: 0x7c97ba,
    hemiGround: 0x5c4a38,
    hemiIntensity: 0.94,
    rimColor: 0xf0ad6a,
    rimIntensity: 0.72,
    bossArchetype: 'boss_el_ameen',
    bossName: 'The Degla Handler',
    bossTitle: 'Syndicate Logistics Chief · Maadi Degla',
    bossMaxHp: 550,
    bossWeaponStyle: 'rifle',
    bossPhase2Announcement: 'Degla Handler Phase 2: Convoy security rushing the palm boulevard!',
    waveAnnouncement: 'Level 06 — Maadi Degla: Breach the tree-lined embassy security cordon.',
    bossIntroAnnouncement: 'Boss Alert: The Degla Handler emerges from the armored convoy!',
    victoryAnnouncement: 'Maadi Secured: Syndicate logistics network shut down!',
  },
  sheikh_zayed: {
    id: 'sheikh_zayed',
    levelNumber: 7,
    name: 'Sheikh Zayed Compound',
    arabicName: 'الشيخ زايد',
    skyTop: '#1e2c44',
    skyMid: '#4c546e',
    skyHorizon: '#c98863',
    skyBottom: '#6e5848',
    fogHex: 0x9e745c,
    fogDensity: 0.0072,
    sunColor: 0xffcba0,
    sunIntensity: 2.35,
    sunPosition: [-42, 22, 18],
    hemiSky: 0x7a96ba,
    hemiGround: 0x69594a,
    hemiIntensity: 0.96,
    rimColor: 0xffd59e,
    rimIntensity: 0.75,
    bossArchetype: 'boss_hefny',
    bossName: 'El-Basha El-Hefny',
    bossTitle: 'Compound Baron · Sheikh Zayed Villa',
    bossMaxHp: 590,
    bossWeaponStyle: 'sniper',
    bossPhase2Announcement: 'El-Hefny Phase 2: Armored compound security converging!',
    waveAnnouncement: 'Level 07 — Sheikh Zayed: Breach the villa courtyard and watch for laser sights.',
    bossIntroAnnouncement: 'Boss Alert: El-Basha El-Hefny locks on with his compound DMR!',
    victoryAnnouncement: 'Sheikh Zayed Secured: El-Basha El-Hefny neutralized!',
  },
  new_capital: {
    id: 'new_capital',
    levelNumber: 8,
    name: 'New Administrative Capital',
    arabicName: 'العاصمة الإدارية الجديدة',
    skyTop: '#172236',
    skyMid: '#374863',
    skyHorizon: '#cf9b5a',
    skyBottom: '#695742',
    fogHex: 0x8c7761,
    fogDensity: 0.0066,
    sunColor: 0xffe0a8,
    sunIntensity: 2.6,
    sunPosition: [30, 32, -30],
    hemiSky: 0x89a8d0,
    hemiGround: 0x5c5347,
    hemiIntensity: 1.0,
    rimColor: 0x6ec3f0,
    rimIntensity: 0.72,
    bossArchetype: 'boss_architect',
    bossName: 'The Syndicate Architect',
    bossTitle: 'Mastermind · Iconic Tower Plaza',
    bossMaxHp: 640,
    bossWeaponStyle: 'pulse',
    bossPhase2Announcement: 'Architect Phase 2: Syndicate shock troopers deployed to the plaza!',
    waveAnnouncement: 'Level 08 — New Capital: Clear the Iconic Tower plaza guards.',
    bossIntroAnnouncement: 'Final Boss: The Syndicate Architect descends with tactical drones!',
    victoryAnnouncement: 'Greater Cairo Liberated: The Syndicate Architect is down!',
  },
};

export function buildCairoArena(districtId: DistrictId, mats: CairoMaterialLibrary): CairoArenaData {
  const config = DISTRICT_CONFIGS[districtId];
  const root = new THREE.Group();
  root.name = `cairo_arena_${districtId}`;

  const colliders: AABBCollider[] = [];
  const sightOccluders: THREE.Object3D[] = [];
  const pickups: ArenaPickup[] = [];
  const ownedGeometries: THREE.BufferGeometry[] = [];
  const ownedMaterials: THREE.Material[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    ownedGeometries.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    ownedMaterials.push(m);
    return m;
  };

  const registerBox = (
    id: string,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    material: THREE.Material,
    options?: {
      collide?: boolean;
      occlude?: boolean;
      isCover?: boolean;
      castShadow?: boolean;
      receiveShadow?: boolean;
    },
  ): THREE.Mesh => {
    const geo = trackGeo(new THREE.BoxGeometry(w, h, d));
    const mesh = new THREE.Mesh(geo, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = options?.castShadow ?? true;
    mesh.receiveShadow = options?.receiveShadow ?? true;
    root.add(mesh);

    if (options?.collide !== false) {
      colliders.push({
        id,
        minX: x - w / 2,
        maxX: x + w / 2,
        minY: y - h / 2,
        maxY: y + h / 2,
        minZ: z - d / 2,
        maxZ: z + d / 2,
        isCover: options?.isCover,
        blocksSight: options?.occlude !== false,
      });
    }
    if (options?.occlude !== false) {
      sightOccluders.push(mesh);
    }
    return mesh;
  };

  // --- Realistic Sculpted Multi-Part Cairo Sedan Taxi (Clearcoat + Chrome + Headlights + Curved Cabin) ---
  const addCairoTaxi = (id: string, x: number, z: number, rotY: number) => {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = rotY;

    // Extruded aerodynamic sedan side profile (hood -> windshield -> roof -> rear deck)
    const carProfile = new THREE.Shape();
    carProfile.moveTo(-2.15, 0.32);
    carProfile.lineTo(2.15, 0.32);
    carProfile.lineTo(2.18, 0.72);
    carProfile.lineTo(1.22, 0.84);
    carProfile.lineTo(0.75, 1.38);
    carProfile.lineTo(-0.82, 1.38);
    carProfile.lineTo(-1.35, 0.86);
    carProfile.lineTo(-2.16, 0.74);
    carProfile.closePath();

    const bodyGeo = trackGeo(
      new THREE.ExtrudeGeometry(carProfile, {
        depth: 1.72,
        bevelEnabled: true,
        bevelThickness: 0.08,
        bevelSize: 0.06,
        bevelSegments: 2,
      }),
    );
    bodyGeo.translate(0, 0, -0.86);
    const body = new THREE.Mesh(bodyGeo, mats.taxiWhite);
    body.rotation.y = Math.PI / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    g.add(body);

    // Classic Cairo Black/White Lower Door Band & Bumpers
    const band = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.9, 0.3, 4.38)), mats.taxiBlack);
    band.position.y = 0.44;
    band.castShadow = true;
    g.add(band);

    // Tinted Wraparound Glass Cabin Strip
    const glass = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.66, 0.44, 2.02)), mats.carGlass);
    glass.position.set(0, 1.1, -0.04);
    g.add(glass);

    // Chrome Front Grille & Bumpers
    const grille = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.12, 0.24, 0.08)), mats.carChrome);
    grille.position.set(0, 0.58, 2.2);
    g.add(grille);

    // Glowing Headlights & Red Taillights
    const hlGeo = trackGeo(new THREE.BoxGeometry(0.32, 0.14, 0.08));
    [-0.64, 0.64].forEach((lx) => {
      const hl = new THREE.Mesh(hlGeo, mats.headlightGlow);
      hl.position.set(lx, 0.62, 2.2);
      const tl = new THREE.Mesh(hlGeo, mats.taillightGlow);
      tl.position.set(lx, 0.64, -2.2);
      g.add(hl, tl);
    });

    // Side Mirrors
    const mirrorGeo = trackGeo(new THREE.BoxGeometry(0.18, 0.1, 0.12));
    [-0.98, 0.98].forEach((mx) => {
      const mirror = new THREE.Mesh(mirrorGeo, mats.taxiBlack);
      mirror.position.set(mx, 0.94, 0.72);
      g.add(mirror);
    });

    // Illuminated Yellow TAXI Roof Sign
    const sign = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.58, 0.17, 0.24)), mats.taxiRoofSign);
    sign.position.set(0, 1.5, 0.05);
    g.add(sign);

    // 4 Sculpted Tires + Chrome Alloy Rims
    const tireGeo = trackGeo(new THREE.CylinderGeometry(0.35, 0.35, 0.26, 14));
    const rimGeo = trackGeo(new THREE.CylinderGeometry(0.2, 0.2, 0.28, 10));
    [
      [-0.86, 1.32],
      [0.86, 1.32],
      [-0.86, -1.32],
      [0.86, -1.32],
    ].forEach(([wx, wz]) => {
      const tire = new THREE.Mesh(tireGeo, mats.taxiBlack);
      tire.rotation.z = Math.PI / 2;
      tire.position.set(wx, 0.35, wz);
      const rim = new THREE.Mesh(rimGeo, mats.carChrome);
      rim.rotation.z = Math.PI / 2;
      rim.position.set(wx, 0.35, wz);
      g.add(tire, rim);
    });

    // Grounded soft contact shadow
    const sh = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(2.7, 5.1)), mats.contactShadow);
    sh.rotation.x = -Math.PI / 2;
    sh.position.y = 0.025;
    g.add(sh);

    root.add(g);
    sightOccluders.push(body, band);

    const isRotated = Math.abs(Math.sin(rotY)) > 0.65;
    const hw = isRotated ? 2.25 : 1.05;
    const hd = isRotated ? 1.05 : 2.25;
    colliders.push({
      id,
      minX: x - hw,
      maxX: x + hw,
      minY: 0,
      maxY: 1.55,
      minZ: z - hd,
      maxZ: z + hd,
      isCover: true,
      blocksSight: true,
    });
  };

  // --- Realistic Armored Black SUV (Sheikh Zayed & New Capital) ---
  const addArmoredSuv = (id: string, x: number, z: number, rotY: number) => {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = rotY;

    const suvShape = new THREE.Shape();
    suvShape.moveTo(-2.35, 0.42);
    suvShape.lineTo(2.35, 0.42);
    suvShape.lineTo(2.38, 1.02);
    suvShape.lineTo(1.2, 1.12);
    suvShape.lineTo(0.85, 1.82);
    suvShape.lineTo(-2.15, 1.82);
    suvShape.lineTo(-2.35, 1.1);
    suvShape.closePath();

    const bodyGeo = trackGeo(
      new THREE.ExtrudeGeometry(suvShape, {
        depth: 1.96,
        bevelEnabled: true,
        bevelThickness: 0.09,
        bevelSize: 0.07,
        bevelSegments: 2,
      }),
    );
    bodyGeo.translate(0, 0, -0.98);
    const body = new THREE.Mesh(bodyGeo, mats.suvBlack);
    body.rotation.y = Math.PI / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    g.add(body);

    const windows = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.9, 0.52, 2.75)), mats.carGlass);
    windows.position.set(0, 1.44, -0.42);
    g.add(windows);

    const grille = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.36, 0.36, 0.1)), mats.carChrome);
    grille.position.set(0, 0.78, 2.42);
    g.add(grille);

    const hlGeo = trackGeo(new THREE.BoxGeometry(0.36, 0.16, 0.08));
    [-0.78, 0.78].forEach((lx) => {
      const hl = new THREE.Mesh(hlGeo, mats.headlightGlow);
      hl.position.set(lx, 0.82, 2.42);
      const tl = new THREE.Mesh(hlGeo, mats.taillightGlow);
      tl.position.set(lx, 0.88, -2.42);
      g.add(hl, tl);
    });

    const tireGeo = trackGeo(new THREE.CylinderGeometry(0.43, 0.43, 0.32, 14));
    const rimGeo = trackGeo(new THREE.CylinderGeometry(0.26, 0.26, 0.34, 10));
    [
      [-0.98, 1.45],
      [0.98, 1.45],
      [-0.98, -1.45],
      [0.98, -1.45],
    ].forEach(([wx, wz]) => {
      const tire = new THREE.Mesh(tireGeo, mats.taxiBlack);
      tire.rotation.z = Math.PI / 2;
      tire.position.set(wx, 0.43, wz);
      const rim = new THREE.Mesh(rimGeo, mats.carChrome);
      rim.rotation.z = Math.PI / 2;
      rim.position.set(wx, 0.43, wz);
      g.add(tire, rim);
    });

    const sh = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(3.0, 5.6)), mats.contactShadow);
    sh.rotation.x = -Math.PI / 2;
    sh.position.y = 0.025;
    g.add(sh);

    root.add(g);
    sightOccluders.push(body);

    const isRotated = Math.abs(Math.sin(rotY)) > 0.65;
    const hw = isRotated ? 2.45 : 1.15;
    const hd = isRotated ? 1.15 : 2.45;
    colliders.push({
      id,
      minX: x - hw,
      maxX: x + hw,
      minY: 0,
      maxY: 1.9,
      minZ: z - hd,
      maxZ: z + hd,
      isCover: true,
      blocksSight: true,
    });
  };

  // --- Sculpted Date Palm with Segmented Curved Trunk & Drooping Frond Crown ---
  const addDatePalm = (x: number, z: number, height = 7.4) => {
    const g = new THREE.Group();
    g.position.set(x, 0, z);

    const trunkCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.22, height * 0.45, 0.14),
      new THREE.Vector3(0.08, height, -0.1),
    ]);
    const trunkGeo = trackGeo(new THREE.TubeGeometry(trunkCurve, 10, 0.24, 8, false));
    const trunk = new THREE.Mesh(trunkGeo, mats.palmTrunk);
    trunk.castShadow = true;
    g.add(trunk);

    const crownOrigin = new THREE.Vector3(0.08, height, -0.1);
    const frondShape = new THREE.Shape();
    frondShape.moveTo(0, 0);
    frondShape.quadraticCurveTo(0.45, 1.3, 0, 2.7);
    frondShape.quadraticCurveTo(-0.45, 1.3, 0, 0);
    const frondGeo = trackGeo(new THREE.ShapeGeometry(frondShape, 6));

    for (let i = 0; i < 9; i++) {
      const ang = (i / 9) * Math.PI * 2;
      const frond = new THREE.Mesh(frondGeo, mats.palmFrond);
      frond.position.copy(crownOrigin);
      frond.rotation.order = 'YXZ';
      frond.rotation.y = ang;
      frond.rotation.x = 1.05 + (i % 2) * 0.22;
      frond.castShadow = true;
      g.add(frond);
    }
    root.add(g);
  };

  // --- Concrete Tactical Cover Barrier ---
  const addBarrier = (id: string, x: number, z: number, rotY = 0) => {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = rotY;
    // Trapezoidal Jersey profile
    const shape = new THREE.Shape();
    shape.moveTo(-0.4, 0);
    shape.lineTo(0.4, 0);
    shape.lineTo(0.22, 1.18);
    shape.lineTo(-0.22, 1.18);
    shape.closePath();
    const geo = trackGeo(new THREE.ExtrudeGeometry(shape, { depth: 3.1, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 1 }));
    geo.translate(0, 0, -1.55);
    const mesh = new THREE.Mesh(geo, mats.concreteBarrier);
    mesh.rotation.y = Math.PI / 2;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    g.add(mesh);
    root.add(g);
    sightOccluders.push(mesh);

    const isRot = Math.abs(Math.sin(rotY)) > 0.65;
    const hw = isRot ? 0.45 : 1.65;
    const hd = isRot ? 1.65 : 0.45;
    colliders.push({
      id,
      minX: x - hw,
      maxX: x + hw,
      minY: 0,
      maxY: 1.25,
      minZ: z - hd,
      maxZ: z + hd,
      isCover: true,
      blocksSight: true,
    });
  };

  // --- Stacked Supply Crates ---
  const addCrateCluster = (id: string, x: number, z: number) => {
    registerBox(`${id}_a`, x, 0.55, z, 1.25, 1.1, 1.25, mats.crateWood, { isCover: true });
    registerBox(`${id}_b`, x + 1.2, 0.48, z + 0.2, 1.05, 0.96, 1.05, mats.crateWood, { isCover: true });
    registerBox(`${id}_c`, x + 0.45, 1.48, z + 0.05, 0.9, 0.84, 0.9, mats.crateWood, { collide: false, isCover: true });
  };

  // --- Architectural Balcony + Awning Props ---
  const addCairoBuilding = (
    id: string,
    x: number,
    z: number,
    w: number,
    h: number,
    d: number,
    facadeMat: THREE.Material,
    facing: 'east' | 'west' | 'south',
    includeAwning = true,
  ) => {
    registerBox(id, x, h / 2, z, w, h, d, facadeMat);

    // Roof cornice parapet + Cairo cylindrical water tank
    registerBox(`${id}_cornice`, x, h + 0.25, z, w + 0.45, 0.5, d + 0.45, mats.sidewalk, { collide: false, occlude: false });
    const tank = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.65, 0.65, 1.35, 10)), mats.sidewalk);
    tank.position.set(x - w * 0.18, h + 1.15, z);
    root.add(tank);

    // Wrought-iron balconies on upper stories
    const stories = Math.min(3, Math.floor(h / 4));
    for (let s = 1; s <= stories; s++) {
      const by = s * 3.6;
      const bx = facing === 'east' ? x + w / 2 + 0.55 : facing === 'west' ? x - w / 2 - 0.55 : x;
      const bz = facing === 'south' ? z + d / 2 + 0.55 : z;
      const bw = facing === 'south' ? Math.min(4.2, w * 0.55) : 1.1;
      const bd = facing === 'south' ? 1.1 : Math.min(4.2, d * 0.55);

      const slab = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(bw, 0.18, bd)), mats.sidewalk);
      slab.position.set(bx, by, bz);
      slab.castShadow = true;
      root.add(slab);

      const rail = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(bw + 0.04, 0.85, bd + 0.04)), mats.wroughtIron);
      rail.position.set(bx, by + 0.5, bz);
      root.add(rail);
    }

    if (includeAwning) {
      const ax = facing === 'east' ? x + w / 2 + 1.05 : facing === 'west' ? x - w / 2 - 1.05 : x;
      const az = facing === 'south' ? z + d / 2 + 1.05 : z;
      const aw = facing === 'south' ? Math.min(6.4, w * 0.72) : 2.1;
      const ad = facing === 'south' ? 2.1 : Math.min(6.4, d * 0.72);
      const awning = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(aw, 0.1, ad)), mats.awningStripe);
      awning.position.set(ax, 3.15, az);
      if (facing === 'east') awning.rotation.z = -0.24;
      else if (facing === 'west') awning.rotation.z = 0.24;
      else awning.rotation.x = 0.24;
      awning.castShadow = true;
      root.add(awning);
    }
  };

  // --- Field Pickups (Medkit & Ammo Crate) ---
  const addPickup = (id: string, kind: 'medkit' | 'ammo', x: number, z: number) => {
    const group = new THREE.Group();
    group.position.set(x, 0.55, z);

    const baseMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: kind === 'medkit' ? 0xdc3832 : 0xd99b3c,
        emissive: kind === 'medkit' ? 0x6b1412 : 0x5c3c0e,
        emissiveIntensity: 0.55,
        roughness: 0.32,
        metalness: 0.25,
      }),
    );
    const crossMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xf4f4f6, roughness: 0.25 }));
    const box = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.68, 0.42, 0.52)), baseMat);
    box.castShadow = true;
    group.add(box);

    if (kind === 'medkit') {
      const c1 = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.28, 0.08, 0.56)), crossMat);
      const c2 = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.08, 0.28, 0.56)), crossMat);
      group.add(c1, c2);
    } else {
      const strap = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.72, 0.1, 0.14)), crossMat);
      group.add(strap);
    }

    const ringMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: kind === 'medkit' ? 0xff5a52 : 0xffcb66,
        transparent: true,
        opacity: 0.65,
        side: THREE.DoubleSide,
      }),
    );
    const ring = new THREE.Mesh(trackGeo(new THREE.RingGeometry(0.55, 0.72, 20)), ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -0.5;
    group.add(ring);

    root.add(group);
    pickups.push({
      id,
      kind,
      label: kind === 'medkit' ? 'Field Medkit (+40 HP)' : 'Rifle Ammo Crate (+60)',
      position: new THREE.Vector3(x, 0, z),
      mesh: group,
      active: true,
      respawnTimer: 0,
    });
  };

  // --- Street Lamp / Warm Floodlight Post ---
  const addStreetLantern = (x: number, z: number, height = 5.4) => {
    const pole = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.07, 0.1, height, 8)), mats.wroughtIron);
    pole.position.set(x, height / 2, z);
    const lamp = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.24, 10, 8)), mats.headlightGlow);
    lamp.position.set(x, height + 0.12, z);
    root.add(pole, lamp);
  };

  // =========================================================================
  // DISTRICT-SPECIFIC GROUND, ARCHITECTURE, LANDMARKS & TACTICAL LAYOUTS
  // =========================================================================

  if (districtId === 'shubra') {
    // 1. Ground: Dusty Cairo Asphalt + Raised Precinct Sandstone Courtyard + Sidewalks
    const road = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(78, 84)), mats.asphalt);
    road.rotation.x = -Math.PI / 2;
    road.receiveShadow = true;
    root.add(road);

    const courtyard = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(34, 0.16, 20)), mats.courtyardStone);
    courtyard.position.set(0, 0.08, -14);
    courtyard.receiveShadow = true;
    root.add(courtyard);

    [-18.5, 18.5].forEach((sx) => {
      const sw = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(4.2, 0.2, 58)), mats.sidewalk);
      sw.position.set(sx, 0.1, 4);
      sw.receiveShadow = true;
      root.add(sw);
    });

    // 2. North Landmark: Shubra Precinct Fortress with Arched Column Portico
    registerBox('precinct_left', -13.5, 6.5, -26.5, 17, 13, 8, mats.precinctFacade);
    registerBox('precinct_right', 13.5, 6.5, -26.5, 17, 13, 8, mats.precinctFacade);
    registerBox('precinct_bridge', 0, 10.0, -26.5, 10, 6, 8, mats.precinctFacade);
    registerBox('precinct_backwall', 0, 5.5, -30.5, 12, 11, 2, mats.precinctFacade);
    // Portico stone columns flanking the arched boss exit
    [-5.2, -2.8, 2.8, 5.2].forEach((cx) => {
      const col = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.36, 0.42, 6.8, 12)), mats.sidewalk);
      col.position.set(cx, 3.4, -22.2);
      col.castShadow = true;
      root.add(col);
    });
    // Precinct crest gold banner lintel
    const lintel = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(11.6, 0.85, 0.5)), mats.taxiRoofSign);
    lintel.position.set(0, 7.1, -22.3);
    root.add(lintel);

    // 3. West & East Shubra Apartment Corridors
    addCairoBuilding('w1', -26.5, -10, 11, 16, 16, mats.buildingOchre, 'east');
    addCairoBuilding('w2', -26.5, 9, 11, 14, 18, mats.buildingTerracotta, 'east');
    addCairoBuilding('w3', -26.5, 25, 11, 13, 12, mats.buildingSandstone, 'east', false);

    addCairoBuilding('e1', 26.5, -10, 11, 15, 16, mats.buildingSandstone, 'west');
    addCairoBuilding('e2', 26.5, 9, 11, 17, 18, mats.buildingOchre, 'west');
    addCairoBuilding('e3', 26.5, 25, 11, 13, 12, mats.buildingTerracotta, 'west', false);

    // South enclosure
    registerBox('south_wall_l', -14, 3.5, 31, 22, 7, 3, mats.buildingSandstone);
    registerBox('south_wall_r', 14, 3.5, 31, 22, 7, 3, mats.buildingOchre);
    registerBox('south_gate', 0, 1.4, 31.2, 8, 2.8, 1.5, mats.concreteBarrier);

    // 4. Sculpted Cairo Taxis, Jersey Barriers & Crates (Tactical Cover)
    addCairoTaxi('taxi_center_l', -6.8, 6.2, 0.24);
    addCairoTaxi('taxi_center_r', 7.4, -2.5, -0.35);
    addCairoTaxi('taxi_south', 5.2, 16.5, 1.42);

    addBarrier('bar_n1', -9.2, -10.5, 0.18);
    addBarrier('bar_n2', 9.2, -10.5, -0.18);
    addBarrier('bar_mid', 0.2, 1.5, 0.05);
    addBarrier('bar_south', -6.5, 15.5, 0.1);

    addCrateCluster('crate_w', -13.2, -2.5);
    addCrateCluster('crate_e', 13.0, 9.5);

    // 5. Palms & Street Lamps
    addDatePalm(-16.2, -18.5, 8.2);
    addDatePalm(16.2, -18.5, 7.6);
    addDatePalm(-16.2, 17.5, 7.2);
    addDatePalm(16.2, 18.2, 7.8);
    addStreetLantern(-16.2, -4);
    addStreetLantern(16.2, -4);
    addStreetLantern(-16.2, 11);
    addStreetLantern(16.2, 11);

    // 6. Distant Greater Cairo Skyline Silhouette (Cairo Tower + Minaret)
    const cairoTower = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(1.5, 2.4, 48, 12)), mats.distantSkyline);
    cairoTower.position.set(28, 24, -76);
    const towerCrown = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(2.8, 1.6, 5.5, 12)), mats.distantSkyline);
    towerCrown.position.set(28, 49, -76);
    const minaret = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.85, 1.35, 32, 10)), mats.distantSkyline);
    minaret.position.set(-30, 16, -68);
    const dome = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(4.2, 12, 10, 0, Math.PI * 2, 0, Math.PI / 2)), mats.distantSkyline);
    dome.position.set(-25, 10, -68);
    root.add(cairoTower, towerCrown, minaret, dome);
  } else if (districtId === 'old_cairo') {
    // OLD CAIRO / EL-SABBATIONA ALLEYWAYS
    const ground = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(78, 84)), mats.courtyardStone);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    root.add(ground);

    // North Old Stone Gate Archway
    registerBox('arch_l', -12.5, 6.2, -25.5, 17, 12.4, 7, mats.buildingOldBrick);
    registerBox('arch_r', 12.5, 6.2, -25.5, 17, 12.4, 7, mats.buildingOldBrick);
    registerBox('arch_top', 0, 9.6, -25.5, 10, 5.6, 7, mats.buildingOldBrick);
    registerBox('arch_back', 0, 5.2, -29.5, 12, 10.4, 2, mats.buildingTerracotta);

    // Overhead Historic Cross-Alley Stone Bridges
    registerBox('bridge_1', 0, 8.2, -6, 36, 2.2, 3.8, mats.buildingOldBrick, { collide: false });
    registerBox('bridge_2', 0, 8.6, 11, 36, 2.2, 3.6, mats.buildingSandstone, { collide: false });

    // Hanging Bazaar Cloth Canopies across the main lane
    [-12, 2, 14].forEach((cz) => {
      const cloth = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(24, 3.6)), mats.awningStripe);
      cloth.rotation.x = Math.PI / 2;
      cloth.position.set(0, 5.6, cz);
      root.add(cloth);
    });

    // Tight Old Cairo Brick & Terracotta Flank Buildings
    addCairoBuilding('oc_w1', -24.5, -10, 12, 15, 16, mats.buildingOldBrick, 'east');
    addCairoBuilding('oc_w2', -24.5, 9, 12, 16, 18, mats.buildingTerracotta, 'east');
    addCairoBuilding('oc_w3', -24.5, 25, 12, 13, 12, mats.buildingOldBrick, 'east', false);

    addCairoBuilding('oc_e1', 24.5, -10, 12, 16, 16, mats.buildingTerracotta, 'west');
    addCairoBuilding('oc_e2', 24.5, 9, 12, 14, 18, mats.buildingOldBrick, 'west');
    addCairoBuilding('oc_e3', 24.5, 25, 12, 13, 12, mats.buildingSandstone, 'west', false);

    registerBox('oc_south_l', -14, 4, 31, 22, 8, 3, mats.buildingOldBrick);
    registerBox('oc_south_r', 14, 4, 31, 22, 8, 3, mats.buildingOldBrick);

    // Dense Market Crates, Columns & One Parked Taxi
    addCrateCluster('oc_c1', -7.2, -9.5);
    addCrateCluster('oc_c2', 7.8, -8.5);
    addCrateCluster('oc_c3', -1.8, 3.5);
    addCrateCluster('oc_c4', 9.2, 12.0);
    addCrateCluster('oc_c5', -9.8, 13.5);
    addCairoTaxi('oc_taxi', 5.4, 2.5, -0.5);
    addBarrier('oc_bar1', -5.5, -1.5, 0.35);
    addBarrier('oc_bar2', 0.5, 15.5, -0.1);

    // Warm Hanging Lanterns & Historic Minaret Skyline
    addStreetLantern(-12, -14, 4.8);
    addStreetLantern(12, -14, 4.8);
    addStreetLantern(-12, 6, 4.8);
    addStreetLantern(12, 6, 4.8);
    addDatePalm(-15, -18, 7.0);
    addDatePalm(15, 18, 7.2);

    const m1 = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.9, 1.5, 38, 10)), mats.distantSkyline);
    m1.position.set(-22, 19, -64);
    const m2 = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.8, 1.3, 34, 10)), mats.distantSkyline);
    m2.position.set(24, 17, -60);
    root.add(m1, m2);
  } else if (districtId === 'zamalek') {
    // ZAMALEK — NILE ISLAND CORNICHE PROMENADE
    const road = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(78, 84)), mats.asphalt);
    road.rotation.x = -Math.PI / 2;
    road.receiveShadow = true;
    root.add(road);

    // West Nile Waterfront Strip & Stone Corniche Balustrade
    const nileWater = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(24, 88)), mats.waterPool);
    nileWater.rotation.x = -Math.PI / 2;
    nileWater.position.set(-30, 0.03, 0);
    root.add(nileWater);

    const promenade = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(5.6, 0.24, 66)), mats.sidewalk);
    promenade.position.set(-16.5, 0.12, 2);
    promenade.receiveShadow = true;
    root.add(promenade);
    registerBox('zam_corniche_wall', -19.2, 0.9, 2, 0.9, 1.8, 66, mats.sidewalk, { isCover: true });

    // North Gezira Embassy Pavilion Gate
    registerBox('zam_n_l', -13.5, 6.4, -26.5, 17, 12.8, 8, mats.villaLimestone);
    registerBox('zam_n_r', 13.5, 6.4, -26.5, 17, 12.8, 8, mats.villaLimestone);
    registerBox('zam_n_bridge', 0, 9.8, -26.5, 10, 6, 8, mats.villaLimestone);
    registerBox('zam_n_back', 0, 5.4, -30.5, 12, 10.8, 2, mats.villaLimestone);

    // East Art-Deco Zamalek Apartment Facades
    addCairoBuilding('zam_e1', 25.5, -10, 11, 16, 16, mats.villaLimestone, 'west');
    addCairoBuilding('zam_e2', 25.5, 9, 11, 18, 18, mats.buildingOchre, 'west');
    addCairoBuilding('zam_e3', 25.5, 25, 11, 14, 12, mats.buildingSandstone, 'west', false);

    registerBox('zam_south_l', -14, 3.2, 31, 22, 6.4, 2.5, mats.villaLimestone);
    registerBox('zam_south_r', 14, 3.2, 31, 22, 6.4, 2.5, mats.villaLimestone);

    // Taxis, Diplomat SUVs & Corniche Cover
    addArmoredSuv('zam_suv1', -6.2, -5.5, 0.15);
    addCairoTaxi('zam_taxi1', 7.2, 5.2, -0.22);
    addCairoTaxi('zam_taxi2', -5.4, 14.5, 0.3);
    addBarrier('zam_b1', 8.5, -11.5, -0.2);
    addBarrier('zam_b2', 0.4, 2.2, 0.08);
    addCrateCluster('zam_c1', -11.8, 7.5);
    addCrateCluster('zam_c2', 13.2, -3.5);

    // Lush Nile-side Palms & Lamps
    [-14.8, 16.5].forEach((px) => {
      [-17, -5, 7, 19].forEach((pz) => addDatePalm(px, pz, 8.8));
      [-11, 1, 13].forEach((lz) => addStreetLantern(px, lz, 5.8));
    });

    // Close-up Iconic Cairo Tower Silhouette directly across Gezira Island
    const towerShaft = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(2.1, 3.2, 62, 14)), mats.distantSkyline);
    towerShaft.position.set(-14, 31, -66);
    const towerDeck = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(3.8, 2.2, 6.5, 14)), mats.distantSkyline);
    towerDeck.position.set(-14, 63, -66);
    const spire = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.18, 0.35, 14, 8)), mats.distantSkyline);
    spire.position.set(-14, 72, -66);
    root.add(towerShaft, towerDeck, spire);
  } else if (districtId === 'khan_el_khalili') {
    // KHAN EL-KHALILI / AL-AZHAR HISTORIC BAZAAR
    const stone = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(78, 84)), mats.courtyardStone);
    stone.rotation.x = -Math.PI / 2;
    stone.receiveShadow = true;
    root.add(stone);

    // Fatimid Carved North Archway Gate
    registerBox('kk_arch_l', -12.5, 6.5, -25.5, 17, 13, 7, mats.buildingSandstone);
    registerBox('kk_arch_r', 12.5, 6.5, -25.5, 17, 13, 7, mats.buildingSandstone);
    registerBox('kk_arch_top', 0, 10.0, -25.5, 10, 6, 7, mats.buildingSandstone);
    registerBox('kk_arch_back', 0, 5.5, -29.5, 12, 11, 2, mats.buildingOldBrick);

    // Overhead Bazaar Canopies & Lantern Beams
    [-15, -5, 5, 15].forEach((cz) => {
      const cloth = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(25, 4.0)), mats.awningStripe);
      cloth.rotation.x = Math.PI / 2;
      cloth.position.set(0, 5.4, cz);
      root.add(cloth);
    });

    // Dense Fatimid Bazaar Shopfronts
    addCairoBuilding('kk_w1', -23.5, -10, 12, 14, 16, mats.buildingSandstone, 'east');
    addCairoBuilding('kk_w2', -23.5, 9, 12, 15, 18, mats.buildingOldBrick, 'east');
    addCairoBuilding('kk_w3', -23.5, 25, 12, 13, 12, mats.buildingTerracotta, 'east', false);

    addCairoBuilding('kk_e1', 23.5, -10, 12, 15, 16, mats.buildingOldBrick, 'west');
    addCairoBuilding('kk_e2', 23.5, 9, 12, 14, 18, mats.buildingSandstone, 'west');
    addCairoBuilding('kk_e3', 23.5, 25, 12, 13, 12, mats.buildingTerracotta, 'west', false);

    registerBox('kk_south_l', -14, 3.8, 31, 22, 7.6, 3, mats.buildingSandstone);
    registerBox('kk_south_r', 14, 3.8, 31, 22, 7.6, 3, mats.buildingSandstone);

    // Tight Souq Spice/Carpet Crate Lanes & Stone Planters
    addCrateCluster('kk_c1', -7.8, -11.5);
    addCrateCluster('kk_c2', 7.5, -10.0);
    addCrateCluster('kk_c3', -5.6, 1.5);
    addCrateCluster('kk_c4', 5.8, 3.2);
    addCrateCluster('kk_c5', -8.8, 12.8);
    addCrateCluster('kk_c6', 8.2, 13.5);
    addBarrier('kk_b1', 0, -4.5, 0.08);
    addBarrier('kk_b2', 0.2, 11.2, -0.1);

    // Dense Warm Bazaar Lanterns
    [-11.5, 11.5].forEach((lx) => {
      [-15, -5, 5, 15].forEach((lz) => addStreetLantern(lx, lz, 4.6));
    });

    // Al-Azhar Twin Minarets & Mosque Dome in North Horizon
    [-16, 16].forEach((mx) => {
      const m = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.95, 1.45, 42, 10)), mats.distantSkyline);
      m.position.set(mx, 21, -62);
      root.add(m);
    });
    const azharDome = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(7.2, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2)),
      mats.distantSkyline,
    );
    azharDome.position.set(0, 12, -66);
    root.add(azharDome);
  } else if (districtId === 'giza_plateau') {
    // GIZA PLATEAU — GREAT PYRAMIDS OVERLOOK CHECKPOINT
    const sandFloor = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(92, 92)), mats.courtyardStone);
    sandFloor.rotation.x = -Math.PI / 2;
    sandFloor.receiveShadow = true;
    root.add(sandFloor);

    const centralRoad = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(18, 0.07, 64)), mats.asphalt);
    centralRoad.position.set(0, 0.035, 3);
    centralRoad.receiveShadow = true;
    root.add(centralRoad);

    // North Sandstone Antiquities Checkpoint Gatehouse
    registerBox('giza_n_l', -14.5, 4.6, -26, 17, 9.2, 7.5, mats.buildingSandstone);
    registerBox('giza_n_r', 14.5, 4.6, -26, 17, 9.2, 7.5, mats.buildingSandstone);
    registerBox('giza_n_top', 0, 7.2, -26, 12, 4.2, 7.5, mats.buildingSandstone);
    registerBox('giza_n_back', 0, 4.5, -30, 14, 9, 2, mats.buildingSandstone);

    // Low Fortified Sandstone Plateau Perimeter Walls (keeps Pyramids visible!)
    registerBox('giza_w1', -26.5, 3.6, -6, 6, 7.2, 24, mats.buildingSandstone);
    registerBox('giza_w2', -26.5, 3.2, 18, 6, 6.4, 22, mats.buildingOchre);
    registerBox('giza_e1', 26.5, 3.6, -6, 6, 7.2, 24, mats.buildingSandstone);
    registerBox('giza_e2', 26.5, 3.2, 18, 6, 6.4, 22, mats.buildingOchre);
    registerBox('giza_s_l', -14, 2.5, 31, 22, 5, 2.5, mats.buildingSandstone);
    registerBox('giza_s_r', 14, 2.5, 31, 22, 5, 2.5, mats.buildingSandstone);

    // Desert Checkpoint Tactical Cover (Armored SUVs, Jersey Barriers, Crates)
    addArmoredSuv('giza_suv1', -8.4, 4.5, 0.28);
    addArmoredSuv('giza_suv2', 8.8, -6.5, -0.35);
    addBarrier('giza_b1', 0, -11.2, 0);
    addBarrier('giza_b2', -9.2, -12.0, 0.25);
    addBarrier('giza_b3', 9.2, -12.0, -0.25);
    addBarrier('giza_b4', -4.2, 13.5, 0.12);
    addBarrier('giza_b5', 5.4, 14.5, -0.15);
    addCrateCluster('giza_c1', -14.2, -2.5);
    addCrateCluster('giza_c2', 14.0, 8.0);

    addDatePalm(-18.5, -17, 7.8);
    addDatePalm(18.5, -17, 8.2);
    addStreetLantern(-14, -4, 5.6);
    addStreetLantern(14, -4, 5.6);

    // Three Monumental Great Pyramids of Giza rising across the North/NW Horizon
    const pyrMat = mats.buildingSandstone;
    const khufu = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(34, 42, 4)), pyrMat);
    khufu.position.set(-22, 20, -92);
    khufu.rotation.y = Math.PI / 4;
    const khafre = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(28, 36, 4)), mats.buildingOchre);
    khafre.position.set(24, 17, -86);
    khafre.rotation.y = Math.PI / 4 + 0.15;
    const menkaure = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(16, 21, 4)), mats.distantSkyline);
    menkaure.position.set(54, 10, -78);
    menkaure.rotation.y = Math.PI / 4;
    root.add(khufu, khafre, menkaure);
  } else if (districtId === 'maadi') {
    // MAADI — DEGLA EMBASSIES & LEAFY BOULEVARD
    const road = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(80, 86)), mats.asphalt);
    road.rotation.x = -Math.PI / 2;
    road.receiveShadow = true;
    root.add(road);

    [-17.5, 17.5].forEach((sx) => {
      const sw = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(5.5, 0.2, 62)), mats.sidewalk);
      sw.position.set(sx, 0.1, 3);
      sw.receiveShadow = true;
      root.add(sw);
    });

    // North Degla Compound Diplomatic Gatehouse
    registerBox('md_n_l', -14, 5.6, -26, 17, 11.2, 8.5, mats.buildingTerracotta);
    registerBox('md_n_r', 14, 5.6, -26, 17, 11.2, 8.5, mats.buildingTerracotta);
    registerBox('md_n_mid', 0, 8.8, -26, 11, 5.4, 8.5, mats.villaLimestone);
    registerBox('md_n_back', 0, 5.0, -30.5, 13, 10, 2, mats.buildingTerracotta);

    // Shaded Terracotta & Limestone Degla Villas
    addCairoBuilding('md_w1', -26.5, -10, 10, 11, 16, mats.villaLimestone, 'east', false);
    addCairoBuilding('md_w2', -26.5, 10, 10, 12, 18, mats.buildingTerracotta, 'east', false);
    addCairoBuilding('md_e1', 26.5, -10, 10, 12, 16, mats.buildingTerracotta, 'west', false);
    addCairoBuilding('md_e2', 26.5, 10, 10, 11, 18, mats.villaLimestone, 'west', false);
    registerBox('md_s_l', -14, 2.8, 31, 22, 5.6, 2.4, mats.buildingTerracotta);
    registerBox('md_s_r', 14, 2.8, 31, 22, 5.6, 2.4, mats.buildingTerracotta);

    // Convoy Armored SUVs, Taxis & Security Kiosks
    addArmoredSuv('md_suv1', -6.6, 5.5, 0.2);
    addArmoredSuv('md_suv2', 7.4, -5.2, -0.28);
    addCairoTaxi('md_taxi', 5.8, 15.2, 1.35);
    addBarrier('md_b1', -8.8, -11.5, 0.16);
    addBarrier('md_b2', 8.8, -11.5, -0.16);
    addBarrier('md_b3', -0.4, 0.5, 0.04);
    addCrateCluster('md_c1', -12.6, -3.0);
    addCrateCluster('md_c2', 12.6, 9.2);

    // Dense Maadi Signature Palm Canopy Rows
    [-15.2, 15.2].forEach((px) => {
      [-18, -10, -2, 6, 14, 21].forEach((pz) => addDatePalm(px, pz, 9.2));
      [-14, 0, 14].forEach((lz) => addStreetLantern(px, lz, 6.0));
    });
  } else if (districtId === 'sheikh_zayed') {
    // SHEIKH ZAYED LUXURY VILLA COMPOUND
    const ground = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(82, 86)), mats.sidewalk);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    root.add(ground);

    const driveway = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(20, 0.08, 62)), mats.asphalt);
    driveway.position.set(0, 0.04, 4);
    driveway.receiveShadow = true;
    root.add(driveway);

    // North Limestone Luxury Villa Mansion
    registerBox('villa_l', -14, 6.2, -26, 18, 12.4, 9, mats.villaLimestone);
    registerBox('villa_r', 14, 6.2, -26, 18, 12.4, 9, mats.villaLimestone);
    registerBox('villa_mid', 0, 9.5, -26, 10, 5.8, 9, mats.villaLimestone);
    registerBox('villa_back', 0, 5.2, -30.5, 12, 10.4, 2, mats.villaLimestone);

    // Villa Colonnade Pillars
    [-12, -8, -4, 4, 8, 12].forEach((px) => {
      const col = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.38, 0.44, 6.4, 12)), mats.sidewalk);
      col.position.set(px, 3.2, -20.8);
      col.castShadow = true;
      root.add(col);
    });

    // Perimeter Compound Limestone Walls & Security Watchtowers
    addCairoBuilding('sz_w1', -27, -6, 9, 10, 22, mats.villaLimestone, 'east', false);
    addCairoBuilding('sz_w2', -27, 16, 9, 10, 20, mats.villaLimestone, 'east', false);
    addCairoBuilding('sz_e1', 27, -6, 9, 10, 22, mats.villaLimestone, 'west', false);
    addCairoBuilding('sz_e2', 27, 16, 9, 10, 20, mats.villaLimestone, 'west', false);

    registerBox('sz_south_l', -14, 2.8, 31, 22, 5.6, 2.4, mats.villaLimestone);
    registerBox('sz_south_r', 14, 2.8, 31, 22, 5.6, 2.4, mats.villaLimestone);

    // Central Carved Compound Courtyard Fountain (Cover + Water Pool)
    const rim = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(3.4, 3.7, 1.05, 18)), mats.sidewalk);
    rim.position.set(0, 0.52, -3.5);
    rim.castShadow = true;
    rim.receiveShadow = true;
    const pool = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(2.9, 2.9, 0.16, 18)), mats.waterPool);
    pool.position.set(0, 0.94, -3.5);
    const spire = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.35, 0.65, 2.2, 12)), mats.sidewalk);
    spire.position.set(0, 1.4, -3.5);
    root.add(rim, pool, spire);
    sightOccluders.push(rim);
    colliders.push({
      id: 'sz_fountain',
      minX: -3.5,
      maxX: 3.5,
      minY: 0,
      maxY: 1.4,
      minZ: -7.0,
      maxZ: 0.0,
      isCover: true,
      blocksSight: true,
    });

    // Armored Black SUVs as High-Profile Compound Cover
    addArmoredSuv('suv_w', -9.2, 6.2, 0.32);
    addArmoredSuv('suv_e', 9.6, 4.8, -0.38);
    addArmoredSuv('suv_n', -8.8, -12.5, 1.25);

    addBarrier('sz_bar1', 8.8, -12.2, -0.2);
    addBarrier('sz_bar2', -5.5, 16.0, 0.15);
    addBarrier('sz_bar3', 6.5, 15.5, -0.15);

    // Palm-lined Luxury Driveway & Perimeter Floodlights
    [-14.5, 14.5].forEach((px) => {
      [-15, -3, 9, 20].forEach((pz) => addDatePalm(px, pz, 8.6));
      [-9, 3, 15].forEach((lz) => addStreetLantern(px, lz, 6.4));
    });
  } else {
    // NEW ADMINISTRATIVE CAPITAL — ICONIC TOWER CIVIC PLAZA
    const plaza = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(88, 90)), mats.travertinePlaza);
    plaza.rotation.x = -Math.PI / 2;
    plaza.receiveShadow = true;
    root.add(plaza);

    // Reflective Architectural Water Strips flanking the central axis
    [-13.5, 13.5].forEach((wx) => {
      const strip = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(3.2, 0.14, 44)), mats.waterPool);
      strip.position.set(wx, 0.07, 1);
      root.add(strip);
    });

    // North Glass Curtain-Wall Tower Podium & Boss Gate
    registerBox('nac_n_l', -15, 11, -26.5, 18, 22, 9, mats.modernGlassTower);
    registerBox('nac_n_r', 15, 11, -26.5, 18, 22, 9, mats.modernGlassTower);
    registerBox('nac_n_bridge', 0, 14, -26.5, 12, 8, 9, mats.modernGlassTower);
    registerBox('nac_n_back', 0, 6, -31, 14, 12, 2, mats.modernGlassTower);

    // Towering Glass Business District Flanks
    registerBox('nac_w1', -28, 13, -6, 11, 26, 20, mats.modernGlassTower);
    registerBox('nac_w2', -28, 11, 16, 11, 22, 20, mats.modernGlassTower);
    registerBox('nac_e1', 28, 13, -6, 11, 26, 20, mats.modernGlassTower);
    registerBox('nac_e2', 28, 11, 16, 11, 22, 20, mats.modernGlassTower);

    registerBox('nac_s_l', -14, 3.2, 31, 22, 6.4, 2.5, mats.modernGlassTower);
    registerBox('nac_s_r', 14, 3.2, 31, 22, 6.4, 2.5, mats.modernGlassTower);

    // Soaring Multi-Tier ICONIC TOWER Monument in the North Skyline
    const iconicBase = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(5.5, 8.2, 68, 8)), mats.modernGlassTower);
    iconicBase.position.set(0, 34, -84);
    const iconicUpper = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(3.4, 5.4, 38, 8)), mats.modernGlassTower);
    iconicUpper.position.set(0, 86, -84);
    const iconicCrown = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(3.4, 16, 8)), mats.taxiRoofSign);
    iconicCrown.position.set(0, 112, -84);
    root.add(iconicBase, iconicUpper, iconicCrown);

    // High-Tech Security Barriers & Syndicate Armored SUVs
    addArmoredSuv('nac_suv1', -6.8, 3.5, 0.25);
    addArmoredSuv('nac_suv2', 7.2, -5.0, -0.3);
    addBarrier('nac_b1', 0, -10.5, 0);
    addBarrier('nac_b2', -8.8, -11.5, 0.24);
    addBarrier('nac_b3', 8.8, -11.5, -0.24);
    addBarrier('nac_b4', 0, 11.5, 0);
    addBarrier('nac_b5', -7.2, 16.5, -0.15);
    addBarrier('nac_b6', 7.2, 16.5, 0.15);

    [-18, 18].forEach((lx) => {
      [-14, 0, 14].forEach((lz) => addStreetLantern(lx, lz, 6.8));
    });
  }

  // Shared Tactical Supply Pickups across all 4 arenas
  addPickup('med_west', 'medkit', -13.5, 11.0);
  addPickup('ammo_east', 'ammo', 13.5, 1.5);
  addPickup('med_north', 'medkit', 11.8, -15.5);

  // Subtle Atmospheric Cairo Dust Motes (Single Points Draw Call)
  const dustCount = 260;
  const dustPositions = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    dustPositions[i * 3] = (Math.random() - 0.5) * 56;
    dustPositions[i * 3 + 1] = 0.6 + Math.random() * 14;
    dustPositions[i * 3 + 2] = (Math.random() - 0.5) * 58;
  }
  const dustGeo = trackGeo(new THREE.BufferGeometry());
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
  const dustMat = trackMat(
    new THREE.PointsMaterial({
      color: districtId === 'new_capital' ? 0xf5d79b : 0xf4cfa0,
      size: 0.18,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
    }),
  );
  const dustPoints = new THREE.Points(dustGeo, dustMat);
  root.add(dustPoints);

  return {
    config,
    root,
    colliders,
    sightOccluders,
    pickups,
    playerSpawn: new THREE.Vector3(0, 0, 22.0),
    henchmanSpawns: [
      { pos: new THREE.Vector3(-9.5, 0, -14.5), patrolTo: new THREE.Vector3(-4.5, 0, -12.5) },
      { pos: new THREE.Vector3(9.5, 0, -14.5), patrolTo: new THREE.Vector3(4.5, 0, -12.5) },
      { pos: new THREE.Vector3(-12.5, 0, -2.0), patrolTo: new THREE.Vector3(-8.5, 0, 4.5) },
      { pos: new THREE.Vector3(12.2, 0, 4.5), patrolTo: new THREE.Vector3(8.0, 0, -2.5) },
      { pos: new THREE.Vector3(0.0, 0, -7.8), patrolTo: new THREE.Vector3(3.8, 0, -5.5) },
    ],
    bossSpawn: new THREE.Vector3(0, 0, -20.0),
    bossReinforcementSpawns: [new THREE.Vector3(-14.5, 0, -15.5), new THREE.Vector3(14.5, 0, -15.5)],
    dustPoints,
    dispose: () => {
      ownedGeometries.forEach((g) => g.dispose());
      ownedMaterials.forEach((m) => m.dispose());
    },
  };
}
