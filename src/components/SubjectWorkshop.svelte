<script lang="ts">
  import { gameStore } from '../stores/gameStore';
  import {
    calculatePredictedScore,
    calculateGrade,
    filterAndSortTemplates,
    convertDraftsToKeyAreas,
    convertTemplateToSubject
  } from '../utils/subjectWorkshop';
  import { FILM_STOCKS } from '../data/gameData';
  import PhotoCanvas from './PhotoCanvas.svelte';
  import type {
    SceneTemplate,
    SceneTemplateCategory,
    DifficultyLevel,
    TargetStyle,
    WorkshopTab,
    EditorMode,
    ScoreRuleSet
  } from '../types/game';

  export let onClose: () => void;

  $: ws = $gameStore.subjectWorkshop;
  $: templates = ws.templates;
  $: ruleSets = ws.ruleSets;
  $: draft = ws.draftTemplate;
  $: draftKeyAreas = ws.draftKeyAreas;
  $: activeTab = ws.activeTab;
  $: editorMode = ws.editorMode;
  $: selectedTemplateId = ws.selectedTemplateId;
  $: selectedKeyAreaId = ws.selectedKeyAreaId;
  $: selectedRuleSetId = ws.selectedRuleSetId;
  $: previewParams = ws.previewParams;
  $: showPreviewOverlay = ws.showPreviewOverlay;
  $: showKeyAreasInPreview = ws.showKeyAreasInPreview;

  const categories: { key: SceneTemplateCategory | 'all'; label: string }[] = [
    { key: 'all', label: '全部' },
    { key: 'portrait', label: '人像' },
    { key: 'landscape', label: '风景' },
    { key: 'street', label: '街拍' },
    { key: 'still_life', label: '静物' },
    { key: 'night', label: '夜景' },
    { key: 'architecture', label: '建筑' },
    { key: 'documentary', label: '纪实' },
    { key: 'abstract', label: '抽象' },
    { key: 'custom', label: '自定义' }
  ];

  const tabs: { key: WorkshopTab; label: string; icon: string }[] = [
    { key: 'templates', label: '模板库', icon: '📚' },
    { key: 'editor', label: '编辑器', icon: '✏️' },
    { key: 'preview', label: '预览渲染', icon: '🎞' },
    { key: 'scoring', label: '评分规则', icon: '📊' }
  ];

  const difficulties: { key: DifficultyLevel; label: string; color: string }[] = [
    { key: 1, label: '入门', color: '#5c8a5c' },
    { key: 2, label: '进阶', color: '#c8a858' },
    { key: 3, label: '中级', color: '#e67e22' },
    { key: 4, label: '专家', color: '#c86868' },
    { key: 5, label: '大师', color: '#9a5c9a' }
  ];

  const styles: { key: TargetStyle; label: string }[] = [
    { key: 'classic', label: '经典复古' },
    { key: 'high_contrast', label: '高对比' },
    { key: 'low_key', label: '低调暗调' },
    { key: 'high_key', label: '高调亮调' },
    { key: 'warm', label: '暖色调' },
    { key: 'cool', label: '冷色调' },
    { key: 'dreamy', label: '梦幻柔和' },
    { key: 'grainy', label: '颗粒质感' }
  ];

  const sortOptions: { key: typeof ws.sortBy; label: string }[] = [
    { key: 'date_desc', label: '最新' },
    { key: 'date_asc', label: '最旧' },
    { key: 'name_asc', label: '名称 A-Z' },
    { key: 'name_desc', label: '名称 Z-A' },
    { key: 'difficulty_asc', label: '难度低→高' },
    { key: 'difficulty_desc', label: '难度高→低' }
  ];

  $: filteredTemplates = filterAndSortTemplates(
    templates,
    ws.filterCategory,
    ws.searchKeyword,
    ws.sortBy
  );

  $: selectedTemplate = templates.find(t => t.id === selectedTemplateId) || null;
  $: selectedRuleSet = ruleSets.find(r => r.id === selectedRuleSetId) || null;
  $: selectedKeyArea = draftKeyAreas.find(a => a.id === selectedKeyAreaId) || null;

  $: predictedScore = draft
    ? calculatePredictedScore(draft, previewParams, true)
    : 0;
  $: predictedGrade = calculateGrade(predictedScore);

  function setTab(tab: WorkshopTab) {
    gameStore.setWorkshopTab(tab);
  }

  function handleCategoryFilter(cat: SceneTemplateCategory | 'all') {
    gameStore.setWorkshopFilterCategory(cat);
  }

  function handleSearch(e: Event) {
    gameStore.setWorkshopSearchKeyword(inputValue(e));
  }

  function handleSortChange(e: Event) {
    gameStore.setWorkshopSortBy(selectValue(e) as typeof ws.sortBy);
  }

  function handleSelectTemplate(id: string) {
    gameStore.selectTemplate(id);
  }

  function handleEditTemplate(id: string) {
    gameStore.editTemplate(id);
  }

  function handleDuplicateTemplate(id: string) {
    gameStore.duplicateTemplate(id);
  }

  function handleDeleteTemplate(id: string) {
    if (confirm('确定要删除此模板吗？内置模板无法删除。')) {
      gameStore.deleteTemplate(id);
    }
  }

  function handleCreateNew() {
    gameStore.createNewTemplate();
  }

  function handleBackToList() {
    gameStore.setWorkshopTab('templates');
  }

  function handleUpdateField<K extends keyof SceneTemplate>(key: K, value: SceneTemplate[K]) {
    gameStore.saveDraftToHistory();
    gameStore.updateDraftField(key, value);
  }

  function inputValue(e: Event): string {
    return (e.target as HTMLInputElement).value;
  }

  function inputNumber(e: Event): number {
    return parseFloat(inputValue(e));
  }

  function inputInt(e: Event): number {
    return parseInt(inputValue(e)) || 0;
  }

  function selectValue(e: Event): string {
    return (e.target as HTMLSelectElement).value;
  }

  function textareaValue(e: Event): string {
    return (e.target as HTMLTextAreaElement).value;
  }

  function checkboxChecked(e: Event): boolean {
    return (e.target as HTMLInputElement).checked;
  }

  function rgbToHex(rgb: [number, number, number]): string {
    return '#' + rgb.map(x => Math.round(x).toString(16).padStart(2, '0')).join('');
  }

  function hexToRgb(hex: string): [number, number, number] {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : [0, 0, 0];
  }

  function asCategory(v: string): SceneTemplateCategory {
    return v as SceneTemplateCategory;
  }

  function asDifficulty(v: string): DifficultyLevel {
    return parseInt(v) as DifficultyLevel;
  }

  function asStyle(v: string): TargetStyle {
    return v as TargetStyle;
  }

  function handleTagsInput(e: Event) {
    const val = inputValue(e);
    const tags = val.split(/[,，\s]+/).map(s => s.trim()).filter(Boolean);
    handleUpdateField('tags', tags);
  }

  function handleRecFilmsInput(e: Event) {
    const val = inputValue(e);
    const films = val.split(/[,，\s]+/).map(s => s.trim()).filter(Boolean);
    handleUpdateField('recommendedFilms', films);
  }

  function handleSelectRuleSet(id: string) {
    gameStore.setSelectedRuleSetId(id);
  }

  function handleAddKeyArea() {
    gameStore.saveDraftToHistory();
    gameStore.addKeyArea();
  }

  function handleSelectKeyArea(id: string | null) {
    gameStore.selectKeyArea(id);
  }

  function handleUpdateKeyArea(id: string, field: string, value: any) {
    gameStore.saveDraftToHistory();
    gameStore.updateKeyArea(id, { [field]: value });
  }

  function handleDeleteKeyArea(id: string) {
    gameStore.saveDraftToHistory();
    gameStore.deleteKeyArea(id);
  }

  function handleNormalizeKeyAreas() {
    gameStore.normalizeKeyAreas();
  }

  function handleSave() {
    const validation = gameStore.validateWorkshopDraft();
    if (!validation.valid) {
      alert('保存失败，请修正以下问题：\n' + validation.errors.join('\n'));
      return;
    }
    gameStore.saveTemplate();
    alert('模板保存成功！');
  }

  function handleUndo() {
    gameStore.undoWorkshop();
  }

  function handleRedo() {
    gameStore.redoWorkshop();
  }

  function getDifficultyLabel(level: DifficultyLevel): string {
    return difficulties.find(d => d.key === level)?.label || String(level);
  }

  function getDifficultyColor(level: DifficultyLevel): string {
    return difficulties.find(d => d.key === level)?.color || '#888';
  }

  function getCategoryLabel(cat: SceneTemplateCategory): string {
    return categories.find(c => c.key === cat)?.label || cat;
  }

  function getStyleLabel(s: TargetStyle): string {
    return styles.find(st => st.key === s)?.label || s;
  }

  function formatDate(ts: number): string {
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
</script>

<div class="workshop-overlay" on:click={onClose}>
  <div class="workshop-modal" on:click|stopPropagation>
    <div class="workshop-header">
      <div class="workshop-title">
        <span class="title-icon">🎨</span>
        <div>
          <h2>题材生成工坊</h2>
          <span class="subtitle">自定义场景模板、关键区域与评分规则</span>
        </div>
      </div>
      <button class="close-btn" on:click={onClose}>✕</button>
    </div>

    <div class="workshop-tabs">
      {#each tabs as tab}
        <button
          class="tab-btn {activeTab === tab.key ? 'active' : ''}"
          on:click={() => setTab(tab.key)}
        >
          <span class="tab-icon">{tab.icon}</span>
          <span class="tab-label">{tab.label}</span>
        </button>
      {/each}
    </div>

    <div class="workshop-content">
      {#if activeTab === 'templates'}
        <div class="templates-panel">
          <div class="templates-toolbar">
            <div class="filter-group">
              {#each categories as cat}
                <button
                  class="cat-btn {ws.filterCategory === cat.key ? 'active' : ''}"
                  on:click={() => handleCategoryFilter(cat.key)}
                >
                  {cat.label}
                </button>
              {/each}
            </div>
            <div class="search-group">
              <input
                type="text"
                class="search-input"
                placeholder="搜索模板名称或标签..."
                value={ws.searchKeyword}
                on:input={handleSearch}
              />
              <select class="sort-select" value={ws.sortBy} on:change={handleSortChange}>
                {#each sortOptions as opt}
                  <option value={opt.key}>{opt.label}</option>
                {/each}
              </select>
            </div>
            <button class="primary-btn" on:click={handleCreateNew}>
              <span>＋</span> 新建模板
            </button>
          </div>

          <div class="templates-grid">
            {#if filteredTemplates.length === 0}
              <div class="empty-state">
                <span class="empty-icon">📭</span>
                <p>暂无匹配的模板</p>
                <button class="primary-btn" on:click={handleCreateNew}>创建第一个模板</button>
              </div>
            {:else}
              {#each filteredTemplates as tpl (tpl.id)}
                <div
                  class="template-card {selectedTemplateId === tpl.id ? 'selected' : ''}"
                  on:click={() => handleSelectTemplate(tpl.id)}
                  on:dblclick={() => handleEditTemplate(tpl.id)}
                >
                  <div class="card-thumbnail" style="background: linear-gradient(135deg, {tpl.palette.primary}, {tpl.palette.secondary});">
                    <span class="tpl-diff-badge" style="background: {getDifficultyColor(tpl.difficulty)};">
                      {getDifficultyLabel(tpl.difficulty)}
                    </span>
                    {#if tpl.isBuiltin}
                      <span class="builtin-badge">内置</span>
                    {/if}
                  </div>
                  <div class="card-body">
                    <div class="card-title-row">
                      <h3 class="card-title">{tpl.name}</h3>
                      <span class="card-version">v{tpl.version}</span>
                    </div>
                    <p class="card-desc">{tpl.description}</p>
                    <div class="card-meta">
                      <span class="meta-tag">{getCategoryLabel(tpl.category)}</span>
                      <span class="meta-tag">{getStyleLabel(tpl.targetStyle)}</span>
                      {#if tpl.keyAreas.length > 0}
                        <span class="meta-tag">📍{tpl.keyAreas.length}个关键区域</span>
                      {/if}
                    </div>
                    <div class="card-tags">
                      {#each tpl.tags.slice(0, 3) as tag}
                        <span class="tag-chip">#{tag}</span>
                      {/each}
                    </div>
                    <div class="card-actions">
                      <button class="action-btn" on:click|stopPropagation={() => handleEditTemplate(tpl.id)}>
                        ✏️ 编辑
                      </button>
                      <button class="action-btn" on:click|stopPropagation={() => handleDuplicateTemplate(tpl.id)}>
                        📋 复制
                      </button>
                      {#if !tpl.isBuiltin}
                        <button class="action-btn danger" on:click|stopPropagation={() => handleDeleteTemplate(tpl.id)}>
                          🗑 删除
                        </button>
                      {/if}
                    </div>
                    <div class="card-footer">
                      <span>{formatDate(tpl.updatedAt)}</span>
                      {#if tpl.author}
                        <span>作者：{tpl.author}</span>
                      {/if}
                    </div>
                  </div>
                </div>
              {/each}
            {/if}
          </div>
        </div>

      {:else if activeTab === 'editor'}
        {#if !draft}
          <div class="empty-state">
            <span class="empty-icon">✏️</span>
            <p>请先选择或创建一个模板</p>
            <button class="primary-btn" on:click={handleBackToList}>← 返回模板库</button>
          </div>
        {:else}
          <div class="editor-layout">
            <div class="editor-toolbar">
              <button class="toolbar-btn" on:click={handleBackToList} title="返回">
                ← 模板库
              </button>
              <div class="spacer" />
              <button
                class="toolbar-btn"
                on:click={handleUndo}
                disabled={ws.undoStack.length === 0}
                title="撤销"
              >
                ↩ 撤销 ({ws.undoStack.length})
              </button>
              <button
                class="toolbar-btn"
                on:click={handleRedo}
                disabled={ws.redoStack.length === 0}
                title="重做"
              >
                ↪ 重做 ({ws.redoStack.length})
              </button>
              <div class="mode-switch">
                <button
                  class="mode-btn {editorMode === 'basic' ? 'active' : ''}"
                  on:click={() => gameStore.setWorkshopEditorMode('basic')}
                >
                  基础模式
                </button>
                <button
                  class="mode-btn {editorMode === 'advanced' ? 'active' : ''}"
                  on:click={() => gameStore.setWorkshopEditorMode('advanced')}
                >
                  高级模式
                </button>
              </div>
              <button class="primary-btn save-btn" on:click={handleSave}>
                💾 保存模板
              </button>
            </div>

            <div class="editor-panels">
              <div class="panel basic-info-panel">
                <h3 class="panel-title">📝 基础信息</h3>

                <div class="form-group">
                  <label>场景名称 *</label>
                  <input
                    type="text"
                    class="form-input"
                    value={draft.name}
                    on:input={(e) => handleUpdateField('name', inputValue(e))}
                    placeholder="输入场景名称"
                  />
                </div>

                <div class="form-group">
                  <label>场景描述</label>
                  <textarea
                    class="form-textarea"
                    value={draft.description}
                    on:input={(e) => handleUpdateField('description', textareaValue(e))}
                    placeholder="描述场景特点和拍摄建议"
                    rows="3"
                  />
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label>分类</label>
                    <select
                      class="form-input"
                      value={draft.category}
                      on:change={(e) => handleUpdateField('category', asCategory(selectValue(e)))}
                    >
                      {#each categories.filter(c => c.key !== 'all') as cat}
                        <option value={cat.key}>{cat.label}</option>
                      {/each}
                    </select>
                  </div>
                  <div class="form-group">
                    <label>难度</label>
                    <select
                      class="form-input"
                      value={draft.difficulty}
                      on:change={(e) => handleUpdateField('difficulty', asDifficulty(selectValue(e)))}
                    >
                      {#each difficulties as d}
                        <option value={d.key}>{d.label}</option>
                      {/each}
                    </select>
                  </div>
                </div>

                <div class="form-group">
                  <label>目标风格</label>
                  <select
                    class="form-input"
                    value={draft.targetStyle}
                    on:change={(e) => handleUpdateField('targetStyle', asStyle(selectValue(e)))}
                  >
                    {#each styles as s}
                      <option value={s.key}>{s.label}</option>
                    {/each}
                  </select>
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label>种子值</label>
                    <input
                      type="number"
                      class="form-input"
                      value={draft.seed}
                      on:input={(e) => handleUpdateField('seed', inputInt(e))}
                    />
                  </div>
                  <div class="form-group">
                    <label>评分倍率</label>
                    <input
                      type="number"
                      step="0.1"
                      class="form-input"
                      value={draft.scoreMultiplier}
                      on:input={(e) => handleUpdateField('scoreMultiplier', inputNumber(e) || 1)}
                    />
                  </div>
                </div>

                <div class="form-group">
                  <label>标签（逗号或空格分隔）</label>
                  <input
                    type="text"
                    class="form-input"
                    value={draft.tags.join(', ')}
                    on:input={handleTagsInput}
                    placeholder="复古, 人像, 日系"
                  />
                </div>

                <div class="form-group">
                  <label>推荐胶片 ID（逗号分隔）</label>
                  <input
                    type="text"
                    class="form-input"
                    value={draft.recommendedFilms.join(', ')}
                    on:input={handleRecFilmsInput}
                    placeholder="hp5, trix400"
                  />
                  <div class="hint">
                    可用胶片：{FILM_STOCKS.map(f => f.id).join(', ')}
                  </div>
                </div>
              </div>

              <div class="panel ideal-params-panel">
                <h3 class="panel-title">🎯 理想参数配置</h3>

                <div class="slider-group">
                  <div class="slider-label">
                    <span>理想曝光</span>
                    <span class="slider-value">{draft.idealExposure.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={draft.idealExposure}
                    on:input={(e) => handleUpdateField('idealExposure', inputNumber(e))}
                  />
                </div>

                <div class="slider-group">
                  <div class="slider-label">
                    <span>理想对比度</span>
                    <span class="slider-value">{draft.idealContrast.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={draft.idealContrast}
                    on:input={(e) => handleUpdateField('idealContrast', inputNumber(e))}
                  />
                </div>

                <div class="slider-group">
                  <div class="slider-label">
                    <span>理想饱和度</span>
                    <span class="slider-value">{draft.idealSaturation.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={draft.idealSaturation}
                    on:input={(e) => handleUpdateField('idealSaturation', inputNumber(e))}
                  />
                </div>

                <div class="slider-group">
                  <div class="slider-label">
                    <span>基础亮度</span>
                    <span class="slider-value">{draft.baseBrightness.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={draft.baseBrightness}
                    on:input={(e) => handleUpdateField('baseBrightness', inputNumber(e))}
                  />
                </div>

                {#if editorMode === 'advanced'}
                  <h3 class="panel-subtitle">🎨 场景调色板</h3>

                  <div class="color-row">
                    <div class="color-field">
                      <label>主色</label>
                      <div class="color-input-wrapper">
                        <input
                          type="color"
                          value={draft.palette.primary}
                          on:input={(e) => handleUpdateField('palette', { ...draft.palette, primary: inputValue(e) })}
                        />
                        <span class="color-hex">{draft.palette.primary}</span>
                      </div>
                    </div>
                    <div class="color-field">
                      <label>辅色</label>
                      <div class="color-input-wrapper">
                        <input
                          type="color"
                          value={draft.palette.secondary}
                          on:input={(e) => handleUpdateField('palette', { ...draft.palette, secondary: inputValue(e) })}
                        />
                        <span class="color-hex">{draft.palette.secondary}</span>
                      </div>
                    </div>
                  </div>

                  <div class="color-row">
                    <div class="color-field">
                      <label>强调色</label>
                      <div class="color-input-wrapper">
                        <input
                          type="color"
                          value={rgbToHex(draft.palette.accent)}
                          on:input={(e) => handleUpdateField('palette', { ...draft.palette, accent: hexToRgb(inputValue(e)) })}
                        />
                        <span class="color-hex">{rgbToHex(draft.palette.accent)}</span>
                      </div>
                    </div>
                    <div class="color-field">
                      <label>中性色</label>
                      <div class="color-input-wrapper">
                        <input
                          type="color"
                          value={draft.palette.neutral}
                          on:input={(e) => handleUpdateField('palette', { ...draft.palette, neutral: inputValue(e) })}
                        />
                        <span class="color-hex">{draft.palette.neutral}</span>
                      </div>
                    </div>
                  </div>

                  <div class="color-field">
                    <label>背景色</label>
                    <div class="color-input-wrapper">
                      <input
                        type="color"
                        value={draft.palette.background}
                        on:input={(e) => handleUpdateField('palette', { ...draft.palette, background: inputValue(e) })}
                      />
                      <span class="color-hex">{draft.palette.background}</span>
                    </div>
                  </div>
                {/if}
              </div>

              <div class="panel key-areas-panel">
                <div class="panel-header">
                  <h3 class="panel-title">📍 关键区域定义</h3>
                  <div class="panel-actions">
                    <button class="mini-btn" on:click={handleNormalizeKeyAreas} title="自动归一化重要度">
                      ⚖️ 归一化
                    </button>
                    <button class="mini-btn primary" on:click={handleAddKeyArea}>
                      ＋ 添加区域
                    </button>
                  </div>
                </div>

                {#if draftKeyAreas.length === 0}
                  <div class="empty-state small">
                    <p>暂无关键区域，点击右上角添加</p>
                  </div>
                {:else}
                  <div class="key-areas-list">
                    {#each draftKeyAreas as area (area.id)}
                      <div
                        class="key-area-item {selectedKeyAreaId === area.id ? 'selected' : ''}"
                        on:click={() => handleSelectKeyArea(area.id)}
                      >
                        <div class="area-color-indicator" style="background: {area.color};" />
                        <div class="area-main">
                          <div class="area-header-row">
                            <input
                              type="text"
                              class="area-name-input"
                              value={area.name}
                              on:input={(e) => handleUpdateKeyArea(area.id, 'name', inputValue(e))}
                              on:click|stopPropagation
                              placeholder="区域名称"
                            />
                            <span class="area-importance-badge">{Math.round(area.importance * 100)}%</span>
                          </div>
                          <div class="area-sliders" on:click|stopPropagation>
                            <div class="mini-slider">
                              <span>X</span>
                              <input
                                type="range"
                                min="0"
                                max="100"
                                value={area.x}
                                on:input={(e) => handleUpdateKeyArea(area.id, 'x', inputInt(e))}
                              />
                              <span>{area.x}%</span>
                            </div>
                            <div class="mini-slider">
                              <span>Y</span>
                              <input
                                type="range"
                                min="0"
                                max="100"
                                value={area.y}
                                on:input={(e) => handleUpdateKeyArea(area.id, 'y', inputInt(e))}
                              />
                              <span>{area.y}%</span>
                            </div>
                            <div class="mini-slider">
                              <span>宽</span>
                              <input
                                type="range"
                                min="5"
                                max="100"
                                value={area.width}
                                on:input={(e) => handleUpdateKeyArea(area.id, 'width', inputInt(e))}
                              />
                              <span>{area.width}%</span>
                            </div>
                            <div class="mini-slider">
                              <span>高</span>
                              <input
                                type="range"
                                min="5"
                                max="100"
                                value={area.height}
                                on:input={(e) => handleUpdateKeyArea(area.id, 'height', inputInt(e))}
                              />
                              <span>{area.height}%</span>
                            </div>
                          </div>
                          <div class="area-bottom-row" on:click|stopPropagation>
                            <div class="mini-slider wide">
                              <span>重要度</span>
                              <input
                                type="range"
                                min="0.05"
                                max="1"
                                step="0.05"
                                value={area.importance}
                                on:input={(e) => handleUpdateKeyArea(area.id, 'importance', inputNumber(e))}
                              />
                            </div>
                            <div class="area-tolerance" title="容差">
                              <span>容差</span>
                              <input
                                type="number"
                                step="0.05"
                                min="0.05"
                                max="0.5"
                                class="tolerance-input"
                                value={area.tolerance}
                                on:input={(e) => handleUpdateKeyArea(area.id, 'tolerance', inputNumber(e))}
                              />
                            </div>
                            <input
                              type="color"
                              class="area-color-picker"
                              value={area.color}
                              on:input={(e) => handleUpdateKeyArea(area.id, 'color', inputValue(e))}
                              title="区域颜色"
                            />
                            <button
                              class="area-delete-btn"
                              on:click={() => handleDeleteKeyArea(area.id)}
                              title="删除区域"
                            >
                              🗑
                            </button>
                          </div>
                        </div>
                      </div>
                    {/each}
                  </div>
                {/if}
              </div>
            </div>
          </div>
        {/if}

      {:else if activeTab === 'preview'}
        {#if !draft}
          <div class="empty-state">
            <span class="empty-icon">🎞</span>
            <p>请先选择或创建一个模板</p>
            <button class="primary-btn" on:click={handleBackToList}>← 返回模板库</button>
          </div>
        {:else}
          <div class="preview-layout">
            <div class="preview-canvas-area">
              <div class="preview-title-row">
                <h3>{draft.name} — 实时预览</h3>
                <div class="preview-score">
                  <span class="score-label">预测得分</span>
                  <span class="score-value" style="color: {predictedScore >= 85 ? '#5c8a5c' : predictedScore >= 70 ? '#c8a858' : '#c86868'};">
                    {predictedScore}
                  </span>
                  <span class="score-grade">{predictedGrade}</span>
                </div>
              </div>

              <div class="preview-canvas-wrapper">
                <PhotoCanvas
                  subject={convertTemplateToSubject(draft)}
                  film={FILM_STOCKS[0]}
                  params={previewParams}
                  progress={1}
                  showNegative={false}
                  mode="preview"
                  stage="develop"
                  stageProgress={1}
                />
                {#if showKeyAreasInPreview && draftKeyAreas.length > 0}
                  <div class="key-areas-overlay">
                    {#each draftKeyAreas as area}
                      <div
                        class="overlay-area"
                        style="left: {area.x}%; top: {area.y}%; width: {area.width}%; height: {area.height}%; border-color: {area.color};"
                        title="{area.name} ({Math.round(area.importance * 100)}%)"
                      >
                        <span class="overlay-label" style="background: {area.color};">
                          {area.name}
                        </span>
                      </div>
                    {/each}
                  </div>
                {/if}
              </div>
            </div>

            <div class="preview-controls">
              <h3 class="panel-title">⚙️ 预览参数调节</h3>
              <p class="hint">调整参数查看对评分的实时影响</p>

              <div class="slider-group">
                <div class="slider-label">
                  <span>曝光</span>
                  <span class="slider-value">{previewParams.exposure.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={previewParams.exposure}
                  on:input={(e) => gameStore.setPreviewParams({ exposure: inputNumber(e) })}
                />
                <div class="slider-target">理想值：{draft.idealExposure.toFixed(2)}</div>
              </div>

              <div class="slider-group">
                <div class="slider-label">
                  <span>对比度</span>
                  <span class="slider-value">{previewParams.contrast.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={previewParams.contrast}
                  on:input={(e) => gameStore.setPreviewParams({ contrast: inputNumber(e) })}
                />
                <div class="slider-target">理想值：{draft.idealContrast.toFixed(2)}</div>
              </div>

              <div class="slider-group">
                <div class="slider-label">
                  <span>饱和度</span>
                  <span class="slider-value">{previewParams.saturation.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={previewParams.saturation}
                  on:input={(e) => gameStore.setPreviewParams({ saturation: inputNumber(e) })}
                />
                <div class="slider-target">理想值：{draft.idealSaturation.toFixed(2)}</div>
              </div>

              <div class="slider-group">
                <div class="slider-label">
                  <span>显影时间</span>
                  <span class="slider-value">{previewParams.developmentTime.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={previewParams.developmentTime}
                  on:input={(e) => gameStore.setPreviewParams({ developmentTime: inputNumber(e) })}
                />
              </div>

              <div class="slider-group">
                <div class="slider-label">
                  <span>温度</span>
                  <span class="slider-value">{previewParams.temperature.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={previewParams.temperature}
                  on:input={(e) => gameStore.setPreviewParams({ temperature: inputNumber(e) })}
                />
              </div>

              <div class="toggle-row">
                <label class="toggle">
                  <input
                    type="checkbox"
                    checked={showKeyAreasInPreview}
                    on:change={(e) => gameStore.setShowKeyAreasInPreview(checkboxChecked(e))}
                  />
                  <span>显示关键区域</span>
                </label>
              </div>

              <button
                class="primary-btn full-width"
                on:click={() => gameStore.setPreviewParams({ ...draft.previewParams })}
              >
                ↺ 重置为理想参数
              </button>
            </div>
          </div>
        {/if}

      {:else if activeTab === 'scoring'}
        <div class="scoring-layout">
          <div class="scoring-list-panel">
            <h3 class="panel-title">📋 评分规则集</h3>
            <p class="hint">选择一套评分规则挂接到当前模板</p>

            <div class="ruleset-list">
              {#each ruleSets as rs}
                <div
                  class="ruleset-card {selectedRuleSetId === rs.id ? 'selected' : ''}"
                  on:click={() => handleSelectRuleSet(rs.id)}
                >
                  <div class="ruleset-header">
                    <h4>{rs.name}</h4>
                    {#if rs.isBuiltin}
                      <span class="builtin-badge">内置</span>
                    {/if}
                    {#if draft && draft.scoringRuleSetId === rs.id}
                      <span class="active-badge">当前挂接</span>
                    {/if}
                  </div>
                  <p class="ruleset-desc">{rs.description}</p>
                  <div class="ruleset-meta">
                    <span>共 {rs.rules.length} 条规则</span>
                    <span>宽容度：{Math.round((rs.toleranceMultiplier ?? 1) * 100)}%</span>
                    <span>最低分：{rs.minPassScore ?? 60}</span>
                  </div>
                  <div class="ruleset-tags">
                    {#each (rs.tags ?? []) as tag}
                      <span class="tag-chip">{tag}</span>
                    {/each}
                  </div>
                </div>
              {/each}
            </div>
          </div>

          <div class="scoring-detail-panel">
            {#if selectedRuleSet}
              <h3 class="panel-title">{selectedRuleSet.name} — 规则详情</h3>
              <p class="hint">{selectedRuleSet.description}</p>

              <div class="rule-list">
                {#each selectedRuleSet.rules as rule}
                  <div class="rule-card">
                    <div class="rule-header">
                      <span class="rule-name">{rule.name}</span>
                      <span class="rule-weight" style="background: {rule.critical ? '#c86868' : '#8a7a5a'};">
                        {rule.critical ? '关键' : '权重'} ×{rule.weight.toFixed(1)}
                      </span>
                    </div>
                    <p class="rule-desc">{rule.description}</p>
                    <div class="rule-params">
                      {#if rule.param}
                        <span class="rule-param">参数：{rule.param}</span>
                      {/if}
                      {#if rule.targetValue !== undefined}
                        <span class="rule-param">目标值：{rule.targetValue.toFixed(2)}</span>
                      {/if}
                      {#if rule.tolerance !== undefined}
                        <span class="rule-param">容差：±{rule.tolerance.toFixed(2)}</span>
                      {/if}
                    </div>
                  </div>
                {/each}
              </div>

              <div class="scoring-summary">
                <h4>评分概览</h4>
                <div class="summary-row">
                  <span>及格分数</span>
                  <span class="summary-value">{selectedRuleSet.minPassScore ?? 60} / 100</span>
                </div>
                <div class="summary-row">
                  <span>宽容度倍率</span>
                  <span class="summary-value">×{(selectedRuleSet.toleranceMultiplier ?? 1).toFixed(2)}</span>
                </div>
                <div class="summary-row">
                  <span>关键规则惩罚</span>
                  <span class="summary-value">-{selectedRuleSet.criticalFailurePenalty ?? 10} 分</span>
                </div>
              </div>
            {:else}
              <div class="empty-state">
                <span class="empty-icon">📊</span>
                <p>请选择一套评分规则</p>
              </div>
            {/if}
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .workshop-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.75);
    backdrop-filter: blur(6px);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
  }

  .workshop-modal {
    width: 100%;
    max-width: 1400px;
    height: 90vh;
    background: linear-gradient(180deg, #2a1a12 0%, #1a0f0a 100%);
    border: 1px solid rgba(200, 168, 120, 0.25);
    border-radius: 16px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 24px 80px rgba(0, 0, 0, 0.6);
  }

  .workshop-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 24px;
    border-bottom: 1px solid rgba(200, 168, 120, 0.15);
    background: rgba(0, 0, 0, 0.2);
  }

  .workshop-title {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .title-icon {
    font-size: 36px;
    filter: drop-shadow(0 2px 8px rgba(200, 150, 80, 0.4));
  }

  .workshop-title h2 {
    margin: 0;
    font-size: 22px;
    color: #e8c890;
    letter-spacing: 3px;
  }

  .subtitle {
    font-size: 12px;
    color: #8a7a5a;
    letter-spacing: 1px;
  }

  .close-btn {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    background: rgba(200, 104, 104, 0.15);
    border: 1px solid rgba(200, 104, 104, 0.3);
    color: #c86868;
    font-size: 18px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .close-btn:hover {
    background: rgba(200, 104, 104, 0.3);
  }

  .workshop-tabs {
    display: flex;
    padding: 0 24px;
    gap: 4px;
    background: rgba(0, 0, 0, 0.15);
    border-bottom: 1px solid rgba(200, 168, 120, 0.1);
  }

  .tab-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 20px;
    background: transparent;
    border: none;
    color: #8a7a5a;
    font-size: 14px;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    transition: all 0.2s ease;
  }

  .tab-btn:hover {
    color: #c8a878;
    background: rgba(200, 168, 120, 0.05);
  }

  .tab-btn.active {
    color: #e8c890;
    border-bottom-color: #c8a858;
  }

  .tab-icon {
    font-size: 16px;
  }

  .workshop-content {
    flex: 1;
    overflow: auto;
    padding: 20px 24px;
  }

  .templates-toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: center;
    margin-bottom: 20px;
    padding-bottom: 16px;
    border-bottom: 1px solid rgba(200, 168, 120, 0.1);
  }

  .filter-group {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .cat-btn {
    padding: 6px 14px;
    border-radius: 16px;
    background: rgba(139, 90, 43, 0.1);
    border: 1px solid rgba(139, 90, 43, 0.2);
    color: #a89878;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .cat-btn:hover {
    background: rgba(139, 90, 43, 0.2);
    color: #c8a878;
  }

  .cat-btn.active {
    background: rgba(200, 168, 88, 0.25);
    border-color: rgba(200, 168, 88, 0.5);
    color: #f0d8a8;
  }

  .search-group {
    display: flex;
    gap: 8px;
    margin-left: auto;
  }

  .search-input {
    padding: 8px 14px;
    border-radius: 8px;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(139, 90, 43, 0.25);
    color: #e8dcc4;
    font-size: 13px;
    width: 240px;
    outline: none;
  }

  .search-input:focus {
    border-color: rgba(200, 168, 88, 0.5);
  }

  .sort-select {
    padding: 8px 12px;
    border-radius: 8px;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(139, 90, 43, 0.25);
    color: #e8dcc4;
    font-size: 13px;
    outline: none;
  }

  .primary-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 18px;
    border-radius: 8px;
    background: linear-gradient(135deg, #c8a858, #a88838);
    border: none;
    color: #1a0f0a;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .primary-btn:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 16px rgba(200, 168, 88, 0.35);
  }

  .primary-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .primary-btn.full-width {
    width: 100%;
    justify-content: center;
    margin-top: 8px;
  }

  .templates-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 16px;
  }

  .template-card {
    background: rgba(0, 0, 0, 0.25);
    border: 1px solid rgba(139, 90, 43, 0.2);
    border-radius: 12px;
    overflow: hidden;
    cursor: pointer;
    transition: all 0.25s ease;
  }

  .template-card:hover {
    border-color: rgba(200, 168, 88, 0.4);
    transform: translateY(-3px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  }

  .template-card.selected {
    border-color: rgba(200, 168, 88, 0.7);
    box-shadow: 0 0 0 2px rgba(200, 168, 88, 0.2);
  }

  .card-thumbnail {
    position: relative;
    height: 120px;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    padding: 10px;
  }

  .tpl-diff-badge {
    padding: 3px 10px;
    border-radius: 10px;
    font-size: 11px;
    color: #fff;
    font-weight: 500;
  }

  .builtin-badge {
    padding: 3px 10px;
    border-radius: 10px;
    background: rgba(26, 15, 10, 0.7);
    font-size: 11px;
    color: #c8a878;
    border: 1px solid rgba(200, 168, 120, 0.3);
  }

  .card-body {
    padding: 14px;
  }

  .card-title-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 6px;
  }

  .card-title {
    margin: 0;
    font-size: 15px;
    color: #e8dcc4;
    font-weight: 600;
  }

  .card-version {
    font-size: 11px;
    color: #7a6a55;
  }

  .card-desc {
    margin: 0 0 10px;
    font-size: 12px;
    color: #a89878;
    line-height: 1.5;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .card-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 10px;
  }

  .meta-tag {
    padding: 3px 8px;
    border-radius: 6px;
    background: rgba(139, 90, 43, 0.15);
    font-size: 11px;
    color: #a89878;
  }

  .card-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-bottom: 12px;
  }

  .tag-chip {
    padding: 2px 8px;
    border-radius: 8px;
    background: rgba(200, 168, 88, 0.1);
    font-size: 11px;
    color: #c8a858;
  }

  .card-actions {
    display: flex;
    gap: 6px;
    margin-bottom: 10px;
  }

  .action-btn {
    flex: 1;
    padding: 6px;
    border-radius: 6px;
    background: rgba(139, 90, 43, 0.15);
    border: 1px solid rgba(139, 90, 43, 0.25);
    color: #a89878;
    font-size: 11px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .action-btn:hover {
    background: rgba(139, 90, 43, 0.3);
    color: #e8dcc4;
  }

  .action-btn.danger:hover {
    background: rgba(200, 104, 104, 0.2);
    border-color: rgba(200, 104, 104, 0.4);
    color: #e8a8a8;
  }

  .card-footer {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    color: #6a5a4a;
    padding-top: 10px;
    border-top: 1px solid rgba(139, 90, 43, 0.1);
  }

  .empty-state {
    grid-column: 1 / -1;
    text-align: center;
    padding: 60px 20px;
    color: #7a6a55;
  }

  .empty-state.small {
    padding: 30px 20px;
  }

  .empty-icon {
    font-size: 48px;
    display: block;
    margin-bottom: 12px;
    opacity: 0.5;
  }

  .empty-state p {
    margin: 0 0 16px;
  }

  .editor-layout {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .editor-toolbar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    background: rgba(0, 0, 0, 0.25);
    border-radius: 10px;
    margin-bottom: 16px;
    border: 1px solid rgba(139, 90, 43, 0.15);
  }

  .toolbar-btn {
    padding: 6px 14px;
    border-radius: 6px;
    background: rgba(139, 90, 43, 0.1);
    border: 1px solid rgba(139, 90, 43, 0.2);
    color: #a89878;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .toolbar-btn:hover:not(:disabled) {
    background: rgba(139, 90, 43, 0.2);
    color: #e8dcc4;
  }

  .toolbar-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .spacer {
    flex: 1;
  }

  .mode-switch {
    display: flex;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 8px;
    padding: 3px;
  }

  .mode-btn {
    padding: 5px 14px;
    border-radius: 6px;
    background: transparent;
    border: none;
    color: #8a7a5a;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .mode-btn.active {
    background: rgba(200, 168, 88, 0.25);
    color: #f0d8a8;
  }

  .save-btn {
    padding: 8px 20px;
  }

  .editor-panels {
    display: grid;
    grid-template-columns: 1fr 1fr 1.2fr;
    gap: 16px;
    flex: 1;
    overflow: auto;
  }

  .panel {
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(139, 90, 43, 0.15);
    border-radius: 12px;
    padding: 18px;
    overflow: auto;
  }

  .panel-title {
    margin: 0 0 14px;
    font-size: 15px;
    color: #e8c890;
  }

  .panel-subtitle {
    margin: 18px 0 10px;
    font-size: 13px;
    color: #c8a878;
    padding-top: 14px;
    border-top: 1px solid rgba(139, 90, 43, 0.15);
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 14px;
  }

  .panel-header .panel-title {
    margin: 0;
  }

  .panel-actions {
    display: flex;
    gap: 8px;
  }

  .mini-btn {
    padding: 5px 10px;
    border-radius: 6px;
    background: rgba(139, 90, 43, 0.15);
    border: 1px solid rgba(139, 90, 43, 0.25);
    color: #a89878;
    font-size: 11px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .mini-btn:hover {
    background: rgba(139, 90, 43, 0.3);
    color: #e8dcc4;
  }

  .mini-btn.primary {
    background: linear-gradient(135deg, rgba(200, 168, 88, 0.4), rgba(168, 136, 56, 0.4));
    border-color: rgba(200, 168, 88, 0.5);
    color: #f0d8a8;
  }

  .form-group {
    margin-bottom: 14px;
  }

  .form-group label {
    display: block;
    font-size: 12px;
    color: #a89878;
    margin-bottom: 6px;
  }

  .form-input,
  .form-textarea,
  .form-select {
    width: 100%;
    padding: 8px 12px;
    border-radius: 8px;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(139, 90, 43, 0.25);
    color: #e8dcc4;
    font-size: 13px;
    outline: none;
    font-family: inherit;
    box-sizing: border-box;
  }

  .form-input:focus,
  .form-textarea:focus,
  .form-select:focus {
    border-color: rgba(200, 168, 88, 0.5);
  }

  .form-textarea {
    resize: vertical;
    min-height: 60px;
  }

  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .hint {
    font-size: 11px;
    color: #6a5a4a;
    margin-top: 4px;
  }

  .slider-group {
    margin-bottom: 16px;
  }

  .slider-label {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    color: #a89878;
    margin-bottom: 6px;
  }

  .slider-value {
    color: #e8c890;
    font-weight: 500;
  }

  .slider-group input[type='range'] {
    width: 100%;
    accent-color: #c8a858;
  }

  .slider-target {
    font-size: 11px;
    color: #6a5a4a;
    text-align: right;
    margin-top: 2px;
  }

  .color-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 12px;
  }

  .color-field {
    margin-bottom: 12px;
  }

  .color-field label {
    display: block;
    font-size: 12px;
    color: #a89878;
    margin-bottom: 6px;
  }

  .color-input-wrapper {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .color-input-wrapper input[type='color'] {
    width: 40px;
    height: 32px;
    border: 1px solid rgba(139, 90, 43, 0.25);
    border-radius: 6px;
    background: transparent;
    cursor: pointer;
    padding: 2px;
  }

  .color-hex {
    font-size: 12px;
    color: #8a7a5a;
    font-family: monospace;
  }

  .key-areas-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .key-area-item {
    display: flex;
    gap: 10px;
    padding: 12px;
    border-radius: 10px;
    background: rgba(0, 0, 0, 0.25);
    border: 1px solid rgba(139, 90, 43, 0.15);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .key-area-item:hover {
    border-color: rgba(139, 90, 43, 0.3);
  }

  .key-area-item.selected {
    border-color: rgba(200, 168, 88, 0.5);
    background: rgba(200, 168, 88, 0.08);
  }

  .area-color-indicator {
    width: 6px;
    border-radius: 3px;
    flex-shrink: 0;
    min-height: 20px;
  }

  .area-main {
    flex: 1;
    min-width: 0;
  }

  .area-header-row {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 10px;
  }

  .area-name-input {
    flex: 1;
    padding: 5px 10px;
    border-radius: 6px;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(139, 90, 43, 0.2);
    color: #e8dcc4;
    font-size: 13px;
    outline: none;
  }

  .area-name-input:focus {
    border-color: rgba(200, 168, 88, 0.5);
  }

  .area-importance-badge {
    padding: 3px 10px;
    border-radius: 10px;
    background: rgba(200, 168, 88, 0.2);
    color: #f0d8a8;
    font-size: 11px;
    font-weight: 500;
    flex-shrink: 0;
  }

  .area-sliders {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px 12px;
    margin-bottom: 10px;
  }

  .mini-slider {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .mini-slider.wide {
    grid-column: 1 / -1;
  }

  .mini-slider > span:first-child {
    font-size: 11px;
    color: #7a6a55;
    min-width: 24px;
  }

  .mini-slider input[type='range'] {
    flex: 1;
    accent-color: #c8a858;
  }

  .mini-slider > span:last-child {
    font-size: 11px;
    color: #8a7a5a;
    min-width: 32px;
    text-align: right;
  }

  .area-bottom-row {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .area-bottom-row .mini-slider {
    flex: 1;
  }

  .area-tolerance {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .area-tolerance > span {
    font-size: 11px;
    color: #7a6a55;
  }

  .tolerance-input {
    width: 60px;
    padding: 4px 8px;
    border-radius: 6px;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(139, 90, 43, 0.2);
    color: #e8dcc4;
    font-size: 11px;
    outline: none;
  }

  .tolerance-input:focus {
    border-color: rgba(200, 168, 88, 0.5);
  }

  .area-color-picker {
    width: 28px;
    height: 28px;
    border: 1px solid rgba(139, 90, 43, 0.25);
    border-radius: 6px;
    background: transparent;
    cursor: pointer;
    padding: 2px;
  }

  .area-delete-btn {
    width: 28px;
    height: 28px;
    border-radius: 6px;
    background: rgba(200, 104, 104, 0.1);
    border: 1px solid rgba(200, 104, 104, 0.2);
    color: #c86868;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .area-delete-btn:hover {
    background: rgba(200, 104, 104, 0.25);
  }

  .preview-layout {
    display: grid;
    grid-template-columns: 1fr 360px;
    gap: 20px;
    height: 100%;
  }

  .preview-canvas-area {
    display: flex;
    flex-direction: column;
  }

  .preview-title-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 14px;
  }

  .preview-title-row h3 {
    margin: 0;
    font-size: 16px;
    color: #e8c890;
  }

  .preview-score {
    display: flex;
    align-items: baseline;
    gap: 10px;
    padding: 8px 16px;
    border-radius: 10px;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(139, 90, 43, 0.2);
  }

  .score-label {
    font-size: 11px;
    color: #7a6a5a;
  }

  .score-value {
    font-size: 24px;
    font-weight: 700;
  }

  .score-grade {
    font-size: 20px;
    font-weight: 700;
    color: #c8a858;
  }

  .preview-canvas-wrapper {
    position: relative;
    flex: 1;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 12px;
    overflow: hidden;
    border: 1px solid rgba(139, 90, 43, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 400px;
  }

  .key-areas-overlay {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  .overlay-area {
    position: absolute;
    border: 2px dashed;
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.05);
  }

  .overlay-label {
    position: absolute;
    top: -10px;
    left: 6px;
    padding: 2px 8px;
    border-radius: 8px;
    font-size: 10px;
    color: #fff;
    opacity: 0.9;
  }

  .preview-controls {
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(139, 90, 43, 0.15);
    border-radius: 12px;
    padding: 18px;
    overflow: auto;
  }

  .toggle-row {
    margin: 12px 0;
  }

  .toggle {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    font-size: 13px;
    color: #a89878;
  }

  .toggle input {
    accent-color: #c8a858;
  }

  .scoring-layout {
    display: grid;
    grid-template-columns: 1fr 1.2fr;
    gap: 20px;
    height: 100%;
  }

  .scoring-list-panel,
  .scoring-detail-panel {
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(139, 90, 43, 0.15);
    border-radius: 12px;
    padding: 18px;
    overflow: auto;
  }

  .ruleset-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .ruleset-card {
    padding: 14px;
    border-radius: 10px;
    background: rgba(0, 0, 0, 0.25);
    border: 1px solid rgba(139, 90, 43, 0.15);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .ruleset-card:hover {
    border-color: rgba(139, 90, 43, 0.3);
  }

  .ruleset-card.selected {
    border-color: rgba(200, 168, 88, 0.6);
    background: rgba(200, 168, 88, 0.08);
  }

  .ruleset-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
  }

  .ruleset-header h4 {
    margin: 0;
    font-size: 14px;
    color: #e8dcc4;
  }

  .active-badge {
    padding: 2px 8px;
    border-radius: 8px;
    background: rgba(92, 138, 92, 0.25);
    border: 1px solid rgba(92, 138, 92, 0.4);
    font-size: 10px;
    color: #8ac88a;
  }

  .ruleset-desc {
    margin: 0 0 10px;
    font-size: 12px;
    color: #8a7a5a;
    line-height: 1.5;
  }

  .ruleset-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-bottom: 8px;
  }

  .ruleset-meta span {
    font-size: 11px;
    color: #7a6a5a;
  }

  .ruleset-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .rule-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 20px;
  }

  .rule-card {
    padding: 12px;
    border-radius: 8px;
    background: rgba(0, 0, 0, 0.25);
    border: 1px solid rgba(139, 90, 43, 0.15);
  }

  .rule-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
  }

  .rule-name {
    font-size: 13px;
    color: #e8dcc4;
    font-weight: 500;
  }

  .rule-weight {
    padding: 3px 10px;
    border-radius: 8px;
    font-size: 11px;
    color: #fff;
  }

  .rule-desc {
    margin: 0 0 8px;
    font-size: 12px;
    color: #8a7a5a;
    line-height: 1.5;
  }

  .rule-params {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .rule-param {
    padding: 2px 8px;
    border-radius: 6px;
    background: rgba(139, 90, 43, 0.15);
    font-size: 11px;
    color: #a89878;
  }

  .scoring-summary {
    padding: 14px;
    border-radius: 10px;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(139, 90, 43, 0.15);
  }

  .scoring-summary h4 {
    margin: 0 0 12px;
    font-size: 13px;
    color: #c8a878;
  }

  .summary-row {
    display: flex;
    justify-content: space-between;
    padding: 6px 0;
    border-bottom: 1px solid rgba(139, 90, 43, 0.1);
  }

  .summary-row:last-child {
    border-bottom: none;
  }

  .summary-row span:first-child {
    font-size: 12px;
    color: #8a7a5a;
  }

  .summary-value {
    font-size: 13px;
    color: #e8c890;
    font-weight: 500;
  }
</style>
