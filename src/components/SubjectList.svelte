<script lang="ts">
  import type { PhotoSubject } from '../types/game';
  import { PHOTO_SUBJECTS, FILM_STOCKS, DIFFICULTY_LABELS, TARGET_STYLE_LABELS, TARGET_STYLE_ICONS } from '../data/gameData';
  import { gameStore } from '../stores/gameStore';
  import { getSubjectRecommendations } from '../utils/recommendation';
  import type { Recommendation } from '../utils/recommendation';

  export let selectedId: string | null = null;

  let showRecReasons: string | null = null;

  $: recMap = buildRecMap($gameStore.processedPhotos);
  $: selectedSubject = PHOTO_SUBJECTS.find(s => s.id === selectedId);

  function buildRecMap(photos: any[]): Map<string, Recommendation> {
    const recs = getSubjectRecommendations(photos, PHOTO_SUBJECTS, []);
    const map = new Map<string, Recommendation>();
    for (const r of recs) {
      map.set(r.id, r);
    }
    return map;
  }

  const sceneIcons: Record<string, string> = {
    portrait: '👤',
    landscape: '🏔',
    street: '🏙',
    still_life: '🫖',
    night: '🌃'
  };

  const sceneNames: Record<string, string> = {
    portrait: '人像',
    landscape: '风光',
    street: '街头',
    still_life: '静物',
    night: '夜景'
  };

  function getDifficultyStars(difficulty: number): string {
    return '★'.repeat(difficulty) + '☆'.repeat(5 - difficulty);
  }

  function getDifficultyClass(difficulty: number): string {
    if (difficulty <= 2) return 'diff-easy';
    if (difficulty === 3) return 'diff-medium';
    if (difficulty === 4) return 'diff-hard';
    return 'diff-master';
  }

  function getFilmName(filmId: string): string {
    const film = FILM_STOCKS.find(f => f.id === filmId);
    return film?.name.split(' ').pop() || filmId;
  }

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

  function selectSubject(id: string) {
    selectedId = id;
    const subject = PHOTO_SUBJECTS.find(s => s.id === id);
    if (subject && subject.recommendedFilms.length > 0) {
      const event = new CustomEvent('recommendFilms', { detail: subject.recommendedFilms });
      document.dispatchEvent(event);
    }
    const event = new CustomEvent('select', { detail: id });
    document.dispatchEvent(event);
  }

  function toggleRecReasons(id: string) {
    showRecReasons = showRecReasons === id ? null : id;
  }
</script>

