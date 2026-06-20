import type {
  ChallengeState,
  ChallengeDefinition,
  ChallengeSeason,
  ChallengeTeam,
  ChallengeRegistration,
  ChallengeSubmission,
  ChallengeTheme,
  ChallengeTab,
  ChallengeStatus,
  ChallengeFilter,
  ChallengeParticipationResult,
  TeamRole,
  ChallengeLeaderboardEntry,
  ChallengeReview,
  ReviewResult,
  DevParams,
  ProcessedPhoto,
  PhotoSubject,
  FilmStock
} from '../types/game';
import { PHOTO_SUBJECTS, FILM_STOCKS } from '../data/gameData';
import { generateId, clamp } from './math';
import { REVIEW_DIMENSIONS } from './reviewSystem';

const AVATAR_COLORS = [
  '#e74c3c', '#f39c12', '#27ae60', '#3498db',
  '#9b59b6', '#1abc9c', '#e67e22', '#34495e'
];

export function createInitialChallengeSystemState(): ChallengeState {
  const now = Date.now();
  const defaultChallenges = createDefaultChallenges();
  const defaultSeasons = createDefaultSeasons(defaultChallenges);
  const mockSubmissions = createMockSubmissions(defaultChallenges);
  const mockTeams = createMockTeams(defaultChallenges);

  return {
    challenges: defaultChallenges,
    seasons: defaultSeasons,
    teams: mockTeams,
    registrations: [],
    submissions: mockSubmissions,
    activeTab: 'browse',
    selectedChallengeId: null,
    selectedTeamId: null,
    selectedSubmissionId: null,
    currentUserId: 'user_' + now,
    currentUserName: '摄影师',
    filter: {
      statuses: [],
      searchKeyword: '',
      sortBy: 'start_date_desc',
      seasonId: null
    },
    leaderboardFilter: {
      seasonId: null,
      sortBy: 'total_score'
    },
    developTimer: {
      challengeId: null,
      startTime: null,
      timeLimitMs: 0,
      remainingMs: 0,
      isRunning: false
    }
  };
}

function createDefaultSeasons(challenges: ChallengeDefinition[]): ChallengeSeason[] {
  const now = Date.now();
  return [
    {
      id: 'season_2026_summer',
      name: '2026夏季联赛',
      description: '夏日光影挑战赛，捕捉盛夏的热情与活力',
      startDate: now - 7 * 24 * 60 * 60 * 1000,
      endDate: now + 90 * 24 * 60 * 60 * 1000,
      challengeIds: challenges.map(c => c.id),
      status: 'active',
      totalPoints: {},
      badges: []
    },
    {
      id: 'season_2026_autumn',
      name: '2026秋季联赛',
      description: '金秋摄影季，记录丰收的色彩与氛围',
      startDate: now + 60 * 24 * 60 * 60 * 1000,
      endDate: now + 150 * 24 * 60 * 60 * 1000,
      challengeIds: [],
      status: 'upcoming',
      totalPoints: {},
      badges: []
    }
  ];
}

