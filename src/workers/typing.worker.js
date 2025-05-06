// typing.worker.js - タイピング処理のためのWebワーカー
// このファイルはメインスレッドから分離して実行されます

// 入力分割パターンのキャッシュ
const inputSplitCache = new Map();

// 入力履歴追跡用
let inputHistory = [];

// キーストローク統計情報
let keystrokeStats = {
  total: 0,
  correct: 0,
  incorrect: 0,
  startTime: null,
  patterns: {}
};

// ワーカー初期化
self.onmessage = function (e) {
  const { type, payload } = e.data;

  switch (type) {
    case 'INITIALIZE':
      // ワーカーの初期化処理
      initialize(payload);
      break;

    case 'PROCESS_INPUT':
      // タイピング入力の処理
      const result = processInput(payload);
      self.postMessage({ type: 'INPUT_RESULT', payload: result });
      break;

    case 'PRELOAD_PATTERNS':
      // よく使われるパターンを事前にキャッシュに読み込む
      preloadPatterns(payload.patterns);
      break;

    case 'GET_STATS':
      // 統計情報を返す
      self.postMessage({
        type: 'STATS_RESULT',
        payload: calculateStats()
      });
      break;

    case 'RESET':
      // 状態をリセット
      resetWorker();
      break;

    case 'CLEAR_INPUT_HISTORY':
      // 入力履歴をクリア
      clearInputHistory();
      break;

    default:
      console.warn('Unknown message type in typing worker:', type);
  }
};

// ワーカーの初期化
function initialize(config) {
  console.log('[Worker] Typing worker initialized with config:', config);
  resetWorker();

  // 設定に基づいてキャッシュサイズなどを調整
  if (config.cacheSize) {
    // キャッシュサイズの制限を実装する場合はここで
  }

  self.postMessage({ type: 'INITIALIZED' });
}

// 入力処理のメインロジック
function processInput(data) {
  const { input, target, options } = data;

  // 初回入力時に開始時間を記録
  if (keystrokeStats.startTime === null) {
    keystrokeStats.startTime = performance.now();
  }

  // 入力を履歴に追加
  inputHistory.push({
    input,
    target,
    timestamp: performance.now()
  });

  // 入力が空の場合はそのまま返す
  if (!input) {
    return {
      match: false,
      processedInput: '',
      remainingText: target,
      matchedText: ''
    };
  }

  // パターンマッチング処理（キャッシュを活用）
  const cacheKey = `${input}|${target.substring(0, input.length * 2)}`;

  let result;
  if (inputSplitCache.has(cacheKey)) {
    // キャッシュヒット
    result = inputSplitCache.get(cacheKey);
  } else {
    // キャッシュミス - 処理を実行してキャッシュに保存
    result = optimizeSplitInput(input, target, options);
    inputSplitCache.set(cacheKey, result);

    // パターン統計を更新
    updatePatternStats(input);
  }

  // キーストローク統計を更新
  keystrokeStats.total += input.length;
  if (result.match) {
    keystrokeStats.correct += input.length;
  } else {
    keystrokeStats.incorrect += 1; // 不正解は1回としてカウント
  }

  return result;
}

// 入力履歴をクリアする関数
function clearInputHistory() {
  inputHistory = [];
  console.log('[Worker] Input history cleared');
}

// 入力分割の最適化関数
function optimizeSplitInput(input, target, options = {}) {
  // 入力最適化アルゴリズム
  // typingmania-refのアルゴリズム参考：入力を複数パターンに分割して最適なマッチングを探す

  // デフォルトの戻り値（最も単純なケース）
  const defaultResult = {
    match: target.startsWith(input),
    processedInput: input,
    remainingText: target.substring(input.length),
    matchedText: target.startsWith(input) ? input : ''
  };

  // 簡略版の実装（本番では複雑な分割アルゴリズムを実装）
  if (target.startsWith(input)) {
    return defaultResult;
  }

  // かな漢字変換に対応するパターン分割処理
  // 例: 「し」が入力されたとき、「si」と「shi」のどちらでもマッチさせる
  const patterns = generateInputPatterns(input);

  // 生成したパターンから最適なマッチを探す
  for (const pattern of patterns) {
    if (target.startsWith(pattern)) {
      return {
        match: true,
        processedInput: input,
        remainingText: target.substring(pattern.length),
        matchedText: pattern,
        pattern: pattern // どのパターンでマッチしたかを記録
      };
    }
  }

  return defaultResult;
}

