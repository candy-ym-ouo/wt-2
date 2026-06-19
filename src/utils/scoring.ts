import type { PhotoSubject, DevParams, ScoreDetail, KeyArea } from '../types/game';
import type { RenderedImageData } from './renderEngine';
import { clamp, smoothstep } from './math';

export function calculateScore(
  subject: PhotoSubject,
  params: DevParams,
  finalImage: RenderedImageData,
  isColorFilm: boolean
): ScoreDetail {
  const exposureScore = calcExposureScore(subject, params, finalImage);
  const contrastScore = calcContrastScore(subject, params, finalImage);
  const colorScore = calcColorScore(subject, params, isColorFilm);
  const detailScore = calcDetailScore(subject, params, finalImage);

  const exposureW = 0.35;
  const contrastW = 0.25;
  const colorW = isColorFilm ? 0.2 : 0;
  const detailW = isColorFilm ? 0.2 : 0.4;

  const overall = Math.round(
    exposureScore * exposureW +
    contrastScore * contrastW +
    colorScore * colorW +
    detailScore * detailW
  );

  const grade = getGrade(overall);
  const feedback = generateFeedback(subject, params, {
    exposure: exposureScore,
    contrast: contrastScore,
    color: colorScore,
    detail: detailScore,
    overall,
    grade
  }, isColorFilm);

  return {
    exposure: Math.round(exposureScore),
    contrast: Math.round(contrastScore),
    color: Math.round(colorScore),
    detail: Math.round(detailScore),
    overall,
    grade,
    feedback
  };
}

function calcExposureScore(subject: PhotoSubject, params: DevParams, image: RenderedImageData): number {
  const idealExposure = subject.idealExposure;
  const userExposure = params.exposure;
  const exposureDiff = Math.abs(idealExposure - userExposure) * 100;
  const baseScore = clamp(100 - exposureDiff * 1.5, 0, 100);

  const { width, height } = image;
  let overexposed = 0;
  let underexposed = 0;
  let totalPixels = 0;

  for (let y = 0; y < height; y += 4) {
    for (let x = 0; x < width; x += 4) {
      const idx = (y * width + x) * 4;
      const lum = 0.299 * image.pixels[idx] + 0.587 * image.pixels[idx + 1] + 0.114 * image.pixels[idx + 2];
      if (lum > 245) overexposed++;
      if (lum < 15) underexposed++;
      totalPixels++;
    }
  }

  const overPct = overexposed / totalPixels;
  const underPct = underexposed / totalPixels;
  const clipPenalty = (overPct + underPct * 0.8) * 500;

  let keyAreaBonus = 0;
  let keyAreaCount = 0;
  for (const area of subject.keyAreas) {
    const avgLum = getKeyAreaLuminance(image, area);
    const diff = Math.abs(avgLum / 255 - area.idealBrightness);
    keyAreaBonus += clamp(100 - diff * 150, 0, 100);
    keyAreaCount++;
  }
  const keyAreaAvg = keyAreaCount > 0 ? keyAreaBonus / keyAreaCount : 50;

  return clamp(
    baseScore * 0.5 +
    clamp(100 - clipPenalty, 0, 100) * 0.2 +
    keyAreaAvg * 0.3,
    0, 100
  );
}

function getKeyAreaLuminance(image: RenderedImageData, area: KeyArea): number {
  const { width, height } = image;
  const sx = Math.floor(area.x * width);
  const sy = Math.floor(area.y * height);
  const sw = Math.floor(area.w * width);
  const sh = Math.floor(area.h * height);

  let sum = 0;
  let count = 0;
  const step = 3;

  for (let y = sy; y < sy + sh; y += step) {
    for (let x = sx; x < sx + sw; x += step) {
      if (x >= 0 && x < width && y >= 0 && y < height) {
        const idx = (y * width + x) * 4;
        sum += 0.299 * image.pixels[idx] + 0.587 * image.pixels[idx + 1] + 0.114 * image.pixels[idx + 2];
        count++;
      }
    }
  }
  return count > 0 ? sum / count : 128;
}

function calcContrastScore(subject: PhotoSubject, params: DevParams, image: RenderedImageData): number {
  const idealContrast = subject.idealContrast;
  const effectiveContrast = params.contrast * 0.5 + params.developmentTime * 0.3 + params.temperature * 0.2;
  const contrastDiff = Math.abs(idealContrast - effectiveContrast);
  const baseScore = clamp(100 - contrastDiff * 120, 0, 100);

  const { width, height } = image;
  const histogram = new Array(64).fill(0);

  for (let y = 0; y < height; y += 4) {
    for (let x = 0; x < width; x += 4) {
      const idx = (y * width + x) * 4;
      const lum = 0.299 * image.pixels[idx] + 0.587 * image.pixels[idx + 1] + 0.114 * image.pixels[idx + 2];
      const bin = Math.floor(lum / 4);
      histogram[Math.min(63, bin)]++;
    }
  }

  const total = histogram.reduce((a, b) => a + b, 0);
  let percentile5 = 0, percentile95 = 0;
  let acc = 0;
  for (let i = 0; i < 64; i++) {
    acc += histogram[i];
    if (percentile5 === 0 && acc >= total * 0.05) percentile5 = i;
    if (acc >= total * 0.95) { percentile95 = i; break; }
  }
  const dynamicRange = (percentile95 - percentile5) / 64;
  const drScore = subject.sceneType === 'night' || subject.sceneType === 'landscape'
    ? smoothstep(0.4, 0.75, dynamicRange) * 100
    : smoothstep(0.3, 0.6, dynamicRange) * 100;

  return clamp(baseScore * 0.6 + drScore * 0.4, 0, 100);
}

