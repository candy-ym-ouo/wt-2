<script lang="ts">
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  import { gameStore } from '../stores/gameStore';
  import { SHOP_TAB_LABELS, SHOP_TAB_ICONS, EMPLOYEE_ROLE_LABELS, EMPLOYEE_STATUS_LABELS, SUPPLY_TYPE_LABELS, FACILITY_TYPE_LABELS, FINANCE_CATEGORY_LABELS, REPUTATION_REVIEW_TAGS, CUSTOMER_NAMES } from '../data/gameData';
  import type { ShopManagementTab, ShopOrder, Employee, SupplyItem, Facility, FinanceRecord, ReputationReview } from '../types/game';

  const dispatch = createEventDispatcher<{ close: void }>();

  $: shop = $gameStore.shopManagement;
  $: activeTab = shop.activeTab;
  $: shopName = shop.shopName;
  $: shopLevel = shop.shopLevel;
  $: shopExperience = shop.shopExperience;
  $: shopReputation = shop.shopReputation;
  $: maxReputation = shop.maxReputation;
  $: isOpen = shop.isOpen;
  $: isPaused = shop.isPaused;
  $: dayNumber = shop.dayNumber;
  $: gameSpeed = shop.gameSpeed;
  $: employees = shop.employees;
  $: supplies = shop.supplies;
  $: facilities = shop.facilities;
  $: financeRecords = shop.financeRecords;
  $: reputationReviews = shop.reputationReviews;
  $: autoManageOrders = shop.autoManageOrders;
  $: finances = shop.finances;
  $: statistics = shop.statistics;
  $: selectedEmployeeId = shop.selectedEmployeeId;
  $: selectedFacilityId = shop.selectedFacilityId;
  $: selectedSupplyId = shop.selectedSupplyId;
  $: priceMultiplier = shop.priceMultiplier;
  $: marketingBudget = shop.marketingBudget;

  $: expToNextLevel = shopLevel * 1000;
  $: expProgress = (shopExperience / expToNextLevel) * 100;
  $: reputationPercent = (shopReputation / maxReputation) * 100;

  $: pendingOrders = autoManageOrders.filter(o => o.status === 'pending');
  $: inProgressOrders = autoManageOrders.filter(o => o.status === 'in_progress');
  $: completedOrders = autoManageOrders.filter(o => o.status === 'completed');

  $: selectedEmployee = employees.find(e => e.id === selectedEmployeeId) ?? null;
  $: selectedSupply = supplies.find(s => s.id === selectedSupplyId) ?? null;
  $: selectedFacility = facilities.find(f => f.id === selectedFacilityId) ?? null;

  let gameLoopInterval: number | null = null;
  let hireModalOpen = false;
  let hireRole: Employee['role'] = 'developer';
  let hireName = '';
  let purchaseModalOpen = false;
  let purchaseQuantity = 10;

  const TABS: { key: ShopManagementTab; label: string; icon: string }[] = [
    { key: 'overview', label: '经营总览', icon: '📊' },
    { key: 'orders', label: '订单管理', icon: '📋' },
    { key: 'employees', label: '员工管理', icon: '👥' },
    { key: 'supplies', label: '耗材管理', icon: '📦' },
    { key: 'facilities', label: '设施管理', icon: '🏭' },
    { key: 'finance', label: '财务报表', icon: '💰' },
    { key: 'reputation', label: '顾客评价', icon: '⭐' }
  ];

  onMount(() => {
    startGameLoop();
  });

  onDestroy(() => {
    stopGameLoop();
  });

  function startGameLoop() {
    stopGameLoop();
    gameLoopInterval = window.setInterval(() => {
      if (isOpen && !isPaused) {
        gameStore.generateShopOrder();
        
        autoManageOrders.forEach(order => {
          if (order.status === 'in_progress' && order.startedAt && order.estimatedDuration) {
            const elapsed = Date.now() - order.startedAt;
            if (elapsed >= order.estimatedDuration) {
              gameStore.completeShopOrder(order.id);
            }
          }
        });
      }
    }, 3000 / gameSpeed);
  }

  function stopGameLoop() {
    if (gameLoopInterval) {
      clearInterval(gameLoopInterval);
      gameLoopInterval = null;
    }
  }

  function setTab(tab: ShopManagementTab) {
    gameStore.setShopTab(tab);
  }

  function toggleOpen() {
    gameStore.toggleShopOpen();
    startGameLoop();
  }

  function togglePause() {
    gameStore.toggleShopPause();
  }

  function setSpeed(speed: number) {
    gameStore.setGameSpeed(speed);
    startGameLoop();
  }

  function selectEmployee(employeeId: string | null) {
    gameStore.selectEmployee(employeeId);
  }

  function trainEmployee(employeeId: string, skillId: string) {
    gameStore.trainEmployee(employeeId, skillId);
  }

  function openHireModal() {
    hireModalOpen = true;
    hireRole = 'developer';
    hireName = '';
  }

  function closeHireModal() {
    hireModalOpen = false;
  }

  function hireEmployee() {
    if (!hireName.trim()) return;
    gameStore.hireEmployee(hireRole, hireName.trim());
    closeHireModal();
  }

  function fireEmployee(employeeId: string) {
    if (confirm('确定要解雇这名员工吗？')) {
      gameStore.fireEmployee(employeeId);
    }
  }

  function selectSupply(supplyId: string | null) {
    gameStore.selectSupply(supplyId);
  }

  function openPurchaseModal() {
    if (!selectedSupplyId) return;
    purchaseModalOpen = true;
    purchaseQuantity = 10;
  }

  function closePurchaseModal() {
    purchaseModalOpen = false;
  }

  function purchaseSupply() {
    if (!selectedSupplyId || purchaseQuantity <= 0) return;
    gameStore.purchaseSupply(selectedSupplyId, purchaseQuantity);
    closePurchaseModal();
  }

  function selectFacility(facilityId: string | null) {
    gameStore.selectFacility(facilityId);
  }

  function upgradeFacility(facilityId: string) {
    gameStore.upgradeFacility(facilityId);
  }

  function maintainFacility(facilityId: string) {
    gameStore.maintainFacility(facilityId);
  }

  function unlockFacility(facilityId: string) {
    gameStore.unlockFacility(facilityId);
  }

  function assignOrder(orderId: string, employeeId: string) {
    gameStore.assignOrderToEmployee(orderId, employeeId);
  }

  function handlePriceMultiplier(e: Event) {
    const target = e.target as HTMLInputElement;
    gameStore.setPriceMultiplier(parseFloat(target.value));
  }

  function handleMarketingBudget(e: Event) {
    const target = e.target as HTMLInputElement;
    gameStore.setMarketingBudget(parseInt(target.value));
  }

  function handleAssignOrder(e: Event, orderId: string) {
    const target = e.target as HTMLSelectElement;
    gameStore.assignOrderToEmployee(orderId, target.value);
  }

  function newDay() {
    gameStore.newDay();
  }

  function paySalaries() {
    gameStore.paySalaries();
  }

  function getStatusColor(status: ShopOrder['status']): string {
    const colors: Record<string, string> = {
      pending: '#f59e0b',
      in_progress: '#3b82f6',
      completed: '#10b981'
    };
    return colors[status] || '#6b7280';
  }

  function getStatusLabel(status: ShopOrder['status']): string {
    const labels: Record<string, string> = {
      pending: '待处理',
      in_progress: '处理中',
      completed: '已完成'
    };
    return labels[status] || status;
  }

  function getPriorityColor(priority: ShopOrder['priority']): string {
    const colors: Record<string, string> = {
      low: '#6b7280',
      normal: '#3b82f6',
      urgent: '#ef4444'
    };
    return colors[priority] || '#6b7280';
  }

  function getPriorityLabel(priority: ShopOrder['priority']): string {
    const labels: Record<string, string> = {
      low: '低',
      normal: '普通',
      urgent: '紧急'
    };
    return labels[priority] || priority;
  }

  function getRatingStars(rating: number): string {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  }

  function formatMoney(amount: number): string {
    return `¥${amount.toLocaleString()}`;
  }

  function formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function getConditionColor(condition: number): string {
    if (condition >= 80) return '#10b981';
    if (condition >= 50) return '#f59e0b';
    return '#ef4444';
  }

  function getStockColor(current: number, min: number): string {
    if (current <= min * 0.5) return '#ef4444';
    if (current <= min) return '#f59e0b';
    return '#10b981';
  }

  function getAvailableEmployees(): Employee[] {
    return employees.filter(e => e.status === 'idle' && e.role !== 'receptionist');
  }
