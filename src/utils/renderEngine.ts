import type { PhotoSubject, KeyArea } from '../types/game';
import { seededRandom, lerp, clamp, gaussian } from './math';

const CANVAS_W = 480;
const CANVAS_H = 640;

export interface RenderedImageData {
  pixels: Float32Array;
  width: number;
  height: number;
}

export interface SceneColors {
  sky: [number, number, number];
  mid: [number, number, number];
  dark: [number, number, number];
  accent: [number, number, number];
  warm: [number, number, number];
}

function pickScenePalette(subject: PhotoSubject, rand: () => number): SceneColors {
  const palettes: Record<string, SceneColors[]> = {
    portrait: [
      { sky: [245, 230, 210], mid: [180, 140, 110], dark: [60, 40, 30], accent: [220, 180, 150], warm: [255, 200, 160] },
      { sky: [230, 200, 180], mid: [160, 120, 90], dark: [50, 35, 28], accent: [200, 160, 130], warm: [240, 180, 140] }
    ],
    landscape: [
      { sky: [180, 210, 240], mid: [100, 150, 120], dark: [30, 60, 40], accent: [200, 180, 140], warm: [230, 190, 130] },
      { sky: [255, 200, 150], mid: [120, 140, 80], dark: [40, 55, 25], accent: [255, 160, 100], warm: [255, 180, 100] }
    ],
    street: [
      { sky: [80, 90, 110], mid: [100, 95, 90], dark: [30, 28, 35], accent: [220, 80, 60], warm: [255, 140, 80] },
      { sky: [60, 70, 90], mid: [90, 85, 80], dark: [25, 22, 28], accent: [200, 70, 50], warm: [255, 160, 60] }
    ],
    still_life: [
      { sky: [230, 210, 180], mid: [170, 130, 80], dark: [70, 45, 25], accent: [210, 170, 120], warm: [250, 200, 150] },
      { sky: [220, 200, 170], mid: [150, 110, 70], dark: [60, 38, 20], accent: [190, 150, 100], warm: [240, 180, 130] }
    ],
    night: [
      { sky: [15, 18, 45], mid: [40, 30, 60], dark: [8, 8, 18], accent: [255, 200, 80], warm: [255, 120, 50] },
      { sky: [10, 12, 35], mid: [30, 25, 50], dark: [5, 5, 12], accent: [255, 220, 100], warm: [255, 150, 70] }
    ]
  };
  const scenePalettes = palettes[subject.sceneType] || palettes.street;
  return scenePalettes[Math.floor(rand() * scenePalettes.length)];
}

export function generateBaseScene(subject: PhotoSubject): RenderedImageData {
  const rand = seededRandom(subject.seed);
  const palette = pickScenePalette(subject, rand);
  
  const pixels = new Float32Array(CANVAS_W * CANVAS_H * 4);
  const w = CANVAS_W;
  const h = CANVAS_H;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const u = x / w;
      const v = y / h;
      
      let r = 0, g = 0, b = 0;
      
      switch (subject.sceneType) {
        case 'portrait':
          ({ r, g, b } = renderPortrait(u, v, rand, palette, subject));
          break;
        case 'landscape':
          ({ r, g, b } = renderLandscape(u, v, rand, palette, subject));
          break;
        case 'street':
          ({ r, g, b } = renderStreet(u, v, rand, palette, subject));
          break;
        case 'still_life':
          ({ r, g, b } = renderStillLife(u, v, rand, palette, subject));
          break;
        case 'night':
          ({ r, g, b } = renderNight(u, v, rand, palette, subject));
          break;
        default:
          ({ r, g, b } = renderStreet(u, v, rand, palette, subject));
      }
      
      pixels[idx] = r;
      pixels[idx + 1] = g;
      pixels[idx + 2] = b;
      pixels[idx + 3] = 1;
    }
  }
  
  return { pixels, width: w, height: h };
}

