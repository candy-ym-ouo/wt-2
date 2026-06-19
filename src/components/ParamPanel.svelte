<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { DevParams, PhotoSubject } from '../types/game';

  export let params: DevParams;
  export let subject: PhotoSubject | null = null;
  export let disabled: boolean = false;

  const dispatch = createEventDispatcher<{
    update: Partial<DevParams>;
  }>();

  interface SliderConfig {
    key: keyof DevParams;
    label: string;
    icon: string;
    description: string;
    lowLabel: string;
    highLabel: string;
    showIdeal?: boolean;
  }

  const sliders: SliderConfig[] = [
    {
      key: 'exposure',
      label: '曝光值',
      icon: '☀',
      description: '控制画面整体亮度',
      lowLabel: '不足',
      highLabel: '过度',
      showIdeal: true
    },
    {
      key: 'contrast',
      label: '对比度',
      icon: '◐',
      description: '明暗区域的差异程度',
      lowLabel: '柔和',
      highLabel: '强烈',
      showIdeal: true
    },
    {
      key: 'saturation',
      label: '饱和度',
      icon: '🎨',
      description: '色彩的鲜艳程度',
      lowLabel: '淡雅',
      highLabel: '浓郁',
      showIdeal: true
    },
    {
      key: 'developmentTime',
      label: '显影时间',
      icon: '⏱',
      description: '底片在显影液中的停留时间',
      lowLabel: '短',
      highLabel: '长'
    },
    {
      key: 'temperature',
      label: '药液温度',
      icon: '🌡',
      description: '显影液的工作温度',
      lowLabel: '低',
      highLabel: '高'
    },
    {
      key: 'agitation',
      label: '搅动强度',
      icon: '🌀',
      description: '显影过程中的搅动频率',
      lowLabel: '轻柔',
      highLabel: '剧烈'
    },
    {
      key: 'dilution',
      label: '稀释比例',
      icon: '💧',
      description: '显影液与水的混合比例',
      lowLabel: '浓',
      highLabel: '稀'
    }
  ];

  function getIdeal(key: keyof DevParams): number | null {
    if (!subject) return null;
    switch (key) {
      case 'exposure': return subject.idealExposure;
      case 'contrast': return subject.idealContrast;
      case 'saturation': return subject.idealSaturation;
      default: return null;
    }
  }

  function getDeviationClass(key: keyof DevParams, value: number): string {
    const ideal = getIdeal(key);
    if (ideal === null) return '';
    const diff = Math.abs(value - ideal);
    if (diff < 0.05) return 'perfect';
    if (diff < 0.12) return 'good';
    if (diff < 0.22) return 'warn';
    return 'bad';
  }

  function onInput(key: keyof DevParams, e: Event) {
    const target = e.target as HTMLInputElement;
    dispatch('update', { [key]: parseFloat(target.value) });
  }

  interface EnhancedSlider extends SliderConfig {
    ideal: number | null;
    deviationClass: string;
    value: number;
  }

  $: enhancedSliders = sliders.map(slider => ({
    ...slider,
    ideal: getIdeal(slider.key),
    deviationClass: getDeviationClass(slider.key, params[slider.key]),
    value: params[slider.key]
  }));

  function getDeviationTagText(cls: string): string {
    if (cls === 'perfect') return '✓ 最佳';
    if (cls === 'good') return '接近';
    if (cls === 'warn') return '偏离';
    return '较远';
  }
</script>

