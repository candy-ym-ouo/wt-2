import type { ProcessedPhoto, PhotoSubject, FilmStock, DevParams } from '../types/game';

export type RiskLevel = 'safe' | 'low' | 'moderate' | 'high' | 'critical';

export type RiskCategory =
  | 'overexposure'
  | 'underexposure'
  | 'color_cast'
  | 'grain_control'
  | 'contrast_clash'
  | 'detail_loss';

export interface RiskAssessment {
  category: RiskCategory;
  label: string;
  icon: string;
  level: RiskLevel;
  intensity: number;
  description: string;
  affectedParams: Array<keyof DevParams>;
  suggestion: string;
}

const RISK_LABELS: Record<RiskCategory, { label: string; icon: string }> = {
  overexposure: { label: '过曝风险', icon: '☀️' },
  underexposure: { label: '欠曝风险', icon: '🌑' },
  color_cast: { label: '偏色风险', icon: '🎨' },
  grain_control: { label: '颗粒失控', icon: '🌾' },
  contrast_clash: { label: '反差失控', icon: '◐' },
  detail_loss: { label: '细节丢失', icon: '✨' }
};

function getRiskLevel(intensity: number): RiskLevel {
  if (intensity >= 0.85) return 'critical';
  if (intensity >= 0.65) return 'high';
  if (intensity >= 0.4) return 'moderate';
  if (intensity >= 0.15) return 'low';
  return 'safe';
}

