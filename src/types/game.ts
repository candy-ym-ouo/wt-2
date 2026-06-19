export interface FilmStock {
  id: string;
  name: string;
  iso: number;
  color: 'bw' | 'color';
  baseContrast: number;
  baseSaturation: number;
  grainSize: number;
  description: string;
  thumbnailColor: string;
}

export interface PhotoSubject {
  id: string;
  name: string;
  sceneType: 'portrait' | 'landscape' | 'street' | 'still_life' | 'night';
  description: string;
  idealExposure: number;
  idealContrast: number;
  idealSaturation: number;
  baseBrightness: number;
  keyAreas: KeyArea[];
  seed: number;
  tags: string[];
}

export interface KeyArea {
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  importance: number;
  idealBrightness: number;
}

export interface DevParams {
  exposure: number;
  developmentTime: number;
  temperature: number;
  agitation: number;
  contrast: number;
  saturation: number;
  dilution: number;
}

export interface ParamPreset {
  id: string;
  name: string;
  description: string;
  params: DevParams;
  subjectId?: string;
  filmId?: string;
  createdAt: number;
  updatedAt: number;
  version: number;
  isDefault?: boolean;
}

export interface PresetHistory {
  presetId: string;
  name: string;
  params: DevParams;
  timestamp: number;
}

export interface ProcessedPhoto {
  id: string;
  subjectId: string;
  filmId: string;
  params: DevParams;
  score: number;
  details: ScoreDetail;
  imageDataUrl: string;
  timestamp: number;
  notes?: string;
  tags?: string[];
}

export type SortOption = 'date_desc' | 'date_asc' | 'score_desc' | 'score_asc' | 'grade_desc';

export type NoteFilter = 'all' | 'has_note' | 'no_note';

export interface AlbumFilter {
  subjectIds: string[];
  filmIds: string[];
  sceneTypes: string[];
  grades: string[];
  minScore: number;
  maxScore: number;
  tags: string[];
  sortBy: SortOption;
  noteFilter: NoteFilter;
  noteKeyword: string;
}

export interface KeyAreaResult {
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  importance: number;
  idealBrightness: number;
  actualBrightness: number;
  brightnessDiff: number;
  score: number;
  isHit: boolean;
  hitStatus: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface ParamDeviation {
  param: string;
  label: string;
  idealValue: number;
  actualValue: number;
  deviation: number;
  deviationPercent: number;
  direction: 'high' | 'low' | 'optimal';
  scoreImpact: number;
  suggestion: string;
}

export interface DeductionItem {
  category: 'exposure' | 'contrast' | 'color' | 'detail';
  categoryLabel: string;
  reason: string;
  pointsLost: number;
  severity: 'minor' | 'moderate' | 'major' | 'critical';
  suggestion: string;
}

export interface ScoreDetail {
  exposure: number;
  contrast: number;
  color: number;
  detail: number;
  overall: number;
  feedback: string[];
  grade: 'S' | 'A' | 'B' | 'C' | 'D';
  keyAreaResults: KeyAreaResult[];
  paramDeviations: ParamDeviation[];
  deductions: DeductionItem[];
  overexposedPct: number;
  underexposedPct: number;
  dynamicRange: number;
  sharpness: number;
}

export type GamePhase = 'tutorial' | 'select' | 'expose' | 'develop' | 'fix' | 'wash' | 'result' | 'album';

export type CanvasMode = 'preview' | 'developing' | 'final';

export interface GameState {
  currentSubject: PhotoSubject | null;
  currentFilm: FilmStock;
  currentParams: DevParams;
  developmentProgress: number;
  isDeveloping: boolean;
  phase: GamePhase;
  processedPhotos: ProcessedPhoto[];
  tutorial: TutorialState;
  tutorialStep: number;
  selectedAlbumPhoto: ProcessedPhoto | null;
  presets: ParamPreset[];
  presetHistory: PresetHistory[];
  lastAppliedPresetId: string | null;
  adjustedParams: (keyof DevParams)[];
  subjectSelectedAt: number | null;
  filmSelectedAt: number | null;
  paramAdjustTimestamps: Partial<Record<keyof DevParams, number>>;
  developStartedAt: number | null;
}

export type TutorialUnlockCondition = 
  | { type: 'auto' }
  | { type: 'subject_selected' }
  | { type: 'film_selected' }
  | { type: 'param_adjusted'; param: keyof DevParams }
  | { type: 'any_param_adjusted' }
  | { type: 'other_param_adjusted'; excludeParam: keyof DevParams }
  | { type: 'develop_started' }
  | { type: 'step_completed'; stepId: number };

export type TutorialPhase = 'intro' | 'selection' | 'adjustment' | 'development' | 'final';

export interface TutorialStep {
  id: number;
  phase: TutorialPhase;
  title: string;
  content: string;
  highlightArea?: string;
  actionHint?: string;
  unlockCondition: TutorialUnlockCondition;
  completionCondition: TutorialUnlockCondition;
  requiresCompletion: boolean;
  allowSkip: boolean;
}

export interface TutorialStepState {
  stepId: number;
  unlocked: boolean;
  activated: boolean;
  activatedAt?: number;
  completed: boolean;
  completedAt?: number;
  skipped: boolean;
  actionsPerformed: string[];
}

export interface TutorialState {
  currentStep: number;
  steps: TutorialStepState[];
  phase: TutorialPhase;
  isCompleted: boolean;
  startedAt: number;
  completedAt?: number;
  totalTimeSpent: number;
}
