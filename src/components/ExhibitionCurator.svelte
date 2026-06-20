<script lang="ts">
  import { gameStore } from '../stores/gameStore';
  import { PHOTO_SUBJECTS, FILM_STOCKS } from '../data/gameData';
  import type { ProcessedPhoto, Exhibition } from '../types/game';
  import type { ExhibitionWorkPlacement, ExhibitionWorkGroup, ExhibitionWall } from '../types/game';

  export let onClose: () => void;

  const TABS = [
    { key: 'groups', label: '作品分组', icon: '🖼' },
    { key: 'themes', label: '主题编排', icon: '🎨' },
    { key: 'walls', label: '墙面预览', icon: '🏛' },
    { key: 'route', label: '观展动线', icon: '🧭' },
    { key: 'feedback', label: '评价采集', icon: '📊' },
    { key: 'statistics', label: '数据统计', icon: '📈' }
  ] as const;

  const FRAME_STYLES = ['minimal', 'classic', 'vintage', 'float', 'none'] as const;
  const TEXTURE_TYPES = [
    { key: 'smooth', label: '平滑墙面' },
    { key: 'canvas', label: '画布质感' },
    { key: 'brick', label: '砖墙' },
    { key: 'concrete', label: '水泥墙' },
    { key: 'wood', label: '木板墙' }
  ] as const;
  const LAYOUT_TYPES = ['grid', 'masonry', 'salon', 'linear', 'feature'] as const;
  const VISITOR_TYPES = [
    { key: 'casual', label: '普通观众', icon: '👤' },
    { key: 'enthusiast', label: '摄影爱好者', icon: '📷' },
    { key: 'critic', label: '艺术评论家', icon: '🎭' },
    { key: 'collector', label: '收藏家', icon: '💎' },
    { key: 'student', label: '学生', icon: '🎓' }
  ] as const;
  const EMOTIONS = [
    { key: 'inspired', label: '受启发', icon: '✨' },
    { key: 'moved', label: '感动', icon: '💖' },
    { key: 'curious', label: '好奇', icon: '🤔' },
    { key: 'peaceful', label: '宁静', icon: '🍃' },
    { key: 'energized', label: '振奋', icon: '⚡' },
    { key: 'confused', label: '困惑', icon: '❓' }
  ] as const;
  const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    draft: { label: '草稿', color: '#888' },
    planning: { label: '策划中', color: '#f39c12' },
    published: { label: '已发布', color: '#27ae60' },
    archived: { label: '已归档', color: '#7f8c8d' }
  };

  let newExhibitionTitle = '';
  let newGroupName = '';
  let newGroupColor = '#4a90d9';
  let newWallName = '';
  let showCreateExhibition = false;
  let showCreateGroup = false;
  let showCreateWall = false;
  let dragPhotoId: string | null = null;
  let draggingPlacement: ExhibitionWorkPlacement | null = null;
  let dragOffset = { x: 0, y: 0 };
  let wallCanvas: HTMLDivElement;

  // 评价表单状态
  let fbVisitorName = '';
  let fbVisitorType = 'casual' as const;
  let fbOverallRating = 5;
  let fbcurationRating = 5;
  let fbVarietyRating = 5;
  let fbFlowRating = 5;
  let fbLightingRating = 5;
  let fbComments = '';
  let fbEmotion = '' as string;
  let fbTags: string[] = [];
  let fbTagInput = '';
  let fbFavoriteWorkId = '';

  $: systemState = $gameStore.exhibitionSystem;
  $: currentExhibition = systemState.exhibitions.find(e => e.id === systemState.activeExhibitionId) || null;
  $: currentTheme = currentExhibition?.themes.find(t => t.id === currentExhibition.themeId);
  $: selectedWall = currentExhibition?.walls.find(w => w.id === systemState.selectedWallId) || null;
  $: selectedGroup = currentExhibition?.groups.find(g => g.id === systemState.selectedGroupId) || null;
  $: selectedPlacement = selectedWall?.placements.find(p => p.workId === systemState.selectedPlacementId) || null;
  $: processedPhotos = $gameStore.processedPhotos;
  $: allPhotoMap = new Map(processedPhotos.map(p => [p.id, p]));

  $: ungrouppedPhotos = (() => {
    if (!currentExhibition) return [];
    const groupedIds = new Set<string>();
    currentExhibition.groups.forEach(g => g.photoIds.forEach(id => groupedIds.add(id)));
    return processedPhotos.filter(p => !groupedIds.has(p.id));
  })();

  $: allPlacedPhotoIds = (() => {
    if (!currentExhibition) return new Set<string>();
    const ids = new Set<string>();
    currentExhibition.walls.forEach(w => w.placements.forEach(p => ids.add(p.photoId)));
    return ids;
  })();

  $: allExhibitionPhotos = (() => {
    if (!currentExhibition) return [] as ProcessedPhoto[];
    const ids = new Set<string>();
    currentExhibition.walls.forEach(w => w.placements.forEach(p => ids.add(p.photoId)));
    return processedPhotos.filter(p => ids.has(p.id));
  })();

  function formatDate(ts: number) {
    const d = new Date(ts);
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
  }
  function getPhotoInfo(photoId: string): ProcessedPhoto | undefined { return allPhotoMap.get(photoId); }
  function getPhotoSubjectName(photoId: string) {
    const p = getPhotoInfo(photoId); if (!p) return '';
    const s = PHOTO_SUBJECTS.find(x => x.id === p.subjectId);
    return s?.name || '未知';
  }
  function getPhotoFilmName(photoId: string) {
    const p = getPhotoInfo(photoId); if (!p) return '';
    const f = FILM_STOCKS.find(x => x.id === p.filmId);
    return f?.name || '未知';
  }

  function createExhibition() {
    if (!newExhibitionTitle.trim()) return;
    gameStore.createExhibition(newExhibitionTitle.trim(), '', '');
    newExhibitionTitle = '';
    showCreateExhibition = false;
  }
  function createGroup() {
    if (!newGroupName.trim() || !currentExhibition) return;
    gameStore.createWorkGroup(currentExhibition.id, newGroupName.trim(), newGroupColor);
    newGroupName = ''; newGroupColor = '#4a90d9';
    showCreateGroup = false;
  }
  function createWall() {
    if (!newWallName.trim() || !currentExhibition) return;
    gameStore.createWall(currentExhibition.id, newWallName.trim());
    newWallName = '';
    showCreateWall = false;
  }
  function deleteExhibition(id: string) {
    if (!confirm('确定删除这个展览吗？')) return;
    gameStore.deleteExhibition(id);
  }

  function handlePhotoDragStart(e: DragEvent, photoId: string) {
    dragPhotoId = photoId;
    if (e.dataTransfer) { e.dataTransfer.effectAllowed = 'copy'; e.dataTransfer.setData('text/plain', photoId); }
  }
  function handlePhotoDropOnWall(e: DragEvent) {
    e.preventDefault();
    if (!dragPhotoId || !currentExhibition || !selectedWall || !wallCanvas) return;
    const rect = wallCanvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * selectedWall.width;
    const y = ((e.clientY - rect.top) / rect.height) * selectedWall.height;
    gameStore.addPlacementToWall(currentExhibition.id, selectedWall.id, dragPhotoId, x, y);
    dragPhotoId = null;
  }
  function handlePlacementMouseDown(e: MouseEvent, placement: ExhibitionWorkPlacement) {
    if (!currentExhibition || !selectedWall || !systemState.isEditingPlacement || !wallCanvas) return;
    e.preventDefault();
    const rect = wallCanvas.getBoundingClientRect();
    draggingPlacement = placement;
    gameStore.selectPlacement(placement.workId);
    dragOffset.x = ((e.clientX - rect.left) / rect.width) * selectedWall.width - placement.x;
    dragOffset.y = ((e.clientY - rect.top) / rect.height) * selectedWall.height - placement.y;
    document.addEventListener('mousemove', handlePlacementMouseMove);
    document.addEventListener('mouseup', handlePlacementMouseUp);
  }
  function handlePlacementMouseMove(e: MouseEvent) {
    if (!draggingPlacement || !currentExhibition || !selectedWall || !wallCanvas) return;
    const rect = wallCanvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(selectedWall.width - draggingPlacement.width, ((e.clientX - rect.left) / rect.width) * selectedWall.width - dragOffset.x));
    const y = Math.max(0, Math.min(selectedWall.height - draggingPlacement.height, ((e.clientY - rect.top) / rect.height) * selectedWall.height - dragOffset.y));
    gameStore.updatePlacement(currentExhibition.id, selectedWall.id, draggingPlacement.workId, { x, y });
  }
  function handlePlacementMouseUp() {
    draggingPlacement = null;
    document.removeEventListener('mousemove', handlePlacementMouseMove);
    document.removeEventListener('mouseup', handlePlacementMouseUp);
  }
  function handlePlacementResize(e: MouseEvent, placement: ExhibitionWorkPlacement) {
    e.preventDefault(); e.stopPropagation();
    const startX = e.clientX; const startY = e.clientY;
    const startW = placement.width; const startH = placement.height;
    const ar = startW / startH;
    const onMove = (ev: MouseEvent) => {
      if (!currentExhibition || !selectedWall) return;
      const dx = ev.clientX - startX; const dy = ev.clientY - startY;
      const scale = Math.max(0.3, Math.min(2, 1 + (dx + dy * ar) / (startW * 2)));
      const newW = Math.max(40, Math.min(selectedWall.width * 0.6, startW * scale));
      const newH = newW / ar;
      gameStore.updatePlacement(currentExhibition.id, selectedWall.id, placement.workId, { width: newW, height: newH });
    };
    const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp);
  }

  function addRouteForCurrentWall() {
    if (!currentExhibition || !selectedWall) return;
    gameStore.addRouteStop(currentExhibition.id, selectedWall.id);
  }
  function addRouteForPlacement(placementId: string) {
    if (!currentExhibition || !selectedWall) return;
    gameStore.addRouteStop(currentExhibition.id, selectedWall.id, placementId);
  }

  function addTag() {
    const t = fbTagInput.trim();
    if (t && !fbTags.includes(t)) { fbTags = [...fbTags, t]; }
    fbTagInput = '';
  }
  function removeTag(t: string) { fbTags = fbTags.filter(x => x !== t); }
  function submitFeedback() {
    if (!currentExhibition) return;
    gameStore.addVisitorFeedback(currentExhibition.id, {
      visitorName: fbVisitorName || '匿名观众',
      visitorType: fbVisitorType,
      overallRating: fbOverallRating,
      curationRating: fbcurationRating,
      varietyRating: fbVarietyRating,
      flowRating: fbFlowRating,
      lightingRating: fbLightingRating,
      favoriteWorkId: fbFavoriteWorkId || undefined,
      comments: fbComments,
      emotionalResponse: (fbEmotion || undefined) as any,
      tags: fbTags,
      visitDuration: Math.floor(Math.random() * 60) + 15,
      worksViewed: currentExhibition.walls.reduce((s, w) => s + w.placements.length, 0)
    });
    fbVisitorName = ''; fbComments = ''; fbEmotion = '';
    fbTags = []; fbFavoriteWorkId = '';
    fbOverallRating = 5; fbcurationRating = 5; fbVarietyRating = 5; fbFlowRating = 5; fbLightingRating = 5;
  }

  function renderStars(rating: number, max: number = 5) {
    let s = '';
    for (let i = 1; i <= max; i++) s += i <= rating ? '★' : '☆';
    return s;
  }
  function getGroupPhotos(group: ExhibitionWorkGroup) {
    return group.photoIds.map(id => getPhotoInfo(id)).filter(Boolean) as ProcessedPhoto[];
  }
