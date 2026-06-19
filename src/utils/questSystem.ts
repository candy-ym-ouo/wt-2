import type {
  QuestDefinition,
  StageDefinition,
  QuestSystemState,
  QuestProgress,
  StageProgress,
  QuestStatus,
  StageStatus,
  FilmRestrictionResult,
  QuestAttemptResult,
  QuestReward,
  PhotoSubject,
  FilmStock,
  ScoreDetail,
  ProcessedPhoto,
  DevParams
} from '../types/game';
import {
  QUEST_DEFINITIONS,
  STAGE_DEFINITIONS,
  INITIAL_UNLOCKED_SUBJECTS,
  INITIAL_UNLOCKED_FILMS,
  PHOTO_SUBJECTS,
  FILM_STOCKS
} from '../data/gameData';
import { clamp } from './math';

const GRADE_RANK: Record<string, number> = { S: 5, A: 4, B: 3, C: 2, D: 1 };

export function meetsMinGrade(grade: string, minGrade: string): boolean {
  return (GRADE_RANK[grade] || 0) >= (GRADE_RANK[minGrade] || 0);
}

export function createInitialQuestSystemState(): QuestSystemState {
  const questProgress: Record<string, QuestProgress> = {};
  QUEST_DEFINITIONS.forEach(quest => {
    questProgress[quest.id] = {
      questId: quest.id,
      status: 'locked',
      bestScore: 0,
      bestGrade: null,
      attempts: 0,
      unlockedSubjectIds: [],
      unlockedFilmIds: [],
      bonusAchieved: []
    };
  });

  const stageProgress: Record<string, StageProgress> = {};
  STAGE_DEFINITIONS.forEach(stage => {
    stageProgress[stage.id] = {
      stageId: stage.id,
      status: 'locked',
      totalScore: 0
    };
  });

  const state: QuestSystemState = {
    totalPoints: 0,
    earnedBadges: [],
    earnedTitles: [],
    unlockedSubjectIds: [...INITIAL_UNLOCKED_SUBJECTS],
    unlockedFilmIds: [...INITIAL_UNLOCKED_FILMS],
    unlockedRecipeIds: [],
    questProgress,
    stageProgress,
    currentActiveQuestId: null,
    lastClaimedRewards: null
  };

  return recalculateQuestStatuses(state);
}

export function recalculateQuestStatuses(state: QuestSystemState): QuestSystemState {
  const newState = { ...state };
  const questProgress = { ...newState.questProgress };
  const stageProgress = { ...newState.stageProgress };

  STAGE_DEFINITIONS.forEach(stage => {
    const stagePrereqsMet = stage.prerequisites.every(prereqId => {
      const prereqStage = STAGE_DEFINITIONS.find(s => s.id === prereqId);
      if (!prereqStage) return true;
      return stageProgress[prereqId]?.status === 'cleared';
    });

    if (stagePrereqsMet && stageProgress[stage.id]?.status === 'locked') {
      stageProgress[stage.id] = {
        ...stageProgress[stage.id],
        status: 'unlocked',
        unlockedAt: Date.now()
      };
    }
  });

  QUEST_DEFINITIONS.forEach(quest => {
    const currentProgress = questProgress[quest.id];
    const stage = stageProgress[quest.stageId];

    if (!stage || stage.status === 'locked') {
      questProgress[quest.id] = { ...currentProgress, status: 'locked' };
      return;
    }

    if (currentProgress.status === 'completed' || currentProgress.status === 'claimed') {
      return;
    }

    const prereqsMet = quest.prerequisites.every(prereqId => {
      const prereqProgress = questProgress[prereqId];
      return prereqProgress && (prereqProgress.status === 'completed' || prereqProgress.status === 'claimed');
    });

    if (prereqsMet) {
      questProgress[quest.id] = {
        ...currentProgress,
        status: currentProgress.attempts > 0 ? 'in_progress' : 'available'
      };
    } else {
      questProgress[quest.id] = { ...currentProgress, status: 'locked' };
    }
  });

  STAGE_DEFINITIONS.forEach(stage => {
    const allQuestCompleted = stage.questIds.every(questId => {
      const progress = questProgress[questId];
      return progress && (progress.status === 'completed' || progress.status === 'claimed');
    });

    if (allQuestCompleted && stageProgress[stage.id].status === 'unlocked') {
      stageProgress[stage.id] = {
        ...stageProgress[stage.id],
        status: 'cleared',
        clearedAt: Date.now()
      };
    }
  });

  newState.questProgress = questProgress;
  newState.stageProgress = stageProgress;
  return newState;
}

