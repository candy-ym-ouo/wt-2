import { writable, derived } from 'svelte/store';
import type { GameState, ProcessedPhoto, DevParams, GamePhase, ParamPreset, PresetHistory, TutorialState, TutorialStepState, TutorialUnlockCondition } from '../types/game';
import { FILM_STOCKS, DEFAULT_PARAMS, PHOTO_SUBJECTS, TUTORIAL_STEPS, DEFAULT_PRESETS } from '../data/gameData';
import { generateId } from '../utils/math';

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

function loadSavedTutorialState(): TutorialState {
  try {
    const saved = localStorage.getItem('darkroom_tutorial');
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...parsed,
        steps: parsed.steps.map((s: TutorialStepState) => ({
          ...s,
          actionsPerformed: s.actionsPerformed || []
        }))
      };
    }
  } catch (e) {
    console.error('Failed to load tutorial state:', e);
  }
  return createInitialTutorialState();
}

function saveTutorialState(state: TutorialState) {
  try {
    localStorage.setItem('darkroom_tutorial', JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save tutorial state:', e);
  }
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
  const savedTutorial = loadSavedTutorialState();
  const phase = savedTutorial.isCompleted ? 'select' : 'tutorial';
  const currentStep = savedTutorial.isCompleted ? TUTORIAL_STEPS.length - 1 : savedTutorial.currentStep;

  return {
    currentSubject: null,
    currentFilm: FILM_STOCKS[0],
    currentParams: { ...DEFAULT_PARAMS },
    developmentProgress: 0,
    isDeveloping: false,
    phase: phase,
    processedPhotos: loadSavedPhotos(),
    tutorial: savedTutorial,
    tutorialStep: currentStep,
    selectedAlbumPhoto: null,
    presets: loadSavedPresets(),
    presetHistory: [],
    lastAppliedPresetId: null,
    adjustedParams: [],
    subjectSelectedAt: null,
    filmSelectedAt: null,
    paramAdjustTimestamps: {},
    developStartedAt: null
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
      const newState: GameState = {
        ...state,
        isDeveloping: true,
        developmentProgress: 0,
        phase: 'develop',
        developStartedAt: now
      };
      return checkAndUpdateTutorialProgress(newState);
    }),
    updateDevelopmentProgress: (progress: number) => update(state => ({
      ...state,
      developmentProgress: progress
    })),
    finishDevelopment: (photo: ProcessedPhoto) => update(state => {
      const newPhotos = [photo, ...state.processedPhotos].slice(0, 50);
      savePhotos(newPhotos);
      return {
        ...state,
        isDeveloping: false,
        developmentProgress: 1,
        phase: 'result',
        processedPhotos: newPhotos
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
      developmentProgress: 0
    })),
    deletePhoto: (photoId: string) => update(state => {
      const newPhotos = state.processedPhotos.filter(p => p.id !== photoId);
      savePhotos(newPhotos);
      return {
        ...state,
        processedPhotos: newPhotos,
        selectedAlbumPhoto: state.selectedAlbumPhoto?.id === photoId ? null : state.selectedAlbumPhoto
      };
    }),
    updatePhotoNotes: (photoId: string, notes: string) => update(state => {
      const newPhotos = state.processedPhotos.map(p =>
        p.id === photoId ? { ...p, notes } : p
      );
      savePhotos(newPhotos);
      return {
        ...state,
        processedPhotos: newPhotos,
        selectedAlbumPhoto: state.selectedAlbumPhoto?.id === photoId
          ? { ...state.selectedAlbumPhoto, notes }
          : state.selectedAlbumPhoto
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
        
        savePresets(newPresets);
        return {
          ...state,
          presets: newPresets,
          presetHistory: [historyEntry, ...state.presetHistory].slice(0, 20)
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
        savePresets(newPresets);
        return {
          ...state,
          presets: newPresets
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
      savePresets(newPresets);
      return {
        ...state,
        presets: newPresets,
        lastAppliedPresetId: state.lastAppliedPresetId === presetId ? null : state.lastAppliedPresetId
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
      
      savePresets(newPresets);
      return {
        ...state,
        presets: newPresets,
        presetHistory: [currentHistory, ...state.presetHistory.filter(h => h !== historyEntry)].slice(0, 20)
      };
    }),
    reset: () => {
      const newState = createInitialGameState();
      set(newState);
    }
  };
}

function loadSavedPhotos(): ProcessedPhoto[] {
  try {
    const saved = localStorage.getItem('darkroom_photos');
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error('Failed to load photos:', e);
  }
  return [];
}

function savePhotos(photos: ProcessedPhoto[]) {
  try {
    localStorage.setItem('darkroom_photos', JSON.stringify(photos));
  } catch (e) {
    console.error('Failed to save photos:', e);
  }
}

function loadSavedPresets(): ParamPreset[] {
  try {
    const saved = localStorage.getItem('darkroom_presets');
    if (saved) {
      const userPresets = JSON.parse(saved);
      return [...DEFAULT_PRESETS, ...userPresets];
    }
  } catch (e) {
    console.error('Failed to load presets:', e);
  }
  return [...DEFAULT_PRESETS];
}

function savePresets(presets: ParamPreset[]) {
  try {
    const userPresets = presets.filter(p => !p.isDefault);
    localStorage.setItem('darkroom_presets', JSON.stringify(userPresets));
  } catch (e) {
    console.error('Failed to save presets:', e);
  }
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
