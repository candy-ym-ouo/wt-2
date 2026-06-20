import type {
  CurriculumChapter,
  CurriculumLessonStep,
  StepProgress,
  ChapterProgress,
  LearningProfile,
  CurriculumSystemState,
  CurriculumFeedback,
  CurriculumFeedbackSeverity,
  QuizQuestion,
  PracticeExercise,
  WeaknessAnalysis,
  LearningMilestone,
  DevParams,
  ScoreDetail
} from '../types/game';
import { CURRICULUM_CHAPTERS, LEARNING_MILESTONES } from '../data/gameData';
import { generateId } from './math';

function createEmptyStepProgress(stepId: string): StepProgress {
  return {
    stepId,
    status: 'locked',
    timeSpentSeconds: 0,
    attempts: 0,
    mistakes: [],
    feedbackHistory: []
  };
}

function createEmptyChapterProgress(chapterId: string): ChapterProgress {
  const chapter = CURRICULUM_CHAPTERS.find(c => c.id === chapterId);
  const stepProgress: Record<string, StepProgress> = {};
  chapter?.steps.forEach(step => {
    stepProgress[step.id] = createEmptyStepProgress(step.id);
  });

  return {
    chapterId,
    status: 'locked',
    currentStepIndex: 0,
    stepProgress,
    examAttempts: 0,
    totalTimeSpentSeconds: 0,
    earnedPoints: 0,
    rewardsClaimed: false
  };
}

export function createInitialLearningProfile(): LearningProfile {
  const chapterProgress: Record<string, ChapterProgress> = {};
  CURRICULUM_CHAPTERS.forEach(chapter => {
    chapterProgress[chapter.id] = createEmptyChapterProgress(chapter.id);
  });

  if (CURRICULUM_CHAPTERS.length > 0) {
    chapterProgress[CURRICULUM_CHAPTERS[0].id].status = 'in_progress';
    chapterProgress[CURRICULUM_CHAPTERS[0].id].unlockedAt = Date.now();
    if (CURRICULUM_CHAPTERS[0].steps.length > 0) {
      const firstStepId = CURRICULUM_CHAPTERS[0].steps[0].id;
      chapterProgress[CURRICULUM_CHAPTERS[0].id].stepProgress[firstStepId].status = 'in_progress';
      chapterProgress[CURRICULUM_CHAPTERS[0].id].stepProgress[firstStepId].unlockedAt = Date.now();
      chapterProgress[CURRICULUM_CHAPTERS[0].id].stepProgress[firstStepId].startedAt = Date.now();
    }
  }

  return {
    learnerId: 'learner_' + generateId(),
    enrolledAt: Date.now(),
    lastActiveAt: Date.now(),
    totalStudyTimeSeconds: 0,
    totalPointsEarned: 0,
    currentChapterId: CURRICULUM_CHAPTERS[0]?.id || null,
    currentStepId: CURRICULUM_CHAPTERS[0]?.steps[0]?.id || null,
    chapterProgress,
    completedChapterIds: [],
    masteredSkills: [],
    weaknesses: [],
    milestones: JSON.parse(JSON.stringify(LEARNING_MILESTONES)),
    earnedBadges: [],
    earnedTitles: [],
    streakDays: 0,
    totalAttempts: 0,
    successfulAttempts: 0,
    averageScore: 0,
    bestScore: 0,
    feedbackHistory: [],
    learningPath: CURRICULUM_CHAPTERS.map(c => c.id),
    notes: []
  };
}

export function createInitialCurriculumSystemState(): CurriculumSystemState {
  return {
    chapters: CURRICULUM_CHAPTERS,
    profile: createInitialLearningProfile(),
    activeChapterId: CURRICULUM_CHAPTERS[0]?.id || null,
    activeStepId: CURRICULUM_CHAPTERS[0]?.steps[0]?.id || null,
    activeFeedback: null,
    showCurriculumPanel: false,
    practiceMode: false,
    currentExamAnswers: {},
    lastGeneratedFeedback: null
  };
}

