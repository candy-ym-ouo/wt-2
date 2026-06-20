import { writable, derived } from 'svelte/store';
import type { GameState, ProcessedPhoto, DevParams, GamePhase, ParamPreset, PresetHistory, TutorialState, TutorialStepState, TutorialUnlockCondition, StageState, DevelopStage, StageDuration, StorageStatus, StorageWarning, FavoriteInfo, PhotoCollection, CollectionGroup, CollectionStats, AlbumViewMode, AttemptRecord, ExtendedStatistics, SubjectPreferenceItem, FilmWinRateItem, ScoreSegmentItem, QualityFluctuationItem, AchievementState, AchievementProgress, AchievementCondition, AchievementLine, DarkroomOrder, OrderFilter, OrderStatus, OrderPriority, OrderRequirements, FilmMatch, ScheduleSlot, OrderStatistics, CustomerInfo, DeveloperRecipe, ChemicalSolution, Chemical, FilmLabState, FilmLabTab, RecipeVersion, TrialResult, RecipeCompareResult, FilmProcessType, SolutionType, SolutionComponent, QuestSystemState, QuestAttemptResult, QuestReward, FilmRestrictionResult, QuestStatus, StageStatus, ReviewSystemState, ReviewSubmission, Review, LeaderboardFilter, InventorySystemState, StockInSource, StockConsumeType, StockScrapReason, InventoryFilter, PublicationState, Publication, PublicationStep, PublicationPhoto, PublicationCrop, PublicationCover, PublicationPage, PageLayoutTemplate, CoverStyle, PublicationSelectFilter, SceneTemplate, ScoreRuleSet, KeyAreaDraft, WorkshopTab, EditorMode, SceneTemplateCategory, SubjectWorkshopState, ScoreRule, CurriculumSystemState, CurriculumFeedback, QuizQuestion, ChapterProgress, ConsignmentMarketState, ConsignmentWork, TradeOrder, DigitalCertificate, ConsignmentMarketTab, ConsignmentMarketFilter, TradeOrderStatus, ExhibitionState, Exhibition, ExhibitionWorkGroup, ExhibitionWall, ExhibitionWorkPlacement, ExhibitionTheme, ExhibitionRouteStop, VisitorFeedback, ExhibitionCuratorTab, ExhibitionStatus, DarkroomCalibrationState, EnlargerProfile, TempZone, TimerProgram, TimerStep, EnlargerCalibrationRecord, TempCalibrationRecord, TimerCalibrationRecord, DeviationRecord, CalibrationTab, CalibrationStatistics, ChallengeState, ChallengeDefinition, ChallengeTab, ChallengeFilter, ChallengeTeam, ChallengeSubmission, ChallengeSeason, ChallengeParticipationResult, ChallengeReview, ReviewResult, ChallengeTheme, ChallengeStatus, ChallengeRegistration, TeamRole, ChallengeLeaderboardEntry, ChallengeTeamLeaderboardEntry, ChallengeAwardResult } from '../types/game';
import { FILM_STOCKS, DEFAULT_PARAMS, PHOTO_SUBJECTS, TUTORIAL_STEPS, DEFAULT_PRESETS, ACHIEVEMENT_DEFINITIONS, DEFAULT_CHEMICALS, DEFAULT_SOLUTIONS, DEFAULT_RECIPES, DEFAULT_WORKSHOP_STATE, createBlankTemplate } from '../data/gameData';
import { generateId } from '../utils/math';
import { createTrialResult, compareRecipes } from '../utils/recipeUtils';
import {
  loadWithFallback,
  saveWithBackup,
  enforceLimits,
  isStorageNearLimit,
  getStorageInfo,
  repairPhotos,
  repairPresets,
  repairFavorites,
  repairCollections,
  clearStorage,
  exportAllData,
  importAllData,
  MAX_PHOTOS,
  MAX_PRESETS,
  MAX_COLLECTIONS,
  MAX_ORDERS,
  loadSavedAchievements,
  saveAchievements,
  createDefaultAchievementState,
  loadSavedOrders,
  saveOrders,
  repairOrders,
  loadSavedQuestSystem,
  saveQuestSystem,
  loadSavedReviewSystem,
  saveReviewSystem,
  loadSavedInventorySystem,
  saveInventorySystem,
  loadSavedPublicationSystem,
  savePublicationSystem,
  loadSavedConsignmentMarket,
  saveConsignmentMarket,
  createInitialExhibitionState,
  loadSavedExhibitionSystem,
  saveExhibitionSystem,
  createInitialDarkroomCalibrationState,
  loadSavedDarkroomCalibration,
  saveDarkroomCalibration,
  loadSavedChallengeSystem,
  saveChallengeSystem
} from '../utils/storage';
import {
  createInitialQuestSystemState,
  evaluateQuestAttempt,
  applyQuestResult,
  claimQuestRewards,
  checkStageBonus,
  claimStageBonus,
  setActiveQuest,
  checkFilmRestrictions,
  isSubjectUnlocked,
  isFilmUnlocked,
  getUnlockedSubjects,
  getUnlockedFilms,
  getQuestCompletionStats,
  getStageCompletionStats,
  recalculateQuestStatuses,
  validateFilmRestrictions,
  getQuestStatusFromState,
  getStageStatusFromState,
  getQuestById,
  getStageById
} from '../utils/questSystem';
import {
  createInitialReviewSystemState,
  submitWork,
  generateAutomatedReview,
  addReview,
  summarizeComments,
  submitDispute,
  resolveDispute,
  generateLeaderboard,
  canSubmitToContest,
  checkPhotoMeetsContestRequirements,
  finalizeSubmission,
  updateLeaderboardRanking,
  getContestById,
  getActiveContests,
  getMySubmissions,
  getPendingReviews,
  REVIEW_DIMENSIONS,
  REVIEWERS
} from '../utils/reviewSystem';
import {
  createInitialInventorySystemState,
  stockIn,
  consumeStock,
  scrapStock,
  dismissAlert,
  dismissAllAlerts,
  getActiveAlerts,
  setWarningThresholds,
  getInventoryStatistics,
  getFilmInventoryWithAlerts,
  checkStockAvailability,
  getAllRecordsCombined,
  filterRecords,
  getFilmRecords
} from '../utils/inventorySystem';
import {
  validateTemplate,
  validateRuleSet,
  convertDraftsToKeyAreas,
  convertKeyAreasToDrafts,
  createNewKeyAreaDraft,
  cloneTemplate,
  updateTemplateField,
  normalizeKeyAreaImportance,
  getNewTemplate,
  filterAndSortTemplates
} from '../utils/subjectWorkshop';
import {
  createInitialCurriculumSystemState,
  completeStep,
  recordStepAttempt,
  checkQuizAnswer,
  calculateExamScore,
  generateParamFeedback,
  generateScoreFeedback,
  evaluatePracticeExercise,
  getChapterById,
  getStepById,
  getNextStepId,
  getPrevStepId,
  getChapterProgressStats,
  getOverallProgress,
  isChapterUnlocked,
  isStepUnlocked,
  addLearningNote
} from '../utils/curriculumSystem';
import {
  loadSavedCurriculumSystem,
  saveCurriculumSystem
} from '../utils/storage';
import {
  createInitialConsignmentMarketState,
  createConsignmentWork,
  updateConsignmentWork,
  listWork,
  removeWork,
  createTradeOrder,
  updateOrderStatus,
  verifyCertificate,
  transferCertificate,
  filterWorks,
  calculateMarketStatistics,
  getArtistById,
  getWorkById,
  getOrderById,
  getCertificateById,
  getMyWorks,
  getMyOrders,
  getMyCertificates,
  setActiveTab,
  setFilter,
  toggleFavoriteWork,
  switchCurrentUser
} from '../utils/consignmentSystem';
import {
  createInitialChallengeSystemState,
  registerForChallenge,
  createTeam,
  joinTeam,
  leaveTeam,
  lockTeam,
  getAvailableTeams,
  getUserTeam,
  isUserRegistered,
  getCurrentTheme,
  validateParamsForTheme,
  validateFilmForTheme,
  startChallengeDevelopment,
  submitChallengeWork,
  submitChallengeReview,
  finalizeSubmissionScores,
  calculateLeaderboard,
  filterChallenges,
  getChallengeStatusInfo,
  getChallengeById,
  getSeasonById,
  getActiveChallenges,
  updateChallengeStatuses,
  formatTimeRemaining,
  getTimeStatus,
  sendTeamInvite,
  acceptTeamInvite,
  declineTeamInvite,
  getPendingInvites,
  getSentInvites,
  expireOldInvites,
  advanceChallengeTheme,
  getThemeSchedule,
  autoAdvanceTheme,
  finalizeAndAwardChallenge,
  updateSeasonBadgesFromAward,
  getAwardsForChallenge,
  getUserAwards,
  calculateTeamLeaderboard,
  getSeasonTotalPoints,
  getUserBadges,
  getChallengeWinners,
  canSubmitToChallenge,
  getChallengeProgress
} from '../utils/challengeSystem';

function createInitialStageState(): StageState {
  return {
    currentStage: 'presoak',
    stageProgress: 0,
    totalProgress: 0,
    stageStartAt: 0,
    developDuration: 0,
    fixDuration: 0,
    washDuration: 0,
    developElapsed: 0,
    fixElapsed: 0,
    washElapsed: 0,
    developDeviation: 0,
    fixDeviation: 0,
    washDeviation: 0
  };
}

export function calculateIdealDurations(params: DevParams): StageDuration {
  const developBase = 4000;
  const fixBase = 2500;
  const washBase = 2000;

  const develop = developBase + params.developmentTime * 6000;
  const fix = fixBase + (1 - params.dilution) * 2000;
  const wash = washBase + params.agitation * 1500;

  return { develop, fix, wash };
}

function createInitialTutorialState(): TutorialState {
  const stepStates: TutorialStepState[] = TUTORIAL_STEPS.map((step, index) => ({
    stepId: step.id,
    unlocked: index === 0,
    activated: index === 0,
    activatedAt: index === 0 ? Date.now() : undefined,
    completed: false,
    skipped: false,
    actionsPerformed: []
  }));
  
  return {
    currentStep: 0,
    steps: stepStates,
    phase: 'intro',
    isCompleted: false,
    startedAt: Date.now(),
    totalTimeSpent: 0
  };
}

function createInitialStorageStatus(): StorageStatus {
  const info = getStorageInfo();
  return {
    warnings: [],
    photosLoaded: 0,
    presetsLoaded: 0,
    tutorialLoaded: false,
    favoritesLoaded: 0,
    collectionsLoaded: 0,
    ordersLoaded: 0,
    lastSaveSuccess: true,
    storageUsed: info.used,
    storageQuota: info.quota,
    migrationPerformed: false,
    recoveryPerformed: false,
    corruptedItems: {
      photos: 0,
      presets: 0,
      favorites: 0,
      collections: 0,
      orders: 0
    }
  };
}

function loadSavedTutorialState(): { state: TutorialState; status: Partial<StorageStatus> } {
  const result = loadWithFallback<TutorialState>('tutorial', createInitialTutorialState());
  const status: Partial<StorageStatus> = {
    tutorialLoaded: result.success
  };
  
  if (result.migrationPerformed) {
    status.migrationPerformed = true;
  }
  if (result.recovered) {
    status.recoveryPerformed = true;
  }
  
  return { state: result.data || createInitialTutorialState(), status };
}

function saveTutorialState(state: TutorialState): boolean {
  return saveWithBackup('tutorial', state, 1);
}

function checkUnlockCondition(
  condition: TutorialUnlockCondition,
  state: GameState
): boolean {
  switch (condition.type) {
    case 'auto':
      return true;
    case 'subject_selected':
      return state.currentSubject !== null;
    case 'film_selected':
      return state.currentFilm !== null;
    case 'param_adjusted':
      return state.adjustedParams.includes(condition.param);
    case 'any_param_adjusted':
      return state.adjustedParams.length > 0;
    case 'other_param_adjusted':
      return state.adjustedParams.some(p => p !== condition.excludeParam);
    case 'develop_started':
      return state.developStartedAt !== null || state.processedPhotos.length > 0;
    case 'step_completed':
      const stepState = state.tutorial.steps.find(s => s.stepId === condition.stepId);
      return stepState?.completed || stepState?.skipped || false;
    default:
      return false;
  }
}

function checkCompletionCondition(
  condition: TutorialUnlockCondition,
  state: GameState,
  stepId: number
): boolean {
  const stepState = state.tutorial.steps.find(s => s.stepId === stepId);
  const activatedAt = stepState?.activatedAt || 0;

  switch (condition.type) {
    case 'auto':
      return true;
    case 'subject_selected':
      return state.currentSubject !== null && 
             (state.subjectSelectedAt || 0) >= activatedAt;
    case 'film_selected':
      return state.currentFilm !== null && 
             (state.filmSelectedAt || 0) >= activatedAt;
    case 'param_adjusted':
      const paramTime = state.paramAdjustTimestamps[condition.param];
      return state.adjustedParams.includes(condition.param) && 
             (paramTime || 0) >= activatedAt;
    case 'any_param_adjusted':
      return state.adjustedParams.some(p => {
        const t = state.paramAdjustTimestamps[p];
        return t !== undefined && t >= activatedAt;
      });
    case 'other_param_adjusted':
      return state.adjustedParams.some(p => {
        if (p === condition.excludeParam) return false;
        const t = state.paramAdjustTimestamps[p];
        return t !== undefined && t >= activatedAt;
      });
    case 'develop_started':
      return (state.developStartedAt || 0) >= activatedAt;
    case 'step_completed':
      const targetStepState = state.tutorial.steps.find(s => s.stepId === condition.stepId);
      return targetStepState?.completed || targetStepState?.skipped || false;
    default:
      return false;
  }
}

function checkAndUpdateTutorialProgress(state: GameState): GameState {
  const newSteps = [...state.tutorial.steps];
  let hasChanges = false;
  const now = Date.now();

  const currentStepIndex = state.tutorial.currentStep;
  if (!newSteps[currentStepIndex].activated) {
    newSteps[currentStepIndex] = {
      ...newSteps[currentStepIndex],
      activated: true,
      activatedAt: now
    };
    hasChanges = true;
  }

  for (let i = 0; i < TUTORIAL_STEPS.length; i++) {
    const step = TUTORIAL_STEPS[i];
    const stepState = newSteps[i];

    if (!stepState.unlocked) {
      const prevStep = i > 0 ? newSteps[i - 1] : null;
      const canUnlock = !prevStep || prevStep.completed || prevStep.skipped;
      
      if (canUnlock) {
        newSteps[i] = { ...stepState, unlocked: true };
        hasChanges = true;
      }
    }

    if (stepState.unlocked && stepState.activated && 
        !stepState.completed && !stepState.skipped && 
        step.requiresCompletion) {
      if (checkCompletionCondition(step.completionCondition, state, step.id)) {
        newSteps[i] = { 
          ...stepState, 
          completed: true, 
          completedAt: now 
        };
        hasChanges = true;

        if (i < TUTORIAL_STEPS.length - 1) {
          if (!newSteps[i + 1].unlocked) {
            newSteps[i + 1] = { ...newSteps[i + 1], unlocked: true };
            hasChanges = true;
          }
        }
      }
    }
  }

  if (hasChanges) {
    const allCompleted = newSteps.every(s => s.completed || s.skipped);
    const currentPhase = TUTORIAL_STEPS[state.tutorial.currentStep]?.phase || 'intro';
    
    const newTutorialState = {
      ...state.tutorial,
      steps: newSteps,
      phase: currentPhase,
      isCompleted: allCompleted,
      completedAt: allCompleted ? now : state.tutorial.completedAt,
      totalTimeSpent: allCompleted 
        ? now - state.tutorial.startedAt 
        : state.tutorial.totalTimeSpent
    };

    saveTutorialState(newTutorialState);

    return {
      ...state,
      tutorial: newTutorialState
    };
  }

  return state;
}

function canGoToStep(state: GameState, targetStep: number): { canGo: boolean; reason?: string } {
  if (targetStep < 0 || targetStep >= TUTORIAL_STEPS.length) {
    return { canGo: false, reason: '步骤编号无效' };
  }

  const targetStepState = state.tutorial.steps[targetStep];
  if (!targetStepState.unlocked) {
    return { canGo: false, reason: '该步骤尚未解锁，请先完成前置操作' };
  }

  const currentStepIndex = state.tutorial.currentStep;
  const currentStepData = TUTORIAL_STEPS[currentStepIndex];
  const currentStepState = state.tutorial.steps[currentStepIndex];
  
  if (currentStepData?.requiresCompletion && 
      !currentStepState?.completed && 
      !currentStepState?.skipped &&
      targetStep > currentStepIndex) {
    return { canGo: false, reason: '请先完成当前步骤的操作要求再继续' };
  }

  return { canGo: true };
}

function generateDefaultScheduleSlots(): ScheduleSlot[] {
  const slots: ScheduleSlot[] = [];
  const now = new Date();
  const timeSlots: Array<'morning' | 'afternoon' | 'evening'> = ['morning', 'afternoon', 'evening'];
  
  for (let day = 0; day < 7; day++) {
    const date = new Date(now);
    date.setDate(date.getDate() + day);
    date.setHours(0, 0, 0, 0);
    
    timeSlots.forEach((timeSlot, idx) => {
      slots.push({
        id: `slot_${date.getTime()}_${timeSlot}`,
        date: date.getTime(),
        timeSlot,
        capacity: 3,
        filled: Math.floor(Math.random() * 2)
      });
    });
  }
  
  return slots;
}

function createInitialFilmLabState(): FilmLabState {
  return {
    recipes: [...DEFAULT_RECIPES],
    solutions: [...DEFAULT_SOLUTIONS],
    chemicals: [...DEFAULT_CHEMICALS],
    trialHistory: [],
    compareHistory: [],
    activeTab: 'recipes',
    selectedRecipeId: null,
    selectedSolutionId: null,
    selectedChemicalId: null
  };
}

function createInitialPublicationState(): PublicationState {
  return {
    publications: [],
    activePublicationId: null,
    activeStep: 'select',
    selectFilter: {
      subjectIds: [],
      grades: [],
      minScore: 0,
      maxScore: 100,
      sortBy: 'date_desc'
    }
  };
}

function createInitialSubjectWorkshopState(): SubjectWorkshopState {
  return {
    activeTab: DEFAULT_WORKSHOP_STATE.activeTab,
    editorMode: DEFAULT_WORKSHOP_STATE.editorMode,
    selectedTemplateId: DEFAULT_WORKSHOP_STATE.selectedTemplateId,
    draftTemplate: DEFAULT_WORKSHOP_STATE.draftTemplate,
    draftKeyAreas: [...DEFAULT_WORKSHOP_STATE.draftKeyAreas],
    selectedKeyAreaId: DEFAULT_WORKSHOP_STATE.selectedKeyAreaId,
    templates: [...DEFAULT_WORKSHOP_STATE.templates],
    ruleSets: [...DEFAULT_WORKSHOP_STATE.ruleSets],
    selectedRuleSetId: DEFAULT_WORKSHOP_STATE.selectedRuleSetId,
    previewParams: { ...DEFAULT_WORKSHOP_STATE.previewParams },
    showPreviewOverlay: DEFAULT_WORKSHOP_STATE.showPreviewOverlay,
    showKeyAreasInPreview: DEFAULT_WORKSHOP_STATE.showKeyAreasInPreview,
    undoStack: [...DEFAULT_WORKSHOP_STATE.undoStack],
    redoStack: [...DEFAULT_WORKSHOP_STATE.redoStack],
    filterCategory: DEFAULT_WORKSHOP_STATE.filterCategory,
    searchKeyword: DEFAULT_WORKSHOP_STATE.searchKeyword,
    sortBy: DEFAULT_WORKSHOP_STATE.sortBy
  };
}

function savePublicationAndReturn<T>(newState: T, publicationSystem: PublicationState): T {
  savePublicationSystem(publicationSystem);
  return newState;
}

function matchFilmsForOrder(requirements: OrderRequirements): FilmMatch[] {
  const matches: FilmMatch[] = [];
  
  FILM_STOCKS.forEach(film => {
    let score = 0;
    const reasons: string[] = [];
    
    if (requirements.preferredFilmType === 'bw' && film.color === 'bw') {
      score += 25;
      reasons.push('符合黑白胶片偏好');
    } else if (requirements.preferredFilmType === 'color' && film.color === 'color') {
      score += 25;
      reasons.push('符合彩色胶片偏好');
    } else if (requirements.preferredFilmType === 'any' || !requirements.preferredFilmType) {
      score += 10;
    }
    
    const isoLevel = film.iso <= 100 ? 'low' : film.iso <= 400 ? 'medium' : 'high';
    if (requirements.preferredIso === isoLevel) {
      score += 20;
      reasons.push(`ISO ${film.iso} 符合感光度偏好`);
    } else if (requirements.preferredIso === 'any' || !requirements.preferredIso) {
      score += 8;
    }
    
    const grainLevel = film.grainSize <= 0.3 ? 'fine' : film.grainSize <= 0.6 ? 'medium' : 'coarse';
    if (requirements.grainPreference === grainLevel) {
      score += 15;
      reasons.push('颗粒感符合偏好');
    } else if (requirements.grainPreference === 'any' || !requirements.grainPreference) {
      score += 5;
    }
    
    if (requirements.targetStyle) {
      const styleMatch = calculateStyleMatch(film, requirements.targetStyle);
      score += styleMatch.score;
      if (styleMatch.reason) {
        reasons.push(styleMatch.reason);
      }
    }
    
    const difficultyScore = calculateDifficultyFit(film, requirements.difficulty);
    score += difficultyScore.score;
    if (difficultyScore.reason) {
      reasons.push(difficultyScore.reason);
    }
    
    matches.push({
      filmId: film.id,
      matchScore: Math.min(100, Math.max(0, score)),
      matchReasons: reasons,
      isRecommended: score >= 60
    });
  });
  
  return matches.sort((a, b) => b.matchScore - a.matchScore);
}

function calculateStyleMatch(film: { baseContrast: number; baseSaturation: number; color: string; grainSize?: number }, style: string): { score: number; reason?: string } {
  let score = 0;
  let reason = '';
  
  switch (style) {
    case 'soft':
      if (film.baseContrast < 0.6) {
        score += 15;
        reason = '低反差适合柔和风格';
      }
      if (film.baseSaturation < 0.6) {
        score += 10;
      }
      break;
    case 'vivid':
      if (film.baseSaturation >= 0.7) {
        score += 18;
        reason = '高饱和度适合鲜艳风格';
      }
      if (film.baseContrast >= 0.65) {
        score += 7;
      }
      break;
    case 'dramatic':
      if (film.baseContrast >= 0.7) {
        score += 15;
        reason = '高反差适合戏剧风格';
      }
      break;
    case 'retro':
      if (film.baseSaturation >= 0.5 && film.baseSaturation <= 0.7) {
        score += 12;
        reason = '中等饱和度适合复古风格';
      }
      break;
    case 'moody':
      if (film.baseContrast >= 0.65) {
        score += 12;
        reason = '高反差有助于营造氛围感';
      }
      break;
    case 'clean':
      if (film.grainSize !== undefined && film.grainSize <= 0.35) {
        score += 15;
        reason = '细颗粒适合干净风格';
      }
      break;
    case 'warm':
      if (film.color === 'color') {
        score += 10;
        reason = '彩色胶片适合暖调表现';
      }
      break;
    case 'cool':
      if (film.color === 'color') {
        score += 8;
      }
      break;
    default:
      score += 5;
  }
  
  return { score, reason: reason || undefined };
}

function calculateDifficultyFit(film: { iso: number; baseContrast: number }, difficulty: number): { score: number; reason?: string } {
  let score = 0;
  let reason = '';
  
  if (difficulty <= 2) {
    if (film.iso >= 200 && film.iso <= 800) {
      score += 12;
      reason = '中感光度易于上手';
    }
  } else if (difficulty >= 4) {
    if (film.iso >= 1600 || film.iso <= 100) {
      score += 12;
      reason = '极端感光度更具挑战性';
    }
  } else {
    score += 8;
  }
  
  return { score, reason: reason || undefined };
}

function generateOrderNumber(): string {
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `DR-${dateStr}-${random}`;
}

