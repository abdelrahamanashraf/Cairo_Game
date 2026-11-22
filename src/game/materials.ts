import * as THREE from 'three';

export interface CairoMaterialLibrary {
  asphalt: THREE.MeshStandardMaterial;
  sidewalk: THREE.MeshStandardMaterial;
  courtyardStone: THREE.MeshStandardMaterial;
  buildingOchre: THREE.MeshStandardMaterial;
  buildingSandstone: THREE.MeshStandardMaterial;
  buildingTerracotta: THREE.MeshStandardMaterial;
  precinctFacade: THREE.MeshStandardMaterial;
  shutterGreen: THREE.MeshStandardMaterial;
  wroughtIron: THREE.MeshStandardMaterial;
  concreteBarrier: THREE.MeshStandardMaterial;
  crateWood: THREE.MeshStandardMaterial;
  awningStripe: THREE.MeshStandardMaterial;
  taxiWhite: THREE.MeshStandardMaterial;
  taxiBlack: THREE.MeshStandardMaterial;
  taxiGlass: THREE.MeshStandardMaterial;
  taxiRoofSign: THREE.MeshStandardMaterial;
  palmTrunk: THREE.MeshStandardMaterial;
  palmFrond: THREE.MeshStandardMaterial;
  distantSkyline: THREE.MeshStandardMaterial;
  contactShadow: THREE.MeshBasicMaterial;
  dispose: () => void;
}

