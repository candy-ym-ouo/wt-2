<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { ProcessedPhoto, AlbumFilter, SortOption, PhotoCollection, CollectionGroup, AlbumViewMode, CollectionStats } from '../types/game';
  import { gameStore, calculateCollectionStats } from '../stores/gameStore';
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

  const dispatch = createEventDispatcher<{
    close: void;
    delete: string;
    viewDetail: ProcessedPhoto;
    compare: { subjectId: string; photoIds: string[] };
  }>();

  let selectedPhoto: ProcessedPhoto | null = null;
  let showDeleteConfirm = false;
  let photoToDelete: string | null = null;
  let showFilters = true;
  let compareMode = false;
  let compareSelection: string[] = [];
  let compareSubjectId: string | null = null;

  let showCreateCollection = false;
  let showCreateGroup = false;
  let newCollectionName = '';
  let newCollectionDesc = '';
  let newGroupName = '';
  let newGroupDesc = '';
  let showCollectionPicker = false;
  let collectionPickerPhotoId: string | null = null;
  let showCoverPicker = false;
  let coverPickerType: 'collection' | 'group' = 'collection';
  let coverPickerTargetId: string | null = null;

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

  $: viewMode = $gameStore.collectionFilter.viewMode;
  $: activeCollectionId = $gameStore.collectionFilter.activeCollectionId;
  $: activeGroupId = $gameStore.collectionFilter.activeGroupId;
  $: favorites = $gameStore.favorites;
  $: collections = $gameStore.collections;
  $: quickBrowseIndex = $gameStore.quickBrowseIndex;
  $: quickBrowsePhotoIds = $gameStore.quickBrowsePhotoIds;
  $: showQuickBrowse = quickBrowsePhotoIds.length > 0;

  $: activeCollection = collections.find(c => c.id === activeCollectionId);
  $: activeGroup = activeCollection?.groups.find(g => g.id === activeGroupId);

  $: favoritePhotoIds = new Set(favorites.map(f => f.photoId));

  $: isFavorite = (photoId: string) => favoritePhotoIds.has(photoId);

  $: viewModePhotos = (() => {
    if (viewMode === 'favorites') {
      const favIds = new Set(favorites.map(f => f.photoId));
      return photos.filter(p => favIds.has(p.id));
    } else if (viewMode === 'collections') {
      if (activeCollectionId) {
        const col = collections.find(c => c.id === activeCollectionId);
        if (col) {
          let photoIds = col.photoIds;
          if (activeGroupId) {
            const group = col.groups.find(g => g.id === activeGroupId);
            if (group) {
              photoIds = group.photoIds;
            }
          }
          const idSet = new Set(photoIds);
          return photos.filter(p => idSet.has(p.id));
        }
      }
      return [];
    }
    return photos;
  })();

  let currentStats: CollectionStats;
  $: currentStats = calculateCollectionStats(viewModePhotos);

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

  function getPhotoById(id: string): ProcessedPhoto | undefined {
    return photos.find(p => p.id === id);
  }

  function getCoverImageUrl(colOrGroup: PhotoCollection | CollectionGroup): string {
    if (colOrGroup.coverPhotoId) {
      const photo = getPhotoById(colOrGroup.coverPhotoId);
      if (photo) return photo.imageDataUrl;
    }
    const firstPhotoId = colOrGroup.photoIds[0];
    if (firstPhotoId) {
      const photo = getPhotoById(firstPhotoId);
      if (photo) return photo.imageDataUrl;
    }
    return '';
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

  function toggleCompareMode() {
    compareMode = !compareMode;
    if (!compareMode) {
      compareSelection = [];
      compareSubjectId = null;
    }
  }

  function toggleComparePhoto(photo: ProcessedPhoto) {
    if (compareSelection.includes(photo.id)) {
      compareSelection = compareSelection.filter(id => id !== photo.id);
      if (compareSelection.length === 0) {
        compareSubjectId = null;
      }
    } else {
      if (compareSubjectId && compareSubjectId !== photo.subjectId) {
        compareSelection = [photo.id];
      } else {
        if (compareSelection.length >= 4) {
          return;
        }
        compareSelection = [...compareSelection, photo.id];
      }
      compareSubjectId = photo.subjectId;
    }
  }

  function startCompare() {
    if (compareSubjectId && compareSelection.length >= 2) {
      dispatch('compare', {
        subjectId: compareSubjectId,
        photoIds: compareSelection
      });
    }
  }

  function getSubjectPhotosCount(subjectId: string): number {
    return viewModePhotos.filter(p => p.subjectId === subjectId).length;
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

  function handleToggleFavorite(photoId: string, e: Event) {
    e.stopPropagation();
    gameStore.toggleFavorite(photoId);
  }

  function toggleSelectedFavorite(e: Event) {
    if (selectedPhoto) handleToggleFavorite(selectedPhoto.id, e);
  }

  function openSelectedCollectionPicker(e: Event) {
    if (selectedPhoto) openCollectionPicker(selectedPhoto.id, e);
  }

  function startQuickBrowseFromSelected() {
    const photo = selectedPhoto;
    if (!photo) return;
    const idx = filteredPhotos.findIndex(p => p.id === photo.id);
    startQuickBrowse(filteredPhotos.map(p => p.id), idx >= 0 ? idx : 0);
    selectedPhoto = null;
  }

  function setViewMode(mode: AlbumViewMode) {
    gameStore.setAlbumViewMode(mode);
  }

  function selectCollection(collectionId: string | null) {
    gameStore.setActiveCollection(collectionId);
  }

  function selectGroup(groupId: string | null) {
    gameStore.setActiveGroup(groupId);
  }

  function handleCreateCollection() {
    if (!newCollectionName.trim()) return;
    gameStore.createCollection(newCollectionName.trim(), newCollectionDesc.trim() || undefined);
    newCollectionName = '';
    newCollectionDesc = '';
    showCreateCollection = false;
  }

  function handleCreateGroup() {
    if (!newGroupName.trim() || !activeCollectionId) return;
    gameStore.createGroup(activeCollectionId, newGroupName.trim(), newGroupDesc.trim() || undefined);
    newGroupName = '';
    newGroupDesc = '';
    showCreateGroup = false;
  }

  function handleDeleteCollection(id: string, e: Event) {
    e.stopPropagation();
    if (confirm('确定要删除这个精选集吗？其中的照片不会被删除。')) {
      gameStore.deleteCollection(id);
    }
  }

  function handleDeleteGroup(id: string, e: Event) {
    e.stopPropagation();
    if (confirm('确定要删除这个分组吗？其中的照片不会被删除。')) {
      gameStore.deleteGroup(activeCollectionId!, id);
    }
  }

  function openCollectionPicker(photoId: string, e: Event) {
    e.stopPropagation();
    collectionPickerPhotoId = photoId;
    showCollectionPicker = true;
  }

  function addPhotoToCollection(collectionId: string) {
    if (!collectionPickerPhotoId) return;
    const collection = collections.find(c => c.id === collectionId);
    if (collection && collection.photoIds.includes(collectionPickerPhotoId)) {
      gameStore.removePhotoFromCollection(collectionId, collectionPickerPhotoId);
    } else {
      gameStore.addPhotoToCollection(collectionId, collectionPickerPhotoId);
    }
    showCollectionPicker = false;
    collectionPickerPhotoId = null;
  }

  function isPhotoInCollection(photoId: string, collectionId: string): boolean {
    const collection = collections.find(c => c.id === collectionId);
    return collection?.photoIds.includes(photoId) || false;
  }

  function openCoverPicker(type: 'collection' | 'group', targetId: string) {
    coverPickerType = type;
    coverPickerTargetId = targetId;
    showCoverPicker = true;
  }

  function handleSetCover(photoId: string) {
    if (!coverPickerTargetId) return;
    if (coverPickerType === 'collection') {
      gameStore.setCollectionCover(coverPickerTargetId, photoId);
    } else if (coverPickerType === 'group' && activeCollectionId) {
      gameStore.setGroupCover(activeCollectionId, coverPickerTargetId, photoId);
    }
    showCoverPicker = false;
    coverPickerTargetId = null;
  }

  function handleClearCover(e: Event) {
    e.stopPropagation();
    if (!coverPickerTargetId) return;
    if (coverPickerType === 'collection') {
      gameStore.setCollectionCover(coverPickerTargetId, undefined);
    } else if (coverPickerType === 'group' && activeCollectionId) {
      gameStore.setGroupCover(activeCollectionId, coverPickerTargetId, undefined);
    }
    showCoverPicker = false;
    coverPickerTargetId = null;
  }

  function startQuickBrowse(photoIds: string[], startIndex: number = 0) {
    gameStore.startQuickBrowse(photoIds, startIndex);
  }

  function handleQuickBrowseNext() {
    gameStore.nextQuickBrowse();
  }

  function handleQuickBrowsePrev() {
    gameStore.prevQuickBrowse();
  }

  function handleQuickBrowseClose() {
    gameStore.exitQuickBrowse();
  }

  $: quickBrowsePhoto = quickBrowsePhotoIds.length > 0 ? getPhotoById(quickBrowsePhotoIds[quickBrowseIndex]) : null;

  $: filteredPhotos = (() => {
    let result = [...viewModePhotos];

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

  function handleKeydown(e: KeyboardEvent) {
    if (showQuickBrowse) {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        handleQuickBrowseNext();
      } else if (e.key === 'ArrowLeft') {
        handleQuickBrowsePrev();
      } else if (e.key === 'Escape') {
        handleQuickBrowseClose();
      }
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="album-overlay">
  <div class="album-container">
    <div class="album-header">
      <div class="header-left">
        <h2 class="album-title">📚 我的照片册</h2>
        {#if activeFilterCount > 0}
          <span class="filter-badge">{activeFilterCount} 个筛选条件</span>
        {/if}
        {#if compareMode}
          <span class="compare-badge">🔍 对比模式</span>
        {/if}
      </div>
      <div class="header-right">
        {#if compareMode}
          <button
            class="compare-start-btn"
            disabled={compareSelection.length < 2}
            on:click={startCompare}
          >
            <span>📊</span>
            <span>开始对比 ({compareSelection.length}/4)</span>
          </button>
          <button class="cancel-compare-btn" on:click={toggleCompareMode}>
            <span>✕</span>
            <span>取消</span>
          </button>
        {:else}
          <button
            class="compare-toggle-btn"
            on:click={toggleCompareMode}
            title="对比同题材作品"
          >
            <span>🔍</span>
            <span>对比</span>
          </button>
          <button class="filter-toggle" on:click={() => showFilters = !showFilters}>
            <span>{showFilters ? '收起筛选' : '展开筛选'}</span>
            <span class="toggle-icon">{showFilters ? '▲' : '▼'}</span>
          </button>
          <button class="close-btn" on:click={() => dispatch('close')}>
            <span>✕</span>
          </button>
        {/if}
      </div>
    </div>

    <div class="view-mode-tabs">
      <button
        class="view-tab"
        class:active={viewMode === 'all'}
        on:click={() => setViewMode('all')}
      >
        <span>🖼</span>
        <span>全部作品</span>
        <span class="tab-count">{photos.length}</span>
      </button>
      <button
        class="view-tab"
        class:active={viewMode === 'favorites'}
        on:click={() => setViewMode('favorites')}
      >
        <span>⭐</span>
        <span>我的收藏</span>
        <span class="tab-count">{favorites.length}</span>
      </button>
      <button
        class="view-tab"
        class:active={viewMode === 'collections'}
        on:click={() => setViewMode('collections')}
      >
        <span>📁</span>
        <span>精选集</span>
        <span class="tab-count">{collections.length}</span>
      </button>
    </div>

    {#if viewMode === 'collections'}
      <div class="collections-nav">
        {#if !activeCollectionId}
          <div class="collections-list">
            {#each collections as col (col.id)}
              <div
                class="collection-card"
                on:click={() => selectCollection(col.id)}
              >
                <div class="collection-cover">
                  {#if getCoverImageUrl(col)}
                    <img src={getCoverImageUrl(col)} alt={col.name} />
                  {:else}
                    <div class="collection-cover-empty">
                      <span>🖼</span>
                    </div>
                  {/if}
                  {#if col.coverPhotoId}
                    <button
                      class="cover-remove-btn"
                      on:click|stopPropagation={(e) => {
                        e.preventDefault();
                        gameStore.setCollectionCover(col.id, undefined);
                      }}
                      title="移除封面"
                    >
                      ✕
                    </button>
                  {/if}
                </div>
                <div class="collection-info">
                  <div class="collection-name">{col.name}</div>
                  <div class="collection-meta">
                    <span>{col.photoIds.length} 张作品</span>
                    {#if col.groups.length > 0}
                      <span>· {col.groups.length} 个分组</span>
                    {/if}
                  </div>
                </div>
                <div class="collection-actions">
                  <button
                    class="mini-btn"
                    on:click|stopPropagation={() => openCoverPicker('collection', col.id)}
                    title="设置封面"
                  >
                    🖼
                  </button>
                  <button
                    class="mini-btn delete"
                    on:click|stopPropagation={(e) => handleDeleteCollection(col.id, e)}
                    title="删除精选集"
                  >
                    🗑
                  </button>
                </div>
              </div>
            {/each}
            <button
              class="collection-card create-new"
              on:click={() => showCreateCollection = true}
            >
              <div class="collection-cover-empty large">
                <span class="plus-icon">+</span>
              </div>
              <div class="collection-info">
                <div class="collection-name">新建精选集</div>
                <div class="collection-meta">
                  <span>组织你的作品</span>
                </div>
              </div>
            </button>
          </div>
        {:else if activeCollection}
          <div class="collection-detail-nav">
            <button class="back-btn" on:click={() => selectCollection(null)}>
              <span>←</span>
              <span>返回精选集列表</span>
            </button>
            <div class="collection-detail-title">
              <h3>{activeCollection.name}</h3>
              {#if activeCollection.description}
                <span class="collection-desc">{activeCollection.description}</span>
              {/if}
            </div>
            <div class="collection-detail-actions">
              <button
                class="action-btn"
                on:click={() => openCoverPicker('collection', activeCollection.id)}
              >
                <span>🖼</span>
                <span>设置封面</span>
              </button>
              <button
                class="action-btn"
                on:click={() => showCreateGroup = true}
              >
                <span>📁</span>
                <span>新建分组</span>
              </button>
            </div>
          </div>
          {#if activeCollection.groups.length > 0}
            <div class="groups-list">
              <button
                class="group-chip"
                class:active={!activeGroupId}
                on:click={() => selectGroup(null)}
              >
                <span>📚</span>
                <span>全部</span>
                <span class="group-count">{activeCollection.photoIds.length}</span>
              </button>
              {#each activeCollection.groups as group (group.id)}
                <button
                  class="group-chip"
                  class:active={activeGroupId === group.id}
                  on:click={() => selectGroup(group.id)}
                >
                  <span>📁</span>
                  <span>{group.name}</span>
                  <span class="group-count">{group.photoIds.length}</span>
                  <button
                    class="group-action-btn"
                    on:click|stopPropagation={() => openCoverPicker('group', group.id)}
                    title="设置分组封面"
                  >
                    🖼
                  </button>
                  <button
                    class="group-action-btn delete"
                    on:click|stopPropagation={(e) => handleDeleteGroup(group.id, e)}
                    title="删除分组"
                  >
                    ✕
                  </button>
                </button>
              {/each}
            </div>
          {/if}
        {/if}
      </div>
    {/if}

    {#if compareMode}
      <div class="compare-hint">
        <span class="hint-icon">💡</span>
        <span class="hint-text">
          {#if compareSubjectId}
            已选择「{getSubjectName(compareSubjectId)}」题材的 {compareSelection.length} 张作品
            {#if compareSelection.length < 2}，请再选择 {2 - compareSelection.length} 张
            {:else if compareSelection.length < 4}，还可以再选择 {4 - compareSelection.length} 张
            {/if}
          {:else}
            请选择 2-4 张<strong>同题材</strong>的作品进行对比
          {/if}
        </span>
      </div>
    {/if}

    {#if showFilters && viewMode !== 'collections' || (viewMode === 'collections' && activeCollectionId)}
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
    {/if}

    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-value">{filteredStats.total}</div>
        <div class="stat-label">{hasActiveFilters() ? '筛选结果' : (viewMode === 'favorites' ? '收藏总数' : viewMode === 'collections' ? (activeGroup ? '分组作品数' : (activeCollection ? '精选集作品' : '精选集总数')) : '总作品')}</div>
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

    {#if viewMode !== 'collections' || activeCollectionId}
      {#if viewModePhotos.length === 0 && viewMode === 'favorites'}
        <div class="empty-album">
          <div class="empty-icon">⭐</div>
          <h3 class="empty-title">还没有收藏的作品</h3>
          <p class="empty-desc">浏览作品时点击 ⭐ 按钮收藏喜欢的作品</p>
          <button class="go-create-btn" on:click={() => setViewMode('all')}>
            浏览全部作品
          </button>
        </div>
      {:else if viewMode === 'collections' && !activeCollectionId}
      {:else if viewModePhotos.length === 0 && viewMode === 'collections' && activeCollection}
        <div class="empty-album">
          <div class="empty-icon">📁</div>
          <h3 class="empty-title">精选集是空的</h3>
          <p class="empty-desc">从全部作品中添加照片到这个精选集吧</p>
          <button class="go-create-btn" on:click={() => setViewMode('all')}>
            浏览全部作品
          </button>
        </div>
      {:else if photos.length === 0}
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
          {#each filteredPhotos as photo, idx (photo.id)}
            <div
              class="photo-card"
              class:compare-mode={compareMode}
              class:selected={compareSelection.includes(photo.id)}
              class:disabled={compareMode && compareSubjectId && compareSubjectId !== photo.subjectId}
              on:click={() => {
                if (compareMode) {
                  if (!compareSubjectId || compareSubjectId === photo.subjectId || getSubjectPhotosCount(photo.subjectId) < 2) {
                    toggleComparePhoto(photo);
                  }
                } else {
                  selectedPhoto = photo;
                }
              }}
            >
              <div class="photo-image-wrap">
                {#if compareMode}
                  <div class="compare-checkbox">
                    {#if compareSelection.includes(photo.id)}
                      <span class="check-icon">✓</span>
                      <span class="check-number">{compareSelection.indexOf(photo.id) + 1}</span>
                    {:else}
                      <span class="check-icon">○</span>
                    {/if}
                  </div>
                {/if}
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
                  class="mini-btn favorite"
                  class:favorited={isFavorite(photo.id)}
                  on:click|stopPropagation={(e) => handleToggleFavorite(photo.id, e)}
                  title={isFavorite(photo.id) ? '取消收藏' : '收藏'}
                >
                  {isFavorite(photo.id) ? '⭐' : '☆'}
                </button>
                <button
                  class="mini-btn folder"
                  on:click|stopPropagation={(e) => openCollectionPicker(photo.id, e)}
                  title="添加到精选集"
                >
                  📁
                </button>
                {#if filteredPhotos.length > 1}
                  <button
                    class="mini-btn browse"
                    on:click|stopPropagation={() => startQuickBrowse(filteredPhotos.map(p => p.id), idx)}
                    title="快速浏览"
                  >
                    👁
                  </button>
                {/if}
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
          <div class="detail-quick-actions">
            <button
              class="detail-action-btn favorite"
              class:favorited={isFavorite(selectedPhoto?.id || '')}
              on:click={toggleSelectedFavorite}
            >
              {isFavorite(selectedPhoto?.id || '') ? '⭐ 已收藏' : '☆ 收藏'}
            </button>
            <button
              class="detail-action-btn"
              on:click={openSelectedCollectionPicker}
            >
              📁 精选集
            </button>
            {#if filteredPhotos.length > 1}
              <button
                class="detail-action-btn"
                on:click={startQuickBrowseFromSelected}
              >
                👁 快速浏览
              </button>
            {/if}
          </div>
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

  {#if showCreateCollection}
    <div class="confirm-modal" on:click={() => showCreateCollection = false}>
      <div class="confirm-box" on:click|stopPropagation>
        <h3 class="confirm-title">新建精选集</h3>
        <div class="form-field">
          <label class="field-label">名称</label>
          <input
            type="text"
            class="field-input"
            bind:value={newCollectionName}
            placeholder="精选集名称"
            maxlength="20"
          />
        </div>
        <div class="form-field">
          <label class="field-label">描述（可选）</label>
          <textarea
            class="field-input textarea"
            bind:value={newCollectionDesc}
            placeholder="简单描述这个精选集..."
            maxlength="100"
            rows="3"
          />
        </div>
        <div class="confirm-actions">
          <button class="btn cancel" on:click={() => showCreateCollection = false}>取消</button>
          <button class="btn primary" on:click={handleCreateCollection} disabled={!newCollectionName.trim()}>创建</button>
        </div>
      </div>
    </div>
  {/if}

  {#if showCreateGroup}
    <div class="confirm-modal" on:click={() => showCreateGroup = false}>
      <div class="confirm-box" on:click|stopPropagation>
        <h3 class="confirm-title">新建分组</h3>
        <div class="form-field">
          <label class="field-label">分组名称</label>
          <input
            type="text"
            class="field-input"
            bind:value={newGroupName}
            placeholder="分组名称"
            maxlength="20"
          />
        </div>
        <div class="form-field">
          <label class="field-label">描述（可选）</label>
          <textarea
            class="field-input textarea"
            bind:value={newGroupDesc}
            placeholder="简单描述这个分组..."
            maxlength="100"
            rows="3"
          />
        </div>
        <div class="confirm-actions">
          <button class="btn cancel" on:click={() => showCreateGroup = false}>取消</button>
          <button class="btn primary" on:click={handleCreateGroup} disabled={!newGroupName.trim()}>创建</button>
        </div>
      </div>
    </div>
  {/if}

  {#if showCollectionPicker && collectionPickerPhotoId}
    <div class="confirm-modal" on:click={() => showCollectionPicker = false}>
      <div class="confirm-box wide" on:click|stopPropagation>
        <h3 class="confirm-title">添加到精选集</h3>
        {#if collections.length === 0}
          <p class="confirm-desc">还没有创建精选集，请先创建一个</p>
        {:else}
          <div class="picker-list">
            {#each collections as col (col.id)}
              <button
                class="picker-item"
                class:selected={isPhotoInCollection(collectionPickerPhotoId, col.id)}
                on:click={() => addPhotoToCollection(col.id)}
              >
                <div class="picker-cover">
                  {#if getCoverImageUrl(col)}
                    <img src={getCoverImageUrl(col)} alt="" />
                  {:else}
                    <span class="picker-cover-empty">📁</span>
                  {/if}
                </div>
                <div class="picker-info">
                  <div class="picker-name">{col.name}</div>
                  <div class="picker-count">{col.photoIds.length} 张</div>
                </div>
                <div class="picker-check">
                  {isPhotoInCollection(collectionPickerPhotoId, col.id) ? '✓' : '+'}
                </div>
              </button>
            {/each}
          </div>
        {/if}
        <div class="confirm-actions">
          <button class="btn cancel" on:click={() => showCollectionPicker = false}>关闭</button>
          <button
            class="btn primary"
            on:click={() => {
              showCollectionPicker = false;
              showCreateCollection = true;
            }}
          >
            + 新建精选集
          </button>
        </div>
      </div>
    </div>
  {/if}

  {#if showCoverPicker && coverPickerTargetId}
    <div class="confirm-modal" on:click={() => showCoverPicker = false}>
      <div class="confirm-box wide" on:click|stopPropagation>
        <h3 class="confirm-title">选择封面照片</h3>
        {#if viewModePhotos.length === 0}
          <p class="confirm-desc">没有可选的照片</p>
        {:else}
          <div class="cover-picker-grid">
            {#each viewModePhotos as photo (photo.id)}
              <button
                class="cover-picker-item"
                on:click={() => handleSetCover(photo.id)}
              >
                <img src={photo.imageDataUrl} alt="" />
                <div class="cover-picker-score">{photo.score}</div>
              </button>
            {/each}
          </div>
        {/if}
        <div class="confirm-actions">
          <button class="btn cancel" on:click={(e) => handleClearCover(e)}>清除封面</button>
          <button class="btn" on:click={() => showCoverPicker = false}>取消</button>
        </div>
      </div>
    </div>
  {/if}

  {#if showQuickBrowse && quickBrowsePhoto}
    <div class="quick-browse-modal" on:click={handleQuickBrowseClose}>
      <div class="quick-browse-inner" on:click|stopPropagation>
        <button class="qb-close" on:click={handleQuickBrowseClose}>✕</button>
        <button class="qb-nav prev" on:click={handleQuickBrowsePrev}>‹</button>
        <button class="qb-nav next" on:click={handleQuickBrowseNext}>›</button>
        <div class="qb-image-wrap">
          <img src={quickBrowsePhoto.imageDataUrl} alt="" class="qb-image" />
        </div>
        <div class="qb-info">
          <div class="qb-info-main">
            <div class="qb-title">{getSubjectName(quickBrowsePhoto.subjectId)}</div>
            <div class="qb-meta">
              <span class="qb-film">{getFilmName(quickBrowsePhoto.filmId)}</span>
              <span class="qb-date">{formatDate(quickBrowsePhoto.timestamp)}</span>
            </div>
          </div>
          <div class="qb-score-info">
            <div
              class="qb-grade"
              style="background: {GRADE_COLORS[quickBrowsePhoto.details.grade]};"
            >
              {quickBrowsePhoto.details.grade}
            </div>
            <div class="qb-score">{quickBrowsePhoto.score} 分</div>
          </div>
        </div>
        <div class="qb-counter">
          {quickBrowseIndex + 1} / {quickBrowsePhotoIds.length}
        </div>
        <div class="qb-actions">
          <button
            class="qb-action"
            class:favorited={isFavorite(quickBrowsePhoto.id)}
            on:click={() => gameStore.toggleFavorite(quickBrowsePhoto.id)}
          >
            {isFavorite(quickBrowsePhoto.id) ? '⭐' : '☆'}
          </button>
          <button
            class="qb-action"
            on:click={() => dispatch('viewDetail', quickBrowsePhoto)}
          >
            📊 查看详情
          </button>
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
    margin-bottom: 16px;
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

  .view-mode-tabs {
    display: flex;
    gap: 8px;
    margin-bottom: 20px;
    padding-bottom: 16px;
    border-bottom: 1px solid rgba(139, 90, 43, 0.15);
  }

  .view-tab {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px 16px;
    background: rgba(60, 40, 25, 0.3);
    border: 1px solid rgba(139, 90, 43, 0.2);
    border-radius: 10px;
    color: #a89878;
    font-size: 13px;
    transition: all 0.2s;
    cursor: pointer;
  }

  .view-tab:hover {
    background: rgba(100, 70, 40, 0.4);
    color: #d4c090;
  }

  .view-tab.active {
    background: linear-gradient(135deg, rgba(139, 90, 43, 0.6), rgba(100, 60, 30, 0.5));
    border-color: rgba(230, 180, 100, 0.5);
    color: #f0d8a8;
    box-shadow: 0 2px 12px rgba(200, 150, 80, 0.15);
  }

  .tab-count {
    padding: 2px 8px;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 10px;
    font-size: 11px;
    font-family: 'SF Mono', Monaco, monospace;
  }

  .view-tab.active .tab-count {
    background: rgba(255, 200, 100, 0.2);
  }

  .collections-nav {
    margin-bottom: 20px;
  }

  .collections-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 16px;
  }

  .collection-card {
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(139, 90, 43, 0.2);
    border-radius: 12px;
    overflow: hidden;
    cursor: pointer;
    transition: all 0.25s ease;
    display: flex;
    flex-direction: column;
  }

  .collection-card:hover {
    transform: translateY(-3px);
    border-color: rgba(200, 150, 80, 0.4);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
  }

  .collection-card.create-new {
    border-style: dashed;
    border-color: rgba(139, 90, 43, 0.4);
    align-items: center;
    justify-content: center;
    padding: 20px;
    min-height: 240px;
  }

  .collection-card.create-new:hover {
    border-color: rgba(200, 150, 80, 0.6);
    background: rgba(139, 90, 43, 0.1);
  }

  .collection-cover {
    position: relative;
    aspect-ratio: 3 / 4;
    overflow: hidden;
    background: #0a0503;
  }

  .collection-cover img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .collection-cover-empty {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 48px;
    opacity: 0.4;
  }

  .collection-cover-empty.large {
    font-size: 64px;
    flex-direction: column;
  }

  .plus-icon {
    font-size: 72px;
    color: rgba(200, 150, 80, 0.5);
  }

  .cover-remove-btn {
    position: absolute;
    top: 6px;
    right: 6px;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.7);
    border: none;
    color: #d89080;
    font-size: 12px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.2s;
  }

  .collection-card:hover .cover-remove-btn {
    opacity: 1;
  }

  .collection-info {
    padding: 12px 14px;
    flex: 1;
  }

  .collection-name {
    font-size: 14px;
    font-weight: 500;
    color: #e0d0b0;
    margin-bottom: 4px;
  }

  .collection-meta {
    font-size: 11px;
    color: #8a7a5a;
  }

  .collection-actions {
    padding: 8px 12px;
    display: flex;
    gap: 6px;
    justify-content: flex-end;
    border-top: 1px solid rgba(139, 90, 43, 0.15);
    opacity: 0;
    transition: opacity 0.2s;
  }

  .collection-card:hover .collection-actions {
    opacity: 1;
  }

  .collection-detail-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 16px;
    padding-bottom: 16px;
    border-bottom: 1px solid rgba(139, 90, 43, 0.15);
    flex-wrap: wrap;
  }

  .back-btn {
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

  .back-btn:hover {
    background: rgba(139, 90, 43, 0.3);
    color: #e0c890;
  }

  .collection-detail-title {
    flex: 1;
    min-width: 200px;
  }

  .collection-detail-title h3 {
    margin: 0;
    font-size: 18px;
    color: #f0d8a8;
  }

  .collection-desc {
    font-size: 12px;
    color: #8a7a5a;
  }

  .collection-detail-actions {
    display: flex;
    gap: 8px;
  }

  .action-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    background: rgba(100, 150, 200, 0.12);
    border: 1px solid rgba(100, 150, 200, 0.25);
    border-radius: 8px;
    color: #8ab4d8;
    font-size: 12px;
    transition: all 0.2s;
  }

  .action-btn:hover {
    background: rgba(100, 150, 200, 0.25);
    transform: translateY(-1px);
  }

  .groups-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 20px;
    padding-bottom: 16px;
    border-bottom: 1px solid rgba(139, 90, 43, 0.1);
  }

  .group-chip {
    position: relative;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    background: rgba(60, 40, 25, 0.4);
    border: 1px solid rgba(139, 90, 43, 0.2);
    border-radius: 20px;
    color: #a89878;
    font-size: 12px;
    transition: all 0.2s;
    cursor: pointer;
  }

  .group-chip:hover {
    background: rgba(100, 70, 40, 0.5);
  }

  .group-chip.active {
    background: linear-gradient(135deg, rgba(100, 150, 200, 0.3), rgba(80, 120, 180, 0.2));
    border-color: rgba(100, 150, 200, 0.5);
    color: #a8c8e8;
  }

  .group-count {
    padding: 2px 8px;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 10px;
    font-size: 10px;
    font-family: 'SF Mono', Monaco, monospace;
  }

  .group-action-btn {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.3);
    border: none;
    font-size: 11px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: all 0.2s;
    margin-left: 2px;
  }

  .group-chip:hover .group-action-btn {
    opacity: 1;
  }

  .group-action-btn:hover {
    background: rgba(100, 150, 200, 0.3);
    color: #e0f0e8;
  }

  .group-action-btn.delete:hover {
    background: rgba(200, 100, 100, 0.3);
    color: #f0c0b8;
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
    display: flex;
    gap: 4px;
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
    border: 1px solid rgba(139, 90, 43, 0.3);
    font-size: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }

  .mini-btn:hover {
    transform: translateY(-1px);
  }

  .mini-btn.favorite {
    border-color: rgba(200, 150, 80, 0.3);
  }

  .mini-btn.favorite:hover {
    background: rgba(200, 150, 80, 0.2);
  }

  .mini-btn.favorite.favorited {
    background: rgba(255, 200, 80, 0.2);
    border-color: rgba(255, 200, 80, 0.5);
  }

  .mini-btn.folder {
    border-color: rgba(100, 150, 200, 0.3);
  }

  .mini-btn.folder:hover {
    background: rgba(100, 150, 200, 0.2);
  }

  .mini-btn.browse {
    border-color: rgba(100, 200, 150, 0.3);
  }

  .mini-btn.browse:hover {
    background: rgba(100, 200, 150, 0.2);
  }

  .mini-btn.delete {
    border: 1px solid rgba(200, 100, 100, 0.3);
  }

  .mini-btn.delete:hover {
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

  .detail-quick-actions {
    padding: 12px 16px;
    display: flex;
    gap: 8px;
    border-top: 1px solid rgba(139, 90, 43, 0.2);
    flex-wrap: wrap;
  }

  .detail-action-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    background: rgba(60, 40, 25, 0.4);
    border: 1px solid rgba(139, 90, 43, 0.3);
    border-radius: 8px;
    color: #a89878;
    font-size: 12px;
    transition: all 0.2s;
  }

  .detail-action-btn:hover {
    background: rgba(100, 70, 40, 0.5);
    color: #e0c890;
  }

  .detail-action-btn.favorite.favorited {
    background: rgba(255, 200, 80, 0.15);
    border-color: rgba(255, 200, 80, 0.4);
    color: #ffd060;
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
    max-width: 360px;
    width: 100%;
    animation: slideUp 0.3s ease;
  }

  .confirm-box.wide {
    max-width: 500px;
    text-align: left;
  }

  .confirm-title {
    font-size: 18px;
    color: #e0c0a0;
    margin: 0 0 16px;
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

  .btn.primary {
    background: linear-gradient(135deg, #8b5a2b, #6b4520);
    color: #f5e6d3;
    border: 1px solid rgba(200, 160, 100, 0.3);
  }

  .btn.primary:hover:not(:disabled) {
    background: linear-gradient(135deg, #a06830, #805528);
  }

  .btn.primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .form-field {
    margin-bottom: 16px;
    text-align: left;
  }

  .field-label {
    display: block;
    font-size: 12px;
    color: #a89878;
    margin-bottom: 6px;
    letter-spacing: 0.5px;
  }

  .field-input {
    width: 100%;
    padding: 10px 14px;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(139, 90, 43, 0.3);
    border-radius: 8px;
    color: #e0d0b0;
    font-size: 14px;
    font-family: inherit;
    box-sizing: border-box;
  }

  .field-input:focus {
    outline: none;
    border-color: rgba(200, 150, 80, 0.5);
  }

  .field-input.textarea {
    resize: vertical;
    min-height: 80px;
  }

  .picker-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-height: 320px;
    overflow-y: auto;
    margin-bottom: 16px;
  }

  .picker-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 14px;
    background: rgba(60, 40, 25, 0.3);
    border: 1px solid rgba(139, 90, 43, 0.2);
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .picker-item:hover {
    background: rgba(100, 70, 40, 0.4);
    border-color: rgba(200, 150, 80, 0.4);
  }

  .picker-item.selected {
    background: rgba(100, 200, 150, 0.15);
    border-color: rgba(100, 200, 150, 0.4);
  }

  .picker-cover {
    width: 48px;
    height: 64px;
    border-radius: 6px;
    overflow: hidden;
    background: #0a0503;
    flex-shrink: 0;
  }

  .picker-cover img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .picker-cover-empty {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    opacity: 0.4;
  }

  .picker-info {
    flex: 1;
    text-align: left;
  }

  .picker-name {
    font-size: 14px;
    color: #e0d0b0;
    font-weight: 500;
  }

  .picker-count {
    font-size: 11px;
    color: #8a7a5a;
    margin-top: 2px;
  }

  .picker-check {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    color: #8ad8a0;
    font-weight: bold;
  }

  .picker-item.selected .picker-check {
    background: rgba(100, 200, 150, 0.3);
  }

  .cover-picker-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
    gap: 8px;
    max-height: 320px;
    overflow-y: auto;
    margin-bottom: 16px;
  }

  .cover-picker-item {
    position: relative;
    aspect-ratio: 3 / 4;
    border-radius: 6px;
    overflow: hidden;
    border: 2px solid transparent;
    cursor: pointer;
    transition: all 0.2s;
    background: #0a0503;
  }

  .cover-picker-item:hover {
    border-color: rgba(200, 150, 80, 0.6);
    transform: scale(1.02);
  }

  .cover-picker-item img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .cover-picker-score {
    position: absolute;
    top: 4px;
    right: 4px;
    padding: 2px 6px;
    background: rgba(0, 0, 0, 0.7);
    border-radius: 8px;
    font-size: 10px;
    color: #f0d8a8;
    font-family: 'SF Mono', Monaco, monospace;
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

  .compare-badge {
    padding: 5px 12px;
    background: linear-gradient(135deg, rgba(100, 150, 200, 0.3), rgba(80, 120, 180, 0.2));
    border: 1px solid rgba(100, 150, 200, 0.4);
    border-radius: 12px;
    font-size: 11px;
    color: #8ab4d8;
    letter-spacing: 0.5px;
    animation: pulseBlue 2s ease-in-out infinite;
  }

  @keyframes pulseBlue {
    0%, 100% { box-shadow: 0 0 0 0 rgba(100, 150, 200, 0.3); }
    50% { box-shadow: 0 0 12px 0 rgba(100, 150, 200, 0.2); }
  }

  .compare-toggle-btn,
  .cancel-compare-btn,
  .compare-start-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    border-radius: 8px;
    font-size: 12px;
    transition: all 0.2s;
  }

  .compare-toggle-btn {
    background: rgba(100, 150, 200, 0.15);
    border: 1px solid rgba(100, 150, 200, 0.25);
    color: #8ab4d8;
  }

  .compare-toggle-btn:hover {
    background: rgba(100, 150, 200, 0.25);
    color: #a8c8e8;
    transform: translateY(-2px);
  }

  .cancel-compare-btn {
    background: rgba(160, 80, 80, 0.15);
    border: 1px solid rgba(200, 100, 100, 0.25);
    color: #d89080;
  }

  .cancel-compare-btn:hover {
    background: rgba(200, 80, 80, 0.25);
  }

  .compare-start-btn {
    background: linear-gradient(135deg, rgba(100, 200, 150, 0.2), rgba(80, 180, 120, 0.15));
    border: 1px solid rgba(100, 200, 150, 0.35);
    color: #8ad8a0;
  }

  .compare-start-btn:hover:not(:disabled) {
    background: linear-gradient(135deg, rgba(100, 200, 150, 0.3), rgba(80, 180, 120, 0.25));
    transform: translateY(-2px);
  }

  .compare-start-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .compare-hint {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 16px;
    margin-bottom: 16px;
    background: linear-gradient(135deg, rgba(100, 150, 200, 0.12), rgba(80, 120, 180, 0.08));
    border: 1px solid rgba(100, 150, 200, 0.25);
    border-radius: 10px;
    font-size: 12px;
    color: #a8c8e8;
    line-height: 1.6;
  }

  .hint-icon {
    font-size: 18px;
    flex-shrink: 0;
  }

  .hint-text strong {
    color: #d4a574;
    font-weight: 500;
  }

  .photo-card.compare-mode {
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .photo-card.compare-mode:hover:not(.disabled) {
    border-color: rgba(100, 150, 200, 0.5);
    transform: translateY(-2px);
  }

  .photo-card.selected {
    border-color: rgba(100, 200, 150, 0.6) !important;
    box-shadow: 0 0 0 2px rgba(100, 200, 150, 0.3), 0 8px 24px rgba(0, 0, 0, 0.5);
  }

  .photo-card.selected .photo-image {
    filter: brightness(0.85);
  }

  .photo-card.disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .compare-checkbox {
    position: absolute;
    top: 8px;
    left: 8px;
    z-index: 10;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.7);
    border: 2px solid rgba(200, 150, 80, 0.5);
    border-radius: 50%;
    transition: all 0.2s ease;
  }

  .photo-card.selected .compare-checkbox {
    background: rgba(100, 200, 150, 0.9);
    border-color: rgba(100, 200, 150, 1);
  }

  .check-icon {
    font-size: 14px;
    color: #c8b898;
    transition: all 0.2s ease;
  }

  .photo-card.selected .check-icon {
    color: #0a150a;
    font-weight: bold;
  }

  .check-number {
    position: absolute;
    bottom: -6px;
    right: -6px;
    width: 18px;
    height: 18px;
    background: linear-gradient(135deg, #8ad8a0, #60b870);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: bold;
    color: #0a150a;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
  }

  .quick-browse-modal {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.95);
    z-index: 400;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: fadeIn 0.25s ease;
  }

  .quick-browse-inner {
    position: relative;
    width: 100%;
    max-width: 900px;
    max-height: 95vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 20px;
  }

  .qb-close {
    position: absolute;
    top: 10px;
    right: 10px;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.6);
    border: 1px solid rgba(200, 150, 80, 0.3);
    color: #e0c890;
    font-size: 18px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    z-index: 10;
  }

  .qb-close:hover {
    background: rgba(160, 80, 80, 0.4);
    color: #e08080;
  }

  .qb-nav {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.6);
    border: 1px solid rgba(139, 90, 43, 0.4);
    color: #e0c890;
    font-size: 28px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    z-index: 10;
    line-height: 1;
  }

  .qb-nav:hover {
    background: rgba(139, 90, 43, 0.5);
    border-color: rgba(200, 150, 80, 0.6);
    transform: translateY(-50%) scale(1.05);
  }

  .qb-nav.prev { left: 10px; }
  .qb-nav.next { right: 10px; }

  .qb-image-wrap {
    background: #0a0503;
    border-radius: 12px;
    overflow: hidden;
    border: 1px solid rgba(139, 90, 43, 0.3);
    box-shadow: 0 12px 48px rgba(0, 0, 0, 0.7);
    max-width: 100%;
    max-height: 70vh;
    animation: frameReveal 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  @keyframes frameReveal {
    from { transform: scale(0.95); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }

  .qb-image {
    display: block;
    max-width: 100%;
    max-height: 70vh;
    object-fit: contain;
  }

  .qb-info {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    width: 100%;
    max-width: 600px;
    margin-top: 20px;
    padding: 14px 20px;
    background: rgba(26, 15, 10, 0.9);
    border: 1px solid rgba(139, 90, 43, 0.3);
    border-radius: 12px;
    flex-wrap: wrap;
  }

  .qb-info-main {
    flex: 1;
    min-width: 200px;
  }

  .qb-title {
    font-size: 16px;
    font-weight: 500;
    color: #f0d8a8;
    margin-bottom: 4px;
  }

  .qb-meta {
    display: flex;
    gap: 12px;
    font-size: 12px;
    color: #8a7a5a;
  }

  .qb-score-info {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .qb-grade {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
    font-weight: bold;
    color: #1a0f0a;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.4);
  }

  .qb-score {
    font-size: 20px;
    font-weight: bold;
    color: #f0d8a8;
    font-family: 'SF Mono', Monaco, monospace;
  }

  .qb-counter {
    margin-top: 12px;
    padding: 6px 16px;
    background: rgba(0, 0, 0, 0.5);
    border-radius: 12px;
    font-size: 13px;
    color: #a89878;
    font-family: 'SF Mono', Monaco, monospace;
  }

  .qb-actions {
    display: flex;
    gap: 10px;
    margin-top: 16px;
    flex-wrap: wrap;
    justify-content: center;
  }

  .qb-action {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 10px 20px;
    background: rgba(60, 40, 25, 0.5);
    border: 1px solid rgba(139, 90, 43, 0.35);
    border-radius: 10px;
    color: #c8b898;
    font-size: 13px;
    transition: all 0.2s;
    cursor: pointer;
  }

  .qb-action:hover {
    background: rgba(100, 70, 40, 0.6);
    transform: translateY(-1px);
  }

  .qb-action.favorited {
    background: rgba(255, 200, 80, 0.2);
    border-color: rgba(255, 200, 80, 0.5);
    color: #ffd060;
  }
</style>