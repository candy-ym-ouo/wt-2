import type { FilmStock, PhotoSubject, TutorialStep, DevParams, ParamPreset, AchievementDefinition, AchievementLine } from '../types/game';

export const FILM_STOCKS: FilmStock[] = [
  {
    id: 'hp5',
    name: '伊尔福 HP5+',
    iso: 400,
    color: 'bw',
    baseContrast: 0.65,
    baseSaturation: 0,
    grainSize: 0.5,
    description: '经典黑白胶片，颗粒细腻，层次丰富，适合各种光线条件。',
    thumbnailColor: '#4a4a4a'
  },
  {
    id: 'delta3200',
    name: '伊尔福 Delta 3200',
    iso: 3200,
    color: 'bw',
    baseContrast: 0.75,
    baseSaturation: 0,
    grainSize: 0.85,
    description: '高速黑白胶片，适合弱光环境，颗粒感强烈，富有戏剧性。',
    thumbnailColor: '#2a2a2a'
  },
  {
    id: 'portra400',
    name: '柯达 Portra 400',
    iso: 400,
    color: 'color',
    baseContrast: 0.55,
    baseSaturation: 0.6,
    grainSize: 0.35,
    description: '专业人像彩色胶片，肤色表现出色，色彩自然柔和。',
    thumbnailColor: '#c9a87c'
  },
  {
    id: 'ektar100',
    name: '柯达 Ektar 100',
    iso: 100,
    color: 'color',
    baseContrast: 0.7,
    baseSaturation: 0.85,
    grainSize: 0.2,
    description: '细颗粒彩色胶片，色彩饱和度极高，适合风光和商业摄影。',
    thumbnailColor: '#8b6914'
  },
  {
    id: 'velvia50',
    name: '富士 Velvia 50',
    iso: 50,
    color: 'color',
    baseContrast: 0.8,
    baseSaturation: 0.95,
    grainSize: 0.25,
    description: '专业反转片，色彩浓郁鲜艳，对比度高，风光摄影首选。',
    thumbnailColor: '#1e5a3a'
  },
  {
    id: 'tri-x',
    name: '柯达 Tri-X 400',
    iso: 400,
    color: 'bw',
    baseContrast: 0.7,
    baseSaturation: 0,
    grainSize: 0.6,
    description: '传奇黑白胶片，暗部层次丰富，街头摄影经典之选。',
    thumbnailColor: '#3a3a3a'
  }
];

export const DIFFICULTY_LABELS: Record<number, string> = {
  1: '入门',
  2: '简单',
  3: '中等',
  4: '困难',
  5: '大师'
};

export const TARGET_STYLE_LABELS: Record<string, string> = {
  soft: '柔和',
  vivid: '鲜艳',
  dramatic: '戏剧',
  retro: '复古',
  moody: '氛围感',
  clean: '干净',
  warm: '暖调',
  cool: '冷调'
};

export const TARGET_STYLE_ICONS: Record<string, string> = {
  soft: '🌸',
  vivid: '🎨',
  dramatic: '⚡',
  retro: '📷',
  moody: '🌙',
  clean: '✨',
  warm: '🔥',
  cool: '❄️'
};

export const PHOTO_SUBJECTS: PhotoSubject[] = [
  {
    id: 'portrait_01',
    name: '窗边的少女',
    sceneType: 'portrait',
    description: '柔和侧光下的人像，需要细腻的肤色表现与适中的对比度。',
    idealExposure: 0.55,
    idealContrast: 0.55,
    idealSaturation: 0.5,
    baseBrightness: 0.4,
    seed: 42,
    tags: ['人像', '柔和', '室内', '自然光', '女性'],
    difficulty: 2,
    recommendedFilms: ['portra400', 'hp5'],
    targetStyle: 'soft',
    scoreMultiplier: 1.0,
    keyAreas: [
      { name: '面部高光', x: 0.42, y: 0.2, w: 0.16, h: 0.25, importance: 0.3, idealBrightness: 0.72 },
      { name: '眼睛', x: 0.4, y: 0.28, w: 0.2, h: 0.08, importance: 0.25, idealBrightness: 0.45 },
      { name: '背景暗部', x: 0, y: 0, w: 0.3, h: 1, importance: 0.2, idealBrightness: 0.15 },
      { name: '衣物纹理', x: 0.3, y: 0.55, w: 0.4, h: 0.4, importance: 0.25, idealBrightness: 0.35 }
    ]
  },
  {
    id: 'landscape_01',
    name: '山间晨雾',
    sceneType: 'landscape',
    description: '高反差风光场景，需要保留暗部细节同时突出天空层次。',
    idealExposure: 0.6,
    idealContrast: 0.7,
    idealSaturation: 0.75,
    baseBrightness: 0.35,
    seed: 137,
    tags: ['风光', '自然', '山景', '晨雾', '高反差'],
    difficulty: 4,
    recommendedFilms: ['velvia50', 'ektar100', 'hp5'],
    targetStyle: 'vivid',
    scoreMultiplier: 1.15,
    keyAreas: [
      { name: '天空云层', x: 0, y: 0, w: 1, h: 0.4, importance: 0.3, idealBrightness: 0.7 },
      { name: '远山轮廓', x: 0, y: 0.35, w: 1, h: 0.25, importance: 0.25, idealBrightness: 0.35 },
      { name: '近景森林', x: 0, y: 0.6, w: 1, h: 0.4, importance: 0.25, idealBrightness: 0.18 },
      { name: '雾气过渡', x: 0.2, y: 0.4, w: 0.6, h: 0.3, importance: 0.2, idealBrightness: 0.5 }
    ]
  },
  {
    id: 'street_01',
    name: '雨中街角',
    sceneType: 'street',
    description: '城市街头纪实，利用地面反光营造氛围感，中等反差最佳。',
    idealExposure: 0.5,
    idealContrast: 0.65,
    idealSaturation: 0.45,
    baseBrightness: 0.3,
    seed: 89,
    tags: ['街头', '城市', '雨天', '纪实', '霓虹灯'],
    difficulty: 3,
    recommendedFilms: ['tri-x', 'hp5', 'portra400'],
    targetStyle: 'moody',
    scoreMultiplier: 1.1,
    keyAreas: [
      { name: '行人剪影', x: 0.35, y: 0.4, w: 0.12, h: 0.45, importance: 0.3, idealBrightness: 0.12 },
      { name: '霓虹招牌', x: 0.6, y: 0.1, w: 0.25, h: 0.2, importance: 0.25, idealBrightness: 0.85 },
      { name: '地面反光', x: 0, y: 0.75, w: 1, h: 0.25, importance: 0.25, idealBrightness: 0.28 },
      { name: '建筑细节', x: 0, y: 0, w: 0.35, h: 0.7, importance: 0.2, idealBrightness: 0.22 }
    ]
  },
  {
    id: 'still_life_01',
    name: '茶与旧书',
    sceneType: 'still_life',
    description: '暖调静物摄影，重点表现材质纹理与柔和的色彩过渡。',
    idealExposure: 0.58,
    idealContrast: 0.5,
    idealSaturation: 0.6,
    baseBrightness: 0.38,
    seed: 204,
    tags: ['静物', '复古', '暖调', '质感', '文艺'],
    difficulty: 2,
    recommendedFilms: ['portra400', 'ektar100', 'hp5'],
    targetStyle: 'warm',
    scoreMultiplier: 1.0,
    keyAreas: [
      { name: '茶杯高光', x: 0.3, y: 0.4, w: 0.18, h: 0.25, importance: 0.3, idealBrightness: 0.78 },
      { name: '书页纹理', x: 0.48, y: 0.3, w: 0.4, h: 0.5, importance: 0.25, idealBrightness: 0.55 },
      { name: '木质桌面', x: 0, y: 0.7, w: 1, h: 0.3, importance: 0.2, idealBrightness: 0.25 },
      { name: '阴影区域', x: 0, y: 0, w: 0.25, h: 0.7, importance: 0.25, idealBrightness: 0.12 }
    ]
  },
  {
    id: 'night_01',
    name: '都市夜景',
    sceneType: 'night',
    description: '高反差夜景，需要严格控制曝光，保留灯光细节同时避免暗部死黑。',
    idealExposure: 0.42,
    idealContrast: 0.8,
    idealSaturation: 0.7,
    baseBrightness: 0.15,
    seed: 311,
    tags: ['夜景', '城市', '灯光', '高反差', '建筑'],
    difficulty: 5,
    recommendedFilms: ['delta3200', 'tri-x', 'portra400'],
    targetStyle: 'dramatic',
    scoreMultiplier: 1.25,
    keyAreas: [
      { name: '建筑灯光', x: 0.2, y: 0.1, w: 0.6, h: 0.6, importance: 0.3, idealBrightness: 0.65 },
      { name: '天空区域', x: 0, y: 0, w: 1, h: 0.25, importance: 0.2, idealBrightness: 0.08 },
      { name: '街道车灯', x: 0, y: 0.7, w: 1, h: 0.3, importance: 0.25, idealBrightness: 0.5 },
      { name: '剪影建筑', x: 0, y: 0.25, w: 0.2, h: 0.5, importance: 0.25, idealBrightness: 0.06 }
    ]
  },
  {
    id: 'portrait_02',
    name: '逆光剪影',
    sceneType: 'portrait',
    description: '日落逆光人像，重点表现轮廓光与背景的温暖色调。',
    idealExposure: 0.5,
    idealContrast: 0.75,
    idealSaturation: 0.8,
    baseBrightness: 0.32,
    seed: 178,
    tags: ['人像', '逆光', '日落', '剪影', '暖调', '户外'],
    difficulty: 4,
    recommendedFilms: ['velvia50', 'portra400', 'ektar100'],
    targetStyle: 'warm',
    scoreMultiplier: 1.15,
    keyAreas: [
      { name: '人物轮廓', x: 0.3, y: 0.2, w: 0.4, h: 0.7, importance: 0.35, idealBrightness: 0.15 },
      { name: '背景天空', x: 0, y: 0, w: 1, h: 0.6, importance: 0.3, idealBrightness: 0.75 },
      { name: '发丝光', x: 0.38, y: 0.18, w: 0.24, h: 0.12, importance: 0.2, idealBrightness: 0.9 },
      { name: '地面草地', x: 0, y: 0.6, w: 1, h: 0.4, importance: 0.15, idealBrightness: 0.2 }
    ]
  }
];

