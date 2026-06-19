import { writable, derived } from 'svelte/store';
import type { GameState, ProcessedPhoto, DevParams, GamePhase, ParamPreset, PresetHistory } from '../types/game';
import { FILM_STOCKS, DEFAULT_PARAMS, PHOTO_SUBJECTS, TUTORIAL_STEPS, DEFAULT_PRESETS } from '../data/gameData';
import { generateId } from '../utils/math';

function createGameStore() {
  const initialState: GameState = {
    currentSubject: null,
    currentFilm: FILM_STOCKS[0],
    currentParams: { ...DEFAULT_PARAMS },
    developmentProgress: 0,
    isDeveloping: false,
    phase: 'tutorial',
    processedPhotos: loadSavedPhotos(),
    tutorialStep: 0,
    selectedAlbumPhoto: null,
    presets: loadSavedPresets(),
    presetHistory: [],
    lastAppliedPresetId: null
  };

  const { subscribe, set, update } = writable(initialState);

  return {
    subscribe,
    setSubject: (subjectId: string) => update(state => ({
      ...state,
      currentSubject: PHOTO_SUBJECTS.find(s => s.id === subjectId) || null
    })),
    setFilm: (filmId: string) => update(state => ({
      ...state,
      currentFilm: FILM_STOCKS.find(f => f.id === filmId) || FILM_STOCKS[0]
    })),
    updateParams: (params: Partial<DevParams>) => update(state => ({
      ...state,
      currentParams: { ...state.currentParams, ...params }
    })),
    resetParams: () => update(state => ({
      ...state,
      currentParams: { ...DEFAULT_PARAMS }
    })),
    setPhase: (phase: GamePhase) => update(state => ({
      ...state,
      phase
    })),
    startDevelopment: () => update(state => ({
      ...state,
      isDeveloping: true,
      developmentProgress: 0,
      phase: 'develop'
    })),
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
    setTutorialStep: (step: number) => update(state => ({
      ...state,
      tutorialStep: Math.max(0, Math.min(step, TUTORIAL_STEPS.length - 1))
    })),
    nextTutorialStep: () => update(state => {
      const nextStep = state.tutorialStep + 1;
      if (nextStep >= TUTORIAL_STEPS.length) {
        return { ...state, phase: 'select', tutorialStep: TUTORIAL_STEPS.length - 1 };
      }
      return { ...state, tutorialStep: nextStep };
    }),
    prevTutorialStep: () => update(state => ({
      ...state,
      tutorialStep: Math.max(0, state.tutorialStep - 1)
    })),
    skipTutorial: () => update(state => ({
      ...state,
      phase: 'select',
      tutorialStep: TUTORIAL_STEPS.length - 1
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
