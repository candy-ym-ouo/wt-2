<script lang="ts">
  import { gameStore } from '../stores/gameStore';
  import type { DeveloperRecipe, ChemicalSolution, FilmProcessType, SolutionComponent } from '../types/game';
  import { FILM_STOCKS, PHOTO_SUBJECTS, PROCESS_TYPE_LABELS, SOLUTION_TYPE_LABELS, CHEMICAL_TYPE_LABELS, SCENE_TYPE_LABELS, DEFAULT_CHEMICALS } from '../data/gameData';
  import { formatTimeReadable } from '../utils/recipeUtils';
  import { calculateTimings, recipeToDevParams } from '../utils/recipeUtils';

  export let onSelectRecipe: (recipe: DeveloperRecipe) => void;

  let showCreateForm = false;
  let editingRecipe: DeveloperRecipe | null = null;
  let changeNote = '';

  let formName = '';
  let formProcessType: FilmProcessType = 'bw';
  let formDescription = '';
  let formDeveloperId = '';
  let formStopBathId = '';
  let formFixerId = '';
  let formWettingAgentId = '';
  let formTemperature = 0.5;
  let formTimeMultiplier = 1.0;
  let formAgitation = 0.5;
  let formDilution = 0.5;
  let formSuitableFilmIds: string[] = [];
  let formSuitableSceneTypes: string[] = [];
  let formTags = '';

  $: recipes = $gameStore.filmLab.recipes;
  $: solutions = $gameStore.filmLab.solutions;
  $: selectedRecipeId = $gameStore.filmLab.selectedRecipeId;
  $: selectedRecipe = recipes.find(r => r.id === selectedRecipeId) || null;

  $: developerSolution = solutions.find(s => s.id === formDeveloperId) || null;
  $: stopBathSolution = solutions.find(s => s.id === formStopBathId) || null;
  $: fixerSolution = solutions.find(s => s.id === formFixerId) || null;
  $: wettingAgentSolution = solutions.find(s => s.id === formWettingAgentId) || null;

  $: previewParams = recipeToDevParams({
    id: 'preview',
    name: '预览',
    processType: formProcessType,
    description: '',
    developmentParams: {
      temperature: formTemperature,
      timeMultiplier: formTimeMultiplier,
      agitation: formAgitation,
      dilution: formDilution
    },
    suitableFilmIds: [],
    suitableSceneTypes: [],
    tags: [],
    versionHistory: [],
    createdAt: 0,
    updatedAt: 0,
    version: 1
  });

  $: previewTimings = calculateTimings({
    id: 'preview',
    name: '预览',
    processType: formProcessType,
    description: '',
    developmentParams: {
      temperature: formTemperature,
      timeMultiplier: formTimeMultiplier,
      agitation: formAgitation,
      dilution: formDilution
    },
    suitableFilmIds: [],
    suitableSceneTypes: [],
    tags: [],
    versionHistory: [],
    createdAt: 0,
    updatedAt: 0,
    version: 1
  });

  function openCreateForm() {
    resetForm();
    showCreateForm = true;
    editingRecipe = null;
  }

  function openEditForm(recipe: DeveloperRecipe) {
    formName = recipe.name;
    formProcessType = recipe.processType;
    formDescription = recipe.description;
    formDeveloperId = recipe.developerId || '';
    formStopBathId = recipe.stopBathId || '';
    formFixerId = recipe.fixerId || '';
    formWettingAgentId = recipe.wettingAgentId || '';
    formTemperature = recipe.developmentParams.temperature;
    formTimeMultiplier = recipe.developmentParams.timeMultiplier;
    formAgitation = recipe.developmentParams.agitation;
    formDilution = recipe.developmentParams.dilution;
    formSuitableFilmIds = [...recipe.suitableFilmIds];
    formSuitableSceneTypes = [...recipe.suitableSceneTypes];
    formTags = recipe.tags.join(', ');
    changeNote = '';
    showCreateForm = true;
    editingRecipe = recipe;
  }

  function resetForm() {
    formName = '';
    formProcessType = 'bw';
    formDescription = '';
    formDeveloperId = '';
    formStopBathId = '';
    formFixerId = '';
    formWettingAgentId = '';
    formTemperature = 0.5;
    formTimeMultiplier = 1.0;
    formAgitation = 0.5;
    formDilution = 0.5;
    formSuitableFilmIds = [];
    formSuitableSceneTypes = [];
    formTags = '';
    changeNote = '';
  }

  function closeForm() {
    showCreateForm = false;
    editingRecipe = null;
    resetForm();
  }

  function toggleFilmId(filmId: string) {
    if (formSuitableFilmIds.includes(filmId)) {
      formSuitableFilmIds = formSuitableFilmIds.filter(id => id !== filmId);
    } else {
      formSuitableFilmIds = [...formSuitableFilmIds, filmId];
    }
  }

  function toggleSceneType(sceneType: string) {
    if (formSuitableSceneTypes.includes(sceneType)) {
      formSuitableSceneTypes = formSuitableSceneTypes.filter(t => t !== sceneType);
    } else {
      formSuitableSceneTypes = [...formSuitableSceneTypes, sceneType];
    }
  }

  function handleSubmit() {
    if (!formName.trim()) return;

    const tags = formTags.split(',').map(t => t.trim()).filter(t => t);

    if (editingRecipe) {
      gameStore.updateRecipe(editingRecipe.id, {
        name: formName.trim(),
        processType: formProcessType,
        description: formDescription.trim(),
        developerId: formDeveloperId || undefined,
        stopBathId: formStopBathId || undefined,
        fixerId: formFixerId || undefined,
        wettingAgentId: formWettingAgentId || undefined,
        developmentParams: {
          temperature: formTemperature,
          timeMultiplier: formTimeMultiplier,
          agitation: formAgitation,
          dilution: formDilution
        },
        suitableFilmIds: formSuitableFilmIds,
        suitableSceneTypes: formSuitableSceneTypes,
        tags
      }, changeNote.trim() || undefined);
    } else {
      gameStore.createRecipe({
        name: formName.trim(),
        processType: formProcessType,
        description: formDescription.trim(),
        developerId: formDeveloperId || undefined,
        stopBathId: formStopBathId || undefined,
        fixerId: formFixerId || undefined,
        wettingAgentId: formWettingAgentId || undefined,
        developmentParams: {
          temperature: formTemperature,
          timeMultiplier: formTimeMultiplier,
          agitation: formAgitation,
          dilution: formDilution
        },
        suitableFilmIds: formSuitableFilmIds,
        suitableSceneTypes: formSuitableSceneTypes,
        tags
      });
    }
    closeForm();
  }

  function handleDelete(recipe: DeveloperRecipe) {
    if (recipe.isDefault) return;
    if (!confirm(`确定要删除配方「${recipe.name}」吗？`)) return;
    gameStore.deleteRecipe(recipe.id);
  }

  function handleApply(recipe: DeveloperRecipe) {
    gameStore.applyRecipeToParams(recipe.id);
  }

  function getFilmName(filmId: string): string {
    return FILM_STOCKS.find(f => f.id === filmId)?.name || filmId;
  }

  function getSolutionName(solutionId?: string): string {
    if (!solutionId) return '未配置';
    return solutions.find(s => s.id === solutionId)?.name || solutionId;
  }

  function formatDate(ts: number): string {
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  const processTypeColors: Record<FilmProcessType, string> = {
    bw: '#6b7280',
    c41: '#c9a87c',
    e6: '#7ec8a0',
    custom: '#a78bfa'
  };

  const allSceneTypes = ['portrait', 'landscape', 'street', 'still_life', 'night'];
</script>

<div class="recipe-manager">
  <div class="manager-header">
    <div class="header-left">
      <h3 class="section-title">📋 显影配方管理</h3>
      <span class="recipe-count">共 {recipes.length} 个配方</span>
    </div>
    <button class="btn-primary" on:click={openCreateForm}>
      ➕ 新建配方
    </button>
  </div>

  <div class="recipe-grid">
    {#each recipes as recipe (recipe.id)}
      <div
        class="recipe-card {selectedRecipeId === recipe.id ? 'selected' : ''} {recipe.isDefault ? 'default' : ''}"
        on:click={() => { gameStore.selectRecipe(recipe.id); onSelectRecipe(recipe); }}
      >
        <div class="recipe-card-header">
          <span class="process-badge" style="background: {processTypeColors[recipe.processType]};">
            {PROCESS_TYPE_LABELS[recipe.processType]}
          </span>
          {#if recipe.isDefault}
            <span class="default-badge">系统预设</span>
          {/if}
          <span class="version-badge">v{recipe.version}</span>
        </div>
        <h4 class="recipe-name">{recipe.name}</h4>
        <p class="recipe-desc">{recipe.description}</p>
        <div class="recipe-tags">
          {#each recipe.tags.slice(0, 4) as tag}
            <span class="tag">{tag}</span>
          {/each}
          {#if recipe.tags.length > 4}
            <span class="tag-more">+{recipe.tags.length - 4}</span>
          {/if}
        </div>
        <div class="recipe-meta">
          <div class="meta-item">
            <span class="meta-label">适用于</span>
            <span class="meta-value">{recipe.suitableFilmIds.length} 种胶片</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">场景</span>
            <span class="meta-value">{recipe.suitableSceneTypes.length} 类</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">更新时间</span>
            <span class="meta-value">{formatDate(recipe.updatedAt)}</span>
          </div>
        </div>
        <div class="recipe-actions" on:click|stopPropagation>
          <button class="btn-small apply" on:click={() => handleApply(recipe)} title="应用到当前参数">
            🎯 应用
          </button>
          {#if !recipe.isDefault}
            <button class="btn-small edit" on:click={() => openEditForm(recipe)} title="编辑">
              ✏️
            </button>
            <button class="btn-small delete" on:click={() => handleDelete(recipe)} title="删除">
              🗑️
            </button>
          {/if}
        </div>
      </div>
    {/each}
  </div>

  {#if selectedRecipe}
    <div class="recipe-detail">
      <h4 class="detail-title">📝 配方详情：{selectedRecipe.name}</h4>
      <div class="detail-grid">
        <div class="detail-section">
          <h5>工艺流程</h5>
          <div class="process-flow">
            <div class="flow-item">
              <span class="flow-label">显影液</span>
              <span class="flow-value">{getSolutionName(selectedRecipe.developerId)}</span>
            </div>
            <div class="flow-arrow">→</div>
            <div class="flow-item">
              <span class="flow-label">停显液</span>
              <span class="flow-value">{getSolutionName(selectedRecipe.stopBathId)}</span>
            </div>
            <div class="flow-arrow">→</div>
            <div class="flow-item">
              <span class="flow-label">定影液</span>
              <span class="flow-value">{getSolutionName(selectedRecipe.fixerId)}</span>
            </div>
            <div class="flow-arrow">→</div>
            <div class="flow-item">
              <span class="flow-label">润湿液</span>
              <span class="flow-value">{getSolutionName(selectedRecipe.wettingAgentId)}</span>
            </div>
          </div>
        </div>
        <div class="detail-section">
          <h5>显影参数</h5>
          <div class="params-grid">
            <div class="param-row">
              <span>温度系数</span>
              <div class="param-bar">
                <div class="param-fill" style="width: {selectedRecipe.developmentParams.temperature * 100}%"></div>
              </div>
              <span class="param-val">{Math.round(selectedRecipe.developmentParams.temperature * 100)}%</span>
            </div>
            <div class="param-row">
              <span>时间系数</span>
              <div class="param-bar">
                <div class="param-fill" style="width: {Math.min(selectedRecipe.developmentParams.timeMultiplier / 2 * 100, 100)}%"></div>
              </div>
              <span class="param-val">×{selectedRecipe.developmentParams.timeMultiplier.toFixed(2)}</span>
            </div>
            <div class="param-row">
              <span>搅动强度</span>
              <div class="param-bar">
                <div class="param-fill" style="width: {selectedRecipe.developmentParams.agitation * 100}%"></div>
              </div>
              <span class="param-val">{Math.round(selectedRecipe.developmentParams.agitation * 100)}%</span>
            </div>
            <div class="param-row">
              <span>稀释度</span>
              <div class="param-bar">
                <div class="param-fill" style="width: {selectedRecipe.developmentParams.dilution * 100}%"></div>
              </div>
              <span class="param-val">{Math.round(selectedRecipe.developmentParams.dilution * 100)}%</span>
            </div>
          </div>
        </div>
        <div class="detail-section">
          <h5>适用胶片</h5>
          <div class="film-list">
            {#each selectedRecipe.suitableFilmIds as filmId}
              <span class="film-chip">{getFilmName(filmId)}</span>
            {:else}
              <span class="empty-text">未指定</span>
            {/each}
          </div>
        </div>
        <div class="detail-section">
          <h5>适用场景</h5>
          <div class="scene-list">
            {#each selectedRecipe.suitableSceneTypes as sceneType}
              <span class="scene-chip">{SCENE_TYPE_LABELS[sceneType] || sceneType}</span>
            {:else}
              <span class="empty-text">未指定</span>
            {/each}
          </div>
        </div>
      </div>
    </div>
  {/if}

  {#if showCreateForm}
    <div class="modal-overlay" on:click={closeForm}>
      <div class="modal-content large" on:click|stopPropagation>
        <div class="modal-header">
          <h3>{editingRecipe ? '✏️ 编辑配方' : '➕ 新建配方'}</h3>
          <button class="close-btn" on:click={closeForm}>✕</button>
        </div>
        <div class="modal-body">
          <div class="form-row">
            <label>配方名称 *</label>
            <input type="text" bind:value={formName} placeholder="例如：D-76 高反差配方" />
          </div>
          <div class="form-row">
            <label>工艺类型</label>
            <select bind:value={formProcessType}>
              <option value="bw">黑白</option>
              <option value="c41">C-41彩色</option>
              <option value="e6">E-6反转</option>
              <option value="custom">自定义</option>
            </select>
          </div>
          <div class="form-row">
            <label>配方描述</label>
            <textarea bind:value={formDescription} rows="2" placeholder="简要描述配方特点和适用情况"></textarea>
          </div>

          <div class="form-section-title">🧪 药液配置</div>
          <div class="form-grid-2">
            <div class="form-row">
              <label>显影液</label>
              <select bind:value={formDeveloperId}>
                <option value="">未选择</option>
                {#each solutions.filter(s => s.type === 'developer') as s}
                  <option value={s.id}>{s.name}</option>
                {/each}
              </select>
            </div>
            <div class="form-row">
              <label>停显液</label>
              <select bind:value={formStopBathId}>
                <option value="">未选择</option>
                {#each solutions.filter(s => s.type === 'stop_bath') as s}
                  <option value={s.id}>{s.name}</option>
                {/each}
              </select>
            </div>
            <div class="form-row">
              <label>定影液</label>
              <select bind:value={formFixerId}>
                <option value="">未选择</option>
                {#each solutions.filter(s => s.type === 'fixer') as s}
                  <option value={s.id}>{s.name}</option>
                {/each}
              </select>
            </div>
            <div class="form-row">
              <label>润湿液</label>
              <select bind:value={formWettingAgentId}>
                <option value="">未选择</option>
                {#each solutions.filter(s => s.type === 'wetting_agent') as s}
                  <option value={s.id}>{s.name}</option>
                {/each}
              </select>
            </div>
          </div>

          <div class="form-section-title">⚙️ 显影参数</div>
          <div class="form-grid-2">
            <div class="form-row">
              <label>温度系数：{Math.round(formTemperature * 100)}%</label>
              <input type="range" min="0" max="1" step="0.01" bind:value={formTemperature} />
            </div>
            <div class="form-row">
              <label>时间系数：×{formTimeMultiplier.toFixed(2)}</label>
              <input type="range" min="0.3" max="2" step="0.05" bind:value={formTimeMultiplier} />
            </div>
            <div class="form-row">
              <label>搅动强度：{Math.round(formAgitation * 100)}%</label>
              <input type="range" min="0" max="1" step="0.01" bind:value={formAgitation} />
            </div>
            <div class="form-row">
              <label>稀释度：{Math.round(formDilution * 100)}%</label>
              <input type="range" min="0" max="1" step="0.01" bind:value={formDilution} />
            </div>
          </div>

          <div class="preview-box">
            <span class="preview-label">⏱️ 预计总耗时：</span>
            <span class="preview-value">{formatTimeReadable(previewTimings.total)}</span>
          </div>

          <div class="form-section-title">🎞️ 适用胶片</div>
          <div class="chip-group">
            {#each FILM_STOCKS as film}
              <label class="chip-option {formSuitableFilmIds.includes(film.id) ? 'active' : ''}">
                <input type="checkbox" checked={formSuitableFilmIds.includes(film.id)} on:change={() => toggleFilmId(film.id)} />
                {film.name}
              </label>
            {/each}
          </div>

          <div class="form-section-title">📷 适用场景</div>
          <div class="chip-group">
            {#each allSceneTypes as st}
              <label class="chip-option {formSuitableSceneTypes.includes(st) ? 'active' : ''}">
                <input type="checkbox" checked={formSuitableSceneTypes.includes(st)} on:change={() => toggleSceneType(st)} />
                {SCENE_TYPE_LABELS[st]}
              </label>
            {/each}
          </div>

          <div class="form-row">
            <label>标签（逗号分隔）</label>
            <input type="text" bind:value={formTags} placeholder="例如：经典,高反差,街头" />
          </div>

          {#if editingRecipe}
            <div class="form-row">
              <label>变更说明</label>
              <input type="text" bind:value={changeNote} placeholder="说明本次修改内容" />
            </div>
          {/if}
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" on:click={closeForm}>取消</button>
          <button class="btn-primary" on:click={handleSubmit} disabled={!formName.trim()}>
            {editingRecipe ? '保存修改' : '创建配方'}
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .recipe-manager {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .manager-header {
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

  .recipe-count {
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

  .btn-secondary:hover {
    background: rgba(139, 90, 43, 0.3);
  }

  .btn-small {
    padding: 4px 10px;
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

  .btn-small.edit {
    background: rgba(139, 90, 43, 0.3);
    color: #c8a878;
  }

  .btn-small.delete {
    background: rgba(200, 80, 80, 0.3);
    color: #e88888;
  }

  .recipe-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 16px;
  }

  .recipe-card {
    padding: 16px;
    background: linear-gradient(180deg, rgba(45, 26, 18, 0.5), rgba(20, 12, 8, 0.6));
    border: 1px solid rgba(139, 90, 43, 0.2);
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .recipe-card:hover {
    border-color: rgba(212, 165, 116, 0.5);
    transform: translateY(-2px);
  }

  .recipe-card.selected {
    border-color: #d4a574;
    box-shadow: 0 0 20px rgba(212, 165, 116, 0.2);
  }

  .recipe-card.default {
    border-left: 3px solid #7ec8a0;
  }

  .recipe-card-header {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .process-badge {
    padding: 2px 8px;
    border-radius: 4px;
    color: #fff;
    font-size: 11px;
    font-weight: 500;
  }

  .default-badge {
    padding: 2px 8px;
    background: rgba(126, 200, 160, 0.2);
    border: 1px solid rgba(126, 200, 160, 0.4);
    border-radius: 4px;
    color: #7ec8a0;
    font-size: 11px;
  }

  .version-badge {
    padding: 2px 6px;
    background: rgba(139, 90, 43, 0.2);
    border-radius: 4px;
    color: #a08060;
    font-size: 11px;
    margin-left: auto;
  }

  .recipe-name {
    margin: 0;
    color: #e8dcc8;
    font-size: 15px;
    font-weight: 600;
  }

  .recipe-desc {
    margin: 0;
    color: #8a7a5a;
    font-size: 12px;
    line-height: 1.5;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .recipe-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .tag {
    padding: 2px 8px;
    background: rgba(139, 90, 43, 0.2);
    border-radius: 4px;
    color: #a08060;
    font-size: 11px;
  }

  .tag-more {
    padding: 2px 6px;
    color: #7a6a55;
    font-size: 11px;
  }

  .recipe-meta {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    padding-top: 8px;
    border-top: 1px solid rgba(139, 90, 43, 0.15);
  }

  .meta-item {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .meta-label {
    color: #6a5a45;
    font-size: 10px;
  }

  .meta-value {
    color: #b89878;
    font-size: 12px;
  }

  .recipe-actions {
    display: flex;
    gap: 6px;
    margin-top: auto;
    padding-top: 8px;
  }

  .recipe-detail {
    padding: 20px;
    background: linear-gradient(180deg, rgba(45, 26, 18, 0.4), rgba(20, 12, 8, 0.5));
    border: 1px solid rgba(139, 90, 43, 0.2);
    border-radius: 12px;
  }

  .detail-title {
    margin: 0 0 16px;
    color: #e8c890;
    font-size: 16px;
  }

  .detail-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
  }

  @media (max-width: 768px) {
    .detail-grid {
      grid-template-columns: 1fr;
    }
  }

  .detail-section h5 {
    margin: 0 0 12px;
    color: #c8a878;
    font-size: 13px;
    font-weight: 500;
  }

  .process-flow {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
  }

  .flow-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 8px 12px;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 8px;
  }

  .flow-label {
    color: #6a5a45;
    font-size: 10px;
  }

  .flow-value {
    color: #d4b890;
    font-size: 12px;
    font-weight: 500;
  }

  .flow-arrow {
    color: #6a5a45;
    font-size: 16px;
  }

  .params-grid {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .param-row {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .param-row span:first-child {
    color: #8a7a5a;
    font-size: 12px;
    width: 70px;
    flex-shrink: 0;
  }

  .param-bar {
    flex: 1;
    height: 6px;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 3px;
    overflow: hidden;
  }

  .param-fill {
    height: 100%;
    background: linear-gradient(90deg, #d4a574, #8b5a2b);
    border-radius: 3px;
    transition: width 0.3s ease;
  }

  .param-val {
    color: #c8a878;
    font-size: 12px;
    width: 50px;
    text-align: right;
    flex-shrink: 0;
  }

  .film-list, .scene-list {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .film-chip, .scene-chip {
    padding: 4px 10px;
    background: rgba(126, 200, 160, 0.15);
    border: 1px solid rgba(126, 200, 160, 0.3);
    border-radius: 6px;
    color: #7ec8a0;
    font-size: 12px;
  }

  .empty-text {
    color: #5a4a35;
    font-size: 12px;
  }

  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(8px);
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }

  .modal-content {
    background: linear-gradient(180deg, #1a0f08, #0d0704);
    border: 1px solid rgba(139, 90, 43, 0.3);
    border-radius: 16px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    width: 100%;
    max-width: 560px;
  }

  .modal-content.large {
    max-width: 720px;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid rgba(139, 90, 43, 0.2);
  }

  .modal-header h3 {
    margin: 0;
    color: #e8c890;
    font-size: 18px;
  }

  .close-btn {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: rgba(139, 90, 43, 0.2);
    border: none;
    color: #c8a878;
    font-size: 16px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .close-btn:hover {
    background: rgba(200, 80, 80, 0.3);
    color: #e88888;
  }

  .modal-body {
    padding: 20px;
    overflow-y: auto;
    flex: 1;
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    padding: 16px 20px;
    border-top: 1px solid rgba(139, 90, 43, 0.2);
  }

  .form-row {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 14px;
  }

  .form-row label {
    color: #8a7a5a;
    font-size: 12px;
  }

  .form-row input,
  .form-row select,
  .form-row textarea {
    padding: 8px 12px;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(139, 90, 43, 0.3);
    border-radius: 8px;
    color: #e8dcc8;
    font-size: 13px;
    outline: none;
    transition: border-color 0.2s ease;
  }

  .form-row input:focus,
  .form-row select:focus,
  .form-row textarea:focus {
    border-color: #d4a574;
  }

  .form-row textarea {
    resize: vertical;
    font-family: inherit;
  }

  .form-row input[type="range"] {
    padding: 0;
    background: transparent;
  }

  .form-section-title {
    color: #d4a574;
    font-size: 14px;
    font-weight: 600;
    margin: 20px 0 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid rgba(139, 90, 43, 0.2);
  }

  .form-grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
  }

  @media (max-width: 600px) {
    .form-grid-2 {
      grid-template-columns: 1fr;
    }
  }

  .preview-box {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px;
    background: rgba(126, 200, 160, 0.1);
    border: 1px solid rgba(126, 200, 160, 0.25);
    border-radius: 8px;
    margin-bottom: 14px;
  }

  .preview-label {
    color: #8a7a5a;
    font-size: 13px;
  }

  .preview-value {
    color: #7ec8a0;
    font-size: 16px;
    font-weight: 600;
  }

  .chip-group {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 14px;
  }

  .chip-option {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(139, 90, 43, 0.25);
    border-radius: 6px;
    color: #8a7a5a;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .chip-option input {
    display: none;
  }

  .chip-option.active {
    background: rgba(212, 165, 116, 0.15);
    border-color: rgba(212, 165, 116, 0.5);
    color: #d4b890;
  }
</style>
