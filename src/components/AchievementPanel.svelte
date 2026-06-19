<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { AchievementLine, AchievementProgress } from '../types/game';
  import { gameStore, computeAchievementProgress, calculateCurrentStreak } from '../stores/gameStore';
  import { ACHIEVEMENT_DEFINITIONS, ACHIEVEMENT_LINE_META } from '../data/gameData';

  const dispatch = createEventDispatcher<{ close: void }>();

  $: achievements = $gameStore.achievements;
  $: photos = $gameStore.processedPhotos;
  $: unlockedSet = new Set(achievements.unlockedIds);
  $: practiceDays = achievements.practiceDays;
  $: currentStreak = calculateCurrentStreak(practiceDays);

  let activeLine: AchievementLine = 'high_score';

  const lines: AchievementLine[] = ['high_score', 'film_mastery', 'streak'];

  $: lineAchievements = ACHIEVEMENT_DEFINITIONS.filter(d => d.line === activeLine);
  $: unlockedCount = achievements.unlockedIds.length;
  $: totalCount = ACHIEVEMENT_DEFINITIONS.length;
  $: overallProgress = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  $: lineProgress = (line: AchievementLine) => {
    const defs = ACHIEVEMENT_DEFINITIONS.filter(d => d.line === line);
    const unlocked = defs.filter(d => unlockedSet.has(d.id)).length;
    return { unlocked, total: defs.length, pct: defs.length > 0 ? Math.round((unlocked / defs.length) * 100) : 0 };
  };

  function getProgress(def: typeof ACHIEVEMENT_DEFINITIONS[0]): AchievementProgress {
    const { current, target } = computeAchievementProgress(def.condition, photos, practiceDays);
    return {
      achievementId: def.id,
      current,
      target,
      isUnlocked: unlockedSet.has(def.id)
    };
  }

  function getLatestTitle(): string {
    if (achievements.unlockedIds.length === 0) return '';
    const lastId = achievements.unlockedIds[achievements.unlockedIds.length - 1];
    const def = ACHIEVEMENT_DEFINITIONS.find(d => d.id === lastId);
    return def?.reward.title || '';
  }
</script>

