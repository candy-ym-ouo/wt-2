import type {
  FilmInventoryItem,
  StockInRecord,
  StockConsumeRecord,
  StockScrapRecord,
  InventoryAlert,
  InventorySystemState,
  InventoryFilter,
  InventoryStatistics,
  StockInSource,
  StockConsumeType,
  StockScrapReason,
  AlertLevel,
  InventoryRecordWithType
} from '../types/game';
import { FILM_STOCKS } from '../data/gameData';
import { generateId } from './math';

export const DEFAULT_MIN_WARNING = 5;
export const DEFAULT_CRITICAL_WARNING = 2;

export const STOCK_IN_SOURCE_LABELS: Record<StockInSource, string> = {
  purchase: '采购',
  gift: '赠送',
  refund: '退货',
  other: '其他'
};

export const STOCK_IN_SOURCE_ICONS: Record<StockInSource, string> = {
  purchase: '🛒',
  gift: '🎁',
  refund: '↩️',
  other: '📦'
};

export const CONSUME_TYPE_LABELS: Record<StockConsumeType, string> = {
  develop: '冲洗创作',
  test: '测试',
  practice: '练习',
  other: '其他'
};

export const CONSUME_TYPE_ICONS: Record<StockConsumeType, string> = {
  develop: '📷',
  test: '🧪',
  practice: '🎯',
  other: '📤'
};

export const SCRAP_REASON_LABELS: Record<StockScrapReason, string> = {
  expired: '过期',
  damaged: '损坏',
  fogged: '漏光',
  defective: '质量问题',
  other: '其他'
};

export const SCRAP_REASON_ICONS: Record<StockScrapReason, string> = {
  expired: '📅',
  damaged: '💔',
  fogged: '☀️',
  defective: '⚠️',
  other: '🗑️'
};

export const ALERT_LEVEL_COLORS: Record<AlertLevel, string> = {
  normal: '#67c23a',
  warning: '#e6a23c',
  critical: '#f56c6c'
};

export const INVENTORY_TABS: { id: string; label: string; icon: string }[] = [
  { id: 'stock', label: '库存总览', icon: '📦' },
  { id: 'inbound', label: '入库记录', icon: '📥' },
  { id: 'consume', label: '消耗记录', icon: '📤' },
  { id: 'scrap', label: '报废记录', icon: '🗑️' },
  { id: 'records', label: '综合联查', icon: '🔍' }
];

export function createInitialInventorySystemState(): InventorySystemState {
  const initialInventory: FilmInventoryItem[] = FILM_STOCKS.map(film => ({
    filmId: film.id,
    quantity: 10,
    minWarning: DEFAULT_MIN_WARNING,
    criticalWarning: DEFAULT_CRITICAL_WARNING,
    unitPrice: undefined,
    totalCost: undefined,
    lastStockInAt: undefined,
    lastConsumeAt: undefined
  }));

  return {
    inventory: initialInventory,
    stockInRecords: [],
    consumeRecords: [],
    scrapRecords: [],
    alerts: [],
    activeTab: 'stock',
    filter: {
      filmIds: [],
      sourceTypes: [],
      consumeTypes: [],
      scrapReasons: [],
      searchKeyword: '',
      sortBy: 'date_desc'
    },
    selectedFilmId: null,
    showAlertBadge: false
  };
}

export function getInventoryItem(state: InventorySystemState, filmId: string): FilmInventoryItem | undefined {
  return state.inventory.find(item => item.filmId === filmId);
}

export function getInventoryQuantity(state: InventorySystemState, filmId: string): number {
  const item = getInventoryItem(state, filmId);
  return item?.quantity || 0;
}

export function checkStockAvailability(state: InventorySystemState, filmId: string, quantity: number): boolean {
  return getInventoryQuantity(state, filmId) >= quantity;
}

export function getAlertLevel(quantity: number, minWarning: number, criticalWarning: number): AlertLevel {
  if (quantity <= criticalWarning) return 'critical';
  if (quantity <= minWarning) return 'warning';
  return 'normal';
}