function createDefaultChallenges(): ChallengeDefinition[] {
  const now = Date.now();
  const availableSubjects = PHOTO_SUBJECTS.slice(0, 6);

  return [
    {
      id: 'challenge_portrait_week',
      title: '人像周挑战赛',
      subtitle: 'PORTRAIT WEEK CHALLENGE',
      description: '专注人像摄影，探索光影与情感的表达',
      icon: '👤',
      seasonId: 'season_2026_summer',
      themes: [
        createChallengeTheme(availableSubjects[0], 30, '自然光人像'),
        createChallengeTheme(availableSubjects[1], 25, '影棚人像')
      ],
      currentThemeIndex: 0,
      registrationStart: now - 2 * 24 * 60 * 60 * 1000,
      registrationEnd: now + 5 * 24 * 60 * 60 * 1000,
      developStart: now + 5 * 24 * 60 * 60 * 1000,
      developEnd: now + 12 * 24 * 60 * 60 * 1000,
      reviewStart: now + 12 * 24 * 60 * 60 * 1000,
      reviewEnd: now + 19 * 24 * 60 * 60 * 1000,
      maxParticipants: 100,
      maxTeamSize: 3,
      allowSolo: true,
      allowTeams: true,
      minReviewsPerSubmission: 3,
      status: 'registration',
      prizes: [
        { rank: 1, title: '金奖', description: '最佳人像摄影师', points: 1000, badge: '🏆', titleReward: '人像大师' },
        { rank: 2, title: '银奖', description: '优秀人像摄影师', points: 600, badge: '🥈', titleReward: '人像专家' },
        { rank: 3, title: '铜奖', description: '潜力人像摄影师', points: 300, badge: '🥉', titleReward: '人像新秀' }
      ],
      participationPoints: 50,
      rules: [
        '必须使用指定题材进行创作',
        '限时30分钟内完成冲洗',
        '可使用黑白或彩色胶片',
        '每位参赛者限提交3幅作品',
        '禁止使用预设参数'
      ]
    },
    {
      id: 'challenge_landscape_master',
      title: '风光大师赛',
      subtitle: 'LANDSCAPE MASTER',
      description: '捕捉大自然的壮丽与诗意',
      icon: '🏔️',
      seasonId: 'season_2026_summer',
      themes: [
        createChallengeTheme(availableSubjects[2], 45, '山川湖海'),
        createChallengeTheme(availableSubjects[3], 40, '城市风光')
      ],
      currentThemeIndex: 0,
      registrationStart: now - 5 * 24 * 60 * 60 * 1000,
      registrationEnd: now,
      developStart: now,
      developEnd: now + 7 * 24 * 60 * 60 * 1000,
      reviewStart: now + 7 * 24 * 60 * 60 * 1000,
      reviewEnd: now + 14 * 24 * 60 * 60 * 1000,
      maxParticipants: 80,
      maxTeamSize: 2,
      allowSolo: true,
      allowTeams: true,
      minReviewsPerSubmission: 3,
      status: 'developing',
      prizes: [
        { rank: 1, title: '风光大师', description: '年度风光摄影师', points: 1500, badge: '🏅', titleReward: '风光大师' },
        { rank: 2, title: '风光达人', description: '优秀风光摄影师', points: 900, badge: '🎖️', titleReward: '风光专家' },
        { rank: 3, title: '风光新锐', description: '潜力风光摄影师', points: 450, badge: '⭐', titleReward: '风光新秀' }
      ],
      participationPoints: 80,
      rules: [
        '必须使用指定题材进行创作',
        '限时45分钟内完成冲洗',
        '推荐使用细颗粒胶片',
        '每位参赛者限提交2幅作品',
        '鼓励使用小光圈长曝光'
      ]
    },
    {
      id: 'challenge_street_photography',
      title: '街头摄影周',
      subtitle: 'STREET PHOTOGRAPHY WEEK',
      description: '用镜头记录城市的脉搏与故事',
      icon: '🏙️',
      seasonId: 'season_2026_summer',
      themes: [
        createChallengeTheme(availableSubjects[4], 20, '街头瞬间'),
        createChallengeTheme(availableSubjects[5], 35, '夜街光影')
      ],
      currentThemeIndex: 0,
      registrationStart: now + 10 * 24 * 60 * 60 * 1000,
      registrationEnd: now + 20 * 24 * 60 * 60 * 1000,
      developStart: now + 20 * 24 * 60 * 60 * 1000,
      developEnd: now + 27 * 24 * 60 * 60 * 1000,
      reviewStart: now + 27 * 24 * 60 * 60 * 1000,
      reviewEnd: now + 34 * 24 * 60 * 60 * 1000,
      maxParticipants: 120,
      maxTeamSize: 4,
      allowSolo: true,
      allowTeams: true,
      minReviewsPerSubmission: 3,
      status: 'upcoming',
      prizes: [
        { rank: 1, title: '街头之王', description: '最佳街头摄影师', points: 1200, badge: '👑', titleReward: '街头大师' },
        { rank: 2, title: '街头捕手', description: '优秀街头摄影师', points: 720, badge: '🎯', titleReward: '街头专家' },
        { rank: 3, title: '街头观察者', description: '潜力街头摄影师', points: 360, badge: '👁️', titleReward: '街头新秀' }
      ],
      participationPoints: 60,
      rules: [
        '必须使用指定题材进行创作',
        '限时20分钟内完成冲洗',
        '推荐使用高感光度胶片',
        '每位参赛者限提交5幅作品',
        '鼓励捕捉决定性瞬间'
      ]
    }
  ];
}