<div class="param-panel" id="param-panel">
  <div class="panel-header">
    <h3 class="title">参数调整</h3>
    <div class="header-hint">
      {#if subject}
        <span class="hint-dot perfect" />参考线已显示
      {:else}
        <span class="hint-dot" />选择题材后显示参考
      {/if}
    </div>
  </div>

  <div class="sliders-list">
    {#each enhancedSliders as slider (slider.key)}
      <div class="slider-item" class:disabled>
        <div class="slider-top">
          <div class="slider-label">
            <span class="label-icon">{slider.icon}</span>
            <span class="label-text">{slider.label}</span>
            {#if slider.deviationClass && slider.showIdeal}
              <span class="deviation-tag {slider.deviationClass}">
                {getDeviationTagText(slider.deviationClass)}
              </span>
            {/if}
          </div>
          <div class="slider-value {slider.deviationClass}">
            {Math.round(slider.value * 100)}
          </div>
        </div>

        <div class="slider-track-wrapper">
          <div class="value-labels">
            <span class="low">{slider.lowLabel}</span>
            <span class="high">{slider.highLabel}</span>
          </div>
          <div class="slider-container">
            {#if slider.ideal !== null}
              <div
                class="ideal-marker"
                style="left: {slider.ideal * 100}%"
                title="理想值"
              >
                <div class="marker-line" />
                <div class="marker-dot" />
              </div>
            {/if}
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={slider.value}
              disabled={disabled}
              on:input={(e) => onInput(slider.key, e)}
              class="custom-slider"
              style="--fill-percent: {slider.value * 100}%;"
            />
          </div>
        </div>

        <div class="slider-description">{slider.description}</div>
      </div>
    {/each}
  </div>
</div>

<style>
  .param-panel {
    background: linear-gradient(180deg, rgba(45, 26, 18, 0.8) 0%, rgba(26, 15, 10, 0.9) 100%);
    border: 1px solid rgba(139, 90, 43, 0.25);
    border-radius: 12px;
    padding: 18px;
    backdrop-filter: blur(10px);
    max-height: 100%;
    overflow-y: auto;
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

  .header-hint {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    color: #7a6a55;
  }

  .hint-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #5a4a35;
  }

  .hint-dot.perfect {
    background: #68c888;
    box-shadow: 0 0 6px rgba(104, 200, 136, 0.5);
  }

  .sliders-list {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .slider-item {
    padding: 12px;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 8px;
    border: 1px solid rgba(139, 90, 43, 0.1);
    transition: border-color 0.2s;
  }

  .slider-item:hover {
    border-color: rgba(139, 90, 43, 0.3);
  }

  .slider-item.disabled {
    opacity: 0.5;
    pointer-events: none;
  }

  .slider-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  }

  .slider-label {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .label-icon {
    font-size: 16px;
    opacity: 0.9;
  }

  .label-text {
    font-size: 13px;
    color: #c8b898;
    font-weight: 500;
  }

  .deviation-tag {
    font-size: 10px;
    padding: 2px 8px;
    border-radius: 10px;
    margin-left: 6px;
    letter-spacing: 0.5px;
  }

  .deviation-tag.perfect {
    background: rgba(104, 200, 136, 0.15);
    color: #68c888;
    border: 1px solid rgba(104, 200, 136, 0.3);
  }

  .deviation-tag.good {
    background: rgba(200, 180, 100, 0.15);
    color: #d4b860;
    border: 1px solid rgba(200, 180, 100, 0.3);
  }

  .deviation-tag.warn {
    background: rgba(200, 140, 80, 0.15);
    color: #e09850;
    border: 1px solid rgba(200, 140, 80, 0.3);
  }

  .deviation-tag.bad {
    background: rgba(200, 80, 80, 0.15);
    color: #e07070;
    border: 1px solid rgba(200, 80, 80, 0.3);
  }

  .slider-value {
    font-size: 14px;
    font-weight: 600;
    font-family: 'SF Mono', Monaco, monospace;
    min-width: 32px;
    text-align: right;
  }

  .slider-value.perfect { color: #68c888; }
  .slider-value.good { color: #d4b860; }
  .slider-value.warn { color: #e09850; }
  .slider-value.bad { color: #e07070; }

  .slider-track-wrapper {
    position: relative;
  }

  .value-labels {
    display: flex;
    justify-content: space-between;
    margin-bottom: 4px;
    font-size: 10px;
    color: #6a5a45;
    letter-spacing: 1px;
  }

  .slider-container {
    position: relative;
    height: 24px;
    display: flex;
    align-items: center;
  }

  .ideal-marker {
    position: absolute;
    top: 0;
    height: 100%;
    transform: translateX(-50%);
    z-index: 2;
    pointer-events: none;
  }

  .marker-line {
    position: absolute;
    top: 4px;
    left: 50%;
    transform: translateX(-50%);
    width: 2px;
    height: 16px;
    background: linear-gradient(
      to bottom,
      rgba(104, 200, 136, 0.1),
      rgba(104, 200, 136, 0.8),
      rgba(104, 200, 136, 0.1)
    );
  }

  .marker-dot {
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #68c888;
    box-shadow: 0 0 8px rgba(104, 200, 136, 0.6);
  }

  .custom-slider {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 6px;
    border-radius: 3px;
    background: linear-gradient(
      to right,
      rgba(139, 90, 43, 0.6) 0%,
      rgba(139, 90, 43, 0.6) var(--fill-percent),
      rgba(60, 50, 40, 0.5) var(--fill-percent),
      rgba(60, 50, 40, 0.5) 100%
    );
    outline: none;
    cursor: pointer;
    transition: background 0.2s;
  }

  .custom-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: linear-gradient(135deg, #e8c898 0%, #c89860 100%);
    border: 2px solid rgba(0, 0, 0, 0.3);
    cursor: pointer;
    box-shadow:
      0 2px 8px rgba(0, 0, 0, 0.4),
      inset 0 1px 0 rgba(255, 255, 255, 0.3);
    transition: all 0.15s ease;
  }

  .custom-slider::-webkit-slider-thumb:hover {
    transform: scale(1.1);
    box-shadow:
      0 4px 12px rgba(0, 0, 0, 0.5),
      inset 0 1px 0 rgba(255, 255, 255, 0.4);
  }

  .custom-slider::-moz-range-thumb {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: linear-gradient(135deg, #e8c898 0%, #c89860 100%);
    border: 2px solid rgba(0, 0, 0, 0.3);
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
  }

  .custom-slider:disabled {
    cursor: not-allowed;
  }

  .custom-slider:disabled::-webkit-slider-thumb {
    cursor: not-allowed;
    opacity: 0.6;
  }

  .slider-description {
    margin-top: 6px;
    font-size: 11px;
    color: #6a5a45;
    line-height: 1.4;
  }
</style>