export function checkFilmRestrictions(
  filmId: string,
  questId: string
): FilmRestrictionResult {
  const quest = QUEST_DEFINITIONS.find(q => q.id === questId);
  const film = FILM_STOCKS.find(f => f.id === filmId);

  const restrictions: FilmRestrictionResult['restrictions'] = [];

  if (!quest || !film) {
    return {
      allowed: !!quest && !!film,
      filmId,
      questId,
      restrictions
    };
  }

  const req = quest.requirement;

  if (req.allowedFilmIds && req.allowedFilmIds.length > 0) {
    const passed = req.allowedFilmIds.includes(filmId);
    restrictions.push({
      type: 'allowed_list',
      value: req.allowedFilmIds,
      passed,
      message: passed ? `胶片符合任务要求` : `任务限定胶片：${req.allowedFilmIds.map(id => FILM_STOCKS.find(f => f.id === id)?.name || id).join('、')}`
    });
  }

  if (req.forbiddenFilmIds && req.forbiddenFilmIds.length > 0) {
    const passed = !req.forbiddenFilmIds.includes(filmId);
    restrictions.push({
      type: 'forbidden_list',
      value: req.forbiddenFilmIds,
      passed,
      message: passed ? '胶片不在禁用列表中' : `任务禁用胶片：${req.forbiddenFilmIds.map(id => FILM_STOCKS.find(f => f.id === id)?.name || id).join('、')}`
    });
  }

  if (req.requireFilmColor) {
    const passed = film.color === req.requireFilmColor;
    restrictions.push({
      type: 'color_requirement',
      value: req.requireFilmColor,
      passed,
      message: passed ? `胶片类型正确（${req.requireFilmColor === 'bw' ? '黑白' : '彩色'}）` : `任务要求${req.requireFilmColor === 'bw' ? '黑白' : '彩色'}胶片`
    });
  }

  const allowed = restrictions.every(r => r.passed);

  return {
    allowed,
    filmId,
    questId,
    restrictions
  };
}

export function getAvailableFilmsForQuest(questId: string): FilmStock[] {
  return FILM_STOCKS.filter(film => checkFilmRestrictions(film.id, questId).allowed);
}

export function isSubjectUnlocked(state: QuestSystemState, subjectId: string): boolean {
  return state.unlockedSubjectIds.includes(subjectId);
}

export function isFilmUnlocked(state: QuestSystemState, filmId: string): boolean {
  return state.unlockedFilmIds.includes(filmId);
}

export function getUnlockedSubjects(state: QuestSystemState): PhotoSubject[] {
  return PHOTO_SUBJECTS.filter(s => state.unlockedSubjectIds.includes(s.id));
}

export function getUnlockedFilms(state: QuestSystemState): FilmStock[] {
  return FILM_STOCKS.filter(f => state.unlockedFilmIds.includes(f.id));
}

function calculateExposureDeviation(
  params: DevParams,
  subject: PhotoSubject
): number {
  return Math.abs(params.exposure - subject.idealExposure);
}

