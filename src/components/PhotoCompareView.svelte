<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { ProcessedPhoto, PhotoSubject, FilmStock, ParamDiff, ScoreDiff, BestRecommendation } from '../types/game';
  import { PHOTO_SUBJECTS, FILM_STOCKS, GRADE_COLORS, GRADE_NAMES } from '../data/gameData';
  import { calculateParamDiffs, calculateScoreDiffs, getBestRecommendation, formatParamValue, PARAM_ICONS } from '../utils/compareUtils';

  export let photos: ProcessedPhoto[] = [];
  export let subjectId: string | null = null;

  const dispatch = createEventDispatcher<{
    close: void;
    applyParams: ProcessedPhoto;
    viewDetail: ProcessedPhoto;
  }>();

  const subject = subjectId ? PHOTO_SUBJECTS.find(s => s.id === subjectId) : undefined;

  $: paramDiffs = calculateParamDiffs(photos, subject);
  $: scoreDiffs = calculateScoreDiffs(photos);
  $: bestRecommendation = getBestRecommendation(photos, subject);
  $: significantDiffs = paramDiffs.filter(d => d.isSignificant);

  function getFilmName(id: string): string {
    return FILM_STOCKS.find(f => f.id === id)?.name || '未知';
  }

  function getFilm(id: string): FilmStock | undefined {
    return FILM_STOCKS.find(f => f.id === id);
  }

  function formatDate(ts: number): string {
    return new Date(ts).toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function getPhotoIndex(photoId: string): string {
    const idx = photos.findIndex(p => p.id === photoId) + 1;
    return ['一', '二', '三', '四'][idx - 1] || idx.toString();
  }

  function isBestScore(photoId: string, diff: ScoreDiff): boolean {
    return diff.bestPhotoId === photoId;
  }

  function isBestParam(photoId: string, diff: ParamDiff): boolean {
    return diff.bestPhotoId === photoId;
  }

  function getParamBarWidth(value: number, min: number, max: number): number {
    if (max === min) return 50;
    return ((value - min) / (max - min)) * 100;
  }

  function getScoreBarColor(score: number, isBest: boolean): string {
    if (isBest) {
      return 'linear-gradient(90deg, #ffd700, #ffaa00)';
    }
    if (score >= 85) return 'linear-gradient(90deg, #c8a878, #a07848)';
    if (score >= 70) return 'linear-gradient(90deg, #88a0c8, #6888a8)';
    return 'linear-gradient(90deg, #a88888, #886868)';
  }

  function handleApplyBestParams() {
    const bestPhoto = photos.find(p => p.id === bestRecommendation?.photoId);
    if (bestPhoto) {
      dispatch('applyParams', bestPhoto);
    }
  }
</script>

<div class="compare-overlay">
  <div class="compare-container">
    <div class="compare-header">
      <div class="header-left">
        <h2 class="compare-title">🔍 作品对比分析</h2>
        {#if subject}
          <span class="subject-badge">📷 {subject.name}</span>
        {/if}
        <span class="count-badge">{photos.length} 个版本</span>
      </div>
      <button class="close-btn" on:click={() => dispatch('close')}>
        <span>✕</span>
      </button>
    </div>

    {#if bestRecommendation}
      <div class="recommendation-card">
        <div class="rec-header">
          <span class="rec-icon">🏆</span>
          <span class="rec-title">最佳推荐：第 {getPhotoIndex(bestRecommendation.photoId)} 版</span>
          <span
            class="rec-grade"
            style="background: {GRADE_COLORS[photos.find(p => p.id === bestRecommendation.photoId)?.details.grade || 'D']};"
          >
            {photos.find(p => p.id === bestRecommendation.photoId)?.details.grade}
          </span>
        </div>
        <div class="rec-reasons">
          {#each bestRecommendation.reasons as reason (reason)}
            <div class="rec-reason">
              <span class="reason-bullet">✓</span>
              <span>{reason}</span>
            </div>
          {/each}
        </div>
        <div class="rec-actions">
          <button class="rec-btn primary" on:click={handleApplyBestParams}>
            <span>📋</span> 套用此参数继续创作
          </button>
          <button
            class="rec-btn secondary"
            on:click={() => {
              const photo = photos.find(p => p.id === bestRecommendation.photoId);
              if (photo) dispatch('viewDetail', photo);
            }}
          >
            <span>🔍</span> 查看详细分析
          </button>
        </div>
      </div>
    {/if}

    <div class="photos-compare-section">
      <h3 class="section-title">📸 作品并排对比</h3>
      <div class="photos-row" style="--photo-count: {photos.length};">
        {#each photos as photo, index (photo.id)}
          <div
            class="photo-compare-card"
            class:best={bestRecommendation?.photoId === photo.id}
          >
            <div class="photo-header">
              <span class="photo-version">第 {['一', '二', '三', '四'][index]} 版</span>
              {#if bestRecommendation?.photoId === photo.id}
                <span class="best-badge">🏆 最佳</span>
              {/if}
            </div>
            <div class="photo-image-wrap">
              <img src={photo.imageDataUrl} alt="" class="photo-image" />
              <div
                class="grade-badge"
                style="background: {GRADE_COLORS[photo.details.grade]};"
              >
                {photo.details.grade}
              </div>
              <div class="score-badge">{photo.score}</div>
            </div>
            <div class="photo-meta">
              <div class="meta-item">
                <span class="meta-label">胶片</span>
                <span class="meta-value">{getFilmName(photo.filmId)}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">时间</span>
                <span class="meta-value">{formatDate(photo.timestamp)}</span>
              </div>
            </div>
          </div>
        {/each}
      </div>
    </div>

    <div class="scores-compare-section">
      <h3 class="section-title">📊 评分对比</h3>
      <div class="scores-table" style="--photo-count: {photos.length};">
        <div class="scores-header">
          <div class="score-label-cell">评分项</div>
          {#each photos as photo (photo.id)}
            <div class="score-photo-cell">
              <span class="version-tag">第 {getPhotoIndex(photo.id)} 版</span>
            </div>
          {/each}
        </div>
        {#each scoreDiffs as diff (diff.category)}
          <div class="score-row">
            <div class="score-label-cell">
              <span class="score-label">{diff.label}</span>
            </div>
            {#each photos as photo, pIndex (photo.id)}
              <div
                class="score-value-cell"
                class:best={isBestScore(photo.id, diff)}
              >
                <div class="score-bar-wrap">
                  <div
                    class="score-bar-fill"
                    style="width: {diff.values[pIndex]}%; background: {getScoreBarColor(diff.values[pIndex], isBestScore(photo.id, diff))};"
                  />
                </div>
                <span class="score-number">{diff.values[pIndex]}</span>
                {#if isBestScore(photo.id, diff)}
                  <span class="best-indicator">👑</span>
                {/if}
              </div>
            {/each}
          </div>
        {/each}
      </div>
    </div>

    {#if significantDiffs.length > 0}
      <div class="params-diff-section">
        <h3 class="section-title">⚙️ 参数差异分析</h3>
        <div class="params-diff-note">
          <span class="note-icon">💡</span>
          <span>以下参数存在显著差异（差异超过 10%），最佳参数已标注</span>
        </div>
        <div class="params-compare-table" style="--photo-count: {photos.length};">
          <div class="params-header">
            <div class="param-label-cell">参数</div>
            {#each photos as photo (photo.id)}
              <div class="param-photo-cell">
                <span class="version-tag">第 {getPhotoIndex(photo.id)} 版</span>
              </div>
            {/each}
          </div>
          {#each significantDiffs as diff (diff.param)}
            <div class="param-row">
              <div class="param-label-cell">
                <span class="param-icon">{PARAM_ICONS[diff.param]}</span>
                <span class="param-label">{diff.label}</span>
              </div>
              {#each photos as photo, pIndex (photo.id)}
                <div
                  class="param-value-cell"
                  class:best={isBestParam(photo.id, diff)}
                >
                  <div class="param-bar-wrap">
                    <div
                      class="param-bar-fill"
                      style="left: {getParamBarWidth(diff.values[pIndex], diff.minValue, diff.maxValue) - 2}%;"
                    />
                    <div
                      class="param-bar-track"
                      style="width: {getParamBarWidth(diff.values[pIndex], diff.minValue, diff.maxValue)}%;"
                    />
                  </div>
                  <span class="param-number">{formatParamValue(diff.values[pIndex])}</span>
                  {#if isBestParam(photo.id, diff)}
                    <span class="best-indicator">✨</span>
                  {/if}
                </div>
              {/each}
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <div class="all-params-section">
      <h3 class="section-title">📋 完整参数对比</h3>
      <div class="all-params-table" style="--photo-count: {photos.length};">
        <div class="all-params-header">
          <div class="all-param-label-cell">参数</div>
          {#each photos as photo (photo.id)}
            <div class="all-param-photo-cell">
              <span class="version-tag">第 {getPhotoIndex(photo.id)} 版</span>
              {#if subject}
                <span class="ideal-tag">理想值</span>
              {/if}
            </div>
          {/each}
        </div>
        {#each paramDiffs as diff (diff.param)}
          <div class="all-param-row">
            <div class="all-param-label-cell">
              <span class="param-icon">{PARAM_ICONS[diff.param]}</span>
              <span class="param-label">{diff.label}</span>
            </div>
            {#each photos as photo, pIndex (photo.id)}
              <div
                class="all-param-value-cell"
                class:best={isBestParam(photo.id, diff)}
                class:significant={diff.isSignificant}
              >
                <div class="param-value-group">
                  <span class="all-param-number">{formatParamValue(diff.values[pIndex])}</span>
                  {#if isBestParam(photo.id, diff)}
                    <span class="best-mini">✨</span>
                  {/if}
                </div>
                {#if subject && (diff.param === 'exposure' || diff.param === 'contrast' || diff.param === 'saturation')}
                  <div class="ideal-value">
                    {formatParamValue(
                      diff.param === 'exposure' ? subject.idealExposure :
                      diff.param === 'contrast' ? subject.idealContrast :
                      subject.idealSaturation
                    )}
                  </div>
                {:else if subject}
                  <div class="ideal-value">50</div>
                {/if}
              </div>
            {/each}
          </div>
        {/each}
      </div>
    </div>

    {#if subject}
      <div class="ideal-params-section">
        <h3 class="section-title">🎯 题材理想参数参考</h3>
        <div class="ideal-params-grid">
          <div class="ideal-param-card">
            <span class="ideal-param-icon">☀</span>
            <span class="ideal-param-label">理想曝光</span>
            <span class="ideal-param-value">{formatParamValue(subject.idealExposure)}</span>
          </div>
          <div class="ideal-param-card">
            <span class="ideal-param-icon">◐</span>
            <span class="ideal-param-label">理想反差</span>
            <span class="ideal-param-value">{formatParamValue(subject.idealContrast)}</span>
          </div>
          <div class="ideal-param-card">
            <span class="ideal-param-icon">🎨</span>
            <span class="ideal-param-label">理想饱和度</span>
            <span class="ideal-param-value">{formatParamValue(subject.idealSaturation)}</span>
          </div>
        </div>
        <p class="ideal-desc">{subject.description}</p>
      </div>
    {/if}

    <div class="compare-actions">
      <button class="action-btn secondary" on:click={() => dispatch('close')}>
        <span>←</span> 返回相册
      </button>
    </div>
  </div>
</div>

<style>
  .compare-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.9);
    backdrop-filter: blur(10px);
    z-index: 200;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 20px;
    overflow-y: auto;
    animation: fadeIn 0.3s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .compare-container {
    background: linear-gradient(180deg, rgba(45, 26, 18, 0.98) 0%, rgba(26, 15, 10, 0.99) 100%);
    border: 1px solid rgba(139, 90, 43, 0.35);
    border-radius: 16px;
    padding: 24px;
    width: 100%;
    max-width: 1400px;
    margin-bottom: 40px;
    animation: slideUp 0.4s ease;
  }

  @keyframes slideUp {
    from { transform: translateY(30px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }

  .compare-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  .compare-title {
    font-size: 24px;
    color: #f0d8a8;
    margin: 0;
    letter-spacing: 3px;
  }

  .subject-badge {
    padding: 5px 12px;
    background: rgba(139, 90, 43, 0.25);
    border: 1px solid rgba(200, 150, 80, 0.35);
    border-radius: 12px;
    font-size: 12px;
    color: #d4a574;
  }

  .count-badge {
    padding: 5px 12px;
    background: rgba(100, 150, 200, 0.2);
    border: 1px solid rgba(100, 150, 200, 0.35);
    border-radius: 12px;
    font-size: 12px;
    color: #8ab4d8;
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

  .recommendation-card {
    background: linear-gradient(135deg, rgba(255, 200, 80, 0.12), rgba(255, 150, 50, 0.08));
    border: 1px solid rgba(255, 200, 80, 0.35);
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 24px;
    animation: pulseGlow 2s ease-in-out infinite;
  }

  @keyframes pulseGlow {
    0%, 100% { box-shadow: 0 0 0 0 rgba(255, 200, 80, 0.2); }
    50% { box-shadow: 0 0 30px 0 rgba(255, 200, 80, 0.15); }
  }

  .rec-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 12px;
  }

  .rec-icon {
    font-size: 28px;
  }

  .rec-title {
    font-size: 18px;
    font-weight: 600;
    color: #ffd700;
    letter-spacing: 2px;
  }

  .rec-grade {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    color: #1a0f0a;
    margin-left: auto;
  }

  .rec-reasons {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 16px;
  }

  .rec-reason {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    font-size: 13px;
    color: #e0d0b0;
    line-height: 1.6;
  }

  .reason-bullet {
    color: #8ad8a0;
    font-weight: bold;
    flex-shrink: 0;
  }

  .rec-actions {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }

  .rec-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 18px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 500;
    letter-spacing: 1px;
    transition: all 0.2s;
  }

  .rec-btn.primary {
    background: linear-gradient(135deg, #8b5a2b 0%, #6b4520 100%);
    color: #f5e6d3;
    border: 1px solid rgba(200, 160, 100, 0.4);
  }

  .rec-btn.primary:hover {
    background: linear-gradient(135deg, #a06830 0%, #805528 100%);
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(139, 90, 43, 0.4);
  }

  .rec-btn.secondary {
    background: rgba(100, 100, 100, 0.15);
    color: #c8b898;
    border: 1px solid rgba(100, 100, 100, 0.3);
  }

  .rec-btn.secondary:hover {
    background: rgba(120, 120, 120, 0.25);
  }

  .section-title {
    font-size: 15px;
    color: #d4a574;
    margin: 0 0 16px;
    letter-spacing: 2px;
    font-weight: 600;
  }

  .photos-compare-section {
    margin-bottom: 24px;
  }

  .photos-row {
    display: grid;
    grid-template-columns: repeat(var(--photo-count), 1fr);
    gap: 16px;
  }

  @media (max-width: 900px) {
    .photos-row {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 500px) {
    .photos-row {
      grid-template-columns: 1fr;
    }
  }

  .photo-compare-card {
    background: rgba(0, 0, 0, 0.3);
    border: 2px solid rgba(139, 90, 43, 0.2);
    border-radius: 12px;
    overflow: hidden;
    transition: all 0.3s;
  }

  .photo-compare-card.best {
    border-color: rgba(255, 200, 80, 0.6);
    box-shadow: 0 0 30px rgba(255, 200, 80, 0.2);
  }

  .photo-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    background: rgba(0, 0, 0, 0.3);
    border-bottom: 1px solid rgba(139, 90, 43, 0.2);
  }

  .photo-version {
    font-size: 13px;
    color: #c8a878;
    font-weight: 500;
    letter-spacing: 1px;
  }

  .best-badge {
    padding: 3px 8px;
    background: linear-gradient(135deg, #ffd700, #ffaa00);
    border-radius: 10px;
    font-size: 10px;
    color: #1a0f0a;
    font-weight: bold;
  }

  .photo-image-wrap {
    position: relative;
    aspect-ratio: 3 / 4;
    background: #0a0503;
  }

  .photo-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .grade-badge {
    position: absolute;
    top: 10px;
    left: 10px;
    width: 34px;
    height: 34px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    font-weight: bold;
    color: #1a0f0a;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
  }

  .score-badge {
    position: absolute;
    top: 10px;
    right: 10px;
    padding: 4px 10px;
    background: rgba(0, 0, 0, 0.7);
    border-radius: 12px;
    font-size: 13px;
    font-weight: 600;
    color: #f0d8a8;
    font-family: 'SF Mono', Monaco, monospace;
  }

  .photo-meta {
    padding: 10px 14px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .meta-item {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
  }

  .meta-label {
    color: #6a5a45;
  }

  .meta-value {
    color: #a89878;
  }

  .scores-compare-section {
    margin-bottom: 24px;
  }

  .scores-table {
    background: rgba(0, 0, 0, 0.25);
    border: 1px solid rgba(139, 90, 43, 0.2);
    border-radius: 10px;
    overflow: hidden;
  }

  .scores-header,
  .score-row {
    display: grid;
    grid-template-columns: 120px repeat(var(--photo-count), 1fr);
    gap: 0;
  }

  .scores-header {
    background: rgba(0, 0, 0, 0.3);
    border-bottom: 1px solid rgba(139, 90, 43, 0.2);
  }

  .score-row {
    border-bottom: 1px solid rgba(139, 90, 43, 0.1);
  }

  .score-row:last-child {
    border-bottom: none;
  }

  .score-label-cell,
  .score-photo-cell,
  .score-value-cell {
    padding: 12px 14px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .score-label-cell {
    border-right: 1px solid rgba(139, 90, 43, 0.15);
  }

  .score-label {
    font-size: 12px;
    color: #a89878;
  }

  .score-photo-cell {
    justify-content: center;
  }

  .version-tag {
    font-size: 11px;
    padding: 3px 8px;
    background: rgba(139, 90, 43, 0.2);
    border-radius: 8px;
    color: #b89868;
  }

  .score-value-cell {
    gap: 8px;
    justify-content: flex-start;
  }

  .score-value-cell.best {
    background: rgba(255, 200, 80, 0.08);
  }

  .score-bar-wrap {
    flex: 1;
    height: 8px;
    background: rgba(60, 50, 40, 0.5);
    border-radius: 4px;
    overflow: hidden;
    min-width: 40px;
  }

  .score-bar-fill {
    height: 100%;
    border-radius: 4px;
    transition: width 0.6s ease-out;
  }

  .score-number {
    font-size: 12px;
    font-weight: 600;
    color: #c8b898;
    font-family: 'SF Mono', Monaco, monospace;
    min-width: 28px;
    text-align: right;
  }

  .best-indicator {
    font-size: 12px;
  }

  .params-diff-section {
    margin-bottom: 24px;
  }

  .params-diff-note {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    background: rgba(200, 150, 80, 0.1);
    border: 1px solid rgba(200, 150, 80, 0.25);
    border-radius: 8px;
    margin-bottom: 14px;
    font-size: 12px;
    color: #d4b580;
  }

  .note-icon {
    font-size: 16px;
  }

  .params-compare-table,
  .all-params-table {
    background: rgba(0, 0, 0, 0.25);
    border: 1px solid rgba(139, 90, 43, 0.2);
    border-radius: 10px;
    overflow: hidden;
  }

  .params-header,
  .param-row,
  .all-params-header,
  .all-param-row {
    display: grid;
    grid-template-columns: 140px repeat(var(--photo-count), 1fr);
    gap: 0;
  }

  .params-header,
  .all-params-header {
    background: rgba(0, 0, 0, 0.3);
    border-bottom: 1px solid rgba(139, 90, 43, 0.2);
  }

  .param-row,
  .all-param-row {
    border-bottom: 1px solid rgba(139, 90, 43, 0.1);
  }

  .param-row:last-child,
  .all-param-row:last-child {
    border-bottom: none;
  }

  .param-label-cell,
  .param-photo-cell,
  .param-value-cell,
  .all-param-label-cell,
  .all-param-photo-cell,
  .all-param-value-cell {
    padding: 12px 14px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .param-label-cell,
  .all-param-label-cell {
    border-right: 1px solid rgba(139, 90, 43, 0.15);
  }

  .param-icon {
    font-size: 14px;
    opacity: 0.8;
  }

  .param-label {
    font-size: 12px;
    color: #a89878;
  }

  .param-photo-cell,
  .all-param-photo-cell {
    justify-content: center;
    flex-direction: column;
    gap: 4px;
  }

  .param-value-cell {
    gap: 8px;
  }

  .param-value-cell.best {
    background: rgba(100, 200, 150, 0.08);
  }

  .param-bar-wrap {
    flex: 1;
    height: 4px;
    background: rgba(60, 50, 40, 0.5);
    border-radius: 2px;
    position: relative;
    min-width: 30px;
  }

  .param-bar-track {
    height: 100%;
    background: rgba(139, 90, 43, 0.4);
    border-radius: 2px;
  }

  .param-bar-fill {
    position: absolute;
    top: 50%;
    width: 4px;
    height: 12px;
    background: #c8a878;
    border-radius: 2px;
    transform: translateY(-50%);
    transition: left 0.4s ease-out;
  }

  .param-value-cell.best .param-bar-fill {
    background: #8ad8a0;
    box-shadow: 0 0 8px rgba(100, 200, 150, 0.5);
  }

  .param-number {
    font-size: 11px;
    color: #b8a888;
    font-family: 'SF Mono', Monaco, monospace;
    min-width: 24px;
    text-align: right;
  }

  .all-params-section {
    margin-bottom: 24px;
  }

  .all-param-photo-cell {
    align-items: stretch;
  }

  .ideal-tag {
    font-size: 10px;
    padding: 2px 6px;
    background: rgba(100, 150, 200, 0.2);
    border-radius: 6px;
    color: #8ab4d8;
  }

  .all-param-value-cell {
    flex-direction: column;
    align-items: stretch;
    gap: 4px;
  }

  .all-param-value-cell.best {
    background: rgba(100, 200, 150, 0.08);
  }

  .all-param-value-cell.significant {
    border-left: 2px solid rgba(200, 150, 80, 0.5);
  }

  .param-value-group {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 4px;
  }

  .all-param-number {
    font-size: 13px;
    font-weight: 500;
    color: #d0c0a0;
    font-family: 'SF Mono', Monaco, monospace;
  }

  .best-mini {
    font-size: 10px;
  }

  .ideal-value {
    font-size: 10px;
    color: #6a8aaa;
    font-family: 'SF Mono', Monaco, monospace;
    padding: 2px 6px;
    background: rgba(100, 150, 200, 0.1);
    border-radius: 4px;
    align-self: flex-start;
  }

  .ideal-params-section {
    margin-bottom: 24px;
    padding: 18px;
    background: rgba(60, 100, 150, 0.1);
    border: 1px solid rgba(100, 150, 200, 0.2);
    border-radius: 10px;
  }

  .ideal-params-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    margin-bottom: 12px;
  }

  @media (max-width: 600px) {
    .ideal-params-grid {
      grid-template-columns: 1fr;
    }
  }

  .ideal-param-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 12px;
    background: rgba(0, 0, 0, 0.25);
    border-radius: 8px;
    border: 1px solid rgba(100, 150, 200, 0.2);
  }

  .ideal-param-icon {
    font-size: 18px;
  }

  .ideal-param-label {
    font-size: 11px;
    color: #8ab4d8;
  }

  .ideal-param-value {
    font-size: 20px;
    font-weight: bold;
    color: #a8c8e8;
    font-family: 'SF Mono', Monaco, monospace;
  }

  .ideal-desc {
    margin: 0;
    font-size: 12px;
    color: #8a9aaa;
    line-height: 1.6;
    font-style: italic;
  }

  .compare-actions {
    display: flex;
    justify-content: center;
    padding-top: 16px;
    border-top: 1px solid rgba(139, 90, 43, 0.2);
  }

  .action-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 24px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    letter-spacing: 1px;
    transition: all 0.2s;
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