function renderPortrait(u: number, v: number, rand: () => number, pal: SceneColors, subj: PhotoSubject) {
  let r = 0, g = 0, b = 0;
  const sideLight = Math.max(0, 0.8 - Math.abs(u - 0.7) * 2);
  
  if (v < 0.15) {
    const bg = v / 0.15;
    r = lerp(pal.dark[0], pal.sky[0], bg);
    g = lerp(pal.dark[1], pal.sky[1], bg);
    b = lerp(pal.dark[2], pal.sky[2], bg);
  } else if (v < 0.95) {
    const dx = u - 0.5;
    const dy = (v - 0.5) * 0.7;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist < 0.25 && v < 0.5) {
      const t = dist / 0.25;
      const faceShade = Math.max(0, 0.8 - t * 0.6 + sideLight * 0.4);
      r = lerp(pal.warm[0] * faceShade, pal.mid[0] * 0.8, t * 0.3);
      g = lerp(pal.warm[1] * faceShade, pal.mid[1] * 0.8, t * 0.3);
      b = lerp(pal.warm[2] * faceShade, pal.mid[2] * 0.8, t * 0.3);
      
      const eyeDY = Math.abs(v - 0.3);
      const eyeDX = Math.min(Math.abs(u - 0.42), Math.abs(u - 0.58));
      if (eyeDY < 0.03 && eyeDX < 0.035) {
        r = pal.dark[0] * 0.5;
        g = pal.dark[1] * 0.5;
        b = pal.dark[2] * 0.5;
      }
    } else if (v > 0.5 && Math.abs(dx) < 0.3) {
      const bodyT = Math.abs(dx) / 0.3;
      r = lerp(pal.accent[0], pal.dark[0], bodyT * 0.5) * (0.6 + sideLight * 0.3);
      g = lerp(pal.accent[1], pal.dark[1], bodyT * 0.5) * (0.6 + sideLight * 0.3);
      b = lerp(pal.accent[2], pal.dark[2], bodyT * 0.5) * (0.6 + sideLight * 0.3);
      
      const fabricNoise = (Math.sin(u * 120 + rand() * 2) * 0.5 + 0.5) * 0.1;
      r += fabricNoise * 30;
      g += fabricNoise * 30;
      b += fabricNoise * 30;
    } else {
      r = pal.dark[0] * (0.3 + sideLight * 0.2);
      g = pal.dark[1] * (0.3 + sideLight * 0.2);
      b = pal.dark[2] * (0.3 + sideLight * 0.2);
    }
  } else {
    r = pal.dark[0] * 0.25;
    g = pal.dark[1] * 0.25;
    b = pal.dark[2] * 0.25;
  }
  
  if (subj.id === 'portrait_02') {
    const sunsetT = Math.max(0, 1 - v * 1.2);
    r = lerp(r, pal.sky[0] * 0.8, sunsetT);
    g = lerp(g, pal.sky[1] * 0.6, sunsetT);
    b = lerp(b, pal.sky[2] * 0.4, sunsetT);
    
    const sunX = 0.5, sunY = 0.55;
    const sunDist = Math.sqrt((u - sunX) ** 2 + (v - sunY) ** 2);
    if (sunDist < 0.2) {
      const sunT = 1 - sunDist / 0.2;
      r = lerp(r, 255, sunT * 0.7);
      g = lerp(g, 180, sunT * 0.7);
      b = lerp(b, 80, sunT * 0.7);
    }
  }
  
  return { r, g, b };
}

