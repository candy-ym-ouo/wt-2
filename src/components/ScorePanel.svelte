<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { ScoreDetail, ProcessedPhoto, PhotoSubject, FilmStock } from '../types/game';
  import { GRADE_COLORS, GRADE_NAMES, PHOTO_SUBJECTS, FILM_STOCKS } from '../data/gameData';

  export let photo: ProcessedPhoto;
  export let mode: 'result' | 'view' = 'result';

  const dispatch = createEventDispatcher<{
    newPhoto: void;
    openAlbum: void;
    close: void;
  }>();

  const details = photo.details;
  const subject = PHOTO_SUBJECTS.find(s => s.id === photo.subjectId) as PhotoSubject;
  const film = FILM_STOCKS.find(f => f.id === photo.filmId) as FilmStock;

  const scoreBars: { key: keyof ScoreDetail; label: string; icon: string; score: number }[] = [
    { key: 'exposure', label: '曝光控制', icon: '☀', score: details.exposure },
    { key: 'contrast', label: '层次反差', icon: '◐', score: details.contrast },
    ...(film.color === 'color'
      ? [{ key: 'color' as const, label: '色彩还原', icon: '🎨', score: details.color }]
      : []),
    { key: 'detail', label: '细节质感', icon: '✨', score: details.detail }
  ];

  const barColor = (s: number) => {
    if (s >= 85) return 'linear-gradient(90deg, #ffd700, #ffaa00)';
    if (s >= 70) return 'linear-gradient(90deg, #c8a878, #a07848)';
    if (s >= 60) return 'linear-gradient(90deg, #88a0c8, #6888a8)';
    return 'linear-gradient(90deg, #a88888, #886868)';
  };

  $: formattedDate = new Date(photo.timestamp).toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
</script>