function calcColorScore(subject: PhotoSubject, params: DevParams, isColorFilm: boolean): number {
  if (!isColorFilm) return 0;

  const idealSat = subject.idealSaturation;
  const effectiveSat = params.saturation;
  const satDiff = Math.abs(idealSat - effectiveSat);
  const satScore = clamp(100 - satDiff * 130, 0, 100);

  const tempPenalty = Math.abs(params.temperature - 0.5) * 80;
  const tempScore = clamp(100 - tempPenalty, 0, 100);

  const sceneSatBonus = subject.sceneType === 'landscape' || subject.sceneType === 'still_life'
    ? smoothstep(0.4, 0.75, effectiveSat) * 40 - 20
    : 0;

  return clamp(satScore * 0.5 + tempScore * 0.3 + 50 + sceneSatBonus * 0.2, 0, 100);
}

function calcDetailScore(subject: PhotoSubject, params: DevParams, image: RenderedImageData): number {
  const { width, height } = image;
  const dilLoss = Math.abs(params.dilution - 0.5) * 40;
  const agiLoss = Math.abs(params.agitation - 0.5) * 35;
  const paramScore = clamp(100 - dilLoss - agiLoss, 0, 100);

  let edgeSum = 0;
  let edgeCount = 0;
  const step = 2;

  for (let y = step; y < height - step; y += step * 2) {
    for (let x = step; x < width - step; x += step * 2) {
      const idx = (y * width + x) * 4;
      const idxR = (y * width + x + step) * 4;
      const idxD = ((y + step) * width + x) * 4;
      const c = 0.299 * image.pixels[idx] + 0.587 * image.pixels[idx + 1] + 0.114 * image.pixels[idx + 2];
      const cr = 0.299 * image.pixels[idxR] + 0.587 * image.pixels[idxR + 1] + 0.114 * image.pixels[idxR + 2];
      const cd = 0.299 * image.pixels[idxD] + 0.587 * image.pixels[idxD + 1] + 0.114 * image.pixels[idxD + 2];
      edgeSum += Math.abs(c - cr) + Math.abs(c - cd);
      edgeCount += 2;
    }
  }

  const avgEdge = edgeCount > 0 ? edgeSum / edgeCount : 0;
  const sharpnessScore = subject.sceneType === 'night' || subject.sceneType === 'portrait'
    ? smoothstep(5, 20, avgEdge) * 100
    : smoothstep(8, 30, avgEdge) * 100;

  return clamp(paramScore * 0.5 + sharpnessScore * 0.5, 0, 100);
}

function getGrade(score: number): 'S' | 'A' | 'B' | 'C' | 'D' {
  if (score >= 90) return 'S';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  return 'D';
}

function generateFeedback(
  subject: PhotoSubject,
  params: DevParams,
  scores: { exposure: number; contrast: number; color: number; detail: number; overall: number; grade: string },
  isColorFilm: boolean
): string[] {
  const messages: string[] = [];

  const idealExposure = subject.idealExposure;
  const expDiff = params.exposure - idealExposure;
  if (expDiff > 0.15) {
    messages.push(`曝光过度了！尝试降低曝光值，${subject.sceneType === 'night' ? '夜景对高光非常敏感' : '高光细节有所丢失'}`);
  } else if (expDiff < -0.15) {
    messages.push(`曝光不足，${subject.sceneType === 'landscape' ? '暗部细节没有完全展现' : '画面整体偏暗'}`);
  } else if (scores.exposure >= 85) {
    messages.push('曝光控制非常精准，明暗层次恰到好处！');
  } else if (scores.exposure >= 70) {
    messages.push('曝光基本准确，整体效果不错。');
  }

  const contrastParams = params.contrast * 0.5 + params.developmentTime * 0.3 + params.temperature * 0.2;
  const conDiff = contrastParams - subject.idealContrast;
  if (conDiff > 0.2) {
    messages.push('反差过大，画面显得有些生硬，适当降低对比度或显影时间。');
  } else if (conDiff < -0.2) {
    messages.push('反差不足，画面略显平淡，可以适当增加显影时间或温度。');
  } else if (scores.contrast >= 80) {
    messages.push('反差控制优秀，层次丰富且不生硬。');
  }

  if (isColorFilm) {
    const satDiff = params.saturation - subject.idealSaturation;
    if (satDiff > 0.2) {
      messages.push('饱和度偏高，色彩有些失真。');
    } else if (satDiff < -0.2) {
      messages.push('饱和度偏低，色彩不够鲜明。');
    } else if (scores.color >= 80) {
      messages.push('色彩表现自然，还原度很好。');
    }

    if (params.temperature > 0.7) {
      messages.push('显影温度偏高，整体偏暖调。');
    } else if (params.temperature < 0.3) {
      messages.push('显影温度偏低，画面偏冷。');
    }
  }

  if (scores.detail >= 80) {
    messages.push('细节保留良好，画面质感出色。');
  } else if (scores.detail < 60) {
    if (Math.abs(params.agitation - 0.5) > 0.3) {
      messages.push('搅动方式不够均匀，影响了细节表现。');
    }
    if (Math.abs(params.dilution - 0.5) > 0.3) {
      messages.push('药液稀释比例需要调整。');
    }
  }

  if (scores.grade === 'S') {
    messages.unshift('✨ 大师级作品！完美的暗房处理！');
  } else if (scores.grade === 'A') {
    messages.unshift('非常出色的成果！继续保持！');
  } else if (scores.grade === 'B') {
    messages.unshift('不错的尝试，还有提升空间。');
  } else if (scores.grade === 'C') {
    messages.unshift('基本合格，多练习会更好。');
  } else {
    messages.unshift('继续努力！暗房艺术需要耐心和实践。');
  }

  if (messages.length > 5) {
    return messages.slice(0, 5);
  }
  return messages;
}