export function evaluateQuestAttempt(
  state: QuestSystemState,
  questId: string,
  photo: ProcessedPhoto,
  params: DevParams,
  warnings: string[] = []
): QuestAttemptResult {
  const quest = QUEST_DEFINITIONS.find(q => q.id === questId);
  const subject = PHOTO_SUBJECTS.find(s => s.id === photo.subjectId);
  const currentProgress = state.questProgress[questId];

  if (!quest || !subject) {
    return {
      success: false,
      score: photo.score,
      grade: photo.details.grade,
      passedRequirement: false,
      failedReasons: ['任务或题材不存在'],
      bonusEarned: [],
      basePoints: 0,
      totalPoints: 0,
      isNewBest: false,
      unlockedItems: { subjects: [], films: [], recipes: [] }
    };
  }

  const req = quest.requirement;
  const failedReasons: string[] = [];
  const bonusEarned: QuestAttemptResult['bonusEarned'] = [];

  if (photo.score < req.minScore) {
    failedReasons.push(`评分不足：需要${req.minScore}分，当前${photo.score}分`);
  }

  if (req.minGrade && !meetsMinGrade(photo.details.grade, req.minGrade)) {
    failedReasons.push(`等级不足：需要${req.minGrade}级，当前${photo.details.grade}级`);
  }

  if (req.requireKeyAreaHits) {
    const hitCount = photo.details.keyAreaResults.filter(k => k.isHit).length;
    if (hitCount < req.requireKeyAreaHits) {
      failedReasons.push(`关键区域命中不足：需要${req.requireKeyAreaHits}个，当前${hitCount}个`);
    }
  }

  const passedRequirement = failedReasons.length === 0;
  const isNewBest = photo.score > (currentProgress?.bestScore || 0);

  const bonusConditions = req.bonusConditions || [];
  bonusConditions.forEach(condition => {
    let achieved = false;

    switch (condition.type) {
      case 'film_match':
        achieved = subject.recommendedFilms.includes(photo.filmId);
        break;
      case 'all_key_areas':
        achieved = photo.details.keyAreaResults.every(k => k.isHit);
        break;
      case 'no_warnings':
        achieved = warnings.length === 0;
        break;
      case 'perfect_exposure': {
        const threshold = (condition.value as number) || 0.1;
        const deviation = calculateExposureDeviation(params, subject);
        achieved = deviation < threshold;
        break;
      }
      case 'specific_grade':
        achieved = meetsMinGrade(photo.details.grade, condition.value as string);
        break;
    }

    if (achieved) {
      bonusEarned.push({
        condition: condition.type,
        label: condition.label,
        points: condition.bonusPoints
      });
    }
  });

  const basePoints = passedRequirement
    ? quest.rewards.find(r => r.type === 'points')?.value as number || 100
    : Math.floor((photo.score / (req.minScore || 60)) * 50);

  const bonusPoints = bonusEarned.reduce((sum, b) => sum + b.points, 0);
  const totalPoints = basePoints + bonusPoints;

  const unlockedItems = {
    subjects: [] as string[],
    films: [] as string[],
    recipes: [] as string[]
  };

  if (passedRequirement && !currentProgress?.completedAt) {
    quest.rewards.forEach(reward => {
      switch (reward.type) {
        case 'unlock_subject':
          if (Array.isArray(reward.value)) {
            unlockedItems.subjects.push(...reward.value.filter(id => !state.unlockedSubjectIds.includes(id)));
          }
          break;
        case 'unlock_film':
          if (Array.isArray(reward.value)) {
            unlockedItems.films.push(...reward.value.filter(id => !state.unlockedFilmIds.includes(id)));
          }
          break;
        case 'unlock_recipe':
          if (Array.isArray(reward.value)) {
            unlockedItems.recipes.push(...reward.value.filter(id => !state.unlockedRecipeIds.includes(id)));
          }
          break;
      }
    });
  }

  return {
    success: passedRequirement,
    score: photo.score,
    grade: photo.details.grade,
    passedRequirement,
    failedReasons,
    bonusEarned,
    basePoints,
    totalPoints,
    isNewBest,
    unlockedItems
  };
}

