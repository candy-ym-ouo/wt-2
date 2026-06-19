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
  questSystem: QuestSystemState;
  reviewSystem: ReviewSystemState;
  inventorySystem: InventorySystemState;
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
  questSystemLoaded?: boolean;
  reviewSystemLoaded?: boolean;
  inventorySystemLoaded?: boolean;
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
    reviewSystem?: number;
    inventorySystem?: number;
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

export type QuestStatus = 'locked' | 'available' | 'in_progress' | 'completed' | 'claimed';

export type StageStatus = 'locked' | 'unlocked' | 'cleared';

export type QuestRewardType =
  | { type: 'unlock_subject'; subjectIds: string[] }
  | { type: 'unlock_film'; filmIds: string[] }
  | { type: 'unlock_recipe'; recipeIds: string[] }
  | { type: 'points'; amount: number }
  | { type: 'title'; title: string }
  | { type: 'badge'; badge: string; title?: string }
  | { type: 'preset'; presetId: string };

export interface QuestReward {
  type: QuestRewardType['type'];
  value: string[] | number | string;
  label: string;
  icon?: string;
}

export interface QuestRequirement {
  subjectId: string;
  allowedFilmIds?: string[];
  forbiddenFilmIds?: string[];
  requireFilmColor?: 'bw' | 'color';
  minScore: number;
  minGrade?: 'S' | 'A' | 'B' | 'C' | 'D';
  requireKeyAreaHits?: number;
  maxAttempts?: number;
  bonusConditions?: {
    type: 'film_match' | 'all_key_areas' | 'no_warnings' | 'perfect_exposure' | 'specific_grade';
    value?: string | number;
    label: string;
    bonusPoints: number;
  }[];
}

export interface QuestDefinition {
  id: string;
  stageId: string;
  order: number;
  title: string;
  description: string;
  storyText?: string;
  difficulty: DifficultyLevel;
  requirement: QuestRequirement;
  rewards: QuestReward[];
  prerequisites: string[];
  tags: string[];
}

export interface StageDefinition {
  id: string;
  order: number;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  color: string;
  backgroundGradient?: string;
  questIds: string[];
  prerequisites: string[];
  bonus?: {
    type: 'all_quests_grade' | 'total_points' | 'streak';
    value: string | number;
    rewards: QuestReward[];
    label: string;
  };
}

export interface QuestProgress {
  questId: string;
  status: QuestStatus;
  bestScore: number;
  bestGrade: 'S' | 'A' | 'B' | 'C' | 'D' | null;
  attempts: number;
  completedAt?: number;
  claimedAt?: number;
  unlockedSubjectIds: string[];
  unlockedFilmIds: string[];
  bonusAchieved: string[];
}

export interface StageProgress {
  stageId: string;
  status: 'locked' | 'unlocked' | 'cleared';
  totalScore: number;
  unlockedAt?: number;
  clearedAt?: number;
  bonusClaimed?: boolean;
}

export interface QuestSystemState {
  totalPoints: number;
  earnedBadges: string[];
  earnedTitles: string[];
  unlockedSubjectIds: string[];
  unlockedFilmIds: string[];
  unlockedRecipeIds: string[];
  questProgress: Record<string, QuestProgress>;
  stageProgress: Record<string, StageProgress>;
  currentActiveQuestId: string | null;
  lastClaimedRewards: {
    rewards: QuestReward[];
    timestamp: number;
  } | null;
}

export interface QuestAttemptResult {
  success: boolean;
  score: number;
  grade: 'S' | 'A' | 'B' | 'C' | 'D';
  passedRequirement: boolean;
  failedReasons: string[];
  bonusEarned: {
    condition: string;
    label: string;
    points: number;
  }[];
  basePoints: number;
  totalPoints: number;
  isNewBest: boolean;
  unlockedItems: {
    subjects: string[];
    films: string[];
    recipes: string[];
  };
}

export interface FilmRestrictionResult {
  allowed: boolean;
  filmId: string;
  questId: string;
  restrictions: {
    type: 'allowed_list' | 'forbidden_list' | 'color_requirement';
    value: string | string[];
    passed: boolean;
    message: string;
  }[];
}

export type ReviewDimensionId = 'composition' | 'lighting' | 'color' | 'detail' | 'creativity' | 'emotion';

export interface ReviewDimension {
  id: ReviewDimensionId;
  name: string;
  description: string;
  weight: number;
  icon: string;
}

export type ReviewerRole = 'junior' | 'senior' | 'master' | 'automated';

export interface Reviewer {
  id: string;
  name: string;
  role: ReviewerRole;
  avatar: string;
  expertise: ReviewDimensionId[];
  biasTendency: 'strict' | 'moderate' | 'lenient';
}

export interface ReviewScore {
  dimensionId: ReviewDimensionId;
  score: number;
  weight: number;
  comment: string;
}

export interface Review {
  id: string;
  submissionId: string;
  reviewerId: string;
  scores: ReviewScore[];
  overallComment: string;
  weightedScore: number;
  recommendation: 'reject' | 'revise' | 'accept' | 'excellent';
  reviewedAt: number;
  isAutomated: boolean;
}

export type SubmissionStatus = 
  | 'draft' 
  | 'submitted' 
  | 'reviewing' 
  | 'reviewed' 
  | 'disputed' 
  | 're_reviewing' 
  | 'finalized' 
  | 'archived';

export interface ReviewSubmission {
  id: string;
  photoId: string;
  photoDataUrl: string;
  subjectId: string;
  filmId: string;
  submitterId: string;
  submitterName: string;
  title: string;
  description: string;
  tags: string[];
  status: SubmissionStatus;
  submittedAt: number;
  reviews: Review[];
  finalScore: number | null;
  finalGrade: 'S' | 'A' | 'B' | 'C' | 'D' | null;
  disputeReason?: string;
  disputeAt?: number;
  finalizedAt?: number;
  ranking?: number;
  contestId?: string;
}