function renderLandscape(u: number, v: number, rand: () => number, pal: SceneColors, _subj: PhotoSubject) {
  let r = 0, g = 0, b = 0;
  
  if (v < 0.4) {
    const skyT = v / 0.4;
    const cloudNoise = Math.sin(u * 8) * Math.cos(u * 13 + v * 5) * 0.3 + Math.sin(u * 25 + v * 3) * 0.15;
    const cloudAmt = Math.max(0, 0.35 + cloudNoise - v * 0.5);
    
    r = lerp(pal.sky[0], pal.warm[0], 1 - skyT) * (0.85 + cloudAmt * 0.15);
    g = lerp(pal.sky[1], pal.warm[1], 1 - skyT) * (0.85 + cloudAmt * 0.15);
    b = lerp(pal.sky[2], pal.warm[2], 1 - skyT) * (0.85 + cloudAmt * 0.15);
  } else if (v < 0.6) {
    const mtnT = (v - 0.4) / 0.2;
    const mtnLine = 0.5 + Math.sin(u * 3.5) * 0.08 + Math.sin(u * 8) * 0.04;
    const mtnNoise = Math.sin(u * 40) * 0.02;
    
    if (v - 0.4 < mtnLine * 0.2 + mtnNoise) {
      r = lerp(pal.mid[0], pal.sky[0], 0.3 + mtnT * 0.3);
      g = lerp(pal.mid[1], pal.sky[1], 0.3 + mtnT * 0.3);
      b = lerp(pal.mid[2], pal.sky[2], 0.3 + mtnT * 0.3);
    } else {
      const fogAmt = Math.max(0, 1 - mtnT * 2);
      r = lerp(pal.mid[0], pal.sky[0], fogAmt * 0.5);
      g = lerp(pal.mid[1], pal.sky[1], fogAmt * 0.5);
      b = lerp(pal.mid[2], pal.sky[2], fogAmt * 0.5);
    }
  } else {
    const treeNoise = Math.sin(u * 50 + v * 20) * 0.5 + 0.5;
    const grassNoise = Math.sin(u * 120) * Math.cos(v * 80) * 0.3 + 0.5;
    
    r = lerp(pal.dark[0], pal.mid[0], grassNoise * 0.3);
    g = lerp(pal.dark[1], pal.mid[1], grassNoise * 0.4 + treeNoise * 0.2);
    b = lerp(pal.dark[2], pal.mid[2], grassNoise * 0.2);
    
    const treeLines = [0.1, 0.3, 0.45, 0.65, 0.8, 0.92];
    for (const tx of treeLines) {
      const treeH = 0.15 + Math.sin(tx * 100) * 0.08;
      const dx = Math.abs(u - tx);
      if (dx < 0.05 && v > 0.6 && v < 0.6 + treeH) {
        const treeT = (v - 0.6) / treeH;
        const treeShape = 1 - Math.abs(dx / 0.05) * (1 - treeT);
        if (treeShape > 0.5) {
          r = pal.dark[0] * 0.6;
          g = pal.dark[1] * 0.8;
          b = pal.dark[2] * 0.5;
        }
      }
    }
  }
  
  return { r, g, b };
}

function renderStreet(u: number, v: number, rand: () => number, pal: SceneColors, _subj: PhotoSubject) {
  let r = 0, g = 0, b = 0;
  
  if (v < 0.15) {
    r = pal.sky[0] * 0.9;
    g = pal.sky[1] * 0.9;
    b = pal.sky[2] * 0.9;
  } else if (v < 0.75) {
    const buildingIdx = Math.floor(u * 5);
    const buildingU = (u * 5) % 1;
    const buildingH = 0.35 + Math.sin(buildingIdx * 12.3) * 0.2 + Math.cos(buildingIdx * 7.8) * 0.15;
    const buildingTop = 0.15 + (0.6 - buildingH);
    
    if (v > buildingTop) {
      const winRow = Math.floor((v - buildingTop) / buildingH * 8);
      const winCol = Math.floor(buildingU * 4);
      const lit = Math.sin(buildingIdx * 31 + winRow * 17 + winCol * 9) > 0.2;
      
      const brickNoise = Math.sin(u * 300 + v * 200) * 0.1;
      r = pal.dark[0] * (0.7 + brickNoise);
      g = pal.dark[1] * (0.7 + brickNoise);
      b = pal.dark[2] * (0.7 + brickNoise);
      
      if (lit && buildingU > 0.1 && buildingU < 0.9) {
        const winU = buildingU * 4 - winCol;
        const winV = (v - buildingTop) / buildingH * 8 - winRow;
        if (winU > 0.15 && winU < 0.85 && winV > 0.2 && winV < 0.8) {
          const warmth = Math.sin(buildingIdx + winRow) * 0.5 + 0.5;
          r = lerp(pal.warm[0], pal.accent[0], warmth);
          g = lerp(pal.warm[1], pal.accent[1], warmth * 0.5);
          b = 60 + warmth * 40;
        }
      }
    } else {
      r = pal.sky[0] * 0.85;
      g = pal.sky[1] * 0.85;
      b = pal.sky[2] * 0.85;
    }
    
    if (u > 0.6 && u < 0.85 && v > 0.1 && v < 0.3) {
      const signU = (u - 0.6) / 0.25;
      const signV = (v - 0.1) / 0.2;
      const flicker = 0.8 + Math.sin(u * 100 + rand() * 10) * 0.2;
      r = pal.accent[0] * flicker;
      g = pal.accent[1] * flicker * 0.3;
      b = pal.accent[2] * flicker * 0.2;
    }
  } else {
    const roadT = (v - 0.75) / 0.25;
    r = pal.dark[0] * (0.35 + roadT * 0.1);
    g = pal.dark[1] * (0.35 + roadT * 0.1);
    b = pal.dark[2] * (0.35 + roadT * 0.1);
    
    const laneX = u - 0.5;
    if (Math.abs(laneX) < 0.02 && Math.floor(v * 30) % 3 < 2) {
      r = 200; g = 180; b = 100;
    }
    
    const rainX = (u + v * 0.3 + Math.sin(u * 50) * 0.02) % 0.08;
    if (rainX < 0.015) {
      const reflLight = 0.3 + Math.sin(u * 200 + v * 100) * 0.2;
      r = Math.min(255, r + pal.accent[0] * reflLight * 0.3);
      g = Math.min(255, g + pal.accent[1] * reflLight * 0.2);
      b = Math.min(255, b + pal.accent[2] * reflLight * 0.15);
    }
  }
  
  const personX = 0.38 + Math.sin(rand() * 2) * 0.05;
  const personDist = Math.abs(u - personX);
  if (personDist < 0.06 && v > 0.4 && v < 0.85) {
    r = pal.dark[0] * 0.3;
    g = pal.dark[1] * 0.3;
    b = pal.dark[2] * 0.35;
  }
  
  return { r, g, b };
}

