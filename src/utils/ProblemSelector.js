'use client';

/**
 * ProblemSelector.js
 * 問題の選択と管理を担当
 * 責任: 難易度やカテゴリに基づく問題選定
 */

import { CATEGORIES, DIFFICULTIES, easyProblems, normalProblems, hardProblems } from '../utils/ProblemData';

// 最近出題された問題を記録（重複防止用）
const recentProblems = new Set();
const MAX_RECENT_PROBLEMS = 15; // 記憶する最近の問題数

/**
 * 問題選択のオプション定義
 * @typedef {Object} ProblemSelectionOptions
 * @property {string} difficulty - 難易度 ('easy', 'normal', 'hard', 'all')
 * @property {string} category - カテゴリ (CATEGORIES定数の値)
 * @property {Array<string>} excludeRecent - 除外する問題テキスト配列
 * @property {boolean} useMemory - 最近出題された問題を記憶して重複を避けるか
 */

/**
 * ランダムに問題を選択する
 * 
 * @param {ProblemSelectionOptions} options - 問題選択オプション 
 * @returns {Object} 選択された問題
 */
export function getRandomProblem(options = {}) {
  const {
    difficulty = DIFFICULTIES.ALL,
    category = null,
    excludeRecent = [],
    useMemory = true,
  } = options;

  // デバッグログ：難易度と選択条件
  console.log('[ProblemSelector] 問題選択:', {
    指定された難易度: difficulty,
    カテゴリ: category || '指定なし',
    除外数: excludeRecent.length,
    難易度設定値チェック: {
      ALL: DIFFICULTIES.ALL,
      EASY: DIFFICULTIES.EASY,
      NORMAL: DIFFICULTIES.NORMAL,
      HARD: DIFFICULTIES.HARD,
      入力値との一致: {
        ALL: difficulty === DIFFICULTIES.ALL,
        EASY: difficulty === DIFFICULTIES.EASY,
        NORMAL: difficulty === DIFFICULTIES.NORMAL,
        HARD: difficulty === DIFFICULTIES.HARD
      }
    }
  });

  // 難易度に基づいて利用可能な問題を取得
  let availableProblems = [];

  if (difficulty === DIFFICULTIES.EASY || difficulty === DIFFICULTIES.ALL) {
    availableProblems = availableProblems.concat(easyProblems);
    console.log('[ProblemSelector] EASY問題を追加:', easyProblems.length);
  }

  if (difficulty === DIFFICULTIES.NORMAL || difficulty === DIFFICULTIES.ALL) {
    availableProblems = availableProblems.concat(normalProblems);
    console.log('[ProblemSelector] NORMAL問題を追加:', normalProblems.length);
  }

  if (difficulty === DIFFICULTIES.HARD || difficulty === DIFFICULTIES.ALL) {
    availableProblems = availableProblems.concat(hardProblems);
    console.log('[ProblemSelector] HARD問題を追加:', hardProblems.length);
  }

  console.log(`[ProblemSelector] 難易度「${difficulty}」の選択可能な問題数:`, availableProblems.length);

  // カテゴリによるフィルタリング
  if (category && category !== 'all') {
    availableProblems = availableProblems.filter(problem => problem.category === category);
  }

  // 除外リストの作成（明示的な除外 + 記憶されている最近の問題）
  const excludeList = new Set(excludeRecent);
  if (useMemory) {
    recentProblems.forEach(problem => excludeList.add(problem));
  }

  // 除外リストに含まれない問題をフィルタ
  const candidateProblems = availableProblems.filter(problem =>
    !excludeList.has(problem.displayText)
  );

  // 候補がない場合は全問題から選択
  if (candidateProblems.length === 0) {
    console.warn('候補問題がないため、全問題から選択します');
    return getRandomFromArray(availableProblems) || fallbackProblem();
  }

  // ランダムに問題を選択
  const selectedProblem = getRandomFromArray(candidateProblems) || fallbackProblem();

  // 選択された問題を記憶リストに追加
  if (useMemory && selectedProblem) {
    // 最大数を超える場合は古いものを削除
    if (recentProblems.size >= MAX_RECENT_PROBLEMS) {
      const oldestProblem = Array.from(recentProblems)[0];
      recentProblems.delete(oldestProblem);
    }

    // 新しい問題を追加
    recentProblems.add(selectedProblem.displayText);
  }

  return selectedProblem;
}

/**
 * 配列からランダムに要素を1つ選択する
 * @param {Array} array - 配列
 * @returns {*} 選択された要素、配列が空の場合はnull
 */
function getRandomFromArray(array) {
  if (!array || array.length === 0) return null;
  const randomIndex = Math.floor(Math.random() * array.length);
  return array[randomIndex];
}

/**
 * 問題が見つからなかった場合のフォールバック
 * @returns {Object} フォールバック問題
 */
function fallbackProblem() {
  return {
    displayText: '問題を読み込めません',
    kanaText: 'もんだいをよみこめません',
    category: CATEGORIES.GENERAL,
  };
}
