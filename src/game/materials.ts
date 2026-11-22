import * as THREE from 'three';
import cairoFacadeUrl from '../assets/images/cairo_shubra_facade_1795348416257.jpg';
import cairoAsphaltUrl from '../assets/images/cairo_asphalt_road_1795348417999.jpg';
import cairoSandstoneUrl from '../assets/images/cairo_sandstone_paving_1795348415513.jpg';
import cairoGoldenSkyUrl from '../assets/images/cairo_golden_sky_1795348417619.jpg';

export interface CairoMaterialLibrary {
  asphalt: THREE.MeshStandardMaterial;
  sidewalk: THREE.MeshStandardMaterial;
  courtyardStone: THREE.MeshStandardMaterial;
  travertinePlaza: THREE.MeshStandardMaterial;
  buildingOchre: THREE.MeshStandardMaterial;
  buildingSandstone: THREE.MeshStandardMaterial;
  buildingTerracotta: THREE.MeshStandardMaterial;
  buildingOldBrick: THREE.MeshStandardMaterial;
  precinctFacade: THREE.MeshStandardMaterial;
  villaLimestone: THREE.MeshStandardMaterial;
  modernGlassTower: THREE.MeshPhysicalMaterial;
  shutterGreen: THREE.MeshStandardMaterial;
  wroughtIron: THREE.MeshStandardMaterial;
  concreteBarrier: THREE.MeshStandardMaterial;
  crateWood: THREE.MeshStandardMaterial;
  awningStripe: THREE.MeshStandardMaterial;
  taxiWhite: THREE.MeshPhysicalMaterial;
  taxiBlack: THREE.MeshPhysicalMaterial;
  suvBlack: THREE.MeshPhysicalMaterial;
  carChrome: THREE.MeshStandardMaterial;
  carGlass: THREE.MeshPhysicalMaterial;
  headlightGlow: THREE.MeshStandardMaterial;
  taillightGlow: THREE.MeshStandardMaterial;
  taxiRoofSign: THREE.MeshStandardMaterial;
  palmTrunk: THREE.MeshStandardMaterial;
  palmFrond: THREE.MeshStandardMaterial;
  waterPool: THREE.MeshPhysicalMaterial;
  distantSkyline: THREE.MeshStandardMaterial;
  contactShadow: THREE.MeshBasicMaterial;
  tacticalWeaveBump: THREE.CanvasTexture;
  skyPanoramaUrl: string;
  dispose: () => void;
}

/**
 * Generates a Tangent-Space Normal Map and a Micro-Roughness Map from any loaded
 * photographic image using a fast 3x3 Sobel luminance gradient filter.
 */