<div class="result-panel" class:modal={mode === 'view'}>
  <div class="result-header">
    {#if mode === 'view'}
      <button class="close-btn" on:click={() => dispatch('close')}>✕</button>
    {/if}
    <h2 class="result-title">{mode === 'result' ? '冲洗完成！' : '作品详情'}</h2>
  </div>

  <div class="grade-section">
    <div
      class="grade-circle"
      style="--grade-color: {GRADE_COLORS[details.grade]}; box-shadow: 0 0 40px {GRADE_COLORS[details.grade]}40;"
    >
      <span class="grade-letter">{details.grade}</span>
      <span class="grade-name">{GRADE_NAMES[details.grade]}</span>
    </div>
    <div class="score-info">
      <div class="overall-score">
        <span class="score-value">{details.overall}</span>
        <span class="score-max">/100</span>
      </div>
      <div class="meta-row">
        <span class="meta-pill">📷 {subject?.name || '未知题材'}</span>
        <span class="meta-pill">🎞 {film?.name || '未知胶片'}</span>
        <span class="meta-pill">📅 {formattedDate}</span>
      </div>
    </div>
  </div>

  <div class="score-breakdown">
    <h3 class="section-title">评分详情</h3>
    <div class="bars-list">
      {#each scoreBars as bar (bar.key)}
        <div class="score-bar-row">
          <div class="bar-info">
            <span class="bar-icon">{bar.icon}</span>
            <span class="bar-label">{bar.label}</span>
          </div>
          <div class="bar-track">
            <div
              class="bar-fill"
              style="width: {bar.score}%; background: {barColor(bar.score)};"
            />
          </div>
          <span class="bar-score">{bar.score}</span>
        </div>
      {/each}
    </div>
  </div>

  <div class="feedback-section">
    <h3 class="section-title">📝 技术分析</h3>
    <ul class="feedback-list">
      {#each details.feedback as msg (msg)}
        <li class="feedback-item">
          <span class="feedback-bullet">▸</span>
          <span>{msg}</span>
        </li>
      {/each}
    </ul>
  </div>

  <div class="params-section">
    <h3 class="section-title">⚙ 使用参数</h3>
    <div class="params-grid">
      <div class="param-tag">曝光 {Math.round(photo.params.exposure * 100)}</div>
      <div class="param-tag">反差 {Math.round(photo.params.contrast * 100)}</div>
      <div class="param-tag">时间 {Math.round(photo.params.developmentTime * 100)}</div>
      <div class="param-tag">温度 {Math.round(photo.params.temperature * 100)}</div>
      {#if film.color === 'color'}
        <div class="param-tag">饱和 {Math.round(photo.params.saturation * 100)}</div>
      {/if}
      <div class="param-tag">搅动 {Math.round(photo.params.agitation * 100)}</div>
    </div>
  </div>

  {#if mode === 'result'}
    <div class="result-actions">
      <button class="action-btn primary" on:click={() => dispatch('newPhoto')}>
        <span>🎬</span> 继续创作
      </button>
      <button class="action-btn secondary" on:click={() => dispatch('openAlbum')}>
        <span>📚</span> 查看相册
      </button>
    </div>
  {/if}
</div>

<style>
  .result-panel {
    background: linear-gradient(180deg, rgba(45, 26, 18, 0.95) 0%, rgba(26, 15, 10, 0.98) 100%);
    border: 1px solid rgba(139, 90, 43, 0.3);
    border-radius: 16px;
    padding: 24px;
    backdrop-filter: blur(10px);
  }

  .result-panel.modal {
    max-height: 80vh;
    overflow-y: auto;
  }

  .result-header {
    position: relative;
    margin-bottom: 20px;
    text-align: center;
  }

  .close-btn {
    position: absolute;
    top: -8px;
    right: -8px;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: rgba(139, 90, 43, 0.2);
    color: #a89878;
    font-size: 14px;
    transition: all 0.2s;
  }

  .close-btn:hover {
    background: rgba(160, 80, 80, 0.3);
    color: #e08080;
  }

  .result-title {
    font-size: 22px;
    font-weight: 600;
    color: #f0d8a8;
    margin: 0;
    letter-spacing: 4px;
  }

  .grade-section {
    display: flex;
    align-items: center;
    gap: 24px;
    padding: 20px;
    background: rgba(0, 0, 0, 0.25);
    border-radius: 12px;
    margin-bottom: 20px;
  }

  .grade-circle {
    width: 100px;
    height: 100px;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.4);
    border: 3px solid var(--grade-color);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .grade-letter {
    font-size: 42px;
    font-weight: bold;
    color: var(--grade-color);
    line-height: 1;
    text-shadow: 0 0 20px var(--grade-color);
  }

  .grade-name {
    font-size: 10px;
    color: var(--grade-color);
    letter-spacing: 2px;
    margin-top: 2px;
    opacity: 0.9;
  }

  .score-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .overall-score {
    display: flex;
    align-items: baseline;
    gap: 4px;
  }

  .score-value {
    font-size: 48px;
    font-weight: bold;
    color: #f0d8a8;
    line-height: 1;
    font-family: 'SF Mono', Monaco, monospace;
  }

  .score-max {
    font-size: 18px;
    color: #6a5a45;
  }

  .meta-row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .meta-pill {
    font-size: 11px;
    padding: 4px 10px;
    background: rgba(139, 90, 43, 0.15);
    color: #b8a878;
    border-radius: 12px;
    border: 1px solid rgba(139, 90, 43, 0.2);
  }

  .section-title {
    font-size: 13px;
    color: #d4a574;
    margin: 0 0 12px;
    letter-spacing: 2px;
    font-weight: 600;
  }

  .score-breakdown {
    margin-bottom: 20px;
  }

  .bars-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .score-bar-row {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .bar-info {
    display: flex;
    align-items: center;
    gap: 6px;
    width: 90px;
    flex-shrink: 0;
  }

  .bar-icon {
    font-size: 14px;
    opacity: 0.8;
  }

  .bar-label {
    font-size: 12px;
    color: #a89878;
  }

  .bar-track {
    flex: 1;
    height: 8px;
    background: rgba(60, 50, 40, 0.5);
    border-radius: 4px;
    overflow: hidden;
  }

  .bar-fill {
    height: 100%;
    border-radius: 4px;
    transition: width 0.8s ease-out;
  }

  .bar-score {
    width: 32px;
    text-align: right;
    font-size: 13px;
    font-weight: 600;
    color: #c8b898;
    font-family: 'SF Mono', Monaco, monospace;
  }

  .feedback-section {
    margin-bottom: 20px;
    padding: 14px 16px;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 10px;
    border-left: 3px solid rgba(200, 150, 80, 0.4);
  }

  .feedback-list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .feedback-item {
    display: flex;
    gap: 8px;
    font-size: 12px;
    color: #b8a888;
    line-height: 1.6;
  }

  .feedback-bullet {
    color: #c89860;
    flex-shrink: 0;
  }

  .params-section {
    margin-bottom: 20px;
  }

  .params-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .param-tag {
    font-size: 11px;
    padding: 5px 12px;
    background: rgba(139, 90, 43, 0.12);
    color: #b8a878;
    border-radius: 14px;
    border: 1px solid rgba(139, 90, 43, 0.2);
    font-family: 'SF Mono', Monaco, monospace;
  }

  .result-actions {
    display: flex;
    gap: 12px;
    padding-top: 8px;
    border-top: 1px solid rgba(139, 90, 43, 0.2);
  }

  .action-btn {
    flex: 1;
    padding: 14px 18px;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 500;
    letter-spacing: 1px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: all 0.2s ease;
  }

  .action-btn.primary {
    background: linear-gradient(135deg, #8b5a2b 0%, #6b4520 100%);
    color: #f5e6d3;
    border: 1px solid rgba(200, 160, 100, 0.3);
  }

  .action-btn.primary:hover {
    background: linear-gradient(135deg, #a06830 0%, #805528 100%);
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(139, 90, 43, 0.4);
  }

  .action-btn.secondary {
    background: rgba(100, 100, 100, 0.15);
    color: #c8b898;
    border: 1px solid rgba(100, 100, 100, 0.3);
  }

  .action-btn.secondary:hover {
    background: rgba(120, 120, 120, 0.25);
  }
</style>