export function isChapterUnlocked(profile: LearningProfile, chapterId: string): boolean {
  const chapter = CURRICULUM_CHAPTERS.find(c => c.id === chapterId);
  if (!chapter) return false;
  if (chapter.prerequisites.length === 0) return true;
  return chapter.prerequisites.every(preId => profile.completedChapterIds.includes(preId));
}

export function isStepUnlocked(profile: LearningProfile, chapterId: string, stepId: string): boolean {
  const chapter = CURRICULUM_CHAPTERS.find(c => c.id === chapterId);
  if (!chapter) return false;

  const chapterProgress = profile.chapterProgress[chapterId];
  if (!chapterProgress || chapterProgress.status === 'locked') return false;

  const stepIndex = chapter.steps.findIndex(s => s.id === stepId);
  if (stepIndex === -1) return false;
  if (stepIndex === 0) return true;

  const prevStep = chapter.steps[stepIndex - 1];
  const prevStepProgress = chapterProgress.stepProgress[prevStep.id];
  return prevStepProgress?.status === 'completed' || prevStepProgress?.status === 'failed';
}

export function checkQuizAnswer(question: QuizQuestion, userAnswer: string | string[]): {
  correct: boolean;
  score: number;
  feedback: string;
} {
  let correct = false;
  let feedback = '';

  if (question.type === 'multiple_choice') {
    const correctAnswers = (Array.isArray(question.correctAnswer) ? question.correctAnswer : [question.correctAnswer]).filter(Boolean) as string[];
    const userAnswers = (Array.isArray(userAnswer) ? userAnswer : [userAnswer]).filter(Boolean) as string[];
    correct = correctAnswers.length === userAnswers.length &&
      correctAnswers.every(a => userAnswers.includes(a));
  } else {
    correct = userAnswer === question.correctAnswer;
  }

  if (correct) {
    feedback = question.explanation || '回答正确！';
  } else {
    const correctOption = question.options?.find(o => {
      if (question.type === 'multiple_choice') {
        const correctAnswers = Array.isArray(question.correctAnswer) ? question.correctAnswer : [question.correctAnswer];
        return correctAnswers.includes(o.id);
      }
      return o.id === question.correctAnswer;
    });
    const userOption = question.options?.find(o => {
      if (Array.isArray(userAnswer)) return userAnswer.includes(o.id);
      return o.id === userAnswer;
    });
    feedback = userOption?.feedback || correctOption?.feedback || `回答错误。正确答案是：${question.correctAnswer}`;
  }

  return {
    correct,
    score: correct ? question.points : 0,
    feedback
  };
}

export function calculateExamScore(questions: QuizQuestion[], answers: Record<string, string | string[]>): {
  score: number;
  totalPoints: number;
  percentage: number;
  correctCount: number;
  results: Record<string, { correct: boolean; score: number; feedback: string }>;
} {
  let totalPoints = 0;
  let earnedPoints = 0;
  let correctCount = 0;
  const results: Record<string, { correct: boolean; score: number; feedback: string }> = {};

  questions.forEach(q => {
    totalPoints += q.points;
    const userAnswer = answers[q.id];
    if (userAnswer !== undefined) {
      const result = checkQuizAnswer(q, userAnswer);
      results[q.id] = result;
      earnedPoints += result.score;
      if (result.correct) correctCount++;
    } else {
      results[q.id] = { correct: false, score: 0, feedback: '未作答' };
    }
  });

  return {
    score: earnedPoints,
    totalPoints,
    percentage: totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0,
    correctCount,
    results
  };
}

