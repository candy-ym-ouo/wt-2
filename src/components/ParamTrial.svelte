<script lang="ts">
  import { gameStore } from '../stores/gameStore';
  import type { DeveloperRecipe, TrialResult } from '../types/game';
  import { FILM_STOCKS, PHOTO_SUBJECTS, GRADE_COLORS, GRADE_NAMES, PROCESS_TYPE_LABELS } from '../data/gameData';
  import { formatTimeReadable, createTrialResult } from '../utils/recipeUtils';

  export let selectedRecipe: DeveloperRecipe | null;

  let selectedFilmId = FILM_STOCKS[0].id;
  let selectedSubjectId: string = '';
  let isRunning = false;

  $: recipes = $gameStore.filmLab.recipes;
  $: trialHistory = $gameStore.filmLab.trialHistory;
  $: currentRecipe = selectedRecipe || recipes[0] || null;
  $: selectedFilm = FILM_STOCKS.find(f => f.id === selectedFilmId) || FILM_STOCKS[0];
  $: selectedSubject = selectedSubjectId ? PHOTO_SUBJECTS.find(s => s.id === selectedSubjectId) : null;

  async function runTrial() {
    if (!currentRecipe) return;
    isRunning = true;
    await new Promise(r => setTimeout(r, 600));
    gameStore.runTrial(currentRecipe.id, selectedFilmId, selectedSubjectId || undefined);
    isRunning = false;
  }

  function handleRecipeSelect(e: Event) {
    const target = e.target as HTMLSelectElement;
    const id = target.value;
    if (id) {
      const recipe = recipes.find(r => r.id === id);
      if (recipe) {
        gameStore.selectRecipe(id);
      }
    }
  }

  function clearHistory() {
    if (!confirm('确定要清空所有试算历史吗？')) return;
    gameStore.clearTrialHistory();
  }

  function applyTrialParams(trial: TrialResult) {
    gameStore.updateParams(trial.params);
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

  function getSubjectName(id?: string): string {
    if (!id) return '未指定';
    return PHOTO_SUBJECTS.find(s => s.id === id)?.name || id;
  }
</script>

<div class="param-trial">
  <div class="trial-header">
    <div class="header-left">
      <h3 class="section-title">🧪 参数试算</h3>
      <span class="trial-count">已试算 {trialHistory.length} 次</span>
    </div>
    <button class="btn-secondary" on:click={clearHistory} disabled={trialHistory.length === 0}>
      🗑️ 清空历史
    </button>
  </div>

  <div class="trial-config">
    <div class="config-section">
      <h4>选择配方</h4>
      <div class="recipe-selector">
        {#if recipes.length === 0}
          <span class="empty-hint">暂无配方，请先创建配方</span>
        {:else}
          <select value={currentRecipe?.id || ''} on:change={handleRecipeSelect}>
            {#each recipes as r}
              <option value={r.id} selected={currentRecipe?.id === r.id}>
                {r.name} (v{r.version})
              </option>
            {/each}
          </select>
        {/if}
      </div>
      {#if currentRecipe}
        <div class="selected-recipe-info">
          <span class="process-tag" style="background: {currentRecipe.processType === 'bw' ? '#6b7280' : currentRecipe.processType === 'c41' ? '#c9a87c' : '#7ec8a0'};">
            {PROCESS_TYPE_LABELS[currentRecipe.processType]}
          </span>
          <span class="recipe-desc">{currentRecipe.description}</span>
        </div>
      {/if}
    </div>

    <div class="config-grid">
      <div class="config-section">
        <h4>选择胶片</h4>
        <select bind:value={selectedFilmId}>
          {#each FILM_STOCKS as f}
            <option value={f.id}>{f.name} (ISO {f.iso})</option>
          {/each}
        </select>
        <div class="film-preview">
          <span class="film-color-dot" style="background: {selectedFilm.thumbnailColor};"></span>
          <span class="film-type">{selectedFilm.color === 'bw' ? '黑白胶片' : '彩色胶片'}</span>
        </div>
      </div>

      <div class="config-section">
        <h4>选择场景（可选）</h4>
        <select bind:value={selectedSubjectId}>
          <option value="">不指定场景</option>
          {#each PHOTO_SUBJECTS as s}
            <option value={s.id}>{s.name}</option>
          {/each}
        </select>
        {#if selectedSubject}
          <div class="subject-preview">
            <span class="subject-difficulty">
              {'⭐'.repeat(selectedSubject.difficulty)}
            </span>
            <span class="subject-scene">{selectedSubject.sceneType}</span>
          </div>
        {/if}
      </div>
    </div>

    <button 
      class="btn-primary run-btn" 
      on:click={runTrial} 
      disabled={!currentRecipe || isRunning}
    >
      {#if isRunning}
        <span class="loading-spinner"></span>
        模拟中...
      {:else}
        🔬 运行试算
      {/if}
    </button>
  </div>

  {#if trialHistory.length > 0}
    <div class="trial-results">
      <h4 class="results-title">📊 试算结果</h4>
      <div class="results-list">
        {#each trialHistory.slice().reverse() as trial (trial.id)}
          <div class="trial-card">
            <div class="trial-card-header">
              <div class="trial-recipe-name">{trial.recipeName}</div>
              <div class="trial-score" style="color: {getScoreColor(trial.predictedScore)};">
                <span class="score-value">{trial.predictedScore}</span>
                <span class="score-grade" style="background: {GRADE_COLORS[trial.predictedGrade]};">
                  {GRADE_NAMES[trial.predictedGrade]}
                </span>
              </div>
            </div>

            <div class="trial-meta">
              <span>🎞️ {FILM_STOCKS.find(f => f.id === trial.filmId)?.name || trial.filmId}</span>
              {#if trial.subjectId}
                <span>📷 {getSubjectName(trial.subjectId)}</span>
              {/if}
              <span>⏱️ {formatTimeReadable(trial.timings.total)}</span>
              <span>🕒 {formatDateTime(trial.createdAt)}</span>
            </div>

            <div class="trial-predictions">
              <div class="pred-item">
                <span class="pred-label">曝光</span>
                <div class="pred-bar"><div class="pred-fill exposure" style="width: {trial.predictedExposure * 100}%;"></div></div>
                <span class="pred-val">{Math.round(trial.predictedExposure * 100)}%</span>
              </div>
              <div class="pred-item">
                <span class="pred-label">对比度</span>
                <div class="pred-bar"><div class="pred-fill contrast" style="width: {trial.predictedContrast * 100}%;"></div></div>
                <span class="pred-val">{Math.round(trial.predictedContrast * 100)}%</span>
              </div>
              <div class="pred-item">
                <span class="pred-label">饱和度</span>
                <div class="pred-bar"><div class="pred-fill saturation" style="width: {trial.predictedSaturation * 100}%;"></div></div>
                <span class="pred-val">{Math.round(trial.predictedSaturation * 100)}%</span>
              </div>
              <div class="pred-item">
                <span class="pred-label">细节</span>
                <div class="pred-bar"><div class="pred-fill detail" style="width: {trial.predictedDetail * 100}%;"></div></div>
                <span class="pred-val">{Math.round(trial.predictedDetail * 100)}%</span>
              </div>
            </div>

            <div class="trial-warnings">
              {#each trial.warnings as w}
                <span class="warn-tag">⚠️ {w}</span>
              {/each}
            </div>

            <div class="trial-suggestions">
              {#each trial.suggestions as s}
                <span class="sugg-tag">💡 {s}</span>
              {/each}
            </div>

            <div class="trial-timings">
              <div class="timing-item"><span>预浸</span><span>{formatTimeReadable(trial.timings.presoak)}</span></div>
              <div class="timing-item"><span>显影</span><span>{formatTimeReadable(trial.timings.develop)}</span></div>
              <div class="timing-item"><span>停显</span><span>{formatTimeReadable(trial.timings.stop)}</span></div>
              <div class="timing-item"><span>定影</span><span>{formatTimeReadable(trial.timings.fix)}</span></div>
              <div class="timing-item"><span>水洗</span><span>{formatTimeReadable(trial.timings.wash)}</span></div>
            </div>

            <div class="trial-actions">
              <button class="btn-small apply" on:click={() => applyTrialParams(trial)}>
                🎯 应用参数
              </button>
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .param-trial {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .trial-header {
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

  .trial-count {
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

  .btn-small.apply {
    background: linear-gradient(135deg, #7ec8a0, #4a9070);
    color: #fff;
  }

  .trial-config {
    padding: 20px;
    background: linear-gradient(180deg, rgba(45, 26, 18, 0.4), rgba(20, 12, 8, 0.5));
    border: 1px solid rgba(139, 90, 43, 0.2);
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .config-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }

  @media (max-width: 600px) {
    .config-grid {
      grid-template-columns: 1fr;
    }
  }

  .config-section h4 {
    margin: 0 0 8px;
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

  .empty-hint {
    color: #5a4a35;
    font-size: 13px;
  }

  .selected-recipe-info {
    margin-top: 8px;
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .process-tag {
    padding: 2px 8px;
    border-radius: 4px;
    color: #fff;
    font-size: 11px;
  }

  .recipe-desc {
    color: #8a7a5a;
    font-size: 12px;
  }

  .film-preview, .subject-preview {
    margin-top: 8px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: #8a7a5a;
  }

  .film-color-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    border: 1px solid rgba(139, 90, 43, 0.5);
  }

  .subject-difficulty {
    color: #ffd700;
    font-size: 11px;
  }

  .subject-scene {
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .run-btn {
    align-self: center;
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

  .trial-results {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .results-title {
    margin: 0;
    color: #d4a574;
    font-size: 15px;
  }

  .results-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .trial-card {
    padding: 16px;
    background: linear-gradient(180deg, rgba(45, 26, 18, 0.5), rgba(20, 12, 8, 0.6));
    border: 1px solid rgba(139, 90, 43, 0.2);
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .trial-card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }

  .trial-recipe-name {
    color: #e8dcc8;
    font-size: 15px;
    font-weight: 600;
  }

  .trial-score {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .score-value {
    font-size: 24px;
    font-weight: 700;
  }

  .score-grade {
    padding: 3px 8px;
    border-radius: 4px;
    color: #fff;
    font-size: 12px;
    font-weight: 600;
  }

  .trial-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    color: #8a7a5a;
    font-size: 12px;
  }

  .trial-predictions {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .pred-item {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .pred-label {
    color: #8a7a5a;
    font-size: 12px;
    width: 60px;
    flex-shrink: 0;
  }

  .pred-bar {
    flex: 1;
    height: 6px;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 3px;
    overflow: hidden;
  }

  .pred-fill {
    height: 100%;
    border-radius: 3px;
    transition: width 0.3s ease;
  }

  .pred-fill.exposure { background: linear-gradient(90deg, #c8a878, #8b6a3b); }
  .pred-fill.contrast { background: linear-gradient(90deg, #7ea8c8, #3a6a8a); }
  .pred-fill.saturation { background: linear-gradient(90deg, #c878a8, #8a3a6a); }
  .pred-fill.detail { background: linear-gradient(90deg, #7ec8a0, #3a8a6a); }

  .pred-val {
    color: #c8a878;
    font-size: 12px;
    width: 45px;
    text-align: right;
    flex-shrink: 0;
  }

  .trial-warnings, .trial-suggestions {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .warn-tag {
    padding: 4px 10px;
    background: rgba(200, 120, 80, 0.15);
    border: 1px solid rgba(200, 120, 80, 0.3);
    border-radius: 6px;
    color: #e8a078;
    font-size: 11px;
  }

  .sugg-tag {
    padding: 4px 10px;
    background: rgba(126, 200, 160, 0.15);
    border: 1px solid rgba(126, 200, 160, 0.3);
    border-radius: 6px;
    color: #7ec8a0;
    font-size: 11px;
  }

  .trial-timings {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 6px;
    padding: 10px;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 8px;
  }

  @media (max-width: 600px) {
    .trial-timings {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  .timing-item {
    display: flex;
    flex-direction: column;
    gap: 2px;
    text-align: center;
  }

  .timing-item span:first-child {
    color: #6a5a45;
    font-size: 10px;
  }

  .timing-item span:last-child {
    color: #c8a878;
    font-size: 11px;
    font-weight: 500;
  }

  .trial-actions {
    display: flex;
    justify-content: flex-end;
    padding-top: 4px;
    border-top: 1px solid rgba(139, 90, 43, 0.15);
  }
</style>