function normalizeIntensity(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export interface Recommendation {
  id: string;
  score: number;
  reasons: string[];
}

const FILM_SUBJECT_AFFINITY: Record<string, Record<string, number>> = {
  hp5: { portrait: 0.7, landscape: 0.5, street: 0.8, still_life: 0.6, night: 0.5 },
  delta3200: { portrait: 0.4, landscape: 0.3, street: 0.5, still_life: 0.3, night: 0.9 },
  portra400: { portrait: 0.95, landscape: 0.5, street: 0.6, still_life: 0.7, night: 0.3 },
  ektar100: { portrait: 0.5, landscape: 0.9, street: 0.5, still_life: 0.8, night: 0.2 },
  velvia50: { portrait: 0.3, landscape: 0.95, street: 0.4, still_life: 0.6, night: 0.4 },
  'tri-x': { portrait: 0.6, landscape: 0.4, street: 0.9, still_life: 0.5, night: 0.7 }
};

function getAverageParams(photos: ProcessedPhoto[]): DevParams | null {
  if (photos.length === 0) return null;
  const sum: DevParams = {
    exposure: 0, developmentTime: 0, temperature: 0,
    agitation: 0, contrast: 0, saturation: 0, dilution: 0
  };
  for (const p of photos) {
    sum.exposure += p.params.exposure;
    sum.developmentTime += p.params.developmentTime;
    sum.temperature += p.params.temperature;
    sum.agitation += p.params.agitation;
    sum.contrast += p.params.contrast;
    sum.saturation += p.params.saturation;
    sum.dilution += p.params.dilution;
  }
  const n = photos.length;
  return {
    exposure: sum.exposure / n,
    developmentTime: sum.developmentTime / n,
    temperature: sum.temperature / n,
    agitation: sum.agitation / n,
    contrast: sum.contrast / n,
    saturation: sum.saturation / n,
    dilution: sum.dilution / n
  };
}

function paramDistance(a: DevParams, b: DevParams): number {
  const keys: (keyof DevParams)[] = ['exposure', 'contrast', 'saturation', 'developmentTime', 'temperature', 'agitation', 'dilution'];
  let total = 0;
  for (const k of keys) {
    total += Math.abs(a[k] - b[k]);
  }
  return total / keys.length;
}

export function getSubjectRecommendations(
  photos: ProcessedPhoto[],
  subjects: PhotoSubject[],
  films: FilmStock[]
): Recommendation[] {
  const results: Recommendation[] = [];

  if (photos.length === 0) {
    const shuffled = [...subjects].sort(() => Math.random() - 0.5);
    return shuffled.map((s, i) => ({
      id: s.id,
      score: 0.6 - i * 0.05,
      reasons: ['新手推荐：试试不同题材，找到你的风格']
    }));
  }

  const sceneTypeAvgScore: Record<string, number[]> = {};
  const subjectBestScore: Record<string, number> = {};
  const subjectPhotoCount: Record<string, number> = {};

  for (const photo of photos) {
    const subject = subjects.find(s => s.id === photo.subjectId);
    if (!subject) continue;
    if (!sceneTypeAvgScore[subject.sceneType]) sceneTypeAvgScore[subject.sceneType] = [];
    sceneTypeAvgScore[subject.sceneType].push(photo.score);
    if (!subjectBestScore[subject.id] || photo.score > subjectBestScore[subject.id]) {
      subjectBestScore[subject.id] = photo.score;
    }
    subjectPhotoCount[subject.id] = (subjectPhotoCount[subject.id] || 0) + 1;
  }

  const sceneTypeAvg: Record<string, number> = {};
  for (const [type, scores] of Object.entries(sceneTypeAvgScore)) {
    sceneTypeAvg[type] = scores.reduce((a, b) => a + b, 0) / scores.length;
  }

  const avgParams = getAverageParams(photos);

  const bestSceneType = Object.entries(sceneTypeAvg).sort((a, b) => b[1] - a[1])[0]?.[0];

  for (const subject of subjects) {
    let recScore = 0;
    const reasons: string[] = [];
    const triedCount = subjectPhotoCount[subject.id] || 0;
    const bestScore = subjectBestScore[subject.id];

    if (triedCount === 0) {
      recScore += 0.35;
      reasons.push('尚未尝试，探索新题材');
      if (subject.difficulty <= 2) {
        recScore += 0.1;
        reasons.push('难度较低，适合新手入门');
      }
    } else {
      if (bestScore !== undefined) {
        if (bestScore >= 80) {
          recScore += 0.25;
          reasons.push('历史高分，继续保持');
          if (subject.scoreMultiplier > 1.0) {
            recScore += 0.1;
            reasons.push('高难度题材，挑战更高分数');
          }
        } else if (bestScore >= 60) {
          recScore += 0.15;
          reasons.push('有提升空间，尝试优化参数');
        } else {
          recScore += 0.1;
          reasons.push('之前效果欠佳，换个思路试试');
        }
      }

      if (triedCount === 1) {
        recScore += 0.1;
        reasons.push('仅拍过一次，值得再次挑战');
      }
    }

    if (bestSceneType) {
      const typeAvg = sceneTypeAvg[subject.sceneType];
      if (typeAvg !== undefined) {
        if (subject.sceneType === bestSceneType) {
          recScore += 0.15;
          if (!reasons.some(r => r.includes('历史高分'))) {
            reasons.push('擅长的题材类型，容易出彩');
          }
        } else {
          const allAvgs = Object.values(sceneTypeAvg);
          const overallAvg = allAvgs.reduce((a, b) => a + b, 0) / allAvgs.length;
          if (typeAvg > overallAvg) {
            recScore += 0.1;
            reasons.push('此类型平均得分较高');
          }
        }
      }
    }

    if (avgParams) {
      const idealParams: DevParams = {
        exposure: subject.idealExposure,
        contrast: subject.idealContrast,
        saturation: subject.idealSaturation,
        developmentTime: 0.5,
        temperature: 0.5,
        agitation: 0.5,
        dilution: 0.5
      };
      const dist = paramDistance(avgParams, idealParams);
      if (dist < 0.1) {
        recScore += 0.2;
        reasons.push('与你的参数习惯非常匹配');
      } else if (dist < 0.2) {
        recScore += 0.1;
        reasons.push('参数习惯相近，容易上手');
      }
    }

    results.push({
      id: subject.id,
      score: Math.min(recScore, 1),
      reasons
    });
  }

  results.sort((a, b) => b.score - a.score);
  const topScore = results[0]?.score || 1;
  for (const r of results) {
    r.score = r.score / topScore;
  }

  return results;
}

export function getFilmRecommendations(
  photos: ProcessedPhoto[],
  subjects: PhotoSubject[],
  films: FilmStock[],
  selectedSubjectId: string | null
): Recommendation[] {
  const results: Recommendation[] = [];

  const selectedSubject = selectedSubjectId
    ? subjects.find(s => s.id === selectedSubjectId)
    : null;

  if (photos.length === 0) {
    for (const film of films) {
      let score = 0.5;
      const reasons: string[] = [];

      if (selectedSubject) {
        const affinity = FILM_SUBJECT_AFFINITY[film.id]?.[selectedSubject.sceneType] ?? 0.5;
        score = affinity;
        if (affinity >= 0.8) {
          reasons.push('与当前题材高度契合');
        } else if (affinity >= 0.6) {
          reasons.push('适合当前题材');
        }
      } else {
        if (film.color === 'bw') {
          reasons.push('经典黑白，入门推荐');
        } else if (film.id === 'portra400') {
          reasons.push('色彩自然，适用面广');
        }
      }

      results.push({ id: film.id, score, reasons });
    }
    return results.sort((a, b) => b.score - a.score);
  }

  const filmSubjectScores: Record<string, Record<string, number[]>> = {};
  const filmScores: Record<string, number[]> = {};
  const filmPhotoCount: Record<string, number> = {};

  for (const photo of photos) {
    const subject = subjects.find(s => s.id === photo.subjectId);
    if (!subject) continue;
    if (!filmSubjectScores[photo.filmId]) filmSubjectScores[photo.filmId] = {};
    if (!filmSubjectScores[photo.filmId][subject.sceneType]) filmSubjectScores[photo.filmId][subject.sceneType] = [];
    filmSubjectScores[photo.filmId][subject.sceneType].push(photo.score);

    if (!filmScores[photo.filmId]) filmScores[photo.filmId] = [];
    filmScores[photo.filmId].push(photo.score);
    filmPhotoCount[photo.filmId] = (filmPhotoCount[photo.filmId] || 0) + 1;
  }

  const avgParams = getAverageParams(photos);
  const highContrastHabit = avgParams ? avgParams.contrast > 0.6 : false;
  const lowContrastHabit = avgParams ? avgParams.contrast < 0.4 : false;
  const highSatHabit = avgParams ? avgParams.saturation > 0.6 : false;
  const lowSatHabit = avgParams ? avgParams.saturation < 0.4 : false;

  for (const film of films) {
    let recScore = 0;
    const reasons: string[] = [];
    const triedCount = filmPhotoCount[film.id] || 0;

    if (selectedSubject) {
      const affinity = FILM_SUBJECT_AFFINITY[film.id]?.[selectedSubject.sceneType] ?? 0.5;
      recScore += affinity * 0.35;
      if (affinity >= 0.85) {
        reasons.push('与当前题材完美搭配');
      } else if (affinity >= 0.7) {
        reasons.push('适合当前题材');
      } else if (affinity < 0.4) {
        reasons.push('与当前题材搭配一般');
      }

      const histScores = filmSubjectScores[film.id]?.[selectedSubject.sceneType];
      if (histScores && histScores.length > 0) {
        const avg = histScores.reduce((a, b) => a + b, 0) / histScores.length;
        recScore += (avg / 100) * 0.25;
        if (avg >= 80) {
          reasons.push('同类题材历史得分高');
        } else if (avg >= 60) {
          reasons.push('同类题材效果尚可');
        }
      }
    } else {
      const histScores = filmScores[film.id];
      if (histScores && histScores.length > 0) {
        const avg = histScores.reduce((a, b) => a + b, 0) / histScores.length;
        recScore += (avg / 100) * 0.3;
        if (avg >= 80) {
          reasons.push('历史平均得分高');
        }
      }
    }

    if (triedCount === 0) {
      recScore += 0.15;
      reasons.push('尚未使用过，值得一试');
    } else if (triedCount <= 2) {
      recScore += 0.05;
      reasons.push('使用次数不多，可以深入探索');
    }

    if (highContrastHabit && film.baseContrast >= 0.7) {
      recScore += 0.1;
      reasons.push('符合你的高反差偏好');
    } else if (lowContrastHabit && film.baseContrast <= 0.55) {
      recScore += 0.1;
      reasons.push('符合你的柔和风格偏好');
    }

    if (film.color === 'color') {
      if (highSatHabit && film.baseSaturation >= 0.8) {
        recScore += 0.1;
        reasons.push('浓郁色彩风格，适合你');
      } else if (lowSatHabit && film.baseSaturation <= 0.6) {
        recScore += 0.1;
        reasons.push('自然色彩风格，适合你');
      }
    } else {
      if (lowSatHabit || avgParams?.saturation === 0) {
        recScore += 0.05;
        reasons.push('黑白胶片适合低饱和偏好');
      }
    }

    results.push({
      id: film.id,
      score: Math.min(recScore, 1),
      reasons
    });
  }

  results.sort((a, b) => b.score - a.score);
  const topScore = results[0]?.score || 1;
  for (const r of results) {
    r.score = r.score / topScore;
  }

  return results;
}

export function calculateParamRisks(
  params: DevParams,
  subject: PhotoSubject | null,
  film: FilmStock
): RiskAssessment[] {
  const risks: RiskAssessment[] = [];

  risks.push(calcOverexposureRisk(params, subject));
  risks.push(calcUnderexposureRisk(params, subject));
  if (film.color === 'color') {
    risks.push(calcColorCastRisk(params, subject));
  }
  risks.push(calcGrainControlRisk(params, film));
  risks.push(calcContrastClashRisk(params, subject));
  risks.push(calcDetailLossRisk(params));

  return risks
    .filter(r => r.level !== 'safe')
    .sort((a, b) => b.intensity - a.intensity);
}

function calcOverexposureRisk(params: DevParams, subject: PhotoSubject | null): RiskAssessment {
  const meta = RISK_LABELS.overexposure;
  const ideal = subject?.idealExposure ?? 0.5;
  const diff = params.exposure - ideal;

  let intensity = 0;
  let description = '';

  if (diff > 0) {
    const weightByScene = subject?.sceneType === 'night' || subject?.sceneType === 'portrait' ? 1.5 : 1.0;
    intensity = normalizeIntensity(diff * 2.2 * weightByScene);

    if (intensity >= 0.8) description = '严重过曝！高光区域将大面积溢出，细节完全丢失';
    else if (intensity >= 0.6) description = '过曝明显，天空或高光区域可能出现死白，难以挽回';
    else if (intensity >= 0.4) description = '曝光偏多，注意观察高光区域，适当压暗';
    else if (intensity >= 0.15) description = '轻微过曝倾向，整体亮度偏高';
  }

  return {
    category: 'overexposure',
    label: meta.label,
    icon: meta.icon,
    level: getRiskLevel(intensity),
    intensity,
    description: description || '曝光安全，高光区域有保护',
    affectedParams: ['exposure', 'developmentTime'],
    suggestion: diff > 0.15
      ? '建议降低曝光值，或缩短显影时间以控制高光密度'
      : diff > 0.05
      ? '可适当微调曝光，避免高光溢出'
      : '曝光区间安全'
  };
}

function calcUnderexposureRisk(params: DevParams, subject: PhotoSubject | null): RiskAssessment {
  const meta = RISK_LABELS.underexposure;
  const ideal = subject?.idealExposure ?? 0.5;
  const diff = ideal - params.exposure;

  let intensity = 0;
  let description = '';

  if (diff > 0) {
    const weightByScene = subject?.sceneType === 'landscape' ? 1.3 : 1.0;
    intensity = normalizeIntensity(diff * 2.0 * weightByScene);

    if (intensity >= 0.8) description = '严重欠曝！暗部大面积死黑，后期提亮将产生严重噪点';
    else if (intensity >= 0.6) description = '欠曝明显，暗部细节几乎无法辨认';
    else if (intensity >= 0.4) description = '曝光偏少，暗部层次不够舒展';
    else if (intensity >= 0.15) description = '轻微欠曝倾向，整体略偏暗';
  }

  return {
    category: 'underexposure',
    label: meta.label,
    icon: meta.icon,
    level: getRiskLevel(intensity),
    intensity,
    description: description || '曝光安全，暗部层次有保留',
    affectedParams: ['exposure', 'developmentTime'],
    suggestion: diff > 0.15
      ? '建议增加曝光值，或延长显影时间以提亮暗部'
      : diff > 0.05
      ? '可适当增加曝光，让暗部更通透'
      : '曝光区间安全'
  };
}

function calcColorCastRisk(params: DevParams, subject: PhotoSubject | null): RiskAssessment {
  const meta = RISK_LABELS.color_cast;
  const tempDiff = Math.abs(params.temperature - 0.5);
  const idealSat = subject?.idealSaturation ?? 0.5;
  const satDiff = Math.abs(params.saturation - idealSat);

  const tempIntensity = tempDiff * 2.0;
  const satIntensity = satDiff * 1.6;
  const intensity = normalizeIntensity(Math.max(tempIntensity, satIntensity) * 0.6 + Math.min(tempIntensity, satIntensity) * 0.4);

  let description = '';
  const tempDir = params.temperature > 0.55 ? '偏暖（黄橙调）' : params.temperature < 0.45 ? '偏冷（青蓝调）' : '';
  const satDir = params.saturation > idealSat + 0.1 ? '过于浓郁' : params.saturation < idealSat - 0.1 ? '过于平淡' : '';

  if (intensity >= 0.8) description = `严重偏色！${tempDir || satDir}，色彩严重失真`;
  else if (intensity >= 0.6) description = `明显偏色，${tempDir || satDir}，需注意调整`;
  else if (intensity >= 0.4) description = `色彩${tempDir ? tempDir + '，' : ''}${satDir || '偏离理想范围'}`;
  else if (intensity >= 0.15) description = '轻微色彩偏差，可接受范围';

  const affected: Array<keyof DevParams> = [];
  if (tempDiff > 0.05) affected.push('temperature');
  if (satDiff > 0.05) affected.push('saturation');
  if (affected.length === 0) affected.push('temperature', 'saturation');

  return {
    category: 'color_cast',
    label: meta.label,
    icon: meta.icon,
    level: getRiskLevel(intensity),
    intensity,
    description: description || '色彩平衡正常',
    affectedParams: affected,
    suggestion: tempDiff > 0.15
      ? '将药液温度回调到中间范围，避免明显色偏'
      : satDiff > 0.15
      ? '调整饱和度参数，使色彩表现更自然'
      : tempDiff > 0.05 || satDiff > 0.05
      ? '可微调温度或饱和度，优化色彩表现'
      : '色彩区间安全'
  };
}

function calcGrainControlRisk(params: DevParams, film: FilmStock): RiskAssessment {
  const meta = RISK_LABELS.grain_control;

  const grainBase = film.grainSize;
  const devTimeFactor = params.developmentTime * 0.35;
  const tempFactor = params.temperature * 0.25;
  const agiFactor = params.agitation * 0.2;
  const contrastFactor = params.contrast * 0.2;

  const effectiveGrain = grainBase * 0.5 + devTimeFactor + tempFactor + agiFactor + contrastFactor;
  const threshold = film.iso >= 3200 ? 1.1 : film.iso >= 400 ? 0.9 : 0.75;
  const intensity = normalizeIntensity(Math.max(0, (effectiveGrain - threshold) * 2.5));

  let description = '';
  if (intensity >= 0.8) description = '颗粒严重失控！画面粗糙如砂纸，细节被颗粒完全吞没';
  else if (intensity >= 0.6) description = '颗粒感极强，纹理细节受到明显影响';
  else if (intensity >= 0.4) description = '颗粒偏重，画面质感开始向粗犷发展';
  else if (intensity >= 0.15) description = '颗粒感略有增加，风格化倾向';

  return {
    category: 'grain_control',
    label: meta.label,
    icon: meta.icon,
    level: getRiskLevel(intensity),
    intensity,
    description: description || (grainBase > 0.6 ? '粗颗粒胶片，注意控制参数避免过度' : '颗粒表现良好，细节清晰'),
    affectedParams: ['developmentTime', 'temperature', 'agitation', 'contrast'],
    suggestion: intensity >= 0.4
      ? '缩短显影时间、降低温度、减少搅动，可有效抑制颗粒增长'
      : intensity >= 0.15
      ? '注意控制显影参数，避免颗粒进一步加重'
      : '颗粒控制安全'
  };
}

function calcContrastClashRisk(params: DevParams, subject: PhotoSubject | null): RiskAssessment {
  const meta = RISK_LABELS.contrast_clash;
  const idealContrast = subject?.idealContrast ?? 0.5;

  const effectiveContrast =
    params.contrast * 0.5 +
    params.developmentTime * 0.3 +
    params.temperature * 0.2;

  const diff = Math.abs(effectiveContrast - idealContrast);
  const direction = effectiveContrast > idealContrast ? '过高' : '过低';

  let intensity = normalizeIntensity(diff * 2.5);
  let description = '';

  if (subject?.sceneType === 'portrait' && effectiveContrast > 0.7) intensity = Math.min(1, intensity * 1.2);
  if (subject?.sceneType === 'landscape' && effectiveContrast < 0.5) intensity = Math.min(1, intensity * 1.15);

  if (intensity >= 0.8) description = `反差${direction === '过高' ? '极度硬调' : '极度平淡'}，画面层次严重缺失`;
  else if (intensity >= 0.6) description = `反差${direction}，明暗过渡${direction === '过高' ? '生硬断层' : '没有张力'}`;
  else if (intensity >= 0.4) description = `反差偏${direction}，与题材理想风格有差距`;
  else if (intensity >= 0.15) description = `反差略${direction}，风格化微调`;

  return {
    category: 'contrast_clash',
    label: meta.label,
    icon: meta.icon,
    level: getRiskLevel(intensity),
    intensity,
    description: description || '反差控制良好，层次过渡自然',
    affectedParams: ['contrast', 'developmentTime', 'temperature'],
    suggestion: diff > 0.15
      ? direction === '过高'
        ? '降低对比度或缩短显影时间，让明暗过渡更柔和'
        : '增加对比度或延长显影时间，增强画面张力'
      : diff > 0.05
      ? direction === '过高'
        ? '可微调降低反差参数'
        : '可微调提高反差参数'
      : '反差区间安全'
  };
}

function calcDetailLossRisk(params: DevParams): RiskAssessment {
  const meta = RISK_LABELS.detail_loss;

  const agiExtreme = Math.abs(params.agitation - 0.5);
  const dilExtreme = Math.abs(params.dilution - 0.5);
  const devExtreme = Math.abs(params.developmentTime - 0.5);

  const agiIntensity = agiExtreme * 1.8;
  const dilIntensity = dilExtreme * 1.6;
  const devIntensity = devExtreme * 0.8;

  const intensity = normalizeIntensity(
    Math.max(agiIntensity, dilIntensity) * 0.5 +
    Math.min(agiIntensity, dilIntensity) * 0.3 +
    devIntensity * 0.2
  );

  let description = '';
  const issues: string[] = [];
  if (agiExtreme > 0.2) issues.push(params.agitation > 0.7 ? '过度搅动导致显影不均' : '搅动不足导致画面发灰');
  if (dilExtreme > 0.2) issues.push(params.dilution > 0.7 ? '药液过稀，反应不足' : '药液过浓，边缘效应过强');

  if (intensity >= 0.8) description = `细节严重损失！${issues.join('，')}`;
  else if (intensity >= 0.6) description = `细节受损风险高，${issues.join('且')}`;
  else if (intensity >= 0.4) description = issues.length > 0 ? issues.join('，影响细节表现') : '细节参数偏离理想范围';
  else if (intensity >= 0.15) description = '细节参数略偏离，影响较轻微';

  const affected: Array<keyof DevParams> = [];
  if (agiExtreme > 0.1) affected.push('agitation');
  if (dilExtreme > 0.1) affected.push('dilution');
  if (devExtreme > 0.15) affected.push('developmentTime');
  if (affected.length === 0) affected.push('agitation', 'dilution');

  return {
    category: 'detail_loss',
    label: meta.label,
    icon: meta.icon,
    level: getRiskLevel(intensity),
    intensity,
    description: description || '细节表现安全，参数组合均衡',
    affectedParams: affected,
    suggestion: intensity >= 0.4
      ? '将搅动和稀释比例调整到中间区间，确保均匀显影'
      : intensity >= 0.15
      ? '可微调搅动和稀释参数，优化细节表现'
      : '细节控制安全'
  };
}

export function getRiskLevelColor(level: RiskLevel): string {
  switch (level) {
    case 'critical': return '#e05555';
    case 'high': return '#e09850';
    case 'moderate': return '#d4b860';
    case 'low': return '#68b8c8';
    default: return '#68c888';
  }
}

export function getRiskLevelBg(level: RiskLevel): string {
  switch (level) {
    case 'critical': return 'rgba(224, 85, 85, 0.15)';
    case 'high': return 'rgba(224, 152, 80, 0.15)';
    case 'moderate': return 'rgba(212, 184, 96, 0.15)';
    case 'low': return 'rgba(104, 184, 200, 0.15)';
    default: return 'rgba(104, 200, 136, 0.1)';
  }
}

export function getRiskLevelLabel(level: RiskLevel): string {
  switch (level) {
    case 'critical': return '危险';
    case 'high': return '警告';
    case 'moderate': return '注意';
    case 'low': return '提示';
    default: return '安全';
  }
}
