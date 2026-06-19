<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { ProcessedPhoto, AlbumFilter, SortOption } from '../types/game';
  import {
    PHOTO_SUBJECTS,
    FILM_STOCKS,
    GRADE_COLORS,
    GRADE_NAMES,
    SCENE_TYPE_LABELS,
    SORT_OPTIONS,
    ALL_TAGS
  } from '../data/gameData';
  import ScorePanel from './ScorePanel.svelte';

  export let photos: ProcessedPhoto[] = [];
  export let statistics: {
    total: number;
    avgScore: number;
    bestScore: number;
    gradeCounts: Record<string, number>;
  };
  void statistics;

  const dispatch = createEventDispatcher<{
    close: void;
    delete: string;
    viewDetail: ProcessedPhoto;
  }>();

  let selectedPhoto: ProcessedPhoto | null = null;
  let showDeleteConfirm = false;
  let photoToDelete: string | null = null;
  let showFilters = true;

  const gradesOrder = ['S', 'A', 'B', 'C', 'D'];
  const gradeWeights: Record<string, number> = { S: 5, A: 4, B: 3, C: 2, D: 1 };

  let filter: AlbumFilter = {
    subjectIds: [],
    filmIds: [],
    sceneTypes: [],
    grades: [],
    minScore: 0,
    maxScore: 100,
    tags: [],
    sortBy: 'date_desc',
    noteFilter: 'all',
    noteKeyword: ''
  };

  function formatDate(ts: number): string {
    return new Date(ts).toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function getSubjectName(id: string): string {
    return PHOTO_SUBJECTS.find(s => s.id === id)?.name || '未知';
  }

  function getFilmName(id: string): string {
    return FILM_STOCKS.find(f => f.id === id)?.name || '未知';
  }

  function getSubject(id: string) {
    return PHOTO_SUBJECTS.find(s => s.id === id);
  }

  function confirmDelete(id: string) {
    photoToDelete = id;
    showDeleteConfirm = true;
  }

  function doDelete() {
    if (photoToDelete) {
      dispatch('delete', photoToDelete);
    }
    showDeleteConfirm = false;
    photoToDelete = null;
    selectedPhoto = null;
  }

  function toggleArrayValue(arr: string[], value: string): string[] {
    return arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value];
  }

  function toggleSubject(id: string) {
    filter = { ...filter, subjectIds: toggleArrayValue(filter.subjectIds, id) };
  }

  function toggleFilm(id: string) {
    filter = { ...filter, filmIds: toggleArrayValue(filter.filmIds, id) };
  }

  function toggleSceneType(type: string) {
    filter = { ...filter, sceneTypes: toggleArrayValue(filter.sceneTypes, type) };
  }

  function toggleGrade(grade: string) {
    filter = { ...filter, grades: toggleArrayValue(filter.grades, grade) };
  }

  function toggleTag(tag: string) {
    filter = { ...filter, tags: toggleArrayValue(filter.tags, tag) };
  }

  function setNoteFilter(value: string) {
    filter = { ...filter, noteFilter: value as any };
  }

  function setSortBy(sort: string) {
    filter = { ...filter, sortBy: sort as SortOption };
  }

  function resetFilters() {
    filter = {
      subjectIds: [],
      filmIds: [],
      sceneTypes: [],
      grades: [],
      minScore: 0,
      maxScore: 100,
      tags: [],
      sortBy: 'date_desc',
      noteFilter: 'all',
      noteKeyword: ''
    };
  }

  function hasActiveFilters(): boolean {
    return (
      filter.subjectIds.length > 0 ||
      filter.filmIds.length > 0 ||
      filter.sceneTypes.length > 0 ||
      filter.grades.length > 0 ||
      filter.tags.length > 0 ||
      filter.minScore > 0 ||
      filter.maxScore < 100 ||
      filter.noteFilter !== 'all' ||
      filter.noteKeyword.trim() !== ''
    );
  }

  function getPhotoTags(photo: ProcessedPhoto): string[] {
    if (photo.tags && photo.tags.length > 0) return photo.tags;
    const subject = getSubject(photo.subjectId);
    return subject?.tags || [];
  }

  $: filteredPhotos = (() => {
    let result = [...photos];

    if (filter.subjectIds.length > 0) {
      result = result.filter(p => filter.subjectIds.includes(p.subjectId));
    }

    if (filter.filmIds.length > 0) {
      result = result.filter(p => filter.filmIds.includes(p.filmId));
    }

    if (filter.sceneTypes.length > 0) {
      result = result.filter(p => {
        const subject = getSubject(p.subjectId);
        return subject && filter.sceneTypes.includes(subject.sceneType);
      });
    }

    if (filter.grades.length > 0) {
      result = result.filter(p => filter.grades.includes(p.details.grade));
    }

    if (filter.minScore > 0) {
      result = result.filter(p => p.score >= filter.minScore);
    }

    if (filter.maxScore < 100) {
      result = result.filter(p => p.score <= filter.maxScore);
    }

    if (filter.tags.length > 0) {
      result = result.filter(p => {
        const tags = getPhotoTags(p);
        return filter.tags.some(t => tags.includes(t));
      });
    }

    if (filter.noteFilter === 'has_note') {
      result = result.filter(p => p.notes && p.notes.trim().length > 0);
    } else if (filter.noteFilter === 'no_note') {
      result = result.filter(p => !p.notes || p.notes.trim().length === 0);
    }

    if (filter.noteKeyword.trim() !== '') {
      const keyword = filter.noteKeyword.trim().toLowerCase();
      result = result.filter(p => {
        const notes = p.notes ? p.notes.toLowerCase() : '';
        const subjectName = getSubjectName(p.subjectId).toLowerCase();
        const filmName = getFilmName(p.filmId).toLowerCase();
        const tags = getPhotoTags(p).join(' ').toLowerCase();
        return notes.includes(keyword) ||
               subjectName.includes(keyword) ||
               filmName.includes(keyword) ||
               tags.includes(keyword);
      });
    }

    switch (filter.sortBy) {
      case 'date_desc':
        result.sort((a, b) => b.timestamp - a.timestamp);
        break;
      case 'date_asc':
        result.sort((a, b) => a.timestamp - b.timestamp);
        break;
      case 'score_desc':
        result.sort((a, b) => b.score - a.score);
        break;
      case 'score_asc':
        result.sort((a, b) => a.score - b.score);
        break;
      case 'grade_desc':
        result.sort((a, b) => gradeWeights[b.details.grade] - gradeWeights[a.details.grade]);
        break;
    }

    return result;
  })();

  $: filteredStats = (() => {
    if (filteredPhotos.length === 0) {
      return { total: 0, avgScore: 0, bestScore: 0, gradeCounts: { S: 0, A: 0, B: 0, C: 0, D: 0 } };
    }
    const total = filteredPhotos.length;
    const avgScore = Math.round(filteredPhotos.reduce((sum, p) => sum + p.score, 0) / total);
    const bestScore = Math.max(...filteredPhotos.map(p => p.score));
    const gradeCounts: Record<string, number> = { S: 0, A: 0, B: 0, C: 0, D: 0 };
    filteredPhotos.forEach(p => { gradeCounts[p.details.grade]++; });
    return { total, avgScore, bestScore, gradeCounts };
  })();

  $: activeFilterCount =
    filter.subjectIds.length +
    filter.filmIds.length +
    filter.sceneTypes.length +
    filter.grades.length +
    filter.tags.length +
    (filter.minScore > 0 ? 1 : 0) +
    (filter.maxScore < 100 ? 1 : 0) +
    (filter.noteFilter !== 'all' ? 1 : 0) +
    (filter.noteKeyword.trim() !== '' ? 1 : 0);