function createInitialGameState(): GameState {
  const tutorialResult = loadSavedTutorialState();
  const photosResult = loadSavedPhotos();
  const presetsResult = loadSavedPresets();
  
  const validPhotoIds = photosResult.photos.map(p => p.id);
  const favoritesResult = loadSavedFavorites(validPhotoIds);
  const collectionsResult = loadSavedCollections(validPhotoIds);
  const achievementsResult = loadSavedAchievements();
  const ordersResult = loadSavedOrders();
  const questSystemResult = loadSavedQuestSystem();
  const reviewSystemResult = loadSavedReviewSystem();
  const inventorySystemResult = loadSavedInventorySystem();
  const publicationSystemResult = loadSavedPublicationSystem();
  const curriculumSystemResult = loadSavedCurriculumSystem();
  const consignmentMarketResult = loadSavedConsignmentMarket();
  const exhibitionSystemResult = loadSavedExhibitionSystem();
  const darkroomCalibrationResult = loadSavedDarkroomCalibration();
  const challengeSystemResult = loadSavedChallengeSystem();
  
  const savedTutorial = tutorialResult.state;
  const phase = savedTutorial.isCompleted ? 'select' : 'tutorial';
  const currentStep = savedTutorial.isCompleted ? TUTORIAL_STEPS.length - 1 : savedTutorial.currentStep;
  
  const storageStatus = createInitialStorageStatus();
  storageStatus.photosLoaded = photosResult.status.photosLoaded || 0;
  storageStatus.presetsLoaded = presetsResult.status.presetsLoaded || 0;
  storageStatus.favoritesLoaded = favoritesResult.status.favoritesLoaded || 0;
  storageStatus.collectionsLoaded = collectionsResult.status.collectionsLoaded || 0;
  storageStatus.ordersLoaded = ordersResult.status.ordersLoaded || 0;
  storageStatus.questSystemLoaded = questSystemResult.status.questSystemLoaded || false;
  storageStatus.reviewSystemLoaded = reviewSystemResult.status.reviewSystemLoaded || false;
  storageStatus.inventorySystemLoaded = inventorySystemResult.status.inventorySystemLoaded || false;
  storageStatus.publicationSystemLoaded = publicationSystemResult.status.publicationSystemLoaded || false;
  storageStatus.curriculumSystemLoaded = curriculumSystemResult.status.curriculumSystemLoaded || false;
  storageStatus.consignmentMarketLoaded = consignmentMarketResult.status.consignmentMarketLoaded || false;
  storageStatus.exhibitionSystemLoaded = exhibitionSystemResult.status.exhibitionSystemLoaded || false;
  storageStatus.darkroomCalibrationLoaded = darkroomCalibrationResult.status.darkroomCalibrationLoaded || false;
  storageStatus.challengeSystemLoaded = challengeSystemResult.status.challengeSystemLoaded || false;
  storageStatus.tutorialLoaded = tutorialResult.status.tutorialLoaded || false;
  storageStatus.migrationPerformed = !!(photosResult.status.migrationPerformed || 
    presetsResult.status.migrationPerformed || 
    tutorialResult.status.migrationPerformed ||
    favoritesResult.status.migrationPerformed ||
    collectionsResult.status.migrationPerformed ||
    ordersResult.status.migrationPerformed ||
    questSystemResult.status.migrationPerformed ||
    reviewSystemResult.status.migrationPerformed ||
    inventorySystemResult.status.migrationPerformed ||
    publicationSystemResult.status.migrationPerformed ||
    curriculumSystemResult.status.migrationPerformed ||
    consignmentMarketResult.status.migrationPerformed ||
    exhibitionSystemResult.status.migrationPerformed ||
    darkroomCalibrationResult.status.migrationPerformed ||
    challengeSystemResult.status.migrationPerformed);
  storageStatus.recoveryPerformed = !!(photosResult.status.recoveryPerformed || 
    presetsResult.status.recoveryPerformed || 
    tutorialResult.status.recoveryPerformed ||
    favoritesResult.status.recoveryPerformed ||
    collectionsResult.status.recoveryPerformed ||
    ordersResult.status.recoveryPerformed ||
    questSystemResult.status.recoveryPerformed ||
    reviewSystemResult.status.recoveryPerformed ||
    inventorySystemResult.status.recoveryPerformed ||
    publicationSystemResult.status.recoveryPerformed ||
    curriculumSystemResult.status.recoveryPerformed ||
    consignmentMarketResult.status.recoveryPerformed ||
    exhibitionSystemResult.status.recoveryPerformed ||
    darkroomCalibrationResult.status.recoveryPerformed ||
    challengeSystemResult.status.recoveryPerformed);
  
  if (photosResult.status.corruptedItems?.photos) {
    storageStatus.corruptedItems.photos = photosResult.status.corruptedItems.photos;
  }
  if (presetsResult.status.corruptedItems?.presets) {
    storageStatus.corruptedItems.presets = presetsResult.status.corruptedItems.presets;
  }
  if (favoritesResult.status.corruptedItems?.favorites) {
    storageStatus.corruptedItems.favorites = favoritesResult.status.corruptedItems.favorites;
  }
  if (collectionsResult.status.corruptedItems?.collections) {
    storageStatus.corruptedItems.collections = collectionsResult.status.corruptedItems.collections;
  }
  if (ordersResult.status.corruptedItems?.orders) {
    storageStatus.corruptedItems.orders = ordersResult.status.corruptedItems.orders;
  }
  
  const warnings: StorageWarning[] = [];
  const now = Date.now();
  
  if (storageStatus.recoveryPerformed) {
    warnings.push({
      type: 'recovered',
      message: '检测到存档损坏，已从备份恢复部分数据',
      timestamp: now
    });
  }
  
  if (storageStatus.migrationPerformed) {
    warnings.push({
      type: 'migrated',
      message: '存档数据已升级到新版本',
      timestamp: now
    });
  }
  
  const corruptedCount = storageStatus.corruptedItems.photos + 
    storageStatus.corruptedItems.presets + 
    storageStatus.corruptedItems.favorites + 
    storageStatus.corruptedItems.collections +
    storageStatus.corruptedItems.orders +
    (storageStatus.corruptedItems.reviewSystem || 0) +
    (storageStatus.corruptedItems.inventorySystem || 0) +
    (storageStatus.corruptedItems.exhibitionSystem || 0) +
    (storageStatus.corruptedItems.darkroomCalibration || 0) +
    (storageStatus.corruptedItems.challengeSystem || 0);
  if (corruptedCount > 0) {
    warnings.push({
      type: 'corrupted',
      message: `发现 ${corruptedCount} 个损坏数据项，已自动清理`,
      timestamp: now,
      details: `照片: ${storageStatus.corruptedItems.photos} 个, 预设: ${storageStatus.corruptedItems.presets} 个, 收藏: ${storageStatus.corruptedItems.favorites} 个, 精选集: ${storageStatus.corruptedItems.collections} 个, 订单: ${storageStatus.corruptedItems.orders} 个, 评审: ${storageStatus.corruptedItems.reviewSystem || 0} 个, 库存: ${storageStatus.corruptedItems.inventorySystem || 0} 个, 展览: ${storageStatus.corruptedItems.exhibitionSystem || 0} 个, 校准: ${storageStatus.corruptedItems.darkroomCalibration || 0} 个, 挑战赛: ${storageStatus.corruptedItems.challengeSystem || 0} 个`
    });
  }
  
  if (isStorageNearLimit()) {
    warnings.push({
      type: 'quota',
      message: '存储空间即将用尽，请及时清理旧数据',
      timestamp: now
    });
  }
  
  storageStatus.warnings = warnings;

  const scheduleSlots = generateDefaultScheduleSlots();

  return {
    currentSubject: null,
    currentFilm: FILM_STOCKS[0],
    currentParams: { ...DEFAULT_PARAMS },
    developmentProgress: 0,
    isDeveloping: false,
    phase: phase,
    processedPhotos: photosResult.photos,
    tutorial: savedTutorial,
    tutorialStep: currentStep,
    selectedAlbumPhoto: null,
    presets: presetsResult.presets,
    presetHistory: [],
    lastAppliedPresetId: null,
    adjustedParams: [],
    subjectSelectedAt: null,
    filmSelectedAt: null,
    paramAdjustTimestamps: {},
    developStartedAt: null,
    stageState: createInitialStageState(),
    compareSelection: [],
    compareSubjectId: null,
    favorites: favoritesResult.favorites,
    collections: collectionsResult.collections,
    collectionFilter: {
      viewMode: 'all',
      activeCollectionId: null,
      activeGroupId: null
    },
    quickBrowseIndex: 0,
    quickBrowsePhotoIds: [],
    storageStatus,
    attemptHistory: [],
    achievements: achievementsResult,
    orders: ordersResult.orders,
    currentOrderId: null,
    orderFilter: {
      statuses: [],
      priorities: [],
      searchKeyword: '',
      sortBy: 'created_desc'
    },
    orderScheduleSlots: scheduleSlots,
    filmLab: createInitialFilmLabState(),
    questSystem: questSystemResult.state,
    reviewSystem: reviewSystemResult.state,
    inventorySystem: inventorySystemResult.state,
    publicationSystem: publicationSystemResult.state,
    subjectWorkshop: createInitialSubjectWorkshopState(),
    curriculumSystem: curriculumSystemResult.state,
    consignmentMarket: consignmentMarketResult.state,
    exhibitionSystem: exhibitionSystemResult.state,
    darkroomCalibration: darkroomCalibrationResult.state,
    challengeSystem: challengeSystemResult.state
  };
}

const GRADE_ORDER: Record<string, number> = { S: 5, A: 4, B: 3, C: 2, D: 1 };

function meetsMinGrade(grade: string, minGrade: string): boolean {
  return (GRADE_ORDER[grade] || 0) >= (GRADE_ORDER[minGrade] || 0);
}

function toDayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function calculateCurrentStreak(practiceDays: string[]): number {
  if (practiceDays.length === 0) return 0;
  const sorted = [...practiceDays].sort().reverse();
  const today = toDayKey(Date.now());
  const yesterday = toDayKey(Date.now() - 86400000);
  if (sorted[0] !== today && sorted[0] !== yesterday) return 0;
  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1] + 'T00:00:00').getTime();
    const curr = new Date(sorted[i] + 'T00:00:00').getTime();
    if (prev - curr === 86400000) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

function checkAchievementCondition(
  condition: AchievementCondition,
  photos: ProcessedPhoto[],
  practiceDays: string[]
): boolean {
  switch (condition.type) {
    case 'any_grade':
      return photos.some(p => meetsMinGrade(p.details.grade, condition.minGrade));
    case 'grade_on_subjects': {
      const subjectSet = new Set<string>();
      photos.forEach(p => {
        if (meetsMinGrade(p.details.grade, condition.minGrade)) {
          subjectSet.add(p.subjectId);
        }
      });
      return subjectSet.size >= condition.subjectCount;
    }
    case 'grade_on_scene_types': {
      const sceneTypeSet = new Set<string>();
      photos.forEach(p => {
        if (meetsMinGrade(p.details.grade, condition.minGrade)) {
          const subject = PHOTO_SUBJECTS.find(s => s.id === p.subjectId);
          if (subject) sceneTypeSet.add(subject.sceneType);
        }
      });
      return sceneTypeSet.size >= condition.sceneTypeCount;
    }
    case 'film_variety': {
      const filmSet = new Set(photos.map(p => p.filmId));
      return filmSet.size >= condition.filmCount;
    }
    case 'film_min_usage': {
      const filmCounts: Record<string, number> = {};
      photos.forEach(p => {
        filmCounts[p.filmId] = (filmCounts[p.filmId] || 0) + 1;
      });
      return FILM_STOCKS.every(f => (filmCounts[f.id] || 0) >= condition.minUsage);
    }
    case 'film_grade_count': {
      const filmGradeCounts: Record<string, number> = {};
      photos.forEach(p => {
        if (meetsMinGrade(p.details.grade, condition.minGrade)) {
          filmGradeCounts[p.filmId] = (filmGradeCounts[p.filmId] || 0) + 1;
        }
      });
      return Object.values(filmGradeCounts).some(c => c >= condition.count);
    }
    case 'film_all_grade': {
      const filmsWithGrade = new Set<string>();
      photos.forEach(p => {
        if (meetsMinGrade(p.details.grade, condition.minGrade)) {
          filmsWithGrade.add(p.filmId);
        }
      });
      return FILM_STOCKS.every(f => filmsWithGrade.has(f.id));
    }
    case 'streak_days': {
      const streak = calculateCurrentStreak(practiceDays);
      return streak >= condition.days;
    }
  }
}

function computeAchievementProgress(
  condition: AchievementCondition,
  photos: ProcessedPhoto[],
  practiceDays: string[]
): { current: number; target: number } {
  switch (condition.type) {
    case 'any_grade':
      return { current: photos.some(p => meetsMinGrade(p.details.grade, condition.minGrade)) ? 1 : 0, target: 1 };
    case 'grade_on_subjects': {
      const subjectSet = new Set<string>();
      photos.forEach(p => {
        if (meetsMinGrade(p.details.grade, condition.minGrade)) subjectSet.add(p.subjectId);
      });
      return { current: subjectSet.size, target: condition.subjectCount };
    }
    case 'grade_on_scene_types': {
      const sceneTypeSet = new Set<string>();
      photos.forEach(p => {
        if (meetsMinGrade(p.details.grade, condition.minGrade)) {
          const subject = PHOTO_SUBJECTS.find(s => s.id === p.subjectId);
          if (subject) sceneTypeSet.add(subject.sceneType);
        }
      });
      return { current: sceneTypeSet.size, target: condition.sceneTypeCount };
    }
    case 'film_variety': {
      const filmSet = new Set(photos.map(p => p.filmId));
      return { current: filmSet.size, target: condition.filmCount };
    }
    case 'film_min_usage': {
      const filmCounts: Record<string, number> = {};
      photos.forEach(p => { filmCounts[p.filmId] = (filmCounts[p.filmId] || 0) + 1; });
      const met = FILM_STOCKS.filter(f => (filmCounts[f.id] || 0) >= condition.minUsage).length;
      return { current: met, target: FILM_STOCKS.length };
    }
    case 'film_grade_count': {
      const filmGradeCounts: Record<string, number> = {};
      photos.forEach(p => {
        if (meetsMinGrade(p.details.grade, condition.minGrade)) {
          filmGradeCounts[p.filmId] = (filmGradeCounts[p.filmId] || 0) + 1;
        }
      });
      const maxCount = Math.max(0, ...Object.values(filmGradeCounts));
      return { current: maxCount, target: condition.count };
    }
    case 'film_all_grade': {
      const filmsWithGrade = new Set<string>();
      photos.forEach(p => {
        if (meetsMinGrade(p.details.grade, condition.minGrade)) filmsWithGrade.add(p.filmId);
      });
      return { current: filmsWithGrade.size, target: FILM_STOCKS.length };
    }
    case 'streak_days': {
      const streak = calculateCurrentStreak(practiceDays);
      return { current: streak, target: condition.days };
    }
  }
}

function checkAndUnlockAchievements(state: GameState): AchievementState {
  const photos = state.processedPhotos;
  const practiceDays = state.achievements.practiceDays;
  const existingUnlocked = new Set(state.achievements.unlockedIds);
  const newlyUnlocked: string[] = [];

  for (const def of ACHIEVEMENT_DEFINITIONS) {
    if (existingUnlocked.has(def.id)) continue;
    if (checkAchievementCondition(def.condition, photos, practiceDays)) {
      newlyUnlocked.push(def.id);
    }
  }

  if (newlyUnlocked.length === 0) return state.achievements;

  const allUnlocked = [...existingUnlocked, ...newlyUnlocked];
  const newState: AchievementState = {
    unlockedIds: allUnlocked,
    practiceDays,
    newlyUnlocked
  };
  saveAchievements(newState);
  return newState;
}

function updateCalibrationStats(cal: DarkroomCalibrationState, now: number): CalibrationStatistics {
  const enlargerCals = cal.enlargerCalibrations;
  const tempCals = cal.tempCalibrations;
  const timerCals = cal.timerCalibrations;
  const deviations = cal.deviations;
  const avgEnlargerDrift = enlargerCals.length > 0
    ? enlargerCals.reduce((s, c) => s + Math.abs(c.measuredBaseExposure - (cal.enlargers.find(e => e.id === c.enlargerId)?.baseExposure || 0.5)), 0) / enlargerCals.length
    : 0;
  const avgTempDeviation = tempCals.length > 0
    ? tempCals.reduce((s, c) => s + c.zones.reduce((zs, z) => zs + Math.abs(z.deviation), 0) / Math.max(1, c.zones.length), 0) / tempCals.length
    : 0;
  const avgTimerDriftMs = timerCals.length > 0
    ? timerCals.reduce((s, c) => s + Math.abs(c.measuredDriftMs), 0) / timerCals.length
    : 0;
  const recentDeviationImpact = deviations.slice(0, 10).reduce((s, d) => s + d.totalScoreImpact, 0) / Math.max(1, Math.min(10, deviations.length));
  const healthPenalty = avgEnlargerDrift * 200 + avgTempDeviation * 30 + avgTimerDriftMs * 0.05;
  const calibrationHealthScore = Math.max(0, Math.min(100, 100 - healthPenalty));
  const recent = deviations.slice(0, 5);
  const older = deviations.slice(5, 10);
  const recentAvg = recent.length > 0 ? recent.reduce((s, d) => s + d.totalScoreImpact, 0) / recent.length : 0;
  const olderAvg = older.length > 0 ? older.reduce((s, d) => s + d.totalScoreImpact, 0) / older.length : 0;
  const deviationTrend: 'improving' | 'stable' | 'worsening' = recentAvg < olderAvg * 0.8 ? 'improving' : recentAvg > olderAvg * 1.2 ? 'worsening' : 'stable';
  return {
    totalCalibrations: enlargerCals.length + tempCals.length + timerCals.length,
    avgEnlargerDrift,
    avgTempDeviation,
    avgTimerDriftMs,
    lastCalibrationAt: now,
    calibrationHealthScore,
    deviationTrend,
    recentDeviationImpact
  };
}

