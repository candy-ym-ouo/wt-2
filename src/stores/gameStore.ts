import { writable, derived } from 'svelte/store';
import type { GameState, ProcessedPhoto, DevParams, GamePhase, ParamPreset, PresetHistory, TutorialState, TutorialStepState, TutorialUnlockCondition } from '../types/game';
import { FILM_STOCKS, DEFAULT_PARAMS, PHOTO_SUBJECTS, TUTORIAL_STEPS, DEFAULT_PRESETS } from '../data/gameData';
import { generateId } from '../utils/math';

function createInitialTutorialState(): TutorialState {
  const stepStates: TutorialStepState[] = TUTORIAL_STEPS.map((step, index) => ({
    stepId: step.id,
    unlocked: index === 0,
    completed: false,
    skipped: false
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
    case 'develop_started':
      return state.developmentProgress > 0 || state.processedPhotos.length > 0;
    case 'custom':
      try {
        return condition.check();
      } catch {
        return false;
      }
    default:
      return false;
  }
}

function checkAndUpdateTutorialProgress(state: GameState): GameState {
  const newSteps = [...state.tutorial.steps];
  let hasChanges = false;

  for (let i = 0; i < TUTORIAL_STEPS.length; i++) {
    const step = TUTORIAL_STEPS[i];
    const stepState = newSteps[i];

    if (!stepState.unlocked) {
      if (checkUnlockCondition(step.unlockCondition, state)) {
        newSteps[i] = { ...stepState, unlocked: true };
        hasChanges = true;
      }
    }

    if (stepState.unlocked && !stepState.completed && !stepState.skipped && step.requiresCompletion) {
      if (checkUnlockCondition(step.unlockCondition, state)) {
        newSteps[i] = { 
          ...stepState, 
          completed: true, 
          completedAt: Date.now() 
        };
        hasChanges = true;

        if (i < TUTORIAL_STEPS.length - 1) {
          const nextStep = TUTORIAL_STEPS[i + 1];
          if (checkUnlockCondition(nextStep.unlockCondition, state)) {
            newSteps[i + 1] = { ...newSteps[i + 1], unlocked: true };
          }
        }
      }
    }
  }

  if (hasChanges) {
    const allCompleted = newSteps.every(s => s.completed || s.skipped);
    const currentPhase = TUTORIAL_STEPS[state.tutorial.currentStep]?.phase || 'intro';
    
    return {
      ...state,
      tutorial: {
        ...state.tutorial,
        steps: newSteps,
        phase: currentPhase,
        isCompleted: allCompleted,
        completedAt: allCompleted ? Date.now() : state.tutorial.completedAt,
        totalTimeSpent: allCompleted 
          ? Date.now() - state.tutorial.startedAt 
          : state.tutorial.totalTimeSpent
      }
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

  const currentStep = TUTORIAL_STEPS[state.tutorial.currentStep];
  if (currentStep?.requiresCompletion && !state.tutorial.steps[state.tutorial.currentStep]?.completed) {
    if (targetStep > state.tutorial.currentStep) {
      return { canGo: false, reason: '请先完成当前步骤的操作要求' };
    }
  }

  return { canGo: true };
}

function createGameStore() {
  const initialState: GameState = {
    currentSubject: null,
    currentFilm: FILM_STOCKS[0],
    currentParams: { ...DEFAULT_PARAMS },
    developmentProgress: 0,
    isDeveloping: false,
    phase: 'tutorial',
    processedPhotos: loadSavedPhotos(),
    tutorial: createInitialTutorialState(),
    tutorialStep: 0,
    selectedAlbumPhoto: null,
    presets: loadSavedPresets(),
    presetHistory: [],
    lastAppliedPresetId: null,
    adjustedParams: []
  };

  const { subscribe, set, update } = writable(initialState);

  return {
    subscribe,
    setSubject: (subjectId: string) => update(state => {
      const newState = {
        ...state,
        currentSubject: PHOTO_SUBJECTS.find(s => s.id === subjectId) || null
      };
      return checkAndUpdateTutorialProgress(newState);
    }),
    setFilm: (filmId: string) => update(state => {
      const newState = {
        ...state,
        currentFilm: FILM_STOCKS.find(f => f.id === filmId) || FILM_STOCKS[0]
      };
      return checkAndUpdateTutorialProgress(newState);
    }),
    updateParams: (params: Partial<DevParams>) => update(state => {
      const newAdjustedParams = [...state.adjustedParams];
      Object.keys(params).forEach(key => {
        const paramKey = key as keyof DevParams;
        if (!newAdjustedParams.includes(paramKey)) {
          newAdjustedParams.push(paramKey);
        }
      });
      const newState = {
        ...state,
        currentParams: { ...state.currentParams, ...params },
        adjustedParams: newAdjustedParams
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
      const newState: GameState = {
        ...state,
        isDeveloping: true,
        developmentProgress: 0,
        phase: 'develop'
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
      const newState = {
        ...state,
        tutorialStep: step,
        tutorial: {
          ...state.tutorial,
          currentStep: step,
          phase: TUTORIAL_STEPS[step]?.phase || 'intro'
        }
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
          !s.completed && !s.skipped ? { ...s, skipped: true } : s
        );
        return { 
          ...state, 
          phase: 'select', 
          tutorialStep: TUTORIAL_STEPS.length - 1,
          tutorial: {
            ...state.tutorial,
            currentStep: TUTORIAL_STEPS.length - 1,
            steps: newSteps,
            isCompleted: true,
            completedAt: Date.now(),
            totalTimeSpent: Date.now() - state.tutorial.startedAt
          }
        };
      }
      
      const newState = {
        ...state,
        tutorialStep: nextStep,
        tutorial: {
          ...state.tutorial,
          currentStep: nextStep,
          phase: TUTORIAL_STEPS[nextStep]?.phase || 'intro'
        }
      };
      return checkAndUpdateTutorialProgress(newState);
    }),
    prevTutorialStep: () => update(state => {
      const prevStep = Math.max(0, state.tutorial.currentStep - 1);
      return {
        ...state,
        tutorialStep: prevStep,
        tutorial: {
          ...state.tutorial,
          currentStep: prevStep,
          phase: TUTORIAL_STEPS[prevStep]?.phase || 'intro'
        }
      };
    }),
    skipTutorial: () => update(state => {
      const newSteps = state.tutorial.steps.map((s, i) => 
        !s.completed ? { ...s, skipped: true } : s
      );
      return {
        ...state,
        phase: 'select',
        tutorialStep: TUTORIAL_STEPS.length - 1,
        tutorial: {
          ...state.tutorial,
          currentStep: TUTORIAL_STEPS.length - 1,
          steps: newSteps,
          isCompleted: true,
          completedAt: Date.now(),
          totalTimeSpent: Date.now() - state.tutorial.startedAt
        }
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
          const newState = {
            ...state,
            tutorialStep: nextStep,
            tutorial: {
              ...state.tutorial,
              currentStep: nextStep,
              steps: newSteps,
              phase: TUTORIAL_STEPS[nextStep]?.phase || 'intro'
            }
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
    resetTutorial: () => update(state => ({
      ...state,
      phase: 'tutorial',
      tutorialStep: 0,
      adjustedParams: [],
      tutorial: createInitialTutorialState()
    })),
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
    reset: () => set(initialState)
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
