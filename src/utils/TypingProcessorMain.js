/**
 * TypingProcessorMain.js
 * メインスレッドでタイピング処理を行うためのユーティリティ
 * WebWorkerを使用せずに即時応答性を向上させる
 * 2025年5月9日: タイピング即時応答のためにWebWorkerからの移植実装
 */

import * as wanakana from 'wanakana';

// デバッグ設定
const DEBUG = process.env.NODE_ENV === 'development' && false;

// キャッシュ
const cache = {
  inputResults: new Map(),
  coloringInfo: new Map(),
  expectedKeys: new Map(),
};

// パフォーマンス測定
const metrics = {
  processCalls: 0,
  cacheHits: 0,
  cacheMisses: 0,
  totalProcessingTime: 0,
};

/**
 * 入力を処理する (メインスレッド実装)
 * @param {Object} session タイピングセッション
 * @param {string} char 入力文字
 * @returns {Object} 処理結果
 */
export function processTypingInputOnMainThread(session, char) {
  // メトリクス記録
  metrics.processCalls++;
  const startTime = performance.now();

  try {
    // セッションと文字のバリデーション
    if (!session || !char || char.length === 0) {
      return { success: false, error: '無効な入力' };
    }

    // キャッシュキー生成
    const cacheKey = `${session.currentCharIndex || 0}_${session.text || ''}_${session.currentInput || ''}_${char}`;

    // キャッシュチェック
    if (cache.inputResults.has(cacheKey)) {
      metrics.cacheHits++;
      return cache.inputResults.get(cacheKey);
    }

    metrics.cacheMisses++;

    // セッション情報取得
    const {
      text = '',
      currentCharIndex = 0,
      currentInput = '',
      completed = false,
      patterns = null // ローマ字パターンがある場合
    } = session;

    // 完了済みのセッションなら何もしない
    if (completed) {
      return { success: false, alreadyCompleted: true };
    }

    // 現在の文字と残りのテキスト
    const currentExpectedChar = text.charAt(currentCharIndex) || '';
    const remainingText = text.substring(currentCharIndex);

    // 入力文字のバリデーション処理
    let isCorrect = false;
    let newInput = currentInput + char;
    let newCharIndex = currentCharIndex;
    let isCompleted = false;

    // カスタムローマ字パターンがある場合はそれを使用
    if (patterns && remainingText.length > 0) {
      // カスタムローマ字パターンで処理
      for (const pattern of patterns) {
        if (pattern.source && remainingText.startsWith(pattern.source)) {
          // パターンの入力文字列と一致するかチェック
          const expectedInput = pattern.target || '';
          if (expectedInput.startsWith(newInput)) {
            isCorrect = true;
            // 完全一致した場合はインデックスを進める
            if (newInput === expectedInput) {
              newCharIndex += pattern.source.length;
              newInput = ''; // 入力をリセット
            }
            break;
          }
        }
      }
    }
    // カスタムパターンに一致しない場合、デフォルトの処理
    else if (wanakana.isHiragana(currentExpectedChar) || wanakana.isKatakana(currentExpectedChar)) {
      // ひらがなの場合、累積入力をチェック
      // wanakanaを使ってローマ字変換の可能性をチェック
      const hiragana = wanakana.toHiragana(newInput, { IMEMode: true });

      // 現在の期待する文字列と一致するか確認
      if (remainingText.startsWith(hiragana)) {
        isCorrect = true;
        // 完全一致した場合はインデックスを進める
        if (hiragana.length > 0 && remainingText.indexOf(hiragana) === 0) {
          newCharIndex += hiragana.length;
          newInput = ''; // 入力をリセット
        }
      }
    } else {
      // 英数字・記号などの場合は直接比較
      if (currentExpectedChar.toLowerCase() === char.toLowerCase()) {
        isCorrect = true;
        newCharIndex++;
        newInput = ''; // 入力をリセット
      }
    }

    // 完了判定
    isCompleted = newCharIndex >= text.length;

    // 結果オブジェクトの作成
    const result = {
      success: true,
      isCorrect,
      newState: {
        currentCharIndex: newCharIndex,
        currentInput: newInput,
        completed: isCompleted
      },
      metrics: {
        processingTime: performance.now() - startTime,
        timestamp: Date.now()
      }
    };

    // キャッシュに保存
    cache.inputResults.set(cacheKey, result);

    // キャッシュサイズ制限
    if (cache.inputResults.size > 1000) {
      const keys = Array.from(cache.inputResults.keys()).slice(0, 200);
      for (const key of keys) {
        cache.inputResults.delete(key);
      }
    }

    // パフォーマンス記録
    const endTime = performance.now();
    metrics.totalProcessingTime += (endTime - startTime);

    return result;
  } catch (error) {
    console.error('タイピング処理エラー:', error);
    return {
      success: false,
      error: error.message || 'タイピング処理中にエラーが発生しました',
      metrics: {
        processingTime: performance.now() - startTime,
        timestamp: Date.now()
      }
    };
  }
}