function createGameStore() {
  const initialState: GameState = createInitialGameState();
  const { subscribe, set, update } = writable(initialState);

  return {
    subscribe,
    setSubject: (subjectId: string) => update(state => {
      const now = Date.now();
      const newState = {
        ...state,
        currentSubject: PHOTO_SUBJECTS.find(s => s.id === subjectId) || null,
        subjectSelectedAt: now
      };
      return checkAndUpdateTutorialProgress(newState);
    }),
    setFilm: (filmId: string) => update(state => {
      const now = Date.now();
      const newState = {
        ...state,
        currentFilm: FILM_STOCKS.find(f => f.id === filmId) || FILM_STOCKS[0],
        filmSelectedAt: now
      };
      return checkAndUpdateTutorialProgress(newState);
    }),
    updateParams: (params: Partial<DevParams>) => update(state => {
      const now = Date.now();
      const newAdjustedParams = [...state.adjustedParams];
      const newTimestamps = { ...state.paramAdjustTimestamps };
      
      Object.keys(params).forEach(key => {
        const paramKey = key as keyof DevParams;
        if (!newAdjustedParams.includes(paramKey)) {
          newAdjustedParams.push(paramKey);
        }
        newTimestamps[paramKey] = now;
      });
      
      const newState = {
        ...state,
        currentParams: { ...state.currentParams, ...params },
        adjustedParams: newAdjustedParams,
        paramAdjustTimestamps: newTimestamps
      };
      return checkAndUpdateTutorialProgress(newState);
    }),
    resetParams: () => update(state => ({
      ...state,
      currentParams: { ...DEFAULT_PARAMS }
    })),
    setPhase: (phase: GamePhase) => update(state => ({
      ...state,
      phase
    })),
    startDevelopment: () => update(state => {
      const now = Date.now();
      const durations = calculateIdealDurations(state.currentParams);
      const newStageState: StageState = {
        currentStage: 'presoak',
        stageProgress: 0,
        totalProgress: 0,
        stageStartAt: now,
        developDuration: durations.develop,
        fixDuration: durations.fix,
        washDuration: durations.wash,
        developElapsed: 0,
        fixElapsed: 0,
        washElapsed: 0,
        developDeviation: 0,
        fixDeviation: 0,
        washDeviation: 0
      };
      const newState: GameState = {
        ...state,
        isDeveloping: true,
        developmentProgress: 0,
        phase: 'develop',
        developStartedAt: now,
        stageState: newStageState
      };
      return checkAndUpdateTutorialProgress(newState);
    }),
    updateDevelopmentProgress: (progress: number) => update(state => ({
      ...state,
      developmentProgress: progress
    })),
    updateStageState: (stageState: Partial<StageState>) => update(state => ({
      ...state,
      stageState: { ...state.stageState, ...stageState }
    })),
    finishDevelopment: (photo: ProcessedPhoto) => update(state => {
      const newPhotos = [photo, ...state.processedPhotos].slice(0, MAX_PHOTOS);
      const saveSuccess = savePhotos(newPhotos);
      const info = getStorageInfo();
      
      const newAttempt: AttemptRecord = {
        attemptNumber: state.attemptHistory.length + 1,
        params: { ...photo.params },
        score: photo.score,
        overall: photo.details.overall,
        grade: photo.details.grade,
        timestamp: photo.timestamp,
        subjectId: photo.subjectId,
        filmId: photo.filmId
      };
      
      const isSameSession = state.attemptHistory.length > 0
        && state.attemptHistory[0].subjectId === photo.subjectId
        && state.attemptHistory[0].filmId === photo.filmId;
      
      const newAttemptHistory = isSameSession
        ? [...state.attemptHistory, newAttempt]
        : [newAttempt];
      
      const todayKey = toDayKey(photo.timestamp);
      const practiceDays = state.achievements.practiceDays.includes(todayKey)
        ? state.achievements.practiceDays
        : [...state.achievements.practiceDays, todayKey];
      
      const achievementsBeforeCheck: AchievementState = {
        ...state.achievements,
        practiceDays,
        newlyUnlocked: []
      };
      
      const stateForCheck: GameState = {
        ...state,
        processedPhotos: newPhotos,
        achievements: achievementsBeforeCheck
      };
      const newAchievements = checkAndUnlockAchievements(stateForCheck);
      
      let newWarnings = [...state.storageStatus.warnings];
      const now = Date.now();
      
      const hasQuotaWarning = newWarnings.some(w => w.type === 'quota');
      if (isStorageNearLimit() && !hasQuotaWarning) {
        newWarnings.push({
          type: 'quota',
          message: '存储空间即将用尽，请及时清理旧数据',
          timestamp: now
        });
      }
      
      let newStorageStatus = {
        ...state.storageStatus,
        lastSaveSuccess: saveSuccess,
        lastSaveError: saveSuccess ? undefined : '保存照片失败',
        photosLoaded: newPhotos.length,
        storageUsed: info.used,
        storageQuota: info.quota,
        warnings: newWarnings
      };
      
      if (state.processedPhotos.length >= MAX_PHOTOS - 1) {
        const hasLimitWarning = newWarnings.some(w => w.type === 'limit_reached');
        if (!hasLimitWarning) {
          newStorageStatus.warnings = [
            ...newWarnings,
            {
              type: 'limit_reached',
              message: `照片数量已达上限 (${MAX_PHOTOS})，新照片将覆盖最旧的照片`,
              timestamp: now
            }
          ];
        }
      }
      
      let updatedOrders = state.orders;
      let updatedCurrentOrderId = state.currentOrderId;
      
      if (state.currentOrderId) {
        const order = state.orders.find(o => o.id === state.currentOrderId);
        if (order) {
          const newPhotoIds = [...order.photoIds, photo.id];
          const isAllComplete = newPhotoIds.length >= order.requirements.quantity;
          
          updatedOrders = state.orders.map(o => {
            if (o.id !== state.currentOrderId) return o;
            return {
              ...o,
              status: isAllComplete ? 'scoring' as OrderStatus : 'developing' as OrderStatus,
              photoIds: newPhotoIds,
              updatedAt: now,
              completedAt: isAllComplete ? now : undefined
            };
          });
          saveOrders(updatedOrders);
          
          if (isAllComplete) {
            updatedCurrentOrderId = null;
          }
        }
      }
      
      let updatedQuestSystem = state.questSystem;
      if (state.questSystem.currentActiveQuestId) {
        const questId = state.questSystem.currentActiveQuestId;
        const warnings: string[] = [];
        const questResult = evaluateQuestAttempt(
          state.questSystem,
          questId,
          photo,
          state.currentParams,
          warnings
        );
        updatedQuestSystem = applyQuestResult(state.questSystem, questId, questResult);
        saveQuestSystem(updatedQuestSystem);
      }
      
      let updatedInventorySystem = state.inventorySystem;
      const consumeResult = consumeStock(
        state.inventorySystem,
        photo.filmId,
        1,
        'develop',
        {
          relatedPhotoId: photo.id,
          subjectId: photo.subjectId,
          relatedOrderId: state.currentOrderId || undefined,
          notes: '冲洗创作自动扣减'
        }
      );
      if (consumeResult.success) {
        updatedInventorySystem = consumeResult.state;
        saveInventorySystem(updatedInventorySystem);
      }
      
      return {
        ...state,
        isDeveloping: false,
        developmentProgress: 1,
        phase: 'result',
        processedPhotos: newPhotos,
        attemptHistory: newAttemptHistory,
        achievements: newAchievements,
        storageStatus: newStorageStatus,
        orders: updatedOrders,
        currentOrderId: updatedCurrentOrderId,
        questSystem: updatedQuestSystem,
        inventorySystem: updatedInventorySystem,
        stageState: {
          ...state.stageState,
          currentStage: 'complete',
          stageProgress: 1,
          totalProgress: 1
        }
      };
    }),
    setTutorialStep: (step: number) => update(state => {
      const check = canGoToStep(state, step);
      if (!check.canGo) {
        return state;
      }
      
      const now = Date.now();
      const newSteps = [...state.tutorial.steps];
      if (!newSteps[step].activated) {
        newSteps[step] = {
          ...newSteps[step],
          activated: true,
          activatedAt: now
        };
      }
      
      const newTutorialState = {
        ...state.tutorial,
        currentStep: step,
        steps: newSteps,
        phase: TUTORIAL_STEPS[step]?.phase || 'intro'
      };
      
      saveTutorialState(newTutorialState);
      
      const newState = {
        ...state,
        tutorialStep: step,
        tutorial: newTutorialState
      };
      return checkAndUpdateTutorialProgress(newState);
    }),
    nextTutorialStep: () => update(state => {
      const nextStep = state.tutorial.currentStep + 1;
      const check = canGoToStep(state, nextStep);
      
      if (!check.canGo && nextStep < TUTORIAL_STEPS.length) {
        return state;
      }
      
      if (nextStep >= TUTORIAL_STEPS.length) {
        const newSteps = state.tutorial.steps.map((s, i) => 
          !s.completed && !s.skipped ? { ...s, skipped: true, completed: true } : s
        );
        const newTutorialState = {
          ...state.tutorial,
          currentStep: TUTORIAL_STEPS.length - 1,
          steps: newSteps,
          isCompleted: true,
          completedAt: Date.now(),
          totalTimeSpent: Date.now() - state.tutorial.startedAt
        };
        saveTutorialState(newTutorialState);
        return { 
          ...state, 
          phase: 'select', 
          tutorialStep: TUTORIAL_STEPS.length - 1,
          tutorial: newTutorialState
        };
      }
      
      const now = Date.now();
      const newSteps = [...state.tutorial.steps];
      if (!newSteps[nextStep].activated) {
        newSteps[nextStep] = {
          ...newSteps[nextStep],
          activated: true,
          activatedAt: now
        };
      }
      
      const newTutorialState = {
        ...state.tutorial,
        currentStep: nextStep,
        steps: newSteps,
        phase: TUTORIAL_STEPS[nextStep]?.phase || 'intro'
      };
      
      saveTutorialState(newTutorialState);
      
      const newState = {
        ...state,
        tutorialStep: nextStep,
        tutorial: newTutorialState
      };
      return checkAndUpdateTutorialProgress(newState);
    }),
    prevTutorialStep: () => update(state => {
      const prevStep = Math.max(0, state.tutorial.currentStep - 1);
      const newTutorialState = {
        ...state.tutorial,
        currentStep: prevStep,
        phase: TUTORIAL_STEPS[prevStep]?.phase || 'intro'
      };
      saveTutorialState(newTutorialState);
      return {
        ...state,
        tutorialStep: prevStep,
        tutorial: newTutorialState
      };
    }),
    skipTutorial: () => update(state => {
      const newSteps = state.tutorial.steps.map((s, i) => 
        !s.completed ? { ...s, skipped: true, completed: true } : s
      );
      const newTutorialState = {
        ...state.tutorial,
        currentStep: TUTORIAL_STEPS.length - 1,
        steps: newSteps,
        isCompleted: true,
        completedAt: Date.now(),
        totalTimeSpent: Date.now() - state.tutorial.startedAt
      };
      saveTutorialState(newTutorialState);
      return {
        ...state,
        phase: 'select',
        tutorialStep: TUTORIAL_STEPS.length - 1,
        tutorial: newTutorialState
      };
    }),
    skipCurrentTutorialStep: () => update(state => {
      const currentStepData = TUTORIAL_STEPS[state.tutorial.currentStep];
      if (!currentStepData?.allowSkip) {
        const newSteps = [...state.tutorial.steps];
        newSteps[state.tutorial.currentStep] = {
          ...newSteps[state.tutorial.currentStep],
          skipped: true,
          completed: true
        };
        
        const nextStep = state.tutorial.currentStep + 1;
        if (nextStep < TUTORIAL_STEPS.length) {
          const now = Date.now();
          if (!newSteps[nextStep].activated) {
            newSteps[nextStep] = {
              ...newSteps[nextStep],
              activated: true,
              activatedAt: now
            };
          }
          
          const newTutorialState = {
            ...state.tutorial,
            currentStep: nextStep,
            steps: newSteps,
            phase: TUTORIAL_STEPS[nextStep]?.phase || 'intro'
          };
          saveTutorialState(newTutorialState);
          
          const newState = {
            ...state,
            tutorialStep: nextStep,
            tutorial: newTutorialState
          };
          return checkAndUpdateTutorialProgress(newState);
        }
      }
      return state;
    }),
    checkTutorialStepCompletion: () => update(state => {
      return checkAndUpdateTutorialProgress(state);
    }),
    canGoToTutorialStep: (step: number): { canGo: boolean; reason?: string } => {
        let result: { canGo: boolean; reason?: string } = { canGo: false, reason: '' };
        const unsubscribe = subscribe(state => {
          result = canGoToStep(state, step);
        });
        unsubscribe();
        return result;
    },
    resetTutorial: () => update(state => {
      const newTutorialState = createInitialTutorialState();
      saveTutorialState(newTutorialState);
      return {
        ...state,
        phase: 'tutorial',
        tutorialStep: 0,
        adjustedParams: [],
        subjectSelectedAt: null,
        filmSelectedAt: null,
        paramAdjustTimestamps: {},
        developStartedAt: null,
        tutorial: newTutorialState
      };
    }),
    setCurriculumActiveChapter: (chapterId: string | null) => update(state => {
      const newCurriculum = {
        ...state.curriculumSystem,
        activeChapterId: chapterId,
        activeStepId: chapterId
          ? (getChapterById(chapterId)?.steps[0]?.id || null)
          : null
      };
      saveCurriculumSystem(newCurriculum);
      return {
        ...state,
        curriculumSystem: newCurriculum
      };
    }),
    setCurriculumActiveStep: (chapterId: string, stepId: string | null) => update(state => {
      const newCurriculum = {
        ...state.curriculumSystem,
        activeChapterId: chapterId,
        activeStepId: stepId,
        profile: {
          ...state.curriculumSystem.profile,
          currentChapterId: chapterId,
          currentStepId: stepId
        }
      };
      saveCurriculumSystem(newCurriculum);
      return {
        ...state,
        curriculumSystem: newCurriculum
      };
    }),
    toggleCurriculumPanel: (show?: boolean) => update(state => {
      const shouldShow = show !== undefined ? show : !state.curriculumSystem.showCurriculumPanel;
      const newCurriculum = {
        ...state.curriculumSystem,
        showCurriculumPanel: shouldShow
      };
      saveCurriculumSystem(newCurriculum);
      return {
        ...state,
        curriculumSystem: newCurriculum
      };
    }),
    toggleCurriculumPracticeMode: (enabled?: boolean) => update(state => {
      const shouldEnable = enabled !== undefined ? enabled : !state.curriculumSystem.practiceMode;
      const newCurriculum = {
        ...state.curriculumSystem,
        practiceMode: shouldEnable
      };
      saveCurriculumSystem(newCurriculum);
      return {
        ...state,
        curriculumSystem: newCurriculum
      };
    }),
    submitQuizAnswer: (
      chapterId: string,
      stepId: string,
      questionId: string,
      question: QuizQuestion,
      userAnswer: string | string[]
    ) => update(state => {
      const result = checkQuizAnswer(question, userAnswer);
      const feedbacks: CurriculumFeedback[] = [{
        id: 'feedback_' + generateId(),
        timestamp: Date.now(),
        severity: result.correct ? 'info' : 'warning',
        category: result.correct ? 'encouragement' : 'knowledge_gap',
        title: result.correct ? '回答正确！' : '回答错误',
        message: result.feedback,
        suggestion: result.correct
          ? '很好，继续保持！进入下一步学习。'
          : '回顾相关知识点后再次尝试。'
      }];

      const newProfile = result.correct
        ? completeStep(state.curriculumSystem.profile, chapterId, stepId, result.score, feedbacks)
        : recordStepAttempt(state.curriculumSystem.profile, chapterId, stepId, ['knowledge_gap'], 0);

      const newCurriculum = {
        ...state.curriculumSystem,
        profile: newProfile,
        activeFeedback: feedbacks[0],
        lastGeneratedFeedback: feedbacks[0]
      };
      saveCurriculumSystem(newCurriculum);

      return {
        ...state,
        curriculumSystem: newCurriculum
      };
    }),
    completeReadingStep: (chapterId: string, stepId: string) => update(state => {
      const feedbacks: CurriculumFeedback[] = [{
        id: 'feedback_' + generateId(),
        timestamp: Date.now(),
        severity: 'info',
        category: 'encouragement',
        title: '学习完成',
        message: '已完成本章节的阅读学习。',
        suggestion: '继续下一步，或进行练习巩固知识。'
      }];

      const newProfile = completeStep(state.curriculumSystem.profile, chapterId, stepId, 5, feedbacks);
      const newCurriculum = {
        ...state.curriculumSystem,
        profile: newProfile,
        activeFeedback: feedbacks[0]
      };
      saveCurriculumSystem(newCurriculum);

      return {
        ...state,
        curriculumSystem: newCurriculum
      };
    }),
    submitChapterExam: (
      chapterId: string,
      answers: Record<string, string | string[]>
    ) => update(state => {
      const chapter = getChapterById(chapterId);
      if (!chapter?.chapterExam) return state;

      const examResult = calculateExamScore(chapter.chapterExam.questions, answers);
      const passed = examResult.percentage >= chapter.chapterExam.passingScore;

      const feedbacks: CurriculumFeedback[] = [{
        id: 'feedback_' + generateId(),
        timestamp: Date.now(),
        severity: passed ? 'info' : 'error',
        category: passed ? 'encouragement' : 'knowledge_gap',
        title: passed ? '章节测验通过！' : '章节测验未通过',
        message: `得分: ${examResult.score}/${examResult.totalPoints} (${examResult.percentage}%)，正确率: ${examResult.correctCount}/${chapter.chapterExam.questions.length}`,
        suggestion: passed
          ? '恭喜通过本章节测验！继续学习下一章。'
          : `及格线: ${chapter.chapterExam.passingScore}%，请复习后再次尝试。`
      }];

      const chapterProgress = state.curriculumSystem.profile.chapterProgress[chapterId];
      const newStatus: ChapterProgress['status'] = passed ? 'completed' : 'exam_failed';
      const newProfile = {
        ...state.curriculumSystem.profile,
        totalPointsEarned: state.curriculumSystem.profile.totalPointsEarned + examResult.score,
        chapterProgress: {
          ...state.curriculumSystem.profile.chapterProgress,
          [chapterId]: {
            ...chapterProgress,
            examScore: examResult.percentage,
            examAttempts: (chapterProgress?.examAttempts || 0) + 1,
            status: newStatus,
            completedAt: passed ? Date.now() : chapterProgress?.completedAt,
            earnedPoints: (chapterProgress?.earnedPoints || 0) + examResult.score
          }
        },
        feedbackHistory: [...state.curriculumSystem.profile.feedbackHistory, ...feedbacks].slice(-100)
      };

      if (passed && !newProfile.completedChapterIds.includes(chapterId)) {
        newProfile.completedChapterIds = [...newProfile.completedChapterIds, chapterId];
      }

      const newCurriculum = {
        ...state.curriculumSystem,
        profile: newProfile,
        activeFeedback: feedbacks[0],
        lastGeneratedFeedback: feedbacks[0],
        currentExamAnswers: {}
      };
      saveCurriculumSystem(newCurriculum);

      return {
        ...state,
        curriculumSystem: newCurriculum
      };
    }),
    setExamAnswer: (questionId: string, answer: string | string[]) => update(state => {
      const newCurriculum = {
        ...state.curriculumSystem,
        currentExamAnswers: {
          ...state.curriculumSystem.currentExamAnswers,
          [questionId]: answer
        }
      };
      return {
        ...state,
        curriculumSystem: newCurriculum
      };
    }),
    generateParamFeedbackForCurrent: (
      param: keyof DevParams,
      actualValue: number,
      idealValue: number
    ) => update(state => {
      const feedback = generateParamFeedback(param, actualValue, idealValue);
      const newCurriculum = {
        ...state.curriculumSystem,
        activeFeedback: feedback,
        lastGeneratedFeedback: feedback
      };
      return {
        ...state,
        curriculumSystem: newCurriculum
      };
    }),
    evaluatePracticeResult: (
      chapterId: string,
      stepId: string,
      exerciseId: string,
      score: number,
      grade: string,
      params: DevParams,
      filmId: string,
      attemptNumber: number
    ) => update(state => {
      const chapter = getChapterById(chapterId);
      const step = getStepById(chapterId, stepId);
      const exercise = step?.exercise;

      if (!exercise) return state;

      const result = evaluatePracticeExercise(exercise, score, grade, params, filmId, attemptNumber);

      const newProfile = result.passed
        ? completeStep(state.curriculumSystem.profile, chapterId, stepId, result.earnedPoints, result.feedback)
        : recordStepAttempt(state.curriculumSystem.profile, chapterId, stepId, ['param_error'], score);

      const bonusesText = result.bonusesEarned.length > 0
        ? ` 奖励: ${result.bonusesEarned.map(b => `${b.description} +${b.points}分`).join(', ')}`
        : '';

      const finalFeedbacks = result.feedback.map(f => ({
        ...f,
        message: f.message + bonusesText
      }));

      const newCurriculum = {
        ...state.curriculumSystem,
        profile: newProfile,
        activeFeedback: finalFeedbacks[0] || null,
        lastGeneratedFeedback: finalFeedbacks[0] || null
      };
      saveCurriculumSystem(newCurriculum);

      return {
        ...state,
        curriculumSystem: newCurriculum
      };
    }),
    dismissCurriculumFeedback: () => update(state => {
      const newCurriculum = {
        ...state.curriculumSystem,
        activeFeedback: null
      };
      return {
        ...state,
        curriculumSystem: newCurriculum
      };
    }),
    addLearningNote: (chapterId: string, content: string, stepId?: string) => update(state => {
      const newProfile = addLearningNote(state.curriculumSystem.profile, chapterId, content, stepId);
      const newCurriculum = {
        ...state.curriculumSystem,
        profile: newProfile
      };
      saveCurriculumSystem(newCurriculum);
      return {
        ...state,
        curriculumSystem: newCurriculum
      };
    }),
    resetCurriculumProgress: () => update(state => {
      const newCurriculum = createInitialCurriculumSystemState();
      saveCurriculumSystem(newCurriculum);
      return {
        ...state,
        curriculumSystem: newCurriculum
      };
    }),
    openAlbum: () => update(state => ({
      ...state,
      phase: 'album',
      selectedAlbumPhoto: null
    })),
    selectAlbumPhoto: (photo: ProcessedPhoto | null) => update(state => ({
      ...state,
      selectedAlbumPhoto: photo
    })),
    goToSelect: () => update(state => ({
      ...state,
      phase: 'select',
      selectedAlbumPhoto: null,
      isDeveloping: false,
      developmentProgress: 0,
      stageState: createInitialStageState(),
      attemptHistory: []
    })),
    retryDevelop: () => update(state => ({
      ...state,
      phase: 'select',
      isDeveloping: false,
      developmentProgress: 0,
      stageState: createInitialStageState()
    })),
    deletePhoto: (photoId: string) => update(state => {
      const newPhotos = state.processedPhotos.filter(p => p.id !== photoId);
      const saveSuccess = savePhotos(newPhotos);
      const info = getStorageInfo();
      return {
        ...state,
        processedPhotos: newPhotos,
        selectedAlbumPhoto: state.selectedAlbumPhoto?.id === photoId ? null : state.selectedAlbumPhoto,
        storageStatus: {
          ...state.storageStatus,
          lastSaveSuccess: saveSuccess,
          lastSaveError: saveSuccess ? undefined : '删除照片失败',
          photosLoaded: newPhotos.length,
          storageUsed: info.used,
          storageQuota: info.quota
        }
      };
    }),
    updatePhotoNotes: (photoId: string, notes: string) => update(state => {
      const newPhotos = state.processedPhotos.map(p =>
        p.id === photoId ? { ...p, notes } : p
      );
      const saveSuccess = savePhotos(newPhotos);
      return {
        ...state,
        processedPhotos: newPhotos,
        selectedAlbumPhoto: state.selectedAlbumPhoto?.id === photoId
          ? { ...state.selectedAlbumPhoto, notes }
          : state.selectedAlbumPhoto,
        storageStatus: {
          ...state.storageStatus,
          lastSaveSuccess: saveSuccess,
          lastSaveError: saveSuccess ? undefined : '更新照片备注失败'
        }
      };
    }),
    savePreset: (name: string, description: string, params: DevParams, subjectId?: string, filmId?: string) => update(state => {
      const existingIndex = state.presets.findIndex(p => p.name === name && !p.isDefault);
      const now = Date.now();
      
      if (existingIndex >= 0) {
        const existing = state.presets[existingIndex];
        const historyEntry: PresetHistory = {
          presetId: existing.id,
          name: existing.name,
          params: { ...existing.params },
          timestamp: existing.updatedAt
        };
        
        const newPresets = [...state.presets];
        newPresets[existingIndex] = {
          ...existing,
          description,
          params: { ...params },
          subjectId,
          filmId,
          updatedAt: now,
          version: existing.version + 1
        };
        
        const saveSuccess = savePresets(newPresets);
        const userPresets = newPresets.filter(p => !p.isDefault);
        
        return {
          ...state,
          presets: newPresets,
          presetHistory: [historyEntry, ...state.presetHistory].slice(0, 20),
          storageStatus: {
            ...state.storageStatus,
            lastSaveSuccess: saveSuccess,
            lastSaveError: saveSuccess ? undefined : '保存预设失败',
            presetsLoaded: userPresets.length
          }
        };
      } else {
        const newPreset: ParamPreset = {
          id: generateId(),
          name,
          description,
          params: { ...params },
          subjectId,
          filmId,
          createdAt: now,
          updatedAt: now,
          version: 1
        };
        
        const newPresets = [...state.presets, newPreset];
        const saveSuccess = savePresets(newPresets);
        const userPresets = newPresets.filter(p => !p.isDefault);
        
        return {
          ...state,
          presets: newPresets,
          storageStatus: {
            ...state.storageStatus,
            lastSaveSuccess: saveSuccess,
            lastSaveError: saveSuccess ? undefined : '保存预设失败',
            presetsLoaded: userPresets.length
          }
        };
      }
    }),
    applyPreset: (presetId: string) => update(state => {
      const preset = state.presets.find(p => p.id === presetId);
      if (!preset) return state;
      
      return {
        ...state,
        currentParams: { ...preset.params },
        lastAppliedPresetId: presetId
      };
    }),
    deletePreset: (presetId: string) => update(state => {
      const newPresets = state.presets.filter(p => p.id !== presetId);
      const saveSuccess = savePresets(newPresets);
      const userPresets = newPresets.filter(p => !p.isDefault);
      return {
        ...state,
        presets: newPresets,
        lastAppliedPresetId: state.lastAppliedPresetId === presetId ? null : state.lastAppliedPresetId,
        storageStatus: {
          ...state.storageStatus,
          lastSaveSuccess: saveSuccess,
          lastSaveError: saveSuccess ? undefined : '删除预设失败',
          presetsLoaded: userPresets.length
        }
      };
    }),
    revertPreset: (presetId: string, historyTimestamp: number) => update(state => {
      const historyEntry = state.presetHistory.find(h => 
        h.presetId === presetId && h.timestamp === historyTimestamp
      );
      if (!historyEntry) return state;
      
      const presetIndex = state.presets.findIndex(p => p.id === presetId);
      if (presetIndex < 0) return state;
      
      const now = Date.now();
      const existing = state.presets[presetIndex];
      const currentHistory: PresetHistory = {
        presetId: existing.id,
        name: existing.name,
        params: { ...existing.params },
        timestamp: existing.updatedAt
      };
      
      const newPresets = [...state.presets];
      newPresets[presetIndex] = {
        ...existing,
        params: { ...historyEntry.params },
        updatedAt: now,
        version: existing.version + 1
      };
      
      const saveSuccess = savePresets(newPresets);
      const userPresets = newPresets.filter(p => !p.isDefault);
      
      return {
        ...state,
        presets: newPresets,
        presetHistory: [currentHistory, ...state.presetHistory.filter(h => h !== historyEntry)].slice(0, 20),
        storageStatus: {
          ...state.storageStatus,
          lastSaveSuccess: saveSuccess,
          lastSaveError: saveSuccess ? undefined : '还原预设失败',
          presetsLoaded: userPresets.length
        }
      };
    }),
    toggleComparePhoto: (photoId: string, subjectId: string) => update(state => {
      let newSelection = [...state.compareSelection];
      let newSubjectId = state.compareSubjectId;

      if (newSelection.includes(photoId)) {
        newSelection = newSelection.filter(id => id !== photoId);
        if (newSelection.length === 0) {
          newSubjectId = null;
        }
      } else {
        if (newSubjectId && newSubjectId !== subjectId) {
          newSelection = [photoId];
        } else {
          newSelection = [...newSelection, photoId].slice(0, 4);
        }
        newSubjectId = subjectId;
      }

      return {
        ...state,
        compareSelection: newSelection,
        compareSubjectId: newSubjectId
      };
    }),
    clearCompareSelection: () => update(state => ({
      ...state,
      compareSelection: [],
      compareSubjectId: null
    })),
    openCompareView: () => update(state => ({
      ...state,
      phase: 'compare'
    })),
    closeCompareView: () => update(state => ({
      ...state,
      phase: 'album',
      compareSelection: [],
      compareSubjectId: null
    })),
    refreshStorageStatus: () => update(state => {
      const info = getStorageInfo();
      const warnings = [...state.storageStatus.warnings];
      const now = Date.now();
      
      const hasQuotaWarning = warnings.some(w => w.type === 'quota');
      if (isStorageNearLimit() && !hasQuotaWarning) {
        warnings.push({
          type: 'quota',
          message: '存储空间即将用尽，请及时清理旧数据',
          timestamp: now
        });
      } else if (!isStorageNearLimit() && hasQuotaWarning) {
        const filtered = warnings.filter(w => w.type !== 'quota');
        return {
          ...state,
          storageStatus: {
            ...state.storageStatus,
            storageUsed: info.used,
            storageQuota: info.quota,
            warnings: filtered
          }
        };
      }
      
      return {
        ...state,
        storageStatus: {
          ...state.storageStatus,
          storageUsed: info.used,
          storageQuota: info.quota,
          warnings
        }
      };
    }),
    dismissStorageWarning: (index: number) => update(state => {
      const newWarnings = [...state.storageStatus.warnings];
      newWarnings.splice(index, 1);
      return {
        ...state,
        storageStatus: {
          ...state.storageStatus,
          warnings: newWarnings
        }
      };
    }),
    clearAllStorage: () => {
      clearStorage();
      const newState = createInitialGameState();
      set(newState);
    },
    exportStorage: (): string => {
      return exportAllData();
    },
    importStorage: (json: string): { success: boolean; error?: string } => {
      const result = importAllData(json);
      if (result.success) {
        const newState = createInitialGameState();
        set(newState);
      }
      return result;
    },
    getStorageLimits: () => ({
      maxPhotos: MAX_PHOTOS,
      maxPresets: MAX_PRESETS,
      maxCollections: MAX_COLLECTIONS
    }),

    toggleFavorite: (photoId: string) => update(state => {
      const existingIndex = state.favorites.findIndex(f => f.photoId === photoId);
      let newFavorites: FavoriteInfo[];
      
      if (existingIndex >= 0) {
        newFavorites = state.favorites.filter(f => f.photoId !== photoId);
      } else {
        newFavorites = [...state.favorites, {
          photoId,
          favoritedAt: Date.now()
        }];
      }
      
      const saveSuccess = saveFavorites(newFavorites);
      const info = getStorageInfo();
      
      return {
        ...state,
        favorites: newFavorites,
        storageStatus: {
          ...state.storageStatus,
          lastSaveSuccess: saveSuccess,
          lastSaveError: saveSuccess ? undefined : '保存收藏失败',
          favoritesLoaded: newFavorites.length,
          storageUsed: info.used,
          storageQuota: info.quota
        }
      };
    }),

    isFavorite: (photoId: string): boolean => {
      let result = false;
      const unsubscribe = subscribe(state => {
        result = state.favorites.some(f => f.photoId === photoId);
      });
      unsubscribe();
      return result;
    },

    setFavoriteGroup: (photoId: string, groupId: string | undefined) => update(state => {
      const newFavorites = state.favorites.map(f => 
        f.photoId === photoId ? { ...f, groupId } : f
      );
      const saveSuccess = saveFavorites(newFavorites);
      
      return {
        ...state,
        favorites: newFavorites,
        storageStatus: {
          ...state.storageStatus,
          lastSaveSuccess: saveSuccess,
          lastSaveError: saveSuccess ? undefined : '更新收藏分组失败'
        }
      };
    }),

    createCollection: (name: string, description?: string): string | null => {
      let newCollectionId: string | null = null;
      let unsubscribe: () => void;
      
      const updateFn = (state: GameState): GameState => {
        if (state.collections.length >= MAX_COLLECTIONS) {
          return state;
        }
        
        const now = Date.now();
        const newCollection: PhotoCollection = {
          id: generateId(),
          name,
          description,
          photoIds: [],
          groups: [],
          createdAt: now,
          updatedAt: now,
          tags: []
        };
        
        newCollectionId = newCollection.id;
        const newCollections = [...state.collections, newCollection];
        const saveSuccess = saveCollections(newCollections);
        const info = getStorageInfo();
        
        return {
          ...state,
          collections: newCollections,
          storageStatus: {
            ...state.storageStatus,
            lastSaveSuccess: saveSuccess,
            lastSaveError: saveSuccess ? undefined : '创建精选集失败',
            collectionsLoaded: newCollections.length,
            storageUsed: info.used,
            storageQuota: info.quota
          }
        };
      };
      
      update(updateFn);
      return newCollectionId;
    },

    deleteCollection: (collectionId: string) => update(state => {
      const newCollections = state.collections.filter(c => c.id !== collectionId);
      const saveSuccess = saveCollections(newCollections);
      
      return {
        ...state,
        collections: newCollections,
        collectionFilter: {
          ...state.collectionFilter,
          activeCollectionId: state.collectionFilter.activeCollectionId === collectionId 
            ? null 
            : state.collectionFilter.activeCollectionId
        },
        storageStatus: {
          ...state.storageStatus,
          lastSaveSuccess: saveSuccess,
          lastSaveError: saveSuccess ? undefined : '删除精选集失败',
          collectionsLoaded: newCollections.length
        }
      };
    }),

    updateCollection: (collectionId: string, updates: Partial<Pick<PhotoCollection, 'name' | 'description' | 'tags'>>) => update(state => {
      const now = Date.now();
      const newCollections = state.collections.map(c => 
        c.id === collectionId 
          ? { ...c, ...updates, updatedAt: now }
          : c
      );
      const saveSuccess = saveCollections(newCollections);
      
      return {
        ...state,
        collections: newCollections,
        storageStatus: {
          ...state.storageStatus,
          lastSaveSuccess: saveSuccess,
          lastSaveError: saveSuccess ? undefined : '更新精选集失败'
        }
      };
    }),

    addPhotoToCollection: (collectionId: string, photoId: string) => update(state => {
      const now = Date.now();
      const newCollections = state.collections.map(c => {
        if (c.id !== collectionId) return c;
        if (c.photoIds.includes(photoId)) return c;
        return {
          ...c,
          photoIds: [...c.photoIds, photoId],
          updatedAt: now
        };
      });
      const saveSuccess = saveCollections(newCollections);
      
      return {
        ...state,
        collections: newCollections,
        storageStatus: {
          ...state.storageStatus,
          lastSaveSuccess: saveSuccess,
          lastSaveError: saveSuccess ? undefined : '添加照片到精选集失败'
        }
      };
    }),

    removePhotoFromCollection: (collectionId: string, photoId: string) => update(state => {
      const now = Date.now();
      const newCollections = state.collections.map(c => {
        if (c.id !== collectionId) return c;
        const newPhotoIds = c.photoIds.filter(id => id !== photoId);
        const newGroups = c.groups.map(g => ({
          ...g,
          photoIds: g.photoIds.filter(id => id !== photoId),
          coverPhotoId: g.coverPhotoId === photoId ? undefined : g.coverPhotoId
        }));
        return {
          ...c,
          photoIds: newPhotoIds,
          groups: newGroups,
          coverPhotoId: c.coverPhotoId === photoId ? undefined : c.coverPhotoId,
          updatedAt: now
        };
      });
      const saveSuccess = saveCollections(newCollections);
      
      return {
        ...state,
        collections: newCollections,
        storageStatus: {
          ...state.storageStatus,
          lastSaveSuccess: saveSuccess,
          lastSaveError: saveSuccess ? undefined : '从精选集移除照片失败'
        }
      };
    }),

    setCollectionCover: (collectionId: string, coverPhotoId: string | undefined) => update(state => {
      const now = Date.now();
      const newCollections = state.collections.map(c => 
        c.id === collectionId 
          ? { ...c, coverPhotoId, updatedAt: now }
          : c
      );
      const saveSuccess = saveCollections(newCollections);
      
      return {
        ...state,
        collections: newCollections,
        storageStatus: {
          ...state.storageStatus,
          lastSaveSuccess: saveSuccess,
          lastSaveError: saveSuccess ? undefined : '设置精选集封面失败'
        }
      };
    }),

    createGroup: (collectionId: string, name: string, description?: string): string | null => {
      let newGroupId: string | null = null;
      
      const updateFn = (state: GameState): GameState => {
        const now = Date.now();
        const newCollections = state.collections.map(c => {
          if (c.id !== collectionId) return c;
          const newGroup: CollectionGroup = {
            id: generateId(),
            name,
            description,
            photoIds: [],
            createdAt: now,
            updatedAt: now
          };
          newGroupId = newGroup.id;
          return {
            ...c,
            groups: [...c.groups, newGroup],
            updatedAt: now
          };
        });
        const saveSuccess = saveCollections(newCollections);
        
        return {
          ...state,
          collections: newCollections,
          storageStatus: {
            ...state.storageStatus,
            lastSaveSuccess: saveSuccess,
            lastSaveError: saveSuccess ? undefined : '创建分组失败'
          }
        };
      };
      
      update(updateFn);
      return newGroupId;
    },

    deleteGroup: (collectionId: string, groupId: string) => update(state => {
      const now = Date.now();
      const newCollections = state.collections.map(c => {
        if (c.id !== collectionId) return c;
        return {
          ...c,
          groups: c.groups.filter(g => g.id !== groupId),
          updatedAt: now
        };
      });
      const saveSuccess = saveCollections(newCollections);
      
      return {
        ...state,
        collections: newCollections,
        collectionFilter: {
          ...state.collectionFilter,
          activeGroupId: state.collectionFilter.activeGroupId === groupId 
            ? null 
            : state.collectionFilter.activeGroupId
        },
        storageStatus: {
          ...state.storageStatus,
          lastSaveSuccess: saveSuccess,
          lastSaveError: saveSuccess ? undefined : '删除分组失败'
        }
      };
    }),

    updateGroup: (collectionId: string, groupId: string, updates: Partial<Pick<CollectionGroup, 'name' | 'description'>>) => update(state => {
      const now = Date.now();
      const newCollections = state.collections.map(c => {
        if (c.id !== collectionId) return c;
        return {
          ...c,
          groups: c.groups.map(g => 
            g.id === groupId ? { ...g, ...updates, updatedAt: now } : g
          ),
          updatedAt: now
        };
      });
      const saveSuccess = saveCollections(newCollections);
      
      return {
        ...state,
        collections: newCollections,
        storageStatus: {
          ...state.storageStatus,
          lastSaveSuccess: saveSuccess,
          lastSaveError: saveSuccess ? undefined : '更新分组失败'
        }
      };
    }),

    addPhotoToGroup: (collectionId: string, groupId: string, photoId: string) => update(state => {
      const now = Date.now();
      const newCollections = state.collections.map(c => {
        if (c.id !== collectionId) return c;
        return {
          ...c,
          groups: c.groups.map(g => {
            if (g.id !== groupId) return g;
            if (g.photoIds.includes(photoId)) return g;
            return {
              ...g,
              photoIds: [...g.photoIds, photoId],
              updatedAt: now
            };
          }),
          photoIds: c.photoIds.includes(photoId) 
            ? c.photoIds 
            : [...c.photoIds, photoId],
          updatedAt: now
        };
      });
      const saveSuccess = saveCollections(newCollections);
      
      return {
        ...state,
        collections: newCollections,
        storageStatus: {
          ...state.storageStatus,
          lastSaveSuccess: saveSuccess,
          lastSaveError: saveSuccess ? undefined : '添加照片到分组失败'
        }
      };
    }),

    removePhotoFromGroup: (collectionId: string, groupId: string, photoId: string) => update(state => {
      const now = Date.now();
      const newCollections = state.collections.map(c => {
        if (c.id !== collectionId) return c;
        return {
          ...c,
          groups: c.groups.map(g => {
            if (g.id !== groupId) return g;
            return {
              ...g,
              photoIds: g.photoIds.filter(id => id !== photoId),
              coverPhotoId: g.coverPhotoId === photoId ? undefined : g.coverPhotoId,
              updatedAt: now
            };
          }),
          updatedAt: now
        };
      });
      const saveSuccess = saveCollections(newCollections);
      
      return {
        ...state,
        collections: newCollections,
        storageStatus: {
          ...state.storageStatus,
          lastSaveSuccess: saveSuccess,
          lastSaveError: saveSuccess ? undefined : '从分组移除照片失败'
        }
      };
    }),

    setGroupCover: (collectionId: string, groupId: string, coverPhotoId: string | undefined) => update(state => {
      const now = Date.now();
      const newCollections = state.collections.map(c => {
        if (c.id !== collectionId) return c;
        return {
          ...c,
          groups: c.groups.map(g => 
            g.id === groupId ? { ...g, coverPhotoId, updatedAt: now } : g
          ),
          updatedAt: now
        };
      });
      const saveSuccess = saveCollections(newCollections);
      
      return {
        ...state,
        collections: newCollections,
        storageStatus: {
          ...state.storageStatus,
          lastSaveSuccess: saveSuccess,
          lastSaveError: saveSuccess ? undefined : '设置分组封面失败'
        }
      };
    }),

    setAlbumViewMode: (mode: AlbumViewMode) => update(state => ({
      ...state,
      collectionFilter: {
        ...state.collectionFilter,
        viewMode: mode,
        activeCollectionId: null,
        activeGroupId: null
      }
    })),

    setActiveCollection: (collectionId: string | null) => update(state => ({
      ...state,
      collectionFilter: {
        ...state.collectionFilter,
        activeCollectionId: collectionId,
        activeGroupId: null
      }
    })),

    setActiveGroup: (groupId: string | null) => update(state => ({
      ...state,
      collectionFilter: {
        ...state.collectionFilter,
        activeGroupId: groupId
      }
    })),

    startQuickBrowse: (photoIds: string[], startIndex: number = 0) => update(state => ({
      ...state,
      quickBrowsePhotoIds: photoIds,
      quickBrowseIndex: startIndex
    })),

    nextQuickBrowse: () => update(state => {
      if (state.quickBrowsePhotoIds.length === 0) return state;
      const nextIndex = (state.quickBrowseIndex + 1) % state.quickBrowsePhotoIds.length;
      return { ...state, quickBrowseIndex: nextIndex };
    }),

    prevQuickBrowse: () => update(state => {
      if (state.quickBrowsePhotoIds.length === 0) return state;
      const prevIndex = state.quickBrowseIndex === 0 
        ? state.quickBrowsePhotoIds.length - 1 
        : state.quickBrowseIndex - 1;
      return { ...state, quickBrowseIndex: prevIndex };
    }),

    exitQuickBrowse: () => update(state => ({
      ...state,
      quickBrowsePhotoIds: [],
      quickBrowseIndex: 0
    })),

    clearNewlyUnlocked: () => update(state => {
      const newState: AchievementState = {
        ...state.achievements,
        newlyUnlocked: []
      };
      saveAchievements(newState);
      return { ...state, achievements: newState };
    }),

    reset: () => {
      const newState = createInitialGameState();
      set(newState);
    },

    createOrder: (customer: CustomerInfo, requirements: OrderRequirements, priority: OrderPriority = 'normal'): string | null => {
      let newOrderId: string | null = null;
      
      const updateFn = (state: GameState): GameState => {
        if (state.orders.length >= MAX_ORDERS) {
          return state;
        }
        
        const now = Date.now();
        const matchedFilms = matchFilmsForOrder(requirements);
        const recommendedFilm = matchedFilms.find(f => f.isRecommended);
        
        const newOrder: DarkroomOrder = {
          id: generateId(),
          orderNumber: generateOrderNumber(),
          customer: { ...customer },
          requirements: { ...requirements },
          status: 'pending',
          priority,
          matchedFilms,
          selectedFilmId: recommendedFilm?.filmId,
          photoIds: [],
          createdAt: now,
          updatedAt: now
        };
        
        newOrderId = newOrder.id;
        const newOrders = [newOrder, ...state.orders];
        const saveSuccess = saveOrders(newOrders);
        const info = getStorageInfo();
        
        return {
          ...state,
          orders: newOrders,
          currentOrderId: newOrder.id,
          storageStatus: {
            ...state.storageStatus,
            lastSaveSuccess: saveSuccess,
            lastSaveError: saveSuccess ? undefined : '创建订单失败',
            ordersLoaded: newOrders.length,
            storageUsed: info.used,
            storageQuota: info.quota
          }
        };
      };
      
      update(updateFn);
      return newOrderId;
    },

    updateOrder: (orderId: string, updates: Partial<DarkroomOrder>) => update(state => {
      const now = Date.now();
      const newOrders = state.orders.map(o =>
        o.id === orderId ? { ...o, ...updates, updatedAt: now } : o
      );
      const saveSuccess = saveOrders(newOrders);
      
      return {
        ...state,
        orders: newOrders,
        storageStatus: {
          ...state.storageStatus,
          lastSaveSuccess: saveSuccess,
          lastSaveError: saveSuccess ? undefined : '更新订单失败'
        }
      };
    }),

    deleteOrder: (orderId: string) => update(state => {
      const newOrders = state.orders.filter(o => o.id !== orderId);
      const saveSuccess = saveOrders(newOrders);
      
      return {
        ...state,
        orders: newOrders,
        currentOrderId: state.currentOrderId === orderId ? null : state.currentOrderId,
        storageStatus: {
          ...state.storageStatus,
          lastSaveSuccess: saveSuccess,
          lastSaveError: saveSuccess ? undefined : '删除订单失败',
          ordersLoaded: newOrders.length
        }
      };
    }),

    setCurrentOrder: (orderId: string | null) => update(state => ({
      ...state,
      currentOrderId: orderId
    })),

    selectFilmForOrder: (orderId: string, filmId: string) => update(state => {
      const now = Date.now();
      const newOrders = state.orders.map(o => {
        if (o.id !== orderId) return o;
        return {
          ...o,
          selectedFilmId: filmId,
          status: 'matched' as OrderStatus,
          updatedAt: now
        };
      });
      const saveSuccess = saveOrders(newOrders);
      
      return {
        ...state,
        orders: newOrders,
        storageStatus: {
          ...state.storageStatus,
          lastSaveSuccess: saveSuccess,
          lastSaveError: saveSuccess ? undefined : '选择胶片失败'
        }
      };
    }),

    matchFilms: (requirements: OrderRequirements): FilmMatch[] => {
      return matchFilmsForOrder(requirements);
    },

    scheduleOrder: (orderId: string, slotId: string, developer: string = '技师A') => update(state => {
      const slot = state.orderScheduleSlots.find(s => s.id === slotId);
      if (!slot || slot.filled >= slot.capacity) return state;
      
      const now = Date.now();
      const estimatedDuration = 30 * 60 * 1000;
      
      const newOrders = state.orders.map(o => {
        if (o.id !== orderId) return o;
        return {
          ...o,
          status: 'scheduled' as OrderStatus,
          schedule: {
            slotId,
            scheduledAt: slot.date,
            estimatedDuration,
            developer
          },
          updatedAt: now
        };
      });
      
      const newSlots = state.orderScheduleSlots.map(s => 
        s.id === slotId ? { ...s, filled: s.filled + 1 } : s
      );
      
      const saveSuccess = saveOrders(newOrders);
      
      return {
        ...state,
        orders: newOrders,
        orderScheduleSlots: newSlots,
        storageStatus: {
          ...state.storageStatus,
          lastSaveSuccess: saveSuccess,
          lastSaveError: saveSuccess ? undefined : '预约排期失败'
        }
      };
    }),

    startOrderDevelopment: (orderId: string, subjectId: string) => update(state => {
      const now = Date.now();
      const order = state.orders.find(o => o.id === orderId);
      if (!order) return state;
      
      const newOrders = state.orders.map(o => {
        if (o.id !== orderId) return o;
        return {
          ...o,
          status: 'developing' as OrderStatus,
          selectedSubjectId: subjectId,
          updatedAt: now
        };
      });
      const saveSuccess = saveOrders(newOrders);
      
      return {
        ...state,
        orders: newOrders,
        currentOrderId: orderId,
        phase: 'select',
        storageStatus: {
          ...state.storageStatus,
          lastSaveSuccess: saveSuccess,
          lastSaveError: saveSuccess ? undefined : '开始冲洗失败'
        }
      };
    }),

    completeOrderDevelopment: (orderId: string, photoId: string) => update(state => {
      const now = Date.now();
      const order = state.orders.find(o => o.id === orderId);
      if (!order) return state;
      
      const newPhotoIds = [...order.photoIds, photoId];
      const isAllComplete = newPhotoIds.length >= order.requirements.quantity;
      
      const newOrders = state.orders.map(o => {
        if (o.id !== orderId) return o;
        return {
          ...o,
          status: isAllComplete ? 'scoring' as OrderStatus : 'developing' as OrderStatus,
          photoIds: newPhotoIds,
          updatedAt: now,
          completedAt: isAllComplete ? now : undefined
        };
      });
      const saveSuccess = saveOrders(newOrders);
      
      return {
        ...state,
        orders: newOrders,
        storageStatus: {
          ...state.storageStatus,
          lastSaveSuccess: saveSuccess,
          lastSaveError: saveSuccess ? undefined : '完成冲洗失败'
        }
      };
    }),

    submitScoreFeedback: (orderId: string, feedback: Omit<import('../types/game').OrderScoreFeedback, 'ratedAt'>) => update(state => {
      const now = Date.now();
      const newOrders = state.orders.map(o => {
        if (o.id !== orderId) return o;
        return {
          ...o,
          status: 'completed' as OrderStatus,
          scoreFeedback: {
            ...feedback,
            ratedAt: now
          },
          updatedAt: now
        };
      });
      const saveSuccess = saveOrders(newOrders);
      
      return {
        ...state,
        orders: newOrders,
        storageStatus: {
          ...state.storageStatus,
          lastSaveSuccess: saveSuccess,
          lastSaveError: saveSuccess ? undefined : '提交评价失败'
        }
      };
    }),

    archiveOrder: (orderId: string, archiveNotes?: string, collectionId?: string) => update(state => {
      const now = Date.now();
      const newOrders = state.orders.map(o => {
        if (o.id !== orderId) return o;
        return {
          ...o,
          status: 'archived' as OrderStatus,
          archiveInfo: {
            archivedAt: now,
            albumCollectionId: collectionId,
            archiveNotes
          },
          updatedAt: now
        };
      });
      const saveSuccess = saveOrders(newOrders);
      
      return {
        ...state,
        orders: newOrders,
        storageStatus: {
          ...state.storageStatus,
          lastSaveSuccess: saveSuccess,
          lastSaveError: saveSuccess ? undefined : '归档订单失败'
        }
      };
    }),

    updateOrderFilter: (filter: Partial<OrderFilter>) => update(state => ({
      ...state,
      orderFilter: { ...state.orderFilter, ...filter }
    })),

    refreshScheduleSlots: () => update(state => ({
      ...state,
      orderScheduleSlots: generateDefaultScheduleSlots()
    })),

    getOrderById: (orderId: string): DarkroomOrder | undefined => {
      let result: DarkroomOrder | undefined;
      const unsubscribe = subscribe(state => {
        result = state.orders.find(o => o.id === orderId);
      });
      unsubscribe();
      return result;
    },

    addPhotoToOrder: (orderId: string, photoId: string) => update(state => {
      const now = Date.now();
      const newOrders = state.orders.map(o => {
        if (o.id !== orderId) return o;
        if (o.photoIds.includes(photoId)) return o;
        return {
          ...o,
          photoIds: [...o.photoIds, photoId],
          updatedAt: now
        };
      });
      const saveSuccess = saveOrders(newOrders);
      
      return {
        ...state,
        orders: newOrders,
        storageStatus: {
          ...state.storageStatus,
          lastSaveSuccess: saveSuccess,
          lastSaveError: saveSuccess ? undefined : '添加照片到订单失败'
        }
      };
    }),

    setFilmLabTab: (tab: FilmLabTab) => update(state => ({
      ...state,
      filmLab: { ...state.filmLab, activeTab: tab }
    })),

    selectRecipe: (recipeId: string | null) => update(state => ({
      ...state,
      filmLab: { ...state.filmLab, selectedRecipeId: recipeId }
    })),

    selectSolution: (solutionId: string | null) => update(state => ({
      ...state,
      filmLab: { ...state.filmLab, selectedSolutionId: solutionId }
    })),

    selectChemical: (chemicalId: string | null) => update(state => ({
      ...state,
      filmLab: { ...state.filmLab, selectedChemicalId: chemicalId }
    })),

    createRecipe: (data: {
      name: string;
      processType: FilmProcessType;
      description: string;
      developerId?: string;
      stopBathId?: string;
      fixerId?: string;
      washingAidId?: string;
      wettingAgentId?: string;
      developmentParams: { temperature: number; timeMultiplier: number; agitation: number; dilution: number };
      suitableFilmIds: string[];
      suitableSceneTypes: string[];
      tags: string[];
    }): string | null => {
      let newRecipeId: string | null = null;
      const updateFn = (state: GameState): GameState => {
        const now = Date.now();
        const id = generateId();
        newRecipeId = id;
        const newRecipe: DeveloperRecipe = {
          id,
          name: data.name,
          processType: data.processType,
          description: data.description,
          developerId: data.developerId,
          stopBathId: data.stopBathId,
          fixerId: data.fixerId,
          washingAidId: data.washingAidId,
          wettingAgentId: data.wettingAgentId,
          developmentParams: { ...data.developmentParams },
          suitableFilmIds: [...data.suitableFilmIds],
          suitableSceneTypes: [...data.suitableSceneTypes],
          tags: [...data.tags],
          versionHistory: [{
            version: 1,
            timestamp: now,
            name: data.name,
            developerId: data.developerId,
            stopBathId: data.stopBathId,
            fixerId: data.fixerId,
            washingAidId: data.washingAidId,
            wettingAgentId: data.wettingAgentId,
            developmentParams: { ...data.developmentParams },
            changeNote: '初始版本'
          }],
          createdAt: now,
          updatedAt: now,
          version: 1
        };
        return {
          ...state,
          filmLab: {
            ...state.filmLab,
            recipes: [...state.filmLab.recipes, newRecipe],
            selectedRecipeId: id
          }
        };
      };
      update(updateFn);
      return newRecipeId;
    },

    updateRecipe: (recipeId: string, updates: Partial<Omit<DeveloperRecipe, 'id' | 'createdAt' | 'versionHistory' | 'version'>>, changeNote?: string) => update(state => {
      const now = Date.now();
      const existing = state.filmLab.recipes.find(r => r.id === recipeId);
      if (!existing) return state;

      const historyEntry: RecipeVersion = {
        version: existing.version,
        timestamp: existing.updatedAt,
        name: existing.name,
        developerId: existing.developerId,
        stopBathId: existing.stopBathId,
        fixerId: existing.fixerId,
        washingAidId: existing.washingAidId,
        wettingAgentId: existing.wettingAgentId,
        developmentParams: { ...existing.developmentParams },
        changeNote
      };

      const newRecipes = state.filmLab.recipes.map(r => {
        if (r.id !== recipeId) return r;
        return {
          ...r,
          ...updates,
          versionHistory: [historyEntry, ...r.versionHistory].slice(0, 20),
          updatedAt: now,
          version: r.version + 1
        };
      });

      return {
        ...state,
        filmLab: {
          ...state.filmLab,
          recipes: newRecipes
        }
      };
    }),

    deleteRecipe: (recipeId: string) => update(state => {
      const newRecipes = state.filmLab.recipes.filter(r => r.id !== recipeId);
      return {
        ...state,
        filmLab: {
          ...state.filmLab,
          recipes: newRecipes,
          selectedRecipeId: state.filmLab.selectedRecipeId === recipeId ? null : state.filmLab.selectedRecipeId
        }
      };
    }),

    revertRecipeToVersion: (recipeId: string, versionNumber: number) => update(state => {
      const recipe = state.filmLab.recipes.find(r => r.id === recipeId);
      if (!recipe) return state;

      const targetVersion = recipe.versionHistory.find(v => v.version === versionNumber);
      if (!targetVersion) return state;

      const now = Date.now();
      const historyEntry: RecipeVersion = {
        version: recipe.version,
        timestamp: recipe.updatedAt,
        name: recipe.name,
        developerId: recipe.developerId,
        stopBathId: recipe.stopBathId,
        fixerId: recipe.fixerId,
        washingAidId: recipe.washingAidId,
        wettingAgentId: recipe.wettingAgentId,
        developmentParams: { ...recipe.developmentParams },
        changeNote: `回退到版本 ${versionNumber}`
      };

      const newRecipes = state.filmLab.recipes.map(r => {
        if (r.id !== recipeId) return r;
        return {
          ...r,
          name: targetVersion.name,
          developerId: targetVersion.developerId,
          stopBathId: targetVersion.stopBathId,
          fixerId: targetVersion.fixerId,
          washingAidId: targetVersion.washingAidId,
          wettingAgentId: targetVersion.wettingAgentId,
          developmentParams: { ...targetVersion.developmentParams },
          versionHistory: [historyEntry, ...r.versionHistory].slice(0, 20),
          updatedAt: now,
          version: r.version + 1
        };
      });

      return {
        ...state,
        filmLab: {
          ...state.filmLab,
          recipes: newRecipes
        }
      };
    }),

    createSolution: (data: {
      name: string;
      type: SolutionType;
      components: SolutionComponent[];
      totalVolume: number;
      volumeUnit: 'ml' | 'l';
      ph?: number;
      notes?: string;
    }): string | null => {
      let newSolutionId: string | null = null;
      const updateFn = (state: GameState): GameState => {
        const now = Date.now();
        const id = generateId();
        newSolutionId = id;
        const newSolution: ChemicalSolution = {
          id,
          name: data.name,
          type: data.type,
          components: data.components.map(c => ({ ...c })),
          totalVolume: data.totalVolume,
          volumeUnit: data.volumeUnit,
          ph: data.ph,
          notes: data.notes,
          createdAt: now,
          updatedAt: now,
          version: 1
        };
        return {
          ...state,
          filmLab: {
            ...state.filmLab,
            solutions: [...state.filmLab.solutions, newSolution],
            selectedSolutionId: id
          }
        };
      };
      update(updateFn);
      return newSolutionId;
    },

    updateSolution: (solutionId: string, updates: Partial<Omit<ChemicalSolution, 'id' | 'createdAt' | 'version'>>) => update(state => {
      const now = Date.now();
      const newSolutions = state.filmLab.solutions.map(s => {
        if (s.id !== solutionId) return s;
        return {
          ...s,
          ...updates,
          updatedAt: now,
          version: s.version + 1
        };
      });
      return {
        ...state,
        filmLab: {
          ...state.filmLab,
          solutions: newSolutions
        }
      };
    }),

    deleteSolution: (solutionId: string) => update(state => {
      const newSolutions = state.filmLab.solutions.filter(s => s.id !== solutionId);
      return {
        ...state,
        filmLab: {
          ...state.filmLab,
          solutions: newSolutions,
          selectedSolutionId: state.filmLab.selectedSolutionId === solutionId ? null : state.filmLab.selectedSolutionId
        }
      };
    }),

    applyRecipeToParams: (recipeId: string) => update(state => {
      const recipe = state.filmLab.recipes.find(r => r.id === recipeId);
      if (!recipe) return state;
      const params = {
        exposure: state.currentParams.exposure,
        developmentTime: recipe.developmentParams.timeMultiplier,
        temperature: recipe.developmentParams.temperature,
        agitation: recipe.developmentParams.agitation,
        contrast: state.currentParams.contrast,
        saturation: state.currentParams.saturation,
        dilution: recipe.developmentParams.dilution
      };
      return {
        ...state,
        currentParams: params
      };
    }),

    runTrial: (recipeId: string, filmId: string, subjectId?: string) => update(state => {
      const recipe = state.filmLab.recipes.find(r => r.id === recipeId);
      if (!recipe) return state;
      const trial = createTrialResult(recipe, filmId, subjectId);
      return {
        ...state,
        filmLab: {
          ...state.filmLab,
          trialHistory: [trial, ...state.filmLab.trialHistory].slice(0, 50)
        }
      };
    }),

    clearTrialHistory: () => update(state => ({
      ...state,
      filmLab: {
        ...state.filmLab,
        trialHistory: []
      }
    })),

    runCompare: (recipeIds: string[], filmId: string, subjectId?: string) => update(state => {
      if (recipeIds.length < 2) return state;
      const result = compareRecipes(recipeIds, state.filmLab.recipes, filmId, subjectId);
      return {
        ...state,
        filmLab: {
          ...state.filmLab,
          compareHistory: [result, ...state.filmLab.compareHistory].slice(0, 20)
        }
      };
    }),

    clearCompareHistory: () => update(state => ({
      ...state,
      filmLab: {
        ...state.filmLab,
        compareHistory: []
      }
    })),

    setActiveQuest: (questId: string | null) => update(state => {
      const newQuestSystem = setActiveQuest(state.questSystem, questId);
      saveQuestSystem(newQuestSystem);
      return {
        ...state,
        questSystem: newQuestSystem
      };
    }),

    claimQuestRewards: (questId: string) => update(state => {
      const result = claimQuestRewards(state.questSystem, questId);
      saveQuestSystem(result.state);
      return {
        ...state,
        questSystem: result.state
      };
    }),

    claimStageBonus: (stageId: string) => update(state => {
      const result = claimStageBonus(state.questSystem, stageId);
      saveQuestSystem(result.state);
      return {
        ...state,
        questSystem: result.state
      };
    }),

    resetQuestProgress: () => update(state => {
      const newQuestSystem = createInitialQuestSystemState();
      saveQuestSystem(newQuestSystem);
      return {
        ...state,
        questSystem: newQuestSystem
      };
    }),

    checkFilmRestrictionsForQuest: (questId: string, filmId: string, subjectId: string): { valid: boolean; warnings: string[] } => {
      const warnings: string[] = [];
      const valid = validateFilmRestrictions(
        getQuestById(questId),
        filmId,
        subjectId,
        warnings
      );
      return { valid, warnings };
    },

    getQuestStatus: (questId: string): QuestStatus | undefined => {
      let result: QuestStatus | undefined;
      const unsubscribe = subscribe(state => {
        result = getQuestStatusFromState(state.questSystem, getQuestById(questId));
      });
      unsubscribe();
      return result;
    },

    getStageStatus: (stageId: string): StageStatus | undefined => {
      let result: StageStatus | undefined;
      const unsubscribe = subscribe(state => {
        result = getStageStatusFromState(state.questSystem, getStageById(stageId));
      });
      unsubscribe();
      return result;
    },

    clearLastQuestRewards: () => update(state => ({
      ...state,
      questSystem: {
        ...state.questSystem,
        lastClaimedRewards: null
      }
    })),

    setReviewTab: (tab: ReviewSystemState['activeTab']) => update(state => {
      const newReviewSystem = { ...state.reviewSystem, activeTab: tab };
      saveReviewSystem(newReviewSystem);
      return { ...state, reviewSystem: newReviewSystem };
    }),

    setActiveContest: (contestId: string | null) => update(state => {
      const newReviewSystem = { ...state.reviewSystem, activeContestId: contestId };
      saveReviewSystem(newReviewSystem);
      return { ...state, reviewSystem: newReviewSystem };
    }),

    setSelectedSubmission: (submissionId: string | null) => update(state => {
      const newReviewSystem = { ...state.reviewSystem, selectedSubmissionId: submissionId };
      saveReviewSystem(newReviewSystem);
      return { ...state, reviewSystem: newReviewSystem };
    }),

    setLeaderboardFilter: (filter: Partial<LeaderboardFilter>) => update(state => {
      const newReviewSystem = {
        ...state.reviewSystem,
        leaderboardFilter: { ...state.reviewSystem.leaderboardFilter, ...filter }
      };
      saveReviewSystem(newReviewSystem);
      return { ...state, reviewSystem: newReviewSystem };
    }),

    submitToReview: (photo: ProcessedPhoto, title: string, description: string, tags: string[], contestId?: string) => update(state => {
      const { state: newReviewState } = submitWork(state.reviewSystem, photo, title, description, tags, contestId);
      saveReviewSystem(newReviewState);
      return { ...state, reviewSystem: newReviewState };
    }),

    addAutomatedReviews: (submissionId: string, photo: ProcessedPhoto) => update(state => {
      let newReviewSystem = state.reviewSystem;
      const submission = newReviewSystem.submissions.find(s => s.id === submissionId);
      if (!submission) return state;

      const contest = submission.contestId ? getContestById(newReviewSystem, submission.contestId) : null;
      const dimensions = contest?.dimensions || REVIEW_DIMENSIONS;
      const autoReviewers = REVIEWERS.filter(r => r.role === 'automated' || r.role === 'junior');

      autoReviewers.slice(0, 3).forEach(reviewer => {
        const review = generateAutomatedReview(submission, photo, dimensions, reviewer);
        newReviewSystem = addReview(newReviewSystem, submissionId, review);
      });

      saveReviewSystem(newReviewSystem);
      return { ...state, reviewSystem: newReviewSystem };
    }),

    submitDispute: (submissionId: string, reason: string) => update(state => {
      const { state: newReviewState } = submitDispute(state.reviewSystem, submissionId, reason);
      saveReviewSystem(newReviewState);
      return { ...state, reviewSystem: newReviewState };
    }),

    resolveDispute: (submissionId: string, resolution: 'upheld' | 'rejected' | 'modified', note: string, newScore?: number) => update(state => {
      const newReviewSystem = resolveDispute(state.reviewSystem, submissionId, resolution, note, 'admin', newScore);
      saveReviewSystem(newReviewSystem);
      return { ...state, reviewSystem: newReviewSystem };
    }),

    finalizeSubmissionReview: (submissionId: string) => update(state => {
      let newReviewSystem = finalizeSubmission(state.reviewSystem, submissionId);
      const submission = newReviewSystem.submissions.find(s => s.id === submissionId);
      if (submission?.contestId) {
        newReviewSystem = updateLeaderboardRanking(newReviewSystem, submission.contestId);
      }
      saveReviewSystem(newReviewSystem);
      return { ...state, reviewSystem: newReviewSystem };
    }),

    setInventoryTab: (tab: InventorySystemState['activeTab']) => update(state => {
      const newInventorySystem = { ...state.inventorySystem, activeTab: tab };
      saveInventorySystem(newInventorySystem);
      return { ...state, inventorySystem: newInventorySystem };
    }),

    setInventorySelectedFilm: (filmId: string | null) => update(state => {
      const newInventorySystem = { ...state.inventorySystem, selectedFilmId: filmId };
      saveInventorySystem(newInventorySystem);
      return { ...state, inventorySystem: newInventorySystem };
    }),

    setInventoryFilter: (filter: Partial<InventoryFilter>) => update(state => {
      const newInventorySystem = {
        ...state.inventorySystem,
        filter: { ...state.inventorySystem.filter, ...filter }
      };
      saveInventorySystem(newInventorySystem);
      return { ...state, inventorySystem: newInventorySystem };
    }),

    stockInFilm: (filmId: string, quantity: number, source: StockInSource, options?: {
      unitPrice?: number;
      totalPrice?: number;
      supplier?: string;
      batchNumber?: string;
      expireDate?: number;
      notes?: string;
      operator?: string;
    }) => update(state => {
      const { state: newInventoryState } = stockIn(state.inventorySystem, filmId, quantity, source, options);
      saveInventorySystem(newInventoryState);
      return { ...state, inventorySystem: newInventoryState };
    }),

    consumeFilm: (filmId: string, quantity: number, type: StockConsumeType, options?: {
      relatedPhotoId?: string;
      relatedOrderId?: string;
      subjectId?: string;
      notes?: string;
      operator?: string;
    }) => update(state => {
      const { state: newInventoryState, success, error } = consumeStock(state.inventorySystem, filmId, quantity, type, options);
      if (success) {
        saveInventorySystem(newInventoryState);
        return { ...state, inventorySystem: newInventoryState };
      }
      return state;
    }),

    scrapFilm: (filmId: string, quantity: number, reason: StockScrapReason, options?: {
      description?: string;
      notes?: string;
      operator?: string;
    }) => update(state => {
      const { state: newInventoryState, success } = scrapStock(state.inventorySystem, filmId, quantity, reason, options);
      if (success) {
        saveInventorySystem(newInventoryState);
        return { ...state, inventorySystem: newInventoryState };
      }
      return state;
    }),

    dismissInventoryAlert: (alertId: string) => update(state => {
      const newInventoryState = dismissAlert(state.inventorySystem, alertId);
      saveInventorySystem(newInventoryState);
      return { ...state, inventorySystem: newInventoryState };
    }),

    dismissAllInventoryAlerts: () => update(state => {
      const newInventoryState = dismissAllAlerts(state.inventorySystem);
      saveInventorySystem(newInventoryState);
      return { ...state, inventorySystem: newInventoryState };
    }),

    setFilmWarningThresholds: (filmId: string, minWarning: number, criticalWarning: number) => update(state => {
      const newInventoryState = setWarningThresholds(state.inventorySystem, filmId, minWarning, criticalWarning);
      saveInventorySystem(newInventoryState);
      return { ...state, inventorySystem: newInventoryState };
    }),

    hideInventoryAlertBadge: () => update(state => {
      const newInventorySystem = { ...state.inventorySystem, showAlertBadge: false };
      saveInventorySystem(newInventorySystem);
      return { ...state, inventorySystem: newInventorySystem };
    }),

    createPublication: (title: string, authorName: string): string | null => {
      let newId: string | null = null;
      update(state => {
        const now = Date.now();
        const newPublication: Publication = {
          id: generateId(),
          title,
          authorName,
          photos: [],
          pages: [],
          cover: {
            style: 'classic',
            title,
            subtitle: authorName,
            coverPhotoId: null,
            backgroundColor: '#1a0f0a',
            showDate: true
          },
          step: 'select',
          createdAt: now,
          updatedAt: now
        };
        newId = newPublication.id;
        return {
          ...state,
          publicationSystem: {
            ...state.publicationSystem,
            publications: [...state.publicationSystem.publications, newPublication],
            activePublicationId: newId,
            activeStep: 'select'
          }
        };
      });
      if (newId) {
        const unsubscribe = subscribe(s => { savePublicationSystem(s.publicationSystem); });
        unsubscribe();
      }
      return newId;
    },

    setActivePublication: (publicationId: string | null) => update(state => {
      const pub = state.publicationSystem.publications.find(p => p.id === publicationId);
      const newPubSystem = {
        ...state.publicationSystem,
        activePublicationId: publicationId,
        activeStep: pub?.step || 'select'
      };
      savePublicationSystem(newPubSystem);
      return {
        ...state,
        publicationSystem: newPubSystem
      };
    }),

    setPublicationStep: (step: PublicationStep) => update(state => {
      const { activePublicationId } = state.publicationSystem;
      if (!activePublicationId) return state;
      const now = Date.now();
      const newPubs = state.publicationSystem.publications.map(p =>
        p.id === activePublicationId ? { ...p, step, updatedAt: now } : p
      );
      const newPubSystem = { ...state.publicationSystem, publications: newPubs, activeStep: step };
      savePublicationSystem(newPubSystem);
      return { ...state, publicationSystem: newPubSystem };
    }),

    addPhotoToPublication: (photoId: string) => update(state => {
      const { activePublicationId } = state.publicationSystem;
      if (!activePublicationId) return state;
      const now = Date.now();
      const newPubs = state.publicationSystem.publications.map(p => {
        if (p.id !== activePublicationId) return p;
        if (p.photos.some(pp => pp.photoId === photoId)) return p;
        const newPubPhoto: PublicationPhoto = {
          photoId,
          crop: { x: 0, y: 0, width: 100, height: 100, aspectRatio: 'free' },
          caption: '',
          pageSlot: p.photos.length
        };
        return { ...p, photos: [...p.photos, newPubPhoto], updatedAt: now };
      });
      const newPubSystem = { ...state.publicationSystem, publications: newPubs };
      savePublicationSystem(newPubSystem);
      return { ...state, publicationSystem: newPubSystem };
    }),

    removePhotoFromPublication: (photoId: string) => update(state => {
      const { activePublicationId } = state.publicationSystem;
      if (!activePublicationId) return state;
      const now = Date.now();
      const newPubs = state.publicationSystem.publications.map(p => {
        if (p.id !== activePublicationId) return p;
        const newPhotos = p.photos.filter(pp => pp.photoId !== photoId).map((pp, i) => ({ ...pp, pageSlot: i }));
        return { ...p, photos: newPhotos, updatedAt: now };
      });
      const newPubSystem = { ...state.publicationSystem, publications: newPubs };
      savePublicationSystem(newPubSystem);
      return { ...state, publicationSystem: newPubSystem };
    }),

    reorderPublicationPhotos: (photoIds: string[]) => update(state => {
      const { activePublicationId } = state.publicationSystem;
      if (!activePublicationId) return state;
      const now = Date.now();
      const newPubs = state.publicationSystem.publications.map(p => {
        if (p.id !== activePublicationId) return p;
        const reordered = photoIds.map((id, i) => {
          const existing = p.photos.find(pp => pp.photoId === id);
          return existing ? { ...existing, pageSlot: i } : { photoId: id, crop: { x: 0, y: 0, width: 100, height: 100, aspectRatio: 'free' as const }, caption: '', pageSlot: i };
        });
        return { ...p, photos: reordered, updatedAt: now };
      });
      const newPubSystem = { ...state.publicationSystem, publications: newPubs };
      savePublicationSystem(newPubSystem);
      return { ...state, publicationSystem: newPubSystem };
    }),

    updatePublicationPhotoCrop: (photoId: string, crop: Partial<PublicationCrop>) => update(state => {
      const { activePublicationId } = state.publicationSystem;
      if (!activePublicationId) return state;
      const now = Date.now();
      const newPubs = state.publicationSystem.publications.map(p => {
        if (p.id !== activePublicationId) return p;
        return {
          ...p,
          photos: p.photos.map(pp => pp.photoId === photoId ? { ...pp, crop: { ...pp.crop, ...crop } } : pp),
          updatedAt: now
        };
      });
      const newPubSystem = { ...state.publicationSystem, publications: newPubs };
      savePublicationSystem(newPubSystem);
      return { ...state, publicationSystem: newPubSystem };
    }),

    updatePublicationPhotoCaption: (photoId: string, caption: string) => update(state => {
      const { activePublicationId } = state.publicationSystem;
      if (!activePublicationId) return state;
      const now = Date.now();
      const newPubs = state.publicationSystem.publications.map(p => {
        if (p.id !== activePublicationId) return p;
        return {
          ...p,
          photos: p.photos.map(pp => pp.photoId === photoId ? { ...pp, caption } : pp),
          updatedAt: now
        };
      });
      const newPubSystem = { ...state.publicationSystem, publications: newPubs };
      savePublicationSystem(newPubSystem);
      return { ...state, publicationSystem: newPubSystem };
    }),

    updatePublicationPages: (pages: PublicationPage[]) => update(state => {
      const { activePublicationId } = state.publicationSystem;
      if (!activePublicationId) return state;
      const now = Date.now();
      const newPubs = state.publicationSystem.publications.map(p => {
        if (p.id !== activePublicationId) return p;
        return { ...p, pages, updatedAt: now };
      });
      const newPubSystem = { ...state.publicationSystem, publications: newPubs };
      savePublicationSystem(newPubSystem);
      return { ...state, publicationSystem: newPubSystem };
    }),

    updatePublicationCover: (cover: Partial<PublicationCover>) => update(state => {
      const { activePublicationId } = state.publicationSystem;
      if (!activePublicationId) return state;
      const now = Date.now();
      const newPubs = state.publicationSystem.publications.map(p => {
        if (p.id !== activePublicationId) return p;
        return { ...p, cover: { ...p.cover, ...cover }, updatedAt: now };
      });
      const newPubSystem = { ...state.publicationSystem, publications: newPubs };
      savePublicationSystem(newPubSystem);
      return { ...state, publicationSystem: newPubSystem };
    }),

    updatePublicationSelectFilter: (filter: Partial<PublicationSelectFilter>) => update(state => {
      const newPubSystem = {
        ...state.publicationSystem,
        selectFilter: { ...state.publicationSystem.selectFilter, ...filter }
      };
      savePublicationSystem(newPubSystem);
      return { ...state, publicationSystem: newPubSystem };
    }),

    exportPublication: (publicationId: string, format: 'json' | 'html' = 'html'): string | null => {
      let result: string | null = null;
      const unsubscribe = subscribe(state => {
        const pub = state.publicationSystem.publications.find(p => p.id === publicationId);
        if (!pub) return;

        const photos = pub.photos.map(pp => {
          const photo = state.processedPhotos.find(p => p.id === pp.photoId);
          return {
            photoId: pp.photoId,
            caption: pp.caption,
            crop: pp.crop,
            imageUrl: photo?.imageDataUrl || '',
            score: photo?.score || 0,
            grade: photo?.details.grade || ''
          };
        });

        if (format === 'json') {
          result = JSON.stringify({ ...pub, photos }, null, 2);
        } else {
          result = generatePublicationHtml(pub, photos);
        }
      });
      unsubscribe();

      if (result) {
        update(state => {
          const now = Date.now();
          const newPubs = state.publicationSystem.publications.map(p =>
            p.id === publicationId ? { ...p, exportedAt: now, updatedAt: now } : p
          );
          const newPubSystem = { ...state.publicationSystem, publications: newPubs };
          savePublicationSystem(newPubSystem);
          return { ...state, publicationSystem: newPubSystem };
        });
      }
      return result;
    },

    deletePublication: (publicationId: string) => update(state => {
      const newPubSystem = {
        ...state.publicationSystem,
        publications: state.publicationSystem.publications.filter(p => p.id !== publicationId),
        activePublicationId: state.publicationSystem.activePublicationId === publicationId ? null : state.publicationSystem.activePublicationId
      };
      savePublicationSystem(newPubSystem);
      return { ...state, publicationSystem: newPubSystem };
    }),

    setWorkshopTab: (tab: WorkshopTab) => update(state => ({
      ...state,
      subjectWorkshop: { ...state.subjectWorkshop, activeTab: tab }
    })),

    setWorkshopEditorMode: (mode: EditorMode) => update(state => ({
      ...state,
      subjectWorkshop: { ...state.subjectWorkshop, editorMode: mode }
    })),

    setWorkshopFilterCategory: (cat: SceneTemplateCategory | 'all') => update(state => ({
      ...state,
      subjectWorkshop: { ...state.subjectWorkshop, filterCategory: cat }
    })),

    setWorkshopSearchKeyword: (kw: string) => update(state => ({
      ...state,
      subjectWorkshop: { ...state.subjectWorkshop, searchKeyword: kw }
    })),

    setWorkshopSortBy: (sortBy: SubjectWorkshopState['sortBy']) => update(state => ({
      ...state,
      subjectWorkshop: { ...state.subjectWorkshop, sortBy }
    })),

    selectTemplate: (templateId: string | null) => update(state => ({
      ...state,
      subjectWorkshop: {
        ...state.subjectWorkshop,
        selectedTemplateId: templateId
      }
    })),

    createNewTemplate: () => update(state => {
      const newTpl = createBlankTemplate();
      return {
        ...state,
        subjectWorkshop: {
          ...state.subjectWorkshop,
          selectedTemplateId: newTpl.id,
          draftTemplate: cloneTemplate(newTpl),
          draftKeyAreas: convertKeyAreasToDrafts(newTpl.keyAreas),
          selectedKeyAreaId: null,
          selectedRuleSetId: newTpl.scoringRuleSetId,
          previewParams: { ...newTpl.previewParams },
          undoStack: [],
          redoStack: [],
          activeTab: 'editor'
        }
      };
    }),

    editTemplate: (templateId: string) => update(state => {
      const tpl = state.subjectWorkshop.templates.find(t => t.id === templateId);
      if (!tpl) return state;
      const cloned = cloneTemplate(tpl);
      return {
        ...state,
        subjectWorkshop: {
          ...state.subjectWorkshop,
          selectedTemplateId: templateId,
          draftTemplate: cloned,
          draftKeyAreas: convertKeyAreasToDrafts(cloned.keyAreas),
          selectedKeyAreaId: null,
          selectedRuleSetId: cloned.scoringRuleSetId,
          previewParams: { ...cloned.previewParams },
          undoStack: [],
          redoStack: [],
          activeTab: 'editor'
        }
      };
    }),

    saveDraftToHistory: () => update(state => {
      if (!state.subjectWorkshop.draftTemplate) return state;
      const cloned = cloneTemplate(state.subjectWorkshop.draftTemplate);
      const newUndo = [...state.subjectWorkshop.undoStack, cloned].slice(-20);
      return {
        ...state,
        subjectWorkshop: {
          ...state.subjectWorkshop,
          undoStack: newUndo,
          redoStack: []
        }
      };
    }),

    undoWorkshop: () => update(state => {
      if (state.subjectWorkshop.undoStack.length === 0 || !state.subjectWorkshop.draftTemplate) return state;
      const current = cloneTemplate(state.subjectWorkshop.draftTemplate);
      const undoStack = [...state.subjectWorkshop.undoStack];
      const previous = undoStack.pop()!;
      return {
        ...state,
        subjectWorkshop: {
          ...state.subjectWorkshop,
          draftTemplate: previous,
          draftKeyAreas: convertKeyAreasToDrafts(previous.keyAreas),
          undoStack,
          redoStack: [...state.subjectWorkshop.redoStack, current]
        }
      };
    }),

    redoWorkshop: () => update(state => {
      if (state.subjectWorkshop.redoStack.length === 0 || !state.subjectWorkshop.draftTemplate) return state;
      const current = cloneTemplate(state.subjectWorkshop.draftTemplate);
      const redoStack = [...state.subjectWorkshop.redoStack];
      const next = redoStack.pop()!;
      return {
        ...state,
        subjectWorkshop: {
          ...state.subjectWorkshop,
          draftTemplate: next,
          draftKeyAreas: convertKeyAreasToDrafts(next.keyAreas),
          redoStack,
          undoStack: [...state.subjectWorkshop.undoStack, current]
        }
      };
    }),

    updateDraftField: <K extends keyof SceneTemplate>(key: K, value: SceneTemplate[K]) => update(state => {
      if (!state.subjectWorkshop.draftTemplate) return state;
      return {
        ...state,
        subjectWorkshop: {
          ...state.subjectWorkshop,
          draftTemplate: updateTemplateField(state.subjectWorkshop.draftTemplate, key, value)
        }
      };
    }),

    setSelectedRuleSetId: (ruleSetId: string) => update(state => ({
      ...state,
      subjectWorkshop: {
        ...state.subjectWorkshop,
        selectedRuleSetId: ruleSetId,
        draftTemplate: state.subjectWorkshop.draftTemplate
          ? { ...state.subjectWorkshop.draftTemplate, scoringRuleSetId: ruleSetId }
          : null
      }
    })),

    setShowPreviewOverlay: (show: boolean) => update(state => ({
      ...state,
      subjectWorkshop: { ...state.subjectWorkshop, showPreviewOverlay: show }
    })),

    setShowKeyAreasInPreview: (show: boolean) => update(state => ({
      ...state,
      subjectWorkshop: { ...state.subjectWorkshop, showKeyAreasInPreview: show }
    })),

    setPreviewParams: (params: Partial<DevParams>) => update(state => ({
      ...state,
      subjectWorkshop: {
        ...state.subjectWorkshop,
        previewParams: { ...state.subjectWorkshop.previewParams, ...params }
      }
    })),

    addKeyArea: () => update(state => {
      if (!state.subjectWorkshop.draftTemplate) return state;
      const newArea = createNewKeyAreaDraft(state.subjectWorkshop.draftKeyAreas);
      return {
        ...state,
        subjectWorkshop: {
          ...state.subjectWorkshop,
          draftKeyAreas: [...state.subjectWorkshop.draftKeyAreas, newArea],
          selectedKeyAreaId: newArea.id
        }
      };
    }),

    selectKeyArea: (areaId: string | null) => update(state => ({
      ...state,
      subjectWorkshop: { ...state.subjectWorkshop, selectedKeyAreaId: areaId }
    })),

    updateKeyArea: (areaId: string, updates: Partial<KeyAreaDraft>) => update(state => ({
      ...state,
      subjectWorkshop: {
        ...state.subjectWorkshop,
        draftKeyAreas: state.subjectWorkshop.draftKeyAreas.map(a =>
          a.id === areaId ? { ...a, ...updates } : a
        )
      }
    })),

    deleteKeyArea: (areaId: string) => update(state => {
      const areas = state.subjectWorkshop.draftKeyAreas.filter(a => a.id !== areaId);
      return {
        ...state,
        subjectWorkshop: {
          ...state.subjectWorkshop,
          draftKeyAreas: areas,
          selectedKeyAreaId: state.subjectWorkshop.selectedKeyAreaId === areaId ? null : state.subjectWorkshop.selectedKeyAreaId
        }
      };
    }),

    normalizeKeyAreas: () => update(state => ({
      ...state,
      subjectWorkshop: {
        ...state.subjectWorkshop,
        draftKeyAreas: normalizeKeyAreaImportance(state.subjectWorkshop.draftKeyAreas)
      }
    })),

    saveTemplate: () => update(state => {
      if (!state.subjectWorkshop.draftTemplate) return state;

      const normalizedKeyAreas = normalizeKeyAreaImportance(state.subjectWorkshop.draftKeyAreas);
      const finalKeyAreas = convertDraftsToKeyAreas(normalizedKeyAreas);

      const finalTemplate: SceneTemplate = {
        ...state.subjectWorkshop.draftTemplate,
        keyAreas: finalKeyAreas,
        updatedAt: Date.now(),
        version: state.subjectWorkshop.draftTemplate.version + 1
      };

      const validation = validateTemplate(finalTemplate);
      if (!validation.valid) {
        console.warn('模板验证失败:', validation.errors);
        return state;
      }

      const existingIdx = state.subjectWorkshop.templates.findIndex(t => t.id === finalTemplate.id);
      let newTemplates: SceneTemplate[];
      if (existingIdx >= 0) {
        newTemplates = state.subjectWorkshop.templates.map((t, i) => i === existingIdx ? finalTemplate : t);
      } else {
        newTemplates = [...state.subjectWorkshop.templates, finalTemplate];
      }

      return {
        ...state,
        subjectWorkshop: {
          ...state.subjectWorkshop,
          templates: newTemplates,
          undoStack: [],
          redoStack: []
        }
      };
    }),

    deleteTemplate: (templateId: string) => update(state => {
      const tpl = state.subjectWorkshop.templates.find(t => t.id === templateId);
      if (!tpl || tpl.isBuiltin) return state;
      return {
        ...state,
        subjectWorkshop: {
          ...state.subjectWorkshop,
          templates: state.subjectWorkshop.templates.filter(t => t.id !== templateId),
          selectedTemplateId: state.subjectWorkshop.selectedTemplateId === templateId ? null : state.subjectWorkshop.selectedTemplateId,
          draftTemplate: state.subjectWorkshop.draftTemplate?.id === templateId ? null : state.subjectWorkshop.draftTemplate
        }
      };
    }),

    duplicateTemplate: (templateId: string) => update(state => {
      const original = state.subjectWorkshop.templates.find(t => t.id === templateId);
      if (!original) return state;
      const now = Date.now();
      const copy: SceneTemplate = {
        ...cloneTemplate(original),
        id: generateId(),
        name: original.name + ' (副本)',
        isBuiltin: false,
        isPublished: false,
        version: 1,
        createdAt: now,
        updatedAt: now
      };
      return {
        ...state,
        subjectWorkshop: {
          ...state.subjectWorkshop,
          templates: [...state.subjectWorkshop.templates, copy],
          selectedTemplateId: copy.id
        }
      };
    }),

    validateWorkshopDraft: (): { valid: boolean; errors: string[]; warnings: string[] } => {
      let result = { valid: false, errors: [] as string[], warnings: [] as string[] };
      const unsubscribe = subscribe(state => {
        if (!state.subjectWorkshop.draftTemplate) {
          result = { valid: false, errors: ['没有正在编辑的模板'], warnings: [] };
          return;
        }
        const normalizedKeyAreas = normalizeKeyAreaImportance(state.subjectWorkshop.draftKeyAreas);
        const finalKeyAreas = convertDraftsToKeyAreas(normalizedKeyAreas);
        const finalTemplate: SceneTemplate = {
          ...state.subjectWorkshop.draftTemplate,
          keyAreas: finalKeyAreas
        };
        result = validateTemplate(finalTemplate);
      });
      unsubscribe();
      return result;
    },

    setConsignmentTab: (tab: ConsignmentMarketTab) => update(state => {
      const newState = setActiveTab(state.consignmentMarket, tab);
      saveConsignmentMarket(newState);
      return { ...state, consignmentMarket: newState };
    }),

    setConsignmentFilter: (filter: Partial<ConsignmentMarketFilter>) => update(state => {
      const newState = setFilter(state.consignmentMarket, filter);
      return { ...state, consignmentMarket: newState };
    }),

    createConsignmentWork: (data: {
      photoId: string;
      title: string;
      description: string;
      price: number;
      totalEditions: number;
      category?: string;
      tags: string[];
      frameOption?: boolean;
      framePrice?: number;
      shippingPrice?: number;
      royalties?: number;
    }) => update(state => {
      const newState = createConsignmentWork(state.consignmentMarket, data);
      saveConsignmentMarket(newState);
      return { ...state, consignmentMarket: newState };
    }),

    updateConsignmentWork: (workId: string, updates: Partial<ConsignmentWork>) => update(state => {
      const newState = updateConsignmentWork(state.consignmentMarket, workId, updates);
      saveConsignmentMarket(newState);
      return { ...state, consignmentMarket: newState };
    }),

    listConsignmentWork: (workId: string) => update(state => {
      const newState = listWork(state.consignmentMarket, workId);
      saveConsignmentMarket(newState);
      return { ...state, consignmentMarket: newState };
    }),

    removeConsignmentWork: (workId: string) => update(state => {
      const newState = removeWork(state.consignmentMarket, workId);
      saveConsignmentMarket(newState);
      return { ...state, consignmentMarket: newState };
    }),

    createTradeOrder: (data: {
      workId: string;
      buyerId: string;
      includeFrame?: boolean;
      shippingAddress?: string;
      specialInstructions?: string;
    }) => update(state => {
      const newState = createTradeOrder(state.consignmentMarket, data);
      saveConsignmentMarket(newState);
      return { ...state, consignmentMarket: newState };
    }),

    updateTradeOrderStatus: (orderId: string, status: TradeOrderStatus, extra?: { cancelReason?: string }) => update(state => {
      const newState = updateOrderStatus(state.consignmentMarket, orderId, status, extra);
      saveConsignmentMarket(newState);
      return { ...state, consignmentMarket: newState };
    }),

    verifyCertificate: (certificateId: string) => update(state => {
      const newState = verifyCertificate(state.consignmentMarket, certificateId);
      saveConsignmentMarket(newState);
      return { ...state, consignmentMarket: newState };
    }),

    transferCertificate: (certificateId: string, newOwnerId: string, newOwnerName: string) => update(state => {
      const newState = transferCertificate(state.consignmentMarket, certificateId, newOwnerId, newOwnerName);
      saveConsignmentMarket(newState);
      return { ...state, consignmentMarket: newState };
    }),

    toggleFavoriteWork: (workId: string) => update(state => {
      const newState = toggleFavoriteWork(state.consignmentMarket, workId);
      saveConsignmentMarket(newState);
      return { ...state, consignmentMarket: newState };
    }),

    selectConsignmentWork: (workId: string | null) => update(state => ({
      ...state,
      consignmentMarket: {
        ...state.consignmentMarket,
        selectedWorkId: workId,
        showWorkDetail: workId !== null
      }
    })),

    selectConsignmentOrder: (orderId: string | null) => update(state => ({
      ...state,
      consignmentMarket: {
        ...state.consignmentMarket,
        selectedOrderId: orderId,
        showOrderDetail: orderId !== null
      }
    })),

    selectConsignmentCertificate: (certificateId: string | null) => update(state => ({
      ...state,
      consignmentMarket: {
        ...state.consignmentMarket,
        selectedCertificateId: certificateId,
        showCertificateDetail: certificateId !== null
      }
    })),

    setShowCreateWork: (show: boolean) => update(state => ({
      ...state,
      consignmentMarket: {
        ...state.consignmentMarket,
        showCreateWork: show,
        editingWorkId: null
      }
    })),

    setEditingWork: (workId: string | null) => update(state => ({
      ...state,
      consignmentMarket: {
        ...state.consignmentMarket,
        editingWorkId: workId,
        showCreateWork: workId !== null
      }
    })),

    switchConsignmentUser: (userId: string, userType: 'artist' | 'buyer' | 'both') => update(state => {
      const newState = switchCurrentUser(state.consignmentMarket, userId, userType);
      saveConsignmentMarket(newState);
      return { ...state, consignmentMarket: newState };
    }),

    verifyConsignmentCertificate: (certificateId: string) => update(state => {
      const newState = verifyCertificate(state.consignmentMarket, certificateId);
      saveConsignmentMarket(newState);
      return { ...state, consignmentMarket: newState };
    }),

    transferConsignmentCertificate: (certificateId: string, newOwnerId: string, newOwnerName: string) => update(state => {
      const newState = transferCertificate(state.consignmentMarket, certificateId, newOwnerId, newOwnerName);
      saveConsignmentMarket(newState);
      return { ...state, consignmentMarket: newState };
    }),

    setExhibitionActiveTab: (tab: ExhibitionCuratorTab) => update(state => ({
      ...state,
      exhibitionSystem: { ...state.exhibitionSystem, activeTab: tab }
    })),

    setActiveExhibition: (exhibitionId: string | null) => update(state => ({
      ...state,
      exhibitionSystem: { ...state.exhibitionSystem, activeExhibitionId: exhibitionId }
    })),

    createExhibition: (title: string, subtitle: string = '', description: string = ''): string | null => {
      let newExhibitionId: string | null = null;
      update(state => {
        const now = Date.now();
        const id = generateId();
        newExhibitionId = id;
        const initialThemes = state.exhibitionSystem.exhibitions.length > 0
          ? state.exhibitionSystem.exhibitions[0].themes
          : createInitialExhibitionState().exhibitions[0].themes;
        const firstWallId = 'wall_' + id + '_0';

        const newExhibition: Exhibition = {
          id,
          title,
          subtitle,
          curatorName: '策展人',
          description,
          status: 'draft',
          groups: [],
          walls: [{
            id: firstWallId,
            name: '主墙',
            description: '',
            width: 1200,
            height: 600,
            backgroundColor: '#f5f0e8',
            textureType: 'smooth',
            layoutType: 'grid',
            placements: [],
            order: 0
          }],
          themeId: initialThemes[0]?.id || '',
          themes: initialThemes,
          route: [],
          feedbacks: [],
          statistics: {
            totalVisits: 0,
            avgDuration: 0,
            avgOverallRating: 0,
            avgCurationRating: 0,
            avgVarietyRating: 0,
            avgFlowRating: 0,
            avgLightingRating: 0,
            topRatedWorks: [],
            mostViewedWorks: [],
            commonEmotions: [],
            visitorTypeDistribution: [],
            feedbackCount: 0
          },
          tags: [],
          createdAt: now,
          updatedAt: now,
          totalViews: 0
        };

        const newSystemState = {
          ...state.exhibitionSystem,
          exhibitions: [...state.exhibitionSystem.exhibitions, newExhibition],
          activeExhibitionId: id,
          selectedWallId: firstWallId
        };
        saveExhibitionSystem(newSystemState);

        return { ...state, exhibitionSystem: newSystemState };
      });
      return newExhibitionId;
    },

    updateExhibition: (exhibitionId: string, updates: Partial<Exhibition>) => update(state => {
      const now = Date.now();
      const newExhibitions = state.exhibitionSystem.exhibitions.map(exh =>
        exh.id === exhibitionId ? { ...exh, ...updates, updatedAt: now } : exh
      );
      const newSystemState = { ...state.exhibitionSystem, exhibitions: newExhibitions };
      saveExhibitionSystem(newSystemState);
      return { ...state, exhibitionSystem: newSystemState };
    }),

    deleteExhibition: (exhibitionId: string) => update(state => {
      const remaining = state.exhibitionSystem.exhibitions.filter(e => e.id !== exhibitionId);
      const newActiveId = remaining.length > 0 ? remaining[0].id : null;
      const newSystemState = {
        ...state.exhibitionSystem,
        exhibitions: remaining,
        activeExhibitionId: newActiveId,
        selectedWallId: null
      };
      saveExhibitionSystem(newSystemState);
      return { ...state, exhibitionSystem: newSystemState };
    }),

    createWorkGroup: (exhibitionId: string, name: string, colorTag: string = '#4a90d9', description?: string): string | null => {
      let newGroupId: string | null = null;
      update(state => {
        const now = Date.now();
        const id = generateId();
        newGroupId = id;
        const newGroup: ExhibitionWorkGroup = {
          id,
          name,
          description,
          colorTag,
          photoIds: [],
          tags: [],
          createdAt: now,
          updatedAt: now
        };

        const newExhibitions = state.exhibitionSystem.exhibitions.map(exh =>
          exh.id === exhibitionId
            ? { ...exh, groups: [...exh.groups, newGroup], updatedAt: now }
            : exh
        );
        const newSystemState = { ...state.exhibitionSystem, exhibitions: newExhibitions, selectedGroupId: id };
        saveExhibitionSystem(newSystemState);
        return { ...state, exhibitionSystem: newSystemState };
      });
      return newGroupId;
    },

    updateWorkGroup: (exhibitionId: string, groupId: string, updates: Partial<ExhibitionWorkGroup>) => update(state => {
      const now = Date.now();
      const newExhibitions = state.exhibitionSystem.exhibitions.map(exh => {
        if (exh.id !== exhibitionId) return exh;
        return {
          ...exh,
          groups: exh.groups.map(g =>
            g.id === groupId ? { ...g, ...updates, updatedAt: now } : g
          ),
          updatedAt: now
        };
      });
      const newSystemState = { ...state.exhibitionSystem, exhibitions: newExhibitions };
      saveExhibitionSystem(newSystemState);
      return { ...state, exhibitionSystem: newSystemState };
    }),

    deleteWorkGroup: (exhibitionId: string, groupId: string) => update(state => {
      const now = Date.now();
      const newExhibitions = state.exhibitionSystem.exhibitions.map(exh => {
        if (exh.id !== exhibitionId) return exh;
        return {
          ...exh,
          groups: exh.groups.filter(g => g.id !== groupId),
          updatedAt: now
        };
      });
      const newSystemState = {
        ...state.exhibitionSystem,
        exhibitions: newExhibitions,
        selectedGroupId: state.exhibitionSystem.selectedGroupId === groupId ? null : state.exhibitionSystem.selectedGroupId
      };
      saveExhibitionSystem(newSystemState);
      return { ...state, exhibitionSystem: newSystemState };
    }),

    addPhotoToExhibitionGroup: (exhibitionId: string, groupId: string, photoId: string) => update(state => {
      const now = Date.now();
      const newExhibitions = state.exhibitionSystem.exhibitions.map(exh => {
        if (exh.id !== exhibitionId) return exh;
        return {
          ...exh,
          groups: exh.groups.map(g =>
            g.id === groupId && !g.photoIds.includes(photoId)
              ? { ...g, photoIds: [...g.photoIds, photoId], updatedAt: now }
              : g
          ),
          updatedAt: now
        };
      });
      const newSystemState = { ...state.exhibitionSystem, exhibitions: newExhibitions };
      saveExhibitionSystem(newSystemState);
      return { ...state, exhibitionSystem: newSystemState };
    }),

    removePhotoFromExhibitionGroup: (exhibitionId: string, groupId: string, photoId: string) => update(state => {
      const now = Date.now();
      const newExhibitions = state.exhibitionSystem.exhibitions.map(exh => {
        if (exh.id !== exhibitionId) return exh;
        return {
          ...exh,
          groups: exh.groups.map(g =>
            g.id === groupId
              ? { ...g, photoIds: g.photoIds.filter(p => p !== photoId), updatedAt: now }
              : g
          ),
          updatedAt: now
        };
      });
      const newSystemState = { ...state.exhibitionSystem, exhibitions: newExhibitions };
      saveExhibitionSystem(newSystemState);
      return { ...state, exhibitionSystem: newSystemState };
    }),

    selectGroup: (groupId: string | null) => update(state => ({
      ...state,
      exhibitionSystem: { ...state.exhibitionSystem, selectedGroupId: groupId }
    })),

    selectWall: (wallId: string | null) => update(state => ({
      ...state,
      exhibitionSystem: { ...state.exhibitionSystem, selectedWallId: wallId }
    })),

    createWall: (exhibitionId: string, name: string): string | null => {
      let newWallId: string | null = null;
      update(state => {
        const now = Date.now();
        const exh = state.exhibitionSystem.exhibitions.find(e => e.id === exhibitionId);
        if (!exh) return state;
        const id = generateId();
        newWallId = id;
        const newWall: ExhibitionWall = {
          id,
          name,
          width: 1200,
          height: 600,
          backgroundColor: '#f5f0e8',
          textureType: 'smooth',
          layoutType: 'grid',
          placements: [],
          order: exh.walls.length
        };

        const newExhibitions = state.exhibitionSystem.exhibitions.map(e =>
          e.id === exhibitionId
            ? { ...e, walls: [...e.walls, newWall], updatedAt: now }
            : e
        );
        const newSystemState = { ...state.exhibitionSystem, exhibitions: newExhibitions, selectedWallId: id };
        saveExhibitionSystem(newSystemState);
        return { ...state, exhibitionSystem: newSystemState };
      });
      return newWallId;
    },

    updateWall: (exhibitionId: string, wallId: string, updates: Partial<ExhibitionWall>) => update(state => {
      const now = Date.now();
      const newExhibitions = state.exhibitionSystem.exhibitions.map(exh => {
        if (exh.id !== exhibitionId) return exh;
        return {
          ...exh,
          walls: exh.walls.map(w =>
            w.id === wallId ? { ...w, ...updates } : w
          ),
          updatedAt: now
        };
      });
      const newSystemState = { ...state.exhibitionSystem, exhibitions: newExhibitions };
      saveExhibitionSystem(newSystemState);
      return { ...state, exhibitionSystem: newSystemState };
    }),

    deleteWall: (exhibitionId: string, wallId: string) => update(state => {
      const now = Date.now();
      const newExhibitions = state.exhibitionSystem.exhibitions.map(exh => {
        if (exh.id !== exhibitionId) return exh;
        return {
          ...exh,
          walls: exh.walls.filter(w => w.id !== wallId),
          route: exh.route.filter(r => r.wallId !== wallId),
          updatedAt: now
        };
      });
      const newSystemState = {
        ...state.exhibitionSystem,
        exhibitions: newExhibitions,
        selectedWallId: state.exhibitionSystem.selectedWallId === wallId ? null : state.exhibitionSystem.selectedWallId
      };
      saveExhibitionSystem(newSystemState);
      return { ...state, exhibitionSystem: newSystemState };
    }),

    addPlacementToWall: (exhibitionId: string, wallId: string, photoId: string, x: number = 50, y: number = 50) => update(state => {
      const now = Date.now();
      const workId = generateId();
      const newPlacement: ExhibitionWorkPlacement = {
        workId,
        photoId,
        x,
        y,
        width: 120,
        height: 160,
        rotation: 0,
        zIndex: 1,
        frameStyle: 'minimal',
        frameColor: '#2c2c2c',
        matWidth: 8,
        matColor: '#ffffff',
        spotLightIntensity: 0.8,
        spotLightColor: '#fff8e7'
      };

      const newExhibitions = state.exhibitionSystem.exhibitions.map(exh => {
        if (exh.id !== exhibitionId) return exh;
        return {
          ...exh,
          walls: exh.walls.map(w =>
            w.id === wallId ? { ...w, placements: [...w.placements, newPlacement] } : w
          ),
          updatedAt: now
        };
      });
      const newSystemState = {
        ...state.exhibitionSystem,
        exhibitions: newExhibitions,
        selectedPlacementId: workId
      };
      saveExhibitionSystem(newSystemState);
      return { ...state, exhibitionSystem: newSystemState };
    }),

    updatePlacement: (exhibitionId: string, wallId: string, workId: string, updates: Partial<ExhibitionWorkPlacement>) => update(state => {
      const now = Date.now();
      const newExhibitions = state.exhibitionSystem.exhibitions.map(exh => {
        if (exh.id !== exhibitionId) return exh;
        return {
          ...exh,
          walls: exh.walls.map(w =>
            w.id === wallId
              ? {
                  ...w,
                  placements: w.placements.map(p =>
                    p.workId === workId ? { ...p, ...updates } : p
                  )
                }
              : w
          ),
          updatedAt: now
        };
      });
      const newSystemState = { ...state.exhibitionSystem, exhibitions: newExhibitions };
      saveExhibitionSystem(newSystemState);
      return { ...state, exhibitionSystem: newSystemState };
    }),

    removePlacement: (exhibitionId: string, wallId: string, workId: string) => update(state => {
      const now = Date.now();
      const newExhibitions = state.exhibitionSystem.exhibitions.map(exh => {
        if (exh.id !== exhibitionId) return exh;
        return {
          ...exh,
          walls: exh.walls.map(w =>
            w.id === wallId
              ? { ...w, placements: w.placements.filter(p => p.workId !== workId) }
              : w
          ),
          route: exh.route.filter(r => r.placementId !== workId),
          updatedAt: now
        };
      });
      const newSystemState = {
        ...state.exhibitionSystem,
        exhibitions: newExhibitions,
        selectedPlacementId: state.exhibitionSystem.selectedPlacementId === workId ? null : state.exhibitionSystem.selectedPlacementId
      };
      saveExhibitionSystem(newSystemState);
      return { ...state, exhibitionSystem: newSystemState };
    }),

    selectPlacement: (placementId: string | null) => update(state => ({
      ...state,
      exhibitionSystem: { ...state.exhibitionSystem, selectedPlacementId: placementId }
    })),

    setEditingPlacement: (editing: boolean) => update(state => ({
      ...state,
      exhibitionSystem: { ...state.exhibitionSystem, isEditingPlacement: editing }
    })),

    setExhibitionTheme: (exhibitionId: string, themeId: string) => update(state => {
      const now = Date.now();
      const newExhibitions = state.exhibitionSystem.exhibitions.map(exh =>
        exh.id === exhibitionId ? { ...exh, themeId, updatedAt: now } : exh
      );
      const newSystemState = { ...state.exhibitionSystem, exhibitions: newExhibitions };
      saveExhibitionSystem(newSystemState);
      return { ...state, exhibitionSystem: newSystemState };
    }),

    updateExhibitionTheme: (exhibitionId: string, themeId: string, updates: Partial<ExhibitionTheme>) => update(state => {
      const now = Date.now();
      const newExhibitions = state.exhibitionSystem.exhibitions.map(exh => {
        if (exh.id !== exhibitionId) return exh;
        return {
          ...exh,
          themes: exh.themes.map(t =>
            t.id === themeId ? { ...t, ...updates } : t
          ),
          updatedAt: now
        };
      });
      const newSystemState = { ...state.exhibitionSystem, exhibitions: newExhibitions };
      saveExhibitionSystem(newSystemState);
      return { ...state, exhibitionSystem: newSystemState };
    }),

    addRouteStop: (exhibitionId: string, wallId: string, placementId?: string) => update(state => {
      const now = Date.now();
      const newExhibitions = state.exhibitionSystem.exhibitions.map(exh => {
        if (exh.id !== exhibitionId) return exh;
        const stop: ExhibitionRouteStop = {
          wallId,
          placementId,
          stopIndex: exh.route.length,
          dwellTime: 8,
          focusZoom: 1
        };
        return {
          ...exh,
          route: [...exh.route, stop],
          updatedAt: now
        };
      });
      const newSystemState = { ...state.exhibitionSystem, exhibitions: newExhibitions };
      saveExhibitionSystem(newSystemState);
      return { ...state, exhibitionSystem: newSystemState };
    }),

    updateRouteStop: (exhibitionId: string, stopIndex: number, updates: Partial<ExhibitionRouteStop>) => update(state => {
      const now = Date.now();
      const newExhibitions = state.exhibitionSystem.exhibitions.map(exh => {
        if (exh.id !== exhibitionId) return exh;
        return {
          ...exh,
          route: exh.route.map((s, i) =>
            i === stopIndex ? { ...s, ...updates } : s
          ),
          updatedAt: now
        };
      });
      const newSystemState = { ...state.exhibitionSystem, exhibitions: newExhibitions };
      saveExhibitionSystem(newSystemState);
      return { ...state, exhibitionSystem: newSystemState };
    }),

    removeRouteStop: (exhibitionId: string, stopIndex: number) => update(state => {
      const now = Date.now();
      const newExhibitions = state.exhibitionSystem.exhibitions.map(exh => {
        if (exh.id !== exhibitionId) return exh;
        const newRoute = exh.route
          .filter((_, i) => i !== stopIndex)
          .map((s, i) => ({ ...s, stopIndex: i }));
        return { ...exh, route: newRoute, updatedAt: now };
      });
      const newSystemState = { ...state.exhibitionSystem, exhibitions: newExhibitions };
      saveExhibitionSystem(newSystemState);
      return { ...state, exhibitionSystem: newSystemState };
    }),

    reorderRouteStop: (exhibitionId: string, fromIndex: number, toIndex: number) => update(state => {
      const now = Date.now();
      const newExhibitions = state.exhibitionSystem.exhibitions.map(exh => {
        if (exh.id !== exhibitionId) return exh;
        const newRoute = [...exh.route];
        const [removed] = newRoute.splice(fromIndex, 1);
        newRoute.splice(toIndex, 0, removed);
        return {
          ...exh,
          route: newRoute.map((s, i) => ({ ...s, stopIndex: i })),
          updatedAt: now
        };
      });
      const newSystemState = { ...state.exhibitionSystem, exhibitions: newExhibitions };
      saveExhibitionSystem(newSystemState);
      return { ...state, exhibitionSystem: newSystemState };
    }),

    addVisitorFeedback: (exhibitionId: string, feedback: Omit<VisitorFeedback, 'id' | 'timestamp'>) => update(state => {
      const now = Date.now();
      const id = generateId();
      const newFeedback: VisitorFeedback = { ...feedback, id, timestamp: now };

      const newExhibitions = state.exhibitionSystem.exhibitions.map(exh => {
        if (exh.id !== exhibitionId) return exh;
        const allFeedbacks = [...exh.feedbacks, newFeedback];
        const avg = (key: keyof VisitorFeedback) =>
          allFeedbacks.length > 0
            ? allFeedbacks.reduce((sum, f) => sum + (f[key] as number), 0) / allFeedbacks.length
            : 0;

        const emotionCounts: Record<string, number> = {};
        allFeedbacks.forEach(f => {
          if (f.emotionalResponse) {
            emotionCounts[f.emotionalResponse] = (emotionCounts[f.emotionalResponse] || 0) + 1;
          }
        });
        const typeCounts: Record<string, number> = {};
        allFeedbacks.forEach(f => {
          typeCounts[f.visitorType] = (typeCounts[f.visitorType] || 0) + 1;
        });
        const workMentions: Record<string, number> = {};
        const workRatings: Record<string, number[]> = {};
        allFeedbacks.forEach(f => {
          if (f.favoriteWorkId) {
            workMentions[f.favoriteWorkId] = (workMentions[f.favoriteWorkId] || 0) + 1;
            workRatings[f.favoriteWorkId] = workRatings[f.favoriteWorkId] || [];
            workRatings[f.favoriteWorkId].push(f.overallRating);
          }
        });

        return {
          ...exh,
          feedbacks: allFeedbacks,
          statistics: {
            ...exh.statistics,
            feedbackCount: allFeedbacks.length,
            avgOverallRating: Math.round(avg('overallRating') * 10) / 10,
            avgCurationRating: Math.round(avg('curationRating') * 10) / 10,
            avgVarietyRating: Math.round(avg('varietyRating') * 10) / 10,
            avgFlowRating: Math.round(avg('flowRating') * 10) / 10,
            avgLightingRating: Math.round(avg('lightingRating') * 10) / 10,
            avgDuration: Math.round(avg('visitDuration') * 10) / 10,
            totalVisits: allFeedbacks.length,
            commonEmotions: Object.entries(emotionCounts).map(([emotion, count]) => ({ emotion, count })).sort((a, b) => b.count - a.count),
            visitorTypeDistribution: Object.entries(typeCounts).map(([type, count]) => ({ type, count })),
            topRatedWorks: Object.entries(workRatings)
              .map(([photoId, ratings]) => ({
                photoId,
                rating: Math.round(ratings.reduce((a, b) => a + b, 0) / ratings.length * 10) / 10,
                mentions: workMentions[photoId] || 0
              }))
              .sort((a, b) => b.mentions - a.mentions || b.rating - a.rating),
            mostViewedWorks: Object.entries(workMentions).map(([photoId, views]) => ({ photoId, views })).sort((a, b) => b.views - a.views)
          },
          updatedAt: now,
          totalViews: exh.totalViews + 1
        };
      });

      const newSystemState = { ...state.exhibitionSystem, exhibitions: newExhibitions };
      saveExhibitionSystem(newSystemState);
      return { ...state, exhibitionSystem: newSystemState };
    }),

    setPreviewMode: (mode: 'edit' | 'walkthrough' | 'immersive') => update(state => ({
      ...state,
      exhibitionSystem: { ...state.exhibitionSystem, previewMode: mode }
    })),

    setRouteAnimationSpeed: (speed: number) => update(state => ({
      ...state,
      exhibitionSystem: { ...state.exhibitionSystem, routeAnimationSpeed: speed }
    })),

    toggleShowCaptions: () => update(state => ({
      ...state,
      exhibitionSystem: { ...state.exhibitionSystem, showWorkCaptions: !state.exhibitionSystem.showWorkCaptions }
    })),

    toggleShowSpotlights: () => update(state => ({
      ...state,
      exhibitionSystem: { ...state.exhibitionSystem, showSpotlights: !state.exhibitionSystem.showSpotlights }
    })),

    setExhibitionStatus: (exhibitionId: string, status: ExhibitionStatus) => update(state => {
      const now = Date.now();
      const newExhibitions = state.exhibitionSystem.exhibitions.map(exh =>
        exh.id === exhibitionId
          ? { ...exh, status, updatedAt: now, publishedAt: status === 'published' ? now : exh.publishedAt }
          : exh
      );
      const newSystemState = { ...state.exhibitionSystem, exhibitions: newExhibitions };
      saveExhibitionSystem(newSystemState);
      return { ...state, exhibitionSystem: newSystemState };
    }),

    autoLayoutWall: (exhibitionId: string, wallId: string) => update(state => {
      const now = Date.now();
      const exh = state.exhibitionSystem.exhibitions.find(e => e.id === exhibitionId);
      const wall = exh?.walls.find(w => w.id === wallId);
      if (!exh || !wall) return state;

      const n = wall.placements.length;
      if (n === 0) return state;

      const cols = Math.ceil(Math.sqrt(n * (wall.width / wall.height)));
      const rows = Math.ceil(n / cols);
      const paddingX = wall.width * 0.08;
      const paddingY = wall.height * 0.1;
      const cellW = (wall.width - paddingX * 2) / cols;
      const cellH = (wall.height - paddingY * 2) / rows;
      const workW = cellW * 0.75;
      const workH = cellH * 0.8;

      let idx = 0;
      const newPlacements = wall.placements.map(p => {
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        idx++;
        return {
          ...p,
          x: paddingX + col * cellW + (cellW - workW) / 2,
          y: paddingY + row * cellH + (cellH - workH) / 2,
          width: workW,
          height: workH,
          rotation: 0,
          zIndex: 1
        };
      });

      const newExhibitions = state.exhibitionSystem.exhibitions.map(e => {
        if (e.id !== exhibitionId) return e;
        return {
          ...e,
          walls: e.walls.map(w =>
            w.id === wallId ? { ...w, placements: newPlacements } : w
          ),
          updatedAt: now
        };
      });
      const newSystemState = { ...state.exhibitionSystem, exhibitions: newExhibitions };
      saveExhibitionSystem(newSystemState);
      return { ...state, exhibitionSystem: newSystemState };
    }),

    setCalibrationTab: (tab: CalibrationTab) => update(state => ({
      ...state,
      darkroomCalibration: { ...state.darkroomCalibration, activeTab: tab }
    })),

    selectEnlarger: (enlargerId: string | null) => update(state => ({
      ...state,
      darkroomCalibration: { ...state.darkroomCalibration, selectedEnlargerId: enlargerId }
    })),

    selectTempZone: (zoneId: string | null) => update(state => ({
      ...state,
      darkroomCalibration: { ...state.darkroomCalibration, selectedTempZoneId: zoneId }
    })),

    selectTimerProgram: (programId: string | null) => update(state => ({
      ...state,
      darkroomCalibration: { ...state.darkroomCalibration, selectedTimerProgramId: programId }
    })),

    addEnlarger: (enlarger: EnlargerProfile) => update(state => {
      const newCal = { ...state.darkroomCalibration, enlargers: [...state.darkroomCalibration.enlargers, enlarger] };
      saveDarkroomCalibration(newCal);
      return { ...state, darkroomCalibration: newCal };
    }),

    updateEnlarger: (enlargerId: string, updates: Partial<EnlargerProfile>) => update(state => {
      const newEnlargers = state.darkroomCalibration.enlargers.map(e =>
        e.id === enlargerId ? { ...e, ...updates } : e
      );
      const newCal = { ...state.darkroomCalibration, enlargers: newEnlargers };
      saveDarkroomCalibration(newCal);
      return { ...state, darkroomCalibration: newCal };
    }),

    deleteEnlarger: (enlargerId: string) => update(state => {
      if (state.darkroomCalibration.enlargers.length <= 1) return state;
      const newEnlargers = state.darkroomCalibration.enlargers.filter(e => e.id !== enlargerId);
      const newCal = {
        ...state.darkroomCalibration,
        enlargers: newEnlargers,
        selectedEnlargerId: state.darkroomCalibration.selectedEnlargerId === enlargerId
          ? newEnlargers[0]?.id || null
          : state.darkroomCalibration.selectedEnlargerId
      };
      saveDarkroomCalibration(newCal);
      return { ...state, darkroomCalibration: newCal };
    }),

    updateTempZone: (zoneId: string, updates: Partial<TempZone>) => update(state => {
      const newZones = state.darkroomCalibration.tempZones.map(z =>
        z.id === zoneId ? { ...z, ...updates } : z
      );
      const newCal = { ...state.darkroomCalibration, tempZones: newZones };
      saveDarkroomCalibration(newCal);
      return { ...state, darkroomCalibration: newCal };
    }),

    addTempZone: (zone: TempZone) => update(state => {
      const newCal = { ...state.darkroomCalibration, tempZones: [...state.darkroomCalibration.tempZones, zone] };
      saveDarkroomCalibration(newCal);
      return { ...state, darkroomCalibration: newCal };
    }),

    deleteTempZone: (zoneId: string) => update(state => {
      if (state.darkroomCalibration.tempZones.length <= 1) return state;
      const newZones = state.darkroomCalibration.tempZones.filter(z => z.id !== zoneId);
      const newCal = {
        ...state.darkroomCalibration,
        tempZones: newZones,
        selectedTempZoneId: state.darkroomCalibration.selectedTempZoneId === zoneId
          ? newZones[0]?.id || null
          : state.darkroomCalibration.selectedTempZoneId
      };
      saveDarkroomCalibration(newCal);
      return { ...state, darkroomCalibration: newCal };
    }),

    addTimerProgram: (program: TimerProgram) => update(state => {
      const newCal = { ...state.darkroomCalibration, timerPrograms: [...state.darkroomCalibration.timerPrograms, program] };
      saveDarkroomCalibration(newCal);
      return { ...state, darkroomCalibration: newCal };
    }),

    updateTimerProgram: (programId: string, updates: Partial<TimerProgram>) => update(state => {
      const newPrograms = state.darkroomCalibration.timerPrograms.map(p =>
        p.id === programId ? { ...p, ...updates, totalDuration: (updates.steps || p.steps).reduce((s, st) => s + st.duration, 0) } : p
      );
      const newCal = { ...state.darkroomCalibration, timerPrograms: newPrograms };
      saveDarkroomCalibration(newCal);
      return { ...state, darkroomCalibration: newCal };
    }),

    deleteTimerProgram: (programId: string) => update(state => {
      if (state.darkroomCalibration.timerPrograms.length <= 1) return state;
      const newPrograms = state.darkroomCalibration.timerPrograms.filter(p => p.id !== programId);
      const newCal = {
        ...state.darkroomCalibration,
        timerPrograms: newPrograms,
        selectedTimerProgramId: state.darkroomCalibration.selectedTimerProgramId === programId
          ? newPrograms[0]?.id || null
          : state.darkroomCalibration.selectedTimerProgramId
      };
      saveDarkroomCalibration(newCal);
      return { ...state, darkroomCalibration: newCal };
    }),

    runEnlargerCalibration: (enlargerId: string) => update(state => {
      const enlarger = state.darkroomCalibration.enlargers.find(e => e.id === enlargerId);
      if (!enlarger) return state;
      const now = Date.now();
      const drift = (Math.random() - 0.5) * 0.06;
      const measuredExposure = Math.max(0, Math.min(1, enlarger.baseExposure + drift));
      const measuredFiltration = {
        cyan: Math.max(0, enlarger.colorFiltration.cyan + (Math.random() - 0.5) * 4),
        magenta: Math.max(0, enlarger.colorFiltration.magenta + (Math.random() - 0.5) * 4),
        yellow: Math.max(0, enlarger.colorFiltration.yellow + (Math.random() - 0.5) * 4)
      };
      const uniformity = 85 + Math.random() * 15;
      const lampOutput = 90 + Math.random() * 10;
      const adjustments: { field: string; before: number; after: number }[] = [];
      if (Math.abs(measuredExposure - enlarger.baseExposure) > 0.02) {
        adjustments.push({ field: 'baseExposure', before: enlarger.baseExposure, after: measuredExposure });
      }
      const calibration: EnlargerCalibrationRecord = {
        id: 'ecal_' + generateId(),
        enlargerId,
        timestamp: now,
        measuredBaseExposure: measuredExposure,
        measuredFiltration,
        focusCalibration: enlarger.focusOffset + (Math.random() - 0.5) * 0.5,
        lampOutputPercent: lampOutput,
        uniformityScore: uniformity,
        status: Math.abs(drift) < 0.03 ? 'calibrated' : 'drift_detected',
        adjustments,
        notes: ''
      };
      let updatedEnlargers = state.darkroomCalibration.enlargers;
      if (calibration.status === 'drift_detected') {
        updatedEnlargers = state.darkroomCalibration.enlargers.map(e =>
          e.id === enlargerId
            ? { ...e, baseExposure: measuredExposure, colorFiltration: measuredFiltration, lampHours: e.lampHours + 0.1 }
            : e
        );
      }
      const newCalibrations = [calibration, ...state.darkroomCalibration.enlargerCalibrations].slice(0, 50);
      const newCal = {
        ...state.darkroomCalibration,
        enlargers: updatedEnlargers,
        enlargerCalibrations: newCalibrations,
        statistics: updateCalibrationStats(state.darkroomCalibration, now)
      };
      saveDarkroomCalibration(newCal);
      return { ...state, darkroomCalibration: newCal };
    }),

    runTempCalibration: () => update(state => {
      const now = Date.now();
      const zones = state.darkroomCalibration.tempZones.map(z => {
        const deviation = (Math.random() - 0.5) * z.tolerance * 3;
        const measuredTemp = z.targetTemp + deviation;
        return {
          zoneId: z.id,
          measuredTemp,
          targetTemp: z.targetTemp,
          deviation,
          correction: -deviation
        };
      });
      const allWithinTolerance = zones.every(z => Math.abs(z.deviation) <= state.darkroomCalibration.tempZones.find(tz => tz.id === z.zoneId)!.tolerance);
      const calibration: TempCalibrationRecord = {
        id: 'tcal_' + generateId(),
        timestamp: now,
        zones,
        ambientTemp: 20 + (Math.random() - 0.5) * 4,
        status: allWithinTolerance ? 'calibrated' : 'drift_detected',
        notes: ''
      };
      const updatedZones = state.darkroomCalibration.tempZones.map(z => {
        const zoneResult = zones.find(zr => zr.zoneId === z.id);
        if (zoneResult) {
          return { ...z, actualTemp: zoneResult.measuredTemp, status: Math.abs(zoneResult.deviation) <= z.tolerance ? 'stable' as const : (zoneResult.deviation > 0 ? 'cooling' as const : 'heating' as const) };
        }
        return z;
      });
      const newCalibrations = [calibration, ...state.darkroomCalibration.tempCalibrations].slice(0, 50);
      const newCal = {
        ...state.darkroomCalibration,
        tempZones: updatedZones,
        tempCalibrations: newCalibrations,
        statistics: updateCalibrationStats(state.darkroomCalibration, now)
      };
      saveDarkroomCalibration(newCal);
      return { ...state, darkroomCalibration: newCal };
    }),

    runTimerCalibration: (programId: string) => update(state => {
      const now = Date.now();
      const program = state.darkroomCalibration.timerPrograms.find(p => p.id === programId);
      if (!program) return state;
      const measuredDriftMs = (Math.random() - 0.5) * 500;
      const stepsChecked = program.steps.length;
      const stepsPassed = program.steps.filter(() => Math.random() > 0.15).length;
      const worstDriftMs = Math.abs(measuredDriftMs) * (1 + Math.random() * 2);
      const calibration: TimerCalibrationRecord = {
        id: 'rcal_' + generateId(),
        timestamp: now,
        measuredDriftMs,
        stepsChecked,
        stepsPassed,
        worstDriftMs,
        status: Math.abs(measuredDriftMs) < 100 ? 'calibrated' : 'drift_detected',
        notes: ''
      };
      const newCalibrations = [calibration, ...state.darkroomCalibration.timerCalibrations].slice(0, 50);
      const newCal = {
        ...state.darkroomCalibration,
        timerCalibrations: newCalibrations,
        statistics: updateCalibrationStats(state.darkroomCalibration, now)
      };
      saveDarkroomCalibration(newCal);
      return { ...state, darkroomCalibration: newCal };
    }),

    addDeviationRecord: (deviation: DeviationRecord) => update(state => {
      const newDeviations = [deviation, ...state.darkroomCalibration.deviations].slice(0, 100);
      const newCal = {
        ...state.darkroomCalibration,
        deviations: newDeviations,
        statistics: updateCalibrationStats(state.darkroomCalibration, Date.now())
      };
      saveDarkroomCalibration(newCal);
      return { ...state, darkroomCalibration: newCal };
    }),

    setChallengeTab: (tab: ChallengeTab) => update(state => {
      const newChallengeSystem = { ...state.challengeSystem, activeTab: tab };
      saveChallengeSystem(newChallengeSystem);
      return { ...state, challengeSystem: newChallengeSystem };
    }),

    setSelectedChallenge: (challengeId: string | null) => update(state => {
      const newChallengeSystem = { ...state.challengeSystem, selectedChallengeId: challengeId };
      saveChallengeSystem(newChallengeSystem);
      return { ...state, challengeSystem: newChallengeSystem };
    }),

    setSelectedTeam: (teamId: string | null) => update(state => {
      const newChallengeSystem = { ...state.challengeSystem, selectedTeamId: teamId };
      saveChallengeSystem(newChallengeSystem);
      return { ...state, challengeSystem: newChallengeSystem };
    }),

    setChallengeFilter: (filter: Partial<ChallengeFilter>) => update(state => {
      const newChallengeSystem = {
        ...state.challengeSystem,
        filter: { ...state.challengeSystem.filter, ...filter }
      };
      saveChallengeSystem(newChallengeSystem);
      return { ...state, challengeSystem: newChallengeSystem };
    }),

    setChallengeLeaderboardFilter: (filter: Partial<ChallengeState['leaderboardFilter']>) => update(state => {
      const newChallengeSystem = {
        ...state.challengeSystem,
        leaderboardFilter: { ...state.challengeSystem.leaderboardFilter, ...filter }
      };
      saveChallengeSystem(newChallengeSystem);
      return { ...state, challengeSystem: newChallengeSystem };
    }),

    registerChallenge: (challengeId: string, teamId?: string) => update(state => {
      const result = registerForChallenge(state.challengeSystem, challengeId, teamId || null);
      if (!result.success) return state;

      const registration: ChallengeRegistration = {
        id: result.registrationId!,
        challengeId,
        userId: state.challengeSystem.currentUserId,
        userName: state.challengeSystem.currentUserName,
        teamId: teamId || null,
        registeredAt: Date.now(),
        status: 'registered'
      };

      const newChallengeSystem = {
        ...state.challengeSystem,
        registrations: [...state.challengeSystem.registrations, registration]
      };
      saveChallengeSystem(newChallengeSystem);
      return { ...state, challengeSystem: newChallengeSystem };
    }),

    createChallengeTeam: (challengeId: string, teamName: string, slogan?: string) => update(state => {
      const result = createTeam(state.challengeSystem, challengeId, teamName, slogan);
      if (!result.success || !result.team) return state;

      const newChallengeSystem = {
        ...state.challengeSystem,
        teams: [...state.challengeSystem.teams, result.team]
      };
      saveChallengeSystem(newChallengeSystem);
      return { ...state, challengeSystem: newChallengeSystem };
    }),

    joinChallengeTeam: (teamId: string) => update(state => {
      const result = joinTeam(state.challengeSystem, teamId);
      if (!result.success) return state;

      const team = state.challengeSystem.teams.find(t => t.id === teamId);
      if (!team) return state;

      const updatedTeam = {
        ...team,
        members: [
          ...team.members,
          {
            userId: state.challengeSystem.currentUserId,
            userName: state.challengeSystem.currentUserName,
            role: 'member' as TeamRole,
            joinedAt: Date.now()
          }
        ]
      };

      const newChallengeSystem = {
        ...state.challengeSystem,
        teams: state.challengeSystem.teams.map(t => t.id === teamId ? updatedTeam : t)
      };
      saveChallengeSystem(newChallengeSystem);
      return { ...state, challengeSystem: newChallengeSystem };
    }),

    leaveChallengeTeam: (teamId: string) => update(state => {
      const result = leaveTeam(state.challengeSystem, teamId);
      if (!result.success) return state;

      const team = state.challengeSystem.teams.find(t => t.id === teamId);
      if (!team) return state;

      const updatedTeam = {
        ...team,
        members: team.members.filter(m => m.userId !== state.challengeSystem.currentUserId)
      };

      const newChallengeSystem = {
        ...state.challengeSystem,
        teams: state.challengeSystem.teams.map(t => t.id === teamId ? updatedTeam : t)
      };
      saveChallengeSystem(newChallengeSystem);
      return { ...state, challengeSystem: newChallengeSystem };
    }),

    lockChallengeTeam: (teamId: string) => update(state => {
      const result = lockTeam(state.challengeSystem, teamId);
      if (!result.success) return state;

      const newChallengeSystem = {
        ...state.challengeSystem,
        teams: state.challengeSystem.teams.map(t =>
          t.id === teamId ? { ...t, isLocked: true } : t
        )
      };
      saveChallengeSystem(newChallengeSystem);
      return { ...state, challengeSystem: newChallengeSystem };
    }),

    startChallengeDevelop: (challengeId: string) => update(state => {
      const result = startChallengeDevelopment(state.challengeSystem, challengeId);
      if (!result.success) return state;

      const newChallengeSystem = {
        ...state.challengeSystem,
        developTimer: {
          challengeId,
          startTime: Date.now(),
          timeLimitMs: result.timeLimitMs,
          remainingMs: result.timeLimitMs,
          isRunning: true
        }
      };
      saveChallengeSystem(newChallengeSystem);
      return { ...state, challengeSystem: newChallengeSystem };
    }),

    updateChallengeTimer: (remainingMs: number) => update(state => {
      const newChallengeSystem = {
        ...state.challengeSystem,
        developTimer: {
          ...state.challengeSystem.developTimer,
          remainingMs
        }
      };
      return { ...state, challengeSystem: newChallengeSystem };
    }),

    stopChallengeTimer: () => update(state => {
      const newChallengeSystem = {
        ...state.challengeSystem,
        developTimer: {
          ...state.challengeSystem.developTimer,
          isRunning: false
        }
      };
      saveChallengeSystem(newChallengeSystem);
      return { ...state, challengeSystem: newChallengeSystem };
    }),

    submitChallengePhoto: (challengeId: string, photo: ProcessedPhoto, developDurationMs: number) => update(state => {
      const result = submitChallengeWork(state.challengeSystem, challengeId, photo, developDurationMs);
      if (!result.success || !result.submission) return state;

      const newChallengeSystem = {
        ...state.challengeSystem,
        submissions: [...state.challengeSystem.submissions, result.submission],
        developTimer: {
          ...state.challengeSystem.developTimer,
          isRunning: false,
          challengeId: null
        }
      };
      saveChallengeSystem(newChallengeSystem);
      return { ...state, challengeSystem: newChallengeSystem };
    }),

    submitChallengeReview: (submissionId: string, scores: Record<string, number>, comment: string) => update(state => {
      const result = submitChallengeReview(state.challengeSystem, submissionId, scores, comment);
      if (!result.success || !result.review) return state;

      const submission = state.challengeSystem.submissions.find(s => s.id === submissionId);
      if (!submission) return state;

      const updatedSubmission = {
        ...submission,
        reviews: [...(submission.reviews || []), result.review],
        reviewScore: (submission.reviews || []).length > 0
          ? ((submission.reviewScore || 0) * (submission.reviews || []).length + result.review.score) / ((submission.reviews || []).length + 1)
          : result.review.score
      };

      const newChallengeSystem = {
        ...state.challengeSystem,
        submissions: state.challengeSystem.submissions.map(s =>
          s.id === submissionId ? updatedSubmission : s
        )
      };
      saveChallengeSystem(newChallengeSystem);
      return { ...state, challengeSystem: newChallengeSystem };
    }),

    finalizeChallengeScores: (challengeId: string) => update(state => {
      const finalized = finalizeSubmissionScores(state.challengeSystem, challengeId);
      const submissionMap = new Map(finalized.map(s => [s.id, s]));

      const newChallengeSystem = {
        ...state.challengeSystem,
        submissions: state.challengeSystem.submissions.map(s =>
          submissionMap.has(s.id) ? submissionMap.get(s.id)! : s
        )
      };
      saveChallengeSystem(newChallengeSystem);
      return { ...state, challengeSystem: newChallengeSystem };
    }),

    refreshChallengeStatuses: () => update(state => {
      const newChallengeSystem = updateChallengeStatuses(state.challengeSystem);
      saveChallengeSystem(newChallengeSystem);
      return { ...state, challengeSystem: newChallengeSystem };
    }),

    getFilteredChallenges: (filter: Partial<ChallengeFilter>): ChallengeDefinition[] => {
      let result: ChallengeDefinition[] = [];
      const unsubscribe = subscribe(state => {
        result = filterChallenges(state.challengeSystem, filter);
      });
      unsubscribe();
      return result;
    },

    getChallengeLeaderboard: (seasonId?: string, sortBy?: 'total_score' | 'best_score' | 'avg_score' | 'submissions'): ChallengeLeaderboardEntry[] => {
      let result: ChallengeLeaderboardEntry[] = [];
      const unsubscribe = subscribe(state => {
        result = calculateLeaderboard(
          state.challengeSystem,
          seasonId || state.challengeSystem.leaderboardFilter.seasonId,
          sortBy || state.challengeSystem.leaderboardFilter.sortBy
        );
      });
      unsubscribe();
      return result;
    },

    isUserRegisteredForChallenge: (challengeId: string): boolean => {
      let result = false;
      const unsubscribe = subscribe(state => {
        result = isUserRegistered(state.challengeSystem, challengeId);
      });
      unsubscribe();
      return result;
    },

    getUserTeamForChallenge: (challengeId: string): ChallengeTeam | null => {
      let result: ChallengeTeam | null = null;
      const unsubscribe = subscribe(state => {
        result = getUserTeam(state.challengeSystem, challengeId);
      });
      unsubscribe();
      return result;
    },

    getAvailableTeamsForChallenge: (challengeId: string): ChallengeTeam[] => {
      let result: ChallengeTeam[] = [];
      const unsubscribe = subscribe(state => {
        result = getAvailableTeams(state.challengeSystem, challengeId);
      });
      unsubscribe();
      return result;
    },

    getCurrentChallengeTheme: (challengeId: string): ChallengeTheme | null => {
      let result: ChallengeTheme | null = null;
      const unsubscribe = subscribe(state => {
        result = getCurrentTheme(state.challengeSystem, challengeId);
      });
      unsubscribe();
      return result;
    },

    sendChallengeTeamInvite: (teamId: string, inviteeId: string, inviteeName: string) => update(state => {
      const result = sendTeamInvite(state.challengeSystem, teamId, inviteeId, inviteeName);
      if (!result.success || !result.invite) return state;

      const newChallengeSystem = {
        ...state.challengeSystem,
        invites: [...state.challengeSystem.invites, result.invite]
      };
      saveChallengeSystem(newChallengeSystem);
      return { ...state, challengeSystem: newChallengeSystem };
    }),

    acceptChallengeTeamInvite: (inviteId: string) => update(state => {
      const result = acceptTeamInvite(state.challengeSystem, inviteId);
      if (!result.success || !result.teamId) return state;

      const team = state.challengeSystem.teams.find(t => t.id === result.teamId);
      if (!team) return state;

      const updatedTeam = {
        ...team,
        members: [
          ...team.members,
          {
            userId: state.challengeSystem.currentUserId,
            userName: state.challengeSystem.currentUserName,
            role: 'member' as TeamRole,
            joinedAt: Date.now()
          }
        ]
      };

      const newInvites = state.challengeSystem.invites.map(i =>
        i.id === inviteId ? { ...i, status: 'accepted' as const } : i
      );

      const newChallengeSystem = {
        ...state.challengeSystem,
        teams: state.challengeSystem.teams.map(t => t.id === result.teamId ? updatedTeam : t),
        invites: newInvites
      };
      saveChallengeSystem(newChallengeSystem);
      return { ...state, challengeSystem: newChallengeSystem };
    }),

    declineChallengeTeamInvite: (inviteId: string) => update(state => {
      const result = declineTeamInvite(state.challengeSystem, inviteId);
      if (!result.success) return state;

      const newChallengeSystem = {
        ...state.challengeSystem,
        invites: state.challengeSystem.invites.map(i =>
          i.id === inviteId ? { ...i, status: 'declined' as const } : i
        )
      };
      saveChallengeSystem(newChallengeSystem);
      return { ...state, challengeSystem: newChallengeSystem };
    }),

    refreshChallengeInvites: () => update(state => {
      const newChallengeSystem = expireOldInvites(state.challengeSystem);
      saveChallengeSystem(newChallengeSystem);
      return { ...state, challengeSystem: newChallengeSystem };
    }),

    advanceChallengeTheme: (challengeId: string) => update(state => {
      const result = advanceChallengeTheme(state.challengeSystem, challengeId);
      if (!result.success) return state;

      const challenge = state.challengeSystem.challenges.find(c => c.id === challengeId);
      if (!challenge) return state;

      const newChallengeSystem = {
        ...state.challengeSystem,
        challenges: state.challengeSystem.challenges.map(c =>
          c.id === challengeId ? { ...c, currentThemeIndex: challenge.currentThemeIndex + 1 } : c
        )
      };
      saveChallengeSystem(newChallengeSystem);
      return { ...state, challengeSystem: newChallengeSystem };
    }),

    autoAdvanceChallengeThemes: () => update(state => {
      let newChallengeSystem = state.challengeSystem;
      state.challengeSystem.challenges.forEach(c => {
        newChallengeSystem = autoAdvanceTheme(newChallengeSystem, c.id);
      });
      saveChallengeSystem(newChallengeSystem);
      return { ...state, challengeSystem: newChallengeSystem };
    }),

    finalizeAndAwardChallenge: (challengeId: string) => update(state => {
      const result = finalizeAndAwardChallenge(state.challengeSystem, challengeId);
      if (!result.success || !result.award) return state;

      const submissionMap = new Map(finalizeSubmissionScores(state.challengeSystem, challengeId).map(s => [s.id, s]));

      let newChallengeSystem = {
        ...state.challengeSystem,
        submissions: state.challengeSystem.submissions.map(s =>
          submissionMap.has(s.id) ? submissionMap.get(s.id)! : s
        ),
        awards: [...state.challengeSystem.awards, result.award!],
        challenges: state.challengeSystem.challenges.map(c =>
          c.id === challengeId ? { ...c, status: 'completed' as ChallengeStatus } : c
        )
      };

      newChallengeSystem = updateSeasonBadgesFromAward(newChallengeSystem, result.award!);

      saveChallengeSystem(newChallengeSystem);
      return { ...state, challengeSystem: newChallengeSystem };
    }),

    setChallengeLeaderboardViewMode: (viewMode: 'individual' | 'team') => update(state => {
      const newChallengeSystem = {
        ...state.challengeSystem,
        leaderboardFilter: { ...state.challengeSystem.leaderboardFilter, viewMode }
      };
      saveChallengeSystem(newChallengeSystem);
      return { ...state, challengeSystem: newChallengeSystem };
    }),

    getTeamLeaderboard: (seasonId?: string, sortBy?: 'total_score' | 'best_score' | 'avg_score' | 'submissions'): ChallengeTeamLeaderboardEntry[] => {
      let result: ChallengeTeamLeaderboardEntry[] = [];
      const unsubscribe = subscribe(state => {
        result = calculateTeamLeaderboard(
          state.challengeSystem,
          seasonId || state.challengeSystem.leaderboardFilter.seasonId,
          sortBy || state.challengeSystem.leaderboardFilter.sortBy
        );
      });
      unsubscribe();
      return result;
    },

    getChallengeAwards: (challengeId: string) => {
      let result: ReturnType<typeof getAwardsForChallenge> = null;
      const unsubscribe = subscribe(state => {
        result = getAwardsForChallenge(state.challengeSystem, challengeId);
      });
      unsubscribe();
      return result;
    },

    getMyChallengeAwards: () => {
      let result: ReturnType<typeof getUserAwards> = [];
      const unsubscribe = subscribe(state => {
        result = getUserAwards(state.challengeSystem, state.challengeSystem.currentUserId);
      });
      unsubscribe();
      return result;
    },

    getMyBadges: () => {
      let result: ReturnType<typeof getUserBadges> = [];
      const unsubscribe = subscribe(state => {
        result = getUserBadges(state.challengeSystem, state.challengeSystem.currentUserId);
      });
      unsubscribe();
      return result;
    },

    canSubmitToCurrentChallenge: (challengeId: string): boolean => {
      let result = false;
      const unsubscribe = subscribe(state => {
        result = canSubmitToChallenge(state.challengeSystem, challengeId);
      });
      unsubscribe();
      return result;
    },

    getChallengeProgressInfo: (challengeId: string) => {
      let result: ReturnType<typeof getChallengeProgress> | null = null;
      const unsubscribe = subscribe(state => {
        result = getChallengeProgress(state.challengeSystem, challengeId);
      });
      unsubscribe();
      return result;
    },

    getChallengeThemeSchedule: (challengeId: string) => {
      let result: ReturnType<typeof getThemeSchedule> = [];
      const unsubscribe = subscribe(state => {
        const challenge = getChallengeById(state.challengeSystem, challengeId);
        if (challenge) {
          result = getThemeSchedule(challenge);
        }
      });
      unsubscribe();
      return result;
    },

    resetChallengeSystem: () => update(state => {
      const newChallengeSystem = createInitialChallengeSystemState();
      saveChallengeSystem(newChallengeSystem);
      return { ...state, challengeSystem: newChallengeSystem };
    })
  };
}

