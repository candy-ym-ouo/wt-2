<script lang="ts">
  import { gameStore } from '../stores/gameStore';
  import type { DeveloperRecipe, RecipeCompareResult } from '../types/game';
  import { FILM_STOCKS, PHOTO_SUBJECTS, GRADE_COLORS, GRADE_NAMES } from '../data/gameData';
  import { formatTimeReadable } from '../utils/recipeUtils';

  let selectedFilmId = FILM_STOCKS[0].id;
  let selectedSubjectId: string = '';
  let selectedRecipeIds: string[] = [];
  let isComparing = false;

  $: recipes = $gameStore.filmLab.recipes;
  $: compareHistory = $gameStore.filmLab.compareHistory;
  $: selectedFilm = FILM_STOCKS.find(f => f.id === selectedFilmId) || FILM_STOCKS[0];
  $: selectedSubject = selectedSubjectId ? PHOTO_SUBJECTS.find(s => s.id === selectedSubjectId) : null;
  $: canCompare = selectedRecipeIds.length >= 2;

  function toggleRecipeSelection(id: string) {
    if (selectedRecipeIds.includes(id)) {
      selectedRecipeIds = selectedRecipeIds.filter(r => r !== id);
    } else {
      if (selectedRecipeIds.length < 4) {
        selectedRecipeIds = [...selectedRecipeIds, id];
      }
    }
  }

  async function runCompare() {
    if (!canCompare) return;
    isComparing = true;
    await new Promise(r => setTimeout(r, 800));
    gameStore.runCompare(selectedRecipeIds, selectedFilmId, selectedSubjectId || undefined);
    isComparing = false;
  }

  function clearHistory() {
    if (!confirm('确定要清空所有对比历史吗？')) return;
    gameStore.clearCompareHistory();
  }

  function applyBestParams(result: RecipeCompareResult) {
    const best = result.comparison.find(c => c.recipeId === result.bestRecipeId);
    if (best) {
      gameStore.updateParams(best.params);
    }
  }

  function applyRecipeParams(recipeId: string, result: RecipeCompareResult) {
    const item = result.comparison.find(c => c.recipeId === recipeId);
    if (item) {
      gameStore.updateParams(item.params);
    }
  }

  function formatDateTime(ts: number): string {
    const d = new Date(ts);
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  function getScoreColor(score: number): string {
    if (score >= 90) return '#ffd700';
    if (score >= 80) return '#7ec8a0';
    if (score >= 70) return '#7ea8c8';
    if (score >= 60) return '#c8a878';
    return '#c87878';
  }

  function getRecipeName(id: string): string {
    return recipes.find(r => r.id === id)?.name || id;
  }

  function getSubjectName(id?: string): string {
    if (!id) return '未指定';
    return PHOTO_SUBJECTS.find(s => s.id === id)?.name || id;
  }

  const paramLabels: Record<string, string> = {
    exposure: '曝光',
    developmentTime: '显影时间',
    temperature: '温度',
    agitation: '搅动',
    contrast: '对比度',
    saturation: '饱和度',
    dilution: '稀释度'
  };
</script>

<div class="recipe-compare">
  <div class="compare-header">
    <div class="header-left">
      <h3 class="section-title">⚖️ 配方对比</h3>
      <span class="compare-count">已对比 {compareHistory.length} 次</span>
    </div>
    <button class="btn-secondary" on:click={clearHistory} disabled={compareHistory.length === 0}>
      🗑️ 清空历史
    </button>
  </div>

  <div class="compare-config">
    <div class="config-section">
      <h4>选择胶片</h4>
      <select bind:value={selectedFilmId}>
        {#each FILM_STOCKS as f}
          <option value={f.id}>{f.name} (ISO {f.iso})</option>
        {/each}
      </select>
    </div>

    <div class="config-section">
      <h4>选择场景（可选）</h4>
      <select bind:value={selectedSubjectId}>
        <option value="">不指定场景</option>
        {#each PHOTO_SUBJECTS as s}
          <option value={s.id}>{s.name}</option>
        {/each}
      </select>
    </div>

    <div class="config-section full">
      <h4>选择配方（至少2个，最多4个）</h4>
      <div class="recipe-checkbox-grid">
        {#if recipes.length === 0}
          <span class="empty-hint">暂无配方</span>
        {:else}
          {#each recipes as r}
            <label 
              class="recipe-checkbox {selectedRecipeIds.includes(r.id) ? 'active' : ''}"
              class:disabled={!selectedRecipeIds.includes(r.id) && selectedRecipeIds.length >= 4}
            >
              <input 
                type="checkbox" 
                checked={selectedRecipeIds.includes(r.id)}
                disabled={!selectedRecipeIds.includes(r.id) && selectedRecipeIds.length >= 4}
                on:change={() => toggleRecipeSelection(r.id)}
              />
              <span class="rc-name">{r.name}</span>
              <span class="rc-version">v{r.version}</span>
            </label>
          {/each}
        {/if}
      </div>
      <div class="selection-hint">已选择 {selectedRecipeIds.length} / 4 个配方</div>
    </div>

    <button 
      class="btn-primary compare-btn" 
      on:click={runCompare} 
      disabled={!canCompare || isComparing}
    >
      {#if isComparing}
        <span class="loading-spinner"></span>
        对比中...
      {:else}
        📊 开始对比
      {/if}
    </button>
  </div>

  {#if compareHistory.length > 0}
    <div class="compare-results">
      <h4 class="results-title">📋 对比结果</h4>
      <div class="compare-list">
        {#each compareHistory.slice().reverse() as result (result.createdAt)}
          <div class="compare-card">
            <div class="compare-card-header">
              <div class="compare-meta">
                <span>🎞️ {FILM_STOCKS.find(f => f.id === result.filmId)?.name || result.filmId}</span>
                {#if result.subjectId}
                  <span>📷 {getSubjectName(result.subjectId)}</span>
                {/if}
                <span>🕒 {formatDateTime(result.createdAt)}</span>
              </div>
              <button class="btn-small apply-best" on:click={() => applyBestParams(result)}>
                🎯 应用最佳参数
              </button>
            </div>

            <div class="score-comparison">
              {#each result.comparison as comp}
                <div class="score-col {comp.recipeId === result.bestRecipeId ? 'best' : ''}">
                  {#if comp.recipeId === result.bestRecipeId}
                    <div class="best-badge">🏆 最佳</div>
                  {/if}
                  <div class="score-recipe-name">{comp.recipeName}</div>
                  <div class="score-display" style="color: {getScoreColor(comp.score)};">
                    <span class="score-num">{comp.score}</span>
                    <span class="score-letter" style="background: {GRADE_COLORS[comp.grade]};">
                      {GRADE_NAMES[comp.grade]}
                    </span>
                  </div>
                  <div class="score-time">⏱️ {formatTimeReadable(comp.totalTime)}</div>
                  <button class="btn-small apply-recipe" on:click={() => applyRecipeParams(comp.recipeId, result)}>
                    应用此配方
                  </button>
                </div>
              {/each}
            </div>

            <div class="dimensions-comparison">
              <div class="dim-row">
                <span class="dim-label">曝光</span>
                {#each result.comparison as comp}
                  <div class="dim-value" style="--val: {comp.exposure};">
                    <div class="dim-bar exposure"><div class="dim-fill" style="width: {comp.exposure * 100}%;"></div></div>
                    <span>{Math.round(comp.exposure * 100)}%</span>
                  </div>
                {/each}
              </div>
              <div class="dim-row">
                <span class="dim-label">对比度</span>
                {#each result.comparison as comp}
                  <div class="dim-value" style="--val: {comp.contrast};">
                    <div class="dim-bar contrast"><div class="dim-fill" style="width: {comp.contrast * 100}%;"></div></div>
                    <span>{Math.round(comp.contrast * 100)}%</span>
                  </div>
                {/each}
              </div>
              <div class="dim-row">
                <span class="dim-label">饱和度</span>
                {#each result.comparison as comp}
                  <div class="dim-value" style="--val: {comp.saturation};">
                    <div class="dim-bar saturation"><div class="dim-fill" style="width: {comp.saturation * 100}%;"></div></div>
                    <span>{Math.round(comp.saturation * 100)}%</span>
                  </div>
                {/each}
              </div>
              <div class="dim-row">
                <span class="dim-label">细节</span>
                {#each result.comparison as comp}
                  <div class="dim-value" style="--val: {comp.detail};">
                    <div class="dim-bar detail"><div class="dim-fill" style="width: {comp.detail * 100}%;"></div></div>
                    <span>{Math.round(comp.detail * 100)}%</span>
                  </div>
                {/each}
              </div>
            </div>

            <div class="param-diff-section">
              <h5>参数差异</h5>
              <div class="param-diff-grid">
                {#each result.paramDifferences as pd}
                  <div class="param-diff-row">
                    <span class="pd-label">{paramLabels[pd.param] || pd.param}</span>
                    <div class="pd-values">
                      {#each pd.values as v}
                        <span 
                          class="pd-val {v.recipeId === pd.bestRecipeId ? 'best' : ''}"
                          title={getRecipeName(v.recipeId)}
                        >
                          {Math.round(v.value * 100)}%
                        </span>
                      {/each}
                    </div>
                  </div>
                {/each}
              </div>
            </div>

            <div class="recipe-tags-section">
              {#each result.comparison as comp}
                <div class="tags-row">
                  <span class="tags-label">{comp.recipeName}:</span>
                  <div class="tags-list">
                    {#each comp.tags as tag}
                      <span class="tag-chip">{tag}</span>
                    {:else}
                      <span class="no-tags">无标签</span>
                    {/each}
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .recipe-compare {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .compare-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .section-title {
    margin: 0;
    color: #e8c890;
    font-size: 18px;
  }

  .compare-count {
    color: #7a6a55;
    font-size: 13px;
  }

  .btn-primary {
    padding: 8px 16px;
    background: linear-gradient(135deg, #d4a574, #8b5a2b);
    border: none;
    border-radius: 8px;
    color: #fff;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .btn-primary:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(212, 165, 116, 0.4);
  }

  .btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-secondary {
    padding: 8px 16px;
    background: rgba(139, 90, 43, 0.2);
    border: 1px solid rgba(139, 90, 43, 0.4);
    border-radius: 8px;
    color: #c8a878;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .btn-secondary:hover:not(:disabled) {
    background: rgba(139, 90, 43, 0.3);
  }

  .btn-secondary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-small {
    padding: 6px 12px;
    border: none;
    border-radius: 6px;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .btn-small.apply-best {
    background: linear-gradient(135deg, #ffd700, #d4a500);
    color: #3a2a0a;
    font-weight: 600;
  }

  .btn-small.apply-recipe {
    background: rgba(126, 200, 160, 0.2);
    border: 1px solid rgba(126, 200, 160, 0.4);
    color: #7ec8a0;
    margin-top: 8px;
  }

  .compare-config {
    padding: 20px;
    background: linear-gradient(180deg, rgba(45, 26, 18, 0.4), rgba(20, 12, 8, 0.5));
    border: 1px solid rgba(139, 90, 43, 0.2);
    border-radius: 12px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }

  @media (max-width: 600px) {
    .compare-config {
      grid-template-columns: 1fr;
    }
  }

  .config-section {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .config-section.full {
    grid-column: 1 / -1;
  }

  .config-section h4 {
    margin: 0;
    color: #c8a878;
    font-size: 13px;
    font-weight: 500;
  }

  .config-section select {
    width: 100%;
    padding: 8px 12px;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(139, 90, 43, 0.3);
    border-radius: 8px;
    color: #e8dcc8;
    font-size: 13px;
    outline: none;
  }

  .config-section select:focus {
    border-color: #d4a574;
  }

  .recipe-checkbox-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 8px;
  }

  .recipe-checkbox {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(139, 90, 43, 0.25);
    border-radius: 8px;
    color: #8a7a5a;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .recipe-checkbox input {
    display: none;
  }

  .recipe-checkbox.active {
    background: rgba(212, 165, 116, 0.15);
    border-color: rgba(212, 165, 116, 0.5);
    color: #d4b890;
  }

  .recipe-checkbox.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .rc-name {
    flex: 1;
    font-weight: 500;
  }

  .rc-version {
    color: #6a5a45;
    font-size: 10px;
  }

  .selection-hint {
    color: #6a5a45;
    font-size: 12px;
    margin-top: 4px;
  }

  .empty-hint {
    color: #5a4a35;
    font-size: 13px;
  }

  .compare-btn {
    grid-column: 1 / -1;
    justify-self: center;
    padding: 12px 32px;
    font-size: 15px;
    font-weight: 600;
  }

  .loading-spinner {
    display: inline-block;
    width: 14px;
    height: 14px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin-right: 8px;
    vertical-align: middle;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .compare-results {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .results-title {
    margin: 0;
    color: #d4a574;
    font-size: 15px;
  }

  .compare-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .compare-card {
    padding: 20px;
    background: linear-gradient(180deg, rgba(45, 26, 18, 0.5), rgba(20, 12, 8, 0.6));
    border: 1px solid rgba(139, 90, 43, 0.2);
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .compare-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
  }

  .compare-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    color: #8a7a5a;
    font-size: 12px;
  }

  .score-comparison {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 12px;
  }

  .score-col {
    padding: 16px;
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(139, 90, 43, 0.15);
    border-radius: 10px;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    position: relative;
  }

  .score-col.best {
    border-color: rgba(255, 215, 0, 0.4);
    background: rgba(255, 215, 0, 0.08);
  }

  .best-badge {
    position: absolute;
    top: -10px;
    left: 50%;
    transform: translateX(-50%);
    padding: 2px 10px;
    background: linear-gradient(135deg, #ffd700, #d4a500);
    border-radius: 10px;
    color: #3a2a0a;
    font-size: 11px;
    font-weight: 700;
  }

  .score-recipe-name {
    color: #e8dcc8;
    font-size: 13px;
    font-weight: 600;
    margin-top: 6px;
  }

  .score-display {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .score-num {
    font-size: 28px;
    font-weight: 700;
  }

  .score-letter {
    padding: 3px 8px;
    border-radius: 4px;
    color: #fff;
    font-size: 13px;
    font-weight: 600;
  }

  .score-time {
    color: #8a7a5a;
    font-size: 11px;
  }

  .dimensions-comparison {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 14px;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 10px;
  }

  .dim-row {
    display: grid;
    grid-template-columns: 60px repeat(auto-fit, minmax(120px, 1fr));
    gap: 10px;
    align-items: center;
  }

  .dim-label {
    color: #8a7a5a;
    font-size: 12px;
  }

  .dim-value {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .dim-value span {
    color: #c8a878;
    font-size: 11px;
    width: 35px;
    text-align: right;
  }

  .dim-bar {
    flex: 1;
    height: 5px;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 3px;
    overflow: hidden;
  }

  .dim-fill {
    height: 100%;
    border-radius: 3px;
  }

  .dim-bar.exposure .dim-fill { background: linear-gradient(90deg, #c8a878, #8b6a3b); }
  .dim-bar.contrast .dim-fill { background: linear-gradient(90deg, #7ea8c8, #3a6a8a); }
  .dim-bar.saturation .dim-fill { background: linear-gradient(90deg, #c878a8, #8a3a6a); }
  .dim-bar.detail .dim-fill { background: linear-gradient(90deg, #7ec8a0, #3a8a6a); }

  .param-diff-section h5 {
    margin: 0 0 10px;
    color: #c8a878;
    font-size: 13px;
    font-weight: 500;
  }

  .param-diff-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 8px;
  }

  .param-diff-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 10px;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 6px;
  }

  .pd-label {
    color: #8a7a5a;
    font-size: 11px;
    min-width: 60px;
  }

  .pd-values {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }

  .pd-val {
    padding: 2px 6px;
    background: rgba(139, 90, 43, 0.2);
    border-radius: 4px;
    color: #a08060;
    font-size: 11px;
  }

  .pd-val.best {
    background: rgba(126, 200, 160, 0.2);
    color: #7ec8a0;
    font-weight: 600;
  }

  .recipe-tags-section {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding-top: 10px;
    border-top: 1px solid rgba(139, 90, 43, 0.15);
  }

  .tags-row {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    font-size: 12px;
  }

  .tags-label {
    color: #8a7a5a;
    min-width: 80px;
    flex-shrink: 0;
  }

  .tags-list {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .tag-chip {
    padding: 2px 8px;
    background: rgba(139, 90, 43, 0.2);
    border-radius: 4px;
    color: #a08060;
    font-size: 11px;
  }

  .no-tags {
    color: #5a4a35;
    font-size: 11px;
  }
</style>