<div class="achievement-overlay">
  <div class="achievement-container">
    <div class="achievement-header">
      <div class="header-left">
        <h2 class="achievement-title">🎖 成就任务</h2>
        <span class="overall-progress">已解锁 {unlockedCount}/{totalCount} ({overallProgress}%)</span>
      </div>
      <div class="header-right">
        {#if getLatestTitle()}
          <span class="current-title-badge">{getLatestTitle()}</span>
        {/if}
        <button class="close-btn" on:click={() => dispatch('close')}>
          <span>✕</span>
        </button>
      </div>
    </div>

    <div class="overall-bar-wrap">
      <div class="overall-bar">
        <div class="overall-bar-fill" style="width: {overallProgress}%;"></div>
      </div>
    </div>

    <div class="line-tabs">
      {#each lines as line (line)}
        {@const meta = ACHIEVEMENT_LINE_META[line]}
        {@const lp = lineProgress(line)}
        <button
          class="line-tab"
          class:active={activeLine === line}
          style="--line-color: {meta.color};"
          on:click={() => activeLine = line}
        >
          <span class="tab-icon">{meta.icon}</span>
          <span class="tab-label">{meta.label}</span>
          <span class="tab-progress">{lp.unlocked}/{lp.total}</span>
        </button>
      {/each}
    </div>

    {#if activeLine === 'streak'}
      <div class="streak-summary">
        <div class="streak-current">
          <span class="streak-number">{currentStreak}</span>
          <span class="streak-label">天连续练习</span>
        </div>
        <div class="streak-hint">
          {#if currentStreak === 0}
            完成今日首次冲洗，开始你的连续练习记录
          {:else}
            继续保持，每天完成冲洗即可延续记录
          {/if}
        </div>
      </div>
    {/if}

    <div class="achievements-list">
      {#each lineAchievements as def (def.id)}
        {@const progress = getProgress(def)}
        {@const isUnlocked = progress.isUnlocked}
        {@const pct = progress.target > 0 ? Math.min(100, Math.round((progress.current / progress.target) * 100)) : 0}
        <div class="achievement-card" class:unlocked={isUnlocked} style="--line-color: {ACHIEVEMENT_LINE_META[def.line].color};">
          <div class="card-icon-area">
            {#if isUnlocked}
              <span class="card-icon unlocked-icon">{def.icon}</span>
            {:else}
              <span class="card-icon locked-icon">🔒</span>
            {/if}
            <span class="tier-badge">T{def.tier}</span>
          </div>
          <div class="card-content">
            <div class="card-title-row">
              <span class="card-name">{def.name}</span>
              {#if isUnlocked}
                <span class="unlocked-tag">已解锁</span>
              {/if}
            </div>
            <p class="card-desc">{def.description}</p>
            <div class="progress-row">
              <div class="progress-bar">
                <div class="progress-fill" style="width: {pct}%;"></div>
              </div>
              <span class="progress-text">{progress.current}/{progress.target}</span>
            </div>
          </div>
          {#if isUnlocked}
            <div class="reward-area">
              <div class="reward-badge">{def.reward.badge}</div>
              <div class="reward-title">{def.reward.title}</div>
            </div>
          {:else}
            <div class="reward-area locked-reward">
              <div class="reward-badge dim">{def.reward.badge}</div>
              <div class="reward-title dim">???</div>
            </div>
          {/if}
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
  .achievement-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.85);
    backdrop-filter: blur(10px);
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    animation: fadeIn 0.3s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .achievement-container {
    width: 100%;
    max-width: 720px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    background: linear-gradient(180deg, #1a0f0a 0%, #0d0805 100%);
    border: 1px solid rgba(139, 90, 43, 0.3);
    border-radius: 16px;
    overflow: hidden;
  }

  .achievement-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    background: linear-gradient(90deg, rgba(45, 26, 18, 0.7), rgba(26, 15, 10, 0.5));
    border-bottom: 1px solid rgba(139, 90, 43, 0.2);
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .achievement-title {
    font-size: 18px;
    font-weight: 600;
    color: #e8c890;
    margin: 0;
    letter-spacing: 2px;
  }

  .overall-progress {
    font-size: 12px;
    color: #8a7a5a;
    background: rgba(139, 90, 43, 0.15);
    padding: 4px 10px;
    border-radius: 10px;
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .current-title-badge {
    font-size: 11px;
    color: #ffd700;
    background: rgba(255, 215, 0, 0.1);
    border: 1px solid rgba(255, 215, 0, 0.2);
    padding: 4px 10px;
    border-radius: 10px;
    white-space: nowrap;
  }

  .close-btn {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: rgba(139, 90, 43, 0.15);
    border: 1px solid rgba(139, 90, 43, 0.25);
    color: #c8a878;
    font-size: 14px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }

  .close-btn:hover {
    background: rgba(139, 90, 43, 0.3);
    transform: scale(1.05);
  }

  .overall-bar-wrap {
    padding: 12px 20px 0;
  }

  .overall-bar {
    height: 6px;
    background: rgba(139, 90, 43, 0.15);
    border-radius: 3px;
    overflow: hidden;
  }

  .overall-bar-fill {
    height: 100%;
    background: linear-gradient(90deg, #c9a87c, #ffd700);
    border-radius: 3px;
    transition: width 0.5s ease;
  }

  .line-tabs {
    display: flex;
    gap: 8px;
    padding: 14px 20px;
    border-bottom: 1px solid rgba(139, 90, 43, 0.15);
  }

  .line-tab {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 10px 8px;
    border-radius: 10px;
    background: rgba(139, 90, 43, 0.08);
    border: 1px solid rgba(139, 90, 43, 0.15);
    color: #8a7a5a;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.25s;
  }

  .line-tab:hover {
    background: rgba(139, 90, 43, 0.15);
    color: #c8a878;
  }

  .line-tab.active {
    background: rgba(139, 90, 43, 0.2);
    border-color: var(--line-color);
    color: var(--line-color);
    box-shadow: 0 0 12px rgba(139, 90, 43, 0.15);
  }

  .tab-icon {
    font-size: 16px;
  }

  .tab-label {
    font-weight: 500;
  }

  .tab-progress {
    font-size: 11px;
    background: rgba(0, 0, 0, 0.3);
    padding: 2px 6px;
    border-radius: 8px;
  }

  .streak-summary {
    padding: 16px 20px;
    display: flex;
    align-items: center;
    gap: 20px;
    background: rgba(126, 200, 160, 0.05);
    border-bottom: 1px solid rgba(126, 200, 160, 0.1);
  }

  .streak-current {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 70px;
  }

  .streak-number {
    font-size: 32px;
    font-weight: 700;
    color: #7ec8a0;
    line-height: 1;
  }

  .streak-label {
    font-size: 11px;
    color: #5a8a6a;
    margin-top: 4px;
  }

  .streak-hint {
    font-size: 12px;
    color: #6a8a7a;
    line-height: 1.5;
  }

  .achievements-list {
    flex: 1;
    overflow-y: auto;
    padding: 16px 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .achievement-card {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 14px 16px;
    background: rgba(139, 90, 43, 0.06);
    border: 1px solid rgba(139, 90, 43, 0.12);
    border-radius: 12px;
    transition: all 0.25s;
  }

  .achievement-card.unlocked {
    background: rgba(139, 90, 43, 0.1);
    border-color: rgba(139, 90, 43, 0.2);
    box-shadow: inset 0 0 20px rgba(255, 215, 0, 0.03);
  }

  .card-icon-area {
    position: relative;
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .card-icon {
    font-size: 28px;
  }

  .unlocked-icon {
    filter: drop-shadow(0 0 6px rgba(255, 215, 0, 0.3));
  }

  .locked-icon {
    font-size: 22px;
    opacity: 0.5;
  }

  .tier-badge {
    position: absolute;
    bottom: -2px;
    right: -2px;
    font-size: 9px;
    font-weight: 700;
    color: #1a0f0a;
    background: var(--line-color);
    padding: 1px 5px;
    border-radius: 6px;
  }

  .card-content {
    flex: 1;
    min-width: 0;
  }

  .card-title-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
  }

  .card-name {
    font-size: 14px;
    font-weight: 600;
    color: #d4b888;
  }

  .unlocked-tag {
    font-size: 10px;
    color: #ffd700;
    background: rgba(255, 215, 0, 0.1);
    border: 1px solid rgba(255, 215, 0, 0.2);
    padding: 1px 6px;
    border-radius: 6px;
    white-space: nowrap;
  }

  .card-desc {
    font-size: 12px;
    color: #7a6a55;
    margin: 0 0 8px;
    line-height: 1.4;
  }

  .progress-row {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .progress-bar {
    flex: 1;
    height: 5px;
    background: rgba(139, 90, 43, 0.15);
    border-radius: 3px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--line-color), #ffd700);
    border-radius: 3px;
    transition: width 0.4s ease;
  }

  .progress-text {
    font-size: 11px;
    color: #8a7a5a;
    white-space: nowrap;
    min-width: 36px;
    text-align: right;
  }

  .reward-area {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    min-width: 56px;
    flex-shrink: 0;
  }

  .reward-badge {
    font-size: 20px;
  }

  .reward-title {
    font-size: 10px;
    color: #e8c890;
    text-align: center;
    line-height: 1.2;
    white-space: nowrap;
  }

  .locked-reward .dim {
    opacity: 0.3;
  }

  .reward-badge.dim {
    filter: grayscale(1);
  }

  .reward-title.dim {
    color: #5a4a35;
  }
</style>
