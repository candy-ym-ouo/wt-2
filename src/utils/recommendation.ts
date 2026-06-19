import type { ProcessedPhoto, PhotoSubject, FilmStock, DevParams } from '../types/game';

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
    } else {
      if (bestScore !== undefined) {
        if (bestScore >= 80) {
          recScore += 0.25;
          reasons.push('历史高分，继续保持');
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
