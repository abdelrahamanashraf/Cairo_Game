import * as THREE from 'three';
import { CairoMaterialLibrary } from './materials';
import { AABBCollider } from './types';

export interface ArenaPickup {
  id: string;
  kind: 'medkit' | 'ammo';
  label: string;
  position: THREE.Vector3;
  mesh: THREE.Group;
  active: boolean;
  respawnTimer: number;
}

export interface ShubraArenaData {
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

export function buildShubraArena(mats: CairoMaterialLibrary): ShubraArenaData {
  const root = new THREE.Group();
  const colliders: AABBCollider[] = [];
  const sightOccluders: THREE.Object3D[] = [];
  const pickups: ArenaPickup[] = [];
  const geos: THREE.BufferGeometry[] = [];
  const extraMats: THREE.Material[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geos.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    extraMats.push(m);
    return m;
  };

  // 1. Extended Terrain & Roadbed (never boxed in an empty void)
  const outerGround = new THREE.Mesh(
    trackGeo(new THREE.PlaneGeometry(360, 360)),
    trackMat(new THREE.MeshStandardMaterial({ color: 0x8f7354, roughness: 0.96, metalness: 0.02 })),
  );
  outerGround.rotation.x = -Math.PI / 2;
  outerGround.position.y = -0.04;
  outerGround.receiveShadow = true;
  root.add(outerGround);

  // Main Shubra Street Asphalt
  const asphalt = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(66, 66)), mats.asphalt);
  asphalt.rotation.x = -Math.PI / 2;
  asphalt.position.y = 0;
  asphalt.receiveShadow = true;
  root.add(asphalt);

  // Central Precinct Courtyard Stone Apron (offset Y >= 0.025 to prevent Z-fighting)
  const courtyard = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(34, 0.08, 30)), mats.courtyardStone);
  courtyard.position.set(0, 0.02, -4);
  courtyard.receiveShadow = true;
  root.add(courtyard);

  // Sidewalks bordering East/West blocks
  const sidewalkGeo = trackGeo(new THREE.BoxGeometry(6, 0.16, 62));
  const swWest = new THREE.Mesh(sidewalkGeo, mats.sidewalk);
  swWest.position.set(-24, 0.08, 0);
  swWest.receiveShadow = true;
  const swEast = new THREE.Mesh(sidewalkGeo, mats.sidewalk);
  swEast.position.set(24, 0.08, 0);
  swEast.receiveShadow = true;
  root.add(swWest, swEast);

  // Helper to register an architectural block + collider + sight occluder
  const addBoxCollider = (
    id: string,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    isCover = false,
    blocksSight = true,
  ) => {
    colliders.push({
      id,
      minX: x - w / 2,
      maxX: x + w / 2,
      minY: y - h / 2,
      maxY: y + h / 2,
      minZ: z - d / 2,
      maxZ: z + d / 2,
      isCover,
      blocksSight,
    });
  };

  // 2. North Landmark: Shubra Precinct Building (Composite multi-part landmark)
  const precinctGroup = new THREE.Group();
  precinctGroup.position.set(0, 0, -29);
  root.add(precinctGroup);

  const precinctMain = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(44, 15, 10)), mats.precinctFacade);
  precinctMain.position.set(0, 7.5, 0);
  precinctMain.castShadow = true;
  precinctMain.receiveShadow = true;
  precinctGroup.add(precinctMain);
  sightOccluders.push(precinctMain);

  // Precinct Portico Archway & Columns
  const porticoRoof = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(12, 1.2, 4.5)), mats.sidewalk);
  porticoRoof.position.set(0, 5.2, 6.2);
  porticoRoof.castShadow = true;
  precinctGroup.add(porticoRoof);

  const colGeo = trackGeo(new THREE.CylinderGeometry(0.45, 0.52, 5.2, 10));
  [-4.6, 4.6].forEach((cx) => {
    const col = new THREE.Mesh(colGeo, mats.sidewalk);
    col.position.set(cx, 2.6, 7.6);
    col.castShadow = true;
    col.receiveShadow = true;
    precinctGroup.add(col);
  });

  // Recessed dark doorway where El-Ameen emerges
  const doorwayMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x16191f, roughness: 0.9, metalness: 0.1 }));
  const doorway = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(5.6, 4.4, 0.5)), doorwayMat);
  doorway.position.set(0, 2.2, 5.05);
  precinctGroup.add(doorway);

  // Amber precinct entrance flood-glow plaque
  const lanternMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffd28a,
      emissive: 0xe89b3c,
      emissiveIntensity: 1.35,
      roughness: 0.25,
    }),
  );
  [-3.4, 3.4].forEach((lx) => {
    const lamp = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.45, 0.7, 0.35)), lanternMat);
    lamp.position.set(lx, 3.8, 5.18);
    precinctGroup.add(lamp);
  });

  // Precinct Rooftop Water Tanks & Radio Mast
  const tankMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x8c877e, roughness: 0.65, metalness: 0.35 }));
  const tankGeo = trackGeo(new THREE.CylinderGeometry(1.4, 1.4, 2.6, 12));
  [-12, -8.5, 11].forEach((tx) => {
    const tank = new THREE.Mesh(tankGeo, tankMat);
    tank.position.set(tx, 16.3, 0);
    precinctGroup.add(tank);
  });
  const mast = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.08, 0.16, 7.5, 6)), mats.wroughtIron);
  mast.position.set(0, 18.7, 0);
  precinctGroup.add(mast);

  addBoxCollider('precinct_north', 0, 7.5, -29, 44, 15, 10, false, true);

  // 3. East & West Shubra Apartment Blocks with Balconies & Awnings
  const buildCairoApartment = (
    id: string,
    x: number,
    z: number,
    w: number,
    h: number,
    d: number,
    facadeMat: THREE.MeshStandardMaterial,
    facingDir: 1 | -1, // +1 faces East (+X), -1 faces West (-X)
  ) => {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    root.add(g);

    const body = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(w, h, d)), facadeMat);
    body.position.y = h / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    g.add(body);
    sightOccluders.push(body);

    // Parapet cornice
    const parapet = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(w + 0.5, 0.9, d + 0.5)), mats.sidewalk);
    parapet.position.y = h + 0.45;
    g.add(parapet);

    // Cantilevered balconies with wrought iron railings
    const faceX = facingDir * (w / 2 + 0.75);
    const floors = Math.floor(h / 4.2);
    for (let f = 1; f < floors; f++) {
      const by = f * 4.1;
      for (const bz of [-d * 0.25, d * 0.25]) {
        const slab = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.5, 0.22, 3.8)), mats.sidewalk);
        slab.position.set(faceX, by, bz);
        slab.castShadow = true;
        g.add(slab);

        const rail = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.08, 0.95, 3.8)), mats.wroughtIron);
        rail.position.set(faceX + facingDir * 0.7, by + 0.55, bz);
        g.add(rail);
      }
    }

    // Ground floor striped Cairo shop awning
    const awning = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.4, 0.14, d * 0.75)), mats.awningStripe);
    awning.position.set(facingDir * (w / 2 + 1.15), 3.35, 0);
    awning.rotation.z = -facingDir * 0.28;
    awning.castShadow = true;
    g.add(awning);

    // Rooftop cylindrical water tank
    const tank = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(1.1, 1.1, 2.0, 10)), tankMat);
    tank.position.set(-facingDir * 1.2, h + 1.4, d * 0.18);
    g.add(tank);

    addBoxCollider(id, x, h / 2, z, w, h, d, false, true);
  };

  // West street frontage
  buildCairoApartment('apt_w1', -32, -14, 11, 17, 17, mats.buildingOchre, 1);
  buildCairoApartment('apt_w2', -32, 6, 11, 14, 18, mats.buildingTerracotta, 1);
  buildCairoApartment('apt_w3', -32, 24, 11, 16, 14, mats.buildingSandstone, 1);

  // East street frontage
  buildCairoApartment('apt_e1', 32, -14, 11, 16, 17, mats.buildingSandstone, -1);
  buildCairoApartment('apt_e2', 32, 6, 11, 19, 18, mats.buildingOchre, -1);
  buildCairoApartment('apt_e3', 32, 24, 11, 14, 14, mats.buildingTerracotta, -1);

  // South street perimeter wall + alleyway gate (keeps playable area grounded)
  const southWallLeft = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(22, 4.2, 2.5)), mats.buildingSandstone);
  southWallLeft.position.set(-16, 2.1, 31);
  southWallLeft.castShadow = true;
  southWallLeft.receiveShadow = true;
  const southWallRight = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(22, 4.2, 2.5)), mats.buildingSandstone);
  southWallRight.position.set(16, 2.1, 31);
  southWallRight.castShadow = true;
  southWallRight.receiveShadow = true;
  root.add(southWallLeft, southWallRight);
  sightOccluders.push(southWallLeft, southWallRight);

  addBoxCollider('south_perimeter', 0, 2.5, 31, 62, 5, 2.6, false, true);

  // 4. Composite White-and-Black Cairo Taxis (Tactical Cover Vehicles)
  const buildCairoTaxi = (id: string, x: number, z: number, rotY: number) => {
    const taxi = new THREE.Group();
    taxi.position.set(x, 0, z);
    taxi.rotation.y = rotY;
    root.add(taxi);

    // Lower body (black Cairo taxi lower skirt)
    const lowerBody = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.05, 0.55, 4.5)), mats.taxiBlack);
    lowerBody.position.y = 0.62;
    lowerBody.castShadow = true;
    lowerBody.receiveShadow = true;
    taxi.add(lowerBody);

    // Upper chassis (white hood + trunk)
    const upperBody = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.0, 0.36, 4.35)), mats.taxiWhite);
    upperBody.position.y = 1.05;
    upperBody.castShadow = true;
    taxi.add(upperBody);

    // Cabin greenhouse
    const cabin = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.78, 0.62, 2.15)), mats.taxiGlass);
    cabin.position.set(0, 1.5, -0.1);
    cabin.castShadow = true;
    taxi.add(cabin);

    // White roof cap + illuminated yellow TAXI sign
    const roof = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.72, 0.1, 2.05)), mats.taxiWhite);
    roof.position.set(0, 1.84, -0.1);
    taxi.add(roof);

    const sign = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.65, 0.22, 0.26)), mats.taxiRoofSign);
    sign.position.set(0, 2.0, 0.1);
    taxi.add(sign);

    // 4 wheels with metallic hubs
    const tireGeo = trackGeo(new THREE.CylinderGeometry(0.36, 0.36, 0.26, 12));
    const hubGeo = trackGeo(new THREE.CylinderGeometry(0.18, 0.18, 0.28, 8));
    const wheelOffsets: Array<[number, number]> = [
      [-1.02, 1.38],
      [1.02, 1.38],
      [-1.02, -1.38],
      [1.02, -1.38],
    ];
    wheelOffsets.forEach(([wx, wz]) => {
      const tire = new THREE.Mesh(tireGeo, mats.taxiBlack);
      tire.rotation.z = Math.PI / 2;
      tire.position.set(wx, 0.36, wz);
      taxi.add(tire);

      const hub = new THREE.Mesh(hubGeo, mats.sidewalk);
      hub.rotation.z = Math.PI / 2;
      hub.position.set(wx, 0.36, wz);
      taxi.add(hub);
    });

    // Contact shadow underneath car
    const shadow = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(3.1, 5.4)), mats.contactShadow);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.03;
    taxi.add(shadow);

    // Axis-aligned bounding footprint for reliable sliding collision + sight cover
    const isTurned = Math.abs(Math.sin(rotY)) > 0.6;
    const bw = isTurned ? 4.4 : 2.3;
    const bd = isTurned ? 2.3 : 4.4;
    addBoxCollider(id, x, 0.9, z, bw, 1.8, bd, true, true);
    sightOccluders.push(lowerBody, upperBody, cabin);
  };

  buildCairoTaxi('taxi_1', -11.5, 11.5, 0.24);
  buildCairoTaxi('taxi_2', 12.5, 2.5, -0.35);
  buildCairoTaxi('taxi_3', -13.0, -11.0, Math.PI / 2 - 0.18);

  // 5. Concrete Precinct Barricades & Market Crates (Tactical Waist-High Cover)
  const addBarricade = (id: string, x: number, z: number, rotY = 0) => {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = rotY;
    root.add(g);

    const base = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(3.6, 0.45, 0.95)), mats.concreteBarrier);
    base.position.y = 0.225;
    base.castShadow = true;
    base.receiveShadow = true;
    g.add(base);

    const top = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(3.5, 0.85, 0.55)), mats.concreteBarrier);
    top.position.y = 0.85;
    top.castShadow = true;
    top.receiveShadow = true;
    g.add(top);

    sightOccluders.push(base, top);
    const rotated = Math.abs(Math.sin(rotY)) > 0.6;
    addBoxCollider(id, x, 0.65, z, rotated ? 1.0 : 3.6, 1.3, rotated ? 3.6 : 1.0, true, true);
  };

  addBarricade('bar_center_south', 0, 12.5, 0);
  addBarricade('bar_center_mid_l', -6.8, 1.5, 0.15);
  addBarricade('bar_center_mid_r', 6.8, -2.5, -0.12);
  addBarricade('bar_precinct_l', -7.2, -16.5, 0.08);
  addBarricade('bar_precinct_r', 7.2, -16.5, -0.08);

  // Market Crate Clusters
  const addCrateStack = (id: string, x: number, z: number) => {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    root.add(g);

    const c1 = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.5, 1.35, 1.5)), mats.crateWood);
    c1.position.set(-0.55, 0.675, 0);
    c1.castShadow = true;
    c1.receiveShadow = true;
    const c2 = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.2, 1.05, 1.2)), mats.crateWood);
    c2.position.set(0.85, 0.525, 0.25);
    c2.rotation.y = 0.28;
    c2.castShadow = true;
    c2.receiveShadow = true;
    const c3 = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.95, 0.85, 0.95)), mats.crateWood);
    c3.position.set(-0.35, 1.78, -0.1);
    c3.rotation.y = -0.2;
    c3.castShadow = true;
    g.add(c1, c2, c3);

    sightOccluders.push(c1, c2);
    addBoxCollider(id, x + 0.1, 0.9, z + 0.1, 2.8, 1.8, 1.8, true, true);
  };

  addCrateStack('crates_east', 16.5, 12.5);
  addCrateStack('crates_west', -17.5, -1.5);
  addCrateStack('crates_north_e', 16.2, -14.2);

  // 6. Cairo Date Palm Trees (Segmented Trunk + Radiating Fronds)
  const buildDatePalm = (x: number, z: number, height: number) => {
    const palm = new THREE.Group();
    palm.position.set(x, 0, z);
    root.add(palm);

    const segments = 5;
    const segH = height / segments;
    for (let i = 0; i < segments; i++) {
      const rBottom = 0.34 - i * 0.03;
      const rTop = 0.31 - i * 0.03;
      const seg = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(rTop, rBottom, segH + 0.08, 7)), mats.palmTrunk);
      seg.position.set(Math.sin(i * 0.35) * 0.14, i * segH + segH / 2, 0);
      seg.castShadow = true;
      palm.add(seg);
    }

    const crownY = height + 0.15;
    const frondGeo = trackGeo(new THREE.ConeGeometry(0.55, 3.2, 4));
    for (let f = 0; f < 8; f++) {
      const angle = (f / 8) * Math.PI * 2;
      const frondPivot = new THREE.Group();
      frondPivot.position.set(0.1, crownY, 0);
      frondPivot.rotation.y = angle;
      const frond = new THREE.Mesh(frondGeo, mats.palmFrond);
      frond.rotation.z = -1.18;
      frond.position.set(1.45, -0.22, 0);
      frond.scale.set(0.55, 1, 0.22);
      frond.castShadow = true;
      frondPivot.add(frond);
      palm.add(frondPivot);
    }

    addBoxCollider(`palm_${x}_${z}`, x, 1.5, z, 0.9, 3.0, 0.9, false, false);
  };

  buildDatePalm(-20.5, 18.5, 7.2);
  buildDatePalm(20.5, 18.5, 6.6);
  buildDatePalm(-19.5, -19.5, 7.6);
  buildDatePalm(19.5, -19.5, 7.0);

  // 7. Distant Greater Cairo Skyline Silhouettes (Simulates Clipped Cesium 3D Tiles Horizon)
  const skylineRing = new THREE.Group();
  root.add(skylineRing);

  const towerPositions: Array<[number, number, number, number, number]> = [
    [-70, -75, 16, 36, 14],
    [-42, -88, 18, 48, 16],
    [-12, -96, 15, 34, 15],
    [22, -90, 20, 44, 16],
    [58, -76, 18, 38, 16],
    [82, -35, 16, 32, 18],
    [86, 15, 18, 42, 16],
    [-82, -32, 16, 34, 16],
    [-85, 20, 18, 38, 18],
    [-50, 76, 20, 34, 16],
    [0, 86, 22, 40, 16],
    [52, 76, 18, 36, 16],
  ];
  towerPositions.forEach(([tx, tz, tw, th, td]) => {
    const tower = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(tw, th, td)), mats.distantSkyline);
    tower.position.set(tx, th / 2, tz);
    skylineRing.add(tower);
  });

  // Distant Cairo Tower & Minaret Silhouette on the Sunset Horizon
  const cairoTowerShaft = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(2.6, 3.8, 72, 10)), mats.distantSkyline);
  cairoTowerShaft.position.set(-28, 36, -125);
  const cairoTowerCrown = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(5.2, 3.0, 7, 10)), mats.distantSkyline);
  cairoTowerCrown.position.set(-28, 74, -125);
  skylineRing.add(cairoTowerShaft, cairoTowerCrown);

  const minaretBase = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(5, 22, 5)), mats.distantSkyline);
  minaretBase.position.set(36, 11, -110);
  const minaretSpire = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(2.2, 14, 8)), mats.distantSkyline);
  minaretSpire.position.set(36, 29, -110);
  skylineRing.add(minaretBase, minaretSpire);

  // 8. Tactical Medkit & Ammo Supply Pickups
  const createPickup = (id: string, kind: 'medkit' | 'ammo', x: number, z: number) => {
    const g = new THREE.Group();
    g.position.set(x, 0.55, z);
    root.add(g);

    const bodyMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: kind === 'medkit' ? 0x246c4c : 0xc9872b,
        emissive: kind === 'medkit' ? 0x164a32 : 0x6b4310,
        emissiveIntensity: 0.45,
        roughness: 0.35,
        metalness: 0.25,
      }),
    );
    const crossMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 }));
    const box = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.68, 0.46, 0.48)), bodyMat);
    g.add(box);

    if (kind === 'medkit') {
      const hBar = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.32, 0.09, 0.52)), crossMat);
      const vBar = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.09, 0.32, 0.52)), crossMat);
      g.add(hBar, vBar);
    } else {
      const band = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.72, 0.1, 0.52)), crossMat);
      g.add(band);
    }

    pickups.push({
      id,
      kind,
      label: kind === 'medkit' ? 'Field Medkit (+40 HP)' : 'Rifle Ammo Crate (+60)',
      position: new THREE.Vector3(x, 0.55, z),
      mesh: g,
      active: true,
      respawnTimer: 0,
    });
  };

  createPickup('pickup_med_w', 'medkit', -15.5, 4.5);
  createPickup('pickup_ammo_e', 'ammo', 15.5, -5.5);
  createPickup('pickup_med_n', 'medkit', 11.5, -18.5);

  // 9. Atmospheric Golden-Hour Cairo Dust Motes (Points)
  const dustCount = 260;
  const dustPositions = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    dustPositions[i * 3] = (Math.random() - 0.5) * 64;
    dustPositions[i * 3 + 1] = 0.6 + Math.random() * 11;
    dustPositions[i * 3 + 2] = (Math.random() - 0.5) * 64;
  }
  const dustGeo = trackGeo(new THREE.BufferGeometry());
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
  const dustMat = trackMat(
    new THREE.PointsMaterial({
      color: 0xf5cfa0,
      size: 0.14,
      transparent: true,
      opacity: 0.48,
      depthWrite: false,
    }),
  );
  const dustPoints = new THREE.Points(dustGeo, dustMat);
  root.add(dustPoints);

  return {
    root,
    colliders,
    sightOccluders,
    pickups,
    playerSpawn: new THREE.Vector3(0, 0, 21.5),
    henchmanSpawns: [
      { pos: new THREE.Vector3(-12.5, 0, -4.5), patrolTo: new THREE.Vector3(-5.5, 0, 3.5) },
      { pos: new THREE.Vector3(11.5, 0, -8.5), patrolTo: new THREE.Vector3(5.5, 0, 2.5) },
      { pos: new THREE.Vector3(-3.5, 0, -14.5), patrolTo: new THREE.Vector3(6.5, 0, -13.5) },
      { pos: new THREE.Vector3(16.5, 0, 6.5), patrolTo: new THREE.Vector3(9.5, 0, 12.0) },
      { pos: new THREE.Vector3(-16.5, 0, 6.0), patrolTo: new THREE.Vector3(-9.5, 0, 14.0) },
    ],
    bossSpawn: new THREE.Vector3(0, 0, -21.2),
    bossReinforcementSpawns: [
      new THREE.Vector3(-16.5, 0, -18.5),
      new THREE.Vector3(16.5, 0, -18.5),
    ],
    dustPoints,
    dispose: () => {
      geos.forEach((g) => g.dispose());
      extraMats.forEach((m) => m.dispose());
    },
  };
}