function createChallengeTheme(subject: PhotoSubject, timeLimit: number, name: string): ChallengeTheme {
  return {
    id: 'theme_' + subject.id,
    name,
    description: `以「${subject.name}」为主题进行创作`,
    subjectId: subject.id,
    allowedFilmIds: FILM_STOCKS.map(f => f.id),
    difficulty: subject.difficulty,
    timeLimitMinutes: timeLimit,
    paramRestrictions: undefined
  };
}

export function registerForChallenge(
  state: ChallengeState,
  challengeId: string,
  teamId: string | null = null
): ChallengeParticipationResult {
  const challenge = state.challenges.find(c => c.id === challengeId);
  if (!challenge) {
    return { success: false, message: '挑战赛不存在' };
  }

  if (challenge.status !== 'registration') {
    return { success: false, message: '该挑战赛不在报名阶段' };
  }

  const existingRegistration = state.registrations.find(
    r => r.challengeId === challengeId && r.userId === state.currentUserId
  );
  if (existingRegistration) {
    return { success: false, message: '您已报名该挑战赛' };
  }

  const participantCount = state.registrations.filter(
    r => r.challengeId === challengeId && r.status === 'registered'
  ).length;
  if (participantCount >= challenge.maxParticipants) {
    return { success: false, message: '参赛人数已达上限' };
  }

  const registration: ChallengeRegistration = {
    id: 'reg_' + generateId(),
    challengeId,
    userId: state.currentUserId,
    userName: state.currentUserName,
    teamId,
    registeredAt: Date.now(),
    status: 'registered'
  };

  return {
    success: true,
    message: '报名成功',
    registrationId: registration.id
  };
}

export function createTeam(
  state: ChallengeState,
  challengeId: string,
  teamName: string,
  slogan?: string
): { success: boolean; message: string; team?: ChallengeTeam } {
  const challenge = state.challenges.find(c => c.id === challengeId);
  if (!challenge) {
    return { success: false, message: '挑战赛不存在' };
  }

  if (!challenge.allowTeams) {
    return { success: false, message: '该挑战赛不允许组队' };
  }

  const existingTeam = state.teams.find(
    t => t.challengeId === challengeId && t.name === teamName
  );
  if (existingTeam) {
    return { success: false, message: '队伍名称已被使用' };
  }

  const userExistingTeam = state.teams.find(
    t => t.challengeId === challengeId &&
      t.members.some(m => m.userId === state.currentUserId)
  );
  if (userExistingTeam) {
    return { success: false, message: '您已在该挑战赛中创建或加入了队伍' };
  }

  const team: ChallengeTeam = {
    id: 'team_' + generateId(),
    challengeId,
    name: teamName,
    slogan,
    leaderId: state.currentUserId,
    leaderName: state.currentUserName,
    members: [{
      userId: state.currentUserId,
      userName: state.currentUserName,
      role: 'leader',
      joinedAt: Date.now()
    }],
    maxMembers: challenge.maxTeamSize,
    registeredAt: Date.now(),
    isLocked: false,
    avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]
  };

  return { success: true, message: '队伍创建成功', team };
}

export function joinTeam(
  state: ChallengeState,
  teamId: string
): ChallengeParticipationResult {
  const team = state.teams.find(t => t.id === teamId);
  if (!team) {
    return { success: false, message: '队伍不存在' };
  }

  if (team.isLocked) {
    return { success: false, message: '队伍已锁定，无法加入' };
  }

  if (team.members.length >= team.maxMembers) {
    return { success: false, message: '队伍已满' };
  }

  const isMember = team.members.some(m => m.userId === state.currentUserId);
  if (isMember) {
    return { success: false, message: '您已是该队伍成员' };
  }

  const challenge = state.challenges.find(c => c.id === team.challengeId);
  if (challenge && challenge.status !== 'registration') {
    return { success: false, message: '报名阶段已结束，无法加入队伍' };
  }

  const userExistingTeam = state.teams.find(
    t => t.challengeId === team.challengeId &&
      t.members.some(m => m.userId === state.currentUserId)
  );
  if (userExistingTeam) {
    return { success: false, message: '您已在该挑战赛中加入了其他队伍' };
  }

  return {
    success: true,
    message: '加入队伍成功',
    teamId: team.id
  };
}

export function leaveTeam(
  state: ChallengeState,
  teamId: string
): { success: boolean; message: string } {
  const team = state.teams.find(t => t.id === teamId);
  if (!team) {
    return { success: false, message: '队伍不存在' };
  }

  if (team.leaderId === state.currentUserId) {
    return { success: false, message: '队长不能离开队伍，请先解散队伍' };
  }

  const challenge = state.challenges.find(c => c.id === team.challengeId);
  if (challenge && challenge.status !== 'registration') {
    return { success: false, message: '比赛进行中，无法离开队伍' };
  }

  return { success: true, message: '已离开队伍' };
}

