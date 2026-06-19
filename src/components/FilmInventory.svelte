<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { gameStore } from '../stores/gameStore';
  import { FILM_STOCKS, PHOTO_SUBJECTS } from '../data/gameData';
  import {
    INVENTORY_TABS,
    STOCK_IN_SOURCE_LABELS,
    STOCK_IN_SOURCE_ICONS,
    CONSUME_TYPE_LABELS,
    CONSUME_TYPE_ICONS,
    SCRAP_REASON_LABELS,
    SCRAP_REASON_ICONS,
    ALERT_LEVEL_COLORS,
    getFilmInventoryWithAlerts,
    getInventoryStatistics,
    getActiveAlerts,
    getAllRecordsCombined,
    filterRecords,
    formatDate,
    getFilmName
  } from '../utils/inventorySystem';
  import type {
    FilmInventoryItem,
    StockInSource,
    StockConsumeType,
    StockScrapReason,
    InventoryRecordWithType,
    AlertLevel
  } from '../types/game';

  const dispatch = createEventDispatcher<{ close: void }>();

  $: inventorySystem = $gameStore.inventorySystem;
  $: activeTab = inventorySystem.activeTab;
  $: inventoryWithAlerts = getFilmInventoryWithAlerts(inventorySystem);
  $: statistics = getInventoryStatistics(inventorySystem);
  $: activeAlerts = getActiveAlerts(inventorySystem);
  $: allRecords = getAllRecordsCombined(inventorySystem);
  $: filteredRecords = filterRecords(allRecords, inventorySystem.filter);

  let showStockInModal = false;
  let showConsumeModal = false;
  let showScrapModal = false;
  let showAlertPanel = false;
  let selectedFilmForAction: string | null = null;

  let stockInQuantity = 1;
  let stockInSource: StockInSource = 'purchase';
  let stockInUnitPrice = '';
  let stockInSupplier = '';
  let stockInNotes = '';

  let consumeQuantity = 1;
  let consumeType: StockConsumeType = 'develop';
  let consumeNotes = '';

  let scrapQuantity = 1;
  let scrapReason: StockScrapReason = 'expired';
  let scrapDescription = '';
  let scrapNotes = '';

  function setTab(tabId: string) {
    gameStore.setInventoryTab(tabId as any);
  }

  function openStockInModal(filmId?: string) {
    selectedFilmForAction = filmId || FILM_STOCKS[0].id;
    stockInQuantity = 1;
    stockInSource = 'purchase';
    stockInUnitPrice = '';
    stockInSupplier = '';
    stockInNotes = '';
    showStockInModal = true;
  }

  function handleStockIn() {
    if (!selectedFilmForAction || stockInQuantity <= 0) return;
    
    const unitPrice = stockInUnitPrice ? parseFloat(stockInUnitPrice) : undefined;
    const totalPrice = unitPrice ? unitPrice * stockInQuantity : undefined;
    
    gameStore.stockInFilm(selectedFilmForAction, stockInQuantity, stockInSource, {
      unitPrice,
      totalPrice,
      supplier: stockInSupplier || undefined,
      notes: stockInNotes || undefined
    });
    
    showStockInModal = false;
    selectedFilmForAction = null;
  }

  function openConsumeModal(filmId?: string) {
    selectedFilmForAction = filmId || FILM_STOCKS[0].id;
    consumeQuantity = 1;
    consumeType = 'develop';
    consumeNotes = '';
    showConsumeModal = true;
  }

  function handleConsume() {
    if (!selectedFilmForAction || consumeQuantity <= 0) return;
    
    gameStore.consumeFilm(selectedFilmForAction, consumeQuantity, consumeType, {
      notes: consumeNotes || undefined
    });
    
    showConsumeModal = false;
    selectedFilmForAction = null;
  }

  function openScrapModal(filmId?: string) {
    selectedFilmForAction = filmId || FILM_STOCKS[0].id;
    scrapQuantity = 1;
    scrapReason = 'expired';
    scrapDescription = '';
    scrapNotes = '';
    showScrapModal = true;
  }

  function handleScrap() {
    if (!selectedFilmForAction || scrapQuantity <= 0) return;
    
    gameStore.scrapFilm(selectedFilmForAction, scrapQuantity, scrapReason, {
      description: scrapDescription || undefined,
      notes: scrapNotes || undefined
    });
    
    showScrapModal = false;
    selectedFilmForAction = null;
  }

  function getFilmInfo(filmId: string) {
    return FILM_STOCKS.find(f => f.id === filmId);
  }

  function getAlertColor(level: AlertLevel): string {
    return ALERT_LEVEL_COLORS[level];
  }

  function getRecordTypeLabel(record: InventoryRecordWithType): string {
    switch (record.type) {
      case 'stock_in':
        return STOCK_IN_SOURCE_LABELS[(record.record as any).source];
      case 'consume':
        return CONSUME_TYPE_LABELS[(record.record as any).type];
      case 'scrap':
        return SCRAP_REASON_LABELS[(record.record as any).reason];
      default:
        return '';
    }
  }

  function getRecordTypeIcon(record: InventoryRecordWithType): string {
    switch (record.type) {
      case 'stock_in':
        return STOCK_IN_SOURCE_ICONS[(record.record as any).source];
      case 'consume':
        return CONSUME_TYPE_ICONS[(record.record as any).type];
      case 'scrap':
        return SCRAP_REASON_ICONS[(record.record as any).reason];
      default:
        return '📋';
    }
  }

  function getRecordTypeColor(record: InventoryRecordWithType): string {
    switch (record.type) {
      case 'stock_in':
        return '#67c23a';
      case 'consume':
        return '#4a90d9';
      case 'scrap':
        return '#f56c6c';
      default:
        return '#888';
    }
  }

  function getQuantityChange(record: InventoryRecordWithType): string {
    switch (record.type) {
      case 'stock_in':
        return `+${record.record.quantity}`;
      case 'consume':
      case 'scrap':
        return `-${record.record.quantity}`;
      default:
        return `${record.record.quantity}`;
    }
  }

  function handleSearch(e: Event) {
    const target = e.target as HTMLInputElement;
    gameStore.setInventoryFilter({ searchKeyword: target.value });
  }

  function handleSortChange(e: Event) {
    const target = e.target as HTMLSelectElement;
    gameStore.setInventoryFilter({ sortBy: target.value as any });
  }

  function getRecordNotes(record: any): string | undefined {
    return record?.notes;
  }
