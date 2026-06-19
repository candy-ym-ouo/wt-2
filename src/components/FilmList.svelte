<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { FilmStock } from '../types/game';
  import { FILM_STOCKS, PHOTO_SUBJECTS } from '../data/gameData';
  import { gameStore } from '../stores/gameStore';
  import { getFilmRecommendations } from '../utils/recommendation';
  import type { Recommendation } from '../utils/recommendation';

  export let selectedId: string = FILM_STOCKS[0].id;

  let showRecReasons: string | null = null;
  let recommendedFilmIds: string[] = [];

  $: selectedFilm = FILM_STOCKS.find(f => f.id === selectedId);
  $: recMap = buildFilmRecMap($gameStore.processedPhotos, $gameStore.currentSubject?.id ?? null);

  function handleRecommendFilms(e: Event) {
    const ce = e as CustomEvent<string[]>;
    recommendedFilmIds = ce.detail;
    if (recommendedFilmIds.length > 0 && !recommendedFilmIds.includes(selectedId)) {
      selectedId = recommendedFilmIds[0];
      const selectEvent = new CustomEvent('selectFilm', { detail: selectedId });
      document.dispatchEvent(selectEvent);
    }
  }

  function isRecommended(filmId: string): boolean {
    return recommendedFilmIds.includes(filmId);
  }

  function buildFilmRecMap(photos: any[], subjectId: string | null): Map<string, Recommendation> {
    const recs = getFilmRecommendations(photos, PHOTO_SUBJECTS, FILM_STOCKS, subjectId);
    const map = new Map<string, Recommendation>();
    for (const r of recs) {
      map.set(r.id, r);
    }
    return map;
  }

  onMount(() => {
    document.addEventListener('recommendFilms', handleRecommendFilms);
  });

  onDestroy(() => {
    document.removeEventListener('recommendFilms', handleRecommendFilms);
  });

  function getRecLabel(score: number): string {
    if (score >= 0.85) return '强烈推荐';
    if (score >= 0.6) return '推荐';
    if (score >= 0.35) return '值得尝试';
    return '';
  }

  function getRecClass(score: number): string {
    if (score >= 0.85) return 'rec-strong';
    if (score >= 0.6) return 'rec-good';
    if (score >= 0.35) return 'rec-mild';
    return '';
  }

  function selectFilm(id: string) {
    selectedId = id;
    const event = new CustomEvent('selectFilm', { detail: id });
    document.dispatchEvent(event);
  }

  function toggleRecReasons(id: string) {
    showRecReasons = showRecReasons === id ? null : id;
  }
</script>