function renderStillLife(u: number, v: number, rand: () => number, pal: SceneColors, _subj: PhotoSubject) {
  let r = 0, g = 0, b = 0;
  
  if (v < 0.7) {
    const bgShade = 0.3 + (1 - v / 0.7) * 0.5;
    r = pal.dark[0] * bgShade;
    g = pal.dark[1] * bgShade;
    b = pal.dark[2] * bgShade;
  } else {
    const woodT = (v - 0.7) / 0.3;
    const woodGrain = Math.sin(u * 200 + v * 15) * 0.3 + Math.sin(u * 60) * 0.2;
    r = pal.mid[0] * (0.55 + woodGrain * 0.2 + woodT * 0.1);
    g = pal.mid[1] * (0.5 + woodGrain * 0.15 + woodT * 0.1);
    b = pal.mid[2] * (0.4 + woodGrain * 0.1 + woodT * 0.1);
  }
  
  const bookX = 0.65, bookY = 0.5;
  const bookDX = (u - bookX) / 0.3;
  const bookDY = (v - bookY) / 0.35;
  if (Math.abs(bookDX) < 1 && Math.abs(bookDY) < 1) {
    const pageNoise = Math.sin(u * 500 + v * 80) * 0.1;
    const pageShade = 0.7 - Math.abs(bookDX) * 0.3 + pageNoise;
    r = pal.sky[0] * pageShade;
    g = pal.sky[1] * pageShade;
    b = pal.sky[2] * pageShade;
    
    if (Math.abs(bookDX) < 0.9 && Math.abs(Math.sin(bookDY * 15 + bookDX * 3)) > 0.7) {
      r *= 0.7; g *= 0.7; b *= 0.7;
    }
  }
  
  const cupX = 0.32, cupY = 0.55;
  const cupDX = (u - cupX) / 0.18;
  const cupDY = (v - cupY) / 0.22;
  const cupDist = Math.sqrt(cupDX * cupDX + cupDY * cupDY * 0.8);
  if (cupDist < 1) {
    const rimShine = Math.max(0, 1 - Math.abs(cupDist - 0.85) * 20);
    const bodyShade = 0.6 - cupDX * 0.4;
    
    r = pal.mid[0] * bodyShade + rimShine * 100;
    g = pal.mid[1] * bodyShade + rimShine * 80;
    b = pal.mid[2] * bodyShade + rimShine * 60;
    
    if (cupDY < -0.3 && cupDist < 0.75) {
      r = pal.accent[0] * 0.9;
      g = pal.accent[1] * 0.7;
      b = pal.accent[2] * 0.5;
    }
  }
  
  return { r, g, b };
}