export function generateParamFeedback(
  param: keyof DevParams,
  actualValue: number,
  idealValue: number,
  tolerance: number = 0.1
): CurriculumFeedback {
  const deviation = actualValue - idealValue;
  const absDeviation = Math.abs(deviation);

  let severity: CurriculumFeedbackSeverity = 'info';
  let category: 'param_error' | 'encouragement' = 'encouragement';
  let title = '';
  let message = '';
  let suggestion = '';

  const paramLabels: Record<keyof DevParams, string> = {
    exposure: '曝光',
    developmentTime: '显影时间',
    temperature: '温度',
    agitation: '搅动',
    contrast: '对比度',
    saturation: '饱和度',
    dilution: '稀释度'
  };

  if (absDeviation <= tolerance * 0.5) {
    severity = 'info';
    category = 'encouragement';
    title = `${paramLabels[param]}参数控制优秀`;
    message = `你的${paramLabels[param]}设置非常接近理想值，继续保持！`;
    suggestion = '当前参数设置合理，可以尝试微调其他参数。';
  } else if (absDeviation <= tolerance) {
    severity = 'warning';
    category = 'param_error';
    title = `${paramLabels[param]}略有偏差`;
    message = deviation > 0
      ? `${paramLabels[param]}略高，当前值 ${actualValue.toFixed(2)}，理想值约 ${idealValue.toFixed(2)}`
      : `${paramLabels[param]}略低，当前值 ${actualValue.toFixed(2)}，理想值约 ${idealValue.toFixed(2)}`;
    suggestion = deviation > 0
      ? `尝试将${paramLabels[param]}降低约 ${(absDeviation * 0.6).toFixed(2)}`
      : `尝试将${paramLabels[param]}提高约 ${(absDeviation * 0.6).toFixed(2)}`;
  } else if (absDeviation <= tolerance * 2) {
    severity = 'error';
    category = 'param_error';
    title = `${paramLabels[param]}偏差较大`;
    message = deviation > 0
      ? `${paramLabels[param]}过高，当前值 ${actualValue.toFixed(2)}，理想值约 ${idealValue.toFixed(2)}`
      : `${paramLabels[param]}过低，当前值 ${actualValue.toFixed(2)}，理想值约 ${idealValue.toFixed(2)}`;
    suggestion = deviation > 0
      ? `需要将${paramLabels[param]}明显降低，目标值约 ${idealValue.toFixed(2)}`
      : `需要将${paramLabels[param]}明显提高，目标值约 ${idealValue.toFixed(2)}`;
  } else {
    severity = 'critical';
    category = 'param_error';
    title = `${paramLabels[param]}严重偏差`;
    message = deviation > 0
      ? `${paramLabels[param]}严重过高，可能导致画面${param === 'exposure' ? '过曝' : param === 'contrast' ? '反差过强' : '效果异常'}`
      : `${paramLabels[param]}严重过低，可能导致画面${param === 'exposure' ? '欠曝' : param === 'contrast' ? '平淡灰雾' : '效果异常'}`;
    suggestion = `建议将${paramLabels[param]}重置到约 ${idealValue.toFixed(2)} 附近，再逐步微调`;
  }

  return {
    id: 'feedback_' + generateId(),
    timestamp: Date.now(),
    severity,
    category,
    title,
    message,
    suggestion,
    relatedParam: param,
    exampleParams: { [param]: idealValue } as Partial<DevParams>
  };
}