export function applyQuestResult(
  state: QuestSystemState,
  questId: string,
  result: QuestAttemptResult
): QuestSystemState {
  const quest = QUEST_DEFINITIONS.find(q => q.id === questId);
  if (!quest) return state;

  const currentProgress = state.questProgress[questId];
  const newBonusAchieved = [...currentProgress.bonusAchieved];

  result.bonusEarned.forEach(bonus => {
    if (!newBonusAchieved.includes(bonus.condition)) {
      newBonusAchieved.push(bonus.condition);
    }
  });

  let newStatus: QuestStatus = currentProgress.status;
  if (result.passedRequirement && !currentProgress.completedAt) {
    newStatus = 'completed';
  } else if (currentProgress.status === 'available' || currentProgress.status === 'locked') {
    newStatus = 'in_progress';
  }

  const newProgress: QuestProgress = {
    ...currentProgress,
    status: newStatus,
    bestScore: Math.max(currentProgress.bestScore, result.score),
    bestGrade: meetsMinGrade(result.grade, currentProgress.bestGrade || 'D')
      ? result.grade
      : currentProgress.bestGrade,
    attempts: currentProgress.attempts + 1,
    completedAt: result.passedRequirement && !currentProgress.completedAt
      ? Date.now()
      : currentProgress.completedAt,
    bonusAchieved: newBonusAchieved
  };

  const newState: QuestSystemState = {
    ...state,
    totalPoints: state.totalPoints + result.totalPoints,
    unlockedSubjectIds: [...state.unlockedSubjectIds, ...result.unlockedItems.subjects],
    unlockedFilmIds: [...state.unlockedFilmIds, ...result.unlockedItems.films],
    unlockedRecipeIds: [...state.unlockedRecipeIds, ...result.unlockedItems.recipes],
    questProgress: {
      ...state.questProgress,
      [questId]: newProgress
    }
  };

  if (result.passedRequirement) {
    quest.rewards.forEach(reward => {
      switch (reward.type) {
        case 'badge':
          if (typeof reward.value === 'string' && !state.earnedBadges.includes(reward.value)) {
            newState.earnedBadges = [...newState.earnedBadges, reward.value];
          }
          break;
        case 'title':
          if (typeof reward.value === 'string' && !state.earnedTitles.includes(reward.value)) {
            newState.earnedTitles = [...newState.earnedTitles, reward.value];
          }
          break;
      }
    });
  }

  const stageProgress = { ...newState.stageProgress };
  const stage = STAGE_DEFINITIONS.find(s => s.id === quest.stageId);
  const stageTotalScore = (stage?.questIds || []).reduce((sum, qid) => {
    return sum + (newState.questProgress[qid]?.bestScore || 0);
  }, 0);
  stageProgress[quest.stageId] = {
    ...stageProgress[quest.stageId],
    totalScore: stageTotalScore
  };
  newState.stageProgress = stageProgress;

  return recalculateQuestStatuses(newState);
}

export function claimQuestRewards(
  state: QuestSystemState,
  questId: string
): { state: QuestSystemState; rewards: QuestReward[] } {
  const quest = QUEST_DEFINITIONS.find(q => q.id === questId);
  const progress = state.questProgress[questId];

  if (!quest || !progress || progress.status !== 'completed') {
    return { state, rewards: [] };
  }

  const newProgress: QuestProgress = {
    ...progress,
    status: 'claimed',
    claimedAt: Date.now()
  };

  const newState = recalculateQuestStatuses({
    ...state,
    questProgress: {
      ...state.questProgress,
      [questId]: newProgress
    },
    lastClaimedRewards: {
      rewards: quest.rewards,
      timestamp: Date.now()
    }
  });

  return { state: newState, rewards: quest.rewards };
}

export function checkStageBonus(
  state: QuestSystemState,
  stageId: string
): { achievable: boolean; rewards: QuestReward[]; currentProgress: number; target: number } {
  const stage = STAGE_DEFINITIONS.find(s => s.id === stageId);
  if (!stage || !stage.bonus) {
    return { achievable: false, rewards: [], currentProgress: 0, target: 0 };
  }

  let currentProgress = 0;
  let target = stage.questIds.length;
  let achievable = false;

  switch (stage.bonus.type) {
    case 'all_quests_grade': {
      const targetGrade = stage.bonus.value as string;
      const gradesMet = stage.questIds.filter(questId => {
        const progress = state.questProgress[questId];
        return progress?.bestGrade && meetsMinGrade(progress.bestGrade, targetGrade);
      }).length;
      currentProgress = gradesMet;
      achievable = gradesMet >= target && state.stageProgress[stageId]?.status === 'cleared';
      break;
    }
    case 'total_points': {
      target = stage.bonus.value as number;
      currentProgress = state.stageProgress[stageId]?.totalScore || 0;
      achievable = currentProgress >= target;
      break;
    }
    case 'streak': {
      target = stage.bonus.value as number;
      currentProgress = 0;
      achievable = false;
      break;
    }
  }

  return {
    achievable,
    rewards: achievable && !state.stageProgress[stageId]?.bonusClaimed ? stage.bonus.rewards : [],
    currentProgress,
    target
  };
}

