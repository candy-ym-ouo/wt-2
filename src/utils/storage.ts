import type { ProcessedPhoto, ParamPreset, TutorialState, DevParams } from '../types/game';
import { DEFAULT_PARAMS } from '../data/gameData';

export const CURRENT_STORAGE_VERSION = 2;
export const MAX_PHOTOS = 100;
export const MAX_PRESETS = 50;
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

export type StorageKey = 'photos' | 'presets' | 'tutorial';

const KEY_MAP: Record<StorageKey, string> = {
  photos: 'darkroom_photos',
  presets: 'darkroom_presets',
  tutorial: 'darkroom_tutorial'
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

function migrateData<T>(key: StorageKey, data: unknown, fromVersion: number): T {
  switch (key) {
    case 'photos':
      return migratePhotos(data, fromVersion) as T;
    case 'presets':
      return migratePresets(data, fromVersion) as T;
    case 'tutorial':
      return migrateTutorial(data, fromVersion) as T;
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

function validateData<T>(key: StorageKey, data: unknown): T | null {
  if (!Array.isArray(data) && key !== 'tutorial') {
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