function loadSavedPhotos(): { photos: ProcessedPhoto[]; status: Partial<StorageStatus> } {
  const result = loadWithFallback<ProcessedPhoto[]>('photos', []);
  const photos = result.data || [];
  const repaired = repairPhotos(photos);
  const status: Partial<StorageStatus> = {
    photosLoaded: repaired.length
  };
  
  if (result.migrationPerformed) {
    status.migrationPerformed = true;
  }
  if (result.recovered) {
    status.recoveryPerformed = true;
  }
  if (photos.length !== repaired.length) {
    status.corruptedItems = { photos: photos.length - repaired.length, presets: 0, favorites: 0, collections: 0, orders: 0 };
  }
  
  const limited = enforceLimits('photos', repaired);
  
  return { photos: limited, status };
}

function savePhotos(photos: ProcessedPhoto[]): boolean {
  const limited = enforceLimits('photos', photos);
  return saveWithBackup('photos', limited, limited.length);
}

function loadSavedPresets(): { presets: ParamPreset[]; status: Partial<StorageStatus> } {
  const result = loadWithFallback<ParamPreset[]>('presets', []);
  const userPresets = result.data || [];
  const repaired = repairPresets(userPresets);
  const status: Partial<StorageStatus> = {
    presetsLoaded: repaired.length
  };
  
  if (result.migrationPerformed) {
    status.migrationPerformed = true;
  }
  if (result.recovered) {
    status.recoveryPerformed = true;
  }
  if (userPresets.length !== repaired.length) {
    status.corruptedItems = { photos: 0, presets: userPresets.length - repaired.length, favorites: 0, collections: 0, orders: 0 };
  }
  
  const allPresets = [...DEFAULT_PRESETS, ...repaired];
  const limited = enforceLimits('presets', allPresets);
  
  return { presets: limited, status };
}

