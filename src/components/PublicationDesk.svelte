<script lang="ts">
  import { gameStore } from '../stores/gameStore';
  import { PHOTO_SUBJECTS, FILM_STOCKS, GRADE_COLORS } from '../data/gameData';
  import type { ProcessedPhoto, PublicationStep, PublicationPhoto, PublicationPage, PageLayoutTemplate, CoverStyle, PublicationSelectFilter } from '../types/game';

  export let onClose: () => void;

  const steps: { key: PublicationStep; label: string; icon: string }[] = [
    { key: 'select', label: '选片', icon: '🖼' },
    { key: 'crop', label: '裁切', icon: '✂️' },
    { key: 'annotate', label: '注释', icon: '📝' },
    { key: 'layout', label: '版式', icon: '📐' },
    { key: 'cover', label: '封面', icon: '📖' },
    { key: 'export', label: '导出', icon: '📦' }
  ];

  const layoutTemplates: { key: PageLayoutTemplate; label: string; icon: string; slots: number }[] = [
    { key: 'full', label: '满幅', icon: '▢', slots: 1 },
    { key: 'half_h', label: '左右分栏', icon: '◧▢', slots: 2 },
    { key: 'half_v', label: '上下分栏', icon: '▤▢', slots: 2 },
    { key: 'thirds', label: '三分栏', icon: '◫◫◫', slots: 3 },
    { key: 'quarter', label: '四宫格', icon: '◫◫◫◫', slots: 4 },
    { key: 'feature_plus_strip', label: '主图+侧栏', icon: '◧▯', slots: 2 }
  ];

  const coverStyleOptions: { key: CoverStyle; label: string; preview: string }[] = [
    { key: 'minimal', label: '极简', preview: '#faf8f5' },
    { key: 'classic', label: '经典', preview: '#1a0f0a' },
    { key: 'artistic', label: '艺术', preview: '#4a2c1a' },
    { key: 'darkroom', label: '暗房', preview: '#0d0604' },
    { key: 'magazine', label: '杂志', preview: '#1a1a2e' }
  ];

  const aspectOptions: { key: PublicationPhoto['crop']['aspectRatio']; label: string }[] = [
    { key: 'free', label: '自由' },
    { key: '3:2', label: '3:2' },
    { key: '4:3', label: '4:3' },
    { key: '1:1', label: '1:1' },
    { key: '16:9', label: '16:9' }
  ];

  $: pubState = $gameStore.publicationSystem;
  $: activePubId = pubState.activePublicationId;
  $: activePub = pubState.publications.find(p => p.id === activePubId) || null;
  $: currentStep = pubState.activeStep;
  $: processedPhotos = $gameStore.processedPhotos;
  $: selectFilter = pubState.selectFilter;

  let newPubTitle = '';
  let newPubAuthor = '';
  let showNewPubDialog = false;
  let selectedCropPhotoId: string | null = null;

  $: selectedPubPhotoIds = new Set(activePub?.photos.map(p => p.photoId) || []);

  $: filteredPhotos = (() => {
    let result = [...processedPhotos];
    const f = selectFilter;
    if (f.subjectIds.length > 0) result = result.filter(p => f.subjectIds.includes(p.subjectId));
    if (f.grades.length > 0) result = result.filter(p => f.grades.includes(p.details.grade));
    if (f.minScore > 0) result = result.filter(p => p.score >= f.minScore);
    if (f.maxScore < 100) result = result.filter(p => p.score <= f.maxScore);
    switch (f.sortBy) {
      case 'date_desc': result.sort((a, b) => b.timestamp - a.timestamp); break;
      case 'date_asc': result.sort((a, b) => a.timestamp - b.timestamp); break;
      case 'score_desc': result.sort((a, b) => b.score - a.score); break;
      case 'score_asc': result.sort((a, b) => a.score - b.score); break;
    }
    return result;
  })();

  $: stepIndex = steps.findIndex(s => s.key === currentStep);

  function getSubjectName(id: string): string {
    return PHOTO_SUBJECTS.find(s => s.id === id)?.name || '未知';
  }

  function getFilmName(id: string): string {
    return FILM_STOCKS.find(f => f.id === id)?.name || '未知';
  }

  function handleCreatePublication() {
    if (!newPubTitle.trim()) return;
    gameStore.createPublication(newPubTitle.trim(), newPubAuthor.trim() || '匿名');
    newPubTitle = '';
    newPubAuthor = '';
    showNewPubDialog = false;
  }

  function handleSelectPublication(id: string) {
    gameStore.setActivePublication(id);
  }

  function handleDeletePublication(id: string, e: Event) {
    e.stopPropagation();
    if (confirm('确定要删除这本出版物吗？')) {
      gameStore.deletePublication(id);
    }
  }

  function goToStep(step: PublicationStep) {
    if (!activePub) return;
    gameStore.setPublicationStep(step);
  }

  function nextStep() {
    const idx = steps.findIndex(s => s.key === currentStep);
    if (idx < steps.length - 1) goToStep(steps[idx + 1].key);
  }

  function prevStep() {
    const idx = steps.findIndex(s => s.key === currentStep);
    if (idx > 0) goToStep(steps[idx - 1].key);
  }

  function togglePhotoSelection(photoId: string) {
    if (selectedPubPhotoIds.has(photoId)) {
      gameStore.removePhotoFromPublication(photoId);
    } else {
      gameStore.addPhotoToPublication(photoId);
    }
  }

  function movePhotoUp(photoId: string) {
    if (!activePub) return;
    const ids = activePub.photos.map(p => p.photoId);
    const idx = ids.indexOf(photoId);
    if (idx <= 0) return;
    const temp = ids[idx];
    ids[idx] = ids[idx - 1];
    ids[idx - 1] = temp;
    gameStore.reorderPublicationPhotos(ids);
  }

  function movePhotoDown(photoId: string) {
    if (!activePub) return;
    const ids = activePub.photos.map(p => p.photoId);
    const idx = ids.indexOf(photoId);
    if (idx >= ids.length - 1) return;
    const temp = ids[idx];
    ids[idx] = ids[idx + 1];
    ids[idx + 1] = temp;
    gameStore.reorderPublicationPhotos(ids);
  }

  function handleCropChange(photoId: string, field: string, value: number) {
    gameStore.updatePublicationPhotoCrop(photoId, { [field]: value });
  }

  function handleCropInput(photoId: string, field: string, e: Event) {
    const val = Number((e.target as HTMLInputElement).value);
    handleCropChange(photoId, field, val);
  }

  function handleAspectRatioChange(photoId: string, ratio: PublicationPhoto['crop']['aspectRatio']) {
    gameStore.updatePublicationPhotoCrop(photoId, { aspectRatio: ratio });
    if (ratio !== 'free') {
      const [w, h] = ratio.split(':').map(Number);
      const currentCrop = activePub?.photos.find(p => p.photoId === photoId)?.crop;
      if (currentCrop) {
        const newHeight = (currentCrop.width / w) * h;
        gameStore.updatePublicationPhotoCrop(photoId, { height: Math.min(100, newHeight) });
      }
    }
  }

  function handleCaptionChange(photoId: string, e: Event) {
    const value = (e.target as HTMLTextAreaElement).value;
    gameStore.updatePublicationPhotoCaption(photoId, value);
  }

  function handlePageLayoutChange(pageId: string, e: Event) {
    const value = (e.target as HTMLSelectElement).value as PageLayoutTemplate;
    updatePageLayout(pageId, value);
  }

  function handleSlotAssign(pageId: string, slotIdx: number, e: Event) {
    const v = (e.target as HTMLSelectElement).value;
    if (v) assignPhotoToPage(pageId, slotIdx, v);
  }

  function handleCoverTitleInput(e: Event) {
    gameStore.updatePublicationCover({ title: (e.target as HTMLInputElement).value });
  }

  function handleCoverSubtitleInput(e: Event) {
    gameStore.updatePublicationCover({ subtitle: (e.target as HTMLInputElement).value });
  }

  function handleCoverPhotoSelect(e: Event) {
    const v = (e.target as HTMLSelectElement).value;
    gameStore.updatePublicationCover({ coverPhotoId: v || null });
  }

  function autoArrangePages() {
    if (!activePub || activePub.photos.length === 0) return;
    const photos = activePub.photos;
    const pages: PublicationPage[] = [];
    let i = 0;
    while (i < photos.length) {
      const remaining = photos.length - i;
      let layout: PageLayoutTemplate = 'full';
      let count = 1;
      if (remaining >= 4) { layout = 'quarter'; count = 4; }
      else if (remaining >= 3) { layout = 'thirds'; count = 3; }
      else if (remaining >= 2) { layout = 'half_h'; count = 2; }
      pages.push({
        id: `page_${pages.length + 1}`,
        layout,
        photoIds: photos.slice(i, i + count).map(p => p.photoId)
      });
      i += count;
    }
    gameStore.updatePublicationPages(pages);
  }

  function addPage(layout: PageLayoutTemplate) {
    if (!activePub) return;
    gameStore.updatePublicationPages([...activePub.pages, { id: `page_${Date.now()}`, layout, photoIds: [] }]);
  }

  function removePage(pageId: string) {
    if (!activePub) return;
    gameStore.updatePublicationPages(activePub.pages.filter(p => p.id !== pageId));
  }

  function updatePageLayout(pageId: string, layout: PageLayoutTemplate) {
    if (!activePub) return;
    gameStore.updatePublicationPages(activePub.pages.map(p => p.id === pageId ? { ...p, layout } : p));
  }

  function assignPhotoToPage(pageId: string, slotIdx: number, photoId: string) {
    if (!activePub) return;
    const pages = activePub.pages.map(p => {
      if (p.id !== pageId) return p;
      const newIds = [...p.photoIds];
      newIds[slotIdx] = photoId;
      return { ...p, photoIds: newIds };
    });
    gameStore.updatePublicationPages(pages);
  }

  function removePhotoFromPage(pageId: string, slotIdx: number) {
    if (!activePub) return;
    const pages = activePub.pages.map(p => {
      if (p.id !== pageId) return p;
      const newIds = [...p.photoIds];
      newIds.splice(slotIdx, 1);
      return { ...p, photoIds: newIds };
    });
    gameStore.updatePublicationPages(pages);
  }

  function handleCoverStyleChange(style: CoverStyle) {
    gameStore.updatePublicationCover({ style });
  }

  function handleExport(format: 'json' | 'html') {
    if (!activePub) return;
    const result = gameStore.exportPublication(activePub.id, format);
    if (!result) return;
    const mimeType = format === 'html' ? 'text/html' : 'application/json';
    const blob = new Blob([result], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activePub.title || 'publication'}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handlePrintPreview() {
    if (!activePub) return;
    const result = gameStore.exportPublication(activePub.id, 'html');
    if (!result) return;
    const w = window.open('', '_blank');
    if (w) { w.document.write(result); w.document.close(); }
  }

  function toggleFilterSubject(id: string) {
    const ids = selectFilter.subjectIds.includes(id)
      ? selectFilter.subjectIds.filter(s => s !== id)
      : [...selectFilter.subjectIds, id];
    gameStore.updatePublicationSelectFilter({ subjectIds: ids });
  }

  function toggleFilterGrade(grade: string) {
    const grades = selectFilter.grades.includes(grade)
      ? selectFilter.grades.filter(g => g !== grade)
      : [...selectFilter.grades, grade];
    gameStore.updatePublicationSelectFilter({ grades });
  }

  function handleSortChange(e: Event) {
    const value = (e.target as HTMLSelectElement).value as PublicationSelectFilter['sortBy'];
    gameStore.updatePublicationSelectFilter({ sortBy: value });
  }

  function formatDate(ts: number): string {
    return new Date(ts).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  }
</script>

<div class="pub-overlay" on:click={onClose}>
  <div class="pub-modal" on:click|stopPropagation>
    <div class="pub-header">
      <div class="header-left">
        <div class="logo-icon">📖</div>
        <div class="header-text">
          <h2 class="modal-title">作品出版编辑台</h2>
          <p class="modal-subtitle">PUBLICATION EDITING DESK</p>
        </div>
      </div>
      <div class="header-stats">
        <div class="stat-item">
          <span class="stat-val">{pubState.publications.length}</span>
          <span class="stat-label">出版物</span>
        </div>
        <div class="stat-item">
          <span class="stat-val">{activePub?.photos.length || 0}</span>
          <span class="stat-label">已选片</span>
        </div>
      </div>
      <button class="close-btn" on:click={onClose} title="关闭">✕</button>
    </div>

    {#if !activePubId}
      <div class="pub-list-view">
        <div class="list-header">
          <h3 class="list-title">我的出版物</h3>
          <button class="create-btn" on:click={() => showNewPubDialog = true}>
            <span>+</span> 新建出版物
          </button>
        </div>
        {#if pubState.publications.length === 0}
          <div class="empty-state">
            <div class="empty-icon">📖</div>
            <h3 class="empty-title">还没有出版物</h3>
            <p class="empty-desc">创建你的第一本摄影集，将冲洗作品编排成册</p>
            <button class="go-create-btn" on:click={() => showNewPubDialog = true}>创建出版物</button>
          </div>
        {:else}
          <div class="pub-cards">
            {#each pubState.publications as pub (pub.id)}
              <div class="pub-card" on:click={() => handleSelectPublication(pub.id)}>
                <div class="pub-card-cover">
                  {#if pub.cover.coverPhotoId}
                    {@const coverPhoto = processedPhotos.find(p => p.id === pub.cover.coverPhotoId)}
                    {#if coverPhoto}
                      <img src={coverPhoto.imageDataUrl} alt={pub.title} />
                    {:else}
                      <div class="cover-placeholder">📖</div>
                    {/if}
                  {:else if pub.photos.length > 0}
                    {@const firstPhoto = processedPhotos.find(p => p.id === pub.photos[0]?.photoId)}
                    {#if firstPhoto}
                      <img src={firstPhoto.imageDataUrl} alt={pub.title} />
                    {:else}
                      <div class="cover-placeholder">📖</div>
                    {/if}
                  {:else}
                    <div class="cover-placeholder">📖</div>
                  {/if}
                </div>
                <div class="pub-card-info">
                  <div class="pub-card-title">{pub.title}</div>
                  <div class="pub-card-meta">{pub.photos.length} 张 · {pub.pages.length} 页 · {pub.authorName}</div>
                  <div class="pub-card-step">{steps.find(s => s.key === pub.step)?.icon} {steps.find(s => s.key === pub.step)?.label}</div>
                </div>
                <div class="pub-card-actions">
                  <button class="mini-btn danger" on:click|stopPropagation={(e) => handleDeletePublication(pub.id, e)}>🗑</button>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {:else if activePub}
      <div class="step-bar">
        {#each steps as step, i (step.key)}
          <button
            class="step-btn"
            class:active={currentStep === step.key}
            class:completed={i < stepIndex}
            class:clickable={i <= stepIndex + 1}
            on:click={() => { if (i <= stepIndex + 1) goToStep(step.key); }}
          >
            <span class="step-icon">{step.icon}</span>
            <span class="step-label">{step.label}</span>
            {#if i < steps.length - 1}<span class="step-arrow">→</span>{/if}
          </button>
        {/each}
      </div>

      <div class="pub-content">
        {#if currentStep === 'select'}
          <div class="select-step">
            <div class="step-toolbar">
              <button class="nav-btn" on:click={() => gameStore.setActivePublication(null)}>← 返回列表</button>
              <div class="toolbar-info">
                <span class="pub-name">{activePub.title}</span>
                <span class="count-badge">已选 {activePub.photos.length} 张</span>
              </div>
              <button class="next-btn" disabled={activePub.photos.length === 0} on:click={nextStep}>裁切 ✂️ →</button>
            </div>
            <div class="select-filters">
              <div class="filter-row">
                <span class="filter-label">题材</span>
                <div class="chip-group">
                  {#each PHOTO_SUBJECTS as subject (subject.id)}
                    <button class="chip" class:active={selectFilter.subjectIds.includes(subject.id)} on:click={() => toggleFilterSubject(subject.id)}>{subject.name}</button>
                  {/each}
                </div>
              </div>
              <div class="filter-row">
                <span class="filter-label">等级</span>
                <div class="chip-group">
                  {#each ['S', 'A', 'B', 'C', 'D'] as g (g)}
                    <button class="chip grade-chip" class:active={selectFilter.grades.includes(g)} style="--gc:{GRADE_COLORS[g]};" on:click={() => toggleFilterGrade(g)}>{g}</button>
                  {/each}
                </div>
                <span class="filter-label">排序</span>
                <select class="sort-select" value={selectFilter.sortBy} on:change={handleSortChange}>
                  <option value="date_desc">最新优先</option>
                  <option value="date_asc">最早优先</option>
                  <option value="score_desc">高分优先</option>
                  <option value="score_asc">低分优先</option>
                </select>
              </div>
            </div>
            <div class="photo-grid">
              {#each filteredPhotos as photo (photo.id)}
                <div class="photo-card" class:selected={selectedPubPhotoIds.has(photo.id)} on:click={() => togglePhotoSelection(photo.id)}>
                  <div class="photo-img-wrap">
                    <img src={photo.imageDataUrl} alt={getSubjectName(photo.subjectId)} />
                    <div class="check-overlay">
                      {#if selectedPubPhotoIds.has(photo.id)}
                        <span class="check-mark">✓</span>
                      {:else}
                        <span class="check-circle">○</span>
                      {/if}
                    </div>
                    <div class="grade-badge" style="background:{GRADE_COLORS[photo.details.grade]};color:#1a0f0a;">{photo.details.grade}</div>
                  </div>
                  <div class="photo-info">
                    <span class="photo-name">{getSubjectName(photo.subjectId)}</span>
                    <span class="photo-meta">{photo.score}分 · {getFilmName(photo.filmId)}</span>
                  </div>
                </div>
              {/each}
            </div>
          </div>

        {:else if currentStep === 'crop'}
          <div class="crop-step">
            <div class="step-toolbar">
              <button class="nav-btn" on:click={prevStep}>← 选片</button>
              <div class="toolbar-info"><span class="count-badge">裁切 {activePub.photos.length} 张</span></div>
              <button class="next-btn" on:click={nextStep}>注释 📝 →</button>
            </div>
            <div class="crop-layout">
              <div class="crop-list">
                {#each activePub.photos as pubPhoto, idx (pubPhoto.photoId)}
                  {@const photo = processedPhotos.find(p => p.id === pubPhoto.photoId)}
                  <div class="crop-item" class:active={selectedCropPhotoId === pubPhoto.photoId} on:click={() => selectedCropPhotoId = pubPhoto.photoId}>
                    <span class="crop-idx">{idx + 1}</span>
                    {#if photo}<img src={photo.imageDataUrl} alt="" class="crop-thumb" />{/if}
                    <span class="crop-name">{photo ? getSubjectName(photo.subjectId) : '已删除'}</span>
                    <span class="crop-aspect">{pubPhoto.crop.aspectRatio}</span>
                  </div>
                {/each}
              </div>
              <div class="crop-editor">
                {#if selectedCropPhotoId}
                  {@const pubPhoto = activePub.photos.find(p => p.photoId === selectedCropPhotoId)}
                  {@const photo = processedPhotos.find(p => p.id === selectedCropPhotoId)}
                  {#if pubPhoto && photo}
                    <div class="crop-preview-area">
                      <div class="crop-image-wrap">
                        <img src={photo.imageDataUrl} alt="" />
                        <div class="crop-shade-top" style="height:{pubPhoto.crop.y}%;"></div>
                        <div class="crop-shade-bottom" style="top:{pubPhoto.crop.y + pubPhoto.crop.height}%;height:{100 - pubPhoto.crop.y - pubPhoto.crop.height}%;"></div>
                        <div class="crop-shade-left" style="top:{pubPhoto.crop.y}%;height:{pubPhoto.crop.height}%;width:{pubPhoto.crop.x}%;"></div>
                        <div class="crop-shade-right" style="top:{pubPhoto.crop.y}%;height:{pubPhoto.crop.height}%;left:{pubPhoto.crop.x + pubPhoto.crop.width}%;width:{100 - pubPhoto.crop.x - pubPhoto.crop.width}%;"></div>
                        <div class="crop-frame" style="top:{pubPhoto.crop.y}%;left:{pubPhoto.crop.x}%;width:{pubPhoto.crop.width}%;height:{pubPhoto.crop.height}%;"></div>
                      </div>
                    </div>
                    <div class="crop-controls">
                      <div class="control-row">
                        <label>X</label>
                        <input type="range" min="0" max="80" value={pubPhoto.crop.x} on:input={(e) => handleCropInput(pubPhoto.photoId, 'x', e)} />
                        <span class="range-val">{pubPhoto.crop.x}%</span>
                      </div>
                      <div class="control-row">
                        <label>Y</label>
                        <input type="range" min="0" max="80" value={pubPhoto.crop.y} on:input={(e) => handleCropInput(pubPhoto.photoId, 'y', e)} />
                        <span class="range-val">{pubPhoto.crop.y}%</span>
                      </div>
                      <div class="control-row">
                        <label>宽</label>
                        <input type="range" min="10" max="100" value={pubPhoto.crop.width} on:input={(e) => handleCropInput(pubPhoto.photoId, 'width', e)} />
                        <span class="range-val">{pubPhoto.crop.width}%</span>
                      </div>
                      <div class="control-row">
                        <label>高</label>
                        <input type="range" min="10" max="100" value={pubPhoto.crop.height} on:input={(e) => handleCropInput(pubPhoto.photoId, 'height', e)} />
                        <span class="range-val">{pubPhoto.crop.height}%</span>
                      </div>
                      <div class="control-row">
                        <label>比例</label>
                        <div class="aspect-chips">
                          {#each aspectOptions as opt (opt.key)}
                            <button class="aspect-chip" class:active={pubPhoto.crop.aspectRatio === opt.key} on:click={() => handleAspectRatioChange(pubPhoto.photoId, opt.key)}>{opt.label}</button>
                          {/each}
                        </div>
                      </div>
                      <button class="reset-btn" on:click={() => gameStore.updatePublicationPhotoCrop(pubPhoto.photoId, { x: 0, y: 0, width: 100, height: 100, aspectRatio: 'free' })}>重置裁切</button>
                    </div>
                  {:else}
                    <div class="no-selection">该照片已被删除</div>
                  {/if}
                {:else}
                  <div class="no-selection">👈 从左侧选择照片进行裁切</div>
                {/if}
              </div>
            </div>
          </div>

        {:else if currentStep === 'annotate'}
          <div class="annotate-step">
            <div class="step-toolbar">
              <button class="nav-btn" on:click={prevStep}>← 裁切</button>
              <div class="toolbar-info"><span class="count-badge">注释 {activePub.photos.length} 张</span></div>
              <button class="next-btn" on:click={nextStep}>版式 📐 →</button>
            </div>
            <div class="annotate-list">
              {#each activePub.photos as pubPhoto, idx (pubPhoto.photoId)}
                {@const photo = processedPhotos.find(p => p.id === pubPhoto.photoId)}
                <div class="annotate-item">
                  <div class="annotate-img-wrap">
                    {#if photo}
                      <img src={photo.imageDataUrl} alt="" style="clip-path:inset({pubPhoto.crop.y}% {100 - pubPhoto.crop.x - pubPhoto.crop.width}% {100 - pubPhoto.crop.y - pubPhoto.crop.height}% {pubPhoto.crop.x}%);" />
                    {:else}
                      <div class="img-deleted">已删除</div>
                    {/if}
                    <span class="annotate-idx">{idx + 1}</span>
                  </div>
                  <div class="annotate-fields">
                    <div class="annotate-name">{photo ? getSubjectName(photo.subjectId) : '已删除'}</div>
                    {#if photo}
                      <div class="annotate-meta">
                        <span class="grade-sm" style="background:{GRADE_COLORS[photo.details.grade]};color:#1a0f0a;">{photo.details.grade}</span>
                        <span>{photo.score}分</span>
                        <span>· {getFilmName(photo.filmId)}</span>
                      </div>
                    {/if}
                    <textarea class="caption-input" placeholder="为这张作品添加注释或标题..." value={pubPhoto.caption} on:input={(e) => handleCaptionChange(pubPhoto.photoId, e)} rows="2"></textarea>
                  </div>
                  <div class="annotate-order">
                    <button class="order-btn" disabled={idx === 0} on:click={() => movePhotoUp(pubPhoto.photoId)} title="上移">▲</button>
                    <button class="order-btn" disabled={idx === activePub.photos.length - 1} on:click={() => movePhotoDown(pubPhoto.photoId)} title="下移">▼</button>
                    <button class="order-btn remove" on:click={() => gameStore.removePhotoFromPublication(pubPhoto.photoId)} title="移除">✕</button>
                  </div>
                </div>
              {/each}
              {#if activePub.photos.length === 0}
                <div class="no-photos-hint">还没有选择照片，请返回选片步骤</div>
              {/if}
            </div>
          </div>

        {:else if currentStep === 'layout'}
          <div class="layout-step">
            <div class="step-toolbar">
              <button class="nav-btn" on:click={prevStep}>← 注释</button>
              <div class="toolbar-info"><span class="count-badge">{activePub.pages.length} 页</span></div>
              <div class="toolbar-actions">
                <button class="action-btn" on:click={autoArrangePages}>✨ 自动编排</button>
              </div>
              <button class="next-btn" on:click={nextStep}>封面 📖 →</button>
            </div>
            <div class="layout-add-page">
              <span class="add-label">添加页面：</span>
              {#each layoutTemplates as tmpl (tmpl.key)}
                <button class="add-page-btn" on:click={() => addPage(tmpl.key)} title={tmpl.label}>
                  <span>{tmpl.icon}</span> {tmpl.label}
                </button>
              {/each}
            </div>
            <div class="pages-editor">
              {#each activePub.pages as page, pageIdx (page.id)}
                <div class="page-editor-item">
                  <div class="page-header">
                    <span class="page-num">第 {pageIdx + 1} 页</span>
                    <select class="layout-select" value={page.layout} on:change={(e) => handlePageLayoutChange(page.id, e)}>
                      {#each layoutTemplates as tmpl (tmpl.key)}
                        <option value={tmpl.key}>{tmpl.label} ({tmpl.slots}格)</option>
                      {/each}
                    </select>
                    <button class="remove-page-btn" on:click={() => removePage(page.id)}>✕</button>
                  </div>
                  <div class="page-slots" data-layout={page.layout}>
                    {#each Array(layoutTemplates.find(t => t.key === page.layout)?.slots || 1) as _, slotIdx}
                      <div class="page-slot">
                        {#if page.photoIds[slotIdx]}
                          {@const slotPhoto = processedPhotos.find(p => p.id === page.photoIds[slotIdx])}
                          {@const slotPubPhoto = activePub.photos.find(pp => pp.photoId === page.photoIds[slotIdx])}
                          {#if slotPhoto}
                            <img src={slotPhoto.imageDataUrl} alt="" />
                            {#if slotPubPhoto?.caption}
                              <div class="slot-caption">{slotPubPhoto.caption}</div>
                            {/if}
                          {:else}
                            <div class="slot-deleted">已删除</div>
                          {/if}
                          <button class="slot-remove" on:click={() => removePhotoFromPage(page.id, slotIdx)}>✕</button>
                        {:else}
                          <div class="slot-empty">
                            <select class="slot-assign" on:change={(e) => handleSlotAssign(page.id, slotIdx, e)}>
                              <option value="">选择照片...</option>
                              {#each activePub.photos as pp (pp.photoId)}
                                {@const ph = processedPhotos.find(p => p.id === pp.photoId)}
                                <option value={pp.photoId}>{ph ? getSubjectName(ph.subjectId) : pp.photoId}</option>
                              {/each}
                            </select>
                          </div>
                        {/if}
                      </div>
                    {/each}
                  </div>
                </div>
              {/each}
              {#if activePub.pages.length === 0}
                <div class="no-pages-hint">还没有页面，点击上方按钮添加页面布局，或使用「自动编排」</div>
              {/if}
            </div>
          </div>

        {:else if currentStep === 'cover'}
          <div class="cover-step">
            <div class="step-toolbar">
              <button class="nav-btn" on:click={prevStep}>← 版式</button>
              <div class="toolbar-info"><span class="count-badge">封面设计</span></div>
              <button class="next-btn" on:click={nextStep}>导出 📦 →</button>
            </div>
            <div class="cover-layout">
              <div class="cover-preview">
                <div class="book-cover" style="
                  background:{activePub.cover.style === 'minimal' ? '#faf8f5' : activePub.cover.style === 'artistic' ? 'linear-gradient(135deg,#2d1a12,#4a2c1a)' : activePub.cover.style === 'darkroom' ? '#0d0604' : activePub.cover.style === 'magazine' ? '#1a1a2e' : activePub.cover.backgroundColor};
                  color:{activePub.cover.style === 'minimal' ? '#2d1a12' : activePub.cover.style === 'magazine' ? '#e8e8e8' : '#e8dcc4'};
                ">
                  {#if activePub.cover.coverPhotoId}
                    {@const coverPubPhoto = activePub.photos.find(p => p.photoId === activePub.cover.coverPhotoId)}
                    {@const coverPhoto = processedPhotos.find(p => p.id === activePub.cover.coverPhotoId)}
                    {#if coverPhoto}
                      <div class="cover-photo-wrapper" style="clip-path:inset({coverPubPhoto?.crop.y || 0}% {100 - (coverPubPhoto?.crop.x || 0) - (coverPubPhoto?.crop.width || 100)}% {100 - (coverPubPhoto?.crop.y || 0) - (coverPubPhoto?.crop.height || 100)}% {coverPubPhoto?.crop.x || 0}%);">
                        <img src={coverPhoto.imageDataUrl} alt="" class="cover-photo" />
                      </div>
                    {/if}
                  {:else if activePub.photos.length > 0}
                    {@const firstPubPhoto = activePub.photos[0]}
                    {@const firstPhoto = processedPhotos.find(p => p.id === firstPubPhoto?.photoId)}
                    {#if firstPhoto}
                      <div class="cover-photo-wrapper" style="clip-path:inset({firstPubPhoto.crop.y}% {100 - firstPubPhoto.crop.x - firstPubPhoto.crop.width}% {100 - firstPubPhoto.crop.y - firstPubPhoto.crop.height}% {firstPubPhoto.crop.x}%);">
                        <img src={firstPhoto.imageDataUrl} alt="" class="cover-photo" />
                      </div>
                    {/if}
                  {/if}
                  <h1 class="cover-title">{activePub.cover.title || '未命名'}</h1>
                  <p class="cover-subtitle">{activePub.cover.subtitle}</p>
                  {#if activePub.cover.showDate}
                    <p class="cover-date">{new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' })}</p>
                  {/if}
                </div>
              </div>
              <div class="cover-controls">
                <div class="control-section">
                  <h4 class="section-title">封面风格</h4>
                  <div class="style-chips">
                    {#each coverStyleOptions as cs (cs.key)}
                      <button class="style-chip" class:active={activePub.cover.style === cs.key} on:click={() => handleCoverStyleChange(cs.key)}>
                        <div class="style-preview" style="background:{cs.preview};"></div>
                        <span>{cs.label}</span>
                      </button>
                    {/each}
                  </div>
                </div>
                <div class="control-section">
                  <h4 class="section-title">标题</h4>
                  <input type="text" class="text-input" value={activePub.cover.title} on:input={handleCoverTitleInput} placeholder="出版物标题" />
                </div>
                <div class="control-section">
                  <h4 class="section-title">副标题</h4>
                  <input type="text" class="text-input" value={activePub.cover.subtitle} on:input={handleCoverSubtitleInput} placeholder="作者名或其他信息" />
                </div>
                <div class="control-section">
                  <h4 class="section-title">封面照片</h4>
                  <select class="photo-select" value={activePub.cover.coverPhotoId || ''} on:change={handleCoverPhotoSelect}>
                    <option value="">使用第一张作品</option>
                    {#each activePub.photos as pp (pp.photoId)}
                      {@const ph = processedPhotos.find(p => p.id === pp.photoId)}
                      <option value={pp.photoId}>{ph ? getSubjectName(ph.subjectId) : pp.photoId}</option>
                    {/each}
                  </select>
                </div>
                <div class="control-section">
                  <label class="checkbox-label">
                    <input type="checkbox" checked={activePub.cover.showDate} on:change={() => gameStore.updatePublicationCover({ showDate: !activePub.cover.showDate })} />
                    <span>显示日期</span>
                  </label>
                </div>
                {#if activePub.cover.style === 'classic'}
                  <div class="control-section">
                    <h4 class="section-title">背景颜色</h4>
                    <div class="color-options">
                      {#each ['#1a0f0a', '#0d0604', '#1a1520', '#0a1a1a', '#1a0a14'] as color (color)}
                        <button class="color-btn" class:active={activePub.cover.backgroundColor === color} style="background:{color};" on:click={() => gameStore.updatePublicationCover({ backgroundColor: color })}></button>
                      {/each}
                    </div>
                  </div>
                {/if}
              </div>
            </div>
          </div>

        {:else if currentStep === 'export'}
          <div class="export-step">
            <div class="step-toolbar">
              <button class="nav-btn" on:click={prevStep}>← 封面</button>
              <div class="toolbar-info"><span class="count-badge">成册导出</span></div>
            </div>
            <div class="export-layout">
              <div class="export-summary">
                <h3 class="summary-title">📖 {activePub.title}</h3>
                <div class="summary-grid">
                  <div class="summary-item"><span class="summary-label">作者</span><span class="summary-value">{activePub.authorName}</span></div>
                  <div class="summary-item"><span class="summary-label">作品数</span><span class="summary-value">{activePub.photos.length} 张</span></div>
                  <div class="summary-item"><span class="summary-label">页数</span><span class="summary-value">{activePub.pages.length} 页</span></div>
                  <div class="summary-item"><span class="summary-label">已裁切</span><span class="summary-value">{activePub.photos.filter(p => p.crop.x !== 0 || p.crop.y !== 0 || p.crop.width !== 100 || p.crop.height !== 100).length} 张</span></div>
                  <div class="summary-item"><span class="summary-label">已注释</span><span class="summary-value">{activePub.photos.filter(p => p.caption).length} 张</span></div>
                  <div class="summary-item"><span class="summary-label">封面风格</span><span class="summary-value">{coverStyleOptions.find(c => c.key === activePub.cover.style)?.label || activePub.cover.style}</span></div>
                  <div class="summary-item"><span class="summary-label">创建时间</span><span class="summary-value">{formatDate(activePub.createdAt)}</span></div>
                  <div class="summary-item"><span class="summary-label">最近编辑</span><span class="summary-value">{formatDate(activePub.updatedAt)}</span></div>
                  {#if activePub.exportedAt}
                    <div class="summary-item"><span class="summary-label">上次导出</span><span class="summary-value">{formatDate(activePub.exportedAt)}</span></div>
                  {/if}
                </div>
                <div class="save-status">
                  <span class="save-indicator">💾 编辑已自动保存至本地</span>
                </div>
              </div>
              <div class="export-actions">
                <h4 class="export-title">选择导出格式</h4>
                <div class="export-buttons">
                  <button class="export-btn html" on:click={() => handleExport('html')}>
                    <div class="export-icon">🌐</div>
                    <div class="export-info"><span class="export-format">HTML 电子书</span><span class="export-desc">在浏览器中查看，支持打印为 PDF</span></div>
                  </button>
                  <button class="export-btn json" on:click={() => handleExport('json')}>
                    <div class="export-icon">📋</div>
                    <div class="export-info"><span class="export-format">JSON 数据</span><span class="export-desc">结构化数据，包含编排和裁切信息</span></div>
                  </button>
                  <button class="export-btn preview" on:click={handlePrintPreview}>
                    <div class="export-icon">👁</div>
                    <div class="export-info"><span class="export-format">打印预览</span><span class="export-desc">在新标签中预览，可 Ctrl+P 打印</span></div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        {/if}
      </div>
    {/if}

    {#if showNewPubDialog}
      <div class="confirm-modal" on:click={() => showNewPubDialog = false}>
        <div class="confirm-box" on:click|stopPropagation>
          <h3 class="confirm-title">新建出版物</h3>
          <div class="form-field">
            <label class="field-label">出版物名称</label>
            <input type="text" class="field-input" bind:value={newPubTitle} placeholder="我的摄影集" maxlength="30" />
          </div>
          <div class="form-field">
            <label class="field-label">作者</label>
            <input type="text" class="field-input" bind:value={newPubAuthor} placeholder="匿名" maxlength="20" />
          </div>
          <div class="confirm-actions">
            <button class="btn cancel" on:click={() => showNewPubDialog = false}>取消</button>
            <button class="btn primary" on:click={handleCreatePublication} disabled={!newPubTitle.trim()}>创建</button>
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .pub-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.85);
    backdrop-filter: blur(10px);
    z-index: 150;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    animation: fadeIn 0.3s ease;
  }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

  .pub-modal {
    background: linear-gradient(180deg, #2d1a12 0%, #1a0f0a 100%);
    border: 1px solid rgba(139, 90, 43, 0.3);
    border-radius: 16px;
    width: 100%;
    max-width: 1200px;
    max-height: 92vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
  }

  .pub-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 24px;
    border-bottom: 1px solid rgba(139, 90, 43, 0.2);
    background: rgba(0, 0, 0, 0.2);
  }
  .header-left { display: flex; align-items: center; gap: 14px; }
  .logo-icon { font-size: 32px; filter: drop-shadow(0 2px 8px rgba(200, 150, 80, 0.3)); }
  .header-text { display: flex; flex-direction: column; }
  .modal-title {
    font-size: 20px; font-weight: 600; color: #e8c890; margin: 0; letter-spacing: 2px;
    background: linear-gradient(90deg, #f0d8a8, #d4a574);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
  }
  .modal-subtitle { font-size: 10px; color: #7a6a55; letter-spacing: 3px; margin: 2px 0 0; }
  .header-stats { display: flex; gap: 20px; }
  .stat-item { display: flex; flex-direction: column; align-items: center; gap: 2px; }
  .stat-val { font-size: 18px; font-weight: 700; color: #e8c890; }
  .stat-label { font-size: 10px; color: #7a6a55; }
  .close-btn {
    width: 36px; height: 36px; border-radius: 8px;
    background: rgba(139, 90, 43, 0.15); border: 1px solid rgba(139, 90, 43, 0.25);
    color: #c8a878; font-size: 16px; display: flex; align-items: center; justify-content: center;
  }
  .close-btn:hover { background: rgba(139, 90, 43, 0.3); }

  .step-bar {
    display: flex; align-items: center; justify-content: center; gap: 4px;
    padding: 12px 24px; border-bottom: 1px solid rgba(139, 90, 43, 0.15); background: rgba(0, 0, 0, 0.15);
  }
  .step-btn {
    display: flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 8px;
    background: transparent; color: #7a6a55; font-size: 12px; border: 1px solid transparent;
  }
  .step-btn.active { background: rgba(200, 150, 80, 0.15); border-color: rgba(200, 150, 80, 0.4); color: #e8c890; }
  .step-btn.completed { color: #a08860; }
  .step-btn.clickable { cursor: pointer; }
  .step-btn.clickable:hover { background: rgba(200, 150, 80, 0.1); }
  .step-icon { font-size: 14px; }
  .step-label { font-size: 12px; }
  .step-arrow { color: #5a4a35; font-size: 11px; margin-left: 4px; }

  .pub-content { flex: 1; overflow-y: auto; padding: 20px 24px; }

  .step-toolbar { display: flex; align-items: center; gap: 16px; margin-bottom: 20px; }
  .nav-btn {
    padding: 8px 14px; border-radius: 8px; background: rgba(139, 90, 43, 0.15);
    border: 1px solid rgba(139, 90, 43, 0.25); color: #c8a878; font-size: 13px;
  }
  .nav-btn:hover { background: rgba(139, 90, 43, 0.3); }
  .toolbar-info { flex: 1; display: flex; align-items: center; gap: 12px; }
  .pub-name { font-size: 16px; font-weight: 600; color: #e8c890; }
  .count-badge {
    font-size: 13px; color: #a08b6c; padding: 4px 10px;
    background: rgba(139, 90, 43, 0.15); border-radius: 6px;
  }
  .next-btn {
    padding: 8px 18px; border-radius: 8px;
    background: linear-gradient(135deg, #d4a574, #8b5a2b); color: #fff; font-size: 13px; font-weight: 600;
  }
  .next-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(212, 165, 116, 0.3); }
  .toolbar-actions { display: flex; gap: 8px; }
  .action-btn {
    padding: 8px 14px; border-radius: 8px; background: rgba(139, 90, 43, 0.2);
    border: 1px solid rgba(139, 90, 43, 0.3); color: #c8a878; font-size: 13px;
  }
  .action-btn:hover { background: rgba(139, 90, 43, 0.35); }

  .pub-list-view { flex: 1; overflow-y: auto; padding: 20px 24px; }
  .list-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
  .list-title { font-size: 18px; color: #e8c890; margin: 0; }
  .create-btn {
    padding: 8px 16px; border-radius: 8px;
    background: linear-gradient(135deg, #d4a574, #8b5a2b); color: #fff; font-size: 13px; font-weight: 600;
  }
  .create-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(212, 165, 116, 0.3); }
  .empty-state { text-align: center; padding: 60px 20px; }
  .empty-icon { font-size: 48px; margin-bottom: 16px; }
  .empty-title { font-size: 18px; color: #c8a878; margin: 0 0 8px; }
  .empty-desc { font-size: 13px; color: #7a6a55; margin: 0 0 24px; }
  .go-create-btn {
    padding: 10px 24px; border-radius: 8px;
    background: linear-gradient(135deg, #d4a574, #8b5a2b); color: #fff; font-size: 14px; font-weight: 600;
  }
  .pub-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
  .pub-card {
    display: flex; gap: 14px; padding: 14px; border-radius: 12px;
    background: rgba(45, 26, 18, 0.4); border: 1px solid rgba(139, 90, 43, 0.2);
    cursor: pointer; transition: all 0.2s;
  }
  .pub-card:hover { background: rgba(45, 26, 18, 0.7); border-color: rgba(139, 90, 43, 0.4); transform: translateY(-2px); }
  .pub-card-cover { width: 80px; height: 100px; border-radius: 6px; overflow: hidden; flex-shrink: 0; }
  .pub-card-cover img { width: 100%; height: 100%; object-fit: cover; }
  .cover-placeholder {
    width: 100%; height: 100%; background: rgba(0, 0, 0, 0.3);
    display: flex; align-items: center; justify-content: center; font-size: 28px;
  }
  .pub-card-info { flex: 1; display: flex; flex-direction: column; gap: 4px; }
  .pub-card-title { font-size: 15px; font-weight: 600; color: #e8c890; }
  .pub-card-meta { font-size: 11px; color: #8a7a5a; }
  .pub-card-step {
    font-size: 11px; color: #a08b6c; margin-top: 4px; padding: 3px 8px;
    background: rgba(139, 90, 43, 0.15); border-radius: 4px; width: fit-content;
  }
  .pub-card-actions { display: flex; align-items: flex-start; }
  .mini-btn {
    width: 28px; height: 28px; border-radius: 6px;
    background: rgba(139, 90, 43, 0.1); border: 1px solid rgba(139, 90, 43, 0.2);
    color: #c8a878; font-size: 12px; display: flex; align-items: center; justify-content: center;
  }
  .mini-btn.danger:hover { background: rgba(180, 60, 60, 0.3); border-color: rgba(180, 60, 60, 0.5); color: #e86060; }

  .select-filters {
    margin-bottom: 16px; padding: 14px; background: rgba(0, 0, 0, 0.2);
    border-radius: 10px; border: 1px solid rgba(139, 90, 43, 0.15);
  }
  .filter-row { display: flex; gap: 16px; margin-bottom: 8px; align-items: center; }
  .filter-row:last-child { margin-bottom: 0; }
  .filter-label { font-size: 11px; color: #7a6a55; white-space: nowrap; }
  .chip-group { display: flex; flex-wrap: wrap; gap: 4px; }
  .chip {
    padding: 3px 8px; border-radius: 4px; background: rgba(139, 90, 43, 0.1);
    border: 1px solid rgba(139, 90, 43, 0.15); color: #8a7a5a; font-size: 11px;
  }
  .chip:hover { background: rgba(139, 90, 43, 0.2); color: #c8a878; }
  .chip.active { background: rgba(200, 150, 80, 0.2); border-color: rgba(200, 150, 80, 0.4); color: #e8c890; }
  .grade-chip.active { border-color: var(--gc); color: var(--gc); }
  .sort-select {
    padding: 4px 8px; border-radius: 6px; background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(139, 90, 43, 0.25); color: #c8a878; font-size: 12px;
  }
  .photo-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px; }
  .photo-card {
    border-radius: 10px; overflow: hidden; background: rgba(45, 26, 18, 0.4);
    border: 2px solid transparent; cursor: pointer; transition: all 0.2s;
  }
  .photo-card:hover { background: rgba(45, 26, 18, 0.7); }
  .photo-card.selected { border-color: rgba(200, 150, 80, 0.6); box-shadow: 0 0 12px rgba(200, 150, 80, 0.2); }
  .photo-img-wrap { position: relative; aspect-ratio: 3 / 4; overflow: hidden; }
  .photo-img-wrap img { width: 100%; height: 100%; object-fit: cover; }
  .check-overlay {
    position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
    background: rgba(0, 0, 0, 0.1); transition: background 0.2s;
  }
  .photo-card.selected .check-overlay { background: rgba(200, 150, 80, 0.15); }
  .check-mark {
    width: 28px; height: 28px; border-radius: 50%; background: rgba(200, 150, 80, 0.9);
    color: #1a0f0a; display: flex; align-items: center; justify-content: center;
    font-size: 14px; font-weight: bold;
  }
  .check-circle {
    width: 28px; height: 28px; border-radius: 50%; border: 2px solid rgba(255, 255, 255, 0.4);
    display: flex; align-items: center; justify-content: center; font-size: 16px; color: rgba(255, 255, 255, 0.4);
  }
  .grade-badge { position: absolute; top: 6px; right: 6px; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 700; }
  .photo-info { padding: 8px; display: flex; flex-direction: column; gap: 2px; }
  .photo-name { font-size: 12px; color: #c8a878; font-weight: 500; }
  .photo-meta { font-size: 10px; color: #7a6a55; }

  .crop-layout { display: grid; grid-template-columns: 200px 1fr; gap: 20px; }
  .crop-list { display: flex; flex-direction: column; gap: 4px; overflow-y: auto; max-height: calc(92vh - 200px); }
  .crop-item {
    display: flex; align-items: center; gap: 8px; padding: 8px; border-radius: 8px;
    background: rgba(45, 26, 18, 0.3); border: 1px solid transparent; cursor: pointer;
  }
  .crop-item:hover { background: rgba(45, 26, 18, 0.5); }
  .crop-item.active { border-color: rgba(200, 150, 80, 0.4); background: rgba(45, 26, 18, 0.6); }
  .crop-idx {
    width: 20px; height: 20px; border-radius: 4px; background: rgba(139, 90, 43, 0.2);
    color: #a08b6c; font-size: 11px; display: flex; align-items: center; justify-content: center;
  }
  .crop-thumb { width: 36px; height: 48px; object-fit: cover; border-radius: 4px; }
  .crop-name { flex: 1; font-size: 11px; color: #c8a878; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .crop-aspect { font-size: 9px; color: #7a6a55; padding: 2px 5px; background: rgba(0, 0, 0, 0.2); border-radius: 3px; }
  .crop-editor { display: flex; flex-direction: column; gap: 16px; }
  .crop-preview-area { display: flex; justify-content: center; }
  .crop-image-wrap { position: relative; width: 300px; aspect-ratio: 3 / 4; overflow: hidden; border-radius: 8px; background: #0a0503; }
  .crop-image-wrap img { width: 100%; height: 100%; object-fit: cover; }
  .crop-shade-top, .crop-shade-bottom, .crop-shade-left, .crop-shade-right { position: absolute; background: rgba(0, 0, 0, 0.5); }
  .crop-shade-top { top: 0; left: 0; right: 0; }
  .crop-shade-bottom { left: 0; right: 0; bottom: 0; }
  .crop-shade-left { left: 0; }
  .crop-shade-right { right: 0; }
  .crop-frame { position: absolute; border: 2px solid rgba(200, 150, 80, 0.7); }
  .crop-controls {
    display: flex; flex-direction: column; gap: 10px; padding: 14px;
    background: rgba(0, 0, 0, 0.2); border-radius: 10px; border: 1px solid rgba(139, 90, 43, 0.15);
  }
  .control-row { display: flex; align-items: center; gap: 10px; }
  .control-row label { font-size: 12px; color: #8a7a5a; min-width: 30px; }
  .control-row input[type="range"] { flex: 1; accent-color: #d4a574; }
  .range-val { font-size: 11px; color: #a08b6c; min-width: 36px; text-align: right; }
  .aspect-chips { display: flex; gap: 4px; flex-wrap: wrap; }
  .aspect-chip {
    padding: 4px 8px; border-radius: 4px; background: rgba(139, 90, 43, 0.1);
    border: 1px solid rgba(139, 90, 43, 0.15); color: #8a7a5a; font-size: 11px;
  }
  .aspect-chip.active { background: rgba(200, 150, 80, 0.2); border-color: rgba(200, 150, 80, 0.4); color: #e8c890; }
  .reset-btn {
    padding: 6px 12px; border-radius: 6px; background: rgba(139, 90, 43, 0.15);
    border: 1px solid rgba(139, 90, 43, 0.25); color: #c8a878; font-size: 12px; align-self: flex-start;
  }
  .reset-btn:hover { background: rgba(139, 90, 43, 0.3); }
  .no-selection { display: flex; align-items: center; justify-content: center; min-height: 200px; color: #5a4a35; font-size: 14px; }

  .annotate-list { display: flex; flex-direction: column; gap: 10px; }
  .annotate-item {
    display: flex; gap: 14px; padding: 14px; border-radius: 10px;
    background: rgba(45, 26, 18, 0.3); border: 1px solid rgba(139, 90, 43, 0.15);
  }
  .annotate-img-wrap {
    position: relative; width: 80px; height: 100px; flex-shrink: 0; border-radius: 6px; overflow: hidden;
  }
  .annotate-img-wrap img { width: 100%; height: 100%; object-fit: cover; }
  .img-deleted {
    width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
    background: rgba(0, 0, 0, 0.3); color: #7a6a55; font-size: 11px;
  }
  .annotate-idx {
    position: absolute; top: 4px; left: 4px; width: 20px; height: 20px; border-radius: 4px;
    background: rgba(0, 0, 0, 0.6); color: #c8a878; font-size: 10px;
    display: flex; align-items: center; justify-content: center;
  }
  .annotate-fields { flex: 1; display: flex; flex-direction: column; gap: 6px; }
  .annotate-name { font-size: 14px; font-weight: 500; color: #e8c890; }
  .annotate-meta { font-size: 11px; color: #7a6a55; display: flex; align-items: center; gap: 6px; }
  .grade-sm { padding: 1px 5px; border-radius: 3px; font-size: 10px; font-weight: 700; }
  .caption-input {
    width: 100%; padding: 8px 10px; border-radius: 6px; background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(139, 90, 43, 0.2); color: #e8dcc4; font-size: 12px; font-family: inherit; resize: vertical;
  }
  .caption-input::placeholder { color: #5a4a35; }
  .caption-input:focus { border-color: rgba(200, 150, 80, 0.5); outline: none; }
  .annotate-order { display: flex; flex-direction: column; gap: 4px; flex-shrink: 0; }
  .order-btn {
    width: 28px; height: 28px; border-radius: 6px; background: rgba(139, 90, 43, 0.1);
    border: 1px solid rgba(139, 90, 43, 0.15); color: #8a7a5a; font-size: 11px;
    display: flex; align-items: center; justify-content: center;
  }
  .order-btn:hover { background: rgba(139, 90, 43, 0.25); color: #c8a878; }
  .order-btn.remove:hover { background: rgba(180, 60, 60, 0.2); color: #e86060; }
  .no-photos-hint { text-align: center; padding: 40px; color: #5a4a35; }

  .layout-add-page {
    display: flex; align-items: center; gap: 8px; margin-bottom: 16px; padding: 10px 14px;
    background: rgba(0, 0, 0, 0.15); border-radius: 8px; border: 1px solid rgba(139, 90, 43, 0.1);
  }
  .add-label { font-size: 12px; color: #7a6a55; white-space: nowrap; }
  .add-page-btn {
    padding: 6px 10px; border-radius: 6px; background: rgba(139, 90, 43, 0.1);
    border: 1px solid rgba(139, 90, 43, 0.2); color: #8a7a5a; font-size: 11px;
  }
  .add-page-btn:hover { background: rgba(139, 90, 43, 0.25); color: #c8a878; }
  .pages-editor { display: flex; flex-direction: column; gap: 14px; }
  .page-editor-item {
    padding: 14px; border-radius: 10px; background: rgba(45, 26, 18, 0.3);
    border: 1px solid rgba(139, 90, 43, 0.15);
  }
  .page-header { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
  .page-num { font-size: 13px; font-weight: 600; color: #c8a878; }
  .layout-select {
    padding: 4px 8px; border-radius: 6px; background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(139, 90, 43, 0.25); color: #c8a878; font-size: 12px; flex: 1;
  }
  .remove-page-btn {
    width: 24px; height: 24px; border-radius: 4px; background: rgba(139, 90, 43, 0.1);
    border: 1px solid rgba(139, 90, 43, 0.15); color: #8a7a5a; font-size: 10px;
    display: flex; align-items: center; justify-content: center;
  }
  .remove-page-btn:hover { background: rgba(180, 60, 60, 0.2); color: #e86060; }
  .page-slots {
    display: grid; gap: 8px; min-height: 120px;
  }
  .page-slots[data-layout="full"] { grid-template-columns: 1fr; }
  .page-slots[data-layout="half_h"] { grid-template-columns: 1fr 1fr; }
  .page-slots[data-layout="half_v"] { grid-template-columns: 1fr; grid-template-rows: 1fr 1fr; }
  .page-slots[data-layout="thirds"] { grid-template-columns: 1fr 1fr 1fr; }
  .page-slots[data-layout="quarter"] { grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; }
  .page-slots[data-layout="feature_plus_strip"] { grid-template-columns: 2fr 1fr; }
  .page-slot {
    position: relative; min-height: 100px; border-radius: 6px; overflow: hidden;
    background: rgba(0, 0, 0, 0.2); border: 1px dashed rgba(139, 90, 43, 0.25);
  }
  .page-slot img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .slot-caption {
    position: absolute; bottom: 0; left: 0; right: 0; padding: 6px 8px;
    background: rgba(0, 0, 0, 0.6); color: #e8dcc4; font-size: 10px;
  }
  .slot-deleted {
    height: 100%; display: flex; align-items: center; justify-content: center;
    color: #7a6a55; font-size: 11px;
  }
  .slot-remove {
    position: absolute; top: 4px; right: 4px; width: 20px; height: 20px; border-radius: 4px;
    background: rgba(0, 0, 0, 0.6); color: #c8a878; font-size: 9px;
    display: flex; align-items: center; justify-content: center; border: none;
  }
  .slot-remove:hover { background: rgba(180, 60, 60, 0.6); color: #e86060; }
  .slot-empty {
    height: 100%; display: flex; align-items: center; justify-content: center; padding: 8px;
  }
  .slot-assign {
    width: 100%; padding: 4px 6px; border-radius: 4px; background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(139, 90, 43, 0.2); color: #a08b6c; font-size: 11px;
  }
  .no-pages-hint { text-align: center; padding: 40px; color: #5a4a35; }

  .cover-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
  .cover-preview { display: flex; justify-content: center; align-items: flex-start; }
  .book-cover {
    width: 240px; min-height: 320px; border-radius: 8px; padding: 40px 24px;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    text-align: center; box-shadow: 0 8px 30px rgba(0, 0, 0, 0.5);
  }
  .cover-photo-wrapper {
    width: 80%; max-width: 180px; margin-bottom: 24px;
    border-radius: 6px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }
  .cover-photo {
    width: 100%; aspect-ratio: 3 / 4; object-fit: cover; display: block;
  }
  .cover-title { font-size: 20px; margin: 0 0 8px; letter-spacing: 2px; }
  .cover-subtitle { font-size: 12px; opacity: 0.8; margin: 0 0 6px; }
  .cover-date { font-size: 10px; opacity: 0.5; margin: 0; }
  .cover-controls { display: flex; flex-direction: column; gap: 16px; }
  .control-section { display: flex; flex-direction: column; gap: 8px; }
  .section-title { font-size: 13px; color: #c8a878; margin: 0; font-weight: 600; }
  .style-chips { display: flex; gap: 8px; flex-wrap: wrap; }
  .style-chip {
    display: flex; align-items: center; gap: 6px; padding: 6px 10px; border-radius: 6px;
    background: rgba(139, 90, 43, 0.1); border: 1px solid rgba(139, 90, 43, 0.15); color: #8a7a5a; font-size: 12px;
  }
  .style-chip.active { border-color: rgba(200, 150, 80, 0.4); background: rgba(200, 150, 80, 0.15); color: #e8c890; }
  .style-preview { width: 20px; height: 20px; border-radius: 4px; border: 1px solid rgba(255, 255, 255, 0.1); }
  .text-input {
    width: 100%; padding: 8px 12px; border-radius: 6px; background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(139, 90, 43, 0.2); color: #e8dcc4; font-size: 13px; font-family: inherit;
  }
  .text-input::placeholder { color: #5a4a35; }
  .text-input:focus { border-color: rgba(200, 150, 80, 0.5); outline: none; }
  .photo-select {
    width: 100%; padding: 8px 12px; border-radius: 6px; background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(139, 90, 43, 0.2); color: #c8a878; font-size: 13px;
  }
  .checkbox-label { display: flex; align-items: center; gap: 8px; color: #a08b6c; font-size: 13px; cursor: pointer; }
  .checkbox-label input { accent-color: #d4a574; }
  .color-options { display: flex; gap: 8px; }
  .color-btn {
    width: 32px; height: 32px; border-radius: 6px; border: 2px solid rgba(139, 90, 43, 0.2);
  }
  .color-btn.active { border-color: rgba(200, 150, 80, 0.6); box-shadow: 0 0 8px rgba(200, 150, 80, 0.3); }

  .export-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
  .export-summary {
    padding: 20px; border-radius: 12px; background: rgba(45, 26, 18, 0.3);
    border: 1px solid rgba(139, 90, 43, 0.15);
  }
  .summary-title { font-size: 18px; color: #e8c890; margin: 0 0 16px; }
  .summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .save-status { margin-top: 16px; padding-top: 12px; border-top: 1px solid rgba(139, 90, 43, 0.15); text-align: center; }
  .save-indicator { font-size: 12px; color: #6a8a5a; }
  .summary-item { display: flex; flex-direction: column; gap: 2px; }
  .summary-label { font-size: 11px; color: #7a6a55; }
  .summary-value { font-size: 14px; color: #c8a878; font-weight: 500; }
  .export-actions { display: flex; flex-direction: column; gap: 16px; }
  .export-title { font-size: 16px; color: #e8c890; margin: 0; }
  .export-buttons { display: flex; flex-direction: column; gap: 10px; }
  .export-btn {
    display: flex; align-items: center; gap: 14px; padding: 16px; border-radius: 10px;
    background: rgba(45, 26, 18, 0.3); border: 1px solid rgba(139, 90, 43, 0.2);
    text-align: left; transition: all 0.2s;
  }
  .export-btn:hover { background: rgba(45, 26, 18, 0.6); border-color: rgba(139, 90, 43, 0.4); transform: translateY(-1px); }
  .export-icon { font-size: 28px; }
  .export-info { display: flex; flex-direction: column; gap: 2px; }
  .export-format { font-size: 14px; font-weight: 600; color: #e8c890; }
  .export-desc { font-size: 11px; color: #8a7a5a; }

  .confirm-modal {
    position: fixed; inset: 0; background: rgba(0, 0, 0, 0.6); display: flex;
    align-items: center; justify-content: center; z-index: 200;
  }
  .confirm-box {
    background: linear-gradient(180deg, #2d1a12, #1a0f0a); border: 1px solid rgba(139, 90, 43, 0.3);
    border-radius: 12px; padding: 24px; min-width: 340px; max-width: 420px;
  }
  .confirm-title { font-size: 16px; color: #e8c890; margin: 0 0 16px; }
  .form-field { margin-bottom: 14px; }
  .field-label { display: block; font-size: 12px; color: #8a7a5a; margin-bottom: 6px; }
  .field-input {
    width: 100%; padding: 8px 12px; border-radius: 6px; background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(139, 90, 43, 0.2); color: #e8dcc4; font-size: 13px; font-family: inherit;
  }
  .field-input::placeholder { color: #5a4a35; }
  .confirm-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 16px; }
  .btn { padding: 8px 18px; border-radius: 6px; font-size: 13px; }
  .btn.cancel { background: rgba(139, 90, 43, 0.15); border: 1px solid rgba(139, 90, 43, 0.25); color: #c8a878; }
  .btn.primary { background: linear-gradient(135deg, #d4a574, #8b5a2b); color: #fff; font-weight: 600; }

  @media (max-width: 900px) {
    .crop-layout { grid-template-columns: 1fr; }
    .cover-layout { grid-template-columns: 1fr; }
    .export-layout { grid-template-columns: 1fr; }
    .step-bar { flex-wrap: wrap; }
  }
</style>