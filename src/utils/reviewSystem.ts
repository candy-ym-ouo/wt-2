import type {
  ReviewDimension,
  Reviewer,
  Review,
  ReviewScore,
  ReviewSubmission,
  ContestDefinition,
  ReviewLeaderboardEntry,
  LeaderboardFilter,
  DisputeRecord,
  ReviewCommentSummary,
  ReviewSystemState,
  ReviewDimensionId,
  SubmissionStatus,
  ProcessedPhoto,
  PhotoSubject,
  FilmStock
} from '../types/game';
import { PHOTO_SUBJECTS, FILM_STOCKS } from '../data/gameData';
import { generateId, clamp } from './math';

export const DEFAULT_REVIEW_DIMENSIONS: ReviewDimension[] = [
  { id: 'composition', name: '构图', description: '画面布局、视觉引导与平衡感', weight: 0.20, icon: '📐' },
  { id: 'lighting', name: '光影', description: '光线运用、明暗层次与氛围感', weight: 0.20, icon: '💡' },
  { id: 'color', name: '色彩', description: '色调表现、色彩和谐与胶片质感', weight: 0.18, icon: '🎨' },
  { id: 'detail', name: '细节', description: '锐度、颗粒控制与关键区域表现', weight: 0.17, icon: '🔍' },
  { id: 'creativity', name: '创意', description: '独特视角、创新表达与艺术感', weight: 0.15, icon: '✨' },
  { id: 'emotion', name: '情感', description: '情绪传递、故事性与感染力', weight: 0.10, icon: '💫' }
];

export const DEFAULT_REVIEWERS: Reviewer[] = [
  {
    id: 'reviewer_chen',
    name: '陈丹青',
    role: 'master',
    avatar: '👨‍🎨',
    expertise: ['composition', 'creativity', 'emotion'],
    biasTendency: 'moderate'
  },
  {
    id: 'reviewer_wang',
    name: '王光影',
    role: 'senior',
    avatar: '📸',
    expertise: ['lighting', 'detail'],
    biasTendency: 'strict'
  },
  {
    id: 'reviewer_li',
    name: '李色彩',
    role: 'senior',
    avatar: '🎨',
    expertise: ['color', 'emotion'],
    biasTendency: 'lenient'
  },
  {
    id: 'reviewer_zhang',
    name: '张新锐',
    role: 'junior',
    avatar: '🧑‍💻',
    expertise: ['creativity', 'composition'],
    biasTendency: 'lenient'
  },
  {
    id: 'reviewer_ai',
    name: '暗房AI助手',
    role: 'automated',
    avatar: '🤖',
    expertise: ['composition', 'lighting', 'color', 'detail', 'creativity', 'emotion'],
    biasTendency: 'moderate'
  }
];

const POSITIVE_KEYWORDS = ['出色', '优秀', '精湛', '完美', '精彩', '到位', '讲究', '独特', '新颖', '生动', '强烈', '细腻', '自然', '和谐'];
const NEGATIVE_KEYWORDS = ['不足', '欠缺', '不够', '偏差', '问题', '缺陷', '欠缺', '勉强', '一般', '普通', '平淡', '缺失', '失调'];
const SUGGESTION_KEYWORDS = ['可以', '建议', '尝试', '或许', '如果', '不妨', '考虑', '进一步'];

const BIAS_MODIFIER: Record<string, number> = {
  strict: -5,
  moderate: 0,
  lenient: 5
};

const GRADE_THRESHOLDS = [
  { grade: 'S', min: 90 },
  { grade: 'A', min: 80 },
  { grade: 'B', min: 70 },
  { grade: 'C', min: 60 },
  { grade: 'D', min: 0 }
];

export function scoreToGrade(score: number): 'S' | 'A' | 'B' | 'C' | 'D' {
  for (const threshold of GRADE_THRESHOLDS) {
    if (score >= threshold.min) return threshold.grade as 'S' | 'A' | 'B' | 'C' | 'D';
  }
  return 'D';
}