export function claimStageBonus(
  state: QuestSystemState,
  stageId: string
): { state: QuestSystemState; rewards: QuestReward[] } {
  const check = checkStageBonus(state, stageId);
  if (!check.achievable || check.rewards.length === 0) {
    return { state, rewards: [] };
  }

  const stageProgress = { ...state.stageProgress };
  stageProgress[stageId] = {
    ...stageProgress[stageId],
    bonusClaimed: true
  };

  let newState: QuestSystemState = {
    ...state,
    stageProgress
  };

  check.rewards.forEach(reward => {
    switch (reward.type) {
      case 'badge':
        if (typeof reward.value === 'string' && !newState.earnedBadges.includes(reward.value)) {
          newState.earnedBadges = [...newState.earnedBadges, reward.value];
        }
        break;
      case 'title':
        if (typeof reward.value === 'string' && !newState.earnedTitles.includes(reward.value)) {
          newState.earnedTitles = [...newState.earnedTitles, reward.value];
        }
        break;
      case 'points':
        newState.totalPoints += reward.value as number;
        break;
    }
  });

  newState.lastClaimedRewards = {
    rewards: check.rewards,
    timestamp: Date.now()
  };

  return { state: newState, rewards: check.rewards };
}

export function setActiveQuest(
  state: QuestSystemState,
  questId: string | null
): QuestSystemState {
  if (questId === null) {
    return { ...state, currentActiveQuestId: null };
  }

  const progress = state.questProgress[questId];
  if (!progress || progress.status === 'locked') {
    return state;
  }

  return { ...state, currentActiveQuestId: questId };
}

export function getQuestById(questId: string): QuestDefinition | undefined {
  return QUEST_DEFINITIONS.find(q => q.id === questId);
}

export function getStageById(stageId: string): StageDefinition | undefined {
  return STAGE_DEFINITIONS.find(s => s.id === stageId);
}

export function getQuestsByStage(stageId: string): QuestDefinition[] {
  return QUEST_DEFINITIONS
    .filter(q => q.stageId === stageId)
    .sort((a, b) => a.order - b.order);
}

export function getQuestCompletionStats(state: QuestSystemState): {
  total: number;
  completed: number;
  claimed: number;
  inProgress: number;
  available: number;
  locked: number;
} {
  let completed = 0;
  let claimed = 0;
  let inProgress = 0;
  let available = 0;
  let locked = 0;

  Object.values(state.questProgress).forEach(progress => {
    switch (progress.status) {
      case 'completed': completed++; break;
      case 'claimed': claimed++; break;
      case 'in_progress': inProgress++; break;
      case 'available': available++; break;
      case 'locked': locked++; break;
    }
  });

  return {
    total: QUEST_DEFINITIONS.length,
    completed: completed + claimed,
    claimed,
    inProgress,
    available,
    locked
  };
}

export function getStageCompletionStats(state: QuestSystemState): {
  total: number;
  cleared: number;
  unlocked: number;
  locked: number;
} {
  let cleared = 0;
  let unlocked = 0;
  let locked = 0;

  Object.values(state.stageProgress).forEach(progress => {
    switch (progress.status) {
      case 'cleared': cleared++; break;
      case 'unlocked': unlocked++; break;
      case 'locked': locked++; break;
    }
  });

  return {
    total: STAGE_DEFINITIONS.length,
    cleared,
    unlocked,
    locked
  };
}

export function validateFilmRestrictions(
  quest: QuestDefinition | undefined,
  filmId: string,
  subjectId: string,
  warnings: string[]
): boolean {
  if (!quest) {
    warnings.push('任务不存在');
    return false;
  }

  const req = quest.requirement;

  if (req.subjectId && req.subjectId !== subjectId) {
    const subjectName = PHOTO_SUBJECTS.find(s => s.id === req.subjectId)?.name || req.subjectId;
    warnings.push(`任务限定题材：${subjectName}`);
    return false;
  }

  const filmCheck = checkFilmRestrictions(filmId, quest.id);
  if (!filmCheck.allowed) {
    filmCheck.restrictions.forEach(r => {
      if (!r.passed && r.message) {
        warnings.push(r.message);
      }
    });
    return false;
  }

  return true;
}

export function getQuestStatusFromState(
  state: QuestSystemState,
  quest: QuestDefinition | undefined
): QuestStatus | undefined {
  if (!quest) return undefined;
  return state.questProgress[quest.id]?.status || 'locked';
}

export function getStageStatusFromState(
  state: QuestSystemState,
  stage: StageDefinition | undefined
): StageStatus | undefined {
  if (!stage) return undefined;
  return state.stageProgress[stage.id]?.status || 'locked';
}

export { GRADE_RANK };
