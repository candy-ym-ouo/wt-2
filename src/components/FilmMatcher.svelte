<script lang="ts">
  import { gameStore } from '../stores/gameStore';
  import type { DarkroomOrder, FilmMatch } from '../types/game';
  import { FILM_STOCKS } from '../data/gameData';

  export let order: DarkroomOrder | null = null;

  $: matchedFilms = order?.matchedFilms || [];
  $: selectedFilmId = order?.selectedFilmId;

  function getFilmInfo(filmId: string) {
    return FILM_STOCKS.find(f => f.id === filmId);
  }

  function getMatchGrade(score: number): { label: string; color: string } {
    if (score >= 80) return { label: '极佳', color: '#10b981' };
    if (score >= 60) return { label: '良好', color: '#3b82f6' };
    if (score >= 40) return { label: '一般', color: '#f59e0b' };
    return { label: '较差', color: '#ef4444' };
  }

  function selectFilm(filmId: string) {
    if (!order) return;
    gameStore.selectFilmForOrder(order.id, filmId);
  }

  function getFilmTypeLabel(color: string): string {
    return color === 'bw' ? '黑白' : '彩色';
  }

  function getGrainLabel(grainSize: number): string {
    if (grainSize <= 0.3) return '细腻';
    if (grainSize <= 0.6) return '中等';
    return '粗粝';
  }
</script>

<div class="film-matcher">
  <div class="panel-header">
    <h3 class="title">胶片智能匹配</h3>
    {#if order && order.selectedFilmId}
      <span class="selected-hint">已选胶片</span>
    {/if}
  </div>

  {#if !order}
    <div class="empty-state">
      <div class="empty-icon">🎞</div>
      <p>选择订单查看胶片匹配</p>
    </div>
  {:else if matchedFilms.length === 0}
    <div class="empty-state">
      <div class="empty-icon">🔍</div>
      <p>暂无匹配结果</p>
    </div>
  {:else}
    <div class="film-list">
      {#each matchedFilms as match (match.filmId)}
        {@const film = getFilmInfo(match.filmId)}
        {@const grade = getMatchGrade(match.matchScore)}
        {@const isSelected = selectedFilmId === match.filmId}

        <div
          class="film-match-card"
          class:selected={isSelected}
          class:recommended={match.isRecommended}
          on:click={() => selectFilm(match.filmId)}
        >
          <div class="film-header">
            <div class="film-color-dot" style="background: {film?.thumbnailColor || '#888'}" />
            <div class="film-info">
              <span class="film-name">{film?.name || match.filmId}</span>
              <span class="film-type">{getFilmTypeLabel(film?.color || 'bw')} · ISO {film?.iso} · {getGrainLabel(film?.grainSize || 0.5)}颗粒</span>
            </div>
            <div class="match-score" style="color: {grade.color}">
              <span class="score-value">{match.matchScore}</span>
              <span class="score-label">分</span>
            </div>
          </div>

          <div class="match-reasons">
            {#each match.matchReasons as reason}
              <span class="reason-tag">{reason}</span>
            {/each}
          </div>

          <div class="match-footer">
            {#if match.isRecommended}
              <span class="recommend-badge">✨ 推荐</span>
            {/if}
            {#if isSelected}
              <span class="selected-badge">✓ 已选择</span>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .film-matcher {
    background: linear-gradient(180deg, rgba(45, 26, 18, 0.5) 0%, rgba(20, 12, 8, 0.6) 100%);
    border: 1px solid rgba(139, 90, 43, 0.2);
    border-radius: 16px;
    padding: 16px;
    backdrop-filter: blur(6px);
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 14px;
    padding-bottom: 10px;
    border-bottom: 1px solid rgba(139, 90, 43, 0.2);
  }

  .title {
    font-size: 15px;
    font-weight: 600;
    color: #e8c890;
    margin: 0;
    letter-spacing: 1px;
  }

  .selected-hint {
    font-size: 11px;
    color: #10b981;
    background: rgba(16, 185, 129, 0.15);
    padding: 3px 10px;
    border-radius: 10px;
  }

  .film-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
    max-height: 400px;
    overflow-y: auto;
  }

  .film-list::-webkit-scrollbar {
    width: 6px;
  }

  .film-list::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 3px;
  }

  .film-list::-webkit-scrollbar-thumb {
    background: rgba(139, 90, 43, 0.4);
    border-radius: 3px;
  }

  .film-match-card {
    background: rgba(0, 0, 0, 0.25);
    border: 1px solid rgba(139, 90, 43, 0.2);
    border-radius: 12px;
    padding: 12px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .film-match-card:hover {
    border-color: rgba(200, 150, 80, 0.4);
    background: rgba(0, 0, 0, 0.35);
    transform: translateX(2px);
  }

  .film-match-card.selected {
    border-color: rgba(16, 185, 129, 0.6);
    background: rgba(16, 185, 129, 0.1);
    box-shadow: 0 0 0 1px rgba(16, 185, 129, 0.3);
  }

  .film-match-card.recommended {
    border-color: rgba(200, 150, 80, 0.3);
  }

  .film-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 8px;
  }

  .film-color-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    flex-shrink: 0;
    box-shadow: 0 0 6px rgba(0, 0, 0, 0.3);
  }

  .film-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .film-name {
    font-size: 13px;
    font-weight: 500;
    color: #e8c890;
  }

  .film-type {
    font-size: 11px;
    color: #8a7a5a;
  }

  .match-score {
    display: flex;
    align-items: baseline;
    gap: 2px;
  }

  .score-value {
    font-size: 20px;
    font-weight: 700;
    font-family: monospace;
  }

  .score-label {
    font-size: 10px;
    opacity: 0.8;
  }

  .match-reasons {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-bottom: 8px;
  }

  .reason-tag {
    font-size: 10px;
    padding: 2px 8px;
    background: rgba(139, 90, 43, 0.2);
    color: #a89878;
    border-radius: 6px;
  }

  .match-footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding-top: 8px;
    border-top: 1px solid rgba(139, 90, 43, 0.15);
  }

  .recommend-badge {
    font-size: 10px;
    color: #f59e0b;
    background: rgba(245, 158, 11, 0.15);
    padding: 2px 8px;
    border-radius: 8px;
  }

  .selected-badge {
    font-size: 10px;
    color: #10b981;
    font-weight: 500;
  }

  .empty-state {
    text-align: center;
    padding: 30px 20px;
    color: #6a5a45;
  }

  .empty-icon {
    font-size: 40px;
    margin-bottom: 10px;
    opacity: 0.5;
  }

  .empty-state p {
    margin: 4px 0;
    font-size: 12px;
  }
</style>