function savePresets(presets: ParamPreset[]): boolean {
  const userPresets = presets.filter(p => !p.isDefault);
  const limited = enforceLimits('presets', userPresets);
  return saveWithBackup('presets', limited, limited.length);
}

function loadSavedFavorites(validPhotoIds: string[]): { favorites: FavoriteInfo[]; status: Partial<StorageStatus> } {
  const result = loadWithFallback<FavoriteInfo[]>('favorites', []);
  const favorites = result.data || [];
  const repaired = repairFavorites(favorites, validPhotoIds);
  const status: Partial<StorageStatus> = {
    favoritesLoaded: repaired.length
  };
  
  if (result.migrationPerformed) {
    status.migrationPerformed = true;
  }
  if (result.recovered) {
    status.recoveryPerformed = true;
  }
  if (favorites.length !== repaired.length) {
    status.corruptedItems = { photos: 0, presets: 0, favorites: favorites.length - repaired.length, collections: 0, orders: 0 };
  }
  
  return { favorites: repaired, status };
}

function saveFavorites(favorites: FavoriteInfo[]): boolean {
  return saveWithBackup('favorites', favorites, favorites.length);
}

function loadSavedCollections(validPhotoIds: string[]): { collections: PhotoCollection[]; status: Partial<StorageStatus> } {
  const result = loadWithFallback<PhotoCollection[]>('collections', []);
  const collections = result.data || [];
  const repaired = repairCollections(collections, validPhotoIds);
  const status: Partial<StorageStatus> = {
    collectionsLoaded: repaired.length
  };
  
  if (result.migrationPerformed) {
    status.migrationPerformed = true;
  }
  if (result.recovered) {
    status.recoveryPerformed = true;
  }
  if (collections.length !== repaired.length) {
    status.corruptedItems = { photos: 0, presets: 0, favorites: 0, collections: collections.length - repaired.length, orders: 0 };
  }
  
  const limited = enforceLimits('collections', repaired);
  
  return { collections: limited, status };
}

