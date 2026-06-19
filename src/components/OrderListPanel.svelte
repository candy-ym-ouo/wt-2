<script lang="ts">
  import { gameStore } from '../stores/gameStore';
  import type { DarkroomOrder, OrderStatus, OrderPriority } from '../types/game';
  import { FILM_STOCKS, SCENE_TYPE_LABELS } from '../data/gameData';

  export let selectedOrderId: string | null = null;

  let showCreateForm = false;
  let searchKeyword = '';

  $: orders = $gameStore.orders;
  $: orderFilter = $gameStore.orderFilter;

  $: filteredOrders = filterOrders(orders, orderFilter, searchKeyword);

  const statusLabels: Record<OrderStatus, string> = {
    pending: '待处理',
    matched: '已匹配',
    scheduled: '已排期',
    developing: '冲洗中',
    scoring: '待评价',
    completed: '已完成',
    archived: '已归档'
  };

  const statusList = Object.keys(statusLabels) as OrderStatus[];

  const statusColors: Record<OrderStatus, string> = {
    pending: '#f59e0b',
    matched: '#3b82f6',
    scheduled: '#8b5cf6',
    developing: '#ec4899',
    scoring: '#f97316',
    completed: '#10b981',
    archived: '#6b7280'
  };

  const priorityLabels: Record<OrderPriority, string> = {
    low: '低',
    normal: '普通',
    high: '高',
    urgent: '紧急'
  };

  const priorityColors: Record<OrderPriority, string> = {
    low: '#6b7280',
    normal: '#3b82f6',
    high: '#f59e0b',
    urgent: '#ef4444'
  };

  function filterOrders(orders: DarkroomOrder[], filter: any, keyword: string): DarkroomOrder[] {
    let result = [...orders];

    if (filter.statuses && filter.statuses.length > 0) {
      result = result.filter(o => filter.statuses.includes(o.status));
    }

    if (filter.priorities && filter.priorities.length > 0) {
      result = result.filter(o => filter.priorities.includes(o.priority));
    }

    if (keyword && keyword.trim()) {
      const kw = keyword.toLowerCase();
      result = result.filter(o => 
        o.customer.name.toLowerCase().includes(kw) ||
        o.orderNumber.toLowerCase().includes(kw) ||
        o.requirements.specialInstructions?.toLowerCase().includes(kw)
      );
    }

    switch (filter.sortBy) {
      case 'created_desc':
        result.sort((a, b) => b.createdAt - a.createdAt);
        break;
      case 'created_asc':
        result.sort((a, b) => a.createdAt - b.createdAt);
        break;
      case 'priority_desc':
        const priorityOrder = { urgent: 4, high: 3, normal: 2, low: 1 };
        result.sort((a, b) => (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0));
        break;
      case 'status':
        const statusOrder = { pending: 1, matched: 2, scheduled: 3, developing: 4, scoring: 5, completed: 6, archived: 7 };
        result.sort((a, b) => (statusOrder[a.status] || 0) - (statusOrder[b.status] || 0));
        break;
    }

    return result;
  }

  function selectOrder(orderId: string) {
    selectedOrderId = orderId;
    gameStore.setCurrentOrder(orderId);
    const event = new CustomEvent('selectOrder', { detail: orderId });
    document.dispatchEvent(event);
  }

  function formatDate(timestamp: number): string {
    const date = new Date(timestamp);
    return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }

  function getFilmName(filmId?: string): string {
    if (!filmId) return '未选择';
    const film = FILM_STOCKS.find(f => f.id === filmId);
    return film?.name || filmId;
  }

  function toggleStatusFilter(status: OrderStatus) {
    const currentStatuses = [...orderFilter.statuses];
    const idx = currentStatuses.indexOf(status);
    if (idx >= 0) {
      currentStatuses.splice(idx, 1);
    } else {
      currentStatuses.push(status);
    }
    gameStore.updateOrderFilter({ statuses: currentStatuses });
  }

  function handleSearch(e: Event) {
    searchKeyword = (e.target as HTMLInputElement).value;
  }

  function openCreateForm() {
    showCreateForm = true;
  }

  function closeCreateForm() {
    showCreateForm = false;
  }
</script>