export function calculateWeightedScore(scores: ReviewScore[], dimensions: ReviewDimension[]): number {
  let totalWeight = 0;
  let weightedSum = 0;

  scores.forEach(s => {
    const dimension = dimensions.find(d => d.id === s.dimensionId);
    const weight = dimension?.weight || (1 / dimensions.length);
    weightedSum += s.score * weight;
    totalWeight += weight;
  });

  return totalWeight > 0 ? Math.round(weightedSum / totalWeight * 10) / 10 : 0;
}

export function createInitialReviewSystemState(): ReviewSystemState {
  return {
    submissions: [],
    contests: generateSampleContests(),
    reviewers: [...DEFAULT_REVIEWERS],
    disputes: [],
    activeContestId: null,
    selectedSubmissionId: null,
    activeTab: 'submit',
    leaderboardFilter: {
      contestId: null,
      sortBy: 'score_desc',
      gradeFilter: [],
      subjectFilter: [],
      filmFilter: [],
      includeDisputed: false
    }
  };
}

function generateSampleContests(): ContestDefinition[] {
  const now = Date.now();
  const week = 7 * 24 * 60 * 60 * 1000;

  return [
    {
      id: 'contest_portrait_001',
      title: '人像光影挑战赛',
      subtitle: '第一季',
      description: '探索人像摄影中的光影艺术，展现人物情感与气质。',
      icon: '👤',
      theme: 'portrait',
      startDate: now - week,
      endDate: now + week * 2,
      reviewStartDate: now + week * 2,
      reviewEndDate: now + week * 3,
      dimensions: DEFAULT_REVIEW_DIMENSIONS,
      allowedSubjectIds: PHOTO_SUBJECTS.filter(s => s.sceneType === 'portrait').map(s => s.id),
      maxSubmissionsPerUser: 3,
      minReviewsPerSubmission: 3,
      status: 'active',
      prizes: [
        { rank: 1, title: '金奖', description: '人像光影大师', points: 1000, badge: 'gold_portrait', titleReward: '人像光影大师' },
        { rank: 2, title: '银奖', description: '优秀光影作品', points: 600, badge: 'silver_portrait' },
        { rank: 3, title: '铜奖', description: '潜力作品', points: 300, badge: 'bronze_portrait' }
      ]
    },
    {
      id: 'contest_landscape_001',
      title: '风光意境大赛',
      subtitle: '春季赛',
      description: '用镜头捕捉自然之美，展现风光摄影的独特韵味。',
      icon: '🏔️',
      theme: 'landscape',
      startDate: now - week * 2,
      endDate: now - day,
      reviewStartDate: now - day,
      reviewEndDate: now + week,
      dimensions: DEFAULT_REVIEW_DIMENSIONS,
      allowedSubjectIds: PHOTO_SUBJECTS.filter(s => s.sceneType === 'landscape').map(s => s.id),
      maxSubmissionsPerUser: 5,
      minReviewsPerSubmission: 3,
      status: 'reviewing',
      prizes: [
        { rank: 1, title: '最佳风光', description: '风光摄影金奖', points: 1200, badge: 'landscape_master', titleReward: '风光诗人' },
        { rank: 2, title: '优秀奖', description: '出色风光作品', points: 700 },
        { rank: 3, title: '入围奖', description: '优秀作品', points: 400 }
      ]
    }
  ];
}

const day = 24 * 60 * 60 * 1000;

export function submitWork(
  state: ReviewSystemState,
  photo: ProcessedPhoto,
  title: string,
  description: string,
  tags: string[],
  contestId?: string,
  submitterName: string = '我'
): { state: ReviewSystemState; submission: ReviewSubmission } {
  const submission: ReviewSubmission = {
    id: generateId(),
    photoId: photo.id,
    photoDataUrl: photo.imageDataUrl,
    subjectId: photo.subjectId,
    filmId: photo.filmId,
    submitterId: 'current_user',
    submitterName,
    title,
    description,
    tags: [...tags],
    status: 'submitted',
    submittedAt: Date.now(),
    reviews: [],
    finalScore: null,
    finalGrade: null,
    contestId
  };

  const newState: ReviewSystemState = {
    ...state,
    submissions: [submission, ...state.submissions]
  };

  return { state: newState, submission };
}

