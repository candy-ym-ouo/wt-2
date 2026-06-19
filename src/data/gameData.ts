import type { FilmStock, PhotoSubject, TutorialStep, DevParams } from '../types/game';

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
    keyAreas: [
      { name: '人物轮廓', x: 0.3, y: 0.2, w: 0.4, h: 0.7, importance: 0.35, idealBrightness: 0.15 },
      { name: '背景天空', x: 0, y: 0, w: 1, h: 0.6, importance: 0.3, idealBrightness: 0.75 },
      { name: '发丝光', x: 0.38, y: 0.18, w: 0.24, h: 0.12, importance: 0.2, idealBrightness: 0.9 },
      { name: '地面草地', x: 0, y: 0.6, w: 1, h: 0.4, importance: 0.15, idealBrightness: 0.2 }
    ]
  }
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
    title: '欢迎来到暗房',
    content: '这是一个胶片暗房模拟器。你将扮演一名暗房技师，亲手将底片冲洗成精美的照片。准备好了吗？让我们开始这段奇妙的旅程！',
    highlightArea: 'none'
  },
  {
    id: 1,
    title: '选择拍摄题材',
    content: '首先，从左侧选择一个你想要冲洗的场景。不同的场景对曝光和显影有不同的理想参数。仔细阅读每个场景的描述吧！',
    highlightArea: 'subject-list',
    actionHint: '点击左侧任意题材卡片'
  },
  {
    id: 2,
    title: '选择胶片类型',
    content: '每种胶片都有独特的性格：黑白或彩色，低感或高感，细腻颗粒或粗粝质感。根据题材选择合适的胶片，这是好作品的第一步。',
    highlightArea: 'film-list',
    actionHint: '点击一个胶片'
  },
  {
    id: 3,
    title: '调整曝光参数',
    content: '曝光是暗房工作的核心。曝光不足会导致画面昏暗，曝光过度则会丢失高光细节。仔细观察预览窗中的变化，找到最佳曝光点。',
    highlightArea: 'param-panel',
    actionHint: '拖动曝光滑块'
  },
  {
    id: 4,
    title: '控制显影过程',
    content: '显影时间、温度和搅动方式都会影响最终效果。时间越长对比度越高，温度越高化学反应越剧烈，搅动则影响画面均匀度。',
    highlightArea: 'develop-panel',
    actionHint: '尝试调整各个参数'
  },
  {
    id: 5,
    title: '开始冲洗',
    content: '一切准备就绪后，点击"开始显影"按钮。你将看到底片在药液中慢慢显现的神奇过程。完成后，系统会为你的作品评分！',
    highlightArea: 'develop-button',
    actionHint: '准备好了就开始吧！'
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
