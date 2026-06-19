<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { DevParams, PhotoSubject, FilmStock } from '../types/game';
  import ParamPresets from './ParamPresets.svelte';
  import {
    calculateParamRisks,
    getRiskLevelColor,
    getRiskLevelBg,
    getRiskLevelLabel,
    type RiskAssessment
  } from '../utils/recommendation';

  export let params: DevParams;
  export let subject: PhotoSubject | null = null;
  export let film: FilmStock;
  export let disabled: boolean = false;

  let expandedRisk: string | null = null;
  const EXPANDED_ALL = '__all__' as const;

  const dispatch = createEventDispatcher<{
    update: Partial<DevParams>;
    applyPreset: DevParams;
  }>();

  function handleApplyPreset(e: CustomEvent<DevParams>) {
    dispatch('applyPreset', e.detail);
  }

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

  $: risks = calculateParamRisks(params, subject, film);
  $: overallRiskLevel = risks.length > 0
    ? risks.reduce((max, r) =>
        ['safe', 'low', 'moderate', 'high', 'critical'].indexOf(r.level) >
        ['safe', 'low', 'moderate', 'high', 'critical'].indexOf(max.level) ? r : max
      , risks[0])
    : null;

  function getDeviationTagText(cls: string): string {
    if (cls === 'perfect') return '✓ 最佳';
    if (cls === 'good') return '接近';
    if (cls === 'warn') return '偏离';
    return '较远';
  }

  function getParamAffectedClass(key: keyof DevParams): string {
    if (!risks.length) return '';
    const hasHighRisk = risks.some(r =>
      r.affectedParams.includes(key) && (r.level === 'high' || r.level === 'critical')
    );
    if (hasHighRisk) return 'risk-highlight';
    const hasWarnRisk = risks.some(r =>
      r.affectedParams.includes(key) && (r.level === 'moderate')
    );
    if (hasWarnRisk) return 'risk-warn';
    return '';
  }

  function toggleRisk(category: string) {
    expandedRisk = String(expandedRisk) === category ? null : category;
  }

  function isExpanded(category: string): boolean {
    return String(expandedRisk) === category;
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

  {#if risks.length > 0}
    <div class="risk-alert-panel" style="--risk-color: {getRiskLevelColor(overallRiskLevel?.level || 'low')}; --risk-bg: {getRiskLevelBg(overallRiskLevel?.level || 'low')};">
      <div class="risk-alert-header" on:click={() => expandedRisk = isExpanded(EXPANDED_ALL) ? null : EXPANDED_ALL}>
        <div class="risk-alert-icon">
          {overallRiskLevel?.icon || '⚠️'}
        </div>
        <div class="risk-alert-info">
          <div class="risk-alert-title">
            <span class="risk-count-badge">{risks.length}</span>
            项潜在风险
            <span class="risk-alert-level" style="color: var(--risk-color);">
              最高：{getRiskLevelLabel(overallRiskLevel?.level || 'low')}
            </span>
          </div>
          <div class="risk-alert-desc">{overallRiskLevel?.description}</div>
        </div>
        <div class="risk-alert-toggle" class:open={isExpanded(EXPANDED_ALL)}>
          ▾
        </div>
      </div>

      {#if isExpanded(EXPANDED_ALL)}
        <div class="risk-list">
          {#each risks as risk (risk.category)}
            <div
              class="risk-item"
              style="--risk-color: {getRiskLevelColor(risk.level)}; --risk-bg: {getRiskLevelBg(risk.level)};"
              on:click={() => toggleRisk(risk.category)}
            >
              <div class="risk-item-header">
                <div class="risk-item-left">
                  <span class="risk-item-icon">{risk.icon}</span>
                  <span class="risk-item-label">{risk.label}</span>
                  <span class="risk-item-level" style="background: var(--risk-bg); color: var(--risk-color);">
                    {getRiskLevelLabel(risk.level)}
                  </span>
                </div>
                <div class="risk-item-right">
                  <div class="risk-intensity-bar">
                    <div
                      class="risk-intensity-fill"
                      style="width: {Math.round(risk.intensity * 100)}%; background: var(--risk-color);"
                    />
                  </div>
                  <span class="risk-toggle-arrow" class:open={isExpanded(risk.category)}>▾</span>
                </div>
              </div>

              {#if isExpanded(risk.category)}
                <div class="risk-item-detail">
                  <div class="risk-detail-row">
                    <span class="risk-detail-label">影响描述：</span>
                    <span class="risk-detail-value">{risk.description}</span>
                  </div>
                  <div class="risk-detail-row">
                    <span class="risk-detail-label">关联参数：</span>
                    <div class="risk-param-tags">
                      {#each risk.affectedParams as p}
                        <span class="risk-param-tag">{sliders.find(s => s.key === p)?.label || p}</span>
                      {/each}
                    </div>
                  </div>
                  <div class="risk-detail-row suggestion">
                    <span class="risk-detail-label">💡 建议：</span>
                    <span class="risk-detail-value">{risk.suggestion}</span>
                  </div>
                </div>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {:else}
    <div class="risk-safe-panel">
      <span class="risk-safe-icon">✓</span>
      <span class="risk-safe-text">当前参数组合安全，各项指标均衡</span>
    </div>
  {/if}

  <div class="sliders-list">
    {#each enhancedSliders as slider (slider.key)}
      <div class="slider-item {getParamAffectedClass(slider.key)}" class:disabled>
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

  <ParamPresets
    currentParams={params}
    subjectId={subject?.id || null}
    filmId={null}
    {disabled}
    on:apply={handleApplyPreset}
  />
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

  .slider-item.risk-highlight {
    border-color: rgba(224, 85, 85, 0.5) !important;
    box-shadow: 0 0 0 1px rgba(224, 85, 85, 0.2), inset 0 0 20px rgba(224, 85, 85, 0.05);
    animation: riskPulse 2s ease-in-out infinite;
  }

  .slider-item.risk-warn {
    border-color: rgba(224, 152, 80, 0.4) !important;
    box-shadow: inset 0 0 20px rgba(224, 152, 80, 0.05);
  }

  @keyframes riskPulse {
    0%, 100% { box-shadow: 0 0 0 1px rgba(224, 85, 85, 0.2), inset 0 0 20px rgba(224, 85, 85, 0.05); }
    50% { box-shadow: 0 0 0 1px rgba(224, 85, 85, 0.4), inset 0 0 20px rgba(224, 85, 85, 0.1); }
  }

  .risk-alert-panel {
    margin-bottom: 16px;
    border-radius: 10px;
    border: 1px solid var(--risk-color);
    background: var(--risk-bg);
    overflow: hidden;
    transition: all 0.3s ease;
  }

  .risk-alert-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 14px;
    cursor: pointer;
    transition: background 0.2s;
  }

  .risk-alert-header:hover {
    background: rgba(255, 255, 255, 0.03);
  }

  .risk-alert-icon {
    font-size: 24px;
    flex-shrink: 0;
    filter: drop-shadow(0 0 8px var(--risk-color));
    animation: riskBounce 1.5s ease-in-out infinite;
  }

  @keyframes riskBounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-2px); }
  }

  .risk-alert-info {
    flex: 1;
    min-width: 0;
  }

  .risk-alert-title {
    font-size: 13px;
    font-weight: 600;
    color: #d4c4a4;
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 2px;
  }

  .risk-count-badge {
    background: var(--risk-color);
    color: #1a0f08;
    font-size: 10px;
    font-weight: 700;
    padding: 1px 7px;
    border-radius: 10px;
    min-width: 18px;
    text-align: center;
  }

  .risk-alert-level {
    font-size: 11px;
    font-weight: 500;
  }

  .risk-alert-desc {
    font-size: 11px;
    color: #8a7a5a;
    line-height: 1.4;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
  }

  .risk-alert-toggle {
    color: #6a5a45;
    font-size: 12px;
    transition: transform 0.25s ease;
    flex-shrink: 0;
  }

  .risk-alert-toggle.open {
    transform: rotate(180deg);
  }

  .risk-list {
    padding: 0 12px 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .risk-item {
    border-radius: 8px;
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid transparent;
    overflow: hidden;
    transition: all 0.2s ease;
  }

  .risk-item:hover {
    border-color: rgba(139, 90, 43, 0.25);
    background: rgba(0, 0, 0, 0.25);
  }

  .risk-item-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    cursor: pointer;
    gap: 10px;
  }

  .risk-item-left {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  .risk-item-icon {
    font-size: 16px;
    flex-shrink: 0;
  }

  .risk-item-label {
    font-size: 12px;
    font-weight: 500;
    color: #c8b898;
    flex-shrink: 0;
  }

  .risk-item-level {
    font-size: 10px;
    padding: 2px 7px;
    border-radius: 8px;
    font-weight: 600;
    flex-shrink: 0;
  }

  .risk-item-right {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  .risk-intensity-bar {
    width: 60px;
    height: 6px;
    border-radius: 3px;
    background: rgba(60, 50, 40, 0.5);
    overflow: hidden;
    flex-shrink: 0;
  }

  .risk-intensity-fill {
    height: 100%;
    border-radius: 3px;
    transition: width 0.3s ease, background 0.3s ease;
  }

  .risk-toggle-arrow {
    color: #6a5a45;
    font-size: 10px;
    transition: transform 0.25s ease;
    flex-shrink: 0;
  }

  .risk-toggle-arrow.open {
    transform: rotate(180deg);
  }

  .risk-item-detail {
    padding: 0 12px 12px;
    margin: 0 4px 4px;
    border-top: 1px solid rgba(139, 90, 43, 0.1);
    padding-top: 10px;
  }

  .risk-detail-row {
    display: flex;
    gap: 8px;
    margin-bottom: 8px;
    align-items: flex-start;
  }

  .risk-detail-row:last-child {
    margin-bottom: 0;
  }

  .risk-detail-label {
    font-size: 11px;
    color: #7a6a55;
    flex-shrink: 0;
    min-width: 64px;
    padding-top: 1px;
  }

  .risk-detail-value {
    font-size: 11px;
    color: #b8a888;
    line-height: 1.5;
    flex: 1;
  }

  .risk-detail-row.suggestion .risk-detail-value {
    color: var(--risk-color);
    font-weight: 500;
  }

  .risk-param-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
  }

  .risk-param-tag {
    font-size: 10px;
    padding: 2px 8px;
    border-radius: 6px;
    background: rgba(139, 90, 43, 0.2);
    color: #a89878;
    border: 1px solid rgba(139, 90, 43, 0.25);
  }

  .risk-safe-panel {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 14px;
    margin-bottom: 16px;
    border-radius: 10px;
    background: rgba(104, 200, 136, 0.08);
    border: 1px solid rgba(104, 200, 136, 0.25);
  }

  .risk-safe-icon {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: rgba(104, 200, 136, 0.2);
    color: #68c888;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 700;
    flex-shrink: 0;
  }

  .risk-safe-text {
    font-size: 12px;
    color: #88b898;
    font-weight: 500;
  }
</style>