export function generateAutomatedReview(
  submission: ReviewSubmission,
  photo: ProcessedPhoto,
  dimensions: ReviewDimension[],
  reviewer: Reviewer
): Review {
  const scores: ReviewScore[] = dimensions.map(dim => {
    const baseScore = deriveDimensionScore(dim.id, photo);
    const biasModifier = BIAS_MODIFIER[reviewer.biasTendency] || 0;
    const expertiseBoost = reviewer.expertise.includes(dim.id) ? 2 : 0;
    const randomVariation = (Math.random() - 0.5) * 8;
    const finalScore = clamp(baseScore + biasModifier + expertiseBoost + randomVariation, 0, 100);

    return {
      dimensionId: dim.id,
      score: Math.round(finalScore * 10) / 10,
      weight: dim.weight,
      comment: generateDimensionComment(dim.id, finalScore, reviewer)
    };
  });

  const weightedScore = calculateWeightedScore(scores, dimensions);

  return {
    id: generateId(),
    submissionId: submission.id,
    reviewerId: reviewer.id,
    scores,
    overallComment: generateOverallComment(weightedScore, reviewer),
    weightedScore,
    recommendation: getRecommendation(weightedScore),
    reviewedAt: Date.now(),
    isAutomated: reviewer.role === 'automated'
  };
}

function deriveDimensionScore(dimensionId: ReviewDimensionId, photo: ProcessedPhoto): number {
  const details = photo.details;
  switch (dimensionId) {
    case 'composition':
      return details.overall * 0.95 + Math.random() * 5;
    case 'lighting':
      return details.exposure * 0.5 + details.contrast * 0.5;
    case 'color':
      return details.color * 0.9 + Math.random() * 5;
    case 'detail':
      return details.detail * 0.9 + Math.random() * 5;
    case 'creativity':
      return 60 + Math.random() * 35;
    case 'emotion':
      return 55 + Math.random() * 40;
    default:
      return 70;
  }
}

function generateDimensionComment(dimensionId: ReviewDimensionId, score: number, reviewer: Reviewer): string {
  const dimensionName: Record<ReviewDimensionId, string> = {
    composition: '构图',
    lighting: '光影',
    color: '色彩',
    detail: '细节',
    creativity: '创意',
    emotion: '情感'
  };

  if (score >= 85) {
    return `${dimensionName[dimensionId]}表现出色，展现了精湛的技术水平。`;
  } else if (score >= 70) {
    return `${dimensionName[dimensionId]}表现良好，有一定的水准。`;
  } else if (score >= 55) {
    return `${dimensionName[dimensionId]}表现中等，仍有提升空间。`;
  } else {
    return `${dimensionName[dimensionId]}方面有待加强，建议多加练习。`;
  }
}

function generateOverallComment(score: number, reviewer: Reviewer): string {
  if (score >= 90) {
    return `这是一件令人印象深刻的作品，技术与艺术兼备，展现了极高的专业水准。强烈推荐！`;
  } else if (score >= 80) {
    return `整体质量优秀，在多个维度都有出色表现，是一件值得肯定的作品。`;
  } else if (score >= 70) {
    return `作品整体表现良好，有自己的特色，部分细节可以进一步打磨。`;
  } else if (score >= 60) {
    return `作品达到了基本要求，但在技术或艺术表现上还有明显的提升空间。`;
  } else {
    return `作品需要更多的打磨和练习，建议从基础技术开始逐步提升。`;
  }
}

function getRecommendation(score: number): Review['recommendation'] {
  if (score >= 88) return 'excellent';
  if (score >= 72) return 'accept';
  if (score >= 58) return 'revise';
  return 'reject';
}

export function addReview(
  state: ReviewSystemState,
  submissionId: string,
  review: Review
): ReviewSystemState {
  const submissions = state.submissions.map(s => {
    if (s.id !== submissionId) return s;

    const newReviews = [...s.reviews, review];
    const allScores = newReviews.map(r => r.weightedScore);
    const avgScore = allScores.length > 0
      ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length * 10) / 10
      : null;

    const contest = state.contests.find(c => c.id === s.contestId);
    const minReviews = contest?.minReviewsPerSubmission || 3;

    let newStatus: SubmissionStatus = s.status;
    if (s.status === 'submitted' || s.status === 'reviewing') {
      newStatus = newReviews.length >= minReviews ? 'reviewed' : 'reviewing';
    }

    return {
      ...s,
      reviews: newReviews,
      finalScore: avgScore,
      finalGrade: avgScore !== null ? scoreToGrade(avgScore) : null,
      status: newStatus
    };
  });

  return { ...state, submissions };
}