export function lockTeam(state: ChallengeState, teamId: string): { success: boolean; message: string } {
  const team = state.teams.find(t => t.id === teamId);
  if (!team) {
    return { success: false, message: '队伍不存在' };
  }

  if (team.leaderId !== state.currentUserId) {
    return { success: false, message: '只有队长可以锁定队伍' };
  }

  return { success: true, message: '队伍已锁定' };
}

export function getAvailableTeams(state: ChallengeState, challengeId: string): ChallengeTeam[] {
  return state.teams.filter(
    t => t.challengeId === challengeId &&
      !t.isLocked &&
      t.members.length < t.maxMembers
  );
}

export function getUserTeam(state: ChallengeState, challengeId: string): ChallengeTeam | null {
  return state.teams.find(
    t => t.challengeId === challengeId &&
      t.members.some(m => m.userId === state.currentUserId)
  ) || null;
}

export function isUserRegistered(state: ChallengeState, challengeId: string): boolean {
  return state.registrations.some(
    r => r.challengeId === challengeId &&
      r.userId === state.currentUserId &&
      r.status === 'registered'
  );
}

export function getCurrentTheme(state: ChallengeState, challengeId: string): ChallengeTheme | null {
  const challenge = state.challenges.find(c => c.id === challengeId);
  if (!challenge || !challenge.themes.length) return null;
  return challenge.themes[challenge.currentThemeIndex] || null;
}

export function validateParamsForTheme(
  params: DevParams,
  theme: ChallengeTheme
): { valid: boolean; violations: string[] } {
  if (!theme.paramRestrictions) {
    return { valid: true, violations: [] };
  }

  const violations: string[] = [];
  const paramLabels: Record<string, string> = {
    exposure: '曝光',
    developmentTime: '显影时间',
    temperature: '温度',
    agitation: '搅动',
    contrast: '反差',
    saturation: '饱和度',
    dilution: '稀释度'
  };

  Object.entries(theme.paramRestrictions).forEach(([key, restriction]) => {
    if (!restriction) return;
    const value = params[key as keyof DevParams];
    if (value < restriction.min || value > restriction.max) {
      violations.push(
        `${paramLabels[key] || key} 必须在 ${restriction.min} - ${restriction.max} 之间`
      );
    }
  });

  return { valid: violations.length === 0, violations };
}

export function validateFilmForTheme(
  filmId: string,
  theme: ChallengeTheme
): { valid: boolean; message: string } {
  const film = FILM_STOCKS.find(f => f.id === filmId);
  if (!film) {
    return { valid: false, message: '无效的胶片' };
  }

  if (!theme.allowedFilmIds.includes(filmId)) {
    return { valid: false, message: '该胶片不允许在此主题中使用' };
  }

  if (theme.requireFilmColor && film.color !== theme.requireFilmColor) {
    return {
      valid: false,
      message: theme.requireFilmColor === 'bw' ? '此主题仅允许使用黑白胶片' : '此主题仅允许使用彩色胶片'
    };
  }

  return { valid: true, message: '' };
}

export function startChallengeDevelopment(
  state: ChallengeState,
  challengeId: string
): { success: boolean; message: string; timeLimitMs: number } {
  const challenge = state.challenges.find(c => c.id === challengeId);
  if (!challenge) {
    return { success: false, message: '挑战赛不存在', timeLimitMs: 0 };
  }

  if (challenge.status !== 'developing') {
    return { success: false, message: '该挑战赛不在冲洗阶段', timeLimitMs: 0 };
  }

  if (!isUserRegistered(state, challengeId)) {
    return { success: false, message: '您未报名该挑战赛', timeLimitMs: 0 };
  }

  const theme = getCurrentTheme(state, challengeId);
  if (!theme) {
    return { success: false, message: '无可用主题', timeLimitMs: 0 };
  }

  const timeLimitMs = theme.timeLimitMinutes * 60 * 1000;

  return { success: true, message: '开始计时', timeLimitMs };
}

