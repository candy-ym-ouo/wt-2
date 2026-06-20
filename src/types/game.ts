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

export type TargetStyle = 'soft' | 'vivid' | 'dramatic' | 'retro' | 'moody' | 'clean' | 'warm' | 'cool' | 'classic' | 'high_contrast' | 'low_key' | 'high_key' | 'dreamy' | 'grainy';

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
  publicationSystem: PublicationState;
  subjectWorkshop: SubjectWorkshopState;
  curriculumSystem: CurriculumSystemState;
  consignmentMarket: ConsignmentMarketState;
  exhibitionSystem: ExhibitionState;
  darkroomCalibration: DarkroomCalibrationState;
  challengeSystem: ChallengeState;
  filmGuide: FilmGuideState;
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
  publicationSystemLoaded?: boolean;
  curriculumSystemLoaded?: boolean;
  consignmentMarketLoaded?: boolean;
  exhibitionSystemLoaded?: boolean;
  darkroomCalibrationLoaded?: boolean;
  challengeSystemLoaded?: boolean;
  shopManagementLoaded?: boolean;
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
    publicationSystem?: number;
    curriculumSystem?: number;
    consignmentMarket?: number;
    exhibitionSystem?: number;
    darkroomCalibration?: number;
    challengeSystem?: number;
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