export function summarizeComments(
  submission: ReviewSubmission,
  dimensions: ReviewDimension[]
): ReviewCommentSummary {
  const allComments: string[] = [];
  submission.reviews.forEach(r => {
    r.scores.forEach(s => allComments.push(s.comment));
    allComments.push(r.overallComment);
  });

  const positivePoints: string[] = [];
  const negativePoints: string[] = [];
  const suggestions: string[] = [];

  allComments.forEach(comment => {
    const hasPositive = POSITIVE_KEYWORDS.some(kw => comment.includes(kw));
    const hasNegative = NEGATIVE_KEYWORDS.some(kw => comment.includes(kw));
    const hasSuggestion = SUGGESTION_KEYWORDS.some(kw => comment.includes(kw));

    if (hasPositive && !hasNegative) {
      positivePoints.push(comment);
    } else if (hasNegative && !hasPositive) {
      negativePoints.push(comment);
    } else if (hasSuggestion) {
      suggestions.push(comment);
    }
  });

  const dimensionAverages = dimensions.map(dim => {
    const dimScores = submission.reviews
      .flatMap(r => r.scores)
      .filter(s => s.dimensionId === dim.id)
      .map(s => s.score);

    const avg = dimScores.length > 0
      ? dimScores.reduce((a, b) => a + b, 0) / dimScores.length
      : 0;
    const variance = dimScores.length > 0
      ? dimScores.reduce((sum, s) => sum + Math.pow(s - avg, 2), 0) / dimScores.length
      : 0;

    return {
      dimensionId: dim.id,
      dimensionName: dim.name,
      averageScore: Math.round(avg * 10) / 10,
      standardDeviation: Math.round(Math.sqrt(variance) * 10) / 10,
      minScore: dimScores.length > 0 ? Math.min(...dimScores) : 0,
      maxScore: dimScores.length > 0 ? Math.max(...dimScores) : 0
    };
  });

  const allScores = submission.reviews.map(r => r.weightedScore);
  const avgScore = allScores.length > 0 ? allScores.reduce((a, b) => a + b, 0) / allScores.length : 0;
  const scoreVariance = allScores.length > 0
    ? allScores.reduce((sum, s) => sum + Math.pow(s - avgScore, 2), 0) / allScores.length
    : 0;
  const stdDev = Math.sqrt(scoreVariance);
  const reviewerAgreement = allScores.length > 1 ? clamp(100 - stdDev * 3, 0, 100) : 100;

  const themeCounts: Record<string, { count: number; sentiment: 'positive' | 'negative' | 'neutral' }> = {};
  submission.reviews.forEach(review => {
    review.scores.forEach(score => {
      const dim = dimensions.find(d => d.id === score.dimensionId);
      if (!dim) return;
      const sentiment = score.score >= 70 ? 'positive' : score.score >= 55 ? 'neutral' : 'negative';
      if (!themeCounts[dim.name]) {
        themeCounts[dim.name] = { count: 0, sentiment };
      }
      themeCounts[dim.name].count++;
    });
  });

  const commonThemes = Object.entries(themeCounts).map(([theme, data]) => ({
    theme,
    count: data.count,
    sentiment: data.sentiment
  }));

  return {
    positivePoints: [...new Set(positivePoints)],
    negativePoints: [...new Set(negativePoints)],
    suggestions: [...new Set(suggestions)],
    commonThemes,
    dimensionAverages,
    reviewerAgreement: Math.round(reviewerAgreement),
    totalReviewers: submission.reviews.length
  };
}

export function submitDispute(
  state: ReviewSystemState,
  submissionId: string,
  reason: string
): { state: ReviewSystemState; dispute: DisputeRecord } {
  const submissions = state.submissions.map(s => {
    if (s.id !== submissionId) return s;
    return {
      ...s,
      status: 'disputed' as SubmissionStatus,
      disputeReason: reason,
      disputeAt: Date.now()
    };
  });

  const submission = state.submissions.find(s => s.id === submissionId);
  const dispute: DisputeRecord = {
    submissionId,
    disputeReason: reason,
    disputedAt: Date.now(),
    originalScore: submission?.finalScore ?? null
  };

  return {
    state: {
      ...state,
      submissions,
      disputes: [dispute, ...state.disputes]
    },
    dispute
  };
}