/**
 * 色分け情報を取得する (メインスレッド実装)
 * @param {Object} session タイピングセッション
 * @returns {Object} 色分け情報
 */
export function getColoringInfoOnMainThread(session) {
  const startTime = performance.now();

  try {
    // セッションのバリデーション
    if (!session) {
      return { success: false, error: '無効なセッション' };
    }

    // キャッシュキー生成
    const cacheKey = `color_${session.currentCharIndex || 0}_${session.text || ''}_${session.currentInput || ''}_${session.completed ? 1 : 0}`;

    // キャッシュチェック
    if (cache.coloringInfo.has(cacheKey)) {
      metrics.cacheHits++;
      return cache.coloringInfo.get(cacheKey);
    }

    metrics.cacheMisses++;

    // セッション情報取得
    const {
      text = '',
      currentCharIndex = 0,
      currentInput = '',
      completed = false
    } = session;

    // 色分け情報の生成
    const coloringInfo = {
      typed: text.substring(0, currentCharIndex),
      current: {
        expected: text.charAt(currentCharIndex) || '',
        input: currentInput
      },
      remaining: text.substring(currentCharIndex + 1),
      isCompleted: completed,
      metrics: {
        processingTime: performance.now() - startTime,
        timestamp: Date.now()
      }
    };

    // 結果オブジェクト
    const result = {
      success: true,
      coloringInfo
    };

    // キャッシュに保存
    cache.coloringInfo.set(cacheKey, result);

    // キャッシュサイズ制限
    if (cache.coloringInfo.size > 500) {
      const keys = Array.from(cache.coloringInfo.keys()).slice(0, 100);
      for (const key of keys) {
        cache.coloringInfo.delete(key);
      }
    }

    return result;
  } catch (error) {
    console.error('色分け情報取得エラー:', error);
    return {
      success: false,
      error: error.message || '色分け情報の取得中にエラーが発生しました',
      metrics: {
        processingTime: performance.now() - startTime,
        timestamp: Date.now()
      }
    };
  }
}

/**
 * 次に期待されるキーを取得する (メインスレッド実装)
 * @param {Object} session タイピングセッション
 * @returns {Object} 次のキー情報
 */
export function getNextExpectedKeyOnMainThread(session) {
  const startTime = performance.now();

  try {
    // セッションのバリデーション
    if (!session) {
      return { success: false, error: '無効なセッション' };
    }

    // 完了済みの場合は空を返す
    if (session.completed) {
      return { success: true, key: '' };
    }

    // キャッシュキー生成
    const cacheKey = `next_${session.currentCharIndex || 0}_${session.text || ''}_${session.currentInput || ''}`;

    // キャッシュチェック
    if (cache.expectedKeys.has(cacheKey)) {
      metrics.cacheHits++;
      return cache.expectedKeys.get(cacheKey);
    }

    metrics.cacheMisses++;

    // セッション情報取得
    const {
      text = '',
      currentCharIndex = 0,
      currentInput = ''
    } = session;

    // 次の文字を取得
    const nextChar = text.charAt(currentCharIndex) || '';
    const expectedKey = nextChar.toLowerCase();

    // 結果オブジェクト
    const result = {
      success: true,
      key: expectedKey,
      metrics: {
        processingTime: performance.now() - startTime,
        timestamp: Date.now()
      }
    };

    // キャッシュに保存
    cache.expectedKeys.set(cacheKey, result);

    return result;
  } catch (error) {
    console.error('次のキー取得エラー:', error);
    return {
      success: false,
      error: error.message || '次のキー取得中にエラーが発生しました',
      key: '',
      metrics: {
        processingTime: performance.now() - startTime,
        timestamp: Date.now()
      }
    };
  }
}

/**
 * メトリクスを取得する
 * @returns {Object} メトリクス情報
 */
export function getMainThreadMetrics() {
  return {
    ...metrics,
    cacheSize: {
      inputResults: cache.inputResults.size,
      coloringInfo: cache.coloringInfo.size,
      expectedKeys: cache.expectedKeys.size,
    },
    timestamp: Date.now()
  };
}

/**
 * キャッシュをクリアする
 */
export function clearMainThreadCache() {
  cache.inputResults.clear();
  cache.coloringInfo.clear();
  cache.expectedKeys.clear();
  return { success: true };
}