export const SCENE_TYPE_LABELS: Record<string, string> = {
  portrait: '人像',
  landscape: '风光',
  street: '街头',
  still_life: '静物',
  night: '夜景'
};

export const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: 'date_desc', label: '最新优先' },
  { value: 'date_asc', label: '最早优先' },
  { value: 'score_desc', label: '高分优先' },
  { value: 'score_asc', label: '低分优先' },
  { value: 'grade_desc', label: '等级优先' }
];

export const ALL_TAGS = [
  '人像', '风光', '街头', '静物', '夜景',
  '柔和', '室内', '自然光', '女性', '自然',
  '山景', '晨雾', '高反差', '城市', '雨天',
  '纪实', '霓虹灯', '复古', '暖调', '质感',
  '文艺', '灯光', '建筑', '逆光', '日落',
  '剪影', '户外'
];

export const DEFAULT_PARAMS: DevParams = {
  exposure: 0.5,
  developmentTime: 0.5,
  temperature: 0.5,
  agitation: 0.5,
  contrast: 0.5,
  saturation: 0.5,
  dilution: 0.5
};

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 0,
    phase: 'intro',
    title: '欢迎来到暗房',
    content: '这是一个胶片暗房模拟器。你将扮演一名暗房技师，亲手将底片冲洗成精美的照片。准备好了吗？让我们开始这段奇妙的旅程！',
    highlightArea: 'none',
    unlockCondition: { type: 'auto' },
    completionCondition: { type: 'auto' },
    requiresCompletion: false,
    allowSkip: true
  },
  {
    id: 1,
    phase: 'selection',
    title: '阶段一：选择拍摄题材',
    content: '首先，从左侧选择一个你想要冲洗的场景。不同的场景对曝光和显影有不同的理想参数。仔细阅读每个场景的描述，选择一个你感兴趣的题材！',
    highlightArea: 'subject-list',
    actionHint: '点击左侧任意题材卡片完成本步骤',
    unlockCondition: { type: 'auto' },
    completionCondition: { type: 'subject_selected' },
    requiresCompletion: true,
    allowSkip: false
  },
  {
    id: 2,
    phase: 'selection',
    title: '阶段一：选择胶片类型',
    content: '每种胶片都有独特的性格：黑白或彩色，低感或高感，细腻颗粒或粗粝质感。根据题材选择合适的胶片，这是好作品的第一步。',
    highlightArea: 'film-list',
    actionHint: '点击一个胶片卡片完成本步骤',
    unlockCondition: { type: 'step_completed', stepId: 1 },
    completionCondition: { type: 'film_selected' },
    requiresCompletion: true,
    allowSkip: false
  },
  {
    id: 3,
    phase: 'adjustment',
    title: '阶段二：调整曝光参数',
    content: '曝光是暗房工作的核心。曝光不足会导致画面昏暗，曝光过度则会丢失高光细节。仔细观察预览窗中的变化，找到最佳曝光点。',
    highlightArea: 'param-panel',
    actionHint: '拖动曝光滑块调整参数',
    unlockCondition: { type: 'step_completed', stepId: 2 },
    completionCondition: { type: 'param_adjusted', param: 'exposure' },
    requiresCompletion: true,
    allowSkip: false
  },
  {
    id: 4,
    phase: 'adjustment',
    title: '阶段二：控制显影过程',
    content: '显影时间、温度和搅动方式都会影响最终效果。时间越长对比度越高，温度越高化学反应越剧烈，搅动则影响画面均匀度。试着调整这些参数，观察预览效果的变化！',
    highlightArea: 'develop-panel',
    actionHint: '尝试调整至少一个显影参数（显影时间、温度、搅动、对比度、饱和度或稀释度）',
    unlockCondition: { type: 'step_completed', stepId: 3 },
    completionCondition: { type: 'other_param_adjusted', excludeParam: 'exposure' },
    requiresCompletion: true,
    allowSkip: false
  },
  {
    id: 5,
    phase: 'development',
    title: '阶段三：开始冲洗',
    content: '一切准备就绪后，点击"开始显影"按钮。你将看到底片在药液中慢慢显现的神奇过程。完成后，系统会为你的作品评分！',
    highlightArea: 'develop-button',
    actionHint: '点击开始显影按钮，完成教程',
    unlockCondition: { type: 'step_completed', stepId: 4 },
    completionCondition: { type: 'develop_started' },
    requiresCompletion: true,
    allowSkip: false
  },
  {
    id: 6,
    phase: 'final',
    title: '恭喜完成教程！',
    content: '你已经掌握了暗房的基本操作流程。现在可以自由探索，尝试不同的题材和胶片组合，创造出属于你的精彩作品！记住，暗房艺术在于平衡与耐心，细微的参数差异会带来截然不同的效果。',
    highlightArea: 'none',
    unlockCondition: { type: 'step_completed', stepId: 5 },
    completionCondition: { type: 'auto' },
    requiresCompletion: false,
    allowSkip: true
  }
];

