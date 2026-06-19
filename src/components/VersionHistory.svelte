<script lang="ts">
  import { gameStore } from '../stores/gameStore';
  import type { DeveloperRecipe, RecipeVersion } from '../types/game';
  import { PROCESS_TYPE_LABELS, SOLUTION_TYPE_LABELS } from '../data/gameData';

  export let selectedRecipe: DeveloperRecipe | null;

  $: recipes = $gameStore.filmLab.recipes;
  $: selectedRecipeId = $gameStore.filmLab.selectedRecipeId;
  $: currentRecipe = selectedRecipe || recipes.find(r => r.id === selectedRecipeId) || null;
  $: versionHistory = currentRecipe?.versionHistory || [];
  $: hasHistory = versionHistory.length > 0;

  function selectRecipe(id: string) {
    gameStore.selectRecipe(id);
  }

  function handleRecipeChange(e: Event) {
    const target = e.target as HTMLSelectElement;
    selectRecipe(target.value);
  }

  function revertToVersion(version: RecipeVersion) {
    if (!currentRecipe) return;
    if (!confirm(`确定要将配方「${currentRecipe.name}」回退到 v${version.version} 版本吗？\n当前版本将被保存为新版本。`)) return;
    gameStore.revertRecipeToVersion(currentRecipe.id, version.version);
  }

  function formatDateTime(ts: number): string {
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  function getSolutionName(solutionId?: string): string {
    if (!solutionId) return '未配置';
    const solutions = $gameStore.filmLab.solutions;
    return solutions.find(s => s.id === solutionId)?.name || solutionId;
  }

  function getParamDiffLabel(key: string): string {
    const labels: Record<string, string> = {
      temperature: '温度',
      timeMultiplier: '时间',
      agitation: '搅动',
      dilution: '稀释度'
    };
    return labels[key] || key;
  }

  function formatParamValue(key: string, value: unknown): string {
    const num = Number(value);
    if (key === 'timeMultiplier') {
      return `×${num.toFixed(2)}`;
    }
    return `${Math.round(num * 100)}%`;
  }

  function getParamValue(key: string, value: unknown): number {
    return Math.min(Number(value) * 100, 100);
  }
</script>

<div class="version-history">
  <div class="history-header">
    <h3 class="section-title">📜 版本历史</h3>
  </div>

  <div class="recipe-selector">
    <label>选择配方：</label>
    <select 
      value={currentRecipe?.id || ''} 
      on:change={handleRecipeChange}
    >
      {#if recipes.length === 0}
        <option value="">暂无配方</option>
      {:else}
        {#each recipes as r}
          <option value={r.id} selected={currentRecipe?.id === r.id}>
            {r.name} (v{r.version})
          </option>
        {/each}
      {/if}
    </select>
  </div>

  {#if currentRecipe}
    <div class="current-version-info">
      <div class="cvi-header">
        <span class="cvi-name">{currentRecipe.name}</span>
        <span class="process-tag" style="background: {currentRecipe.processType === 'bw' ? '#6b7280' : currentRecipe.processType === 'c41' ? '#c9a87c' : '#7ec8a0'};">
          {PROCESS_TYPE_LABELS[currentRecipe.processType]}
        </span>
        <span class="cvi-version">当前版本 v{currentRecipe.version}</span>
      </div>
      <div class="cvi-meta">
        <span>创建于 {formatDateTime(currentRecipe.createdAt)}</span>
        <span>更新于 {formatDateTime(currentRecipe.updatedAt)}</span>
        <span>共 {currentRecipe.versionHistory.length + 1} 个版本</span>
      </div>
    </div>

    {#if hasHistory}
      <div class="timeline">
        {#each versionHistory.slice().reverse() as version, idx (version.version)}
          <div class="timeline-item">
            <div class="timeline-marker">
              <div class="marker-dot"></div>
              {#if idx < versionHistory.length - 1}
                <div class="marker-line"></div>
              {/if}
            </div>
            <div class="timeline-content">
              <div class="tc-header">
                <div class="tc-title">
                  <span class="tc-version">v{version.version}</span>
                  <span class="tc-name">{version.name}</span>
                </div>
                <span class="tc-date">{formatDateTime(version.timestamp)}</span>
              </div>

              {#if version.changeNote}
                <div class="tc-note">
                  📝 {version.changeNote}
                </div>
              {/if}

              <div class="tc-details">
                <div class="tc-section">
                  <h5>工艺流程</h5>
                  <div class="flow-grid">
                    <div class="flow-item">
                      <span class="fi-label">显影液</span>
                      <span class="fi-value">{getSolutionName(version.developerId)}</span>
                    </div>
                    <div class="flow-item">
                      <span class="fi-label">停显液</span>
                      <span class="fi-value">{getSolutionName(version.stopBathId)}</span>
                    </div>
                    <div class="flow-item">
                      <span class="fi-label">定影液</span>
                      <span class="fi-value">{getSolutionName(version.fixerId)}</span>
                    </div>
                    <div class="flow-item">
                      <span class="fi-label">润湿液</span>
                      <span class="fi-value">{getSolutionName(version.wettingAgentId)}</span>
                    </div>
                  </div>
                </div>

                <div class="tc-section">
                  <h5>显影参数</h5>
                  <div class="params-grid">
                    {#each Object.entries(version.developmentParams) as [key, value]}
                      <div class="param-row">
                        <span class="p-label">{getParamDiffLabel(key)}</span>
                        <div class="p-bar">
                          <div class="p-fill" style="width: {getParamValue(key, value)}%;"></div>
                        </div>
                        <span class="p-val">
                          {formatParamValue(key, value)}
                        </span>
                      </div>
                    {/each}
                  </div>
                </div>
              </div>

              <div class="tc-actions">
                <button class="btn-small revert" on:click={() => revertToVersion(version)}>
                  ⏪ 回退到此版本
                </button>
              </div>
            </div>
          </div>
        {/each}
      </div>
    {:else}
      <div class="empty-history">
        <div class="empty-icon">📭</div>
        <h4>暂无历史版本</h4>
        <p>编辑并保存配方时，旧版本会自动保存到这里</p>
      </div>
    {/if}
  {:else}
    <div class="empty-history">
      <div class="empty-icon">📋</div>
      <h4>请选择一个配方</h4>
      <p>从上方下拉框选择要查看版本历史的配方</p>
    </div>
  {/if}
</div>

<style>
  .version-history {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .history-header {
    display: flex;
    align-items: center;
  }

  .section-title {
    margin: 0;
    color: #e8c890;
    font-size: 18px;
  }

  .recipe-selector {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 8px;
  }

  .recipe-selector label {
    color: #8a7a5a;
    font-size: 13px;
  }

  .recipe-selector select {
    flex: 1;
    padding: 8px 12px;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(139, 90, 43, 0.3);
    border-radius: 8px;
    color: #e8dcc8;
    font-size: 13px;
    outline: none;
  }

  .recipe-selector select:focus {
    border-color: #d4a574;
  }

  .current-version-info {
    padding: 16px 20px;
    background: linear-gradient(180deg, rgba(45, 26, 18, 0.4), rgba(20, 12, 8, 0.5));
    border: 1px solid rgba(139, 90, 43, 0.25);
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .cvi-header {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .cvi-name {
    color: #e8dcc8;
    font-size: 17px;
    font-weight: 600;
  }

  .process-tag {
    padding: 2px 10px;
    border-radius: 4px;
    color: #fff;
    font-size: 11px;
  }

  .cvi-version {
    margin-left: auto;
    padding: 4px 12px;
    background: rgba(212, 165, 116, 0.15);
    border: 1px solid rgba(212, 165, 116, 0.35);
    border-radius: 6px;
    color: #d4a574;
    font-size: 12px;
    font-weight: 600;
  }

  .cvi-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    color: #6a5a45;
    font-size: 12px;
  }

  .timeline {
    display: flex;
    flex-direction: column;
    padding-left: 28px;
    position: relative;
  }

  .timeline-item {
    display: flex;
    gap: 16px;
    position: relative;
  }

  .timeline-marker {
    position: absolute;
    left: -28px;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .marker-dot {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: linear-gradient(135deg, #d4a574, #8b5a2b);
    border: 2px solid rgba(20, 12, 8, 0.8);
    flex-shrink: 0;
    box-shadow: 0 0 0 3px rgba(212, 165, 116, 0.15);
  }

  .marker-line {
    width: 2px;
    flex: 1;
    min-height: 40px;
    background: linear-gradient(180deg, rgba(139, 90, 43, 0.4), rgba(139, 90, 43, 0.1));
  }

  .timeline-content {
    flex: 1;
    padding: 16px;
    background: linear-gradient(180deg, rgba(45, 26, 18, 0.5), rgba(20, 12, 8, 0.6));
    border: 1px solid rgba(139, 90, 43, 0.2);
    border-radius: 12px;
    margin-bottom: 16px;
  }

  .tc-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 10px;
  }

  .tc-title {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .tc-version {
    padding: 3px 10px;
    background: rgba(126, 200, 160, 0.15);
    border: 1px solid rgba(126, 200, 160, 0.35);
    border-radius: 6px;
    color: #7ec8a0;
    font-size: 12px;
    font-weight: 600;
  }

  .tc-name {
    color: #e8dcc8;
    font-size: 15px;
    font-weight: 500;
  }

  .tc-date {
    color: #6a5a45;
    font-size: 12px;
  }

  .tc-note {
    padding: 10px 14px;
    background: rgba(126, 168, 200, 0.1);
    border-left: 3px solid rgba(126, 168, 200, 0.5);
    border-radius: 0 6px 6px 0;
    color: #9ab8cc;
    font-size: 13px;
    line-height: 1.5;
    margin-bottom: 14px;
  }

  .tc-details {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }

  @media (max-width: 700px) {
    .tc-details {
      grid-template-columns: 1fr;
    }
  }

  .tc-section h5 {
    margin: 0 0 10px;
    color: #c8a878;
    font-size: 12px;
    font-weight: 500;
  }

  .flow-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .flow-item {
    padding: 8px 10px;
    background: rgba(0, 0, 0, 0.25);
    border-radius: 6px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .fi-label {
    color: #6a5a45;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .fi-value {
    color: #c8a878;
    font-size: 12px;
  }

  .params-grid {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .param-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .p-label {
    color: #8a7a5a;
    font-size: 11px;
    width: 45px;
    flex-shrink: 0;
  }

  .p-bar {
    flex: 1;
    height: 5px;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 3px;
    overflow: hidden;
  }

  .p-fill {
    height: 100%;
    background: linear-gradient(90deg, #d4a574, #8b5a2b);
    border-radius: 3px;
  }

  .p-val {
    color: #c8a878;
    font-size: 11px;
    width: 45px;
    text-align: right;
    flex-shrink: 0;
  }

  .tc-actions {
    display: flex;
    justify-content: flex-end;
    padding-top: 12px;
    margin-top: 12px;
    border-top: 1px solid rgba(139, 90, 43, 0.15);
  }

  .btn-small {
    padding: 6px 14px;
    border: none;
    border-radius: 6px;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .btn-small.revert {
    background: rgba(200, 120, 80, 0.2);
    border: 1px solid rgba(200, 120, 80, 0.4);
    color: #e8a078;
  }

  .btn-small.revert:hover {
    background: rgba(200, 120, 80, 0.3);
  }

  .empty-history {
    padding: 48px 24px;
    text-align: center;
    background: linear-gradient(180deg, rgba(45, 26, 18, 0.3), rgba(20, 12, 8, 0.4));
    border: 1px dashed rgba(139, 90, 43, 0.2);
    border-radius: 12px;
  }

  .empty-icon {
    font-size: 48px;
    margin-bottom: 12px;
    opacity: 0.5;
  }

  .empty-history h4 {
    margin: 0 0 8px;
    color: #8a7a5a;
    font-size: 16px;
    font-weight: 500;
  }

  .empty-history p {
    margin: 0;
    color: #5a4a35;
    font-size: 13px;
    line-height: 1.5;
  }
</style>
