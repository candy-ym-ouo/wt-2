<script lang="ts">
  import { gameStore } from '../stores/gameStore';
  import type { DarkroomOrder, PhotoCollection, ProcessedPhoto } from '../types/game';
  import { FILM_STOCKS, SCENE_TYPE_LABELS, PHOTO_SUBJECTS } from '../data/gameData';
  import FilmMatcher from './FilmMatcher.svelte';
  import DevelopSchedule from './DevelopSchedule.svelte';
  import ScoreFeedback from './ScoreFeedback.svelte';
  import OrderDetailPanel from './OrderDetailPanel.svelte';
  import { get } from 'svelte/store';

  export let onClose: () => void = () => {};
  export let initialOrderId: string | null = null;
  export let initialTab: string | null = null;

  let selectedOrderId: string | null = null;
  let activeTab = 'detail';
  let showCreateForm = false;
  let archiveNotes = '';
  let selectedCollectionId: string | null = null;
  let showArchiveModal = false;

  $: orders = $gameStore.orders;
  $: collections = $gameStore.collections;
  $: processedPhotos = $gameStore.processedPhotos;

  $: if (initialOrderId && !selectedOrderId) {
    selectedOrderId = initialOrderId;
    gameStore.setCurrentOrder(initialOrderId);
  }
  $: if (initialTab && activeTab !== initialTab) {
    activeTab = initialTab;
  }

  $: selectedOrder = orders.find(o => o.id === selectedOrderId) || null;
  $: orderPhotos = selectedOrder 
    ? (selectedOrder.photoIds
        .map(id => processedPhotos.find(p => p.id === id))
        .filter(p => p !== undefined) as ProcessedPhoto[])
    : [];

  const tabs = [
    { id: 'detail', label: '订单详情', icon: '📋' },
    { id: 'film', label: '胶片匹配', icon: '🎞' },
    { id: 'schedule', label: '冲洗排期', icon: '📅' },
    { id: 'photos', label: '作品相册', icon: '🖼️' },
    { id: 'score', label: '评分回传', icon: '⭐' },
    { id: 'archive', label: '归档管理', icon: '📦' }
  ];

  const statusLabels: Record<string, string> = {
    pending: '待处理',
    matched: '已匹配',
    scheduled: '已排期',
    developing: '冲洗中',
    scoring: '待评价',
    completed: '已完成',
    archived: '已归档'
  };

  const statusColors: Record<string, string> = {
    pending: '#f59e0b',
    matched: '#3b82f6',
    scheduled: '#8b5cf6',
    developing: '#ec4899',
    scoring: '#f97316',
    completed: '#10b981',
    archived: '#6b7280'
  };

  const priorityLabels: Record<string, string> = {
    low: '低',
    normal: '普通',
    high: '高',
    urgent: '紧急'
  };

  function selectOrder(orderId: string) {
    selectedOrderId = orderId;
    gameStore.setCurrentOrder(orderId);
    activeTab = 'detail';
  }

  function formatDate(timestamp: number): string {
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }

  function getFilmName(filmId?: string): string {
    if (!filmId) return '未选择';
    const film = FILM_STOCKS.find(f => f.id === filmId);
    return film?.name || filmId;
  }

  function handleOrderCreated(e: Event) {
    const ce = e as CustomEvent<string>;
    selectedOrderId = ce.detail;
    showCreateForm = false;
  }

  function handleOrderDeleted() {
    selectedOrderId = null;
  }

  function handleCloseDetail() {
    // 不关闭，只是重置表单
  }

  function openArchiveModal() {
    if (!selectedOrder) return;
    archiveNotes = selectedOrder.archiveInfo?.archiveNotes || '';
    selectedCollectionId = selectedOrder.archiveInfo?.albumCollectionId || null;
    showArchiveModal = true;
  }

  function closeArchiveModal() {
    showArchiveModal = false;
    archiveNotes = '';
    selectedCollectionId = null;
  }

  function performArchive() {
    if (!selectedOrder) return;
    
    gameStore.archiveOrder(selectedOrder.id, archiveNotes.trim() || undefined, selectedCollectionId || undefined);
    
    if (selectedCollectionId && selectedOrder.photoIds.length > 0) {
      selectedOrder.photoIds.forEach(photoId => {
        gameStore.addPhotoToCollection(selectedCollectionId!, photoId);
      });
    }
    
    closeArchiveModal();
  }

  function unarchiveOrder() {
    if (!selectedOrder) return;
    gameStore.updateOrder(selectedOrder.id, { 
      status: 'completed',
      archiveInfo: undefined
    });
  }

  function getCollectionName(collectionId?: string): string {
    if (!collectionId) return '未关联';
    const collection = collections.find(c => c.id === collectionId);
    return collection?.name || collectionId;
  }

  function viewPhotoInAlbum(photoId: string) {
    const photo = get(gameStore).processedPhotos.find(p => p.id === photoId);
    if (photo) {
      gameStore.selectAlbumPhoto(photo);
      gameStore.openAlbum();
      onClose();
    }
  }

  function startDevelopment() {
    if (!selectedOrder || !selectedOrder.selectedFilmId) return;
    
    const matchedSubject = PHOTO_SUBJECTS.find(s => s.sceneType === selectedOrder.requirements.sceneType) 
      || PHOTO_SUBJECTS[0];
    
    gameStore.setSubject(matchedSubject.id);
    gameStore.setFilm(selectedOrder.selectedFilmId);
    gameStore.startOrderDevelopment(selectedOrder.id, matchedSubject.id);
    onClose();
  }

  function handleCreateOrder() {
    showCreateForm = true;
    selectedOrderId = null;
  }

  function handleCloseCreate() {
    showCreateForm = false;
  }

