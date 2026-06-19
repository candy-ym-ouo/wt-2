<script lang="ts">
  import { gameStore } from '../stores/gameStore';
  import type { StorageWarning } from '../types/game';

  function getWarningIcon(type: StorageWarning['type']): string {
    switch (type) {
      case 'quota': return '⚠️';
      case 'corrupted': return '❌';
      case 'recovered': return '✅';
      case 'migrated': return '🔄';
      case 'limit_reached': return '📊';
      default: return 'ℹ️';
    }
  }

  function getWarningClass(type: StorageWarning['type']): string {
    switch (type) {
      case 'quota': return 'warning-quota';
      case 'corrupted': return 'warning-error';
      case 'recovered': return 'warning-success';
      case 'migrated': return 'warning-info';
      case 'limit_reached': return 'warning-warning';
      default: return 'warning-info';
    }
  }

  function dismissWarning(index: number) {
    gameStore.dismissStorageWarning(index);
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
</script>

{#if $gameStore.storageStatus.warnings.length > 0}
  <div class="storage-warnings">
    {#each $gameStore.storageStatus.warnings as warning, index}
      <div class="storage-warning {getWarningClass(warning.type)}">
        <span class="warning-icon">{getWarningIcon(warning.type)}</span>
        <div class="warning-content">
          <span class="warning-message">{warning.message}</span>
          {#if warning.details}
            <span class="warning-details">{warning.details}</span>
          {/if}
        </div>
        <button class="warning-close" on:click={() => dismissWarning(index)} title="关闭">
          ×
        </button>
      </div>
    {/each}
  </div>
{/if}

<style>
  .storage-warnings {
    position: fixed;
    top: 16px;
    right: 16px;
    z-index: 1000;
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-width: 360px;
  }

  .storage-warning {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 12px 14px;
    border-radius: 10px;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(139, 90, 43, 0.3);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    animation: slideIn 0.3s ease;
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateX(20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  .warning-icon {
    font-size: 20px;
    flex-shrink: 0;
  }

  .warning-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .warning-message {
    font-size: 13px;
    color: #e8d8b8;
    line-height: 1.4;
  }

  .warning-details {
    font-size: 11px;
    color: #8a7a5a;
  }

  .warning-close {
    background: none;
    border: none;
    color: #8a7a5a;
    font-size: 18px;
    cursor: pointer;
    padding: 0 4px;
    line-height: 1;
    flex-shrink: 0;
    transition: color 0.2s;
  }

  .warning-close:hover {
    color: #e8d8b8;
  }

  .warning-quota {
    background: linear-gradient(135deg, rgba(180, 120, 40, 0.25), rgba(140, 80, 20, 0.2));
    border-color: rgba(200, 140, 60, 0.4);
  }

  .warning-error {
    background: linear-gradient(135deg, rgba(180, 60, 60, 0.25), rgba(120, 30, 30, 0.2));
    border-color: rgba(200, 80, 80, 0.4);
  }

  .warning-success {
    background: linear-gradient(135deg, rgba(60, 140, 80, 0.25), rgba(30, 100, 50, 0.2));
    border-color: rgba(80, 180, 100, 0.4);
  }

  .warning-info {
    background: linear-gradient(135deg, rgba(60, 100, 160, 0.25), rgba(30, 60, 120, 0.2));
    border-color: rgba(80, 140, 200, 0.4);
  }

  .warning-warning {
    background: linear-gradient(135deg, rgba(160, 140, 40, 0.25), rgba(120, 100, 20, 0.2));
    border-color: rgba(200, 180, 60, 0.4);
  }
</style>
