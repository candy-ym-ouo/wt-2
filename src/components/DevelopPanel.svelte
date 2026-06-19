<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { DevParams, StageState, DevelopStage } from '../types/game';

  export let params: DevParams;
  export let isDeveloping: boolean = false;
  export let canDevelop: boolean = true;
  export let progress: number = 0;
  export let stageState: StageState;

  const dispatch = createEventDispatcher<{
    startDevelop: void;
    cancelDevelop: void;
    reset: void;
  }>();

  const STAGES: Array<{ key: DevelopStage; label: string; color: string }> = [
    { key: 'presoak', label: '预浸', color: '#6aa8c8' },
    { key: 'develop', label: '显影', color: '#5080a0' },
    { key: 'stop', label: '停显', color: '#7a8a9a' },
    { key: 'fix', label: '定影', color: '#9a8878' },
    { key: 'wash', label: '水洗', color: '#88aa88' },
    { key: 'complete', label: '完成', color: '#c8a868' }
  ];

  function getCurrentStageInfo(): { label: string; color: string } {
    if (!stageState) {
      const p = progress;
      if (p < 0.25) return { label: '预浸中...', color: '#6aa8c8' };
      if (p < 0.55) return { label: '显影液中...', color: '#5080a0' };
      if (p < 0.75) return { label: '停显中...', color: '#7a8a9a' };
      if (p < 0.95) return { label: '定影中...', color: '#9a8878' };
      if (p < 1) return { label: '水洗中...', color: '#88aa88' };
      return { label: '完成！', color: '#c8a868' };
    }
    const stage = STAGES.find(s => s.key === stageState.currentStage) || STAGES[0];
    const suffix = stageState.currentStage === 'complete' ? '！' : '中...';
    return { label: stage.label + suffix, color: stage.color };
  }

  function getStageIndex(key: DevelopStage): number {
    return STAGES.findIndex(s => s.key === key);
  }

  function isStageActive(key: DevelopStage): boolean {
    if (!stageState) return false;
    return stageState.currentStage === key;
  }

  function isStageCompleted(key: DevelopStage): boolean {
    if (!stageState) return false;
    const idx = getStageIndex(key);
    const curIdx = getStageIndex(stageState.currentStage);
    return idx < curIdx || stageState.currentStage === 'complete';
  }

  function formatMs(ms: number): string {
    const sec = Math.round(ms / 1000 * 10) / 10;
    if (sec < 60) return `${sec.toFixed(1)}s`;
    const min = Math.floor(sec / 60);
    const s = Math.round(sec % 60);
    return `${min}m${s}s`;
  }

  function getDeviationClass(deviation: number, threshold: number): string {
    const abs = Math.abs(deviation);
    if (abs < threshold) return 'deviation-good';
    if (abs < threshold * 2) return 'deviation-warn';
    return 'deviation-bad';
  }

  function getDeviationLabel(deviation: number): string {
    if (Math.abs(deviation) < 0.05) return '✓';
    return deviation > 0 ? `+${Math.round(deviation * 100)}%` : `${Math.round(deviation * 100)}%`;
  }

  const phaseInfo = getCurrentStageInfo();
  const devMinutes = Math.round(4 + params.developmentTime * 10);
  const tempCelsius = Math.round(18 + params.temperature * 12);
  const diluteRatio = `1:${(1 + Math.round(params.dilution * 8)).toFixed(0)}`;

  const idealDevelopMs = 4000 + params.developmentTime * 6000;
  const idealFixMs = 2500 + (1 - params.dilution) * 2000;
  const idealWashMs = 2000 + params.agitation * 1500;
</script>