function makeCanvasTexture(
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  maxAnisotropy: number,
  repeatX = 1,
  repeatY = 1,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  draw(ctx, width, height);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

export function createCairoMaterials(renderer: THREE.WebGLRenderer): CairoMaterialLibrary {
  const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const textures: THREE.Texture[] = [];
  const materials: THREE.Material[] = [];

  const registerTex = (t: THREE.CanvasTexture) => {
    textures.push(t);
    return t;
  };
  const registerMat = <T extends THREE.Material>(m: T): T => {
    materials.push(m);
    return m;
  };

  // Dusty Cairo Asphalt
  const asphaltTex = registerTex(
    makeCanvasTexture(
      512,
      512,
      (ctx, w, h) => {
        ctx.fillStyle = '#363537';
        ctx.fillRect(0, 0, w, h);
        // Dust grit and aggregate speckles
        for (let i = 0; i < 6000; i++) {
          const x = Math.random() * w;
          const y = Math.random() * h;
          const v = 42 + Math.floor(Math.random() * 44);
          const warm = Math.random() > 0.65 ? 16 : 0;
          ctx.fillStyle = `rgb(${v + warm}, ${v + Math.floor(warm * 0.7)}, ${v})`;
          ctx.fillRect(x, y, 2, 2);
        }
        // Subtle sand drift along edges
        const grad = ctx.createLinearGradient(0, 0, w, 0);
        grad.addColorStop(0, 'rgba(186, 146, 98, 0.24)');
        grad.addColorStop(0.15, 'rgba(186, 146, 98, 0.0)');
        grad.addColorStop(0.85, 'rgba(186, 146, 98, 0.0)');
        grad.addColorStop(1, 'rgba(186, 146, 98, 0.24)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        // Faded dashed road divider
        ctx.fillStyle = 'rgba(232, 210, 165, 0.35)';
        ctx.fillRect(w * 0.485, 30, w * 0.03, 180);
        ctx.fillRect(w * 0.485, 290, w * 0.03, 180);
      },
      maxAniso,
      8,
      8,
    ),
  );

  // Courtyard Sandstone Paving
  const stoneTex = registerTex(
    makeCanvasTexture(
      512,
      512,
      (ctx, w, h) => {
        ctx.fillStyle = '#9a8468';
        ctx.fillRect(0, 0, w, h);
        const cols = 4;
        const rows = 4;
        const cw = w / cols;
        const rh = h / rows;
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const shade = 148 + Math.floor(Math.random() * 24);
            ctx.fillStyle = `rgb(${shade + 12}, ${shade - 4}, ${shade - 26})`;
            ctx.fillRect(c * cw + 3, r * rh + 3, cw - 6, rh - 6);
          }
        }
        // Surface dust
        for (let i = 0; i < 2200; i++) {
          ctx.fillStyle = 'rgba(220, 185, 138, 0.14)';
          ctx.fillRect(Math.random() * w, Math.random() * h, 3, 2);
        }
      },
      maxAniso,
      10,
      10,
    ),
  );

  // Cairo Facade Generator (Plaster + Windows + Shutters)
  const makeFacadeTexture = (baseHex: string, trimHex: string, shutterHex: string, rows = 4, cols = 4) =>
    registerTex(
      makeCanvasTexture(
        512,
        512,
        (ctx, w, h) => {
          ctx.fillStyle = baseHex;
          ctx.fillRect(0, 0, w, h);
          // Weathered plaster mottling
          for (let i = 0; i < 1600; i++) {
            ctx.fillStyle = i % 2 === 0 ? 'rgba(65, 42, 22, 0.06)' : 'rgba(255, 232, 195, 0.05)';
            ctx.fillRect(Math.random() * w, Math.random() * h, 18, 10);
          }
          // Floor cornice bands
          const rowH = h / rows;
          const colW = w / cols;
          for (let r = 0; r < rows; r++) {
            ctx.fillStyle = trimHex;
            ctx.fillRect(0, r * rowH, w, 9);
            ctx.fillStyle = 'rgba(0,0,0,0.16)';
            ctx.fillRect(0, r * rowH + 9, w, 4);

            for (let c = 0; c < cols; c++) {
              const wx = c * colW + colW * 0.22;
              const wy = r * rowH + rowH * 0.22;
              const ww = colW * 0.56;
              const wh = rowH * 0.58;
              // Dark window recess
              ctx.fillStyle = '#1f2329';
              ctx.fillRect(wx, wy, ww, wh);
              // Warm indoor lamp bounce on a few windows
              if ((r + c) % 3 === 1) {
                const g = ctx.createLinearGradient(wx, wy, wx, wy + wh);
                g.addColorStop(0, 'rgba(232, 165, 76, 0.42)');
                g.addColorStop(1, 'rgba(60, 38, 18, 0.25)');
                ctx.fillStyle = g;
                ctx.fillRect(wx + 4, wy + 4, ww - 8, wh - 8);
              }
              // Wooden louvered shutters flanking window
              ctx.fillStyle = shutterHex;
              ctx.fillRect(wx - 10, wy, 10, wh);
              ctx.fillRect(wx + ww, wy, 10, wh);
              // Horizontal louver lines
              ctx.fillStyle = 'rgba(0,0,0,0.28)';
              for (let ly = wy + 6; ly < wy + wh; ly += 8) {
                ctx.fillRect(wx - 10, ly, 10, 2);
                ctx.fillRect(wx + ww, ly, 10, 2);
              }
              // Stone sill
              ctx.fillStyle = trimHex;
              ctx.fillRect(wx - 12, wy + wh, ww + 24, 6);
            }
          }
        },
        maxAniso,
        1,
        1,
      ),
    );

  const ochreFacadeTex = makeFacadeTexture('#c59b6d', '#dec4a1', '#3b5748', 4, 4);
  const sandstoneFacadeTex = makeFacadeTexture('#b69776', '#d3be9f', '#5c402c', 4, 3);
  const terracottaFacadeTex = makeFacadeTexture('#b27452', '#d2a886', '#2e463b', 3, 4);
  const precinctFacadeTex = makeFacadeTexture('#c7b395', '#e4d5bc', '#263442', 3, 5);

  // Concrete Jersey Barrier with Amber/Black Hazard Band
  const barrierTex = registerTex(
    makeCanvasTexture(
      256,
      128,
      (ctx, w, h) => {
        ctx.fillStyle = '#9b958b';
        ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 800; i++) {
          ctx.fillStyle = 'rgba(50,45,38,0.12)';
          ctx.fillRect(Math.random() * w, Math.random() * h, 4, 4);
        }
        // Hazard stripe band across top
        ctx.fillStyle = '#d98c2b';
        ctx.fillRect(0, 14, w, 26);
        ctx.fillStyle = '#1b1d20';
        for (let x = -30; x < w + 30; x += 36) {
          ctx.beginPath();
          ctx.moveTo(x, 14);
          ctx.lineTo(x + 16, 14);
          ctx.lineTo(x + 4, 40);
          ctx.lineTo(x - 12, 40);
          ctx.closePath();
          ctx.fill();
        }
      },
      maxAniso,
      1,
      1,
    ),
  );

  // Market Awning Stripes (Warm Cairo Burgundy & Cream)
  const awningTex = registerTex(
    makeCanvasTexture(
      256,
      256,
      (ctx, w, h) => {
        const stripeW = 32;
        for (let x = 0; x < w; x += stripeW) {
          ctx.fillStyle = (x / stripeW) % 2 === 0 ? '#9c3c2e' : '#e6d3b3';
          ctx.fillRect(x, 0, stripeW, h);
        }
        // Subtle sun fade
        ctx.fillStyle = 'rgba(232, 180, 120, 0.14)';
        ctx.fillRect(0, 0, w, h);
      },
      maxAniso,
      2,
      1,
    ),
  );

  // Soft Radial Contact Shadow Texture
  const shadowTex = registerTex(
    makeCanvasTexture(
      128,
      128,
      (ctx, w, h) => {
        const g = ctx.createRadialGradient(w / 2, h / 2, 8, w / 2, h / 2, w / 2);
        g.addColorStop(0, 'rgba(18, 12, 8, 0.72)');
        g.addColorStop(0.55, 'rgba(18, 12, 8, 0.34)');
        g.addColorStop(1, 'rgba(18, 12, 8, 0.0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      },
      1,
      1,
      1,
    ),
  );

  return {
    asphalt: registerMat(new THREE.MeshStandardMaterial({ map: asphaltTex, roughness: 0.92, metalness: 0.04 })),
    sidewalk: registerMat(new THREE.MeshStandardMaterial({ color: 0xb7a184, roughness: 0.88, metalness: 0.02 })),
    courtyardStone: registerMat(new THREE.MeshStandardMaterial({ map: stoneTex, roughness: 0.85, metalness: 0.05 })),
    buildingOchre: registerMat(new THREE.MeshStandardMaterial({ map: ochreFacadeTex, roughness: 0.86, metalness: 0.04 })),
    buildingSandstone: registerMat(new THREE.MeshStandardMaterial({ map: sandstoneFacadeTex, roughness: 0.88, metalness: 0.03 })),
    buildingTerracotta: registerMat(new THREE.MeshStandardMaterial({ map: terracottaFacadeTex, roughness: 0.85, metalness: 0.04 })),
    precinctFacade: registerMat(new THREE.MeshStandardMaterial({ map: precinctFacadeTex, roughness: 0.82, metalness: 0.06 })),
    shutterGreen: registerMat(new THREE.MeshStandardMaterial({ color: 0x355143, roughness: 0.78, metalness: 0.05 })),
    wroughtIron: registerMat(new THREE.MeshStandardMaterial({ color: 0x26292e, roughness: 0.42, metalness: 0.78 })),
    concreteBarrier: registerMat(new THREE.MeshStandardMaterial({ map: barrierTex, roughness: 0.9, metalness: 0.05 })),
    crateWood: registerMat(new THREE.MeshStandardMaterial({ color: 0x8a613c, roughness: 0.86, metalness: 0.04 })),
    awningStripe: registerMat(new THREE.MeshStandardMaterial({ map: awningTex, roughness: 0.82, metalness: 0.02, side: THREE.DoubleSide })),
    taxiWhite: registerMat(new THREE.MeshStandardMaterial({ color: 0xebe4d6, roughness: 0.32, metalness: 0.38 })),
    taxiBlack: registerMat(new THREE.MeshStandardMaterial({ color: 0x1b1e23, roughness: 0.36, metalness: 0.45 })),
    taxiGlass: registerMat(new THREE.MeshStandardMaterial({ color: 0x202b36, roughness: 0.14, metalness: 0.82 })),
    taxiRoofSign: registerMat(
      new THREE.MeshStandardMaterial({
        color: 0xf6c344,
        emissive: 0xd48a1e,
        emissiveIntensity: 0.55,
        roughness: 0.3,
        metalness: 0.1,
      }),
    ),
    palmTrunk: registerMat(new THREE.MeshStandardMaterial({ color: 0x6f533b, roughness: 0.94, metalness: 0.02 })),
    palmFrond: registerMat(new THREE.MeshStandardMaterial({ color: 0x4b6a3b, roughness: 0.78, metalness: 0.04, side: THREE.DoubleSide })),
    distantSkyline: registerMat(new THREE.MeshStandardMaterial({ color: 0x9b7960, roughness: 0.94, metalness: 0.02 })),
    contactShadow: registerMat(
      new THREE.MeshBasicMaterial({
        map: shadowTex,
        transparent: true,
        depthWrite: false,
        opacity: 0.55,
      }),
    ),
    dispose: () => {
      textures.forEach((t) => t.dispose());
      materials.forEach((m) => m.dispose());
    },
  };
}
