import { writable, derived } from 'svelte/store';
import type { GameState, ProcessedPhoto, DevParams, GamePhase, ParamPreset, PresetHistory, TutorialState, TutorialStepState, TutorialUnlockCondition, StageState, DevelopStage, StageDuration, StorageStatus, StorageWarning, FavoriteInfo, PhotoCollection, CollectionGroup, CollectionStats, AlbumViewMode, AttemptRecord, ExtendedStatistics, SubjectPreferenceItem, FilmWinRateItem, ScoreSegmentItem, QualityFluctuationItem, AchievementState, AchievementProgress, AchievementCondition, AchievementLine } from '../types/game';
import { FILM_STOCKS, DEFAULT_PARAMS, PHOTO_SUBJECTS, TUTORIAL_STEPS, DEFAULT_PRESETS, ACHIEVEMENT_DEFINITIONS } from '../data/gameData';
import { generateId } from '../utils/math';
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
  loadSavedAchievements,
  saveAchievements,
  createDefaultAchievementState
} from '../utils/storage';

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
    lastSaveSuccess: true,
    storageUsed: info.used,
    storageQuota: info.quota,
    migrationPerformed: false,
    recoveryPerformed: false,
    corruptedItems: {
      photos: 0,
      presets: 0,
      favorites: 0,
      collections: 0
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

function createInitialGameState(): GameState {
  const tutorialResult = loadSavedTutorialState();
  const photosResult = loadSavedPhotos();
  const presetsResult = loadSavedPresets();
  
  const validPhotoIds = photosResult.photos.map(p => p.id);
  const favoritesResult = loadSavedFavorites(validPhotoIds);
  const collectionsResult = loadSavedCollections(validPhotoIds);
  const achievementsResult = loadSavedAchievements();
  
  const savedTutorial = tutorialResult.state;
  const phase = savedTutorial.isCompleted ? 'select' : 'tutorial';
  const currentStep = savedTutorial.isCompleted ? TUTORIAL_STEPS.length - 1 : savedTutorial.currentStep;
  
  const storageStatus = createInitialStorageStatus();
  storageStatus.photosLoaded = photosResult.status.photosLoaded || 0;
  storageStatus.presetsLoaded = presetsResult.status.presetsLoaded || 0;
  storageStatus.favoritesLoaded = favoritesResult.status.favoritesLoaded || 0;
  storageStatus.collectionsLoaded = collectionsResult.status.collectionsLoaded || 0;
  storageStatus.tutorialLoaded = tutorialResult.status.tutorialLoaded || false;
  storageStatus.migrationPerformed = !!(photosResult.status.migrationPerformed || 
    presetsResult.status.migrationPerformed || 
    tutorialResult.status.migrationPerformed ||
    favoritesResult.status.migrationPerformed ||
    collectionsResult.status.migrationPerformed);
  storageStatus.recoveryPerformed = !!(photosResult.status.recoveryPerformed || 
    presetsResult.status.recoveryPerformed || 
    tutorialResult.status.recoveryPerformed ||
    favoritesResult.status.recoveryPerformed ||
    collectionsResult.status.recoveryPerformed);
  
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
    storageStatus.corruptedItems.collections;
  if (corruptedCount > 0) {
    warnings.push({
      type: 'corrupted',
      message: `发现 ${corruptedCount} 个损坏数据项，已自动清理`,
      timestamp: now,
      details: `照片: ${storageStatus.corruptedItems.photos} 个, 预设: ${storageStatus.corruptedItems.presets} 个, 收藏: ${storageStatus.corruptedItems.favorites} 个, 精选集: ${storageStatus.corruptedItems.collections} 个`
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
    achievements: achievementsResult
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
      
      return {
        ...state,
        isDeveloping: false,
        developmentProgress: 1,
        phase: 'result',
        processedPhotos: newPhotos,
        attemptHistory: newAttemptHistory,
        achievements: newAchievements,
        storageStatus: newStorageStatus,
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
    }
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
    status.corruptedItems = { photos: photos.length - repaired.length, presets: 0, favorites: 0, collections: 0 };
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
    status.corruptedItems = { photos: 0, presets: userPresets.length - repaired.length, favorites: 0, collections: 0 };
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
    status.corruptedItems = { photos: 0, presets: 0, favorites: favorites.length - repaired.length, collections: 0 };
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
    status.corruptedItems = { photos: 0, presets: 0, favorites: 0, collections: collections.length - repaired.length };
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
