/**
 * effects-worker.js
 * エフェクト（視覚・音声）の処理をバックグラウンドで行うWorker
 * 2025年5月14日作成
 */

import * as Comlink from 'comlink';

// エフェクト処理の状態
let isRunning = false;
let processingInterval = null;
let lastProcessTime = 0;

// 設定
let config = {
  soundEnabled: true,
  visualEffectsEnabled: true,
  processingInterval: 30, // ms
  volumeLevel: 0.7,
  effectQuality: 'medium', // 'low', 'medium', 'high'
};

// エフェクトキュー
const effectQueue = [];

// イベントキュー
const eventQueue = [];

// キー状態の履歴（直近のキー操作を追跡）
const keyHistory = {
  recentKeys: [],
  lastKeyTime: 0,
  streak: 0,
  combo: 0,
};

// サウンドエフェクトのプリセット（実際のサウンド再生はメインスレッドで行う）
const soundPresets = {
  keypress: { type: 'keypress', volume: 0.5, pitch: 1.0 },
  correct: { type: 'correct', volume: 0.6, pitch: 1.2 },
  incorrect: { type: 'incorrect', volume: 0.6, pitch: 0.8 },
  combo: { type: 'combo', volume: 0.7, pitch: 1.0 },
  complete: { type: 'complete', volume: 1.0, pitch: 1.0 },
};

// 視覚エフェクトのプリセット
const visualPresets = {
  keypress: { type: 'particle', size: 20, color: '#ffffff', duration: 300 },
  correct: { type: 'particle', size: 30, color: '#00ff00', duration: 500 },
  incorrect: { type: 'particle', size: 30, color: '#ff0000', duration: 500 },
  combo: { type: 'explosion', size: 100, color: '#ffff00', duration: 800 },
};

/**
 * エフェクト処理のメインループ
 */
function startProcessing() {
  if (processingInterval) {
    clearInterval(processingInterval);
  }

  processingInterval = setInterval(() => {
    const now = Date.now();
    const deltaTime = now - lastProcessTime;

    // エフェクトキューを処理
    if (effectQueue.length > 0) {
      processEffectQueue(deltaTime);

      // エフェクト更新イベントを発生
      eventQueue.push({
        name: 'EFFECTS_UPDATE',
        data: {
          effects: generateEffectData(),
          timestamp: now,
        },
      });
    }

    lastProcessTime = now;
  }, config.processingInterval);
}

/**
 * エフェクトキューを処理
 * @param {number} deltaTime 経過時間
 */
function processEffectQueue(deltaTime) {
  // 品質に応じて処理量を調整
  let processingLimit = 10;
  if (config.effectQuality === 'low') processingLimit = 5;
  else if (config.effectQuality === 'high') processingLimit = 20;

  // 制限数まで処理
  const processCount = Math.min(processingLimit, effectQueue.length);
  for (let i = 0; i < processCount; i++) {
    const effect = effectQueue.shift();
    if (!effect) continue;

    // エフェクトタイプに応じた処理
    switch (effect.type) {
      case 'keypress':
        processKeypressEffect(effect);
        break;

      case 'combo':
        processComboEffect(effect);
        break;

      case 'result':
        processResultEffect(effect);
        break;

      default:
        // 未知のエフェクトタイプ
        console.warn(`[EffectsWorker] 未知のエフェクトタイプ: ${effect.type}`);
    }
  }
}

/**
 * キープレスエフェクトの処理
 * @param {Object} effect エフェクトデータ
 */