function saveCollections(collections: PhotoCollection[]): boolean {
  const limited = enforceLimits('collections', collections);
  return saveWithBackup('collections', limited, limited.length);
}

export function calculateCollectionStats(photos: ProcessedPhoto[]): CollectionStats {
  if (photos.length === 0) {
    return {
      total: 0,
      avgScore: 0,
      bestScore: 0,
      worstScore: 0,
      gradeCounts: { S: 0, A: 0, B: 0, C: 0, D: 0 },
      subjectCounts: {},
      filmCounts: {},
      scoreDistribution: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    };
  }
  
  const total = photos.length;
  const scores = photos.map(p => p.score);
  const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / total);
  const bestScore = Math.max(...scores);
  const worstScore = Math.min(...scores);
  
  const gradeCounts: Record<string, number> = { S: 0, A: 0, B: 0, C: 0, D: 0 };
  photos.forEach(p => { gradeCounts[p.details.grade]++; });
  
  const subjectCounts: Record<string, number> = {};
  photos.forEach(p => {
    subjectCounts[p.subjectId] = (subjectCounts[p.subjectId] || 0) + 1;
  });
  
  const filmCounts: Record<string, number> = {};
  photos.forEach(p => {
    filmCounts[p.filmId] = (filmCounts[p.filmId] || 0) + 1;
  });
  
  const scoreDistribution = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  photos.forEach(p => {
    const bucket = Math.min(9, Math.floor(p.score / 10));
    scoreDistribution[bucket]++;
  });
  
  return {
    total,
    avgScore,
    bestScore,
    worstScore,
    gradeCounts,
    subjectCounts,
    filmCounts,
    scoreDistribution
  };
}