export function submitChallengeWork(
  state: ChallengeState,
  challengeId: string,
  photo: ProcessedPhoto,
  developDurationMs: number
): { success: boolean; message: string; submission?: ChallengeSubmission } {
  const challenge = state.challenges.find(c => c.id === challengeId);
  if (!challenge) {
    return { success: false, message: '挑战赛不存在' };
  }

  if (challenge.status !== 'developing') {
    return { success: false, message: '该挑战赛不在冲洗阶段' };
  }

  const theme = getCurrentTheme(state, challengeId);
  if (!theme) {
    return { success: false, message: '无可用主题' };
  }

  if (photo.subjectId !== theme.subjectId) {
    return { success: false, message: '题材与主题不符' };
  }

  const filmValidation = validateFilmForTheme(photo.filmId, theme);
  if (!filmValidation.valid) {
    return { success: false, message: filmValidation.message };
  }

  const paramValidation = validateParamsForTheme(photo.params, theme);
  if (!paramValidation.valid) {
    return { success: false, message: paramValidation.violations.join('；') };
  }

  const userSubmissions = state.submissions.filter(
    s => s.challengeId === challengeId && s.userId === state.currentUserId
  );
  if (userSubmissions.length >= 3) {
    return { success: false, message: '已达最大提交数量' };
  }

  if (developDurationMs > theme.timeLimitMinutes * 60 * 1000) {
    return { success: false, message: '超出时间限制' };
  }

  const team = getUserTeam(state, challengeId);
  const submission: ChallengeSubmission = {
    id: 'sub_' + generateId(),
    challengeId,
    userId: state.currentUserId,
    userName: state.currentUserName,
    teamId: team?.id || null,
    photoId: photo.id,
    photoDataUrl: photo.imageDataUrl,
    subjectId: photo.subjectId,
    filmId: photo.filmId,
    params: { ...photo.params },
    score: photo.score,
    details: photo.details,
    submittedAt: Date.now(),
    developDurationMs,
    reviewStatus: 'pending'
  };

  return { success: true, message: '提交成功', submission };
}

export function submitChallengeReview(
  state: ChallengeState,
  submissionId: string,
  scores: Record<string, number>,
  comment: string
): { success: boolean; message: string; review?: ChallengeReview } {
  const submission = state.submissions.find(s => s.id === submissionId);
  if (!submission) {
    return { success: false, message: '提交作品不存在' };
  }

  if (submission.userId === state.currentUserId) {
    return { success: false, message: '不能评审自己的作品' };
  }

  const challenge = state.challenges.find(c => c.id === submission.challengeId);
  if (!challenge || challenge.status !== 'reviewing') {
    return { success: false, message: '该挑战赛不在评审阶段' };
  }

  const dimensionScores = REVIEW_DIMENSIONS.map(dim => ({
    dimensionId: dim.id,
    score: clamp(scores[dim.id] ?? 50, 0, 100),
    comment: ''
  }));

  const weightedScore = dimensionScores.reduce((sum, ds) => {
    const dim = REVIEW_DIMENSIONS.find(d => d.id === ds.dimensionId);
    return sum + ds.score * (dim?.weight || 1);
  }, 0) / dimensionScores.length;

  const review: ChallengeReview = {
    id: 'review_' + generateId(),
    submissionId,
    reviewerId: state.currentUserId,
    reviewerName: state.currentUserName,
    score: weightedScore,
    comment,
    reviewedAt: Date.now(),
    dimensions: dimensionScores
  };

  return { success: true, message: '评审成功', review };
}

export function finalizeSubmissionScores(
  state: ChallengeState,
  challengeId: string
): ChallengeSubmission[] {
  const challenge = state.challenges.find(c => c.id === challengeId);
  if (!challenge) return [];

  const submissions = state.submissions.filter(s => s.challengeId === challengeId);
  
  return submissions.map(submission => {
    const autoScore = submission.score;
    const finalScore = Math.round(autoScore * 0.6 + (submission.reviewScore ?? autoScore) * 0.4);
    
    return {
      ...submission,
      finalScore,
      reviewStatus: 'accepted' as ReviewResult
    };
  }).sort((a, b) => (b.finalScore ?? 0) - (a.finalScore ?? 0))
    .map((s, idx) => ({ ...s, rank: idx + 1 }));
}

