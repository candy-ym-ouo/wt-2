<script lang="ts">
  import { gameStore } from '../stores/gameStore';
  import type { DeveloperRecipe, FilmLabTab } from '../types/game';
  import RecipeManager from './RecipeManager.svelte';
  import ParamTrial from './ParamTrial.svelte';
  import RecipeCompare from './RecipeCompare.svelte';
  import VersionHistory from './VersionHistory.svelte';

  export let onClose: () => void;

  $: activeTab = $gameStore.filmLab.activeTab;
  $: selectedRecipeId = $gameStore.filmLab.selectedRecipeId;
  $: selectedRecipe = $gameStore.filmLab.recipes.find(r => r.id === selectedRecipeId) || null;
  $: recipes = $gameStore.filmLab.recipes;
  $: trialCount = $gameStore.filmLab.trialHistory.length;
  $: compareCount = $gameStore.filmLab.compareHistory.length;

  function setTab(tab: FilmLabTab) {
    gameStore.setFilmLabTab(tab);
  }

  function handleSelectRecipe(recipe: DeveloperRecipe) {
  }

  const tabs: { key: FilmLabTab; label: string; icon: string }[] = [
    { key: 'recipes', label: '配方管理', icon: '📋' },
    { key: 'trial', label: '参数试算', icon: '🧪' },
    { key: 'compare', label: '结果对比', icon: '⚖️' },
    { key: 'history', label: '版本追踪', icon: '📜' }
  ];
</script>

<div class="filmlab-overlay" on:click={onClose}>
  <div class="filmlab-modal" on:click|stopPropagation>
    <div class="filmlab-header">
      <div class="header-left">
        <div class="logo-icon">🔬</div>
        <div class="header-text">
          <h2 class="modal-title">胶片配方实验室</h2>
          <p class="modal-subtitle">FILM FORMULA LABORATORY</p>
        </div>
      </div>
      <div class="header-stats">
        <div class="stat-item">
          <span class="stat-val">{recipes.length}</span>
          <span class="stat-label">配方</span>
        </div>
        <div class="stat-item">
          <span class="stat-val">{trialCount}</span>
          <span class="stat-label">试算</span>
        </div>
        <div class="stat-item">
          <span class="stat-val">{compareCount}</span>
          <span class="stat-label">对比</span>
        </div>
      </div>
      <button class="close-btn" on:click={onClose} title="关闭">✕</button>
    </div>

    <div class="tab-bar">
      {#each tabs as tab}
        <button 
          class="tab-btn {activeTab === tab.key ? 'active' : ''}"
          on:click={() => setTab(tab.key)}
        >
          <span class="tab-icon">{tab.icon}</span>
          <span class="tab-label">{tab.label}</span>
        </button>
      {/each}
    </div>

    <div class="filmlab-content">
      {#if activeTab === 'recipes'}
        <RecipeManager onSelectRecipe={handleSelectRecipe} />
      {:else if activeTab === 'trial'}
        <ParamTrial selectedRecipe={selectedRecipe} />
      {:else if activeTab === 'compare'}
        <RecipeCompare />
      {:else if activeTab === 'history'}
        <VersionHistory selectedRecipe={selectedRecipe} />
      {/if}
    </div>
  </div>
</div>

<style>
  .filmlab-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.85);
    backdrop-filter: blur(10px);
    z-index: 150;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    animation: fadeIn 0.3s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .filmlab-modal {
    width: 100%;
    max-width: 1200px;
    max-height: 92vh;
    background: linear-gradient(180deg, #1a0f08 0%, #0d0704 100%);
    border: 1px solid rgba(139, 90, 43, 0.35);
    border-radius: 20px;
    box-shadow: 0 20px 80px rgba(0, 0, 0, 0.6);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    animation: slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  @keyframes slideUp {
    from { transform: translateY(30px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }

  .filmlab-header {
    display: flex;
    align-items: center;
    gap: 20px;
    padding: 20px 24px;
    border-bottom: 1px solid rgba(139, 90, 43, 0.2);
    background: linear-gradient(90deg, rgba(45, 26, 18, 0.6), rgba(26, 15, 10, 0.3));
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 14px;
    flex: 1;
  }

  .logo-icon {
    font-size: 38px;
    filter: drop-shadow(0 2px 10px rgba(126, 200, 160, 0.3));
  }

  .header-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .modal-title {
    margin: 0;
    color: #e8c890;
    font-size: 22px;
    font-weight: 600;
    letter-spacing: 2px;
    background: linear-gradient(90deg, #f0d8a8, #d4a574);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .modal-subtitle {
    margin: 0;
    color: #6a5a45;
    font-size: 10px;
    letter-spacing: 4px;
    text-transform: uppercase;
  }

  .header-stats {
    display: flex;
    gap: 20px;
    padding: 8px 16px;
    background: rgba(0, 0, 0, 0.25);
    border-radius: 10px;
  }

  .stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
  }

  .stat-val {
    color: #d4a574;
    font-size: 18px;
    font-weight: 700;
  }

  .stat-label {
    color: #6a5a45;
    font-size: 10px;
    letter-spacing: 1px;
  }

  .close-btn {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    background: rgba(139, 90, 43, 0.15);
    border: 1px solid rgba(139, 90, 43, 0.3);
    color: #c8a878;
    font-size: 18px;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .close-btn:hover {
    background: rgba(200, 80, 80, 0.25);
    border-color: rgba(200, 80, 80, 0.5);
    color: #e88888;
    transform: rotate(90deg);
  }

  .tab-bar {
    display: flex;
    gap: 4px;
    padding: 0 16px;
    background: rgba(0, 0, 0, 0.2);
    border-bottom: 1px solid rgba(139, 90, 43, 0.15);
  }

  .tab-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 14px 18px;
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    color: #7a6a55;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s ease;
    position: relative;
  }

  .tab-btn:hover {
    color: #c8a878;
    background: rgba(139, 90, 43, 0.08);
  }

  .tab-btn.active {
    color: #e8c890;
    border-bottom-color: #d4a574;
    background: linear-gradient(180deg, rgba(212, 165, 116, 0.08), transparent);
  }

  .tab-btn.active::before {
    content: '';
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 40px;
    height: 3px;
    background: linear-gradient(90deg, transparent, #d4a574, transparent);
    border-radius: 0 0 3px 3px;
  }

  .tab-icon {
    font-size: 16px;
  }

  .tab-label {
    font-weight: 500;
    letter-spacing: 0.5px;
  }

  .filmlab-content {
    flex: 1;
    overflow-y: auto;
    padding: 24px;
  }

  .filmlab-content::-webkit-scrollbar {
    width: 8px;
  }

  .filmlab-content::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.2);
  }

  .filmlab-content::-webkit-scrollbar-thumb {
    background: rgba(139, 90, 43, 0.4);
    border-radius: 4px;
  }

  .filmlab-content::-webkit-scrollbar-thumb:hover {
    background: rgba(139, 90, 43, 0.6);
  }

  @media (max-width: 768px) {
    .filmlab-header {
      flex-wrap: wrap;
      padding: 16px;
      gap: 12px;
    }

    .header-stats {
      order: 3;
      width: 100%;
      justify-content: center;
    }

    .modal-title {
      font-size: 18px;
    }

    .tab-btn {
      padding: 12px 14px;
      font-size: 12px;
    }

    .tab-label {
      display: none;
    }

    .filmlab-content {
      padding: 16px;
    }
  }
</style>