export type ContestStatus = 'upcoming' | 'active' | 'reviewing' | 'completed' | 'archived';

export interface ContestDefinition {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  theme: string;
  startDate: number;
  endDate: number;
  reviewStartDate: number;
  reviewEndDate: number;
  dimensions: ReviewDimension[];
  allowedSubjectIds?: string[];
  allowedFilmIds?: string[];
  requireFilmColor?: 'bw' | 'color';
  maxSubmissionsPerUser: number;
  minReviewsPerSubmission: number;
  status: ContestStatus;
  prizes: {
    rank: number;
    title: string;
    description: string;
    points: number;
    badge?: string;
    titleReward?: string;
  }[];
}

export interface LeaderboardEntry {
  rank: number;
  submissionId: string;
  photoDataUrl: string;
  title: string;
  submitterName: string;
  finalScore: number;
  finalGrade: string;
  reviewCount: number;
  submissionTime: number;
  subjectName: string;
  filmName: string;
  isDisputed: boolean;
}

export interface LeaderboardFilter {
  contestId: string | null;
  sortBy: 'score_desc' | 'score_asc' | 'date_desc' | 'date_asc' | 'reviews_desc';
  gradeFilter: string[];
  subjectFilter: string[];
  filmFilter: string[];
  includeDisputed: boolean;
}

export interface DisputeRecord {
  submissionId: string;
  disputeReason: string;
  disputedAt: number;
  resolvedAt?: number;
  resolution?: 'upheld' | 'rejected' | 'modified';
  resolutionNote?: string;
  resolvedBy?: string;
  originalScore: number | null;
  newScore?: number | null;
}

export interface ReviewCommentSummary {
  positivePoints: string[];
  negativePoints: string[];
  suggestions: string[];
  commonThemes: {
    theme: string;
    count: number;
    sentiment: 'positive' | 'negative' | 'neutral';
  }[];
  dimensionAverages: {
    dimensionId: ReviewDimensionId;
    dimensionName: string;
    averageScore: number;
    standardDeviation: number;
    minScore: number;
    maxScore: number;
  }[];
  reviewerAgreement: number;
  totalReviewers: number;
}

export interface ReviewSystemState {
  submissions: ReviewSubmission[];
  contests: ContestDefinition[];
  reviewers: Reviewer[];
  disputes: DisputeRecord[];
  activeContestId: string | null;
  selectedSubmissionId: string | null;
  activeTab: ReviewSystemTab;
  leaderboardFilter: LeaderboardFilter;
}

export type ReviewSystemTab = 'submit' | 'review' | 'leaderboard' | 'my_submissions' | 'disputes';

export type StockInSource = 'purchase' | 'gift' | 'refund' | 'other';
export type StockConsumeType = 'develop' | 'test' | 'practice' | 'other';
export type StockScrapReason = 'expired' | 'damaged' | 'fogged' | 'defective' | 'other';
export type InventoryTab = 'stock' | 'inbound' | 'consume' | 'scrap' | 'records';
export type AlertLevel = 'normal' | 'warning' | 'critical';

export interface FilmInventoryItem {
  filmId: string;
  quantity: number;
  minWarning: number;
  criticalWarning: number;
  unitPrice?: number;
  totalCost?: number;
  lastStockInAt?: number;
  lastConsumeAt?: number;
}

export interface StockInRecord {
  id: string;
  filmId: string;
  quantity: number;
  source: StockInSource;
  unitPrice?: number;
  totalPrice?: number;
  supplier?: string;
  batchNumber?: string;
  expireDate?: number;
  notes?: string;
  createdAt: number;
  operator?: string;
}

export interface StockConsumeRecord {
  id: string;
  filmId: string;
  quantity: number;
  type: StockConsumeType;
  relatedPhotoId?: string;
  relatedOrderId?: string;
  subjectId?: string;
  notes?: string;
  createdAt: number;
  operator?: string;
}

export interface StockScrapRecord {
  id: string;
  filmId: string;
  quantity: number;
  reason: StockScrapReason;
  description?: string;
  notes?: string;
  createdAt: number;
  operator?: string;
}

export interface InventoryAlert {
  id: string;
  filmId: string;
  level: AlertLevel;
  message: string;
  currentQuantity: number;
  threshold: number;
  createdAt: number;
  dismissed: boolean;
}

export interface InventoryStatistics {
  totalFilmTypes: number;
  totalQuantity: number;
  totalValue: number;
  lowStockCount: number;
  criticalStockCount: number;
  monthlyConsumption: Record<string, number>;
  monthlyScrap: Record<string, number>;
}

export interface InventoryFilter {
  filmIds: string[];
  dateFrom?: number;
  dateTo?: number;
  sourceTypes: StockInSource[];
  consumeTypes: StockConsumeType[];
  scrapReasons: StockScrapReason[];
  searchKeyword: string;
  sortBy: 'date_desc' | 'date_asc' | 'quantity_desc' | 'quantity_asc';
}

export interface InventorySystemState {
  inventory: FilmInventoryItem[];
  stockInRecords: StockInRecord[];
  consumeRecords: StockConsumeRecord[];
  scrapRecords: StockScrapRecord[];
  alerts: InventoryAlert[];
  activeTab: InventoryTab;
  filter: InventoryFilter;
  selectedFilmId: string | null;
  showAlertBadge: boolean;
}

export type InventoryRecordUnion = StockInRecord | StockConsumeRecord | StockScrapRecord;

export interface InventoryRecordWithType {
  type: 'stock_in' | 'consume' | 'scrap';
  record: InventoryRecordUnion;
}