export function calculateLeaderboard(
  state: ChallengeState,
  seasonId: string | null = null,
  sortBy: 'total_score' | 'best_score' | 'avg_score' | 'submissions' = 'total_score'
): ChallengeLeaderboardEntry[] {
  let submissions = [...state.submissions];
  
  if (seasonId) {
    const seasonChallenges = state.seasons
      .find(s => s.id === seasonId)
      ?.challengeIds || [];
    submissions = submissions.filter(s => seasonChallenges.includes(s.challengeId));
  }

  const userStats: Record<string, {
    userId: string;
    userName: string;
    teamId: string | null;
    teamName: string | null;
    scores: number[];
    submissionCount: number;
    challengeCount: number;
    badges: string[];
  }> = {};

  submissions.forEach(submission => {
    if (submission.reviewStatus !== 'accepted' && submission.reviewStatus !== 'pending') return;
    
    const userId = submission.userId;
    if (!userStats[userId]) {
      const team = state.teams.find(t => t.id === submission.teamId);
      userStats[userId] = {
        userId,
        userName: submission.userName,
        teamId: submission.teamId,
        teamName: team?.name || null,
        scores: [],
        submissionCount: 0,
        challengeCount: 0,
        badges: []
      };
    }

    const score = submission.finalScore ?? submission.score;
    userStats[userId].scores.push(score);
    userStats[userId].submissionCount++;
  });

  const challengeSet = new Set(submissions.map(s => s.challengeId));
  Object.values(userStats).forEach(stat => {
    stat.challengeCount = challengeSet.size;
  });

  const entries: ChallengeLeaderboardEntry[] = Object.values(userStats).map(stat => {
    const sortedScores = [...stat.scores].sort((a, b) => b - a);
    return {
      rank: 0,
      userId: stat.userId,
      userName: stat.userName,
      teamId: stat.teamId,
      teamName: stat.teamName,
      totalScore: sortedScores.reduce((sum, s) => sum + s, 0),
      bestScore: sortedScores[0] || 0,
      avgScore: sortedScores.length > 0
        ? sortedScores.reduce((sum, s) => sum + s, 0) / sortedScores.length
        : 0,
      submissionCount: stat.submissionCount,
      challengeCount: stat.challengeCount,
      badges: stat.badges
    };
  });

  entries.sort((a, b) => {
    switch (sortBy) {
      case 'total_score':
        return b.totalScore - a.totalScore;
      case 'best_score':
        return b.bestScore - a.bestScore;
      case 'avg_score':
        return b.avgScore - a.avgScore;
      case 'submissions':
        return b.submissionCount - a.submissionCount;
      default:
        return b.totalScore - a.totalScore;
    }
  });

  return entries.map((entry, idx) => ({ ...entry, rank: idx + 1 }));
}

export function filterChallenges(
  state: ChallengeState,
  filter: Partial<ChallengeFilter>
): ChallengeDefinition[] {
  let challenges = [...state.challenges];

  if (filter.statuses && filter.statuses.length > 0) {
    challenges = challenges.filter(c => filter.statuses!.includes(c.status));
  }

  if (filter.seasonId) {
    challenges = challenges.filter(c => c.seasonId === filter.seasonId);
  }

  if (filter.searchKeyword) {
    const keyword = filter.searchKeyword.toLowerCase();
    challenges = challenges.filter(c =>
      c.title.toLowerCase().includes(keyword) ||
      c.description.toLowerCase().includes(keyword) ||
      c.subtitle.toLowerCase().includes(keyword)
    );
  }

  switch (filter.sortBy) {
    case 'start_date_asc':
      challenges.sort((a, b) => a.registrationStart - b.registrationStart);
      break;
    case 'participants_desc':
      challenges.sort((a, b) => {
        const countA = state.registrations.filter(r => r.challengeId === a.id).length;
        const countB = state.registrations.filter(r => r.challengeId === b.id).length;
        return countB - countA;
      });
      break;
    case 'prize_desc':
      challenges.sort((a, b) => {
        const prizeA = a.prizes[0]?.points || 0;
        const prizeB = b.prizes[0]?.points || 0;
        return prizeB - prizeA;
      });
      break;
    default:
      challenges.sort((a, b) => b.registrationStart - a.registrationStart);
  }

  return challenges;
}

export function getChallengeStatusInfo(status: ChallengeStatus): {
  label: string;
  color: string;
  icon: string;
} {
  const map: Record<ChallengeStatus, { label: string; color: string; icon: string }> = {
    upcoming: { label: '即将开始', color: '#3498db', icon: '⏳' },
    registration: { label: '报名中', color: '#27ae60', icon: '📝' },
    developing: { label: '冲洗中', color: '#f39c12', icon: '🎞️' },
    reviewing: { label: '评审中', color: '#9b59b6', icon: '🎭' },
    completed: { label: '已结束', color: '#7f8c8d', icon: '✅' },
    archived: { label: '已归档', color: '#95a5a6', icon: '📦' }
  };
  return map[status];
}