// 入力パターンを生成する関数
function generateInputPatterns(input) {
  // 簡略版 - 実際にはローマ字かな変換テーブルを使用して多様なパターンを生成
  // 例: 「し」→ 「si」「shi」

  // 実装例（簡略化）
  const patterns = [input];

  // よく使われる変換パターンの例
  const commonPatterns = {
    'si': 'shi',
    'ti': 'chi',
    'tu': 'tsu',
    'hu': 'fu',
    'zi': 'ji',
    // 他多数のパターン
  };

  // 入力に一致するパターンがあれば追加
  Object.entries(commonPatterns).forEach(([key, value]) => {
    if (input.includes(key)) {
      patterns.push(input.replace(key, value));
    }
    // 逆方向のパターンも追加
    if (input.includes(value)) {
      patterns.push(input.replace(value, key));
    }
  });

  return patterns;
}

// パターン統計を更新する関数
function updatePatternStats(input) {
  // 入力されたパターンの統計を取る
  // 例: 「shi」が頻繁に使われるなど

  if (!keystrokeStats.patterns[input]) {
    keystrokeStats.patterns[input] = 0;
  }
  keystrokeStats.patterns[input]++;
}

// 統計情報を計算する関数
function calculateStats() {
  const now = performance.now();
  const elapsedTime = now - (keystrokeStats.startTime || now);

  // KPM（キー/分）の計算
  const kpm = keystrokeStats.total > 0 && elapsedTime > 0
    ? Math.round((keystrokeStats.total / elapsedTime) * 60000)
    : 0;

  // 正確率の計算
  const accuracy = keystrokeStats.total > 0
    ? (keystrokeStats.correct / keystrokeStats.total) * 100
    : 100;

  // よく使われるパターントップ10を抽出
  const topPatterns = Object.entries(keystrokeStats.patterns)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([pattern, count]) => ({ pattern, count }));

  return {
    total: keystrokeStats.total,
    correct: keystrokeStats.correct,
    incorrect: keystrokeStats.incorrect,
    accuracy: Math.round(accuracy * 10) / 10, // 小数点第一位まで
    kpm,
    elapsedTimeMs: elapsedTime,
    cacheSize: inputSplitCache.size,
    topPatterns
  };
}

// 頻出パターンを事前にキャッシュに読み込む関数
function preloadPatterns(patterns) {
  if (!Array.isArray(patterns)) {
    console.warn('[Worker] Invalid preload patterns format');
    return;
  }

  console.log(`[Worker] Preloading ${patterns.length} patterns`);

  // パターンごとに処理
  patterns.forEach(({ input, target }) => {
    const cacheKey = `${input}|${target.substring(0, input.length * 2)}`;

    // キャッシュにまだ存在しない場合のみ処理
    if (!inputSplitCache.has(cacheKey)) {
      const result = optimizeSplitInput(input, target);
      inputSplitCache.set(cacheKey, result);
    }
  });

  self.postMessage({
    type: 'PRELOAD_COMPLETE',
    payload: { count: patterns.length, cacheSize: inputSplitCache.size }
  });
}

// ワーカーの状態をリセットする関数
function resetWorker() {
  inputSplitCache.clear();
  inputHistory = [];

  keystrokeStats = {
    total: 0,
    correct: 0,
    incorrect: 0,
    startTime: null,
    patterns: {}
  };

  console.log('[Worker] Typing worker reset complete');
}