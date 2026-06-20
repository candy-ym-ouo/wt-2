<script lang="ts">
  import { gameStore } from '../stores/gameStore';
  import type { CalibrationTab, EnlargerProfile, TempZone, TimerProgram, TimerStep, EnlargerCalibrationRecord, TempCalibrationRecord, TimerCalibrationRecord, DeviationRecord, EnlargerLightSource } from '../types/game';
  import { generateId } from '../utils/math';

  export let onClose: () => void;

  const TABS: { key: CalibrationTab; label: string; icon: string }[] = [
    { key: 'enlarger', label: '放大机校准', icon: '🔭' },
    { key: 'temperature', label: '温控校准', icon: '🌡' },
    { key: 'timer', label: '计时器校准', icon: '⏱' },
    { key: 'deviation', label: '偏差分析', icon: '📊' }
  ];

  const LIGHT_SOURCES: { key: EnlargerLightSource; label: string }[] = [
    { key: 'tungsten', label: '钨丝灯' },
    { key: 'led', label: 'LED' },
    { key: 'cold_cathode', label: '冷阴极' },
    { key: 'condenser', label: '聚光式' },
    { key: 'diffusion', label: '散光式' }
  ];

  const AGITATION_LABELS: Record<string, string> = {
    continuous: '持续搅动',
    intermittent_10s: '每10秒搅动',
    intermittent_30s: '每30秒搅动',
    first_10s_then_rest: '前10秒搅动后静置',
    none: '无搅动'
  };

  const ACTION_LABELS: Record<string, string> = {
    develop: '显影',
    stop: '停显',
    fix: '定影',
    wash: '水洗',
    agitate: '搅动',
    wait: '等待',
    pour: '注入药液',
    drain: '倒出药液'
  };

  const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    uncalibrated: { label: '未校准', color: '#888' },
    calibrating: { label: '校准中', color: '#f39c12' },
    calibrated: { label: '已校准', color: '#27ae60' },
    drift_detected: { label: '漂移', color: '#e74c3c' }
  };

  const TEMP_STATUS_LABELS: Record<string, { label: string; color: string }> = {
    off: { label: '关闭', color: '#888' },
    heating: { label: '加热中', color: '#e74c3c' },
    cooling: { label: '冷却中', color: '#3498db' },
    stable: { label: '稳定', color: '#27ae60' }
  };

  let newEnlargerName = '';
  let newTimerName = '';
  let showNewEnlarger = false;
  let showNewTimer = false;
  let showNewZone = false;
  let newZoneName = '';
  let newZoneTargetTemp = 20;

  $: calState = $gameStore.darkroomCalibration;
  $: activeTab = calState.activeTab;
  $: selectedEnlarger = calState.enlargers.find(e => e.id === calState.selectedEnlargerId) || calState.enlargers[0] || null;
  $: selectedZone = calState.tempZones.find(z => z.id === calState.selectedTempZoneId) || calState.tempZones[0] || null;
  $: selectedProgram = calState.timerPrograms.find(p => p.id === calState.selectedTimerProgramId) || calState.timerPrograms[0] || null;
  $: stats = calState.statistics;

  function formatDate(ts: number) {
    const d = new Date(ts);
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  function formatDuration(ms: number) {
    const sec = ms / 1000;
    if (sec < 60) return `${sec.toFixed(0)}s`;
    const min = Math.floor(sec / 60);
    const s = Math.round(sec % 60);
    return `${min}m${s}s`;
  }

  function getStatusClass(status: string) {
    if (status === 'calibrated') return 'status-good';
    if (status === 'drift_detected') return 'status-bad';
    if (status === 'calibrating') return 'status-warn';
    return 'status-neutral';
  }

  function getHealthColor(score: number) {
    if (score >= 90) return '#27ae60';
    if (score >= 70) return '#f39c12';
    return '#e74c3c';
  }

  function addEnlarger() {
    if (!newEnlargerName.trim()) return;
    const now = Date.now();
    gameStore.addEnlarger({
      id: 'enlarger_' + generateId(),
      name: newEnlargerName.trim(),
      lightSource: 'condenser',
      lensFocalLength: 50,
      baseExposure: 0.5,
      colorFiltration: { cyan: 0, magenta: 30, yellow: 45 },
      focusOffset: 0,
      columnHeight: 60,
      status: 'idle',
      warmUpSeconds: 30,
      lampHours: 0,
      notes: ''
    });
    newEnlargerName = '';
    showNewEnlarger = false;
  }

  function addTimerProgram() {
    if (!newTimerName.trim()) return;
    const now = Date.now();
    const steps: TimerStep[] = [
      { id: 'step_' + generateId(), label: '预浸', duration: 30000, action: 'wait', agitationPattern: 'none' },
      { id: 'step_' + generateId(), label: '显影', duration: 420000, action: 'develop', agitationPattern: 'intermittent_30s' },
      { id: 'step_' + generateId(), label: '停显', duration: 30000, action: 'stop', agitationPattern: 'continuous' },
      { id: 'step_' + generateId(), label: '定影', duration: 240000, action: 'fix', agitationPattern: 'intermittent_30s' },
      { id: 'step_' + generateId(), label: '水洗', duration: 300000, action: 'wash', agitationPattern: 'none' }
    ];
    gameStore.addTimerProgram({
      id: 'timer_' + generateId(),
      name: newTimerName.trim(),
      steps,
      totalDuration: steps.reduce((s, st) => s + st.duration, 0),
      loopCount: 1
    });
    newTimerName = '';
    showNewTimer = false;
  }

  function addTempZone() {
    if (!newZoneName.trim()) return;
    gameStore.addTempZone({
      id: 'zone_' + generateId(),
      name: newZoneName.trim(),
      targetTemp: newZoneTargetTemp,
      actualTemp: newZoneTargetTemp,
      tolerance: 0.5,
      status: 'stable',
      sensorId: 'sensor_' + generateId(),
      heaterWattage: 200
    });
    newZoneName = '';
    newZoneTargetTemp = 20;
    showNewZone = false;
  }

  function updateEnlargerLightSource(e: Event) {
    const val = (e.target as HTMLSelectElement).value as EnlargerLightSource;
    if (selectedEnlarger) gameStore.updateEnlarger(selectedEnlarger.id, { lightSource: val });
  }

  function updateEnlargerField(field: string, e: Event) {
    if (!selectedEnlarger) return;
    const val = Number((e.target as HTMLInputElement).value);
    gameStore.updateEnlarger(selectedEnlarger.id, { [field]: val });
  }

  function updateEnlargerFiltration(color: 'cyan' | 'magenta' | 'yellow', e: Event) {
    if (!selectedEnlarger) return;
    const val = Number((e.target as HTMLInputElement).value);
    gameStore.updateEnlarger(selectedEnlarger.id, { colorFiltration: { ...selectedEnlarger.colorFiltration, [color]: val } });
  }

  function updateTempZoneField(zoneId: string, field: string, e: Event) {
    const val = Number((e.target as HTMLInputElement).value);
    gameStore.updateTempZone(zoneId, { [field]: val });
  }

  function updateTimerStepDuration(programId: string, idx: number, e: Event) {
    const program = calState.timerPrograms.find(p => p.id === programId);
    if (!program) return;
    const newSteps = [...program.steps];
    newSteps[idx] = { ...newSteps[idx], duration: Number((e.target as HTMLInputElement).value) };
    gameStore.updateTimerProgram(programId, { steps: newSteps });
  }

  function updateTimerStepAgitation(programId: string, idx: number, e: Event) {
    const program = calState.timerPrograms.find(p => p.id === programId);
    if (!program) return;
    const newSteps = [...program.steps];
    newSteps[idx] = { ...newSteps[idx], agitationPattern: (e.target as HTMLSelectElement).value as TimerStep['agitationPattern'] };
    gameStore.updateTimerProgram(programId, { steps: newSteps });
  }

  function generateDeviationAnalysis() {
    const photos = $gameStore.processedPhotos;
    if (photos.length === 0) return;
    const recentPhotos = photos.slice(0, 5);
    recentPhotos.forEach(photo => {
      const paramDevs = photo.details.paramDeviations;
      const enlargerDevs = paramDevs.slice(0, 3).map(d => ({
        param: d.param,
        label: d.label,
        expected: d.idealValue,
        actual: d.actualValue,
        deviation: d.deviation,
        impact: Math.abs(d.scoreImpact)
      }));
      const tempDevs = calState.tempZones.map(z => ({
        zoneName: z.name,
        expected: z.targetTemp,
        actual: z.actualTemp,
        deviation: z.actualTemp - z.targetTemp,
        impact: Math.abs(z.actualTemp - z.targetTemp) * 0.5
      }));
      const timerDevs = (selectedProgram?.steps || []).map(st => ({
        stepLabel: st.label,
        expectedDuration: st.duration,
        actualDuration: st.duration + (Math.random() - 0.5) * st.duration * 0.05,
        deviation: (Math.random() - 0.5) * 0.05,
        impact: Math.random() * 2
      }));
      const totalImpact = enlargerDevs.reduce((s, d) => s + d.impact, 0) + tempDevs.reduce((s, d) => s + d.impact, 0) + timerDevs.reduce((s, d) => s + d.impact, 0);
      const rootCause = enlargerDevs.some(d => d.impact > 3) ? '放大机曝光偏差较大'
        : tempDevs.some(d => d.impact > 2) ? '温控偏差影响显影'
        : timerDevs.some(d => d.impact > 1.5) ? '计时偏差导致过度/不足显影'
        : '各设备参数在正常范围内';
      const suggestion = totalImpact > 8 ? '建议对全部设备进行校准后再冲洗'
        : totalImpact > 4 ? '建议重点校准偏差最大的设备'
        : '设备状态良好，可继续正常冲洗';
      gameStore.addDeviationRecord({
        id: 'dev_' + generateId(),
        photoId: photo.id,
        timestamp: Date.now(),
        enlargerId: selectedEnlarger?.id || '',
        tempZoneId: selectedZone?.id || '',
        timerProgramId: selectedProgram?.id || '',
        enlargerDeviations: enlargerDevs,
        tempDeviations: tempDevs,
        timerDeviations: timerDevs,
        totalScoreImpact: totalImpact,
        rootCause,
        suggestion
      });
    });
  }
</script>

<div class="cal-overlay" on:click={onClose}>
  <div class="cal-modal" on:click|stopPropagation>
    <div class="cal-header">
      <div class="header-left">
        <div class="logo-icon">🔧</div>
        <div class="header-text">
          <h2 class="modal-title">暗房设备校准</h2>
          <p class="modal-subtitle">DARKROOM EQUIPMENT CALIBRATION</p>
        </div>
      </div>
      <div class="header-stats">
        <div class="stat-item">
          <span class="stat-val" style="color: {getHealthColor(stats.calibrationHealthScore)}">{stats.calibrationHealthScore.toFixed(0)}</span>
          <span class="stat-label">健康分</span>
        </div>
        <div class="stat-item">
          <span class="stat-val">{stats.totalCalibrations}</span>
          <span class="stat-label">校准次数</span>
        </div>
        <div class="stat-item">
          <span class="stat-val">{calState.deviations.length}</span>
          <span class="stat-label">偏差记录</span>
        </div>
      </div>
      <button class="close-btn" on:click={onClose} title="关闭">✕</button>
    </div>

    <div class="tab-bar">
      {#each TABS as tab}
        <button class="tab-btn {activeTab === tab.key ? 'active' : ''}" on:click={() => gameStore.setCalibrationTab(tab.key)}>
          <span class="tab-icon">{tab.icon}</span>
          <span class="tab-label">{tab.label}</span>
        </button>
      {/each}
    </div>

    <div class="cal-content">
      {#if activeTab === 'enlarger'}
        <div class="tab-enlarger">
          <div class="sidebar">
            <div class="sidebar-header">
              <h3>放大机列表</h3>
              <button class="btn btn-small btn-primary" on:click={() => showNewEnlarger = true}>+</button>
            </div>
            <div class="item-list">
              {#each calState.enlargers as enlarger (enlarger.id)}
                <div class="list-item {selectedEnlarger?.id === enlarger.id ? 'active' : ''}" on:click={() => gameStore.selectEnlarger(enlarger.id)}>
                  <div class="item-icon">🔭</div>
                  <div class="item-info">
                    <span class="item-name">{enlarger.name}</span>
                    <span class="item-meta">{LIGHT_SOURCES.find(l => l.key === enlarger.lightSource)?.label} · {enlarger.lensFocalLength}mm</span>
                  </div>
                  <span class="item-status {getStatusClass(enlarger.status === 'ready' ? 'calibrated' : 'uncalibrated')}">{enlarger.status === 'ready' ? '就绪' : '待机'}</span>
                </div>
              {/each}
            </div>
            {#if showNewEnlarger}
              <div class="inline-form">
                <input type="text" bind:value={newEnlargerName} placeholder="放大机名称" />
                <div class="form-actions">
                  <button class="btn btn-small btn-primary" on:click={addEnlarger}>添加</button>
                  <button class="btn btn-small btn-secondary" on:click={() => { showNewEnlarger = false; newEnlargerName = ''; }}>取消</button>
                </div>
              </div>
            {/if}
          </div>

          <div class="main-area">
            {#if selectedEnlarger}
              <div class="detail-panel">
                <div class="detail-header">
                  <h3>{selectedEnlarger.name}</h3>
                  {#if calState.enlargers.length > 1}
                    <button class="btn btn-small btn-danger" on:click={() => gameStore.deleteEnlarger(selectedEnlarger.id)}>删除</button>
                  {/if}
                </div>

                <div class="form-grid">
                  <label class="form-item"><span>光源类型</span>
                    <select value={selectedEnlarger.lightSource} on:change={updateEnlargerLightSource}>
                      {#each LIGHT_SOURCES as ls}<option value={ls.key}>{ls.label}</option>{/each}
                    </select>
                  </label>
                  <label class="form-item"><span>镜头焦距 (mm)</span>
                    <input type="number" min="20" max="150" value={selectedEnlarger.lensFocalLength} on:input={(e) => updateEnlargerField('lensFocalLength', e)} />
                  </label>
                  <label class="form-item"><span>基础曝光 {selectedEnlarger.baseExposure.toFixed(2)}</span>
                    <input type="range" min="0" max="1" step="0.01" value={selectedEnlarger.baseExposure} on:input={(e) => updateEnlargerField('baseExposure', e)} />
                  </label>
                  <label class="form-item"><span>对焦偏移 {selectedEnlarger.focusOffset.toFixed(1)}</span>
                    <input type="range" min="-5" max="5" step="0.1" value={selectedEnlarger.focusOffset} on:input={(e) => updateEnlargerField('focusOffset', e)} />
                  </label>
                  <label class="form-item"><span>立柱高度 (cm)</span>
                    <input type="number" min="20" max="120" value={selectedEnlarger.columnHeight} on:input={(e) => updateEnlargerField('columnHeight', e)} />
                  </label>
                  <label class="form-item"><span>灯泡使用 {selectedEnlarger.lampHours.toFixed(1)}h</span>
                    <input type="number" min="0" max="5000" step="0.1" value={selectedEnlarger.lampHours} on:input={(e) => updateEnlargerField('lampHours', e)} />
                  </label>
                </div>

                <div class="filtration-section">
                  <h4>彩色滤光片</h4>
                  <div class="filtration-grid">
                    <label class="filt-item cyan"><span>C 青 {selectedEnlarger.colorFiltration.cyan.toFixed(0)}</span>
                      <input type="range" min="0" max="100" value={selectedEnlarger.colorFiltration.cyan} on:input={(e) => updateEnlargerFiltration('cyan', e)} />
                    </label>
                    <label class="filt-item magenta"><span>M 品红 {selectedEnlarger.colorFiltration.magenta.toFixed(0)}</span>
                      <input type="range" min="0" max="100" value={selectedEnlarger.colorFiltration.magenta} on:input={(e) => updateEnlargerFiltration('magenta', e)} />
                    </label>
                    <label class="filt-item yellow"><span>Y 黄 {selectedEnlarger.colorFiltration.yellow.toFixed(0)}</span>
                      <input type="range" min="0" max="100" value={selectedEnlarger.colorFiltration.yellow} on:input={(e) => updateEnlargerFiltration('yellow', e)} />
                    </label>
                  </div>
                </div>

                <button class="btn btn-primary btn-full" on:click={() => gameStore.runEnlargerCalibration(selectedEnlarger.id)}>
                  🔍 执行放大机校准
                </button>

                {#if calState.enlargerCalibrations.filter(c => c.enlargerId === selectedEnlarger.id).length > 0}
                  <div class="cal-history">
                    <h4>校准历史</h4>
                    {#each calState.enlargerCalibrations.filter(c => c.enlargerId === selectedEnlarger.id).slice(0, 5) as rec (rec.id)}
                      <div class="cal-record">
                        <div class="rec-header">
                          <span class="rec-date">{formatDate(rec.timestamp)}</span>
                          <span class="rec-status {getStatusClass(rec.status)}">{STATUS_LABELS[rec.status]?.label || rec.status}</span>
                        </div>
                        <div class="rec-details">
                          <span>均匀度: {rec.uniformityScore.toFixed(1)}%</span>
                          <span>灯泡输出: {rec.lampOutputPercent.toFixed(1)}%</span>
                          <span>曝光测量: {rec.measuredBaseExposure.toFixed(3)}</span>
                        </div>
                        {#if rec.adjustments.length > 0}
                          <div class="rec-adjustments">
                            {#each rec.adjustments as adj}
                              <span class="adj-item">{adj.field}: {adj.before.toFixed(3)} → {adj.after.toFixed(3)}</span>
                            {/each}
                          </div>
                        {/if}
                      </div>
                    {/each}
                  </div>
                {/if}
              </div>
            {/if}
          </div>
        </div>

      {:else if activeTab === 'temperature'}
        <div class="tab-temperature">
          <div class="sidebar">
            <div class="sidebar-header">
              <h3>温控区域</h3>
              <button class="btn btn-small btn-primary" on:click={() => showNewZone = true}>+</button>
            </div>
            <div class="item-list">
              {#each calState.tempZones as zone (zone.id)}
                <div class="list-item {selectedZone?.id === zone.id ? 'active' : ''}" on:click={() => gameStore.selectTempZone(zone.id)}>
                  <div class="item-icon" style="color: {TEMP_STATUS_LABELS[zone.status]?.color}">🌡</div>
                  <div class="item-info">
                    <span class="item-name">{zone.name}</span>
                    <span class="item-meta">{zone.actualTemp.toFixed(1)}°C / {zone.targetTemp.toFixed(1)}°C</span>
                  </div>
                  <span class="item-status {zone.status === 'stable' ? 'status-good' : 'status-warn'}">{TEMP_STATUS_LABELS[zone.status]?.label || zone.status}</span>
                </div>
              {/each}
            </div>
            {#if showNewZone}
              <div class="inline-form">
                <input type="text" bind:value={newZoneName} placeholder="区域名称" />
                <input type="number" bind:value={newZoneTargetTemp} min="15" max="40" step="0.5" />
                <div class="form-actions">
                  <button class="btn btn-small btn-primary" on:click={addTempZone}>添加</button>
                  <button class="btn btn-small btn-secondary" on:click={() => { showNewZone = false; newZoneName = ''; }}>取消</button>
                </div>
              </div>
            {/if}
          </div>

          <div class="main-area">
            <div class="temp-overview">
              <h3>温控总览</h3>
              <div class="zone-cards">
                {#each calState.tempZones as zone (zone.id)}
                  <div class="zone-card {selectedZone?.id === zone.id ? 'selected' : ''}" on:click={() => gameStore.selectTempZone(zone.id)}>
                    <div class="zone-header">
                      <span class="zone-name">{zone.name}</span>
                      <span class="zone-status-dot" style="background: {TEMP_STATUS_LABELS[zone.status]?.color}" />
                    </div>
                    <div class="zone-temp-display">
                      <span class="zone-actual">{zone.actualTemp.toFixed(1)}°C</span>
                      <span class="zone-target">目标 {zone.targetTemp.toFixed(1)}°C</span>
                    </div>
                    <div class="zone-deviation">
                      偏差: <span style="color: {Math.abs(zone.actualTemp - zone.targetTemp) <= zone.tolerance ? '#27ae60' : '#e74c3c'}">
                        {(zone.actualTemp - zone.targetTemp) > 0 ? '+' : ''}{(zone.actualTemp - zone.targetTemp).toFixed(2)}°C
                      </span>
                      <span class="zone-tolerance"> (±{zone.tolerance.toFixed(1)}°C)</span>
                    </div>
                    <div class="zone-controls">
                      <label class="form-item compact"><span>目标温度</span>
                        <input type="number" min="15" max="40" step="0.5" value={zone.targetTemp} on:input|stopPropagation={(e) => updateTempZoneField(zone.id, 'targetTemp', e)} />
                      </label>
                      <label class="form-item compact"><span>容差</span>
                        <input type="number" min="0.1" max="3" step="0.1" value={zone.tolerance} on:input|stopPropagation={(e) => updateTempZoneField(zone.id, 'tolerance', e)} />
                      </label>
                    </div>
                    {#if calState.tempZones.length > 1}
                      <button class="btn btn-small btn-danger zone-delete" on:click|stopPropagation={() => gameStore.deleteTempZone(zone.id)}>删除</button>
                    {/if}
                  </div>
                {/each}
              </div>
            </div>

            <button class="btn btn-primary btn-full" on:click={() => gameStore.runTempCalibration()}>
              🌡 执行温控校准
            </button>

            {#if calState.tempCalibrations.length > 0}
              <div class="cal-history">
                <h4>温控校准历史</h4>
                {#each calState.tempCalibrations.slice(0, 5) as rec (rec.id)}
                  <div class="cal-record">
                    <div class="rec-header">
                      <span class="rec-date">{formatDate(rec.timestamp)}</span>
                      <span class="rec-status {getStatusClass(rec.status)}">{STATUS_LABELS[rec.status]?.label || rec.status}</span>
                    </div>
                    <div class="rec-details">
                      <span>环境温度: {rec.ambientTemp.toFixed(1)}°C</span>
                      {#each rec.zones as zr}
                        <span>{calState.tempZones.find(z => z.id === zr.zoneId)?.name || zr.zoneId}: {zr.deviation > 0 ? '+' : ''}{zr.deviation.toFixed(2)}°C</span>
                      {/each}
                    </div>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        </div>

      {:else if activeTab === 'timer'}
        <div class="tab-timer">
          <div class="sidebar">
            <div class="sidebar-header">
              <h3>计时程序</h3>
              <button class="btn btn-small btn-primary" on:click={() => showNewTimer = true}>+</button>
            </div>
            <div class="item-list">
              {#each calState.timerPrograms as program (program.id)}
                <div class="list-item {selectedProgram?.id === program.id ? 'active' : ''}" on:click={() => gameStore.selectTimerProgram(program.id)}>
                  <div class="item-icon">⏱</div>
                  <div class="item-info">
                    <span class="item-name">{program.name}</span>
                    <span class="item-meta">{program.steps.length}步 · {formatDuration(program.totalDuration)}</span>
                  </div>
                </div>
              {/each}
            </div>
            {#if showNewTimer}
              <div class="inline-form">
                <input type="text" bind:value={newTimerName} placeholder="程序名称" />
                <div class="form-actions">
                  <button class="btn btn-small btn-primary" on:click={addTimerProgram}>添加</button>
                  <button class="btn btn-small btn-secondary" on:click={() => { showNewTimer = false; newTimerName = ''; }}>取消</button>
                </div>
              </div>
            {/if}
          </div>

          <div class="main-area">
            {#if selectedProgram}
              <div class="detail-panel">
                <div class="detail-header">
                  <h3>{selectedProgram.name}</h3>
                  <span class="total-duration">总时长: {formatDuration(selectedProgram.totalDuration)}</span>
                  {#if calState.timerPrograms.length > 1}
                    <button class="btn btn-small btn-danger" on:click={() => gameStore.deleteTimerProgram(selectedProgram.id)}>删除</button>
                  {/if}
                </div>

                <div class="steps-timeline">
                  {#each selectedProgram.steps as step, idx (step.id)}
                    <div class="step-card">
                      <div class="step-index">{idx + 1}</div>
                      <div class="step-main">
                        <div class="step-top">
                          <span class="step-label">{step.label}</span>
                          <span class="step-action">{ACTION_LABELS[step.action] || step.action}</span>
                        </div>
                        <div class="step-bottom">
                          <label class="form-item compact"><span>时长</span>
                            <input type="number" min="1000" max="1800000" step="1000" value={step.duration} on:input={(e) => updateTimerStepDuration(selectedProgram.id, idx, e)} />
                          </label>
                          <span class="step-duration">{formatDuration(step.duration)}</span>
                          <label class="form-item compact"><span>搅动</span>
                            <select value={step.agitationPattern || 'none'} on:change={(e) => updateTimerStepAgitation(selectedProgram.id, idx, e)}>
                              <option value="none">无搅动</option>
                              <option value="continuous">持续搅动</option>
                              <option value="intermittent_10s">每10秒</option>
                              <option value="intermittent_30s">每30秒</option>
                              <option value="first_10s_then_rest">前10秒后静置</option>
                            </select>
                          </label>
                        </div>
                      </div>
                    </div>
                  {/each}
                </div>

                <button class="btn btn-primary btn-full" on:click={() => gameStore.runTimerCalibration(selectedProgram.id)}>
                  ⏱ 执行计时器校准
                </button>

                {#if calState.timerCalibrations.length > 0}
                  <div class="cal-history">
                    <h4>计时器校准历史</h4>
                    {#each calState.timerCalibrations.slice(0, 5) as rec (rec.id)}
                      <div class="cal-record">
                        <div class="rec-header">
                          <span class="rec-date">{formatDate(rec.timestamp)}</span>
                          <span class="rec-status {getStatusClass(rec.status)}">{STATUS_LABELS[rec.status]?.label || rec.status}</span>
                        </div>
                        <div class="rec-details">
                          <span>测量漂移: {rec.measuredDriftMs > 0 ? '+' : ''}{rec.measuredDriftMs.toFixed(0)}ms</span>
                          <span>步骤通过: {rec.stepsPassed}/{rec.stepsChecked}</span>
                          <span>最大漂移: {rec.worstDriftMs.toFixed(0)}ms</span>
                        </div>
                      </div>
                    {/each}
                  </div>
                {/if}
              </div>
            {/if}
          </div>
        </div>

      {:else if activeTab === 'deviation'}
        <div class="tab-deviation">
          <div class="dev-header">
            <h3>显影结果偏差分析</h3>
            <div class="dev-actions">
              <button class="btn btn-primary" on:click={generateDeviationAnalysis} disabled={$gameStore.processedPhotos.length === 0}>
                📊 生成偏差分析
              </button>
            </div>
          </div>

          <div class="health-dashboard">
            <div class="health-card">
              <div class="health-icon">💊</div>
              <div class="health-info">
                <div class="health-score" style="color: {getHealthColor(stats.calibrationHealthScore)}">{stats.calibrationHealthScore.toFixed(0)}</div>
                <div class="health-label">设备健康分</div>
              </div>
            </div>
            <div class="health-card">
              <div class="health-icon">🔭</div>
              <div class="health-info">
                <div class="health-value">{stats.avgEnlargerDrift.toFixed(3)}</div>
                <div class="health-label">放大机平均漂移</div>
              </div>
            </div>
            <div class="health-card">
              <div class="health-icon">🌡</div>
              <div class="health-info">
                <div class="health-value">{stats.avgTempDeviation.toFixed(2)}°C</div>
                <div class="health-label">温控平均偏差</div>
              </div>
            </div>
            <div class="health-card">
              <div class="health-icon">⏱</div>
              <div class="health-info">
                <div class="health-value">{stats.avgTimerDriftMs.toFixed(0)}ms</div>
                <div class="health-label">计时器平均漂移</div>
              </div>
            </div>
            <div class="health-card">
              <div class="health-icon">📈</div>
              <div class="health-info">
                <div class="health-value" style="color: {stats.deviationTrend === 'improving' ? '#27ae60' : stats.deviationTrend === 'worsening' ? '#e74c3c' : '#f39c12'}">
                  {stats.deviationTrend === 'improving' ? '改善中' : stats.deviationTrend === 'worsening' ? '恶化中' : '稳定'}
                </div>
                <div class="health-label">偏差趋势</div>
              </div>
            </div>
            <div class="health-card">
              <div class="health-icon">🎯</div>
              <div class="health-info">
                <div class="health-value">{stats.recentDeviationImpact.toFixed(1)}</div>
                <div class="health-label">近期偏差影响</div>
              </div>
            </div>
          </div>

          {#if calState.deviations.length === 0}
            <div class="empty-state">
              <div class="empty-icon">📊</div>
              <h4>暂无偏差数据</h4>
              <p>冲洗照片后点击"生成偏差分析"来查看设备参数对显影结果的影响</p>
            </div>
          {:else}
            <div class="deviation-list">
              {#each calState.deviations.slice(0, 20) as dev (dev.id)}
                <div class="deviation-card">
                  <div class="dev-card-header">
                    <span class="dev-date">{formatDate(dev.timestamp)}</span>
                    <span class="dev-impact {dev.totalScoreImpact > 8 ? 'impact-high' : dev.totalScoreImpact > 4 ? 'impact-mid' : 'impact-low'}">
                      影响: {dev.totalScoreImpact.toFixed(1)}
                    </span>
                  </div>
                  {#if dev.enlargerDeviations.length > 0}
                    <div class="dev-section">
                      <span class="dev-section-title">🔭 放大机偏差</span>
                      <div class="dev-items">
                        {#each dev.enlargerDeviations as ed}
                          <span class="dev-tag">{ed.label}: {ed.deviation > 0 ? '+' : ''}{ed.deviation.toFixed(2)} (影响 {ed.impact.toFixed(1)})</span>
                        {/each}
                      </div>
                    </div>
                  {/if}
                  {#if dev.tempDeviations.length > 0}
                    <div class="dev-section">
                      <span class="dev-section-title">🌡 温控偏差</span>
                      <div class="dev-items">
                        {#each dev.tempDeviations as td}
                          <span class="dev-tag">{td.zoneName}: {td.deviation > 0 ? '+' : ''}{td.deviation.toFixed(2)}°C (影响 {td.impact.toFixed(1)})</span>
                        {/each}
                      </div>
                    </div>
                  {/if}
                  {#if dev.timerDeviations.length > 0}
                    <div class="dev-section">
                      <span class="dev-section-title">⏱ 计时器偏差</span>
                      <div class="dev-items">
                        {#each dev.timerDeviations as td}
                          <span class="dev-tag">{td.stepLabel}: {td.deviation > 0 ? '+' : ''}{(td.deviation * 100).toFixed(1)}% (影响 {td.impact.toFixed(1)})</span>
                        {/each}
                      </div>
                    </div>
                  {/if}
                  <div class="dev-diagnosis">
                    <span class="root-cause">🔍 根因: {dev.rootCause}</span>
                    <span class="suggestion">💡 建议: {dev.suggestion}</span>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .cal-overlay {
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

  .cal-modal {
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

  .cal-header {
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

  .tab-icon { font-size: 16px; }
  .tab-label { font-weight: 500; letter-spacing: 0.5px; }

  .cal-content {
    flex: 1;
    overflow-y: auto;
    padding: 24px;
  }

  .cal-content::-webkit-scrollbar { width: 8px; }
  .cal-content::-webkit-scrollbar-track { background: rgba(0, 0, 0, 0.2); }
  .cal-content::-webkit-scrollbar-thumb { background: rgba(139, 90, 43, 0.4); border-radius: 4px; }

  .tab-enlarger, .tab-temperature, .tab-timer {
    display: grid;
    grid-template-columns: 260px 1fr;
    gap: 20px;
    min-height: 400px;
  }

  .sidebar {
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(139, 90, 43, 0.15);
    border-radius: 12px;
    padding: 16px;
  }

  .sidebar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }

  .sidebar-header h3 {
    color: #d4a574;
    font-size: 14px;
    margin: 0;
    letter-spacing: 1px;
  }

  .item-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .list-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.15s ease;
    border: 1px solid transparent;
  }

  .list-item:hover { background: rgba(139, 90, 43, 0.1); }
  .list-item.active { background: rgba(139, 90, 43, 0.2); border-color: rgba(139, 90, 43, 0.3); }

  .item-icon { font-size: 18px; }
  .item-info { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .item-name { color: #c8a878; font-size: 13px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .item-meta { color: #7a6a55; font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  .item-status {
    font-size: 10px;
    padding: 2px 8px;
    border-radius: 10px;
    font-weight: 600;
    white-space: nowrap;
  }

  .status-good { background: rgba(39, 174, 96, 0.15); color: #7fc87f; }
  .status-bad { background: rgba(231, 76, 60, 0.15); color: #e88; }
  .status-warn { background: rgba(243, 156, 18, 0.15); color: #f0c040; }
  .status-neutral { background: rgba(100, 100, 100, 0.15); color: #888; }

  .inline-form {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 12px;
    padding: 12px;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 8px;
    border: 1px solid rgba(139, 90, 43, 0.2);
  }

  .inline-form input {
    width: 100%;
    padding: 8px 10px;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(139, 90, 43, 0.25);
    border-radius: 6px;
    color: #c8a878;
    font-size: 12px;
  }

  .form-actions { display: flex; gap: 8px; }

  .btn {
    padding: 8px 16px;
    border-radius: 8px;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s ease;
    border: 1px solid transparent;
    font-weight: 500;
  }

  .btn-primary { background: linear-gradient(135deg, #8b5a2b, #6b4520); color: #f5e6d3; border-color: rgba(200, 160, 100, 0.3); }
  .btn-primary:hover:not(:disabled) { background: linear-gradient(135deg, #a06830, #805528); transform: translateY(-1px); }
  .btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
  .btn-secondary { background: rgba(100, 100, 100, 0.15); color: #a89878; border-color: rgba(100, 100, 100, 0.3); }
  .btn-danger { background: rgba(200, 80, 80, 0.15); color: #e88; border-color: rgba(200, 80, 80, 0.3); }
  .btn-small { padding: 4px 10px; font-size: 11px; }
  .btn-full { width: 100%; margin-top: 16px; text-align: center; }

  .main-area {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .detail-panel {
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(139, 90, 43, 0.15);
    border-radius: 12px;
    padding: 20px;
  }

  .detail-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
  }

  .detail-header h3 {
    color: #d4a574;
    font-size: 16px;
    margin: 0;
    flex: 1;
  }

  .total-duration {
    color: #a89878;
    font-size: 13px;
  }

  .form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 16px;
  }

  .form-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .form-item span {
    color: #7a6a55;
    font-size: 11px;
    letter-spacing: 0.5px;
  }

  .form-item input, .form-item select {
    padding: 8px 10px;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(139, 90, 43, 0.25);
    border-radius: 6px;
    color: #c8a878;
    font-size: 12px;
  }

  .form-item.compact {
    flex-direction: row;
    align-items: center;
    gap: 8px;
  }

  .form-item.compact span {
    min-width: 50px;
    white-space: nowrap;
  }

  .form-item.compact input, .form-item.compact select {
    flex: 1;
    min-width: 0;
  }

  .filtration-section {
    margin-bottom: 16px;
    padding: 12px;
    background: rgba(0, 0, 0, 0.15);
    border-radius: 8px;
    border: 1px solid rgba(139, 90, 43, 0.1);
  }

  .filtration-section h4 {
    color: #a89878;
    font-size: 13px;
    margin: 0 0 10px;
    letter-spacing: 1px;
  }

  .filtration-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 12px;
  }

  .filt-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .filt-item span {
    font-size: 11px;
    letter-spacing: 0.5px;
  }

  .filt-item.cyan span { color: #00bcd4; }
  .filt-item.magenta span { color: #e91e63; }
  .filt-item.yellow span { color: #ffeb3b; }

  .filt-item input[type="range"] {
    width: 100%;
    height: 6px;
    -webkit-appearance: none;
    appearance: none;
    background: rgba(0, 0, 0, 0.4);
    border-radius: 3px;
    outline: none;
  }

  .temp-overview h3 {
    color: #d4a574;
    font-size: 16px;
    margin: 0 0 16px;
    letter-spacing: 1px;
  }

  .zone-cards {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 12px;
    margin-bottom: 16px;
  }

  .zone-card {
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(139, 90, 43, 0.15);
    border-radius: 10px;
    padding: 14px;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .zone-card:hover { border-color: rgba(139, 90, 43, 0.3); }
  .zone-card.selected { border-color: rgba(139, 90, 43, 0.5); background: rgba(139, 90, 43, 0.08); }

  .zone-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
  }

  .zone-name { color: #c8a878; font-size: 13px; font-weight: 500; }

  .zone-status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    animation: pulse 2s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  .zone-temp-display {
    margin-bottom: 6px;
  }

  .zone-actual { color: #e8c890; font-size: 24px; font-weight: 700; }
  .zone-target { color: #7a6a55; font-size: 12px; margin-left: 8px; }

  .zone-deviation {
    font-size: 11px;
    color: #8a7a5a;
    margin-bottom: 10px;
  }

  .zone-tolerance { color: #5a4a35; }

  .zone-controls {
    display: flex;
    gap: 8px;
    margin-bottom: 8px;
  }

  .zone-delete { align-self: flex-end; }

  .steps-timeline {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 16px;
  }

  .step-card {
    display: flex;
    gap: 12px;
    padding: 10px 14px;
    background: rgba(0, 0, 0, 0.15);
    border-radius: 8px;
    border: 1px solid rgba(139, 90, 43, 0.12);
  }

  .step-index {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: rgba(139, 90, 43, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #d4a574;
    font-size: 12px;
    font-weight: 600;
    flex-shrink: 0;
  }

  .step-main { flex: 1; display: flex; flex-direction: column; gap: 6px; }

  .step-top {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .step-label { color: #c8a878; font-size: 13px; font-weight: 500; }
  .step-action { color: #7a6a55; font-size: 11px; background: rgba(139, 90, 43, 0.1); padding: 2px 8px; border-radius: 4px; }

  .step-bottom {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .step-duration {
    color: #a89878;
    font-size: 12px;
    font-variant-numeric: tabular-nums;
  }

  .cal-history {
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid rgba(139, 90, 43, 0.15);
  }

  .cal-history h4 {
    color: #a89878;
    font-size: 13px;
    margin: 0 0 10px;
    letter-spacing: 1px;
  }

  .cal-record {
    padding: 10px 12px;
    background: rgba(0, 0, 0, 0.15);
    border-radius: 8px;
    margin-bottom: 6px;
    border: 1px solid rgba(139, 90, 43, 0.1);
  }

  .rec-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 6px;
  }

  .rec-date { color: #7a6a55; font-size: 11px; }
  .rec-status { font-size: 10px; padding: 2px 8px; border-radius: 10px; font-weight: 600; }

  .rec-details {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    font-size: 11px;
    color: #8a7a5a;
  }

  .rec-adjustments {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 6px;
  }

  .adj-item {
    font-size: 10px;
    color: #f0c040;
    background: rgba(243, 156, 18, 0.1);
    padding: 2px 6px;
    border-radius: 4px;
  }

  .tab-deviation {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .dev-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .dev-header h3 {
    color: #d4a574;
    font-size: 16px;
    margin: 0;
  }

  .health-dashboard {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
    gap: 12px;
  }

  .health-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 16px;
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(139, 90, 43, 0.15);
    border-radius: 10px;
  }

  .health-icon { font-size: 28px; opacity: 0.8; }
  .health-info { display: flex; flex-direction: column; gap: 2px; }

  .health-score { font-size: 24px; font-weight: 700; }
  .health-value { color: #d4a574; font-size: 16px; font-weight: 600; }
  .health-label { color: #6a5a45; font-size: 10px; letter-spacing: 0.5px; }

  .empty-state {
    text-align: center;
    padding: 40px 20px;
    background: rgba(0, 0, 0, 0.15);
    border-radius: 12px;
    border: 1px dashed rgba(139, 90, 43, 0.2);
  }

  .empty-icon { font-size: 40px; margin-bottom: 12px; opacity: 0.5; }
  .empty-state h4 { color: #8a7a5a; font-size: 15px; margin: 0 0 8px; }
  .empty-state p { color: #5a4a35; font-size: 12px; margin: 0; }

  .deviation-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .deviation-card {
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(139, 90, 43, 0.15);
    border-radius: 10px;
    padding: 14px 16px;
  }

  .dev-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
  }

  .dev-date { color: #7a6a55; font-size: 12px; }

  .dev-impact {
    font-size: 11px;
    padding: 2px 10px;
    border-radius: 10px;
    font-weight: 600;
  }

  .impact-low { background: rgba(39, 174, 96, 0.15); color: #7fc87f; }
  .impact-mid { background: rgba(243, 156, 18, 0.15); color: #f0c040; }
  .impact-high { background: rgba(231, 76, 60, 0.15); color: #e88; }

  .dev-section {
    margin-bottom: 8px;
  }

  .dev-section-title {
    color: #8a7a5a;
    font-size: 11px;
    letter-spacing: 0.5px;
    display: block;
    margin-bottom: 4px;
  }

  .dev-items {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .dev-tag {
    font-size: 10px;
    color: #a89878;
    background: rgba(0, 0, 0, 0.2);
    padding: 3px 8px;
    border-radius: 4px;
    border: 1px solid rgba(139, 90, 43, 0.1);
  }

  .dev-diagnosis {
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid rgba(139, 90, 43, 0.1);
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .root-cause { color: #e8c890; font-size: 12px; }
  .suggestion { color: #a89878; font-size: 12px; }

  @media (max-width: 768px) {
    .cal-header { flex-wrap: wrap; padding: 16px; gap: 12px; }
    .header-stats { order: 3; width: 100%; justify-content: center; }
    .modal-title { font-size: 18px; }
    .tab-btn { padding: 12px 14px; font-size: 12px; }
    .tab-label { display: none; }
    .cal-content { padding: 16px; }
    .tab-enlarger, .tab-temperature, .tab-timer { grid-template-columns: 1fr; }
    .form-grid { grid-template-columns: 1fr; }
    .filtration-grid { grid-template-columns: 1fr; }
    .health-dashboard { grid-template-columns: 1fr 1fr; }
    .zone-cards { grid-template-columns: 1fr; }
  }
</style>
