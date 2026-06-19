<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { gameStore } from '../stores/gameStore';
  import { PHOTO_SUBJECTS, FILM_STOCKS } from '../data/gameData';
  import {
    REVIEW_DIMENSIONS,
    REVIEWERS,
    summarizeComments,
    generateLeaderboard,
    getMySubmissions,
    getActiveContests,
    getContestById,
    canSubmitToContest,
    DEFAULT_REVIEW_DIMENSIONS
  } from '../utils/reviewSystem';
  import type {
    ReviewSystemTab,
    ReviewSubmission,
    LeaderboardEntry,
    LeaderboardFilter,
    ReviewCommentSummary,
    ContestDefinition,
    ReviewDimension,
    ProcessedPhoto
  } from '../types/game';

  const dispatch = createEventDispatcher<{ close: void }>();

  $: reviewSystem = $gameStore.reviewSystem;
  $: processedPhotos = $gameStore.processedPhotos;
  $: activeTab = reviewSystem.activeTab;
  $: activeContestId = reviewSystem.activeContestId;
  $: selectedSubmissionId = reviewSystem.selectedSubmissionId;
  $: leaderboardFilter = reviewSystem.leaderboardFilter;

  $: activeContests = getActiveContests(reviewSystem);
  $: mySubmissions = getMySubmissions(reviewSystem);
  $: selectedSubmission = reviewSystem.submissions.find(s => s.id === selectedSubmissionId) || null;
  $: leaderboard = generateLeaderboard(reviewSystem, leaderboardFilter);

  let submitTitle = '';
  let submitDescription = '';
  let submitTags = '';
  let selectedPhotoForSubmit: ProcessedPhoto | null = null;
  let selectedContestForSubmit: string | null = null;
  let disputeReason = '';
  let showDetailModal = false;
  let showDisputeModal = false;
  let commentSummary: ReviewCommentSummary | null = null;

  const tabs: { id: ReviewSystemTab; label: string; icon: string }[] = [
    { id: 'submit', label: '作品提交', icon: '📤' },
    { id: 'review', label: '评审台', icon: '⚖️' },
    { id: 'leaderboard', label: '排行榜', icon: '🏆' },
    { id: 'my_submissions', label: '我的作品', icon: '🖼️' },
    { id: 'disputes', label: '争议复核', icon: '🔄' }
  ];

  function setTab(tab: ReviewSystemTab) {
    gameStore.setReviewTab(tab);
  }

  function selectPhotoForSubmit(photo: ProcessedPhoto) {
    selectedPhotoForSubmit = photo;
  }

  function handleSubmit() {
    if (!selectedPhotoForSubmit || !submitTitle.trim()) return;

    const tags = submitTags
      .split(/[,，\s]+/)
      .map(t => t.trim())
      .filter(t => t.length > 0);

    gameStore.submitToReview(
      selectedPhotoForSubmit,
      submitTitle.trim(),
      submitDescription.trim(),
      tags,
      selectedContestForSubmit || undefined
    );

    const submission = reviewSystem.submissions[0];
    if (submission) {
      gameStore.addAutomatedReviews(submission.id, selectedPhotoForSubmit);
    }

    submitTitle = '';
    submitDescription = '';
    submitTags = '';
    selectedPhotoForSubmit = null;
    selectedContestForSubmit = null;

    setTab('my_submissions');
  }

  function openSubmissionDetail(submission: ReviewSubmission) {
    gameStore.setSelectedSubmission(submission.id);
    commentSummary = summarizeComments(submission, DEFAULT_REVIEW_DIMENSIONS);
    showDetailModal = true;
  }

  function closeDetailModal() {
    showDetailModal = false;
    gameStore.setSelectedSubmission(null);
    commentSummary = null;
  }

  function openDisputeModal(submission: ReviewSubmission) {
    gameStore.setSelectedSubmission(submission.id);
    disputeReason = '';
    showDisputeModal = true;
  }

  function closeDisputeModal() {
    showDisputeModal = false;
    gameStore.setSelectedSubmission(null);
    disputeReason = '';
  }

  function handleSubmitDispute() {
    if (!selectedSubmission || !disputeReason.trim()) return;
    gameStore.submitDispute(selectedSubmission.id, disputeReason.trim());
    closeDisputeModal();
  }

  function handleFinalize(submission: ReviewSubmission) {
    gameStore.finalizeSubmissionReview(submission.id);
  }

  function getSubjectName(subjectId: string): string {
    return PHOTO_SUBJECTS.find(s => s.id === subjectId)?.name || '未知场景';
  }

  function getFilmName(filmId: string): string {
    return FILM_STOCKS.find(f => f.id === filmId)?.name || '未知胶片';
  }

  function getReviewerName(reviewerId: string): string {
    return REVIEWERS.find(r => r.id === reviewerId)?.name || '未知评审';
  }

  function getReviewerAvatar(reviewerId: string): string {
    return REVIEWERS.find(r => r.id === reviewerId)?.avatar || '👤';
  }

  function formatDate(ts: number): string {
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      draft: '草稿',
      submitted: '已提交',
      reviewing: '评审中',
      reviewed: '已评审',
      disputed: '争议中',
      re_reviewing: '复评中',
      finalized: '已最终评定',
      archived: '已归档'
    };
    return map[status] || status;
  }

  function getStatusColor(status: string): string {
    const map: Record<string, string> = {
      draft: '#888',
      submitted: '#4a90d9',
      reviewing: '#e6a23c',
      reviewed: '#67c23a',
      disputed: '#f56c6c',
      re_reviewing: '#e6a23c',
      finalized: '#909399',
      archived: '#606266'
    };
    return map[status] || '#888';
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

  function getContest(contestId?: string): ContestDefinition | undefined {
    if (!contestId) return undefined;
    return getContestById(reviewSystem, contestId);
  }

  function updateLeaderboardFilter(filter: Partial<LeaderboardFilter>) {
    gameStore.setLeaderboardFilter(filter);
  }

  function handleSortChange(e: Event) {
    const target = e.target as HTMLSelectElement;
    const sortBy = target.value as LeaderboardFilter['sortBy'];
    updateLeaderboardFilter({ sortBy });
  }

  function handleIncludeDisputedChange(e: Event) {
    const target = e.target as HTMLInputElement;
    updateLeaderboardFilter({ includeDisputed: target.checked });
  }

  $: disputedSubmissions = reviewSystem.submissions.filter(s => s.status === 'disputed' || s.status === 're_reviewing');
</script>

<div class="review-overlay">
  <div class="review-container">
    <div class="review-header">
      <div class="header-left">
        <h2 class="review-title">🎭 多人评审台</h2>
        <span class="review-subtitle">作品提交 · 维度打分 · 评语汇总 · 争议复核 · 排行榜</span>
      </div>
      <button class="close-btn" on:click={() => dispatch('close')}>
        <span>✕</span>
      </button>
    </div>

    <div class="tab-nav">
      {#each tabs as tab (tab.id)}
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

    <div class="tab-content">
      {#if activeTab === 'submit'}
        <div class="submit-panel">
          <div class="section-title">选择要提交的作品</div>
          {#if processedPhotos.length === 0}
            <div class="empty-state">
              <span class="empty-icon">📷</span>
              <p>还没有冲洗好的照片，先去暗房创作吧！</p>
            </div>
          {:else}
            <div class="photo-selector">
              {#each processedPhotos.slice(0, 12) as photo (photo.id)}
                <div
                  class="photo-select-card"
                  class:selected={selectedPhotoForSubmit?.id === photo.id}
                  on:click={() => selectPhotoForSubmit(photo)}
                >
                  <img src={photo.imageDataUrl} alt="" />
                  <div class="photo-select-info">
                    <span class="grade" style="color: {getGradeColor(photo.details.grade)}">{photo.details.grade}</span>
                    <span class="score">{Math.round(photo.score)}</span>
                  </div>
                </div>
              {/each}
            </div>
          {/if}

          {#if selectedPhotoForSubmit}
            <div class="submit-form">
              <div class="section-title">填写作品信息</div>

              <div class="form-row">
                <label class="form-label">作品标题 *</label>
                <input
                  class="form-input"
                  type="text"
                  bind:value={submitTitle}
                  placeholder="给你的作品起个名字..."
                  maxlength={50}
                />
              </div>

              <div class="form-row">
                <label class="form-label">作品描述</label>
                <textarea
                  class="form-textarea"
                  bind:value={submitDescription}
                  placeholder="描述你的创作思路、拍摄故事..."
                  rows={3}
                  maxlength={500}
                />
              </div>

              <div class="form-row">
                <label class="form-label">标签（用逗号或空格分隔）</label>
                <input
                  class="form-input"
                  type="text"
                  bind:value={submitTags}
                  placeholder="如: 人像, 黑白, 光影"
                />
              </div>

              <div class="form-row">
                <label class="form-label">参与比赛（可选）</label>
                <div class="contest-options">
                  <label class="contest-option">
                    <input
                      type="radio"
                      bind:group={selectedContestForSubmit}
                      value={null}
                    />
                    <span>不参与比赛</span>
                  </label>
                  {#each activeContests as contest (contest.id)}
                    {#if canSubmitToContest(reviewSystem, contest.id).allowed}
                      <label class="contest-option">
                        <input
                          type="radio"
                          bind:group={selectedContestForSubmit}
                          value={contest.id}
                        />
                        <span class="contest-icon">{contest.icon}</span>
                        <span>{contest.title}</span>
                      </label>
                    {/if}
                  {/each}
                </div>
              </div>

              <button
                class="submit-btn"
                on:click={handleSubmit}
                disabled={!submitTitle.trim()}
              >
                📤 提交作品
              </button>
            </div>
          {/if}
        </div>

      {:else if activeTab === 'review'}
        <div class="review-panel">
          <div class="section-title">评审台 - 待评审作品</div>
          {#if reviewSystem.submissions.length === 0}
            <div class="empty-state">
              <span class="empty-icon">⚖️</span>
              <p>暂无待评审的作品</p>
            </div>
          {:else}
            <div class="submissions-grid">
              {#each reviewSystem.submissions.filter(s => s.status === 'submitted' || s.status === 'reviewing' || s.status === 'reviewed') as submission (submission.id)}
                <div class="submission-card" on:click={() => openSubmissionDetail(submission)}>
                  <div class="submission-photo">
                    <img src={submission.photoDataUrl} alt="" />
                    <div class="status-badge" style="background: {getStatusColor(submission.status)}">
                      {getStatusLabel(submission.status)}
                    </div>
                    {#if submission.finalGrade}
                      <div class="grade-badge" style="background: {getGradeColor(submission.finalGrade)}">
                        {submission.finalGrade}
                      </div>
                    {/if}
                  </div>
                  <div class="submission-info">
                    <h3 class="submission-title">{submission.title}</h3>
                    <p class="submission-meta">
                      {getSubjectName(submission.subjectId)} · {getFilmName(submission.filmId)}
                    </p>
                    <p class="submission-date">{formatDate(submission.submittedAt)}</p>
                    {#if submission.finalScore !== null}
                      <div class="submission-score">
                        <span class="score-value">{submission.finalScore.toFixed(1)}</span>
                        <span class="review-count">/{submission.reviews.length} 评审</span>
                      </div>
                    {/if}
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>

      {:else if activeTab === 'leaderboard'}
        <div class="leaderboard-panel">
          <div class="leaderboard-header">
            <div class="section-title">🏆 排行榜</div>
            <div class="filter-controls">
              <select
                class="filter-select"
                value={leaderboardFilter.sortBy}
                on:change={handleSortChange}
              >
                <option value="score_desc">分数从高到低</option>
                <option value="score_asc">分数从低到高</option>
                <option value="date_desc">最新提交</option>
                <option value="date_asc">最早提交</option>
                <option value="reviews_desc">评审数最多</option>
              </select>
              <label class="filter-checkbox">
                <input
                  type="checkbox"
                  checked={leaderboardFilter.includeDisputed}
                  on:change={handleIncludeDisputedChange}
                />
                包含争议作品
              </label>
            </div>
          </div>

          {#if leaderboard.length === 0}
            <div class="empty-state">
              <span class="empty-icon">🏆</span>
              <p>暂无排行榜数据</p>
            </div>
          {:else}
            <div class="leaderboard-list">
              {#each leaderboard as entry (entry.submissionId)}
                <div
                  class="leaderboard-item"
                  class:top-three={entry.rank <= 3}
                  on:click={() => {
                    const sub = reviewSystem.submissions.find(s => s.id === entry.submissionId);
                    if (sub) openSubmissionDetail(sub);
                  }}
                >
                  <div class="rank-cell">
                    {#if entry.rank === 1}
                      <span class="rank-medal gold">🥇</span>
                    {:else if entry.rank === 2}
                      <span class="rank-medal silver">🥈</span>
                    {:else if entry.rank === 3}
                      <span class="rank-medal bronze">🥉</span>
                    {:else}
                      <span class="rank-number">{entry.rank}</span>
                    {/if}
                  </div>
                  <div class="photo-cell">
                    <img src={entry.photoDataUrl} alt="" />
                  </div>
                  <div class="info-cell">
                    <h4 class="entry-title">{entry.title}</h4>
                    <p class="entry-meta">
                      {entry.subjectName} · {entry.filmName}
                    </p>
                    <p class="entry-submitter">by {entry.submitterName} · {formatDate(entry.submissionTime)}</p>
                  </div>
                  <div class="score-cell">
                    <div class="entry-score" style="color: {getGradeColor(entry.finalGrade)}">
                      {entry.finalScore.toFixed(1)}
                    </div>
                    <div class="entry-grade" style="color: {getGradeColor(entry.finalGrade)}">
                      {entry.finalGrade}
                    </div>
                    <div class="entry-reviews">{entry.reviewCount} 评审</div>
                  </div>
                  {#if entry.isDisputed}
                    <div class="dispute-tag">⚠️ 争议</div>
                  {/if}
                </div>
              {/each}
            </div>
          {/if}
        </div>

      {:else if activeTab === 'my_submissions'}
        <div class="my-submissions-panel">
          <div class="section-title">我的作品 ({mySubmissions.length})</div>
          {#if mySubmissions.length === 0}
            <div class="empty-state">
              <span class="empty-icon">🖼️</span>
              <p>还没有提交作品，快去提交你的第一张吧！</p>
            </div>
          {:else}
            <div class="submissions-grid">
              {#each mySubmissions as submission (submission.id)}
                <div class="submission-card" on:click={() => openSubmissionDetail(submission)}>
                  <div class="submission-photo">
                    <img src={submission.photoDataUrl} alt="" />
                    <div class="status-badge" style="background: {getStatusColor(submission.status)}">
                      {getStatusLabel(submission.status)}
                    </div>
                    {#if submission.finalGrade}
                      <div class="grade-badge" style="background: {getGradeColor(submission.finalGrade)}">
                        {submission.finalGrade}
                      </div>
                    {/if}
                    {#if submission.ranking}
                      <div class="ranking-badge">#{submission.ranking}</div>
                    {/if}
                  </div>
                  <div class="submission-info">
                    <h3 class="submission-title">{submission.title}</h3>
                    <p class="submission-meta">
                      {getSubjectName(submission.subjectId)} · {getFilmName(submission.filmId)}
                    </p>
                    <p class="submission-date">{formatDate(submission.submittedAt)}</p>
                    {#if submission.finalScore !== null}
                      <div class="submission-score">
                        <span class="score-value">{submission.finalScore.toFixed(1)}</span>
                        <span class="review-count">/{submission.reviews.length} 评审</span>
                      </div>
                    {/if}
                    <div class="submission-actions" on:click|stopPropagation>
                      {#if submission.status === 'reviewed' && submission.reviews.length > 0}
                        <button class="action-btn" on:click={() => handleFinalize(submission)}>
                          ✅ 最终评定
                        </button>
                      {/if}
                      {#if (submission.status === 'reviewed' || submission.status === 'finalized') && submission.reviews.length > 0}
                        <button class="action-btn dispute" on:click={() => openDisputeModal(submission)}>
                          ⚠️ 申请复核
                        </button>
                      {/if}
                    </div>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>

      {:else if activeTab === 'disputes'}
        <div class="disputes-panel">
          <div class="section-title">争议复核 ({disputedSubmissions.length})</div>
          {#if disputedSubmissions.length === 0}
            <div class="empty-state">
              <span class="empty-icon">🔄</span>
              <p>暂无争议中的作品</p>
            </div>
          {:else}
            <div class="dispute-list">
              {#each disputedSubmissions as submission (submission.id)}
                <div class="dispute-card">
                  <div class="dispute-photo">
                    <img src={submission.photoDataUrl} alt="" />
                  </div>
                  <div class="dispute-info">
                    <h3 class="dispute-title">{submission.title}</h3>
                    <div class="dispute-status-row">
                      <span class="status-tag" style="background: {getStatusColor(submission.status)}">
                        {getStatusLabel(submission.status)}
                      </span>
                      {#if submission.finalScore !== null}
                        <span class="dispute-score">
                          当前分数: <strong>{submission.finalScore.toFixed(1)}</strong>
                        </span>
                      {/if}
                    </div>
                    {#if submission.disputeReason}
                      <div class="dispute-reason">
                        <span class="reason-label">争议理由：</span>
                        <p>{submission.disputeReason}</p>
                      </div>
                    {/if}
                    <div class="dispute-meta">
                      <span>提交时间: {formatDate(submission.submittedAt)}</span>
                      {#if submission.disputeAt}
                        <span>· 争议时间: {formatDate(submission.disputeAt)}</span>
                      {/if}
                    </div>
                    <button class="action-btn" on:click={() => openSubmissionDetail(submission)}>
                      📋 查看详情
                    </button>
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

{#if showDetailModal && selectedSubmission}
  <div class="modal-overlay" on:click={closeDetailModal}>
    <div class="modal-content detail-modal" on:click|stopPropagation>
      <div class="modal-header">
        <h3>{selectedSubmission.title}</h3>
        <button class="close-btn" on:click={closeDetailModal}>✕</button>
      </div>

      <div class="detail-body">
        <div class="detail-left">
          <div class="detail-photo-frame">
            <img src={selectedSubmission.photoDataUrl} alt="" />
          </div>
          <div class="detail-basic">
            <p><strong>场景：</strong>{getSubjectName(selectedSubmission.subjectId)}</p>
            <p><strong>胶片：</strong>{getFilmName(selectedSubmission.filmId)}</p>
            <p><strong>提交时间：</strong>{formatDate(selectedSubmission.submittedAt)}</p>
            <p><strong>状态：</strong>
              <span class="status-tag" style="background: {getStatusColor(selectedSubmission.status)}">
                {getStatusLabel(selectedSubmission.status)}
              </span>
            </p>
            {#if selectedSubmission.description}
              <p><strong>描述：</strong>{selectedSubmission.description}</p>
            {/if}
            {#if selectedSubmission.tags.length > 0}
              <div class="detail-tags">
                {#each selectedSubmission.tags as tag (tag)}
                  <span class="tag-chip">#{tag}</span>
                {/each}
              </div>
            {/if}
          </div>
        </div>

        <div class="detail-right">
          {#if selectedSubmission.reviews.length === 0}
            <div class="empty-state small">
              <span class="empty-icon">⏳</span>
              <p>暂无评审结果，请耐心等待</p>
            </div>
          {:else}
            {#if commentSummary}
              <div class="summary-section">
                <h4>📊 评语汇总</h4>
                <div class="summary-scores">
                  {#each commentSummary.dimensionAverages as dim (dim.dimensionId)}
                    <div class="dim-score-row">
                      <span class="dim-name">{dim.dimensionName}</span>
                      <div class="dim-bar-wrap">
                        <div class="dim-bar" style="width: {dim.averageScore}%;"></div>
                      </div>
                      <span class="dim-value">{dim.averageScore.toFixed(1)}</span>
                    </div>
                  {/each}
                </div>
                <div class="summary-meta">
                  <span>评审员一致性: {Math.round(commentSummary.reviewerAgreement)}%</span>
                  <span>共 {commentSummary.totalReviewers} 位评审</span>
                </div>
                {#if commentSummary.positivePoints.length > 0}
                  <div class="summary-points">
                    <h5>👍 亮点</h5>
                    <ul>
                      {#each commentSummary.positivePoints.slice(0, 3) as point (point)}
                        <li>{point}</li>
                      {/each}
                    </ul>
                  </div>
                {/if}
                {#if commentSummary.negativePoints.length > 0}
                  <div class="summary-points">
                    <h5>⚠️ 不足</h5>
                    <ul>
                      {#each commentSummary.negativePoints.slice(0, 3) as point (point)}
                        <li>{point}</li>
                      {/each}
                    </ul>
                  </div>
                {/if}
              </div>
            {/if}

            <div class="reviews-section">
              <h4>💬 评审详情 ({selectedSubmission.reviews.length})</h4>
              <div class="reviews-list">
                {#each selectedSubmission.reviews as review (review.id)}
                  <div class="review-item">
                    <div class="reviewer-header">
                      <span class="reviewer-avatar">{getReviewerAvatar(review.reviewerId)}</span>
                      <div class="reviewer-info">
                        <span class="reviewer-name">{getReviewerName(review.reviewerId)}</span>
                        <span class="review-score">
                          {review.weightedScore.toFixed(1)} 分
                        </span>
                      </div>
                      <span class="recommendation-tag {review.recommendation}">
                        {review.recommendation === 'excellent' ? '🌟 优秀' :
                         review.recommendation === 'accept' ? '✅ 通过' :
                         review.recommendation === 'revise' ? '📝 修改' : '❌ 不通过'}
                      </span>
                    </div>
                    <p class="review-comment">{review.overallComment}</p>
                    <div class="review-dimensions">
                      {#each review.scores as score (score.dimensionId)}
                        <div class="review-dim">
                          <span class="dim-label">{(DEFAULT_REVIEW_DIMENSIONS.find(d => d.id === score.dimensionId)?.name || score.dimensionId)}</span>
                          <div class="dim-score-bar">
                            <div class="dim-score-fill" style="width: {score.score}%;"></div>
                          </div>
                          <span class="dim-score-value">{score.score.toFixed(0)}</span>
                        </div>
                      {/each}
                    </div>
                  </div>
                {/each}
              </div>
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}

{#if showDisputeModal && selectedSubmission}
  <div class="modal-overlay" on:click={closeDisputeModal}>
    <div class="modal-content dispute-modal" on:click|stopPropagation>
      <div class="modal-header">
        <h3>申请争议复核 - {selectedSubmission.title}</h3>
        <button class="close-btn" on:click={closeDisputeModal}>✕</button>
      </div>
      <div class="dispute-form">
        <div class="dispute-current">
          <p>当前分数：<strong>{selectedSubmission.finalScore?.toFixed(1) || '--'}</strong></p>
          <p>评审数量：<strong>{selectedSubmission.reviews.length}</strong></p>
        </div>
        <label class="form-label">争议理由 *</label>
        <textarea
          class="form-textarea"
          bind:value={disputeReason}
          placeholder="请详细说明你认为评审结果需要复核的原因..."
          rows={5}
          maxlength={1000}
        />
        <div class="dispute-form-actions">
          <button class="btn-secondary" on:click={closeDisputeModal}>取消</button>
          <button
            class="btn-primary"
            on:click={handleSubmitDispute}
            disabled={!disputeReason.trim()}
          >
            提交复核申请
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .review-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.85);
    backdrop-filter: blur(8px);
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

  .review-container {
    width: 100%;
    max-width: 1200px;
    max-height: 92vh;
    background: linear-gradient(180deg, rgba(45, 26, 18, 0.95), rgba(20, 12, 8, 0.98));
    border: 1px solid rgba(139, 90, 43, 0.3);
    border-radius: 16px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .review-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 28px;
    border-bottom: 1px solid rgba(139, 90, 43, 0.2);
  }

  .header-left {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .review-title {
    margin: 0;
    font-size: 22px;
    color: #e8c890;
    letter-spacing: 2px;
  }

  .review-subtitle {
    font-size: 12px;
    color: #7a6a55;
    letter-spacing: 1px;
  }

  .close-btn {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    background: rgba(139, 90, 43, 0.2);
    border: 1px solid rgba(139, 90, 43, 0.3);
    color: #c8a878;
    font-size: 16px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .close-btn:hover {
    background: rgba(200, 80, 80, 0.3);
    border-color: rgba(200, 80, 80, 0.5);
  }

  .tab-nav {
    display: flex;
    gap: 4px;
    padding: 12px 28px;
    background: rgba(0, 0, 0, 0.2);
    border-bottom: 1px solid rgba(139, 90, 43, 0.15);
    overflow-x: auto;
  }

  .tab-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 18px;
    border: none;
    background: transparent;
    color: #8a7a5a;
    font-size: 14px;
    cursor: pointer;
    border-radius: 8px;
    transition: all 0.2s;
    white-space: nowrap;
  }

  .tab-btn:hover {
    background: rgba(139, 90, 43, 0.15);
    color: #c8a878;
  }

  .tab-btn.active {
    background: linear-gradient(135deg, rgba(139, 90, 43, 0.4), rgba(180, 140, 90, 0.25));
    color: #f0d8a8;
    border: 1px solid rgba(180, 140, 90, 0.4);
  }

  .tab-icon {
    font-size: 16px;
  }

  .tab-content {
    flex: 1;
    overflow-y: auto;
    padding: 24px 28px;
  }

  .section-title {
    font-size: 16px;
    font-weight: 600;
    color: #d4a574;
    margin-bottom: 16px;
    padding-bottom: 8px;
    border-bottom: 1px solid rgba(139, 90, 43, 0.2);
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 20px;
    color: #6a5a45;
  }

  .empty-state.small {
    padding: 30px 20px;
  }

  .empty-icon {
    font-size: 48px;
    margin-bottom: 12px;
    opacity: 0.6;
  }

  .empty-state p {
    margin: 0;
    font-size: 14px;
  }

  .photo-selector {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 12px;
    margin-bottom: 24px;
  }

  .photo-select-card {
    position: relative;
    aspect-ratio: 3 / 4;
    border-radius: 8px;
    overflow: hidden;
    cursor: pointer;
    border: 2px solid transparent;
    transition: all 0.2s;
  }

  .photo-select-card:hover {
    transform: translateY(-2px);
    border-color: rgba(180, 140, 90, 0.4);
  }

  .photo-select-card.selected {
    border-color: #d4a574;
    box-shadow: 0 0 0 3px rgba(212, 165, 116, 0.2);
  }

  .photo-select-card img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .photo-select-info {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    display: flex;
    justify-content: space-between;
    padding: 6px 10px;
    background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
  }

  .photo-select-info .grade {
    font-weight: bold;
    font-size: 16px;
  }

  .photo-select-info .score {
    color: #c8b896;
    font-size: 12px;
  }

  .submit-form {
    background: rgba(0, 0, 0, 0.2);
    padding: 20px;
    border-radius: 12px;
    border: 1px solid rgba(139, 90, 43, 0.15);
  }

  .form-row {
    margin-bottom: 16px;
  }

  .form-label {
    display: block;
    font-size: 13px;
    color: #a08b6c;
    margin-bottom: 6px;
  }

  .form-input, .form-textarea, .filter-select {
    width: 100%;
    padding: 10px 14px;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(139, 90, 43, 0.3);
    border-radius: 8px;
    color: #e8dcc8;
    font-size: 14px;
    outline: none;
    transition: border-color 0.2s;
    box-sizing: border-box;
  }

  .form-input:focus, .form-textarea:focus, .filter-select:focus {
    border-color: rgba(180, 140, 90, 0.6);
  }

  .form-textarea {
    resize: vertical;
    font-family: inherit;
  }

  .contest-options {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .contest-option {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 8px;
    cursor: pointer;
    color: #c8b896;
    font-size: 14px;
    transition: background 0.2s;
  }

  .contest-option:hover {
    background: rgba(139, 90, 43, 0.15);
  }

  .contest-icon {
    font-size: 18px;
  }

  .submit-btn {
    width: 100%;
    padding: 14px;
    margin-top: 8px;
    background: linear-gradient(135deg, #d4a574, #8b5a2b);
    border: none;
    border-radius: 10px;
    color: #fff;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .submit-btn:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 16px rgba(212, 165, 116, 0.4);
  }

  .submit-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .submissions-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 16px;
  }

  .submission-card {
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(139, 90, 43, 0.2);
    border-radius: 12px;
    overflow: hidden;
    cursor: pointer;
    transition: all 0.2s;
  }

  .submission-card:hover {
    transform: translateY(-2px);
    border-color: rgba(180, 140, 90, 0.4);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  }

  .submission-photo {
    position: relative;
    aspect-ratio: 3 / 4;
  }

  .submission-photo img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .status-badge {
    position: absolute;
    top: 10px;
    left: 10px;
    padding: 4px 10px;
    border-radius: 4px;
    font-size: 11px;
    color: #fff;
    font-weight: 500;
  }

  .grade-badge {
    position: absolute;
    top: 10px;
    right: 10px;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #1a0f08;
    font-weight: bold;
    font-size: 16px;
  }

  .ranking-badge {
    position: absolute;
    bottom: 10px;
    right: 10px;
    padding: 4px 10px;
    background: rgba(0, 0, 0, 0.7);
    border-radius: 4px;
    font-size: 12px;
    color: #ffd700;
    font-weight: 600;
  }

  .submission-info {
    padding: 14px;
  }

  .submission-title {
    margin: 0 0 6px 0;
    font-size: 15px;
    color: #e8c890;
    font-weight: 600;
  }

  .submission-meta {
    margin: 0 0 4px 0;
    font-size: 12px;
    color: #8a7a5a;
  }

  .submission-date {
    margin: 0 0 10px 0;
    font-size: 11px;
    color: #6a5a45;
  }

  .submission-score {
    display: flex;
    align-items: baseline;
    gap: 4px;
  }

  .score-value {
    font-size: 20px;
    font-weight: bold;
    color: #d4a574;
  }

  .review-count {
    font-size: 12px;
    color: #6a5a45;
  }

  .submission-actions {
    display: flex;
    gap: 8px;
    margin-top: 12px;
    flex-wrap: wrap;
  }

  .action-btn {
    padding: 6px 12px;
    background: rgba(103, 194, 58, 0.2);
    border: 1px solid rgba(103, 194, 58, 0.4);
    border-radius: 6px;
    color: #67c23a;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .action-btn:hover {
    background: rgba(103, 194, 58, 0.3);
  }

  .action-btn.dispute {
    background: rgba(245, 108, 108, 0.15);
    border-color: rgba(245, 108, 108, 0.4);
    color: #f56c6c;
  }

  .action-btn.dispute:hover {
    background: rgba(245, 108, 108, 0.25);
  }

  .leaderboard-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
    flex-wrap: wrap;
    gap: 12px;
  }

  .leaderboard-header .section-title {
    margin-bottom: 0;
    padding-bottom: 0;
    border-bottom: none;
  }

  .filter-controls {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .filter-select {
    width: auto;
    min-width: 160px;
  }

  .filter-checkbox {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: #a08b6c;
    cursor: pointer;
  }

  .leaderboard-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .leaderboard-item {
    display: grid;
    grid-template-columns: 60px 80px 1fr auto auto;
    align-items: center;
    gap: 16px;
    padding: 12px 16px;
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(139, 90, 43, 0.2);
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .leaderboard-item:hover {
    border-color: rgba(180, 140, 90, 0.4);
    background: rgba(139, 90, 43, 0.1);
  }

  .leaderboard-item.top-three {
    background: linear-gradient(90deg, rgba(255, 215, 0, 0.08), transparent);
    border-color: rgba(255, 215, 0, 0.2);
  }

  .rank-cell {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .rank-medal {
    font-size: 28px;
  }

  .rank-number {
    font-size: 18px;
    font-weight: bold;
    color: #8a7a5a;
  }

  .photo-cell img {
    width: 100%;
    aspect-ratio: 3 / 4;
    object-fit: cover;
    border-radius: 6px;
  }

  .entry-title {
    margin: 0 0 4px 0;
    font-size: 15px;
    color: #e8c890;
    font-weight: 600;
  }

  .entry-meta {
    margin: 0 0 2px 0;
    font-size: 12px;
    color: #a08b6c;
  }

  .entry-submitter {
    margin: 0;
    font-size: 11px;
    color: #6a5a45;
  }

  .score-cell {
    text-align: right;
  }

  .entry-score {
    font-size: 22px;
    font-weight: bold;
  }

  .entry-grade {
    font-size: 14px;
    font-weight: 600;
  }

  .entry-reviews {
    font-size: 11px;
    color: #6a5a45;
    margin-top: 2px;
  }

  .dispute-tag {
    padding: 4px 10px;
    background: rgba(245, 108, 108, 0.2);
    border-radius: 4px;
    font-size: 11px;
    color: #f56c6c;
  }

  .dispute-list {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .dispute-card {
    display: grid;
    grid-template-columns: 100px 1fr;
    gap: 16px;
    padding: 16px;
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(245, 108, 108, 0.2);
    border-radius: 12px;
  }

  .dispute-photo img {
    width: 100%;
    aspect-ratio: 3 / 4;
    object-fit: cover;
    border-radius: 8px;
  }

  .dispute-title {
    margin: 0 0 8px 0;
    font-size: 16px;
    color: #e8c890;
  }

  .dispute-status-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 10px;
  }

  .status-tag {
    padding: 4px 10px;
    border-radius: 4px;
    font-size: 12px;
    color: #fff;
  }

  .dispute-score {
    font-size: 13px;
    color: #a08b6c;
  }

  .dispute-reason {
    padding: 10px 14px;
    background: rgba(0, 0, 0, 0.25);
    border-radius: 8px;
    margin-bottom: 10px;
  }

  .reason-label {
    font-size: 12px;
    color: #f56c6c;
    font-weight: 600;
  }

  .dispute-reason p {
    margin: 4px 0 0 0;
    font-size: 13px;
    color: #c8b896;
    line-height: 1.5;
  }

  .dispute-meta {
    font-size: 11px;
    color: #6a5a45;
    margin-bottom: 12px;
  }

  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(4px);
    z-index: 200;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    animation: fadeIn 0.2s ease;
  }

  .modal-content {
    width: 100%;
    max-width: 900px;
    max-height: 90vh;
    background: linear-gradient(180deg, rgba(45, 26, 18, 0.98), rgba(20, 12, 8, 1));
    border: 1px solid rgba(139, 90, 43, 0.3);
    border-radius: 14px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .detail-modal {
    max-width: 1000px;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 24px;
    border-bottom: 1px solid rgba(139, 90, 43, 0.2);
  }

  .modal-header h3 {
    margin: 0;
    color: #e8c890;
    font-size: 18px;
  }

  .detail-body {
    display: grid;
    grid-template-columns: 340px 1fr;
    gap: 24px;
    padding: 24px;
    overflow-y: auto;
  }

  @media (max-width: 768px) {
    .detail-body {
      grid-template-columns: 1fr;
    }
  }

  .detail-photo-frame {
    border-radius: 10px;
    overflow: hidden;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    margin-bottom: 16px;
  }

  .detail-photo-frame img {
    width: 100%;
    display: block;
  }

  .detail-basic p {
    margin: 0 0 8px 0;
    font-size: 13px;
    color: #a08b6c;
    line-height: 1.5;
  }

  .detail-basic strong {
    color: #c8a878;
  }

  .detail-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 10px;
  }

  .tag-chip {
    padding: 3px 10px;
    background: rgba(139, 90, 43, 0.2);
    border-radius: 12px;
    font-size: 11px;
    color: #d4a574;
  }

  .summary-section, .reviews-section {
    margin-bottom: 24px;
  }

  .summary-section h4, .reviews-section h4 {
    margin: 0 0 14px 0;
    font-size: 15px;
    color: #d4a574;
    padding-bottom: 8px;
    border-bottom: 1px solid rgba(139, 90, 43, 0.2);
  }

  .summary-scores {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 14px;
  }

  .dim-score-row {
    display: grid;
    grid-template-columns: 50px 1fr 50px;
    align-items: center;
    gap: 10px;
  }

  .dim-name {
    font-size: 12px;
    color: #a08b6c;
  }

  .dim-bar-wrap {
    height: 8px;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 4px;
    overflow: hidden;
  }

  .dim-bar {
    height: 100%;
    background: linear-gradient(90deg, #8b5a2b, #d4a574);
    border-radius: 4px;
    transition: width 0.5s ease;
  }

  .dim-value {
    font-size: 12px;
    color: #d4a574;
    font-weight: 600;
    text-align: right;
  }

  .summary-meta {
    display: flex;
    gap: 20px;
    font-size: 12px;
    color: #6a5a45;
    margin-bottom: 14px;
  }

  .summary-points h5 {
    margin: 0 0 6px 0;
    font-size: 13px;
    color: #c8a878;
  }

  .summary-points ul {
    margin: 0 0 12px 0;
    padding-left: 18px;
  }

  .summary-points li {
    font-size: 12px;
    color: #a08b6c;
    line-height: 1.5;
    margin-bottom: 4px;
  }

  .reviews-list {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .review-item {
    padding: 14px;
    background: rgba(0, 0, 0, 0.25);
    border-radius: 10px;
    border: 1px solid rgba(139, 90, 43, 0.15);
  }

  .reviewer-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 10px;
  }

  .reviewer-avatar {
    font-size: 24px;
  }

  .reviewer-info {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .reviewer-name {
    font-size: 14px;
    color: #e8c890;
    font-weight: 600;
  }

  .review-score {
    font-size: 12px;
    color: #d4a574;
  }

  .recommendation-tag {
    padding: 4px 10px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 600;
  }

  .recommendation-tag.excellent {
    background: rgba(255, 215, 0, 0.2);
    color: #ffd700;
  }

  .recommendation-tag.accept {
    background: rgba(103, 194, 58, 0.2);
    color: #67c23a;
  }

  .recommendation-tag.revise {
    background: rgba(230, 162, 60, 0.2);
    color: #e6a23c;
  }

  .recommendation-tag.reject {
    background: rgba(245, 108, 108, 0.2);
    color: #f56c6c;
  }

  .review-comment {
    margin: 0 0 12px 0;
    font-size: 13px;
    color: #c8b896;
    line-height: 1.6;
  }

  .review-dimensions {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .review-dim {
    display: grid;
    grid-template-columns: 42px 1fr 32px;
    align-items: center;
    gap: 8px;
  }

  .dim-label {
    font-size: 11px;
    color: #8a7a5a;
  }

  .dim-score-bar {
    height: 6px;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 3px;
    overflow: hidden;
  }

  .dim-score-fill {
    height: 100%;
    background: linear-gradient(90deg, #8b5a2b, #d4a574);
    border-radius: 3px;
  }

  .dim-score-value {
    font-size: 11px;
    color: #a08b6c;
    text-align: right;
  }

  .dispute-form {
    padding: 24px;
  }

  .dispute-current {
    display: flex;
    gap: 24px;
    padding: 14px 18px;
    background: rgba(0, 0, 0, 0.25);
    border-radius: 8px;
    margin-bottom: 18px;
  }

  .dispute-current p {
    margin: 0;
    font-size: 14px;
    color: #a08b6c;
  }

  .dispute-current strong {
    color: #d4a574;
    font-size: 16px;
  }

  .dispute-form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 18px;
  }

  .btn-secondary {
    padding: 10px 22px;
    background: rgba(139, 90, 43, 0.2);
    border: 1px solid rgba(139, 90, 43, 0.4);
    border-radius: 8px;
    color: #c8a878;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-secondary:hover {
    background: rgba(139, 90, 43, 0.3);
  }

  .btn-primary {
    padding: 10px 22px;
    background: linear-gradient(135deg, #d4a574, #8b5a2b);
    border: none;
    border-radius: 8px;
    color: #fff;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-primary:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(212, 165, 116, 0.4);
  }

  .btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