</script>

<div class="shop-overlay" on:click|self={() => dispatch('close')}>
  <div class="shop-container">
    <div class="shop-header">
      <div class="shop-title">
      <h2>🏪 {shopName}</h2>
      <div class="shop-meta">
        <span class="shop-level">Lv.{shopLevel}</span>
        <div class="exp-bar">
          <div class="exp-fill" style="width: {Math.min(expProgress, 100)}%"></div>
        </div>
        <span class="exp-text">{shopExperience}/{expToNextLevel}</span>
      </div>
      </div>
      <div class="shop-stats">
        <div class="stat-item">
          <span class="stat-icon">⭐</span>
          <div class="stat-info">
            <span class="stat-label">口碑</span>
            <span class="stat-value">{shopReputation}/{maxReputation}</span>
          </div>
          <div class="reputation-bar">
            <div class="reputation-fill" style="width: {reputationPercent}%"></div>
          </div>
        </div>
        <div class="stat-item">
          <span class="stat-icon">💰</span>
          <span class="stat-value">{formatMoney(finances.cash)}</span>
        </div>
        <div class="stat-item">
          <span class="stat-icon">📅</span>
          <span class="stat-value">第 {dayNumber} 天</span>
        </div>
      </div>
      <div class="shop-controls">
        <button class="btn-primary" class:btn-active={isOpen} on:click={toggleOpen}>
          {isOpen ? '🔴 打烊' : '🟢 营业'}
        </button>
        <button class="btn-secondary" on:click={togglePause} disabled={!isOpen}>
          {isPaused ? '▶️ 继续' : '⏸️ 暂停'}
        </button>
        <div class="speed-controls">
          <button class="speed-btn" class:active={gameSpeed === 1} on:click={() => setSpeed(1)}>1x</button>
          <button class="speed-btn" class:active={gameSpeed === 2} on:click={() => setSpeed(2)}>2x</button>
          <button class="speed-btn" class:active={gameSpeed === 3} on:click={() => setSpeed(3)}>3x</button>
        </div>
        <button class="btn-close" on:click={() => dispatch('close')}>✕</button>
      </div>
    </div>

    <div class="shop-tabs">
      {#each TABS as tab}
        <button
          class="tab-btn"
          class:active={activeTab === tab.key}
          on:click={() => setTab(tab.key)}
        >
          <span class="tab-icon">{tab.icon}</span>
          <span class="tab-label">{tab.label}</span>
        </button>
      {/each}
    </div>

    <div class="shop-content">
      {#if activeTab === 'overview'}
        <div class="overview-panel">
          <div class="overview-grid">
            <div class="overview-card">
              <h3>📊 经营数据</h3>
              <div class="stat-row">
                <span>总订单数</span>
                <span class="stat-highlight">{statistics.totalOrders}</span>
              </div>
              <div class="stat-row">
                <span>已完成</span>
                <span class="stat-highlight">{statistics.completedOrders}</span>
              </div>
              <div class="stat-row">
                <span>总收入</span>
                <span class="stat-income">{formatMoney(statistics.totalRevenue)}</span>
              </div>
              <div class="stat-row">
                <span>总支出</span>
                <span class="stat-expense">{formatMoney(statistics.totalExpenses)}</span>
              </div>
              <div class="stat-row total-row">
                <span>净利润</span>
                <span class={statistics.netProfit >= 0 ? 'stat-income' : 'stat-expense'}>{formatMoney(statistics.netProfit)}</span>
              </div>
              <div class="stat-row">
                <span>平均评分</span>
                <span>{statistics.avgCustomerRating.toFixed(1)} ★</span>
              </div>
            </div>

            <div class="overview-card">
              <h3>⚙️ 经营设置</h3>
              <div class="setting-row">
                <label>定价倍率</label>
                <input type="range" min="0.5" max="2" step="0.1" value={priceMultiplier} on:input={handlePriceMultiplier}>
                <span>{priceMultiplier.toFixed(1)}x</span>
              </div>
              <div class="setting-row">
                <label>营销预算/天</label>
                <input type="range" min="0" max="2000" step="100" value={marketingBudget} on:input={handleMarketingBudget}>
                <span>{formatMoney(marketingBudget)}</span>
              </div>
              <div class="action-buttons">
                <button class="btn-action" on:click={paySalaries}>💼 发放薪资</button>
                <button class="btn-action" on:click={newDay}>🌅 新的一天</button>
              </div>
            </div>

            <div class="overview-card">
              <h3>📋 待处理订单</h3>
              {#if pendingOrders.length === 0}
                <p class="empty-text">暂无待处理订单</p>
              {:else}
                <div class="mini-order-list">
                  {#each pendingOrders.slice(0, 5) as order}
                    <div class="mini-order-item">
                      <span class="order-num">{order.orderNumber}</span>
                      <span class="order-type">{order.orderTypeLabel}</span>
                      <span class="order-price">{formatMoney(order.totalPrice)}</span>
                    </div>
                  {/each}
                </div>
              {/if}
            </div>

            <div class="overview-card">
              <h3>👥 员工状态</h3>
              <div class="employee-status-list">
                {#each employees as employee}
                  <div class="employee-status-item">
                    <span class="emp-avatar">{employee.avatar}</span>
                    <div class="emp-info">
                      <span class="emp-name">{employee.name}</span>
                      <span class="emp-role">{EMPLOYEE_ROLE_LABELS[employee.role]}</span>
                    </div>
                    <span class="emp-status status-{employee.status}">{EMPLOYEE_STATUS_LABELS[employee.status]}</span>
                  </div>
                {/each}
              </div>
            </div>
          </div>
        </div>

      {:else if activeTab === 'orders'}
        <div class="orders-panel">
          <div class="orders-tabs">
            <button class="sub-tab-btn" class:active={true}>全部 ({autoManageOrders.length})</button>
            <button class="sub-tab-btn">待处理 ({pendingOrders.length})</button>
            <button class="sub-tab-btn">处理中 ({inProgressOrders.length})</button>
            <button class="sub-tab-btn">已完成 ({completedOrders.length})</button>
          </div>
          <div class="orders-list">
            {#if autoManageOrders.length === 0}
              <p class="empty-text">暂无订单</p>
            {:else}
              {#each autoManageOrders as order}
                <div class="order-card" class:selected={selectedEmployeeId && order.status === 'pending'}>
                  <div class="order-header">
                    <span class="order-number">{order.orderNumber}</span>
                    <span class="order-priority" style="background: {getPriorityColor(order.priority)}">{getPriorityLabel(order.priority)}</span>
                    <span class="order-status" style="background: {getStatusColor(order.status)}">{getStatusLabel(order.status)}</span>
                  </div>
                  <div class="order-body">
                    <div class="order-info">
                      <p><strong>顾客:</strong> {order.customerName}</p>
                      <p><strong>服务:</strong> {order.orderTypeLabel}</p>
                      <p><strong>胶片:</strong> {order.filmType} x{order.quantity}</p>
                    </div>
                    <div class="order-details">
                      <p><strong>价格:</strong> <span class="price">{formatMoney(order.totalPrice)}</span></p>
                      <p><strong>品质目标:</strong> {order.qualityTarget}分</p>
                      <p><strong>创建时间:</strong> {formatDate(order.createdAt)}</p>
                    </div>
                  </div>
                  <div class="order-footer">
                    {#if order.status === 'pending'}
                      <div class="order-actions">
                        <select bind:value={selectedEmployeeId} on:change={(e) => handleAssignOrder(e, order.id)}>
                          <option value="">选择员工...</option>
                          {#each getAvailableEmployees() as emp}
                            <option value={emp.id}>{emp.name} - {EMPLOYEE_ROLE_LABELS[emp.role]}</option>
                          {/each}
                        </select>
                      </div>
                    {:else if order.status === 'in_progress'}
                      <p class="processing-info">
                        正在由 <strong>{employees.find(e => e.id === order.assignedEmployeeId)?.name}</strong> 处理中...
                      </p>
                    {:else}
                      <div class="completed-info">
                        <span>最终品质: {order.finalQuality}分</span>
                        <span>完成时间: {order.completedAt ? formatDate(order.completedAt) : '-'}</span>
                      </div>
                    {/if}
                  </div>
                </div>
              {/each}
            {/if}
          </div>
        </div>

      {:else if activeTab === 'employees'}
        <div class="employees-panel">
        <div class="employees-header">
          <h3>员工管理</h3>
          <button class="btn-primary" on:click={openHireModal}>➕ 招聘员工</button>
        </div>
        <div class="employees-grid">
          {#each employees as employee}
            <div class="employee-card" class:selected={selectedEmployeeId === employee.id} on:click={() => selectEmployee(employee.id)}>
              <div class="employee-avatar">{employee.avatar}</div>
              <div class="employee-info">
                <h4>{employee.name}</h4>
                <p class="employee-role">{EMPLOYEE_ROLE_LABELS[employee.role]} · Lv.{employee.level}</p>
                <p class="employee-salary">薪资: {formatMoney(employee.salary)}/天</p>
                <div class="employee-status-badge status-{employee.status}">{EMPLOYEE_STATUS_LABELS[employee.status]}</div>
              </div>
              <div class="employee-skills">
                {#each employee.skills as skill}
                  <div class="skill-item">
                  <span class="skill-name">{skill.name}</span>
                  <div class="skill-level">
                    <span class="skill-bar" style="width: {(skill.level / skill.maxLevel) * 100}%"></span>
                  </div>
                  <span class="skill-lvl">{skill.level}/{skill.maxLevel}</span>
                </div>
                {/each}
              </div>
              {#if selectedEmployeeId === employee.id}
                <div class="employee-actions">
                  {#each employee.skills as skill}
                    {#if skill.level < skill.maxLevel}
                      <button class="btn-train" on:click|stopPropagation={() => trainEmployee(employee.id, skill.id)}>
                        培训 {skill.name} (¥500)
                      </button>
                    {/if}
                  {/each}
                  <button class="btn-fire" on:click|stopPropagation={() => fireEmployee(employee.id)}>
                    解雇
                  </button>
                </div>
              {/if}
            </div>
          {/each}
        </div>
        </div>

      {:else if activeTab === 'supplies'}
        <div class="supplies-panel">
          <h3>耗材库存</h3>
          <div class="supplies-grid">
            {#each supplies as supply}
              <div class="supply-card" class:selected={selectedSupplyId === supply.id} on:click={() => selectSupply(supply.id)}>
                <div class="supply-header">
                  <h4>{supply.name}</h4>
                  <span class="supply-type">{SUPPLY_TYPE_LABELS[supply.type]}</span>
                </div>
                <div class="supply-stock">
                  <span class="stock-label">库存</span>
                  <span class="stock-value" style="color: {getStockColor(supply.currentStock, supply.minStock)}">
                    {supply.currentStock} {supply.unit}
                  </span>
                  {#if supply.currentStock <= supply.minStock}
                    <span class="stock-warning">⚠️ 库存不足</span>
                  {/if}
                </div>
                <div class="supply-info">
                  <p>单价: {formatMoney(supply.unitCost)}</p>
                  <p>最低库存: {supply.minStock} {supply.unit}</p>
                  <p>供应商: {supply.supplier}</p>
                </div>
                {#if selectedSupplyId === supply.id}
                  <div class="supply-actions">
                    <button class="btn-action" on:click|stopPropagation={openPurchaseModal}>
                      🛒 采购
                    </button>
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        </div>

      {:else if activeTab === 'facilities'}
        <div class="facilities-panel">
          <h3>设施管理</h3>
          <div class="facilities-grid">
            {#each facilities as facility}
              <div class="facility-card" class:selected={selectedFacilityId === facility.id} on:click={() => selectFacility(facility.id)}>
                <div class="facility-icon">{facility.icon}</div>
                <div class="facility-info">
                  <h4>{facility.name}</h4>
                  <p class="facility-type">{FACILITY_TYPE_LABELS[facility.type]} · Lv.{facility.level}/{facility.maxLevel}</p>
                  <p class="facility-desc">{facility.description}</p>
                  <div class="facility-effect">
                    <strong>效果:</strong> +{(facility.effect.value * 100).toFixed(0)}% {facility.effect.type.replace(/_/g, ' ')}
                  </div>
                  <div class="facility-condition">
                    <span>状态: </span>
                    <div class="condition-bar">
                      <div class="condition-fill" style="width: {facility.condition}%; background: {getConditionColor(facility.condition)}"></div>
                    </div>
                    <span>{facility.condition}%</span>
                  </div>
                </div>
                {#if !facility.isUnlocked}
                  <div class="facility-locked">
                    <p>🔒 未解锁</p>
                    <button class="btn-action" on:click|stopPropagation={() => unlockFacility(facility.id)}>
                      解锁 ({formatMoney(facility.baseCost)})</button>
                  </div>
                {:else if selectedFacilityId === facility.id}
                  <div class="facility-actions">
                    {#if facility.level < facility.maxLevel}
                      <button class="btn-action" on:click|stopPropagation={() => upgradeFacility(facility.id)}>
                        ⬆️ 升级 ({formatMoney(facility.upgradeCost * facility.level)})
                      </button>
                    {/if}
                    <button class="btn-action" on:click|stopPropagation={() => maintainFacility(facility.id)}>
                      🔧 维护 ({formatMoney(facility.maintenanceCost)})
                    </button>
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        </div>

      {:else if activeTab === 'finance'}
        <div class="finance-panel">
          <h3>财务报表</h3>
          <div class="finance-summary">
            <div class="finance-card income">
              <h4>总收入</h4>
              <p class="finance-amount">{formatMoney(statistics.totalRevenue)}</p>
            </div>
            <div class="finance-card expense">
              <h4>总支出</h4>
              <p class="finance-amount">{formatMoney(statistics.totalExpenses)}</p>
            </div>
            <div class="finance-card {statistics.netProfit >= 0 ? 'profit' : 'loss'}">
              <h4>净利润</h4>
              <p class="finance-amount">{formatMoney(statistics.netProfit)}</p>
            </div>
          </div>
          <div class="finance-records">
            <h4>交易记录</h4>
            {#if financeRecords.length === 0}
              <p class="empty-text">暂无交易记录</p>
            {:else}
              <div class="records-list">
                {#each financeRecords.slice(0, 50) as record}
                  <div class="record-item">
                    <div class="record-info">
                      <span class="record-category">{FINANCE_CATEGORY_LABELS[record.category]}</span>
                      <span class="record-desc">{record.description}</span>
                      <span class="record-date">{formatDate(record.timestamp)}</span>
                    </div>
                    <span class="record-amount {record.type === 'income' ? 'income' : 'expense'}">
                      {record.type === 'income' ? '+' : '-'}{formatMoney(record.amount)}
                    </span>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        </div>

      {:else if activeTab === 'reputation'}
        <div class="reputation-panel">
          <div class="reputation-header">
            <h3>顾客评价</h3>
            <div class="reputation-overview">
              <div class="avg-rating">
                <span class="rating-stars">{getRatingStars(Math.round(statistics.avgCustomerRating))}</span>
                <span class="rating-value">{statistics.avgCustomerRating.toFixed(1)}</span>
              </div>
              <p>共 {reputationReviews.length} 条评价</p>
            </div>
          </div>
          <div class="reviews-list">
            {#if reputationReviews.length === 0}
              <p class="empty-text">暂无顾客评价</p>
            {:else}
              {#each reputationReviews as review}
                <div class="review-card">
                  <div class="review-header">
                    <span class="review-customer">{review.customerName}</span>
                    <span class="review-rating">{getRatingStars(review.rating)}</span>
                    <span class="review-date">{formatDate(review.timestamp)}</span>
                  </div>
                  <p class="review-comment">{review.comment}</p>
                  <div class="review-tags">
                    {#each review.tags as tag}
                      <span class="review-tag">{tag}</span>
                    {/each}
                  </div>
                  <div class="review-quality">
                    <span>品质评分: {review.qualityScore}分</span>
                  </div>
                </div>
              {/each}
            {/if}
          </div>
        </div>
      {/if}
    </div>
  </div>

  {#if hireModalOpen}
    <div class="modal-overlay" on:click|self={closeHireModal}>
      <div class="modal-content">
        <h3>招聘新员工</h3>
        <div class="form-group">
          <label>职位</label>
          <select bind:value={hireRole}>
            <option value="developer">显影技师</option>
            <option value="assistant">助理技师</option>
            <option value="receptionist">前台接待</option>
            <option value="manager">店长</option>
          </select>
        </div>
        <div class="form-group">
          <label>姓名</label>
          <input type="text" bind:value={hireName} placeholder="请输入员工姓名">
        </div>
        <p class="hire-cost">招聘费用: ¥1,000</p>
        <div class="modal-actions">
          <button class="btn-secondary" on:click={closeHireModal}>取消</button>
          <button class="btn-primary" on:click={hireEmployee}>确认招聘</button>
        </div>
      </div>
    </div>
  {/if}

  {#if purchaseModalOpen && selectedSupply}
    <div class="modal-overlay" on:click|self={closePurchaseModal}>
      <div class="modal-content">
        <h3>采购耗材</h3>
        <p>采购: {selectedSupply.name}</p>
        <p>单价: {formatMoney(selectedSupply.unitCost)}</p>
        <div class="form-group">
          <label>采购数量</label>
          <input type="number" bind:value={purchaseQuantity} min="1">
        </div>
        <p class="total-cost">总价: {formatMoney(selectedSupply.unitCost * purchaseQuantity)}</p>
        <div class="modal-actions">
          <button class="btn-secondary" on:click={closePurchaseModal}>取消</button>
          <button class="btn-primary" on:click={purchaseSupply}>确认采购</button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .shop-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    z-index: 1000;
  }

  .shop-container {
    background: linear-gradient(135deg, #1a0f0a 0%, #2d1810 100%);
    border: 2px solid #8b5a2b;
    border-radius: 16px;
    width: 100%;
    max-width: 1200px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  }

  .shop-header {
    padding: 20px 24px;
    background: linear-gradient(135deg, #2d1810 0%, #3d2015 100%);
    border-bottom: 1px solid #8b5a2b;
    display: flex;
    align-items: center;
    gap: 20px;
  }

  .shop-title {
    flex: 1;
  }

  .shop-title h2 {
    margin: 0 0 8px 0;
    color: #e8dcc4;
    font-size: 24px;
  }

  .shop-meta {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .shop-level {
    background: linear-gradient(135deg, #d4a574 0%, #8b5a2b 100%);
    color: #1a0f0a;
    padding: 4px 12px;
    border-radius: 12px;
    font-weight: bold;
    font-size: 14px;
  }

  .exp-bar {
    flex: 1;
    height: 8px;
    background: #3d2015;
    border-radius: 4px;
    overflow: hidden;
    max-width: 150px;
  }

  .exp-fill {
    height: 100%;
    background: linear-gradient(90deg, #d4a574 0%, #f0c080 100%);
    transition: width 0.3s ease;
  }

  .exp-text {
    color: #a08060;
    font-size: 12px;
    min-width: 80px;
  }

  .shop-stats {
    display: flex;
    gap: 20px;
  }

  .stat-item {
    display: flex;
    align-items: center;
    gap: 8px;
    background: rgba(0, 0, 0, 0.3);
    padding: 8px 16px;
    border-radius: 8px;
    border: 1px solid #5a3a20;
  }

  .stat-icon {
    font-size: 20px;
  }

  .stat-info {
    display: flex;
    flex-direction: column;
  }

  .stat-label {
    font-size: 11px;
    color: #a08060;
  }

  .stat-value {
    color: #e8dcc4;
    font-weight: bold;
  }

  .reputation-bar {
    width: 60px;
    height: 6px;
    background: #3d2015;
    border-radius: 3px;
    overflow: hidden;
  }

  .reputation-fill {
    height: 100%;
    background: linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%);
    transition: width 0.3s ease;
  }

  .shop-controls {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .btn-primary, .btn-secondary, .btn-action, .btn-close {
    padding: 8px 16px;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.2s ease;
  }

  .btn-primary {
    background: linear-gradient(135deg, #d4a574 0%, #8b5a2b 100%);
    color: #1a0f0a;
  }

  .btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(212, 165, 116, 0.4);
  }

  .btn-primary.btn-active {
    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    color: white;
  }

  .btn-secondary {
    background: #3d2015;
    color: #e8dcc4;
    border: 1px solid #8b5a2b;
  }

  .btn-secondary:hover:not(:disabled) {
    background: #5a3a20;
  }

  .btn-secondary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-action {
    background: linear-gradient(135deg, #d4a574 0%, #8b5a2b 100%);
    color: #1a0f0a;
    padding: 6px 12px;
    font-size: 13px;
  }

  .btn-close {
    background: transparent;
    color: #a08060;
    font-size: 20px;
    padding: 4px 12px;
  }

  .btn-close:hover {
    color: #e8dcc4;
  }

  .speed-controls {
    display: flex;
    gap: 4px;
    background: rgba(0, 0, 0, 0.3);
    padding: 4px;
    border-radius: 6px;
  }

  .speed-btn {
    background: transparent;
    border: none;
    color: #a08060;
    padding: 4px 8px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
  }

  .speed-btn.active {
    background: #d4a574;
    color: #1a0f0a;
  }

  .shop-tabs {
    display: flex;
    padding: 0 24px;
    background: #1a0f0a;
    border-bottom: 1px solid #5a3a20;
    overflow-x: auto;
  }

  .tab-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 20px;
    background: transparent;
    border: none;
    color: #a08060;
    cursor: pointer;
    font-size: 14px;
    border-bottom: 2px solid transparent;
    transition: all 0.2s ease;
    white-space: nowrap;
  }

  .tab-btn:hover {
    color: #e8dcc4;
  }

  .tab-btn.active {
    color: #d4a574;
    border-bottom-color: #d4a574;
  }

  .tab-icon {
    font-size: 16px;
  }

  .shop-content {
    flex: 1;
    overflow-y: auto;
    padding: 24px;
  }

  .overview-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 20px;
  }

  .overview-card {
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid #5a3a20;
    border-radius: 12px;
    padding: 20px;
  }

  .overview-card h3 {
    margin: 0 0 16px 0;
    color: #d4a574;
    font-size: 18px;
  }

  .stat-row {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    border-bottom: 1px solid #3d2015;
    color: #e8dcc4;
  }

  .stat-row:last-child {
    border-bottom: none;
  }

  .stat-highlight {
    color: #d4a574;
    font-weight: bold;
  }

  .stat-income {
    color: #10b981;
    font-weight: bold;
  }

  .stat-expense {
    color: #ef4444;
    font-weight: bold;
  }

  .total-row {
    border-top: 2px solid #8b5a2b;
    margin-top: 8px 0;
    padding-top: 12px 0;
    font-weight: bold;
  }

  .setting-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
  }

  .setting-row label {
    color: #e8dcc4;
    min-width: 100px;
  }

  .setting-row input[type="range"] {
    flex: 1;
  }

  .action-buttons {
    display: flex;
    gap: 10px;
    margin-top: 16px 0;
  }

  .empty-text {
    color: #6b5a4a;
    text-align: center;
    padding: 20px;
  }

  .mini-order-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .mini-order-item {
    display: flex;
    justify-content: space-between;
    padding: 8px 12px;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 6px;
    font-size: 13px;
  }

  .order-num {
    color: #d4a574;
    font-weight: 500;
  }

  .order-type {
    color: #a08060;
  }

  .order-price {
    color: #10b981;
    font-weight: 500;
  }

  .employee-status-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .employee-status-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 6px;
  }

  .emp-avatar {
    font-size: 24px;
  }

  .emp-info {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .emp-name {
    color: #e8dcc4;
    font-weight: 500;
  }

  .emp-role {
    color: #a08060;
    font-size: 12px;
  }

  .emp-status {
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 11px;
  }

  .status-idle {
    background: #10b981;
    color: white;
  }

  .status-working {
    background: #3b82f6;
    color: white;
  }

  .status-rest {
    background: #6b7280;
    color: white;
  }

  .status-training {
    background: #f59e0b;
    color: white;
  }

  .orders-tabs {
    display: flex;
    gap: 8px;
    margin-bottom: 20px;
  }

  .sub-tab-btn {
    background: transparent;
    border: 1px solid #5a3a20;
    color: #a08060;
    padding: 8px 16px;
    border-radius: 6px;
    cursor: pointer;
  }

  .sub-tab-btn.active {
    background: #8b5a2b;
    color: white;
  }

  .orders-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 16px;
  }

  .order-card {
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid #5a3a20;
    border-radius: 12px;
    padding: 16px;
    transition: all 0.2s ease;
  }

  .order-card.selected {
    border-color: #d4a574;
  }

  .order-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }

  .order-number {
    color: #d4a574;
    font-weight: bold;
  }

  .order-priority, .order-status {
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 11px;
    color: white;
  }

  .order-body {
    display: flex;
    justify-content: space-between;
    margin-bottom: 12px;
  }

  .order-info p, .order-details p {
    margin: 4px 0;
    color: #e8dcc4;
    font-size: 13px;
  }

  .order-info strong, .order-details strong {
    color: #a08060;
  }

  .price {
    color: #10b981;
    font-weight: bold;
  }

  .order-footer {
    border-top: 1px solid #3d2015;
    padding-top: 12px;
  }

  .order-actions select {
    width: 100%;
    padding: 8px;
    background: #1a0f0a;
    border: 1px solid #5a3a20;
    border-radius: 6px;
    color: #e8dcc4;
  }

  .processing-info {
    color: #a08060;
    font-size: 13px;
  }

  .completed-info {
    display: flex;
    justify-content: space-between;
    color: #10b981;
    font-size: 13px;
  }

  .employees-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }

  .employees-header h3 {
    margin: 0;
    color: #d4a574;
  }

  .employees-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
    gap: 16px;
  }

  .employee-card {
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid #5a3a20;
    border-radius: 12px;
    padding: 16px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .employee-card.selected {
    border-color: #d4a574;
  }

  .employee-avatar {
    font-size: 48px;
    text-align: center;
    margin-bottom: 12px;
  }

  .employee-info h4 {
    margin: 0 0 4px 0;
    color: #e8dcc4;
  }

  .employee-role {
    color: #a08060;
    margin: 4px 0;
  }

  .employee-salary {
    color: #10b981;
    margin: 4px 0;
  }

  .employee-status-badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 11px;
    color: white;
  }

  .employee-skills {
    margin-top: 12px 0;
  }

  .skill-item {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }

  .skill-name {
    width: 80px;
    color: #a08060;
    font-size: 12px;
  }

  .skill-level {
    flex: 1;
    height: 6px;
    background: #3d2015;
    border-radius: 3px;
    overflow: hidden;
  }

  .skill-bar {
    height: 100%;
    background: linear-gradient(90deg, #d4a574 0%, #f0c080 100%);
    transition: width 0.3s ease;
  }

  .skill-lvl {
    width: 40px;
    text-align: right;
    color: #e8dcc4;
    font-size: 11px;
  }

  .employee-actions {
    margin-top: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .btn-train {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: white;
    border: none;
    padding: 8px 12px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 13px;
  }

  .btn-fire {
    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    color: white;
    border: none;
    padding: 8px 12px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 13px;
  }

  .supplies-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 16px;
  }

  .supply-card {
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid #5a3a20;
    border-radius: 12px;
    padding: 16px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .supply-card.selected {
    border-color: #d4a574;
  }

  .supply-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }

  .supply-header h4 {
    margin: 0;
    color: #e8dcc4;
  }

  .supply-type {
    background: #5a3a20;
    color: #d4a574;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 11px;
  }

  .supply-stock {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
  }

  .stock-label {
    color: #a08060;
  }

  .stock-value {
    font-weight: bold;
    font-size: 18px;
  }

  .stock-warning {
    color: #ef4444;
    font-size: 12px;
  }

  .supply-info p {
    margin: 4px 0;
    color: #a08060;
    font-size: 13px;
  }

  .supply-actions {
    margin-top: 12px;
  }

  .facilities-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
    gap: 16px;
  }

  .facility-card {
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid #5a3a20;
    border-radius: 12px;
    padding: 16px;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    gap: 16px;
  }

  .facility-card.selected {
    border-color: #d4a574;
  }

  .facility-icon {
    font-size: 48px;
  }

  .facility-info {
    flex: 1;
  }

  .facility-info h4 {
    margin: 0 0 4px 0;
    color: #e8dcc4;
  }

  .facility-type {
    color: #a08060;
    margin: 4px 0;
  }

  .facility-desc {
    color: #887766;
    font-size: 13px;
    margin: 8px 0;
  }

  .facility-effect {
    color: #10b981;
    margin: 8px 0;
    font-size: 13px;
  }

  .facility-condition {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 8px 0;
  }

  .condition-bar {
    flex: 1;
    height: 6px;
    background: #3d2015;
    border-radius: 3px;
    overflow: hidden;
  }

  .condition-fill {
    height: 100%;
    transition: width 0.3s ease;
  }

  .facility-locked {
    text-align: center;
    padding: 12px 0;
  }

  .facility-actions {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 12px 0;
  }

  .finance-summary {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
    margin-bottom: 24px;
  }

  .finance-card {
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid #5a3a20;
    border-radius: 12px;
    padding: 20px;
    text-align: center;
  }

  .finance-card.income {
    border-color: #10b981;
  }

  .finance-card.expense {
    border-color: #ef4444;
  }

  .finance-card.profit {
    border-color: #10b981;
  }

  .finance-card.loss {
    border-color: #ef4444;
  }

  .finance-card h4 {
    margin: 0 0 8px 0;
    color: #a08060;
  }

  .finance-amount {
    font-size: 28px;
    font-weight: bold;
    color: #e8dcc4;
  }

  .finance-card.income .finance-amount {
    color: #10b981;
  }

  .finance-card.expense .finance-amount {
    color: #ef4444;
  }

  .finance-card.profit .finance-amount {
    color: #10b981;
  }

  .finance-card.loss .finance-amount {
    color: #ef4444;
  }

  .records-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .record-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 8px;
  }

  .record-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .record-category {
    color: #d4a574;
    font-weight: 500;
  }

  .record-desc {
    color: #e8dcc4;
  }

  .record-date {
    color: #a08060;
    font-size: 12px;
  }

  .record-amount.income {
    color: #10b981;
    font-weight: bold;
  }

  .record-amount.expense {
    color: #ef4444;
    font-weight: bold;
  }

  .reputation-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }

  .reputation-header h3 {
    margin: 0;
    color: #d4a574;
  }

  .reputation-overview {
    text-align: right;
  }

  .avg-rating {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .rating-stars {
    color: #fbbf24;
    font-size: 24px;
  }

  .rating-value {
    color: #e8dcc4;
    font-size: 24px;
    font-weight: bold;
  }

  .reviews-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 16px;
  }

  .review-card {
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid #5a3a20;
    border-radius: 12px;
    padding: 16px;
  }

  .review-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }

  .review-customer {
    color: #e8dcc4;
    font-weight: 500;
  }

  .review-rating {
    color: #fbbf24;
  }

  .review-date {
    color: #a08060;
    font-size: 12px;
  }

  .review-comment {
    color: #e8dcc4;
    margin: 8px 0;
  }

  .review-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin: 8px 0;
  }

  .review-tag {
    background: #5a3a20;
    color: #d4a574;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 11px;
  }

  .review-quality {
    color: #a08060;
    font-size: 13px;
    border-top: 1px solid #3d2015;
    padding-top: 8px;
    margin-top: 8px;
  }

  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
  }

  .modal-content {
    background: linear-gradient(135deg, #1a0f0a 0%, #2d1810 100%);
    border: 2px solid #8b5a2b;
    border-radius: 12px;
    padding: 24px;
    max-width: 400px;
    width: 90%;
  }

  .modal-content h3 {
    margin: 0 0 20px 0;
    color: #d4a574;
  }

  .form-group {
    margin-bottom: 16px;
  }

  .form-group label {
    display: block;
    color: #e8dcc4;
    margin-bottom: 8px;
  }

  .form-group input,
  .form-group select {
    width: 100%;
    padding: 10px;
    background: #1a0f0a;
    border: 1px solid #5a3a20;
    border-radius: 6px;
    color: #e8dcc4;
  }

  .hire-cost,
  .total-cost {
    color: #d4a574;
    font-weight: 500;
    margin: 16px 0;
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
  }

  ::-webkit-scrollbar {
    width: 8px;
  }

  ::-webkit-scrollbar-track {
    background: #1a0f0a;
  }

  ::-webkit-scrollbar-thumb {
    background: #5a3a20;
    border-radius: 4px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: #8b5a2b;
  }
</style>
