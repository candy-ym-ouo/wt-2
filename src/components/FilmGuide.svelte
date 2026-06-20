<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { gameStore } from '../stores/gameStore';
  import { FILM_STOCKS, FILM_KNOWLEDGE_ENTRIES, SCENE_TYPE_LABELS, PROCESS_TYPE_LABELS, DIFFICULTY_LABELS, PHOTO_SUBJECTS } from '../data/gameData';
  import type { FilmKnowledgeEntry, FilmGuideTab, FilmSubjectSuitability, FilmDevSuggestion, FilmPracticeEntry, FilmAttributeProfile } from '../types/game';

  const dispatch = createEventDispatcher<{ close: void; startPractice: { filmId: string; subjectId: string } }>();

  $: filmGuide = $gameStore.filmGuide;
  $: activeTab = filmGuide.activeTab;
  $: selectedFilmId = filmGuide.selectedFilmId;
  $: searchKeyword = filmGuide.searchKeyword;
  $: filterColor = filmGuide.filterColor;
  $: filterSceneType = filmGuide.filterSceneType;
  $: viewedFilmIds = filmGuide.viewedFilmIds;

  $: selectedEntry = selectedFilmId
    ? FILM_KNOWLEDGE_ENTRIES.find(e => e.filmId === selectedFilmId) ?? null
    : null;

  $: selectedFilmStock = selectedFilmId
    ? FILM_STOCKS.find(f => f.id === selectedFilmId) ?? null
    : null;

  $: filteredEntries = FILM_KNOWLEDGE_ENTRIES.filter(e => {
    if (filterColor !== 'all') {
      const film = FILM_STOCKS.find(f => f.id === e.filmId);
      if (film && film.color !== filterColor) return false;
    }
    if (filterSceneType !== 'all') {
      const hasMatch = e.subjectSuitabilities.some(s => s.sceneType === filterSceneType);
      if (!hasMatch) return false;
    }
    if (searchKeyword.trim()) {
      const kw = searchKeyword.trim().toLowerCase();
      const inName = e.filmName.toLowerCase().includes(kw);
      const inSummary = e.summary.toLowerCase().includes(kw);
      const inChars = e.characteristics.some(c => c.toLowerCase().includes(kw));
      const inPros = e.pros.some(p => p.toLowerCase().includes(kw));
      const inTips = e.tips.some(t => t.toLowerCase().includes(kw));
      if (!inName && !inSummary && !inChars && !inPros && !inTips) return false;
    }
    return true;
  });

  $: samplePhotos = selectedFilmId
    ? $gameStore.processedPhotos.filter(p => p.filmId === selectedFilmId)
    : [];

  const TAB_CONFIG: { key: FilmGuideTab; label: string; icon: string }[] = [
    { key: 'overview', label: '总览', icon: '📖' },
    { key: 'attributes', label: '属性', icon: '📊' },
    { key: 'subjects', label: '适拍题材', icon: '🎯' },
    { key: 'samples', label: '典型样片', icon: '🖼' },
    { key: 'develop', label: '冲洗建议', icon: '⚗️' },
    { key: 'practice', label: '练习入口', icon: '🎮' }
  ];

  function selectFilm(filmId: string) {
    gameStore.selectFilmGuideFilm(filmId);
  }

  function setTab(tab: FilmGuideTab) {
    gameStore.setFilmGuideTab(tab);
  }

  function handleStartPractice(filmId: string, subjectId: string) {
    gameStore.startFilmGuidePractice(filmId, subjectId);
    dispatch('startPractice', { filmId, subjectId });
    dispatch('close');
  }

  function getMatchColor(score: number): string {
    if (score >= 0.85) return '#10b981';
    if (score >= 0.7) return '#3b82f6';
    if (score >= 0.5) return '#f59e0b';
    return '#ef4444';
  }

  function getMatchLabel(score: number): string {
    if (score >= 0.85) return '极佳';
    if (score >= 0.7) return '良好';
    if (score >= 0.5) return '一般';
    return '不佳';
  }

  function getAttrBarColor(key: string): string {
    const colors: Record<string, string> = {
      contrast: 'linear-gradient(90deg, #8b5a2b, #d4a574)',
      saturation: 'linear-gradient(90deg, #8b2a5a, #e05090)',
      grain: 'linear-gradient(90deg, #5a5a5a, #9a9a9a)',
      iso: 'linear-gradient(90deg, #2a6a8b, #50b0e0)',
      latitude: 'linear-gradient(90deg, #2a8b4a, #50e080)',
      sharpness: 'linear-gradient(90deg, #8b6a2a, #e0c050)'
    };
    return colors[key] || colors.contrast;
  }