export const GRADE_COLORS: Record<string, string> = {
  S: '#ffd700',
  A: '#c0c0c0',
  B: '#cd7f32',
  C: '#808080',
  D: '#4a4a4a'
};

export const GRADE_NAMES: Record<string, string> = {
  S: '大师级',
  A: '优秀',
  B: '良好',
  C: '及格',
  D: '需要练习'
};

export const DEFAULT_PRESETS: ParamPreset[] = [
  {
    id: 'preset_portrait_soft',
    name: '柔和人像',
    description: '适用于人像摄影，低对比度，适中饱和度，展现细腻肤色',
    params: {
      exposure: 0.55,
      developmentTime: 0.4,
      temperature: 0.45,
      agitation: 0.3,
      contrast: 0.4,
      saturation: 0.5,
      dilution: 0.6
    },
    subjectId: 'portrait_01',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    version: 1,
    isDefault: true
  },
  {
    id: 'preset_landscape_vivid',
    name: '浓郁风光',
    description: '高对比度高饱和度，突出风光摄影的色彩层次',
    params: {
      exposure: 0.5,
      developmentTime: 0.65,
      temperature: 0.55,
      agitation: 0.6,
      contrast: 0.75,
      saturation: 0.8,
      dilution: 0.4
    },
    subjectId: 'landscape_01',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    version: 1,
    isDefault: true
  },
  {
    id: 'preset_street_documentary',
    name: '街头纪实',
    description: '中等反差，自然色调，适合城市街头记录',
    params: {
      exposure: 0.48,
      developmentTime: 0.55,
      temperature: 0.5,
      agitation: 0.5,
      contrast: 0.6,
      saturation: 0.45,
      dilution: 0.5
    },
    subjectId: 'street_01',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    version: 1,
    isDefault: true
  },
  {
    id: 'preset_still_life_warm',
    name: '暖调静物',
    description: '柔和暖调，低反差，突出静物的质感与细节',
    params: {
      exposure: 0.58,
      developmentTime: 0.45,
      temperature: 0.5,
      agitation: 0.35,
      contrast: 0.45,
      saturation: 0.6,
      dilution: 0.55
    },
    subjectId: 'still_life_01',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    version: 1,
    isDefault: true
  },
  {
    id: 'preset_night_dramatic',
    name: '夜景戏剧',
    description: '高反差，精确控制曝光，保留灯光细节',
    params: {
      exposure: 0.42,
      developmentTime: 0.7,
      temperature: 0.55,
      agitation: 0.65,
      contrast: 0.8,
      saturation: 0.7,
      dilution: 0.35
    },
    subjectId: 'night_01',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    version: 1,
    isDefault: true
  },
  {
    id: 'preset_bw_classic',
    name: '经典黑白',
    description: '适用于黑白胶片，中等反差，层次丰富',
    params: {
      exposure: 0.52,
      developmentTime: 0.6,
      temperature: 0.5,
      agitation: 0.55,
      contrast: 0.65,
      saturation: 0,
      dilution: 0.5
    },
    filmId: 'hp5',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    version: 1,
    isDefault: true
  }
];

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  {
    id: 'hs_1',
    line: 'high_score',
    tier: 1,
    name: '初露锋芒',
    description: '首次获得A级作品',
    icon: '🌟',
    reward: { badge: '🌟', title: '暗房新星' },
    condition: { type: 'any_grade', minGrade: 'A' }
  },
  {
    id: 'hs_2',
    line: 'high_score',
    tier: 2,
    name: '题材达人',
    description: '在3个不同题材获得A级作品',
    icon: '🎯',
    reward: { badge: '🎯', title: '题材猎手' },
    condition: { type: 'grade_on_subjects', minGrade: 'A', subjectCount: 3 }
  },
  {
    id: 'hs_3',
    line: 'high_score',
    tier: 3,
    name: '场景全覆盖',
    description: '在全部5种场景类型获得A级作品',
    icon: '👑',
    reward: { badge: '👑', title: '全能摄影师' },
    condition: { type: 'grade_on_scene_types', minGrade: 'A', sceneTypeCount: 5 }
  },
  {
    id: 'hs_4',
    line: 'high_score',
    tier: 4,
    name: '追求完美',
    description: '获得S级大师作品',
    icon: '💎',
    reward: { badge: '💎', title: '完美主义者' },
    condition: { type: 'any_grade', minGrade: 'S' }
  },
  {
    id: 'hs_5',
    line: 'high_score',
    tier: 5,
    name: '全题材制霸',
    description: '在全部6个题材获得A级作品',
    icon: '🏆',
    reward: { badge: '🏆', title: '暗房大师' },
    condition: { type: 'grade_on_subjects', minGrade: 'A', subjectCount: 6 }
  },

  {
    id: 'fm_1',
    line: 'film_mastery',
    tier: 1,
    name: '胶片新手',
    description: '使用3种不同胶片完成冲洗',
    icon: '🎞',
    reward: { badge: '🎞', title: '胶片学徒' },
    condition: { type: 'film_variety', filmCount: 3 }
  },
  {
    id: 'fm_2',
    line: 'film_mastery',
    tier: 2,
    name: '胶片玩家',
    description: '使用全部6种胶片各至少1次',
    icon: '📸',
    reward: { badge: '📸', title: '胶片玩家' },
    condition: { type: 'film_min_usage', minUsage: 1 }
  },
  {
    id: 'fm_3',
    line: 'film_mastery',
    tier: 3,
    name: '胶片专家',
    description: '用同一胶片获得5次A级作品',
    icon: '🔬',
    reward: { badge: '🔬', title: '胶片专家' },
    condition: { type: 'film_grade_count', minGrade: 'A', count: 5 }
  },
  {
    id: 'fm_4',
    line: 'film_mastery',
    tier: 4,
    name: '全胶片精通',
    description: '使用全部6种胶片各至少3次',
    icon: '🎨',
    reward: { badge: '🎨', title: '胶片大师' },
    condition: { type: 'film_min_usage', minUsage: 3 }
  },
  {
    id: 'fm_5',
    line: 'film_mastery',
    tier: 5,
    name: '胶片传奇',
    description: '每种胶片都获得过A级作品',
    icon: '🏅',
    reward: { badge: '🏅', title: '胶片传奇' },
    condition: { type: 'film_all_grade', minGrade: 'A' }
  },

  {
    id: 'st_1',
    line: 'streak',
    tier: 1,
    name: '初心不忘',
    description: '连续练习3天',
    icon: '📅',
    reward: { badge: '📅', title: '坚持者' },
    condition: { type: 'streak_days', days: 3 }
  },
  {
    id: 'st_2',
    line: 'streak',
    tier: 2,
    name: '坚持不懈',
    description: '连续练习7天',
    icon: '📆',
    reward: { badge: '📆', title: '执着匠人' },
    condition: { type: 'streak_days', days: 7 }
  },
  {
    id: 'st_3',
    line: 'streak',
    tier: 3,
    name: '稳扎稳打',
    description: '连续练习14天',
    icon: '📊',
    reward: { badge: '📊', title: '暗房常客' },
    condition: { type: 'streak_days', days: 14 }
  },
  {
    id: 'st_4',
    line: 'streak',
    tier: 4,
    name: '铁杵磨针',
    description: '连续练习30天',
    icon: '🏅',
    reward: { badge: '🏅', title: '暗房铁人' },
    condition: { type: 'streak_days', days: 30 }
  }
];

