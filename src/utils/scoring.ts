import type {
  PhotoSubject,
  DevParams,
  ScoreDetail,
  KeyArea,
  KeyAreaResult,
  ParamDeviation,
  DeductionItem
} from '../types/game';
import type { RenderedImageData } from './renderEngine';
import { clamp, smoothstep } from './math';

interface ScoreContext {
  exposureScore: number;
  contrastScore: number;
  colorScore: number;
  detailScore: number;
  overall: number;
  grade: string;
  keyAreaResults: KeyAreaResult[];
  paramDeviations: ParamDeviation[];
  deductions: DeductionItem[];
  overexposedPct: number;
  underexposedPct: number;
  dynamicRange: number;
  sharpness: number;
}

const PARAM_LABELS: Record<string, string> = {
  exposure: '曝光',
  contrast: '反差',
  developmentTime: '显影时间',
  temperature: '显影温度',
  saturation: '饱和度',
  agitation: '搅动方式',
  dilution: '药液稀释'
};

export function calculateScore(
  subject: PhotoSubject,
  params: DevParams,
  finalImage: RenderedImageData,
  isColorFilm: boolean
): ScoreDetail {
  const ctx: ScoreContext = {
    exposureScore: 0,
    contrastScore: 0,
    colorScore: 0,
    detailScore: 0,
    overall: 0,
    grade: 'D',
    keyAreaResults: [],
    paramDeviations: [],
    deductions: [],
    overexposedPct: 0,
    underexposedPct: 0,
    dynamicRange: 0,
    sharpness: 0
  };

  const exposureResult = calcExposureScore(subject, params, finalImage, ctx);
  const contrastResult = calcContrastScore(subject, params, finalImage, ctx);
  const colorResult = calcColorScore(subject, params, isColorFilm, ctx);
  const detailResult = calcDetailScore(subject, params, finalImage, ctx);

  ctx.exposureScore = exposureResult;
  ctx.contrastScore = contrastResult;
  ctx.colorScore = colorResult;
  ctx.detailScore = detailResult;

  const exposureW = 0.35;
  const contrastW = 0.25;
  const colorW = isColorFilm ? 0.2 : 0;
  const detailW = isColorFilm ? 0.2 : 0.4;

  ctx.overall = Math.round(
    exposureResult * exposureW +
    contrastResult * contrastW +
    colorResult * colorW +
    detailResult * detailW
  );

  ctx.grade = getGrade(ctx.overall);
  const feedback = generateFeedback(subject, params, {
    exposure: Math.round(exposureResult),
    contrast: Math.round(contrastResult),
    color: Math.round(colorResult),
    detail: Math.round(detailResult),
    overall: ctx.overall,
    grade: ctx.grade
  }, isColorFilm);

  generateParamDeviations(subject, params, isColorFilm, ctx);
  generateDeductions(ctx, subject, isColorFilm);

  return {
    exposure: Math.round(exposureResult),
    contrast: Math.round(contrastResult),
    color: Math.round(colorResult),
    detail: Math.round(detailResult),
    overall: ctx.overall,
    grade: ctx.grade as 'S' | 'A' | 'B' | 'C' | 'D',
    feedback,
    keyAreaResults: ctx.keyAreaResults,
    paramDeviations: ctx.paramDeviations,
    deductions: ctx.deductions,
    overexposedPct: ctx.overexposedPct,
    underexposedPct: ctx.underexposedPct,
    dynamicRange: ctx.dynamicRange,
    sharpness: ctx.sharpness
  };
}