function derivePbrMapsFromImage(
  image: HTMLImageElement,
  repeatX: number,
  repeatY: number,
  maxAnisotropy: number,
  normalStrength = 2.1,
  baseRoughness = 185,
  roughnessVariance = 55,
): { normalMap: THREE.CanvasTexture; roughnessMap: THREE.CanvasTexture } {
  const size = 256;
  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = size;
  srcCanvas.height = size;
  const srcCtx = srcCanvas.getContext('2d')!;
  srcCtx.drawImage(image, 0, 0, size, size);
  const srcData = srcCtx.getImageData(0, 0, size, size).data;

  const lum = new Float32Array(size * size);
  for (let i = 0; i < size * size; i++) {
    const idx = i * 4;
    lum[i] = (0.299 * srcData[idx] + 0.587 * srcData[idx + 1] + 0.114 * srcData[idx + 2]) / 255;
  }

  const normCanvas = document.createElement('canvas');
  normCanvas.width = size;
  normCanvas.height = size;
  const normCtx = normCanvas.getContext('2d')!;
  const normImg = normCtx.createImageData(size, size);

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = size;
  roughCanvas.height = size;
  const roughCtx = roughCanvas.getContext('2d')!;
  const roughImg = roughCtx.createImageData(size, size);

  const sample = (x: number, y: number) => {
    const wx = ((x % size) + size) % size;
    const wy = ((y % size) + size) % size;
    return lum[wy * size + wx];
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const tl = sample(x - 1, y - 1);
      const t = sample(x, y - 1);
      const tr = sample(x + 1, y - 1);
      const l = sample(x - 1, y);
      const c = sample(x, y);
      const r = sample(x + 1, y);
      const bl = sample(x - 1, y + 1);
      const b = sample(x, y + 1);
      const br = sample(x + 1, y + 1);

      const dX = (tr + 2 * r + br - (tl + 2 * l + bl)) * normalStrength;
      const dY = (bl + 2 * b + br - (tl + 2 * t + tr)) * normalStrength;
      const dZ = 1.0;
      const invLen = 1.0 / Math.hypot(dX, dY, dZ);

      const outIdx = (y * size + x) * 4;
      normImg.data[outIdx] = Math.round((-dX * invLen * 0.5 + 0.5) * 255);
      normImg.data[outIdx + 1] = Math.round((-dY * invLen * 0.5 + 0.5) * 255);
      normImg.data[outIdx + 2] = Math.round((dZ * invLen * 0.5 + 0.5) * 255);
      normImg.data[outIdx + 3] = 255;

      // Darker cracks/recesses become rougher; raised stone/painted surfaces slightly smoother
      const rVal = Math.max(85, Math.min(250, Math.round(baseRoughness + (0.5 - c) * roughnessVariance)));
      roughImg.data[outIdx] = rVal;
      roughImg.data[outIdx + 1] = rVal;
      roughImg.data[outIdx + 2] = rVal;
      roughImg.data[outIdx + 3] = 255;
    }
  }

  normCtx.putImageData(normImg, 0, 0);
  roughCtx.putImageData(roughImg, 0, 0);

  const normalMap = new THREE.CanvasTexture(normCanvas);
  normalMap.colorSpace = THREE.NoColorSpace;
  normalMap.wrapS = THREE.RepeatWrapping;
  normalMap.wrapT = THREE.RepeatWrapping;
  normalMap.repeat.set(repeatX, repeatY);
  normalMap.anisotropy = maxAnisotropy;
  normalMap.needsUpdate = true;

  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.colorSpace = THREE.NoColorSpace;
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.repeat.set(repeatX, repeatY);
  roughnessMap.anisotropy = maxAnisotropy;
  roughnessMap.needsUpdate = true;

  return { normalMap, roughnessMap };
}