function processKeypressEffect(effect) {
  const { key, correct, position } = effect;

  // キー履歴を更新
  updateKeyHistory(key, correct);

  // エフェクトの生成
  let soundEffect = null;
  let visualEffect = null;

  // サウンドエフェクト
  if (config.soundEnabled) {
    soundEffect = {
      ...soundPresets[correct ? 'correct' : 'incorrect'],
      volume: config.volumeLevel * (correct ? 1.0 : 0.8),
      // コンボによるピッチ変更（コンボが高いほど高音に）
      pitch: correct
        ? soundPresets.correct.pitch + Math.min(0.3, keyHistory.streak * 0.02)
        : soundPresets.incorrect.pitch,
    };
  }

  // 視覚エフェクト
  if (config.visualEffectsEnabled && position) {
    const basePreset = correct
      ? visualPresets.correct
      : visualPresets.incorrect;
    visualEffect = {
      ...basePreset,
      position,
      text: key,
      // コンボによるサイズ変更（コンボが高いほど大きく）
      size: basePreset.size * (1 + Math.min(1.0, keyHistory.streak * 0.05)),
    };
  }

  // コンボ判定
  if (correct && keyHistory.combo >= 10 && keyHistory.combo % 10 === 0) {
    // 10コンボごとに特殊エフェクト
    addComboEffect(position, keyHistory.combo);
  }

  // 最終的なエフェクトデータを返す
  return {
    sound: soundEffect,
    visual: visualEffect,
  };
}

/**
 * コンボエフェクトの処理
 * @param {Object} effect エフェクトデータ
 */
function processComboEffect(effect) {
  const { combo, position } = effect;

  // エフェクトの生成
  let soundEffect = null;
  let visualEffect = null;

  // サウンドエフェクト
  if (config.soundEnabled) {
    soundEffect = {
      ...soundPresets.combo,
      volume: config.volumeLevel,
      // コンボ数に応じてピッチを変える
      pitch: soundPresets.combo.pitch + Math.min(0.5, combo * 0.01),
    };
  }

  // 視覚エフェクト
  if (config.visualEffectsEnabled && position) {
    visualEffect = {
      ...visualPresets.combo,
      position,
      text: `${combo} Combo!`,
      // コンボ数に応じてサイズを変える
      size: visualPresets.combo.size * (1 + Math.min(1.0, combo * 0.02)),
    };
  }

  // 最終的なエフェクトデータを返す
  return {
    sound: soundEffect,
    visual: visualEffect,
  };
}

/**
 * 結果表示時のエフェクト処理
 * @param {Object} effect エフェクトデータ
 */
function processResultEffect(effect) {
  const { score, rank, position } = effect;

  // エフェクトの生成
  let soundEffect = null;
  let visualEffect = null;

  // サウンドエフェクト
  if (config.soundEnabled) {
    soundEffect = {
      ...soundPresets.complete,
      volume: config.volumeLevel,
    };
  }

  // 視覚エフェクト（スコアやランクに応じたエフェクト）
  if (config.visualEffectsEnabled && position) {
    // ランクに応じた色を決定
    let color = '#ffffff';
    switch (rank) {
      case 'S':
        color = '#ffdf00';
        break; // ゴールド
      case 'A':
        color = '#c0c0c0';
        break; // シルバー
      case 'B':
        color = '#cd7f32';
        break; // ブロンズ
      case 'C':
        color = '#4682b4';
        break; // スティールブルー
      case 'D':
        color = '#808080';
        break; // グレー
      default:
        color = '#ffffff';
        break;
    }

    visualEffect = {
      type: 'result',
      position,
      text: `${rank} Rank!`,
      color,
      size: 100,
      duration: 2000,
    };
  }

  // 最終的なエフェクトデータを返す
  return {
    sound: soundEffect,
    visual: visualEffect,
  };
}

/**
 * キー入力履歴を更新
 * @param {string} key 入力されたキー
 * @param {boolean} correct 正解かどうか
 */
function updateKeyHistory(key, correct) {
  const now = Date.now();

  // 直近のキー操作を記録
  keyHistory.recentKeys.push({
    key,
    correct,
    timestamp: now,
  });

  // 最大で30件まで保持
  if (keyHistory.recentKeys.length > 30) {
    keyHistory.recentKeys.shift();
  }

  // 前回のキー入力からの経過時間
  const timeSinceLastKey = now - keyHistory.lastKeyTime;

  // コンボとストリーク更新
  if (correct) {
    // 1秒以内の入力でコンボ継続
    if (timeSinceLastKey < 1000) {
      keyHistory.combo++;
    } else {
      // 時間空いたらリセット
      keyHistory.combo = 1;
    }

    // 連続正解数
    keyHistory.streak++;
  } else {
    // 不正解でコンボとストリークをリセット
    keyHistory.combo = 0;
    keyHistory.streak = 0;
  }

  // 最終キー入力時間を更新
  keyHistory.lastKeyTime = now;
}