export function generateScoreFeedback(
  scoreDetail: ScoreDetail,
  subjectIdealParams: Partial<DevParams>,
  actualParams: DevParams
): CurriculumFeedback[] {
  const feedbacks: CurriculumFeedback[] = [];

  if (scoreDetail.overall >= 85) {
    feedbacks.push({
      id: 'feedback_' + generateId(),
      timestamp: Date.now(),
      severity: 'info',
      category: 'encouragement',
      title: '优秀作品！',
      message: `恭喜！你的作品获得了 ${scoreDetail.overall.toFixed(0)} 分的高分，等级为 ${scoreDetail.grade}！`,
      suggestion: '可以尝试挑战更高难度，或探索不同的胶片与题材组合。'
    });
  } else if (scoreDetail.overall >= 70) {
    feedbacks.push({
      id: 'feedback_' + generateId(),
      timestamp: Date.now(),
      severity: 'info',
      category: 'encouragement',
      title: '不错的尝试',
      message: `作品得分 ${scoreDetail.overall.toFixed(0)} 分，等级 ${scoreDetail.grade}。已经掌握了基本要领。`,
      suggestion: '分析下方的失分维度，针对性调整参数，争取更好成绩。'
    });
  }

  const dimensionScores = [
    { key: 'exposure', label: '曝光', score: scoreDetail.exposure },
    { key: 'contrast', label: '对比度', score: scoreDetail.contrast },
    { key: 'color', label: '色彩', score: scoreDetail.color },
    { key: 'detail', label: '细节', score: scoreDetail.detail }
  ];

  dimensionScores.forEach(dim => {
    if (dim.score < 60) {
      feedbacks.push({
        id: 'feedback_' + generateId(),
        timestamp: Date.now(),
        severity: dim.score < 40 ? 'error' : 'warning',
        category: 'param_error',
        title: `${dim.label}表现待提升`,
        message: `${dim.label}得分仅 ${dim.score.toFixed(0)} 分，需要重点改进。`,
        suggestion: dim.key === 'exposure'
          ? '重新审视曝光参数，参考题材描述的理想曝光值。'
          : dim.key === 'contrast'
          ? '调整对比度和显影时间参数，增强画面层次。'
          : dim.key === 'color'
          ? '注意饱和度参数的设置，根据胶片特性调整色彩表现。'
          : '检查稀释度和搅动参数，确保显影均匀以保留更多细节。'
      });
    }
  });

  if (scoreDetail.deductions && scoreDetail.deductions.length > 0) {
    const majorDeductions = scoreDetail.deductions.filter(d => d.severity === 'major' || d.severity === 'critical');
    majorDeductions.slice(0, 3).forEach(deduction => {
      feedbacks.push({
        id: 'feedback_' + generateId(),
        timestamp: Date.now(),
        severity: deduction.severity === 'critical' ? 'critical' : 'error',
        category: 'param_error',
        title: deduction.reason,
        message: `扣分项：${deduction.reason}（-${deduction.pointsLost}分）`,
        suggestion: deduction.suggestion
      });
    });
  }

  return feedbacks;
}

export function evaluatePracticeExercise(
  exercise: PracticeExercise,
  score: number,
  grade: string,
  params: DevParams,
  filmId: string,
  attemptNumber: number
): {
  passed: boolean;
  earnedPoints: number;
  feedback: CurriculumFeedback[];
  bonusesEarned: { description: string; points: number }[];
} {
  const feedbacks: CurriculumFeedback[] = [];
  const bonusesEarned: { description: string; points: number }[] = [];
  let earnedPoints = 0;

  const targetScore = exercise.targetScore || 60;
  const passed = score >= targetScore &&
    (!exercise.targetGrade || grade === exercise.targetGrade ||
      (exercise.targetGrade === 'A' && (grade === 'A' || grade === 'S')) ||
      (exercise.targetGrade === 'B' && ['A', 'B', 'S'].includes(grade)) ||
      (exercise.targetGrade === 'C' && ['A', 'B', 'C', 'S'].includes(grade)));

  if (passed) {
    earnedPoints = Math.round(score * 0.5);
    feedbacks.push({
      id: 'feedback_' + generateId(),
      timestamp: Date.now(),
      severity: 'info',
      category: 'encouragement',
      title: '练习通过！',
      message: `恭喜完成练习「${exercise.title}」，得分 ${score.toFixed(0)} 分（目标 ${targetScore} 分）。`,
      suggestion: '获得学习积分！继续挑战更高目标。'
    });
  } else {
    feedbacks.push({
      id: 'feedback_' + generateId(),
      timestamp: Date.now(),
      severity: 'warning',
      category: 'knowledge_gap',
      title: '继续加油',
      message: `当前得分 ${score.toFixed(0)} 分，距离目标 ${targetScore} 分还差 ${(targetScore - score).toFixed(0)} 分。`,
      suggestion: exercise.hints.length > 0
        ? `提示：${exercise.hints[0]}`
        : '仔细分析评分反馈，调整参数后再次尝试。'
    });
  }

  if (exercise.bonusConditions) {
    exercise.bonusConditions.forEach(bonus => {
      let bonusPassed = false;
      switch (bonus.condition) {
        case 'first_try':
          bonusPassed = attemptNumber === 1 && passed;
          break;
        case 'perfect_exposure':
          bonusPassed = score >= 90;
          break;
        case 'specific_film':
          bonusPassed = passed && filmId !== '';
          break;
      }
      if (bonusPassed) {
        bonusesEarned.push({ description: bonus.description, points: bonus.bonusPoints });
        earnedPoints += bonus.bonusPoints;
      }
    });
  }

  return { passed, earnedPoints, feedback: feedbacks, bonusesEarned };
}