<div class="order-list-panel">
  <div class="panel-header">
    <h3 class="title">委托订单</h3>
    <button class="create-btn" on:click={openCreateForm}>
      <span>+</span> 新建
    </button>
  </div>

  <div class="search-box">
    <input
      type="text"
      placeholder="搜索订单号、客户名..."
      value={searchKeyword}
      on:input={handleSearch}
    />
  </div>

  <div class="filter-tags">
    {#each statusList as status}
      <button
        class="filter-tag"
        class:active={orderFilter.statuses.includes(status)}
        on:click={() => toggleStatusFilter(status)}
        style="--tag-color: {statusColors[status]}"
      >
        {statusLabels[status]}
      </button>
    {/each}
  </div>

  <div class="orders-list">
    {#if filteredOrders.length === 0}
      <div class="empty-state">
        <div class="empty-icon">📋</div>
        <p>暂无订单</p>
        <p class="empty-hint">点击"新建"创建第一个委托订单</p>
      </div>
    {:else}
      {#each filteredOrders as order (order.id)}
        <div
          class="order-card"
          class:selected={selectedOrderId === order.id}
          on:click={() => selectOrder(order.id)}
        >
          <div class="order-header">
            <span class="order-number">{order.orderNumber}</span>
            <span
              class="status-badge"
              style="background: {statusColors[order.status]}20; color: {statusColors[order.status]}"
            >
              {statusLabels[order.status]}
            </span>
          </div>

          <div class="order-body">
            <div class="customer-info">
              <span class="customer-icon">👤</span>
              <span class="customer-name">{order.customer.name}</span>
            </div>
            <div class="order-meta">
              <span class="meta-item">
                {SCENE_TYPE_LABELS[order.requirements.sceneType] || order.requirements.sceneType}
              </span>
              <span class="meta-item">
                {order.requirements.quantity} 张
              </span>
            </div>
            <div class="film-info">
              <span class="film-label">胶片：</span>
              <span class="film-name">{getFilmName(order.selectedFilmId)}</span>
            </div>
          </div>

          <div class="order-footer">
            <span
              class="priority-tag"
              style="background: {priorityColors[order.priority]}15; color: {priorityColors[order.priority]}"
            >
              {priorityLabels[order.priority]}优先级
            </span>
            <span class="order-date">{formatDate(order.createdAt)}</span>
          </div>
        </div>
      {/each}
    {/if}
  </div>
</div>

<style>
  .order-list-panel {
    background: linear-gradient(180deg, rgba(45, 26, 18, 0.5) 0%, rgba(20, 12, 8, 0.6) 100%);
    border: 1px solid rgba(139, 90, 43, 0.2);
    border-radius: 16px;
    padding: 16px;
    backdrop-filter: blur(6px);
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }

  .title {
    font-size: 15px;
    font-weight: 600;
    color: #e8c890;
    margin: 0;
    letter-spacing: 1px;
  }

  .create-btn {
    background: linear-gradient(135deg, rgba(200, 150, 80, 0.3), rgba(139, 90, 43, 0.2));
    border: 1px solid rgba(200, 150, 80, 0.4);
    color: #e8c890;
    padding: 6px 14px;
    border-radius: 8px;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .create-btn:hover {
    background: linear-gradient(135deg, rgba(200, 150, 80, 0.5), rgba(139, 90, 43, 0.3));
    transform: translateY(-1px);
  }

  .search-box {
    margin-bottom: 12px;
  }

  .search-box input {
    width: 100%;
    padding: 8px 12px;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(139, 90, 43, 0.25);
    border-radius: 8px;
    color: #c8a878;
    font-size: 12px;
    outline: none;
    transition: border-color 0.2s ease;
    box-sizing: border-box;
  }

  .search-box input:focus {
    border-color: rgba(200, 150, 80, 0.5);
  }

  .search-box input::placeholder {
    color: #6a5a45;
  }

  .filter-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 14px;
  }

  .filter-tag {
    padding: 4px 10px;
    border-radius: 12px;
    font-size: 11px;
    border: 1px solid rgba(139, 90, 43, 0.3);
    background: rgba(0, 0, 0, 0.2);
    color: #8a7a5a;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .filter-tag:hover {
    border-color: var(--tag-color, rgba(200, 150, 80, 0.5));
  }

  .filter-tag.active {
    background: color-mix(in srgb, var(--tag-color, #c8a878) 20%, transparent);
    border-color: var(--tag-color, #c8a878);
    color: var(--tag-color, #e8c890);
  }

  .orders-list {
    max-height: 500px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .orders-list::-webkit-scrollbar {
    width: 6px;
  }

  .orders-list::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 3px;
  }

  .orders-list::-webkit-scrollbar-thumb {
    background: rgba(139, 90, 43, 0.4);
    border-radius: 3px;
  }

  .order-card {
    background: rgba(0, 0, 0, 0.25);
    border: 1px solid rgba(139, 90, 43, 0.2);
    border-radius: 12px;
    padding: 12px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .order-card:hover {
    border-color: rgba(200, 150, 80, 0.4);
    background: rgba(0, 0, 0, 0.35);
    transform: translateX(2px);
  }

  .order-card.selected {
    border-color: rgba(200, 150, 80, 0.6);
    background: rgba(200, 150, 80, 0.1);
    box-shadow: 0 0 0 1px rgba(200, 150, 80, 0.3);
  }

  .order-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .order-number {
    font-family: monospace;
    font-size: 12px;
    color: #c8a878;
    font-weight: 500;
  }

  .status-badge {
    font-size: 10px;
    padding: 3px 8px;
    border-radius: 10px;
    font-weight: 500;
  }

  .order-body {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .customer-info {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .customer-icon {
    font-size: 14px;
  }

  .customer-name {
    font-size: 13px;
    color: #e8c890;
    font-weight: 500;
  }

  .order-meta {
    display: flex;
    gap: 10px;
  }

  .meta-item {
    font-size: 11px;
    color: #8a7a5a;
    background: rgba(139, 90, 43, 0.15);
    padding: 2px 8px;
    border-radius: 6px;
  }

  .film-info {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .film-label {
    font-size: 11px;
    color: #6a5a45;
  }

  .film-name {
    font-size: 11px;
    color: #a89878;
  }

  .order-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid rgba(139, 90, 43, 0.15);
  }

  .priority-tag {
    font-size: 10px;
    padding: 2px 8px;
    border-radius: 8px;
    font-weight: 500;
  }

  .order-date {
    font-size: 11px;
    color: #6a5a45;
  }

  .empty-state {
    text-align: center;
    padding: 40px 20px;
    color: #6a5a45;
  }

  .empty-icon {
    font-size: 48px;
    margin-bottom: 12px;
    opacity: 0.5;
  }

  .empty-state p {
    margin: 4px 0;
    font-size: 13px;
  }

  .empty-hint {
    font-size: 11px !important;
    color: #5a4a35;
  }
</style>
