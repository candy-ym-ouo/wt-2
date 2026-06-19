<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { gameStore } from '../stores/gameStore';
  import type { ParamPreset, DevParams, PresetHistory } from '../types/game';

  export let currentParams: DevParams;
  export let subjectId: string | null = null;
  export let filmId: string | null = null;
  export let disabled: boolean = false;

  const dispatch = createEventDispatcher<{
    apply: DevParams;
  }>();

  let showPresets = false;
  let showSaveDialog = false;
  let presetName = '';
  let presetDescription = '';
  let showOverwriteConfirm = false;
  let existingPresetToOverwrite: ParamPreset | null = null;
  let showHistory = false;
  let selectedPresetForHistory: ParamPreset | null = null;

  $: presets = $gameStore.presets;
  $: presetHistory = $gameStore.presetHistory;
  $: lastAppliedPresetId = $gameStore.lastAppliedPresetId;

  $: sortedPresets = [...presets].sort((a, b) => {
    if (a.isDefault && !b.isDefault) return -1;
    if (!a.isDefault && b.isDefault) return 1;
    return b.updatedAt - a.updatedAt;
  });

  $: userPresets = presets.filter(p => !p.isDefault);

  function formatDate(ts: number): string {
    return new Date(ts).toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function getPresetHistory(presetId: string): PresetHistory[] {
    return presetHistory.filter(h => h.presetId === presetId);
  }

  function canRevert(presetId: string): boolean {
    return getPresetHistory(presetId).length > 0;
  }

  function applyPreset(preset: ParamPreset) {
    gameStore.applyPreset(preset.id);
    dispatch('apply', { ...preset.params });
    showPresets = false;
  }

  function openSaveDialog() {
    presetName = '';
    presetDescription = '';
    showOverwriteConfirm = false;
    existingPresetToOverwrite = null;
    showSaveDialog = true;
  }

  function checkAndSavePreset() {
    if (!presetName.trim()) return;

    const existing = userPresets.find(p => p.name === presetName.trim());
    if (existing) {
      existingPresetToOverwrite = existing;
      showOverwriteConfirm = true;
    } else {
      doSavePreset(false);
    }
  }

  function doSavePreset(overwrite: boolean) {
    if (!presetName.trim()) return;

    gameStore.savePreset(
      presetName.trim(),
      presetDescription.trim(),
      currentParams,
      subjectId || undefined,
      filmId || undefined
    );

    showSaveDialog = false;
    showOverwriteConfirm = false;
    presetName = '';
    presetDescription = '';
    existingPresetToOverwrite = null;
  }

  function cancelOverwrite() {
    showOverwriteConfirm = false;
    existingPresetToOverwrite = null;
  }

  function deletePreset(preset: ParamPreset, e: Event) {
    e.stopPropagation();
    if (preset.isDefault) return;
    if (confirm(`确定要删除预设「${preset.name}」吗？`)) {
      gameStore.deletePreset(preset.id);
    }
  }

  function openHistory(preset: ParamPreset, e: Event) {
    e.stopPropagation();
    selectedPresetForHistory = preset;
    showHistory = true;
  }

  function revertToHistory(history: PresetHistory) {
    if (!selectedPresetForHistory) return;
    if (confirm(`确定要将「${selectedPresetForHistory.name}」回退到 ${formatDate(history.timestamp)} 的版本吗？`)) {
      gameStore.revertPreset(history.presetId, history.timestamp);
      showHistory = false;
      selectedPresetForHistory = null;
    }
  }

  function closeHistory() {
    showHistory = false;
    selectedPresetForHistory = null;
  }

  function getParamSummary(params: DevParams): string {
    return [
      `曝光 ${Math.round(params.exposure * 100)}`,
      `对比 ${Math.round(params.contrast * 100)}`,
      `饱和 ${Math.round(params.saturation * 100)}`,
      `时间 ${Math.round(params.developmentTime * 100)}`
    ].join(' · ');
  }
</script>

<div class="presets-container">
  <div class="presets-header">
    <h3 class="title">参数预设</h3>
    <div class="header-actions">
      <button
        class="preset-toggle"
        class:active={showPresets}
        on:click={() => showPresets = !showPresets}
        disabled={disabled}
      >
        <span>{showPresets ? '收起' : '展开'}</span>
        <span class="toggle-icon">{showPresets ? '▲' : '▼'}</span>
      </button>
      <button
        class="save-preset-btn"
        on:click={openSaveDialog}
        disabled={disabled}
        title="保存当前参数为预设"
      >
        <span>💾</span>
        <span>保存</span>
      </button>
    </div>
  </div>

  {#if showPresets}
    <div class="presets-list">
      {#each sortedPresets as preset (preset.id)}
        <div
          class="preset-card"
          class:active={lastAppliedPresetId === preset.id}
          class:default={preset.isDefault}
          on:click={() => applyPreset(preset)}
        >
          <div class="preset-main">
            <div class="preset-name">
              {#if preset.isDefault}
                <span class="default-badge">默认</span>
              {/if}
              {preset.name}
              {#if lastAppliedPresetId === preset.id}
                <span class="applied-badge">✓ 已应用</span>
              {/if}
            </div>
            <div class="preset-desc">{preset.description}</div>
            <div class="preset-params">{getParamSummary(preset.params)}</div>
          </div>
          <div class="preset-meta">
            <span class="preset-version">v{preset.version}</span>
            <span class="preset-date">{formatDate(preset.updatedAt)}</span>
          </div>
          <div class="preset-actions">
            {#if !preset.isDefault}
              <button
                class="action-btn revert"
                on:click={(e) => openHistory(preset, e)}
                disabled={!canRevert(preset.id)}
                title={canRevert(preset.id) ? '查看历史版本' : '暂无历史版本'}
              >
                ↩
              </button>
              <button
                class="action-btn delete"
                on:click={(e) => deletePreset(preset, e)}
                title="删除预设"
              >
                🗑
              </button>
            {/if}
          </div>
        </div>
      {/each}

      {#if presets.length === 0}
        <div class="empty-presets">
          <div class="empty-icon">📋</div>
          <div class="empty-text">暂无预设方案</div>
          <div class="empty-hint">点击「保存」按钮创建你的第一个预设</div>
        </div>
      {/if}
    </div>
  {/if}
</div>

{#if showSaveDialog}
  <div class="modal-overlay" on:click={() => { showSaveDialog = false; showOverwriteConfirm = false; }}>
    <div class="modal-content" on:click|stopPropagation>
      <h3 class="modal-title">保存参数预设</h3>
      
      {#if !showOverwriteConfirm}
        <div class="form-group">
          <label class="form-label">预设名称</label>
          <input
            type="text"
            class="form-input"
            bind:value={presetName}
            placeholder="输入预设名称..."
            maxlength={20}
            autofocus
          />
        </div>
        <div class="form-group">
          <label class="form-label">描述（可选）</label>
          <textarea
            class="form-textarea"
            bind:value={presetDescription}
            placeholder="简单描述这个预设的用途..."
            rows={2}
            maxlength={100}
          />
        </div>
        <div class="form-preview">
          <div class="preview-label">当前参数：</div>
          <div class="preview-content">{getParamSummary(currentParams)}</div>
        </div>
        <div class="modal-actions">
          <button class="btn cancel" on:click={() => showSaveDialog = false}>取消</button>
          <button
            class="btn confirm"
            on:click={checkAndSavePreset}
            disabled={!presetName.trim()}
          >
            保存
          </button>
        </div>
      {:else}
        <div class="overwrite-warning">
          <div class="warning-icon">⚠️</div>
          <div class="warning-text">
            <p>预设名称「<strong>{existingPresetToOverwrite?.name}</strong>」已存在</p>
            <p class="warning-desc">是否覆盖现有预设？覆盖后原版本将保存到历史记录。</p>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn cancel" on:click={cancelOverwrite}>重新命名</button>
          <button class="btn danger" on:click={() => doSavePreset(true)}>确认覆盖</button>
        </div>
      {/if}
    </div>
  </div>
{/if}

{#if showHistory && selectedPresetForHistory}
  <div class="modal-overlay" on:click={closeHistory}>
    <div class="modal-content history-modal" on:click|stopPropagation>
      <div class="modal-header">
        <h3 class="modal-title">「{selectedPresetForHistory.name}」历史版本</h3>
        <button class="close-btn" on:click={closeHistory}>✕</button>
      </div>
      
      <div class="history-list">
        <div class="history-item current">
          <div class="history-header">
            <span class="version-tag">当前版本 v{selectedPresetForHistory.version}</span>
            <span class="history-date">{formatDate(selectedPresetForHistory.updatedAt)}</span>
          </div>
          <div class="history-params">{getParamSummary(selectedPresetForHistory.params)}</div>
        </div>

        {#each getPresetHistory(selectedPresetForHistory.id) as history (history.timestamp)}
          <div class="history-item">
            <div class="history-header">
              <span class="version-tag">历史版本</span>
              <span class="history-date">{formatDate(history.timestamp)}</span>
            </div>
            <div class="history-params">{getParamSummary(history.params)}</div>
            <button class="revert-btn" on:click={() => revertToHistory(history)}>
              ↩ 回退到此版本
            </button>
          </div>
        {/each}

        {#if getPresetHistory(selectedPresetForHistory.id).length === 0}
          <div class="empty-history">
            <div class="empty-icon">📜</div>
            <div class="empty-text">暂无历史版本</div>
            <div class="empty-hint">每次覆盖预设时，旧版本会自动保存到这里</div>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .presets-container {
    background: linear-gradient(180deg, rgba(45, 26, 18, 0.8) 0%, rgba(26, 15, 10, 0.9) 100%);
    border: 1px solid rgba(139, 90, 43, 0.25);
    border-radius: 12px;
    padding: 14px 18px;
    backdrop-filter: blur(10px);
    margin-top: 16px;
  }

  .presets-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }

  .title {
    font-size: 15px;
    font-weight: 600;
    color: #d4a574;
    margin: 0;
    letter-spacing: 2px;
  }

  .header-actions {
    display: flex;
    gap: 8px;
  }

  .preset-toggle {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px 12px;
    background: rgba(139, 90, 43, 0.15);
    border: 1px solid rgba(139, 90, 43, 0.25);
    border-radius: 6px;
    color: #a89878;
    font-size: 11px;
    transition: all 0.2s;
  }

  .preset-toggle:hover:not(:disabled) {
    background: rgba(139, 90, 43, 0.25);
    color: #d4c090;
  }

  .preset-toggle.active {
    background: rgba(139, 90, 43, 0.3);
    color: #f0d8a8;
  }

  .preset-toggle:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .toggle-icon {
    font-size: 9px;
    opacity: 0.7;
  }

  .save-preset-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px 12px;
    background: linear-gradient(135deg, rgba(104, 200, 136, 0.2), rgba(80, 160, 120, 0.15));
    border: 1px solid rgba(104, 200, 136, 0.3);
    border-radius: 6px;
    color: #8ad8a0;
    font-size: 11px;
    transition: all 0.2s;
  }

  .save-preset-btn:hover:not(:disabled) {
    background: linear-gradient(135deg, rgba(104, 200, 136, 0.3), rgba(80, 160, 120, 0.25));
    transform: translateY(-1px);
  }

  .save-preset-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .presets-list {
    max-height: 320px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding-right: 4px;
    animation: slideDown 0.3s ease;
  }

  @keyframes slideDown {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .preset-card {
    position: relative;
    padding: 10px 12px;
    background: rgba(0, 0, 0, 0.25);
    border: 1px solid rgba(139, 90, 43, 0.15);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: flex-start;
    gap: 10px;
  }

  .preset-card:hover {
    border-color: rgba(200, 150, 80, 0.35);
    background: rgba(139, 90, 43, 0.1);
    transform: translateX(2px);
  }

  .preset-card.active {
    border-color: rgba(104, 200, 136, 0.5);
    background: rgba(104, 200, 136, 0.08);
  }

  .preset-card.default {
    border-left: 3px solid rgba(139, 90, 43, 0.5);
  }

  .preset-main {
    flex: 1;
    min-width: 0;
  }

  .preset-name {
    font-size: 13px;
    font-weight: 500;
    color: #c8b898;
    margin-bottom: 4px;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .preset-card.active .preset-name {
    color: #8ad8a0;
  }

  .default-badge {
    font-size: 9px;
    padding: 1px 6px;
    background: rgba(139, 90, 43, 0.25);
    border: 1px solid rgba(139, 90, 43, 0.35);
    border-radius: 8px;
    color: #a88860;
  }

  .applied-badge {
    font-size: 9px;
    padding: 1px 6px;
    background: rgba(104, 200, 136, 0.15);
    border: 1px solid rgba(104, 200, 136, 0.3);
    border-radius: 8px;
    color: #68c888;
  }

  .preset-desc {
    font-size: 11px;
    color: #7a6a55;
    margin-bottom: 4px;
    line-height: 1.4;
  }

  .preset-params {
    font-size: 10px;
    color: #5a4a35;
    font-family: 'SF Mono', Monaco, monospace;
  }

  .preset-meta {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
  }

  .preset-version {
    font-size: 10px;
    color: #6a5a45;
    font-family: 'SF Mono', Monaco, monospace;
  }

  .preset-date {
    font-size: 9px;
    color: #5a4a35;
  }

  .preset-actions {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .action-btn {
    width: 24px;
    height: 24px;
    border-radius: 4px;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(100, 100, 100, 0.2);
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .action-btn:hover:not(:disabled) {
    transform: scale(1.1);
  }

  .action-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .action-btn.revert {
    color: #8ad8a0;
    border-color: rgba(104, 200, 136, 0.2);
  }

  .action-btn.revert:hover:not(:disabled) {
    background: rgba(104, 200, 136, 0.15);
  }

  .action-btn.delete {
    color: #e08080;
    border-color: rgba(200, 80, 80, 0.2);
  }

  .action-btn.delete:hover:not(:disabled) {
    background: rgba(200, 80, 80, 0.15);
  }

  .empty-presets, .empty-history {
    padding: 30px 20px;
    text-align: center;
  }

  .empty-icon {
    font-size: 36px;
    opacity: 0.4;
    margin-bottom: 8px;
  }

  .empty-text {
    font-size: 13px;
    color: #8a7a5a;
    margin-bottom: 4px;
  }

  .empty-hint {
    font-size: 11px;
    color: #5a4a35;
  }

  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(8px);
    z-index: 500;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    animation: fadeIn 0.2s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .modal-content {
    background: linear-gradient(180deg, rgba(60, 35, 25, 0.98), rgba(40, 22, 15, 0.98));
    border: 1px solid rgba(139, 90, 43, 0.3);
    border-radius: 12px;
    padding: 24px;
    width: 100%;
    max-width: 400px;
    animation: slideUp 0.3s ease;
  }

  @keyframes slideUp {
    from { transform: translateY(20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
  }

  .modal-title {
    font-size: 16px;
    color: #e0c0a0;
    margin: 0;
  }

  .close-btn {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: rgba(100, 100, 100, 0.2);
    color: #a89878;
    font-size: 14px;
    border: 1px solid rgba(100, 100, 100, 0.3);
    cursor: pointer;
    transition: all 0.2s;
  }

  .close-btn:hover {
    background: rgba(160, 80, 80, 0.2);
    color: #e08080;
  }

  .form-group {
    margin-bottom: 14px;
  }

  .form-label {
    display: block;
    font-size: 12px;
    color: #8a7a5a;
    margin-bottom: 6px;
    letter-spacing: 1px;
  }

  .form-input, .form-textarea {
    width: 100%;
    padding: 10px 12px;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(139, 90, 43, 0.25);
    border-radius: 6px;
    color: #e0d0b0;
    font-size: 13px;
    font-family: inherit;
    transition: border-color 0.2s;
    resize: none;
  }

  .form-input:focus, .form-textarea:focus {
    outline: none;
    border-color: rgba(200, 150, 80, 0.5);
  }

  .form-textarea {
    line-height: 1.5;
  }

  .form-preview {
    padding: 12px;
    background: rgba(0, 0, 0, 0.25);
    border-radius: 6px;
    margin-bottom: 16px;
  }

  .preview-label {
    font-size: 11px;
    color: #6a5a45;
    margin-bottom: 4px;
  }

  .preview-content {
    font-size: 12px;
    color: #c8a878;
    font-family: 'SF Mono', Monaco, monospace;
  }

  .modal-actions {
    display: flex;
    gap: 10px;
  }

  .btn {
    flex: 1;
    padding: 10px 16px;
    border-radius: 6px;
    font-size: 13px;
    letter-spacing: 1px;
    cursor: pointer;
    transition: all 0.2s;
    border: 1px solid transparent;
  }

  .btn.cancel {
    background: rgba(100, 100, 100, 0.15);
    color: #a89878;
    border-color: rgba(100, 100, 100, 0.3);
  }

  .btn.cancel:hover {
    background: rgba(120, 120, 120, 0.25);
  }

  .btn.confirm {
    background: linear-gradient(135deg, rgba(104, 200, 136, 0.3), rgba(80, 160, 120, 0.25));
    color: #8ad8a0;
    border-color: rgba(104, 200, 136, 0.4);
  }

  .btn.confirm:hover:not(:disabled) {
    background: linear-gradient(135deg, rgba(104, 200, 136, 0.4), rgba(80, 160, 120, 0.35));
  }

  .btn.confirm:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn.danger {
    background: rgba(200, 80, 80, 0.2);
    color: #e08080;
    border-color: rgba(200, 80, 80, 0.4);
  }

  .btn.danger:hover {
    background: rgba(200, 80, 80, 0.3);
  }

  .overwrite-warning {
    display: flex;
    gap: 14px;
    padding: 16px;
    background: rgba(200, 140, 80, 0.1);
    border: 1px solid rgba(200, 140, 80, 0.3);
    border-radius: 8px;
    margin-bottom: 20px;
  }

  .warning-icon {
    font-size: 28px;
    flex-shrink: 0;
  }

  .warning-text p {
    margin: 0 0 6px;
    font-size: 13px;
    color: #c8a878;
  }

  .warning-desc {
    font-size: 11px !important;
    color: #8a7a5a !important;
    line-height: 1.5;
  }

  .history-modal {
    max-width: 450px;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
  }

  .history-list {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding-right: 4px;
  }

  .history-item {
    padding: 12px;
    background: rgba(0, 0, 0, 0.25);
    border: 1px solid rgba(139, 90, 43, 0.15);
    border-radius: 8px;
  }

  .history-item.current {
    border-color: rgba(104, 200, 136, 0.3);
    background: rgba(104, 200, 136, 0.05);
  }

  .history-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
  }

  .version-tag {
    font-size: 11px;
    padding: 2px 8px;
    background: rgba(139, 90, 43, 0.2);
    border: 1px solid rgba(139, 90, 43, 0.3);
    border-radius: 10px;
    color: #a88860;
  }

  .history-item.current .version-tag {
    background: rgba(104, 200, 136, 0.15);
    border-color: rgba(104, 200, 136, 0.3);
    color: #68c888;
  }

  .history-date {
    font-size: 11px;
    color: #6a5a45;
  }

  .history-params {
    font-size: 11px;
    color: #8a7a5a;
    font-family: 'SF Mono', Monaco, monospace;
    margin-bottom: 8px;
  }

  .revert-btn {
    padding: 6px 12px;
    background: rgba(104, 200, 136, 0.1);
    border: 1px solid rgba(104, 200, 136, 0.3);
    border-radius: 6px;
    color: #68c888;
    font-size: 11px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .revert-btn:hover {
    background: rgba(104, 200, 136, 0.2);
  }
</style>
