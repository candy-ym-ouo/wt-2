import type { DevParams, DeveloperRecipe, TrialResult, RecipeCompareResult, FilmStock, PhotoSubject } from '../types/game';
import { FILM_STOCKS, PHOTO_SUBJECTS, GRADE_COLORS, GRADE_NAMES } from '../data/gameData';
import { generateId, clamp } from './math';

export function recipeToDevParams(recipe: DeveloperRecipe, baseParams?: Partial<DevParams>): DevParams {
  return {
    exposure: baseParams?.exposure ?? 0.5,
    developmentTime: clamp(recipe.developmentParams.timeMultiplier, 0, 1),
    temperature: clamp(recipe.developmentParams.temperature, 0, 1),
    agitation: clamp(recipe.developmentParams.agitation, 0, 1),
    contrast: baseParams?.contrast ?? 0.5,
    saturation: baseParams?.saturation ?? 0.5,
    dilution: clamp(recipe.developmentParams.dilution, 0, 1)
  };
}

export function calculateTimings(recipe: DeveloperRecipe, baseTimeMs: number = 4000): {
  presoak: number;
  develop: number;
  stop: number;
  fix: number;
  wash: number;
  total: number;
} {
  const timeMult = recipe.developmentParams.timeMultiplier;
  const tempAdj = 0.7 + recipe.developmentParams.temperature * 0.6;
  const dilutionAdj = 0.8 + recipe.developmentParams.dilution * 0.4;
  const agitationAdj = 0.9 + recipe.developmentParams.agitation * 0.2;

  const develop = Math.round(baseTimeMs * timeMult * tempAdj * dilutionAdj);
  const fix = Math.round(2500 * (1 - recipe.developmentParams.dilution) * 0.5 + 2000);
  const wash = Math.round(2000 * recipe.developmentParams.agitation * 0.75 + 1500);
  const presoak = 800;
  const stop = 700;

  return {
    presoak,
    develop,
    stop,
    fix,
    wash,
    total: presoak + develop + stop + fix + wash
  };
}

export function predictScore(
  recipe: DeveloperRecipe,
  film: FilmStock,
  subject?: PhotoSubject
): { score: number; grade: 'S' | 'A' | 'B' | 'C' | 'D'; contrast: number; saturation: number; detail: number; exposure: number } {
  const params = recipeToDevParams(recipe);
  let baseScore = 60;

  const filmMatch = recipe.suitableFilmIds.includes(film.id);
  if (filmMatch) baseScore += 15;

  if (subject && recipe.suitableSceneTypes.includes(subject.sceneType)) {
    baseScore += 10;
  }

  const tempIdeal = 0.5;
  const tempDiff = Math.abs(recipe.developmentParams.temperature - tempIdeal);
  baseScore -= tempDiff * 15;

  const dilutionIdeal = 0.5;
  const dilutionDiff = Math.abs(recipe.developmentParams.dilution - dilutionIdeal);
  baseScore -= dilutionDiff * 10;

  const agitationIdeal = 0.5;
  const agitationDiff = Math.abs(recipe.developmentParams.agitation - agitationIdeal);
  baseScore -= agitationDiff * 8;

  baseScore += Math.random() * 8 - 4;
  baseScore = clamp(baseScore, 30, 100);

  const contrast = clamp(0.4 + recipe.developmentParams.timeMultiplier * 0.3 + recipe.developmentParams.temperature * 0.2, 0, 1);
  const saturation = clamp(film.color === 'bw' ? 0 : (0.4 + (1 - recipe.developmentParams.dilution) * 0.3), 0, 1);
  const detail = clamp(0.5 + (1 - recipe.developmentParams.agitation) * 0.2 + recipe.developmentParams.dilution * 0.2, 0, 1);
  const exposure = clamp(0.5 - (recipe.developmentParams.timeMultiplier - 0.5) * 0.2, 0, 1);

  let grade: 'S' | 'A' | 'B' | 'C' | 'D' = 'C';
  if (baseScore >= 90) grade = 'S';
  else if (baseScore >= 80) grade = 'A';
  else if (baseScore >= 70) grade = 'B';
  else if (baseScore >= 60) grade = 'C';
  else grade = 'D';

  return { score: Math.round(baseScore), grade, contrast, saturation, detail, exposure };
}

export function generateWarnings(recipe: DeveloperRecipe, film: FilmStock): string[] {
  const warnings: string[] = [];

  if (!recipe.suitableFilmIds.includes(film.id)) {
    warnings.push(`此配方未针对 ${film.name} 优化，效果可能不理想`);
  }

  if (recipe.developmentParams.temperature > 0.8) {
    warnings.push('显影温度过高，可能导致灰雾和颗粒增加');
  } else if (recipe.developmentParams.temperature < 0.25) {
    warnings.push('显影温度过低，可能导致显影不足');
  }

  if (recipe.developmentParams.timeMultiplier > 1.5) {
    warnings.push('显影时间过长，对比度可能过高，暗部细节损失');
  } else if (recipe.developmentParams.timeMultiplier < 0.6) {
    warnings.push('显影时间过短，可能导致显影不足');
  }

  if (recipe.developmentParams.agitation > 0.85) {
    warnings.push('搅动过于剧烈，可能导致显影不均匀和气痕');
  } else if (recipe.developmentParams.agitation < 0.2) {
    warnings.push('搅动不足，可能导致显影不均匀');
  }

  if (recipe.developmentParams.dilution < 0.2) {
    warnings.push('药液浓度过高，可能需要注意反应速度');
  }

  return warnings;
}