export function analyzeWeaknesses(profile: LearningProfile): WeaknessAnalysis[] {
  const weaknesses: WeaknessAnalysis[] = [];
  const errorCategories: Record<string, { count: number; total: number; chapters: string[] }> = {};

  Object.values(profile.chapterProgress).forEach(cp => {
    Object.values(cp.stepProgress).forEach(sp => {
      sp.mistakes.forEach(mistake => {
        if (!errorCategories[mistake]) {
          errorCategories[mistake] = { count: 0, total: 0, chapters: [] };
        }
        errorCategories[mistake].count++;
        if (!errorCategories[mistake].chapters.includes(cp.chapterId)) {
          errorCategories[mistake].chapters.push(cp.chapterId);
        }
      });
      errorCategories['param_error'] = errorCategories['param_error'] || { count: 0, total: 0, chapters: [] };
      errorCategories['param_error'].total += sp.attempts;
    });
  });

  const categoryLabels: Record<string, string> = {
    param_error: '参数调整',
    exposure: '曝光控制',
    contrast: '对比度控制',
    timing: '时机把握',
    knowledge_gap: '理论知识'
  };

  Object.entries(errorCategories).forEach(([cat, data]) => {
    if (data.count > 0 && data.total > 0) {
      const errorRate = data.count / data.total;
      if (errorRate > 0.2) {
        weaknesses.push({
          category: cat,
          categoryLabel: categoryLabels[cat] || cat,
          errorCount: data.count,
          totalAttempts: data.total,
          errorRate,
          recentTrend: 'stable',
          relatedChapters: data.chapters,
          suggestedReview: data.chapters
        });
      }
    }
  });

  return weaknesses.sort((a, b) => b.errorRate - a.errorRate);
}

export function checkMilestones(profile: LearningProfile): {
  updatedProfile: LearningProfile;
  newlyAchieved: LearningMilestone[];
} {
  const newlyAchieved: LearningMilestone[] = [];
  const updatedMilestones = profile.milestones.map(milestone => {
    if (milestone.achievedAt) return milestone;

    let achieved = false;
    switch (milestone.criteria.type) {
      case 'chapters_completed':
        achieved = profile.completedChapterIds.length >= milestone.criteria.value;
        break;
      case 'total_points':
        achieved = profile.totalPointsEarned >= milestone.criteria.value;
        break;
      case 'perfect_steps':
        achieved = false;
        break;
      case 'avg_score':
        achieved = profile.averageScore >= milestone.criteria.value;
        break;
    }

    if (achieved) {
      const achievedMilestone = { ...milestone, achievedAt: Date.now() };
      newlyAchieved.push(achievedMilestone);
      return achievedMilestone;
    }
    return milestone;
  });

  const newBadges = [...profile.earnedBadges];
  const newTitles = [...profile.earnedTitles];
  newlyAchieved.forEach(m => {
    if (m.reward) {
      if (m.reward.type === 'badge' && !newBadges.includes(m.reward.value)) {
        newBadges.push(m.reward.value);
      } else if (m.reward.type === 'title' && !newTitles.includes(m.reward.value)) {
        newTitles.push(m.reward.value);
      }
    }
  });

  return {
    updatedProfile: {
      ...profile,
      milestones: updatedMilestones,
      earnedBadges: newBadges,
      earnedTitles: newTitles
    },
    newlyAchieved
  };
}