export function getFilmInventoryWithAlerts(state: InventorySystemState): Array<FilmInventoryItem & { alertLevel: AlertLevel }> {
  return state.inventory.map(item => ({
    ...item,
    alertLevel: getAlertLevel(item.quantity, item.minWarning, item.criticalWarning)
  }));
}

export function stockIn(
  state: InventorySystemState,
  filmId: string,
  quantity: number,
  source: StockInSource,
  options?: {
    unitPrice?: number;
    totalPrice?: number;
    supplier?: string;
    batchNumber?: string;
    expireDate?: number;
    notes?: string;
    operator?: string;
  }
): { state: InventorySystemState; record: StockInRecord } {
  const now = Date.now();
  const record: StockInRecord = {
    id: generateId(),
    filmId,
    quantity,
    source,
    unitPrice: options?.unitPrice,
    totalPrice: options?.totalPrice,
    supplier: options?.supplier,
    batchNumber: options?.batchNumber,
    expireDate: options?.expireDate,
    notes: options?.notes,
    createdAt: now,
    operator: options?.operator
  };

  const newInventory = state.inventory.map(item => {
    if (item.filmId !== filmId) return item;
    const newQuantity = item.quantity + quantity;
    const newTotalCost = (item.totalCost || 0) + (options?.totalPrice || (options?.unitPrice || 0) * quantity);
    return {
      ...item,
      quantity: newQuantity,
      totalCost: newTotalCost,
      lastStockInAt: now
    };
  });

  if (!newInventory.find(item => item.filmId === filmId)) {
    const film = FILM_STOCKS.find(f => f.id === filmId);
    if (film) {
      newInventory.push({
        filmId,
        quantity,
        minWarning: DEFAULT_MIN_WARNING,
        criticalWarning: DEFAULT_CRITICAL_WARNING,
        unitPrice: options?.unitPrice,
        totalCost: options?.totalPrice || (options?.unitPrice || 0) * quantity,
        lastStockInAt: now,
        lastConsumeAt: undefined
      });
    }
  }

  const newAlerts = updateAlerts(newInventory, state.alerts);

  return {
    state: {
      ...state,
      inventory: newInventory,
      stockInRecords: [record, ...state.stockInRecords],
      alerts: newAlerts,
      showAlertBadge: hasActiveAlerts(newAlerts)
    },
    record
  };
}

export function consumeStock(
  state: InventorySystemState,
  filmId: string,
  quantity: number,
  type: StockConsumeType,
  options?: {
    relatedPhotoId?: string;
    relatedOrderId?: string;
    subjectId?: string;
    notes?: string;
    operator?: string;
  }
): { state: InventorySystemState; record: StockConsumeRecord; success: boolean; error?: string } {
  const currentQuantity = getInventoryQuantity(state, filmId);
  
  if (currentQuantity < quantity) {
    return {
      state,
      record: {} as StockConsumeRecord,
      success: false,
      error: `库存不足，当前库存: ${currentQuantity}，需要: ${quantity}`
    };
  }

  const now = Date.now();
  const record: StockConsumeRecord = {
    id: generateId(),
    filmId,
    quantity,
    type,
    relatedPhotoId: options?.relatedPhotoId,
    relatedOrderId: options?.relatedOrderId,
    subjectId: options?.subjectId,
    notes: options?.notes,
    createdAt: now,
    operator: options?.operator
  };

  const newInventory = state.inventory.map(item => {
    if (item.filmId !== filmId) return item;
    return {
      ...item,
      quantity: item.quantity - quantity,
      lastConsumeAt: now
    };
  });

  const newAlerts = updateAlerts(newInventory, state.alerts);

  return {
    state: {
      ...state,
      inventory: newInventory,
      consumeRecords: [record, ...state.consumeRecords],
      alerts: newAlerts,
      showAlertBadge: hasActiveAlerts(newAlerts)
    },
    record,
    success: true
  };
}

