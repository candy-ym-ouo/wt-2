import type { ProcessedPhoto, ParamPreset, TutorialState, DevParams, FavoriteInfo, PhotoCollection, AchievementState, DarkroomOrder, ScheduleSlot, StorageStatus, QuestSystemState, ReviewSystemState, InventorySystemState, PublicationState, CurriculumSystemState, ConsignmentMarketState, ExhibitionState, DarkroomCalibrationState, ChallengeState } from '../types/game';
import { DEFAULT_PARAMS } from '../data/gameData';
import { createInitialQuestSystemState } from './questSystem';
import { createInitialReviewSystemState } from './reviewSystem';
import { createInitialInventorySystemState } from './inventorySystem';
import { createInitialCurriculumSystemState } from './curriculumSystem';
import { createInitialConsignmentMarketState } from './consignmentSystem';

export const CURRENT_STORAGE_VERSION = 3;
export const MAX_PHOTOS = 100;
export const MAX_PRESETS = 50;
export const MAX_COLLECTIONS = 20;
export const MAX_ORDERS = 50;
export const MAX_REVIEW_SUBMISSIONS = 50;
export const MAX_INVENTORY_RECORDS = 200;
export const MAX_CONSIGNMENT_WORKS = 100;
export const MAX_CONSIGNMENT_ORDERS = 200;
export const MAX_CERTIFICATES = 200;
export const MAX_EXHIBITIONS = 20;
export const MAX_EXHIBITION_FEEDBACKS = 200;
export const MAX_CHALLENGES = 20;
export const MAX_CHALLENGE_SUBMISSIONS = 100;
export const MAX_CHALLENGE_TEAMS = 50;
export const STORAGE_QUOTA_WARNING = 0.8;
export const BACKUP_COUNT = 3;

export interface StorageMeta {
  version: number;
  createdAt: number;
  updatedAt: number;
  itemCount: number;
}

export interface StorageWrapper<T> {
  meta: StorageMeta;
  data: T;
}

export interface LoadResult<T> {
  success: boolean;
  data: T | null;
  error?: string;
  recovered?: boolean;
  migrationPerformed?: boolean;
  fromVersion?: number;
}

export type StorageKey = 'photos' | 'presets' | 'tutorial' | 'favorites' | 'collections' | 'achievements' | 'orders' | 'quest_system' | 'review_system' | 'inventory_system' | 'publication_system' | 'curriculum_system' | 'consignment_market' | 'exhibition_system' | 'darkroom_calibration' | 'challenge_system';

const KEY_MAP: Record<StorageKey, string> = {
  photos: 'darkroom_photos',
  presets: 'darkroom_presets',
  tutorial: 'darkroom_tutorial',
  favorites: 'darkroom_favorites',
  collections: 'darkroom_collections',
  achievements: 'darkroom_achievements',
  orders: 'darkroom_orders',
  quest_system: 'darkroom_quest_system',
  review_system: 'darkroom_review_system',
  inventory_system: 'darkroom_inventory',
  publication_system: 'darkroom_publication',
  curriculum_system: 'darkroom_curriculum',
  consignment_market: 'darkroom_consignment_market',
  exhibition_system: 'darkroom_exhibition_system',
  darkroom_calibration: 'darkroom_calibration',
  challenge_system: 'darkroom_challenge_system'
};

function getBackupKey(key: StorageKey, index: number): string {
  return `${KEY_MAP[key]}_backup_${index}`;
}

function createMeta(itemCount: number): StorageMeta {
  const now = Date.now();
  return {
    version: CURRENT_STORAGE_VERSION,
    createdAt: now,
    updatedAt: now,
    itemCount
  };
}

function wrapData<T>(data: T, itemCount: number): StorageWrapper<T> {
  return {
    meta: createMeta(itemCount),
    data
  };
}

function isStorageWrapper(obj: unknown): obj is StorageWrapper<unknown> {
  if (typeof obj !== 'object' || obj === null) return false;
  const wrapper = obj as Record<string, unknown>;
  return (
    typeof wrapper.meta === 'object' &&
    wrapper.meta !== null &&
    typeof (wrapper.meta as Record<string, unknown>).version === 'number' &&
    'data' in wrapper
  );
}

function safeParse<T>(json: string): T | null {
  try {
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

function getStorageUsage(): number {
  try {
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key) || '';
        total += key.length + value.length;
      }
    }
    return total;
  } catch {
    return 0;
  }
}

function getStorageQuota(): number {
  try {
    const testKey = '__storage_test__';
    let testValue = '';
    const increment = 100000;
    let quota = 0;
    
    try {
      while (true) {
        testValue += 'x'.repeat(increment);
        localStorage.setItem(testKey, testValue);
        quota = testValue.length;
      }
    } catch {
      localStorage.removeItem(testKey);
    }
    
    return quota > 0 ? quota : 5 * 1024 * 1024;
  } catch {
    return 5 * 1024 * 1024;
  }
}

export function isStorageNearLimit(): boolean {
  const usage = getStorageUsage();
  const quota = getStorageQuota();
  return usage / quota > STORAGE_QUOTA_WARNING;
}

export function getStorageInfo(): { used: number; quota: number; percentage: number } {
  const used = getStorageUsage();
  const quota = getStorageQuota();
  return {
    used,
    quota,
    percentage: quota > 0 ? used / quota : 0
  };
}

function rotateBackups(key: StorageKey): void {
  try {
    for (let i = BACKUP_COUNT - 1; i > 0; i--) {
      const prevBackup = localStorage.getItem(getBackupKey(key, i - 1));
      if (prevBackup) {
        localStorage.setItem(getBackupKey(key, i), prevBackup);
      }
    }
    const current = localStorage.getItem(KEY_MAP[key]);
    if (current) {
      localStorage.setItem(getBackupKey(key, 0), current);
    }
  } catch (e) {
    console.warn(`Failed to rotate backups for ${key}:`, e);
  }
}

export function saveWithBackup<T>(key: StorageKey, data: T, itemCount: number): boolean {
  try {
    rotateBackups(key);
    const wrapped = wrapData(data, itemCount);
    localStorage.setItem(KEY_MAP[key], JSON.stringify(wrapped));
    return true;
  } catch (e) {
    console.error(`Failed to save ${key}:`, e);
    return false;
  }
}

