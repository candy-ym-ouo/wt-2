<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { TUTORIAL_STEPS } from '../data/gameData';
  import type { TutorialStep, TutorialState, TutorialPhase } from '../types/game';
  import { gameStore } from '../stores/gameStore';

  export let currentStep: number = 0;
  export let tutorialState: TutorialState;

  const dispatch = createEventDispatcher<{
    next: void;
    prev: void;
    skip: void;
    goTo: number;
  }>();

  let showErrorMessage = false;
  let errorMessage = '';
  let unsubscribe: () => void;

  const PHASE_LABELS: Record<TutorialPhase, string> = {
    intro: '入门介绍',
    selection: '阶段一：选择',
    adjustment: '阶段二：调整',
    development: '阶段三：冲洗',
    final: '完成'
  };

  const PHASE_ICONS: Record<TutorialPhase, string> = {
    intro: '👋',
    selection: '🎯',
    adjustment: '⚙️',
    development: '🧪',
    final: '🎉'
  };

  $: stepData = TUTORIAL_STEPS[currentStep] as TutorialStep;
  $: totalSteps = TUTORIAL_STEPS.length;
  $: isLast = currentStep === totalSteps - 1;
  $: isFirst = currentStep === 0;
  $: stepState = tutorialState?.steps[currentStep];
  $: currentPhase = stepData?.phase || 'intro';
  $: isStepCompleted = stepState?.completed || stepState?.skipped;
  $: canGoNext = isLast ? true : (tutorialState?.steps[currentStep + 1]?.unlocked ?? false);
  $: step = stepData;

  function handleNext() {
    if (!stepData.allowSkip && stepData.requiresCompletion && !isStepCompleted) {
      showError('请先完成本步骤的操作要求再继续');
      return;
    }
    dispatch('next');
  }

  function handlePrev() {
    dispatch('prev');
  }

  function handleSkip() {
    dispatch('skip');
  }

  function handleGoTo(index: number) {
    const targetState = tutorialState?.steps[index];
    if (!targetState?.unlocked) {
      showError('该步骤尚未解锁，请先完成前置操作');
      return;
    }
    
    if (index > currentStep && stepData.requiresCompletion && !isStepCompleted) {
      showError('请先完成当前步骤的操作要求再继续');
      return;
    }
    
    dispatch('goTo', index);
  }

  function showError(message: string) {
    errorMessage = message;
    showErrorMessage = true;
    setTimeout(() => {
      showErrorMessage = false;
    }, 2500);
  }

  function getStepStatusIcon(index: number): string {
    const state = tutorialState?.steps[index];
    if (!state) return '○';
    if (state.skipped) return '⏭';
    if (state.completed) return '✓';
    if (state.unlocked) return '◉';
    return '🔒';
  }

  function getPhaseProgress(): { current: number; total: number } {
    const phases = ['intro', 'selection', 'adjustment', 'development', 'final'] as TutorialPhase[];
    const currentPhaseIndex = phases.indexOf(currentPhase);
    const completedPhases = phases.slice(0, currentPhaseIndex + 1).filter(phase => {
      const phaseSteps = TUTORIAL_STEPS.filter(s => s.phase === phase);
      return phaseSteps.every(s => {
        const state = tutorialState?.steps[s.id];
        return state?.completed || state?.skipped;
      });
    });
    return { current: completedPhases.length, total: phases.length };
  }

  onMount(() => {
    unsubscribe = gameStore.subscribe(state => {
    });
  });

  function onDestroy() {
    if (unsubscribe) unsubscribe();
  }
</script>