export function scrapStock(
  state: InventorySystemState,
  filmId: string,
  quantity: number,
  reason: StockScrapReason,
  options?: {
    description?: string;
    notes?: string;
    operator?: string;
  }
): { state: InventorySystemState; record: StockScrapRecord; success: boolean; error?: string } {
  const currentQuantity = getInventoryQuantity(state, filmId);
  
  if (currentQuantity < quantity) {
    return {
      state,
      record: {} as StockScrapRecord,
      success: false,
      error: `库存不足，无法报废，当前库存: ${currentQuantity}，报废数量: ${quantity}`
    };
  }

  const now = Date.now();
  const record: StockScrapRecord = {
    id: generateId(),
    filmId,
    quantity,
    reason,
    description: options?.description,
    notes: options?.notes,
    createdAt: now,
    operator: options?.operator
  };

  const newInventory = state.inventory.map(item => {
    if (item.filmId !== filmId) return item;
    return {
      ...item,
      quantity: item.quantity - quantity
    };
  });

  const newAlerts = updateAlerts(newInventory, state.alerts);

  return {
    state: {
      ...state,
      inventory: newInventory,
      scrapRecords: [record, ...state.scrapRecords],
      alerts: newAlerts,
      showAlertBadge: hasActiveAlerts(newAlerts)
    },
    record,
    success: true
  };
}

function updateAlerts(inventory: FilmInventoryItem[], existingAlerts: InventoryAlert[]): InventoryAlert[] {
  const newAlerts: InventoryAlert[] = [];
  const now = Date.now();

  for (const item of inventory) {
    const level = getAlertLevel(item.quantity, item.minWarning, item.criticalWarning);
    
    if (level === 'normal') continue;

    const existingAlert = existingAlerts.find(a => a.filmId === item.filmId && !a.dismissed);
    
    if (existingAlert && existingAlert.level === level) {
      newAlerts.push(existingAlert);
    } else {
      const filmName = FILM_STOCKS.find(f => f.id === item.filmId)?.name || item.filmId;
      const message = level === 'critical' 
        ? `${filmName} 库存严重不足！仅剩 ${item.quantity} 卷`
        : `${filmName} 库存偏低，仅剩 ${item.quantity} 卷`;
      
      newAlerts.push({
        id: generateId(),
        filmId: item.filmId,
        level,
        message,
        currentQuantity: item.quantity,
        threshold: level === 'critical' ? item.criticalWarning : item.minWarning,
        createdAt: now,
        dismissed: false
      });
    }
  }

  const dismissedAlerts = existingAlerts.filter(a => a.dismissed);
  return [...newAlerts, ...dismissedAlerts];
}

function hasActiveAlerts(alerts: InventoryAlert[]): boolean {
  return alerts.some(a => !a.dismissed);
}

export function dismissAlert(state: InventorySystemState, alertId: string): InventorySystemState {
  const newAlerts = state.alerts.map(alert => 
    alert.id === alertId ? { ...alert, dismissed: true } : alert
  );
  
  return {
    ...state,
    alerts: newAlerts,
    showAlertBadge: hasActiveAlerts(newAlerts)
  };
}

export function dismissAllAlerts(state: InventorySystemState): InventorySystemState {
  const newAlerts = state.alerts.map(alert => ({ ...alert, dismissed: true }));
  
  return {
    ...state,
    alerts: newAlerts,
    showAlertBadge: false
  };
}

export function getActiveAlerts(state: InventorySystemState): InventoryAlert[] {
  return state.alerts.filter(a => !a.dismissed).sort((a, b) => {
    const levelOrder = { critical: 0, warning: 1, normal: 2 };
    return levelOrder[a.level] - levelOrder[b.level] || b.createdAt - a.createdAt;
  });
}

export function setWarningThresholds(
  state: InventorySystemState,
  filmId: string,
  minWarning: number,
  criticalWarning: number
): InventorySystemState {
  const newInventory = state.inventory.map(item => {
    if (item.filmId !== filmId) return item;
    return { ...item, minWarning, criticalWarning };
  });

  const newAlerts = updateAlerts(newInventory, state.alerts);

  return {
    ...state,
    inventory: newInventory,
    alerts: newAlerts,
    showAlertBadge: hasActiveAlerts(newAlerts)
  };
}