</script>

<div class="guide-overlay" on:click|self={() => dispatch('close')}>
  <div class="guide-panel">
    <div class="guide-header">
      <div class="guide-title-area">
        <span class="guide-icon">📖</span>
        <div>
          <h2 class="guide-title">胶片知识图鉴</h2>
          <span class="guide-subtitle">FILM KNOWLEDGE ATLAS</span>
        </div>
      </div>
      <div class="guide-header-right">
        <div class="viewed-count">
          <span class="viewed-label">已阅</span>
          <span class="viewed-value">{viewedFilmIds.length}/{FILM_KNOWLEDGE_ENTRIES.length}</span>
        </div>
        <button class="close-btn" on:click={() => dispatch('close')}>✕</button>
      </div>
    </div>

    <div class="guide-toolbar">
      <div class="search-box">
        <span class="search-icon">🔍</span>
        <input
          type="text"
          placeholder="搜索胶片名称、特性..."
          value={searchKeyword}
          on:input={(e) => gameStore.setFilmGuideSearch(e.currentTarget.value)}
        />
      </div>
      <div class="filter-group">
        <button
          class="filter-btn"
          class:active={filterColor === 'all'}
          on:click={() => gameStore.setFilmGuideFilterColor('all')}
        >全部</button>
        <button
          class="filter-btn"
          class:active={filterColor === 'bw'}
          on:click={() => gameStore.setFilmGuideFilterColor('bw')}
        >黑白</button>
        <button
          class="filter-btn"
          class:active={filterColor === 'color'}
          on:click={() => gameStore.setFilmGuideFilterColor('color')}
        >彩色</button>
      </div>
      <div class="filter-group">
        <select
          class="scene-select"
          value={filterSceneType}
          on:change={(e) => gameStore.setFilmGuideFilterSceneType(e.currentTarget.value)}
        >
          <option value="all">全部题材</option>
          {#each Object.entries(SCENE_TYPE_LABELS) as [key, label]}
            <option value={key}>{label}</option>
          {/each}
        </select>
      </div>
    </div>

    <div class="guide-body">
      <div class="film-sidebar">
        {#each filteredEntries as entry (entry.filmId)}
          {@const film = FILM_STOCKS.find(f => f.id === entry.filmId)}
          {@const isViewed = viewedFilmIds.includes(entry.filmId)}
          {@const isSelected = selectedFilmId === entry.filmId}
          <button
            class="film-sidebar-card"
            class:selected={isSelected}
            class:viewed={isViewed && !isSelected}
            on:click={() => selectFilm(entry.filmId)}
          >
            <div class="film-sidebar-color" style="background: {film?.thumbnailColor || '#888'}" />
            <div class="film-sidebar-info">
              <span class="film-sidebar-name">{entry.filmName}</span>
              <div class="film-sidebar-meta">
                <span class="meta-tag type-{film?.color || 'bw'}">{film?.color === 'bw' ? '黑白' : '彩色'}</span>
                <span class="meta-tag">ISO {film?.iso}</span>
              </div>
              <div class="film-sidebar-chars">
                {#each entry.characteristics.slice(0, 3) as char}
                  <span class="char-tag">{char}</span>
                {/each}
              </div>
            </div>
            {#if !isViewed}
              <span class="new-dot" />
            {/if}
          </button>
        {/each}
        {#if filteredEntries.length === 0}
          <div class="empty-sidebar">
            <span>🔍</span>
            <p>没有匹配的胶片</p>
          </div>
        {/if}
      </div>

      <div class="film-detail-area">
        {#if !selectedEntry}
          <div class="empty-detail">
            <div class="empty-icon">🎞</div>
            <h3>选择一款胶片</h3>
            <p>从左侧选择胶片，查看详细知识图鉴</p>
            <div class="quick-stats">
              <div class="qs-item">
                <span class="qs-num">{FILM_KNOWLEDGE_ENTRIES.length}</span>
                <span class="qs-label">款胶片</span>
              </div>
              <div class="qs-item">
                <span class="qs-num">{viewedFilmIds.length}</span>
                <span class="qs-label">已查阅</span>
              </div>
              <div class="qs-item">
                <span class="qs-num">{FILM_KNOWLEDGE_ENTRIES.reduce((s, e) => s + e.devSuggestions.length, 0)}</span>
                <span class="qs-label">冲洗方案</span>
              </div>
              <div class="qs-item">
                <span class="qs-num">{FILM_KNOWLEDGE_ENTRIES.reduce((s, e) => s + e.practiceEntries.length, 0)}</span>
                <span class="qs-label">练习任务</span>
              </div>
            </div>
          </div>
        {:else}
          <div class="detail-content">
            <div class="detail-header">
              <div class="detail-film-badge" style="background: {selectedFilmStock?.thumbnailColor || '#888'}" />
              <div class="detail-title-area">
                <h3 class="detail-film-name">{selectedEntry.filmName}</h3>
                <p class="detail-summary">{selectedEntry.summary}</p>
              </div>
              <div class="detail-type-badge">
                <span class="type-label">{selectedFilmStock?.color === 'bw' ? '黑白胶片' : '彩色胶片'}</span>
                <span class="type-iso">ISO {selectedFilmStock?.iso}</span>
              </div>
            </div>

            <div class="detail-tabs">
              {#each TAB_CONFIG as tab (tab.key)}
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

            <div class="tab-content">
              {#if activeTab === 'overview'}
                <div class="overview-section">
                  <div class="chars-row">
                    {#each selectedEntry.characteristics as char}
                      <span class="char-badge">{char}</span>
                    {/each}
                  </div>
                  <div class="pros-cons">
                    <div class="pros-col">
                      <h4 class="pros-title">✅ 优势</h4>
                      <ul class="pros-list">
                        {#each selectedEntry.pros as pro}
                          <li>{pro}</li>
                        {/each}
                      </ul>
                    </div>
                    <div class="cons-col">
                      <h4 class="cons-title">⚠️ 注意</h4>
                      <ul class="cons-list">
                        {#each selectedEntry.cons as con}
                          <li>{con}</li>
                        {/each}
                      </ul>
                    </div>
                  </div>
                  <div class="tips-section">
                    <h4 class="tips-title">💡 实用技巧</h4>
                    <ul class="tips-list">
                      {#each selectedEntry.tips as tip}
                        <li>{tip}</li>
                      {/each}
                    </ul>
                  </div>
                </div>
              {:else if activeTab === 'attributes'}
                <div class="attributes-section">
                  {#each Object.entries(selectedEntry.attributeProfile) as [key, attr] (key)}
                    <div class="attr-row">
                      <div class="attr-header">
                        <span class="attr-key">{attr.label}</span>
                        <span class="attr-value">{(attr.value * 100).toFixed(0)}%</span>
                      </div>
                      <div class="attr-bar-track">
                        <div
                          class="attr-bar-fill"
                          style="width: {attr.value * 100}%; background: {getAttrBarColor(key)}"
                        />
                      </div>
                      <p class="attr-desc">{attr.description}</p>
                    </div>
                  {/each}
                </div>
              {:else if activeTab === 'subjects'}
                <div class="subjects-section">
                  {#each selectedEntry.subjectSuitabilities.sort((a, b) => b.matchScore - a.matchScore) as suit (suit.subjectId)}
                    <div class="suit-card">
                      <div class="suit-header">
                        <div class="suit-info">
                          <span class="suit-name">{suit.subjectName}</span>
                          <span class="suit-scene">{SCENE_TYPE_LABELS[suit.sceneType] || suit.sceneType}</span>
                        </div>
                        <div class="suit-score-area">
                          <div class="suit-score-bar">
                            <div
                              class="suit-score-fill"
                              style="width: {suit.matchScore * 100}%; background: {getMatchColor(suit.matchScore)}"
                            />
                          </div>
                          <span class="suit-score-label" style="color: {getMatchColor(suit.matchScore)}">
                            {getMatchLabel(suit.matchScore)} ({(suit.matchScore * 100).toFixed(0)}%)
                          </span>
                        </div>
                      </div>
                      <div class="suit-reasons">
                        {#each suit.reasons as reason}
                          <span class="reason-chip">{reason}</span>
                        {/each}
                      </div>
                      {#if suit.matchScore >= 0.5}
                        <button
                          class="try-subject-btn"
                          on:click={() => handleStartPractice(selectedEntry.filmId, suit.subjectId)}
                        >
                          🎯 使用此胶片尝试
                        </button>
                      {/if}
                    </div>
                  {/each}
                </div>
              {:else if activeTab === 'samples'}
                <div class="samples-section">
                  {#if samplePhotos.length === 0}
                    <div class="no-samples">
                      <span class="no-samples-icon">📷</span>
                      <p>还没有使用 {selectedEntry.filmName} 的样片</p>
                      <p class="no-samples-hint">使用此胶片冲洗照片后，样片将自动收录于此</p>
                      <button
                        class="try-first-btn"
                        on:click={() => {
                          const bestSuit = selectedEntry.subjectSuitabilities.sort((a, b) => b.matchScore - a.matchScore)[0];
                          if (bestSuit) handleStartPractice(selectedEntry.filmId, bestSuit.subjectId);
                        }}
                      >
                        🎬 立即试用此胶片
                      </button>
                    </div>
                  {:else}
                    <div class="samples-grid">
                      {#each samplePhotos as photo (photo.id)}
                        <div class="sample-card">
                          <img src={photo.imageDataUrl} alt="样片" class="sample-img" />
                          <div class="sample-info">
                            <span class="sample-grade" class:grade-s={photo.details.grade === 'S'} class:grade-a={photo.details.grade === 'A'} class:grade-b={photo.details.grade === 'B'} class:grade-c={photo.details.grade === 'C'} class:grade-d={photo.details.grade === 'D'}>{photo.details.grade}</span>
                            <span class="sample-score">{photo.score}分</span>
                            <span class="sample-subject">
                              {PHOTO_SUBJECTS.find(s => s.id === photo.subjectId)?.name || photo.subjectId}
                            </span>
                          </div>
                        </div>
                      {/each}
                    </div>
                  {/if}
                </div>
              {:else if activeTab === 'develop'}
                <div class="develop-section">
                  {#each selectedEntry.devSuggestions as dev, idx (idx)}
                    <div class="dev-card">
                      <div class="dev-card-header">
                        <span class="dev-process">{PROCESS_TYPE_LABELS[dev.processType] || dev.processType}</span>
                        <span class="dev-developer">{dev.developer}</span>
                      </div>
                      <div class="dev-params">
                        <div class="dev-param">
                          <span class="dev-param-label">温度</span>
                          <span class="dev-param-value">{dev.temperature}°C</span>
                        </div>
                        <div class="dev-param">
                          <span class="dev-param-label">时间</span>
                          <span class="dev-param-value">{dev.timeMinutes} 分钟</span>
                        </div>
                        <div class="dev-param">
                          <span class="dev-param-label">稀释</span>
                          <span class="dev-param-value">{dev.dilution}</span>
                        </div>
                        <div class="dev-param">
                          <span class="dev-param-label">搅拌</span>
                          <span class="dev-param-value">{dev.agitation}</span>
                        </div>
                      </div>
                      <p class="dev-notes">{dev.notes}</p>
                      {#if dev.tips.length > 0}
                        <div class="dev-tips">
                          {#each dev.tips as tip}
                            <div class="dev-tip-item">💡 {tip}</div>
                          {/each}
                        </div>
                      {/if}
                    </div>
                  {/each}
                </div>
              {:else if activeTab === 'practice'}
                <div class="practice-section">
                  {#if selectedEntry.practiceEntries.length === 0}
                    <div class="no-practice">
                      <span>🎮</span>
                      <p>暂无练习任务</p>
                    </div>
                  {:else}
                    {#each selectedEntry.practiceEntries as practice (practice.id)}
                      <div class="practice-card">
                        <div class="practice-header">
                          <h4 class="practice-title">{practice.title}</h4>
                          <span class="practice-difficulty">{DIFFICULTY_LABELS[practice.difficulty] || '中等'}</span>
                        </div>
                        <p class="practice-desc">{practice.description}</p>
                        <div class="practice-meta">
                          <span class="practice-style">风格：{practice.targetStyle}</span>
                          <span class="practice-target">目标分数：{practice.targetScore}+</span>
                        </div>
                        {#if practice.tips.length > 0}
                          <div class="practice-tips">
                            {#each practice.tips as tip}
                              <div class="practice-tip">💡 {tip}</div>
                            {/each}
                          </div>
                        {/if}
                        <button
                          class="start-practice-btn"
                          on:click={() => handleStartPractice(selectedEntry.filmId, practice.subjectId)}
                        >
                          🎬 开始练习
                        </button>
                      </div>
                    {/each}
                  {/if}
                </div>
              {/if}
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>
</div>

<style>
  .guide-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(8px);
    z-index: 90;
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

  .guide-panel {
    width: 100%;
    max-width: 1100px;
    height: 85vh;
    background: linear-gradient(180deg, rgba(45, 26, 18, 0.98) 0%, rgba(20, 12, 8, 0.99) 100%);
    border: 1px solid rgba(139, 90, 43, 0.3);
    border-radius: 16px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
  }

  .guide-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 24px;
    border-bottom: 1px solid rgba(139, 90, 43, 0.2);
    background: rgba(0, 0, 0, 0.2);
  }

  .guide-title-area {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .guide-icon {
    font-size: 28px;
    filter: drop-shadow(0 2px 6px rgba(200, 150, 80, 0.3));
  }

  .guide-title {
    font-size: 20px;
    font-weight: 600;
    color: #e8c890;
    margin: 0;
    letter-spacing: 2px;
    background: linear-gradient(90deg, #f0d8a8, #d4a574);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .guide-subtitle {
    font-size: 9px;
    color: #7a6a55;
    letter-spacing: 3px;
  }

  .guide-header-right {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .viewed-count {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 12px;
    background: rgba(139, 90, 43, 0.15);
    border-radius: 8px;
    border: 1px solid rgba(139, 90, 43, 0.2);
  }

  .viewed-label {
    font-size: 11px;
    color: #8a7a5a;
  }

  .viewed-value {
    font-size: 13px;
    font-weight: 600;
    color: #d4a574;
    font-family: monospace;
  }

  .close-btn {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: rgba(139, 90, 43, 0.15);
    border: 1px solid rgba(139, 90, 43, 0.25);
    color: #c8a878;
    font-size: 16px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
  }

  .close-btn:hover {
    background: rgba(200, 60, 60, 0.3);
    border-color: rgba(200, 60, 60, 0.4);
    color: #ff8888;
  }

  .guide-toolbar {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 24px;
    border-bottom: 1px solid rgba(139, 90, 43, 0.15);
    background: rgba(0, 0, 0, 0.1);
    flex-wrap: wrap;
  }

  .search-box {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    background: rgba(0, 0, 0, 0.25);
    border: 1px solid rgba(139, 90, 43, 0.2);
    border-radius: 8px;
    flex: 1;
    min-width: 180px;
  }

  .search-icon {
    font-size: 14px;
    opacity: 0.6;
  }

  .search-box input {
    flex: 1;
    background: transparent;
    border: none;
    color: #e8c890;
    font-size: 13px;
    outline: none;
  }

  .search-box input::placeholder {
    color: #6a5a45;
  }

  .filter-group {
    display: flex;
    gap: 4px;
  }

  .filter-btn {
    padding: 5px 12px;
    border-radius: 6px;
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(139, 90, 43, 0.15);
    color: #8a7a5a;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .filter-btn.active {
    background: rgba(139, 90, 43, 0.3);
    border-color: rgba(200, 150, 80, 0.5);
    color: #e8c890;
  }

  .filter-btn:hover:not(.active) {
    background: rgba(139, 90, 43, 0.15);
    color: #c8a878;
  }

  .scene-select {
    padding: 5px 10px;
    border-radius: 6px;
    background: rgba(0, 0, 0, 0.25);
    border: 1px solid rgba(139, 90, 43, 0.2);
    color: #c8a878;
    font-size: 12px;
    outline: none;
    cursor: pointer;
  }

  .scene-select option {
    background: #2d1a12;
    color: #c8a878;
  }

  .guide-body {
    flex: 1;
    display: grid;
    grid-template-columns: 280px 1fr;
    overflow: hidden;
  }

  .film-sidebar {
    border-right: 1px solid rgba(139, 90, 43, 0.15);
    overflow-y: auto;
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .film-sidebar::-webkit-scrollbar {
    width: 5px;
  }

  .film-sidebar::-webkit-scrollbar-track {
    background: transparent;
  }

  .film-sidebar::-webkit-scrollbar-thumb {
    background: rgba(139, 90, 43, 0.3);
    border-radius: 3px;
  }

  .film-sidebar-card {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 10px;
    background: rgba(0, 0, 0, 0.15);
    border: 1px solid rgba(139, 90, 43, 0.1);
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.2s ease;
    text-align: left;
    width: 100%;
    position: relative;
  }

  .film-sidebar-card:hover {
    background: rgba(139, 90, 43, 0.12);
    border-color: rgba(139, 90, 43, 0.3);
  }

  .film-sidebar-card.selected {
    background: rgba(139, 90, 43, 0.2);
    border-color: rgba(200, 150, 80, 0.5);
    box-shadow: 0 0 12px rgba(200, 150, 80, 0.1);
  }

  .film-sidebar-card.viewed {
    border-color: rgba(100, 180, 100, 0.15);
  }

  .film-sidebar-color {
    width: 36px;
    height: 44px;
    border-radius: 3px;
    flex-shrink: 0;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
  }

  .film-sidebar-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
    min-width: 0;
  }

  .film-sidebar-name {
    font-size: 13px;
    font-weight: 500;
    color: #e8c890;
    line-height: 1.3;
  }

  .film-sidebar-card.selected .film-sidebar-name {
    color: #f0d8a8;
  }

  .film-sidebar-meta {
    display: flex;
    gap: 4px;
  }

  .meta-tag {
    font-size: 9px;
    padding: 1px 5px;
    border-radius: 3px;
    background: rgba(139, 90, 43, 0.2);
    color: #a89878;
  }

  .meta-tag.type-bw {
    background: rgba(100, 100, 100, 0.2);
    color: #c0c0c0;
  }

  .meta-tag.type-color {
    background: rgba(160, 100, 60, 0.2);
    color: #e0a070;
  }

  .film-sidebar-chars {
    display: flex;
    gap: 3px;
    flex-wrap: wrap;
  }

  .char-tag {
    font-size: 9px;
    padding: 1px 5px;
    border-radius: 4px;
    background: rgba(139, 90, 43, 0.12);
    color: #8a7a5a;
  }

  .new-dot {
    position: absolute;
    top: 8px;
    right: 8px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #f59e0b;
    box-shadow: 0 0 6px rgba(245, 158, 11, 0.4);
  }

  .empty-sidebar {
    text-align: center;
    padding: 40px 20px;
    color: #6a5a45;
  }

  .empty-sidebar span {
    font-size: 30px;
    display: block;
    margin-bottom: 8px;
    opacity: 0.5;
  }

  .empty-sidebar p {
    font-size: 12px;
    margin: 0;
  }

  .film-detail-area {
    overflow-y: auto;
    padding: 0;
  }

  .film-detail-area::-webkit-scrollbar {
    width: 6px;
  }

  .film-detail-area::-webkit-scrollbar-track {
    background: transparent;
  }

  .film-detail-area::-webkit-scrollbar-thumb {
    background: rgba(139, 90, 43, 0.3);
    border-radius: 3px;
  }

  .empty-detail {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #6a5a45;
    text-align: center;
    padding: 40px;
  }

  .empty-icon {
    font-size: 60px;
    margin-bottom: 16px;
    opacity: 0.4;
    filter: drop-shadow(0 4px 12px rgba(200, 150, 80, 0.2));
  }

  .empty-detail h3 {
    font-size: 18px;
    color: #a89878;
    margin: 0 0 8px;
    font-weight: 500;
  }

  .empty-detail p {
    font-size: 13px;
    margin: 0;
  }

  .quick-stats {
    display: flex;
    gap: 24px;
    margin-top: 30px;
  }

  .qs-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }

  .qs-num {
    font-size: 24px;
    font-weight: 700;
    color: #d4a574;
    font-family: monospace;
  }

  .qs-label {
    font-size: 11px;
    color: #7a6a55;
  }

  .detail-content {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .detail-header {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 16px 20px;
    border-bottom: 1px solid rgba(139, 90, 43, 0.15);
  }

  .detail-film-badge {
    width: 40px;
    height: 50px;
    border-radius: 4px;
    flex-shrink: 0;
    box-shadow: 0 3px 10px rgba(0, 0, 0, 0.4);
  }

  .detail-title-area {
    flex: 1;
    min-width: 0;
  }

  .detail-film-name {
    font-size: 18px;
    font-weight: 600;
    color: #f0d8a8;
    margin: 0 0 4px;
    letter-spacing: 1px;
  }

  .detail-summary {
    font-size: 12px;
    color: #a89878;
    margin: 0;
    line-height: 1.5;
  }

  .detail-type-badge {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    padding: 6px 14px;
    background: rgba(0, 0, 0, 0.25);
    border-radius: 8px;
    border: 1px solid rgba(139, 90, 43, 0.15);
  }

  .type-label {
    font-size: 12px;
    font-weight: 500;
    color: #c8a878;
  }

  .type-iso {
    font-size: 11px;
    color: #8a7a5a;
    font-family: monospace;
  }

  .detail-tabs {
    display: flex;
    gap: 2px;
    padding: 0 16px;
    border-bottom: 1px solid rgba(139, 90, 43, 0.15);
    background: rgba(0, 0, 0, 0.1);
  }

  .tab-btn {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 10px 14px;
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    color: #7a6a55;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .tab-btn:hover {
    color: #c8a878;
  }

  .tab-btn.active {
    color: #e8c890;
    border-bottom-color: #d4a574;
  }

  .tab-icon {
    font-size: 14px;
  }

  .tab-label {
    letter-spacing: 0.5px;
  }

  .tab-content {
    flex: 1;
    overflow-y: auto;
    padding: 16px 20px;
  }

  .tab-content::-webkit-scrollbar {
    width: 5px;
  }

  .tab-content::-webkit-scrollbar-track {
    background: transparent;
  }

  .tab-content::-webkit-scrollbar-thumb {
    background: rgba(139, 90, 43, 0.3);
    border-radius: 3px;
  }

  .overview-section {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .chars-row {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .char-badge {
    padding: 4px 14px;
    border-radius: 12px;
    background: linear-gradient(135deg, rgba(139, 90, 43, 0.25), rgba(180, 140, 90, 0.15));
    border: 1px solid rgba(200, 150, 80, 0.3);
    color: #e8c890;
    font-size: 13px;
    font-weight: 500;
    letter-spacing: 0.5px;
  }

  .pros-cons {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }

  .pros-col, .cons-col {
    padding: 14px;
    border-radius: 10px;
    background: rgba(0, 0, 0, 0.15);
    border: 1px solid rgba(139, 90, 43, 0.1);
  }

  .pros-title, .cons-title {
    font-size: 13px;
    font-weight: 500;
    margin: 0 0 10px;
  }

  .pros-title { color: #8bc88b; }
  .cons-title { color: #e0a070; }

  .pros-list, .cons-list {
    margin: 0;
    padding-left: 16px;
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .pros-list li { color: #a8d8a8; font-size: 12px; line-height: 1.5; }
  .cons-list li { color: #d4a888; font-size: 12px; line-height: 1.5; }

  .tips-section {
    padding: 14px;
    border-radius: 10px;
    background: rgba(0, 0, 0, 0.15);
    border: 1px solid rgba(139, 90, 43, 0.1);
  }

  .tips-title {
    font-size: 13px;
    font-weight: 500;
    color: #d4a574;
    margin: 0 0 10px;
  }

  .tips-list {
    margin: 0;
    padding-left: 16px;
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .tips-list li {
    color: #c8b898;
    font-size: 12px;
    line-height: 1.6;
  }

  .attributes-section {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .attr-row {
    padding: 12px 14px;
    border-radius: 10px;
    background: rgba(0, 0, 0, 0.12);
    border: 1px solid rgba(139, 90, 43, 0.08);
  }

  .attr-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
  }

  .attr-key {
    font-size: 13px;
    font-weight: 500;
    color: #d4a574;
  }

  .attr-value {
    font-size: 12px;
    font-family: monospace;
    color: #a89878;
  }

  .attr-bar-track {
    height: 8px;
    background: rgba(60, 50, 40, 0.4);
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 6px;
  }

  .attr-bar-fill {
    height: 100%;
    border-radius: 4px;
    transition: width 0.4s ease;
  }

  .attr-desc {
    font-size: 11px;
    color: #8a7a5a;
    margin: 0;
    line-height: 1.5;
  }

  .subjects-section {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .suit-card {
    padding: 14px;
    border-radius: 10px;
    background: rgba(0, 0, 0, 0.12);
    border: 1px solid rgba(139, 90, 43, 0.1);
  }

  .suit-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
    gap: 12px;
  }

  .suit-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .suit-name {
    font-size: 14px;
    font-weight: 500;
    color: #e8c890;
  }

  .suit-scene {
    font-size: 11px;
    color: #7a6a55;
  }

  .suit-score-area {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  .suit-score-bar {
    width: 80px;
    height: 6px;
    background: rgba(60, 50, 40, 0.4);
    border-radius: 3px;
    overflow: hidden;
  }

  .suit-score-fill {
    height: 100%;
    border-radius: 3px;
    transition: width 0.4s ease;
  }

  .suit-score-label {
    font-size: 11px;
    font-weight: 600;
    white-space: nowrap;
  }

  .suit-reasons {
    display: flex;
    gap: 5px;
    flex-wrap: wrap;
    margin-bottom: 8px;
  }

  .reason-chip {
    font-size: 10px;
    padding: 2px 8px;
    border-radius: 6px;
    background: rgba(139, 90, 43, 0.15);
    color: #a89878;
  }

  .try-subject-btn {
    padding: 5px 14px;
    border-radius: 6px;
    background: linear-gradient(135deg, rgba(139, 90, 43, 0.3), rgba(180, 140, 90, 0.2));
    border: 1px solid rgba(200, 150, 80, 0.3);
    color: #e8c890;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .try-subject-btn:hover {
    background: linear-gradient(135deg, rgba(139, 90, 43, 0.5), rgba(180, 140, 90, 0.3));
    transform: translateY(-1px);
  }

  .samples-section {
    min-height: 200px;
  }

  .no-samples {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 40px;
    color: #6a5a45;
  }

  .no-samples-icon {
    font-size: 48px;
    margin-bottom: 12px;
    opacity: 0.4;
  }

  .no-samples p {
    margin: 4px 0;
    font-size: 13px;
  }

  .no-samples-hint {
    color: #5a4a35 !important;
    font-size: 11px !important;
  }

  .try-first-btn {
    margin-top: 16px;
    padding: 8px 20px;
    border-radius: 8px;
    background: linear-gradient(135deg, #d4a574, #8b5a2b);
    border: none;
    color: #fff;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .try-first-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(212, 165, 116, 0.3);
  }

  .samples-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 10px;
  }

  .sample-card {
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(139, 90, 43, 0.15);
    border-radius: 8px;
    overflow: hidden;
  }

  .sample-img {
    width: 100%;
    aspect-ratio: 3 / 4;
    object-fit: cover;
    display: block;
  }

  .sample-info {
    padding: 8px;
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }

  .sample-grade {
    font-size: 12px;
    font-weight: 700;
    font-family: monospace;
  }

  .sample-grade.grade-s { color: #ffd700; }
  .sample-grade.grade-a { color: #10b981; }
  .sample-grade.grade-b { color: #3b82f6; }
  .sample-grade.grade-c { color: #f59e0b; }
  .sample-grade.grade-d { color: #ef4444; }

  .sample-score {
    font-size: 11px;
    color: #a89878;
    font-family: monospace;
  }

  .sample-subject {
    font-size: 10px;
    color: #7a6a55;
  }

  .develop-section {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .dev-card {
    padding: 14px;
    border-radius: 10px;
    background: rgba(0, 0, 0, 0.12);
    border: 1px solid rgba(139, 90, 43, 0.1);
  }

  .dev-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid rgba(139, 90, 43, 0.1);
  }

  .dev-process {
    font-size: 12px;
    font-weight: 600;
    color: #d4a574;
    padding: 2px 10px;
    background: rgba(139, 90, 43, 0.2);
    border-radius: 6px;
  }

  .dev-developer {
    font-size: 14px;
    font-weight: 500;
    color: #e8c890;
  }

  .dev-params {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-bottom: 10px;
  }

  .dev-param {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 8px 10px;
    background: rgba(0, 0, 0, 0.15);
    border-radius: 6px;
  }

  .dev-param-label {
    font-size: 10px;
    color: #7a6a55;
    letter-spacing: 0.5px;
  }

  .dev-param-value {
    font-size: 14px;
    font-weight: 600;
    color: #c8a878;
    font-family: monospace;
  }

  .dev-notes {
    font-size: 12px;
    color: #a89878;
    margin: 0 0 8px;
    line-height: 1.5;
    font-style: italic;
  }

  .dev-tips {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .dev-tip-item {
    font-size: 11px;
    color: #8a7a5a;
    line-height: 1.5;
    padding-left: 4px;
  }

  .practice-section {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .practice-card {
    padding: 14px;
    border-radius: 10px;
    background: rgba(0, 0, 0, 0.12);
    border: 1px solid rgba(139, 90, 43, 0.1);
  }

  .practice-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .practice-title {
    font-size: 15px;
    font-weight: 600;
    color: #e8c890;
    margin: 0;
  }

  .practice-difficulty {
    font-size: 11px;
    padding: 2px 10px;
    border-radius: 6px;
    background: rgba(245, 158, 11, 0.15);
    color: #f59e0b;
  }

  .practice-desc {
    font-size: 12px;
    color: #a89878;
    margin: 0 0 8px;
    line-height: 1.5;
  }

  .practice-meta {
    display: flex;
    gap: 14px;
    margin-bottom: 8px;
  }

  .practice-style, .practice-target {
    font-size: 11px;
    color: #7a6a55;
  }

  .practice-tips {
    display: flex;
    flex-direction: column;
    gap: 3px;
    margin-bottom: 10px;
  }

  .practice-tip {
    font-size: 11px;
    color: #8a7a5a;
    line-height: 1.5;
  }

  .start-practice-btn {
    padding: 7px 18px;
    border-radius: 8px;
    background: linear-gradient(135deg, #d4a574, #8b5a2b);
    border: none;
    color: #fff;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    align-self: flex-start;
  }

  .start-practice-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(212, 165, 116, 0.3);
  }

  .no-practice {
    text-align: center;
    padding: 30px;
    color: #6a5a45;
  }

  .no-practice span {
    font-size: 30px;
    display: block;
    margin-bottom: 8px;
  }

  .no-practice p {
    font-size: 12px;
    margin: 0;
  }

  @media (max-width: 800px) {
    .guide-body {
      grid-template-columns: 1fr;
    }
    .film-sidebar {
      max-height: 180px;
      border-right: none;
      border-bottom: 1px solid rgba(139, 90, 43, 0.15);
      flex-direction: row;
      overflow-x: auto;
      overflow-y: hidden;
    }
    .film-sidebar-card {
      min-width: 200px;
      flex-shrink: 0;
    }
    .pros-cons {
      grid-template-columns: 1fr;
    }
    .dev-params {
      grid-template-columns: 1fr;
    }
  }
</style>