<div class="tutorial-overlay">
  <div class="tutorial-container" style="--total: {totalSteps}; --current: {currentStep};">
    <div class="tutorial-header">
      <div class="phase-indicator">
        <span class="phase-icon">{PHASE_ICONS[currentPhase]}</span>
        <span class="phase-label">{PHASE_LABELS[currentPhase]}</span>
        <span class="phase-progress">
          {getPhaseProgress().current}/{getPhaseProgress().total}
        </span>
      </div>
    </div>

    <div class="tutorial-progress-bar">
      {#each TUTORIAL_STEPS as s, i (s.id)}
        <div
          class="progress-segment"
          class:done={tutorialState?.steps[i]?.completed || tutorialState?.steps[i]?.skipped}
          class:active={i === currentStep}
          class:locked={!tutorialState?.steps[i]?.unlocked}
          on:click={() => handleGoTo(i)}
          title={!tutorialState?.steps[i]?.unlocked ? '尚未解锁' : `步骤 ${i + 1}`}
        >
          <span class="step-icon">{getStepStatusIcon(i)}</span>
        </div>
      {/each}
    </div>

    <div class="tutorial-step-indicator">
      步骤 {currentStep + 1} / {totalSteps}
      {#if stepState?.skipped}
        <span class="status-badge skipped">已跳过</span>
      {:else if stepState?.completed}
        <span class="status-badge completed">已完成 ✓</span>
      {:else if step?.requiresCompletion}
        <span class="status-badge pending">待完成</span>
      {/if}
    </div>

    <div class="tutorial-content">
      <h2 class="tutorial-title">{step.title}</h2>
      <p class="tutorial-text">{step.content}</p>
    </div>

    {#if step.actionHint}
      <div class="action-hint" class:completed={isStepCompleted}>
        <span class="hint-icon">{isStepCompleted ? '✅' : '💡'}</span>
        <span>{step.actionHint}</span>
        {#if step.requiresCompletion && !isStepCompleted}
          <span class="hint-required">*必需</span>
        {/if}
      </div>
    {/if}

    {#if showErrorMessage}
      <div class="error-message">
        <span>⚠️</span>
        <span>{errorMessage}</span>
      </div>
    {/if}

    <div class="tutorial-actions">
      <button
        class="btn-tutorial skip"
        on:click={handleSkip}
      >
        跳过教程
      </button>

      <div class="nav-buttons">
        {#if !isFirst}
          <button
            class="btn-tutorial prev"
            on:click={handlePrev}
          >
            ← 上一步
          </button>
        {/if}
        <button
          class="btn-tutorial next"
          class:disabled={!canGoNext && !isLast}
          on:click={handleNext}
          disabled={!canGoNext && !isLast}
        >
          {#if isLast}
            开始游戏 🎬
          {:else if !canGoNext}
            请先完成操作
          {:else}
            下一步 →
          {/if}
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
    max-width: 560px;
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

  .tutorial-header {
    margin-bottom: 16px;
  }

  .phase-indicator {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 16px;
    background: rgba(180, 140, 70, 0.1);
    border: 1px solid rgba(180, 140, 70, 0.2);
    border-radius: 12px;
  }

  .phase-icon {
    font-size: 20px;
  }

  .phase-label {
    font-size: 14px;
    font-weight: 600;
    color: #e8c898;
    letter-spacing: 1px;
  }

  .phase-progress {
    margin-left: auto;
    font-size: 12px;
    color: #8a7a5a;
    font-family: 'SF Mono', Monaco, monospace;
    background: rgba(0, 0, 0, 0.3);
    padding: 4px 10px;
    border-radius: 8px;
  }

  .tutorial-progress-bar {
    display: flex;
    gap: 6px;
    margin-bottom: 16px;
  }

  .progress-segment {
    flex: 1;
    height: 36px;
    background: rgba(100, 80, 60, 0.3);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
  }

  .progress-segment:hover:not(.locked) {
    background: rgba(120, 100, 80, 0.4);
    transform: translateY(-2px);
  }

  .progress-segment.locked {
    cursor: not-allowed;
    opacity: 0.4;
  }

  .progress-segment.done {
    background: linear-gradient(90deg, #d4a574, #c89860);
  }

  .progress-segment.active {
    background: linear-gradient(90deg, #e8c898, #d4a574);
    box-shadow: 0 0 12px rgba(200, 150, 80, 0.5);
    transform: scaleY(1.1);
  }

  .step-icon {
    font-size: 14px;
    color: #c8b898;
    font-weight: bold;
  }

  .progress-segment.done .step-icon {
    color: #fff;
  }

  .progress-segment.active .step-icon {
    color: #fff;
    animation: pulse 1.5s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.2); }
  }

  .tutorial-step-indicator {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 11px;
    color: #7a6a55;
    letter-spacing: 2px;
    margin-bottom: 14px;
    font-family: 'SF Mono', Monaco, monospace;
  }

  .status-badge {
    padding: 3px 8px;
    border-radius: 4px;
    font-size: 10px;
    letter-spacing: 1px;
    font-weight: 500;
  }

  .status-badge.completed {
    background: rgba(100, 180, 100, 0.2);
    color: #8bc88b;
    border: 1px solid rgba(100, 180, 100, 0.3);
  }

  .status-badge.skipped {
    background: rgba(180, 140, 70, 0.2);
    color: #d4a870;
    border: 1px solid rgba(180, 140, 70, 0.3);
  }

  .status-badge.pending {
    background: rgba(200, 150, 80, 0.15);
    color: #c8a060;
    border: 1px solid rgba(200, 150, 80, 0.25);
    animation: blink 1.5s ease-in-out infinite;
  }

  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
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
    margin-bottom: 16px;
    font-size: 13px;
    color: #d4b878;
    transition: all 0.3s ease;
  }

  .action-hint.completed {
    background: rgba(100, 180, 100, 0.12);
    border-color: rgba(100, 180, 100, 0.3);
    color: #a8d8a8;
  }

  .hint-icon {
    font-size: 18px;
    flex-shrink: 0;
  }

  .hint-required {
    margin-left: auto;
    font-size: 11px;
    color: #e88060;
    font-weight: 500;
  }

  .error-message {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 16px;
    background: rgba(200, 80, 60, 0.15);
    border: 1px solid rgba(200, 80, 60, 0.3);
    border-radius: 10px;
    margin-bottom: 16px;
    font-size: 13px;
    color: #e89880;
    animation: shake 0.5s ease;
  }

  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-5px); }
    75% { transform: translateX(5px); }
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
    cursor: pointer;
    border: none;
  }

  .btn-tutorial:disabled,
  .btn-tutorial.disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none !important;
  }

  .btn-tutorial.skip {
    background: transparent;
    color: #6a5a45;
    font-size: 12px;
    padding: 8px 12px;
  }

  .btn-tutorial.skip:hover:not(:disabled) {
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

  .btn-tutorial.prev:hover:not(:disabled) {
    background: rgba(120, 120, 120, 0.25);
  }

  .btn-tutorial.next {
    background: linear-gradient(135deg, #8b5a2b 0%, #6b4520 100%);
    color: #f5e6d3;
    border: 1px solid rgba(200, 160, 100, 0.3);
  }

  .btn-tutorial.next:hover:not(:disabled) {
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