export function completeStep(
  profile: LearningProfile,
  chapterId: string,
  stepId: string,
  score?: number,
  feedbacks: CurriculumFeedback[] = []
): LearningProfile {
  const chapter = CURRICULUM_CHAPTERS.find(c => c.id === chapterId);
  if (!chapter) return profile;

  const chapterProgress = profile.chapterProgress[chapterId];
  if (!chapterProgress) return profile;

  const stepProgress = chapterProgress.stepProgress[stepId];
  if (!stepProgress) return profile;

  const now = Date.now();
  const newStepProgress: StepProgress = {
    ...stepProgress,
    status: 'completed',
    completedAt: now,
    attempts: stepProgress.attempts + 1,
    bestScore: score !== undefined ? Math.max(stepProgress.bestScore || 0, score) : stepProgress.bestScore,
    lastScore: score,
    feedbackHistory: [...stepProgress.feedbackHistory, ...feedbacks]
  };

  const currentStepIndex = chapter.steps.findIndex(s => s.id === stepId);
  const isLastStep = currentStepIndex === chapter.steps.length - 1;

  let newCurrentStepIndex = chapterProgress.currentStepIndex;
  const newStepProgressMap = { ...chapterProgress.stepProgress, [stepId]: newStepProgress };

  if (!isLastStep) {
    const nextStepId = chapter.steps[currentStepIndex + 1].id;
    newStepProgressMap[nextStepId] = {
      ...newStepProgressMap[nextStepId],
      status: 'in_progress',
      unlockedAt: now,
      startedAt: now
    };
    newCurrentStepIndex = currentStepIndex + 1;
  }

  let newStatus = chapterProgress.status;
  let newCompletedChapterIds = profile.completedChapterIds;
  let completedAt = chapterProgress.completedAt;

  if (isLastStep && chapterProgress.status !== 'completed') {
    const allStepsCompleted = chapter.steps.every(s =>
      newStepProgressMap[s.id]?.status === 'completed' || newStepProgressMap[s.id]?.status === 'failed'
    );
    if (allStepsCompleted) {
      newStatus = 'completed';
      completedAt = now;
      if (!newCompletedChapterIds.includes(chapterId)) {
        newCompletedChapterIds = [...newCompletedChapterIds, chapterId];
      }
    }
  }

  const pointsEarned = score ? Math.round(score * 0.3) : 0;

  let updatedProfile: LearningProfile = {
    ...profile,
    lastActiveAt: now,
    currentStepId: isLastStep ? profile.currentStepId : chapter.steps[currentStepIndex + 1].id,
    completedChapterIds: newCompletedChapterIds,
    feedbackHistory: [...profile.feedbackHistory, ...feedbacks].slice(-100),
    totalPointsEarned: profile.totalPointsEarned + pointsEarned,
    totalAttempts: profile.totalAttempts + 1,
    successfulAttempts: profile.successfulAttempts + (score && score >= 60 ? 1 : 0),
    chapterProgress: {
      ...profile.chapterProgress,
      [chapterId]: {
        ...chapterProgress,
        status: newStatus,
        currentStepIndex: newCurrentStepIndex,
        stepProgress: newStepProgressMap,
        completedAt,
        earnedPoints: chapterProgress.earnedPoints + pointsEarned
      }
    },
    weaknesses: []
  };

  updatedProfile.averageScore = updatedProfile.totalAttempts > 0
    ? (profile.averageScore * profile.totalAttempts + (score || 0)) / updatedProfile.totalAttempts
    : score || 0;
  updatedProfile.bestScore = Math.max(profile.bestScore, score || 0);
  updatedProfile.weaknesses = analyzeWeaknesses(updatedProfile);

  const { updatedProfile: profileWithMilestones } = checkMilestones(updatedProfile);
  return profileWithMilestones;
}