export function resolveDispute(
  state: ReviewSystemState,
  submissionId: string,
  resolution: 'upheld' | 'rejected' | 'modified',
  note: string,
  resolvedBy: string = 'admin',
  newScore?: number
): ReviewSystemState {
  const disputes = state.disputes.map(d => {
    if (d.submissionId !== submissionId) return d;
    return {
      ...d,
      resolution,
      resolutionNote: note,
      resolvedAt: Date.now(),
      resolvedBy,
      newScore: resolution === 'modified' ? newScore : undefined
    };
  });

  const submissions = state.submissions.map(s => {
    if (s.id !== submissionId) return s;

    let finalScore = s.finalScore;
    let finalGrade = s.finalGrade;
    let status: SubmissionStatus = s.status;

    if (resolution === 'upheld') {
      status = 're_reviewing';
    } else if (resolution === 'rejected') {
      status = 'finalized';
    } else if (resolution === 'modified' && newScore !== undefined) {
      finalScore = newScore;
      finalGrade = scoreToGrade(newScore);
      status = 'finalized';
    }

    return {
      ...s,
      finalScore,
      finalGrade,
      status,
      finalizedAt: status === 'finalized' ? Date.now() : s.finalizedAt
    };
  });

  return { ...state, disputes, submissions };
}

export function generateLeaderboard(
  state: ReviewSystemState,
  filter: LeaderboardFilter
): ReviewLeaderboardEntry[] {
  let entries = state.submissions.filter(s => s.finalScore !== null);

  if (filter.contestId) {
    entries = entries.filter(s => s.contestId === filter.contestId);
  }

  if (filter.gradeFilter.length > 0) {
    entries = entries.filter(s => s.finalGrade && filter.gradeFilter.includes(s.finalGrade));
  }

  if (filter.subjectFilter.length > 0) {
    entries = entries.filter(s => filter.subjectFilter.includes(s.subjectId));
  }

  if (filter.filmFilter.length > 0) {
    entries = entries.filter(s => filter.filmFilter.includes(s.filmId));
  }

  if (!filter.includeDisputed) {
    entries = entries.filter(s => s.status !== 'disputed');
  }

  let sorted = [...entries];
  switch (filter.sortBy) {
    case 'score_desc':
      sorted.sort((a, b) => (b.finalScore || 0) - (a.finalScore || 0));
      break;
    case 'score_asc':
      sorted.sort((a, b) => (a.finalScore || 0) - (b.finalScore || 0));
      break;
    case 'date_desc':
      sorted.sort((a, b) => b.submittedAt - a.submittedAt);
      break;
    case 'date_asc':
      sorted.sort((a, b) => a.submittedAt - b.submittedAt);
      break;
    case 'reviews_desc':
      sorted.sort((a, b) => b.reviews.length - a.reviews.length);
      break;
  }

  return sorted.map((s, idx) => {
    const subject = PHOTO_SUBJECTS.find(p => p.id === s.subjectId);
    const film = FILM_STOCKS.find(f => f.id === s.filmId);

    return {
      rank: idx + 1,
      submissionId: s.id,
      photoDataUrl: s.photoDataUrl,
      title: s.title,
      submitterName: s.submitterName,
      finalScore: s.finalScore || 0,
      finalGrade: s.finalGrade || '-',
      reviewCount: s.reviews.length,
      submissionTime: s.submittedAt,
      subjectName: subject?.name || '未知题材',
      filmName: film?.name || '未知胶片',
      isDisputed: s.status === 'disputed'
    };
  });
}