/**
 * コンボエフェクトを追加
 * @param {Object} position 位置情報
 * @param {number} combo コンボ数
 */
function addComboEffect(position, combo) {
  effectQueue.push({
    type: 'combo',
    position,
    combo,
    timestamp: Date.now(),
  });
}

/**
 * エフェクトデータを生成
 * @returns {Array} エフェクトデータ配列
 */
function generateEffectData() {
  // 現在処理中のエフェクトを集約
  return effectQueue.map((effect) => ({
    id:
      effect.id ||
      `effect-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: effect.type,
    data: { ...effect },
  }));
}

/**
 * キーイベントを処理
 * @param {Object} data キーイベントデータ
 * @returns {Object} 処理結果
 */
function processKeyEvent(data) {
  // エフェクトキューに追加
  effectQueue.push({
    ...data,
    type: 'keypress',
    timestamp: Date.now(),
    id: `key-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  });

  // キューが大きくなりすぎないようにする
  if (effectQueue.length > 100) {
    effectQueue.splice(0, effectQueue.length - 100);
  }

  return { success: true };
}

/**
 * 設定を更新
 * @param {Object} newConfig 新しい設定
 * @returns {Object} 現在の設定
 */
function updateConfig(newConfig) {
  config = { ...config, ...newConfig };

  // 処理間隔が変更された場合、処理を再開
  if (isRunning && 'processingInterval' in newConfig) {
    startProcessing();
  }

  return { currentConfig: { ...config } };
}

/**
 * Workerのメイン処理：メッセージに応じて適切な処理を実行
 * @param {string} type メッセージのタイプ
 * @param {Object} data メッセージデータ
 * @returns {Object} 処理結果
 */
function processMessage(type, data) {
  // イベントキューをクリア
  eventQueue.length = 0;

  let response;

  try {
    switch (type) {
      case 'PING':
        response = { type: 'PONG', timestamp: Date.now() };
        break;

      case 'START_EFFECTS':
        if (!isRunning) {
          isRunning = true;
          lastProcessTime = Date.now();
          // 設定更新
          if (data && data.config) {
            config = { ...config, ...data.config };
          }
          startProcessing();
          response = { success: true };
        } else {
          response = { success: false, error: 'エフェクトはすでに実行中です' };
        }
        break;

      case 'STOP_EFFECTS':
        isRunning = false;
        if (processingInterval) {
          clearInterval(processingInterval);
          processingInterval = null;
        }
        response = { success: true };
        break;

      case 'PROCESS_KEY_EVENT':
        response = processKeyEvent(data);
        break;

      case 'UPDATE_CONFIG':
        response = updateConfig(data.config);
        break;

      case 'CLEAR_EFFECTS':
        // エフェクトキューをクリア
        effectQueue.length = 0;
        response = { success: true };
        break;

      case 'GET_STATE':
        response = {
          currentState: {
            isRunning,
            config: { ...config },
            queueLength: effectQueue.length,
            keyHistory: {
              combo: keyHistory.combo,
              streak: keyHistory.streak,
            },
          },
        };
        break;

      default:
        response = { error: `未知のメッセージタイプ: ${type}` };
    }

    // イベントキューがあればレスポンスに追加
    if (eventQueue.length > 0) {
      response.events = [...eventQueue];
    }

    return response;
  } catch (error) {
    console.error(`[EffectsWorker] エラー(${type}):`, error);
    return { error: error.message };
  }
}

// APIをエクスポート
const api = {
  processMessage,
};

// Comlinkを使用してAPIをエクスポート
Comlink.expose(api);
