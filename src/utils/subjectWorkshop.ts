import type {
  SceneTemplate,
  KeyArea,
  KeyAreaDraft,
  ScoreRuleSet,
  DevParams,
  PhotoSubject,
  ScenePalette,
  SceneTemplateCategory
} from '../types/game';
import { generateId, clamp } from './math';
import { KEY_AREA_COLORS, DEFAULT_PALETTES, createBlankTemplate } from '../data/gameData';

export interface TemplateValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateTemplate(template: SceneTemplate): TemplateValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!template.name || template.name.trim().length === 0) {
    errors.push('场景名称不能为空');
  } else if (template.name.trim().length > 50) {
    errors.push('场景名称不能超过50个字符');
  }

  if (!template.description || template.description.trim().length === 0) {
    warnings.push('建议填写场景描述，帮助理解拍摄意图');
  }

  if (template.idealExposure < 0 || template.idealExposure > 1) {
    errors.push('理想曝光值必须在 0-1 之间');
  }
  if (template.idealContrast < 0 || template.idealContrast > 1) {
    errors.push('理想对比度必须在 0-1 之间');
  }
  if (template.idealSaturation < 0 || template.idealSaturation > 1) {
    errors.push('理想饱和度必须在 0-1 之间');
  }
  if (template.baseBrightness < 0 || template.baseBrightness > 1) {
    errors.push('基础亮度必须在 0-1 之间');
  }

  if (template.difficulty < 1 || template.difficulty > 5) {
    errors.push('难度等级必须在 1-5 之间');
  }

  if (template.scoreMultiplier < 0.5 || template.scoreMultiplier > 3) {
    warnings.push('分数倍率建议在 0.5-3.0 之间');
  }

  if (template.keyAreas.length === 0) {
    warnings.push('建议至少定义一个关键区域');
  } else {
    const totalImportance = template.keyAreas.reduce((sum, ka) => sum + ka.importance, 0);
    if (Math.abs(totalImportance - 1) > 0.01) {
      warnings.push(`关键区域重要性总和为 ${totalImportance.toFixed(2)}，建议等于 1.0`);
    }
    template.keyAreas.forEach((ka, idx) => {
      if (!ka.name || ka.name.trim().length === 0) {
        errors.push(`第 ${idx + 1} 个关键区域：名称不能为空`);
      }
      if (ka.x < 0 || ka.x > 1 || ka.y < 0 || ka.y > 1 ||
          ka.w < 0 || ka.w > 1 || ka.h < 0 || ka.h > 1) {
        errors.push(`第 ${idx + 1} 个关键区域：坐标和尺寸必须在 0-1 之间`);
      }
      if (ka.x + ka.w > 1 || ka.y + ka.h > 1) {
        warnings.push(`第 ${idx + 1} 个关键区域：可能超出画面边界`);
      }
      if (ka.idealBrightness < 0 || ka.idealBrightness > 1) {
        errors.push(`第 ${idx + 1} 个关键区域：理想亮度必须在 0-1 之间`);
      }
    });
  }

  if (template.recommendedFilms.length === 0) {
    warnings.push('建议至少选择一种推荐胶片');
  }

  if (template.tags.length > 20) {
    warnings.push('标签数量过多，建议控制在 20 个以内');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

export function validateRuleSet(ruleSet: ScoreRuleSet): TemplateValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!ruleSet.name || ruleSet.name.trim().length === 0) {
    errors.push('规则集名称不能为空');
  }

  const totalWeight = ruleSet.exposureWeight + ruleSet.contrastWeight +
    ruleSet.colorWeight + ruleSet.detailWeight;
  if (Math.abs(totalWeight - 1) > 0.01) {
    errors.push(`评分权重总和为 ${totalWeight.toFixed(2)}，必须等于 1.0`);
  }

  const thresholds = ruleSet.gradeThresholds;
  if (thresholds.S <= thresholds.A || thresholds.A <= thresholds.B ||
      thresholds.B <= thresholds.C) {
    errors.push('等级阈值必须严格递减：S > A > B > C');
  }

  if (thresholds.S > 100 || thresholds.C < 0) {
    errors.push('等级阈值必须在 0-100 范围内');
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function convertTemplateToSubject(template: SceneTemplate): PhotoSubject {
  const validSceneTypes: PhotoSubject['sceneType'][] = ['portrait', 'landscape', 'street', 'still_life', 'night'];
  const sceneType = validSceneTypes.includes(template.category as PhotoSubject['sceneType'])
    ? (template.category as PhotoSubject['sceneType'])
    : 'street';
  return {
    id: template.id,
    name: template.name,
    sceneType: sceneType,
    description: template.description,
    idealExposure: template.idealExposure,
    idealContrast: template.idealContrast,
    idealSaturation: template.idealSaturation,
    baseBrightness: template.baseBrightness,
    seed: template.seed,
    tags: [...template.tags],
    difficulty: template.difficulty,
    recommendedFilms: [...template.recommendedFilms],
    targetStyle: template.targetStyle,
    scoreMultiplier: template.scoreMultiplier,
    keyAreas: template.keyAreas.map(ka => ({ ...ka }))
  };
}

export function convertDraftsToKeyAreas(drafts: KeyAreaDraft[]): KeyArea[] {
  return drafts.map(d => ({
    name: d.name,
    x: d.x,
    y: d.y,
    w: d.width,
    h: d.height,
    importance: d.importance,
    idealBrightness: d.idealBrightness
  }));
}

export function convertKeyAreasToDrafts(keyAreas: KeyArea[]): KeyAreaDraft[] {
  return keyAreas.map((ka, idx) => ({
    id: `ka_${generateId()}`,
    name: ka.name,
    x: ka.x,
    y: ka.y,
    width: ka.w,
    height: ka.h,
    importance: ka.importance,
    tolerance: 0.15,
    idealBrightness: ka.idealBrightness,
    color: KEY_AREA_COLORS[idx % KEY_AREA_COLORS.length]
  }));
}

export function createNewKeyAreaDraft(existingDrafts: KeyAreaDraft[]): KeyAreaDraft {
  const idx = existingDrafts.length;
  return {
    id: `ka_${generateId()}`,
    name: `关键区域 ${idx + 1}`,
    x: 20 + (idx % 3) * 20,
    y: 20 + Math.floor(idx / 3) * 20,
    width: 20,
    height: 20,
    importance: 0.25,
    tolerance: 0.15,
    idealBrightness: 0.5,
    color: KEY_AREA_COLORS[idx % KEY_AREA_COLORS.length]
  };
}

export function cloneTemplate(template: SceneTemplate): SceneTemplate {
  const now = Date.now();
  return {
    ...template,
    id: `template_${now}`,
    name: `${template.name} (副本)`,
    tags: [...template.tags],
    recommendedFilms: [...template.recommendedFilms],
    keyAreas: template.keyAreas.map(ka => ({ ...ka })),
    layers: template.layers.map(l => ({ ...l, config: { ...l.config } })),
    palette: {
      sky: [...template.palette.sky] as [number, number, number],
      mid: [...template.palette.mid] as [number, number, number],
      dark: [...template.palette.dark] as [number, number, number],
      accent: [...template.palette.accent] as [number, number, number],
      warm: [...template.palette.warm] as [number, number, number],
      primary: template.palette.primary,
      secondary: template.palette.secondary,
      neutral: template.palette.neutral,
      background: template.palette.background
    },
    previewParams: { ...template.previewParams },
    isBuiltin: false,
    isPublished: false,
    version: 1,
    createdAt: now,
    updatedAt: now,
    author: template.author
  };
}

export function updateTemplateField<K extends keyof SceneTemplate>(
  template: SceneTemplate,
  field: K,
  value: SceneTemplate[K]
): SceneTemplate {
  return {
    ...template,
    [field]: value,
    updatedAt: Date.now()
  };
}

export function calculatePredictedScore(
  template: SceneTemplate,
  params: DevParams,
  isColorFilm: boolean
): number {
  const exposureDiff = Math.abs(template.idealExposure - params.exposure);
  const contrastParams = params.contrast * 0.5 + params.developmentTime * 0.3 + params.temperature * 0.2;
  const contrastDiff = Math.abs(template.idealContrast - contrastParams);
  const satDiff = isColorFilm ? Math.abs(template.idealSaturation - params.saturation) : 0;

  const exposureScore = clamp(100 - exposureDiff * 150, 0, 100);
  const contrastScore = clamp(100 - contrastDiff * 120, 0, 100);
  const colorScore = isColorFilm ? clamp(100 - satDiff * 130, 0, 100) : 50;
  const detailScore = clamp(100 - Math.abs(params.dilution - 0.5) * 40 - Math.abs(params.agitation - 0.5) * 35, 0, 100);

  const ruleSet = { exposureWeight: 0.35, contrastWeight: 0.25, colorWeight: 0.2, detailWeight: 0.2 };
  const colorW = isColorFilm ? ruleSet.colorWeight : 0;
  const detailW = isColorFilm ? ruleSet.detailWeight : 0.4;

  let score = exposureScore * ruleSet.exposureWeight +
    contrastScore * ruleSet.contrastWeight +
    colorScore * colorW +
    detailScore * detailW;

  if (template.scoreMultiplier > 1.0 && score >= 60) {
    score += (score - 60) * (template.scoreMultiplier - 1.0);
  }

  return Math.round(clamp(score, 0, 100));
}

export function getGradeFromScore(
  score: number,
  thresholds: { S: number; A: number; B: number; C: number } = { S: 90, A: 80, B: 70, C: 60 }
): 'S' | 'A' | 'B' | 'C' | 'D' {
  if (score >= thresholds.S) return 'S';
  if (score >= thresholds.A) return 'A';
  if (score >= thresholds.B) return 'B';
  if (score >= thresholds.C) return 'C';
  return 'D';
}

export function calculateGrade(score: number): 'S' | 'A' | 'B' | 'C' | 'D' {
  return getGradeFromScore(score);
}

export function getAvailablePalettes(category: SceneTemplateCategory): ScenePalette[] {
  return DEFAULT_PALETTES[category] || DEFAULT_PALETTES.portrait;
}

export function getNewTemplate(category: SceneTemplateCategory = 'portrait'): SceneTemplate {
  return createBlankTemplate(category);
}

export function filterAndSortTemplates(
  templates: SceneTemplate[],
  filterCategory: SceneTemplateCategory | 'all',
  searchKeyword: string,
  sortBy: string
): SceneTemplate[] {
  let result = [...templates];

  if (filterCategory !== 'all') {
    result = result.filter(t => t.category === filterCategory);
  }

  if (searchKeyword.trim()) {
    const keyword = searchKeyword.toLowerCase();
    result = result.filter(t =>
      t.name.toLowerCase().includes(keyword) ||
      t.description.toLowerCase().includes(keyword) ||
      t.tags.some(tag => tag.toLowerCase().includes(keyword))
    );
  }

  switch (sortBy) {
    case 'name_asc':
      result.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case 'name_desc':
      result.sort((a, b) => b.name.localeCompare(a.name));
      break;
    case 'difficulty_asc':
      result.sort((a, b) => a.difficulty - b.difficulty);
      break;
    case 'difficulty_desc':
      result.sort((a, b) => b.difficulty - a.difficulty);
      break;
    case 'date_desc':
    default:
      result.sort((a, b) => b.updatedAt - a.updatedAt);
      break;
  }

  return result;
}

export function normalizeKeyAreaImportance(drafts: KeyAreaDraft[]): KeyAreaDraft[] {
  const total = drafts.reduce((sum, d) => sum + d.importance, 0);
  if (total === 0 || drafts.length === 0) return drafts;
  return drafts.map(d => ({
    ...d,
    importance: Math.round((d.importance / total) * 100) / 100
  }));
}