export function recordStepAttempt(
  profile: LearningProfile,
  chapterId: string,
  stepId: string,
  mistakes: string[] = [],
  score?: number
): LearningProfile {
  const chapterProgress = profile.chapterProgress[chapterId];
  if (!chapterProgress) return profile;

  const stepProgress = chapterProgress.stepProgress[stepId];
  if (!stepProgress) return profile;

  const now = Date.now();

  return {
    ...profile,
    lastActiveAt: now,
    chapterProgress: {
      ...profile.chapterProgress,
      [chapterId]: {
        ...chapterProgress,
        stepProgress: {
          ...chapterProgress.stepProgress,
          [stepId]: {
            ...stepProgress,
            attempts: stepProgress.attempts + 1,
            mistakes: [...new Set([...stepProgress.mistakes, ...mistakes])],
            lastScore: score,
            bestScore: score !== undefined ? Math.max(stepProgress.bestScore || 0, score) : stepProgress.bestScore
          }
        }
      }
    }
  };
}

export function addLearningNote(
  profile: LearningProfile,
  chapterId: string,
  content: string,
  stepId?: string
): LearningProfile {
  return {
    ...profile,
    notes: [
      ...profile.notes,
      { chapterId, stepId, content, createdAt: Date.now() }
    ]
  };
}

export function getChapterById(chapterId: string): CurriculumChapter | undefined {
  return CURRICULUM_CHAPTERS.find(c => c.id === chapterId);
}

export function getStepById(chapterId: string, stepId: string): CurriculumLessonStep | undefined {
  const chapter = getChapterById(chapterId);
  return chapter?.steps.find(s => s.id === stepId);
}

export function getNextStepId(chapterId: string, currentStepId: string): string | null {
  const chapter = getChapterById(chapterId);
  if (!chapter) return null;
  const index = chapter.steps.findIndex(s => s.id === currentStepId);
  if (index === -1 || index >= chapter.steps.length - 1) return null;
  return chapter.steps[index + 1].id;
}

export function getPrevStepId(chapterId: string, currentStepId: string): string | null {
  const chapter = getChapterById(chapterId);
  if (!chapter) return null;
  const index = chapter.steps.findIndex(s => s.id === currentStepId);
  if (index <= 0) return null;
  return chapter.steps[index - 1].id;
}

export function getChapterProgressStats(profile: LearningProfile, chapterId: string): {
  totalSteps: number;
  completedSteps: number;
  progressPercent: number;
  earnedPoints: number;
  timeSpentMinutes: number;
} {
  const chapter = getChapterById(chapterId);
  const chapterProgress = profile.chapterProgress[chapterId];

  if (!chapter || !chapterProgress) {
    return { totalSteps: 0, completedSteps: 0, progressPercent: 0, earnedPoints: 0, timeSpentMinutes: 0 };
  }

  const completedSteps = chapter.steps.filter(s =>
    chapterProgress.stepProgress[s.id]?.status === 'completed' ||
    chapterProgress.stepProgress[s.id]?.status === 'failed'
  ).length;

  return {
    totalSteps: chapter.steps.length,
    completedSteps,
    progressPercent: Math.round((completedSteps / chapter.steps.length) * 100),
    earnedPoints: chapterProgress.earnedPoints,
    timeSpentMinutes: Math.round(chapterProgress.totalTimeSpentSeconds / 60)
  };
}

export function getOverallProgress(profile: LearningProfile): {
  totalChapters: number;
  completedChapters: number;
  inProgressChapters: number;
  totalPoints: number;
  averageScore: number;
} {
  const completedChapters = profile.completedChapterIds.length;
  const inProgressChapters = Object.values(profile.chapterProgress).filter(
    cp => cp.status === 'in_progress'
  ).length;

  return {
    totalChapters: CURRICULUM_CHAPTERS.length,
    completedChapters,
    inProgressChapters,
    totalPoints: profile.totalPointsEarned,
    averageScore: Math.round(profile.averageScore)
  };
}