export function generateSuggestions(recipe: DeveloperRecipe, film: FilmStock, subject?: PhotoSubject): string[] {
  const suggestions: string[] = [];

  if (subject && !recipe.suitableSceneTypes.includes(subject.sceneType)) {
    suggestions.push(`建议调整配方参数以适配${subject.sceneType === 'portrait' ? '人像' : subject.sceneType === 'landscape' ? '风光' : subject.sceneType === 'street' ? '街头' : subject.sceneType === 'still_life' ? '静物' : '夜景'}题材`);
  }

  if (film.color === 'color' && recipe.processType === 'bw') {
    suggestions.push('当前为黑白配方，彩色胶片建议使用C-41工艺配方');
  } else if (film.color === 'bw' && (recipe.processType === 'c41' || recipe.processType === 'e6')) {
    suggestions.push('当前为彩色配方，黑白胶片建议使用黑白显影配方');
  }

  if (recipe.tags.length === 0) {
    suggestions.push('建议添加标签以便更好地分类和检索配方');
  }

  if (!recipe.developerId) {
    suggestions.push('建议关联具体的显影液以获得更准确的参数预测');
  }

  if (!recipe.fixerId) {
    suggestions.push('建议关联定影液配置');
  }

  return suggestions;
}

export function createTrialResult(
  recipe: DeveloperRecipe,
  filmId: string,
  subjectId?: string
): TrialResult {
  const film = FILM_STOCKS.find(f => f.id === filmId) || FILM_STOCKS[0];
  const subject = subjectId ? PHOTO_SUBJECTS.find(s => s.id === subjectId) : undefined;
  const prediction = predictScore(recipe, film, subject);
  const params = recipeToDevParams(recipe, subject ? {
    contrast: subject.idealContrast,
    saturation: subject.idealSaturation,
    exposure: subject.idealExposure
  } : undefined);
  const timings = calculateTimings(recipe);

  return {
    id: generateId(),
    recipeId: recipe.id,
    recipeName: recipe.name,
    filmId,
    subjectId,
    params,
    predictedScore: prediction.score,
    predictedGrade: prediction.grade,
    predictedContrast: prediction.contrast,
    predictedSaturation: prediction.saturation,
    predictedDetail: prediction.detail,
    predictedExposure: prediction.exposure,
    timings,
    warnings: generateWarnings(recipe, film),
    suggestions: generateSuggestions(recipe, film, subject),
    createdAt: Date.now()
  };
}

export function compareRecipes(
  recipeIds: string[],
  recipes: DeveloperRecipe[],
  filmId: string,
  subjectId?: string
): RecipeCompareResult {
  const film = FILM_STOCKS.find(f => f.id === filmId) || FILM_STOCKS[0];
  const subject = subjectId ? PHOTO_SUBJECTS.find(s => s.id === subjectId) : undefined;

  const selectedRecipes = recipes.filter(r => recipeIds.includes(r.id));

  const comparison = selectedRecipes.map(recipe => {
    const prediction = predictScore(recipe, film, subject);
    const timings = calculateTimings(recipe);
    const params = recipeToDevParams(recipe);

    return {
      recipeId: recipe.id,
      recipeName: recipe.name,
      params,
      score: prediction.score,
      grade: prediction.grade,
      contrast: prediction.contrast,
      saturation: prediction.saturation,
      detail: prediction.detail,
      exposure: prediction.exposure,
      totalTime: timings.total,
      tags: [...recipe.tags]
    };
  });

  const sorted = [...comparison].sort((a, b) => b.score - a.score);
  const bestRecipeId = sorted[0]?.recipeId || '';

  const paramList: (keyof DevParams)[] = ['exposure', 'developmentTime', 'temperature', 'agitation', 'contrast', 'saturation', 'dilution'];
  const paramLabels: Record<keyof DevParams, string> = {
    exposure: '曝光',
    developmentTime: '显影时间',
    temperature: '温度',
    agitation: '搅动',
    contrast: '对比度',
    saturation: '饱和度',
    dilution: '稀释度'
  };

  const paramDifferences = paramList.map(param => {
    const values = comparison.map(c => ({
      recipeId: c.recipeId,
      value: c.params[param]
    }));

    const bestForParam = [...values].sort((a, b) => {
      if (param === 'developmentTime' || param === 'temperature') {
        return Math.abs(a.value - 0.5) - Math.abs(b.value - 0.5);
      }
      return b.value - a.value;
    })[0];

    return {
      param,
      label: paramLabels[param],
      values,
      bestRecipeId: bestForParam?.recipeId || ''
    };
  });

  return {
    recipeIds,
    filmId,
    subjectId,
    bestRecipeId,
    comparison,
    paramDifferences,
    createdAt: Date.now()
  };
}

export function formatMs(ms: number): string {
  if (ms >= 1000) {
    const seconds = (ms / 1000).toFixed(1);
    return `${seconds}秒`;
  }
  return `${ms}毫秒`;
}

export function formatTimeReadable(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes > 0) {
    return `${minutes}分${seconds}秒`;
  }
  return `${seconds}秒`;
}

export { GRADE_COLORS, GRADE_NAMES };