function tryLoadFromBackups<T>(key: StorageKey): LoadResult<T> {
  for (let i = 0; i < BACKUP_COUNT; i++) {
    const backupKey = getBackupKey(key, i);
    const raw = localStorage.getItem(backupKey);
    if (raw) {
      const parsed = safeParse<StorageWrapper<T>>(raw);
      if (parsed && isStorageWrapper(parsed)) {
        return {
          success: true,
          data: parsed.data,
          recovered: true,
          fromVersion: parsed.meta.version
        };
      }
    }
  }
  return { success: false, data: null };
}

function migratePhotos(data: unknown, fromVersion: number): ProcessedPhoto[] {
  let photos = data as ProcessedPhoto[];
  
  if (fromVersion < 2) {
    photos = photos.map(photo => ({
      ...photo,
      tags: photo.tags || [],
      notes: photo.notes || ''
    }));
  }
  
  return photos;
}

function migratePresets(data: unknown, fromVersion: number): ParamPreset[] {
  let presets = data as ParamPreset[];
  
  if (fromVersion < 2) {
    presets = presets.map(preset => ({
      ...preset,
      version: preset.version || 1,
      subjectId: preset.subjectId,
      filmId: preset.filmId
    }));
  }
  
  return presets;
}

function migrateTutorial(data: unknown, fromVersion: number): TutorialState {
  let tutorial = data as TutorialState;
  
  if (fromVersion < 2) {
    tutorial = {
      ...tutorial,
      steps: tutorial.steps.map(step => ({
        ...step,
        actionsPerformed: step.actionsPerformed || []
      }))
    };
  }
  
  return tutorial;
}

function migrateFavorites(data: unknown, fromVersion: number): FavoriteInfo[] {
  let favorites = data as FavoriteInfo[];
  if (fromVersion < 3) {
    favorites = favorites.map(fav => ({
      ...fav,
      groupId: fav.groupId || undefined
    }));
  }
  return favorites;
}

function migrateCollections(data: unknown, fromVersion: number): PhotoCollection[] {
  let collections = data as PhotoCollection[];
  if (fromVersion < 3) {
    collections = collections.map(col => ({
      ...col,
      groups: col.groups || [],
      tags: col.tags || [],
      coverPhotoId: col.coverPhotoId || undefined
    }));
  }
  return collections;
}

function migrateData<T>(key: StorageKey, data: unknown, fromVersion: number): T {
  switch (key) {
    case 'photos':
      return migratePhotos(data, fromVersion) as T;
    case 'presets':
      return migratePresets(data, fromVersion) as T;
    case 'tutorial':
      return migrateTutorial(data, fromVersion) as T;
    case 'favorites':
      return migrateFavorites(data, fromVersion) as T;
    case 'collections':
      return migrateCollections(data, fromVersion) as T;
    case 'achievements':
      return data as T;
    case 'quest_system':
      return repairQuestSystem(data as QuestSystemState) as T;
    case 'publication_system':
      return data as T;
    default:
      return data as T;
  }
}

function validatePhoto(photo: unknown): photo is ProcessedPhoto {
  if (typeof photo !== 'object' || photo === null) return false;
  const p = photo as Record<string, unknown>;
  return (
    typeof p.id === 'string' &&
    typeof p.subjectId === 'string' &&
    typeof p.filmId === 'string' &&
    typeof p.score === 'number' &&
    typeof p.imageDataUrl === 'string' &&
    typeof p.timestamp === 'number' &&
    typeof p.details === 'object' && p.details !== null
  );
}

function validatePreset(preset: unknown): preset is ParamPreset {
  if (typeof preset !== 'object' || preset === null) return false;
  const p = preset as Record<string, unknown>;
  return (
    typeof p.id === 'string' &&
    typeof p.name === 'string' &&
    typeof p.params === 'object' && p.params !== null &&
    typeof p.createdAt === 'number'
  );
}

function validateTutorial(tutorial: unknown): tutorial is TutorialState {
  if (typeof tutorial !== 'object' || tutorial === null) return false;
  const t = tutorial as Record<string, unknown>;
  return (
    typeof t.currentStep === 'number' &&
    Array.isArray(t.steps) &&
    typeof t.isCompleted === 'boolean'
  );
}

function validateFavorite(favorite: unknown): favorite is FavoriteInfo {
  if (typeof favorite !== 'object' || favorite === null) return false;
  const f = favorite as Record<string, unknown>;
  return (
    typeof f.photoId === 'string' &&
    typeof f.favoritedAt === 'number'
  );
}

function validateCollection(collection: unknown): collection is PhotoCollection {
  if (typeof collection !== 'object' || collection === null) return false;
  const c = collection as Record<string, unknown>;
  return (
    typeof c.id === 'string' &&
    typeof c.name === 'string' &&
    Array.isArray(c.photoIds) &&
    typeof c.createdAt === 'number' &&
    typeof c.updatedAt === 'number'
  );
}

function validateOrder(order: unknown): order is DarkroomOrder {
  if (typeof order !== 'object' || order === null) return false;
  const o = order as Record<string, unknown>;
  return (
    typeof o.id === 'string' &&
    typeof o.orderNumber === 'string' &&
    typeof o.customer === 'object' && o.customer !== null &&
    typeof o.requirements === 'object' && o.requirements !== null &&
    typeof o.status === 'string' &&
    typeof o.priority === 'string' &&
    Array.isArray(o.matchedFilms) &&
    Array.isArray(o.photoIds) &&
    typeof o.createdAt === 'number' &&
    typeof o.updatedAt === 'number'
  );
}

function validateAchievementState(data: unknown): data is AchievementState {
  if (typeof data !== 'object' || data === null) return false;
  const a = data as Record<string, unknown>;
  return (
    Array.isArray(a.unlockedIds) &&
    Array.isArray(a.practiceDays) &&
    Array.isArray(a.newlyUnlocked)
  );
}

function validateCurriculumSystemState(data: unknown): data is CurriculumSystemState {
  if (typeof data !== 'object' || data === null) return false;
  const c = data as Record<string, unknown>;
  return (
    Array.isArray(c.chapters) &&
    typeof c.profile === 'object' && c.profile !== null &&
    typeof (c.profile as Record<string, unknown>).learnerId === 'string'
  );
}