function makeCanvasTexture(
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  maxAnisotropy: number,
  isColor: boolean,
  repeatX = 1,
  repeatY = 1,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  draw(ctx, width, height);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

export function createCairoMaterials(renderer: THREE.WebGLRenderer, isSoftwareGl: boolean): CairoMaterialLibrary {
  const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const textures: THREE.Texture[] = [];
  const materials: THREE.Material[] = [];
  let isDisposed = false;

  const regTex = <T extends THREE.Texture>(t: T): T => {
    textures.push(t);
    return t;
  };
  const regMat = <T extends THREE.Material>(m: T): T => {
    materials.push(m);
    return m;
  };

  // Shared micro-grain plaster/concrete bump map (linear NoColorSpace)
  const stuccoBump = regTex(
    makeCanvasTexture(
      512,
      512,
      (ctx, w, h) => {
        ctx.fillStyle = '#808080';
        ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 14000; i++) {
          const v = 96 + Math.floor(Math.random() * 68);
          ctx.fillStyle = `rgb(${v},${v},${v})`;
          ctx.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 3, 2);
        }
        // Subtle horizontal masonry seams
        ctx.fillStyle = 'rgba(40,40,40,0.45)';
        for (let y = 0; y < h; y += 64) {
          ctx.fillRect(0, y, w, 3);
        }
      },
      maxAniso,
      false,
      2,
      2,
    ),
  );

  // Tactical MOLLE ballistic nylon weave bump map for character vests
  const tacticalWeaveBump = regTex(
    makeCanvasTexture(
      256,
      256,
      (ctx, w, h) => {
        ctx.fillStyle = '#707070';
        ctx.fillRect(0, 0, w, h);
        for (let y = 0; y < h; y += 8) {
          for (let x = 0; x < w; x += 8) {
            ctx.fillStyle = (x + y) % 16 === 0 ? '#a8a8a8' : '#525252';
            ctx.fillRect(x, y, 6, 6);
          }
        }
        // Horizontal MOLLE webbing straps
        ctx.fillStyle = '#c8c8c8';
        for (let y = 16; y < h; y += 44) {
          ctx.fillRect(0, y, w, 14);
        }
      },
      maxAniso,
      false,
      2,
      2,
    ),
  );

  // High-Detail Dusty Cairo Asphalt (Albedo + Bump)
  const asphaltTex = regTex(
    makeCanvasTexture(
      512,
      512,
      (ctx, w, h) => {
        ctx.fillStyle = '#2f2e31';
        ctx.fillRect(0, 0, w, h);
        // Aggregate grit & sun-baked dust variation
        for (let i = 0; i < 14000; i++) {
          const x = Math.random() * w;
          const y = Math.random() * h;
          const v = 35 + Math.floor(Math.random() * 48);
          const warm = Math.random() > 0.62 ? 18 : 0;
          ctx.fillStyle = `rgb(${v + warm}, ${v + Math.floor(warm * 0.7)}, ${v})`;
          ctx.fillRect(x, y, 2, 2);
        }
        // Subtle tar repair seams & cracks
        ctx.strokeStyle = 'rgba(18, 17, 20, 0.65)';
        ctx.lineWidth = 2;
        for (let c = 0; c < 6; c++) {
          ctx.beginPath();
          let cx = Math.random() * w;
          let cy = Math.random() * h;
          ctx.moveTo(cx, cy);
          for (let s = 0; s < 5; s++) {
            cx += (Math.random() - 0.5) * 90;
            cy += (Math.random() - 0.5) * 90;
            ctx.lineTo(cx, cy);
          }
          ctx.stroke();
        }
        // Sand drift along road curbs
        const grad = ctx.createLinearGradient(0, 0, w, 0);
        grad.addColorStop(0, 'rgba(196, 152, 102, 0.34)');
        grad.addColorStop(0.18, 'rgba(196, 152, 102, 0.0)');
        grad.addColorStop(0.82, 'rgba(196, 152, 102, 0.0)');
        grad.addColorStop(1, 'rgba(196, 152, 102, 0.34)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        // Faded Egyptian road dashed line
        ctx.fillStyle = 'rgba(235, 212, 165, 0.42)';
        ctx.fillRect(w * 0.486, 26, w * 0.028, 185);
        ctx.fillRect(w * 0.486, 286, w * 0.028, 185);
      },
      maxAniso,
      true,
      8,
      8,
    ),
  );

  // Courtyard Sandstone Paving (Albedo + Matching Tile Bump)
  const stoneTex = regTex(
    makeCanvasTexture(
      512,
      512,
      (ctx, w, h) => {
        ctx.fillStyle = '#6c5a44';
        ctx.fillRect(0, 0, w, h);
        const cols = 4;
        const rows = 4;
        const cw = w / cols;
        const rh = h / rows;
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const shade = 148 + Math.floor(Math.random() * 28);
            ctx.fillStyle = `rgb(${shade + 16}, ${shade - 2}, ${shade - 28})`;
            ctx.fillRect(c * cw + 4, r * rh + 4, cw - 8, rh - 8);
            // Subtle bevel highlight
            ctx.fillStyle = 'rgba(255,240,210,0.14)';
            ctx.fillRect(c * cw + 4, r * rh + 4, cw - 8, 4);
          }
        }
        for (let i = 0; i < 4500; i++) {
          ctx.fillStyle = i % 2 === 0 ? 'rgba(230, 195, 145, 0.14)' : 'rgba(55, 38, 22, 0.1)';
          ctx.fillRect(Math.random() * w, Math.random() * h, 3, 2);
        }
      },
      maxAniso,
      true,
      10,
      10,
    ),
  );

  const stoneBump = regTex(
    makeCanvasTexture(
      512,
      512,
      (ctx, w, h) => {
        ctx.fillStyle = '#252525';
        ctx.fillRect(0, 0, w, h);
        const cw = w / 4;
        const rh = h / 4;
        for (let r = 0; r < 4; r++) {
          for (let c = 0; c < 4; c++) {
            ctx.fillStyle = '#c8c8c8';
            ctx.fillRect(c * cw + 4, r * rh + 4, cw - 8, rh - 8);
          }
        }
      },
      maxAniso,
      false,
      10,
      10,
    ),
  );

  // Travertine Civic Plaza (New Administrative Capital)
  const travertineTex = regTex(
    makeCanvasTexture(
      512,
      512,
      (ctx, w, h) => {
        ctx.fillStyle = '#b9ad9b';
        ctx.fillRect(0, 0, w, h);
        for (let r = 0; r < 4; r++) {
          for (let c = 0; c < 4; c++) {
            const v = 188 + Math.floor(Math.random() * 18);
            ctx.fillStyle = `rgb(${v + 8}, ${v + 2}, ${v - 8})`;
            ctx.fillRect(c * 128 + 2, r * 128 + 2, 124, 124);
          }
        }
        // Gold architectural inlay strip
        ctx.fillStyle = '#c9973e';
        ctx.fillRect(0, 252, w, 8);
      },
      maxAniso,
      true,
      8,
      8,
    ),
  );

  // Detailed Cairo Architectural Facade Generator
  const makeFacadeTexture = (
    baseHex: string,
    trimHex: string,
    shutterHex: string,
    rows = 4,
    cols = 4,
    arched = false,
  ) =>
    regTex(
      makeCanvasTexture(
        512,
        512,
        (ctx, w, h) => {
          ctx.fillStyle = baseHex;
          ctx.fillRect(0, 0, w, h);
          // Realistic weathered Cairo dust streaks & stucco grain
          for (let i = 0; i < 3600; i++) {
            ctx.fillStyle = i % 2 === 0 ? 'rgba(55, 34, 18, 0.08)' : 'rgba(255, 234, 198, 0.07)';
            ctx.fillRect(Math.random() * w, Math.random() * h, 14, 7);
          }
          // Vertical water/dust weathering near cornices
          const rowH = h / rows;
          const colW = w / cols;
          for (let r = 0; r < rows; r++) {
            ctx.fillStyle = trimHex;
            ctx.fillRect(0, r * rowH, w, 10);
            const dropGrad = ctx.createLinearGradient(0, r * rowH + 10, 0, r * rowH + 28);
            dropGrad.addColorStop(0, 'rgba(30,20,10,0.3)');
            dropGrad.addColorStop(1, 'rgba(30,20,10,0)');
            ctx.fillStyle = dropGrad;
            ctx.fillRect(0, r * rowH + 10, w, 18);

            for (let c = 0; c < cols; c++) {
              const wx = c * colW + colW * 0.22;
              const wy = r * rowH + rowH * 0.22;
              const ww = colW * 0.56;
              const wh = rowH * 0.58;

              // Outer stone frame
              ctx.fillStyle = trimHex;
              ctx.fillRect(wx - 7, wy - 6, ww + 14, wh + 12);

              // Deep recessed glass/interior
              ctx.fillStyle = '#181d24';
              if (arched) {
                ctx.beginPath();
                ctx.arc(wx + ww / 2, wy + ww / 2.6, ww / 2, Math.PI, 0);
                ctx.lineTo(wx + ww, wy + wh);
                ctx.lineTo(wx, wy + wh);
                ctx.closePath();
                ctx.fill();
              } else {
                ctx.fillRect(wx, wy, ww, wh);
              }

              // Warm tungsten apartment interior glow on select windows
              if ((r * 3 + c) % 3 === 1) {
                const glow = ctx.createRadialGradient(
                  wx + ww / 2,
                  wy + wh * 0.55,
                  4,
                  wx + ww / 2,
                  wy + wh * 0.55,
                  ww * 0.8,
                );
                glow.addColorStop(0, 'rgba(246, 184, 88, 0.55)');
                glow.addColorStop(1, 'rgba(42, 26, 14, 0.2)');
                ctx.fillStyle = glow;
                ctx.fillRect(wx + 3, wy + 5, ww - 6, wh - 8);
              }

              // Window glass mullions
              ctx.fillStyle = 'rgba(20, 24, 30, 0.7)';
              ctx.fillRect(wx + ww / 2 - 2, wy, 4, wh);
              ctx.fillRect(wx, wy + wh * 0.45, ww, 3);

              // Wooden Egyptian louvered shutters (Shish)
              ctx.fillStyle = shutterHex;
              ctx.fillRect(wx - 11, wy, 11, wh);
              ctx.fillRect(wx + ww, wy, 11, wh);
              ctx.fillStyle = 'rgba(0,0,0,0.34)';
              for (let ly = wy + 5; ly < wy + wh; ly += 6) {
                ctx.fillRect(wx - 11, ly, 11, 2);
                ctx.fillRect(wx + ww, ly, 11, 2);
              }

              // Projecting sill shadow
              ctx.fillStyle = trimHex;
              ctx.fillRect(wx - 14, wy + wh, ww + 28, 7);
              ctx.fillStyle = 'rgba(0,0,0,0.28)';
              ctx.fillRect(wx - 12, wy + wh + 7, ww + 24, 5);
            }
          }
        },
        maxAniso,
        true,
        1,
        1,
      ),
    );

  const ochreFacadeTex = makeFacadeTexture('#c69a6b', '#e2c9a6', '#335244', 4, 4, false);
  const sandstoneFacadeTex = makeFacadeTexture('#b49472', '#d7c1a2', '#573b27', 4, 3, false);
  const terracottaFacadeTex = makeFacadeTexture('#ae6c4c', '#d5a887', '#2b4439', 3, 4, false);
  const oldBrickFacadeTex = makeFacadeTexture('#9b6548', '#c8a684', '#4d3122', 3, 4, true);
  const precinctFacadeTex = makeFacadeTexture('#c7b293', '#e7d9bf', '#233344', 3, 5, true);
  const villaFacadeTex = makeFacadeTexture('#ded2be', '#f2eadc', '#45515e', 2, 4, true);

  // Modern Curtain-Wall Glass Tower (New Administrative Capital)
  const glassTowerTex = regTex(
    makeCanvasTexture(
      512,
      512,
      (ctx, w, h) => {
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, '#3a556e');
        grad.addColorStop(0.5, '#59748c');
        grad.addColorStop(1, '#8c7258');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        // Steel curtain mullions
        ctx.fillStyle = '#1b222b';
        for (let x = 0; x < w; x += 32) ctx.fillRect(x, 0, 3, h);
        for (let y = 0; y < h; y += 64) ctx.fillRect(0, y, w, 6);
        // Warm illuminated office floors
        for (let y = 0; y < h; y += 64) {
          for (let x = 0; x < w; x += 64) {
            if ((x + y) % 128 === 0) {
              ctx.fillStyle = 'rgba(245, 198, 120, 0.25)';
              ctx.fillRect(x + 4, y + 8, 24, 50);
            }
          }
        }
      },
      maxAniso,
      true,
      2,
      2,
    ),
  );

  // Concrete Jersey Barrier with Realistic Weathering & Hazard Band
  const barrierTex = regTex(
    makeCanvasTexture(
      256,
      128,
      (ctx, w, h) => {
        ctx.fillStyle = '#979186';
        ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 1600; i++) {
          ctx.fillStyle = i % 2 === 0 ? 'rgba(42,38,32,0.14)' : 'rgba(220,210,195,0.1)';
          ctx.fillRect(Math.random() * w, Math.random() * h, 4, 4);
        }
        ctx.fillStyle = '#d98c2b';
        ctx.fillRect(0, 14, w, 24);
        ctx.fillStyle = '#1b1d20';
        for (let x = -30; x < w + 30; x += 36) {
          ctx.beginPath();
          ctx.moveTo(x, 14);
          ctx.lineTo(x + 16, 14);
          ctx.lineTo(x + 4, 38);
          ctx.lineTo(x - 12, 38);
          ctx.closePath();
          ctx.fill();
        }
      },
      maxAniso,
      true,
      1,
      1,
    ),
  );

  // Wood Crate Plank Texture
  const woodTex = regTex(
    makeCanvasTexture(
      256,
      256,
      (ctx, w, h) => {
        ctx.fillStyle = '#8b613a';
        ctx.fillRect(0, 0, w, h);
        for (let y = 0; y < h; y += 32) {
          ctx.fillStyle = y % 64 === 0 ? '#7d5530' : '#966b41';
          ctx.fillRect(0, y, w, 30);
          ctx.fillStyle = '#472d17';
          ctx.fillRect(0, y + 30, w, 2);
        }
        // Diagonal brace
        ctx.strokeStyle = '#6e4926';
        ctx.lineWidth = 18;
        ctx.strokeRect(8, 8, w - 16, h - 16);
      },
      maxAniso,
      true,
      1,
      1,
    ),
  );

  // Market Awning Stripes
  const awningTex = regTex(
    makeCanvasTexture(
      256,
      256,
      (ctx, w, h) => {
        const stripeW = 32;
        for (let x = 0; x < w; x += stripeW) {
          ctx.fillStyle = (x / stripeW) % 2 === 0 ? '#9c362a' : '#e8d7b9';
          ctx.fillRect(x, 0, stripeW, h);
        }
        ctx.fillStyle = 'rgba(232, 180, 120, 0.14)';
        ctx.fillRect(0, 0, w, h);
      },
      maxAniso,
      true,
      2,
      1,
    ),
  );

  // Soft Radial Contact Shadow
  const shadowTex = regTex(
    makeCanvasTexture(
      128,
      128,
      (ctx, w, h) => {
        const g = ctx.createRadialGradient(w / 2, h / 2, 6, w / 2, h / 2, w / 2);
        g.addColorStop(0, 'rgba(12, 8, 5, 0.78)');
        g.addColorStop(0.55, 'rgba(12, 8, 5, 0.36)');
        g.addColorStop(1, 'rgba(12, 8, 5, 0.0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      },
      1,
      true,
      1,
      1,
    ),
  );

  const lib: CairoMaterialLibrary = {
    asphalt: regMat(
      new THREE.MeshStandardMaterial({
        map: asphaltTex,
        bumpMap: stuccoBump,
        bumpScale: 0.035,
        roughness: 0.9,
        metalness: 0.05,
      }),
    ),
    sidewalk: regMat(
      new THREE.MeshStandardMaterial({
        color: 0xb9a285,
        bumpMap: stuccoBump,
        bumpScale: 0.025,
        roughness: 0.88,
        metalness: 0.02,
      }),
    ),
    courtyardStone: regMat(
      new THREE.MeshStandardMaterial({
        map: stoneTex,
        bumpMap: stoneBump,
        bumpScale: 0.045,
        roughness: 0.84,
        metalness: 0.05,
      }),
    ),
    travertinePlaza: regMat(
      new THREE.MeshStandardMaterial({
        map: travertineTex,
        bumpMap: stoneBump,
        bumpScale: 0.02,
        roughness: 0.42,
        metalness: 0.12,
      }),
    ),
    buildingOchre: regMat(
      new THREE.MeshStandardMaterial({
        map: ochreFacadeTex,
        bumpMap: stuccoBump,
        bumpScale: 0.04,
        roughness: 0.86,
        metalness: 0.04,
      }),
    ),
    buildingSandstone: regMat(
      new THREE.MeshStandardMaterial({
        map: sandstoneFacadeTex,
        bumpMap: stuccoBump,
        bumpScale: 0.04,
        roughness: 0.88,
        metalness: 0.03,
      }),
    ),
    buildingTerracotta: regMat(
      new THREE.MeshStandardMaterial({
        map: terracottaFacadeTex,
        bumpMap: stuccoBump,
        bumpScale: 0.045,
        roughness: 0.85,
        metalness: 0.04,
      }),
    ),
    buildingOldBrick: regMat(
      new THREE.MeshStandardMaterial({
        map: oldBrickFacadeTex,
        bumpMap: stuccoBump,
        bumpScale: 0.06,
        roughness: 0.9,
        metalness: 0.03,
      }),
    ),
    precinctFacade: regMat(
      new THREE.MeshStandardMaterial({
        map: precinctFacadeTex,
        bumpMap: stuccoBump,
        bumpScale: 0.04,
        roughness: 0.82,
        metalness: 0.06,
      }),
    ),
    villaLimestone: regMat(
      new THREE.MeshStandardMaterial({
        map: villaFacadeTex,
        bumpMap: stuccoBump,
        bumpScale: 0.025,
        roughness: 0.72,
        metalness: 0.05,
      }),
    ),
    modernGlassTower: regMat(
      new THREE.MeshPhysicalMaterial({
        map: glassTowerTex,
        roughness: 0.16,
        metalness: 0.65,
        clearcoat: isSoftwareGl ? 0 : 0.85,
        clearcoatRoughness: 0.12,
      }),
    ),
    shutterGreen: regMat(new THREE.MeshStandardMaterial({ color: 0x355143, roughness: 0.78, metalness: 0.05 })),
    wroughtIron: regMat(new THREE.MeshStandardMaterial({ color: 0x22252a, roughness: 0.36, metalness: 0.82 })),
    concreteBarrier: regMat(
      new THREE.MeshStandardMaterial({
        map: barrierTex,
        bumpMap: stuccoBump,
        bumpScale: 0.04,
        roughness: 0.88,
        metalness: 0.05,
      }),
    ),
    crateWood: regMat(
      new THREE.MeshStandardMaterial({
        map: woodTex,
        bumpMap: stuccoBump,
        bumpScale: 0.03,
        roughness: 0.84,
        metalness: 0.04,
      }),
    ),
    awningStripe: regMat(
      new THREE.MeshStandardMaterial({
        map: awningTex,
        roughness: 0.84,
        metalness: 0.02,
        side: THREE.DoubleSide,
      }),
    ),
    taxiWhite: regMat(
      new THREE.MeshPhysicalMaterial({
        color: 0xede6d8,
        roughness: 0.24,
        metalness: 0.25,
        clearcoat: isSoftwareGl ? 0 : 0.9,
        clearcoatRoughness: 0.12,
      }),
    ),
    taxiBlack: regMat(
      new THREE.MeshPhysicalMaterial({
        color: 0x181b20,
        roughness: 0.26,
        metalness: 0.38,
        clearcoat: isSoftwareGl ? 0 : 0.85,
        clearcoatRoughness: 0.14,
      }),
    ),
    suvBlack: regMat(
      new THREE.MeshPhysicalMaterial({
        color: 0x13161b,
        roughness: 0.18,
        metalness: 0.62,
        clearcoat: isSoftwareGl ? 0 : 1.0,
        clearcoatRoughness: 0.08,
      }),
    ),
    carChrome: regMat(new THREE.MeshStandardMaterial({ color: 0xd6dbe2, roughness: 0.16, metalness: 0.94 })),
    carGlass: regMat(
      new THREE.MeshPhysicalMaterial({
        color: 0x16222c,
        roughness: 0.08,
        metalness: 0.72,
        clearcoat: isSoftwareGl ? 0 : 1.0,
      }),
    ),
    headlightGlow: regMat(
      new THREE.MeshStandardMaterial({
        color: 0xfff0c4,
        emissive: 0xffd27a,
        emissiveIntensity: 1.4,
        roughness: 0.15,
      }),
    ),
    taillightGlow: regMat(
      new THREE.MeshStandardMaterial({
        color: 0xd9362b,
        emissive: 0xb82218,
        emissiveIntensity: 1.1,
        roughness: 0.2,
      }),
    ),
    taxiRoofSign: regMat(
      new THREE.MeshStandardMaterial({
        color: 0xf6c344,
        emissive: 0xd98f1e,
        emissiveIntensity: 0.75,
        roughness: 0.25,
        metalness: 0.1,
      }),
    ),
    palmTrunk: regMat(
      new THREE.MeshStandardMaterial({
        color: 0x6b4e37,
        bumpMap: stuccoBump,
        bumpScale: 0.06,
        roughness: 0.94,
        metalness: 0.02,
      }),
    ),
    palmFrond: regMat(
      new THREE.MeshStandardMaterial({
        color: 0x456636,
        roughness: 0.74,
        metalness: 0.04,
        side: THREE.DoubleSide,
      }),
    ),
    waterPool: regMat(
      new THREE.MeshPhysicalMaterial({
        color: 0x2a7b88,
        roughness: 0.08,
        metalness: 0.18,
        clearcoat: isSoftwareGl ? 0 : 1.0,
        clearcoatRoughness: 0.05,
      }),
    ),
    distantSkyline: regMat(new THREE.MeshStandardMaterial({ color: 0x8f7058, roughness: 0.94, metalness: 0.04 })),
    contactShadow: regMat(
      new THREE.MeshBasicMaterial({
        map: shadowTex,
        transparent: true,
        depthWrite: false,
        opacity: 0.62,
      }),
    ),
    tacticalWeaveBump,
    skyPanoramaUrl: cairoGoldenSkyUrl,
    dispose: () => {
      isDisposed = true;
      textures.forEach((t) => t.dispose());
      materials.forEach((m) => m.dispose());
    },
  };

  // Upgrade surfaces asynchronously with photorealistic Cairo PBR albedo + Sobel Normal & Roughness maps
  const loader = new THREE.TextureLoader();

  const applyPhotoPbr = (
    url: string,
    repeatX: number,
    repeatY: number,
    normalScaleVal: number,
    normalStrength: number,
    targets: Array<{ mat: THREE.MeshStandardMaterial; tintHex?: number; roughness?: number }>,
  ) => {
    loader.load(
      url,
      (tex) => {
        if (isDisposed) {
          tex.dispose();
          return;
        }
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(repeatX, repeatY);
        tex.anisotropy = maxAniso;
        tex.needsUpdate = true;
        regTex(tex);

        let normalMap: THREE.CanvasTexture | null = null;
        let roughnessMap: THREE.CanvasTexture | null = null;
        if (tex.image instanceof HTMLImageElement) {
          const derived = derivePbrMapsFromImage(tex.image, repeatX, repeatY, maxAniso, normalStrength);
          normalMap = regTex(derived.normalMap);
          roughnessMap = regTex(derived.roughnessMap);
        }

        targets.forEach(({ mat, tintHex, roughness }) => {
          mat.map = tex;
          if (tintHex !== undefined) mat.color.setHex(tintHex);
          if (normalMap) {
            mat.bumpMap = null;
            mat.normalMap = normalMap;
            mat.normalScale.set(normalScaleVal, normalScaleVal);
          }
          if (roughnessMap) {
            mat.roughnessMap = roughnessMap;
            mat.roughness = roughness ?? 0.92;
          }
          mat.needsUpdate = true;
        });
      },
      undefined,
      () => {
        // Keep procedural fallback textures silently on load failure
      },
    );
  };

  // 1. Photorealistic Cairo Asphalt Road
  applyPhotoPbr(cairoAsphaltUrl, 10, 10, 1.35, 2.5, [
    { mat: lib.asphalt, tintHex: 0xd9d2c8, roughness: 0.94 },
  ]);

  // 2. Photorealistic Old Cairo Sandstone Flagstones & Sidewalks
  applyPhotoPbr(cairoSandstoneUrl, 10, 10, 1.4, 2.4, [
    { mat: lib.courtyardStone, tintHex: 0xf4eadc, roughness: 0.9 },
    { mat: lib.sidewalk, tintHex: 0xddd0bc, roughness: 0.92 },
  ]);

  // 3. Photorealistic Shubra / Downtown Cairo Architectural Facades (varied tints per district palette)
  applyPhotoPbr(cairoFacadeUrl, 1.6, 1.6, 1.25, 2.2, [
    { mat: lib.buildingOchre, tintHex: 0xffffff, roughness: 0.88 },
    { mat: lib.buildingSandstone, tintHex: 0xebd7bc, roughness: 0.9 },
    { mat: lib.buildingTerracotta, tintHex: 0xdca182, roughness: 0.88 },
    { mat: lib.buildingOldBrick, tintHex: 0xc9967a, roughness: 0.92 },
    { mat: lib.precinctFacade, tintHex: 0xe6dcc8, roughness: 0.84 },
    { mat: lib.villaLimestone, tintHex: 0xf8f1e6, roughness: 0.78 },
  ]);

  return lib;
}
