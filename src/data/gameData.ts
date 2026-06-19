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