function renderNight(u: number, v: number, rand: () => number, pal: SceneColors, _subj: PhotoSubject) {
  let r = 0, g = 0, b = 0;
  
  if (v < 0.25) {
    r = pal.sky[0];
    g = pal.sky[1];
    b = pal.sky[2];
    
    const starField = Math.sin(u * 1000 + rand() * 5) * Math.cos(v * 800) * 0.5 + 0.5;
    if (starField > 0.985) {
      r = 255; g = 255; b = 240;
    }
  } else if (v < 0.7) {
    const bldCol = Math.floor(u * 4 + v * 2) % 4;
    const bldVariants = [
      [pal.mid[0] * 0.6, pal.mid[1] * 0.5, pal.mid[2] * 0.7],
      [pal.dark[0] * 1.5, pal.dark[1] * 1.4, pal.dark[2] * 1.8],
      [pal.mid[0] * 0.5, pal.mid[1] * 0.45, pal.mid[2] * 0.55],
      [pal.dark[0] * 1.2, pal.dark[1] * 1.1, pal.dark[2] * 1.5]
    ];
    const [br, bg, bb] = bldVariants[bldCol];
    
    const winRow = Math.floor((v - 0.25) / 0.45 * 10);
    const winCol = Math.floor(u * 12);
    const isWindow = Math.sin(winRow * 13 + winCol * 7 + u * 100) > 0.15;
    
    const winRowFrac = ((v - 0.25) / 0.45 * 10) % 1;
    const winColFrac = (u * 12) % 1;
    const inWindow = winRowFrac > 0.15 && winRowFrac < 0.85 && winColFrac > 0.2 && winColFrac < 0.8;
    
    if (isWindow && inWindow) {
      const wTemp = Math.sin(winRow * 5 + winCol * 3) * 0.5 + 0.5;
      r = lerp(pal.warm[0], pal.accent[0], wTemp);
      g = lerp(pal.warm[1], 180, wTemp * 0.6);
      b = 80 + wTemp * 60;
    } else {
      r = br; g = bg; b = bb;
    }
    
    const edgeLight = Math.max(0, 0.15 - Math.min(Math.abs(u - 0.3), Math.abs(u - 0.7)));
    r += pal.accent[0] * edgeLight;
    g += pal.accent[1] * edgeLight * 0.5;
  } else {
    r = pal.dark[0] * 0.4;
    g = pal.dark[1] * 0.4;
    b = pal.dark[2] * 0.45;
    
    const carLane1 = Math.abs(u - 0.35) < 0.04 && Math.floor((v - 0.7) * 8) % 2 === 0;
    const carLane2 = Math.abs(u - 0.65) < 0.04 && Math.floor((v - 0.7) * 8 + 1) % 2 === 0;
    
    if (carLane1 || carLane2) {
      const headlight = carLane1;
      r = headlight ? 255 : 255;
      g = headlight ? 250 : 120;
      b = headlight ? 220 : 50;
    }
    
    const streak = Math.max(0, 1 - Math.abs(u - 0.5) * 3 - (v - 0.7) * 2);
    r += pal.warm[0] * streak * 0.2;
    g += pal.warm[1] * streak * 0.1;
  }
  
  return { r, g, b };
}