</script>

<div class="order-management" on:click|stopPropagation={() => {}}>
  <div class="om-header">
    <div class="om-title">
      <span class="om-icon">📋</span>
      <h2>暗房委托订单</h2>
    </div>
    <button class="close-btn" on:click={onClose}>
      ✕
    </button>
  </div>

  <div class="om-body">
    <div class="om-sidebar">
      <div class="sidebar-actions">
        <button class="create-order-btn" on:click={handleCreateOrder}>
          <span>+</span> 新建订单
        </button>
      </div>

      <div class="order-stats">
        <div class="stat-item">
          <span class="stat-value">{orders.length}</span>
          <span class="stat-label">总订单</span>
        </div>
        <div class="stat-item">
          <span class="stat-value" style="color: #f59e0b">{orders.filter(o => o.status === 'pending').length}</span>
          <span class="stat-label">待处理</span>
        </div>
        <div class="stat-item">
          <span class="stat-value" style="color: #10b981">{orders.filter(o => o.status === 'completed' || o.status === 'archived').length}</span>
          <span class="stat-label">已完成</span>
        </div>
      </div>

      <div class="order-list-wrapper">
        <div class="list-title">订单列表</div>
        <div class="order-list">
          {#if orders.length === 0}
            <div class="empty-list">
              <p>暂无订单</p>
              <p class="hint">点击上方按钮创建</p>
            </div>
          {:else}
            {#each orders as order (order.id)}
              <div
                class="order-item"
                class:active={selectedOrderId === order.id}
                on:click={() => selectOrder(order.id)}
              >
                <div class="order-item-header">
                  <span class="order-number">{order.orderNumber}</span>
                  <span
                    class="status-dot"
                    style="background: {statusColors[order.status]}"
                  />
                </div>
                <div class="order-item-body">
                  <span class="customer-name">{order.customer.name}</span>
                  <span class="order-type">{SCENE_TYPE_LABELS[order.requirements.sceneType] || order.requirements.sceneType}</span>
                </div>
                <div class="order-item-footer">
                  <span class="order-date">{formatDate(order.createdAt)}</span>
                </div>
              </div>
            {/each}
          {/if}
        </div>
      </div>
    </div>

    <div class="om-content">
      {#if showCreateForm}
        <div class="create-form-wrapper">
          <OrderDetailPanel order={null} isCreating={true} />
        </div>
      {:else if !selectedOrder}
        <div class="no-selection">
          <div class="no-selection-icon">📋</div>
          <h3>选择或创建订单</h3>
          <p>从左侧选择一个订单查看详情，或创建新订单</p>
        </div>
      {:else}
        <div class="order-detail-wrapper">
          <div class="order-header-bar">
            <div class="order-title-section">
              <h3 class="order-title-text">{selectedOrder.orderNumber}</h3>
              <span
                class="status-badge"
                style="background: {statusColors[selectedOrder.status]}20; color: {statusColors[selectedOrder.status]}">
                {statusLabels[selectedOrder.status]}
              </span>
            </div>
            <div class="order-priority">
              优先级：{priorityLabels[selectedOrder.priority]}
            </div>
          </div>

          <div class="tabs-bar">
            {#each tabs as tab}
              <button
                class="tab-btn"
                class:active={activeTab === tab.id}
                on:click={() => activeTab = tab.id}
              >
                <span class="tab-icon">{tab.icon}</span>
                <span class="tab-label">{tab.label}</span>
              </button>
            {/each}
          </div>

          <div class="tab-content">
            {#if activeTab === 'detail'}
              <div class="tab-pane">
                <OrderDetailPanel order={selectedOrder} isCreating={false} />
              </div>
            {/if}

            {#if activeTab === 'film'}
              <div class="tab-pane">
                <FilmMatcher order={selectedOrder} />
                {#if selectedOrder.status === 'pending' && selectedOrder.selectedFilmId}
                  <div class="action-hint">
                    <span>💡</span>
                    <span>已选择胶片，订单状态将自动更新为"已匹配"</span>
                  </div>
                {/if}
              </div>
            {/if}

            {#if activeTab === 'schedule'}
              <div class="tab-pane">
                <DevelopSchedule order={selectedOrder} />
                {#if selectedOrder.status === 'scheduled'}
                  <div class="action-section">
                    <button class="action-btn primary" on:click={startDevelopment} disabled={!selectedOrder.selectedFilmId}>
                      开始冲洗
                    </button>
                    {#if !selectedOrder.selectedFilmId}
                      <p class="hint-text">请先在"胶片匹配"中选择胶片</p>
                    {/if}
                  </div>
                {/if}
              </div>
            {/if}

            {#if activeTab === 'photos'}
              <div class="tab-pane">
                <div class="photos-section">
                  <div class="section-header">
                    <h4>订单作品</h4>
                    <span class="photo-count">{orderPhotos.length} / {selectedOrder.requirements.quantity} 张</span>
                  </div>
                  {#if orderPhotos.length === 0}
                    <div class="empty-photos">
                      <div class="empty-icon">🖼️</div>
                      <p>暂无作品照片</p>
                      <p class="hint">冲洗完成后照片将显示在这里</p>
                    </div>
                  {:else}
                    <div class="photo-grid">
                      {#each orderPhotos as photo (photo.id)}
                        <div class="photo-card" on:click={() => viewPhotoInAlbum(photo.id)}>
                          <img src={photo.imageDataUrl} alt="作品" />
                          <div class="photo-info">
                            <span class="photo-score">得分: {photo.score.toFixed(1)}</span>
                            <span class="photo-grade">{photo.details.grade}</span>
                          </div>
                        </div>
                      {/each}
                    </div>
                  {/if}
                </div>
              </div>
            {/if}

            {#if activeTab === 'score'}
              <div class="tab-pane">
                <ScoreFeedback order={selectedOrder} />
              </div>
            {/if}

            {#if activeTab === 'archive'}
              <div class="tab-pane">
                <div class="archive-section">
                  <div class="section-header">
                    <h4>归档信息</h4>
                  </div>
                  
                  {#if selectedOrder.status === 'archived' && selectedOrder.archiveInfo}
                    <div class="archive-info-card">
                      <div class="archive-item">
                        <span class="archive-label">归档时间</span>
                        <span class="archive-value">{formatDate(selectedOrder.archiveInfo.archivedAt)}</span>
                      </div>
                      <div class="archive-item">
                        <span class="archive-label">关联相册</span>
                        <span class="archive-value">{getCollectionName(selectedOrder.archiveInfo.albumCollectionId)}</span>
                      </div>
                      {#if selectedOrder.archiveInfo.archiveNotes}
                        <div class="archive-item">
                          <span class="archive-label">归档备注</span>
                          <span class="archive-value">{selectedOrder.archiveInfo.archiveNotes}</span>
                        </div>
                      {/if}
                      <button class="action-btn secondary" on:click={unarchiveOrder}>
                        取消归档
                      </button>
                    </div>
                  {:else if selectedOrder.status === 'completed' || selectedOrder.status === 'scoring'}
                    <div class="archive-actions">
                      <p>订单已完成，可以进行归档</p>
                      <button class="action-btn primary" on:click={openArchiveModal}>
                        📦 归档订单
                      </button>
                    </div>
                  {:else}
                    <div class="archive-hint">
                      <div class="hint-icon">⏳</div>
                      <p>订单完成后可进行归档</p>
                      <p class="hint">当前状态：{statusLabels[selectedOrder.status]}</p>
                    </div>
                  {/if}
                </div>
              </div>
            {/if}
          </div>
        </div>
      {/if}
    </div>
  </div>

  {#if showArchiveModal && selectedOrder}
    <div class="modal-overlay" on:click={closeArchiveModal}>
      <div class="modal-content" on:click|stopPropagation>
        <div class="modal-header">
          <h4>归档订单</h4>
          <button class="modal-close" on:click={closeArchiveModal}>✕</button>
        </div>
        <div class="modal-body">
          <div class="form-item">
            <label class="form-label">关联相册收藏</label>
            <select bind:value={selectedCollectionId}>
              <option value={null}>不关联</option>
              {#each collections as collection}
                <option value={collection.id}>{collection.name}</option>
              {/each}
            </select>
            <p class="field-hint">归档时将订单中的照片添加到所选相册收藏中</p>
          </div>
          <div class="form-item">
            <label class="form-label">归档备注</label>
            <textarea
              bind:value={archiveNotes}
              placeholder="添加归档备注..."
              rows={3}
            />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn secondary" on:click={closeArchiveModal}>取消</button>
          <button class="btn primary" on:click={performArchive}>确认归档</button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .order-management {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.85);
    backdrop-filter: blur(10px);
    z-index: 100;
    display: flex;
    flex-direction: column;
    animation: fadeIn 0.3s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .om-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 24px;
    background: linear-gradient(90deg, rgba(45, 26, 18, 0.9), rgba(26, 15, 10, 0.8));
    border-bottom: 1px solid rgba(139, 90, 43, 0.3);
  }

  .om-title {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .om-icon {
    font-size: 28px;
  }

  .om-title h2 {
    margin: 0;
    font-size: 20px;
    color: #e8c890;
    letter-spacing: 2px;
  }

  .close-btn {
    background: rgba(139, 90, 43, 0.2);
    border: 1px solid rgba(139, 90, 43, 0.3);
    color: #a89878;
    width: 36px;
    height: 36px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 16px;
    transition: all 0.2s ease;
  }

  .close-btn:hover {
    background: rgba(200, 80, 80, 0.2);
    border-color: rgba(200, 80, 80, 0.4);
    color: #e08080;
  }

  .om-body {
    flex: 1;
    display: flex;
    overflow: hidden;
  }

  .om-sidebar {
    width: 280px;
    background: rgba(20, 12, 8, 0.6);
    border-right: 1px solid rgba(139, 90, 43, 0.2);
    display: flex;
    flex-direction: column;
  }

  .sidebar-actions {
    padding: 16px;
    border-bottom: 1px solid rgba(139, 90, 43, 0.15);
  }

  .create-order-btn {
    width: 100%;
    padding: 10px;
    background: linear-gradient(135deg, #c8a878, #a08050);
    color: #1a1008;
    border: none;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .create-order-btn:hover {
    background: linear-gradient(135deg, #d4b888, #b09060);
    transform: translateY(-1px);
  }

  .order-stats {
    display: flex;
    justify-content: space-around;
    padding: 12px 16px;
    border-bottom: 1px solid rgba(139, 90, 43, 0.15);
  }

  .stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
  }

  .stat-value {
    font-size: 20px;
    font-weight: 700;
    color: #e8c890;
  }

  .stat-label {
    font-size: 10px;
    color: #6a5a45;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .order-list-wrapper {
    flex: 1;
    overflow-y: auto;
    padding: 12px;
  }

  .list-title {
    font-size: 12px;
    color: #8a7a5a;
    margin-bottom: 10px;
    padding-left: 4px;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .order-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .order-item {
    background: rgba(0, 0, 0, 0.25);
    border: 1px solid rgba(139, 90, 43, 0.2);
    border-radius: 10px;
    padding: 10px 12px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .order-item:hover {
    border-color: rgba(200, 150, 80, 0.4);
    background: rgba(0, 0, 0, 0.35);
  }

  .order-item.active {
    border-color: rgba(200, 150, 80, 0.6);
    background: rgba(200, 150, 80, 0.1);
  }

  .order-item-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
  }

  .order-number {
    font-family: monospace;
    font-size: 11px;
    color: #c8a878;
    font-weight: 500;
  }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }

  .order-item-body {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
  }

  .customer-name {
    font-size: 13px;
    color: #e8c890;
    font-weight: 500;
  }

  .order-type {
    font-size: 10px;
    color: #8a7a5a;
    background: rgba(139, 90, 43, 0.2);
    padding: 2px 6px;
    border-radius: 4px;
  }

  .order-item-footer {
    font-size: 10px;
    color: #6a5a45;
  }

  .empty-list {
    text-align: center;
    padding: 30px 10px;
    color: #6a5a45;
  }

  .empty-list p {
    margin: 4px 0;
    font-size: 12px;
  }

  .empty-list .hint {
    font-size: 11px;
    color: #5a4a35;
  }

  .om-content {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
  }

  .no-selection {
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #6a5a45;
  }

  .no-selection-icon {
    font-size: 64px;
    margin-bottom: 16px;
    opacity: 0.5;
  }

  .no-selection h3 {
    margin: 0 0 8px 0;
    color: #c8a878;
    font-size: 18px;
  }

  .no-selection p {
    margin: 0;
    font-size: 13px;
  }

  .order-detail-wrapper {
    max-width: 800px;
    margin: 0 auto;
  }

  .order-header-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid rgba(139, 90, 43, 0.2);
  }

  .order-title-section {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .order-title-text {
    margin: 0;
    font-size: 18px;
    color: #e8c890;
    font-family: monospace;
  }

  .status-badge {
    font-size: 12px;
    padding: 4px 12px;
    border-radius: 12px;
    font-weight: 500;
  }

  .order-priority {
    font-size: 12px;
    color: #8a7a5a;
  }

  .tabs-bar {
    display: flex;
    gap: 4px;
    margin-bottom: 16px;
    background: rgba(0, 0, 0, 0.2);
    padding: 4px;
    border-radius: 10px;
  }

  .tab-btn {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 10px 8px;
    background: transparent;
    border: none;
    border-radius: 8px;
    color: #8a7a5a;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .tab-btn:hover {
    background: rgba(139, 90, 43, 0.2);
    color: #c8a878;
  }

  .tab-btn.active {
    background: rgba(200, 150, 80, 0.2);
    color: #e8c890;
  }

  .tab-icon {
    font-size: 18px;
  }

  .tab-label {
    font-size: 11px;
  }

  .tab-content {
    min-height: 400px;
  }

  .tab-pane {
    animation: slideIn 0.2s ease;
  }

  @keyframes slideIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .action-hint {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 12px;
    padding: 10px 14px;
    background: rgba(16, 185, 129, 0.1);
    border: 1px solid rgba(16, 185, 129, 0.3);
    border-radius: 8px;
    font-size: 12px;
    color: #10b981;
  }

  .action-section {
    margin-top: 16px;
    text-align: center;
  }

  .action-btn {
    padding: 10px 24px;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    border: none;
    transition: all 0.2s ease;
  }

  .action-btn.primary {
    background: linear-gradient(135deg, #c8a878, #a08050);
    color: #1a1008;
  }

  .action-btn.primary:hover:not(:disabled) {
    background: linear-gradient(135deg, #d4b888, #b09060);
    transform: translateY(-1px);
  }

  .action-btn.primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .action-btn.secondary {
    background: rgba(139, 90, 43, 0.2);
    color: #a89878;
    border: 1px solid rgba(139, 90, 43, 0.3);
  }

  .action-btn.secondary:hover {
    background: rgba(139, 90, 43, 0.4);
  }

  .hint-text {
    font-size: 11px;
    color: #6a5a45;
    margin-top: 8px;
  }

  .photos-section {
    background: linear-gradient(180deg, rgba(45, 26, 18, 0.5) 0%, rgba(20, 12, 8, 0.6) 100%);
    border: 1px solid rgba(139, 90, 43, 0.2);
    border-radius: 16px;
    padding: 16px;
    backdrop-filter: blur(6px);
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 14px;
    padding-bottom: 10px;
    border-bottom: 1px solid rgba(139, 90, 43, 0.2);
  }

  .section-header h4 {
    margin: 0;
    font-size: 15px;
    font-weight: 600;
    color: #e8c890;
  }

  .photo-count {
    font-size: 12px;
    color: #8a7a5a;
  }

  .empty-photos {
    text-align: center;
    padding: 40px 20px;
    color: #6a5a45;
  }

  .empty-icon {
    font-size: 48px;
    margin-bottom: 12px;
    opacity: 0.5;
  }

  .empty-photos p {
    margin: 4px 0;
    font-size: 13px;
  }

  .empty-photos .hint {
    font-size: 11px;
    color: #5a4a35;
  }

  .photo-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 12px;
  }

  .photo-card {
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(139, 90, 43, 0.2);
    border-radius: 10px;
    overflow: hidden;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .photo-card:hover {
    border-color: rgba(200, 150, 80, 0.5);
    transform: translateY(-2px);
  }

  .photo-card img {
    width: 100%;
    aspect-ratio: 3 / 4;
    object-fit: cover;
    display: block;
  }

  .photo-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 10px;
  }

  .photo-score {
    font-size: 11px;
    color: #c8a878;
    font-weight: 500;
  }

  .photo-grade {
    font-size: 12px;
    font-weight: 700;
    color: #f59e0b;
  }

  .archive-section {
    background: linear-gradient(180deg, rgba(45, 26, 18, 0.5) 0%, rgba(20, 12, 8, 0.6) 100%);
    border: 1px solid rgba(139, 90, 43, 0.2);
    border-radius: 16px;
    padding: 16px;
    backdrop-filter: blur(6px);
  }

  .archive-info-card {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .archive-item {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 10px 12px;
    background: rgba(0, 0, 0, 0.25);
    border-radius: 8px;
  }

  .archive-label {
    font-size: 12px;
    color: #6a5a45;
  }

  .archive-value {
    font-size: 13px;
    color: #c8a878;
    font-weight: 500;
    text-align: right;
    max-width: 60%;
  }

  .archive-actions {
    text-align: center;
    padding: 30px 20px;
  }

  .archive-actions p {
    margin: 0 0 16px 0;
    color: #8a7a5a;
    font-size: 13px;
  }

  .archive-hint {
    text-align: center;
    padding: 40px 20px;
    color: #6a5a45;
  }

  .hint-icon {
    font-size: 48px;
    margin-bottom: 12px;
    opacity: 0.5;
  }

  .archive-hint p {
    margin: 4px 0;
    font-size: 13px;
  }

  .archive-hint .hint {
    font-size: 11px;
    color: #5a4a35;
  }

  .create-form-wrapper {
    max-width: 600px;
    margin: 0 auto;
  }

  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 200;
    animation: fadeIn 0.2s ease;
  }

  .modal-content {
    background: linear-gradient(180deg, rgba(45, 26, 18, 0.95) 0%, rgba(20, 12, 8, 0.98) 100%);
    border: 1px solid rgba(139, 90, 43, 0.3);
    border-radius: 16px;
    width: 90%;
    max-width: 420px;
    animation: modalIn 0.3s ease;
  }

  @keyframes modalIn {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid rgba(139, 90, 43, 0.2);
  }

  .modal-header h4 {
    margin: 0;
    font-size: 16px;
    color: #e8c890;
  }

  .modal-close {
    background: transparent;
    border: none;
    color: #8a7a5a;
    font-size: 18px;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 6px;
    transition: all 0.2s ease;
  }

  .modal-close:hover {
    background: rgba(139, 90, 43, 0.2);
    color: #c8a878;
  }

  .modal-body {
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .form-item {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .form-label {
    font-size: 12px;
    color: #8a7a5a;
  }

  .form-item select,
  .form-item textarea {
    width: 100%;
    padding: 8px 12px;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(139, 90, 43, 0.25);
    border-radius: 8px;
    color: #c8a878;
    font-size: 13px;
    outline: none;
    box-sizing: border-box;
    font-family: inherit;
  }

  .form-item select:focus,
  .form-item textarea:focus {
    border-color: rgba(200, 150, 80, 0.5);
  }

  .form-item textarea {
    resize: vertical;
    min-height: 80px;
  }

  .field-hint {
    font-size: 11px;
    color: #6a5a45;
    margin: 0;
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    padding: 16px 20px;
    border-top: 1px solid rgba(139, 90, 43, 0.2);
  }

  .btn {
    padding: 8px 20px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    border: none;
    transition: all 0.2s ease;
  }

  .btn.primary {
    background: linear-gradient(135deg, #c8a878, #a08050);
    color: #1a1008;
  }

  .btn.primary:hover {
    background: linear-gradient(135deg, #d4b888, #b09060);
  }

  .btn.secondary {
    background: rgba(139, 90, 43, 0.2);
    color: #a89878;
    border: 1px solid rgba(139, 90, 43, 0.3);
  }

  .btn.secondary:hover {
    background: rgba(139, 90, 43, 0.4);
  }
</style>
