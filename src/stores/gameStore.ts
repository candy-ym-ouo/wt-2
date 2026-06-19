import { writable, derived } from 'svelte/store';
import type { GameState, ProcessedPhoto, DevParams } from '../types/game';
import { FILM_STOCKS, DEFAULT_PARAMS, PHOTO_SUBJECTS } from '../data/gameData';

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
    selectedAlbumPhoto: null
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
    setPhase: (phase: GameState['phase']) => update(state => ({
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
      tutorialStep: step
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
      selectedAlbumPhoto: null
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
