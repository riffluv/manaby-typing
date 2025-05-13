/**
 * タイピングゲーム用のMCPプロトコル定義
 * このファイルは、タイピングゲームのMCP通信で使用するイベント名や
 * データ構造を定義します。
 */

// イベント名の定義
export const TypingEvents = {
  // 入力処理関連
  INPUT_PROCESSED: 'typing:inputProcessed',
  KEY_PRESS: 'typing:keyPress',
  
  // 状態更新関連
  STATE_UPDATED: 'typing:stateUpdated',
  DISPLAY_UPDATED: 'typing:displayUpdated',
  
  // 問題管理関連
  PROBLEM_LOADED: 'typing:problemLoaded',
  PROBLEM_COMPLETED: 'typing:problemCompleted',
  
  // 統計情報関連
  STATS_UPDATED: 'typing:statsUpdated',
  
  // その他
  ERROR: 'typing:error',
};

// コマンド名の定義
export const TypingCommands = {
  // 初期化・制御関連
  INITIALIZE: 'typing:initialize',
  RESET: 'typing:reset',
  
  // 入力処理関連
  PROCESS_INPUT: 'typing:processInput',
  
  // 状態取得関連
  GET_STATE: 'typing:getState',
  GET_DISPLAY_INFO: 'typing:getDisplayInfo',
  
  // 問題管理関連
  LOAD_PROBLEM: 'typing:loadProblem',
  COMPLETE_PROBLEM: 'typing:completeProblem',
  
  // 統計情報関連
  GET_STATS: 'typing:getStats',
  SUBMIT_SCORE: 'typing:submitScore',
};

// タイピング状態のインターフェース定義
export const TypingStateSchema = {
  // 画面表示用の情報
  display: {
    romaji: '', // 表示するローマ字文字列
    typedLength: 0, // 入力済み文字数
    nextChar: '', // 次に入力すべき文字
    currentInput: '', // 現在の入力文字列
    currentCharRomaji: '', // 現在入力中の文字の完全なローマ字表現
    inputMode: 'normal', // 入力モード（normal/consonant）
    isError: false, // エラー状態かどうか
    isCompleted: false, // 完了状態かどうか
  },
  
  // 内部状態 - モデルが管理
  internal: {
    currentCharIndex: 0, // 現在の文字インデックス
    typedRomaji: '', // タイプ済み文字列
    patterns: [], // ローマ字パターンの配列
    displayIndices: [], // 各文字の表示位置の配列
    patternLengths: [], // 各パターンの長さの配列
    expectedChars: [], // 期待される文字セットの配列
    completed: false, // 完了フラグ
  },
  
  // 統計情報
  stats: {
    correctKeyCount: 0, // 正解キー数
    mistakeCount: 0, // ミス数
    startTime: null, // 開始時間
    currentProblemStartTime: null, // 現在の問題の開始時間
    elapsedTimeSeconds: 0, // 経過時間（秒）
    kpm: 0, // KPM（キー/分）
    accuracy: 100, // 正確性（%）
    rank: 'F', // ランク
    problemStats: [], // 問題ごとの統計情報
  },
  
  // 問題情報
  problem: {
    displayText: '', // 表示テキスト
    kanaText: '', // かなテキスト
    originalText: '', // 元のテキスト
  }
};

/**
 * MCPイベントデータの型チェックを行うユーティリティ関数
 * @param {Object} data - チェックするデータ
 * @param {Object} schema - データの期待スキーマ
 * @returns {boolean} 有効な場合はtrue
 */
export function validateEventData(data, schema) {
  // 実装は省略（必要に応じて実装）
  return true;
}

/**
 * エラーイベント用のデータ構造を生成する関数
 * @param {string} message - エラーメッセージ
 * @param {string} code - エラーコード 
 * @returns {Object} エラーデータ
 */
export function createErrorData(message, code = 'UNKNOWN_ERROR') {
  return {
    message,
    code,
    timestamp: Date.now(),
  };
}

export default {
  Events: TypingEvents,
  Commands: TypingCommands,
  StateSchema: TypingStateSchema,
  validateEventData,
  createErrorData,
};