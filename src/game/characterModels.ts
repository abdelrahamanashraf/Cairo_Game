import * as THREE from 'three';

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
  muzzleFlash: THREE.Mesh;
  dispose: () => void;
}

export type CharacterArchetype = 'player' | 'henchman' | 'boss_el_ameen';

function buildCompositeRifle(isHeavyBossRifle: boolean, disposables: { geos: THREE.BufferGeometry[]; mats: THREE.Material[] }): {
  group: THREE.Group;
  muzzlePoint: THREE.Object3D;
  muzzleFlash: THREE.Mesh;
} {
  const group = new THREE.Group();

  const receiverMat = new THREE.MeshStandardMaterial({
    color: isHeavyBossRifle ? 0x1e2228 : 0x262a31,
    roughness: 0.36,
    metalness: 0.78,
  });
  const polymerMat = new THREE.MeshStandardMaterial({
    color: isHeavyBossRifle ? 0x4d3a24 : 0x3b352c,
    roughness: 0.82,
    metalness: 0.08,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: isHeavyBossRifle ? 0xd9a13b : 0x6b7280,
    roughness: 0.25,
    metalness: 0.88,
  });
  const flashMat = new THREE.MeshBasicMaterial({
    color: 0xffcc55,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  disposables.mats.push(receiverMat, polymerMat, accentMat, flashMat);

  const receiverGeo = new THREE.BoxGeometry(0.08, 0.11, isHeavyBossRifle ? 0.48 : 0.4);
  const barrelGeo = new THREE.CylinderGeometry(0.02, 0.022, isHeavyBossRifle ? 0.44 : 0.36, 8);
  const stockGeo = new THREE.BoxGeometry(0.065, 0.12, 0.24);
  const magGeo = new THREE.BoxGeometry(0.055, 0.2, 0.085);
  const opticGeo = new THREE.BoxGeometry(0.05, 0.06, 0.11);
  const flashGeo = new THREE.ConeGeometry(0.11, 0.32, 6);
  disposables.geos.push(receiverGeo, barrelGeo, stockGeo, magGeo, opticGeo, flashGeo);

  const receiver = new THREE.Mesh(receiverGeo, receiverMat);
  receiver.position.set(0, 0, 0.1);
  group.add(receiver);

  const barrel = new THREE.Mesh(barrelGeo, accentMat);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.015, isHeavyBossRifle ? 0.52 : 0.45);
  group.add(barrel);

  const stock = new THREE.Mesh(stockGeo, polymerMat);
  stock.position.set(0, -0.02, -0.18);
  group.add(stock);

  const mag = new THREE.Mesh(magGeo, receiverMat);
  mag.position.set(0, -0.13, 0.15);
  mag.rotation.x = 0.22;
  group.add(mag);

  const optic = new THREE.Mesh(opticGeo, accentMat);
  optic.position.set(0, 0.085, 0.06);
  group.add(optic);

  const muzzlePoint = new THREE.Object3D();
  muzzlePoint.position.set(0, 0.015, isHeavyBossRifle ? 0.76 : 0.65);
  group.add(muzzlePoint);

  const muzzleFlash = new THREE.Mesh(flashGeo, flashMat);
  muzzleFlash.rotation.x = Math.PI / 2;
  muzzleFlash.position.set(0, 0.015, isHeavyBossRifle ? 0.9 : 0.78);
  group.add(muzzleFlash);

  return { group, muzzlePoint, muzzleFlash };
}

/**
 * Builds an articulated 10+ part composite 3D tactical character grounded at y = 0.
 * Zero single-primitive characters; distinct silhouettes & PBR roughness variation.
 */
export function createCharacterRig(
  archetype: CharacterArchetype,
  contactShadowMat: THREE.MeshBasicMaterial,
  entityId: string,
): ArticulatedCharacterRig {
  const disposables = { geos: [] as THREE.BufferGeometry[], mats: [] as THREE.Material[] };
  const scale = archetype === 'boss_el_ameen' ? 1.16 : 1.0;

  const root = new THREE.Group();
  root.name = entityId;

  // Soft contact shadow disc grounded at y = 0.02
  const shadowGeo = new THREE.PlaneGeometry(1.15 * scale, 1.15 * scale);
  disposables.geos.push(shadowGeo);
  const shadowDisc = new THREE.Mesh(shadowGeo, contactShadowMat);
  shadowDisc.rotation.x = -Math.PI / 2;
  shadowDisc.position.y = 0.025;
  root.add(shadowDisc);

  const bodyPivot = new THREE.Group();
  bodyPivot.scale.setScalar(scale);
  root.add(bodyPivot);

  // Calibrated palette per archetype (varied roughness & metalness)
  const palette =
    archetype === 'player'
      ? {
          shirt: 0x3b443c,
          vest: 0xb79668,
          pants: 0x2a2f38,
          boots: 0x221b15,
          skin: 0xc99672,
          hairOrCap: 0x1b1918,
          accent: 0xd89b3c,
        }
      : archetype === 'boss_el_ameen'
        ? {
            shirt: 0x1e2532,
            vest: 0x171b23,
            pants: 0x1c212b,
            boots: 0x141416,
            skin: 0xbf8a66,
            hairOrCap: 0x192130,
            accent: 0xe6b44c, // Gold precinct officer epaulets & badge
          }
        : {
            shirt: 0x3a322d,
            vest: 0x2d323b,
            pants: 0x26282e,
            boots: 0x1b1714,
            skin: 0xc28e6b,
            hairOrCap: 0x23262b,
            accent: 0x8f392e,
          };

  const shirtMat = new THREE.MeshStandardMaterial({ color: palette.shirt, roughness: 0.84, metalness: 0.05 });
  const vestMat = new THREE.MeshStandardMaterial({ color: palette.vest, roughness: 0.72, metalness: 0.12 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: palette.pants, roughness: 0.88, metalness: 0.04 });
  const bootMat = new THREE.MeshStandardMaterial({ color: palette.boots, roughness: 0.45, metalness: 0.18 });
  const skinMat = new THREE.MeshStandardMaterial({ color: palette.skin, roughness: 0.68, metalness: 0.02 });
  const capMat = new THREE.MeshStandardMaterial({ color: palette.hairOrCap, roughness: 0.62, metalness: 0.1 });
  const accentMat = new THREE.MeshStandardMaterial({
    color: palette.accent,
    roughness: archetype === 'boss_el_ameen' ? 0.22 : 0.4,
    metalness: archetype === 'boss_el_ameen' ? 0.92 : 0.55,
  });
  disposables.mats.push(shirtMat, vestMat, pantsMat, bootMat, skinMat, capMat, accentMat);

  // Legs (pivot at hip height y = 0.86)
  const legGeo = new THREE.BoxGeometry(0.19, 0.68, 0.21);
  const bootGeo = new THREE.BoxGeometry(0.21, 0.22, 0.29);
  disposables.geos.push(legGeo, bootGeo);

  const makeLeg = (xOffset: number) => {
    const legGroup = new THREE.Group();
    legGroup.position.set(xOffset, 0.86, 0);
    const thighShin = new THREE.Mesh(legGeo, pantsMat);
    thighShin.position.y = -0.34;
    thighShin.castShadow = true;
    legGroup.add(thighShin);

    const boot = new THREE.Mesh(bootGeo, bootMat);
    boot.position.set(0, -0.75, 0.04);
    boot.castShadow = true;
    legGroup.add(boot);
    return legGroup;
  };

  const leftLeg = makeLeg(-0.14);
  const rightLeg = makeLeg(0.14);
  bodyPivot.add(leftLeg, rightLeg);

  // Torso group
  const torso = new THREE.Group();
  torso.position.set(0, 0.88, 0);
  bodyPivot.add(torso);

  const chestGeo = new THREE.BoxGeometry(0.48, 0.56, 0.28);
  const vestGeo = new THREE.BoxGeometry(0.52, 0.44, 0.33);
  const beltGeo = new THREE.BoxGeometry(0.5, 0.09, 0.31);
  const pouchGeo = new THREE.BoxGeometry(0.12, 0.14, 0.08);
  const backpackGeo = new THREE.BoxGeometry(0.34, 0.42, 0.16);
  disposables.geos.push(chestGeo, vestGeo, beltGeo, pouchGeo, backpackGeo);

  const chest = new THREE.Mesh(chestGeo, shirtMat);
  chest.position.y = 0.28;
  chest.castShadow = true;
  torso.add(chest);

  const vest = new THREE.Mesh(vestGeo, vestMat);
  vest.position.y = 0.31;
  vest.castShadow = true;
  torso.add(vest);

  const belt = new THREE.Mesh(beltGeo, bootMat);
  belt.position.y = 0.04;
  torso.add(belt);

  // Tactical chest pouches / brass buckle accent
  const buckle = new THREE.Mesh(pouchGeo, accentMat);
  buckle.position.set(0, 0.04, 0.15);
  buckle.scale.set(0.75, 0.55, 0.45);
  torso.add(buckle);

  if (archetype === 'player') {
    const pack = new THREE.Mesh(backpackGeo, vestMat);
    pack.position.set(0, 0.32, -0.2);
    pack.castShadow = true;
    torso.add(pack);
  }

  if (archetype === 'boss_el_ameen') {
    // Officer shoulder epaulets & chest insignia
    const epGeo = new THREE.BoxGeometry(0.16, 0.045, 0.16);
    disposables.geos.push(epGeo);
    const epL = new THREE.Mesh(epGeo, accentMat);
    epL.position.set(-0.26, 0.57, 0);
    const epR = new THREE.Mesh(epGeo, accentMat);
    epR.position.set(0.26, 0.57, 0);
    torso.add(epL, epR);

    // Coat tails for imposing officer silhouette
    const coatGeo = new THREE.BoxGeometry(0.52, 0.32, 0.3);
    disposables.geos.push(coatGeo);
    const coat = new THREE.Mesh(coatGeo, shirtMat);
    coat.position.set(0, -0.1, -0.02);
    torso.add(coat);
  }

  // Head group
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.62, 0);
  torso.add(headGroup);

  const headGeo = new THREE.BoxGeometry(0.26, 0.28, 0.26);
  const visorGeo = new THREE.BoxGeometry(0.24, 0.07, 0.06);
  disposables.geos.push(headGeo, visorGeo);

  const headMesh = new THREE.Mesh(headGeo, skinMat);
  headMesh.position.y = 0.14;
  headMesh.castShadow = true;
  headGroup.add(headMesh);

  if (archetype === 'boss_el_ameen') {
    // Peaked officer cap + gold emblem + dark aviators
    const capCrownGeo = new THREE.CylinderGeometry(0.17, 0.145, 0.11, 10);
    const capBrimGeo = new THREE.BoxGeometry(0.26, 0.03, 0.14);
    const badgeGeo = new THREE.BoxGeometry(0.06, 0.06, 0.03);
    disposables.geos.push(capCrownGeo, capBrimGeo, badgeGeo);

    const crown = new THREE.Mesh(capCrownGeo, capMat);
    crown.position.set(0, 0.31, 0);
    headGroup.add(crown);

    const brim = new THREE.Mesh(capBrimGeo, bootMat);
    brim.position.set(0, 0.255, 0.13);
    headGroup.add(brim);

    const badge = new THREE.Mesh(badgeGeo, accentMat);
    badge.position.set(0, 0.31, 0.155);
    headGroup.add(badge);

    const glasses = new THREE.Mesh(visorGeo, bootMat);
    glasses.position.set(0, 0.16, 0.125);
    headGroup.add(glasses);
  } else if (archetype === 'player') {
    // Hair & tactical headset / sunglasses
    const hairGeo = new THREE.BoxGeometry(0.275, 0.11, 0.275);
    disposables.geos.push(hairGeo);
    const hair = new THREE.Mesh(hairGeo, capMat);
    hair.position.set(0, 0.255, -0.01);
    headGroup.add(hair);

    const glasses = new THREE.Mesh(visorGeo, bootMat);
    glasses.position.set(0, 0.16, 0.12);
    headGroup.add(glasses);
  } else {
    // Henchman patrol cap + bandana
    const capGeo = new THREE.BoxGeometry(0.275, 0.1, 0.28);
    const brimGeo = new THREE.BoxGeometry(0.24, 0.025, 0.11);
    const scarfGeo = new THREE.BoxGeometry(0.28, 0.09, 0.27);
    disposables.geos.push(capGeo, brimGeo, scarfGeo);

    const cap = new THREE.Mesh(capGeo, capMat);
    cap.position.set(0, 0.255, 0);
    headGroup.add(cap);

    const brim = new THREE.Mesh(brimGeo, capMat);
    brim.position.set(0, 0.22, 0.14);
    headGroup.add(brim);

    const scarf = new THREE.Mesh(scarfGeo, accentMat);
    scarf.position.set(0, 0.05, 0.01);
    headGroup.add(scarf);
  }

  // Arms
  const armGeo = new THREE.BoxGeometry(0.15, 0.52, 0.16);
  disposables.geos.push(armGeo);

  const leftArm = new THREE.Group();
  leftArm.position.set(-0.32, 0.48, 0.04);
  const leftArmMesh = new THREE.Mesh(armGeo, shirtMat);
  leftArmMesh.position.set(0, -0.18, 0.14);
  leftArmMesh.rotation.x = -Math.PI / 3.2;
  leftArmMesh.castShadow = true;
  leftArm.add(leftArmMesh);
  torso.add(leftArm);

  const rightArm = new THREE.Group();
  rightArm.position.set(0.32, 0.48, 0.04);
  const rightArmMesh = new THREE.Mesh(armGeo, shirtMat);
  rightArmMesh.position.set(0, -0.18, 0.14);
  rightArmMesh.rotation.x = -Math.PI / 2.4;
  rightArmMesh.castShadow = true;
  rightArm.add(rightArmMesh);
  torso.add(rightArm);

  // Composite Rifle mounted to right arm
  const rifle = buildCompositeRifle(archetype === 'boss_el_ameen', disposables);
  rifle.group.position.set(-0.08, -0.22, 0.34);
  rightArm.add(rifle.group);

  // Invisible simplified proxy hitboxes for razor-fast raycasting (head + body)
  const hitboxMat = new THREE.MeshBasicMaterial({ visible: false });
  const bodyHitGeo = new THREE.BoxGeometry(0.76, 1.32, 0.62);
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
    muzzlePoint: rifle.muzzlePoint,
    headHitbox,
    bodyHitbox,
    muzzleFlash: rifle.muzzleFlash,
    dispose: () => {
      disposables.geos.forEach((g) => g.dispose());
      disposables.mats.forEach((m) => m.dispose());
    },
  };
}
