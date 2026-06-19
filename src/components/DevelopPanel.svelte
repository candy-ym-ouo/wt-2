<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { DevParams } from '../types/game';

  export let params: DevParams;
  export let isDeveloping: boolean = false;
  export let canDevelop: boolean = true;
  export let progress: number = 0;

  const dispatch = createEventDispatcher<{
    startDevelop: void;
    cancelDevelop: void;
    reset: void;
  }>();

  function getPhaseLabel(p: number): string {
    if (p < 0.25) return '预浸中...';
    if (p < 0.55) return '显影液中...';
    if (p < 0.75) return '停显中...';
    if (p < 0.95) return '定影中...';
    if (p < 1) return '水洗中...';
    return '完成！';
  }

  function getPhaseColor(p: number): string {
    if (p < 0.25) return '#6aa8c8';
    if (p < 0.55) return '#5080a0';
    if (p < 0.75) return '#7a8a9a';
    if (p < 0.95) return '#9a8878';
    return '#88aa88';
  }

  const devMinutes = Math.round(4 + params.developmentTime * 10);
  const tempCelsius = Math.round(18 + params.temperature * 12);
  const diluteRatio = `1:${(1 + Math.round(params.dilution * 8)).toFixed(0)}`;
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
      <div class="progress-track">
        <div
          class="progress-fill"
          style="width: {progress * 100}%; background: {getPhaseColor(progress)};"
        />
        <div class="progress-markers">
          <span style="left: 25%">预浸</span>
          <span style="left: 55%">显影</span>
          <span style="left: 75%">停显</span>
          <span style="left: 95%">定影</span>
        </div>
      </div>
      <div class="phase-info" style="color: {getPhaseColor(progress)};">
        <span class="phase-label">{getPhaseLabel(progress)}</span>
        <span class="phase-percent">{Math.round(progress * 100)}%</span>
      </div>
      <div class="agitation-hint">
        {#if progress > 0.3 && progress < 0.55}
          💡 显影过程中每隔30秒轻轻搅动
        {/if}
      </div>
    </div>

    <div class="developing-actions">
      <button class="btn btn-cancel" on:click={() => dispatch('cancelDevelop')} disabled={progress > 0.5}>
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
</style>
