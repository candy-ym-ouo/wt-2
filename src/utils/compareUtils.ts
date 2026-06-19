import type { ProcessedPhoto, DevParams, ParamDiff, ScoreDiff, BestRecommendation, PhotoSubject } from '../types/game';

export const PARAM_LABELS: Record<keyof DevParams, string> = {
  exposure: '曝光',
  contrast: '反差',
  saturation: '饱和度',
  developmentTime: '显影时间',
  temperature: '温度',
  agitation: '搅动',
  dilution: '稀释度'
};

export const PARAM_ICONS: Record<keyof DevParams, string> = {
  exposure: '☀',
  contrast: '◐',
  saturation: '🎨',
  developmentTime: '⏱',
  temperature: '🌡',
  agitation: '🔄',
  dilution: '💧'
};

export function calculateParamDiffs(
  photos: ProcessedPhoto[],
  subject: PhotoSubject | undefined
): ParamDiff[] {
  if (photos.length < 2) return [];

  const paramKeys: (keyof DevParams)[] = [
    'exposure', 'contrast', 'saturation',
    'developmentTime', 'temperature', 'agitation', 'dilution'
  ];

  const idealParams = subject ? {
    exposure: subject.idealExposure,
    contrast: subject.idealContrast,
    saturation: subject.idealSaturation,
    developmentTime: 0.5,
    temperature: 0.5,
    agitation: 0.5,
    dilution: 0.5
  } : null;

  return paramKeys.map(param => {
    const values = photos.map(p => p.params[param]);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const diffPercent = maxValue - minValue;

    let bestValue = maxValue;
    let bestPhotoId = photos[0].id;

    if (idealParams) {
      let bestDistance = Infinity;
      photos.forEach(photo => {
        const distance = Math.abs(photo.params[param] - idealParams[param]);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestValue = photo.params[param];
          bestPhotoId = photo.id;
        }
      });
    } else {
      photos.forEach(photo => {
        if (photo.score > photos.find(p => p.id === bestPhotoId)!.score) {
          bestValue = photo.params[param];
          bestPhotoId = photo.id;
        }
      });
    }

    return {
      param,
      label: PARAM_LABELS[param],
      values,
      minValue,
      maxValue,
      bestValue,
      bestPhotoId,
      isSignificant: diffPercent > 0.1,
      diffPercent
    };
  });
}

export function calculateScoreDiffs(photos: ProcessedPhoto[]): ScoreDiff[] {
  if (photos.length < 2) return [];

  const categories: Array<{ key: ScoreDiff['category']; label: string }> = [
    { key: 'overall', label: '总分' },
    { key: 'exposure', label: '曝光' },
    { key: 'contrast', label: '层次反差' },
    { key: 'color', label: '色彩还原' },
    { key: 'detail', label: '细节质感' }
  ];

  return categories.map(cat => {
    const values = photos.map(p =>
      cat.key === 'overall' ? p.details.overall : p.details[cat.key]
    );
    const bestValue = Math.max(...values);
    const bestPhotoId = photos[values.indexOf(bestValue)].id;

    return {
      category: cat.key,
      label: cat.label,
      values,
      bestValue,
      bestPhotoId
    };
  });
}

export function getBestRecommendation(
  photos: ProcessedPhoto[],
  subject: PhotoSubject | undefined
): BestRecommendation | null {
  if (photos.length === 0) return null;

  const sortedPhotos = [...photos].sort((a, b) => b.score - a.score);
  const bestPhoto = sortedPhotos[0];
  const reasons: string[] = [];

  reasons.push(`综合得分最高：${bestPhoto.score} 分，等级 ${bestPhoto.details.grade}`);

  const paramDiffs = calculateParamDiffs(photos, subject);
  const significantDiffs = paramDiffs.filter(d => d.isSignificant && d.bestPhotoId === bestPhoto.id);

  if (significantDiffs.length > 0) {
    const params = significantDiffs.slice(0, 3).map(d => d.label);
    reasons.push(`参数优势：${params.join('、')} 更接近理想值`);
  }

  const scoreDiffs = calculateScoreDiffs(photos);
  const topCategories = scoreDiffs
    .filter(s => s.bestPhotoId === bestPhoto.id && s.category !== 'overall')
    .map(s => s.label);

  if (topCategories.length > 0) {
    reasons.push(`表现突出：${topCategories.join('、')} 方面最佳`);
  }

  const bestDetails = bestPhoto.details;
  if (bestDetails.overall >= 85) {
    reasons.push('作品质量优秀，已达到大师级水准');
  } else if (bestDetails.overall >= 70) {
    reasons.push('作品质量良好，参数控制得当');
  }

  if (bestDetails.feedback.length > 0) {
    const positiveFeedback = bestDetails.feedback.find(f =>
      f.includes('优秀') || f.includes('出色') || f.includes('良好') || f.includes('最佳')
    );
    if (positiveFeedback) {
      reasons.push(`技术亮点：${positiveFeedback}`);
    }
  }

  return {
    photoId: bestPhoto.id,
    score: bestPhoto.score,
    reasons,
    params: { ...bestPhoto.params }
  };
}

export function getSubjectPhotos(photos: ProcessedPhoto[], subjectId: string): ProcessedPhoto[] {
  return photos.filter(p => p.subjectId === subjectId);
}

export function formatParamValue(value: number): string {
  return Math.round(value * 100).toString();
}
