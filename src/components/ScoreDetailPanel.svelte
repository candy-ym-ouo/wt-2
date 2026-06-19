<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { ProcessedPhoto, PhotoSubject, FilmStock, KeyAreaResult, ParamDeviation, DeductionItem } from '../types/game';
  import { GRADE_COLORS, GRADE_NAMES, PHOTO_SUBJECTS, FILM_STOCKS, SCENE_TYPE_LABELS } from '../data/gameData';

  export let photo: ProcessedPhoto;

  const dispatch = createEventDispatcher<{
    close: void;
    applySuggestions: void;
    updateNotes: string;
  }>();

  const details = photo.details;
  const subject = PHOTO_SUBJECTS.find(s => s.id === photo.subjectId) as PhotoSubject;
  const film = FILM_STOCKS.find(f => f.id === photo.filmId) as FilmStock;

  let activeTab: 'keyAreas' | 'deviations' | 'deductions' | 'suggestions' | 'notes' = 'deductions';

  const hitStatusConfig = {
    excellent: { label: '优秀', color: '#68c888', bgColor: 'rgba(104, 200, 136, 0.15)', icon: '✓' },
    good: { label: '良好', color: '#c8a878', bgColor: 'rgba(200, 168, 120, 0.15)', icon: '◯' },
    fair: { label: '一般', color: '#88a0c8', bgColor: 'rgba(136, 160, 200, 0.15)', icon: '△' },
    poor: { label: '较差', color: '#c88888', bgColor: 'rgba(200, 136, 136, 0.15)', icon: '✕' }
  };

  const severityConfig = {
    minor: { label: '轻微', color: '#88a0c8', bgColor: 'rgba(136, 160, 200, 0.15)' },
    moderate: { label: '中等', color: '#c8a878', bgColor: 'rgba(200, 168, 120, 0.15)' },
    major: { label: '严重', color: '#d88050', bgColor: 'rgba(216, 128, 80, 0.15)' },
    critical: { label: '致命', color: '#c86060', bgColor: 'rgba(200, 96, 96, 0.15)' }
  };

  const categoryIcons: Record<string, string> = {
    exposure: '☀',
    contrast: '◐',
    color: '🎨',
    detail: '✨'
  };

  const tabConfig = [
    { key: 'deductions', label: '扣分明细', icon: '📋' },
    { key: 'keyAreas', label: '关键区域', icon: '🎯' },
    { key: 'deviations', label: '参数偏差', icon: '📊' },
    { key: 'suggestions', label: '优化建议', icon: '💡' },
    { key: 'notes', label: '冲洗笔记', icon: '📝' }
  ];

  let noteText = photo.notes || '';
  let isEditingNote = !photo.notes;

  const quickTags = [
    { label: '灵感', prefix: '💡 灵感：' },
    { label: '问题', prefix: '⚠️ 问题复盘：' },
    { label: '改进', prefix: '🔧 下次改进：' },
    { label: '心得', prefix: '✨ 心得：' },
    { label: '参数', prefix: '⚙ 参数尝试：' },
    { label: '值得', prefix: '👍 值得保留：' }
  ];

  function insertQuickTag(prefix: string) {
    const separator = noteText.length > 0 && !noteText.endsWith('\n') ? '\n' : '';
    noteText = noteText + separator + prefix;
    isEditingNote = true;
  }

  function saveNotes() {
    dispatch('updateNotes', noteText);
  }

  function toggleEditNote() {
    if (isEditingNote) {
      saveNotes();
    }
    isEditingNote = !isEditingNote;
  }

  $: totalDeductions = details.deductions.reduce((sum, d) => sum + d.pointsLost, 0);
  $: hitCount = details.keyAreaResults.filter(a => a.isHit).length;
  $: hitRate = Math.round((hitCount / details.keyAreaResults.length) * 100);
  $: maxScore = 100;

  $: sortedSuggestions = getSortedSuggestions();

  function getSortedSuggestions(): DeductionItem[] {
    return [...details.deductions].sort((a, b) => b.pointsLost - a.pointsLost);
  }

  function formatDate(ts: number): string {
    return new Date(ts).toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function getParamIcon(param: string): string {
    const icons: Record<string, string> = {
      exposure: '☀',
      contrast: '◐',
      developmentTime: '⏱',
      temperature: '🌡',
      saturation: '🎨',
      agitation: '🔄',
      dilution: '💧'
    };
    return icons[param] || '⚙';
  }

  function applySuggestions() {
    dispatch('applySuggestions');
  }

  function setActiveTab(key: string) {
    activeTab = key as typeof activeTab;
  }
</script>

<div class="detail-overlay" on:click={() => dispatch('close')}>
  <div class="detail-panel" on:click|stopPropagation>
    <div class="detail-header">
      <h2 class="detail-title">🔍 评分详细分析</h2>
      <button class="close-btn" on:click={() => dispatch('close')}>✕</button>
    </div>

    <div class="summary-section">
      <div class="grade-summary">
        <div
          class="grade-circle"
          style="--grade-color: {GRADE_COLORS[details.grade]}; box-shadow: 0 0 30px {GRADE_COLORS[details.grade]}30;"
        >
          <span class="grade-letter">{details.grade}</span>
          <span class="grade-name">{GRADE_NAMES[details.grade]}</span>
        </div>
        <div class="score-summary">
          <div class="main-score">
            <span class="score-value">{details.overall}</span>
            <span class="score-max">/100</span>
          </div>
          <div class="score-meta">
            <span class="meta-item">📷 {subject?.name}</span>
            <span class="meta-item">🎞 {film?.name}</span>
            <span class="meta-item">📅 {formatDate(photo.timestamp)}</span>
          </div>
          <div class="quick-stats">
            <div class="stat-item">
              <span class="stat-value">{details.keyAreaResults.length}</span>
              <span class="stat-label">关键区域</span>
            </div>
            <div class="stat-item">
              <span class="stat-value success">{hitCount}</span>
              <span class="stat-label">命中</span>
            </div>
            <div class="stat-item">
              <span class="stat-value warning">{totalDeductions}</span>
              <span class="stat-label">总扣分</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">{details.deductions.length}</span>
              <span class="stat-label">扣分项</span>
            </div>
          </div>
        </div>
      </div>

      <div class="score-bars-grid">
        <div class="score-card">
          <div class="score-card-header">
            <span class="score-card-icon">☀</span>
            <span class="score-card-label">曝光控制</span>
          </div>
          <div class="score-card-value">{details.exposure}</div>
          <div class="score-card-bar">
            <div class="bar-fill" style="width: {details.exposure}%; background: {details.exposure >= 70 ? '#68c888' : '#c88888'};" />
          </div>
        </div>
        <div class="score-card">
          <div class="score-card-header">
            <span class="score-card-icon">◐</span>
            <span class="score-card-label">层次反差</span>
          </div>
          <div class="score-card-value">{details.contrast}</div>
          <div class="score-card-bar">
            <div class="bar-fill" style="width: {details.contrast}%; background: {details.contrast >= 70 ? '#68c888' : '#c88888'};" />
          </div>
        </div>
        {#if film.color === 'color'}
          <div class="score-card">
            <div class="score-card-header">
              <span class="score-card-icon">🎨</span>
              <span class="score-card-label">色彩还原</span>
            </div>
            <div class="score-card-value">{details.color}</div>
            <div class="score-card-bar">
              <div class="bar-fill" style="width: {details.color}%; background: {details.color >= 70 ? '#68c888' : '#c88888'};" />
            </div>
          </div>
        {/if}
        <div class="score-card">
          <div class="score-card-header">
            <span class="score-card-icon">✨</span>
            <span class="score-card-label">细节质感</span>
          </div>
          <div class="score-card-value">{details.detail}</div>
          <div class="score-card-bar">
            <div class="bar-fill" style="width: {details.detail}%; background: {details.detail >= 70 ? '#68c888' : '#c88888'};" />
          </div>
        </div>
      </div>
    </div>

    <div class="tabs-section">
      <div class="tabs-nav">
        {#each tabConfig as tab (tab.key)}
          <button
            class="tab-btn"
            class:active={activeTab === tab.key}
            on:click={() => setActiveTab(tab.key)}
          >
            <span class="tab-icon">{tab.icon}</span>
            <span class="tab-label">{tab.label}</span>
          </button>
        {/each}
      </div>

      <div class="tabs-content">
        {#if activeTab === 'deductions'}
          <div class="deductions-list">
            {#if details.deductions.length === 0}
              <div class="empty-state">
                <div class="empty-icon">🎉</div>
                <div class="empty-text">太棒了！没有明显的扣分点</div>
                <div class="empty-hint">你的暗房技术已经相当精湛</div>
              </div>
            {:else}
              {#each details.deductions as deduction (deduction.category + deduction.reason)}
                <div class="deduction-item" style="border-left: 3px solid {severityConfig[deduction.severity].color};">
                  <div class="deduction-header">
                    <div class="deduction-category">
                      <span class="category-icon">{categoryIcons[deduction.category]}</span>
                      <span class="category-name">{deduction.categoryLabel}</span>
                    </div>
                    <div class="deduction-points" style="color: {severityConfig[deduction.severity].color};">
                      -{deduction.pointsLost}分
                    </div>
                  </div>
                  <div class="deduction-reason">
                    <span class="severity-badge" style="background: {severityConfig[deduction.severity].bgColor}; color: {severityConfig[deduction.severity].color};">
                      {severityConfig[deduction.severity].label}
                    </span>
                    <span class="reason-text">{deduction.reason}</span>
                  </div>
                  <div class="deduction-suggestion">
                    <span class="suggestion-icon">💡</span>
                    <span class="suggestion-text">{deduction.suggestion}</span>
                  </div>
                </div>
              {/each}
            {/if}
          </div>
        {/if}

        {#if activeTab === 'keyAreas'}
          <div class="keyareas-section">
            <div class="keyareas-summary">
              <div class="summary-info">
                <span class="summary-label">命中率</span>
                <span class="summary-value">{hitRate}%</span>
              </div>
              <div class="summary-info">
                <span class="summary-label">场景类型</span>
                <span class="summary-value">{SCENE_TYPE_LABELS[subject?.sceneType] || '未知'}</span>
              </div>
            </div>

            <div class="keyareas-visual">
              <div class="photo-preview">
                <img src={photo.imageDataUrl} alt="照片预览" />
                {#each details.keyAreaResults as area, i (area.name)}
                  <div
                    class="area-box"
                    style="
                      left: {area.x * 100}%;
                      top: {area.y * 100}%;
                      width: {area.w * 100}%;
                      height: {area.h * 100}%;
                      border-color: {hitStatusConfig[area.hitStatus].color};
                      background: {hitStatusConfig[area.hitStatus].bgColor};
                    "
                    title="{area.name}: {area.score}分"
                  >
                    <span class="area-index">{i + 1}</span>
                  </div>
                {/each}
              </div>
            </div>

            <div class="keyareas-list">
              {#each details.keyAreaResults as area, i (area.name)}
                <div class="keyarea-item" style="border-left: 3px solid {hitStatusConfig[area.hitStatus].color};">
                  <div class="keyarea-header">
                    <div class="keyarea-index" style="background: {hitStatusConfig[area.hitStatus].bgColor}; color: {hitStatusConfig[area.hitStatus].color};">
                      {i + 1}
                    </div>
                    <div class="keyarea-info">
                      <span class="keyarea-name">{area.name}</span>
                      <span class="keyarea-importance">重要度 {Math.round(area.importance * 100)}%</span>
                    </div>
                    <div class="keyarea-score">
                      <span class="score-num" style="color: {hitStatusConfig[area.hitStatus].color};">{area.score}</span>
                      <span class="status-badge" style="background: {hitStatusConfig[area.hitStatus].bgColor}; color: {hitStatusConfig[area.hitStatus].color};">
                        {hitStatusConfig[area.hitStatus].icon} {hitStatusConfig[area.hitStatus].label}
                      </span>
                    </div>
                  </div>
                  <div class="keyarea-brightness">
                    <div class="brightness-row">
                      <span class="brightness-label">理想亮度</span>
                      <div class="brightness-track">
                        <div class="brightness-ideal" style="left: {area.idealBrightness * 100}%;" />
                        <div class="brightness-actual" style="left: {area.actualBrightness * 100}%; background: {area.actualBrightness > area.idealBrightness ? '#ff8888' : '#88aaff'};" />
                      </div>
                      <span class="brightness-values">
                        <span class="ideal">理:{Math.round(area.idealBrightness * 100)}</span>
                        <span class="actual">实:{Math.round(area.actualBrightness * 100)}</span>
                      </span>
                    </div>
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {/if}

        {#if activeTab === 'deviations'}
          <div class="deviations-section">
            <div class="deviations-summary">
              <span class="summary-text">
                共检测到 <strong>{details.paramDeviations.length}</strong> 项参数偏差
              </span>
            </div>

            {#if details.paramDeviations.length === 0}
              <div class="empty-state">
                <div class="empty-icon">🎯</div>
                <div class="empty-text">所有参数都在理想范围内</div>
                <div class="empty-hint">你的参数控制非常精准</div>
              </div>
            {:else}
              <div class="deviations-list">
                {#each details.paramDeviations as deviation (deviation.param)}
                  <div class="deviation-item">
                    <div class="deviation-header">
                      <span class="param-icon">{getParamIcon(deviation.param)}</span>
                      <div class="param-info">
                        <span class="param-name">{deviation.label}</span>
                        <span class="param-direction" style="color: {deviation.direction === 'high' ? '#ff8888' : '#88aaff'};">
                          {deviation.direction === 'high' ? '↑ 偏高' : '↓ 偏低'}
                        </span>
                      </div>
                      <div class="param-impact">
                        <span class="impact-label">影响</span>
                        <span class="impact-value">-{deviation.scoreImpact}分</span>
                      </div>
                    </div>
                    <div class="deviation-values">
                      <div class="value-row">
                        <span class="value-label">理想值</span>
                        <span class="value-num">{Math.round(deviation.idealValue * 100)}</span>
                      </div>
                      <div class="value-row">
                        <span class="value-label">实际值</span>
                        <span class="value-num" style="color: {deviation.direction === 'high' ? '#ff8888' : '#88aaff'};">
                          {Math.round(deviation.actualValue * 100)}
                        </span>
                      </div>
                      <div class="value-row">
                        <span class="value-label">偏差</span>
                        <span class="value-num" style="color: {deviation.direction === 'high' ? '#ff8888' : '#88aaff'};">
                          {deviation.direction === 'high' ? '+' : ''}{deviation.deviationPercent}%
                        </span>
                      </div>
                    </div>
                    <div class="deviation-bar">
                      <div class="bar-track">
                        <div class="bar-ideal" style="left: {deviation.idealValue * 100}%;" />
                        <div class="bar-actual" style="left: {deviation.actualValue * 100}%; background: {deviation.direction === 'high' ? '#ff8888' : '#88aaff'};" />
                      </div>
                    </div>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        {/if}

        {#if activeTab === 'suggestions'}
          <div class="suggestions-section">
            <div class="suggestions-header">
              <div class="header-info">
                <span class="header-icon">💡</span>
                <span class="header-title">优先优化建议</span>
              </div>
              <button class="apply-btn" on:click={applySuggestions} disabled={sortedSuggestions.length === 0}>
                <span>🎬</span> 应用推荐参数
              </button>
            </div>

            {#if sortedSuggestions.length === 0}
              <div class="empty-state">
                <div class="empty-icon">🏆</div>
                <div class="empty-text">完美！无需优化</div>
                <div class="empty-hint">继续保持这种水准</div>
              </div>
            {:else}
              <div class="suggestions-list">
                {#each sortedSuggestions as suggestion, i (suggestion.category + suggestion.reason)}
                  <div class="suggestion-item">
                    <div class="suggestion-rank">{i + 1}</div>
                    <div class="suggestion-content">
                      <div class="suggestion-header">
                        <span class="category-icon">{categoryIcons[suggestion.category]}</span>
                        <span class="category-name">{suggestion.categoryLabel}</span>
                        <span class="potential-gain">可挽回 +{suggestion.pointsLost}分</span>
                      </div>
                      <div class="suggestion-problem">
                        <span class="problem-label">问题：</span>
                        <span class="problem-text">{suggestion.reason}</span>
                      </div>
                      <div class="suggestion-solution">
                        <span class="solution-icon">✅</span>
                        <span class="solution-text">{suggestion.suggestion}</span>
                      </div>
                    </div>
                  </div>
                {/each}
              </div>
            {/if}

            <div class="additional-tips">
              <h4 class="tips-title">📚 暗房技巧小贴士</h4>
              <div class="tips-grid">
                <div class="tip-card">
                  <span class="tip-icon">🌅</span>
                  <div class="tip-content">
                    <span class="tip-title">分区曝光</span>
                    <span class="tip-desc">针对不同亮度区域分别曝光，保留更多细节</span>
                  </div>
                </div>
                <div class="tip-card">
                  <span class="tip-icon">⏱</span>
                  <div class="tip-content">
                    <span class="tip-title">显影时间</span>
                    <span class="tip-desc">每增加10%时间，反差约增加5-8%</span>
                  </div>
                </div>
                <div class="tip-card">
                  <span class="tip-icon">🌡</span>
                  <div class="tip-content">
                    <span class="tip-title">温度控制</span>
                    <span class="tip-desc">±1°C的变化会显著影响色彩和反差</span>
                  </div>
                </div>
                <div class="tip-card">
                  <span class="tip-icon">🔄</span>
                  <div class="tip-content">
                    <span class="tip-title">均匀搅动</span>
                    <span class="tip-desc">前30秒连续搅动，之后每30秒搅动5秒</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        {/if}

        {#if activeTab === 'notes'}
          <div class="notes-section">
            <div class="notes-header">
              <div class="header-info">
                <span class="header-icon">📝</span>
                <span class="header-title">冲洗笔记</span>
                {#if noteText && !isEditingNote}
                  <span class="note-status saved">已保存</span>
                {:else if isEditingNote}
                  <span class="note-status editing">编辑中</span>
                {/if}
              </div>
              <button class="edit-btn" on:click={toggleEditNote}>
                <span>{isEditingNote ? '💾' : '✏️'}</span>
                <span>{isEditingNote ? '保存笔记' : '编辑笔记'}</span>
              </button>
            </div>

            <div class="quick-tags-row">
              <span class="quick-label">快速插入：</span>
              <div class="quick-tag-group">
                {#each quickTags as qt (qt.label)}
                  <button
                    class="quick-tag-btn"
                    on:click={() => insertQuickTag(qt.prefix)}
                    title="插入 {qt.label}"
                  >
                    {qt.label}
                  </button>
                {/each}
              </div>
            </div>

            {#if isEditingNote}
              <textarea
                class="notes-textarea"
                bind:value={noteText}
                placeholder="在这里记录你的冲洗灵感、遇到的问题、参数调整的心得体会...
提示：使用上方快速标签可以快速分类笔记内容"
              />
              <div class="notes-actions">
                <div class="char-count">{noteText.length} 字</div>
                <div class="actions-right">
                  <button
                    class="action-btn cancel"
                    on:click={() => { noteText = photo.notes || ''; isEditingNote = false; }}
                  >
                    取消
                  </button>
                  <button class="action-btn save" on:click={saveNotes}>
                    💾 保存笔记
                  </button>
                </div>
              </div>
            {:else if noteText}
              <div class="notes-display">
                {#each noteText.split('\n') as line, i (i)}
                  {#if line.trim()}
                    <p class="note-line">
                      {line}
                    </p>
                  {/if}
                {/each}
              </div>
            {:else}
              <div class="empty-notes">
                <div class="empty-icon">📝</div>
                <div class="empty-text">还没有冲洗笔记</div>
                <div class="empty-hint">点击"编辑笔记"开始记录灵感与心得</div>
              </div>
            {/if}
          </div>
        {/if}
      </div>
    </div>
  </div>
</div>

<style>
  .detail-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.85);
    backdrop-filter: blur(12px);
    z-index: 1000;
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

  .detail-panel {
    background: linear-gradient(180deg, rgba(45, 26, 18, 0.98) 0%, rgba(26, 15, 10, 0.99) 100%);
    border: 1px solid rgba(139, 90, 43, 0.3);
    border-radius: 16px;
    width: 100%;
    max-width: 900px;
    max-height: 90vh;
    overflow-y: auto;
    animation: slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  @keyframes slideUp {
    from { transform: translateY(30px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }

  .detail-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 24px;
    border-bottom: 1px solid rgba(139, 90, 43, 0.2);
    position: sticky;
    top: 0;
    background: linear-gradient(180deg, rgba(45, 26, 18, 0.98) 0%, rgba(45, 26, 18, 0.95) 100%);
    z-index: 10;
  }

  .detail-title {
    font-size: 20px;
    font-weight: 600;
    color: #f0d8a8;
    margin: 0;
    letter-spacing: 2px;
  }

  .close-btn {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: rgba(100, 100, 100, 0.2);
    border: 1px solid rgba(100, 100, 100, 0.3);
    color: #a89878;
    font-size: 16px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .close-btn:hover {
    background: rgba(160, 80, 80, 0.25);
    color: #e08080;
    transform: scale(1.1);
  }

  .summary-section {
    padding: 24px;
    border-bottom: 1px solid rgba(139, 90, 43, 0.15);
  }

  .grade-summary {
    display: flex;
    gap: 24px;
    margin-bottom: 20px;
    align-items: center;
  }

  .grade-circle {
    width: 90px;
    height: 90px;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.4);
    border: 3px solid var(--grade-color);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .grade-letter {
    font-size: 38px;
    font-weight: bold;
    color: var(--grade-color);
    line-height: 1;
    text-shadow: 0 0 15px var(--grade-color);
  }

  .grade-name {
    font-size: 10px;
    color: var(--grade-color);
    letter-spacing: 2px;
    margin-top: 2px;
    opacity: 0.9;
  }

  .score-summary {
    flex: 1;
    min-width: 0;
  }

  .main-score {
    display: flex;
    align-items: baseline;
    gap: 4px;
    margin-bottom: 8px;
  }

  .score-value {
    font-size: 42px;
    font-weight: bold;
    color: #f0d8a8;
    line-height: 1;
    font-family: 'SF Mono', Monaco, monospace;
  }

  .score-max {
    font-size: 16px;
    color: #6a5a45;
  }

  .score-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 12px;
  }

  .meta-item {
    font-size: 11px;
    padding: 3px 10px;
    background: rgba(139, 90, 43, 0.15);
    color: #b8a878;
    border-radius: 10px;
    border: 1px solid rgba(139, 90, 43, 0.2);
  }

  .quick-stats {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
  }

  .stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 8px 14px;
    background: rgba(0, 0, 0, 0.25);
    border-radius: 8px;
    border: 1px solid rgba(139, 90, 43, 0.15);
  }

  .stat-value {
    font-size: 20px;
    font-weight: 600;
    color: #c8b898;
    font-family: 'SF Mono', Monaco, monospace;
    line-height: 1;
  }

  .stat-value.success {
    color: #68c888;
  }

  .stat-value.warning {
    color: #e0a060;
  }

  .stat-label {
    font-size: 10px;
    color: #6a5a45;
    margin-top: 4px;
    letter-spacing: 1px;
  }

  .score-bars-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 12px;
  }

  .score-card {
    padding: 14px;
    background: rgba(0, 0, 0, 0.25);
    border-radius: 10px;
    border: 1px solid rgba(139, 90, 43, 0.15);
  }

  .score-card-header {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 6px;
  }

  .score-card-icon {
    font-size: 14px;
  }

  .score-card-label {
    font-size: 11px;
    color: #a89878;
    letter-spacing: 1px;
  }

  .score-card-value {
    font-size: 24px;
    font-weight: 600;
    color: #f0d8a8;
    font-family: 'SF Mono', Monaco, monospace;
    margin-bottom: 8px;
    line-height: 1;
  }

  .score-card-bar {
    height: 6px;
    background: rgba(60, 50, 40, 0.5);
    border-radius: 3px;
    overflow: hidden;
  }

  .bar-fill {
    height: 100%;
    border-radius: 3px;
    transition: width 0.8s ease-out;
  }

  .tabs-section {
    padding: 0 24px 24px;
  }

  .tabs-nav {
    display: flex;
    gap: 4px;
    padding: 16px 0;
    border-bottom: 1px solid rgba(139, 90, 43, 0.15);
    margin-bottom: 16px;
  }

  .tab-btn {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 10px 8px;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 8px;
    color: #7a6a55;
    cursor: pointer;
    transition: all 0.2s;
  }

  .tab-btn:hover {
    background: rgba(139, 90, 43, 0.1);
    color: #a89878;
  }

  .tab-btn.active {
    background: rgba(139, 90, 43, 0.2);
    border-color: rgba(139, 90, 43, 0.3);
    color: #f0d8a8;
  }

  .tab-icon {
    font-size: 18px;
  }

  .tab-label {
    font-size: 11px;
    letter-spacing: 1px;
  }

  .tabs-content {
    min-height: 300px;
  }

  .deductions-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .deduction-item {
    padding: 14px 16px;
    background: rgba(0, 0, 0, 0.25);
    border-radius: 10px;
    border: 1px solid rgba(139, 90, 43, 0.15);
    animation: fadeInItem 0.3s ease;
  }

  @keyframes fadeInItem {
    from { opacity: 0; transform: translateX(-10px); }
    to { opacity: 1; transform: translateX(0); }
  }

  .deduction-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .deduction-category {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .category-icon {
    font-size: 14px;
  }

  .category-name {
    font-size: 12px;
    font-weight: 500;
    color: #d4a574;
    letter-spacing: 1px;
  }

  .deduction-points {
    font-size: 16px;
    font-weight: 600;
    font-family: 'SF Mono', Monaco, monospace;
  }

  .deduction-reason {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }

  .severity-badge {
    font-size: 10px;
    padding: 2px 8px;
    border-radius: 10px;
    font-weight: 500;
    letter-spacing: 1px;
    flex-shrink: 0;
  }

  .reason-text {
    font-size: 12px;
    color: #b8a888;
    line-height: 1.5;
  }

  .deduction-suggestion {
    display: flex;
    gap: 6px;
    padding: 8px 10px;
    background: rgba(104, 200, 136, 0.08);
    border-radius: 6px;
    border: 1px solid rgba(104, 200, 136, 0.15);
  }

  .suggestion-icon {
    flex-shrink: 0;
    font-size: 12px;
  }

  .suggestion-text {
    font-size: 11px;
    color: #8ad8a0;
    line-height: 1.5;
  }

  .empty-state {
    text-align: center;
    padding: 40px 20px;
  }

  .empty-icon {
    font-size: 48px;
    margin-bottom: 12px;
    opacity: 0.6;
  }

  .empty-text {
    font-size: 14px;
    color: #c8b898;
    margin-bottom: 4px;
  }

  .empty-hint {
    font-size: 12px;
    color: #6a5a45;
  }

  .keyareas-section {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .keyareas-summary {
    display: flex;
    gap: 24px;
    padding: 12px 16px;
    background: rgba(0, 0, 0, 0.25);
    border-radius: 10px;
    border: 1px solid rgba(139, 90, 43, 0.15);
  }

  .summary-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .summary-label {
    font-size: 10px;
    color: #6a5a45;
    letter-spacing: 1px;
  }

  .summary-value {
    font-size: 18px;
    font-weight: 600;
    color: #c8a878;
    font-family: 'SF Mono', Monaco, monospace;
  }

  .keyareas-visual {
    display: flex;
    justify-content: center;
  }

  .photo-preview {
    position: relative;
    width: 100%;
    max-width: 300px;
    aspect-ratio: 3 / 4;
    border-radius: 8px;
    overflow: hidden;
    border: 2px solid rgba(139, 90, 43, 0.3);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
  }

  .photo-preview img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .area-box {
    position: absolute;
    border: 2px solid;
    border-radius: 4px;
    display: flex;
    align-items: flex-start;
    justify-content: flex-end;
    padding: 2px;
    transition: all 0.2s;
    cursor: pointer;
  }

  .area-box:hover {
    transform: scale(1.02);
    z-index: 5;
  }

  .area-index {
    font-size: 10px;
    font-weight: bold;
    padding: 1px 5px;
    background: rgba(0, 0, 0, 0.6);
    border-radius: 8px;
    color: #fff;
  }

  .keyareas-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .keyarea-item {
    padding: 12px 14px;
    background: rgba(0, 0, 0, 0.25);
    border-radius: 10px;
    border: 1px solid rgba(139, 90, 43, 0.15);
  }

  .keyarea-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 10px;
  }

  .keyarea-index {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    font-weight: 600;
    flex-shrink: 0;
  }

  .keyarea-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .keyarea-name {
    font-size: 13px;
    font-weight: 500;
    color: #d4a574;
  }

  .keyarea-importance {
    font-size: 10px;
    color: #6a5a45;
  }

  .keyarea-score {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 4px;
    flex-shrink: 0;
  }

  .score-num {
    font-size: 20px;
    font-weight: 600;
    font-family: 'SF Mono', Monaco, monospace;
    line-height: 1;
  }

  .status-badge {
    font-size: 10px;
    padding: 2px 8px;
    border-radius: 10px;
    font-weight: 500;
  }

  .keyarea-brightness {
    padding: 10px;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 6px;
  }

  .brightness-row {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .brightness-label {
    font-size: 11px;
    color: #7a6a55;
    width: 50px;
    flex-shrink: 0;
  }

  .brightness-track {
    flex: 1;
    height: 20px;
    background: linear-gradient(90deg, #1a1a1a 0%, #8b8b8b 50%, #f5f5f5 100%);
    border-radius: 4px;
    position: relative;
  }

  .brightness-ideal, .brightness-actual {
    position: absolute;
    top: -3px;
    width: 3px;
    height: 26px;
    border-radius: 2px;
    transform: translateX(-50%);
  }

  .brightness-ideal {
    background: #68c888;
    z-index: 2;
  }

  .brightness-ideal::after {
    content: '理';
    position: absolute;
    top: -16px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 9px;
    color: #68c888;
    background: rgba(0, 0, 0, 0.6);
    padding: 1px 4px;
    border-radius: 3px;
  }

  .brightness-actual {
    z-index: 3;
  }

  .brightness-actual::after {
    content: '实';
    position: absolute;
    bottom: -16px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 9px;
    color: inherit;
    background: rgba(0, 0, 0, 0.6);
    padding: 1px 4px;
    border-radius: 3px;
  }

  .brightness-values {
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-size: 10px;
    font-family: 'SF Mono', Monaco, monospace;
    width: 70px;
    flex-shrink: 0;
  }

  .ideal {
    color: #68c888;
  }

  .actual {
    color: #88aaff;
  }

  .deviations-section {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .deviations-summary {
    padding: 12px 16px;
    background: rgba(0, 0, 0, 0.25);
    border-radius: 10px;
    border: 1px solid rgba(139, 90, 43, 0.15);
  }

  .summary-text {
    font-size: 12px;
    color: #a89878;
  }

  .summary-text strong {
    color: #e0a060;
    font-size: 14px;
  }

  .deviations-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .deviation-item {
    padding: 14px;
    background: rgba(0, 0, 0, 0.25);
    border-radius: 10px;
    border: 1px solid rgba(139, 90, 43, 0.15);
  }

  .deviation-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 10px;
  }

  .param-icon {
    font-size: 20px;
    width: 36px;
    height: 36px;
    background: rgba(139, 90, 43, 0.15);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .param-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .param-name {
    font-size: 13px;
    font-weight: 500;
    color: #d4a574;
  }

  .param-direction {
    font-size: 11px;
    font-weight: 500;
  }

  .param-impact {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
    flex-shrink: 0;
  }

  .impact-label {
    font-size: 9px;
    color: #6a5a45;
    letter-spacing: 1px;
  }

  .impact-value {
    font-size: 16px;
    font-weight: 600;
    color: #e08080;
    font-family: 'SF Mono', Monaco, monospace;
  }

  .deviation-values {
    display: flex;
    gap: 16px;
    margin-bottom: 10px;
  }

  .value-row {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .value-label {
    font-size: 9px;
    color: #6a5a45;
  }

  .value-num {
    font-size: 16px;
    font-weight: 500;
    color: #c8b898;
    font-family: 'SF Mono', Monaco, monospace;
  }

  .deviation-bar {
    padding: 0 4px;
  }

  .bar-track {
    height: 24px;
    background: linear-gradient(90deg, rgba(60, 50, 40, 0.5) 0%, rgba(100, 80, 60, 0.5) 50%, rgba(60, 50, 40, 0.5) 100%);
    border-radius: 4px;
    position: relative;
  }

  .bar-ideal, .bar-actual {
    position: absolute;
    top: -4px;
    width: 3px;
    height: 32px;
    border-radius: 2px;
    transform: translateX(-50%);
  }

  .bar-ideal {
    background: #68c888;
    z-index: 2;
  }

  .bar-actual {
    z-index: 3;
  }

  .suggestions-section {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .suggestions-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: rgba(0, 0, 0, 0.25);
    border-radius: 10px;
    border: 1px solid rgba(139, 90, 43, 0.15);
  }

  .header-info {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .header-icon {
    font-size: 20px;
  }

  .header-title {
    font-size: 14px;
    font-weight: 500;
    color: #d4a574;
    letter-spacing: 1px;
  }

  .apply-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    background: linear-gradient(135deg, rgba(104, 200, 136, 0.3), rgba(80, 160, 120, 0.25));
    border: 1px solid rgba(104, 200, 136, 0.4);
    border-radius: 8px;
    color: #8ad8a0;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .apply-btn:hover:not(:disabled) {
    background: linear-gradient(135deg, rgba(104, 200, 136, 0.4), rgba(80, 160, 120, 0.35));
    transform: translateY(-1px);
  }

  .apply-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .suggestions-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .suggestion-item {
    display: flex;
    gap: 12px;
    padding: 14px;
    background: rgba(0, 0, 0, 0.25);
    border-radius: 10px;
    border: 1px solid rgba(104, 200, 136, 0.2);
  }

  .suggestion-rank {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: linear-gradient(135deg, rgba(104, 200, 136, 0.3), rgba(80, 160, 120, 0.2));
    border: 1px solid rgba(104, 200, 136, 0.4);
    color: #8ad8a0;
    font-size: 14px;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .suggestion-content {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .suggestion-header {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .suggestion-header .category-icon {
    font-size: 14px;
  }

  .suggestion-header .category-name {
    font-size: 12px;
    font-weight: 500;
    color: #d4a574;
  }

  .potential-gain {
    margin-left: auto;
    font-size: 11px;
    color: #68c888;
    font-weight: 500;
    padding: 2px 8px;
    background: rgba(104, 200, 136, 0.1);
    border-radius: 10px;
  }

  .suggestion-problem {
    display: flex;
    gap: 4px;
    font-size: 11px;
    line-height: 1.5;
  }

  .problem-label {
    color: #e08080;
    flex-shrink: 0;
  }

  .problem-text {
    color: #b8a888;
  }

  .suggestion-solution {
    display: flex;
    gap: 6px;
    padding: 8px 10px;
    background: rgba(104, 200, 136, 0.08);
    border-radius: 6px;
    border: 1px solid rgba(104, 200, 136, 0.15);
  }

  .solution-icon {
    font-size: 12px;
    flex-shrink: 0;
  }

  .solution-text {
    font-size: 11px;
    color: #8ad8a0;
    line-height: 1.5;
  }

  .additional-tips {
    margin-top: 8px;
    padding-top: 16px;
    border-top: 1px solid rgba(139, 90, 43, 0.15);
  }

  .tips-title {
    font-size: 12px;
    color: #a89878;
    margin: 0 0 12px;
    letter-spacing: 1px;
  }

  .tips-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 10px;
  }

  .tip-card {
    display: flex;
    gap: 10px;
    padding: 10px 12px;
    background: rgba(139, 90, 43, 0.1);
    border-radius: 8px;
    border: 1px solid rgba(139, 90, 43, 0.15);
  }

  .tip-icon {
    font-size: 20px;
    flex-shrink: 0;
  }

  .tip-content {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .tip-title {
    font-size: 12px;
    font-weight: 500;
    color: #d4a574;
  }

  .tip-desc {
    font-size: 10px;
    color: #7a6a55;
    line-height: 1.4;
  }

  @media (max-width: 640px) {
    .grade-summary {
      flex-direction: column;
      text-align: center;
    }

    .quick-stats {
      justify-content: center;
    }

    .tabs-nav {
      flex-wrap: wrap;
    }

    .tab-btn {
      flex: 1 0 45%;
    }
  }

  .notes-section {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .notes-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: rgba(0, 0, 0, 0.25);
    border-radius: 10px;
    border: 1px solid rgba(200, 160, 100, 0.2);
  }

  .notes-header .header-info {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .notes-header .header-icon {
    font-size: 20px;
  }

  .notes-header .header-title {
    font-size: 14px;
    font-weight: 500;
    color: #d4a574;
    letter-spacing: 1px;
  }

  .note-status {
    font-size: 10px;
    padding: 3px 10px;
    border-radius: 10px;
    letter-spacing: 1px;
  }

  .note-status.saved {
    background: rgba(104, 200, 136, 0.15);
    color: #68c888;
    border: 1px solid rgba(104, 200, 136, 0.3);
  }

  .note-status.editing {
    background: rgba(232, 168, 72, 0.15);
    color: #e8a848;
    border: 1px solid rgba(232, 168, 72, 0.3);
  }

  .edit-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    background: rgba(139, 90, 43, 0.2);
    border: 1px solid rgba(139, 90, 43, 0.35);
    border-radius: 8px;
    color: #d4a574;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .edit-btn:hover {
    background: rgba(180, 120, 60, 0.3);
    border-color: rgba(220, 170, 100, 0.5);
    transform: translateY(-1px);
  }

  .quick-tags-row {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 10px 14px;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 8px;
    border: 1px solid rgba(139, 90, 43, 0.15);
  }

  .quick-label {
    font-size: 11px;
    color: #7a6a55;
    letter-spacing: 1px;
    padding-top: 4px;
    flex-shrink: 0;
  }

  .quick-tag-group {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
  }

  .quick-tag-btn {
    padding: 4px 10px;
    background: rgba(139, 90, 43, 0.15);
    border: 1px solid rgba(139, 90, 43, 0.3);
    border-radius: 10px;
    font-size: 11px;
    color: #b89878;
    cursor: pointer;
    transition: all 0.2s;
  }

  .quick-tag-btn:hover {
    background: rgba(200, 150, 80, 0.3);
    border-color: rgba(220, 170, 100, 0.5);
    color: #f0d8a8;
    transform: translateY(-1px);
  }

  .notes-textarea {
    width: 100%;
    min-height: 200px;
    padding: 14px 16px;
    background: rgba(0, 0, 0, 0.35);
    border: 1px solid rgba(139, 90, 43, 0.3);
    border-radius: 10px;
    color: #e0d0b0;
    font-size: 13px;
    line-height: 1.7;
    font-family: inherit;
    resize: vertical;
    transition: all 0.2s;
  }

  .notes-textarea:focus {
    outline: none;
    border-color: rgba(200, 150, 80, 0.5);
    background: rgba(0, 0, 0, 0.4);
    box-shadow: 0 0 0 3px rgba(200, 150, 80, 0.1);
  }

  .notes-textarea::placeholder {
    color: #5a4a35;
    line-height: 1.7;
  }

  .notes-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .char-count {
    font-size: 11px;
    color: #6a5a45;
    font-family: 'SF Mono', Monaco, monospace;
  }

  .actions-right {
    display: flex;
    gap: 8px;
  }

  .notes-actions .action-btn {
    padding: 8px 16px;
    border-radius: 8px;
    font-size: 12px;
    letter-spacing: 0.5px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .notes-actions .action-btn.cancel {
    background: rgba(100, 100, 100, 0.15);
    color: #a89878;
    border: 1px solid rgba(100, 100, 100, 0.3);
  }

  .notes-actions .action-btn.cancel:hover {
    background: rgba(120, 120, 120, 0.25);
  }

  .notes-actions .action-btn.save {
    background: linear-gradient(135deg, rgba(104, 200, 136, 0.35), rgba(80, 160, 120, 0.3));
    color: #8ad8a0;
    border: 1px solid rgba(104, 200, 136, 0.45);
  }

  .notes-actions .action-btn.save:hover {
    background: linear-gradient(135deg, rgba(104, 200, 136, 0.5), rgba(80, 160, 120, 0.4));
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(104, 200, 136, 0.2);
  }

  .notes-display {
    padding: 16px 18px;
    background: rgba(139, 90, 43, 0.08);
    border: 1px solid rgba(139, 90, 43, 0.2);
    border-radius: 10px;
    border-left: 3px solid rgba(200, 150, 80, 0.5);
  }

  .note-line {
    margin: 0 0 10px;
    font-size: 13px;
    color: #c8b898;
    line-height: 1.8;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .note-line:last-child {
    margin-bottom: 0;
  }

  .empty-notes {
    text-align: center;
    padding: 50px 20px;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 10px;
    border: 1px dashed rgba(139, 90, 43, 0.3);
  }

  .empty-notes .empty-icon {
    font-size: 44px;
    margin-bottom: 12px;
    opacity: 0.5;
  }

  .empty-notes .empty-text {
    font-size: 14px;
    color: #a89878;
    margin-bottom: 6px;
  }

  .empty-notes .empty-hint {
    font-size: 12px;
    color: #6a5a45;
  }
</style>