</script>

<div class="inventory-overlay">
  <div class="inventory-container">
    <div class="inventory-header">
      <div class="header-left">
        <h2 class="inventory-title">🎞️ 底片库存与损耗管理</h2>
        <span class="inventory-subtitle">胶片入库 · 冲洗消耗 · 异常报废 · 库存预警 · 记录联查</span>
      </div>
      <div class="header-actions">
        {#if activeAlerts.length > 0}
          <button class="alert-btn" on:click={() => showAlertPanel = !showAlertPanel}>
            <span class="alert-icon">⚠️</span>
            <span class="alert-badge">{activeAlerts.length}</span>
          </button>
        {/if}
        <button class="close-btn" on:click={() => dispatch('close')}>
          <span>✕</span>
        </button>
      </div>
    </div>

    <div class="stats-bar">
      <div class="stat-item">
        <span class="stat-label">胶片种类</span>
        <span class="stat-value">{statistics.totalFilmTypes}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">总库存量</span>
        <span class="stat-value">{statistics.totalQuantity} 卷</span>
      </div>
      <div class="stat-item warning">
        <span class="stat-label">库存预警</span>
        <span class="stat-value">{statistics.lowStockCount} 种</span>
      </div>
      <div class="stat-item critical">
        <span class="stat-label">严重不足</span>
        <span class="stat-value">{statistics.criticalStockCount} 种</span>
      </div>
    </div>

    {#if showAlertPanel && activeAlerts.length > 0}
      <div class="alert-panel">
        <div class="alert-panel-header">
          <span>📢 库存预警提醒</span>
          <button class="dismiss-all-btn" on:click={() => gameStore.dismissAllInventoryAlerts()}>全部忽略</button>
        </div>
        <div class="alert-list">
          {#each activeAlerts as alert (alert.id)}
            <div class="alert-item" style="border-left-color: {getAlertColor(alert.level)}">
              <div class="alert-content">
                <span class="alert-message">{alert.message}</span>
                <span class="alert-time">{formatDate(alert.createdAt)}</span>
              </div>
              <button class="dismiss-btn" on:click={() => gameStore.dismissInventoryAlert(alert.id)}>✕</button>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <div class="tab-nav">
      {#each INVENTORY_TABS as tab (tab.id)}
        <button
          class="tab-btn"
          class:active={activeTab === tab.id}
          on:click={() => setTab(tab.id)}
        >
          <span class="tab-icon">{tab.icon}</span>
          <span class="tab-label">{tab.label}</span>
        </button>
      {/each}
    </div>

    <div class="tab-content">
      {#if activeTab === 'stock'}
        <div class="stock-panel">
          <div class="panel-toolbar">
            <div class="toolbar-left">
              <span class="section-title">库存总览</span>
            </div>
            <div class="toolbar-right">
              <button class="action-btn primary" on:click={() => openStockInModal()}>
                📥 胶片入库
              </button>
              <button class="action-btn" on:click={() => openConsumeModal()}>
                📤 记录消耗
              </button>
              <button class="action-btn danger" on:click={() => openScrapModal()}>
                🗑️ 异常报废
              </button>
            </div>
          </div>

          <div class="inventory-grid">
            {#each inventoryWithAlerts as item (item.filmId)}
              {@const film = getFilmInfo(item.filmId)}
              <div class="inventory-card" class:low={item.alertLevel === 'warning'} class:critical={item.alertLevel === 'critical'}>
                <div class="card-header">
                  <div class="film-color-dot" style="background: {film?.thumbnailColor || '#888'}"></div>
                  <div class="film-info">
                    <h3 class="film-name">{film?.name || item.filmId}</h3>
                    <p class="film-meta">ISO {film?.iso} · {film?.color === 'bw' ? '黑白' : '彩色'}</p>
                  </div>
                  <div class="quantity-badge" style="background: {getAlertColor(item.alertLevel)}">
                    {item.quantity}
                  </div>
                </div>
                
                <div class="card-body">
                  <div class="stock-bar">
                    <div 
                      class="stock-fill"
                      style="width: {Math.min(100, item.quantity * 5)}%; background: {getAlertColor(item.alertLevel)}"
                    ></div>
                  </div>
                  <div class="threshold-info">
                    <span>预警: {item.minWarning} 卷</span>
                    <span>严重: {item.criticalWarning} 卷</span>
                  </div>
                </div>

                <div class="card-actions">
                  <button class="card-action-btn" on:click={() => openStockInModal(item.filmId)}>
                    📥 入库
                  </button>
                  <button class="card-action-btn" on:click={() => openConsumeModal(item.filmId)}>
                    📤 消耗
                  </button>
                  <button class="card-action-btn danger" on:click={() => openScrapModal(item.filmId)}>
                    🗑️ 报废
                  </button>
                </div>
              </div>
            {/each}
          </div>
        </div>

      {:else if activeTab === 'inbound'}
        <div class="records-panel">
          <div class="panel-toolbar">
            <div class="toolbar-left">
              <span class="section-title">入库记录</span>
              <span class="record-count">共 {inventorySystem.stockInRecords.length} 条</span>
            </div>
          </div>

          {#if inventorySystem.stockInRecords.length === 0}
            <div class="empty-state">
              <span class="empty-icon">📥</span>
              <p>暂无入库记录</p>
            </div>
          {:else}
            <div class="records-list">
              {#each inventorySystem.stockInRecords as record (record.id)}
                {@const film = getFilmInfo(record.filmId)}
                <div class="record-card stock-in">
                  <div class="record-icon">
                    {STOCK_IN_SOURCE_ICONS[record.source]}
                  </div>
                  <div class="record-main">
                    <div class="record-title">
                      {film?.name || record.filmId}
                      <span class="quantity-change positive">+{record.quantity}</span>
                    </div>
                    <div class="record-meta">
                      <span class="record-type-tag" style="background: rgba(103, 194, 58, 0.2); color: #67c23a">
                        {STOCK_IN_SOURCE_LABELS[record.source]}
                      </span>
                      {#if record.supplier}
                        <span>供应商: {record.supplier}</span>
                      {/if}
                      {#if record.unitPrice}
                        <span>单价: ¥{record.unitPrice}</span>
                      {/if}
                      <span class="record-time">{formatDate(record.createdAt)}</span>
                    </div>
                    {#if record.notes}
                      <p class="record-notes">{record.notes}</p>
                    {/if}
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>

      {:else if activeTab === 'consume'}
        <div class="records-panel">
          <div class="panel-toolbar">
            <div class="toolbar-left">
              <span class="section-title">消耗记录</span>
              <span class="record-count">共 {inventorySystem.consumeRecords.length} 条</span>
            </div>
          </div>

          {#if inventorySystem.consumeRecords.length === 0}
            <div class="empty-state">
              <span class="empty-icon">📤</span>
              <p>暂无消耗记录</p>
            </div>
          {:else}
            <div class="records-list">
              {#each inventorySystem.consumeRecords as record (record.id)}
                {@const film = getFilmInfo(record.filmId)}
                <div class="record-card consume">
                  <div class="record-icon">
                    {CONSUME_TYPE_ICONS[record.type]}
                  </div>
                  <div class="record-main">
                    <div class="record-title">
                      {film?.name || record.filmId}
                      <span class="quantity-change negative">-{record.quantity}</span>
                    </div>
                    <div class="record-meta">
                      <span class="record-type-tag" style="background: rgba(74, 144, 217, 0.2); color: #4a90d9">
                        {CONSUME_TYPE_LABELS[record.type]}
                      </span>
                      {#if record.subjectId}
                        <span>题材: {PHOTO_SUBJECTS.find(s => s.id === record.subjectId)?.name || record.subjectId}</span>
                      {/if}
                      <span class="record-time">{formatDate(record.createdAt)}</span>
                    </div>
                    {#if record.notes}
                      <p class="record-notes">{record.notes}</p>
                    {/if}
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>

      {:else if activeTab === 'scrap'}
        <div class="records-panel">
          <div class="panel-toolbar">
            <div class="toolbar-left">
              <span class="section-title">报废记录</span>
              <span class="record-count">共 {inventorySystem.scrapRecords.length} 条</span>
            </div>
          </div>

          {#if inventorySystem.scrapRecords.length === 0}
            <div class="empty-state">
              <span class="empty-icon">🗑️</span>
              <p>暂无报废记录</p>
            </div>
          {:else}
            <div class="records-list">
              {#each inventorySystem.scrapRecords as record (record.id)}
                {@const film = getFilmInfo(record.filmId)}
                <div class="record-card scrap">
                  <div class="record-icon">
                    {SCRAP_REASON_ICONS[record.reason]}
                  </div>
                  <div class="record-main">
                    <div class="record-title">
                      {film?.name || record.filmId}
                      <span class="quantity-change negative">-{record.quantity}</span>
                    </div>
                    <div class="record-meta">
                      <span class="record-type-tag" style="background: rgba(245, 108, 108, 0.2); color: #f56c6c">
                        {SCRAP_REASON_LABELS[record.reason]}
                      </span>
                      <span class="record-time">{formatDate(record.createdAt)}</span>
                    </div>
                    {#if record.description}
                      <p class="record-description"><strong>原因说明：</strong>{record.description}</p>
                    {/if}
                    {#if record.notes}
                      <p class="record-notes">{record.notes}</p>
                    {/if}
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>

      {:else if activeTab === 'records'}
        <div class="records-panel">
          <div class="panel-toolbar">
            <div class="toolbar-left">
              <span class="section-title">综合联查</span>
              <span class="record-count">共 {allRecords.length} 条记录</span>
            </div>
            <div class="toolbar-right">
              <input
                class="search-input"
                type="text"
                placeholder="搜索胶片名称、备注..."
                value={inventorySystem.filter.searchKeyword}
                on:input={handleSearch}
              />
              <select class="filter-select" value={inventorySystem.filter.sortBy} on:change={handleSortChange}>
                <option value="date_desc">最新优先</option>
                <option value="date_asc">最早优先</option>
                <option value="quantity_desc">数量从多到少</option>
                <option value="quantity_asc">数量从少到多</option>
              </select>
            </div>
          </div>

          {#if filteredRecords.length === 0}
            <div class="empty-state">
              <span class="empty-icon">🔍</span>
              <p>暂无匹配的记录</p>
            </div>
          {:else}
            <div class="records-list">
              {#each filteredRecords as item (item.record.id)}
                {@const film = getFilmInfo(item.record.filmId)}
                <div class="record-card {item.type}">
                  <div class="record-icon">
                    {getRecordTypeIcon(item)}
                  </div>
                  <div class="record-main">
                    <div class="record-title">
                      {film?.name || item.record.filmId}
                      <span class="quantity-change {item.type === 'stock_in' ? 'positive' : 'negative'}">
                        {getQuantityChange(item)}
                      </span>
                    </div>
                    <div class="record-meta">
                      <span class="record-type-tag" style="background: {getRecordTypeColor(item)}20; color: {getRecordTypeColor(item)}">
                        {getRecordTypeLabel(item)}
                      </span>
                      <span class="record-type-label">
                        {item.type === 'stock_in' ? '入库' : item.type === 'consume' ? '消耗' : '报废'}
                      </span>
                      <span class="record-time">{formatDate(item.record.createdAt)}</span>
                    </div>
                    {#if getRecordNotes(item.record)}
                      <p class="record-notes">{getRecordNotes(item.record)}</p>
                    {/if}
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/if}
    </div>
  </div>
</div>

{#if showStockInModal}
  <div class="modal-overlay" on:click={() => showStockInModal = false}>
    <div class="modal-content" on:click|stopPropagation>
      <div class="modal-header">
        <h3>📥 胶片入库</h3>
        <button class="close-btn" on:click={() => showStockInModal = false}>✕</button>
      </div>
      <div class="modal-body">
        <div class="form-row">
          <label class="form-label">选择胶片 *</label>
          <select class="form-input" bind:value={selectedFilmForAction}>
            {#each FILM_STOCKS as film (film.id)}
              <option value={film.id}>{film.name}</option>
            {/each}
          </select>
        </div>
        <div class="form-row">
          <label class="form-label">入库数量 *</label>
          <input class="form-input" type="number" min="1" bind:value={stockInQuantity} />
        </div>
        <div class="form-row">
          <label class="form-label">入库来源 *</label>
          <select class="form-input" bind:value={stockInSource}>
            <option value="purchase">采购</option>
            <option value="gift">赠送</option>
            <option value="refund">退货</option>
            <option value="other">其他</option>
          </select>
        </div>
        <div class="form-row">
          <label class="form-label">单价（元）</label>
          <input class="form-input" type="number" step="0.01" min="0" bind:value={stockInUnitPrice} placeholder="可选" />
        </div>
        <div class="form-row">
          <label class="form-label">供应商</label>
          <input class="form-input" type="text" bind:value={stockInSupplier} placeholder="可选" />
        </div>
        <div class="form-row">
          <label class="form-label">备注</label>
          <textarea class="form-textarea" bind:value={stockInNotes} rows={3} placeholder="输入备注信息..."></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-secondary" on:click={() => showStockInModal = false}>取消</button>
        <button class="btn-primary" on:click={handleStockIn} disabled={stockInQuantity <= 0}>
          确认入库
        </button>
      </div>
    </div>
  </div>
{/if}

{#if showConsumeModal}
  <div class="modal-overlay" on:click={() => showConsumeModal = false}>
    <div class="modal-content" on:click|stopPropagation>
      <div class="modal-header">
        <h3>📤 记录消耗</h3>
        <button class="close-btn" on:click={() => showConsumeModal = false}>✕</button>
      </div>
      <div class="modal-body">
        <div class="form-row">
          <label class="form-label">选择胶片 *</label>
          <select class="form-input" bind:value={selectedFilmForAction}>
            {#each FILM_STOCKS as film (film.id)}
              <option value={film.id}>{film.name}</option>
            {/each}
          </select>
        </div>
        <div class="form-row">
          <label class="form-label">消耗数量 *</label>
          <input class="form-input" type="number" min="1" bind:value={consumeQuantity} />
        </div>
        <div class="form-row">
          <label class="form-label">消耗类型 *</label>
          <select class="form-input" bind:value={consumeType}>
            <option value="develop">冲洗创作</option>
            <option value="test">测试</option>
            <option value="practice">练习</option>
            <option value="other">其他</option>
          </select>
        </div>
        <div class="form-row">
          <label class="form-label">备注</label>
          <textarea class="form-textarea" bind:value={consumeNotes} rows={3} placeholder="输入备注信息..."></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-secondary" on:click={() => showConsumeModal = false}>取消</button>
        <button class="btn-primary" on:click={handleConsume} disabled={consumeQuantity <= 0}>
          确认消耗
        </button>
      </div>
    </div>
  </div>
{/if}

{#if showScrapModal}
  <div class="modal-overlay" on:click={() => showScrapModal = false}>
    <div class="modal-content" on:click|stopPropagation>
      <div class="modal-header">
        <h3>🗑️ 异常报废</h3>
        <button class="close-btn" on:click={() => showScrapModal = false}>✕</button>
      </div>
      <div class="modal-body">
        <div class="form-row">
          <label class="form-label">选择胶片 *</label>
          <select class="form-input" bind:value={selectedFilmForAction}>
            {#each FILM_STOCKS as film (film.id)}
              <option value={film.id}>{film.name}</option>
            {/each}
          </select>
        </div>
        <div class="form-row">
          <label class="form-label">报废数量 *</label>
          <input class="form-input" type="number" min="1" bind:value={scrapQuantity} />
        </div>
        <div class="form-row">
          <label class="form-label">报废原因 *</label>
          <select class="form-input" bind:value={scrapReason}>
            <option value="expired">过期</option>
            <option value="damaged">损坏</option>
            <option value="fogged">漏光</option>
            <option value="defective">质量问题</option>
            <option value="other">其他</option>
          </select>
        </div>
        <div class="form-row">
          <label class="form-label">详细说明</label>
          <textarea class="form-textarea" bind:value={scrapDescription} rows={3} placeholder="描述报废的具体情况..."></textarea>
        </div>
        <div class="form-row">
          <label class="form-label">备注</label>
          <textarea class="form-textarea" bind:value={scrapNotes} rows={2} placeholder="其他备注信息..."></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-secondary" on:click={() => showScrapModal = false}>取消</button>
        <button class="btn-primary danger" on:click={handleScrap} disabled={scrapQuantity <= 0}>
          确认报废
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .inventory-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.85);
    backdrop-filter: blur(8px);
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    animation: fadeIn 0.3s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .inventory-container {
    width: 100%;
    max-width: 1100px;
    max-height: 92vh;
    background: linear-gradient(180deg, rgba(45, 26, 18, 0.95), rgba(20, 12, 8, 0.98));
    border: 1px solid rgba(139, 90, 43, 0.3);
    border-radius: 16px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .inventory-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 28px;
    border-bottom: 1px solid rgba(139, 90, 43, 0.2);
  }

  .header-left {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .inventory-title {
    margin: 0;
    font-size: 22px;
    color: #e8c890;
    letter-spacing: 2px;
  }

  .inventory-subtitle {
    font-size: 12px;
    color: #7a6a55;
    letter-spacing: 1px;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .alert-btn {
    position: relative;
    padding: 8px 14px;
    background: rgba(245, 108, 108, 0.15);
    border: 1px solid rgba(245, 108, 108, 0.3);
    border-radius: 8px;
    color: #f56c6c;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
    transition: all 0.2s;
  }

  .alert-btn:hover {
    background: rgba(245, 108, 108, 0.25);
  }

  .alert-badge {
    background: #f56c6c;
    color: #fff;
    font-size: 11px;
    font-weight: bold;
    padding: 2px 7px;
    border-radius: 10px;
    min-width: 18px;
    text-align: center;
  }

  .close-btn {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    background: rgba(139, 90, 43, 0.2);
    border: 1px solid rgba(139, 90, 43, 0.3);
    color: #c8a878;
    font-size: 16px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .close-btn:hover {
    background: rgba(200, 80, 80, 0.3);
    border-color: rgba(200, 80, 80, 0.5);
  }

  .stats-bar {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    padding: 16px 28px;
    background: rgba(0, 0, 0, 0.2);
    border-bottom: 1px solid rgba(139, 90, 43, 0.15);
  }

  .stat-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 12px 16px;
    background: rgba(139, 90, 43, 0.1);
    border-radius: 10px;
    border: 1px solid rgba(139, 90, 43, 0.15);
  }

  .stat-item.warning {
    background: rgba(230, 162, 60, 0.1);
    border-color: rgba(230, 162, 60, 0.2);
  }

  .stat-item.critical {
    background: rgba(245, 108, 108, 0.1);
    border-color: rgba(245, 108, 108, 0.2);
  }

  .stat-label {
    font-size: 12px;
    color: #8a7a5a;
  }

  .stat-value {
    font-size: 20px;
    font-weight: bold;
    color: #e8c890;
  }

  .stat-item.warning .stat-value {
    color: #e6a23c;
  }

  .stat-item.critical .stat-value {
    color: #f56c6c;
  }

  .alert-panel {
    margin: 16px 28px 0;
    background: rgba(245, 108, 108, 0.08);
    border: 1px solid rgba(245, 108, 108, 0.2);
    border-radius: 10px;
    overflow: hidden;
  }

  .alert-panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: rgba(245, 108, 108, 0.1);
    color: #f56c6c;
    font-weight: 600;
    font-size: 14px;
  }

  .dismiss-all-btn {
    background: transparent;
    border: 1px solid rgba(245, 108, 108, 0.3);
    color: #f56c6c;
    padding: 4px 12px;
    border-radius: 6px;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .dismiss-all-btn:hover {
    background: rgba(245, 108, 108, 0.15);
  }

  .alert-list {
    padding: 8px;
    max-height: 150px;
    overflow-y: auto;
  }

  .alert-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    margin: 4px;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 8px;
    border-left: 3px solid;
  }

  .alert-content {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .alert-message {
    font-size: 13px;
    color: #c8b896;
  }

  .alert-time {
    font-size: 11px;
    color: #6a5a45;
  }

  .dismiss-btn {
    background: transparent;
    border: none;
    color: #8a7a5a;
    cursor: pointer;
    font-size: 14px;
    padding: 4px 8px;
    border-radius: 4px;
    transition: all 0.2s;
  }

  .dismiss-btn:hover {
    color: #f56c6c;
    background: rgba(245, 108, 108, 0.1);
  }

  .tab-nav {
    display: flex;
    gap: 4px;
    padding: 12px 28px;
    background: rgba(0, 0, 0, 0.2);
    border-bottom: 1px solid rgba(139, 90, 43, 0.15);
    overflow-x: auto;
  }

  .tab-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 18px;
    border: none;
    background: transparent;
    color: #8a7a5a;
    font-size: 14px;
    cursor: pointer;
    border-radius: 8px;
    transition: all 0.2s;
    white-space: nowrap;
  }

  .tab-btn:hover {
    background: rgba(139, 90, 43, 0.15);
    color: #c8a878;
  }

  .tab-btn.active {
    background: linear-gradient(135deg, rgba(139, 90, 43, 0.4), rgba(180, 140, 90, 0.25));
    color: #f0d8a8;
    border: 1px solid rgba(180, 140, 90, 0.4);
  }

  .tab-icon {
    font-size: 16px;
  }

  .tab-content {
    flex: 1;
    overflow-y: auto;
    padding: 24px 28px;
  }

  .section-title {
    font-size: 16px;
    font-weight: 600;
    color: #d4a574;
  }

  .panel-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding-bottom: 12px;
    border-bottom: 1px solid rgba(139, 90, 43, 0.2);
    flex-wrap: wrap;
    gap: 12px;
  }

  .toolbar-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .toolbar-right {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .record-count {
    font-size: 12px;
    color: #8a7a5a;
    background: rgba(139, 90, 43, 0.15);
    padding: 4px 10px;
    border-radius: 12px;
  }

  .action-btn {
    padding: 8px 16px;
    background: rgba(139, 90, 43, 0.2);
    border: 1px solid rgba(139, 90, 43, 0.3);
    border-radius: 8px;
    color: #c8a878;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .action-btn:hover {
    background: rgba(139, 90, 43, 0.3);
  }

  .action-btn.primary {
    background: linear-gradient(135deg, #67c23a, #4a9d2e);
    border-color: #67c23a;
    color: #fff;
  }

  .action-btn.primary:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(103, 194, 58, 0.3);
  }

  .action-btn.danger {
    background: rgba(245, 108, 108, 0.15);
    border-color: rgba(245, 108, 108, 0.3);
    color: #f56c6c;
  }

  .action-btn.danger:hover {
    background: rgba(245, 108, 108, 0.25);
  }

  .search-input, .filter-select {
    padding: 8px 12px;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(139, 90, 43, 0.3);
    border-radius: 8px;
    color: #e8dcc8;
    font-size: 13px;
    outline: none;
    transition: border-color 0.2s;
  }

  .search-input {
    min-width: 200px;
  }

  .search-input:focus, .filter-select:focus {
    border-color: rgba(180, 140, 90, 0.6);
  }

  .inventory-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 16px;
  }

  .inventory-card {
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(139, 90, 43, 0.2);
    border-radius: 12px;
    overflow: hidden;
    transition: all 0.2s;
  }

  .inventory-card:hover {
    transform: translateY(-2px);
    border-color: rgba(180, 140, 90, 0.4);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  }

  .inventory-card.low {
    border-color: rgba(230, 162, 60, 0.4);
  }

  .inventory-card.critical {
    border-color: rgba(245, 108, 108, 0.4);
    animation: pulse-critical 2s infinite;
  }

  @keyframes pulse-critical {
    0%, 100% { box-shadow: 0 0 0 0 rgba(245, 108, 108, 0.2); }
    50% { box-shadow: 0 0 0 6px rgba(245, 108, 108, 0); }
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
    background: rgba(139, 90, 43, 0.1);
  }

  .film-color-dot {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .film-info {
    flex: 1;
    min-width: 0;
  }

  .film-name {
    margin: 0 0 2px 0;
    font-size: 15px;
    color: #e8c890;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .film-meta {
    margin: 0;
    font-size: 11px;
    color: #8a7a5a;
  }

  .quantity-badge {
    min-width: 44px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    color: #fff;
    font-weight: bold;
    font-size: 18px;
  }

  .card-body {
    padding: 12px 16px;
  }

  .stock-bar {
    height: 8px;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 8px;
  }

  .stock-fill {
    height: 100%;
    border-radius: 4px;
    transition: width 0.3s ease;
  }

  .threshold-info {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    color: #6a5a45;
  }

  .card-actions {
    display: flex;
    gap: 8px;
    padding: 12px 16px;
    border-top: 1px solid rgba(139, 90, 43, 0.15);
  }

  .card-action-btn {
    flex: 1;
    padding: 8px;
    background: rgba(139, 90, 43, 0.15);
    border: 1px solid rgba(139, 90, 43, 0.2);
    border-radius: 6px;
    color: #c8a878;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .card-action-btn:hover {
    background: rgba(139, 90, 43, 0.25);
  }

  .card-action-btn.danger {
    color: #f56c6c;
    border-color: rgba(245, 108, 108, 0.2);
  }

  .card-action-btn.danger:hover {
    background: rgba(245, 108, 108, 0.15);
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 20px;
    color: #6a5a45;
  }

  .empty-icon {
    font-size: 48px;
    margin-bottom: 12px;
    opacity: 0.6;
  }

  .empty-state p {
    margin: 0;
    font-size: 14px;
  }

  .records-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .record-card {
    display: flex;
    gap: 16px;
    padding: 16px;
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(139, 90, 43, 0.2);
    border-radius: 10px;
    border-left: 4px solid;
    transition: all 0.2s;
  }

  .record-card:hover {
    background: rgba(139, 90, 43, 0.08);
  }

  .record-card.stock-in {
    border-left-color: #67c23a;
  }

  .record-card.consume {
    border-left-color: #4a90d9;
  }

  .record-card.scrap {
    border-left-color: #f56c6c;
  }

  .record-icon {
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(139, 90, 43, 0.15);
    border-radius: 10px;
    font-size: 22px;
    flex-shrink: 0;
  }

  .record-main {
    flex: 1;
    min-width: 0;
  }

  .record-title {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 6px;
    font-size: 15px;
    font-weight: 600;
    color: #e8c890;
  }

  .quantity-change {
    font-weight: bold;
    font-size: 16px;
  }

  .quantity-change.positive {
    color: #67c23a;
  }

  .quantity-change.negative {
    color: #f56c6c;
  }

  .record-meta {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    font-size: 12px;
    color: #8a7a5a;
    margin-bottom: 8px;
  }

  .record-type-tag {
    padding: 3px 10px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 500;
  }

  .record-type-label {
    color: #6a5a45;
  }

  .record-time {
    color: #6a5a45;
  }

  .record-notes, .record-description {
    margin: 0;
    font-size: 12px;
    color: #a08b6c;
    line-height: 1.5;
  }

  .record-description strong {
    color: #c8a878;
  }

  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(4px);
    z-index: 200;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    animation: fadeIn 0.2s ease;
  }

  .modal-content {
    width: 100%;
    max-width: 480px;
    max-height: 90vh;
    background: linear-gradient(180deg, rgba(45, 26, 18, 0.98), rgba(20, 12, 8, 1));
    border: 1px solid rgba(139, 90, 43, 0.3);
    border-radius: 14px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 24px;
    border-bottom: 1px solid rgba(139, 90, 43, 0.2);
  }

  .modal-header h3 {
    margin: 0;
    color: #e8c890;
    font-size: 18px;
  }

  .modal-body {
    padding: 24px;
    overflow-y: auto;
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding: 16px 24px;
    border-top: 1px solid rgba(139, 90, 43, 0.2);
  }

  .form-row {
    margin-bottom: 16px;
  }

  .form-row:last-child {
    margin-bottom: 0;
  }

  .form-label {
    display: block;
    font-size: 13px;
    color: #a08b6c;
    margin-bottom: 6px;
  }

  .form-input, .form-textarea {
    width: 100%;
    padding: 10px 14px;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(139, 90, 43, 0.3);
    border-radius: 8px;
    color: #e8dcc8;
    font-size: 14px;
    outline: none;
    transition: border-color 0.2s;
    box-sizing: border-box;
    font-family: inherit;
  }

  .form-input:focus, .form-textarea:focus {
    border-color: rgba(180, 140, 90, 0.6);
  }

  .form-textarea {
    resize: vertical;
    min-height: 60px;
  }

  .btn-secondary {
    padding: 10px 22px;
    background: rgba(139, 90, 43, 0.2);
    border: 1px solid rgba(139, 90, 43, 0.4);
    border-radius: 8px;
    color: #c8a878;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-secondary:hover {
    background: rgba(139, 90, 43, 0.3);
  }

  .btn-primary {
    padding: 10px 22px;
    background: linear-gradient(135deg, #d4a574, #8b5a2b);
    border: none;
    border-radius: 8px;
    color: #fff;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-primary:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(212, 165, 116, 0.4);
  }

  .btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-primary.danger {
    background: linear-gradient(135deg, #f56c6c, #c0392b);
  }

  .btn-primary.danger:hover:not(:disabled) {
    box-shadow: 0 4px 12px rgba(245, 108, 108, 0.4);
  }

  @media (max-width: 768px) {
    .stats-bar {
      grid-template-columns: repeat(2, 1fr);
    }
    
    .inventory-grid {
      grid-template-columns: 1fr;
    }
    
    .inventory-container {
      max-height: 95vh;
    }
  }
</style>
