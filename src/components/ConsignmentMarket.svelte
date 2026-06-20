<script lang="ts">
  import { gameStore } from '../stores/gameStore';
  import {
    CONSIGNMENT_TABS,
    WORK_STATUS_LABELS,
    WORK_STATUS_COLORS,
    ORDER_STATUS_LABELS,
    ORDER_STATUS_COLORS,
    CERTIFICATE_TYPE_LABELS,
    filterWorks,
    calculateMarketStatistics
  } from '../utils/consignmentSystem';
  import type {
    ConsignmentWork,
    TradeOrder,
    DigitalCertificate,
    ArtistInfo,
    BuyerInfo,
    ConsignmentMarketTab,
    ConsignmentWorkStatus,
    TradeOrderStatus,
    ConsignmentMarketFilter,
    ProcessedPhoto
  } from '../types/game';
  import { PHOTO_SUBJECTS, FILM_STOCKS } from '../data/gameData';

  export let onClose: () => void;

  $: market = $gameStore.consignmentMarket;
  $: processedPhotos = $gameStore.processedPhotos || [];
  $: activeTab = market.activeTab;
  $: works = market.works;
  $: artists = market.artists;
  $: buyers = market.buyers;
  $: orders = market.orders;
  $: certificates = market.certificates;
  $: currentUserId = market.currentUserId;
  $: currentUserType = market.currentUserType;
  $: filter = market.filter;

  $: filteredWorks = filterWorks(works, filter);
  $: statistics = calculateMarketStatistics(market);

  $: myWorks = works.filter(w => w.artistId === currentUserId);
  $: myOrders = orders.filter(
    o => o.buyerId === currentUserId || o.sellerId === currentUserId
  );
  $: myCertificates = certificates.filter(c => c.ownerId === currentUserId);

  $: selectedWork = works.find(w => w.id === market.selectedWorkId) || null;
  $: selectedOrder = orders.find(o => o.id === market.selectedOrderId) || null;
  $: selectedCertificate = certificates.find(c => c.id === market.selectedCertificateId) || null;

  let showCreateDialog = false;
  let newWorkPhotoId = '';
  let newWorkTitle = '';
  let newWorkDescription = '';
  let newWorkPrice = 500;
  let newWorkTotalEditions = 10;
  let newWorkCategory = '';
  let newWorkTags = '';
  let newWorkFrameOption = false;
  let newWorkFramePrice = 200;
  let newWorkShippingPrice = 50;

  let showBuyDialog = false;
  let buyWork: ConsignmentWork | null = null;
  let buyIncludeFrame = false;
  let buyShippingAddress = '';
  let buySpecialInstructions = '';

  let showUserSwitcher = false;

  function inputValue(e: Event): string {
    return (e.target as HTMLInputElement).value;
  }

  function selectValue(e: Event): string {
    return (e.target as HTMLSelectElement).value;
  }

  function handleSortChange(e: Event) {
    const value = selectValue(e) as ConsignmentMarketFilter['sortBy'];
    gameStore.setConsignmentFilter({ sortBy: value });
  }

  function handleSearchInput(e: Event) {
    gameStore.setConsignmentFilter({ searchKeyword: inputValue(e) });
  }

  function handleTabChange(tabId: string) {
    gameStore.setConsignmentTab(tabId as ConsignmentMarketTab);
  }

  function handleWorkClick(work: ConsignmentWork) {
    gameStore.selectConsignmentWork(work.id);
  }

  function handleCloseWorkDetail() {
    gameStore.selectConsignmentWork(null);
  }

  function handleOrderClick(order: TradeOrder) {
    gameStore.selectConsignmentOrder(order.id);
  }

  function handleCloseOrderDetail() {
    gameStore.selectConsignmentOrder(null);
  }

  function handleCertificateClick(cert: DigitalCertificate) {
    gameStore.selectConsignmentCertificate(cert.id);
  }

  function handleCloseCertificateDetail() {
    gameStore.selectConsignmentCertificate(null);
  }

  function handleListWork(workId: string) {
    gameStore.listConsignmentWork(workId);
  }

  function handleRemoveWork(workId: string) {
    if (confirm('确定要下架这件作品吗？')) {
      gameStore.removeConsignmentWork(workId);
    }
  }

  function handleOpenBuyDialog(work: ConsignmentWork) {
    buyWork = work;
    buyIncludeFrame = false;
    buyShippingAddress = '';
    buySpecialInstructions = '';
    showBuyDialog = true;
  }

  function handleCloseBuyDialog() {
    showBuyDialog = false;
    buyWork = null;
  }

  function getPhotoById(photoId: string): ProcessedPhoto | undefined {
    return processedPhotos.find(p => p.id === photoId);
  }

  function getPhotoSubjectName(subjectId: string): string {
    return PHOTO_SUBJECTS.find(s => s.id === subjectId)?.name || '未知主题';
  }

  function getFilmName(filmId: string): string {
    return FILM_STOCKS.find(f => f.id === filmId)?.name || '未知胶片';
  }

  function getCurrentUser(): { id: string; name: string; type: string } {
    const artist = artists.find(a => a.id === currentUserId);
    if (artist) return { id: artist.id, name: artist.name, type: '艺术家' };
    const buyer = buyers.find(b => b.id === currentUserId);
    if (buyer) return { id: buyer.id, name: buyer.name, type: '收藏家' };
    return { id: currentUserId, name: '未知用户', type: currentUserType };
  }

  function handleSwitchUser(userId: string, userType: 'artist' | 'buyer' | 'both') {
    gameStore.switchConsignmentUser(userId, userType);
    showUserSwitcher = false;
  }

  function handleSelectPhoto(photoId: string) {
    newWorkPhotoId = photoId;
    const photo = getPhotoById(photoId);
    if (photo && !newWorkTitle.trim()) {
      newWorkTitle = getPhotoSubjectName(photo.subjectId);
    }
    if (photo && !newWorkTags.trim()) {
      const subject = PHOTO_SUBJECTS.find(s => s.id === photo.subjectId);
      if (subject) {
        newWorkTags = subject.tags?.join('，') || '';
      }
    }
  }

  function handleOpenCreateWork() {
    showCreateDialog = true;
    newWorkPhotoId = processedPhotos.length > 0 ? processedPhotos[0].id : '';
    newWorkTitle = '';
    newWorkDescription = '';
    newWorkPrice = 500;
    newWorkTotalEditions = 10;
    newWorkCategory = '';
    newWorkTags = '';
    newWorkFrameOption = false;
    newWorkFramePrice = 200;
    newWorkShippingPrice = 50;
  }

  function handleCreateWork() {
    if (!newWorkTitle.trim()) return;
    if (!newWorkPhotoId) {
      alert('请先选择一张成片作为作品底图');
      return;
    }
    const tags = newWorkTags.split(/[,，]/).map(t => t.trim()).filter(t => t);
    gameStore.createConsignmentWork({
      photoId: newWorkPhotoId,
      title: newWorkTitle.trim(),
      description: newWorkDescription.trim(),
      price: newWorkPrice,
      totalEditions: newWorkTotalEditions,
      category: newWorkCategory || undefined,
      tags,
      frameOption: newWorkFrameOption,
      framePrice: newWorkFrameOption ? newWorkFramePrice : undefined,
      shippingPrice: newWorkShippingPrice
    });
    showCreateDialog = false;
  }

  function handleConfirmBuy() {
    if (!buyWork) return;
    const buyer = buyers.find(b => b.id === currentUserId);
    if (!buyer) {
      alert('请先切换到买家身份');
      return;
    }
    if (!buyShippingAddress.trim()) {
      alert('请填写收货地址');
      return;
    }
    gameStore.createTradeOrder({
      workId: buyWork.id,
      buyerId: currentUserId,
      includeFrame: buyIncludeFrame,
      shippingAddress: buyShippingAddress,
      specialInstructions: buySpecialInstructions
    });
    showBuyDialog = false;
    buyWork = null;
  }

  function handleMarkOrderPaid(orderId: string) {
    gameStore.updateTradeOrderStatus(orderId, 'paid');
  }

  function handleMarkOrderDelivered(orderId: string) {
    gameStore.updateTradeOrderStatus(orderId, 'delivered');
  }

  function handleMarkOrderCompleted(orderId: string) {
    gameStore.updateTradeOrderStatus(orderId, 'completed');
  }

  function getWorkPhoto(work: ConsignmentWork): { imageUrl: string; subjectName: string; filmName: string } | null {
    const photo = getPhotoById(work.photoId);
    if (photo) {
      return {
        imageUrl: photo.imageDataUrl,
        subjectName: getPhotoSubjectName(photo.subjectId),
        filmName: getFilmName(photo.filmId)
      };
    }
    return null;
  }

  function isSeller(order: TradeOrder): boolean {
    return order.sellerId === currentUserId;
  }

  function isBuyer(order: TradeOrder): boolean {
    return order.buyerId === currentUserId;
  }

  function formatPrice(price: number): string {
    return `¥${price.toLocaleString()}`;
  }

  function formatDate(timestamp: number): string {
    const d = new Date(timestamp);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function toggleFavorite(workId: string, e: Event) {
    e.stopPropagation();
    gameStore.toggleFavoriteWork(workId);
  }

  function isFavorite(workId: string): boolean {
    const buyer = market.buyers.find(b => b.id === currentUserId);
    return buyer?.favoriteWorkIds.includes(workId) || false;
  }

  function handleUpdateOrderStatus(orderId: string, status: TradeOrderStatus) {
    gameStore.updateTradeOrderStatus(orderId, status);
  }

  function handleCancelOrder(orderId: string) {
    const reason = prompt('请输入取消原因：');
    if (reason !== null) {
      gameStore.updateTradeOrderStatus(orderId, 'cancelled', { cancelReason: reason });
    }
  }
</script>

<div class="consignment-market-overlay" on:click={onClose}>
  <div class="consignment-market-panel" on:click|stopPropagation>
    <div class="panel-header">
      <h2 class="panel-title">
        <span class="title-icon">🏪</span>
        作品交易寄售
      </h2>
      <div class="header-right">
        <div class="user-switcher" on:click|stopPropagation>
          <button class="current-user-btn" on:click={() => showUserSwitcher = !showUserSwitcher}>
            <span class="user-avatar">👤</span>
            <span class="user-info">
              <span class="user-name">{getCurrentUser().name}</span>
              <span class="user-type-tag">{getCurrentUser().type}</span>
            </span>
            <span class="dropdown-arrow">▼</span>
          </button>
          {#if showUserSwitcher}
            <div class="user-switcher-dropdown">
              <div class="switcher-section">
                <div class="switcher-section-title">艺术家身份</div>
                {#each artists as artist}
                  <button
                    class="switcher-option"
                    class:active={currentUserId === artist.id}
                    on:click={() => handleSwitchUser(artist.id, 'artist')}
                  >
                    <span class="switcher-name">{artist.name}</span>
                    {#if artist.verified}<span class="verified-badge">✓</span>{/if}
                    <span class="switcher-sub">作品 {artist.totalWorks} · 销售 {artist.totalSales}</span>
                  </button>
                {/each}
              </div>
              <div class="switcher-section">
                <div class="switcher-section-title">收藏家/买家身份</div>
                {#each buyers as buyer}
                  <button
                    class="switcher-option"
                    class:active={currentUserId === buyer.id}
                    on:click={() => handleSwitchUser(buyer.id, 'buyer')}
                  >
                    <span class="switcher-name">{buyer.name}</span>
                    <span class="switcher-sub">购买 {buyer.totalPurchases} · 花费 ¥{buyer.totalSpent.toLocaleString()}</span>
                  </button>
                {/each}
              </div>
            </div>
          {/if}
        </div>
        <button class="close-btn" on:click={onClose}>✕</button>
      </div>
    </div>

    <div class="tabs">
      {#each CONSIGNMENT_TABS as tab}
        <button
          class="tab-btn"
          class:active={activeTab === tab.id}
          on:click={() => handleTabChange(tab.id)}
        >
          <span class="tab-icon">{tab.icon}</span>
          <span class="tab-label">{tab.label}</span>
        </button>
      {/each}
    </div>

    <div class="panel-content">
      {#if activeTab === 'market'}
        <div class="market-view">
          <div class="market-filters">
            <div class="filter-row">
              <input
                type="text"
                class="search-input"
                placeholder="搜索作品、艺术家、标签..."
                value={filter.searchKeyword}
                on:input={handleSearchInput}
              />
              <select
                class="sort-select"
                value={filter.sortBy}
                on:change={handleSortChange}
              >
                <option value="date_desc">最新上架</option>
                <option value="date_asc">最早上架</option>
                <option value="price_desc">价格从高到低</option>
                <option value="price_asc">价格从低到高</option>
                <option value="popular">热门程度</option>
              </select>
            </div>
            <div class="filter-row stats-row">
              <span class="stat-item">
                <span class="stat-label">在售作品</span>
                <span class="stat-value">{statistics.totalListedWorks}</span>
              </span>
              <span class="stat-item">
                <span class="stat-label">累计成交</span>
                <span class="stat-value">{statistics.totalSoldWorks}</span>
              </span>
              <span class="stat-item">
                <span class="stat-label">活跃艺术家</span>
                <span class="stat-value">{artists.length}</span>
              </span>
            </div>
          </div>

          <div class="works-grid">
            {#each filteredWorks as work (work.id)}
              {@const workPhoto = getWorkPhoto(work)}
              <div class="work-card" on:click={() => handleWorkClick(work)}>
                <div class="work-image">
                  {#if workPhoto}
                    <img src={workPhoto.imageUrl} alt={work.title} class="work-photo-img" />
                  {:else}
                    <div class="work-placeholder">
                      <span class="placeholder-icon">🖼️</span>
                    </div>
                  {/if}
                  <div class="work-status-badge" style="background: {WORK_STATUS_COLORS[work.status]}">
                    {WORK_STATUS_LABELS[work.status]}
                  </div>
                  <button class="favorite-btn" on:click={(e) => toggleFavorite(work.id, e)}>
                    {isFavorite(work.id) ? '❤️' : '🤍'}
                  </button>
                  {#if workPhoto}
                    <div class="work-photo-meta">
                      <span class="photo-meta-tag">{workPhoto.subjectName}</span>
                    </div>
                  {/if}
                </div>
                <div class="work-info">
                  <h3 class="work-title">{work.title}</h3>
                  <p class="work-artist">{work.artistName}</p>
                  <div class="work-tags">
                    {#each work.tags.slice(0, 3) as tag}
                      <span class="tag">{tag}</span>
                    {/each}
                  </div>
                  <div class="work-footer">
                    <span class="work-price">{formatPrice(work.price)}</span>
                    <span class="work-edition">第 {work.edition}/{work.totalEditions} 版</span>
                  </div>
                </div>
              </div>
            {/each}
          </div>

          {#if filteredWorks.length === 0}
            <div class="empty-state">
              <span class="empty-icon">🔍</span>
              <p>没有找到符合条件的作品</p>
            </div>
          {/if}
        </div>
      {/if}

      {#if activeTab === 'my_works'}
        <div class="my-works-view">
          <div class="section-header">
            <h3>我的寄售作品</h3>
            <button class="primary-btn" on:click={handleOpenCreateWork}>
              <span>+</span> 发布新作品
            </button>
          </div>
          <div class="my-works-stats">
            <div class="stat-card">
              <span class="stat-icon">📋</span>
              <div class="stat-info">
                <span class="stat-number">{myWorks.length}</span>
                <span class="stat-label">全部作品</span>
              </div>
            </div>
            <div class="stat-card">
              <span class="stat-icon">🏷️</span>
              <div class="stat-info">
                <span class="stat-number">{statistics.myListedWorks}</span>
                <span class="stat-label">在售中</span>
              </div>
            </div>
            <div class="stat-card">
              <span class="stat-icon">✅</span>
              <div class="stat-info">
                <span class="stat-number">{statistics.mySoldWorks}</span>
                <span class="stat-label">已售出</span>
              </div>
            </div>
            <div class="stat-card">
              <span class="stat-icon">💰</span>
              <div class="stat-info">
                <span class="stat-number">{formatPrice(statistics.myTotalEarnings)}</span>
                <span class="stat-label">累计收益</span>
              </div>
            </div>
          </div>
          <div class="works-list">
            {#each myWorks as work (work.id)}
              {@const workPhoto = getWorkPhoto(work)}
              <div class="work-list-item">
                <div class="work-list-image">
                  {#if workPhoto}
                    <img src={workPhoto.imageUrl} alt={work.title} class="work-list-photo" />
                  {:else}
                    <div class="work-placeholder small">
                      <span class="placeholder-icon">🖼️</span>
                    </div>
                  {/if}
                </div>
                <div class="work-list-info">
                  <div class="work-list-header">
                    <h4>{work.title}</h4>
                    <span class="status-tag" style="background: {WORK_STATUS_COLORS[work.status]}">
                      {WORK_STATUS_LABELS[work.status]}
                    </span>
                  </div>
                  <p class="work-list-desc">{work.description}</p>
                  <div class="work-list-meta">
                    <span>编号：{work.workNumber}</span>
                    <span>版本：第 {work.edition}/{work.totalEditions} 版</span>
                    <span class="price-highlight">{formatPrice(work.price)}</span>
                  </div>
                </div>
                <div class="work-list-actions">
                  {#if work.status === 'draft'}
                    <button class="action-btn primary" on:click={() => handleListWork(work.id)}>
                      上架
                    </button>
                  {/if}
                  {#if work.status === 'listed'}
                    <button class="action-btn danger" on:click={() => handleRemoveWork(work.id)}>
                      下架
                    </button>
                  {/if}
                  <button class="action-btn" on:click={() => handleWorkClick(work)}>
                    详情
                  </button>
                </div>
              </div>
            {/each}
          </div>
          {#if myWorks.length === 0}
            <div class="empty-state">
              <span class="empty-icon">🎨</span>
              <p>你还没有寄售作品</p>
              <button class="primary-btn" on:click={handleOpenCreateWork}>发布第一件作品</button>
            </div>
          {/if}
        </div>
      {/if}

      {#if activeTab === 'my_orders'}
        <div class="my-orders-view">
          <div class="section-header">
            <h3>我的订单</h3>
          </div>
          <div class="orders-list">
            {#each myOrders as order (order.id)}
              {@const orderWork = works.find(w => w.id === order.workId)}
              {@const orderPhoto = orderWork ? getWorkPhoto(orderWork) : null}
              <div class="order-card" on:click={() => handleOrderClick(order)}>
                <div class="order-header">
                  <span class="order-number">订单 {order.orderNumber}</span>
                  <span class="order-status" style="color: {ORDER_STATUS_COLORS[order.status]}">
                    {ORDER_STATUS_LABELS[order.status]}
                  </span>
                </div>
                <div class="order-body">
                  <div class="order-work-info">
                    <div class="order-work-thumb">
                      {#if orderPhoto}
                        <img src={orderPhoto.imageUrl} alt={order.workTitle} class="order-thumb-img" />
                      {:else}
                        🖼️
                      {/if}
                    </div>
                    <div class="order-work-details">
                      <h4>{order.workTitle}</h4>
                      <p>{order.sellerId === currentUserId ? '买家：' + order.buyerName : '卖家：' + order.sellerName}</p>
                    </div>
                  </div>
                  <div class="order-price-info">
                    <span class="order-total">{formatPrice(order.totalAmount)}</span>
                    <span class="order-date">{formatDate(order.createdAt)}</span>
                  </div>
                </div>
                <div class="order-actions">
                  {#if order.sellerId === currentUserId && order.status === 'pending'}
                    <button class="action-btn primary" on:click|stopPropagation={() => handleUpdateOrderStatus(order.id, 'confirmed')}>
                      确认订单
                    </button>
                  {/if}
                  {#if order.buyerId === currentUserId && order.status === 'confirmed'}
                    <button class="action-btn primary" on:click|stopPropagation={() => handleUpdateOrderStatus(order.id, 'paid')}>
                      去付款
                    </button>
                  {/if}
                  {#if order.sellerId === currentUserId && order.status === 'paid'}
                    <button class="action-btn primary" on:click|stopPropagation={() => handleUpdateOrderStatus(order.id, 'delivered')}>
                      发货
                    </button>
                  {/if}
                  {#if order.buyerId === currentUserId && order.status === 'delivered'}
                    <button class="action-btn primary" on:click|stopPropagation={() => handleUpdateOrderStatus(order.id, 'completed')}>
                      确认收货
                    </button>
                  {/if}
                  {#if order.status === 'pending' || order.status === 'confirmed'}
                    <button class="action-btn danger" on:click|stopPropagation={() => handleCancelOrder(order.id)}>
                      取消订单
                    </button>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
          {#if myOrders.length === 0}
            <div class="empty-state">
              <span class="empty-icon">📦</span>
              <p>暂无订单记录</p>
            </div>
          {/if}
        </div>
      {/if}

      {#if activeTab === 'certificates'}
        <div class="certificates-view">
          <div class="section-header">
            <h3>我的证书收藏</h3>
          </div>
          <div class="certificates-grid">
            {#each myCertificates as cert (cert.id)}
              <div class="certificate-card" on:click={() => handleCertificateClick(cert)}>
                <div class="certificate-header">
                  <span class="cert-icon">🏅</span>
                  <span class="cert-type">{CERTIFICATE_TYPE_LABELS[cert.type]}</span>
                </div>
                <div class="certificate-body">
                  <h4 class="cert-title">{cert.workTitle}</h4>
                  <p class="cert-artist">艺术家：{cert.artistName}</p>
                  <p class="cert-edition">第 {cert.editionNumber}/{cert.totalEditions} 版</p>
                </div>
                <div class="certificate-footer">
                  <span class="cert-number">{cert.certificateNumber}</span>
                  <span class="cert-date">{formatDate(cert.issueDate)}</span>
                </div>
                <div class="certificate-badge {cert.verified ? 'verified' : 'unverified'}">
                  {cert.verified ? '✓ 已验证' : '待验证'}
                </div>
              </div>
            {/each}
          </div>
          {#if myCertificates.length === 0}
            <div class="empty-state">
              <span class="empty-icon">🏅</span>
              <p>还没有收藏的证书</p>
              <p class="empty-hint">购买作品后将获得数字证书</p>
            </div>
          {/if}
        </div>
      {/if}

      {#if activeTab === 'artist_profile'}
        <div class="artist-profile-view">
          {#each artists.filter(a => a.id === currentUserId) as artist}
            <div class="artist-profile">
              <div class="artist-header">
                <div class="artist-avatar">
                  <span class="avatar-icon">👤</span>
                  {#if artist.verified}
                    <span class="verified-badge" title="认证艺术家">✓</span>
                  {/if}
                </div>
                <div class="artist-info">
                  <h2 class="artist-name">
                    {artist.name}
                    {#if artist.verified}
                      <span class="verified-icon" title="认证艺术家">✓</span>
                    {/if}
                  </h2>
                  <p class="artist-style">{artist.style || '独立艺术家'}</p>
                  <p class="artist-bio">{artist.bio}</p>
                </div>
              </div>
              <div class="artist-stats">
                <div class="stat-item">
                  <span class="stat-value">{artist.totalWorks}</span>
                  <span class="stat-label">作品总数</span>
                </div>
                <div class="stat-item">
                  <span class="stat-value">{artist.totalSales}</span>
                  <span class="stat-label">累计销量</span>
                </div>
                <div class="stat-item">
                  <span class="stat-value">{artist.rating}</span>
                  <span class="stat-label">评分</span>
                </div>
                <div class="stat-item">
                  <span class="stat-value">{formatDate(artist.joinedAt)}</span>
                  <span class="stat-label">加入时间</span>
                </div>
              </div>
              {#if artist.socialLinks}
                <div class="artist-social">
                  {#if artist.socialLinks.website}
                    <a class="social-link" href={artist.socialLinks.website} target="_blank">
                      🌐 个人网站
                    </a>
                  {/if}
                  {#if artist.socialLinks.instagram}
                    <span class="social-link">
                      📷 {artist.socialLinks.instagram}
                    </span>
                  {/if}
                </div>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>

  {#if selectedWork}
    {@const detailPhoto = getWorkPhoto(selectedWork)}
    <div class="detail-overlay" on:click={handleCloseWorkDetail}>
      <div class="detail-panel" on:click|stopPropagation>
        <button class="close-btn" on:click={handleCloseWorkDetail}>✕</button>
        <div class="detail-content">
          <div class="detail-image">
            {#if detailPhoto}
              <img src={detailPhoto.imageUrl} alt={selectedWork.title} class="detail-img" />
              <div class="detail-photo-meta">
                <span class="meta-pill">📷 {detailPhoto.subjectName}</span>
                <span class="meta-pill">🎞️ {detailPhoto.filmName}</span>
              </div>
            {:else}
              <div class="work-placeholder large">
                <span class="placeholder-icon">🖼️</span>
              </div>
            {/if}
          </div>
          <div class="detail-info">
            <div class="detail-header">
              <h2>{selectedWork.title}</h2>
              <span class="status-tag" style="background: {WORK_STATUS_COLORS[selectedWork.status]}">
                {WORK_STATUS_LABELS[selectedWork.status]}
              </span>
            </div>
            <p class="detail-artist">by {selectedWork.artistName}</p>
            <p class="detail-price">{formatPrice(selectedWork.price)}</p>
            <div class="detail-meta">
              <div class="meta-item">
                <span class="meta-label">作品编号</span>
                <span class="meta-value">{selectedWork.workNumber}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">版号</span>
                <span class="meta-value">第 {selectedWork.edition}/{selectedWork.totalEditions} 版</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">上架时间</span>
                <span class="meta-value">{selectedWork.listedAt ? formatDate(selectedWork.listedAt) : '-'}</span>
              </div>
              {#if selectedWork.category}
                <div class="meta-item">
                  <span class="meta-label">分类</span>
                  <span class="meta-value">{selectedWork.category}</span>
                </div>
              {/if}
            </div>
            <div class="detail-section">
              <h4>作品描述</h4>
              <p>{selectedWork.description}</p>
            </div>
            <div class="detail-section">
              <h4>标签</h4>
              <div class="work-tags">
                {#each selectedWork.tags as tag}
                  <span class="tag">{tag}</span>
                {/each}
              </div>
            </div>
            {#if selectedWork.frameOption || selectedWork.shippingPrice}
              <div class="detail-section">
                <h4>附加选项</h4>
                <ul class="option-list">
                  {#if selectedWork.frameOption}
                    <li>装裱服务：{formatPrice(selectedWork.framePrice || 0)}</li>
                  {/if}
                  {#if selectedWork.shippingPrice}
                    <li>运费：{formatPrice(selectedWork.shippingPrice)}</li>
                  {/if}
                </ul>
              </div>
            {/if}
            <div class="detail-actions">
              {#if selectedWork.status === 'listed'}
                <button class="primary-btn large" on:click={() => handleOpenBuyDialog(selectedWork)}>
                  立即购买
                </button>
              {/if}
              {#if selectedWork.artistId === currentUserId && selectedWork.status === 'draft'}
                <button class="primary-btn large" on:click={() => handleListWork(selectedWork.id)}>
                  上架作品
                </button>
              {/if}
              {#if selectedWork.artistId === currentUserId && selectedWork.status === 'listed'}
                <button class="danger-btn large" on:click={() => handleRemoveWork(selectedWork.id)}>
                  下架作品
                </button>
              {/if}
            </div>
          </div>
        </div>
      </div>
    </div>
  {/if}

  {#if selectedOrder}
    <div class="detail-overlay" on:click={handleCloseOrderDetail}>
      <div class="detail-panel" on:click|stopPropagation>
        <button class="close-btn" on:click={handleCloseOrderDetail}>✕</button>
        <div class="detail-content order-detail">
          <div class="detail-header">
            <h2>订单详情</h2>
            <span class="status-tag" style="background: {ORDER_STATUS_COLORS[selectedOrder.status]}">
              {ORDER_STATUS_LABELS[selectedOrder.status]}
            </span>
          </div>
          <div class="order-info-section">
            <div class="info-row">
              <span class="info-label">订单编号</span>
              <span class="info-value">{selectedOrder.orderNumber}</span>
            </div>
            <div class="info-row">
              <span class="info-label">下单时间</span>
              <span class="info-value">{formatDate(selectedOrder.createdAt)}</span>
            </div>
            <div class="info-row">
              <span class="info-label">作品名称</span>
              <span class="info-value">{selectedOrder.workTitle}</span>
            </div>
            <div class="info-row">
              <span class="info-label">作品编号</span>
              <span class="info-value">{selectedOrder.workNumber}</span>
            </div>
            <div class="info-row">
              <span class="info-label">卖家</span>
              <span class="info-value">{selectedOrder.sellerName}</span>
            </div>
            <div class="info-row">
              <span class="info-label">买家</span>
              <span class="info-value">{selectedOrder.buyerName}</span>
            </div>
          </div>
          <div class="order-price-section">
            <div class="price-row">
              <span>作品价格</span>
              <span>{formatPrice(selectedOrder.price)}</span>
            </div>
            {#if selectedOrder.includeFrame}
              <div class="price-row">
                <span>装裱服务</span>
                <span>{formatPrice(selectedOrder.framePrice)}</span>
              </div>
            {/if}
            <div class="price-row">
              <span>运费</span>
              <span>{formatPrice(selectedOrder.shippingPrice)}</span>
            </div>
            <div class="price-row total">
              <span>总计</span>
              <span>{formatPrice(selectedOrder.totalAmount)}</span>
            </div>
          </div>
          {#if selectedOrder.shippingAddress}
            <div class="order-info-section">
              <div class="info-row">
                <span class="info-label">收货地址</span>
                <span class="info-value">{selectedOrder.shippingAddress}</span>
              </div>
            </div>
          {/if}
          {#if selectedOrder.specialInstructions}
            <div class="order-info-section">
              <div class="info-row">
                <span class="info-label">备注</span>
                <span class="info-value">{selectedOrder.specialInstructions}</span>
              </div>
            </div>
          {/if}
          {#if selectedOrder.cancelReason}
            <div class="order-info-section">
              <div class="info-row">
                <span class="info-label">取消原因</span>
                <span class="info-value">{selectedOrder.cancelReason}</span>
              </div>
            </div>
          {/if}
          <div class="detail-actions">
            {#if selectedOrder.sellerId === currentUserId && selectedOrder.status === 'pending'}
              <button class="primary-btn" on:click={() => handleUpdateOrderStatus(selectedOrder.id, 'confirmed')}>
                确认订单
              </button>
            {/if}
            {#if selectedOrder.buyerId === currentUserId && selectedOrder.status === 'confirmed'}
              <button class="primary-btn" on:click={() => handleUpdateOrderStatus(selectedOrder.id, 'paid')}>
                去付款
              </button>
            {/if}
            {#if selectedOrder.sellerId === currentUserId && selectedOrder.status === 'paid'}
              <button class="primary-btn" on:click={() => handleUpdateOrderStatus(selectedOrder.id, 'delivered')}>
                发货
              </button>
            {/if}
            {#if selectedOrder.buyerId === currentUserId && selectedOrder.status === 'delivered'}
              <button class="primary-btn" on:click={() => handleUpdateOrderStatus(selectedOrder.id, 'completed')}>
                确认收货
              </button>
            {/if}
            {#if selectedOrder.status === 'pending' || selectedOrder.status === 'confirmed'}
              <button class="danger-btn" on:click={() => handleCancelOrder(selectedOrder.id)}>
                取消订单
              </button>
            {/if}
          </div>
        </div>
      </div>
    </div>
  {/if}

  {#if selectedCertificate}
    {@const certWork = works.find(w => w.id === selectedCertificate.workId)}
    {@const certPhoto = certWork ? getWorkPhoto(certWork) : null}
    <div class="detail-overlay" on:click={handleCloseCertificateDetail}>
      <div class="detail-panel certificate-detail-panel" on:click|stopPropagation>
        <button class="close-btn" on:click={handleCloseCertificateDetail}>✕</button>
        <div class="certificate-detail">
          <div class="certificate-header-large">
            <span class="cert-icon-large">🏅</span>
            <h2>{CERTIFICATE_TYPE_LABELS[selectedCertificate.type]}</h2>
          </div>
          <div class="certificate-number-large">{selectedCertificate.certificateNumber}</div>
          <div class="certificate-content">
            {#if certPhoto}
              <div class="cert-work-image">
                <img src={certPhoto.imageUrl} alt={selectedCertificate.workTitle} class="cert-work-img" />
              </div>
            {/if}
            <div class="cert-section">
              <h4>作品信息</h4>
              <div class="cert-info-row">
                <span>作品名称</span>
                <span class="cert-value">{selectedCertificate.workTitle}</span>
              </div>
              <div class="cert-info-row">
                <span>作品编号</span>
                <span class="cert-value">{selectedCertificate.workNumber}</span>
              </div>
              <div class="cert-info-row">
                <span>版号</span>
                <span class="cert-value">第 {selectedCertificate.editionNumber}/{selectedCertificate.totalEditions} 版</span>
              </div>
            </div>
            <div class="cert-section">
              <h4>艺术家</h4>
              <div class="cert-info-row">
                <span>姓名</span>
                <span class="cert-value">{selectedCertificate.artistName}</span>
              </div>
            </div>
            <div class="cert-section">
              <h4>所有权</h4>
              <div class="cert-info-row">
                <span>当前持有人</span>
                <span class="cert-value">{selectedCertificate.ownerName}</span>
              </div>
              <div class="cert-info-row">
                <span>签发日期</span>
                <span class="cert-value">{formatDate(selectedCertificate.issueDate)}</span>
              </div>
            </div>
            {#if selectedCertificate.previousOwners && selectedCertificate.previousOwners.length > 0}
              <div class="cert-section">
                <h4>历史持有者</h4>
                {#each selectedCertificate.previousOwners as owner}
                  <div class="cert-info-row">
                    <span>{owner.ownerName}</span>
                    <span class="cert-value">{formatDate(owner.transferredAt)}</span>
                  </div>
                {/each}
              </div>
            {/if}
            <div class="cert-verification">
              <div class="verification-code">
                <span class="verification-label">验证码</span>
                <span class="verification-value">{selectedCertificate.verificationCode}</span>
              </div>
              <div class="verification-status {selectedCertificate.verified ? 'verified' : 'unverified'}">
                {selectedCertificate.verified ? '✓ 已验证' : '待验证'}
              </div>
            </div>
          </div>
          {#if !selectedCertificate.verified}
            <div class="detail-actions">
              <button class="primary-btn" on:click={() => gameStore.verifyConsignmentCertificate(selectedCertificate.id)}>
                验证证书
              </button>
            </div>
          {/if}
        </div>
      </div>
    </div>
  {/if}

  {#if showCreateDialog}
    <div class="dialog-overlay" on:click={() => showCreateDialog = false}>
      <div class="dialog-panel large-dialog" on:click|stopPropagation>
        <h3>发布新作品</h3>
        <div class="form-group">
          <label>选择成片底图 *</label>
          {#if processedPhotos.length === 0}
            <div class="photo-empty-hint">
              <span>⚠️</span>
              <p>你还没有任何成片，先去暗房冲洗一些照片吧！</p>
            </div>
          {:else}
            <div class="photo-picker">
              {#each processedPhotos as photo (photo.id)}
                <div
                  class="photo-picker-item"
                  class:selected={newWorkPhotoId === photo.id}
                  on:click={() => handleSelectPhoto(photo.id)}
                >
                  <img src={photo.imageDataUrl} alt="成片" class="photo-picker-img" />
                  <div class="photo-picker-info">
                    <span class="photo-score" style="color: {photo.score >= 80 ? '#67c23a' : photo.score >= 60 ? '#e6a23c' : '#f56c6c'}">
                      {photo.score}分
                    </span>
                    <span class="photo-subject">{getPhotoSubjectName(photo.subjectId)}</span>
                  </div>
                  {#if newWorkPhotoId === photo.id}
                    <div class="photo-picker-check">✓</div>
                  {/if}
                </div>
              {/each}
            </div>
          {/if}
        </div>
        <div class="form-group">
          <label>作品标题 *</label>
          <input type="text" bind:value={newWorkTitle} placeholder="请输入作品标题" />
        </div>
        <div class="form-group">
          <label>作品描述</label>
          <textarea bind:value={newWorkDescription} placeholder="请输入作品描述" rows="3"></textarea>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>价格 (元) *</label>
            <input type="number" bind:value={newWorkPrice} min="0" />
          </div>
          <div class="form-group">
            <label>总版数 *</label>
            <input type="number" bind:value={newWorkTotalEditions} min="1" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>分类</label>
            <input type="text" bind:value={newWorkCategory} placeholder="如：街头、风光、人像" />
          </div>
          <div class="form-group">
            <label>标签 (逗号分隔)</label>
            <input type="text" bind:value={newWorkTags} placeholder="如：胶片,夜景,城市" />
          </div>
        </div>
        <div class="form-group checkbox-group">
          <label>
            <input type="checkbox" bind:checked={newWorkFrameOption} />
            提供装裱服务
          </label>
        </div>
        {#if newWorkFrameOption}
          <div class="form-group">
            <label>装裱价格 (元)</label>
            <input type="number" bind:value={newWorkFramePrice} min="0" />
          </div>
        {/if}
        <div class="form-group">
          <label>运费 (元)</label>
          <input type="number" bind:value={newWorkShippingPrice} min="0" />
        </div>
        <div class="dialog-actions">
          <button class="cancel-btn" on:click={() => showCreateDialog = false}>取消</button>
          <button class="primary-btn" on:click={handleCreateWork} disabled={!newWorkTitle.trim() || !newWorkPhotoId}>
            创建作品
          </button>
        </div>
      </div>
    </div>
  {/if}

  {#if showBuyDialog && buyWork}
    {@const buyPhoto = getWorkPhoto(buyWork)}
    <div class="dialog-overlay" on:click={handleCloseBuyDialog}>
      <div class="dialog-panel" on:click|stopPropagation>
        <h3>确认购买</h3>
        <div class="buy-work-info">
          <div class="buy-work-image">
            {#if buyPhoto}
              <img src={buyPhoto.imageUrl} alt={buyWork.title} class="buy-work-img" />
            {:else}
              <div class="work-placeholder medium">
                <span class="placeholder-icon">🖼️</span>
              </div>
            {/if}
          </div>
          <div class="buy-work-details">
            <h4>{buyWork.title}</h4>
            <p>{buyWork.artistName}</p>
            <p class="buy-price">{formatPrice(buyWork.price)}</p>
          </div>
        </div>
        <div class="form-group checkbox-group">
          <label>
            <input type="checkbox" bind:checked={buyIncludeFrame} />
            加装裱服务 {buyWork.framePrice ? `(+${formatPrice(buyWork.framePrice)})` : ''}
          </label>
        </div>
        <div class="form-group">
          <label>收货地址</label>
          <input type="text" bind:value={buyShippingAddress} placeholder="请输入收货地址" />
        </div>
        <div class="form-group">
          <label>特殊说明</label>
          <textarea bind:value={buySpecialInstructions} placeholder="如有特殊要求请备注" rows="2"></textarea>
        </div>
        <div class="price-summary">
          <div class="price-row">
            <span>作品价格</span>
            <span>{formatPrice(buyWork.price)}</span>
          </div>
          {#if buyIncludeFrame && buyWork.framePrice}
            <div class="price-row">
              <span>装裱服务</span>
              <span>{formatPrice(buyWork.framePrice)}</span>
            </div>
          {/if}
          {#if buyWork.shippingPrice}
            <div class="price-row">
              <span>运费</span>
              <span>{formatPrice(buyWork.shippingPrice)}</span>
            </div>
          {/if}
          <div class="price-row total">
            <span>应付总额</span>
            <span>{formatPrice(buyWork.price + (buyIncludeFrame && buyWork.framePrice ? buyWork.framePrice : 0) + (buyWork.shippingPrice || 0))}</span>
          </div>
        </div>
        <div class="dialog-actions">
          <button class="cancel-btn" on:click={handleCloseBuyDialog}>取消</button>
          <button class="primary-btn" on:click={handleConfirmBuy}>确认下单</button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .consignment-market-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.85);
    backdrop-filter: blur(8px);
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 30px;
    animation: fadeIn 0.3s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .consignment-market-panel {
    background: linear-gradient(180deg, rgba(45, 26, 18, 0.95) 0%, rgba(20, 12, 8, 0.98) 100%);
    border: 1px solid rgba(139, 90, 43, 0.3);
    border-radius: 16px;
    width: 100%;
    max-width: 1200px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
  }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px;
    border-bottom: 1px solid rgba(139, 90, 43, 0.2);
  }

  .panel-title {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
    color: #e8c890;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .title-icon {
    font-size: 24px;
  }

  .close-btn {
    background: none;
    border: none;
    color: #8a7a5a;
    font-size: 20px;
    cursor: pointer;
    padding: 8px;
    line-height: 1;
    transition: color 0.2s;
  }

  .close-btn:hover {
    color: #e8c890;
  }

  .tabs {
    display: flex;
    gap: 4px;
    padding: 0 24px;
    border-bottom: 1px solid rgba(139, 90, 43, 0.2);
    background: rgba(0, 0, 0, 0.2);
  }

  .tab-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 12px 16px;
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    color: #8a7a5a;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .tab-btn:hover {
    color: #c8a878;
  }

  .tab-btn.active {
    color: #e8c890;
    border-bottom-color: #d4a574;
  }

  .tab-icon {
    font-size: 16px;
  }

  .panel-content {
    flex: 1;
    overflow-y: auto;
    padding: 24px;
  }

  .market-filters {
    margin-bottom: 20px;
  }

  .filter-row {
    display: flex;
    gap: 12px;
    margin-bottom: 12px;
  }

  .filter-row.stats-row {
    gap: 24px;
    padding: 12px 16px;
    background: rgba(139, 90, 43, 0.1);
    border-radius: 8px;
  }

  .search-input {
    flex: 1;
    padding: 10px 14px;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(139, 90, 43, 0.3);
    border-radius: 8px;
    color: #e8dcc8;
    font-size: 14px;
  }

  .search-input::placeholder {
    color: #6a5a45;
  }

  .sort-select {
    padding: 10px 14px;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(139, 90, 43, 0.3);
    border-radius: 8px;
    color: #e8dcc8;
    font-size: 14px;
    cursor: pointer;
  }

  .stat-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .stat-label {
    font-size: 12px;
    color: #8a7a5a;
  }

  .stat-value {
    font-size: 16px;
    font-weight: 600;
    color: #e8c890;
  }

  .works-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 16px;
  }

  .work-card {
    background: rgba(139, 90, 43, 0.1);
    border: 1px solid rgba(139, 90, 43, 0.2);
    border-radius: 12px;
    overflow: hidden;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .work-card:hover {
    transform: translateY(-4px);
    border-color: rgba(180, 140, 90, 0.5);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  }

  .work-image {
    position: relative;
    aspect-ratio: 3 / 4;
    background: rgba(0, 0, 0, 0.3);
  }

  .work-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, rgba(139, 90, 43, 0.2), rgba(60, 40, 25, 0.3));
  }

  .work-placeholder.small {
    width: 80px;
    height: 100px;
    border-radius: 6px;
  }

  .work-placeholder.medium {
    width: 120px;
    height: 160px;
    border-radius: 8px;
  }

  .work-placeholder.large {
    width: 100%;
    height: 400px;
    border-radius: 8px;
  }

  .placeholder-icon {
    font-size: 48px;
    opacity: 0.5;
  }

  .work-placeholder.small .placeholder-icon {
    font-size: 28px;
  }

  .work-status-badge {
    position: absolute;
    top: 10px;
    left: 10px;
    padding: 4px 10px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 500;
    color: #fff;
  }

  .favorite-btn {
    position: absolute;
    top: 10px;
    right: 10px;
    background: rgba(0, 0, 0, 0.5);
    border: none;
    border-radius: 50%;
    width: 32px;
    height: 32px;
    font-size: 16px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }

  .favorite-btn:hover {
    background: rgba(0, 0, 0, 0.7);
    transform: scale(1.1);
  }

  .work-info {
    padding: 14px;
  }

  .work-title {
    margin: 0 0 6px 0;
    font-size: 15px;
    font-weight: 600;
    color: #e8dcc8;
  }

  .work-artist {
    margin: 0 0 10px 0;
    font-size: 13px;
    color: #a08b6c;
  }

  .work-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 12px;
  }

  .tag {
    padding: 3px 8px;
    background: rgba(139, 90, 43, 0.2);
    border-radius: 10px;
    font-size: 11px;
    color: #c8a878;
  }

  .work-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .work-price {
    font-size: 16px;
    font-weight: 600;
    color: #d4a574;
  }

  .work-edition {
    font-size: 11px;
    color: #7a6a55;
  }

  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
  }

  .section-header h3 {
    margin: 0;
    font-size: 18px;
    color: #e8c890;
  }

  .primary-btn {
    padding: 8px 16px;
    background: linear-gradient(135deg, #d4a574, #8b5a2b);
    border: none;
    border-radius: 8px;
    color: #fff;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .primary-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(212, 165, 116, 0.4);
  }

  .primary-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  .primary-btn.large {
    padding: 12px 24px;
    font-size: 15px;
  }

  .danger-btn {
    padding: 8px 16px;
    background: linear-gradient(135deg, #c86060, #a04040);
    border: none;
    border-radius: 8px;
    color: #fff;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .danger-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(200, 96, 96, 0.4);
  }

  .danger-btn.large {
    padding: 12px 24px;
    font-size: 15px;
  }

  .cancel-btn {
    padding: 8px 16px;
    background: rgba(139, 90, 43, 0.2);
    border: 1px solid rgba(139, 90, 43, 0.3);
    border-radius: 8px;
    color: #c8a878;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .cancel-btn:hover {
    background: rgba(139, 90, 43, 0.3);
  }

  .my-works-stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    margin-bottom: 20px;
  }

  .stat-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
    background: rgba(139, 90, 43, 0.1);
    border: 1px solid rgba(139, 90, 43, 0.2);
    border-radius: 10px;
  }

  .stat-icon {
    font-size: 28px;
  }

  .stat-info {
    display: flex;
    flex-direction: column;
  }

  .stat-number {
    font-size: 20px;
    font-weight: 700;
    color: #e8c890;
  }

  .stat-label {
    font-size: 12px;
    color: #8a7a5a;
  }

  .works-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .work-list-item {
    display: flex;
    gap: 16px;
    padding: 16px;
    background: rgba(139, 90, 43, 0.1);
    border: 1px solid rgba(139, 90, 43, 0.2);
    border-radius: 10px;
    transition: all 0.2s;
  }

  .work-list-item:hover {
    border-color: rgba(180, 140, 90, 0.4);
  }

  .work-list-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .work-list-header {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .work-list-header h4 {
    margin: 0;
    font-size: 16px;
    color: #e8dcc8;
  }

  .status-tag {
    padding: 3px 10px;
    border-radius: 10px;
    font-size: 11px;
    font-weight: 500;
    color: #fff;
  }

  .work-list-desc {
    margin: 0;
    font-size: 13px;
    color: #a08b6c;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  .work-list-meta {
    display: flex;
    gap: 16px;
    font-size: 12px;
    color: #7a6a55;
  }

  .price-highlight {
    color: #d4a574;
    font-weight: 600;
    margin-left: auto;
  }

  .work-list-actions {
    display: flex;
    flex-direction: column;
    gap: 8px;
    justify-content: center;
  }

  .action-btn {
    padding: 6px 12px;
    background: rgba(139, 90, 43, 0.2);
    border: 1px solid rgba(139, 90, 43, 0.3);
    border-radius: 6px;
    color: #c8a878;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .action-btn:hover {
    background: rgba(139, 90, 43, 0.3);
  }

  .action-btn.primary {
    background: linear-gradient(135deg, #d4a574, #8b5a2b);
    border-color: transparent;
    color: #fff;
  }

  .action-btn.primary:hover {
    box-shadow: 0 2px 8px rgba(212, 165, 116, 0.3);
  }

  .action-btn.danger {
    background: linear-gradient(135deg, #c86060, #a04040);
    border-color: transparent;
    color: #fff;
  }

  .action-btn.danger:hover {
    box-shadow: 0 2px 8px rgba(200, 96, 96, 0.3);
  }

  .orders-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .order-card {
    padding: 16px;
    background: rgba(139, 90, 43, 0.1);
    border: 1px solid rgba(139, 90, 43, 0.2);
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .order-card:hover {
    border-color: rgba(180, 140, 90, 0.4);
  }

  .order-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    padding-bottom: 12px;
    border-bottom: 1px solid rgba(139, 90, 43, 0.15);
  }

  .order-number {
    font-size: 14px;
    font-weight: 600;
    color: #e8c890;
  }

  .order-status {
    font-size: 13px;
    font-weight: 500;
  }

  .order-body {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }

  .order-work-info {
    display: flex;
    gap: 12px;
    align-items: center;
  }

  .order-work-thumb {
    font-size: 36px;
  }

  .order-work-details h4 {
    margin: 0 0 4px 0;
    font-size: 15px;
    color: #e8dcc8;
  }

  .order-work-details p {
    margin: 0;
    font-size: 12px;
    color: #8a7a5a;
  }

  .order-price-info {
    text-align: right;
  }

  .order-total {
    display: block;
    font-size: 18px;
    font-weight: 700;
    color: #d4a574;
  }

  .order-date {
    font-size: 12px;
    color: #7a6a55;
  }

  .order-actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .certificates-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 16px;
  }

  .certificate-card {
    position: relative;
    padding: 20px;
    background: linear-gradient(135deg, rgba(180, 140, 90, 0.15), rgba(100, 70, 40, 0.1));
    border: 1px solid rgba(180, 140, 90, 0.3);
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.3s;
  }

  .certificate-card:hover {
    transform: translateY(-4px);
    border-color: rgba(212, 165, 116, 0.5);
    box-shadow: 0 8px 24px rgba(212, 165, 116, 0.2);
  }

  .certificate-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 16px;
  }

  .cert-icon {
    font-size: 28px;
  }

  .cert-type {
    font-size: 14px;
    font-weight: 600;
    color: #d4a574;
  }

  .cert-title {
    margin: 0 0 8px 0;
    font-size: 16px;
    font-weight: 600;
    color: #e8dcc8;
  }

  .cert-artist,
  .cert-edition {
    margin: 0 0 4px 0;
    font-size: 13px;
    color: #a08b6c;
  }

  .certificate-footer {
    display: flex;
    justify-content: space-between;
    margin-top: 16px;
    padding-top: 12px;
    border-top: 1px dashed rgba(139, 90, 43, 0.3);
    font-size: 11px;
    color: #7a6a55;
  }

  .certificate-badge {
    position: absolute;
    top: 12px;
    right: 12px;
    padding: 4px 10px;
    border-radius: 10px;
    font-size: 11px;
    font-weight: 500;
  }

  .certificate-badge.verified {
    background: rgba(103, 194, 58, 0.2);
    color: #67c23a;
  }

  .certificate-badge.unverified {
    background: rgba(230, 162, 60, 0.2);
    color: #e6a23c;
  }

  .artist-profile {
    max-width: 800px;
    margin: 0 auto;
  }

  .artist-header {
    display: flex;
    gap: 24px;
    align-items: flex-start;
    margin-bottom: 24px;
  }

  .artist-avatar {
    position: relative;
    width: 100px;
    height: 100px;
    border-radius: 50%;
    background: linear-gradient(135deg, rgba(180, 140, 90, 0.3), rgba(100, 70, 40, 0.2));
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .avatar-icon {
    font-size: 48px;
  }

  .verified-badge {
    position: absolute;
    bottom: 0;
    right: 0;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: #409eff;
    color: #fff;
    font-size: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 3px solid rgba(20, 12, 8, 0.98);
  }

  .artist-info {
    flex: 1;
  }

  .artist-name {
    margin: 0 0 8px 0;
    font-size: 28px;
    font-weight: 700;
    color: #e8c890;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .verified-icon {
    color: #409eff;
    font-size: 18px;
  }

  .artist-style {
    margin: 0 0 12px 0;
    font-size: 14px;
    color: #a08b6c;
  }

  .artist-bio {
    margin: 0;
    font-size: 14px;
    color: #c8b896;
    line-height: 1.6;
  }

  .artist-stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    padding: 20px;
    background: rgba(139, 90, 43, 0.1);
    border-radius: 12px;
    margin-bottom: 20px;
  }

  .artist-stats .stat-item {
    text-align: center;
  }

  .artist-stats .stat-value {
    display: block;
    font-size: 24px;
    font-weight: 700;
    color: #e8c890;
    margin-bottom: 4px;
  }

  .artist-stats .stat-label {
    font-size: 12px;
    color: #8a7a5a;
  }

  .artist-social {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
  }

  .social-link {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    background: rgba(139, 90, 43, 0.15);
    border: 1px solid rgba(139, 90, 43, 0.25);
    border-radius: 8px;
    color: #c8a878;
    font-size: 13px;
    text-decoration: none;
    transition: all 0.2s;
  }

  .social-link:hover {
    background: rgba(139, 90, 43, 0.25);
    border-color: rgba(180, 140, 90, 0.4);
  }

  .detail-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.85);
    backdrop-filter: blur(8px);
    z-index: 110;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 30px;
    animation: fadeIn 0.3s ease;
  }

  .detail-panel {
    background: linear-gradient(180deg, rgba(45, 26, 18, 0.95) 0%, rgba(20, 12, 8, 0.98) 100%);
    border: 1px solid rgba(139, 90, 43, 0.3);
    border-radius: 16px;
    width: 100%;
    max-width: 900px;
    max-height: 90vh;
    overflow-y: auto;
    position: relative;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
  }

  .detail-panel .close-btn {
    position: absolute;
    top: 16px;
    right: 16px;
    z-index: 10;
  }

  .detail-content {
    padding: 32px;
  }

  .detail-image {
    margin-bottom: 24px;
  }

  .detail-info {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .detail-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
  }

  .detail-header h2 {
    margin: 0;
    font-size: 24px;
    color: #e8c890;
    font-weight: 600;
  }

  .detail-artist {
    margin: 0;
    font-size: 14px;
    color: #a08b6c;
  }

  .detail-price {
    font-size: 28px;
    font-weight: 700;
    color: #d4a574;
  }

  .detail-meta {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    padding: 16px;
    background: rgba(139, 90, 43, 0.1);
    border-radius: 10px;
  }

  .meta-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .meta-label {
    font-size: 12px;
    color: #8a7a5a;
  }

  .meta-value {
    font-size: 14px;
    color: #e8dcc8;
    font-weight: 500;
  }

  .detail-section {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .detail-section h4 {
    margin: 0;
    font-size: 16px;
    color: #e8c890;
    font-weight: 600;
  }

  .detail-section p {
    margin: 0;
    font-size: 14px;
    color: #c8b896;
    line-height: 1.6;
  }

  .option-list {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .option-list li {
    font-size: 14px;
    color: #c8b896;
    padding-left: 16px;
    position: relative;
  }

  .option-list li::before {
    content: '•';
    position: absolute;
    left: 0;
    color: #d4a574;
  }

  .detail-actions {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    margin-top: 8px;
  }

  .order-detail .detail-header {
    margin-bottom: 20px;
    padding-bottom: 16px;
    border-bottom: 1px solid rgba(139, 90, 43, 0.2);
  }

  .order-info-section,
  .order-price-section {
    margin-bottom: 20px;
    padding: 16px;
    background: rgba(139, 90, 43, 0.08);
    border-radius: 10px;
  }

  .info-row {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    border-bottom: 1px solid rgba(139, 90, 43, 0.1);
  }

  .info-row:last-child {
    border-bottom: none;
  }

  .info-label {
    font-size: 13px;
    color: #8a7a5a;
  }

  .info-value {
    font-size: 13px;
    color: #e8dcc8;
    font-weight: 500;
    text-align: right;
  }

  .price-row {
    display: flex;
    justify-content: space-between;
    padding: 6px 0;
    font-size: 14px;
    color: #c8b896;
  }

  .price-row.total {
    margin-top: 8px;
    padding-top: 12px;
    border-top: 1px solid rgba(139, 90, 43, 0.2);
    font-size: 16px;
    font-weight: 600;
    color: #d4a574;
  }

  .certificate-detail-panel {
    max-width: 500px;
  }

  .certificate-detail {
    padding: 32px;
    text-align: center;
  }

  .certificate-header-large {
    margin-bottom: 20px;
  }

  .cert-icon-large {
    font-size: 64px;
    display: block;
    margin-bottom: 12px;
  }

  .certificate-header-large h2 {
    margin: 0;
    font-size: 24px;
    color: #d4a574;
    font-weight: 600;
  }

  .certificate-number-large {
    font-family: monospace;
    font-size: 18px;
    color: #e8c890;
    padding: 12px 20px;
    background: rgba(139, 90, 43, 0.15);
    border-radius: 8px;
    margin-bottom: 24px;
    letter-spacing: 2px;
  }

  .certificate-content {
    text-align: left;
  }

  .cert-section {
    margin-bottom: 20px;
    padding: 16px;
    background: rgba(139, 90, 43, 0.08);
    border-radius: 10px;
  }

  .cert-section h4 {
    margin: 0 0 12px 0;
    font-size: 14px;
    color: #e8c890;
    font-weight: 600;
  }

  .cert-info-row {
    display: flex;
    justify-content: space-between;
    padding: 6px 0;
    font-size: 13px;
  }

  .cert-info-row span:first-child {
    color: #8a7a5a;
  }

  .cert-value {
    color: #e8dcc8;
    font-weight: 500;
  }

  .cert-verification {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    background: rgba(139, 90, 43, 0.15);
    border-radius: 10px;
    margin-top: 8px;
  }

  .verification-code {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .verification-label {
    font-size: 12px;
    color: #8a7a5a;
  }

  .verification-value {
    font-family: monospace;
    font-size: 14px;
    color: #e8c890;
    letter-spacing: 1px;
  }

  .verification-status {
    padding: 6px 14px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 500;
  }

  .verification-status.verified {
    background: rgba(103, 194, 58, 0.2);
    color: #67c23a;
  }

  .verification-status.unverified {
    background: rgba(230, 162, 60, 0.2);
    color: #e6a23c;
  }

  .dialog-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.75);
    backdrop-filter: blur(6px);
    z-index: 120;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 30px;
    animation: fadeIn 0.2s ease;
  }

  .dialog-panel {
    background: linear-gradient(180deg, rgba(45, 26, 18, 0.95) 0%, rgba(20, 12, 8, 0.98) 100%);
    border: 1px solid rgba(139, 90, 43, 0.3);
    border-radius: 14px;
    width: 100%;
    max-width: 480px;
    max-height: 90vh;
    overflow-y: auto;
    padding: 24px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
  }

  .dialog-panel h3 {
    margin: 0 0 20px 0;
    font-size: 18px;
    color: #e8c890;
    font-weight: 600;
  }

  .form-group {
    margin-bottom: 16px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .form-group label {
    font-size: 13px;
    color: #a08b6c;
    font-weight: 500;
  }

  .form-group input[type="text"],
  .form-group input[type="number"],
  .form-group textarea {
    padding: 10px 14px;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(139, 90, 43, 0.3);
    border-radius: 8px;
    color: #e8dcc8;
    font-size: 14px;
    font-family: inherit;
    transition: border-color 0.2s;
  }

  .form-group input[type="text"]:focus,
  .form-group input[type="number"]:focus,
  .form-group textarea:focus {
    outline: none;
    border-color: rgba(212, 165, 116, 0.5);
  }

  .form-group textarea {
    resize: vertical;
    min-height: 60px;
  }

  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .checkbox-group {
    flex-direction: row;
    align-items: center;
    gap: 10px;
  }

  .checkbox-group label {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    font-size: 14px;
    color: #c8b896;
  }

  .checkbox-group input[type="checkbox"] {
    width: 16px;
    height: 16px;
    accent-color: #d4a574;
  }

  .dialog-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 24px;
  }

  .buy-work-info {
    display: flex;
    gap: 16px;
    padding: 16px;
    background: rgba(139, 90, 43, 0.1);
    border-radius: 10px;
    margin-bottom: 20px;
  }

  .buy-work-image {
    flex-shrink: 0;
  }

  .buy-work-details {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
    justify-content: center;
  }

  .buy-work-details h4 {
    margin: 0;
    font-size: 16px;
    color: #e8dcc8;
    font-weight: 600;
  }

  .buy-work-details p {
    margin: 0;
    font-size: 13px;
    color: #a08b6c;
  }

  .buy-price {
    font-size: 18px;
    font-weight: 700;
    color: #d4a574;
    margin-top: 4px;
  }

  .price-summary {
    padding: 16px;
    background: rgba(139, 90, 43, 0.08);
    border-radius: 10px;
    margin-top: 8px;
  }

  .empty-state {
    text-align: center;
    padding: 60px 20px;
    color: #8a7a5a;
  }

  .empty-icon {
    font-size: 48px;
    display: block;
    margin-bottom: 16px;
    opacity: 0.5;
  }

  .empty-state p {
    margin: 0 0 8px 0;
    font-size: 14px;
  }

  .empty-hint {
    font-size: 12px !important;
    color: #6a5a45 !important;
  }

  @media (max-width: 768px) {
    .consignment-market-panel {
      max-height: 95vh;
    }

    .tabs {
      overflow-x: auto;
      padding-bottom: 0;
    }

    .tab-btn {
      flex-shrink: 0;
    }

    .panel-content {
      padding: 16px;
    }

    .works-grid {
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 12px;
    }

    .my-works-stats {
      grid-template-columns: repeat(2, 1fr);
    }

    .artist-stats {
      grid-template-columns: repeat(2, 1fr);
    }

    .detail-content {
      padding: 20px;
    }

    .detail-meta {
      grid-template-columns: 1fr;
    }

    .form-row {
      grid-template-columns: 1fr;
    }

    .certificates-grid {
      grid-template-columns: 1fr;
    }
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .user-switcher {
    position: relative;
  }

  .current-user-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    background: rgba(139, 90, 43, 0.15);
    border: 1px solid rgba(139, 90, 43, 0.3);
    border-radius: 8px;
    cursor: pointer;
    color: #d4c4a8;
    font-size: 13px;
    transition: all 0.2s ease;
  }

  .current-user-btn:hover {
    background: rgba(139, 90, 43, 0.25);
    border-color: rgba(139, 90, 43, 0.5);
  }

  .user-avatar {
    font-size: 18px;
  }

  .user-info {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 1px;
  }

  .user-name {
    font-weight: 600;
    color: #e8dcc8;
    font-size: 13px;
  }

  .user-type-tag {
    font-size: 10px;
    color: #8a7a5a;
    background: rgba(139, 90, 43, 0.2);
    padding: 1px 6px;
    border-radius: 4px;
  }

  .dropdown-arrow {
    font-size: 10px;
    color: #8a7a5a;
    margin-left: 4px;
  }

  .user-switcher-dropdown {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    min-width: 260px;
    background: #2a2318;
    border: 1px solid rgba(139, 90, 43, 0.3);
    border-radius: 10px;
    padding: 8px;
    z-index: 10;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  }

  .switcher-section {
    padding: 8px 0;
    border-bottom: 1px solid rgba(139, 90, 43, 0.15);
  }

  .switcher-section:last-child {
    border-bottom: none;
  }

  .switcher-section-title {
    font-size: 11px;
    color: #8a7a5a;
    padding: 4px 8px 8px 8px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .switcher-option {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    padding: 10px 12px;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 8px;
    cursor: pointer;
    text-align: left;
    color: #d4c4a8;
    transition: all 0.2s ease;
  }

  .switcher-option:hover {
    background: rgba(139, 90, 43, 0.15);
  }

  .switcher-option.active {
    background: rgba(139, 90, 43, 0.25);
    border-color: rgba(139, 90, 43, 0.4);
  }

  .switcher-name {
    font-size: 13px;
    font-weight: 600;
    color: #e8dcc8;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .switcher-sub {
    font-size: 11px;
    color: #8a7a5a;
  }

  .verified-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    background: #409eff;
    color: white;
    border-radius: 50%;
    font-size: 10px;
    font-weight: 700;
  }

  .work-photo-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .work-photo-meta {
    position: absolute;
    left: 8px;
    bottom: 8px;
    display: flex;
    gap: 4px;
  }

  .photo-meta-tag {
    background: rgba(0, 0, 0, 0.65);
    color: #e8dcc8;
    font-size: 10px;
    padding: 2px 6px;
    border-radius: 4px;
    backdrop-filter: blur(4px);
  }

  .work-list-photo {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 6px;
  }

  .photo-empty-hint {
    padding: 24px;
    background: rgba(230, 162, 60, 0.08);
    border: 1px dashed rgba(230, 162, 60, 0.3);
    border-radius: 8px;
    text-align: center;
    color: #e6a23c;
  }

  .photo-empty-hint span {
    font-size: 28px;
    display: block;
    margin-bottom: 8px;
  }

  .photo-empty-hint p {
    margin: 0;
    font-size: 13px;
  }

  .photo-picker {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
    gap: 10px;
    max-height: 280px;
    overflow-y: auto;
    padding: 4px;
  }

  .photo-picker-item {
    position: relative;
    border-radius: 8px;
    overflow: hidden;
    cursor: pointer;
    border: 2px solid transparent;
    transition: all 0.2s ease;
    background: rgba(0, 0, 0, 0.3);
  }

  .photo-picker-item:hover {
    border-color: rgba(139, 90, 43, 0.5);
  }

  .photo-picker-item.selected {
    border-color: #d4a574;
    box-shadow: 0 0 0 2px rgba(212, 165, 116, 0.25);
  }

  .photo-picker-img {
    width: 100%;
    height: 100px;
    object-fit: cover;
    display: block;
  }

  .photo-picker-info {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: linear-gradient(to top, rgba(0,0,0,0.85), transparent);
    padding: 20px 8px 6px 8px;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    font-size: 11px;
  }

  .photo-score {
    font-weight: 700;
  }

  .photo-subject {
    color: #c8b898;
    font-size: 10px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 70px;
  }

  .photo-picker-check {
    position: absolute;
    top: 6px;
    right: 6px;
    width: 22px;
    height: 22px;
    background: #d4a574;
    color: #1a1410;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    font-weight: 700;
    box-shadow: 0 2px 6px rgba(0,0,0,0.4);
  }

  .large-dialog {
    max-width: 700px;
  }

  .buy-work-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 8px;
  }

  .detail-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 10px;
  }

  .detail-photo-meta {
    position: absolute;
    left: 12px;
    bottom: 12px;
    display: flex;
    gap: 8px;
  }

  .meta-pill {
    background: rgba(0, 0, 0, 0.7);
    color: #e8dcc8;
    font-size: 12px;
    padding: 5px 12px;
    border-radius: 20px;
    backdrop-filter: blur(4px);
  }

  .order-thumb-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 6px;
  }

  .cert-work-image {
    margin-bottom: 20px;
    border-radius: 10px;
    overflow: hidden;
    aspect-ratio: 4/3;
    background: rgba(0, 0, 0, 0.3);
  }

  .cert-work-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
</style>