function calcExposureScore(
  subject: PhotoSubject,
  params: DevParams,
  image: RenderedImageData,
  ctx: ScoreContext
): number {
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
  ctx.overexposedPct = Math.round(overPct * 10000) / 100;
  ctx.underexposedPct = Math.round(underPct * 10000) / 100;
  const clipPenalty = (overPct + underPct * 0.8) * 500;

  let keyAreaBonus = 0;
  let keyAreaCount = 0;
  for (const area of subject.keyAreas) {
    const avgLum = getKeyAreaLuminance(image, area);
    const actualBrightness = avgLum / 255;
    const diff = Math.abs(actualBrightness - area.idealBrightness);
    const areaScore = clamp(100 - diff * 150, 0, 100);
    keyAreaBonus += areaScore;
    keyAreaCount++;

    let hitStatus: 'excellent' | 'good' | 'fair' | 'poor' = 'poor';
    if (areaScore >= 85) hitStatus = 'excellent';
    else if (areaScore >= 70) hitStatus = 'good';
    else if (areaScore >= 50) hitStatus = 'fair';

    ctx.keyAreaResults.push({
      name: area.name,
      x: area.x,
      y: area.y,
      w: area.w,
      h: area.h,
      importance: area.importance,
      idealBrightness: area.idealBrightness,
      actualBrightness: Math.round(actualBrightness * 100) / 100,
      brightnessDiff: Math.round(diff * 100) / 100,
      score: Math.round(areaScore),
      isHit: areaScore >= 60,
      hitStatus
    });
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

function calcContrastScore(
  subject: PhotoSubject,
  params: DevParams,
  image: RenderedImageData,
  ctx: ScoreContext
): number {
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
  ctx.dynamicRange = Math.round(dynamicRange * 100) / 100;
  const drScore = subject.sceneType === 'night' || subject.sceneType === 'landscape'
    ? smoothstep(0.4, 0.75, dynamicRange) * 100
    : smoothstep(0.3, 0.6, dynamicRange) * 100;

  return clamp(baseScore * 0.6 + drScore * 0.4, 0, 100);
}

function calcColorScore(
  subject: PhotoSubject,
  params: DevParams,
  isColorFilm: boolean,
  ctx: ScoreContext
): number {
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

function calcDetailScore(
  subject: PhotoSubject,
  params: DevParams,
  image: RenderedImageData,
  ctx: ScoreContext
): number {
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
  ctx.sharpness = Math.round(avgEdge * 10) / 10;
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

function generateParamDeviations(
  subject: PhotoSubject,
  params: DevParams,
  isColorFilm: boolean,
  ctx: ScoreContext
): void {
  const paramMap: Array<{ key: string; ideal: number; actual: number; suggestion: (dir: 'high' | 'low') => string }> = [
    {
      key: 'exposure',
      ideal: subject.idealExposure,
      actual: params.exposure,
      suggestion: (dir) => dir === 'high'
        ? '适当降低曝光值，避免高光溢出'
        : '适当增加曝光值，保留暗部细节'
    },
    {
      key: 'contrast',
      ideal: subject.idealContrast,
      actual: params.contrast,
      suggestion: (dir) => dir === 'high'
        ? '降低反差参数，使画面更柔和'
        : '提高反差参数，增强画面层次'
    },
    {
      key: 'developmentTime',
      ideal: 0.5,
      actual: params.developmentTime,
      suggestion: (dir) => dir === 'high'
        ? '缩短显影时间，避免反差过高'
        : '延长显影时间，增加画面密度'
    },
    {
      key: 'temperature',
      ideal: 0.5,
      actual: params.temperature,
      suggestion: (dir) => dir === 'high'
        ? '降低显影温度，控制化学反应速度'
        : '提高显影温度，加快显影速度'
    },
    {
      key: 'agitation',
      ideal: 0.5,
      actual: params.agitation,
      suggestion: (dir) => dir === 'high'
        ? '减少搅动频率，避免画面不均'
        : '增加搅动频率，确保显影均匀'
    },
    {
      key: 'dilution',
      ideal: 0.5,
      actual: params.dilution,
      suggestion: (dir) => dir === 'high'
        ? '降低药液稀释比例，增加药液浓度'
        : '提高药液稀释比例，柔化画面效果'
    }
  ];

  if (isColorFilm) {
    paramMap.push({
      key: 'saturation',
      ideal: subject.idealSaturation,
      actual: params.saturation,
      suggestion: (dir) => dir === 'high'
        ? '降低饱和度，使色彩更自然'
        : '提高饱和度，使色彩更鲜明'
    });
  }

  for (const item of paramMap) {
    const deviation = item.actual - item.ideal;
    const absDeviation = Math.abs(deviation);
    const deviationPercent = Math.round(absDeviation * 100);
    const scoreImpact = Math.round(absDeviation * 100 * 1.2);

    let direction: 'high' | 'low' | 'optimal' = 'optimal';
    if (deviation > 0.02) direction = 'high';
    else if (deviation < -0.02) direction = 'low';

    if (absDeviation > 0.02) {
      ctx.paramDeviations.push({
        param: item.key,
        label: PARAM_LABELS[item.key],
        idealValue: Math.round(item.ideal * 100) / 100,
        actualValue: Math.round(item.actual * 100) / 100,
        deviation: Math.round(deviation * 100) / 100,
        deviationPercent,
        direction,
        scoreImpact,
        suggestion: item.suggestion(direction === 'optimal' ? 'high' : direction)
      });
    }
  }

  ctx.paramDeviations.sort((a, b) => b.scoreImpact - a.scoreImpact);
}

function generateDeductions(
  ctx: ScoreContext,
  subject: PhotoSubject,
  isColorFilm: boolean
): void {
  const deductions: DeductionItem[] = [];

  if (ctx.overexposedPct > 1) {
    const severity = getSeverity(ctx.overexposedPct, 1, 5, 10);
    deductions.push({
      category: 'exposure',
      categoryLabel: '曝光控制',
      reason: `高光溢出区域占 ${ctx.overexposedPct}%，细节丢失`,
      pointsLost: Math.round(ctx.overexposedPct * 2),
      severity,
      suggestion: '降低曝光值，或使用渐晕滤镜压暗天空'
    });
  }

  if (ctx.underexposedPct > 2) {
    const severity = getSeverity(ctx.underexposedPct, 2, 8, 15);
    deductions.push({
      category: 'exposure',
      categoryLabel: '曝光控制',
      reason: `暗部死黑区域占 ${ctx.underexposedPct}%，没有层次`,
      pointsLost: Math.round(ctx.underexposedPct * 1.5),
      severity,
      suggestion: '增加曝光值，或在后期提亮暗部'
    });
  }

  const missedKeyAreas = ctx.keyAreaResults.filter(a => !a.isHit);
  if (missedKeyAreas.length > 0) {
    const totalLost = missedKeyAreas.reduce((sum, a) => sum + (100 - a.score) * a.importance, 0);
    const severity = getSeverity(totalLost, 5, 15, 30);
    deductions.push({
      category: 'exposure',
      categoryLabel: '曝光控制',
      reason: `${missedKeyAreas.length} 个关键区域亮度偏离理想值`,
      pointsLost: Math.round(totalLost / 5),
      severity,
      suggestion: '针对关键区域进行分区曝光，或使用曝光补偿'
    });
  }

  if (ctx.dynamicRange < 0.3) {
    const severity = getSeverity(0.3 - ctx.dynamicRange, 0.05, 0.15, 0.25);
    deductions.push({
      category: 'contrast',
      categoryLabel: '层次反差',
      reason: `动态范围不足（${Math.round(ctx.dynamicRange * 100)}%），画面层次感弱`,
      pointsLost: Math.round((0.3 - ctx.dynamicRange) * 100),
      severity,
      suggestion: '增加显影时间，或选择高反差胶片'
    });
  }

  const contrastParams = ctx.paramDeviations.find(p => p.param === 'contrast' || p.param === 'developmentTime');
  if (contrastParams && Math.abs(contrastParams.deviation) > 0.15) {
    const severity = getSeverity(Math.abs(contrastParams.deviation), 0.15, 0.25, 0.35);
    deductions.push({
      category: 'contrast',
      categoryLabel: '层次反差',
      reason: `${contrastParams.label}${contrastParams.direction === 'high' ? '偏高' : '偏低'}，偏离理想值 ${Math.round(Math.abs(contrastParams.deviation) * 100)}%`,
      pointsLost: contrastParams.scoreImpact,
      severity,
      suggestion: contrastParams.suggestion
    });
  }

  if (isColorFilm) {
    const satDev = ctx.paramDeviations.find(p => p.param === 'saturation');
    if (satDev && Math.abs(satDev.deviation) > 0.15) {
      const severity = getSeverity(Math.abs(satDev.deviation), 0.15, 0.25, 0.35);
      deductions.push({
        category: 'color',
        categoryLabel: '色彩还原',
        reason: `饱和度${satDev.direction === 'high' ? '偏高' : '偏低'}，色彩${satDev.direction === 'high' ? '过于艳丽' : '不够鲜明'}`,
        pointsLost: satDev.scoreImpact,
        severity,
        suggestion: satDev.suggestion
      });
    }

    const tempDev = ctx.paramDeviations.find(p => p.param === 'temperature');
    if (tempDev && Math.abs(tempDev.deviation) > 0.2) {
      const severity = getSeverity(Math.abs(tempDev.deviation), 0.2, 0.3, 0.4);
      deductions.push({
        category: 'color',
        categoryLabel: '色彩还原',
        reason: `显影温度${tempDev.direction === 'high' ? '偏高' : '偏低'}，画面${tempDev.direction === 'high' ? '偏暖' : '偏冷'}`,
        pointsLost: Math.round(Math.abs(tempDev.deviation) * 80),
        severity,
        suggestion: tempDev.suggestion
      });
    }
  }

  if (ctx.sharpness < 8) {
    const severity = getSeverity(8 - ctx.sharpness, 2, 4, 6);
    deductions.push({
      category: 'detail',
      categoryLabel: '细节质感',
      reason: `锐度不足（${ctx.sharpness}），画面细节模糊`,
      pointsLost: Math.round((8 - ctx.sharpness) * 5),
      severity,
      suggestion: '增加搅动频率，或选择细颗粒胶片'
    });
  }

  const agiDev = ctx.paramDeviations.find(p => p.param === 'agitation');
  const dilDev = ctx.paramDeviations.find(p => p.param === 'dilution');
  if (agiDev && Math.abs(agiDev.deviation) > 0.25) {
    const severity = getSeverity(Math.abs(agiDev.deviation), 0.25, 0.35, 0.45);
    deductions.push({
      category: 'detail',
      categoryLabel: '细节质感',
      reason: `搅动方式${agiDev.direction === 'high' ? '过于频繁' : '不足'}，影响均匀度`,
      pointsLost: agiDev.scoreImpact,
      severity,
      suggestion: agiDev.suggestion
    });
  }

  if (dilDev && Math.abs(dilDev.deviation) > 0.25) {
    const severity = getSeverity(Math.abs(dilDev.deviation), 0.25, 0.35, 0.45);
    deductions.push({
      category: 'detail',
      categoryLabel: '细节质感',
      reason: `药液稀释${dilDev.direction === 'high' ? '过度' : '不足'}，影响颗粒质感`,
      pointsLost: dilDev.scoreImpact,
      severity,
      suggestion: dilDev.suggestion
    });
  }

  deductions.sort((a, b) => b.pointsLost - a.pointsLost);
  ctx.deductions = deductions;
}

function getSeverity(value: number, minor: number, moderate: number, major: number): 'minor' | 'moderate' | 'major' | 'critical' {
  if (value >= major) return 'critical';
  if (value >= moderate) return 'major';
  if (value >= minor) return 'moderate';
  return 'minor';
}