export const gameStore = createGameStore();

export const canStartDevelop = derived(
  gameStore,
  $store => $store.currentSubject !== null && !$store.isDeveloping
);

function calculateSubjectPreferences(photos: ProcessedPhoto[]): SubjectPreferenceItem[] {
  const subjectMap = new Map<string, ProcessedPhoto[]>();
  photos.forEach(p => {
    if (!subjectMap.has(p.subjectId)) {
      subjectMap.set(p.subjectId, []);
    }
    subjectMap.get(p.subjectId)!.push(p);
  });

  const preferences: SubjectPreferenceItem[] = [];
  subjectMap.forEach((subjectPhotos, subjectId) => {
    const subject = PHOTO_SUBJECTS.find(s => s.id === subjectId);
    const scores = subjectPhotos.map(p => p.score);
    const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const bestScore = Math.max(...scores);
    const winCount = subjectPhotos.filter(p => p.score >= 70).length;
    const winRate = Math.round((winCount / subjectPhotos.length) * 100);

    preferences.push({
      subjectId,
      subjectName: subject?.name || '未知题材',
      count: subjectPhotos.length,
      avgScore,
      bestScore,
      winRate,
      totalAttempts: subjectPhotos.length
    });
  });

  return preferences.sort((a, b) => b.count - a.count);
}

