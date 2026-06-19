<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { ProcessedPhoto } from '../types/game';
  import { PHOTO_SUBJECTS, FILM_STOCKS, GRADE_COLORS, GRADE_NAMES } from '../data/gameData';
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
  }>();

  let selectedPhoto: ProcessedPhoto | null = null;
  let showDeleteConfirm = false;
  let photoToDelete: string | null = null;

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

  const gradesOrder = ['S', 'A', 'B', 'C', 'D'];
</script>

<div class="album-overlay">
  <div class="album-container">
    <div class="album-header">
      <h2 class="album-title">📚 我的照片册</h2>
      <button class="close-btn" on:click={() => dispatch('close')}>
        <span>✕</span>
      </button>
    </div>

    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-value">{statistics.total}</div>
        <div class="stat-label">总作品</div>
      </div>
      <div class="stat-card highlight">
        <div class="stat-value">{statistics.avgScore}</div>
        <div class="stat-label">平均分</div>
      </div>
      <div class="stat-card gold">
        <div class="stat-value">{statistics.bestScore}</div>
        <div class="stat-label">最高分</div>
      </div>
      <div class="stat-card grades-card">
        <div class="grades-mini">
          {#each gradesOrder as g (g)}
            <div class="grade-mini-item" style="--c: {GRADE_COLORS[g]};">
              <span class="gm-letter">{g}</span>
              <span class="gm-count">{statistics.gradeCounts[g] || 0}</span>
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
    {:else}
      <div class="photos-grid">
        {#each photos as photo (photo.id)}
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
            </div>
            <div class="photo-info">
              <div class="photo-name">{getSubjectName(photo.subjectId)}</div>
              <div class="photo-meta">
                <span class="meta-film">{getFilmName(photo.filmId)}</span>
                <span class="meta-date">{formatDate(photo.timestamp)}</span>
              </div>
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
        </div>
        <div class="detail-panel-wrap">
          <ScorePanel
            photo={selectedPhoto}
            mode="view"
            on:close={() => selectedPhoto = null}
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
    max-width: 1100px;
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

  .album-title {
    font-size: 24px;
    color: #f0d8a8;
    margin: 0;
    letter-spacing: 3px;
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
  }

  .photo-name {
    font-size: 13px;
    color: #e0d0b0;
    font-weight: 500;
    margin-bottom: 4px;
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
    max-width: 900px;
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
</style>