</script>

<div class="exhibition-modal">
  <div class="modal-overlay" on:click={onClose} />
  <div class="modal-container">
    <header class="modal-header">
      <div class="header-left">
        <span class="curator-icon">🖼</span>
        <div class="title-area">
          <h2 class="modal-title">展览策展中心</h2>
          <p class="modal-subtitle">专业级虚拟展览策划平台</p>
        </div>
      </div>
      <div class="header-right">
        {#if currentExhibition}
          <div class="exhibition-selector">
            <select
              value={currentExhibition.id}
              on:change={(e) => gameStore.setActiveExhibition((e.target as HTMLSelectElement).value)}
            >
              {#each systemState.exhibitions as exh (exh.id)}
                <option value={exh.id}>{exh.title}</option>
              {/each}
            </select>
            <span class="status-badge" style="background: {STATUS_LABELS[currentExhibition.status]?.color || '#888'}">
              {STATUS_LABELS[currentExhibition.status]?.label || '未知'}
            </span>
          </div>
          <button class="btn btn-secondary" on:click={() => (showCreateExhibition = true)}>+ 新展览</button>
          <button class="btn btn-danger" disabled={systemState.exhibitions.length <= 1} on:click={() => currentExhibition && deleteExhibition(currentExhibition.id)} title="删除">🗑</button>
        {/if}
        <button class="btn-close" on:click={onClose}>×</button>
      </div>
    </header>

    <nav class="tabs-nav">
      {#each TABS as tab}
        <button class="tab-btn {systemState.activeTab === tab.key ? 'active' : ''}" on:click={() => gameStore.setExhibitionActiveTab(tab.key as any)}>
          <span class="tab-icon">{tab.icon}</span>
          <span class="tab-label">{tab.label}</span>
        </button>
      {/each}
    </nav>

    <div class="content-area">
      {#if !currentExhibition}
        <div class="empty-state">
          <div class="empty-icon">🏛</div>
          <h3>还没有展览</h3>
          <p>创建您的第一个虚拟摄影展览</p>
          <button class="btn btn-primary" on:click={() => (showCreateExhibition = true)}>+ 创建展览</button>
        </div>

      {:else if systemState.activeTab === 'groups'}
        <div class="tab-groups">
          <div class="groups-sidebar">
            <div class="sidebar-header"><h3>作品分组</h3>
              <button class="btn btn-small btn-primary" on:click={() => (showCreateGroup = true)}>+</button>
            </div>
            <div class="groups-list">
              <div class="group-item all-group" on:click={() => gameStore.selectGroup(null)}>
                <div class="group-dot" style="background: #95a5a6" />
                <span class="group-name">全部作品</span>
                <span class="group-count">{processedPhotos.length}</span>
              </div>
              {#each currentExhibition.groups as group (group.id)}
                <div class="group-item {selectedGroup?.id === group.id ? 'active' : ''}" on:click={() => gameStore.selectGroup(group.id)}>
                  <div class="group-dot" style="background: {group.colorTag}" />
                  <div class="group-info">
                    <span class="group-name">{group.name}</span>
                    {#if group.description}<span class="group-desc">{group.description}</span>{/if}
                  </div>
                  <span class="group-count">{group.photoIds.length}</span>
                  <button class="group-delete" on:click|stopPropagation={() => gameStore.deleteWorkGroup(currentExhibition.id, group.id)}>×</button>
                </div>
              {/each}
            </div>
            {#if selectedGroup}
              <div class="group-detail">
                <h4>{selectedGroup.name}</h4>
                {#if selectedGroup.photoIds.length === 0}<p class="hint">点击右侧作品添加到此处</p>{/if}
                <div class="group-photos-grid">
                  {#each getGroupPhotos(selectedGroup) as photo (photo.id)}
                    <div class="group-photo-card">
                      <img src={photo.imageDataUrl} alt="" />
                      <div class="photo-score">{photo.details.grade}</div>
                      <button class="remove-btn" on:click={() => gameStore.removePhotoFromExhibitionGroup(currentExhibition.id, selectedGroup.id, photo.id)}>×</button>
                    </div>
                  {/each}
                </div>
              </div>
            {/if}
          </div>
          <div class="photos-pool">
            <div class="pool-header">
              <h3>{selectedGroup ? '可添加作品' : '所有作品'}</h3>
              <span class="pool-count">{selectedGroup ? ungrouppedPhotos.length : processedPhotos.length} 张</span>
            </div>
            {#if (selectedGroup ? ungrouppedPhotos : processedPhotos).length === 0}
              <div class="empty-mini"><p>暂无可用作品</p><p class="hint-small">先冲洗一些照片吧</p></div>
            {:else}
              <div class="photos-grid">
                {#each (selectedGroup ? ungrouppedPhotos : processedPhotos) as photo (photo.id)}
                  <div class="photo-card" draggable="true"
                    on:dragstart={(e) => handlePhotoDragStart(e, photo.id)}
                    on:click={() => { if (selectedGroup) gameStore.addPhotoToExhibitionGroup(currentExhibition.id, selectedGroup.id, photo.id); }}
                  >
                    <div class="photo-thumb">
                      <img src={photo.imageDataUrl} alt="" />
                      <div class="photo-grade-badge grade-{photo.details.grade}">{photo.details.grade}</div>
                      {#if selectedGroup}<div class="photo-add-hint">+ 添加</div>{/if}
                    </div>
                    <div class="photo-info">
                      <div class="photo-subject">{getPhotoSubjectName(photo.id)}</div>
                      <div class="photo-meta"><span>{getPhotoFilmName(photo.id)}</span><span>{photo.score}分</span></div>
                      <div class="photo-date">{formatDate(photo.timestamp)}</div>
                    </div>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        </div>

      {:else if systemState.activeTab === 'themes'}
        <div class="tab-themes">
          <div class="themes-panel">
            <div class="exhibition-info-edit">
              <h3>展览信息</h3>
              <div class="form-grid">
                <label class="form-item"><span>展览标题</span>
                  <input type="text" value={currentExhibition.title} on:input={(e) => gameStore.updateExhibition(currentExhibition.id, { title: (e.target as HTMLInputElement).value })} />
                </label>
                <label class="form-item"><span>副标题</span>
                  <input type="text" value={currentExhibition.subtitle} on:input={(e) => gameStore.updateExhibition(currentExhibition.id, { subtitle: (e.target as HTMLInputElement).value })} />
                </label>
                <label class="form-item"><span>策展人</span>
                  <input type="text" value={currentExhibition.curatorName} on:input={(e) => gameStore.updateExhibition(currentExhibition.id, { curatorName: (e.target as HTMLInputElement).value })} />
                </label>
                <label class="form-item"><span>展览状态</span>
                  <select value={currentExhibition.status} on:change={(e) => gameStore.setExhibitionStatus(currentExhibition.id, (e.target as HTMLSelectElement).value as any)}>
                    <option value="draft">草稿</option><option value="planning">策划中</option>
                    <option value="published">已发布</option><option value="archived">已归档</option>
                  </select>
                </label>
                <label class="form-item full"><span>展览描述</span>
                  <textarea rows="3" value={currentExhibition.description} on:input={(e) => gameStore.updateExhibition(currentExhibition.id, { description: (e.target as HTMLTextAreaElement).value })} />
                </label>
                <label class="form-item full"><span>策展说明</span>
                  <textarea rows="4" value={currentExhibition.exhibitionStatement || ''} on:input={(e) => gameStore.updateExhibition(currentExhibition.id, { exhibitionStatement: (e.target as HTMLTextAreaElement).value })} />
                </label>
              </div>
            </div>
            <div class="themes-selection">
              <h3>主题风格</h3>
              <div class="themes-grid">
                {#each currentExhibition.themes as theme (theme.id)}
                  <div class="theme-card {currentExhibition.themeId === theme.id ? 'active' : ''}"
                    on:click={() => gameStore.setExhibitionTheme(currentExhibition.id, theme.id)}
                    style="--theme-wall: {theme.colorPalette.wall}; --theme-accent: {theme.colorPalette.accent};"
                  >
                    <div class="theme-preview">
                      <div class="preview-wall" style="background: {theme.colorPalette.wall}">
                        <div class="preview-frame" style="border-color: {theme.colorPalette.primary}"></div>
                        <div class="preview-frame small" style="border-color: {theme.colorPalette.accent}"></div>
                      </div>
                      <div class="preview-floor" style="background: {theme.colorPalette.floor}"></div>
                    </div>
                    <div class="theme-info">
                      <div class="theme-name">{theme.name}</div>
                      <div class="theme-tags"><span class="tag">{theme.fontStyle}</span><span class="tag">{theme.lightingScheme}</span></div>
                    </div>
                    {#if currentExhibition.themeId === theme.id}<div class="theme-check">✓</div>{/if}
                  </div>
                {/each}
              </div>
              {#if currentTheme}
                <div class="theme-customizer">
                  <h4>颜色调整 - {currentTheme.name}</h4>
                  <div class="color-grid">
                    {#each Object.entries(currentTheme.colorPalette) as [key, color] (key)}
                      <label class="color-item"><span class="color-label">{key}</span>
                        <div class="color-row">
                          <input type="color" value={color} on:input={(e) => gameStore.updateExhibitionTheme(currentExhibition.id, currentTheme.id, { colorPalette: { ...currentTheme.colorPalette, [key]: (e.target as HTMLInputElement).value } })} />
                          <input type="text" class="color-hex" value={color} on:input={(e) => gameStore.updateExhibitionTheme(currentExhibition.id, currentTheme.id, { colorPalette: { ...currentTheme.colorPalette, [key]: (e.target as HTMLInputElement).value } })} />
                        </div>
                      </label>
                    {/each}
                  </div>
                </div>
              {/if}
            </div>
          </div>
        </div>

      {:else if systemState.activeTab === 'walls'}
        <div class="tab-walls">
          <div class="walls-sidebar">
            <div class="sidebar-header"><h3>墙面列表</h3>
              <button class="btn btn-small btn-primary" on:click={() => (showCreateWall = true)}>+</button>
            </div>
            <div class="walls-list">
              {#each currentExhibition.walls as wall (wall.id)}
                <div class="wall-item {selectedWall?.id === wall.id ? 'active' : ''}" on:click={() => gameStore.selectWall(wall.id)}>
                  <div class="wall-order">{wall.order + 1}</div>
                  <div class="wall-info"><span class="wall-name">{wall.name}</span><span class="wall-count">{wall.placements.length} 作品</span></div>
                  {#if currentExhibition.walls.length > 1}<button class="wall-delete" on:click|stopPropagation={() => gameStore.deleteWall(currentExhibition.id, wall.id)}>×</button>{/if}
                </div>
              {/each}
            </div>
            {#if selectedWall}
              <div class="wall-properties">
                <h4>墙面设置</h4>
                <label class="form-item"><span>墙面名称</span>
                  <input type="text" value={selectedWall.name} on:input={(e) => gameStore.updateWall(currentExhibition.id, selectedWall.id, { name: (e.target as HTMLInputElement).value })} />
                </label>
                <label class="form-item"><span>墙面纹理</span>
                  <select value={selectedWall.textureType} on:change={(e) => gameStore.updateWall(currentExhibition.id, selectedWall.id, { textureType: (e.target as HTMLSelectElement).value as any })}>
                    {#each TEXTURE_TYPES as t}<option value={t.key}>{t.label}</option>{/each}
                  </select>
                </label>
                <label class="form-item"><span>墙面颜色</span>
                  <input type="color" value={selectedWall.backgroundColor} on:input={(e) => gameStore.updateWall(currentExhibition.id, selectedWall.id, { backgroundColor: (e.target as HTMLInputElement).value })} />
                </label>
                <button class="btn btn-secondary btn-full" on:click={() => gameStore.autoLayoutWall(currentExhibition.id, selectedWall.id)}>📐 自动排布</button>
              </div>
              {#if selectedPlacement}
                <div class="placement-props">
                  <h4>作品属性</h4>
                  <label class="form-item"><span>画框样式</span>
                    <select value={selectedPlacement.frameStyle} on:change={(e) => gameStore.updatePlacement(currentExhibition.id, selectedWall.id, selectedPlacement.workId, { frameStyle: (e.target as HTMLSelectElement).value as any })}>
                      {#each FRAME_STYLES as f}<option value={f}>{f}</option>{/each}
                    </select>
                  </label>
                  <label class="form-item"><span>画框颜色</span>
                    <input type="color" value={selectedPlacement.frameColor} on:input={(e) => gameStore.updatePlacement(currentExhibition.id, selectedWall.id, selectedPlacement.workId, { frameColor: (e.target as HTMLInputElement).value })} />
                  </label>
                  <label class="form-item"><span>衬边 {selectedPlacement.matWidth}px</span>
                    <input type="range" min="0" max="40" value={selectedPlacement.matWidth} on:input={(e) => gameStore.updatePlacement(currentExhibition.id, selectedWall.id, selectedPlacement.workId, { matWidth: Number((e.target as HTMLInputElement).value) })} />
                  </label>
                  <label class="form-item"><span>聚光 {Math.round(selectedPlacement.spotLightIntensity * 100)}%</span>
                    <input type="range" min="0" max="1" step="0.05" value={selectedPlacement.spotLightIntensity} on:input={(e) => gameStore.updatePlacement(currentExhibition.id, selectedWall.id, selectedPlacement.workId, { spotLightIntensity: Number((e.target as HTMLInputElement).value) })} />
                  </label>
                  <label class="form-item"><span>旋转 {Math.round(selectedPlacement.rotation)}°</span>
                    <input type="range" min="-15" max="15" step="0.5" value={selectedPlacement.rotation} on:input={(e) => gameStore.updatePlacement(currentExhibition.id, selectedWall.id, selectedPlacement.workId, { rotation: Number((e.target as HTMLInputElement).value) })} />
                  </label>
                  <button class="btn btn-danger btn-full" on:click={() => gameStore.removePlacement(currentExhibition.id, selectedWall.id, selectedPlacement.workId)}>🗑 移除</button>
                </div>
              {/if}
            {/if}
          </div>
          <div class="wall-preview-area">
            <div class="preview-toolbar">
              <button class="tb-btn {systemState.isEditingPlacement ? 'active' : ''}" on:click={() => gameStore.setEditingPlacement(!systemState.isEditingPlacement)}>
                {systemState.isEditingPlacement ? '🔓 编辑中' : '🔒 锁定'}
              </button>
              <button class="tb-btn" on:click={addRouteForCurrentWall}>🧭 加入动线</button>
              <div class="tb-spacer" />
              <button class="tb-btn {systemState.showWorkCaptions ? 'active' : ''}" on:click={() => gameStore.toggleShowCaptions()}>🏷 标题</button>
              <button class="tb-btn {systemState.showSpotlights ? 'active' : ''}" on:click={() => gameStore.toggleShowSpotlights()}>💡 灯光</button>
            </div>
            <div class="wall-canvas-wrapper" on:dragover|preventDefault on:drop={handlePhotoDropOnWall}>
              <div class="wall-canvas texture-{selectedWall?.textureType || 'smooth'}" bind:this={wallCanvas}
                style="background-color: {selectedWall?.backgroundColor || '#f5f0e8'}; aspect-ratio: {selectedWall ? selectedWall.width + ' / ' + selectedWall.height : '2 / 1'};"
                on:click={(e) => { if (e.target === wallCanvas) gameStore.selectPlacement(null); }}
              >
                {#if selectedWall?.placements.length === 0}
                  <div class="empty-wall-hint"><div class="hint-icon">🎨</div><p>从下方拖拽或点击照片添加到墙面</p></div>
                {/if}
                {#each selectedWall?.placements || [] as placement (placement.workId)}
                  {#const photo = getPhotoInfo(placement.photoId)}
                  {@const isSelected = systemState.selectedPlacementId === placement.workId}
                  {@const isInRoute = currentExhibition.route.some(r => r.placementId === placement.workId)}
                  <div class="placement-frame frame-style-{placement.frameStyle}"
                    style="left: {(placement.x / (selectedWall?.width || 1)) * 100}%; top: {(placement.y / (selectedWall?.height || 1)) * 100}%; width: {(placement.width / (selectedWall?.width || 1)) * 100}%; height: {(placement.height / (selectedWall?.height || 1)) * 100}%; transform: rotate({placement.rotation}deg); border-color: {placement.frameStyle !== 'none' ? placement.frameColor : 'transparent'}; box-shadow: {isSelected ? '0 0 0 3px #4a90d9, 0 12px 40px rgba(0,0,0,0.5)' : '0 8px 32px rgba(0,0,0,0.35)'};"
                    class:selected={isSelected}
                    on:mousedown={(e) => handlePlacementMouseDown(e, placement)}
                    on:click|stopPropagation={() => gameStore.selectPlacement(placement.workId)}
                  >
                    {#if systemState.showSpotlights && placement.spotLightIntensity > 0}
                      <div class="spotlight" style="opacity: {placement.spotLightIntensity * 0.7}; background: radial-gradient(ellipse at center top, {placement.spotLightColor} 0%, transparent 70%);" />
                    {/if}
                    <div class="mat-layer" style="padding: {(placement.matWidth / Math.max(placement.width, 1)) * 200}%; background: {placement.matColor};">
                      <div class="work-image-wrapper">{#if photo}<img src={photo.imageDataUrl} alt="" draggable={false} />{/if}</div>
                    </div>
                    {#if isInRoute}<div class="route-badge">🧭 {currentExhibition.route.findIndex(r => r.placementId === placement.workId) + 1}</div>{/if}
                    {#if isSelected && systemState.isEditingPlacement}
                      <div class="resize-handle" on:mousedown|stopPropagation={(e) => handlePlacementResize(e, placement)}>⇲</div>
                    {/if}
                    {#if !isInRoute}
                      <button class="quick-route-btn" on:click|stopPropagation={() => addRouteForPlacement(placement.workId)}>+🧭</button>
                    {/if}
                  </div>
                  {/const}
                {/each}
              </div>
            </div>
            <div class="quick-drop-area">
              <h4>快速添加作品</h4>
              {#if processedPhotos.length === 0}<p class="hint">暂无作品</p>
              {:else}
                <div class="quick-photos">
                  {#each processedPhotos.slice(0, 40) as photo (photo.id)}
                    <div class="quick-photo {allPlacedPhotoIds.has(photo.id) ? 'placed' : ''}" draggable="true"
                      on:dragstart={(e) => handlePhotoDragStart(e, photo.id)}
                      on:click={() => {
                        if (!currentExhibition || !selectedWall) return;
                        const p = selectedWall.placements.length;
                        const cols = Math.ceil(Math.sqrt((p + 1) * 2));
                        const row = Math.floor(p / cols); const col = p % cols;
                        const pw = (selectedWall.width * 0.8) / cols * 0.75;
                        const ph = pw * 1.33;
                        const px = selectedWall.width * 0.1 + col * ((selectedWall.width * 0.8) / cols) + ((selectedWall.width * 0.8 / cols) - pw) / 2;
                        const py = selectedWall.height * 0.1 + row * ((selectedWall.height * 0.8) / Math.ceil((p + 1) / cols)) + 10;
                        gameStore.addPlacementToWall(currentExhibition.id, selectedWall.id, photo.id, px, py);
                      }}
                      title={allPlacedPhotoIds.has(photo.id) ? '已添加' : '点击添加'}
                    >
                      <img src={photo.imageDataUrl} alt="" />
                      <div class="qp-grade grade-{photo.details.grade}">{photo.details.grade}</div>
                    </div>
                  {/each}
                </div>
              {/if}
            </div>
          </div>
        </div>

      {:else if systemState.activeTab === 'route'}
        <div class="tab-route">
          <div class="route-intro"><h3>🎯 观展动线设计</h3><p>为观众规划最佳观赏路径，设置停留点解说词和停留时间</p></div>
          <div class="route-content">
            <div class="route-stops-area">
              <div class="stops-header"><h4>站点 ({currentExhibition.route.length})</h4>
                <button class="btn btn-small btn-secondary" disabled={!selectedWall} on:click={addRouteForCurrentWall}>+ 添加整墙</button>
              </div>
              {#if currentExhibition.route.length === 0}
                <div class="empty-mini"><div class="empty-icon">🧭</div><p>还没有规划动线</p><p class="hint-small">在「墙面预览」中点击 🧭 按钮添加站点</p></div>
              {:else}
                <div class="route-stops-list">
                  {#each currentExhibition.route as stop, idx (stop.stopIndex)}
                    {#const wall = currentExhibition.walls.find(w => w.id === stop.wallId)}
                    {#const placement = stop.placementId ? wall?.placements.find(p => p.workId === stop.placementId) : null}
                    {#const photo = placement ? getPhotoInfo(placement.photoId) : null}
                    <div class="route-stop-card">
                      <div class="stop-index">{idx + 1}</div>
                      <div class="stop-visual">{#if photo}<img src={photo.imageDataUrl} alt="" />{:else if wall}<div class="wall-thumb">🖼 {wall.placements.length}件</div>{/if}</div>
                      <div class="stop-main">
                        <div class="stop-title">{#if placement && photo}作品：{getPhotoSubjectName(photo.id)}{:else if wall}墙面：{wall.name}{/if}</div>
                        <label class="stop-narration"><span>解说词</span>
                          <textarea rows="2" placeholder="为这一站添加解说文字..." value={stop.narration || ''}
                            on:input={(e) => gameStore.updateRouteStop(currentExhibition.id, idx, { narration: (e.target as HTMLTextAreaElement).value })} />
                        </label>
                        <div class="stop-settings">
                          <label><span>停留 {stop.dwellTime}秒</span>
                            <input type="range" min="3" max="30" value={stop.dwellTime} on:input={(e) => gameStore.updateRouteStop(currentExhibition.id, idx, { dwellTime: Number((e.target as HTMLInputElement).value) })} />
                          </label>
                          <label><span>聚焦 {Math.round(stop.focusZoom * 100)}%</span>
                            <input type="range" min="1" max="2" step="0.1" value={stop.focusZoom} on:input={(e) => gameStore.updateRouteStop(currentExhibition.id, idx, { focusZoom: Number((e.target as HTMLInputElement).value) })} />
                          </label>
                        </div>
                      </div>
                      <div class="stop-actions">
                        {#if idx > 0}<button class="action-btn" on:click={() => gameStore.reorderRouteStop(currentExhibition.id, idx, idx - 1)}>↑</button>{/if}
                        {#if idx < currentExhibition.route.length - 1}<button class="action-btn" on:click={() => gameStore.reorderRouteStop(currentExhibition.id, idx, idx + 1)}>↓</button>{/if}
                        <button class="action-btn danger" on:click={() => gameStore.removeRouteStop(currentExhibition.id, idx)}>×</button>
                      </div>
                    </div>
                  {/each}
                </div>
              {/if}
            </div>
            <div class="route-summary">
              <h4>动线摘要</h4>
              <div class="summary-cards">
                <div class="s-card"><div class="s-value">{currentExhibition.route.length}</div><div class="s-label">站点数</div></div>
                <div class="s-card"><div class="s-value">{currentExhibition.route.reduce((s, r) => s + r.dwellTime, 0)}</div><div class="s-label">总时长(秒)</div></div>
                <div class="s-card"><div class="s-value">{currentExhibition.route.filter(r => r.placementId).length}</div><div class="s-label">作品聚焦</div></div>
                <div class="s-card"><div class="s-value">{new Set(currentExhibition.route.map(r => r.wallId)).size}</div><div class="s-label">涉及墙面</div></div>
              </div>
              <div class="route-visual-timeline">
                <div class="timeline-track">
                  {#each currentExhibition.route as stop, idx}
                    <div class="tl-node"><div class="tl-dot" /><div class="tl-label">{idx + 1}</div></div>
                    {#if idx < currentExhibition.route.length - 1}<div class="tl-line" style="width: {Math.max(20, stop.dwellTime * 2)}px" />{/if}
                  {/each}
                </div>
              </div>
            </div>
          </div>
        </div>

      {:else if systemState.activeTab === 'feedback'}
        <div class="tab-feedback">
          <div class="feedback-split">
            <div class="submit-area">
              <h3>📝 观众评价采集</h3>
              <div class="feedback-form">
                <div class="ff-row">
                  <label class="form-item"><span>观众姓名</span>
                    <input type="text" bind:value={fbVisitorName} placeholder="选填，匿名也可" />
                  </label>
                  <label class="form-item"><span>观众类型</span>
                    <select bind:value={fbVisitorType}>
                      {#each VISITOR_TYPES as v}<option value={v.key}>{v.label}</option>{/each}
                    </select>
                  </label>
                </div>
                <div class="rating-blocks">
                  <div class="rb-item"><span>整体体验</span>
                    <div class="star-input">{#each [1,2,3,4,5] as i}<button class="s-btn {i <= fbOverallRating ? 'on' : ''}" on:click={() => fbOverallRating = i}>{i <= fbOverallRating ? '★' : '☆'}</button>{/each}</div>
                  </div>
                  <div class="rb-item"><span>策展水平</span>
                    <div class="star-input">{#each [1,2,3,4,5] as i}<button class="s-btn {i <= fbcurationRating ? 'on' : ''}" on:click={() => fbcurationRating = i}>{i <= fbcurationRating ? '★' : '☆'}</button>{/each}</div>
                  </div>
                  <div class="rb-item"><span>作品丰富度</span>
                    <div class="star-input">{#each [1,2,3,4,5] as i}<button class="s-btn {i <= fbVarietyRating ? 'on' : ''}" on:click={() => fbVarietyRating = i}>{i <= fbVarietyRating ? '★' : '☆'}</button>{/each}</div>
                  </div>
                  <div class="rb-item"><span>动线设计</span>
                    <div class="star-input">{#each [1,2,3,4,5] as i}<button class="s-btn {i <= fbFlowRating ? 'on' : ''}" on:click={() => fbFlowRating = i}>{i <= fbFlowRating ? '★' : '☆'}</button>{/each}</div>
                  </div>
                  <div class="rb-item"><span>灯光氛围</span>
                    <div class="star-input">{#each [1,2,3,4,5] as i}<button class="s-btn {i <= fbLightingRating ? 'on' : ''}" on:click={() => fbLightingRating = i}>{i <= fbLightingRating ? '★' : '☆'}</button>{/each}</div>
                  </div>
                </div>
                <label class="form-item"><span>情感反馈</span>
                  <div class="emotion-picks">
                    {#each EMOTIONS as em}
                      <button class="em-pick {fbEmotion === em.key ? 'active' : ''}" on:click={() => fbEmotion = fbEmotion === em.key ? '' : em.key}>
                        <span>{em.icon}</span><span>{em.label}</span>
                      </button>
                    {/each}
                  </div>
                </label>
                {#if allExhibitionPhotos.length > 0}
                  <label class="form-item"><span>最喜欢的作品</span>
                    <select bind:value={fbFavoriteWorkId}>
                      <option value="">-- 不指定 --</option>
                      {#each allExhibitionPhotos as p (p.id)}
                        <option value={p.id}>{getPhotoSubjectName(p.id)} · {p.details.grade}</option>
                      {/each}
                    </select>
                  </label>
                {/if}
                <label class="form-item full"><span>评论留言</span>
                  <textarea rows="3" bind:value={fbComments} placeholder="分享您的观展感受..." />
                </label>
                <label class="form-item"><span>标签</span>
                  <div class="tags-input-wrap">
                    <div class="active-tags">{#each fbTags as t}<span class="chip">#{t}<button on:click={() => removeTag(t)}>×</button></span>{/each}</div>
                    <div class="tag-input-row">
                      <input type="text" bind:value={fbTagInput} placeholder="输入关键词后回车" on:keydown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())} />
                      <button class="btn btn-small btn-secondary" on:click={addTag}>添加</button>
                    </div>
                  </div>
                </label>
                <button class="btn btn-primary btn-full" on:click={submitFeedback}>📨 提交评价</button>
              </div>
            </div>
            <div class="feedbacks-list-area">
              <div class="list-header">
                <h4>观众评价 ({currentExhibition.statistics.feedbackCount})</h4>
                {#if currentExhibition.statistics.feedbackCount > 0}<div class="rating-big">⭐ {currentExhibition.statistics.avgOverallRating.toFixed(1)}</div>{/if}
              </div>
              {#if currentExhibition.feedbacks.length === 0}
                <div class="empty-mini"><p>还没有观众评价</p><p class="hint-small">填写上方表单采集第一条评价吧</p></div>
              {:else}
                <div class="feedbacks-scroll">
                  {#each [...currentExhibition.feedbacks].reverse() as fb (fb.id)}
                    <div class="feedback-card">
                      <div class="fb-header">
                        <div class="fb-visitor">
                          <span class="fb-avatar">{VISITOR_TYPES.find(v => v.key === fb.visitorType)?.icon || '👤'}</span>
                          <div><div class="fb-name">{fb.visitorName}</div><div class="fb-type">{VISITOR_TYPES.find(v => v.key === fb.visitorType)?.label || fb.visitorType}</div></div>
                        </div>
                        <div class="fb-rating">{renderStars(fb.overallRating)}</div>
                      </div>
                      <div class="fb-ratings-grid">
                        <div class="mini-rating"><span>策展</span><div class="mini-stars">{renderStars(fb.curationRating)}</div></div>
                        <div class="mini-rating"><span>丰富</span><div class="mini-stars">{renderStars(fb.varietyRating)}</div></div>
                        <div class="mini-rating"><span>动线</span><div class="mini-stars">{renderStars(fb.flowRating)}</div></div>
                        <div class="mini-rating"><span>灯光</span><div class="mini-stars">{renderStars(fb.lightingRating)}</div></div>
                      </div>
                      {#if fb.emotionalResponse}
                        <div class="fb-emotion"><span class="emotion-icon">{EMOTIONS.find(e => e.key === fb.emotionalResponse)?.icon}</span>
                          <span>{EMOTIONS.find(e => e.key === fb.emotionalResponse)?.label}</span>
                        </div>
                      {/if}
                      {#if fb.comments}<div class="fb-comments">"{fb.comments}"</div>{/if}
                      {#if fb.favoriteWorkId && getPhotoInfo(fb.favoriteWorkId)}
                        <div class="fb-favorite"><span>❤️ 最爱：</span>
                          <img src={getPhotoInfo(fb.favoriteWorkId)!.imageDataUrl} class="fav-thumb" />
                          <span>{getPhotoSubjectName(fb.favoriteWorkId)}</span>
                        </div>
                      {/if}
                      {#if fb.tags.length > 0}<div class="fb-tags">{#each fb.tags as tag}<span class="tag">#{tag}</span>{/each}</div>{/if}
                      <div class="fb-meta"><span>⏱ {fb.visitDuration}分</span><span>👁 {fb.worksViewed}件</span><span>{formatDate(fb.timestamp)}</span></div>
                    </div>
                  {/each}
                </div>
              {/if}
            </div>
          </div>
        </div>

      {:else if systemState.activeTab === 'statistics'}
        <div class="tab-statistics">
          <h3>📊 展览数据分析</h3>
          {#if currentExhibition.statistics.feedbackCount === 0}
            <div class="empty-state"><div class="empty-icon">📊</div><h4>暂无数据</h4><p>采集一些观众评价后显示统计分析</p></div>
          {:else}
            <div class="stats-overview">
              <div class="stat-card highlight"><div class="stat-icon">👥</div><div class="stat-info"><div class="stat-value">{currentExhibition.statistics.totalVisits}</div><div class="stat-label">总访问量</div></div></div>
              <div class="stat-card highlight"><div class="stat-icon">⭐</div><div class="stat-info"><div class="stat-value">{currentExhibition.statistics.avgOverallRating.toFixed(1)}</div><div class="stat-label">综合评分</div></div></div>
              <div class="stat-card"><div class="stat-icon">⏱</div><div class="stat-info"><div class="stat-value">{currentExhibition.statistics.avgDuration.toFixed(0)}</div><div class="stat-label">平均时长(分)</div></div></div>
              <div class="stat-card"><div class="stat-icon">📝</div><div class="stat-info"><div class="stat-value">{currentExhibition.statistics.feedbackCount}</div><div class="stat-label">有效评价</div></div></div>
            </div>
            <div class="stats-detail-grid">
              <div class="detail-panel"><h4>维度评分</h4><div class="bar-chart">
                {#each [
                  { label: '策展水平', value: currentExhibition.statistics.avgCurationRating },
                  { label: '作品丰富度', value: currentExhibition.statistics.avgVarietyRating },
                  { label: '动线设计', value: currentExhibition.statistics.avgFlowRating },
                  { label: '灯光氛围', value: currentExhibition.statistics.avgLightingRating }
                ] as {label: string; value: number}[]}
                  <div class="bar-row"><div class="bar-label">{item.label}</div>
                    <div class="bar-track"><div class="bar-fill" style="width: {(item.value / 5) * 100}%" /></div>
                    <div class="bar-value">{item.value.toFixed(1)}</div>
                  </div>
                {/each}
              </div></div>
              <div class="detail-panel"><h4>观众构成</h4><div class="pie-simple">
                {#each currentExhibition.statistics.visitorTypeDistribution as item}
                  {@const pct = currentExhibition.statistics.feedbackCount > 0 ? Math.round(item.count / currentExhibition.statistics.feedbackCount * 100) : 0}
                  <div class="pie-row">
                    <div class="pie-icon">{VISITOR_TYPES.find(v => v.key === item.type)?.icon || '👤'}</div>
                    <div class="pie-name">{VISITOR_TYPES.find(v => v.key === item.type)?.label || item.type}</div>
                    <div class="pie-bar"><div class="pie-fill" style="width: {pct}%" /></div>
                    <div class="pie-count">{item.count}人 ({pct}%)</div>
                  </div>
                {/each}
              </div></div>
              <div class="detail-panel"><h4>情感反馈</h4><div class="emotion-list">
                {#each currentExhibition.statistics.commonEmotions as item}
                  {@const pct = currentExhibition.statistics.feedbackCount > 0 ? Math.round(item.count / currentExhibition.statistics.feedbackCount * 100) : 0}
                  <div class="emotion-item">
                    <span class="e-icon">{EMOTIONS.find(e => e.key === item.emotion)?.icon || '❔'}</span>
                    <span class="e-label">{EMOTIONS.find(e => e.key === item.emotion)?.label || item.emotion}</span>
                    <div class="e-bar"><div class="e-fill" style="width: {pct}%" /></div>
                    <span class="e-count">{item.count}</span>
                  </div>
                {/each}
              </div></div>
              <div class="detail-panel"><h4>🏆 最受欢迎作品</h4><div class="works-ranking">
                {#each currentExhibition.statistics.topRatedWorks.slice(0, 5) as item, rank}
                  {#if getPhotoInfo(item.photoId)}
                    <div class="rank-item">
                      <div class="rank-num rank-{rank + 1}">{rank + 1}</div>
                      <img src={getPhotoInfo(item.photoId)!.imageDataUrl} class="rank-thumb" />
                      <div class="rank-info">
                        <div class="rank-name">{getPhotoSubjectName(item.photoId)}</div>
                        <div class="rank-meta"><span>⭐ {item.rating.toFixed(1)}</span><span>❤️ {item.mentions}次</span></div>
                      </div>
                    </div>
                  {/if}
                {/each}
              </div></div>
            </div>
          {/if}
          <div class="exhibition-basic-stats">
            <h4>展览基础信息</h4>
            <div class="basic-grid">
              <div class="basic-item"><span class="bi-label">分组数</span><span class="bi-value">{currentExhibition.groups.length}</span></div>
              <div class="basic-item"><span class="bi-label">墙面数</span><span class="bi-value">{currentExhibition.walls.length}</span></div>
              <div class="basic-item"><span class="bi-label">作品总数</span><span class="bi-value">{currentExhibition.walls.reduce((s, w) => s + w.placements.length, 0)}</span></div>
              <div class="basic-item"><span class="bi-label">动线路径</span><span class="bi-value">{currentExhibition.route.length} 站</span></div>
              <div class="basic-item"><span class="bi-label">创建时间</span><span class="bi-value">{formatDate(currentExhibition.createdAt)}</span></div>
              <div class="basic-item"><span class="bi-label">更新时间</span><span class="bi-value">{formatDate(currentExhibition.updatedAt)}</span></div>
            </div>
          </div>
        </div>
      {/if}
    </div>

    {#if showCreateExhibition}
      <div class="sub-modal">
        <div class="sm-overlay" on:click={() => (showCreateExhibition = false)} />
        <div class="sm-content">
          <h3>创建新展览</h3>
          <label class="form-item"><span>展览标题 *</span>
            <input type="text" bind:value={newExhibitionTitle} placeholder="输入展览标题" on:keydown={(e) => e.key === 'Enter' && createExhibition()} />
          </label>
          <div class="sm-actions">
            <button class="btn btn-secondary" on:click={() => (showCreateExhibition = false)}>取消</button>
            <button class="btn btn-primary" disabled={!newExhibitionTitle.trim()} on:click={createExhibition}>创建</button>
          </div>
        </div>
      </div>
    {/if}
    {#if showCreateGroup}
      <div class="sub-modal">
        <div class="sm-overlay" on:click={() => (showCreateGroup = false)} />
        <div class="sm-content">
          <h3>创建作品分组</h3>
          <label class="form-item"><span>分组名称 *</span>
            <input type="text" bind:value={newGroupName} placeholder="如：人像系列、风景组曲..." on:keydown={(e) => e.key === 'Enter' && createGroup()} />
          </label>
          <label class="form-item"><span>标识颜色</span><input type="color" bind:value={newGroupColor} /></label>
          <div class="sm-actions">
            <button class="btn btn-secondary" on:click={() => (showCreateGroup = false)}>取消</button>
            <button class="btn btn-primary" disabled={!newGroupName.trim()} on:click={createGroup}>创建</button>
          </div>
        </div>
      </div>
    {/if}
    {#if showCreateWall}
      <div class="sub-modal">
        <div class="sm-overlay" on:click={() => (showCreateWall = false)} />
        <div class="sm-content">
          <h3>添加新墙面</h3>
          <label class="form-item"><span>墙面名称 *</span>
            <input type="text" bind:value={newWallName} placeholder="如：东墙、主展示墙..." on:keydown={(e) => e.key === 'Enter' && createWall()} />
          </label>
          <div class="sm-actions">
            <button class="btn btn-secondary" on:click={() => (showCreateWall = false)}>取消</button>
            <button class="btn btn-primary" disabled={!newWallName.trim()} on:click={createWall}>添加</button>
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
  .exhibition-modal { position: fixed; inset: 0; z-index: 120; display: flex; align-items: center; justify-content: center; animation: fadeIn 0.2s ease; }
  .modal-overlay { position: absolute; inset: 0; background: rgba(10,6,3,0.88); backdrop-filter: blur(10px); }
  .modal-container { position: relative; width: min(1400px, 96vw); height: min(880px, 94vh); background: linear-gradient(180deg, #1f1610 0%, #14100c 100%); border: 1px solid rgba(212, 165, 116, 0.25); border-radius: 20px; box-shadow: 0 40px 100px rgba(0,0,0,0.7); display: flex; flex-direction: column; overflow: hidden; color: #e8ddd0; font-family: Georgia, 'Noto Serif SC', serif; }
  .modal-header { display: flex; align-items: center; justify-content: space-between; padding: 18px 28px; border-bottom: 1px solid rgba(212,165,116,0.18); background: linear-gradient(90deg, rgba(212,165,116,0.07), transparent); }
  .header-left { display: flex; align-items: center; gap: 14px; }
  .curator-icon { font-size: 34px; filter: drop-shadow(0 2px 8px rgba(212,165,116,0.3)); }
  .title-area h2 { margin: 0; font-size: 22px; font-weight: 600; color: #d4a574; letter-spacing: 0.5px; }
  .title-area p { margin: 2px 0 0; font-size: 12px; color: #8a7e6f; font-style: italic; }
  .header-right { display: flex; align-items: center; gap: 12px; }
  .exhibition-selector { display: flex; align-items: center; gap: 8px; }
  .exhibition-selector select { background: #2a1f17; border: 1px solid rgba(212,165,116,0.3); color: #e8ddd0; padding: 8px 12px; border-radius: 8px; font-family: inherit; font-size: 14px; max-width: 200px; }
  .status-badge { padding: 4px 10px; border-radius: 20px; font-size: 11px; color: white; font-weight: 500; }
  .btn { padding: 9px 16px; border: none; border-radius: 10px; font-size: 13px; font-family: inherit; cursor: pointer; transition: all 0.2s; font-weight: 500; }
  .btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .btn-primary { background: linear-gradient(135deg, #d4a574, #b8864f); color: #1a140e; }
  .btn-primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(212,165,116,0.4); }
  .btn-secondary { background: rgba(212,165,116,0.12); color: #d4a574; border: 1px solid rgba(212,165,116,0.25); }
  .btn-secondary:hover:not(:disabled) { background: rgba(212,165,116,0.2); }
  .btn-danger { background: rgba(192,57,43,0.18); color: #e74c3c; border: 1px solid rgba(192,57,43,0.35); }
  .btn-danger:hover:not(:disabled) { background: rgba(192,57,43,0.3); }
  .btn-small { padding: 6px 10px; font-size: 12px; border-radius: 7px; }
  .btn-full { width: 100%; margin-top: 8px; }
  .btn-close { background: transparent; border: none; color: #8a7e6f; font-size: 28px; padding: 4px 10px; cursor: pointer; line-height: 1; }
  .btn-close:hover { color: #e8ddd0; }

  .tabs-nav { display: flex; gap: 2px; padding: 0 18px; background: rgba(0,0,0,0.2); border-bottom: 1px solid rgba(212,165,116,0.15); }
  .tab-btn { display: flex; align-items: center; gap: 7px; background: transparent; border: none; color: #8a7e6f; padding: 14px 18px; cursor: pointer; font-family: inherit; font-size: 13.5px; border-bottom: 2.5px solid transparent; transition: all 0.2s; }
  .tab-btn:hover { color: #c9b89a; background: rgba(212,165,116,0.05); }
  .tab-btn.active { color: #d4a574; border-bottom-color: #d4a574; background: rgba(212,165,116,0.08); }
  .tab-icon { font-size: 17px; }

  .content-area { flex: 1; overflow: auto; padding: 24px; }
  .content-area::-webkit-scrollbar { width: 8px; height: 8px; }
  .content-area::-webkit-scrollbar-track { background: rgba(255,255,255,0.02); }
  .content-area::-webkit-scrollbar-thumb { background: rgba(212,165,116,0.3); border-radius: 4px; }

  .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; min-height: 400px; gap: 12px; text-align: center; }
  .empty-state .empty-icon { font-size: 80px; opacity: 0.5; }
  .empty-state h3 { margin: 0; color: #d4a574; font-size: 22px; }
  .empty-state h4 { margin: 0; color: #c9b89a; font-size: 18px; }
  .empty-state p { margin: 0; color: #8a7e6f; }
  .empty-mini { padding: 40px; text-align: center; color: #8a7e6f; }
  .empty-mini .empty-icon { font-size: 44px; margin-bottom: 8px; opacity: 0.6; }
  .hint { color: #8a7e6f; font-size: 13px; margin: 4px 0; }
  .hint-small { color: #6e6357; font-size: 12px; margin-top: 4px; }

  .tab-groups { display: grid; grid-template-columns: 320px 1fr; gap: 20px; height: 100%; min-height: 600px; }
  .groups-sidebar { display: flex; flex-direction: column; gap: 14px; overflow-y: auto; padding-right: 4px; }
  .sidebar-header { display: flex; align-items: center; justify-content: space-between; }
  .sidebar-header h3 { margin: 0; font-size: 16px; color: #d4a574; }
  .groups-list { display: flex; flex-direction: column; gap: 4px; }
  .group-item { display: flex; align-items: center; gap: 10px; padding: 11px 13px; border-radius: 10px; cursor: pointer; transition: all 0.15s; border: 1px solid transparent; }
  .group-item:hover { background: rgba(212,165,116,0.06); }
  .group-item.active { background: rgba(212,165,116,0.12); border-color: rgba(212,165,116,0.3); }
  .group-item.all-group { margin-bottom: 6px; border-bottom: 1px solid rgba(212,165,116,0.1); padding-bottom: 14px; border-radius: 0; }
  .group-dot { width: 11px; height: 11px; border-radius: 50%; flex-shrink: 0; box-shadow: 0 0 8px currentColor; opacity: 0.8; }
  .group-info { flex: 1; min-width: 0; }
  .group-name { font-size: 13.5px; color: #e8ddd0; font-weight: 500; display: block; }
  .group-desc { font-size: 11px; color: #8a7e6f; margin-top: 2px; display: block; }
  .group-count { background: rgba(212,165,116,0.15); color: #d4a574; padding: 2px 9px; border-radius: 20px; font-size: 11px; font-weight: 500; }
  .group-delete { background: transparent; border: none; color: #8a7e6f; cursor: pointer; font-size: 18px; padding: 2px 6px; border-radius: 4px; }
  .group-delete:hover { color: #e74c3c; background: rgba(192,57,43,0.1); }
  .group-detail { background: rgba(0,0,0,0.25); padding: 14px; border-radius: 12px; border: 1px solid rgba(212,165,116,0.12); }
  .group-detail h4 { margin: 0 0 10px; color: #d4a574; font-size: 14px; }
  .group-photos-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 7px; }
  .group-photo-card { position: relative; aspect-ratio: 1/1.33; border-radius: 6px; overflow: hidden; cursor: default; }
  .group-photo-card img { width: 100%; height: 100%; object-fit: cover; }
  .photo-score { position: absolute; top: 4px; left: 4px; background: rgba(0,0,0,0.7); color: #d4a574; padding: 1px 6px; font-size: 10px; border-radius: 4px; font-weight: 600; }
  .remove-btn { position: absolute; top: 2px; right: 2px; background: rgba(192,57,43,0.85); border: none; color: white; width: 20px; height: 20px; border-radius: 50%; cursor: pointer; font-size: 13px; line-height: 1; display: flex; align-items: center; justify-content: center; }
  .remove-btn:hover { background: #e74c3c; }

  .photos-pool { background: rgba(0,0,0,0.2); border-radius: 14px; padding: 18px; border: 1px solid rgba(212,165,116,0.1); display: flex; flex-direction: column; overflow: hidden; }
  .pool-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
  .pool-header h3 { margin: 0; font-size: 16px; color: #d4a574; }
  .pool-count { color: #8a7e6f; font-size: 12px; }
  .photos-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; overflow-y: auto; padding-right: 4px; flex: 1; }
  .photo-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(212,165,116,0.12); border-radius: 10px; overflow: hidden; cursor: pointer; transition: all 0.15s; }
  .photo-card:hover { border-color: rgba(212,165,116,0.4); transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.4); }
  .photo-thumb { position: relative; aspect-ratio: 1/1.33; background: #0a0806; }
  .photo-thumb img { width: 100%; height: 100%; object-fit: cover; }
  .photo-grade-badge { position: absolute; top: 6px; right: 6px; padding: 3px 8px; border-radius: 6px; font-weight: 700; font-size: 12px; color: #14100c; }
  .grade-S { background: linear-gradient(135deg, #f1c40f, #e67e22); }
  .grade-A { background: linear-gradient(135deg, #e74c3c, #c0392b); }
  .grade-B { background: linear-gradient(135deg, #3498db, #2980b9); }
  .grade-C { background: linear-gradient(135deg, #2ecc71, #27ae60); }
  .grade-D { background: linear-gradient(135deg, #95a5a6, #7f8c8d); }
  .photo-add-hint { position: absolute; inset: 0; background: rgba(74,144,217,0.85); display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 14px; opacity: 0; transition: opacity 0.15s; }
  .photo-card:hover .photo-add-hint { opacity: 1; }
  .photo-info { padding: 10px 12px; }
  .photo-subject { font-size: 13px; font-weight: 500; color: #e8ddd0; margin-bottom: 4px; }
  .photo-meta { display: flex; justify-content: space-between; font-size: 11px; color: #8a7e6f; margin-bottom: 3px; }
  .photo-date { font-size: 10.5px; color: #6e6357; }

  .tab-themes .themes-panel { max-width: 1100px; margin: 0 auto; display: flex; flex-direction: column; gap: 28px; }
  .exhibition-info-edit { background: rgba(0,0,0,0.2); border-radius: 14px; padding: 22px; border: 1px solid rgba(212,165,116,0.12); }
  .exhibition-info-edit h3, .themes-selection h3 { margin: 0 0 18px; color: #d4a574; font-size: 17px; }
  .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .form-grid .full { grid-column: 1 / -1; }
  .form-item { display: flex; flex-direction: column; gap: 6px; }
  .form-item > span { font-size: 12.5px; color: #a89b8c; font-weight: 500; }
  .form-item input, .form-item select, .form-item textarea { background: #1a140e; border: 1px solid rgba(212,165,116,0.22); border-radius: 8px; padding: 9px 12px; color: #e8ddd0; font-family: inherit; font-size: 13.5px; outline: none; transition: border 0.15s; resize: vertical; }
  .form-item input:focus, .form-item select:focus, .form-item textarea:focus { border-color: #d4a574; box-shadow: 0 0 0 3px rgba(212,165,116,0.15); }

  .themes-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; margin-bottom: 24px; }
  .theme-card { position: relative; background: rgba(0,0,0,0.3); border: 2px solid rgba(212,165,116,0.12); border-radius: 12px; overflow: hidden; cursor: pointer; transition: all 0.2s; }
  .theme-card:hover { transform: translateY(-3px); border-color: rgba(212,165,116,0.4); }
  .theme-card.active { border-color: #d4a574; box-shadow: 0 8px 30px rgba(212,165,116,0.25); }
  .theme-preview { aspect-ratio: 16/10; position: relative; display: flex; flex-direction: column; }
  .preview-wall { flex: 1; display: flex; align-items: center; justify-content: center; gap: 12px; position: relative; }
  .preview-frame { width: 50px; height: 65px; border: 3px solid; border-radius: 2px; background: rgba(0,0,0,0.2); }
  .preview-frame.small { width: 35px; height: 45px; }
  .preview-floor { height: 18px; }
  .theme-info { padding: 12px 14px; }
  .theme-name { font-size: 14px; font-weight: 600; color: #e8ddd0; margin-bottom: 4px; }
  .theme-tags { display: flex; gap: 5px; flex-wrap: wrap; }
  .theme-check { position: absolute; top: 10px; right: 10px; width: 26px; height: 26px; background: #d4a574; color: #1a140e; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; }
  .tag { display: inline-block; padding: 2px 8px; border-radius: 10px; background: rgba(212,165,116,0.12); color: #c9b89a; font-size: 11px; }
  .theme-customizer { background: rgba(0,0,0,0.2); border-radius: 12px; padding: 18px; border: 1px solid rgba(212,165,116,0.1); }
  .theme-customizer h4 { margin: 0 0 14px; color: #d4a574; font-size: 14px; }
  .color-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; }
  .color-item { display: flex; flex-direction: column; gap: 5px; }
  .color-label { font-size: 11.5px; color: #a89b8c; }
  .color-row { display: flex; gap: 6px; }
  .color-row input[type="color"] { width: 34px; height: 34px; border: 1px solid rgba(212,165,116,0.3); border-radius: 6px; background: transparent; padding: 2px; cursor: pointer; }
  .color-hex { flex: 1; background: #1a140e; border: 1px solid rgba(212,165,116,0.2); border-radius: 6px; color: #e8ddd0; padding: 6px 10px; font-size: 12px; font-family: monospace; }

  .tab-walls { display: grid; grid-template-columns: 280px 1fr; gap: 18px; height: 100%; min-height: 650px; }
  .walls-sidebar { display: flex; flex-direction: column; gap: 14px; overflow-y: auto; padding-right: 4px; }
  .walls-list { display: flex; flex-direction: column; gap: 5px; }
  .wall-item { display: flex; align-items: center; gap: 11px; padding: 12px; border-radius: 10px; cursor: pointer; border: 1px solid transparent; transition: all 0.15s; }
  .wall-item:hover { background: rgba(212,165,116,0.06); }
  .wall-item.active { background: rgba(212,165,116,0.12); border-color: rgba(212,165,116,0.3); }
  .wall-order { width: 28px; height: 28px; border-radius: 8px; background: rgba(212,165,116,0.2); color: #d4a574; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; flex-shrink: 0; }
  .wall-info { flex: 1; min-width: 0; }
  .wall-name { display: block; font-size: 13.5px; color: #e8ddd0; font-weight: 500; }
  .wall-count { font-size: 11.5px; color: #8a7e6f; }
  .wall-delete { background: transparent; border: none; color: #8a7e6f; cursor: pointer; font-size: 18px; padding: 2px 6px; border-radius: 4px; }
  .wall-delete:hover { color: #e74c3c; background: rgba(192,57,43,0.1); }
  .wall-properties, .placement-props { background: rgba(0,0,0,0.25); padding: 14px; border-radius: 12px; border: 1px solid rgba(212,165,116,0.1); display: flex; flex-direction: column; gap: 10px; }
  .wall-properties h4, .placement-props h4 { margin: 0 0 4px; color: #d4a574; font-size: 13.5px; }
  .wall-properties .form-item > span, .placement-props .form-item > span { font-size: 11.5px; }
  .wall-properties input[type="range"], .placement-props input[type="range"] { accent-color: #d4a574; }

  .wall-preview-area { display: flex; flex-direction: column; gap: 14px; overflow: hidden; }
  .preview-toolbar { display: flex; align-items: center; gap: 10px; padding: 10px 14px; background: rgba(0,0,0,0.25); border-radius: 10px; border: 1px solid rgba(212,165,116,0.1); }
  .tb-btn { background: rgba(212,165,116,0.1); border: 1px solid rgba(212,165,116,0.2); color: #c9b89a; padding: 7px 13px; border-radius: 8px; cursor: pointer; font-family: inherit; font-size: 12px; transition: all 0.15s; }
  .tb-btn:hover { background: rgba(212,165,116,0.18); color: #e8ddd0; }
  .tb-btn.active { background: rgba(212,165,116,0.25); color: #d4a574; border-color: rgba(212,165,116,0.4); }
  .tb-spacer { flex: 1; }
  .wall-canvas-wrapper { flex: 1; min-height: 300px; display: flex; align-items: center; justify-content: center; padding: 18px; background: rgba(0,0,0,0.3); border-radius: 14px; border: 1px solid rgba(212,165,116,0.1); overflow: auto; }
  .wall-canvas { position: relative; width: 100%; max-height: 60vh; border-radius: 6px; box-shadow: inset 0 0 60px rgba(0,0,0,0.25); overflow: hidden; }
  .texture-canvas { background-image: repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,0.02) 2px, rgba(0,0,0,0.02) 4px); }
  .texture-brick { background-image: linear-gradient(90deg, rgba(0,0,0,0.08) 1px, transparent 1px), linear-gradient(rgba(0,0,0,0.08) 1px, transparent 1px); background-size: 60px 25px; }
  .texture-concrete { background-image: radial-gradient(circle at 20% 30%, rgba(0,0,0,0.06) 1px, transparent 1px), radial-gradient(circle at 70% 60%, rgba(255,255,255,0.04) 1px, transparent 1px); background-size: 30px 30px, 25px 25px; }
  .texture-wood { background-image: repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(0,0,0,0.04) 2px, rgba(0,0,0,0.04) 4px), repeating-linear-gradient(90deg, transparent, transparent 20px, rgba(0,0,0,0.02) 20px, rgba(0,0,0,0.02) 21px); }
  .texture-brick { background-image: linear-gradient(90deg, rgba(0,0,0,0.08) 1px, transparent 1px), linear-gradient(rgba(0,0,0,0.08) 1px, transparent 1px); background-size: 60px 25px, 30px 12.5px; }
  .empty-wall-hint { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; color: rgba(0,0,0,0.4); pointer-events: none; }
  .empty-wall-hint .hint-icon { font-size: 48px; opacity: 0.6; }
  .empty-wall-hint p { margin: 0; font-size: 13px; }
  .empty-wall-hint .sub-hint { font-size: 11px; opacity: 0.7; }

  .placement-frame { position: absolute; box-sizing: border-box; border-width: 0; border-style: solid; cursor: pointer; transition: box-shadow 0.15s; background: transparent; }
  .frame-style-minimal { border-width: 3px; }
  .frame-style-classic { border-width: 8px; border-style: double; }
  .frame-style-vintage { border-width: 10px; border-radius: 2px; }
  .frame-style-float { border-width: 2px; box-shadow: 0 0 0 6px rgba(255,255,255,0.05) !important; }
  .placement-frame.selected { z-index: 50 !important; }
  .spotlight { position: absolute; left: -30%; right: -30%; top: -30%; height: 100%; pointer-events: none; z-index: 2; }
  .mat-layer { position: absolute; inset: 0; box-sizing: border-box; display: flex; align-items: center; justify-content: center; }
  .work-image-wrapper { width: 100%; height: 100%; overflow: hidden; position: relative; z-index: 1; }
  .work-image-wrapper img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .route-badge { position: absolute; top: -8px; left: -8px; background: #3498db; color: white; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; z-index: 10; box-shadow: 0 3px 10px rgba(0,0,0,0.3); }
  .resize-handle { position: absolute; bottom: -4px; right: -4px; width: 22px; height: 22px; background: #4a90d9; color: white; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 12px; cursor: nwse-resize; z-index: 20; box-shadow: 0 2px 8px rgba(0,0,0,0.4); }
  .quick-route-btn { position: absolute; top: 4px; right: 4px; background: rgba(52,152,219,0.9); border: none; color: white; padding: 3px 6px; border-radius: 5px; font-size: 11px; cursor: pointer; z-index: 5; opacity: 0; transition: opacity 0.15s; }
  .placement-frame:hover .quick-route-btn { opacity: 1; }

  .quick-drop-area { background: rgba(0,0,0,0.2); border-radius: 12px; padding: 12px 14px; border: 1px solid rgba(212,165,116,0.08); }
  .quick-drop-area h4 { margin: 0 0 10px; color: #a89b8c; font-size: 13px; }
  .quick-photos { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 6px; }
  .quick-photo { position: relative; width: 68px; height: 90px; flex-shrink: 0; border-radius: 5px; overflow: hidden; cursor: pointer; border: 2px solid transparent; transition: all 0.15s; }
  .quick-photo:hover { border-color: #d4a574; transform: translateY(-2px); }
  .quick-photo.placed { opacity: 0.45; cursor: not-allowed; }
  .quick-photo img { width: 100%; height: 100%; object-fit: cover; }
  .qp-grade { position: absolute; bottom: 2px; right: 2px; padding: 1px 5px; border-radius: 3px; font-size: 9.5px; font-weight: 700; color: #14100c; }

  .tab-route { display: flex; flex-direction: column; gap: 20px; max-width: 1100px; margin: 0 auto; }
  .route-intro h3 { margin: 0 0 4px; color: #d4a574; font-size: 18px; }
  .route-intro p { margin: 0; color: #8a7e6f; font-size: 13.5px; }
  .route-content { display: grid; grid-template-columns: 1fr 320px; gap: 20px; }
  .stops-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
  .stops-header h4 { margin: 0; color: #d4a574; font-size: 15px; }
  .route-stops-list { display: flex; flex-direction: column; gap: 10px; max-height: 550px; overflow-y: auto; padding-right: 4px; }
  .route-stop-card { display: grid; grid-template-columns: 40px 80px 1fr auto; gap: 12px; align-items: center; padding: 12px; background: rgba(0,0,0,0.25); border: 1px solid rgba(212,165,116,0.1); border-radius: 12px; }
  .stop-index { width: 38px; height: 38px; border-radius: 50%; background: linear-gradient(135deg, #d4a574, #b8864f); color: #1a140e; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 15px; }
  .stop-visual { width: 80px; height: 100px; border-radius: 6px; overflow: hidden; background: #0a0806; display: flex; align-items: center; justify-content: center; }
  .stop-visual img { width: 100%; height: 100%; object-fit: cover; }
  .wall-thumb { color: #d4a574; font-size: 12px; font-weight: 500; }
  .stop-main { display: flex; flex-direction: column; gap: 7px; min-width: 0; }
  .stop-title { font-weight: 600; color: #e8ddd0; font-size: 13.5px; }
  .stop-narration { display: flex; flex-direction: column; gap: 3px; }
  .stop-narration > span { font-size: 11px; color: #a89b8c; }
  .stop-narration textarea { background: #1a140e; border: 1px solid rgba(212,165,116,0.2); border-radius: 6px; padding: 6px 10px; color: #e8ddd0; font-family: inherit; font-size: 12px; resize: none; outline: none; }
  .stop-narration textarea:focus { border-color: #d4a574; }
  .stop-settings { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .stop-settings label { display: flex; flex-direction: column; gap: 3px; }
  .stop-settings span { font-size: 10.5px; color: #a89b8c; }
  .stop-settings input[type="range"] { accent-color: #d4a574; }
  .stop-actions { display: flex; flex-direction: column; gap: 4px; }
  .action-btn { width: 28px; height: 28px; border-radius: 6px; background: rgba(212,165,116,0.1); border: 1px solid rgba(212,165,116,0.2); color: #c9b89a; cursor: pointer; font-size: 13px; display: flex; align-items: center; justify-content: center; transition: all 0.15s; }
  .action-btn:hover { background: rgba(212,165,116,0.2); color: #d4a574; }
  .action-btn.danger:hover { background: rgba(192,57,43,0.2); color: #e74c3c; border-color: rgba(192,57,43,0.3); }

  .route-summary { background: rgba(0,0,0,0.25); border-radius: 14px; padding: 18px; border: 1px solid rgba(212,165,116,0.1); height: fit-content; position: sticky; top: 0; }
  .route-summary h4 { margin: 0 0 14px; color: #d4a574; font-size: 14.5px; }
  .summary-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 18px; }
  .s-card { background: rgba(212,165,116,0.08); padding: 12px 10px; border-radius: 10px; text-align: center; border: 1px solid rgba(212,165,116,0.1); }
  .s-value { font-size: 24px; font-weight: 700; color: #d4a574; line-height: 1.1; }
  .s-label { font-size: 11px; color: #8a7e6f; margin-top: 3px; }
  .route-visual-timeline { padding: 10px; background: rgba(0,0,0,0.2); border-radius: 8px; overflow-x: auto; }
  .timeline-track { display: flex; align-items: center; min-width: max-content; padding: 20px 4px; }
  .tl-node { display: flex; flex-direction: column; align-items: center; gap: 6px; }
  .tl-dot { width: 16px; height: 16px; border-radius: 50%; background: #d4a574; box-shadow: 0 0 12px rgba(212,165,116,0.5); }
  .tl-label { font-size: 10px; color: #a89b8c; font-weight: 600; }
  .tl-line { height: 2px; background: linear-gradient(90deg, #d4a574, rgba(212,165,116,0.3)); }

  .tab-feedback { max-width: 1200px; margin: 0 auto; }
  .feedback-split { display: grid; grid-template-columns: 1fr 1fr; gap: 22px; }
  .submit-area, .feedbacks-list-area { background: rgba(0,0,0,0.2); border-radius: 14px; padding: 20px; border: 1px solid rgba(212,165,116,0.1); display: flex; flex-direction: column; }
  .submit-area h3 { margin: 0 0 16px; color: #d4a574; font-size: 17px; }
  .feedback-form { display: flex; flex-direction: column; gap: 13px; overflow-y: auto; padding-right: 4px; max-height: 70vh; }
  .ff-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .rating-blocks { display: flex; flex-direction: column; gap: 8px; background: rgba(0,0,0,0.2); padding: 12px; border-radius: 10px; }
  .rb-item { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .rb-item > span { font-size: 12.5px; color: #a89b8c; font-weight: 500; }
  .star-input { display: flex; gap: 3px; }
  .s-btn { background: transparent; border: none; color: #555; cursor: pointer; font-size: 20px; padding: 2px; transition: all 0.1s; }
  .s-btn.on { color: #f1c40f; text-shadow: 0 0 8px rgba(241,196,15,0.4); }
  .s-btn:hover { transform: scale(1.15); }
  .emotion-picks { display: grid; grid-template-columns: repeat(3, 1fr); gap: 7px; }
  .em-pick { background: rgba(212,165,116,0.08); border: 1px solid rgba(212,165,116,0.18); border-radius: 8px; padding: 8px 6px; cursor: pointer; font-family: inherit; color: #c9b89a; display: flex; flex-direction: column; align-items: center; gap: 2px; transition: all 0.15s; }
  .em-pick:hover { background: rgba(212,165,116,0.15); }
  .em-pick.active { background: rgba(212,165,116,0.25); border-color: #d4a574; color: #d4a574; }
  .em-pick span:first-child { font-size: 20px; }
  .em-pick span:last-child { font-size: 11.5px; }
  .tags-input-wrap { display: flex; flex-direction: column; gap: 6px; }
  .active-tags { display: flex; flex-wrap: wrap; gap: 5px; }
  .chip { display: inline-flex; align-items: center; gap: 4px; background: rgba(74,144,217,0.2); color: #6ba3d9; padding: 4px 9px; border-radius: 12px; font-size: 11.5px; border: 1px solid rgba(74,144,217,0.3); }
  .chip button { background: transparent; border: none; color: #6ba3d9; cursor: pointer; font-size: 13px; padding: 0; line-height: 1; }
  .tag-input-row { display: flex; gap: 6px; }
  .tag-input-row input { flex: 1; background: #1a140e; border: 1px solid rgba(212,165,116,0.2); border-radius: 7px; padding: 7px 11px; color: #e8ddd0; font-family: inherit; font-size: 12.5px; outline: none; }
  .tag-input-row input:focus { border-color: #d4a574; }

  .list-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
  .list-header h4 { margin: 0; color: #d4a574; font-size: 15px; }
  .rating-big { font-size: 22px; font-weight: 700; color: #f1c40f; }
  .feedbacks-scroll { display: flex; flex-direction: column; gap: 11px; overflow-y: auto; max-height: 70vh; padding-right: 4px; }
  .feedback-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(212,165,116,0.1); border-radius: 11px; padding: 14px; }
  .fb-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
  .fb-visitor { display: flex; align-items: center; gap: 9px; }
  .fb-avatar { font-size: 28px; }
  .fb-name { font-weight: 600; color: #e8ddd0; font-size: 13.5px; }
  .fb-type { font-size: 11px; color: #8a7e6f; }
  .fb-rating { color: #f1c40f; font-size: 17px; letter-spacing: 1px; }
  .fb-ratings-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 5px 12px; margin-bottom: 10px; padding: 9px 11px; background: rgba(0,0,0,0.2); border-radius: 8px; }
  .mini-rating { display: flex; align-items: center; justify-content: space-between; font-size: 11.5px; }
  .mini-rating > span { color: #a89b8c; }
  .mini-stars { color: #d4a574; font-size: 13px; letter-spacing: 1px; }
  .fb-emotion { display: flex; align-items: center; gap: 6px; margin-bottom: 8px; font-size: 12.5px; color: #c9b89a; }
  .emotion-icon { font-size: 16px; }
  .fb-comments { font-size: 13px; color: #e0d4c4; line-height: 1.55; margin-bottom: 8px; font-style: italic; padding: 8px 11px; background: rgba(212,165,116,0.05); border-left: 3px solid rgba(212,165,116,0.4); border-radius: 0 6px 6px 0; }
  .fb-favorite { display: flex; align-items: center; gap: 7px; margin-bottom: 8px; font-size: 12px; color: #c9b89a; }
  .fav-thumb { width: 36px; height: 48px; object-fit: cover; border-radius: 4px; border: 1px solid rgba(212,165,116,0.3); }
  .fb-tags { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 10px; }
  .fb-tags .tag { background: rgba(74,144,217,0.12); color: #6ba3d9; }
  .fb-meta { display: flex; gap: 14px; font-size: 11px; color: #6e6357; padding-top: 8px; border-top: 1px solid rgba(212,165,116,0.08); }

  .tab-statistics { max-width: 1100px; margin: 0 auto; display: flex; flex-direction: column; gap: 22px; }
  .tab-statistics > h3 { margin: 0; color: #d4a574; font-size: 19px; }
  .stats-overview { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
  .stat-card { display: flex; align-items: center; gap: 13px; background: rgba(0,0,0,0.25); padding: 16px 18px; border-radius: 13px; border: 1px solid rgba(212,165,116,0.1); }
  .stat-card.highlight { background: linear-gradient(135deg, rgba(212,165,116,0.18), rgba(184,134,79,0.08)); border-color: rgba(212,165,116,0.28); }
  .stat-icon { font-size: 36px; filter: drop-shadow(0 2px 8px rgba(212,165,116,0.3)); }
  .stat-value { font-size: 28px; font-weight: 700; color: #d4a574; line-height: 1; }
  .stat-label { font-size: 11.5px; color: #8a7e6f; margin-top: 4px; }
  .stats-detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .detail-panel { background: rgba(0,0,0,0.25); border-radius: 13px; padding: 18px; border: 1px solid rgba(212,165,116,0.1); }
  .detail-panel h4 { margin: 0 0 14px; color: #d4a574; font-size: 14.5px; }
  .bar-chart { display: flex; flex-direction: column; gap: 11px; }
  .bar-row { display: grid; grid-template-columns: 80px 1fr 45px; align-items: center; gap: 10px; }
  .bar-label { font-size: 12px; color: #a89b8c; }
  .bar-track { height: 20px; background: rgba(0,0,0,0.3); border-radius: 10px; overflow: hidden; }
  .bar-fill { height: 100%; background: linear-gradient(90deg, #d4a574, #e67e22); border-radius: 10px; transition: width 0.5s ease; }
  .bar-value { font-size: 12px; color: #d4a574; font-weight: 600; text-align: right; }
  .pie-simple { display: flex; flex-direction: column; gap: 9px; }
  .pie-row { display: grid; grid-template-columns: 28px 80px 1fr auto; align-items: center; gap: 8px; }
  .pie-icon { font-size: 22px; }
  .pie-name { font-size: 12px; color: #c9b89a; }
  .pie-bar { height: 10px; background: rgba(0,0,0,0.3); border-radius: 5px; overflow: hidden; }
  .pie-fill { height: 100%; background: linear-gradient(90deg, #4a90d9, #9b59b6); border-radius: 5px; transition: width 0.5s ease; }
  .pie-count { font-size: 11px; color: #8a7e6f; }
  .emotion-list { display: flex; flex-direction: column; gap: 9px; }
  .emotion-item { display: grid; grid-template-columns: 28px 70px 1fr 35px; align-items: center; gap: 8px; }
  .e-icon { font-size: 20px; }
  .e-label { font-size: 12px; color: #c9b89a; }
  .e-bar { height: 9px; background: rgba(0,0,0,0.3); border-radius: 5px; overflow: hidden; }
  .e-fill { height: 100%; background: linear-gradient(90deg, #e74c3c, #f39c12); border-radius: 5px; }
  .e-count { font-size: 11px; color: #8a7e6f; text-align: right; }
  .works-ranking { display: flex; flex-direction: column; gap: 9px; }
  .rank-item { display: grid; grid-template-columns: 30px 50px 1fr; align-items: center; gap: 10px; padding: 8px 10px; background: rgba(255,255,255,0.02); border-radius: 8px; }
  .rank-num { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; color: white; }
  .rank-1 { background: linear-gradient(135deg, #f1c40f, #f39c12); color: #1a140e !important; }
  .rank-2 { background: linear-gradient(135deg, #bdc3c7, #95a5a6); }
  .rank-3 { background: linear-gradient(135deg, #e67e22, #d35400); }
  .rank-4, .rank-5 { background: rgba(255,255,255,0.1); color: #c9b89a; }
  .rank-thumb { width: 40px; height: 54px; object-fit: cover; border-radius: 4px; border: 1px solid rgba(212,165,116,0.3); }
  .rank-name { font-size: 12.5px; color: #e8ddd0; font-weight: 500; margin-bottom: 3px; }
  .rank-meta { display: flex; gap: 10px; font-size: 11px; color: #8a7e6f; }

  .exhibition-basic-stats { background: rgba(0,0,0,0.2); border-radius: 13px; padding: 18px; border: 1px solid rgba(212,165,116,0.1); }
  .exhibition-basic-stats h4 { margin: 0 0 14px; color: #d4a574; font-size: 14.5px; }
  .basic-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
  .basic-item { display: flex; justify-content: space-between; align-items: center; padding: 11px 14px; background: rgba(255,255,255,0.02); border-radius: 9px; border: 1px solid rgba(212,165,116,0.08); }
  .bi-label { font-size: 12px; color: #8a7e6f; }
  .bi-value { font-size: 15px; font-weight: 600; color: #d4a574; }

  .sub-modal { position: absolute; inset: 0; z-index: 50; display: flex; align-items: center; justify-content: center; }
  .sm-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(3px); }
  .sm-content { position: relative; background: #1f1610; border: 1px solid rgba(212,165,116,0.3); border-radius: 14px; padding: 24px; width: min(380px, 90%); box-shadow: 0 30px 80px rgba(0,0,0,0.6); display: flex; flex-direction: column; gap: 14px; }
  .sm-content h3 { margin: 0; color: #d4a574; font-size: 17px; }
  .sm-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 8px; }
</style>
