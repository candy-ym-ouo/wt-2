<script lang="ts">
  import type { FilmStock } from '../types/game';
  import { FILM_STOCKS } from '../data/gameData';

  export let selectedId: string = FILM_STOCKS[0].id;

  $: selectedFilm = FILM_STOCKS.find(f => f.id === selectedId);

  function selectFilm(id: string) {
    selectedId = id;
    const event = new CustomEvent('selectFilm', { detail: id });
    document.dispatchEvent(event);
  }
</script>

<div class="film-list" id="film-list">
  <div class="list-header">
    <h3 class="title">胶片类型</h3>
  </div>

  <div class="films-row">
    {#each FILM_STOCKS as film (film.id)}
      <button
        class="film-card"
        class:selected={selectedId === film.id}
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
        </div>
        {#if selectedId === film.id}
          <div class="film-glow" />
        {/if}
      </button>
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

  .film-tags {
    display: flex;
    gap: 3px;
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
</style>
