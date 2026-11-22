import * as THREE from 'three';
import { CharacterArchetype } from './types';

export interface ArticulatedCharacterRig {
  root: THREE.Group;
  bodyPivot: THREE.Group;
  torso: THREE.Group;
  headGroup: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  muzzlePoint: THREE.Object3D;
  headHitbox: THREE.Mesh;
  bodyHitbox: THREE.Mesh;
  muzzleFlash: THREE.Group;
  laserSight?: THREE.Line;
  drones?: THREE.Group[];
  dispose: () => void;
}

/**
 * Generates a realistic 256x256 portrait face CanvasTexture wrapped onto the sculpted cranium.
 */
function createFaceTexture(archetype: CharacterArchetype): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Warm Egyptian / Mediterranean skin tone gradient
  const skinBase =
    archetype === 'boss_architect'
      ? '#303640'
      : archetype === 'player'
        ? '#c7926b'
        : archetype === 'boss_el_ameen'
          ? '#be855d'
          : '#b7815b';
  ctx.fillStyle = skinBase;
  ctx.fillRect(0, 0, 256, 256);

  if (archetype === 'boss_architect') {
    // High-tech tactical helmet visor glow band
    ctx.fillStyle = '#181c22';
    ctx.fillRect(0, 0, 256, 256);
    const visorGrad = ctx.createLinearGradient(88, 108, 168, 134);
    visorGrad.addColorStop(0, '#f59e0b');
    visorGrad.addColorStop(0.5, '#fde68a');
    visorGrad.addColorStop(1, '#d97706');
    ctx.fillStyle = visorGrad;
    ctx.fillRect(88, 110, 80, 22);
  } else {
    // Natural cheek & brow shading (Sphere UV center front is x=128)
    const shade = ctx.createRadialGradient(128, 128, 12, 128, 128, 96);
    shade.addColorStop(0, 'rgba(255, 226, 198, 0.16)');
    shade.addColorStop(1, 'rgba(72, 38, 18, 0.24)');
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, 256, 256);

    // Eyebrows
    ctx.fillStyle = '#1d1815';
    ctx.fillRect(102, 104, 20, 4);
    ctx.fillRect(134, 104, 20, 4);

    // Eyes (sclera + dark iris)
    ctx.fillStyle = '#ece6de';
    ctx.fillRect(105, 114, 15, 7);
    ctx.fillRect(136, 114, 15, 7);
    ctx.fillStyle = '#241a12';
    ctx.fillRect(110, 115, 6, 6);
    ctx.fillRect(140, 115, 6, 6);

    // Subtle nose shadow
    ctx.fillStyle = 'rgba(92, 54, 30, 0.35)';
    ctx.fillRect(125, 116, 6, 22);

    // Beard / stubble / mustache per character archetype
    if (archetype === 'player') {
      // Short modern tactical stubble beard
      ctx.fillStyle = 'rgba(32, 24, 18, 0.42)';
      ctx.beginPath();
      ctx.arc(128, 148, 28, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.fill();
      ctx.fillStyle = '#8f5842';
      ctx.fillRect(118, 148, 20, 4);
    } else if (archetype === 'boss_el_ameen') {
      // Iconic thick Cairo precinct officer mustache
      ctx.fillStyle = '#181412';
      ctx.fillRect(110, 139, 36, 9);
      ctx.fillStyle = '#7d4a38';
      ctx.fillRect(118, 152, 20, 4);
    } else if (archetype === 'boss_zarzour') {
      // Heavy full dark beard + weathered brow scar
      ctx.fillStyle = '#1b1613';
      ctx.beginPath();
      ctx.arc(128, 146, 32, 0.08 * Math.PI, 0.92 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = '#7a3328';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(104, 96);
      ctx.lineTo(118, 128);
      ctx.stroke();
    } else if (archetype === 'boss_hefny') {
      // Sharp trimmed goatee & aristocratic mustache
      ctx.fillStyle = '#25211e';
      ctx.fillRect(114, 140, 28, 6);
      ctx.fillRect(120, 156, 16, 10);
    } else {
      // Henchman heavy stubble
      ctx.fillStyle = 'rgba(28, 22, 18, 0.38)';
      ctx.fillRect(108, 140, 40, 22);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Builds a high-detail multi-part tactical weapon (carbine, shotgun, DMR sniper, or pulse rifle).
 */
function buildDetailedWeapon(
  archetype: CharacterArchetype,
  disposables: { geos: THREE.BufferGeometry[]; mats: THREE.Material[]; texs: THREE.Texture[] },
): {
  group: THREE.Group;
  muzzlePoint: THREE.Object3D;
  muzzleFlash: THREE.Group;
  laserSight?: THREE.Line;
} {
  const group = new THREE.Group();
  const isBoss = archetype !== 'player' && archetype !== 'henchman';
  const isSniper = archetype === 'boss_hefny';
  const isShotgun = archetype === 'boss_zarzour';
  const isPulse = archetype === 'boss_architect';

  const gunmetalMat = new THREE.MeshStandardMaterial({
    color: isPulse ? 0x161a22 : 0x23272f,
    roughness: 0.32,
    metalness: 0.86,
  });
  const polymerMat = new THREE.MeshStandardMaterial({
    color: isShotgun ? 0x5c361e : archetype === 'player' ? 0x3b352c : 0x262629,
    roughness: 0.78,
    metalness: 0.1,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: isBoss ? 0xd9a441 : 0x707782,
    roughness: 0.22,
    metalness: 0.92,
  });
  const flashMat = new THREE.MeshBasicMaterial({
    color: isPulse ? 0x38bdf8 : 0xffcc55,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  disposables.mats.push(gunmetalMat, polymerMat, accentMat, flashMat);

  // Beveled Ergonomic Stock via ExtrudeGeometry
  const stockShape = new THREE.Shape();
  stockShape.moveTo(0, 0);
  stockShape.lineTo(0.24, 0.03);
  stockShape.lineTo(0.24, -0.05);
  stockShape.lineTo(0, -0.11);
  stockShape.closePath();
  const stockGeo = new THREE.ExtrudeGeometry(stockShape, {
    depth: 0.042,
    bevelEnabled: true,
    bevelThickness: 0.008,
    bevelSize: 0.008,
    bevelSegments: 2,
  });
  stockGeo.center();
  disposables.geos.push(stockGeo);
  const stock = new THREE.Mesh(stockGeo, polymerMat);
  stock.rotation.y = Math.PI / 2;
  stock.position.set(0, -0.02, -0.2);
  group.add(stock);

  // Upper + Lower Receiver
  const recLen = isSniper ? 0.44 : isShotgun ? 0.36 : 0.34;
  const receiverGeo = new THREE.BoxGeometry(0.068, 0.095, recLen);
  const handguardGeo = new THREE.CylinderGeometry(0.032, 0.036, isSniper ? 0.36 : 0.26, 8);
  const barrelLen = isSniper ? 0.56 : isShotgun ? 0.38 : 0.34;
  const barrelGeo = new THREE.CylinderGeometry(0.014, 0.017, barrelLen, 10);
  const suppressorGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.14, 10);
  const gripGeo = new THREE.BoxGeometry(0.042, 0.12, 0.055);
  disposables.geos.push(receiverGeo, handguardGeo, barrelGeo, suppressorGeo, gripGeo);

  const receiver = new THREE.Mesh(receiverGeo, gunmetalMat);
  receiver.position.set(0, 0.01, 0.06);
  group.add(receiver);

  const handguard = new THREE.Mesh(handguardGeo, polymerMat);
  handguard.rotation.x = Math.PI / 2;
  handguard.position.set(0, 0.01, 0.32);
  group.add(handguard);

  const barrel = new THREE.Mesh(barrelGeo, accentMat);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.016, 0.34 + barrelLen * 0.5);
  group.add(barrel);

  // Tactical muzzle brake / suppressor
  const muzzleBrake = new THREE.Mesh(suppressorGeo, gunmetalMat);
  muzzleBrake.rotation.x = Math.PI / 2;
  muzzleBrake.position.set(0, 0.016, 0.34 + barrelLen + 0.04);
  group.add(muzzleBrake);

  // Pistol Grip
  const grip = new THREE.Mesh(gripGeo, polymerMat);
  grip.position.set(0, -0.075, -0.02);
  grip.rotation.x = 0.26;
  group.add(grip);

  // Curved Magazine via TubeGeometry (or underbarrel tube for shotgun)
  if (isShotgun) {
    const tubeGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.34, 8);
    disposables.geos.push(tubeGeo);
    const magTube = new THREE.Mesh(tubeGeo, gunmetalMat);
    magTube.rotation.x = Math.PI / 2;
    magTube.position.set(0, -0.02, 0.42);
    group.add(magTube);
  } else {
    const magCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, -0.03, 0.13),
      new THREE.Vector3(0, -0.14, 0.15),
      new THREE.Vector3(0, -0.23, 0.2),
    ]);
    const magGeo = new THREE.TubeGeometry(magCurve, 8, 0.026, 6, false);
    disposables.geos.push(magGeo);
    const mag = new THREE.Mesh(magGeo, gunmetalMat);
    mag.scale.set(0.7, 1, 1.35);
    group.add(mag);
  }

  // Optical Sight / Sniper Scope
  const scopeGeo = new THREE.CylinderGeometry(0.022, 0.024, isSniper ? 0.22 : 0.1, 10);
  disposables.geos.push(scopeGeo);
  const scope = new THREE.Mesh(scopeGeo, accentMat);
  scope.rotation.x = Math.PI / 2;
  scope.position.set(0, 0.082, 0.06);
  group.add(scope);

  // Muzzle point & Multi-plane Star Muzzle Flash
  const muzzleZ = 0.34 + barrelLen + 0.12;
  const muzzlePoint = new THREE.Object3D();
  muzzlePoint.position.set(0, 0.016, muzzleZ);
  group.add(muzzlePoint);

  const muzzleFlash = new THREE.Group();
  muzzleFlash.position.set(0, 0.016, muzzleZ + 0.12);
  const flashPlaneGeo = new THREE.PlaneGeometry(0.32, 0.32);
  const flashConeGeo = new THREE.ConeGeometry(0.09, 0.36, 6);
  disposables.geos.push(flashPlaneGeo, flashConeGeo);

  const f1 = new THREE.Mesh(flashPlaneGeo, flashMat);
  const f2 = new THREE.Mesh(flashPlaneGeo, flashMat);
  f2.rotation.y = Math.PI / 2;
  const f3 = new THREE.Mesh(flashConeGeo, flashMat);
  f3.rotation.x = Math.PI / 2;
  f3.position.z = 0.08;
  muzzleFlash.add(f1, f2, f3);
  group.add(muzzleFlash);

  // Optional crimson laser telegraph for sniper / boss windup
  let laserSight: THREE.Line | undefined;
  if (isBoss) {
    const laserGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0.016, muzzleZ),
      new THREE.Vector3(0, 0.016, muzzleZ + 22),
    ]);
    const laserMat = new THREE.LineBasicMaterial({
      color: isPulse ? 0x38bdf8 : 0xff3b30,
      transparent: true,
      opacity: 0,
    });
    disposables.geos.push(laserGeo);
    disposables.mats.push(laserMat);
    laserSight = new THREE.Line(laserGeo, laserMat);
    group.add(laserSight);
  }

  return { group, muzzlePoint, muzzleFlash, laserSight };
}

