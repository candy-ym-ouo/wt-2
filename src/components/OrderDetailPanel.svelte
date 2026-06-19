<script lang="ts">
  import { gameStore } from '../stores/gameStore';
  import type { DarkroomOrder, OrderRequirements, CustomerInfo, OrderPriority, OrderStatus, TargetStyle, DifficultyLevel } from '../types/game';
  import { FILM_STOCKS, SCENE_TYPE_LABELS, TARGET_STYLE_LABELS, TARGET_STYLE_ICONS, DIFFICULTY_LABELS } from '../data/gameData';

  export let order: DarkroomOrder | null = null;
  export let isCreating: boolean = false;

  let customerName = '';
  let customerContact = '';
  let customerNotes = '';
  let sceneType = 'portrait';
  let targetStyle: TargetStyle = 'soft';
  let difficulty: DifficultyLevel = 2;
  let preferredFilmType: 'bw' | 'color' | 'any' = 'any';
  let preferredIso: 'low' | 'medium' | 'high' | 'any' = 'any';
  let grainPreference: 'fine' | 'medium' | 'coarse' | 'any' = 'any';
  let specialInstructions = '';
  let quantity = 1;
  let priority: OrderPriority = 'normal';
  let internalNotes = '';

  $: if (order && !isCreating) {
    customerName = order.customer.name;
    customerContact = order.customer.contact || '';
    customerNotes = order.customer.notes || '';
    sceneType = order.requirements.sceneType;
    targetStyle = order.requirements.targetStyle;
    difficulty = order.requirements.difficulty;
    preferredFilmType = order.requirements.preferredFilmType || 'any';
    preferredIso = order.requirements.preferredIso || 'any';
    grainPreference = order.requirements.grainPreference || 'any';
    specialInstructions = order.requirements.specialInstructions || '';
    quantity = order.requirements.quantity;
    priority = order.priority;
    internalNotes = order.internalNotes || '';
  }

  const statusLabels: Record<OrderStatus, string> = {
    pending: '待处理',
    matched: '已匹配',
    scheduled: '已排期',
    developing: '冲洗中',
    scoring: '待评价',
    completed: '已完成',
    archived: '已归档'
  };

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

  const filmTypeOptions = [
    { value: 'any', label: '不限' },
    { value: 'bw', label: '黑白' },
    { value: 'color', label: '彩色' }
  ];

  const isoOptions = [
    { value: 'any', label: '不限' },
    { value: 'low', label: '低感 (≤100)' },
    { value: 'medium', label: '中感 (200-800)' },
    { value: 'high', label: '高感 (≥1600)' }
  ];

  const grainOptions = [
    { value: 'any', label: '不限' },
    { value: 'fine', label: '细腻' },
    { value: 'medium', label: '中等' },
    { value: 'coarse', label: '粗粝' }
  ];

  function createOrder() {
    if (!customerName.trim()) {
      alert('请输入客户姓名');
      return;
    }

    const customer: CustomerInfo = {
      name: customerName.trim(),
      contact: customerContact.trim() || undefined,
      notes: customerNotes.trim() || undefined
    };

    const requirements: OrderRequirements = {
      sceneType,
      targetStyle,
      difficulty,
      preferredFilmType: preferredFilmType as 'bw' | 'color' | 'any',
      preferredIso: preferredIso as 'low' | 'medium' | 'high' | 'any',
      grainPreference: grainPreference as 'fine' | 'medium' | 'coarse' | 'any',
      specialInstructions: specialInstructions.trim() || undefined,
      quantity
    };

    const orderId = gameStore.createOrder(customer, requirements, priority);
    if (orderId) {
      const event = new CustomEvent('orderCreated', { detail: orderId });
      document.dispatchEvent(event);
    }
  }

  function updateOrder() {
    if (!order) return;

    const updates: Partial<DarkroomOrder> = {
      customer: {
        name: customerName.trim(),
        contact: customerContact.trim() || undefined,
        notes: customerNotes.trim() || undefined
      },
      requirements: {
        ...order.requirements,
        sceneType,
        targetStyle,
        difficulty,
        preferredFilmType: preferredFilmType as 'bw' | 'color' | 'any',
        preferredIso: preferredIso as 'low' | 'medium' | 'high' | 'any',
        grainPreference: grainPreference as 'fine' | 'medium' | 'coarse' | 'any',
        specialInstructions: specialInstructions.trim() || undefined,
        quantity
      },
      priority,
      internalNotes: internalNotes.trim() || undefined
    };

    gameStore.updateOrder(order.id, updates);
    
    if (order.status === 'pending') {
      const matchedFilms = gameStore.matchFilms(updates.requirements as OrderRequirements);
      gameStore.updateOrder(order.id, { matchedFilms });
    }
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

  function resetForm() {
    customerName = '';
    customerContact = '';
    customerNotes = '';
    sceneType = 'portrait';
    targetStyle = 'soft';
    difficulty = 2;
    preferredFilmType = 'any';
    preferredIso = 'any';
    grainPreference = 'any';
    specialInstructions = '';
    quantity = 1;
    priority = 'normal';
    internalNotes = '';
  }

  function handleCancel() {
    resetForm();
    const event = new CustomEvent('closeOrderDetail');
    document.dispatchEvent(event);
  }

  function handleDelete() {
    if (!order) return;
    if (confirm('确定要删除这个订单吗？')) {
      gameStore.deleteOrder(order.id);
      const event = new CustomEvent('orderDeleted');
      document.dispatchEvent(event);
    }
  }
</script>

<div class="order-detail-panel">
  <div class="panel-header">
    <h3 class="title">
      {#if isCreating}
        新建委托订单
      {:else if order}
        订单详情
      {:else}
        请选择订单
      {/if}
    </h3>
    {#if !isCreating && order}
      <span
        class="status-badge"
        style="background: {statusColors[order.status]}20; color: {statusColors[order.status]}"
      >
        {statusLabels[order.status]}
      </span>
    {/if}
  </div>

  {#if !order && !isCreating}
    <div class="empty-state">
      <div class="empty-icon">📝</div>
      <p>选择一个订单查看详情</p>
      <p class="empty-hint">或点击"新建"创建新订单</p>
    </div>
  {:else}
    <div class="detail-content">
      {#if order && !isCreating}
        <div class="order-info-bar">
          <div class="info-item">
            <span class="info-label">订单号</span>
            <span class="info-value monospace">{order.orderNumber}</span>
          </div>
          <div class="info-item">
            <span class="info-label">创建时间</span>
            <span class="info-value">{formatDate(order.createdAt)}</span>
          </div>
        </div>
      {/if}

      <div class="form-section">
        <h4 class="section-title">客户信息</h4>
        <div class="form-grid">
          <div class="form-item">
            <label class="form-label">客户姓名 *</label>
            <input
              type="text"
              bind:value={customerName}
              placeholder="请输入客户姓名"
            />
          </div>
          <div class="form-item">
            <label class="form-label">联系方式</label>
            <input
              type="text"
              bind:value={customerContact}
              placeholder="电话/邮箱"
            />
          </div>
        </div>
        <div class="form-item">
          <label class="form-label">客户备注</label>
          <textarea
            bind:value={customerNotes}
            placeholder="客户的特殊要求或偏好..."
            rows="2"
          />
        </div>
      </div>

      <div class="form-section">
        <h4 class="section-title">拍摄需求</h4>
        <div class="form-grid">
          <div class="form-item">
            <label class="form-label">场景类型</label>
            <select bind:value={sceneType}>
              {#each Object.entries(SCENE_TYPE_LABELS) as [value, label]}
                <option value={value}>{label}</option>
              {/each}
            </select>
          </div>
          <div class="form-item">
            <label class="form-label">目标风格</label>
            <select bind:value={targetStyle}>
              {#each Object.entries(TARGET_STYLE_LABELS) as [value, label]}
                <option value={value}>{TARGET_STYLE_ICONS[value]} {label}</option>
              {/each}
            </select>
          </div>
        </div>
        <div class="form-grid">
          <div class="form-item">
            <label class="form-label">难度等级</label>
            <select bind:value={difficulty}>
              {#each [1, 2, 3, 4, 5] as level}
                <option value={level}>⭐{level} - {DIFFICULTY_LABELS[level]}</option>
              {/each}
            </select>
          </div>
          <div class="form-item">
            <label class="form-label">数量</label>
            <input
              type="number"
              bind:value={quantity}
              min="1"
              max="10"
            />
          </div>
        </div>
      </div>

      <div class="form-section">
        <h4 class="section-title">胶片偏好</h4>
        <div class="form-grid">
          <div class="form-item">
            <label class="form-label">胶片类型</label>
            <select bind:value={preferredFilmType}>
              {#each filmTypeOptions as opt}
                <option value={opt.value}>{opt.label}</option>
              {/each}
            </select>
          </div>
          <div class="form-item">
            <label class="form-label">感光度</label>
            <select bind:value={preferredIso}>
              {#each isoOptions as opt}
                <option value={opt.value}>{opt.label}</option>
              {/each}
            </select>
          </div>
        </div>
        <div class="form-item">
          <label class="form-label">颗粒感偏好</label>
          <select bind:value={grainPreference}>
            {#each grainOptions as opt}
              <option value={opt.value}>{opt.label}</option>
            {/each}
          </select>
        </div>
        <div class="form-item">
          <label class="form-label">特殊说明</label>
          <textarea
            bind:value={specialInstructions}
            placeholder="其他特殊要求..."
            rows="3"
          />
        </div>
      </div>

      <div class="form-section">
        <h4 class="section-title">订单设置</h4>
        <div class="form-grid">
          <div class="form-item">
            <label class="form-label">优先级</label>
            <select bind:value={priority}>
              {#each Object.entries(priorityLabels) as [value, label]}
                <option value={value}>{label}</option>
              {/each}
            </select>
          </div>
        </div>
        <div class="form-item">
          <label class="form-label">内部备注</label>
          <textarea
            bind:value={internalNotes}
            placeholder="仅内部可见的备注..."
            rows="2"
          />
        </div>
      </div>

      {#if order && order.selectedFilmId}
        <div class="form-section">
          <h4 class="section-title">已选胶片</h4>
          <div class="selected-film">
            <span class="film-icon">🎞</span>
            <span class="film-name">{getFilmName(order.selectedFilmId)}</span>
          </div>
        </div>
      {/if}

      <div class="form-actions">
        {#if isCreating}
          <button class="btn btn-secondary" on:click={handleCancel}>取消</button>
          <button class="btn btn-primary" on:click={createOrder}>创建订单</button>
        {:else if order}
          <button class="btn btn-danger" on:click={handleDelete}>删除</button>
          <div style="flex: 1"></div>
          <button class="btn btn-secondary" on:click={handleCancel}>关闭</button>
          <button class="btn btn-primary" on:click={updateOrder}>保存修改</button>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .order-detail-panel {
    background: linear-gradient(180deg, rgba(45, 26, 18, 0.5) 0%, rgba(20, 12, 8, 0.6) 100%);
    border: 1px solid rgba(139, 90, 43, 0.2);
    border-radius: 16px;
    padding: 16px;
    backdrop-filter: blur(6px);
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid rgba(139, 90, 43, 0.2);
  }

  .title {
    font-size: 15px;
    font-weight: 600;
    color: #e8c890;
    margin: 0;
    letter-spacing: 1px;
  }

  .status-badge {
    font-size: 11px;
    padding: 4px 12px;
    border-radius: 12px;
    font-weight: 500;
  }

  .detail-content {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .detail-content::-webkit-scrollbar {
    width: 6px;
  }

  .detail-content::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 3px;
  }

  .detail-content::-webkit-scrollbar-thumb {
    background: rgba(139, 90, 43, 0.4);
    border-radius: 3px;
  }

  .order-info-bar {
    display: flex;
    gap: 20px;
    padding: 10px 14px;
    background: rgba(0, 0, 0, 0.25);
    border-radius: 10px;
  }

  .info-item {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .info-label {
    font-size: 10px;
    color: #6a5a45;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .info-value {
    font-size: 13px;
    color: #c8a878;
  }

  .monospace {
    font-family: monospace;
  }

  .form-section {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .section-title {
    font-size: 13px;
    font-weight: 600;
    color: #d4b888;
    margin: 0;
    padding-left: 8px;
    border-left: 3px solid rgba(200, 150, 80, 0.5);
  }

  .form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .form-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .form-label {
    font-size: 11px;
    color: #8a7a5a;
  }

  .form-item input,
  .form-item select,
  .form-item textarea {
    width: 100%;
    padding: 8px 10px;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(139, 90, 43, 0.25);
    border-radius: 8px;
    color: #c8a878;
    font-size: 12px;
    outline: none;
    transition: border-color 0.2s ease;
    box-sizing: border-box;
    font-family: inherit;
  }

  .form-item input:focus,
  .form-item select:focus,
  .form-item textarea:focus {
    border-color: rgba(200, 150, 80, 0.5);
  }

  .form-item input::placeholder,
  .form-item textarea::placeholder {
    color: #6a5a45;
  }

  .form-item textarea {
    resize: vertical;
    min-height: 50px;
  }

  .form-item select {
    cursor: pointer;
  }

  .selected-film {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    background: rgba(200, 150, 80, 0.1);
    border: 1px solid rgba(200, 150, 80, 0.3);
    border-radius: 10px;
  }

  .film-icon {
    font-size: 20px;
  }

  .film-name {
    font-size: 13px;
    color: #e8c890;
    font-weight: 500;
  }

  .form-actions {
    display: flex;
    gap: 10px;
    padding-top: 16px;
    border-top: 1px solid rgba(139, 90, 43, 0.2);
    margin-top: auto;
  }

  .btn {
    padding: 10px 20px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    border: none;
    transition: all 0.2s ease;
  }

  .btn-primary {
    background: linear-gradient(135deg, #c8a878, #a08050);
    color: #1a1008;
  }

  .btn-primary:hover {
    background: linear-gradient(135deg, #d4b888, #b09060);
    transform: translateY(-1px);
  }

  .btn-secondary {
    background: rgba(139, 90, 43, 0.2);
    color: #a89878;
    border: 1px solid rgba(139, 90, 43, 0.3);
  }

  .btn-secondary:hover {
    background: rgba(139, 90, 43, 0.3);
  }

  .btn-danger {
    background: rgba(200, 80, 80, 0.15);
    color: #e08080;
    border: 1px solid rgba(200, 80, 80, 0.3);
  }

  .btn-danger:hover {
    background: rgba(200, 80, 80, 0.25);
  }

  .empty-state {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #6a5a45;
    text-align: center;
    padding: 40px 20px;
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