function validateData<T>(key: StorageKey, data: unknown): T | null {
  if (!Array.isArray(data) && key !== 'tutorial' && key !== 'achievements' && key !== 'quest_system' && key !== 'review_system' && key !== 'inventory_system' && key !== 'publication_system' && key !== 'curriculum_system' && key !== 'consignment_market' && key !== 'exhibition_system' && key !== 'darkroom_calibration' && key !== 'challenge_system') {
    return null;
  }
  
  switch (key) {
    case 'photos': {
      const arr = data as unknown[];
      const valid = arr.filter(validatePhoto);
      return valid as T;
    }
    case 'presets': {
      const arr = data as unknown[];
      const valid = arr.filter(validatePreset);
      return valid as T;
    }
    case 'tutorial': {
      return validateTutorial(data) ? (data as T) : null;
    }
    case 'favorites': {
      const arr = data as unknown[];
      const valid = arr.filter(validateFavorite);
      return valid as T;
    }
    case 'collections': {
      const arr = data as unknown[];
      const valid = arr.filter(validateCollection);
      return valid as T;
    }
    case 'orders': {
      const arr = data as unknown[];
      const valid = arr.filter(validateOrder);
      return valid as T;
    }
    case 'achievements': {
      return validateAchievementState(data) ? (data as T) : null;
    }
    case 'quest_system': {
      return validateQuestSystemState(data) ? (data as T) : null;
    }
    case 'publication_system': {
      return validatePublicationState(data) ? (data as T) : null;
    }
    case 'curriculum_system': {
      return validateCurriculumSystemState(data) ? (data as T) : null;
    }
    case 'exhibition_system': {
      return validateExhibitionState(data) ? (data as T) : null;
    }
    case 'darkroom_calibration': {
      return validateDarkroomCalibrationState(data) ? (data as T) : null;
    }
    case 'challenge_system': {
      return validateChallengeState(data) ? (data as T) : null;
    }
    default:
      return null;
  }
}

export function loadWithFallback<T>(key: StorageKey, defaultValue: T): LoadResult<T> {
  const raw = localStorage.getItem(KEY_MAP[key]);
  
  if (!raw) {
    return { success: true, data: defaultValue };
  }
  
  const parsed = safeParse<StorageWrapper<T>>(raw);
  
  if (parsed && isStorageWrapper(parsed)) {
    const validated = validateData<T>(key, parsed.data);
    
    if (validated !== null) {
      if (parsed.meta.version < CURRENT_STORAGE_VERSION) {
        const migrated = migrateData<T>(key, validated, parsed.meta.version);
        return {
          success: true,
          data: migrated,
          migrationPerformed: true,
          fromVersion: parsed.meta.version
        };
      }
      return {
        success: true,
        data: validated,
        fromVersion: parsed.meta.version
      };
    }
  }
  
  const legacyParsed = safeParse<T>(raw);
  if (legacyParsed !== null) {
    const validated = validateData<T>(key, legacyParsed);
    if (validated !== null) {
      const migrated = migrateData<T>(key, validated, 1);
      return {
        success: true,
        data: migrated,
        migrationPerformed: true,
        fromVersion: 1,
        recovered: true
      };
    }
  }
  
  const backupResult = tryLoadFromBackups<T>(key);
  if (backupResult.success && backupResult.data !== null) {
    const validated = validateData<T>(key, backupResult.data);
    if (validated !== null) {
      let result: T = validated;
      let migrationPerformed = false;
      
      if (backupResult.fromVersion && backupResult.fromVersion < CURRENT_STORAGE_VERSION) {
        result = migrateData<T>(key, validated, backupResult.fromVersion);
        migrationPerformed = true;
      }
      
      return {
        success: true,
        data: result,
        recovered: true,
        migrationPerformed,
        fromVersion: backupResult.fromVersion
      };
    }
  }
  
  return {
    success: false,
    data: defaultValue,
    error: '存档数据损坏，已重置为默认值'
  };
}

export function enforceLimits<T>(key: StorageKey, data: T): T {
  switch (key) {
    case 'photos': {
      const photos = data as ProcessedPhoto[];
      if (photos.length > MAX_PHOTOS) {
        return photos
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, MAX_PHOTOS) as T;
      }
      return data;
    }
    case 'presets': {
      const presets = data as ParamPreset[];
      const userPresets = presets.filter(p => !p.isDefault);
      if (userPresets.length > MAX_PRESETS) {
        const defaults = presets.filter(p => p.isDefault);
        const trimmed = userPresets
          .sort((a, b) => b.updatedAt - a.updatedAt)
          .slice(0, MAX_PRESETS);
        return [...defaults, ...trimmed] as T;
      }
      return data;
    }
    case 'collections': {
      const collections = data as PhotoCollection[];
      if (collections.length > MAX_COLLECTIONS) {
        return collections
          .sort((a, b) => b.updatedAt - a.updatedAt)
          .slice(0, MAX_COLLECTIONS) as T;
      }
      return data;
    }
    case 'orders': {
      const orders = data as DarkroomOrder[];
      if (orders.length > MAX_ORDERS) {
        return orders
          .sort((a, b) => b.createdAt - a.createdAt)
          .slice(0, MAX_ORDERS) as T;
      }
      return data;
    }
    case 'exhibition_system': {
      const state = data as ExhibitionState;
      if (state.exhibitions.length > MAX_EXHIBITIONS) {
        return {
          ...state,
          exhibitions: state.exhibitions
            .sort((a, b) => b.updatedAt - a.updatedAt)
            .slice(0, MAX_EXHIBITIONS)
            .map(exh => ({
              ...exh,
              feedbacks: exh.feedbacks.slice(0, MAX_EXHIBITION_FEEDBACKS)
            }))
        } as T;
      }
      return {
        ...state,
        exhibitions: state.exhibitions.map(exh => ({
          ...exh,
          feedbacks: exh.feedbacks.slice(0, MAX_EXHIBITION_FEEDBACKS)
        }))
      } as T;
    }
    default:
      return data;
  }
}

export function clearStorage(): void {
  Object.values(KEY_MAP).forEach(key => {
    localStorage.removeItem(key);
    for (let i = 0; i < BACKUP_COUNT; i++) {
      localStorage.removeItem(`${key}_backup_${i}`);
    }
  });
}

export function exportAllData(): string {
  const data: Record<string, unknown> = {};
  Object.values(KEY_MAP).forEach(key => {
    const value = localStorage.getItem(key);
    if (value) {
      data[key] = JSON.parse(value);
    }
  });
  return JSON.stringify(data, null, 2);
}