export function applyDevelopment(
  baseImage: RenderedImageData,
  params: {
    exposure: number;
    developmentTime: number;
    temperature: number;
    agitation: number;
    contrast: number;
    saturation: number;
    dilution: number;
    isColorFilm: boolean;
    filmBaseContrast: number;
    filmBaseSaturation: number;
    grainSize: number;
    subjectBaseBrightness: number;
    seed: number;
    progress?: number;
  },
  isNegative = false
): RenderedImageData {
  const { width, height } = baseImage;
  const result = new Float32Array(width * height * 4);
  const rand = seededRandom(params.seed);
  
  const exposureAdj = (params.exposure - 0.5) * 3;
  const devAdj = (params.developmentTime - 0.5) * 1.5;
  const tempAdj = (params.temperature - 0.5) * 0.8;
  const agiAdj = (params.agitation - 0.5) * 0.6;
  const contrastAdj = (params.contrast - 0.5) * 1.2 + params.filmBaseContrast - 0.5;
  const satAdj = (params.saturation - 0.5) * 1.5 + params.filmBaseSaturation - 0.5;
  const dilAdj = 1 + (params.dilution - 0.5) * 0.5;
  
  const totalContrast = contrastAdj + devAdj * 0.5 + tempAdj * 0.3;
  const totalBrightness = exposureAdj + (params.subjectBaseBrightness - 0.35) * 1.5;
  
  const prog = params.progress ?? 1;
  const fadeIn = clamp(prog * 1.5, 0, 1);
  const unevenFactor = agiAdj * 0.15 * fadeIn;
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      let r = baseImage.pixels[idx];
      let g = baseImage.pixels[idx + 1];
      let b = baseImage.pixels[idx + 2];
      
      const u = x / width;
      const v = y / height;
      const edgeDark = 1 - (Math.abs(u - 0.5) + Math.abs(v - 0.5)) * 0.3;
      const uneven = 1 + gaussian(rand) * unevenFactor;
      
      r = clamp((r * edgeDark * uneven) / dilAdj, 0, 255);
      g = clamp((g * edgeDark * uneven) / dilAdj, 0, 255);
      b = clamp((b * edgeDark * uneven) / dilAdj, 0, 255);
      
      r = clamp(r * Math.pow(2, totalBrightness * fadeIn), 0, 255);
      g = clamp(g * Math.pow(2, totalBrightness * fadeIn), 0, 255);
      b = clamp(b * Math.pow(2, totalBrightness * fadeIn), 0, 255);
      
      r = applyContrast(r, totalContrast * fadeIn);
      g = applyContrast(g, totalContrast * fadeIn);
      b = applyContrast(b, totalContrast * fadeIn);
      
      if (params.isColorFilm) {
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        const satFactor = 1 + satAdj * fadeIn;
        r = clamp(gray + (r - gray) * satFactor, 0, 255);
        g = clamp(gray + (g - gray) * satFactor, 0, 255);
        b = clamp(gray + (b - gray) * satFactor, 0, 255);
        
        const tempShift = tempAdj * 20 * fadeIn;
        r = clamp(r + tempShift, 0, 255);
        b = clamp(b - tempShift, 0, 255);
      } else {
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        r = gray; g = gray; b = gray;
      }
      
      const grainAmt = params.grainSize * 25 * fadeIn;
      const grain = gaussian(rand) * grainAmt;
      r = clamp(r + grain, 0, 255);
      g = clamp(g + grain * (params.isColorFilm ? 0.8 : 1), 0, 255);
      b = clamp(b + grain * (params.isColorFilm ? 0.7 : 1), 0, 255);
      
      if (isNegative) {
        r = 255 - r;
        g = 255 - g;
        b = 255 - b;
      }
      
      const progOpacity = isNegative ? 1 : clamp(prog * 2, 0, 1);
      r = r * progOpacity + (1 - progOpacity) * (isNegative ? 230 : 20);
      g = g * progOpacity + (1 - progOpacity) * (isNegative ? 210 : 20);
      b = b * progOpacity + (1 - progOpacity) * (isNegative ? 195 : 25);
      
      result[idx] = r;
      result[idx + 1] = g;
      result[idx + 2] = b;
      result[idx + 3] = 1;
    }
  }
  
  return { pixels: result, width, height };
}

function applyContrast(value: number, contrast: number): number {
  const factor = (259 * (contrast * 128 + 255)) / (255 * (259 - contrast * 128));
  return clamp(factor * (value - 128) + 128, 0, 255);
}

export function renderToCanvas(ctx: CanvasRenderingContext2D, image: RenderedImageData): void {
  const { width, height } = image;
  const imgData = ctx.createImageData(width, height);
  
  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    imgData.data[idx] = image.pixels[idx];
    imgData.data[idx + 1] = image.pixels[idx + 1];
    imgData.data[idx + 2] = image.pixels[idx + 2];
    imgData.data[idx + 3] = 255;
  }
  
  ctx.putImageData(imgData, 0, 0);
}

export function createThumbnail(ctx: CanvasRenderingContext2D, image: RenderedImageData, maxW: number, maxH: number): string {
  const ratio = Math.min(maxW / image.width, maxH / image.height);
  const tw = Math.floor(image.width * ratio);
  const th = Math.floor(image.height * ratio);
  
  const tmpCanvas = document.createElement('canvas');
  tmpCanvas.width = tw;
  tmpCanvas.height = th;
  const tmpCtx = tmpCanvas.getContext('2d')!;
  
  renderToCanvas(ctx, image);
  tmpCtx.drawImage(ctx.canvas, 0, 0, image.width, image.height, 0, 0, tw, th);
  
  return tmpCanvas.toDataURL('image/jpeg', 0.85);
}