<div class="develop-panel" id="develop-panel">
  <div class="panel-header">
    <h3 class="title">显影控制</h3>
    {#if isDeveloping}
      <span class="status-badge active">处理中</span>
    {:else}
      <span class="status-badge standby">待机</span>
    {/if}
  </div>

  {#if isDeveloping}
    <div class="develop-progress">
      <div class="stages-bar">
        {#each STAGES.slice(0, 5) as stage}
          <div
            class="stage-node"
            class:active={isStageActive(stage.key)}
            class:completed={isStageCompleted(stage.key)}
            style="--stage-color: {stage.color};"
          >
            <div class="stage-dot" />
            <span class="stage-text">{stage.label}</span>
          </div>
        {/each}
      </div>

      <div class="progress-track">
        <div
          class="progress-fill"
          style="width: {(stageState?.totalProgress ?? progress) * 100}%; background: {phaseInfo.color};"
        />
      </div>

      <div class="phase-info" style="color: {phaseInfo.color};">
        <span class="phase-label">{phaseInfo.label}</span>
        <span class="phase-percent">{Math.round((stageState?.totalProgress ?? progress) * 100)}%</span>
      </div>

      {#if stageState?.currentStage === 'develop'}
        <div class="stage-duration-row">
          <span class="dur-label">已显影</span>
          <span class="dur-value">{formatMs(stageState.developElapsed)}</span>
          <span class="dur-sep">/</span>
          <span class="dur-target">{formatMs(stageState.developDuration)}</span>
          <span class="dur-deviation {getDeviationClass(stageState.developDeviation, 0.1)}">
            {getDeviationLabel(stageState.developDeviation)}
          </span>
        </div>
      {:else if stageState?.currentStage === 'fix'}
        <div class="stage-duration-row">
          <span class="dur-label">已定影</span>
          <span class="dur-value">{formatMs(stageState.fixElapsed)}</span>
          <span class="dur-sep">/</span>
          <span class="dur-target">{formatMs(stageState.fixDuration)}</span>
          <span class="dur-deviation {getDeviationClass(stageState.fixDeviation, 0.15)}">
            {getDeviationLabel(stageState.fixDeviation)}
          </span>
        </div>
      {:else if stageState?.currentStage === 'wash'}
        <div class="stage-duration-row">
          <span class="dur-label">已水洗</span>
          <span class="dur-value">{formatMs(stageState.washElapsed)}</span>
          <span class="dur-sep">/</span>
          <span class="dur-target">{formatMs(stageState.washDuration)}</span>
          <span class="dur-deviation {getDeviationClass(stageState.washDeviation, 0.2)}">
            {getDeviationLabel(stageState.washDeviation)}
          </span>
        </div>
      {/if}

      <div class="agitation-hint">
        {#if stageState?.currentStage === 'develop' && (stageState.stageProgress > 0.3 && stageState.stageProgress < 0.8)}
          💡 显影过程中每隔30秒轻轻搅动
        {:else if stageState?.currentStage === 'wash' && (stageState.stageProgress > 0.4 && stageState.stageProgress < 0.7)}
          💡 水洗过程中保持水流均匀
        {:else if stageState?.currentStage === 'fix'}
          💡 定影确保未曝光的银盐完全溶解
        {/if}
      </div>
    </div>

    <div class="developing-actions">
      <button class="btn btn-cancel" on:click={() => dispatch('cancelDevelop')} disabled={(stageState?.totalProgress ?? progress) > 0.5}>
        停止冲洗
      </button>
    </div>
  {:else}
    <div class="preflight-info">
      <div class="info-grid">
        <div class="info-item">
          <span class="info-icon">⏱</span>
          <div class="info-content">
            <div class="info-label">显影时间</div>
            <div class="info-value">{devMinutes} 分钟</div>
          </div>
        </div>
        <div class="info-item">
          <span class="info-icon">🌡</span>
          <div class="info-content">
            <div class="info-label">药液温度</div>
            <div class="info-value">{tempCelsius}°C</div>
          </div>
        </div>
        <div class="info-item">
          <span class="info-icon">🧪</span>
          <div class="info-content">
            <div class="info-label">稀释比例</div>
            <div class="info-value">{diluteRatio}</div>
          </div>
        </div>
        <div class="info-item">
          <span class="info-icon">🌀</span>
          <div class="info-content">
            <div class="info-label">搅动方式</div>
            <div class="info-value">
              {params.agitation < 0.3 ? '轻柔' : params.agitation < 0.7 ? '标准' : '频繁'}
            </div>
          </div>
        </div>
      </div>

      <div class="stage-estimates">
        <div class="estimates-title">⏳ 预估流程时长</div>
        <div class="estimates-list">
          <div class="estimate-item">
            <span class="est-label" style="color: #5080a0;">显影</span>
            <span class="est-value">{formatMs(idealDevelopMs)}</span>
          </div>
          <div class="estimate-item">
            <span class="est-label" style="color: #9a8878;">定影</span>
            <span class="est-value">{formatMs(idealFixMs)}</span>
          </div>
          <div class="estimate-item">
            <span class="est-label" style="color: #88aa88;">水洗</span>
            <span class="est-value">{formatMs(idealWashMs)}</span>
          </div>
          <div class="estimate-item total">
            <span class="est-label">合计</span>
            <span class="est-value">{formatMs(idealDevelopMs + idealFixMs + idealWashMs + 1500)}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="action-buttons" id="develop-button">
      <button
        class="btn btn-develop"
        on:click={() => dispatch('startDevelop')}
        disabled={!canDevelop}
      >
        <span class="btn-icon">🔬</span>
        <span class="btn-text">开始显影</span>
      </button>
      <button class="btn btn-reset" on:click={() => dispatch('reset')}>
        <span class="btn-icon">↺</span>
        <span class="btn-text">重置参数</span>
      </button>
    </div>

    {#if !canDevelop}
      <div class="develop-tip">
        💡 请先在左侧选择一个拍摄题材
      </div>
    {/if}
  {/if}
</div>

<style>
  .develop-panel {
    background: linear-gradient(180deg, rgba(45, 26, 18, 0.8) 0%, rgba(26, 15, 10, 0.9) 100%);
    border: 1px solid rgba(139, 90, 43, 0.25);
    border-radius: 12px;
    padding: 18px;
    backdrop-filter: blur(10px);
  }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid rgba(139, 90, 43, 0.2);
  }

  .title {
    font-size: 16px;
    font-weight: 600;
    color: #d4a574;
    margin: 0;
    letter-spacing: 2px;
  }

  .status-badge {
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 11px;
    letter-spacing: 1px;
  }

  .status-badge.standby {
    background: rgba(100, 100, 100, 0.2);
    color: #888;
    border: 1px solid rgba(100, 100, 100, 0.3);
  }

  .status-badge.active {
    background: rgba(80, 160, 120, 0.2);
    color: #7fc890;
    border: 1px solid rgba(80, 160, 120, 0.4);
    animation: pulse 2s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
  }

  .develop-progress {
    margin-bottom: 16px;
  }

  .progress-track {
    position: relative;
    height: 24px;
    background: rgba(0, 0, 0, 0.4);
    border-radius: 12px;
    overflow: hidden;
    margin-bottom: 8px;
  }

  .progress-fill {
    height: 100%;
    border-radius: 12px;
    transition: all 0.3s ease;
    box-shadow: 0 0 20px currentColor;
  }

  .progress-markers {
    position: absolute;
    top: 50%;
    left: 0;
    right: 0;
    transform: translateY(-50%);
    display: flex;
    justify-content: space-around;
    font-size: 9px;
    color: rgba(255, 255, 255, 0.35);
    pointer-events: none;
  }

  .phase-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 13px;
    margin-bottom: 8px;
  }

  .phase-label {
    letter-spacing: 1px;
  }

  .phase-percent {
    font-weight: 600;
    font-size: 15px;
  }

  .agitation-hint {
    font-size: 12px;
    color: #9a8878;
    padding: 8px 12px;
    background: rgba(139, 136, 120, 0.1);
    border-radius: 6px;
    border-left: 2px solid rgba(139, 136, 120, 0.5);
  }

  .preflight-info {
    margin-bottom: 16px;
  }

  .info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .info-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 8px;
    border: 1px solid rgba(139, 90, 43, 0.15);
  }

  .info-icon {
    font-size: 20px;
    opacity: 0.8;
  }

  .info-label {
    font-size: 10px;
    color: #7a6a55;
    margin-bottom: 2px;
    letter-spacing: 1px;
  }

  .info-value {
    font-size: 14px;
    color: #c8a878;
    font-weight: 500;
  }

  .action-buttons {
    display: flex;
    gap: 10px;
  }

  .btn {
    flex: 1;
    padding: 12px 16px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    letter-spacing: 1px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: all 0.2s ease;
  }

  .btn-develop {
    background: linear-gradient(135deg, #8b5a2b 0%, #6b4520 100%);
    color: #f5e6d3;
    border: 1px solid rgba(200, 160, 100, 0.3);
  }

  .btn-develop:hover:not(:disabled) {
    background: linear-gradient(135deg, #a06830 0%, #805528 100%);
    transform: translateY(-1px);
    box-shadow: 0 4px 16px rgba(139, 90, 43, 0.4);
  }

  .btn-develop:disabled {
    background: rgba(60, 50, 40, 0.5);
    color: #5a4a35;
  }

  .btn-reset {
    background: rgba(100, 100, 100, 0.15);
    color: #a89878;
    border: 1px solid rgba(100, 100, 100, 0.3);
  }

  .btn-reset:hover {
    background: rgba(120, 120, 120, 0.25);
  }

  .developing-actions {
    display: flex;
  }

  .btn-cancel {
    flex: 1;
    background: rgba(160, 80, 80, 0.15);
    color: #c88878;
    border: 1px solid rgba(160, 80, 80, 0.3);
  }

  .btn-cancel:hover:not(:disabled) {
    background: rgba(160, 80, 80, 0.25);
  }

  .develop-tip {
    margin-top: 12px;
    padding: 10px 14px;
    background: rgba(180, 150, 80, 0.1);
    border: 1px solid rgba(180, 150, 80, 0.2);
    border-radius: 6px;
    font-size: 12px;
    color: #c8a868;
  }

  .btn-icon {
    font-size: 16px;
  }

  .stages-bar {
    display: flex;
    justify-content: space-between;
    margin-bottom: 10px;
    padding: 0 4px;
  }

  .stage-node {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    opacity: 0.4;
    transition: all 0.3s ease;
  }

  .stage-node.active {
    opacity: 1;
    transform: scale(1.1);
  }

  .stage-node.completed {
    opacity: 0.85;
  }

  .stage-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #333;
    border: 2px solid #555;
    transition: all 0.3s ease;
  }

  .stage-node.active .stage-dot {
    background: var(--stage-color);
    border-color: var(--stage-color);
    box-shadow: 0 0 10px var(--stage-color);
    animation: stagePulse 1s ease-in-out infinite;
  }

  .stage-node.completed .stage-dot {
    background: var(--stage-color);
    border-color: var(--stage-color);
  }

  @keyframes stagePulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.3); }
  }

  .stage-text {
    font-size: 9px;
    color: #7a6a55;
    letter-spacing: 0.5px;
  }

  .stage-node.active .stage-text {
    color: var(--stage-color);
    font-weight: 600;
  }

  .stage-node.completed .stage-text {
    color: #a89878;
  }

  .stage-duration-row {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    margin-bottom: 8px;
    background: rgba(0, 0, 0, 0.25);
    border-radius: 6px;
    font-size: 12px;
  }

  .dur-label {
    color: #7a6a55;
    letter-spacing: 0.5px;
    font-size: 11px;
  }

  .dur-value {
    color: #c8a878;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }

  .dur-sep {
    color: #555;
  }

  .dur-target {
    color: #8a7a5a;
    font-variant-numeric: tabular-nums;
  }

  .dur-deviation {
    margin-left: auto;
    font-size: 11px;
    padding: 2px 8px;
    border-radius: 10px;
    font-weight: 600;
  }

  .deviation-good {
    background: rgba(100, 180, 100, 0.15);
    color: #7fc87f;
  }

  .deviation-warn {
    background: rgba(200, 160, 80, 0.15);
    color: #d8b060;
  }

  .deviation-bad {
    background: rgba(200, 80, 80, 0.15);
    color: #d87878;
  }

  .stage-estimates {
    margin-top: 14px;
    padding: 10px 12px;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 8px;
    border: 1px solid rgba(139, 90, 43, 0.12);
  }

  .estimates-title {
    font-size: 11px;
    color: #8a7a5a;
    letter-spacing: 1px;
    margin-bottom: 8px;
    font-weight: 500;
  }

  .estimates-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .estimate-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 11px;
  }

  .estimate-item.total {
    margin-top: 6px;
    padding-top: 6px;
    border-top: 1px solid rgba(139, 90, 43, 0.15);
    font-weight: 600;
  }

  .estimate-item.total .est-label {
    color: #c8a878;
  }

  .estimate-item.total .est-value {
    color: #e0c088;
  }

  .est-label {
    color: #7a6a55;
    letter-spacing: 0.5px;
  }

  .est-value {
    color: #a89878;
    font-variant-numeric: tabular-nums;
  }
</style>
