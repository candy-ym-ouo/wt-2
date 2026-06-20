<script lang="ts">
  import { createEventDispatcher, onMount, tick } from 'svelte';
  import { gameStore } from '../stores/gameStore';
  import { PHOTO_SUBJECTS, FILM_STOCKS } from '../data/gameData';
  import {
    getChallengeStatusInfo,
    getChallengeById,
    getSeasonById,
    formatTimeRemaining,
    getTimeStatus,
    filterChallenges,
    calculateLeaderboard,
    getCurrentTheme,
    getUserTeam,
    isUserRegistered,
    getAvailableTeams,
    updateChallengeStatuses
  } from '../utils/challengeSystem';
  import { REVIEW_DIMENSIONS } from '../utils/reviewSystem';
  import { generateBaseScene, applyDevelopment, renderToCanvas, type RenderedImageData } from '../utils/renderEngine';
  import { calculateScore } from '../utils/scoring';
  import { generateId } from '../utils/math';
  import type {
    ChallengeState,
    ChallengeDefinition,
    ChallengeTab,
    ChallengeTeam,
    ChallengeSubmission,
    ChallengeRegistration,
    ChallengeSeason,
    ChallengeLeaderboardEntry,
    ChallengeStatus,
    ProcessedPhoto,
    DevParams,
    PhotoSubject,
    FilmStock
  } from '../types/game';

  const dispatch = createEventDispatcher<{ close: void }>();

  $: challengeSystem = $gameStore.challengeSystem;
  $: activeTab = challengeSystem.activeTab;
  $: selectedChallengeId = challengeSystem.selectedChallengeId;
  $: selectedTeamId = challengeSystem.selectedTeamId;
  $: filter = challengeSystem.filter;
  $: leaderboardFilter = challengeSystem.leaderboardFilter;
  $: developTimer = challengeSystem.developTimer;

  $: selectedChallenge = selectedChallengeId
    ? getChallengeById(challengeSystem, selectedChallengeId)
    : null;
  $: currentTheme = selectedChallengeId
    ? getCurrentTheme(challengeSystem, selectedChallengeId)
    : null;
  $: userTeam = selectedChallengeId
    ? getUserTeam(challengeSystem, selectedChallengeId)
    : null;
  $: isRegistered = selectedChallengeId
    ? isUserRegistered(challengeSystem, selectedChallengeId)
    : false;
  $: availableTeams = selectedChallengeId
    ? getAvailableTeams(challengeSystem, selectedChallengeId)
    : [];

  $: filteredChallenges = filterChallenges(challengeSystem, filter);
  $: leaderboard = calculateLeaderboard(
    challengeSystem,
    leaderboardFilter.seasonId,
    leaderboardFilter.sortBy
  );

  $: myRegistrations = challengeSystem.registrations.filter(
    r => r.userId === challengeSystem.currentUserId
  );
  $: mySubmissions = challengeSystem.submissions.filter(
    s => s.userId === challengeSystem.currentUserId
  );
  $: pendingReviews = challengeSystem.submissions.filter(
    s => s.userId !== challengeSystem.currentUserId &&
         (!s.reviews || s.reviews.filter(r => r.reviewerId === challengeSystem.currentUserId).length === 0)
  );

  let showDetailModal = false;
  let showTeamModal = false;
  let showDevelopModal = false;
  let showReviewModal = false;
  let teamName = '';
  let teamSlogan = '';
  let reviewScores: Record<string, number> = {};
  let reviewComment = '';
  let selectedSubmissionForReview: ChallengeSubmission | null = null;
  let timerInterval: number | null = null;

  let developCanvas: HTMLCanvasElement;
  let developCtx: CanvasRenderingContext2D | null = null;
  let developBaseScene: RenderedImageData | null = null;
  let developFinalImage: RenderedImageData | null = null;
  let developSubject: PhotoSubject | null = null;
  let developFilm: FilmStock = FILM_STOCKS[0];
  let developParams: DevParams = {
    exposure: 0.5,
    contrast: 0.5,
    developmentTime: 0.5,
    temperature: 0.5,
    saturation: 0.5,
    agitation: 0.5,
    dilution: 0.5
  };
  let developIsReady = false;
  let developPhotoUrl = '';

  const tabs: { id: ChallengeTab; label: string; icon: string }[] = [
    { id: 'browse', label: '赛事大厅', icon: '🏆' },
    { id: 'registration', label: '报名组队', icon: '👥' },
    { id: 'develop', label: '限时冲洗', icon: '🎞️' },
    { id: 'review', label: '评审结算', icon: '⚖️' },
    { id: 'leaderboard', label: '赛季榜单', icon: '📊' }
  ];

  onMount(() => {
    gameStore.refreshChallengeStatuses();
    startTimer();
  });

  function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = window.setInterval(() => {
      if (developTimer.isRunning && developTimer.startTime) {
        const elapsed = Date.now() - developTimer.startTime;
        const remaining = developTimer.timeLimitMs - elapsed;
        if (remaining <= 0) {
          gameStore.stopChallengeTimer();
        } else {
          gameStore.updateChallengeTimer(remaining);
        }
      }
    }, 100);
  }

  function setTab(tab: ChallengeTab) {
    gameStore.setChallengeTab(tab);
  }

  function selectChallenge(challengeId: string) {
    gameStore.setSelectedChallenge(challengeId);
    showDetailModal = true;
  }

  function closeDetailModal() {
    showDetailModal = false;
    gameStore.setSelectedChallenge(null);
  }

  function openTeamModal() {
    teamName = '';
    teamSlogan = '';
    showTeamModal = true;
  }

  function closeTeamModal() {
    showTeamModal = false;
    teamName = '';
    teamSlogan = '';
  }

  function handleRegister(teamId?: string) {
    if (!selectedChallengeId) return;
    gameStore.registerChallenge(selectedChallengeId, teamId);
  }

  function handleCreateTeam() {
    if (!selectedChallengeId || !teamName.trim()) return;
    gameStore.createChallengeTeam(selectedChallengeId, teamName.trim(), teamSlogan.trim());
    closeTeamModal();
  }

  function handleJoinTeam(teamId: string) {
    gameStore.joinChallengeTeam(teamId);
  }

  function handleLeaveTeam() {
    if (!userTeam) return;
    gameStore.leaveChallengeTeam(userTeam.id);
  }

  function handleLockTeam() {
    if (!userTeam) return;
    gameStore.lockChallengeTeam(userTeam.id);
  }

  function handleStartDevelop(challengeId: string) {
    gameStore.setSelectedChallenge(challengeId);
    gameStore.startChallengeDevelop(challengeId);
    
    developIsReady = false;
    developBaseScene = null;
    developFinalImage = null;
    developSubject = null;
    developFilm = FILM_STOCKS[0];
    developParams = {
      exposure: 0.5,
      contrast: 0.5,
      developmentTime: 0.5,
      temperature: 0.5,
      saturation: 0.5,
      agitation: 0.5,
      dilution: 0.5
    };
    developPhotoUrl = '';
    
    showDevelopModal = true;
  }

  function closeDevelopModal() {
    showDevelopModal = false;
    if (developTimer.isRunning) {
      gameStore.stopChallengeTimer();
    }
  }

  async function initDevelopCanvas() {
    if (!developCanvas || !currentTheme) return;
    
    developCtx = developCanvas.getContext('2d');
    if (!developCtx) return;

    const subject = PHOTO_SUBJECTS.find(s => s.id === currentTheme.subjectId);
    if (!subject) return;

    developSubject = subject;
    developBaseScene = generateBaseScene(subject);
    developIsReady = true;
    
    await tick();
    renderDevelopPhoto();
  }

  function renderDevelopPhoto() {
    if (!developBaseScene || !developCtx || !developSubject) return;

    const isColorFilm = developFilm.color === 'color';
    developFinalImage = applyDevelopment(
      developBaseScene,
      {
        exposure: developParams.exposure,
        developmentTime: developParams.developmentTime,
        temperature: developParams.temperature,
        agitation: developParams.agitation,
        contrast: developParams.contrast,
        saturation: developParams.saturation,
        dilution: developParams.dilution,
        isColorFilm,
        filmBaseContrast: developFilm.baseContrast,
        filmBaseSaturation: developFilm.baseSaturation,
        grainSize: developFilm.grainSize,
        subjectBaseBrightness: developSubject.baseBrightness || 0.35,
        seed: developSubject.seed || 1,
        progress: 1,
        stage: 'complete',
        stageProgress: 1
      },
      false
    );

    renderToCanvas(developCtx, developFinalImage);
    developPhotoUrl = developCanvas.toDataURL('image/jpeg', 0.85);
  }

  $: if (developIsReady && developBaseScene) {
    renderDevelopPhoto();
  }

  $: developPreviewScore = (() => {
    if (!developSubject || !developFinalImage) return 0;
    const detail = calculateScore(
      developSubject,
      developParams,
      developFinalImage,
      developFilm.color === 'color',
      undefined,
      developFilm.id
    );
    return detail.overall;
  })();

  $: if (showDevelopModal && developCanvas && currentTheme && !developIsReady) {
    initDevelopCanvas();
  }

  function updateDevelopParam(param: keyof DevParams, value: number | string) {
    developParams = { ...developParams, [param]: value };
  }

  function handleExposureChange(e: Event) {
    const target = e.target as HTMLInputElement;
    updateDevelopParam('exposure', parseFloat(target.value));
  }

  function handleContrastChange(e: Event) {
    const target = e.target as HTMLInputElement;
    updateDevelopParam('contrast', parseFloat(target.value));
  }

  function handleTimeChange(e: Event) {
    const target = e.target as HTMLInputElement;
    updateDevelopParam('developmentTime', parseFloat(target.value));
  }

  function handleTempChange(e: Event) {
    const target = e.target as HTMLInputElement;
    updateDevelopParam('temperature', parseFloat(target.value));
  }

  function handleSaturationChange(e: Event) {
    const target = e.target as HTMLInputElement;
    updateDevelopParam('saturation', parseFloat(target.value));
  }

  function generateDevelopPhoto(): ProcessedPhoto | null {
    if (!developSubject || !developFinalImage || !currentTheme) return null;

    const isColorFilm = developFilm.color === 'color';
    const scoreDetail = calculateScore(
      developSubject,
      developParams,
      developFinalImage,
      isColorFilm,
      undefined,
      developFilm.id
    );

    return {
      id: 'photo_' + generateId(),
      subjectId: developSubject.id,
      filmId: developFilm.id,
      params: { ...developParams },
      score: scoreDetail.overall,
      details: scoreDetail,
      imageDataUrl: developPhotoUrl,
      timestamp: Date.now()
    };
  }

  function handleSubmitDevelopPhoto() {
    if (!selectedChallengeId || !developTimer.startTime) return;
    
    const photo = generateDevelopPhoto();
    if (!photo) return;

    const developDurationMs = Date.now() - developTimer.startTime;
    gameStore.submitChallengePhoto(selectedChallengeId, photo, developDurationMs);
    closeDevelopModal();
  }

  function openReviewModal(submission: ChallengeSubmission) {
    selectedSubmissionForReview = submission;
    reviewScores = {};
    REVIEW_DIMENSIONS.forEach(dim => {
      reviewScores[dim.id] = 50;
    });
    reviewComment = '';
    showReviewModal = true;
  }

  function closeReviewModal() {
    showReviewModal = false;
    selectedSubmissionForReview = null;
    reviewScores = {};
    reviewComment = '';
  }

  function handleSubmitReview() {
    if (!selectedSubmissionForReview) return;
    gameStore.submitChallengeReview(
      selectedSubmissionForReview.id,
      reviewScores,
      reviewComment.trim()
    );
    closeReviewModal();
  }

  function handleFinalizeScores() {
    if (!selectedChallengeId) return;
    gameStore.finalizeChallengeScores(selectedChallengeId);
  }

  function updateFilter(newFilter: Partial<typeof filter>) {
    gameStore.setChallengeFilter(newFilter);
  }

  function updateLeaderboardFilter(newFilter: Partial<typeof leaderboardFilter>) {
    gameStore.setChallengeLeaderboardFilter(newFilter);
  }

  function handleStatusFilterChange(e: Event) {
    const target = e.target as HTMLSelectElement;
    const value = target.value;
    updateFilter({ statuses: value ? [value as ChallengeStatus] : [] });
  }

  function handleSeasonFilterChange(e: Event) {
    const target = e.target as HTMLSelectElement;
    updateFilter({ seasonId: target.value || null });
  }

  function handleSortChange(e: Event) {
    const target = e.target as HTMLSelectElement;
    updateFilter({ sortBy: target.value as any });
  }

  function handleLeaderboardSeasonChange(e: Event) {
    const target = e.target as HTMLSelectElement;
    updateLeaderboardFilter({ seasonId: target.value || null });
  }

  function handleLeaderboardSortChange(e: Event) {
    const target = e.target as HTMLSelectElement;
    updateLeaderboardFilter({ sortBy: target.value as any });
  }

  function handleSearchChange(e: Event) {
    const target = e.target as HTMLInputElement;
    updateFilter({ searchKeyword: target.value });
  }

  function getSubjectName(subjectId: string): string {
    return PHOTO_SUBJECTS.find(s => s.id === subjectId)?.name || '未知场景';
  }

  function getFilmName(filmId: string): string {
    return FILM_STOCKS.find(f => f.id === filmId)?.name || '未知胶片';
  }

  function formatDate(ts: number): string {
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function formatDateTime(ts: number): string {
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  function getGradeColor(grade: string): string {
    const map: Record<string, string> = {
      S: '#ffd700',
      A: '#c0c0c0',
      B: '#cd7f32',
      C: '#888',
      D: '#666'
    };
    return map[grade] || '#888';
  }

  function getSeasonName(seasonId?: string): string {
    if (!seasonId) return '全部赛季';
    const season = getSeasonById(challengeSystem, seasonId);
    return season?.name || '未知赛季';
  }

  $: timerStatus = developTimer.remainingMs > 0
    ? getTimeStatus(developTimer.remainingMs)
    : { color: '#999', label: '未开始' };
</script>

<div class="challenge-panel">
  <div class="panel-header">
    <h2>📸 摄影社群挑战赛</h2>
    <button class="close-btn" on:click={() => dispatch('close')}>×</button>
  </div>

  <div class="tabs">
    {#each tabs as tab}
      <button
        class="tab-btn"
        class:active={activeTab === tab.id}
        on:click={() => setTab(tab.id)}
      >
        <span class="tab-icon">{tab.icon}</span>
        <span class="tab-label">{tab.label}</span>
      </button>
    {/each}
  </div>

  <div class="panel-content">
    {#if activeTab === 'browse'}
      <div class="browse-panel">
        <div class="filter-bar">
          <div class="filter-group">
            <label>状态筛选：</label>
            <select on:change={handleStatusFilterChange}>
              <option value="">全部状态</option>
              <option value="upcoming">即将开始</option>
              <option value="registration">报名中</option>
              <option value="developing">冲洗中</option>
              <option value="reviewing">评审中</option>
              <option value="completed">已结束</option>
            </select>
          </div>
          <div class="filter-group">
            <label>赛季：</label>
            <select on:change={handleSeasonFilterChange}>
              <option value="">全部赛季</option>
              {#each challengeSystem.seasons as season}
                <option value={season.id}>{season.name}</option>
              {/each}
            </select>
          </div>
          <div class="filter-group">
            <label>搜索：</label>
            <input
              type="text"
              placeholder="搜索比赛..."
              value={filter.searchKeyword}
              on:input={handleSearchChange}
            />
          </div>
          <div class="filter-group">
            <label>排序：</label>
            <select on:change={handleSortChange}>
              <option value="start_date_desc">最新开始</option>
              <option value="start_date_asc">最早开始</option>
              <option value="participants_desc">参与人数</option>
              <option value="prize_desc">奖金最高</option>
            </select>
          </div>
        </div>

        <div class="challenge-grid">
          {#each filteredChallenges as challenge}
            {@const statusInfo = getChallengeStatusInfo(challenge.status)}
            <div class="challenge-card" on:click={() => selectChallenge(challenge.id)}>
              <div class="card-header">
                <span class="challenge-icon">{challenge.icon}</span>
                <span class="challenge-status" style="background: {statusInfo.color}">
                  {statusInfo.icon} {statusInfo.label}
                </span>
              </div>
              <h3 class="challenge-title">{challenge.title}</h3>
              <p class="challenge-subtitle">{challenge.subtitle}</p>
              <p class="challenge-desc">{challenge.description}</p>
              <div class="challenge-meta">
                <span>🎯 {challenge.themes.length} 个主题</span>
                <span>👥 {challenge.maxParticipants} 人上限</span>
                <span>🏆 {challenge.prizes[0]?.points || 0} 积分</span>
              </div>
              <div class="challenge-dates">
                <div>报名：{formatDate(challenge.registrationStart)} - {formatDate(challenge.registrationEnd)}</div>
                <div>冲洗：{formatDate(challenge.developStart)} - {formatDate(challenge.developEnd)}</div>
              </div>
              {#if challenge.seasonId}
                <div class="challenge-season">
                  📅 {getSeasonName(challenge.seasonId)}
                </div>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    {:else if activeTab === 'registration'}
      <div class="registration-panel">
        <div class="my-registrations">
          <h3>我的报名</h3>
          {#if myRegistrations.length > 0}
            <div class="registration-list">
              {#each myRegistrations as reg}
                {@const challenge = getChallengeById(challengeSystem, reg.challengeId)}
                {@const statusInfo = challenge ? getChallengeStatusInfo(challenge.status) : null}
                <div class="registration-item">
                  <div class="reg-info">
                    <span class="reg-challenge">{challenge?.icon} {challenge?.title || '未知比赛'}</span>
                    {#if statusInfo}
                      <span class="reg-status" style="background: {statusInfo.color}">{statusInfo.label}</span>
                    {/if}
                    {#if reg.teamId}
                      {@const team = challengeSystem.teams.find(t => t.id === reg.teamId)}
                      <span class="reg-team">👥 {team?.name || '未知队伍'}</span>
                    {/if}
                  </div>
                  <div class="reg-date">报名时间：{formatDateTime(reg.registeredAt)}</div>
                </div>
              {/each}
            </div>
          {:else}
            <div class="empty-state">
              <p>暂无报名记录，去赛事大厅选择感兴趣的比赛吧！</p>
            </div>
          {/if}
        </div>

        {#if selectedChallenge && selectedChallenge.status === 'registration'}
          <div class="registration-actions">
            <h3>{selectedChallenge.icon} {selectedChallenge.title}</h3>
            
            {#if !isRegistered}
              <div class="action-section">
                <h4>个人报名</h4>
                <button class="primary-btn" on:click={() => handleRegister()}>
                  立即报名（个人）
                </button>
              </div>

              {#if selectedChallenge.allowTeams}
                <div class="action-section">
                  <h4>组队报名</h4>
                  {#if userTeam}
                    <div class="team-info">
                      <div class="team-header">
                        <span class="team-avatar" style="background: {userTeam.avatarColor}">
                          {userTeam.name.charAt(0)}
                        </span>
                        <div class="team-details">
                          <div class="team-name">{userTeam.name}</div>
                          {#if userTeam.slogan}
                            <div class="team-slogan">{userTeam.slogan}</div>
                          {/if}
                        </div>
                      </div>
                      <div class="team-members">
                        {#each userTeam.members as member}
                          <span class="member-badge" class:leader={member.role === 'leader'}>
                            {member.role === 'leader' ? '👑' : '👤'} {member.userName}
                          </span>
                        {/each}
                      </div>
                      <div class="team-actions">
                        {#if userTeam.leaderId === challengeSystem.currentUserId && !userTeam.isLocked}
                          <button class="secondary-btn" on:click={handleLockTeam}>锁定队伍</button>
                        {/if}
                        {#if userTeam.leaderId !== challengeSystem.currentUserId}
                          <button class="danger-btn" on:click={handleLeaveTeam}>离开队伍</button>
                        {/if}
                        {#if userTeam.isLocked}
                          <button class="primary-btn" on:click={() => handleRegister(userTeam.id)}>
                            以队伍身份报名
                          </button>
                        {/if}
                      </div>
                    </div>
                  {:else}
                    <div class="team-options">
                      <button class="secondary-btn" on:click={openTeamModal}>创建队伍</button>
                      
                      {#if availableTeams.length > 0}
                        <div class="available-teams">
                          <h5>可加入的队伍</h5>
                          {#each availableTeams as team}
                            <div class="team-card">
                              <div class="team-card-header">
                                <span class="team-avatar" style="background: {team.avatarColor}">
                                  {team.name.charAt(0)}
                                </span>
                                <div class="team-card-info">
                                  <div class="team-name">{team.name}</div>
                                  <div class="team-size">
                                    {team.members.length}/{team.maxMembers} 人
                                  </div>
                                </div>
                              </div>
                              {#if team.slogan}
                                <div class="team-slogan">{team.slogan}</div>
                              {/if}
                              <div class="team-members-mini">
                                {#each team.members as member}
                                  <span class="member-mini">{member.userName}</span>
                                {/each}
                              </div>
                              <button class="primary-btn small" on:click={() => handleJoinTeam(team.id)}>
                                加入队伍
                              </button>
                            </div>
                          {/each}
                        </div>
                      {/if}
                    </div>
                  {/if}
                </div>
              {/if}
            {:else}
              <div class="already-registered">
                ✅ 您已成功报名此比赛！
              </div>
            {/if}
          </div>
        {/if}
      </div>
    {:else if activeTab === 'develop'}
      <div class="develop-panel">
        <div class="develop-header">
          <h3>限时冲洗</h3>
          <p class="develop-hint">选择已报名且处于冲洗阶段的比赛，开始限时冲洗挑战</p>
        </div>

        {#if developTimer.isRunning}
          <div class="active-timer" style="border-color: {timerStatus.color}">
            <div class="timer-label" style="color: {timerStatus.color}">
              {timerStatus.label}
            </div>
            <div class="timer-display">
              {formatTimeRemaining(developTimer.remainingMs)}
            </div>
            <div class="timer-progress">
              <div
                class="timer-progress-bar"
                style="width: {Math.max(0, (developTimer.remainingMs / developTimer.timeLimitMs) * 100)}%; background: {timerStatus.color}"
              />
            </div>
          </div>
        {/if}

        <div class="develop-challenges">
          <h4>可参与的冲洗任务</h4>
          {#each myRegistrations as reg}
            {@const challenge = getChallengeById(challengeSystem, reg.challengeId)}
            {#if challenge && challenge.status === 'developing'}
              {@const theme = getCurrentTheme(challengeSystem, challenge.id)}
              {@const statusInfo = getChallengeStatusInfo(challenge.status)}
              <div class="develop-task">
                <div class="task-header">
                  <span class="task-icon">{challenge.icon}</span>
                  <div class="task-info">
                    <h5>{challenge.title}</h5>
                    <span class="task-status" style="background: {statusInfo.color}">{statusInfo.label}</span>
                  </div>
                </div>
                {#if theme}
                  <div class="task-theme">
                    <div class="theme-name">🎯 当前主题：{theme.name}</div>
                    <div class="theme-subject">📸 指定题材：{getSubjectName(theme.subjectId)}</div>
                    <div class="theme-time">⏱️ 时间限制：{theme.timeLimitMinutes} 分钟</div>
                    <div class="theme-difficulty">
                      难度：{'⭐'.repeat(theme.difficulty)}
                    </div>
                  </div>
                {/if}
                <div class="task-rules">
                  <h6>比赛规则</h6>
                  <ul>
                    {#each challenge.rules as rule}
                      <li>{rule}</li>
                    {/each}
                  </ul>
                </div>
                <div class="task-actions">
                  <button
                    class="primary-btn"
                    disabled={developTimer.isRunning}
                    on:click={() => handleStartDevelop(challenge.id)}
                  >
                    {developTimer.isRunning && developTimer.challengeId === challenge.id
                      ? '冲洗中...'
                      : '开始限时冲洗'}
                  </button>
                </div>
              </div>
            {/if}
          {/each}
        </div>

        <div class="my-submissions">
          <h4>我的提交记录</h4>
          {#if mySubmissions.length > 0}
            <div class="submission-list">
              {#each mySubmissions as sub}
                {@const challenge = getChallengeById(challengeSystem, sub.challengeId)}
                <div class="submission-item">
                  <img src={sub.photoDataUrl} alt="参赛作品" class="submission-thumb" />
                  <div class="submission-info">
                    <div class="submission-challenge">{challenge?.title || '未知比赛'}</div>
                    <div class="submission-score">
                      得分：<strong>{sub.finalScore ?? sub.score}</strong>
                      {#if sub.details?.grade}
                        <span class="grade-badge" style="color: {getGradeColor(sub.details.grade)}">
                          {sub.details.grade}
                        </span>
                      {/if}
                    </div>
                    <div class="submission-time">
                      用时：{Math.round(sub.developDurationMs / 1000)} 秒
                    </div>
                    <div class="submission-status">
                      状态：{sub.reviewStatus === 'accepted' ? '✅ 已通过' :
                             sub.reviewStatus === 'rejected' ? '❌ 未通过' :
                             sub.reviewStatus === 'disputed' ? '⚠️ 争议中' : '⏳ 评审中'}
                    </div>
                  </div>
                </div>
              {/each}
            </div>
          {:else}
            <div class="empty-state">
              <p>暂无提交记录</p>
            </div>
          {/if}
        </div>
      </div>
    {:else if activeTab === 'review'}
      <div class="review-panel">
        <div class="review-header">
          <h3>评审结算</h3>
          <p class="review-hint">对其他参赛者的作品进行评分，您的作品也将获得他人的评审</p>
        </div>

        {#if pendingReviews.length > 0}
          <div class="pending-reviews">
            <h4>待评审作品 ({pendingReviews.length})</h4>
            <div class="review-grid">
              {#each pendingReviews as sub}
                {@const challenge = getChallengeById(challengeSystem, sub.challengeId)}
                <div class="review-card">
                  <img src={sub.photoDataUrl} alt="待评审作品" class="review-image" />
                  <div class="review-info">
                    <div class="review-challenge">{challenge?.title || '未知比赛'}</div>
                    <div class="review-author">作者：{sub.userName}</div>
                    <div class="review-subject">题材：{getSubjectName(sub.subjectId)}</div>
                    <div class="review-film">胶片：{getFilmName(sub.filmId)}</div>
                    <div class="review-auto-score">自动评分：{sub.score}</div>
                  </div>
                  <button class="primary-btn" on:click={() => openReviewModal(sub)}>
                    开始评审
                  </button>
                </div>
              {/each}
            </div>
          </div>
        {:else}
          <div class="empty-state">
            <p>暂无待评审的作品</p>
          </div>
        {/if}

        <div class="review-finalize">
          <h4>已结束比赛结算</h4>
          {#each challengeSystem.challenges as challenge}
            {#if challenge.status === 'reviewing'}
              <div class="finalize-item">
                <span>{challenge.icon} {challenge.title}</span>
                <span class="finalize-status">
                  已收到 {challengeSystem.submissions.filter(s => s.challengeId === challenge.id).length} 份作品
                </span>
                <button class="secondary-btn" on:click={() => {
                  gameStore.setSelectedChallenge(challenge.id);
                  handleFinalizeScores();
                }}>
                  结算成绩
                </button>
              </div>
            {/if}
          {/each}
        </div>
      </div>
    {:else if activeTab === 'leaderboard'}
      <div class="leaderboard-panel">
        <div class="leaderboard-header">
          <h3>赛季榜单</h3>
          <div class="leaderboard-filters">
            <div class="filter-group">
              <label>赛季：</label>
              <select on:change={handleLeaderboardSeasonChange}>
                <option value="">全部赛季</option>
                {#each challengeSystem.seasons as season}
                  <option value={season.id}>{season.name}</option>
                {/each}
              </select>
            </div>
            <div class="filter-group">
              <label>排序：</label>
              <select on:change={handleLeaderboardSortChange}>
                <option value="total_score">总积分</option>
                <option value="best_score">最高得分</option>
                <option value="avg_score">平均得分</option>
                <option value="submissions">参赛次数</option>
              </select>
            </div>
          </div>
        </div>

        {#if challengeSystem.seasons.length > 0}
          <div class="season-list">
            {#each challengeSystem.seasons as season}
              <div class="season-card" class:active={leaderboardFilter.seasonId === season.id}>
                <div class="season-header">
                  <h4>{season.name}</h4>
                  <span class="season-status" class:active={season.status === 'active'}>
                    {season.status === 'active' ? '🔥 进行中' : '⏳ 即将开始'}
                  </span>
                </div>
                <p class="season-desc">{season.description}</p>
                <div class="season-dates">
                  {formatDate(season.startDate)} - {formatDate(season.endDate)}
                </div>
                <div class="season-stats">
                  <span>🎯 {season.challengeIds.length} 场比赛</span>
                </div>
              </div>
            {/each}
          </div>
        {/if}

        {#if leaderboard.length > 0}
          <div class="leaderboard-table">
            <h4>
              {leaderboardFilter.seasonId
                ? `${getSeasonName(leaderboardFilter.seasonId)} 排行榜`
                : '总排行榜'}
            </h4>
            <table>
              <thead>
                <tr>
                  <th>排名</th>
                  <th>摄影师</th>
                  <th>队伍</th>
                  <th>总积分</th>
                  <th>最高得分</th>
                  <th>平均得分</th>
                  <th>参赛次数</th>
                </tr>
              </thead>
              <tbody>
                {#each leaderboard as entry, index}
                  <tr class:me={entry.userId === challengeSystem.currentUserId}>
                    <td class="rank">
                      {#if index < 3}
                        <span class="rank-medal">
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                        </span>
                      {:else}
                        {entry.rank}
                      {/if}
                    </td>
                    <td class="player">
                      <span class="player-name">{entry.userName}</span>
                      {#if entry.badges && entry.badges.length > 0}
                        <span class="player-badges">
                          {#each entry.badges as badge}
                            <span class="badge">{badge}</span>
                          {/each}
                        </span>
                      {/if}
                    </td>
                    <td>{entry.teamName || '-'}</td>
                    <td class="score">{Math.round(entry.totalScore)}</td>
                    <td class="score">{Math.round(entry.bestScore)}</td>
                    <td class="score">{Math.round(entry.avgScore)}</td>
                    <td>{entry.submissionCount}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {:else}
          <div class="empty-state">
            <p>暂无排行数据</p>
          </div>
        {/if}
      </div>
    {/if}
  </div>

  {#if showDetailModal && selectedChallenge}
    {@const statusInfo = getChallengeStatusInfo(selectedChallenge.status)}
    <div class="modal-overlay" on:click={closeDetailModal}>
      <div class="modal" on:click|stopPropagation>
        <div class="modal-header">
          <h3>{selectedChallenge.icon} {selectedChallenge.title}</h3>
          <button class="close-btn" on:click={closeDetailModal}>×</button>
        </div>
        <div class="modal-content">
          <div class="detail-status" style="background: {statusInfo.color}">
            {statusInfo.icon} {statusInfo.label}
          </div>
          <p class="detail-subtitle">{selectedChallenge.subtitle}</p>
          <p class="detail-desc">{selectedChallenge.description}</p>
          
          <div class="detail-section">
            <h4>比赛主题</h4>
            <div class="themes-list">
              {#each selectedChallenge.themes as theme, idx}
                <div class="theme-item" class:active={idx === selectedChallenge.currentThemeIndex}>
                  <div class="theme-header">
                    <span class="theme-name">{theme.name}</span>
                    {#if idx === selectedChallenge.currentThemeIndex}
                      <span class="theme-current">当前</span>
                    {/if}
                  </div>
                  <div class="theme-details">
                    <span>📸 {getSubjectName(theme.subjectId)}</span>
                    <span>⏱️ {theme.timeLimitMinutes}分钟</span>
                    <span>⭐{'⭐'.repeat(theme.difficulty)}</span>
                  </div>
                </div>
              {/each}
            </div>
          </div>

          <div class="detail-section">
            <h4>赛程安排</h4>
            <div class="schedule-list">
              <div class="schedule-item">
                <span class="schedule-label">报名时间</span>
                <span class="schedule-value">
                  {formatDateTime(selectedChallenge.registrationStart)} - {formatDateTime(selectedChallenge.registrationEnd)}
                </span>
              </div>
              <div class="schedule-item">
                <span class="schedule-label">冲洗时间</span>
                <span class="schedule-value">
                  {formatDateTime(selectedChallenge.developStart)} - {formatDateTime(selectedChallenge.developEnd)}
                </span>
              </div>
              <div class="schedule-item">
                <span class="schedule-label">评审时间</span>
                <span class="schedule-value">
                  {formatDateTime(selectedChallenge.reviewStart)} - {formatDateTime(selectedChallenge.reviewEnd)}
                </span>
              </div>
            </div>
          </div>

          <div class="detail-section">
            <h4>奖项设置</h4>
            <div class="prizes-list">
              {#each selectedChallenge.prizes as prize}
                <div class="prize-item">
                  <span class="prize-rank">{prize.badge} 第{prize.rank}名</span>
                  <span class="prize-title">{prize.title}</span>
                  <span class="prize-desc">{prize.description}</span>
                  <span class="prize-points">+{prize.points} 积分</span>
                </div>
              {/each}
            </div>
          </div>

          <div class="detail-section">
            <h4>比赛规则</h4>
            <ul class="rules-list">
              {#each selectedChallenge.rules as rule}
                <li>{rule}</li>
              {/each}
            </ul>
          </div>

          <div class="detail-section">
            <h4>参赛信息</h4>
            <div class="info-grid">
              <div>👥 最大参赛人数：{selectedChallenge.maxParticipants}</div>
              <div>👤 允许个人参赛：{selectedChallenge.allowSolo ? '是' : '否'}</div>
              <div>👥 允许组队参赛：{selectedChallenge.allowTeams ? '是' : '否'}</div>
              <div>👥 最大队伍人数：{selectedChallenge.maxTeamSize}</div>
              <div>⚖️ 最少评审数：{selectedChallenge.minReviewsPerSubmission}</div>
              <div>🎁 参与积分：+{selectedChallenge.participationPoints}</div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          {#if selectedChallenge.status === 'registration'}
            <button class="primary-btn" on:click={() => {
              closeDetailModal();
              setTab('registration');
            }}>
              前往报名
            </button>
          {:else if selectedChallenge.status === 'developing' && isRegistered}
            <button class="primary-btn" on:click={() => {
              closeDetailModal();
              setTab('develop');
            }}>
              开始冲洗
            </button>
          {:else if selectedChallenge.status === 'reviewing'}
            <button class="primary-btn" on:click={() => {
              closeDetailModal();
              setTab('review');
            }}>
              参与评审
            </button>
          {/if}
        </div>
      </div>
    </div>
  {/if}

  {#if showTeamModal}
    <div class="modal-overlay" on:click={closeTeamModal}>
      <div class="modal small" on:click|stopPropagation>
        <div class="modal-header">
          <h3>创建队伍</h3>
          <button class="close-btn" on:click={closeTeamModal}>×</button>
        </div>
        <div class="modal-content">
          <div class="form-group">
            <label>队伍名称 *</label>
            <input
              type="text"
              bind:value={teamName}
              placeholder="请输入队伍名称"
              maxlength={20}
            />
          </div>
          <div class="form-group">
            <label>队伍口号</label>
            <textarea
              bind:value={teamSlogan}
              placeholder="请输入队伍口号（选填）"
              maxlength={50}
              rows={2}
            />
          </div>
        </div>
        <div class="modal-footer">
          <button class="secondary-btn" on:click={closeTeamModal}>取消</button>
          <button class="primary-btn" disabled={!teamName.trim()} on:click={handleCreateTeam}>
            创建队伍
          </button>
        </div>
      </div>
    </div>
  {/if}

  {#if showDevelopModal && selectedChallenge && currentTheme}
    <div class="modal-overlay" on:click={closeDevelopModal}>
      <div class="modal extra-large" on:click|stopPropagation>
        <div class="modal-header">
          <h3>🎞️ 限时冲洗 - {selectedChallenge.title}</h3>
          <div class="develop-modal-timer" style="color: {timerStatus.color}">
            ⏱️ {formatTimeRemaining(developTimer.remainingMs)}
          </div>
          <button class="close-btn" on:click={closeDevelopModal}>×</button>
        </div>
        <div class="modal-content develop-modal-content">
          <div class="develop-left-panel">
            <div class="develop-theme-info">
              <h4>当前主题</h4>
              <div class="theme-badge">🎯 {currentTheme.name}</div>
              <div class="theme-details">
                <span>📸 题材：{getSubjectName(currentTheme.subjectId)}</span>
                <span>⏱️ 限时：{currentTheme.timeLimitMinutes} 分钟</span>
                <span>难度：{'⭐'.repeat(currentTheme.difficulty)}</span>
              </div>
              {#if currentTheme.requireFilmColor}
                <div class="theme-film-req">
                  要求胶片：{currentTheme.requireFilmColor === 'bw' ? '黑白胶片' : '彩色胶片'}
                </div>
              {/if}
            </div>

            <div class="develop-film-select">
              <h4>选择胶片</h4>
              <div class="film-options">
                {#each FILM_STOCKS as film}
                  <div 
                    class="film-option"
                    class:active={developFilm.id === film.id}
                    on:click={() => { developFilm = film; }}
                  >
                    <span class="film-icon">{film.color === 'color' ? '🎨' : '⚫'}</span>
                    <span class="film-name">{film.name}</span>
                  </div>
                {/each}
              </div>
            </div>

            <div class="develop-params">
              <h4>冲洗参数</h4>
              
              <div class="param-item">
                <div class="param-label">
                  <span>曝光补偿</span>
                  <span class="param-value">{developParams.exposure > 0 ? '+' : ''}{developParams.exposure}</span>
                </div>
                <input 
                  type="range" 
                  min="-3" 
                  max="3" 
                  step="0.1"
                  value={developParams.exposure}
                  on:input={handleExposureChange}
                  class="param-slider"
                />
              </div>

              <div class="param-item">
                <div class="param-label">
                  <span>反差</span>
                  <span class="param-value">{developParams.contrast > 0 ? '+' : ''}{developParams.contrast}</span>
                </div>
                <input 
                  type="range" 
                  min="-3" 
                  max="3" 
                  step="0.1"
                  value={developParams.contrast}
                  on:input={handleContrastChange}
                  class="param-slider"
                />
              </div>

              <div class="param-item">
                <div class="param-label">
                  <span>显影时间</span>
                  <span class="param-value">{developParams.developmentTime} 分钟</span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="30" 
                  step="0.5"
                  value={developParams.developmentTime}
                  on:input={handleTimeChange}
                  class="param-slider"
                />
              </div>

              <div class="param-item">
                <div class="param-label">
                  <span>显影温度</span>
                  <span class="param-value">{developParams.temperature}°C</span>
                </div>
                <input 
                  type="range" 
                  min="15" 
                  max="30" 
                  step="0.5"
                  value={developParams.temperature}
                  on:input={handleTempChange}
                  class="param-slider"
                />
              </div>

              {#if developFilm.color === 'color'}
                <div class="param-item">
                  <div class="param-label">
                    <span>饱和度</span>
                    <span class="param-value">{developParams.saturation > 0 ? '+' : ''}{developParams.saturation}</span>
                  </div>
                  <input 
                    type="range" 
                    min="-3" 
                    max="3" 
                    step="0.1"
                    value={developParams.saturation}
                    on:input={handleSaturationChange}
                    class="param-slider"
                  />
                </div>
              {/if}
            </div>
          </div>

          <div class="develop-right-panel">
            <div class="develop-canvas-wrapper">
              {#if developIsReady}
                <canvas 
                  bind:this={developCanvas}
                  width="400" 
                  height="400"
                  class="develop-canvas"
                />
              {:else}
                <div class="develop-canvas-placeholder">
                  <span>加载中...</span>
                </div>
              {/if}
            </div>

            {#if developFinalImage}
              <div class="develop-score-preview">
                <div class="score-item">
                  <span class="score-label">预计得分</span>
                  <span class="score-value">{Math.round(developPreviewScore)}</span>
                </div>
              </div>
            {/if}
          </div>
        </div>
        <div class="modal-footer">
          <button class="secondary-btn" on:click={closeDevelopModal}>取消</button>
          <button 
            class="primary-btn" 
            on:click={handleSubmitDevelopPhoto}
            disabled={developTimer.remainingMs <= 0 || !developFinalImage}
          >
            提交作品
          </button>
        </div>
      </div>
    </div>
  {/if}

  {#if showReviewModal && selectedSubmissionForReview}
    <div class="modal-overlay" on:click={closeReviewModal}>
      <div class="modal large" on:click|stopPropagation>
        <div class="modal-header">
          <h3>评审作品</h3>
          <button class="close-btn" on:click={closeReviewModal}>×</button>
        </div>
        <div class="modal-content">
          <div class="review-work">
            <img src={selectedSubmissionForReview.photoDataUrl} alt="评审作品" class="review-large-image" />
            <div class="review-work-info">
              <div>作者：{selectedSubmissionForReview.userName}</div>
              <div>题材：{getSubjectName(selectedSubmissionForReview.subjectId)}</div>
              <div>胶片：{getFilmName(selectedSubmissionForReview.filmId)}</div>
              <div>自动评分：{selectedSubmissionForReview.score}</div>
              {#if selectedSubmissionForReview.details?.grade}
                <div>
                  评级：<span style="color: {getGradeColor(selectedSubmissionForReview.details.grade)}">
                    {selectedSubmissionForReview.details.grade}
                  </span>
                </div>
              {/if}
            </div>
          </div>
          
          <div class="review-scores">
            <h4>评分维度</h4>
            {#each REVIEW_DIMENSIONS as dim}
              <div class="score-item">
                <div class="score-header">
                  <span class="score-icon">{dim.icon}</span>
                  <span class="score-label">{dim.name}</span>
                  <span class="score-value">{reviewScores[dim.id] || 50}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  bind:value={reviewScores[dim.id]}
                  class="score-slider"
                />
                <div class="score-desc">{dim.description}</div>
              </div>
            {/each}
          </div>

          <div class="form-group">
            <label>评审评语</label>
            <textarea
              bind:value={reviewComment}
              placeholder="请输入您的评审意见..."
              rows={3}
              maxlength={200}
            />
          </div>
        </div>
        <div class="modal-footer">
          <button class="secondary-btn" on:click={closeReviewModal}>取消</button>
          <button class="primary-btn" on:click={handleSubmitReview}>
            提交评审
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .challenge-panel {
    width: 100%;
    max-width: 1200px;
    height: 85vh;
    background: #1a1a2e;
    border-radius: 12px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    color: #fff;
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 24px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .panel-header h2 {
    margin: 0;
    font-size: 22px;
    font-weight: 600;
  }

  .close-btn {
    background: rgba(255, 255, 255, 0.2);
    border: none;
    color: #fff;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    font-size: 20px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s;
  }

  .close-btn:hover {
    background: rgba(255, 255, 255, 0.3);
  }

  .tabs {
    display: flex;
    background: #16213e;
    padding: 0 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .tab-btn {
    flex: 1;
    background: transparent;
    border: none;
    color: rgba(255, 255, 255, 0.6);
    padding: 14px 12px;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    transition: all 0.2s;
    border-bottom: 2px solid transparent;
  }

  .tab-btn:hover {
    color: rgba(255, 255, 255, 0.9);
    background: rgba(255, 255, 255, 0.05);
  }

  .tab-btn.active {
    color: #fff;
    border-bottom-color: #667eea;
    background: rgba(102, 126, 234, 0.1);
  }

  .tab-icon {
    font-size: 20px;
  }

  .tab-label {
    font-size: 12px;
    font-weight: 500;
  }

  .panel-content {
    flex: 1;
    overflow-y: auto;
    padding: 20px 24px;
  }

  .filter-bar {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    margin-bottom: 20px;
    padding: 16px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
  }

  .filter-group {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .filter-group label {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.7);
  }

  .filter-group select,
  .filter-group input {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: #fff;
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 13px;
  }

  .filter-group select option {
    background: #1a1a2e;
  }

  .challenge-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 16px;
  }

  .challenge-card {
    background: linear-gradient(145deg, #16213e 0%, #0f3460 100%);
    border-radius: 10px;
    padding: 20px;
    cursor: pointer;
    transition: all 0.3s;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .challenge-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);
    border-color: rgba(102, 126, 234, 0.5);
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }

  .challenge-icon {
    font-size: 32px;
  }

  .challenge-status {
    padding: 4px 10px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 500;
    color: #fff;
  }

  .challenge-title {
    margin: 0 0 4px 0;
    font-size: 18px;
    font-weight: 600;
  }

  .challenge-subtitle {
    margin: 0 0 8px 0;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.5);
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .challenge-desc {
    margin: 0 0 12px 0;
    font-size: 13px;
    color: rgba(255, 255, 255, 0.7);
    line-height: 1.5;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .challenge-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 12px;
  }

  .challenge-meta span {
    font-size: 11px;
    padding: 3px 8px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 12px;
  }

  .challenge-dates {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.5);
    line-height: 1.6;
  }

  .challenge-season {
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    font-size: 12px;
    color: #667eea;
  }

  .registration-panel,
  .develop-panel,
  .review-panel,
  .leaderboard-panel {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .my-registrations h3,
  .develop-header h3,
  .review-header h3,
  .leaderboard-header h3,
  .section-title {
    margin: 0 0 16px 0;
    font-size: 18px;
    font-weight: 600;
  }

  .develop-hint,
  .review-hint {
    margin: 0;
    font-size: 13px;
    color: rgba(255, 255, 255, 0.6);
  }

  .registration-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .registration-item {
    background: rgba(255, 255, 255, 0.05);
    padding: 16px;
    border-radius: 8px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .reg-info {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  .reg-challenge {
    font-weight: 500;
  }

  .reg-status,
  .reg-team {
    font-size: 11px;
    padding: 3px 10px;
    border-radius: 12px;
    color: #fff;
  }

  .reg-team {
    background: rgba(102, 126, 234, 0.3);
  }

  .reg-date {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.5);
  }

  .empty-state {
    text-align: center;
    padding: 40px 20px;
    color: rgba(255, 255, 255, 0.5);
  }

  .registration-actions {
    background: rgba(255, 255, 255, 0.05);
    padding: 20px;
    border-radius: 10px;
  }

  .registration-actions h3 {
    margin-top: 0;
  }

  .action-section {
    margin-top: 20px;
  }

  .action-section h4 {
    margin: 0 0 12px 0;
    font-size: 15px;
    color: rgba(255, 255, 255, 0.8);
  }

  .primary-btn,
  .secondary-btn,
  .danger-btn {
    padding: 10px 20px;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .primary-btn {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: #fff;
  }

  .primary-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 5px 20px rgba(102, 126, 234, 0.4);
  }

  .primary-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .primary-btn.small {
    padding: 6px 14px;
    font-size: 12px;
  }

  .secondary-btn {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
    border: 1px solid rgba(255, 255, 255, 0.2);
  }

  .secondary-btn:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  .danger-btn {
    background: rgba(231, 76, 60, 0.8);
    color: #fff;
  }

  .danger-btn:hover {
    background: rgba(231, 76, 60, 1);
  }

  .already-registered {
    padding: 16px;
    background: rgba(39, 174, 96, 0.2);
    border: 1px solid rgba(39, 174, 96, 0.5);
    border-radius: 8px;
    color: #2ecc71;
    font-weight: 500;
  }

  .team-info {
    background: rgba(255, 255, 255, 0.05);
    padding: 16px;
    border-radius: 8px;
  }

  .team-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
  }

  .team-avatar {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    font-weight: 600;
    color: #fff;
  }

  .team-name {
    font-size: 16px;
    font-weight: 600;
  }

  .team-slogan {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.6);
    margin-top: 2px;
  }

  .team-members {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 12px;
  }

  .member-badge {
    padding: 4px 10px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    font-size: 12px;
  }

  .member-badge.leader {
    background: rgba(241, 196, 15, 0.3);
  }

  .team-actions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }

  .team-options {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .available-teams h5 {
    margin: 0 0 12px 0;
    font-size: 14px;
    color: rgba(255, 255, 255, 0.8);
  }

  .team-card {
    background: rgba(255, 255, 255, 0.05);
    padding: 14px;
    border-radius: 8px;
    margin-bottom: 10px;
  }

  .team-card-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 8px;
  }

  .team-card-info {
    flex: 1;
  }

  .team-size {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.5);
  }

  .team-members-mini {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin: 8px 0;
  }

  .member-mini {
    font-size: 11px;
    padding: 2px 8px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 10px;
  }

  .active-timer {
    background: rgba(255, 255, 255, 0.05);
    padding: 24px;
    border-radius: 12px;
    text-align: center;
    border: 2px solid;
    margin-bottom: 20px;
  }

  .timer-label {
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 8px;
  }

  .timer-display {
    font-size: 48px;
    font-weight: 700;
    font-family: 'Courier New', monospace;
    letter-spacing: 4px;
    margin-bottom: 16px;
  }

  .timer-progress {
    height: 8px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    overflow: hidden;
  }

  .timer-progress-bar {
    height: 100%;
    transition: width 0.1s linear;
  }

  .develop-challenges h4,
  .my-submissions h4,
  .pending-reviews h4,
  .review-finalize h4,
  .leaderboard-table h4 {
    margin: 0 0 16px 0;
    font-size: 16px;
    font-weight: 600;
  }

  .develop-task {
    background: rgba(255, 255, 255, 0.05);
    padding: 20px;
    border-radius: 10px;
    margin-bottom: 16px;
  }

  .task-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
  }

  .task-icon {
    font-size: 28px;
  }

  .task-info {
    flex: 1;
  }

  .task-info h5 {
    margin: 0 0 4px 0;
    font-size: 16px;
  }

  .task-status {
    padding: 3px 10px;
    border-radius: 12px;
    font-size: 11px;
    color: #fff;
  }

  .task-theme {
    background: rgba(102, 126, 234, 0.1);
    padding: 12px 16px;
    border-radius: 8px;
    margin-bottom: 12px;
  }

  .task-theme > div {
    margin: 4px 0;
    font-size: 13px;
  }

  .task-rules {
    margin-bottom: 16px;
  }

  .task-rules h6 {
    margin: 0 0 8px 0;
    font-size: 13px;
    color: rgba(255, 255, 255, 0.7);
  }

  .task-rules ul {
    margin: 0;
    padding-left: 20px;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.6);
    line-height: 1.8;
  }

  .submission-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 16px;
  }

  .submission-item {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .submission-thumb {
    width: 100%;
    height: 150px;
    object-fit: cover;
  }

  .submission-info {
    padding: 12px;
    font-size: 12px;
  }

  .submission-challenge {
    font-weight: 600;
    margin-bottom: 6px;
  }

  .submission-score {
    color: rgba(255, 255, 255, 0.8);
    margin-bottom: 4px;
  }

  .grade-badge {
    margin-left: 8px;
    font-weight: 700;
  }

  .submission-time,
  .submission-status {
    color: rgba(255, 255, 255, 0.5);
    margin-top: 2px;
  }

  .review-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 16px;
  }

  .review-card {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .review-image {
    width: 100%;
    height: 180px;
    object-fit: cover;
  }

  .review-info {
    padding: 12px;
    font-size: 12px;
    flex: 1;
  }

  .review-info > div {
    margin-bottom: 4px;
  }

  .review-challenge {
    font-weight: 600;
  }

  .review-card .primary-btn {
    margin: 12px;
    margin-top: 0;
  }

  .review-auto-score {
    color: #667eea;
    font-weight: 600;
  }

  .finalize-item {
    background: rgba(255, 255, 255, 0.05);
    padding: 14px 16px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
    gap: 12px;
    flex-wrap: wrap;
  }

  .finalize-status {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.6);
  }

  .leaderboard-filters {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
  }

  .season-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 12px;
    margin-bottom: 24px;
  }

  .season-card {
    background: rgba(255, 255, 255, 0.05);
    padding: 16px;
    border-radius: 8px;
    border: 2px solid transparent;
    cursor: pointer;
    transition: all 0.2s;
  }

  .season-card:hover {
    background: rgba(255, 255, 255, 0.08);
  }

  .season-card.active {
    border-color: #667eea;
    background: rgba(102, 126, 234, 0.1);
  }

  .season-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .season-header h4 {
    margin: 0;
    font-size: 15px;
  }

  .season-status {
    font-size: 11px;
    padding: 3px 10px;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.1);
  }

  .season-status.active {
    background: rgba(231, 76, 60, 0.3);
    color: #e74c3c;
  }

  .season-desc {
    margin: 0 0 8px 0;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.6);
  }

  .season-dates {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.5);
    margin-bottom: 8px;
  }

  .season-stats {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.7);
  }

  .leaderboard-table table {
    width: 100%;
    border-collapse: collapse;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 8px;
    overflow: hidden;
  }

  .leaderboard-table th,
  .leaderboard-table td {
    padding: 12px 16px;
    text-align: left;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }

  .leaderboard-table th {
    background: rgba(255, 255, 255, 0.05);
    font-size: 12px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.7);
  }

  .leaderboard-table tr.me {
    background: rgba(102, 126, 234, 0.1);
  }

  .leaderboard-table .rank {
    font-weight: 600;
    font-size: 14px;
  }

  .rank-medal {
    font-size: 20px;
  }

  .player-name {
    font-weight: 500;
  }

  .player-badges {
    margin-left: 8px;
  }

  .badge {
    font-size: 10px;
    padding: 2px 6px;
    background: rgba(241, 196, 15, 0.3);
    border-radius: 8px;
    margin-left: 4px;
  }

  .score {
    font-weight: 600;
    color: #667eea;
  }

  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    animation: fadeIn 0.2s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .modal {
    background: #1a1a2e;
    border-radius: 12px;
    max-width: 700px;
    width: 90%;
    max-height: 85vh;
    display: flex;
    flex-direction: column;
    animation: slideUp 0.3s ease;
  }

  .modal.small {
    max-width: 400px;
  }

  .modal.large {
    max-width: 900px;
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 18px 24px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .modal-header h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
  }

  .modal-content {
    flex: 1;
    overflow-y: auto;
    padding: 20px 24px;
  }

  .modal-footer {
    padding: 16px 24px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    justify-content: flex-end;
    gap: 12px;
  }

  .detail-status {
    display: inline-block;
    padding: 6px 14px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 500;
    color: #fff;
    margin-bottom: 16px;
  }

  .detail-subtitle {
    margin: 0 0 12px 0;
    font-size: 13px;
    color: rgba(255, 255, 255, 0.6);
  }

  .detail-desc {
    margin: 0 0 20px 0;
    font-size: 14px;
    color: rgba(255, 255, 255, 0.8);
    line-height: 1.6;
  }

  .detail-section {
    margin-bottom: 20px;
  }

  .detail-section h4 {
    margin: 0 0 12px 0;
    font-size: 15px;
    color: rgba(255, 255, 255, 0.9);
  }

  .themes-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .theme-item {
    background: rgba(255, 255, 255, 0.03);
    padding: 12px 16px;
    border-radius: 8px;
    border: 1px solid transparent;
  }

  .theme-item.active {
    border-color: rgba(102, 126, 234, 0.5);
    background: rgba(102, 126, 234, 0.1);
  }

  .theme-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
  }

  .theme-name {
    font-weight: 500;
  }

  .theme-current {
    font-size: 11px;
    padding: 2px 8px;
    background: #667eea;
    border-radius: 10px;
  }

  .theme-details {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.6);
  }

  .schedule-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .schedule-item {
    display: flex;
    justify-content: space-between;
    padding: 10px 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }

  .schedule-label {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.6);
  }

  .schedule-value {
    font-size: 13px;
    font-weight: 500;
  }

  .prizes-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .prize-item {
    background: rgba(255, 255, 255, 0.03);
    padding: 12px 16px;
    border-radius: 8px;
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 12px;
    align-items: center;
  }

  .prize-rank {
    font-weight: 600;
    font-size: 13px;
  }

  .prize-title {
    font-size: 13px;
  }

  .prize-desc {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.5);
  }

  .prize-points {
    color: #667eea;
    font-weight: 600;
  }

  .rules-list {
    margin: 0;
    padding-left: 20px;
    font-size: 13px;
    color: rgba(255, 255, 255, 0.7);
    line-height: 1.8;
  }

  .info-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 10px;
  }

  .info-grid > div {
    background: rgba(255, 255, 255, 0.03);
    padding: 10px 14px;
    border-radius: 6px;
    font-size: 12px;
  }

  .form-group {
    margin-bottom: 16px;
  }

  .form-group label {
    display: block;
    margin-bottom: 6px;
    font-size: 13px;
    color: rgba(255, 255, 255, 0.8);
  }

  .form-group input,
  .form-group textarea {
    width: 100%;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #fff;
    padding: 10px 14px;
    border-radius: 6px;
    font-size: 14px;
    font-family: inherit;
    box-sizing: border-box;
  }

  .form-group input:focus,
  .form-group textarea:focus {
    outline: none;
    border-color: #667eea;
  }

  .form-group textarea {
    resize: vertical;
    min-height: 60px;
  }

  .review-work {
    display: flex;
    gap: 20px;
    margin-bottom: 24px;
    align-items: flex-start;
  }

  .review-large-image {
    width: 300px;
    height: 200px;
    object-fit: cover;
    border-radius: 8px;
  }

  .review-work-info {
    flex: 1;
    font-size: 13px;
    line-height: 2;
  }

  .review-scores {
    margin-bottom: 20px;
  }

  .review-scores h4 {
    margin: 0 0 16px 0;
    font-size: 15px;
  }

  .score-item {
    margin-bottom: 16px;
  }

  .score-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 6px;
  }

  .score-icon {
    font-size: 16px;
  }

  .score-label {
    flex: 1;
    font-size: 13px;
    font-weight: 500;
  }

  .score-value {
    font-size: 16px;
    font-weight: 600;
    color: #667eea;
    min-width: 40px;
    text-align: right;
  }

  .score-slider {
    width: 100%;
    height: 6px;
    border-radius: 3px;
    background: rgba(255, 255, 255, 0.1);
    outline: none;
    -webkit-appearance: none;
  }

  .score-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #667eea;
    cursor: pointer;
  }

  .score-slider::-moz-range-thumb {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #667eea;
    cursor: pointer;
    border: none;
  }

  .score-desc {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.5);
    margin-top: 4px;
  }

  @media (max-width: 768px) {
    .challenge-panel {
      height: 95vh;
      border-radius: 0;
    }

    .tabs {
      padding: 0 8px;
    }

    .tab-label {
      font-size: 10px;
    }

    .panel-content {
      padding: 12px;
    }

    .filter-bar {
      flex-direction: column;
      gap: 10px;
    }

    .filter-group {
      flex-direction: column;
      align-items: flex-start;
    }

    .challenge-grid {
      grid-template-columns: 1fr;
    }

    .review-work {
      flex-direction: column;
    }

    .review-large-image {
      width: 100%;
      height: auto;
    }

    .leaderboard-table {
      font-size: 11px;
    }

    .leaderboard-table th,
    .leaderboard-table td {
      padding: 8px;
    }

    .develop-modal-content {
      flex-direction: column;
    }

    .develop-left-panel,
    .develop-right-panel {
      width: 100%;
    }
  }

  .modal.extra-large {
    max-width: 1000px;
    width: 95vw;
  }

  .develop-modal-timer {
    font-size: 20px;
    font-weight: 700;
    margin-right: 16px;
  }

  .develop-modal-content {
    display: flex;
    gap: 24px;
    max-height: 65vh;
    overflow-y: auto;
  }

  .develop-left-panel {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 20px;
    min-width: 0;
  }

  .develop-right-panel {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    min-width: 0;
  }

  .develop-theme-info {
    background: rgba(255, 255, 255, 0.05);
    padding: 16px;
    border-radius: 8px;
  }

  .develop-theme-info h4 {
    margin: 0 0 12px 0;
    font-size: 14px;
    color: rgba(255, 255, 255, 0.7);
  }

  .theme-badge {
    display: inline-block;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 8px 16px;
    border-radius: 20px;
    font-weight: 600;
    margin-bottom: 12px;
  }

  .theme-details {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    font-size: 13px;
    color: rgba(255, 255, 255, 0.8);
  }

  .theme-film-req {
    margin-top: 10px;
    font-size: 12px;
    color: #f39c12;
  }

  .develop-film-select h4 {
    margin: 0 0 12px 0;
    font-size: 14px;
    color: rgba(255, 255, 255, 0.7);
  }

  .film-options {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .film-option {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    background: rgba(255, 255, 255, 0.08);
    border: 2px solid transparent;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .film-option:hover {
    background: rgba(255, 255, 255, 0.12);
  }

  .film-option.active {
    border-color: #667eea;
    background: rgba(102, 126, 234, 0.2);
  }

  .film-icon {
    font-size: 18px;
  }

  .film-name {
    font-size: 13px;
  }

  .develop-params {
    background: rgba(255, 255, 255, 0.05);
    padding: 16px;
    border-radius: 8px;
  }

  .develop-params h4 {
    margin: 0 0 16px 0;
    font-size: 14px;
    color: rgba(255, 255, 255, 0.7);
  }

  .param-item {
    margin-bottom: 16px;
  }

  .param-item:last-child {
    margin-bottom: 0;
  }

  .param-label {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
    font-size: 13px;
  }

  .param-value {
    font-weight: 600;
    color: #667eea;
  }

  .param-slider {
    width: 100%;
    height: 6px;
    -webkit-appearance: none;
    appearance: none;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 3px;
    outline: none;
  }

  .param-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #667eea;
    cursor: pointer;
  }

  .param-slider::-moz-range-thumb {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #667eea;
    cursor: pointer;
    border: none;
  }

  .develop-canvas-wrapper {
    width: 100%;
    max-width: 400px;
    aspect-ratio: 1;
    background: #0a0a0a;
    border-radius: 8px;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .develop-canvas {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .develop-canvas-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgba(255, 255, 255, 0.5);
    font-size: 14px;
  }

  .develop-score-preview {
    background: rgba(255, 255, 255, 0.08);
    padding: 16px 24px;
    border-radius: 8px;
    text-align: center;
  }

  .develop-score-preview .score-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .develop-score-preview .score-label {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.6);
  }

  .develop-score-preview .score-value {
    font-size: 28px;
    font-weight: 700;
    color: #ffd700;
  }
</style>