function calculateFilmWinRates(photos: ProcessedPhoto[]): FilmWinRateItem[] {
  const filmMap = new Map<string, ProcessedPhoto[]>();
  photos.forEach(p => {
    if (!filmMap.has(p.filmId)) {
      filmMap.set(p.filmId, []);
    }
    filmMap.get(p.filmId)!.push(p);
  });

  const winRates: FilmWinRateItem[] = [];
  filmMap.forEach((filmPhotos, filmId) => {
    const film = FILM_STOCKS.find(f => f.id === filmId);
    const scores = filmPhotos.map(p => p.score);
    const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const bestScore = Math.max(...scores);
    const winCount = filmPhotos.filter(p => p.score >= 70).length;
    const winRate = Math.round((winCount / filmPhotos.length) * 100);
    const gradeCounts: Record<string, number> = { S: 0, A: 0, B: 0, C: 0, D: 0 };
    filmPhotos.forEach(p => { gradeCounts[p.details.grade]++; });

    winRates.push({
      filmId,
      filmName: film?.name || '未知胶片',
      count: filmPhotos.length,
      avgScore,
      bestScore,
      winRate,
      gradeCounts,
      color: film?.color || 'bw',
      thumbnailColor: film?.thumbnailColor || '#666666'
    });
  });

  return winRates.sort((a, b) => b.winRate - a.winRate);
}

function calculateScoreSegments(photos: ProcessedPhoto[], segmentSize: number = 10): ScoreSegmentItem[] {
  if (photos.length === 0) return [];

  const sortedPhotos = [...photos].sort((a, b) => a.timestamp - b.timestamp);
  const segments: ScoreSegmentItem[] = [];
  const totalSegments = Math.ceil(sortedPhotos.length / segmentSize);

  for (let i = 0; i < totalSegments; i++) {
    const startIdx = i * segmentSize;
    const endIdx = Math.min(startIdx + segmentSize, sortedPhotos.length);
    const segmentPhotos = sortedPhotos.slice(startIdx, endIdx);
    const scores = segmentPhotos.map(p => p.score);
    const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const bestScore = Math.max(...scores);
    const worstScore = Math.min(...scores);
    const gradeCounts: Record<string, number> = { S: 0, A: 0, B: 0, C: 0, D: 0 };
    segmentPhotos.forEach(p => { gradeCounts[p.details.grade]++; });

    segments.push({
      segment: `第 ${i + 1} 段`,
      startIndex: startIdx,
      endIndex: endIdx - 1,
      count: segmentPhotos.length,
      avgScore,
      bestScore,
      worstScore,
      gradeCounts,
      dateRange: {
        start: segmentPhotos[0].timestamp,
        end: segmentPhotos[segmentPhotos.length - 1].timestamp
      }
    });
  }

  return segments;
}

function calculateQualityFluctuation(photos: ProcessedPhoto[], recentCount: number = 20): QualityFluctuationItem[] {
  if (photos.length === 0) return [];

  const sortedPhotos = [...photos].sort((a, b) => a.timestamp - b.timestamp);
  const recentPhotos = sortedPhotos.slice(-recentCount);
  const allScores = sortedPhotos.map(p => p.score);
  const overallAvg = allScores.reduce((a, b) => a + b, 0) / allScores.length;

  const fluctuation: QualityFluctuationItem[] = [];
  recentPhotos.forEach((photo, idx) => {
    const subject = PHOTO_SUBJECTS.find(s => s.id === photo.subjectId);
    const film = FILM_STOCKS.find(f => f.id === photo.filmId);
    const deviation = Math.round((photo.score - overallAvg) * 10) / 10;

    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (idx > 0) {
      const prevScore = recentPhotos[idx - 1].score;
      if (photo.score - prevScore > 3) trend = 'up';
      else if (photo.score - prevScore < -3) trend = 'down';
    }

    fluctuation.push({
      index: sortedPhotos.length - recentPhotos.length + idx,
      score: photo.score,
      grade: photo.details.grade,
      timestamp: photo.timestamp,
      deviation,
      trend,
      subjectName: subject?.name || '未知',
      filmName: film?.name || '未知'
    });
  });

  return fluctuation;
}

function calculateOverallTrend(fluctuation: QualityFluctuationItem[]): 'improving' | 'declining' | 'stable' {
  if (fluctuation.length < 3) return 'stable';

  const firstHalf = fluctuation.slice(0, Math.floor(fluctuation.length / 2));
  const secondHalf = fluctuation.slice(Math.floor(fluctuation.length / 2));
  const firstAvg = firstHalf.reduce((s, f) => s + f.score, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((s, f) => s + f.score, 0) / secondHalf.length;
  const diff = secondAvg - firstAvg;

  if (diff > 3) return 'improving';
  if (diff < -3) return 'declining';
  return 'stable';
}

export const statistics = derived(
  gameStore,
  $store => {
    const photos = $store.processedPhotos;
    if (photos.length === 0) {
      return {
        total: 0,
        avgScore: 0,
        bestScore: 0,
        gradeCounts: { S: 0, A: 0, B: 0, C: 0, D: 0 },
        subjectPreferences: [],
        filmWinRates: [],
        scoreSegments: [],
        qualityFluctuation: [],
        recentAvgScore: 0,
        overallTrend: 'stable' as const
      } satisfies ExtendedStatistics;
    }

    const total = photos.length;
    const avgScore = Math.round(photos.reduce((sum, p) => sum + p.score, 0) / total);
    const bestScore = Math.max(...photos.map(p => p.score));
    const gradeCounts = { S: 0, A: 0, B: 0, C: 0, D: 0 };
    photos.forEach(p => { gradeCounts[p.details.grade]++; });

    const subjectPreferences = calculateSubjectPreferences(photos);
    const filmWinRates = calculateFilmWinRates(photos);
    const scoreSegments = calculateScoreSegments(photos);
    const qualityFluctuation = calculateQualityFluctuation(photos);

    const recentPhotos = qualityFluctuation;
    const recentAvgScore = recentPhotos.length > 0
      ? Math.round(recentPhotos.reduce((s, f) => s + f.score, 0) / recentPhotos.length)
      : avgScore;
    const overallTrend = calculateOverallTrend(qualityFluctuation);

    return {
      total,
      avgScore,
      bestScore,
      gradeCounts,
      subjectPreferences,
      filmWinRates,
      scoreSegments,
      qualityFluctuation,
      recentAvgScore,
      overallTrend
    } satisfies ExtendedStatistics;
  }
);

export { computeAchievementProgress, calculateCurrentStreak };

function generatePublicationHtml(
  pub: Publication,
  photos: { photoId: string; caption: string; crop: PublicationCrop; imageUrl: string; score: number; grade: string }[]
): string {
  const coverPhotoData = pub.cover.coverPhotoId
    ? photos.find(p => p.photoId === pub.cover.coverPhotoId)
    : photos[0];
  const coverPhotoUrl = coverPhotoData?.imageUrl || '';
  const coverCrop = coverPhotoData?.crop;
  const dateStr = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });

  const coverStyles: Record<string, string> = {
    minimal: 'background:#faf8f5;color:#2d1a12;font-family:Georgia,serif;',
    classic: `background:${pub.cover.backgroundColor};color:#e8dcc4;font-family:Georgia,serif;`,
    artistic: 'background:linear-gradient(135deg,#2d1a12,#4a2c1a);color:#e8c890;font-family:Georgia,serif;',
    darkroom: 'background:#0d0604;color:#c8a878;font-family:Courier New,monospace;',
    magazine: 'background:#1a1a2e;color:#e8e8e8;font-family:Helvetica,Arial,sans-serif;'
  };

  const pageLayouts: Record<string, string> = {
    full: 'grid-template-columns:1fr;',
    half_h: 'grid-template-columns:1fr 1fr;',
    half_v: 'grid-template-columns:1fr 1fr;',
    thirds: 'grid-template-columns:1fr 1fr 1fr;',
    quarter: 'grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;',
    feature_plus_strip: 'grid-template-columns:2fr 1fr;'
  };

  function cropStyle(crop: PublicationCrop): string {
    if (crop.x === 0 && crop.y === 0 && crop.width === 100 && crop.height === 100) {
      return '';
    }
    const top = crop.y;
    const right = 100 - crop.x - crop.width;
    const bottom = 100 - crop.y - crop.height;
    const left = crop.x;
    return `clip-path:inset(${top}% ${right}% ${bottom}% ${left}%);`;
  }

  function coverCropAttr(crop: PublicationCrop | undefined): string {
    if (!crop || (crop.x === 0 && crop.y === 0 && crop.width === 100 && crop.height === 100)) {
      return '';
    }
    const top = crop.y;
    const right = 100 - crop.x - crop.width;
    const bottom = 100 - crop.y - crop.height;
    const left = crop.x;
    return `clip-path:inset(${top}% ${right}% ${bottom}% ${left}%);`;
  }

  let pagesHtml = '';
  pub.pages.forEach((page, pageIdx) => {
    const layoutStyle = pageLayouts[page.layout] || pageLayouts.full;
    const pagePhotos = page.photoIds.map(id => photos.find(p => p.photoId === id)).filter(Boolean);
    const cellsHtml = pagePhotos.map(p => {
      const cs = cropStyle(p!.crop);
      const imgStyle = cs
        ? `width:${100 * 100 / p!.crop.width}%;height:${100 * 100 / p!.crop.height}%;margin-left:-${p!.crop.x * 100 / p!.crop.width}%;margin-top:-${p!.crop.y * 100 / p!.crop.height}%;object-fit:cover;display:block;max-width:none;`
        : 'width:100%;height:100%;object-fit:cover;display:block;';
      return `
      <div style="position:relative;overflow:hidden;border-radius:4px;">
        <img src="${p!.imageUrl}" style="${imgStyle}" alt="" />
        ${p!.caption ? `<p style="position:absolute;bottom:0;left:0;right:0;margin:0;padding:8px 12px;background:rgba(0,0,0,0.6);color:#e8dcc4;font-size:12px;">${p!.caption}</p>` : ''}
      </div>`;
    }).join('');

    pagesHtml += `
      <div style="page-break-after:always;min-height:100vh;display:flex;flex-direction:column;padding:40px;">
        <div style="flex:1;display:grid;${layoutStyle}gap:12px;align-content:center;">
          ${cellsHtml || '<p style="color:#888;text-align:center;grid-column:1/-1;">空白页</p>'}
        </div>
        <div style="text-align:right;font-size:10px;color:#888;margin-top:16px;">${pageIdx + 1}</div>
      </div>`;
  });

  if (pagesHtml === '' && photos.length > 0) {
    photos.forEach((p, i) => {
      const cs = cropStyle(p.crop);
      const imgStyle = cs
        ? `max-width:none;width:${100 * 100 / p.crop.width}%;height:${100 * 100 / p.crop.height}%;margin-left:-${p.crop.x * 100 / p.crop.width}%;margin-top:-${p.crop.y * 100 / p.crop.height}%;object-fit:cover;border-radius:4px;`
        : 'max-width:100%;max-height:80vh;object-fit:contain;border-radius:4px;';
      pagesHtml += `
        <div style="page-break-after:always;min-height:100vh;display:flex;flex-direction:column;justify-content:center;padding:40px;">
          <div style="flex:1;display:flex;align-items:center;justify-content:center;overflow:hidden;">
            <img src="${p.imageUrl}" style="${imgStyle}" alt="" />
          </div>
          ${p.caption ? `<p style="text-align:center;color:#8a7a5a;font-size:14px;margin-top:16px;font-style:italic;">${p.caption}</p>` : ''}
          <div style="text-align:right;font-size:10px;color:#888;margin-top:16px;">${i + 1}</div>
        </div>`;
    });
  }

  const coverImgCrop = coverCropAttr(coverCrop);

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${pub.title}</title>
<style>@media print{body{margin:0;}}</style>
</head>
<body style="margin:0;padding:0;background:#1a0f0a;font-family:Georgia,serif;">
  <div style="${coverStyles[pub.cover.style] || coverStyles.classic}min-height:100vh;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:60px;page-break-after:always;">
    ${coverPhotoUrl ? `<div style="width:60%;max-width:400px;aspect-ratio:3/4;overflow:hidden;border-radius:8px;box-shadow:0 8px 32px rgba(0,0,0,0.4);margin-bottom:40px;"><img src="${coverPhotoUrl}" style="width:100%;height:100%;object-fit:cover;display:block;${coverImgCrop}" alt="" /></div>` : ''}
    <h1 style="font-size:36px;margin:0 0 12px;letter-spacing:4px;">${pub.cover.title}</h1>
    <p style="font-size:16px;opacity:0.8;margin:0 0 8px;">${pub.cover.subtitle}</p>
    ${pub.cover.showDate ? `<p style="font-size:12px;opacity:0.5;margin:0;">${dateStr}</p>` : ''}
  </div>
  ${pagesHtml}
</body>
</html>`;
}
