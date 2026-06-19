<script lang="ts">
  import { gameStore } from '../stores/gameStore';
  import type { DarkroomOrder, OrderScoreFeedback } from '../types/game';

  export let order: DarkroomOrder | null = null;

  let overallRating = 5;
  let qualityRating = 5;
  let speedRating = 5;
  let serviceRating = 5;
  let comment = '';
  let wouldRecommend = true;

  $: if (order?.scoreFeedback) {
    overallRating = order.scoreFeedback.overallRating;
    qualityRating = order.scoreFeedback.qualityRating;
    speedRating = order.scoreFeedback.speedRating;
    serviceRating = order.scoreFeedback.serviceRating;
    comment = order.scoreFeedback.comment || '';
    wouldRecommend = order.scoreFeedback.wouldRecommend;
  }

  $: averageRating = Math.round((qualityRating + speedRating + serviceRating) / 3 * 10) / 10;

  const ratingLabels: Record<number, string> = {
    1: '很差',
    2: '较差',
    3: '一般',
    4: '满意',
    5: '非常满意'
  };

  function handleStarClick(ratingType: string, value: number) {
    if (order?.scoreFeedback) return;
    
    switch (ratingType) {
      case 'overall':
        overallRating = value;
        break;
      case 'quality':
        qualityRating = value;
        break;
      case 'speed':
        speedRating = value;
        break;
      case 'service':
        serviceRating = value;
        break;
    }
  }

  function submitFeedback() {
    if (!order || order.scoreFeedback) return;

    const feedback: Omit<OrderScoreFeedback, 'ratedAt'> = {
      overallRating: overallRating,
      qualityRating: qualityRating,
      speedRating: speedRating,
      serviceRating: serviceRating,
      comment: comment.trim() || undefined,
      wouldRecommend: wouldRecommend
    };

    gameStore.submitScoreFeedback(order.id, feedback);
  }

  function formatDate(timestamp: number): string {
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
</script>

<div class="score-feedback">
  <div class="panel-header">
    <h3 class="title">客户评分回传</h3>
    {#if order?.scoreFeedback}
      <span class="completed-badge">已评价</span>
    {/if}
  </div>

  {#if !order}
    <div class="empty-state">
      <div class="empty-icon">⭐</div>
      <p>选择订单查看评分</p>
    </div>
  {:else if order.status !== 'scoring' && order.status !== 'completed' && order.status !== 'archived'}
    <div class="empty-state">
      <div class="empty-icon">⏳</div>
      <p>订单完成后可进行评价</p>
    </div>
  {:else}
    {#if order.scoreFeedback}
      <div class="feedback-display">
        <div class="overall-score">
          <div class="score-circle" style="color: {overallRating >= 4 ? '#10b981' : overallRating >= 3 ? '#f59e0b' : '#ef4444'}">
            <span class="score-value">{overallRating}</span>
            <span class="score-max">/5</span>
          </div>
          <div class="score-label">
            <div class="star-display">
              {#each [1, 2, 3, 4, 5] as star}
                <span class="star {star <= overallRating ? 'active' : ''}">
                  {star <= overallRating ? '★' : '☆'}
                </span>
              {/each}
            </div>
            <span class="rating-text">{ratingLabels[overallRating]}</span>
          </div>
        </div>

        <div class="rating-breakdown">
          <div class="rating-item">
          <span class="rating-label">冲洗质量</span>
            <div class="rating-stars">
              {#each [1, 2, 3, 4, 5] as star}
                <span class="star small {star <= order.scoreFeedback.qualityRating ? 'active' : ''}">
                  {star <= order.scoreFeedback.qualityRating ? '★' : '☆'}
                </span>
              {/each}
            </div>
            <span class="rating-value">{order.scoreFeedback.qualityRating}</span>
          </div>
          <div class="rating-item">
            <span class="rating-label">交付速度</span>
            <div class="rating-stars">
              {#each [1, 2, 3, 4, 5] as star}
                <span class="star small {star <= order.scoreFeedback.speedRating ? 'active' : ''}">
                  {star <= order.scoreFeedback.speedRating ? '★' : '☆'}
                </span>
              {/each}
            </div>
            <span class="rating-value">{order.scoreFeedback.speedRating}</span>
          </div>
          <div class="rating-item">
            <span class="rating-label">服务态度</span>
            <div class="rating-stars">
              {#each [1, 2, 3, 4, 5] as star}
                <span class="star small {star <= order.scoreFeedback.serviceRating ? 'active' : ''}">
                  {star <= order.scoreFeedback.serviceRating ? '★' : '☆'}
                </span>
              {/each}
            </div>
            <span class="rating-value">{order.scoreFeedback.serviceRating}</span>
          </div>
        </div>

        {#if order.scoreFeedback.comment}
          <div class="comment-section">
            <div class="comment-label">评价内容</div>
            <div class="comment-text">{order.scoreFeedback.comment}</div>
          </div>
        {/if}

        <div class="recommend-section">
          <span class="recommend-label">是否推荐：</span>
          <span class="recommend-value" class:yes={order.scoreFeedback.wouldRecommend}>
            {order.scoreFeedback.wouldRecommend ? '👍 推荐' : '👎 不推荐'}
          </span>
        </div>

        <div class="rated-at">
          评价时间：{formatDate(order.scoreFeedback.ratedAt)}
        </div>
      </div>
    {:else}
      <div class="feedback-form">
        <div class="overall-rating-section">
          <div class="section-label">总体评价</div>
          <div class="big-stars">
            {#each [1, 2, 3, 4, 5] as star}
              <span
                class="star big"
                class:active={star <= overallRating}
                on:click={() => handleStarClick('overall', star)}
              >
                {star <= overallRating ? '★' : '☆'}
              </span>
            {/each}
          </div>
          <div class="rating-text-big">{ratingLabels[overallRating]}</div>
        </div>

        <div class="detail-ratings">
          <div class="detail-rating-item">
            <span class="detail-label">冲洗质量</span>
            <div class="detail-stars">
              {#each [1, 2, 3, 4, 5] as star}
                <span
                  class="star"
                  class:active={star <= qualityRating}
                  on:click={() => handleStarClick('quality', star)}
                >
                  {star <= qualityRating ? '★' : '☆'}
                </span>
              {/each}
            </div>
            <span class="detail-value">{qualityRating}.0</span>
          </div>
          <div class="detail-rating-item">
            <span class="detail-label">交付速度</span>
            <div class="detail-stars">
              {#each [1, 2, 3, 4, 5] as star}
                <span
                  class="star"
                  class:active={star <= speedRating}
                  on:click={() => handleStarClick('speed', star)}
                >
                  {star <= speedRating ? '★' : '☆'}
                </span>
              {/each}
            </div>
            <span class="detail-value">{speedRating}.0</span>
          </div>
          <div class="detail-rating-item">
            <span class="detail-label">服务态度</span>
            <div class="detail-stars">
              {#each [1, 2, 3, 4, 5] as star}
                <span
                  class="star"
                  class:active={star <= serviceRating}
                  on:click={() => handleStarClick('service', star)}
                >
                  {star <= serviceRating ? '★' : '☆'}
                </span>
              {/each}
            </div>
            <span class="detail-value">{serviceRating}.0</span>
          </div>
        </div>

        <div class="comment-input-section">
          <div class="section-label">评价内容</div>
          <textarea
            bind:value={comment}
            placeholder="请输入您的评价..."
            rows={4}
          />
        </div>

        <div class="recommend-toggle">
          <span class="toggle-label">是否推荐给朋友？</span>
          <button
            class="toggle-btn"
            class:active={wouldRecommend}
            on:click={() => wouldRecommend = !wouldRecommend}
          >
            {wouldRecommend ? '👍 推荐' : '👎 不推荐'}
          </button>
        </div>

        <button class="submit-btn" on:click={submitFeedback}>
          提交评价
        </button>
      </div>
    {/if}
  {/if}
</div>

<style>
  .score-feedback {
    background: linear-gradient(180deg, rgba(45, 26, 18, 0.5) 0%, rgba(20, 12, 8, 0.6) 100%);
    border: 1px solid rgba(139, 90, 43, 0.2);
    border-radius: 16px;
    padding: 16px;
    backdrop-filter: blur(6px);
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 14px;
    padding-bottom: 10px;
    border-bottom: 1px solid rgba(139, 90, 43, 0.2);
  }

  .title {
    font-size: 15px;
    font-weight: 600;
    color: #e8c890;
    margin: 0;
    letter-spacing: 1px;
  }

  .completed-badge {
    font-size: 11px;
    color: #10b981;
    background: rgba(16, 185, 129, 0.15);
    padding: 3px 10px;
    border-radius: 10px;
  }

  .feedback-display {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .overall-score {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px;
    background: rgba(0, 0, 0, 0.25);
    border-radius: 12px;
  }

  .score-circle {
    display: flex;
    align-items: baseline;
  }

  .score-value {
    font-size: 36px;
    font-weight: 700;
  }

  .score-max {
    font-size: 14px;
    opacity: 0.6;
    margin-left: 2px;
  }

  .score-label {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .star-display {
    display: flex;
    gap: 4px;
  }

  .star {
    font-size: 18px;
    color: #6a5a45;
    cursor: pointer;
    transition: all 0.2s ease;
    user-select: none;
  }

  .star.active {
    color: #f59e0b;
  }

  .star.small {
    font-size: 14px;
  }

  .star.big {
    font-size: 32px;
  }

  .star:hover {
    transform: scale(1.1);
  }

  .star.readonly:hover {
    transform: none;
    cursor: default;
  }

  .rating-text {
    font-size: 14px;
    color: #c8a878;
    font-weight: 500;
  }

  .rating-breakdown {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .rating-item {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .rating-label {
    font-size: 12px;
    color: #8a7a5a;
    width: 70px;
  }

  .rating-stars {
    flex: 1;
    display: flex;
    gap: 4px;
  }

  .rating-value {
    font-size: 13px;
    color: #c8a878;
    font-weight: 500;
    width: 30px;
    text-align: right;
  }

  .comment-section {
    padding: 12px;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 10px;
  }

  .comment-label {
    font-size: 11px;
    color: #6a5a45;
    margin-bottom: 6px;
  }

  .comment-text {
    font-size: 13px;
    color: #c8a878;
    line-height: 1.5;
  }

  .recommend-section {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .recommend-label {
    font-size: 12px;
    color: #8a7a5a;
  }

  .recommend-value {
    font-size: 13px;
    font-weight: 500;
  }

  .recommend-value.yes {
    color: #10b981;
  }

  .recommend-value:not(.yes) {
    color: #ef4444;
  }

  .rated-at {
    font-size: 11px;
    color: #6a5a45;
    text-align: right;
  }

  .feedback-form {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .overall-rating-section {
    text-align: center;
    padding: 16px;
    background: rgba(0, 0, 0, 0.25);
    border-radius: 12px;
  }

  .section-label {
    font-size: 12px;
    color: #8a7a5a;
    margin-bottom: 10px;
  }

  .big-stars {
    display: flex;
    justify-content: center;
    gap: 8px;
    margin-bottom: 8px;
  }

  .rating-text-big {
    font-size: 14px;
    color: #f59e0b;
    font-weight: 500;
  }

  .detail-ratings {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .detail-rating-item {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .detail-label {
    font-size: 12px;
    color: #8a7a5a;
    width: 70px;
  }

  .detail-stars {
    flex: 1;
    display: flex;
    gap: 4px;
  }

  .detail-value {
    font-size: 13px;
    color: #c8a878;
    font-weight: 500;
    width: 30px;
    text-align: right;
  }

  .comment-input-section {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .comment-input-section textarea {
    width: 100%;
    padding: 10px 12px;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(139, 90, 43, 0.25);
    border-radius: 8px;
    color: #c8a878;
    font-size: 12px;
    outline: none;
    resize: vertical;
    min-height: 80px;
    box-sizing: border-box;
    font-family: inherit;
  }

  .comment-input-section textarea:focus {
    border-color: rgba(200, 150, 80, 0.5);
  }

  .comment-input-section textarea::placeholder {
    color: #6a5a45;
  }

  .recommend-toggle {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .toggle-label {
    font-size: 12px;
    color: #8a7a5a;
  }

  .toggle-btn {
    background: rgba(139, 90, 43, 0.2);
    border: 1px solid rgba(139, 90, 43, 0.3);
    color: #a89878;
    padding: 6px 14px;
    border-radius: 8px;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .toggle-btn:hover {
    background: rgba(139, 90, 43, 0.4);
  }

  .toggle-btn.active {
    background: rgba(16, 185, 129, 0.2);
    border-color: rgba(16, 185, 129, 0.4);
    color: #10b981;
  }

  .submit-btn {
    width: 100%;
    padding: 12px;
    background: linear-gradient(135deg, #c8a878, #a08050);
    color: #1a1008;
    border: none;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .submit-btn:hover {
    background: linear-gradient(135deg, #d4b888, #b09060);
    transform: translateY(-1px);
  }

  .empty-state {
    text-align: center;
    padding: 30px 20px;
    color: #6a5a45;
  }

  .empty-icon {
    font-size: 40px;
    margin-bottom: 10px;
    opacity: 0.5;
  }

  .empty-state p {
    margin: 4px 0;
    font-size: 12px;
  }
</style>