export interface ReviewLeaderboardEntry {
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

export type PublicationStep = 'select' | 'crop' | 'annotate' | 'layout' | 'cover' | 'export';

export interface PublicationCrop {
  x: number;
  y: number;
  width: number;
  height: number;
  aspectRatio: 'free' | '3:2' | '4:3' | '1:1' | '16:9';
}

export interface PublicationPhoto {
  photoId: string;
  crop: PublicationCrop;
  caption: string;
  pageSlot: number;
}

export type PageLayoutTemplate = 'full' | 'half_h' | 'half_v' | 'thirds' | 'quarter' | 'feature_plus_strip';

export interface PublicationPage {
  id: string;
  layout: PageLayoutTemplate;
  photoIds: string[];
}

export type CoverStyle = 'minimal' | 'classic' | 'artistic' | 'darkroom' | 'magazine';

export interface PublicationCover {
  style: CoverStyle;
  title: string;
  subtitle: string;
  coverPhotoId: string | null;
  backgroundColor: string;
  showDate: boolean;
}

export interface Publication {
  id: string;
  title: string;
  authorName: string;
  photos: PublicationPhoto[];
  pages: PublicationPage[];
  cover: PublicationCover;
  step: PublicationStep;
  createdAt: number;
  updatedAt: number;
  exportedAt?: number;
}

export type PublicationExportFormat = 'json' | 'html';

export interface PublicationState {
  publications: Publication[];
  activePublicationId: string | null;
  activeStep: PublicationStep;
  selectFilter: PublicationSelectFilter;
}

export interface PublicationSelectFilter {
  subjectIds: string[];
  grades: string[];
  minScore: number;
  maxScore: number;
  sortBy: 'date_desc' | 'date_asc' | 'score_desc' | 'score_asc';
}

export type SceneTemplateCategory = 'portrait' | 'landscape' | 'street' | 'still_life' | 'night' | 'custom' | 'architecture' | 'documentary' | 'abstract';

export interface ScenePalette {
  sky: [number, number, number];
  mid: [number, number, number];
  dark: [number, number, number];
  accent: [number, number, number];
  warm: [number, number, number];
  primary: string;
  secondary: string;
  neutral: string;
  background: string;
}

export interface SceneLayer {
  id: string;
  type: 'background' | 'sky' | 'ground' | 'object' | 'character' | 'light_source' | 'atmosphere';
  name: string;
  visible: boolean;
  config: Record<string, number | string | boolean>;
}

export interface ScoreRule {
  id: string;
  name: string;
  category: 'exposure' | 'contrast' | 'color' | 'detail' | 'key_area' | 'style';
  weight: number;
  enabled: boolean;
  idealValue?: number;
  tolerance: number;
  description: string;
  customFormula?: string;
  critical?: boolean;
  param?: string;
  targetValue?: number;
}

export interface ScoreRuleSet {
  id: string;
  name: string;
  description: string;
  rules: ScoreRule[];
  exposureWeight: number;
  contrastWeight: number;
  colorWeight: number;
  detailWeight: number;
  styleMatchBonus: number;
  filmMatchBonus: number;
  gradeThresholds: {
    S: number;
    A: number;
    B: number;
    C: number;
  };
  isDefault?: boolean;
  isBuiltin?: boolean;
  toleranceMultiplier?: number;
  minPassScore?: number;
  criticalFailurePenalty?: number;
  tags?: string[];
  createdAt: number;
  updatedAt: number;
}

export interface SceneTemplate {
  id: string;
  name: string;
  description: string;
  category: SceneTemplateCategory;
  customCategory?: string;
  seed: number;
  baseBrightness: number;
  idealExposure: number;
  idealContrast: number;
  idealSaturation: number;
  targetStyle: TargetStyle;
  difficulty: DifficultyLevel;
  scoreMultiplier: number;
  tags: string[];
  recommendedFilms: string[];
  palette: ScenePalette;
  layers: SceneLayer[];
  keyAreas: KeyArea[];
  scoringRuleSetId: string;
  previewParams: DevParams;
  isBuiltin: boolean;
  isPublished: boolean;
  version: number;
  createdAt: number;
  updatedAt: number;
  author?: string;
}

export type WorkshopTab = 'templates' | 'editor' | 'scoring' | 'preview';
export type EditorMode = 'basic' | 'advanced' | 'visual';

export interface KeyAreaDraft {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  importance: number;
  tolerance: number;
  idealBrightness: number;
  color: string;
}

export interface SubjectWorkshopState {
  activeTab: WorkshopTab;
  editorMode: EditorMode;
  selectedTemplateId: string | null;
  draftTemplate: SceneTemplate | null;
  draftKeyAreas: KeyAreaDraft[];
  selectedKeyAreaId: string | null;
  templates: SceneTemplate[];
  ruleSets: ScoreRuleSet[];
  selectedRuleSetId: string | null;
  previewParams: DevParams;
  showPreviewOverlay: boolean;
  showKeyAreasInPreview: boolean;
  undoStack: SceneTemplate[];
  redoStack: SceneTemplate[];
  filterCategory: SceneTemplateCategory | 'all';
  searchKeyword: string;
  sortBy: 'name_asc' | 'name_desc' | 'date_desc' | 'date_asc' | 'difficulty_asc' | 'difficulty_desc';
}

export type CurriculumChapterCategory = 'fundamentals' | 'exposure' | 'development' | 'advanced' | 'mastery';

export type CurriculumStepType = 'reading' | 'interactive' | 'practice' | 'quiz' | 'experiment';

export type QuizQuestionType = 'single_choice' | 'multiple_choice' | 'true_false' | 'fill_blank' | 'param_adjust';

export interface QuizOption {
  id: string;
  text: string;
  isCorrect?: boolean;
  feedback?: string;
}

export interface QuizQuestion {
  id: string;
  type: QuizQuestionType;
  question: string;
  explanation?: string;
  options?: QuizOption[];
  correctAnswer?: string | string[];
  difficulty: DifficultyLevel;
  points: number;
  relatedParams?: (keyof DevParams)[];
  subjectHint?: string;
}

export interface PracticeExercise {
  id: string;
  title: string;
  description: string;
  type: 'param_match' | 'score_challenge' | 'style_reproduce' | 'free_practice';
  subjectId?: string;
  filmId?: string;
  targetScore?: number;
  targetGrade?: 'S' | 'A' | 'B' | 'C' | 'D';
  targetStyle?: TargetStyle;
  requiredParams?: Partial<DevParams>;
  paramTolerance?: Partial<Record<keyof DevParams, number>>;
  maxAttempts?: number;
  timeLimitSeconds?: number;
  hints: string[];
  bonusConditions?: {
    description: string;
    condition: 'perfect_exposure' | 'high_contrast' | 'low_grain' | 'specific_film' | 'first_try';
    bonusPoints: number;
  }[];
}

export interface CurriculumLessonStep {
  id: string;
  order: number;
  type: CurriculumStepType;
  title: string;
  content: string;
  estimatedMinutes: number;
  highlightArea?: string;
  interactiveAction?: TutorialUnlockCondition;
  quiz?: QuizQuestion;
  exercise?: PracticeExercise;
  keyPoints: string[];
  commonMistakes?: string[];
}

export interface CurriculumChapter {
  id: string;
  category: CurriculumChapterCategory;
  order: number;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  color: string;
  difficulty: DifficultyLevel;
  estimatedTotalMinutes: number;
  prerequisites: string[];
  steps: CurriculumLessonStep[];
  chapterExam?: {
    title: string;
    passingScore: number;
    questions: QuizQuestion[];
  };
  unlockReward?: {
    type: 'unlock_subject' | 'unlock_film' | 'unlock_recipe' | 'badge' | 'title';
    value: string;
    label: string;
  };
}

export type StepProgressStatus = 'locked' | 'available' | 'in_progress' | 'completed' | 'failed';

export interface StepProgress {
  stepId: string;
  status: StepProgressStatus;
  unlockedAt?: number;
  startedAt?: number;
  completedAt?: number;
  timeSpentSeconds: number;
  attempts: number;
  bestScore?: number;
  lastScore?: number;
  mistakes: string[];
  feedbackHistory: CurriculumFeedback[];
}

export interface ChapterProgress {
  chapterId: string;
  status: 'locked' | 'in_progress' | 'completed' | 'exam_failed';
  unlockedAt?: number;
  startedAt?: number;
  completedAt?: number;
  currentStepIndex: number;
  stepProgress: Record<string, StepProgress>;
  examScore?: number;
  examAttempts: number;
  totalTimeSpentSeconds: number;
  earnedPoints: number;
  rewardsClaimed: boolean;
}

export type CurriculumFeedbackSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface CurriculumFeedback {
  id: string;
  timestamp: number;
  severity: CurriculumFeedbackSeverity;
  category: 'param_error' | 'timing_error' | 'technique_error' | 'knowledge_gap' | 'encouragement';
  title: string;
  message: string;
  suggestion: string;
  relatedParam?: keyof DevParams;
  relatedStepId?: string;
  exampleParams?: Partial<DevParams>;
  knowledgeReference?: string;
}

export interface LearningMilestone {
  id: string;
  title: string;
  description: string;
  icon: string;
  achievedAt?: number;
  criteria: {
    type: 'chapters_completed' | 'total_points' | 'perfect_steps' | 'streak_days' | 'avg_score';
    value: number;
  };
  reward?: {
    type: 'badge' | 'title' | 'unlock';
    value: string;
  };
}

export interface WeaknessAnalysis {
  category: string;
  categoryLabel: string;
  errorCount: number;
  totalAttempts: number;
  errorRate: number;
  recentTrend: 'improving' | 'worsening' | 'stable';
  relatedChapters: string[];
  suggestedReview: string[];
}

export interface LearningProfile {
  learnerId: string;
  enrolledAt: number;
  lastActiveAt: number;
  totalStudyTimeSeconds: number;
  totalPointsEarned: number;
  currentChapterId: string | null;
  currentStepId: string | null;
  chapterProgress: Record<string, ChapterProgress>;
  completedChapterIds: string[];
  masteredSkills: string[];
  weaknesses: WeaknessAnalysis[];
  milestones: LearningMilestone[];
  earnedBadges: string[];
  earnedTitles: string[];
  streakDays: number;
  lastStudyDate?: string;
  totalAttempts: number;
  successfulAttempts: number;
  averageScore: number;
  bestScore: number;
  feedbackHistory: CurriculumFeedback[];
  learningPath: string[];
  notes: {
    chapterId: string;
    stepId?: string;
    content: string;
    createdAt: number;
  }[];
}

export interface CurriculumSystemState {
  chapters: CurriculumChapter[];
  profile: LearningProfile;
  activeChapterId: string | null;
  activeStepId: string | null;
  activeFeedback: CurriculumFeedback | null;
  showCurriculumPanel: boolean;
  practiceMode: boolean;
  currentExamAnswers: Record<string, string | string[]>;
  lastGeneratedFeedback: CurriculumFeedback | null;
}

export type ConsignmentWorkStatus = 'draft' | 'listed' | 'reserved' | 'sold' | 'archived' | 'removed';

export type TradeOrderStatus = 'pending' | 'confirmed' | 'paid' | 'delivered' | 'completed' | 'cancelled' | 'refunded';

export type CertificateType = 'ownership' | 'authenticity' | 'limited_edition' | 'artist_proof';

export interface ArtistInfo {
  id: string;
  name: string;
  avatar?: string;
  bio: string;
  contact?: string;
  style?: string;
  totalWorks: number;
  totalSales: number;
  rating: number;
  joinedAt: number;
  verified: boolean;
  socialLinks?: {
    website?: string;
    instagram?: string;
    weibo?: string;
  };
}

export interface ConsignmentWork {
  id: string;
  workNumber: string;
  photoId: string;
  artistId: string;
  artistName: string;
  title: string;
  description: string;
  edition: number;
  totalEditions: number;
  price: number;
  currency: string;
  status: ConsignmentWorkStatus;
  category?: string;
  tags: string[];
  listedAt?: number;
  soldAt?: number;
  buyerId?: string;
  reservedBy?: string;
  reserveExpiresAt?: number;
  royalties?: number;
  frameOption?: boolean;
  framePrice?: number;
  shippingPrice?: number;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface BuyerInfo {
  id: string;
  name: string;
  avatar?: string;
  contact?: string;
  address?: string;
  totalPurchases: number;
  totalSpent: number;
  joinedAt: number;
  favoriteWorkIds: string[];
}

export interface TradeOrder {
  id: string;
  orderNumber: string;
  workId: string;
  workTitle: string;
  workNumber: string;
  sellerId: string;
  sellerName: string;
  buyerId: string;
  buyerName: string;
  price: number;
  framePrice: number;
  shippingPrice: number;
  totalAmount: number;
  currency: string;
  status: TradeOrderStatus;
  includeFrame: boolean;
  shippingAddress?: string;
  specialInstructions?: string;
  createdAt: number;
  updatedAt: number;
  paidAt?: number;
  deliveredAt?: number;
  completedAt?: number;
  cancelledAt?: number;
  cancelReason?: string;
  certificateId?: string;
}

export interface DigitalCertificate {
  id: string;
  certificateNumber: string;
  type: CertificateType;
  workId: string;
  workTitle: string;
  workNumber: string;
  artistId: string;
  artistName: string;
  ownerId: string;
  ownerName: string;
  editionNumber: number;
  totalEditions: number;
  issueDate: number;
  expiryDate?: number;
  verificationCode: string;
  verified: boolean;
  previousOwners?: {
    ownerId: string;
    ownerName: string;
    transferredAt: number;
  }[];
  notes?: string;
  imageDataUrl?: string;
  signature?: string;
}

export type ConsignmentMarketTab = 'market' | 'my_works' | 'my_orders' | 'certificates' | 'artist_profile';

export interface ConsignmentMarketFilter {
  searchKeyword: string;
  artistIds: string[];
  categories: string[];
  priceMin?: number;
  priceMax?: number;
  statuses: ConsignmentWorkStatus[];
  sortBy: 'price_asc' | 'price_desc' | 'date_desc' | 'date_asc' | 'popular';
  onlyAvailable: boolean;
  onlyVerifiedArtists: boolean;
}

export interface ConsignmentMarketStatistics {
  totalListedWorks: number;
  totalSoldWorks: number;
  totalSalesAmount: number;
  myListedWorks: number;
  mySoldWorks: number;
  myTotalEarnings: number;
  myPendingOrders: number;
  activeBuyers: number;
  averagePrice: number;
  topSellingArtists: { artistId: string; artistName: string; sales: number; revenue: number }[];
}

export interface ConsignmentMarketState {
  works: ConsignmentWork[];
  artists: ArtistInfo[];
  buyers: BuyerInfo[];
  orders: TradeOrder[];
  certificates: DigitalCertificate[];
  activeTab: ConsignmentMarketTab;
  filter: ConsignmentMarketFilter;
  selectedWorkId: string | null;
  selectedOrderId: string | null;
  selectedCertificateId: string | null;
  currentUserId: string;
  currentUserType: 'artist' | 'buyer' | 'both';
  showWorkDetail: boolean;
  showOrderDetail: boolean;
  showCertificateDetail: boolean;
  showCreateWork: boolean;
  editingWorkId: string | null;
}

export type ExhibitionStatus = 'draft' | 'planning' | 'published' | 'archived';

export type WallLayoutType = 'grid' | 'masonry' | 'salon' | 'linear' | 'feature';

export interface ExhibitionWorkPlacement {
  workId: string;
  photoId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  frameStyle: 'minimal' | 'classic' | 'vintage' | 'float' | 'none';
  frameColor: string;
  matWidth: number;
  matColor: string;
  spotLightIntensity: number;
  spotLightColor: string;
  caption?: string;
}

export interface ExhibitionWall {
  id: string;
  name: string;
  description?: string;
  width: number;
  height: number;
  backgroundColor: string;
  textureType: 'smooth' | 'canvas' | 'brick' | 'concrete' | 'wood';
  layoutType: WallLayoutType;
  placements: ExhibitionWorkPlacement[];
  order: number;
}

export interface ExhibitionTheme {
  id: string;
  name: string;
  colorPalette: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
    wall: string;
    floor: string;
  };
  fontStyle: 'serif' | 'sans' | 'display' | 'mono';
  lightingScheme: 'natural' | 'spotlight' | 'dramatic' | 'warm' | 'cool';
  ambientSound?: string;
}

export interface ExhibitionRouteStop {
  wallId: string;
  placementId?: string;
  stopIndex: number;
  narration?: string;
  dwellTime: number;
  focusZoom: number;
  panDirection?: 'left' | 'right' | 'up' | 'down';
}

export interface VisitorFeedback {
  id: string;
  visitorName: string;
  visitorAvatar?: string;
  visitorType: 'casual' | 'enthusiast' | 'critic' | 'collector' | 'student';
  overallRating: number;
  curationRating: number;
  varietyRating: number;
  flowRating: number;
  lightingRating: number;
  favoriteWorkId?: string;
  comments: string;
  emotionalResponse?: 'inspired' | 'moved' | 'curious' | 'peaceful' | 'energized' | 'confused';
  tags: string[];
  timestamp: number;
  visitDuration: number;
  worksViewed: number;
}

export interface ExhibitionWorkGroup {
  id: string;
  name: string;
  description?: string;
  colorTag: string;
  photoIds: string[];
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export interface ExhibitionStatistics {
  totalVisits: number;
  avgDuration: number;
  avgOverallRating: number;
  avgCurationRating: number;
  avgVarietyRating: number;
  avgFlowRating: number;
  avgLightingRating: number;
  topRatedWorks: { photoId: string; rating: number; mentions: number }[];
  mostViewedWorks: { photoId: string; views: number }[];
  commonEmotions: { emotion: string; count: number }[];
  visitorTypeDistribution: { type: string; count: number }[];
  feedbackCount: number;
}

export type ExhibitionCuratorTab = 'groups' | 'themes' | 'walls' | 'route' | 'feedback' | 'statistics';

export interface ExhibitionState {
  exhibitions: Exhibition[];
  activeExhibitionId: string | null;
  activeTab: ExhibitionCuratorTab;
  selectedGroupId: string | null;
  selectedWallId: string | null;
  selectedPlacementId: string | null;
  isEditingPlacement: boolean;
  previewMode: 'edit' | 'walkthrough' | 'immersive';
  routeAnimationSpeed: number;
  showWorkCaptions: boolean;
  showSpotlights: boolean;
}

export interface Exhibition {
  id: string;
  title: string;
  subtitle: string;
  curatorName: string;
  description: string;
  artistStatement?: string;
  exhibitionStatement?: string;
  coverPhotoId?: string;
  startDate?: number;
  endDate?: number;
  venueName?: string;
  status: ExhibitionStatus;
  groups: ExhibitionWorkGroup[];
  walls: ExhibitionWall[];
  themeId: string;
  themes: ExhibitionTheme[];
  route: ExhibitionRouteStop[];
  feedbacks: VisitorFeedback[];
  statistics: ExhibitionStatistics;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  publishedAt?: number;
  totalViews: number;
}

export type EnlargerLightSource = 'tungsten' | 'led' | 'cold_cathode' | 'condenser' | 'diffusion';
export type EnlargerStatus = 'idle' | 'warming' | 'ready' | 'calibrating';
export type TimerMode = 'manual' | 'auto_advance' | 'programmed';
export type TempControllerStatus = 'off' | 'heating' | 'cooling' | 'stable';
export type CalibrationStatus = 'uncalibrated' | 'calibrating' | 'calibrated' | 'drift_detected';
export type CalibrationTab = 'enlarger' | 'temperature' | 'timer' | 'deviation';

export interface EnlargerProfile {
  id: string;
  name: string;
  lightSource: EnlargerLightSource;
  lensFocalLength: number;
  baseExposure: number;
  colorFiltration: {
    cyan: number;
    magenta: number;
    yellow: number;
  };
  focusOffset: number;
  columnHeight: number;
  status: EnlargerStatus;
  warmUpSeconds: number;
  lampHours: number;
  notes?: string;
}

export interface EnlargerCalibrationRecord {
  id: string;
  enlargerId: string;
  timestamp: number;
  measuredBaseExposure: number;
  measuredFiltration: { cyan: number; magenta: number; yellow: number };
  focusCalibration: number;
  lampOutputPercent: number;
  uniformityScore: number;
  status: CalibrationStatus;
  adjustments: {
    field: string;
    before: number;
    after: number;
  }[];
  notes?: string;
}

export interface TempZone {
  id: string;
  name: string;
  targetTemp: number;
  actualTemp: number;
  tolerance: number;
  status: TempControllerStatus;
  sensorId: string;
  heaterWattage: number;
}

export interface TempCalibrationRecord {
  id: string;
  timestamp: number;
  zones: {
    zoneId: string;
    measuredTemp: number;
    targetTemp: number;
    deviation: number;
    correction: number;
  }[];
  ambientTemp: number;
  status: CalibrationStatus;
  notes?: string;
}

export interface TimerProgram {
  id: string;
  name: string;
  steps: TimerStep[];
  totalDuration: number;
  loopCount: number;
}

export interface TimerStep {
  id: string;
  label: string;
  duration: number;
  action: 'develop' | 'stop' | 'fix' | 'wash' | 'agitate' | 'wait' | 'pour' | 'drain';
  agitationPattern?: 'continuous' | 'intermittent_10s' | 'intermittent_30s' | 'first_10s_then_rest' | 'none';
}

export interface TimerCalibrationRecord {
  id: string;
  timestamp: number;
  measuredDriftMs: number;
  stepsChecked: number;
  stepsPassed: number;
  worstDriftMs: number;
  status: CalibrationStatus;
  notes?: string;
}

export interface DeviationRecord {
  id: string;
  photoId: string;
  timestamp: number;
  enlargerId: string;
  tempZoneId: string;
  timerProgramId: string;
  enlargerDeviations: {
    param: string;
    label: string;
    expected: number;
    actual: number;
    deviation: number;
    impact: number;
  }[];
  tempDeviations: {
    zoneName: string;
    expected: number;
    actual: number;
    deviation: number;
    impact: number;
  }[];
  timerDeviations: {
    stepLabel: string;
    expectedDuration: number;
    actualDuration: number;
    deviation: number;
    impact: number;
  }[];
  totalScoreImpact: number;
  rootCause: string;
  suggestion: string;
}

export interface CalibrationStatistics {
  totalCalibrations: number;
  avgEnlargerDrift: number;
  avgTempDeviation: number;
  avgTimerDriftMs: number;
  lastCalibrationAt: number | null;
  calibrationHealthScore: number;
  deviationTrend: 'improving' | 'stable' | 'worsening';
  recentDeviationImpact: number;
}

export interface DarkroomCalibrationState {
  enlargers: EnlargerProfile[];
  tempZones: TempZone[];
  timerPrograms: TimerProgram[];
  enlargerCalibrations: EnlargerCalibrationRecord[];
  tempCalibrations: TempCalibrationRecord[];
  timerCalibrations: TimerCalibrationRecord[];
  deviations: DeviationRecord[];
  activeTab: CalibrationTab;
  selectedEnlargerId: string | null;
  selectedTempZoneId: string | null;
  selectedTimerProgramId: string | null;
  statistics: CalibrationStatistics;
}

export type ChallengeStatus = 'upcoming' | 'registration' | 'developing' | 'reviewing' | 'completed' | 'archived';
export type ChallengeTab = 'browse' | 'registration' | 'develop' | 'review' | 'leaderboard';
export type TeamRole = 'leader' | 'member' | 'substitute';
export type ReviewResult = 'pending' | 'accepted' | 'rejected' | 'disputed';

export interface ChallengeTheme {
  id: string;
  name: string;
  description: string;
  subjectId: string;
  allowedFilmIds: string[];
  requireFilmColor?: 'bw' | 'color';
  difficulty: DifficultyLevel;
  timeLimitMinutes: number;
  paramRestrictions?: Partial<Record<keyof DevParams, { min: number; max: number }>>;
}

export interface ChallengeTeam {
  id: string;
  challengeId: string;
  name: string;
  slogan?: string;
  leaderId: string;
  leaderName: string;
  members: {
    userId: string;
    userName: string;
    role: TeamRole;
    joinedAt: number;
  }[];
  maxMembers: number;
  registeredAt: number;
  isLocked: boolean;
  avatarColor: string;
}

export interface ChallengeRegistration {
  id: string;
  challengeId: string;
  userId: string;
  userName: string;
  teamId: string | null;
  registeredAt: number;
  status: 'registered' | 'cancelled' | 'disqualified';
}

export interface ChallengeSubmission {
  id: string;
  challengeId: string;
  userId: string;
  userName: string;
  teamId: string | null;
  photoId: string;
  photoDataUrl: string;
  subjectId: string;
  filmId: string;
  params: DevParams;
  score: number;
  details: ScoreDetail;
  submittedAt: number;
  developDurationMs: number;
  reviewStatus: ReviewResult;
  reviewScore?: number;
  reviewComment?: string;
  reviewedAt?: number;
  finalScore?: number;
  rank?: number;
  reviews?: ChallengeReview[];
}

export interface ChallengeDefinition {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  seasonId: string;
  themes: ChallengeTheme[];
  currentThemeIndex: number;
  registrationStart: number;
  registrationEnd: number;
  developStart: number;
  developEnd: number;
  reviewStart: number;
  reviewEnd: number;
  maxParticipants: number;
  maxTeamSize: number;
  allowSolo: boolean;
  allowTeams: boolean;
  minReviewsPerSubmission: number;
  status: ChallengeStatus;
  prizes: {
    rank: number;
    title: string;
    description: string;
    points: number;
    badge?: string;
    titleReward?: string;
  }[];
  participationPoints: number;
  rules: string[];
}

export interface ChallengeSeason {
  id: string;
  name: string;
  description: string;
  startDate: number;
  endDate: number;
  challengeIds: string[];
  status: 'upcoming' | 'active' | 'completed';
  totalPoints: Record<string, number>;
  badges: {
    userId: string;
    badge: string;
    title: string;
    earnedAt: number;
  }[];
}

export interface ChallengeLeaderboardEntry {
  rank: number;
  userId: string;
  userName: string;
  teamId: string | null;
  teamName: string | null;
  totalScore: number;
  bestScore: number;
  avgScore: number;
  submissionCount: number;
  challengeCount: number;
  badges: string[];
}

export interface ChallengeFilter {
  statuses: ChallengeStatus[];
  searchKeyword: string;
  sortBy: 'start_date_desc' | 'start_date_asc' | 'participants_desc' | 'prize_desc';
  seasonId: string | null;
}

export interface ChallengeTeamLeaderboardEntry {
  rank: number;
  teamId: string;
  teamName: string;
  teamAvatarColor: string;
  members: { userId: string; userName: string }[];
  totalScore: number;
  bestScore: number;
  avgScore: number;
  submissionCount: number;
  challengeCount: number;
  badges: string[];
}

export interface ChallengeAwardResult {
  challengeId: string;
  challengeTitle: string;
  winners: {
    rank: number;
    userId: string;
    userName: string;
    teamId: string | null;
    teamName: string | null;
    score: number;
    prize: {
      rank: number;
      title: string;
      description: string;
      points: number;
      badge?: string;
      titleReward?: string;
    };
  }[];
  participantsAward: {
    userId: string;
    userName: string;
    points: number;
  }[];
  finalizedAt: number;
}

export interface ChallengeState {
  challenges: ChallengeDefinition[];
  seasons: ChallengeSeason[];
  teams: ChallengeTeam[];
  registrations: ChallengeRegistration[];
  submissions: ChallengeSubmission[];
  invites: TeamInvite[];
  awards: ChallengeAwardResult[];
  activeTab: ChallengeTab;
  selectedChallengeId: string | null;
  selectedTeamId: string | null;
  selectedSubmissionId: string | null;
  currentUserId: string;
  currentUserName: string;
  filter: ChallengeFilter;
  leaderboardFilter: {
    seasonId: string | null;
    sortBy: 'total_score' | 'best_score' | 'avg_score' | 'submissions';
    viewMode: 'individual' | 'team';
  };
  developTimer: {
    challengeId: string | null;
    startTime: number | null;
    timeLimitMs: number;
    remainingMs: number;
    isRunning: boolean;
  };
}

export interface ChallengeParticipationResult {
  success: boolean;
  message: string;
  teamId?: string;
  registrationId?: string;
}

export interface TeamInvite {
  id: string;
  teamId: string;
  challengeId: string;
  inviterId: string;
  inviterName: string;
  inviteeId: string;
  inviteeName: string;
  sentAt: number;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
}

export interface ChallengeReview {
  id: string;
  submissionId: string;
  reviewerId: string;
  reviewerName: string;
  score: number;
  comment: string;
  reviewedAt: number;
  dimensions: {
    dimensionId: ReviewDimensionId;
    score: number;
    comment: string;
  }[];
}

export type FilmGuideTab = 'overview' | 'attributes' | 'subjects' | 'samples' | 'develop' | 'practice';

export interface FilmAttributeProfile {
  contrast: { value: number; label: string; description: string };
  saturation: { value: number; label: string; description: string };
  grain: { value: number; label: string; description: string };
  iso: { value: number; label: string; description: string };
  latitude: { value: number; label: string; description: string };
  sharpness: { value: number; label: string; description: string };
}

export interface FilmSubjectSuitability {
  subjectId: string;
  subjectName: string;
  sceneType: string;
  matchScore: number;
  reasons: string[];
}

export interface FilmDevSuggestion {
  processType: FilmProcessType;
  developer: string;
  temperature: number;
  timeMinutes: number;
  dilution: string;
  agitation: string;
  notes: string;
  tips: string[];
}

export interface FilmPracticeEntry {
  id: string;
  title: string;
  description: string;
  subjectId: string;
  targetStyle: TargetStyle;
  targetScore: number;
  tips: string[];
  difficulty: DifficultyLevel;
}

export interface FilmKnowledgeEntry {
  filmId: string;
  filmName: string;
  summary: string;
  characteristics: string[];
  attributeProfile: FilmAttributeProfile;
  subjectSuitabilities: FilmSubjectSuitability[];
  devSuggestions: FilmDevSuggestion[];
  practiceEntries: FilmPracticeEntry[];
  tips: string[];
  pros: string[];
  cons: string[];
}

export interface FilmGuideState {
  activeTab: FilmGuideTab;
  selectedFilmId: string | null;
  searchKeyword: string;
  filterColor: 'all' | 'bw' | 'color';
  filterSceneType: string;
  viewedFilmIds: string[];
}

export type EmployeeRole = 'developer' | 'assistant' | 'receptionist' | 'manager';
export type EmployeeStatus = 'idle' | 'working' | 'rest' | 'training';

export interface EmployeeSkill {
  id: string;
  name: string;
  level: number;
  maxLevel: number;
  experience: number;
  description: string;
  effect: {
      type: 'score_bonus' | 'speed_bonus' | 'cost_reduction' | 'reputation_bonus' | 'capacity_bonus' | 'quality_bonus';
      value: number;
    };
}

export interface Employee {
  id: string;
  name: string;
  avatar: string;
  role: EmployeeRole;
  status: EmployeeStatus;
  level: number;
  experience: number;
  skills: EmployeeSkill[];
  salary: number;
  hireDate: number;
  satisfaction: number;
  trainingProgress: number;
  assignedOrderIds: string[];
  skillBonuses: Record<string, number>;
}

export interface SupplyItem {
  id: string;
  name: string;
  type: 'film' | 'chemical' | 'paper' | 'equipment' | 'other';
  quantity: number;
  unit: string;
  unitCost: number;
  minStock: number;
  currentStock: number;
  expireDate?: number;
  supplier: string;
}

export type SupplyUsageType = 'consume' | 'purchase' | 'scrap' | 'restock' | 'use';

export interface SupplyUsageRecord {
  id: string;
  itemId?: string;
  itemName?: string;
  supplyId?: string;
  supplyName?: string;
  quantity: number;
  orderId?: string;
  relatedOrderId?: string;
  photoId?: string;
  type: SupplyUsageType;
  cost: number;
  timestamp: number;
  notes?: string;
  operator?: string;
}

export interface Facility {
  id: string;
  name: string;
  type: 'enlarger' | 'processor' | 'dryer' | 'temperature_control' | 'display' | 'storage' | 'lounge';
  level: number;
  maxLevel: number;
  description: string;
  baseCost: number;
  upgradeCost: number;
  effect: {
    type: 'score_bonus' | 'speed_bonus' | 'capacity_bonus' | 'reputation_bonus' | 'cost_reduction' | 'quality_bonus';
    value: number;
  };
  condition: number;
  maintenanceCost: number;
  isUnlocked: boolean;
  icon: string;
}

export type FinanceCategory = 'order' | 'salary' | 'supply' | 'upgrade' | 'maintenance' | 'marketing' | 'training' | 'other';

export interface FinanceRecord {
  id: string;
  type: 'income' | 'expense';
  category: FinanceCategory;
  amount: number;
  description: string;
  relatedId?: string;
  relatedEmployeeId?: string;
  relatedSupplyId?: string;
  relatedFacilityId?: string;
  relatedOrderId?: string;
  timestamp: number;
}

export interface ReputationReview {
  id: string;
  customerName: string;
  rating: number;
  comment: string;
  orderId?: string;
  photoId?: string;
  timestamp: number;
  tags: string[];
  qualityScore: number;
}

export interface ShopStatistics {
  totalOrders: number;
  completedOrders: number;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  avgCustomerRating: number;
  avgTurnaroundTime: number;
  repeatCustomerRate: number;
}

export type ShopManagementTab = 'overview' | 'orders' | 'employees' | 'supplies' | 'facilities' | 'finance' | 'reputation';

export interface ShopManagementState {
  isOpen: boolean;
  activeTab: ShopManagementTab;
  shopName: string;
  shopLevel: number;
  shopExperience: number;
  shopReputation: number;
  maxReputation: number;
  dailyStartTime: number;
  dayNumber: number;
  isPaused: boolean;
  employees: Employee[];
  supplies: SupplyItem[];
  supplyRecords: SupplyUsageRecord[];
  facilities: Facility[];
  financeRecords: FinanceRecord[];
  reputationReviews: ReputationReview[];
  finances: {
    cash: number;
    bank: number;
  };
  statistics: ShopStatistics;
  gameSpeed: number;
  selectedEmployeeId: string | null;
  selectedFacilityId: string | null;
  selectedSupplyId: string | null;
  autoManageOrders: ShopOrder[];
  pendingOrders: string[];
  marketingBudget: number;
  priceMultiplier: number;
  lastOrderGeneratedAt: number;
}

export type ShopOrderStatus = 'pending' | 'in_progress' | 'completed';
export type ShopOrderPriority = 'low' | 'normal' | 'urgent';
export type ShopOrderType = 'develop' | 'scan' | 'print' | 'develop_scan' | 'develop_print' | 'full_service' | 'combo';

export interface UsedSupply {
  supplyId: string;
  supplyName: string;
  quantity: number;
  cost: number;
}

export interface ShopOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  orderType: ShopOrderType;
  orderTypeLabel: string;
  filmType: string;
  quantity: number;
  priority: ShopOrderPriority;
  status: ShopOrderStatus;
  totalPrice: number;
  basePrice: number;
  finalPrice: number;
  cost: number;
  profit: number;
  supplyCost: number;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  estimatedDuration: number;
  assignedEmployeeId: string | null;
  employeeId?: string;
  facilityIds: string[];
  notes: string;
  qualityTarget: number;
  finalQuality?: number;
  usedSupplies: UsedSupply[];
  customerRating?: number;
  customerComment?: string;
}

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
  publicationSystem: PublicationState;
  subjectWorkshop: SubjectWorkshopState;
  curriculumSystem: CurriculumSystemState;
  consignmentMarket: ConsignmentMarketState;
  exhibitionSystem: ExhibitionState;
  darkroomCalibration: DarkroomCalibrationState;
  challengeSystem: ChallengeState;
  filmGuide: FilmGuideState;
  shopManagement: ShopManagementState;
}