export const ACHIEVEMENT_LINE_META: Record<AchievementLine, { label: string; icon: string; color: string }> = {
  high_score: { label: '高分题材', icon: '🏆', color: '#ffd700' },
  film_mastery: { label: '胶片熟练度', icon: '🎞', color: '#c9a87c' },
  streak: { label: '连续练习', icon: '📅', color: '#7ec8a0' }
};

import type { Chemical, ChemicalSolution, DeveloperRecipe, SolutionType, ChemicalType, FilmProcessType } from '../types/game';

export const CHEMICAL_TYPE_LABELS: Record<ChemicalType, string> = {
  developer: '显影剂',
  accelerator: '促进剂',
  preservative: '保护剂',
  restrainer: '抑制剂',
  fixer: '定影剂',
  hardener: '坚膜剂',
  wetting_agent: '润湿剂',
  other: '其他'
};

export const SOLUTION_TYPE_LABELS: Record<SolutionType, string> = {
  developer: '显影液',
  stop_bath: '停显液',
  fixer: '定影液',
  washing_aid: '助洗液',
  wetting_agent: '润湿液'
};

export const PROCESS_TYPE_LABELS: Record<FilmProcessType, string> = {
  bw: '黑白',
  c41: 'C-41彩色',
  e6: 'E-6反转',
  custom: '自定义'
};

export const DEFAULT_CHEMICALS: Chemical[] = [
  { id: 'metol', name: '米吐尔 (Metol)', type: 'developer', formula: 'C7H10NO2', description: '常用的显影主剂，反差柔和，细节丰富' },
  { id: 'hydroquinone', name: '对苯二酚 (HQ)', type: 'developer', formula: 'C6H6O2', description: '高反差显影剂，配合米吐尔使用效果更佳' },
  { id: 'phenidone', name: '菲尼酮 (Phenidone)', type: 'developer', formula: 'C9H10N2O', description: '现代显影剂，与HQ组合形成PQ显影液' },
  { id: 'sodium_carbonate', name: '碳酸钠', type: 'accelerator', formula: 'Na2CO3', description: '碱类促进剂，加速显影反应' },
  { id: 'sodium_sulfite', name: '亚硫酸钠', type: 'preservative', formula: 'Na2SO3', description: '防止显影剂氧化，延长药液寿命' },
  { id: 'potassium_bromide', name: '溴化钾', type: 'restrainer', formula: 'KBr', description: '抑制灰雾产生，调节显影速度' },
  { id: 'sodium_thiosulfate', name: '硫代硫酸钠 (海波)', type: 'fixer', formula: 'Na2S2O3', description: '经典定影剂，溶解未曝光的卤化银' },
  { id: 'ammonium_thiosulfate', name: '硫代硫酸铵', type: 'fixer', formula: '(NH4)2S2O3', description: '快速定影剂，定影速度比海波快' },
  { id: 'potassium_alum', name: '钾矾', type: 'hardener', formula: 'KAl(SO4)2', description: '坚膜剂，防止乳剂层膨胀脱落' },
  { id: 'kodak_photo_flo', name: 'Kodak Photo-Flo', type: 'wetting_agent', description: '润湿剂，防止水渍产生' },
  { id: 'acetic_acid', name: '醋酸', type: 'other', formula: 'CH3COOH', description: '用于配制停显液，中和显影液碱性' },
  { id: 'boric_acid', name: '硼酸', type: 'other', formula: 'H3BO3', description: '缓冲剂，稳定药液pH值' }
];

export const DEFAULT_SOLUTIONS: ChemicalSolution[] = [
  {
    id: 'sol_d76',
    name: 'D-76 显影液',
    type: 'developer',
    components: [
      { chemicalId: 'metol', chemicalName: '米吐尔 (Metol)', amount: 2, unit: 'g' },
      { chemicalId: 'sodium_sulfite', chemicalName: '亚硫酸钠', amount: 100, unit: 'g' },
      { chemicalId: 'hydroquinone', chemicalName: '对苯二酚 (HQ)', amount: 5, unit: 'g' },
      { chemicalId: 'sodium_carbonate', chemicalName: '碳酸钠', amount: 0, unit: 'g' },
      { chemicalId: 'boric_acid', chemicalName: '硼酸', amount: 2, unit: 'g' },
      { chemicalId: 'potassium_bromide', chemicalName: '溴化钾', amount: 1, unit: 'g' }
    ],
    totalVolume: 1000,
    volumeUnit: 'ml',
    ph: 8.5,
    notes: '柯达经典黑白显影液，颗粒细腻，层次丰富。建议1:1稀释使用',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    version: 1,
    isDefault: true
  },
  {
    id: 'sol_id11',
    name: 'ID-11 显影液',
    type: 'developer',
    components: [
      { chemicalId: 'metol', chemicalName: '米吐尔 (Metol)', amount: 2, unit: 'g' },
      { chemicalId: 'sodium_sulfite', chemicalName: '亚硫酸钠', amount: 100, unit: 'g' },
      { chemicalId: 'hydroquinone', chemicalName: '对苯二酚 (HQ)', amount: 5, unit: 'g' },
      { chemicalId: 'sodium_carbonate', chemicalName: '碳酸钠', amount: 0, unit: 'g' },
      { chemicalId: 'boric_acid', chemicalName: '硼酸', amount: 2, unit: 'g' },
      { chemicalId: 'potassium_bromide', chemicalName: '溴化钾', amount: 1, unit: 'g' }
    ],
    totalVolume: 1000,
    volumeUnit: 'ml',
    ph: 8.4,
    notes: '伊尔福版本的D-76，性能接近，适合伊尔福胶片',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    version: 1,
    isDefault: true
  },
  {
    id: 'sol_xtol',
    name: 'Xtol 显影液',
    type: 'developer',
    components: [
      { chemicalId: 'phenidone', chemicalName: '菲尼酮 (Phenidone)', amount: 0.5, unit: 'g' },
      { chemicalId: 'sodium_sulfite', chemicalName: '亚硫酸钠', amount: 80, unit: 'g' },
      { chemicalId: 'hydroquinone', chemicalName: '对苯二酚 (HQ)', amount: 0, unit: 'g' },
      { chemicalId: 'sodium_carbonate', chemicalName: '碳酸钠', amount: 22, unit: 'g' },
      { chemicalId: 'potassium_bromide', chemicalName: '溴化钾', amount: 1, unit: 'g' }
    ],
    totalVolume: 1000,
    volumeUnit: 'ml',
    ph: 8.8,
    notes: '柯达现代环保显影液，颗粒极细，锐度高',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    version: 1,
    isDefault: true
  },
  {
    id: 'sol_stop',
    name: '醋酸停显液',
    type: 'stop_bath',
    components: [
      { chemicalId: 'acetic_acid', chemicalName: '醋酸', amount: 28, unit: 'ml' }
    ],
    totalVolume: 1000,
    volumeUnit: 'ml',
    ph: 4.5,
    notes: '28%冰醋酸稀释液，快速终止显影反应',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    version: 1,
    isDefault: true
  },
  {
    id: 'sol_fixer',
    name: '酸性坚膜定影液 (F-5)',
    type: 'fixer',
    components: [
      { chemicalId: 'sodium_thiosulfate', chemicalName: '硫代硫酸钠 (海波)', amount: 240, unit: 'g' },
      { chemicalId: 'sodium_sulfite', chemicalName: '亚硫酸钠', amount: 15, unit: 'g' },
      { chemicalId: 'acetic_acid', chemicalName: '醋酸', amount: 45, unit: 'ml' },
      { chemicalId: 'boric_acid', chemicalName: '硼酸', amount: 7.5, unit: 'g' },
      { chemicalId: 'potassium_alum', chemicalName: '钾矾', amount: 15, unit: 'g' }
    ],
    totalVolume: 1000,
    volumeUnit: 'ml',
    ph: 4.3,
    notes: '柯达F-5经典定影液，含坚膜剂，延长胶片寿命',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    version: 1,
    isDefault: true
  },
  {
    id: 'sol_fixer_rapid',
    name: '快速定影液',
    type: 'fixer',
    components: [
      { chemicalId: 'ammonium_thiosulfate', chemicalName: '硫代硫酸铵', amount: 180, unit: 'g' },
      { chemicalId: 'sodium_sulfite', chemicalName: '亚硫酸钠', amount: 10, unit: 'g' },
      { chemicalId: 'acetic_acid', chemicalName: '醋酸', amount: 20, unit: 'ml' },
      { chemicalId: 'potassium_alum', chemicalName: '钾矾', amount: 12, unit: 'g' }
    ],
    totalVolume: 1000,
    volumeUnit: 'ml',
    ph: 4.5,
    notes: '硫代硫酸铵配方，定影速度是普通定影液的2倍',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    version: 1,
    isDefault: true
  },
  {
    id: 'sol_photoflo',
    name: 'Photo-Flo 润湿液',
    type: 'wetting_agent',
    components: [
      { chemicalId: 'kodak_photo_flo', chemicalName: 'Kodak Photo-Flo', amount: 1, unit: 'ml' }
    ],
    totalVolume: 500,
    volumeUnit: 'ml',
    notes: '防止水渍，使胶片干燥更均匀。建议1:200稀释',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    version: 1,
    isDefault: true
  }
];

