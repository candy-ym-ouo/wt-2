<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { TUTORIAL_STEPS } from '../data/gameData';
  import type { TutorialStep } from '../types/game';

  export let currentStep: number = 0;

  const dispatch = createEventDispatcher<{
    next: void;
    prev: void;
    skip: void;
    goTo: number;
  }>();

  const step: TutorialStep = TUTORIAL_STEPS[currentStep];
  const totalSteps = TUTORIAL_STEPS.length;
  const isLast = currentStep === totalSteps - 1;
  const isFirst = currentStep === 0;
</script>

<div class="tutorial-overlay">
  <div class="tutorial-container" style="--total: {totalSteps}; --current: {currentStep};">
    <div class="tutorial-progress-bar">
      {#each TUTORIAL_STEPS as s, i (s.id)}
        <div
          class="progress-segment"
          class:done={i < currentStep}
          class:active={i === currentStep}
          on:click={() => dispatch('goTo', i)}
        />
      {/each}
    </div>

    <div class="tutorial-step-indicator">
      步骤 {currentStep + 1} / {totalSteps}
    </div>

    <div class="tutorial-content">
      <h2 class="tutorial-title">{step.title}</h2>
      <p class="tutorial-text">{step.content}</p>
    </div>

    {#if step.actionHint}
      <div class="action-hint">
        <span class="hint-icon">💡</span>
        <span>{step.actionHint}</span>
      </div>
    {/if}

    <div class="tutorial-actions">
      <button
        class="btn-tutorial skip"
        on:click={() => dispatch('skip')}
      >
        跳过教程
      </button>

      <div class="nav-buttons">
        {#if !isFirst}
          <button
            class="btn-tutorial prev"
            on:click={() => dispatch('prev')}
          >
            ← 上一步
          </button>
        {/if}
        <button
          class="btn-tutorial next"
          on:click={() => dispatch('next')}
        >
          {isLast ? '开始游戏 🎬' : '下一步 →'}
        </button>
      </div>
    </div>
  </div>

  {#if step.highlightArea && step.highlightArea !== 'none'}
    <div class="highlight-area" data-area={step.highlightArea} />
  {/if}
</div>

<style>
  .tutorial-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(6px);
    z-index: 150;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    animation: fadeIn 0.4s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .tutorial-container {
    background: linear-gradient(180deg, rgba(50, 28, 18, 0.98) 0%, rgba(30, 17, 10, 0.98) 100%);
    border: 1px solid rgba(200, 150, 80, 0.3);
    border-radius: 20px;
    padding: 28px 32px;
    width: 100%;
    max-width: 520px;
    box-shadow:
      0 0 0 1px rgba(200, 150, 80, 0.1),
      0 20px 60px rgba(0, 0, 0, 0.6),
      0 0 80px rgba(200, 150, 80, 0.08);
    animation: popIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  @keyframes popIn {
    from { transform: scale(0.9); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }

  .tutorial-progress-bar {
    display: flex;
    gap: 6px;
    margin-bottom: 16px;
  }

  .progress-segment {
    flex: 1;
    height: 5px;
    background: rgba(100, 80, 60, 0.3);
    border-radius: 3px;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .progress-segment.done {
    background: linear-gradient(90deg, #d4a574, #c89860);
  }

  .progress-segment.active {
    background: linear-gradient(90deg, #e8c898, #d4a574);
    box-shadow: 0 0 12px rgba(200, 150, 80, 0.5);
    transform: scaleY(1.3);
  }

  .tutorial-step-indicator {
    font-size: 11px;
    color: #7a6a55;
    letter-spacing: 2px;
    margin-bottom: 14px;
    text-align: center;
    font-family: 'SF Mono', Monaco, monospace;
  }

  .tutorial-content {
    margin-bottom: 16px;
  }

  .tutorial-title {
    font-size: 22px;
    color: #f5e0b8;
    margin: 0 0 12px;
    letter-spacing: 2px;
    font-weight: 600;
  }

  .tutorial-text {
    font-size: 14px;
    color: #c8b898;
    line-height: 1.8;
    margin: 0;
  }

  .action-hint {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 16px;
    background: rgba(180, 140, 70, 0.12);
    border: 1px solid rgba(180, 140, 70, 0.25);
    border-radius: 10px;
    margin-bottom: 20px;
    font-size: 13px;
    color: #d4b878;
  }

  .hint-icon {
    font-size: 18px;
  }

  .tutorial-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }

  .btn-tutorial {
    padding: 10px 18px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 500;
    letter-spacing: 1px;
    transition: all 0.2s ease;
  }

  .btn-tutorial.skip {
    background: transparent;
    color: #6a5a45;
    font-size: 12px;
    padding: 8px 12px;
  }

  .btn-tutorial.skip:hover {
    color: #9a8a65;
  }

  .nav-buttons {
    display: flex;
    gap: 10px;
  }

  .btn-tutorial.prev {
    background: rgba(100, 100, 100, 0.15);
    color: #a89878;
    border: 1px solid rgba(100, 100, 100, 0.3);
  }

  .btn-tutorial.prev:hover {
    background: rgba(120, 120, 120, 0.25);
  }

  .btn-tutorial.next {
    background: linear-gradient(135deg, #8b5a2b 0%, #6b4520 100%);
    color: #f5e6d3;
    border: 1px solid rgba(200, 160, 100, 0.3);
  }

  .btn-tutorial.next:hover {
    background: linear-gradient(135deg, #a06830 0%, #805528 100%);
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(139, 90, 43, 0.4);
  }

  .highlight-area {
    position: fixed;
    z-index: 149;
    pointer-events: none;
    border: 2px solid rgba(200, 150, 80, 0.6);
    border-radius: 12px;
    box-shadow:
      0 0 0 9999px rgba(0, 0, 0, 0.2),
      0 0 30px rgba(200, 150, 80, 0.4);
    animation: pulseBorder 2s ease-in-out infinite;
  }

  @keyframes pulseBorder {
    0%, 100% { box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.2), 0 0 20px rgba(200, 150, 80, 0.3); }
    50% { box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.15), 0 0 40px rgba(200, 150, 80, 0.5); }
  }
</style>