/**
 * Builds an anatomically sculpted, 24+ part realistic tactical character grounded at y = 0.
 * Zero boxy/Minecraft geometry — uses LatheGeometry, CapsuleGeometry, SphereGeometry, and ExtrudeGeometry.
 */
export function createCharacterRig(
  archetype: CharacterArchetype,
  contactShadowMat: THREE.MeshBasicMaterial,
  tacticalWeaveBump: THREE.CanvasTexture,
  entityId: string,
): ArticulatedCharacterRig {
  const disposables = {
    geos: [] as THREE.BufferGeometry[],
    mats: [] as THREE.Material[],
    texs: [] as THREE.Texture[],
  };
  const isBoss = archetype !== 'player' && archetype !== 'henchman';
  const scale = isBoss ? 1.14 : 1.0;

  const root = new THREE.Group();
  root.name = entityId;

  // Grounded soft radial contact shadow
  const shadowGeo = new THREE.PlaneGeometry(1.25 * scale, 1.25 * scale);
  disposables.geos.push(shadowGeo);
  const shadowDisc = new THREE.Mesh(shadowGeo, contactShadowMat);
  shadowDisc.rotation.x = -Math.PI / 2;
  shadowDisc.position.y = 0.025;
  root.add(shadowDisc);

  const bodyPivot = new THREE.Group();
  bodyPivot.scale.setScalar(scale);
  root.add(bodyPivot);

  const paletteMap: Record<
    CharacterArchetype,
    { shirt: number; vest: number; pants: number; boots: number; skin: number; hair: number; accent: number }
  > = {
    player: {
      shirt: 0x3a433b,
      vest: 0xb19165,
      pants: 0x262c36,
      boots: 0x221a14,
      skin: 0xc7926b,
      hair: 0x1a1715,
      accent: 0xd99b3c,
    },
    henchman: {
      shirt: 0x3d332d,
      vest: 0x292e38,
      pants: 0x22252c,
      boots: 0x1b1613,
      skin: 0xbd8863,
      hair: 0x1f2228,
      accent: 0x99382e,
    },
    boss_el_ameen: {
      shirt: 0x1c2432,
      vest: 0x151922,
      pants: 0x1a202b,
      boots: 0x121215,
      skin: 0xbe855d,
      hair: 0x171f2e,
      accent: 0xe6b44c,
    },
    boss_zarzour: {
      shirt: 0x2e1f1c,
      vest: 0x3d2418,
      pants: 0x1d1a18,
      boots: 0x19120e,
      skin: 0xb7815b,
      hair: 0x1a1411,
      accent: 0xd98638,
    },
    boss_hefny: {
      shirt: 0xc2b298,
      vest: 0x242830,
      pants: 0x2a2621,
      boots: 0x1e1712,
      skin: 0xc18b66,
      hair: 0x221f1c,
      accent: 0xc9963a,
    },
    boss_architect: {
      shirt: 0x161a22,
      vest: 0x1d232e,
      pants: 0x141820,
      boots: 0x0f1218,
      skin: 0x303640,
      hair: 0x141820,
      accent: 0xebb144,
    },
  };

  const p = paletteMap[archetype];

  const shirtMat = new THREE.MeshStandardMaterial({
    color: p.shirt,
    bumpMap: tacticalWeaveBump,
    bumpScale: 0.015,
    roughness: 0.84,
    metalness: 0.06,
  });
  const vestMat = new THREE.MeshStandardMaterial({
    color: p.vest,
    bumpMap: tacticalWeaveBump,
    bumpScale: 0.03,
    roughness: archetype === 'boss_architect' ? 0.28 : 0.72,
    metalness: archetype === 'boss_architect' ? 0.78 : 0.16,
  });
  const pantsMat = new THREE.MeshStandardMaterial({ color: p.pants, roughness: 0.88, metalness: 0.04 });
  const bootMat = new THREE.MeshStandardMaterial({ color: p.boots, roughness: 0.42, metalness: 0.22 });
  const skinMat = new THREE.MeshStandardMaterial({ color: p.skin, roughness: 0.62, metalness: 0.02 });
  const hairMat = new THREE.MeshStandardMaterial({ color: p.hair, roughness: 0.56, metalness: 0.12 });
  const accentMat = new THREE.MeshStandardMaterial({
    color: p.accent,
    roughness: isBoss ? 0.2 : 0.38,
    metalness: isBoss ? 0.92 : 0.58,
  });
  const glassesMat = new THREE.MeshPhysicalMaterial({
    color: 0x11151b,
    roughness: 0.08,
    metalness: 0.88,
    clearcoat: 1.0,
  });
  const faceTex = createFaceTexture(archetype);
  const faceMat = new THREE.MeshStandardMaterial({
    map: faceTex,
    roughness: archetype === 'boss_architect' ? 0.25 : 0.58,
    metalness: archetype === 'boss_architect' ? 0.75 : 0.02,
  });
  disposables.texs.push(faceTex);
  disposables.mats.push(shirtMat, vestMat, pantsMat, bootMat, skinMat, hairMat, accentMat, glassesMat, faceMat);

  // 1. Sculpted Pelvis & Tactical Belt
  const pelvisGeo = new THREE.CylinderGeometry(0.19, 0.17, 0.18, 12);
  const beltGeo = new THREE.TorusGeometry(0.185, 0.028, 8, 16);
  disposables.geos.push(pelvisGeo, beltGeo);

  const pelvis = new THREE.Mesh(pelvisGeo, pantsMat);
  pelvis.position.y = 0.88;
  pelvis.scale.set(1.18, 1, 0.76);
  pelvis.castShadow = true;
  bodyPivot.add(pelvis);

  const belt = new THREE.Mesh(beltGeo, bootMat);
  belt.rotation.x = Math.PI / 2;
  belt.position.y = 0.95;
  belt.scale.set(1.15, 0.8, 1);
  bodyPivot.add(belt);

  // 2. Anatomically Sculpted Multi-Part Legs (Thigh Capsule + Knee Pad + Calf Capsule + Sculpted Combat Boot)
  const thighGeo = new THREE.CapsuleGeometry(0.088, 0.28, 6, 10);
  const kneeGeo = new THREE.SphereGeometry(0.072, 10, 8);
  const calfGeo = new THREE.CapsuleGeometry(0.072, 0.28, 6, 10);
  const bootUpperGeo = new THREE.CylinderGeometry(0.072, 0.082, 0.14, 10);
  const bootFootGeo = new THREE.CapsuleGeometry(0.068, 0.13, 6, 10);
  disposables.geos.push(thighGeo, kneeGeo, calfGeo, bootUpperGeo, bootFootGeo);

  const makeLeg = (xOff: number) => {
    const leg = new THREE.Group();
    leg.position.set(xOff, 0.86, 0);

    const thigh = new THREE.Mesh(thighGeo, pantsMat);
    thigh.position.set(0, -0.2, 0);
    thigh.castShadow = true;
    leg.add(thigh);

    const kneePad = new THREE.Mesh(kneeGeo, vestMat);
    kneePad.position.set(0, -0.41, 0.055);
    kneePad.scale.set(1.0, 1.15, 0.65);
    leg.add(kneePad);

    const calf = new THREE.Mesh(calfGeo, pantsMat);
    calf.position.set(0, -0.58, -0.01);
    calf.castShadow = true;
    leg.add(calf);

    const bootUpper = new THREE.Mesh(bootUpperGeo, bootMat);
    bootUpper.position.set(0, -0.74, 0);
    leg.add(bootUpper);

    const bootFoot = new THREE.Mesh(bootFootGeo, bootMat);
    bootFoot.rotation.x = Math.PI / 2;
    bootFoot.position.set(0, -0.8, 0.055);
    bootFoot.scale.set(1, 1, 0.72);
    bootFoot.castShadow = true;
    leg.add(bootFoot);

    return leg;
  };

  const leftLeg = makeLeg(-0.125);
  const rightLeg = makeLeg(0.125);
  bodyPivot.add(leftLeg, rightLeg);

  // 3. Sculpted Torso via LatheGeometry (Natural V-Taper Human Chest/Ribcage/Waist)
  const torso = new THREE.Group();
  torso.position.set(0, 0.94, 0);
  bodyPivot.add(torso);

  const torsoProfile = [
    new THREE.Vector2(0.15, 0.0),
    new THREE.Vector2(0.165, 0.14),
    new THREE.Vector2(0.21, 0.36),
    new THREE.Vector2(0.225, 0.5),
    new THREE.Vector2(0.16, 0.58),
    new THREE.Vector2(0.08, 0.61),
  ];
  const torsoGeo = new THREE.LatheGeometry(torsoProfile, 16);
  disposables.geos.push(torsoGeo);
  const chest = new THREE.Mesh(torsoGeo, shirtMat);
  chest.scale.set(1.14, 1, 0.72);
  chest.castShadow = true;
  torso.add(chest);

  // Sculpted Beveled Ballistic Plate Carrier
  const plateShape = new THREE.Shape();
  plateShape.moveTo(-0.16, -0.18);
  plateShape.lineTo(0.16, -0.18);
  plateShape.lineTo(0.19, 0.12);
  plateShape.lineTo(0.11, 0.22);
  plateShape.lineTo(-0.11, 0.22);
  plateShape.lineTo(-0.19, 0.12);
  plateShape.closePath();
  const plateGeo = new THREE.ExtrudeGeometry(plateShape, {
    depth: 0.25,
    bevelEnabled: true,
    bevelThickness: 0.025,
    bevelSize: 0.02,
    bevelSegments: 2,
  });
  plateGeo.center();
  disposables.geos.push(plateGeo);
  const plateCarrier = new THREE.Mesh(plateGeo, vestMat);
  plateCarrier.position.set(0, 0.33, 0);
  plateCarrier.castShadow = true;
  torso.add(plateCarrier);

  // Magazine Pouches & Radio Antenna on Chest
  const pouchGeo = new THREE.BoxGeometry(0.072, 0.11, 0.048);
  const radioAntGeo = new THREE.CylinderGeometry(0.005, 0.007, 0.24, 6);
  disposables.geos.push(pouchGeo, radioAntGeo);
  [-0.085, 0, 0.085].forEach((px) => {
    const pouch = new THREE.Mesh(pouchGeo, vestMat);
    pouch.position.set(px, 0.21, 0.165);
    torso.add(pouch);
  });
  const antenna = new THREE.Mesh(radioAntGeo, bootMat);
  antenna.position.set(-0.18, 0.62, -0.05);
  torso.add(antenna);

  // Archetype-specific upper gear
  if (archetype === 'player') {
    const packGeo = new THREE.CapsuleGeometry(0.13, 0.18, 6, 10);
    disposables.geos.push(packGeo);
    const pack = new THREE.Mesh(packGeo, vestMat);
    pack.position.set(0, 0.34, -0.18);
    pack.scale.set(1.1, 1, 0.65);
    pack.castShadow = true;
    torso.add(pack);
  } else if (archetype === 'boss_el_ameen') {
    // Officer gold braided epaulets + precinct trench coat skirt
    const epGeo = new THREE.CapsuleGeometry(0.032, 0.09, 4, 8);
    const coatGeo = new THREE.CylinderGeometry(0.21, 0.28, 0.38, 14, 1, true);
    disposables.geos.push(epGeo, coatGeo);
    [-0.23, 0.23].forEach((ex) => {
      const ep = new THREE.Mesh(epGeo, accentMat);
      ep.rotation.z = Math.PI / 2;
      ep.position.set(ex, 0.56, 0);
      torso.add(ep);
    });
    const coat = new THREE.Mesh(coatGeo, shirtMat);
    coat.position.set(0, -0.14, -0.01);
    coat.scale.set(1.12, 1, 0.8);
    torso.add(coat);
  } else if (archetype === 'boss_architect') {
    // Sculpted futuristic shoulder pauldrons + glowing amber spine core
    const pauldronGeo = new THREE.SphereGeometry(0.125, 12, 10);
    const coreGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.24, 10);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0xffd166,
      emissive: 0xe89b3c,
      emissiveIntensity: 1.5,
      roughness: 0.2,
    });
    disposables.geos.push(pauldronGeo, coreGeo);
    disposables.mats.push(coreMat);
    [-0.29, 0.29].forEach((px) => {
      const pauldron = new THREE.Mesh(pauldronGeo, accentMat);
      pauldron.position.set(px, 0.5, 0);
      pauldron.scale.set(1.1, 0.85, 1.05);
      torso.add(pauldron);
    });
    const spineCore = new THREE.Mesh(coreGeo, coreMat);
    spineCore.position.set(0, 0.36, -0.16);
    torso.add(spineCore);
  }

  // 4. Sculpted Neck & Organic Cranium Head with Painted Face Texture
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.61, 0);
  torso.add(headGroup);

  const neckGeo = new THREE.CylinderGeometry(0.062, 0.072, 0.1, 10);
  const skullGeo = new THREE.SphereGeometry(0.132, 18, 16);
  const earGeo = new THREE.SphereGeometry(0.028, 8, 8);
  const noseGeo = new THREE.ConeGeometry(0.02, 0.048, 6);
  disposables.geos.push(neckGeo, skullGeo, earGeo, noseGeo);

  const neck = new THREE.Mesh(neckGeo, skinMat);
  neck.position.y = 0.04;
  headGroup.add(neck);

  const skull = new THREE.Mesh(skullGeo, faceMat);
  skull.position.y = 0.175;
  skull.scale.set(0.92, 1.12, 1.0);
  // Orient Sphere UV center (u=0.5) toward +Z front face
  skull.rotation.y = -Math.PI / 2;
  skull.castShadow = true;
  headGroup.add(skull);

  if (archetype !== 'boss_architect') {
    const earL = new THREE.Mesh(earGeo, skinMat);
    earL.position.set(-0.122, 0.17, 0);
    earL.scale.set(0.55, 1.1, 0.75);
    const earR = new THREE.Mesh(earGeo, skinMat);
    earR.position.set(0.122, 0.17, 0);
    earR.scale.set(0.55, 1.1, 0.75);
    const nose = new THREE.Mesh(noseGeo, skinMat);
    nose.rotation.x = Math.PI / 2.2;
    nose.position.set(0, 0.17, 0.13);
    headGroup.add(earL, earR, nose);
  }

  // Headgear & Tactical Eyewear per Archetype
  if (archetype === 'boss_el_ameen') {
    // Peaked Officer Cap with Gold Visor Braid & Eagle Emblem + Aviators
    const capCrownGeo = new THREE.CylinderGeometry(0.155, 0.126, 0.095, 16);
    const capBrimGeo = new THREE.CylinderGeometry(0.138, 0.142, 0.022, 14, 1, false, -Math.PI * 0.42, Math.PI * 0.84);
    const crestGeo = new THREE.OctahedronGeometry(0.026, 0);
    const lensGeo = new THREE.SphereGeometry(0.036, 10, 8);
    disposables.geos.push(capCrownGeo, capBrimGeo, crestGeo, lensGeo);

    const crown = new THREE.Mesh(capCrownGeo, hairMat);
    crown.position.set(0, 0.305, -0.01);
    crown.rotation.x = -0.1;
    headGroup.add(crown);

    const brim = new THREE.Mesh(capBrimGeo, bootMat);
    brim.position.set(0, 0.258, 0.055);
    brim.rotation.x = 0.14;
    headGroup.add(brim);

    const crest = new THREE.Mesh(crestGeo, accentMat);
    crest.position.set(0, 0.31, 0.135);
    headGroup.add(crest);

    [-0.044, 0.044].forEach((lx) => {
      const lens = new THREE.Mesh(lensGeo, glassesMat);
      lens.position.set(lx, 0.185, 0.118);
      lens.scale.set(1.15, 0.8, 0.45);
      headGroup.add(lens);
    });
  } else if (archetype === 'boss_architect') {
    // Sleek armored exosuit helmet dome + cheek guards
    const helmGeo = new THREE.SphereGeometry(0.148, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.65);
    const trimGeo = new THREE.TorusGeometry(0.135, 0.014, 8, 18);
    disposables.geos.push(helmGeo, trimGeo);
    const helm = new THREE.Mesh(helmGeo, vestMat);
    helm.position.set(0, 0.185, 0);
    headGroup.add(helm);
    const trim = new THREE.Mesh(trimGeo, accentMat);
    trim.rotation.x = Math.PI / 2;
    trim.position.set(0, 0.23, 0);
    headGroup.add(trim);
  } else {
    // Sculpted hair cap / patrol cap + tactical eyewear
    const hairGeo = new THREE.SphereGeometry(0.138, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.56);
    disposables.geos.push(hairGeo);
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.set(0, 0.195, -0.008);
    hair.scale.set(0.95, 1.05, 1.03);
    headGroup.add(hair);

    if (archetype === 'player' || archetype === 'boss_hefny') {
      const visorGeo = new THREE.CylinderGeometry(0.125, 0.125, 0.042, 14, 1, true, -0.65, 1.3);
      disposables.geos.push(visorGeo);
      const shades = new THREE.Mesh(visorGeo, glassesMat);
      shades.position.set(0, 0.19, 0.015);
      headGroup.add(shades);
    } else if (archetype === 'henchman') {
      // Tactical bandana / shemagh scarf around lower face
      const scarfGeo = new THREE.CylinderGeometry(0.122, 0.132, 0.085, 14);
      disposables.geos.push(scarfGeo);
      const scarf = new THREE.Mesh(scarfGeo, accentMat);
      scarf.position.set(0, 0.115, 0.01);
      headGroup.add(scarf);
    }
  }

  // 5. Anatomically Articulated Arms (Shoulder Cap + Bicep + Forearm + Gloved Hand)
  const shoulderGeo = new THREE.SphereGeometry(0.082, 10, 10);
  const bicepGeo = new THREE.CapsuleGeometry(0.058, 0.19, 6, 10);
  const forearmGeo = new THREE.CapsuleGeometry(0.048, 0.19, 6, 10);
  const gloveGeo = new THREE.SphereGeometry(0.046, 8, 8);
  disposables.geos.push(shoulderGeo, bicepGeo, forearmGeo, gloveGeo);

  const buildArm = (side: -1 | 1) => {
    const armGroup = new THREE.Group();
    armGroup.position.set(side * 0.265, 0.5, 0.02);

    const shoulder = new THREE.Mesh(shoulderGeo, shirtMat);
    shoulder.castShadow = true;
    armGroup.add(shoulder);

    const bicep = new THREE.Mesh(bicepGeo, shirtMat);
    bicep.position.set(0, -0.14, 0.06);
    bicep.rotation.x = -0.35;
    bicep.castShadow = true;
    armGroup.add(bicep);

    const forearm = new THREE.Mesh(forearmGeo, side === 1 ? shirtMat : skinMat);
    forearm.position.set(side * -0.05, -0.22, 0.22);
    forearm.rotation.x = -1.25;
    forearm.rotation.z = side * 0.22;
    forearm.castShadow = true;
    armGroup.add(forearm);

    const hand = new THREE.Mesh(gloveGeo, bootMat);
    hand.position.set(side * -0.1, -0.22, 0.34);
    armGroup.add(hand);

    return armGroup;
  };

  const leftArm = buildArm(-1);
  const rightArm = buildArm(1);
  torso.add(leftArm, rightArm);

  // Detailed Weapon mounted in hands
  const weapon = buildDetailedWeapon(archetype, disposables);
  weapon.group.position.set(-0.1, -0.2, 0.36);
  rightArm.add(weapon.group);

  // Hovering Tactical Recon Drones for Level 4 Boss (The Syndicate Architect)
  let drones: THREE.Group[] | undefined;
  if (archetype === 'boss_architect') {
    drones = [];
    const droneBodyGeo = new THREE.OctahedronGeometry(0.22, 1);
    const rotorRingGeo = new THREE.TorusGeometry(0.32, 0.025, 8, 18);
    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0ea5e9,
      emissiveIntensity: 1.8,
    });
    disposables.geos.push(droneBodyGeo, rotorRingGeo);
    disposables.mats.push(eyeMat);

    for (let d = 0; d < 2; d++) {
      const dg = new THREE.Group();
      const body = new THREE.Mesh(droneBodyGeo, vestMat);
      const ring = new THREE.Mesh(rotorRingGeo, accentMat);
      ring.rotation.x = Math.PI / 2;
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), eyeMat);
      eye.position.z = 0.18;
      dg.add(body, ring, eye);
      dg.position.set(d === 0 ? -1.1 : 1.1, 2.25, 0.2);
      root.add(dg);
      drones.push(dg);
    }
  }

  // Invisible Fast Raycast Hitboxes (head + body)
  const hitboxMat = new THREE.MeshBasicMaterial({ visible: false });
  const bodyHitGeo = new THREE.BoxGeometry(0.76, 1.34, 0.62);
  const headHitGeo = new THREE.BoxGeometry(0.46, 0.46, 0.46);
  disposables.mats.push(hitboxMat);
  disposables.geos.push(bodyHitGeo, headHitGeo);

  const bodyHitbox = new THREE.Mesh(bodyHitGeo, hitboxMat);
  bodyHitbox.position.set(0, 0.78, 0);
  bodyHitbox.userData = { entityId, zone: 'body' };
  bodyPivot.add(bodyHitbox);

  const headHitbox = new THREE.Mesh(headHitGeo, hitboxMat);
  headHitbox.position.set(0, 1.66, 0);
  headHitbox.userData = { entityId, zone: 'head' };
  bodyPivot.add(headHitbox);

  return {
    root,
    bodyPivot,
    torso,
    headGroup,
    leftLeg,
    rightLeg,
    leftArm,
    rightArm,
    muzzlePoint: weapon.muzzlePoint,
    headHitbox,
    bodyHitbox,
    muzzleFlash: weapon.muzzleFlash,
    laserSight: weapon.laserSight,
    drones,
    dispose: () => {
      disposables.geos.forEach((g) => g.dispose());
      disposables.mats.forEach((m) => m.dispose());
      disposables.texs.forEach((t) => t.dispose());
    },
  };
}