export const DEFAULT_RECIPES: DeveloperRecipe[] = [
  {
    id: 'recipe_d76_standard',
    name: 'D-76 标准显影配方',
    processType: 'bw',
    description: '柯达经典黑白显影液标准配方，颗粒细腻，层次丰富，适合大多数黑白胶片',
    developerId: 'sol_d76',
    stopBathId: 'sol_stop',
    fixerId: 'sol_fixer',
    washingAidId: undefined,
    wettingAgentId: 'sol_photoflo',
    developmentParams: {
      temperature: 0.5,
      timeMultiplier: 1.0,
      agitation: 0.4,
      dilution: 0.5
    },
    suitableFilmIds: ['hp5', 'delta3200', 'tri-x'],
    suitableSceneTypes: ['portrait', 'landscape', 'street', 'still_life', 'night'],
    tags: ['经典', '通用', '颗粒细腻', '层次丰富'],
    versionHistory: [
      {
        version: 1,
        timestamp: Date.now(),
        name: 'D-76 标准显影配方',
        developerId: 'sol_d76',
        stopBathId: 'sol_stop',
        fixerId: 'sol_fixer',
        wettingAgentId: 'sol_photoflo',
        developmentParams: {
          temperature: 0.5,
          timeMultiplier: 1.0,
          agitation: 0.4,
          dilution: 0.5
        },
        changeNote: '初始版本'
      }
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    version: 1,
    isDefault: true
  },
  {
    id: 'recipe_d76_contrast',
    name: 'D-76 高反差显影配方',
    processType: 'bw',
    description: '基于D-76的高反差变体，提高显影时间和温度，适合需要强烈对比的场景',
    developerId: 'sol_d76',
    stopBathId: 'sol_stop',
    fixerId: 'sol_fixer',
    washingAidId: undefined,
    wettingAgentId: 'sol_photoflo',
    developmentParams: {
      temperature: 0.65,
      timeMultiplier: 1.4,
      agitation: 0.7,
      dilution: 0.3
    },
    suitableFilmIds: ['hp5', 'tri-x'],
    suitableSceneTypes: ['street', 'night', 'landscape'],
    tags: ['高反差', '街头', '夜景', '戏剧感'],
    versionHistory: [
      {
        version: 1,
        timestamp: Date.now(),
        name: 'D-76 高反差显影配方',
        developerId: 'sol_d76',
        stopBathId: 'sol_stop',
        fixerId: 'sol_fixer',
        wettingAgentId: 'sol_photoflo',
        developmentParams: {
          temperature: 0.65,
          timeMultiplier: 1.4,
          agitation: 0.7,
          dilution: 0.3
        },
        changeNote: '初始版本，高反差设置'
      }
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    version: 1,
    isDefault: true
  },
  {
    id: 'recipe_id11_finegrain',
    name: 'ID-11 细颗粒配方',
    processType: 'bw',
    description: '伊尔福ID-11细颗粒显影，低稀释度，适合伊尔福HP5和Delta系列胶片',
    developerId: 'sol_id11',
    stopBathId: 'sol_stop',
    fixerId: 'sol_fixer',
    washingAidId: undefined,
    wettingAgentId: 'sol_photoflo',
    developmentParams: {
      temperature: 0.45,
      timeMultiplier: 0.9,
      agitation: 0.3,
      dilution: 0.6
    },
    suitableFilmIds: ['hp5', 'delta3200'],
    suitableSceneTypes: ['portrait', 'still_life'],
    tags: ['细颗粒', '人像', '静物', '伊尔福'],
    versionHistory: [
      {
        version: 1,
        timestamp: Date.now(),
        name: 'ID-11 细颗粒配方',
        developerId: 'sol_id11',
        stopBathId: 'sol_stop',
        fixerId: 'sol_fixer',
        wettingAgentId: 'sol_photoflo',
        developmentParams: {
          temperature: 0.45,
          timeMultiplier: 0.9,
          agitation: 0.3,
          dilution: 0.6
        },
        changeNote: '初始版本'
      }
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    version: 1,
    isDefault: true
  },
  {
    id: 'recipe_xtol_sharp',
    name: 'Xtol 高锐度配方',
    processType: 'bw',
    description: '柯达Xtol现代显影液，颗粒极细锐度极高，适合追求细节的风光和商业摄影',
    developerId: 'sol_xtol',
    stopBathId: 'sol_stop',
    fixerId: 'sol_fixer_rapid',
    washingAidId: undefined,
    wettingAgentId: 'sol_photoflo',
    developmentParams: {
      temperature: 0.55,
      timeMultiplier: 1.0,
      agitation: 0.5,
      dilution: 0.4
    },
    suitableFilmIds: ['hp5', 'delta3200', 'tri-x'],
    suitableSceneTypes: ['landscape', 'still_life', 'portrait'],
    tags: ['高锐度', '细颗粒', '现代', '环保'],
    versionHistory: [
      {
        version: 1,
        timestamp: Date.now(),
        name: 'Xtol 高锐度配方',
        developerId: 'sol_xtol',
        stopBathId: 'sol_stop',
        fixerId: 'sol_fixer_rapid',
        wettingAgentId: 'sol_photoflo',
        developmentParams: {
          temperature: 0.55,
          timeMultiplier: 1.0,
          agitation: 0.5,
          dilution: 0.4
        },
        changeNote: '初始版本'
      }
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    version: 1,
    isDefault: true
  },
  {
    id: 'recipe_c41_color',
    name: 'C-41 彩色负片标准配方',
    processType: 'c41',
    description: '标准C-41彩色负片冲洗工艺，适合柯达Portra、Ektar等彩色胶片',
    developerId: undefined,
    stopBathId: undefined,
    fixerId: 'sol_fixer',
    washingAidId: undefined,
    wettingAgentId: 'sol_photoflo',
    developmentParams: {
      temperature: 0.6,
      timeMultiplier: 1.0,
      agitation: 0.5,
      dilution: 0.5
    },
    suitableFilmIds: ['portra400', 'ektar100'],
    suitableSceneTypes: ['portrait', 'landscape', 'still_life'],
    tags: ['彩色', 'C-41', '标准工艺'],
    versionHistory: [
      {
        version: 1,
        timestamp: Date.now(),
        name: 'C-41 彩色负片标准配方',
        fixerId: 'sol_fixer',
        wettingAgentId: 'sol_photoflo',
        developmentParams: {
          temperature: 0.6,
          timeMultiplier: 1.0,
          agitation: 0.5,
          dilution: 0.5
        },
        changeNote: '初始版本'
      }
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    version: 1,
    isDefault: true
  },
  {
    id: 'recipe_e6_reversal',
    name: 'E-6 反转片标准配方',
    processType: 'e6',
    description: '标准E-6彩色反转片冲洗工艺，适合富士Velvia等专业反转片',
    developerId: undefined,
    stopBathId: undefined,
    fixerId: 'sol_fixer',
    washingAidId: undefined,
    wettingAgentId: 'sol_photoflo',
    developmentParams: {
      temperature: 0.65,
      timeMultiplier: 1.0,
      agitation: 0.6,
      dilution: 0.5
    },
    suitableFilmIds: ['velvia50'],
    suitableSceneTypes: ['landscape', 'still_life'],
    tags: ['反转片', 'E-6', '专业', '高饱和'],
    versionHistory: [
      {
        version: 1,
        timestamp: Date.now(),
        name: 'E-6 反转片标准配方',
        fixerId: 'sol_fixer',
        wettingAgentId: 'sol_photoflo',
        developmentParams: {
          temperature: 0.65,
          timeMultiplier: 1.0,
          agitation: 0.6,
          dilution: 0.5
        },
        changeNote: '初始版本'
      }
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    version: 1,
    isDefault: true
  }
];

import type { StageDefinition, QuestDefinition } from '../types/game';

export const STAGE_DEFINITIONS: StageDefinition[] = [
  {
    id: 'stage_01',
    order: 1,
    title: '入门之章',
    subtitle: '暗房学徒',
    description: '欢迎来到暗房的世界！在这里，你将学习基础的胶片冲洗技术，从最简单的人像和静物开始，逐步掌握曝光、显影的基本要领。',
    icon: '🌱',
    color: '#7ec8a0',
    backgroundGradient: 'linear-gradient(135deg, #a8e6cf 0%, #7ec8a0 100%)',
    questIds: ['quest_01_01', 'quest_01_02', 'quest_01_03'],
    prerequisites: [],
    bonus: {
      type: 'all_quests_grade',
      value: 'B',
      label: '全部任务B级以上通关',
      rewards: [
        { type: 'badge', value: '🌿', label: '新手入门徽章' }
      ]
    }
  },
  {
    id: 'stage_02',
    order: 2,
    title: '进阶之路',
    subtitle: '街头行者',
    description: '你已经掌握了基础技巧。现在让我们走出影棚，迎接街头纪实摄影的挑战。复杂的光线条件、多变的场景，将考验你对参数的直觉判断。',
    icon: '🚶',
    color: '#6b8ec7',
    backgroundGradient: 'linear-gradient(135deg, #89b3e0 0%, #6b8ec7 100%)',
    questIds: ['quest_02_01', 'quest_02_02', 'quest_02_03'],
    prerequisites: ['stage_01'],
    bonus: {
      type: 'all_quests_grade',
      value: 'A',
      label: '全部任务A级以上通关',
      rewards: [
        { type: 'badge', value: '🏅', label: '街头猎手徽章' }
      ]
    }
  },
  {
    id: 'stage_03',
    order: 3,
    title: '风光无限',
    subtitle: '自然捕手',
    description: '大自然是最变幻莫测的暗房导师。从晨雾中的山峦到逆光下的剪影，你需要驾驭极端的反差，用色彩和层次书写壮丽的诗篇。',
    icon: '🏔️',
    color: '#c9a87c',
    backgroundGradient: 'linear-gradient(135deg, #e0c9a8 0%, #c9a87c 100%)',
    questIds: ['quest_03_01', 'quest_03_02', 'quest_03_03'],
    prerequisites: ['stage_02'],
    bonus: {
      type: 'all_quests_grade',
      value: 'A',
      label: '全部任务A级以上通关',
      rewards: [
        { type: 'badge', value: '🎨', label: '风光大师徽章' }
      ]
    }
  },
  {
    id: 'stage_04',
    order: 4,
    title: '暗夜挑战',
    subtitle: '追光者',
    description: '夜幕降临，真正的考验才刚刚开始。微弱的光线、极端的反差、神秘的氛围——只有最优秀的暗房技师才能在黑暗中创造奇迹。',
    icon: '🌙',
    color: '#7a6db4',
    backgroundGradient: 'linear-gradient(135deg, #a79ed8 0%, #7a6db4 100%)',
    questIds: ['quest_04_01', 'quest_04_02', 'quest_04_03'],
    prerequisites: ['stage_03'],
    bonus: {
      type: 'all_quests_grade',
      value: 'S',
      label: '全部任务S级完美通关',
      rewards: [
        { type: 'badge', value: '💎', label: '暗夜之王徽章' },
        { type: 'title', value: '暗房大师', label: '获得称号：暗房大师' }
      ]
    }
  }
];

export const QUEST_DEFINITIONS: QuestDefinition[] = [
  {
    id: 'quest_01_01',
    stageId: 'stage_01',
    order: 1,
    title: '温柔的窗光',
    description: '使用黑白胶片，为窗边的少女拍摄一张柔和的人像。重点是细腻的肤色表现和自然的光影过渡。',
    storyText: '"摄影是光的画笔。" —— 这是你在暗房学到的第一课。今天的任务很简单：用经典的黑白胶片，记录下窗光中少女的轮廓。记住，柔和不是平淡，而是藏在暗处的细节。',
    difficulty: 1,
    requirement: {
      subjectId: 'portrait_01',
      requireFilmColor: 'bw',
      minScore: 55,
      minGrade: 'C',
      bonusConditions: [
        { type: 'film_match', label: '使用推荐胶片 (HP5+)', bonusPoints: 50 },
        { type: 'specific_grade', value: 'B', label: '达到B级评分', bonusPoints: 100 },
        { type: 'perfect_exposure', label: '曝光偏差<10%', bonusPoints: 80 }
      ]
    },
    rewards: [
      { type: 'points', value: 200, label: '200经验值', icon: '⭐' },
      { type: 'unlock_film', value: ['portra400'], label: '解锁胶片：柯达 Portra 400', icon: '🎞️' },
      { type: 'unlock_subject', value: ['still_life_01'], label: '解锁题材：茶与旧书', icon: '📷' }
    ],
    prerequisites: [],
    tags: ['黑白', '人像', '入门']
  },
  {
    id: 'quest_01_02',
    stageId: 'stage_01',
    order: 2,
    title: '午后的时光',
    description: '使用彩色胶片，为静物"茶与旧书"拍摄暖调照片。表现木纹的质感和书页的纹理。',
    storyText: '一杯茶，一本旧书，就能构成一个故事。你的任务是用色彩诉说这个午后的慵懒时光。暖调不是偏色，而是恰到好处的温度感。',
    difficulty: 2,
    requirement: {
      subjectId: 'still_life_01',
      requireFilmColor: 'color',
      allowedFilmIds: ['portra400', 'ektar100'],
      minScore: 60,
      minGrade: 'C',
      bonusConditions: [
        { type: 'film_match', label: '使用推荐胶片', bonusPoints: 50 },
        { type: 'no_warnings', label: '无参数警告', bonusPoints: 100 },
        { type: 'specific_grade', value: 'A', label: '达到A级评分', bonusPoints: 150 }
      ]
    },
    rewards: [
      { type: 'points', value: 300, label: '300经验值', icon: '⭐' },
      { type: 'unlock_recipe', value: ['recipe_c41_color'], label: '解锁配方：C-41彩色标准', icon: '🧪' },
      { type: 'badge', value: '📚', label: '静物入门徽章' }
    ],
    prerequisites: ['quest_01_01'],
    tags: ['彩色', '静物', '暖调']
  },
  {
    id: 'quest_01_03',
    stageId: 'stage_01',
    order: 3,
    title: '光影的练习',
    description: '任选黑白胶片，完成逆光剪影人像的拍摄。重点表现轮廓光和发丝光的细节。',
    storyText: '剪影，是摄影中最古老也最浪漫的技法之一。在日落的逆光中，人物的轮廓被镀上金边——你需要在保留暗部细节和突出轮廓之间找到完美的平衡。',
    difficulty: 2,
    requirement: {
      subjectId: 'portrait_02',
      requireFilmColor: 'bw',
      minScore: 65,
      minGrade: 'C',
      requireKeyAreaHits: 2,
      bonusConditions: [
        { type: 'all_key_areas', label: '命中全部关键区域', bonusPoints: 120 },
        { type: 'specific_grade', value: 'B', label: '达到B级评分', bonusPoints: 80 }
      ]
    },
    rewards: [
      { type: 'points', value: 350, label: '350经验值', icon: '⭐' },
      { type: 'unlock_film', value: ['ektar100'], label: '解锁胶片：柯达 Ektar 100', icon: '🎞️' },
      { type: 'title', value: '光影学徒', label: '获得称号：光影学徒' }
    ],
    prerequisites: ['quest_01_02'],
    tags: ['黑白', '人像', '逆光']
  },

  {
    id: 'quest_02_01',
    stageId: 'stage_02',
    order: 1,
    title: '雨中的城市',
    description: '使用黑白街头经典胶片，完成雨中街角的拍摄。利用地面反光营造氛围。',
    storyText: '雨，是街头摄影师最好的朋友。湿漉漉的柏油路像一面镜子，把霓虹和路灯揉成抽象的画作。请用 Tri-X 的粗犷颗粒，记录这个城市最真实的脉搏。',
    difficulty: 3,
    requirement: {
      subjectId: 'street_01',
      allowedFilmIds: ['tri-x', 'hp5'],
      minScore: 65,
      minGrade: 'B',
      bonusConditions: [
        { type: 'film_match', label: '使用推荐胶片 (Tri-X)', bonusPoints: 80 },
        { type: 'specific_grade', value: 'A', label: '达到A级评分', bonusPoints: 150 }
      ]
    },
    rewards: [
      { type: 'points', value: 400, label: '400经验值', icon: '⭐' },
      { type: 'unlock_film', value: ['tri-x'], label: '解锁胶片：柯达 Tri-X 400', icon: '🎞️' },
      { type: 'unlock_subject', value: ['street_01'], label: '解锁题材：雨中街角', icon: '📷' }
    ],
    prerequisites: [],
    tags: ['街头', '黑白', '纪实']
  },
  {
    id: 'quest_02_02',
    stageId: 'stage_02',
    order: 2,
    title: '街头的色彩',
    description: '使用任意彩色胶片，重新拍摄雨中街角。这次要表现霓虹灯的色彩与雨夜的氛围。',
    storyText: '黑白摄影是减法，彩色摄影是加法。当你把颜色加回到雨夜的场景中，霓虹的艳红、伞面的明黄、倒影的混色——你需要在杂乱的色彩中找到秩序。',
    difficulty: 3,
    requirement: {
      subjectId: 'street_01',
      requireFilmColor: 'color',
      minScore: 70,
      minGrade: 'B',
      bonusConditions: [
        { type: 'no_warnings', label: '无参数警告', bonusPoints: 100 },
        { type: 'all_key_areas', label: '命中全部关键区域', bonusPoints: 150 }
      ]
    },
    rewards: [
      { type: 'points', value: 450, label: '450经验值', icon: '⭐' },
      { type: 'unlock_recipe', value: ['recipe_d76_contrast'], label: '解锁配方：D-76高反差', icon: '🧪' },
      { type: 'badge', value: '🌧️', label: '雨夜漫步者徽章' }
    ],
    prerequisites: ['quest_02_01'],
    tags: ['街头', '彩色', '霓虹']
  },
  {
    id: 'quest_02_03',
    stageId: 'stage_02',
    order: 3,
    title: '风格的抉择',
    description: '使用高感光度黑白胶片，在同一题材上与之前的作品对比。这是对胶片特性的深入理解。',
    storyText: '每种胶片都有自己的脾气。HP5的细腻、Tri-X的粗犷、Delta 3200的狂野——只有真正理解它们的性格，才能在关键时刻做出正确的选择。',
    difficulty: 3,
    requirement: {
      subjectId: 'street_01',
      allowedFilmIds: ['delta3200'],
      minScore: 68,
      minGrade: 'B',
      bonusConditions: [
        { type: 'perfect_exposure', label: '曝光偏差<5%', bonusPoints: 200 },
        { type: 'specific_grade', value: 'A', label: '达到A级评分', bonusPoints: 150 }
      ]
    },
    rewards: [
      { type: 'points', value: 500, label: '500经验值', icon: '⭐' },
      { type: 'unlock_film', value: ['delta3200'], label: '解锁胶片：伊尔福 Delta 3200', icon: '🎞️' },
      { type: 'title', value: '街头猎手', label: '获得称号：街头猎手' }
    ],
    prerequisites: ['quest_02_02'],
    tags: ['黑白', '高感', '胶片对比']
  },

  {
    id: 'quest_03_01',
    stageId: 'stage_03',
    order: 1,
    title: '山间晨雾',
    description: '使用高饱和彩色胶片，完成山间晨雾风光的拍摄。重点是保留暗部细节同时突出天空层次。',
    storyText: '山雾缭绕的清晨，是风光摄影师的黄金时刻。问题是：天空那么亮，森林那么暗——你要如何用一卷胶片，容纳这所有的层次？',
    difficulty: 4,
    requirement: {
      subjectId: 'landscape_01',
      requireFilmColor: 'color',
      allowedFilmIds: ['velvia50', 'ektar100'],
      minScore: 72,
      minGrade: 'B',
      requireKeyAreaHits: 3,
      bonusConditions: [
        { type: 'film_match', label: '使用 Velvia 50', bonusPoints: 100 },
        { type: 'all_key_areas', label: '命中全部关键区域', bonusPoints: 200 },
        { type: 'specific_grade', value: 'A', label: '达到A级评分', bonusPoints: 200 }
      ]
    },
    rewards: [
      { type: 'points', value: 550, label: '550经验值', icon: '⭐' },
      { type: 'unlock_film', value: ['velvia50'], label: '解锁胶片：富士 Velvia 50', icon: '🎞️' },
      { type: 'unlock_subject', value: ['landscape_01'], label: '解锁题材：山间晨雾', icon: '📷' }
    ],
    prerequisites: [],
    tags: ['风光', '彩色', '高反差']
  },
  {
    id: 'quest_03_02',
    stageId: 'stage_03',
    order: 2,
    title: '黑白的壮丽',
    description: '使用黑白胶片重新演绎山间晨雾。用灰度层次而非色彩，表现山川的力量感。',
    storyText: '当你剥离掉色彩，剩下的是什么？是光与影的对话，是线条与质感的交响。安塞尔·亚当斯用黑白创造了永恒的风光——现在轮到你了。',
    difficulty: 4,
    requirement: {
      subjectId: 'landscape_01',
      requireFilmColor: 'bw',
      minScore: 75,
      minGrade: 'B',
      bonusConditions: [
        { type: 'film_match', label: '使用推荐胶片 (HP5+)', bonusPoints: 80 },
        { type: 'no_warnings', label: '无参数警告', bonusPoints: 120 },
        { type: 'specific_grade', value: 'A', label: '达到A级评分', bonusPoints: 200 }
      ]
    },
    rewards: [
      { type: 'points', value: 600, label: '600经验值', icon: '⭐' },
      { type: 'unlock_recipe', value: ['recipe_xtol_sharp'], label: '解锁配方：Xtol高锐度', icon: '🧪' },
      { type: 'badge', value: '🏔️', label: '山岳摄影师徽章' }
    ],
    prerequisites: ['quest_03_01'],
    tags: ['风光', '黑白', '区域曝光']
  },
  {
    id: 'quest_03_03',
    stageId: 'stage_03',
    order: 3,
    title: '逆光的艺术',
    description: '使用彩色反转片，完成逆光剪影人像。反转片的宽容度很低，你需要极其精准的曝光判断。',
    storyText: '反转片是最严厉的老师——它没有"后期补救"的余地，曝光差了就是差了。但正是这种严苛，让每一张成功的反转片都如宝石般珍贵。',
    difficulty: 4,
    requirement: {
      subjectId: 'portrait_02',
      allowedFilmIds: ['velvia50'],
      minScore: 78,
      minGrade: 'B',
      requireKeyAreaHits: 3,
      bonusConditions: [
        { type: 'all_key_areas', label: '命中全部关键区域', bonusPoints: 250 },
        { type: 'perfect_exposure', label: '曝光偏差<5%', bonusPoints: 200 },
        { type: 'specific_grade', value: 'S', label: '达到S级评分', bonusPoints: 300 }
      ]
    },
    rewards: [
      { type: 'points', value: 700, label: '700经验值', icon: '⭐' },
      { type: 'unlock_recipe', value: ['recipe_e6_reversal'], label: '解锁配方：E-6反转片工艺', icon: '🧪' },
      { type: 'title', value: '自然捕手', label: '获得称号：自然捕手' }
    ],
    prerequisites: ['quest_03_02'],
    tags: ['反转片', '人像', '逆光']
  },

  {
    id: 'quest_04_01',
    stageId: 'stage_04',
    order: 1,
    title: '都市霓虹',
    description: '使用高感光度黑白胶片，完成都市夜景拍摄。在极端的明暗对比中保留细节。',
    storyText: '城市在夜晚脱下伪装。写字楼的灯光、出租车的尾灯、24小时便利店的日光灯——所有这些光源都在考验你对曝光的掌控。记住：暗部不死黑，高光不溢出，这是夜景的铁律。',
    difficulty: 5,
    requirement: {
      subjectId: 'night_01',
      requireFilmColor: 'bw',
      allowedFilmIds: ['delta3200', 'tri-x'],
      minScore: 75,
      minGrade: 'B',
      requireKeyAreaHits: 3,
      maxAttempts: 5,
      bonusConditions: [
        { type: 'film_match', label: '使用 Delta 3200', bonusPoints: 120 },
        { type: 'all_key_areas', label: '命中全部关键区域', bonusPoints: 250 },
        { type: 'specific_grade', value: 'A', label: '达到A级评分', bonusPoints: 250 }
      ]
    },
    rewards: [
      { type: 'points', value: 800, label: '800经验值', icon: '⭐' },
      { type: 'unlock_subject', value: ['night_01'], label: '解锁题材：都市夜景', icon: '📷' },
      { type: 'badge', value: '🌃', label: '夜行者徽章' }
    ],
    prerequisites: [],
    tags: ['夜景', '黑白', '高感']
  },
  {
    id: 'quest_04_02',
    stageId: 'stage_04',
    order: 2,
    title: '灯火阑珊处',
    description: '使用彩色负片，重新诠释都市夜景。这次你需要精确控制色温，表现灯光的色彩温度。',
    storyText: '霓虹灯为什么是红的？路灯为什么是黄的？这背后都有色温的科学。在彩色夜景中，你的任务不仅是保留层次，更是保留每一盏灯独特的性格。',
    difficulty: 5,
    requirement: {
      subjectId: 'night_01',
      requireFilmColor: 'color',
      allowedFilmIds: ['portra400', 'ektar100'],
      minScore: 80,
      minGrade: 'A',
      requireKeyAreaHits: 3,
      maxAttempts: 5,
      bonusConditions: [
        { type: 'film_match', label: '使用 Portra 400', bonusPoints: 100 },
        { type: 'no_warnings', label: '无参数警告', bonusPoints: 150 },
        { type: 'perfect_exposure', label: '曝光偏差<5%', bonusPoints: 250 }
      ]
    },
    rewards: [
      { type: 'points', value: 900, label: '900经验值', icon: '⭐' },
      { type: 'unlock_recipe', value: ['recipe_id11_finegrain'], label: '解锁配方：ID-11细颗粒', icon: '🧪' },
      { type: 'badge', value: '💡', label: '追光者徽章' }
    ],
    prerequisites: ['quest_04_01'],
    tags: ['夜景', '彩色', '色温']
  },
  {
    id: 'quest_04_03',
    stageId: 'stage_04',
    order: 3,
    title: '大师的挑战',
    description: '最终挑战：使用任意胶片，在都市夜景上达到S级评分。这是对全部所学的终极检验。',
    storyText: '你已经走了很远。从窗边少女的柔和光线，到城市夜晚的霓虹幻影——现在，是时候证明自己了。请用一卷胶片，完成一幅真正的大师级作品。暗房在等待你。',
    difficulty: 5,
    requirement: {
      subjectId: 'night_01',
      minScore: 90,
      minGrade: 'S',
      requireKeyAreaHits: 4,
      maxAttempts: 8,
      bonusConditions: [
        { type: 'all_key_areas', label: '完美命中全部关键区域', bonusPoints: 400 },
        { type: 'no_warnings', label: '无任何参数警告', bonusPoints: 300 },
        { type: 'perfect_exposure', label: '曝光偏差<3%', bonusPoints: 500 }
      ]
    },
    rewards: [
      { type: 'points', value: 1500, label: '1500经验值', icon: '⭐' },
      { type: 'badge', value: '👑', label: '暗房之王徽章' },
      { type: 'title', value: '传奇暗房师', label: '获得称号：传奇暗房师' }
    ],
    prerequisites: ['quest_04_02'],
    tags: ['最终挑战', 'S级', '大师']
  }
];

export const INITIAL_UNLOCKED_SUBJECTS = ['portrait_01'];
export const INITIAL_UNLOCKED_FILMS = ['hp5'];