</script>

<div class="album-overlay">
  <div class="album-container">
    <div class="album-header">
      <div class="header-left">
        <h2 class="album-title">📚 我的照片册</h2>
        {#if activeFilterCount > 0}
          <span class="filter-badge">{activeFilterCount} 个筛选条件</span>
        {/if}
      </div>
      <div class="header-right">
        <button class="filter-toggle" on:click={() => showFilters = !showFilters}>
          <span>{showFilters ? '收起筛选' : '展开筛选'}</span>
          <span class="toggle-icon">{showFilters ? '▲' : '▼'}</span>
        </button>
        <button class="close-btn" on:click={() => dispatch('close')}>
          <span>✕</span>
        </button>
      </div>
    </div>

    {#if showFilters}
      <div class="filters-section">
        <div class="filter-row">
          <div class="filter-block">
            <div class="filter-label">题材类型</div>
            <div class="chip-group">
              {#each Object.entries(SCENE_TYPE_LABELS) as [type, label] (type)}
                <button
                  class="chip"
                  class:active={filter.sceneTypes.includes(type)}
                  on:click={() => toggleSceneType(type)}
                >
                  {label}
                </button>
              {/each}
            </div>
          </div>
        </div>

        <div class="filter-row">
          <div class="filter-block">
            <div class="filter-label">具体题材</div>
            <div class="chip-group">
              {#each PHOTO_SUBJECTS as subject (subject.id)}
                <button
                  class="chip"
                  class:active={filter.subjectIds.includes(subject.id)}
                  on:click={() => toggleSubject(subject.id)}
                  title={subject.description}
                >
                  {subject.name}
                </button>
              {/each}
            </div>
          </div>
        </div>

        <div class="filter-row">
          <div class="filter-block">
            <div class="filter-label">胶片类型</div>
            <div class="chip-group">
              {#each FILM_STOCKS as film (film.id)}
                <button
                  class="chip"
                  class:active={filter.filmIds.includes(film.id)}
                  on:click={() => toggleFilm(film.id)}
                  title={film.description}
                >
                  <span class="film-dot" style="background: {film.thumbnailColor};"></span>
                  {film.name}
                </button>
              {/each}
            </div>
          </div>
        </div>

        <div class="filter-row multi-row">
          <div class="filter-block">
            <div class="filter-label">等级</div>
            <div class="chip-group">
              {#each gradesOrder as g (g)}
                <button
                  class="chip grade-chip"
                  class:active={filter.grades.includes(g)}
                  style="--grade-color: {GRADE_COLORS[g]};"
                  on:click={() => toggleGrade(g)}
                >
                  {g}
                </button>
              {/each}
            </div>
          </div>

          <div class="filter-block">
            <div class="filter-label">分数范围</div>
            <div class="score-range">
              <input
                type="number"
                class="range-input"
                bind:value={filter.minScore}
                min="0"
                max="100"
                placeholder="最低"
              />
              <span class="range-sep">~</span>
              <input
                type="number"
                class="range-input"
                bind:value={filter.maxScore}
                min="0"
                max="100"
                placeholder="最高"
              />
            </div>
          </div>

          <div class="filter-block">
            <div class="filter-label">排序</div>
            <div class="chip-group">
              {#each SORT_OPTIONS as opt (opt.value)}
                <button
                  class="chip"
                  class:active={filter.sortBy === opt.value}
                  on:click={() => setSortBy(opt.value)}
                >
                  {opt.label}
                </button>
              {/each}
            </div>
          </div>
        </div>

        <div class="filter-row">
          <div class="filter-block">
            <div class="filter-label">标签</div>
            <div class="chip-group">
              {#each ALL_TAGS as tag (tag)}
                <button
                  class="chip tag-chip"
                  class:active={filter.tags.includes(tag)}
                  on:click={() => toggleTag(tag)}
                >
                  # {tag}
                </button>
              {/each}
            </div>
          </div>
        </div>

        <div class="filter-row multi-row">
          <div class="filter-block">
            <div class="filter-label">冲洗笔记</div>
            <div class="chip-group">
              <button
                class="chip"
                class:active={filter.noteFilter === 'all'}
                on:click={() => setNoteFilter('all')}
              >
                全部
              </button>
              <button
                class="chip"
                class:active={filter.noteFilter === 'has_note'}
                on:click={() => setNoteFilter('has_note')}
              >
                📝 有笔记
              </button>
              <button
                class="chip"
                class:active={filter.noteFilter === 'no_note'}
                on:click={() => setNoteFilter('no_note')}
              >
                无笔记
              </button>
            </div>
          </div>

          <div class="filter-block" style="grid-column: span 2;">
            <div class="filter-label">关键词搜索</div>
            <div class="search-box">
              <span class="search-icon">🔍</span>
              <input
                type="text"
                class="search-input"
                bind:value={filter.noteKeyword}
                placeholder="搜索笔记、题材、胶片或标签..."
              />
              {#if filter.noteKeyword}
                <button
                  class="search-clear"
                  on:click={() => filter.noteKeyword = ''}
                  title="清除搜索"
                >
                  ✕
                </button>
              {/if}
            </div>
          </div>
        </div>

        {#if hasActiveFilters()}
          <div class="filter-actions">
            <button class="reset-filters-btn" on:click={resetFilters}>
              <span>✕</span> 清除所有筛选
            </button>
          </div>
        {/if}
      </div>
    {/if}

    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-value">{filteredStats.total}</div>
        <div class="stat-label">{hasActiveFilters() ? '筛选结果' : '总作品'}</div>
      </div>
      <div class="stat-card highlight">
        <div class="stat-value">{filteredStats.avgScore}</div>
        <div class="stat-label">平均分</div>
      </div>
      <div class="stat-card gold">
        <div class="stat-value">{filteredStats.bestScore}</div>
        <div class="stat-label">最高分</div>
      </div>
      <div class="stat-card grades-card">
        <div class="grades-mini">
          {#each gradesOrder as g (g)}
            <div class="grade-mini-item" style="--c: {GRADE_COLORS[g]};">
              <span class="gm-letter">{g}</span>
              <span class="gm-count">{filteredStats.gradeCounts[g] || 0}</span>
            </div>
          {/each}
        </div>
        <div class="stat-label">等级分布</div>
      </div>
    </div>

    {#if photos.length === 0}
      <div class="empty-album">
        <div class="empty-icon">📷</div>
        <h3 class="empty-title">相册空空如也</h3>
        <p class="empty-desc">完成你的第一次暗房冲洗，作品就会出现在这里</p>
        <button class="go-create-btn" on:click={() => dispatch('close')}>
          开始创作
        </button>
      </div>
    {:else if filteredPhotos.length === 0}
      <div class="empty-album">
        <div class="empty-icon">🔍</div>
        <h3 class="empty-title">没有匹配的作品</h3>
        <p class="empty-desc">试试调整筛选条件，或者清除筛选查看全部作品</p>
        <button class="go-create-btn" on:click={resetFilters}>
          清除筛选
        </button>
      </div>
    {:else}
      <div class="photos-grid">
        {#each filteredPhotos as photo (photo.id)}
          <div class="photo-card" on:click={() => selectedPhoto = photo}>
            <div class="photo-image-wrap">
              <img src={photo.imageDataUrl} alt={getSubjectName(photo.subjectId)} class="photo-image" />
              <div
                class="photo-grade-badge"
                style="background: {GRADE_COLORS[photo.details.grade]}; color: #1a0f0a;"
              >
                {photo.details.grade}
              </div>
              <div class="photo-score-tag">
                {photo.score}
              </div>
              {#if photo.notes && photo.notes.trim().length > 0}
                <div class="photo-note-badge" title="有冲洗笔记">
                  📝
                </div>
              {/if}
            </div>
            <div class="photo-info">
              <div class="photo-name">{getSubjectName(photo.subjectId)}</div>
              <div class="photo-meta">
                <span class="meta-film">{getFilmName(photo.filmId)}</span>
                <span class="meta-date">{formatDate(photo.timestamp)}</span>
              </div>
              {#if getPhotoTags(photo).length > 0}
                <div class="photo-tags">
                  {#each getPhotoTags(photo).slice(0, 3) as tag (tag)}
                    <span class="photo-tag">#{tag}</span>
                  {/each}
                  {#if getPhotoTags(photo).length > 3}
                    <span class="photo-tag more">+{getPhotoTags(photo).length - 3}</span>
                  {/if}
                </div>
              {/if}
            </div>
            <div class="photo-actions">
              <button
                class="mini-btn delete"
                on:click|stopPropagation={() => confirmDelete(photo.id)}
                title="删除"
              >
                🗑
              </button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  {#if selectedPhoto}
    <div class="photo-detail-modal" on:click={() => selectedPhoto = null}>
      <div class="modal-inner" on:click|stopPropagation>
        <div class="detail-image-wrap">
          <img src={selectedPhoto.imageDataUrl} alt="" class="detail-image" />
          {#if getPhotoTags(selectedPhoto).length > 0}
            <div class="detail-tags">
              {#each getPhotoTags(selectedPhoto) as tag (tag)}
                <button
                  class="detail-tag"
                  on:click={() => {
                    if (!filter.tags.includes(tag)) {
                      filter = { ...filter, tags: [...filter.tags, tag] };
                    }
                    selectedPhoto = null;
                    showFilters = true;
                  }}
                  title="点击筛选此标签"
                >
                  #{tag}
                </button>
              {/each}
            </div>
          {/if}
          {#if selectedPhoto.notes && selectedPhoto.notes.trim().length > 0}
            <div class="detail-notes-preview">
              <div class="notes-preview-header">
                <span class="notes-icon">📝</span>
                <span class="notes-title">冲洗笔记</span>
              </div>
              <div class="notes-preview-content">
                {#each selectedPhoto.notes.split('\n').slice(0, 3) as line, i (i)}
                  {#if line.trim()}
                    <p class="notes-preview-line">{line}</p>
                  {/if}
                {/each}
                {#if selectedPhoto.notes.split('\n').length > 3}
                  <p class="notes-more">...还有更多内容，点击扣分明细查看完整笔记</p>
                {/if}
              </div>
            </div>
          {/if}
        </div>
        <div class="detail-panel-wrap">
          <ScorePanel
            photo={selectedPhoto}
            mode="view"
            on:close={() => selectedPhoto = null}
            on:viewDetail={() => { if (selectedPhoto) dispatch('viewDetail', selectedPhoto); }}
          />
        </div>
      </div>
    </div>
  {/if}

  {#if showDeleteConfirm}
    <div class="confirm-modal" on:click={() => showDeleteConfirm = false}>
      <div class="confirm-box" on:click|stopPropagation>
        <h3 class="confirm-title">确认删除？</h3>
        <p class="confirm-desc">这张作品将被永久移除，无法恢复</p>
        <div class="confirm-actions">
          <button class="btn cancel" on:click={() => showDeleteConfirm = false}>取消</button>
          <button class="btn danger" on:click={doDelete}>确认删除</button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .album-overlay {
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

  .album-container {
    background: linear-gradient(180deg, rgba(45, 26, 18, 0.95) 0%, rgba(26, 15, 10, 0.98) 100%);
    border: 1px solid rgba(139, 90, 43, 0.3);
    border-radius: 16px;
    padding: 24px;
    width: 100%;
    max-width: 1200px;
    max-height: 92vh;
    overflow-y: auto;
    animation: slideUp 0.4s ease;
  }

  @keyframes slideUp {
    from { transform: translateY(30px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }

  .album-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .album-title {
    font-size: 24px;
    color: #f0d8a8;
    margin: 0;
    letter-spacing: 3px;
  }

  .filter-badge {
    padding: 4px 12px;
    background: linear-gradient(135deg, rgba(139, 90, 43, 0.4), rgba(100, 60, 30, 0.3));
    border: 1px solid rgba(200, 150, 80, 0.3);
    border-radius: 12px;
    font-size: 11px;
    color: #d4a574;
    letter-spacing: 0.5px;
  }

  .filter-toggle {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    background: rgba(139, 90, 43, 0.15);
    border: 1px solid rgba(139, 90, 43, 0.25);
    border-radius: 8px;
    color: #b8a878;
    font-size: 12px;
    transition: all 0.2s;
  }

  .filter-toggle:hover {
    background: rgba(139, 90, 43, 0.25);
    color: #e0c890;
  }

  .toggle-icon {
    font-size: 10px;
    opacity: 0.7;
  }

  .close-btn {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: rgba(139, 90, 43, 0.2);
    color: #c8b898;
    font-size: 16px;
    transition: all 0.2s;
  }

  .close-btn:hover {
    background: rgba(160, 80, 80, 0.3);
    color: #e08080;
    transform: rotate(90deg);
  }

  .filters-section {
    margin-bottom: 20px;
    padding: 16px 20px;
    background: rgba(0, 0, 0, 0.25);
    border: 1px solid rgba(139, 90, 43, 0.15);
    border-radius: 12px;
    animation: expandDown 0.3s ease;
  }

  @keyframes expandDown {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .filter-row {
    margin-bottom: 14px;
  }

  .filter-row:last-child {
    margin-bottom: 0;
  }

  .filter-row.multi-row {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
  }

  @media (max-width: 900px) {
    .filter-row.multi-row {
      grid-template-columns: 1fr;
    }
  }

  .filter-block {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .filter-label {
    font-size: 11px;
    color: #8a7a5a;
    letter-spacing: 1.5px;
    text-transform: uppercase;
  }

  .chip-group {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .chip {
    padding: 6px 12px;
    background: rgba(60, 40, 25, 0.4);
    border: 1px solid rgba(139, 90, 43, 0.2);
    border-radius: 14px;
    font-size: 12px;
    color: #a89878;
    transition: all 0.2s;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .chip:hover {
    background: rgba(100, 70, 40, 0.5);
    border-color: rgba(200, 150, 80, 0.35);
    color: #d4c090;
  }

  .chip.active {
    background: linear-gradient(135deg, rgba(139, 90, 43, 0.6), rgba(100, 60, 30, 0.5));
    border-color: rgba(230, 180, 100, 0.5);
    color: #f0d8a8;
  }

  .chip.grade-chip {
    min-width: 36px;
    justify-content: center;
    font-weight: bold;
    padding: 6px 10px;
  }

  .chip.grade-chip.active {
    background: var(--grade-color);
    color: #1a0f0a;
    border-color: var(--grade-color);
  }

  .chip.tag-chip {
    font-size: 11px;
  }

  .film-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    display: inline-block;
    box-shadow: 0 0 4px rgba(0, 0, 0, 0.4);
  }

  .score-range {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .range-input {
    width: 72px;
    padding: 6px 10px;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(139, 90, 43, 0.25);
    border-radius: 6px;
    color: #e0d0b0;
    font-size: 13px;
    font-family: 'SF Mono', Monaco, monospace;
    text-align: center;
  }

  .range-input:focus {
    outline: none;
    border-color: rgba(200, 150, 80, 0.5);
  }

  .range-sep {
    color: #6a5a45;
    font-size: 14px;
  }

  .filter-actions {
    margin-top: 14px;
    padding-top: 14px;
    border-top: 1px solid rgba(139, 90, 43, 0.15);
    display: flex;
    justify-content: center;
  }

  .reset-filters-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 18px;
    background: rgba(160, 80, 80, 0.15);
    border: 1px solid rgba(200, 100, 100, 0.25);
    border-radius: 8px;
    color: #d89080;
    font-size: 12px;
    transition: all 0.2s;
  }

  .reset-filters-btn:hover {
    background: rgba(200, 80, 80, 0.25);
    border-color: rgba(220, 100, 100, 0.4);
  }

  .stats-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    margin-bottom: 24px;
  }

  @media (max-width: 700px) {
    .stats-row { grid-template-columns: repeat(2, 1fr); }
  }

  .stat-card {
    background: rgba(0, 0, 0, 0.25);
    border: 1px solid rgba(139, 90, 43, 0.15);
    border-radius: 10px;
    padding: 14px;
    text-align: center;
  }

  .stat-card.highlight {
    border-color: rgba(104, 200, 136, 0.3);
  }

  .stat-card.gold {
    border-color: rgba(255, 200, 80, 0.3);
  }

  .stat-value {
    font-size: 28px;
    font-weight: bold;
    color: #f0d8a8;
    font-family: 'SF Mono', Monaco, monospace;
    line-height: 1;
    margin-bottom: 6px;
  }

  .stat-card.highlight .stat-value { color: #8ad8a0; }
  .stat-card.gold .stat-value { color: #ffd060; }

  .stat-label {
    font-size: 11px;
    color: #7a6a55;
    letter-spacing: 1px;
  }

  .grades-mini {
    display: flex;
    justify-content: center;
    gap: 4px;
    margin-bottom: 6px;
  }

  .grade-mini-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 2px 6px;
    border-radius: 4px;
    background: rgba(0, 0, 0, 0.3);
    min-width: 28px;
  }

  .gm-letter {
    font-size: 13px;
    font-weight: bold;
    color: var(--c);
    line-height: 1;
  }

  .gm-count {
    font-size: 9px;
    color: #7a6a55;
    margin-top: 1px;
  }

  .empty-album {
    padding: 60px 20px;
    text-align: center;
  }

  .empty-icon {
    font-size: 64px;
    opacity: 0.4;
    margin-bottom: 16px;
  }

  .empty-title {
    font-size: 20px;
    color: #c8b898;
    margin: 0 0 8px;
  }

  .empty-desc {
    font-size: 13px;
    color: #7a6a55;
    margin: 0 0 20px;
  }

  .go-create-btn {
    padding: 12px 28px;
    background: linear-gradient(135deg, #8b5a2b, #6b4520);
    color: #f5e6d3;
    border-radius: 8px;
    font-size: 14px;
    letter-spacing: 1px;
    border: 1px solid rgba(200, 160, 100, 0.3);
  }

  .go-create-btn:hover {
    background: linear-gradient(135deg, #a06830, #805528);
  }

  .photos-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 16px;
  }

  @media (max-width: 500px) {
    .photos-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; }
  }

  .photo-card {
    position: relative;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(139, 90, 43, 0.2);
    border-radius: 10px;
    overflow: hidden;
    cursor: pointer;
    transition: all 0.25s ease;
    display: flex;
    flex-direction: column;
  }

  .photo-card:hover {
    transform: translateY(-3px);
    border-color: rgba(200, 150, 80, 0.4);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
  }

  .photo-image-wrap {
    position: relative;
    aspect-ratio: 3 / 4;
    overflow: hidden;
    background: #0a0503;
  }

  .photo-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.3s ease;
  }

  .photo-card:hover .photo-image {
    transform: scale(1.03);
  }

  .photo-grade-badge {
    position: absolute;
    top: 8px;
    left: 8px;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    font-weight: bold;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
  }

  .photo-score-tag {
    position: absolute;
    top: 8px;
    right: 8px;
    padding: 4px 10px;
    background: rgba(0, 0, 0, 0.7);
    border-radius: 12px;
    font-size: 12px;
    font-weight: 600;
    color: #f0d8a8;
    font-family: 'SF Mono', Monaco, monospace;
  }

  .photo-info {
    padding: 10px 12px;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .photo-name {
    font-size: 13px;
    color: #e0d0b0;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .photo-meta {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .meta-film {
    font-size: 10px;
    color: #a08860;
  }

  .meta-date {
    font-size: 10px;
    color: #5a4a35;
  }

  .photo-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 3px;
    margin-top: 2px;
  }

  .photo-tag {
    font-size: 9px;
    padding: 2px 6px;
    background: rgba(139, 90, 43, 0.2);
    border: 1px solid rgba(139, 90, 43, 0.25);
    border-radius: 8px;
    color: #b89868;
  }

  .photo-tag.more {
    background: rgba(100, 100, 100, 0.2);
    color: #8a7a5a;
    border-color: rgba(100, 100, 100, 0.3);
  }

  .photo-actions {
    position: absolute;
    bottom: 8px;
    right: 8px;
    opacity: 0;
    transition: opacity 0.2s;
  }

  .photo-card:hover .photo-actions {
    opacity: 1;
  }

  .mini-btn {
    width: 28px;
    height: 28px;
    border-radius: 6px;
    background: rgba(0, 0, 0, 0.7);
    border: 1px solid rgba(200, 100, 100, 0.3);
    font-size: 12px;
  }

  .mini-btn.delete:hover {
    background: rgba(200, 80, 80, 0.3);
  }

  .photo-detail-modal {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.9);
    z-index: 200;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    animation: fadeIn 0.25s ease;
  }

  .modal-inner {
    display: grid;
    grid-template-columns: minmax(280px, 1fr) minmax(320px, 420px);
    gap: 24px;
    max-width: 950px;
    max-height: 90vh;
    align-items: start;
  }

  @media (max-width: 800px) {
    .modal-inner {
      grid-template-columns: 1fr;
      max-height: 92vh;
      overflow-y: auto;
    }
  }

  .detail-image-wrap {
    background: #0a0503;
    border-radius: 12px;
    overflow: hidden;
    border: 1px solid rgba(139, 90, 43, 0.3);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
  }

  .detail-image {
    display: block;
    width: 100%;
    height: auto;
  }

  .detail-tags {
    padding: 10px 14px;
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    border-top: 1px solid rgba(139, 90, 43, 0.2);
  }

  .detail-tag {
    font-size: 11px;
    padding: 4px 10px;
    background: rgba(139, 90, 43, 0.18);
    border: 1px solid rgba(139, 90, 43, 0.3);
    border-radius: 10px;
    color: #c8a878;
    transition: all 0.2s;
    cursor: pointer;
  }

  .detail-tag:hover {
    background: rgba(180, 120, 60, 0.3);
    border-color: rgba(220, 170, 100, 0.5);
    color: #f0d8a8;
  }

  .detail-panel-wrap {
    max-height: 90vh;
    overflow-y: auto;
  }

  .confirm-modal {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.85);
    z-index: 300;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: fadeIn 0.2s ease;
  }

  .confirm-box {
    background: linear-gradient(180deg, rgba(60, 35, 25, 0.98), rgba(40, 22, 15, 0.98));
    border: 1px solid rgba(200, 100, 80, 0.3);
    border-radius: 12px;
    padding: 24px 28px;
    text-align: center;
    max-width: 320px;
    animation: slideUp 0.3s ease;
  }

  .confirm-title {
    font-size: 18px;
    color: #e0c0a0;
    margin: 0 0 8px;
  }

  .confirm-desc {
    font-size: 13px;
    color: #8a7a60;
    margin: 0 0 20px;
    line-height: 1.5;
  }

  .confirm-actions {
    display: flex;
    gap: 10px;
  }

  .btn {
    flex: 1;
    padding: 10px 16px;
    border-radius: 8px;
    font-size: 13px;
    letter-spacing: 1px;
    transition: all 0.2s;
  }

  .btn.cancel {
    background: rgba(100, 100, 100, 0.15);
    color: #a89878;
    border: 1px solid rgba(100, 100, 100, 0.3);
  }

  .btn.cancel:hover {
    background: rgba(120, 120, 120, 0.25);
  }

  .btn.danger {
    background: rgba(200, 80, 80, 0.2);
    color: #e09080;
    border: 1px solid rgba(200, 80, 80, 0.4);
  }

  .btn.danger:hover {
    background: rgba(200, 80, 80, 0.35);
  }

  .search-box {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(139, 90, 43, 0.25);
    border-radius: 8px;
    transition: all 0.2s;
  }

  .search-box:focus-within {
    border-color: rgba(200, 150, 80, 0.5);
    box-shadow: 0 0 0 3px rgba(200, 150, 80, 0.1);
  }

  .search-icon {
    font-size: 14px;
    opacity: 0.6;
    flex-shrink: 0;
  }

  .search-input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: #e0d0b0;
    font-size: 13px;
    font-family: inherit;
    min-width: 0;
  }

  .search-input::placeholder {
    color: #5a4a35;
  }

  .search-clear {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: rgba(160, 80, 80, 0.2);
    border: 1px solid rgba(200, 100, 100, 0.25);
    color: #d89080;
    font-size: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
    flex-shrink: 0;
  }

  .search-clear:hover {
    background: rgba(200, 80, 80, 0.3);
  }

  .photo-note-badge {
    position: absolute;
    bottom: 8px;
    left: 8px;
    width: 28px;
    height: 28px;
    border-radius: 8px;
    background: rgba(200, 150, 80, 0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
    animation: notePulse 2s ease-in-out infinite;
  }

  @keyframes notePulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
  }

  .detail-notes-preview {
    padding: 14px 16px;
    background: rgba(139, 90, 43, 0.1);
    border-top: 1px solid rgba(139, 90, 43, 0.2);
    border-left: 3px solid rgba(200, 150, 80, 0.5);
  }

  .notes-preview-header {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 10px;
  }

  .notes-icon {
    font-size: 14px;
  }

  .notes-title {
    font-size: 12px;
    font-weight: 500;
    color: #d4a574;
    letter-spacing: 1px;
  }

  .notes-preview-content {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .notes-preview-line {
    margin: 0;
    font-size: 12px;
    color: #b8a888;
    line-height: 1.6;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .notes-more {
    margin: 4px 0 0;
    font-size: 10px;
    color: #7a6a55;
    font-style: italic;
  }
</style>
