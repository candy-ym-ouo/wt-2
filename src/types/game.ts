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

export type DifficultyLevel = 1 | 2 | 3 | 4 | 5;

export type TargetStyle = 'soft' | 'vivid' | 'dramatic' | 'retro' | 'moody' | 'clean' | 'warm' | 'cool';

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
  difficulty: DifficultyLevel;
  recommendedFilms: string[];
  targetStyle: TargetStyle;
  scoreMultiplier: number;
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
  stageImpact: StageScoreImpact;
}

export type GamePhase = 'tutorial' | 'select' | 'expose' | 'develop' | 'fix' | 'wash' | 'result' | 'album' | 'compare';

export interface CompareSelection {
  subjectId: string;
  photoIds: string[];
}

export interface ParamDiff {
  param: keyof DevParams;
  label: string;
  values: number[];
  minValue: number;
  maxValue: number;
  bestValue: number;
  bestPhotoId: string;
  isSignificant: boolean;
  diffPercent: number;
}

export interface ScoreDiff {
  category: 'exposure' | 'contrast' | 'color' | 'detail' | 'overall';
  label: string;
  values: number[];
  bestValue: number;
  bestPhotoId: string;
}

export interface BestRecommendation {
  photoId: string;
  score: number;
  reasons: string[];
  params: DevParams;
}

export type DevelopStage = 'presoak' | 'develop' | 'stop' | 'fix' | 'wash' | 'complete';

export interface StageDuration {
  develop: number;
  fix: number;
  wash: number;
}

export interface StageState {
  currentStage: DevelopStage;
  stageProgress: number;
  totalProgress: number;
  stageStartAt: number;
  developDuration: number;
  fixDuration: number;
  washDuration: number;
  developElapsed: number;
  fixElapsed: number;
  washElapsed: number;
  developDeviation: number;
  fixDeviation: number;
  washDeviation: number;
}

export interface StageScoreImpact {
  developPenalty: number;
  fixPenalty: number;
  washPenalty: number;
  developFeedback: string;
  fixFeedback: string;
  washFeedback: string;
}

export interface AttemptRecord {
  attemptNumber: number;
  params: DevParams;
  score: number;
  overall: number;
  grade: 'S' | 'A' | 'B' | 'C' | 'D';
  timestamp: number;
  subjectId: string;
  filmId: string;
}

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
  stageState: StageState;
  compareSelection: string[];
  compareSubjectId: string | null;
  favorites: FavoriteInfo[];
  collections: PhotoCollection[];
  collectionFilter: CollectionFilter;
  quickBrowseIndex: number;
  quickBrowsePhotoIds: string[];
  storageStatus: StorageStatus;
  attemptHistory: AttemptRecord[];
  achievements: AchievementState;
  orders: DarkroomOrder[];
  currentOrderId: string | null;
  orderFilter: OrderFilter;
  orderScheduleSlots: ScheduleSlot[];
  filmLab: FilmLabState;
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

export type StorageWarningType = 'quota' | 'corrupted' | 'recovered' | 'migrated' | 'limit_reached';

export interface StorageWarning {
  type: StorageWarningType;
  message: string;
  timestamp: number;
  details?: string;
}

export interface StorageStatus {
  warnings: StorageWarning[];
  photosLoaded: number;
  presetsLoaded: number;
  tutorialLoaded: boolean;
  favoritesLoaded: number;
  collectionsLoaded: number;
  ordersLoaded: number;
  lastSaveSuccess: boolean;
  lastSaveError?: string;
  storageUsed: number;
  storageQuota: number;
  migrationPerformed: boolean;
  recoveryPerformed: boolean;
  corruptedItems: {
    photos: number;
    presets: number;
    favorites: number;
    collections: number;
    orders: number;
  };
}

export interface FavoriteInfo {
  photoId: string;
  favoritedAt: number;
  groupId?: string;
}

