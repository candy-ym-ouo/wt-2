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

export interface AlbumFilter {
  subjectIds: string[];
  filmIds: string[];
  sceneTypes: string[];
  grades: string[];
  minScore: number;
  maxScore: number;
  tags: string[];
  sortBy: SortOption;
}

export interface ScoreDetail {
  exposure: number;
  contrast: number;
  color: number;
  detail: number;
  overall: number;
  feedback: string[];
  grade: 'S' | 'A' | 'B' | 'C' | 'D';
}

export type GamePhase = 'tutorial' | 'select' | 'expose' | 'develop' | 'fix' | 'wash' | 'result' | 'album';

export type CanvasMode = 'preview' | 'developing' | 'final';

export interface GameState {
  currentSubject: PhotoSubject | null;
  currentFilm: FilmStock;
  currentParams: DevParams;
  developmentProgress: number;
  isDeveloping: boolean;
  phase: GamePhase;
  processedPhotos: ProcessedPhoto[];
  tutorialStep: number;
  selectedAlbumPhoto: ProcessedPhoto | null;
  presets: ParamPreset[];
  presetHistory: PresetHistory[];
  lastAppliedPresetId: string | null;
}

export interface TutorialStep {
  id: number;
  title: string;
  content: string;
  highlightArea?: string;
  actionHint?: string;
}
