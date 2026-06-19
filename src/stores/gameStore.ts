import { writable, derived } from 'svelte/store';
import type { GameState, ProcessedPhoto, DevParams, GamePhase, ParamPreset, PresetHistory, TutorialState, TutorialStepState, TutorialUnlockCondition, StageState, DevelopStage, StageDuration, StorageStatus, StorageWarning } from '../types/game';
import { FILM_STOCKS, DEFAULT_PARAMS, PHOTO_SUBJECTS, TUTORIAL_STEPS, DEFAULT_PRESETS } from '../data/gameData';
import { generateId } from '../utils/math';
import {
  loadWithFallback,
  saveWithBackup,
  enforceLimits,
  isStorageNearLimit,
  getStorageInfo,
  repairPhotos,
  repairPresets,
  clearStorage,
  exportAllData,
  importAllData,
  MAX_PHOTOS,
  MAX_PRESETS
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
    lastSaveSuccess: true,
    storageUsed: info.used,
    storageQuota: info.quota,
    migrationPerformed: false,
    recoveryPerformed: false,
    corruptedItems: {
      photos: 0,
      presets: 0
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
  
  const savedTutorial = tutorialResult.state;
  const phase = savedTutorial.isCompleted ? 'select' : 'tutorial';
  const currentStep = savedTutorial.isCompleted ? TUTORIAL_STEPS.length - 1 : savedTutorial.currentStep;
  
  const storageStatus = createInitialStorageStatus();
  storageStatus.photosLoaded = photosResult.status.photosLoaded || 0;
  storageStatus.presetsLoaded = presetsResult.status.presetsLoaded || 0;
  storageStatus.tutorialLoaded = tutorialResult.status.tutorialLoaded || false;
  storageStatus.migrationPerformed = !!(photosResult.status.migrationPerformed || 
    presetsResult.status.migrationPerformed || 
    tutorialResult.status.migrationPerformed);
  storageStatus.recoveryPerformed = !!(photosResult.status.recoveryPerformed || 
    presetsResult.status.recoveryPerformed || 
    tutorialResult.status.recoveryPerformed);
  
  if (photosResult.status.corruptedItems?.photos) {
    storageStatus.corruptedItems.photos = photosResult.status.corruptedItems.photos;
  }
  if (presetsResult.status.corruptedItems?.presets) {
    storageStatus.corruptedItems.presets = presetsResult.status.corruptedItems.presets;
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
  
  if (storageStatus.corruptedItems.photos > 0 || storageStatus.corruptedItems.presets > 0) {
    warnings.push({
      type: 'corrupted',
      message: `发现 ${storageStatus.corruptedItems.photos + storageStatus.corruptedItems.presets} 个损坏数据项，已自动清理`,
      timestamp: now,
      details: `照片: ${storageStatus.corruptedItems.photos} 个, 预设: ${storageStatus.corruptedItems.presets} 个`
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
    storageStatus
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
      maxPresets: MAX_PRESETS
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
    status.corruptedItems = { photos: photos.length - repaired.length, presets: 0 };
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
    status.corruptedItems = { photos: 0, presets: userPresets.length - repaired.length };
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

export const gameStore = createGameStore();

export const canStartDevelop = derived(
  gameStore,
  $store => $store.currentSubject !== null && !$store.isDeveloping
);

export const statistics = derived(
  gameStore,
  $store => {
    const photos = $store.processedPhotos;
    if (photos.length === 0) {
      return { total: 0, avgScore: 0, bestScore: 0, gradeCounts: { S: 0, A: 0, B: 0, C: 0, D: 0 } };
    }
    const total = photos.length;
    const avgScore = Math.round(photos.reduce((sum, p) => sum + p.score, 0) / total);
    const bestScore = Math.max(...photos.map(p => p.score));
    const gradeCounts = { S: 0, A: 0, B: 0, C: 0, D: 0 };
    photos.forEach(p => { gradeCounts[p.details.grade]++; });
    return { total, avgScore, bestScore, gradeCounts };
  }
);