export interface CollectionGroup {
  id: string;
  name: string;
  description?: string;
  photoIds: string[];
  coverPhotoId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface PhotoCollection {
  id: string;
  name: string;
  description?: string;
  coverPhotoId?: string;
  photoIds: string[];
  groups: CollectionGroup[];
  createdAt: number;
  updatedAt: number;
  tags?: string[];
}

export interface CollectionStats {
  total: number;
  avgScore: number;
  bestScore: number;
  worstScore: number;
  gradeCounts: Record<string, number>;
  subjectCounts: Record<string, number>;
  filmCounts: Record<string, number>;
  scoreDistribution: number[];
}

export interface SubjectPreferenceItem {
  subjectId: string;
  subjectName: string;
  count: number;
  avgScore: number;
  bestScore: number;
  winRate: number;
  totalAttempts: number;
}

export interface FilmWinRateItem {
  filmId: string;
  filmName: string;
  count: number;
  avgScore: number;
  bestScore: number;
  winRate: number;
  gradeCounts: Record<string, number>;
  color: 'bw' | 'color';
  thumbnailColor: string;
}

export interface ScoreSegmentItem {
  segment: string;
  startIndex: number;
  endIndex: number;
  count: number;
  avgScore: number;
  bestScore: number;
  worstScore: number;
  gradeCounts: Record<string, number>;
  dateRange: { start: number; end: number };
}

export interface QualityFluctuationItem {
  index: number;
  score: number;
  grade: string;
  timestamp: number;
  deviation: number;
  trend: 'up' | 'down' | 'stable';
  subjectName: string;
  filmName: string;
}

export interface ExtendedStatistics {
  total: number;
  avgScore: number;
  bestScore: number;
  gradeCounts: Record<string, number>;
  subjectPreferences: SubjectPreferenceItem[];
  filmWinRates: FilmWinRateItem[];
  scoreSegments: ScoreSegmentItem[];
  qualityFluctuation: QualityFluctuationItem[];
  recentAvgScore: number;
  overallTrend: 'improving' | 'declining' | 'stable';
}

export type AchievementLine = 'high_score' | 'film_mastery' | 'streak';

export interface AchievementReward {
  badge: string;
  title: string;
}

export type AchievementCondition =
  | { type: 'any_grade'; minGrade: string }
  | { type: 'grade_on_subjects'; minGrade: string; subjectCount: number }
  | { type: 'grade_on_scene_types'; minGrade: string; sceneTypeCount: number }
  | { type: 'film_variety'; filmCount: number }
  | { type: 'film_min_usage'; minUsage: number }
  | { type: 'film_grade_count'; minGrade: string; count: number }
  | { type: 'film_all_grade'; minGrade: string }
  | { type: 'streak_days'; days: number };

export interface AchievementDefinition {
  id: string;
  line: AchievementLine;
  tier: number;
  name: string;
  description: string;
  icon: string;
  reward: AchievementReward;
  condition: AchievementCondition;
}

export interface AchievementProgress {
  achievementId: string;
  current: number;
  target: number;
  isUnlocked: boolean;
}

export interface AchievementState {
  unlockedIds: string[];
  practiceDays: string[];
  newlyUnlocked: string[];
}

export type AlbumViewMode = 'all' | 'favorites' | 'collections';

export interface CollectionFilter {
  viewMode: AlbumViewMode;
  activeCollectionId: string | null;
  activeGroupId: string | null;
}

export type OrderStatus = 'pending' | 'matched' | 'scheduled' | 'developing' | 'scoring' | 'completed' | 'archived';

export type OrderPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface CustomerInfo {
  name: string;
  contact?: string;
  notes?: string;
}

export interface OrderRequirements {
  sceneType: string;
  targetStyle: TargetStyle;
  difficulty: DifficultyLevel;
  preferredFilmType?: 'bw' | 'color' | 'any';
  preferredIso?: 'low' | 'medium' | 'high' | 'any';
  grainPreference?: 'fine' | 'medium' | 'coarse' | 'any';
  specialInstructions?: string;
  budget?: number;
  quantity: number;
}

export interface FilmMatch {
  filmId: string;
  matchScore: number;
  matchReasons: string[];
  isRecommended: boolean;
}

export interface ScheduleSlot {
  id: string;
  date: number;
  timeSlot: 'morning' | 'afternoon' | 'evening';
  capacity: number;
  filled: number;
}

export interface OrderSchedule {
  slotId: string;
  scheduledAt: number;
  estimatedDuration: number;
  developer: string;
}

export interface OrderScoreFeedback {
  overallRating: number;
  qualityRating: number;
  speedRating: number;
  serviceRating: number;
  comment?: string;
  wouldRecommend: boolean;
  ratedAt: number;
}

export interface ArchiveInfo {
  archivedAt: number;
  albumCollectionId?: string;
  archiveNotes?: string;
}

export interface DarkroomOrder {
  id: string;
  orderNumber: string;
  customer: CustomerInfo;
  requirements: OrderRequirements;
  status: OrderStatus;
  priority: OrderPriority;
  matchedFilms: FilmMatch[];
  selectedFilmId?: string;
  selectedSubjectId?: string;
  schedule?: OrderSchedule;
  photoIds: string[];
  scoreFeedback?: OrderScoreFeedback;
  archiveInfo?: ArchiveInfo;
  internalNotes?: string;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
}

export interface OrderFilter {
  statuses: OrderStatus[];
  priorities: OrderPriority[];
  searchKeyword: string;
  dateFrom?: number;
  dateTo?: number;
  sortBy: 'created_desc' | 'created_asc' | 'priority_desc' | 'status';
}

export interface OrderStatistics {
  total: number;
  pending: number;
  developing: number;
  completed: number;
  archived: number;
  avgTurnaroundTime: number;
  avgCustomerRating: number;
}

export type ChemicalType = 'developer' | 'accelerator' | 'preservative' | 'restrainer' | 'fixer' | 'hardener' | 'wetting_agent' | 'other';

export interface Chemical {
  id: string;
  name: string;
  type: ChemicalType;
  formula?: string;
  description: string;
}

export interface SolutionComponent {
  chemicalId: string;
  chemicalName: string;
  amount: number;
  unit: 'g' | 'ml' | 'mg' | 'drop';
}

export type SolutionType = 'developer' | 'stop_bath' | 'fixer' | 'washing_aid' | 'wetting_agent';

export interface ChemicalSolution {
  id: string;
  name: string;
  type: SolutionType;
  components: SolutionComponent[];
  totalVolume: number;
  volumeUnit: 'ml' | 'l';
  ph?: number;
  notes?: string;
  createdAt: number;
  updatedAt: number;
  version: number;
  isDefault?: boolean;
}

export interface RecipeVersion {
  version: number;
  timestamp: number;
  name: string;
  developerId?: string;
  stopBathId?: string;
  fixerId?: string;
  washingAidId?: string;
  wettingAgentId?: string;
  developmentParams: {
    temperature: number;
    timeMultiplier: number;
    agitation: number;
    dilution: number;
  };
  changeNote?: string;
}

export type FilmProcessType = 'bw' | 'c41' | 'e6' | 'custom';

export interface DeveloperRecipe {
  id: string;
  name: string;
  processType: FilmProcessType;
  description: string;
  developerId?: string;
  stopBathId?: string;
  fixerId?: string;
  washingAidId?: string;
  wettingAgentId?: string;
  developmentParams: {
    temperature: number;
    timeMultiplier: number;
    agitation: number;
    dilution: number;
  };
  suitableFilmIds: string[];
  suitableSceneTypes: string[];
  tags: string[];
  versionHistory: RecipeVersion[];
  createdAt: number;
  updatedAt: number;
  version: number;
  isDefault?: boolean;
}

export interface TrialResult {
  id: string;
  recipeId: string;
  recipeName: string;
  filmId: string;
  subjectId?: string;
  params: DevParams;
  predictedScore: number;
  predictedGrade: 'S' | 'A' | 'B' | 'C' | 'D';
  predictedContrast: number;
  predictedSaturation: number;
  predictedDetail: number;
  predictedExposure: number;
  timings: {
    presoak: number;
    develop: number;
    stop: number;
    fix: number;
    wash: number;
    total: number;
  };
  warnings: string[];
  suggestions: string[];
  createdAt: number;
}

export interface RecipeCompareResult {
  recipeIds: string[];
  filmId: string;
  subjectId?: string;
  bestRecipeId: string;
  comparison: {
    recipeId: string;
    recipeName: string;
    params: DevParams;
    score: number;
    grade: 'S' | 'A' | 'B' | 'C' | 'D';
    contrast: number;
    saturation: number;
    detail: number;
    exposure: number;
    totalTime: number;
    tags: string[];
  }[];
  paramDifferences: {
    param: keyof DevParams;
    label: string;
    values: { recipeId: string; value: number }[];
    bestRecipeId: string;
  }[];
  createdAt: number;
}

export type FilmLabTab = 'recipes' | 'solutions' | 'trial' | 'compare' | 'history';

export interface FilmLabState {
  recipes: DeveloperRecipe[];
  solutions: ChemicalSolution[];
  chemicals: Chemical[];
  trialHistory: TrialResult[];
  compareHistory: RecipeCompareResult[];
  activeTab: FilmLabTab;
  selectedRecipeId: string | null;
  selectedSolutionId: string | null;
  selectedChemicalId: string | null;
}