<div class="film-list" id="film-list">
  <div class="list-header">
    <h3 class="title">胶片类型</h3>
  </div>

  <div class="films-row">
    {#each FILM_STOCKS as film (film.id)}
      {@const rec = recMap.get(film.id)}
      <div class="film-card-wrapper">
        <button
          class="film-card"
          class:selected={selectedId === film.id}
          class:recommended={isRecommended(film.id)}
          on:click={() => selectFilm(film.id)}
          title="{film.name} - {film.description}"
        >
          <div class="film-strip">
            <div class="film-color" style="background: {film.thumbnailColor};" />
            <div class="film-holes">
              {#each Array(4) as _, i (i)}
                <div class="hole" />
              {/each}
            </div>
            <div class="film-holes bottom">
              {#each Array(4) as _, i (i)}
                <div class="hole" />
              {/each}
            </div>
          </div>
          <div class="film-info">
            <div class="film-name">{film.name}</div>
            <div class="film-tags">
              <span class="tag iso">ISO {film.iso}</span>
              <span class="tag type" class:bw={film.color === 'bw'}>
                {film.color === 'bw' ? '黑白' : '彩色'}
              </span>
            </div>
            <div class="film-badges">
              {#if isRecommended(film.id)}
                <span class="subject-rec-badge" title="当前题材推荐">✓ 推荐</span>
              {/if}
              {#if rec && getRecLabel(rec.score)}
                <span class="rec-badge {getRecClass(rec.score)}" on:click|stopPropagation={() => toggleRecReasons(film.id)}>
                  {getRecLabel(rec.score)}
                </span>
              {/if}
            </div>
          </div>
          {#if selectedId === film.id}
            <div class="film-glow" />
          {/if}
          {#if isRecommended(film.id) && selectedId !== film.id}
            <div class="recommended-indicator" title="当前题材推荐">☆</div>
          {/if}
        </button>
        {#if rec && showRecReasons === film.id && rec.reasons.length > 0}
          <div class="rec-reasons">
            {#each rec.reasons as reason}
              <div class="rec-reason-item">• {reason}</div>
            {/each}
          </div>
        {/if}
      </div>
    {/each}
  </div>

  {#if selectedFilm}
    <div class="film-detail">
      <p class="detail-text">{selectedFilm.description}</p>
      <div class="detail-stats">
        <div class="stat">
          <span class="stat-label">基础反差</span>
          <div class="stat-bar"><div class="stat-fill contrast" style="width: {selectedFilm.baseContrast * 100}%" /></div>
        </div>
        <div class="stat">
          <span class="stat-label">颗粒感</span>
          <div class="stat-bar"><div class="stat-fill grain" style="width: {selectedFilm.grainSize * 100}%" /></div>
        </div>
        {#if selectedFilm.color === 'color'}
          <div class="stat">
            <span class="stat-label">饱和度</span>
            <div class="stat-bar"><div class="stat-fill sat" style="width: {selectedFilm.baseSaturation * 100}%" /></div>
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .film-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .list-header {
    padding-bottom: 10px;
    border-bottom: 1px solid rgba(139, 90, 43, 0.2);
  }

  .title {
    font-size: 16px;
    font-weight: 600;
    color: #d4a574;
    margin: 0;
    letter-spacing: 2px;
  }

  .films-row {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }

  .film-card-wrapper {
    display: flex;
    flex-direction: column;
  }

  .film-card {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 12px 6px;
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(139, 90, 43, 0.15);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    overflow: hidden;
    width: 100%;
  }

  .film-card:hover {
    background: rgba(30, 20, 12, 0.5);
    border-color: rgba(139, 90, 43, 0.35);
    transform: translateY(-2px);
  }

  .film-card.selected {
    background: rgba(139, 90, 43, 0.15);
    border-color: rgba(200, 150, 80, 0.5);
  }

  .film-card.recommended {
    border-color: rgba(100, 180, 100, 0.4);
    background: rgba(60, 120, 60, 0.1);
  }

  .film-card.recommended:hover {
    border-color: rgba(100, 180, 100, 0.6);
    background: rgba(60, 120, 60, 0.15);
  }

  .film-strip {
    position: relative;
    width: 52px;
    height: 60px;
    background: #1a1a1a;
    border-radius: 2px;
    padding: 8px 0;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
  }

  .film-color {
    margin: 0 auto;
    width: 34px;
    height: 44px;
    border-radius: 1px;
  }

  .film-holes {
    position: absolute;
    top: 4px;
    left: 3px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .film-holes.bottom {
    left: auto;
    right: 3px;
  }

  .hole {
    width: 5px;
    height: 7px;
    background: #0a0503;
    border-radius: 1px;
  }

  .film-info {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    width: 100%;
  }

  .film-name {
    font-size: 10px;
    color: #c8b898;
    font-weight: 500;
    text-align: center;
    line-height: 1.3;
    max-width: 100%;
    word-break: break-word;
  }

  .film-card.selected .film-name {
    color: #f0d8a8;
  }

  .film-card.recommended .film-name {
    color: #a8d8a8;
  }

  .film-tags {
    display: flex;
    gap: 3px;
  }

  .film-badges {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    margin-top: 2px;
  }

  .subject-rec-badge {
    font-size: 8px;
    padding: 1px 5px;
    border-radius: 4px;
    background: rgba(100, 180, 100, 0.2);
    color: #8bc88b;
    border: 1px solid rgba(100, 180, 100, 0.3);
    font-weight: 600;
    letter-spacing: 0.3px;
    line-height: 1.4;
  }

  .recommended-indicator {
    position: absolute;
    top: 4px;
    right: 4px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: rgba(100, 180, 100, 0.2);
    color: #8bc88b;
    font-size: 10px;
    font-weight: bold;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid rgba(100, 180, 100, 0.3);
    animation: pulse 2s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 0.6; transform: scale(1); }
    50% { opacity: 1; transform: scale(1.1); }
  }

  .tag {
    font-size: 8px;
    padding: 1px 5px;
    border-radius: 3px;
    letter-spacing: 0.5px;
  }

  .tag.iso {
    background: rgba(139, 90, 43, 0.25);
    color: #c8a878;
  }

  .tag.type {
    background: rgba(160, 100, 60, 0.25);
    color: #e0a070;
  }

  .tag.type.bw {
    background: rgba(100, 100, 100, 0.25);
    color: #c0c0c0;
  }

  .film-glow {
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at top, rgba(200, 150, 80, 0.15) 0%, transparent 70%);
    pointer-events: none;
  }

  .film-detail {
    padding: 12px;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 8px;
    border: 1px solid rgba(139, 90, 43, 0.15);
  }

  .detail-text {
    font-size: 12px;
    color: #a89878;
    line-height: 1.6;
    margin: 0 0 10px;
  }

  .detail-stats {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .stat {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .stat-label {
    font-size: 11px;
    color: #7a6a55;
    width: 50px;
    letter-spacing: 0.5px;
  }

  .stat-bar {
    flex: 1;
    height: 5px;
    background: rgba(60, 50, 40, 0.5);
    border-radius: 3px;
    overflow: hidden;
  }

  .stat-fill {
    height: 100%;
    border-radius: 3px;
    transition: width 0.3s ease;
  }

  .stat-fill.contrast { background: linear-gradient(90deg, #8b5a2b, #c8a878); }
  .stat-fill.grain { background: linear-gradient(90deg, #5a5a5a, #9a9a9a); }
  .stat-fill.sat { background: linear-gradient(90deg, #8b2a5a, #e05090); }

  .rec-badge {
    font-size: 8px;
    padding: 1px 6px;
    border-radius: 6px;
    letter-spacing: 0.3px;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.2s ease;
    line-height: 1.5;
    margin-top: 2px;
  }

  .rec-badge.rec-strong {
    background: linear-gradient(135deg, rgba(255, 215, 0, 0.25), rgba(200, 150, 80, 0.2));
    color: #ffd700;
    border: 1px solid rgba(255, 215, 0, 0.3);
  }

  .rec-badge.rec-good {
    background: rgba(100, 180, 100, 0.15);
    color: #8bc88b;
    border: 1px solid rgba(100, 180, 100, 0.25);
  }

  .rec-badge.rec-mild {
    background: rgba(120, 160, 200, 0.12);
    color: #8aaccc;
    border: 1px solid rgba(120, 160, 200, 0.2);
  }

  .rec-badge:hover {
    transform: scale(1.05);
  }

  .rec-reasons {
    margin-top: 2px;
    padding: 6px 10px 6px 12px;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(139, 90, 43, 0.15);
    border-radius: 0 0 8px 8px;
    animation: slideDown 0.2s ease;
  }

  @keyframes slideDown {
    from { opacity: 0; max-height: 0; }
    to { opacity: 1; max-height: 100px; }
  }

  .rec-reason-item {
    font-size: 10px;
    color: #a89878;
    line-height: 1.5;
    padding: 1px 0;
  }
</style>