export function getChallengeById(state: ChallengeState, id: string): ChallengeDefinition | null {
  return state.challenges.find(c => c.id === id) || null;
}

export function getSeasonById(state: ChallengeState, id: string): ChallengeSeason | null {
  return state.seasons.find(s => s.id === id) || null;
}

export function getActiveChallenges(state: ChallengeState): ChallengeDefinition[] {
  return state.challenges.filter(c =>
    c.status === 'registration' || c.status === 'developing' || c.status === 'reviewing'
  );
}

export function updateChallengeStatuses(state: ChallengeState): ChallengeState {
  const now = Date.now();
  const newChallenges = state.challenges.map(challenge => {
    let newStatus = challenge.status;
    
    if (now >= challenge.reviewEnd && challenge.status !== 'completed' && challenge.status !== 'archived') {
      newStatus = 'completed';
    } else if (now >= challenge.reviewStart && now < challenge.reviewEnd && challenge.status !== 'reviewing') {
      newStatus = 'reviewing';
    } else if (now >= challenge.developStart && now < challenge.developEnd && challenge.status !== 'developing') {
      newStatus = 'developing';
    } else if (now >= challenge.registrationStart && now < challenge.registrationEnd && challenge.status !== 'registration') {
      newStatus = 'registration';
    }

    return { ...challenge, status: newStatus };
  });

  return { ...state, challenges: newChallenges };
}

export function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return '00:00';
  
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function getTimeStatus(remainingMs: number): { color: string; label: string } {
  if (remainingMs <= 0) {
    return { color: '#e74c3c', label: '时间到' };
  }
  const totalSeconds = remainingMs / 1000;
  if (totalSeconds < 60) {
    return { color: '#e74c3c', label: '紧急' };
  }
  if (totalSeconds < 300) {
    return { color: '#f39c12', label: '紧张' };
  }
  return { color: '#27ae60', label: '充足' };
}

const MOCK_USERS = [
  { id: 'mock_user_1', name: '光影猎人' },
  { id: 'mock_user_2', name: '暗房艺术家' },
  { id: 'mock_user_3', name: '胶片诗人' },
  { id: 'mock_user_4', name: '快门行者' },
  { id: 'mock_user_5', name: '黑白匠人' },
  { id: 'mock_user_6', name: '色彩魔法师' },
  { id: 'mock_user_7', name: '街头观察家' },
  { id: 'mock_user_8', name: '风景捕手' }
];

function createMockSubmission(
  challengeId: string,
  userId: string,
  userName: string,
  subjectId: string,
  score: number,
  teamId: string | null = null
): ChallengeSubmission {
  return {
    id: 'sub_mock_' + generateId(),
    challengeId,
    userId,
    userName,
    teamId,
    photoId: 'photo_mock_' + generateId(),
    photoDataUrl: 'data:image/svg+xml;base64,' + btoa(
      `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400">
        <rect width="400" height="400" fill="#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}"/>
        <text x="200" y="200" text-anchor="middle" fill="white" font-size="24">${userName}</text>
        <text x="200" y="240" text-anchor="middle" fill="white" font-size="16">得分: ${score}</text>
      </svg>`
    ),
    subjectId,
    filmId: FILM_STOCKS[Math.floor(Math.random() * FILM_STOCKS.length)].id,
    params: {
      exposure: 0.5,
      contrast: 0.5,
      developmentTime: 0.5,
      temperature: 0.5,
      saturation: 0.5,
      agitation: 0.5,
      dilution: 0.5
    },
    score,
    details: {
      overall: score,
      grade: (score >= 85 ? 'S' : score >= 70 ? 'A' : score >= 55 ? 'B' : score >= 40 ? 'C' : 'D') as 'S' | 'A' | 'B' | 'C' | 'D',
      exposure: score * 0.35,
      contrast: score * 0.25,
      color: score * 0.2,
      detail: score * 0.2,
      feedback: [],
      keyAreaResults: [],
      paramDeviations: [],
      deductions: [],
      overexposedPct: 0,
      underexposedPct: 0,
      dynamicRange: 0,
      sharpness: 0,
      stageImpact: {
        developPenalty: 0,
        fixPenalty: 0,
        washPenalty: 0,
        developFeedback: '',
        fixFeedback: '',
        washFeedback: ''
      }
    },
    submittedAt: Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000,
    developDurationMs: 5 * 60 * 1000 + Math.random() * 20 * 60 * 1000,
    reviewStatus: 'pending',
    reviews: [],
    reviewScore: 0,
    finalScore: score,
    rank: 0
  };
}