export function importAllData(json: string): { success: boolean; error?: string } {
  try {
    const data = JSON.parse(json);
    if (typeof data !== 'object' || data === null) {
      return { success: false, error: '无效的数据格式' };
    }
    
    Object.values(KEY_MAP).forEach(key => {
      if (data[key]) {
        localStorage.setItem(key, JSON.stringify(data[key]));
      }
    });
    
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export function repairPhotos(photos: ProcessedPhoto[]): ProcessedPhoto[] {
  return photos
    .filter(photo => {
      if (!validatePhoto(photo)) return false;
      if (!photo.imageDataUrl || photo.imageDataUrl.length < 100) return false;
      if (photo.score < 0 || photo.score > 100) return false;
      return true;
    })
    .map(photo => ({
      ...photo,
      tags: photo.tags || [],
      notes: photo.notes || ''
    }));
}

export function repairPresets(presets: ParamPreset[]): ParamPreset[] {
  return presets
    .filter(preset => {
      if (!validatePreset(preset)) return false;
      return true;
    })
    .map(preset => ({
      ...preset,
      version: preset.version || 1,
      description: preset.description || ''
    }));
}

export function repairFavorites(favorites: FavoriteInfo[], validPhotoIds: string[]): FavoriteInfo[] {
  return favorites
    .filter(fav => {
      if (!validateFavorite(fav)) return false;
      if (!validPhotoIds.includes(fav.photoId)) return false;
      return true;
    })
    .map(fav => ({
      ...fav,
      groupId: fav.groupId || undefined
    }));
}

export function repairCollections(collections: PhotoCollection[], validPhotoIds: string[]): PhotoCollection[] {
  return collections
    .filter(col => validateCollection(col))
    .map(col => ({
      ...col,
      photoIds: col.photoIds.filter(id => validPhotoIds.includes(id)),
      groups: (col.groups || []).map(group => ({
        ...group,
        photoIds: (group.photoIds || []).filter(id => validPhotoIds.includes(id)),
        coverPhotoId: group.coverPhotoId && validPhotoIds.includes(group.coverPhotoId) ? group.coverPhotoId : undefined
      })),
      coverPhotoId: col.coverPhotoId && validPhotoIds.includes(col.coverPhotoId) ? col.coverPhotoId : undefined,
      tags: col.tags || []
    }));
}

export function createDefaultAchievementState(): AchievementState {
  return {
    unlockedIds: [],
    practiceDays: [],
    newlyUnlocked: []
  };
}

export function loadSavedAchievements(): AchievementState {
  const result = loadWithFallback<AchievementState>('achievements', createDefaultAchievementState());
  return result.data || createDefaultAchievementState();
}

export function saveAchievements(state: AchievementState): boolean {
  return saveWithBackup('achievements', state, 1);
}

export function repairOrders(orders: DarkroomOrder[], validPhotoIds: string[]): DarkroomOrder[] {
  return orders
    .filter(order => validateOrder(order))
    .map(order => ({
      ...order,
      photoIds: order.photoIds.filter(id => validPhotoIds.includes(id)),
      matchedFilms: order.matchedFilms || [],
      internalNotes: order.internalNotes || ''
    }));
}

export function loadSavedOrders(): { orders: DarkroomOrder[]; status: Partial<StorageStatus> } {
  const result = loadWithFallback<DarkroomOrder[]>('orders', []);
  const status: Partial<StorageStatus> = {
    ordersLoaded: result.success ? (result.data?.length || 0) : 0
  };
  
  if (result.migrationPerformed) {
    status.migrationPerformed = true;
  }
  if (result.recovered) {
    status.recoveryPerformed = true;
  }
  
  return { orders: result.data || [], status };
}

export function saveOrders(orders: DarkroomOrder[]): boolean {
  const limited = enforceLimits('orders', orders);
  return saveWithBackup('orders', limited, limited.length);
}

function validateQuestSystemState(data: unknown): data is QuestSystemState {
  if (typeof data !== 'object' || data === null) return false;
  const q = data as Record<string, unknown>;
  return (
    typeof q.totalPoints === 'number' &&
    Array.isArray(q.earnedBadges) &&
    Array.isArray(q.earnedTitles) &&
    Array.isArray(q.unlockedSubjectIds) &&
    Array.isArray(q.unlockedFilmIds) &&
    Array.isArray(q.unlockedRecipeIds) &&
    typeof q.questProgress === 'object' && q.questProgress !== null &&
    typeof q.stageProgress === 'object' && q.stageProgress !== null
  );
}

export function repairQuestSystem(state: QuestSystemState): QuestSystemState {
  const initial = createInitialQuestSystemState();
  const repaired: QuestSystemState = {
    totalPoints: typeof state.totalPoints === 'number' ? state.totalPoints : initial.totalPoints,
    earnedBadges: Array.isArray(state.earnedBadges) ? state.earnedBadges : initial.earnedBadges,
    earnedTitles: Array.isArray(state.earnedTitles) ? state.earnedTitles : initial.earnedTitles,
    unlockedSubjectIds: Array.isArray(state.unlockedSubjectIds) ? state.unlockedSubjectIds : initial.unlockedSubjectIds,
    unlockedFilmIds: Array.isArray(state.unlockedFilmIds) ? state.unlockedFilmIds : initial.unlockedFilmIds,
    unlockedRecipeIds: Array.isArray(state.unlockedRecipeIds) ? state.unlockedRecipeIds : initial.unlockedRecipeIds,
    questProgress: typeof state.questProgress === 'object' && state.questProgress !== null
      ? { ...initial.questProgress, ...state.questProgress }
      : initial.questProgress,
    stageProgress: typeof state.stageProgress === 'object' && state.stageProgress !== null
      ? { ...initial.stageProgress, ...state.stageProgress }
      : initial.stageProgress,
    currentActiveQuestId: state.currentActiveQuestId || null,
    lastClaimedRewards: state.lastClaimedRewards || null
  };
  return repaired;
}

export function loadSavedQuestSystem(): { state: QuestSystemState; status: Partial<StorageStatus> } {
  const result = loadWithFallback<QuestSystemState>('quest_system', createInitialQuestSystemState());
  const status: Partial<StorageStatus> = {
    questSystemLoaded: result.success
  };

  if (result.migrationPerformed) {
    status.migrationPerformed = true;
  }
  if (result.recovered) {
    status.recoveryPerformed = true;
  }

  let state = result.data || createInitialQuestSystemState();
  state = repairQuestSystem(state);

  return { state, status };
}

export function saveQuestSystem(state: QuestSystemState): boolean {
  return saveWithBackup('quest_system', state, 1);
}

function validateReviewSystemState(data: unknown): data is ReviewSystemState {
  if (typeof data !== 'object' || data === null) return false;
  const r = data as Record<string, unknown>;
  return (
    Array.isArray(r.submissions) &&
    Array.isArray(r.contests) &&
    Array.isArray(r.reviewers) &&
    Array.isArray(r.disputes) &&
    typeof r.activeTab === 'string'
  );
}

export function repairReviewSystem(state: ReviewSystemState): ReviewSystemState {
  const initial = createInitialReviewSystemState();
  const repaired: ReviewSystemState = {
    submissions: Array.isArray(state.submissions) ? state.submissions.slice(0, MAX_REVIEW_SUBMISSIONS) : initial.submissions,
    contests: Array.isArray(state.contests) && state.contests.length > 0 ? state.contests : initial.contests,
    reviewers: Array.isArray(state.reviewers) && state.reviewers.length > 0 ? state.reviewers : initial.reviewers,
    disputes: Array.isArray(state.disputes) ? state.disputes : initial.disputes,
    activeContestId: state.activeContestId || null,
    selectedSubmissionId: state.selectedSubmissionId || null,
    activeTab: typeof state.activeTab === 'string' ? state.activeTab : initial.activeTab,
    leaderboardFilter: state.leaderboardFilter || initial.leaderboardFilter
  };
  return repaired;
}

export function loadSavedReviewSystem(): { state: ReviewSystemState; status: Partial<StorageStatus> } {
  const result = loadWithFallback<ReviewSystemState>('review_system', createInitialReviewSystemState());
  const status: Partial<StorageStatus> = {
    reviewSystemLoaded: result.success
  };

  if (result.migrationPerformed) {
    status.migrationPerformed = true;
  }
  if (result.recovered) {
    status.recoveryPerformed = true;
  }

  let state = result.data || createInitialReviewSystemState();
  state = repairReviewSystem(state);

  return { state, status };
}

export function saveReviewSystem(state: ReviewSystemState): boolean {
  const limited = enforceLimits('review_system', state) as ReviewSystemState;
  return saveWithBackup('review_system', limited, limited.submissions.length);
}

function repairInventorySystem(state: InventorySystemState): InventorySystemState {
  const initial = createInitialInventorySystemState();
  if (!state) return initial;
  
  const repaired: InventorySystemState = {
    inventory: Array.isArray(state.inventory) ? state.inventory : [],
    stockInRecords: Array.isArray(state.stockInRecords) ? state.stockInRecords : [],
    consumeRecords: Array.isArray(state.consumeRecords) ? state.consumeRecords : [],
    scrapRecords: Array.isArray(state.scrapRecords) ? state.scrapRecords : [],
    alerts: Array.isArray(state.alerts) ? state.alerts : [],
    activeTab: typeof state.activeTab === 'string' ? state.activeTab : initial.activeTab,
    filter: state.filter || initial.filter,
    selectedFilmId: state.selectedFilmId || null,
    showAlertBadge: typeof state.showAlertBadge === 'boolean' ? state.showAlertBadge : true
  };
  
  return repaired;
}

export function loadSavedInventorySystem(): { state: InventorySystemState; status: Partial<StorageStatus> } {
  const result = loadWithFallback<InventorySystemState>('inventory_system', createInitialInventorySystemState());
  const status: Partial<StorageStatus> = {
    inventorySystemLoaded: result.success
  };

  if (result.migrationPerformed) {
    status.migrationPerformed = true;
  }
  if (result.recovered) {
    status.recoveryPerformed = true;
  }

  let state = result.data || createInitialInventorySystemState();
  state = repairInventorySystem(state);

  return { state, status };
}

export function saveInventorySystem(state: InventorySystemState): boolean {
  const limited = enforceLimits('inventory_system', state) as InventorySystemState;
  const totalRecords = limited.stockInRecords.length + limited.consumeRecords.length + limited.scrapRecords.length;
  return saveWithBackup('inventory_system', limited, totalRecords);
}

function validatePublicationState(data: unknown): data is PublicationState {
  if (typeof data !== 'object' || data === null) return false;
  const p = data as Record<string, unknown>;
  return (
    Array.isArray(p.publications) &&
    (p.activePublicationId === null || typeof p.activePublicationId === 'string') &&
    typeof p.activeStep === 'string' &&
    typeof p.selectFilter === 'object' && p.selectFilter !== null
  );
}

export function repairPublicationSystem(state: PublicationState): PublicationState {
  return {
    publications: Array.isArray(state.publications) ? state.publications.filter(pub =>
      pub && typeof pub.id === 'string' && typeof pub.title === 'string'
    ) : [],
    activePublicationId: state.activePublicationId || null,
    activeStep: state.activeStep || 'select',
    selectFilter: state.selectFilter || { subjectIds: [], grades: [], minScore: 0, maxScore: 100, sortBy: 'date_desc' }
  };
}

export function createInitialPublicationState(): PublicationState {
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

export function loadSavedPublicationSystem(): { state: PublicationState; status: Partial<StorageStatus> } {
  const result = loadWithFallback<PublicationState>('publication_system', createInitialPublicationState());
  const status: Partial<StorageStatus> = {
    publicationSystemLoaded: result.success
  };

  if (result.migrationPerformed) {
    status.migrationPerformed = true;
  }
  if (result.recovered) {
    status.recoveryPerformed = true;
  }

  let state = result.data || createInitialPublicationState();
  state = repairPublicationSystem(state);

  return { state, status };
}

export function savePublicationSystem(state: PublicationState): boolean {
  const limited = enforceLimits('publication_system', state) as PublicationState;
  return saveWithBackup('publication_system', limited, limited.publications.length);
}

export function repairCurriculumSystem(state: CurriculumSystemState): CurriculumSystemState {
  const initial = createInitialCurriculumSystemState();
  if (!state) return initial;

  return {
    ...initial,
    profile: {
      ...initial.profile,
      ...state.profile,
      chapterProgress: state.profile?.chapterProgress || initial.profile.chapterProgress,
      milestones: state.profile?.milestones || initial.profile.milestones
    },
    activeChapterId: state.activeChapterId || initial.activeChapterId,
    activeStepId: state.activeStepId || initial.activeStepId,
    showCurriculumPanel: typeof state.showCurriculumPanel === 'boolean' ? state.showCurriculumPanel : initial.showCurriculumPanel,
    practiceMode: typeof state.practiceMode === 'boolean' ? state.practiceMode : initial.practiceMode
  };
}

export function loadSavedCurriculumSystem(): { state: CurriculumSystemState; status: Partial<StorageStatus> } {
  const result = loadWithFallback<CurriculumSystemState>('curriculum_system', createInitialCurriculumSystemState());
  const status: Partial<StorageStatus> = {
    curriculumSystemLoaded: result.success
  };

  if (result.migrationPerformed) {
    status.migrationPerformed = true;
  }
  if (result.recovered) {
    status.recoveryPerformed = true;
  }

  let state = result.data || createInitialCurriculumSystemState();
  state = repairCurriculumSystem(state);

  return { state, status };
}

export function saveCurriculumSystem(state: CurriculumSystemState): boolean {
  return saveWithBackup('curriculum_system', state, Object.keys(state.profile.chapterProgress).length);
}

export function repairConsignmentMarket(state: ConsignmentMarketState): ConsignmentMarketState {
  const initial = createInitialConsignmentMarketState();
  if (!state) return initial;

  return {
    ...initial,
    works: Array.isArray(state.works) ? state.works.slice(0, MAX_CONSIGNMENT_WORKS) : initial.works,
    artists: Array.isArray(state.artists) ? state.artists : initial.artists,
    buyers: Array.isArray(state.buyers) ? state.buyers : initial.buyers,
    orders: Array.isArray(state.orders) ? state.orders.slice(0, MAX_CONSIGNMENT_ORDERS) : initial.orders,
    certificates: Array.isArray(state.certificates) ? state.certificates.slice(0, MAX_CERTIFICATES) : initial.certificates,
    activeTab: state.activeTab || initial.activeTab,
    filter: { ...initial.filter, ...state.filter },
    currentUserId: state.currentUserId || initial.currentUserId,
    currentUserType: state.currentUserType || initial.currentUserType
  };
}

export function loadSavedConsignmentMarket(): { state: ConsignmentMarketState; status: Partial<StorageStatus> } {
  const result = loadWithFallback<ConsignmentMarketState>('consignment_market', createInitialConsignmentMarketState());
  const status: Partial<StorageStatus> = {
    consignmentMarketLoaded: result.success
  };

  if (result.migrationPerformed) {
    status.migrationPerformed = true;
  }
  if (result.recovered) {
    status.recoveryPerformed = true;
  }

  let state = result.data || createInitialConsignmentMarketState();
  state = repairConsignmentMarket(state);

  return { state, status };
}

export function saveConsignmentMarket(state: ConsignmentMarketState): boolean {
  const itemCount = state.works.length + state.orders.length + state.certificates.length;
  return saveWithBackup('consignment_market', state, itemCount);
}

function validateExhibitionState(data: unknown): data is ExhibitionState {
  if (typeof data !== 'object' || data === null) return false;
  const e = data as Record<string, unknown>;
  return (
    Array.isArray(e.exhibitions) &&
    typeof e.activeTab === 'string' &&
    typeof e.previewMode === 'string'
  );
}

export function createInitialExhibitionState(): ExhibitionState {
  const defaultThemes = createDefaultExhibitionThemes();
  const now = Date.now();
  const defaultExhibitionId = 'exhibition_default_' + now;

  const defaultExhibition = {
    id: defaultExhibitionId,
    title: '我的第一次展览',
    subtitle: '摄影作品展',
    curatorName: '策展人',
    description: '精心策划的个人摄影作品展览',
    status: 'draft' as const,
    groups: [],
    walls: [
      {
        id: 'wall_' + now + '_1',
        name: '主墙',
        description: '展览入口主墙面',
        width: 1200,
        height: 600,
        backgroundColor: '#f5f0e8',
        textureType: 'smooth' as const,
        layoutType: 'grid' as const,
        placements: [],
        order: 0
      }
    ],
    themeId: defaultThemes[0].id,
    themes: defaultThemes,
    route: [],
    feedbacks: [],
    statistics: createDefaultExhibitionStatistics(),
    tags: [],
    createdAt: now,
    updatedAt: now,
    totalViews: 0
  };

  return {
    exhibitions: [defaultExhibition],
    activeExhibitionId: defaultExhibitionId,
    activeTab: 'groups',
    selectedGroupId: null,
    selectedWallId: 'wall_' + now + '_1',
    selectedPlacementId: null,
    isEditingPlacement: false,
    previewMode: 'edit',
    routeAnimationSpeed: 1,
    showWorkCaptions: true,
    showSpotlights: true
  };
}

function createDefaultExhibitionThemes() {
  const now = Date.now();
  return [
    {
      id: 'theme_classic_' + now,
      name: '经典白廊',
      colorPalette: {
        primary: '#2c2c2c',
        secondary: '#6b6b6b',
        accent: '#c9a96a',
        background: '#f8f6f2',
        text: '#2c2c2c',
        wall: '#ffffff',
        floor: '#d4c4a8'
      },
      fontStyle: 'serif' as const,
      lightingScheme: 'natural' as const
    },
    {
      id: 'theme_modern_' + now,
      name: '现代极简',
      colorPalette: {
        primary: '#1a1a1a',
        secondary: '#404040',
        accent: '#e74c3c',
        background: '#fafafa',
        text: '#1a1a1a',
        wall: '#f0f0f0',
        floor: '#2c2c2c'
      },
      fontStyle: 'sans' as const,
      lightingScheme: 'spotlight' as const
    },
    {
      id: 'theme_gallery_' + now,
      name: '专业画廊',
      colorPalette: {
        primary: '#1c1c1c',
        secondary: '#555555',
        accent: '#8b7355',
        background: '#1a1814',
        text: '#e8e0d0',
        wall: '#2a2824',
        floor: '#3a3528'
      },
      fontStyle: 'display' as const,
      lightingScheme: 'dramatic' as const
    },
    {
      id: 'theme_warm_' + now,
      name: '温暖工业风',
      colorPalette: {
        primary: '#3d2817',
        secondary: '#6b4423',
        accent: '#d4a574',
        background: '#2a1f14',
        text: '#f0dcc0',
        wall: '#4a3828',
        floor: '#5c4033'
      },
      fontStyle: 'serif' as const,
      lightingScheme: 'warm' as const
    },
    {
      id: 'theme_loft_' + now,
      name: '工业LOFT',
      colorPalette: {
        primary: '#2c3e50',
        secondary: '#7f8c8d',
        accent: '#f39c12',
        background: '#ecf0f1',
        text: '#2c3e50',
        wall: '#bdc3c7',
        floor: '#7f8c8d'
      },
      fontStyle: 'sans' as const,
      lightingScheme: 'cool' as const
    }
  ];
}

function createDefaultExhibitionStatistics() {
  return {
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
  };
}

export function repairExhibitionSystem(state: ExhibitionState): ExhibitionState {
  const initial = createInitialExhibitionState();
  if (!state) return initial;

  const validExhibitions = Array.isArray(state.exhibitions)
    ? state.exhibitions
        .filter(exh => exh && typeof exh.id === 'string' && typeof exh.title === 'string')
        .slice(0, MAX_EXHIBITIONS)
        .map(exh => ({
          ...exh,
          groups: Array.isArray(exh.groups) ? exh.groups.filter(g => g && typeof g.id === 'string') : [],
          walls: Array.isArray(exh.walls) ? exh.walls.filter(w => w && typeof w.id === 'string') : [],
          themes: Array.isArray(exh.themes) && exh.themes.length > 0 ? exh.themes : initial.exhibitions[0].themes,
          route: Array.isArray(exh.route) ? exh.route : [],
          feedbacks: Array.isArray(exh.feedbacks) ? exh.feedbacks.slice(0, MAX_EXHIBITION_FEEDBACKS) : [],
          statistics: exh.statistics || createDefaultExhibitionStatistics(),
          tags: Array.isArray(exh.tags) ? exh.tags : []
        }))
    : initial.exhibitions;

  const firstValidId = validExhibitions.length > 0 ? validExhibitions[0].id : null;

  return {
    exhibitions: validExhibitions,
    activeExhibitionId: state.activeExhibitionId && validExhibitions.some(e => e.id === state.activeExhibitionId)
      ? state.activeExhibitionId
      : firstValidId,
    activeTab: typeof state.activeTab === 'string' ? state.activeTab : initial.activeTab,
    selectedGroupId: state.selectedGroupId || null,
    selectedWallId: state.selectedWallId || null,
    selectedPlacementId: state.selectedPlacementId || null,
    isEditingPlacement: typeof state.isEditingPlacement === 'boolean' ? state.isEditingPlacement : false,
    previewMode: typeof state.previewMode === 'string' ? state.previewMode : initial.previewMode,
    routeAnimationSpeed: typeof state.routeAnimationSpeed === 'number' ? state.routeAnimationSpeed : 1,
    showWorkCaptions: typeof state.showWorkCaptions === 'boolean' ? state.showWorkCaptions : true,
    showSpotlights: typeof state.showSpotlights === 'boolean' ? state.showSpotlights : true
  };
}

export function loadSavedExhibitionSystem(): { state: ExhibitionState; status: Partial<StorageStatus> } {
  const result = loadWithFallback<ExhibitionState>('exhibition_system', createInitialExhibitionState());
  const status: Partial<StorageStatus> = {
    exhibitionSystemLoaded: result.success
  };

  if (result.migrationPerformed) {
    status.migrationPerformed = true;
  }
  if (result.recovered) {
    status.recoveryPerformed = true;
  }

  let state = result.data || createInitialExhibitionState();
  state = repairExhibitionSystem(state);

  return { state, status };
}

export function saveExhibitionSystem(state: ExhibitionState): boolean {
  const limited = enforceLimits('exhibition_system', state) as ExhibitionState;
  const itemCount = limited.exhibitions.reduce((sum, exh) => sum + exh.feedbacks.length + exh.walls.length + exh.groups.length, 0);
  return saveWithBackup('exhibition_system', limited, itemCount);
}

function validateDarkroomCalibrationState(data: unknown): data is DarkroomCalibrationState {
  if (typeof data !== 'object' || data === null) return false;
  const c = data as Record<string, unknown>;
  return (
    Array.isArray(c.enlargers) &&
    Array.isArray(c.tempZones) &&
    Array.isArray(c.timerPrograms) &&
    typeof c.activeTab === 'string' &&
    typeof c.statistics === 'object' && c.statistics !== null
  );
}

export function createInitialDarkroomCalibrationState(): DarkroomCalibrationState {
  const now = Date.now();
  const defaultEnlargerId = 'enlarger_default_' + now;
  const defaultZoneId = 'zone_dev_' + now;
  const defaultTimerId = 'timer_std_' + now;

  return {
    enlargers: [
      {
        id: defaultEnlargerId,
        name: '主放大机',
        lightSource: 'condenser',
        lensFocalLength: 50,
        baseExposure: 0.5,
        colorFiltration: { cyan: 0, magenta: 30, yellow: 45 },
        focusOffset: 0,
        columnHeight: 60,
        status: 'idle',
        warmUpSeconds: 30,
        lampHours: 0,
        notes: ''
      }
    ],
    tempZones: [
      {
        id: defaultZoneId,
        name: '显影液温控',
        targetTemp: 20,
        actualTemp: 20,
        tolerance: 0.5,
        status: 'stable',
        sensorId: 'sensor_dev_1',
        heaterWattage: 300
      },
      {
        id: 'zone_stop_' + now,
        name: '停显液温控',
        targetTemp: 20,
        actualTemp: 20,
        tolerance: 1.0,
        status: 'stable',
        sensorId: 'sensor_stop_1',
        heaterWattage: 150
      },
      {
        id: 'zone_fix_' + now,
        name: '定影液温控',
        targetTemp: 20,
        actualTemp: 20,
        tolerance: 1.0,
        status: 'stable',
        sensorId: 'sensor_fix_1',
        heaterWattage: 150
      }
    ],
    timerPrograms: [
      {
        id: defaultTimerId,
        name: '标准D-76程序',
        steps: [
          { id: 'step_presoak', label: '预浸', duration: 30000, action: 'wait', agitationPattern: 'none' },
          { id: 'step_develop', label: '显影', duration: 420000, action: 'develop', agitationPattern: 'intermittent_30s' },
          { id: 'step_stop', label: '停显', duration: 30000, action: 'stop', agitationPattern: 'continuous' },
          { id: 'step_fix', label: '定影', duration: 240000, action: 'fix', agitationPattern: 'intermittent_30s' },
          { id: 'step_wash', label: '水洗', duration: 300000, action: 'wash', agitationPattern: 'none' }
        ],
        totalDuration: 1020000,
        loopCount: 1
      }
    ],
    enlargerCalibrations: [],
    tempCalibrations: [],
    timerCalibrations: [],
    deviations: [],
    activeTab: 'enlarger',
    selectedEnlargerId: defaultEnlargerId,
    selectedTempZoneId: defaultZoneId,
    selectedTimerProgramId: defaultTimerId,
    statistics: {
      totalCalibrations: 0,
      avgEnlargerDrift: 0,
      avgTempDeviation: 0,
      avgTimerDriftMs: 0,
      lastCalibrationAt: null,
      calibrationHealthScore: 100,
      deviationTrend: 'stable',
      recentDeviationImpact: 0
    }
  };
}

export function repairDarkroomCalibration(state: DarkroomCalibrationState): DarkroomCalibrationState {
  const initial = createInitialDarkroomCalibrationState();
  if (!state) return initial;

  return {
    enlargers: Array.isArray(state.enlargers) && state.enlargers.length > 0 ? state.enlargers : initial.enlargers,
    tempZones: Array.isArray(state.tempZones) && state.tempZones.length > 0 ? state.tempZones : initial.tempZones,
    timerPrograms: Array.isArray(state.timerPrograms) && state.timerPrograms.length > 0 ? state.timerPrograms : initial.timerPrograms,
    enlargerCalibrations: Array.isArray(state.enlargerCalibrations) ? state.enlargerCalibrations : [],
    tempCalibrations: Array.isArray(state.tempCalibrations) ? state.tempCalibrations : [],
    timerCalibrations: Array.isArray(state.timerCalibrations) ? state.timerCalibrations : [],
    deviations: Array.isArray(state.deviations) ? state.deviations : [],
    activeTab: typeof state.activeTab === 'string' ? state.activeTab : initial.activeTab,
    selectedEnlargerId: state.selectedEnlargerId || initial.selectedEnlargerId,
    selectedTempZoneId: state.selectedTempZoneId || initial.selectedTempZoneId,
    selectedTimerProgramId: state.selectedTimerProgramId || initial.selectedTimerProgramId,
    statistics: state.statistics || initial.statistics
  };
}

export function loadSavedDarkroomCalibration(): { state: DarkroomCalibrationState; status: Partial<StorageStatus> } {
  const result = loadWithFallback<DarkroomCalibrationState>('darkroom_calibration', createInitialDarkroomCalibrationState());
  const status: Partial<StorageStatus> = {
    darkroomCalibrationLoaded: result.success
  };

  if (result.migrationPerformed) {
    status.migrationPerformed = true;
  }
  if (result.recovered) {
    status.recoveryPerformed = true;
  }

  let state = result.data || createInitialDarkroomCalibrationState();
  state = repairDarkroomCalibration(state);

  return { state, status };
}

export function saveDarkroomCalibration(state: DarkroomCalibrationState): boolean {
  const itemCount = state.enlargerCalibrations.length + state.tempCalibrations.length + state.timerCalibrations.length + state.deviations.length;
  return saveWithBackup('darkroom_calibration', state, itemCount);
}

import { createInitialChallengeSystemState } from './challengeSystem';

function validateChallengeState(data: unknown): data is ChallengeState {
  if (typeof data !== 'object' || data === null) return false;
  const c = data as Record<string, unknown>;
  return (
    Array.isArray(c.challenges) &&
    Array.isArray(c.seasons) &&
    Array.isArray(c.teams) &&
    Array.isArray(c.registrations) &&
    Array.isArray(c.submissions) &&
    typeof c.activeTab === 'string'
  );
}

export function repairChallengeSystem(state: ChallengeState): ChallengeState {
  const initial = createInitialChallengeSystemState();
  if (!state) return initial;

  return {
    ...initial,
    challenges: Array.isArray(state.challenges) ? state.challenges.slice(0, MAX_CHALLENGES) : initial.challenges,
    seasons: Array.isArray(state.seasons) ? state.seasons : initial.seasons,
    teams: Array.isArray(state.teams) ? state.teams.slice(0, MAX_CHALLENGE_TEAMS) : initial.teams,
    registrations: Array.isArray(state.registrations) ? state.registrations : initial.registrations,
    submissions: Array.isArray(state.submissions) ? state.submissions.slice(0, MAX_CHALLENGE_SUBMISSIONS) : initial.submissions,
    activeTab: typeof state.activeTab === 'string' ? state.activeTab : initial.activeTab,
    selectedChallengeId: state.selectedChallengeId || null,
    selectedTeamId: state.selectedTeamId || null,
    selectedSubmissionId: state.selectedSubmissionId || null,
    currentUserId: state.currentUserId || initial.currentUserId,
    currentUserName: state.currentUserName || initial.currentUserName,
    filter: state.filter || initial.filter,
    leaderboardFilter: state.leaderboardFilter || initial.leaderboardFilter,
    developTimer: state.developTimer || initial.developTimer
  };
}

export function loadSavedChallengeSystem(): { state: ChallengeState; status: Partial<StorageStatus> } {
  const result = loadWithFallback<ChallengeState>('challenge_system', createInitialChallengeSystemState());
  const status: Partial<StorageStatus> = {
    challengeSystemLoaded: result.success
  };

  if (result.migrationPerformed) {
    status.migrationPerformed = true;
  }
  if (result.recovered) {
    status.recoveryPerformed = true;
  }

  let state = result.data || createInitialChallengeSystemState();
  state = repairChallengeSystem(state);

  return { state, status };
}

export function saveChallengeSystem(state: ChallengeState): boolean {
  const limited = enforceLimits('challenge_system', state) as ChallengeState;
  const itemCount = limited.challenges.length + limited.teams.length + limited.submissions.length + limited.registrations.length;
  return saveWithBackup('challenge_system', limited, itemCount);
}