<div class="subject-list" id="subject-list">
  <div class="list-header">
    <h3 class="title">拍摄题材</h3>
    <span class="count">{PHOTO_SUBJECTS.length} 组</span>
  </div>

  <div class="subjects-grid">
    {#each PHOTO_SUBJECTS as subject (subject.id)}
      {@const rec = recMap.get(subject.id)}
      <div class="subject-card-wrapper">
        <button
          class="subject-card"
          class:selected={selectedId === subject.id}
          on:click={() => selectSubject(subject.id)}
        >
          <div class="card-thumb" style="background: {getThumbGradient(subject)};">
            <span class="thumb-icon">{sceneIcons[subject.sceneType]}</span>
            <span class="scene-tag">{sceneNames[subject.sceneType]}</span>
          </div>
          <div class="card-info">
            <div class="card-name-row">
              <h4 class="card-name">{subject.name}</h4>
              {#if rec && getRecLabel(rec.score)}
                <span class="rec-badge {getRecClass(rec.score)}" on:click|stopPropagation={() => toggleRecReasons(subject.id)}>
                  {getRecLabel(rec.score)}
                </span>
              {/if}
            </div>
            <div class="card-tags-row">
              <span class="difficulty-badge {getDifficultyClass(subject.difficulty)}" title="难度：{DIFFICULTY_LABELS[subject.difficulty]}">
                <span class="diff-stars">{getDifficultyStars(subject.difficulty)}</span>
                <span class="diff-label">{DIFFICULTY_LABELS[subject.difficulty]}</span>
              </span>
              <span class="style-badge" title="目标风格：{TARGET_STYLE_LABELS[subject.targetStyle]}">
                <span class="style-icon">{TARGET_STYLE_ICONS[subject.targetStyle]}</span>
                <span class="style-label">{TARGET_STYLE_LABELS[subject.targetStyle]}</span>
              </span>
              {#if subject.scoreMultiplier > 1.0}
                <span class="multiplier-badge">×{subject.scoreMultiplier.toFixed(2)}</span>
              {/if}
            </div>
            <p class="card-desc">{subject.description}</p>
            <div class="recommended-films">
              <span class="rec-films-label">推荐胶片：</span>
              {#each subject.recommendedFilms as filmId}
                <span class="rec-film-tag">{getFilmName(filmId)}</span>
              {/each}
            </div>
            <div class="card-meta">
              <div class="meta-item">
                <span class="meta-label">曝光</span>
                <div class="meta-bar">
                  <div class="meta-fill" style="width: {subject.idealExposure * 100}%; background: #d4a574;" />
                </div>
              </div>
              <div class="meta-item">
                <span class="meta-label">反差</span>
                <div class="meta-bar">
                  <div class="meta-fill" style="width: {subject.idealContrast * 100}%; background: #8bb0c8;" />
                </div>
              </div>
            </div>
          </div>
          {#if selectedId === subject.id}
            <div class="selected-indicator">✓</div>
          {/if}
        </button>
        {#if rec && showRecReasons === subject.id && rec.reasons.length > 0}
          <div class="rec-reasons">
            {#each rec.reasons as reason}
              <div class="rec-reason-item">• {reason}</div>
            {/each}
          </div>
        {/if}
      </div>
    {/each}
  </div>
</div>

<style>
  .subject-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .list-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
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

  .count {
    font-size: 12px;
    color: #7a6a55;
    background: rgba(139, 90, 43, 0.1);
    padding: 3px 10px;
    border-radius: 10px;
  }

  .subjects-grid {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .subject-card-wrapper {
    display: flex;
    flex-direction: column;
  }

  .subject-card {
    position: relative;
    display: flex;
    gap: 12px;
    padding: 12px;
    background: rgba(0, 0, 0, 0.25);
    border: 1px solid rgba(139, 90, 43, 0.15);
    border-radius: 10px;
    text-align: left;
    cursor: pointer;
    transition: all 0.2s ease;
    overflow: hidden;
    width: 100%;
  }

  .subject-card:hover {
    background: rgba(30, 20, 12, 0.5);
    border-color: rgba(139, 90, 43, 0.4);
    transform: translateX(2px);
  }

  .subject-card.selected {
    background: linear-gradient(135deg, rgba(139, 90, 43, 0.2) 0%, rgba(90, 55, 25, 0.3) 100%);
    border-color: rgba(200, 150, 80, 0.5);
    box-shadow: 0 0 0 1px rgba(200, 150, 80, 0.2), 0 4px 16px rgba(0, 0, 0, 0.3);
  }

  .card-thumb {
    position: relative;
    width: 72px;
    height: 72px;
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    overflow: hidden;
  }

  .thumb-icon {
    font-size: 28px;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5));
  }

  .scene-tag {
    position: absolute;
    bottom: 4px;
    font-size: 9px;
    color: rgba(255, 255, 255, 0.85);
    background: rgba(0, 0, 0, 0.4);
    padding: 2px 6px;
    border-radius: 4px;
    letter-spacing: 1px;
  }

  .card-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .card-name-row {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .card-name {
    font-size: 14px;
    font-weight: 600;
    color: #e0cfa8;
    margin: 0;
    letter-spacing: 0.5px;
  }

  .subject-card.selected .card-name {
    color: #f0d8a8;
  }

  .rec-badge {
    font-size: 9px;
    padding: 2px 7px;
    border-radius: 8px;
    letter-spacing: 0.5px;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.2s ease;
    line-height: 1.4;
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
    padding: 8px 12px 8px 16px;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(139, 90, 43, 0.15);
    border-radius: 0 0 10px 10px;
    animation: slideDown 0.2s ease;
  }

  @keyframes slideDown {
    from { opacity: 0; max-height: 0; }
    to { opacity: 1; max-height: 120px; }
  }

  .rec-reason-item {
    font-size: 11px;
    color: #a89878;
    line-height: 1.6;
    padding: 2px 0;
  }

  .card-tags-row {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-bottom: 4px;
  }

  .difficulty-badge {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.3px;
  }

  .diff-easy {
    background: rgba(100, 180, 100, 0.15);
    color: #8bc88b;
  }

  .diff-medium {
    background: rgba(200, 160, 80, 0.15);
    color: #e0b060;
  }

  .diff-hard {
    background: rgba(200, 100, 60, 0.15);
    color: #e08060;
  }

  .diff-master {
    background: rgba(200, 60, 60, 0.15);
    color: #e06060;
  }

  .diff-stars {
    font-size: 8px;
    letter-spacing: -1px;
  }

  .style-badge {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    padding: 2px 6px;
    border-radius: 4px;
    background: rgba(160, 120, 180, 0.15);
    color: #c0a0d0;
    font-size: 9px;
    font-weight: 500;
  }

  .style-icon {
    font-size: 10px;
  }

  .multiplier-badge {
    padding: 2px 6px;
    border-radius: 4px;
    background: rgba(255, 215, 0, 0.15);
    color: #ffd700;
    font-size: 9px;
    font-weight: 600;
  }

  .recommended-films {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px;
    font-size: 10px;
    color: #7a6a55;
    margin-bottom: 6px;
  }

  .rec-films-label {
    color: #6a5a45;
  }

  .rec-film-tag {
    padding: 1px 5px;
    border-radius: 3px;
    background: rgba(139, 90, 43, 0.15);
    color: #c8a878;
    font-size: 9px;
    font-weight: 500;
  }

  .card-desc {
    font-size: 11px;
    color: #8a7a60;
    margin: 0;
    line-height: 1.5;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .card-meta {
    display: flex;
    gap: 12px;
    margin-top: auto;
  }

  .meta-item {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .meta-label {
    font-size: 10px;
    color: #6a5a45;
    width: 24px;
    letter-spacing: 0.5px;
  }

  .meta-bar {
    flex: 1;
    height: 4px;
    background: rgba(60, 50, 40, 0.6);
    border-radius: 2px;
    overflow: hidden;
  }

  .meta-fill {
    height: 100%;
    border-radius: 2px;
    transition: width 0.3s ease;
  }

  .selected-indicator {
    position: absolute;
    top: 8px;
    right: 8px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: linear-gradient(135deg, #d4a574, #a07848);
    color: #1a0f0a;
    font-size: 12px;
    font-weight: bold;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 8px rgba(200, 150, 80, 0.4);
  }
</style>

<script lang="ts" context="module">
  function getThumbGradient(subject: PhotoSubject): string {
    const gradients: Record<string, string[]> = {
      portrait: ['linear-gradient(135deg, #c9a87c 0%, #8b6914 50%, #4a3520 100%)'],
      landscape: ['linear-gradient(135deg, #5a8aa8 0%, #3a6850 50%, #1a3a2a 100%)'],
      street: ['linear-gradient(135deg, #6a5a4a 0%, #4a3528 50%, #2a1a15 100%)'],
      still_life: ['linear-gradient(135deg, #d4b080 0%, #a07850 50%, #604020 100%)'],
      night: ['linear-gradient(135deg, #1a1a4a 0%, #2a1a4a 50%, #0a0a1a 100%)']
    };
    return gradients[subject.sceneType]?.[0] || gradients.street[0];
  }
</script>
