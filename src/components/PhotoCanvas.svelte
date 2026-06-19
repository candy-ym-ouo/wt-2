<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import { generateBaseScene, applyDevelopment, renderToCanvas, createThumbnail, type RenderedImageData } from '../utils/renderEngine';
  import type { PhotoSubject, FilmStock, DevParams, CanvasMode } from '../types/game';

  export let subject: PhotoSubject | null = null;
  export let film: FilmStock;
  export let params: DevParams;
  export let progress: number = 1;
  export let showNegative: boolean = false;
  export let mode: CanvasMode = 'preview';

  const dispatch = createEventDispatcher<{
    rendered: { url: string; image: RenderedImageData };
  }>();

  let canvas: HTMLCanvasElement;
  let baseScene: RenderedImageData | null = null;
  let ctx: CanvasRenderingContext2D;
  let isReady = false;

  $: if (subject && isReady) {
    baseScene = generateBaseScene(subject);
    render();
  }

  $: if (baseScene && isReady) {
    render();
  }

  onMount(() => {
    if (canvas) {
      ctx = canvas.getContext('2d')!;
      isReady = true;
      if (subject) {
        baseScene = generateBaseScene(subject);
        render();
      }
    }
  });

  function render() {
    if (!baseScene || !ctx) return;

    const isColorFilm = film.color === 'color';
    const renderProgress = mode === 'developing' ? progress : 1;

    const result = applyDevelopment(
      baseScene,
      {
        exposure: params.exposure,
        developmentTime: params.developmentTime,
        temperature: params.temperature,
        agitation: params.agitation,
        contrast: params.contrast,
        saturation: params.saturation,
        dilution: params.dilution,
        isColorFilm,
        filmBaseContrast: film.baseContrast,
        filmBaseSaturation: film.baseSaturation,
        grainSize: film.grainSize,
        subjectBaseBrightness: subject?.baseBrightness || 0.35,
        seed: subject?.seed || 1,
        progress: renderProgress
      },
      showNegative
    );

    renderToCanvas(ctx, result);

    if (mode === 'final' && progress >= 1) {
      const thumb = createThumbnail(ctx, result, 480, 640);
      dispatch('rendered', { url: thumb, image: result });
    }
  }
</script>

<div class="canvas-wrapper" class:developing={mode === 'developing'} class:empty={!subject}>
  {#if !subject}
    <div class="placeholder">
      <div class="placeholder-icon">📷</div>
      <div class="placeholder-text">请选择拍摄题材开始冲洗</div>
    </div>
  {/if}
  <canvas
    bind:this={canvas}
    width={480}
    height={640}
    class="darkroom-canvas"
    class:fade-in={subject && mode !== 'preview'}
  />
  {#if mode === 'developing' && subject}
    <div class="develop-overlay">
      <div class="liquid-wave" style="--progress: {progress}" />
      <div class="progress-label">显影中 {Math.round(progress * 100)}%</div>
    </div>
  {/if}
  {#if subject}
    <div class="frame-corner tl" />
    <div class="frame-corner tr" />
    <div class="frame-corner bl" />
    <div class="frame-corner br" />
    <div class="film-border" />
  {/if}
</div>

<style>
  .canvas-wrapper {
    position: relative;
    width: 100%;
    max-width: 480px;
    aspect-ratio: 3 / 4;
    margin: 0 auto;
    background: #0a0503;
    border-radius: 4px;
    overflow: hidden;
    box-shadow:
      0 0 0 1px rgba(139, 90, 43, 0.3),
      0 8px 32px rgba(0, 0, 0, 0.8),
      inset 0 0 60px rgba(0, 0, 0, 0.5);
  }

  .canvas-wrapper.empty {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .placeholder {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    color: #6b5a45;
  }

  .placeholder-icon {
    font-size: 64px;
    opacity: 0.4;
  }

  .placeholder-text {
    font-size: 14px;
    letter-spacing: 2px;
  }

  .darkroom-canvas {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .darkroom-canvas.fade-in {
    animation: fadeIn 0.8s ease-out;
  }

  @keyframes fadeIn {
    from { filter: brightness(0.1) blur(4px); }
    to { filter: brightness(1) blur(0); }
  }

  .develop-overlay {
    position: absolute;
    inset: 0;
    pointer-events: none;
    overflow: hidden;
  }

  .liquid-wave {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: calc(var(--progress) * 100%);
    background: linear-gradient(
      to top,
      rgba(20, 80, 120, 0.6) 0%,
      rgba(40, 120, 160, 0.4) 60%,
      transparent 100%
    );
    animation: wave 2s ease-in-out infinite;
  }

  @keyframes wave {
    0%, 100% { transform: translateX(0); }
    50% { transform: translateX(-5%); }
  }

  .liquid-wave::before {
    content: '';
    position: absolute;
    top: -10px;
    left: 0;
    right: 0;
    height: 20px;
    background: repeating-linear-gradient(
      90deg,
      transparent,
      rgba(100, 180, 220, 0.3) 10px,
      transparent 20px
    );
    animation: waveMove 3s linear infinite;
  }

  @keyframes waveMove {
    from { transform: translateX(0); }
    to { transform: translateX(40px); }
  }

  .progress-label {
    position: absolute;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.7);
    padding: 6px 16px;
    border-radius: 20px;
    font-size: 13px;
    color: #8bc8e8;
    letter-spacing: 1px;
    border: 1px solid rgba(139, 180, 220, 0.3);
  }

  .frame-corner {
    position: absolute;
    width: 16px;
    height: 16px;
    border-color: rgba(180, 140, 90, 0.6);
    border-style: solid;
    border-width: 0;
    pointer-events: none;
  }

  .tl { top: 10px; left: 10px; border-top-width: 2px; border-left-width: 2px; }
  .tr { top: 10px; right: 10px; border-top-width: 2px; border-right-width: 2px; }
  .bl { bottom: 10px; left: 10px; border-bottom-width: 2px; border-left-width: 2px; }
  .br { bottom: 10px; right: 10px; border-bottom-width: 2px; border-right-width: 2px; }

  .film-border {
    position: absolute;
    top: 0;
    bottom: 0;
    right: 0;
    width: 24px;
    background: repeating-linear-gradient(
      to bottom,
      rgba(30, 20, 15, 0.8),
      rgba(30, 20, 15, 0.8) 12px,
      transparent 12px,
      transparent 20px
    );
    pointer-events: none;
  }

  .canvas-wrapper.developing {
    box-shadow:
      0 0 0 1px rgba(80, 160, 200, 0.4),
      0 0 40px rgba(40, 120, 180, 0.2),
      0 8px 32px rgba(0, 0, 0, 0.8);
  }
</style>