export function getInventoryStatistics(state: InventorySystemState): InventoryStatistics {
  const inventoryWithAlerts = getFilmInventoryWithAlerts(state);
  
  let totalValue = 0;
  let lowStockCount = 0;
  let criticalStockCount = 0;

  for (const item of inventoryWithAlerts) {
    if (item.unitPrice) {
      totalValue += item.unitPrice * item.quantity;
    } else if (item.totalCost && item.quantity > 0) {
      totalValue += item.totalCost;
    }
    
    if (item.alertLevel === 'warning') lowStockCount++;
    if (item.alertLevel === 'critical') criticalStockCount++;
  }

  const monthlyConsumption: Record<string, number> = {};
  const monthlyScrap: Record<string, number> = {};

  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  state.consumeRecords.forEach(record => {
    const date = new Date(record.createdAt);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyConsumption[monthKey]) monthlyConsumption[monthKey] = 0;
    monthlyConsumption[monthKey] += record.quantity;
  });

  state.scrapRecords.forEach(record => {
    const date = new Date(record.createdAt);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyScrap[monthKey]) monthlyScrap[monthKey] = 0;
    monthlyScrap[monthKey] += record.quantity;
  });

  return {
    totalFilmTypes: state.inventory.length,
    totalQuantity: state.inventory.reduce((sum, item) => sum + item.quantity, 0),
    totalValue,
    lowStockCount,
    criticalStockCount,
    monthlyConsumption,
    monthlyScrap
  };
}

export function getAllRecordsCombined(state: InventorySystemState): InventoryRecordWithType[] {
  const records: InventoryRecordWithType[] = [];
  
  state.stockInRecords.forEach(record => {
    records.push({ type: 'stock_in', record });
  });
  
  state.consumeRecords.forEach(record => {
    records.push({ type: 'consume', record });
  });
  
  state.scrapRecords.forEach(record => {
    records.push({ type: 'scrap', record });
  });
  
  return records.sort((a, b) => b.record.createdAt - a.record.createdAt);
}

export function filterRecords(
  records: InventoryRecordWithType[],
  filter: InventoryFilter
): InventoryRecordWithType[] {
  return records.filter(({ type, record }) => {
    if (filter.filmIds.length > 0 && !filter.filmIds.includes(record.filmId)) {
      return false;
    }

    if (filter.dateFrom && record.createdAt < filter.dateFrom) {
      return false;
    }
    if (filter.dateTo && record.createdAt > filter.dateTo) {
      return false;
    }

    if (filter.searchKeyword) {
      const keyword = filter.searchKeyword.toLowerCase();
      const filmName = FILM_STOCKS.find(f => f.id === record.filmId)?.name.toLowerCase() || '';
      const notes = (record as any).notes?.toLowerCase() || '';
      const description = (record as any).description?.toLowerCase() || '';
      if (!filmName.includes(keyword) && !notes.includes(keyword) && !description.includes(keyword)) {
        return false;
      }
    }

    if (type === 'stock_in' && filter.sourceTypes.length > 0) {
      if (!filter.sourceTypes.includes((record as StockInRecord).source)) {
        return false;
      }
    }

    if (type === 'consume' && filter.consumeTypes.length > 0) {
      if (!filter.consumeTypes.includes((record as StockConsumeRecord).type)) {
        return false;
      }
    }

    if (type === 'scrap' && filter.scrapReasons.length > 0) {
      if (!filter.scrapReasons.includes((record as StockScrapRecord).reason)) {
        return false;
      }
    }

    return true;
  }).sort((a, b) => {
    switch (filter.sortBy) {
      case 'date_desc':
        return b.record.createdAt - a.record.createdAt;
      case 'date_asc':
        return a.record.createdAt - b.record.createdAt;
      case 'quantity_desc':
        return b.record.quantity - a.record.quantity;
      case 'quantity_asc':
        return a.record.quantity - b.record.quantity;
      default:
        return b.record.createdAt - a.record.createdAt;
    }
  });
}

export function getFilmRecords(
  state: InventorySystemState,
  filmId: string
): InventoryRecordWithType[] {
  const allRecords = getAllRecordsCombined(state);
  return allRecords.filter(r => r.record.filmId === filmId);
}

export function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function getFilmName(filmId: string): string {
  return FILM_STOCKS.find(f => f.id === filmId)?.name || filmId;
}