export function canSubmitToContest(
  state: ReviewSystemState,
  contestId: string,
  submitterId: string = 'current_user'
): { allowed: boolean; reason?: string } {
  const contest = state.contests.find(c => c.id === contestId);
  if (!contest) {
    return { allowed: false, reason: '竞赛不存在' };
  }

  const now = Date.now();
  if (now < contest.startDate) {
    return { allowed: false, reason: '竞赛尚未开始' };
  }
  if (now > contest.endDate) {
    return { allowed: false, reason: '竞赛已结束' };
  }

  const userSubmissions = state.submissions.filter(
    s => s.contestId === contestId && s.submitterId === submitterId
  );

  if (userSubmissions.length >= contest.maxSubmissionsPerUser) {
    return {
      allowed: false,
      reason: `已达提交上限（${contest.maxSubmissionsPerUser}件）`
    };
  }

  return { allowed: true };
}

export function checkPhotoMeetsContestRequirements(
  photo: ProcessedPhoto,
  contest: ContestDefinition
): { allowed: boolean; reasons: string[] } {
  const reasons: string[] = [];

  if (contest.allowedSubjectIds && contest.allowedSubjectIds.length > 0) {
    if (!contest.allowedSubjectIds.includes(photo.subjectId)) {
      const subjectNames = contest.allowedSubjectIds
        .map(id => PHOTO_SUBJECTS.find(s => s.id === id)?.name)
        .filter(Boolean);
      reasons.push(`题材不符合要求，限定题材：${subjectNames.join('、')}`);
    }
  }

  if (contest.allowedFilmIds && contest.allowedFilmIds.length > 0) {
    if (!contest.allowedFilmIds.includes(photo.filmId)) {
      const filmNames = contest.allowedFilmIds
        .map(id => FILM_STOCKS.find(f => f.id === id)?.name)
        .filter(Boolean);
      reasons.push(`胶片不符合要求，限定胶片：${filmNames.join('、')}`);
    }
  }

  if (contest.requireFilmColor) {
    const film = FILM_STOCKS.find(f => f.id === photo.filmId);
    if (film?.color !== contest.requireFilmColor) {
      reasons.push(`要求使用${contest.requireFilmColor === 'bw' ? '黑白' : '彩色'}胶片`);
    }
  }

  return { allowed: reasons.length === 0, reasons };
}

export function finalizeSubmission(
  state: ReviewSystemState,
  submissionId: string
): ReviewSystemState {
  const submissions = state.submissions.map(s => {
    if (s.id !== submissionId) return s;
    if (s.reviews.length === 0 || s.finalScore === null) return s;

    return {
      ...s,
      status: 'finalized' as SubmissionStatus,
      finalizedAt: Date.now()
    };
  });

  return { ...state, submissions };
}

export function updateLeaderboardRanking(
  state: ReviewSystemState,
  contestId?: string
): ReviewSystemState {
  const filter: LeaderboardFilter = {
    contestId: contestId || null,
    sortBy: 'score_desc',
    gradeFilter: [],
    subjectFilter: [],
    filmFilter: [],
    includeDisputed: false
  };

  const leaderboard = generateLeaderboard(state, filter);
  const rankingMap = new Map(leaderboard.map(e => [e.submissionId, e.rank]));

  const submissions = state.submissions.map(s => {
    if (!contestId || s.contestId === contestId) {
      const rank = rankingMap.get(s.id);
      if (rank !== undefined) {
        return { ...s, ranking: rank };
      }
    }
    return s;
  });

  return { ...state, submissions };
}

export function getContestById(
  state: ReviewSystemState,
  contestId: string
): ContestDefinition | undefined {
  return state.contests.find(c => c.id === contestId);
}

export function getActiveContests(state: ReviewSystemState): ContestDefinition[] {
  return state.contests.filter(c => c.status === 'active' || c.status === 'reviewing');
}

export function getMySubmissions(
  state: ReviewSystemState,
  submitterId: string = 'current_user'
): ReviewSubmission[] {
  return state.submissions.filter(s => s.submitterId === submitterId);
}

export function getPendingReviews(
  state: ReviewSystemState,
  reviewerId: string
): ReviewSubmission[] {
  return state.submissions.filter(s => {
    if (s.status !== 'submitted' && s.status !== 'reviewing') return false;
    const alreadyReviewed = s.reviews.some(r => r.reviewerId === reviewerId);
    return !alreadyReviewed;
  });
}

export { DEFAULT_REVIEW_DIMENSIONS as REVIEW_DIMENSIONS, DEFAULT_REVIEWERS as REVIEWERS };