export function createMockSubmissions(challenges: ChallengeDefinition[]): ChallengeSubmission[] {
  const submissions: ChallengeSubmission[] = [];
  
  challenges.forEach(challenge => {
    if (challenge.status !== 'developing' && challenge.status !== 'reviewing' && challenge.status !== 'completed') return;
    
    const theme = challenge.themes[challenge.currentThemeIndex];
    if (!theme) return;
    
    const numSubmissions = 5 + Math.floor(Math.random() * 8);
    const shuffledUsers = [...MOCK_USERS].sort(() => Math.random() - 0.5);
    
    for (let i = 0; i < numSubmissions && i < shuffledUsers.length; i++) {
      const user = shuffledUsers[i];
      const baseScore = 50 + Math.random() * 45;
      const submission = createMockSubmission(
        challenge.id,
        user.id,
        user.name,
        theme.subjectId,
        Math.round(baseScore)
      );
      
      if (challenge.status === 'reviewing' || challenge.status === 'completed') {
        const numReviews = 2 + Math.floor(Math.random() * 3);
        const reviewers = shuffledUsers.filter(u => u.id !== user.id).slice(0, numReviews);
        const reviews = reviewers.map(reviewer => ({
          id: 'review_mock_' + generateId(),
          submissionId: submission.id,
          reviewerId: reviewer.id,
          reviewerName: reviewer.name,
          score: 50 + Math.random() * 45,
          comment: '作品很棒，继续加油！',
          reviewedAt: Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000,
          dimensions: REVIEW_DIMENSIONS.map(dim => ({
            dimensionId: dim.id,
            score: 50 + Math.random() * 45,
            comment: '表现不错'
          }))
        }));
        submission.reviews = reviews;
        submission.reviewScore = reviews.reduce((sum, r) => sum + r.score, 0) / reviews.length;
        submission.finalScore = Math.round(submission.score * 0.6 + submission.reviewScore * 0.4);
        submission.reviewStatus = 'accepted';
      }
      
      submissions.push(submission);
    }
  });
  
  return submissions;
}

export function createMockTeams(challenges: ChallengeDefinition[]): ChallengeTeam[] {
  const teams: ChallengeTeam[] = [];
  const teamNames = ['光影联盟', '暗房先锋', '胶片骑士', '色彩部落', '快门军团'];
  
  challenges.forEach((challenge, idx) => {
    if (!challenge.allowTeams) return;
    
    const numTeams = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < numTeams && i < teamNames.length; i++) {
      const teamId = `team_mock_${challenge.id}_${i}`;
      const leaderIdx = (idx * 2 + i) % MOCK_USERS.length;
      const members = [
        {
          userId: MOCK_USERS[leaderIdx].id,
          userName: MOCK_USERS[leaderIdx].name,
          role: 'leader' as TeamRole,
          joinedAt: Date.now() - 5 * 24 * 60 * 60 * 1000
        }
      ];
      
      if (challenge.maxTeamSize > 1) {
        const memberIdx = (leaderIdx + 1) % MOCK_USERS.length;
        members.push({
          userId: MOCK_USERS[memberIdx].id,
          userName: MOCK_USERS[memberIdx].name,
          role: 'member' as TeamRole,
          joinedAt: Date.now() - 4 * 24 * 60 * 60 * 1000
        });
      }
      
      teams.push({
        id: teamId,
        challengeId: challenge.id,
        name: `${teamNames[i]}_${challenge.id.slice(0, 8)}`,
        slogan: '用镜头记录美好',
        avatarColor: AVATAR_COLORS[(idx + i) % AVATAR_COLORS.length],
        leaderId: MOCK_USERS[leaderIdx].id,
        leaderName: MOCK_USERS[leaderIdx].name,
        members,
        maxMembers: challenge.maxTeamSize,
        registeredAt: Date.now() - 7 * 24 * 60 * 60 * 1000,
        isLocked: true
      });
    }
  });
  
  return teams;
}
